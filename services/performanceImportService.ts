/**
 * Performance Import Service
 *
 * Handles importing performance data from GSC CSV exports.
 * Matches URLs to topics and stores as performance snapshots.
 */

import { v4 as uuidv4 } from 'uuid';
import { EnrichedTopic, PerformanceSnapshot } from '../types';
import { getSupabaseClient } from './supabaseClient';

interface GSCRow {
    url?: string;
    page?: string;
    clicks?: string | number;
    impressions?: string | number;
    ctr?: string | number;
    position?: string | number;
}

interface ParsedCSVRow {
    url: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface MatchedPerformanceData {
    topic_id: string;
    topic_title: string;
    matched_url: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface UnmatchedRow {
    url: string;
    clicks: number;
    impressions: number;
}

interface ImportPreview {
    matched: MatchedPerformanceData[];
    unmatched: UnmatchedRow[];
    totalRows: number;
}

interface ImportResult {
    success: boolean;
    snapshotsCreated: number;
    baselinesSet: number;
    errors: string[];
}

/**
 * Parse a GSC CSV file content into structured data
 */
export function parseGSCCSV(csvContent: string): ParsedCSVRow[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse header row
    const headerLine = lines[0].toLowerCase();
    const headers = parseCSVLine(headerLine);

    // Find column indices
    const urlIndex = headers.findIndex(h => h.includes('page') || h.includes('url'));
    const clicksIndex = headers.findIndex(h => h.includes('click'));
    const impressionsIndex = headers.findIndex(h => h.includes('impression'));
    const ctrIndex = headers.findIndex(h => h.includes('ctr'));
    const positionIndex = headers.findIndex(h => h.includes('position'));

    if (urlIndex === -1) {
        throw new Error('CSV must contain a "Page" or "URL" column');
    }

    const rows: ParsedCSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);

        const url = values[urlIndex] || '';
        if (!url) continue;

        rows.push({
            url,
            clicks: parseNumber(values[clicksIndex]),
            impressions: parseNumber(values[impressionsIndex]),
            ctr: parseCTR(values[ctrIndex]),
            position: parseNumber(values[positionIndex])
        });
    }

    return rows;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

/**
 * Parse a number from string, handling various formats
 */
function parseNumber(value: string | undefined): number {
    if (!value) return 0;
    const cleaned = value.replace(/[,\s]/g, '');
    return parseFloat(cleaned) || 0;
}

/**
 * Parse CTR which may be percentage or decimal
 */
function parseCTR(value: string | undefined): number {
    if (!value) return 0;
    const cleaned = value.replace(/[%\s]/g, '');
    const num = parseFloat(cleaned) || 0;
    // If > 1, assume it's a percentage and convert to decimal
    return num > 1 ? num / 100 : num;
}

/**
 * Extract slug from URL for matching
 */
function extractSlug(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        // Remove trailing slash and get last segment
        const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean);
        return segments[segments.length - 1] || '';
    } catch {
        // If URL parsing fails, try simple extraction
        const parts = url.split('/').filter(Boolean);
        return parts[parts.length - 1] || '';
    }
}

/**
 * Match CSV rows to topics
 */
export function matchRowsToTopics(
    rows: ParsedCSVRow[],
    topics: EnrichedTopic[]
): ImportPreview {
    const matched: MatchedPerformanceData[] = [];
    const unmatched: UnmatchedRow[] = [];

    // Build slug -> topic map
    const topicBySlug = new Map<string, EnrichedTopic>();
    topics.forEach(t => {
        if (t.slug) {
            topicBySlug.set(t.slug.toLowerCase(), t);
        }
    });

    rows.forEach(row => {
        const urlSlug = extractSlug(row.url).toLowerCase();
        const topic = topicBySlug.get(urlSlug);

        if (topic) {
            matched.push({
                topic_id: topic.id,
                topic_title: topic.title,
                matched_url: row.url,
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
                position: row.position
            });
        } else {
            unmatched.push({
                url: row.url,
                clicks: row.clicks,
                impressions: row.impressions
            });
        }
    });

    return {
        matched,
        unmatched,
        totalRows: rows.length
    };
}

/**
 * Import performance data into Supabase
 */
