/**
 * Content Analyzer Service
 *
 * Analyzes content structure to detect:
 * - Heading hierarchy
 * - Component patterns (benefits, steps, testimonials, FAQ)
 * - SEO elements
 * - CTA placement opportunities
 *
 * @module services/publishing/contentAnalyzer
 */

import type { ArticleSection, FaqItem, TimelineStep, TestimonialItem, BenefitItem, HeadingItem } from './htmlBuilder';

// ============================================================================
// TYPES
// ============================================================================

export interface ContentAnalysisResult {
  structure: {
    headings: HeadingItem[];
    sections: ArticleSection[];
    wordCount: number;
    readingTime: number;
  };
  components: {
    benefits: BenefitItem[] | null;
    processSteps: TimelineStep[] | null;
    testimonials: TestimonialItem[] | null;
    faqItems: FaqItem[] | null;
    keyTakeaways: string[] | null;
    ctaPlacements: CtaPlacement[];
  };
  seoData: {
    primaryKeyword: string | null;
    secondaryKeywords: string[];
    headingKeywords: string[];
    hasH1: boolean;
    headingIssues: string[];
  };
}

export interface CtaPlacement {
  position: 'after-intro' | 'mid-content' | 'before-faq' | 'end';
  priority: 'high' | 'medium' | 'low';
  sectionIndex?: number;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze content and extract structure, components, and SEO data
 */
export function analyzeContent(content: string, title?: string): ContentAnalysisResult {
  // Determine if content is HTML or Markdown
  const isHtml = content.includes('<');

  const headings = extractHeadings(content, isHtml);
  const sections = extractSections(content, headings, isHtml);
  const wordCount = countWords(content, isHtml);
  const readingTime = Math.ceil(wordCount / 200);

  // Detect components
  const benefits = detectBenefits(content, isHtml);
  const processSteps = detectProcessSteps(content, isHtml);
  const testimonials = detectTestimonials(content, isHtml);
  const faqItems = detectFaqItems(content, isHtml);
  const keyTakeaways = detectKeyTakeaways(content, isHtml);
  const ctaPlacements = suggestCtaPlacements(sections, content);

  // Extract SEO data
  const seoData = analyzeSeo(content, headings, title, isHtml);

  return {
    structure: {
      headings,
      sections,
      wordCount,
      readingTime,
    },
    components: {
      benefits,
      processSteps,
      testimonials,
      faqItems,
      keyTakeaways,
      ctaPlacements,
    },
    seoData,
  };
}

// ============================================================================
// HEADING EXTRACTION
// ============================================================================

/**
 * Extract headings from content
 */
export function extractHeadings(content: string, isHtml: boolean = true, maxDepth: number = 4): HeadingItem[] {
  const headings: HeadingItem[] = [];

  if (isHtml) {
    // HTML heading extraction
    const headingRegex = /<h([1-6])([^>]*)>([^<]*)<\/h[1-6]>/gi;
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = parseInt(match[1], 10);
      if (level <= maxDepth) {
        const text = match[3].trim();
        const idMatch = match[2].match(/id="([^"]+)"/);
        const id = idMatch ? idMatch[1] : slugify(text);

        headings.push({ level, text, id });
      }
    }
  } else {
    // Markdown heading extraction
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        if (level <= maxDepth) {
          const text = match[2].trim();
          headings.push({ level, text, id: slugify(text) });
        }
      }
    }
  }

  return headings;
}

// ============================================================================
// SECTION EXTRACTION
// ============================================================================

/**
 * Extract content sections based on headings
 */
