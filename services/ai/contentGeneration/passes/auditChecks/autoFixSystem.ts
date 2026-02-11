/**
 * Auto-Fix System
 *
 * Maps audit rules to issue types and severities,
 * converts rule results to audit issues, and provides
 * AI-powered auto-fix generation and application.
 *
 * @module services/ai/contentGeneration/passes/auditChecks/autoFixSystem
 */

import { ContentBrief, BusinessInfo, AuditRuleResult, AuditIssue, AuditIssueType } from '../../../../../types';
import { v4 as uuidv4 } from 'uuid';
import { dispatchToProvider } from '../../../providerDispatcher';
import * as geminiService from '../../../../geminiService';
import * as openAiService from '../../../../openAiService';
import * as anthropicService from '../../../../anthropicService';
import * as perplexityService from '../../../../perplexityService';
import * as openRouterService from '../../../../openRouterService';

// ============================================================================
// Provider Helper
// ============================================================================

// No-op dispatch for standalone calls
const noOpDispatch = () => {};

async function callProviderWithPrompt(
  info: BusinessInfo,
  prompt: string
): Promise<string> {
  return dispatchToProvider(info, {
    gemini: () => geminiService.generateText(prompt, info, noOpDispatch),
    openai: () => openAiService.generateText(prompt, info, noOpDispatch),
    anthropic: () => anthropicService.generateText(prompt, info, noOpDispatch),
    perplexity: () => perplexityService.generateText(prompt, info, noOpDispatch),
    openrouter: () => openRouterService.generateText(prompt, info, noOpDispatch),
  });
}

// ============================================================================
// Rule-to-Issue Mappings
// ============================================================================

/**
 * Maps audit rule names to AuditIssueType enum values
 */
const RULE_TO_ISSUE_TYPE: Record<string, AuditIssueType> = {
  'Modality Certainty': 'poor_flow',
  'Stop Word Removal': 'poor_flow',
  'Subject Positioning': 'poor_flow',
  'Heading Hierarchy': 'header_hierarchy_jump',
  'Generic Headings': 'weak_intro',
  'Passive Voice': 'poor_flow',
  'Heading-Entity Alignment': 'missing_eav_coverage',
  'Future Tense for Facts': 'poor_flow',
  'Stop Word Density': 'poor_flow',
  'List Count Specificity': 'no_lists',
  'Explicit Naming (Pronoun Density)': 'poor_flow',
  'Link Positioning': 'broken_link',
  'First Sentence Precision': 'weak_intro',
  'Centerpiece Annotation': 'weak_intro',
  'Repetitive Language': 'poor_flow',
  'LLM Phrase Detection': 'poor_flow',
  'Vocabulary Richness': 'poor_flow',
  'Content Coverage Weight': 'section_too_long',
  'Predicate Consistency': 'poor_flow',
  'Macro/Micro Border': 'missing_transition',
  'Extractive Summary Alignment': 'weak_intro',
  'Query-Format Alignment': 'no_lists',
  'Anchor Text Variety': 'broken_link',
  'Annotation Text Quality': 'broken_link',
  'Supplementary Link Placement': 'broken_link',
  'Prose/Structured Balance': 'no_lists',
  'List Definition Sentences': 'no_lists',
  'Table Appropriateness': 'no_lists',
  'Image Placement': 'missing_image',
  'Sentence Length': 'poor_flow',
  'EAV Density': 'missing_eav_coverage',
  'Template Format Compliance': 'poor_flow',
  'Template Section Coverage': 'missing_eav_coverage',
  'Content Zone Balance': 'section_too_long'
};

/**
 * Severity mapping based on rule impact
 */
const RULE_SEVERITY: Record<string, 'critical' | 'warning' | 'suggestion'> = {
  'Modality Certainty': 'suggestion',
  'Stop Word Removal': 'suggestion',
  'Subject Positioning': 'warning',
  'Heading Hierarchy': 'critical',
  'Generic Headings': 'warning',
  'Passive Voice': 'suggestion',
  'Heading-Entity Alignment': 'warning',
  'Future Tense for Facts': 'suggestion',
  'Stop Word Density': 'suggestion',
  'List Count Specificity': 'suggestion',
  'Explicit Naming (Pronoun Density)': 'warning',
  'Link Positioning': 'warning',
  'First Sentence Precision': 'warning',
  'Centerpiece Annotation': 'critical',
  'Repetitive Language': 'suggestion',
  'LLM Phrase Detection': 'critical',
  'Vocabulary Richness': 'warning',
  'Content Coverage Weight': 'warning',
  'Predicate Consistency': 'warning',
  'Macro/Micro Border': 'suggestion',
  'Extractive Summary Alignment': 'warning',
  'Query-Format Alignment': 'warning',
  'Anchor Text Variety': 'suggestion',
  'Annotation Text Quality': 'warning',
  'Supplementary Link Placement': 'suggestion',
  'Prose/Structured Balance': 'warning',
  'List Definition Sentences': 'warning',
  'Table Appropriateness': 'suggestion',
  'Image Placement': 'critical',
  'Sentence Length': 'warning',
  'EAV Density': 'warning',
  'Template Format Compliance': 'suggestion',
  'Template Section Coverage': 'warning',
  'Content Zone Balance': 'suggestion'
};

