/**
 * Decision-to-Blueprint Mapper
 *
 * Maps Phase 3 Intelligence `SectionDesignDecision[]` to the layout engine's
 * `LayoutBlueprint` format for use in article rendering.
 *
 * This bridges the gap between the brand replication pipeline's AI-driven
 * design decisions and the existing rendering infrastructure.
 *
 * @module services/brand-replication/integration/decisionMapper
 */

import type { SectionDesignDecision, ArticleSection } from '../interfaces/phase3-intelligence';
import type { BrandComponent } from '../interfaces/phase2-codegen';
import type {
  LayoutBlueprint as LayoutEngineBlueprint,
  BlueprintSection,
  EmphasisLevel,
  LayoutWidth,
  ColumnLayout,
  VerticalSpacing,
  VisualEmphasis,
  ComponentSelection,
  LayoutParameters,
  SectionConstraints,
  ContentType,
  ComponentType,
} from '../../layout-engine/types';
import type { LayoutBlueprint as ArchitectBlueprint } from '../../publishing/architect/blueprintTypes';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Article content input for the mapper
 */
export interface ArticleContent {
  title: string;
  fullContent: string;
  sections: ArticleSection[];
}

/**
 * Options for mapping decisions to blueprint
 */
export interface DecisionMapperOptions {
  /** Include reasoning in the output */
  includeReasoning?: boolean;
  /** Default visual emphasis for unmapped sections */
  defaultEmphasis?: EmphasisLevel;
  /** Default component for unmapped sections */
  defaultComponent?: ComponentType;
  /** Brand name for metadata */
  brandName?: string;
}

// ============================================================================
// MAPPING HELPERS
// ============================================================================

/**
 * Map Phase 3 emphasis to layout engine EmphasisLevel
 */
function mapEmphasis(
  emphasis: SectionDesignDecision['layout']['emphasis']
): EmphasisLevel {
  // Direct mapping - they use the same terminology
  return emphasis;
}

/**
 * Map Phase 3 width to layout engine LayoutWidth
 */
function mapWidth(
  width: SectionDesignDecision['layout']['width']
): LayoutWidth {
  // Direct mapping
  return width;
}

/**
 * Map Phase 3 columns to layout engine ColumnLayout
 */
function mapColumns(columns: 1 | 2 | 3 | 4): ColumnLayout {
  switch (columns) {
    case 1:
      return '1-column';
    case 2:
      return '2-column';
    case 3:
      return '3-column';
    case 4:
      return '2-column'; // 4-column maps to 2-column as layout engine doesn't have 4-col
    default:
      return '1-column';
  }
}

/**
 * Map emphasis level to vertical spacing
 */
function emphasisToSpacing(emphasis: EmphasisLevel): VerticalSpacing {
  switch (emphasis) {
    case 'hero':
      return 'dramatic';
    case 'featured':
      return 'generous';
    case 'standard':
      return 'normal';
    case 'supporting':
      return 'normal';
    case 'minimal':
      return 'tight';
    default:
      return 'normal';
  }
}

/**
 * Map component name to ComponentType
 * Phase 3 uses string component names; layout engine uses typed enums
 */
function mapComponentToType(componentName: string): ComponentType {
  // Normalize the component name
  const normalized = componentName.toLowerCase().replace(/[-_\s]/g, '-');

  // Map known components
  const componentMap: Record<string, ComponentType> = {
    'prose': 'prose',
    'card': 'card',
    'hero': 'hero',
    'feature-grid': 'feature-grid',
    'accordion': 'accordion',
    'timeline': 'timeline',
    'comparison-table': 'comparison-table',
    'testimonial-card': 'testimonial-card',
    'key-takeaways': 'key-takeaways',
    'cta-banner': 'cta-banner',
    'step-list': 'step-list',
    'checklist': 'checklist',
    'stat-highlight': 'stat-highlight',
    'blockquote': 'blockquote',
    'definition-box': 'definition-box',
    'faq-accordion': 'faq-accordion',
    'faq': 'faq-accordion',
    // Additional mappings
    'list': 'checklist',
    'steps': 'step-list',
    'stats': 'stat-highlight',
    'quote': 'blockquote',
    'definition': 'definition-box',
    'testimonial': 'testimonial-card',
    'features': 'feature-grid',
    'intro': 'prose',
    'introduction': 'prose',
    'conclusion': 'prose',
    'summary': 'key-takeaways',
  };

  return componentMap[normalized] || 'prose';
}

