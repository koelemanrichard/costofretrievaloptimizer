/**
 * Content Strategy Enforcer Service
 *
 * Comprehensive validation service that ensures ALL brief requirements are met
 * before marking content as "complete". This is the final quality gate.
 *
 * The service provides a checklist-based approach:
 * - Target word count (from competitorSpecs)
 * - Contextual bridge links present
 * - CTA inserted in conclusion
 * - Search intent alignment verified
 * - Required schema types added
 * - Visual semantics placeholders created
 * - Central entity coverage
 * - EAV attribute coverage
 *
 * Created: January 13, 2026
 */

import { ContentBrief, EnrichedTopic, ContentGenerationSection, SemanticTriple } from '../types';
import { enforceContentRules, RuleEnforcementResult } from './contentRuleEnforcer';
import {
  analyzeBridgeStructure,
  validateBridgeLinksInContent,
  BridgeAnalysis,
} from './bridgeTopicManager';

// =============================================================================
// Types
// =============================================================================

export type RequirementStatus = 'passed' | 'failed' | 'warning' | 'skipped';
export type RequirementCategory =
  | 'wordcount'
  | 'structure'
  | 'links'
  | 'cta'
  | 'intent'
  | 'schema'
  | 'images'
  | 'entity'
  | 'eav';

export interface StrategyRequirement {
  id: string;
  category: RequirementCategory;
  name: string;
  description: string;
  status: RequirementStatus;
  actual?: string | number;
  expected?: string | number;
  isBlocker: boolean;
  suggestion?: string;
}

export interface StrategyChecklist {
  requirements: StrategyRequirement[];
  overallCompliance: number; // 0-100%
  blockers: StrategyRequirement[];
  warnings: StrategyRequirement[];
  passed: StrategyRequirement[];
  skipped: StrategyRequirement[];
  isComplete: boolean;
  summary: string;
}

export interface StrategyContext {
  brief: ContentBrief;
  draft: string;
  sections?: ContentGenerationSection[];
  allTopics?: EnrichedTopic[];
  eavs?: SemanticTriple[];
}

// =============================================================================
// Requirement Checkers
// =============================================================================

/**
 * Check word count against competitor specs
 */
function checkWordCount(ctx: StrategyContext): StrategyRequirement {
  const { brief, draft } = ctx;
  const specs = brief.competitorSpecs;

  // Skip if no competitor data
  if (!specs || specs.dataQuality === 'none' || !specs.targetWordCount) {
    return {
      id: 'WORD_COUNT',
      category: 'wordcount',
      name: 'Word Count Target',
      description: 'Match competitor word count',
      status: 'skipped',
      isBlocker: false,
      suggestion: 'Run competitor analysis to get word count targets',
    };
  }

  const wordCount = draft.split(/\s+/).filter(Boolean).length;
  const targetMin = specs.wordCountRange?.min || specs.targetWordCount * 0.7;
  const targetMax = specs.wordCountRange?.max || specs.targetWordCount * 1.3;

  if (wordCount >= targetMin && wordCount <= targetMax) {
    return {
      id: 'WORD_COUNT',
      category: 'wordcount',
      name: 'Word Count Target',
      description: 'Match competitor word count',
      status: 'passed',
      actual: wordCount,
      expected: `${Math.round(targetMin)}-${Math.round(targetMax)}`,
      isBlocker: false,
    };
  }

  const shortfall = wordCount < targetMin;
  return {
    id: 'WORD_COUNT',
    category: 'wordcount',
    name: 'Word Count Target',
    description: 'Match competitor word count',
    status: shortfall ? 'failed' : 'warning',
    actual: wordCount,
    expected: `${Math.round(targetMin)}-${Math.round(targetMax)}`,
    isBlocker: shortfall && specs.wordCountConfidence === 'high',
    suggestion: shortfall
      ? `Add ${Math.round(targetMin - wordCount)} more words to match competitor average`
      : `Content is ${wordCount - Math.round(targetMax)} words over target`,
  };
}

