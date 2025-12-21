/**
 * Content Analyzer - Gap Detection
 *
 * Analyzes content briefs to identify exactly what's missing for each 4 Pillars check.
 * Determines whether gaps can be fixed via keyword injection or require new content.
 *
 * Research-backed constraints:
 * - Rule III.B: Information Density - every fix must add semantic value
 * - Rule I.A: Single Macro Context - don't flag gaps that would require unrelated content
 */

import type { ContentBrief, MoneyPagePillarsResult, PillarChecklistItem } from '../../../types';
import {
  CHECK_REQUIREMENTS,
  CheckRequirement,
  FIELD_PATHS,
  getRequirementsByPriority,
} from './qualitySpec';
import { getKeywordsForLanguage, KeywordCategory } from '../../../config/moneyPageKeywords';

/**
 * Represents a gap in the content brief
 */
export interface ContentGap {
  /** Check ID (e.g., 'v1', 'm1', 'vis1') */
  checkId: string;
  /** Pillar this check belongs to */
  pillar: 'verbalization' | 'contextualization' | 'monetization' | 'visualization';
  /** Human-readable label */
  label: string;
  /** Weight of this check in scoring */
  weight: number;
  /** Primary field to fix */
  field: string;
  /** Current value of the field (if exists) */
  currentValue: string;
  /** Keywords missing from the field */
  missingKeywords: string[];
  /** Keywords already present */
  existingKeywords: string[];
  /** Can we inject keywords into existing content? */
  canInject: boolean;
  /** Does this require new content (field is empty or too short)? */
  requiresNewContent: boolean;
  /** Priority for fixing (lower = more important) */
  priority: number;
  /** Is this a critical check? */
  isCritical: boolean;
  /** Fix strategy */
  strategy: CheckRequirement['strategy'];
  /** Potential score impact if fixed */
  potentialScoreImpact: number;
}

/**
 * Result of content analysis
 */
export interface ContentAnalysisResult {
  /** All identified gaps, sorted by priority */
  gaps: ContentGap[];
  /** Gaps that can be fixed via injection (modify existing text) */
  injectableGaps: ContentGap[];
  /** Gaps that require new content */
  creationGaps: ContentGap[];
  /** Critical gaps that must be addressed */
  criticalGaps: ContentGap[];
  /** Estimated maximum score achievable with fixes */
  potentialScore: number;
  /** Current score (if pillar result provided) */
  currentScore: number;
}

/**
 * Get the value of a field from the brief
 */
function getFieldValue(brief: ContentBrief, field: string): string {
  const pathConfig = FIELD_PATHS[field];
  if (pathConfig) {
    return pathConfig.getter(brief) || '';
  }

  // Handle special fields
  if (field === 'structured_outline') {
    const sections = brief.structured_outline || [];
    return sections.map(s => s.heading || '').join(' ');
  }

  if (field === 'visual_semantics') {
    const visuals = brief.visual_semantics || [];
    return visuals.map(v => v.description || '').join(' ');
  }

  return '';
}

/**
 * Check which keywords are present/missing in text
 */
function analyzeKeywords(
  text: string,
  categories: KeywordCategory[],
  language: string
): { present: string[]; missing: string[]; total: string[] } {
  const lowerText = text.toLowerCase();
  const allKeywords: string[] = [];

  for (const category of categories) {
    const keywords = getKeywordsForLanguage(category, language);
    allKeywords.push(...keywords);
  }

  // Deduplicate
  const uniqueKeywords = [...new Set(allKeywords)];

  const present = uniqueKeywords.filter(kw => lowerText.includes(kw.toLowerCase()));
  const missing = uniqueKeywords.filter(kw => !lowerText.includes(kw.toLowerCase()));

  return { present, missing, total: uniqueKeywords };
}

/**
 * Check if a check is currently passing
 */
function isCheckPassing(
  brief: ContentBrief,
  requirement: CheckRequirement,
  language: string
): boolean {
  // For length-based checks
  if (requirement.minLength) {
    const value = getFieldValue(brief, requirement.fields[0]);
    if (value.length < requirement.minLength) return false;
  }

  // For keyword-based checks
  if (requirement.keywordCategories.length > 0) {
    const combinedText = requirement.fields
      .map(f => getFieldValue(brief, f))
      .join(' ');

    const { present } = analyzeKeywords(combinedText, requirement.keywordCategories, language);
    if (present.length < requirement.minKeywordMatches) return false;
  }

  // For structural checks (no keywords, just needs to exist)
  if (requirement.keywordCategories.length === 0 && !requirement.minLength) {
    // These checks need specific sections or structures
    // For now, consider them passing if the primary field has content
    const primaryValue = getFieldValue(brief, requirement.fields[0]);
    if (!primaryValue || primaryValue.length < 10) return false;
  }

  return true;
}

/**
 * Analyze a content brief and identify all gaps
 */
