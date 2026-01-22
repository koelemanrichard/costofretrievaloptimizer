/**
 * Blueprint Resolver Service
 *
 * Handles hierarchy merging for layout blueprints.
 * Merges settings from project → topical map → article levels.
 *
 * @module services/publishing/architect/blueprintResolver
 */

import type {
  LayoutBlueprint,
  ProjectBlueprint,
  TopicalMapBlueprint,
  ArticleBlueprintOverrides,
  VisualStyle,
  ContentPacing,
  ColorIntensity,
  SectionDesign,
  PageStrategy,
} from './blueprintTypes';
import type {
  ProjectBlueprintRow,
  TopicalMapBlueprintRow,
  ArticleBlueprintRow,
} from './blueprintStorage';

// ============================================================================
// TYPES
// ============================================================================

export interface ResolvedBlueprintSettings {
  visualStyle: VisualStyle;
  pacing: ContentPacing;
  colorIntensity: ColorIntensity;
  ctaStrategy: {
    positions: string[];
    intensity: 'subtle' | 'moderate' | 'prominent';
    style: 'inline' | 'banner' | 'floating';
  };
  componentPreferences: Record<string, unknown>;
  avoidComponents: string[];
  inheritanceInfo: {
    visualStyleFrom: 'project' | 'topical_map' | 'article' | 'default';
    pacingFrom: 'project' | 'topical_map' | 'article' | 'default';
    colorIntensityFrom: 'project' | 'topical_map' | 'article' | 'default';
    ctaStrategyFrom: 'project' | 'topical_map' | 'article' | 'default';
  };
}

