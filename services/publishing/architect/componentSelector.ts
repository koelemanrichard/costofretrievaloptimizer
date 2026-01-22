/**
 * Intelligent Component Selector
 *
 * Applies multi-factor scoring to select the best component for each section.
 * Considers content type, visual rhythm, brand style, user preferences, and
 * competitor differentiation.
 *
 * @module services/publishing/architect/componentSelector
 */

import type {
  ComponentType,
  VisualStyle,
  SectionEmphasis,
  SectionSpacing,
} from './blueprintTypes';
import type {
  ParsedSection,
  SectionSemanticType,
  RichArchitectContext,
  IndustryDesignNorms,
  CompetitorLayoutPattern,
} from './contextAssembler';
import type { LearnedPreferences } from '../refinement/patternLearning';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Component selection result
 */
export interface ComponentSelection {
  primary: ComponentType;
  alternatives: {
    component: ComponentType;
    score: number;
    tradeoff: string;
  }[];
  confidence: number;
  reasoning: string[];
  visualConfig: {
    columns?: 2 | 3 | 4;
    variant?: string;
    iconStyle?: 'filled' | 'outlined' | 'none';
    emphasis: SectionEmphasis;
    spacing: SectionSpacing;
    hasBackground: boolean;
  };
}

/**
 * Selection context for a section
 */
export interface SelectionContext {
  section: ParsedSection;
  sectionIndex: number;
  totalSections: number;
  previousComponents: ComponentType[];
  visualStyle: VisualStyle;
  industryNorms: IndustryDesignNorms;
  competitorPatterns: CompetitorLayoutPattern[];
  userPreferences?: LearnedPreferences | null;
  avoidComponents: ComponentType[];
  preferComponents: ComponentType[];
}

/**
 * Scored component candidate
 */
interface ScoredComponent {
  component: ComponentType;
  score: number;
  reasoning: string[];
}

// ============================================================================
// COMPONENT CANDIDATES BY SECTION TYPE
// ============================================================================

const CANDIDATES_BY_TYPE: Record<SectionSemanticType, ComponentType[]> = {
  'definition': ['prose', 'lead-paragraph', 'highlight-box', 'callout'],
  'benefits': ['icon-list', 'card-grid', 'bullet-list', 'feature-list', 'stat-cards'],
  'features': ['icon-list', 'card-grid', 'bullet-list', 'checklist', 'feature-list'],
  'process': ['timeline-zigzag', 'timeline-vertical', 'steps-numbered', 'steps-icons', 'numbered-list'],
  'comparison': ['comparison-table', 'pros-cons', 'card-grid', 'tabs'],
  'faq': ['faq-accordion', 'faq-cards', 'accordion'],
  'testimonial': ['testimonial-single', 'testimonial-grid', 'testimonial-carousel', 'pull-quote'],
  'case-study': ['case-study-card', 'prose', 'highlight-box'],
  'pricing': ['pricing-table', 'card-grid', 'stat-cards'],
  'cta': ['cta-banner', 'cta-inline', 'lead-magnet-box'],
  'technical': ['spec-table', 'data-table', 'accordion', 'tabs'],
  'background': ['prose', 'lead-paragraph', 'callout'],
  'problem-statement': ['highlight-box', 'callout', 'prose', 'icon-list'],
  'solution': ['card-grid', 'icon-list', 'highlight-box', 'prose'],
  'summary': ['key-takeaways', 'summary-box', 'highlight-box', 'callout'],
  'introduction': ['lead-paragraph', 'prose', 'highlight-box'],
  'conclusion': ['key-takeaways', 'summary-box', 'cta-banner', 'prose'],
};

// ============================================================================
// VISUAL WEIGHT MAPPING
// ============================================================================

type VisualWeight = 'light' | 'medium' | 'heavy';

