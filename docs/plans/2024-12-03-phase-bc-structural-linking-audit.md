# Phase B+C: Structural Enhancements & Link Optimization

**Date:** 2024-12-03
**Status:** IMPLEMENTED
**Prerequisite:** Phase A Audit Rules (COMPLETED)
**Author:** Claude Code

---

## Executive Summary

This plan implements Phase B (Structural Enhancements) and Phase C (Link Optimization) from the macro context gaps research. These features add 6 new audit checks and enhance the content brief structure to support macro/micro context segmentation.

**Total: 6 new audit checks (bringing total from 14 to 20)**

---

## Phase B: Structural Enhancements

### B.1 Macro/Micro Border Detection

**Research Rule (from `macro context.md`):**
> "Use a specific heading or question to signal the transition from the main topic to related (but distinct) sub-topics."

**Current State:** No detection of macro/micro content zones.

**Implementation:**

#### Task B.1.1: Add macro/micro border audit check

**File:** `services/ai/contentGeneration/passes/auditChecks.ts`

**Add test first in:** `services/ai/contentGeneration/passes/auditChecks.test.ts`

```typescript
// Add to auditChecks.test.ts
describe('checkMacroMicroBorder', () => {
  it('should pass when content has no supplementary links in main content', () => {
    const draft = `## Introduction

Water is essential for life.

## Main Benefits

Hydration improves health.

## Related Topics

For more on dehydration, see [Dehydration Guide](/dehydration).`;

    const result = checkMacroMicroBorder(draft);
    expect(result.isPassing).toBe(true);
  });

  it('should fail when links to different topics appear early', () => {
    const draft = `## Introduction

Water is essential. Learn about [Dehydration](/dehydration) here.

## Main Benefits

Hydration improves health.`;

    const result = checkMacroMicroBorder(draft);
    expect(result.isPassing).toBe(false);
    expect(result.details).toContain('link');
  });
});
```

**Add function in:** `services/ai/contentGeneration/passes/auditChecks.ts`

```typescript
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
```

**Verification:** `npm test -- --grep "checkMacroMicroBorder"`

---

### B.2 Extractive Summary Alignment

**Research Rule (from `macro context.md`):**
> "If you extracted the first sentence of every H2, they should form a coherent summary that matches the introduction."

**Current State:** Pass 7 rewrites introduction but doesn't validate alignment.

**Implementation:**

#### Task B.2.1: Add extractive summary alignment check

**File:** `services/ai/contentGeneration/passes/auditChecks.ts`

**Add test first:**

```typescript
describe('checkExtractiveSummaryAlignment', () => {
  it('should pass when intro mentions all H2 topics', () => {
    const draft = `## Introduction

This article covers hydration benefits, dehydration risks, and daily intake guidelines.

## Hydration Benefits

Proper hydration improves cognitive function.

## Dehydration Risks

Dehydration causes fatigue and headaches.

## Daily Intake Guidelines

Adults need 2-3 liters of water daily.`;

    const result = checkExtractiveSummaryAlignment(draft);
    expect(result.isPassing).toBe(true);
  });

  it('should fail when intro does not preview H2 topics', () => {
    const draft = `## Introduction

Water is important for health.

## Hydration Benefits

Proper hydration improves function.

## Chemical Composition

H2O contains hydrogen and oxygen.`;

    const result = checkExtractiveSummaryAlignment(draft);
    expect(result.isPassing).toBe(false);
  });
});
```

**Add function:**

```typescript
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
```

**Verification:** `npm test -- --grep "checkExtractiveSummaryAlignment"`

---

### B.3 Query-Format Alignment

**Research Rule (from `macro context.md`):**
> "Match the heading format to the query intent. Use 'List Definitions' for plural queries."

**Current State:** No query-to-format validation.

**Implementation:**

#### Task B.3.1: Add query format alignment check

**File:** `services/ai/contentGeneration/passes/auditChecks.ts`

**Add test first:**

```typescript
describe('checkQueryFormatAlignment', () => {
  it('should pass when "types of" query has list format', () => {
    const draft = `## Types of Water Filters

There are 5 main types of water filters:

- Activated Carbon
- Reverse Osmosis
- UV Filters
- Ceramic
- Ion Exchange`;

    const brief = createMockBrief();
    brief.title = 'Types of Water Filters';

    const result = checkQueryFormatAlignment(draft, brief);
    expect(result.isPassing).toBe(true);
  });

  it('should fail when "how to" query lacks ordered list', () => {
    const draft = `## How to Install a Water Filter

Installing a water filter requires careful preparation. First, you need tools.`;

    const brief = createMockBrief();
    brief.title = 'How to Install a Water Filter';

    const result = checkQueryFormatAlignment(draft, brief);
    expect(result.isPassing).toBe(false);
  });
});
```

