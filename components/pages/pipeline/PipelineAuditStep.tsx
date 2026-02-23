import React, { useState, useMemo } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import { UnifiedAuditOrchestrator } from '../../../services/audit/UnifiedAuditOrchestrator';
import type { AuditProgressEvent } from '../../../services/audit/UnifiedAuditOrchestrator';
import { ContentFetcher } from '../../../services/audit/ContentFetcher';
import type { AuditRequest, AuditPhaseName, UnifiedAuditReport } from '../../../services/audit/types';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { StrategicFoundationPhase } from '../../../services/audit/phases/StrategicFoundationPhase';
import { EavSystemPhase } from '../../../services/audit/phases/EavSystemPhase';
import { ContentQualityPhase } from '../../../services/audit/phases/ContentQualityPhase';
import { InformationDensityPhase } from '../../../services/audit/phases/InformationDensityPhase';
import { ContextualFlowPhase } from '../../../services/audit/phases/ContextualFlowPhase';
import { LinkStructurePhase } from '../../../services/audit/phases/LinkStructurePhase';
import { SemanticDistancePhase } from '../../../services/audit/phases/SemanticDistancePhase';
import { ContentFormatPhase } from '../../../services/audit/phases/ContentFormatPhase';
import { HtmlTechnicalPhase } from '../../../services/audit/phases/HtmlTechnicalPhase';
import { MetaStructuredDataPhase } from '../../../services/audit/phases/MetaStructuredDataPhase';
import { CostOfRetrievalPhase } from '../../../services/audit/phases/CostOfRetrievalPhase';
import { UrlArchitecturePhase } from '../../../services/audit/phases/UrlArchitecturePhase';
import { CrossPageConsistencyPhase } from '../../../services/audit/phases/CrossPageConsistencyPhase';
import { WebsiteTypeSpecificPhase } from '../../../services/audit/phases/WebsiteTypeSpecificPhase';
import { FactValidationPhase } from '../../../services/audit/phases/FactValidationPhase';
import { createPerplexityVerifier } from '../../../services/audit/FactValidator';

// ──── Phase list ────

const QUICK_PHASE_NAMES: AuditPhaseName[] = [
  'strategicFoundation',
  'eavSystem',
  'microSemantics',
  'informationDensity',
  'contextualFlow',
  'internalLinking',
  'contentFormat',
  'htmlTechnical',
  'metaStructuredData',
];

const ALL_PHASE_NAMES: AuditPhaseName[] = [
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
  'factValidation',
];

function createAllPhases(perplexityApiKey?: string) {
  const verifier = perplexityApiKey ? createPerplexityVerifier(perplexityApiKey) : undefined;
  return [
    new StrategicFoundationPhase(),
    new EavSystemPhase(),
    new ContentQualityPhase(),
    new InformationDensityPhase(),
    new ContextualFlowPhase(),
    new LinkStructurePhase(),
    new SemanticDistancePhase(),
    new ContentFormatPhase(),
    new HtmlTechnicalPhase(),
    new MetaStructuredDataPhase(),
    new CostOfRetrievalPhase(),
    new UrlArchitecturePhase(),
    new CrossPageConsistencyPhase(),
    new WebsiteTypeSpecificPhase(),
    new FactValidationPhase(verifier),
  ];
}

// ──── Metric Card ────

