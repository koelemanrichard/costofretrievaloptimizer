/**
 * Content Generation Slice
 *
 * Handles brief CRUD and content generation state within a topical map.
 * Extracted from the monolithic mapReducer for maintainability.
 *
 * Created: 2026-02-07 - State management refactoring (Task 28)
 */

import { TopicalMap, ContentBrief, BriefSection } from '../../types';

// ============================================================================
// ACTION TYPES
// ============================================================================

export type ContentGenerationAction =
  | { type: 'SET_BRIEFS_FOR_MAP'; payload: { mapId: string; briefs: Record<string, ContentBrief> } }
  | { type: 'ADD_BRIEF'; payload: { mapId: string; topicId: string; brief: ContentBrief } }
  | { type: 'UPDATE_BRIEF'; payload: { mapId: string; topicId: string; updates: Partial<ContentBrief> } }
  | { type: 'UPDATE_BRIEF_LINKS'; payload: { mapId: string; sourceTopicId: string; linkToAdd: any } }
  | { type: 'UPDATE_BRIEF_SECTION'; payload: { mapId: string; topicId: string; sectionIndex: number; section: BriefSection } }
  | { type: 'DELETE_BRIEF_SECTION'; payload: { mapId: string; topicId: string; sectionIndex: number } }
  | { type: 'ADD_BRIEF_SECTION'; payload: { mapId: string; topicId: string; sectionIndex: number; section: BriefSection } }
  | { type: 'REORDER_BRIEF_SECTIONS'; payload: { mapId: string; topicId: string; sections: BriefSection[] } }
  | { type: 'REPLACE_BRIEF'; payload: { mapId: string; topicId: string; brief: ContentBrief } };

// ============================================================================
// REDUCER
// ============================================================================

/**
 * Reduces content generation (brief) operations on a TopicalMap.
 * Returns the updated map or null if the action is not handled.
 */
export function contentGenerationReducer(map: TopicalMap, action: ContentGenerationAction): TopicalMap | null {
  switch (action.type) {
    case 'SET_BRIEFS_FOR_MAP':
      return { ...map, briefs: action.payload.briefs };

    case 'ADD_BRIEF':
      return {
        ...map,
        briefs: { ...(map.briefs || {}), [action.payload.topicId]: action.payload.brief },
      };

    case 'UPDATE_BRIEF': {
      const existingBrief = map.briefs?.[action.payload.topicId];
      if (!existingBrief) return map;
      return {
        ...map,
        briefs: {
          ...(map.briefs || {}),
          [action.payload.topicId]: { ...existingBrief, ...action.payload.updates },
        },
      };
    }

    case 'UPDATE_BRIEF_LINKS': {
      const { sourceTopicId, linkToAdd } = action.payload;
      const brief = map.briefs?.[sourceTopicId];
      if (!brief) return map;

      let newBridge: typeof brief.contextualBridge;
      if (Array.isArray(brief.contextualBridge)) {
        newBridge = [...brief.contextualBridge, linkToAdd];
      } else if (brief.contextualBridge && typeof brief.contextualBridge === 'object') {
        newBridge = {
          ...brief.contextualBridge,
          links: [...(brief.contextualBridge.links || []), linkToAdd],
        };
      } else {
        newBridge = [linkToAdd];
      }

      const updatedBrief = { ...brief, contextualBridge: newBridge };
      return { ...map, briefs: { ...(map.briefs || {}), [sourceTopicId]: updatedBrief } };
    }

    case 'UPDATE_BRIEF_SECTION': {
      const { topicId, sectionIndex, section } = action.payload;
      const brief = map.briefs?.[topicId];
      if (!brief || !brief.structured_outline) return map;

      const newOutline = [...brief.structured_outline];
      newOutline[sectionIndex] = section;

      return {
        ...map,
        briefs: {
          ...(map.briefs || {}),
          [topicId]: { ...brief, structured_outline: newOutline },
        },
      };
    }

    case 'DELETE_BRIEF_SECTION': {
      const { topicId, sectionIndex } = action.payload;
      const brief = map.briefs?.[topicId];
      if (!brief || !brief.structured_outline) return map;

      const newOutline = brief.structured_outline.filter((_, idx) => idx !== sectionIndex);

      return {
        ...map,
        briefs: {
          ...(map.briefs || {}),
          [topicId]: { ...brief, structured_outline: newOutline },
        },
      };
    }

    case 'ADD_BRIEF_SECTION': {
      const { topicId, sectionIndex, section } = action.payload;
      const brief = map.briefs?.[topicId];
      if (!brief) return map;

      const currentOutline = brief.structured_outline || [];
      const newOutline = [
        ...currentOutline.slice(0, sectionIndex),
        section,
        ...currentOutline.slice(sectionIndex),
      ];

      return {
        ...map,
        briefs: {
          ...(map.briefs || {}),
          [topicId]: { ...brief, structured_outline: newOutline },
        },
      };
    }

    case 'REORDER_BRIEF_SECTIONS': {
      const { topicId, sections } = action.payload;
      const brief = map.briefs?.[topicId];
      if (!brief) return map;

      return {
        ...map,
        briefs: {
          ...(map.briefs || {}),
          [topicId]: { ...brief, structured_outline: sections },
        },
      };
    }

    case 'REPLACE_BRIEF': {
      const { topicId, brief } = action.payload;
      return {
        ...map,
        briefs: {
          ...(map.briefs || {}),
          [topicId]: brief,
        },
      };
    }

    default:
      return null; // Not handled
  }
}

// ============================================================================
// ACTION TYPE GUARDS
// ============================================================================

const CONTENT_GENERATION_ACTION_TYPES = new Set([
  'SET_BRIEFS_FOR_MAP',
  'ADD_BRIEF',
  'UPDATE_BRIEF',
  'UPDATE_BRIEF_LINKS',
  'UPDATE_BRIEF_SECTION',
  'DELETE_BRIEF_SECTION',
  'ADD_BRIEF_SECTION',
  'REORDER_BRIEF_SECTIONS',
  'REPLACE_BRIEF',
]);

export function isContentGenerationAction(type: string): boolean {
  return CONTENT_GENERATION_ACTION_TYPES.has(type);
}
