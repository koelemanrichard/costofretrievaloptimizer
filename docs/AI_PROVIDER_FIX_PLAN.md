# AI Provider Settings Override - Fix Plan

## Problem Summary

When topical maps are created, their `business_info` field stores the AI provider settings that were active at that time. Later, when the user changes their global AI settings (e.g., switching from Gemini to Anthropic), the stale map-level `aiProvider` was being used instead of the current global settings.

This caused AI operations to use the wrong provider, even though the user's settings clearly showed a different provider.

## Root Cause

The pattern `{ ...globalBusinessInfo, ...mapBusinessInfo }` spreads the map's business_info AFTER the global settings, causing any `aiProvider`/`aiModel` values stored in the map to override the user's current global preferences.

## Already Fixed

The following files have been updated to strip AI settings from map's business_info:

| File | Status |
|------|--------|
| `components/ProjectDashboardContainer.tsx` | FIXED |
| `components/EavDiscoveryWizard.tsx` | FIXED |
| `components/CompetitorRefinementWizard.tsx` | FIXED |
| `components/PillarDefinitionWizard.tsx` | FIXED |
| `components/AddTopicModal.tsx` (2 places) | FIXED |
| `components/EavManagerModal.tsx` | FIXED |
| `components/ProjectWorkspace.tsx` (2 places) | FIXED |
| `components/TopicalMapDisplay.tsx` | FIXED |
| `services/batchProcessor.ts` | FIXED |

## Still Needs Fixing

### 1. MergeMapWizard.tsx (HIGH PRIORITY)

**File**: `components/merge/MergeMapWizard.tsx`
**Lines**: 262-301

**Problem**: When merging maps, the `resolvedBusinessInfo` includes AI settings from source maps, which get saved to the new merged map. This perpetuates the stale settings problem.

**Fix**: Strip AI settings before saving to the merged map:

```typescript
// At line 262-263, change:
const baseBusinessInfo = mergeState.sourceMaps[0]?.business_info as Partial<BusinessInfo> || {};
const resolvedBusinessInfo: Partial<BusinessInfo> = { ...baseBusinessInfo };

// To:
const baseBusinessInfo = mergeState.sourceMaps[0]?.business_info as Partial<BusinessInfo> || {};
// Strip AI settings - they should come from global user_settings, not be saved per-map
const {
    aiProvider: _ap,
    aiModel: _am,
    geminiApiKey: _gk,
    openAiApiKey: _ok,
    anthropicApiKey: _ak,
    perplexityApiKey: _pk,
    openRouterApiKey: _ork,
    ...baseBusinessContext
} = baseBusinessInfo;
const resolvedBusinessInfo: Partial<BusinessInfo> = { ...baseBusinessContext };
```

### 2. BusinessInfoForm.tsx (MEDIUM PRIORITY)

**File**: `components/BusinessInfoForm.tsx`
**Lines**: 387-420

**Problem**: The form initializes `localBusinessInfo` directly from `activeMap.business_info`, which includes stale AI settings. The `useEffect` attempts to fix this with `||` but only works for falsy values.

**Current Code**:
```typescript
const [localBusinessInfo, setLocalBusinessInfo] = useState<Partial<BusinessInfo>>(() => {
    const initialData = activeMap?.business_info
        ? activeMap.business_info as Partial<BusinessInfo>
        : { ...state.businessInfo, aiProvider: state.businessInfo.aiProvider, aiModel: state.businessInfo.aiModel };
    return initialData;
});
```

**Fix**: Always use global AI settings, even when loading from map:

```typescript
const [localBusinessInfo, setLocalBusinessInfo] = useState<Partial<BusinessInfo>>(() => {
    const mapData = activeMap?.business_info as Partial<BusinessInfo> || {};
    // Strip AI settings from map - always use current global settings
    const {
        aiProvider: _ap,
        aiModel: _am,
        geminiApiKey: _gk,
        openAiApiKey: _ok,
        anthropicApiKey: _ak,
        perplexityApiKey: _pk,
        openRouterApiKey: _ork,
        ...mapBusinessContext
    } = mapData;

    return {
        ...state.businessInfo,  // Global settings as base
        ...mapBusinessContext,  // Map's business context (domain, industry, etc.)
        // Ensure AI settings are from global
        aiProvider: state.businessInfo.aiProvider,
        aiModel: state.businessInfo.aiModel,
    };
});
```