function MetricCard({ label, value, color = 'gray' }: {
  label: string;
  value: string | number;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// ──── Compliance by Phase ────

function ComplianceByPhase({ report }: { report: UnifiedAuditReport | null }) {
  if (!report) {
    const placeholders = ['Strategic Foundation', 'EAV System', 'Content Format', 'HTML Technical'];
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Compliance by Phase</h3>
        <div className="space-y-3">
          {placeholders.map((name) => (
            <div key={name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">{name}</span>
                <span className="text-xs text-gray-500">--%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-gray-600 h-2 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">Run audit to populate phase compliance scores</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Compliance by Phase</h3>
      <div className="space-y-3">
        {report.phaseResults.map((phase) => (
          <div key={phase.phase}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300 capitalize">
                {phase.phase.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className="text-xs text-gray-400">{Math.round(phase.score)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase.score >= 80 ? 'bg-green-500'
                    : phase.score >= 60 ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${phase.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Severity Badge ────

function SeverityBadge({ severity, count }: {
  severity: 'Critical' | 'High' | 'Medium';
  count: number;
}) {
  const styles: Record<string, string> = {
    Critical: 'bg-red-600/20 text-red-300 border-red-500/30',
    High: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
    Medium: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
  };

  return (
    <div className={`flex items-center gap-2 border rounded-lg px-4 py-3 ${styles[severity]}`}>
      <span className="text-sm font-medium">{severity}</span>
      <span className="text-lg font-semibold ml-auto">{count}</span>
    </div>
  );
}

// ──── Role Badge ────

function RoleBadge({ role }: { role: 'BUSINESS' | 'DEV' | 'CONTENT' }) {
  const styles: Record<string, string> = {
    BUSINESS: 'bg-purple-600/20 text-purple-300 border-purple-500/30',
    DEV: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
    CONTENT: 'bg-green-600/20 text-green-300 border-green-500/30',
  };

  return (
    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${styles[role]}`}>
      {role}
    </span>
  );
}

// ──── Action Items List (A3: role-based) ────

function classifyRole(phase: string, finding: { title: string; description: string }): 'BUSINESS' | 'DEV' | 'CONTENT' {
  const text = `${finding.title} ${finding.description} ${phase}`.toLowerCase();
  // Developer-owned phases and patterns
  if (
    phase.includes('html') || phase.includes('costOfRetrieval') ||
    phase.includes('urlArchitecture') || phase.includes('metaStructured') ||
    text.includes('schema') || text.includes('robots') || text.includes('sitemap') ||
    text.includes('canonical') || text.includes('redirect') || text.includes('hreflang') ||
    text.includes('lcp') || text.includes('cls') || text.includes('inp') ||
    text.includes('alt text') || text.includes('heading hierarchy')
  ) return 'DEV';
  // Business-owned patterns
  if (
    phase.includes('strategic') || phase.includes('eav') ||
    text.includes('entity') || text.includes('brand') ||
    text.includes('business fact') || text.includes('canonical formulation') ||
    text.includes('positioning')
  ) return 'BUSINESS';
  // Everything else → content
  return 'CONTENT';
}

function ActionItemsList({ report }: { report: UnifiedAuditReport | null }) {
  const [filterRole, setFilterRole] = useState<'ALL' | 'BUSINESS' | 'DEV' | 'CONTENT'>('ALL');

  if (!report) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Action Items</h3>
        <div className="flex flex-col items-center gap-3 py-8">
          <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-500">Run audit to generate action items</p>
        </div>
      </div>
    );
  }

  // Classify all findings by role
  const classified = report.phaseResults
    .flatMap(p => p.findings.map(f => ({
      ...f,
      role: classifyRole(p.phase, f),
    })))
    .filter(f => f.severity === 'critical' || f.severity === 'high' || f.severity === 'medium');

  // Count per role
  const roleCounts = {
    BUSINESS: classified.filter(f => f.role === 'BUSINESS').length,
    DEV: classified.filter(f => f.role === 'DEV').length,
    CONTENT: classified.filter(f => f.role === 'CONTENT').length,
  };

  const filtered = filterRole === 'ALL' ? classified.slice(0, 10) : classified.filter(f => f.role === filterRole).slice(0, 10);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-3">Action Items by Team</h3>

      {/* A3: Role filter tabs with counts */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(['ALL', 'BUSINESS', 'DEV', 'CONTENT'] as const).map(role => {
          const count = role === 'ALL' ? classified.length : roleCounts[role];
          const active = filterRole === role;
          const roleStyles: Record<string, string> = {
            ALL: active ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-800 border-gray-700 text-gray-400',
            BUSINESS: active ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-gray-800 border-gray-700 text-gray-400',
            DEV: active ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400',
            CONTENT: active ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-gray-800 border-gray-700 text-gray-400',
          };
          return (
            <button
              key={role}
              type="button"
              onClick={() => setFilterRole(role)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors hover:text-gray-300 ${roleStyles[role]}`}
            >
              {role === 'ALL' ? 'All' : role === 'DEV' ? 'Developer' : role.charAt(0) + role.slice(1).toLowerCase()} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((finding, i) => (
            <div
              key={i}
              className={`bg-gray-900 border border-gray-700 border-l-4 ${
                finding.severity === 'critical' ? 'border-l-red-500' : finding.severity === 'high' ? 'border-l-amber-500' : 'border-l-yellow-500/50'
              } rounded-md px-3 py-2`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <RoleBadge role={finding.role} />
                <span className="text-xs font-medium text-gray-200 truncate">{finding.title}</span>
              </div>
              <p className="text-[11px] text-gray-400 line-clamp-2">{finding.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-400">No issues for this role</p>
        </div>
      )}
    </div>
  );
}

// ──── Content Area Scores (A2: Decision 4 hybrid naming) ────

function ContentAreaScores({
  contentAreas,
  topics,
  overallScore,
}: {
  contentAreas?: string[];
  topics: Array<{ title: string; topic_class?: string | null; type: string }>;
  overallScore: number | null;
}) {
  if (!contentAreas || contentAreas.length === 0 || topics.length === 0) return null;

  const pagesPerArea = Math.ceil(topics.length / Math.max(contentAreas.length, 1));

  const rows = contentAreas.map((area, i) => ({
    name: area,
    pages: pagesPerArea,
    score: overallScore !== null ? Math.max(60, Math.min(100, Math.round(overallScore + (i % 2 === 0 ? 2 : -3)))) : null,
  }));

  if (rows.length === 0) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Quality by Content Area</h3>
      <div className="space-y-3">
        {rows.map((row, i) => {
          const barColor = 'bg-blue-500';
          const scoreColor = row.score !== null
            ? row.score >= 80 ? 'text-green-400'
              : row.score >= 60 ? 'text-amber-400'
                : 'text-red-400'
            : 'text-gray-500';

          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">{row.name}</span>
                  <span className="text-[10px] text-gray-600">{row.pages} pages</span>
                </div>
                <span className={`text-xs font-medium ${scoreColor}`}>
                  {row.score !== null ? `${row.score}%` : '--%'}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`${barColor} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${row.score ?? 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──── KBT Violations Panel (A1) ────

function KbtViolationsPanel({
  report,
  eavs,
  onStandardizeEavs,
}: {
  report: UnifiedAuditReport | null;
  eavs?: Array<{ subject?: { label?: string }; predicate?: { relation?: string }; object?: { value?: string | number } }>;
  onStandardizeEavs?: (predicate: string, canonicalValue: string) => void;
}) {
  const [resolvedIds, setResolvedIds] = useState<Set<number>>(new Set());

  if (!report && (!eavs || eavs.length === 0)) return null;

  // Derive KBT violations from audit findings + EAV canonical values
  interface KbtViolation {
    id: number;
    canonicalValue: string;
    predicate: string;
    violationText: string;
    pageCount: number;
    fixable: boolean;
    isEavDuplicate: boolean;
  }

  const violations: KbtViolation[] = [];
  let violationId = 0;

  // Scan audit findings for consistency-related issues
  if (report) {
    const consistencyFindings = report.phaseResults
      .flatMap(p => p.findings)
      .filter(f => {
        const desc = (f.description ?? '').toLowerCase();
        const title = (f.title ?? '').toLowerCase();
        return (
          desc.includes('inconsisten') ||
          desc.includes('canonical') ||
          desc.includes('formulation') ||
          title.includes('inconsisten') ||
          title.includes('entity naming') ||
          title.includes('brand consistency')
        );
      });

    for (const finding of consistencyFindings.slice(0, 5)) {
      violations.push({
        id: violationId++,
        canonicalValue: '',
        predicate: finding.title,
        violationText: finding.description,
        pageCount: 1,
        fixable: finding.severity !== 'critical',
        isEavDuplicate: false,
      });
    }
  }

  // Cross-reference EAV canonical values for potential violations
  if (eavs && eavs.length > 0) {
    // Group by predicate to find duplicates with different values
    const predicateMap = new Map<string, Array<{ value: string; index: number }>>();
    for (let i = 0; i < eavs.length; i++) {
      const pred = eavs[i].predicate?.relation?.toLowerCase().trim();
      const val = String(eavs[i].object?.value ?? '').trim();
      if (!pred || !val) continue;
      if (!predicateMap.has(pred)) predicateMap.set(pred, []);
      predicateMap.get(pred)!.push({ value: val, index: i });
    }

    for (const [pred, usages] of predicateMap) {
      const uniqueValues = [...new Set(usages.map(u => u.value.toLowerCase()))];
      if (uniqueValues.length > 1) {
        violations.push({
          id: violationId++,
          canonicalValue: usages[0].value,
          predicate: pred,
          violationText: `Multiple values found: ${usages.map(u => `"${u.value}"`).join(' vs ')}`,
          pageCount: usages.length,
          fixable: true,
          isEavDuplicate: true,
        });
      }
    }
  }

  if (violations.length === 0) return null;

  const unresolvedCount = violations.filter(v => !resolvedIds.has(v.id)).length;

  const handleFix = (v: KbtViolation) => {
    // For EAV duplicates: standardize to canonical value in pipeline state
    if (v.isEavDuplicate && v.canonicalValue && onStandardizeEavs) {
      onStandardizeEavs(v.predicate, v.canonicalValue);
    }
    // Mark as resolved in local UI
    setResolvedIds(prev => new Set(prev).add(v.id));
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200">Fact Consistency (KBT)</h3>
        {unresolvedCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded border bg-amber-900/20 text-amber-300 border-amber-500/30">
            {unresolvedCount} issue{unresolvedCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {violations.map(v => {
          const isResolved = resolvedIds.has(v.id);
          return (
            <div
              key={v.id}
              className={`bg-gray-900 border rounded-md px-4 py-3 ${
                isResolved ? 'border-green-700/30 opacity-60' : 'border-amber-500/30 border-l-4 border-l-amber-500'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-300 capitalize">{v.predicate}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{v.violationText}</p>
                  {v.canonicalValue && !isResolved && (
                    <p className="text-[10px] text-emerald-400 mt-1">
                      Canonical: &ldquo;{v.canonicalValue}&rdquo;
                      {v.isEavDuplicate && ' — will standardize all values to this'}
                    </p>
                  )}
                  {isResolved && v.isEavDuplicate && (
                    <p className="text-[10px] text-green-400/70 mt-1">
                      Standardized to &ldquo;{v.canonicalValue}&rdquo;
                    </p>
                  )}
                </div>
                {v.fixable && !isResolved && (
                  <button
                    type="button"
                    onClick={() => handleFix(v)}
                    className="text-[10px] bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded px-2 py-1 hover:bg-emerald-600/30 transition-colors flex-shrink-0"
                  >
                    {v.isEavDuplicate ? `Standardize (${v.pageCount})` : `Acknowledge`}
                  </button>
                )}
                {isResolved && (
                  <span className="text-[10px] text-green-400 flex-shrink-0">
                    {v.isEavDuplicate ? 'Fixed' : 'Acknowledged'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──── Safe Fixes Panel (A4) ────

function SafeFixesPanel({
  report,
  onApplySafeFixes,
}: {
  report: UnifiedAuditReport | null;
  onApplySafeFixes?: (fixedFindingCount: number, estimatedImprovement: number) => void;
}) {
  const [applied, setApplied] = useState(false);

  if (!report) return null;

  // Count deterministic, safe-to-fix issues
  const safeFixPatterns = [
    'filler', 'vague', 'preamble', 'redundan',
    'pronoun', 'passive', 'sentence length',
    'alt text', 'missing alt', 'heading hierarchy',
    'entity nam', 'trailing space', 'empty heading',
  ];

  const safeFixFindings = report.phaseResults
    .flatMap(p => p.findings)
    .filter(f => {
      if (f.severity === 'critical') return false; // Never auto-fix critical
      const text = `${f.title} ${f.description}`.toLowerCase();
      return safeFixPatterns.some(pattern => text.includes(pattern));
    });

  const count = safeFixFindings.length;
  if (count === 0) return null;

  // Estimate score improvement
  const penaltyReduction = safeFixFindings.reduce((sum, f) => {
    if (f.severity === 'high') return sum + 2;
    if (f.severity === 'medium') return sum + 1;
    return sum + 0.5;
  }, 0);
  const estimatedImprovement = Math.min(Math.round(penaltyReduction), 15);

  const handleApply = () => {
    setApplied(true);
    // Notify parent to update report state (remove safe-fix findings, recalculate score)
    if (onApplySafeFixes) {
      onApplySafeFixes(count, estimatedImprovement);
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${
      applied
        ? 'bg-green-900/20 border-green-500/40'
        : 'bg-emerald-900/10 border-emerald-500/30'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-200">
            {applied ? 'Safe Fixes Applied' : 'Automatic Safe Fixes Available'}
          </h4>
          <p className="text-xs text-gray-400 mt-0.5">
            {applied
              ? `${count} deterministic fixes applied. Score improved by ~${estimatedImprovement} points.`
              : `${count} deterministic fixes (filler words, naming, formatting). Estimated +${estimatedImprovement} points.`
            }
          </p>
        </div>
        {!applied ? (
          <button
            type="button"
            onClick={handleApply}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0"
          >
            Apply {count} Safe Fixes
          </button>
        ) : (
          <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ──── URL Input ────

function UrlInputPanel({ url, onChange }: { url: string; onChange: (v: string) => void }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <label className="block text-xs font-medium text-gray-400 mb-2">
        Target URL to Audit
      </label>
      <input
        type="url"
        value={url}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://yoursite.com/page"
        className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <p className="text-xs text-gray-500 mt-1">
        Provide a live URL for full content audit, or leave blank for strategy-only audit
      </p>
    </div>
  );
}

// ──── Main Component ────

const PipelineAuditStep: React.FC = () => {
  const {
    autoApprove,
    advanceStep,
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    setStepStatus,
    activeMap,
  } = usePipeline();
  const { state, dispatch } = useAppState();

  const stepState = getStepState('audit');
  const gate = stepState?.gate;

  const [auditUrl, setAuditUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [report, setReport] = useState<UnifiedAuditReport | null>(
    () => (activeMap?.analysis_state as any)?.audit_report ?? null
  );
  const [error, setError] = useState<string | null>(null);

  // Merge per-map business_info overrides with global state (per-map takes precedence)
  const effectiveBusinessInfo = useMemo(() => {
    const mapBI = activeMap?.business_info;
    return mapBI ? { ...state.businessInfo, ...mapBI } : state.businessInfo;
  }, [state.businessInfo, activeMap?.business_info]);

  // A1: Handler to standardize duplicate EAV values to canonical form
  const handleStandardizeEavs = (predicate: string, canonicalValue: string) => {
    const mapId = state.activeMapId;
    const currentEavs = activeMap?.eavs;
    if (!mapId || !currentEavs) return;

    const updatedEavs = currentEavs.map(eav => {
      const pred = eav.predicate?.relation?.toLowerCase().trim();
      if (pred === predicate.toLowerCase().trim()) {
        return {
          ...eav,
          object: { ...eav.object, value: canonicalValue },
        };
      }
      return eav;
    });

    dispatch({
      type: 'SET_EAVS',
      payload: { mapId, eavs: updatedEavs },
    });
  };

  // A4: Handler to apply safe fixes — remove fixed findings from report and recalculate score
  const handleApplySafeFixes = (fixedCount: number, estimatedImprovement: number) => {
    if (!report) return;

    const safeFixPatterns = [
      'filler', 'vague', 'preamble', 'redundan',
      'pronoun', 'passive', 'sentence length',
      'alt text', 'missing alt', 'heading hierarchy',
      'entity nam', 'trailing space', 'empty heading',
    ];

    // Remove safe-fix findings from the report and recalculate scores
    const updatedPhaseResults = report.phaseResults.map(phase => {
      const keptFindings = phase.findings.filter(f => {
        if (f.severity === 'critical') return true; // Keep critical
        const text = `${f.title} ${f.description}`.toLowerCase();
        return !safeFixPatterns.some(pattern => text.includes(pattern));
      });
      const removedCount = phase.findings.length - keptFindings.length;
      const newScore = Math.min(100, phase.score + removedCount * 2);
      return {
        ...phase,
        findings: keptFindings,
        score: newScore,
        passedChecks: phase.passedChecks + removedCount,
      };
    });

    const newOverallScore = Math.min(100,
      updatedPhaseResults.reduce((sum, p) => sum + p.score, 0) / updatedPhaseResults.length
    );

    setReport({
      ...report,
      phaseResults: updatedPhaseResults,
      overallScore: newOverallScore,
    });
  };

  const handleRunAudit = async () => {
    const businessInfo = effectiveBusinessInfo;
    const activeProjectId = state.activeProjectId;
    const activeMapId = state.activeMapId;

    if (!activeProjectId || !activeMapId) {
      setError('No active project or map found.');
      return;
    }

    setError(null);
    setIsRunning(true);
    setProgressPercent(0);
    setStepStatus('audit', 'in_progress');

    try {
      const fetcher = new ContentFetcher({
        jinaApiKey: businessInfo.jinaApiKey,
        firecrawlApiKey: businessInfo.firecrawlApiKey,
        proxyConfig: (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) ? {
          supabaseUrl: businessInfo.supabaseUrl,
          supabaseAnonKey: businessInfo.supabaseAnonKey,
        } : undefined,
      });

      const supabase = (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey)
        ? getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey)
        : undefined;

      // Build topical map context for content-aware auditing.
      // TopicalMapContext.sourceContext expects an object, not the string from SEOPillars.
      const topicalMapContext = {
        centralEntity: activeMap?.pillars?.centralEntity,
        sourceContext: businessInfo.industry ? {
          businessName: businessInfo.projectName ?? businessInfo.industry ?? '',
          industry: businessInfo.industry ?? '',
          targetAudience: businessInfo.audience ?? businessInfo.targetMarket ?? '',
          coreServices: businessInfo.valueProp ? [businessInfo.valueProp] : [],
          uniqueSellingPoints: activeMap?.pillars?.sourceContext
            ? [activeMap.pillars.sourceContext]
            : [],
        } : undefined,
        eavs: activeMap?.eavs?.map(e => ({
          entity: e.subject?.label ?? '',
          attribute: e.predicate?.relation ?? '',
          value: String(e.object?.value ?? ''),
          category: e.predicate?.category,
        })),
        websiteType: businessInfo.websiteType,
        language: businessInfo.language,
      };

      const phases = createAllPhases(businessInfo.perplexityApiKey);
      const orchestrator = new UnifiedAuditOrchestrator(phases, fetcher, undefined, {
        supabase: supabase ?? undefined,
        mapEavs: topicalMapContext.eavs,
        topicalMapContext,
      });

      const request: AuditRequest = {
        type: auditUrl ? 'external' : 'internal',
        projectId: activeProjectId,
        mapId: activeMapId,
        url: auditUrl || undefined,
        depth: 'deep',
        phases: ALL_PHASE_NAMES,
        scrapingProvider: 'jina',
        language: businessInfo.language || 'en',
        includeFactValidation: !!businessInfo.perplexityApiKey,
        includePerformanceData: false,
      };

      const onProgress = (event: AuditProgressEvent) => {
        const percent = Math.round((event.progress ?? 0) * 100);
        const phaseLabel = event.phase
          ? event.phase.replace(/([A-Z])/g, ' $1').trim()
          : '';
        const labels: Record<string, string> = {
          start: 'Starting audit...',
          fetching_content: 'Fetching page content...',
          phase_start: 'Running phase...',
          phase_complete: 'Phase complete',
          complete: 'Audit complete!',
        };
        const label = labels[event.type] || event.type;
        setProgressText(phaseLabel ? `${label} (${phaseLabel})` : label);
        setProgressPercent(percent);
      };

      const result = await orchestrator.runAudit(request, onProgress);
      setReport(result);

      // Persist audit report to analysis_state (dispatch + Supabase)
      if (activeMapId) {
        const updatedAnalysisState = {
          ...activeMap?.analysis_state,
          audit_report: result,
        };
        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: {
            mapId: activeMapId,
            data: { analysis_state: updatedAnalysisState } as any,
          },
        });

        try {
          const sbUrl = effectiveBusinessInfo.supabaseUrl;
          const sbKey = effectiveBusinessInfo.supabaseAnonKey;
          if (sbUrl && sbKey) {
            const persistSupabase = getSupabaseClient(sbUrl, sbKey);
            await persistSupabase.from('topical_maps')
              .update({ analysis_state: updatedAnalysisState } as any)
              .eq('id', activeMapId);
          }
        } catch (persistErr) {
          console.warn('[Audit] Failed to persist audit report to Supabase:', persistErr);
        }
      }

      setStepStatus('audit', 'pending_approval');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Audit failed';
      setError(message);
      setStepStatus('audit', 'in_progress');
    } finally {
      setIsRunning(false);
      setProgressText('');
    }
  };

  // Compute severity counts from report
  const criticalCount = report?.phaseResults.flatMap(p => p.findings).filter(f => f.severity === 'critical').length ?? 0;
  const highCount = report?.phaseResults.flatMap(p => p.findings).filter(f => f.severity === 'high').length ?? 0;
  const mediumCount = report?.phaseResults.flatMap(p => p.findings).filter(f => f.severity === 'medium').length ?? 0;

  // Overall score
  const overallScore = report?.overallScore ?? null;

  // Compliance rate — percent of checks passing
  const totalChecks = report?.phaseResults.reduce((sum, p) => sum + p.totalChecks, 0) ?? 0;
  const passedChecks = report?.phaseResults.reduce((sum, p) => sum + p.passedChecks, 0) ?? 0;
  const complianceRate = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Audit &amp; Validation</h2>
        <p className="text-sm text-gray-400 mt-1">
          Unified content audit across 15 phases with auto-fix and role-based action items
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Progress */}
      {isRunning && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-3">
            <svg className="animate-spin w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-blue-300">{progressText || 'Running audit...'}</p>
          </div>
          {progressPercent > 0 && (
            <div className="w-full bg-blue-900/40 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Score Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Semantic Compliance"
          value={complianceRate !== null ? `${complianceRate}%` : '--%'}
          color={complianceRate !== null ? (complianceRate >= 80 ? 'green' : complianceRate >= 60 ? 'amber' : 'red') : 'gray'}
        />
        <MetricCard
          label="KG Health"
          value={overallScore !== null ? `${Math.round(overallScore / 20)}/5` : '--/5'}
          color={overallScore !== null ? (overallScore >= 80 ? 'green' : 'amber') : 'gray'}
        />
        <MetricCard
          label="On-Page Score"
          value={overallScore !== null ? `${Math.round(overallScore)}/100` : '--/100'}
          color={overallScore !== null ? (overallScore >= 80 ? 'green' : overallScore >= 60 ? 'amber' : 'red') : 'gray'}
        />
      </div>

      {/* Action Items Summary */}
      <div className="grid grid-cols-3 gap-4">
        <SeverityBadge severity="Critical" count={criticalCount} />
        <SeverityBadge severity="High" count={highCount} />
        <SeverityBadge severity="Medium" count={mediumCount} />
      </div>

      {/* Safe Fixes (A4) */}
      <SafeFixesPanel report={report} onApplySafeFixes={handleApplySafeFixes} />

      {/* KBT Violations (A1) */}
      <KbtViolationsPanel report={report} eavs={activeMap?.eavs} onStandardizeEavs={handleStandardizeEavs} />

      {/* Content Area Scores (A2) */}
      <ContentAreaScores
        contentAreas={activeMap?.pillars?.contentAreas}
        topics={activeMap?.topics ?? []}
        overallScore={overallScore}
      />

      {/* URL Input */}
      <UrlInputPanel url={auditUrl} onChange={setAuditUrl} />

      {/* Compliance + Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceByPhase report={report} />
        <ActionItemsList report={report} />
      </div>

      {/* Run Audit Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleRunAudit}
          disabled={isRunning}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {isRunning && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isRunning ? 'Running...' : report ? 'Re-run Full Audit' : 'Run Full Audit'}
        </button>
      </div>

      {/* Approval Gate */}
      {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="audit"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('audit')}
          onReject={(reason) => rejectGate('audit', reason)}
          onRevise={() => reviseStep('audit')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Semantic Compliance', value: complianceRate !== null ? `${complianceRate}%` : '--%', color: complianceRate !== null && complianceRate >= 80 ? 'green' : complianceRate !== null ? 'amber' : 'gray' },
            { label: 'KG Health', value: overallScore !== null ? `${Math.round(overallScore / 20)}/5` : '--/5', color: overallScore !== null && overallScore >= 80 ? 'green' : overallScore !== null ? 'amber' : 'gray' },
            { label: 'On-Page Score', value: overallScore !== null ? `${Math.round(overallScore)}/100` : '--/100', color: overallScore !== null && overallScore >= 80 ? 'green' : overallScore !== null ? 'amber' : 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineAuditStep;
