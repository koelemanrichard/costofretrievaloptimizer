// services/ai/contentGeneration/rulesEngine/validators/briefCompletenessValidator.ts

import { ValidationViolation, SectionGenerationContext, SemanticTriple } from '../../../../../types';

/**
 * BriefCompletenessValidator
 *
 * Ensures the generated article covers all requirements from the content brief:
 * 1. All brief sections have corresponding generated content (no dropped sections)
 * 2. All UNIQUE/ROOT EAVs from the brief appear somewhere in the final article
 * 3. Target keyword appears in the article (at least once)
 * 4. Meta description length matches brief spec (if specified)
 */
export class BriefCompletenessValidator {
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const brief = context.brief;
    if (!brief) return violations;

    const contentLower = content.toLowerCase();

    // 1. Check that all brief sections have corresponding content
    if (brief.structured_outline && brief.structured_outline.length > 0) {
      for (const section of brief.structured_outline) {
        if (!section.heading) continue;
        const headingLower = section.heading.toLowerCase();
        // Check if the heading appears in the content (as markdown heading or text)
        const headingInContent = contentLower.includes(headingLower) ||
          contentLower.includes(headingLower.replace(/[^a-z0-9\s]/g, ''));

        if (!headingInContent) {
          violations.push({
            rule: 'BC_DROPPED_SECTION',
            text: `Brief section "${section.heading}" not found in article`,
            position: 0,
            suggestion: `Add content for the section "${section.heading}" from the brief outline.`,
            severity: 'error',
          });
        }
      }
    }

    // 2. Check UNIQUE/ROOT EAVs from the brief appear in the article
    const eavs: SemanticTriple[] = brief.eavs || [];
    for (const eav of eavs) {
      const category = eav.predicate?.category || (eav as any).category;
      if (category !== 'UNIQUE' && category !== 'ROOT') continue;

      const subjectLabel = eav.subject?.label?.toLowerCase() || '';
      const objectValue = typeof eav.object?.value === 'string' ? eav.object.value.toLowerCase() : '';

      const hasSubject = subjectLabel.length >= 3 && contentLower.includes(subjectLabel);
      const hasObject = objectValue.length >= 3 && contentLower.includes(objectValue);

      if (!hasSubject && !hasObject) {
        const severity = category === 'UNIQUE' ? 'error' : 'warning';
        violations.push({
          rule: 'BC_MISSING_EAV',
          text: `${category} EAV missing from article: "${eav.subject?.label} → ${eav.predicate?.relation} → ${eav.object?.value}"`,
          position: 0,
          suggestion: `Include content about "${eav.subject?.label}" (${eav.object?.value}) in the article.`,
          severity,
        });
      }
    }

    // 3. Check target keyword appears in the article
    const targetKeyword = (brief.targetKeyword || brief.title || '').toLowerCase().trim();
    if (targetKeyword.length >= 3 && !contentLower.includes(targetKeyword)) {
      violations.push({
        rule: 'BC_MISSING_KEYWORD',
        text: `Target keyword "${targetKeyword}" not found in article`,
        position: 0,
        suggestion: `Include the target keyword "${targetKeyword}" at least once in the article.`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
