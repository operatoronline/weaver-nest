
import { AIProvider, AIModelConfig, ImageOptions, VideoOptions, GenerationResult, RouterResult } from "../types";
import { AgentId } from "../../../types";

export class WeaverProvider implements AIProvider {
    id = "weaver";
    private get apiBase() {
        const isDev = window.location.hostname.includes('operator.onl');
        return isDev ? "https://weaver.operator.onl" : "https://weaver.onl";
    }
    private lastUICommands: any[] = [];

    constructor() {}

    private async callWeaver(message: string, sessionKey: string = "nest:default", mediaConfig?: any): Promise<any> {
        console.log("DEBUG: Calling Weaver API...", { message, sessionKey, mediaConfig });
        const response = await fetch(`${this.apiBase}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                session_key: sessionKey,
                channel: "nest",
                chat_id: "ui",
                media_config: mediaConfig
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Weaver API error: ${err}`);
        }

        const data = await response.json();
        console.log("DEBUG: Weaver API Data received:", data);
        if (data.error) throw new Error(data.error);
        
        // Store commands for retrieval after generation
        this.lastUICommands = data.ui_commands || [];
        
        return data;
    }

    getLastUICommands() {
        const cmds = [...this.lastUICommands];
        this.lastUICommands = []; // Clear after retrieval
        return cmds;
    }

    async generateText(model: string, prompt: string, history: any[] = [], config?: AIModelConfig): Promise<GenerationResult> {
        const data = await this.callWeaver(prompt);
        return { 
            text: data.response,
            uiCommands: data.ui_commands
        };
    }

    async *generateTextStream(model: string, prompt: string, history: any[] = [], config?: AIModelConfig, imageContext?: string): AsyncGenerator<string, void, unknown> {
        // Current Weaver REST API is unary, so we simulate a single chunk for now
        const data = await this.callWeaver(prompt);
        yield data.response;
    }

    async generateImage(prompt: string, options?: ImageOptions): Promise<string> {
        const response = await this.callWeaver(prompt, "nest:images", {
            type: 'image',
            aspect_ratio: options?.aspectRatio || '1:1',
            size: options?.size || '1K'
        });
        return response.attachment_url || response.response;
    }

    async generateVideo(prompt: string, options?: VideoOptions, imageInputBase64?: string): Promise<string> {
        const response = await this.callWeaver(prompt, "nest:videos", {
            type: 'video',
            aspect_ratio: options?.aspectRatio || '16:9',
            resolution: options?.resolution || '720p'
        });
        return response.attachment_url || response.response;
    }

    async routeRequest(prompt: string, history: any[], models: { fast: string }, imageContext?: string): Promise<RouterResult> {
        // Direct routing to the WISE agent for now
        return {
            targetAgentId: AgentId.NEST,
            reasoning: "Routed through Weaver Bridge"
        };
    }
}