const COMPONENT_VISUAL_WEIGHT: Record<ComponentType, VisualWeight> = {
  // Light components
  'prose': 'light',
  'lead-paragraph': 'light',
  'bullet-list': 'light',
  'numbered-list': 'light',
  'pull-quote': 'light',

  // Medium components
  'highlight-box': 'medium',
  'callout': 'medium',
  'checklist': 'medium',
  'icon-list': 'medium',
  'feature-list': 'medium',
  'faq-accordion': 'medium',
  'faq-cards': 'medium',
  'accordion': 'medium',
  'tabs': 'medium',
  'cta-inline': 'medium',
  'author-box': 'medium',
  'toc-inline': 'medium',
  'toc-sidebar': 'medium',
  'summary-box': 'medium',
  'key-takeaways': 'medium',
  'breadcrumb': 'medium',
  'related-content': 'medium',
  'sources-section': 'medium',

  // Heavy components
  'card-grid': 'heavy',
  'masonry-grid': 'heavy',
  'stat-cards': 'heavy',
  'timeline-vertical': 'heavy',
  'timeline-horizontal': 'heavy',
  'timeline-zigzag': 'heavy',
  'steps-numbered': 'heavy',
  'steps-icons': 'heavy',
  'comparison-table': 'heavy',
  'pros-cons': 'heavy',
  'pricing-table': 'heavy',
  'spec-table': 'heavy',
  'data-table': 'heavy',
  'testimonial-single': 'heavy',
  'testimonial-grid': 'heavy',
  'testimonial-carousel': 'heavy',
  'logo-cloud': 'heavy',
  'trust-badges': 'heavy',
  'case-study-card': 'heavy',
  'image-hero': 'heavy',
  'image-gallery': 'heavy',
  'before-after': 'heavy',
  'video-embed': 'heavy',
  'image-with-caption': 'medium',
  'cta-banner': 'heavy',
  'cta-sticky': 'heavy',
  'lead-magnet-box': 'heavy',
};

// ============================================================================
// STYLE PREFERENCES
// ============================================================================

const STYLE_COMPONENT_PREFERENCES: Record<VisualStyle, {
  preferred: ComponentType[];
  discouraged: ComponentType[];
}> = {
  'minimal': {
    preferred: ['prose', 'bullet-list', 'numbered-list', 'faq-accordion', 'cta-inline', 'toc-inline'],
    discouraged: ['card-grid', 'masonry-grid', 'timeline-zigzag', 'testimonial-carousel', 'stat-cards'],
  },
  'editorial': {
    preferred: ['prose', 'lead-paragraph', 'pull-quote', 'image-with-caption', 'highlight-box', 'toc-sidebar'],
    discouraged: ['stat-cards', 'cta-banner', 'testimonial-carousel', 'masonry-grid'],
  },
  'marketing': {
    preferred: ['card-grid', 'icon-list', 'stat-cards', 'testimonial-carousel', 'cta-banner', 'pricing-table'],
    discouraged: ['prose', 'bullet-list', 'toc-sidebar'],
  },
  'bold': {
    preferred: ['image-hero', 'card-grid', 'timeline-zigzag', 'stat-cards', 'testimonial-single', 'cta-banner'],
    discouraged: ['prose', 'bullet-list', 'faq-accordion'],
  },
  'warm-modern': {
    preferred: ['card-grid', 'icon-list', 'timeline-horizontal', 'testimonial-single', 'cta-inline', 'callout'],
    discouraged: ['data-table', 'spec-table', 'masonry-grid'],
  },
};

// ============================================================================
// MAIN SELECTION FUNCTION
// ============================================================================

/**
 * Select the best component for a section
 */
