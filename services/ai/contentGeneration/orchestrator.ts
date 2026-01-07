// services/ai/contentGeneration/orchestrator.ts
import { getSupabaseClient } from '../../supabaseClient';
import { ContentGenerationJob, ContentGenerationSection, ContentBrief, PassesStatus, SectionDefinition, PASS_NAMES, ImagePlaceholder } from '../../../types';
import { performanceLogger, setCurrentJobId } from '../../performanceLogger';

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
        image_placeholders: placeholders as unknown as Record<string, unknown>[],
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

  async getSections(jobId: string): Promise<ContentGenerationSection[]> {
    const { data, error } = await this.supabase
      .from('content_generation_sections')
      .select('*')
      .eq('job_id', jobId)
      .order('section_order', { ascending: true });

    if (error) throw new Error(`Failed to get sections: ${error.message}`);
    return (data || []) as ContentGenerationSection[];
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
    const passWeight = 100 / 9; // 9 passes total including schema generation
    let progress = 0;

    // Count completed passes
    const passesStatus = job.passes_status;

    // Defensive null check - prevents crash when passes_status is null/undefined
    if (!passesStatus || typeof passesStatus !== 'object') {
      console.warn('[Orchestrator] calculateProgress: passes_status is null/undefined for job', job.id);
      return 0;
    }

    const passKeys = Object.keys(passesStatus) as (keyof PassesStatus)[];

    for (let i = 0; i < passKeys.length; i++) {
      if (passesStatus[passKeys[i]] === 'completed') {
        progress += passWeight;
      } else if (passesStatus[passKeys[i]] === 'in_progress') {
        // For pass 1, calculate section progress
        if (i === 0 && job.total_sections && job.total_sections > 0) {
          const sectionProgress = (job.completed_sections / job.total_sections) * passWeight;
          progress += sectionProgress;
        } else {
          // For other passes, assume 50% if in progress
          progress += passWeight * 0.5;
        }
        break;
      } else {
        break;
      }
    }

    return Math.round(progress);
  }

  parseSectionsFromBrief(brief: ContentBrief): SectionDefinition[] {
    const sections: SectionDefinition[] = [];

    // Add introduction with topic-aware heading (avoid generic "Introduction")
    // Priority: targetKeyword > title > fallback
    const introHeading = brief.targetKeyword
      ? `Wat is ${brief.targetKeyword}`
      : brief.title
        ? `${brief.title}: Een Overzicht`
        : 'Introductie';

    sections.push({
      key: 'intro',
      heading: introHeading,
      level: 2,
      order: 0,
      subordinateTextHint: brief.metaDescription
    });

    // Parse structured_outline if available
    if (brief.structured_outline && brief.structured_outline.length > 0) {
      brief.structured_outline.forEach((section, idx) => {
        sections.push({
          key: `section_${idx + 1}`,
          heading: section.heading,
          level: section.level || 2,
          order: idx + 1,
          subordinateTextHint: section.subordinate_text_hint,
          methodologyNote: section.methodology_note
        });

        // Add subsections if present
        if (section.subsections) {
          section.subsections.forEach((sub, subIdx) => {
            sections.push({
              key: `section_${idx + 1}_sub_${subIdx + 1}`,
              heading: sub.heading,
              level: 3,
              order: idx + 1 + (subIdx + 1) * 0.1,
              subordinateTextHint: sub.subordinate_text_hint
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
          sections.push({
            key: `section_${idx + 1}`,
            heading: match[2].trim(),
            level: match[1].length,
            order: idx + 1
          });
        }
      });
    }

    // Add conclusion with topic-aware heading (avoid generic "Conclusion")
    // Priority: targetKeyword > title > fallback
    const conclusionHeading = brief.targetKeyword
      ? `Conclusie: ${brief.targetKeyword} Samengevat`
      : brief.title
        ? `Samenvatting: ${brief.title}`
        : 'Conclusie';

    sections.push({
      key: 'conclusion',
      heading: conclusionHeading,
      level: 2,
      order: 999
    });

    return sections.sort((a, b) => a.order - b.order);
  }

  async assembleDraft(jobId: string): Promise<string> {
    const event = performanceLogger.startEvent('ASSEMBLY', 'assembleDraft');

    try {
      const sections = await this.getSections(jobId);

      const result = sections
        .sort((a, b) => a.section_order - b.section_order)
        .map(s => {
          const content = (s.current_content || '').trim();
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

      performanceLogger.endEvent(event.id);
      return result;
    } catch (error) {
      performanceLogger.failEvent(event.id, error instanceof Error ? error.name : 'UNKNOWN');
      throw error;
    }
  }
}
