
# Holistic Task 01: Schema, Type & Parser Upgrade

**Status:** [x] Completed
**Priority:** CRITICAL
**Objective:** Update the application's data structures to support the advanced "Cost of Retrieval" fields (Visual Semantics, Featured Snippet Targets, etc.) defined in the improvement plan. This must be done *before* updating prompts to ensure data can be validated and stored.

## 1. Update `types.ts`

Add/Update the following interfaces:

1.  **`VisualSemantics` Interface:**
    ```typescript
    export interface VisualSemantics {
        type: 'INFOGRAPHIC' | 'CHART' | 'PHOTO' | 'DIAGRAM';
        description: string;
        caption_data: string; // Data points or specific caption text
        height_hint?: string;
        width_hint?: string;
    }
    ```

2.  **`FeaturedSnippetTarget` Interface:**
    ```typescript
    export interface FeaturedSnippetTarget {
        question: string;
        answer_target_length: number; // e.g. 40
        required_predicates: string[]; // Verbs/terms to include
        target_type: 'PARAGRAPH' | 'LIST' | 'TABLE';
    }
    ```

3.  **Update `ContentBrief` Interface:**
    *   Add `query_type_format: string;` (e.g., 'Ordered List', 'Prose').
    *   Add `featured_snippet_target?: FeaturedSnippetTarget;`
    *   Add `visual_semantics: VisualSemantics[];` (Replace or augment existing `visuals`).
    *   Add `discourse_anchors: string[];` (List of mutual words for transitions).

## 2. Update `config/schemas.ts`

Update the `CONTENT_BRIEF_SCHEMA` (Google GenAI Schema) to match the new types exactly. This is critical for the AI to return the correct JSON structure.

*   Add `query_type_format` (String).
*   Add `featured_snippet_target` (Object with properties).
*   Add `visual_semantics` (Array of Objects with properties).
*   Add `discourse_anchors` (Array of Strings).

**Update `CONTENT_BRIEF_FALLBACK`:**
*   Ensure default values exist for these new fields (e.g., `visual_semantics: []`).

## 3. Update `utils/parsers.ts`

Update `sanitizeBriefFromDb`:
*   Add logic to safely parse `visual_semantics`. Ensure it's an array.
*   Add logic to safely parse `featured_snippet_target` and `discourse_anchors`.
*   Ensure backward compatibility (if fields are missing in DB, use defaults).

## 4. Verification
*   **Compile:** Ensure no TypeScript errors in the project.
*   **Type Check:** Verify `geminiService.ts` accepts the updated schema.

**Next Task:** `tasks/holistic-02-brief-prompt-engineering.md`
