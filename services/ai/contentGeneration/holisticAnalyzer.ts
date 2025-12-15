// services/ai/contentGeneration/holisticAnalyzer.ts
import {
  ContentGenerationSection,
  ContentBrief,
  BusinessInfo,
  HolisticSummaryContext
} from '../../../types';

/**
 * Builds a compact holistic summary context from the full article sections.
 * This is computed ONCE per pass and passed to each section during optimization.
 * The resulting context is ~2-4KB instead of the full 150-200KB article.
 */
export function buildHolisticSummary(
  sections: ContentGenerationSection[],
  brief: ContentBrief,
  businessInfo: BusinessInfo
): HolisticSummaryContext {
  // Sort sections by order for consistent processing
  const sortedSections = [...sections].sort((a, b) => a.section_order - b.section_order);

  // Assemble full text for metrics calculation
  const fullText = sortedSections
    .map(s => s.current_content || '')
    .join('\n\n');

  return {
    articleStructure: buildArticleStructure(sortedSections, brief),
    vocabularyMetrics: calculateVocabularyMetrics(fullText),
    coverageDistribution: buildCoverageDistribution(sortedSections),
    anchorTextsUsed: extractAnchorTexts(sortedSections),
    sectionKeyTerms: extractSectionKeyTerms(sortedSections),
    introductionSummary: buildIntroductionSummary(sortedSections),
    centralEntity: brief.title || businessInfo.seedKeyword,
    discourseAnchors: extractDiscourseAnchors(brief, businessInfo),
    featuredSnippetTarget: extractFeaturedSnippetTarget(brief)
  };
}

/**
 * Build article structure outline with word counts
 */
function buildArticleStructure(
  sections: ContentGenerationSection[],
  brief: ContentBrief
): HolisticSummaryContext['articleStructure'] {
  let totalWordCount = 0;

  const headingOutline = sections.map(s => {
    const wordCount = countWords(s.current_content || '');
    totalWordCount += wordCount;

    return {
      key: s.section_key,
      heading: s.section_heading || s.section_key,
      level: s.section_level || 2,
      wordCount,
      order: s.section_order
    };
  });

  return {
    title: brief.title || '',
    totalWordCount,
    totalSections: sections.length,
    headingOutline
  };
}

/**
 * Calculate vocabulary metrics (TTR, overused terms)
 */
function calculateVocabularyMetrics(text: string): HolisticSummaryContext['vocabularyMetrics'] {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];

  if (words.length === 0) {
    return {
      typeTokenRatio: 1,
      uniqueWordCount: 0,
      totalWordCount: 0,
      overusedTerms: []
    };
  }

  // Count word frequencies
  const wordCounts = new Map<string, number>();
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });

  const uniqueWordCount = wordCounts.size;
  const totalWordCount = words.length;
  const typeTokenRatio = uniqueWordCount / totalWordCount;

  // Find overused terms (appearing more than 3 times, excluding common stop words)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that',
    'these', 'those', 'it', 'its', 'they', 'their', 'them', 'you', 'your',
    'we', 'our', 'i', 'my', 'me'
  ]);

  const overusedTerms = Array.from(wordCounts.entries())
    .filter(([word, count]) => count > 3 && !stopWords.has(word) && word.length > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => ({ term, count }));

  return {
    typeTokenRatio,
    uniqueWordCount,
    totalWordCount,
    overusedTerms
  };
}

/**
 * Build coverage distribution showing % of content per section
 */
function buildCoverageDistribution(
  sections: ContentGenerationSection[]
): HolisticSummaryContext['coverageDistribution'] {
  const totalWords = sections.reduce((sum, s) => sum + countWords(s.current_content || ''), 0);

  if (totalWords === 0) return [];

  return sections.map(s => ({
    sectionKey: s.section_key,
    heading: s.section_heading || s.section_key,
    percentage: Math.round((countWords(s.current_content || '') / totalWords) * 100)
  }));
}

/**
 * Extract all anchor texts used across sections
 */
function extractAnchorTexts(
  sections: ContentGenerationSection[]
): HolisticSummaryContext['anchorTextsUsed'] {
  const anchorMap = new Map<string, { sectionKey: string; count: number }>();
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

  sections.forEach(s => {
    const content = s.current_content || '';
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      const anchor = match[1].trim().toLowerCase();
      const existing = anchorMap.get(anchor);

      if (existing) {
        existing.count++;
      } else {
        anchorMap.set(anchor, { sectionKey: s.section_key, count: 1 });
      }
    }
  });

  return Array.from(anchorMap.entries()).map(([text, data]) => ({
    text,
    sectionKey: data.sectionKey,
    count: data.count
  }));
}

