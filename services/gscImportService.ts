// services/gscImportService.ts
// Google Search Console CSV import and parsing

import { GscRow } from '../types';

export interface GscPagesRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueriesRow extends GscRow {
  // GscRow already has: query, clicks, impressions, ctr, position
}

export interface GscPageQueriesRow {
  page: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscImportResult<T> {
  data: T[];
  errors: string[];
  totalRows: number;
  skippedRows: number;
}

/**
 * Parse CSV text into rows
 * Handles quoted fields and various delimiters
 */
const parseCSV = (csvText: string): string[][] => {
  const rows: string[][] = [];
  const lines = csvText.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          // End of quoted field
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          // Start of quoted field
          inQuotes = true;
        } else if (char === ',' || char === '\t') {
          // Field delimiter (support both comma and tab)
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }

    // Push last field
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
};

/**
 * Detect column indices from header row
 * GSC exports have different header names depending on language/version
 */
const detectColumns = (headers: string[]): {
  page?: number;
  query?: number;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
} => {
  const indices: {
    page?: number;
    query?: number;
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  } = {};

  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

  // Page/URL column
  const pageAliases = ['page', 'url', 'top pages', 'landing page'];
  indices.page = normalizedHeaders.findIndex(h => pageAliases.some(a => h.includes(a)));

  // Query column
  const queryAliases = ['query', 'queries', 'top queries', 'search query', 'keyword'];
  indices.query = normalizedHeaders.findIndex(h => queryAliases.some(a => h.includes(a)));

  // Clicks column
  const clicksAliases = ['clicks', 'click'];
  indices.clicks = normalizedHeaders.findIndex(h => clicksAliases.some(a => h.includes(a)));

  // Impressions column
  const impressionsAliases = ['impressions', 'impression'];
  indices.impressions = normalizedHeaders.findIndex(h => impressionsAliases.some(a => h.includes(a)));

  // CTR column
  const ctrAliases = ['ctr', 'click-through rate', 'click through rate'];
  indices.ctr = normalizedHeaders.findIndex(h => ctrAliases.some(a => h.includes(a)));

  // Position column
  const positionAliases = ['position', 'average position', 'avg. position', 'avg position'];
  indices.position = normalizedHeaders.findIndex(h => positionAliases.some(a => h.includes(a)));

  // Convert -1 to undefined
  for (const key of Object.keys(indices) as (keyof typeof indices)[]) {
    if (indices[key] === -1) {
      indices[key] = undefined;
    }
  }

  return indices;
};

/**
 * Parse CTR value (handles percentage format)
 */
const parseCtr = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace('%', '').replace(',', '.').trim();
  const parsed = parseFloat(cleaned);
  // If value was a percentage (0-100), convert to decimal
  if (parsed > 1 && value.includes('%')) {
    return parsed / 100;
  }
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Parse numeric value (handles locale-specific formatting)
 */
