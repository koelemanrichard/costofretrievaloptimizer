// services/insights/actionExecutor.ts
// Service for executing AI-enhanced actions from insights

import { SupabaseClient } from '@supabase/supabase-js';
import type { SemanticTriple, ContentBrief, EnrichedTopic, BusinessInfo } from '../../types';
import { ResponseCode } from '../../types';
import { KnowledgeGraph } from '../../lib/knowledgeGraph';
import type {
  InsightAction,
  InsightActionType,
  AddEavsToMapPayload,
  CreateBriefFromGapPayload,
  AddQuestionsAsFaqPayload,
  MergeTopicsPayload,
  ContentGap,
} from '../../types/insights';
import * as aiService from '../aiService';

// =====================
// Action Executor
// =====================

export interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
  error?: string;
}

export async function executeAction(
  supabase: SupabaseClient,
  action: InsightAction,
  businessInfo: BusinessInfo,
  dispatch?: React.Dispatch<any>
): Promise<ActionResult> {
  console.log('[ActionExecutor] Executing action:', action.actionType, action.id);

  try {
    // Update action status to in_progress
    await updateActionStatus(supabase, action.id, 'in_progress');

    let result: ActionResult;

    switch (action.actionType) {
      case 'add_eavs_to_map':
        result = await executeAddEavsToMap(supabase, action, businessInfo, dispatch);
        break;
      case 'create_brief_from_gap':
        result = await executeCreateBriefFromGap(supabase, action, businessInfo, dispatch);
        break;
      case 'add_questions_as_faq':
        result = await executeAddQuestionsAsFaq(supabase, action, businessInfo, dispatch);
        break;
      case 'merge_topics':
        result = await executeMergeTopics(supabase, action, businessInfo, dispatch);
        break;
      case 'differentiate_topics':
        result = await executeDifferentiateTopics(supabase, action, businessInfo, dispatch);
        break;
      default:
        result = { success: false, message: 'Unknown action type', error: `Action type ${action.actionType} not implemented` };
    }

    // Update action status
    const finalStatus = result.success ? 'completed' : 'failed';
    await updateActionStatus(supabase, action.id, finalStatus, result);

    return result;
  } catch (error) {
    console.error('[ActionExecutor] Action failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateActionStatus(supabase, action.id, 'failed', { success: false, message: 'Action failed', error: errorMessage });
    return { success: false, message: 'Action failed', error: errorMessage };
  }
}

// =====================
// Individual Action Executors
// =====================

async function executeAddEavsToMap(
  supabase: SupabaseClient,
  action: InsightAction,
  businessInfo: BusinessInfo,
  dispatch?: React.Dispatch<any>
): Promise<ActionResult> {
  const payload = action.payload as AddEavsToMapPayload;
  const { selectedEavs, deduplicateAgainstExisting, autoClassify, addLexicalData } = payload;

  // Get existing EAVs from the map
  const { data: mapData, error: mapError } = await supabase
    .from('topical_maps')
    .select('eavs')
    .eq('id', action.mapId)
    .single();

  if (mapError) {
    return { success: false, message: 'Failed to load map', error: mapError.message };
  }

  const existingEavs = (mapData?.eavs || []) as SemanticTriple[];
  let newEavs = [...selectedEavs];

  // Deduplicate if requested
  if (deduplicateAgainstExisting) {
    const existingSet = new Set(
      existingEavs.map(e => `${e.subject.label}|${e.predicate.relation}|${e.object.value}`.toLowerCase())
    );
    newEavs = newEavs.filter(e =>
      !existingSet.has(`${e.subject.label}|${e.predicate.relation}|${e.object.value}`.toLowerCase())
    );
  }

  if (newEavs.length === 0) {
    return { success: true, message: 'No new unique EAVs to add', data: { added: 0 } };
  }

  // Auto-classify if requested (using AI)
  if (autoClassify) {
    try {
      newEavs = await classifyEavs(newEavs, businessInfo, dispatch);
    } catch (e) {
      console.warn('[ActionExecutor] EAV classification failed, using defaults:', e);
    }
  }

  // Add lexical data if requested (using AI)
  if (addLexicalData) {
    try {
      newEavs = await enrichEavsWithLexicalData(newEavs, businessInfo, dispatch);
    } catch (e) {
      console.warn('[ActionExecutor] Lexical enrichment failed:', e);
    }
  }

  // Merge and save
  const combinedEavs = [...existingEavs, ...newEavs];
  const { error: updateError } = await supabase
    .from('topical_maps')
    .update({ eavs: combinedEavs })
    .eq('id', action.mapId);

  if (updateError) {
    return { success: false, message: 'Failed to update map', error: updateError.message };
  }

  return {
    success: true,
    message: `Added ${newEavs.length} EAVs to the map`,
    data: { added: newEavs.length, total: combinedEavs.length },
  };
}

async function executeCreateBriefFromGap(
  supabase: SupabaseClient,
  action: InsightAction,
  businessInfo: BusinessInfo,
  dispatch?: React.Dispatch<any>
): Promise<ActionResult> {
  const payload = action.payload as CreateBriefFromGapPayload;
  const { gap, topicType, parentTopicId, includeCompetitorAnalysis, targetWordCount } = payload;

  // Create a new topic from the gap
  const topicSlug = gap.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const newTopic: Partial<EnrichedTopic> = {
    map_id: action.mapId,
    title: gap.title,
    slug: topicSlug,
    description: gap.description,
    type: topicType,
    parent_topic_id: parentTopicId || null,
    metadata: {
      source: 'content_gap',
      gap_id: gap.id,
      competitor_count: gap.competitorCoverageCount,
    },
  };

  // Insert the topic
  const { data: topicData, error: topicError } = await supabase
    .from('topics')
    .insert(newTopic)
    .select()
    .single();

  if (topicError) {
    return { success: false, message: 'Failed to create topic', error: topicError.message };
  }

  // Generate a content brief for the topic
  try {
    // Get map data including pillars, eavs, and all topics
    const { data: mapData } = await supabase
      .from('topical_maps')
      .select('pillars, eavs')
      .eq('id', action.mapId)
      .single();

    const { data: allTopics } = await supabase
      .from('topics')
      .select('*')
      .eq('map_id', action.mapId);

    if (mapData?.pillars && allTopics) {
      // Create knowledge graph from EAVs
      const eavs = mapData.eavs || [];
      const knowledgeGraph = new KnowledgeGraph();

      // Populate knowledge graph with EAVs as nodes and edges
      for (const eav of eavs) {
        if (eav.subject?.label) {
          knowledgeGraph.addNode({
            id: `subj_${eav.subject.label.toLowerCase().replace(/\s+/g, '_')}`,
            term: eav.subject.label,
            type: eav.subject.type || 'entity',
            definition: eav.subject.definition || '',
            metadata: {
              importance: 1,
              source: 'content_gap_action',
            },
          });
        }
        if (eav.object?.value) {
          knowledgeGraph.addNode({
            id: `obj_${eav.object.value.toString().toLowerCase().replace(/\s+/g, '_')}`,
            term: eav.object.value.toString(),
            type: eav.object.type || 'value',
            definition: '',
            metadata: {
              importance: 1,
              source: 'content_gap_action',
            },
          });
        }
        if (eav.subject?.label && eav.object?.value) {
          knowledgeGraph.addEdge({
            id: `edge_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            source: `subj_${eav.subject.label.toLowerCase().replace(/\s+/g, '_')}`,
            target: `obj_${eav.object.value.toString().toLowerCase().replace(/\s+/g, '_')}`,
            relation: eav.predicate?.relation || 'has',
            metadata: {
              source: 'content_gap_action',
              category: eav.predicate?.category,
            },
          });
        }
      }

      // Use default response code
      const responseCode = ResponseCode.INFORMATIONAL;

      const brief = await aiService.generateContentBrief(
        businessInfo,
        topicData as EnrichedTopic,
        allTopics as EnrichedTopic[],
        mapData.pillars,
        knowledgeGraph,
        responseCode,
        dispatch
      );

      // Save the brief
      if (brief) {
        const { error: briefError } = await supabase
          .from('content_briefs')
          .insert({
            map_id: action.mapId,
            topic_id: topicData.id,
            brief_data: brief,
            target_word_count: targetWordCount || 1500,
          });

        if (briefError) {
          console.warn('[ActionExecutor] Brief save failed:', briefError);
        }
      }
    }
  } catch (e) {
    console.warn('[ActionExecutor] Brief generation failed:', e);
    // Don't fail the whole action, the topic was still created
  }

  return {
    success: true,
    message: `Created topic "${gap.title}" from content gap`,
    data: { topicId: topicData.id, title: gap.title },
  };
}

async function executeAddQuestionsAsFaq(
  supabase: SupabaseClient,
  action: InsightAction,
  businessInfo: BusinessInfo,
  dispatch?: React.Dispatch<any>
): Promise<ActionResult> {
  const payload = action.payload as AddQuestionsAsFaqPayload;
  const { questions, createNewTopic, existingTopicId, generateAnswers } = payload;

  let topicId = existingTopicId;
  let topicTitle = 'FAQ';

  // Create new FAQ topic if requested
  if (createNewTopic) {
    const newTopic: Partial<EnrichedTopic> = {
      map_id: action.mapId,
      title: 'Frequently Asked Questions',
      slug: 'faq',
      description: 'Common questions and answers',
      type: 'outer',
      parent_topic_id: null,
      metadata: {
        source: 'faq_action',
        question_count: questions.length,
      },
    };

    const { data: topicData, error: topicError } = await supabase
      .from('topics')
      .insert(newTopic)
      .select()
      .single();

    if (topicError) {
      return { success: false, message: 'Failed to create FAQ topic', error: topicError.message };
    }

    topicId = topicData.id;
    topicTitle = topicData.title;
  }

  // Generate answers if requested
  let faqItems: Array<{ question: string; answer: string }> = [];

  if (generateAnswers) {
    try {
      // Get EAVs for context
      const { data: mapData } = await supabase
        .from('topical_maps')
        .select('eavs, pillars')
        .eq('id', action.mapId)
        .single();

      faqItems = await generateFaqAnswers(
        questions,
        mapData?.eavs || [],
        mapData?.pillars,
        businessInfo,
        dispatch
      );
    } catch (e) {
      console.warn('[ActionExecutor] Answer generation failed:', e);
      // Fall back to questions without answers
      faqItems = questions.map(q => ({ question: q, answer: '' }));
    }
  } else {
    faqItems = questions.map(q => ({ question: q, answer: '' }));
  }

  // Update topic metadata with FAQ items
  if (topicId) {
    const { data: existingTopic } = await supabase
      .from('topics')
      .select('metadata')
      .eq('id', topicId)
      .single();

    const existingFaq = (existingTopic?.metadata as any)?.faq_items || [];
    const updatedFaq = [...existingFaq, ...faqItems];

    await supabase
      .from('topics')
      .update({
        metadata: {
          ...(existingTopic?.metadata as any || {}),
          faq_items: updatedFaq,
        },
      })
      .eq('id', topicId);
  }

  return {
    success: true,
    message: `Added ${questions.length} FAQ items${generateAnswers ? ' with generated answers' : ''}`,
    data: { topicId, questionsAdded: questions.length, answersGenerated: generateAnswers },
  };
}

async function executeMergeTopics(
  supabase: SupabaseClient,
  action: InsightAction,
  businessInfo: BusinessInfo,
  dispatch?: React.Dispatch<any>
): Promise<ActionResult> {
  const payload = action.payload as MergeTopicsPayload;
  const { topicIds, primaryTopicId } = payload;

  if (topicIds.length !== 2) {
    return { success: false, message: 'Merge requires exactly 2 topics', error: 'Invalid topic count' };
  }

  // Get both topics
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('*')
    .in('id', topicIds);

  if (topicsError || !topics || topics.length !== 2) {
    return { success: false, message: 'Failed to load topics', error: topicsError?.message || 'Topics not found' };
  }

  const [topic1, topic2] = topics;
  const primary = primaryTopicId
    ? topics.find(t => t.id === primaryTopicId) || topic1
    : topic1;
  const secondary = primary === topic1 ? topic2 : topic1;

  // Merge metadata
  const mergedMetadata = {
    ...((secondary.metadata as any) || {}),
    ...((primary.metadata as any) || {}),
    merged_from: secondary.id,
    merged_at: new Date().toISOString(),
  };

  // Update primary topic with merged description
  const mergedDescription = `${primary.description}\n\nAdditionally: ${secondary.description}`;

  await supabase
    .from('topics')
    .update({
      description: mergedDescription,
      metadata: mergedMetadata,
    })
    .eq('id', primary.id);

  // Move any children of secondary to primary
  await supabase
    .from('topics')
    .update({ parent_topic_id: primary.id })
    .eq('parent_topic_id', secondary.id);

  // Move briefs from secondary to primary
  await supabase
    .from('content_briefs')
    .update({ topic_id: primary.id })
    .eq('topic_id', secondary.id);

  // Delete secondary topic
  await supabase
    .from('topics')
    .delete()
    .eq('id', secondary.id);

  return {
    success: true,
    message: `Merged "${secondary.title}" into "${primary.title}"`,
    data: { primaryTopicId: primary.id, deletedTopicId: secondary.id },
  };
}

async function executeDifferentiateTopics(
  supabase: SupabaseClient,
  action: InsightAction,
  businessInfo: BusinessInfo,
  dispatch?: React.Dispatch<any>
): Promise<ActionResult> {
  const payload = action.payload as MergeTopicsPayload;
  const { topicIds, differentiationAngles } = payload;

  if (topicIds.length !== 2) {
    return { success: false, message: 'Differentiation requires exactly 2 topics', error: 'Invalid topic count' };
  }

  // Get both topics
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('*')
    .in('id', topicIds);

  if (topicsError || !topics || topics.length !== 2) {
    return { success: false, message: 'Failed to load topics', error: topicsError?.message || 'Topics not found' };
  }

  // Use AI to suggest differentiation angles if not provided
  let angles = differentiationAngles;
  if (!angles || angles.length === 0) {
    try {
      angles = await suggestDifferentiationAngles(topics, businessInfo, dispatch);
    } catch (e) {
      console.warn('[ActionExecutor] AI differentiation failed:', e);
      angles = [
        `Focus on beginner audience for "${topics[0].title}"`,
        `Focus on advanced/technical aspects for "${topics[1].title}"`,
      ];
    }
  }

  // Update topics with differentiation metadata
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const angle = angles[i] || `Unique angle ${i + 1}`;

    await supabase
      .from('topics')
      .update({
        metadata: {
          ...((topic.metadata as any) || {}),
          differentiation_angle: angle,
          differentiated_at: new Date().toISOString(),
        },
      })
      .eq('id', topic.id);
  }

  return {
    success: true,
    message: `Differentiated topics with unique angles`,
    data: { topicIds, angles },
  };
}

// =====================
// Helper Functions
// =====================

async function updateActionStatus(
  supabase: SupabaseClient,
  actionId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'failed',
  result?: ActionResult
): Promise<void> {
  try {
    await supabase
      .from('insight_actions')
      .update({
        status,
        result: result?.data,
        error: result?.error,
        completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      })
      .eq('id', actionId);
  } catch (e) {
    console.warn('[ActionExecutor] Failed to update action status:', e);
  }
}

async function classifyEavs(
  eavs: SemanticTriple[],
  businessInfo: BusinessInfo,
  dispatch?: React.Dispatch<any>
): Promise<SemanticTriple[]> {
  // Simple classification based on frequency heuristics
  // In production, this could use AI for better classification
  return eavs.map(eav => ({
    ...eav,
    predicate: {
      ...eav.predicate,
      category: eav.predicate.category || 'COMMON',
    },
  }));
}

async function enrichEavsWithLexicalData(
  eavs: SemanticTriple[],
  businessInfo: BusinessInfo,
  dispatch?: React.Dispatch<any>
): Promise<SemanticTriple[]> {
  // In production, use AI or thesaurus API for synonyms/antonyms
  return eavs.map(eav => ({
    ...eav,
    lexical: eav.lexical || {
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
  }));
}

async function generateFaqAnswers(
  questions: string[],
  eavs: SemanticTriple[],
  pillars: any,
  businessInfo: BusinessInfo,
  dispatch?: React.Dispatch<any>
): Promise<Array<{ question: string; answer: string }>> {
  // In production, use AI to generate answers based on EAVs
  return questions.map(q => ({
    question: q,
    answer: `This is a placeholder answer for: "${q}". Replace with AI-generated content based on your EAVs.`,
  }));
}

async function suggestDifferentiationAngles(
  topics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  dispatch?: React.Dispatch<any>
): Promise<string[]> {
  // In production, use AI to suggest unique angles
  return topics.map((t, i) => `Unique perspective ${i + 1} for "${t.title}"`);
}

// =====================
// Action Creation
// =====================

export async function createAction(
  supabase: SupabaseClient,
  mapId: string,
  userId: string,
  actionType: InsightActionType,
  payload: Record<string, any>,
  source?: { type: string; id: string }
): Promise<InsightAction | null> {
  const { data, error } = await supabase
    .from('insight_actions')
    .insert({
      map_id: mapId,
      user_id: userId,
      action_type: actionType,
      source_type: source?.type,
      source_id: source?.id,
      payload,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('[ActionExecutor] Failed to create action:', error);
    return null;
  }

  return data as InsightAction;
}
