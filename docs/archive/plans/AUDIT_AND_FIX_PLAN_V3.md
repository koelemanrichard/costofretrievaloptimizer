# Systematic Fix for Runtime Type Errors & React Crash #31

**Status:** Planning
**Priority:** CRITICAL
**Target:** Stability against malformed database data and loose JSON types.

## 1. Diagnosis: The "Type Lie" Problem

The "Minified React error #31" (Objects are not valid as a React child) is the symptom. The disease is a systematic disconnect between the Database Schema (`Json` types) and the Application's TypeScript Interfaces.

### The Root Causes:

1.  **Unsafe Casting:** We frequently use `as unknown as TargetType` when fetching data from Supabase. This tells TypeScript "trust me, this JSON blob is exactly this interface." When it isn't (e.g., it's `null`, a different shape, or a raw string), the application crashes at runtime during rendering.
2.  **React Rendering:** Components like `BriefReviewModal` expect `brief.outline` to be a `string`. If the database (or AI) returns a JSON object or array, passing that object directly to `<ReactMarkdown>` or trying to render it triggers Error #31.
3.  **`keyTakeaways` Instability:** Defined as `string[]` in the app, but stored as `jsonb` in the DB. If saved as `[null]` or `[{ text: "..." }]` instead of `["..."]`, mapping over it in JSX will crash.

---

## 2. Remediation Strategy

We will not just "patch" the specific crash; we will implement a **Data Sanitization Layer** at the point of entry (fetching) and **Defensive Rendering** at the point of exit (UI).

### Phase 1: Data Sanitization (The "Air Gap")

We must stop trusting the database blindly. We will implement parsing utilities that convert `Json` inputs into guaranteed safe Application types.

**Target File:** `components/ProjectDashboardContainer.tsx` (fetching logic)

*   **Action:** Create a local helper `sanitizeBrief(dbBrief: any): ContentBrief`.
    *   **`keyTakeaways`:** Ensure it is strictly `string[]`. Filter out nulls. Convert objects to strings if necessary.
    *   **`outline`:** Ensure it is strictly a `string`. If it's an object/array, `JSON.stringify` it or extract the text.
    *   **`contextualVectors`:** Ensure it's a valid array of `SemanticTriple` objects, not `null`.

**Target File:** `services/batchProcessor.ts`

*   **Action:** Apply similar sanitization when processing batch results before dispatching to state.

### Phase 2: Defensive Rendering (The UI Shield)

We will update UI components to never assume data integrity.

**Target File:** `components/BriefReviewModal.tsx` & `components/ContentBriefModal.tsx`

*   **ReactMarkdown:** Never pass a raw variable.
    *   *Unsafe:* `<ReactMarkdown>{brief.outline}</ReactMarkdown>`
    *   *Safe:* `<ReactMarkdown>{String(brief.outline || '')}</ReactMarkdown>`
*   **List Rendering:**
    *   *Unsafe:* `{brief.keyTakeaways.map(k => <li>{k}</li>)}`
    *   *Safe:* `{Array.isArray(brief.keyTakeaways) && brief.keyTakeaways.map(k => <li>{typeof k === 'object' ? JSON.stringify(k) : String(k)}</li>)}`

**Target File:** `components/InternalLinkingModal.tsx`

*   **Action:** The casting of `Object.values(briefs) as ContentBrief[]` is dangerous if `briefs` contains partial data. We will add a filter to ensure objects have required IDs before processing graph nodes.

### Phase 3: Type Guarding

**Target File:** `types.ts`

*   **Action:** While not strictly a code change, we will treat the `Json` type from `database.types.ts` as "hostile" and require explicit conversion logic in services.

---

## 3. Execution Plan

1.  **Fix `ProjectDashboardContainer.tsx`**: Implement the `sanitizeBrief` logic inside the `useEffect` that fetches briefs. This stops the "poison" from entering the global state.
2.  **Fix `BriefReviewModal.tsx`**: Apply defensive rendering patterns to `outline` and `keyTakeaways`.
3.  **Fix `ContentBriefModal.tsx`**: Apply defensive rendering patterns.
4.  **Fix `InternalLinkingModal.tsx`**: Add type guards before graph generation.
5.  **Fix `DraftingModal.tsx`**: Ensure `draft` string safety.

## 4. Verification Test

1.  **Load Project:** Load a project with existing (potentially malformed) data.
2.  **Check Logs:** Verify no "Objects are not valid as a React child" errors appear.
3.  **View Brief:** Open a brief. Even if the outline data is messy, the modal should open and display *something* (text or stringified JSON) rather than crashing.
4.  **Generate Brief:** Create a new brief and verify the sanitization layer correctly formats the new AI response before saving.