**Add function:**

```typescript
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
```

**Verification:** `npm test -- --grep "checkQueryFormatAlignment"`

---

## Phase C: Link Optimization

### C.1 Anchor Text Variety (Max 3 Rule)

**Research Rule (from `linking in website.md`):**
> "Dezelfde ankertekst mag maximaal drie keer per pagina worden gebruikt."

**Current State:** No anchor text repetition check.

**Implementation:**

#### Task C.1.1: Add anchor text variety check

**File:** `services/ai/contentGeneration/passes/auditChecks.ts`

**Add test first:**

```typescript
describe('checkAnchorTextVariety', () => {
  it('should pass when anchor text is used 3 times or less', () => {
    const draft = `
See [water filters](/filters) for options.
Learn about [water filters](/filters) here.
More on [water filters](/filters).
`;

    const result = checkAnchorTextVariety(draft);
    expect(result.isPassing).toBe(true);
  });

  it('should fail when same anchor text used more than 3 times', () => {
    const draft = `
See [water filters](/filters) for options.
Learn about [water filters](/filters) here.
More on [water filters](/filters).
Check [water filters](/filters) again.
Also [water filters](/filters).
`;

    const result = checkAnchorTextVariety(draft);
    expect(result.isPassing).toBe(false);
    expect(result.details).toContain('5');
  });
});
```

**Add function:**

```typescript
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
```

**Verification:** `npm test -- --grep "checkAnchorTextVariety"`

---

### C.2 Annotation Text Quality

**Research Rule (from `linking in website.md`):**
> "De tekst rondom de ankertekst (Annotation Text) moet de link's doel en context versterken."

**Current State:** No validation of text around links.

**Implementation:**

#### Task C.2.1: Add annotation text quality check

**File:** `services/ai/contentGeneration/passes/auditChecks.ts`

**Add test first:**

```typescript
describe('checkAnnotationTextQuality', () => {
  it('should pass when links have descriptive surrounding text', () => {
    const draft = `
For proper hydration, you should drink adequate amounts of water daily. Learn more about the
[benefits of hydration](/hydration-benefits) and how it affects your health.
`;

    const result = checkAnnotationTextQuality(draft);
    expect(result.isPassing).toBe(true);
  });

  it('should fail when links lack contextual annotation', () => {
    const draft = `
Click here: [link](/page).

[Read more](/other).
`;

    const result = checkAnnotationTextQuality(draft);
    expect(result.isPassing).toBe(false);
  });
});
```

**Add function:**

```typescript
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
    const context = draft.substring(startPos, endPos);

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
```

**Verification:** `npm test -- --grep "checkAnnotationTextQuality"`

---

### C.3 Supplementary Link Placement

**Research Rule (from `linking in website.md`):**
> "Links die PageRank overdragen naar het Core Section moeten onderaan de pagina worden geplaatst."

**Note:** This check is partially covered by `checkMacroMicroBorder` (B.1). This adds explicit supplementary position validation.

#### Task C.3.1: Add supplementary link placement check

**File:** `services/ai/contentGeneration/passes/auditChecks.ts`

**Add test first:**

```typescript
describe('checkSupplementaryLinkPlacement', () => {
  it('should pass when related links are at the end', () => {
    const draft = `## Introduction

Main content without links.

## Topic Details

More details here.

## Related Topics

See [Related Article](/related) for more information.
`;

    const result = checkSupplementaryLinkPlacement(draft);
    expect(result.isPassing).toBe(true);
  });

  it('should flag when many links appear in introduction', () => {
    const draft = `## Introduction

Check out [this](/a), [that](/b), and [another](/c) for context.

## Main Content

The main topic is discussed here.
`;

    const result = checkSupplementaryLinkPlacement(draft);
    expect(result.isPassing).toBe(false);
  });
});
```

**Add function:**

```typescript
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
```

**Verification:** `npm test -- --grep "checkSupplementaryLinkPlacement"`

---

## Integration Tasks

### Task INT.1: Register new audit checks

**File:** `services/ai/contentGeneration/passes/auditChecks.ts`

Update `runAlgorithmicAudit` to include all 6 new checks:

