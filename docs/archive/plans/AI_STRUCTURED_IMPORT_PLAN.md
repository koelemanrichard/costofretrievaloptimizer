# Plan: AI-Assisted Structured Topic Import

**Status:** Proposed
**Priority:** HIGH
**Objective:** Upgrade the "AI Assistant" in the `AddTopicModal` to support generating mixed Core and Outer topics from a single user input. The AI should intelligently determine the hierarchy, assigning Outer topics to either existing Core topics or *new* Core topics generated in the same batch.

## 1. The Problem
Currently, the "AI Assistant" tab only generates `Core` topics. It ignores the user's intent if they provide a list of specific sub-topics or a full cluster (e.g., "Moving Guide" + 10 specific moving tips). The "Let AI Decide" placement logic exists in the "Manual" tab but is missing from the "AI Assistant" workflow.

## 2. Technical Strategy

### A. Prompt Engineering (`config/prompts.ts`)
We need a new prompt: `GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT`.
*   **Input:** User thoughts (raw text/list), List of *Existing* Core Topic Titles.
*   **Instruction:** "Analyze the user input. Break it down into distinct topics. For each topic, decide if it should be a **Core Topic** (Pillar) or an **Outer Topic** (Cluster). If it is an Outer Topic, assign it a `parentTopic`. This parent can be one of the *Existing* topics provided, OR one of the *New* Core topics you are creating right now."
*   **Output Schema:**
    ```json
    [
      {
        "title": "string",
        "description": "string",
        "type": "core" | "outer",
        "suggestedParent": "string" // Title of the parent (Existing or New)
      }
    ]
    ```

### B. Service Layer (`services/ai/mapGeneration.ts`)
*   New function: `generateStructuredTopicSuggestions`.
*   It calls the new prompt.
*   It returns the raw list of suggestions.

### C. Logic & State (`components/AddTopicModal.tsx`)
*   Update `suggestions` state to store the more complex object (type, parent).
*   **UI Update:**
    *   Display the `type` (Core/Outer) in the list.
    *   If Outer, display "Placed under: [Parent Title]".
    *   (Optional) Allow user to override the type/parent in the list before adding (Future polish, stick to read-only verification for MVP).

### D. The "Dependency" Solver (`components/ProjectDashboardContainer.tsx`)
The `onBulkAddTopics` handler processes items in parallel. This will fail if we try to insert an Outer topic *before* its new Core parent exists (we need the Parent's UUID).

**Refactoring `onBulkAddTopics`:**
1.  **Phase 1 (Core):** Filter the list for `type === 'core'`. Insert them into Supabase. Store the mapping of `Title -> NewUUID`.
2.  **Phase 2 (Outer):** Filter the list for `type === 'outer'`.
    *   Iterate through them.
    *   Resolve `parent_topic_id`:
        *   Check `Title -> NewUUID` map (Is the parent one we just created?).
        *   Check `allTopics` (Is the parent an existing topic?).
        *   If neither, map to `null` (Root) or skip.
    *   Insert Outer topics with the resolved `parent_topic_id`.

## 3. Execution Steps

1.  **Task 1:** Create `GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT` in `config/prompts.ts`.
2.  **Task 2:** Implement `generateStructuredTopicSuggestions` in `services/ai/mapGeneration.ts`.
3.  **Task 3:** Update `AddTopicModal.tsx` to use the new service and display hierarchy info.
4.  **Task 4:** Refactor `onBulkAddTopics` in `ProjectDashboardContainer.tsx` to handle the 2-pass insertion logic (Core then Outer).

## 4. Verification
1.  Open Add Topic -> AI Assistant.
2.  Input: "Create a guide for 'Office Cleaning' (core) and include 'Desks', 'Floors', 'Windows' as subtopics."
3.  Click Generate.
4.  Verify list shows 1 Core and 3 Outers (linked to 'Office Cleaning').
5.  Click Add.
6.  Verify map updates correctly with the hierarchy preserved.