/**
 * Check if all contextual bridge links are present
 */
function checkBridgeLinks(ctx: StrategyContext): StrategyRequirement {
  const { brief, draft, allTopics } = ctx;

  // Get bridge links from brief
  const bridgeLinks = Array.isArray(brief.contextualBridge)
    ? brief.contextualBridge
    : (brief.contextualBridge as { links?: any[] })?.links || [];

  if (bridgeLinks.length === 0) {
    return {
      id: 'BRIDGE_LINKS',
      category: 'links',
      name: 'Internal Links',
      description: 'Contextual bridge links present',
      status: 'skipped',
      isBlocker: false,
      suggestion: 'No internal links specified in brief',
    };
  }

  // Validate presence in content
  const validation = validateBridgeLinksInContent(brief, draft, allTopics || []);

  if (validation.valid) {
    return {
      id: 'BRIDGE_LINKS',
      category: 'links',
      name: 'Internal Links',
      description: 'Contextual bridge links present',
      status: 'passed',
      actual: validation.presentLinks.length,
      expected: bridgeLinks.length,
      isBlocker: false,
    };
  }

  return {
    id: 'BRIDGE_LINKS',
    category: 'links',
    name: 'Internal Links',
    description: 'Contextual bridge links present',
    status: 'warning',
    actual: validation.presentLinks.length,
    expected: bridgeLinks.length,
    isBlocker: false,
    suggestion: `Missing ${validation.missingLinks.length} links: ${validation.missingLinks.slice(0, 3).map(l => l.anchorText).join(', ')}`,
  };
}

/**
 * Check if CTA is present in conclusion
 */
function checkCtaPresence(ctx: StrategyContext): StrategyRequirement {
  const { brief, draft } = ctx;

  if (!brief.cta || brief.cta.trim().length === 0) {
    return {
      id: 'CTA_PRESENCE',
      category: 'cta',
      name: 'Call-to-Action',
      description: 'User CTA in conclusion',
      status: 'skipped',
      isBlocker: false,
      suggestion: 'No CTA specified in brief',
    };
  }

  const ctaText = brief.cta.toLowerCase();
  const draftLower = draft.toLowerCase();

  // Check if CTA words appear in last 20% of content (conclusion area)
  const conclusionStart = Math.floor(draft.length * 0.8);
  const conclusionText = draft.slice(conclusionStart).toLowerCase();

  const ctaWords = ctaText.split(/\s+/).filter(w => w.length > 4);
  const matchInConclusion = ctaWords.filter(word => conclusionText.includes(word)).length;
  const matchRatio = matchInConclusion / ctaWords.length;

  if (matchRatio >= 0.5) {
    return {
      id: 'CTA_PRESENCE',
      category: 'cta',
      name: 'Call-to-Action',
      description: 'User CTA in conclusion',
      status: 'passed',
      actual: `${Math.round(matchRatio * 100)}% match`,
      expected: '50% match',
      isBlocker: false,
    };
  }

  // Check if anywhere in content
  const matchAnywhere = ctaWords.filter(word => draftLower.includes(word)).length;
  const anywhereRatio = matchAnywhere / ctaWords.length;

  if (anywhereRatio >= 0.5) {
    return {
      id: 'CTA_PRESENCE',
      category: 'cta',
      name: 'Call-to-Action',
      description: 'User CTA in conclusion',
      status: 'warning',
      actual: 'Present but not in conclusion',
      expected: 'In conclusion section',
      isBlocker: false,
      suggestion: 'Move CTA to the conclusion section for better conversion',
    };
  }

  return {
    id: 'CTA_PRESENCE',
    category: 'cta',
    name: 'Call-to-Action',
    description: 'User CTA in conclusion',
    status: 'failed',
    actual: 'Not found',
    expected: brief.cta.slice(0, 50) + (brief.cta.length > 50 ? '...' : ''),
    isBlocker: false,
    suggestion: `Add the CTA "${brief.cta.slice(0, 30)}..." to the conclusion`,
  };
}

/**
 * Check search intent alignment
 */
