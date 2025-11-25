
# Task 01: Implement Data Sanitization Layer

**Status:** [x] Completed
**Priority:** CRITICAL
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. The Issue
The application blindly trusts that data fetching from Supabase (`Json` types) perfectly matches the TypeScript interfaces (`ContentBrief`).
- **Symptom:** If `keyTakeaways` is stored as `[{ text: "..." }]` (object) instead of `["..."]` (string array), passing it to the state causes downstream UI components to crash when they try to render the object as a child (React Error #31).
- **Root Cause:** Lack of a sanitization/adapter layer between the loose Database types and strict Application types.

## 2. Implementation Instructions

### Step 2.1: Create a Sanitization Helper
Inside `components/ProjectDashboardContainer.tsx` (outside the component or inside `useMemo`), create a function `sanitizeBriefFromDb`.

It must accept a raw DB row (typed as `any` or the specific DB type) and return a clean `ContentBrief`.

**Requirements for Sanitization:**
1.  **`keyTakeaways`:**
    *   Check if it is an Array. If not, return `[]`.
    *   Map over the array. If an item is a `string`, keep it.
    *   If an item is an `object` or `number`, use `String(item)` or `JSON.stringify(item)` to force it into a string representation.
    *   Filter out `null` or `undefined`.
2.  **`outline`:**
    *   Ensure it is a string. If it comes back as an object/array (common Gemini hallucination), convert it to string or return an empty string `''`.
3.  **`contextualVectors`:**
    *   Ensure it is an array. If `null`, return `[]`.
4.  **`contextualBridge`:**
    *   Ensure it is an array. If `null`, return `[]`.

### Step 2.2: Apply in `useEffect`
Locate the `fetchMapDetails` effect in `ProjectDashboardContainer.tsx`.
- Find where `briefsData` is reduced into `briefsRecord`.
- Replace the inline casting/mapping with your new `sanitizeBriefFromDb` function.

```typescript
// Concept
const briefsRecord = (briefsData || []).reduce((acc, dbBrief) => {
    acc[dbBrief.topic_id] = sanitizeBriefFromDb(dbBrief); // Use the helper
    return acc;
}, {} as Record<string, ContentBrief>);
```

## 3. Verification
- The application must compile.
- Loading a project with "bad" data in the database (e.g., objects in a string array column) should no longer crash the app upon loading the dashboard.
