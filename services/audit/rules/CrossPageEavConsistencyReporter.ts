// services/audit/rules/CrossPageEavConsistencyReporter.ts

/**
 * CrossPageEavConsistencyReporter
 *
 * Analyzes EAV triples across multiple pages and produces a consistency report
 * covering contradictions, naming inconsistencies, unit inconsistencies, and
 * a Knowledge-Base Trust (KBT) risk score.
 */

export interface PageEav {
  page: string;
  entity: string;
  attribute: string;
  value: string;
}

export interface EavContradiction {
  entity: string;
  attribute: string;
  values: Array<{ page: string; value: string }>;
}

export interface NamingInconsistency {
  variants: string[];
  pages: string[];
  suggestion: string;
}

export interface UnitInconsistency {
  entity: string;
  attribute: string;
  variants: Array<{ page: string; value: string }>;
}

export interface ConsistencyReport {
  contradictions: EavContradiction[];
  namingInconsistencies: NamingInconsistency[];
  unitInconsistencies: UnitInconsistency[];
  kbtRiskScore: number; // 0-100
  totalEavsAnalyzed: number;
}

/**
 * Normalize an entity name by stripping spaces, hyphens, and underscores,
 * then lowercasing.
 */
function normalizeEntityName(name: string): string {
  return name.replace(/[\s\-_.]/g, '').toLowerCase();
}

/**
 * Extract the unit portion from a value string.
 * Returns the text after any leading numeric content, trimmed and lowercased.
 * Returns null if no unit found.
 */
function extractUnit(value: string): string | null {
  const trimmed = value.trim();
  // Match optional number (with decimals/commas) followed by text
  const match = trimmed.match(/^[\d.,]+\s*(.+)$/);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }
  return null;
}

export class CrossPageEavConsistencyReporter {
  /**
   * Analyze an array of page-level EAV triples for cross-page consistency issues.
   */
  analyze(pageEavs: PageEav[]): ConsistencyReport {
    const contradictions = this.findContradictions(pageEavs);
    const namingInconsistencies = this.findNamingInconsistencies(pageEavs);
    const unitInconsistencies = this.findUnitInconsistencies(pageEavs);

    // Count unique entity+attribute pairs for KBT denominator
    const uniquePairs = new Set(
      pageEavs.map(
        (e) => `${e.entity.toLowerCase().trim()}::${e.attribute.toLowerCase().trim()}`
      )
    );

    const totalIssues =
      contradictions.length +
      namingInconsistencies.length +
      unitInconsistencies.length;

    const kbtRiskScore =
      uniquePairs.size === 0
        ? 0
        : Math.min(100, Math.round((totalIssues / uniquePairs.size) * 100));

    return {
      contradictions,
      namingInconsistencies,
      unitInconsistencies,
      kbtRiskScore,
      totalEavsAnalyzed: pageEavs.length,
    };
  }

  /**
   * Group by entity::attribute (case-insensitive). If any group has >1 unique
   * value (case-insensitive, trimmed), it is a contradiction.
   */
  private findContradictions(pageEavs: PageEav[]): EavContradiction[] {
    const groups = new Map<string, Array<{ page: string; value: string; entity: string; attribute: string }>>();

    for (const eav of pageEavs) {
      const key = `${eav.entity.toLowerCase().trim()}::${eav.attribute.toLowerCase().trim()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push({
        page: eav.page,
        value: eav.value,
        entity: eav.entity,
        attribute: eav.attribute,
      });
    }

    const contradictions: EavContradiction[] = [];

    for (const [, entries] of groups) {
      if (entries.length < 2) continue;

      const uniqueValues = new Set(entries.map((e) => e.value.toLowerCase().trim()));
      if (uniqueValues.size > 1) {
        contradictions.push({
          entity: entries[0].entity,
          attribute: entries[0].attribute,
          values: entries.map((e) => ({ page: e.page, value: e.value })),
        });
      }
    }

    return contradictions;
  }

  /**
   * Normalize entity names by removing spaces/hyphens/underscores.
   * If the same normalized form has multiple original spellings, flag it.
   */
  private findNamingInconsistencies(pageEavs: PageEav[]): NamingInconsistency[] {
    // Map normalized name → Set of original entity names and pages
    const normalizedMap = new Map<
      string,
      { originals: Map<string, Set<string>> }
    >();

    for (const eav of pageEavs) {
      const normalized = normalizeEntityName(eav.entity);
      if (!normalizedMap.has(normalized)) {
        normalizedMap.set(normalized, { originals: new Map() });
      }
      const entry = normalizedMap.get(normalized)!;
      if (!entry.originals.has(eav.entity)) {
        entry.originals.set(eav.entity, new Set());
      }
      entry.originals.get(eav.entity)!.add(eav.page);
    }

    const inconsistencies: NamingInconsistency[] = [];

    for (const [, entry] of normalizedMap) {
      if (entry.originals.size < 2) continue;

      const variants = Array.from(entry.originals.keys());
      const pages = new Set<string>();
      for (const pageSet of entry.originals.values()) {
        for (const page of pageSet) {
          pages.add(page);
        }
      }

      // Suggest the most common variant
      let bestVariant = variants[0];
      let bestCount = 0;
      for (const [variant, pageSet] of entry.originals) {
        if (pageSet.size > bestCount) {
          bestCount = pageSet.size;
          bestVariant = variant;
        }
      }

      inconsistencies.push({
        variants,
        pages: Array.from(pages),
        suggestion: `Standardize to "${bestVariant}"`,
      });
    }

    return inconsistencies;
  }

  /**
   * For same entity+attribute groups with 2+ entries, extract unit portion
   * (text after numbers). If different unit formats found, flag.
   */
  private findUnitInconsistencies(pageEavs: PageEav[]): UnitInconsistency[] {
    const groups = new Map<string, Array<{ page: string; value: string; entity: string; attribute: string }>>();

    for (const eav of pageEavs) {
      const key = `${eav.entity.toLowerCase().trim()}::${eav.attribute.toLowerCase().trim()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push({
        page: eav.page,
        value: eav.value,
        entity: eav.entity,
        attribute: eav.attribute,
      });
    }

    const inconsistencies: UnitInconsistency[] = [];

    for (const [, entries] of groups) {
      if (entries.length < 2) continue;

      // Only consider entries that have a unit portion
      const withUnits = entries
        .map((e) => ({ ...e, unit: extractUnit(e.value) }))
        .filter((e) => e.unit !== null);

      if (withUnits.length < 2) continue;

      const uniqueUnits = new Set(withUnits.map((e) => e.unit));
      if (uniqueUnits.size > 1) {
        inconsistencies.push({
          entity: entries[0].entity,
          attribute: entries[0].attribute,
          variants: withUnits.map((e) => ({ page: e.page, value: e.value })),
        });
      }
    }

    return inconsistencies;
  }
}
