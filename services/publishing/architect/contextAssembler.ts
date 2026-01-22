/**
 * Context Assembler Service
 *
 * Gathers rich context from multiple sources to enable intelligent
 * layout decisions. This is the foundation for context-aware blueprint generation.
 *
 * @module services/publishing/architect/contextAssembler
 */

import type { BusinessInfo, ContentBrief, EnrichedTopic, TopicalMap } from '../../../types';
import type {
  ArchitectInput,
  BusinessContext,
  ContentSignals,
  MarketContext,
  CompetitorContext,
  SiteContext,
  VisualStyle,
  ComponentType,
} from './blueprintTypes';
import { analyzeContent, type ContentAnalysisResult } from '../contentAnalyzer';
import { getLearnedPreferences, type LearnedPreferences } from '../refinement/patternLearning';
import { getDesignRecommendations, getCompetitorAnalyses } from '../refinement/competitorAnalysis';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Semantic section type classification
 */
export type SectionSemanticType =
  | 'definition'        // "What is X?"
  | 'benefits'          // Positive outcomes
  | 'features'          // Capabilities/characteristics
  | 'process'           // How to do something
  | 'comparison'        // X vs Y
  | 'faq'               // Questions & answers
  | 'testimonial'       // Social proof
  | 'case-study'        // Story/example
  | 'pricing'           // Cost information
  | 'cta'               // Call to action
  | 'technical'         // Specs/details
  | 'background'        // Context/history
  | 'problem-statement' // Pain points
  | 'solution'          // How it solves
  | 'summary'           // Recap
  | 'introduction'      // Opening content
  | 'conclusion';       // Closing content

/**
 * Parsed list structure
 */
export interface ParsedList {
  type: 'bullet' | 'numbered' | 'checklist';
  items: string[];
  isOrdered: boolean;
}

/**
 * Semantically parsed section
 */
export interface ParsedSection {
  id: string;
  heading: string;
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
  content: string;

  // Semantic understanding
  sectionType: SectionSemanticType;
  confidence: number;

  // Content structure
  structure: {
    paragraphs: string[];
    lists: ParsedList[];
    definitions: { term: string; definition: string }[];
    quotes: string[];
    callouts: { type: string; content: string }[];
  };

  // Relationships
  relationship: {
    toPrevious: 'continues' | 'contrasts' | 'elaborates' | 'new-topic';
    position: 'intro' | 'body' | 'conclusion';
    importance: 'supporting' | 'core' | 'key-takeaway';
  };
}

/**
 * Brand context with visual identity
 */
export interface BrandContext {
  name: string;
  industry: string;
  tone: string;
  positioning: string;
  targetAudience: string;
  // Visual identity
  primaryColor?: string;
  accentColor?: string;
  fontPairing?: { heading: string; body: string };
  logoStyle?: 'minimal' | 'detailed' | 'wordmark';
}

/**
 * Competitor layout pattern
 */
export interface CompetitorLayoutPattern {
  url: string;
  pageType: string;
  heroStyle?: 'full-width' | 'split' | 'minimal' | 'none';
  componentSequence: ComponentType[];
  emphasisDistribution: { position: 'top' | 'middle' | 'bottom'; componentType: ComponentType }[];
  ctaStrategy: {
    frequency: number;
    positions: ('hero' | 'mid' | 'end' | 'sticky')[];
    style: 'subtle' | 'prominent';
  };
  visualDensity: 'sparse' | 'moderate' | 'dense';
}

/**
 * SERP feature analysis
 */
export interface SerpFeatureAnalysis {
  featuredSnippetOpportunity: boolean;
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  dominantContentType: 'listicle' | 'guide' | 'comparison' | 'faq' | 'mixed';
  averageWordCount: number;
  commonHeadings: string[];
}

/**
 * Intent signals extracted from content brief
 */
export interface IntentSignals {
  buyerStage: 'awareness' | 'consideration' | 'decision';
  primaryAction: string;
  objections: string[];
  trustSignals: string[];
}

/**
 * Historical performance data
 */
export interface PerformanceContext {
  similarArticles: {
    title: string;
    visualStyle: VisualStyle;
    engagement: number;
  }[];
  refinementPatterns: LearnedPreferences | null;
  avoidPatterns: string[];
}

/**
 * Complete rich context for blueprint generation
 */
export interface RichArchitectContext {
  // Content Understanding
  content: {
    sections: ParsedSection[];
    contentType: string;
    readingLevel: 'basic' | 'intermediate' | 'advanced';
    emotionalTone: 'neutral' | 'urgent' | 'inspiring' | 'cautious';
    wordCount: number;
  };

