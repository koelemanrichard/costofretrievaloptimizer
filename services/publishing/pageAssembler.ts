/**
 * Page Assembler
 *
 * Orchestrates the complete page assembly process:
 * - Analyzes content structure
 * - Extracts semantic data
 * - Generates HTML with proper SEO structure
 * - Generates CSS from design personality
 * - Produces JSON-LD structured data
 *
 * @module services/publishing/pageAssembler
 */

import { SemanticHtmlBuilder } from './htmlBuilder';
import type {
  ArticleSection,
  FaqItem,
  TimelineStep,
  TestimonialItem,
  BenefitItem,
  CtaConfig,
  HeadingItem,
} from './htmlBuilder';
import { analyzeContent, type ContentAnalysisResult, type CtaPlacement } from './contentAnalyzer';
import { extractSemanticData, type SemanticContentData } from './semanticExtractor';
import { generateJsonLd, type JsonLdOptions } from './jsonLdGenerator';
import { expandVocabulary, enhanceImageAltTexts, type ExpansionResult } from './vocabularyExpander';
import { generateDesignSystemCss, type GeneratedCss } from './cssGenerator';
import { designPersonalities, type DesignPersonality } from '../../config/designTokens/personalities';
import type { ContentBrief, EnrichedTopic, TopicalMap } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

export type PageTemplate = 'landing-page' | 'service-page' | 'blog-article' | 'product-page' | 'comparison' | 'faq-page';

export interface PageAssemblyOptions {
  template: PageTemplate;
  content: string;
  title: string;
  personalityId: string;
  brief?: ContentBrief;
  topic?: EnrichedTopic;
  topicalMap?: TopicalMap;
  seoConfig?: SeoConfiguration;
  ctaConfig?: CtaConfiguration;
  darkMode?: boolean;
  minifyCss?: boolean;
}

export interface SeoConfiguration {
  title: string;
  metaDescription: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  canonicalUrl?: string;
  datePublished?: string;
  dateModified?: string;
  author?: {
    name: string;
    title?: string;
    bio?: string;
    imageUrl?: string;
  };
}

export interface CtaConfiguration {
  primaryCta: { text: string; url: string };
  secondaryCta?: { text: string; url: string };
  heroCta?: { text: string; url: string };
  heroSecondaryCta?: { text: string; url: string };
  sidebarCta?: CtaConfig;
  bannerTitle?: string;
  bannerText?: string;
}

export interface StyledContentOutput {
  html: string;
  css: string;
  jsonLd: string;
  components: DetectedComponent[];
  seoValidation: SeoValidationResult;
  metadata: AssemblyMetadata;
}

export interface DetectedComponent {
  type: string;
  count: number;
  variants?: string[];
}

export interface SeoValidationResult {
  isValid: boolean;
  score: number;
  issues: SeoIssue[];
  passed: string[];
}

export interface SeoIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
}

export interface AssemblyMetadata {
  template: PageTemplate;
  personalityId: string;
  wordCount: number;
  readingTime: number;
  componentsUsed: string[];
  timestamp: string;
}

// ============================================================================
// MAIN ASSEMBLY FUNCTION
// ============================================================================

/**
 * Assemble a complete styled page from content and configuration
 */