/**
 * Extract key terms and last sentence for each section
 * Used for discourse chaining (S-P-O pattern)
 */
function extractSectionKeyTerms(
  sections: ContentGenerationSection[]
): HolisticSummaryContext['sectionKeyTerms'] {
  return sections.map(s => {
    const content = s.current_content || '';

    // Extract last sentence for discourse chaining
    const sentences = content.split(/[.!?]+/).filter(sent => sent.trim());
    const lastSentence = sentences[sentences.length - 1]?.trim() || '';

    // Extract top 5 key terms using simple TF-IDF approximation
    const keyTerms = extractTopTerms(content, 5);

    return {
      sectionKey: s.section_key,
      keyTerms,
      lastSentence: lastSentence.substring(0, 200) // Limit length
    };
  });
}

/**
 * Build introduction summary for alignment checks
 */
function buildIntroductionSummary(
  sections: ContentGenerationSection[]
): HolisticSummaryContext['introductionSummary'] {
  const introSection = sections.find(s =>
    s.section_key === 'intro' ||
    s.section_heading?.toLowerCase().includes('introduction')
  );

  if (!introSection || !introSection.current_content) {
    return { content: '', topicsPreviewedInOrder: [] };
  }

  const content = introSection.current_content;

  // Extract topics previewed (look for lists, colons, or sentence patterns)
  const topicsPreviewedInOrder = extractPreviewedTopics(content);

  return {
    content: content.substring(0, 500), // First 500 chars for alignment
    topicsPreviewedInOrder
  };
}

/**
 * Extract discourse anchors from SEO pillars and brief
 */
function extractDiscourseAnchors(
  brief: ContentBrief,
  businessInfo: BusinessInfo
): string[] {
  const anchors = new Set<string>();

  // Add central entity
  if (businessInfo.seedKeyword) {
    anchors.add(businessInfo.seedKeyword);
  }

  // Add title terms
  if (brief.title) {
    brief.title.split(/\s+/)
      .filter(w => w.length > 4)
      .forEach(w => anchors.add(w.toLowerCase()));
  }

  // Add from structured outline headings
  if (brief.structured_outline) {
    brief.structured_outline.forEach(section => {
      if (section.heading) {
        section.heading.split(/\s+/)
          .filter(w => w.length > 4)
          .forEach(w => anchors.add(w.toLowerCase()));
      }
    });
  }

  return Array.from(anchors).slice(0, 10);
}

/**
 * Extract featured snippet target from brief
 */
function extractFeaturedSnippetTarget(
  brief: ContentBrief
): HolisticSummaryContext['featuredSnippetTarget'] | undefined {
  // Check for question-based title
  const title = brief.title?.toLowerCase() || '';

  if (title.startsWith('what is') || title.startsWith('what are')) {
    return { question: brief.title!, targetType: 'paragraph' };
  }

  if (title.startsWith('how to') || title.includes('steps')) {
    return { question: brief.title!, targetType: 'list' };
  }

  if (title.includes(' vs ') || title.includes('comparison')) {
    return { question: brief.title!, targetType: 'table' };
  }

  return undefined;
}

// ============================================
// Helper Functions
// ============================================

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Extract top N terms from text using TF approximation
 */
function extractTopTerms(text: string, n: number): string[] {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];

  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that',
    'these', 'those', 'it', 'its', 'they', 'their', 'them', 'you', 'your'
  ]);

  const termCounts = new Map<string, number>();
  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 3) {
      termCounts.set(word, (termCounts.get(word) || 0) + 1);
    }
  });

  return Array.from(termCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term]) => term);
}

/**
 * Extract topics that are previewed in the introduction
 */
function extractPreviewedTopics(introContent: string): string[] {
  const topics: string[] = [];

  // Look for list items
  const listItems = introContent.match(/[-*]\s+([^-*\n]+)/g) || [];
  listItems.forEach(item => {
    const text = item.replace(/^[-*]\s+/, '').trim();
    if (text.length > 5 && text.length < 50) {
      topics.push(text);
    }
  });

  // Look for patterns like "X, Y, and Z"
  const commaListMatch = introContent.match(/including ([^.]+)/i);
  if (commaListMatch) {
    const items = commaListMatch[1].split(/,\s*and\s*|,\s*/);
    items.forEach(item => {
      const trimmed = item.trim();
      if (trimmed.length > 3 && trimmed.length < 50) {
        topics.push(trimmed);
      }
    });
  }

  return topics.slice(0, 8);
}

