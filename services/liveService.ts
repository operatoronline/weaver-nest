
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { AGENTS } from "../constants";
import { AgentId } from "../types";

// Types for audio processing
interface AudioUtils {
    encode: (bytes: Uint8Array) => string;
    decode: (base64: string) => Uint8Array;
    createBlob: (data: Float32Array) => { data: string; mimeType: string };
    decodeAudioData: (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => Promise<AudioBuffer>;
}

const AudioHelpers: AudioUtils = {
    encode: (bytes: Uint8Array) => {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },
    decode: (base64: string) => {
        // Sanitize base64 string to remove newlines/spaces which cause atob to fail
        const cleanBase64 = base64.replace(/[\s\r\n]+/g, '');
        const binaryString = atob(cleanBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    },
    createBlob: (data: Float32Array) => {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        const encoded = AudioHelpers.encode(new Uint8Array(int16.buffer));
        return {
            data: encoded,
            mimeType: 'audio/pcm;rate=16000',
        };
    },
    decodeAudioData: async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
        return buffer;
    }
};

// Tool Definition for Delegation
const delegateTool: FunctionDeclaration = {
    name: "delegate_task",
    description: "Delegate a request to a specialized agent (Image, Video, Code) if you cannot handle it directly via voice.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            request: {
                type: Type.STRING,
                description: "The user's specific request rewritten clearly for the specialized agent (e.g., 'Generate an image of a cat')."
            }
        },
        required: ["request"]
    }
};

export class LiveSession {
    private ai: GoogleGenAI;
    private inputCtx: AudioContext | null = null;
    private outputCtx: AudioContext | null = null;
    private sessionPromise: Promise<any> | null = null;
    private currentSession: any | null = null;
    private nextStartTime: number = 0;
    private sources: Set<AudioBufferSourceNode> = new Set();
    private stream: MediaStream | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    
    public onStatusChange: (status: string) => void = () => {};
    public onAudioLevel: (level: number) => void = () => {};
    public onAgentRequest: (request: string) => void = () => {}; // Callback for delegated tasks

    constructor() {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API Key missing");
        this.ai = new GoogleGenAI({ apiKey });
    }