// ============================================================================
// Conversion
// ============================================================================

/**
 * Convert AuditRuleResult array to AuditIssue array
 */
export function convertToAuditIssues(ruleResults: AuditRuleResult[]): AuditIssue[] {
  return ruleResults
    .filter(r => !r.isPassing)
    .map(r => ({
      id: uuidv4(),
      type: RULE_TO_ISSUE_TYPE[r.ruleName] || 'poor_flow',
      severity: RULE_SEVERITY[r.ruleName] || 'suggestion',
      description: r.details,
      currentContent: r.affectedTextSnippet,
      suggestedFix: r.remediation,
      autoFixable: true,
      fixApplied: false
    }));
}

// ============================================================================
// Auto-Fix Context
// ============================================================================

/**
 * Interface for auto-fix context
 */
export interface AutoFixContext {
  draft: string;
  brief: ContentBrief;
  businessInfo: BusinessInfo;
  issue: AuditIssue;
}

// ============================================================================
// Auto-Fix Generation
// ============================================================================

/**
 * Generate an auto-fix for a specific audit issue using AI
 */
export async function generateAutoFix(ctx: AutoFixContext): Promise<string> {
  // Build context-aware prompt based on issue type
  const prompt = buildAutoFixPrompt(ctx);

  try {
    const response = await callProviderWithPrompt(ctx.businessInfo, prompt);
    return response.trim();
  } catch (error) {
    console.error('[AutoFix] Failed to generate fix:', error);
    return '';
  }
}

/**
 * Build the AI prompt for generating an auto-fix
 */
function buildAutoFixPrompt(ctx: AutoFixContext): string {
  const { draft, brief, issue } = ctx;

  // Extract relevant section if affected text is provided
  const contextSnippet = issue.currentContent
    ? extractContextAroundText(draft, issue.currentContent, 300)
    : draft.substring(0, 1000);

  const basePrompt = `You are a Holistic SEO editor fixing a content issue.

## Issue to Fix
**Type:** ${issue.type}
**Description:** ${issue.description}
**Current Content:** ${issue.currentContent || 'See context below'}
**Original Remediation Suggestion:** ${issue.suggestedFix || 'Not specified'}

## Article Context
**Title:** ${brief.title}
**Target Keyword:** ${brief.targetKeyword}

## Content Snippet (for context)
${contextSnippet}

## Your Task
Provide a corrected version of the problematic content. Follow the remediation suggestion precisely.

**CRITICAL RULES:**
1. Only output the fixed content, no explanations
2. Preserve all existing structure (headings, lists, images)
3. Keep the same language as the original
4. Maintain the same approximate length
5. Do NOT add generic phrases like "In conclusion" or "It's important to note"

**OUTPUT:** Return ONLY the corrected text snippet that replaces the problematic content.`;

  // Add type-specific instructions
  const typeSpecificInstructions = getTypeSpecificInstructions(issue.type);

  return basePrompt + (typeSpecificInstructions ? `\n\n## Type-Specific Instructions\n${typeSpecificInstructions}` : '');
}

/**
 * Get type-specific instructions for the auto-fix prompt
 */
function getTypeSpecificInstructions(issueType: AuditIssueType): string {
  const instructions: Record<AuditIssueType, string> = {
    missing_h1: 'Generate an SEO-optimized H1 heading using the target keyword. Format: # [Heading Text]',
    duplicate_h2: 'Provide a unique variation of the heading that maintains the same meaning but uses different words.',
    missing_image: 'Insert an image placeholder in format: [IMAGE: description | alt="vocabulary-extending alt text"]',
    broken_link: 'Either fix the link anchor text to be more descriptive, or suggest removing the link entirely.',
    section_too_short: 'Expand the section with relevant, factual content. Add specific examples, data, or explanations.',
    section_too_long: 'Identify a logical split point and suggest how to divide this section into two separate sections.',
    missing_conclusion: 'Write a conclusion paragraph that summarizes the key points without using generic phrases.',
    weak_intro: 'Rewrite the introduction to include a clear definition and preview of what the article covers.',
    missing_eav_coverage: 'Insert 2-3 sentences that naturally incorporate the missing entity/attribute.',
    no_lists: 'Convert the prose into a properly formatted list with a definition sentence ending in ":".',
    missing_transition: 'Add a transitional phrase or sentence that bridges the two sections.',
    header_hierarchy_jump: 'Fix the heading level to maintain proper hierarchy (H1 -> H2 -> H3).',
    poor_flow: 'Rewrite the sentence(s) to improve clarity, remove filler words, and use active voice.',
    weak_conclusion: 'Strengthen the conclusion to summarize key takeaways without generic phrases.'
  };

  return instructions[issueType] || '';
}

