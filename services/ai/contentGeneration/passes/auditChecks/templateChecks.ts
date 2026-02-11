/**
 * Phase E: Template Compliance Checks (33-35)
 *
 * Checks for template format code compliance, template section coverage,
 * and content zone balance.
 *
 * @module services/ai/contentGeneration/passes/auditChecks/templateChecks
 */

import { ContentBrief, AuditRuleResult } from '../../../../../types';
import { TemplateConfig } from '../../../../../types/contentTemplates';

// ============================================================================
// Check 33: Template Format Code Compliance
// ============================================================================

/**
 * Checks if sections use the format codes specified by the template
 */
export function checkTemplateFormatCompliance(
  content: string,
  brief: ContentBrief,
  template?: TemplateConfig
): AuditRuleResult {
  if (!template || !brief.structured_outline) {
    return {
      ruleName: 'Template Format Compliance',
      isPassing: true,
      details: 'No template specified - skipped',
      score: 100,
    };
  }

  const issues: string[] = [];
  let compliantSections = 0;
  let totalSections = 0;

  for (const section of brief.structured_outline) {
    if (!section.format_code) continue;
    totalSections++;

    // Find expected format from template
    const templateSection = template.sectionStructure.find(ts => {
      // Remove placeholders like {entity} and compare partial match on heading pattern
      const pattern = ts.headingPattern.toLowerCase().replace(/{[^}]+}/g, '');
      // Get first significant word from pattern for matching
      const patternWords = pattern.trim().split(' ').filter(w => w.length > 2);
      const headingLower = section.heading?.toLowerCase() || '';

      // Match if any significant pattern word appears in the heading
      return patternWords.some(word => headingLower.includes(word));
    });

    if (templateSection && section.format_code === templateSection.formatCode) {
      compliantSections++;
    } else if (templateSection) {
      issues.push(
        `Section "${section.heading}" uses ${section.format_code}, template recommends ${templateSection.formatCode}`
      );
    }
  }

  const score = totalSections > 0 ? Math.round((compliantSections / totalSections) * 100) : 100;

  if (score < 70) {
    return {
      ruleName: 'Template Format Compliance',
      isPassing: false,
      details: `${compliantSections}/${totalSections} sections match template format codes (${score}%)`,
      affectedTextSnippet: issues.slice(0, 2).join('; '),
      remediation: 'Adjust section format codes to match template recommendations',
      score,
    };
  }

  return {
    ruleName: 'Template Format Compliance',
    isPassing: true,
    details: `${compliantSections}/${totalSections} sections match template format codes`,
    score,
  };
}

// ============================================================================
// Check 34: Template Section Coverage
// ============================================================================

/**
 * Checks if all required template sections are present
 */
export function checkTemplateSectionCoverage(
  content: string,
  brief: ContentBrief,
  template?: TemplateConfig
): AuditRuleResult {
  if (!template || !brief.structured_outline) {
    return {
      ruleName: 'Template Section Coverage',
      isPassing: true,
      details: 'No template specified - skipped',
      score: 100,
    };
  }

  const requiredSections = template.sectionStructure.filter(s => s.required);
  const briefHeadings = brief.structured_outline.map(s => s.heading?.toLowerCase() || '');

  const missing: string[] = [];

  for (const required of requiredSections) {
    // Remove placeholders and get significant words from heading pattern
    const pattern = required.headingPattern.toLowerCase().replace(/{[^}]+}/g, '');
    const patternWords = pattern.split(' ').filter(w => w.length > 3);

    // Check if any brief heading contains at least one significant pattern word
    const found = briefHeadings.some(h =>
      patternWords.some(word => h.includes(word))
    );

    if (!found) {
      missing.push(required.headingPattern);
    }
  }

  const coverage = requiredSections.length > 0
    ? Math.round(((requiredSections.length - missing.length) / requiredSections.length) * 100)
    : 100;

  if (missing.length > 0) {
    return {
      ruleName: 'Template Section Coverage',
      isPassing: false,
      details: `Missing ${missing.length} required template sections`,
      affectedTextSnippet: missing.slice(0, 3).map(m => `Missing: ${m}`).join('; '),
      remediation: 'Add missing required sections from template',
      score: coverage,
    };
  }

  return {
    ruleName: 'Template Section Coverage',
    isPassing: true,
    details: 'All required template sections present',
    score: 100,
  };
}

// ============================================================================
// Check 35: Content Zone Balance
// ============================================================================

/**
 * Checks MAIN vs SUPPLEMENTARY zone ratio
 * MAIN zones should contain the core content, SUPPLEMENTARY for FAQs/related
 */
export function checkContentZoneBalance(
  content: string,
  brief: ContentBrief
): AuditRuleResult {
  if (!brief.structured_outline) {
    return {
      ruleName: 'Content Zone Balance',
      isPassing: true,
      details: 'No outline - skipped',
      score: 100,
    };
  }

  const mainCount = brief.structured_outline.filter(
    s => s.content_zone === 'MAIN'
  ).length;

  const suppCount = brief.structured_outline.filter(
    s => s.content_zone === 'SUPPLEMENTARY'
  ).length;

  const issues: string[] = [];
  let score = 100;

  // Check minimum MAIN sections
  if (mainCount < 3) {
    issues.push(`Only ${mainCount} MAIN sections (minimum 3 recommended)`);
    score -= 20;
  }

  // Check SUPPLEMENTARY doesn't exceed MAIN
  if (suppCount > mainCount) {
    issues.push(`SUPPLEMENTARY (${suppCount}) exceeds MAIN (${mainCount})`);
    score -= 15;
  }

  // Warn if no SUPPLEMENTARY sections at all (might be missing FAQ)
  if (suppCount === 0 && mainCount > 3) {
    issues.push('No SUPPLEMENTARY sections (consider adding FAQ or Related Topics)');
    score -= 5;
  }

  if (issues.length > 0) {
    return {
      ruleName: 'Content Zone Balance',
      isPassing: score >= 70,
      details: `${mainCount} MAIN, ${suppCount} SUPPLEMENTARY sections`,
      affectedTextSnippet: issues.join('; '),
      remediation: 'Ensure at least 3 MAIN sections and balanced SUPPLEMENTARY content',
      score: Math.max(0, score),
    };
  }

  return {
    ruleName: 'Content Zone Balance',
    isPassing: true,
    details: `${mainCount} MAIN, ${suppCount} SUPPLEMENTARY sections (balanced)`,
    score,
  };
}
