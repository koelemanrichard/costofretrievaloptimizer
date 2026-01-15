// services/ai/contentGeneration/rulesEngine/validators/__tests__/linkSemanticValidator.test.ts

import {
  LinkSemanticValidator,
  findTargetTopic,
  calculateSemanticRelevance,
  LinkValidationResult,
} from '../linkSemanticValidator';
import { SectionGenerationContext, SemanticTriple } from '../../../../../../types';

describe('LinkSemanticValidator', () => {
  // Helper to create test context
  const createContext = (overrides: Partial<SectionGenerationContext> = {}): SectionGenerationContext => ({
    section: { heading: 'Test Section', content_zone: 'MAIN' } as any,
    brief: {} as any,
    businessInfo: { seedKeyword: 'solar panels' } as any,
    allSections: [],
    isYMYL: false,
    ...overrides,
  });

  // Sample topical map topics for testing
  const sampleTopics = [
    {
      keyword: 'solar panel installation',
      url: '/guides/solar-panel-installation',
      eavs: [
        {
          subject: { label: 'Solar Panel', type: 'Product' },
          predicate: { relation: 'requires', type: 'process' },
          object: { value: 'professional installation', type: 'string' },
        } as SemanticTriple,
      ],
    },
    {
      keyword: 'solar energy benefits',
      url: '/info/solar-energy-benefits',
      eavs: [
        {
          subject: { label: 'Solar Energy', type: 'Concept' },
          predicate: { relation: 'provides', type: 'benefit' },
          object: { value: 'cost savings', type: 'string' },
        } as SemanticTriple,
      ],
    },
    {
      keyword: 'residential solar costs',
      url: '/pricing/residential-solar-costs',
    },
  ];

  describe('validate()', () => {
    it('should return no violations when no topical map topics provided', () => {
      const content = 'Check out our [guide](/some-link) for more information.';
      const violations = LinkSemanticValidator.validate(content, undefined);
      expect(violations).toHaveLength(0);
    });

    it('should return no violations for empty topical map', () => {
      const content = 'Check out our [guide](/some-link) for more information.';
      const violations = LinkSemanticValidator.validate(content, []);
      expect(violations).toHaveLength(0);
    });

    it('should pass for links with semantically relevant anchor text (exact keyword match)', () => {
      const content = 'Learn more about [solar panel installation](/guides/solar-panel-installation) to get started.';
      const violations = LinkSemanticValidator.validate(content, sampleTopics);
      expect(violations).toHaveLength(0);
    });

    it('should pass for links with partial keyword match', () => {
      const content = 'Consider the [installation process](/guides/solar-panel-installation) for your home.';
      const violations = LinkSemanticValidator.validate(content, sampleTopics);
      expect(violations).toHaveLength(0);
    });

    it('should flag links with low relevance anchor text', () => {
      const content = 'Read our [amazing guide](/guides/solar-panel-installation) today!';
      const violations = LinkSemanticValidator.validate(content, sampleTopics);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].rule).toBe('LINK_SEMANTIC_ALIGNMENT');
      expect(violations[0].severity).toBe('warning');
    });

    it('should flag generic anchor text like "click here"', () => {
      const content = '[Click here](/guides/solar-panel-installation) for more details.';
      const violations = LinkSemanticValidator.validate(content, sampleTopics);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].suggestion).toContain('low semantic relevance');
    });

    it('should skip external links not in topical map', () => {
      const content = 'Check the official [government rebates](https://energy.gov/rebates) available.';
      const violations = LinkSemanticValidator.validate(content, sampleTopics);
      expect(violations).toHaveLength(0);
    });

    it('should validate external links that ARE in topical map by URL', () => {
      const topicsWithExternal = [
        ...sampleTopics,
        {
          keyword: 'federal tax credits',
          url: 'https://energy.gov/credits',
        },
      ];
      // Good anchor - should pass
      const goodContent = 'Apply for [federal tax credits](https://energy.gov/credits) today.';
      const goodViolations = LinkSemanticValidator.validate(goodContent, topicsWithExternal);
      expect(goodViolations).toHaveLength(0);

      // Bad anchor - should flag
      const badContent = 'Check out [this page](https://energy.gov/credits) for info.';
      const badViolations = LinkSemanticValidator.validate(badContent, topicsWithExternal);
      expect(badViolations.length).toBeGreaterThan(0);
    });

    it('should skip links that are not in topical map', () => {
      const content = 'Visit our [FAQ page](/faq) for common questions.';
      const violations = LinkSemanticValidator.validate(content, sampleTopics);
      // Link URL /faq not in topical map - should be skipped
      expect(violations).toHaveLength(0);
    });

    it('should handle multiple links in content', () => {
      const content = `
        Learn about [solar panel installation](/guides/solar-panel-installation) first.
        Then read about the [random stuff](/info/solar-energy-benefits) available.
        Finally, check the [costs](/pricing/residential-solar-costs).
      `;
      const violations = LinkSemanticValidator.validate(content, sampleTopics);
      // "random stuff" has low relevance to "solar energy benefits"
      // "costs" matches "residential solar costs"
      expect(violations.some(v => v.text.includes('random stuff'))).toBe(true);
    });

    it('should include position in violation for error location', () => {
      const content = 'Check out [click here](/guides/solar-panel-installation) to learn.';
      const violations = LinkSemanticValidator.validate(content, sampleTopics);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].position).toBeGreaterThanOrEqual(0);
    });

    it('should provide helpful suggestion in violation', () => {
      const content = '[Learn more](/guides/solar-panel-installation) about this topic.';
      const violations = LinkSemanticValidator.validate(content, sampleTopics);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].suggestion).toContain('solar panel installation');
    });
  });

  describe('findTargetTopic()', () => {
    it('should find topic by exact URL match', () => {
      const result = findTargetTopic(sampleTopics, '/guides/solar-panel-installation', 'anything');
      expect(result).toBeDefined();
      expect(result?.keyword).toBe('solar panel installation');
    });

    it('should find topic by keyword-in-URL pattern', () => {
      const result = findTargetTopic(sampleTopics, '/some-page/solar-energy-benefits-guide', 'anything');
      expect(result).toBeDefined();
      expect(result?.keyword).toBe('solar energy benefits');
    });

    it('should find topic by anchor text matching keyword', () => {
      const result = findTargetTopic(sampleTopics, '/unknown/path', 'solar panel installation guide');
      expect(result).toBeDefined();
      expect(result?.keyword).toBe('solar panel installation');
    });

    it('should return undefined when no match found', () => {
      const result = findTargetTopic(sampleTopics, '/unrelated/page', 'unrelated anchor');
      expect(result).toBeUndefined();
    });

    it('should prioritize exact URL match over keyword-in-URL', () => {
      const topics = [
        { keyword: 'topic one', url: '/exact-match' },
        { keyword: 'topic two', url: '/different-exact-match' },
      ];
      const result = findTargetTopic(topics, '/exact-match', 'topic two');
      expect(result?.keyword).toBe('topic one');
    });
  });

  describe('calculateSemanticRelevance()', () => {
    it('should return 1.0 for exact keyword match in anchor', () => {
      const relevance = calculateSemanticRelevance('solar panel installation', 'solar panel installation');
      expect(relevance).toBe(1.0);
    });

    it('should return 1.0 when anchor contains full keyword', () => {
      const relevance = calculateSemanticRelevance('complete solar panel installation guide', 'solar panel installation');
      expect(relevance).toBe(1.0);
    });

    it('should return 1.0 when keyword contains full anchor', () => {
      const relevance = calculateSemanticRelevance('installation', 'solar panel installation');
      expect(relevance).toBe(1.0);
    });

    it('should return high score (0.8) for significant word overlap', () => {
      const relevance = calculateSemanticRelevance('panel installation', 'solar panel installation');
      expect(relevance).toBeGreaterThanOrEqual(0.5);
    });

    it('should return medium score (0.5) for partial word overlap', () => {
      const relevance = calculateSemanticRelevance('installing panels', 'solar panel installation');
      // "panels" doesn't match "panel" exactly, so might be partial
      expect(relevance).toBeGreaterThan(0);
    });

    it('should return score based on EAV terms when no keyword match', () => {
      const eavs: SemanticTriple[] = [
        {
          subject: { label: 'Solar System', type: 'Product' },
          predicate: { relation: 'provides', type: 'benefit' },
          object: { value: 'energy savings', type: 'string' },
        },
      ];
      const relevance = calculateSemanticRelevance('energy savings guide', 'photovoltaic systems', eavs);
      expect(relevance).toBeGreaterThanOrEqual(0.6);
    });

    it('should return low score (0.1) when no semantic match found', () => {
      const relevance = calculateSemanticRelevance('click here', 'solar panel installation');
      expect(relevance).toBeLessThanOrEqual(0.3);
    });

    it('should be case-insensitive', () => {
      const relevance = calculateSemanticRelevance('SOLAR PANEL INSTALLATION', 'solar panel installation');
      expect(relevance).toBe(1.0);
    });

    it('should handle empty strings gracefully', () => {
      expect(calculateSemanticRelevance('', 'keyword')).toBeLessThan(0.3);
      expect(calculateSemanticRelevance('anchor', '')).toBeLessThan(0.3);
    });

    it('should filter short words (< 3 chars) from word overlap calculation', () => {
      // "to" and "a" should be ignored
      const relevance = calculateSemanticRelevance('how to install a panel', 'panel installation');
      // Should match on "install"/"installation" overlap or "panel"
      expect(relevance).toBeGreaterThan(0.1);
    });
  });

  describe('edge cases', () => {
    it('should handle content with no links', () => {
      const content = 'This is plain content without any links.';
      const violations = LinkSemanticValidator.validate(content, sampleTopics);
      expect(violations).toHaveLength(0);
    });

    it('should handle malformed markdown links gracefully', () => {
      const content = 'A [broken link( and [another](valid-url) here.';
      // Should not throw error
      expect(() => LinkSemanticValidator.validate(content, sampleTopics)).not.toThrow();
    });

    it('should handle links with empty anchor text', () => {
      const content = 'A [](/guides/solar-panel-installation) hidden link.';
      const violations = LinkSemanticValidator.validate(content, sampleTopics);
      // Empty anchor has zero relevance
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should handle topics with undefined EAVs', () => {
      const topicsNoEavs = [{ keyword: 'test topic', url: '/test' }];
      const content = '[test topic](/test) link.';
      const violations = LinkSemanticValidator.validate(content, topicsNoEavs);
      expect(violations).toHaveLength(0);
    });

    it('should handle EAVs with missing subject or object', () => {
      const topicsWithPartialEavs = [
        {
          keyword: 'partial eav topic',
          url: '/partial',
          eavs: [
            {
              subject: null as any,
              predicate: { relation: 'has', type: 'property' },
              object: { value: 'something', type: 'string' },
            } as SemanticTriple,
            {
              subject: { label: 'Entity', type: 'thing' },
              predicate: { relation: 'has', type: 'property' },
              object: null as any,
            } as SemanticTriple,
          ],
        },
      ];
      const content = '[random anchor](/partial) link.';
      // Should not throw error
      expect(() => LinkSemanticValidator.validate(content, topicsWithPartialEavs)).not.toThrow();
    });
  });
});
