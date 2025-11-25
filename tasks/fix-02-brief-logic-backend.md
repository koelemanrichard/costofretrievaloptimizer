
# Task: Update Brief Parsers & Batch Processor

**Priority:** HIGH
**Objective:** Ensure the application correctly reads the new DB columns into the application state, and that the Batch Processor saves them correctly.

## 1. Update Parsers
**File:** `utils/parsers.ts`
- Update `sanitizeBriefFromDb`.
- Map the new DB columns (`outline`, `serp_analysis`, etc.) to the `ContentBrief` object properties.
- Ensure correct types are returned (parsing JSON columns back to objects/arrays).

## 2. Update Batch Processor
**File:** `services/batchProcessor.ts`
- In `generateAllBriefs`, update the `supabase.from('content_briefs').insert(...)` call.
- Include all the new fields (`outline`, `serp_analysis`, etc.) in the payload.

## 3. Verification
- Batch generation should now persist full brief data.
- Reloading the page should show the full brief data (after Task 01 SQL is run).

**Status:** [x] Completed
