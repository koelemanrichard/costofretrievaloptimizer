
# Task 02: Enforce Native Gemini API Schema

**Status:** [x] Completed
**Priority:** HIGH
**Files Affected:**
- `services/geminiService.ts`

## 1. The Issue
The application currently relies on client-side regex/parsing (`AIResponseSanitizer`) to clean up AI responses. This is error-prone. The Gemini API supports `responseSchema` via the `google.ai.generativelanguage.v1beta.Schema` format (exposed via `@google/genai`), which forces the model to return strictly structured JSON. Not using this leads to "hallucinated structures" where the AI returns a string instead of an expected object/array, causing downstream crashes in React components.

## 2. Implementation Plan

### Step 2.1: Import Types
**File:** `services/geminiService.ts`
- Import `Type` (and `Schema` if available/needed) from `@google/genai`.

### Step 2.2: Define Content Brief Schema
**File:** `services/geminiService.ts`
- Create a constant `CONTENT_BRIEF_SCHEMA` matching the `ContentBrief` interface.
- **Crucial:** It must define nested objects (`serpAnalysis`, `visuals`) strictly.
  ```typescript
  const CONTENT_BRIEF_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      slug: { type: Type.STRING },
      // ... define all fields ...
      serpAnalysis: {
        type: Type.OBJECT,
        properties: {
          peopleAlsoAsk: { type: Type.ARRAY, items: { type: Type.STRING } },
          // ...
        }
      }
    },
    required: ["title", "outline", "serpAnalysis"] // etc
  };
  ```

### Step 2.3: Update Generation Call
**File:** `services/geminiService.ts`
- In `generateContentBrief`, update the `ai.models.generateContent` config object.
- Add `responseSchema: CONTENT_BRIEF_SCHEMA`.
- Ensure `responseMimeType: "application/json"` is still set.

## 3. Validation & Testing
1.  **Generate Brief:** Trigger a brief generation.
2.  **Inspect Log:** Look at the raw response in the browser console or `LoggingPanel`. It should be clean JSON without Markdown code fences (Gemini often omits fences when schema is strict, or includes them but the structure is perfect).
3.  **Stress Test:** Try a complex topic. Ensure nested fields like `competitorHeadings` are correctly formatted arrays, not strings.

## 4. Systematic Risks
- **Subtask:** This pattern should eventually be applied to all AI calls (e.g., `validateTopicalMap`, `auditContentIntegrity`) to improve system-wide stability. For this task, focus specifically on `generateContentBrief`.