/**
 * Detect content type from section heading and content
 */
function detectContentType(
  heading: string,
  content: string,
  component: string
): ContentType {
  const headingLower = heading.toLowerCase();
  const contentLower = content.toLowerCase();

  // FAQ detection
  if (headingLower.includes('faq') || headingLower.includes('frequently asked') ||
      headingLower.includes('veelgestelde vragen') || component.includes('faq')) {
    return 'faq';
  }

  // Steps/process detection
  if (headingLower.includes('steps') || headingLower.includes('how to') ||
      headingLower.includes('stappen') || component.includes('step') ||
      component.includes('timeline')) {
    return 'steps';
  }

  // Comparison detection
  if (headingLower.includes('comparison') || headingLower.includes('vs') ||
      headingLower.includes('vergelijk') || component.includes('comparison')) {
    return 'comparison';
  }

  // Summary detection
  if (headingLower.includes('summary') || headingLower.includes('conclusion') ||
      headingLower.includes('samenvatting') || headingLower.includes('conclusie')) {
    return 'summary';
  }

  // Introduction detection
  if (headingLower.includes('intro') || headingLower.includes('what is') ||
      headingLower.includes('overview') || headingLower.includes('wat is')) {
    return 'introduction';
  }

  // List detection
  if (contentLower.includes('<ul>') || contentLower.includes('<ol>') ||
      component.includes('list') || component.includes('checklist')) {
    return 'list';
  }

  // Data/stats detection
  if (component.includes('stat') || headingLower.includes('data') ||
      headingLower.includes('statistics') || headingLower.includes('statistiek')) {
    return 'data';
  }

  // Testimonial detection
  if (component.includes('testimonial') || headingLower.includes('review') ||
      headingLower.includes('testimonial')) {
    return 'testimonial';
  }

  // Default to explanation
  return 'explanation';
}

/**
 * Create VisualEmphasis from decision layout
 */
function createVisualEmphasis(
  emphasis: EmphasisLevel,
  hasBackground: boolean = false
): VisualEmphasis {
  const emphasisConfig: Record<EmphasisLevel, Partial<VisualEmphasis>> = {
    hero: {
      level: 'hero',
      headingSize: 'xl',
      headingDecoration: { type: 'background' },
      paddingMultiplier: 2,
      marginMultiplier: 2,
      hasBackgroundTreatment: true,
      backgroundType: 'gradient',
      elevation: 2,
      hasEntryAnimation: true,
      animationType: 'scale',
    },
    featured: {
      level: 'featured',
      headingSize: 'lg',
      headingDecoration: { type: 'border-bottom' },
      paddingMultiplier: 1.5,
      marginMultiplier: 1.5,
      hasBackgroundTreatment: hasBackground,
      backgroundType: hasBackground ? 'solid' : undefined,
      elevation: 1,
      hasEntryAnimation: true,
      animationType: 'fade',
    },
    standard: {
      level: 'standard',
      headingSize: 'md',
      headingDecoration: { type: 'none' },
      paddingMultiplier: 1,
      marginMultiplier: 1,
      hasBackgroundTreatment: hasBackground,
      backgroundType: hasBackground ? 'solid' : undefined,
      elevation: 0,
      hasEntryAnimation: false,
    },
    supporting: {
      level: 'supporting',
      headingSize: 'sm',
      headingDecoration: { type: 'none' },
      paddingMultiplier: 0.75,
      marginMultiplier: 0.75,
      hasBackgroundTreatment: false,
      elevation: 0,
      hasEntryAnimation: false,
    },
    minimal: {
      level: 'minimal',
      headingSize: 'sm',
      headingDecoration: { type: 'none' },
      paddingMultiplier: 0.5,
      marginMultiplier: 0.5,
      hasBackgroundTreatment: false,
      elevation: 0,
      hasEntryAnimation: false,
    },
  };

  const config = emphasisConfig[emphasis] || emphasisConfig.standard;

  return {
    level: config.level || 'standard',
    headingSize: config.headingSize || 'md',
    headingDecoration: config.headingDecoration || { type: 'none' },
    paddingMultiplier: config.paddingMultiplier || 1,
    marginMultiplier: config.marginMultiplier || 1,
    hasBackgroundTreatment: config.hasBackgroundTreatment || false,
    backgroundType: config.backgroundType,
    hasAccentBorder: emphasis === 'featured' || emphasis === 'hero',
    accentPosition: emphasis === 'featured' ? 'left' : emphasis === 'hero' ? 'all' : undefined,
    elevation: config.elevation || 0,
    hasEntryAnimation: config.hasEntryAnimation || false,
    animationType: config.animationType,
  };
}

