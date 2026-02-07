// services/ai/contentGeneration/rulesEngine/validators/eavPresenceValidator.ts

import { SectionGenerationContext, ValidationViolation } from '../../../../../types';

/**
 * Lightweight EAV presence check for Pass 1.
 * Unlike the full EAV density validator (per-sentence density), this simply checks:
 * does the section mention its assigned EAVs at all?
 */
export class EavPresenceValidator {
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const sectionEavs = context.sectionEavs || [];

    if (sectionEavs.length === 0) return violations;

    const contentLower = content.toLowerCase();

    for (const eav of sectionEavs) {
      const subjectLabel = eav.subject?.label?.toLowerCase();
      const objectValue = typeof eav.object?.value === 'string' ? eav.object.value.toLowerCase() : '';

      const hasSubject = subjectLabel && subjectLabel.length >= 3 && contentLower.includes(subjectLabel);
      const hasObject = objectValue && objectValue.length >= 3 && contentLower.includes(objectValue);

      if (!hasSubject && !hasObject) {
        // UNIQUE and ROOT EAVs are critical for semantic SEO - block generation if missing
        const category = eav.predicate?.category || (eav as any).category || 'COMMON';
        const isHighPriority = category === 'UNIQUE' || category === 'ROOT';

        violations.push({
          rule: 'EAV_PRESENCE',
          text: `Missing EAV: "${eav.subject?.label} → ${eav.predicate?.relation} → ${eav.object?.value}"`,
          position: 0,
          suggestion: `Include a factual statement about "${eav.subject?.label}" and "${eav.object?.value}" in this section.`,
          severity: isHighPriority ? 'error' : 'warning',
        });
      }
    }

    return violations;
  }
}
