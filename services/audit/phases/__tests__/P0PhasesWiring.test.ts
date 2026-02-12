import { describe, it, expect, vi } from 'vitest';
import { HtmlTechnicalPhase } from '../HtmlTechnicalPhase';
import { ContextualFlowPhase } from '../ContextualFlowPhase';
import { MetaStructuredDataPhase } from '../MetaStructuredDataPhase';
import { UrlArchitecturePhase } from '../UrlArchitecturePhase';
import { CrossPageConsistencyPhase } from '../CrossPageConsistencyPhase';
import { StrategicFoundationPhase } from '../StrategicFoundationPhase';

const baseRequest = {
  type: 'external' as const,
  projectId: 'p1',
  url: 'https://example.com/page',
  depth: 'deep' as const,
  phases: [] as any[],
  scrapingProvider: 'direct' as const,
  language: 'en',
  includeFactValidation: false,
  includePerformanceData: false,
};

describe('P0 Phase Wiring Integration', () => {
  describe('HtmlTechnicalPhase', () => {
    it('runs HtmlNestingValidator + alt text checks', async () => {
      const phase = new HtmlTechnicalPhase();
      const html = '<p><figure><img src="x.jpg"></figure></p><h1>A</h1><h1>B</h1>';
      const result = await phase.execute(baseRequest, { html });
      expect(result.findings.some(f => f.ruleId === 'rule-242')).toBe(true);
      expect(result.findings.some(f => f.ruleId === 'rule-251')).toBe(true);
      expect(result.findings.some(f => f.ruleId === 'rule-256-missing')).toBe(true);
      expect(result.totalChecks).toBeGreaterThanOrEqual(5); // 4 nesting + 1 alt
    });
  });

  describe('ContextualFlowPhase', () => {
    it('runs centerpiece + obstruction checks', async () => {
      const phase = new ContextualFlowPhase();
      const content = {
        text: 'Some random content that does not mention the central entity at all in the first 400 characters.',
        html: '<div class="ads-container">Ad</div><main><p>Content that starts here with enough text for the main content detection algorithm to find it properly.</p></main>',
        centralEntity: 'React hooks',
        keyAttributes: ['state management'],
      };
      const result = await phase.execute(baseRequest, content);
      expect(result.findings.some(f => f.ruleId === 'rule-113-ce')).toBe(true);
      expect(result.findings.some(f => f.ruleId === 'rule-118')).toBe(true);
    });
  });

  describe('MetaStructuredDataPhase', () => {
    it('runs CanonicalValidator', async () => {
      const phase = new MetaStructuredDataPhase();
      const content = { html: '<html><head><title>Test</title></head><body></body></html>' };
      const result = await phase.execute(baseRequest, content);
      expect(result.findings.some(f => f.ruleId === 'rule-271')).toBe(true);
    });
  });

  describe('UrlArchitecturePhase', () => {
    it('runs RedirectChainChecker', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({ status: 500 });
      const phase = new UrlArchitecturePhase(mockFetcher);
      const result = await phase.execute(baseRequest);
      expect(result.findings.some(f => f.ruleId === 'rule-358')).toBe(true);
    });
  });

  describe('CrossPageConsistencyPhase', () => {
    it('runs SignalConflictChecker + RobotsTxtParser', async () => {
      const phase = new CrossPageConsistencyPhase();
      const content = {
        html: '<meta name="robots" content="noindex"><link rel="canonical" href="https://example.com/other">',
        robotsTxt: 'User-agent: *\nDisallow: /page',
        sitemapUrls: ['https://example.com/page'],
      };
      const result = await phase.execute(baseRequest, content);
      expect(result.findings.some(f => f.ruleId === 'rule-273')).toBe(true);
      expect(result.findings.some(f => f.ruleId === 'rule-372')).toBe(true);
    });
  });

  describe('StrategicFoundationPhase', () => {
    it('runs SourceContextAligner when content provided', async () => {
      const phase = new StrategicFoundationPhase();
      const content = {
        text: 'This discusses random topics without any relevant business alignment.',
        sourceContext: {
          businessName: 'TechCo',
          industry: 'software',
          targetAudience: 'developers',
          coreServices: ['consulting'],
          uniqueSellingPoints: ['fast delivery'],
        },
        contentSpec: {
          centralEntity: 'React hooks',
          targetKeywords: ['hooks', 'components'],
          requiredAttributes: ['state', 'lifecycle'],
        },
      };
      const result = await phase.execute(baseRequest, content);
      expect(result.findings.some(f => f.ruleId === 'rule-6-ce')).toBe(true);
    });
  });
});
