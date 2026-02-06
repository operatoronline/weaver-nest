
import { GoogleGenAI, Type, GenerateContentResponse, Part, Content } from "@google/genai";
import { AIProvider, AIModelConfig, ImageOptions, VideoOptions, GenerationResult, RouterResult } from "../types";
import { AgentId } from "../../../types";
import { globalLimiter } from "../utils/rateLimiter";

// --- Utility Helpers ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class GoogleGenAIProvider implements AIProvider {
    id = "google-genai";
    private client: GoogleGenAI;
    private apiKey: string;

    constructor() {
        const key = process.env.API_KEY;
        if (!key) throw new Error("API_KEY missing");
        this.apiKey = key;
        this.client = new GoogleGenAI({ apiKey: key });
    }

    private async withRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 1000, operationName = 'API Call'): Promise<T> {
        let attempt = 0;
        while (true) {
            try {
                // Wrap in global limiter to prevent local bursts
                return await globalLimiter.add(fn);
            } catch (e: any) {
                if (attempt >= retries) throw e;

                const isRetryable = 
                    e.status === 429 || 
                    e.status === 503 || 
                    e.status === 'RESOURCE_EXHAUSTED' ||
                    (e.message && (e.message.includes('429') || e.message.includes('503') || e.message.includes('Quota') || e.message.includes('RESOURCE_EXHAUSTED')));

                if (isRetryable) {
                    attempt++;
                    let waitTime = initialDelay * Math.pow(2, attempt - 1);
                    
                    // Parse Retry-After header or message if available
                    if (e.message) {
                        const match = e.message.match(/retry in ([\d\.]+)s/);
                        if (match && match[1]) {
                            waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 2000;
                        }
                    }

                    console.warn(`[${operationName}] Retry ${attempt}/${retries} after ${Math.round(waitTime/1000)}s`);
                    await wait(waitTime);
                    continue;
                }
                throw e;
            }
        }
    }

    // Ensure we have a Veo key (client-side hack for certain preview models)
    private async ensureKey(model: string) {
        if (model.includes('veo') || model.includes('gemini-3-pro-image')) {
             // @ts-ignore
            if (window.aistudio && window.aistudio.hasSelectedApiKey) {
                 // @ts-ignore
                const hasKey = await window.aistudio.hasSelectedApiKey();
                if (!hasKey) {
                     // @ts-ignore
                    await window.aistudio.openSelectKey();
                }
                // Always recreate client to pick up injected key if needed
                this.client = new GoogleGenAI({ apiKey: process.env.API_KEY || this.apiKey });
            }
        }
    }

    // Helper: Convert SVG base64 to PNG base64
    private convertSvgToPng(base64Svg: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    // Default to a reasonable size if intrinsic size is missing
                    canvas.width = img.width || 800;
                    canvas.height = img.height || 600;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Failed to create canvas context');
                    
                    // Fill white background to ensure transparency doesn't result in black output
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve(dataUrl.split(',')[1]);
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => reject(new Error('Failed to load SVG for conversion'));
            img.src = `data:image/svg+xml;base64,${base64Svg}`;
        });
    }

    // Helper: Resolve Image Input (Base64 or URL) to Base64
    private async resolveImage(input: string): Promise<{ data: string; mimeType: string } | null> {
        try {
            let data = "";
            let mimeType = "";

            // Case 1: Already Base64 Data URL
            if (input.startsWith('data:')) {
                // Regex updated to handle complex mimes like image/svg+xml
                const mimeMatch = input.match(/^data:(image\/[\w\+\-\.]+);base64,/);
                mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                data = input.replace(/^data:(.*?);base64,/, "");
                // Clean any remaining whitespace/newlines
                data = data.replace(/[\s\r\n]+/g, '');
            }
            
            // Case 2: Remote URL (e.g., Placeholder) - Fetch and convert
            else if (input.startsWith('http')) {
                const res = await fetch(input);
                if (!res.ok) {
                    console.warn(`Failed to fetch image from URL: ${input}`);
                    return null;
                }
                const blob = await res.blob();
                mimeType = blob.type;
                
                const dataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
                data = dataUrl.split(',')[1];
            } else {
                return null;
            }

            // Check if conversion is needed (GenAI doesn't support SVG)
            if (mimeType === 'image/svg+xml') {
                try {
                    const pngData = await this.convertSvgToPng(data);
                    return { data: pngData, mimeType: 'image/png' };
                } catch (e) {
                    console.warn("Failed to convert SVG to PNG, skipping image input", e);
                    return null;
                }
            }

            return { data, mimeType };

        } catch (e) {
            console.warn("Failed to resolve image input:", e);
        }
        return null;
    }

    // --- SANITIZATION HELPERS ---
    
    private sanitizeHistory(history: any[]): Content[] {
        if (!Array.isArray(history)) return [];
        
        return history.filter(item => {
            // Filter out items with no parts
            if (!item.parts || item.parts.length === 0) return false;
            
            // Check if there is at least one valid part (non-empty text OR inlineData)
            const hasValidPart = item.parts.some((p: any) => {
                const hasText = p.text && typeof p.text === 'string' && p.text.trim().length > 0;
                const hasData = !!p.inlineData;
                return hasText || hasData;
            });
            
            return hasValidPart;
        }).map(item => {
            // Further clean individual parts if mixed
            const cleanParts = item.parts.filter((p: any) => {
                // If it has text property, it must not be empty
                if ('text' in p) {
                    return typeof p.text === 'string' && p.text.trim().length > 0;
                }
                return true; // Keep other parts (like inlineData)
            });
            return { role: item.role, parts: cleanParts };
        }) as Content[];
    }

    async generateText(model: string, prompt: string, history: any[] = [], config?: AIModelConfig): Promise<GenerationResult> {
        return this.withRetry(async () => {
            try {
                // Ensure contents is a valid Content object or array
                const contents = this.formatContents(prompt, history);
                const response = await this.client.models.generateContent({
                    model,
                    contents: contents as any, 
                    config: this.mapConfig(config)
                });
                return { text: response.text || "" };
            } catch (e: any) {
                // Intelligent Fallback for Text
                if (model.includes('pro') && (e.status === 429 || e.message?.includes('429'))) {
                    console.warn("Downgrading to Flash model due to rate limit...");
                    const fallbackModel = 'gemini-2.5-flash';
                    const response = await this.client.models.generateContent({
                        model: fallbackModel,
                        contents: this.formatContents(prompt, history) as any,
                        config: this.mapConfig(config)
                    });
                    return { text: response.text || "" };
                }
                throw e;
            }
        }, 3, 1000, `TextGen (${model})`);
    }

    async *generateTextStream(model: string, prompt: string, history: any[] = [], config?: AIModelConfig, imageContext?: string): AsyncGenerator<string, void, unknown> {
        const stream = await this.withRetry(async () => {
             // Sanitize history to remove empty turns which cause 400 Bad Request
             const validHistory = this.sanitizeHistory(history);

             // Create chat with existing history
             const chat = this.client.chats.create({
                model,
                history: validHistory, 
                config: this.mapConfig(config)
            });

            // Construct message payload using strict Part[]
            const parts: Part[] = [{ text: prompt }];

            // If image context exists, add it to the parts
            if (imageContext) {
                 const imgData = await this.resolveImage(imageContext);
                 if (imgData) {
                     parts.push({
                         inlineData: {
                             mimeType: imgData.mimeType,
                             data: imgData.data
                         }
                     });
                 }
            }

            // Use 'message' parameter for sendMessageStream
            return await chat.sendMessageStream({ message: parts });
        }, 3, 1000, `Stream (${model})`);

        for await (const chunk of stream) {
            const c = chunk as GenerateContentResponse;
            if (c.text) yield c.text;
        }
    }

    async generateImage(prompt: string, options?: ImageOptions): Promise<string> {
        const model = 'gemini-3-pro-image-preview';
        await this.ensureKey(model);

        return this.withRetry(async () => {
            // Support for Image-to-Image / Editing
            const parts: Part[] = [];
            
            if (options?.referenceImage) {
                const imgData = await this.resolveImage(options.referenceImage);
                if (imgData) {
                    parts.push({
                        inlineData: {
                            data: imgData.data,
                            mimeType: imgData.mimeType
                        }
                    });
                }
            }

            // Add the text prompt
            parts.push({ text: prompt });

            const response = await this.client.models.generateContent({
                model,
                contents: { parts },
                config: {
                    imageConfig: {
                        aspectRatio: options?.aspectRatio || '1:1',
                        imageSize: options?.size || '1K'
                    }
                }
            });

            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
            
            const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
            if (textPart?.text) throw new Error(textPart.text);

            throw new Error("No image generated");
        }, 3, 2000, 'ImageGen');
    }

    async generateVideo(prompt: string, options?: VideoOptions, imageInputBase64?: string): Promise<string> {
        const model = 'veo-3.1-fast-generate-preview';
        await this.ensureKey(model);

        const request: any = {
            model,
            prompt,
            config: {
                numberOfVideos: 1,
                resolution: options?.resolution || '720p',
                aspectRatio: options?.aspectRatio || '16:9'
            }
        };

        if (imageInputBase64) {
            const imgData = await this.resolveImage(imageInputBase64);
            if (imgData) {
                request.image = { imageBytes: imgData.data, mimeType: imgData.mimeType };
            }
        }

        // Explicitly cast to any to handle type instability in operation return types
        let operation: any = await this.withRetry(() => this.client.models.generateVideos(request), 3, 2000, 'VideoGen Start');
        
        while (!operation.done) {
            await wait(5000);
            operation = await this.withRetry(() => this.client.operations.getVideosOperation({ operation }), 3, 2000, 'VideoGen Poll') as any;
        }

        if (operation.error) {
            const message = (operation.error as any).message || "Video generation failed";
            throw new Error(String(message));
        }
        
        const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) throw new Error("No video URI");

        // Use correct separator when appending key
        const separator = uri.includes('?') ? '&' : '?';
        const res = await fetch(`${uri}${separator}key=${this.apiKey}`);
        
        if (!res.ok) {
            const errText = await res.text().catch(() => res.statusText);
            throw new Error(`Failed to download video blob: ${res.status} ${errText}`);
        }
        
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    }

    async routeRequest(prompt: string, history: any[], models: { fast: string }, imageContext?: string): Promise<RouterResult> {
        return this.withRetry(async () => {
             // Sanitize History first
             const validHistory = this.sanitizeHistory(history);
             
             // Summarize context from valid history only
             const recentContext = validHistory.slice(-3).map(h => `${h.role}: ${(h.parts[0] as any).text?.substring(0, 100) || '[Media]'}`).join('\n');
             
             const systemInstruction = `
             You are the Routing Logic for a multi-agent AI system.
             
             DECISION PROCESS:
             1. Analyze the USER REQUEST and CONTEXT.
             2. Select the BEST AGENT (wise, code_wise, creative_wise, image_wise, video_wise, pro_wise).
             3. DECIDE ARTIFACT:
                - If user wants to CREATE something new -> operation='create'.
                - If user refers to an existing node/artifact (e.g. "update this", "change the list", "add item") -> operation='update'.
                - If just chat -> no artifact.
             4. DECIDE CONNECTIONS:
                - If user asks to connect nodes (e.g. "Connect A to B"), output connections.
                - If creating a NEW artifact that relates to the ACTIVE node, suggest a connection.

             CRITICAL - TITLE GENERATION:
             - If operation='create', you **MUST** provide a 'title'.
             - If operation='update', provide the 'id' of the node being updated if available in context.

             CONNECTIONS:
             - Use 'ACTIVE_NODE' to refer to the currently selected node.
             - Use 'NEW_NODE' to refer to the artifact you are currently creating.
             - Use specific Node IDs if available in context.

             RESPONSE FORMAT:
             Return pure JSON matching the schema.
             `;

             // Construct valid Content[] 
             const parts: Part[] = [{ text: `HISTORY:\n${recentContext}\n\nUSER REQUEST: ${prompt}` }];

             // If image context exists, add it to the user part for routing context
             if (imageContext) {
                 const imgData = await this.resolveImage(imageContext);
                 if (imgData) {
                     parts.push({
                         inlineData: {
                             mimeType: imgData.mimeType,
                             data: imgData.data
                         }
                     });
                 }
             }

             const contents: Content[] = [
                 {
                    role: 'user',
                    parts: parts
                 }
             ];

             const response = await this.client.models.generateContent({
                 model: models.fast,
                 contents: contents, // explicitly typed
                 config: {
                     systemInstruction,
                     responseMimeType: "application/json",
                     responseSchema: {
                         type: Type.OBJECT,
                         properties: {
                             targetAgentId: { type: Type.STRING, enum: [AgentId.WISE, AgentId.CODE, AgentId.CREATIVE, AgentId.IMAGE, AgentId.VIDEO, AgentId.PRO] },
                             reasoning: { type: Type.STRING },
                             artifact: {
                                 type: Type.OBJECT,
                                 properties: {
                                     operation: { type: Type.STRING, enum: ['create', 'update'] },
                                     type: { type: Type.STRING, enum: ['code', 'text', 'image', 'video'] },
                                     title: { type: Type.STRING },
                                     id: { type: Type.STRING },
                                     language: { type: Type.STRING },
                                     aspectRatio: { type: Type.STRING, enum: ['1:1', '3:4', '4:3', '9:16', '16:9'], description: "Visual aspect ratio" },
                                     quality: { type: Type.STRING, enum: ['1K', '2K', '4K', '720p', '1080p'], description: "Resolution or size" }
                                 },
                                 // artifact is optional
                             },
                             connections: {
                                 type: Type.ARRAY,
                                 items: {
                                     type: Type.OBJECT,
                                     properties: {
                                         from: { type: Type.STRING },
                                         to: { type: Type.STRING }
                                     },
                                     required: ['from', 'to']
                                 }
                             }
                         },
                         required: ["targetAgentId", "reasoning"]
                     }
                 }
             });

             if (response.text) {
                 try {
                     // Sanitize: sometimes models wrap JSON in markdown blocks
                     let cleanText = response.text.trim();
                     cleanText = cleanText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
                     return JSON.parse(cleanText);
                 } catch (e) {
                     console.warn("Router JSON parse failed", e);
                 }
             }
             return { targetAgentId: AgentId.WISE, reasoning: "Default routing" };
        }, 3, 500, 'Router');
    }

    // --- Private Helpers ---

    private formatContents(prompt: string, history: any[] = []): Content[] {
        // Sanitize history first
        const validHistory = this.sanitizeHistory(history);

        // Build a single-turn message if history is empty, or valid array if not
        const parts: Part[] = [{ text: prompt }];
        
        if (validHistory.length === 0) {
            return [{ role: 'user', parts }];
        }
        
        return [...validHistory, { role: 'user', parts }] as Content[];
    }

    private mapConfig(config?: AIModelConfig): any {
        if (!config) return {};
        const c: any = { ...config };
        
        if (config.thinkingBudget) {
            c.thinkingConfig = { thinkingBudget: config.thinkingBudget };
            delete c.thinkingBudget;
        }
        return c;
    }
}
