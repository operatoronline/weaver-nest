
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

    private async callWeaver(message: string, sessionKey: string = "nest:default"): Promise<{ response: string, ui_commands?: any[] }> {
        console.log("DEBUG: Calling Weaver API...", { message, sessionKey });
        const response = await fetch(`${this.apiBase}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                session_key: sessionKey,
                channel: "nest",
                chat_id: "ui"
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
        // Fallback to Weaver's image tools if available, or throw
        throw new Error("Image generation via Weaver REST API not yet implemented");
    }

    async generateVideo(prompt: string, options?: VideoOptions, imageInputBase64?: string): Promise<string> {
        throw new Error("Video generation via Weaver REST API not yet implemented");
    }

    async routeRequest(prompt: string, history: any[], models: { fast: string }, imageContext?: string): Promise<RouterResult> {
        // Direct routing to the WISE agent for now
        return {
            targetAgentId: AgentId.NEST,
            reasoning: "Routed through Weaver Bridge"
        };
    }
}
