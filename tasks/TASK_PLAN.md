# Task Plan: Full System Restoration (Post-Failure #13)

**Objective:** Address all reported regressions and stabilize the application by performing a holistic, end-to-end fix guided by our new Systems of Record.

---

### Phase 1: Database & Data Flow Correction (Fix the Root Cause)

1.  **Analyze the `400 Bad Request` Error.**
    *   **File:** `App.tsx` (to see the query)
    *   **File:** `database.types.ts` (to see expected schema)
    *   **File:** `SUPABASE_SETUP_GUIDE.md` (to see actual schema)
    *   **Task:** Identify the mismatch. The query in `App.tsx` filters `topical_maps` by `user_id`, but the `CREATE TABLE` statement in the guide is missing this column.
2.  **Rewrite `SUPABASE_SETUP_GUIDE.md` for Robust Migration.**
    *   **File:** `SUPABASE_SETUP_GUIDE.md`
    *   **Task:** Implement a safe, multi-step migration for all tables (`projects`, `topical_maps`, `topics`, `content_briefs`).
        *   Step 1: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS user_id uuid;` (as nullable)
        *   Step 2: `UPDATE` tables to backfill `user_id` from parent tables.
        *   Step 3: `ALTER TABLE ... ALTER COLUMN user_id SET NOT NULL;`
        *   Step 4: Add all Foreign Key constraints.
    *   **Validation:** This script must be fully idempotent and fix the schema mismatch.

---

### Phase 2: Component & Service Restoration

1.  **Restore the Full `SettingsModal.tsx`.**
    *   **File:** `components/SettingsModal.tsx`
    *   **Reference:** `CONFIG_SCHEMA.md`
    *   **Task:** Replace the current, incomplete component with the full-featured version. It must contain the tabbed layout and all 17 API key fields with labels.
2.  **Restore the Full `BusinessInfoForm.tsx`.**
    *   **File:** `components/BusinessInfoForm.tsx`
    *   **Task:** Replace the incomplete component with the full-featured version. It must include the "AI Configuration" section.
3.  **Restore the `MapSelectionScreen.tsx` Layout.**
    *   **File:** `components/MapSelectionScreen.tsx`
    *   **Task:** Restore the correct multi-column layout.
4.  **Overhaul `modelDiscoveryService.ts`.**
    *   **File:** `services/modelDiscoveryService.ts`
    *   **Task 1:** Implement a live `fetch` call to the OpenRouter `v1/models` endpoint.
    *   **Task 2:** Update the static model lists for OpenAI and Anthropic to the latest versions (`gpt-4o`, `claude-3-5-sonnet-20240620`).

---

### Phase 3: Data Flow & Logic Hardening

1.  **Fix `ProjectWorkspace.tsx` Data Integrity.**
    *   **File:** `components/ProjectWorkspace.tsx`
    *   **Task:** Ensure the `handleBusinessInfoComplete` function uses a strict whitelist to strip API keys before saving to the database.
2.  **Fix Wizard Component Context.**
    *   **Files:** `PillarDefinitionWizard.tsx`, `EavDiscoveryWizard.tsx`, `CompetitorRefinementWizard.tsx`
    *   **Task:** Ensure all wizard components correctly merge the map's strategic data with the global API keys from the user's settings before making any AI calls.
3.  **Enhance AI Prompts.**
    *   **File:** `config/prompts.ts`
    *   **Task:** Re-inject the `language`, `targetMarket`, and `audience` context into the key prompts to restore the quality of AI output.

---

### Phase 4: Final Validation

1.  **Execute the Full `TEST_PLAN.md`.**
    *   **File:** `TEST_PLAN.md`
    *   **Task:** Go through every single test case, including the UI, Data Flow, End-to-End, and Button Interaction tests.
    *   **Critical Validation:**
        *   Does Test 3.1 (Project & Map Loading) now pass without the `400 Bad Request` error?
        *   Does Test 1.1 (Settings UI) now pass, showing all 17 fields?
        *   Does Test 2.1 (Model Fetching) now pass, with a dynamic list from OpenRouter?
        *   Does Test 2.3 (AI Call Context) now pass without the "API key not configured" error?
    *   **Outcome:** All tests must pass before the task is considered complete.