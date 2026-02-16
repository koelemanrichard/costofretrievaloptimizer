import type { SupabaseClient } from '@supabase/supabase-js';
import type { SiteInventoryItem } from '../../types';
import type { UnifiedAuditOrchestrator } from './UnifiedAuditOrchestrator';
import type { AuditRequest, AuditPhaseName } from './types';
import { AuditSnapshotService } from './AuditSnapshotService';

// ---------------------------------------------------------------------------
// All audit phase names — used as the default set when building AuditRequest
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BatchAuditProgress {
  total: number;
  completed: number;
  currentUrl: string;
  currentPhase: string;
  errors: { url: string; error: string }[];
}

export interface BatchAuditOptions {
  /** Maximum number of concurrent audit jobs. Default: 2 (rate-limit safe). */
  concurrency?: number;
  /** Skip inventory items that already have a `last_audited_at` value. Default: true. */
  skipAlreadyAudited?: boolean;
  /** Optional cap on the number of pages to audit in a single batch. */
  maxPages?: number;
  /** Sort order for the queue. Default: 'clicks'. */
  priorityOrder?: 'clicks' | 'impressions' | 'alphabetical';
  /** Scraping provider to use for content fetching. Default: 'jina'. */
  scrapingProvider?: 'jina' | 'firecrawl' | 'apify' | 'direct';
  /** Content language hint. Default: 'en'. */
  language?: string;
}

// ---------------------------------------------------------------------------
// BatchAuditService
// ---------------------------------------------------------------------------

/**
 * Queues and processes audits for multiple inventory URLs with concurrency
 * control, progress callbacks, and inventory metadata updates.
 *
 * Usage:
 * ```ts
 * const service = new BatchAuditService(orchestrator, supabase, projectId, mapId);
 * await service.runBatch(inventory, { concurrency: 2 }, (p) => console.log(p));
 * ```
 */
export class BatchAuditService {
  private snapshotService = new AuditSnapshotService();

  constructor(
    private orchestrator: UnifiedAuditOrchestrator,
    private supabase: SupabaseClient,
    private projectId: string,
    private mapId: string,
  ) {}

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  async runBatch(
    inventory: SiteInventoryItem[],
    options: BatchAuditOptions = {},
    onProgress: (progress: BatchAuditProgress) => void,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    const {
      concurrency = 2,
      skipAlreadyAudited = true,
      maxPages,
      priorityOrder = 'clicks',
      scrapingProvider = 'jina',
      language = 'en',
    } = options;

    // 1. Filter — optionally skip already-audited items
    let items = skipAlreadyAudited
      ? inventory.filter(item => !item.last_audited_at)
      : [...inventory];

    // 2. Sort by priority
    if (priorityOrder === 'clicks') {
      items.sort((a, b) => (b.gsc_clicks ?? 0) - (a.gsc_clicks ?? 0));
    } else if (priorityOrder === 'impressions') {
      items.sort((a, b) => (b.gsc_impressions ?? 0) - (a.gsc_impressions ?? 0));
    } else {
      items.sort((a, b) => a.url.localeCompare(b.url));
    }

    // 3. Cap the total number of pages
    if (maxPages && maxPages > 0) {
      items = items.slice(0, maxPages);
    }

    // Nothing to do
    if (items.length === 0) return;

    const progress: BatchAuditProgress = {
      total: items.length,
      completed: 0,
      currentUrl: '',
      currentPhase: '',
      errors: [],
    };

    // 4. Process with concurrency limit using a shared-queue worker pattern
    const queue = [...items];

    const processNext = async (): Promise<void> => {
      while (queue.length > 0) {
        if (abortSignal?.aborted) return;

        const item = queue.shift()!;
        progress.currentUrl = item.url;
        progress.currentPhase = 'starting';
        onProgress({ ...progress });

        try {
          await this.auditSingleUrl(item, scrapingProvider, language, progress, onProgress);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          progress.errors.push({ url: item.url, error: errorMsg });
        }

        progress.completed++;
        onProgress({ ...progress });
      }
    };

    // Launch concurrent workers
    const workers: Promise<void>[] = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push(processNext());
    }

