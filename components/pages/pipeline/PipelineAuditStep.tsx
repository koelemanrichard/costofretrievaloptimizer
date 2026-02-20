import React, { useState } from 'react';
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

// ──── Action Items List ────

function ActionItemsList({ report }: { report: UnifiedAuditReport | null }) {
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

  // Collect all high-severity findings
  const criticalFindings = report.phaseResults
    .flatMap(p => p.findings)
    .filter(f => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 8);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Action Items</h3>
      {criticalFindings.length > 0 ? (
        <div className="space-y-3">
          {criticalFindings.map((finding, i) => (
            <div
              key={i}
              className={`bg-gray-900 border border-gray-700 border-l-4 ${
                finding.severity === 'critical' ? 'border-l-red-500' : 'border-l-amber-500'
              } rounded-md px-4 py-3`}
            >
              <div className="flex items-center gap-2 mb-1">
                <RoleBadge role="CONTENT" />
                <span className="text-sm font-medium text-gray-200">{finding.title}</span>
              </div>
              <p className="text-xs text-gray-400 ml-0.5">{finding.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-400">No critical issues found</p>
        </div>
      )}
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
  const { state } = useAppState();

  const stepState = getStepState('audit');
  const gate = stepState?.gate;

  const [auditUrl, setAuditUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [report, setReport] = useState<UnifiedAuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAudit = async () => {
    const businessInfo = state.businessInfo;
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
