/**
 * AuditComparisonView
 *
 * Side-by-side comparison of two audit snapshots (before/after).
 * Shows overall score change, per-phase comparison sorted by largest
 * improvement, and a findings diff (new / resolved / persistent).
 */

import React, { useMemo } from 'react';
import type {
  UnifiedAuditReport,
  AuditPhaseResult,
  AuditFinding,
  AuditPhaseName,
} from '../../services/audit/types';

// ── Props ────────────────────────────────────────────────────────────────────
export interface AuditComparisonViewProps {
  before: UnifiedAuditReport;
  after: UnifiedAuditReport;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format an ISO date string to a short, human-readable form. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Render a numeric delta with colour + arrow. */
function DeltaBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="text-green-400 font-semibold" data-testid="delta-positive">
        &#9650; +{value}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="text-red-400 font-semibold" data-testid="delta-negative">
        &#9660; {value}
      </span>
    );
  }
  return (
    <span className="text-gray-400 font-semibold" data-testid="delta-neutral">
      &mdash; 0
    </span>
  );
}

/** Small coloured severity pill. */
function SeverityBadge({ severity }: { severity: AuditFinding['severity'] }) {
  const colours: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-300',
    high: 'bg-orange-500/20 text-orange-300',
    medium: 'bg-yellow-500/20 text-yellow-300',
    low: 'bg-blue-500/20 text-blue-300',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${colours[severity] ?? 'bg-gray-500/20 text-gray-300'}`}>
      {severity}
    </span>
  );
}

// ── Phase comparison row type ────────────────────────────────────────────────
interface PhaseRow {
  phase: AuditPhaseName;
  beforeScore: number;
  afterScore: number;
  delta: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export const AuditComparisonView: React.FC<AuditComparisonViewProps> = ({
  before,
  after,
}) => {
  // ---- Overall delta -------------------------------------------------------
  const overallDelta = after.overallScore - before.overallScore;

  // ---- Phase comparison rows (sorted by largest improvement first) ----------
  const phaseRows = useMemo<PhaseRow[]>(() => {
    const phaseMap = new Map<AuditPhaseName, { before: number; after: number }>();

    for (const pr of before.phaseResults) {
      phaseMap.set(pr.phase, { before: pr.score, after: 0 });
    }
    for (const pr of after.phaseResults) {
      const existing = phaseMap.get(pr.phase);
      if (existing) {
        existing.after = pr.score;
      } else {
        phaseMap.set(pr.phase, { before: 0, after: pr.score });
      }
    }

    const rows: PhaseRow[] = [];
    for (const [phase, scores] of phaseMap.entries()) {
      rows.push({
        phase,
        beforeScore: scores.before,
        afterScore: scores.after,
        delta: scores.after - scores.before,
      });
    }

    // Sort by largest improvement first
    rows.sort((a, b) => b.delta - a.delta);
    return rows;
  }, [before, after]);

  // ---- Findings diff (match by ruleId) -------------------------------------
  const { newFindings, resolvedFindings, persistentFindings } = useMemo(() => {
    const allBefore = before.phaseResults.flatMap((pr) => pr.findings);
    const allAfter = after.phaseResults.flatMap((pr) => pr.findings);

    const beforeRuleIds = new Set(allBefore.map((f) => f.ruleId));
    const afterRuleIds = new Set(allAfter.map((f) => f.ruleId));

    const newF: AuditFinding[] = allAfter.filter((f) => !beforeRuleIds.has(f.ruleId));
    const resolvedF: AuditFinding[] = allBefore.filter((f) => !afterRuleIds.has(f.ruleId));
    const persistentF: AuditFinding[] = allAfter.filter((f) => beforeRuleIds.has(f.ruleId));

    return { newFindings: newF, resolvedFindings: resolvedF, persistentFindings: persistentF };
  }, [before, after]);

  // ---- Render ---------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4 border border-gray-700">
        <span className="text-gray-300" data-testid="before-date">
          {formatDate(before.createdAt)}
        </span>
        <span className="text-gray-500 text-sm">vs</span>
        <span className="text-gray-300" data-testid="after-date">
          {formatDate(after.createdAt)}
        </span>
      </div>

      {/* Overall score comparison */}
      <div className="flex items-center justify-center gap-4 text-lg" data-testid="overall-score">
        <span className="text-gray-400">Overall:</span>
        <span className="font-bold text-white">{before.overallScore}</span>
        <span className="text-gray-500">&rarr;</span>
        <span className="font-bold text-white">{after.overallScore}</span>
        <DeltaBadge value={overallDelta} />
      </div>

      {/* ── Phase Comparison Table ─────────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-sm" data-testid="phase-table">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left p-3">Phase</th>
              <th className="text-right p-3">Before</th>
              <th className="text-right p-3">After</th>
              <th className="text-right p-3">Change</th>
            </tr>
          </thead>
          <tbody>
            {phaseRows.map((row) => (
              <tr key={row.phase} className="border-b border-gray-700 last:border-b-0" data-testid="phase-row">
                <td className="p-3 text-gray-200">{row.phase}</td>
                <td className="p-3 text-right text-gray-300">{row.beforeScore}</td>
                <td className="p-3 text-right text-gray-300">{row.afterScore}</td>
                <td className="p-3 text-right">
                  <DeltaBadge value={row.delta} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Findings Analysis ──────────────────────────────────────────────── */}

      {/* New findings */}
      {newFindings.length > 0 && (
        <div data-testid="new-findings">
          <h3 className="text-sm font-medium text-yellow-400 mb-2">
            New Findings ({newFindings.length})
          </h3>
          <ul className="space-y-1">
            {newFindings.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm text-gray-300">
                <SeverityBadge severity={f.severity} />
                <span>{f.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resolved findings */}
      {resolvedFindings.length > 0 && (
        <div data-testid="resolved-findings">
          <h3 className="text-sm font-medium text-green-400 mb-2">
            Resolved Findings ({resolvedFindings.length})
          </h3>
          <ul className="space-y-1">
            {resolvedFindings.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm text-gray-400 line-through">
                <SeverityBadge severity={f.severity} />
                <span>{f.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Persistent findings */}
      {persistentFindings.length > 0 && (
        <div data-testid="persistent-findings">
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            Persistent Findings ({persistentFindings.length})
          </h3>
          <ul className="space-y-1">
            {persistentFindings.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm text-gray-400">
                <SeverityBadge severity={f.severity} />
                <span>{f.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AuditComparisonView;