export async function importPerformanceData(
    preview: ImportPreview,
    mapId: string,
    userId: string,
    existingBaselines: Map<string, PerformanceSnapshot>,
    supabaseUrl: string,
    supabaseKey: string
): Promise<ImportResult> {
    const supabase = getSupabaseClient(supabaseUrl, supabaseKey);
    const errors: string[] = [];
    let snapshotsCreated = 0;
    let baselinesSet = 0;

    const capturedAt = new Date().toISOString();

    for (const match of preview.matched) {
        try {
            const existingBaseline = existingBaselines.get(match.topic_id);
            const isBaseline = !existingBaseline;

            // Calculate deltas if we have a baseline
            let deltaClicks: number | undefined;
            let deltaImpressions: number | undefined;
            let deltaCtr: number | undefined;
            let deltaPosition: number | undefined;

            if (existingBaseline) {
                deltaClicks = match.clicks - existingBaseline.gsc_clicks;
                deltaImpressions = match.impressions - existingBaseline.gsc_impressions;
                deltaCtr = match.ctr - existingBaseline.gsc_ctr;
                deltaPosition = match.position - existingBaseline.gsc_position;
            }

            const snapshot: Omit<PerformanceSnapshot, 'id'> = {
                topic_id: match.topic_id,
                map_id: mapId,
                user_id: userId,
                captured_at: capturedAt,
                capture_source: 'csv_import',
                is_baseline: isBaseline,
                gsc_clicks: match.clicks,
                gsc_impressions: match.impressions,
                gsc_ctr: match.ctr,
                gsc_position: match.position,
                delta_clicks: deltaClicks,
                delta_impressions: deltaImpressions,
                delta_ctr: deltaCtr,
                delta_position: deltaPosition
            };

            const { error } = await supabase.from('performance_snapshots').insert({
                id: uuidv4(),
                ...snapshot
            });

            if (error) {
                errors.push(`Failed to save snapshot for "${match.topic_title}": ${error.message}`);
            } else {
                snapshotsCreated++;
                if (isBaseline) {
                    baselinesSet++;
                }
            }
        } catch (error) {
            errors.push(`Error processing "${match.topic_title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    return {
        success: errors.length === 0,
        snapshotsCreated,
        baselinesSet,
        errors
    };
}

/**
 * Load existing baselines for topics
 */
export async function loadExistingBaselines(
    mapId: string,
    supabaseUrl: string,
    supabaseKey: string
): Promise<Map<string, PerformanceSnapshot>> {
    const supabase = getSupabaseClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('performance_snapshots')
        .select('*')
        .eq('map_id', mapId)
        .eq('is_baseline', true);

    if (error || !data) {
        return new Map();
    }

    return new Map(data.map(s => [s.topic_id, s as PerformanceSnapshot]));
}

/**
 * Get performance history for a topic
 */
export async function getTopicPerformanceHistory(
    topicId: string,
    supabaseUrl: string,
    supabaseKey: string
): Promise<PerformanceSnapshot[]> {
    const supabase = getSupabaseClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('performance_snapshots')
        .select('*')
        .eq('topic_id', topicId)
        .order('captured_at', { ascending: true });

    if (error || !data) {
        return [];
    }

    return data as PerformanceSnapshot[];
}

/**
 * Get latest snapshots for all topics in a map
 */
export async function getLatestSnapshotsForMap(
    mapId: string,
    supabaseUrl: string,
    supabaseKey: string
): Promise<Map<string, PerformanceSnapshot>> {
    const supabase = getSupabaseClient(supabaseUrl, supabaseKey);

    // Get the latest snapshot for each topic using distinct on
    const { data, error } = await supabase
        .from('performance_snapshots')
        .select('*')
        .eq('map_id', mapId)
        .order('captured_at', { ascending: false });

    if (error || !data) {
        return new Map();
    }

    // Group by topic_id and take first (most recent)
    const latestByTopic = new Map<string, PerformanceSnapshot>();
    data.forEach(s => {
        if (!latestByTopic.has(s.topic_id)) {
            latestByTopic.set(s.topic_id, s as PerformanceSnapshot);
        }
    });

    return latestByTopic;
}

export type { ImportPreview, ImportResult, MatchedPerformanceData, UnmatchedRow };
