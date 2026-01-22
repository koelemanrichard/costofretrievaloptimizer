/**
 * Visual Coherence Engine
 *
 * Applies blueprint-level rules to ensure visual consistency and rhythm.
 * Prevents jarring transitions and creates a designed, intentional feel.
 *
 * @module services/publishing/architect/coherenceEngine
 */

import type {
  SectionDesign,
  LayoutBlueprint,
  ComponentType,
  VisualStyle,
  SectionEmphasis,
  SectionSpacing,
} from './blueprintTypes';
import { getComponentWeight } from './componentSelector';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Visual coherence rules configuration
 */
export interface CoherenceRules {
  // Spacing rhythm
  spacing: {
    /** Repeating pattern for section spacing */
    pattern: SectionSpacing[];
    /** Spacing from hero to first section */
    heroToFirstSection: 'tight' | 'breathe';
    /** Extra space before key sections */
    breatheBeforeTypes: ComponentType[];
  };

  // Background alternation
  backgrounds: {
    /** Background application strategy */
    strategy: 'none' | 'alternating' | 'feature-only' | 'every-third';
    /** Max consecutive backgrounded sections */
    maxConsecutive: number;
    /** Components that always get backgrounds */
    alwaysBackground: ComponentType[];
    /** Components that never get backgrounds */
    neverBackground: ComponentType[];
  };

  // Emphasis distribution
  emphasis: {
    /** Maximum featured sections */
    maxFeatured: number;
    /** Where to place featured emphasis */
    featuredPositions: 'start' | 'middle' | 'end' | 'distributed';
    /** Allow at most one hero-moment */
    heroMomentCount: 0 | 1;
    /** Components that deserve featured treatment */
    featuredComponents: ComponentType[];
  };

  // Component weight flow
  visualWeight: {
    /** How visual weight should flow through the article */
    flow: 'build-up' | 'front-loaded' | 'balanced' | 'wave';
    /** Maximum consecutive heavy components */
    maxConsecutiveHeavy: number;
    /** Maximum consecutive light components */
    maxConsecutiveLight: number;
  };

  // Divider rules
  dividers: {
    /** When to show dividers */
    strategy: 'none' | 'between-topics' | 'before-featured' | 'periodic';
    /** Show divider before these component types */
    beforeComponents: ComponentType[];
  };
}

/**
 * Coherence analysis result
 */
export interface CoherenceAnalysis {
  score: number;
  issues: {
    type: 'spacing' | 'background' | 'emphasis' | 'weight' | 'divider';
    severity: 'warning' | 'error';
    message: string;
    sectionIndex: number;
  }[];
  suggestions: {
    sectionIndex: number;
    property: keyof SectionDesign['presentation'];
    currentValue: unknown;
    suggestedValue: unknown;
    reason: string;
  }[];
}

// ============================================================================
// PRESET RULES BY STYLE
// ============================================================================

