
# Task: Persist Content Audit Results

**Status:** [x] Completed
**Priority:** MEDIUM
**Objective:** Save the "Content Integrity Audit" results so they aren't lost on close.

## 1. Database Migration
- Create `docs/migrations/04_add_content_audit.txt`.
- Add `content_audit` JSONB column to `content_briefs`.

## 2. Update Logic
- Update `types.ts` (ContentBrief).
- Update `utils/parsers.ts`.
- Update `onAuditDraft` in `ProjectDashboardContainer.tsx` to save the result.

## 3. Verification
- Run Audit.
- Close modal.
- Reload page.
- Open Audit modal (needs hydration logic or check state).
