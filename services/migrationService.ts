import { getSupabaseClient } from './supabaseClient';
import { extractSinglePage, getExtractionTypeForUseCase } from './pageExtractionService';
import { BusinessInfo, SiteInventoryItem } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Normalizes a URL for consistent inventory matching.
 * Strips trailing slashes (except root '/') so that sitemap URLs
 * (e.g. https://example.com/page/) match GSC URLs (https://example.com/page).
 */
export function normalizeInventoryUrl(url: string): string {
    try {
        const u = new URL(url);
        if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
            u.pathname = u.pathname.slice(0, -1);
        }
        return u.toString();
    } catch {
        return url;
    }
}

/**
 * Parses a CSV string from a Google Search Console Pages export.
 * @param csvText The raw CSV content as a string.
 * @returns A promise that resolves to an array of page row objects.
 */
const parseGscPagesCsv = (csvText: string): Promise<{ url: string; clicks: number; impressions: number; position: number }[]> => {
    return new Promise((resolve, reject) => {
        if (!csvText) {
            return reject(new Error("CSV text is empty."));
        }

        const lines = csvText.trim().split(/\r?\n/);

        // Find the line that actually contains the headers
        let headerLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            // GSC Pages export uses "Top pages" instead of "Top queries"
            if ((lines[i].includes('Top pages') || lines[i].includes('URL') || lines[i].includes('Page')) && lines[i].includes('Clicks')) {
                headerLineIndex = i;
                break;
            }
        }

        if (headerLineIndex === -1) {
            return reject(new Error("Could not find a valid header row in the CSV file. Ensure it's a standard GSC Pages export."));
        }

        const header = lines[headerLineIndex].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const dataLines = lines.slice(headerLineIndex + 1);

        // Look for either "Top pages" or "Page" or "URL" as the URL column
        let urlIndex = header.indexOf('Top pages');
        if (urlIndex === -1) urlIndex = header.indexOf('Page');
        if (urlIndex === -1) urlIndex = header.indexOf('URL');

        const clicksIndex = header.indexOf('Clicks');
        const impressionsIndex = header.indexOf('Impressions');
        const positionIndex = header.indexOf('Position');

        if (urlIndex === -1 || clicksIndex === -1 || impressionsIndex === -1 || positionIndex === -1) {
            return reject(new Error("CSV header is missing one of the required columns."));
        }

        const data: { url: string; clicks: number; impressions: number; position: number }[] = [];
        for (const line of dataLines) {
            if (!line.trim()) continue;

            const values = line.split(',');
            if (values.length >= header.length) {
                try {
                    data.push({
                        url: values[urlIndex].trim().replace(/^"|"$/g, ''),
                        clicks: parseInt(values[clicksIndex], 10),
                        impressions: parseInt(values[impressionsIndex], 10),
                        position: parseFloat(values[positionIndex]),
                    });
                } catch (e) {
                    console.warn(`Skipping malformed row in GSC Pages CSV: ${line}`);
                }
            }
        }
        resolve(data);
    });
};

export interface MigrationProxyConfig {
    supabaseUrl: string;
    supabaseAnonKey: string;
}

const fetchWithProxy = async (url: string, proxyConfig?: MigrationProxyConfig): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        // Preferred: use Supabase fetch-proxy edge function
        if (proxyConfig?.supabaseUrl && proxyConfig?.supabaseAnonKey) {
            const proxyUrl = `${proxyConfig.supabaseUrl}/functions/v1/fetch-proxy`;
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${proxyConfig.supabaseAnonKey}`,
                    'apikey': proxyConfig.supabaseAnonKey,
                },
                body: JSON.stringify({ url, method: 'GET' }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Edge proxy HTTP error: ${response.status} ${response.statusText}`);
            }

            const wrapper = await response.json();
            if (wrapper.error && !wrapper.body) {
                throw new Error(`Proxy error: ${wrapper.error}`);
            }

            const responseBody = wrapper.body ?? '';
            return new Response(typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody), {
                status: wrapper.status || 0,
                statusText: wrapper.statusText || '',
                headers: { 'Content-Type': wrapper.contentType || 'text/xml' },
            });
        }

        // Fallback: direct fetch (will fail with CORS in browser)
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('The request timed out after 30 seconds.');
        }
        throw error;
    }
};

