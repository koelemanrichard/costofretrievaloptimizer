
# Task: Fix React Markdown Rendering Crash (Critical)

**Status:** [x] Completed
**Priority:** CRITICAL
**Target Files:** 
- `components/BriefReviewModal.tsx`
- `components/ContentBriefModal.tsx`
- `components/DraftingModal.tsx`

## 1. The Issue
Despite rigorous data sanitization, the application continues to crash with "Minified React error #31" when rendering content briefs. The stack trace points to `react-markdown`. 

This indicates that the library itself might be incompatible with the specific build environment, or it is throwing internal errors when handling certain edge-case strings or empty content, even if valid strings are passed.

## 2. The Solution: Nuclear Option
To guarantee stability, we will **remove the `react-markdown` dependency usage entirely** from the rendering path.

We will replace `<ReactMarkdown>...</ReactMarkdown>` with a simple, robust HTML element that preserves whitespace formatting:
```tsx
<div className="whitespace-pre-wrap font-mono text-sm">
  {content}
</div>
```

This ensures that:
1.  Any string content will render safely.
2.  Line breaks and spacing from the AI output are preserved.
3.  The risk of complex parsing logic crashing the app is eliminated.

## 3. Implementation Steps
1.  **BriefReviewModal:** Replace usage in the "Article Outline" section.
2.  **ContentBriefModal:** Replace usage in the "Article Outline" section.
3.  **DraftingModal:** Replace usage for the entire Article Draft.

## 4. Validation
-   Generate a brief.
-   Open the review modal.
-   Confirm the text renders (it won't be pretty HTML, but it will be readable text).
-   Confirm the app **does not crash**.
