// services/ai/contentGeneration/orchestrator.ts
import { getSupabaseClient } from '../../supabaseClient';
import { ContentGenerationJob, ContentGenerationSection, ContentBrief, PassesStatus, SectionDefinition, PASS_NAMES, ImagePlaceholder, ContextualBridgeLink, ContextualBridgeSection } from '../../../types';
import { performanceLogger, setCurrentJobId } from '../../performanceLogger';
import { Json } from '../../../database.types';
import { deduplicateContent, stripH1FromMarkdown, validateContentForExport } from './contentValidator';
import { slugify } from '../../../utils/helpers';

/**
 * Extract contextual bridge links from a ContentBrief
 * Handles both legacy array format and new section format
 */
function extractContextualBridgeLinks(brief: ContentBrief): ContextualBridgeLink[] {
  const links: ContextualBridgeLink[] = [];

  // Extract from contextualBridge
  if (brief.contextualBridge) {
    if (Array.isArray(brief.contextualBridge)) {
      links.push(...brief.contextualBridge);
    } else if (brief.contextualBridge.type === 'section' && brief.contextualBridge.links) {
      links.push(...brief.contextualBridge.links);
    }
  }

  // Extract from suggested_internal_links (newer format)
  if (brief.suggested_internal_links && brief.suggested_internal_links.length > 0) {
    for (const suggestion of brief.suggested_internal_links) {
      const anchorText = suggestion.anchor_text || suggestion.anchor || '';
      const isDuplicate = links.some(l =>
        l.anchorText.toLowerCase() === anchorText.toLowerCase()
      );

      if (!isDuplicate && anchorText) {
        links.push({
          targetTopic: suggestion.url || suggestion.title || suggestion.anchor || '',
          anchorText,
          reasoning: suggestion.title ? `Related: ${suggestion.title}` : 'Related topic',
          annotation_text_hint: undefined
        });
      }
    }
  }

  return links;
}

/**
 * Topic data with optional brief information for annotation text
 */
interface TopicWithBrief {
  title: string;
  slug?: string;
  brief?: {
    metaDescription?: string;
    keyTakeaways?: string[];
  };
}

/**
 * Generate fallback links from topic titles when contextualBridge is empty
 * Uses the article title to find semantically related topics
 *
 * Per Semantic SEO: Annotation text must explain relevance to the reader.
 * We use the target topic's brief metaDescription as the annotation text
 * since it describes what that topic covers.
 */
function generateFallbackLinks(
  articleTitle: string,
  relatedTopics: Array<TopicWithBrief>
): ContextualBridgeLink[] {
  if (!relatedTopics || relatedTopics.length === 0) return [];

  // Filter out the current article and create links
  return relatedTopics
    .filter(t => t.title.toLowerCase() !== articleTitle.toLowerCase())
    .slice(0, 5)
    .map(t => {
      // Use the brief's metaDescription as annotation text if available
      // This provides semantic context about what the target page covers
      let annotationText: string | undefined;

      if (t.brief?.metaDescription) {
        // Use meta description - it's written to describe the page
        annotationText = t.brief.metaDescription;
      } else if (t.brief?.keyTakeaways && t.brief.keyTakeaways.length > 0) {
        // Fallback to first key takeaway
        annotationText = t.brief.keyTakeaways[0];
      }

      return {
        targetTopic: t.title,
        anchorText: t.title.length > 40 ? t.title.substring(0, 37) + '...' : t.title,
        reasoning: annotationText || 'Related topic',
        annotation_text_hint: annotationText
      };
    });
}

/**
 * Generate a semantically correct "Related Topics" section with proper Contextual Bridges
 *
 * Per Semantic SEO framework requirements:
 * - Links must have annotation text explaining relevance
 * - A Contextual Bridge must justify the transition
 * - Surrounding text must semantically support the link
 * - Target entity must be mentioned near the anchor
 *
 * Falls back to map topics if brief doesn't have links.
 * When using fallback topics, we use their brief's metaDescription as annotation text.
 */