  // Brand & Visual Identity
  brand: BrandContext;

  // Market Intelligence
  market: {
    competitorLayouts: CompetitorLayoutPattern[];
    serpFeatures: SerpFeatureAnalysis | null;
    industryNorms: IndustryDesignNorms;
  };

  // User Intent Signals
  intent: IntentSignals;

  // Historical Performance
  performance: PerformanceContext;
}

/**
 * Industry design norms
 */
export interface IndustryDesignNorms {
  preferredStyle: VisualStyle;
  colorIntensity: 'subtle' | 'moderate' | 'vibrant';
  pacing: 'dense' | 'balanced' | 'spacious';
  commonComponents: ComponentType[];
  ctaApproach: 'subtle' | 'moderate' | 'aggressive';
}

// ============================================================================
// INDUSTRY NORMS
// ============================================================================

const INDUSTRY_DESIGN_NORMS: Record<string, IndustryDesignNorms> = {
  'tech': {
    preferredStyle: 'minimal',
    colorIntensity: 'subtle',
    pacing: 'balanced',
    commonComponents: ['prose', 'bullet-list', 'timeline-vertical', 'faq-accordion'],
    ctaApproach: 'moderate',
  },
  'software': {
    preferredStyle: 'minimal',
    colorIntensity: 'subtle',
    pacing: 'balanced',
    commonComponents: ['prose', 'icon-list', 'tabs', 'faq-accordion'],
    ctaApproach: 'moderate',
  },
  'saas': {
    preferredStyle: 'minimal',
    colorIntensity: 'moderate',
    pacing: 'balanced',
    commonComponents: ['card-grid', 'icon-list', 'pricing-table', 'testimonial-grid'],
    ctaApproach: 'moderate',
  },
  'finance': {
    preferredStyle: 'editorial',
    colorIntensity: 'subtle',
    pacing: 'spacious',
    commonComponents: ['prose', 'data-table', 'highlight-box', 'faq-accordion'],
    ctaApproach: 'subtle',
  },
  'legal': {
    preferredStyle: 'editorial',
    colorIntensity: 'subtle',
    pacing: 'spacious',
    commonComponents: ['prose', 'bullet-list', 'accordion', 'highlight-box'],
    ctaApproach: 'subtle',
  },
  'health': {
    preferredStyle: 'warm-modern',
    colorIntensity: 'moderate',
    pacing: 'spacious',
    commonComponents: ['prose', 'icon-list', 'checklist', 'callout'],
    ctaApproach: 'moderate',
  },
  'wellness': {
    preferredStyle: 'warm-modern',
    colorIntensity: 'moderate',
    pacing: 'spacious',
    commonComponents: ['card-grid', 'timeline-zigzag', 'testimonial-single', 'callout'],
    ctaApproach: 'moderate',
  },
  'ecommerce': {
    preferredStyle: 'marketing',
    colorIntensity: 'vibrant',
    pacing: 'dense',
    commonComponents: ['card-grid', 'pros-cons', 'testimonial-carousel', 'cta-banner'],
    ctaApproach: 'aggressive',
  },
  'retail': {
    preferredStyle: 'marketing',
    colorIntensity: 'vibrant',
    pacing: 'balanced',
    commonComponents: ['card-grid', 'image-gallery', 'testimonial-grid', 'cta-inline'],
    ctaApproach: 'aggressive',
  },
  'creative': {
    preferredStyle: 'bold',
    colorIntensity: 'vibrant',
    pacing: 'spacious',
    commonComponents: ['image-hero', 'masonry-grid', 'pull-quote', 'video-embed'],
    ctaApproach: 'moderate',
  },
  'design': {
    preferredStyle: 'bold',
    colorIntensity: 'moderate',
    pacing: 'spacious',
    commonComponents: ['image-gallery', 'card-grid', 'testimonial-single', 'before-after'],
    ctaApproach: 'subtle',
  },
  'marketing': {
    preferredStyle: 'marketing',
    colorIntensity: 'vibrant',
    pacing: 'balanced',
    commonComponents: ['stat-cards', 'testimonial-carousel', 'case-study-card', 'cta-banner'],
    ctaApproach: 'aggressive',
  },
  'consulting': {
    preferredStyle: 'editorial',
    colorIntensity: 'subtle',
    pacing: 'balanced',
    commonComponents: ['prose', 'timeline-zigzag', 'case-study-card', 'testimonial-single'],
    ctaApproach: 'moderate',
  },
  'education': {
    preferredStyle: 'editorial',
    colorIntensity: 'moderate',
    pacing: 'balanced',
    commonComponents: ['prose', 'steps-numbered', 'accordion', 'highlight-box'],
    ctaApproach: 'subtle',
  },
};

