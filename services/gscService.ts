// FIX: Replaced placeholder content with a functional module.
import { GscRow } from '../types';

/**
 * Parses a CSV string from a Google Search Console export.
 * @param csvText The raw CSV content as a string.
 * @returns A promise that resolves to an array of GscRow objects.
 */
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