function generateRelatedTopicsSection(
  brief: ContentBrief,
  language?: string,
  fallbackTopics?: Array<TopicWithBrief>,
  centralEntity?: string
): string {
  let links = extractContextualBridgeLinks(brief);

  // If no links from brief, try fallback topics from the map
  if (links.length === 0 && fallbackTopics && fallbackTopics.length > 0) {
    links = generateFallbackLinks(brief.title || '', fallbackTopics);
    if (links.length > 0) {
      console.log(`[assembleDraft] Using ${links.length} fallback links from map topics (brief had no contextualBridge)`);
    }
  }

  if (links.length === 0) return '';

  // Limit to 5 links for the Related Topics section
  const topLinks = links.slice(0, 5);

  const entity = centralEntity || brief.title || 'topic';

  // Check if brief has a custom contextual bridge content defined
  // This allows AI-generated bridge content from brief generation to be used
  let sectionHeading: string | null = null;
  let bridgeText: string | null = null;

  if (brief.contextualBridge && typeof brief.contextualBridge === 'object' && !Array.isArray(brief.contextualBridge)) {
    const bridgeSection = brief.contextualBridge as ContextualBridgeSection;
    // Use the content field as bridge text if available
    if (bridgeSection.content && bridgeSection.content.trim()) {
      bridgeText = bridgeSection.content;
    }
    // Check for extended properties that may be added dynamically
    const extendedBridge = bridgeSection as ContextualBridgeSection & { heading?: string };
    if (extendedBridge.heading) {
      sectionHeading = extendedBridge.heading;
    }
  }

  // If no custom heading, use the entity itself as heading (most semantic approach)
  // The entity IS the topic - no need for template prefixes like "Continue Exploring"
  // This follows Semantic SEO: the heading should BE the entity or directly relate to it
  if (!sectionHeading) {
    // Use the entity directly - the simplest, most semantic heading
    // The list of links provides the "related topics" context
    sectionHeading = entity;
  }

  // Build Contextual Bridge section per Semantic SEO requirements:
  // 1. Section heading that signals relationship to central entity
  // 2. Bridge paragraph that justifies the transition (annotation text) - if available
  // 3. Links with proper context
  let section = `\n\n## ${sectionHeading}\n\n`;

  // Add contextual bridge paragraph only if we have a custom one
  // Avoid generic boilerplate bridge text - it's not semantically valuable
  if (bridgeText) {
    section += `${bridgeText}\n\n`;
  }

  for (const link of topLinks) {
    // Generate a URL-safe slug for the topic
    const slug = slugify(link.targetTopic);
    const url = `/topics/${slug}`;

    // Check for meaningful annotation text
    const hasReasoning = link.reasoning &&
                         !link.reasoning.startsWith('Related') &&
                         link.reasoning.length > 10;
    const annotationHint = link.annotation_text_hint || '';

    if (hasReasoning || annotationHint) {
      // Use the provided reasoning/annotation as contextual bridge
      // Format: **Topic**: Context with [anchor text](url)
      // No template-like "Learn more about" - just use the anchor directly
      const context = annotationHint || link.reasoning;
      section += `- **${link.targetTopic}**: ${context} — [${link.anchorText}](${url})\n`;
    } else {
      // No annotation available - use clean link format without boilerplate
      // The entity heading provides context; fake annotation text hurts SEO
      section += `- [${link.targetTopic}](${url})\n`;
    }
  }

  return section;
}

export interface OrchestratorCallbacks {
  onPassStart: (passNumber: number, passName: string) => void;
  onPassComplete: (passNumber: number) => void;
  onSectionStart: (sectionKey: string, sectionHeading: string) => void;
  onSectionComplete: (sectionKey: string) => void;
  onError: (error: Error, context: string) => void;
  onJobComplete: (auditScore: number) => void;
}

export class ContentGenerationOrchestrator {
  private supabaseUrl: string;
  private supabaseKey: string;
  private callbacks: OrchestratorCallbacks;
  private abortController: AbortController;

  /**
   * In-memory cache of sections per job to reduce database queries.
   * Key: jobId, Value: { sections, timestamp }
   */
  private sectionCache: Map<string, {
    sections: ContentGenerationSection[];
    timestamp: number;
  }> = new Map();

