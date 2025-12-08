# Semantic Content Rules Engine - Architectural Overhaul

**Date:** 2025-12-06
**Status:** Approved for Implementation
**Scope:** Full architectural overhaul of content generation system

---

## Executive Summary

The current content generation system fails to properly implement the Koray Tugberk GUBUR Semantic Content Framework as documented in:
- `docs/build-docs/content writing from content brief.md`
- `docs/build-docs/content writing from content brief advanced rules.md`

This design introduces a **Rules Engine Architecture** that:
1. Parses and enforces Content Brief Codes (`[FS]`, `[PAA]`, `[LISTING]`, etc.)
2. Implements proper Discourse Integration (S-P-O sentence chaining across sections)
3. Validates all prohibited language rules at generation time
4. Orders sections by Query Probability (GSC + DataForSEO data)
5. Enforces YMYL Safe Answer Protocol for sensitive topics
6. Validates EAV (Entity-Attribute-Value) density per sentence

---

## Gap Analysis Summary

| Framework Requirement | Current Status | Priority |
|----------------------|----------------|----------|
| Content Brief Codes ([FS], [PAA], etc.) | NOT IMPLEMENTED | CRITICAL |
| Discourse Integration (Object→Subject chaining) | NOT IMPLEMENTED | CRITICAL |
| Attribute Ordering (Root→Unique→Rare) | NOT IMPLEMENTED | HIGH |
| Prohibited Language (analogies, pronouns, etc.) | PARTIAL | HIGH |
| Query Probability Ordering | NOT IMPLEMENTED | MEDIUM |
| YMYL Safe Answer Protocol | NOT IMPLEMENTED | MEDIUM |
| EAV Density Validation | NOT IMPLEMENTED | HIGH |
| Contextual Bridge (Main→Supplementary) | NOT IMPLEMENTED | MEDIUM |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RULES ENGINE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  services/ai/contentGeneration/rulesEngine/                        │
│  ├── index.ts                    # Main orchestrator                │
│  ├── briefCodeParser.ts          # Parse [FS], [PAA], etc.         │
│  ├── contextChainer.ts           # S-P-O discourse integration     │
│  ├── attributeRanker.ts          # Root→Unique→Rare ordering       │
│  ├── queryPriorityService.ts     # GSC + DataForSEO integration    │
│  ├── validators/                                                    │
│  │   ├── index.ts                                                  │
│  │   ├── prohibitedLanguage.ts   # No analogies, pronouns, etc.   │
│  │   ├── eavDensity.ts           # Every sentence = E+A+V          │
│  │   ├── modalityValidator.ts    # is/are vs can/may              │
│  │   ├── structureValidator.ts   # S-P-O sentence structure       │
│  │   ├── centerpieceValidator.ts # First 400 chars validation     │
│  │   └── ymylValidator.ts        # Safe Answer Protocol           │
│  ├── formatters/                                                    │
│  │   ├── featuredSnippet.ts      # [FS] 40-50 word constraint     │
│  │   ├── listFormatter.ts        # [LISTING] with preamble        │
│  │   └── tableFormatter.ts       # Comparative tables             │
│  └── prompts/                                                       │
│      └── sectionPromptBuilder.ts # Build prompts with all rules   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### Enhanced BriefSection Interface

```typescript
export interface BriefSection {
  key: string;
  heading: string;
  level: number;
  order: number;

  // Content Brief Codes (NEW)
  format_code: 'FS' | 'PAA' | 'LISTING' | 'DEFINITIVE' | 'TABLE' | 'PROSE';

  // Attribute classification (NEW)
  attribute_category: 'ROOT' | 'UNIQUE' | 'RARE' | 'COMMON';

  // Query priority from GSC/DataForSEO (NEW)
  query_priority?: number;
  related_queries?: string[];

  // Existing fields (enhanced)
  subordinate_text_hint: string;  // MANDATORY - first sentence structure
  methodology_note?: string;

  // Required phrases from ["..."] codes (NEW)
  required_phrases?: string[];

  // Internal linking targets (NEW)
  anchor_texts?: { phrase: string; target_topic_id: string }[];

  // Section classification (NEW)
  content_zone: 'MAIN' | 'SUPPLEMENTARY';

  subsections?: BriefSection[];
}
```

### Section Generation Context

