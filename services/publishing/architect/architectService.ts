/**
 * AI Layout Architect Service
 *
 * Orchestrates the AI-powered layout blueprint generation.
 * Analyzes content and business context to produce intelligent,
 * context-aware layout decisions.
 *
 * @module services/publishing/architect/architectService
 */

import * as geminiService from '../../geminiService';
import * as openAiService from '../../openAiService';
import * as anthropicService from '../../anthropicService';
import * as openRouterService from '../../openRouterService';
import { dispatchToProvider } from '../../ai/providerDispatcher';
import { analyzeContent, type ContentAnalysisResult } from '../contentAnalyzer';

// v2.0 Context-Aware Imports
import {
  assembleRichContext,
  toArchitectInput,
  type RichArchitectContext,
  type ParsedSection,
} from './contextAssembler';
import {
  selectComponentsWithCoherence,
  type ComponentSelection,
} from './componentSelector';
import {
  applyCoherence,
  analyzeCoherence,
  generateCoherenceReport,
  type CoherenceAnalysis,
} from './coherenceEngine';

import type { BusinessInfo, ContentBrief, EnrichedTopic, TopicalMap } from '../../../types';
import type {
  ArchitectInput,
  LayoutBlueprint,
  ContentSignals,
  BusinessContext,
  UserPreferences,
  SectionDesign,
  ComponentType,
  VisualStyle,
  ContentPacing,
  SectionEmphasis,
} from './blueprintTypes';
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseArchitectResponse,
} from './architectPrompt';

// ============================================================================
// MAIN SERVICE FUNCTIONS
// ============================================================================

/**
 * Generate a layout blueprint for an article
 */
export async function generateBlueprint(
  articleContent: string,
  articleTitle: string,
  articleId: string,
  businessInfo: BusinessInfo,
  options?: {
    brief?: ContentBrief;
    topic?: EnrichedTopic;
    topicalMap?: TopicalMap;
    preferences?: Partial<UserPreferences>;
  }
): Promise<LayoutBlueprint> {
  const startTime = Date.now();

  // Analyze content to extract signals
  const analysis = analyzeContent(articleContent, articleTitle);
  const contentSignals = extractContentSignals(analysis, articleContent);

  // Build architect input
  const input: ArchitectInput = {
    articleContent,
    articleTitle,
    contentBrief: options?.brief ? {
      metaDescription: options.brief.metaDescription || '',
      targetKeyword: options.brief.targetKeyword || '',
      secondaryKeywords: [], // ContentBrief doesn't have this field; could derive from outline
      intent: options.brief.searchIntent || '',
    } : undefined,
    business: extractBusinessContext(businessInfo),
    contentSignals,
    preferences: {
      styleLeaning: options?.preferences?.styleLeaning || 'auto',
      avoidPatterns: options?.preferences?.avoidPatterns,
      preferPatterns: options?.preferences?.preferPatterns,
      colorPreference: options?.preferences?.colorPreference,
    },
  };

  // Build prompts - combine system and user prompts for services that don't support separate system prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);
  const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  // No-op dispatch for services that require it
  const noOpDispatch = () => {};

  // Call AI provider
  const response = await dispatchToProvider(businessInfo, {
    gemini: () => geminiService.generateText(combinedPrompt, businessInfo, noOpDispatch),
    openai: () => openAiService.generateText(combinedPrompt, businessInfo, noOpDispatch),
    anthropic: () => anthropicService.generateText(combinedPrompt, businessInfo, noOpDispatch),
    openrouter: () => openRouterService.generateText(combinedPrompt, businessInfo, noOpDispatch),
  });

  // Parse response into blueprint
  const blueprint = parseArchitectResponse(
    response,
    articleId,
    startTime,
    analysis.structure.wordCount
  );

  // Attach source content to sections
  const sectionsWithContent = attachSourceContent(
    blueprint.sections,
    articleContent,
    analysis
  );

  return {
    ...blueprint,
    sections: sectionsWithContent,
  };
}

/**
 * Generate a blueprint using a fallback heuristic approach
 * Used when AI is unavailable or for testing
 */
