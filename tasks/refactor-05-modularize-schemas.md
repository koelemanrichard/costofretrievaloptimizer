
# Refactoring Task 05: Modularize AI Schemas

**Status:** [x] Completed
**Priority:** LOW
**Objective:** Clean up `services/geminiService.ts` by moving large static schema definitions to a configuration file. This makes the service logic easier to read.

## 1. Files to Create/Modify
- Create: `config/schemas.ts`
- Modify: `services/geminiService.ts`

## 2. Implementation Steps

### Step 2.1: Create `config/schemas.ts`
-   Import `Type` from `@google/genai`.
-   Move `CONTENT_BRIEF_SCHEMA` from `geminiService.ts` to here. Export it.
-   Move any related fallback objects or sanitizer schemas to here as well (if they are static constants).

### Step 2.2: Refactor `geminiService.ts`
-   Import `CONTENT_BRIEF_SCHEMA` from `../config/schemas`.
-   Remove the inline definition.

## 3. Verification
1.  **Compile:** Ensure no import/export errors.
2.  **Functionality:** Generate a Content Brief. It should still work exactly as before, respecting the schema structure.