export const fetchAndParseSitemap = async (sitemapUrl: string, onStatusUpdate?: (msg: string) => void, proxyConfig?: MigrationProxyConfig): Promise<string[]> => {
    const urls = new Set<string>();
    const processedSitemaps = new Set<string>();
    const queue = [sitemapUrl];

    while (queue.length > 0) {
        const currentUrl = queue.shift()!;
        
        if (processedSitemaps.has(currentUrl)) continue;
        processedSitemaps.add(currentUrl);

        if (onStatusUpdate) onStatusUpdate(`Fetching ${currentUrl}...`);

        try {
            const response = await fetchWithProxy(currentUrl, proxyConfig);
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const errorNode = xmlDoc.querySelector("parsererror");
            if (errorNode) {
                console.warn(`XML parsing error for ${currentUrl}:`, errorNode.textContent);
                continue;
            }

            const sitemapNodes = xmlDoc.querySelectorAll("sitemap > loc");
            if (sitemapNodes.length > 0) {
                sitemapNodes.forEach((node) => {
                    if (node.textContent) {
                        const childUrl = node.textContent.trim();
                        if (!processedSitemaps.has(childUrl)) {
                            queue.push(childUrl);
                        }
                    }
                });
                if (onStatusUpdate) onStatusUpdate(`Found sitemap index with ${sitemapNodes.length} child sitemaps.`);
            }

            const urlNodes = xmlDoc.querySelectorAll("url > loc");
            urlNodes.forEach((node) => {
                if (node.textContent) {
                    urls.add(node.textContent.trim());
                }
            });

        } catch (e) {
            console.error(`Error processing sitemap ${currentUrl}:`, e);
        }
    }

    return Array.from(urls);
};

