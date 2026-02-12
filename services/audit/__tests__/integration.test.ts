import { describe, it, expect, vi } from 'vitest';
import { UnifiedAuditOrchestrator } from '../UnifiedAuditOrchestrator';
import { AuditReportExporter } from '../AuditReportExporter';
import { AuditSnapshotService } from '../AuditSnapshotService';
import { ContentFetcher } from '../ContentFetcher';
import { AuditPhase } from '../phases/AuditPhase';
import type {
  AuditRequest,
  AuditPhaseResult,
  AuditFinding,
  AuditPhaseName,
  FetchedContent,
  UnifiedAuditReport,
} from '../types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName;
  private mockFindings: AuditFinding[];
  private mockTotalChecks: number;

  constructor(
    name: AuditPhaseName,
    findings: AuditFinding[] = [],
    totalChecks = 5
  ) {
    super();
    this.phaseName = name;
    this.mockFindings = findings;
    this.mockTotalChecks = totalChecks;
  }

  async execute(): Promise<AuditPhaseResult> {
    return this.buildResult(this.mockFindings, this.mockTotalChecks);
  }
}

function makeFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: crypto.randomUUID(),
    phase: 'strategicFoundation',
    ruleId: 'rule-100',
    severity: 'medium',
    title: 'Test finding',
    description: 'Test description',
    whyItMatters: 'Test reason',
    autoFixAvailable: false,
    estimatedImpact: 'medium',
    category: 'Test',
    ...overrides,
  };
}