export function generateBlueprintHeuristic(
  articleContent: string,
  articleTitle: string,
  articleId: string,
  businessInfo: BusinessInfo,
  options?: {
    brief?: ContentBrief;
    preferences?: Partial<UserPreferences>;
  }
): LayoutBlueprint {
  const startTime = Date.now();
  const analysis = analyzeContent(articleContent, articleTitle);
  const contentSignals = extractContentSignals(analysis, articleContent);

  // Determine visual style based on business context and content
  const visualStyle = determineVisualStyle(businessInfo, contentSignals);
  const pacing = determinePacing(contentSignals);

  // Generate sections from analysis
  const sections = generateHeuristicSections(analysis, contentSignals);

  return {
    version: '1.0',
    id: `blueprint-${Date.now()}`,
    articleId,
    pageStrategy: {
      visualStyle,
      pacing,
      colorIntensity: 'moderate',
      primaryGoal: contentSignals.primaryIntent === 'persuade' ? 'convert' : 'inform',
      buyerJourneyStage: contentSignals.buyerJourneyStage,
      reasoning: `Heuristic generation based on ${contentSignals.pageType} content with ${contentSignals.buyerJourneyStage} intent.`,
    },
    sections,
    globalElements: {
      showToc: analysis.structure.headings.length > 4,
      tocPosition: 'inline',
      showAuthorBox: true,
      authorBoxPosition: 'bottom',
      ctaStrategy: {
        positions: contentSignals.buyerJourneyStage === 'decision'
          ? ['after-intro', 'end']
          : ['end'],
        intensity: contentSignals.buyerJourneyStage === 'decision' ? 'prominent' : 'moderate',
        style: 'banner',
      },
      showSources: true,
      showRelatedContent: false,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      modelUsed: 'heuristic',
      generationDurationMs: Date.now() - startTime,
      sectionsAnalyzed: analysis.structure.sections.length,
      wordCount: analysis.structure.wordCount,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract content signals from analysis
 */
function extractContentSignals(
  analysis: ContentAnalysisResult,
  content: string
): ContentSignals {
  // Determine page type from content patterns
  let pageType = 'informational';
  if (analysis.components.benefits && analysis.components.benefits.length > 2) {
    pageType = 'commercial';
  }
  if (analysis.components.faqItems && analysis.components.faqItems.length > 3) {
    pageType = 'support';
  }
  if (analysis.components.processSteps && analysis.components.processSteps.length > 2) {
    pageType = 'how-to';
  }

  // Determine buyer journey stage
  let buyerJourneyStage: ContentSignals['buyerJourneyStage'] = 'awareness';
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('koop') || lowerContent.includes('bestel') ||
      lowerContent.includes('buy') || lowerContent.includes('prijs') ||
      lowerContent.includes('price')) {
    buyerJourneyStage = 'decision';
  } else if (lowerContent.includes('vergelijk') || lowerContent.includes('compare') ||
             lowerContent.includes('verschil') || lowerContent.includes('vs')) {
    buyerJourneyStage = 'consideration';
  }

  // Determine primary intent
  let primaryIntent: ContentSignals['primaryIntent'] = 'inform';
  if (analysis.components.ctaPlacements.length > 1) {
    primaryIntent = 'persuade';
  }
  if (analysis.components.processSteps) {
    primaryIntent = 'instruct';
  }
  if (content.toLowerCase().includes('vergelijk') || content.toLowerCase().includes('compare')) {
    primaryIntent = 'compare';
  }

  // Determine reading level (simplified)
  const avgWordLength = content.replace(/[^a-zA-Z]/g, '').length /
    (content.split(/\s+/).length || 1);
  let readingLevel: ContentSignals['readingLevel'] = 'moderate';
  if (avgWordLength < 5) readingLevel = 'simple';
  if (avgWordLength > 7) readingLevel = 'advanced';

  return {
    pageType,
    buyerJourneyStage,
    primaryIntent,
    keyDifferentiators: [],
    hasProcessSteps: !!analysis.components.processSteps,
    hasFaq: !!analysis.components.faqItems,
    hasTestimonials: !!analysis.components.testimonials,
    hasBenefits: !!analysis.components.benefits,
    hasComparison: content.toLowerCase().includes('vergelijk') ||
                   content.toLowerCase().includes('compare'),
    wordCount: analysis.structure.wordCount,
    readingLevel,
  };
}

/**
 * Extract business context from BusinessInfo
 */
function extractBusinessContext(businessInfo: BusinessInfo): BusinessContext {
  // Derive tone from expertise and industry if not explicitly set
  const derivedTone = businessInfo.expertise?.toLowerCase().includes('expert')
    ? 'professional'
    : businessInfo.industry?.toLowerCase().includes('tech')
      ? 'modern'
      : 'professional';

  return {
    name: businessInfo.projectName || '',
    industry: businessInfo.industry || '',
    tone: derivedTone,
    positioning: businessInfo.valueProp || '',
    targetAudience: businessInfo.audience || '',
    uniqueSellingPoints: [], // No direct mapping in BusinessInfo; could be derived from valueProp
  };
}

/**
 * Attach source content from original article to blueprint sections
 */
function attachSourceContent(
  sections: SectionDesign[],
  content: string,
  analysis: ContentAnalysisResult
): SectionDesign[] {
  return sections.map((section, index) => {
    // Try to match with analyzed sections
    const analyzedSection = analysis.structure.sections[index];

    return {
      ...section,
      sourceContent: analyzedSection?.content || '',
    };
  });
}

/**
 * Determine visual style based on business and content
 */
function determineVisualStyle(
  businessInfo: BusinessInfo,
  signals: ContentSignals
): LayoutBlueprint['pageStrategy']['visualStyle'] {
  // Derive tone from expertise and value proposition since toneOfVoice doesn't exist
  const expertise = (businessInfo.expertise || '').toLowerCase();
  const valueProp = (businessInfo.valueProp || '').toLowerCase();
  const industry = (businessInfo.industry || '').toLowerCase();

  // Infer tone from other fields
  let tone = 'professional';
  if (expertise.includes('friendly') || valueProp.includes('personal')) {
    tone = 'friendly';
  } else if (expertise.includes('expert') || valueProp.includes('enterprise')) {
    tone = 'formal';
  }

  // Industry-based defaults
  if (industry.includes('tech') || industry.includes('software')) {
    return 'minimal';
  }
  if (industry.includes('finance') || industry.includes('law')) {
    return 'editorial';
  }
  if (industry.includes('creative') || industry.includes('design')) {
    return 'bold';
  }
  if (industry.includes('health') || industry.includes('wellness')) {
    return 'warm-modern';
  }

  // Tone-based adjustments
  if (tone.includes('friendly') || tone.includes('casual')) {
    return 'warm-modern';
  }
  if (tone.includes('professional') || tone.includes('formal')) {
    return 'editorial';
  }

  // Content-based fallback
  if (signals.buyerJourneyStage === 'decision') {
    return 'marketing';
  }

  return 'editorial';
}

/**
 * Determine content pacing
 */
function determinePacing(signals: ContentSignals): LayoutBlueprint['pageStrategy']['pacing'] {
  if (signals.wordCount > 2000) {
    return 'spacious';
  }
  if (signals.wordCount < 800) {
    return 'dense';
  }
  return 'balanced';
}

/**
 * Generate sections using heuristic rules
 */
function generateHeuristicSections(
  analysis: ContentAnalysisResult,
  signals: ContentSignals
): SectionDesign[] {
  const sections: SectionDesign[] = [];

  analysis.structure.sections.forEach((section, index) => {
    const sectionContent = section.content.toLowerCase();

    // Determine component based on content patterns
    let component: SectionDesign['presentation']['component'] = 'prose';
    let variant = 'default';
    let emphasis: SectionDesign['presentation']['emphasis'] = 'normal';
    let reasoning = 'Standard prose section.';

    // Check for list patterns
    const hasBulletList = sectionContent.includes('- ') || sectionContent.includes('* ');
    const hasNumberedList = /\d+\.\s/.test(sectionContent);
    const listItemCount = (sectionContent.match(/(?:^|\n)[-*]\s/g) || []).length;

    // Intro section
    if (index === 0 && section.level === 0) {
      component = 'lead-paragraph';
      reasoning = 'Introduction section receives lead paragraph treatment.';
    }
    // Benefits section
    else if (section.heading?.toLowerCase().includes('voordel') ||
             section.heading?.toLowerCase().includes('benefit') ||
             section.heading?.toLowerCase().includes('kenmer')) {
      component = listItemCount > 4 ? 'card-grid' : 'icon-list';
      reasoning = 'Benefits/features content presented as visual cards or icons.';
      emphasis = 'featured';
    }
    // Process/how-to section
    else if (section.heading?.toLowerCase().includes('hoe') ||
             section.heading?.toLowerCase().includes('stap') ||
             section.heading?.toLowerCase().includes('proces') ||
             section.heading?.toLowerCase().includes('how')) {
      component = 'timeline-zigzag';
      reasoning = 'Process steps presented as visual timeline.';
      emphasis = 'featured';
    }
    // FAQ section
    else if (section.heading?.toLowerCase().includes('faq') ||
             section.heading?.toLowerCase().includes('vraag') ||
             section.heading?.toLowerCase().includes('question')) {
      component = 'faq-accordion';
      reasoning = 'FAQ content as interactive accordion.';
    }
    // List-heavy content
    else if (listItemCount > 3) {
      component = hasNumberedList ? 'numbered-list' : 'bullet-list';
      reasoning = 'List-heavy content preserved as structured list.';
    }

    sections.push({
      id: `section-${index}`,
      sourceContent: section.content,
      heading: section.heading || undefined,
      headingLevel: section.level || 2,
      presentation: {
        component,
        variant,
        emphasis,
        spacing: 'normal',
        hasBackground: emphasis === 'featured',
        hasDivider: false,
      },
      reasoning,
    });
  });

  return sections;
}

// ============================================================================
// V2.0 ENHANCED BLUEPRINT GENERATION
// ============================================================================

/**
 * Generate blueprint with rich context and intelligent component selection
 * This is the v2.0 approach that produces more contextually appropriate layouts
 */
export async function generateBlueprintV2(
  articleContent: string,
  articleTitle: string,
  articleId: string,
  businessInfo: BusinessInfo,
  options?: {
    brief?: ContentBrief;
    topic?: EnrichedTopic;
    topicalMap?: TopicalMap;
    preferences?: Partial<UserPreferences>;
    topicId?: string;
    projectId?: string;
  }
): Promise<LayoutBlueprint> {
  const startTime = Date.now();

  // Step 1: Assemble rich context
  const richContext = await assembleRichContext(
    articleContent,
    articleTitle,
    options?.topicId || articleId,
    options?.projectId || '',
    {
      brief: options?.brief,
      topic: options?.topic,
      topicalMap: options?.topicalMap,
      businessInfo,
    }
  );

  // Step 2: Determine visual style from context
  const visualStyle = determineVisualStyleFromContext(richContext, businessInfo);
  const pacing = determinePacingFromContext(richContext);

  // Step 3: Select components with coherence
  const componentSelections = selectComponentsWithCoherence(
    richContext.content.sections,
    richContext,
    visualStyle,
    richContext.performance.avoidPatterns as ComponentType[],
    options?.preferences?.preferPatterns as ComponentType[] || []
  );

  // Step 4: Build sections from selections
  const sections = buildSectionsFromSelections(
    richContext.content.sections,
    componentSelections,
    articleContent
  );

  // Step 5: Determine buyer journey and goals
  const buyerJourneyStage = richContext.intent.buyerStage;
  const primaryGoal = buyerJourneyStage === 'decision' ? 'convert' :
                      buyerJourneyStage === 'consideration' ? 'engage' : 'inform';

  // Step 6: Create initial blueprint
  let blueprint: LayoutBlueprint = {
    version: '1.0',
    id: `blueprint-${Date.now()}`,
    articleId,
    pageStrategy: {
      visualStyle,
      pacing,
      colorIntensity: richContext.market.industryNorms.colorIntensity,
      primaryGoal,
      buyerJourneyStage,
      reasoning: buildStrategyReasoning(richContext, visualStyle, pacing),
    },
    sections,
    globalElements: {
      showToc: richContext.content.sections.length > 4,
      tocPosition: visualStyle === 'editorial' ? 'sidebar' : 'inline',
      showAuthorBox: true,
      authorBoxPosition: 'bottom',
      ctaStrategy: {
        positions: determineCtaPositions(buyerJourneyStage, richContext),
        intensity: richContext.market.industryNorms.ctaApproach === 'aggressive' ? 'prominent' :
                   richContext.market.industryNorms.ctaApproach === 'subtle' ? 'subtle' : 'moderate',
        style: visualStyle === 'marketing' ? 'banner' : 'inline',
      },
      showSources: true,
      showRelatedContent: false,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      modelUsed: 'context-aware-v2',
      generationDurationMs: Date.now() - startTime,
      sectionsAnalyzed: richContext.content.sections.length,
      wordCount: richContext.content.wordCount,
    },
  };

  // Step 7: Apply coherence rules
  blueprint = applyCoherence(blueprint);

  return blueprint;
}

/**
 * Enhanced heuristic blueprint with intelligent selection and coherence
 */
export function generateBlueprintHeuristicV2(
  articleContent: string,
  articleTitle: string,
  articleId: string,
  businessInfo: BusinessInfo,
  options?: {
    brief?: ContentBrief;
    preferences?: Partial<UserPreferences>;
  }
): LayoutBlueprint {
  const startTime = Date.now();
  const analysis = analyzeContent(articleContent, articleTitle);
  const contentSignals = extractContentSignals(analysis, articleContent);

  // Use v1 visual style determination (synchronous)
  const visualStyle = determineVisualStyle(businessInfo, contentSignals);
  const pacing = determinePacing(contentSignals);

  // Generate sections with enhanced heuristics
  const sections = generateEnhancedHeuristicSections(analysis, contentSignals, visualStyle);

  let blueprint: LayoutBlueprint = {
    version: '1.0',
    id: `blueprint-${Date.now()}`,
    articleId,
    pageStrategy: {
      visualStyle,
      pacing,
      colorIntensity: 'moderate',
      primaryGoal: contentSignals.primaryIntent === 'persuade' ? 'convert' : 'inform',
      buyerJourneyStage: contentSignals.buyerJourneyStage,
      reasoning: `Heuristic v2 generation based on ${contentSignals.pageType} content with ${contentSignals.buyerJourneyStage} intent. Visual style: ${visualStyle}.`,
    },
    sections,
    globalElements: {
      showToc: analysis.structure.headings.length > 4,
      tocPosition: 'inline',
      showAuthorBox: true,
      authorBoxPosition: 'bottom',
      ctaStrategy: {
        positions: contentSignals.buyerJourneyStage === 'decision'
          ? ['after-intro', 'end']
          : ['end'],
        intensity: contentSignals.buyerJourneyStage === 'decision' ? 'prominent' : 'moderate',
        style: 'banner',
      },
      showSources: true,
      showRelatedContent: false,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      modelUsed: 'heuristic-v2',
      generationDurationMs: Date.now() - startTime,
      sectionsAnalyzed: analysis.structure.sections.length,
      wordCount: analysis.structure.wordCount,
    },
  };

  // Apply coherence rules
  blueprint = applyCoherence(blueprint);

  return blueprint;
}

/**
 * Analyze blueprint quality and get improvement suggestions
 */
export function analyzeBlueprintQuality(blueprint: LayoutBlueprint): {
  coherence: CoherenceAnalysis;
  report: string;
  overallScore: number;
} {
  const coherence = analyzeCoherence(blueprint);
  const report = generateCoherenceReport(blueprint, coherence);

  // Overall score combines coherence with other factors
  let overallScore = coherence.score;

  // Bonus for variety
  const uniqueComponents = new Set(blueprint.sections.map(s => s.presentation.component)).size;
  if (uniqueComponents >= 4) overallScore = Math.min(100, overallScore + 5);

  // Penalty for too few sections
  if (blueprint.sections.length < 3) overallScore -= 10;

  return {
    coherence,
    report,
    overallScore: Math.max(0, Math.min(100, overallScore)),
  };
}

/**
 * Apply learned user preferences to an existing blueprint
 * This modifies the blueprint to incorporate user's historical choices
 */
export function applyLearnedPreferences(
  blueprint: LayoutBlueprint,
  preferences: {
    preferredComponents?: ComponentType[];
    avoidedComponents?: ComponentType[];
    preferredVisualStyle?: VisualStyle;
    emphasisPatterns?: {
      sectionType: string;
      preferredEmphasis: SectionEmphasis;
    }[];
    componentSwaps?: {
      fromComponent: ComponentType;
      toComponent: ComponentType;
      frequency: number;
    }[];
  }
): LayoutBlueprint {
  const updatedBlueprint = { ...blueprint, sections: [...blueprint.sections] };

  // Apply preferred visual style
  if (preferences.preferredVisualStyle) {
    updatedBlueprint.pageStrategy = {
      ...updatedBlueprint.pageStrategy,
      visualStyle: preferences.preferredVisualStyle,
    };
  }

  // Apply component swaps based on learned patterns
  if (preferences.componentSwaps && preferences.componentSwaps.length > 0) {
    updatedBlueprint.sections = updatedBlueprint.sections.map(section => {
      const swap = preferences.componentSwaps?.find(
        s => s.fromComponent === section.presentation.component && s.frequency >= 2
      );
      if (swap) {
        return {
          ...section,
          presentation: {
            ...section.presentation,
            component: swap.toComponent,
          },
          reasoning: `${section.reasoning} (Adjusted based on your style preference: ${swap.fromComponent} → ${swap.toComponent})`,
        };
      }
      return section;
    });
  }

  // Apply emphasis patterns based on learned preferences
  if (preferences.emphasisPatterns && preferences.emphasisPatterns.length > 0) {
    updatedBlueprint.sections = updatedBlueprint.sections.map(section => {
      // Try to match section type from reasoning
      const pattern = preferences.emphasisPatterns?.find(
        p => section.reasoning.toLowerCase().includes(p.sectionType.toLowerCase())
      );
      if (pattern) {
        return {
          ...section,
          presentation: {
            ...section.presentation,
            emphasis: pattern.preferredEmphasis,
          },
        };
      }
      return section;
    });
  }

  // Avoid certain components - swap to alternatives
  if (preferences.avoidedComponents && preferences.avoidedComponents.length > 0) {
    const alternatives: Partial<Record<ComponentType, ComponentType>> = {
      'bullet-list': 'icon-list',
      'icon-list': 'bullet-list',
      'timeline-vertical': 'steps-numbered',
      'timeline-horizontal': 'timeline-vertical',
      'timeline-zigzag': 'timeline-vertical',
      'card-grid': 'feature-list',
      'feature-list': 'card-grid',
      'accordion': 'tabs',
      'tabs': 'accordion',
      'testimonial-single': 'testimonial-grid',
      'testimonial-grid': 'testimonial-single',
      'cta-banner': 'cta-inline',
      'cta-inline': 'cta-banner',
      'prose': 'lead-paragraph',
      'lead-paragraph': 'prose',
      'numbered-list': 'checklist',
      'checklist': 'numbered-list',
      'comparison-table': 'pros-cons',
      'pros-cons': 'comparison-table',
      'stat-cards': 'feature-list',
      'highlight-box': 'pull-quote',
      'pull-quote': 'highlight-box',
    };

    updatedBlueprint.sections = updatedBlueprint.sections.map(section => {
      if (preferences.avoidedComponents?.includes(section.presentation.component)) {
        const alternative = alternatives[section.presentation.component] || 'prose';
        return {
          ...section,
          presentation: {
            ...section.presentation,
            component: alternative,
          },
          reasoning: `${section.reasoning} (Swapped from ${section.presentation.component} to avoid)`,
        };
      }
      return section;
    });
  }

  // Re-apply coherence after preference application (uses style-specific defaults)
  const coherentBlueprint = applyCoherence(updatedBlueprint);

  return coherentBlueprint;
}

/**
 * Get a summary of learned style preferences for display
 */
export function getStylePreferenceSummary(
  preferences: {
    preferredComponents?: ComponentType[];
    avoidedComponents?: ComponentType[];
    preferredVisualStyle?: VisualStyle;
    componentSwaps?: { fromComponent: ComponentType; toComponent: ComponentType; frequency: number }[];
  }
): {
  hasPreferences: boolean;
  summary: string[];
  stats: {
    totalSwaps: number;
    preferredCount: number;
    avoidedCount: number;
  };
} {
  const summary: string[] = [];

  if (preferences.preferredVisualStyle) {
    summary.push(`Preferred style: ${preferences.preferredVisualStyle}`);
  }

  if (preferences.preferredComponents && preferences.preferredComponents.length > 0) {
    summary.push(`Preferred components: ${preferences.preferredComponents.slice(0, 3).join(', ')}`);
  }

  if (preferences.avoidedComponents && preferences.avoidedComponents.length > 0) {
    summary.push(`Avoided components: ${preferences.avoidedComponents.slice(0, 3).join(', ')}`);
  }

  const swaps = preferences.componentSwaps || [];
  const highFreqSwaps = swaps.filter(s => s.frequency >= 2);
  if (highFreqSwaps.length > 0) {
    summary.push(`${highFreqSwaps.length} learned component preferences`);
  }

  return {
    hasPreferences: summary.length > 0,
    summary,
    stats: {
      totalSwaps: swaps.reduce((sum, s) => sum + s.frequency, 0),
      preferredCount: preferences.preferredComponents?.length || 0,
      avoidedCount: preferences.avoidedComponents?.length || 0,
    },
  };
}

// ============================================================================
// V2.0 HELPER FUNCTIONS
// ============================================================================

/**
 * Determine visual style from rich context
 */
function determineVisualStyleFromContext(
  ctx: RichArchitectContext,
  businessInfo: BusinessInfo
): VisualStyle {
  // Priority 1: User's learned preferred style
  if (ctx.performance.refinementPatterns?.preferredVisualStyle) {
    return ctx.performance.refinementPatterns.preferredVisualStyle;
  }

  // Priority 2: Industry norms
  const industryStyle = ctx.market.industryNorms.preferredStyle;

  // Priority 3: Content type adjustments
  const contentType = ctx.content.contentType;

  // Commercial content → marketing style (unless industry says otherwise)
  if (contentType === 'commercial' && industryStyle !== 'editorial') {
    return 'marketing';
  }

  // How-to content → editorial (more readable)
  if (contentType === 'how-to' && industryStyle === 'bold') {
    return 'editorial';
  }

  // High reading level → editorial
  if (ctx.content.readingLevel === 'advanced') {
    return 'editorial';
  }

  // Urgent tone → marketing or bold
  if (ctx.content.emotionalTone === 'urgent') {
    return industryStyle === 'minimal' ? 'marketing' : industryStyle;
  }

  return industryStyle;
}

/**
 * Determine pacing from rich context
 */
function determinePacingFromContext(ctx: RichArchitectContext): ContentPacing {
  // Long content needs room to breathe
  if (ctx.content.wordCount > 2500) return 'spacious';
  if (ctx.content.wordCount < 800) return 'dense';

  // Many sections → balanced
  if (ctx.content.sections.length > 8) return 'balanced';

  // Few sections with heavy content → spacious
  if (ctx.content.sections.length <= 4 && ctx.content.readingLevel === 'advanced') {
    return 'spacious';
  }

  return ctx.market.industryNorms.pacing;
}

/**
 * Build sections from component selections
 */
function buildSectionsFromSelections(
  parsedSections: ParsedSection[],
  selections: ComponentSelection[],
  originalContent: string
): SectionDesign[] {
  return parsedSections.map((section, index) => {
    const selection = selections[index];

    return {
      id: section.id,
      sourceContent: section.content,
      heading: section.heading || undefined,
      headingLevel: section.headingLevel,
      presentation: {
        component: selection.primary,
        variant: selection.visualConfig.variant || 'default',
        emphasis: selection.visualConfig.emphasis,
        spacing: selection.visualConfig.spacing,
        hasBackground: selection.visualConfig.hasBackground,
        hasDivider: false,
      },
      reasoning: selection.reasoning.slice(0, 3).join('. ') + '.',
      styleHints: selection.visualConfig.columns ? {
        columns: selection.visualConfig.columns,
      } : undefined,
    };
  });
}

/**
 * Build strategy reasoning from context
 */
function buildStrategyReasoning(
  ctx: RichArchitectContext,
  visualStyle: VisualStyle,
  pacing: ContentPacing
): string {
  const parts: string[] = [];

  parts.push(`${visualStyle} style chosen for ${ctx.brand.industry || 'general'} industry`);

  if (ctx.intent.buyerStage === 'decision') {
    parts.push('decision-stage content emphasizes conversion');
  }

  if (ctx.content.readingLevel === 'advanced') {
    parts.push('advanced content uses spacious layout');
  }

  if (ctx.performance.refinementPatterns) {
    parts.push('incorporates learned preferences');
  }

  if (ctx.market.competitorLayouts.length > 0) {
    parts.push('differentiated from competitor patterns');
  }

  return parts.join('; ') + '.';
}

/**
 * Determine CTA positions based on journey stage
 */
function determineCtaPositions(
  stage: 'awareness' | 'consideration' | 'decision',
  ctx: RichArchitectContext
): ('after-intro' | 'mid-content' | 'before-faq' | 'end')[] {
  switch (stage) {
    case 'decision':
      return ['after-intro', 'before-faq', 'end'];
    case 'consideration':
      return ['mid-content', 'end'];
    case 'awareness':
    default:
      return ['end'];
  }
}

/**
 * Generate enhanced heuristic sections with visual rhythm
 */
function generateEnhancedHeuristicSections(
  analysis: ContentAnalysisResult,
  signals: ContentSignals,
  visualStyle: VisualStyle
): SectionDesign[] {
  const sections: SectionDesign[] = [];
  let lastWeight: 'light' | 'medium' | 'heavy' = 'light';
  let lastComponent: ComponentType | null = null;

  analysis.structure.sections.forEach((section, index) => {
    const sectionContent = section.content.toLowerCase();

    // Determine component based on content patterns (enhanced)
    let component: ComponentType = 'prose';
    let variant = 'default';
    let emphasis: SectionEmphasis = 'normal';
    let reasoning = 'Standard prose section.';

    // Check for list patterns
    const hasBulletList = sectionContent.includes('- ') || sectionContent.includes('* ');
    const hasNumberedList = /\d+\.\s/.test(sectionContent);
    const listItemCount = (sectionContent.match(/(?:^|\n)[-*]\s/g) || []).length;

    // Intro section
    if (index === 0 && section.level === 0) {
      component = 'lead-paragraph';
      reasoning = 'Introduction receives lead paragraph treatment.';
    }
    // Benefits section (enhanced component selection based on style)
    else if (section.heading?.toLowerCase().includes('voordel') ||
             section.heading?.toLowerCase().includes('benefit') ||
             section.heading?.toLowerCase().includes('kenmer')) {
      // Style-appropriate component selection
      if (visualStyle === 'minimal') {
        component = 'bullet-list';
      } else if (visualStyle === 'marketing' || visualStyle === 'bold') {
        component = listItemCount > 4 ? 'card-grid' : 'icon-list';
      } else {
        component = listItemCount > 4 ? 'card-grid' : 'icon-list';
      }
      reasoning = `Benefits presented as ${component} (${visualStyle} style).`;
      emphasis = 'featured';
    }
    // Process/how-to section (varied timeline components)
    else if (section.heading?.toLowerCase().includes('hoe') ||
             section.heading?.toLowerCase().includes('stap') ||
             section.heading?.toLowerCase().includes('proces') ||
             section.heading?.toLowerCase().includes('how')) {
      // Avoid repeating timeline if used recently
      if (lastComponent?.includes('timeline')) {
        component = 'steps-numbered';
      } else {
        component = visualStyle === 'bold' ? 'timeline-zigzag' : 'timeline-vertical';
      }
      reasoning = `Process steps as ${component} for visual variety.`;
      emphasis = 'featured';
    }
    // FAQ section
    else if (section.heading?.toLowerCase().includes('faq') ||
             section.heading?.toLowerCase().includes('vraag') ||
             section.heading?.toLowerCase().includes('question')) {
      component = visualStyle === 'marketing' ? 'faq-cards' : 'faq-accordion';
      reasoning = `FAQ as ${component} (${visualStyle} style).`;
    }
    // List-heavy content (avoid repetition)
    else if (listItemCount > 3) {
      if (lastComponent === 'bullet-list' || lastComponent === 'numbered-list') {
        // Switch to visual list to avoid repetition
        component = 'icon-list';
        reasoning = 'Varied list presentation to maintain visual interest.';
      } else {
        component = hasNumberedList ? 'numbered-list' : 'bullet-list';
        reasoning = 'List content preserved as structured list.';
      }
    }

    // Apply visual weight rhythm
    const currentWeight = getWeightForComponent(component);
    if (lastWeight === 'heavy' && currentWeight === 'heavy' && component !== 'prose') {
      // Try to find a lighter alternative
      if (component === 'card-grid') component = 'icon-list';
      if (component === 'timeline-zigzag') component = 'steps-numbered';
    }

    // Determine background based on emphasis and position
    const hasBackground = emphasis === 'featured' ||
      (index % 3 === 1 && visualStyle !== 'minimal');

    sections.push({
      id: `section-${index}`,
      sourceContent: section.content,
      heading: section.heading || undefined,
      headingLevel: section.level || 2,
      presentation: {
        component,
        variant,
        emphasis,
        spacing: currentWeight === 'heavy' ? 'breathe' : 'normal',
        hasBackground,
        hasDivider: false,
      },
      reasoning,
    });

    lastWeight = currentWeight;
    lastComponent = component;
  });

  return sections;
}

/**
 * Get visual weight for a component (simplified version for heuristic)
 */
function getWeightForComponent(component: ComponentType): 'light' | 'medium' | 'heavy' {
  const heavyComponents: ComponentType[] = [
    'card-grid', 'timeline-zigzag', 'timeline-vertical', 'stat-cards',
    'testimonial-carousel', 'comparison-table', 'pricing-table'
  ];
  const lightComponents: ComponentType[] = [
    'prose', 'lead-paragraph', 'bullet-list', 'numbered-list', 'pull-quote'
  ];

  if (heavyComponents.includes(component)) return 'heavy';
  if (lightComponents.includes(component)) return 'light';
  return 'medium';
}

// ============================================================================
// BLUEPRINT REFINEMENT
// ============================================================================

/**
 * Refine a single section in the blueprint
 */
export async function refineSection(
  blueprint: LayoutBlueprint,
  sectionId: string,
  instruction: string,
  businessInfo: BusinessInfo
): Promise<LayoutBlueprint> {
  const section = blueprint.sections.find(s => s.id === sectionId);
  if (!section) {
    throw new Error(`Section ${sectionId} not found in blueprint`);
  }

  const prompt = `You previously designed a layout for an article section. The user wants to refine it.

Current section design:
- Component: ${section.presentation.component}
- Variant: ${section.presentation.variant}
- Emphasis: ${section.presentation.emphasis}
- Reasoning: ${section.reasoning}

Content preview:
${section.sourceContent.slice(0, 500)}

User instruction: "${instruction}"

Return ONLY a JSON object with the updated section design:
{
  "component": "component-type",
  "variant": "variant-name",
  "emphasis": "background|normal|featured|hero-moment",
  "spacing": "tight|normal|breathe",
  "hasBackground": boolean,
  "hasDivider": boolean,
  "reasoning": "explanation"
}`;

  // No-op dispatch for services that require it
  const noOpDispatch = () => {};

  const response = await dispatchToProvider(businessInfo, {
    gemini: () => geminiService.generateText(prompt, businessInfo, noOpDispatch),
    openai: () => openAiService.generateText(prompt, businessInfo, noOpDispatch),
    anthropic: () => anthropicService.generateText(prompt, businessInfo, noOpDispatch),
    openrouter: () => openRouterService.generateText(prompt, businessInfo, noOpDispatch),
  });

  // Parse response
  let refinedDesign;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      refinedDesign = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    throw new Error('Failed to parse refinement response');
  }

  // Update blueprint with refined section
  const updatedSections = blueprint.sections.map(s => {
    if (s.id === sectionId) {
      return {
        ...s,
        presentation: {
          component: refinedDesign.component || s.presentation.component,
          variant: refinedDesign.variant || s.presentation.variant,
          emphasis: refinedDesign.emphasis || s.presentation.emphasis,
          spacing: refinedDesign.spacing || s.presentation.spacing,
          hasBackground: refinedDesign.hasBackground ?? s.presentation.hasBackground,
          hasDivider: refinedDesign.hasDivider ?? s.presentation.hasDivider,
        },
        reasoning: refinedDesign.reasoning || s.reasoning,
      };
    }
    return s;
  });

  return {
    ...blueprint,
    sections: updatedSections,
  };
}

// ============================================================================
// AUTO-GENERATION FROM CONTEXT
// ============================================================================

import type {
  ProjectBlueprint,
  TopicalMapBlueprint,
  ColorIntensity,
} from './blueprintTypes';

/**
 * Auto-generate a project blueprint from business info
 * This creates sensible defaults based on business context
 */
export function generateProjectBlueprint(businessInfo: BusinessInfo): ProjectBlueprint {
  const industry = (businessInfo.industry || '').toLowerCase();
  const valueProp = (businessInfo.valueProp || '').toLowerCase();
  const websiteType = businessInfo.websiteType;

  // Determine visual style based on industry and website type
  let visualStyle: VisualStyle = 'editorial';
  let pacing: ContentPacing = 'balanced';
  let colorIntensity: ColorIntensity = 'moderate';
  let ctaIntensity: 'subtle' | 'moderate' | 'prominent' = 'moderate';

  // Industry-based defaults
  if (industry.includes('tech') || industry.includes('software') || industry.includes('saas')) {
    visualStyle = 'minimal';
    colorIntensity = 'subtle';
  } else if (industry.includes('creative') || industry.includes('design') || industry.includes('marketing')) {
    visualStyle = 'bold';
    colorIntensity = 'vibrant';
  } else if (industry.includes('health') || industry.includes('wellness') || industry.includes('fitness')) {
    visualStyle = 'warm-modern';
    pacing = 'spacious';
  } else if (industry.includes('finance') || industry.includes('legal') || industry.includes('consulting')) {
    visualStyle = 'editorial';
    colorIntensity = 'subtle';
  } else if (industry.includes('ecommerce') || industry.includes('retail')) {
    visualStyle = 'marketing';
    ctaIntensity = 'prominent';
  }

  // Website type adjustments
  if (websiteType === 'ECOMMERCE' || websiteType === 'AFFILIATE_REVIEW') {
    ctaIntensity = 'prominent';
    visualStyle = 'marketing';
  } else if (websiteType === 'INFORMATIONAL' || websiteType === 'NEWS_MEDIA') {
    visualStyle = 'editorial';
    ctaIntensity = 'subtle';
  } else if (websiteType === 'SAAS') {
    visualStyle = 'minimal';
  } else if (websiteType === 'SERVICE_B2B' || websiteType === 'LEAD_GENERATION') {
    ctaIntensity = 'moderate';
  }

  // Value proposition adjustments
  if (valueProp.includes('premium') || valueProp.includes('luxury')) {
    visualStyle = 'editorial';
    pacing = 'spacious';
    colorIntensity = 'subtle';
  } else if (valueProp.includes('affordable') || valueProp.includes('budget')) {
    visualStyle = 'marketing';
    pacing = 'dense';
  }

  return {
    projectId: '', // Will be set when saving
    defaults: {
      visualStyle,
      pacing,
      colorIntensity,
      ctaStrategy: {
        positions: ['end'],
        intensity: ctaIntensity,
        style: 'banner',
      },
    },
    componentPreferences: {
      // Prefer certain components based on industry
      preferredListStyle: industry.includes('tech') ? 'icon-list' : 'bullet-list',
      preferredTimelineStyle: industry.includes('consulting') ? 'timeline-zigzag' : 'steps-numbered',
      preferredFaqStyle: 'faq-accordion',
    },
    avoidComponents: [],
    reasoning: `Auto-generated from ${businessInfo.industry || 'general'} industry context with ${businessInfo.websiteType || 'informational'} website type.`,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Auto-generate a topical map blueprint from map context
 * This creates overrides specific to the topic cluster
 */
export function generateTopicalMapBlueprint(
  topicalMapId: string,
  projectId: string,
  mapName: string,
  topicCluster: string,
  parentBlueprint?: ProjectBlueprint
): TopicalMapBlueprint {
  const clusterLower = topicCluster.toLowerCase();

  // Start with inherited values (null means inherit from project)
  let visualStyle: VisualStyle | null = null;
  let pacing: ContentPacing | null = null;
  let colorIntensity: ColorIntensity | null = null;
  let ctaPositions: ('after-intro' | 'mid-content' | 'before-faq' | 'end')[] | null = null;
  let ctaIntensity: 'subtle' | 'moderate' | 'prominent' | null = null;

  // Cluster-specific overrides
  if (clusterLower.includes('guide') || clusterLower.includes('tutorial') || clusterLower.includes('how to')) {
    pacing = 'spacious'; // More room for step-by-step content
  }

  if (clusterLower.includes('comparison') || clusterLower.includes('vs') || clusterLower.includes('review')) {
    visualStyle = 'marketing'; // Comparison content benefits from marketing style
    ctaIntensity = 'moderate';
  }

  if (clusterLower.includes('faq') || clusterLower.includes('questions')) {
    // FAQ content works well with balanced pacing
    pacing = 'balanced';
  }

  if (clusterLower.includes('pricing') || clusterLower.includes('cost') || clusterLower.includes('buy')) {
    ctaIntensity = 'prominent';
    ctaPositions = ['after-intro', 'end'];
  }

  if (clusterLower.includes('research') || clusterLower.includes('study') || clusterLower.includes('analysis')) {
    visualStyle = 'editorial';
    pacing = 'spacious';
    colorIntensity = 'subtle';
  }

  return {
    topicalMapId,
    projectId,
    defaults: visualStyle || pacing || colorIntensity ? {
      visualStyle: visualStyle || undefined,
      pacing: pacing || undefined,
      colorIntensity: colorIntensity || undefined,
      ctaStrategy: ctaPositions || ctaIntensity ? {
        positions: ctaPositions || undefined,
        intensity: ctaIntensity || undefined,
        style: undefined,
      } : undefined,
    } : undefined,
    componentPreferences: {} as Partial<ProjectBlueprint['componentPreferences']>,
    clusterSpecificRules: [] as TopicalMapBlueprint['clusterSpecificRules'],
    reasoning: `Auto-generated for "${mapName}" cluster focusing on ${topicCluster} content.`,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get or create project blueprint
 * Creates a new one from business info if none exists
 */
export async function ensureProjectBlueprint(
  projectId: string,
  businessInfo: BusinessInfo
): Promise<ProjectBlueprint> {
  const { getProjectBlueprint, upsertProjectBlueprint } = await import('./blueprintStorage');

  // Check if one exists
  const existing = await getProjectBlueprint(projectId);
  if (existing) {
    return {
      projectId: existing.project_id,
      defaults: {
        visualStyle: existing.visual_style,
        pacing: existing.pacing,
        colorIntensity: existing.color_intensity,
        ctaStrategy: {
          positions: existing.cta_positions as ('after-intro' | 'mid-content' | 'before-faq' | 'end')[],
          intensity: existing.cta_intensity as 'subtle' | 'moderate' | 'prominent',
          style: existing.cta_style as 'inline' | 'banner' | 'floating',
        },
      },
      componentPreferences: existing.component_preferences as ProjectBlueprint['componentPreferences'],
      avoidComponents: existing.avoid_components as ComponentType[],
      reasoning: existing.ai_reasoning || '',
      generatedAt: existing.created_at || new Date().toISOString(),
    };
  }

  // Generate and save new one
  const generated = generateProjectBlueprint(businessInfo);
  generated.projectId = projectId;

  await upsertProjectBlueprint(projectId, generated);

  return generated;
}

/**
 * Get or create topical map blueprint
 */
export async function ensureTopicalMapBlueprint(
  topicalMapId: string,
  projectId: string,
  mapName: string,
  topicCluster: string,
  businessInfo: BusinessInfo
): Promise<TopicalMapBlueprint> {
  const { getTopicalMapBlueprint, upsertTopicalMapBlueprint } = await import('./blueprintStorage');

  // Check if one exists
  const existing = await getTopicalMapBlueprint(topicalMapId);
  if (existing) {
    return {
      topicalMapId: existing.topical_map_id,
      projectId: existing.project_id,
      defaults: {
        visualStyle: existing.visual_style || undefined,
        pacing: existing.pacing || undefined,
        colorIntensity: existing.color_intensity || undefined,
        ctaStrategy: {
          positions: (existing.cta_positions || undefined) as ('after-intro' | 'mid-content' | 'before-faq' | 'end')[] | undefined,
          intensity: existing.cta_intensity as 'subtle' | 'moderate' | 'prominent' | undefined,
          style: existing.cta_style as 'inline' | 'banner' | 'floating' | undefined,
        },
      },
      componentPreferences: (existing.component_preferences || {}) as Partial<ProjectBlueprint['componentPreferences']>,
      clusterSpecificRules: (existing.cluster_rules || []) as TopicalMapBlueprint['clusterSpecificRules'],
      reasoning: existing.ai_reasoning || '',
      generatedAt: existing.created_at || new Date().toISOString(),
    };
  }

  // Ensure project blueprint exists first
  await ensureProjectBlueprint(projectId, businessInfo);

  // Generate and save new one
  const generated = generateTopicalMapBlueprint(topicalMapId, projectId, mapName, topicCluster);

  await upsertTopicalMapBlueprint(topicalMapId, projectId, generated);

  return generated;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { ArchitectInput, LayoutBlueprint, ContentSignals };

// Re-export v2.0 types from their modules
export type {
  RichArchitectContext,
  ParsedSection,
} from './contextAssembler';

export type {
  CoherenceAnalysis,
} from './coherenceEngine';
