
# Task 02: Create Data Parsers Utility

**Status:** [x] Completed
**Priority:** HIGH (Systematic Fix)
**Files to Create/Modify:**
- Create: `utils/parsers.ts`

## 1. Objective
Create a centralized library of pure functions to sanitize "dirty" data from the database or AI. This ensures that no objects/arrays masquerade as strings, preventing React rendering crashes.

## 2. Implementation Steps

### Step 2.1: Create `utils/parsers.ts`
Implement the following functions:

1.  **`safeString(value: any): string`**
    - The core defense.
    - If `value` is `string` -> return `value`.
    - If `value` is `number` -> return `String(value)`.
    - If `value` is `null` or `undefined` -> return `""` (empty string).
    - If `value` is `object` or `array` -> return `JSON.stringify(value)` (prevents crash, makes issue visible).

2.  **`safeArray<T>(value: any): T[]`**
    - If `Array.isArray(value)` -> return `value`.
    - Else -> return `[]`.

3.  **`parsePillars(json: any): SEOPillars`**
    - Accepts `any`. Returns `SEOPillars`.
    - Use `safeString` for `centralEntity`, `sourceContext`, `centralSearchIntent`.
    - Handle the case where `json` itself is null/undefined (return default empty pillars).

4.  **`parseTopicalMap(data: any): TopicalMap`**
    - Accepts a raw database row. Returns `TopicalMap`.
    - Copy ID, project_id, name, etc.
    - Use `parsePillars(data.pillars)` for the pillars field.
    - **Critical:** Use `safeString` for fields like `name` or `description` if they exist on the root.

## 3. Validation
- Create a simple test harness or rely on TypeScript compilation.
- Verify `safeString({ test: 1 })` returns `'{"test":1}'`.
- Verify `safeString(null)` returns `""`.
