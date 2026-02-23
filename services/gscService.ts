// FIX: Replaced placeholder content with a functional module.
import { GscRow } from '../types';
import { getSupabaseClient } from './supabaseClient';

/**
 * Unified GSC data source — supports both API and CSV import.
 */
export type GscDataSource =
  | { type: 'api'; accountId: string; propertyId: string; accessToken: string }
  | { type: 'csv'; csvText: string };

/**
 * Get GSC rows from either API or CSV source.
 * Preserves parseGscCsv() as a fallback when API is not configured.
 */
export async function getGscData(source: GscDataSource): Promise<GscRow[]> {
  if (source.type === 'csv') {
    return parseGscCsv(source.csvText);
  }

  // API path: uses GscApiAdapter (imported dynamically to avoid circular deps)
  const { GscApiAdapter } = await import('./audit/adapters/GscApiAdapter');
  const adapter = new GscApiAdapter();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 28);

  const rows = await adapter.getSearchAnalytics({
    siteUrl: source.propertyId,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    dimensions: ['query', 'page'],
    accessToken: source.accessToken,
  });

  // Transform GscApiAdapter rows to the existing GscRow format
  return rows.map(row => ({
    query: row.keys[0] || '',
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

/**
 * Parses a CSV string from a Google Search Console export.
 * @param csvText The raw CSV content as a string.
 * @returns A promise that resolves to an array of GscRow objects.
 */
/**
 * Fetch GSC data via the gsc-integration Supabase Edge Function.
 * Use this when you need server-side GSC API access (avoids CORS).
 */
export async function fetchGscEdgeFunctionData(
  siteUrl: string,
  accessToken: string,
  supabaseUrl?: string,
  supabaseAnonKey?: string
) {
  const url = supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
  const key = supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase URL and anon key are required for GSC edge function calls.');
  }
  const supabase = getSupabaseClient(url, key);
  const { data, error } = await supabase.functions.invoke('gsc-integration', {
    body: { siteUrl, accessToken },
  });
  if (error) throw error;
  return data;
}

export const parseGscCsv = (csvText: string): Promise<GscRow[]> => {
    return new Promise((resolve, reject) => {
        if (!csvText) {
            return reject(new Error("CSV text is empty."));
        }

        const lines = csvText.trim().split(/\r?\n/);
        
        // Find the line that actually contains the headers
        let headerLineIndex = -1;
        for(let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Top queries') && lines[i].includes('Clicks')) {
                headerLineIndex = i;
                break;
            }
        }
        
        if (headerLineIndex === -1) {
            return reject(new Error("Could not find a valid header row in the CSV file. Ensure it's a standard GSC export."));
        }
        
        const header = lines[headerLineIndex].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const dataLines = lines.slice(headerLineIndex + 1);

        const queryIndex = header.indexOf('Top queries');
        const clicksIndex = header.indexOf('Clicks');
        const impressionsIndex = header.indexOf('Impressions');
        const ctrIndex = header.indexOf('CTR');
        const positionIndex = header.indexOf('Position');

        if (queryIndex === -1 || clicksIndex === -1 || impressionsIndex === -1 || ctrIndex === -1 || positionIndex === -1) {
            return reject(new Error("CSV header is missing one of the required columns: 'Top queries', 'Clicks', 'Impressions', 'CTR', 'Position'."));
        }

        const data: GscRow[] = [];
        for (const line of dataLines) {
            if (!line.trim()) continue; // Skip empty lines
            
            const values = line.split(',');
            if (values.length >= header.length) {
                try {
                    data.push({
                        query: values[queryIndex].trim().replace(/^"|"$/g, ''),
                        clicks: parseInt(values[clicksIndex], 10),
                        impressions: parseInt(values[impressionsIndex], 10),
                        ctr: parseFloat(values[ctrIndex].replace('%', '')) / 100,
                        position: parseFloat(values[positionIndex]),
                    });
                } catch (e) {
                    console.warn(`Skipping malformed row in GSC CSV: ${line}`);
                }
            }
        }
        resolve(data);
    });
};
