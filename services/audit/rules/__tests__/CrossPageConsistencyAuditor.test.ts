import { describe, it, expect } from 'vitest';
import {
  CrossPageConsistencyAuditor,
  CrossPageInput,
} from '../CrossPageConsistencyAuditor';

describe('CrossPageConsistencyAuditor', () => {
  const auditor = new CrossPageConsistencyAuditor();

  // ---------------------------------------------------------------------------
  // Rule 380 — CE appears in site boilerplate
  // ---------------------------------------------------------------------------

  describe('Rule 380: CE in boilerplate', () => {
    it('detects CE missing from boilerplate HTML', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/about',
        siteCentralEntity: 'Acme Widgets',
        boilerplateHtml:
          '<header><nav><a href="/">Home</a><a href="/products">Products</a></nav></header>' +
          '<footer><p>Copyright 2024</p></footer>',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-380' })
      );
    });

    it('passes when CE appears in boilerplate text', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/about',
        siteCentralEntity: 'Acme Widgets',
        boilerplateHtml:
          '<header><nav><a href="/">Acme Widgets</a></nav></header>' +
          '<footer><p>Acme Widgets Inc. &copy; 2024</p></footer>',
      });
      expect(issues.find((i) => i.ruleId === 'rule-380')).toBeUndefined();
    });

    it('performs case-insensitive CE matching', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/',
        siteCentralEntity: 'ACME WIDGETS',
        boilerplateHtml: '<header>Welcome to acme widgets portal</header>',
      });
      expect(issues.find((i) => i.ruleId === 'rule-380')).toBeUndefined();
    });

    it('skips check when siteCentralEntity is not provided', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/',
        boilerplateHtml: '<header>Site Header</header>',
      });
      expect(issues.find((i) => i.ruleId === 'rule-380')).toBeUndefined();
    });

    it('skips check when boilerplateHtml is not provided', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/',
        siteCentralEntity: 'Acme Widgets',
      });
      expect(issues.find((i) => i.ruleId === 'rule-380')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 382 — One CE per entire site
  // ---------------------------------------------------------------------------

  describe('Rule 382: One CE per site', () => {
    it('detects multiple distinct CEs across pages', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page1',
        allPageCentralEntities: [
          'Acme Widgets',
          'Acme Widgets',
          'Best Gadgets Co',
        ],
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-382' })
      );
    });

    it('passes when all pages share the same CE', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page1',
        allPageCentralEntities: [
          'Acme Widgets',
          'Acme Widgets',
          'Acme Widgets',
        ],
      });
      expect(issues.find((i) => i.ruleId === 'rule-382')).toBeUndefined();
    });

    it('ignores case differences in CE names', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page1',
        allPageCentralEntities: [
          'Acme Widgets',
          'acme widgets',
          'ACME WIDGETS',
        ],
      });
      expect(issues.find((i) => i.ruleId === 'rule-382')).toBeUndefined();
    });

    it('ignores empty CE entries', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page1',
        allPageCentralEntities: ['Acme Widgets', '', '  ', 'Acme Widgets'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-382')).toBeUndefined();
    });

    it('skips check when allPageCentralEntities is not provided', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page1',
      });
      expect(issues.find((i) => i.ruleId === 'rule-382')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 390 — AS->CS flow exists
  // ---------------------------------------------------------------------------

  describe('Rule 390: AS->CS flow', () => {
    it('detects missing AS sections', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page',
        sectionTypes: ['CS', 'CS', 'CS'],
      });
      const issue = issues.find((i) => i.ruleId === 'rule-390');
      expect(issue).toBeDefined();
      expect(issue!.description).toContain('Attribute Sections');
    });

    it('detects missing CS sections', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page',
        sectionTypes: ['AS', 'AS', 'AS'],
      });
      const issue = issues.find((i) => i.ruleId === 'rule-390');
      expect(issue).toBeDefined();
      expect(issue!.description).toContain('Contextual Sections');
    });

    it('detects inverted CS->AS flow', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page',
        sectionTypes: ['CS', 'CS', 'AS', 'AS'],
      });
      const issue = issues.find((i) => i.ruleId === 'rule-390');
      expect(issue).toBeDefined();
      expect(issue!.title).toContain('inverted');
    });

    it('passes when AS appears before CS', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page',
        sectionTypes: ['AS', 'AS', 'CS', 'CS'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-390')).toBeUndefined();
    });

    it('passes with interleaved sections when first AS is before first CS', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page',
        sectionTypes: ['AS', 'CS', 'AS', 'CS'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-390')).toBeUndefined();
    });

    it('skips check when sectionTypes is not provided', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page',
      });
      expect(issues.find((i) => i.ruleId === 'rule-390')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 392 — No orphan pages
  // ---------------------------------------------------------------------------

  describe('Rule 392: No orphan pages', () => {
    it('detects orphan page with no internal links pointing to it', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/forgotten-page',
        allPageUrls: [
          'https://example.com/',
          'https://example.com/about',
          'https://example.com/forgotten-page',
        ],
        internalLinksToThisPage: [],
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-392' })
      );
    });

    it('passes when page has internal links pointing to it', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/about',
        allPageUrls: [
          'https://example.com/',
          'https://example.com/about',
        ],
        internalLinksToThisPage: ['https://example.com/'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-392')).toBeUndefined();
    });

    it('exempts homepage from orphan check', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/',
        allPageUrls: ['https://example.com/', 'https://example.com/about'],
        internalLinksToThisPage: [],
      });
      expect(issues.find((i) => i.ruleId === 'rule-392')).toBeUndefined();
    });

    it('exempts homepage without trailing slash', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com',
        allPageUrls: ['https://example.com'],
        internalLinksToThisPage: [],
      });
      expect(issues.find((i) => i.ruleId === 'rule-392')).toBeUndefined();
    });

    it('skips check when allPageUrls or internalLinksToThisPage not provided', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page',
      });
      expect(issues.find((i) => i.ruleId === 'rule-392')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 394 — Canonical query assignment per page
  // ---------------------------------------------------------------------------

  describe('Rule 394: Canonical query assignment', () => {
    it('detects duplicate target query across pages', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page-a',
        pageTargetQuery: 'best widgets 2024',
        allPageTargetQueries: [
          'best widgets 2024',
          'best widgets 2024',
          'how to install widgets',
        ],
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-394' })
      );
    });

    it('passes when each page has a unique target query', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page-a',
        pageTargetQuery: 'best widgets 2024',
        allPageTargetQueries: [
          'best widgets 2024',
          'how to install widgets',
          'widget maintenance guide',
        ],
      });
      expect(issues.find((i) => i.ruleId === 'rule-394')).toBeUndefined();
    });

    it('performs case-insensitive query comparison', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page-a',
        pageTargetQuery: 'Best Widgets',
        allPageTargetQueries: ['best widgets', 'Best Widgets', 'other query'],
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-394' })
      );
    });

    it('skips check when pageTargetQuery is not provided', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page-a',
        allPageTargetQueries: ['query1', 'query2'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-394')).toBeUndefined();
    });

    it('skips check when allPageTargetQueries is not provided', () => {
      const issues = auditor.validate({
        pageUrl: 'https://example.com/page-a',
        pageTargetQuery: 'best widgets',
      });
      expect(issues.find((i) => i.ruleId === 'rule-394')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Combined: full input with no issues
  // ---------------------------------------------------------------------------

  describe('Full validation', () => {
    it('returns no issues for a well-structured site page', () => {
      const input: CrossPageInput = {
        pageUrl: 'https://example.com/widgets-guide',
        pageCentralEntity: 'Acme Widgets',
        pageTargetQuery: 'acme widgets guide',
        siteCentralEntity: 'Acme Widgets',
        boilerplateHtml:
          '<header><a href="/">Acme Widgets</a></header><footer>Acme Widgets &copy; 2024</footer>',
        allPageUrls: [
          'https://example.com/',
          'https://example.com/widgets-guide',
          'https://example.com/faq',
        ],
        allPageTargetQueries: [
          'acme widgets',
          'acme widgets guide',
          'acme widgets faq',
        ],
        allPageCentralEntities: [
          'Acme Widgets',
          'Acme Widgets',
          'Acme Widgets',
        ],
        internalLinksToThisPage: ['https://example.com/'],
        sectionTypes: ['AS', 'AS', 'CS', 'CS'],
      };

      const issues = auditor.validate(input);
      expect(issues).toHaveLength(0);
    });

    it('returns multiple issues for a poorly structured page', () => {
      const input: CrossPageInput = {
        pageUrl: 'https://example.com/orphan-page',
        pageCentralEntity: 'Different Entity',
        pageTargetQuery: 'best widgets',
        siteCentralEntity: 'Acme Widgets',
        boilerplateHtml: '<header>Welcome to our site</header>',
        allPageUrls: [
          'https://example.com/',
          'https://example.com/orphan-page',
        ],
        allPageTargetQueries: ['best widgets', 'best widgets'],
        allPageCentralEntities: ['Acme Widgets', 'Different Entity'],
        internalLinksToThisPage: [],
        sectionTypes: ['CS', 'CS'],
      };

      const issues = auditor.validate(input);
      // Should flag: 380 (CE not in boilerplate), 382 (multiple CEs),
      // 390 (missing AS), 392 (orphan), 394 (duplicate query)
      expect(issues.length).toBeGreaterThanOrEqual(4);
      const ruleIds = issues.map((i) => i.ruleId);
      expect(ruleIds).toContain('rule-380');
      expect(ruleIds).toContain('rule-382');
      expect(ruleIds).toContain('rule-390');
      expect(ruleIds).toContain('rule-392');
      expect(ruleIds).toContain('rule-394');
    });
  });
});
