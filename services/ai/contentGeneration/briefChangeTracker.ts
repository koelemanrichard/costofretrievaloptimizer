import { SupabaseClient } from '@supabase/supabase-js';
import { BriefChangeLogEntry, BriefGenerationSummary } from '../../../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Criteria for justifying additional images
 */
export interface ImageAdditionCriteria {
  wordCountThreshold: boolean;
  processContent: boolean;
  featuredSnippetTarget: boolean;
  userExperienceValue: boolean;
}

/**
 * Service for tracking and persisting changes made to brief during generation
 */
export class BriefChangeTracker {
  private changes: BriefChangeLogEntry[] = [];
  private briefId: string;
  private supabase: SupabaseClient;

  constructor(briefId: string, supabase: SupabaseClient) {
    this.briefId = briefId;
    this.supabase = supabase;
  }

  /**
   * Log an image addition with justification
   */
  logImageAdded(
    pass: number,
    sectionKey: string,
    imageDescription: string,
    criteria: ImageAdditionCriteria,
    reason: string
  ): void {
    const criteriaMet: string[] = [];
    if (criteria.wordCountThreshold) criteriaMet.push('word_count_threshold');
    if (criteria.processContent) criteriaMet.push('process_content');
    if (criteria.featuredSnippetTarget) criteriaMet.push('featured_snippet_target');
    if (criteria.userExperienceValue) criteriaMet.push('user_experience_value');

    this.changes.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      pass,
      change_type: 'image_added',
      section_key: sectionKey,
      field: 'image',
      original_value: null,
      new_value: imageDescription,
      reason,
      criteria_met: criteriaMet
    });

    console.log(`[BriefChangeTracker] Image added to ${sectionKey}: ${reason}`);
  }

  /**
   * Log an image description modification
   */
  logImageModified(
    pass: number,
    sectionKey: string,
    originalDescription: string,
    newDescription: string,
    reason: string
  ): void {
    this.changes.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      pass,
      change_type: 'image_modified',
      section_key: sectionKey,
      field: 'image_description',
      original_value: originalDescription,
      new_value: newDescription,
      reason,
      criteria_met: ['quality_improvement']
    });

    console.log(`[BriefChangeTracker] Image modified in ${sectionKey}: ${reason}`);
  }

  /**
   * Check if adding an image to a section is justified
   */
  static evaluateImageAddition(
    sectionContent: string,
    sectionHeading: string,
    briefHasImage: boolean,
    isFeaturedSnippetTarget: boolean
  ): { justified: boolean; criteria: ImageAdditionCriteria; reason: string } {
    const wordCount = sectionContent.split(/\s+/).filter(w => w.length > 0).length;
    const combinedText = sectionHeading + ' ' + sectionContent;
    const hasProcessContent = /\b(step|proces|stap|how to|hoe|procedure|workflow|guide|tutorial)\b/i.test(combinedText);

    const criteria: ImageAdditionCriteria = {
      wordCountThreshold: wordCount > 300 && !briefHasImage,
      processContent: hasProcessContent && !briefHasImage,
      featuredSnippetTarget: isFeaturedSnippetTarget && !briefHasImage,
      userExperienceValue: false
    };

    // At least 2 criteria must be met, OR featured snippet target alone justifies
    const criteriaMetCount = [criteria.wordCountThreshold, criteria.processContent, criteria.featuredSnippetTarget].filter(Boolean).length;
    criteria.userExperienceValue = criteriaMetCount >= 2 || criteria.featuredSnippetTarget;

    let reason = '';
    if (criteria.userExperienceValue) {
      const reasons: string[] = [];
      if (criteria.wordCountThreshold) reasons.push(`section has ${wordCount} words without visual`);
      if (criteria.processContent) reasons.push('contains process/step content');
      if (criteria.featuredSnippetTarget) reasons.push('featured snippet target needs supporting visual');
      reason = `Added image: ${reasons.join('; ')}. This improves user experience and content comprehension.`;
    }

    return { justified: criteria.userExperienceValue, criteria, reason };
  }

  /**
   * Get current changes
   */
  getChanges(): BriefChangeLogEntry[] {
    return [...this.changes];
  }

  /**
   * Generate summary statistics
   */
  getSummary(): BriefGenerationSummary {
    return {
      total_changes: this.changes.length,
      images_added: this.changes.filter(c => c.change_type === 'image_added').length,
      images_modified: this.changes.filter(c => c.change_type === 'image_modified').length,
      sections_modified: this.changes.filter(c => c.change_type === 'section_modified').length,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Persist changes to the brief in database
   */
  async persistChanges(): Promise<void> {
    if (this.changes.length === 0) {
      console.log('[BriefChangeTracker] No changes to persist');
      return;
    }

    const summary = this.getSummary();

    const { error } = await this.supabase
      .from('content_briefs')
      .update({
        generation_changes: this.changes,
        generation_summary: summary
      })
      .eq('id', this.briefId);

    if (error) {
      console.error('[BriefChangeTracker] Failed to persist changes:', error);
    } else {
      console.log(`[BriefChangeTracker] Persisted ${this.changes.length} changes to brief ${this.briefId}`);
    }
  }
}