export const initializeInventory = async (
    projectId: string,
    urls: string[],
    supabaseUrl: string,
    supabaseAnonKey: string,
    onProgress?: (count: number, total: number) => void
): Promise<void> => {
    if (urls.length === 0) return;

    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const CHUNK_SIZE = 100;
    let processed = 0;

    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
        const chunk = urls.slice(i, i + CHUNK_SIZE);
        
        const payload = chunk.map(url => ({
            project_id: projectId,
            url: normalizeInventoryUrl(url),
            status: 'AUDIT_PENDING',
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('site_inventory')
            .upsert(payload as any, { onConflict: 'project_id,url' });

        if (error) {
            console.error("Failed to insert inventory batch:", error);
            throw new Error(`Database error: ${error.message}`);
        }
        
        processed += chunk.length;
        if (onProgress) onProgress(processed, urls.length);
    }
};

export const processGscPages = async (
    projectId: string,
    csvContent: string,
    supabaseUrl: string,
    supabaseAnonKey: string,
    onProgress?: (count: number, total: number) => void
): Promise<void> => {
    const rows = await parseGscPagesCsv(csvContent);

    if (rows.length === 0) {
        throw new Error("No valid rows found in GSC Pages CSV.");
    }

    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const CHUNK_SIZE = 100;
    let processed = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        
        const updates = chunk.map(row => ({
            project_id: projectId,
            url: normalizeInventoryUrl(row.url),
            gsc_clicks: row.clicks,
            gsc_impressions: row.impressions,
            gsc_position: row.position,
            updated_at: new Date().toISOString(),
            index_status: row.impressions > 0 ? 'INDEXED' : undefined
        }));

        const { error } = await supabase
            .from('site_inventory')
            .upsert(updates as any, { onConflict: 'project_id,url' });

        if (error) {
            console.error("Failed to update GSC data:", error);
            throw new Error(`Database update failed: ${error.message}`);
        }

        processed += chunk.length;
        if (onProgress) onProgress(processed, rows.length);
    }
};

export const calculateCoR = (metrics: { domSizeKb: number, wordCount: number, linkCount: number, codeRatio: number }): number => {
    let score = 0;
    if (metrics.domSizeKb > 500) score += 40;
    else if (metrics.domSizeKb > 100) score += 20;
    if (metrics.linkCount > 200) score += 30;
    else if (metrics.linkCount > 100) score += 15;
    if (metrics.codeRatio < 0.1) score += 30; 
    else if (metrics.codeRatio < 0.2) score += 10;
    return Math.min(100, score);
};

export const runTechnicalCrawl = async (
    projectId: string,
    urls: string[],
    businessInfo: BusinessInfo,
    supabaseUrl: string,
    supabaseAnonKey: string,
    onProgress?: (count: number, total: number) => void
): Promise<void> => {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    let processed = 0;

    for (const url of urls) {
        try {
            // Use Jina-Primary architecture with fallback chain
            const result = await extractSinglePage(url, {
                jinaApiKey: businessInfo.jinaApiKey,
                firecrawlApiKey: businessInfo.firecrawlApiKey,
                apifyToken: businessInfo.apifyToken,
                extractionType: getExtractionTypeForUseCase('full_seo'),
                enableFallback: true,
                proxyConfig: {
                    supabaseUrl,
                    supabaseAnonKey
                }
            });

            // Get metrics from semantic or technical data
            const semantic = result.semantic;
            const technical = result.technical;

            const wordCount = semantic?.wordCount || technical?.wordCount || 0;
            const linkCount = (semantic?.links?.length || 0) +
                             (technical?.internalLinkCount || 0) +
                             (technical?.externalLinkCount || 0);
            const domSizeKb = semantic?.content ? semantic.content.length / 1024 : 0;
            const codeRatio = 0.3; // Default as most providers don't give HTML size

            const corScore = calculateCoR({ domSizeKb, wordCount, linkCount, codeRatio });

            await supabase
                .from('site_inventory')
                .update({
                    dom_size: Math.round(domSizeKb),
                    word_count: wordCount,
                    link_count: linkCount,
                    cor_score: corScore,
                    status: 'GAP_ANALYSIS',
                    updated_at: new Date().toISOString()
                })
                .eq('project_id', projectId)
                .eq('url', normalizeInventoryUrl(url));

        } catch (e) {
            console.warn(`Failed to audit ${url}:`, e);
        }

        processed++;
        if (onProgress) onProgress(processed, urls.length);
    }
};

/**
 * Retrieves the original content for an inventory item.
 * If a snapshot exists, returns it (unless forceRefetch is true).
 * If not, scrapes the URL using Jina-Primary fallback, saves the snapshot, and returns it.
 */
export const getOriginalContent = async (
    inventoryItem: SiteInventoryItem,
    businessInfo: BusinessInfo,
    supabaseUrl: string,
    supabaseAnonKey: string,
    forceRefetch: boolean = false
): Promise<string> => {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    // 1. Check DB for existing snapshot (skip if force refetch)
    console.log('[MigrationService] Checking for cached snapshot:', {
        inventoryId: inventoryItem.id,
        forceRefetch
    });

    if (!forceRefetch) {
        try {
            const { data: existing, error } = await supabase
                .from('transition_snapshots')
                .select('content_markdown')
                .eq('inventory_id', inventoryItem.id)
                .eq('snapshot_type', 'ORIGINAL_IMPORT')
                .single();

            // If we got data, return it
            if (existing?.content_markdown) {
                console.log('[MigrationService] Found cached snapshot, returning cached content:', {
                    contentLength: existing.content_markdown.length
                });
                return existing.content_markdown;
            }

            // Log error for debugging but continue to scrape
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                console.warn('[MigrationService] Error fetching snapshot, will try scraping:', error);
            } else {
                console.log('[MigrationService] No cached snapshot found, will scrape');
            }
        } catch (dbError) {
            // Handle network/API errors gracefully - just proceed to scraping
            console.warn('[MigrationService] Database query failed, proceeding to scrape:', dbError);
        }
    } else {
        // Delete old snapshot if force refetching
        try {
            await supabase
                .from('transition_snapshots')
                .delete()
                .eq('inventory_id', inventoryItem.id)
                .eq('snapshot_type', 'ORIGINAL_IMPORT');
        } catch (deleteError) {
            console.warn('Failed to delete old snapshot:', deleteError);
        }
    }

    // 2. Scrape live using Jina-Primary architecture with fallback
    console.log('[MigrationService] Scraping URL:', inventoryItem.url);
    console.log('[MigrationService] Using provider config:', {
        hasJinaKey: !!businessInfo.jinaApiKey,
        hasFirecrawlKey: !!businessInfo.firecrawlApiKey,
        hasApifyToken: !!businessInfo.apifyToken
    });

    const result = await extractSinglePage(inventoryItem.url, {
        jinaApiKey: businessInfo.jinaApiKey,
        firecrawlApiKey: businessInfo.firecrawlApiKey,
        apifyToken: businessInfo.apifyToken,
        extractionType: getExtractionTypeForUseCase('content_quality'),
        enableFallback: true,
        proxyConfig: {
            supabaseUrl,
            supabaseAnonKey
        }
    });

    console.log('[MigrationService] Extraction result:', {
        hasSemanticData: !!result.semantic,
        hasTechnicalData: !!result.technical,
        markdownLength: result.semantic?.content?.length || 0,
        primaryProvider: result.primaryProvider,
        fallbackUsed: result.fallbackUsed,
        errors: result.errors
    });

    const markdown = result.semantic?.content || '';

    if (!markdown) {
        console.warn('[MigrationService] No markdown content extracted');
        if (result.errors?.length) {
            throw new Error(`Extraction failed: ${result.errors.join(', ')}`);
        }
    }

    // 3. Save snapshot using select-then-insert/update pattern
    // This works with or without the unique constraint on (inventory_id, snapshot_type)
    try {
        // First check if a snapshot already exists
        const { data: existingSnapshot } = await supabase
            .from('transition_snapshots')
            .select('id')
            .eq('inventory_id', inventoryItem.id)
            .eq('snapshot_type', 'ORIGINAL_IMPORT')
            .maybeSingle();

        if (existingSnapshot) {
            // Update existing snapshot
            const { error: updateError } = await supabase
                .from('transition_snapshots')
                .update({
                    content_markdown: markdown,
                    created_at: new Date().toISOString()
                })
                .eq('id', existingSnapshot.id);

            if (updateError) {
                console.warn('[MigrationService] Update error:', updateError);
            } else {
                console.log('[MigrationService] Snapshot updated successfully');
            }
        } else {
            // Insert new snapshot
            const { error: insertError } = await supabase
                .from('transition_snapshots')
                .insert({
                    inventory_id: inventoryItem.id,
                    content_markdown: markdown,
                    snapshot_type: 'ORIGINAL_IMPORT',
                    created_at: new Date().toISOString()
                });

            if (insertError) {
                console.warn('[MigrationService] Insert error:', insertError);
            } else {
                console.log('[MigrationService] Snapshot inserted successfully');
            }
        }
    } catch (saveError) {
        console.warn('[MigrationService] Failed to save snapshot (will still return content):', saveError);
    }

    return markdown;
};