export interface BlueprintHierarchy {
  project?: ProjectBlueprintRow | null;
  topicalMap?: TopicalMapBlueprintRow | null;
  article?: ArticleBlueprintRow | null;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_SETTINGS: ResolvedBlueprintSettings = {
  visualStyle: 'editorial',
  pacing: 'balanced',
  colorIntensity: 'moderate',
  ctaStrategy: {
    positions: ['end'],
    intensity: 'moderate',
    style: 'banner',
  },
  componentPreferences: {},
  avoidComponents: [],
  inheritanceInfo: {
    visualStyleFrom: 'default',
    pacingFrom: 'default',
    colorIntensityFrom: 'default',
    ctaStrategyFrom: 'default',
  },
};

// ============================================================================
// RESOLVER FUNCTIONS
// ============================================================================

/**
 * Resolve blueprint settings by merging the hierarchy.
 * Priority: article > topical_map > project > defaults
 */
export function resolveBlueprintSettings(
  hierarchy: BlueprintHierarchy
): ResolvedBlueprintSettings {
  const result: ResolvedBlueprintSettings = { ...DEFAULT_SETTINGS };

  // Apply project level
  if (hierarchy.project) {
    result.visualStyle = hierarchy.project.visual_style;
    result.pacing = hierarchy.project.pacing;
    result.colorIntensity = hierarchy.project.color_intensity;
    result.ctaStrategy = {
      positions: hierarchy.project.cta_positions || ['end'],
      intensity: (hierarchy.project.cta_intensity || 'moderate') as 'subtle' | 'moderate' | 'prominent',
      style: (hierarchy.project.cta_style || 'banner') as 'inline' | 'banner' | 'floating',
    };
    result.componentPreferences = hierarchy.project.component_preferences || {};
    result.avoidComponents = hierarchy.project.avoid_components || [];
    result.inheritanceInfo = {
      visualStyleFrom: 'project',
      pacingFrom: 'project',
      colorIntensityFrom: 'project',
      ctaStrategyFrom: 'project',
    };
  }

  // Apply topical map overrides (only if explicitly set)
  if (hierarchy.topicalMap) {
    if (hierarchy.topicalMap.visual_style) {
      result.visualStyle = hierarchy.topicalMap.visual_style;
      result.inheritanceInfo.visualStyleFrom = 'topical_map';
    }
    if (hierarchy.topicalMap.pacing) {
      result.pacing = hierarchy.topicalMap.pacing;
      result.inheritanceInfo.pacingFrom = 'topical_map';
    }
    if (hierarchy.topicalMap.color_intensity) {
      result.colorIntensity = hierarchy.topicalMap.color_intensity;
      result.inheritanceInfo.colorIntensityFrom = 'topical_map';
    }
    if (hierarchy.topicalMap.cta_positions || hierarchy.topicalMap.cta_intensity || hierarchy.topicalMap.cta_style) {
      result.ctaStrategy = {
        positions: hierarchy.topicalMap.cta_positions || result.ctaStrategy.positions,
        intensity: (hierarchy.topicalMap.cta_intensity || result.ctaStrategy.intensity) as 'subtle' | 'moderate' | 'prominent',
        style: (hierarchy.topicalMap.cta_style || result.ctaStrategy.style) as 'inline' | 'banner' | 'floating',
      };
      result.inheritanceInfo.ctaStrategyFrom = 'topical_map';
    }
    if (hierarchy.topicalMap.component_preferences) {
      result.componentPreferences = {
        ...result.componentPreferences,
        ...hierarchy.topicalMap.component_preferences,
      };
    }
  }

  // Apply article level (from blueprint's page strategy)
  if (hierarchy.article?.blueprint) {
    const blueprint = hierarchy.article.blueprint as LayoutBlueprint;
    result.visualStyle = blueprint.pageStrategy.visualStyle;
    result.pacing = blueprint.pageStrategy.pacing;
    result.colorIntensity = blueprint.pageStrategy.colorIntensity;
    result.inheritanceInfo = {
      visualStyleFrom: 'article',
      pacingFrom: 'article',
      colorIntensityFrom: 'article',
      ctaStrategyFrom: hierarchy.article.blueprint.globalElements?.ctaStrategy
        ? 'article'
        : result.inheritanceInfo.ctaStrategyFrom,
    };

    if (blueprint.globalElements?.ctaStrategy) {
      result.ctaStrategy = {
        positions: blueprint.globalElements.ctaStrategy.positions,
        intensity: blueprint.globalElements.ctaStrategy.intensity,
        style: blueprint.globalElements.ctaStrategy.style,
      };
    }
  }

  return result;
}

/**
 * Apply user overrides to an existing blueprint
 */
export function applyOverrides(
  blueprint: LayoutBlueprint,
  overrides: ArticleBlueprintOverrides
): LayoutBlueprint {
  const result = { ...blueprint };

  // Apply page strategy overrides
  if (overrides.pageStrategy) {
    result.pageStrategy = {
      ...result.pageStrategy,
      ...overrides.pageStrategy,
    };
  }

  // Apply section overrides
  if (overrides.sectionOverrides && overrides.sectionOverrides.length > 0) {
    result.sections = result.sections.map(section => {
      const override = overrides.sectionOverrides?.find(o => o.sectionId === section.id);
      if (override) {
        return {
          ...section,
          presentation: {
            ...section.presentation,
            ...override.presentation,
          },
          reasoning: override.reasoning || section.reasoning,
        };
      }
      return section;
    });
  }

  // Apply global element overrides
  if (overrides.globalElements) {
    result.globalElements = {
      ...result.globalElements,
      ...overrides.globalElements,
    };
  }

  return result;
}

/**
 * Merge two blueprints, with the second taking precedence
 */
export function mergeBlueprints(
  base: Partial<LayoutBlueprint>,
  override: Partial<LayoutBlueprint>
): Partial<LayoutBlueprint> {
  return {
    ...base,
    ...override,
    pageStrategy: {
      ...base.pageStrategy,
      ...override.pageStrategy,
    } as PageStrategy,
    globalElements: {
      ...base.globalElements,
      ...override.globalElements,
    } as LayoutBlueprint['globalElements'],
    sections: override.sections || base.sections || [],
    metadata: {
      ...base.metadata,
      ...override.metadata,
    } as LayoutBlueprint['metadata'],
  };
}

/**
 * Check if a blueprint needs regeneration based on content changes
 */
export function needsRegeneration(
  existingBlueprint: LayoutBlueprint,
  newWordCount: number,
  newSectionCount: number
): boolean {
  const wordCountDiff = Math.abs(existingBlueprint.metadata.wordCount - newWordCount);
  const wordCountPercentChange = wordCountDiff / existingBlueprint.metadata.wordCount;

  // Regenerate if:
  // - Word count changed by more than 20%
  // - Section count changed significantly
  if (wordCountPercentChange > 0.2) return true;
  if (Math.abs(existingBlueprint.sections.length - newSectionCount) > 2) return true;

  return false;
}

/**
 * Create a compact representation of resolved settings for display
 */
export function summarizeSettings(settings: ResolvedBlueprintSettings): string {
  const parts = [
    `Style: ${settings.visualStyle}`,
    `Pacing: ${settings.pacing}`,
    `Colors: ${settings.colorIntensity}`,
    `CTA: ${settings.ctaStrategy.intensity} ${settings.ctaStrategy.style}`,
  ];

  if (settings.avoidComponents.length > 0) {
    parts.push(`Avoiding: ${settings.avoidComponents.join(', ')}`);
  }

  return parts.join(' | ');
}

/**
 * Validate that a blueprint is complete and valid
 */
export function validateBlueprint(blueprint: LayoutBlueprint): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!blueprint.version) errors.push('Missing version');
  if (!blueprint.id) errors.push('Missing id');
  if (!blueprint.articleId) errors.push('Missing articleId');
  if (!blueprint.pageStrategy) errors.push('Missing pageStrategy');
  if (!blueprint.sections || blueprint.sections.length === 0) {
    errors.push('No sections defined');
  }
  if (!blueprint.metadata) errors.push('Missing metadata');

  // Page strategy validation
  if (blueprint.pageStrategy) {
    const validStyles = ['editorial', 'marketing', 'minimal', 'bold', 'warm-modern'];
    if (!validStyles.includes(blueprint.pageStrategy.visualStyle)) {
      errors.push(`Invalid visual style: ${blueprint.pageStrategy.visualStyle}`);
    }
  }

  // Section validation
  blueprint.sections?.forEach((section, index) => {
    if (!section.id) errors.push(`Section ${index} missing id`);
    if (!section.presentation?.component) {
      warnings.push(`Section ${index} (${section.heading || 'unnamed'}) missing component`);
    }
  });

  // Metadata warnings
  if (blueprint.metadata?.wordCount === 0) {
    warnings.push('Word count is 0');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DEFAULT_SETTINGS,
};
