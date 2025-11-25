# Persistence Audit Plan

**Date:** Current
**Status:** Active
**Objective:** Identify all application features where AI-generated data or user actions are stored only in local React state and are lost upon page reload.

## 1. Critical Data Loss Vectors

### A. Internal Linking (High Severity)
*   **Feature:** "View Internal Linking" -> "Find Linking Opportunities".
*   **Current Behavior:** The user clicks the button, AI suggests links, and the app dispatches `UPDATE_BRIEF_LINKS`. This updates the `activeMap.briefs` in memory.
*   **The Gap:** There is **no database call** to update the `contextual_bridge` column in the `content_briefs` table.
*   **Impact:** If the user refreshes, all accepted internal linking opportunities are lost.

### B. Analysis Reports (Medium Severity - Expensive Re-runs)
*   **Feature:** "Validate Map", "Analyze Semantics", "Contextual Coverage", "Topical Authority".
*   **Current Behavior:** The AI generates a report (e.g., `ValidationResult`). It is stored in `state.validationResult`.
*   **The Gap:** These results are not saved to the `projects` or `topical_maps` tables.
*   **Impact:** Users must re-spend API credits and wait for processing every time they reload the page to see these reports again.
*   **Proposed Fix:** Add a `reports` or `analysis_history` JSONB column to `topical_maps` to cache the latest result for each tool.

### C. GSC Opportunities (Medium Severity)
*   **Feature:** "Upload GSC CSV".
*   **Current Behavior:** CSV is parsed, AI analyzes it, results go to `state.gscOpportunities`.
*   **The Gap:** Results are transient.
*   **Impact:** User must re-upload and re-analyze if they navigate away.

### D. Draft Audits (Low Severity)
*   **Feature:** "Audit Content Integrity" (Drafting Modal).
*   **Current Behavior:** Result stored in `state.contentIntegrityResult`.
*   **The Gap:** Not saved.
*   **Impact:** Audit scores are lost on close/reload.

## 2. Remediation Strategy

We will address these in priority order.

1.  **Fix Internal Linking Persistence:** This is actual content work being lost.
2.  **Cache Analysis Reports:** This is an efficiency/cost issue.

## 3. Task List

1.  **Task P-01:** Implement persistence for Internal Linking opportunities in `InternalLinkingModal`.
2.  **Task P-02:** Add `analysis_state` column to `topical_maps` to store the latest results of Validation, Semantics, and Authority checks.
3.  **Task P-03:** Update analysis handlers in `ProjectDashboardContainer` to save results to this new column.