/**
 * Fetches the linked GSC property for a project, if any.
 * Returns the analytics_properties row or null.
 */
export const getLinkedGscProperty = async (
    projectId: string,
    supabaseUrl: string,
    supabaseAnonKey: string
): Promise<{ id: string; property_id: string; property_name: string | null; account_id: string; last_synced_at: string | null } | null> => {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey) as any;
    const { data, error } = await supabase
        .from('analytics_properties')
        .select('id, property_id, property_name, account_id, last_synced_at')
        .eq('project_id', projectId)
        .eq('service', 'gsc')
        .eq('is_primary', true)
        .maybeSingle();

    if (error) {
        console.warn('[MigrationService] Failed to fetch linked GSC property:', error);
        return null;
    }
    // If no primary, try any linked GSC property
    if (!data) {
        const { data: fallback } = await supabase
            .from('analytics_properties')
            .select('id, property_id, property_name, account_id, last_synced_at')
            .eq('project_id', projectId)
            .eq('service', 'gsc')
            .limit(1)
            .maybeSingle();
        return fallback || null;
    }
    return data;
};

/**
 * Imports GSC page-level data from gsc_search_analytics into site_inventory.
 * Uses the server-side get_gsc_page_metrics SQL function to aggregate all data
 * without hitting Supabase's default 1000-row client limit.
 * If no synced data exists, triggers a manual sync via the analytics-sync-worker edge function.
 */