export function selectComponent(ctx: SelectionContext): ComponentSelection {
  const { section, visualStyle, previousComponents } = ctx;

  // Step 1: Get candidate components for this content type
  const candidates = getCandidatesForType(section.sectionType);

  // Step 2: Score each candidate
  const scored = candidates.map(component => scoreComponent(component, ctx));

  // Step 3: Apply rules that modify scores
  applyRhythmRules(scored, previousComponents);
  applyStyleRules(scored, visualStyle);
  applyPositionRules(scored, ctx);
  applyPreferenceRules(scored, ctx.userPreferences, ctx.avoidComponents, ctx.preferComponents);
  applyCompetitorRules(scored, ctx.competitorPatterns, visualStyle);
  applyContentRules(scored, section);

  // Step 4: Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Step 5: Build result
  const best = scored[0];
  const alternatives = scored.slice(1, 4).map(s => ({
    component: s.component,
    score: s.score,
    tradeoff: generateTradeoff(best, s),
  }));

  return {
    primary: best.component,
    alternatives,
    confidence: Math.min(best.score / 100, 1),
    reasoning: best.reasoning,
    visualConfig: getVisualConfig(best.component, ctx),
  };
}

/**
 * Select components for all sections with coherence
 */
export function selectComponentsWithCoherence(
  sections: ParsedSection[],
  richContext: RichArchitectContext,
  visualStyle: VisualStyle,
  avoidComponents: ComponentType[] = [],
  preferComponents: ComponentType[] = []
): ComponentSelection[] {
  const selections: ComponentSelection[] = [];
  const previousComponents: ComponentType[] = [];

  for (let i = 0; i < sections.length; i++) {
    const ctx: SelectionContext = {
      section: sections[i],
      sectionIndex: i,
      totalSections: sections.length,
      previousComponents: [...previousComponents],
      visualStyle,
      industryNorms: richContext.market.industryNorms,
      competitorPatterns: richContext.market.competitorLayouts,
      userPreferences: richContext.performance.refinementPatterns,
      avoidComponents,
      preferComponents,
    };

    const selection = selectComponent(ctx);
    selections.push(selection);
    previousComponents.push(selection.primary);
  }

  return selections;
}

// ============================================================================
// CANDIDATE GENERATION
// ============================================================================

/**
 * Get candidate components for a section type
 */
