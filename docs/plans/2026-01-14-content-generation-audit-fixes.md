# Content Generation Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical gaps identified in the content generation system audit to achieve 95%+ Semantic SEO compliance.

**Architecture:** Create shared sentence tokenization utility, integrate existing EAV density validator into audit checks, extend contextual bridge validation to MAIN sections, implement external schema validation, and add cross-page EAV consistency checking via Supabase queries.

**Tech Stack:** TypeScript, React, Supabase, Vitest/Jest for testing

---

## Task 1: Create Sentence Tokenizer Utility

**Files:**
- Create: `utils/sentenceTokenizer.ts`
- Create: `utils/__tests__/sentenceTokenizer.test.ts`

**Step 1: Write the failing test**

```typescript
// utils/__tests__/sentenceTokenizer.test.ts
import { describe, it, expect } from 'vitest';
import { splitSentences } from '../sentenceTokenizer';

describe('splitSentences', () => {
  it('should split basic sentences correctly', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const result = splitSentences(text);
    expect(result).toEqual(['First sentence.', 'Second sentence.', 'Third sentence.']);
  });

  it('should handle abbreviations without splitting', () => {
    const text = 'Dr. Smith works at U.S. headquarters. He is the CEO.';
    const result = splitSentences(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain('Dr. Smith');
    expect(result[0]).toContain('U.S.');
  });

  it('should handle e.g. and i.e. without splitting', () => {
    const text = 'Use common formats, e.g. JSON or XML. This improves compatibility.';
    const result = splitSentences(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain('e.g.');
  });

  it('should handle question marks and exclamation points', () => {
    const text = 'What is SEO? It stands for Search Engine Optimization!';
    const result = splitSentences(text);
    expect(result).toEqual(['What is SEO?', 'It stands for Search Engine Optimization!']);
  });

  it('should handle empty input', () => {
    expect(splitSentences('')).toEqual([]);
  });

  it('should handle single sentence without period', () => {
    const result = splitSentences('Single sentence without period');
    expect(result).toEqual(['Single sentence without period']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run utils/__tests__/sentenceTokenizer.test.ts`
Expected: FAIL with "Cannot find module '../sentenceTokenizer'"

**Step 3: Write minimal implementation**

```typescript
// utils/sentenceTokenizer.ts

/**
 * Common abbreviations that should not trigger sentence splits
 */
const ABBREVIATIONS = [
  'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Inc', 'Ltd', 'Corp', 'Jr', 'Sr',
  'vs', 'etc', 'al', 'ca', 'cf', 'ed', 'eds', 'est', 'fig', 'no',
  'vol', 'rev', 'ser', 'dept', 'govt', 'approx', 'misc'
];

const ABBREVIATIONS_WITH_PERIODS = [
  'e.g', 'i.e', 'U.S', 'U.K', 'Ph.D', 'M.D', 'B.A', 'M.A', 'D.C',
  'a.m', 'p.m', 'A.D', 'B.C', 'St', 'Mt', 'Rd', 'Ave', 'Blvd'
];

/**
 * Split text into sentences while preserving abbreviations
 * Uses a protect-split-restore approach to handle edge cases
 */
export function splitSentences(content: string): string[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  let processed = content;
  const placeholder = '<<PROTECTED_PERIOD>>';

  // Protect single-letter abbreviations (e.g., U.S., U.K.)
  processed = processed.replace(/\b([A-Z])\.([A-Z])\./g, `$1${placeholder}$2${placeholder}`);

  // Protect common abbreviations with periods (e.g., i.e., e.g.)
  for (const abbr of ABBREVIATIONS_WITH_PERIODS) {
    const escaped = abbr.replace(/\./g, '\\.');
    const regex = new RegExp(`\\b${escaped}\\.`, 'gi');
    processed = processed.replace(regex, abbr.replace(/\./g, placeholder) + placeholder);
  }

  // Protect title abbreviations (Dr., Mr., etc.)
  for (const abbr of ABBREVIATIONS) {
    const regex = new RegExp(`\\b${abbr}\\.\\s`, 'gi');
    processed = processed.replace(regex, `${abbr}${placeholder} `);
  }

  // Split on sentence-ending punctuation followed by space or end
  const sentences = processed
    .split(/(?<=[.!?])\s+/)
    .map(s => s.replace(new RegExp(placeholder, 'g'), '.').trim())
    .filter(s => s.length > 0);

  return sentences;
}

/**
 * Count words in a sentence
 */
export function countWords(sentence: string): number {
  return sentence.split(/\s+/).filter(w => w.length > 0).length;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run utils/__tests__/sentenceTokenizer.test.ts`
Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add utils/sentenceTokenizer.ts utils/__tests__/sentenceTokenizer.test.ts
git commit -m "feat: add sentence tokenizer utility with abbreviation handling"
```

---

## Task 2: Update auditChecks.ts to Use Sentence Tokenizer

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.ts`