Also remove or update the `useEffect` at lines 412-420 since the initialization will be correct.

### 3. Create Utility Function (LOW PRIORITY - REFACTORING)

**File**: Create `utils/businessInfoUtils.ts`

**Purpose**: Centralize the effectiveBusinessInfo construction to avoid code duplication and ensure consistency.

```typescript
import { BusinessInfo } from '../types';

/**
 * Constructs effective business info by merging global settings with map context.
 * AI settings (provider, model, API keys) ALWAYS come from global settings.
 * Business context (domain, industry, etc.) comes from map if available.
 */
export function getEffectiveBusinessInfo(
    globalBusinessInfo: BusinessInfo,
    mapBusinessInfo?: Partial<BusinessInfo>,
    projectDomain?: string,
    projectName?: string
): BusinessInfo {
    if (!mapBusinessInfo) {
        return {
            ...globalBusinessInfo,
            domain: projectDomain || globalBusinessInfo.domain,
            projectName: projectName || globalBusinessInfo.projectName,
        };
    }

    // Strip AI settings from map - they should come from global user_settings
    const {
        aiProvider: _mapAiProvider,
        aiModel: _mapAiModel,
        geminiApiKey: _gk,
        openAiApiKey: _ok,
        anthropicApiKey: _ak,
        perplexityApiKey: _pk,
        openRouterApiKey: _ork,
        ...mapBusinessContext
    } = mapBusinessInfo;

    return {
        ...globalBusinessInfo,
        domain: mapBusinessContext.domain || projectDomain || globalBusinessInfo.domain,
        projectName: mapBusinessContext.projectName || projectName || globalBusinessInfo.projectName,
        ...mapBusinessContext,
        // AI settings ALWAYS from global (user_settings), not from map's business_info
        aiProvider: globalBusinessInfo.aiProvider,
        aiModel: globalBusinessInfo.aiModel,
        geminiApiKey: globalBusinessInfo.geminiApiKey,
        openAiApiKey: globalBusinessInfo.openAiApiKey,
        anthropicApiKey: globalBusinessInfo.anthropicApiKey,
        perplexityApiKey: globalBusinessInfo.perplexityApiKey,
        openRouterApiKey: globalBusinessInfo.openRouterApiKey,
    };
}
```

Then refactor all components to use this utility instead of duplicating the stripping logic.

## Database Migration (OPTIONAL - Data Cleanup)

To clean up existing maps that have stale AI settings stored:

```sql
-- Remove AI settings from all topical_maps.business_info
-- This ensures existing maps don't have stale aiProvider values
UPDATE topical_maps
SET business_info = business_info - 'aiProvider' - 'aiModel'
    - 'geminiApiKey' - 'openAiApiKey' - 'anthropicApiKey'
    - 'perplexityApiKey' - 'openRouterApiKey'
WHERE business_info ? 'aiProvider';
```

**Note**: This is optional. The code fixes will prevent the issue going forward. The stale data in existing maps will be ignored due to the stripping logic.

## Testing Checklist

After implementing fixes:

1. [ ] Change global AI provider to Anthropic
2. [ ] Create a new map - verify Anthropic is used
3. [ ] Use an existing map (created when Gemini was default) - verify Anthropic is used
4. [ ] Generate bulk briefs - verify Anthropic is used in usage logs
5. [ ] Merge two maps - verify the merged map uses Anthropic
6. [ ] Edit business info on a map - verify AI settings show global values

## Implementation Order

1. Fix MergeMapWizard.tsx (prevents new merged maps from having stale settings)
2. Fix BusinessInfoForm.tsx (ensures form shows correct AI settings)
3. Create utility function (optional refactoring for maintainability)
4. Run database migration (optional cleanup of existing data)