function extractSections(content: string, headings: HeadingItem[], isHtml: boolean): ArticleSection[] {
  const sections: ArticleSection[] = [];

  if (headings.length === 0) {
    // No headings, treat entire content as one section
    return [{
      id: 'content',
      level: 2,
      heading: 'Content',
      content: content,
    }];
  }

  // Split content by H2 headings
  const h2Pattern = isHtml
    ? /<h2[^>]*>([^<]*)<\/h2>/gi
    : /^##\s+(.+)$/gm;

  const parts = content.split(h2Pattern);

  // First part is intro (before first H2)
  if (parts[0].trim()) {
    sections.push({
      id: 'intro',
      level: 1,
      heading: 'Introduction',
      content: parts[0].trim(),
    });
  }

  // Process each H2 section
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i]?.trim();
    const sectionContent = parts[i + 1]?.trim();

    if (heading && sectionContent) {
      sections.push({
        id: slugify(heading),
        level: 2,
        heading,
        content: sectionContent,
      });
    }
  }

  return sections;
}

// ============================================================================
// COMPONENT DETECTION
// ============================================================================

/**
 * Detect benefit/feature sections
 */
function detectBenefits(content: string, isHtml: boolean): BenefitItem[] | null {
  const benefitPatterns = [
    /(?:voordelen|benefits|kenmerken|features|waarom\s+kiezen)[^\n]*\n((?:[-*]\s+[^\n]+\n?)+)/gi,
    /(?:voordelen|benefits|kenmerken|features)[^:]*:[^\n]*\n((?:[-*]\s+[^\n]+\n?)+)/gi,
  ];

  for (const pattern of benefitPatterns) {
    const match = pattern.exec(content);
    if (match) {
      const listContent = match[1];
      const items = listContent.match(/[-*]\s+([^\n]+)/g);

      if (items && items.length >= 3) {
        return items.slice(0, 6).map(item => {
          const text = item.replace(/^[-*]\s+/, '').trim();
          const parts = text.split(/[:\-–]/).map(p => p.trim());

          return {
            title: parts[0] || text,
            description: parts[1] || '',
            icon: '✓',
          };
        });
      }
    }
  }

  return null;
}

/**
 * Detect process/step sections
 */
function detectProcessSteps(content: string, isHtml: boolean): TimelineStep[] | null {
  // Pattern 1: Numbered list after step-indicating heading
  const processPatterns = [
    /(?:hoe\s+(?:werkt|wij\s+werken)|process|stappen|steps|werkwijze)[^\n]*\n((?:\d+\.\s+[^\n]+\n?)+)/gi,
    /(?:stap\s+)?(\d+)[.:]\s*\*\*([^*]+)\*\*\s*[-–:]\s*([^\n]+)/gi,
  ];

  // Try numbered list pattern
  const match = processPatterns[0].exec(content);
  if (match) {
    const listContent = match[1];
    const items = listContent.match(/\d+\.\s+([^\n]+)/g);

    if (items && items.length >= 3) {
      return items.slice(0, 8).map((item, index) => {
        const text = item.replace(/^\d+\.\s+/, '').trim();
        const parts = text.split(/[:\-–]/).map(p => p.trim());

        return {
          title: parts[0] || `Stap ${index + 1}`,
          description: parts[1] || text,
        };
      });
    }
  }

  // Try bold step pattern
  const steps: TimelineStep[] = [];
  let stepMatch;
  const boldPattern = /(?:stap\s+)?(\d+)[.:]\s*\*\*([^*]+)\*\*\s*[-–:]\s*([^\n]+)/gi;

  while ((stepMatch = boldPattern.exec(content)) !== null) {
    steps.push({
      title: stepMatch[2].trim(),
      description: stepMatch[3].trim(),
    });
  }

  if (steps.length >= 3) {
    return steps.slice(0, 8);
  }

  return null;
}

/**
 * Detect testimonial/quote sections
 */
