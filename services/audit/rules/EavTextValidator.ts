/**
 * EavTextValidator
 *
 * Validates that content properly expresses Entity-Attribute-Value (EAV)
 * triples in text. Checks for explicit triple coverage, pronoun overuse,
 * quantitative value units, and root attribute completeness.
 *
 * Rules implemented:
 *   33 - Low EAV triple coverage in text
 *   37 - Excessive pronoun usage (named entities preferred)
 *   40 - Quantitative values missing units
 *   45 - Incomplete root attribute coverage
 */

export interface EavIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class EavTextValidator {
  validate(content: {
    text: string;
    eavs?: { entity: string; attribute: string; value: string; category?: string; predicateType?: string }[];
    rootAttributes?: string[];
  }): EavIssue[] {
    const issues: EavIssue[] = [];
    const lowerText = content.text.toLowerCase();

    // Rule 46: Category distribution enforcement
    if (content.eavs && content.eavs.length >= 4) {
      this.checkCategoryDistribution(content.eavs, issues);
    }

    // Rule 47: Predicate diversity scoring
    if (content.eavs && content.eavs.length >= 3) {
      this.checkPredicateDiversity(content.eavs, issues);
    }

    // Rules 33-36: Check explicit EAV triples in text
    if (content.eavs && content.eavs.length > 0) {
      const explicitCount = content.eavs.filter(eav =>
        lowerText.includes(eav.entity.toLowerCase()) &&
        lowerText.includes(eav.attribute.toLowerCase()) &&
        lowerText.includes(eav.value.toLowerCase())
      ).length;
      const coverage = explicitCount / content.eavs.length;
      if (coverage < 0.5) {
        issues.push({
          ruleId: 'rule-33',
          severity: 'high',
          title: 'Low EAV triple coverage in text',
          description: `Only ${explicitCount}/${content.eavs.length} EAV triples are explicitly stated (entity + attribute + value).`,
          exampleFix: 'Explicitly state entity-attribute-value relationships in the text.',
        });
      }
    }

    // Rule 37: Named entities, not just pronouns — check for excessive pronoun usage
    this.checkPronounOveruse(content.text, issues);

    // Rules 40-41: Quantitative values should have units
    this.checkQuantitativeValues(content.text, issues);

    // Rule 45: Root attributes complete — check if all root attrs are covered
    if (content.rootAttributes && content.rootAttributes.length > 0) {
      const covered = content.rootAttributes.filter(a => lowerText.includes(a.toLowerCase()));
      if (covered.length < content.rootAttributes.length) {
        const missing = content.rootAttributes.filter(a => !lowerText.includes(a.toLowerCase()));
        issues.push({
          ruleId: 'rule-45',
          severity: 'high',
          title: 'Incomplete root attribute coverage',
          description: `Missing root attributes: ${missing.join(', ')}`,
          affectedElement: missing.slice(0, 5).join(', '),
          exampleFix: 'Cover all root attributes defined for this entity.',
        });
      }
    }

    return issues;
  }

  checkPronounOveruse(text: string, issues: EavIssue[]): void {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) return;

    const pronounPattern = /\b(it|they|them|this|that|these|those|he|she|its|their)\b/gi;
    const pronounSentences = sentences.filter(s => {
      const pronounCount = (s.match(pronounPattern) || []).length;
      const words = s.trim().split(/\s+/).length;
      return pronounCount > 0 && pronounCount / words > 0.15; // >15% pronouns
    });

