// services/audit/ruleRegistry.ts
// Rule registry and inventory builder for the audit system (~282 static rules + dynamic templates).
//
// Rather than statically listing all rules (which would drift from actual code),
// the inventory is built dynamically from phase results after each audit.
// This module provides:
//   1. Data dependency declarations for skip-reason tracking
//   2. The buildRuleInventory() function that produces complete rule status lists

import type { AuditPhaseName, AuditPhaseResult, RuleInventoryItem } from './types';

// ---------------------------------------------------------------------------
// Data dependency map — which rule-ID prefixes require which external data
// ---------------------------------------------------------------------------

export interface DataDependency {
  /** Rule ID prefix to match (e.g., 'rule-32' matches 'rule-320', 'rule-321', etc.) */
  rulePrefix: string;
  /** Human-readable data source name */
  dataSource: string;
  /** Key on enrichedContent/topicalMapContext that must be truthy */
  requiredKey: string;
  /** Skip reason shown when data is unavailable */
  skipReason: string;
}

/**
 * Known data dependencies for rules that may be skipped when external data
 * is unavailable. Rule IDs that don't match any prefix are assumed to always
 * have sufficient data (they only need HTML/text content).
 */
export const DATA_DEPENDENCIES: DataDependency[] = [
  // Core Web Vitals (rules 320-333) — require PageSpeed Insights API
  { rulePrefix: 'rule-320', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-321', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-322', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-323', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-324', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-325', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-326', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-327', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-328', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-329', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-330', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-331', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-332', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },
  { rulePrefix: 'rule-333', dataSource: 'cwvMetrics', requiredKey: 'cwvMetrics', skipReason: 'PageSpeed API not enabled' },

  // HTTP Headers (rules 311-319) — require fetch-proxy response headers
  { rulePrefix: 'rule-311', dataSource: 'httpHeaders', requiredKey: 'httpHeaders', skipReason: 'HTTP headers not available' },
  { rulePrefix: 'rule-312', dataSource: 'httpHeaders', requiredKey: 'httpHeaders', skipReason: 'HTTP headers not available' },
  { rulePrefix: 'rule-313', dataSource: 'httpHeaders', requiredKey: 'httpHeaders', skipReason: 'HTTP headers not available' },
  { rulePrefix: 'rule-314', dataSource: 'httpHeaders', requiredKey: 'httpHeaders', skipReason: 'HTTP headers not available' },
  { rulePrefix: 'rule-315', dataSource: 'httpHeaders', requiredKey: 'httpHeaders', skipReason: 'HTTP headers not available' },
  { rulePrefix: 'rule-316', dataSource: 'httpHeaders', requiredKey: 'httpHeaders', skipReason: 'HTTP headers not available' },
  { rulePrefix: 'rule-317', dataSource: 'httpHeaders', requiredKey: 'httpHeaders', skipReason: 'HTTP headers not available' },
  { rulePrefix: 'rule-318', dataSource: 'httpHeaders', requiredKey: 'httpHeaders', skipReason: 'HTTP headers not available' },
  { rulePrefix: 'rule-319', dataSource: 'httpHeaders', requiredKey: 'httpHeaders', skipReason: 'HTTP headers not available' },

  // Robots.txt rules (371, 373)
  { rulePrefix: 'rule-371', dataSource: 'robotsTxt', requiredKey: 'robotsTxt', skipReason: 'robots.txt not fetched' },
  { rulePrefix: 'rule-373', dataSource: 'robotsTxt', requiredKey: 'robotsTxt', skipReason: 'robots.txt not fetched' },

  // Sitemap rules (361-362, 374-375, 378)
  { rulePrefix: 'rule-361', dataSource: 'sitemapUrls', requiredKey: 'sitemapUrls', skipReason: 'Sitemap not fetched' },
  { rulePrefix: 'rule-362', dataSource: 'sitemapUrls', requiredKey: 'sitemapUrls', skipReason: 'Sitemap not fetched' },
  { rulePrefix: 'rule-374', dataSource: 'sitemapUrls', requiredKey: 'sitemapUrls', skipReason: 'Sitemap not fetched' },
  { rulePrefix: 'rule-375', dataSource: 'sitemapUrls', requiredKey: 'sitemapUrls', skipReason: 'Sitemap not fetched' },
  { rulePrefix: 'rule-378', dataSource: 'sitemapUrls', requiredKey: 'sitemapUrls', skipReason: 'Sitemap not fetched' },

  // GSC indexation (368-370)
  { rulePrefix: 'rule-368', dataSource: 'gscStatus', requiredKey: 'gscStatus', skipReason: 'GSC data not available' },
  { rulePrefix: 'rule-369', dataSource: 'gscStatus', requiredKey: 'gscStatus', skipReason: 'GSC data not available' },
  { rulePrefix: 'rule-370', dataSource: 'gscStatus', requiredKey: 'gscStatus', skipReason: 'GSC data not available' },

  // Hreflang rules (hreflang-2 through hreflang-7) — require hreflang annotations
  { rulePrefix: 'hreflang-2', dataSource: 'hreflangAnnotations', requiredKey: 'hreflangAnnotations', skipReason: 'Hreflang annotations not available' },
  { rulePrefix: 'hreflang-3', dataSource: 'hreflangAnnotations', requiredKey: 'hreflangAnnotations', skipReason: 'Hreflang annotations not available' },
  { rulePrefix: 'hreflang-4', dataSource: 'hreflangAnnotations', requiredKey: 'hreflangAnnotations', skipReason: 'Hreflang annotations not available' },
  { rulePrefix: 'hreflang-5', dataSource: 'hreflangAnnotations', requiredKey: 'hreflangAnnotations', skipReason: 'Hreflang annotations not available' },
  { rulePrefix: 'hreflang-6', dataSource: 'hreflangAnnotations', requiredKey: 'hreflangAnnotations', skipReason: 'Hreflang annotations not available' },
  { rulePrefix: 'hreflang-7', dataSource: 'hreflangAnnotations', requiredKey: 'hreflangAnnotations', skipReason: 'Hreflang annotations not available' },

  // N-gram consistency (ngram-*) — requires cross-page content
  { rulePrefix: 'ngram-boilerplate-ratio', dataSource: 'crossPageContent', requiredKey: 'crossPageContent', skipReason: 'Cross-page content not available' },
  { rulePrefix: 'ngram-missing-ce', dataSource: 'crossPageContent', requiredKey: 'crossPageContent', skipReason: 'Cross-page content not available' },
  { rulePrefix: 'ngram-inconsistent-terminology', dataSource: 'crossPageContent', requiredKey: 'crossPageContent', skipReason: 'Cross-page content not available' },

  // URL status / response time (348, 354-355, 359, 367)
  { rulePrefix: 'rule-348', dataSource: 'statusCode', requiredKey: 'statusCode', skipReason: 'HTTP status not available' },
  { rulePrefix: 'rule-354', dataSource: 'statusCode', requiredKey: 'statusCode', skipReason: 'HTTP status not available' },
  { rulePrefix: 'rule-355', dataSource: 'statusCode', requiredKey: 'statusCode', skipReason: 'HTTP status not available' },
  { rulePrefix: 'rule-359', dataSource: 'responseTimeMs', requiredKey: 'responseTimeMs', skipReason: 'Response time not measured' },
  { rulePrefix: 'rule-367', dataSource: 'responseTimeMs', requiredKey: 'responseTimeMs', skipReason: 'Response time not measured' },
];

