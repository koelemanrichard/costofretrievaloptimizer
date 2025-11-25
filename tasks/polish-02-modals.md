
# Polish Task 02: Standardize Modals

**Status:** [x] Completed
**Priority:** LOW (Code Hygiene)
**Target Files:**
- `components/DraftingModal.tsx`
- `components/BriefReviewModal.tsx`
- `components/ContentBriefModal.tsx`

## 1. The Issue
These modals currently use ad-hoc sanitization logic like `String(val || '')` or `typeof val === 'string' ? ...`. While effective, this is inconsistent with the rest of the application which uses `safeString`.

## 2. Implementation Steps

### Step 2.1: `DraftingModal.tsx`
1.  Import `safeString` from `../utils/parsers`.
2.  Remove the local `safeString` definition if it exists.
3.  Update `ReactMarkdown` usage: `<ReactMarkdown>{safeString(draft)}</ReactMarkdown>`.
4.  Update title usage: `{safeString(brief.title) || 'Untitled'}`.

### Step 2.2: `BriefReviewModal.tsx`
1.  Import `safeString`.
2.  Replace `<ReactMarkdown>{String(brief.outline || '')}</ReactMarkdown>` with `<ReactMarkdown>{safeString(brief.outline)}</ReactMarkdown>`.
3.  Replace inline checks in the `keyTakeaways` map with `safeString(item)`.

### Step 2.3: `ContentBriefModal.tsx`
1.  Import `safeString`.
2.  Replace `<ReactMarkdown>{String(brief.outline || '')}</ReactMarkdown>` with `<ReactMarkdown>{safeString(brief.outline)}</ReactMarkdown>`.
3.  Replace inline checks in `keyTakeaways` and `contextualBridge` with `safeString(item)` or `safeString(link.targetTopic)`.

## 3. Validation
-   **Visual:** Open all three modals with a sample brief. Ensure text renders correctly.
-   **Safety:** The `safeString` utility handles objects/nulls automatically, so the crash protection remains intact.
