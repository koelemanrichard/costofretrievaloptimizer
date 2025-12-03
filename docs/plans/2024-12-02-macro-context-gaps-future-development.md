# Macro Context & Advanced Audit Gaps - Future Development Plan

**Date:** 2024-12-02
**Status:** IMPLEMENTED (Phases A, B, C Complete - 10 of 12 gaps addressed)
**Prerequisite:** Complete `2024-12-02-multipass-content-generation-implementation.md` first
**Author:** Claude Code / User Collaboration

---

## Executive Summary

This document captures all gaps identified from analyzing the **Macro Context** research document against the current application and the multipass implementation plan. These items should be implemented AFTER the multipass content generation system is complete.

The gaps are organized into:
1. **Macro Context Page Segmentation** (High Priority)
2. **Advanced Audit Rules** (Medium Priority)
3. **Linking & PageRank Optimization** (Medium Priority)
4. **Site-Wide Architecture** (Lower Priority - Future Phase)

---

## 1. Macro Context Page Segmentation Gaps

### 1.1 Main Content vs Supplementary Content Border

**Research Rule (from `macro context.md`):**
> "Use a specific heading or question to signal the transition from the main topic to related (but distinct) sub-topics."

**Current State:** Not implemented. The multipass system generates continuous content without explicit Macro/Micro context segmentation.

**Gap Details:**
- No explicit "Bridge Heading" generation (e.g., "What is the opposite of Water Intoxication?")
- No structural separation between Main Content (Macro Context) and Supplementary Content (Micro Context)
- Links to tangential topics are not pushed to the supplementary section

**Required Implementation:**

```typescript
// In content brief generation
interface ContentBriefEnhanced {
  // ... existing fields
  macro_micro_border: {
    border_heading: string;         // "How does X relate to Y?"
    border_section_order: number;   // After which H2 does supplementary start?
    supplementary_topics: string[]; // Topics that belong in micro context
  };
}

// In Pass 1 draft generation
interface SectionDefinition {
  // ... existing fields
  context_zone: 'macro' | 'micro';  // Which zone this section belongs to
}

// New audit check
function checkMacroMicroBorder(draft: string, brief: ContentBrief): AuditRuleResult {
  // 1. Check if bridge heading exists
  // 2. Check if supplementary links are AFTER the border
  // 3. Check that main content links stay in macro zone
}
```

**Validation Checklist Items:**
- [ ] Is there a clear border between Main and Supplementary content?
- [ ] Are internal links to different topics pushed to the Supplementary section?

---

### 1.2 Consistent Context Signifiers (Predicate Consistency)

**Research Rule (from `macro context.md`):**
> "Use consistent 'Context Signifiers' (predicates and adjectives) throughout the heading vector. If H1 is 'Health Risks of Hot Water', subsequent headings use negative predicates: 'Causes', 'Damages', 'Hurts'."

**Current State:** Not implemented. No validation that heading predicates match the H1 angle.

**Gap Details:**
- H1 might use "Risks" but H2s use "Benefits" without bridging
- No predicate consistency checking across heading vector
- Can cause "confused vector" signals to search engines

**Required Implementation:**

```typescript
// Predicate extraction and classification
interface PredicateAnalysis {
  h1_predicate_class: 'positive' | 'negative' | 'neutral' | 'instructional';
  h2_predicates: { heading: string; predicate_class: string }[];
  consistency_score: number;
  violations: string[];
}

// New audit check
function checkPredicateConsistency(draft: string): AuditRuleResult {
  const positivePredicates = ['benefits', 'advantages', 'improvements', 'gains'];
  const negativePredicates = ['risks', 'dangers', 'causes', 'damages', 'hurts'];
  const instructionalPredicates = ['how to', 'steps', 'guide', 'ways to'];

  // Extract H1 predicate class
  // Validate H2/H3 predicates match or have explicit bridge
}
```

---

### 1.3 Extractive Summary Validation

**Research Rule (from `macro context.md`):**
> "If you extracted the first sentence of every H2, they should form a coherent summary that matches the introduction."

