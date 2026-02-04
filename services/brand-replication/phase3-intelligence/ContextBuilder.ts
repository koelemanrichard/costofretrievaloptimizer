// services/brand-replication/phase3-intelligence/ContextBuilder.ts

import type {
  ContentContext,
  ArticleSection,
  SectionContext,
  IntelligenceInput,
} from '../interfaces';
import type { TopicalMap, ContentBrief, EnrichedTopic } from '../../../types';

/**
 * ContextBuilder constructs semantic context for content intelligence analysis.
 * It extracts pillars, topical map context, and builds section-level context
 * for intelligent design decisions.
 */
export class ContextBuilder {
  /**
   * Builds the full content context combining pillars, topical map, and article data.
   */
  buildContentContext(
    input: IntelligenceInput,
    topicalMap?: TopicalMap,
    brief?: ContentBrief,
    topic?: EnrichedTopic
  ): ContentContext {
    // Extract pillars from topical map business info
    const pillars = this.extractPillars(topicalMap);

    // Extract topical map context
    const topicalMapContext = this.extractTopicalMapContext(topicalMap, topic);

    // Article context comes from input
    const articleContext = input.contentContext.article;

    return {
      pillars,
      topicalMap: topicalMapContext,
      article: articleContext,
    };
  }

  /**
   * Builds context for a specific section including its position and surrounding sections.
   */
  buildSectionContext(
    section: ArticleSection,
    allSections: ArticleSection[],
    index: number
  ): SectionContext {
    const totalSections = allSections.length;

    // Determine position based on index
    let position: 'intro' | 'body' | 'conclusion';
    if (index === 0) {
      position = 'intro';
    } else if (index >= totalSections - 2 && totalSections > 2) {
      // Last 2 sections are conclusion (if more than 2 sections total)
      position = 'conclusion';
    } else if (index === totalSections - 1) {
      // Single last section is always conclusion
      position = 'conclusion';
    } else {
      position = 'body';
    }

    // Get surrounding sections for context
    const precedingSections = allSections.slice(0, index).map(s => s.heading);
    const followingSections = allSections.slice(index + 1).map(s => s.heading);

    return {
      section,
      position,
      positionIndex: index,
      totalSections,
      precedingSections,
      followingSections,
    };
  }

  /**
   * Extracts SEO pillars from topical map business info.
   */
  private extractPillars(topicalMap?: TopicalMap): ContentContext['pillars'] {
    if (!topicalMap?.business_info) {
      return {
        centralEntity: '',
        sourceContext: '',
        centralSearchIntent: '',
      };
    }

    const bi = topicalMap.business_info;
    return {
      centralEntity: bi.projectName || bi.domain || '',
      sourceContext: bi.valueProp || '',
      centralSearchIntent: bi.conversionGoal || '',
    };
  }

  /**
   * Extracts topical map context including related topics and content gaps.
   */
  private extractTopicalMapContext(
    topicalMap?: TopicalMap,
    topic?: EnrichedTopic
  ): ContentContext['topicalMap'] {
    // Extract related topics from the topical map
    const relatedTopics = this.extractRelatedTopics(topicalMap, topic);

    // Extract content gaps from analysis state
    const contentGaps = this.extractContentGaps(topicalMap);

    return {
      id: topicalMap?.id || '',
      coreTopic: topic?.title || topicalMap?.name || '',
      relatedTopics,
      contentGaps,
      targetAudience: topicalMap?.business_info?.audience || '',
    };
  }

  /**
   * Extracts related topics from topical map structure.
   */
  private extractRelatedTopics(topicalMap?: TopicalMap, currentTopic?: EnrichedTopic): string[] {
    if (!topicalMap?.topics) {
      return [];
    }

    const related: string[] = [];

    // If we have a current topic, find its siblings and children
    if (currentTopic) {
      for (const t of topicalMap.topics) {
        if (t.id === currentTopic.id) continue;

        // Add siblings (same parent)
        if (currentTopic.parent_topic_id && t.parent_topic_id === currentTopic.parent_topic_id) {
          related.push(t.title);
        }

        // Add children if current topic is a parent
        if (t.parent_topic_id === currentTopic.id) {
          related.push(t.title);
        }

        // Limit to prevent context overflow
        if (related.length >= 10) break;
      }
    } else {
      // No current topic, just take first few topics
      related.push(...topicalMap.topics.slice(0, 10).map(t => t.title));
    }

    return related;
  }

  /**
   * Extracts content gaps from topical map analysis state.
   */
  private extractContentGaps(topicalMap?: TopicalMap): string[] {
    const gaps: string[] = [];

    // Extract from contextual coverage result if available
    const coverage = topicalMap?.analysis_state?.contextualCoverageResult;
    if (coverage?.gaps) {
      gaps.push(...coverage.gaps.slice(0, 5).map(g => g.context));
    }

    // Extract from validation result if available
    const validation = topicalMap?.analysis_state?.validationResult;
    if (validation?.issues) {
      gaps.push(...validation.issues.slice(0, 5).map(i => i.message));
    }

    return [...new Set(gaps)]; // Deduplicate
  }

  /**
   * Estimates word count for a section content string.
   */
  estimateWordCount(content: string): number {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }

  /**
   * Creates an ArticleSection from raw heading and content.
   */
  createSection(
    id: string,
    heading: string,
    content: string,
    headingLevel: number = 2
  ): ArticleSection {
    return {
      id,
      heading,
      headingLevel,
      content,
      wordCount: this.estimateWordCount(content),
    };
  }

  /**
   * Parses article HTML/markdown into sections.
   * This is a simplified parser - could be enhanced for more complex structures.
   */
  parseArticleIntoSections(
    articleContent: string,
    articleTitle: string
  ): ArticleSection[] {
    const sections: ArticleSection[] = [];

    // Match headings (h2-h4 in HTML or ## in markdown)
    const headingRegex = /(?:<h([2-4])[^>]*>(.*?)<\/h\1>|^(#{2,4})\s+(.+)$)/gim;
    const matches = [...articleContent.matchAll(headingRegex)];

    if (matches.length === 0) {
      // No headings found, treat entire content as one section
      sections.push(this.createSection('section-0', articleTitle, articleContent, 1));
      return sections;
    }

    let lastIndex = 0;

    // Check for content before first heading
    const firstHeadingIndex = articleContent.indexOf(matches[0][0]);
    if (firstHeadingIndex > 0) {
      const introContent = articleContent.substring(0, firstHeadingIndex).trim();
      if (introContent) {
        sections.push(this.createSection('section-intro', 'Introduction', introContent, 1));
      }
    }

    matches.forEach((match, index) => {
      const headingLevel = match[1] ? parseInt(match[1], 10) : match[3].length;
      const headingText = (match[2] || match[4]).trim();
      const headingStart = match.index!;
      const headingEnd = headingStart + match[0].length;

      // Get content until next heading or end
      const nextMatch = matches[index + 1];
      const contentEnd = nextMatch ? nextMatch.index! : articleContent.length;
      const content = articleContent.substring(headingEnd, contentEnd).trim();

      sections.push(
        this.createSection(`section-${index}`, headingText, content, headingLevel)
      );
    });

    return sections;
  }
}
