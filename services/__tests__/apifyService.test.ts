import { describe, it, expect } from 'vitest';

/**
 * apifyService error-handling pattern:
 *
 * All fire-and-forget `logApifyUsage(...)` calls use:
 *   .catch((err) => console.warn('[ApifyService] Usage logging failed:', err?.message))
 *
 * This ensures that telemetry failures are visible in the console during
 * development/debugging rather than being silently swallowed. The calls
 * remain fire-and-forget (non-blocking) — only the catch handler changed
 * from a silent `() => {}` to a `console.warn`.
 */

describe('apifyService', () => {
  it('can be imported without errors', async () => {
    const module = await import('../apifyService');
    expect(module).toBeDefined();
  });

  it('exports runApifyActor function', async () => {
    const { runApifyActor } = await import('../apifyService');
    expect(runApifyActor).toBeDefined();
    expect(typeof runApifyActor).toBe('function');
  });

  it('exports collectSerpIntelligence function', async () => {
    const { collectSerpIntelligence } = await import('../apifyService');
    expect(collectSerpIntelligence).toBeDefined();
    expect(typeof collectSerpIntelligence).toBe('function');
  });

  it('exports scrapeCompetitorContent function', async () => {
    const { scrapeCompetitorContent } = await import('../apifyService');
    expect(scrapeCompetitorContent).toBeDefined();
    expect(typeof scrapeCompetitorContent).toBe('function');
  });

  it('exports extractPageTechnicalData function', async () => {
    const { extractPageTechnicalData } = await import('../apifyService');
    expect(extractPageTechnicalData).toBeDefined();
    expect(typeof extractPageTechnicalData).toBe('function');
  });

  it('exports extractMultiplePagesTechnicalData function', async () => {
    const { extractMultiplePagesTechnicalData } = await import('../apifyService');
    expect(extractMultiplePagesTechnicalData).toBeDefined();
    expect(typeof extractMultiplePagesTechnicalData).toBe('function');
  });

  it('exports startAsyncTechnicalExtraction function', async () => {
    const { startAsyncTechnicalExtraction } = await import('../apifyService');
    expect(startAsyncTechnicalExtraction).toBeDefined();
    expect(typeof startAsyncTechnicalExtraction).toBe('function');
  });

  it('exports checkApifyRunStatus function', async () => {
    const { checkApifyRunStatus } = await import('../apifyService');
    expect(checkApifyRunStatus).toBeDefined();
    expect(typeof checkApifyRunStatus).toBe('function');
  });

  it('exports fetchApifyDatasetResults function', async () => {
    const { fetchApifyDatasetResults } = await import('../apifyService');
    expect(fetchApifyDatasetResults).toBeDefined();
    expect(typeof fetchApifyDatasetResults).toBe('function');
  });

  it('exports countryNameToCode function', async () => {
    const { countryNameToCode } = await import('../apifyService');
    expect(countryNameToCode).toBeDefined();
    expect(typeof countryNameToCode).toBe('function');
  });

  describe('countryNameToCode', () => {
    it('maps known country names to ISO codes', async () => {
      const { countryNameToCode } = await import('../apifyService');
      expect(countryNameToCode('united states')).toBe('us');
      expect(countryNameToCode('USA')).toBe('us');
      expect(countryNameToCode('Netherlands')).toBe('nl');
      expect(countryNameToCode('United Kingdom')).toBe('gb');
      expect(countryNameToCode('Germany')).toBe('de');
    });

    it('returns undefined for unknown country names', async () => {
      const { countryNameToCode } = await import('../apifyService');
      expect(countryNameToCode('unknown-country')).toBeUndefined();
    });

    it('handles whitespace trimming', async () => {
      const { countryNameToCode } = await import('../apifyService');
      expect(countryNameToCode('  france  ')).toBe('fr');
    });
  });
});
