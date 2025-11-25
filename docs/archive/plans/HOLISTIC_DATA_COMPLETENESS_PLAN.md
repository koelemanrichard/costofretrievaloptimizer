# Holistic Data Completeness Plan: Topic Blueprints

**Status:** Proposed
**Objective:** Ensure the Topical Map export contains **100% of the required data dimensions** defined in the Holistic SEO framework, specifically filling the currently empty "Content Structure" and "Interlinking" columns without requiring full Content Brief generation.

## 1. Gap Analysis

### The Current State
The application currently operates in two modes:
1.  **Map Generation:** Creates Titles and basic Intent.
2.  **Metadata Enrichment:** Fills `Attribute`, `Query Type`, `Publication Date`, `Borders`. (This is working, as seen in your CSV).
3.  **Content Briefing:** Creates `Outline`, `Hints`, `Methodology`, `Linking`. (This works, but is slow/expensive and done one-by-one).

### The Missing Link: "Topic Blueprints"
According to the framework, the Topical Map acts as the *specification* for the writer. Therefore, structural decisions (`Contextual Vector`, `Methodology`, `Anchor Text`) must be made at the **Map Level**, not improvised during the Brief Level.

We need a new "Blueprint Generation" phase that sits between Map Generation and Content Briefing.

| Column Category | Missing Data Point | Proposed Source |
| :--- | :--- | :--- |
| **Contextual Flow** | `Contextual Vector (Outline)` | **New:** `Topic.metadata.blueprint.vector` |
| **Contextual Structure** | `Article Methodology` | **New:** `Topic.metadata.blueprint.methodology` |
| **Contextual Structure** | `Subordinate Text Hint` | **New:** `Topic.metadata.blueprint.subordinate_hint` |
| **Contextual Structure** | `Perspective Requirement` | **New:** `Topic.metadata.blueprint.perspective` |
| **Contextual Structure** | `Image Alt Text` | **Logic:** Auto-generate from `Title + Central Entity` if missing. |
| **Interlinking** | `Interlinking Strategy` | **New:** `Topic.metadata.blueprint.linking_strategy` |
| **Interlinking** | `Anchor Text` | **New:** `Topic.metadata.blueprint.anchor_text` |
| **Interlinking** | `Annotation Text Hints` | **New:** `Topic.metadata.blueprint.annotation_hint` |

---

## 2. Implementation Plan

### Phase 1: Schema Upgrade (The Data Container)
We need to store this "Blueprint" data in the `topics` table so it can be exported even if a full `content_brief` doesn't exist yet.

**Action:** Update `EnrichedTopic` metadata in `types.ts` to include a `blueprint` object:
```typescript
interface TopicBlueprint {
    contextual_vector: string; // "H2: History > H2: Types > H2: Cost"
    methodology: string; // "Comparative Analysis with Table"
    subordinate_hint: string; // "Define X using strict 'is a' syntax"
    perspective: string; // "Consumer Advocate"
    interlinking_strategy: string; // "Link to Core Hub for definitions"
    anchor_text: string; // "best x for y"
    annotation_hint: string; // "Mention X when discussing Y"
}
```

### Phase 2: Prompt Engineering (The "Architect" Agent)
We need a specialized prompt that acts as a "Content Architect". It must process topics in batches to maintain consistency.

**New Prompt:** `GENERATE_TOPIC_BLUEPRINT_PROMPT`
*   **Input:** List of Topic Titles, Central Entity, Source Context.
*   **Instructions:**
    *   "For each topic, design the **Contextual Vector** (Sequence of H2 headings)."
    *   "Define the **Methodology** (How should the article be formatted?)."
    *   "Draft the **Subordinate Text Hint** (Instructions for the first paragraph)."
    *   "Define the **Interlinking Strategy** (Targeting the Core Section)."

### Phase 3: Service Layer (The Logic)
**File:** `services/ai/mapGeneration.ts`

*   **Function:** `generateTopicBlueprints(topics, businessInfo)`
*   **Logic:**
    1.  Select topics where `metadata.blueprint` is missing.
    2.  Send to AI in batches (e.g., 5 topics per call for higher quality, or 10 for speed).
    3.  Update `topics` table in Supabase with the new metadata.

### Phase 4: UI Integration (The Controls)
**File:** `components/dashboard/StrategicContextPanel.tsx`

*   **Update:** The "Enrich Data" button should now have two modes or be upgraded:
    *   **Mode A: Basic Metadata** (Fast - Attributes, Dates).
    *   **Mode B: Structural Blueprints** (Deep - Outlines, Linking).
*   **Action:** Clicking "Generate Blueprints" triggers the new service.

### Phase 5: Export Logic (The Deliverable)
**File:** `utils/exportUtils.ts`

*   **Logic:** Update the `generateMasterExport` function.
*   **Fallback Chain:**
    *   *Column: Contextual Vector* -> Check `ContentBrief.outline`? If empty, check `Topic.metadata.blueprint.vector`.
    *   *Column: Methodology* -> Check `ContentBrief.methodology`? If empty, check `Topic.metadata.blueprint.methodology`.
    *   (Repeat for all columns).

---

## 3. Validation Steps

1.  **Database Check:** Verify the `metadata` column in Supabase receives the new `blueprint` JSON object.
2.  **UI Check:** Ensure the "Enrichment" process runs without crashing and updates the progress bar.
3.  **Export Check:** Generate an Excel file. Verify that `Contextual Vector` and `Anchor Text` columns are populated for topics that do *not* yet have a full content brief.
