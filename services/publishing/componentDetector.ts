/**
 * Component Detector Service
 *
 * Detects semantic components in content including:
 * - Key Takeaways boxes
 * - FAQ sections
 * - Tables of Contents
 * - CTAs and conversion elements
 * - Author boxes
 * - Images and galleries
 *
 * @module services/publishing/componentDetector
 */

import type {
  DetectedComponent,
  ContentTypeTemplate,
} from '../../types/publishing';

// ============================================================================
// Component Detection Patterns
// ============================================================================

/**
 * Patterns for detecting components in HTML/Markdown content
 */
const componentPatterns = {
  // Key Takeaways detection
  keyTakeaways: [
    // HTML patterns
    /<(?:div|section|aside)[^>]*class="[^"]*(?:key-?takeaways?|takeaways|highlights|summary-box|tldr)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|aside)>/gi,
    // Markdown patterns (heading-based)
    /(?:^|\n)#{1,3}\s*(?:Key\s+Takeaways?|TL;?DR|Summary|Highlights)\s*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n$)/gi,
    // Bullet list after specific headings
    /(?:^|\n)(?:\*\*|##?\s*)(?:Key\s+Takeaways?|What\s+You['']ll\s+Learn)[:\s]*\n((?:\s*[-*]\s+.+\n?)+)/gi,
  ],

  // FAQ detection
  faq: [
    // HTML FAQ schema or class
    /<(?:div|section)[^>]*(?:itemtype="[^"]*FAQPage[^"]*"|class="[^"]*faq[^"]*")[^>]*>([\s\S]*?)<\/(?:div|section)>/gi,
    // Markdown FAQ section
    /(?:^|\n)#{1,3}\s*(?:FAQ|Frequently\s+Asked\s+Questions?|Common\s+Questions?)\s*\n([\s\S]*?)(?=\n#{1,2}\s[^#]|\n---|\n$)/gi,
    // Q&A pattern (Question: Answer:)
    /(?:^|\n)(?:\*\*Q[:\.]?\s*|Q[:\.]?\s*)(.+?)\n(?:\*\*A[:\.]?\s*|A[:\.]?\s*)(.+?)(?=\n(?:\*\*Q|Q[:\.])|$)/gi,
  ],

  // Table of Contents detection
  toc: [
    // HTML ToC
    /<(?:nav|div)[^>]*class="[^"]*(?:toc|table-of-contents|contents)[^"]*"[^>]*>([\s\S]*?)<\/(?:nav|div)>/gi,
    // Markdown ToC
    /(?:^|\n)#{1,3}\s*(?:Table\s+of\s+Contents?|Contents?|In\s+This\s+Article)\s*\n((?:\s*[-*]\s+\[.+?\]\(.+?\)\n?)+)/gi,
  ],

  // CTA detection
  cta: [
    // HTML CTA buttons/boxes
    /<(?:div|section|a)[^>]*class="[^"]*(?:cta|call-to-action|signup|subscribe|get-started)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|a)>/gi,
    // Button patterns
    /<(?:button|a)[^>]*(?:class="[^"]*(?:btn|button)[^"]*"|href="[^"]*(?:signup|register|subscribe|contact))[^>]*>([\s\S]*?)<\/(?:button|a)>/gi,
    // Markdown CTA patterns
    /\[(?:Get\s+Started|Sign\s+Up|Subscribe|Contact\s+Us|Book\s+(?:a\s+)?(?:Call|Demo)|Start\s+Free\s+Trial)[^\]]*\]\([^)]+\)/gi,
  ],

  // Author box detection
  authorBox: [
    // HTML author box
    /<(?:div|section|aside)[^>]*class="[^"]*(?:author|byline|bio|about-author)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|aside)>/gi,
    // Schema.org Author
    /<[^>]*itemtype="[^"]*Person[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/gi,
  ],

  // Hero section detection
  hero: [
    // HTML hero
    /<(?:div|section|header)[^>]*class="[^"]*(?:hero|banner|jumbotron|masthead)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|header)>/gi,
    // First h1 with following paragraph
    /^(#{1}\s+.+\n+(?:[^#\n].+\n)*)/m,
  ],

  // Image detection
  image: [
    // HTML images
    /<(?:img|figure)[^>]*(?:src=|class="[^"]*(?:featured|hero|gallery))[^>]*>/gi,
    // Markdown images
    /!\[([^\]]*)\]\(([^)]+)\)/g,
  ],

  // Table detection
  table: [
    // HTML tables
    /<table[^>]*>([\s\S]*?)<\/table>/gi,
    // Markdown tables
    /(?:^|\n)\|.+\|\n\|[\s:-]+\|\n(?:\|.+\|\n)+/gm,
  ],

  // List detection (ordered and unordered)
  list: [
    // HTML lists
    /<(?:ul|ol)[^>]*>([\s\S]*?)<\/(?:ul|ol)>/gi,
    // Markdown unordered lists
    /(?:^|\n)((?:\s*[-*+]\s+.+\n?)+)/gm,
    // Markdown ordered lists
    /(?:^|\n)((?:\s*\d+\.\s+.+\n?)+)/gm,
  ],

  // Content section detection
  contentSection: [
    // HTML sections with headings
    /<(?:section|div)[^>]*>([\s\S]*?<h[2-4][^>]*>[\s\S]*?)<\/(?:section|div)>/gi,
    // Markdown sections (h2-h4)
    /(?:^|\n)(#{2,4}\s+.+\n[\s\S]*?)(?=\n#{1,4}\s|\n$)/gm,
  ],
};