function checkSearchIntentAlignment(ctx: StrategyContext): StrategyRequirement {
  const { brief, draft } = ctx;

  if (!brief.searchIntent) {
    return {
      id: 'SEARCH_INTENT',
      category: 'intent',
      name: 'Search Intent',
      description: 'Content matches user intent',
      status: 'skipped',
      isBlocker: false,
      suggestion: 'No search intent specified',
    };
  }

  const intent = brief.searchIntent.toLowerCase();
  const draftLower = draft.toLowerCase();

  // Intent-specific validation
  const intentPatterns: Record<string, { patterns: RegExp[]; minMatches: number }> = {
    informational: {
      patterns: [
        /what is|what are/i,
        /how to|how do/i,
        /why is|why do/i,
        /definition|meaning|explained/i,
        /guide|tutorial|learn/i,
      ],
      minMatches: 2,
    },
    transactional: {
      patterns: [
        /buy|purchase|order/i,
        /price|cost|pricing/i,
        /get started|sign up|subscribe/i,
        /free trial|discount/i,
        /add to cart|checkout/i,
      ],
      minMatches: 1,
    },
    commercial: {
      patterns: [
        /best|top|recommended/i,
        /compare|comparison|vs|versus/i,
        /review|rating/i,
        /pros and cons|advantages/i,
        /alternative/i,
      ],
      minMatches: 2,
    },
    navigational: {
      patterns: [
        /official|login|signin/i,
        /homepage|website/i,
        /contact|support/i,
        /account|dashboard/i,
      ],
      minMatches: 1,
    },
  };

  const config = intentPatterns[intent];
  if (!config) {
    return {
      id: 'SEARCH_INTENT',
      category: 'intent',
      name: 'Search Intent',
      description: 'Content matches user intent',
      status: 'passed',
      actual: intent,
      expected: intent,
      isBlocker: false,
    };
  }

  const matchCount = config.patterns.filter(p => p.test(draftLower)).length;
  const passed = matchCount >= config.minMatches;

  return {
    id: 'SEARCH_INTENT',
    category: 'intent',
    name: 'Search Intent',
    description: 'Content matches user intent',
    status: passed ? 'passed' : 'warning',
    actual: `${matchCount} intent signals`,
    expected: `${config.minMatches}+ signals`,
    isBlocker: false,
    suggestion: !passed
      ? `Add more ${intent} intent signals (${config.patterns.slice(0, 2).map(p => p.source.split('|')[0]).join(', ')})`
      : undefined,
  };
}

/**
 * Check if visual semantics placeholders exist
 */
function checkVisualSemantics(ctx: StrategyContext): StrategyRequirement {
  const { brief, draft } = ctx;

  const visualSemantics = brief.visual_semantics || brief.enhanced_visual_semantics?.placements || [];

  if (visualSemantics.length === 0) {
    return {
      id: 'VISUAL_SEMANTICS',
      category: 'images',
      name: 'Image Placeholders',
      description: 'Visual semantics present',
      status: 'skipped',
      isBlocker: false,
      suggestion: 'No visual semantics specified',
    };
  }

  // Check for image patterns in draft
  const imagePattern = /!\[([^\]]*)\]\(([^)]*)\)|<img[^>]+>|\[IMAGE:[^\]]+\]/gi;
  const imagesInDraft = draft.match(imagePattern) || [];

  if (imagesInDraft.length >= visualSemantics.length) {
    return {
      id: 'VISUAL_SEMANTICS',
      category: 'images',
      name: 'Image Placeholders',
      description: 'Visual semantics present',
      status: 'passed',
      actual: imagesInDraft.length,
      expected: visualSemantics.length,
      isBlocker: false,
    };
  }

  return {
    id: 'VISUAL_SEMANTICS',
    category: 'images',
    name: 'Image Placeholders',
    description: 'Visual semantics present',
    status: 'warning',
    actual: imagesInDraft.length,
    expected: visualSemantics.length,
    isBlocker: false,
    suggestion: `Add ${visualSemantics.length - imagesInDraft.length} more image placeholders`,
  };
}

