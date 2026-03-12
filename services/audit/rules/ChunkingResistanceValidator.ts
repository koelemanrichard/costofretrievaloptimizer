/**
 * Chunking Resistance Validator
 *
 * Validates that content sections can be extracted in isolation by RAG systems
 * and still make complete sense. Checks for cross-section references, entity
 * re-introduction, and section length optimization.
 *
 * Three validation methods:
 *   1. validate(text, entityName?) — Forward/backward reference detection
 *   2. validateSection(firstSentence, entityName, isFirstSentence) — Entity re-introduction
 *   3. validateSectionLength(sectionText) — Section length check (>500 words)
 */

export interface ChunkingIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

// English patterns
const EN_PATTERNS: RegExp[] = [
  /as mentioned (above|earlier|before|previously)/i,
  /as we (discussed|noted|stated) above/i,
  /as (discussed|noted|stated|explained) (earlier|before|previously)/i,
  /see (above|below|the previous section)/i,
  /referring to the (above|previous|following)/i,
  /in the (previous|next|following) section/i,
  /later in this article/i,
  /earlier in this article/i,
  /we covered this in/i,
  /refer to the section/i,
];

// Dutch patterns
const NL_PATTERNS: RegExp[] = [
  /zoals (eerder|hierboven|hiervoor) (vermeld|besproken|genoemd|uitgelegd)/i,
  /zie (hierboven|hieronder|het vorige)/i,
  /als eerder aangegeven/i,
  /zoals (hierboven|hieronder) beschreven/i,
  /in het vorige (hoofdstuk|deel|gedeelte)/i,
  /in de volgende (sectie|paragraaf)/i,
];

// German patterns
const DE_PATTERNS: RegExp[] = [
  /wie (oben|zuvor|bereits) (erwähnt|besprochen|genannt|erklärt)/i,
  /siehe (oben|unten|den vorherigen Abschnitt)/i,
  /im (vorherigen|nächsten|folgenden) Abschnitt/i,
  /wie bereits (oben|zuvor) (beschrieben|dargestellt)/i,
];

const ALL_PATTERNS = [...EN_PATTERNS, ...NL_PATTERNS, ...DE_PATTERNS];

// Pronouns that indicate missing entity re-introduction
const PRONOUN_STARTERS: RegExp = /^(it|this|that|these|those|het|er|es|dies|das)\b/i;

export class ChunkingResistanceValidator {
  /**
   * Checks text for forward/backward reference patterns that break
   * when content is extracted as standalone chunks by RAG systems.
   */
  validate(text: string, _entityName?: string): ChunkingIssue[] {
    const issues: ChunkingIssue[] = [];

    for (const pattern of ALL_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        issues.push({
          ruleId: 'CHUNKING_FORWARD_REF',
          severity: 'medium',
          title: 'Cross-section reference breaks chunking',
          description: `Text contains "${match[0]}". RAG systems may extract this section alone — the referenced content won't be available.`,
          affectedElement: match[0],
          exampleFix: 'Replace the cross-reference with the actual fact or statement being referenced.',
        });
      }
    }

    return issues;
  }

  /**
   * Checks whether the entity is properly re-introduced at the start of a section.
   * Only validates when isFirstSentence is true.
   * Flags if the entity name is absent AND the sentence starts with a pronoun.
   */
  validateSection(
    firstSentence: string,
    entityName: string,
    isFirstSentence: boolean
  ): ChunkingIssue[] {
    if (!isFirstSentence) return [];

    const trimmed = firstSentence.trim();
    if (!trimmed) return [];

    const entityPresent = trimmed.toLowerCase().includes(entityName.toLowerCase());
    const startsWithPronoun = PRONOUN_STARTERS.test(trimmed);

    if (!entityPresent && startsWithPronoun) {
      return [
        {
          ruleId: 'CHUNKING_ENTITY_REINTRO',
          severity: 'medium',
          title: 'Entity not re-introduced in section opening',
          description: `First sentence starts with a pronoun ("${trimmed.split(/\s+/)[0]}") without mentioning "${entityName}". When extracted as a standalone chunk, the subject is unclear.`,
          affectedElement: trimmed,
          exampleFix: `Replace the pronoun with "${entityName}" or naturally include it in the opening sentence.`,
        },
      ];
    }

    return [];
  }

  /**
   * Checks whether a section exceeds the recommended word count for RAG chunking.
   * Sections over 500 words risk being split by chunking algorithms.
   */
  validateSectionLength(sectionText: string): ChunkingIssue[] {
    const words = sectionText.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    if (wordCount > 500) {
      return [
        {
          ruleId: 'CHUNKING_SECTION_LENGTH',
          severity: 'medium',
          title: 'Section may split across multiple RAG chunks',
          description: `Section is ${wordCount} words. Sections over 500 words risk being split by RAG chunking algorithms, losing context boundaries.`,
          affectedElement: `${wordCount} words`,
          exampleFix: 'Split into 2-3 subsections (H3) of 200-400 words each.',
        },
      ];
    }

    return [];
  }
}