/**
 * Extract context around a specific text snippet in the draft
 */
function extractContextAroundText(draft: string, text: string, contextLength: number): string {
  const lowerDraft = draft.toLowerCase();
  const lowerText = text.toLowerCase();

  const index = lowerDraft.indexOf(lowerText);

  if (index === -1) {
    // Text not found, return start of draft
    return draft.substring(0, contextLength * 2);
  }

  const start = Math.max(0, index - contextLength);
  const end = Math.min(draft.length, index + text.length + contextLength);

  return (start > 0 ? '...' : '') + draft.substring(start, end) + (end < draft.length ? '...' : '');
}

// ============================================================================
// Auto-Fix Application
// ============================================================================

/**
 * Apply an auto-fix to the draft content
 * Returns the updated draft with the fix applied
 */
export function applyAutoFix(
  draft: string,
  issue: AuditIssue,
  fixContent: string
): { updatedDraft: string; success: boolean; message: string } {
  if (!fixContent || !fixContent.trim()) {
    return { updatedDraft: draft, success: false, message: 'No fix content provided' };
  }

  // If we have affected text snippet, try to replace it
  if (issue.currentContent && issue.currentContent.length > 10) {
    // Try exact match first
    if (draft.includes(issue.currentContent)) {
      const updatedDraft = draft.replace(issue.currentContent, fixContent);
      return { updatedDraft, success: true, message: 'Fix applied via exact match' };
    }

    // Try case-insensitive match
    const regex = new RegExp(
      issue.currentContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
    if (regex.test(draft)) {
      const updatedDraft = draft.replace(regex, fixContent);
      return { updatedDraft, success: true, message: 'Fix applied via case-insensitive match' };
    }

    return {
      updatedDraft: draft,
      success: false,
      message: 'Could not locate the affected text in the draft. Manual fix required.'
    };
  }

  // For issues without specific affected text (like missing_h1), append or prepend
  switch (issue.type) {
    case 'missing_h1':
      // Add H1 at the start if missing
      if (!draft.match(/^#\s+[^\n]+/m)) {
        const updatedDraft = fixContent + '\n\n' + draft;
        return { updatedDraft, success: true, message: 'H1 heading added at start' };
      }
      break;

    case 'missing_conclusion': {
      // Add conclusion at the end
      const updatedDraft = draft + '\n\n' + fixContent;
      return { updatedDraft, success: true, message: 'Conclusion added at end' };
    }

    case 'missing_image': {
      // Insert after first paragraph
      const paragraphEnd = draft.indexOf('\n\n');
      if (paragraphEnd > 0) {
        const beforeParagraph = draft.substring(0, paragraphEnd);
        const afterParagraph = draft.substring(paragraphEnd);
        const updatedWithImage = beforeParagraph + '\n\n' + fixContent + afterParagraph;
        return { updatedDraft: updatedWithImage, success: true, message: 'Image placeholder inserted' };
      }
      break;
    }
  }

  return {
    updatedDraft: draft,
    success: false,
    message: 'Fix type requires manual intervention'
  };
}

// ============================================================================
// Batch Auto-Fix
// ============================================================================

/**
 * Batch apply multiple auto-fixes to the draft
 * Applies fixes in order of severity (critical first)
 */
export async function batchApplyAutoFixes(
  draft: string,
  issues: AuditIssue[],
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onProgress?: (completed: number, total: number) => void
): Promise<{ updatedDraft: string; appliedFixes: string[]; failedFixes: string[] }> {
  // Sort by severity: critical > warning > suggestion
  const sortedIssues = [...issues].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, suggestion: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  let currentDraft = draft;
  const appliedFixes: string[] = [];
  const failedFixes: string[] = [];

  for (let i = 0; i < sortedIssues.length; i++) {
    const issue = sortedIssues[i];

    try {
      // Generate fix
      const fixContent = await generateAutoFix({
        draft: currentDraft,
        brief,
        businessInfo,
        issue
      });

      if (fixContent) {
        // Apply fix
        const result = applyAutoFix(currentDraft, issue, fixContent);

        if (result.success) {
          currentDraft = result.updatedDraft;
          appliedFixes.push(`${issue.type}: ${result.message}`);
          issue.fixApplied = true;
          issue.suggestedFix = fixContent;
        } else {
          failedFixes.push(`${issue.type}: ${result.message}`);
        }
      } else {
        failedFixes.push(`${issue.type}: Failed to generate fix`);
      }
    } catch (error) {
      failedFixes.push(`${issue.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, sortedIssues.length);
    }
  }

  return { updatedDraft: currentDraft, appliedFixes, failedFixes };
}
