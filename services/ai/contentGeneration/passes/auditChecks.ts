// services/ai/contentGeneration/passes/auditChecks.ts
import { ContentBrief, BusinessInfo, AuditRuleResult, AuditIssue, AuditIssueType } from '../../../../types';
import { v4 as uuidv4 } from 'uuid';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';
import { dispatchToProvider } from '../../providerDispatcher';

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

// Extended LLM signature phrases list (from macro context research)
const LLM_SIGNATURE_PHRASES = [
  'overall',
  'in conclusion',
  "it's important to note",
  'it is important to note',
  'it is worth mentioning',
  'it is worth noting',
  'delve',
  'delving',
  'delved',
  'i had the pleasure of',
  'embark on a journey',
  'explore the world of',
  "in today's fast-paced world",
  'when it comes to',
  'at the end of the day',
  'needless to say',
  'it goes without saying',
  'without further ado',
  'dive into',
  'diving into',
  'unpack this',
  'unpacking',
  'game-changer',
  'a testament to',
  'the importance of',
  'crucial to understand',
  'pivotal',
  'paramount'
];

// Predicate classification for consistency checking
const POSITIVE_PREDICATES = [
  'benefits', 'advantages', 'improvements', 'gains', 'pros',
  'opportunities', 'strengths', 'positives', 'success', 'wins'
];

const NEGATIVE_PREDICATES = [
  'risks', 'dangers', 'problems', 'issues', 'cons', 'drawbacks',
  'challenges', 'threats', 'weaknesses', 'failures', 'losses',
  'mistakes', 'errors', 'pitfalls', 'downsides'
];

const INSTRUCTIONAL_PREDICATES = [
  'how to', 'guide', 'steps', 'tutorial', 'ways to', 'tips',
  'process', 'method', 'approach', 'strategy', 'techniques'
];

// Generic headings that should be avoided (topic-specific is better)
const GENERIC_HEADINGS = [
  'introduction',
  'conclusion',
  'overview',
  'summary',
  'getting started',
  'final thoughts',
  'wrapping up',
  'in closing'
];

// Passive voice indicator patterns
const PASSIVE_PATTERNS = [
  /\b(is|are|was|were|been|being)\s+(being\s+)?(done|made|created|used|considered|known|found|seen|given|taken|called|named|built|written|designed|developed|established|implemented|performed|executed|completed|achieved)\b/gi,
  /\b(is|are|was|were|been|being)\s+\w+ed\s+by\b/gi  // "is loved by", "was created by"
];

// Future tense patterns that should be avoided for factual statements
const FUTURE_TENSE_PATTERNS = [
  /\b(will be|will have|will become|will make|will provide|will help|will allow|will enable)\b/gi,
  /\b(is going to|are going to|is about to|are about to)\b/gi,
  /\b(shall be|shall have|shall become)\b/gi
];

// Comprehensive stop words list for density checking
const STOP_WORDS_FULL = [
  'also', 'basically', 'very', 'maybe', 'actually', 'really', 'just', 'quite', 'simply',
  'definitely', 'certainly', 'obviously', 'clearly', 'literally', 'absolutely',
  'pretty much', 'kind of', 'sort of', 'in order to', 'due to the fact that',
  'at this point in time', 'for the purpose of', 'in the event that'
];

