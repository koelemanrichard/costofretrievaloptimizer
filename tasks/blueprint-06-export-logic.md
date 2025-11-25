
# Task 06: Upgrade Export Logic (The Deliverable)

**Priority:** HIGH
**Status:** Completed
**Objective:** Ensure the exported Excel file populates the missing columns using the new Blueprint data.

## 1. Update `utils/exportUtils.ts`
*   Modify `generateMasterExport`.
*   **Fallback Logic:** For every column that was previously empty (Contextual Vector, Methodology, Anchor Text, etc.):
    *   Check `ContentBrief` first (if it exists).
    *   **Fallback:** Check `topic.metadata.blueprint`.
*   **Image Alt Text:** If missing in both, implement the fallback logic: `${topic.title} - ${pillars.centralEntity}`.

## 2. Final Verification
*   Generate Blueprints for a map (without generating full briefs).
*   Export to Excel.
*   **Success Criteria:** The previously empty columns (`Contextual Vector`, `Anchor Text`, `Methodology`) must now be populated with the AI-generated blueprint data.