```typescript
export interface SectionGenerationContext {
  section: BriefSection;
  brief: ContentBrief;
  businessInfo: BusinessInfo;

  // Discourse integration (NEW)
  discourseContext?: {
    previousParagraph: string;
    lastSentence: string;
    lastObject: string;
    subjectHint: string;
  };

  allSections: BriefSection[];

  // YMYL detection (NEW)
  isYMYL: boolean;
  ymylCategory?: 'HEALTH' | 'FINANCE' | 'LEGAL' | 'SAFETY';
}
```

### Validation Result

```typescript
export interface ValidationResult {
  passed: boolean;
  violations: Violation[];
  fixInstructions: string;
}

export interface Violation {
  rule: string;
  text: string;
  position: number;
  suggestion: string;
}
```

---

## Component Specifications

### 1. BriefCodeParser

**Purpose:** Extract format codes from methodology_note field

**Codes to Parse:**
| Code | Meaning | Constraint |
|------|---------|------------|
| `[FS]` | Featured Snippet | 40-50 words, first sentence after heading |
| `[PAA]` | People Also Ask | Definition + Expansion structure |
| `[LISTING]` | List Format | Requires preamble sentence with count |
| `[DEFINITIVE]` | Long Form | Comprehensive, all qualifiers |
| `[TABLE]` | Table Format | Entity rows, attribute columns |
| `["phrase"]` | Required Phrase | Must include exact phrase |
| `[Anchor: text]` | Internal Link | Use as hyperlink text |

**Implementation:**
```typescript
export function parseFormatCodes(methodologyNote: string): {
  formatCode: FormatCode;
  requiredPhrases: string[];
  anchorTexts: string[];
} {
  // Regex patterns for each code type
  const fsPattern = /\[FS\]/i;
  const paaPattern = /\[PAA\]/i;
  const listingPattern = /\[LISTING\]/i;
  const phrasePattern = /"([^"]+)"/g;
  const anchorPattern = /\[Anchor:\s*([^\]]+)\]/gi;

  // Parse and return structured data
}
```

### 2. ContextChainer

**Purpose:** Enable S-P-O discourse integration across sections

**Key Methods:**
- `extractForNext(content)` - Extract last paragraph, sentence, and grammatical object
- `buildContext(section, previousContent)` - Build discourse context for generation

**Algorithm:**
1. Split content into paragraphs
2. Get last paragraph
3. Split into sentences
4. Extract grammatical object from last sentence (simplified NLP)
5. Generate subject hint for next section

### 3. AttributeRanker

**Purpose:** Order sections by attribute category priority

**Order:** ROOT → UNIQUE → RARE → COMMON

**Within each category:** Order by query_priority (highest first)

### 4. QueryPriorityService

**Purpose:** Fetch search volume data and calculate section priorities

**Data Sources:**
1. **DataForSEO Keywords API** (`/v3/keywords_data/google_ads/search_volume/live`)
2. **GSC Import Data** (existing `GscRow` interface)

**Priority Calculation:**
```
priority_score = (normalized_volume * 0.6) + (normalized_impressions * 0.4)
```

### 5. Validators

#### 5.1 ProhibitedLanguageValidator

**Rules Enforced:**

| Category | Patterns |
|----------|----------|
| STOP_WORDS | also, basically, actually, very, really, just, quite, anyway, so, maybe, perhaps |
| OPINIONS | I think, we believe, unfortunately, fortunately, beautiful, amazing |
| ANALOGIES | like a, similar to, is like, as if, imagine, think of it as |
| PASSIVE_VOICE | is/are/was/were + past participle |
| FUTURE_FOR_FACTS | will always, will never, will typically |
| AMBIGUOUS_PRONOUNS | he/she/it/they + said/is/was (when subject unclear) |
| FLUFF_OPENERS | In this article, Let's dive, Have you ever wondered |

#### 5.2 EAVDensityValidator

**Rule:** Every sentence must contain Entity + Attribute + Value

**Implementation:** Parse each sentence and verify presence of:
- Entity (noun/subject)
- Attribute (predicate/verb)
- Value (object/complement)

#### 5.3 ModalityValidator

**Rules:**
- Facts → "is/are" (not "can be", "might be")
- Possibilities → "can/may"
- Advice → "should"

#### 5.4 CenterpieceValidator

**Rule:** Core definition must appear in first 400 characters

