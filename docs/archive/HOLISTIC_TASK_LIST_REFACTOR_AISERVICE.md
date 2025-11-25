# Task List: Refactor `aiService.ts` with Explicit Dispatcher

**Objective:** Execute the plan from `HOLISTIC_PLAN_REFACTOR_AISERVICE.md` by replacing the `delegate` function with a simple, robust `switch`-based dispatch system.

---

### Phase 1: Pre-computation & Setup

-   [x] **Analyze Root Cause:** Confirmed that the `delegate` function's complexity is the source of instability and untraceable bugs.
-   [x] **Formulate Strategy:** Finalized the "Explicit Dispatcher" strategy using `switch` statements for maximum clarity and type safety.

---

### Phase 2: Implementation (Function by Function)

This will be done for `services/aiService.ts`.

1.  **Setup the File:**
    *   [ ] Delete the `delegate` function entirely.
    *   [ ] Delete the `getProvider` function.
    *   [ ] Add direct imports for all provider services at the top of the file:
        ```typescript
        import * as geminiService from './geminiService';
        import * as openAiService from './openAiService';
        // ... and so on for all 5 providers.
        ```
    *   [ ] Keep the `providers` constant object as it can be used for reference if needed, or remove it if unused.

2.  **Refactor Each Exported Function (Repeat for all 22 functions):**
    *   **Target:** `export const suggestCentralEntityCandidates = ...`
    *   **Action:** Rewrite the function body to implement the `switch` pattern. The first argument will always be `businessInfo`.
    *   **Example Implementation for `generateContentBrief`:**
        ```typescript
        export const generateContentBrief: typeof geminiService.generateContentBrief = (
            businessInfo, ...args
        ) => {
            switch (businessInfo.aiProvider) {
                case 'openai':
                    // @ts-ignore - The function signatures are identical, but TS struggles with the union type.
                    return openAiService.generateContentBrief(businessInfo, ...args);
                case 'anthropic':
                     // @ts-ignore
                    return anthropicService.generateContentBrief(businessInfo, ...args);
                // ... other cases
                case 'gemini':
                default:
                     // @ts-ignore
                    return geminiService.generateContentBrief(businessInfo, ...args);
            }
        };
        ```
    *   **Note:** Use a generic signature like `(businessInfo: BusinessInfo, ...args: any[])` and add `@ts-ignore` if TypeScript struggles with the signature union across providers. The explicit type on the export (`: typeof geminiService.generateContentBrief`) provides the necessary external type safety.
    *   **Checklist of functions to refactor:**
        - [ ] `suggestCentralEntityCandidates`
        - [ ] `suggestSourceContextOptions`
        - [ ] `suggestCentralSearchIntent`
        - [ ] `discoverCoreSemanticTriples`
        - [ ] `expandSemanticTriples`
        - [ ] `generateInitialTopicalMap`
        - [ ] `suggestResponseCode`
        - [ ] `generateContentBrief`
        - [ ] `findMergeOpportunitiesForSelection`
        - [ ] `generateArticleDraft`
        - [ ] `auditContentIntegrity`
        - [ ] `generateSchema`
        - [ ] `analyzeGscDataForOpportunities`
        - [ ] `validateTopicalMap`
        - [ ] `improveTopicalMap`
        - [ ] `findMergeOpportunities`
        - [ ] `analyzeSemanticRelationships`
        - [ ] `analyzeContextualCoverage`
        - [ ] `auditInternalLinking`
        - [ ] `calculateTopicalAuthority`
        - [ ] `generatePublicationPlan`
        - [ ] `findLinkingOpportunitiesForTopic`
        - [ ] `addTopicIntelligently`
        - [ ] `expandCoreTopic`

---

### Phase 3: Validation

1.  **Perform End-to-End Test:**
    *   [ ] Execute the full "Generate Brief" workflow as described in `HOLISTIC_TEST_PLAN_REFACTOR_AISERVICE.md`.
    *   [ ] **Verification:** The application must not crash, and the brief must be generated and displayed correctly in the review modal.

2.  **Perform Type-Checking:**
    *   [ ] Run the application's build/type-check command.
    *   [ ] **Verification:** There should be no new TypeScript errors originating from components that consume `aiService` functions. This confirms that the explicit export types are working correctly.

3.  **Perform Code Review:**
    *   [ ] Review the diff for `services/aiService.ts`.
    *   [ ] **Verification:** The file should be significantly more explicit and easier to read. The logic flow for any given function call should be immediately obvious from the `switch` statement.

---

### Post-computation

-   [ ] Mark task as complete once all validation steps pass.
