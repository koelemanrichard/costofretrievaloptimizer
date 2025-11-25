
# Authorship Task 02: Author Identity UI

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `components/BusinessInfoForm.tsx`
**Dependencies:** Task 01

## 1. Objective
Replace the simple "Author Name" inputs with a comprehensive "Author Entity" configuration section.

## 2. Implementation Steps

### UI Updates
1.  **Author Section:** Create a dedicated subsection in the form.
2.  **Entity Fields:** Inputs for Name, Bio, Credentials.
3.  **Stylometry Selector:** A `<Select>` dropdown for `StylometryType` (Academic, Technical, etc.).
4.  **Custom Rules:** A dynamic list or textarea for `customStylometryRules` (Negative Constraints).

### Logic Updates
1.  Update the form state management to handle the nested `authorProfile` object.
2.  Ensure `handleSave` correctly passes this structure to `App.tsx` and Supabase.

## 3. Verification
1.  Open "New Map" wizard (or Settings).
2.  Fill out the Author Profile.
3.  Save.
4.  Reload. Verify data persists.