**Step 1: Add import at top of file**

```typescript
// Add after line 10 (existing imports)
import { splitSentences, countWords } from '../../../../utils/sentenceTokenizer';
```

**Step 2: Replace sentence splitting in checkSubjectPositioning (line 188)**

Find:
```typescript
const sentences = text.split(/[.!?]+/).filter(s => s.trim());
```

Replace with:
```typescript
const sentences = splitSentences(text);
```

**Step 3: Replace sentence splitting in checkInformationDensity (line 551)**

Find:
```typescript
const sentences = text.split(/[.!?]+/).filter(s => s.trim());
```

Replace with:
```typescript
const sentences = splitSentences(text);
```

**Step 4: Run existing audit tests**

Run: `npx vitest run services/ai/contentGeneration/passes/auditChecks.test.ts`
Expected: PASS (existing tests should still pass)

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/passes/auditChecks.ts
git commit -m "refactor: use sentence tokenizer in auditChecks for reliable splitting"
```

---

## Task 3: Update Remaining Validators to Use Sentence Tokenizer

**Files:**
- Modify: `services/ai/contentGeneration/rulesEngine/validators/contextualBridgeValidator.ts` (line 67)
- Modify: `services/ai/contentGeneration/rulesEngine/validators/structureValidator.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/repetitionValidator.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/ymylValidator.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/prohibitedLanguage.ts`
- Modify: `services/ai/contentGeneration/holisticAnalyzer.ts`
- Modify: `services/ai/contentGeneration/flowGuidanceBuilder.ts`

**Step 1: Update contextualBridgeValidator.ts**

Add import:
```typescript
import { splitSentences } from '../../../../../utils/sentenceTokenizer';
```

Replace line 67:
```typescript
const firstSentence = content.split(/[.!?]/)[0] || '';
```
With:
```typescript
const sentences = splitSentences(content);
const firstSentence = sentences[0] || '';
```

**Step 2: Update structureValidator.ts**

Add import and replace all `.split(/[.!?]+/)` with `splitSentences()`.

**Step 3: Update repetitionValidator.ts**

Add import and replace all `.split(/[.!?]+/)` with `splitSentences()`.

**Step 4: Update ymylValidator.ts**

Add import and replace all `.split(/[.!?]+/)` with `splitSentences()`.

**Step 5: Update prohibitedLanguage.ts**

Add import and replace all `.split(/[.!?]+/)` with `splitSentences()`.

**Step 6: Update holisticAnalyzer.ts**

Add import and replace all `.split(/[.!?]+/)` with `splitSentences()`.

**Step 7: Update flowGuidanceBuilder.ts**

Add import and replace all `.split(/[.!?]+/)` with `splitSentences()`.

**Step 8: Run all validator tests**

Run: `npx vitest run services/ai/contentGeneration/`
Expected: PASS

**Step 9: Commit**

```bash
git add services/ai/contentGeneration/
git commit -m "refactor: migrate all validators to use centralized sentence tokenizer"
```

---

## Task 4: Add Sentence Length Audit Rule

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.ts`

**Step 1: Write the test**

Add to `auditChecks.test.ts`:
```typescript
describe('checkSentenceLength', () => {
  it('should pass when sentences are under 30 words', () => {
    const text = 'This is a short sentence. Another brief statement here.';
    const result = runAlgorithmicAudit(text, mockBrief, mockBusinessInfo, 'en');
    const sentenceLengthResult = result.find(r => r.ruleName === 'Sentence Length');
    expect(sentenceLengthResult?.isPassing).toBe(true);
  });

  it('should fail when multiple sentences exceed 30 words', () => {
    const longSentence = 'This is an extremely long sentence that contains way more than thirty words because it keeps going on and on with additional clauses and phrases that make it unnecessarily verbose and difficult to read.';
    const text = `${longSentence} ${longSentence} ${longSentence}`;
    const result = runAlgorithmicAudit(text, mockBrief, mockBusinessInfo, 'en');
    const sentenceLengthResult = result.find(r => r.ruleName === 'Sentence Length');
    expect(sentenceLengthResult?.isPassing).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/contentGeneration/passes/auditChecks.test.ts`
