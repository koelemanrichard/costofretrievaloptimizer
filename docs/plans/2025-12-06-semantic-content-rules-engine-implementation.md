# Semantic Content Rules Engine - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a Rules Engine that enforces Koray Tugberk GUBUR's Semantic Content Framework during content generation, ensuring format codes, discourse integration, prohibited language validation, and EAV density.

**Architecture:** A new `rulesEngine/` module under `services/ai/contentGeneration/` that intercepts section generation, validates output against semantic rules, and triggers regeneration on violations. Integrates with existing Pass 1 draft generation with minimal changes to the orchestrator.

**Tech Stack:** TypeScript, existing AI service providers, DataForSEO Keywords API (already have credentials in BusinessInfo)

---

## Phase 1: Type System Updates

### Task 1.1: Extend BriefSection Interface

**Files:**
- Modify: `types.ts:236-244`

**Step 1: Write the failing test**

```typescript
// Add to types.ts test or create new file if none exists
// For now, we verify by TypeScript compilation

// This is a type-only change - verification is TypeScript compilation
```

**Step 2: Add new fields to BriefSection**

In `types.ts`, find the `BriefSection` interface (line 236) and replace with:

```typescript
export type FormatCode = 'FS' | 'PAA' | 'LISTING' | 'DEFINITIVE' | 'TABLE' | 'PROSE';
export type ContentZone = 'MAIN' | 'SUPPLEMENTARY';

export interface BriefSection {
    key?: string;
    heading: string;
    level: number;
    order?: number;

    // NEW: Content Brief Codes
    format_code?: FormatCode;

    // NEW: Attribute classification for ordering
    attribute_category?: AttributeCategory; // Uses existing type: 'ROOT' | 'UNIQUE' | 'RARE' | 'COMMON'

    // NEW: Query priority from GSC/DataForSEO
    query_priority?: number;
    related_queries?: string[];

    // Existing fields (enhanced)
    subordinate_text_hint?: string;
    methodology_note?: string;

    // NEW: Required phrases from ["..."] codes
    required_phrases?: string[];

    // NEW: Internal linking targets
    anchor_texts?: { phrase: string; target_topic_id?: string }[];

    // NEW: Section classification
    content_zone?: ContentZone;

    subsections?: BriefSection[];
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to BriefSection

**Step 4: Commit**

```bash
git add types.ts
git commit -m "feat(types): extend BriefSection with format codes and semantic fields"
```

---

### Task 1.2: Add Validation Result Interfaces

**Files:**
- Modify: `types.ts` (append after BriefSection)

**Step 1: Add new interfaces**

Append to `types.ts`:

```typescript
// === Rules Engine Types ===

export interface ValidationViolation {
  rule: string;
  text: string;
  position: number;
  suggestion: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  passed: boolean;
  violations: ValidationViolation[];
  fixInstructions: string;
}

export interface DiscourseContext {
  previousParagraph: string;
  lastSentence: string;
  lastObject: string;
  subjectHint: string;
}

