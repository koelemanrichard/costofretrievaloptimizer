// services/ai/contentGeneration/passes/auditChecks.ts
import { ContentBrief, BusinessInfo, AuditRuleResult } from '../../../../types';

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
