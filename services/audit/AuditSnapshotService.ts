// services/audit/AuditSnapshotService.ts
// Persists completed UnifiedAuditReport instances to the unified_audit_snapshots
// table so that improvement trajectory and performance correlation can be tracked.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { UnifiedAuditReport, AuditFinding } from './types';

/**
 * Row shape matching the `unified_audit_snapshots` table defined in
 * `20260211260000_create_unified_audit_snapshots.sql`.
 */
export interface AuditSnapshotRow {
  project_id: string;
  url: string | null;
  topic_id: string | null;
  audit_type: string;
  overall_score: number;
  phase_scores: Record<string, number>;
  findings_count_critical: number;
  findings_count_high: number;
  findings_count_medium: number;
  findings_count_low: number;
  full_report: UnifiedAuditReport;
  gsc_clicks: number | null;
  gsc_impressions: number | null;
  gsc_ctr: number | null;
  gsc_position: number | null;
  ga4_pageviews: number | null;
  ga4_bounce_rate: number | null;
  language: string;
  version: number;
  weights_used: Record<string, number> | null;
}

export interface SaveSnapshotResult {
  id: string;
}

export class AuditSnapshotService {
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Persist a completed audit report as a snapshot row.
   *
   * @returns The UUID of the newly-created snapshot row.
   */
  async saveSnapshot(
    report: UnifiedAuditReport,
    supabase: SupabaseClient,
    topicId?: string,
  ): Promise<SaveSnapshotResult> {
    const row = this.buildRow(report, topicId);

    const { data, error } = await supabase
      .from('unified_audit_snapshots')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save audit snapshot: ${error.message}`);
    }

    return { id: data.id as string };
  }

  // ---------------------------------------------------------------------------
  // Row building (public for testability)
  // ---------------------------------------------------------------------------

  /**
   * Transforms a `UnifiedAuditReport` into the row shape expected by the
   * `unified_audit_snapshots` table. Exposed publicly so tests can verify
   * field extraction without requiring a Supabase connection.
   */
  buildRow(report: UnifiedAuditReport, topicId?: string): AuditSnapshotRow {
    const allFindings = report.phaseResults.flatMap((pr) => pr.findings);
    const severityCounts = this.countBySeverity(allFindings);

    return {
      project_id: report.projectId,
      url: report.url ?? null,
      topic_id: topicId ?? null,
      audit_type: report.auditType,
      overall_score: report.overallScore,
      phase_scores: this.extractPhaseScores(report),
      findings_count_critical: severityCounts.critical,
      findings_count_high: severityCounts.high,
      findings_count_medium: severityCounts.medium,
      findings_count_low: severityCounts.low,
      full_report: report,
      gsc_clicks: report.performanceData?.clicks ?? null,
      gsc_impressions: report.performanceData?.impressions ?? null,
      gsc_ctr: report.performanceData?.ctr ?? null,
      gsc_position: report.performanceData?.position ?? null,
      ga4_pageviews: report.performanceData?.pageviews ?? null,
      ga4_bounce_rate: report.performanceData?.bounceRate ?? null,
      language: report.language,
      version: report.version,
      weights_used: this.extractWeightsUsed(report),
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Extract per-phase scores as a `{ phaseName: score }` record. */
  extractPhaseScores(report: UnifiedAuditReport): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const pr of report.phaseResults) {
      scores[pr.phase] = pr.score;
    }
    return scores;
  }

  /** Count findings grouped by severity level. */
  countBySeverity(
    findings: AuditFinding[],
  ): Record<'critical' | 'high' | 'medium' | 'low', number> {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) {
      if (f.severity in counts) {
        counts[f.severity]++;
      }
    }
    return counts;
  }

  /** Extract the weight values actually used from the phase results. */
  private extractWeightsUsed(
    report: UnifiedAuditReport,
  ): Record<string, number> | null {
    if (report.phaseResults.length === 0) return null;
    const weights: Record<string, number> = {};
    for (const pr of report.phaseResults) {
      weights[pr.phase] = pr.weight;
    }
    return weights;
  }
}
