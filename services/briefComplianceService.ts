import { ContentBrief, BusinessInfo, EnrichedTopic, BriefSection } from '../types';
import {
  BriefComplianceCheck,
  MissingField,
  AutoSuggestion,
  FeaturedSnippetTarget
} from '../types/contentGeneration';

type Methodology = 'ordered_list' | 'unordered_list' | 'comparison_table' | 'definition_prose' | 'prose';

export class BriefComplianceService {
  /**
   * Infer methodology (list/table/prose) from heading pattern
   */
  inferMethodology(section: { heading: string }): Methodology {
    const heading = section.heading.toLowerCase();

    // Ordered list patterns
    if (/^(how to|steps to|guide to|\d+\s+(ways|steps|tips|methods))/i.test(heading)) {
      return 'ordered_list';
    }

    // Unordered list patterns
    if (/^(types of|benefits of|advantages|features|characteristics)/i.test(heading)) {
      return 'unordered_list';
    }

    // Table patterns (check for "vs" anywhere in heading, or starts with comparison/versus)
    if (/\s+vs\.?\s+|^(comparison|versus|differences between|pricing)/i.test(heading)) {
      return 'comparison_table';
    }

    // Definition patterns
    if (/^(what is|what are|definition|meaning of)/i.test(heading)) {
      return 'definition_prose';
    }

    return 'prose';
  }

  /**
   * Generate subordinate text hint for a section based on heading pattern
   */
  generateSubordinateTextHint(
    section: { heading: string },
    brief: { targetKeyword?: string }
  ): string {
    const heading = section.heading;
    const keyword = brief.targetKeyword || 'the topic';

    // Pattern matching for common heading types
    if (/^what (is|are)/i.test(heading)) {
      return `Define ${keyword} clearly using the "is-a" structure: "[Entity] is a [category] that [function]"`;
    }

    if (/^how to/i.test(heading)) {
      return `Start with the key action verb. State the primary method in one sentence.`;
    }

    if (/^why/i.test(heading)) {
      return `State the primary reason directly. Use "because" or causative language.`;
    }

    if (/^(benefits|advantages)/i.test(heading)) {
      return `State the number of benefits and the primary benefit first: "The X main benefits include [primary benefit], which..."`;
    }

    if (/^(types|kinds|categories)/i.test(heading)) {
      return `State the exact count: "There are X types of ${keyword}:" followed by the list.`;
    }

    // Default
    return `Directly answer the question implied by "${heading}" in the first sentence. Be definitive, not vague.`;
  }

  /**
   * Infer featured snippet target from brief data
   */
  inferFeaturedSnippetTarget(brief: { title: string; targetKeyword?: string }): FeaturedSnippetTarget | null {
    const title = brief.title.toLowerCase();

    // Definition snippet
    if (/^what (is|are)/i.test(title)) {
      return {
        type: 'paragraph',
        target: brief.title,
        format: 'Under 50 words definition starting with "[Entity] is..."',
        maxLength: 50
      };
    }

    // List snippet
    if (/^(how to|steps|guide|\d+\s+(ways|tips|methods))/i.test(title)) {
      return {
        type: 'ordered_list',
        target: brief.title,
        format: 'Numbered steps, each starting with action verb',
        maxItems: 8
      };
    }

    // Table snippet - check for "vs" anywhere in title, or starts with comparison/best/top N
    if (/\s+vs\.?\s+|^(comparison|best|top \d+)/i.test(title)) {
      return {
        type: 'table',
        target: brief.title,
        format: 'Comparison table with clear column headers'
      };
    }

    return null;
  }
}
