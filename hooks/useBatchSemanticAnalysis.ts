// hooks/useBatchSemanticAnalysis.ts
// React hook for batch semantic analysis of site inventory pages
// Wraps BatchSemanticAnalysisService with React state management

import { useState, useCallback, useRef } from 'react';
import { BatchSemanticAnalysisService, BatchSemanticProgress, BatchSemanticResultItem, BatchSemanticInput } from '../services/ai/batchSemanticAnalysis';
import { analyzePageSemantics } from '../services/ai/semanticAnalysis';
import { getExistingSemanticAnalysis, saveSemanticAnalysis } from '../services/semanticAnalysisPersistence';
import { getSupabaseClient } from '../services/supabaseClient';
import type { BusinessInfo, SiteInventoryItem } from '../types';
import type { AppAction } from '../state/appState';

export interface UseBatchSemanticAnalysisReturn {
  isRunning: boolean;
  progress: BatchSemanticProgress | null;
  results: BatchSemanticResultItem[] | null;
  error: string | null;
  startBatch: (inventory: SiteInventoryItem[], contentMap: Map<string, string>) => Promise<BatchSemanticResultItem[]>;
  cancel: () => void;
}

/**
 * React hook for running batch semantic analysis across site inventory pages.
 *
 * Uses BatchSemanticAnalysisService under the hood with cache-first strategy:
 * 1. Check persistence layer for existing analysis (same content hash)
 * 2. If not cached, run AI analysis via analyzePageSemantics (detection mode, no pillars)
 * 3. Persist results for future cache hits
 * 4. Write detected CE/SC/CSI back to site_inventory for quick access
 *
 * @param businessInfo - User's business context and API keys
 * @param dispatch - React dispatch for logging and state updates
 * @param mapId - Current topical map ID (null for detection mode)
 */
export function useBatchSemanticAnalysis(
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>,
  mapId: string | null
): UseBatchSemanticAnalysisReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchSemanticProgress | null>(null);
  const [results, setResults] = useState<BatchSemanticResultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startBatch = useCallback(async (
    inventory: SiteInventoryItem[],
    contentMap: Map<string, string>
  ): Promise<BatchSemanticResultItem[]> => {
    if (isRunning) return [];

    setIsRunning(true);
    setError(null);
    setProgress(null);
    setResults(null);

    abortRef.current = new AbortController();

    // Build input items — only include pages that have fetched content
    const items: BatchSemanticInput[] = inventory
      .filter(item => contentMap.has(item.id))
      .map(item => ({
        id: item.id,
        url: item.url,
        content: contentMap.get(item.id)!,
      }));

    const service = new BatchSemanticAnalysisService({
      analyzeFn: async (content, url) => {
        // Detection mode: no pillars passed
        return analyzePageSemantics(content, url, businessInfo, dispatch);
      },
      concurrency: 2,
      checkCacheFn: async (inventoryId, content) => {
        return getExistingSemanticAnalysis(
          inventoryId, mapId, content,
          businessInfo.supabaseUrl, businessInfo.supabaseAnonKey
        );
      },
      persistFn: async (inventoryId, result, content) => {
        await saveSemanticAnalysis(
          inventoryId, mapId, content, result,
          businessInfo.supabaseUrl, businessInfo.supabaseAnonKey
        );
      },
    });

    try {
      const batchResults = await service.analyze(
        items,
        (p) => setProgress({ ...p }),
        abortRef.current.signal
      );

      setResults(batchResults);

      // Write detected CE/SC/CSI back to site_inventory for quick access
      // Uses (supabase as any) because detected_ce/sc/csi columns are added in Task 3
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
      const updates = batchResults
        .filter(r => r.success && r.detectedCE)
        .map(r => ({
          id: r.inventoryId,
          detected_ce: r.detectedCE,
          detected_sc: r.detectedSC,
          detected_csi: r.detectedCSI,
          semantic_overall_score: r.overallScore,
        }));

      if (updates.length > 0) {
        let writeFailures = 0;
        for (const update of updates) {
          const { error: updateError } = await (supabase as any)
            .from('site_inventory')
            .update({
              detected_ce: update.detected_ce,
              detected_sc: update.detected_sc,
              detected_csi: update.detected_csi,
            })
            .eq('id', update.id);

          if (updateError) {
            writeFailures++;
            console.error(`[SemanticAnalysis] Failed to write detected_ce for ${update.id}:`, updateError);
          }
        }
        if (writeFailures > 0) {
          console.warn(`[SemanticAnalysis] ${writeFailures}/${updates.length} DB write-backs failed`);
        }
      }

      return batchResults;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Batch analysis failed';
      setError(msg);
      return [];
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, [isRunning, businessInfo, dispatch, mapId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { isRunning, progress, results, error, startBatch, cancel };
}
