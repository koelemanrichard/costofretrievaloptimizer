/**
 * Content Rule Enforcer Service
 *
 * Validates that generated content meets all brief requirements.
 * This runs AFTER section-level validators and checks article-wide rules:
 * - CTA presence (if brief.cta defined)
 * - contextualBridge links present
 * - visual_semantics placeholders exist
 * - Word count targets from competitorSpecs
 * - Search intent alignment
 *
 * Created: January 13, 2026
 */

import { ContentBrief, ContentGenerationSection } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface RuleViolation {
  rule: string;
  category: 'cta' | 'links' | 'images' | 'wordcount' | 'structure' | 'intent';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
  location?: string;
}

export interface RuleEnforcementResult {
  passed: boolean;
  violations: RuleViolation[];
  warnings: RuleViolation[];
  score: number; // 0-100 compliance score
}

export interface EnforcementContext {
  brief: ContentBrief;
  sections: ContentGenerationSection[];
  fullDraft: string;
}

// =============================================================================
// Rule Enforcement Functions
// =============================================================================

/**
 * Check if CTA is present in the conclusion
 */
function checkCtaPresence(ctx: EnforcementContext): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const { brief, fullDraft } = ctx;

  if (!brief.cta || brief.cta.trim().length === 0) {
    return []; // No CTA requirement
  }

  const ctaText = brief.cta.toLowerCase();
  const draftLower = fullDraft.toLowerCase();

  // Check if CTA or similar text exists in draft
  const ctaWords = ctaText.split(/\s+/).filter(w => w.length > 4);
  const matchCount = ctaWords.filter(word => draftLower.includes(word)).length;
  const matchRatio = matchCount / ctaWords.length;

  if (matchRatio < 0.5) {
    violations.push({
      rule: 'CTA_PRESENCE',
      category: 'cta',
      severity: 'warning',
      message: `The user's CTA "${brief.cta}" was not found in the article`,
      suggestion: 'Add the call-to-action to the conclusion section',
      location: 'conclusion',
    });
  }

  return violations;
}

/**
 * Check if contextual bridge links are present
 */
function checkContextualBridgeLinks(ctx: EnforcementContext): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const { brief, fullDraft } = ctx;

  // Check if brief has contextual bridge requirements
  const bridgeLinks = brief.contextualBridge?.suggestedLinks || [];

  if (bridgeLinks.length === 0) {
    return []; // No bridge link requirements
  }

  // Check for markdown link patterns
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const draftLinks = [...fullDraft.matchAll(linkPattern)];
  const draftLinkUrls = new Set(draftLinks.map(m => m[2].toLowerCase()));

  const missingLinks = bridgeLinks.filter(link => {
    const linkUrl = (link.url || '').toLowerCase();
    const linkAnchor = (link.anchor || '').toLowerCase();
    // Check if either the URL or anchor text is present
    return !draftLinkUrls.has(linkUrl) &&
           !draftLinks.some(m => m[1].toLowerCase().includes(linkAnchor));
  });

  if (missingLinks.length > 0) {
    violations.push({
      rule: 'CONTEXTUAL_BRIDGE_LINKS',
      category: 'links',
      severity: 'warning',
      message: `${missingLinks.length} of ${bridgeLinks.length} suggested internal links are missing`,
      suggestion: `Add links to: ${missingLinks.slice(0, 3).map(l => l.anchor || l.url).join(', ')}${missingLinks.length > 3 ? '...' : ''}`,
    });
  }

  return violations;
}

/**
 * Check if visual semantics image placeholders exist
 */
function checkVisualSemanticsPlaceholders(ctx: EnforcementContext): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const { brief, fullDraft } = ctx;

  const visualSemantics = brief.visual_semantics || brief.enhanced_visual_semantics?.placements || [];

  if (visualSemantics.length === 0) {
    return []; // No visual semantics requirements
  }

  // Check for image placeholders or actual images
  const imagePattern = /!\[([^\]]*)\]\(([^)]*)\)|<img[^>]+>|\[IMAGE:[^\]]+\]/gi;
  const imagesInDraft = fullDraft.match(imagePattern) || [];

  if (imagesInDraft.length < visualSemantics.length) {
    violations.push({
      rule: 'VISUAL_SEMANTICS_PLACEHOLDERS',
      category: 'images',
      severity: 'info',
      message: `Expected ${visualSemantics.length} images but found ${imagesInDraft.length}`,
      suggestion: 'Add image placeholders for all planned visual semantics',
    });
  }

  return violations;
}

/**
 * Check word count against competitor specs
 */
