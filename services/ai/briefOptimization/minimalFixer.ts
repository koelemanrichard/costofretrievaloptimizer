/**
 * Minimal Fixer - Orchestrator
 *
 * Implements the modify-first, append-only-if-necessary strategy.
 * This is the main entry point for fixing content briefs.
 *
 * Anti-bloat rules:
 * 1. Always try keyword injection before adding content
 * 2. Maximum 2 new sections per fix operation
 * 3. Check if commercial sections already exist before adding
 * 4. Deduplicate keywords that already exist
 * 5. Preserve existing content structure
 */

import type {
  ContentBrief,
  BusinessInfo,
  MoneyPagePillarsResult,
  BriefSection,
  VisualSemantics,
} from '../../../types';
import {
  analyzeContentGaps,
  ContentGap,
  ContentAnalysisResult,
  getMostImpactfulGaps,
} from './contentAnalyzer';
import { injectKeywordsIntoText, InjectionResult } from './keywordInjector';
import { ANTI_BLOAT_RULES, FIELD_PATHS, getRequirementById } from './qualitySpec';
import { getKeywordsForLanguage, KeywordCategory } from '../../../config/moneyPageKeywords';
import React from 'react';

/**
 * Result of the minimal fix operation
 */
export interface MinimalFixResult {
  /** Updates to apply to the brief */
  updates: Partial<ContentBrief>;
  /** Gaps that were successfully fixed */
  fixedGaps: string[];
  /** Gaps that could not be fixed */
  unfixedGaps: string[];
  /** Summary of changes made */
  summary: string;
  /** Number of keywords injected */
  keywordsInjected: number;
  /** Number of new sections added */
  sectionsAdded: number;
  /** Estimated new score after fixes */
  estimatedNewScore: number;
}

/**
 * Options for the fix operation
 */
export interface MinimalFixOptions {
  /** Maximum gaps to attempt fixing */
  maxGapsToFix?: number;
  /** Whether to allow adding new sections */
  allowNewSections?: boolean;
  /** Maximum new sections to add */
  maxNewSections?: number;
  /** Focus on critical gaps only */
  criticalOnly?: boolean;
}

const DEFAULT_FIX_OPTIONS: MinimalFixOptions = {
  maxGapsToFix: 15,
  allowNewSections: true,
  maxNewSections: ANTI_BLOAT_RULES.maxNewSections,
  criticalOnly: false,
};

/**
 * Generate minimal fixes for a content brief
 * Uses modify-first strategy to prevent bloat
 */
export async function generateMinimalFixes(
  brief: ContentBrief,
  pillarsResult: MoneyPagePillarsResult,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  options: MinimalFixOptions = {}
): Promise<MinimalFixResult> {
  const mergedOptions = { ...DEFAULT_FIX_OPTIONS, ...options };
  const language = businessInfo.language || 'English';

  dispatch({
    type: 'SET_NOTIFICATION',
    payload: 'Analyzing content brief for optimization opportunities...',
  });

  // Step 1: Analyze gaps
  const analysis = analyzeContentGaps(brief, language, pillarsResult);

  // Step 2: Get prioritized gaps to fix
  let gapsToFix = mergedOptions.criticalOnly
    ? analysis.criticalGaps
    : getMostImpactfulGaps(analysis, mergedOptions.maxGapsToFix);

  const updates: Partial<ContentBrief> = {};
  const fixedGaps: string[] = [];
  const unfixedGaps: string[] = [];
  let keywordsInjectedCount = 0;
  let sectionsAddedCount = 0;

  // Track which fields we've already modified to avoid conflicts
  const modifiedFields = new Set<string>();

  // Step 3: Process each gap with modify-first strategy
  for (const gap of gapsToFix) {
    // Skip if we've already modified this field
    if (modifiedFields.has(gap.field)) {
      continue;
    }

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'MinimalFixer',
        message: `Processing gap: ${gap.label} (${gap.checkId})`,
        status: 'info',
        timestamp: Date.now(),
      },
    });

    // Try injection first for modify_field strategy
    if (gap.canInject && gap.strategy === 'modify_field') {
      const result = await tryKeywordInjection(
        brief,
        gap,
        language,
        businessInfo,
        dispatch
      );

      if (result.success) {
        applyFieldUpdate(updates, gap.field, result.newValue!);
        modifiedFields.add(gap.field);
        fixedGaps.push(gap.checkId);
        keywordsInjectedCount += result.keywordsInjected;
        continue;
      }
    }

    // For create_if_missing strategy, generate minimal content
    if (gap.strategy === 'create_if_missing' && gap.requiresNewContent) {
      const result = await generateMinimalContent(
        brief,
        gap,
        language,
        businessInfo,
        dispatch
      );

      if (result.success) {
        applyFieldUpdate(updates, gap.field, result.newValue!);
        modifiedFields.add(gap.field);
        fixedGaps.push(gap.checkId);
        continue;
      }
    }

    // For add_to_outline strategy, check anti-bloat rules first
    if (
      gap.strategy === 'add_to_outline' &&
      mergedOptions.allowNewSections &&
      sectionsAddedCount < (mergedOptions.maxNewSections || ANTI_BLOAT_RULES.maxNewSections)
    ) {
      // Check if similar section already exists
      if (!hasSimilarSection(brief, gap)) {
        const result = await generateOutlineSection(
          brief,
          gap,
          language,
          businessInfo,
          dispatch
        );

        if (result.success && result.section) {
          if (!updates.structured_outline) {
            updates.structured_outline = [...(brief.structured_outline || [])];
          }
          (updates.structured_outline as BriefSection[]).push(result.section);
          sectionsAddedCount++;
          fixedGaps.push(gap.checkId);
          continue;
        }
      }
    }

    // For add_visual strategy
    if (gap.strategy === 'add_visual') {
      const result = generateVisualSemantic(brief, gap, language);
      if (result) {
        if (!updates.visual_semantics) {
          updates.visual_semantics = [...(brief.visual_semantics || [])];
        }
        (updates.visual_semantics as VisualSemantics[]).push(result);
        fixedGaps.push(gap.checkId);
        continue;
      }
    }

    // If we get here, gap couldn't be fixed
    unfixedGaps.push(gap.checkId);
  }

  // Generate summary
  const summary = generateSummary(fixedGaps, unfixedGaps, keywordsInjectedCount, sectionsAddedCount);

  // Estimate new score
  const fixedGapObjects = gapsToFix.filter(g => fixedGaps.includes(g.checkId));
  const scoreGain = fixedGapObjects.reduce((sum, g) => sum + g.potentialScoreImpact, 0);
  const estimatedNewScore = Math.min(100, pillarsResult.overall_score + scoreGain);

  dispatch({
    type: 'SET_NOTIFICATION',
    payload: `Optimization complete: ${fixedGaps.length} improvements made`,
  });

  return {
    updates,
    fixedGaps,
    unfixedGaps,
    summary,
    keywordsInjected: keywordsInjectedCount,
    sectionsAdded: sectionsAddedCount,
    estimatedNewScore,
  };
}