    async connect(context?: string) {
        // Soft reset: Reset session state but attempt to keep AudioContexts alive
        await this.disconnect(false);

        try {
            // Initialize or Resume Input Context
            if (!this.inputCtx || this.inputCtx.state === 'closed') {
                this.inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            } 
            if (this.inputCtx.state === 'suspended') {
                await this.inputCtx.resume();
            }

            // Initialize or Resume Output Context
            if (!this.outputCtx || this.outputCtx.state === 'closed') {
                this.outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            } 
            if (this.outputCtx.state === 'suspended') {
                await this.outputCtx.resume();
            }

            this.nextStartTime = 0;

            // Request microphone with optimal constraints for speech
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    autoGainControl: true,
                    noiseSuppression: true
                }
            });

            const agent = AGENTS[AgentId.LIVE];
            const model = agent.model;
            let systemInstruction = agent.systemInstruction || "";
            
            if (context) {
                systemInstruction += `\n\n${context}`;
            }
            
            this.sessionPromise = this.ai.live.connect({
                model,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                    },
                    systemInstruction,
                    tools: [{ functionDeclarations: [delegateTool] }]
                },
                callbacks: {
                    onopen: () => {
                        this.onStatusChange('Connected');
                        this.startAudioStreaming();
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        this.handleMessage(message);
                    },
                    onclose: () => {
                        this.onStatusChange('Disconnected');
                    },
                    onerror: (err) => {
                        console.error("Live Error", err);
                        this.onStatusChange('Error');
                    }
                }
            });

            // Store resolved session for proper cleanup
            this.currentSession = await this.sessionPromise;

        } catch (e) {
            console.error("Failed to connect live session", e);
            // If connection failed, perform full cleanup (including AudioContexts)
            await this.disconnect(true);
            throw e;
        }
    }

    private startAudioStreaming() {
        if (!this.inputCtx || !this.stream) return;
        
        const source = this.inputCtx.createMediaStreamSource(this.stream);
        // Deprecated but functional for raw PCM access in this context
        this.scriptProcessor = this.inputCtx.createScriptProcessor(4096, 1, 1);
        
        this.scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Simple visualizer calc
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            this.onAudioLevel(Math.sqrt(sum / inputData.length));

            const blob = AudioHelpers.createBlob(inputData);
            
            // Use sessionPromise to ensure we send to valid session, ignoring race conditions
            this.sessionPromise?.then(session => {
                session.sendRealtimeInput({ media: blob });
            });
        };

        source.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.inputCtx.destination);
    }

    private async handleMessage(message: LiveServerMessage) {
        if (!this.outputCtx) return;

        // Handle Function Calling (Delegation)
        if (message.toolCall) {
            const fc = message.toolCall.functionCalls.find(f => f.name === 'delegate_task');
            if (fc) {
                const request = fc.args['request'] as string;
                console.log("[Live] Delegating task:", request);
                
                // Notify Main App
                this.onAgentRequest(request);

                // Send Success Response back to Model to keep session alive and happy
                this.sessionPromise?.then(session => {
                    session.sendToolResponse({
                        functionResponses: [{
                            id: fc.id,
                            name: fc.name,
                            response: { result: "Task delegated to specialized agent." }
                        }]
                    });
                });
            }
        }

        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (audioData) {
            this.nextStartTime = Math.max(this.nextStartTime, this.outputCtx.currentTime);
            
            const buffer = await AudioHelpers.decodeAudioData(
                AudioHelpers.decode(audioData),
                this.outputCtx,
                24000,
                1
            );
            
            const source = this.outputCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(this.outputCtx.destination);
            
            source.addEventListener('ended', () => this.sources.delete(source));
            source.start(this.nextStartTime);
            
            this.nextStartTime += buffer.duration;
            this.sources.add(source);
        }

        if (message.serverContent?.interrupted) {
            this.sources.forEach(s => {
                try { s.stop(); s.disconnect(); } catch(e) {}
            });
            this.sources.clear();
            this.nextStartTime = 0;
        }
    }

    /**
     * Disconnects the session.
     * @param closeContexts If true, closes AudioContexts. If false, keeps them for reuse (e.g. restart).
     */
    async disconnect(closeContexts = true) {
        // 1. Stop Media Stream Tracks
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }

        // 2. Disconnect Script Processor
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor.onaudioprocess = null;
            this.scriptProcessor = null;
        }

        // 3. Stop Active Audio Sources
        this.sources.forEach(s => {
            try { s.stop(); s.disconnect(); } catch(e) {}
        });
        this.sources.clear();

        // 4. Close GenAI Session
        if (this.currentSession) {
            try {
                // Not always available or needed if socket closed, but good practice
                // Type definition might not have close() explicitly on some versions, handle gracefully
                if (typeof this.currentSession.close === 'function') {
                    await this.currentSession.close();
                }
            } catch(e) {
                console.warn("Error closing session", e);
            }
            this.currentSession = null;
        }
        this.sessionPromise = null;

        // 5. Close Audio Contexts (Optional)
        if (closeContexts) {
            if (this.inputCtx) {
                try {
                    if (this.inputCtx.state !== 'closed') {
                        await this.inputCtx.close();
                    }
                } catch(e) { console.warn("Error closing inputCtx", e); }
                this.inputCtx = null;
            }

            if (this.outputCtx) {
                try {
                    if (this.outputCtx.state !== 'closed') {
                        await this.outputCtx.close();
                    }
                } catch(e) { console.warn("Error closing outputCtx", e); }
                this.outputCtx = null;
            }
        }
        
        this.nextStartTime = 0;
    }
}
