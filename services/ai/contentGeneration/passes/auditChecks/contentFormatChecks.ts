/**
 * Phase D: Content Format Balance Checks (26-32)
 *
 * Checks for prose/structured balance, list definition sentences,
 * table appropriateness, image placement, sentence length,
 * EAV density, and internal link insertion.
 *
 * @module services/ai/contentGeneration/passes/auditChecks/contentFormatChecks
 */

import { ContentBrief, AuditRuleResult, SemanticTriple } from '../../../../../types';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';
import { EAVDensityValidator } from '../../rulesEngine/validators/eavDensity';
import { validateLinkInsertion } from '../../rulesEngine/validators/linkInsertionValidator';

// ============================================================================
// Content Format Analysis Helper
// ============================================================================

/**
 * Analyze content format distribution (prose vs structured content).
 */
function analyzeContentFormats(draft: string): {
  proseChars: number;
  structuredChars: number;
  prosePercentage: number;
  listCount: number;
  tableCount: number;
} {
  if (!draft) {
    return { proseChars: 0, structuredChars: 0, prosePercentage: 1, listCount: 0, tableCount: 0 };
  }

  let structuredContent = '';
  let workingDraft = draft;

  // Count and extract lists
  const unorderedLists = draft.match(/(?:^|\n)[-*]\s+.+(?:\n[-*]\s+.+)*/gm) || [];
  const orderedLists = draft.match(/(?:^|\n)\d+\.\s+.+(?:\n\d+\.\s+.+)*/gm) || [];
  const listCount = unorderedLists.length + orderedLists.length;

  // Count and extract tables
  const tables = draft.match(/\|.+\|[\s\S]*?\|[-:|\s]+\|[\s\S]*?(?=\n[^|]|\n\n|$)/gm) || [];
  const tableCount = tables.length;

  // Calculate structured content size
  unorderedLists.forEach(l => structuredContent += l);
  orderedLists.forEach(l => structuredContent += l);
  tables.forEach(t => structuredContent += t);

  // Remove structured content from draft to get prose
  [...unorderedLists, ...orderedLists, ...tables].forEach(s => {
    workingDraft = workingDraft.replace(s, '');
  });

  const structuredChars = structuredContent.length;
  const proseChars = workingDraft.trim().length;
  const totalChars = proseChars + structuredChars;
  const prosePercentage = totalChars > 0 ? proseChars / totalChars : 1;

  return { proseChars, structuredChars, prosePercentage, listCount, tableCount };
}

// ============================================================================
// Check 26: Prose/Structured Content Balance (Baker Principle)
// ============================================================================

/**
 * Target: 60-80% prose content
 */
export function checkProseStructuredBalance(draft: string): AuditRuleResult {
  const stats = analyzeContentFormats(draft);
  const percentage = stats.prosePercentage * 100;

  // Target range: 60-80% prose
  if (percentage < 60) {
    return {
      ruleName: 'Prose/Structured Balance',
      isPassing: false,
      details: `${percentage.toFixed(0)}% prose content (too structured). Target: 60-80%`,
      remediation: 'Add more explanatory paragraphs. The content is too list/table heavy.'
    };
  }

  if (percentage > 80) {
    return {
      ruleName: 'Prose/Structured Balance',
      isPassing: false,
      details: `${percentage.toFixed(0)}% prose content (needs more structure). Target: 60-80%`,
      remediation: 'Add lists or tables where content enumerates multiple items.'
    };
  }

  return {
    ruleName: 'Prose/Structured Balance',
    isPassing: true,
    details: `${percentage.toFixed(0)}% prose content (optimal range: 60-80%)`
  };
}

// ============================================================================
// Check 27: List Definition Sentences
// ============================================================================

/**
 * Every list must be preceded by a definition sentence ending with ":"
 */