export const COHERENCE_PRESETS: Record<VisualStyle, CoherenceRules> = {
  'minimal': {
    spacing: {
      pattern: ['breathe', 'normal', 'breathe'],
      heroToFirstSection: 'breathe',
      breatheBeforeTypes: ['faq-accordion', 'cta-banner', 'key-takeaways'],
    },
    backgrounds: {
      strategy: 'feature-only',
      maxConsecutive: 1,
      alwaysBackground: ['highlight-box', 'callout'],
      neverBackground: ['prose', 'bullet-list', 'numbered-list'],
    },
    emphasis: {
      maxFeatured: 2,
      featuredPositions: 'distributed',
      heroMomentCount: 0,
      featuredComponents: ['key-takeaways', 'highlight-box'],
    },
    visualWeight: {
      flow: 'balanced',
      maxConsecutiveHeavy: 1,
      maxConsecutiveLight: 4,
    },
    dividers: {
      strategy: 'none',
      beforeComponents: [],
    },
  },

  'editorial': {
    spacing: {
      pattern: ['normal', 'breathe', 'normal'],
      heroToFirstSection: 'breathe',
      breatheBeforeTypes: ['pull-quote', 'key-takeaways', 'faq-accordion'],
    },
    backgrounds: {
      strategy: 'every-third',
      maxConsecutive: 2,
      alwaysBackground: ['highlight-box', 'pull-quote'],
      neverBackground: ['prose'],
    },
    emphasis: {
      maxFeatured: 3,
      featuredPositions: 'distributed',
      heroMomentCount: 1,
      featuredComponents: ['pull-quote', 'key-takeaways', 'timeline-zigzag'],
    },
    visualWeight: {
      flow: 'wave',
      maxConsecutiveHeavy: 2,
      maxConsecutiveLight: 3,
    },
    dividers: {
      strategy: 'between-topics',
      beforeComponents: ['faq-accordion', 'key-takeaways'],
    },
  },

  'marketing': {
    spacing: {
      pattern: ['tight', 'normal', 'tight', 'normal'],
      heroToFirstSection: 'tight',
      breatheBeforeTypes: ['cta-banner', 'testimonial-carousel'],
    },
    backgrounds: {
      strategy: 'alternating',
      maxConsecutive: 2,
      alwaysBackground: ['cta-banner', 'testimonial-grid', 'stat-cards'],
      neverBackground: [],
    },
    emphasis: {
      maxFeatured: 4,
      featuredPositions: 'distributed',
      heroMomentCount: 1,
      featuredComponents: ['cta-banner', 'stat-cards', 'testimonial-carousel', 'card-grid'],
    },
    visualWeight: {
      flow: 'front-loaded',
      maxConsecutiveHeavy: 3,
      maxConsecutiveLight: 2,
    },
    dividers: {
      strategy: 'before-featured',
      beforeComponents: ['cta-banner', 'pricing-table'],
    },
  },

  'bold': {
    spacing: {
      pattern: ['breathe', 'breathe', 'normal'],
      heroToFirstSection: 'breathe',
      breatheBeforeTypes: ['image-hero', 'cta-banner', 'timeline-zigzag'],
    },
    backgrounds: {
      strategy: 'alternating',
      maxConsecutive: 2,
      alwaysBackground: ['card-grid', 'stat-cards', 'testimonial-single'],
      neverBackground: [],
    },
    emphasis: {
      maxFeatured: 4,
      featuredPositions: 'start',
      heroMomentCount: 1,
      featuredComponents: ['image-hero', 'timeline-zigzag', 'stat-cards', 'cta-banner'],
    },
    visualWeight: {
      flow: 'build-up',
      maxConsecutiveHeavy: 2,
      maxConsecutiveLight: 2,
    },
    dividers: {
      strategy: 'periodic',
      beforeComponents: ['cta-banner'],
    },
  },

  'warm-modern': {
    spacing: {
      pattern: ['normal', 'breathe', 'normal', 'breathe'],
      heroToFirstSection: 'breathe',
      breatheBeforeTypes: ['testimonial-single', 'callout', 'key-takeaways'],
    },
    backgrounds: {
      strategy: 'every-third',
      maxConsecutive: 2,
      alwaysBackground: ['callout', 'testimonial-single'],
      neverBackground: ['prose'],
    },
    emphasis: {
      maxFeatured: 3,
      featuredPositions: 'middle',
      heroMomentCount: 1,
      featuredComponents: ['card-grid', 'icon-list', 'testimonial-single', 'timeline-horizontal'],
    },
    visualWeight: {
      flow: 'wave',
      maxConsecutiveHeavy: 2,
      maxConsecutiveLight: 3,
    },
    dividers: {
      strategy: 'between-topics',
      beforeComponents: ['faq-accordion', 'cta-inline'],
    },
  },
};

// ============================================================================
// MAIN COHERENCE FUNCTIONS
// ============================================================================

/**
 * Apply coherence rules to a blueprint
 */
