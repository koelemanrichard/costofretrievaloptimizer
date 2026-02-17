import { describe, it, expect } from 'vitest';
import { PillarDetectionService } from '../pillarDetection';

describe('PillarDetectionService', () => {
  it('should aggregate detected CEs and suggest the most frequent as primary', () => {
    const service = new PillarDetectionService();

    const detectedResults = [
      { inventoryId: '1', url: 'https://example.com/page1', detectedCE: 'Enterprise CMS', detectedSC: 'Software Company', detectedCSI: 'Buy CMS' },
      { inventoryId: '2', url: 'https://example.com/page2', detectedCE: 'Enterprise CMS', detectedSC: 'Software Company', detectedCSI: 'Compare CMS' },
      { inventoryId: '3', url: 'https://example.com/page3', detectedCE: 'Headless CMS', detectedSC: 'Tech Blog', detectedCSI: 'Learn CMS' },
      { inventoryId: '4', url: 'https://example.com/page4', detectedCE: 'Enterprise CMS', detectedSC: 'Software Company', detectedCSI: 'Buy CMS' },
      { inventoryId: '5', url: 'https://example.com/page5', detectedCE: 'Content Management', detectedSC: 'Software Company', detectedCSI: 'Evaluate CMS' },
    ];

    const suggestion = service.aggregateFromDetections(detectedResults);

    expect(suggestion.centralEntity).toBe('Enterprise CMS');
    expect(suggestion.centralEntityConfidence).toBeGreaterThan(50);
    expect(suggestion.sourceContext).toBe('Software Company');
    expect(suggestion.alternativeSuggestions.centralEntity).toContain('Headless CMS');
    expect(suggestion.alternativeSuggestions.centralEntity).toContain('Content Management');
  });

  it('should detect language from content signals', () => {
    const service = new PillarDetectionService();
    const detectedResults = [
      { inventoryId: '1', url: 'https://example.nl/page1', detectedCE: 'Dakbedekking', language: 'nl' },
      { inventoryId: '2', url: 'https://example.nl/page2', detectedCE: 'Dakbedekking', language: 'nl' },
      { inventoryId: '3', url: 'https://example.nl/page3', detectedCE: 'Dakbedekking', language: 'en' },
    ];

    const suggestion = service.aggregateFromDetections(detectedResults);
    expect(suggestion.detectedLanguage).toBe('nl');
  });

  it('should handle empty results', () => {
    const service = new PillarDetectionService();
    const suggestion = service.aggregateFromDetections([]);
    expect(suggestion.centralEntity).toBe('Unknown');
    expect(suggestion.centralEntityConfidence).toBe(0);
  });

  it('should detect region from URL TLD', () => {
    const service = new PillarDetectionService();
    const detectedResults = [
      { inventoryId: '1', url: 'https://example.nl/page1', detectedCE: 'Test' },
      { inventoryId: '2', url: 'https://example.nl/page2', detectedCE: 'Test' },
    ];

    const suggestion = service.aggregateFromDetections(detectedResults);
    expect(suggestion.detectedRegion).toBe('Netherlands');
  });

  it('should return Global for .com domains', () => {
    const service = new PillarDetectionService();
    const detectedResults = [
      { inventoryId: '1', url: 'https://example.com/page1', detectedCE: 'Test' },
    ];

    const suggestion = service.aggregateFromDetections(detectedResults);
    expect(suggestion.detectedRegion).toBe('Global');
  });
});