**Current State:** Pass 7 rewrites introduction, but doesn't validate extractive coherence.

**Gap Details:**
- No check that first sentences of H2s form a coherent preview
- Introduction might not reflect the actual content order
- Missing "Summary Alignment" validation

**Required Implementation:**

```typescript
// After Pass 7 or in Pass 8
function checkExtractiveSummaryAlignment(draft: string, intro: string): AuditRuleResult {
  // 1. Extract first sentence of each H2
  const h2FirstSentences = extractH2FirstSentences(draft);

  // 2. Check if introduction mentions/previews each H2 topic
  const introTopics = extractTopicsFromIntro(intro);

  // 3. Validate order matches
  const orderMatches = validateTopicOrder(introTopics, h2FirstSentences);

  // 4. Check for missing previews
  const missingPreviews = findMissingPreviews(introTopics, h2FirstSentences);
}
```

---

### 1.4 Format Matching by Query Intent

**Research Rule (from `macro context.md`):**
> "Match the heading format to the query intent. Use 'List Definitions' for plural queries."

**Current State:** Partial coverage in Pass 3, but no query-intent-to-format mapping.

**Gap Details:**
- "Types of X" queries should generate list format
- "What is X" queries should generate definition format
- "How to X" queries should generate ordered list format
- Current system doesn't enforce this mapping

**Required Implementation:**

```typescript
// In content brief generation
interface QueryIntentFormat {
  query_pattern: 'definitional' | 'comparative' | 'instructional' | 'list' | 'faq';
  required_format: 'prose' | 'unordered_list' | 'ordered_list' | 'table' | 'faq_schema';
  validation_rules: string[];
}

// Enhanced content brief
interface ContentBriefEnhanced {
  // ... existing fields
  query_intent_format: QueryIntentFormat;
}

// New audit check
function checkQueryFormatAlignment(draft: string, brief: ContentBrief): AuditRuleResult {
  // If brief.query_intent_format is 'list', check for list presence
  // If 'instructional', check for ordered list
  // If 'comparative', check for table
}
```

---

## 2. Advanced Audit Rules Gaps

### 2.1 Content Coverage Weight Balance

**Research Rule (from `On page audit_framework.md`):**
> "Analyse of een klein attribuut niet het merendeel van de content (bijv. meer dan 50% van de H2/H3s) in beslag neemt."

**Current State:** No check for section length balance relative to importance.

**Gap Details:**
- A minor attribute might consume 50%+ of the content
- Dilutes main topicality signal
- Need to validate content weight matches attribute importance

**Required Implementation:**

```typescript
function checkContentCoverageWeight(draft: string, brief: ContentBrief): AuditRuleResult {
  const sections = parseSections(draft);
  const totalWords = countWords(draft);

  // Calculate word percentage per section
  const sectionWeights = sections.map(s => ({
    heading: s.heading,
    wordCount: countWords(s.content),
    percentage: countWords(s.content) / totalWords * 100,
    expectedWeight: getExpectedWeight(s.heading, brief) // Based on attribute priority
  }));

  // Flag sections with >50% weight that aren't the main topic
  const violations = sectionWeights.filter(s =>
    s.percentage > 50 && !isPrimaryAttribute(s.heading, brief)
  );
}
```

---

### 2.2 Factual Consensus (Knowledge-Based Trust)

**Research Rule (from `On page audit_framework.md`):**
> "Cross-check numerieke waarden, metingen en definities met andere gerelateerde artikelen op de site."

**Current State:** No cross-article fact consistency checking.

**Gap Details:**
- Same entity might have different values across articles
- Dates, measurements, definitions might conflict
- Reduces Knowledge-Based Trust (KBT)

**Required Implementation (Future - Site-Wide):**

```typescript
// This requires site-wide analysis, not just single article
interface FactConsistencyCheck {
  entity: string;
  attribute: string;
  values_found: { article: string; value: string }[];
  is_consistent: boolean;
  recommended_value: string;
}

// Would need a fact extraction and comparison system
// Possibly using the EAV triples stored in the knowledge graph
```

