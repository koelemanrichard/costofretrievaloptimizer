
# Task 03: Defensive UI Rendering (Drafting & Analysis)

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `components/DraftingModal.tsx`

## 1. The Issue
Similar to Task 02, the `DraftingModal` renders user-generated or AI-generated content that might be malformed.

## 2. Implementation Instructions

### Step 2.1: Harden `DraftingModal.tsx`
1.  **Draft Content:**
    *   Locate `<ReactMarkdown>{draft}</ReactMarkdown>`.
    *   Change to `<ReactMarkdown>{typeof draft === 'string' ? draft : ''}</ReactMarkdown>` or `String(draft || '')`.
2.  **Null Checks:**
    *   Ensure `brief` object access (e.g., `brief.title`) uses optional chaining `?.` or safe fallbacks if `brief` might be null (though the parent usually handles this, defensive coding is better).

## 3. Verification
- Open the Drafting modal.
- Ensure Markdown renders correctly.
- Ensure no console warnings about "Objects are not valid as a React child".