/**
 * Create ComponentSelection from decision
 */
function createComponentSelection(
  decision: SectionDesignDecision
): ComponentSelection {
  const primaryComponent = mapComponentToType(decision.component);

  return {
    primaryComponent,
    alternativeComponents: [], // Could be enhanced with AI suggestions
    componentVariant: decision.variant,
    confidence: decision.confidence,
    reasoning: decision.reasoning,
  };
}

/**
 * Create LayoutParameters from decision layout
 */
function createLayoutParameters(
  layout: SectionDesignDecision['layout']
): LayoutParameters {
  const emphasis = mapEmphasis(layout.emphasis);

  return {
    width: mapWidth(layout.width),
    columns: mapColumns(layout.columns),
    imagePosition: 'none', // Could be enhanced with content mapping
    verticalSpacingBefore: emphasisToSpacing(emphasis),
    verticalSpacingAfter: emphasisToSpacing(emphasis),
    breakBefore: emphasis === 'hero' ? 'hard' : 'none',
    breakAfter: 'none',
    alignText: layout.columns > 1 ? 'left' : 'justify',
  };
}

/**
 * Generate CSS classes from decision
 */
function generateCssClasses(
  decision: SectionDesignDecision,
  component: BrandComponent | undefined
): string[] {
  const classes: string[] = [];

  // Base component class
  classes.push(`brand-section`);
  classes.push(`brand-section--${decision.layout.emphasis}`);

  // Width class
  classes.push(`brand-width--${decision.layout.width}`);

  // Column class
  if (decision.layout.columns > 1) {
    classes.push(`brand-cols--${decision.layout.columns}`);
  }

  // Component type class
  const componentType = mapComponentToType(decision.component);
  classes.push(`brand-component--${componentType}`);

  // Variant class if specified
  if (decision.variant) {
    classes.push(`brand-variant--${decision.variant}`);
  }

  // Add brand component ID if available
  if (component) {
    classes.push(`brand-id--${component.id}`);
  }

  return classes;
}

// ============================================================================
// MAIN MAPPER FUNCTION
// ============================================================================

/**
 * Map SectionDesignDecision[] to LayoutBlueprint format.
 *
 * This function converts the AI-driven design decisions from Phase 3
 * of the brand replication pipeline into the LayoutBlueprint format
 * expected by the layout engine and renderers.
 *
 * @param decisions - Array of design decisions from Phase 3 Intelligence
 * @param components - Array of brand components from Phase 2 CodeGen
 * @param content - Article content being rendered
 * @param options - Optional configuration
 * @returns LayoutBlueprint compatible with the layout engine
 */
