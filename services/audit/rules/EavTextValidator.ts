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
    eavs?: { entity: string; attribute: string; value: string }[];
    rootAttributes?: string[];
  }): EavIssue[] {
    const issues: EavIssue[] = [];
    const lowerText = content.text.toLowerCase();

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
