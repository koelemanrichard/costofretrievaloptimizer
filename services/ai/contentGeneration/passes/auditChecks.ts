// services/ai/contentGeneration/passes/auditChecks.ts
import { ContentBrief, BusinessInfo, AuditRuleResult, AuditIssue, AuditIssueType, SemanticTriple } from '../../../../types';
import { TemplateConfig } from '../../../../types/contentTemplates';
import { v4 as uuidv4 } from 'uuid';
import { splitSentences } from '../../../../utils/sentenceTokenizer';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';
import { dispatchToProvider } from '../../providerDispatcher';
import { getAuditPatterns } from './auditPatternsMultilingual';
import { EAVDensityValidator } from '../rulesEngine/validators/eavDensity';
import { validateLinkInsertion, extractContextualBridgeLinks } from '../rulesEngine/validators/linkInsertionValidator';
import { getTemplateByName } from '../../../../config/contentTemplates';

// No-op dispatch for standalone calls
const noOpDispatch = () => {};

// Helper to call AI based on provider
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

// Legacy constants - kept for backward compatibility but patterns now come from auditPatternsMultilingual.ts
// @deprecated Use getAuditPatterns(language) instead for multilingual support
const LLM_SIGNATURE_PHRASES = getAuditPatterns('en').llmSignaturePhrases;
const POSITIVE_PREDICATES = getAuditPatterns('en').positivePredicates;
const NEGATIVE_PREDICATES = getAuditPatterns('en').negativePredicates;
const INSTRUCTIONAL_PREDICATES = getAuditPatterns('en').instructionalPredicates;
const GENERIC_HEADINGS = getAuditPatterns('en').genericHeadings;
const PASSIVE_PATTERNS = getAuditPatterns('en').passivePatterns;
const FUTURE_TENSE_PATTERNS = getAuditPatterns('en').futureTensePatterns;
const STOP_WORDS_FULL = getAuditPatterns('en').stopWordsFull;

/**
 * Yield to main thread to prevent browser freeze during long-running operations.
 * Uses setTimeout(0) which works reliably in both foreground and background tabs.
 */
const yieldToMainThread = (): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

/**
 * Run algorithmic audit checks on the draft content
 * @param draft - The content to audit
 * @param brief - The content brief
 * @param info - Business information
 * @param language - ISO language code (e.g., 'nl', 'en', 'de', 'fr', 'es') for multilingual pattern matching
 * @param eavs - Optional SemanticTriple array for EAV density validation
 * @param template - Optional TemplateConfig for template compliance validation
 *
 * NOTE: This function is async and yields to the main thread periodically
 * to prevent browser freezing during the 30+ audit checks.
 */
