
# Improvement Task 02: Refactor AI Service Architecture

**Status:** [x] Completed
**Priority:** HIGH
**Objective:** Prevent `services/aiService.ts` from becoming unmaintainable. The new plans require complex logic for map generation, brief writing, and validation. We will split the service into domain-specific modules.

## 1. New Directory Structure
Create `services/ai/` directory.

*   `services/ai/index.ts`: The main entry point (The "Dispatcher"). Replaces current `aiService.ts`.
*   `services/ai/mapGeneration.ts`: Handles `generateInitialTopicalMap`, `addTopicIntelligently`, `expandCoreTopic`.
*   `services/ai/briefGeneration.ts`: Handles `generateContentBrief`, `generateArticleDraft`.
*   `services/ai/analysis.ts`: Handles `validateTopicalMap`, `analyzeSemanticRelationships`, `auditContentIntegrity`.
*   `services/ai/clustering.ts`: Handles `findMergeOpportunities` and new Canonical Clustering logic.

## 2. Implementation Steps
1.  **Create Files:** Create the directory and files above.
2.  **Migrate Code:** Move the logic from the current `aiService.ts` into the respective files.
3.  **Preserve Switch Logic:** Ensure each module still uses the `switch(provider)` pattern or imports the specific provider functions (which can remain in `services/geminiService.ts` etc., or be split similarly if they get too big). *For now, keep provider files as is, just split the orchestrator logic.*
4.  **Update Imports:** Update `ProjectDashboardContainer.tsx` and other consumers to import from `services/ai` (which exports from `index.ts`).
    *   *Update:* `services/aiService.ts` was converted into a re-export hub to maintain compatibility without requiring massive immediate changes to all consumer files.

## 3. Verification
*   Run the "Generate Brief" workflow.
*   Run the "Validate Map" workflow.
*   Ensure all existing functionality works exactly as before, just with a cleaner file structure.
