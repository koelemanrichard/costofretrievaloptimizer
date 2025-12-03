// services/ai/contentGeneration/passes/auditChecks.ts
import { ContentBrief, BusinessInfo, AuditRuleResult } from '../../../../types';

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
