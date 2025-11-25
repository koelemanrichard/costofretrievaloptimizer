
# Task: Create AI Model Selector Component

**Status:** [x] Completed
**Priority:** HIGH
**Target File:** `components/ui/AIModelSelector.tsx`

## 1. Objective
Build a reusable component that allows users to select an AI Provider and Model. It must respect the globally available API keys (only show providers that have keys configured).

## 2. Requirements

### Props
```typescript
interface AIModelSelectorProps {
    currentConfig: BusinessInfo; // The project defaults
    onConfigChange: (provider: string, model: string) => void;
    className?: string;
}
```

### Logic
1.  **Key Check:** Check `state.businessInfo` (global) to see which keys (`openAiApiKey`, `anthropicApiKey`, etc.) are present (truthy).
2.  **Dropdown 1 (Provider):**
    *   Option 1: "Project Default ({currentConfig.aiProvider})"
    *   Option N: "OpenAI", "Anthropic", etc. (Only if key exists).
3.  **Dropdown 2 (Model):**
    *   Populate based on selected provider using `modelDiscoveryService` constants.
    *   If "Project Default" is selected, disable this or show the default model name.

### Output
*   When selection changes, call `onConfigChange` with the new values. If "Default" is selected, return `null` or the default values.

## 3. Verification
*   Import into `ProjectDashboard` temporarily to verify it renders and detects keys correctly.

**Update:** Implemented `AIModelSelector.tsx` and updated `modelDiscoveryService.ts` with latest models.
