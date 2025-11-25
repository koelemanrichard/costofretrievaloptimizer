
# Task: Update Gemini Service Fallback

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `services/geminiService.ts`

## 1. Objective
Ensure the backend service uses a modern fallback model if the user's selection is invalid or missing.

## 2. Changes Required

**File:** `services/geminiService.ts`
- Locate `const GEMINI_FALLBACK_MODEL`.
- Update it to `'gemini-2.5-flash'` (Reliable, fast) or `'gemini-3-pro-preview'`.
- Review `generateContentBrief` to ensure the `responseSchema` config is compatible with `gemini-3-pro-preview` (it should be, as it's a standard feature).

## 3. Verification
- Code review of `services/geminiService.ts`.