Expected: FAIL (rule doesn't exist yet)

**Step 3: Implement checkSentenceLength function**

Add after `checkImagePlacement` function (around line 1390):

```typescript
/**
 * Check 25: Sentence Length
 * Sentences should be under 30 words for readability (per Semantic SEO framework)
 */
function checkSentenceLength(text: string, language?: string): AuditRuleResult {
  const sentences = splitSentences(text);

  // Language-specific thresholds (German allows longer sentences)
  const maxWords = language === 'de' ? 40 : language === 'nl' ? 35 : 30;

  const longSentences: string[] = [];

  sentences.forEach(sentence => {
    const wordCount = countWords(sentence);
    if (wordCount > maxWords) {
      longSentences.push(sentence.substring(0, 60) + '...');
    }
  });

  // Allow up to 2 long sentences before flagging
  if (longSentences.length > 2) {
    return {
      ruleName: 'Sentence Length',
      isPassing: false,
      details: `${longSentences.length} sentences exceed ${maxWords} words.`,
      affectedTextSnippet: longSentences[0],
      remediation: `Break long sentences into shorter ones. Maximum ${maxWords} words per sentence recommended.`
    };
  }

  return {
    ruleName: 'Sentence Length',
    isPassing: true,
    details: 'Sentence lengths are appropriate for readability.'
  };
}
```

**Step 4: Add to runAlgorithmicAudit function**

Add after line 145 (before `return results`):
```typescript
  // 25. Sentence Length
  results.push(checkSentenceLength(draft, language));
```

**Step 5: Add to RULE_TO_ISSUE_TYPE mapping**

Add:
```typescript
'Sentence Length': 'poor_flow',
```

**Step 6: Add to RULE_SEVERITY mapping**

Add:
```typescript
'Sentence Length': 'warning',
```

**Step 7: Run test to verify it passes**

Run: `npx vitest run services/ai/contentGeneration/passes/auditChecks.test.ts`
Expected: PASS

**Step 8: Commit**

```bash
git add services/ai/contentGeneration/passes/auditChecks.ts services/ai/contentGeneration/passes/auditChecks.test.ts
git commit -m "feat: add sentence length audit rule (max 30 words per sentence)"
```

---

## Task 5: Integrate EAV Density Validator into Audit Checks

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.ts`

**Step 1: Write the test**

Add to `auditChecks.test.ts`:
```typescript
describe('checkInformationDensity (enhanced)', () => {
  it('should use EAV density calculation when EAVs provided', () => {
    const text = 'The iPhone 15 weighs 171 grams. The iPhone 15 measures 147.6mm tall.';
    const eavs: SemanticTriple[] = [
      { subject: { label: 'iPhone 15' }, predicate: { label: 'weighs' }, object: { label: '171 grams' } },
      { subject: { label: 'iPhone 15' }, predicate: { label: 'measures' }, object: { label: '147.6mm' } }
    ];
    const result = runAlgorithmicAudit(text, mockBrief, mockBusinessInfo, 'en', eavs);
    const densityResult = result.find(r => r.ruleName === 'Information Density');
    expect(densityResult?.isPassing).toBe(true);
  });
});
```

**Step 2: Update runAlgorithmicAudit signature**

Change from:
```typescript
export function runAlgorithmicAudit(
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo,
  language?: string
): AuditRuleResult[] {
```

To:
```typescript
export function runAlgorithmicAudit(
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo,
  language?: string,
  eavs?: SemanticTriple[]
): AuditRuleResult[] {
```

**Step 3: Import EAVDensityValidator**

Add import:
```typescript
import { EAVDensityValidator } from '../rulesEngine/validators/eavDensity';
```

**Step 4: Update checkInformationDensity to use EAV validator**

Replace the existing `checkInformationDensity` function (lines 550-578):

```typescript
function checkInformationDensity(
  text: string,
  centralEntity: string,
  language?: string,
  eavs?: SemanticTriple[]
): AuditRuleResult {
  // If EAVs provided, use proper EAV density calculation
  if (eavs && eavs.length > 0) {
    const densityResult = EAVDensityValidator.calculateTermDensity(text, eavs);

    if (densityResult.score < 40) {
      return {
        ruleName: 'Information Density',
        isPassing: false,
        details: `EAV term density: ${densityResult.score.toFixed(0)}% (minimum: 40%). Content lacks semantic coverage.`,
        affectedTextSnippet: `Missing terms: ${densityResult.missingTerms?.slice(0, 3).join(', ')}`,
        remediation: 'Include more entity-attribute-value facts from the content brief.'
      };
    }

    return {
      ruleName: 'Information Density',
      isPassing: true,
      details: `EAV term density: ${densityResult.score.toFixed(0)}%. Good semantic coverage.`
    };
  }

  // Fallback to pattern-based density if no EAVs
  const patternDensity = EAVDensityValidator.calculateDensity(text, language);

  if (patternDensity < 0.3) {
    return {
      ruleName: 'Information Density',
      isPassing: false,
      details: `Pattern-based EAV density: ${(patternDensity * 100).toFixed(0)}% (minimum: 30%).`,
      remediation: 'Each sentence should contain a clear Entity + Attribute + Value statement.'
    };
  }

  return {
    ruleName: 'Information Density',
    isPassing: true,
    details: `Pattern-based EAV density: ${(patternDensity * 100).toFixed(0)}%. Adequate fact density.`
  };
}
```

**Step 5: Update the call in runAlgorithmicAudit**

Change:
```typescript
results.push(checkInformationDensity(draft, info.seedKeyword));
```

To:
```typescript
results.push(checkInformationDensity(draft, info.seedKeyword, language, eavs));
```

**Step 6: Run tests**

Run: `npx vitest run services/ai/contentGeneration/passes/auditChecks.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add services/ai/contentGeneration/passes/auditChecks.ts services/ai/contentGeneration/passes/auditChecks.test.ts
git commit -m "feat: integrate EAV density validator for proper semantic density measurement"
```

---

## Task 6: Extend Contextual Bridge Validator for MAIN Sections

**Files:**
- Modify: `services/ai/contentGeneration/rulesEngine/validators/contextualBridgeValidator.ts`
- Create: `services/ai/contentGeneration/rulesEngine/validators/__tests__/contextualBridgeValidator.test.ts`

**Step 1: Write the test**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/__tests__/contextualBridgeValidator.test.ts
import { describe, it, expect } from 'vitest';
import { ContextualBridgeValidator } from '../contextualBridgeValidator';

describe('ContextualBridgeValidator', () => {
  describe('MAIN section transitions', () => {
    it('should pass when MAIN section references previous section terms', () => {
      const content = 'Building on the installation process, configuration requires additional steps.';
      const context = {
        section: { content_zone: 'MAIN', heading: 'Configuration' },
        previousSection: { heading: 'Installation Process', content: 'Install the package.' },
        language: 'en'
      };
      const violations = ContextualBridgeValidator.validate(content, context as any);
      expect(violations).toHaveLength(0);
    });

    it('should warn when MAIN section lacks reference to previous section', () => {
      const content = 'The database stores all user information securely.';
      const context = {
        section: { content_zone: 'MAIN', heading: 'Database' },
        previousSection: { heading: 'Authentication Flow', content: 'Users log in.' },
        language: 'en'
      };
      const violations = ContextualBridgeValidator.validate(content, context as any);
      expect(violations.some(v => v.rule === 'CROSS_SECTION_TRANSITION')).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/contentGeneration/rulesEngine/validators/__tests__/contextualBridgeValidator.test.ts`
Expected: FAIL (CROSS_SECTION_TRANSITION rule doesn't exist)

**Step 3: Implement cross-section transition validation**

Add to `contextualBridgeValidator.ts` after the existing `validate` method:

```typescript
export class ContextualBridgeValidator {
  /**
   * Validate contextual bridge between sections
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Get language-specific bridge patterns
    const language = context.language;
    const bridgePatterns = getBridgePatterns(language);

    // Existing: SUPPLEMENTARY zone validation
    if (context.section.content_zone === 'SUPPLEMENTARY') {
      const sentences = splitSentences(content);
      const firstSentence = sentences[0] || '';
      const hasBridge = bridgePatterns.some(p => p.test(firstSentence));

      if (!hasBridge) {
        violations.push({
          rule: 'CONTEXTUAL_BRIDGE_MISSING',
          text: firstSentence.substring(0, 50) + '...',
          position: 0,
          suggestion: 'SUPPLEMENTARY section should start with transitional language connecting to the main topic',
          severity: 'warning',
        });
      }
    }

    // NEW: Cross-section transition for MAIN sections (when previous section exists)
    if (context.previousSection && context.section.content_zone !== 'SUPPLEMENTARY') {
      const transitionScore = this.calculateTransitionScore(
        content,
        context.previousSection,
        language
      );

      if (transitionScore < 0.2) {
        violations.push({
          rule: 'CROSS_SECTION_TRANSITION',
          text: content.substring(0, 100) + '...',
          position: 0,
          suggestion: `Section should reference concepts from previous section "${context.previousSection.heading}" for better flow.`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Calculate how well a section transitions from the previous one
   */
  private static calculateTransitionScore(
    content: string,
    previousSection: { heading: string; content?: string },
    language?: string
  ): number {
    const firstParagraph = content.split('\n\n')[0] || content.substring(0, 300);
    const firstParaLower = firstParagraph.toLowerCase();

    // Extract key terms from previous section heading
    const stopWords = this.getStopWords(language);
    const prevTerms = previousSection.heading
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.includes(w));

    if (prevTerms.length === 0) return 1; // No terms to match

    // Count how many key terms appear in first paragraph
    const matchCount = prevTerms.filter(term =>
      firstParaLower.includes(term)
    ).length;

    return matchCount / prevTerms.length;
  }

  /**
   * Get stop words for a language
   */
  private static getStopWords(language?: string): string[] {
    const stopWordsByLang: Record<string, string[]> = {
      'en': ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out'],
      'nl': ['de', 'het', 'een', 'van', 'en', 'in', 'is', 'op', 'te', 'dat', 'die', 'voor'],
      'de': ['der', 'die', 'das', 'und', 'ist', 'von', 'zu', 'den', 'mit', 'sich', 'des', 'auf'],
      'fr': ['le', 'la', 'les', 'de', 'et', 'est', 'un', 'une', 'du', 'en', 'que', 'qui'],
      'es': ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'los', 'del', 'las'],
    };
    const langCode = language?.substring(0, 2).toLowerCase() || 'en';
    return stopWordsByLang[langCode] || stopWordsByLang['en'];
  }
}
```

**Step 4: Add import for splitSentences**

```typescript
import { splitSentences } from '../../../../../utils/sentenceTokenizer';
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run services/ai/contentGeneration/rulesEngine/validators/__tests__/contextualBridgeValidator.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/contextualBridgeValidator.ts
git add services/ai/contentGeneration/rulesEngine/validators/__tests__/contextualBridgeValidator.test.ts
git commit -m "feat: extend contextual bridge validator to check MAIN section transitions"
```

---

## Task 7: Implement External Schema Validation

**Files:**
- Modify: `services/ai/schemaGeneration/schemaValidator.ts`
- Create: `services/ai/schemaGeneration/__tests__/schemaValidator.test.ts`

**Step 1: Write the test**

```typescript
// services/ai/schemaGeneration/__tests__/schemaValidator.test.ts
import { describe, it, expect } from 'vitest';
import { validateSchema } from '../schemaValidator';

describe('External Schema Validation', () => {
  it('should return validation result instead of undefined', async () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Test Article',
      author: { '@type': 'Person', name: 'Test Author' },
      publisher: { '@type': 'Organization', name: 'Test Org' },
      datePublished: '2024-01-01'
    };

    const result = await validateSchema(schema, mockBrief, undefined, [], [], true);

    // Should no longer return undefined for external validation
    expect(result.externalValidationResult).toBeDefined();
    expect(result.externalValidationResult?.source).toBeDefined();
  });

  it('should detect invalid schema types', async () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'InvalidType',
      name: 'Test'
    };

    const result = await validateSchema(schema, mockBrief);
    expect(result.schemaOrgErrors.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Implement local vocabulary validation**

Replace the stub function at line 550-556 of `schemaValidator.ts`:

```typescript
/**
 * External schema validation
 * Uses local vocabulary validation (always available)
 * Can be extended with Google Rich Results Test API if configured
 */
async function runExternalSchemaValidation(
  schema: object
): Promise<{ source: string; isValid: boolean; errors: string[] } | undefined> {
  try {
    const errors: string[] = [];

    // 1. Validate all @type values against known Schema.org types
    const typeErrors = validateAllTypes(schema);
    errors.push(...typeErrors);

    // 2. Check for deprecated properties
    const deprecatedErrors = checkDeprecatedProperties(schema);
    errors.push(...deprecatedErrors);

    // 3. Validate property value types
    const valueErrors = validatePropertyValues(schema);
    errors.push(...valueErrors);

    return {
      source: 'local-vocabulary-validation',
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('[SchemaValidator] External validation failed:', error);
    return {
      source: 'local-vocabulary-validation',
      isValid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Recursively validate all @type values in the schema
 */
function validateAllTypes(schema: object, path: string = ''): string[] {
  const errors: string[] = [];

  const checkItem = (item: any, itemPath: string) => {
    if (item && typeof item === 'object') {
      if (item['@type'] && !SCHEMA_ORG_TYPES.has(item['@type'])) {
        errors.push(`Invalid type "${item['@type']}" at ${itemPath}`);
      }

      // Recurse into nested objects
      for (const [key, value] of Object.entries(item)) {
        if (key !== '@type' && key !== '@context') {
          if (Array.isArray(value)) {
            value.forEach((v, i) => checkItem(v, `${itemPath}/${key}[${i}]`));
          } else if (typeof value === 'object') {
            checkItem(value, `${itemPath}/${key}`);
          }
        }
      }
    }
  };

  if ((schema as any)['@graph']) {
    (schema as any)['@graph'].forEach((item: any, i: number) => {
      checkItem(item, `@graph[${i}]`);
    });
  } else {
    checkItem(schema, '');
  }

  return errors;
}

/**
 * Check for deprecated Schema.org properties
 */
function checkDeprecatedProperties(schema: object): string[] {
  const DEPRECATED_PROPERTIES = [
    'significantLink', 'significantLinks', 'softwareVersion'
  ];

  const errors: string[] = [];
  const schemaStr = JSON.stringify(schema);

  for (const prop of DEPRECATED_PROPERTIES) {
    if (schemaStr.includes(`"${prop}"`)) {
      errors.push(`Deprecated property "${prop}" found`);
    }
  }

  return errors;
}

/**
 * Validate property value types
 */
function validatePropertyValues(schema: object): string[] {
  const errors: string[] = [];

  const checkItem = (item: any, path: string) => {
    if (!item || typeof item !== 'object') return;

    // datePublished/dateModified should be ISO date format
    if (item.datePublished && !isValidISODate(item.datePublished)) {
      errors.push(`Invalid datePublished format at ${path}`);
    }
    if (item.dateModified && !isValidISODate(item.dateModified)) {
      errors.push(`Invalid dateModified format at ${path}`);
    }

    // URL properties should be valid URLs
    if (item.url && typeof item.url === 'string' && !isValidUrl(item.url)) {
      errors.push(`Invalid URL format for "url" at ${path}`);
    }
    if (item.image && typeof item.image === 'string' && !isValidUrl(item.image)) {
      errors.push(`Invalid URL format for "image" at ${path}`);
    }
  };

  if ((schema as any)['@graph']) {
    (schema as any)['@graph'].forEach((item: any, i: number) => {
      checkItem(item, `@graph[${i}]`);
    });
  } else {
    checkItem(schema, '');
  }

  return errors;
}

function isValidISODate(dateStr: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoDateRegex.test(dateStr);
}

function isValidUrl(urlStr: string): boolean {
  try {
    new URL(urlStr);
    return true;
  } catch {
    return false;
  }
}
```

**Step 3: Run tests**

Run: `npx vitest run services/ai/schemaGeneration/`
Expected: PASS

**Step 4: Commit**

```bash
git add services/ai/schemaGeneration/schemaValidator.ts services/ai/schemaGeneration/__tests__/
git commit -m "feat: implement local vocabulary validation for schema checking"
```

---

## Task 8: Create Cross-Page EAV Consistency Validator

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/crossPageEavValidator.ts`
- Create: `services/ai/contentGeneration/rulesEngine/validators/__tests__/crossPageEavValidator.test.ts`

**Step 1: Write the test**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/__tests__/crossPageEavValidator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { findContradictions, extractEavClaims } from '../crossPageEavValidator';

describe('crossPageEavValidator', () => {
  describe('findContradictions', () => {
    it('should detect contradicting facts about same entity-attribute', () => {
      const currentEavs = [
        { subject: { label: 'iPhone 15' }, predicate: { label: 'weight' }, object: { label: '171 grams' } }
      ];

      const existingClaims = [
        { entity: 'iPhone 15', attribute: 'weight', value: '185 grams', articleId: 'article-2', articleTitle: 'Phone Specs' }
      ];

      const contradictions = findContradictions(currentEavs, existingClaims);

      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].entity).toBe('iPhone 15');
      expect(contradictions[0].attribute).toBe('weight');
    });

    it('should not flag non-contradicting facts', () => {
      const currentEavs = [
        { subject: { label: 'iPhone 15' }, predicate: { label: 'weight' }, object: { label: '171 grams' } }
      ];

      const existingClaims = [
        { entity: 'iPhone 15', attribute: 'weight', value: '171 grams', articleId: 'article-2', articleTitle: 'Phone Specs' }
      ];

      const contradictions = findContradictions(currentEavs, existingClaims);

      expect(contradictions).toHaveLength(0);
    });
  });
});
```

**Step 2: Implement the validator**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/crossPageEavValidator.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { SemanticTriple } from '../../../../../types';

export interface EavClaim {
  entity: string;
  attribute: string;
  value: string;
  articleId: string;
  articleTitle: string;
}

export interface EavContradiction {
  entity: string;
  attribute: string;
  currentValue: string;
  conflictingValue: string;
  conflictingArticle: { id: string; title: string };
}

export interface EavConsistencyResult {
  isConsistent: boolean;
  contradictions: EavContradiction[];
  warnings: string[];
}

/**
 * Validate EAV consistency across multiple articles in the same topical map
 */
export async function validateCrossPageEavConsistency(
  currentJobId: string,
  mapId: string,
  currentEavs: SemanticTriple[],
  supabase: SupabaseClient
): Promise<EavConsistencyResult> {
  try {
    // Get all completed jobs in the same map
    const { data: relatedJobs, error } = await supabase
      .from('content_generation_jobs')
      .select(`
        id,
        content_briefs!inner(id, title, eavs)
      `)
      .eq('map_id', mapId)
      .eq('status', 'completed')
      .neq('id', currentJobId);

    if (error || !relatedJobs) {
      return { isConsistent: true, contradictions: [], warnings: ['Could not fetch related articles'] };
    }

    // Extract claims from related articles
    const existingClaims = extractEavClaims(relatedJobs);

    // Find contradictions
    const contradictions = findContradictions(currentEavs, existingClaims);

    return {
      isConsistent: contradictions.length === 0,
      contradictions,
      warnings: []
    };
  } catch (error) {
    console.error('[CrossPageEavValidator] Error:', error);
    return {
      isConsistent: true,
      contradictions: [],
      warnings: [`Validation error: ${error instanceof Error ? error.message : 'Unknown'}`]
    };
  }
}

/**
 * Extract EAV claims from related jobs
 */
export function extractEavClaims(jobs: any[]): EavClaim[] {
  const claims: EavClaim[] = [];

  for (const job of jobs) {
    const brief = job.content_briefs;
    if (!brief?.eavs) continue;

    const eavs = typeof brief.eavs === 'string' ? JSON.parse(brief.eavs) : brief.eavs;

    for (const eav of eavs) {
      if (eav.subject?.label && eav.predicate?.label && eav.object?.label) {
        claims.push({
          entity: normalizeEntity(eav.subject.label),
          attribute: normalizeAttribute(eav.predicate.label),
          value: eav.object.label,
          articleId: job.id,
          articleTitle: brief.title
        });
      }
    }
  }

  return claims;
}

/**
 * Find contradicting facts between current EAVs and existing claims
 */
export function findContradictions(
  currentEavs: SemanticTriple[],
  existingClaims: EavClaim[]
): EavContradiction[] {
  const contradictions: EavContradiction[] = [];

  for (const eav of currentEavs) {
    if (!eav.subject?.label || !eav.predicate?.label || !eav.object?.label) continue;

    const entity = normalizeEntity(eav.subject.label);
    const attribute = normalizeAttribute(eav.predicate.label);
    const value = eav.object.label;

    // Find matching entity-attribute pairs in existing claims
    const matchingClaims = existingClaims.filter(
      claim => claim.entity === entity && claim.attribute === attribute
    );

    for (const claim of matchingClaims) {
      // Check if values contradict (not equal and not compatible)
      if (!valuesAreCompatible(value, claim.value)) {
        contradictions.push({
          entity,
          attribute,
          currentValue: value,
          conflictingValue: claim.value,
          conflictingArticle: { id: claim.articleId, title: claim.articleTitle }
        });
      }
    }
  }

  return contradictions;
}

/**
 * Normalize entity name for comparison
 */
function normalizeEntity(entity: string): string {
  return entity.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Normalize attribute name for comparison
 */
function normalizeAttribute(attribute: string): string {
  return attribute.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two values are compatible (same or within acceptable range)
 */
function valuesAreCompatible(value1: string, value2: string): boolean {
  const v1 = value1.toLowerCase().trim();
  const v2 = value2.toLowerCase().trim();

  // Exact match
  if (v1 === v2) return true;

  // Numeric comparison with tolerance
  const num1 = parseFloat(v1.replace(/[^0-9.]/g, ''));
  const num2 = parseFloat(v2.replace(/[^0-9.]/g, ''));

  if (!isNaN(num1) && !isNaN(num2)) {
    // Allow 5% tolerance for numeric values
    const tolerance = Math.max(num1, num2) * 0.05;
    return Math.abs(num1 - num2) <= tolerance;
  }

  return false;
}
```

**Step 3: Run tests**

Run: `npx vitest run services/ai/contentGeneration/rulesEngine/validators/__tests__/crossPageEavValidator.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/crossPageEavValidator.ts
git add services/ai/contentGeneration/rulesEngine/validators/__tests__/crossPageEavValidator.test.ts
git commit -m "feat: add cross-page EAV consistency validator"
```

---

## Task 9: Integrate Cross-Page Validator into Pass 8 Audit

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass8Audit.ts`

**Step 1: Import the validator**

```typescript
import { validateCrossPageEavConsistency } from '../rulesEngine/validators/crossPageEavValidator';
```

**Step 2: Add cross-page validation to audit flow**

After running `runAlgorithmicAudit()`, add:

```typescript
// Cross-page EAV consistency check (if map_id available)
let crossPageResult = null;
if (job.map_id && brief.eavs?.length) {
  crossPageResult = await validateCrossPageEavConsistency(
    job.id,
    job.map_id,
    brief.eavs,
    supabase
  );

  if (!crossPageResult.isConsistent) {
    // Add warnings to audit details
    auditDetails.crossPageContradictions = crossPageResult.contradictions;

    // Reduce score slightly for contradictions (but don't block)
    const contradictionPenalty = Math.min(crossPageResult.contradictions.length * 2, 10);
    algorithmicScore = Math.max(0, algorithmicScore - contradictionPenalty);
  }
}
```

**Step 3: Update audit details type**

Ensure `AuditDetails` type includes `crossPageContradictions`:

```typescript
interface AuditDetails {
  // ... existing properties
  crossPageContradictions?: EavContradiction[];
}
```

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/passes/pass8Audit.ts types.ts
git commit -m "feat: integrate cross-page EAV consistency into audit pass"
```

---

## Task 10: Create Link Semantic Validator

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/linkSemanticValidator.ts`
- Create: `services/ai/contentGeneration/rulesEngine/validators/__tests__/linkSemanticValidator.test.ts`

**Step 1: Write the test**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/__tests__/linkSemanticValidator.test.ts
import { describe, it, expect } from 'vitest';
import { LinkSemanticValidator, calculateSemanticRelevance } from '../linkSemanticValidator';

describe('LinkSemanticValidator', () => {
  describe('calculateSemanticRelevance', () => {
    it('should return high score for relevant anchor text', () => {
      const score = calculateSemanticRelevance(
        'iPhone 15 specifications',
        'iPhone 15 specs and features',
        []
      );
      expect(score).toBeGreaterThan(0.5);
    });

    it('should return low score for irrelevant anchor text', () => {
      const score = calculateSemanticRelevance(
        'click here',
        'iPhone 15 specifications',
        []
      );
      expect(score).toBeLessThan(0.3);
    });
  });
});
```

**Step 2: Implement the validator**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/linkSemanticValidator.ts
import { ValidationViolation, SectionGenerationContext, SemanticTriple } from '../../../../../types';

export interface TopicData {
  keyword: string;
  url?: string;
  eavs?: SemanticTriple[];
}

/**
 * Validate that link anchor texts are semantically relevant to their targets
 */
export class LinkSemanticValidator {
  static validate(
    content: string,
    topics: TopicData[],
    context: SectionGenerationContext
  ): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      const anchorText = match[1];
      const targetUrl = match[2];

      // Skip external links
      if (targetUrl.startsWith('http') && !targetUrl.includes(context.brief?.domain || '')) {
        continue;
      }

      // Find target topic
      const targetTopic = topics.find(t =>
        t.url === targetUrl ||
        targetUrl.includes(t.keyword.toLowerCase().replace(/\s+/g, '-'))
      );

      if (!targetTopic) continue;

      // Calculate semantic relevance
      const relevance = calculateSemanticRelevance(
        anchorText,
        targetTopic.keyword,
        targetTopic.eavs || []
      );

      if (relevance < 0.3) {
        violations.push({
          rule: 'LINK_SEMANTIC_ALIGNMENT',
          text: `[${anchorText}](${targetUrl})`,
          position: match.index,
          suggestion: `Anchor text "${anchorText}" has low semantic relevance (${(relevance * 100).toFixed(0)}%) to target topic "${targetTopic.keyword}". Use keywords from the target topic.`,
          severity: 'warning'
        });
      }
    }

    return violations;
  }
}

/**
 * Calculate semantic relevance between anchor text and target topic
 */
export function calculateSemanticRelevance(
  anchorText: string,
  targetKeyword: string,
  targetEavs: SemanticTriple[]
): number {
  const anchorLower = anchorText.toLowerCase();
  const targetLower = targetKeyword.toLowerCase();

  // Direct keyword match
  if (anchorLower.includes(targetLower) || targetLower.includes(anchorLower)) {
    return 1.0;
  }

  // Word overlap calculation
  const anchorWords = new Set(anchorLower.split(/\s+/).filter(w => w.length > 2));
  const targetWords = new Set(targetLower.split(/\s+/).filter(w => w.length > 2));

  const intersection = [...anchorWords].filter(w => targetWords.has(w));
  const union = new Set([...anchorWords, ...targetWords]);

  const jaccardSimilarity = union.size > 0 ? intersection.length / union.size : 0;

  // Boost if anchor matches EAV terms
  let eavBoost = 0;
  for (const eav of targetEavs) {
    const eavTerms = [
      eav.subject?.label,
      eav.predicate?.label,
      eav.object?.label
    ].filter(Boolean).map(t => t!.toLowerCase());

    if (eavTerms.some(term => anchorLower.includes(term))) {
      eavBoost += 0.2;
    }
  }

  return Math.min(1.0, jaccardSimilarity + eavBoost);
}
```

**Step 3: Run tests**

Run: `npx vitest run services/ai/contentGeneration/rulesEngine/validators/__tests__/linkSemanticValidator.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/linkSemanticValidator.ts
git add services/ai/contentGeneration/rulesEngine/validators/__tests__/linkSemanticValidator.test.ts
git commit -m "feat: add link semantic validator for anchor text relevance checking"
```

---

## Task 11: Final Integration and Testing

**Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS

**Step 2: Run TypeScript type checking**

```bash
npx tsc --noEmit
```

Expected: No type errors

**Step 3: Test with sample content generation**

Manual test:
1. Create a new content brief
2. Run full content generation through all passes
3. Verify audit score reflects new checks
4. Verify schema validation returns actual results (not undefined)

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete content generation audit fixes implementation"
```

---

## Summary of Changes

| Task | Type | Files | Description |
|------|------|-------|-------------|
| 1 | Create | utils/sentenceTokenizer.ts | Sentence splitting with abbreviation handling |
| 2-3 | Modify | 9 validator files | Use centralized sentence tokenizer |
| 4 | Modify | auditChecks.ts | Add sentence length audit rule |
| 5 | Modify | auditChecks.ts | Integrate EAV density validator |
| 6 | Modify | contextualBridgeValidator.ts | Add MAIN section transitions |
| 7 | Modify | schemaValidator.ts | Implement external validation |
| 8 | Create | crossPageEavValidator.ts | Cross-article fact consistency |
| 9 | Modify | pass8Audit.ts | Integrate cross-page validation |
| 10 | Create | linkSemanticValidator.ts | Anchor text relevance checking |

**Expected Compliance Improvement**: 85/100 → 95+/100
