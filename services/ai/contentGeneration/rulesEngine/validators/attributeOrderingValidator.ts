// services/ai/contentGeneration/rulesEngine/validators/attributeOrderingValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

/**
 * Validates that attribute categories appear in priority order:
 * UNIQUE -> ROOT -> RARE -> COMMON
 *
 * Framework rule: "Attribute Types (Priority Order): 1. Unique, 2. Root, 3. Rare"
 */
export class AttributeOrderingValidator {
  /**
   * Priority order for attribute categories (lower = higher priority)
   */
  private static readonly CATEGORY_PRIORITY: Record<string, number> = {
    'UNIQUE': 1,
    'CORE_DEFINITION': 1,        // Alias for UNIQUE
    'COMPETITIVE_EXPANSION': 1,  // Alias for UNIQUE
    'ROOT': 2,
    'SEARCH_DEMAND': 2,          // Alias for ROOT
    'RARE': 3,
    'COMMON': 4,
    'COMPOSITE': 4,              // Treated as COMMON
    'UNCLASSIFIED': 5,           // Lowest priority
  };

  /**
   * Validate that sections follow attribute category priority order.
   */
  static validateSectionOrder(context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    const sections = context.brief?.structured_outline || context.allSections || [];

    if (sections.length < 2) {
      return violations;
    }

    // Filter sections that have categories and are not COMMON/COMPOSITE (allowed anywhere)
    const sectionCategories = sections
      .filter(s => s.attribute_category && s.attribute_category !== 'COMMON' && s.attribute_category !== 'COMPOSITE')
      .map(s => ({
        heading: s.heading,
        category: s.attribute_category!,
        priority: this.CATEGORY_PRIORITY[s.attribute_category!] || 5,
      }));

    // Check for ordering violations: higher priority content appearing after lower priority
    for (let i = 0; i < sectionCategories.length - 1; i++) {
      const current = sectionCategories[i];
      const next = sectionCategories[i + 1];

      // If next section has higher priority (lower number) than current, flag it
      if (next.priority < current.priority) {
        violations.push({
          rule: 'ATTRIBUTE_ORDER_VIOLATION',
          text: `"${next.heading}" (${next.category}) should appear before "${current.heading}" (${current.category})`,
          position: 0,
          suggestion: `Reorder: ${next.category} content should precede ${current.category} content for optimal semantic structure.`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Validate attribute ordering - main entry point.
   * Called by RulesValidator for section-level validation.
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    // Section ordering is validated once per article, not per section
    // Only run this on the first section to avoid duplicate warnings
    const sections = context.brief?.structured_outline || [];
    const isFirstSection = sections.length > 0 &&
                          sections[0]?.heading === context.section?.heading;

    if (!isFirstSection) {
      return [];
    }

    return this.validateSectionOrder(context);
  }
}
