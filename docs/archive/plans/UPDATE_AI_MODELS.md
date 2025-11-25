# Plan: Update AI Model Configurations

**Objective:** Update the static lists of AI models in the application to support the latest bleeding-edge releases (Gemini 3.0, Claude 3.7, OpenAI o1/4.5).

## 1. Analysis
The application currently uses hardcoded arrays in `services/modelDiscoveryService.ts` to populate the "AI Model" dropdown in the `BusinessInfoForm`. These lists are outdated.

## 2. Target Model Updates

We will update the lists to include the following specific API identifiers:

### Google Gemini
*   **Add:** `gemini-3-pro-preview` (Target for complex tasks)
*   **Keep:** `gemini-2.5-flash` (Speed/Cost efficient)

### OpenAI
*   **Add:** `gpt-4.5-preview`
*   **Add:** `o1-preview`
*   **Add:** `o1-mini`
*   **Remove:** `gpt-3.5-turbo` (Deprecated/Obsolete context)

### Anthropic
*   **Add:** `claude-3-7-sonnet-20250219` (Latest "thinking" model)
*   **Keep:** `claude-3-5-sonnet-20241022` (Previous stable)
*   **Remove:** `claude-3-opus-20240229` (Slow/Expensive compared to 3.7)

### Perplexity
*   **Add:** `sonar-pro` (Latest Search model)
*   **Add:** `sonar` 
*   **Add:** `sonar-reasoning-pro` (DeepSeek R1 based)
*   **Remove:** Legacy `llama-3-sonar` strings if deprecated.

## 3. Files to Modify

1.  **`services/modelDiscoveryService.ts`**: Update the `const` arrays for each provider.
2.  **`config/defaults.ts`**: Update `defaultBusinessInfo.aiModel` to point to a newer default (e.g., `gemini-2.5-flash` or `gemini-3-pro-preview`).

## 4. Execution Steps

1.  Modify `services/modelDiscoveryService.ts` with the new model strings.
2.  Update `config/defaults.ts`.
3.  Verify in the UI (`SettingsModal` or `BusinessInfoForm`) that the new models appear in the dropdown.
