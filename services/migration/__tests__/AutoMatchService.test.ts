import { describe, it, expect } from 'vitest';
import { AutoMatchService } from '../AutoMatchService';
import type { SiteInventoryItem, EnrichedTopic } from '../../../types';
import { FreshnessProfile } from '../../../types';

const makeItem = (overrides: Partial<SiteInventoryItem>): SiteInventoryItem => ({
  id: 'inv-1',
  project_id: 'proj-1',
  url: 'https://example.com/page',
  title: 'Page',
  http_status: 200,
  status: 'AUDIT_PENDING',
  mapped_topic_id: null,
  created_at: '',
  updated_at: '',
  ...overrides,
});

const makeTopic = (overrides: Partial<EnrichedTopic>): EnrichedTopic => ({
  id: 'topic-1',
  map_id: 'map-1',
  title: 'Enterprise CMS Solutions',
  slug: 'enterprise-cms-solutions',
  description: '',
  type: 'core',
  freshness: FreshnessProfile.EVERGREEN,
  parent_topic_id: null,
  ...overrides,
});

describe('AutoMatchService', () => {
  describe('Basic matching (without semantic data)', () => {
    it('should match by H1 and title', () => {
      const service = new AutoMatchService();
      const inventory = [makeItem({
        page_h1: 'Enterprise CMS Solutions',
        page_title: 'Enterprise CMS Solutions | Company',
      })];
      const topics = [makeTopic({})];
      const result = service.match(inventory, topics);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].category).toBe('matched');
      expect(result.matches[0].confidence).toBeGreaterThan(0.4);
    });

    it('should classify as orphan when no match', () => {
      const service = new AutoMatchService();
      const inventory = [makeItem({
        page_h1: 'About Our Company',
        page_title: 'About Us',
        url: 'https://example.com/about',
      })];
      const topics = [makeTopic({})];
      const result = service.match(inventory, topics);
      expect(result.matches[0].category).toBe('orphan');
    });
  });

  describe('Semantic Signals', () => {
    it('should boost confidence when detected CE matches topic title', () => {
      const service = new AutoMatchService();
      const inventory = [makeItem({
        url: 'https://example.com/cms-solutions',
        page_h1: 'Our Solutions',
        page_title: 'Solutions Page',
        detected_ce: 'Enterprise CMS',
      })];
      const topics = [makeTopic({})];
      const result = service.match(inventory, topics);
      const match = result.matches[0];

      expect(match.category).toBe('matched');
      expect(match.confidence).toBeGreaterThan(0.4);
      expect(match.matchSignals.some(s => s.type === 'detected_ce')).toBe(true);
    });

    it('should work without semantic data (backward compatible)', () => {
      const service = new AutoMatchService();
      const inventory = [makeItem({
        page_h1: 'Enterprise CMS Solutions',
        page_title: 'Enterprise CMS Solutions',
      })];
      const topics = [makeTopic({})];
      const result = service.match(inventory, topics);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].category).toBe('matched');
      // Should NOT have semantic signals
      expect(result.matches[0].matchSignals.every(s =>
        !['detected_ce', 'detected_sc', 'detected_csi'].includes(s.type)
      )).toBe(true);
    });

    it('should include detected_csi signal when CSI data is present', () => {
      const service = new AutoMatchService();
      const inventory = [makeItem({
        page_h1: 'Enterprise CMS',
        page_title: 'Enterprise CMS Guide',
        detected_ce: 'Enterprise CMS',
        detected_csi: 'Compare Enterprise CMS Solutions',
      })];
      const topics = [makeTopic({})];
      const result = service.match(inventory, topics);
      const match = result.matches[0];
      expect(match.matchSignals.some(s => s.type === 'detected_csi')).toBe(true);
    });

    it('should use SEMANTIC_SIGNAL_WEIGHTS when semantic data is present', () => {
      const service = new AutoMatchService();

      // Without semantic data — only weak H1 match
      const inventoryNoSemantic = [makeItem({
        id: 'inv-no-sem',
        url: 'https://example.com/solutions',
        page_h1: 'Solutions',
        page_title: 'Solutions Page',
      })];

      // With semantic data — same weak H1 but strong CE match
      const inventorySemantic = [makeItem({
        id: 'inv-sem',
        url: 'https://example.com/solutions',
        page_h1: 'Solutions',
        page_title: 'Solutions Page',
        detected_ce: 'Enterprise CMS Solutions',
      })];

      const topics = [makeTopic({})];

      const resultNoSem = service.match(inventoryNoSemantic, topics);
      const resultSem = service.match(inventorySemantic, topics);

      // Semantic version should have higher confidence due to CE signal
      expect(resultSem.matches[0].confidence).toBeGreaterThan(resultNoSem.matches[0].confidence);
    });

    it('should include detected_sc signal when SC data is present', () => {
      const service = new AutoMatchService();
      const inventory = [makeItem({
        page_h1: 'Enterprise CMS',
        page_title: 'Enterprise CMS Guide',
        detected_ce: 'Enterprise CMS',
        detected_sc: 'Enterprise CMS Solutions',
      })];
      const topics = [makeTopic({})];
      const result = service.match(inventory, topics);
      const match = result.matches[0];
      expect(match.matchSignals.some(s => s.type === 'detected_sc')).toBe(true);
    });
  });
});
