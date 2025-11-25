
# Plan: Fix "Untitled Topic" / Empty Brief Bug

**Status:** Proposed
**Priority:** CRITICAL
**Objective:** Fix the issue where generating a content brief results in an "Untitled Topic" state with no content, even when metadata exists.

## 1. Diagnosis
The user reported: "topic is available all meta information has been processed, however the content brief generation says 'untitled topic' and everything is empty."

**Likely Root Cause:**
The AI Service returns a JSON object for the brief. If the AI fails to explicitly mirror the `title` field back in its JSON response (or returns an empty string), the application currently uses that empty value.
*   **Current Logic:** `const newBrief = { ...briefDataFromAI, id: uuid() }`.
*   **The Flaw:** We are trusting the AI to remember the title we sent it. If it forgets, we lose the title mapping.

## 2. Remediation Strategy (The Fallback Safety Net)

We should never rely 100% on the AI to echo back the Topic Title. We *know* the topic title because we initiated the generation for that specific topic.

**The Fix:**
In `ProjectDashboardContainer.tsx` -> `onGenerateBrief`:
1.  Receive the `briefData` from the AI service.
2.  **Forcefully Overwrite** the `title` and `topic_id` using the data from the actual `topic` object we clicked on.
3.  This guarantees the brief is linked to the correct topic and has the correct title, even if the AI hallucinated an empty response.

## 3. Implementation Tasks

### Task 01: Force Title Consistency
**File:** `components/ProjectDashboardContainer.tsx`
**Logic Update:**
```typescript
// Inside onGenerateBrief
const briefData = await aiService.generateContentBrief(...);

// MERGE STRATEGY:
const newBrief: ContentBrief = { 
    ...briefData, 
    // SAFETY OVERRIDES:
    title: topic.title, // Use the known Topic Title, ignoring AI's echo
    topic_id: topic.id,
    id: uuidv4() 
};
```

### Task 02: Verification
**File:** `components/BriefReviewModal.tsx`
*   Ensure the modal reads from `state.briefGenerationResult`.
*   Since we fixed the data *before* it went into the state, the Modal will now correctly display "Bloxs" (or the correct title) instead of "Untitled".