export function assemblePage(options: PageAssemblyOptions): StyledContentOutput {
  const {
    template,
    content,
    title,
    personalityId,
    brief,
    topic,
    topicalMap,
    seoConfig,
    ctaConfig,
    darkMode = true,
    minifyCss = false,
  } = options;

  // Get design personality
  const personality = designPersonalities[personalityId] || designPersonalities['corporate-professional'];

  // Analyze content structure
  const analysis = analyzeContent(content, title);

  // Extract semantic data if brief is available
  const semanticData = brief && topic && topicalMap
    ? extractSemanticData(brief, topic, topicalMap)
    : createDefaultSemanticData(title, seoConfig);

  // Expand vocabulary in content
  const expandedResult = expandVocabulary(content, semanticData);
  const expandedContent = expandedResult.content;
  const contentWithEnhancedAlt = enhanceImageAltTexts(expandedContent, semanticData);

  // Re-analyze after vocabulary expansion
  const enhancedAnalysis = analyzeContent(contentWithEnhancedAlt, title);

  // Build effective SEO config
  const effectiveSeoConfig = buildEffectiveSeoConfig(seoConfig, semanticData, title);

  // Build effective CTA config
  const effectiveCtaConfig = buildEffectiveCtaConfig(ctaConfig);

  // Select assembly strategy based on template
  switch (template) {
    case 'landing-page':
      return assembleLandingPage(personality, enhancedAnalysis, semanticData, effectiveSeoConfig, effectiveCtaConfig, darkMode, minifyCss);
    case 'service-page':
      return assembleServicePage(personality, enhancedAnalysis, semanticData, effectiveSeoConfig, effectiveCtaConfig, darkMode, minifyCss);
    case 'blog-article':
      return assembleBlogArticle(personality, enhancedAnalysis, semanticData, effectiveSeoConfig, effectiveCtaConfig, darkMode, minifyCss);
    case 'product-page':
      return assembleProductPage(personality, enhancedAnalysis, semanticData, effectiveSeoConfig, effectiveCtaConfig, darkMode, minifyCss);
    case 'comparison':
      return assembleComparisonPage(personality, enhancedAnalysis, semanticData, effectiveSeoConfig, effectiveCtaConfig, darkMode, minifyCss);
    case 'faq-page':
      return assembleFaqPage(personality, enhancedAnalysis, semanticData, effectiveSeoConfig, effectiveCtaConfig, darkMode, minifyCss);
    default:
      return assembleBlogArticle(personality, enhancedAnalysis, semanticData, effectiveSeoConfig, effectiveCtaConfig, darkMode, minifyCss);
  }
}

// ============================================================================
// TEMPLATE ASSEMBLERS
// ============================================================================

/**
 * Get hero layout from personality
 */
function getHeroLayout(personality: DesignPersonality): 'centered' | 'split' | 'minimal' | 'asymmetric' | 'full-bleed' {
  const layout = personality.components.hero.layout;
  if (['centered', 'split', 'minimal', 'asymmetric', 'full-bleed'].includes(layout)) {
    return layout as 'centered' | 'split' | 'minimal' | 'asymmetric' | 'full-bleed';
  }
  return 'centered';
}

/**
 * Get hero background from personality
 */
function getHeroBackground(personality: DesignPersonality): 'gradient' | 'solid' | 'image' | 'image-overlay' {
  const bg = personality.components.hero.background;
  if (['gradient', 'solid', 'image', 'image-overlay'].includes(bg)) {
    return bg as 'gradient' | 'solid' | 'image' | 'image-overlay';
  }
  return 'gradient';
}

/**
 * Get CTA variant from personality
 */
function getCtaVariant(personality: DesignPersonality): 'gradient' | 'solid' | 'outlined' | 'bold-contrast' | 'gradient-glow' | 'warm-gradient' {
  const style = personality.components.cta.style;
  if (['gradient', 'solid', 'outlined', 'bold-contrast', 'gradient-glow', 'warm-gradient'].includes(style)) {
    return style as 'gradient' | 'solid' | 'outlined' | 'bold-contrast' | 'gradient-glow' | 'warm-gradient';
  }
  return 'gradient';
}

/**
 * Get columns count as valid type
 */
function getColumnsCount(count: number): 2 | 3 | 4 {
  if (count <= 2) return 2;
  if (count >= 4) return 4;
  return 3;
}

/**
 * Assemble landing page with hero, benefits, timeline, testimonials, CTA
 */
