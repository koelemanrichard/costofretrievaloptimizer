// services/ai/schemaPageTypeDetector.ts
// Intelligent page type detection for schema generation

import type {
  SchemaPageType,
  ContentBrief,
  EnrichedTopic,
  BriefSection
} from '../../types';

// URL patterns for page type detection
const URL_PATTERNS: Record<SchemaPageType, RegExp[]> = {
  HomePage: [
    /^\/$/,
    /^\/index\.(html?|php)$/i,
    /^\/home\/?$/i
  ],
  Article: [
    /\/blog\//i,
    /\/article\//i,
    /\/post\//i,
    /\/news\//i,
    /\/\d{4}\/\d{2}\//i  // Date-based URLs
  ],
  BlogPosting: [
    /\/blog\//i,
    /\/posts?\//i
  ],
  NewsArticle: [
    /\/news\//i,
    /\/press\//i,
    /\/announcement/i
  ],
  Product: [
    /\/product\//i,
    /\/shop\//i,
    /\/store\//i,
    /\/item\//i,
    /\/buy\//i
  ],
  ProfilePage: [
    /\/author\//i,
    /\/team\//i,
    /\/about-?(us)?\/?$/i,
    /\/profile\//i,
    /\/people\//i,
    /\/staff\//i
  ],
  CollectionPage: [
    /\/category\//i,
    /\/tag\//i,
    /\/topics?\//i,
    /\/collection\//i,
    /\/archive\//i
  ],
  FAQPage: [
    /\/faq\/?$/i,
    /\/frequently-asked/i,
    /\/questions\/?$/i,
    /\/help\/?$/i
  ],
  HowTo: [
    /\/how-to-/i,
    /\/guide\//i,
    /\/tutorial\//i,
    /\/step-by-step/i
  ],
  WebPage: [] // Default fallback
};

// Content structure patterns
interface ContentStructure {
  hasFaqSections: boolean;
  hasHowToSteps: boolean;
  hasProductInfo: boolean;
  hasItemList: boolean;
  hasAuthorInfo: boolean;
  hasMultipleArticles: boolean;
  headingStructure: 'question-answer' | 'step-by-step' | 'standard' | 'mixed';
}

/**
 * Detect page type from URL pattern
 */
export function detectPageTypeFromUrl(url: string): SchemaPageType | null {
  // Extract path from URL
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    path = url.startsWith('/') ? url : `/${url}`;
  }

  // Check each pattern
  for (const [pageType, patterns] of Object.entries(URL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(path)) {
        return pageType as SchemaPageType;
      }
    }
  }

  return null;
}

/**
 * Analyze content structure for page type hints
 */
function analyzeContentStructure(
  brief: ContentBrief,
  draftContent?: string
): ContentStructure {
  const structure: ContentStructure = {
    hasFaqSections: false,
    hasHowToSteps: false,
    hasProductInfo: false,
    hasItemList: false,
    hasAuthorInfo: false,
    hasMultipleArticles: false,
    headingStructure: 'standard'
  };

  // Check outline for FAQ patterns
  const outline = brief.structured_outline || [];
  const allHeadings = getAllHeadings(outline);

  // FAQ detection: questions in headings
  const questionHeadings = allHeadings.filter(h =>
    h.heading.includes('?') ||
    /^(what|why|how|when|where|who|which|can|is|are|do|does|should|will|would)\s/i.test(h.heading)
  );
  structure.hasFaqSections = questionHeadings.length >= 3;

  // HowTo detection: step-based headings
  const stepHeadings = allHeadings.filter(h =>
    /^step\s*\d+/i.test(h.heading) ||
    /^\d+\.\s/i.test(h.heading) ||
    /^(first|second|third|finally|next|then)\s/i.test(h.heading)
  );
  structure.hasHowToSteps = stepHeadings.length >= 3;

  // Heading structure analysis
  if (questionHeadings.length > allHeadings.length * 0.5) {
    structure.headingStructure = 'question-answer';
  } else if (stepHeadings.length > allHeadings.length * 0.5) {
    structure.headingStructure = 'step-by-step';
  } else if (questionHeadings.length > 2 && stepHeadings.length > 2) {
    structure.headingStructure = 'mixed';
  }

  // Check for product-like content in brief
  const keywords = brief.targetKeyword?.toLowerCase() || '';
  const title = brief.title.toLowerCase();
  structure.hasProductInfo =
    keywords.includes('buy') ||
    keywords.includes('price') ||
    keywords.includes('product') ||
    title.includes('review') ||
    /\$\d+/.test(brief.metaDescription || '');

  // Check for list content (from SERP analysis)
  if (brief.serpAnalysis?.peopleAlsoAsk?.length > 3) {
    structure.hasItemList = true;
  }

  // Draft content analysis if available
  if (draftContent) {
    // Check for step markers in content
    const stepMatches = draftContent.match(/step\s*\d+|^\d+\.\s/gim);
    if (stepMatches && stepMatches.length >= 3) {
      structure.hasHowToSteps = true;
    }

    // Check for FAQ format
    const qaMatches = draftContent.match(/\?[\s\n]+[A-Z]/g);
    if (qaMatches && qaMatches.length >= 3) {
      structure.hasFaqSections = true;
    }
  }

  return structure;
}

