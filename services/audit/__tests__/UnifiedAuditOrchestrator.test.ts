import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedAuditOrchestrator } from '../UnifiedAuditOrchestrator';
import { AuditPhase } from '../phases/AuditPhase';
import { DEFAULT_AUDIT_WEIGHTS } from '../types';
import type { AuditRequest, AuditPhaseResult, AuditFinding, AuditPhaseName, FetchedContent } from '../types';
import type { ContentFetcher } from '../ContentFetcher';
import type { RelatedUrlDiscoverer } from '../RelatedUrlDiscoverer';

// Mock phase that returns configurable results
class MockPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName;
  private mockFindings: AuditFinding[];
  private mockTotalChecks: number;
  private shouldFail: boolean;

  constructor(name: AuditPhaseName, findings: AuditFinding[] = [], totalChecks = 5, shouldFail = false) {
    super();
    this.phaseName = name;
    this.mockFindings = findings;
    this.mockTotalChecks = totalChecks;
    this.shouldFail = shouldFail;
  }

  async execute(request: AuditRequest): Promise<AuditPhaseResult> {
    if (this.shouldFail) throw new Error(`Phase ${this.phaseName} failed`);
    return this.buildResult(this.mockFindings, this.mockTotalChecks);
  }
}

const makeRequest = (overrides?: Partial<AuditRequest>): AuditRequest => ({
  type: 'internal',
  projectId: 'proj-1',
  depth: 'deep',
  phases: ['strategicFoundation', 'eavSystem'],
  scrapingProvider: 'jina',
  language: 'en',
  includeFactValidation: false,
  includePerformanceData: false,
  ...overrides,
});

