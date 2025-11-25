
# Task: AI-Assisted Core Topic Creation

**Status:** [x] Completed
**Priority:** MEDIUM (Feature)
**Target Files:** 
- `config/prompts.ts`
- `services/ai/mapGeneration.ts`
- `components/AddTopicModal.tsx`

## 1. Objective
Allow users to input raw thoughts/business context and have the AI generate a list of viable Core Topics to add to the map.

## 2. Implementation Steps

### Step 2.1: Prompt Engineering (`config/prompts.ts`)
-   Create `GENERATE_CORE_TOPIC_SUGGESTIONS_PROMPT(userThoughts, businessInfo)`.
-   Instruction: "Based on the user's input '${userThoughts}' and the business context, suggest 3-5 high-value Core Topics. Return JSON array: [{ title, description, reasoning }]."

### Step 2.2: Service Logic (`services/ai/mapGeneration.ts`)
-   Implement `generateCoreTopicSuggestions(userThoughts, businessInfo, dispatch)`.
-   Call the new prompt.
-   Return the array of suggestions.

### Step 2.3: UI Update (`components/AddTopicModal.tsx`)
-   Add Tabs: "Manual Entry" (Default) vs. "AI Assistant".
-   **AI Assistant Tab:**
    -   `Textarea` for user thoughts.
    -   `Button` "Generate Suggestions".
    -   **Results List:** Render cards for each suggestion with a checkbox.
    -   **Action:** "Add Selected Topics" button. Calls `onAddTopic` loop for selected items.

## 3. Verification
1.  Open "Add Topic Manually".
2.  Switch to "AI Assistant".
3.  Type "We also do cloud migrations".
4.  Click Generate.
5.  Select a suggestion and Add.
6.  Verify topic appears in the map.