export function mapDecisionsToBlueprint(
  decisions: SectionDesignDecision[],
  components: BrandComponent[],
  content: ArticleContent,
  options: DecisionMapperOptions = {}
): LayoutEngineBlueprint {
  const {
    includeReasoning = true,
    defaultEmphasis = 'standard',
    defaultComponent = 'prose',
    brandName = 'Brand',
  } = options;

  // Create component lookup map
  const componentMap = new Map<string, BrandComponent>();
  for (const component of components) {
    componentMap.set(component.id, component);
  }

  // Create section lookup map
  const sectionMap = new Map<string, ArticleSection>();
  for (const section of content.sections) {
    sectionMap.set(section.id, section);
  }

  // Map decisions to BlueprintSections
  const blueprintSections: BlueprintSection[] = [];
  let heroSectionId: string | undefined;
  let totalWeight = 0;

  for (let i = 0; i < decisions.length; i++) {
    const decision = decisions[i];
    const sourceSection = sectionMap.get(decision.sectionId);
    const component = componentMap.get(decision.componentId);

    // Get section content from source or decision
    const heading = sourceSection?.heading || decision.sectionHeading;
    const headingLevel = sourceSection?.headingLevel || 2;

    // Calculate semantic weight from emphasis
    const emphasisWeights: Record<EmphasisLevel, number> = {
      hero: 5,
      featured: 4,
      standard: 3,
      supporting: 2,
      minimal: 1,
    };
    const semanticWeight = emphasisWeights[decision.layout.emphasis] || 3;
    totalWeight += semanticWeight;

    // Track hero section
    if (decision.layout.emphasis === 'hero' && !heroSectionId) {
      heroSectionId = decision.sectionId;
    }

    // Create BlueprintSection
    const blueprintSection: BlueprintSection = {
      id: decision.sectionId,
      order: i,
      heading: heading,
      headingLevel: headingLevel,
      contentType: detectContentType(
        heading,
        sourceSection?.content || '',
        decision.component
      ),
      semanticWeight,
      layout: createLayoutParameters(decision.layout),
      emphasis: createVisualEmphasis(
        mapEmphasis(decision.layout.emphasis),
        decision.layout.emphasis === 'featured' || decision.layout.emphasis === 'hero'
      ),
      component: createComponentSelection(decision),
      constraints: {
        fsTarget: decision.semanticRole === 'featured-snippet-target',
        paaTarget: decision.semanticRole === 'paa-target',
      },
      contentZone: decision.layout.emphasis === 'minimal' ||
                   decision.layout.emphasis === 'supporting' ? 'SUPPLEMENTARY' : 'MAIN',
      cssClasses: generateCssClasses(decision, component),
      customStyles: component ? {
        // Include brand component CSS as custom style reference
        brandComponentId: component.id,
        brandComponentCss: component.css,
      } : undefined,
    };

    blueprintSections.push(blueprintSection);
  }

  // Handle sections without decisions (use defaults)
  for (const section of content.sections) {
    const hasDecision = decisions.some(d => d.sectionId === section.id);
    if (!hasDecision) {
      const semanticWeight = 2; // Default weight for unmapped sections
      totalWeight += semanticWeight;

      blueprintSections.push({
        id: section.id,
        order: blueprintSections.length,
        heading: section.heading,
        headingLevel: section.headingLevel,
        contentType: detectContentType(section.heading, section.content, defaultComponent),
        semanticWeight,
        layout: createLayoutParameters({
          columns: 1,
          width: 'medium',
          emphasis: defaultEmphasis,
        }),
        emphasis: createVisualEmphasis(defaultEmphasis),
        component: {
          primaryComponent: defaultComponent,
          alternativeComponents: [],
          confidence: 0.5,
          reasoning: 'Default component for unmapped section',
        },
        constraints: {},
        contentZone: 'MAIN',
        cssClasses: ['brand-section', `brand-section--${defaultEmphasis}`],
      });
    }
  }

  // Sort by order
  blueprintSections.sort((a, b) => a.order - b.order);

  // Calculate metadata
  const mainSections = blueprintSections.filter(s => s.contentZone === 'MAIN');
  const supplementarySections = blueprintSections.filter(s => s.contentZone === 'SUPPLEMENTARY');
  const averageWeight = blueprintSections.length > 0 ? totalWeight / blueprintSections.length : 0;

  // Create the LayoutBlueprint
  const blueprint: LayoutEngineBlueprint = {
    id: `blueprint-${Date.now()}`,
    articleId: content.sections[0]?.id || 'article',
    createdAt: new Date().toISOString(),
    version: 1,
    sections: blueprintSections,
    globalSettings: {
      defaultWidth: 'medium',
      defaultSpacing: 'normal',
      primaryFont: 'system-ui, sans-serif',
      secondaryFont: 'system-ui, sans-serif',
      colorScheme: 'light',
    },
    designDnaHash: `brand-decisions-${decisions.length}`,
    metadata: {
      totalSections: blueprintSections.length,
      mainSectionCount: mainSections.length,
      supplementarySectionCount: supplementarySections.length,
      averageSemanticWeight: Math.round(averageWeight * 100) / 100,
      heroSectionId,
    },
  };

  console.log('[DecisionMapper] Created blueprint from decisions:', {
    decisions: decisions.length,
    sections: blueprintSections.length,
    heroSection: heroSectionId,
    averageWeight: blueprint.metadata.averageSemanticWeight,
  });

  return blueprint;
}

