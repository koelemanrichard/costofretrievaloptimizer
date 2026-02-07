/**
 * Topic Operations Slice
 *
 * Handles topic CRUD operations within a topical map.
 * Extracted from the monolithic mapReducer for maintainability.
 *
 * Created: 2026-02-07 - State management refactoring (Task 28)
 */

import { TopicalMap, EnrichedTopic } from '../../types';

// ============================================================================
// ACTION TYPES
// ============================================================================

export type TopicOperationsAction =
  | { type: 'SET_TOPICS_FOR_MAP'; payload: { mapId: string; topics: EnrichedTopic[] } }
  | { type: 'ADD_TOPIC'; payload: { mapId: string; topic: EnrichedTopic } }
  | { type: 'ADD_TOPICS'; payload: { mapId: string; topics: EnrichedTopic[] } }
  | { type: 'UPDATE_TOPIC'; payload: { mapId: string; topicId: string; updates: Partial<EnrichedTopic> } }
  | { type: 'DELETE_TOPIC'; payload: { mapId: string; topicId: string } };

// ============================================================================
// REDUCER
// ============================================================================

/**
 * Reduces topic operations on a TopicalMap.
 * Returns the updated map or null if the action is not handled.
 */
export function topicOperationsReducer(map: TopicalMap, action: TopicOperationsAction): TopicalMap | null {
  switch (action.type) {
    case 'SET_TOPICS_FOR_MAP':
      return { ...map, topics: action.payload.topics };

    case 'ADD_TOPIC': {
      const newTopics = [...(map.topics || []), action.payload.topic];
      return { ...map, topics: newTopics };
    }

    case 'ADD_TOPICS': {
      // Batch add topics - prevents issues with multiple individual dispatches
      const currentTopics = map.topics || [];
      const newTopicIds = new Set(action.payload.topics.map((t: EnrichedTopic) => t.id));
      // Filter out any existing topics to prevent duplicates
      const dedupedCurrent = currentTopics.filter(t => !newTopicIds.has(t.id));
      const finalTopics = [...dedupedCurrent, ...action.payload.topics];
      return { ...map, topics: finalTopics };
    }

    case 'UPDATE_TOPIC':
      return {
        ...map,
        topics: (map.topics || []).map(t =>
          t.id === action.payload.topicId ? { ...t, ...action.payload.updates } : t
        ),
      };

    case 'DELETE_TOPIC':
      return {
        ...map,
        topics: (map.topics || []).filter(t => t.id !== action.payload.topicId),
      };

    default:
      return null; // Not handled
  }
}

// ============================================================================
// ACTION TYPE GUARDS
// ============================================================================

const TOPIC_ACTION_TYPES = new Set([
  'SET_TOPICS_FOR_MAP',
  'ADD_TOPIC',
  'ADD_TOPICS',
  'UPDATE_TOPIC',
  'DELETE_TOPIC',
]);

export function isTopicOperationsAction(type: string): boolean {
  return TOPIC_ACTION_TYPES.has(type);
}
