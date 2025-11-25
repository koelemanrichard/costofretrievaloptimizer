
# Functional Task 03: Wire Content Tools

**Status:** Completed
**Priority:** MEDIUM
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. Objective
Implement the actual content generation and auditing logic for the Drafting phase.

## 2. Implementation Steps

### Handler 1: `onGenerateDraft`
-   **Input:** `brief: ContentBrief`.
-   **AI Call:** `aiService.generateArticleDraft(brief, ...)`.
-   **State Update:**
    -   Update the `brief` object in the state with the new `articleDraft` string.
    -   Persist the draft to Supabase `content_briefs` table.
    -   Open `DraftingModal`.

### Handler 2: `onAuditDraft`
-   **Input:** `brief: ContentBrief`, `draft: string`.
-   **AI Call:** `aiService.auditContentIntegrity(brief, draft, ...)`.
-   **State Update:**
    -   Dispatch `SET_CONTENT_INTEGRITY_RESULT`.
    -   Open `ContentIntegrityModal`.

### Handler 3: `onGenerateSchema`
-   **Input:** `brief: ContentBrief`.
-   **AI Call:** `aiService.generateSchema(brief, ...)`.
-   **State Update:**
    -   Dispatch `SET_SCHEMA_RESULT`.
    -   Open `SchemaModal`.

## 3. Verification
-   Generate a draft. Verify text appears.
-   Run an audit. Verify scores appear.
-   Generate schema. Verify JSON-LD appears.