const DEFAULT_INDUSTRY_NORMS: IndustryDesignNorms = {
  preferredStyle: 'editorial',
  colorIntensity: 'moderate',
  pacing: 'balanced',
  commonComponents: ['prose', 'bullet-list', 'faq-accordion', 'cta-inline'],
  ctaApproach: 'moderate',
};

// ============================================================================
// CONTEXT ASSEMBLY
// ============================================================================

/**
 * Assemble rich context for blueprint generation
 */
export async function assembleRichContext(
  articleContent: string,
  articleTitle: string,
  topicId: string,
  projectId: string,
  options?: {
    brief?: ContentBrief;
    topic?: EnrichedTopic;
    topicalMap?: TopicalMap;
    businessInfo?: BusinessInfo;
  }
): Promise<RichArchitectContext> {
  // Run parallel data fetches
  const [
    contentAnalysis,
    refinementHistory,
    competitorData,
  ] = await Promise.all([
    Promise.resolve(analyzeContent(articleContent, articleTitle)),
    fetchRefinementHistory(projectId).catch(() => null),
    fetchCompetitorData(projectId).catch(() => null),
  ]);

  // Parse content semantically
  const parsedSections = parseContentSemantics(articleContent, contentAnalysis);

  // Extract brand context
  const brand = extractBrandContext(options?.businessInfo, options?.topicalMap);

  // Get industry norms
  const industryNorms = inferIndustryNorms(brand.industry);

  // Extract intent signals
  const intent = extractIntentSignals(options?.brief, parsedSections);

  // Analyze content characteristics
  const contentType = inferContentType(parsedSections, contentAnalysis);
  const emotionalTone = inferEmotionalTone(articleContent);
  const readingLevel = inferReadingLevel(articleContent);

  // Build competitor layout patterns
  const competitorLayouts = buildCompetitorLayoutPatterns(competitorData);

  return {
    content: {
      sections: parsedSections,
      contentType,
      readingLevel,
      emotionalTone,
      wordCount: contentAnalysis.structure.wordCount,
    },
    brand,
    market: {
      competitorLayouts,
      serpFeatures: extractSerpFeatures(options?.brief),
      industryNorms,
    },
    intent,
    performance: {
      similarArticles: [],
      refinementPatterns: refinementHistory,
      avoidPatterns: refinementHistory?.avoidedComponents || [],
    },
  };
}

// ============================================================================
// CONTENT PARSING
// ============================================================================

/**
 * Parse content into semantic sections
 */
function parseContentSemantics(
  html: string,
  analysis: ContentAnalysisResult
): ParsedSection[] {
  const sections: ParsedSection[] = [];

  for (let i = 0; i < analysis.structure.sections.length; i++) {
    const section = analysis.structure.sections[i];
    const heading = section.heading || '';
    const content = section.content;

    // Multi-signal classification
    const typeSignals = {
      headingSignal: classifyByHeading(heading),
      structureSignal: classifyByStructure(content, analysis),
      keywordSignal: classifyByKeywords(content),
      positionSignal: classifyByPosition(i, analysis.structure.sections.length),
    };

    // Combine signals with weights
    const { type, confidence } = combineTypeSignals(typeSignals);

    // Determine position and importance
    const position = i === 0 ? 'intro' : i === analysis.structure.sections.length - 1 ? 'conclusion' : 'body';
    const importance = determineImportance(type, position);

    // Parse structure
    const structure = parseStructure(content);

    // Determine relationship to previous
    const toPrevious = i === 0 ? 'new-topic' : inferRelationship(
      sections[i - 1]?.sectionType,
      type,
      heading,
      sections[i - 1]?.heading || ''
    );

    sections.push({
      id: `section-${i}`,
      heading,
      headingLevel: (section.level || 2) as 1 | 2 | 3 | 4 | 5 | 6,
      content,
      sectionType: type,
      confidence,
      structure,
      relationship: {
        toPrevious,
        position,
        importance,
      },
    });
  }

  return sections;
}

/**
 * Classify section type by heading
 */
