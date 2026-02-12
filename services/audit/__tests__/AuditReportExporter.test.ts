// services/audit/__tests__/AuditReportExporter.test.ts

import { AuditReportExporter } from '../AuditReportExporter';
import type { UnifiedAuditReport, AuditFinding, AuditPhaseResult } from '../types';

// ---------------------------------------------------------------------------
// Comprehensive mock report
// ---------------------------------------------------------------------------

function createMockFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: 'f-1',
    phase: 'microSemantics',
    ruleId: 'CQ-001',
    severity: 'high',
    title: 'Missing H1 tag',
    description: 'The page does not contain an H1 heading element.',
    whyItMatters: 'H1 tags signal the primary topic to search engines.',
    currentValue: 'No H1 found',
    expectedValue: 'Exactly one H1 element',
    exampleFix: 'Add <h1>Your Primary Keyword</h1> at the top of the content.',
    affectedElement: 'h1',
    autoFixAvailable: false,
    estimatedImpact: 'high',
    category: 'Headings',
    ...overrides,
  };
}

function createMockPhaseResult(overrides: Partial<AuditPhaseResult> = {}): AuditPhaseResult {
  return {
    phase: 'microSemantics',
    score: 72,
    weight: 20,
    passedChecks: 18,
    totalChecks: 25,
    findings: [createMockFinding()],
    summary: 'Content quality is acceptable with some heading issues.',
    ...overrides,
  };
}

