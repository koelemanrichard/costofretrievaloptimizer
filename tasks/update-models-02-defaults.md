
# Task: Update Default AI Configuration

**Status:** [x] Completed
**Priority:** LOW
**Target File:** `config/defaults.ts`

## 1. Objective
Ensure new projects start with a modern, high-performance default model configuration.

## 2. Changes Required

**File:** `config/defaults.ts`
- Update `defaultBusinessInfo.aiModel` to `'gemini-3-pro-preview'` (or `'gemini-2.5-flash'` if stability is preferred, but user asked for latest).
- Ensure `defaultBusinessInfo.aiProvider` is `'gemini'`.

## 3. Verification
- Create a new project.
- Open the "New Map" wizard.
- Check the "AI Configuration" section. It should default to the new model.