---

### 2.3 Contextless N-grams Detection

**Research Rule (from `On page audit_framework.md`):**
> "Audit de tekst op contextloze zinsdelen (bv. 'all also known as', 'basically', 'overall') die de relevantie verdunnen."

**Current State:** Pass 5 has basic stop word removal, but not comprehensive LLM phrase detection.

**Gap Details:**
- Need expanded list of LLM-specific phrases
- Current list: "also", "basically", "very", "maybe", "actually", "really"
- Missing: "Overall", "In conclusion", "It's important to note", "delve", "I had the pleasure of"

**Required Implementation:**

```typescript
const LLM_SIGNATURE_PHRASES = [
  "overall",
  "in conclusion",
  "it's important to note",
  "it is worth mentioning",
  "delve",
  "delving",
  "I had the pleasure of",
  "embark on a journey",
  "explore the world of",
  "in today's fast-paced world",
  "when it comes to",
  "at the end of the day",
  "needless to say",
  "it goes without saying"
];

function checkLLMSignaturePhrases(draft: string): AuditRuleResult {
  const found = LLM_SIGNATURE_PHRASES.filter(phrase =>
    draft.toLowerCase().includes(phrase.toLowerCase())
  );

  return {
    ruleName: 'LLM Phrase Detection',
    isPassing: found.length === 0,
    details: found.length > 0
      ? `Found LLM signature phrases: ${found.join(', ')}`
      : 'No LLM signature phrases detected',
    remediation: 'Remove or rewrite sentences containing these phrases.'
  };
}
```

---

### 2.4 Vocabulary Richness Score

**Research Rule (from `On page audit_framework.md`):**
> "Controleer de woordenschatrijkdom (Vocabulary Richness) om te bepalen of het document unieke woorden en frasen bevat."

**Current State:** Not implemented.

**Gap Details:**
- No measurement of lexical diversity
- No comparison to competitor vocabulary
- Missing uniqueness indicators

**Required Implementation:**

```typescript
function calculateVocabularyRichness(draft: string): number {
  const words = draft.toLowerCase().match(/\b[a-z]+\b/g) || [];
  const uniqueWords = new Set(words);

  // Type-Token Ratio (TTR)
  const ttr = uniqueWords.size / words.length;

  // Could also calculate Hapax Legomena (words appearing once)
  // And compare to industry benchmark

  return ttr;
}

function checkVocabularyRichness(draft: string): AuditRuleResult {
  const richness = calculateVocabularyRichness(draft);
  const threshold = 0.4; // Typical threshold for good diversity

  return {
    ruleName: 'Vocabulary Richness',
    isPassing: richness >= threshold,
    details: `TTR score: ${(richness * 100).toFixed(1)}% (threshold: ${threshold * 100}%)`,
    remediation: richness < threshold
      ? 'Increase vocabulary diversity by using more synonyms and varied phrasing.'
      : undefined
  };
}
```

---

## 3. Linking & PageRank Optimization Gaps

### 3.1 Supplementary Link Placement

**Research Rule (from `linking in website.md`):**
> "Links die PageRank overdragen naar het Core Section moeten onderaan de pagina worden geplaatst, in de Supplementary Content (Micro Context)."

**Current State:** Links are generated without zone-aware placement.

**Gap Details:**
- Links to Core Section topics scattered throughout
- Should be concentrated in Supplementary section
- Missing link placement zone validation

**Required Implementation:**

```typescript
function checkSupplementaryLinkPlacement(draft: string, brief: ContentBrief): AuditRuleResult {
  const links = extractLinks(draft);
  const borderPosition = findMacroMicroBorder(draft);

  // Core section links in main content = violation
  const coreSectionLinks = links.filter(l => isCorePageLink(l, brief));
  const violatingLinks = coreSectionLinks.filter(l => l.position < borderPosition);

  return {
    ruleName: 'Supplementary Link Placement',
    isPassing: violatingLinks.length === 0,
    details: violatingLinks.length > 0
      ? `${violatingLinks.length} Core Section links placed in Main Content instead of Supplementary`
      : 'Link placement follows PageRank optimization rules',
    remediation: 'Move links to Core Section topics to the Supplementary Content section (after the bridge heading).'
  };
}
```