function assembleLandingPage(
  personality: DesignPersonality,
  analysis: ContentAnalysisResult,
  semanticData: SemanticContentData,
  seoConfig: SeoConfiguration,
  ctaConfig: CtaConfiguration,
  darkMode: boolean,
  minifyCss: boolean
): StyledContentOutput {
  const builder = new SemanticHtmlBuilder(personality);
  const componentsUsed: string[] = [];

  // 1. Hero section
  builder.buildHero({
    title: seoConfig.title,
    subtitle: seoConfig.metaDescription,
    primaryCta: ctaConfig.heroCta || ctaConfig.primaryCta,
    secondaryCta: ctaConfig.heroSecondaryCta || ctaConfig.secondaryCta,
    layout: getHeroLayout(personality),
    background: getHeroBackground(personality),
  });
  componentsUsed.push('hero');

  // 2. Key takeaways (if detected)
  if (analysis.components.keyTakeaways && analysis.components.keyTakeaways.length > 0) {
    builder.buildKeyTakeaways({
      title: 'Belangrijkste Punten',
      items: analysis.components.keyTakeaways,
    });
    componentsUsed.push('key-takeaways');
  }

  // 3. Benefits grid (if detected)
  if (analysis.components.benefits && analysis.components.benefits.length > 0) {
    builder.buildBenefitsGrid({
      title: 'Waarom Kiezen Voor Ons',
      items: analysis.components.benefits,
      columns: getColumnsCount(analysis.components.benefits.length),
    });
    componentsUsed.push('benefits-grid');
  }

  // 4. Main content sections
  builder.buildArticle({
    headline: seoConfig.title,
    datePublished: seoConfig.datePublished || new Date().toISOString(),
    author: seoConfig.author,
    sections: analysis.structure.sections,
  });
  componentsUsed.push('article');

  // 5. Process timeline (if detected)
  if (analysis.components.processSteps && analysis.components.processSteps.length > 0) {
    builder.buildTimeline(analysis.components.processSteps);
    componentsUsed.push('timeline');
  }

  // 6. Testimonials (if detected)
  if (analysis.components.testimonials && analysis.components.testimonials.length > 0) {
    builder.buildTestimonials({
      title: 'Wat Klanten Zeggen',
      items: analysis.components.testimonials,
    });
    componentsUsed.push('testimonials');
  }

  // 7. CTA banner
  builder.buildCtaBanner({
    title: ctaConfig.bannerTitle || 'Klaar Om Te Beginnen?',
    text: ctaConfig.bannerText || 'Neem vandaag nog contact met ons op.',
    primaryButton: ctaConfig.primaryCta,
    secondaryButton: ctaConfig.secondaryCta,
    variant: getCtaVariant(personality),
  });
  componentsUsed.push('cta-banner');

  // 8. FAQ section (if detected)
  if (analysis.components.faqItems && analysis.components.faqItems.length > 0) {
    builder.buildFaq(analysis.components.faqItems);
    componentsUsed.push('faq');
  }

  // Generate final output
  return finalizeOutput(builder, personality, analysis, semanticData, seoConfig, componentsUsed, 'landing-page', darkMode, minifyCss);
}

/**
 * Assemble service page with emphasis on expertise and process
 */
