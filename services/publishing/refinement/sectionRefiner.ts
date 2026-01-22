/**
 * Section Refiner Service
 *
 * Handles user feedback and refinement of blueprint sections.
 * Supports single-section refinement, batch updates, and "apply to all" functionality.
 *
 * @module services/publishing/refinement/sectionRefiner
 */

import type {
  LayoutBlueprint,
  SectionDesign,
  ComponentType,
  SectionEmphasis,
  SectionSpacing,
  ArticleBlueprintOverrides,
} from '../architect/blueprintTypes';
import {
  saveArticleBlueprint,
  updateArticleBlueprintOverrides,
  getArticleBlueprintsForMap,
  bulkUpdateComponent,
} from '../architect/blueprintStorage';

// ============================================================================
// TYPES
// ============================================================================

export interface SectionRefinement {
  sectionId: string;
  changes: {
    component?: ComponentType;
    emphasis?: SectionEmphasis;
    spacing?: SectionSpacing;
    hasBackground?: boolean;
    hasDivider?: boolean;
  };
  reasoning?: string;
}

export interface RefinementResult {
  success: boolean;
  updatedBlueprint: LayoutBlueprint;
  changedSections: string[];
  error?: string;
}

export interface ApplyToAllResult {
  success: boolean;
  articlesUpdated: number;
  sectionsUpdated: number;
  errors: string[];
}

export interface RefinementHistory {
  timestamp: string;
  sectionId: string;
  previousComponent: ComponentType;
  newComponent: ComponentType;
  reason: string;
}

// ============================================================================
// SINGLE SECTION REFINEMENT
// ============================================================================

/**
 * Apply a refinement to a single section in a blueprint
 */
export function refineSingleSection(
  blueprint: LayoutBlueprint,
  refinement: SectionRefinement
): RefinementResult {
  const sectionIndex = blueprint.sections.findIndex(s => s.id === refinement.sectionId);

  if (sectionIndex === -1) {
    return {
      success: false,
      updatedBlueprint: blueprint,
      changedSections: [],
      error: `Section ${refinement.sectionId} not found in blueprint`,
    };
  }

  const section = blueprint.sections[sectionIndex];
  const updatedSection: SectionDesign = {
    ...section,
    presentation: {
      ...section.presentation,
      ...(refinement.changes.component && { component: refinement.changes.component }),
      ...(refinement.changes.emphasis && { emphasis: refinement.changes.emphasis }),
      ...(refinement.changes.spacing && { spacing: refinement.changes.spacing }),
      ...(refinement.changes.hasBackground !== undefined && { hasBackground: refinement.changes.hasBackground }),
      ...(refinement.changes.hasDivider !== undefined && { hasDivider: refinement.changes.hasDivider }),
    },
    reasoning: refinement.reasoning || `User refined: changed to ${refinement.changes.component || section.presentation.component}`,
  };

  const updatedSections = [...blueprint.sections];
  updatedSections[sectionIndex] = updatedSection;

  return {
    success: true,
    updatedBlueprint: {
      ...blueprint,
      sections: updatedSections,
    },
    changedSections: [refinement.sectionId],
  };
}

/**
 * Apply multiple refinements to a blueprint
 */
