
import { AIProvider, ImageOptions, VideoOptions } from "./types";
import { GoogleGenAIProvider } from "./providers/googleGenAI";
import { AgentId } from "../../types";
import { AGENTS } from "../../constants";

/**
 * AI Service Orchestrator
 * Acts as the "GenKit" flow manager, routing requests to the configured provider.
 */
class AIOrchestrator {
    private provider: AIProvider;
    private fastModel = 'gemini-2.5-flash';

    constructor() {
        this.provider = new GoogleGenAIProvider();
    }

    async route(prompt: string, history: any[], imageContext?: string) {
        return this.provider.routeRequest(prompt, history, { fast: this.fastModel }, imageContext);
    }

    /**
     * Helper: Refine a heavy context prompt into a specific visual prompt using a cheaper model.
     * This prevents blowing up the token quota for expensive image/video models.
     */
    private async refinePrompt(originalPrompt: string, targetType: 'image' | 'video', hasReferenceImage: boolean): Promise<string> {
        try {
            // If prompt is short and no reference logic needed, just use it
            if (originalPrompt.length < 200 && !hasReferenceImage) return originalPrompt;

            const refinementSystem = `
                You are an expert visual prompt engineer.
                Your task is to extract a precise, high-quality ${targetType} generation prompt from the user's request and context.
                
                RULES:
                1. Focus ONLY on visual details: subject, style, lighting, composition, mood, and environment.
                2. IGNORE code, scripts, technical implementation details, or non-visual text.
                3. ${hasReferenceImage ? "The user has provided a reference image. Your prompt should describe the MODIFICATIONS or the RESULTING image." : "Output ONLY the raw prompt string."}
                4. Output ONLY the raw prompt string. Do not add "Here is the prompt".
            `;

            const result = await this.provider.generateText(
                this.fastModel, 
                `CONTEXT & REQUEST:\n${originalPrompt}\n\nOUTPUT PROMPT:`,
                [], 
                { systemInstruction: refinementSystem }
            );

            return result.text.trim() || originalPrompt;
        } catch (e) {
            console.warn("Prompt refinement failed, using original", e);
            return originalPrompt;
        }
    }

    async *streamResponse(agentId: AgentId, prompt: string, history: any[], isArtifactMode = false, artifactLanguage = '', imageContext?: string) {
        const agent = AGENTS[agentId];
        let systemInstruction = agent.systemInstruction || '';
        const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Model'}: ${h.parts[0].text}`).join('\n\n');

        if (isArtifactMode) {
             if (agentId === AgentId.CODE) {
                 // Enhanced instruction to force proper file structure for the Code Agent
                 // This overrides any ambiguity from the router's language detection
                 systemInstruction += `\n\nCRITICAL CODING INSTRUCTIONS:
                 1. You are generating a multi-file project or code snippet.
                 2. You MUST use the file marker for EVERY file: '### FILE: <filename>'
                    Example:
                    ### FILE: index.html
                    <html>...</html>
                    ### FILE: style.css
                    body { ... }
                 3. If the request is for a web app, YOU MUST START with '### FILE: index.html'.
                 4. Do NOT write conversational text before the first file marker.
                 5. Output the COMPLETE content for every file. No placeholders.
                 `;
             } else if (agentId === AgentId.CREATIVE || agentId === AgentId.WISE) {
                 systemInstruction += `\n\nIMPORTANT ARTIFACT INSTRUCTIONS:
                 1. You are creating or updating a live document node on a canvas.
                 2. Output the FULL CONTENT of the document.
                 3. If updating, REPLACE the existing content entirely with the new version.
                 4. Use clean Markdown format.
                 5. Do NOT output conversational filler (e.g., "Here is the updated list"). Just the content.`;
             }
        }

        if (historyText) {
             systemInstruction += `\n\nPREVIOUS CONVERSATION HISTORY:\n${historyText}\n\n(Respond to new request based on history)`;
        }

        const config = {
            systemInstruction,
            // Enable thinking for Pro models, especially for CODE to ensure complex reasoning.
            // Using 4096 budget for code to allow sufficient planning time.
            thinkingBudget: (agent.model.includes('pro') && (!isArtifactMode || agentId === AgentId.CODE)) ? 4096 : 0
        };

        const stream = this.provider.generateTextStream(agent.model, prompt, [], config, imageContext);
        
        for await (const chunk of stream) {
            yield chunk;
        }
    }

    async generateImage(prompt: string, options: ImageOptions, referenceImageBase64?: string) {
        // Step 1: Optimize prompt to save tokens (aware of reference image)
        const refinedPrompt = await this.refinePrompt(prompt, 'image', !!referenceImageBase64);
        
        // Step 2: Generate
        return this.provider.generateImage(refinedPrompt, {
            ...options,
            referenceImage: referenceImageBase64 
        });
    }

    async generateVideo(prompt: string, options: VideoOptions, referenceImageBase64?: string) {
        // Step 1: Optimize prompt to save tokens
        const refinedPrompt = await this.refinePrompt(prompt, 'video', !!referenceImageBase64);
        
        // Step 2: Generate
        return this.provider.generateVideo(refinedPrompt, options, referenceImageBase64);
    }
}

export const AI = new AIOrchestrator();