export function checkListDefinitionSentences(draft: string): AuditRuleResult {
  // Find all lists
  const listPattern = /(?:^|\n)([-*]\s+.+(?:\n[-*]\s+.+)*)/gm;
  const orderedPattern = /(?:^|\n)(\d+\.\s+.+(?:\n\d+\.\s+.+)*)/gm;

  let violations = 0;
  const violationExamples: string[] = [];

  // Helper to check if text ends with a definition sentence (colon before list)
  const hasDefinitionSentenceBeforeList = (textBefore: string): boolean => {
    // First, check if the whole textBefore ends with ":"
    if (/:[\s]*\n?$/.test(textBefore.trim())) {
      return true;
    }
    // Use sentence tokenizer to get proper sentences, then check if any trailing
    // text after the last sentence ends with ":"
    const sentences = splitSentences(textBefore);
    if (sentences.length === 0) {
      // No complete sentences, check if the raw text ends with ":"
      return /:[\s\n]*$/.test(textBefore);
    }
    // Get the last sentence and any trailing text after it
    const lastSentence = sentences[sentences.length - 1];
    const lastSentenceEnd = textBefore.lastIndexOf(lastSentence) + lastSentence.length;
    const trailingText = textBefore.substring(lastSentenceEnd);
    // Check if trailing text (after last complete sentence) ends with ":"
    return /:[\s\n]*$/.test(trailingText) || /:[\s\n]*$/.test(lastSentence);
  };

  // Check unordered lists
  let match;
  while ((match = listPattern.exec(draft)) !== null) {
    const listStart = match.index;
    // Get 200 chars before the list
    const textBefore = draft.substring(Math.max(0, listStart - 200), listStart);

    if (!hasDefinitionSentenceBeforeList(textBefore)) {
      violations++;
      const firstListItem = match[1].split('\n')[0].substring(0, 30);
      if (violationExamples.length < 2) {
        violationExamples.push(`"${firstListItem}..."`);
      }
    }
  }

  // Check ordered lists
  while ((match = orderedPattern.exec(draft)) !== null) {
    const listStart = match.index;
    const textBefore = draft.substring(Math.max(0, listStart - 200), listStart);

    if (!hasDefinitionSentenceBeforeList(textBefore)) {
      violations++;
      const firstListItem = match[1].split('\n')[0].substring(0, 30);
      if (violationExamples.length < 2) {
        violationExamples.push(`"${firstListItem}..."`);
      }
    }
  }

  if (violations > 0) {
    return {
      ruleName: 'List Definition Sentences',
      isPassing: false,
      details: `${violations} list(s) missing definition sentence before them`,
      affectedTextSnippet: violationExamples.join(', '),
      remediation: 'Add a sentence ending with ":" before each list. Example: "The main benefits include:"'
    };
  }

  return {
    ruleName: 'List Definition Sentences',
    isPassing: true,
    details: 'All lists preceded by proper definition sentences'
  };
}

// ============================================================================
// Check 28: Table Appropriateness
// ============================================================================

/**
 * Tables should have 2+ entities and 2+ attributes (not just 2 columns)
 */
export function checkTableAppropriateness(draft: string): AuditRuleResult {
  // Find markdown tables
  const tablePattern = /\|(.+)\|[\s\S]*?\|[-:|\s]+\|([\s\S]*?)(?=\n[^|]|\n\n|$)/gm;

  const violations: string[] = [];

  let match;
  while ((match = tablePattern.exec(draft)) !== null) {
    const headerRow = match[1];
    const headerCells = headerRow.split('|').filter(c => c.trim());

    // A proper table should have at least 3 columns (entity + 2 attributes)
    if (headerCells.length <= 2) {
      const firstCell = headerCells[0]?.trim().substring(0, 20) || 'Unknown';
      violations.push(`Table "${firstCell}..." has only ${headerCells.length} columns`);
    }
  }

  if (violations.length > 0) {
    return {
      ruleName: 'Table Appropriateness',
      isPassing: false,
      details: `${violations.length} table(s) have only 2 columns (should use list instead)`,
      affectedTextSnippet: violations[0],
      remediation: 'Two-column tables should be converted to lists. Tables are for comparing 2+ entities with 2+ attributes.'
    };
  }

  return {
    ruleName: 'Table Appropriateness',
    isPassing: true,
    details: 'All tables have appropriate structure (3+ columns)'
  };
}

