/**
 * Layout Intelligence Service
 *
 * AI-driven service that analyzes sections and makes intelligent
 * layout decisions based on content, context, and SEO requirements.
 *
 * Uses the centralized AI service layer for proper telemetry and billing.
 *
 * @module services/semantic-layout/LayoutIntelligenceService
 */

import type {
  ArticleContext,
  ArticleSectionInput,
  SectionIntelligence,
  SectionContentType,
  SemanticLayoutBlueprint,
  BlueprintSection,
  StructureTransformation,
  ILayoutIntelligenceService,
  ComponentType,
  VisualEmphasis,
  BackgroundTreatment,
  TOCBlueprint,
  TOCItem,
} from './types';
import { generateSectionAnalysisPrompt } from './prompts/sectionAnalysis';
import { getTransformationPrompt } from './prompts/structureTransformation';
import {
  generateLayoutText,
  generateLayoutJson,
  setLayoutUsageContext,
  LAYOUT_OPERATIONS,
} from '../ai/layoutIntelligence';
import type { BusinessInfo } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { repairJson, safeJsonParse } from '../../utils/jsonRepair';

/**
 * Options for LayoutIntelligenceService
 */
interface LayoutIntelligenceOptions {
  /** Business info containing API keys and provider settings */
  businessInfo: BusinessInfo;
  /** React dispatch for logging */
  dispatch: React.Dispatch<any>;
  /** Maximum sections to analyze in parallel */
  batchSize?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Layout Intelligence Service
 *
 * Analyzes content sections and generates intelligent layout blueprints
 * using AI to understand content structure and recommend visual presentation.
 *
 * This service uses the centralized AI layer which handles:
 * - Provider routing (Gemini, Anthropic, OpenAI, etc.)
 * - Model selection and validation
 * - Telemetry and cost tracking
 * - Retry logic and error handling
 */
export class LayoutIntelligenceService implements ILayoutIntelligenceService {
  private businessInfo: BusinessInfo;
  private dispatch: React.Dispatch<any>;
  private batchSize: number;
  private debug: boolean;

  constructor(options: LayoutIntelligenceOptions) {
    this.businessInfo = options.businessInfo;
    this.dispatch = options.dispatch;
    this.batchSize = options.batchSize ?? 3; // Conservative default for rate limits
    this.debug = options.debug ?? false;
  }

  /**
   * Set context for usage tracking
   */
  setContext(context: { projectId?: string; mapId?: string; topicId?: string }): void {
    setLayoutUsageContext(context);
  }

  /**
   * Analyze a single section
   */
  async analyzeSection(
    section: ArticleSectionInput,
    context: ArticleContext
  ): Promise<SectionIntelligence> {
    const prompt = generateSectionAnalysisPrompt(
      section,
      context,
      context.content.sections.length
    );

    if (this.debug) {
      console.log(`[LayoutIntelligence] Analyzing section: ${section.heading}`);
    }

    try {
      const response = await generateLayoutText(
        prompt,
        this.businessInfo,
        this.dispatch,
        LAYOUT_OPERATIONS.SECTION_ANALYSIS
      );
      const parsed = this.parseAnalysisResponse(response, section);

      if (this.debug) {
        console.log(`[LayoutIntelligence] Section ${section.id} analysis:`, {
          contentType: parsed.contentType,
          component: parsed.visualRecommendation.primaryComponent,
          emphasis: parsed.visualRecommendation.emphasis,
        });
      }

      return parsed;
    } catch (error) {
      console.error(`[LayoutIntelligence] Failed to analyze section ${section.id}:`, error);
      // Use INTELLIGENT fallback based on content analysis
      console.log(`[LayoutIntelligence] Using content-based heuristic fallback for: ${section.heading}`);
      return this.analyzeContentForFallback(section);
    }
  }

