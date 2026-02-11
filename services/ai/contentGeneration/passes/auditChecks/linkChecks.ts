/**
 * Phase C: Link Optimization Checks (23-25)
 *
 * Checks for anchor text variety, annotation text quality,
 * and supplementary link placement.
 *
 * @module services/ai/contentGeneration/passes/auditChecks/linkChecks
 */

import { AuditRuleResult } from '../../../../../types';
import { getAuditPatterns } from '../auditPatternsMultilingual';

// ============================================================================
// Check 23: Anchor Text Variety
// ============================================================================

export function checkAnchorTextVariety(draft: string): AuditRuleResult {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const anchorCounts = new Map<string, number>();

  let match;
  while ((match = linkPattern.exec(draft)) !== null) {
    const anchor = match[1].toLowerCase().trim();
    anchorCounts.set(anchor, (anchorCounts.get(anchor) || 0) + 1);
  }

  const violations = Array.from(anchorCounts.entries())
    .filter(([_, count]) => count > 3)
    .map(([anchor, count]) => ({ anchor, count }));

  if (violations.length > 0) {
    const worst = violations[0];
    return {
      ruleName: 'Anchor Text Variety',
      isPassing: false,
      details: `Anchor text "${worst.anchor}" used ${worst.count} times (max 3).`,
      affectedTextSnippet: worst.anchor,
      remediation: 'Use synonyms or phrase variations for repeated anchor texts to appear more natural.'
    };
  }

  return {
    ruleName: 'Anchor Text Variety',
    isPassing: true,
    details: 'Anchor text variety is good.'
  };
}

// ============================================================================
// Check 24: Annotation Text Quality
// ============================================================================

export function checkAnnotationTextQuality(draft: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const genericAnchors = patterns.genericAnchors;
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const issues: string[] = [];

  let match;
  while ((match = linkPattern.exec(draft)) !== null) {
    const anchor = match[1].toLowerCase().trim();
    const fullMatch = match[0];

    // Check for generic anchors (multilingual)
    if (genericAnchors.some(g => anchor === g || anchor.startsWith(g + ' '))) {
      issues.push(`Generic anchor: "${match[1]}"`);
      continue;
    }

    // Check surrounding text (50 chars before and after)
    const startPos = Math.max(0, match.index - 50);
    const endPos = Math.min(draft.length, match.index + fullMatch.length + 50);

    // Context should have at least 20 chars of meaningful text around the link
    const beforeLink = draft.substring(startPos, match.index).trim();
    const afterLink = draft.substring(match.index + fullMatch.length, endPos).trim();

    const contextWords = (beforeLink + ' ' + afterLink).split(/\s+/).filter(w => w.length > 2);

    if (contextWords.length < 5) {
      issues.push(`Insufficient context around "${match[1]}"`);
    }
  }

  if (issues.length > 0) {
    return {
      ruleName: 'Annotation Text Quality',
      isPassing: false,
      details: `${issues.length} link(s) lack proper annotation text.`,
      affectedTextSnippet: issues[0],
      remediation: 'Surround links with descriptive text that explains WHY the linked page is relevant. Avoid generic anchors.'
    };
  }

  return {
    ruleName: 'Annotation Text Quality',
    isPassing: true,
    details: 'Links have proper contextual annotation.'
  };
}

// ============================================================================
// Check 25: Supplementary Link Placement
// ============================================================================

export function checkSupplementaryLinkPlacement(draft: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const genericHeadings = patterns.genericHeadings;

  // Find introduction section using language-specific intro headings
  const introPatterns = genericHeadings.filter(h =>
    h.includes('intro') || h.includes('inleid') || h.includes('einleit') || h.includes('introd')
  );
  const introPattern = new RegExp(`## (?:${introPatterns.join('|')})\\n\\n([\\s\\S]*?)(?=\\n## )`, 'i');
  const introMatch = draft.match(introPattern);

  if (!introMatch) {
    return {
      ruleName: 'Supplementary Link Placement',
      isPassing: true,
      details: 'No introduction section to check.'
    };
  }

  const intro = introMatch[1];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const linksInIntro: string[] = [];

  let match;
  while ((match = linkPattern.exec(intro)) !== null) {
    linksInIntro.push(match[1]);
  }

  // More than 1 link in introduction is suspicious
  if (linksInIntro.length > 1) {
    return {
      ruleName: 'Supplementary Link Placement',
      isPassing: false,
      details: `Introduction contains ${linksInIntro.length} links. Links should be delayed until after main context is established.`,
      affectedTextSnippet: linksInIntro.join(', '),
      remediation: 'Move related links to a related topics section. Keep introduction focused on defining the main topic.'
    };
  }

  return {
    ruleName: 'Supplementary Link Placement',
    isPassing: true,
    details: 'Links are properly positioned after main content.'
  };
}
