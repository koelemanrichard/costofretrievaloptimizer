/**
 * Phase A: Language & Style Checks (1-19)
 *
 * Checks for modality, stop words, subject positioning, heading hierarchy,
 * generic headings, passive voice, heading-entity alignment, future tense,
 * stop word density, list count specificity, pronoun density, link positioning,
 * first sentence precision, centerpiece annotation, repetitive language,
 * LLM signature phrases, predicate consistency, coverage weight, and vocabulary richness.
 *
 * @module services/ai/contentGeneration/passes/auditChecks/languageStyleChecks
 */

import { AuditRuleResult } from '../../../../../types';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';
import { getAuditPatterns } from '../auditPatternsMultilingual';

// ============================================================================
// Check 1: Modality Certainty
// ============================================================================

export function checkModality(text: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 2: Stop Words
// ============================================================================

export function checkStopWords(text: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 3: Subject Positioning
// ============================================================================

export function checkSubjectPositioning(text: string, centralEntity: string): AuditRuleResult {
  const sentences = splitSentences(text);
  return checkSubjectPositioningCached(sentences, centralEntity);
}

// PERFORMANCE: Cached version that takes pre-computed sentences
export function checkSubjectPositioningCached(sentences: string[], centralEntity: string): AuditRuleResult {
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

// ============================================================================
// Check 4: Heading Hierarchy
// ============================================================================

export function checkHeadingHierarchy(text: string): AuditRuleResult {
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
      remediation: 'Ensure headings follow H1->H2->H3 without skipping levels.'
    };
  }
  return { ruleName: 'Heading Hierarchy', isPassing: true, details: 'Heading levels are properly nested.' };
}

// ============================================================================
// Check 5: Generic Headings
// ============================================================================

/**
 * Check for generic headings like "Introduction", "Conclusion", "Overview"
 * These should be replaced with topic-specific headings
 */
export function checkGenericHeadings(text: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 6: Passive Voice
// ============================================================================

/**
 * Check for excessive passive voice usage
 * Passive voice reduces clarity and authoritativeness
 */
export function checkPassiveVoice(text: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 7: Heading-Entity Alignment
// ============================================================================

/**
 * Check that headings contain or relate to the central entity
 * H2s should include terms that link back to the main topic
 */
export function checkHeadingEntityAlignment(text: string, centralEntity: string, topicTitle: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 8: Future Tense for Facts
// ============================================================================

/**
 * Check for inappropriate future tense usage for factual statements
 * Facts should use present tense ("X is") not future ("X will be")
 */
export function checkFutureTenseForFacts(text: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 9: Stop Word Density
// ============================================================================

/**
 * Check stop word density across the full document
 * High density of filler words reduces content quality
 */
export function checkStopWordDensity(text: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 10: List Count Specificity
// ============================================================================

export function checkListCountSpecificity(text: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 11: Pronoun Density
// ============================================================================

export function checkPronounDensity(text: string, topicTitle: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 12: Link Positioning
// ============================================================================

export function checkLinkPositioning(text: string): AuditRuleResult {
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

// ============================================================================
// Check 13: First Sentence Precision
// ============================================================================

export function checkFirstSentencePrecision(text: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 14: Centerpiece Annotation
// ============================================================================

export function checkCenterpieceAnnotation(text: string, centralEntity: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 15: Repetitive Language
// ============================================================================

/**
 * Check for repetitive language patterns with the central entity
 * Note: This is NOT an EAV density check - see checkEavDensity for that.
 * This function detects short, repetitive sentences that mention the entity
 * without adding new information (e.g., "Product X is great. Product X is nice.")
 */
export function checkRepetitiveLanguage(text: string, centralEntity: string): AuditRuleResult {
  const sentences = splitSentences(text);
  return checkRepetitiveLanguageCached(sentences, centralEntity);
}

// PERFORMANCE: Cached version that takes pre-computed sentences
export function checkRepetitiveLanguageCached(sentences: string[], centralEntity: string): AuditRuleResult {
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

// ============================================================================
// Check 16: LLM Signature Phrases
// ============================================================================

export function checkLLMSignaturePhrases(text: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 17: Predicate Consistency
// ============================================================================

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

export function checkPredicateConsistency(text: string, title: string, language?: string): AuditRuleResult {
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

// ============================================================================
// Check 18: Content Coverage Weight
// ============================================================================

export function checkCoverageWeight(text: string): AuditRuleResult {
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

// ============================================================================
// Check 19: Vocabulary Richness
// ============================================================================

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

export function checkVocabularyRichness(text: string): AuditRuleResult {
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