function classifyByHeading(heading: string): { type: SectionSemanticType; weight: number } {
  const h = heading.toLowerCase();

  const patterns: [SectionSemanticType, RegExp[]][] = [
    ['definition', [/wat is|what is|definitie|definition|betekenis|meaning/i]],
    ['benefits', [/voordel|benefit|advantage|waarom|why choose|pluspunt/i]],
    ['features', [/kenmer|feature|functie|capability|eigenschap/i]],
    ['process', [/hoe|how|stap|step|proces|guide|tutorial|instructie/i]],
    ['comparison', [/vergelijk|vs|versus|compare|verschil|difference|alternatief/i]],
    ['faq', [/vraag|faq|veelgesteld|frequently asked|q&a/i]],
    ['pricing', [/prijs|cost|tarief|price|kosten|budget/i]],
    ['testimonial', [/review|ervaring|testimonial|klant|customer say/i]],
    ['problem-statement', [/probleem|challenge|issue|pain point|frustrat/i]],
    ['solution', [/oplossing|solution|answer|fix|resolve/i]],
    ['summary', [/conclusie|summary|samenvatting|conclusion|takeaway/i]],
    ['introduction', [/inleiding|introduction|overview|intro/i]],
    ['technical', [/specificatie|spec|technical|requirement/i]],
  ];

  for (const [type, regexes] of patterns) {
    if (regexes.some(r => r.test(h))) {
      return { type, weight: 0.7 };
    }
  }

  return { type: 'background', weight: 0.3 };
}

/**
 * Classify section type by content structure
 */
function classifyByStructure(
  content: string,
  analysis: ContentAnalysisResult
): { type: SectionSemanticType; weight: number } {
  // Check for FAQ patterns
  if (analysis.components.faqItems && analysis.components.faqItems.length > 0) {
    const hasFaqContent = content.toLowerCase().includes('?') &&
      (content.includes('A:') || content.includes('Answer'));
    if (hasFaqContent) {
      return { type: 'faq', weight: 0.8 };
    }
  }

  // Check for process/steps patterns
  if (analysis.components.processSteps && analysis.components.processSteps.length > 0) {
    const hasStepPattern = /stap\s*\d|step\s*\d|\d\.\s+[A-Z]/i.test(content);
    if (hasStepPattern) {
      return { type: 'process', weight: 0.75 };
    }
  }

  // Check for benefits/features list
  if (analysis.components.benefits && analysis.components.benefits.length > 0) {
    return { type: 'benefits', weight: 0.7 };
  }

  // Check for comparison patterns
  const comparisonPatterns = /vs\.?|versus|compared to|in tegenstelling/i;
  if (comparisonPatterns.test(content)) {
    return { type: 'comparison', weight: 0.65 };
  }

  // Check for heavy list content
  const listItems = (content.match(/^[-*•]\s+/gm) || []).length;
  if (listItems >= 4) {
    return { type: 'features', weight: 0.5 };
  }

  return { type: 'background', weight: 0.2 };
}

/**
 * Classify section type by keywords
 */
function classifyByKeywords(content: string): { type: SectionSemanticType; weight: number } {
  const c = content.toLowerCase();

  const keywordScores: [SectionSemanticType, string[], number][] = [
    ['benefits', ['voordeel', 'benefit', 'advantage', 'profiteer', 'bespaar'], 0.6],
    ['problem-statement', ['probleem', 'uitdaging', 'frustrat', 'moeilijk', 'issue'], 0.6],
    ['solution', ['oplossing', 'solution', 'fix', 'resolve', 'answer'], 0.6],
    ['process', ['eerst', 'vervolgens', 'daarna', 'tenslotte', 'first', 'then', 'next', 'finally'], 0.5],
    ['testimonial', ['zegt', 'vertelt', 'ervaring', 'says', 'told us', 'experience'], 0.5],
    ['pricing', ['euro', 'dollar', '€', '$', 'per maand', 'per month', 'gratis', 'free'], 0.7],
  ];

  for (const [type, keywords, weight] of keywordScores) {
    if (keywords.some(kw => c.includes(kw))) {
      return { type, weight };
    }
  }

  return { type: 'background', weight: 0.1 };
}

/**
 * Classify section type by position
 */
function classifyByPosition(
  index: number,
  total: number
): { type: SectionSemanticType; weight: number } {
  if (index === 0) {
    return { type: 'introduction', weight: 0.4 };
  }
  if (index === total - 1) {
    return { type: 'summary', weight: 0.3 };
  }
  if (index === total - 2 && total > 4) {
    // Second to last is often FAQ or summary
    return { type: 'faq', weight: 0.2 };
  }
  return { type: 'background', weight: 0.1 };
}

/**
 * Combine classification signals
 */