export async function runAlgorithmicAudit(
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo,
  language?: string,
  eavs?: SemanticTriple[],
  template?: TemplateConfig
): Promise<AuditRuleResult[]> {
  const results: AuditRuleResult[] = [];
  // Get language-specific patterns
  const patterns = getAuditPatterns(language || 'en');

  // DEBUG: Track timing of audit checks
  const startTime = performance.now();
  console.log(`[Audit] Starting audit of ${draft.length} chars...`);

  // PERFORMANCE: Pre-compute sentences once (splitSentences is expensive - 50+ regex ops)
  // This avoids calling splitSentences 4+ times during the audit
  const cachedSentences = splitSentences(draft);
  console.log(`[Audit] Pre-computed ${cachedSentences.length} sentences: ${(performance.now() - startTime).toFixed(0)}ms`);

  // Phase A: Language & Style Checks (1-14)
  // 1. Modality Check
  results.push(checkModality(draft, language));
  console.log(`[Audit] 1/30 Modality: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 2. Stop Words Check
  results.push(checkStopWords(draft, language));
  console.log(`[Audit] 2/30 StopWords: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 3. Subject Positioning (uses cached sentences)
  results.push(checkSubjectPositioningCached(cachedSentences, info.seedKeyword));
  console.log(`[Audit] 3/30 SubjectPos: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 4. Heading Hierarchy
  results.push(checkHeadingHierarchy(draft));
  console.log(`[Audit] 4/30 HeadingHier: ${(performance.now() - startTime).toFixed(0)}ms`);

  // YIELD: Allow UI to update after first batch of checks
  await yieldToMainThread();

  // NEW: Generic Headings Check (avoid "Introduction", "Conclusion")
  results.push(checkGenericHeadings(draft, language));
  console.log(`[Audit] 5/30 GenericHead: ${(performance.now() - startTime).toFixed(0)}ms`);

  // NEW: Passive Voice Check
  results.push(checkPassiveVoice(draft, language));
  console.log(`[Audit] 6/30 PassiveVoice: ${(performance.now() - startTime).toFixed(0)}ms`);

  // NEW: Heading-Entity Alignment Check
  results.push(checkHeadingEntityAlignment(draft, info.seedKeyword, brief.title, language));
  console.log(`[Audit] 7/30 HeadingEntity: ${(performance.now() - startTime).toFixed(0)}ms`);

  // NEW: Future Tense for Facts Check
  results.push(checkFutureTenseForFacts(draft, language));
  console.log(`[Audit] 8/30 FutureTense: ${(performance.now() - startTime).toFixed(0)}ms`);

  // NEW: Stop Word Density (full document)
  results.push(checkStopWordDensity(draft, language));
  console.log(`[Audit] 9/30 StopWordDens: ${(performance.now() - startTime).toFixed(0)}ms`);

  // YIELD: Allow UI to update after second batch
  await yieldToMainThread();

  // 5. List Count Specificity
  results.push(checkListCountSpecificity(draft, language));
  console.log(`[Audit] 10/30 ListCount: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 6. Pronoun Density
  results.push(checkPronounDensity(draft, brief.title, language));
  console.log(`[Audit] 11/30 PronounDens: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 7. Link Positioning
  results.push(checkLinkPositioning(draft));
  console.log(`[Audit] 12/30 LinkPos: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 8. First Sentence Precision
  results.push(checkFirstSentencePrecision(draft, language));
  console.log(`[Audit] 13/30 FirstSent: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 9. Centerpiece Annotation
  results.push(checkCenterpieceAnnotation(draft, info.seedKeyword, language));
  console.log(`[Audit] 14/30 Centerpiece: ${(performance.now() - startTime).toFixed(0)}ms`);

  // YIELD: Allow UI to update after third batch
  await yieldToMainThread();

  // 10. Repetitive Language (uses cached sentences)
  results.push(checkRepetitiveLanguageCached(cachedSentences, info.seedKeyword));
  console.log(`[Audit] 15/30 Repetitive: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 11. LLM Signature Phrases
  results.push(checkLLMSignaturePhrases(draft, language));
  console.log(`[Audit] 16/30 LLMPhrases: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 12. Predicate Consistency
  results.push(checkPredicateConsistency(draft, brief.title, language));
  console.log(`[Audit] 17/30 PredConsis: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 13. Content Coverage Weight
  results.push(checkCoverageWeight(draft));
  console.log(`[Audit] 18/30 Coverage: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 14. Vocabulary Richness
  results.push(checkVocabularyRichness(draft));
  console.log(`[Audit] 19/30 Vocabulary: ${(performance.now() - startTime).toFixed(0)}ms`);

  // YIELD: Allow UI to update after fourth batch
  await yieldToMainThread();

  // Phase B: Structural Enhancements (15-17)
  // 15. Macro/Micro Border
  results.push(checkMacroMicroBorder(draft));
  console.log(`[Audit] 20/30 MacroMicro: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 16. Extractive Summary Alignment
  results.push(checkExtractiveSummaryAlignment(draft, language));
  console.log(`[Audit] 21/30 ExtractSum: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 17. Query-Format Alignment
  results.push(checkQueryFormatAlignment(draft, brief, language));
  console.log(`[Audit] 22/30 QueryFormat: ${(performance.now() - startTime).toFixed(0)}ms`);

  // YIELD: Allow UI to update after Phase B
  await yieldToMainThread();

  // Phase C: Link Optimization (18-20)
  // 18. Anchor Text Variety
  results.push(checkAnchorTextVariety(draft));
  console.log(`[Audit] 23/30 AnchorVar: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 19. Annotation Text Quality
  results.push(checkAnnotationTextQuality(draft, language));
  console.log(`[Audit] 24/30 AnnotQual: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 20. Supplementary Link Placement
  results.push(checkSupplementaryLinkPlacement(draft, language));
  console.log(`[Audit] 25/30 SuppLink: ${(performance.now() - startTime).toFixed(0)}ms`);

  // Phase D: Content Format Balance (21-24) - Baker Principle
  // 21. Prose/Structured Balance
  results.push(checkProseStructuredBalance(draft));
  console.log(`[Audit] 26/30 ProseBalance: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 22. List Definition Sentences
  results.push(checkListDefinitionSentences(draft));
  console.log(`[Audit] 27/30 ListDefSent: ${(performance.now() - startTime).toFixed(0)}ms`);

  // YIELD: Allow UI to update after Phase C/D start
  await yieldToMainThread();

  // 23. Table Appropriateness
  results.push(checkTableAppropriateness(draft));
  console.log(`[Audit] 28/30 TableApprop: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 24. Image Placement
  results.push(checkImagePlacement(draft));
  console.log(`[Audit] 29/30 ImagePlace: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 25. Sentence Length (uses cached sentences)
  results.push(checkSentenceLengthCached(cachedSentences, language));
  console.log(`[Audit] 30/30 SentLength: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 26. EAV Density (uses cached sentences)
  results.push(checkEavDensityCached(cachedSentences, draft, eavs, language));
  console.log(`[Audit] 31/30 EAVDensity: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 27. Internal Link Insertion (Contextual Bridge Links)
  results.push(checkInternalLinkInsertion(draft, brief));
  console.log(`[Audit] 32/30 IntLinkIns: ${(performance.now() - startTime).toFixed(0)}ms`);

  // YIELD: Allow UI to update before final phase
  await yieldToMainThread();

  // Phase E: Template Compliance (28-30)
  // 28. Template Format Code Compliance
  results.push(checkTemplateFormatCompliance(draft, brief, template));
  console.log(`[Audit] 33/30 TemplFormat: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 29. Template Section Coverage
  results.push(checkTemplateSectionCoverage(draft, brief, template));
  console.log(`[Audit] 34/30 TemplCover: ${(performance.now() - startTime).toFixed(0)}ms`);

  // 30. Content Zone Balance
  results.push(checkContentZoneBalance(draft, brief));
  console.log(`[Audit] COMPLETE: ${(performance.now() - startTime).toFixed(0)}ms total for ${results.length} checks`);

  return results;
}

function checkModality(text: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const uncertainPattern = patterns.uncertaintyPatterns;

  // uncertaintyPatterns is a single RegExp, not an array
  const totalMatches = text.match(uncertainPattern) || [];

  if (totalMatches.length > 3) {
    return {
      ruleName: 'Modality Certainty',
      isPassing: false,
      details: `Found ${totalMatches.length} uncertain phrases. Use definitive "is/are" for facts.`,
      affectedTextSnippet: totalMatches.slice(0, 3).join(', '),
      remediation: 'Replace "can be/might be" with "is/are" where factually appropriate.'
    };
  }
  return { ruleName: 'Modality Certainty', isPassing: true, details: 'Good use of definitive language.' };
}

function checkStopWords(text: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const fluffWordsPattern = patterns.fluffWordsPattern;
  const first500 = text.substring(0, 500);
  const matchesInIntro = first500.match(fluffWordsPattern) || [];

  if (matchesInIntro.length > 2) {
    return {
      ruleName: 'Stop Word Removal',
      isPassing: false,
      details: `Found ${matchesInIntro.length} fluff words in first 500 chars.`,
      affectedTextSnippet: matchesInIntro.join(', '),
      remediation: 'Remove filler words like "also", "basically", "very" especially from introduction.'
    };
  }
  return { ruleName: 'Stop Word Removal', isPassing: true, details: 'Minimal fluff words in introduction.' };
}

function checkSubjectPositioning(text: string, centralEntity: string): AuditRuleResult {
  const sentences = splitSentences(text);
  return checkSubjectPositioningCached(sentences, centralEntity);
}

// PERFORMANCE: Cached version that takes pre-computed sentences
function checkSubjectPositioningCached(sentences: string[], centralEntity: string): AuditRuleResult {
  const entityRegex = new RegExp(centralEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  let entityAsSubject = 0;
  let entityMentions = 0;

  sentences.forEach(sentence => {
    if (entityRegex.test(sentence)) {
      entityMentions++;
      const firstHalf = sentence.substring(0, sentence.length / 2);
      if (entityRegex.test(firstHalf)) {
        entityAsSubject++;
      }
    }
  });

  const ratio = entityMentions > 0 ? entityAsSubject / entityMentions : 1;

  if (ratio < 0.6) {
    return {
      ruleName: 'Subject Positioning',
      isPassing: false,
      details: `Entity "${centralEntity}" is subject in only ${Math.round(ratio * 100)}% of mentions.`,
      remediation: 'Rewrite sentences so the central entity is the grammatical subject.'
    };
  }
  return { ruleName: 'Subject Positioning', isPassing: true, details: 'Entity is appropriately positioned as subject.' };
}

function checkHeadingHierarchy(text: string): AuditRuleResult {
  const headings = text.match(/^#{2,4}\s+.+$/gm) || [];
  let lastLevel = 1;
  let hasSkip = false;

  headings.forEach(h => {
    const level = (h.match(/^#+/) || [''])[0].length;
    if (level > lastLevel + 1) {
      hasSkip = true;
    }
    lastLevel = level;
  });

  if (hasSkip) {
    return {
      ruleName: 'Heading Hierarchy',
      isPassing: false,
      details: 'Found heading level skips (e.g., H2 to H4).',
      remediation: 'Ensure headings follow H1→H2→H3 without skipping levels.'
    };
  }
  return { ruleName: 'Heading Hierarchy', isPassing: true, details: 'Heading levels are properly nested.' };
}

/**
 * Check for generic headings like "Introduction", "Conclusion", "Overview"
 * These should be replaced with topic-specific headings
 */
function checkGenericHeadings(text: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const genericHeadings = patterns.genericHeadings;
  const headings = text.match(/^#{2,4}\s+.+$/gm) || [];
  const genericFound: string[] = [];

  headings.forEach(h => {
    const headingText = h.replace(/^#+\s*/, '').trim().toLowerCase();
    if (genericHeadings.some(generic => headingText === generic || headingText.startsWith(generic + ':'))) {
      genericFound.push(h.replace(/^#+\s*/, '').trim());
    }
  });

  if (genericFound.length > 0) {
    return {
      ruleName: 'Generic Headings',
      isPassing: false,
      details: `Found ${genericFound.length} generic heading(s): ${genericFound.join(', ')}`,
      affectedTextSnippet: genericFound[0],
      remediation: 'Replace generic headings with topic-specific ones. Use the central entity in the heading.'
    };
  }
  return { ruleName: 'Generic Headings', isPassing: true, details: 'All headings are topic-specific.' };
}

/**
 * Check for excessive passive voice usage
 * Passive voice reduces clarity and authoritativeness
 */
function checkPassiveVoice(text: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const passivePatterns = patterns.passivePatterns;
  let passiveCount = 0;
  const passiveExamples: string[] = [];

  passivePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    passiveCount += matches.length;
    if (passiveExamples.length < 3) {
      passiveExamples.push(...matches.slice(0, 3 - passiveExamples.length));
    }
  });

  const wordCount = text.split(/\s+/).length;
  const passiveRatio = wordCount > 0 ? passiveCount / (wordCount / 100) : 0; // per 100 words

  // Allow up to 2 passive constructions per 100 words
  if (passiveRatio > 2) {
    return {
      ruleName: 'Passive Voice',
      isPassing: false,
      details: `Found ${passiveCount} passive constructions (${passiveRatio.toFixed(1)} per 100 words).`,
      affectedTextSnippet: passiveExamples.slice(0, 2).join(', '),
      remediation: 'Rewrite passive sentences to active voice. Instead of "X is done by Y" use "Y does X".'
    };
  }
  return { ruleName: 'Passive Voice', isPassing: true, details: 'Good use of active voice.' };
}

/**
 * Check that headings contain or relate to the central entity
 * H2s should include terms that link back to the main topic
 */
function checkHeadingEntityAlignment(text: string, centralEntity: string, topicTitle: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const genericHeadings = patterns.genericHeadings;
  const headings = text.match(/^## .+$/gm) || [];

  if (headings.length < 2) {
    return { ruleName: 'Heading-Entity Alignment', isPassing: true, details: 'Not enough headings to check.' };
  }

  // Extract key terms from central entity and topic title
  // Use language-specific stop words
  const keyTerms = new Set<string>();
  const stopWords = patterns.stopWords;

  [centralEntity, topicTitle].forEach(term => {
    if (term) {
      term.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 2 && !stopWords.includes(word)) {
          keyTerms.add(word);
        }
      });
    }
  });

  if (keyTerms.size === 0) {
    return { ruleName: 'Heading-Entity Alignment', isPassing: true, details: 'No key terms identified for alignment check.' };
  }

  // Check each H2 for at least one key term
  const misalignedHeadings: string[] = [];

  headings.forEach(h => {
    const headingLower = h.toLowerCase();
    const hasKeyTerm = Array.from(keyTerms).some(term => headingLower.includes(term));

    // Skip introduction/conclusion headings for this check (they're caught by generic heading check)
    const isBoilerplate = genericHeadings.some(g => headingLower.includes(g));

    if (!hasKeyTerm && !isBoilerplate) {
      misalignedHeadings.push(h.replace(/^## /, ''));
    }
  });

  // Allow up to 1 heading without key terms (for "Related Topics" etc.)
  if (misalignedHeadings.length > 1) {
    return {
      ruleName: 'Heading-Entity Alignment',
      isPassing: false,
      details: `${misalignedHeadings.length} headings don't reference the central entity.`,
      affectedTextSnippet: misalignedHeadings.slice(0, 2).join(', '),
      remediation: `Include terms from "${centralEntity}" in H2 headings for contextual overlap.`
    };
  }
  return { ruleName: 'Heading-Entity Alignment', isPassing: true, details: 'Headings maintain contextual link to central entity.' };
}

/**
 * Check for inappropriate future tense usage for factual statements
 * Facts should use present tense ("X is") not future ("X will be")
 */
function checkFutureTenseForFacts(text: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const futureTensePatterns = patterns.futureTensePatterns;
  let futureTenseCount = 0;
  const futureTenseExamples: string[] = [];

  futureTensePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    futureTenseCount += matches.length;
    if (futureTenseExamples.length < 3) {
      futureTenseExamples.push(...matches.slice(0, 3 - futureTenseExamples.length));
    }
  });

  const wordCount = text.split(/\s+/).length;
  const futureTenseRatio = wordCount > 0 ? futureTenseCount / (wordCount / 100) : 0; // per 100 words

  // Allow up to 1 future tense construction per 100 words (some may be legitimately about future events)
  if (futureTenseRatio > 1) {
    return {
      ruleName: 'Future Tense for Facts',
      isPassing: false,
      details: `Found ${futureTenseCount} future tense phrases (${futureTenseRatio.toFixed(1)} per 100 words).`,
      affectedTextSnippet: futureTenseExamples.slice(0, 2).join(', '),
      remediation: 'Use present tense for factual statements. Reserve future tense for actual predictions.'
    };
  }
  return { ruleName: 'Future Tense for Facts', isPassing: true, details: 'Good use of present tense for facts.' };
}

/**
 * Check stop word density across the full document
 * High density of filler words reduces content quality
 */
function checkStopWordDensity(text: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const stopWordsFull = patterns.stopWordsFull;
  const textLower = text.toLowerCase();
  let stopWordCount = 0;
  const foundStopWords: string[] = [];

  stopWordsFull.forEach(stopWord => {
    const regex = new RegExp(`\\b${stopWord.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const matches = textLower.match(regex) || [];
    stopWordCount += matches.length;
    if (matches.length > 0 && !foundStopWords.includes(stopWord)) {
      foundStopWords.push(stopWord);
    }
  });

  const wordCount = text.split(/\s+/).length;
  const densityPercentage = wordCount > 0 ? (stopWordCount / wordCount) * 100 : 0;

  // Flag if stop word density exceeds 3% of total content
  if (densityPercentage > 3) {
    return {
      ruleName: 'Stop Word Density',
      isPassing: false,
      details: `Stop word density: ${densityPercentage.toFixed(1)}% (${stopWordCount} occurrences). Maximum: 3%`,
      affectedTextSnippet: foundStopWords.slice(0, 4).join(', '),
      remediation: 'Remove filler words. These add no semantic value.'
    };
  }
  return {
    ruleName: 'Stop Word Density',
    isPassing: true,
    details: `Stop word density: ${densityPercentage.toFixed(1)}% (acceptable).`
  };
}

function checkListCountSpecificity(text: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const numberWords = patterns.numberWords;
  const listStarts = text.match(/(?:^|\n)[-*]\s/g) || [];

  // Build language-specific count preamble pattern
  const numberWordsPattern = numberWords.join('|');
  const countPreambleRegex = new RegExp(`\\b(\\d+|${numberWordsPattern})\\s+(main|key|primary|essential|important|types?|ways?|steps?|reasons?|benefits?|factors?|belangrijkste|soorten|manieren|stappen|redenen|voordelen|Haupt|Schlüssel|wichtigsten|Arten|Wege|Schritte|Gründe|Vorteile|principaux|clés|essentiels|importants|types|façons|étapes|raisons|avantages|principales|claves|esenciales|importantes|tipos|maneras|pasos|razones|beneficios)`, 'gi');
  const countPreambles = text.match(countPreambleRegex) || [];

  if (listStarts.length > 5 && countPreambles.length === 0) {
    return {
      ruleName: 'List Count Specificity',
      isPassing: false,
      details: 'Lists found without count preambles.',
      remediation: 'Add preamble sentences with exact counts before lists.'
    };
  }
  return { ruleName: 'List Count Specificity', isPassing: true, details: 'Lists have proper count preambles.' };
}

function checkPronounDensity(text: string, topicTitle: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const pronounsPattern = patterns.pronounsPattern;
  const pronouns = (text.match(pronounsPattern) || []).length;
  const wordCount = text.split(/\s+/).length;
  const ratio = wordCount > 0 ? pronouns / wordCount : 0;

  if (ratio > 0.05) {
    return {
      ruleName: 'Explicit Naming (Pronoun Density)',
      isPassing: false,
      details: `High pronoun density (${(ratio * 100).toFixed(1)}%).`,
      remediation: `Replace pronouns with explicit entity name "${topicTitle}".`
    };
  }
  return { ruleName: 'Explicit Naming (Pronoun Density)', isPassing: true, details: 'Good explicit naming.' };
}

function checkLinkPositioning(text: string): AuditRuleResult {
  const paragraphs = text.split('\n\n');
  let prematureLinks = 0;

  paragraphs.forEach(p => {
    const linkMatch = p.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch && linkMatch.index !== undefined && linkMatch.index < 20) {
      if (!p.trim().startsWith('-') && !p.trim().startsWith('*')) {
        prematureLinks++;
      }
    }
  });

  if (prematureLinks > 0) {
    return {
      ruleName: 'Link Positioning',
      isPassing: false,
      details: `Found ${prematureLinks} paragraphs starting with links.`,
      remediation: 'Move links to second or third sentence. Define concept first.'
    };
  }
  return { ruleName: 'Link Positioning', isPassing: true, details: 'Link positioning is correct.' };
}

function checkFirstSentencePrecision(text: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const definitiveVerbsPattern = patterns.definitiveVerbsPattern;
  const sections = text.split(/\n##/);
  let badSentences = 0;

  sections.forEach(section => {
    const lines = section.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (!firstLine.startsWith('-') && !firstLine.startsWith('*') && !firstLine.startsWith('|')) {
        const firstSentence = firstLine.split('.')[0];
        const hasDefinitiveVerb = definitiveVerbsPattern.test(firstSentence);
        if (!hasDefinitiveVerb) {
          badSentences++;
        }
      }
    }
  });

  if (badSentences > 2) {
    return {
      ruleName: 'First Sentence Precision',
      isPassing: false,
      details: `${badSentences} sections lack definitive first sentences.`,
      remediation: 'Start each section with a direct definition using definitive verbs.'
    };
  }
  return { ruleName: 'First Sentence Precision', isPassing: true, details: 'Sections start with precise definitions.' };
}

function checkCenterpieceAnnotation(text: string, centralEntity: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const definitiveVerbsPattern = patterns.definitiveVerbsPattern;
  const first400 = text.substring(0, 400);
  const entityRegex = new RegExp(centralEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const hasDefinitiveVerb = definitiveVerbsPattern.test(first400);

  if (!entityRegex.test(first400) || !hasDefinitiveVerb) {
    return {
      ruleName: 'Centerpiece Annotation',
      isPassing: false,
      details: 'Core definition not in first 400 characters.',
      remediation: `Start article with direct definition of "${centralEntity}".`
    };
  }
  return { ruleName: 'Centerpiece Annotation', isPassing: true, details: 'Core answer appears early in content.' };
}

/**
 * Check for repetitive language patterns with the central entity
 * Note: This is NOT an EAV density check - see checkEavDensity for that.
 * This function detects short, repetitive sentences that mention the entity
 * without adding new information (e.g., "Product X is great. Product X is nice.")
 */
function checkRepetitiveLanguage(text: string, centralEntity: string): AuditRuleResult {
  const sentences = splitSentences(text);
  return checkRepetitiveLanguageCached(sentences, centralEntity);
}

// PERFORMANCE: Cached version that takes pre-computed sentences
function checkRepetitiveLanguageCached(sentences: string[], centralEntity: string): AuditRuleResult {
  // Don't use 'g' flag here - it causes lastIndex issues in loops
  const entityRegex = new RegExp(centralEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  let repetitiveCount = 0;
  let lastSentenceHadEntity = false;

  sentences.forEach(sentence => {
    const hasEntity = entityRegex.test(sentence);
    if (hasEntity && lastSentenceHadEntity) {
      // Check if this sentence adds new information
      const words = sentence.toLowerCase().split(/\s+/);
      if (words.length < 8) {
        repetitiveCount++;
      }
    }
    lastSentenceHadEntity = hasEntity;
  });

  if (repetitiveCount > 3) {
    return {
      ruleName: 'Repetitive Language',
      isPassing: false,
      details: `${repetitiveCount} potentially repetitive entity mentions.`,
      remediation: 'Each sentence with entity should add new attribute/value.'
    };
  }
  return { ruleName: 'Repetitive Language', isPassing: true, details: 'Good information density.' };
}

function checkLLMSignaturePhrases(text: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const llmSignaturePhrases = patterns.llmSignaturePhrases;
  const textLower = text.toLowerCase();
  const found = llmSignaturePhrases.filter(phrase =>
    textLower.includes(phrase.toLowerCase())
  );

  if (found.length > 0) {
    return {
      ruleName: 'LLM Phrase Detection',
      isPassing: false,
      details: `Found ${found.length} LLM signature phrase(s): ${found.slice(0, 5).join(', ')}${found.length > 5 ? '...' : ''}`,
      affectedTextSnippet: found.slice(0, 3).join(', '),
      remediation: 'Remove or rewrite sentences containing these AI-generated patterns. Use more natural, specific language.'
    };
  }
  return {
    ruleName: 'LLM Phrase Detection',
    isPassing: true,
    details: 'No LLM signature phrases detected.'
  };
}

function calculateTTR(text: string): number {
  // Extract words (lowercase, only letters)
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];

  if (words.length < 50) {
    return 1; // Too short to measure, assume good
  }

  const uniqueWords = new Set(words);

  // Type-Token Ratio
  return uniqueWords.size / words.length;
}

function checkVocabularyRichness(text: string): AuditRuleResult {
  const ttr = calculateTTR(text);
  const threshold = 0.35; // 35% unique words minimum

  // For short content, be more lenient
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  if (words.length < 100) {
    return {
      ruleName: 'Vocabulary Richness',
      isPassing: true,
      details: 'Content too short to evaluate vocabulary richness.'
    };
  }

  if (ttr < threshold) {
    return {
      ruleName: 'Vocabulary Richness',
      isPassing: false,
      details: `TTR score: ${(ttr * 100).toFixed(1)}% (minimum: ${threshold * 100}%). Content lacks vocabulary diversity.`,
      remediation: 'Use more synonyms and varied phrasing. Avoid repeating the same words.'
    };
  }

  return {
    ruleName: 'Vocabulary Richness',
    isPassing: true,
    details: `TTR score: ${(ttr * 100).toFixed(1)}%. Good vocabulary diversity.`
  };
}

function checkCoverageWeight(text: string): AuditRuleResult {
  // Split into sections by H2 headings
  const sections = text.split(/(?=^## )/gm).filter(s => s.trim());

  if (sections.length < 2) {
    return {
      ruleName: 'Content Coverage Weight',
      isPassing: true,
      details: 'Not enough sections to evaluate balance.'
    };
  }

  // Calculate word count per section
  const sectionStats = sections.map(section => {
    const lines = section.split('\n');
    const heading = lines[0]?.replace(/^##\s*/, '').trim() || 'Unknown';
    const content = lines.slice(1).join(' ');
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    return { heading, wordCount };
  });

  const totalWords = sectionStats.reduce((sum, s) => sum + s.wordCount, 0);

  if (totalWords < 100) {
    return {
      ruleName: 'Content Coverage Weight',
      isPassing: true,
      details: 'Content too short to evaluate balance.'
    };
  }

  // Find sections that exceed 50% threshold
  const violations = sectionStats
    .map(s => ({
      ...s,
      percentage: (s.wordCount / totalWords) * 100
    }))
    .filter(s => {
      // Skip introduction and conclusion from violation check
      const isBoilerplate = /intro|conclusion|summary/i.test(s.heading);
      return !isBoilerplate && s.percentage > 50;
    });

  if (violations.length > 0) {
    const worst = violations[0];
    return {
      ruleName: 'Content Coverage Weight',
      isPassing: false,
      details: `Section "${worst.heading}" contains ${worst.percentage.toFixed(0)}% of content (>${50}% threshold).`,
      affectedTextSnippet: worst.heading,
      remediation: 'Reduce this section or expand other sections to improve content balance.'
    };
  }

  return {
    ruleName: 'Content Coverage Weight',
    isPassing: true,
    details: 'Content weight is balanced across sections.'
  };
}

function classifyPredicate(text: string, language?: string): 'positive' | 'negative' | 'instructional' | 'neutral' {
  const patterns = getAuditPatterns(language || 'en');
  const lower = text.toLowerCase();

  if (patterns.instructionalPredicates.some(p => lower.includes(p))) {
    return 'instructional';
  }
  if (patterns.negativePredicates.some(p => lower.includes(p))) {
    return 'negative';
  }
  if (patterns.positivePredicates.some(p => lower.includes(p))) {
    return 'positive';
  }
  return 'neutral';
}

function checkPredicateConsistency(text: string, title: string, language?: string): AuditRuleResult {
  // Extract all H2 headings
  const h2Headings = text.match(/^## .+$/gm) || [];

  // Classify title/H1 predicate
  const titleClass = classifyPredicate(title, language);

  // If title is neutral, any predicate mix is acceptable
  if (titleClass === 'neutral') {
    return {
      ruleName: 'Predicate Consistency',
      isPassing: true,
      details: 'Title has neutral predicate; H2 predicates can vary.'
    };
  }

  // Check H2s for conflicting predicates
  const violations: string[] = [];

  h2Headings.forEach(h2 => {
    const h2Class = classifyPredicate(h2, language);

    // Instructional titles allow instructional or neutral H2s
    if (titleClass === 'instructional') {
      if (h2Class === 'positive' || h2Class === 'negative') {
        // Allow if it's a minor mention, but flag if many
        // Actually, instructional can include pros/cons sections
      }
      return; // instructional is flexible
    }

    // Positive title with negative H2 = conflict
    if (titleClass === 'positive' && h2Class === 'negative') {
      violations.push(h2.replace('## ', ''));
    }

    // Negative title with positive H2 = conflict
    if (titleClass === 'negative' && h2Class === 'positive') {
      violations.push(h2.replace('## ', ''));
    }
  });

  if (violations.length >= 2) {
    return {
      ruleName: 'Predicate Consistency',
      isPassing: false,
      details: `Title uses ${titleClass} predicates but ${violations.length} H2s conflict: ${violations.slice(0, 2).join(', ')}`,
      affectedTextSnippet: violations[0],
      remediation: `Use consistent ${titleClass} predicates in H2 headings, or add a bridge heading to transition to contrasting content.`
    };
  }

  return {
    ruleName: 'Predicate Consistency',
    isPassing: true,
    details: `Heading predicates are consistent with ${titleClass} title angle.`
  };
}

// =====================================================
// Phase B: Structural Enhancements (Checks 15-17)
// =====================================================

// Patterns that indicate supplementary/related content sections
const SUPPLEMENTARY_HEADING_PATTERNS = [
  /related/i,
  /see also/i,
  /further reading/i,
  /additional/i,
  /more on/i,
  /learn more/i,
  /what is the (opposite|difference)/i,
  /how does .+ relate/i
];

function checkMacroMicroBorder(draft: string): AuditRuleResult {
  // Find the position of supplementary section (if any)
  const lines = draft.split('\n');
  let supplementaryStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('##') && SUPPLEMENTARY_HEADING_PATTERNS.some(p => p.test(line))) {
      supplementaryStartLine = i;
      break;
    }
  }

  // If no supplementary section, check if there are links in first 70% of content
  const mainContentEndLine = supplementaryStartLine > 0
    ? supplementaryStartLine
    : Math.floor(lines.length * 0.7);

  const mainContent = lines.slice(0, mainContentEndLine).join('\n');

  // Count links in main content (excluding list items which may be intentional)
  const linksInMainContent: string[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(mainContent)) !== null) {
    // Skip if in a list item (starts with - or *)
    const lineStart = mainContent.lastIndexOf('\n', match.index);
    const lineText = mainContent.substring(lineStart + 1, match.index);
    if (!lineText.trim().match(/^[-*\d.]/)) {
      linksInMainContent.push(match[1]);
    }
  }

  // Allow up to 2 inline links in main content, but flag if more
  if (linksInMainContent.length > 2 && supplementaryStartLine < 0) {
    return {
      ruleName: 'Macro/Micro Border',
      isPassing: false,
      details: `Found ${linksInMainContent.length} internal links in main content without a designated supplementary section.`,
      affectedTextSnippet: linksInMainContent.slice(0, 3).join(', '),
      remediation: 'Add a "Related Topics" or "See Also" section at the end for tangential links, keeping main content focused.'
    };
  }

  return {
    ruleName: 'Macro/Micro Border',
    isPassing: true,
    details: supplementaryStartLine > 0
      ? 'Content has proper macro/micro segmentation.'
      : 'Main content has minimal tangential links.'
  };
}

function extractKeyTermsFromHeading(heading: string, language?: string): string[] {
  // Remove common words and extract meaningful terms using language-specific stop words
  const patterns = getAuditPatterns(language || 'en');
  const stopWords = patterns.stopWords;
  const words = heading
    .toLowerCase()
    .replace(/^#+\s*/, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));
  return words;
}

function checkExtractiveSummaryAlignment(draft: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const genericHeadings = patterns.genericHeadings;

  // Extract introduction - look for generic or language-specific intro headings
  const introPatterns = genericHeadings.filter(h =>
    h.includes('intro') || h.includes('inleid') || h.includes('einleit') || h.includes('introd')
  );
  const introPattern = new RegExp(`## (?:${introPatterns.join('|')})\\n\\n([\\s\\S]*?)(?=\\n## )`, 'i');
  const introMatch = draft.match(introPattern);

  if (!introMatch) {
    return {
      ruleName: 'Extractive Summary Alignment',
      isPassing: true,
      details: 'No introduction section found to validate.'
    };
  }

  const intro = introMatch[1].toLowerCase();

  // Extract H2 headings (excluding Introduction and supplementary headings)
  const h2Headings = (draft.match(/^## .+$/gm) || [])
    .filter(h => !genericHeadings.some(g => h.toLowerCase().includes(g)))
    .filter(h => !SUPPLEMENTARY_HEADING_PATTERNS.some(p => p.test(h)));

  if (h2Headings.length < 2) {
    return {
      ruleName: 'Extractive Summary Alignment',
      isPassing: true,
      details: 'Not enough H2 sections to validate alignment.'
    };
  }

  // Check if intro mentions key terms from each H2
  const missingTopics: string[] = [];

  h2Headings.forEach(h2 => {
    const keyTerms = extractKeyTermsFromHeading(h2, language);
    const hasAnyTerm = keyTerms.some(term => intro.includes(term));
    if (!hasAnyTerm && keyTerms.length > 0) {
      missingTopics.push(h2.replace(/^## /, ''));
    }
  });

  // Allow up to 1 missing topic
  if (missingTopics.length > 1) {
    return {
      ruleName: 'Extractive Summary Alignment',
      isPassing: false,
      details: `Introduction does not preview ${missingTopics.length} H2 topics: ${missingTopics.slice(0, 2).join(', ')}`,
      affectedTextSnippet: missingTopics[0],
      remediation: 'Rewrite introduction to mention or preview all major sections covered in the article.'
    };
  }

  return {
    ruleName: 'Extractive Summary Alignment',
    isPassing: true,
    details: 'Introduction properly previews all major sections.'
  };
}

type QueryIntentType = 'list' | 'instructional' | 'comparison' | 'definitional' | 'neutral';

function classifyQueryIntent(title: string, language?: string): QueryIntentType {
  const patterns = getAuditPatterns(language || 'en');
  const queryPatterns = patterns.queryPatterns;
  const lower = title.toLowerCase();

  // List patterns (multilingual)
  if (queryPatterns.list.some(p => p.test(lower))) {
    return 'list';
  }

  // Instructional patterns (multilingual)
  if (queryPatterns.instructional.some(p => p.test(lower))) {
    return 'instructional';
  }

  // Comparison patterns (multilingual)
  if (queryPatterns.comparison.some(p => p.test(lower))) {
    return 'comparison';
  }

  // Definitional patterns (multilingual)
  if (queryPatterns.definitional.some(p => p.test(lower))) {
    return 'definitional';
  }

  return 'neutral';
}

function checkQueryFormatAlignment(draft: string, brief: ContentBrief, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const definitiveVerbsPattern = patterns.definitiveVerbsPattern;
  const intent = classifyQueryIntent(brief.title, language);

  if (intent === 'neutral') {
    return {
      ruleName: 'Query-Format Alignment',
      isPassing: true,
      details: 'Neutral query intent; format is flexible.'
    };
  }

  const hasUnorderedList = /(?:^|\n)[-*]\s+.+(?:\n[-*]\s+.+){2,}/m.test(draft);
  const hasOrderedList = /(?:^|\n)\d+\.\s+.+(?:\n\d+\.\s+.+){2,}/m.test(draft);
  const hasTable = /\|.+\|.+\|/.test(draft);

  let isPassing = true;
  let details = '';
  let remediation = '';

  switch (intent) {
    case 'list':
      if (!hasUnorderedList && !hasOrderedList) {
        isPassing = false;
        details = `"${brief.title}" implies a list format but no list found in content.`;
        remediation = 'Add an unordered list to enumerate the types/examples mentioned in the title.';
      } else {
        details = 'List query has appropriate list format.';
      }
      break;

    case 'instructional':
      if (!hasOrderedList) {
        isPassing = false;
        details = `Instructional query should use numbered steps but no ordered list found.`;
        remediation = 'Convert steps to a numbered list (1. First step, 2. Second step, etc.).';
      } else {
        details = 'Instructional query has numbered steps.';
      }
      break;

    case 'comparison':
      if (!hasTable && !hasUnorderedList) {
        isPassing = false;
        details = `Comparison query should use a table or structured comparison.`;
        remediation = 'Add a comparison table or bullet-point comparison of features.';
      } else {
        details = 'Comparison query has structured comparison format.';
      }
      break;

    case 'definitional':
      // Check first 400 chars for definition pattern using language-specific patterns
      const first400 = draft.substring(0, 400);
      const hasDefinition = definitiveVerbsPattern.test(first400);
      if (!hasDefinition) {
        isPassing = false;
        details = `Definitional query should start with a clear definition.`;
        remediation = 'Begin with "[Entity] is..." or equivalent definition in the first paragraph.';
      } else {
        details = 'Definitional query starts with proper definition.';
      }
      break;
  }

  return {
    ruleName: 'Query-Format Alignment',
    isPassing,
    details,
    remediation: isPassing ? undefined : remediation
  };
}

// =====================================================
// Phase C: Link Optimization (Checks 18-20)
// =====================================================

function checkAnchorTextVariety(draft: string): AuditRuleResult {
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

// Legacy GENERIC_ANCHORS - use getAuditPatterns(language).genericAnchors instead
const GENERIC_ANCHORS = getAuditPatterns('en').genericAnchors;

function checkAnnotationTextQuality(draft: string, language?: string): AuditRuleResult {
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

function checkSupplementaryLinkPlacement(draft: string, language?: string): AuditRuleResult {
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

// =====================================================
// Phase D: Content Format Balance (Baker Principle)
// Checks 21-24: Prose/Structured Balance
// =====================================================

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

/**
 * Check 21: Prose/Structured Content Balance (Baker Principle)
 * Target: 60-80% prose content
 */
export function checkProseStructuredBalance(draft: string): AuditRuleResult {
  const stats = analyzeContentFormats(draft);
  const percentage = stats.prosePercentage * 100;

  // Target range: 60-80% prose
  const isPassing = percentage >= 60 && percentage <= 80;

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

/**
 * Check 22: List Definition Sentences
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

/**
 * Check 23: Table Appropriateness
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

/**
 * Check 25: Sentence Length
 * Sentences should be under 30 words for optimal NLP processing
 * Semantic SEO framework requirement
 *
 * Note: The language parameter is accepted for consistency with other audit checks
 * and could be used for language-specific thresholds (e.g., German compound words
 * naturally create longer sentences). Currently uses universal 30-word threshold.
 */
function checkSentenceLength(text: string, language?: string): AuditRuleResult {
  const sentences = splitSentences(text);
  return checkSentenceLengthCached(sentences, language);
}

// PERFORMANCE: Cached version that takes pre-computed sentences
function checkSentenceLengthCached(sentences: string[], language?: string): AuditRuleResult {
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

/**
 * Check 26: EAV Density
 * Validates Entity-Attribute-Value density using the proper EAV validator
 * This is a core Semantic SEO requirement measuring factual content density
 *
 * @param text - The content to analyze
 * @param eavs - Optional EAV triples for term-based density calculation
 * @param language - Optional language code for multilingual EAV pattern matching
 */
function checkEavDensity(text: string, eavs: SemanticTriple[] | undefined, language?: string): AuditRuleResult {
  // Calculate pattern-based density (sentences with EAV structure)
  const patternDensity = EAVDensityValidator.calculateDensity(text, language);

  // Calculate term density if EAVs provided
  let termDensity = 0;
  if (eavs && eavs.length > 0) {
    termDensity = EAVDensityValidator.calculateTermDensity(text, eavs);
  }

  return buildEavDensityResult(patternDensity, termDensity, eavs);
}

// PERFORMANCE: Cached version that takes pre-computed sentences
function checkEavDensityCached(sentences: string[], text: string, eavs: SemanticTriple[] | undefined, language?: string): AuditRuleResult {
  // Calculate pattern-based density using cached sentences
  const patternDensity = EAVDensityValidator.calculateDensityCached(sentences, language);

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

/**
 * Check 27: Internal Link Insertion
 * Verifies that contextual bridge links from the brief were inserted into the content.
 * Critical for SEO - internal links build topical authority and PageRank flow.
 */
function checkInternalLinkInsertion(draft: string, brief: ContentBrief): AuditRuleResult {
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

/**
 * Check 24: Image Placement
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
      remediation: 'Move images AFTER the first paragraph. Pattern: Heading → Answer Paragraph → Image'
    };
  }

  return {
    ruleName: 'Image Placement',
    isPassing: true,
    details: 'All images placed correctly after answer paragraphs'
  };
}

// =====================================================
// Phase E: Template Compliance Rules (28-30)
// =====================================================

/**
 * Rule 28: Template Format Code Compliance
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

/**
 * Rule 29: Template Section Coverage
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

/**
 * Rule 30: Content Zone Balance
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

// =====================================================
// Auto-Fix System
// =====================================================

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

/**
 * Interface for auto-fix context
 */
export interface AutoFixContext {
  draft: string;
  brief: ContentBrief;
  businessInfo: BusinessInfo;
  issue: AuditIssue;
}

/**
 * Generate an auto-fix for a specific audit issue using AI
 */
export async function generateAutoFix(ctx: AutoFixContext): Promise<string> {
  const { draft, brief, issue } = ctx;

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
    header_hierarchy_jump: 'Fix the heading level to maintain proper hierarchy (H1 → H2 → H3).',
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

    case 'missing_conclusion':
      // Add conclusion at the end
      const updatedDraft = draft + '\n\n' + fixContent;
      return { updatedDraft, success: true, message: 'Conclusion added at end' };

    case 'missing_image':
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

  return {
    updatedDraft: draft,
    success: false,
    message: 'Fix type requires manual intervention'
  };
}

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