function createMockReport(overrides: Partial<UnifiedAuditReport> = {}): UnifiedAuditReport {
  return {
    id: 'audit-001',
    projectId: 'proj-123',
    auditType: 'external',
    url: 'https://example.com/blog/seo-guide',
    overallScore: 68,
    phaseResults: [
      createMockPhaseResult(),
      createMockPhaseResult({
        phase: 'htmlTechnical',
        score: 85,
        weight: 15,
        passedChecks: 12,
        totalChecks: 14,
        findings: [
          createMockFinding({
            id: 'f-2',
            phase: 'htmlTechnical',
            ruleId: 'T-001',
            severity: 'critical',
            title: 'Missing canonical tag',
            description: 'No canonical URL is specified.',
            whyItMatters: 'Duplicate content may dilute ranking signals.',
            currentValue: undefined,
            expectedValue: '<link rel="canonical" href="...">',
            exampleFix: 'Add a canonical tag pointing to the preferred URL.',
            category: 'Technical SEO',
          }),
          createMockFinding({
            id: 'f-3',
            phase: 'htmlTechnical',
            ruleId: 'T-002',
            severity: 'low',
            title: 'Image missing alt text',
            description: 'Three images lack descriptive alt attributes.',
            whyItMatters: 'Alt text improves accessibility and image SEO.',
            category: 'Images',
          }),
        ],
        summary: 'Technical foundation is strong, minor image optimization needed.',
      }),
      createMockPhaseResult({
        phase: 'eavSystem',
        score: 55,
        weight: 25,
        passedChecks: 8,
        totalChecks: 15,
        findings: [
          createMockFinding({
            id: 'f-4',
            phase: 'eavSystem',
            ruleId: 'SR-001',
            severity: 'medium',
            title: 'Low entity coverage',
            description: 'Only 40% of expected entities are covered.',
            whyItMatters: 'Comprehensive entity coverage signals topical authority.',
            currentValue: '40%',
            expectedValue: '70%+',
            exampleFix: 'Add sections covering "keyword research tools", "SERP features", and "backlink analysis".',
            category: 'Entities',
          }),
        ],
        summary: 'Semantic coverage needs significant improvement.',
      }),
      createMockPhaseResult({
        phase: 'metaStructuredData',
        score: 90,
        weight: 10,
        passedChecks: 9,
        totalChecks: 10,
        findings: [],
        summary: 'Schema markup is well-implemented.',
      }),
    ],
    contentMergeSuggestions: [
      {
        sourceUrl: 'https://example.com/blog/seo-basics',
        targetUrl: 'https://example.com/blog/seo-guide',
        overlapPercentage: 45,
        reason: 'Both pages target "SEO fundamentals" entity.',
        suggestedAction: 'merge',
      },
    ],
    missingKnowledgeGraphTopics: ['Core Web Vitals', 'E-E-A-T guidelines'],
    cannibalizationRisks: [
      {
        urls: [
          'https://example.com/blog/seo-guide',
          'https://example.com/blog/seo-basics',
        ],
        sharedEntity: 'SEO fundamentals',
        sharedKeywords: ['seo', 'search engine optimization', 'seo guide'],
        severity: 'medium',
        recommendation: 'Merge into a single comprehensive guide.',
      },
    ],
    language: 'en',
    version: 1,
    createdAt: '2026-02-12T10:00:00Z',
    auditDurationMs: 3450,
    prerequisitesMet: {
      businessInfo: true,
      pillars: true,
      eavs: true,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuditReportExporter', () => {
  let exporter: AuditReportExporter;
  let mockReport: UnifiedAuditReport;

  beforeEach(() => {
    exporter = new AuditReportExporter();
    mockReport = createMockReport();
  });

  // -------------------------------------------------------------------------
  // CSV Export
  // -------------------------------------------------------------------------
  describe('exportCsv()', () => {
    it('contains the header row', () => {
      const csv = exporter.exportCsv(mockReport);
      const firstLine = csv.split('\n')[0];
      expect(firstLine).toBe(
        'Phase,Severity,Rule ID,Title,Description,Why It Matters,Current Value,Expected Value,Example Fix,Impact,Category'
      );
    });

    it('contains one row per finding', () => {
      const csv = exporter.exportCsv(mockReport);
      const lines = csv.split('\n');
      const totalFindings = mockReport.phaseResults.reduce(
        (sum, pr) => sum + pr.findings.length,
        0
      );
      expect(lines.length).toBe(totalFindings + 1);
      expect(totalFindings).toBe(4);
    });

    it('properly escapes commas in values', () => {
      const reportWithCommas = createMockReport({
        phaseResults: [
          createMockPhaseResult({
            findings: [
              createMockFinding({
                title: 'Title with, a comma',
                description: 'Description has "quotes" and, commas',
              }),
            ],
          }),
        ],
      });
      const csv = exporter.exportCsv(reportWithCommas);
      const dataLine = csv.split('\n')[1];
      expect(dataLine).toContain('"Title with, a comma"');
      expect(dataLine).toContain('"Description has ""quotes"" and, commas"');
    });

    it('contains all phase names present in the report', () => {
      const csv = exporter.exportCsv(mockReport);
      expect(csv).toContain('microSemantics');
      expect(csv).toContain('htmlTechnical');
      expect(csv).toContain('eavSystem');
    });

    it('handles empty findings gracefully', () => {
      const emptyReport = createMockReport({
        phaseResults: [
          createMockPhaseResult({ findings: [] }),
        ],
      });
      const csv = exporter.exportCsv(emptyReport);
      const lines = csv.split('\n');
      expect(lines.length).toBe(1);
    });

    it('handles newlines in field values', () => {
      const reportWithNewlines = createMockReport({
        phaseResults: [
          createMockPhaseResult({
            findings: [
              createMockFinding({
                description: 'Line one\nLine two',
              }),
            ],
          }),
        ],
      });
      const csv = exporter.exportCsv(reportWithNewlines);
      expect(csv).toContain('"Line one\nLine two"');
    });
  });

  // -------------------------------------------------------------------------
  // HTML Export
  // -------------------------------------------------------------------------
  describe('exportHtml()', () => {
    it('contains an <html tag', () => {
      const html = exporter.exportHtml(mockReport);
      expect(html).toContain('<html');
    });

    it('contains the overall score', () => {
      const html = exporter.exportHtml(mockReport);
      expect(html).toContain('68/100');
    });

    it('contains no external CSS or JS dependencies', () => {
      const html = exporter.exportHtml(mockReport);
      expect(html).not.toMatch(/href="http/);
      expect(html).not.toMatch(/src="http/);
    });

    it('contains phase names', () => {
      const html = exporter.exportHtml(mockReport);
      expect(html).toContain('microSemantics');
      expect(html).toContain('htmlTechnical');
      expect(html).toContain('eavSystem');
      expect(html).toContain('metaStructuredData');
    });

    it('contains finding titles', () => {
      const html = exporter.exportHtml(mockReport);
      expect(html).toContain('Missing H1 tag');
      expect(html).toContain('Missing canonical tag');
      expect(html).toContain('Low entity coverage');
    });

    it('contains severity classes for styling', () => {
      const html = exporter.exportHtml(mockReport);
      expect(html).toContain('severity-critical');
      expect(html).toContain('severity-high');
      expect(html).toContain('severity-medium');
      expect(html).toContain('severity-low');
    });

    it('contains the report URL', () => {
      const html = exporter.exportHtml(mockReport);
      expect(html).toContain('https://example.com/blog/seo-guide');
    });

    it('contains the date and duration', () => {
      const html = exporter.exportHtml(mockReport);
      expect(html).toContain('2026-02-12T10:00:00Z');
      expect(html).toContain('3.5s');
    });

    it('contains the Recommendations section', () => {
      const html = exporter.exportHtml(mockReport);
      expect(html).toContain('Recommendations');
    });

    it('contains the footer', () => {
      const html = exporter.exportHtml(mockReport);
      expect(html).toContain('Generated by Holistic SEO Audit System');
    });

    it('is a complete HTML document', () => {
      const html = exporter.exportHtml(mockReport);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('escapes HTML special characters in content', () => {
      const reportWithHtml = createMockReport({
        url: 'https://example.com/<script>alert("xss")</script>',
      });
      const html = exporter.exportHtml(reportWithHtml);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('handles report without URL', () => {
      const noUrlReport = createMockReport({ url: undefined });
      const html = exporter.exportHtml(noUrlReport);
      expect(html).toContain('<html');
      expect(html).toContain('proj-123');
    });
  });

  // -------------------------------------------------------------------------
  // JSON Export
  // -------------------------------------------------------------------------
  describe('exportJson()', () => {
    it('produces valid JSON', () => {
      const json = exporter.exportJson(mockReport);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('contains all fields from the original report', () => {
      const json = exporter.exportJson(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('audit-001');
      expect(parsed.projectId).toBe('proj-123');
      expect(parsed.auditType).toBe('external');
      expect(parsed.url).toBe('https://example.com/blog/seo-guide');
      expect(parsed.overallScore).toBe(68);
      expect(parsed.language).toBe('en');
      expect(parsed.version).toBe(1);
      expect(parsed.createdAt).toBe('2026-02-12T10:00:00Z');
      expect(parsed.auditDurationMs).toBe(3450);
    });

    it('contains phaseResults with correct structure', () => {
      const json = exporter.exportJson(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.phaseResults).toHaveLength(4);
      expect(parsed.phaseResults[0].phase).toBe('microSemantics');
      expect(parsed.phaseResults[0].findings).toHaveLength(1);
      expect(parsed.phaseResults[1].phase).toBe('htmlTechnical');
      expect(parsed.phaseResults[1].findings).toHaveLength(2);
    });

    it('contains cross-cutting concerns', () => {
      const json = exporter.exportJson(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.contentMergeSuggestions).toHaveLength(1);
      expect(parsed.missingKnowledgeGraphTopics).toEqual([
        'Core Web Vitals',
        'E-E-A-T guidelines',
      ]);
      expect(parsed.cannibalizationRisks).toHaveLength(1);
    });

    it('contains prerequisitesMet', () => {
      const json = exporter.exportJson(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.prerequisitesMet).toEqual({
        businessInfo: true,
        pillars: true,
        eavs: true,
      });
    });

    it('is pretty-printed with 2-space indentation', () => {
      const json = exporter.exportJson(mockReport);
      expect(json).toContain('\n');
      expect(json).toContain('  "id"');
    });

    it('excludes non-serializable fields (autoFixAction)', () => {
      const reportWithAction = createMockReport({
        phaseResults: [
          createMockPhaseResult({
            findings: [
              createMockFinding({
                autoFixAvailable: true,
                autoFixAction: async () => { /* no-op */ },
              }),
            ],
          }),
        ],
      });
      const json = exporter.exportJson(reportWithAction);
      const parsed = JSON.parse(json);
      expect(parsed.phaseResults[0].findings[0].autoFixAction).toBeUndefined();
      expect(parsed.phaseResults[0].findings[0].autoFixAvailable).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Helper methods
  // -------------------------------------------------------------------------
  describe('escapeCsvField()', () => {
    it('returns value as-is when no special characters', () => {
      expect(exporter.escapeCsvField('simple value')).toBe('simple value');
    });

    it('wraps value with commas in double quotes', () => {
      expect(exporter.escapeCsvField('value, with comma')).toBe(
        '"value, with comma"'
      );
    });

    it('escapes double quotes by doubling them', () => {
      expect(exporter.escapeCsvField('value with "quotes"')).toBe(
        '"value with ""quotes"""'
      );
    });

    it('wraps value with newlines in double quotes', () => {
      expect(exporter.escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    });

    it('handles empty string', () => {
      expect(exporter.escapeCsvField('')).toBe('');
    });
  });

  describe('formatDuration()', () => {
    it('formats milliseconds under 1000 as "Xms"', () => {
      expect(exporter.formatDuration(500)).toBe('500ms');
      expect(exporter.formatDuration(0)).toBe('0ms');
      expect(exporter.formatDuration(999)).toBe('999ms');
    });

    it('formats milliseconds at or above 1000 as "X.Xs"', () => {
      expect(exporter.formatDuration(1000)).toBe('1.0s');
      expect(exporter.formatDuration(1500)).toBe('1.5s');
      expect(exporter.formatDuration(3450)).toBe('3.5s');
      expect(exporter.formatDuration(10000)).toBe('10.0s');
    });
  });
});
