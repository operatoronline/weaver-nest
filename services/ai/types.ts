
import { AgentId } from "../../types";

export interface AIModelConfig {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: any;
    systemInstruction?: string;
    thinkingBudget?: number;
}

export interface ImageOptions {
    size?: '1K' | '2K' | '4K';
    aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
    numberOfImages?: number;
    referenceImage?: string; // Base64 string for image-to-image
}

export interface VideoOptions {
    resolution?: '720p' | '1080p';
    aspectRatio?: '16:9' | '9:16';
    durationSeconds?: number;
}

export interface GenerationResult {
    text: string;
    files?: { name: string; content: string; language: string }[];
    toolCalls?: any[];
}

export interface RouterResult {
    targetAgentId: AgentId;
    reasoning: string;
    artifact?: {
        operation: 'create' | 'update';
        type: 'code' | 'text' | 'image' | 'video';
        title: string;
        id?: string; // Target Node ID for updates
        language?: string;
        aspectRatio?: string;
        quality?: string;
    };
    connections?: {
        from: string; // 'ACTIVE_NODE' | 'NEW_NODE' | NodeID
        to: string;   // 'ACTIVE_NODE' | 'NEW_NODE' | NodeID
    }[];
}

export interface AIProvider {
    id: string;
    generateText(model: string, prompt: string, history?: any[], config?: AIModelConfig): Promise<GenerationResult>;
    generateTextStream(model: string, prompt: string, history?: any[], config?: AIModelConfig, imageContext?: string): AsyncGenerator<string, void, unknown>;
    generateImage(prompt: string, options?: ImageOptions): Promise<string>;
    generateVideo(prompt: string, options?: VideoOptions, imageInputBase64?: string): Promise<string>;
    routeRequest(prompt: string, history: any[], models: { fast: string }, imageContext?: string): Promise<RouterResult>;
}