const parseNumber = (value: string): number => {
  if (!value) return 0;
  // Remove thousand separators and normalize decimal
  const cleaned = value.replace(/[,\s]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Import GSC Pages report CSV
 */
export const importGscPages = (csvText: string): GscImportResult<GscPagesRow> => {
  const result: GscImportResult<GscPagesRow> = {
    data: [],
    errors: [],
    totalRows: 0,
    skippedRows: 0,
  };

  try {
    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      result.errors.push('CSV file is empty or has no data rows');
      return result;
    }

    const headers = rows[0];
    const columns = detectColumns(headers);

    if (columns.page === undefined) {
      result.errors.push('Could not find page/URL column in CSV');
      return result;
    }

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      result.totalRows++;

      try {
        const page = row[columns.page!];
        if (!page || !page.startsWith('http')) {
          result.skippedRows++;
          continue;
        }

        result.data.push({
          page,
          clicks: columns.clicks !== undefined ? parseNumber(row[columns.clicks]) : 0,
          impressions: columns.impressions !== undefined ? parseNumber(row[columns.impressions]) : 0,
          ctr: columns.ctr !== undefined ? parseCtr(row[columns.ctr]) : 0,
          position: columns.position !== undefined ? parseNumber(row[columns.position]) : 0,
        });
      } catch (error) {
        result.skippedRows++;
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }

    return result;
  } catch (error) {
    result.errors.push(`CSV parse error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
};

/**
 * Import GSC Queries report CSV
 */
export const importGscQueries = (csvText: string): GscImportResult<GscQueriesRow> => {
  const result: GscImportResult<GscQueriesRow> = {
    data: [],
    errors: [],
    totalRows: 0,
    skippedRows: 0,
  };

  try {
    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      result.errors.push('CSV file is empty or has no data rows');
      return result;
    }

    const headers = rows[0];
    const columns = detectColumns(headers);

    if (columns.query === undefined) {
      result.errors.push('Could not find query column in CSV');
      return result;
    }

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      result.totalRows++;

      try {
        const query = row[columns.query!];
        if (!query) {
          result.skippedRows++;
          continue;
        }

        result.data.push({
          query,
          clicks: columns.clicks !== undefined ? parseNumber(row[columns.clicks]) : 0,
          impressions: columns.impressions !== undefined ? parseNumber(row[columns.impressions]) : 0,
          ctr: columns.ctr !== undefined ? parseCtr(row[columns.ctr]) : 0,
          position: columns.position !== undefined ? parseNumber(row[columns.position]) : 0,
        });
      } catch (error) {
        result.skippedRows++;
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }

    return result;
  } catch (error) {
    result.errors.push(`CSV parse error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
};

/**
 * Import GSC Pages+Queries report CSV (detailed export)
 */
export const importGscPageQueries = (csvText: string): GscImportResult<GscPageQueriesRow> => {
  const result: GscImportResult<GscPageQueriesRow> = {
    data: [],
    errors: [],
    totalRows: 0,
    skippedRows: 0,
  };

  try {
    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      result.errors.push('CSV file is empty or has no data rows');
      return result;
    }

    const headers = rows[0];
    const columns = detectColumns(headers);

    if (columns.page === undefined && columns.query === undefined) {
      result.errors.push('Could not find page or query columns in CSV');
      return result;
    }

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      result.totalRows++;

      try {
        const page = columns.page !== undefined ? row[columns.page] : '';
        const query = columns.query !== undefined ? row[columns.query] : '';

        if (!page && !query) {
          result.skippedRows++;
          continue;
        }

        result.data.push({
          page,
          query,
          clicks: columns.clicks !== undefined ? parseNumber(row[columns.clicks]) : 0,
          impressions: columns.impressions !== undefined ? parseNumber(row[columns.impressions]) : 0,
          ctr: columns.ctr !== undefined ? parseCtr(row[columns.ctr]) : 0,
          position: columns.position !== undefined ? parseNumber(row[columns.position]) : 0,
        });
      } catch (error) {
        result.skippedRows++;
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }

    return result;
  } catch (error) {
    result.errors.push(`CSV parse error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
};

/**
 * Auto-detect CSV type and import accordingly
 */
export const importGscCsv = (csvText: string): {
  type: 'pages' | 'queries' | 'page_queries' | 'unknown';
  pages?: GscImportResult<GscPagesRow>;
  queries?: GscImportResult<GscQueriesRow>;
  pageQueries?: GscImportResult<GscPageQueriesRow>;
} => {
  const rows = parseCSV(csvText);
  if (rows.length < 1) {
    return { type: 'unknown' };
  }

  const headers = rows[0];
  const columns = detectColumns(headers);

  const hasPage = columns.page !== undefined;
  const hasQuery = columns.query !== undefined;

  if (hasPage && hasQuery) {
    return {
      type: 'page_queries',
      pageQueries: importGscPageQueries(csvText),
    };
  } else if (hasPage) {
    return {
      type: 'pages',
      pages: importGscPages(csvText),
    };
  } else if (hasQuery) {
    return {
      type: 'queries',
      queries: importGscQueries(csvText),
    };
  }

  return { type: 'unknown' };
};

/**
 * Group queries by page URL
 */
export const groupQueriesByPage = (
  data: GscPageQueriesRow[]
): Map<string, GscRow[]> => {
  const grouped = new Map<string, GscRow[]>();

  for (const row of data) {
    if (!row.page) continue;

    if (!grouped.has(row.page)) {
      grouped.set(row.page, []);
    }

    grouped.get(row.page)!.push({
      query: row.query,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    });
  }

  // Sort queries by clicks within each page
  for (const [page, queries] of grouped) {
    queries.sort((a, b) => b.clicks - a.clicks);
  }

  return grouped;
};

/**
 * Aggregate metrics for a page from multiple queries
 */
export const aggregatePageMetrics = (queries: GscRow[]): {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  topQuery: string;
  queryCount: number;
} => {
  if (queries.length === 0) {
    return {
      totalClicks: 0,
      totalImpressions: 0,
      avgCtr: 0,
      avgPosition: 0,
      topQuery: '',
      queryCount: 0,
    };
  }

  const totalClicks = queries.reduce((sum, q) => sum + q.clicks, 0);
  const totalImpressions = queries.reduce((sum, q) => sum + q.impressions, 0);

  // Weighted average for position (by impressions)
  const weightedPosition = queries.reduce((sum, q) => sum + q.position * q.impressions, 0);
  const avgPosition = totalImpressions > 0 ? weightedPosition / totalImpressions : 0;

  // CTR is calculated from totals
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  // Top query by clicks
  const topQuery = queries.reduce((top, q) => q.clicks > top.clicks ? q : top, queries[0]).query;

  return {
    totalClicks,
    totalImpressions,
    avgCtr,
    avgPosition,
    topQuery,
    queryCount: queries.length,
  };
};

/**
 * Find low-hanging fruit opportunities
 * Pages/queries with high impressions but low CTR or position
 */
export const findGscOpportunities = <T extends GscPagesRow | GscQueriesRow>(
  data: T[],
  options?: {
    minImpressions?: number;
    maxPosition?: number;
    maxCtr?: number;
  }
): T[] => {
  const {
    minImpressions = 100,
    maxPosition = 20,
    maxCtr = 0.05, // 5%
  } = options || {};

  return data.filter(row => {
    return (
      row.impressions >= minImpressions &&
      row.position <= maxPosition &&
      row.ctr <= maxCtr
    );
  }).sort((a, b) => b.impressions - a.impressions);
};

/**
 * Read CSV file from File object (browser)
 */
export const readCsvFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        resolve(text);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
