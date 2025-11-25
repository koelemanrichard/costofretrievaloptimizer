# User Feedback Improvements Plan

**Status:** Active
**Objective:** Enhance user control over the map generation process by adding AI-assisted inputs for topic creation and expansion, and fix UI bugs regarding loading states.

## 1. Fix Expansion Spinner (Bug Fix)

*   **Issue:** The spinner icon on the "Expand" button persists indefinitely after the operation completes.
*   **Diagnosis:** The `expandingCoreTopicId` derivation in `ProjectDashboardContainer` relies on finding a key in the `isLoading` object. If the `finally` block in the handler fails or the key string format mismatches, the UI gets stuck.
*   **Fix:** 
    1. Verify the key construction: `expand_${topic.id}`.
    2. Ensure the `finally` block in `onExpandCoreTopic` *always* dispatches `SET_LOADING` to false, even if errors occur.
    3. Refactor the `isLoading` check to be robust.

## 2. AI-Assisted Core Topic Addition

*   **Goal:** Allow users to add Core Topics by describing their thoughts, rather than just manual entry or full map generation.
*   **UI Changes (`AddTopicModal.tsx`):**
    *   Add a Tab/Toggle: "Manual Entry" vs "AI Assistant".
    *   **AI Assistant View:**
        *   Input: "Describe the topic or business aspect you want to add..."
        *   Button: "Generate Suggestions".
        *   List: Display AI-generated candidates (Title + Description + Type).
        *   Action: Checkboxes to select multiple candidates -> "Add Selected".
*   **Logic Changes:**
    *   New Service: `generateCoreTopicSuggestions` in `services/ai/mapGeneration.ts`.
    *   New Prompt: `GENERATE_CORE_TOPIC_SUGGESTIONS_PROMPT`.

## 3. Guided Topic Expansion

*   **Goal:** Allow users to provide specific context/instructions when expanding a Core Topic, instead of relying solely on the AI's default context.
*   **UI Changes (`TopicExpansionModal.tsx` - New Component):**
    *   Replace the immediate "Expand" action in `TopicItem`/`TopicDetailPanel` with opening this modal.
    *   **Modal Content:**
        *   Display Core Topic Title.
        *   Expansion Mode Selector (Attribute, Entity, Context).
        *   **New Input:** "Additional Instructions (Optional)" - e.g., "Focus on our cloud services."
        *   Buttons: "Auto-Expand" (Default) vs "Expand with Instructions".
*   **Logic Changes:**
    *   Update `expandCoreTopic` service to accept `userContext?: string`.
    *   Update `EXPAND_CORE_TOPIC_PROMPT` to inject this user context into the prompt.

## 4. Execution Plan

1.  **Fix Spinner:** Patch `ProjectDashboardContainer.tsx`.
2.  **Backend/AI:** Update `prompts.ts` and `mapGeneration.ts` to support the new AI features.
3.  **UI - Add Topic:** Update `AddTopicModal` with the AI Assistant tab.
4.  **UI - Expand Topic:** Create `TopicExpansionModal` and update the expansion flow in `ProjectDashboardContainer`.
