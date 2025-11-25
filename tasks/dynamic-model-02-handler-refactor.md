
# Task: Refactor Handlers for Dynamic Injection

**Status:** [x] Completed
**Priority:** HIGH
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. Objective
Update the main action handlers to accept an optional `overrideSettings` argument. This allows UI components to pass the user's "Just-in-Time" model selection back to the logic layer.

## 2. Implementation Steps

### Update Signatures
Modify the following functions in `ProjectDashboardContainer`:

1.  `onGenerateBrief(topic, responseCode, overrideSettings?)`
2.  `onGenerateDraft(brief, overrideSettings?)`
3.  `onExpandCoreTopic(topic, mode, userContext, overrideSettings?)`
4.  `onAddTopic(topicData, placement, overrideSettings?)` (specifically for AI placement)

### Logic Update
Inside each function, merge the config before calling `aiService`:
```typescript
const config = overrideSettings 
    ? { ...effectiveBusinessInfo, aiProvider: overrideSettings.provider, aiModel: overrideSettings.model }
    : effectiveBusinessInfo;
```

### Pass to Child Components
Update the props passed to `ProjectDashboard` to match the new signatures.

## 3. Verification
*   Ensure TypeScript compiles without errors in the Container.