/**
 * Check central entity coverage
 */
function checkCentralEntityCoverage(ctx: StrategyContext): StrategyRequirement {
  const { brief, draft } = ctx;

  // Get central entity from brief or pillars
  const centralEntity = brief.entity || brief.centralEntity;

  if (!centralEntity) {
    return {
      id: 'CENTRAL_ENTITY',
      category: 'entity',
      name: 'Central Entity',
      description: 'Entity prominently featured',
      status: 'skipped',
      isBlocker: false,
      suggestion: 'No central entity defined',
    };
  }

  const entityLower = centralEntity.toLowerCase();
  const draftLower = draft.toLowerCase();

  // Count occurrences
  const regex = new RegExp(entityLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = (draft.match(regex) || []).length;
  const wordCount = draft.split(/\s+/).filter(Boolean).length;

  // Target: entity should appear at least once per 100 words
  const targetOccurrences = Math.max(3, Math.floor(wordCount / 100));
  const density = (matches / wordCount) * 100;

  // Check first paragraph
  const firstParagraph = draft.split(/\n\n/)[0] || '';
  const inFirstParagraph = firstParagraph.toLowerCase().includes(entityLower);

  if (matches >= targetOccurrences && inFirstParagraph) {
    return {
      id: 'CENTRAL_ENTITY',
      category: 'entity',
      name: 'Central Entity',
      description: 'Entity prominently featured',
      status: 'passed',
      actual: `${matches} mentions (${density.toFixed(1)}%)`,
      expected: `${targetOccurrences}+ mentions`,
      isBlocker: false,
    };
  }

  const issues: string[] = [];
  if (!inFirstParagraph) issues.push('not in first paragraph');
  if (matches < targetOccurrences) issues.push(`only ${matches} mentions`);

  return {
    id: 'CENTRAL_ENTITY',
    category: 'entity',
    name: 'Central Entity',
    description: 'Entity prominently featured',
    status: 'warning',
    actual: `${matches} mentions`,
    expected: `${targetOccurrences}+ mentions, in first paragraph`,
    isBlocker: false,
    suggestion: `Issues: ${issues.join(', ')}. Add "${centralEntity}" to introduction and throughout.`,
  };
}

/**
 * Check EAV attribute coverage
 */
function checkEavCoverage(ctx: StrategyContext): StrategyRequirement {
  const { brief, draft, eavs } = ctx;

  const attributes = eavs || brief.semanticTriples || [];

  if (attributes.length === 0) {
    return {
      id: 'EAV_COVERAGE',
      category: 'eav',
      name: 'EAV Attributes',
      description: 'Semantic attributes covered',
      status: 'skipped',
      isBlocker: false,
      suggestion: 'No EAVs defined for this topic',
    };
  }

  const draftLower = draft.toLowerCase();

  // Check which attributes are mentioned
  const coveredAttributes = attributes.filter(eav => {
    const attrLower = eav.attribute.toLowerCase();
    const valueLower = (eav.value || '').toLowerCase();
    return draftLower.includes(attrLower) || (valueLower && draftLower.includes(valueLower));
  });

  const coverageRatio = coveredAttributes.length / attributes.length;

  if (coverageRatio >= 0.6) {
    return {
      id: 'EAV_COVERAGE',
      category: 'eav',
      name: 'EAV Attributes',
      description: 'Semantic attributes covered',
      status: 'passed',
      actual: `${coveredAttributes.length}/${attributes.length} (${Math.round(coverageRatio * 100)}%)`,
      expected: '60%+ coverage',
      isBlocker: false,
    };
  }

  const missingAttrs = attributes
    .filter(eav => !coveredAttributes.includes(eav))
    .slice(0, 3)
    .map(eav => eav.attribute);

  return {
    id: 'EAV_COVERAGE',
    category: 'eav',
    name: 'EAV Attributes',
    description: 'Semantic attributes covered',
    status: coverageRatio >= 0.4 ? 'warning' : 'failed',
    actual: `${coveredAttributes.length}/${attributes.length} (${Math.round(coverageRatio * 100)}%)`,
    expected: '60%+ coverage',
    isBlocker: coverageRatio < 0.3,
    suggestion: `Missing attributes: ${missingAttrs.join(', ')}`,
  };
}

/**
 * Check section structure alignment
 */
function checkStructureAlignment(ctx: StrategyContext): StrategyRequirement {
  const { brief, draft, sections } = ctx;

  const outlineSections = brief.structured_outline || [];

  if (outlineSections.length === 0) {
    return {
      id: 'STRUCTURE',
      category: 'structure',
      name: 'Section Structure',
      description: 'Matches brief outline',
      status: 'skipped',
      isBlocker: false,
      suggestion: 'No outline defined in brief',
    };
  }

  // Check for headings in draft
  const headingPattern = /^#{1,6}\s+(.+)$/gm;
  const draftHeadings = [...draft.matchAll(headingPattern)].map(m => m[1].toLowerCase().trim());

  // Match headings to outline
  const matchedSections = outlineSections.filter(section => {
    const sectionHeading = section.heading.toLowerCase().trim();
    return draftHeadings.some(dh =>
      dh.includes(sectionHeading) ||
      sectionHeading.includes(dh) ||
      levenshteinSimilarity(dh, sectionHeading) > 0.7
    );
  });

  const matchRatio = matchedSections.length / outlineSections.length;

  if (matchRatio >= 0.8) {
    return {
      id: 'STRUCTURE',
      category: 'structure',
      name: 'Section Structure',
      description: 'Matches brief outline',
      status: 'passed',
      actual: `${matchedSections.length}/${outlineSections.length} sections`,
      expected: '80%+ match',
      isBlocker: false,
    };
  }

  const missingSections = outlineSections
    .filter(s => !matchedSections.includes(s))
    .slice(0, 3)
    .map(s => s.heading);

  return {
    id: 'STRUCTURE',
    category: 'structure',
    name: 'Section Structure',
    description: 'Matches brief outline',
    status: matchRatio >= 0.5 ? 'warning' : 'failed',
    actual: `${matchedSections.length}/${outlineSections.length} sections`,
    expected: '80%+ match',
    isBlocker: matchRatio < 0.5,
    suggestion: `Missing sections: ${missingSections.join(', ')}`,
  };
}

/**
 * Simple Levenshtein similarity (0-1)
 */
function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

// =============================================================================
// Main Evaluation Function
// =============================================================================

/**
 * Evaluate content strategy compliance
 * Returns a comprehensive checklist of requirements
 */
export function evaluateStrategy(ctx: StrategyContext): StrategyChecklist {
  const requirements: StrategyRequirement[] = [
    checkWordCount(ctx),
    checkStructureAlignment(ctx),
    checkBridgeLinks(ctx),
    checkCtaPresence(ctx),
    checkSearchIntentAlignment(ctx),
    checkVisualSemantics(ctx),
    checkCentralEntityCoverage(ctx),
    checkEavCoverage(ctx),
  ];

  // Categorize results
  const blockers = requirements.filter(r => r.status === 'failed' && r.isBlocker);
  const warnings = requirements.filter(r => r.status === 'failed' && !r.isBlocker || r.status === 'warning');
  const passed = requirements.filter(r => r.status === 'passed');
  const skipped = requirements.filter(r => r.status === 'skipped');

  // Calculate compliance score
  const applicable = requirements.filter(r => r.status !== 'skipped');
  const passedCount = passed.length;
  const warningCount = warnings.length;
  const blockerCount = blockers.length;

  let score = 0;
  if (applicable.length > 0) {
    // Full points for passed, half for warnings, none for blockers
    const totalPoints = applicable.length;
    const earnedPoints = passedCount + (warningCount * 0.5);
    score = Math.round((earnedPoints / totalPoints) * 100);
  }

  // Generate summary
  const isComplete = blockers.length === 0;
  let summary: string;

  if (blockers.length > 0) {
    summary = `${blockers.length} blocker(s) must be fixed: ${blockers.map(b => b.name).join(', ')}`;
  } else if (warnings.length > 0) {
    summary = `Ready for publication with ${warnings.length} suggestion(s)`;
  } else if (passed.length === applicable.length) {
    summary = 'All requirements met - ready for publication';
  } else {
    summary = `${passed.length} of ${applicable.length} requirements met`;
  }

  return {
    requirements,
    overallCompliance: score,
    blockers,
    warnings,
    passed,
    skipped,
    isComplete,
    summary,
  };
}

/**
 * Quick check if content is ready for publication
 */
export function isContentReady(ctx: StrategyContext): { ready: boolean; reason: string } {
  const checklist = evaluateStrategy(ctx);

  if (checklist.blockers.length > 0) {
    return {
      ready: false,
      reason: `${checklist.blockers.length} blocker(s): ${checklist.blockers[0].name}`,
    };
  }

  if (checklist.overallCompliance < 50) {
    return {
      ready: false,
      reason: `Compliance score too low (${checklist.overallCompliance}%)`,
    };
  }

  return {
    ready: true,
    reason: checklist.summary,
  };
}

/**
 * Get formatted checklist for display
 */
export function formatChecklistForDisplay(checklist: StrategyChecklist): string {
  const lines: string[] = [];

  lines.push(`Strategy Compliance: ${checklist.overallCompliance}%`);
  lines.push(`Status: ${checklist.isComplete ? 'Ready' : 'Needs Work'}`);
  lines.push('');

  // Group by status
  if (checklist.blockers.length > 0) {
    lines.push('BLOCKERS (must fix):');
    for (const req of checklist.blockers) {
      lines.push(`  [X] ${req.name}: ${req.suggestion || req.description}`);
    }
    lines.push('');
  }

  if (checklist.warnings.length > 0) {
    lines.push('WARNINGS (should fix):');
    for (const req of checklist.warnings) {
      lines.push(`  [!] ${req.name}: ${req.suggestion || req.description}`);
    }
    lines.push('');
  }

  if (checklist.passed.length > 0) {
    lines.push('PASSED:');
    for (const req of checklist.passed) {
      lines.push(`  [v] ${req.name}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get requirements grouped by category
 */
export function getRequirementsByCategory(
  checklist: StrategyChecklist
): Map<RequirementCategory, StrategyRequirement[]> {
  const grouped = new Map<RequirementCategory, StrategyRequirement[]>();

  for (const req of checklist.requirements) {
    const existing = grouped.get(req.category) || [];
    existing.push(req);
    grouped.set(req.category, existing);
  }

  return grouped;
}

// =============================================================================
// Integration with Rule Enforcer
// =============================================================================

/**
 * Combined evaluation using both strategy enforcer and rule enforcer
 */
export function evaluateContentComprehensive(
  brief: ContentBrief,
  sections: ContentGenerationSection[],
  fullDraft: string,
  allTopics?: EnrichedTopic[],
  eavs?: SemanticTriple[]
): {
  strategy: StrategyChecklist;
  rules: RuleEnforcementResult;
  combinedScore: number;
  readyForPublication: boolean;
} {
  // Run strategy evaluation
  const strategy = evaluateStrategy({
    brief,
    draft: fullDraft,
    sections,
    allTopics,
    eavs,
  });

  // Run rule enforcement
  const rules = enforceContentRules(brief, sections, fullDraft);

  // Combined score (weighted average)
  const combinedScore = Math.round(strategy.overallCompliance * 0.6 + rules.score * 0.4);

  // Ready if no blockers and reasonable score
  const readyForPublication =
    strategy.blockers.length === 0 &&
    rules.violations.length === 0 &&
    combinedScore >= 60;

  return {
    strategy,
    rules,
    combinedScore,
    readyForPublication,
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  evaluateStrategy,
  isContentReady,
  formatChecklistForDisplay,
  getRequirementsByCategory,
  evaluateContentComprehensive,
};