function getCandidatesForType(type: SectionSemanticType): ComponentType[] {
  return CANDIDATES_BY_TYPE[type] || ['prose', 'bullet-list', 'highlight-box'];
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Initial score for a component based on content type match
 */
function scoreComponent(component: ComponentType, ctx: SelectionContext): ScoredComponent {
  const { section } = ctx;
  const candidates = CANDIDATES_BY_TYPE[section.sectionType] || [];
  const candidateIndex = candidates.indexOf(component);

  // Base score: higher for components listed earlier (more appropriate)
  let score = candidateIndex >= 0 ? 100 - (candidateIndex * 15) : 30;

  const reasoning: string[] = [];

  // Bonus for high confidence section type
  if (section.confidence > 0.7 && candidateIndex === 0) {
    score += 10;
    reasoning.push(`Strong match for ${section.sectionType} content`);
  }

  return { component, score, reasoning };
}

/**
 * Apply visual rhythm rules to prevent repetition
 */
function applyRhythmRules(
  scored: ScoredComponent[],
  previous: ComponentType[]
): void {
  const lastTwo = previous.slice(-2);
  const lastOne = previous[previous.length - 1];

  for (const item of scored) {
    // Penalize exact repetition
    if (lastOne === item.component) {
      item.score -= 25;
      item.reasoning.push('Avoiding immediate repetition');
    }

    // Penalize appearing in last 2 sections
    if (lastTwo.includes(item.component)) {
      item.score -= 15;
      item.reasoning.push('Recently used');
    }

    // Apply visual weight rhythm
    if (lastOne) {
      const lastWeight = COMPONENT_VISUAL_WEIGHT[lastOne];
      const thisWeight = COMPONENT_VISUAL_WEIGHT[item.component];

      // Penalize two heavy components in a row
      if (lastWeight === 'heavy' && thisWeight === 'heavy') {
        item.score -= 12;
        item.reasoning.push('Visual rhythm: lighter after heavy');
      }

      // Penalize three light components in a row
      const lastThreeWeights = previous.slice(-2).map(c => COMPONENT_VISUAL_WEIGHT[c]);
      if (lastThreeWeights.every(w => w === 'light') && thisWeight === 'light') {
        item.score -= 8;
        item.reasoning.push('Visual rhythm: add variety after light sections');
      }
    }
  }
}

/**
 * Apply visual style preference rules
 */
function applyStyleRules(
  scored: ScoredComponent[],
  style: VisualStyle
): void {
  const prefs = STYLE_COMPONENT_PREFERENCES[style];
  if (!prefs) return;

  for (const item of scored) {
    if (prefs.preferred.includes(item.component)) {
      item.score += 15;
      item.reasoning.push(`Matches ${style} style`);
    }

    if (prefs.discouraged.includes(item.component)) {
      item.score -= 20;
      item.reasoning.push(`Not ideal for ${style} style`);
    }
  }
}

/**
 * Apply position-based rules
 */
function applyPositionRules(
  scored: ScoredComponent[],
  ctx: SelectionContext
): void {
  const { sectionIndex, totalSections, section } = ctx;
  const isFirst = sectionIndex === 0;
  const isLast = sectionIndex === totalSections - 1;
  const isSecondToLast = sectionIndex === totalSections - 2;

  for (const item of scored) {
    // First section should be inviting
    if (isFirst) {
      if (item.component === 'lead-paragraph' || item.component === 'prose') {
        item.score += 10;
        item.reasoning.push('Good intro component');
      }
      if (COMPONENT_VISUAL_WEIGHT[item.component] === 'heavy') {
        item.score -= 5;
        item.reasoning.push('Heavy components better after intro');
      }
    }

    // Last section often summarizes or has CTA
    if (isLast) {
      if (['key-takeaways', 'summary-box', 'cta-banner', 'cta-inline'].includes(item.component)) {
        item.score += 12;
        item.reasoning.push('Good closing component');
      }
    }

    // Second-to-last is often FAQ
    if (isSecondToLast && section.sectionType === 'faq') {
      if (['faq-accordion', 'faq-cards'].includes(item.component)) {
        item.score += 8;
        item.reasoning.push('FAQ natural before conclusion');
      }
    }

    // Core importance sections get more prominent components
    if (section.relationship.importance === 'core') {
      if (COMPONENT_VISUAL_WEIGHT[item.component] === 'heavy') {
        item.score += 5;
        item.reasoning.push('Core content deserves prominence');
      }
    }
  }
}

/**
 * Apply user preference rules from learned patterns
 */
function applyPreferenceRules(
  scored: ScoredComponent[],
  preferences: LearnedPreferences | null | undefined,
  avoidComponents: ComponentType[],
  preferComponents: ComponentType[]
): void {
  // Apply explicit avoid list
  for (const item of scored) {
    if (avoidComponents.includes(item.component)) {
      item.score -= 50;
      item.reasoning.push('On avoid list');
    }

    if (preferComponents.includes(item.component)) {
      item.score += 20;
      item.reasoning.push('On prefer list');
    }
  }

  // Apply learned preferences
  if (!preferences) return;

  for (const item of scored) {
    // Check if this component is frequently swapped away from
    const swapAway = preferences.componentSwaps?.find(
      swap => swap.fromComponent === item.component && swap.frequency >= 3
    );
    if (swapAway) {
      item.score -= 15 * Math.min(swapAway.frequency / 5, 2);
      item.reasoning.push(`You often change this (${swapAway.frequency}x)`);
    }

    // Check if this component is frequently swapped to
    const swapTo = preferences.componentSwaps?.find(
      swap => swap.toComponent === item.component && swap.frequency >= 2
    );
    if (swapTo) {
      item.score += 10 * Math.min(swapTo.frequency / 5, 2);
      item.reasoning.push(`You often choose this (${swapTo.frequency}x)`);
    }

    // Check if component is in preferred list
    if (preferences.preferredComponents?.includes(item.component)) {
      item.score += 12;
      item.reasoning.push('In your preferred components');
    }

    // Check if component is in avoided list
    if (preferences.avoidedComponents?.includes(item.component)) {
      item.score -= 25;
      item.reasoning.push('In your avoided components');
    }
  }
}

/**
 * Apply competitor differentiation rules
 */
function applyCompetitorRules(
  scored: ScoredComponent[],
  competitorPatterns: CompetitorLayoutPattern[],
  style: VisualStyle
): void {
  if (competitorPatterns.length === 0) return;

  // Find components used by all competitors
  const allCompetitorComponents = new Set<ComponentType>();
  const componentFrequency = new Map<ComponentType, number>();

  for (const pattern of competitorPatterns) {
    for (const component of pattern.componentSequence) {
      allCompetitorComponents.add(component);
      componentFrequency.set(component, (componentFrequency.get(component) || 0) + 1);
    }
  }

  // Components used by most competitors - slight penalty for differentiation
  const threshold = competitorPatterns.length * 0.7;
  const overusedByCompetitors = [...componentFrequency.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([component]) => component);

  for (const item of scored) {
    // Slight penalty for components everyone uses (opportunity to differentiate)
    if (overusedByCompetitors.includes(item.component)) {
      item.score -= 5;
      item.reasoning.push('Common in competitor layouts');
    }

    // Bonus for components competitors don't use (if they fit style)
    if (!allCompetitorComponents.has(item.component)) {
      const stylePrefs = STYLE_COMPONENT_PREFERENCES[style];
      if (stylePrefs?.preferred.includes(item.component)) {
        item.score += 8;
        item.reasoning.push('Differentiation opportunity');
      }
    }
  }
}

/**
 * Apply content-specific rules based on actual content
 */
function applyContentRules(
  scored: ScoredComponent[],
  section: ParsedSection
): void {
  const { structure, sectionType } = section;
  const listCount = structure.lists.reduce((acc, l) => acc + l.items.length, 0);
  const hasQuotes = structure.quotes.length > 0;
  const hasDefinitions = structure.definitions.length > 0;

  for (const item of scored) {
    // List content should use list-appropriate components
    if (listCount >= 3) {
      if (['bullet-list', 'numbered-list', 'icon-list', 'checklist', 'card-grid'].includes(item.component)) {
        item.score += 8;
        item.reasoning.push(`Good for ${listCount} list items`);
      }
      if (item.component === 'prose') {
        item.score -= 10;
        item.reasoning.push('Prose loses list structure');
      }
    }

    // Many list items favor grids
    if (listCount >= 6) {
      if (['card-grid', 'icon-list', 'masonry-grid'].includes(item.component)) {
        item.score += 5;
        item.reasoning.push('Grid handles many items well');
      }
    }

    // Quote content
    if (hasQuotes && item.component === 'pull-quote') {
      item.score += 15;
      item.reasoning.push('Has quote content');
    }

    // Definition content
    if (hasDefinitions && ['accordion', 'tabs'].includes(item.component)) {
      item.score += 8;
      item.reasoning.push('Good for term definitions');
    }

    // Process content with numbered items
    if (sectionType === 'process' && structure.lists.some(l => l.isOrdered)) {
      if (['steps-numbered', 'timeline-vertical', 'timeline-zigzag'].includes(item.component)) {
        item.score += 10;
        item.reasoning.push('Preserves step order');
      }
    }
  }
}

// ============================================================================
// VISUAL CONFIG
// ============================================================================

/**
 * Determine visual configuration for selected component
 */
function getVisualConfig(
  component: ComponentType,
  ctx: SelectionContext
): ComponentSelection['visualConfig'] {
  const { section, sectionIndex, totalSections, visualStyle } = ctx;

  // Determine emphasis
  let emphasis: SectionEmphasis = 'normal';
  if (section.relationship.importance === 'core') {
    emphasis = 'featured';
  } else if (section.relationship.importance === 'key-takeaway') {
    emphasis = 'hero-moment';
  } else if (sectionIndex === 0) {
    emphasis = 'featured';
  }

  // Determine spacing
  let spacing: SectionSpacing = 'normal';
  if (COMPONENT_VISUAL_WEIGHT[component] === 'heavy') {
    spacing = 'breathe';
  } else if (visualStyle === 'minimal') {
    spacing = 'breathe';
  } else if (visualStyle === 'marketing') {
    spacing = 'tight';
  }

  // Determine background
  const hasBackground = emphasis === 'featured' ||
    (sectionIndex % 3 === 1 && visualStyle !== 'minimal');

  // Determine columns for grid components
  let columns: 2 | 3 | 4 | undefined;
  if (['card-grid', 'icon-list', 'stat-cards', 'feature-list'].includes(component)) {
    const itemCount = section.structure.lists.reduce((acc, l) => acc + l.items.length, 0);
    if (itemCount <= 3) columns = 3;
    else if (itemCount === 4) columns = 4;
    else if (itemCount <= 6) columns = 3;
    else columns = 4;
  }

  // Determine variant based on style
  let variant: string | undefined;
  if (visualStyle === 'minimal') {
    variant = 'clean';
  } else if (visualStyle === 'bold') {
    variant = 'dramatic';
  } else if (visualStyle === 'warm-modern') {
    variant = 'rounded';
  }

  return {
    columns,
    variant,
    iconStyle: visualStyle === 'minimal' ? 'outlined' : 'filled',
    emphasis,
    spacing,
    hasBackground,
  };
}

// ============================================================================
// TRADEOFF GENERATION
// ============================================================================

/**
 * Generate tradeoff explanation for alternative component
 */
function generateTradeoff(best: ScoredComponent, alternative: ScoredComponent): string {
  const scoreDiff = best.score - alternative.score;

  if (scoreDiff < 10) {
    return 'Nearly equivalent choice';
  }

  // Find unique reasoning
  const uniqueReasons = alternative.reasoning.filter(
    r => !best.reasoning.some(br => br.includes(r.split(':')[0]))
  );

  if (uniqueReasons.length > 0) {
    return uniqueReasons[0];
  }

  // Generic tradeoffs
  const bestWeight = COMPONENT_VISUAL_WEIGHT[best.component];
  const altWeight = COMPONENT_VISUAL_WEIGHT[alternative.component];

  if (bestWeight === 'heavy' && altWeight === 'light') {
    return 'Simpler, less visual impact';
  }
  if (bestWeight === 'light' && altWeight === 'heavy') {
    return 'More visual impact, denser';
  }

  return `Score: ${alternative.score} vs ${best.score}`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get recommended component for a section type and style
 */
export function getRecommendedComponent(
  sectionType: SectionSemanticType,
  visualStyle: VisualStyle
): ComponentType {
  const candidates = CANDIDATES_BY_TYPE[sectionType] || ['prose'];
  const stylePrefs = STYLE_COMPONENT_PREFERENCES[visualStyle];

  // Find first candidate that's preferred for this style
  const preferred = candidates.find(c => stylePrefs?.preferred.includes(c));
  if (preferred) return preferred;

  // Find first candidate that's not discouraged
  const acceptable = candidates.find(c => !stylePrefs?.discouraged.includes(c));
  if (acceptable) return acceptable;

  return candidates[0];
}

/**
 * Check if component is appropriate for section type
 */
export function isComponentAppropriate(
  component: ComponentType,
  sectionType: SectionSemanticType
): boolean {
  const candidates = CANDIDATES_BY_TYPE[sectionType] || [];
  return candidates.includes(component);
}

/**
 * Get visual weight of a component
 */
export function getComponentWeight(component: ComponentType): VisualWeight {
  return COMPONENT_VISUAL_WEIGHT[component] || 'medium';
}