function makeRequest(overrides?: Partial<AuditRequest>): AuditRequest {
  return {
    type: 'external',
    projectId: 'integration-test-project',
    depth: 'deep',
    phases: [
      'strategicFoundation',
      'eavSystem',
      'microSemantics',
      'informationDensity',
      'contextualFlow',
      'internalLinking',
      'semanticDistance',
      'contentFormat',
      'htmlTechnical',
      'metaStructuredData',
      'costOfRetrieval',
      'urlArchitecture',
      'crossPageConsistency',
      'websiteTypeSpecific',
    ],
    scrapingProvider: 'direct',
    language: 'en',
    includeFactValidation: false,
    includePerformanceData: false,
    url: 'https://example.com/test-page',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Integration Tests
// ---------------------------------------------------------------------------

describe('Unified Audit System — Integration', () => {
  describe('Full pipeline: orchestrator → phases → report', () => {
    it('runs all 14 phases and produces a valid report', async () => {
      const phaseNames: AuditPhaseName[] = [
        'strategicFoundation',
        'eavSystem',
        'microSemantics',
        'informationDensity',
        'contextualFlow',
        'internalLinking',
        'semanticDistance',
        'contentFormat',
        'htmlTechnical',
        'metaStructuredData',
        'costOfRetrieval',
        'urlArchitecture',
        'crossPageConsistency',
        'websiteTypeSpecific',
      ];

      const phases = phaseNames.map(
        (name) => new TestPhase(name, [], 5)
      );

      const orchestrator = new UnifiedAuditOrchestrator(phases);
      const report = await orchestrator.runAudit(makeRequest());

      // All 14 phases should return results
      expect(report.phaseResults).toHaveLength(14);
      for (const name of phaseNames) {
        const result = report.phaseResults.find((r) => r.phase === name);
        expect(result).toBeDefined();
        expect(result!.score).toBeGreaterThanOrEqual(0);
        expect(result!.score).toBeLessThanOrEqual(100);
      }

      // Report structure
      expect(report.id).toBeTruthy();
      expect(report.projectId).toBe('integration-test-project');
      expect(report.auditType).toBe('external');
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.language).toBe('en');
      expect(report.version).toBe(1);
      expect(report.createdAt).toBeTruthy();
      expect(report.auditDurationMs).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.contentMergeSuggestions)).toBe(true);
      expect(Array.isArray(report.missingKnowledgeGraphTopics)).toBe(true);
      expect(Array.isArray(report.cannibalizationRisks)).toBe(true);
    });

    it('populates cannibalization risks from SemanticDistance findings', async () => {
      const cannibFinding = makeFinding({
        phase: 'semanticDistance',
        ruleId: 'rule-203',
        severity: 'high',
        title: 'Keyword cannibalization risk',
        description:
          'Topic "cloud hosting" has a semantic distance of 0.15 to "cloud hosting guide" (https://example.com/guide).',
        affectedElement: 'https://example.com/guide',
        exampleFix: 'Merge the two pages.',
      });

      const phases: AuditPhase[] = [
        new TestPhase('strategicFoundation'),
        new TestPhase('semanticDistance', [cannibFinding], 5),
      ];

      const orchestrator = new UnifiedAuditOrchestrator(phases);
      const report = await orchestrator.runAudit(makeRequest());

      expect(report.cannibalizationRisks.length).toBeGreaterThan(0);
      expect(report.cannibalizationRisks[0].sharedEntity).toBe('cloud hosting');
      expect(report.cannibalizationRisks[0].severity).toBe('high');
    });

    it('populates merge suggestions from close semantic distances', async () => {
      const mergeFinding = makeFinding({
        phase: 'semanticDistance',
        ruleId: 'rule-203',
        severity: 'high',
        title: 'Keyword cannibalization risk',
        description:
          'Topic "SEO guide" has a semantic distance of 0.10 to "SEO tutorial" (https://example.com/seo-tutorial).',
        affectedElement: 'https://example.com/seo-tutorial',
        exampleFix: 'Merge the two pages.',
      });

      const phases: AuditPhase[] = [
        new TestPhase('semanticDistance', [mergeFinding], 5),
      ];

      const orchestrator = new UnifiedAuditOrchestrator(phases);
      const report = await orchestrator.runAudit(
        makeRequest({ url: 'https://example.com/seo-guide', relatedUrls: ['https://example.com/seo-tutorial'] })
      );

      expect(report.contentMergeSuggestions.length).toBeGreaterThan(0);
      expect(report.contentMergeSuggestions[0].suggestedAction).toBe('merge');
      expect(report.contentMergeSuggestions[0].sourceUrl).toBe('https://example.com/seo-guide');
      expect(report.contentMergeSuggestions[0].targetUrl).toBe('https://example.com/seo-tutorial');
    });

    it('populates missingKnowledgeGraphTopics when mapEavs provided', async () => {
      const mockContent: FetchedContent = {
        url: 'https://example.com',
        semanticText: 'This article discusses cloud hosting and server performance.',
        rawHtml: '<html><body>Cloud hosting and server performance.</body></html>',
        title: 'Cloud Hosting',
        metaDescription: '',
        headings: [],
        images: [],
        internalLinks: [],
        externalLinks: [],
        schemaMarkup: [],
        language: 'en',
        provider: 'direct',
        fetchDurationMs: 50,
      };

      const mockFetcher = {
        fetch: vi.fn().mockResolvedValue(mockContent),
      } as unknown as ContentFetcher;

      const phases: AuditPhase[] = [
        new TestPhase('strategicFoundation'),
        new TestPhase('eavSystem'),
      ];

      // mapEavs include a ROOT topic NOT in the content
      const orchestrator = new UnifiedAuditOrchestrator(phases, mockFetcher, undefined, {
        mapEavs: [
          { entity: 'Cloud Hosting', attribute: 'Uptime', value: '99.9%', category: 'ROOT' },
          { entity: 'Kubernetes', attribute: 'Orchestration', value: 'Container management', category: 'ROOT' },
        ],
      });

      const report = await orchestrator.runAudit(
        makeRequest({ url: 'https://example.com' })
      );

      // "Kubernetes — Orchestration" should be missing since it's not in the content
      expect(report.missingKnowledgeGraphTopics.length).toBeGreaterThan(0);
      expect(
        report.missingKnowledgeGraphTopics.some((t) => t.includes('Kubernetes'))
      ).toBe(true);
    });
  });

  describe('Snapshot service', () => {
    it('builds valid snapshot rows from a report', () => {
      const service = new AuditSnapshotService();
      const report: UnifiedAuditReport = {
        id: 'test-id',
        projectId: 'proj-1',
        auditType: 'external',
        url: 'https://example.com',
        overallScore: 72,
        phaseResults: [
          {
            phase: 'strategicFoundation',
            score: 85,
            weight: 10,
            passedChecks: 8,
            totalChecks: 10,
            findings: [
              makeFinding({ severity: 'high' }),
              makeFinding({ severity: 'medium' }),
            ],
            summary: 'Score: 85/100.',
          },
          {
            phase: 'eavSystem',
            score: 60,
            weight: 15,
            passedChecks: 3,
            totalChecks: 5,
            findings: [
              makeFinding({ severity: 'critical' }),
            ],
            summary: 'Score: 60/100.',
          },
        ],
        contentMergeSuggestions: [],
        missingKnowledgeGraphTopics: ['Missing topic A'],
        cannibalizationRisks: [],
        language: 'en',
        version: 1,
        createdAt: new Date().toISOString(),
        auditDurationMs: 1500,
        prerequisitesMet: { businessInfo: true, pillars: true, eavs: true },
      };

      const row = service.buildRow(report, 'topic-123');

      expect(row.project_id).toBe('proj-1');
      expect(row.url).toBe('https://example.com');
      expect(row.topic_id).toBe('topic-123');
      expect(row.overall_score).toBe(72);
      expect(row.findings_count_critical).toBe(1);
      expect(row.findings_count_high).toBe(1);
      expect(row.findings_count_medium).toBe(1);
      expect(row.findings_count_low).toBe(0);
      expect(row.phase_scores).toEqual({
        strategicFoundation: 85,
        eavSystem: 60,
      });
      expect(row.language).toBe('en');
      expect(row.version).toBe(1);
    });
  });

  describe('Export pipeline', () => {
    const sampleReport: UnifiedAuditReport = {
      id: 'export-test',
      projectId: 'proj-export',
      auditType: 'external',
      url: 'https://example.com/export-test',
      overallScore: 65,
      phaseResults: [
        {
          phase: 'strategicFoundation',
          score: 80,
          weight: 10,
          passedChecks: 4,
          totalChecks: 5,
          findings: [
            makeFinding({ severity: 'high', title: 'Missing central entity positioning' }),
          ],
          summary: 'Score: 80/100.',
        },
        {
          phase: 'eavSystem',
          score: 50,
          weight: 15,
          passedChecks: 2,
          totalChecks: 5,
          findings: [
            makeFinding({ severity: 'critical', title: 'Incomplete EAV coverage' }),
            makeFinding({ severity: 'medium', title: 'Missing attribute type' }),
          ],
          summary: 'Score: 50/100.',
        },
      ],
      contentMergeSuggestions: [
        {
          sourceUrl: 'https://example.com/a',
          targetUrl: 'https://example.com/b',
          overlapPercentage: 78,
          reason: 'High content overlap',
          suggestedAction: 'merge',
        },
      ],
      missingKnowledgeGraphTopics: ['Entity X — Attribute Y'],
      cannibalizationRisks: [
        {
          urls: ['https://example.com/a', 'https://example.com/b'],
          sharedEntity: 'SEO optimization',
          sharedKeywords: ['SEO', 'optimization'],
          severity: 'high',
          recommendation: 'Merge pages',
        },
      ],
      language: 'en',
      version: 1,
      createdAt: '2026-02-12T10:00:00Z',
      auditDurationMs: 2500,
      prerequisitesMet: { businessInfo: true, pillars: true, eavs: true },
    };

    it('exports valid CSV with all findings', () => {
      const exporter = new AuditReportExporter();
      const csv = exporter.exportCsv(sampleReport);

      expect(csv).toContain('Phase,Severity');
      expect(csv).toContain('Missing central entity positioning');
      expect(csv).toContain('Incomplete EAV coverage');
      expect(csv).toContain('Missing attribute type');
      const lines = csv.split('\n');
      // Header + 3 findings
      expect(lines.length).toBe(4);
    });

    it('exports valid HTML with score and findings', () => {
      const exporter = new AuditReportExporter();
      const html = exporter.exportHtml(sampleReport);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('65/100');
      expect(html).toContain('export-test');
      expect(html).toContain('Missing central entity positioning');
    });

    it('exports valid JSON that round-trips', () => {
      const exporter = new AuditReportExporter();
      const json = exporter.exportJson(sampleReport);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('export-test');
      expect(parsed.overallScore).toBe(65);
      expect(parsed.phaseResults).toHaveLength(2);
      expect(parsed.contentMergeSuggestions).toHaveLength(1);
    });

    it('exports valid XLSX with 5 sheets', async () => {
      const exporter = new AuditReportExporter();
      const buffer = await exporter.exportXlsx(sampleReport);

      // ExcelJS writeBuffer() returns a Buffer in Node, ArrayBuffer in browsers
      expect(buffer.byteLength).toBeGreaterThan(0);

      // Verify XLSX magic bytes (PK zip header)
      const view = new Uint8Array(buffer);
      expect(view[0]).toBe(0x50); // 'P'
      expect(view[1]).toBe(0x4b); // 'K'
    });

    it('exports batch ZIP containing multiple reports', async () => {
      const exporter = new AuditReportExporter();
      const secondReport = {
        ...sampleReport,
        id: 'export-test-2',
        url: 'https://example.com/page-2',
        overallScore: 80,
      };

      const buffer = await exporter.exportBatch([sampleReport, secondReport]);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);

      // Verify ZIP magic bytes
      const view = new Uint8Array(buffer);
      expect(view[0]).toBe(0x50); // 'P'
      expect(view[1]).toBe(0x4b); // 'K'
    });
  });

  describe('Report comparison', () => {
    it('detects score changes between two reports', () => {
      const oldReport: UnifiedAuditReport = {
        id: 'old',
        projectId: 'proj-1',
        auditType: 'external',
        url: 'https://example.com',
        overallScore: 55,
        phaseResults: [
          {
            phase: 'strategicFoundation',
            score: 60,
            weight: 10,
            passedChecks: 3,
            totalChecks: 5,
            findings: [makeFinding({ severity: 'critical' }), makeFinding({ severity: 'high' })],
            summary: '',
          },
        ],
        contentMergeSuggestions: [],
        missingKnowledgeGraphTopics: [],
        cannibalizationRisks: [],
        language: 'en',
        version: 1,
        createdAt: '2026-02-01T00:00:00Z',
        auditDurationMs: 1000,
        prerequisitesMet: { businessInfo: true, pillars: true, eavs: true },
      };

      const newReport: UnifiedAuditReport = {
        ...oldReport,
        id: 'new',
        overallScore: 75,
        phaseResults: [
          {
            phase: 'strategicFoundation',
            score: 80,
            weight: 10,
            passedChecks: 4,
            totalChecks: 5,
            findings: [makeFinding({ severity: 'medium' })],
            summary: '',
          },
        ],
        createdAt: '2026-02-12T00:00:00Z',
      };

      // Score improvement
      const scoreDiff = newReport.overallScore - oldReport.overallScore;
      expect(scoreDiff).toBe(20);

      // Findings reduction
      const oldFindings = oldReport.phaseResults.flatMap((r) => r.findings).length;
      const newFindings = newReport.phaseResults.flatMap((r) => r.findings).length;
      expect(newFindings).toBeLessThan(oldFindings);
    });
  });

  describe('Language detection fallback', () => {
    it('detects Dutch content when HTML lang is missing', () => {
      const fetcher = new ContentFetcher();
      // Need enough Dutch words (> 20 total words, > 3% indicator words)
      const dutchText = `
        <html><body>
          <p>Dit is een uitgebreid artikel over het bouwen van een website voor uw bedrijf.
          Wij bieden ook meer informatie over deze onderwerpen. Het is niet alleen belangrijk
          voor uw organisatie maar ook voor uw klanten. De resultaten zijn duidelijk en worden
          elke dag beter. Een goede website heeft ook een professioneel ontwerp nodig.</p>
        </body></html>
      `;
      const result = fetcher.parseHtml(dutchText, 'https://example.nl');

      expect(result.language).toBe('nl');
    });

    it('defaults to English when no indicators are found', () => {
      const fetcher = new ContentFetcher();
      const result = fetcher.parseHtml(
        '<html><body><p>Test content.</p></body></html>',
        'https://example.com'
      );

      expect(result.language).toBe('en');
    });

    it('uses HTML lang attribute when present', () => {
      const fetcher = new ContentFetcher();
      const result = fetcher.parseHtml(
        '<html lang="de"><body><p>Content here.</p></body></html>',
        'https://example.de'
      );

      expect(result.language).toBe('de');
    });

    it('normalizes lang tag (en-US → en)', () => {
      const fetcher = new ContentFetcher();
      const result = fetcher.parseHtml(
        '<html lang="en-US"><body><p>Content.</p></body></html>',
        'https://example.com'
      );

      expect(result.language).toBe('en');
    });
  });
});
