/**
 * Context Analyzer Service
 *
 * Analyzes selected text against full article context, business info,
 * and EAV facts to detect issues and provide suggestions.
 */

import { BusinessInfo, ContentBrief, SemanticTriple } from '../../../types';
import {
  ContextAnalysis,
  ContextIssue,
  ContextSuggestion,
  SemanticContext,
  IssueType,
  IssueSeverity,
} from '../../../types/contextualEditor';

// Fluff words from algorithmic authorship rules
const FLUFF_WORDS = [
  'actually', 'basically', 'really', 'very', 'quite', 'rather', 'somewhat',
  'overall', 'in conclusion', 'as stated before', 'it goes without saying',
  'needless to say', 'at the end of the day', 'in my opinion',
  'i had the pleasure of', 'it is important to note that',
];

// Generic AI phrases to avoid
const AI_PHRASES = [
  'in today\'s world', 'it\'s important to note', 'firstly', 'secondly',
  'furthermore', 'moreover', 'in this article', 'as we all know',
];

/**
 * Extract normalized service names from business info
 */
export function extractServicesFromBusinessInfo(businessInfo: BusinessInfo): string[] {
  if (!businessInfo?.offerings || !Array.isArray(businessInfo.offerings)) {
    return [];
  }
  return businessInfo.offerings.map(s => s.toLowerCase().trim());
}

/**
 * Find potential contradictions or issues in selected text
 */
export function findContradictions(
  selectedText: string,
  fullArticle: string,
  knownServices: string[]
): ContextIssue[] {
  const issues: ContextIssue[] = [];
  const lowerText = selectedText.toLowerCase();

  // Check for service mentions not in known services
  const serviceKeywords = ['service', 'offer', 'provide', 'specialize'];
  const hasServiceMention = serviceKeywords.some(kw => lowerText.includes(kw));

  if (hasServiceMention && knownServices.length > 0) {
    const words = lowerText.split(/\s+/);
    const potentialServices = words.filter(w =>
      w.length > 4 && !serviceKeywords.includes(w)
    );

    for (const potential of potentialServices) {
      const matchesKnown = knownServices.some(known =>
        known.includes(potential) || potential.includes(known.split(' ')[0])
      );
      if (!matchesKnown && potential.length > 5) {
        const looksLikeService = /removal|cleaning|installation|repair|maintenance|consulting/i.test(potential);
        if (looksLikeService) {
          issues.push({
            type: 'missing_service',
            description: `Mentions "${potential}" which may not be in your service offerings`,
            severity: 'warning',
            suggestedFix: 'Verify this service is offered or remove the mention',
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Check for SEO violations based on algorithmic authorship rules
 */
export function checkSeoViolations(text: string): ContextIssue[] {
  const issues: ContextIssue[] = [];
  const lowerText = text.toLowerCase();

  // Check for fluff words
  for (const fluff of FLUFF_WORDS) {
    if (lowerText.includes(fluff)) {
      issues.push({
        type: 'seo_violation',
        description: `Contains fluff phrase "${fluff}" - reduces information density`,
        severity: 'suggestion',
        suggestedFix: `Remove "${fluff}" and state the fact directly`,
      });
    }
  }

  // Check for generic AI phrases
  for (const phrase of AI_PHRASES) {
    if (lowerText.includes(phrase)) {
      issues.push({
        type: 'seo_violation',
        description: `Contains generic AI phrase "${phrase}"`,
        severity: 'warning',
        suggestedFix: 'Rephrase to be more specific and natural',
      });
    }
  }

  // Check sentence length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  for (const sentence of sentences) {
    const wordCount = sentence.trim().split(/\s+/).length;
    if (wordCount > 30) {
      issues.push({
        type: 'readability',
        description: `Sentence has ${wordCount} words (max recommended: 30)`,
        severity: 'suggestion',
        suggestedFix: 'Split into shorter sentences with clear S-P-O structure',
      });
    }
  }

  return issues;
}

/**
 * Find relevant EAVs that apply to the selected text
 */
export function findRelevantEavs(
  selectedText: string,
  eavs: SemanticTriple[]
): SemanticTriple[] {
  if (!eavs || eavs.length === 0) return [];

  const lowerText = selectedText.toLowerCase();

  return eavs.filter(eav => {
    const entityMatch = eav.entity && lowerText.includes(eav.entity.toLowerCase());
    const valueMatch = eav.value && lowerText.includes(String(eav.value).toLowerCase());
    return entityMatch || valueMatch;
  });
}

/**
 * Generate smart suggestions based on detected issues
 */
export function generateSuggestions(
  issues: ContextIssue[],
  selectedText: string
): ContextSuggestion[] {
  const suggestions: ContextSuggestion[] = [];

  const issuesByType = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as Record<IssueType, number>);

  if (issuesByType.readability > 0) {
    suggestions.push({
      action: 'simplify',
      description: 'Simplify for better readability (shorter sentences, clearer structure)',
      confidence: 0.8,
    });
  }

  if (issuesByType.seo_violation > 0) {
    suggestions.push({
      action: 'seo_optimize',
      description: 'Remove fluff words and optimize for search engines',
      confidence: 0.9,
    });
  }

  if (issuesByType.missing_service > 0) {
    suggestions.push({
      action: 'remove_service',
      description: 'Remove or correct service mentions not in your offerings',
      confidence: 0.7,
    });
  }

  return suggestions;
}

/**
 * Main analysis function - combines all checks
 */
export async function analyzeContext(params: {
  selectedText: string;
  fullArticle: string;
  businessInfo: BusinessInfo;
  brief: ContentBrief;
  eavs: SemanticTriple[];
}): Promise<ContextAnalysis> {
  const { selectedText, fullArticle, businessInfo, brief, eavs } = params;

  const knownServices = extractServicesFromBusinessInfo(businessInfo);
  const contradictionIssues = findContradictions(selectedText, fullArticle, knownServices);
  const seoIssues = checkSeoViolations(selectedText);
  const allIssues = [...contradictionIssues, ...seoIssues];
  const relevantEavs = findRelevantEavs(selectedText, eavs);
  const suggestions = generateSuggestions(allIssues, selectedText);

  const semanticContext: SemanticContext = {
    relatedSections: [],
    relevantEavs,
    mentionedServices: knownServices.filter(s =>
      selectedText.toLowerCase().includes(s)
    ),
  };

  return {
    issues: allIssues,
    suggestions,
    semanticContext,
    isLoading: false,
  };
}
