# Semantic SEO Compliance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Increase Semantic SEO framework compliance from 78% to 95%+ by implementing missing validation rules, improving brief generation, and optimizing data efficiency.

**Architecture:** Add new validators for one-EAV-per-sentence, attribute ordering, and extend centerpiece validation to all sections. Enhance brief generation with visual placement maps and discourse anchor sequencing. Optimize database queries with section caching.

**Tech Stack:** TypeScript, Vitest, Supabase, React

---

## Task Overview

| # | Task | Priority | Files |
|---|------|----------|-------|
| 1 | One-EAV-per-sentence validator | Critical | New validator + tests |
| 2 | Attribute ordering validator | Critical | New validator + tests |
| 3 | Extend centerpiece to all sections | Critical | Modify existing validator |
| 4 | Add visual_placement_map to briefs | High | Modify types + prompts |
| 5 | Add discourse_anchor_sequence to briefs | High | Modify types + prompts |
| 6 | Section caching in orchestrator | Medium | Modify orchestrator |
| 7 | Brief caching in generation hook | Medium | Modify hook |

---

## Task 1: One-EAV-per-sentence Validator

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/eavPerSentenceValidator.ts`
- Create: `services/ai/contentGeneration/rulesEngine/validators/__tests__/eavPerSentenceValidator.test.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/index.ts:31-36` (add to PASS1_VALIDATORS)
- Modify: `services/ai/contentGeneration/rulesEngine/validators/index.ts:191-223` (add export)

**Context:**
The Semantic SEO framework requires "One EAV triple per sentence (maximize Information Density)". Currently no validator enforces this. The existing `EAVDensityValidator` checks if EAV terms appear in content but doesn't ensure the 1:1 sentence-to-triple ratio.

**Step 1: Write the failing test**

Create test file with initial tests:

```typescript
// services/ai/contentGeneration/rulesEngine/validators/__tests__/eavPerSentenceValidator.test.ts
import { describe, it, expect } from 'vitest';
import { EavPerSentenceValidator } from '../eavPerSentenceValidator';
import { SectionGenerationContext, SemanticTriple } from '../../../../../../types';

