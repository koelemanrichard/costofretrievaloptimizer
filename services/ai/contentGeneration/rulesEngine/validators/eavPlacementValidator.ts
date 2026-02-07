// services/ai/contentGeneration/rulesEngine/validators/eavPlacementValidator.ts

import { ValidationViolation, SectionGenerationContext, SemanticTriple } from '../../../../../types';

/**
 * Result of EAV placement validation
 * C2: UNIQUE category EAVs must appear in first 300 words
 * C3: ROOT category EAVs must appear in first 500 words
 */
export interface EavPlacementResult {
  uniqueInFirst300: boolean;
  rootInFirst500: boolean;
  uniqueEavs: { eav: SemanticTriple; position: number | null }[];
  rootEavs: { eav: SemanticTriple; position: number | null }[];
}

/**
 * EavPlacementValidator ensures that high-value semantic triples
 * (UNIQUE and ROOT categories) appear early in content for maximum
 * SEO impact and Cost of Retrieval reduction.
 *
 * Rules:
 * - C2: UNIQUE EAVs must appear in first 300 words
 * - C3: ROOT EAVs must appear in first 500 words
 */
export class EavPlacementValidator {
  /**
   * Count words in content up to a given character position
   */
  private static countWordsToPosition(content: string, position: number): number {
    const substring = content.substring(0, position);
    return substring.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Find the word position of a term in content (case-insensitive)
   * Returns null if term is not found
   */
  private static findTermPosition(content: string, term: string): number | null {
    const lowerContent = content.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const charPosition = lowerContent.indexOf(lowerTerm);

    if (charPosition === -1) return null;
    return this.countWordsToPosition(content, charPosition);
  }

  /**
   * Validate EAV placement in content
   * Returns detailed result with positions and pass/fail status
   */
  static validatePlacement(content: string, eavs: SemanticTriple[]): EavPlacementResult {
    // Filter EAVs by category - check predicate.category first, then legacy category field
    const uniqueEavs = eavs.filter(e =>
      e.predicate?.category === 'UNIQUE' || (e as any).category === 'UNIQUE'
    );
    const rootEavs = eavs.filter(e =>
      e.predicate?.category === 'ROOT' || (e as any).category === 'ROOT'
    );

    // Find positions for UNIQUE EAVs
    const uniquePositions = uniqueEavs.map(eav => {
      const term = eav.object?.value?.toString() || '';
      return { eav, position: this.findTermPosition(content, term) };
    });

    // Find positions for ROOT EAVs
    const rootPositions = rootEavs.map(eav => {
      const term = eav.object?.value?.toString() || '';
      return { eav, position: this.findTermPosition(content, term) };
    });

    // C2: At least one UNIQUE EAV must appear in first 300 words
    // Gracefully skip if no UNIQUE EAVs exist (returns true = no violation)
    const uniqueInFirst300 = uniqueEavs.length === 0
      ? true // No UNIQUE EAVs to check — skip gracefully
      : uniquePositions.some(p => p.position !== null && p.position <= 300);

    // C3: At least one ROOT EAV must appear in first 500 words
    const rootInFirst500 = rootEavs.length === 0
      ? true // No ROOT EAVs to check — skip gracefully
      : rootPositions.some(p => p.position !== null && p.position <= 500);

    return {
      uniqueInFirst300,
      rootInFirst500,
      uniqueEavs: uniquePositions,
      rootEavs: rootPositions,
    };
  }

  /**
   * Validate EAV placement and return violations
   * Validates against full article content (across all sections) or introduction sections.
   * ROOT EAVs must appear in the first 500 words of the full article.
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Validate at article level (intro sections) or during full audit (pass 8+)
    // For non-intro sections during per-section passes, skip — placement is article-level
    const isIntro = context.section?.level <= 1 ||
        context.section?.heading?.toLowerCase().includes('introduction');
    const isFullAudit = !context.section || context.section.key === 'full_article';

    if (!isIntro && !isFullAudit) {
      return violations;
    }

    // Get EAVs from extended context or fall back to brief's contextualVectors
    const eavs = (context as any).eavs || context.brief?.contextualVectors || [];
    if (eavs.length === 0) return violations;

    const result = this.validatePlacement(content, eavs);

    // C2 Violation: UNIQUE EAVs not in first 300 words
    if (!result.uniqueInFirst300 && result.uniqueEavs.length > 0) {
      const missingEavs = result.uniqueEavs
        .filter(p => p.position === null || p.position > 300)
        .map(p => p.eav.object?.value)
        .filter(Boolean);

      violations.push({
        rule: 'C2_UNIQUE_EAV_PLACEMENT',
        text: `UNIQUE EAVs not found in first 300 words: ${missingEavs.join(', ')}`,
        position: 0,
        suggestion: `Move UNIQUE EAV content earlier in the article. These high-value semantic triples should appear in the first 300 words.`,
        severity: 'warning',
      });
    }

    // C3 Violation: ROOT EAVs not in first 500 words
    if (!result.rootInFirst500 && result.rootEavs.length > 0) {
      const missingEavs = result.rootEavs
        .filter(p => p.position === null || p.position > 500)
        .map(p => p.eav.object?.value)
        .filter(Boolean);

      violations.push({
        rule: 'C3_ROOT_EAV_PLACEMENT',
        text: `ROOT EAVs not found in first 500 words: ${missingEavs.join(', ')}`,
        position: 0,
        suggestion: `Move ROOT EAV content earlier in the article. These foundational semantic triples should appear in the first 500 words.`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
