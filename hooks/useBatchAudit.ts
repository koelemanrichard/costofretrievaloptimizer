import { useState, useCallback, useRef, useMemo } from 'react';
import { useAppState } from '../state/appState';
import { getSupabaseClient } from '../services/supabaseClient';
import { UnifiedAuditOrchestrator } from '../services/audit/UnifiedAuditOrchestrator';
import { ContentFetcher } from '../services/audit/ContentFetcher';
import { BatchAuditService } from '../services/audit/BatchAuditService';
import type { BatchAuditProgress, BatchAuditOptions } from '../services/audit/BatchAuditService';
import type { TopicalMapContext } from '../services/audit/types';
import type { SiteInventoryItem, SemanticTriple } from '../types';

// Phase imports
import { StrategicFoundationPhase } from '../services/audit/phases/StrategicFoundationPhase';
import { EavSystemPhase } from '../services/audit/phases/EavSystemPhase';
import { ContentQualityPhase } from '../services/audit/phases/ContentQualityPhase';
import { InformationDensityPhase } from '../services/audit/phases/InformationDensityPhase';
import { ContextualFlowPhase } from '../services/audit/phases/ContextualFlowPhase';
import { LinkStructurePhase } from '../services/audit/phases/LinkStructurePhase';
import { SemanticDistancePhase } from '../services/audit/phases/SemanticDistancePhase';
import { ContentFormatPhase } from '../services/audit/phases/ContentFormatPhase';
import { HtmlTechnicalPhase } from '../services/audit/phases/HtmlTechnicalPhase';
import { MetaStructuredDataPhase } from '../services/audit/phases/MetaStructuredDataPhase';
import { CostOfRetrievalPhase } from '../services/audit/phases/CostOfRetrievalPhase';
import { UrlArchitecturePhase } from '../services/audit/phases/UrlArchitecturePhase';
import { CrossPageConsistencyPhase } from '../services/audit/phases/CrossPageConsistencyPhase';
import { WebsiteTypeSpecificPhase } from '../services/audit/phases/WebsiteTypeSpecificPhase';
import { FactValidationPhase } from '../services/audit/phases/FactValidationPhase';
import { createPerplexityVerifier } from '../services/audit/FactValidator';

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

/**
 * React hook that manages batch audit state and progress for the UI.
 *
 * Instantiates a `BatchAuditService` using the same pattern as `AuditPage.tsx`
 * and exposes a simple API for starting, cancelling, and tracking batch audits.
 */
export function useBatchAudit(projectId: string, mapId: string) {
  const { state } = useAppState();
  const { businessInfo } = state;

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchAuditProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Supabase client — memoised so it only recreates when credentials change
  const supabase = useMemo(() => {
    if (!businessInfo.supabaseUrl || !businessInfo.supabaseAnonKey) return null;
    return getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
  }, [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  // Active topical map — needed for EAV context
  const activeMap = useMemo(() => {
    return state.topicalMaps.find(m => m.id === mapId) ?? null;
  }, [mapId, state.topicalMaps]);

  // Build TopicalMapContext (mirrors AuditPage.tsx logic)
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

    // Build cross-page context arrays from topics
    const allTopics = activeMap.topics ?? [];
    const allPageTargetQueries = allTopics
      .map(t => t.canonical_query || t.title || '')
      .filter(Boolean);
    const allPageCentralEntities = allTopics
      .map(() => pillars?.centralEntity ?? '')
      .filter(Boolean);

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
      relatedPages: otherPages,
      websiteType: bi?.websiteType,
      eavTriples: flatEavs.map(({ entity, attribute, value }) => ({ entity, attribute, value })),
      // Cross-page context
      siteCentralEntity: pillars?.centralEntity,
      allPageUrls: otherPages.map(p => p.url),
      allPageTargetQueries,
      allPageCentralEntities,
    };
  }, [activeMap]);

  const startBatch = useCallback(async (
    inventory: SiteInventoryItem[],
    options?: BatchAuditOptions,
  ): Promise<void> => {
    if (!supabase) {
      setError('Supabase credentials are not configured.');
      return;
    }

    // Abort any previous batch still running
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsRunning(true);
    setError(null);
    setProgress(null);

    try {
      const fetcher = new ContentFetcher({
        jinaApiKey: businessInfo.jinaApiKey,
        firecrawlApiKey: businessInfo.firecrawlApiKey,
        proxyConfig: (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) ? {
          supabaseUrl: businessInfo.supabaseUrl,
          supabaseAnonKey: businessInfo.supabaseAnonKey,
        } : undefined,
      });

      const phases = createAllPhases(businessInfo.perplexityApiKey);
      const orchestrator = new UnifiedAuditOrchestrator(phases, fetcher, undefined, {
        supabase: supabase ?? undefined,
        mapEavs: topicalMapContext?.eavs,
        topicalMapContext,
      });

      const service = new BatchAuditService(orchestrator, supabase, projectId, mapId);

      // Ensure per-map language is passed to the batch audit
      const auditLanguage = activeMap?.business_info?.language || businessInfo.language || 'en';
      const mergedOptions: BatchAuditOptions = {
        language: auditLanguage,
        ...options,
      };

      await service.runBatch(
        inventory,
        mergedOptions,
        (p) => setProgress({ ...p }),
        controller.signal,
      );
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [supabase, businessInfo, projectId, mapId, topicalMapContext, activeMap]);

  const cancelBatch = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsRunning(false);
  }, []);

  return {
    isRunning,
    progress,
    startBatch,
    cancelBatch,
    error,
  };
}
