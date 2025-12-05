# Topical Map Merge Feature - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to merge two or more topical maps within a project into a new unified map, with AI-assisted topic matching and full human-in-the-loop control.

**Architecture:** Multi-step wizard modal (5 steps: Select Maps → Business Context → EAVs → Topic Matching → Review). AI service analyzes similarities between maps. Export/Import workflow allows offline collaboration via Excel. Source maps remain unchanged; merge creates a new map.

**Tech Stack:** React + TypeScript, existing AI service pattern (multi-provider), Supabase for persistence, xlsx library for export/import.

---

## Phase 1: Types and State Foundation

### Task 1: Add MapMerge Types

**Files:**
- Modify: `types.ts` (append to end of file)

**Step 1: Add the new types**

Add the following types at the end of `types.ts`:

```typescript
// =============================================================================
// TOPICAL MAP MERGE TYPES
// =============================================================================

export type MergeWizardStep = 'select' | 'context' | 'eavs' | 'topics' | 'review';

export interface ContextConflict {
  field: string;
  values: { mapId: string; mapName: string; value: any }[];
  aiSuggestion: { value: any; reasoning: string } | null;
  resolution: 'mapA' | 'mapB' | 'ai' | 'custom' | null;
  customValue?: any;
}

export interface EavDecision {
  eavId: string;
  sourceMapId: string;
  action: 'include' | 'exclude' | 'merge';
  conflictWith?: string;
  resolvedValue?: string;
}

export interface TopicSimilarityResult {
  id: string;
  topicA: EnrichedTopic;
  topicB: EnrichedTopic;
  similarityScore: number;
  matchType: 'exact' | 'semantic' | 'parent_child';
  aiSuggestedAction: 'merge' | 'parent_child' | 'keep_separate';
  aiSuggestedTitle?: string;
  aiSuggestedParent?: string;
  reasoning: string;
}

export interface TopicMergeDecision {
  id: string;
  topicAId: string | null;
  topicBId: string | null;
  userDecision: 'merge' | 'keep_both' | 'keep_a' | 'keep_b' | 'delete' | 'pending';
  finalTitle: string;
  finalDescription: string;
  finalType: 'core' | 'outer';
  finalParentId: string | null;
}

export interface MapMergeAnalysis {
  contextRecommendations: {
    field: string;
    recommendation: any;
    reasoning: string;
    confidence: number;
  }[];
  eavAnalysis: {
    unique: { mapId: string; eav: SemanticTriple }[];
    duplicates: { eavs: SemanticTriple[]; keep: SemanticTriple }[];
    conflicts: {
      subject: string;
      predicate: string;
      values: { mapId: string; value: any }[];
      recommendation: any;
      reasoning: string;
    }[];
  };
  topicSimilarities: TopicSimilarityResult[];
}

export interface ImportHistoryEntry {
  timestamp: string;
  filename: string;
  changes: {
    topicsAdded: number;
    topicsDeleted: number;
    topicsModified: number;
    decisionsChanged: number;
  };
}

export interface MapMergeState {
  step: MergeWizardStep;
  selectedMapIds: string[];
  sourceMaps: TopicalMap[];

  // Step 2: Context
  resolvedContext: {
    businessInfo: Partial<BusinessInfo>;
    pillars: SEOPillars | null;
  };
  contextConflicts: ContextConflict[];

  // Step 3: EAVs
  resolvedEavs: SemanticTriple[];
  eavDecisions: EavDecision[];

  // Step 4: Topics
  topicSimilarities: TopicSimilarityResult[];
  topicDecisions: TopicMergeDecision[];
  newTopics: EnrichedTopic[];
  excludedTopicIds: string[];

  // Step 5: Review
  finalTopics: EnrichedTopic[];
  newMapName: string;

  // Import/Export
  importHistory: ImportHistoryEntry[];

  // Analysis state
  isAnalyzing: boolean;
  analysisError: string | null;
}

// Export row for Excel/CSV
export interface MergeExportTopicRow {
  id: string;
  sourceMap: string;
  title: string;
  description: string;
  type: 'core' | 'outer';
  parentTitle: string | null;
  mergeDecision: 'keep' | 'merge' | 'delete' | 'new';
  mergePartnerTitle: string | null;
  finalTitle: string | null;
  include: 'yes' | 'no';
  notes: string;
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors related to new types

**Step 3: Commit**

```bash
git add types.ts
git commit -m "feat(merge): add MapMerge types for wizard state and AI analysis"
```

---

### Task 2: Create Initial MapMerge State Hook

**Files:**
- Create: `hooks/useMapMerge.ts`

**Step 1: Create the state hook**

Create `hooks/useMapMerge.ts`:

```typescript
import { useReducer, useCallback } from 'react';
import {
  MapMergeState,
  MergeWizardStep,
  TopicalMap,
  ContextConflict,
  SemanticTriple,
  EavDecision,
  TopicSimilarityResult,
  TopicMergeDecision,
  EnrichedTopic,
  SEOPillars,
  BusinessInfo,
  ImportHistoryEntry,
} from '../types';

const initialState: MapMergeState = {
  step: 'select',
  selectedMapIds: [],
  sourceMaps: [],
  resolvedContext: {
    businessInfo: {},
    pillars: null,
  },
  contextConflicts: [],
  resolvedEavs: [],
  eavDecisions: [],
  topicSimilarities: [],
  topicDecisions: [],
  newTopics: [],
  excludedTopicIds: [],
  finalTopics: [],
  newMapName: '',
  importHistory: [],
  isAnalyzing: false,
  analysisError: null,
};

type MapMergeAction =
  | { type: 'SET_STEP'; payload: MergeWizardStep }
  | { type: 'SET_SELECTED_MAPS'; payload: string[] }
  | { type: 'SET_SOURCE_MAPS'; payload: TopicalMap[] }
  | { type: 'SET_CONTEXT_CONFLICTS'; payload: ContextConflict[] }
  | { type: 'RESOLVE_CONTEXT_CONFLICT'; payload: { field: string; resolution: ContextConflict['resolution']; customValue?: any } }
  | { type: 'SET_RESOLVED_CONTEXT'; payload: { businessInfo: Partial<BusinessInfo>; pillars: SEOPillars | null } }
  | { type: 'SET_EAV_DECISIONS'; payload: EavDecision[] }
  | { type: 'UPDATE_EAV_DECISION'; payload: EavDecision }
  | { type: 'SET_RESOLVED_EAVS'; payload: SemanticTriple[] }
  | { type: 'SET_TOPIC_SIMILARITIES'; payload: TopicSimilarityResult[] }
  | { type: 'SET_TOPIC_DECISIONS'; payload: TopicMergeDecision[] }
  | { type: 'UPDATE_TOPIC_DECISION'; payload: TopicMergeDecision }
  | { type: 'ADD_NEW_TOPIC'; payload: EnrichedTopic }
  | { type: 'REMOVE_NEW_TOPIC'; payload: string }
  | { type: 'SET_EXCLUDED_TOPICS'; payload: string[] }
  | { type: 'TOGGLE_EXCLUDED_TOPIC'; payload: string }
  | { type: 'SET_FINAL_TOPICS'; payload: EnrichedTopic[] }
  | { type: 'SET_NEW_MAP_NAME'; payload: string }
  | { type: 'ADD_IMPORT_HISTORY'; payload: ImportHistoryEntry }
  | { type: 'SET_ANALYZING'; payload: boolean }
  | { type: 'SET_ANALYSIS_ERROR'; payload: string | null }
  | { type: 'RESET' };

