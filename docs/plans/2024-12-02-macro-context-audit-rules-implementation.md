# Macro Context Audit Rules Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 4 new algorithmic audit checks from the Macro Context research to enhance Pass 8 content quality validation.

**Architecture:** Pure functions added to existing `auditChecks.ts`. Each check returns `AuditRuleResult` and is integrated into `runAlgorithmicAudit()`. Unit tests using Vitest validate each check independently.

**Tech Stack:** TypeScript, Vitest (new), existing multipass content generation system

---

## Phase 1: Test Infrastructure Setup

### Task 1.1: Install Vitest

**Files:**
- Modify: `package.json`

**Step 1: Install vitest and dependencies**

Run: `npm install -D vitest @vitest/ui`
Expected: Dependencies added to devDependencies

**Step 2: Add test scripts to package.json**

Add these scripts to the `scripts` section in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

**Step 3: Verify installation**

Run: `npm run test`
Expected: "No test files found" (since we haven't created any yet)

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest for unit testing"
```

---

### Task 1.2: Create Vitest configuration

**Files:**
- Create: `vitest.config.ts`

**Step 1: Write vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'e2e', '.worktrees'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['services/ai/contentGeneration/passes/auditChecks.ts']
    }
  }
});
```

**Step 2: Verify config loads**

Run: `npm run test`
Expected: "No test files found" (config loads without error)

**Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: add vitest configuration"
```

---

### Task 1.3: Create test file skeleton for auditChecks

**Files:**
- Create: `services/ai/contentGeneration/passes/auditChecks.test.ts`

**Step 1: Write test file skeleton**

```typescript
// services/ai/contentGeneration/passes/auditChecks.test.ts
import { describe, it, expect } from 'vitest';
import { runAlgorithmicAudit } from './auditChecks';
import { ContentBrief, BusinessInfo } from '../../../../types';

// Helper to create minimal test fixtures
const createMockBrief = (overrides: Partial<ContentBrief> = {}): ContentBrief => ({
  title: 'Test Article Title',
  metaDescription: 'Test meta description',
  outline: '## Introduction\n## Section 1',
  keyTakeaways: ['Takeaway 1'],
  targetWordCount: 1500,
  ...overrides
} as ContentBrief);

const createMockBusinessInfo = (overrides: Partial<BusinessInfo> = {}): BusinessInfo => ({
  seedKeyword: 'test keyword',
  domain: 'example.com',
  projectName: 'Test Project',
  industry: 'Technology',
  model: 'B2B',
  valueProp: 'Test value',
  audience: 'Test audience',
  expertise: 'Expert',
  language: 'en',
  targetMarket: 'US',
  aiProvider: 'anthropic',
  aiModel: 'claude-3-sonnet',
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-key',
  ...overrides
} as BusinessInfo);

describe('runAlgorithmicAudit', () => {
  it('returns array of audit results', () => {
    const draft = '## Introduction\n\nTest keyword is a concept that means something specific.';
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r).toHaveProperty('ruleName');
      expect(r).toHaveProperty('isPassing');
      expect(r).toHaveProperty('details');
    });
  });
});
```

**Step 2: Run test to verify setup works**

Run: `npm run test`
Expected: 1 test passes

**Step 3: Commit**

```bash
git add services/ai/contentGeneration/passes/auditChecks.test.ts
git commit -m "test: add auditChecks test skeleton"
```

---

## Phase 2: LLM Phrase Detection (Extend Stop Words)

### Task 2.1: Write failing test for LLM phrase detection

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.test.ts`

**Step 1: Add test for LLM phrases**

Add to `auditChecks.test.ts`:

```typescript
describe('checkLLMSignaturePhrases', () => {
  it('fails when draft contains LLM signature phrases', () => {
    const draft = `## Introduction

