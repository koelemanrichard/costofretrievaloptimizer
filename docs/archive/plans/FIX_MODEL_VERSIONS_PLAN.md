
# Plan: Fix AI Model Versions & Defaults

**Status:** Active
**Priority:** CRITICAL
**Objective:** Restore AI functionality by replacing invalid "future" model IDs (e.g., GPT-5, Claude 4.5) with valid, currently available production models, and address Gemini rate limits by adjusting defaults.

## 1. Root Cause Analysis
*   **Invalid Model IDs:** The application is currently configured with model IDs that do not exist yet (e.g., `gpt-5-preview`, `claude-4-sonnet-preview`). Calls to these endpoints fail immediately.
*   **Gemini Rate Limits:** The default model `gemini-3-pro-preview` has very strict rate limits (free tier), causing "Resource Exhausted" errors.
*   **Outdated Lists:** The `modelDiscoveryService.ts` contains these invalid strings.

## 2. Remediation Strategy

### A. Update Model Lists (`services/modelDiscoveryService.ts`)
We will update the static lists to reflect the *actual* latest state-of-the-art models available via API today:

*   **OpenAI:**
    *   `gpt-4o` (Flagship, replace GPT-5 placeholder)
    *   `gpt-4o-mini`
    *   `o1-preview` (Reasoning)
    *   `o1-mini`
*   **Anthropic:**
    *   `claude-3-5-sonnet-20241022` (Latest Sonnet)
    *   `claude-3-5-haiku-20241022`
    *   `claude-3-opus-20240229`
    *   *Remove:* `claude-4` references.
*   **Gemini:**
    *   `gemini-2.5-flash` (High rate limits, stable, fast - **New Recommended Default**)
    *   `gemini-3-pro-preview` (Keep as option, but warn about limits)
*   **Perplexity:**
    *   `sonar-pro`
    *   `sonar-reasoning-pro`

### B. Update Defaults (`config/defaults.ts`)
*   Change the default `aiModel` to `gemini-2.5-flash` to ensure new users/projects don't immediately hit rate limits.

### C. Update Service Fallbacks (`services/geminiService.ts`)
*   Ensure the hardcoded fallback in `geminiService.ts` is `gemini-2.5-flash`.

## 3. Execution Tasks

1.  **Task 01:** Update `services/modelDiscoveryService.ts` with valid IDs.
2.  **Task 02:** Update `config/defaults.ts` and `services/geminiService.ts` to use safe defaults.
