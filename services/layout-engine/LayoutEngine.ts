/**
 * LayoutEngine
 *
 * Main orchestrator that ties together all layout engine components to generate
 * complete LayoutBlueprints. Coordinates SectionAnalyzer, LayoutPlanner,
 * ComponentSelector, VisualEmphasizer, and ImageHandler.
 *
 * Orchestration Flow:
 * 1. Analyze all sections using SectionAnalyzer
 * 2. For each section, generate BlueprintSection by coordinating all services
 * 3. Generate suggestions and auto-apply high-confidence ones (>= 0.8)
 * 4. Validate the blueprint (FS protection, semantic SEO, brand alignment)
 * 5. Build page settings from DesignDNA
 * 6. Generate layout strategy reasoning
 */

import { BriefSection } from '../../types';
import { DesignDNA } from '../../types/designDna';
import { SectionAnalyzer } from './SectionAnalyzer';
import { LayoutPlanner } from './LayoutPlanner';
import { ComponentSelector } from './ComponentSelector';
import { VisualEmphasizer } from './VisualEmphasizer';
import { ImageHandler } from './ImageHandler';
import { generateAILayoutBlueprint, type AIProvider } from './AILayoutPlanner';
import {
  BlueprintSection,
  ComponentSelection,
  ImagePlacement,
  LayoutParameters,
  LayoutSuggestion,
  SectionAnalysis,
  SemanticImagePlacement,
  VisualEmphasis,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Page settings derived from DesignDNA
 */
interface PageSettings {
  maxWidth: string;
  baseSpacing: string;
  colorMode: 'light' | 'dark' | 'auto';
}

/**
 * Blueprint reasoning data
 */
interface BlueprintReasoning {
  layoutStrategy: string;
  keyDecisions: string[];
  suggestionsApplied: LayoutSuggestion[];
  suggestionsSkipped: LayoutSuggestion[];
}

/**
 * Blueprint validation results
 */
interface BlueprintValidation {
  semanticSeoCompliant: boolean;
  fsProtectionMaintained: boolean;
  brandAlignmentScore: number;
  issues: string[];
}

/**
 * Complete layout blueprint for an article
 */
export interface LayoutBlueprintOutput {
  id: string;
  articleId: string;
  generatedAt: string;
  pageSettings: PageSettings;
  sections: BlueprintSection[];
  reasoning: BlueprintReasoning;
  validation: BlueprintValidation;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Width mapping from DesignDNA contentWidth to CSS
 */
const WIDTH_MAP: Record<string, string> = {
  narrow: '768px',
  medium: '1024px',
  wide: '1200px',
  full: '100%',
};

/**
 * Spacing mapping from DesignDNA density to CSS
 */
const SPACING_MAP: Record<string, string> = {
  compact: '16px',
  comfortable: '24px',
  spacious: '32px',
  airy: '48px',
};

/**
 * FS-compliant component types that preserve HTML structure
 */
const FS_COMPLIANT_COMPONENTS = ['prose', 'definition-box', 'key-takeaways', 'faq-accordion'];

/**
 * Suggestion confidence threshold for auto-apply
 */
const SUGGESTION_AUTO_APPLY_THRESHOLD = 0.8;

/**
 * Text-heavy sequence threshold (consecutive sections without visuals)
 */
const TEXT_HEAVY_THRESHOLD = 3;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique ID for the blueprint
 */
function generateId(): string {
  return `blueprint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Build page settings from DesignDNA
 */
function buildPageSettings(dna?: DesignDNA): PageSettings {
  const contentWidth = dna?.spacing?.contentWidth || 'medium';
  const density = dna?.spacing?.density || 'comfortable';

  return {
    maxWidth: WIDTH_MAP[contentWidth] || '1024px',
    baseSpacing: SPACING_MAP[density] || '24px',
    colorMode: 'auto', // Could be extended to read from DNA
  };
}

/**
 * Convert SemanticImagePlacement to ImagePlacement format
 */
function convertToImagePlacement(semantic: SemanticImagePlacement | null): ImagePlacement | undefined {
  if (!semantic) return undefined;

  // Map semantic position to basic ImagePosition
  const positionMap: Record<string, 'left' | 'right' | 'above' | 'below' | 'inline' | 'background' | 'none'> = {
    'after-intro-paragraph': 'below',
    'section-end': 'below',
    'float-right': 'right',
    'float-left': 'left',
    'full-width-break': 'above',
    inline: 'inline',
  };

  // Map semantic role to size
  const sizeMap: Record<string, 'small' | 'medium' | 'large' | 'full'> = {
    hero: 'full',
    explanatory: 'large',
    evidence: 'medium',
    decorative: 'small',
  };

  return {
    position: positionMap[semantic.position] || 'below',
    size: sizeMap[semantic.semanticRole] || 'medium',
    aspectRatio: semantic.placeholder?.aspectRatio || '16:9',
    wrapText: semantic.position === 'float-left' || semantic.position === 'float-right',
    caption: semantic.semanticRole !== 'decorative',
    lazyLoad: semantic.semanticRole !== 'hero',
    priority: semantic.semanticRole === 'hero' ? 'high' : semantic.semanticRole === 'explanatory' ? 'medium' : 'low',
  };
}

/**
 * Generate CSS classes from layout, component, and emphasis
 */
function generateCssClasses(
  layout: LayoutParameters,
  emphasis: VisualEmphasis,
  component: ComponentSelection,
  analysis: SectionAnalysis
): string[] {
  const classes: string[] = [];

  // Layout classes
  classes.push(`layout-${layout.columns}`);
  classes.push(`width-${layout.width}`);
  classes.push(`spacing-${layout.verticalSpacingBefore}`);
  classes.push(`align-${layout.alignText}`);

  // Emphasis classes
  classes.push(`emphasis-${emphasis.level}`);
  if (emphasis.hasBackgroundTreatment) {
    classes.push('has-background');
    if (emphasis.backgroundType) {
      classes.push(`bg-${emphasis.backgroundType}`);
    }
  }
  if (emphasis.hasAccentBorder) {
    classes.push('has-accent-border');
    if (emphasis.accentPosition) {
      classes.push(`accent-${emphasis.accentPosition}`);
    }
  }
  if (emphasis.elevation > 0) {
    classes.push(`elevation-${emphasis.elevation}`);
  }
  if (emphasis.hasEntryAnimation) {
    classes.push('has-animation');
    if (emphasis.animationType) {
      classes.push(`animate-${emphasis.animationType}`);
    }
  }

  // Component classes
  classes.push(`component-${component.primaryComponent}`);
  if (component.componentVariant) {
    classes.push(`variant-${component.componentVariant}`);
  }

  // Content type class
  classes.push(`content-${analysis.contentType}`);

  // Content zone class
  classes.push(`zone-${analysis.contentZone.toLowerCase()}`);

  // Special classes for constraints
  if (analysis.constraints.fsTarget) {
    classes.push('fs-protected');
  }
  if (analysis.constraints.paaTarget) {
    classes.push('paa-target');
  }

  return classes;
}

/**
 * Check if a section is text-heavy (no tables, lists, images)
 */
function isTextHeavySection(analysis: SectionAnalysis): boolean {
  return !analysis.hasTable && !analysis.hasList && !analysis.hasImage;
}

/**
 * Detect text-heavy sequences in sections
 */
function detectTextHeavySequences(analyses: SectionAnalysis[]): number[] {
  const suggestedBreakIndices: number[] = [];
  let consecutiveTextHeavy = 0;

  for (let i = 0; i < analyses.length; i++) {
    if (isTextHeavySection(analyses[i])) {
      consecutiveTextHeavy++;
      if (consecutiveTextHeavy >= TEXT_HEAVY_THRESHOLD) {
        // Suggest a visual break after this section (but not on FS-protected)
        if (!analyses[i].constraints?.fsTarget) {
          suggestedBreakIndices.push(i);
        }
        consecutiveTextHeavy = 0; // Reset after suggestion
      }
    } else {
      consecutiveTextHeavy = 0;
    }
  }

  return suggestedBreakIndices;
}

/**
 * Generate suggestions for visual breaks
 */
function generateSuggestions(analyses: SectionAnalysis[], dna?: DesignDNA): LayoutSuggestion[] {
  const suggestions: LayoutSuggestion[] = [];
  const breakIndices = detectTextHeavySequences(analyses);

  for (const index of breakIndices) {
    const analysis = analyses[index];

    // Skip FS-protected sections
    if (analysis.constraints?.fsTarget) continue;

    const layoutParams = LayoutPlanner.planLayout(analysis, dna);
    const visualEmphasis = VisualEmphasizer.calculateEmphasis(analysis, dna);
    const componentSelection = ComponentSelector.selectComponent(analysis, dna);

    suggestions.push({
      sectionAnalysis: analysis,
      layoutParameters: {
        ...layoutParams,
        breakAfter: 'soft', // Suggest visual break
      },
      visualEmphasis,
      componentSelection: {
        ...componentSelection,
        confidence: SUGGESTION_AUTO_APPLY_THRESHOLD, // High confidence for auto-apply
        reasoning: 'Visual break suggested after text-heavy sequence',
      },
    });
  }

  return suggestions;
}

/**
 * Check if FS protection is maintained for all FS sections
 */
function validateFsProtection(sections: BlueprintSection[]): boolean {
  const fsSections = sections.filter((s) => s.constraints.fsTarget);

  return fsSections.every((section) => {
    // FS sections must use compliant components
    const componentCompliant = FS_COMPLIANT_COMPONENTS.includes(section.component.primaryComponent);
    // FS sections must be single column
    const layoutCompliant = section.layout.columns === '1-column';

    return componentCompliant && layoutCompliant;
  });
}

/**
 * Calculate brand alignment score (placeholder implementation)
 */
function calculateBrandAlignmentScore(_sections: BlueprintSection[], _dna?: DesignDNA): number {
  // Placeholder: return 85 as specified in task
  // Future: calculate based on how well sections match DNA preferences
  return 85;
}

/**
 * Generate layout strategy reasoning string
 */
function generateLayoutStrategy(analyses: SectionAnalysis[], dna?: DesignDNA): string {
  const personality = dna?.personality?.overall || 'corporate';
  const density = dna?.spacing?.density || 'comfortable';

  const heroSections = analyses.filter((a) => a.semanticWeight >= 5);
  const fsSections = analyses.filter((a) => a.constraints?.fsTarget);
  const mainSections = analyses.filter((a) => a.contentZone === 'MAIN');

  const parts: string[] = [];

  parts.push(`Layout strategy for ${personality} brand personality with ${density} spacing density.`);

  if (heroSections.length > 0) {
    parts.push(`${heroSections.length} hero section(s) identified with weight 5.`);
  }

  if (fsSections.length > 0) {
    parts.push(`${fsSections.length} Featured Snippet protected section(s) with compliant layouts.`);
  }

  parts.push(`${mainSections.length} main zone sections, ${analyses.length - mainSections.length} supplementary.`);

  return parts.join(' ');
}

/**
 * Generate key decisions list for reasoning
 */
function generateKeyDecisions(
  analyses: SectionAnalysis[],
  sections: BlueprintSection[],
  dna?: DesignDNA
): string[] {
  const decisions: string[] = [];

  // Hero sections
  const heroSections = sections.filter((s) => s.emphasis.level === 'hero');
  if (heroSections.length > 0) {
    decisions.push(
      `Hero emphasis applied to ${heroSections.length} section(s): ${heroSections.map((s) => s.heading).join(', ')}`
    );
  }

  // FS-protected sections
  const fsSections = sections.filter((s) => s.constraints.fsTarget);
  if (fsSections.length > 0) {
    decisions.push(
      `FS-protection maintained for ${fsSections.length} section(s) using compliant components`
    );
  }

  // Multi-column layouts
  const multiColumnSections = sections.filter((s) => s.layout.columns !== '1-column');
  if (multiColumnSections.length > 0) {
    decisions.push(`Multi-column layout applied to ${multiColumnSections.length} section(s)`);
  }

  // Content zone distribution
  const mainCount = sections.filter((s) => s.contentZone === 'MAIN').length;
  const supplementaryCount = sections.filter((s) => s.contentZone === 'SUPPLEMENTARY').length;
  decisions.push(`Content zones: ${mainCount} main, ${supplementaryCount} supplementary`);

  // Brand personality influence
  if (dna?.personality?.overall) {
    decisions.push(`Brand personality '${dna.personality.overall}' influenced component variants`);
  }

  return decisions;
}

// =============================================================================
// LAYOUT ENGINE CLASS
// =============================================================================

export class LayoutEngine {
  /**
   * Generate a complete LayoutBlueprint from content and configuration
   */
  static generateBlueprint(
    content: string,
    briefSections?: BriefSection[],
    designDna?: DesignDNA,
    options?: {
      topicTitle?: string;
      isCoreTopic?: boolean;
      mainIntent?: string;
    }
  ): LayoutBlueprintOutput {
    // Step 1: Analyze all sections
    const analyses = SectionAnalyzer.analyzeAllSections(content, briefSections, options);

    // Handle empty content
    if (analyses.length === 0) {
      return LayoutEngine.buildEmptyBlueprint(designDna);
    }

    // Step 2: Generate BlueprintSections for each analysis
    const sections = LayoutEngine.buildBlueprintSections(analyses, designDna, content);

    // Step 3: Generate and process suggestions
    const suggestions = generateSuggestions(analyses, designDna);
    const { applied, skipped } = LayoutEngine.processSuggestions(suggestions, sections);

    // Step 4: Validate the blueprint
    const validation = LayoutEngine.validateBlueprint(sections, designDna);

    // Step 5: Build page settings
    const pageSettings = buildPageSettings(designDna);

    // Step 6: Generate reasoning
    const reasoning: BlueprintReasoning = {
      layoutStrategy: generateLayoutStrategy(analyses, designDna),
      keyDecisions: generateKeyDecisions(analyses, sections, designDna),
      suggestionsApplied: applied,
      suggestionsSkipped: skipped,
    };

    return {
      id: generateId(),
      articleId: `article-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      pageSettings,
      sections,
      reasoning,
      validation,
    };
  }

  /**
   * Generate a LayoutBlueprint using AI-based semantic analysis.
   *
   * Unlike pattern-based detection, this uses AI to understand content meaning,
   * making intelligent layout decisions like a professional designer would.
   *
   * Benefits:
   * - Understands the PURPOSE of each section, not just keywords
   * - Context-aware: considers how sections relate to each other
   * - Language-aware: works correctly with Dutch, German, etc.
   * - Produces visual VARIETY instead of monotonous layouts
   *
   * @param content - Full article content (markdown or HTML)
   * @param title - Article title
   * @param aiOptions - AI provider configuration
   * @param designDna - Optional brand design DNA for personality matching
   * @param options.fixInstructions - When provided, AI focuses on these specific improvements
   */
  static async generateBlueprintWithAI(
    content: string,
    title: string,
    aiOptions: {
      provider: AIProvider;
      apiKey: string;
    },
    designDna?: DesignDNA,
    options?: {
      language?: string;
      fixInstructions?: string; // Design quality fix instructions
    }
  ): Promise<LayoutBlueprintOutput & { aiReasoning?: { overallStrategy: string; keyDesignDecisions: string[] } }> {
    console.log('[LayoutEngine] Using AI-based layout planning');
    if (options?.fixInstructions) {
      console.log('[LayoutEngine] Fix instructions:', options.fixInstructions.substring(0, 100));
    }

    try {
      const { sections, aiReasoning } = await generateAILayoutBlueprint(content, title, {
        aiProvider: aiOptions.provider,
        apiKey: aiOptions.apiKey,
        designDna,
        language: options?.language,
        fixInstructions: options?.fixInstructions,
      });

      // Validate the AI-generated blueprint
      const validation = LayoutEngine.validateBlueprint(sections, designDna);

      // Build page settings
      const pageSettings = buildPageSettings(designDna);

      return {
        id: generateId(),
        articleId: `article-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        pageSettings,
        sections,
        reasoning: {
          layoutStrategy: aiReasoning.overallStrategy,
          keyDecisions: aiReasoning.keyDesignDecisions,
          suggestionsApplied: [],
          suggestionsSkipped: [],
        },
        validation,
        aiReasoning: {
          overallStrategy: aiReasoning.overallStrategy,
          keyDesignDecisions: aiReasoning.keyDesignDecisions,
        },
      };
    } catch (error) {
      console.error('[LayoutEngine] AI layout planning failed, falling back to pattern-based:', error);
      // Fall back to pattern-based
      return LayoutEngine.generateBlueprint(content, undefined, designDna);
    }
  }

  /**
   * Build BlueprintSections by orchestrating all services
   *
   * NOTE: This is pattern-based component selection. For agency-quality results,
   * use AI-based layout planning via LayoutEngine.generateBlueprintWithAI()
   */
  private static buildBlueprintSections(
    analyses: SectionAnalysis[],
    dna?: DesignDNA,
    content?: string
  ): BlueprintSection[] {
    // Split content into section contents for image handler
    const sectionContents = content ? LayoutEngine.splitContentBySections(content, analyses) : [];

    // Track consecutive same-component sections for variety
    let lastComponent: string | null = null;
    let consecutiveCount = 0;

    return analyses.map((analysis, index) => {
      // Get layout parameters
      const layout = LayoutPlanner.planLayout(analysis, dna);

      // Get component selection
      let component = ComponentSelector.selectComponent(analysis, dna);

      // VARIETY MECHANISM: Alternate between primary and alternatives for visual interest
      // If we have 2+ consecutive sections with same component, use alternatives
      if (component.primaryComponent === lastComponent) {
        consecutiveCount++;
        if (consecutiveCount >= 2 && component.alternativeComponents.length > 0) {
          // Use an alternative for variety
          const altIndex = (consecutiveCount - 2) % component.alternativeComponents.length;
          const alternativeComponent = component.alternativeComponents[altIndex];
          console.log(`[LayoutEngine] Variety: Switching from ${component.primaryComponent} to ${alternativeComponent} for section ${index}`);
          component = {
            ...component,
            primaryComponent: alternativeComponent,
            reasoning: `${component.reasoning} (Alternative selected for visual variety)`,
          };
        }
      } else {
        lastComponent = component.primaryComponent;
        consecutiveCount = 1;
      }

      // Get visual emphasis
      const emphasis = VisualEmphasizer.calculateEmphasis(analysis, dna);

      // Get image placement
      const semanticImage = ImageHandler.determineImagePlacement(analysis, dna, sectionContents[index]);
      const image = convertToImagePlacement(semanticImage);

      // Generate CSS classes
      const cssClasses = generateCssClasses(layout, emphasis, component, analysis);

      return {
        id: analysis.sectionId,
        order: index,
        heading: analysis.heading,
        headingLevel: analysis.headingLevel,
        contentType: analysis.contentType,
        semanticWeight: analysis.semanticWeight,
        layout,
        emphasis,
        component,
        image,
        constraints: analysis.constraints,
        contentZone: analysis.contentZone,
        cssClasses,
      };
    });
  }

  /**
   * Split content into sections for image handler analysis
   */
  private static splitContentBySections(content: string, analyses: SectionAnalysis[]): string[] {
    const sections: string[] = [];
    const headingPattern = /(?:^|\n)(#{1,6}\s+.+?(?:\n|$)|<h[1-6][^>]*>.*?<\/h[1-6]>)/gi;
    const matches = [...content.matchAll(headingPattern)];

    for (let i = 0; i < matches.length; i++) {
      const startIndex = matches[i].index || 0;
      const endIndex = matches[i + 1]?.index || content.length;
      sections.push(content.slice(startIndex, endIndex).trim());
    }

    // If no headings found but analyses exist, return content as single section
    if (sections.length === 0 && analyses.length > 0) {
      return [content];
    }

    return sections;
  }

  /**
   * Process suggestions: auto-apply high-confidence ones, skip others
   */
  private static processSuggestions(
    suggestions: LayoutSuggestion[],
    sections: BlueprintSection[]
  ): { applied: LayoutSuggestion[]; skipped: LayoutSuggestion[] } {
    const applied: LayoutSuggestion[] = [];
    const skipped: LayoutSuggestion[] = [];

    for (const suggestion of suggestions) {
      // Skip suggestions for FS-protected sections
      if (suggestion.sectionAnalysis.constraints?.fsTarget) {
        skipped.push(suggestion);
        continue;
      }

      // Auto-apply high-confidence suggestions
      if (suggestion.componentSelection.confidence >= SUGGESTION_AUTO_APPLY_THRESHOLD) {
        // Find and update the corresponding section
        const sectionIndex = sections.findIndex(
          (s) => s.id === suggestion.sectionAnalysis.sectionId
        );

        if (sectionIndex !== -1) {
          // Apply the suggested break
          sections[sectionIndex].layout.breakAfter = suggestion.layoutParameters.breakAfter;
          applied.push(suggestion);
        }
      } else {
        skipped.push(suggestion);
      }
    }

    return { applied, skipped };
  }

  /**
   * Validate the blueprint for FS protection, semantic SEO, and brand alignment
   */
  private static validateBlueprint(
    sections: BlueprintSection[],
    dna?: DesignDNA
  ): BlueprintValidation {
    const issues: string[] = [];

    // Check FS protection
    const fsProtectionMaintained = validateFsProtection(sections);
    if (!fsProtectionMaintained) {
      issues.push('FS protection not maintained for some sections');
    }

    // Check semantic SEO compliance
    let semanticSeoCompliant = true;

    // LIFT Model validation: Logo → Index/Navigation → Featured Content → Topic Content
    // The first content section should be featured/hero, not supplementary
    if (sections.length >= 2) {
      const firstContent = sections[0];
      const lastContent = sections[sections.length - 1];
      // Featured/high-weight content should come before supplementary
      if (firstContent.semanticWeight < lastContent.semanticWeight &&
          firstContent.contentZone === 'SUPPLEMENTARY' &&
          lastContent.contentZone === 'MAIN') {
        issues.push('LIFT model violation: Featured/main content should appear before supplementary content');
        semanticSeoCompliant = false;
      }
    }

    // IR Zone validation: first section should be introduction-type content
    if (sections.length > 0) {
      const firstSection = sections[0];
      if (firstSection.contentZone === 'SUPPLEMENTARY') {
        issues.push('IR Zone: First section is supplementary — main content should appear first for core answer visibility');
      }
    }

    // Visual hierarchy: heading sizes should decrease with depth
    let prevHeadingLevel = 0;
    for (const section of sections) {
      if (section.headingLevel) {
        if (section.headingLevel < prevHeadingLevel &&
            section.headingLevel !== 1) {
          // Heading level jumped up (e.g., H3 followed by H2 in non-structural way)
          // Flag if weight doesn't match heading level
          if (section.semanticWeight > 3 && section.headingLevel > 2) {
            issues.push(`Visual hierarchy: High-weight section "${section.heading}" uses H${section.headingLevel} — consider promoting`);
          }
        }
        prevHeadingLevel = section.headingLevel;
      }
    }

    // Calculate brand alignment score
    const brandAlignmentScore = calculateBrandAlignmentScore(sections, dna);

    return {
      semanticSeoCompliant,
      fsProtectionMaintained,
      brandAlignmentScore,
      issues,
    };
  }

  /**
   * Build an empty blueprint for when there's no content
   */
  private static buildEmptyBlueprint(dna?: DesignDNA): LayoutBlueprintOutput {
    return {
      id: generateId(),
      articleId: `article-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      pageSettings: buildPageSettings(dna),
      sections: [],
      reasoning: {
        layoutStrategy: 'No content provided',
        keyDecisions: [],
        suggestionsApplied: [],
        suggestionsSkipped: [],
      },
      validation: {
        semanticSeoCompliant: true,
        fsProtectionMaintained: true,
        brandAlignmentScore: 100,
        issues: [],
      },
    };
  }

  // =============================================================================
  // INSTANCE METHODS (delegate to static methods)
  // =============================================================================

  generateBlueprint(
    content: string,
    briefSections?: BriefSection[],
    designDna?: DesignDNA,
    options?: {
      topicTitle?: string;
      isCoreTopic?: boolean;
      mainIntent?: string;
    }
  ): LayoutBlueprintOutput {
    return LayoutEngine.generateBlueprint(content, briefSections, designDna, options);
  }
}

export default LayoutEngine;