export function refineMultipleSections(
  blueprint: LayoutBlueprint,
  refinements: SectionRefinement[]
): RefinementResult {
  let currentBlueprint = blueprint;
  const changedSections: string[] = [];
  const errors: string[] = [];

  for (const refinement of refinements) {
    const result = refineSingleSection(currentBlueprint, refinement);
    if (result.success) {
      currentBlueprint = result.updatedBlueprint;
      changedSections.push(...result.changedSections);
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return {
    success: errors.length === 0,
    updatedBlueprint: currentBlueprint,
    changedSections,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

// ============================================================================
// COMPONENT SWAPPING
// ============================================================================

/**
 * Quick swap a component type for a section
 */
export function swapComponent(
  blueprint: LayoutBlueprint,
  sectionId: string,
  newComponent: ComponentType
): RefinementResult {
  return refineSingleSection(blueprint, {
    sectionId,
    changes: { component: newComponent },
    reasoning: `Component changed to ${newComponent}`,
  });
}

/**
 * Swap all instances of a component type in a blueprint
 */
export function swapAllComponents(
  blueprint: LayoutBlueprint,
  fromComponent: ComponentType,
  toComponent: ComponentType
): RefinementResult {
  const sectionsToUpdate = blueprint.sections
    .filter(s => s.presentation.component === fromComponent)
    .map(s => s.id);

  if (sectionsToUpdate.length === 0) {
    return {
      success: true,
      updatedBlueprint: blueprint,
      changedSections: [],
    };
  }

  const refinements: SectionRefinement[] = sectionsToUpdate.map(sectionId => ({
    sectionId,
    changes: { component: toComponent },
    reasoning: `Bulk swap: ${fromComponent} → ${toComponent}`,
  }));

  return refineMultipleSections(blueprint, refinements);
}

// ============================================================================
// EMPHASIS & STYLING
// ============================================================================

/**
 * Change emphasis level for a section
 */
export function changeEmphasis(
  blueprint: LayoutBlueprint,
  sectionId: string,
  emphasis: SectionEmphasis
): RefinementResult {
  return refineSingleSection(blueprint, {
    sectionId,
    changes: { emphasis },
    reasoning: `Emphasis changed to ${emphasis}`,
  });
}

/**
 * Toggle background for a section
 */
export function toggleBackground(
  blueprint: LayoutBlueprint,
  sectionId: string
): RefinementResult {
  const section = blueprint.sections.find(s => s.id === sectionId);
  if (!section) {
    return {
      success: false,
      updatedBlueprint: blueprint,
      changedSections: [],
      error: `Section ${sectionId} not found`,
    };
  }

  return refineSingleSection(blueprint, {
    sectionId,
    changes: { hasBackground: !section.presentation.hasBackground },
    reasoning: `Background ${section.presentation.hasBackground ? 'removed' : 'added'}`,
  });
}

/**
 * Adjust spacing for a section
 */
export function changeSpacing(
  blueprint: LayoutBlueprint,
  sectionId: string,
  spacing: SectionSpacing
): RefinementResult {
  return refineSingleSection(blueprint, {
    sectionId,
    changes: { spacing },
    reasoning: `Spacing changed to ${spacing}`,
  });
}

// ============================================================================
// APPLY TO ALL (TOPICAL MAP LEVEL)
// ============================================================================

/**
 * Apply a component change to all articles in a topical map
 * This is the "Apply to all" functionality
 */
export async function applyComponentToAllArticles(
  topicalMapId: string,
  fromComponent: ComponentType,
  toComponent: ComponentType,
  options?: {
    sectionHeadingPattern?: string; // Only apply to sections matching this pattern
    onlyIfMatching?: boolean; // Only change if current component matches fromComponent
  }
): Promise<ApplyToAllResult> {
  const errors: string[] = [];
  let articlesUpdated = 0;
  let sectionsUpdated = 0;

  try {
    // Get all article blueprints for the map
    const articleBlueprints = await getArticleBlueprintsForMap(topicalMapId);

    for (const articleRow of articleBlueprints) {
      const blueprint = articleRow.blueprint as LayoutBlueprint;
      let modified = false;

      const updatedSections = blueprint.sections.map(section => {
        // Check if we should update this section
        const matchesPattern = !options?.sectionHeadingPattern ||
          section.heading?.toLowerCase().includes(options.sectionHeadingPattern.toLowerCase());

        const matchesComponent = !options?.onlyIfMatching ||
          section.presentation.component === fromComponent;

        if (matchesPattern && matchesComponent && section.presentation.component === fromComponent) {
          modified = true;
          sectionsUpdated++;
          return {
            ...section,
            presentation: {
              ...section.presentation,
              component: toComponent,
            },
            reasoning: `Bulk update: ${fromComponent} → ${toComponent}`,
          };
        }
        return section;
      });

      if (modified) {
        const updatedBlueprint: LayoutBlueprint = {
          ...blueprint,
          sections: updatedSections,
        };

        try {
          await saveArticleBlueprint(
            articleRow.topic_id,
            articleRow.topical_map_id,
            updatedBlueprint
          );
          articlesUpdated++;
        } catch (err) {
          errors.push(`Failed to update article ${articleRow.topic_id}: ${err}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      articlesUpdated,
      sectionsUpdated,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      articlesUpdated: 0,
      sectionsUpdated: 0,
      errors: [`Failed to fetch articles: ${err}`],
    };
  }
}

/**
 * Apply emphasis change to matching sections across all articles
 */
export async function applyEmphasisToAllArticles(
  topicalMapId: string,
  sectionHeadingPattern: string,
  emphasis: SectionEmphasis
): Promise<ApplyToAllResult> {
  const errors: string[] = [];
  let articlesUpdated = 0;
  let sectionsUpdated = 0;

  try {
    const articleBlueprints = await getArticleBlueprintsForMap(topicalMapId);

    for (const articleRow of articleBlueprints) {
      const blueprint = articleRow.blueprint as LayoutBlueprint;
      let modified = false;

      const updatedSections = blueprint.sections.map(section => {
        if (section.heading?.toLowerCase().includes(sectionHeadingPattern.toLowerCase())) {
          modified = true;
          sectionsUpdated++;
          return {
            ...section,
            presentation: {
              ...section.presentation,
              emphasis,
            },
            reasoning: `Bulk emphasis update to ${emphasis}`,
          };
        }
        return section;
      });

      if (modified) {
        const updatedBlueprint: LayoutBlueprint = {
          ...blueprint,
          sections: updatedSections,
        };

        try {
          await saveArticleBlueprint(
            articleRow.topic_id,
            articleRow.topical_map_id,
            updatedBlueprint
          );
          articlesUpdated++;
        } catch (err) {
          errors.push(`Failed to update article ${articleRow.topic_id}: ${err}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      articlesUpdated,
      sectionsUpdated,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      articlesUpdated: 0,
      sectionsUpdated: 0,
      errors: [`Failed to fetch articles: ${err}`],
    };
  }
}

// ============================================================================
// USER OVERRIDE MANAGEMENT
// ============================================================================

/**
 * Convert refinements to user overrides format
 */
export function toUserOverrides(
  topicId: string,
  refinements: SectionRefinement[]
): ArticleBlueprintOverrides {
  return {
    topicId,
    sectionOverrides: refinements.map(r => ({
      sectionId: r.sectionId,
      component: r.changes.component,
      emphasis: r.changes.emphasis,
      spacing: r.changes.spacing,
    })),
    appliedAt: new Date().toISOString(),
  };
}

/**
 * Save refinements as user overrides to the database
 */
export async function saveRefinements(
  topicId: string,
  refinements: SectionRefinement[]
): Promise<void> {
  const overrides = toUserOverrides(topicId, refinements);
  await updateArticleBlueprintOverrides(topicId, overrides);
}

// ============================================================================
// SUGGESTION HELPERS
// ============================================================================

/**
 * Suggest alternative components for a section based on its content
 */
export function suggestAlternativeComponents(
  section: SectionDesign
): ComponentType[] {
  const current = section.presentation.component;
  const content = (section.sourceContent || '').toLowerCase();
  const heading = (section.heading || '').toLowerCase();

  const suggestions: ComponentType[] = [];

  // List alternatives
  if (['bullet-list', 'numbered-list', 'checklist', 'icon-list', 'card-grid'].includes(current)) {
    suggestions.push('bullet-list', 'numbered-list', 'checklist', 'icon-list', 'card-grid');
  }

  // Process/timeline alternatives
  if (['timeline-vertical', 'timeline-zigzag', 'steps-numbered'].includes(current)) {
    suggestions.push('timeline-vertical', 'timeline-zigzag', 'steps-numbered');
  }

  // FAQ alternatives
  if (['faq-accordion', 'faq-cards'].includes(current)) {
    suggestions.push('faq-accordion', 'faq-cards');
  }

  // Prose alternatives
  if (['prose', 'lead-paragraph', 'highlight-box', 'callout'].includes(current)) {
    suggestions.push('prose', 'lead-paragraph', 'highlight-box', 'callout');
  }

  // Content-based suggestions
  if (heading.includes('voordel') || heading.includes('benefit') || content.includes('voordeel')) {
    if (!suggestions.includes('card-grid')) suggestions.push('card-grid');
    if (!suggestions.includes('icon-list')) suggestions.push('icon-list');
  }

  if (heading.includes('stap') || heading.includes('step') || heading.includes('proces')) {
    if (!suggestions.includes('timeline-zigzag')) suggestions.push('timeline-zigzag');
    if (!suggestions.includes('steps-numbered')) suggestions.push('steps-numbered');
  }

  // Remove current and duplicates
  return [...new Set(suggestions)].filter(c => c !== current);
}

/**
 * Get component compatibility info for UI display
 */
export function getComponentCompatibility(
  component: ComponentType
): {
  category: string;
  bestFor: string[];
  alternativesIn: ComponentType[];
} {
  const componentInfo: Record<string, { category: string; bestFor: string[]; alternativesIn: ComponentType[] }> = {
    'prose': { category: 'Content', bestFor: ['Long-form text', 'Explanations'], alternativesIn: ['lead-paragraph', 'highlight-box'] },
    'lead-paragraph': { category: 'Content', bestFor: ['Introductions', 'Key points'], alternativesIn: ['prose', 'callout'] },
    'highlight-box': { category: 'Content', bestFor: ['Important info', 'Warnings'], alternativesIn: ['callout', 'key-takeaways'] },
    'callout': { category: 'Content', bestFor: ['Tips', 'Notes'], alternativesIn: ['highlight-box', 'prose'] },
    'bullet-list': { category: 'Lists', bestFor: ['Unordered items', 'Features'], alternativesIn: ['icon-list', 'card-grid', 'checklist'] },
    'numbered-list': { category: 'Lists', bestFor: ['Ordered steps', 'Rankings'], alternativesIn: ['steps-numbered', 'timeline-vertical'] },
    'checklist': { category: 'Lists', bestFor: ['Requirements', 'To-dos'], alternativesIn: ['bullet-list', 'icon-list'] },
    'icon-list': { category: 'Lists', bestFor: ['Features', 'Benefits'], alternativesIn: ['bullet-list', 'card-grid'] },
    'card-grid': { category: 'Lists', bestFor: ['Feature showcase', 'Services'], alternativesIn: ['icon-list', 'bullet-list'] },
    'timeline-vertical': { category: 'Process', bestFor: ['History', 'Long processes'], alternativesIn: ['timeline-zigzag', 'steps-numbered'] },
    'timeline-zigzag': { category: 'Process', bestFor: ['Processes', 'Journeys'], alternativesIn: ['timeline-vertical', 'steps-numbered'] },
    'steps-numbered': { category: 'Process', bestFor: ['How-tos', 'Instructions'], alternativesIn: ['timeline-vertical', 'numbered-list'] },
    'faq-accordion': { category: 'FAQ', bestFor: ['FAQs', 'Q&A'], alternativesIn: ['faq-cards'] },
    'faq-cards': { category: 'FAQ', bestFor: ['Short FAQs', 'Key questions'], alternativesIn: ['faq-accordion'] },
    'cta-banner': { category: 'CTA', bestFor: ['Conversions', 'Sign-ups'], alternativesIn: ['cta-inline'] },
    'cta-inline': { category: 'CTA', bestFor: ['Subtle CTAs', 'Mid-content'], alternativesIn: ['cta-banner'] },
    'key-takeaways': { category: 'Summary', bestFor: ['Conclusions', 'TL;DR'], alternativesIn: ['summary-box', 'highlight-box'] },
    'summary-box': { category: 'Summary', bestFor: ['Quick summaries'], alternativesIn: ['key-takeaways'] },
  };

  return componentInfo[component] || {
    category: 'Other',
    bestFor: [],
    alternativesIn: [],
  };
}