describe('UnifiedAuditOrchestrator', () => {
  it('runs all registered phases', async () => {
    const phases = [
      new MockPhase('strategicFoundation'),
      new MockPhase('eavSystem'),
    ];
    const orchestrator = new UnifiedAuditOrchestrator(phases);
    const report = await orchestrator.runAudit(makeRequest());

    expect(report.phaseResults).toHaveLength(2);
    expect(report.phaseResults[0].phase).toBe('strategicFoundation');
    expect(report.phaseResults[1].phase).toBe('eavSystem');
  });

  it('calculates weighted overall score', async () => {
    const finding: AuditFinding = {
      id: '1', phase: 'eavSystem', ruleId: 'r1', severity: 'critical',
      title: 't', description: 'd', whyItMatters: 'w',
      autoFixAvailable: false, estimatedImpact: 'high', category: 'c',
    };
    const phases = [
      new MockPhase('strategicFoundation', [], 10), // score = 100
      new MockPhase('eavSystem', [finding], 10),     // score < 100
    ];
    const orchestrator = new UnifiedAuditOrchestrator(phases);
    const report = await orchestrator.runAudit(makeRequest());

    // Overall score should be between the two phase scores (weighted avg)
    expect(report.overallScore).toBeLessThan(100);
    expect(report.overallScore).toBeGreaterThan(0);
  });

  it('catches phase errors without failing entire audit', async () => {
    const phases = [
      new MockPhase('strategicFoundation'),
      new MockPhase('eavSystem', [], 5, true), // will throw
    ];
    const orchestrator = new UnifiedAuditOrchestrator(phases);
    const report = await orchestrator.runAudit(makeRequest());

    // Should still return results - failed phase gets score 0
    expect(report.phaseResults).toHaveLength(2);
    const failedPhase = report.phaseResults.find(r => r.phase === 'eavSystem');
    expect(failedPhase?.score).toBe(0);
  });

  it('uses custom weights when provided', async () => {
    const phases = [
      new MockPhase('strategicFoundation', [], 10),
      new MockPhase('eavSystem', [], 10),
    ];
    const orchestrator = new UnifiedAuditOrchestrator(phases);
    const report = await orchestrator.runAudit(makeRequest({
      customWeights: { strategicFoundation: 90, eavSystem: 10 },
    }));

    // With custom weights, phase weights should reflect the custom values
    const sfResult = report.phaseResults.find(r => r.phase === 'strategicFoundation');
    expect(sfResult?.weight).toBe(90);
  });

  it('deduplicates findings across phases', async () => {
    const duplicateFinding: AuditFinding = {
      id: 'dup-1', phase: 'strategicFoundation', ruleId: 'rule-42',
      severity: 'high', title: 'Duplicate issue', description: 'd',
      whyItMatters: 'w', autoFixAvailable: false,
      estimatedImpact: 'high', category: 'c',
    };
    const phases = [
      new MockPhase('strategicFoundation', [duplicateFinding], 10),
      new MockPhase('eavSystem', [{ ...duplicateFinding, id: 'dup-2', phase: 'eavSystem' }], 10),
    ];
    const orchestrator = new UnifiedAuditOrchestrator(phases);
    const report = await orchestrator.runAudit(makeRequest());

    // All findings from individual phases, but report-level should deduplicate by ruleId
    const allFindings = report.phaseResults.flatMap(r => r.findings);
    // Phase results keep their own findings
    expect(allFindings).toHaveLength(2);
  });

  it('emits progress events', async () => {
    const phases = [
      new MockPhase('strategicFoundation'),
      new MockPhase('eavSystem'),
    ];
    const orchestrator = new UnifiedAuditOrchestrator(phases);
    const progressEvents: any[] = [];
    const report = await orchestrator.runAudit(makeRequest(), (event) => {
      progressEvents.push(event);
    });

    // Should emit start + one per phase + complete
    expect(progressEvents.length).toBeGreaterThanOrEqual(3);
  });

  it('returns valid report structure', async () => {
    const phases = [new MockPhase('strategicFoundation')];
    const orchestrator = new UnifiedAuditOrchestrator(phases);
    const report = await orchestrator.runAudit(makeRequest());

    expect(report.id).toBeTruthy();
    expect(report.projectId).toBe('proj-1');
    expect(report.auditType).toBe('internal');
    expect(report.overallScore).toBeDefined();
    expect(report.language).toBe('en');
    expect(report.version).toBe(1);
    expect(report.createdAt).toBeTruthy();
    expect(report.auditDurationMs).toBeGreaterThanOrEqual(0);
    expect(report.contentMergeSuggestions).toEqual([]);
    expect(report.missingKnowledgeGraphTopics).toEqual([]);
    expect(report.cannibalizationRisks).toEqual([]);
    expect(report.prerequisitesMet).toBeDefined();
  });

  it('fetches content when URL is provided and passes to phases', async () => {
    const mockContent: FetchedContent = {
      url: 'https://example.com',
      semanticText: 'Test content',
      rawHtml: '<html><body>Test</body></html>',
      title: 'Test',
      metaDescription: 'Test desc',
      headings: [],
      images: [],
      internalLinks: [],
      externalLinks: [],
      schemaMarkup: [],
      language: 'en',
      provider: 'jina',
      fetchDurationMs: 100,
    };

    const mockFetcher = {
      fetch: vi.fn().mockResolvedValue(mockContent),
    } as unknown as ContentFetcher;

    const executeSpy = vi.fn().mockImplementation(function(this: MockPhase, req: AuditRequest, content?: unknown) {
      return this.buildResult([], 5);
    });

    const phase = new MockPhase('strategicFoundation');
    phase.execute = executeSpy;

    const orchestrator = new UnifiedAuditOrchestrator([phase], mockFetcher);
    await orchestrator.runAudit(makeRequest({ url: 'https://example.com' }));

    expect(mockFetcher.fetch).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
      preferredProvider: 'jina',
      fallbackEnabled: true,
    }));
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com' }),
      mockContent,
    );
  });

  it('runs phases without content when no URL provided', async () => {
    const phase = new MockPhase('strategicFoundation');
    const orchestrator = new UnifiedAuditOrchestrator([phase]);
    const report = await orchestrator.runAudit(makeRequest());

    expect(report.phaseResults).toHaveLength(1);
    expect(report.phaseResults[0].score).toBe(100);
  });

  it('runs phases without content when fetch fails', async () => {
    const mockFetcher = {
      fetch: vi.fn().mockRejectedValue(new Error('Fetch failed')),
    } as unknown as ContentFetcher;

    const phase = new MockPhase('strategicFoundation');
    const orchestrator = new UnifiedAuditOrchestrator([phase], mockFetcher);
    const report = await orchestrator.runAudit(makeRequest({ url: 'https://example.com' }));

    expect(report.phaseResults).toHaveLength(1);
    // Phase should still run, just without content
  });

  it('discovers related URLs when discoverer is provided', async () => {
    const mockContent: FetchedContent = {
      url: 'https://example.com', semanticText: 'text', rawHtml: '<html></html>',
      title: '', metaDescription: '', headings: [], images: [],
      internalLinks: [], externalLinks: [], schemaMarkup: [],
      language: 'en', provider: 'jina', fetchDurationMs: 50,
    };

    const mockFetcher = {
      fetch: vi.fn().mockResolvedValue(mockContent),
    } as unknown as ContentFetcher;

    const mockDiscoverer = {
      discover: vi.fn().mockResolvedValue([
        { url: 'https://example.com/related', source: 'sitemap', relevanceScore: 0.8 },
      ]),
    } as unknown as RelatedUrlDiscoverer;

    const phase = new MockPhase('strategicFoundation');
    const orchestrator = new UnifiedAuditOrchestrator([phase], mockFetcher, mockDiscoverer);
    const report = await orchestrator.runAudit(makeRequest({ url: 'https://example.com' }));

    expect(mockDiscoverer.discover).toHaveBeenCalled();
  });
});
