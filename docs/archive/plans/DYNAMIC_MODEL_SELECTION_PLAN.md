# Plan: Dynamic AI Model Selection (Per-Function Override)

**Status:** Proposed
**Priority:** CRITICAL (Workflow Unblocking)
**Objective:** Allow users to override the "Project Default" AI provider and model at the point of execution. This solves the issue of API rate limits or exhaustion by allowing a seamless switch to an alternative provider (e.g., OpenAI, Anthropic) for specific tasks without changing global settings.

## 1. The Problem
Currently, `effectiveBusinessInfo` is calculated once in `ProjectDashboardContainer` based on the project's saved settings. All handlers (`onGenerateBrief`, `onExpandCoreTopic`, etc.) use this static object. Changing providers requires navigating to settings, saving, and potentially reloading context.

## 2. The Solution: "Just-in-Time" Configuration

We will implement a **Model Selector UI** that can be embedded in any modal. When the user clicks "Generate", the component will construct a *temporary* `BusinessInfo` object with the selected provider/model and pass it to the handler.

### A. New Component: `AIModelSelector`
A reusable UI component that:
1.  Reads available API keys from the global `AppState`.
2.  Allows selecting a Provider (only if a key exists for it).
3.  Allows selecting a Model for that provider.
4.  Defaults to "Use Project Settings".

### B. Logic Updates (The Override Pattern)
We need to update the container handlers in `ProjectDashboardContainer.tsx` to accept an optional `overrideConfig` argument.

**Current:**
```typescript
const onGenerateBrief = async (topic, responseCode) => {
   // uses effectiveBusinessInfo closure
}
```

**New:**
```typescript
const onGenerateBrief = async (topic, responseCode, overrideConfig?) => {
   const configToUse = overrideConfig ? { ...effectiveBusinessInfo, ...overrideConfig } : effectiveBusinessInfo;
   // execute
}
```

## 3. Implementation Targets

We will inject this selector into the high-volume/high-value features first:

1.  **Topic Expansion:** `AddTopicModal.tsx` & `TopicExpansionModal.tsx`.
2.  **Brief Generation:** `ResponseCodeSelectionModal.tsx`.
3.  **Drafting:** `DraftingModal.tsx`.
4.  **Analysis:** `AnalysisToolsPanel.tsx` (Global override for tools).

## 4. Execution Tasks

1.  **Task 01:** Create `components/ui/AIModelSelector.tsx`.
2.  **Task 02:** Refactor `ProjectDashboardContainer.tsx` handlers to accept overrides.
3.  **Task 03:** Integrate Selector into Modals (`Drafting`, `Brief`, `Expansion`).

## 5. Benefits
*   **Resilience:** If Gemini 429s (Rate Limit), switch to GPT-4o instantly.
*   **Cost Control:** Use cheap models for bulk tasks, expensive models for drafting.
*   **Quality Comparison:** A/B test results from different models side-by-side.
