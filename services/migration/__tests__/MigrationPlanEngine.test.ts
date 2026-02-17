import { describe, it, expect } from 'vitest';
import { computeDataCompleteness, MigrationPlanEngine } from '../MigrationPlanEngine';
import type { SiteInventoryItem } from '../../../types';

// Minimal inventory item factory
function makeItem(overrides: Partial<SiteInventoryItem> = {}): SiteInventoryItem {
  return {
    id: 'test-1',
    project_id: 'proj-1',
    url: 'https://example.com/test',
    title: 'Test Page',
    http_status: 200,
    mapped_topic_id: null,
    status: 'AUDIT_PENDING',
    ...overrides,
  } as SiteInventoryItem;
}

describe('computeDataCompleteness', () => {
  it('returns 0 for item with no data', () => {
    const item = makeItem();
    expect(computeDataCompleteness(item)).toBe(0);
  });

  it('returns 25 for item with only GSC data', () => {
    const item = makeItem({ gsc_clicks: 10, gsc_impressions: 100 });
    expect(computeDataCompleteness(item)).toBe(25);
  });

  it('returns 100 for item with all data', () => {
    const item = makeItem({
      audit_score: 75,
      gsc_clicks: 10,
      gsc_impressions: 100,
      cwv_assessment: 'good',
      word_count: 500,
      internal_link_count: 5,
    });
    expect(computeDataCompleteness(item)).toBe(100);
  });

  it('counts cor_score as technical data', () => {
    const item = makeItem({ cor_score: 30 });
    expect(computeDataCompleteness(item)).toBe(20);
  });

  it('does not count word_count of 0', () => {
    const item = makeItem({ word_count: 0 });
    expect(computeDataCompleteness(item)).toBe(0);
  });
});

describe('MigrationPlanEngine — page type protection', () => {
  const engine = new MigrationPlanEngine();

  it('protects conversion pages from PRUNE', () => {
    const inventory = [
      makeItem({
        id: 'conv-1',
        url: 'https://example.nl/offerte-aanvragen-verzonden',
        gsc_clicks: 0,
        gsc_impressions: 0,
      }),
    ];

    const matchResult = {
      matches: [{
        inventoryId: 'conv-1',
        topicId: null,
        confidence: 0,
        category: 'orphan' as const,
        matchSignals: [],
      }],
      gaps: [],
      stats: { matched: 0, orphans: 1, gaps: 0, cannibalization: 0 },
    };

    const plan = engine.generatePlan({ inventory, topics: [], matchResult });
    const action = plan.find(a => a.inventoryId === 'conv-1');
    expect(action).toBeDefined();
    expect(action!.action).toBe('KEEP');
    expect(action!.reasoning).toContain('protected from pruning');
  });

  it('protects homepage from PRUNE', () => {
    const inventory = [
      makeItem({
        id: 'home-1',
        url: 'https://example.nl/',
      }),
    ];

    const matchResult = {
      matches: [{
        inventoryId: 'home-1',
        topicId: null,
        confidence: 0,
        category: 'orphan' as const,
        matchSignals: [],
      }],
      gaps: [],
      stats: { matched: 0, orphans: 1, gaps: 0, cannibalization: 0 },
    };

    const plan = engine.generatePlan({ inventory, topics: [], matchResult });
    const action = plan.find(a => a.inventoryId === 'home-1');
    expect(action).toBeDefined();
    expect(action!.action).toBe('KEEP');
  });

  it('protects location pages from PRUNE', () => {
    const inventory = [
      makeItem({
        id: 'loc-1',
        url: 'https://example.nl/dakdekker-oosterhout',
        gsc_clicks: 0,
        gsc_impressions: 0,
      }),
    ];

    const matchResult = {
      matches: [{
        inventoryId: 'loc-1',
        topicId: null,
        confidence: 0,
        category: 'orphan' as const,
        matchSignals: [],
      }],
      gaps: [],
      stats: { matched: 0, orphans: 1, gaps: 0, cannibalization: 0 },
    };

    const plan = engine.generatePlan({ inventory, topics: [], matchResult });
    const action = plan.find(a => a.inventoryId === 'loc-1');
    expect(action).toBeDefined();
    expect(action!.action).toBe('KEEP');
    expect(action!.reasoning).toContain('protected from pruning');
  });

  it('defaults to KEEP when data completeness is low', () => {
    // Item with only GSC data = 25% completeness — below 30% threshold
    const inventory = [
      makeItem({
        id: 'low-data-1',
        url: 'https://example.nl/some-random-page',
        gsc_clicks: 0,
        gsc_impressions: 5,
      }),
    ];

    const matchResult = {
      matches: [{
        inventoryId: 'low-data-1',
        topicId: null,
        confidence: 0,
        category: 'orphan' as const,
        matchSignals: [],
      }],
      gaps: [],
      stats: { matched: 0, orphans: 1, gaps: 0, cannibalization: 0 },
    };

    const plan = engine.generatePlan({ inventory, topics: [], matchResult });
    const action = plan.find(a => a.inventoryId === 'low-data-1');
    expect(action).toBeDefined();
    expect(action!.action).toBe('KEEP');
    expect(action!.reasoning).toContain('Insufficient data');
  });
});