```typescript
export function runAlgorithmicAudit(
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): AuditRuleResult[] {
  const results: AuditRuleResult[] = [];

  // Existing 14 checks (1-14)
  results.push(checkModality(draft));
  results.push(checkStopWords(draft));
  results.push(checkSubjectPositioning(draft, info.seedKeyword));
  results.push(checkHeadingHierarchy(draft));
  results.push(checkListCountSpecificity(draft));
  results.push(checkPronounDensity(draft, brief.title));
  results.push(checkLinkPositioning(draft));
  results.push(checkFirstSentencePrecision(draft));
  results.push(checkCenterpieceAnnotation(draft, info.seedKeyword));
  results.push(checkInformationDensity(draft, info.seedKeyword));
  results.push(checkLLMSignaturePhrases(draft));
  results.push(checkPredicateConsistency(draft, brief.title));
  results.push(checkCoverageWeight(draft));
  results.push(checkVocabularyRichness(draft));

  // Phase B: Structural Enhancements (15-17)
  results.push(checkMacroMicroBorder(draft));
  results.push(checkExtractiveSummaryAlignment(draft));
  results.push(checkQueryFormatAlignment(draft, brief));

  // Phase C: Link Optimization (18-20)
  results.push(checkAnchorTextVariety(draft));
  results.push(checkAnnotationTextQuality(draft));
  results.push(checkSupplementaryLinkPlacement(draft));

  return results;
}
```

### Task INT.2: Update plan document status

**File:** `docs/plans/2024-12-02-macro-context-gaps-future-development.md`

Update the priority matrix to mark Phase B and C items as IMPLEMENTED.

---

## Implementation Order

### Recommended Sequence (TDD)

1. **B.1** Macro/Micro Border - Test, Implement, Verify
2. **B.2** Extractive Summary - Test, Implement, Verify
3. **B.3** Query-Format Alignment - Test, Implement, Verify
4. **C.1** Anchor Text Variety - Test, Implement, Verify
5. **C.2** Annotation Text Quality - Test, Implement, Verify
6. **C.3** Supplementary Link Placement - Test, Implement, Verify
7. **INT.1** Register all checks in runAlgorithmicAudit
8. **INT.2** Run full test suite and build
9. **INT.3** Update documentation

---

## Verification Checklist

| Task | Test Command | Expected Result |
|------|--------------|-----------------|
| B.1 | `npm test -- --grep "checkMacroMicroBorder"` | 2 tests pass |
| B.2 | `npm test -- --grep "checkExtractiveSummaryAlignment"` | 2 tests pass |
| B.3 | `npm test -- --grep "checkQueryFormatAlignment"` | 2 tests pass |
| C.1 | `npm test -- --grep "checkAnchorTextVariety"` | 2 tests pass |
| C.2 | `npm test -- --grep "checkAnnotationTextQuality"` | 2 tests pass |
| C.3 | `npm test -- --grep "checkSupplementaryLinkPlacement"` | 2 tests pass |
| All | `npm test` | All tests pass |
| Build | `npm run build` | No errors |

---

## Success Criteria

When Phase B+C is complete:

1. **Audit check count:** 20 total (was 14)
2. **All tests pass:** 22+ tests in auditChecks.test.ts
3. **Build succeeds:** `npm run build` exits 0
4. **Research doc updated:** Phase B and C marked as IMPLEMENTED

---

## Files Modified

| File | Change |
|------|--------|
| `services/ai/contentGeneration/passes/auditChecks.ts` | Add 6 new check functions + constants |
| `services/ai/contentGeneration/passes/auditChecks.test.ts` | Add 12 new tests |
| `docs/plans/2024-12-02-macro-context-gaps-future-development.md` | Update status |
| `docs/plans/2024-12-03-phase-bc-structural-linking-audit.md` | This plan (mark IMPLEMENTED when done) |

---

## Appendix: Full Audit Check List (After Implementation)

| # | Check Name | Category | Phase |
|---|------------|----------|-------|
| 1 | Modality Certainty | Micro Semantics | Original |
| 2 | Stop Word Removal | Micro Semantics | Original |
| 3 | Subject Positioning | Micro Semantics | Original |
| 4 | Heading Hierarchy | Structure | Original |
| 5 | List Count Specificity | Structure | Original |
| 6 | Explicit Naming (Pronoun Density) | Micro Semantics | Original |
| 7 | Link Positioning | Linking | Original |
| 8 | First Sentence Precision | Micro Semantics | Original |
| 9 | Centerpiece Annotation | Macro Context | Original |
| 10 | Information Density | Micro Semantics | Original |
| 11 | LLM Phrase Detection | Quality | Phase A |
| 12 | Predicate Consistency | Macro Context | Phase A |
| 13 | Content Coverage Weight | Structure | Phase A |
| 14 | Vocabulary Richness | Quality | Phase A |
| 15 | Macro/Micro Border | Macro Context | Phase B |
| 16 | Extractive Summary Alignment | Macro Context | Phase B |
| 17 | Query-Format Alignment | Structure | Phase B |
| 18 | Anchor Text Variety | Linking | Phase C |
| 19 | Annotation Text Quality | Linking | Phase C |
| 20 | Supplementary Link Placement | Linking | Phase C |
