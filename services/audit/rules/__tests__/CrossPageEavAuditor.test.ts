import { describe, it, expect } from 'vitest';
import { CrossPageEavAuditor } from '../CrossPageEavAuditor';
import type { PageEavData, CrossPageEavIssue } from '../CrossPageEavAuditor';

describe('CrossPageEavAuditor', () => {
  // ---------------------------------------------------------------------------
  // Value contradictions (Rule 48)
  // ---------------------------------------------------------------------------

  describe('value contradictions', () => {
    it('detects contradicting values for same entity+attribute across pages', () => {
      const pages: PageEavData[] = [
        {
          pageId: '/about',
          eavs: [{ entity: 'React', attribute: 'release year', value: '2013' }],
        },
        {
          pageId: '/history',
          eavs: [{ entity: 'React', attribute: 'release year', value: '2014' }],
        },
      ];

      const issues = CrossPageEavAuditor.audit(pages);

      const contradictions = issues.filter(i => i.ruleId === 'rule-48');
      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].affectedEntity).toBe('react');
      expect(contradictions[0].affectedAttribute).toBe('release year');
      expect(contradictions[0].conflictingValues).toContain('2013');
      expect(contradictions[0].conflictingValues).toContain('2014');
    });

    it('does not flag when values match across pages', () => {
      const pages: PageEavData[] = [
        {
          pageId: '/about',
          eavs: [{ entity: 'React', attribute: 'type', value: 'library' }],
        },
        {
          pageId: '/docs',
          eavs: [{ entity: 'React', attribute: 'type', value: 'Library' }],
        },
      ];

      const issues = CrossPageEavAuditor.audit(pages);

      const contradictions = issues.filter(i => i.ruleId === 'rule-48');
      expect(contradictions).toHaveLength(0);
    });

    it('returns severity "critical" for numeric value contradictions', () => {
      const pages: PageEavData[] = [
        {
          pageId: '/specs',
          eavs: [{ entity: 'Product', attribute: 'price', value: '99' }],
        },
        {
          pageId: '/store',
          eavs: [{ entity: 'Product', attribute: 'price', value: '149' }],
        },
      ];

      const issues = CrossPageEavAuditor.audit(pages);

      const contradictions = issues.filter(i => i.ruleId === 'rule-48');
      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].severity).toBe('critical');
    });

    it('returns affected pages in issues', () => {
      const pages: PageEavData[] = [
        {
          pageId: '/page-a',
          eavs: [{ entity: 'Widget', attribute: 'color', value: 'red' }],
        },
        {
          pageId: '/page-b',
          eavs: [{ entity: 'Widget', attribute: 'color', value: 'blue' }],
        },
        {
          pageId: '/page-c',
          eavs: [{ entity: 'Widget', attribute: 'color', value: 'green' }],
        },
      ];

      const issues = CrossPageEavAuditor.audit(pages);

      const contradictions = issues.filter(i => i.ruleId === 'rule-48');
      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].affectedPages).toContain('/page-a');
      expect(contradictions[0].affectedPages).toContain('/page-b');
      expect(contradictions[0].affectedPages).toContain('/page-c');
    });
  });

  // ---------------------------------------------------------------------------
  // Naming inconsistencies
  // ---------------------------------------------------------------------------

  describe('naming inconsistencies', () => {
    it('detects naming inconsistencies (e.g., "React" vs "ReactJS") via value contradiction', () => {
      // The CrossPageEavAuditor detects naming differences as value contradictions
      // when the same entity+attribute has different string values
      const pages: PageEavData[] = [
        {
          pageId: '/page-1',
          eavs: [{ entity: 'JavaScript Frameworks', attribute: 'popular choice', value: 'React' }],
        },
        {
          pageId: '/page-2',
          eavs: [{ entity: 'JavaScript Frameworks', attribute: 'popular choice', value: 'ReactJS' }],
        },
      ];

      const issues = CrossPageEavAuditor.audit(pages);

      const contradictions = issues.filter(i => i.ruleId === 'rule-48');
      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].conflictingValues).toBeDefined();
      expect(contradictions[0].conflictingValues!.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles empty input gracefully', () => {
      const issues = CrossPageEavAuditor.audit([]);
      expect(issues).toHaveLength(0);
      expect(Array.isArray(issues)).toBe(true);
    });

    it('handles single page (no cross-page comparison possible)', () => {
      const pages: PageEavData[] = [
        {
          pageId: '/only-page',
          eavs: [
            { entity: 'React', attribute: 'type', value: 'library' },
            { entity: 'React', attribute: 'creator', value: 'Facebook' },
          ],
        },
      ];

      const issues = CrossPageEavAuditor.audit(pages);
      expect(issues).toHaveLength(0);
    });

    it('handles pages with empty eavs arrays', () => {
      const pages: PageEavData[] = [
        { pageId: '/page-a', eavs: [] },
        { pageId: '/page-b', eavs: [] },
      ];

      const issues = CrossPageEavAuditor.audit(pages);
      expect(issues).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Completeness gaps (Rule 49)
  // ---------------------------------------------------------------------------

  describe('completeness gaps', () => {
    it('detects when an attribute only appears on a small subset of entity pages', () => {
      // Entity "React" appears on 4 pages with 3+ attributes,
      // but "license" only on 1 page (< 30% of 4)
      const pages: PageEavData[] = [
        {
          pageId: '/page-1',
          eavs: [
            { entity: 'React', attribute: 'type', value: 'library' },
            { entity: 'React', attribute: 'creator', value: 'Meta' },
            { entity: 'React', attribute: 'license', value: 'MIT' },
          ],
        },
        {
          pageId: '/page-2',
          eavs: [
            { entity: 'React', attribute: 'type', value: 'library' },
            { entity: 'React', attribute: 'creator', value: 'Meta' },
          ],
        },
        {
          pageId: '/page-3',
          eavs: [
            { entity: 'React', attribute: 'type', value: 'library' },
            { entity: 'React', attribute: 'creator', value: 'Meta' },
          ],
        },
        {
          pageId: '/page-4',
          eavs: [
            { entity: 'React', attribute: 'type', value: 'library' },
            { entity: 'React', attribute: 'creator', value: 'Meta' },
          ],
        },
      ];

      const issues = CrossPageEavAuditor.audit(pages);

      const gaps = issues.filter(i => i.ruleId === 'rule-49');
      expect(gaps.length).toBeGreaterThanOrEqual(1);
      const licenseGap = gaps.find(g => g.affectedAttribute === 'license');
      expect(licenseGap).toBeDefined();
      expect(licenseGap!.severity).toBe('low');
    });
  });

  // ---------------------------------------------------------------------------
  // Severity assessment
  // ---------------------------------------------------------------------------

  describe('severity assessment', () => {
    it('returns lower severity for phrasing differences with word overlap', () => {
      const pages: PageEavData[] = [
        {
          pageId: '/page-a',
          eavs: [{ entity: 'Widget', attribute: 'description', value: 'a fast modern tool' }],
        },
        {
          pageId: '/page-b',
          eavs: [{ entity: 'Widget', attribute: 'description', value: 'a fast modern utility tool' }],
        },
      ];

      const issues = CrossPageEavAuditor.audit(pages);

      const contradictions = issues.filter(i => i.ruleId === 'rule-48');
      expect(contradictions).toHaveLength(1);
      // High word overlap means lower severity (medium or low)
      expect(['medium', 'low']).toContain(contradictions[0].severity);
    });

    it('returns high severity for very different values', () => {
      const pages: PageEavData[] = [
        {
          pageId: '/page-a',
          eavs: [{ entity: 'Company', attribute: 'headquarters', value: 'New York' }],
        },
        {
          pageId: '/page-b',
          eavs: [{ entity: 'Company', attribute: 'headquarters', value: 'Tokyo' }],
        },
      ];

      const issues = CrossPageEavAuditor.audit(pages);

      const contradictions = issues.filter(i => i.ruleId === 'rule-48');
      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].severity).toBe('high');
    });
  });

  // ---------------------------------------------------------------------------
  // Example fix
  // ---------------------------------------------------------------------------

  describe('example fix', () => {
    it('provides an example fix suggestion for contradictions', () => {
      const pages: PageEavData[] = [
        {
          pageId: '/a',
          eavs: [{ entity: 'React', attribute: 'year', value: '2013' }],
        },
        {
          pageId: '/b',
          eavs: [{ entity: 'React', attribute: 'year', value: '2014' }],
        },
      ];

      const issues = CrossPageEavAuditor.audit(pages);
      const contradiction = issues.find(i => i.ruleId === 'rule-48');
      expect(contradiction).toBeDefined();
      expect(contradiction!.exampleFix).toBeDefined();
      expect(contradiction!.exampleFix!.length).toBeGreaterThan(0);
    });
  });
});