function detectTestimonials(content: string, isHtml: boolean): TestimonialItem[] | null {
  const testimonials: TestimonialItem[] = [];

  // Pattern 1: Quoted text with attribution
  const quotePattern = /"([^"]{30,300})"[^\n]*[-–—]\s*([^,\n]+)(?:,\s*([^\n]+))?/g;
  let match;

  while ((match = quotePattern.exec(content)) !== null) {
    testimonials.push({
      quote: match[1].trim(),
      authorName: match[2].trim(),
      authorTitle: match[3]?.trim(),
    });
  }

  // Pattern 2: Blockquote with attribution (Markdown)
  const blockquotePattern = />\s*"?([^>\n]+)"?\s*\n>\s*[-–—]\s*\*?\*?([^*\n]+)\*?\*?/g;

  while ((match = blockquotePattern.exec(content)) !== null) {
    if (match[1].length >= 30) {
      testimonials.push({
        quote: match[1].trim().replace(/^"|"$/g, ''),
        authorName: match[2].trim(),
      });
    }
  }

  return testimonials.length >= 1 ? testimonials.slice(0, 5) : null;
}

/**
 * Detect FAQ sections
 */
function detectFaqItems(content: string, isHtml: boolean): FaqItem[] | null {
  const faqItems: FaqItem[] = [];

  // Pattern 1: Q/A or Question/Answer format
  const qaPattern = /(?:Q|Vraag)[:\.]?\s*([^\n?]+\?)\s*\n+(?:A|Antwoord)[:\.]?\s*([^\n]+(?:\n(?!(?:Q|Vraag)[:\.])[^\n]+)*)/gi;
  let match;

  while ((match = qaPattern.exec(content)) !== null) {
    faqItems.push({
      question: match[1].trim(),
      answer: match[2].trim().replace(/\n+/g, ' '),
    });
  }

  if (faqItems.length >= 2) {
    return faqItems.slice(0, 10);
  }

  // Pattern 2: H3/H4 questions followed by paragraphs
  const headingQuestionPattern = isHtml
    ? /<h[34][^>]*>([^<]*\?)<\/h[34]>\s*<p[^>]*>([^<]+)<\/p>/gi
    : /#{3,4}\s+([^\n]*\?)\n+([^\n#]+)/g;

  while ((match = headingQuestionPattern.exec(content)) !== null) {
    faqItems.push({
      question: match[1].trim(),
      answer: match[2].trim(),
    });
  }

  return faqItems.length >= 2 ? faqItems.slice(0, 10) : null;
}

/**
 * Detect key takeaways / summary points
 */
function detectKeyTakeaways(content: string, isHtml: boolean): string[] | null {
  // Look for takeaways/summary section
  const takeawayPatterns = [
    /(?:key\s+takeaways|belangrijkste\s+punten|samenvatting|conclusie|in\s+het\s+kort)[^\n]*\n((?:[-*]\s+[^\n]+\n?)+)/gi,
    /(?:tl;?dr|summary)[^\n]*\n((?:[-*]\s+[^\n]+\n?)+)/gi,
  ];

  for (const pattern of takeawayPatterns) {
    const match = pattern.exec(content);
    if (match) {
      const listContent = match[1];
      const items = listContent.match(/[-*]\s+([^\n]+)/g);

      if (items && items.length >= 2) {
        return items.slice(0, 6).map(item =>
          item.replace(/^[-*]\s+/, '').trim()
        );
      }
    }
  }

  // Fallback: extract from first bullet list after intro
  const firstListPattern = isHtml
    ? /<ul[^>]*>((?:<li[^>]*>[^<]+<\/li>\s*)+)<\/ul>/i
    : /(?:^[-*]\s+[^\n]+\n?){3,}/m;

  const listMatch = firstListPattern.exec(content);
  if (listMatch && listMatch.index < content.length / 4) {
    const items = isHtml
      ? listMatch[1].match(/<li[^>]*>([^<]+)<\/li>/gi)?.map(li => li.replace(/<\/?li[^>]*>/gi, '').trim())
      : listMatch[0].match(/[-*]\s+([^\n]+)/g)?.map(item => item.replace(/^[-*]\s+/, '').trim());

    if (items && items.length >= 3 && items.length <= 6) {
      return items;
    }
  }

  return null;
}

// ============================================================================
// CTA PLACEMENT SUGGESTIONS
// ============================================================================

/**
 * Suggest optimal CTA placements based on content structure
 */