export function runAlgorithmicAudit(
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): AuditRuleResult[] {
  const results: AuditRuleResult[] = [];

  // 1. Modality Check
  results.push(checkModality(draft));

  // 2. Stop Words Check
  results.push(checkStopWords(draft));

  // 3. Subject Positioning
  results.push(checkSubjectPositioning(draft, info.seedKeyword));

  // 4. Heading Hierarchy
  results.push(checkHeadingHierarchy(draft));

  // NEW: Generic Headings Check (avoid "Introduction", "Conclusion")
  results.push(checkGenericHeadings(draft));

  // NEW: Passive Voice Check
  results.push(checkPassiveVoice(draft));

  // NEW: Heading-Entity Alignment Check
  results.push(checkHeadingEntityAlignment(draft, info.seedKeyword, brief.title));

  // NEW: Future Tense for Facts Check
  results.push(checkFutureTenseForFacts(draft));

  // NEW: Stop Word Density (full document)
  results.push(checkStopWordDensity(draft));

  // 5. List Count Specificity
  results.push(checkListCountSpecificity(draft));

  // 6. Pronoun Density
  results.push(checkPronounDensity(draft, brief.title));

  // 7. Link Positioning
  results.push(checkLinkPositioning(draft));

  // 8. First Sentence Precision
  results.push(checkFirstSentencePrecision(draft));

  // 9. Centerpiece Annotation
  results.push(checkCenterpieceAnnotation(draft, info.seedKeyword));

  // 10. Information Density
  results.push(checkInformationDensity(draft, info.seedKeyword));

  // 11. LLM Signature Phrases
  results.push(checkLLMSignaturePhrases(draft));

  // 12. Predicate Consistency
  results.push(checkPredicateConsistency(draft, brief.title));

  // 13. Content Coverage Weight
  results.push(checkCoverageWeight(draft));

  // 14. Vocabulary Richness
  results.push(checkVocabularyRichness(draft));

  // Phase B: Structural Enhancements (15-17)
  // 15. Macro/Micro Border
  results.push(checkMacroMicroBorder(draft));

  // 16. Extractive Summary Alignment
  results.push(checkExtractiveSummaryAlignment(draft));

  // 17. Query-Format Alignment
  results.push(checkQueryFormatAlignment(draft, brief));

  // Phase C: Link Optimization (18-20)
  // 18. Anchor Text Variety
  results.push(checkAnchorTextVariety(draft));

  // 19. Annotation Text Quality
  results.push(checkAnnotationTextQuality(draft));

  // 20. Supplementary Link Placement
  results.push(checkSupplementaryLinkPlacement(draft));

  // Phase D: Content Format Balance (21-24) - Baker Principle
  // 21. Prose/Structured Balance
  results.push(checkProseStructuredBalance(draft));

  // 22. List Definition Sentences
  results.push(checkListDefinitionSentences(draft));

  // 23. Table Appropriateness
  results.push(checkTableAppropriateness(draft));

  // 24. Image Placement
  results.push(checkImagePlacement(draft));

  return results;
}

function checkModality(text: string): AuditRuleResult {
  const uncertainPatterns = /\b(can be|might be|could be|may be|possibly|perhaps)\b/gi;
  const matches = text.match(uncertainPatterns) || [];

  if (matches.length > 3) {
    return {
      ruleName: 'Modality Certainty',
      isPassing: false,
      details: `Found ${matches.length} uncertain phrases. Use definitive "is/are" for facts.`,
      affectedTextSnippet: matches.slice(0, 3).join(', '),
      remediation: 'Replace "can be/might be" with "is/are" where factually appropriate.'
    };
  }
  return { ruleName: 'Modality Certainty', isPassing: true, details: 'Good use of definitive language.' };
}

function checkStopWords(text: string): AuditRuleResult {
  const fluffWords = /\b(also|basically|very|maybe|actually|really|just|quite|simply)\b/gi;
  const first500 = text.substring(0, 500);
  const matchesInIntro = first500.match(fluffWords) || [];

  if (matchesInIntro.length > 2) {
    return {
      ruleName: 'Stop Word Removal',
      isPassing: false,
      details: `Found ${matchesInIntro.length} fluff words in first 500 chars.`,
      affectedTextSnippet: matchesInIntro.join(', '),
      remediation: 'Remove "also", "basically", "very", etc. especially from introduction.'
    };
  }
  return { ruleName: 'Stop Word Removal', isPassing: true, details: 'Minimal fluff words in introduction.' };
}