function assembleServicePage(
  personality: DesignPersonality,
  analysis: ContentAnalysisResult,
  semanticData: SemanticContentData,
  seoConfig: SeoConfiguration,
  ctaConfig: CtaConfiguration,
  darkMode: boolean,
  minifyCss: boolean
): StyledContentOutput {
  const builder = new SemanticHtmlBuilder(personality);
  const componentsUsed: string[] = [];

  // 1. Hero section
  builder.buildHero({
    title: seoConfig.title,
    subtitle: seoConfig.metaDescription,
    primaryCta: ctaConfig.heroCta || ctaConfig.primaryCta,
    layout: getHeroLayout(personality),
    background: getHeroBackground(personality),
  });
  componentsUsed.push('hero');

  // 2. Benefits grid first for services
  if (analysis.components.benefits && analysis.components.benefits.length > 0) {
    builder.buildBenefitsGrid({
      title: 'Onze Voordelen',
      items: analysis.components.benefits,
      columns: 3,
    });
    componentsUsed.push('benefits-grid');
  }

  // 3. Main content
  builder.buildArticle({
    headline: seoConfig.title,
    datePublished: seoConfig.datePublished || new Date().toISOString(),
    author: seoConfig.author,
    sections: analysis.structure.sections,
  });
  componentsUsed.push('article');

  // 4. Process timeline (important for services)
  if (analysis.components.processSteps && analysis.components.processSteps.length > 0) {
    builder.buildTimeline(analysis.components.processSteps);
    componentsUsed.push('timeline');
  }

  // 5. Mid-content CTA
  builder.buildCtaBanner({
    title: 'Interesse?',
    text: 'Vraag een vrijblijvende offerte aan.',
    primaryButton: ctaConfig.primaryCta,
    variant: 'solid',
  });
  componentsUsed.push('cta-banner');

  // 6. Testimonials for social proof
  if (analysis.components.testimonials && analysis.components.testimonials.length > 0) {
    builder.buildTestimonials({
      title: 'Tevreden Klanten',
      items: analysis.components.testimonials,
    });
    componentsUsed.push('testimonials');
  }

  // 7. FAQ section
  if (analysis.components.faqItems && analysis.components.faqItems.length > 0) {
    builder.buildFaq(analysis.components.faqItems);
    componentsUsed.push('faq');
  }

  // 8. Author box for E-E-A-T
  if (semanticData.authorship) {
    builder.buildAuthorBox(semanticData.authorship);
    componentsUsed.push('author-box');
  }

  // 9. Final CTA
  builder.buildCtaBanner({
    title: ctaConfig.bannerTitle || 'Aan De Slag',
    text: ctaConfig.bannerText || 'Neem contact op voor een gratis adviesgesprek.',
    primaryButton: ctaConfig.primaryCta,
    secondaryButton: ctaConfig.secondaryCta,
    variant: getCtaVariant(personality),
  });

  return finalizeOutput(builder, personality, analysis, semanticData, seoConfig, componentsUsed, 'service-page', darkMode, minifyCss);
}

/**
 * Assemble blog article with focus on content and readability
 */
function assembleBlogArticle(
  personality: DesignPersonality,
  analysis: ContentAnalysisResult,
  semanticData: SemanticContentData,
  seoConfig: SeoConfiguration,
  ctaConfig: CtaConfiguration,
  darkMode: boolean,
  minifyCss: boolean
): StyledContentOutput {
  const builder = new SemanticHtmlBuilder(personality);
  const componentsUsed: string[] = [];

  // 1. Minimal hero for articles
  builder.buildHero({
    title: seoConfig.title,
    subtitle: seoConfig.metaDescription,
    layout: 'minimal',
    background: 'solid',
  });
  componentsUsed.push('hero');

  // 2. Key takeaways at top
  if (analysis.components.keyTakeaways && analysis.components.keyTakeaways.length > 0) {
    builder.buildKeyTakeaways({
      title: 'In Het Kort',
      items: analysis.components.keyTakeaways,
    });
    componentsUsed.push('key-takeaways');
  }

  // 3. Table of contents
  if (analysis.structure.headings.length > 3) {
    builder.buildTableOfContents(analysis.structure.headings);
    componentsUsed.push('toc');
  }

  // 4. Main article content
  builder.buildArticle({
    headline: seoConfig.title,
    datePublished: seoConfig.datePublished || new Date().toISOString(),
    author: seoConfig.author,
    sections: analysis.structure.sections,
  });
  componentsUsed.push('article');

  // 5. Process steps if educational content
  if (analysis.components.processSteps && analysis.components.processSteps.length > 0) {
    builder.buildTimeline(analysis.components.processSteps);
    componentsUsed.push('timeline');
  }

  // 6. FAQ section
  if (analysis.components.faqItems && analysis.components.faqItems.length > 0) {
    builder.buildFaq(analysis.components.faqItems);
    componentsUsed.push('faq');
  }

  // 7. Author box
  if (semanticData.authorship) {
    builder.buildAuthorBox(semanticData.authorship);
    componentsUsed.push('author-box');
  }

  // 8. Sources section for E-E-A-T
  if (semanticData.sources && semanticData.sources.length > 0) {
    const sourcesForBuilder = semanticData.sources.map(s => ({
      title: s.title,
      url: s.url,
      type: s.type,
    }));
    builder.buildSourcesSection(sourcesForBuilder, {
      title: 'Bronnen',
    });
    componentsUsed.push('sources');
  }

  // 9. Subtle CTA at end
  if (ctaConfig.primaryCta) {
    builder.buildCtaBanner({
      title: ctaConfig.bannerTitle || 'Meer Weten?',
      text: ctaConfig.bannerText,
      primaryButton: ctaConfig.primaryCta,
      variant: 'outlined',
    });
    componentsUsed.push('cta-banner');
  }

  return finalizeOutput(builder, personality, analysis, semanticData, seoConfig, componentsUsed, 'blog-article', darkMode, minifyCss);
}

