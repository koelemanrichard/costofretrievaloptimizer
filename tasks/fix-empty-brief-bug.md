
# Task: Fix Empty Brief / "Untitled Topic" Bug

**Status:** [x] Completed
**Priority:** CRITICAL
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. Objective
Ensure that generated Content Briefs always have the correct Title and Topic ID, regardless of what the AI returns in its JSON payload.

## 2. Implementation Steps

### Step 2.1: Modify `onGenerateBrief` Handler
1.  [x] Open `components/ProjectDashboardContainer.tsx`.
2.  [x] Locate the `onGenerateBrief` function.
3.  [x] Find the line where `newBrief` is constructed: `const newBrief: ContentBrief = { ...briefData, ... };`.
4.  [x] **Update the construction:** Explicitly overwrite `title` and `topic_id` using the `topic` argument passed to the function.
    ```typescript
    const newBrief: ContentBrief = { 
        ...briefData, 
        id: uuidv4(),
        topic_id: topic.id, // Ensure strict linkage
        title: topic.title  // Ensure strict naming (Fixes "Untitled")
    };
    ```

## 3. Verification
1.  [x] Select a topic (e.g., "Bloxs").
2.  [x] Click "Generate Brief".
3.  [x] When the Review Modal opens, verify the Header says "Bloxs" (or the topic title), NOT "Untitled Topic".
4.  [x] Save the brief and verify it persists in the Dashboard.

**Progress Update:**
- Executed the fix in `ProjectDashboardContainer.tsx` to force title consistency during brief generation.
- This addresses the user reported issue of "Untitled Topic" appearing when generating content briefs.

**Next Task:** `docs/plans/TOPICAL_MAP_IMPROVEMENT_PART1.md` (Holistic SEO improvements) or continue with any pending bug fixes if reported.