function mapMergeReducer(state: MapMergeState, action: MapMergeAction): MapMergeState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_SELECTED_MAPS':
      return { ...state, selectedMapIds: action.payload };
    case 'SET_SOURCE_MAPS':
      return { ...state, sourceMaps: action.payload };
    case 'SET_CONTEXT_CONFLICTS':
      return { ...state, contextConflicts: action.payload };
    case 'RESOLVE_CONTEXT_CONFLICT':
      return {
        ...state,
        contextConflicts: state.contextConflicts.map(c =>
          c.field === action.payload.field
            ? { ...c, resolution: action.payload.resolution, customValue: action.payload.customValue }
            : c
        ),
      };
    case 'SET_RESOLVED_CONTEXT':
      return { ...state, resolvedContext: action.payload };
    case 'SET_EAV_DECISIONS':
      return { ...state, eavDecisions: action.payload };
    case 'UPDATE_EAV_DECISION':
      return {
        ...state,
        eavDecisions: state.eavDecisions.map(d =>
          d.eavId === action.payload.eavId ? action.payload : d
        ),
      };
    case 'SET_RESOLVED_EAVS':
      return { ...state, resolvedEavs: action.payload };
    case 'SET_TOPIC_SIMILARITIES':
      return { ...state, topicSimilarities: action.payload };
    case 'SET_TOPIC_DECISIONS':
      return { ...state, topicDecisions: action.payload };
    case 'UPDATE_TOPIC_DECISION':
      return {
        ...state,
        topicDecisions: state.topicDecisions.map(d =>
          d.id === action.payload.id ? action.payload : d
        ),
      };
    case 'ADD_NEW_TOPIC':
      return { ...state, newTopics: [...state.newTopics, action.payload] };
    case 'REMOVE_NEW_TOPIC':
      return { ...state, newTopics: state.newTopics.filter(t => t.id !== action.payload) };
    case 'SET_EXCLUDED_TOPICS':
      return { ...state, excludedTopicIds: action.payload };
    case 'TOGGLE_EXCLUDED_TOPIC':
      return {
        ...state,
        excludedTopicIds: state.excludedTopicIds.includes(action.payload)
          ? state.excludedTopicIds.filter(id => id !== action.payload)
          : [...state.excludedTopicIds, action.payload],
      };
    case 'SET_FINAL_TOPICS':
      return { ...state, finalTopics: action.payload };
    case 'SET_NEW_MAP_NAME':
      return { ...state, newMapName: action.payload };
    case 'ADD_IMPORT_HISTORY':
      return { ...state, importHistory: [...state.importHistory, action.payload] };
    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.payload };
    case 'SET_ANALYSIS_ERROR':
      return { ...state, analysisError: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useMapMerge() {
  const [state, dispatch] = useReducer(mapMergeReducer, initialState);

  const setStep = useCallback((step: MergeWizardStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const selectMaps = useCallback((mapIds: string[]) => {
    dispatch({ type: 'SET_SELECTED_MAPS', payload: mapIds });
  }, []);

  const setSourceMaps = useCallback((maps: TopicalMap[]) => {
    dispatch({ type: 'SET_SOURCE_MAPS', payload: maps });
  }, []);

  const resolveContextConflict = useCallback(
    (field: string, resolution: ContextConflict['resolution'], customValue?: any) => {
      dispatch({ type: 'RESOLVE_CONTEXT_CONFLICT', payload: { field, resolution, customValue } });
    },
    []
  );

  const updateTopicDecision = useCallback((decision: TopicMergeDecision) => {
    dispatch({ type: 'UPDATE_TOPIC_DECISION', payload: decision });
  }, []);

  const addNewTopic = useCallback((topic: EnrichedTopic) => {
    dispatch({ type: 'ADD_NEW_TOPIC', payload: topic });
  }, []);

  const toggleExcludedTopic = useCallback((topicId: string) => {
    dispatch({ type: 'TOGGLE_EXCLUDED_TOPIC', payload: topicId });
  }, []);

  const setNewMapName = useCallback((name: string) => {
    dispatch({ type: 'SET_NEW_MAP_NAME', payload: name });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    dispatch,
    setStep,
    selectMaps,
    setSourceMaps,
    resolveContextConflict,
    updateTopicDecision,
    addNewTopic,
    toggleExcludedTopic,
    setNewMapName,
    reset,
  };
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add hooks/useMapMerge.ts
git commit -m "feat(merge): add useMapMerge state management hook"
```

---

## Phase 2: AI Service Layer

### Task 3: Create MapMerge AI Service

**Files:**
- Create: `services/ai/mapMerge.ts`

**Step 1: Create the AI service facade**

Create `services/ai/mapMerge.ts`:

```typescript
import {
  BusinessInfo,
  TopicalMap,
  MapMergeAnalysis,
  TopicSimilarityResult,
  TopicMergeDecision,
  EnrichedTopic,
} from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { AppAction } from '../../state/appState';
import React from 'react';

/**
 * Analyze multiple maps for merge, returning recommendations for
 * context alignment, EAV consolidation, and topic matching.
 */
export const analyzeMapMerge = (
  mapsToMerge: TopicalMap[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<MapMergeAnalysis> => {
  switch (businessInfo.aiProvider) {
    case 'openai':
      return openAiService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch);
    case 'anthropic':
      return anthropicService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch);
    case 'perplexity':
      return perplexityService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch);
    case 'openrouter':
      return openRouterService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch);
    case 'gemini':
    default:
      return geminiService.analyzeMapMerge(mapsToMerge, businessInfo, dispatch);
  }
};

/**
 * Re-analyze specific topics after user makes changes.
 * Used when user modifies decisions and wants fresh AI suggestions.
 */
export const reanalyzeTopicSimilarity = (
  topicsA: EnrichedTopic[],
  topicsB: EnrichedTopic[],
  existingDecisions: TopicMergeDecision[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<TopicSimilarityResult[]> => {
  switch (businessInfo.aiProvider) {
    case 'openai':
      return openAiService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch);
    case 'anthropic':
      return anthropicService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch);
    case 'perplexity':
      return perplexityService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch);
    case 'openrouter':
      return openRouterService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch);
    case 'gemini':
    default:
      return geminiService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, businessInfo, dispatch);
  }
};
```

**Step 2: Commit (functions not implemented in providers yet)**

```bash
git add services/ai/mapMerge.ts
git commit -m "feat(merge): add mapMerge AI service facade"
```

---

### Task 4: Add analyzeMapMerge to Gemini Service

**Files:**
- Modify: `services/geminiService.ts`

**Step 1: Add the prompt and function**

Add the following to `services/geminiService.ts` before the final closing brace or at the end with other AI functions:

```typescript
// ============================================
// MAP MERGE ANALYSIS
// ============================================

export const analyzeMapMerge = async (
  mapsToMerge: TopicalMap[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<MapMergeAnalysis> => {
  const model = getModel(businessInfo);

  const mapSummaries = mapsToMerge.map(map => ({
    id: map.id,
    name: map.name,
    pillars: map.pillars,
    businessInfo: map.business_info,
    eavCount: map.eavs?.length || 0,
    topics: (map.topics || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      parentId: t.parent_topic_id,
    })),
  }));

  const prompt = `You are an SEO expert analyzing multiple topical maps for a potential merge.

## Maps to Analyze:
${JSON.stringify(mapSummaries, null, 2)}

## Your Task:
Analyze these maps and provide recommendations for merging them into a single unified map.

### 1. Context Recommendations
For each business context field that differs between maps, recommend which value to use and why.
Fields to check: industry, audience, expertise, valueProp, targetMarket, language

### 2. Pillar Recommendations
For SEO pillars (centralEntity, sourceContext, centralSearchIntent), recommend the best value if they differ.

### 3. Topic Similarity Analysis
Identify topics across maps that are:
- EXACT matches (same or very similar titles)
- SEMANTIC matches (different titles but same topic - similarity > 80%)
- PARENT_CHILD candidates (one topic could be a subtopic of another)

For each match, provide:
- Similarity score (0-100)
- Suggested action: "merge", "parent_child", or "keep_separate"
- If merge: suggested combined title
- Reasoning for your suggestion

Return a JSON object with this exact structure:
{
  "contextRecommendations": [
    { "field": "industry", "recommendation": "value", "reasoning": "why", "confidence": 85 }
  ],
  "eavAnalysis": {
    "unique": [{ "mapId": "map1", "eav": {...} }],
    "duplicates": [{ "eavs": [...], "keep": {...} }],
    "conflicts": [{ "subject": "x", "predicate": "y", "values": [...], "recommendation": "value", "reasoning": "why" }]
  },
  "topicSimilarities": [
    {
      "id": "sim_1",
      "topicA": { "id": "...", "title": "...", ... },
      "topicB": { "id": "...", "title": "...", ... },
      "similarityScore": 92,
      "matchType": "semantic",
      "aiSuggestedAction": "merge",
      "aiSuggestedTitle": "Combined Title",
      "reasoning": "Both topics cover..."
    }
  ]
}`;

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'gemini',
      message: `Analyzing ${mapsToMerge.length} maps for merge opportunities`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = AIResponseSanitizer.extractJSON(text);

    if (!parsed || !parsed.topicSimilarities) {
      throw new Error('Invalid response structure from AI');
    }

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'gemini',
        message: `Found ${parsed.topicSimilarities.length} topic similarities`,
        status: 'success',
        timestamp: Date.now(),
      },
    });

    return parsed as MapMergeAnalysis;
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'gemini',
        message: `Map merge analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failure',
        timestamp: Date.now(),
      },
    });
    throw error;
  }
};

export const reanalyzeTopicSimilarity = async (
  topicsA: EnrichedTopic[],
  topicsB: EnrichedTopic[],
  existingDecisions: TopicMergeDecision[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<TopicSimilarityResult[]> => {
  const model = getModel(businessInfo);

  const prompt = `Analyze topic similarities between two sets of topics.