export function applyCoherence(
  blueprint: LayoutBlueprint,
  rules?: Partial<CoherenceRules>
): LayoutBlueprint {
  const styleRules = COHERENCE_PRESETS[blueprint.pageStrategy.visualStyle];
  const mergedRules = mergeRules(styleRules, rules);

  let sections = [...blueprint.sections];

  // Apply rules in order
  sections = applySpacingRules(sections, mergedRules.spacing);
  sections = applyBackgroundRules(sections, mergedRules.backgrounds);
  sections = applyEmphasisRules(sections, mergedRules.emphasis);
  sections = applyWeightRules(sections, mergedRules.visualWeight);
  sections = applyDividerRules(sections, mergedRules.dividers);

  return {
    ...blueprint,
    sections,
  };
}

/**
 * Analyze blueprint coherence and return issues/suggestions
 */
export function analyzeCoherence(
  blueprint: LayoutBlueprint,
  rules?: Partial<CoherenceRules>
): CoherenceAnalysis {
  const styleRules = COHERENCE_PRESETS[blueprint.pageStrategy.visualStyle];
  const mergedRules = mergeRules(styleRules, rules);

  const issues: CoherenceAnalysis['issues'] = [];
  const suggestions: CoherenceAnalysis['suggestions'] = [];

  // Check spacing issues
  analyzeSpacing(blueprint.sections, mergedRules.spacing, issues, suggestions);

  // Check background issues
  analyzeBackgrounds(blueprint.sections, mergedRules.backgrounds, issues, suggestions);

  // Check emphasis issues
  analyzeEmphasis(blueprint.sections, mergedRules.emphasis, issues, suggestions);

  // Check weight issues
  analyzeWeight(blueprint.sections, mergedRules.visualWeight, issues, suggestions);

  // Calculate score (100 - penalty per issue)
  const errorPenalty = issues.filter(i => i.severity === 'error').length * 15;
  const warningPenalty = issues.filter(i => i.severity === 'warning').length * 5;
  const score = Math.max(0, 100 - errorPenalty - warningPenalty);

  return { score, issues, suggestions };
}

/**
 * Get coherence rules for a visual style
 */
export function getCoherenceRules(style: VisualStyle): CoherenceRules {
  return COHERENCE_PRESETS[style];
}

// ============================================================================
// RULE APPLICATION
// ============================================================================

/**
 * Apply spacing rhythm rules
 */
function applySpacingRules(
  sections: SectionDesign[],
  rules: CoherenceRules['spacing']
): SectionDesign[] {
  return sections.map((section, index) => {
    let spacing = section.presentation.spacing;

    // Apply pattern
    if (rules.pattern.length > 0) {
      const patternIndex = index % rules.pattern.length;
      spacing = rules.pattern[patternIndex];
    }

    // Override for breath-before types
    if (rules.breatheBeforeTypes.includes(section.presentation.component)) {
      spacing = 'breathe';
    }

    // First section after hero
    if (index === 0) {
      spacing = rules.heroToFirstSection;
    }

    return {
      ...section,
      presentation: {
        ...section.presentation,
        spacing,
      },
    };
  });
}

/**
 * Apply background alternation rules
 */
function applyBackgroundRules(
  sections: SectionDesign[],
  rules: CoherenceRules['backgrounds']
): SectionDesign[] {
  let consecutiveBackgrounds = 0;

  return sections.map((section, index) => {
    const component = section.presentation.component;
    let hasBackground = section.presentation.hasBackground;

    // Check always/never rules first
    if (rules.alwaysBackground.includes(component)) {
      hasBackground = true;
    } else if (rules.neverBackground.includes(component)) {
      hasBackground = false;
    } else {
      // Apply strategy
      switch (rules.strategy) {
        case 'none':
          hasBackground = false;
          break;

        case 'alternating':
          hasBackground = index % 2 === 1;
          break;

        case 'every-third':
          hasBackground = index % 3 === 1;
          break;

        case 'feature-only':
          hasBackground = section.presentation.emphasis === 'featured' ||
                          section.presentation.emphasis === 'hero-moment';
          break;
      }
    }

    // Enforce max consecutive
    if (hasBackground) {
      consecutiveBackgrounds++;
      if (consecutiveBackgrounds > rules.maxConsecutive) {
        hasBackground = false;
        consecutiveBackgrounds = 0;
      }
    } else {
      consecutiveBackgrounds = 0;
    }

    return {
      ...section,
      presentation: {
        ...section.presentation,
        hasBackground,
      },
    };
  });
}