function combineTypeSignals(signals: {
  headingSignal: { type: SectionSemanticType; weight: number };
  structureSignal: { type: SectionSemanticType; weight: number };
  keywordSignal: { type: SectionSemanticType; weight: number };
  positionSignal: { type: SectionSemanticType; weight: number };
}): { type: SectionSemanticType; confidence: number } {
  // Weight priorities: heading > structure > keywords > position
  const weights = {
    headingSignal: 3,
    structureSignal: 2.5,
    keywordSignal: 1.5,
    positionSignal: 1,
  };

  // Count votes for each type
  const votes = new Map<SectionSemanticType, number>();

  for (const [signalName, signal] of Object.entries(signals)) {
    const weight = weights[signalName as keyof typeof weights] * signal.weight;
    votes.set(signal.type, (votes.get(signal.type) || 0) + weight);
  }

  // Find highest scoring type
  let bestType: SectionSemanticType = 'background';
  let bestScore = 0;

  for (const [type, score] of votes) {
    if (score > bestScore) {
      bestType = type;
      bestScore = score;
    }
  }

  // Calculate confidence (normalize to 0-1)
  const maxPossibleScore = Object.values(weights).reduce((a, b) => a + b, 0);
  const confidence = Math.min(bestScore / maxPossibleScore, 1);

  return { type: bestType, confidence };
}

/**
 * Parse content structure (lists, quotes, etc.)
 */
function parseStructure(content: string): ParsedSection['structure'] {
  const paragraphs: string[] = [];
  const lists: ParsedList[] = [];
  const definitions: { term: string; definition: string }[] = [];
  const quotes: string[] = [];
  const callouts: { type: string; content: string }[] = [];

  // Extract paragraphs (simplified)
  const paragraphMatches = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  paragraphs.push(...paragraphMatches.slice(0, 10));

  // Extract bullet lists
  const bulletListMatch = content.match(/(?:^[-*•]\s+.+$\n?)+/gm);
  if (bulletListMatch) {
    for (const match of bulletListMatch) {
      const items = match
        .split('\n')
        .filter(line => /^[-*•]\s+/.test(line))
        .map(line => line.replace(/^[-*•]\s+/, '').trim());
      if (items.length > 0) {
        lists.push({ type: 'bullet', items, isOrdered: false });
      }
    }
  }

  // Extract numbered lists
  const numberedListMatch = content.match(/(?:^\d+[\.\)]\s+.+$\n?)+/gm);
  if (numberedListMatch) {
    for (const match of numberedListMatch) {
      const items = match
        .split('\n')
        .filter(line => /^\d+[\.\)]\s+/.test(line))
        .map(line => line.replace(/^\d+[\.\)]\s+/, '').trim());
      if (items.length > 0) {
        lists.push({ type: 'numbered', items, isOrdered: true });
      }
    }
  }

  // Extract quotes (blockquotes)
  const quoteMatches = content.match(/(?:^>\s*.+$\n?)+/gm);
  if (quoteMatches) {
    quotes.push(...quoteMatches.map(q => q.replace(/^>\s*/gm, '').trim()));
  }

  // Extract definitions (term: definition pattern)
  const defMatches = content.match(/^([^:\n]+):\s+(.+)$/gm);
  if (defMatches) {
    for (const match of defMatches.slice(0, 5)) {
      const parts = match.split(/:\s+/);
      if (parts.length >= 2 && parts[0].length < 50) {
        definitions.push({ term: parts[0], definition: parts.slice(1).join(': ') });
      }
    }
  }

  return { paragraphs, lists, definitions, quotes, callouts };
}

/**
 * Determine section importance
 */
function determineImportance(
  type: SectionSemanticType,
  position: 'intro' | 'body' | 'conclusion'
): 'supporting' | 'core' | 'key-takeaway' {
  // Key takeaway sections
  if (type === 'summary' || type === 'conclusion') {
    return 'key-takeaway';
  }

  // Core sections (main value)
  if (['benefits', 'features', 'process', 'solution', 'comparison', 'pricing'].includes(type)) {
    return 'core';
  }

  // FAQ is core if in body, supporting in conclusion
  if (type === 'faq') {
    return position === 'conclusion' ? 'supporting' : 'core';
  }

  return 'supporting';
}

/**
 * Infer relationship between sections
 */