Overall, test keyword is important. It's important to note that this concept delves into many areas.
In conclusion, we have explored the world of test keywords.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const llmCheck = results.find(r => r.ruleName === 'LLM Phrase Detection');

    expect(llmCheck).toBeDefined();
    expect(llmCheck?.isPassing).toBe(false);
    expect(llmCheck?.details).toContain('overall');
  });

  it('passes when draft has no LLM signature phrases', () => {
    const draft = `## Introduction

Test keyword represents a specific methodology. This approach provides measurable benefits.
The framework enables efficient implementation.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const llmCheck = results.find(r => r.ruleName === 'LLM Phrase Detection');

    expect(llmCheck).toBeDefined();
    expect(llmCheck?.isPassing).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL - "LLM Phrase Detection" check not found

---

### Task 2.2: Implement LLM phrase detection check

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.ts`

**Step 1: Add LLM_SIGNATURE_PHRASES constant after imports**

Add after line 2 in `auditChecks.ts`:

```typescript
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
```

**Step 2: Add checkLLMSignaturePhrases function**

Add before the closing of the file:

```typescript
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
```

**Step 3: Add to runAlgorithmicAudit function**

Add after line 39 (after Information Density check) in `runAlgorithmicAudit`:

```typescript
  // 11. LLM Signature Phrases
  results.push(checkLLMSignaturePhrases(draft));
```

**Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/passes/auditChecks.ts services/ai/contentGeneration/passes/auditChecks.test.ts
git commit -m "feat: add LLM signature phrase detection audit check"
```

---

## Phase 3: Predicate Consistency Check

### Task 3.1: Write failing test for predicate consistency

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.test.ts`

**Step 1: Add test for predicate consistency**

Add to `auditChecks.test.ts`:

```typescript
describe('checkPredicateConsistency', () => {
  it('fails when H1 uses negative predicates but H2s use positive', () => {
    const draft = `## Risks of Test Keyword

Test keyword has some concerns.

## Benefits of Test Keyword

Here are the advantages.

## Advantages of Test Keyword

More positive aspects.`;
    const brief = createMockBrief({ title: 'Risks of Test Keyword' });
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const predicateCheck = results.find(r => r.ruleName === 'Predicate Consistency');

    expect(predicateCheck).toBeDefined();
    expect(predicateCheck?.isPassing).toBe(false);
  });

  it('passes when heading predicates are consistent', () => {
    const draft = `## Benefits of Test Keyword

Test keyword provides many advantages.

## Advantages of Test Keyword

Additional positive aspects.

## Improvements from Test Keyword

Enhanced outcomes.`;
    const brief = createMockBrief({ title: 'Benefits of Test Keyword' });
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const predicateCheck = results.find(r => r.ruleName === 'Predicate Consistency');

    expect(predicateCheck).toBeDefined();
    expect(predicateCheck?.isPassing).toBe(true);
  });

  it('passes for instructional content with how-to headings', () => {
    const draft = `## How to Use Test Keyword

Follow these steps.

## Steps for Test Keyword

The process involves.

## Guide to Test Keyword Implementation

Implementation details.`;
    const brief = createMockBrief({ title: 'How to Use Test Keyword' });
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const predicateCheck = results.find(r => r.ruleName === 'Predicate Consistency');

    expect(predicateCheck).toBeDefined();
    expect(predicateCheck?.isPassing).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL - "Predicate Consistency" check not found

---

### Task 3.2: Implement predicate consistency check

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.ts`

**Step 1: Add predicate classification constants**

Add after `LLM_SIGNATURE_PHRASES`:

```typescript
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
```

**Step 2: Add checkPredicateConsistency function**

Add before `checkLLMSignaturePhrases`:

```typescript
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
```

**Step 3: Add to runAlgorithmicAudit function**

Add after LLM Signature Phrases check:

```typescript
  // 12. Predicate Consistency
  results.push(checkPredicateConsistency(draft, brief.title));
```

**Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/passes/auditChecks.ts services/ai/contentGeneration/passes/auditChecks.test.ts
git commit -m "feat: add predicate consistency audit check"
```

---

## Phase 4: Coverage Weight Balance Check

### Task 4.1: Write failing test for coverage weight

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.test.ts`

**Step 1: Add test for coverage weight**

Add to `auditChecks.test.ts`:

```typescript
describe('checkCoverageWeight', () => {
  it('fails when minor section exceeds 50% of content', () => {
    const draft = `## Introduction

Short intro about test keyword.

## Main Topic

Brief main content.

## Appendix Notes

${'This is appendix content that goes on and on. '.repeat(50)}
More appendix details that dominate the article.
${'Additional appendix text filling up space. '.repeat(30)}`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const coverageCheck = results.find(r => r.ruleName === 'Content Coverage Weight');

    expect(coverageCheck).toBeDefined();
    expect(coverageCheck?.isPassing).toBe(false);
  });

  it('passes when content is well-balanced', () => {
    const draft = `## Introduction

${'Introduction content with good detail about test keyword. '.repeat(10)}

## Main Topic

${'Main content providing substantial value about the topic. '.repeat(15)}

## Secondary Topic

${'Secondary content with reasonable detail. '.repeat(12)}

## Conclusion

${'Conclusion wrapping up the main points effectively. '.repeat(8)}`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const coverageCheck = results.find(r => r.ruleName === 'Content Coverage Weight');

    expect(coverageCheck).toBeDefined();
    expect(coverageCheck?.isPassing).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL - "Content Coverage Weight" check not found

---

### Task 4.2: Implement coverage weight check

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.ts`

**Step 1: Add checkCoverageWeight function**

Add before `checkPredicateConsistency`:

```typescript
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
```

**Step 2: Add to runAlgorithmicAudit function**

Add after Predicate Consistency check:

```typescript
  // 13. Content Coverage Weight
  results.push(checkCoverageWeight(draft));
```

**Step 3: Run tests to verify they pass**

Run: `npm run test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/passes/auditChecks.ts services/ai/contentGeneration/passes/auditChecks.test.ts
git commit -m "feat: add content coverage weight audit check"
```

---

## Phase 5: Vocabulary Richness (TTR) Check

### Task 5.1: Write failing test for vocabulary richness

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.test.ts`

**Step 1: Add test for vocabulary richness**

Add to `auditChecks.test.ts`:

```typescript
describe('checkVocabularyRichness', () => {
  it('fails when vocabulary diversity is too low', () => {
    // Highly repetitive text with same words
    const draft = `## Introduction

The thing is important. The thing is good. The thing is useful.
The thing helps people. The thing makes things better.
The thing is the best thing for doing things with things.
The thing thing thing thing thing.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const vocabCheck = results.find(r => r.ruleName === 'Vocabulary Richness');

    expect(vocabCheck).toBeDefined();
    expect(vocabCheck?.isPassing).toBe(false);
    expect(vocabCheck?.details).toContain('TTR');
  });

  it('passes when vocabulary is diverse', () => {
    const draft = `## Introduction

Test keyword represents a sophisticated methodology for achieving optimal results.
This approach combines multiple strategies, techniques, and frameworks.
Implementation requires careful planning, execution, and monitoring.
The benefits include improved efficiency, reduced costs, and enhanced quality.
Organizations leverage these principles to transform their operations.
Success depends on commitment, resources, and continuous improvement.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const vocabCheck = results.find(r => r.ruleName === 'Vocabulary Richness');

    expect(vocabCheck).toBeDefined();
    expect(vocabCheck?.isPassing).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL - "Vocabulary Richness" check not found

---

### Task 5.2: Implement vocabulary richness check

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.ts`

**Step 1: Add vocabulary richness helper and check function**

Add before `checkCoverageWeight`:

```typescript
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
```

**Step 2: Add to runAlgorithmicAudit function**

Add after Content Coverage Weight check:

```typescript
  // 14. Vocabulary Richness
  results.push(checkVocabularyRichness(draft));
```

**Step 3: Run tests to verify they pass**

Run: `npm run test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/passes/auditChecks.ts services/ai/contentGeneration/passes/auditChecks.test.ts
git commit -m "feat: add vocabulary richness (TTR) audit check"
```

---

## Phase 6: Final Integration & Verification

### Task 6.1: Run full test suite and build

**Step 1: Run all unit tests**

Run: `npm run test`
Expected: All 10+ tests pass

**Step 2: Run TypeScript build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Verify audit count increased**

The `runAlgorithmicAudit` function should now return 14 checks (was 10):
1. Modality Certainty
2. Stop Word Removal
3. Subject Positioning
4. Heading Hierarchy
5. List Count Specificity
6. Explicit Naming (Pronoun Density)
7. Link Positioning
8. First Sentence Precision
9. Centerpiece Annotation
10. Information Density
11. LLM Phrase Detection (NEW)
12. Predicate Consistency (NEW)
13. Content Coverage Weight (NEW)
14. Vocabulary Richness (NEW)

**Step 4: Commit any final adjustments**

```bash
git add -A
git commit -m "chore: final verification of macro context audit rules" --allow-empty
```

---

### Task 6.2: Update documentation

**Files:**
- Modify: `docs/plans/2024-12-02-macro-context-gaps-future-development.md`

**Step 1: Update the gap document status**

Update the status of Phase A items to show they are implemented:

```markdown
## 5. Implementation Priority Matrix

| Gap | Category | Priority | Complexity | Status |
|-----|----------|----------|------------|--------|
| 2.3 LLM Phrase Detection | Audit | HIGH | Low | ✅ IMPLEMENTED |
| 1.2 Predicate Consistency | Page Segmentation | MEDIUM | Low | ✅ IMPLEMENTED |
| 2.1 Coverage Weight | Audit | MEDIUM | Low | ✅ IMPLEMENTED |
| 2.4 Vocabulary Richness | Audit | LOW | Low | ✅ IMPLEMENTED |
```

**Step 2: Commit**

```bash
git add docs/plans/2024-12-02-macro-context-gaps-future-development.md
git commit -m "docs: mark Phase A audit rules as implemented"
```

---

### Task 6.3: Final commit and branch summary

**Step 1: Verify all changes**

Run: `git status`
Expected: Clean working directory

Run: `git log --oneline -10`
Expected: Shows all commits from this implementation

**Step 2: Push branch (if remote configured)**

```bash
git push -u origin feature/macro-context-audit-rules
```

---

## Summary

This implementation adds 4 new audit checks to the multipass content generation system:

| Check | Purpose | Threshold |
|-------|---------|-----------|
| LLM Phrase Detection | Removes AI-generated patterns | 0 phrases |
| Predicate Consistency | Ensures heading angle consistency | <2 conflicts |
| Content Coverage Weight | Prevents section imbalance | <50% per section |
| Vocabulary Richness | Ensures lexical diversity | TTR >35% |

**Total audit rules after implementation:** 14 (was 10)

**Files Modified:**
- `package.json` - Added vitest
- `vitest.config.ts` - New test configuration
- `services/ai/contentGeneration/passes/auditChecks.ts` - 4 new checks
- `services/ai/contentGeneration/passes/auditChecks.test.ts` - New test file
- `docs/plans/2024-12-02-macro-context-gaps-future-development.md` - Status update