  /**
   * Cache TTL in milliseconds (30 seconds)
   */
  private readonly SECTION_CACHE_TTL = 30000;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    callbacks: OrchestratorCallbacks
  ) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.callbacks = callbacks;
    this.abortController = new AbortController();
  }

  private get supabase() {
    return getSupabaseClient(this.supabaseUrl, this.supabaseKey);
  }

  async createJob(briefId: string, mapId: string, userId: string): Promise<ContentGenerationJob> {
    const event = performanceLogger.startEvent('OTHER', 'createJob');

    try {
      const { data, error } = await this.supabase
        .from('content_generation_jobs')
        .insert({
          brief_id: briefId,
          map_id: mapId,
          user_id: userId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        // Handle 409 Conflict - there's already an active job for this brief
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          console.warn('[Orchestrator] Job creation conflict - checking for existing active job');

          // Try to find the existing active job
          const existingJob = await this.getExistingJob(briefId);
          if (existingJob) {
            console.log('[Orchestrator] Found existing active job:', existingJob.id, 'status:', existingJob.status);

            // If it's an old pending job (stuck), cancel it and retry
            if (existingJob.status === 'pending') {
              console.log('[Orchestrator] Cancelling stale pending job');
              await this.updateJob(existingJob.id, { status: 'cancelled' });
              // Retry creation
              performanceLogger.endEvent(event.id);
              return this.createJob(briefId, mapId, userId);
            }

            // Return the existing job so caller can decide what to do
            setCurrentJobId(existingJob.id);
            performanceLogger.endEvent(event.id);
            return existingJob;
          }

          // No active job found but still got conflict - might be a completed/failed job
          // Try to clean up and retry
          const latestJob = await this.getLatestJob(briefId);
          if (latestJob) {
            console.log('[Orchestrator] Found blocking job:', latestJob.id, 'status:', latestJob.status);
            await this.deleteJob(latestJob.id);
            // Retry creation
            performanceLogger.endEvent(event.id);
            return this.createJob(briefId, mapId, userId);
          }
        }

        throw new Error(`Failed to create job: ${error.message}`);
      }

      const job = data as unknown as ContentGenerationJob;
      setCurrentJobId(job.id);
      performanceLogger.endEvent(event.id);
      return job;
    } catch (error) {
      performanceLogger.failEvent(event.id, error instanceof Error ? error.name : 'UNKNOWN');
      throw error;
    }
  }

  async getExistingJob(briefId: string): Promise<ContentGenerationJob | null> {
    const { data, error } = await this.supabase
      .from('content_generation_jobs')
      .select('*')
      .eq('brief_id', briefId)
      .in('status', ['pending', 'in_progress', 'paused', 'failed'])
      .maybeSingle();

    if (error) throw new Error(`Failed to check existing job: ${error.message}`);
    return data as unknown as ContentGenerationJob | null;
  }

  /**
   * Get the most recent job for a brief, including completed ones
   * Used to restore draft from a previously completed generation
   */
  async getLatestJob(briefId: string): Promise<ContentGenerationJob | null> {
    const { data, error } = await this.supabase
      .from('content_generation_jobs')
      .select('*')
      .eq('brief_id', briefId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Failed to get latest job: ${error.message}`);
    return data as unknown as ContentGenerationJob | null;
  }

  async updateJob(jobId: string, updates: Partial<ContentGenerationJob>): Promise<void> {
    const event = performanceLogger.startEvent('CHECKPOINT', 'updateJob');

    try {
      const { data, error } = await this.supabase
        .from('content_generation_jobs')
        .update({ ...updates, updated_at: new Date().toISOString() } as unknown as Record<string, unknown>)
        .eq('id', jobId)
        .select('id');

      if (error) throw new Error(`Failed to update job: ${error.message}`);

      // Verify the update actually happened (RLS can silently fail)
      if (!data || data.length === 0) {
        console.error('[Orchestrator] Job update returned no rows - likely RLS issue:', jobId);
        throw new Error('Job was not updated - no rows affected. This may be a permissions issue.');
      }

      performanceLogger.endEvent(event.id);
    } catch (error) {
      performanceLogger.failEvent(event.id, error instanceof Error ? error.name : 'UNKNOWN');
      throw error;
    }
  }

  async updateImagePlaceholders(jobId: string, placeholders: ImagePlaceholder[]): Promise<void> {
    const { data, error } = await this.supabase
      .from('content_generation_jobs')
      .update({
        image_placeholders: placeholders as unknown as Json,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select('id');

    if (error) throw new Error(`Failed to update image placeholders: ${error.message}`);

    // Verify the update actually happened
    if (!data || data.length === 0) {
      console.error('[Orchestrator] Image placeholders update returned no rows - likely RLS issue:', jobId);
      throw new Error('Image placeholders were not saved - no rows affected. This may be a permissions issue.');
    }
  }

  async getJob(jobId: string): Promise<ContentGenerationJob | null> {
    const { data, error } = await this.supabase
      .from('content_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw new Error(`Failed to get job: ${error.message}`);
    return data as unknown as ContentGenerationJob;
  }

  /**
   * Lightweight job fetch that excludes draft_content to avoid 502 errors on large jobs.
   * Use this for status checks and pass tracking. Use assembleDraft() to get content.
   */
  async getJobStatus(jobId: string): Promise<ContentGenerationJob | null> {
    const { data, error } = await this.supabase
      .from('content_generation_jobs')
      .select(`
        id, brief_id, map_id, user_id, status, current_pass, passes_status,
        total_sections, completed_sections, audit_details, final_audit_score,
        progressive_schema_data, schema_data, structural_snapshots,
        pass_quality_scores, quality_warning, image_placeholders,
        created_at, updated_at
      `)
      .eq('id', jobId)
      .single();

    if (error) throw new Error(`Failed to get job status: ${error.message}`);
    // Return with empty draft_content - caller should use assembleDraft() if needed
    return { ...(data as unknown as ContentGenerationJob), draft_content: '' };
  }

  /**
   * Gets job status + assembles draft from sections. Use this instead of getJob()
   * when you need both metadata and content but want to avoid large single-query issues.
   */
  async getJobWithDraft(jobId: string): Promise<ContentGenerationJob | null> {
    const [jobStatus, draftContent] = await Promise.all([
      this.getJobStatus(jobId),
      this.assembleDraft(jobId)
    ]);

    if (!jobStatus) return null;
    return { ...jobStatus, draft_content: draftContent };
  }

  /**
   * Fetch sections directly from database (bypasses cache)
   * @internal Use getCachedSections instead for cached access
   */
  private async fetchSectionsFromDb(jobId: string): Promise<ContentGenerationSection[]> {
    const { data, error } = await this.supabase
      .from('content_generation_sections')
      .select('*')
      .eq('job_id', jobId)
      .order('section_order', { ascending: true });

    if (error) throw new Error(`Failed to get sections: ${error.message}`);
    return (data || []) as ContentGenerationSection[];
  }

  /**
   * Get sections from cache if valid, otherwise fetch from database.
   */
  private async getCachedSections(jobId: string, forceFresh = false): Promise<ContentGenerationSection[]> {
    const cached = this.sectionCache.get(jobId);
    const now = Date.now();

    // Return cached if valid and not forcing fresh
    if (!forceFresh && cached && (now - cached.timestamp) < this.SECTION_CACHE_TTL) {
      return cached.sections;
    }

    // Fetch fresh from database
    const sections = await this.fetchSectionsFromDb(jobId);

    // Update cache
    this.sectionCache.set(jobId, {
      sections,
      timestamp: now,
    });

    return sections;
  }

  /**
   * Invalidate section cache for a job (call after writes)
   */
  private invalidateSectionCache(jobId: string): void {
    this.sectionCache.delete(jobId);
  }

  /**
   * Update a single section in cache without full invalidation
   */
  private updateSectionInCache(jobId: string, updatedSection: ContentGenerationSection): void {
    const cached = this.sectionCache.get(jobId);
    if (cached) {
      const index = cached.sections.findIndex(s => s.id === updatedSection.id);
      if (index >= 0) {
        cached.sections[index] = updatedSection;
      } else {
        cached.sections.push(updatedSection);
      }
      cached.timestamp = Date.now();
    }
  }

  /**
   * Get sections for a job (uses cache)
   */
  async getSections(jobId: string): Promise<ContentGenerationSection[]> {
    return this.getCachedSections(jobId);
  }

  async upsertSection(section: Partial<ContentGenerationSection> & { job_id: string; section_key: string }): Promise<void> {
    const event = performanceLogger.startEvent('SECTION', 'upsertSection', {
      sectionId: section.section_key,
      sectionTitle: section.section_heading,
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await this.supabase
        .from('content_generation_sections')
        .upsert(section as any, { onConflict: 'job_id,section_key' });

      if (error) throw new Error(`Failed to upsert section: ${error.message}`);

      // Invalidate cache after successful write
      this.invalidateSectionCache(section.job_id);

      performanceLogger.endEvent(event.id);
    } catch (error) {
      performanceLogger.failEvent(event.id, error instanceof Error ? error.name : 'UNKNOWN');
      throw error;
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    // Use .select() to verify deletion actually happened
    const { data, error } = await this.supabase
      .from('content_generation_jobs')
      .delete()
      .eq('id', jobId)
      .select('id');

    if (error) throw new Error(`Failed to delete job: ${error.message}`);

    // Invalidate section cache for this job
    this.invalidateSectionCache(jobId);

    // Verify the delete actually removed a row (RLS can silently fail)
    if (!data || data.length === 0) {
      console.warn('[Orchestrator] Delete job returned no rows - job may not exist or RLS blocked:', jobId);
      // Don't throw here - the job might already be deleted or never existed
    } else {
      console.log('[Orchestrator] Job deleted successfully:', jobId);
    }
  }

  async pauseJob(jobId: string): Promise<void> {
    await this.updateJob(jobId, { status: 'paused' });
    this.abortController.abort();
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.updateJob(jobId, { status: 'cancelled' });
    this.abortController.abort();
  }

  /**
   * Sync the generated draft to the content_briefs table
   * This makes the draft available in the Article Draft Workspace
   * CRITICAL: This MUST succeed or the user loses their generated content!
   */
  async syncDraftToBrief(briefId: string, draft: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('content_briefs')
      .update({ article_draft: draft })
      .eq('id', briefId)
      .select('id, article_draft');

    if (error) {
      console.error('[Orchestrator] Failed to sync draft to brief:', error);
      throw new Error(`Failed to save article draft: ${error.message}`);
    }

    // CRITICAL: Verify the update actually happened (RLS can silently fail)
    if (!data || data.length === 0) {
      console.error('[Orchestrator] Draft sync returned no rows - likely RLS issue. BriefId:', briefId);
      throw new Error('Article draft was not saved - no rows were updated. This may be a permissions issue.');
    }

    // Verify the draft was actually saved with the expected content
    const savedLength = data[0]?.article_draft?.length || 0;
    const expectedLength = draft.length;

    if (savedLength === 0) {
      console.error('[Orchestrator] Draft sync saved empty content!');
      throw new Error('Article draft was saved as empty - content was lost during save.');
    }

    if (Math.abs(savedLength - expectedLength) > 100) {
      console.warn('[Orchestrator] Draft sync length mismatch:', { expected: expectedLength, saved: savedLength });
      // Don't throw for minor differences, but log warning
    }

    console.log('[Orchestrator] Draft synced to brief successfully:', { briefId, draftLength: savedLength });
  }

  calculateProgress(job: ContentGenerationJob): number {
    const passWeight = 100 / 10; // 10 passes total including final polish and schema generation
    let progress = 0;

    // Count completed passes
    const passesStatus = job.passes_status;

    // Defensive null check - prevents crash when passes_status is null/undefined
    if (!passesStatus || typeof passesStatus !== 'object') {
      console.warn('[Orchestrator] calculateProgress: passes_status is null/undefined for job', job.id);
      return 0;
    }

    // IMPORTANT: Use ORDERED array of pass keys to ensure correct progress calculation
    // Object.keys() order is not guaranteed, which was causing incorrect progress (e.g., 30% at pass 8)
    const orderedPassKeys: (keyof PassesStatus)[] = [
      'pass_1_draft',
      'pass_2_headers',
      'pass_3_lists',
      'pass_4_discourse',
      'pass_5_micro_semantics',
      'pass_6_visual_semantics',
      'pass_7_intro_synthesis',
      'pass_8_final_polish',
      'pass_9_audit',
      'pass_10_schema',
    ];

    for (let i = 0; i < orderedPassKeys.length; i++) {
      const status = passesStatus[orderedPassKeys[i]];

      if (status === 'completed') {
        progress += passWeight;
      } else if (status === 'in_progress') {
        // For pass 1, calculate section progress
        if (i === 0 && job.total_sections && job.total_sections > 0) {
          const sectionProgress = (job.completed_sections / job.total_sections) * passWeight;
          progress += sectionProgress;
        } else {
          // For other passes, assume 50% if in progress
          progress += passWeight * 0.5;
        }
        break; // Stop after the in-progress pass
      }
      // If 'pending' or 'failed', don't add to progress, but continue counting completed passes
    }

    return Math.round(progress);
  }

  /**
   * Parse sections from a content brief
   * @param brief - The content brief
   * @param options - Optional configuration for section parsing
   * @param options.maxSections - Maximum total sections (including intro/conclusion)
   * @param options.language - Language code for i18n (e.g., 'nl', 'en', 'de')
   */
  parseSectionsFromBrief(
    brief: ContentBrief,
    options?: { maxSections?: number; language?: string }
  ): SectionDefinition[] {
    const sections: SectionDefinition[] = [];

    // Patterns to detect intro/conclusion sections in structured_outline
    // These patterns match common headings in multiple languages
    const introPatterns = /^(introduction|intro|what\s+is|overview|getting\s+started|inleiding|wat\s+is|overzicht|einleitung|was\s+ist|überblick|introduction|qu'est-ce|aperçu|introducción|qué\s+es|resumen)/i;
    const conclusionPatterns = /^(conclusion|summary|next\s+steps|final\s+thoughts|key\s+takeaways|wrap\s+up|conclusie|samenvatting|volgende\s+stappen|schlussfolgerung|zusammenfassung|nächste\s+schritte|conclusion|résumé|prochaines\s+étapes|conclusión|resumen|próximos\s+pasos)/i;

    // Check if structured_outline has intro/conclusion sections
    let hasIntroInOutline = false;
    let hasConclusionInOutline = false;
    let introFromOutline: SectionDefinition | null = null;
    let conclusionFromOutline: SectionDefinition | null = null;

    if (brief.structured_outline && brief.structured_outline.length > 0) {
      const firstSection = brief.structured_outline[0];
      const lastSection = brief.structured_outline[brief.structured_outline.length - 1];

      // Check if first section is an introduction
      if (firstSection && introPatterns.test(firstSection.heading || '')) {
        hasIntroInOutline = true;
        introFromOutline = {
          key: 'intro',
          heading: firstSection.heading,
          level: firstSection.level || 2,
          order: 0,
          subordinateTextHint: firstSection.subordinate_text_hint || brief.metaDescription,
          methodologyNote: firstSection.methodology_note,
          section_type: 'introduction'
        };
      }

      // Check if last section is a conclusion (only if different from first)
      if (lastSection && brief.structured_outline.length > 1 && conclusionPatterns.test(lastSection.heading || '')) {
        hasConclusionInOutline = true;
        conclusionFromOutline = {
          key: 'conclusion',
          heading: lastSection.heading,
          level: lastSection.level || 2,
          order: 999,
          subordinateTextHint: lastSection.subordinate_text_hint,
          methodologyNote: lastSection.methodology_note,
          section_type: 'conclusion'
        };
      }
    }

    // Add introduction section
    // If outline has intro, use it; otherwise let AI generate heading
    if (introFromOutline) {
      sections.push(introFromOutline);
    } else {
      // NO HARDCODED HEADINGS - let AI generate contextually appropriate heading
      // The placeholder tells the prompt builder to instruct AI to generate heading
      const topic = brief.targetKeyword || brief.title || 'topic';
      sections.push({
        key: 'intro',
        heading: `[GENERATE_HEADING:introduction:${topic}]`, // Placeholder for AI-generated heading
        level: 2,
        order: 0,
        subordinateTextHint: brief.metaDescription,
        section_type: 'introduction',
        generateHeading: true
      });
    }

    // Parse body sections from structured_outline
    const bodySections: SectionDefinition[] = [];
    if (brief.structured_outline && brief.structured_outline.length > 0) {
      brief.structured_outline.forEach((section, idx) => {
        // Skip if this section was already added as intro or conclusion
        if (hasIntroInOutline && idx === 0) return;
        if (hasConclusionInOutline && idx === brief.structured_outline!.length - 1) return;

        bodySections.push({
          key: `section_${idx + 1}`,
          heading: section.heading,
          level: section.level || 2,
          order: idx + 1,
          subordinateTextHint: section.subordinate_text_hint,
          methodologyNote: section.methodology_note,
          section_type: 'body'
        });

        // Add subsections if present
        if (section.subsections) {
          section.subsections.forEach((sub, subIdx) => {
            bodySections.push({
              key: `section_${idx + 1}_sub_${subIdx + 1}`,
              heading: sub.heading,
              level: 3,
              order: idx + 1 + (subIdx + 1) * 0.1,
              subordinateTextHint: sub.subordinate_text_hint,
              section_type: 'body'
            });
          });
        }
      });
    } else {
      // Fallback: parse from outline string
      const lines = (brief.outline || '').split('\n').filter(l => l.trim());
      lines.forEach((line, idx) => {
        const match = line.match(/^(#{2,3})\s*(.+)/);
        if (match) {
          bodySections.push({
            key: `section_${idx + 1}`,
            heading: match[2].trim(),
            level: match[1].length,
            order: idx + 1,
            section_type: 'body'
          });
        }
      });
    }

    // Apply maxSections limit if specified (accounting for intro + conclusion = 2 reserved)
    if (options?.maxSections && options.maxSections > 2) {
      const maxBodySections = options.maxSections - 2; // Reserve spots for intro & conclusion
      if (bodySections.length > maxBodySections) {
        console.log(`[Orchestrator] Limiting sections: ${bodySections.length} → ${maxBodySections} body sections (maxSections: ${options.maxSections})`);
        // Keep only the first N body sections (which are already importance-ordered)
        bodySections.splice(maxBodySections);
      }
    }

    // Add limited body sections
    sections.push(...bodySections);

    // Add conclusion section
    // If outline has conclusion, use it; otherwise let AI generate heading
    if (conclusionFromOutline) {
      sections.push(conclusionFromOutline);
    } else {
      // NO HARDCODED HEADINGS - let AI generate contextually appropriate heading
      const topic = brief.targetKeyword || brief.title || 'topic';
      sections.push({
        key: 'conclusion',
        heading: `[GENERATE_HEADING:conclusion:${topic}]`, // Placeholder for AI-generated heading
        level: 2,
        order: 999,
        section_type: 'conclusion',
        generateHeading: true
      });
    }

    return sections.sort((a, b) => a.order - b.order);
  }

  async assembleDraft(jobId: string): Promise<string> {
    const event = performanceLogger.startEvent('ASSEMBLY', 'assembleDraft');

    try {
      // Get job and full brief to include H1 title and contextual bridge links
      const job = await this.getJob(jobId);
      let articleTitle: string | null = null;
      let fullBrief: ContentBrief | null = null;
      let briefLanguage: string | undefined;

      if (job?.brief_id) {
        const { data: brief } = await this.supabase
          .from('content_briefs')
          .select('*')
          .eq('id', job.brief_id)
          .single();

        if (brief) {
          articleTitle = brief.title || null;
          // Cast through unknown since DB schema may differ slightly from ContentBrief interface
          fullBrief = brief as unknown as ContentBrief;
          // Language field may exist on DB record
          briefLanguage = (brief as Record<string, unknown>).language as string | undefined;
        }
      }

      // Fallback: Get language from map's business_info if not in brief
      if (!briefLanguage && job?.map_id) {
        const { data: map } = await this.supabase
          .from('topical_maps')
          .select('business_info')
          .eq('id', job.map_id)
          .single();

        if (map?.business_info) {
          const businessInfo = map.business_info as Record<string, unknown>;
          briefLanguage = (businessInfo.language as string) || undefined;
          if (briefLanguage) {
            console.log(`[assembleDraft] Language from map business_info: ${briefLanguage}`);
          }
        }
      }

      const sections = await this.getSections(jobId);

      // DEDUPLICATION STEP 1: Deduplicate by section_key (keep latest version by updated_at)
      const uniqueSections = new Map<string, ContentGenerationSection>();
      for (const section of sections) {
        const existing = uniqueSections.get(section.section_key);
        if (!existing) {
          uniqueSections.set(section.section_key, section);
        } else {
          // Keep the one with the later updated_at timestamp
          const existingDate = new Date(existing.updated_at || 0);
          const currentDate = new Date(section.updated_at || 0);
          if (currentDate > existingDate) {
            console.warn(`[assembleDraft] Duplicate section_key detected: ${section.section_key}. Keeping latest version.`);
            uniqueSections.set(section.section_key, section);
          }
        }
      }

      if (uniqueSections.size < sections.length) {
        console.warn(`[assembleDraft] Deduplicated ${sections.length - uniqueSections.size} duplicate sections by key`);
      }

      // DEDUPLICATION STEP 2: Detect content duplication across different sections
      const sortedSections = [...uniqueSections.values()].sort((a, b) => a.section_order - b.section_order);
      const contentFingerprints = new Map<string, string>(); // fingerprint -> section_key

      for (const section of sortedSections) {
        const content = (section.current_content || '').trim();
        if (content.length < 200) continue; // Skip short sections

        // Create a fingerprint from the first 200 chars (ignoring whitespace variations)
        const fingerprint = content.substring(0, 200).replace(/\s+/g, ' ').toLowerCase();

        const existingKey = contentFingerprints.get(fingerprint);
        if (existingKey) {
          console.error(`[assembleDraft] DUPLICATE CONTENT DETECTED: Section "${section.section_key}" has same content as "${existingKey}"`);
          // Don't remove - just warn. The fix should be in the generation, not here.
        } else {
          contentFingerprints.set(fingerprint, section.section_key);
        }
      }

      // Build draft with deduplicated sections
      const sectionContent = sortedSections
        .map(s => {
          // Strip any H1 from section content (H1 will be added from title)
          let content = stripH1FromMarkdown((s.current_content || '').trim());
          const expectedHeading = s.section_level === 2 ? `## ${s.section_heading}` : `### ${s.section_heading}`;

          // Check if content already starts with a markdown heading (## or ###)
          // This prevents duplicate headers when passes add headings to content
          const headingPattern = /^#{2,3}\s+/;
          if (headingPattern.test(content)) {
            // Content already has a heading - use as-is
            return content;
          }

          // No heading in content - add it
          return `${expectedHeading}\n\n${content}`;
        })
        .join('\n\n');

      // Assemble final draft with H1 title at the start
      const parts: string[] = [];

      // Add H1 from brief title (ensures H1 is always present in output)
      if (articleTitle) {
        parts.push(`# ${articleTitle}`);
      }

      // Add section content
      if (sectionContent) {
        parts.push(sectionContent);
      }

      // Add Related Topics section from contextual bridge links
      // This ensures internal links are always present in the final content
      if (fullBrief) {
        // Check if brief has links - if not, fetch fallback topics from the map
        const briefLinks = extractContextualBridgeLinks(fullBrief);
        let fallbackTopics: Array<TopicWithBrief> = [];
        let centralEntity: string | undefined;

        if (job?.map_id) {
          // Fetch central entity from the topical map for better contextual bridges
          const { data: mapData } = await this.supabase
            .from('topical_maps')
            .select('pillars')
            .eq('id', job.map_id)
            .single();

          if (mapData?.pillars) {
            const pillars = mapData.pillars as Record<string, unknown>;
            centralEntity = pillars.centralEntity as string | undefined;
          }

          // Fetch topics from the same map to use as fallbacks if no links in brief
          // Also fetch their content briefs to get annotation text (metaDescription)
          if (briefLinks.length === 0) {
            const { data: mapTopics } = await this.supabase
              .from('topics')
              .select('id, title, slug')
              .eq('map_id', job.map_id)
              .limit(10);

            if (mapTopics && mapTopics.length > 0) {
              // Fetch content briefs for these topics to get metaDescription for annotation text
              const topicIds = mapTopics.map(t => t.id);
              const { data: topicBriefs } = await this.supabase
                .from('content_briefs')
                .select('topic_id, meta_description, key_takeaways')
                .in('topic_id', topicIds);

              // Create a map of topic_id to brief data
              const briefsByTopicId = new Map<string, { metaDescription?: string; keyTakeaways?: string[] }>();
              if (topicBriefs) {
                for (const brief of topicBriefs) {
                  briefsByTopicId.set(brief.topic_id, {
                    metaDescription: brief.meta_description ?? undefined,
                    keyTakeaways: (brief.key_takeaways as string[] | null) ?? undefined,
                  });
                }
              }

              // Merge topic data with brief data
              fallbackTopics = mapTopics.map(t => ({
                title: t.title,
                slug: t.slug,
                brief: briefsByTopicId.get(t.id)
              }));

              console.log(`[assembleDraft] Fetched ${briefsByTopicId.size} briefs for ${mapTopics.length} fallback topics`);
            }
          }
        }

        const relatedTopicsSection = generateRelatedTopicsSection(
          fullBrief,
          briefLanguage,
          fallbackTopics,
          centralEntity
        );
        if (relatedTopicsSection) {
          parts.push(relatedTopicsSection);
        }
      }

      let result = parts.join('\n\n');

      // DEDUPLICATION STEP 3: Run content-level deduplication on the assembled draft
      // This catches duplicate paragraphs that made it through the section-level checks
      const dedupResult = deduplicateContent(result);
      if (dedupResult.removedCount > 0) {
        console.warn(`[assembleDraft] Content deduplication removed ${dedupResult.removedCount} duplicate(s)`);
        dedupResult.log.forEach(msg => console.log(msg));
        result = dedupResult.content;
      }

      // Validate final content and log any remaining issues
      const validation = validateContentForExport(result);
      if (!validation.valid) {
        console.warn(`[assembleDraft] Content validation warnings:`, validation.issues);
      }

      performanceLogger.endEvent(event.id);
      return result;
    } catch (error) {
      performanceLogger.failEvent(event.id, error instanceof Error ? error.name : 'UNKNOWN');
      throw error;
    }
  }
}