function inferRelationship(
  prevType: SectionSemanticType | undefined,
  currentType: SectionSemanticType,
  currentHeading: string,
  prevHeading: string
): 'continues' | 'contrasts' | 'elaborates' | 'new-topic' {
  if (!prevType) return 'new-topic';

  // Check for continuation words
  const continuationWords = /ook|also|daarnaast|additionally|verder|moreover/i;
  if (continuationWords.test(currentHeading)) {
    return 'continues';
  }

  // Check for contrast words
  const contrastWords = /maar|however|echter|although|ondanks|despite/i;
  if (contrastWords.test(currentHeading)) {
    return 'contrasts';
  }

  // Same type often continues
  if (prevType === currentType) {
    return 'continues';
  }

  // Problem → Solution is elaboration
  if (prevType === 'problem-statement' && currentType === 'solution') {
    return 'elaborates';
  }

  // Features/Benefits often elaborate definition
  if (prevType === 'definition' && ['benefits', 'features'].includes(currentType)) {
    return 'elaborates';
  }

  return 'new-topic';
}

// ============================================================================
// BRAND & MARKET CONTEXT
// ============================================================================

/**
 * Extract brand context from business info
 */
function extractBrandContext(
  businessInfo?: BusinessInfo,
  topicalMap?: TopicalMap
): BrandContext {
  const business = topicalMap?.business_info || businessInfo;

  return {
    name: business?.projectName || '',
    industry: business?.industry || '',
    tone: inferTone(business),
    positioning: business?.valueProp || '',
    targetAudience: business?.audience || '',
    // Visual identity would come from brand kit if available
    primaryColor: undefined,
    accentColor: undefined,
    fontPairing: undefined,
    logoStyle: undefined,
  };
}

/**
 * Infer tone from business info
 */
function inferTone(business?: Partial<BusinessInfo>): string {
  if (!business) return 'professional';

  const expertise = (business.expertise || '').toLowerCase();
  const valueProp = (business.valueProp || '').toLowerCase();

  if (expertise.includes('friendly') || valueProp.includes('personal')) {
    return 'friendly';
  }
  if (expertise.includes('expert') || valueProp.includes('enterprise')) {
    return 'formal';
  }
  if (expertise.includes('innovative') || valueProp.includes('cutting-edge')) {
    return 'modern';
  }

  return 'professional';
}

/**
 * Infer industry norms
 */
function inferIndustryNorms(industry: string): IndustryDesignNorms {
  const industryLower = industry.toLowerCase();

  for (const [key, norms] of Object.entries(INDUSTRY_DESIGN_NORMS)) {
    if (industryLower.includes(key)) {
      return norms;
    }
  }

  return DEFAULT_INDUSTRY_NORMS;
}

/**
 * Extract SERP features from content brief
 */
function extractSerpFeatures(brief?: ContentBrief): SerpFeatureAnalysis | null {
  if (!brief?.serpAnalysis) return null;

  const serp = brief.serpAnalysis;

  // Extract common headings from competitor headings if available
  const commonHeadings: string[] = [];
  if (serp.competitorHeadings) {
    for (const competitor of serp.competitorHeadings.slice(0, 3)) {
      for (const heading of competitor.headings.slice(0, 5)) {
        if (!commonHeadings.includes(heading.text)) {
          commonHeadings.push(heading.text);
        }
      }
    }
  }

  return {
    featuredSnippetOpportunity: false, // Not available in current type
    peopleAlsoAsk: serp.peopleAlsoAsk || [],
    relatedSearches: [], // Not available in current type
    dominantContentType: inferDominantContentType(serp),
    averageWordCount: serp.avgWordCount || 1500,
    commonHeadings: commonHeadings.slice(0, 10),
  };
}

/**
 * Infer dominant content type from SERP
 */
function inferDominantContentType(
  serp: NonNullable<ContentBrief['serpAnalysis']>
): 'listicle' | 'guide' | 'comparison' | 'faq' | 'mixed' {
  // This would be more sophisticated in production
  if (serp.peopleAlsoAsk && serp.peopleAlsoAsk.length > 3) {
    return 'faq';
  }
  return 'guide';
}

/**
 * Extract intent signals from brief
 */
function extractIntentSignals(
  brief?: ContentBrief,
  sections?: ParsedSection[]
): IntentSignals {
  const intent = brief?.searchIntent?.toLowerCase() || '';

  let buyerStage: IntentSignals['buyerStage'] = 'awareness';
  if (intent.includes('transactional') || intent.includes('buy') || intent.includes('purchase')) {
    buyerStage = 'decision';
  } else if (intent.includes('commercial') || intent.includes('compare')) {
    buyerStage = 'consideration';
  }

  // Infer primary action
  let primaryAction = 'Learn more';
  if (buyerStage === 'decision') {
    primaryAction = 'Get started';
  } else if (buyerStage === 'consideration') {
    primaryAction = 'Compare options';
  }

  // Extract objections from FAQ sections
  const objections: string[] = [];
  const faqSection = sections?.find(s => s.sectionType === 'faq');
  if (faqSection) {
    for (const list of faqSection.structure.lists) {
      objections.push(...list.items.filter(item => item.includes('?')).slice(0, 3));
    }
  }

  return {
    buyerStage,
    primaryAction,
    objections,
    trustSignals: [],
  };
}