export interface SectionGenerationContext {
  section: BriefSection;
  brief: ContentBrief;
  businessInfo: BusinessInfo;
  discourseContext?: DiscourseContext;
  allSections: BriefSection[];
  isYMYL: boolean;
  ymylCategory?: 'HEALTH' | 'FINANCE' | 'LEGAL' | 'SAFETY';
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add types.ts
git commit -m "feat(types): add validation result and discourse context interfaces"
```

---

## Phase 2: Rules Engine Core Components

### Task 2.1: Create Rules Engine Directory Structure

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/index.ts`

**Step 1: Create directory and index file**

```typescript
// services/ai/contentGeneration/rulesEngine/index.ts

export { BriefCodeParser } from './briefCodeParser';
export { ContextChainer } from './contextChainer';
export { AttributeRanker } from './attributeRanker';
export { RulesValidator } from './validators';
export { SectionPromptBuilder } from './prompts/sectionPromptBuilder';
```

**Step 2: Verify file exists**

Run: `ls services/ai/contentGeneration/rulesEngine/`
Expected: index.ts exists

**Step 3: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/
git commit -m "feat(rulesEngine): create directory structure"
```

---

### Task 2.2: Implement BriefCodeParser

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/briefCodeParser.ts`

**Step 1: Write the failing test**

Create `services/ai/contentGeneration/rulesEngine/__tests__/briefCodeParser.test.ts`:

```typescript
import { BriefCodeParser } from '../briefCodeParser';

describe('BriefCodeParser', () => {
  describe('parseFormatCodes', () => {
    it('should detect [FS] Featured Snippet code', () => {
      const result = BriefCodeParser.parseFormatCodes('[FS] Write a concise definition');
      expect(result.formatCode).toBe('FS');
    });

    it('should detect [PAA] People Also Ask code', () => {
      const result = BriefCodeParser.parseFormatCodes('[PAA] Answer this question directly');
      expect(result.formatCode).toBe('PAA');
    });

    it('should detect [LISTING] code', () => {
      const result = BriefCodeParser.parseFormatCodes('[LISTING] Create an ordered list');
      expect(result.formatCode).toBe('LISTING');
    });

    it('should extract required phrases from quotes', () => {
      const result = BriefCodeParser.parseFormatCodes('Include "credit score calculation" and "payment history"');
      expect(result.requiredPhrases).toContain('credit score calculation');
      expect(result.requiredPhrases).toContain('payment history');
    });

    it('should extract anchor texts', () => {
      const result = BriefCodeParser.parseFormatCodes('[Anchor: German Shepherd diet guide]');
      expect(result.anchorTexts).toContain('German Shepherd diet guide');
    });

    it('should default to PROSE when no code found', () => {
      const result = BriefCodeParser.parseFormatCodes('Just regular instructions');
      expect(result.formatCode).toBe('PROSE');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=briefCodeParser`
Expected: FAIL with "Cannot find module '../briefCodeParser'"

**Step 3: Write minimal implementation**

Create `services/ai/contentGeneration/rulesEngine/briefCodeParser.ts`:

```typescript
// services/ai/contentGeneration/rulesEngine/briefCodeParser.ts

import { FormatCode } from '../../../../types';

export interface ParsedCodes {
  formatCode: FormatCode;
  requiredPhrases: string[];
  anchorTexts: string[];
}

export class BriefCodeParser {
  private static readonly FORMAT_PATTERNS: Record<FormatCode, RegExp> = {
    FS: /\[FS\]/i,
    PAA: /\[PAA\]/i,
    LISTING: /\[LISTING\]/i,
    DEFINITIVE: /\[DEFINITIVE\]/i,
    TABLE: /\[TABLE\]/i,
    PROSE: /^$/, // Never matches - default fallback
  };

  private static readonly PHRASE_PATTERN = /"([^"]+)"/g;
  private static readonly ANCHOR_PATTERN = /\[Anchor:\s*([^\]]+)\]/gi;

  static parseFormatCodes(methodologyNote: string): ParsedCodes {
    const result: ParsedCodes = {
      formatCode: 'PROSE',
      requiredPhrases: [],
      anchorTexts: [],
    };

    if (!methodologyNote) return result;

    // Detect format code
    for (const [code, pattern] of Object.entries(this.FORMAT_PATTERNS)) {
      if (code !== 'PROSE' && pattern.test(methodologyNote)) {
        result.formatCode = code as FormatCode;
        break;
      }
    }

    // Extract required phrases
    let phraseMatch;
    while ((phraseMatch = this.PHRASE_PATTERN.exec(methodologyNote)) !== null) {
      result.requiredPhrases.push(phraseMatch[1]);
    }

    // Extract anchor texts
    let anchorMatch;
    while ((anchorMatch = this.ANCHOR_PATTERN.exec(methodologyNote)) !== null) {
      result.anchorTexts.push(anchorMatch[1].trim());
    }

    return result;
  }

  static getFormatConstraints(formatCode: FormatCode): string {
    switch (formatCode) {
      case 'FS':
        return 'Featured Snippet target: Write 40-50 words MAX. Direct definition. First sentence after heading must be the complete answer.';
      case 'PAA':
        return 'People Also Ask target: Use Definition + Expansion structure. Start with direct answer, then elaborate.';
      case 'LISTING':
        return 'List format required: Start with a preamble sentence stating what the list contains and how many items (e.g., "The five main benefits include:"). Then use HTML list.';
      case 'DEFINITIVE':
        return 'Long-form comprehensive answer: Cover all qualifiers and signifiers. Include entity attributes, conditions, and exceptions.';
      case 'TABLE':
        return 'Table format required: First column = Entity Name, subsequent columns = Attributes. Include comparison data.';
      case 'PROSE':
      default:
        return 'Standard prose format. Focus on EAV density and discourse integration.';
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=briefCodeParser`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/
git commit -m "feat(rulesEngine): implement BriefCodeParser for format code detection"
```

---

### Task 2.3: Implement ContextChainer

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/contextChainer.ts`

**Step 1: Write the failing test**

Create `services/ai/contentGeneration/rulesEngine/__tests__/contextChainer.test.ts`:

```typescript
import { ContextChainer } from '../contextChainer';

describe('ContextChainer', () => {
  describe('extractForNext', () => {
    it('should extract last paragraph and sentence', () => {
      const content = `First paragraph about engines.

Second paragraph about fuel. Fuel combustion generates energy. Energy propels the pistons.`;

      const result = ContextChainer.extractForNext(content);

      expect(result.previousParagraph).toContain('Energy propels the pistons');
      expect(result.lastSentence).toBe('Energy propels the pistons.');
    });

    it('should extract grammatical object from last sentence', () => {
      const content = 'The German Shepherd requires daily exercise.';
      const result = ContextChainer.extractForNext(content);

      expect(result.lastObject).toBe('daily exercise');
    });

    it('should generate subject hint for next section', () => {
      const content = 'Dogs need proper nutrition.';
      const result = ContextChainer.extractForNext(content);

      expect(result.subjectHint).toBeTruthy();
    });
  });

  describe('buildContext', () => {
    it('should return empty context for first section', () => {
      const result = ContextChainer.buildContext(null);

      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=contextChainer`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `services/ai/contentGeneration/rulesEngine/contextChainer.ts`:

```typescript
// services/ai/contentGeneration/rulesEngine/contextChainer.ts

import { DiscourseContext } from '../../../../types';

export class ContextChainer {
  /**
   * Extract discourse context from generated content for the next section
   * Implements S-P-O chaining: Object of previous → Subject of next
   */
  static extractForNext(content: string): DiscourseContext {
    if (!content || content.trim().length === 0) {
      return {
        previousParagraph: '',
        lastSentence: '',
        lastObject: '',
        subjectHint: '',
      };
    }

    // Split into paragraphs
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    const lastParagraph = paragraphs[paragraphs.length - 1] || '';

    // Split into sentences (handle common abbreviations)
    const sentences = lastParagraph
      .replace(/([.?!])\s+/g, '$1|')
      .split('|')
      .filter(s => s.trim().length > 0);

    const lastSentence = sentences[sentences.length - 1]?.trim() || '';

    // Extract grammatical object (simplified: last noun phrase after verb)
    const lastObject = this.extractObject(lastSentence);

    // Generate subject hint for next section
    const subjectHint = lastObject
      ? `Start by connecting to "${lastObject}" from the previous section.`
      : '';

    return {
      previousParagraph: lastParagraph.trim(),
      lastSentence: lastSentence,
      lastObject: lastObject,
      subjectHint: subjectHint,
    };
  }

  /**
   * Extract the grammatical object from a sentence
   * Simplified NLP: looks for noun phrases after common verbs
   */
  private static extractObject(sentence: string): string {
    if (!sentence) return '';

    // Remove trailing punctuation
    const clean = sentence.replace(/[.?!]+$/, '').trim();

    // Common patterns: "X requires Y", "X needs Y", "X provides Y", "X is Y"
    const verbPatterns = [
      /(?:requires?|needs?|provides?|offers?|includes?|contains?|has|have)\s+(.+)$/i,
      /(?:is|are|was|were)\s+(?:a|an|the)?\s*(.+)$/i,
      /(?:uses?|creates?|generates?|produces?)\s+(.+)$/i,
    ];

    for (const pattern of verbPatterns) {
      const match = clean.match(pattern);
      if (match && match[1]) {
        // Return the captured object, trimmed
        return match[1].trim();
      }
    }

    // Fallback: last 2-4 words as likely object
    const words = clean.split(/\s+/);
    if (words.length >= 3) {
      return words.slice(-3).join(' ');
    }

    return '';
  }

  /**
   * Build discourse context for section generation
   */
  static buildContext(previousContent: string | null): DiscourseContext | null {
    if (!previousContent || previousContent.trim().length === 0) {
      return null;
    }

    return this.extractForNext(previousContent);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=contextChainer`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/
git commit -m "feat(rulesEngine): implement ContextChainer for S-P-O discourse integration"
```

---

### Task 2.4: Implement AttributeRanker

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/attributeRanker.ts`

**Step 1: Write the failing test**

Create `services/ai/contentGeneration/rulesEngine/__tests__/attributeRanker.test.ts`:

```typescript
import { AttributeRanker } from '../attributeRanker';
import { BriefSection } from '../../../../types';

describe('AttributeRanker', () => {
  it('should order sections by attribute category: ROOT > UNIQUE > RARE > COMMON', () => {
    const sections: BriefSection[] = [
      { heading: 'Common Info', level: 2, attribute_category: 'COMMON' },
      { heading: 'Unique Feature', level: 2, attribute_category: 'UNIQUE' },
      { heading: 'Definition', level: 2, attribute_category: 'ROOT' },
      { heading: 'Rare Detail', level: 2, attribute_category: 'RARE' },
    ];

    const ordered = AttributeRanker.orderSections(sections);

    expect(ordered[0].attribute_category).toBe('ROOT');
    expect(ordered[1].attribute_category).toBe('UNIQUE');
    expect(ordered[2].attribute_category).toBe('RARE');
    expect(ordered[3].attribute_category).toBe('COMMON');
  });

  it('should order by query_priority within same category', () => {
    const sections: BriefSection[] = [
      { heading: 'Low Priority', level: 2, attribute_category: 'ROOT', query_priority: 10 },
      { heading: 'High Priority', level: 2, attribute_category: 'ROOT', query_priority: 100 },
    ];

    const ordered = AttributeRanker.orderSections(sections);

    expect(ordered[0].heading).toBe('High Priority');
    expect(ordered[1].heading).toBe('Low Priority');
  });

  it('should preserve subsection order within parent', () => {
    const sections: BriefSection[] = [
      {
        heading: 'Parent',
        level: 2,
        attribute_category: 'ROOT',
        subsections: [
          { heading: 'Sub A', level: 3 },
          { heading: 'Sub B', level: 3 },
        ]
      },
    ];

    const ordered = AttributeRanker.orderSections(sections);

    expect(ordered[0].subsections?.[0].heading).toBe('Sub A');
    expect(ordered[0].subsections?.[1].heading).toBe('Sub B');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=attributeRanker`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `services/ai/contentGeneration/rulesEngine/attributeRanker.ts`:

```typescript
// services/ai/contentGeneration/rulesEngine/attributeRanker.ts

import { BriefSection, AttributeCategory } from '../../../../types';

export class AttributeRanker {
  private static readonly CATEGORY_PRIORITY: Record<string, number> = {
    ROOT: 1,
    CORE_DEFINITION: 1, // Legacy alias
    UNIQUE: 2,
    SEARCH_DEMAND: 2, // Legacy alias
    RARE: 3,
    COMPETITIVE_EXPANSION: 3, // Legacy alias
    COMMON: 4,
    COMPOSITE: 4, // Legacy alias
  };

  /**
   * Order sections by attribute category, then by query priority
   * Order: ROOT → UNIQUE → RARE → COMMON
   */
  static orderSections(sections: BriefSection[]): BriefSection[] {
    // Create a copy to avoid mutating original
    const ordered = [...sections].sort((a, b) => {
      // First, sort by attribute category
      const categoryA = this.getCategoryPriority(a.attribute_category);
      const categoryB = this.getCategoryPriority(b.attribute_category);

      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }

      // Within same category, sort by query_priority (higher first)
      const priorityA = a.query_priority ?? 0;
      const priorityB = b.query_priority ?? 0;

      return priorityB - priorityA;
    });

    return ordered;
  }

  private static getCategoryPriority(category?: AttributeCategory): number {
    if (!category) return 999; // Unclassified goes last
    return this.CATEGORY_PRIORITY[category] ?? 999;
  }

  /**
   * Classify a section's attribute category based on heading analysis
   * Used when briefs don't have explicit classification
   */
  static inferCategory(heading: string, centralEntity: string): AttributeCategory {
    const lowerHeading = heading.toLowerCase();
    const lowerEntity = centralEntity.toLowerCase();

    // ROOT indicators: definitions, what is, overview
    if (
      lowerHeading.includes('what is') ||
      lowerHeading.includes('definition') ||
      lowerHeading.includes('overview') ||
      lowerHeading.includes('introduction') ||
      lowerHeading === lowerEntity
    ) {
      return 'ROOT';
    }

    // UNIQUE indicators: specific features, unique aspects
    if (
      lowerHeading.includes('unique') ||
      lowerHeading.includes('feature') ||
      lowerHeading.includes('advantage') ||
      lowerHeading.includes('vs') ||
      lowerHeading.includes('comparison')
    ) {
      return 'UNIQUE';
    }

    // RARE indicators: specific, technical, detailed
    if (
      lowerHeading.includes('technical') ||
      lowerHeading.includes('specification') ||
      lowerHeading.includes('detailed') ||
      lowerHeading.includes('advanced')
    ) {
      return 'RARE';
    }

    // Default to COMMON
    return 'COMMON';
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=attributeRanker`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/
git commit -m "feat(rulesEngine): implement AttributeRanker for section ordering"
```

---

## Phase 3: Validators Implementation

### Task 3.1: Create Validators Directory and Index

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/index.ts`

**Step 1: Create the index file**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/index.ts

import { ValidationResult, ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { ProhibitedLanguageValidator } from './prohibitedLanguage';
import { EAVDensityValidator } from './eavDensity';
import { ModalityValidator } from './modalityValidator';
import { CenterpieceValidator } from './centerpieceValidator';
import { YMYLValidator } from './ymylValidator';
import { FormatCodeValidator } from './formatCodeValidator';

export class RulesValidator {
  /**
   * Run all validators against generated content
   */
  static validate(content: string, context: SectionGenerationContext): ValidationResult {
    const violations: ValidationViolation[] = [];

    // 1. Prohibited Language
    violations.push(...ProhibitedLanguageValidator.validate(content));

    // 2. EAV Density
    violations.push(...EAVDensityValidator.validate(content));

    // 3. Modality
    violations.push(...ModalityValidator.validate(content, context));

    // 4. Format Code Compliance
    if (context.section.format_code) {
      violations.push(...FormatCodeValidator.validate(content, context.section.format_code));
    }

    // 5. Centerpiece (intro only)
    if (context.section.level === 1 || context.section.heading.toLowerCase().includes('introduction')) {
      violations.push(...CenterpieceValidator.validate(content, context));
    }

    // 6. YMYL Safe Answer Protocol
    if (context.isYMYL) {
      violations.push(...YMYLValidator.validate(content, context));
    }

    // Build fix instructions
    const fixInstructions = this.buildFixInstructions(violations);

    return {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      fixInstructions,
    };
  }

  private static buildFixInstructions(violations: ValidationViolation[]): string {
    if (violations.length === 0) return '';

    const errorViolations = violations.filter(v => v.severity === 'error');
    if (errorViolations.length === 0) return '';

    let instructions = 'FIX REQUIRED:\n';
    errorViolations.forEach((v, i) => {
      instructions += `${i + 1}. [${v.rule}] ${v.suggestion}\n`;
    });

    return instructions;
  }
}

export { ProhibitedLanguageValidator } from './prohibitedLanguage';
export { EAVDensityValidator } from './eavDensity';
export { ModalityValidator } from './modalityValidator';
export { CenterpieceValidator } from './centerpieceValidator';
export { YMYLValidator } from './ymylValidator';
export { FormatCodeValidator } from './formatCodeValidator';
```

**Step 2: Commit placeholder**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/
git commit -m "feat(validators): create validators index with RulesValidator orchestrator"
```

---

### Task 3.2: Implement ProhibitedLanguageValidator

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/prohibitedLanguage.ts`

**Step 1: Write the failing test**

Create `services/ai/contentGeneration/rulesEngine/validators/__tests__/prohibitedLanguage.test.ts`:

```typescript
import { ProhibitedLanguageValidator } from '../prohibitedLanguage';

describe('ProhibitedLanguageValidator', () => {
  it('should detect stop words', () => {
    const content = 'The product is basically very good and also reliable.';
    const violations = ProhibitedLanguageValidator.validate(content);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some(v => v.text.includes('basically'))).toBe(true);
    expect(violations.some(v => v.text.includes('very'))).toBe(true);
    expect(violations.some(v => v.text.includes('also'))).toBe(true);
  });

  it('should detect opinionated language', () => {
    const content = 'I think this is a beautiful solution. Unfortunately, it has issues.';
    const violations = ProhibitedLanguageValidator.validate(content);

    expect(violations.some(v => v.rule === 'OPINIONS')).toBe(true);
  });

  it('should detect analogies', () => {
    const content = 'The CPU is like a brain that processes information.';
    const violations = ProhibitedLanguageValidator.validate(content);

    expect(violations.some(v => v.rule === 'ANALOGIES')).toBe(true);
  });

  it('should detect fluff openers', () => {
    const content = 'In this article, we will explore the benefits of exercise.';
    const violations = ProhibitedLanguageValidator.validate(content);

    expect(violations.some(v => v.rule === 'FLUFF_OPENERS')).toBe(true);
  });

  it('should pass clean content', () => {
    const content = 'German Shepherds require 60-90 minutes of daily exercise. The breed maintains muscle mass through regular activity.';
    const violations = ProhibitedLanguageValidator.validate(content);

    // Should have no error-level violations
    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=prohibitedLanguage`
Expected: FAIL

**Step 3: Write implementation**

Create `services/ai/contentGeneration/rulesEngine/validators/prohibitedLanguage.ts`:

```typescript
// services/ai/contentGeneration/rulesEngine/validators/prohibitedLanguage.ts

import { ValidationViolation } from '../../../../../types';

export const PROHIBITED_PATTERNS = {
  STOP_WORDS: [
    'also', 'basically', 'actually', 'very', 'really',
    'just', 'quite', 'anyway', 'maybe', 'perhaps',
    'certainly', 'definitely', 'obviously', 'simply',
  ],

  OPINIONS: [
    /\b(I think|we think|I believe|we believe|in my opinion|in our opinion)\b/gi,
    /\b(unfortunately|fortunately|hopefully|ideally|interestingly)\b/gi,
    /\b(beautiful|amazing|wonderful|terrible|horrible|awesome|fantastic)\b/gi,
  ],

  ANALOGIES: [
    /\b(like a|similar to|is like|as if|imagine|think of it as)\b/gi,
    /\b(metaphor|analogy|compared to a|just like)\b/gi,
  ],

  PASSIVE_VOICE: [
    /\b(is|are|was|were|been|being)\s+(being\s+)?\w+ed\b/gi,
  ],

  FUTURE_FOR_FACTS: [
    /\bwill (always|never|typically|usually|generally)\b/gi,
  ],

  AMBIGUOUS_PRONOUNS: [
    /^(It|They|This|That|These|Those)\s+(is|are|was|were|said|mentioned|noted)\b/gi,
  ],

  FLUFF_OPENERS: [
    /^(In this (article|guide|post|section)|Let's (dive|explore|look|discuss)|Have you ever wondered)/i,
    /^(Welcome to|Today we|We will|We're going to)/i,
  ],
};

export class ProhibitedLanguageValidator {
  static validate(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Check stop words
    const words = content.toLowerCase().split(/\s+/);
    for (const stopWord of PROHIBITED_PATTERNS.STOP_WORDS) {
      const indices = this.findWordIndices(content, stopWord);
      for (const index of indices) {
        violations.push({
          rule: 'STOP_WORDS',
          text: stopWord,
          position: index,
          suggestion: `Remove filler word "${stopWord}" - it adds no semantic value`,
          severity: 'warning',
        });
      }
    }

    // Check opinions
    for (const pattern of PROHIBITED_PATTERNS.OPINIONS) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'OPINIONS',
          text: match[0],
          position: match.index || 0,
          suggestion: `Remove opinionated language "${match[0]}" - use factual statements instead`,
          severity: 'error',
        });
      }
    }

    // Check analogies
    for (const pattern of PROHIBITED_PATTERNS.ANALOGIES) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'ANALOGIES',
          text: match[0],
          position: match.index || 0,
          suggestion: `Remove analogy "${match[0]}" - analogies introduce irrelevant entities into the semantic space`,
          severity: 'error',
        });
      }
    }