  /**
   * Analyze multiple sections
   */
  async analyzeSections(
    sections: ArticleSectionInput[],
    context: ArticleContext
  ): Promise<SectionIntelligence[]> {
    const results: SectionIntelligence[] = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < sections.length; i += this.batchSize) {
      const batch = sections.slice(i, i + this.batchSize);

      if (this.debug) {
        console.log(`[LayoutIntelligence] Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(sections.length / this.batchSize)}`);
      }

      const batchResults = await Promise.all(
        batch.map(section => this.analyzeSection(section, context))
      );

      results.push(...batchResults);

      // Small delay between batches to avoid rate limits
      if (i + this.batchSize < sections.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Generate complete layout blueprint
   */
  async generateBlueprint(context: ArticleContext): Promise<SemanticLayoutBlueprint> {
    if (this.debug) {
      console.log('[LayoutIntelligence] Generating blueprint for:', context.content.title);
    }

    // Analyze all sections
    const sectionIntelligence = await this.analyzeSections(
      context.content.sections,
      context
    );

    // Ensure visual variety across sections
    const adjustedIntelligence = this.ensureVisualVariety(sectionIntelligence);

    // Build blueprint sections
    const blueprintSections = await this.buildBlueprintSections(
      context.content.sections,
      adjustedIntelligence,
      context
    );

    // Generate TOC if needed
    const toc = this.generateTOC(blueprintSections);

    // Collect unique components, emphasis levels, and backgrounds for CSS requirements
    const requiredComponents = [...new Set(blueprintSections.map(s => s.layout.component))];
    const requiredEmphasisLevels = [...new Set(blueprintSections.map(s => s.layout.emphasis))];
    const requiredBackgrounds = [...new Set(blueprintSections.map(s => s.layout.background))];

    // Create the blueprint
    const blueprint: SemanticLayoutBlueprint = {
      id: uuidv4(),
      articleId: uuidv4(),
      generatedAt: new Date(),
      version: '1.0',
      context: {
        searchIntent: context.content.searchIntent,
        contentType: context.content.contentType,
        brandPersonality: context.business.brandPersonality,
        primaryKeyword: context.content.primaryKeyword,
      },
      document: {
        title: context.content.title,
        metaDescription: `${context.content.title} - ${context.content.primaryKeyword}`,
        schema: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: context.content.title,
        },
      },
      sections: blueprintSections,
      toc,
      headerAccessories: [],
      footerAccessories: [],
      cssRequirements: {
        requiredComponents,
        requiredEmphasisLevels,
        requiredBackgrounds,
        brandVariables: {
          '--color-primary': context.brand.colorPalette.primary,
          '--color-secondary': context.brand.colorPalette.secondary,
          '--color-accent': context.brand.colorPalette.accent,
        },
      },
    };

    return blueprint;
  }

  /**
   * Transform section content to structured data
   */
  async transformSection(
    section: ArticleSectionInput,
    intelligence: SectionIntelligence,
    context: ArticleContext
  ): Promise<StructureTransformation | null> {
    const componentType = intelligence.visualRecommendation.primaryComponent;

    // Some components don't need transformation
    if (['prose', 'quote', 'callout'].includes(componentType)) {
      return null;
    }

    const prompt = getTransformationPrompt(componentType, section, intelligence);
    if (!prompt) return null;

    try {
      const response = await generateLayoutText(
        prompt,
        this.businessInfo,
        this.dispatch,
        LAYOUT_OPERATIONS.STRUCTURE_TRANSFORMATION
      );
      return this.parseTransformationResponse(response, componentType, section.id, section.content);
    } catch (error) {
      console.error(`[LayoutIntelligence] Failed to transform section ${section.id}:`, error);
      return null;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Parse AI response for section analysis
   */
  private parseAnalysisResponse(response: string, section: ArticleSectionInput): SectionIntelligence {
    const sectionId = section.id;

    try {
      // Use robust JSON repair utility
      const repaired = repairJson(response);
      const parsed = JSON.parse(repaired);

      return {
        sectionId,
        contentType: parsed.contentType || 'narrative',
        contentTypeConfidence: parsed.contentTypeConfidence || 0.7,
        contentTypeReasoning: parsed.contentTypeReasoning || 'Parsed from AI response',
        semanticWeight: parsed.semanticWeight || 3,
        attributeCategory: parsed.attributeCategory || 'ROOT',
        structureAnalysis: {
          hasImplicitList: parsed.structureAnalysis?.hasImplicitList || parsed.structureAnalysis?.hasActionableSteps || false,
          listItemCount: parsed.structureAnalysis?.listItemCount || 0,
          hasImplicitComparison: parsed.structureAnalysis?.hasImplicitComparison || false,
          comparisonSubjects: parsed.structureAnalysis?.comparisonSubjects || [],
          hasStatistics: parsed.structureAnalysis?.hasStatistics || false,
          extractedStats: parsed.structureAnalysis?.extractedStats || [],
          hasQuotableContent: parsed.structureAnalysis?.hasQuotableContent || false,
          quotableExcerpts: parsed.structureAnalysis?.quotableExcerpts || [],
          hasActionableSteps: parsed.structureAnalysis?.hasActionableSteps || false,
          stepCount: parsed.structureAnalysis?.stepCount || 0,
        },
        fsAnalysis: {
          hasTarget: parsed.fsAnalysis?.hasTarget || parsed.fsOptimization?.isCandidate || false,
          targetType: parsed.fsAnalysis?.targetType || parsed.fsOptimization?.targetType || null,
          targetQuestion: parsed.fsAnalysis?.targetQuestion || null,
          optimizationSuggestions: parsed.fsAnalysis?.optimizationSuggestions || [],
          currentCompliance: parsed.fsAnalysis?.currentCompliance || 0,
        },
        visualRecommendation: {
          primaryComponent: parsed.visualRecommendation?.primaryComponent || 'prose',
          primaryReasoning: parsed.visualRecommendation?.primaryReasoning || parsed.visualRecommendation?.reasoning || '',
          alternativeComponent: parsed.visualRecommendation?.alternativeComponent || parsed.visualRecommendation?.alternativeComponents?.[0] || 'prose',
          alternativeReasoning: parsed.visualRecommendation?.alternativeReasoning || '',
          emphasis: parsed.visualRecommendation?.emphasis || 'standard',
          layoutWidth: parsed.visualRecommendation?.layoutWidth || 'contained',
          backgroundTreatment: parsed.visualRecommendation?.backgroundTreatment || 'transparent',
        },
        accessories: {
          addCta: parsed.accessories?.addCta || false,
          ctaType: parsed.accessories?.ctaType || null,
          ctaPlacement: parsed.accessories?.ctaPlacement || null,
          ctaText: parsed.accessories?.ctaText || null,
          ctaReasoning: parsed.accessories?.ctaReasoning || '',
          addCallout: parsed.accessories?.addCallout || false,
          calloutContent: parsed.accessories?.calloutContent || null,
          calloutType: parsed.accessories?.calloutType || null,
          addStatHighlight: parsed.accessories?.addStatHighlight || false,
          statContent: parsed.accessories?.statContent || [],
          addVisualBreak: parsed.accessories?.addVisualBreak || false,
          breakType: parsed.accessories?.breakType || null,
        },
      };
    } catch (error) {
      console.error('[LayoutIntelligence] Failed to parse analysis response:', error);
      // INTELLIGENT FALLBACK: Use content analysis instead of just 'prose'
      console.log(`[LayoutIntelligence] Using content-based heuristic for: ${section.heading}`);
      return this.analyzeContentForFallback(section);
    }
  }

  /**
   * Parse AI response for structure transformation
   */
  private parseTransformationResponse(
    response: string,
    componentType: ComponentType,
    sectionId: string,
    originalContent: string
  ): StructureTransformation | null {
    try {
      // Use robust JSON repair utility
      const repaired = repairJson(response);
      const parsed = JSON.parse(repaired);

      return {
        sectionId,
        originalContent,
        targetComponent: componentType,
        transformedContent: parsed,
        extractionMethod: 'ai-transformation',
        confidenceScore: parsed.confidence || 0.7,
        warnings: [],
      };
    } catch (error) {
      console.error('[LayoutIntelligence] Failed to parse transformation:', error);
      return null;
    }
  }

  /**
   * Get default intelligence for a section (WITH content analysis)
   */
  private getDefaultIntelligence(section: ArticleSectionInput): SectionIntelligence {
    return this.analyzeContentForFallback(section);
  }

  /**
   * Get default intelligence for a section ID (fallback without content)
   */
  private getDefaultIntelligenceForId(sectionId: string): SectionIntelligence {
    return {
      sectionId,
      contentType: 'narrative',
      contentTypeConfidence: 0.5,
      contentTypeReasoning: 'Default fallback due to analysis failure',
      semanticWeight: 3,
      attributeCategory: 'ROOT',
      structureAnalysis: {
        hasImplicitList: false,
        listItemCount: 0,
        hasImplicitComparison: false,
        comparisonSubjects: [],
        hasStatistics: false,
        extractedStats: [],
        hasQuotableContent: false,
        quotableExcerpts: [],
        hasActionableSteps: false,
        stepCount: 0,
      },
      fsAnalysis: {
        hasTarget: false,
        targetType: null,
        targetQuestion: null,
        optimizationSuggestions: [],
        currentCompliance: 0,
      },
      visualRecommendation: {
        primaryComponent: 'prose',
        primaryReasoning: 'Default fallback due to analysis failure',
        alternativeComponent: 'feature-cards',
        alternativeReasoning: 'Alternative for visual variety',
        emphasis: 'standard',
        layoutWidth: 'contained',
        backgroundTreatment: 'transparent',
      },
      accessories: {
        addCta: false,
        ctaType: null,
        ctaPlacement: null,
        ctaText: null,
        ctaReasoning: '',
        addCallout: false,
        calloutContent: null,
        calloutType: null,
        addStatHighlight: false,
        statContent: [],
        addVisualBreak: false,
        breakType: null,
      },
    };
  }

  /**
   * INTELLIGENT CONTENT ANALYSIS for fallback - produces better results than plain 'prose'
   * This is used when AI JSON parsing fails, analyzing content structure to pick components
   */
  private analyzeContentForFallback(section: ArticleSectionInput): SectionIntelligence {
    const content = section.content || '';
    const heading = section.heading || '';
    const position = section.position;

    // Content pattern detection (heuristics)
    const hasNumberedList = /^\d+\.\s/m.test(content) || /\n\d+\.\s/m.test(content);
    const hasBulletList = /^[\-\*]\s/m.test(content) || /\n[\-\*]\s/m.test(content);
    const hasMultipleSections = (content.match(/\n#{2,3}\s/g) || []).length >= 2;
    const hasPercentages = /%/.test(content);
    const hasNumbers = /\b\d{2,}[+%]?\b/.test(content);
    const hasComparison = /vs\.?|versus|compared to|in contrast|alternatively/i.test(content);
    const hasSteps = /step\s*\d|first|second|third|then|next|finally|stap\s*\d|eerst|daarna|vervolgens/i.test(content);
    const hasQuestions = /\?/.test(heading) || content.split('?').length > 2;
    const hasDefinition = /is een|zijn|worden gedefinieerd als|betekent/i.test(content);
    const isIntro = position === 0 || heading.toLowerCase().includes('intro');
    const isConclusion = /conclusie|samenvatting|conclusion|summary|tot slot/i.test(heading);

    // Count list items
    const numberedItems = (content.match(/^\d+\.\s/gm) || []).length + (content.match(/\n\d+\.\s/g) || []).length;
    const bulletItems = (content.match(/^[\-\*]\s/gm) || []).length + (content.match(/\n[\-\*]\s/g) || []).length;
    const listItemCount = Math.max(numberedItems, bulletItems);

    // Determine best component based on content analysis
    let primaryComponent: ComponentType = 'prose';
    let alternativeComponents: ComponentType[] = [];
    let emphasis: VisualEmphasis = 'standard';
    let contentType = 'explanation';
    let reasoning = 'Content-based heuristic analysis';

    // PRIORITY ORDER: More specific patterns first
    if (hasQuestions && listItemCount === 0) {
      primaryComponent = 'faq-accordion';
      alternativeComponents = ['prose'];
      contentType = 'faq';
      emphasis = 'featured';
      reasoning = 'Detected Q&A structure based on question marks';
    } else if (hasSteps && listItemCount >= 3) {
      primaryComponent = 'timeline';
      alternativeComponents = ['numbered-list', 'feature-cards'];
      contentType = 'process';
      emphasis = 'featured';
      reasoning = 'Detected sequential steps/process content';
    } else if (hasPercentages && hasNumbers) {
      primaryComponent = 'stat-grid';
      alternativeComponents = ['feature-cards', 'prose'];
      contentType = 'evidence';
      emphasis = 'featured';
      reasoning = 'Detected statistics and metrics';
    } else if (hasComparison) {
      primaryComponent = 'comparison-table';
      alternativeComponents = ['feature-cards', 'prose'];
      contentType = 'comparison';
      emphasis = 'featured';
      reasoning = 'Detected comparison language';
    } else if (listItemCount >= 5) {
      primaryComponent = 'feature-cards';
      alternativeComponents = ['numbered-list', 'prose'];
      contentType = 'enumeration';
      emphasis = 'standard';
      reasoning = `Detected ${listItemCount} list items - ideal for feature cards`;
    } else if (listItemCount >= 3) {
      primaryComponent = hasNumberedList ? 'numbered-list' : 'checklist';
      alternativeComponents = ['feature-cards', 'prose'];
      contentType = 'enumeration';
      emphasis = 'standard';
      reasoning = `Detected ${listItemCount} list items`;
    } else if (hasDefinition && position <= 2) {
      primaryComponent = 'quote-callout';
      alternativeComponents = ['lead-paragraph', 'prose'];
      contentType = 'definition';
      emphasis = 'featured';
      reasoning = 'Detected definition/explanation content early in article';
    } else if (isIntro) {
      primaryComponent = 'lead-paragraph';
      alternativeComponents = ['prose'];
      contentType = 'narrative';
      emphasis = 'hero';
      reasoning = 'Introduction section - hero emphasis for visual impact';
    } else if (isConclusion) {
      primaryComponent = 'quote-callout';
      alternativeComponents = ['prose'];
      contentType = 'narrative';
      emphasis = 'featured';
      reasoning = 'Conclusion section - callout for emphasis';
    } else if (content.length > 1500) {
      // Long content sections should still look interesting
      primaryComponent = 'prose';
      alternativeComponents = ['feature-cards'];
      contentType = 'narrative';
      emphasis = 'standard';
      reasoning = 'Long prose section';
    } else {
      // Default: still make it look good
      primaryComponent = 'prose';
      alternativeComponents = ['quote-callout'];
      contentType = 'narrative';
      emphasis = position % 3 === 1 ? 'featured' : 'standard'; // Vary emphasis for visual rhythm
      reasoning = 'Standard content with varied emphasis for visual rhythm';
    }

    // Boost emphasis for first main section
    if (position === 1 && emphasis === 'standard') {
      emphasis = 'featured';
      reasoning += ' (boosted for first main section)';
    }

    // Map contentType to valid SectionContentType
    const validContentType = contentType as SectionContentType;

    return {
      sectionId: section.id,
      contentType: validContentType,
      contentTypeConfidence: 0.7,
      contentTypeReasoning: reasoning,
      semanticWeight: emphasis === 'hero' ? 5 : emphasis === 'featured' ? 4 : 3,
      attributeCategory: emphasis === 'hero' ? 'UNIQUE' : emphasis === 'featured' ? 'RARE' : 'ROOT',
      structureAnalysis: {
        hasImplicitList: listItemCount > 0,
        listItemCount,
        hasImplicitComparison: hasComparison,
        comparisonSubjects: [],
        hasStatistics: hasNumbers || hasPercentages,
        extractedStats: [],
        hasQuotableContent: false,
        quotableExcerpts: [],
        hasActionableSteps: hasSteps,
        stepCount: hasSteps ? listItemCount : 0,
      },
      fsAnalysis: {
        hasTarget: hasQuestions || listItemCount >= 3,
        targetType: hasQuestions ? 'list' : listItemCount >= 3 ? 'list' : null,
        targetQuestion: null,
        optimizationSuggestions: [],
        currentCompliance: 60,
      },
      visualRecommendation: {
        primaryComponent,
        primaryReasoning: reasoning,
        alternativeComponent: alternativeComponents[0] || 'prose',
        alternativeReasoning: 'Fallback option',
        emphasis,
        layoutWidth: emphasis === 'hero' ? 'full' : 'contained',
        backgroundTreatment: emphasis === 'featured' ? 'subtle-gray' : 'transparent',
      },
      accessories: {
        addCta: false,
        ctaType: null,
        ctaPlacement: null,
        ctaText: null,
        ctaReasoning: '',
        addCallout: false,
        calloutContent: null,
        calloutType: null,
        addStatHighlight: hasNumbers || hasPercentages,
        statContent: [],
        addVisualBreak: false,
        breakType: null,
      },
    };
  }

  /**
   * Ensure visual variety across sections - CRITICAL for design-agency quality
   *
   * Design agency rule: No more than 40% of sections should be plain prose.
   * Visual components (cards, grids, timelines, tables) create the "wow factor".
   */
  private ensureVisualVariety(intelligence: SectionIntelligence[]): SectionIntelligence[] {
    const maxConsecutive = 2;
    const minVisualPercentage = 0.4; // At least 40% should be visual components

    // Visual components that create design impact
    const visualComponents = [
      'feature-cards', 'stat-grid', 'timeline', 'comparison-table',
      'faq', 'checklist', 'numbered-list', 'definition-box', 'callout'
    ];

    // First pass: prevent consecutive same components
    let result = intelligence.map((section, index) => {
      const component = section.visualRecommendation.primaryComponent;

      // Count consecutive same components
      let consecutive = 0;
      for (let i = index - 1; i >= 0 && i >= index - maxConsecutive; i--) {
        if (intelligence[i].visualRecommendation.primaryComponent === component) {
          consecutive++;
        } else {
          break;
        }
      }

      // If too many consecutive, switch to alternative
      const altComponent = section.visualRecommendation.alternativeComponent;
      if (consecutive >= maxConsecutive && altComponent && altComponent !== 'prose') {
        return {
          ...section,
          visualRecommendation: {
            ...section.visualRecommendation,
            primaryComponent: altComponent,
            primaryReasoning: section.visualRecommendation.primaryReasoning + ' (switched for variety)',
          },
        };
      }

      return section;
    });

    // QUALITY GATE: Count visual vs prose sections
    const proseCount = result.filter(s => s.visualRecommendation.primaryComponent === 'prose').length;
    const visualCount = result.filter(s => visualComponents.includes(s.visualRecommendation.primaryComponent)).length;
    const totalSections = result.length;

    const visualPercentage = totalSections > 0 ? visualCount / totalSections : 0;

    if (this.debug) {
      console.log('[LayoutIntelligence] Quality check:', {
        proseCount,
        visualCount,
        totalSections,
        visualPercentage: (visualPercentage * 100).toFixed(1) + '%',
        target: (minVisualPercentage * 100) + '%',
      });
    }

    // If too many prose sections, upgrade some to visual components
    if (visualPercentage < minVisualPercentage && totalSections >= 5) {
      const targetVisualCount = Math.ceil(totalSections * minVisualPercentage);
      const needUpgrade = targetVisualCount - visualCount;

      if (needUpgrade > 0) {
        console.log(`[LayoutIntelligence] QUALITY UPGRADE: Converting ${needUpgrade} prose sections to visual components`);

        // Find prose sections that can be upgraded
        const proseIndices = result
          .map((s, i) => s.visualRecommendation.primaryComponent === 'prose' ? i : -1)
          .filter(i => i >= 0);

        // Prioritize middle sections for upgrade (leave intro/conclusion as prose if appropriate)
        const middleSections = proseIndices.filter(i => i > 0 && i < totalSections - 1);
        const upgradeCandidates = middleSections.slice(0, needUpgrade);

        // Upgrade pattern: alternate between feature-cards, stat-grid, quote-callout
        const upgradeComponents: ComponentType[] = ['feature-cards', 'stat-grid', 'quote-callout', 'step-cards'];

        upgradeCandidates.forEach((sectionIndex, upgradeIndex) => {
          const newComponent = upgradeComponents[upgradeIndex % upgradeComponents.length];
          const section = result[sectionIndex];

          result[sectionIndex] = {
            ...section,
            visualRecommendation: {
              ...section.visualRecommendation,
              primaryComponent: newComponent,
              alternativeComponent: 'prose',
              emphasis: 'featured',
              primaryReasoning: section.visualRecommendation.primaryReasoning + ` (upgraded to ${newComponent} for visual variety - design quality gate)`,
            },
          };

          console.log(`[LayoutIntelligence] Upgraded section ${sectionIndex} from prose to ${newComponent}`);
        });
      }
    }

    // Log final distribution
    const finalCounts: Record<string, number> = {};
    result.forEach(s => {
      const comp = s.visualRecommendation.primaryComponent;
      finalCounts[comp] = (finalCounts[comp] || 0) + 1;
    });

    if (this.debug) {
      console.log('[LayoutIntelligence] Final component distribution:', finalCounts);
    }

    return result;
  }

  /**
   * Build blueprint sections from analyzed content
   */
  private async buildBlueprintSections(
    sections: ArticleSectionInput[],
    intelligence: SectionIntelligence[],
    context: ArticleContext
  ): Promise<BlueprintSection[]> {
    const blueprintSections: BlueprintSection[] = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const intel = intelligence[i];

      // Transform content if needed, with fallback for null
      const transformation = await this.transformSection(section, intel, context) ?? {
        sectionId: section.id,
        originalContent: section.content,
        targetComponent: intel.visualRecommendation?.primaryComponent || 'prose',
        transformedContent: {
          type: 'prose' as const,
          paragraphs: section.content.split(/\n\n+/).filter(Boolean),
        },
        extractionMethod: 'fallback-no-transformation',
        confidenceScore: 0.3,
        warnings: ['Transformation returned null, using prose fallback'],
      };

      const spacingValues = this.getSpacingForPosition(i, sections.length);
      const blueprintSection: BlueprintSection = {
        id: section.id,
        heading: {
          text: section.heading,
          level: (section.headingLevel || 2) as 1 | 2 | 3 | 4,
          id: `heading-${section.id}`,
        },
        intelligence: intel,
        transformation,
        layout: {
          component: intel.visualRecommendation.primaryComponent || 'prose',
          emphasis: intel.visualRecommendation.emphasis || 'standard',
          width: this.getWidthForEmphasis(intel.visualRecommendation.emphasis),
          background: this.getBackgroundForEmphasis(intel.visualRecommendation.emphasis),
          spacing: {
            marginTop: spacingValues.marginTop,
            marginBottom: spacingValues.marginBottom,
            paddingY: spacingValues.paddingY,
          },
        },
        accessories: [],
        internalLinks: [],
        position: i,
      };

      blueprintSections.push(blueprintSection);
    }

    return blueprintSections;
  }

  /**
   * Generate TOC from sections
   */
  private generateTOC(sections: BlueprintSection[]): TOCBlueprint {
    const items: TOCItem[] = sections
      .filter(s => s.heading.level <= 3)
      .map(s => ({
        id: s.id,
        text: s.heading.text,
        level: s.heading.level,
      }));

    return {
      items,
      style: 'inline',
      position: 'after-intro',
      showOnMobile: true,
    };
  }

  /**
   * Calculate component distribution
   */
  private calculateComponentDistribution(
    sections: BlueprintSection[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const section of sections) {
      const component = section.intelligence.visualRecommendation.primaryComponent;
      distribution[component] = (distribution[component] || 0) + 1;
    }
    return distribution;
  }

  // Layout helper methods
  private getWidthForEmphasis(emphasis: VisualEmphasis): 'full' | 'contained' | 'narrow' {
    switch (emphasis) {
      case 'hero': return 'full';
      case 'supporting': return 'narrow';
      default: return 'contained';
    }
  }

  private getColumnsForComponent(component: ComponentType): 1 | 2 | 3 | 4 {
    switch (component) {
      case 'feature-cards':
      case 'stat-grid':
        return 3;
      case 'comparison-table':
        return 2;
      default:
        return 1;
    }
  }

  private getSpacingForPosition(position: number, total: number): { marginTop: string; marginBottom: string; paddingY: string } {
    if (position === 0) {
      return { marginTop: '3rem', marginBottom: '2rem', paddingY: '2rem' };
    }
    if (position === total - 1) {
      return { marginTop: '2rem', marginBottom: '3rem', paddingY: '1.5rem' };
    }
    return { marginTop: '2rem', marginBottom: '2rem', paddingY: '1.5rem' };
  }

  private getBackgroundForEmphasis(emphasis: VisualEmphasis): BackgroundTreatment {
    switch (emphasis) {
      case 'hero': return 'gradient';
      case 'featured': return 'subtle-gray';
      default: return 'transparent';
    }
  }
}