// ============================================================================
// CONTENT ANALYSIS HELPERS
// ============================================================================

/**
 * Infer content type from parsed sections
 */
function inferContentType(
  sections: ParsedSection[],
  analysis: ContentAnalysisResult
): string {
  const types = sections.map(s => s.sectionType);

  if (types.includes('comparison')) return 'comparison';
  if (types.includes('process') && types.filter(t => t === 'process').length >= 2) return 'how-to';
  if (types.includes('faq') && types.filter(t => t === 'faq').length >= 1) return 'faq-guide';
  if (types.includes('pricing')) return 'commercial';
  if (types.includes('testimonial') || types.includes('case-study')) return 'marketing';
  if (analysis.structure.wordCount > 2500) return 'comprehensive-guide';

  return 'informational';
}

/**
 * Infer emotional tone from content
 */
function inferEmotionalTone(content: string): 'neutral' | 'urgent' | 'inspiring' | 'cautious' {
  const c = content.toLowerCase();

  // Urgent patterns
  if (/nu|vandaag|direct|snel|urgent|important|immediately|today|hurry/i.test(c)) {
    return 'urgent';
  }

  // Inspiring patterns
  if (/transformeer|unlock|achieve|succeed|dream|potential|empower/i.test(c)) {
    return 'inspiring';
  }

  // Cautious patterns
  if (/waarschuwing|let op|risico|avoid|beware|careful|important to note/i.test(c)) {
    return 'cautious';
  }

  return 'neutral';
}

/**
 * Infer reading level from content
 */
