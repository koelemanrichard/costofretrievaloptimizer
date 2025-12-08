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
  isCreating: false,
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