/**
 * Assemble product page with specifications and reviews
 */
function assembleProductPage(
  personality: DesignPersonality,
  analysis: ContentAnalysisResult,
  semanticData: SemanticContentData,
  seoConfig: SeoConfiguration,
  ctaConfig: CtaConfiguration,
  darkMode: boolean,
  minifyCss: boolean
): StyledContentOutput {
  const builder = new SemanticHtmlBuilder(personality);
  const componentsUsed: string[] = [];

  // 1. Hero with product focus
  builder.buildHero({
    title: seoConfig.title,
    subtitle: seoConfig.metaDescription,
    primaryCta: ctaConfig.heroCta || ctaConfig.primaryCta,
    secondaryCta: ctaConfig.heroSecondaryCta,
    layout: 'split',
    background: 'gradient',
  });
  componentsUsed.push('hero');

  // 2. Benefits/features
  if (analysis.components.benefits && analysis.components.benefits.length > 0) {
    builder.buildBenefitsGrid({
      title: 'Kenmerken',
      items: analysis.components.benefits,
      columns: 4,
    });
    componentsUsed.push('benefits-grid');
  }

  // 3. Product content
  builder.buildArticle({
    headline: seoConfig.title,
    datePublished: seoConfig.datePublished || new Date().toISOString(),
    sections: analysis.structure.sections,
  });
  componentsUsed.push('article');

  // 4. Testimonials/reviews
  if (analysis.components.testimonials && analysis.components.testimonials.length > 0) {
    builder.buildTestimonials({
      title: 'Klantbeoordelingen',
      items: analysis.components.testimonials,
    });
    componentsUsed.push('testimonials');
  }

  // 5. FAQ
  if (analysis.components.faqItems && analysis.components.faqItems.length > 0) {
    builder.buildFaq(analysis.components.faqItems);
    componentsUsed.push('faq');
  }

  // 6. Strong CTA
  builder.buildCtaBanner({
    title: ctaConfig.bannerTitle || 'Bestel Nu',
    text: ctaConfig.bannerText,
    primaryButton: ctaConfig.primaryCta,
    secondaryButton: ctaConfig.secondaryCta,
    variant: getCtaVariant(personality),
  });
  componentsUsed.push('cta-banner');

  return finalizeOutput(builder, personality, analysis, semanticData, seoConfig, componentsUsed, 'product-page', darkMode, minifyCss);
}

/**
 * Assemble comparison page
 */
function assembleComparisonPage(
  personality: DesignPersonality,
  analysis: ContentAnalysisResult,
  semanticData: SemanticContentData,
  seoConfig: SeoConfiguration,
  ctaConfig: CtaConfiguration,
  darkMode: boolean,
  minifyCss: boolean
): StyledContentOutput {
  const builder = new SemanticHtmlBuilder(personality);
  const componentsUsed: string[] = [];

  // 1. Hero
  builder.buildHero({
    title: seoConfig.title,
    subtitle: seoConfig.metaDescription,
    layout: 'centered',
    background: 'solid',
  });
  componentsUsed.push('hero');

  // 2. Key takeaways (comparison summary)
  if (analysis.components.keyTakeaways && analysis.components.keyTakeaways.length > 0) {
    builder.buildKeyTakeaways({
      title: 'Vergelijking Samenvatting',
      items: analysis.components.keyTakeaways,
    });
    componentsUsed.push('key-takeaways');
  }

  // 3. ToC for navigation
  if (analysis.structure.headings.length > 3) {
    builder.buildTableOfContents(analysis.structure.headings);
    componentsUsed.push('toc');
  }

  // 4. Comparison content
  builder.buildArticle({
    headline: seoConfig.title,
    datePublished: seoConfig.datePublished || new Date().toISOString(),
    author: seoConfig.author,
    sections: analysis.structure.sections,
  });
  componentsUsed.push('article');

  // 5. FAQ
  if (analysis.components.faqItems && analysis.components.faqItems.length > 0) {
    builder.buildFaq(analysis.components.faqItems);
    componentsUsed.push('faq');
  }

  // 6. CTA
  if (ctaConfig.primaryCta) {
    builder.buildCtaBanner({
      title: ctaConfig.bannerTitle || 'Hulp Nodig Bij Uw Keuze?',
      text: ctaConfig.bannerText,
      primaryButton: ctaConfig.primaryCta,
      variant: 'gradient',
    });
    componentsUsed.push('cta-banner');
  }

  return finalizeOutput(builder, personality, analysis, semanticData, seoConfig, componentsUsed, 'comparison', darkMode, minifyCss);
}