---

### 3.2 Anchor Text Variety (Max 3 Rule)

**Research Rule (from `linking in website.md`):**
> "Dezelfde ankertekst mag maximaal drie keer per pagina worden gebruikt."

**Current State:** Partially checked in existing audit, but not comprehensive.

**Gap Details:**
- Need to count exact anchor text occurrences
- Include synonym detection for near-duplicates
- Flag templated-looking patterns

**Required Implementation:**

```typescript
function checkAnchorTextVariety(draft: string): AuditRuleResult {
  const links = extractLinksWithAnchors(draft);
  const anchorCounts = new Map<string, number>();

  links.forEach(link => {
    const normalized = link.anchor.toLowerCase().trim();
    anchorCounts.set(normalized, (anchorCounts.get(normalized) || 0) + 1);
  });

  const violations = Array.from(anchorCounts.entries())
    .filter(([_, count]) => count > 3)
    .map(([anchor, count]) => `"${anchor}" used ${count} times`);

  return {
    ruleName: 'Anchor Text Variety',
    isPassing: violations.length === 0,
    details: violations.length > 0
      ? `Anchor text repetition violations: ${violations.join('; ')}`
      : 'Anchor text variety is good',
    remediation: 'Use synonyms and phrase variations for repeated anchors.'
  };
}
```

---

### 3.3 Annotation Text Quality

**Research Rule (from `linking in website.md`):**
> "De tekst rondom de ankertekst (Annotation Text) moet de link's doel en context versterken."

**Current State:** Pass 6 mentions annotation text but doesn't validate quality.

**Gap Details:**
- No check that surrounding text explains WHY the link exists
- No validation that annotation includes target page context
- Missing micro-context explanation

**Required Implementation:**

```typescript
function checkAnnotationTextQuality(draft: string, allTopics: Topic[]): AuditRuleResult {
  const links = extractLinksWithContext(draft, 50); // 50 chars before/after

  const violations = links.filter(link => {
    const targetTopic = findTargetTopic(link.href, allTopics);
    if (!targetTopic) return false;

    // Check if annotation contains relevant terms from target
    const targetTerms = extractKeyTerms(targetTopic.title);
    const annotationHasContext = targetTerms.some(term =>
      link.contextBefore.includes(term) || link.contextAfter.includes(term)
    );

    return !annotationHasContext;
  });

  return {
    ruleName: 'Annotation Text Quality',
    isPassing: violations.length === 0,
    details: violations.length > 0
      ? `${violations.length} links lack contextual annotation text`
      : 'All links have proper annotation context',
    remediation: 'Add explanatory text around links that describes WHY the linked page is relevant.'
  };
}
```

---

## 4. Site-Wide Architecture Gaps (Future Phase)

These items require site-wide analysis beyond single-article scope:

### 4.1 Site-wide N-Grams

**Research Rule (from `macro context.md`):**
> "Ensure the Macro Context terms appear consistently across the site (Menu, Footer, Boilerplate)."

**Implementation:** Requires navigation/footer analysis across entire site.

### 4.2 Dynamic Navigation by Context

**Research Rule (from `linking in website.md`):**
> "Header- en Footer-links moeten dynamisch zijn en veranderen op basis van het segment waar de gebruiker zich bevindt."

**Implementation:** Already partially addressed by Foundation Pages feature. Could be enhanced.

### 4.3 Link Count Optimization (< 150)

**Research Rule (from `linking in website.md`):**
> "De totale hoeveelheid interne links moet worden beperkt tot minder dan 150 per pagina."

**Implementation:** Site-wide link audit feature needed.

### 4.4 PageRank Flow Direction Audit

**Research Rule (from `linking in website.md`):**
> "De autoriteit moet vloeien van de Author Section naar de Core Section."

**Implementation:** Requires site-wide link graph analysis.

---

## 5. Implementation Priority Matrix