// ---------------------------------------------------------------------------
// Build Rule Inventory from Phase Results
// ---------------------------------------------------------------------------

/**
 * Build a complete rule inventory from phase results.
 *
 * For each rule that appears in findings → status 'failed' with severity.
 * For each phase that ran (totalChecks > 0), rules NOT in findings → 'passed'.
 * Rules whose required data wasn't available → 'skipped' with reason.
 *
 * @param phaseResults - Results from all audit phases
 * @param enrichedContent - The content object passed to phases (for checking data availability)
 */
export function buildRuleInventory(
  phaseResults: AuditPhaseResult[],
  enrichedContent?: Record<string, unknown>,
): RuleInventoryItem[] {
  const inventory: RuleInventoryItem[] = [];
  const seenRuleIds = new Set<string>();

  // 1. All rules that fired (findings = failed rules)
  for (const pr of phaseResults) {
    for (const finding of pr.findings) {
      if (seenRuleIds.has(finding.ruleId)) continue;
      seenRuleIds.add(finding.ruleId);

      inventory.push({
        ruleId: finding.ruleId,
        phase: finding.phase,
        title: finding.title,
        category: finding.category,
        status: 'failed',
        severity: finding.severity,
      });
    }
  }

  // 2. Check data dependencies for skipped rules
  for (const dep of DATA_DEPENDENCIES) {
    if (seenRuleIds.has(dep.rulePrefix)) continue;

    // Check if the required data was available
    const dataAvailable = enrichedContent
      ? !!(enrichedContent[dep.requiredKey])
      : false;

    if (!dataAvailable) {
      seenRuleIds.add(dep.rulePrefix);
      // Determine the phase from rule number ranges
      const phase = inferPhaseFromRuleId(dep.rulePrefix);
      inventory.push({
        ruleId: dep.rulePrefix,
        phase,
        title: `${dep.dataSource} check`,
        category: dep.dataSource,
        status: 'skipped',
        skipReason: dep.skipReason,
      });
    }
    // If data WAS available but rule didn't fire → it passed (handled below)
  }

  // 3. For data-dependency rules that had data available but didn't fire → 'passed'
  for (const dep of DATA_DEPENDENCIES) {
    if (seenRuleIds.has(dep.rulePrefix)) continue;
    seenRuleIds.add(dep.rulePrefix);

    const phase = inferPhaseFromRuleId(dep.rulePrefix);
    inventory.push({
      ruleId: dep.rulePrefix,
      phase,
      title: `${dep.dataSource} check`,
      category: dep.dataSource,
      status: 'passed',
    });
  }

  // 4. Derive "passed" count from each phase's totalChecks minus findings
  //    This captures rules that ran and passed without requiring static enumeration.
  for (const pr of phaseResults) {
    const failedInPhase = pr.findings.length;
    const passedInPhase = Math.max(0, pr.totalChecks - failedInPhase);

    // We've already catalogued the failed rules. Add a summary "passed" entry
    // for the remaining checks in this phase.
    if (passedInPhase > 0) {
      inventory.push({
        ruleId: `${pr.phase}-passed`,
        phase: pr.phase,
        title: `${passedInPhase} checks passed`,
        category: formatPhaseName(pr.phase),
        status: 'passed',
      });
    }
  }

  return inventory;
}

