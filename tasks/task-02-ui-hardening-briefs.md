
# Task 02: Defensive UI Rendering (Brief Modals)

**Status:** [x] Completed
**Priority:** HIGH
**Target Files:**
1. `components/BriefReviewModal.tsx`
2. `components/ContentBriefModal.tsx`

## 1. The Issue
Even with data sanitization, runtime anomalies can occur. The UI components currently assume perfect data integrity.
- **Crash Point:** `<ReactMarkdown>{brief.outline}</ReactMarkdown>`. If `outline` is `undefined` or an `object`, React crashes.
- **Crash Point:** `brief.keyTakeaways.map(...)`. If an item in the array is an object, rendering it inside `<li>{item}</li>` crashes React.

## 2. Implementation Instructions

### Step 2.1: Harden `BriefReviewModal.tsx`
1.  **ReactMarkdown:**
    *   Wrap the children of `<ReactMarkdown>` in `String(...)`.
    *   Example: `<ReactMarkdown>{String(brief.outline || '')}</ReactMarkdown>`
2.  **Key Takeaways Loop:**
    *   Inside the `.map((item, index) => ...)`:
    *   Explicitly handle the rendering of `item`.
    *   `{typeof item === 'string' ? item : JSON.stringify(item)}`
    *   This ensures that even if a rogue object slips through, it renders as text instead of crashing the DOM.

### Step 2.2: Harden `ContentBriefModal.tsx`
Apply the exact same logic as above.
1.  **Safe Outline:** Ensure `brief.outline` is cast to string.
2.  **Safe Takeaways:** Ensure loop items are cast to string.
3.  **Safe Bridge Links:**
    *   Check `brief.contextualBridge` rendering. Ensure `link.targetTopic` and `link.anchorText` are rendered safely (e.g., `String(link.targetTopic)`).

## 3. Verification
- Open `BriefReviewModal` and `ContentBriefModal`.
- They should render normally.
- (Mental Check): If `brief.outline` were `null`, `String(null)` results in `"null"` or `""` depending on logic, which renders safely as text, preventing the crash.