    await Promise.allSettled(workers);
  }

  // -------------------------------------------------------------------------
  // Single URL audit + inventory update
  // -------------------------------------------------------------------------

  private async auditSingleUrl(
    item: SiteInventoryItem,
    scrapingProvider: 'jina' | 'firecrawl' | 'apify' | 'direct',
    language: string,
    progress: BatchAuditProgress,
    onProgress: (progress: BatchAuditProgress) => void,
  ): Promise<void> {
    // Build the audit request
    const request: AuditRequest = {
      type: 'external',
      projectId: this.projectId,
      mapId: this.mapId,
      url: item.url,
      depth: 'deep',
      phases: ALL_PHASE_NAMES,
      scrapingProvider,
      language,
      includeFactValidation: false,
      includePerformanceData: false,
    };

    // Run audit with phase-level progress tracking
    const report = await this.orchestrator.runAudit(request, (event) => {
      if (event.phase) {
        progress.currentPhase = event.phase;
        onProgress({ ...progress });
      }
    });

    // Save snapshot (separate from the orchestrator's own snapshot persistence,
    // because we need the snapshot id back to link to the inventory row)
    const snapshotResult = await this.snapshotService.saveSnapshot(
      report,
      this.supabase,
    );

    // Build the inventory update payload
    const updateData: Record<string, unknown> = {
      audit_score: report.overallScore,
      audit_snapshot_id: snapshotResult.id,
      last_audited_at: new Date().toISOString(),
    };

    // Extract COR score from the costOfRetrieval phase
    // Phase score is 0-100 where 100 = no issues.
    // COR should be 0-100 where 100 = very costly to retrieve (inverted).
    const corPhase = report.phaseResults?.find(p => p.phase === 'costOfRetrieval');
    if (corPhase) {
      updateData.cor_score = Math.round(100 - corPhase.score);
    }

    // Extract CWV assessment from costOfRetrieval findings if not already set
    if (corPhase && !item.cwv_assessment) {
      const cwvFinding = corPhase.findings?.find(f =>
        f.ruleId?.includes('cwv') || f.ruleId?.includes('core-web-vitals')
      );
      if (cwvFinding) {
        if (cwvFinding.severity === 'low') {
          updateData.cwv_assessment = 'good';
        } else if (cwvFinding.severity === 'medium') {
          updateData.cwv_assessment = 'needs-improvement';
        } else if (cwvFinding.severity === 'high' || cwvFinding.severity === 'critical') {
          updateData.cwv_assessment = 'poor';
        }
      }
    }

    // Extract page metadata from the fetched content attached to the report
    const fc = report.fetchedContent;
    if (fc) {
      updateData.page_title = fc.title || null;
      updateData.meta_description = fc.metaDescription || null;
      updateData.headings = fc.headings || null;
      updateData.internal_link_count = fc.internalLinks?.length ?? null;
      updateData.external_link_count = fc.externalLinks?.length ?? null;
      updateData.schema_types =
        fc.schemaMarkup
          ?.map((s: Record<string, unknown>) => s['@type'] as string | undefined)
          .filter(Boolean) ?? null;
      updateData.language = fc.language || null;

      // Extract H1 from headings
      const h1 = fc.headings?.find(h => h.level === 1);
      updateData.page_h1 = h1?.text || null;
    }

    // Persist the update to the site_inventory table
    await this.supabase
      .from('site_inventory')
      .update(updateData)
      .eq('id', item.id);

    // Cache the fetched content in transition_snapshots to avoid re-scraping
    if (fc) {
      await this.cacheContent(item.id, fc);
    }
  }

  // -------------------------------------------------------------------------
  // Backfill COR scores for already-audited items missing cor_score
  // -------------------------------------------------------------------------

  async backfillCorScores(projectId: string, mapId: string): Promise<number> {
    // Find inventory items that have audit data but no COR score
    const { data: items } = await this.supabase
      .from('site_inventory')
      .select('id, audit_snapshot_id')
      .eq('project_id', projectId)
      .not('audit_snapshot_id', 'is', null)
      .is('cor_score', null);

    if (!items || items.length === 0) return 0;

    let backfilled = 0;

    for (const item of items) {
      try {
        // Read the audit snapshot to extract COR phase score
        const { data: snapshot } = await this.supabase
          .from('unified_audit_snapshots')
          .select('report_json')
          .eq('id', item.audit_snapshot_id)
          .maybeSingle();

        if (!snapshot?.report_json) continue;

        const report = typeof snapshot.report_json === 'string'
          ? JSON.parse(snapshot.report_json)
          : snapshot.report_json;

        const corPhase = report.phaseResults?.find(
          (p: { phase?: string }) => p.phase === 'costOfRetrieval'
        );

        if (corPhase && typeof corPhase.score === 'number') {
          const corScore = Math.round(100 - corPhase.score);
          await this.supabase
            .from('site_inventory')
            .update({ cor_score: corScore })
            .eq('id', item.id);
          backfilled++;
        }
      } catch {
        // Non-fatal — continue backfilling other items
      }
    }

    return backfilled;
  }

  // -------------------------------------------------------------------------
  // Content caching — saves fetched content to transition_snapshots
  // -------------------------------------------------------------------------

  private async cacheContent(
    inventoryId: string,
    fc: { semanticText?: string; rawHtml?: string },
  ): Promise<void> {
    const markdown = fc.semanticText || '';
    if (!markdown) return;

    try {
      // Upsert: update existing ORIGINAL_IMPORT snapshot or create one
      const { data: existing } = await this.supabase
        .from('transition_snapshots')
        .select('id')
        .eq('inventory_id', inventoryId)
        .eq('snapshot_type', 'ORIGINAL_IMPORT')
        .maybeSingle();

      if (existing) {
        await this.supabase
          .from('transition_snapshots')
          .update({
            content_markdown: markdown,
            created_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await this.supabase
          .from('transition_snapshots')
          .insert({
            inventory_id: inventoryId,
            content_markdown: markdown,
            snapshot_type: 'ORIGINAL_IMPORT',
          });
      }

      // Mark content as cached on the inventory item
      await this.supabase
        .from('site_inventory')
        .update({ content_cached_at: new Date().toISOString() })
        .eq('id', inventoryId);
    } catch (err) {
      // Content caching is non-fatal — don't break the audit flow
      console.warn('[BatchAuditService] Failed to cache content:', err);
    }
  }
}
