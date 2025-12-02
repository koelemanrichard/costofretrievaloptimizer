// services/ai/contentGeneration/orchestrator.ts
import { getSupabaseClient } from '../../supabaseClient';
import { ContentGenerationJob, ContentGenerationSection, ContentBrief, PassesStatus, SectionDefinition, PASS_NAMES } from '../../../types';

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

    if (error) throw new Error(`Failed to create job: ${error.message}`);
    return data as ContentGenerationJob;
  }

  async getExistingJob(briefId: string): Promise<ContentGenerationJob | null> {
    const { data, error } = await this.supabase
      .from('content_generation_jobs')
      .select('*')
      .eq('brief_id', briefId)
      .in('status', ['pending', 'in_progress', 'paused', 'failed'])
      .maybeSingle();

    if (error) throw new Error(`Failed to check existing job: ${error.message}`);
    return data as ContentGenerationJob | null;
  }

  async updateJob(jobId: string, updates: Partial<ContentGenerationJob>): Promise<void> {
    const { error } = await this.supabase
      .from('content_generation_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (error) throw new Error(`Failed to update job: ${error.message}`);
  }

  async getJob(jobId: string): Promise<ContentGenerationJob | null> {
    const { data, error } = await this.supabase
      .from('content_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw new Error(`Failed to get job: ${error.message}`);
    return data as ContentGenerationJob;
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
    const { error } = await this.supabase
      .from('content_generation_sections')
      .upsert(section, { onConflict: 'job_id,section_key' });

    if (error) throw new Error(`Failed to upsert section: ${error.message}`);
  }

  async deleteJob(jobId: string): Promise<void> {
    const { error } = await this.supabase
      .from('content_generation_jobs')
      .delete()
      .eq('id', jobId);

    if (error) throw new Error(`Failed to delete job: ${error.message}`);
  }

  async pauseJob(jobId: string): Promise<void> {
    await this.updateJob(jobId, { status: 'paused' });
    this.abortController.abort();
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.updateJob(jobId, { status: 'cancelled' });
    this.abortController.abort();
  }

  calculateProgress(job: ContentGenerationJob): number {
    const passWeight = 100 / 8;
    let progress = 0;

    // Count completed passes
    const passesStatus = job.passes_status;
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

    // Add introduction
    sections.push({
      key: 'intro',
      heading: 'Introduction',
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

    // Add conclusion
    sections.push({
      key: 'conclusion',
      heading: 'Conclusion',
      level: 2,
      order: 999
    });

    return sections.sort((a, b) => a.order - b.order);
  }

  async assembleDraft(jobId: string): Promise<string> {
    const sections = await this.getSections(jobId);

    return sections
      .sort((a, b) => a.section_order - b.section_order)
      .map(s => {
        const heading = s.section_level === 2 ? `## ${s.section_heading}` : `### ${s.section_heading}`;
        return `${heading}\n\n${s.current_content || ''}`;
      })
      .join('\n\n');
  }
}