    // Check fluff openers (only at start)
    for (const pattern of PROHIBITED_PATTERNS.FLUFF_OPENERS) {
      if (pattern.test(content)) {
        const match = content.match(pattern);
        violations.push({
          rule: 'FLUFF_OPENERS',
          text: match?.[0] || '',
          position: 0,
          suggestion: 'Remove fluff opener - start with a direct definition or fact',
          severity: 'error',
        });
      }
    }

    // Check ambiguous pronouns at sentence starts
    const sentences = content.split(/[.!?]+\s*/);
    sentences.forEach((sentence, idx) => {
      for (const pattern of PROHIBITED_PATTERNS.AMBIGUOUS_PRONOUNS) {
        if (pattern.test(sentence)) {
          const match = sentence.match(pattern);
          violations.push({
            rule: 'AMBIGUOUS_PRONOUNS',
            text: match?.[0] || '',
            position: content.indexOf(sentence),
            suggestion: 'Replace ambiguous pronoun with explicit entity name',
            severity: 'warning',
          });
        }
      }
    });

    // Check future tense for facts
    for (const pattern of PROHIBITED_PATTERNS.FUTURE_FOR_FACTS) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'FUTURE_FOR_FACTS',
          text: match[0],
          position: match.index || 0,
          suggestion: `Use present tense for permanent facts - change "${match[0]}" to present simple`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  private static findWordIndices(content: string, word: string): number[] {
    const indices: number[] = [];
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      indices.push(match.index);
    }
    return indices;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=prohibitedLanguage`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/
git commit -m "feat(validators): implement ProhibitedLanguageValidator"
```

---

### Task 3.3: Implement EAVDensityValidator

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/eavDensity.ts`

**Step 1: Write the failing test**

Create `services/ai/contentGeneration/rulesEngine/validators/__tests__/eavDensity.test.ts`:

```typescript
import { EAVDensityValidator } from '../eavDensity';

describe('EAVDensityValidator', () => {
  it('should pass sentences with Entity-Attribute-Value', () => {
    const content = 'German Shepherds require 60 minutes of daily exercise. The breed weighs between 50-90 pounds.';
    const violations = EAVDensityValidator.validate(content);

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });

  it('should flag sentences without clear EAV structure', () => {
    const content = 'It is good. Things happen.';
    const violations = EAVDensityValidator.validate(content);

    expect(violations.length).toBeGreaterThan(0);
  });

  it('should provide EAV density score', () => {
    const content = 'German Shepherds have a double coat. The outer coat is dense.';
    const score = EAVDensityValidator.calculateDensity(content);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=eavDensity`
Expected: FAIL

**Step 3: Write implementation**

Create `services/ai/contentGeneration/rulesEngine/validators/eavDensity.ts`:

```typescript
// services/ai/contentGeneration/rulesEngine/validators/eavDensity.ts

import { ValidationViolation } from '../../../../../types';

export class EAVDensityValidator {
  // Minimum word count for a sentence to require full EAV
  private static readonly MIN_WORDS_FOR_EAV = 4;

  // Patterns indicating presence of Entity-Attribute-Value
  private static readonly EAV_PATTERNS = [
    // Entity + verb + value: "X is/are Y"
    /\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*\s+(?:is|are|was|were|has|have|had|requires?|needs?|provides?|offers?|contains?|includes?|weighs?|measures?|costs?|lasts?)\s+/i,
    // Entity + attribute + value: "The X of Y is Z"
    /\bThe\s+\w+\s+of\s+\w+\s+(?:is|are|measures?|equals?)/i,
    // Numeric values (strong EAV indicator)
    /\d+(?:\.\d+)?(?:\s*(?:percent|%|kg|lb|cm|mm|m|ft|hours?|minutes?|days?|weeks?|months?|years?))?/i,
  ];

  // Patterns indicating weak/empty sentences
  private static readonly WEAK_PATTERNS = [
    /^It\s+(?:is|was)\s+\w+\.$/i,
    /^Things?\s+(?:is|are|happen)/i,
    /^This\s+(?:is|was)\s+\w+\.$/i,
  ];

  static validate(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const sentences = this.splitSentences(content);

    sentences.forEach((sentence, index) => {
      const words = sentence.trim().split(/\s+/);

      // Skip very short sentences
      if (words.length < this.MIN_WORDS_FOR_EAV) return;

      // Check for weak patterns
      for (const pattern of this.WEAK_PATTERNS) {
        if (pattern.test(sentence)) {
          violations.push({
            rule: 'EAV_DENSITY',
            text: sentence,
            position: content.indexOf(sentence),
            suggestion: 'Sentence lacks Entity-Attribute-Value structure. Add specific entity, attribute, and measurable value.',
            severity: 'warning',
          });
          return;
        }
      }

      // Check if sentence has EAV structure
      const hasEAV = this.EAV_PATTERNS.some(pattern => pattern.test(sentence));

      if (!hasEAV && words.length >= 6) {
        violations.push({
          rule: 'EAV_DENSITY',
          text: sentence,
          position: content.indexOf(sentence),
          suggestion: 'Sentence may lack clear Entity-Attribute-Value. Ensure it contains: Entity (subject) + Attribute (verb/property) + Value (object/measurement).',
          severity: 'warning',
        });
      }
    });

    return violations;
  }

  static calculateDensity(content: string): number {
    const sentences = this.splitSentences(content);
    if (sentences.length === 0) return 0;

    let eavCount = 0;
    sentences.forEach(sentence => {
      const hasEAV = this.EAV_PATTERNS.some(pattern => pattern.test(sentence));
      if (hasEAV) eavCount++;
    });

    return Math.round((eavCount / sentences.length) * 100);
  }

  private static splitSentences(content: string): string[] {
    return content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=eavDensity`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/
git commit -m "feat(validators): implement EAVDensityValidator"
```

---

### Task 3.4: Implement ModalityValidator

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/modalityValidator.ts`

**Step 1: Write the failing test**

Create `services/ai/contentGeneration/rulesEngine/validators/__tests__/modalityValidator.test.ts`:

```typescript
import { ModalityValidator } from '../modalityValidator';

describe('ModalityValidator', () => {
  it('should flag uncertain language for facts', () => {
    const content = 'Water might be important for health. It can be essential.';
    const context = { isYMYL: false, section: { heading: 'Water Benefits' } } as any;
    const violations = ModalityValidator.validate(content, context);

    expect(violations.some(v => v.rule === 'MODALITY_UNCERTAINTY')).toBe(true);
  });

  it('should pass definitive statements', () => {
    const content = 'Water is essential for metabolic function. The body requires adequate hydration.';
    const context = { isYMYL: false, section: { heading: 'Water Benefits' } } as any;
    const violations = ModalityValidator.validate(content, context);

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });

  it('should allow can/may for genuine possibilities', () => {
    const content = 'Excessive water intake can cause hyponatremia.';
    const context = { isYMYL: false, section: { heading: 'Risks' } } as any;
    const violations = ModalityValidator.validate(content, context);

    // Should not flag 'can' in a risks context
    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=modalityValidator`
Expected: FAIL

**Step 3: Write implementation**

Create `services/ai/contentGeneration/rulesEngine/validators/modalityValidator.ts`:

```typescript
// services/ai/contentGeneration/rulesEngine/validators/modalityValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

export class ModalityValidator {
  // Weak/uncertain modality patterns
  private static readonly UNCERTAIN_PATTERNS = [
    /\b(?:might|could)\s+be\b/gi,
    /\b(?:may|might)\s+(?:have|cause|lead|result)\b/gi,
    /\bmight\s+\w+/gi,
  ];

  // Patterns that are acceptable in possibility/risk contexts
  private static readonly POSSIBILITY_CONTEXTS = [
    'risk', 'danger', 'warning', 'caution', 'side effect',
    'potential', 'possible', 'exception', 'condition',
  ];

  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const heading = context.section.heading?.toLowerCase() || '';

    // Check if we're in a possibility context (risks, warnings, etc.)
    const isPossibilityContext = this.POSSIBILITY_CONTEXTS.some(
      term => heading.includes(term)
    );

    // If in possibility context, uncertain language is acceptable
    if (isPossibilityContext) {
      return violations;
    }

    // Check for uncertain modality
    for (const pattern of this.UNCERTAIN_PATTERNS) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'MODALITY_UNCERTAINTY',
          text: match[0],
          position: match.index || 0,
          suggestion: `Replace uncertain "${match[0]}" with definitive "is/are" for facts, or use "can/may" only for genuine possibilities`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=modalityValidator`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/
git commit -m "feat(validators): implement ModalityValidator"
```

---

### Task 3.5: Implement CenterpieceValidator

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/centerpieceValidator.ts`

**Step 1: Write the failing test**

Create `services/ai/contentGeneration/rulesEngine/validators/__tests__/centerpieceValidator.test.ts`:

```typescript
import { CenterpieceValidator } from '../centerpieceValidator';

describe('CenterpieceValidator', () => {
  const createContext = (seedKeyword: string) => ({
    businessInfo: { seedKeyword },
    section: { heading: 'Introduction', level: 1 },
    brief: { title: `What is ${seedKeyword}` },
  } as any);

  it('should pass when definition appears in first 400 chars', () => {
    const content = 'German Shepherd is a medium-to-large working dog breed that originated in Germany. The breed is known for its intelligence and loyalty.';
    const violations = CenterpieceValidator.validate(content, createContext('German Shepherd'));

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });

  it('should flag when definition is delayed', () => {
    const content = 'Dogs have been companions to humans for thousands of years. There are many breeds to choose from. Each breed has unique characteristics. '.repeat(10) + 'German Shepherd is a working dog breed.';
    const violations = CenterpieceValidator.validate(content, createContext('German Shepherd'));

    expect(violations.some(v => v.rule === 'CENTERPIECE_DELAYED')).toBe(true);
  });

  it('should flag fluff before definition', () => {
    const content = 'Have you ever wondered about dogs? In this article, we explore German Shepherds.';
    const violations = CenterpieceValidator.validate(content, createContext('German Shepherd'));

    expect(violations.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=centerpieceValidator`
Expected: FAIL

**Step 3: Write implementation**

Create `services/ai/contentGeneration/rulesEngine/validators/centerpieceValidator.ts`:

```typescript
// services/ai/contentGeneration/rulesEngine/validators/centerpieceValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

export class CenterpieceValidator {
  private static readonly CENTERPIECE_CHAR_LIMIT = 400;

  // Definition patterns: "X is a Y"
  private static readonly DEFINITION_PATTERNS = [
    /\b\w+(?:\s+\w+)*\s+(?:is|are)\s+(?:a|an|the)\s+/i,
    /\b\w+(?:\s+\w+)*\s+(?:refers? to|means?|defines?)\s+/i,
  ];

  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const centralEntity = context.businessInfo?.seedKeyword || '';

    if (!centralEntity) return violations;

    const first400 = content.substring(0, this.CENTERPIECE_CHAR_LIMIT);
    const entityLower = centralEntity.toLowerCase();

    // Check if central entity appears in first 400 chars
    const entityInFirst400 = first400.toLowerCase().includes(entityLower);

    if (!entityInFirst400) {
      violations.push({
        rule: 'CENTERPIECE_DELAYED',
        text: first400.substring(0, 100) + '...',
        position: 0,
        suggestion: `Central entity "${centralEntity}" must appear in the first 400 characters with a direct definition. Start with "${centralEntity} is a..."`,
        severity: 'error',
      });
      return violations;
    }

    // Check if there's a proper definition structure
    const hasDefinition = this.DEFINITION_PATTERNS.some(pattern => {
      const match = first400.match(pattern);
      if (match) {
        // Verify the definition is about the central entity
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
        suggestion: `First 400 characters must contain a direct definition: "${centralEntity} is a [category] that [function]"`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=centerpieceValidator`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/
git commit -m "feat(validators): implement CenterpieceValidator for first 400 char rule"
```

---

### Task 3.6: Implement YMYLValidator

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/ymylValidator.ts`

**Step 1: Write the failing test**

Create `services/ai/contentGeneration/rulesEngine/validators/__tests__/ymylValidator.test.ts`:

```typescript
import { YMYLValidator } from '../ymylValidator';

describe('YMYLValidator', () => {
  const createYMYLContext = (category: 'HEALTH' | 'FINANCE' | 'LEGAL' | 'SAFETY') => ({
    isYMYL: true,
    ymylCategory: category,
    section: { heading: 'Treatment Options' },
    brief: {},
    businessInfo: {},
  } as any);

  it('should detect YMYL category from content', () => {
    expect(YMYLValidator.detectYMYL('symptoms of diabetes treatment')).toEqual({
      isYMYL: true,
      category: 'HEALTH',
    });

    expect(YMYLValidator.detectYMYL('investment portfolio management')).toEqual({
      isYMYL: true,
      category: 'FINANCE',
    });
  });

  it('should require Safe Answer Protocol for boolean questions', () => {
    const content = 'Aspirin is effective for headaches.';
    const violations = YMYLValidator.validate(content, createYMYLContext('HEALTH'));

    // Should suggest adding condition/exception
    expect(violations.some(v => v.suggestion.includes('condition') || v.suggestion.includes('However'))).toBe(true);
  });

  it('should pass content with proper Safe Answer structure', () => {
    const content = 'Aspirin is effective for mild headaches. However, patients with stomach ulcers should consult a doctor before use.';
    const violations = YMYLValidator.validate(content, createYMYLContext('HEALTH'));

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=ymylValidator`
Expected: FAIL

**Step 3: Write implementation**

Create `services/ai/contentGeneration/rulesEngine/validators/ymylValidator.ts`:

```typescript
// services/ai/contentGeneration/rulesEngine/validators/ymylValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

type YMYLCategory = 'HEALTH' | 'FINANCE' | 'LEGAL' | 'SAFETY';

export class YMYLValidator {
  private static readonly YMYL_KEYWORDS: Record<YMYLCategory, string[]> = {
    HEALTH: [
      'symptom', 'treatment', 'medication', 'disease', 'diagnosis',
      'medical', 'health', 'doctor', 'patient', 'therapy', 'drug',
      'dosage', 'side effect', 'prescription', 'surgery',
    ],
    FINANCE: [
      'investment', 'loan', 'mortgage', 'tax', 'insurance',
      'credit', 'debt', 'financial', 'bank', 'retirement',
      'stock', 'bond', 'portfolio', 'interest rate',
    ],
    LEGAL: [
      'law', 'legal', 'lawsuit', 'attorney', 'court',
      'contract', 'liability', 'regulation', 'compliance',
      'rights', 'statute', 'litigation',
    ],
    SAFETY: [
      'safety', 'emergency', 'danger', 'warning', 'hazard',
      'risk', 'injury', 'accident', 'protection', 'recall',
    ],
  };

  private static readonly CONDITION_PATTERNS = [
    /\b(?:however|unless|depending on|except|although|but)\b/i,
    /\b(?:in (?:some|certain) cases?|under (?:certain|specific) conditions?)\b/i,
    /\b(?:consult|speak with|see)\s+(?:a|your)?\s*(?:doctor|physician|professional|advisor)\b/i,
  ];

  static detectYMYL(content: string): { isYMYL: boolean; category?: YMYLCategory } {
    const lowerContent = content.toLowerCase();

    for (const [category, keywords] of Object.entries(this.YMYL_KEYWORDS)) {
      const matchCount = keywords.filter(kw => lowerContent.includes(kw)).length;
      if (matchCount >= 2) {
        return { isYMYL: true, category: category as YMYLCategory };
      }
    }

    return { isYMYL: false };
  }

  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    if (!context.isYMYL) return violations;

    // Safe Answer Protocol: Check for condition/exception
    const hasCondition = this.CONDITION_PATTERNS.some(pattern => pattern.test(content));

    if (!hasCondition) {
      violations.push({
        rule: 'YMYL_SAFE_ANSWER',
        text: content.substring(0, 100) + '...',
        position: 0,
        suggestion: 'YMYL content requires Safe Answer Protocol: Add condition/exception (However, Unless, Depending on...) or professional consultation recommendation',
        severity: 'warning',
      });
    }

    // Check for citation placement (fact first, then source)
    const badCitationPattern = /^According to\s+/i;
    const sentences = content.split(/[.!?]+\s*/);

    sentences.forEach(sentence => {
      if (badCitationPattern.test(sentence.trim())) {
        violations.push({
          rule: 'YMYL_CITATION_ORDER',
          text: sentence,
          position: content.indexOf(sentence),
          suggestion: 'State the fact first, then the source. Change "According to X, Y" to "Y, according to X"',
          severity: 'warning',
        });
      }
    });

    return violations;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=ymylValidator`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/
git commit -m "feat(validators): implement YMYLValidator with Safe Answer Protocol"
```

---

### Task 3.7: Implement FormatCodeValidator

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/formatCodeValidator.ts`

**Step 1: Write the failing test**

Create `services/ai/contentGeneration/rulesEngine/validators/__tests__/formatCodeValidator.test.ts`:

```typescript
import { FormatCodeValidator } from '../formatCodeValidator';

describe('FormatCodeValidator', () => {
  it('should validate [FS] word count (40-50 words)', () => {
    const shortContent = 'This is too short.';
    const violations = FormatCodeValidator.validate(shortContent, 'FS');

    expect(violations.some(v => v.rule === 'FS_WORD_COUNT')).toBe(true);
  });

  it('should pass [FS] with correct word count', () => {
    // Exactly 45 words
    const content = 'German Shepherds are medium to large sized working dogs that originated in Germany in the late nineteenth century. The breed is known for its intelligence loyalty and versatility making it popular for police work search and rescue and as family companions.';
    const violations = FormatCodeValidator.validate(content, 'FS');

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });

  it('should validate [LISTING] has preamble', () => {
    const contentWithoutPreamble = '- Item one\n- Item two\n- Item three';
    const violations = FormatCodeValidator.validate(contentWithoutPreamble, 'LISTING');

    expect(violations.some(v => v.rule === 'LISTING_NO_PREAMBLE')).toBe(true);
  });

  it('should pass [LISTING] with proper preamble', () => {
    const content = 'The five main benefits of exercise include:\n- Improved cardiovascular health\n- Weight management\n- Better mood';
    const violations = FormatCodeValidator.validate(content, 'LISTING');

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=formatCodeValidator`
Expected: FAIL

**Step 3: Write implementation**

Create `services/ai/contentGeneration/rulesEngine/validators/formatCodeValidator.ts`:

```typescript
// services/ai/contentGeneration/rulesEngine/validators/formatCodeValidator.ts

import { ValidationViolation, FormatCode } from '../../../../../types';

export class FormatCodeValidator {
  private static readonly FS_MIN_WORDS = 40;
  private static readonly FS_MAX_WORDS = 50;

  static validate(content: string, formatCode: FormatCode): ValidationViolation[] {
    switch (formatCode) {
      case 'FS':
        return this.validateFeaturedSnippet(content);
      case 'PAA':
        return this.validatePAA(content);
      case 'LISTING':
        return this.validateListing(content);
      case 'TABLE':
        return this.validateTable(content);
      case 'DEFINITIVE':
        return this.validateDefinitive(content);
      default:
        return [];
    }
  }

  private static validateFeaturedSnippet(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const words = content.trim().split(/\s+/).length;

    if (words < this.FS_MIN_WORDS) {
      violations.push({
        rule: 'FS_WORD_COUNT',
        text: `${words} words`,
        position: 0,
        suggestion: `Featured Snippet must be 40-50 words. Current: ${words}. Add more detail.`,
        severity: 'error',
      });
    } else if (words > this.FS_MAX_WORDS) {
      violations.push({
        rule: 'FS_WORD_COUNT',
        text: `${words} words`,
        position: 0,
        suggestion: `Featured Snippet must be 40-50 words. Current: ${words}. Reduce to fit snippet box.`,
        severity: 'error',
      });
    }

    // Check for direct definition at start
    const startsWithDefinition = /^[A-Z][^.!?]*\s+(?:is|are|refers?\s+to|means?)\s+/i.test(content);
    if (!startsWithDefinition) {
      violations.push({
        rule: 'FS_NO_DEFINITION',
        text: content.substring(0, 50) + '...',
        position: 0,
        suggestion: 'Featured Snippet must start with direct definition: "[Entity] is/are..."',
        severity: 'warning',
      });
    }

    return violations;
  }

  private static validatePAA(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // PAA should have definition + expansion structure
    const sentences = content.split(/[.!?]+\s*/).filter(s => s.trim().length > 0);

    if (sentences.length < 2) {
      violations.push({
        rule: 'PAA_STRUCTURE',
        text: content,
        position: 0,
        suggestion: 'PAA answer needs Definition + Expansion. Add elaboration after the direct answer.',
        severity: 'warning',
      });
    }

    return violations;
  }

  private static validateListing(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Check for list markers
    const hasListMarkers = /[-*•]\s+|^\d+\.\s+/m.test(content);

    if (!hasListMarkers) {
      violations.push({
        rule: 'LISTING_NO_LIST',
        text: content.substring(0, 100),
        position: 0,
        suggestion: 'LISTING format requires bullet points or numbered list.',
        severity: 'error',
      });
      return violations;
    }

    // Check for preamble (sentence before list)
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const firstLineIsList = /^[-*•]\s+|^\d+\.\s+/.test(lines[0]?.trim() || '');

    if (firstLineIsList) {
      violations.push({
        rule: 'LISTING_NO_PREAMBLE',
        text: lines[0],
        position: 0,
        suggestion: 'Lists require a preamble sentence before items. E.g., "The main benefits include:"',
        severity: 'error',
      });
    }

    return violations;
  }

  private static validateTable(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Check for table structure (markdown or HTML)
    const hasTable = /\|.*\|/.test(content) || /<table/i.test(content);

    if (!hasTable) {
      violations.push({
        rule: 'TABLE_NO_TABLE',
        text: content.substring(0, 100),
        position: 0,
        suggestion: 'TABLE format requires actual table markup (Markdown | or HTML <table>).',
        severity: 'error',
      });
    }

    return violations;
  }

  private static validateDefinitive(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const words = content.trim().split(/\s+/).length;

    // Definitive should be comprehensive - at least 200 words
    if (words < 200) {
      violations.push({
        rule: 'DEFINITIVE_TOO_SHORT',
        text: `${words} words`,
        position: 0,
        suggestion: `DEFINITIVE format requires comprehensive coverage. Current: ${words} words. Expand with more detail.`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=formatCodeValidator`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/
git commit -m "feat(validators): implement FormatCodeValidator for all format codes"
```

---

## Phase 4: Query Priority Service

### Task 4.1: Add DataForSEO Keywords API Integration

**Files:**
- Modify: `services/serpApiService.ts`

**Step 1: Write the failing test**

This is an API integration - manual testing required.

**Step 2: Add Keywords API function to serpApiService.ts**

Add this function to `services/serpApiService.ts`:

```typescript
/**
 * Fetch search volume data from DataForSEO Keywords API
 * Used for Query Probability ordering in content generation
 */
export const fetchKeywordSearchVolume = async (
  keywords: string[],
  login: string,
  password: string,
  locationCode: string = '2840', // US default
  languageCode: string = 'en'
): Promise<Map<string, number>> => {
  const fetchFn = async () => {
    const postData = [{
      keywords: keywords.slice(0, 100), // API limit
      location_code: parseInt(locationCode) || 2840,
      language_code: languageCode,
    }];

    const url = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live';
    const credentials = btoa(`${login}:${password}`);

    try {
      const response = await fetchWithProxy(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        throw new Error(`DataForSEO Keywords API HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status_code !== 20000) {
        throw new Error(`DataForSEO Keywords API Error: ${data.status_message}`);
      }

      const result = new Map<string, number>();
      const items = data.tasks?.[0]?.result || [];

      for (const item of items) {
        if (item.keyword && item.search_volume !== undefined) {
          result.set(item.keyword.toLowerCase(), item.search_volume);
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to fetch keyword search volume:", error);
      return new Map();
    }
  };

  const cacheKey = keywords.slice(0, 5).join(',');
  return cacheService.cacheThrough('keywords:volume', { cacheKey }, fetchFn, 86400); // Cache 24h
};
```

**Step 3: Export the new function**

Ensure the function is exported from the file.

**Step 4: Commit**

```bash
git add services/serpApiService.ts
git commit -m "feat(api): add DataForSEO Keywords API for search volume data"
```

---

### Task 4.2: Implement QueryPriorityService

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/queryPriorityService.ts`

**Step 1: Write implementation**

Create `services/ai/contentGeneration/rulesEngine/queryPriorityService.ts`:

```typescript
// services/ai/contentGeneration/rulesEngine/queryPriorityService.ts

import { BriefSection, BusinessInfo, GscRow } from '../../../../types';
import { fetchKeywordSearchVolume } from '../../../serpApiService';

export class QueryPriorityService {
  /**
   * Enrich sections with query priority scores
   * Priority = (normalized_volume * 0.6) + (normalized_impressions * 0.4)
   */
  static async enrichWithPriority(
    sections: BriefSection[],
    businessInfo: BusinessInfo,
    gscData?: GscRow[]
  ): Promise<BriefSection[]> {
    // Extract keywords from section headings
    const keywords = sections.map(s => s.heading.toLowerCase());

    // Fetch search volume if credentials available
    let volumeMap = new Map<string, number>();

    if (businessInfo.dataforseoLogin && businessInfo.dataforseoPassword) {
      try {
        volumeMap = await fetchKeywordSearchVolume(
          keywords,
          businessInfo.dataforseoLogin,
          businessInfo.dataforseoPassword,
          this.getLocationCode(businessInfo.targetMarket),
          businessInfo.language
        );
      } catch (error) {
        console.warn('Could not fetch search volume, using GSC data only:', error);
      }
    }

    // Build impressions map from GSC data
    const impressionsMap = new Map<string, number>();
    if (gscData) {
      for (const row of gscData) {
        const query = row.query?.toLowerCase();
        if (query) {
          impressionsMap.set(query, row.impressions || 0);
        }
      }
    }

    // Calculate max values for normalization
    const maxVolume = Math.max(...volumeMap.values(), 1);
    const maxImpressions = Math.max(...impressionsMap.values(), 1);

    // Enrich sections with priority
    return sections.map(section => {
      const heading = section.heading.toLowerCase();

      const volume = volumeMap.get(heading) || 0;
      const impressions = this.findBestMatch(heading, impressionsMap) || 0;

      const normalizedVolume = volume / maxVolume;
      const normalizedImpressions = impressions / maxImpressions;

      const priority = Math.round(
        (normalizedVolume * 0.6 + normalizedImpressions * 0.4) * 100
      );

      return {
        ...section,
        query_priority: priority,
        related_queries: this.findRelatedQueries(heading, gscData),
      };
    });
  }

  private static getLocationCode(targetMarket?: string): string {
    const marketCodes: Record<string, string> = {
      'US': '2840',
      'UK': '2826',
      'NL': '2528',
      'DE': '2276',
      'FR': '2250',
      'ES': '2724',
    };
    return marketCodes[targetMarket?.toUpperCase() || ''] || '2840';
  }

  private static findBestMatch(heading: string, map: Map<string, number>): number {
    // Exact match
    if (map.has(heading)) return map.get(heading)!;

    // Partial match - find queries containing the heading words
    const headingWords = heading.split(/\s+/);
    let bestScore = 0;

    for (const [query, value] of map) {
      const matchingWords = headingWords.filter(w => query.includes(w));
      const score = matchingWords.length / headingWords.length;
      if (score > 0.5 && value > bestScore) {
        bestScore = value;
      }
    }

    return bestScore;
  }

  private static findRelatedQueries(heading: string, gscData?: GscRow[]): string[] {
    if (!gscData) return [];

    const headingWords = heading.toLowerCase().split(/\s+/);

    return gscData
      .filter(row => {
        const query = row.query?.toLowerCase() || '';
        return headingWords.some(w => query.includes(w));
      })
      .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
      .slice(0, 5)
      .map(row => row.query || '');
  }
}
```

**Step 2: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/
git commit -m "feat(rulesEngine): implement QueryPriorityService with DataForSEO + GSC"
```

---

## Phase 5: Prompt Updates

### Task 5.1: Create SectionPromptBuilder

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts`

**Step 1: Create the prompt builder**

```typescript
// services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts

import { SectionGenerationContext, BriefSection, FormatCode } from '../../../../../types';
import { BriefCodeParser } from '../briefCodeParser';
import { PROHIBITED_PATTERNS } from '../validators/prohibitedLanguage';

export class SectionPromptBuilder {
  /**
   * Build a comprehensive prompt for section generation
   * Includes all semantic framework rules
   */
  static build(context: SectionGenerationContext, fixInstructions?: string): string {
    const { section, brief, businessInfo, discourseContext, isYMYL, ymylCategory } = context;

    // Parse format codes from methodology note
    const parsedCodes = BriefCodeParser.parseFormatCodes(section.methodology_note || '');
    const formatConstraints = BriefCodeParser.getFormatConstraints(parsedCodes.formatCode);

    let prompt = `You are an expert content writer following the Koray Tuğberk GÜBÜR Semantic Content Framework.

**CRITICAL LANGUAGE**: Write ALL content in ${businessInfo.language || 'English'}. Target market: ${businessInfo.targetMarket || 'Global'}.

## Section to Generate
Heading: ${section.heading}
Level: H${section.level}

## Format Requirements
${formatConstraints}
${section.subordinate_text_hint ? `\n**MANDATORY FIRST SENTENCE**: ${section.subordinate_text_hint}` : ''}

## Article Context
Title: ${brief.title}
Central Entity: ${businessInfo.seedKeyword}

`;

    // Add discourse context if available
    if (discourseContext) {
      prompt += `## Discourse Integration (S-P-O Chaining)
The previous section ended with: "${discourseContext.lastSentence}"
Key object to reference: "${discourseContext.lastObject}"
${discourseContext.subjectHint}
**START** your section by connecting to this context.

`;
    }

    // Add required phrases
    if (parsedCodes.requiredPhrases.length > 0) {
      prompt += `## Required Phrases (MUST include exactly)
${parsedCodes.requiredPhrases.map(p => `- "${p}"`).join('\n')}

`;
    }

    // Add anchor texts for internal linking
    if (parsedCodes.anchorTexts.length > 0) {
      prompt += `## Internal Links (use these as anchor text)
${parsedCodes.anchorTexts.map(a => `- [${a}]`).join('\n')}
Place links AFTER defining the concept, never in the first sentence.

`;
    }

    // Add YMYL protocol
    if (isYMYL) {
      prompt += `## YMYL Safe Answer Protocol (${ymylCategory} content)
1. Boolean questions: Start with Yes/No
2. Include condition/exception: "However...", "Unless...", "Depending on..."
3. Fact first, then citation (not "According to X...")
4. Consider professional consultation recommendation

`;
    }

    // Add prohibited patterns
    prompt += `## STRICTLY PROHIBITED
- Stop words: ${PROHIBITED_PATTERNS.STOP_WORDS.slice(0, 8).join(', ')}...
- Opinions: "I think", "we believe", "unfortunately", "beautiful", "amazing"
- Analogies: "like a", "similar to", "is like", "imagine"
- Fluff openers: "In this article", "Let's dive", "Have you ever wondered"
- Ambiguous pronouns: Use "${businessInfo.seedKeyword}" instead of "it/they/this"

## MANDATORY RULES
1. **EAV Density**: Every sentence = Entity + Attribute + Value
2. **Modality**: Facts use "is/are", possibilities use "can/may"
3. **Active Voice**: Subject-Predicate-Object structure
4. **No Repetition**: Each sentence adds NEW information
5. **Complete Sentences**: Never end mid-thought

`;

    // Add fix instructions if this is a retry
    if (fixInstructions) {
      prompt += `## CORRECTIONS REQUIRED (from previous attempt)
${fixInstructions}

`;
    }

    prompt += `Write the section content now. Output ONLY prose content, no heading or metadata.`;

    return prompt;
  }
}
```

**Step 2: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/prompts/
git commit -m "feat(rulesEngine): implement SectionPromptBuilder with all framework rules"
```

---

### Task 5.2: Update GENERATE_CONTENT_BRIEF_PROMPT

**Files:**
- Modify: `config/prompts.ts`

**Step 1: Update the prompt to generate new fields**

Find `GENERATE_CONTENT_BRIEF_PROMPT` in `config/prompts.ts` (around line 428) and update the output schema section:

```typescript
// In the OUTPUT JSON STRUCTURE section, update structured_outline schema:

  "structured_outline": [
    {
      "heading": "string",
      "level": number,
      "format_code": "FS | PAA | LISTING | DEFINITIVE | TABLE | PROSE",
      "attribute_category": "ROOT | UNIQUE | RARE | COMMON",
      "content_zone": "MAIN | SUPPLEMENTARY",
      "subordinate_text_hint": "string (MANDATORY first sentence structure)",
      "methodology_note": "string (Include [FS], [PAA], etc. codes and [\"required phrases\"])",
      "required_phrases": ["string"],
      "anchor_texts": [{ "phrase": "string", "target_topic_id": "string" }],
      "subsections": [...]
    }
  ],
```

Also add these new rules to the STRICT EXECUTION RULES section:

```typescript
#### **VI. FORMAT CODE ASSIGNMENT**
1. **[FS] Featured Snippet**: Assign to the primary definition/answer section. 40-50 words max.
2. **[PAA] People Also Ask**: Assign to FAQ-style questions.
3. **[LISTING]**: Assign when listing features, steps, benefits, etc.
4. **[DEFINITIVE]**: Assign to comprehensive explanations.
5. **[TABLE]**: Assign to comparative data sections.

#### **VII. ATTRIBUTE CATEGORY CLASSIFICATION**
For each section, classify as:
- **ROOT**: Core defining attributes (definitions, what is, overview)
- **UNIQUE**: Differentiating features (vs competitors, unique aspects)
- **RARE**: Specific/technical details (specifications, advanced usage)
- **COMMON**: General/shared attributes (general info, context)
```

**Step 2: Verify prompts.ts compiles**

Run: `npx tsc --noEmit`
Expected: No errors in prompts.ts

**Step 3: Commit**

```bash
git add config/prompts.ts
git commit -m "feat(prompts): update GENERATE_CONTENT_BRIEF_PROMPT with format codes and attribute categories"
```

---

## Phase 6: Integration with Pass 1

### Task 6.1: Update pass1DraftGeneration to Use Rules Engine

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass1DraftGeneration.ts`

**Step 1: Add imports**

Add these imports at the top of `pass1DraftGeneration.ts`:

```typescript
import { BriefCodeParser } from '../rulesEngine/briefCodeParser';
import { ContextChainer } from '../rulesEngine/contextChainer';
import { AttributeRanker } from '../rulesEngine/attributeRanker';
import { RulesValidator } from '../rulesEngine/validators';
import { SectionPromptBuilder } from '../rulesEngine/prompts/sectionPromptBuilder';
import { YMYLValidator } from '../rulesEngine/validators/ymylValidator';
import { SectionGenerationContext, DiscourseContext } from '../../../../types';
```

**Step 2: Add validation-regeneration loop**

Replace the `generateSectionWithRetry` function:

```typescript
async function generateSectionWithRetry(
  section: SectionDefinition,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  allSections: SectionDefinition[],
  maxRetries: number,
  discourseContext?: DiscourseContext
): Promise<string> {
  // Detect YMYL
  const ymylDetection = YMYLValidator.detectYMYL(section.heading + ' ' + (section.subordinateTextHint || ''));

  // Build generation context
  const context: SectionGenerationContext = {
    section: {
      key: section.key,
      heading: section.heading,
      level: section.level,
      subordinate_text_hint: section.subordinateTextHint,
      methodology_note: section.methodologyNote,
      format_code: section.format_code,
      attribute_category: section.attribute_category,
    },
    brief,
    businessInfo,
    discourseContext,
    allSections: allSections.map(s => ({
      heading: s.heading,
      level: s.level,
      key: s.key,
    })),
    isYMYL: ymylDetection.isYMYL,
    ymylCategory: ymylDetection.category,
  };

  let content: string = '';
  let validationResult = { passed: true, violations: [], fixInstructions: '' };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Build prompt (include fix instructions on retry)
      const prompt = SectionPromptBuilder.build(
        context,
        attempt > 1 ? validationResult.fixInstructions : undefined
      );

      // Generate content
      content = await callProviderWithPrompt(businessInfo, prompt);

      if (typeof content !== 'string') {
        throw new Error('AI returned non-string response');
      }

      content = content.trim();

      // Validate output
      validationResult = RulesValidator.validate(content, context);

      if (validationResult.passed) {
        return content;
      }

      // Log violations for debugging
      console.warn(`[Pass1] Validation failed (attempt ${attempt}):`,
        validationResult.violations.filter(v => v.severity === 'error').map(v => v.rule)
      );

    } catch (error) {
      console.error(`[Pass1] Generation error (attempt ${attempt}):`, error);

      if (attempt >= maxRetries) {
        throw error;
      }

      // Exponential backoff
      await delay(1000 * Math.pow(2, attempt - 1));
    }
  }

  // Return best effort after max retries
  console.warn('[Pass1] Max retries reached, returning content with violations');
  return content;
}
```

**Step 3: Update executePass1 to track discourse context**

In `executePass1`, add discourse context tracking:

```typescript
export async function executePass1(
  // ... existing params
): Promise<string> {
  // 1. Parse sections from brief
  let sections = orchestrator.parseSectionsFromBrief(brief);

  // 2. Order sections by attribute category + query priority
  sections = AttributeRanker.orderSections(sections);

  // ... existing resume logic ...

  // Track discourse context across sections
  let previousContent: string | null = null;

  // 4. Generate each section
  for (const section of sections) {
    // ... existing abort/skip logic ...

    // Build discourse context from previous section
    const discourseContext = previousContent
      ? ContextChainer.extractForNext(previousContent)
      : undefined;

    // Generate with retry and validation
    const content = await generateSectionWithRetry(
      section,
      brief,
      businessInfo,
      sections,
      3,
      discourseContext
    );

    // Update discourse context for next section
    previousContent = content;

    // ... existing save/callback logic ...
  }

  // ... rest of function
}
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/passes/pass1DraftGeneration.ts
git commit -m "feat(pass1): integrate Rules Engine with validation-regeneration loop"
```

---

## Phase 7: Testing

### Task 7.1: Run All Unit Tests

**Step 1: Run the test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Fix any failures**

Address any test failures before proceeding.

**Step 3: Commit test fixes if needed**

```bash
git add .
git commit -m "fix: address test failures from Rules Engine integration"
```

---

### Task 7.2: Integration Test with Sample Brief

**Step 1: Create a test brief with format codes**

Manually test by:
1. Starting the dev server: `npm run dev`
2. Creating a new content brief for a topic
3. Triggering content generation
4. Verifying:
   - Format code constraints are enforced
   - Prohibited language is flagged/avoided
   - Discourse context flows between sections
   - YMYL content gets Safe Answer Protocol

**Step 2: Document findings**

Note any issues found during manual testing for follow-up.

---

### Task 7.3: Final Commit and Summary

**Step 1: Final commit**

```bash
git add .
git commit -m "feat: complete Semantic Content Rules Engine implementation

Implements Koray Tugberk GUBUR framework:
- BriefCodeParser for [FS], [PAA], [LISTING] detection
- ContextChainer for S-P-O discourse integration
- AttributeRanker for ROOT→UNIQUE→RARE ordering
- Validators: ProhibitedLanguage, EAVDensity, Modality, Centerpiece, YMYL, FormatCode
- QueryPriorityService with DataForSEO Keywords API
- SectionPromptBuilder with all framework rules
- Validation-regeneration loop in Pass 1"
```

---

## Summary

**Total Tasks:** 17 tasks across 7 phases
**New Files:** ~15 files in `rulesEngine/` directory
**Modified Files:** 3 files (`types.ts`, `prompts.ts`, `pass1DraftGeneration.ts`, `serpApiService.ts`)

**Key Components:**
1. `BriefCodeParser` - Detects [FS], [PAA], [LISTING], etc.
2. `ContextChainer` - Implements S-P-O discourse integration
3. `AttributeRanker` - Orders sections ROOT → UNIQUE → RARE
4. `RulesValidator` - Orchestrates all validators
5. `SectionPromptBuilder` - Builds prompts with all framework rules
6. `QueryPriorityService` - Integrates DataForSEO for priority scoring

---

Plan complete and saved to `docs/plans/2025-12-06-semantic-content-rules-engine-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session in worktree with executing-plans, batch execution with checkpoints

Which approach?