**Applied to:** Introduction section only

#### 5.5 YMYLValidator

**Detection Keywords:**
- HEALTH: symptom, treatment, medication, disease, diagnosis
- FINANCE: investment, loan, mortgage, tax, insurance
- LEGAL: law, legal, lawsuit, attorney, court
- SAFETY: safety, emergency, danger, warning, hazard

**Safe Answer Protocol:**
1. Boolean questions start with Yes/No
2. Include condition/exception (However, Unless, Depending on)
3. Fact first, then citation (not "According to X, ...")
4. Include perspective layers if applicable

---

## Content Generation Flow

### Pass 1: Section-by-Section Generation (Redesigned)

```
1. BRIEF PREPARATION
   ├── BriefCodeParser.parse(brief.structured_outline)
   ├── AttributeRanker.orderSections(sections)
   └── QueryPriorityService.enrichWithPriority(sections)

2. FOR EACH SECTION (in priority order):
   │
   ├── 2a. BUILD CONTEXT
   │   └── ContextChainer.buildContext(section, previousContent)
   │
   ├── 2b. BUILD PROMPT
   │   └── SectionPromptBuilder.build(context)
   │       - Format code constraints
   │       - Discourse context (previous object → this subject)
   │       - All prohibited language rules
   │       - Required phrases
   │       - YMYL Safe Answer Protocol if applicable
   │
   ├── 2c. GENERATE CONTENT
   │   └── callProviderWithPrompt(prompt)
   │
   ├── 2d. VALIDATE OUTPUT
   │   └── RulesValidator.validate(content, context)
   │
   ├── 2e. IF VALIDATION FAILS:
   │   └── REGENERATE with fix instructions (max 2 retries)
   │
   └── 2f. EXTRACT CONTEXT FOR NEXT SECTION
       └── ContextChainer.extractForNext(content)

3. ASSEMBLE DRAFT
```

### Validation-Regeneration Loop

```typescript
async function generateWithValidation(
  context: SectionGenerationContext,
  maxRetries: number = 2
): Promise<string> {
  let content: string;
  let validationResult: ValidationResult;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Build prompt (include fix instructions on retry)
    const prompt = SectionPromptBuilder.build(
      context,
      attempt > 0 ? validationResult.fixInstructions : undefined
    );

    // Generate
    content = await callProviderWithPrompt(prompt);

    // Validate
    validationResult = RulesValidator.validate(content, context);

    if (validationResult.passed) {
      return content;
    }

    // Log violations for debugging
    console.warn(`Validation failed (attempt ${attempt + 1}):`, validationResult.violations);
  }

  // Return best effort after max retries
  console.error('Max retries reached, returning content with violations');
  return content;
}
```

---

## Brief Generation Updates

The `GENERATE_CONTENT_BRIEF_PROMPT` must be updated to produce the new fields:

### Updated Output Schema

```json
{
  "structured_outline": [
    {
      "heading": "string",
      "level": 2,
      "format_code": "FS | PAA | LISTING | DEFINITIVE | TABLE | PROSE",
      "attribute_category": "ROOT | UNIQUE | RARE | COMMON",
      "content_zone": "MAIN | SUPPLEMENTARY",
      "subordinate_text_hint": "MANDATORY first sentence structure",
      "methodology_note": "Additional format instructions",
      "required_phrases": ["exact phrase to include"],
      "subsections": [...]
    }
  ]
}
```

### New Prompt Rules

```
### SECTION CLASSIFICATION RULES

1. **Format Codes**: Assign based on query intent:
   - [FS]: Featured Snippet target (40-50 words max)
   - [PAA]: "People Also Ask" questions
   - [LISTING]: Steps, features, enumerations
   - [DEFINITIVE]: Comprehensive explanations
   - [TABLE]: Comparative data
   - [PROSE]: Standard content

2. **Attribute Categories**: Classify each section:
   - ROOT: Core defining attributes (must cover)
   - UNIQUE: Differentiating features
   - RARE: Specific/niche details
   - COMMON: General/shared attributes

3. **Content Zones**:
   - MAIN: Core content (strict central entity focus)
   - SUPPLEMENTARY: Related topics (after contextual bridge)

4. **Subordinate Text Hint**: MANDATORY for every section
   - Must specify exact first sentence structure
   - Example: "Define [Topic] as a [Category] that [Function]"
```