describe('EavPerSentenceValidator', () => {
  const createContext = (eavs: SemanticTriple[] = []): SectionGenerationContext => ({
    section: {
      heading: 'Test Section',
      level: 2,
      content_zone: 'MAIN',
    },
    brief: {
      contextualVectors: eavs,
    },
    businessInfo: {
      seedKeyword: 'Test Entity',
    },
    allSections: [],
    isYMYL: false,
  } as any);

  const createEav = (subject: string, relation: string, value: string): SemanticTriple => ({
    subject: { label: subject, type: 'Entity' },
    predicate: { relation, type: 'Attribute' },
    object: { value, type: 'string' },
  });

  describe('validate', () => {
    it('should pass when each sentence contains exactly one EAV', () => {
      const content = 'German Shepherds weigh between 50-90 pounds. German Shepherds live 9-13 years. German Shepherds originated in Germany.';
      const eavs = [
        createEav('German Shepherd', 'weight', '50-90 pounds'),
        createEav('German Shepherd', 'lifespan', '9-13 years'),
        createEav('German Shepherd', 'origin', 'Germany'),
      ];
      const result = EavPerSentenceValidator.validate(content, createContext(eavs));
      expect(result.filter(v => v.severity === 'error').length).toBe(0);
    });

    it('should warn when sentence contains no EAV terms', () => {
      const content = 'This is a wonderful dog breed. Many people love them.';
      const eavs = [createEav('German Shepherd', 'weight', '50-90 pounds')];
      const result = EavPerSentenceValidator.validate(content, createContext(eavs));
      expect(result.some(v => v.rule === 'SENTENCE_NO_EAV')).toBe(true);
    });

    it('should warn when sentence contains multiple EAV terms', () => {
      const content = 'German Shepherds weigh 50-90 pounds, live 9-13 years, and originated in Germany.';
      const eavs = [
        createEav('German Shepherd', 'weight', '50-90 pounds'),
        createEav('German Shepherd', 'lifespan', '9-13 years'),
        createEav('German Shepherd', 'origin', 'Germany'),
      ];
      const result = EavPerSentenceValidator.validate(content, createContext(eavs));
      expect(result.some(v => v.rule === 'SENTENCE_MULTIPLE_EAVS')).toBe(true);
    });

    it('should skip validation when no EAVs provided', () => {
      const content = 'This is some content without EAVs.';
      const result = EavPerSentenceValidator.validate(content, createContext([]));
      expect(result.length).toBe(0);
    });

    it('should handle sentences with partial EAV matches', () => {
      const content = 'The weight of a German Shepherd is notable.';
      const eavs = [createEav('German Shepherd', 'weight', '50-90 pounds')];
      const result = EavPerSentenceValidator.validate(content, createContext(eavs));
      // Should pass - contains entity and attribute (partial match is OK)
      expect(result.filter(v => v.severity === 'error').length).toBe(0);
    });
  });

  describe('countEavsInSentence', () => {
    it('should count EAV terms correctly', () => {
      const sentence = 'German Shepherds weigh 50-90 pounds.';
      const eavs = [
        createEav('German Shepherd', 'weight', '50-90 pounds'),
        createEav('German Shepherd', 'lifespan', '9-13 years'),
      ];
      const count = EavPerSentenceValidator.countEavsInSentence(sentence, eavs);
      expect(count).toBe(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/ai/contentGeneration/rulesEngine/validators/__tests__/eavPerSentenceValidator.test.ts`
Expected: FAIL with "Cannot find module '../eavPerSentenceValidator'"

**Step 3: Write minimal implementation**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/eavPerSentenceValidator.ts

import { ValidationViolation, SectionGenerationContext, SemanticTriple } from '../../../../../types';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

/**
 * Validates that each sentence contains exactly one EAV triple.
 * Framework rule: "One EAV triple per sentence (maximize Information Density)"
 */
export class EavPerSentenceValidator {
  /**
   * Minimum sentence word count to require EAV content.
   * Very short sentences (like "Yes." or "Indeed.") are exempt.
   */
  private static readonly MIN_WORDS_FOR_EAV = 5;

  /**
   * Maximum percentage of sentences allowed to have no EAV before error.
   * Warning at 30%, error at 50%.
   */
  private static readonly NO_EAV_WARNING_THRESHOLD = 0.3;
  private static readonly NO_EAV_ERROR_THRESHOLD = 0.5;

  /**
   * Validate that each sentence contains exactly one EAV triple.
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Get EAVs from context
    const eavs = context.brief?.contextualVectors || context.brief?.eavs || [];

    // Skip validation if no EAVs to check against
    if (!eavs || eavs.length === 0) {
      return violations;
    }

    const sentences = splitSentences(content);
    let sentencesWithNoEav = 0;
    let sentencesWithMultipleEav = 0;
    let totalValidSentences = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();

      // Skip very short sentences
      const wordCount = sentence.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount < this.MIN_WORDS_FOR_EAV) {
        continue;
      }

      totalValidSentences++;
      const eavCount = this.countEavsInSentence(sentence, eavs);

      if (eavCount === 0) {
        sentencesWithNoEav++;
        // Individual sentence warning only for longer sentences
        if (wordCount >= 10) {
          violations.push({
            rule: 'SENTENCE_NO_EAV',
            text: sentence.substring(0, 80) + (sentence.length > 80 ? '...' : ''),
            position: content.indexOf(sentence),
            suggestion: 'Sentence lacks factual EAV content. Add a specific fact (Entity-Attribute-Value).',
            severity: 'info', // Individual sentences are info level
          });
        }
      } else if (eavCount > 1) {
        sentencesWithMultipleEav++;
        violations.push({
          rule: 'SENTENCE_MULTIPLE_EAVS',
          text: sentence.substring(0, 80) + (sentence.length > 80 ? '...' : ''),
          position: content.indexOf(sentence),
          suggestion: `Sentence contains ${eavCount} EAV facts. Split into ${eavCount} separate sentences for optimal information density.`,
          severity: 'warning',
        });
      }
    }

    // Overall density check
    if (totalValidSentences > 0) {
      const noEavRatio = sentencesWithNoEav / totalValidSentences;

      if (noEavRatio >= this.NO_EAV_ERROR_THRESHOLD) {
        violations.push({
          rule: 'EAV_DENSITY_LOW',
          text: `${Math.round(noEavRatio * 100)}% of sentences lack EAV content`,
          position: 0,
          suggestion: 'More than half of sentences lack factual EAV content. Add specific facts to improve information density.',
          severity: 'error',
        });
      } else if (noEavRatio >= this.NO_EAV_WARNING_THRESHOLD) {
        violations.push({
          rule: 'EAV_DENSITY_MODERATE',
          text: `${Math.round(noEavRatio * 100)}% of sentences lack EAV content`,
          position: 0,
          suggestion: 'Consider adding more factual EAV content to improve information density.',
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Count how many EAV triples are referenced in a sentence.
   * A sentence "matches" an EAV if it contains either:
   * - The subject label AND the object value
   * - The subject label AND the predicate relation
   */
  static countEavsInSentence(sentence: string, eavs: SemanticTriple[]): number {
    const sentenceLower = sentence.toLowerCase();
    let count = 0;

    for (const eav of eavs) {
      const subjectLabel = (eav.subject?.label || (eav as any).entity || '').toLowerCase();
      const objectValue = String(eav.object?.value || (eav as any).value || '').toLowerCase();
      const predicateRelation = (eav.predicate?.relation || '').toLowerCase().replace(/_/g, ' ');

      // Skip if no subject
      if (!subjectLabel || subjectLabel.length < 2) continue;

      // Check if subject is mentioned
      const hasSubject = sentenceLower.includes(subjectLabel) ||
                        subjectLabel.split(' ').some(word =>
                          word.length >= 4 && sentenceLower.includes(word)
                        );

      if (!hasSubject) continue;

      // Check if object value or predicate relation is mentioned
      const hasObject = objectValue.length >= 2 && sentenceLower.includes(objectValue);
      const hasPredicate = predicateRelation.length >= 3 && sentenceLower.includes(predicateRelation);

      if (hasObject || hasPredicate) {
        count++;
      }
    }

    return count;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- services/ai/contentGeneration/rulesEngine/validators/__tests__/eavPerSentenceValidator.test.ts`
Expected: PASS (all 6 tests)

**Step 5: Register validator in index.ts**

Add import at top of file (after line 18):
```typescript
import { EavPerSentenceValidator } from './eavPerSentenceValidator';
```

Add to validate() method (after line 122, after WordCountValidator):
```typescript
    // 13b. EAV Per Sentence (one EAV per sentence rule)
    // Skip in Pass 1 - semantic structure refined in later passes
    if (runAll || !isPass1) {
      violations.push(...EavPerSentenceValidator.validate(content, context));
    }
```

Add export at end of file (after line 221):
```typescript
export { EavPerSentenceValidator } from './eavPerSentenceValidator';
```

**Step 6: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 7: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/eavPerSentenceValidator.ts
git add services/ai/contentGeneration/rulesEngine/validators/__tests__/eavPerSentenceValidator.test.ts
git add services/ai/contentGeneration/rulesEngine/validators/index.ts
git commit -m "feat: add one-EAV-per-sentence validator

Implements Semantic SEO framework rule: 'One EAV triple per sentence
(maximize Information Density)'. Validates that each meaningful sentence
contains exactly one EAV fact, warns on sentences with multiple EAVs.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Attribute Ordering Validator

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/attributeOrderingValidator.ts`
- Create: `services/ai/contentGeneration/rulesEngine/validators/__tests__/attributeOrderingValidator.test.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/index.ts`

**Context:**
The Semantic SEO framework requires "Attribute Types (Priority Order): 1. Unique, 2. Root, 3. Rare". Currently EAVs have categories but no validation ensures UNIQUE attributes appear before ROOT in the content structure.

**Step 1: Write the failing test**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/__tests__/attributeOrderingValidator.test.ts
import { describe, it, expect } from 'vitest';
import { AttributeOrderingValidator } from '../attributeOrderingValidator';
import { SectionGenerationContext, SemanticTriple, BriefSection } from '../../../../../../types';

describe('AttributeOrderingValidator', () => {
  const createSection = (heading: string, category: string): BriefSection => ({
    heading,
    level: 2,
    attribute_category: category as any,
    content_zone: 'MAIN',
  } as BriefSection);

  const createContext = (sections: BriefSection[]): SectionGenerationContext => ({
    section: sections[0] || createSection('Test', 'ROOT'),
    brief: {
      structured_outline: sections,
    },
    businessInfo: { seedKeyword: 'Test' },
    allSections: sections,
    isYMYL: false,
  } as any);

  describe('validateSectionOrder', () => {
    it('should pass when UNIQUE comes before ROOT', () => {
      const sections = [
        createSection('What Makes It Special', 'UNIQUE'),
        createSection('Basic Definition', 'ROOT'),
        createSection('Technical Details', 'RARE'),
      ];
      const result = AttributeOrderingValidator.validateSectionOrder(createContext(sections));
      expect(result.filter(v => v.severity === 'error').length).toBe(0);
    });

    it('should warn when ROOT comes before UNIQUE', () => {
      const sections = [
        createSection('Basic Definition', 'ROOT'),
        createSection('What Makes It Special', 'UNIQUE'),
      ];
      const result = AttributeOrderingValidator.validateSectionOrder(createContext(sections));
      expect(result.some(v => v.rule === 'ATTRIBUTE_ORDER_VIOLATION')).toBe(true);
    });

    it('should warn when RARE comes before ROOT', () => {
      const sections = [
        createSection('Technical Details', 'RARE'),
        createSection('Basic Definition', 'ROOT'),
      ];
      const result = AttributeOrderingValidator.validateSectionOrder(createContext(sections));
      expect(result.some(v => v.rule === 'ATTRIBUTE_ORDER_VIOLATION')).toBe(true);
    });

    it('should skip sections without attribute_category', () => {
      const sections = [
        { heading: 'Introduction', level: 1, content_zone: 'MAIN' } as BriefSection,
        createSection('Basic Definition', 'ROOT'),
      ];
      const result = AttributeOrderingValidator.validateSectionOrder(createContext(sections));
      expect(result.filter(v => v.severity === 'error').length).toBe(0);
    });

    it('should allow COMMON anywhere', () => {
      const sections = [
        createSection('General Info', 'COMMON'),
        createSection('What Makes It Special', 'UNIQUE'),
        createSection('More General Info', 'COMMON'),
        createSection('Basic Definition', 'ROOT'),
      ];
      const result = AttributeOrderingValidator.validateSectionOrder(createContext(sections));
      // Should not flag COMMON placements
      expect(result.filter(v => v.text.includes('COMMON')).length).toBe(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/ai/contentGeneration/rulesEngine/validators/__tests__/attributeOrderingValidator.test.ts`
Expected: FAIL with "Cannot find module '../attributeOrderingValidator'"

**Step 3: Write minimal implementation**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/attributeOrderingValidator.ts

import { ValidationViolation, SectionGenerationContext, AttributeCategory } from '../../../../../types';

/**
 * Validates that attribute categories appear in priority order:
 * UNIQUE -> ROOT -> RARE -> COMMON
 *
 * Framework rule: "Attribute Types (Priority Order): 1. Unique, 2. Root, 3. Rare"
 */
export class AttributeOrderingValidator {
  /**
   * Priority order for attribute categories (lower = higher priority)
   */
  private static readonly CATEGORY_PRIORITY: Record<string, number> = {
    'UNIQUE': 1,
    'CORE_DEFINITION': 1,        // Alias for UNIQUE
    'COMPETITIVE_EXPANSION': 1,  // Alias for UNIQUE
    'ROOT': 2,
    'SEARCH_DEMAND': 2,          // Alias for ROOT
    'RARE': 3,
    'COMMON': 4,
    'COMPOSITE': 4,              // Treated as COMMON
    'UNCLASSIFIED': 5,           // Lowest priority
  };

  /**
   * Validate that sections follow attribute category priority order.
   */
  static validateSectionOrder(context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    const sections = context.brief?.structured_outline || context.allSections || [];

    if (sections.length < 2) {
      return violations;
    }

    // Track highest priority seen so far (lower number = higher priority)
    let highestPrioritySeen = Infinity;
    let highestPrioritySection: string | null = null;

    for (const section of sections) {
      const category = section.attribute_category;

      // Skip sections without category or with COMMON (allowed anywhere)
      if (!category || category === 'COMMON' || category === 'COMPOSITE') {
        continue;
      }

      const priority = this.CATEGORY_PRIORITY[category] || 5;

      // Check if this section has higher priority than something we've already seen
      if (priority < highestPrioritySeen) {
        // This is fine - higher priority content appearing first
        highestPrioritySeen = priority;
        highestPrioritySection = section.heading;
      } else if (priority > highestPrioritySeen && highestPrioritySection) {
        // This section has lower priority but appears after higher priority content
        // This is fine - lower priority coming after higher priority is correct
      } else if (priority < highestPrioritySeen) {
        // Higher priority content appearing after lower priority = violation
        violations.push({
          rule: 'ATTRIBUTE_ORDER_VIOLATION',
          text: `"${section.heading}" (${category}) appears after "${highestPrioritySection}" (lower priority)`,
          position: 0,
          suggestion: `Move ${category} content ("${section.heading}") before lower-priority sections. Order should be: UNIQUE → ROOT → RARE → COMMON.`,
          severity: 'warning',
        });
      }
    }

    // Also check for specific violations: ROOT before UNIQUE
    const sectionCategories = sections
      .filter(s => s.attribute_category && s.attribute_category !== 'COMMON')
      .map(s => ({
        heading: s.heading,
        category: s.attribute_category!,
        priority: this.CATEGORY_PRIORITY[s.attribute_category!] || 5,
      }));

    for (let i = 0; i < sectionCategories.length - 1; i++) {
      const current = sectionCategories[i];
      const next = sectionCategories[i + 1];

      // If next section has higher priority (lower number) than current, flag it
      if (next.priority < current.priority) {
        violations.push({
          rule: 'ATTRIBUTE_ORDER_VIOLATION',
          text: `"${next.heading}" (${next.category}) should appear before "${current.heading}" (${current.category})`,
          position: 0,
          suggestion: `Reorder: ${next.category} content should precede ${current.category} content for optimal semantic structure.`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Validate attribute ordering - main entry point.
   * Called by RulesValidator for section-level validation.
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    // Section ordering is validated once per article, not per section
    // Only run this on the first section to avoid duplicate warnings
    const sections = context.brief?.structured_outline || [];
    const isFirstSection = sections.length > 0 &&
                          sections[0]?.heading === context.section?.heading;

    if (!isFirstSection) {
      return [];
    }

    return this.validateSectionOrder(context);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- services/ai/contentGeneration/rulesEngine/validators/__tests__/attributeOrderingValidator.test.ts`
Expected: PASS (all 5 tests)

**Step 5: Register validator in index.ts**

Add import (after EavPerSentenceValidator import):
```typescript
import { AttributeOrderingValidator } from './attributeOrderingValidator';
```

Add to validate() method (after PillarAlignmentValidator, around line 134):
```typescript
    // 14b. Attribute Ordering (UNIQUE -> ROOT -> RARE -> COMMON)
    // Skip in Pass 1 - structure is established in brief generation
    if (runAll || !isPass1) {
      violations.push(...AttributeOrderingValidator.validate(content, context));
    }
```

Add export:
```typescript
export { AttributeOrderingValidator } from './attributeOrderingValidator';
```

**Step 6: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 7: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/attributeOrderingValidator.ts
git add services/ai/contentGeneration/rulesEngine/validators/__tests__/attributeOrderingValidator.test.ts
git add services/ai/contentGeneration/rulesEngine/validators/index.ts
git commit -m "feat: add attribute ordering validator

Validates that sections follow Semantic SEO priority order:
UNIQUE → ROOT → RARE → COMMON. Flags sections where lower-priority
content appears before higher-priority content.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Extend Centerpiece Validation to All Sections

**Files:**
- Modify: `services/ai/contentGeneration/rulesEngine/validators/centerpieceValidator.ts:80-151`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/__tests__/centerpieceValidator.test.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/index.ts:78-84`

**Context:**
Currently `CenterpieceValidator` only validates intro sections. The Semantic SEO framework requires "First sentence after heading must directly answer the heading's question" for ALL sections, not just intro.

**Step 1: Add new tests for non-intro sections**

Add to existing test file:

```typescript
// Add to services/ai/contentGeneration/rulesEngine/validators/__tests__/centerpieceValidator.test.ts

describe('non-intro sections', () => {
  const createBodyContext = (heading: string, seedKeyword: string) => ({
    businessInfo: { seedKeyword },
    section: { heading, level: 2, content_zone: 'MAIN' },
    brief: { title: `All About ${seedKeyword}` },
  } as any);

  it('should validate first sentence answers heading for body sections', () => {
    const content = 'The weight of a German Shepherd typically ranges from 50 to 90 pounds.';
    const violations = CenterpieceValidator.validate(content, createBodyContext('How Much Does a German Shepherd Weigh?', 'German Shepherd'));
    // Should pass - first sentence answers the heading question
    expect(violations.filter(v => v.rule === 'HEADING_ANSWER_MISSING').length).toBe(0);
  });

  it('should flag when first sentence does not answer heading', () => {
    const content = 'Many people wonder about this topic. It is a common question.';
    const violations = CenterpieceValidator.validate(content, createBodyContext('How Much Does a German Shepherd Weigh?', 'German Shepherd'));
    // Should flag - first sentence is fluff, doesn't answer the question
    expect(violations.some(v => v.rule === 'HEADING_ANSWER_MISSING' || v.rule === 'FIRST_SENTENCE_NO_DEFINITIVE_VERB')).toBe(true);
  });

  it('should extract question keywords from heading', () => {
    const content = 'German Shepherds need approximately 2-3 cups of food daily.';
    const violations = CenterpieceValidator.validate(content, createBodyContext('How Much Should You Feed a German Shepherd?', 'German Shepherd'));
    // Should pass - answers the "how much" + "feed" question
    expect(violations.filter(v => v.rule === 'HEADING_ANSWER_MISSING').length).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/ai/contentGeneration/rulesEngine/validators/__tests__/centerpieceValidator.test.ts`
Expected: FAIL (new tests fail because validation doesn't exist for body sections)

**Step 3: Modify centerpieceValidator.ts**

Replace the validate method (lines 80-151) with extended logic:

```typescript
  /**
   * Validate centerpiece and heading-answer alignment.
   * - For intro sections: validates central entity definition in first 400 chars
   * - For all sections: validates first sentence answers the heading's implied question
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const language = context.language;
    const patterns = getCenterpiecePatterns(language);

    // Check if this is an intro section
    const headingLower = context.section?.heading?.toLowerCase() || '';
    const isIntroSection = context.section?.level === 1 ||
                          patterns.introHeadingPatterns.some(p => headingLower.includes(p));

    // S1: First sentence must have definitive verb (applies to ALL sections)
    const firstSentence = this.extractFirstSentence(content);
    if (firstSentence && !patterns.definitiveVerbsPattern.test(firstSentence)) {
      violations.push({
        rule: 'FIRST_SENTENCE_NO_DEFINITIVE_VERB',
        text: firstSentence.substring(0, 100) + (firstSentence.length > 100 ? '...' : ''),
        position: 0,
        suggestion: `First sentence lacks definitive verb. Start with a direct statement using verbs like: is, are, means, refers to, defines, represents.`,
        severity: isIntroSection ? 'error' : 'warning',
      });
    }

    // S2: For NON-intro sections, validate first sentence answers the heading
    if (!isIntroSection && context.section?.heading) {
      const headingAnswerResult = this.validateHeadingAnswer(
        firstSentence,
        context.section.heading,
        context.businessInfo?.seedKeyword,
        patterns
      );
      if (headingAnswerResult) {
        violations.push(headingAnswerResult);
      }
    }

    // S3: Centerpiece validation (intro sections only)
    const centralEntity = context.businessInfo?.seedKeyword;
    if (centralEntity && isIntroSection) {
      const first400 = content.substring(0, this.CENTERPIECE_CHAR_LIMIT);
      const entityLower = centralEntity.toLowerCase();
      const entityInFirst400 = first400.toLowerCase().includes(entityLower);

      if (!entityInFirst400) {
        violations.push({
          rule: 'CENTERPIECE_DELAYED',
          text: first400.substring(0, 100) + '...',
          position: 0,
          suggestion: `Central entity "${centralEntity}" must appear in the first 400 characters with a direct definition.`,
          severity: 'error',
        });
        return violations;
      }

      const hasDefinition = patterns.definitionPatterns.some(pattern => {
        const match = first400.match(pattern);
        if (match) {
          const beforeMatch = first400.substring(0, match.index || 0);
          return beforeMatch.toLowerCase().includes(entityLower) ||
                 match[0].toLowerCase().includes(entityLower.split(' ')[0]);
        }
        return false;
      });

      if (!hasDefinition) {
        violations.push({
          rule: 'CENTERPIECE_NO_DEFINITION',
          text: first400.substring(0, 100) + '...',
          position: 0,
          suggestion: `First 400 characters must contain a direct definition of "${centralEntity}" (e.g., "${centralEntity} is...")`,
          severity: 'error',
        });
      }
    }

    return violations;
  }

  /**
   * Validate that the first sentence answers the heading's implied question.
   * Returns a violation if the answer is missing or unclear.
   */
  private static validateHeadingAnswer(
    firstSentence: string,
    heading: string,
    centralEntity?: string,
    patterns?: LanguageCenterpiecePatterns
  ): ValidationViolation | null {
    if (!firstSentence || !heading) return null;

    const headingLower = heading.toLowerCase();
    const sentenceLower = firstSentence.toLowerCase();

    // Extract key terms from heading (removing question words and stopwords)
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who', 'does', 'do', 'is', 'are', 'can', 'should'];
    const stopWords = ['the', 'a', 'an', 'of', 'to', 'for', 'in', 'on', 'with', 'your', 'you'];

    const headingTerms = headingLower
      .replace(/[?!.,]/g, '')
      .split(/\s+/)
      .filter(word =>
        word.length >= 3 &&
        !questionWords.includes(word) &&
        !stopWords.includes(word)
      );

    // Check if first sentence contains key heading terms
    const matchedTerms = headingTerms.filter(term => sentenceLower.includes(term));
    const matchRatio = headingTerms.length > 0 ? matchedTerms.length / headingTerms.length : 1;

    // Also check for central entity mention
    const hasCentralEntity = centralEntity && sentenceLower.includes(centralEntity.toLowerCase());

    // If less than 40% of heading terms appear in first sentence and no central entity, flag it
    if (matchRatio < 0.4 && !hasCentralEntity) {
      return {
        rule: 'HEADING_ANSWER_MISSING',
        text: firstSentence.substring(0, 80) + (firstSentence.length > 80 ? '...' : ''),
        position: 0,
        suggestion: `First sentence should directly answer "${heading}". Include key terms: ${headingTerms.slice(0, 3).join(', ')}.`,
        severity: 'warning',
      };
    }

    return null;
  }
```

**Step 4: Update index.ts to run centerpiece for all sections**

Modify lines 78-84 in index.ts:

```typescript
    // 5. Centerpiece and Heading-Answer validation
    // Skip in Pass 1 - Pass 7 (Introduction Synthesis) handles intro
    // Now runs for ALL sections, not just intro
    if (runAll || !isPass1) {
      violations.push(...CenterpieceValidator.validate(content, context));
    }
```

**Step 5: Run tests to verify they pass**

Run: `npm test -- services/ai/contentGeneration/rulesEngine/validators/__tests__/centerpieceValidator.test.ts`
Expected: PASS (all tests including new ones)

**Step 6: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/centerpieceValidator.ts
git add services/ai/contentGeneration/rulesEngine/validators/__tests__/centerpieceValidator.test.ts
git add services/ai/contentGeneration/rulesEngine/validators/index.ts
git commit -m "feat: extend centerpiece validation to all sections

First sentence must now answer the heading's implied question for all
sections, not just intro. Validates that key heading terms appear in
the opening sentence. Intro sections still get full centerpiece check.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add visual_placement_map to Content Briefs

**Files:**
- Modify: `types.ts` (add interface)
- Modify: `config/prompts.ts:654-829` (update brief generation prompt)
- Modify: `config/schemas.ts:5-133` (add to schema)

**Context:**
The Semantic SEO framework requires "Images anchored to entity mentions". Currently `visual_semantics` exists but lacks entity anchoring. Adding `visual_placement_map` ties images to specific entity mentions in the outline.

**Step 1: Add interface to types.ts**

Find the ContentBrief interface (around line 760) and add after `visual_semantics`:

```typescript
  /** Map of image placements anchored to entity mentions */
  visual_placement_map?: VisualPlacementEntry[];
```

Add the new interface after `VisualSemantics` interface (around line 720):

```typescript
/**
 * Maps image placement to specific entity mentions in content.
 * Framework: "Images anchored to entity mentions"
 */
export interface VisualPlacementEntry {
  /** The section heading where image should appear */
  section_heading: string;
  /** The entity mention this image supports */
  entity_anchor: string;
  /** The EAV triple this image illustrates (if applicable) */
  eav_reference?: {
    subject: string;
    predicate: string;
    object: string;
  };
  /** Image type from visual_semantics */
  image_type: 'data_visualization' | 'comparison_table' | 'process_diagram' | 'infographic' | 'photograph' | 'screenshot';
  /** Why this image belongs at this location */
  placement_rationale: string;
}
```

**Step 2: Update CONTENT_BRIEF_SCHEMA in schemas.ts**

Add to the properties object (after visual_semantics, around line 105):

```typescript
      visual_placement_map: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            section_heading: { type: SchemaType.STRING },
            entity_anchor: { type: SchemaType.STRING },
            eav_reference: {
              type: SchemaType.OBJECT,
              properties: {
                subject: { type: SchemaType.STRING },
                predicate: { type: SchemaType.STRING },
                object: { type: SchemaType.STRING },
              },
            },
            image_type: { type: SchemaType.STRING },
            placement_rationale: { type: SchemaType.STRING },
          },
        },
      },
```

**Step 3: Update GENERATE_CONTENT_BRIEF_PROMPT in prompts.ts**

Add to Section IV (Visual Semantics) around line 712:

```
V4.7. VISUAL PLACEMENT ANCHORING: For each image in visual_semantics, specify:
   - Which section heading it belongs under
   - Which entity mention it anchors to
   - Which EAV triple it illustrates (if applicable)
   - Rationale for placement (why here, not elsewhere)
```

Add to the JSON output structure (around line 795):

```
  "visual_placement_map": [
    {
      "section_heading": "Section title where image appears",
      "entity_anchor": "The entity name mentioned near image",
      "eav_reference": { "subject": "Entity", "predicate": "attribute", "object": "value" },
      "image_type": "data_visualization|comparison_table|process_diagram|infographic|photograph|screenshot",
      "placement_rationale": "Why this image supports this entity mention"
    }
  ],
```

**Step 4: Update CONTENT_BRIEF_FALLBACK in schemas.ts**

Add default (around line 158):

```typescript
  visual_placement_map: [],
```

**Step 5: Run build to verify types**

Run: `npm run build`
Expected: No type errors

**Step 6: Commit**

```bash
git add types.ts
git add config/prompts.ts
git add config/schemas.ts
git commit -m "feat: add visual_placement_map to content briefs

Implements Semantic SEO rule: 'Images anchored to entity mentions'.
Each image now specifies which section, entity, and EAV it supports,
with rationale for placement.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add discourse_anchor_sequence to Content Briefs

**Files:**
- Modify: `types.ts` (add interface)
- Modify: `config/prompts.ts` (update prompt)
- Modify: `config/schemas.ts` (add to schema)

**Context:**
The Semantic SEO framework requires "Progressive Context Flow" with "each transition requires a Contextual Bridge". Currently `discourse_anchors` is a simple string array. Adding `discourse_anchor_sequence` provides structured transition mapping between sections.

**Step 1: Add interface to types.ts**

Add after `VisualPlacementEntry` interface:

```typescript
/**
 * Defines the discourse anchor sequence for progressive context flow.
 * Framework: "Each transition requires a Contextual Bridge"
 */
export interface DiscourseAnchorEntry {
  /** The section this anchor leads FROM */
  from_section: string;
  /** The section this anchor leads TO */
  to_section: string;
  /** The bridging concept that connects the two sections */
  bridge_concept: string;
  /** Key terms that should appear in the transition */
  transition_terms: string[];
  /** Type of transition */
  transition_type: 'elaboration' | 'contrast' | 'cause_effect' | 'sequence' | 'example' | 'summary';
}
```

Add to ContentBrief interface (after `discourse_anchors`):

```typescript
  /** Structured sequence of discourse anchors for section transitions */
  discourse_anchor_sequence?: DiscourseAnchorEntry[];
```

**Step 2: Update CONTENT_BRIEF_SCHEMA in schemas.ts**

Add to properties:

```typescript
      discourse_anchor_sequence: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            from_section: { type: SchemaType.STRING },
            to_section: { type: SchemaType.STRING },
            bridge_concept: { type: SchemaType.STRING },
            transition_terms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            transition_type: { type: SchemaType.STRING },
          },
        },
      },
```

**Step 3: Update GENERATE_CONTENT_BRIEF_PROMPT in prompts.ts**

Add to Section II (Structure & Flow) around line 698:

```
II.7. DISCOURSE ANCHOR SEQUENCE: For each section transition, define:
   - Which section leads to which (from_section → to_section)
   - The bridging concept that connects them
   - Key terms that should appear in the transition sentence
   - Type of transition (elaboration, contrast, cause_effect, sequence, example, summary)
```

Add to JSON output structure:

```
  "discourse_anchor_sequence": [
    {
      "from_section": "Previous section heading",
      "to_section": "Next section heading",
      "bridge_concept": "The concept linking these sections",
      "transition_terms": ["term1", "term2"],
      "transition_type": "elaboration|contrast|cause_effect|sequence|example|summary"
    }
  ],
```

**Step 4: Update CONTENT_BRIEF_FALLBACK**

```typescript
  discourse_anchor_sequence: [],
```

**Step 5: Run build**

Run: `npm run build`
Expected: No type errors

**Step 6: Commit**

```bash
git add types.ts
git add config/prompts.ts
git add config/schemas.ts
git commit -m "feat: add discourse_anchor_sequence to content briefs

Implements Semantic SEO rule: 'Each transition requires a Contextual
Bridge'. Defines structured transitions between sections with bridge
concepts, transition terms, and transition types.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Section Caching in Orchestrator

**Files:**
- Modify: `services/ai/contentGeneration/orchestrator.ts`

**Context:**
Current implementation fetches sections 90+ times per article generation. Adding in-memory caching reduces this to 10-15 fetches.

**Step 1: Read current orchestrator structure**

Read: `services/ai/contentGeneration/orchestrator.ts:1-100`
Understand the class structure and existing methods.

**Step 2: Add section cache property**

Add after existing private properties (around line 45):

```typescript
  /**
   * In-memory cache of sections per job to reduce database queries.
   * Key: jobId, Value: { sections, timestamp }
   */
  private sectionCache: Map<string, {
    sections: GeneratedSection[];
    timestamp: number;
  }> = new Map();

  /**
   * Cache TTL in milliseconds (30 seconds)
   */
  private readonly SECTION_CACHE_TTL = 30000;
```

**Step 3: Create cache helper methods**

Add after existing private methods:

```typescript
  /**
   * Get sections from cache if valid, otherwise fetch from database.
   */
  private async getCachedSections(jobId: string, forceFresh = false): Promise<GeneratedSection[]> {
    const cached = this.sectionCache.get(jobId);
    const now = Date.now();

    // Return cached if valid and not forcing fresh
    if (!forceFresh && cached && (now - cached.timestamp) < this.SECTION_CACHE_TTL) {
      return cached.sections;
    }

    // Fetch fresh from database
    const sections = await this.fetchSectionsFromDb(jobId);

    // Update cache
    this.sectionCache.set(jobId, {
      sections,
      timestamp: now,
    });

    return sections;
  }

  /**
   * Invalidate section cache for a job (call after writes)
   */
  private invalidateSectionCache(jobId: string): void {
    this.sectionCache.delete(jobId);
  }

  /**
   * Update a single section in cache without full invalidation
   */
  private updateSectionInCache(jobId: string, updatedSection: GeneratedSection): void {
    const cached = this.sectionCache.get(jobId);
    if (cached) {
      const index = cached.sections.findIndex(s => s.id === updatedSection.id);
      if (index >= 0) {
        cached.sections[index] = updatedSection;
      } else {
        cached.sections.push(updatedSection);
      }
      cached.timestamp = Date.now();
    }
  }
```

**Step 4: Update getSections to use cache**

Find the existing `getSections` method and modify:

```typescript
  async getSections(jobId: string): Promise<GeneratedSection[]> {
    return this.getCachedSections(jobId);
  }
```

**Step 5: Update section write methods to invalidate cache**

Find methods that write sections (like `saveSection`, `updateSection`) and add cache invalidation:

```typescript
  // After successful database write:
  this.invalidateSectionCache(jobId);
```

Or for single section updates:

```typescript
  // After successful single section update:
  this.updateSectionInCache(jobId, updatedSection);
```

**Step 6: Run tests**

Run: `npm test`
Expected: All tests pass (caching is transparent to callers)

**Step 7: Commit**

```bash
git add services/ai/contentGeneration/orchestrator.ts
git commit -m "perf: add section caching to orchestrator

Reduces database queries from 90+ to ~15 per article generation.
Cache has 30-second TTL and is invalidated on writes.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Brief Caching in Generation Hook

**Files:**
- Modify: `hooks/useContentGeneration.ts`

**Context:**
The generation hook fetches the content brief 2-3 times per generation run. Single fetch with caching reduces API overhead.

**Step 1: Read current hook structure**

Read: `hooks/useContentGeneration.ts:1-100`
Understand the state structure and existing brief fetching.

**Step 2: Add brief to state**

Find the state interface and add:

```typescript
  cachedBrief: ContentBrief | null;
```

Add to initial state:

```typescript
  cachedBrief: null,
```

**Step 3: Modify brief fetching logic**

Find where brief is fetched (likely in `startGeneration` or similar) and wrap with caching:

```typescript
  // Get brief - use cached if available and matches current topic
  let brief = state.cachedBrief;
  if (!brief || brief.topic_id !== topicId) {
    brief = await fetchBrief(topicId);
    setState(prev => ({ ...prev, cachedBrief: brief }));
  }
```

**Step 4: Clear cache on new generation**

When starting a completely new generation (different topic), clear the cache:

```typescript
  // Clear brief cache when switching topics
  if (currentTopicId !== newTopicId) {
    setState(prev => ({ ...prev, cachedBrief: null }));
  }
```

**Step 5: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add hooks/useContentGeneration.ts
git commit -m "perf: add brief caching to generation hook

Caches content brief during generation to avoid redundant fetches.
Cache is invalidated when switching to a different topic.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Verification Checklist

After completing all tasks, run these verification steps:

### Unit Tests
```bash
npm test -- --coverage
```
Expected: All tests pass, coverage maintained or improved

### Type Check
```bash
npm run build
```
Expected: No TypeScript errors

### Lint
```bash
npm run lint
```
Expected: No linting errors

### Integration Test
1. Create a new content brief for a test topic
2. Verify `visual_placement_map` and `discourse_anchor_sequence` are populated
3. Generate an article
4. Verify audit shows new validators running:
   - `SENTENCE_NO_EAV` / `SENTENCE_MULTIPLE_EAVS`
   - `ATTRIBUTE_ORDER_VIOLATION`
   - `HEADING_ANSWER_MISSING`
5. Check console for reduced database query count

### Manual Verification
1. Generate article with intentionally fluff-heavy content → Should flag `EAV_DENSITY_LOW`
2. Generate brief with out-of-order attribute sections → Should flag `ATTRIBUTE_ORDER_VIOLATION`
3. Generate section with non-answering first sentence → Should flag `HEADING_ANSWER_MISSING`

---

## Rollback Plan

If issues occur, revert individual commits:

```bash
# Find problematic commit
git log --oneline -10

# Revert specific commit
git revert <commit-hash>
```

Each task is independently revertible without affecting others.
