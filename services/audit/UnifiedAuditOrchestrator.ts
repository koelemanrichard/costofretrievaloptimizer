import type { AuditPhase } from './phases/AuditPhase';
import type { ContentFetcher } from './ContentFetcher';
import type { RelatedUrlDiscoverer } from './RelatedUrlDiscoverer';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AuditRequest,
  AuditPhaseResult,
  AuditPhaseName,
  FetchedContent,
  UnifiedAuditReport,
  CannibalizationRisk,
  ContentMergeSuggestion,
  TopicalMapContext,
} from './types';
import { DEFAULT_AUDIT_WEIGHTS } from './types';
import { AuditSnapshotService } from './AuditSnapshotService';

export interface AuditProgressEvent {
  type: 'start' | 'fetching_content' | 'discovering_urls' | 'phase_start' | 'phase_complete' | 'complete';
  phase?: AuditPhaseName;
  progress?: number;
}

export type AuditProgressCallback = (event: AuditProgressEvent) => void;

export interface OrchestratorOptions {
  supabase?: SupabaseClient;
  /** EAVs from the topical map — used for knowledge graph gap detection */
  mapEavs?: Array<{ entity: string; attribute: string; value: string; category?: string }>;
  /** Topical map context injected into all phases for content-aware auditing */
  topicalMapContext?: TopicalMapContext;
}

export class UnifiedAuditOrchestrator {
  private readonly phases: AuditPhase[];
  private readonly contentFetcher?: ContentFetcher;
  private readonly urlDiscoverer?: RelatedUrlDiscoverer;
  private readonly options: OrchestratorOptions;

  constructor(
    phases: AuditPhase[],
    contentFetcher?: ContentFetcher,
    urlDiscoverer?: RelatedUrlDiscoverer,
    options: OrchestratorOptions = {},
  ) {
    this.phases = phases;
    this.contentFetcher = contentFetcher;
    this.urlDiscoverer = urlDiscoverer;
    this.options = options;
  }

  /**
   * Enrich fetched content with field aliases (`html`, `text`) that phases expect,
   * plus topical map context (centralEntity, eavs, etc.) from orchestrator options.
   */
  private enrichContent(fetchedContent?: FetchedContent): Record<string, unknown> | undefined {
    if (!fetchedContent) {
      const ctx = this.options.topicalMapContext;
      return ctx ? { ...ctx } : undefined;
    }
    return {
      ...fetchedContent,
      html: fetchedContent.rawHtml,
      text: fetchedContent.semanticText,
      ...(this.options.topicalMapContext ?? {}),
    };
  }

  async runAudit(
    request: AuditRequest,
    onProgress?: AuditProgressCallback
  ): Promise<UnifiedAuditReport> {
    const startTime = Date.now();

    onProgress?.({ type: 'start', progress: 0 });

    // Fetch content when URL is provided and fetcher is available
    let fetchedContent: FetchedContent | undefined;

    if (request.url && this.contentFetcher) {
      onProgress?.({ type: 'fetching_content', progress: 0 });
      try {
        fetchedContent = await this.contentFetcher.fetch(request.url, {
          preferredProvider: request.scrapingProvider,
          fallbackEnabled: true,
        });
      } catch {
        // Content fetch failure is non-fatal — phases run without content
      }
    }

    // Discover related URLs if URL discoverer is available and no relatedUrls already set
    if (request.url && this.urlDiscoverer && !request.relatedUrls?.length) {
      onProgress?.({ type: 'discovering_urls', progress: 0 });
      try {
        const discovered = await this.urlDiscoverer.discover(
          request.url,
          fetchedContent?.rawHtml,
          10
        );
        request = { ...request, relatedUrls: discovered.map(d => d.url) };
      } catch {
        // URL discovery failure is non-fatal
      }
    }

    const enrichedContent = this.enrichContent(fetchedContent);

    const phaseResults: AuditPhaseResult[] = [];
    const totalPhases = this.phases.length;

    for (let i = 0; i < totalPhases; i++) {
      const phase = this.phases[i];
      const phaseName = phase.phaseName;

      onProgress?.({
        type: 'phase_start',
        phase: phaseName,
        progress: i / totalPhases,
      });

      let result: AuditPhaseResult;

      try {
        result = await phase.execute(request, enrichedContent);
      } catch {
        // Phase failed: produce a zero-score result with an error finding
        result = {
          phase: phaseName,
          score: 0,
          weight: 0,
          passedChecks: 0,
          totalChecks: 0,
          findings: [],
          summary: `Phase "${phaseName}" failed with an error.`,
        };
      }

      // Apply weight from custom weights or defaults
      const weights = request.customWeights ?? DEFAULT_AUDIT_WEIGHTS;
      result.weight = weights[phaseName] ?? DEFAULT_AUDIT_WEIGHTS[phaseName] ?? 0;

      phaseResults.push(result);

      onProgress?.({
        type: 'phase_complete',
        phase: phaseName,
        progress: (i + 1) / totalPhases,
      });
    }

    const overallScore = this.calculateWeightedScore(phaseResults);

    // Extract cannibalization risks from SemanticDistance phase findings
    const cannibalizationRisks = this.extractCannibalizationRisks(phaseResults);

    // Detect content merge suggestions from related URLs
    const contentMergeSuggestions = this.detectMergeSuggestions(
      phaseResults,
      request.url,
      request.relatedUrls,
    );

    // Detect missing knowledge graph topics from EAV phase
    const missingKnowledgeGraphTopics = this.detectMissingKgTopics(
      phaseResults,
      fetchedContent,
    );

    onProgress?.({ type: 'complete', progress: 1 });

    const report: UnifiedAuditReport = {
      id: crypto.randomUUID(),
      projectId: request.projectId,
      auditType: request.type,
      url: request.url,
      overallScore,
      phaseResults,
      contentMergeSuggestions,
      missingKnowledgeGraphTopics,
      cannibalizationRisks,
      language: request.language,
      version: 1,
      createdAt: new Date().toISOString(),
      auditDurationMs: Date.now() - startTime,
      prerequisitesMet: {
        businessInfo: true,
        pillars: true,
        eavs: true,
      },
    };

    // Persist snapshot if Supabase client is available
    if (this.options.supabase) {
      try {
        const snapshotService = new AuditSnapshotService();
        await snapshotService.saveSnapshot(
          report,
          this.options.supabase,
          request.topicId,
        );
      } catch {
        // Snapshot persistence failure is non-fatal — audit still returns
      }
    }

    return report;
  }

