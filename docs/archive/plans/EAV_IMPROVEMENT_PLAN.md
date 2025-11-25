
# EAV Engine Upgrade Plan: The Semantic Core

**Status:** Proposed
**Objective:** Upgrade the application's `SemanticTriple` logic from a flat list of facts to a rigorous, multi-dimensional **Entity-Attribute-Value Model** that enforces the rules of the Holistic SEO framework (I-V).

---

## 1. Gap Analysis: Current vs. Specification

| Feature | Specification Rule | Current Implementation | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Taxonomy** | **I.B, I.C:** Attributes must be classified as **Root** (Definitional), **Unique** (Authority), or **Rare** (Depth). | Flat `SemanticTriple` list. No classification. | **CRITICAL** |
| **Prioritization** | **I.D:** Content must be ordered: **Unique $\rightarrow$ Root $\rightarrow$ Rare**. | Random or AI-determined order. | **HIGH** |
| **Validation** | **III.C:** Values must have **Truth Ranges** if variable. | Single string values. No range support. | **HIGH** |
| **Density** | **I.E:** One EAV triple per sentence (Information Density). | General "high quality" prompt. No strict enforcement. | **MEDIUM** |
| **Classification** | **II.D:** Attributes must be segmented (Types, Components, Benefits). | Generic `predicate` string. | **MEDIUM** |
| **Consistency** | **III.A:** Values must be consistent across the entire graph. | No cross-check between briefs. | **HIGH** |

---

## 2. Schema & Data Model Upgrades

We need to enrich the `SemanticTriple` interface to carry metadata required for the "Blind Librarian".

### A. Enhanced Semantic Triple
**Target:** `types.ts`, `database.types.ts`

```typescript
export type AttributeCategory = 'UNIQUE' | 'ROOT' | 'RARE' | 'COMMON';
export type AttributeClass = 'TYPE' | 'COMPONENT' | 'BENEFIT' | 'RISK' | 'PROCESS';

export interface EnhancedSemanticTriple {
  subject: { 
      label: string; 
      type: string; // e.g. "Entity"
  };
  predicate: { 
      relation: string; // e.g. "has_population"
      category: AttributeCategory; // NEW: Rule I.B, I.C
      classification?: AttributeClass; // NEW: Rule II.D
  };
  object: { 
      value: string; 
      unit?: string; // NEW: Rule III.B (Precision)
      truth_range?: string; // NEW: Rule III.C (e.g. "7.0 - 7.8")
      confidence: number; 
  };
  source_context_relevance: number; // Rule II.A
}
```

---

## 3. AI Service & Logic Upgrades

### Phase 1: The EAV Classifier (Taxonomy)
**Target:** `services/ai/mapGeneration.ts` (`enrichEAVs`)

We cannot rely on the user to classify every EAV. We need a new AI step.
*   **Input:** Raw List of EAVs + Central Entity + Source Context.
*   **Prompt:** "Classify these attributes based on the entity '{entity}'. Label 'Root' (essential), 'Unique' (distinguishing), and 'Rare' (deep detail). Filter out attributes irrelevant to '{sourceContext}'."

### Phase 2: The Truth Engine (Validation)
**Target:** `services/ai/analysis.ts`

*   **Logic:** When generating a new brief, cross-reference its EAVs against the existing `KnowledgeGraph`.
*   **Rule III.A:** If Article A said "Berlin Population: 3.7M" and Article B tries to say "3.5M", flag a **Consistency Violation**.

### Phase 3: Structural Injection (The Template)
**Target:** `services/ai/briefGeneration.ts`

*   **Logic:** When generating the `ContentBrief`, we must inject the EAVs in the specific order defined by **Rule I.D**.
*   **Prompt Injection:**
    *   "**Section 1 (Authority):** Cover these **Unique Attributes**: [List...]"
    *   "**Section 2 (Definition):** Cover these **Root Attributes**: [List...]"
    *   "**Section 3 (Depth):** Cover these **Rare Attributes**: [List...]"

### Phase 4: Algorithmic Authorship (Density)
**Target:** `config/prompts.ts` (`GENERATE_ARTICLE_DRAFT_PROMPT`)

*   **New Instruction (Rule I.E):** "Adopt a strict **Information Density** protocol. Construct sentences to deliver one clear EAV triple at a time. Avoid compound sentences that obscure the Subject-Predicate-Object relationship."

---

## 4. User Interface Upgrades

### A. EAV Manager 2.0
**Target:** `components/EavManagerModal.tsx`

*   **Update UI:** Display tags for `Root`, `Unique`, `Rare`.
*   **Sorting:** Allow users to sort by Importance/Category.
*   **Validation:** Show a "Truth Range" input field for numerical values.

### B. Brief Review
**Target:** `components/BriefReviewModal.tsx`

*   **Visuals:** Highlight the "Unique Attributes" that will be covered in the article to reassure the user of the content's authority.

---

## 5. Implementation Task List

1.  **Task EAV-01 (Schema):** Update `types.ts` with `AttributeCategory`, `AttributeClass` and update `SemanticTriple` definition.
2.  **Task EAV-02 (Parsers):** Update `utils/parsers.ts` to handle the new complex EAV object structure safely.
3.  **Task EAV-03 (Discovery):** Rewrite `DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT` to output the classified structure (Root/Unique/Rare) and Truth Ranges.
4.  **Task EAV-04 (Manager):** Update `EavManagerModal.tsx` to allow viewing and editing these new fields.
5.  **Task EAV-05 (Drafting):** Update the Brief Generation prompt to enforce the **Unique $\rightarrow$ Root $\rightarrow$ Rare** ordering strategy.

