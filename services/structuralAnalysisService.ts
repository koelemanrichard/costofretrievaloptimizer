/**
 * Structural Analysis Service
 *
 * Frontend service for requesting and caching structural analysis.
 * Calls the html-structure-analyzer edge function and manages
 * persistence in site_analysis_pages.structural_analysis.
 */

import type { StructuralAnalysis, StructuralAnalysisRequest } from '../types';
import { useSupabase } from './supabaseClient';

/**
 * Aggregate structural health metrics across analyzed pages.
 * Useful for Insights Hub and dashboard-level structural overview.
 */
export function aggregateStructuralHealth(
  analyses: StructuralAnalysis[]
): {
  totalPages: number;
  withSemanticMain: number;
  avgMainContentRatio: number;
  withSchema: number;
  withCeInH1: number;
  avgDomEfficiency: number;
} {
  if (analyses.length === 0) {
    return {
      totalPages: 0,
      withSemanticMain: 0,
      avgMainContentRatio: 0,
      withSchema: 0,
      withCeInH1: 0,
      avgDomEfficiency: 0,
    };
  }

  const totalPages = analyses.length;
  const withSemanticMain = analyses.filter(a => a.regions.main.exists).length;
  const avgMainContentRatio = Math.round(
    analyses.reduce((s, a) => s + a.regions.main.percentage, 0) / totalPages
  );
  const withSchema = analyses.filter(a => a.schemaMarkup.length > 0).length;
  const withCeInH1 = analyses.filter(a => a.entityProminence.inH1).length;
  const avgDomEfficiency = Math.round(
    analyses.reduce((s, a) => {
      const ratio = a.domMetrics.totalNodes > 0
        ? a.domMetrics.mainContentNodes / a.domMetrics.totalNodes
        : 0;
      return s + ratio;
    }, 0) / totalPages * 100
  );

  return {
    totalPages,
    withSemanticMain,
    avgMainContentRatio,
    withSchema,
    withCeInH1,
    avgDomEfficiency,
  };
}

const ANALYZER_VERSION = '1.0.0';

/**
 * Get structural analysis for a page, using cache if available.
 *
 * Priority:
 * 1. Check site_analysis_pages.structural_analysis for cached result
 * 2. If missing/stale, call edge function to analyze
 * 3. Store result for future use
 */
export async function getStructuralAnalysis(
  projectId: string,
  url: string,
  options: {
    centralEntity?: string;
    language?: string;
    html?: string;
    forceRefresh?: boolean;
  } = {}
): Promise<StructuralAnalysis | null> {
  const supabase = useSupabase();

  // 1. Check cache (unless force refresh)
  // Note: structural_analysis column may not be in generated DB types yet;
  // use select('*') and access via type assertion.
  if (!options.forceRefresh) {
    const { data: cached } = await supabase
      .from('site_analysis_pages')
      .select('*')
      .eq('project_id', projectId)
      .eq('url', url)
      .maybeSingle();

    const cachedAnalysis = (cached as any)?.structural_analysis as StructuralAnalysis | undefined;
    if (cachedAnalysis) {
      if (cachedAnalysis.analyzerVersion === ANALYZER_VERSION) {
        return cachedAnalysis;
      }
    }
  }

  // 2. Call edge function
  const request: StructuralAnalysisRequest = {
    centralEntity: options.centralEntity,
    language: options.language,
  };

  if (options.html) {
    request.html = options.html;
  } else {
    request.url = url;
  }

  const { data, error } = await supabase.functions.invoke('html-structure-analyzer', {
    body: request,
  });

  if (error || !data?.ok || !data?.analysis) {
    console.warn('[structuralAnalysis] Analysis failed for', url, error?.message || data?.error);
    return null;
  }

  const analysis = data.analysis as StructuralAnalysis;

  // 3. Cache the result
  await supabase
    .from('site_analysis_pages')
    .update({ structural_analysis: analysis } as any)
    .eq('project_id', projectId)
    .eq('url', url);

  return analysis;
}

/**
 * Analyze HTML directly without caching (for competitor pages, external URLs).
 */
export async function analyzeHtmlDirect(
  html: string,
  centralEntity?: string,
  language?: string
): Promise<StructuralAnalysis | null> {
  const supabase = useSupabase();

  const { data, error } = await supabase.functions.invoke('html-structure-analyzer', {
    body: { html, centralEntity, language },
  });

  if (error || !data?.ok || !data?.analysis) {
    console.warn('[structuralAnalysis] Direct analysis failed:', error?.message || data?.error);
    return null;
  }

  return data.analysis as StructuralAnalysis;
}

/**
 * Batch analyze multiple pages for a project.
 * Processes sequentially to avoid overwhelming the edge function.
 */
export async function batchAnalyzePages(
  projectId: string,
  pages: Array<{ url: string; html?: string }>,
  centralEntity?: string,
  language?: string,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, StructuralAnalysis>> {
  const results = new Map<string, StructuralAnalysis>();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const analysis = await getStructuralAnalysis(projectId, page.url, {
      centralEntity,
      language,
      html: page.html,
    });

    if (analysis) {
      results.set(page.url, analysis);
    }

    onProgress?.(i + 1, total);
  }

  return results;
}