/**
 * Try keyword injection for a gap
 */
async function tryKeywordInjection(
  brief: ContentBrief,
  gap: ContentGap,
  language: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<{ success: boolean; newValue?: string; keywordsInjected: number }> {
  const currentValue = gap.currentValue;

  if (!currentValue || currentValue.length < 10 || gap.missingKeywords.length === 0) {
    return { success: false, keywordsInjected: 0 };
  }

  const result = await injectKeywordsIntoText(
    currentValue,
    gap.missingKeywords,
    language,
    businessInfo,
    dispatch,
    { maxKeywords: 3, maxLengthIncrease: 0.25 }
  );

  if (result.keywordsInjected.length > 0) {
    return {
      success: true,
      newValue: result.modifiedText,
      keywordsInjected: result.keywordsInjected.length,
    };
  }

  return { success: false, keywordsInjected: 0 };
}

/**
 * Generate minimal content for empty fields
 */
async function generateMinimalContent(
  brief: ContentBrief,
  gap: ContentGap,
  language: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<{ success: boolean; newValue?: string }> {
  // For CTA field
  if (gap.field === 'cta') {
    const ctaWords = getKeywordsForLanguage('cta', language);
    const benefitWords = getKeywordsForLanguage('benefit', language);
    // Generate simple CTA based on topic
    const cta = `${ctaWords[0]} ${brief.title?.split(' ').slice(0, 3).join(' ') || 'now'}`;
    return { success: true, newValue: cta };
  }

  // For hero image prompt
  if (gap.field === 'visuals.featuredImagePrompt') {
    const prompt = `Professional image showing ${brief.title || 'the service'} with modern, clean aesthetic. Include trust elements and clear visual hierarchy.`;
    return { success: true, newValue: prompt };
  }

  // For image alt text
  if (gap.field === 'visuals.imageAltText') {
    const altText = `${brief.title || 'Service'} - professional illustration`;
    return { success: true, newValue: altText };
  }

  return { success: false };
}

/**
 * Check if brief already has a section similar to what the gap needs
 */
function hasSimilarSection(brief: ContentBrief, gap: ContentGap): boolean {
  const sections = brief.structured_outline || [];
  const requirement = getRequirementById(gap.checkId);

  if (!requirement) return false;

  // Check for common commercial section patterns
  const commercialPatterns: Record<string, RegExp[]> = {
    m2: [/cta|contact|call.*action/i, /neem contact|bel|mail/i],
    m5: [/pricing|price|cost|prijs|kosten|tarief/i],
    v8: [/benefit|voordeel|advantage|why|waarom/i],
    v9: [/problem|challenge|probleem|uitdaging/i],
    c1: [/industry|market|sector|branche|markt/i],
    c8: [/method|process|how|hoe|aanpak/i],
    vis8: [/comparison|vergelijk|vs|versus/i],
  };

  const patterns = commercialPatterns[gap.checkId];
  if (!patterns) return false;

  return sections.some(s =>
    patterns.some(p => p.test(s.heading || ''))
  );
}

/**
 * Generate a single outline section for a gap
 */
async function generateOutlineSection(
  brief: ContentBrief,
  gap: ContentGap,
  language: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<{ success: boolean; section?: BriefSection }> {
  // Simple section generation based on gap type
  const sectionTemplates: Record<string, (topic: string, lang: string) => BriefSection> = {
    v8: (topic, lang) => ({
      key: `fix-v8-${Date.now()}`,
      heading: lang.toLowerCase().startsWith('nl') ? `Voordelen van ${topic}` : `Benefits of ${topic}`,
      level: 2,
      format_code: 'LISTING' as const,
      subordinate_text_hint: getKeywordsForLanguage('benefit', lang).slice(0, 3).join(', '),
      subsections: [],
    }),
    v9: (topic, lang) => ({
      key: `fix-v9-${Date.now()}`,
      heading: lang.toLowerCase().startsWith('nl') ? 'Veelvoorkomende uitdagingen' : 'Common challenges',
      level: 2,
      format_code: 'LISTING' as const,
      subordinate_text_hint: 'Problem landscape before solution',
      subsections: [],
    }),
    m5: (topic, lang) => ({
      key: `fix-m5-${Date.now()}`,
      heading: lang.toLowerCase().startsWith('nl') ? 'Prijzen en pakketten' : 'Pricing and packages',
      level: 2,
      format_code: 'TABLE' as const,
      subordinate_text_hint: getKeywordsForLanguage('pricing', lang).slice(0, 3).join(', '),
      subsections: [],
    }),
    c1: (topic, lang) => ({
      key: `fix-c1-${Date.now()}`,
      heading: lang.toLowerCase().startsWith('nl') ? `${topic} in de markt` : `${topic} in the market`,
      level: 2,
      format_code: 'PROSE' as const,
      subordinate_text_hint: getKeywordsForLanguage('industry', lang).slice(0, 3).join(', '),
      subsections: [],
    }),
  };

  const template = sectionTemplates[gap.checkId];
  if (!template) {
    return { success: false };
  }

  const topicTitle = brief.title?.split(' ').slice(0, 4).join(' ') || 'this service';
  const section = template(topicTitle, language);

  return { success: true, section };
}

/**
 * Generate visual semantic for a gap
 */
function generateVisualSemantic(
  brief: ContentBrief,
  gap: ContentGap,
  language: string
): VisualSemantics | null {
  const visualTemplates: Record<string, () => VisualSemantics> = {
    vis6: () => ({
      type: 'DIAGRAM' as const,
      description: `Product screenshot showing ${brief.title || 'the service'} in action`,
      caption_data: 'Product demonstration',
    }),
    vis9: () => ({
      type: 'INFOGRAPHIC' as const,
      description: 'Brand-consistent visual element',
      caption_data: 'Brand imagery',
    }),
  };

  const template = visualTemplates[gap.checkId];
  return template ? template() : null;
}

/**
 * Apply field update to the updates object
 */
function applyFieldUpdate(updates: Partial<ContentBrief>, field: string, value: string): void {
  if (field.startsWith('visuals.')) {
    const subField = field.replace('visuals.', '');
    if (!updates.visuals) {
      // Initialize with empty strings - will be filled in by specific updates
      updates.visuals = {
        featuredImagePrompt: '',
        imageAltText: '',
      };
    }
    (updates.visuals as Record<string, string>)[subField] = value;
  } else {
    (updates as Record<string, unknown>)[field] = value;
  }
}

/**
 * Generate summary of fixes
 */
function generateSummary(
  fixedGaps: string[],
  unfixedGaps: string[],
  keywordsInjected: number,
  sectionsAdded: number
): string {
  const parts: string[] = [];

  if (fixedGaps.length > 0) {
    parts.push(`Fixed ${fixedGaps.length} issues`);
  }

  if (keywordsInjected > 0) {
    parts.push(`${keywordsInjected} keywords injected into existing content`);
  }

  if (sectionsAdded > 0) {
    parts.push(`${sectionsAdded} new section${sectionsAdded > 1 ? 's' : ''} added`);
  }

  if (unfixedGaps.length > 0) {
    parts.push(`${unfixedGaps.length} issues need manual attention`);
  }

  return parts.join('. ') + '.';
}

/**
 * Apply fix results to a content brief
 * Returns a new brief with fixes applied
 */
export function applyMinimalFixes(
  brief: ContentBrief,
  fixResult: MinimalFixResult
): ContentBrief {
  return {
    ...brief,
    ...fixResult.updates,
    // Merge arrays properly
    structured_outline: fixResult.updates.structured_outline || brief.structured_outline,
    visual_semantics: fixResult.updates.visual_semantics || brief.visual_semantics,
    // Merge visuals object
    visuals: {
      ...brief.visuals,
      ...fixResult.updates.visuals,
    },
  };
}