// ============================================================================
// Component Detection Functions
// ============================================================================

/**
 * Detect all components in content
 */
export function detectComponents(content: string): DetectedComponent[] {
  const components: DetectedComponent[] = [];
  const usedRanges: Array<{ start: number; end: number }> = [];

  // Helper to check if a range overlaps with existing
  const isOverlapping = (start: number, end: number): boolean => {
    return usedRanges.some(range =>
      (start >= range.start && start < range.end) ||
      (end > range.start && end <= range.end) ||
      (start <= range.start && end >= range.end)
    );
  };

  // Helper to add a detected component
  const addComponent = (
    type: DetectedComponent['type'],
    match: RegExpExecArray,
    metadata?: Record<string, unknown>
  ): void => {
    const start = match.index;
    const end = start + match[0].length;

    if (!isOverlapping(start, end)) {
      components.push({
        type,
        startIndex: start,
        endIndex: end,
        content: match[0],
        metadata,
      });
      usedRanges.push({ start, end });
    }
  };

  // Detect each component type (in order of specificity)
  const detectionOrder: Array<{ type: DetectedComponent['type']; patterns: RegExp[] }> = [
    { type: 'key-takeaways', patterns: componentPatterns.keyTakeaways },
    { type: 'faq', patterns: componentPatterns.faq },
    { type: 'toc', patterns: componentPatterns.toc },
    { type: 'author-box', patterns: componentPatterns.authorBox },
    { type: 'cta', patterns: componentPatterns.cta },
    { type: 'hero', patterns: componentPatterns.hero },
    { type: 'table', patterns: componentPatterns.table },
    { type: 'image', patterns: componentPatterns.image },
    { type: 'list', patterns: componentPatterns.list },
    { type: 'content-section', patterns: componentPatterns.contentSection },
  ];

  for (const { type, patterns } of detectionOrder) {
    for (const pattern of patterns) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        addComponent(type, match);
      }
    }
  }

  // Sort by position
  components.sort((a, b) => a.startIndex - b.startIndex);

  return components;
}

/**
 * Detect specific component type
 */
export function detectComponentByType(
  content: string,
  type: DetectedComponent['type']
): DetectedComponent[] {
  const patterns = componentPatterns[type.replace('-', '') as keyof typeof componentPatterns];
  if (!patterns) return [];

  const components: DetectedComponent[] = [];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      components.push({
        type,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        content: match[0],
      });
    }
  }

  return components.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Check if content contains a specific component
 */
export function hasComponent(content: string, type: DetectedComponent['type']): boolean {
  return detectComponentByType(content, type).length > 0;
}

/**
 * Extract FAQ items from content
 */