// ============================================
// Adjacent Context Builder
// ============================================

export interface AdjacentSectionContext {
  previousSection?: {
    key: string;
    heading: string;
    lastParagraph: string;
    keyTerms: string[];
  };
  nextSection?: {
    key: string;
    heading: string;
    firstParagraph: string;
  };
}

/**
 * Build adjacent section context for discourse continuity
 */
export function buildAdjacentContext(
  sections: ContentGenerationSection[],
  currentSection: ContentGenerationSection
): AdjacentSectionContext {
  const sortedSections = [...sections].sort((a, b) => a.section_order - b.section_order);
  const currentIndex = sortedSections.findIndex(s => s.section_key === currentSection.section_key);

  const result: AdjacentSectionContext = {};

  // Previous section
  if (currentIndex > 0) {
    const prev = sortedSections[currentIndex - 1];
    const content = prev.current_content || '';
    const paragraphs = content.split('\n\n').filter(p => p.trim());

    result.previousSection = {
      key: prev.section_key,
      heading: prev.section_heading || prev.section_key,
      lastParagraph: paragraphs[paragraphs.length - 1]?.substring(0, 300) || '',
      keyTerms: extractTopTerms(content, 5)
    };
  }

  // Next section
  if (currentIndex < sortedSections.length - 1) {
    const next = sortedSections[currentIndex + 1];
    const content = next.current_content || '';
    const paragraphs = content.split('\n\n').filter(p => p.trim());

    result.nextSection = {
      key: next.section_key,
      heading: next.section_heading || next.section_key,
      firstParagraph: paragraphs[0]?.substring(0, 300) || ''
    };
  }

  return result;
}

/**
 * Serialize holistic context to a compact string for prompts
 * ~2-4KB of essential information
 */
export function serializeHolisticContext(ctx: HolisticSummaryContext): string {
  const lines: string[] = [];

  // Article structure summary
  lines.push('## Article Structure');
  lines.push(`Title: ${ctx.articleStructure.title}`);
  lines.push(`Total: ${ctx.articleStructure.totalWordCount} words across ${ctx.articleStructure.totalSections} sections`);
  lines.push('');

  // Heading outline with word counts
  lines.push('### Section Outline');
  ctx.articleStructure.headingOutline.forEach((h, i) => {
    const indent = h.level === 3 ? '  ' : '';
    lines.push(`${indent}${i + 1}. ${h.heading} (${h.wordCount} words)`);
  });
  lines.push('');

  // Vocabulary metrics
  lines.push('### Vocabulary Metrics');
  lines.push(`TTR: ${(ctx.vocabularyMetrics.typeTokenRatio * 100).toFixed(1)}% (unique/total)`);
  if (ctx.vocabularyMetrics.overusedTerms.length > 0) {
    lines.push(`Overused: ${ctx.vocabularyMetrics.overusedTerms.slice(0, 5).map(t => `${t.term}(${t.count})`).join(', ')}`);
  }
  lines.push('');

  // Coverage distribution (top heavy/light sections)
  lines.push('### Coverage Balance');
  const sortedCoverage = [...ctx.coverageDistribution].sort((a, b) => b.percentage - a.percentage);
  sortedCoverage.slice(0, 3).forEach(c => {
    lines.push(`- ${c.heading}: ${c.percentage}%`);
  });
  lines.push('');

  // Anchor texts for variety
  if (ctx.anchorTextsUsed.length > 0) {
    lines.push('### Anchor Texts Used');
    ctx.anchorTextsUsed.slice(0, 8).forEach(a => {
      lines.push(`- "${a.text}" (${a.count}x)`);
    });
    lines.push('');
  }

  // Discourse anchors
  lines.push('### Central Entity & Discourse Anchors');
  lines.push(`Central: ${ctx.centralEntity}`);
  lines.push(`Anchors: ${ctx.discourseAnchors.join(', ')}`);

  // Featured snippet target
  if (ctx.featuredSnippetTarget) {
    lines.push('');
    lines.push(`### Featured Snippet Target: ${ctx.featuredSnippetTarget.targetType}`);
    lines.push(`Question: ${ctx.featuredSnippetTarget.question}`);
  }

  return lines.join('\n');
}