/**
 * Merge pipeline decisions with an existing blueprint.
 *
 * Useful when you have a base blueprint and want to apply
 * specific design decisions on top of it.
 *
 * @param baseBlueprint - Existing blueprint to enhance
 * @param decisions - Design decisions to apply
 * @param components - Brand components for CSS references
 * @returns Merged blueprint with decision overrides
 */
export function mergeDecisionsWithBlueprint(
  baseBlueprint: LayoutEngineBlueprint,
  decisions: SectionDesignDecision[],
  components: BrandComponent[]
): LayoutEngineBlueprint {
  // Create decision lookup
  const decisionMap = new Map<string, SectionDesignDecision>();
  for (const decision of decisions) {
    decisionMap.set(decision.sectionId, decision);
  }

  // Create component lookup
  const componentMap = new Map<string, BrandComponent>();
  for (const component of components) {
    componentMap.set(component.id, component);
  }

  // Update sections with decisions
  const updatedSections = baseBlueprint.sections.map(section => {
    const decision = decisionMap.get(section.id);
    if (!decision) {
      return section; // Keep original if no decision
    }

    const component = componentMap.get(decision.componentId);

    // Apply decision overrides
    return {
      ...section,
      layout: createLayoutParameters(decision.layout),
      emphasis: createVisualEmphasis(mapEmphasis(decision.layout.emphasis)),
      component: {
        ...section.component,
        primaryComponent: mapComponentToType(decision.component),
        componentVariant: decision.variant,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
      },
      cssClasses: generateCssClasses(decision, component),
      customStyles: component ? {
        ...section.customStyles,
        brandComponentId: component.id,
        brandComponentCss: component.css,
      } : section.customStyles,
    };
  });

  // Recalculate metadata
  let heroSectionId: string | undefined;
  let totalWeight = 0;

  for (const section of updatedSections) {
    totalWeight += section.semanticWeight;
    if (section.emphasis.level === 'hero' && !heroSectionId) {
      heroSectionId = section.id;
    }
  }

  return {
    ...baseBlueprint,
    sections: updatedSections,
    designDnaHash: `merged-${decisions.length}-${Date.now()}`,
    metadata: {
      ...baseBlueprint.metadata,
      averageSemanticWeight: updatedSections.length > 0
        ? Math.round((totalWeight / updatedSections.length) * 100) / 100
        : 0,
      heroSectionId,
    },
  };
}

/**
 * Extract CSS from brand components used in decisions.
 *
 * Aggregates all CSS from the brand components referenced
 * in the design decisions for injection into the rendered output.
 *
 * @param decisions - Design decisions with component references
 * @param components - Brand components with CSS
 * @returns Compiled CSS string
 */
export function extractBrandCss(
  decisions: SectionDesignDecision[],
  components: BrandComponent[]
): string {
  const componentMap = new Map<string, BrandComponent>();
  for (const component of components) {
    componentMap.set(component.id, component);
  }

  const cssBlocks: string[] = [];
  const usedIds = new Set<string>();

  // Collect unique component CSS
  for (const decision of decisions) {
    const component = componentMap.get(decision.componentId);
    if (component && !usedIds.has(component.id)) {
      usedIds.add(component.id);
      cssBlocks.push(`/* Brand Component: ${component.name} */`);
      cssBlocks.push(component.css);

      // Include variant CSS if applicable
      if (decision.variant) {
        const variant = component.variants.find(v => v.name === decision.variant);
        if (variant?.cssOverrides) {
          cssBlocks.push(`/* Variant: ${variant.name} */`);
          cssBlocks.push(variant.cssOverrides);
        }
      }
    }
  }

  return cssBlocks.join('\n\n');
}

// Types are already exported from their interface definitions above
