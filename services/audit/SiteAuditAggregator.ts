// services/audit/SiteAuditAggregator.ts

/**
 * SiteAuditAggregator
 *
 * Aggregates individual page audits into site-level metrics.
 * Provides cross-page analysis, weakest phase identification,
 * and overall topical authority scoring.
 *
 * Framework rule: Site-level metrics reveal systemic issues
 * that per-page audits miss (e.g., inconsistent EAVs, orphan pages,
 * missing pillar coverage).
 */

import type { UnifiedAuditReport, AuditPhaseResult } from './types';

export interface SiteAuditResult {
  /** Overall site score (0-100) */
  overallScore: number;
  /** Number of pages audited */
  pagesAudited: number;
  /** Average per-page score */
  averagePageScore: number;
  /** Lowest scoring page */
  weakestPage: { url: string; score: number } | null;
  /** Highest scoring page */
  strongestPage: { url: string; score: number } | null;
  /** Per-phase aggregated scores */
  phaseScores: PhaseAggregation[];
  /** Weakest phase across the site */
  weakestPhase: string;
  /** Critical issues found across all pages */
  criticalIssueCount: number;
  /** Most common issues */
  topIssues: AggregatedIssue[];
  /** Cross-page consistency metrics */
  consistencyMetrics: ConsistencyMetrics;
  /** Suggestions */
  suggestions: string[];
}

export interface PhaseAggregation {
  /** Phase name */
  phaseName: string;
  /** Average score across all pages */
  averageScore: number;
  /** Min score (worst page) */
  minScore: number;
  /** Max score (best page) */
  maxScore: number;
  /** Pages with score < 50 */
  failingPages: number;
  /** Total findings across all pages */
  totalFindings: number;
}

export interface AggregatedIssue {
  /** Rule ID or title */
  ruleId: string;
  /** Issue title */
  title: string;
  /** Number of pages affected */
  pageCount: number;
  /** Severity */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Percentage of pages affected */
  prevalence: number;
}

export interface ConsistencyMetrics {
  /** Are schema types consistent across pages? */
  schemaConsistency: number;
  /** Are heading patterns consistent? */
  headingConsistency: number;
  /** Are internal links balanced? */
  linkDistribution: number;
  /** Overall consistency score (0-100) */
  overallConsistency: number;
}

export class SiteAuditAggregator {
  /**
   * Aggregate multiple page audit reports into a site-level report.
   */
  static aggregate(
    pageReports: Map<string, UnifiedAuditReport>
  ): SiteAuditResult {
    const urls = [...pageReports.keys()];
    const reports = [...pageReports.values()];

    if (reports.length === 0) {
      return this.emptyResult();
    }

    // Calculate overall scores
    const pageScores = reports.map(r => r.overallScore);
    const averagePageScore = Math.round(
      pageScores.reduce((s, v) => s + v, 0) / pageScores.length
    );

    const minIdx = pageScores.indexOf(Math.min(...pageScores));
    const maxIdx = pageScores.indexOf(Math.max(...pageScores));

    // Aggregate per-phase scores
    const phaseScores = this.aggregatePhases(reports);

    // Find weakest phase
    const weakestPhase = phaseScores.reduce(
      (min, p) => p.averageScore < min.averageScore ? p : min,
      phaseScores[0]
    );

    // Count critical issues
    const criticalIssueCount = reports.reduce((count, report) => {
      return count + (report.phaseResults || []).reduce((pc, phase) => {
        return pc + (phase.findings || []).filter(f => f.severity === 'critical').length;
      }, 0);
    }, 0);

    // Aggregate top issues
    const topIssues = this.aggregateIssues(reports, urls.length);

    // Consistency metrics
    const consistencyMetrics = this.calculateConsistency(reports);

    // Overall site score (weighted: avg page score 60%, consistency 20%, phase balance 20%)
    const phaseBalance = this.calculatePhaseBalance(phaseScores);
    const overallScore = Math.round(
      averagePageScore * 0.6 +
      consistencyMetrics.overallConsistency * 0.2 +
      phaseBalance * 0.2
    );

    // Generate suggestions
    const suggestions = this.generateSuggestions(
      overallScore, phaseScores, topIssues, consistencyMetrics
    );

    return {
      overallScore,
      pagesAudited: reports.length,
      averagePageScore,
      weakestPage: { url: urls[minIdx], score: pageScores[minIdx] },
      strongestPage: { url: urls[maxIdx], score: pageScores[maxIdx] },
      phaseScores,
      weakestPhase: weakestPhase?.phaseName || 'unknown',
      criticalIssueCount,
      topIssues: topIssues.slice(0, 20),
      consistencyMetrics,
      suggestions,
    };
  }

  private static aggregatePhases(reports: UnifiedAuditReport[]): PhaseAggregation[] {
    const phaseMap = new Map<string, { scores: number[]; findings: number }>();

    for (const report of reports) {
      if (!report.phaseResults) continue;
      for (const phase of report.phaseResults) {
        if (!phaseMap.has(phase.phase)) {
          phaseMap.set(phase.phase, { scores: [], findings: 0 });
        }
        const agg = phaseMap.get(phase.phase)!;
        agg.scores.push(phase.score);
        agg.findings += (phase.findings || []).length;
      }
    }

    return [...phaseMap.entries()].map(([phaseName, data]) => ({
      phaseName,
      averageScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
      minScore: Math.min(...data.scores),
      maxScore: Math.max(...data.scores),
      failingPages: data.scores.filter(s => s < 50).length,
      totalFindings: data.findings,
    }));
  }