| Gap | Category | Priority | Complexity | Prerequisite | Status |
|-----|----------|----------|------------|--------------|--------|
| 1.1 Macro/Micro Border | Page Segmentation | HIGH | Medium | Multipass Complete | IMPLEMENTED (Check #15) |
| 1.2 Predicate Consistency | Page Segmentation | MEDIUM | Low | Multipass Complete | IMPLEMENTED (Check #12) |
| 1.3 Extractive Summary | Page Segmentation | MEDIUM | Low | Pass 7 Complete | IMPLEMENTED (Check #16) |
| 1.4 Query-Format Alignment | Page Segmentation | MEDIUM | Medium | Brief Generation | IMPLEMENTED (Check #17) |
| 2.1 Coverage Weight | Audit | MEDIUM | Low | Pass 8 Complete | IMPLEMENTED (Check #13) |
| 2.2 Factual Consensus | Audit | LOW | High | Site-wide KG | FUTURE |
| 2.3 LLM Phrase Detection | Audit | HIGH | Low | Pass 5 Complete | IMPLEMENTED (Check #11) |
| 2.4 Vocabulary Richness | Audit | LOW | Low | Pass 8 Complete | IMPLEMENTED (Check #14) |
| 3.1 Supp. Link Placement | Linking | HIGH | Medium | 1.1 Complete | IMPLEMENTED (Check #20) |
| 3.2 Anchor Text Variety | Linking | MEDIUM | Low | Pass 8 Complete | IMPLEMENTED (Check #18) |
| 3.3 Annotation Quality | Linking | MEDIUM | Medium | Pass 6 Complete | IMPLEMENTED (Check #19) |
| 4.x Site-Wide | Architecture | LOW | High | Future Phase | FUTURE |

---

## 6. Recommended Implementation Order

### Phase A: Quick Wins (Add to Pass 8 Audit)
1. **2.3 LLM Phrase Detection** - Expand existing stop word list
2. **1.2 Predicate Consistency** - Add heading predicate check
3. **2.1 Coverage Weight** - Add section balance check
4. **2.4 Vocabulary Richness** - Add TTR calculation

### Phase B: Structural Enhancements
1. **1.1 Macro/Micro Border** - Add border heading to brief, validate in draft
2. **1.3 Extractive Summary** - Validate intro matches H2 first sentences
3. **1.4 Query-Format Alignment** - Enforce format based on query type

### Phase C: Link Optimization
1. **3.1 Supplementary Link Placement** - Zone-aware link validation
2. **3.2 Anchor Text Variety** - Comprehensive anchor audit
3. **3.3 Annotation Quality** - Context-aware link validation

### Phase D: Site-Wide (Future)
1. Site-wide N-gram optimization
2. Dynamic navigation enhancements
3. PageRank flow analysis

---

## 7. Success Criteria

When all gaps are addressed:

1. **Macro Context Validation Score:** >90% of articles have proper Macro/Micro segmentation
2. **Predicate Consistency:** 100% of heading vectors have consistent predicates
3. **LLM Signature Phrases:** 0 occurrences in published content
4. **Link Placement:** 100% of Core Section links in Supplementary zone
5. **Vocabulary Richness:** TTR > 0.4 for all articles
6. **Extractive Summary:** 100% of introductions preview all H2 topics in order

---

## 8. Appendix: Research Document References

| Document | Key Rules Extracted |
|----------|---------------------|
| `macro context.md` | Contextual Vector, Macro/Micro Border, Context Signifiers, Centerpiece, Summary Structure |
| `On page audit_framework.md` | E-A-T Signaling, Content Coverage Weight, Factual Consensus, Contextless N-grams |
| `linking in website.md` | PageRank Distribution, Anchor Text Rules, Annotation Text, Link Flow Direction |
| `website architecture sitemap.md` | Core/Author Section Structure, Dynamic Navigation, Corporate Pages |
| `micro semantics.md` | Already covered in multipass plan |
| `Headers H rules.md` | Already covered in multipass plan |
| `lists and tables.md` | Already covered in multipass plan |