function checkSubjectPositioning(text: string, centralEntity: string): AuditRuleResult {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
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
function checkGenericHeadings(text: string): AuditRuleResult {
  const headings = text.match(/^#{2,4}\s+.+$/gm) || [];
  const genericFound: string[] = [];

  headings.forEach(h => {
    const headingText = h.replace(/^#+\s*/, '').trim().toLowerCase();
    if (GENERIC_HEADINGS.some(generic => headingText === generic || headingText.startsWith(generic + ':'))) {
      genericFound.push(h.replace(/^#+\s*/, '').trim());
    }
  });

  if (genericFound.length > 0) {
    return {
      ruleName: 'Generic Headings',
      isPassing: false,
      details: `Found ${genericFound.length} generic heading(s): ${genericFound.join(', ')}`,
      affectedTextSnippet: genericFound[0],
      remediation: 'Replace generic headings with topic-specific ones. Instead of "Introduction" use "Wat is [Topic]" or "[Topic]: Een Overzicht".'
    };
  }
  return { ruleName: 'Generic Headings', isPassing: true, details: 'All headings are topic-specific.' };
}

/**
 * Check for excessive passive voice usage
 * Passive voice reduces clarity and authoritativeness
 */
function checkPassiveVoice(text: string): AuditRuleResult {
  let passiveCount = 0;
  const passiveExamples: string[] = [];

  PASSIVE_PATTERNS.forEach(pattern => {
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
function checkHeadingEntityAlignment(text: string, centralEntity: string, topicTitle: string): AuditRuleResult {
  const headings = text.match(/^## .+$/gm) || [];

  if (headings.length < 2) {
    return { ruleName: 'Heading-Entity Alignment', isPassing: true, details: 'Not enough headings to check.' };
  }

  // Extract key terms from central entity and topic title
  const keyTerms = new Set<string>();
  const stopWords = ['the', 'a', 'an', 'of', 'and', 'or', 'for', 'to', 'in', 'on', 'with', 'is', 'are', 'wat', 'een', 'de', 'het', 'van', 'voor', 'en', 'naar'];

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
    const isBoilerplate = GENERIC_HEADINGS.some(g => headingLower.includes(g));

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
function checkFutureTenseForFacts(text: string): AuditRuleResult {
  let futureTenseCount = 0;
  const futureTenseExamples: string[] = [];

  FUTURE_TENSE_PATTERNS.forEach(pattern => {
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
      remediation: 'Use present tense for factual statements. Instead of "X will provide" use "X provides". Reserve future tense for actual predictions.'
    };
  }
  return { ruleName: 'Future Tense for Facts', isPassing: true, details: 'Good use of present tense for facts.' };
}

/**
 * Check stop word density across the full document
 * High density of filler words reduces content quality
 */
function checkStopWordDensity(text: string): AuditRuleResult {
  const textLower = text.toLowerCase();
  let stopWordCount = 0;
  const foundStopWords: string[] = [];

  STOP_WORDS_FULL.forEach(stopWord => {
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
      remediation: 'Remove filler words like "very", "basically", "actually", "really", "just". These add no semantic value.'
    };
  }
  return {
    ruleName: 'Stop Word Density',
    isPassing: true,
    details: `Stop word density: ${densityPercentage.toFixed(1)}% (acceptable).`
  };
}

function checkListCountSpecificity(text: string): AuditRuleResult {
  const listStarts = text.match(/(?:^|\n)[-*]\s/g) || [];
  const countPreambles = text.match(/\b(\d+|three|four|five|six|seven|eight|nine|ten)\s+(main|key|primary|essential|important|types?|ways?|steps?|reasons?|benefits?|factors?)/gi) || [];

  if (listStarts.length > 5 && countPreambles.length === 0) {
    return {
      ruleName: 'List Count Specificity',
      isPassing: false,
      details: 'Lists found without count preambles.',
      remediation: 'Add preamble sentences with exact counts before lists (e.g., "The 5 main types include:").'
    };
  }
  return { ruleName: 'List Count Specificity', isPassing: true, details: 'Lists have proper count preambles.' };
}

function checkPronounDensity(text: string, topicTitle: string): AuditRuleResult {
  const pronouns = (text.match(/\b(it|they|he|she|this|that)\b/gi) || []).length;
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

function checkFirstSentencePrecision(text: string): AuditRuleResult {
  const sections = text.split(/\n##/);
  let badSentences = 0;

  sections.forEach(section => {
    const lines = section.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (!firstLine.startsWith('-') && !firstLine.startsWith('*') && !firstLine.startsWith('|')) {
        const firstSentence = firstLine.split('.')[0];
        const hasDefinitiveVerb = /\b(is|are|means|refers to|consists of|defines)\b/i.test(firstSentence);
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
      remediation: 'Start each section with a direct definition using "is/are/means".'
    };
  }
  return { ruleName: 'First Sentence Precision', isPassing: true, details: 'Sections start with precise definitions.' };
}

function checkCenterpieceAnnotation(text: string, centralEntity: string): AuditRuleResult {
  const first400 = text.substring(0, 400);
  const entityRegex = new RegExp(centralEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const hasDefinitiveVerb = /\b(is|are|means|refers to)\b/i.test(first400);

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

function checkInformationDensity(text: string, centralEntity: string): AuditRuleResult {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const entityRegex = new RegExp(centralEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

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
      ruleName: 'Information Density',
      isPassing: false,
      details: `${repetitiveCount} potentially repetitive entity mentions.`,
      remediation: 'Each sentence with entity should add new attribute/value.'
    };
  }
  return { ruleName: 'Information Density', isPassing: true, details: 'Good information density.' };
}

function checkLLMSignaturePhrases(text: string): AuditRuleResult {
  const textLower = text.toLowerCase();
  const found = LLM_SIGNATURE_PHRASES.filter(phrase =>
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

function classifyPredicate(text: string): 'positive' | 'negative' | 'instructional' | 'neutral' {
  const lower = text.toLowerCase();

  if (INSTRUCTIONAL_PREDICATES.some(p => lower.includes(p))) {
    return 'instructional';
  }
  if (NEGATIVE_PREDICATES.some(p => lower.includes(p))) {
    return 'negative';
  }
  if (POSITIVE_PREDICATES.some(p => lower.includes(p))) {
    return 'positive';
  }
  return 'neutral';
}

function checkPredicateConsistency(text: string, title: string): AuditRuleResult {
  // Extract all H2 headings
  const h2Headings = text.match(/^## .+$/gm) || [];

  // Classify title/H1 predicate
  const titleClass = classifyPredicate(title);

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
    const h2Class = classifyPredicate(h2);

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

function extractKeyTermsFromHeading(heading: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = ['the', 'a', 'an', 'of', 'and', 'or', 'for', 'to', 'in', 'on', 'with', 'how', 'what', 'why', 'when', 'is', 'are'];
  const words = heading
    .toLowerCase()
    .replace(/^#+\s*/, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));
  return words;
}

function checkExtractiveSummaryAlignment(draft: string): AuditRuleResult {
  // Extract introduction
  const introMatch = draft.match(/## Introduction\n\n([\s\S]*?)(?=\n## )/);
  if (!introMatch) {
    return {
      ruleName: 'Extractive Summary Alignment',
      isPassing: true,
      details: 'No introduction section found to validate.'
    };
  }

  const intro = introMatch[1].toLowerCase();

  // Extract H2 headings (excluding Introduction)
  const h2Headings = (draft.match(/^## .+$/gm) || [])
    .filter(h => !h.toLowerCase().includes('introduction'))
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
    const keyTerms = extractKeyTermsFromHeading(h2);
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

function classifyQueryIntent(title: string): QueryIntentType {
  const lower = title.toLowerCase();

  // Plural/list queries
  if (/\b(types of|kinds of|categories of|list of|examples of)\b/.test(lower)) {
    return 'list';
  }
  if (/\b(best|top \d+|ways to)\b/.test(lower)) {
    return 'list';
  }

  // Instructional queries
  if (/^how to\b/.test(lower) || /\b(steps to|guide to|tutorial)\b/.test(lower)) {
    return 'instructional';
  }

  // Comparison queries
  if (/\bvs\.?\b|\bversus\b|\bcompare|\bdifference between\b/.test(lower)) {
    return 'comparison';
  }

  // Definitional queries
  if (/^what is\b|^what are\b|^definition of\b/.test(lower)) {
    return 'definitional';
  }

  return 'neutral';
}

function checkQueryFormatAlignment(draft: string, brief: ContentBrief): AuditRuleResult {
  const intent = classifyQueryIntent(brief.title);

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
        details = `"How to" query should use numbered steps but no ordered list found.`;
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
      // Check first 400 chars for definition pattern
      const first400 = draft.substring(0, 400);
      const hasDefinition = /\b(is|are|refers to|means|defines)\b/i.test(first400);
      if (!hasDefinition) {
        isPassing = false;
        details = `Definitional query should start with a clear definition.`;
        remediation = 'Begin with "[Entity] is..." or "[Entity] refers to..." in the first paragraph.';
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

const GENERIC_ANCHORS = [
  'click here',
  'read more',
  'learn more',
  'here',
  'link',
  'this',
  'more',
  'view',
  'see'
];

function checkAnnotationTextQuality(draft: string): AuditRuleResult {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const issues: string[] = [];

  let match;
  while ((match = linkPattern.exec(draft)) !== null) {
    const anchor = match[1].toLowerCase().trim();
    const fullMatch = match[0];

    // Check for generic anchors
    if (GENERIC_ANCHORS.some(g => anchor === g || anchor.startsWith(g + ' '))) {
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
      remediation: 'Surround links with descriptive text that explains WHY the linked page is relevant. Avoid generic anchors like "click here".'
    };
  }

  return {
    ruleName: 'Annotation Text Quality',
    isPassing: true,
    details: 'Links have proper contextual annotation.'
  };
}

function checkSupplementaryLinkPlacement(draft: string): AuditRuleResult {
  // Find introduction section
  const introMatch = draft.match(/## Introduction\n\n([\s\S]*?)(?=\n## )/);
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
      remediation: 'Move related links to a "Related Topics" section at the end. Keep introduction focused on defining the main topic.'
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

  // Check unordered lists
  let match;
  while ((match = listPattern.exec(draft)) !== null) {
    const listStart = match.index;
    // Get 200 chars before the list
    const textBefore = draft.substring(Math.max(0, listStart - 200), listStart);

    // Check if last sentence before list ends with ":"
    const lastSentence = textBefore.split(/[.!?]/).pop() || '';
    const hasDefinitionSentence = /:[\s\n]*$/.test(lastSentence) ||
                                  /:[\s]*\n?$/.test(textBefore.trim());

    if (!hasDefinitionSentence) {
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

    const lastSentence = textBefore.split(/[.!?]/).pop() || '';
    const hasDefinitionSentence = /:[\s\n]*$/.test(lastSentence) ||
                                  /:[\s]*\n?$/.test(textBefore.trim());

    if (!hasDefinitionSentence) {
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
  'Information Density': 'poor_flow',
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
  'Image Placement': 'missing_image'
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
  'Information Density': 'suggestion',
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
  'Image Placement': 'critical'
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