  private static aggregateIssues(
    reports: UnifiedAuditReport[],
    totalPages: number
  ): AggregatedIssue[] {
    const issueMap = new Map<string, {
      title: string;
      pages: Set<number>;
      severity: string;
    }>();

    reports.forEach((report, pageIdx) => {
      if (!report.phaseResults) return;
      for (const phase of report.phaseResults) {
        for (const finding of phase.findings || []) {
          const key = finding.ruleId || finding.title;
          if (!issueMap.has(key)) {
            issueMap.set(key, {
              title: finding.title,
              pages: new Set(),
              severity: finding.severity,
            });
          }
          issueMap.get(key)!.pages.add(pageIdx);
          // Escalate severity
          if (this.severityRank(finding.severity) > this.severityRank(issueMap.get(key)!.severity)) {
            issueMap.get(key)!.severity = finding.severity;
          }
        }
      }
    });

    return [...issueMap.entries()]
      .map(([ruleId, data]) => ({
        ruleId,
        title: data.title,
        pageCount: data.pages.size,
        severity: data.severity as AggregatedIssue['severity'],
        prevalence: Math.round((data.pages.size / totalPages) * 100),
      }))
      .sort((a, b) => b.pageCount - a.pageCount);
  }

  private static severityRank(severity: string): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private static calculateConsistency(reports: UnifiedAuditReport[]): ConsistencyMetrics {
    // Schema consistency: how similar are schema types across pages
    const schemaConsistency = this.calculateSetConsistency(
      reports.map(r => {
        const phase = (r.phaseResults || []).find(p => p.phase.includes('Meta'));
        return new Set(
          (phase?.findings || [])
            .filter(f => f.title.includes('schema'))
            .map(f => f.ruleId)
        );
      })
    );

    // Heading consistency: similar heading patterns
    const headingConsistency = this.calculateScoreConsistency(
      reports.map(r => {
        const phase = (r.phaseResults || []).find(p => p.phase.includes('Contextual'));
        return phase?.score || 0;
      })
    );

    // Link distribution consistency
    const linkDistribution = this.calculateScoreConsistency(
      reports.map(r => {
        const phase = (r.phaseResults || []).find(p => p.phase.includes('Link'));
        return phase?.score || 0;
      })
    );

    const overallConsistency = Math.round(
      (schemaConsistency + headingConsistency + linkDistribution) / 3
    );

    return {
      schemaConsistency,
      headingConsistency,
      linkDistribution,
      overallConsistency,
    };
  }

  private static calculateSetConsistency(sets: Set<string>[]): number {
    if (sets.length < 2) return 100;
    // Jaccard-inspired: intersection / union across all pairs
    let totalSimilarity = 0;
    let pairs = 0;
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        const union = new Set([...sets[i], ...sets[j]]);
        const intersection = [...sets[i]].filter(x => sets[j].has(x));
        totalSimilarity += union.size > 0 ? intersection.length / union.size : 1;
        pairs++;
      }
    }
    return pairs > 0 ? Math.round((totalSimilarity / pairs) * 100) : 100;
  }

  private static calculateScoreConsistency(scores: number[]): number {
    if (scores.length < 2) return 100;
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    if (avg === 0) return 100;
    const variance = scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / scores.length;
    const cv = Math.sqrt(variance) / avg; // Coefficient of variation
    // Lower CV = more consistent = higher score
    return Math.round(Math.max(0, (1 - cv) * 100));
  }

  private static calculatePhaseBalance(phases: PhaseAggregation[]): number {
    if (phases.length === 0) return 100;
    const scores = phases.map(p => p.averageScore);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    if (avg === 0) return 0;
    const variance = scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / scores.length;
    const cv = Math.sqrt(variance) / avg;
    return Math.round(Math.max(0, (1 - cv) * 100));
  }

  private static generateSuggestions(
    overallScore: number,
    phaseScores: PhaseAggregation[],
    topIssues: AggregatedIssue[],
    consistency: ConsistencyMetrics
  ): string[] {
    const suggestions: string[] = [];

    if (overallScore < 50) {
      suggestions.push('Site-wide score is below 50. Focus on systemic issues before page-level fixes.');
    }

    // Weakest phases
    const weakPhases = phaseScores.filter(p => p.averageScore < 50).sort((a, b) => a.averageScore - b.averageScore);
    if (weakPhases.length > 0) {
      suggestions.push(
        `Weakest audit phases: ${weakPhases.slice(0, 3).map(p => `${p.phaseName} (${p.averageScore})`).join(', ')}`
      );
    }

    // Most prevalent issues
    const prevalent = topIssues.filter(i => i.prevalence >= 50);
    if (prevalent.length > 0) {
      suggestions.push(
        `${prevalent.length} issue(s) affect >50% of pages. Fix these systemically: ${prevalent.slice(0, 3).map(i => i.title).join('; ')}`
      );
    }

    // Consistency
    if (consistency.overallConsistency < 60) {
      suggestions.push(
        `Cross-page consistency is low (${consistency.overallConsistency}%). Standardize templates and structure.`
      );
    }

    return suggestions;
  }

  private static emptyResult(): SiteAuditResult {
    return {
      overallScore: 0,
      pagesAudited: 0,
      averagePageScore: 0,
      weakestPage: null,
      strongestPage: null,
      phaseScores: [],
      weakestPhase: 'none',
      criticalIssueCount: 0,
      topIssues: [],
      consistencyMetrics: {
        schemaConsistency: 0,
        headingConsistency: 0,
        linkDistribution: 0,
        overallConsistency: 0,
      },
      suggestions: ['No pages audited yet. Run audits on individual pages first.'],
    };
  }
}