/**
 * Apply emphasis distribution rules
 */
function applyEmphasisRules(
  sections: SectionDesign[],
  rules: CoherenceRules['emphasis']
): SectionDesign[] {
  let featuredCount = 0;
  let heroMomentUsed = false;

  // First pass: determine which sections should be featured
  const featuredIndices = determineFeaturedPositions(sections, rules);

  return sections.map((section, index) => {
    let emphasis = section.presentation.emphasis;

    // Check if this component deserves featured
    const deservesFeature = rules.featuredComponents.includes(section.presentation.component);

    // Check if this position should be featured
    const positionFeature = featuredIndices.includes(index);

    // Apply hero-moment
    if (
      section.presentation.emphasis === 'hero-moment' &&
      !heroMomentUsed &&
      rules.heroMomentCount > 0
    ) {
      heroMomentUsed = true;
      return section;
    }

    // Apply featured
    if ((deservesFeature || positionFeature) && featuredCount < rules.maxFeatured) {
      emphasis = 'featured';
      featuredCount++;
    } else if (emphasis === 'featured' && featuredCount >= rules.maxFeatured) {
      emphasis = 'normal';
    }

    return {
      ...section,
      presentation: {
        ...section.presentation,
        emphasis,
      },
    };
  });
}

/**
 * Determine which section indices should be featured
 */
function determineFeaturedPositions(
  sections: SectionDesign[],
  rules: CoherenceRules['emphasis']
): number[] {
  const total = sections.length;

  switch (rules.featuredPositions) {
    case 'start':
      return [0, Math.min(1, total - 1)];

    case 'middle': {
      const mid = Math.floor(total / 2);
      return [mid - 1, mid, mid + 1].filter(i => i >= 0 && i < total);
    }

    case 'end':
      return [Math.max(0, total - 2), total - 1];

    case 'distributed':
    default: {
      if (total <= 3) return [0, total - 1];
      const step = Math.floor(total / rules.maxFeatured);
      return Array.from({ length: rules.maxFeatured }, (_, i) =>
        Math.min(i * step, total - 1)
      );
    }
  }
}

/**
 * Apply visual weight flow rules
 */
function applyWeightRules(
  sections: SectionDesign[],
  rules: CoherenceRules['visualWeight']
): SectionDesign[] {
  // This modifies reasoning to flag issues, actual component changes happen elsewhere
  let consecutiveHeavy = 0;
  let consecutiveLight = 0;

  return sections.map((section, index) => {
    const weight = getComponentWeight(section.presentation.component);
    let updatedReasoning = section.reasoning;

    if (weight === 'heavy') {
      consecutiveHeavy++;
      consecutiveLight = 0;

      if (consecutiveHeavy > rules.maxConsecutiveHeavy) {
        updatedReasoning += ' [Coherence: Consider lighter component here]';
      }
    } else if (weight === 'light') {
      consecutiveLight++;
      consecutiveHeavy = 0;

      if (consecutiveLight > rules.maxConsecutiveLight) {
        updatedReasoning += ' [Coherence: Consider more visual impact]';
      }
    } else {
      consecutiveHeavy = 0;
      consecutiveLight = 0;
    }

    return {
      ...section,
      reasoning: updatedReasoning,
    };
  });
}

/**
 * Apply divider rules
 */