export function extractFaqItems(content: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];

  // Try HTML FAQ schema
  const schemaPattern = /<div[^>]*itemtype="[^"]*Question[^"]*"[^>]*>[\s\S]*?<[^>]*itemprop="name"[^>]*>([^<]+)<[\s\S]*?<[^>]*itemprop="acceptedAnswer"[^>]*>[\s\S]*?<[^>]*itemprop="text"[^>]*>([^<]+)</gi;
  let match: RegExpExecArray | null;

  while ((match = schemaPattern.exec(content)) !== null) {
    faqs.push({
      question: match[1].trim(),
      answer: match[2].trim(),
    });
  }

  if (faqs.length > 0) return faqs;

  // Try Markdown Q&A pattern
  const qaPattern = /(?:^|\n)(?:\*\*)?(?:Q[:\.]?\s*)?(.+?)(?:\*\*)?\n(?:\*\*)?(?:A[:\.]?\s*)?(.+?)(?=\n(?:\*\*)?Q|\n#{1,3}|$)/gi;
  while ((match = qaPattern.exec(content)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    if (question && answer && question.includes('?')) {
      faqs.push({ question, answer });
    }
  }

  // Try heading-based FAQ
  const headingPattern = /(?:^|\n)#{3,4}\s*(.+\?)\s*\n([\s\S]*?)(?=\n#{3,4}|$)/gi;
  while ((match = headingPattern.exec(content)) !== null) {
    faqs.push({
      question: match[1].trim(),
      answer: match[2].trim(),
    });
  }

  return faqs;
}

/**
 * Extract key takeaways from content
 */
export function extractKeyTakeaways(content: string): string[] {
  const takeaways: string[] = [];

  // Find key takeaways section
  const components = detectComponentByType(content, 'key-takeaways');
  if (components.length === 0) return takeaways;

  const section = components[0].content;

  // Extract bullet points
  const bulletPattern = /[-*]\s+(.+)/g;
  let match: RegExpExecArray | null;
  while ((match = bulletPattern.exec(section)) !== null) {
    takeaways.push(match[1].trim());
  }

  // Extract numbered items
  const numberedPattern = /\d+\.\s+(.+)/g;
  while ((match = numberedPattern.exec(section)) !== null) {
    takeaways.push(match[1].trim());
  }

  return takeaways;
}

/**
 * Extract headings for ToC generation
 */
export function extractHeadings(
  content: string,
  maxDepth: number = 3
): Array<{ level: number; text: string; id: string }> {
  const headings: Array<{ level: number; text: string; id: string }> = [];

  // HTML headings
  const htmlPattern = /<h([1-6])[^>]*(?:id="([^"]*)")?[^>]*>([^<]+)<\/h[1-6]>/gi;
  let match: RegExpExecArray | null;

  while ((match = htmlPattern.exec(content)) !== null) {
    const level = parseInt(match[1], 10);
    if (level <= maxDepth) {
      const text = match[3].trim();
      const id = match[2] || slugify(text);
      headings.push({ level, text, id });
    }
  }

  if (headings.length > 0) return headings;

  // Markdown headings
  const mdPattern = /^(#{1,6})\s+(.+)$/gm;
  while ((match = mdPattern.exec(content)) !== null) {
    const level = match[1].length;
    if (level <= maxDepth) {
      const text = match[2].trim();
      const id = slugify(text);
      headings.push({ level, text, id });
    }
  }

  return headings;
}

/**
 * Create slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ============================================================================
// Template Recommendation
// ============================================================================

/**
 * Analyze content and suggest best template
 */
export function suggestTemplateFromContent(content: string): {
  template: ContentTypeTemplate;
  confidence: number;
  reasons: string[];
} {
  const components = detectComponents(content);
  const scores: Record<ContentTypeTemplate, { score: number; reasons: string[] }> = {
    'blog-article': { score: 0, reasons: [] },
    'landing-page': { score: 0, reasons: [] },
    'ecommerce-product': { score: 0, reasons: [] },
    'ecommerce-category': { score: 0, reasons: [] },
    'service-page': { score: 0, reasons: [] },
  };

  // Analyze component presence
  const componentCounts = components.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Blog article indicators
  if (componentCounts['content-section'] >= 3) {
    scores['blog-article'].score += 3;
    scores['blog-article'].reasons.push('Multiple content sections');
  }
  if (componentCounts['faq']) {
    scores['blog-article'].score += 2;
    scores['blog-article'].reasons.push('FAQ section present');
  }
  if (componentCounts['key-takeaways']) {
    scores['blog-article'].score += 2;
    scores['blog-article'].reasons.push('Key takeaways present');
  }
  if (componentCounts['author-box']) {
    scores['blog-article'].score += 3;
    scores['blog-article'].reasons.push('Author box present');
  }

  // Landing page indicators
  if (componentCounts['cta'] >= 2) {
    scores['landing-page'].score += 3;
    scores['landing-page'].reasons.push('Multiple CTAs');
  }
  if (componentCounts['hero']) {
    scores['landing-page'].score += 2;
    scores['landing-page'].reasons.push('Hero section present');
  }

  // Product page indicators
  if (componentCounts['table'] >= 2) {
    scores['ecommerce-product'].score += 2;
    scores['ecommerce-product'].reasons.push('Multiple tables (specs)');
  }
  if (componentCounts['image'] >= 3) {
    scores['ecommerce-product'].score += 2;
    scores['ecommerce-product'].reasons.push('Multiple images (gallery)');
  }
  if (/\$\d+(\.\d{2})?|\bprice\b/i.test(content)) {
    scores['ecommerce-product'].score += 3;
    scores['ecommerce-product'].reasons.push('Price information detected');
  }

  // Service page indicators
  if (/\b(?:our\s+)?(?:services?|solutions?)\b/i.test(content)) {
    scores['service-page'].score += 2;
    scores['service-page'].reasons.push('Service-oriented language');
  }
  if (/\b(?:contact|consultation|quote)\b/i.test(content)) {
    scores['service-page'].score += 2;
    scores['service-page'].reasons.push('Contact/consultation language');
  }

  // Find best match
  let bestTemplate: ContentTypeTemplate = 'blog-article';
  let bestScore = 0;

  for (const [template, { score }] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template as ContentTypeTemplate;
    }
  }

  // Calculate confidence (0-1)
  const maxPossibleScore = 10;
  const confidence = Math.min(bestScore / maxPossibleScore, 1);

  return {
    template: bestTemplate,
    confidence,
    reasons: scores[bestTemplate].reasons,
  };
}

/**
 * Get component summary for UI display
 */
export function getComponentSummary(content: string): {
  total: number;
  byType: Record<string, number>;
  hasFaq: boolean;
  hasTakeaways: boolean;
  hasToc: boolean;
  hasImages: boolean;
  hasTables: boolean;
} {
  const components = detectComponents(content);
  const byType = components.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: components.length,
    byType,
    hasFaq: !!byType['faq'],
    hasTakeaways: !!byType['key-takeaways'],
    hasToc: !!byType['toc'],
    hasImages: !!byType['image'],
    hasTables: !!byType['table'],
  };
}
