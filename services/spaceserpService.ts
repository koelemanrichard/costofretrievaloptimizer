
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { SerpResult } from '../types';

const API_BASE_URL = 'https://api.spaceserp.com';

/**
 * Fetches live SERP results from the SpaceSERP API.
 * 
 * @param query The search query.
 * @param apiKey Your SpaceSERP API key.
 * @param location The full name of the target location (e.g., 'United States').
 * @param languageCode The two-letter language code (e.g., 'en').
 * @returns A promise that resolves to an array of SERP results.
 */
export const fetchSerpResultsFromSpaceSERP = async (
    query: string,
    apiKey: string,
    location: string,
    languageCode: string
): Promise<SerpResult[]> => {
    if (!apiKey) {
        console.warn("SpaceSERP API key is not configured. Skipping.");
        return [];
    }
    
    const params = new URLSearchParams({
        apiKey,
        q: query,
        location,
        hl: languageCode,
    });

    const url = `${API_BASE_URL}/google/search?${params.toString()}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new Error(`SpaceSERP API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (data.error) {
             throw new Error(`SpaceSERP API Error: ${data.error.message}`);
        }

        if (!data.organic_results || data.organic_results.length === 0) {
            return [];
        }

        return data.organic_results
            .filter((item: any) => item.title && item.link)
            .map((item: any): SerpResult => ({
                position: item.position,
                title: item.title,
                link: item.link,
                snippet: item.snippet || ''
            }));

    } catch (error) {
        console.error("Failed to fetch SERP data from SpaceSERP:", error);
        throw new Error(`Could not fetch SERP data from SpaceSERP. [${error instanceof Error ? error.message : 'Unknown Error'}]`);
    }
};