/**
 * Compute summary statistics from a rule inventory.
 */
export function summarizeRuleInventory(inventory: RuleInventoryItem[]): {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
} {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of inventory) {
    switch (item.status) {
      case 'passed': passed++; break;
      case 'failed': failed++; break;
      case 'skipped': skipped++; break;
    }
  }

  return { total: passed + failed + skipped, passed, failed, skipped };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Infer the audit phase from a rule ID number range or prefix. */
function inferPhaseFromRuleId(ruleId: string): AuditPhaseName {
  // Handle non-numeric prefixed rule IDs
  if (ruleId.startsWith('hreflang-')) return 'urlArchitecture';
  if (ruleId.startsWith('ngram-')) return 'crossPageConsistency';
  if (ruleId.startsWith('rule-bp-')) return 'internalLinking';
  if (ruleId.startsWith('rule-asc-')) return 'contextualFlow';
  if (ruleId.startsWith('img-sitemap-')) return 'urlArchitecture';
  if (ruleId.startsWith('sf-ce-')) return 'strategicFoundation';
  if (ruleId.startsWith('eav-')) return 'eavSystem';
  if (ruleId.startsWith('fv-')) return 'factValidation';

  const match = ruleId.match(/rule-(\d+)/);
  if (!match) return 'costOfRetrieval';
  const num = parseInt(match[1], 10);

  if (num <= 25) return 'strategicFoundation';
  if (num <= 50) return 'eavSystem';
  if (num <= 95) return 'microSemantics';
  if (num <= 115) return 'informationDensity';
  if (num <= 160) return 'contextualFlow';
  if (num <= 200) return 'internalLinking';
  if (num <= 204) return 'semanticDistance';
  if (num <= 240) return 'contentFormat';
  if (num <= 270) return 'htmlTechnical';
  if (num <= 290) return 'metaStructuredData';
  if (num <= 340) return 'costOfRetrieval';
  if (num <= 380) return 'urlArchitecture';
  if (num <= 400) return 'crossPageConsistency';
  return 'websiteTypeSpecific';
}

/** Format a phase name for display. */
function formatPhaseName(phase: AuditPhaseName): string {
  const map: Record<string, string> = {
    strategicFoundation: 'Strategic Foundation',
    eavSystem: 'EAV System',
    microSemantics: 'Micro-Semantics',
    informationDensity: 'Information Density',
    contextualFlow: 'Contextual Flow',
    internalLinking: 'Internal Linking',
    semanticDistance: 'Semantic Distance',
    contentFormat: 'Content Format',
    htmlTechnical: 'HTML Technical',
    metaStructuredData: 'Meta & Structured Data',
    costOfRetrieval: 'Cost of Retrieval',
    urlArchitecture: 'URL Architecture',
    crossPageConsistency: 'Cross-Page Consistency',
    websiteTypeSpecific: 'Website Type Specific',
    factValidation: 'Fact Validation',
  };
  return map[phase] || phase;
}
