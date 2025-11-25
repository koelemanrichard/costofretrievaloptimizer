# Application Audit & Stabilization Plan

**Date:** October 26, 2023
**Scope:** End-to-End Audit of "Create Content Brief" Workflow
**Status:** Critical Issues Identified

## 1. Executive Summary

The application currently faces **three critical failure points** that will prevent the "Create Content Brief" workflow from succeeding. While the "New Map" wizard saves data correctly, the consumption of that data in the Dashboard is fragile.

The primary crash vector is **improper state hydration**, specifically regarding the `KnowledgeGraph`. The secondary risk is **insufficient AI schema enforcement**, which puts excessive load on the client-side sanitizer.

---

## 2. Critical Blocking Issues (Immediate Fixes Required)

### Issue 1: The Knowledge Graph Null Pointer Crash
**Severity:** CRITICAL (Application Crash)
**Location:** `services/geminiService.ts` calling `prompts.GENERATE_CONTENT_BRIEF_PROMPT`

*   **The Bug:** The `GENERATE_CONTENT_BRIEF_PROMPT` function in `config/prompts.ts` attempts to execute `knowledgeGraph.query(...)`.
*   **The Trigger:** In `ProjectDashboardContainer.tsx`, the `onGenerateBrief` handler passes `state.knowledgeGraph` to the service.
*   **The Failure:** If the Knowledge Graph has not successfully hydrated (rebuilt from EAVs on map load), `state.knowledgeGraph` is `null`. Attempting to access `.query()` on `null` throws an immediate JavaScript error, crashing the React lifecycle or the Promise chain before the AI is even called.
*   **Root Cause:** The `useEffect` hook responsible for hydrating the KG in `ProjectDashboardContainer.tsx` relies on `activeMap.eavs`. If this data structure varies even slightly from expectations (e.g., Supabase returns a stringified JSON instead of an object, or `null`), hydration fails silently or explicitly, leaving `knowledgeGraph` null.

### Issue 2: Missing Native Schema Enforcement in Gemini API
**Severity:** HIGH (Data Integrity / Potential Crash)
**Location:** `services/geminiService.ts`

*   **The Bug:** The `generateContentBrief` function sets `responseMimeType: "application/json"` but **does not** pass a `responseSchema` to the Gemini API configuration.
*   **The Risk:** Without a strict schema passed to the model, Gemini is "hallucinating" the structure of the JSON. It often returns flat strings where objects are expected (e.g., for `serpAnalysis`).
*   **The Consequence:** This forces the client-side `AIResponseSanitizer` to do heavy lifting it shouldn't have to do. While the sanitizer has been improved, relying solely on regex/parsing to fix structural hallucinations is fragile. The API supports native schema constraints (`responseSchema`), which should be used to guarantee the structure at the generation source.

### Issue 3: Batch Processor Stale State Closure
**Severity:** MEDIUM (Logic Error)
**Location:** `components/ProjectDashboardContainer.tsx`

*   **The Bug:** The `onGenerateAllBriefs` function instantiates `BatchProcessor` passing a closure: `() => state`.
*   **The Risk:** React's `state` object inside `useEffect` or `useCallback` captures the value from the render cycle where it was created. During a long-running batch process, the `state` variable inside the closure will become stale.
*   **The Consequence:** The processor may fail to "see" updates (like a newly hydrated Knowledge Graph) or might use outdated API keys if the user changes settings mid-process.

---

## 3. Systematic & UI Issues

### Issue 4: React-Markdown Rendering Risks
**Severity:** MEDIUM
**Location:** `components/BriefReviewModal.tsx`

*   **The Bug:** The component renders `<ReactMarkdown>{brief.outline}</ReactMarkdown>`.
*   **The Risk:** Even with sanitization, if `brief.outline` ends up being `undefined`, `null`, or a non-string object due to a sanitizer edge case, `ReactMarkdown` will throw an error.
*   **Required Fix:** Strict type checking or fallback (e.g., `brief.outline || ''`) within the JSX to prevent rendering crashes.

### Issue 5: "View Internal Linking" Trigger
**Severity:** LOW (Missing Feature)
**Location:** `components/ProjectDashboard.tsx`

*   **The Issue:** The dashboard has a button for "View Internal Linking", but the logic often fails if the graph visualization library receives nodes with invalid coordinates or circular references, which can happen during the initial "force simulation" tick if data is sparse.

---

## 4. Remediation Plan

### Phase 1: Harden the Data Layer (The Crash Fix)
1.  **Guard `GENERATE_CONTENT_BRIEF_PROMPT`:** Modify `config/prompts.ts` to handle a `null` Knowledge Graph gracefully (e.g., return an empty string for context instead of crashing).
2.  **Robust KG Hydration:** Refactor the `hydrateKnowledgeGraph` effect in `ProjectDashboardContainer.tsx`. Add extensive defensive coding to handle `activeMap.eavs` being `undefined`, `null`, or stringified JSON. Ensure it *always* results in a valid (even if empty) `KnowledgeGraph` object in state.

### Phase 2: Enforce AI Structure
3.  **Implement `responseSchema`:** In `services/geminiService.ts`, define the `ContentBrief` schema using the `google.ai.generativelanguage.v1beta.Schema` format (using `Type.OBJECT`, `Type.STRING`, etc.) and pass it to the `ai.models.generateContent` call. This delegates structural validation to Google's infrastructure.

### Phase 3: Defensive UI Rendering
4.  **Safe Rendering:** In `BriefReviewModal.tsx` and `DraftingModal.tsx`, implement null-coalescing operators (`|| ''`) for all text fields passed to rendering components.

### Phase 4: State Management Refactor
5.  **RefRef `BatchProcessor`:** Modify `BatchProcessor` to accept a `getState` function that uses a `useRef` to always access the current state, rather than a closure-captured state variable.