function applyDividerRules(
  sections: SectionDesign[],
  rules: CoherenceRules['dividers']
): SectionDesign[] {
  return sections.map((section, index) => {
    let hasDivider = section.presentation.hasDivider;

    switch (rules.strategy) {
      case 'none':
        hasDivider = false;
        break;

      case 'before-featured':
        hasDivider = section.presentation.emphasis === 'featured' ||
                     section.presentation.emphasis === 'hero-moment';
        break;

      case 'between-topics':
        // Divider before components that typically start new topics
        hasDivider = rules.beforeComponents.includes(section.presentation.component);
        break;

      case 'periodic':
        hasDivider = index > 0 && index % 4 === 0;
        break;
    }

    // Always divider before specific components
    if (rules.beforeComponents.includes(section.presentation.component)) {
      hasDivider = true;
    }

    return {
      ...section,
      presentation: {
        ...section.presentation,
        hasDivider,
      },
    };
  });
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze spacing coherence
 */
function analyzeSpacing(
  sections: SectionDesign[],
  rules: CoherenceRules['spacing'],
  issues: CoherenceAnalysis['issues'],
  suggestions: CoherenceAnalysis['suggestions']
): void {
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const expectedSpacing = rules.pattern[i % rules.pattern.length];

    // Check pattern compliance
    if (section.presentation.spacing !== expectedSpacing) {
      const shouldBreath = rules.breatheBeforeTypes.includes(section.presentation.component);

      if (!shouldBreath) {
        suggestions.push({
          sectionIndex: i,
          property: 'spacing',
          currentValue: section.presentation.spacing,
          suggestedValue: expectedSpacing,
          reason: `Spacing pattern suggests ${expectedSpacing}`,
        });
      }
    }

    // Check tight sections after heavy components
    if (i > 0) {
      const prevWeight = getComponentWeight(sections[i - 1].presentation.component);
      if (prevWeight === 'heavy' && section.presentation.spacing === 'tight') {
        issues.push({
          type: 'spacing',
          severity: 'warning',
          message: 'Tight spacing after heavy component may feel cramped',
          sectionIndex: i,
        });
      }
    }
  }
}

/**
 * Analyze background coherence
 */
function analyzeBackgrounds(
  sections: SectionDesign[],
  rules: CoherenceRules['backgrounds'],
  issues: CoherenceAnalysis['issues'],
  suggestions: CoherenceAnalysis['suggestions']
): void {
  let consecutive = 0;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (section.presentation.hasBackground) {
      consecutive++;

      if (consecutive > rules.maxConsecutive) {
        issues.push({
          type: 'background',
          severity: 'warning',
          message: `${consecutive} consecutive backgrounded sections (max: ${rules.maxConsecutive})`,
          sectionIndex: i,
        });
      }

      // Check never-background violation
      if (rules.neverBackground.includes(section.presentation.component)) {
        issues.push({
          type: 'background',
          severity: 'error',
          message: `${section.presentation.component} should not have background`,
          sectionIndex: i,
        });
      }
    } else {
      consecutive = 0;

      // Check always-background violation
      if (rules.alwaysBackground.includes(section.presentation.component)) {
        suggestions.push({
          sectionIndex: i,
          property: 'hasBackground',
          currentValue: false,
          suggestedValue: true,
          reason: `${section.presentation.component} typically has background`,
        });
      }
    }
  }
}

/**
 * Analyze emphasis coherence
 */