function suggestCtaPlacements(sections: ArticleSection[], content: string): CtaPlacement[] {
  const placements: CtaPlacement[] = [];

  // After intro (if intro is substantial)
  if (sections[0]?.content.length > 200) {
    placements.push({
      position: 'after-intro',
      priority: 'medium',
      sectionIndex: 0,
    });
  }

  // Mid-content (after ~40% of sections)
  const midIndex = Math.floor(sections.length * 0.4);
  if (sections.length >= 4) {
    placements.push({
      position: 'mid-content',
      priority: 'medium',
      sectionIndex: midIndex,
    });
  }

  // Before FAQ (if FAQ detected)
  const hasFaq = /(?:faq|veelgestelde\s+vragen|frequently\s+asked)/i.test(content);
  if (hasFaq) {
    placements.push({
      position: 'before-faq',
      priority: 'high',
    });
  }

  // End of content (always)
  placements.push({
    position: 'end',
    priority: 'high',
    sectionIndex: sections.length - 1,
  });

  return placements;
}

// ============================================================================
// SEO ANALYSIS
// ============================================================================

/**
 * Analyze content for SEO signals
 */
function analyzeSeo(
  content: string,
  headings: HeadingItem[],
  title?: string,
  isHtml: boolean = true
): ContentAnalysisResult['seoData'] {
  const hasH1 = headings.some(h => h.level === 1);
  const headingIssues: string[] = [];

  // Check heading hierarchy
  let previousLevel = 0;
  for (const heading of headings) {
    if (heading.level > previousLevel + 1 && previousLevel !== 0) {
      headingIssues.push(`Skipped heading level: H${previousLevel} to H${heading.level}`);
    }
    previousLevel = heading.level;
  }

  // Check for multiple H1s
  const h1Count = headings.filter(h => h.level === 1).length;
  if (h1Count > 1) {
    headingIssues.push(`Multiple H1 headings detected (${h1Count})`);
  }

  // Extract keywords from headings
  const headingKeywords = headings
    .filter(h => h.level <= 3)
    .flatMap(h => extractKeywords(h.text))
    .filter((kw, i, arr) => arr.indexOf(kw) === i);

  // Try to identify primary keyword
  const primaryKeyword = title
    ? extractKeywords(title)[0] || null
    : headingKeywords[0] || null;

  return {
    primaryKeyword,
    secondaryKeywords: headingKeywords.slice(1, 6),
    headingKeywords,
    hasH1,
    headingIssues,
  };
}

/**
 * Extract potential keywords from text
 */
function extractKeywords(text: string): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'de', 'het', 'een', 'en', 'van', 'in', 'is', 'op', 'te', 'dat', 'die',
    'voor', 'zijn', 'met', 'als', 'aan', 'om', 'maar', 'dan', 'nog', 'wel',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'hoe', 'wat', 'waarom', 'wanneer', 'wie', 'welke', 'how', 'what', 'why',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Count words in content
 */
function countWords(content: string, isHtml: boolean): number {
  // Remove HTML tags if needed
  const text = isHtml
    ? content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    : content;

  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Generate URL-friendly slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Check if content has sufficient structure for a specific template
 */
export function validateTemplateRequirements(
  analysis: ContentAnalysisResult,
  template: 'blog-article' | 'landing-page' | 'service-page'
): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];

  switch (template) {
    case 'blog-article':
      if (!analysis.structure.headings.some(h => h.level === 1)) {
        missing.push('H1 heading');
      }
      if (analysis.structure.headings.filter(h => h.level === 2).length < 2) {
        missing.push('At least 2 H2 headings');
      }
      if (analysis.structure.wordCount < 300) {
        missing.push('Minimum 300 words');
      }
      break;

    case 'landing-page':
      if (!analysis.components.benefits || analysis.components.benefits.length < 3) {
        missing.push('Benefits section (3+ items)');
      }
      break;

    case 'service-page':
      if (!analysis.components.processSteps || analysis.components.processSteps.length < 3) {
        missing.push('Process steps (3+ items)');
      }
      break;
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
}
