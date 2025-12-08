// services/mapMergeExecution.ts
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabaseClient';
import { slugify, cleanSlug } from '../utils/helpers';
import {
  MergeExecutionInput,
  MergeExecutionResult,
  TopicalMap,
  EnrichedTopic,
  TopicMergeDecision,
} from '../types';

/**
 * Execute the merge of multiple topical maps into a single new map.
 * This handles all database operations in sequence.
 */
export async function executeMerge(
  input: MergeExecutionInput,
  supabaseUrl: string,
  supabaseKey: string
): Promise<MergeExecutionResult> {
  const supabase = getSupabaseClient(supabaseUrl, supabaseKey);
  const warnings: string[] = [];
  const newMapId = uuidv4();

  // Step 1: Create the new map record
  const { data: mapData, error: mapError } = await supabase
    .from('topical_maps')
    .insert({
      id: newMapId,
      project_id: input.projectId,
      user_id: input.userId,
      name: input.newMapName,
      business_info: input.resolvedContext.businessInfo as any,
      pillars: input.resolvedContext.pillars as any,
      eavs: input.resolvedEavs as any,
      competitors: input.resolvedCompetitors,
    })
    .select()
    .single();

  if (mapError) {
    throw new Error(`Failed to create merged map: ${mapError.message}`);
  }

  // Step 2: Build final topic list from decisions
  const finalTopics = buildFinalTopicList(input, newMapId, input.userId);

  // Step 3: Insert topics in correct order (cores first, then outers)
  const coreTopics = finalTopics.filter(t => t.type === 'core');
  const outerTopics = finalTopics.filter(t => t.type === 'outer');

  // Build ID mapping for parent references
  const oldToNewId = new Map<string, string>();
  finalTopics.forEach(t => {
    if (t._originalIds) {
      t._originalIds.forEach(oldId => oldToNewId.set(oldId, t.id));
    }
  });

  // Insert core topics
  if (coreTopics.length > 0) {
    const coreDbTopics = coreTopics.map(t => ({
      id: t.id,
      map_id: newMapId,
      user_id: input.userId,
      title: t.title,
      slug: t.slug,
      description: t.description,
      type: 'core' as const,
      parent_topic_id: null,
      freshness: t.freshness || 'STANDARD',
      metadata: (t.metadata || {}) as any,
    }));

    const { error: coreError } = await supabase.from('topics').insert(coreDbTopics);
    if (coreError) {
      // Rollback: delete the map
      await supabase.from('topical_maps').delete().eq('id', newMapId);
      throw new Error(`Failed to insert core topics: ${coreError.message}`);
    }
  }

  // Insert outer topics with resolved parent IDs
  if (outerTopics.length > 0) {
    const outerDbTopics = outerTopics.map(t => {
      let parentId = t.parent_topic_id;
      // Resolve old parent ID to new ID
      if (parentId && oldToNewId.has(parentId)) {
        parentId = oldToNewId.get(parentId)!;
      }
      // If parent was deleted, make it a core topic
      if (parentId && !finalTopics.find(ft => ft.id === parentId)) {
        warnings.push(`Topic "${t.title}" lost parent, converted to core topic`);
        parentId = null;
      }

      return {
        id: t.id,
        map_id: newMapId,
        user_id: input.userId,
        title: t.title,
        slug: t.slug,
        description: t.description,
        type: parentId ? 'outer' as const : 'core' as const,
        parent_topic_id: parentId,
        freshness: t.freshness || 'STANDARD',
        metadata: (t.metadata || {}) as any,
      };
    });

    const { error: outerError } = await supabase.from('topics').insert(outerDbTopics);
    if (outerError) {
      // Rollback
      await supabase.from('topics').delete().eq('map_id', newMapId);
      await supabase.from('topical_maps').delete().eq('id', newMapId);
      throw new Error(`Failed to insert outer topics: ${outerError.message}`);
    }
  }

  // Build result
  const newMap: TopicalMap = {
    id: newMapId,
    project_id: input.projectId,
    name: input.newMapName,
    created_at: new Date().toISOString(),
    business_info: input.resolvedContext.businessInfo,
    pillars: input.resolvedContext.pillars || undefined,
    eavs: input.resolvedEavs,
    competitors: input.resolvedCompetitors,
    topics: finalTopics.map(t => ({ ...t, _originalIds: undefined })) as EnrichedTopic[],
  };

  return {
    newMap,
    topicsCreated: finalTopics.length,
    warnings,
  };
}