## Topics from Map A:
${JSON.stringify(topicsA.map(t => ({ id: t.id, title: t.title, description: t.description, type: t.type })), null, 2)}

## Topics from Map B:
${JSON.stringify(topicsB.map(t => ({ id: t.id, title: t.title, description: t.description, type: t.type })), null, 2)}

## Existing Decisions (for context):
${JSON.stringify(existingDecisions, null, 2)}

Find topic pairs that are similar (>70% similarity). For each pair provide:
- similarityScore (0-100)
- matchType: "exact", "semantic", or "parent_child"
- aiSuggestedAction: "merge", "parent_child", or "keep_separate"
- aiSuggestedTitle (if merge)
- reasoning

Return JSON array of TopicSimilarityResult objects.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = AIResponseSanitizer.extractJSON(text);

    return Array.isArray(parsed) ? parsed : parsed.similarities || [];
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'gemini',
        message: `Topic reanalysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failure',
        timestamp: Date.now(),
      },
    });
    throw error;
  }
};
```

**Step 2: Add import for MapMergeAnalysis type**

At the top of `geminiService.ts`, add to the imports from `../types`:
```typescript
MapMergeAnalysis,
TopicSimilarityResult,
TopicMergeDecision,
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors (or only pre-existing errors unrelated to this change)

**Step 4: Commit**

```bash
git add services/geminiService.ts
git commit -m "feat(merge): implement analyzeMapMerge in Gemini service"
```

---

### Task 5: Add Stub Implementations to Other Providers

**Files:**
- Modify: `services/openAiService.ts`
- Modify: `services/anthropicService.ts`
- Modify: `services/perplexityService.ts`
- Modify: `services/openRouterService.ts`

**Step 1: Add stub to each provider**

Add to each service file (same code for all):

```typescript
// Stub - delegates to Gemini implementation for now
export const analyzeMapMerge = async (
  mapsToMerge: TopicalMap[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<MapMergeAnalysis> => {
  // TODO: Implement provider-specific version
  const geminiService = await import('./geminiService');
  return geminiService.analyzeMapMerge(mapsToMerge, { ...businessInfo, aiProvider: 'gemini' }, dispatch);
};

export const reanalyzeTopicSimilarity = async (
  topicsA: EnrichedTopic[],
  topicsB: EnrichedTopic[],
  existingDecisions: TopicMergeDecision[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<TopicSimilarityResult[]> => {
  // TODO: Implement provider-specific version
  const geminiService = await import('./geminiService');
  return geminiService.reanalyzeTopicSimilarity(topicsA, topicsB, existingDecisions, { ...businessInfo, aiProvider: 'gemini' }, dispatch);
};
```

**Step 2: Add necessary imports to each file**

Add to imports in each service file:
```typescript
import { MapMergeAnalysis, TopicSimilarityResult, TopicMergeDecision } from '../types';
```

**Step 3: Commit**

```bash
git add services/openAiService.ts services/anthropicService.ts services/perplexityService.ts services/openRouterService.ts
git commit -m "feat(merge): add stub implementations to all AI providers"
```

---

## Phase 3: UI Components

### Task 6: Create MergeMapWizard Container

**Files:**
- Create: `components/merge/MergeMapWizard.tsx`

**Step 1: Create the wizard container**

Create directory and file `components/merge/MergeMapWizard.tsx`:

```typescript
import React, { useCallback } from 'react';
import { useMapMerge } from '../../hooks/useMapMerge';
import { useAppState } from '../../state/appState';
import { TopicalMap } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import MergeMapSelectStep from './MergeMapSelectStep';
// Future imports for other steps:
// import MergeContextStep from './MergeContextStep';
// import MergeEavStep from './MergeEavStep';
// import MergeTopicsStep from './MergeTopicsStep';
// import MergeReviewStep from './MergeReviewStep';

interface MergeMapWizardProps {
  isOpen: boolean;
  onClose: () => void;
  availableMaps: TopicalMap[];
}

const MergeMapWizard: React.FC<MergeMapWizardProps> = ({
  isOpen,
  onClose,
  availableMaps,
}) => {
  const { state: appState, dispatch: appDispatch } = useAppState();
  const {
    state: mergeState,
    dispatch: mergeDispatch,
    setStep,
    selectMaps,
    setSourceMaps,
    reset,
  } = useMapMerge();

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleNext = useCallback(() => {
    const steps: Array<typeof mergeState.step> = ['select', 'context', 'eavs', 'topics', 'review'];
    const currentIndex = steps.indexOf(mergeState.step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  }, [mergeState.step, setStep]);

  const handleBack = useCallback(() => {
    const steps: Array<typeof mergeState.step> = ['select', 'context', 'eavs', 'topics', 'review'];
    const currentIndex = steps.indexOf(mergeState.step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  }, [mergeState.step, setStep]);

  const handleMapsSelected = useCallback((mapIds: string[]) => {
    selectMaps(mapIds);
    const maps = availableMaps.filter(m => mapIds.includes(m.id));
    setSourceMaps(maps);
  }, [selectMaps, setSourceMaps, availableMaps]);

  if (!isOpen) return null;

  const stepTitles: Record<typeof mergeState.step, string> = {
    select: 'Select Maps to Merge',
    context: 'Business Context & Pillars',
    eavs: 'EAV Consolidation',
    topics: 'Topic Matching',
    review: 'Review & Finalize',
  };

  const renderStep = () => {
    switch (mergeState.step) {
      case 'select':
        return (
          <MergeMapSelectStep
            availableMaps={availableMaps}
            selectedMapIds={mergeState.selectedMapIds}
            onMapsSelected={handleMapsSelected}
          />
        );
      case 'context':
        return <div className="text-gray-400 p-8 text-center">Context step coming soon...</div>;
      case 'eavs':
        return <div className="text-gray-400 p-8 text-center">EAV step coming soon...</div>;
      case 'topics':
        return <div className="text-gray-400 p-8 text-center">Topics step coming soon...</div>;
      case 'review':
        return <div className="text-gray-400 p-8 text-center">Review step coming soon...</div>;
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (mergeState.step) {
      case 'select':
        return mergeState.selectedMapIds.length >= 2;
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">
              {stepTitles[mergeState.step]}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {(['select', 'context', 'eavs', 'topics', 'review'] as const).map((step, index) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded ${
                  index <= ['select', 'context', 'eavs', 'topics', 'review'].indexOf(mergeState.step)
                    ? 'bg-blue-500'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-between">
          <Button
            variant="secondary"
            onClick={mergeState.step === 'select' ? handleClose : handleBack}
          >
            {mergeState.step === 'select' ? 'Cancel' : 'Back'}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {mergeState.step === 'review' ? 'Create Merged Map' : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MergeMapWizard;
```

**Step 2: Commit**

```bash
mkdir -p components/merge
git add components/merge/MergeMapWizard.tsx
git commit -m "feat(merge): add MergeMapWizard container component"
```

---

### Task 7: Create MergeMapSelectStep Component

**Files:**
- Create: `components/merge/MergeMapSelectStep.tsx`

**Step 1: Create the select step**

Create `components/merge/MergeMapSelectStep.tsx`:

```typescript
import React from 'react';
import { TopicalMap } from '../../types';
import { Card } from '../ui/Card';

interface MergeMapSelectStepProps {
  availableMaps: TopicalMap[];
  selectedMapIds: string[];
  onMapsSelected: (mapIds: string[]) => void;
}

const MergeMapSelectStep: React.FC<MergeMapSelectStepProps> = ({
  availableMaps,
  selectedMapIds,
  onMapsSelected,
}) => {
  const toggleMap = (mapId: string) => {
    if (selectedMapIds.includes(mapId)) {
      onMapsSelected(selectedMapIds.filter(id => id !== mapId));
    } else {
      onMapsSelected([...selectedMapIds, mapId]);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-400">
        Select two or more topical maps to merge. The maps will be analyzed for similar topics
        and you'll be able to choose how to combine them.
      </p>

      {availableMaps.length < 2 ? (
        <div className="text-yellow-400 p-4 bg-yellow-900/20 rounded">
          You need at least 2 topical maps in this project to use the merge feature.
        </div>
      ) : (
        <div className="space-y-2">
          {availableMaps.map(map => {
            const isSelected = selectedMapIds.includes(map.id);
            const topicCount = map.topics?.length || 0;

            return (
              <Card
                key={map.id}
                className={`p-4 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'hover:bg-gray-700/50'
                }`}
                onClick={() => toggleMap(map.id)}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMap(map.id)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-white">{map.name}</p>
                    <p className="text-sm text-gray-400">
                      {topicCount} topics • Created {new Date(map.created_at).toLocaleDateString()}
                    </p>
                    {map.pillars?.centralEntity && (
                      <p className="text-xs text-gray-500 mt-1">
                        CE: {map.pillars.centralEntity}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedMapIds.length > 0 && (
        <div className="mt-4 p-4 bg-gray-800 rounded">
          <p className="text-sm text-gray-400">
            Selected: <span className="text-white font-semibold">{selectedMapIds.length} maps</span>
          </p>
          {selectedMapIds.length < 2 && (
            <p className="text-sm text-yellow-400 mt-1">
              Select at least one more map to continue
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MergeMapSelectStep;
```

**Step 2: Commit**

```bash
git add components/merge/MergeMapSelectStep.tsx
git commit -m "feat(merge): add MergeMapSelectStep component"
```

---

### Task 8: Add Merge Button to MapSelectionScreen

**Files:**
- Modify: `components/MapSelectionScreen.tsx`

**Step 1: Add state and import**

At the top of `MapSelectionScreen.tsx`, add imports:
```typescript
import React, { useState } from 'react';
import MergeMapWizard from './merge/MergeMapWizard';
```

**Step 2: Add state for modal**

Inside the component, add:
```typescript
const [isMergeWizardOpen, setIsMergeWizardOpen] = useState(false);
```

**Step 3: Add the Merge Maps card to the Actions section**

After the "Analyze Existing Website" card, add:
```typescript
<Card className="p-8 flex flex-col items-center justify-center text-center">
    <h2 className="text-2xl font-bold text-white">Merge Topical Maps</h2>
    <p className="text-gray-400 mt-2 flex-grow">Combine two or more maps into one, with AI-assisted topic matching and full control over the merge.</p>
    <Button
        onClick={() => setIsMergeWizardOpen(true)}
        variant="secondary"
        className="mt-6 w-full"
        disabled={topicalMaps.length < 2}
    >
        Merge Maps
    </Button>
</Card>
```

**Step 4: Add the wizard modal at the end of the component**

Before the closing `</div>` of the main container, add:
```typescript
<MergeMapWizard
    isOpen={isMergeWizardOpen}
    onClose={() => setIsMergeWizardOpen(false)}
    availableMaps={topicalMaps}
/>
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add components/MapSelectionScreen.tsx
git commit -m "feat(merge): add Merge Maps button to MapSelectionScreen"
```

---

## Phase 4: Context & Topics Steps (Core Functionality)

### Task 9: Create MergeContextStep Component

**Files:**
- Create: `components/merge/MergeContextStep.tsx`

**Step 1: Create the context alignment step**

Create `components/merge/MergeContextStep.tsx`:

```typescript
import React, { useEffect } from 'react';
import { TopicalMap, ContextConflict, BusinessInfo, SEOPillars } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';

interface MergeContextStepProps {
  sourceMaps: TopicalMap[];
  contextConflicts: ContextConflict[];
  resolvedContext: {
    businessInfo: Partial<BusinessInfo>;
    pillars: SEOPillars | null;
  };
  isAnalyzing: boolean;
  onResolveConflict: (field: string, resolution: ContextConflict['resolution'], customValue?: any) => void;
  onAnalyze: () => void;
}

const BUSINESS_FIELDS = ['industry', 'audience', 'expertise', 'valueProp', 'targetMarket', 'language'] as const;
const PILLAR_FIELDS = ['centralEntity', 'sourceContext', 'centralSearchIntent'] as const;

const MergeContextStep: React.FC<MergeContextStepProps> = ({
  sourceMaps,
  contextConflicts,
  resolvedContext,
  isAnalyzing,
  onResolveConflict,
  onAnalyze,
}) => {
  // Auto-analyze on mount if no conflicts detected yet
  useEffect(() => {
    if (contextConflicts.length === 0 && !isAnalyzing) {
      onAnalyze();
    }
  }, []);

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader />
        <p className="text-gray-400 mt-4">Analyzing business context and pillars...</p>
      </div>
    );
  }

  const getValueFromMap = (mapIndex: number, field: string) => {
    const map = sourceMaps[mapIndex];
    if (PILLAR_FIELDS.includes(field as any)) {
      return map.pillars?.[field as keyof SEOPillars] || '';
    }
    return map.business_info?.[field as keyof BusinessInfo] || '';
  };

  const renderConflict = (conflict: ContextConflict) => {
    const isPillarField = PILLAR_FIELDS.includes(conflict.field as any);

    return (
      <Card key={conflict.field} className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold text-white capitalize">
              {conflict.field.replace(/([A-Z])/g, ' $1').trim()}
            </p>
            <span className={`text-xs px-2 py-1 rounded ${
              isPillarField ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'
            }`}>
              {isPillarField ? 'SEO Pillar' : 'Business Context'}
            </span>
          </div>
        </div>

        {/* Values from each map */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {conflict.values.map((v, idx) => (
            <div
              key={v.mapId}
              className={`p-3 rounded cursor-pointer transition-colors ${
                conflict.resolution === (idx === 0 ? 'mapA' : 'mapB')
                  ? 'bg-blue-900/50 border border-blue-500'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              onClick={() => onResolveConflict(conflict.field, idx === 0 ? 'mapA' : 'mapB')}
            >
              <p className="text-xs text-gray-500 mb-1">{v.mapName}</p>
              <p className="text-white">{String(v.value) || '(empty)'}</p>
            </div>
          ))}
        </div>

        {/* AI Suggestion */}
        {conflict.aiSuggestion && (
          <div
            className={`p-3 rounded cursor-pointer transition-colors ${
              conflict.resolution === 'ai'
                ? 'bg-green-900/50 border border-green-500'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
            onClick={() => onResolveConflict(conflict.field, 'ai')}
          >
            <p className="text-xs text-green-400 mb-1">AI Suggestion</p>
            <p className="text-white">{String(conflict.aiSuggestion.value)}</p>
            <p className="text-xs text-gray-400 mt-1">{conflict.aiSuggestion.reasoning}</p>
          </div>
        )}

        {/* Custom value */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Or enter custom value..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            value={conflict.resolution === 'custom' ? conflict.customValue || '' : ''}
            onChange={(e) => onResolveConflict(conflict.field, 'custom', e.target.value)}
          />
        </div>
      </Card>
    );
  };

  // Group conflicts by type
  const pillarConflicts = contextConflicts.filter(c => PILLAR_FIELDS.includes(c.field as any));
  const businessConflicts = contextConflicts.filter(c => !PILLAR_FIELDS.includes(c.field as any));
  const alignedFields = [...BUSINESS_FIELDS, ...PILLAR_FIELDS].filter(
    f => !contextConflicts.find(c => c.field === f)
  );

  return (
    <div className="space-y-6">
      {/* Aligned fields (collapsed) */}
      {alignedFields.length > 0 && (
        <div className="p-4 bg-gray-800/50 rounded">
          <p className="text-green-400 text-sm mb-2">✓ {alignedFields.length} fields are already aligned</p>
          <div className="flex flex-wrap gap-2">
            {alignedFields.map(field => (
              <span key={field} className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SEO Pillar conflicts */}
      {pillarConflicts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">SEO Pillars</h3>
          <div className="space-y-3">
            {pillarConflicts.map(renderConflict)}
          </div>
        </div>
      )}

      {/* Business context conflicts */}
      {businessConflicts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Business Context</h3>
          <div className="space-y-3">
            {businessConflicts.map(renderConflict)}
          </div>
        </div>
      )}

      {contextConflicts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-green-400 text-lg">All context fields are aligned!</p>
          <p className="text-gray-400 mt-2">No conflicts detected between selected maps.</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onAnalyze}>
          Re-analyze
        </Button>
      </div>
    </div>
  );
};

export default MergeContextStep;
```

**Step 2: Commit**

```bash
git add components/merge/MergeContextStep.tsx
git commit -m "feat(merge): add MergeContextStep component for pillar alignment"
```

---

### Task 10: Create TopicSimilarityCard Component

**Files:**
- Create: `components/merge/TopicSimilarityCard.tsx`

**Step 1: Create the card component**

Create `components/merge/TopicSimilarityCard.tsx`:

```typescript
import React, { useState } from 'react';
import { TopicSimilarityResult, TopicMergeDecision } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface TopicSimilarityCardProps {
  similarity: TopicSimilarityResult;
  decision: TopicMergeDecision;
  mapAName: string;
  mapBName: string;
  onDecisionChange: (decision: TopicMergeDecision) => void;
}

const TopicSimilarityCard: React.FC<TopicSimilarityCardProps> = ({
  similarity,
  decision,
  mapAName,
  mapBName,
  onDecisionChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedTitle, setEditedTitle] = useState(decision.finalTitle);

  const handleDecisionClick = (newDecision: TopicMergeDecision['userDecision']) => {
    let title = decision.finalTitle;
    if (newDecision === 'merge' && similarity.aiSuggestedTitle) {
      title = similarity.aiSuggestedTitle;
    } else if (newDecision === 'keep_a') {
      title = similarity.topicA.title;
    } else if (newDecision === 'keep_b') {
      title = similarity.topicB.title;
    }

    onDecisionChange({
      ...decision,
      userDecision: newDecision,
      finalTitle: title,
    });
  };

  const handleTitleChange = (newTitle: string) => {
    setEditedTitle(newTitle);
    onDecisionChange({
      ...decision,
      finalTitle: newTitle,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case 'exact': return 'Exact Match';
      case 'semantic': return 'Semantic Match';
      case 'parent_child': return 'Parent-Child';
      default: return type;
    }
  };

  return (
    <Card className={`p-4 ${decision.userDecision === 'delete' ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${getScoreColor(similarity.similarityScore)}`}>
            {similarity.similarityScore}%
          </span>
          <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
            {getMatchTypeLabel(similarity.matchType)}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white"
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Topic titles */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-800 rounded">
          <p className="text-xs text-blue-400 mb-1">{mapAName}</p>
          <p className="text-white font-medium">{similarity.topicA.title}</p>
          {isExpanded && (
            <p className="text-sm text-gray-400 mt-2">{similarity.topicA.description}</p>
          )}
        </div>
        <div className="p-3 bg-gray-800 rounded">
          <p className="text-xs text-purple-400 mb-1">{mapBName}</p>
          <p className="text-white font-medium">{similarity.topicB.title}</p>
          {isExpanded && (
            <p className="text-sm text-gray-400 mt-2">{similarity.topicB.description}</p>
          )}
        </div>
      </div>

      {/* AI Reasoning */}
      {isExpanded && similarity.reasoning && (
        <div className="p-3 bg-gray-800/50 rounded mb-4">
          <p className="text-xs text-green-400 mb-1">AI Analysis</p>
          <p className="text-sm text-gray-300">{similarity.reasoning}</p>
          {similarity.aiSuggestedTitle && (
            <p className="text-sm text-white mt-2">
              Suggested title: <span className="font-medium">{similarity.aiSuggestedTitle}</span>
            </p>
          )}
        </div>
      )}

      {/* Decision buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Button
          size="sm"
          variant={decision.userDecision === 'merge' ? 'primary' : 'secondary'}
          onClick={() => handleDecisionClick('merge')}
        >
          ✓ Merge
        </Button>
        <Button
          size="sm"
          variant={decision.userDecision === 'keep_both' ? 'primary' : 'secondary'}
          onClick={() => handleDecisionClick('keep_both')}
        >
          Keep Both
        </Button>
        <Button
          size="sm"
          variant={decision.userDecision === 'keep_a' ? 'primary' : 'secondary'}
          onClick={() => handleDecisionClick('keep_a')}
        >
          Keep A Only
        </Button>
        <Button
          size="sm"
          variant={decision.userDecision === 'keep_b' ? 'primary' : 'secondary'}
          onClick={() => handleDecisionClick('keep_b')}
        >
          Keep B Only
        </Button>
        <Button
          size="sm"
          variant={decision.userDecision === 'delete' ? 'primary' : 'secondary'}
          className="!bg-red-900/50 hover:!bg-red-800/50"
          onClick={() => handleDecisionClick('delete')}
        >
          Delete Both
        </Button>
      </div>

      {/* Editable title for merge */}
      {decision.userDecision === 'merge' && (
        <div>
          <label className="text-xs text-gray-400">Merged Title:</label>
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
          />
        </div>
      )}
    </Card>
  );
};

export default TopicSimilarityCard;
```

**Step 2: Commit**

```bash
git add components/merge/TopicSimilarityCard.tsx
git commit -m "feat(merge): add TopicSimilarityCard component"
```

---

### Task 11: Create MergeTopicsStep Component

**Files:**
- Create: `components/merge/MergeTopicsStep.tsx`

**Step 1: Create the topics step**

Create `components/merge/MergeTopicsStep.tsx`:

```typescript
import React, { useMemo } from 'react';
import {
  TopicalMap,
  TopicSimilarityResult,
  TopicMergeDecision,
  EnrichedTopic,
} from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import TopicSimilarityCard from './TopicSimilarityCard';

interface MergeTopicsStepProps {
  sourceMaps: TopicalMap[];
  topicSimilarities: TopicSimilarityResult[];
  topicDecisions: TopicMergeDecision[];
  newTopics: EnrichedTopic[];
  excludedTopicIds: string[];
  isAnalyzing: boolean;
  onDecisionChange: (decision: TopicMergeDecision) => void;
  onAddNewTopic: (topic: EnrichedTopic) => void;
  onToggleExcluded: (topicId: string) => void;
  onAnalyze: () => void;
  onExport: () => void;
  onImport: () => void;
}

const MergeTopicsStep: React.FC<MergeTopicsStepProps> = ({
  sourceMaps,
  topicSimilarities,
  topicDecisions,
  newTopics,
  excludedTopicIds,
  isAnalyzing,
  onDecisionChange,
  onAddNewTopic,
  onToggleExcluded,
  onAnalyze,
  onExport,
  onImport,
}) => {
  // Get all topics from all maps
  const allTopics = useMemo(() => {
    const topicMap = new Map<string, { topic: EnrichedTopic; mapName: string }>();
    sourceMaps.forEach(map => {
      (map.topics || []).forEach(topic => {
        topicMap.set(topic.id, { topic, mapName: map.name });
      });
    });
    return topicMap;
  }, [sourceMaps]);

  // Find unique topics (not in any similarity pair)
  const uniqueTopics = useMemo(() => {
    const inSimilarity = new Set<string>();
    topicSimilarities.forEach(sim => {
      inSimilarity.add(sim.topicA.id);
      inSimilarity.add(sim.topicB.id);
    });

    const unique: { topic: EnrichedTopic; mapName: string }[] = [];
    allTopics.forEach((value, id) => {
      if (!inSimilarity.has(id)) {
        unique.push(value);
      }
    });
    return unique;
  }, [allTopics, topicSimilarities]);

  // Group unique topics by source map
  const uniqueByMap = useMemo(() => {
    const byMap = new Map<string, { topic: EnrichedTopic; mapName: string }[]>();
    uniqueTopics.forEach(item => {
      const existing = byMap.get(item.mapName) || [];
      byMap.set(item.mapName, [...existing, item]);
    });
    return byMap;
  }, [uniqueTopics]);

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader />
        <p className="text-gray-400 mt-4">Analyzing topic similarities...</p>
      </div>
    );
  }

  const getDecisionForSimilarity = (simId: string): TopicMergeDecision => {
    return topicDecisions.find(d => d.id === simId) || {
      id: simId,
      topicAId: null,
      topicBId: null,
      userDecision: 'pending',
      finalTitle: '',
      finalDescription: '',
      finalType: 'core',
      finalParentId: null,
    };
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          {topicSimilarities.length} similarities found • {uniqueTopics.length} unique topics
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onExport}>
            Export
          </Button>
          <Button variant="secondary" size="sm" onClick={onImport}>
            Import
          </Button>
          <Button variant="secondary" size="sm" onClick={onAnalyze}>
            Re-analyze
          </Button>
        </div>
      </div>

      {/* Similar topics section */}
      {topicSimilarities.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Similar Topics ({topicSimilarities.length})
          </h3>
          <div className="space-y-3">
            {topicSimilarities.map(sim => (
              <TopicSimilarityCard
                key={sim.id}
                similarity={sim}
                decision={getDecisionForSimilarity(sim.id)}
                mapAName={sourceMaps[0]?.name || 'Map A'}
                mapBName={sourceMaps[1]?.name || 'Map B'}
                onDecisionChange={onDecisionChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unique topics section */}
      {uniqueTopics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Unique Topics ({uniqueTopics.length})
          </h3>
          {Array.from(uniqueByMap.entries()).map(([mapName, topics]) => (
            <Card key={mapName} className="p-4 mb-3">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-white">{mapName}</h4>
                <span className="text-sm text-gray-400">{topics.length} topics</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {topics.map(({ topic }) => {
                  const isExcluded = excludedTopicIds.includes(topic.id);
                  return (
                    <div
                      key={topic.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer ${
                        isExcluded ? 'opacity-50 bg-red-900/20' : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                      onClick={() => onToggleExcluded(topic.id)}
                    >
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => onToggleExcluded(topic.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="text-white text-sm">{topic.title}</p>
                        <p className="text-xs text-gray-500">{topic.type}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New topics section */}
      {newTopics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            New Topics ({newTopics.length})
          </h3>
          <Card className="p-4">
            <div className="space-y-2">
              {newTopics.map(topic => (
                <div
                  key={topic.id}
                  className="flex items-center gap-3 p-2 bg-green-900/20 rounded"
                >
                  <span className="text-xs px-2 py-1 bg-green-700 rounded text-white">NEW</span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{topic.title}</p>
                    <p className="text-xs text-gray-500">{topic.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Add new topic button */}
      <Button
        variant="secondary"
        onClick={() => {
          // TODO: Open add topic modal
          const newTopic: EnrichedTopic = {
            id: `new-${Date.now()}`,
            map_id: '',
            parent_topic_id: null,
            title: 'New Topic',
            slug: 'new-topic',
            description: 'New topic description',
            type: 'core',
            freshness: 'STANDARD' as any,
          };
          onAddNewTopic(newTopic);
        }}
      >
        + Add New Topic
      </Button>
    </div>
  );
};

export default MergeTopicsStep;
```

**Step 2: Commit**

```bash
git add components/merge/MergeTopicsStep.tsx
git commit -m "feat(merge): add MergeTopicsStep component"
```

---

### Task 12: Wire Up All Steps in Wizard

**Files:**
- Modify: `components/merge/MergeMapWizard.tsx`

**Step 1: Add imports for new step components**

Add at the top of the file:
```typescript
import MergeContextStep from './MergeContextStep';
import MergeTopicsStep from './MergeTopicsStep';
import { analyzeMapMerge } from '../../services/ai/mapMerge';
```

**Step 2: Add analysis handler**

Inside the component, add:
```typescript
const handleAnalyze = useCallback(async () => {
  if (mergeState.sourceMaps.length < 2) return;

  mergeDispatch({ type: 'SET_ANALYZING', payload: true });
  mergeDispatch({ type: 'SET_ANALYSIS_ERROR', payload: null });

  try {
    const analysis = await analyzeMapMerge(
      mergeState.sourceMaps,
      appState.businessInfo,
      appDispatch
    );

    // Process context recommendations into conflicts
    const conflicts = analysis.contextRecommendations.map(rec => ({
      field: rec.field,
      values: mergeState.sourceMaps.map(m => ({
        mapId: m.id,
        mapName: m.name,
        value: m.business_info?.[rec.field as keyof BusinessInfo] || m.pillars?.[rec.field as keyof SEOPillars],
      })),
      aiSuggestion: { value: rec.recommendation, reasoning: rec.reasoning },
      resolution: null,
    }));

    mergeDispatch({ type: 'SET_CONTEXT_CONFLICTS', payload: conflicts });
    mergeDispatch({ type: 'SET_TOPIC_SIMILARITIES', payload: analysis.topicSimilarities });

    // Initialize decisions for each similarity
    const decisions = analysis.topicSimilarities.map(sim => ({
      id: sim.id,
      topicAId: sim.topicA.id,
      topicBId: sim.topicB.id,
      userDecision: 'pending' as const,
      finalTitle: sim.aiSuggestedTitle || sim.topicA.title,
      finalDescription: sim.topicA.description,
      finalType: sim.topicA.type,
      finalParentId: null,
    }));

    mergeDispatch({ type: 'SET_TOPIC_DECISIONS', payload: decisions });
  } catch (error) {
    mergeDispatch({
      type: 'SET_ANALYSIS_ERROR',
      payload: error instanceof Error ? error.message : 'Analysis failed'
    });
  } finally {
    mergeDispatch({ type: 'SET_ANALYZING', payload: false });
  }
}, [mergeState.sourceMaps, appState.businessInfo, appDispatch, mergeDispatch]);
```

**Step 3: Update renderStep to use new components**

Update the `renderStep` function:
```typescript
const renderStep = () => {
  switch (mergeState.step) {
    case 'select':
      return (
        <MergeMapSelectStep
          availableMaps={availableMaps}
          selectedMapIds={mergeState.selectedMapIds}
          onMapsSelected={handleMapsSelected}
        />
      );
    case 'context':
      return (
        <MergeContextStep
          sourceMaps={mergeState.sourceMaps}
          contextConflicts={mergeState.contextConflicts}
          resolvedContext={mergeState.resolvedContext}
          isAnalyzing={mergeState.isAnalyzing}
          onResolveConflict={resolveContextConflict}
          onAnalyze={handleAnalyze}
        />
      );
    case 'eavs':
      return <div className="text-gray-400 p-8 text-center">EAV step coming soon...</div>;
    case 'topics':
      return (
        <MergeTopicsStep
          sourceMaps={mergeState.sourceMaps}
          topicSimilarities={mergeState.topicSimilarities}
          topicDecisions={mergeState.topicDecisions}
          newTopics={mergeState.newTopics}
          excludedTopicIds={mergeState.excludedTopicIds}
          isAnalyzing={mergeState.isAnalyzing}
          onDecisionChange={updateTopicDecision}
          onAddNewTopic={addNewTopic}
          onToggleExcluded={toggleExcludedTopic}
          onAnalyze={handleAnalyze}
          onExport={() => { /* TODO */ }}
          onImport={() => { /* TODO */ }}
        />
      );
    case 'review':
      return <div className="text-gray-400 p-8 text-center">Review step coming soon...</div>;
    default:
      return null;
  }
};
```

**Step 4: Add necessary imports at top**

```typescript
import { BusinessInfo, SEOPillars } from '../../types';
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add components/merge/MergeMapWizard.tsx
git commit -m "feat(merge): wire up context and topics steps in wizard"
```

---

## Phase 5: Export/Import (Future Tasks)

### Task 13-15: Export/Import Implementation

**Note:** These tasks implement the Excel export/import functionality. They require the `xlsx` library.

**Files to create:**
- `services/mergeExport.ts` - Export merge state to Excel
- `services/mergeImport.ts` - Import Excel and update state
- `components/merge/MergeExportButton.tsx` - Export UI
- `components/merge/MergeImportButton.tsx` - Import UI with diff preview

**Dependencies to add:**
```bash
npm install xlsx
```

*Detailed implementation deferred to keep this plan focused on core functionality.*

---

## Phase 6: Review Step & Final Merge

### Task 16: Create MergeReviewStep Component

**Files:**
- Create: `components/merge/MergeReviewStep.tsx`

**Step 1: Create the review step**

Create `components/merge/MergeReviewStep.tsx`:

```typescript
import React, { useMemo } from 'react';
import {
  TopicalMap,
  TopicMergeDecision,
  EnrichedTopic,
  BusinessInfo,
  SEOPillars,
  ContextConflict,
} from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface MergeReviewStepProps {
  sourceMaps: TopicalMap[];
  resolvedContext: {
    businessInfo: Partial<BusinessInfo>;
    pillars: SEOPillars | null;
  };
  contextConflicts: ContextConflict[];
  topicDecisions: TopicMergeDecision[];
  newTopics: EnrichedTopic[];
  excludedTopicIds: string[];
  newMapName: string;
  onMapNameChange: (name: string) => void;
}

const MergeReviewStep: React.FC<MergeReviewStepProps> = ({
  sourceMaps,
  resolvedContext,
  contextConflicts,
  topicDecisions,
  newTopics,
  excludedTopicIds,
  newMapName,
  onMapNameChange,
}) => {
  // Calculate stats
  const stats = useMemo(() => {
    const merged = topicDecisions.filter(d => d.userDecision === 'merge').length;
    const keepBoth = topicDecisions.filter(d => d.userDecision === 'keep_both').length * 2;
    const keepA = topicDecisions.filter(d => d.userDecision === 'keep_a').length;
    const keepB = topicDecisions.filter(d => d.userDecision === 'keep_b').length;
    const deleted = topicDecisions.filter(d => d.userDecision === 'delete').length * 2;
    const excluded = excludedTopicIds.length;
    const added = newTopics.length;

    // Count unique topics not in decisions
    const allTopics = sourceMaps.flatMap(m => m.topics || []);
    const inDecisions = new Set(topicDecisions.flatMap(d => [d.topicAId, d.topicBId].filter(Boolean)));
    const uniqueIncluded = allTopics.filter(t => !inDecisions.has(t.id) && !excludedTopicIds.includes(t.id)).length;

    const total = merged + keepBoth + keepA + keepB + uniqueIncluded + added;

    return { merged, keepBoth, keepA, keepB, deleted, excluded, added, uniqueIncluded, total };
  }, [topicDecisions, excludedTopicIds, newTopics, sourceMaps]);

  // Get resolved value for a field
  const getResolvedValue = (field: string) => {
    const conflict = contextConflicts.find(c => c.field === field);
    if (!conflict) return null;

    switch (conflict.resolution) {
      case 'mapA':
        return conflict.values[0]?.value;
      case 'mapB':
        return conflict.values[1]?.value;
      case 'ai':
        return conflict.aiSuggestion?.value;
      case 'custom':
        return conflict.customValue;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Map name input */}
      <Card className="p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          New Map Name *
        </label>
        <input
          type="text"
          value={newMapName}
          onChange={(e) => onMapNameChange(e.target.value)}
          placeholder="Enter a name for the merged map"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </Card>

      {/* Summary statistics */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Merge Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-800 rounded">
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-gray-400">Total Topics</p>
          </div>
          <div className="text-center p-3 bg-green-900/30 rounded">
            <p className="text-3xl font-bold text-green-400">{stats.merged}</p>
            <p className="text-sm text-gray-400">Merged</p>
          </div>
          <div className="text-center p-3 bg-blue-900/30 rounded">
            <p className="text-3xl font-bold text-blue-400">{stats.added}</p>
            <p className="text-sm text-gray-400">New</p>
          </div>
          <div className="text-center p-3 bg-red-900/30 rounded">
            <p className="text-3xl font-bold text-red-400">{stats.deleted + stats.excluded}</p>
            <p className="text-sm text-gray-400">Excluded</p>
          </div>
        </div>
      </Card>

      {/* Context summary */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Resolved Context</h3>
        <div className="space-y-2">
          {resolvedContext.pillars?.centralEntity && (
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Central Entity</span>
              <span className="text-white">{resolvedContext.pillars.centralEntity}</span>
            </div>
          )}
          {resolvedContext.pillars?.sourceContext && (
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Source Context</span>
              <span className="text-white">{resolvedContext.pillars.sourceContext}</span>
            </div>
          )}
          {resolvedContext.pillars?.centralSearchIntent && (
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Central Search Intent</span>
              <span className="text-white">{resolvedContext.pillars.centralSearchIntent}</span>
            </div>
          )}
          {contextConflicts.filter(c => c.resolution).map(conflict => (
            <div key={conflict.field} className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400 capitalize">{conflict.field.replace(/([A-Z])/g, ' $1')}</span>
              <span className="text-white">{getResolvedValue(conflict.field) || '-'}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Source maps reference */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Source Maps</h3>
        <div className="flex gap-4">
          {sourceMaps.map(map => (
            <div key={map.id} className="flex-1 p-3 bg-gray-800 rounded">
              <p className="font-medium text-white">{map.name}</p>
              <p className="text-sm text-gray-400">{map.topics?.length || 0} topics</p>
              <p className="text-xs text-gray-500 mt-1">Will remain unchanged</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Warning if map name empty */}
      {!newMapName.trim() && (
        <div className="p-4 bg-yellow-900/30 border border-yellow-600 rounded">
          <p className="text-yellow-400">Please enter a name for the merged map before proceeding.</p>
        </div>
      )}
    </div>
  );
};

export default MergeReviewStep;
```

**Step 2: Commit**

```bash
git add components/merge/MergeReviewStep.tsx
git commit -m "feat(merge): add MergeReviewStep component"
```

---

### Task 17: Add Merge Execution Logic

**Files:**
- Create: `services/mapMergeService.ts`

**Step 1: Create the merge execution service**

Create `services/mapMergeService.ts`:

```typescript
import { getSupabaseClient } from './supabaseClient';
import {
  TopicalMap,
  EnrichedTopic,
  SemanticTriple,
  BusinessInfo,
  SEOPillars,
  ContentBrief,
  TopicMergeDecision,
  ContextConflict,
} from '../types';

interface MergeExecutionParams {
  projectId: string;
  newMapName: string;
  sourceMaps: TopicalMap[];
  resolvedPillars: SEOPillars;
  resolvedBusinessInfo: Partial<BusinessInfo>;
  resolvedEavs: SemanticTriple[];
  topicDecisions: TopicMergeDecision[];
  newTopics: EnrichedTopic[];
  excludedTopicIds: string[];
  supabaseUrl: string;
  supabaseAnonKey: string;
}

interface MergeResult {
  success: boolean;
  newMapId: string | null;
  topicsCreated: number;
  error?: string;
}

export async function executeMerge(params: MergeExecutionParams): Promise<MergeResult> {
  const {
    projectId,
    newMapName,
    sourceMaps,
    resolvedPillars,
    resolvedBusinessInfo,
    resolvedEavs,
    topicDecisions,
    newTopics,
    excludedTopicIds,
    supabaseUrl,
    supabaseAnonKey,
  } = params;

  const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

  try {
    // 1. Create the new topical map
    const { data: newMap, error: mapError } = await supabase
      .from('topical_maps')
      .insert({
        project_id: projectId,
        name: newMapName,
        business_info: resolvedBusinessInfo,
        pillars: resolvedPillars,
        eavs: resolvedEavs,
        map_type: 'merged',
        status: 'active',
      })
      .select()
      .single();

    if (mapError || !newMap) {
      throw new Error(`Failed to create map: ${mapError?.message}`);
    }

    // 2. Collect all topics to create
    const topicsToCreate: Omit<EnrichedTopic, 'id'>[] = [];
    const oldToNewIdMap = new Map<string, string>(); // Map old IDs to new IDs

    // Process merge decisions
    for (const decision of topicDecisions) {
      if (decision.userDecision === 'delete') continue;

      const topicA = sourceMaps.flatMap(m => m.topics || []).find(t => t.id === decision.topicAId);
      const topicB = sourceMaps.flatMap(m => m.topics || []).find(t => t.id === decision.topicBId);

      switch (decision.userDecision) {
        case 'merge':
          // Create single merged topic
          topicsToCreate.push({
            map_id: newMap.id,
            parent_topic_id: null, // Will be resolved later
            title: decision.finalTitle,
            slug: decision.finalTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            description: decision.finalDescription || topicA?.description || '',
            type: decision.finalType,
            freshness: topicA?.freshness || 'STANDARD',
          });
          break;

        case 'keep_both':
          if (topicA && !excludedTopicIds.includes(topicA.id)) {
            topicsToCreate.push({ ...topicA, map_id: newMap.id, parent_topic_id: null });
          }
          if (topicB && !excludedTopicIds.includes(topicB.id)) {
            topicsToCreate.push({ ...topicB, map_id: newMap.id, parent_topic_id: null });
          }
          break;

        case 'keep_a':
          if (topicA && !excludedTopicIds.includes(topicA.id)) {
            topicsToCreate.push({ ...topicA, map_id: newMap.id, parent_topic_id: null });
          }
          break;

        case 'keep_b':
          if (topicB && !excludedTopicIds.includes(topicB.id)) {
            topicsToCreate.push({ ...topicB, map_id: newMap.id, parent_topic_id: null });
          }
          break;
      }
    }

    // Add unique topics (not in any decision)
    const topicsInDecisions = new Set(
      topicDecisions.flatMap(d => [d.topicAId, d.topicBId].filter(Boolean) as string[])
    );
    for (const map of sourceMaps) {
      for (const topic of map.topics || []) {
        if (!topicsInDecisions.has(topic.id) && !excludedTopicIds.includes(topic.id)) {
          topicsToCreate.push({ ...topic, map_id: newMap.id, parent_topic_id: null });
        }
      }
    }

    // Add new topics
    for (const topic of newTopics) {
      topicsToCreate.push({ ...topic, map_id: newMap.id, parent_topic_id: null });
    }

    // 3. Insert topics
    if (topicsToCreate.length > 0) {
      const topicsWithIds = topicsToCreate.map(t => ({
        ...t,
        id: crypto.randomUUID(),
      }));

      const { error: topicsError } = await supabase
        .from('topics')
        .insert(topicsWithIds);

      if (topicsError) {
        throw new Error(`Failed to create topics: ${topicsError.message}`);
      }

      return {
        success: true,
        newMapId: newMap.id,
        topicsCreated: topicsWithIds.length,
      };
    }

    return {
      success: true,
      newMapId: newMap.id,
      topicsCreated: 0,
    };
  } catch (error) {
    return {
      success: false,
      newMapId: null,
      topicsCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**Step 2: Commit**

```bash
git add services/mapMergeService.ts
git commit -m "feat(merge): add mapMergeService for executing merge"
```

---

### Task 18: Wire Up Final Merge Execution

**Files:**
- Modify: `components/merge/MergeMapWizard.tsx`

**Step 1: Add import**

```typescript
import { executeMerge } from '../../services/mapMergeService';
import MergeReviewStep from './MergeReviewStep';
```

**Step 2: Add merge handler**

```typescript
const handleCreateMergedMap = useCallback(async () => {
  if (!mergeState.newMapName.trim()) {
    mergeDispatch({ type: 'SET_ANALYSIS_ERROR', payload: 'Please enter a map name' });
    return;
  }

  mergeDispatch({ type: 'SET_ANALYZING', payload: true });

  try {
    const result = await executeMerge({
      projectId: appState.activeProjectId!,
      newMapName: mergeState.newMapName,
      sourceMaps: mergeState.sourceMaps,
      resolvedPillars: mergeState.resolvedContext.pillars!,
      resolvedBusinessInfo: mergeState.resolvedContext.businessInfo,
      resolvedEavs: mergeState.resolvedEavs,
      topicDecisions: mergeState.topicDecisions,
      newTopics: mergeState.newTopics,
      excludedTopicIds: mergeState.excludedTopicIds,
      supabaseUrl: appState.businessInfo.supabaseUrl,
      supabaseAnonKey: appState.businessInfo.supabaseAnonKey,
    });

    if (result.success && result.newMapId) {
      appDispatch({ type: 'SET_NOTIFICATION', payload: `Merged map created with ${result.topicsCreated} topics!` });
      // Refresh maps list
      // TODO: Trigger reload of topical maps
      handleClose();
    } else {
      mergeDispatch({ type: 'SET_ANALYSIS_ERROR', payload: result.error || 'Merge failed' });
    }
  } catch (error) {
    mergeDispatch({
      type: 'SET_ANALYSIS_ERROR',
      payload: error instanceof Error ? error.message : 'Merge failed'
    });
  } finally {
    mergeDispatch({ type: 'SET_ANALYZING', payload: false });
  }
}, [mergeState, appState, appDispatch, handleClose, mergeDispatch]);
```

**Step 3: Update renderStep for review**

```typescript
case 'review':
  return (
    <MergeReviewStep
      sourceMaps={mergeState.sourceMaps}
      resolvedContext={mergeState.resolvedContext}
      contextConflicts={mergeState.contextConflicts}
      topicDecisions={mergeState.topicDecisions}
      newTopics={mergeState.newTopics}
      excludedTopicIds={mergeState.excludedTopicIds}
      newMapName={mergeState.newMapName}
      onMapNameChange={setNewMapName}
    />
  );
```

**Step 4: Update footer button for final step**

```typescript
<Button
  onClick={mergeState.step === 'review' ? handleCreateMergedMap : handleNext}
  disabled={!canProceed() || mergeState.isAnalyzing}
>
  {mergeState.isAnalyzing ? 'Processing...' : mergeState.step === 'review' ? 'Create Merged Map' : 'Next'}
</Button>
```

**Step 5: Update canProceed for review step**

```typescript
case 'review':
  return mergeState.newMapName.trim().length > 0;
```

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add components/merge/MergeMapWizard.tsx
git commit -m "feat(merge): wire up final merge execution"
```

---

## Final Verification

### Task 19: End-to-End Verification

**Step 1: Run full build**

```bash
npm run build
```
Expected: Build succeeds with no errors

**Step 2: Start dev server and test manually**

```bash
npm run dev
```

Test:
1. Navigate to a project with 2+ topical maps
2. Click "Merge Maps" button
3. Select 2 maps
4. Proceed through wizard steps
5. Verify merged map is created

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(merge): complete topical map merge feature MVP"
```

---

## Summary

This implementation plan covers:

1. **Types & State** - MapMergeState, useMapMerge hook
2. **AI Service** - analyzeMapMerge for topic similarity detection
3. **UI Components** - MergeMapWizard, SelectStep, ContextStep, TopicsStep, ReviewStep
4. **Execution** - mapMergeService for creating merged map in database

**Not included in MVP (future tasks):**
- EAV consolidation step (Task 13)
- Export/Import workflow (Tasks 14-15)
- Brief merging logic
- Topic tree drag-drop in review
- Undo/redo within wizard

**Total tasks:** 19
**Estimated implementation time:** 4-6 hours for core functionality
