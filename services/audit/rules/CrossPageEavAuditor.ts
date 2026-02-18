// services/audit/rules/CrossPageEavAuditor.ts

/**
 * CrossPageEavAuditor
 *
 * Compares EAV values for the same entity across multiple pages.
 * Flags contradictions where the same entity+attribute has different values
 * on different pages (e.g., "React release year: 2013" on one page and "2014" on another).
 *
 * Rules implemented:
 *   48 - Cross-page EAV value contradiction
 *   49 - Cross-page EAV completeness gap
 */

export interface CrossPageEavIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedPages: string[];
  affectedEntity: string;
  affectedAttribute: string;
  conflictingValues?: string[];
  exampleFix?: string;
}

export interface PageEavData {
  /** Page URL or identifier */
  pageId: string;
  /** Page title */
  pageTitle?: string;
  /** EAV triples found on this page */
  eavs: { entity: string; attribute: string; value: string; category?: string }[];
}

export class CrossPageEavAuditor {
  /**
   * Audit EAV consistency across multiple pages.
   */
  static audit(pages: PageEavData[]): CrossPageEavIssue[] {
    const issues: CrossPageEavIssue[] = [];

    if (pages.length < 2) return issues;

    // Build entity-attribute index: entity+attribute → { pageId, value }[]
    const index = new Map<string, { pageId: string; value: string }[]>();

    for (const page of pages) {
      for (const eav of page.eavs) {
        const key = `${eav.entity.toLowerCase()}||${eav.attribute.toLowerCase()}`;
        if (!index.has(key)) {
          index.set(key, []);
        }
        index.get(key)!.push({
          pageId: page.pageId,
          value: eav.value,
        });
      }
    }

    // Rule 48: Check for value contradictions
    for (const [key, entries] of index) {
      if (entries.length < 2) continue;

      const [entity, attribute] = key.split('||');
      const uniqueValues = new Set(entries.map(e => e.value.toLowerCase().trim()));

      if (uniqueValues.size > 1) {
        const conflictingValues = Array.from(uniqueValues);
        const affectedPages = [...new Set(entries.map(e => e.pageId))];

        // Determine severity based on how different the values are
        const severity = this.assessConflictSeverity(conflictingValues);

        issues.push({
          ruleId: 'rule-48',
          severity,
          title: 'Cross-page EAV value contradiction',
          description: `"${entity}" has conflicting values for "${attribute}" across ${affectedPages.length} pages: ${conflictingValues.map(v => `"${v}"`).join(' vs ')}`,
          affectedPages,
          affectedEntity: entity,
          affectedAttribute: attribute,
          conflictingValues,
          exampleFix: `Standardize the value for "${attribute}" of "${entity}" across all pages. Choose the most accurate/current value and update all references.`,
        });
      }
    }

    // Rule 49: Check for completeness gaps
    // If entity has attributes on some pages but not others
    const entityAttributes = new Map<string, Set<string>>();
    const entityPages = new Map<string, Map<string, Set<string>>>();

    for (const page of pages) {
      for (const eav of page.eavs) {
        const entity = eav.entity.toLowerCase();
        if (!entityAttributes.has(entity)) {
          entityAttributes.set(entity, new Set());
        }
        entityAttributes.get(entity)!.add(eav.attribute.toLowerCase());

        if (!entityPages.has(entity)) {
          entityPages.set(entity, new Map());
        }
        const attrPages = entityPages.get(entity)!;
        if (!attrPages.has(eav.attribute.toLowerCase())) {
          attrPages.set(eav.attribute.toLowerCase(), new Set());
        }
        attrPages.get(eav.attribute.toLowerCase())!.add(page.pageId);
      }
    }

    for (const [entity, attrs] of entityAttributes) {
      if (attrs.size < 3) continue; // Need enough attributes to check

      for (const attr of attrs) {
        const pagesWithAttr = entityPages.get(entity)?.get(attr);
        if (!pagesWithAttr) continue;

        // If attribute appears on some pages but fewer than half of pages mentioning this entity
        const totalEntityPages = new Set<string>();
        for (const [, pageSet] of entityPages.get(entity)!) {
          for (const p of pageSet) totalEntityPages.add(p);
        }

        if (pagesWithAttr.size < totalEntityPages.size * 0.3 && totalEntityPages.size >= 3) {
          const missingPages = [...totalEntityPages].filter(p => !pagesWithAttr.has(p));
          if (missingPages.length > 0) {
            issues.push({
              ruleId: 'rule-49',
              severity: 'low',
              title: 'Cross-page EAV completeness gap',
              description: `"${entity}" attribute "${attr}" only mentioned on ${pagesWithAttr.size} of ${totalEntityPages.size} pages.`,
              affectedPages: missingPages,
              affectedEntity: entity,
              affectedAttribute: attr,
              exampleFix: `Consider adding "${attr}" information for "${entity}" on missing pages for consistent coverage.`,
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Assess how severe a value conflict is.
   * Numeric disagreements are more severe than phrasing differences.
   */
  private static assessConflictSeverity(
    values: string[]
  ): 'critical' | 'high' | 'medium' | 'low' {
    // Check if values are numeric — contradictory numbers are critical
    const allNumeric = values.every(v => /^\d+([.,]\d+)?$/.test(v.trim()));
    if (allNumeric) return 'critical';

    // Check if values are very different (low similarity)
    const words0 = new Set(values[0].toLowerCase().split(/\s+/));
    const words1 = new Set(values[1]?.toLowerCase().split(/\s+/) || []);
    const intersection = [...words0].filter(w => words1.has(w));
    const similarity = intersection.length / Math.max(words0.size, words1.size);

    if (similarity < 0.2) return 'high';
    if (similarity < 0.5) return 'medium';
    return 'low'; // Likely just phrasing differences
  }
}
