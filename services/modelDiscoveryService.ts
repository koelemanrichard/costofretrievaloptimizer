
// services/modelDiscoveryService.ts
import { BusinessInfo } from '../types';

// Updated static lists with latest models (November 2025)
const GEMINI_MODELS = [
    'gemini-3-pro-preview', // Latest flagship - RECOMMENDED
    'gemini-2.5-flash',     // Fast, cost-effective
    'gemini-2.5-pro',       // Advanced reasoning
    'gemini-2.5-flash-lite', // Lightweight
    'gemini-2.0-flash',     // Previous generation
    'gemini-1.5-flash',     // Legacy
    'gemini-1.5-pro'        // Legacy
];

const OPENAI_MODELS = [
    'gpt-5',
    'gpt-5-mini',
    'o3',
    'o4-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4o'
];

const ANTHROPIC_MODELS = [
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5-20251001',
    'claude-opus-4-1-20250805',
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-haiku-20241022'
];

const PERPLEXITY_MODELS = [
    'sonar-reasoning-pro',
    'sonar-pro',
    'sonar'
];


export const fetchOpenRouterModels = async (apiKey: string): Promise<string[]> => {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Invalid OpenRouter API key.");
            }
            throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const { data } = await response.json();
        return data.map((model: any) => model.id).sort();
    } catch (error) {
        console.error("Failed to fetch models from OpenRouter:", error);
        throw error;
    }
};


export const fetchModelsForProvider = async (info: BusinessInfo): Promise<string[]> => {
    // Allow passing a temporary provider override in info object for discovery purposes
    const provider = info.aiProvider;

    switch (provider) {
        case 'gemini':
            return Promise.resolve(GEMINI_MODELS);
        case 'openai':
            return Promise.resolve(OPENAI_MODELS);
        case 'anthropic':
            return Promise.resolve(ANTHROPIC_MODELS);
        case 'perplexity':
            return Promise.resolve(PERPLEXITY_MODELS);
        case 'openrouter':
            if (!info.openRouterApiKey) return Promise.resolve([]); // Cannot fetch without key
            return fetchOpenRouterModels(info.openRouterApiKey);
        default:
            return Promise.resolve([]);
    }
};