export const importGscFromApi = async (
    projectId: string,
    supabaseUrl: string,
    supabaseAnonKey: string,
    onProgress?: (count: number, total: number) => void,
    onStatus?: (msg: string) => void
): Promise<number> => {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    // 1. Get linked GSC property
    const property = await getLinkedGscProperty(projectId, supabaseUrl, supabaseAnonKey);
    if (!property) {
        throw new Error('No GSC property linked to this project. Connect one in Settings → Search Console.');
    }

    onStatus?.(`Found GSC property: ${property.property_id}`);

    // 2. Use server-side aggregation via RPC (no row limit)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: pages, error: rpcError } = await (supabase as any).rpc('get_gsc_page_metrics', {
        p_property_id: property.id,
        p_start_date: startDate,
        p_end_date: endDate,
    });

    if (rpcError) {
        throw new Error(`Failed to query GSC data: ${rpcError.message}`);
    }

    // 3. If no data, trigger a manual sync then retry
    if (!pages || pages.length === 0) {
        onStatus?.('No synced GSC data found. Triggering sync...');

        const { data: syncResult, error: syncError } = await supabase.functions.invoke(
            'analytics-sync-worker',
            { body: { propertyId: property.id } }
        );

        if (syncError) {
            throw new Error(
                `GSC sync failed: ${syncError.message}. Try uploading a CSV file instead.`
            );
        }

        const results = syncResult?.results || [];
        const firstResult = results[0];
        if (firstResult?.status === 'failed') {
            throw new Error(
                `GSC sync failed: ${firstResult.error || 'Unknown error'}. Try uploading a CSV file instead.`
            );
        }

        onStatus?.(`Sync complete (${firstResult?.rowsSynced || 0} rows). Loading data...`);

        // Re-query via RPC after sync
        const { data: freshPages, error: freshError } = await (supabase as any).rpc('get_gsc_page_metrics', {
            p_property_id: property.id,
            p_start_date: startDate,
            p_end_date: endDate,
        });

        if (freshError || !freshPages || freshPages.length === 0) {
            throw new Error('No GSC data available after sync. Try uploading a CSV file instead.');
        }

        return await upsertGscPages(supabase, projectId, freshPages, onProgress, onStatus);
    }

    return await upsertGscPages(supabase, projectId, pages, onProgress, onStatus);
};

/** Upserts server-aggregated GSC page metrics into site_inventory. */
async function upsertGscPages(
    supabase: SupabaseClient,
    projectId: string,
    pages: { page: string; total_clicks: number; total_impressions: number; avg_position: number; top_queries?: unknown }[],
    onProgress?: (count: number, total: number) => void,
    onStatus?: (msg: string) => void
): Promise<number> {
    onStatus?.(`Importing ${pages.length} pages into inventory...`);

    const CHUNK_SIZE = 100;
    let processed = 0;

    for (let i = 0; i < pages.length; i += CHUNK_SIZE) {
        const chunk = pages.slice(i, i + CHUNK_SIZE);
        const payload = chunk.map(p => ({
            project_id: projectId,
            url: normalizeInventoryUrl(p.page),
            gsc_clicks: p.total_clicks,
            gsc_impressions: p.total_impressions,
            gsc_position: p.avg_position,
            gsc_top_queries: p.top_queries ?? null,
            index_status: p.total_impressions > 0 ? 'INDEXED' : undefined,
            updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
            .from('site_inventory')
            .upsert(payload as any, { onConflict: 'project_id,url' });

        if (error) {
            throw new Error(`Failed to import GSC pages: ${error.message}`);
        }

        processed += chunk.length;
        onProgress?.(processed, pages.length);
    }

    return pages.length;
}