/**
 * Build the final list of topics based on merge decisions.
 */
function buildFinalTopicList(
  input: MergeExecutionInput,
  newMapId: string,
  userId: string
): (EnrichedTopic & { _originalIds?: string[] })[] {
  const result: (EnrichedTopic & { _originalIds?: string[] })[] = [];
  const processedTopicIds = new Set<string>();

  // Get all source topics
  const allSourceTopics = new Map<string, { topic: EnrichedTopic; mapName: string }>();
  input.sourceMaps.forEach(map => {
    (map.topics || []).forEach(topic => {
      allSourceTopics.set(topic.id, { topic, mapName: map.name });
    });
  });

  // Process topic decisions
  for (const decision of input.topicDecisions) {
    const topicA = decision.topicAId ? allSourceTopics.get(decision.topicAId)?.topic : null;
    const topicB = decision.topicBId ? allSourceTopics.get(decision.topicBId)?.topic : null;

    if (decision.topicAId) processedTopicIds.add(decision.topicAId);
    if (decision.topicBId) processedTopicIds.add(decision.topicBId);

    switch (decision.userDecision) {
      case 'merge':
        // Create merged topic
        if (topicA || topicB) {
          const baseTopic = topicA || topicB!;
          const newId = uuidv4();
          result.push({
            id: newId,
            map_id: newMapId,
            title: decision.finalTitle || baseTopic.title,
            description: decision.finalDescription || baseTopic.description,
            slug: slugify(decision.finalTitle || baseTopic.title),
            type: decision.finalType || baseTopic.type,
            parent_topic_id: decision.finalParentId || baseTopic.parent_topic_id,
            freshness: baseTopic.freshness,
            _originalIds: [decision.topicAId, decision.topicBId].filter(Boolean) as string[],
          });
        }
        break;

      case 'keep_both':
        // Keep both topics with new IDs
        if (topicA) {
          const newId = uuidv4();
          result.push({
            ...topicA,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicA.title),
            _originalIds: [topicA.id],
          });
        }
        if (topicB) {
          const newId = uuidv4();
          result.push({
            ...topicB,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicB.title),
            _originalIds: [topicB.id],
          });
        }
        break;

      case 'keep_a':
        if (topicA) {
          const newId = uuidv4();
          result.push({
            ...topicA,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicA.title),
            _originalIds: [topicA.id],
          });
        }
        break;

      case 'keep_b':
        if (topicB) {
          const newId = uuidv4();
          result.push({
            ...topicB,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicB.title),
            _originalIds: [topicB.id],
          });
        }
        break;

      case 'delete':
        // Skip both topics
        break;

      case 'pending':
        // Treat as keep_both by default
        if (topicA) {
          const newId = uuidv4();
          result.push({
            ...topicA,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicA.title),
            _originalIds: [topicA.id],
          });
        }
        if (topicB) {
          const newId = uuidv4();
          result.push({
            ...topicB,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicB.title),
            _originalIds: [topicB.id],
          });
        }
        break;
    }
  }

  // Add unique topics (not in any decision) unless excluded
  allSourceTopics.forEach(({ topic }, topicId) => {
    if (!processedTopicIds.has(topicId) && !input.excludedTopicIds.includes(topicId)) {
      const newId = uuidv4();
      result.push({
        ...topic,
        id: newId,
        map_id: newMapId,
        slug: slugify(topic.title),
        _originalIds: [topic.id],
      });
    }
  });

  // Add new topics
  for (const newTopic of input.newTopics) {
    const newId = uuidv4();
    result.push({
      ...newTopic,
      id: newId,
      map_id: newMapId,
      slug: slugify(newTopic.title),
    });
  }

  // Fix slugs for outer topics (include parent path)
  const topicById = new Map(result.map(t => [t.id, t]));
  result.forEach(topic => {
    if (topic.type === 'outer' && topic.parent_topic_id) {
      const parent = topicById.get(topic.parent_topic_id);
      if (parent) {
        topic.slug = `${parent.slug}/${cleanSlug(parent.slug, topic.title)}`;
      }
    }
  });

  return result;
}
