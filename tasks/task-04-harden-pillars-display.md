# Task 04: Harden PillarsDisplay UI

**Status:** [ ] Not Started
**Priority:** MEDIUM (Defense in Depth)
**Files to Create/Modify:**
- Modify: `components/ui/PillarsDisplay.tsx`

## 1. Objective
Even with sanitized state, UI components should be resilient. We will update `PillarsDisplay` to use `safeString` locally as a final guard against rendering errors.

## 2. Implementation Steps

### Step 2.1: Update Component Logic
- Import `safeString` from `../../utils/parsers`.
- Inside the render return (JSX):
    - Locate `{pillars.centralEntity}` -> change to `{safeString(pillars.centralEntity)}`
    - Locate `{pillars.sourceContext}` -> change to `{safeString(pillars.sourceContext)}`
    - Locate `{pillars.centralSearchIntent}` -> change to `{safeString(pillars.centralSearchIntent)}`
- Do the same for the `value` props in the Edit Mode `Input` and `Textarea` components to prevent "Object passed to value prop" warnings.

## 3. Validation
1.  **Visual Check:** The Pillars card on the dashboard should render text.
2.  **Crash Check:** If state somehow gets corrupted again, this component should simply render `[object Object]` or the JSON string instead of taking down the whole app.
