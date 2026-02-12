import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditSnapshotService } from '../AuditSnapshotService';
import type { UnifiedAuditReport, AuditFinding, AuditPhaseResult, PerformanceSnapshot } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const makeFinding = (overrides?: Partial<AuditFinding>): AuditFinding => ({
  id: crypto.randomUUID(),
  phase: 'strategicFoundation',
  ruleId: 'r1',
  severity: 'medium',
  title: 'Test finding',
  description: 'A test finding',
  whyItMatters: 'Testing',
  autoFixAvailable: false,
  estimatedImpact: 'medium',
  category: 'test',
  ...overrides,
});

const makePhaseResult = (overrides?: Partial<AuditPhaseResult>): AuditPhaseResult => ({
  phase: 'strategicFoundation',
  score: 75,
  weight: 10,
  passedChecks: 8,
  totalChecks: 10,
  findings: [],
  summary: 'Phase summary',
  ...overrides,
});

const makeReport = (overrides?: Partial<UnifiedAuditReport>): UnifiedAuditReport => ({
  id: 'report-1',
  projectId: 'proj-1',
  auditType: 'internal',
  url: 'https://example.com/page',
  overallScore: 72.5,
  phaseResults: [
    makePhaseResult({ phase: 'strategicFoundation', score: 80, weight: 10 }),
    makePhaseResult({ phase: 'eavSystem', score: 65, weight: 15 }),
  ],
  contentMergeSuggestions: [],
  missingKnowledgeGraphTopics: [],
  cannibalizationRisks: [],
  language: 'en',
  version: 1,
  createdAt: '2026-02-11T12:00:00.000Z',
  auditDurationMs: 4500,
  prerequisitesMet: { businessInfo: true, pillars: true, eavs: true },
  ...overrides,
});