function inferReadingLevel(content: string): 'basic' | 'intermediate' | 'advanced' {
  const words = content.split(/\s+/);
  const avgWordLength = content.replace(/[^a-zA-Z]/g, '').length / (words.length || 1);

  // Check for technical terms
  const technicalTerms = /algorithm|implementation|infrastructure|methodology|optimization|integration/gi;
  const technicalCount = (content.match(technicalTerms) || []).length;

  if (avgWordLength > 7 || technicalCount > 5) {
    return 'advanced';
  }
  if (avgWordLength < 5 && technicalCount < 2) {
    return 'basic';
  }

  return 'intermediate';
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch refinement history for project
 */
async function fetchRefinementHistory(projectId: string): Promise<LearnedPreferences | null> {
  try {
    return await getLearnedPreferences(projectId);
  } catch {
    return null;
  }
}

/**
 * Fetch competitor data for project
 */
async function fetchCompetitorData(projectId: string) {
  try {
    const analyses = await getCompetitorAnalyses(projectId);
    const recommendations = await getDesignRecommendations(projectId);
    return { analyses, recommendations };
  } catch {
    return null;
  }
}

/**
 * Build competitor layout patterns from analysis data
 */
function buildCompetitorLayoutPatterns(
  competitorData: Awaited<ReturnType<typeof fetchCompetitorData>>
): CompetitorLayoutPattern[] {
  if (!competitorData?.analyses) return [];

  return competitorData.analyses.map(analysis => ({
    url: analysis.competitorUrl,
    pageType: 'article',
    heroStyle: analysis.designPatterns.layoutPatterns.includes('full-width') ? 'full-width' : 'standard' as 'full-width' | 'split' | 'minimal' | 'none',
    componentSequence: Object.keys(analysis.designPatterns.componentUsage) as ComponentType[],
    emphasisDistribution: [],
    ctaStrategy: {
      frequency: analysis.designPatterns.ctaStyle.intensity === 'prominent' ? 3 : 1,
      positions: analysis.designPatterns.ctaStyle.placements as ('hero' | 'mid' | 'end' | 'sticky')[],
      style: analysis.designPatterns.ctaStyle.intensity === 'subtle' ? 'subtle' : 'prominent',
    },
    visualDensity: analysis.designPatterns.spacing === 'dense' ? 'dense' : analysis.designPatterns.spacing === 'spacious' ? 'sparse' : 'moderate',
  }));
}

// ============================================================================
// CONVERT TO ARCHITECT INPUT
// ============================================================================

/**
 * Convert rich context to ArchitectInput for backward compatibility
 */
export function toArchitectInput(
  richContext: RichArchitectContext,
  articleContent: string,
  articleTitle: string,
  options?: {
    brief?: ContentBrief;
    preferences?: {
      styleLeaning?: 'conservative' | 'modern' | 'bold' | 'auto';
      avoidPatterns?: string[];
      preferPatterns?: string[];
    };
  }
): ArchitectInput {
  // Map content signals
  const contentSignals: ContentSignals = {
    pageType: richContext.content.contentType,
    buyerJourneyStage: richContext.intent.buyerStage,
    primaryIntent: mapPrimaryIntent(richContext),
    keyDifferentiators: [],
    hasProcessSteps: richContext.content.sections.some(s => s.sectionType === 'process'),
    hasFaq: richContext.content.sections.some(s => s.sectionType === 'faq'),
    hasTestimonials: richContext.content.sections.some(s => s.sectionType === 'testimonial'),
    hasBenefits: richContext.content.sections.some(s => s.sectionType === 'benefits'),
    hasComparison: richContext.content.sections.some(s => s.sectionType === 'comparison'),
    wordCount: richContext.content.wordCount,
    readingLevel: richContext.content.readingLevel === 'basic' ? 'simple' :
                  richContext.content.readingLevel === 'advanced' ? 'advanced' : 'moderate',
  };

  // Map business context
  const business: BusinessContext = {
    name: richContext.brand.name,
    industry: richContext.brand.industry,
    tone: richContext.brand.tone,
    positioning: richContext.brand.positioning,
    targetAudience: richContext.brand.targetAudience,
  };

  // Build market context
  const marketContext: MarketContext | undefined = richContext.market.competitorLayouts.length > 0 ? {
    industryNorms: [
      `Preferred style: ${richContext.market.industryNorms.preferredStyle}`,
      `CTA approach: ${richContext.market.industryNorms.ctaApproach}`,
      `Pacing: ${richContext.market.industryNorms.pacing}`,
    ],
    trendingPatterns: richContext.market.industryNorms.commonComponents,
    audienceExpectations: [],
  } : undefined;

  // Build competitor context
  const competitorContext: CompetitorContext | undefined = richContext.market.competitorLayouts.length > 0 ? {
    patterns: richContext.market.competitorLayouts.map(c => c.componentSequence.join(', ')),
    strengths: [],
    differentiationOpportunity: findDifferentiationOpportunity(richContext),
  } : undefined;

  return {
    articleContent,
    articleTitle,
    contentBrief: options?.brief ? {
      metaDescription: options.brief.metaDescription || '',
      targetKeyword: options.brief.targetKeyword || '',
      secondaryKeywords: [],
      intent: options.brief.searchIntent || '',
    } : undefined,
    business,
    marketContext,
    competitorContext,
    contentSignals,
    preferences: {
      styleLeaning: options?.preferences?.styleLeaning || 'auto',
      avoidPatterns: [
        ...(options?.preferences?.avoidPatterns || []),
        ...(richContext.performance.avoidPatterns || []),
      ],
      preferPatterns: options?.preferences?.preferPatterns,
    },
  };
}

/**
 * Map primary intent from rich context
 */
function mapPrimaryIntent(ctx: RichArchitectContext): ContentSignals['primaryIntent'] {
  if (ctx.content.sections.some(s => s.sectionType === 'comparison')) return 'compare';
  if (ctx.content.sections.some(s => s.sectionType === 'process')) return 'instruct';
  if (ctx.intent.buyerStage === 'decision') return 'persuade';
  return 'inform';
}

/**
 * Find differentiation opportunity from competitor analysis
 */
function findDifferentiationOpportunity(ctx: RichArchitectContext): string {
  // Find components not used by competitors
  const allCompetitorComponents = new Set(
    ctx.market.competitorLayouts.flatMap(c => c.componentSequence)
  );

  const underusedComponents = ctx.market.industryNorms.commonComponents
    .filter(c => !allCompetitorComponents.has(c));

  if (underusedComponents.length > 0) {
    return `Consider using ${underusedComponents[0]} which competitors aren't leveraging`;
  }

  // Check CTA approach
  const competitorCtaStyles = ctx.market.competitorLayouts.map(c => c.ctaStrategy.style);
  if (competitorCtaStyles.every(s => s === 'prominent')) {
    return 'Competitors use aggressive CTAs; consider a more subtle, trust-building approach';
  }
  if (competitorCtaStyles.every(s => s === 'subtle')) {
    return 'Competitors use subtle CTAs; consider being more direct with calls to action';
  }

  return '';
}