// ============================================================================
// Check 29: Image Placement
// ============================================================================

/**
 * Images should NOT appear between a heading and the first paragraph
 */
export function checkImagePlacement(draft: string): AuditRuleResult {
  // Pattern: heading immediately followed by image (with possible whitespace)
  const badPlacementPattern = /^(#{2,6}\s+[^\n]+)\n\n?\s*(\[IMAGE:|!\[)/gm;

  const violations: string[] = [];

  let match;
  while ((match = badPlacementPattern.exec(draft)) !== null) {
    const heading = match[1].replace(/^#+\s*/, '').substring(0, 30);
    violations.push(`Image after "${heading}..."`);
  }

  if (violations.length > 0) {
    return {
      ruleName: 'Image Placement',
      isPassing: false,
      details: `${violations.length} image(s) placed between heading and first paragraph`,
      affectedTextSnippet: violations[0],
      remediation: 'Move images AFTER the first paragraph. Pattern: Heading -> Answer Paragraph -> Image'
    };
  }

  return {
    ruleName: 'Image Placement',
    isPassing: true,
    details: 'All images placed correctly after answer paragraphs'
  };
}

// ============================================================================
// Check 30: Sentence Length
// ============================================================================

/**
 * Sentences should be under 30 words for optimal NLP processing
 * Semantic SEO framework requirement
 *
 * Note: The language parameter is accepted for consistency with other audit checks
 * and could be used for language-specific thresholds (e.g., German compound words
 * naturally create longer sentences). Currently uses universal 30-word threshold.
 */
export function checkSentenceLength(text: string, language?: string): AuditRuleResult {
  const sentences = splitSentences(text);
  return checkSentenceLengthCached(sentences, language);
}

// PERFORMANCE: Cached version that takes pre-computed sentences
export function checkSentenceLengthCached(sentences: string[], language?: string): AuditRuleResult {
  // Language parameter available for future language-specific thresholds
  void language;

  const threshold = 30; // Universal threshold - could vary by language in future

  const longSentences = sentences.filter(sentence => {
    const wordCount = sentence.split(/\s+/).filter(w => w.length > 0).length;
    return wordCount > threshold;
  });

  if (longSentences.length > 2) {
    return {
      ruleName: 'Sentence Length',
      isPassing: false,
      details: `${longSentences.length} sentences exceed ${threshold} words. Long sentences reduce readability and NLP accuracy.`,
      remediation: 'Break long sentences into shorter ones (under 30 words each).',
      score: Math.max(0, 100 - (longSentences.length * 15)),
    };
  }

  if (longSentences.length > 0) {
    return {
      ruleName: 'Sentence Length',
      isPassing: true, // Pass with warning
      details: `${longSentences.length} sentence(s) exceed ${threshold} words - acceptable but could be improved.`,
      score: 100 - (longSentences.length * 10),
    };
  }

  return {
    ruleName: 'Sentence Length',
    isPassing: true,
    details: 'All sentences are within recommended length.',
    score: 100,
  };
}

// ============================================================================
// Check 31: EAV Density
// ============================================================================

/**
 * Validates Entity-Attribute-Value density using the proper EAV validator
 * This is a core Semantic SEO requirement measuring factual content density
 *
 * @param text - The content to analyze
 * @param eavs - Optional EAV triples for term-based density calculation
 * @param language - Optional language code for multilingual EAV pattern matching
 */
export async function checkEavDensity(text: string, eavs: SemanticTriple[] | undefined, language?: string): Promise<AuditRuleResult> {
  // Calculate pattern-based density (sentences with EAV structure)
  const patternDensity = await EAVDensityValidator.calculateDensity(text, language);

  // Calculate term density if EAVs provided
  let termDensity = 0;
  if (eavs && eavs.length > 0) {
    termDensity = EAVDensityValidator.calculateTermDensity(text, eavs);
  }

  return buildEavDensityResult(patternDensity, termDensity, eavs);
}

// PERFORMANCE: Cached version that takes pre-computed sentences
// Now async because calculateDensityCached yields to prevent browser freeze
export async function checkEavDensityCached(sentences: string[], text: string, eavs: SemanticTriple[] | undefined, language?: string): Promise<AuditRuleResult> {
  // Calculate pattern-based density using cached sentences
  const patternDensity = await EAVDensityValidator.calculateDensityCached(sentences, language);

  // Calculate term density if EAVs provided (this doesn't use sentences)
  let termDensity = 0;
  if (eavs && eavs.length > 0) {
    termDensity = EAVDensityValidator.calculateTermDensity(text, eavs);
  }

  return buildEavDensityResult(patternDensity, termDensity, eavs);
}

// Helper to build the EAV density result
function buildEavDensityResult(patternDensity: number, termDensity: number, eavs: SemanticTriple[] | undefined): AuditRuleResult {
  // Combined score (weight pattern density higher)
  const combinedScore = eavs && eavs.length > 0
    ? Math.round(patternDensity * 0.6 + termDensity * 0.4)
    : patternDensity;

  if (combinedScore < 30) {
    return {
      ruleName: 'EAV Density',
      isPassing: false,
      details: `EAV density is ${combinedScore}% - content lacks factual substance. Pattern density: ${patternDensity}%, Term density: ${termDensity}%.`,
      remediation: 'Add more Entity-Attribute-Value statements (e.g., "X is Y", "X has Z").',
      score: combinedScore,
    };
  }

  if (combinedScore < 50) {
    return {
      ruleName: 'EAV Density',
      isPassing: true,
      details: `EAV density is ${combinedScore}% - acceptable but could be improved. Pattern density: ${patternDensity}%, Term density: ${termDensity}%.`,
      score: combinedScore,
    };
  }

  return {
    ruleName: 'EAV Density',
    isPassing: true,
    details: `EAV density is ${combinedScore}% - good factual content. Pattern density: ${patternDensity}%, Term density: ${termDensity}%.`,
    score: combinedScore,
  };
}

// ============================================================================
// Check 32: Internal Link Insertion
// ============================================================================

/**
 * Verifies that contextual bridge links from the brief were inserted into the content.
 * Critical for SEO - internal links build topical authority and PageRank flow.
 */
export function checkInternalLinkInsertion(draft: string, brief: ContentBrief): AuditRuleResult {
  const result = validateLinkInsertion(draft, brief);

  // No expected links - pass by default
  if (result.expectedCount === 0) {
    return {
      ruleName: 'Internal Link Insertion',
      isPassing: true,
      details: 'No contextual bridge links specified in brief.',
      score: 100,
    };
  }

  // All links inserted - excellent
  if (result.insertionRate === 100) {
    return {
      ruleName: 'Internal Link Insertion',
      isPassing: true,
      details: `All ${result.expectedCount} internal links successfully inserted.`,
      score: 100,
    };
  }

  // Partial insertion - check threshold
  if (result.passed) {
    // At least 50% inserted
    return {
      ruleName: 'Internal Link Insertion',
      isPassing: true,
      details: `${result.foundCount}/${result.expectedCount} internal links inserted (${result.insertionRate}%). Missing: ${result.missingLinks.map(l => l.anchorText).slice(0, 3).join(', ')}.`,
      score: result.insertionRate,
    };
  }

  // Below threshold - failing
  const missingAnchors = result.missingLinks.map(l => `"${l.anchorText}"`).slice(0, 5).join(', ');
  return {
    ruleName: 'Internal Link Insertion',
    isPassing: false,
    details: `Only ${result.foundCount}/${result.expectedCount} internal links inserted (${result.insertionRate}%).`,
    affectedTextSnippet: missingAnchors,
    remediation: 'Add missing internal links inline or include a "Related Topics" section at the end.',
    score: result.insertionRate,
  };
}