/**
 * Get all headings from outline structure
 */
function getAllHeadings(sections: BriefSection[]): BriefSection[] {
  const headings: BriefSection[] = [];

  function traverse(items: BriefSection[]) {
    for (const item of items) {
      headings.push(item);
      if (item.subsections?.length) {
        traverse(item.subsections);
      }
    }
  }

  traverse(sections);
  return headings;
}

/**
 * Detect page type from topic metadata
 */
export function detectPageTypeFromTopic(topic: EnrichedTopic): SchemaPageType | null {
  // Check topic class
  if (topic.topic_class === 'monetization') {
    // Monetization topics are often product-related
    if (topic.title.toLowerCase().includes('price') ||
        topic.title.toLowerCase().includes('cost') ||
        topic.title.toLowerCase().includes('buy')) {
      return 'Product';
    }
  }

  // Check cluster role
  if (topic.cluster_role === 'pillar') {
    // Pillar pages are often comprehensive guides
    return 'Article';
  }

  // Check query type
  const queryType = topic.query_type?.toLowerCase();
  if (queryType) {
    if (queryType.includes('how') || queryType === 'process') {
      return 'HowTo';
    }
    if (queryType.includes('what') || queryType === 'definition') {
      return 'Article';
    }
    if (queryType.includes('comparison') || queryType.includes('versus')) {
      return 'Article';
    }
  }

  // Check canonical query
  const query = topic.canonical_query?.toLowerCase() || '';
  if (query.includes('how to')) {
    return 'HowTo';
  }
  if (query.includes('what is') || query.includes('what are')) {
    return 'Article';
  }

  return null;
}

/**
 * Detect page type from brief title patterns
 */
function detectPageTypeFromTitle(title: string): SchemaPageType | null {
  const lowerTitle = title.toLowerCase();

  // HowTo patterns
  if (lowerTitle.startsWith('how to') ||
      lowerTitle.includes('step-by-step') ||
      lowerTitle.includes('guide to') ||
      lowerTitle.includes('tutorial')) {
    return 'HowTo';
  }

  // FAQ patterns
  if (lowerTitle.includes('faq') ||
      lowerTitle.includes('frequently asked') ||
      lowerTitle.includes('common questions')) {
    return 'FAQPage';
  }

  // Product patterns
  if (lowerTitle.includes('review') ||
      lowerTitle.includes('vs') ||
      lowerTitle.includes('best') && (lowerTitle.includes('buy') || lowerTitle.includes('product'))) {
    return 'Product';
  }

  // Profile patterns
  if (lowerTitle.includes('about us') ||
      lowerTitle.includes('our team') ||
      lowerTitle.includes('meet the')) {
    return 'ProfilePage';
  }

  // Collection patterns
  if (lowerTitle.startsWith('all ') ||
      lowerTitle.includes('complete list') ||
      lowerTitle.includes('categories')) {
    return 'CollectionPage';
  }

  return null;
}

/**
 * Main page type detection function
 * Uses multiple signals to determine the best page type
 */