export function analyzeContentGaps(
  brief: ContentBrief,
  language: string,
  pillarsResult?: MoneyPagePillarsResult
): ContentAnalysisResult {
  const gaps: ContentGap[] = [];
  const requirements = getRequirementsByPriority();

  for (const req of requirements) {
    // Check if this requirement is already satisfied
    if (isCheckPassing(brief, req, language)) continue;

    // Get the primary field value
    const primaryField = req.fields[0];
    const currentValue = getFieldValue(brief, primaryField);

    // Analyze keywords for this field
    let missingKeywords: string[] = [];
    let existingKeywords: string[] = [];

    if (req.keywordCategories.length > 0) {
      const combinedText = req.fields.map(f => getFieldValue(brief, f)).join(' ');
      const analysis = analyzeKeywords(combinedText, req.keywordCategories, language);
      missingKeywords = analysis.missing;
      existingKeywords = analysis.present;
    }

    // Determine fix strategy
    const hasContent = currentValue.length >= 20;
    const canInject = hasContent && req.strategy === 'modify_field' && missingKeywords.length > 0;
    const requiresNewContent = !hasContent || req.strategy === 'create_if_missing' || req.strategy === 'add_to_outline';

    // Calculate potential score impact (simplified - actual calculation is in scoring)
    // Weight is out of 100 for the pillar, pillar weights vary (25/25/30/20)
    const pillarWeights: Record<string, number> = {
      verbalization: 0.25,
      contextualization: 0.25,
      monetization: 0.30,
      visualization: 0.20,
    };
    const pillarWeight = pillarWeights[req.pillar];
    const potentialScoreImpact = Math.round(req.weight * pillarWeight * 0.01 * 100);

    gaps.push({
      checkId: req.checkId,
      pillar: req.pillar,
      label: req.label,
      weight: req.weight,
      field: primaryField,
      currentValue,
      missingKeywords: missingKeywords.slice(0, 10), // Limit to top 10
      existingKeywords,
      canInject,
      requiresNewContent: requiresNewContent && !canInject,
      priority: req.priority,
      isCritical: req.isCritical,
      strategy: req.strategy,
      potentialScoreImpact,
    });
  }

  // Categorize gaps
  const injectableGaps = gaps.filter(g => g.canInject);
  const creationGaps = gaps.filter(g => g.requiresNewContent);
  const criticalGaps = gaps.filter(g => g.isCritical);

  // Calculate potential score
  const currentScore = pillarsResult?.overall_score || 0;
  const potentialGain = gaps.reduce((sum, g) => sum + g.potentialScoreImpact, 0);
  const potentialScore = Math.min(100, currentScore + potentialGain);

  return {
    gaps,
    injectableGaps,
    creationGaps,
    criticalGaps,
    potentialScore,
    currentScore,
  };
}

/**
 * Get gaps for a specific pillar
 */
export function getGapsForPillar(
  analysis: ContentAnalysisResult,
  pillar: 'verbalization' | 'contextualization' | 'monetization' | 'visualization'
): ContentGap[] {
  return analysis.gaps.filter(g => g.pillar === pillar);
}

/**
 * Get the most impactful gaps to fix first
 * Uses priority and potential impact to determine order
 */
export function getMostImpactfulGaps(
  analysis: ContentAnalysisResult,
  maxGaps: number = 10
): ContentGap[] {
  // Sort by: critical first, then by combination of priority and impact
  return [...analysis.gaps]
    .sort((a, b) => {
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      // Combined score: lower priority number = better, higher impact = better
      const aScore = a.priority - a.potentialScoreImpact;
      const bScore = b.priority - b.potentialScoreImpact;
      return aScore - bScore;
    })
    .slice(0, maxGaps);
}

/**
 * Check if a specific gap can be addressed with keyword injection
 */
export function canFixWithInjection(gap: ContentGap): boolean {
  return gap.canInject && gap.missingKeywords.length > 0;
}

/**
 * Get recommended keywords to inject for a gap
 */
export function getRecommendedKeywords(gap: ContentGap, maxKeywords: number = 3): string[] {
  // Return the most common/important keywords first
  return gap.missingKeywords.slice(0, maxKeywords);
}

/**
 * Determine if a field modification would violate semantic rules
 */
export function wouldViolateSemanticsRules(
  currentText: string,
  proposedAddition: string
): { violates: boolean; reason?: string } {
  // Rule: Don't repeat information
  const currentWords = new Set(currentText.toLowerCase().split(/\s+/));
  const proposedWords = proposedAddition.toLowerCase().split(/\s+/);
  const overlapCount = proposedWords.filter(w => currentWords.has(w) && w.length > 4).length;

  if (overlapCount > proposedWords.length * 0.5) {
    return {
      violates: true,
      reason: 'Proposed addition repeats too much existing information',
    };
  }

  // Rule: Keep text concise
  if (proposedAddition.length > currentText.length * 0.5 && currentText.length > 50) {
    return {
      violates: true,
      reason: 'Proposed addition would increase text length by more than 50%',
    };
  }

  return { violates: false };
}