function analyzeEmphasis(
  sections: SectionDesign[],
  rules: CoherenceRules['emphasis'],
  issues: CoherenceAnalysis['issues'],
  suggestions: CoherenceAnalysis['suggestions']
): void {
  const featuredCount = sections.filter(
    s => s.presentation.emphasis === 'featured'
  ).length;

  const heroMomentCount = sections.filter(
    s => s.presentation.emphasis === 'hero-moment'
  ).length;

  // Too many featured
  if (featuredCount > rules.maxFeatured) {
    issues.push({
      type: 'emphasis',
      severity: 'warning',
      message: `${featuredCount} featured sections (max: ${rules.maxFeatured})`,
      sectionIndex: -1,
    });
  }

  // Too many hero moments
  if (heroMomentCount > rules.heroMomentCount) {
    issues.push({
      type: 'emphasis',
      severity: 'error',
      message: `${heroMomentCount} hero-moments (max: ${rules.heroMomentCount})`,
      sectionIndex: -1,
    });
  }

  // Check featured components that aren't featured
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (
      rules.featuredComponents.includes(section.presentation.component) &&
      section.presentation.emphasis === 'normal'
    ) {
      suggestions.push({
        sectionIndex: i,
        property: 'emphasis',
        currentValue: 'normal',
        suggestedValue: 'featured',
        reason: `${section.presentation.component} typically deserves featured emphasis`,
      });
    }
  }
}

/**
 * Analyze visual weight coherence
 */
function analyzeWeight(
  sections: SectionDesign[],
  rules: CoherenceRules['visualWeight'],
  issues: CoherenceAnalysis['issues'],
  suggestions: CoherenceAnalysis['suggestions']
): void {
  let consecutiveHeavy = 0;
  let consecutiveLight = 0;

  for (let i = 0; i < sections.length; i++) {
    const weight = getComponentWeight(sections[i].presentation.component);

    if (weight === 'heavy') {
      consecutiveHeavy++;
      consecutiveLight = 0;

      if (consecutiveHeavy > rules.maxConsecutiveHeavy) {
        issues.push({
          type: 'weight',
          severity: 'warning',
          message: `${consecutiveHeavy} heavy components in a row (max: ${rules.maxConsecutiveHeavy})`,
          sectionIndex: i,
        });
      }
    } else if (weight === 'light') {
      consecutiveLight++;
      consecutiveHeavy = 0;

      if (consecutiveLight > rules.maxConsecutiveLight) {
        issues.push({
          type: 'weight',
          severity: 'warning',
          message: `${consecutiveLight} light components in a row (max: ${rules.maxConsecutiveLight})`,
          sectionIndex: i,
        });
      }
    } else {
      consecutiveHeavy = 0;
      consecutiveLight = 0;
    }
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Merge custom rules with defaults
 */
function mergeRules(
  base: CoherenceRules,
  overrides?: Partial<CoherenceRules>
): CoherenceRules {
  if (!overrides) return base;

  return {
    spacing: { ...base.spacing, ...overrides.spacing },
    backgrounds: { ...base.backgrounds, ...overrides.backgrounds },
    emphasis: { ...base.emphasis, ...overrides.emphasis },
    visualWeight: { ...base.visualWeight, ...overrides.visualWeight },
    dividers: { ...base.dividers, ...overrides.dividers },
  };
}

/**
 * Generate coherence report for debugging
 */
export function generateCoherenceReport(
  blueprint: LayoutBlueprint,
  analysis: CoherenceAnalysis
): string {
  const lines: string[] = [
    '# Coherence Report',
    '',
    `**Style**: ${blueprint.pageStrategy.visualStyle}`,
    `**Score**: ${analysis.score}/100`,
    '',
    '## Issues',
  ];

  if (analysis.issues.length === 0) {
    lines.push('No issues found.');
  } else {
    for (const issue of analysis.issues) {
      const section = issue.sectionIndex >= 0
        ? `Section ${issue.sectionIndex + 1}`
        : 'Global';
      lines.push(`- [${issue.severity.toUpperCase()}] ${section}: ${issue.message}`);
    }
  }

  lines.push('', '## Suggestions');

  if (analysis.suggestions.length === 0) {
    lines.push('No suggestions.');
  } else {
    for (const suggestion of analysis.suggestions) {
      lines.push(
        `- Section ${suggestion.sectionIndex + 1}: ` +
        `${suggestion.property} ${suggestion.currentValue} → ${suggestion.suggestedValue} ` +
        `(${suggestion.reason})`
      );
    }
  }

  return lines.join('\n');
}