/**
 * Assemble FAQ-focused page
 */
function assembleFaqPage(
  personality: DesignPersonality,
  analysis: ContentAnalysisResult,
  semanticData: SemanticContentData,
  seoConfig: SeoConfiguration,
  ctaConfig: CtaConfiguration,
  darkMode: boolean,
  minifyCss: boolean
): StyledContentOutput {
  const builder = new SemanticHtmlBuilder(personality);
  const componentsUsed: string[] = [];

  // 1. Minimal hero
  builder.buildHero({
    title: seoConfig.title,
    subtitle: seoConfig.metaDescription,
    layout: 'minimal',
    background: 'solid',
  });
  componentsUsed.push('hero');

  // 2. ToC if many FAQs
  if (analysis.components.faqItems && analysis.components.faqItems.length > 5) {
    const faqHeadings: HeadingItem[] = analysis.components.faqItems.map((faq, i) => ({
      level: 3,
      text: faq.question,
      id: `faq-${i}`,
    }));
    builder.buildTableOfContents(faqHeadings);
    componentsUsed.push('toc');
  }

  // 3. Main FAQ section (primary content)
  if (analysis.components.faqItems && analysis.components.faqItems.length > 0) {
    builder.buildFaq(analysis.components.faqItems);
    componentsUsed.push('faq');
  }

  // 4. Additional content if present
  if (analysis.structure.sections.length > 0) {
    builder.buildArticle({
      headline: seoConfig.title,
      datePublished: seoConfig.datePublished || new Date().toISOString(),
      sections: analysis.structure.sections,
    });
    componentsUsed.push('article');
  }

  // 5. CTA
  if (ctaConfig.primaryCta) {
    builder.buildCtaBanner({
      title: ctaConfig.bannerTitle || 'Nog Vragen?',
      text: ctaConfig.bannerText || 'Neem contact met ons op.',
      primaryButton: ctaConfig.primaryCta,
      variant: 'outlined',
    });
    componentsUsed.push('cta-banner');
  }

  return finalizeOutput(builder, personality, analysis, semanticData, seoConfig, componentsUsed, 'faq-page', darkMode, minifyCss);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Finalize output with HTML, CSS, JSON-LD, and validation
 */
function finalizeOutput(
  builder: SemanticHtmlBuilder,
  personality: DesignPersonality,
  analysis: ContentAnalysisResult,
  semanticData: SemanticContentData,
  seoConfig: SeoConfiguration,
  componentsUsed: string[],
  template: PageTemplate,
  darkMode: boolean,
  minifyCss: boolean
): StyledContentOutput {
  // Generate HTML
  const html = wrapWithRootElement(builder.getHtml(), personality.id);

  // Generate CSS
  const cssResult = generateDesignSystemCss({
    personalityId: personality.id,
    darkMode,
    minify: minifyCss,
    includeReset: true,
    includeAnimations: true,
  });

  // Generate JSON-LD
  const jsonLdOptions: JsonLdOptions = {
    includeEavs: true,
    includeBreadcrumb: true,
    includeAuthor: !!semanticData.authorship,
    baseUrl: seoConfig.canonicalUrl,
  };
  const jsonLd = generateJsonLd(semanticData, jsonLdOptions);

  // Add JSON-LD from builder (FAQ, HowTo schemas)
  const builderJsonLd = builder.getJsonLdScripts();
  const combinedJsonLd = jsonLd + '\n' + builderJsonLd;

  // Detect components in output
  const detectedComponents = detectComponentsInHtml(html, componentsUsed);

  // Validate SEO
  const seoValidation = validateSeo(html, seoConfig, semanticData);

  // Build metadata
  const metadata: AssemblyMetadata = {
    template,
    personalityId: personality.id,
    wordCount: analysis.structure.wordCount,
    readingTime: analysis.structure.readingTime,
    componentsUsed,
    timestamp: new Date().toISOString(),
  };

  return {
    html,
    css: cssResult.css,
    jsonLd: combinedJsonLd,
    components: detectedComponents,
    seoValidation,
    metadata,
  };
}

/**
 * Wrap HTML content with root element and necessary wrappers
 */
function wrapWithRootElement(html: string, personalityId: string): string {
  return `<div class="ctc-root ctc-personality-${personalityId}" data-ctc-version="2.0">
  ${html}
</div>`;
}

/**
 * Create default semantic data when brief is not available
 */
function createDefaultSemanticData(title: string, seoConfig?: SeoConfiguration): SemanticContentData {
  return {
    entities: [],
    keywords: {
      primary: seoConfig?.primaryKeyword || title,
      secondary: seoConfig?.secondaryKeywords || [],
      synonyms: new Map(),
      relatedTerms: [],
      hypernyms: [],
    },
    topicalContext: {
      siblingTopics: [],
      childTopics: [],
      clusterTopics: [],
    },
    authorship: seoConfig?.author ? {
      name: seoConfig.author.name,
      title: seoConfig.author.title,
      bio: seoConfig.author.bio,
      imageUrl: seoConfig.author.imageUrl,
    } : undefined,
    sources: [],
    pageType: 'article',
    datePublished: seoConfig?.datePublished,
    dateModified: seoConfig?.dateModified,
  };
}

/**
 * Build effective SEO configuration by merging provided config with semantic data
 */
function buildEffectiveSeoConfig(
  seoConfig: SeoConfiguration | undefined,
  semanticData: SemanticContentData,
  title: string
): SeoConfiguration {
  return {
    title: seoConfig?.title || title,
    metaDescription: seoConfig?.metaDescription || '',
    primaryKeyword: seoConfig?.primaryKeyword || semanticData.keywords.primary,
    secondaryKeywords: seoConfig?.secondaryKeywords || semanticData.keywords.secondary,
    canonicalUrl: seoConfig?.canonicalUrl,
    datePublished: seoConfig?.datePublished || semanticData.datePublished || new Date().toISOString(),
    dateModified: seoConfig?.dateModified || semanticData.dateModified,
    author: seoConfig?.author || (semanticData.authorship ? {
      name: semanticData.authorship.name,
      title: semanticData.authorship.title,
      bio: semanticData.authorship.bio,
      imageUrl: semanticData.authorship.imageUrl,
    } : undefined),
  };
}

/**
 * Build effective CTA configuration with defaults
 */
function buildEffectiveCtaConfig(ctaConfig: CtaConfiguration | undefined): CtaConfiguration {
  return {
    primaryCta: ctaConfig?.primaryCta || { text: 'Contact', url: '#contact' },
    secondaryCta: ctaConfig?.secondaryCta,
    heroCta: ctaConfig?.heroCta,
    heroSecondaryCta: ctaConfig?.heroSecondaryCta,
    sidebarCta: ctaConfig?.sidebarCta,
    bannerTitle: ctaConfig?.bannerTitle,
    bannerText: ctaConfig?.bannerText,
  };
}

/**
 * Detect components used in HTML output
 */
export function detectComponentsInHtml(html: string, componentsUsed: string[]): DetectedComponent[] {
  const componentPatterns: Record<string, RegExp> = {
    hero: /ctc-hero/g,
    'benefits-grid': /ctc-benefits-grid/g,
    timeline: /ctc-timeline/g,
    testimonials: /ctc-testimonial/g,
    faq: /ctc-faq/g,
    'cta-banner': /ctc-cta/g,
    'key-takeaways': /ctc-takeaways/g,
    toc: /ctc-toc/g,
    'author-box': /ctc-author-box/g,
    sources: /ctc-sources/g,
    article: /ctc-article/g,
    card: /ctc-card/g,
    button: /ctc-btn/g,
  };

  const detected: DetectedComponent[] = [];

  for (const [type, pattern] of Object.entries(componentPatterns)) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      detected.push({
        type,
        count: matches.length,
        variants: componentsUsed.includes(type) ? [type] : undefined,
      });
    }
  }

  return detected;
}

