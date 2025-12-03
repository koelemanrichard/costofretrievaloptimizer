import { ContentBrief, BusinessInfo, EnrichedTopic, BriefSection } from '../types';
import {
  BriefComplianceCheck,
  MissingField,
  AutoSuggestion,
  BriefFeaturedSnippetTarget
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
  inferFeaturedSnippetTarget(brief: { title: string; targetKeyword?: string }): BriefFeaturedSnippetTarget | null {
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

  /**
   * Check brief completeness and return missing fields with suggestions
   */
  async checkBriefCompliance(
    brief: ContentBrief,
    businessInfo: BusinessInfo,
    topics: EnrichedTopic[]
  ): Promise<BriefComplianceCheck> {
    const missingFields: MissingField[] = [];
    const suggestions: AutoSuggestion[] = [];

    // Check structured outline
    const hasStructuredOutline = !!brief.structured_outline?.length;
    if (!hasStructuredOutline) {
      missingFields.push({
        field: 'structured_outline',
        importance: 'critical',
        description: 'Structured outline with subordinate text hints required for quality content',
        canAutoGenerate: true
      });

      // Generate suggestion from markdown outline if available
      if (brief.outline) {
        const parsedOutline = this.parseOutlineToStructured(brief.outline);
        suggestions.push({
          field: 'structured_outline',
          suggestedValue: parsedOutline,
          confidence: 0.8,
          source: 'Parsed from markdown outline'
        });
      }
    }

    // Check subordinate text hints
    let hasSubordinateTextHints = false;
    if (brief.structured_outline?.length) {
      const missingSubs = brief.structured_outline.filter(s => !s.subordinate_text_hint);
      hasSubordinateTextHints = missingSubs.length === 0;

      if (missingSubs.length > 0) {
        missingFields.push({
          field: 'subordinate_text_hints',
          importance: 'high',
          description: `${missingSubs.length} sections missing subordinate text hints`,
          canAutoGenerate: true
        });

        // Generate hints for each missing section
        for (const section of missingSubs) {
          const hint = this.generateSubordinateTextHint(section, brief);
          suggestions.push({
            field: `subordinate_text_hint:${section.heading}`,
            suggestedValue: hint,
            confidence: 0.7,
            source: 'AI-generated based on heading and context'
          });
        }
      }
    }

    // Check featured snippet target
    const hasFeaturedSnippetTarget = !!brief.featured_snippet_target;
    if (!hasFeaturedSnippetTarget) {
      missingFields.push({
        field: 'featured_snippet_target',
        importance: 'medium',
        description: 'No featured snippet target defined',
        canAutoGenerate: true
      });

      const fsTarget = this.inferFeaturedSnippetTarget(brief);
      if (fsTarget) {
        suggestions.push({
          field: 'featured_snippet_target',
          suggestedValue: fsTarget,
          confidence: 0.6,
          source: 'Inferred from title pattern and SERP analysis'
        });
      }
    }

    // Check contextual bridge (internal linking)
    const hasContextualBridge = this.hasContextualBridge(brief);
    if (!hasContextualBridge) {
      missingFields.push({
        field: 'contextualBridge',
        importance: 'high',
        description: 'No internal linking plan defined',
        canAutoGenerate: true
      });
    }

    // Check SERP analysis
    const hasSerpAnalysis = !!brief.serpAnalysis?.peopleAlsoAsk?.length;

    // Check business fields
    const hasBusinessGoal = !!businessInfo.conversionGoal;
    const hasCTA = !!brief.cta;
    const hasTargetAudience = !!businessInfo.audience;
    const hasMethodologyNotes = brief.structured_outline?.some(s => s.methodology_note) || false;
    const hasDiscourseAnchors = !!brief.discourse_anchors?.length;

    // Calculate score
    const score = this.calculateComplianceScore(missingFields);

    return {
      hasStructuredOutline,
      hasSubordinateTextHints,
      hasMethodologyNotes,
      hasSerpAnalysis,
      hasFeaturedSnippetTarget,
      hasContextualBridge,
      hasDiscourseAnchors,
      hasBusinessGoal,
      hasCTA,
      hasTargetAudience,
      score,
      missingFields,
      suggestions
    };
  }

  /**
   * Check if brief has contextual bridge links
   */
  private hasContextualBridge(brief: ContentBrief): boolean {
    if (!brief.contextualBridge) return false;
    if (Array.isArray(brief.contextualBridge)) {
      return brief.contextualBridge.length > 0;
    }
    return !!brief.contextualBridge.links?.length;
  }

  /**
   * Parse markdown outline to structured format
   */
  private parseOutlineToStructured(outline: string): BriefSection[] {
    const lines = outline.split('\n').filter(line => line.trim().startsWith('#'));
    return lines.map((line, index) => {
      const level = (line.match(/^#+/) || ['##'])[0].length;
      const heading = line.replace(/^#+\s*/, '').trim();
      return {
        key: `section-${index}`,
        heading,
        level,
        order: index
      };
    });
  }

  /**
   * Calculate compliance score based on missing fields
   */
  private calculateComplianceScore(missingFields: MissingField[]): number {
    const weights: Record<string, number> = {
      critical: 30,
      high: 20,
      medium: 10,
      low: 5
    };

    let penalty = 0;
    for (const field of missingFields) {
      penalty += weights[field.importance] || 5;
    }

    return Math.max(0, 100 - penalty);
  }
}