export function detectPageType(
  brief: ContentBrief,
  topic?: EnrichedTopic,
  url?: string,
  draftContent?: string
): { pageType: SchemaPageType; confidence: number; reasoning: string } {
  const signals: Array<{ type: SchemaPageType; weight: number; source: string }> = [];

  // 1. URL-based detection (high confidence)
  if (url) {
    const urlType = detectPageTypeFromUrl(url);
    if (urlType) {
      signals.push({ type: urlType, weight: 0.3, source: 'URL pattern' });
    }
  }

  // 2. Topic metadata-based detection
  if (topic) {
    const topicType = detectPageTypeFromTopic(topic);
    if (topicType) {
      signals.push({ type: topicType, weight: 0.25, source: 'Topic metadata' });
    }
  }

  // 3. Title-based detection
  const titleType = detectPageTypeFromTitle(brief.title);
  if (titleType) {
    signals.push({ type: titleType, weight: 0.2, source: 'Title pattern' });
  }

  // 4. Content structure analysis
  const structure = analyzeContentStructure(brief, draftContent);

  if (structure.hasFaqSections && structure.headingStructure === 'question-answer') {
    signals.push({ type: 'FAQPage', weight: 0.35, source: 'FAQ content structure' });
  }

  if (structure.hasHowToSteps && structure.headingStructure === 'step-by-step') {
    signals.push({ type: 'HowTo', weight: 0.35, source: 'How-to content structure' });
  }

  if (structure.hasProductInfo) {
    signals.push({ type: 'Product', weight: 0.2, source: 'Product indicators' });
  }

  // 5. Featured snippet target
  if (brief.featured_snippet_target) {
    if (brief.featured_snippet_target.target_type === 'LIST') {
      signals.push({ type: 'HowTo', weight: 0.15, source: 'Featured snippet target (list)' });
    }
    if (brief.featured_snippet_target.question.includes('?')) {
      signals.push({ type: 'FAQPage', weight: 0.1, source: 'Featured snippet target (question)' });
    }
  }

  // Calculate weighted scores per type
  const scores = new Map<SchemaPageType, { weight: number; sources: string[] }>();

  for (const signal of signals) {
    const existing = scores.get(signal.type);
    if (existing) {
      existing.weight += signal.weight;
      existing.sources.push(signal.source);
    } else {
      scores.set(signal.type, { weight: signal.weight, sources: [signal.source] });
    }
  }

  // Find highest scoring type
  let bestType: SchemaPageType = 'Article'; // Default
  let bestScore = 0;
  let bestSources: string[] = [];

  for (const [type, data] of scores) {
    if (data.weight > bestScore) {
      bestType = type;
      bestScore = data.weight;
      bestSources = data.sources;
    }
  }

  // If no strong signals, default to Article for blog-like content
  if (bestScore < 0.2) {
    bestType = 'Article';
    bestSources = ['Default for content'];
    bestScore = 0.5;
  }

  // Normalize confidence
  const confidence = Math.min(bestScore / 0.7, 1); // Cap at 1.0

  return {
    pageType: bestType,
    confidence,
    reasoning: `Detected ${bestType} based on: ${bestSources.join(', ')}`
  };
}

/**
 * Determine if page should use BlogPosting vs Article
 */
export function shouldUseBlogPosting(
  url?: string,
  topic?: EnrichedTopic
): boolean {
  if (url) {
    // Blog-specific URL patterns
    if (/\/blog\//i.test(url) || /\/posts?\//i.test(url)) {
      return true;
    }
  }

  if (topic) {
    // Informational topics are more blog-like
    if (topic.topic_class === 'informational') {
      return true;
    }
  }

  return false;
}

/**
 * Get recommended schema types for a page type
 * Returns the primary type and any secondary types that should be included
 */
export function getSchemaTypesForPageType(
  pageType: SchemaPageType,
  hasHowTo: boolean = false,
  hasFaq: boolean = false
): string[] {
  const types: string[] = [];

  // Primary type
  switch (pageType) {
    case 'HomePage':
      types.push('WebPage');
      break;
    case 'Article':
      types.push('Article');
      break;
    case 'BlogPosting':
      types.push('BlogPosting');
      break;
    case 'NewsArticle':
      types.push('NewsArticle');
      break;
    case 'Product':
      types.push('Product');
      break;
    case 'ProfilePage':
      types.push('ProfilePage');
      break;
    case 'CollectionPage':
      types.push('CollectionPage');
      break;
    case 'FAQPage':
      types.push('FAQPage');
      break;
    case 'HowTo':
      types.push('HowTo');
      break;
    default:
      types.push('WebPage');
  }

  // Secondary types based on content
  if (hasHowTo && pageType !== 'HowTo') {
    types.push('HowTo');
  }

  if (hasFaq && pageType !== 'FAQPage') {
    types.push('FAQPage');
  }

  // Always include WebPage as base
  if (!types.includes('WebPage') && pageType !== 'Product') {
    types.push('WebPage');
  }

  return types;
}

/**
 * Check if a page type supports rich results
 */
export function getRichResultEligibility(pageType: SchemaPageType): {
  eligible: boolean;
  richResultTypes: string[];
  requirements: string[];
} {
  switch (pageType) {
    case 'Article':
    case 'BlogPosting':
    case 'NewsArticle':
      return {
        eligible: true,
        richResultTypes: ['Article', 'AMP Article'],
        requirements: ['headline', 'image', 'datePublished', 'author', 'publisher']
      };

    case 'Product':
      return {
        eligible: true,
        richResultTypes: ['Product', 'Product with Review', 'Merchant listings'],
        requirements: ['name', 'image', 'offers', 'aggregateRating (optional)']
      };

    case 'FAQPage':
      return {
        eligible: true,
        richResultTypes: ['FAQ'],
        requirements: ['mainEntity with Question/Answer pairs']
      };

    case 'HowTo':
      return {
        eligible: true,
        richResultTypes: ['How-to'],
        requirements: ['name', 'step array with HowToStep']
      };

    case 'ProfilePage':
      return {
        eligible: true,
        richResultTypes: ['Profile page'],
        requirements: ['mainEntity (Person or Organization)']
      };

    default:
      return {
        eligible: false,
        richResultTypes: [],
        requirements: []
      };
  }
}
