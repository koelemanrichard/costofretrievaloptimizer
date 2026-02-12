import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { ExternalUrlInput } from '../../audit/ExternalUrlInput';
import { UnifiedAuditDashboard } from '../../audit/UnifiedAuditDashboard';
import { UnifiedAuditOrchestrator } from '../../../services/audit/UnifiedAuditOrchestrator';
import type { AuditProgressEvent } from '../../../services/audit/UnifiedAuditOrchestrator';
import { ContentFetcher } from '../../../services/audit/ContentFetcher';
import type { AuditRequest, AuditPhaseName, UnifiedAuditReport, TopicalMapContext } from '../../../services/audit/types';
import type { SemanticTriple } from '../../../types';

// Phase imports
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

function createAllPhases() {
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
    new FactValidationPhase(),
  ];
}

const PHASE_LABELS: Record<string, string> = {
  start: 'Starting audit...',
  fetching_content: 'Fetching page content...',
  discovering_urls: 'Discovering related URLs...',
  phase_start: 'Running phase...',
  phase_complete: 'Phase complete',
  complete: 'Audit complete!',
};

const AuditPage: React.FC = () => {
  const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();
  const [searchParams] = useSearchParams();
  const urlParam = searchParams.get('url');

  const { state } = useAppState();
  const { businessInfo } = state;

  const [report, setReport] = useState<UnifiedAuditReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ percent: number; label: string }>({ percent: 0, label: '' });

  const hasAutoTriggered = useRef(false);

  const supabase = useMemo(() => {
    if (!businessInfo.supabaseUrl || !businessInfo.supabaseAnonKey) return null;
    return getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
  }, [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  const activeMap = useMemo(() => {
    return state.topicalMaps.find(m => m.id === mapId) ?? null;
  }, [mapId, state.topicalMaps]);

  const topicalMapContext = useMemo((): TopicalMapContext | undefined => {
    if (!activeMap) return undefined;

    const pillars = activeMap.pillars;
    const eavs = activeMap.eavs;
    const bi = activeMap.business_info;

    // Convert SemanticTriple[] to flat EAV arrays
    const flatEavs = eavs?.map((t: SemanticTriple) => ({
      entity: t.entity ?? t.subject?.label ?? '',
      attribute: t.attribute ?? t.predicate?.relation ?? '',
      value: String(t.value ?? t.object?.value ?? ''),
      category: t.predicate?.category,
    })) ?? [];

    const rootAttributes = flatEavs
      .filter(e => e.category === 'ROOT')
      .map(e => e.attribute);

    // Build topic list from map topics
    const otherPages = (activeMap.topics ?? [])
      .filter(t => t.target_url)
      .map(t => ({ url: t.target_url!, topic: t.title ?? '' }));

    return {
      centralEntity: pillars?.centralEntity,
      sourceContext: bi ? {
        businessName: bi.projectName ?? '',
        industry: bi.industry ?? '',
        targetAudience: bi.audience ?? '',
        coreServices: bi.valueProp ? [bi.valueProp] : [],
        uniqueSellingPoints: bi.uniqueDataAssets ? [bi.uniqueDataAssets] : [],
      } : undefined,
      contentSpec: pillars ? {
        centralEntity: pillars.centralEntity,
        targetKeywords: [pillars.centralSearchIntent].filter(Boolean),
        requiredAttributes: rootAttributes,
      } : undefined,
      eavs: flatEavs,
      rootAttributes,
      otherPages,
      websiteType: bi?.websiteType,
      eavTriples: flatEavs.map(({ entity, attribute, value }) => ({ entity, attribute, value })),
    };
  }, [activeMap]);

  const runAudit = useCallback(async (config: { url: string; provider: 'jina' | 'firecrawl' | 'apify' | 'direct'; discoverRelated: boolean }) => {
    if (!projectId) return;

    setIsRunning(true);
    setError(null);
    setReport(null);
    setProgress({ percent: 0, label: 'Initializing...' });

    try {
      const fetcher = new ContentFetcher({
        jinaApiKey: businessInfo.jinaApiKey,
        firecrawlApiKey: businessInfo.firecrawlApiKey,
      });

      const phases = createAllPhases();
      const orchestrator = new UnifiedAuditOrchestrator(phases, fetcher, undefined, {
        supabase: supabase ?? undefined,
        mapEavs: topicalMapContext?.eavs,
        topicalMapContext,
      });

      const request: AuditRequest = {
        type: 'external',
        projectId,
        mapId,
        url: config.url,
        depth: 'deep',
        phases: ALL_PHASE_NAMES,
        scrapingProvider: config.provider,
        language: 'en',
        includeFactValidation: true,
        includePerformanceData: false,
      };

      const onProgress = (event: AuditProgressEvent) => {
        const percent = Math.round((event.progress ?? 0) * 100);
        const phaseLabel = event.phase ? event.phase.replace(/([A-Z])/g, ' $1').trim() : '';
        const baseLabel = PHASE_LABELS[event.type] || event.type;
        const label = phaseLabel ? `${baseLabel} (${phaseLabel})` : baseLabel;
        setProgress({ percent, label });
      };

      const result = await orchestrator.runAudit(request, onProgress);
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
    } finally {
      setIsRunning(false);
    }
  }, [projectId, mapId, businessInfo.jinaApiKey, businessInfo.firecrawlApiKey, supabase, topicalMapContext]);

  // Auto-trigger audit when ?url= param is present
  useEffect(() => {
    if (urlParam && !hasAutoTriggered.current && !isRunning) {
      hasAutoTriggered.current = true;
      runAudit({ url: urlParam, provider: 'jina', discoverRelated: false });
    }
  }, [urlParam, isRunning, runAudit]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Page Audit</h1>
        <p className="text-sm text-gray-400 mt-1">
          Run a 15-phase content audit on any URL to identify SEO improvements.
        </p>
      </div>

      {/* URL Input */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
        <ExternalUrlInput
          onSubmit={runAudit}
          isLoading={isRunning}
          disabled={isRunning}
        />
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{progress.label}</span>
            <span className="text-orange-400 font-medium">{progress.percent}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {report && (
        <UnifiedAuditDashboard report={report} />
      )}
    </div>
  );
};

export default AuditPage;