---

## Migration Strategy

### Phase 1: Data Structure Updates
1. Update `BriefSection` interface in `types.ts`
2. Add new interfaces (`SectionGenerationContext`, `ValidationResult`, etc.)
3. Update database schema if needed for new fields

### Phase 2: Rules Engine Core
1. Create `rulesEngine/` directory structure
2. Implement `BriefCodeParser`
3. Implement `ContextChainer`
4. Implement `AttributeRanker`

### Phase 3: Validators
1. Implement `ProhibitedLanguageValidator`
2. Implement `EAVDensityValidator`
3. Implement `ModalityValidator`
4. Implement `CenterpieceValidator`
5. Implement `YMYLValidator`
6. Create unified `RulesValidator` orchestrator

### Phase 4: Query Priority
1. Add DataForSEO Keywords API integration
2. Implement `QueryPriorityService`
3. Integrate with GSC data

### Phase 5: Prompt Updates
1. Create `SectionPromptBuilder`
2. Update `GENERATE_CONTENT_BRIEF_PROMPT`
3. Update all pass prompts to use new context

### Phase 6: Integration
1. Update `pass1DraftGeneration.ts` to use Rules Engine
2. Implement validation-regeneration loop
3. Update orchestrator for new flow

### Phase 7: Testing
1. Unit tests for each validator
2. Integration tests for full generation flow
3. Manual testing with sample briefs

---

## File Changes Summary

### New Files
```
services/ai/contentGeneration/rulesEngine/
├── index.ts
├── briefCodeParser.ts
├── contextChainer.ts
├── attributeRanker.ts
├── queryPriorityService.ts
├── validators/
│   ├── index.ts
│   ├── prohibitedLanguage.ts
│   ├── eavDensity.ts
│   ├── modalityValidator.ts
│   ├── structureValidator.ts
│   ├── centerpieceValidator.ts
│   └── ymylValidator.ts
├── formatters/
│   ├── featuredSnippet.ts
│   ├── listFormatter.ts
│   └── tableFormatter.ts
└── prompts/
    └── sectionPromptBuilder.ts
```

### Modified Files
```
types.ts                                    # Enhanced BriefSection, new interfaces
config/prompts.ts                           # Updated GENERATE_CONTENT_BRIEF_PROMPT
services/ai/contentGeneration/
├── orchestrator.ts                         # New section parsing with format codes
├── passes/pass1DraftGeneration.ts          # Use Rules Engine flow
services/serpApiService.ts                  # Add Keywords API integration
```

---

## Success Metrics

1. **Format Code Compliance**: 100% of generated sections match their format code constraints
2. **Prohibited Language**: 0 violations in final output
3. **Discourse Integration**: Each section's first sentence references previous section's object
4. **EAV Density**: >90% of sentences pass EAV validation
5. **YMYL Compliance**: 100% Safe Answer Protocol compliance for detected YMYL content

---

## Appendix: Prohibited Language Patterns

```typescript
export const PROHIBITED_PATTERNS = {
  STOP_WORDS: [
    'also', 'basically', 'actually', 'very', 'really',
    'just', 'quite', 'anyway', 'so', 'maybe', 'perhaps'
  ],

  OPINIONS: [
    /\b(I think|we think|I believe|we believe|in my opinion|in our opinion)\b/gi,
    /\b(unfortunately|fortunately|hopefully|ideally)\b/gi,
    /\b(beautiful|amazing|wonderful|terrible|horrible)\b/gi,
  ],

  ANALOGIES: [
    /\b(like a|similar to|is like|as if|imagine|think of it as)\b/gi,
    /\b(metaphor|analogy|compared to a)\b/gi,
  ],

  PASSIVE_VOICE: [
    /\b(is|are|was|were|been|being)\s+(being\s+)?\w+ed\b/gi,
  ],

  FUTURE_FOR_FACTS: [
    /\bwill (always|never|typically|usually|generally)\b/gi,
  ],

  AMBIGUOUS_PRONOUNS: [
    /\b(he|she|it|they|this|that|these|those)\s+(said|mentioned|noted|explained|is|are|was|were)\b/gi,
  ],

  FLUFF_OPENERS: [
    /^(In this (article|guide|post)|Let's (dive|explore|look)|Have you ever wondered)/i,
  ],
};
```