function checkWordCountTarget(ctx: EnforcementContext): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const { brief, fullDraft } = ctx;

  const specs = brief.competitorSpecs;
  if (!specs || specs.dataQuality === 'none' || !specs.targetWordCount) {
    return []; // No competitor word count data
  }

  const wordCount = fullDraft.split(/\s+/).filter(Boolean).length;
  const targetMin = specs.wordCountRange?.min || specs.targetWordCount * 0.7;
  const targetMax = specs.wordCountRange?.max || specs.targetWordCount * 1.3;

  if (wordCount < targetMin) {
    violations.push({
      rule: 'WORD_COUNT_TARGET',
      category: 'wordcount',
      severity: specs.wordCountConfidence === 'high' ? 'warning' : 'info',
      message: `Article has ${wordCount} words, below target range (${Math.round(targetMin)}-${Math.round(targetMax)})`,
      suggestion: `Consider expanding content to reach competitor average of ${specs.targetWordCount} words`,
    });
  } else if (wordCount > targetMax * 1.2) {
    violations.push({
      rule: 'WORD_COUNT_TARGET',
      category: 'wordcount',
      severity: 'info',
      message: `Article has ${wordCount} words, significantly above competitor average (${specs.targetWordCount})`,
      suggestion: 'Content is comprehensive but may be longer than necessary for this topic',
    });
  }

  return violations;
}

/**
 * Check search intent alignment
 */
function checkSearchIntentAlignment(ctx: EnforcementContext): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const { brief, fullDraft } = ctx;

  if (!brief.searchIntent) {
    return []; // No search intent specified
  }

  const intent = brief.searchIntent.toLowerCase();
  const draftLower = fullDraft.toLowerCase();

  // Intent-specific patterns to look for
  const intentPatterns: Record<string, { required: RegExp[]; forbidden?: RegExp[] }> = {
    'informational': {
      required: [/what is|how to|why|definition|meaning|guide|explained/i],
    },
    'transactional': {
      required: [/buy|order|price|shop|cart|purchase|get started/i],
    },
    'commercial': {
      required: [/best|compare|review|vs|versus|top|recommended/i],
    },
    'navigational': {
      required: [/official|login|homepage|website/i],
    },
  };

  const patterns = intentPatterns[intent];
  if (patterns) {
    const hasRequiredPattern = patterns.required.some(p => p.test(draftLower));
    if (!hasRequiredPattern) {
      violations.push({
        rule: 'SEARCH_INTENT_ALIGNMENT',
        category: 'intent',
        severity: 'info',
        message: `Content may not fully align with ${intent} search intent`,
        suggestion: `Consider adding ${intent === 'informational' ? 'definitions and explanations' :
                    intent === 'transactional' ? 'action-oriented CTAs' :
                    intent === 'commercial' ? 'comparisons and recommendations' :
                    'direct navigation elements'}`,
      });
    }
  }

  return violations;
}

// =============================================================================
// Main Enforcement Function
// =============================================================================

/**
 * Enforce all content rules against the generated content
 *
 * @param brief - The content brief with requirements
 * @param sections - All generated sections
 * @param fullDraft - The assembled full draft
 * @returns Enforcement result with violations and score
 */
export function enforceContentRules(
  brief: ContentBrief,
  sections: ContentGenerationSection[],
  fullDraft: string
): RuleEnforcementResult {
  const ctx: EnforcementContext = { brief, sections, fullDraft };

  // Run all rule checks
  const allViolations: RuleViolation[] = [
    ...checkCtaPresence(ctx),
    ...checkContextualBridgeLinks(ctx),
    ...checkVisualSemanticsPlaceholders(ctx),
    ...checkWordCountTarget(ctx),
    ...checkSearchIntentAlignment(ctx),
  ];

  // Separate errors from warnings
  const errors = allViolations.filter(v => v.severity === 'error');
  const warnings = allViolations.filter(v => v.severity === 'warning' || v.severity === 'info');

  // Calculate compliance score
  const totalRules = 5; // Number of rule categories
  const violationCount = errors.length + (warnings.length * 0.5);
  const score = Math.max(0, Math.round(100 - (violationCount / totalRules) * 20));

  return {
    passed: errors.length === 0,
    violations: errors,
    warnings,
    score,
  };
}

/**
 * Get a summary of rule enforcement for display
 */
export function getEnforcementSummary(result: RuleEnforcementResult): string {
  if (result.passed && result.warnings.length === 0) {
    return 'All content rules satisfied';
  }

  const parts: string[] = [];

  if (!result.passed) {
    parts.push(`${result.violations.length} critical issue(s)`);
  }

  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} suggestion(s)`);
  }

  return parts.join(', ') + ` - Score: ${result.score}/100`;
}

// =============================================================================
// Export
// =============================================================================

export default {
  enforceContentRules,
  getEnforcementSummary,
};
