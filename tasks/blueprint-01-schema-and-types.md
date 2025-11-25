
# Task 01: Schema & Types for Topic Blueprints

**Status:** [x] Completed
**Priority:** CRITICAL
**Objective:** Define the data structures required to store "Blueprint" data (outlines, methodology, linking) within the Topic metadata, separate from the full Content Brief.

## 1. Update `types.ts`
*   Define the `TopicBlueprint` interface:
    ```typescript
    export interface TopicBlueprint {
        contextual_vector: string; // H2 sequence
        methodology: string;
        subordinate_hint: string;
        perspective: string;
        interlinking_strategy: string;
        anchor_text: string;
        annotation_hint: string;
        image_alt_text?: string; // Optional override
    }
    ```
*   Update `EnrichedTopic` metadata to include `blueprint?: TopicBlueprint`.

## 2. Update `utils/parsers.ts`
*   Modify `sanitizeTopicFromDb`.
*   Extract the `blueprint` object from the `metadata` JSONB column.
*   Ensure it defaults to `undefined` if not present (so we know when to generate it).
*   Implement safe parsing for the blueprint fields (use `safeString`).

## 3. Verification
*   Compile the project.
*   Ensure no type errors in existing components.
