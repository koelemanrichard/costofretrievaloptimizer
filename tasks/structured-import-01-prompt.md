
# Task: Implement Structured AI Prompt

**Priority:** HIGH
**Target File:** `config/prompts.ts`

## 1. Objective
Create a new prompt that instructs the AI to analyze user input and generate a structured list of topics, determining which are Core and which are Outer, and assigning parentage where appropriate.

## 2. Implementation Steps
1.  Open `config/prompts.ts`.
2.  Add a new export: `GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT`.
3.  **Arguments:** `userThoughts: string`, `existingCoreTopics: { title: string, id: string }[]`, `info: BusinessInfo`.
4.  **Prompt Logic:**
    *   Context: Business Info + Existing Core Topics.
    *   Input: User thoughts/list.
    *   Instruction: "Identify distinct topics. Classify as 'core' or 'outer'. For 'outer' topics, assign a 'suggestedParent' which matches either an *existing* core topic title or a *newly created* core topic title."
    *   Output Schema:
        ```json
        [
          {
            "title": "string",
            "description": "string",
            "type": "core" | "outer",
            "suggestedParent": "string" // Title of the parent
          }
        ]
        ```

## 3. Verification
-   This is a code-only change. Verification happens in later steps when the service calls it.

**Status:** [x] Completed