/**
 * Validate SEO aspects of generated HTML
 */
export function validateSeo(
  html: string,
  seoConfig: SeoConfiguration,
  semanticData: SemanticContentData
): SeoValidationResult {
  const issues: SeoIssue[] = [];
  const passed: string[] = [];
  let score = 100;

  // Check for H1
  if (html.includes('<h1')) {
    passed.push('H1 heading present');
  } else {
    issues.push({ type: 'error', message: 'Missing H1 heading' });
    score -= 20;
  }

  // Check heading hierarchy
  const headingOrder = [...html.matchAll(/<h([1-6])/g)].map(m => parseInt(m[1]));
  let hierarchyValid = true;
  for (let i = 1; i < headingOrder.length; i++) {
    if (headingOrder[i] > headingOrder[i - 1] + 1) {
      hierarchyValid = false;
      break;
    }
  }
  if (hierarchyValid) {
    passed.push('Heading hierarchy is valid');
  } else {
    issues.push({ type: 'warning', message: 'Heading hierarchy has skipped levels' });
    score -= 10;
  }

  // Check for schema.org markup
  if (html.includes('itemscope') || html.includes('itemtype')) {
    passed.push('Schema.org microdata present');
  } else {
    issues.push({ type: 'warning', message: 'No Schema.org microdata found in HTML' });
    score -= 5;
  }

  // Check for ARIA landmarks
  if (html.includes('role="main"') || html.includes('<main')) {
    passed.push('Main landmark present');
  } else {
    issues.push({ type: 'info', message: 'Consider adding main landmark' });
    score -= 2;
  }

  // Check keyword presence
  if (seoConfig.primaryKeyword) {
    const keywordLower = seoConfig.primaryKeyword.toLowerCase();
    const htmlLower = html.toLowerCase();
    if (htmlLower.includes(keywordLower)) {
      passed.push('Primary keyword present in content');
    } else {
      issues.push({ type: 'warning', message: `Primary keyword "${seoConfig.primaryKeyword}" not found in content` });
      score -= 15;
    }
  }

  // Check for alt text on images
  const imgTags = html.match(/<img[^>]*>/g) || [];
  const imgsWithAlt = imgTags.filter(img => img.includes('alt="') && !img.includes('alt=""'));
  if (imgTags.length > 0) {
    if (imgsWithAlt.length === imgTags.length) {
      passed.push('All images have alt text');
    } else {
      issues.push({
        type: 'warning',
        message: `${imgTags.length - imgsWithAlt.length} of ${imgTags.length} images missing alt text`,
      });
      score -= 5;
    }
  }

  // Check for internal links (topical authority)
  const internalLinks = html.match(/<a[^>]*href="[^"]*"[^>]*>/g) || [];
  if (internalLinks.length > 0) {
    passed.push('Internal links present');
  } else {
    issues.push({ type: 'info', message: 'Consider adding internal links for topical authority' });
  }

  // Check for structured data (JSON-LD will be separate, but check for inline)
  if (html.includes('itemprop=')) {
    passed.push('Inline structured data (itemprop) present');
  }

  return {
    isValid: issues.filter(i => i.type === 'error').length === 0,
    score: Math.max(0, score),
    issues,
    passed,
  };
}
