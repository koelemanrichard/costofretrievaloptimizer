
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
// FIX: Added React import to resolve namespace error.
import { SerpResult, BusinessInfo } from '../types';
import { cacheService } from './cacheService';
import React from 'react';

const CORS_PROXY_URL = `https://corsproxy.io/?`;

const fetchWithProxy = async (url: string, options?: RequestInit): Promise<Response> => {
    const proxyUrl = `${CORS_PROXY_URL}${encodeURIComponent(url)}`;
    // FIX: Increased timeout to 30 seconds to handle slow API responses.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
        const response = await fetch(proxyUrl, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('The request timed out after 30 seconds.');
        }
        throw error;
    }
};

const parseSitemapXml = (xmlText: string): { sitemapUrls: string[], pageUrls: string[] } => {
    const sitemapUrls: string[] = [];
    const pageUrls: string[] = [];
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode) {
        console.warn("XML parsing error:", errorNode.textContent);
        return { sitemapUrls, pageUrls };
    }

    const sitemapNodes = xmlDoc.querySelectorAll("sitemap > loc");
    sitemapNodes.forEach(node => {
        if (node.textContent) sitemapUrls.push(node.textContent);
    });

    const urlNodes = xmlDoc.querySelectorAll("url > loc");
    urlNodes.forEach(node => {
        if (node.textContent) pageUrls.push(node.textContent);
    });

    return { sitemapUrls, pageUrls };
};


const discoverSitemapUrls = async (domain: string): Promise<string[]> => {
    try {
        const response = await fetchWithProxy(`https://${domain}/robots.txt`);
        if (response.ok) {
            const text = await response.text();
            const matches = text.match(/Sitemap:\s*(.*)/gi);
            if (matches) {
                return matches.map(s => s.split(': ')[1].trim());
            }
        }
    } catch (e) {
        console.warn(`Could not fetch or parse robots.txt for ${domain}`, e);
    }

    const commonPaths = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap_index.xml.gz', '/sitemap.xml.gz', '/post-sitemap.xml', '/page-sitemap.xml'];
    for (const path of commonPaths) {
        try {
            const sitemapUrl = `https://${domain}${path}`;
            const response = await fetchWithProxy(sitemapUrl);
            if (response.ok) {
                return [sitemapUrl];
            }
        } catch (e) {
             console.warn(`Error checking common sitemap path: ${path} for ${domain}`, e);
        }
    }

    return [];
};


export const analyzeCompetitorSitemap = async (domain: string): Promise<string[]> => {
    const fetchFn = async () => {
        const initialSitemapUrls = await discoverSitemapUrls(domain);
        if (initialSitemapUrls.length === 0) {
            throw new Error(`No sitemap found for ${domain}`);
        }

        const allPageUrls = new Set<string>();
        const sitemapsToProcess = [...initialSitemapUrls];
        const processedSitemaps = new Set<string>();

        while (sitemapsToProcess.length > 0) {
            const currentSitemapUrl = sitemapsToProcess.pop();
            if (!currentSitemapUrl || processedSitemaps.has(currentSitemapUrl)) {
                continue;
            }

            processedSitemaps.add(currentSitemapUrl);
            console.log(`Processing sitemap: ${currentSitemapUrl}`);

            try {
                const response = await fetchWithProxy(currentSitemapUrl);
                if (!response.ok) {
                    console.warn(`Failed to fetch sitemap: ${currentSitemapUrl}`);
                    continue;
                }
                const xmlText = await response.text();
                const { sitemapUrls: newSitemapUrls, pageUrls } = parseSitemapXml(xmlText);

                pageUrls.forEach(url => allPageUrls.add(url));

                newSitemapUrls.forEach(url => {
                    if (!processedSitemaps.has(url)) {
                        sitemapsToProcess.push(url);
                    }
                });

            } catch (error) {
                console.error(`Error processing sitemap ${currentSitemapUrl}:`, error);
            }
        }

        return Array.from(allPageUrls);
    };
    
    // Cache sitemap analysis for 6 hours
    return cacheService.cacheThrough('sitemap', { domain }, fetchFn, 21600);
};


export const fetchSerpResults = async (query: string, login: string, password: string, locationName: string, languageCode: string): Promise<SerpResult[]> => {
    
    const fetchFn = async () => {
        const postData = [{
            keyword: query,
            location_name: locationName,
            language_code: languageCode,
            depth: 10,
        }];

        const url = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';
        const credentials = btoa(`${login}:${password}`);

        try {
            const response = await fetchWithProxy(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`DataForSEO API HTTP Error: ${response.status} ${response.statusText}. Response: ${errorText}`);
            }

            const data = await response.json();

            if (data.status_code !== 20000) {
                throw new Error(`DataForSEO API Error: ${data.status_message}`);
            }
            
            const taskResult = data.tasks?.[0]?.result?.[0];
            if (!taskResult || !taskResult.items) {
                return [];
            }

            return taskResult.items
                .filter((item: any) => item.type === 'organic')
                .map((item: any): SerpResult => ({
                    position: item.rank_absolute,
                    title: item.title,
                    link: item.url,
                    snippet: item.description || ''
                }));

        } catch (error) {
            console.error("Failed to fetch SERP data from DataForSEO:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown Error';
            if (errorMessage.includes('timed out')) {
                 throw new Error(`Could not get SERP data: The request to DataForSEO timed out. This can happen with very broad queries or if their service is slow. Please try again or refine your seed keyword.`);
            }
            throw new Error(`Could not fetch SERP data. Please check your query and API credentials. [${errorMessage}]`);
        }
    };

    // Cache SERP results for 1 hour
    return cacheService.cacheThrough('serp:dataforseo', { query, locationName, languageCode }, fetchFn, 3600);
};

// FIX: Added missing 'discoverInitialCompetitors' function.
export const discoverInitialCompetitors = async (
    query: string,
    info: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<SerpResult[]> => {
    dispatch({ type: 'LOG_EVENT', payload: { service: 'SERP', message: `Discovering competitors for query: ${query}`, status: 'info', timestamp: Date.now() }});
    // This example prioritizes DataForSEO. Add other providers as fallbacks if needed.
    if (info.dataforseoLogin && info.dataforseoPassword) {
        return fetchSerpResults(query, info.dataforseoLogin, info.dataforseoPassword, info.targetMarket, info.language);
    }
    dispatch({ type: 'LOG_EVENT', payload: { service: 'SERP', message: `DataForSEO credentials not provided. Cannot discover competitors.`, status: 'skipped', timestamp: Date.now() }});
    return [];
};
