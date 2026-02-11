
// services/modelDiscoveryService.ts
import { BusinessInfo } from '../types';
import { API_ENDPOINTS } from '../config/apiEndpoints';
import { getValidModels } from '../config/serviceRegistry';

// Model lists sourced from unified service registry
const GEMINI_MODELS = [...getValidModels('gemini')];
const OPENAI_MODELS = [...getValidModels('openai')];
const ANTHROPIC_MODELS = [...getValidModels('anthropic')];
const PERPLEXITY_MODELS = [...getValidModels('perplexity')];


export const fetchOpenRouterModels = async (apiKey: string): Promise<string[]> => {
    try {
        const response = await fetch(API_ENDPOINTS.OPENROUTER_MODELS, {
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
