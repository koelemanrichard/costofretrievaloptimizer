
# Task: Update AI Model Lists

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `services/modelDiscoveryService.ts`

## 1. Objective
Update the hardcoded lists of AI models to include the latest releases (Gemini 3.0, Claude 3.7, OpenAI o1, etc.) and remove deprecated or obsolete models.

## 2. Changes Required

Update the constants in `services/modelDiscoveryService.ts` with the following values:

**GEMINI_MODELS:**
- `gemini-3-pro-preview` (Bleeding edge)
- `gemini-2.5-flash` (High speed/efficiency)

**OPENAI_MODELS:**
- `o1-preview`
- `o1-mini`
- `gpt-4.5-preview`
- `gpt-4o`

**ANTHROPIC_MODELS:**
- `claude-3-7-sonnet-20250219` (Latest Sonnet)
- `claude-3-5-sonnet-20241022` (Previous stable)
- `claude-3-opus-20240229`

**PERPLEXITY_MODELS:**
- `sonar-reasoning-pro`
- `sonar-pro`
- `sonar`

## 3. Verification
- Open the Settings Modal or Business Info Wizard.
- Select a provider.
- Verify the dropdown list matches the new values.