    if (pronounSentences.length > sentences.length * 0.3) {
      issues.push({
        ruleId: 'rule-37',
        severity: 'medium',
        title: 'Excessive pronoun usage',
        description: `${pronounSentences.length} of ${sentences.length} sentences have high pronoun density. Use named entities instead.`,
        exampleFix: 'Replace pronouns with explicit entity names for better semantic clarity.',
      });
    }
  }

  /**
   * Rule 46: Category distribution targets.
   * UNIQUE: 15-25%, ROOT: 25-35%, RARE: 20-30%, COMMON: 20-30%
   */
  checkCategoryDistribution(
    eavs: { entity: string; attribute: string; value: string; category?: string }[],
    issues: EavIssue[]
  ): void {
    const total = eavs.length;
    const counts: Record<string, number> = { UNIQUE: 0, ROOT: 0, RARE: 0, COMMON: 0 };

    for (const eav of eavs) {
      const cat = (eav.category || 'COMMON').toUpperCase();
      if (cat in counts) {
        counts[cat]++;
      }
    }

    const targets: Record<string, { min: number; max: number }> = {
      UNIQUE: { min: 0.15, max: 0.25 },
      ROOT: { min: 0.25, max: 0.35 },
      RARE: { min: 0.20, max: 0.30 },
      COMMON: { min: 0.20, max: 0.30 },
    };

    const outOfRange: string[] = [];
    for (const [cat, target] of Object.entries(targets)) {
      const ratio = counts[cat] / total;
      if (ratio < target.min || ratio > target.max) {
        outOfRange.push(
          `${cat}: ${Math.round(ratio * 100)}% (target: ${Math.round(target.min * 100)}-${Math.round(target.max * 100)}%)`
        );
      }
    }

    if (outOfRange.length > 0) {
      issues.push({
        ruleId: 'rule-46',
        severity: 'medium',
        title: 'EAV category distribution outside targets',
        description: `Category distribution deviates from framework targets: ${outOfRange.join('; ')}`,
        exampleFix: 'Adjust EAV distribution: UNIQUE 15-25%, ROOT 25-35%, RARE 20-30%, COMMON 20-30%.',
      });
    }
  }

  /**
   * Rule 47: Predicate diversity scoring.
   * Each entity should use 3+ predicate types. Uses Shannon entropy.
   */
  checkPredicateDiversity(
    eavs: { entity: string; attribute: string; value: string; predicateType?: string }[],
    issues: EavIssue[]
  ): void {
    // Group by entity
    const entityPredicates = new Map<string, Set<string>>();

    for (const eav of eavs) {
      const entity = eav.entity.toLowerCase();
      if (!entityPredicates.has(entity)) {
        entityPredicates.set(entity, new Set());
      }
      // Use predicate type if available, otherwise use attribute as proxy
      const predicateType = eav.predicateType || this.inferPredicateType(eav.attribute);
      entityPredicates.get(entity)!.add(predicateType);
    }

    const lowDiversityEntities: string[] = [];
    for (const [entity, types] of entityPredicates) {
      if (types.size < 3 && entityPredicates.size > 1) {
        lowDiversityEntities.push(`"${entity}" (${types.size} type(s))`);
      }
    }

    if (lowDiversityEntities.length > 0) {
      // Calculate Shannon entropy for overall diversity
      const allTypes = new Map<string, number>();
      for (const [, types] of entityPredicates) {
        for (const type of types) {
          allTypes.set(type, (allTypes.get(type) || 0) + 1);
        }
      }
      const total = Array.from(allTypes.values()).reduce((s, c) => s + c, 0);
      let entropy = 0;
      for (const count of allTypes.values()) {
        const p = count / total;
        if (p > 0) entropy -= p * Math.log2(p);
      }

      issues.push({
        ruleId: 'rule-47',
        severity: 'medium',
        title: 'Low predicate diversity',
        description: `Entities with <3 predicate types: ${lowDiversityEntities.join(', ')}. Shannon entropy: ${entropy.toFixed(2)}.`,
        exampleFix: 'Add TYPE, COMPONENT, BENEFIT, RISK, PROCESS, SPECIFICATION predicates for each entity.',
      });
    }
  }

  private inferPredicateType(attribute: string): string {
    const lower = attribute.toLowerCase();
    if (/type|kind|class|category/.test(lower)) return 'TYPE';
    if (/part|component|element|contains/.test(lower)) return 'COMPONENT';
    if (/benefit|advantage|pro|strength/.test(lower)) return 'BENEFIT';
    if (/risk|disadvantage|con|weakness|danger/.test(lower)) return 'RISK';
    if (/process|method|step|procedure/.test(lower)) return 'PROCESS';
    if (/spec|measurement|dimension|size|weight|height/.test(lower)) return 'SPECIFICATION';
    return 'ATTRIBUTE';
  }

  checkQuantitativeValues(text: string, issues: EavIssue[]): void {
    // Find numbers that lack units
    const numbersTotal = (text.match(/\b\d{2,}/g) || []).length;
    const numbersWithUnit = (text.match(/\b\d{2,}\s*(mg|kg|g|lb|oz|cm|mm|m|km|ft|in|mi|%|mph|kph|ms|sec|min|hr|USD|\$|€|£|px|em|rem|GB|MB|KB|TB|°[CF])/g) || []).length;

    if (numbersTotal > 3 && numbersWithUnit < numbersTotal * 0.5) {
      issues.push({
        ruleId: 'rule-40',
        severity: 'medium',
        title: 'Quantitative values missing units',
        description: `${numbersTotal - numbersWithUnit} of ${numbersTotal} numeric values lack units.`,
        exampleFix: 'Add units to numeric values (e.g., "500" → "500 mg", "30" → "30 minutes").',
      });
    }
  }
}
