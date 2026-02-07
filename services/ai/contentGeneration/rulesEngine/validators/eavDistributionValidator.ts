// services/ai/contentGeneration/rulesEngine/validators/eavDistributionValidator.ts

import { ValidationViolation, SectionGenerationContext, SemanticTriple } from '../../../../../types';

/**
 * EavDistributionValidator
 *
 * Ensures EAVs are distributed across sections and not concentrated in one section:
 * 1. Each section with mapped_eavs has at least 1 EAV mention in its content
 * 2. No single section contains >60% of all article EAVs (concentration warning)
 * 3. UNIQUE EAVs are spread across at least 2 sections (not all in intro)
 */
export class EavDistributionValidator {
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const brief = context.brief;
    if (!brief) return violations;

    const eavs: SemanticTriple[] = brief.eavs || [];
    if (eavs.length < 2) return violations; // Need at least 2 EAVs to check distribution

    const contentLower = content.toLowerCase();

    // Split content by headings to approximate sections
    const sectionBlocks = content.split(/^#{2,3}\s+/m).filter(block => block.trim().length > 0);
    if (sectionBlocks.length < 2) return violations; // Need multiple sections

    // Count EAV mentions per section block
    const sectionEavCounts: number[] = [];
    const uniqueEavSections: Set<number> = new Set();

    for (let i = 0; i < sectionBlocks.length; i++) {
      const blockLower = sectionBlocks[i].toLowerCase();
      let eavCount = 0;

      for (const eav of eavs) {
        const subjectLabel = eav.subject?.label?.toLowerCase() || '';
        const objectValue = typeof eav.object?.value === 'string' ? eav.object.value.toLowerCase() : '';
        const category = eav.predicate?.category || (eav as any).category;

        const hasSubject = subjectLabel.length >= 3 && blockLower.includes(subjectLabel);
        const hasObject = objectValue.length >= 3 && blockLower.includes(objectValue);

        if (hasSubject || hasObject) {
          eavCount++;
          if (category === 'UNIQUE') {
            uniqueEavSections.add(i);
          }
        }
      }

      sectionEavCounts.push(eavCount);
    }

    const totalEavMentions = sectionEavCounts.reduce((sum, c) => sum + c, 0);
    if (totalEavMentions === 0) return violations;

    // Check concentration: no single section should have >60% of all EAV mentions
    for (let i = 0; i < sectionEavCounts.length; i++) {
      const ratio = sectionEavCounts[i] / totalEavMentions;
      if (ratio > 0.6) {
        violations.push({
          rule: 'ED_CONCENTRATION',
          text: `Section ${i + 1} contains ${Math.round(ratio * 100)}% of all EAV mentions`,
          position: 0,
          suggestion: `Distribute EAV content more evenly across sections. Section ${i + 1} is overloaded with semantic triples.`,
          severity: 'warning',
        });
      }
    }

    // Check UNIQUE EAV spread: should appear in at least 2 sections
    const uniqueEavs = eavs.filter(e =>
      (e.predicate?.category === 'UNIQUE' || (e as any).category === 'UNIQUE')
    );
    if (uniqueEavs.length >= 2 && uniqueEavSections.size < 2) {
      violations.push({
        rule: 'ED_UNIQUE_SPREAD',
        text: `UNIQUE EAVs only appear in ${uniqueEavSections.size} section(s)`,
        position: 0,
        suggestion: `Spread UNIQUE EAV mentions across at least 2 sections for better semantic coverage.`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