const makeMockSupabase = (returnData = { id: 'snap-1' }, error: null | { message: string } = null) => {
  const single = vi.fn().mockResolvedValue({ data: returnData, error });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });

  return { from, insert, select, single, client: { from } as unknown as SupabaseClient };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuditSnapshotService', () => {
  let service: AuditSnapshotService;

  beforeEach(() => {
    service = new AuditSnapshotService();
  });

  // -------------------------------------------------------------------------
  // buildRow — field extraction
  // -------------------------------------------------------------------------
  describe('buildRow', () => {
    it('extracts correct scalar fields from report', () => {
      const report = makeReport();
      const row = service.buildRow(report);

      expect(row.project_id).toBe('proj-1');
      expect(row.url).toBe('https://example.com/page');
      expect(row.audit_type).toBe('internal');
      expect(row.overall_score).toBe(72.5);
      expect(row.language).toBe('en');
      expect(row.version).toBe(1);
    });

    it('stores the full report as full_report', () => {
      const report = makeReport();
      const row = service.buildRow(report);

      expect(row.full_report).toBe(report);
    });

    it('sets url to null when report has no url', () => {
      const report = makeReport({ url: undefined });
      const row = service.buildRow(report);

      expect(row.url).toBeNull();
    });

    it('sets topic_id when provided', () => {
      const report = makeReport();
      const row = service.buildRow(report, 'topic-42');

      expect(row.topic_id).toBe('topic-42');
    });

    it('sets topic_id to null when not provided', () => {
      const report = makeReport();
      const row = service.buildRow(report);

      expect(row.topic_id).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // phase_scores extraction
  // -------------------------------------------------------------------------
  describe('extractPhaseScores', () => {
    it('maps each phase to its score', () => {
      const report = makeReport();
      const scores = service.extractPhaseScores(report);

      expect(scores).toEqual({
        strategicFoundation: 80,
        eavSystem: 65,
      });
    });

    it('returns empty object when no phases exist', () => {
      const report = makeReport({ phaseResults: [] });
      const scores = service.extractPhaseScores(report);

      expect(scores).toEqual({});
    });

    it('handles many phases', () => {
      const report = makeReport({
        phaseResults: [
          makePhaseResult({ phase: 'strategicFoundation', score: 90 }),
          makePhaseResult({ phase: 'eavSystem', score: 60 }),
          makePhaseResult({ phase: 'microSemantics', score: 45 }),
          makePhaseResult({ phase: 'htmlTechnical', score: 100 }),
        ],
      });
      const scores = service.extractPhaseScores(report);

      expect(Object.keys(scores)).toHaveLength(4);
      expect(scores.microSemantics).toBe(45);
      expect(scores.htmlTechnical).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // Severity counting
  // -------------------------------------------------------------------------
  describe('countBySeverity', () => {
    it('counts findings by severity correctly', () => {
      const findings = [
        makeFinding({ severity: 'critical' }),
        makeFinding({ severity: 'critical' }),
        makeFinding({ severity: 'high' }),
        makeFinding({ severity: 'medium' }),
        makeFinding({ severity: 'medium' }),
        makeFinding({ severity: 'medium' }),
        makeFinding({ severity: 'low' }),
      ];

      const counts = service.countBySeverity(findings);

      expect(counts.critical).toBe(2);
      expect(counts.high).toBe(1);
      expect(counts.medium).toBe(3);
      expect(counts.low).toBe(1);
    });

    it('returns zeros when no findings', () => {
      const counts = service.countBySeverity([]);

      expect(counts).toEqual({ critical: 0, high: 0, medium: 0, low: 0 });
    });

    it('returns zeros for severities not present', () => {
      const findings = [makeFinding({ severity: 'low' })];
      const counts = service.countBySeverity(findings);

      expect(counts.critical).toBe(0);
      expect(counts.high).toBe(0);
      expect(counts.medium).toBe(0);
      expect(counts.low).toBe(1);
    });

    it('aggregates findings across multiple phase results in buildRow', () => {
      const report = makeReport({
        phaseResults: [
          makePhaseResult({
            phase: 'strategicFoundation',
            findings: [
              makeFinding({ severity: 'critical' }),
              makeFinding({ severity: 'high' }),
            ],
          }),
          makePhaseResult({
            phase: 'eavSystem',
            findings: [
              makeFinding({ severity: 'critical' }),
              makeFinding({ severity: 'low' }),
            ],
          }),
        ],
      });

      const row = service.buildRow(report);

      expect(row.findings_count_critical).toBe(2);
      expect(row.findings_count_high).toBe(1);
      expect(row.findings_count_medium).toBe(0);
      expect(row.findings_count_low).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Performance data
  // -------------------------------------------------------------------------
  describe('performance data extraction', () => {
    it('maps GSC/GA4 data when performanceData is present', () => {
      const perf: PerformanceSnapshot = {
        clicks: 320,
        impressions: 12000,
        ctr: 0.0267,
        position: 8.4,
        pageviews: 500,
        bounceRate: 0.42,
        period: { start: '2026-01-01', end: '2026-01-31' },
      };
      const report = makeReport({ performanceData: perf });
      const row = service.buildRow(report);

      expect(row.gsc_clicks).toBe(320);
      expect(row.gsc_impressions).toBe(12000);
      expect(row.gsc_ctr).toBe(0.0267);
      expect(row.gsc_position).toBe(8.4);
      expect(row.ga4_pageviews).toBe(500);
      expect(row.ga4_bounce_rate).toBe(0.42);
    });

    it('sets performance fields to null when performanceData is absent', () => {
      const report = makeReport({ performanceData: undefined });
      const row = service.buildRow(report);

      expect(row.gsc_clicks).toBeNull();
      expect(row.gsc_impressions).toBeNull();
      expect(row.gsc_ctr).toBeNull();
      expect(row.gsc_position).toBeNull();
      expect(row.ga4_pageviews).toBeNull();
      expect(row.ga4_bounce_rate).toBeNull();
    });

    it('handles partial performance data (no GA4 metrics)', () => {
      const perf: PerformanceSnapshot = {
        clicks: 100,
        impressions: 5000,
        ctr: 0.02,
        position: 12.1,
        // pageviews and bounceRate intentionally omitted
        period: { start: '2026-01-01', end: '2026-01-31' },
      };
      const report = makeReport({ performanceData: perf });
      const row = service.buildRow(report);

      expect(row.gsc_clicks).toBe(100);
      expect(row.gsc_impressions).toBe(5000);
      expect(row.ga4_pageviews).toBeNull();
      expect(row.ga4_bounce_rate).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // weights_used extraction
  // -------------------------------------------------------------------------
  describe('weights_used extraction', () => {
    it('extracts weight from each phase result', () => {
      const report = makeReport({
        phaseResults: [
          makePhaseResult({ phase: 'strategicFoundation', weight: 10 }),
          makePhaseResult({ phase: 'eavSystem', weight: 15 }),
        ],
      });
      const row = service.buildRow(report);

      expect(row.weights_used).toEqual({
        strategicFoundation: 10,
        eavSystem: 15,
      });
    });

    it('returns null when report has no phase results', () => {
      const report = makeReport({ phaseResults: [] });
      const row = service.buildRow(report);

      expect(row.weights_used).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // saveSnapshot — Supabase integration
  // -------------------------------------------------------------------------
  describe('saveSnapshot', () => {
    it('inserts row and returns snapshot id', async () => {
      const mock = makeMockSupabase({ id: 'snap-abc' });
      const report = makeReport();

      const result = await service.saveSnapshot(report, mock.client);

      expect(result.id).toBe('snap-abc');
      expect(mock.from).toHaveBeenCalledWith('unified_audit_snapshots');
      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'proj-1',
          overall_score: 72.5,
          audit_type: 'internal',
        }),
      );
      expect(mock.select).toHaveBeenCalledWith('id');
    });

    it('passes topicId through to the row', async () => {
      const mock = makeMockSupabase({ id: 'snap-def' });
      const report = makeReport();

      await service.saveSnapshot(report, mock.client, 'topic-99');

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ topic_id: 'topic-99' }),
      );
    });

    it('throws on Supabase error', async () => {
      const mock = makeMockSupabase(null as any, { message: 'RLS violation' });

      await expect(
        service.saveSnapshot(makeReport(), mock.client),
      ).rejects.toThrow('Failed to save audit snapshot: RLS violation');
    });
  });
});