  private calculateWeightedScore(phaseResults: AuditPhaseResult[]): number {
    const totalWeight = phaseResults.reduce((sum, r) => sum + r.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = phaseResults.reduce(
      (sum, r) => sum + r.score * r.weight,
      0
    );

    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  /**
   * Extract cannibalization risks from SemanticDistance phase findings.
   * Findings with ruleId 'rule-203' and severity 'high' indicate cannibalization.
   */
  private extractCannibalizationRisks(
    phaseResults: AuditPhaseResult[]
  ): CannibalizationRisk[] {
    const semanticPhase = phaseResults.find(
      (pr) => pr.phase === 'semanticDistance'
    );
    if (!semanticPhase) return [];

    const risks: CannibalizationRisk[] = [];
    for (const finding of semanticPhase.findings) {
      if (finding.ruleId !== 'rule-203') continue;

      // Extract topic and URL from finding description
      const topicMatch = finding.description.match(/Topic "([^"]+)"/);
      const urlMatch = finding.affectedElement;
      const distanceMatch = finding.description.match(
        /semantic distance of (\d+\.\d+)/
      );
      const otherTopicMatch = finding.description.match(/to "([^"]+)"/);

      const sharedEntity = topicMatch?.[1] ?? 'Unknown topic';
      const otherTopic = otherTopicMatch?.[1] ?? '';
      const sharedKeywords = [sharedEntity, otherTopic].filter(Boolean);

      risks.push({
        urls: urlMatch ? [urlMatch] : [],
        sharedEntity,
        sharedKeywords,
        severity:
          finding.severity === 'critical' || finding.severity === 'high'
            ? 'high'
            : finding.severity === 'medium'
              ? 'medium'
              : 'low',
        recommendation: finding.exampleFix ?? finding.description,
      });
    }

    return risks;
  }

  /**
   * Detect content merge suggestions by analyzing overlap between the
   * audited URL and its related URLs using findings from relevant phases.
   */
  private detectMergeSuggestions(
    phaseResults: AuditPhaseResult[],
    mainUrl?: string,
    relatedUrls?: string[],
  ): ContentMergeSuggestion[] {
    if (!mainUrl || !relatedUrls?.length) return [];

    const suggestions: ContentMergeSuggestion[] = [];

    // Use semantic distance findings to detect pages that should be merged
    const semanticPhase = phaseResults.find(
      (pr) => pr.phase === 'semanticDistance'
    );
    if (!semanticPhase) return suggestions;

    for (const finding of semanticPhase.findings) {
      if (finding.ruleId !== 'rule-203') continue;

      const distanceMatch = finding.description.match(
        /semantic distance of (\d+\.\d+)/
      );
      const distance = distanceMatch ? parseFloat(distanceMatch[1]) : 1;
      const overlapPercentage = Math.round((1 - distance) * 100);
      const targetUrl = finding.affectedElement ?? '';

      if (distance < 0.2 && targetUrl) {
        suggestions.push({
          sourceUrl: mainUrl,
          targetUrl,
          overlapPercentage,
          reason: finding.description,
          suggestedAction: 'merge',
        });
      } else if (distance < 0.3 && targetUrl) {
        suggestions.push({
          sourceUrl: mainUrl,
          targetUrl,
          overlapPercentage,
          reason: finding.description,
          suggestedAction: 'differentiate',
        });
      }
    }

    return suggestions;
  }

  /**
   * Detect missing knowledge graph topics by comparing EAV coverage
   * from the map against what was found in the content.
   */
  private detectMissingKgTopics(
    phaseResults: AuditPhaseResult[],
    content?: FetchedContent,
  ): string[] {
    const mapEavs = this.options.mapEavs;
    if (!mapEavs?.length || !content) return [];

    const contentText = (content.semanticText || '').toLowerCase();
    const missing: string[] = [];

    // Check which map EAV entities/attributes are not mentioned in content
    for (const eav of mapEavs) {
      const entityLower = eav.entity.toLowerCase();
      const attrLower = eav.attribute.toLowerCase();

      // Only flag ROOT and UNIQUE category EAVs as missing KG topics
      if (eav.category && !['ROOT', 'UNIQUE'].includes(eav.category)) continue;

      if (!contentText.includes(entityLower) && !contentText.includes(attrLower)) {
        const topicLabel = `${eav.entity} — ${eav.attribute}`;
        if (!missing.includes(topicLabel)) {
          missing.push(topicLabel);
        }
      }
    }

    // Also look for EAV system phase findings about missing coverage
    const eavPhase = phaseResults.find((pr) => pr.phase === 'eavSystem');
    if (eavPhase) {
      for (const finding of eavPhase.findings) {
        if (
          finding.ruleId.includes('coverage') ||
          finding.ruleId.includes('missing')
        ) {
          const label = finding.affectedElement ?? finding.title;
          if (label && !missing.includes(label)) {
            missing.push(label);
          }
        }
      }
    }

    return missing;
  }
}
