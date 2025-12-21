/**
 * Frame Semantics Expansion Service
 * Based on Charles Fillmore's Linguistic Theory
 *
 * Frame Semantics analyzes the "scene" a concept evokes:
 * - Actions (verbs/processes)
 * - Participants (agents, patients, instruments)
 * - Settings (environment, time, social context)
 * - Consequences (results of actions)
 *
 * This is particularly useful for topics with low keyword data,
 * where traditional attribute/entity expansion yields sparse results.
 */

import type {
  EnrichedTopic,
  SemanticFrame,
  FrameAction,
  FrameElement,
  SceneSetting,
  FrameExpansionResult,
  BusinessInfo,
  SemanticTriple,
  FreshnessProfile,
} from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../../utils/helpers';

/**
 * Frame Semantics expansion prompt
 */
export function getFrameExpansionPrompt(
  topic: EnrichedTopic,
  businessInfo: BusinessInfo
): string {
  return `You are a linguistic expert applying Frame Semantics (Fillmore's theory) to generate SEO subtopics.

TOPIC: "${topic.title}"
DESCRIPTION: ${topic.description || 'N/A'}

BUSINESS CONTEXT:
- Domain: ${businessInfo.domain}
- Industry: ${businessInfo.industry}
- Central Entity: ${businessInfo.seedKeyword}
- Target Audience: ${businessInfo.audience}

TASK: Analyze this topic using Frame Semantics - identify the SCENE it evokes.

1. FRAME ANALYSIS
   - What is the central frame/scene this topic represents?
   - What actions (verbs) are core to this scene?
   - Who are the participants (agents doing actions, patients receiving actions)?
   - What instruments/tools are involved?
   - Where/when does this typically happen?

2. SUBTOPIC GENERATION
   Generate 5-8 subtopics by exploring:
   - Different participant perspectives (agent vs patient view)
   - Prerequisite actions (what must happen before)
   - Consequent actions (what happens after)
   - Environmental variations (different settings)
   - Instrument alternatives (different tools/methods)
   - Manner variations (different ways to perform the action)

Each subtopic should:
- Have search intent potential
- Connect semantically to the parent topic
- Fill a unique informational niche

Return JSON in this exact format:
{
  "frame_analysis": {
    "frame_name": "string - name of the identified frame",
    "frame_description": "string - what scene/situation this frame represents",
    "actions": [
      {
        "verb": "string",
        "agent": "string - who/what performs this action",
        "patient": "string - who/what receives the action",
        "instrument": "string - tool/method used",
        "result": "string - outcome of the action"
      }
    ],
    "core_elements": [
      {
        "role": "agent|patient|instrument|location|time|manner|cause|result|beneficiary|experiencer",
        "entity": "string - the entity filling this role",
        "semantic_type": "string - type classification",
        "is_core": true
      }
    ],
    "peripheral_elements": [
      {
        "role": "string",
        "entity": "string",
        "semantic_type": "string",
        "is_core": false
      }
    ],
    "scene_setting": {
      "environment": "string - typical physical setting",
      "temporal_context": "string - when this typically occurs",
      "social_context": "string - social/professional context",
      "physical_context": "string - physical requirements/conditions"
    },
    "related_frames": ["string - names of related frames"]
  },
  "generated_subtopics": [
    {
      "title": "string - subtopic title",
      "description": "string - subtopic description",
      "frame_derivation": "string - how this was derived from the frame",
      "element_type": "action|agent|patient|instrument|location|time|manner|cause|result",
      "search_intent": "informational|transactional|navigational|commercial",
      "topic_class": "monetization|informational"
    }
  ]
}`;
}

/**
 * Parse frame analysis from AI response
 * Used when processing the response from expandCoreTopic with FRAME mode
 */
export function parseFrameAnalysis(parsed: any): SemanticFrame | null {
  if (!parsed?.frame_analysis) {
    return null;
  }

  const fa = parsed.frame_analysis;

  return {
    frame_name: fa.frame_name || 'Unknown Frame',
    frame_description: fa.frame_description || '',
    actions: sanitizeActions(fa.actions),
    core_elements: sanitizeElements(fa.core_elements, true),
    peripheral_elements: sanitizeElements(fa.peripheral_elements, false),
    scene_setting: sanitizeSceneSetting(fa.scene_setting),
    related_frames: Array.isArray(fa.related_frames) ? fa.related_frames : [],
  };
}

/**
 * Convert raw generated subtopics to enriched topics with frame metadata
 */
export function processFrameSubtopics(
  rawSubtopics: { title: string; description: string }[],
  parentTopic: EnrichedTopic,
  frame: SemanticFrame
): {
  topic: Partial<EnrichedTopic>;
  frame_derivation: string;
  element_source: FrameElement | FrameAction;
}[] {
  return rawSubtopics.map((st: any) => {
    const newId = uuidv4();
    const newTopic: Partial<EnrichedTopic> = {
      id: newId,
      map_id: parentTopic.map_id,
      parent_topic_id: parentTopic.id,
      title: st.title || 'Untitled Subtopic',
      slug: slugify(st.title || 'untitled'),
      description: st.description || '',
      type: 'outer',
      freshness: 'EVERGREEN' as FreshnessProfile,
      topic_class: st.topic_class === 'monetization' ? 'monetization' : 'informational',
      metadata: {
        frame_derivation: st.frame_derivation || 'Frame-based expansion',
        element_type: st.element_type || 'concept',
        search_intent: st.search_intent || 'informational',
        generated_via: 'frame_semantics',
      },
    };

    const elementType = st.element_type?.toLowerCase();
    let elementSource: FrameElement | FrameAction;

    if (elementType === 'action') {
      elementSource = frame.actions[0] || { verb: 'process', agent: parentTopic.title, patient: '', instrument: '', result: '' };
    } else {
      elementSource = frame.core_elements[0] || { role: 'agent', entity: parentTopic.title, semantic_type: 'topic', is_core: true };
    }

    return {
      topic: newTopic,
      frame_derivation: st.frame_derivation || 'Frame-based expansion',
      element_source: elementSource,
    };
  });
}

/**
 * Build a FrameExpansionResult from raw AI output and topic
 * Use this after calling expandCoreTopic with FRAME mode
 */
export function buildFrameExpansionResult(
  sourceTopic: EnrichedTopic,
  rawSubtopics: { title: string; description: string }[],
  frameAnalysis?: any
): FrameExpansionResult {
  // Create a default frame if none provided
  const frame: SemanticFrame = frameAnalysis ? parseFrameAnalysis({ frame_analysis: frameAnalysis }) || createDefaultFrame(sourceTopic) : createDefaultFrame(sourceTopic);

  const generatedTopics = processFrameSubtopics(rawSubtopics, sourceTopic, frame);
  const bridgedEavs = bridgeFrameToEAV(frame, sourceTopic);

  return {
    source_topic: sourceTopic,
    frame_analysis: frame,
    generated_topics: generatedTopics,
    bridged_eavs: bridgedEavs,
  };
}

/**
 * Create a default frame for a topic when AI doesn't return frame analysis
 */
function createDefaultFrame(topic: EnrichedTopic): SemanticFrame {
  return {
    frame_name: `${topic.title} Frame`,
    frame_description: `Scene/situation related to ${topic.title}`,
    actions: [{
      verb: 'perform',
      agent: topic.title,
      patient: undefined,
      instrument: undefined,
      result: undefined,
    }],
    core_elements: [{
      role: 'agent',
      entity: topic.title,
      semantic_type: 'Topic',
      is_core: true,
    }],
    peripheral_elements: [],
    scene_setting: {
      environment: 'General context',
      temporal_context: 'Ongoing',
      social_context: undefined,
      physical_context: undefined,
    },
    related_frames: [],
  };
}

/**
 * Bridge frame elements to EAV triples
 */
export function bridgeFrameToEAV(
  frame: SemanticFrame,
  sourceTopic: EnrichedTopic
): SemanticTriple[] {
  const eavs: SemanticTriple[] = [];
  const entityName = sourceTopic.title;

  // Actions -> Process EAVs
  for (const action of frame.actions) {
    eavs.push({
      subject: { label: entityName, type: 'Topic' },
      predicate: {
        relation: 'involves',
        type: 'Process',
        category: 'RARE',
        classification: 'PROCESS',
      },
      object: {
        value: action.verb,
        type: 'Action',
      },
    });

    if (action.agent) {
      eavs.push({
        subject: { label: entityName, type: 'Topic' },
        predicate: {
          relation: 'hasAgent',
          type: 'FrameRole',
          category: 'COMMON',
          classification: 'COMPONENT',
        },
        object: {
          value: action.agent,
          type: 'Agent',
        },
      });
    }

    if (action.instrument) {
      eavs.push({
        subject: { label: entityName, type: 'Topic' },
        predicate: {
          relation: 'usesInstrument',
          type: 'FrameRole',
          category: 'RARE',
          classification: 'COMPONENT',
        },
        object: {
          value: action.instrument,
          type: 'Instrument',
        },
      });
    }

    if (action.result) {
      eavs.push({
        subject: { label: entityName, type: 'Topic' },
        predicate: {
          relation: 'hasResult',
          type: 'FrameRole',
          category: 'UNIQUE',
          classification: 'BENEFIT',
        },
        object: {
          value: action.result,
          type: 'Result',
        },
      });
    }
  }

  // Core elements -> Component EAVs
  for (const element of frame.core_elements) {
    eavs.push({
      subject: { label: entityName, type: 'Topic' },
      predicate: {
        relation: `has${capitalize(element.role)}`,
        type: 'FrameElement',
        category: element.is_core ? 'ROOT' : 'COMMON',
        classification: mapRoleToClassification(element.role),
      },
      object: {
        value: element.entity,
        type: element.semantic_type,
      },
    });
  }

  // Scene setting -> Specification EAVs
  const setting = frame.scene_setting;
  if (setting.environment) {
    eavs.push({
      subject: { label: entityName, type: 'Topic' },
      predicate: {
        relation: 'occurrsIn',
        type: 'FrameSetting',
        category: 'COMMON',
        classification: 'SPECIFICATION',
      },
      object: {
        value: setting.environment,
        type: 'Environment',
      },
    });
  }

  if (setting.temporal_context) {
    eavs.push({
      subject: { label: entityName, type: 'Topic' },
      predicate: {
        relation: 'occursDuring',
        type: 'FrameSetting',
        category: 'COMMON',
        classification: 'SPECIFICATION',
      },
      object: {
        value: setting.temporal_context,
        type: 'TemporalContext',
      },
    });
  }

  return eavs;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function sanitizeActions(actions: any[]): FrameAction[] {
  if (!Array.isArray(actions)) return [];
  return actions.map(a => ({
    verb: a.verb || '',
    agent: a.agent || '',
    patient: a.patient || undefined,
    instrument: a.instrument || undefined,
    result: a.result || undefined,
  })).filter(a => a.verb);
}

function sanitizeElements(elements: any[], isCore: boolean): FrameElement[] {
  if (!Array.isArray(elements)) return [];
  return elements.map(e => ({
    role: validateRole(e.role),
    entity: e.entity || '',
    semantic_type: e.semantic_type || 'Thing',
    is_core: isCore,
  })).filter(e => e.entity);
}

function sanitizeSceneSetting(setting: any): SceneSetting {
  return {
    environment: setting?.environment || '',
    temporal_context: setting?.temporal_context || '',
    social_context: setting?.social_context || undefined,
    physical_context: setting?.physical_context || undefined,
  };
}

function validateRole(role: string): FrameElement['role'] {
  const validRoles = ['agent', 'patient', 'instrument', 'location', 'time', 'manner', 'cause', 'result', 'beneficiary', 'experiencer'];
  return validRoles.includes(role?.toLowerCase()) ? role.toLowerCase() as FrameElement['role'] : 'agent';
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapRoleToClassification(role: string): 'TYPE' | 'COMPONENT' | 'BENEFIT' | 'RISK' | 'PROCESS' | 'SPECIFICATION' {
  const mapping: Record<string, 'TYPE' | 'COMPONENT' | 'BENEFIT' | 'RISK' | 'PROCESS' | 'SPECIFICATION'> = {
    agent: 'COMPONENT',
    patient: 'COMPONENT',
    instrument: 'COMPONENT',
    location: 'SPECIFICATION',
    time: 'SPECIFICATION',
    manner: 'PROCESS',
    cause: 'PROCESS',
    result: 'BENEFIT',
    beneficiary: 'BENEFIT',
    experiencer: 'COMPONENT',
  };
  return mapping[role.toLowerCase()] || 'COMPONENT';
}

/**
 * Check if a topic is a good candidate for Frame expansion
 * (low keyword data, abstract concept, process-oriented)
 */
export function isFrameExpansionCandidate(topic: EnrichedTopic): boolean {
  // Topics without search volume data are good candidates
  const hasLowSearchData = !topic.canonical_query && (!topic.query_network || topic.query_network.length === 0);

  // Process-oriented topics (verbs in title) are good candidates
  const processIndicators = ['how to', 'process', 'method', 'procedure', 'workflow', 'steps', 'guide'];
  const isProcessOriented = processIndicators.some(indicator =>
    topic.title.toLowerCase().includes(indicator)
  );

  // Abstract concepts without clear attributes
  const abstractIndicators = ['management', 'strategy', 'optimization', 'development', 'implementation'];
  const isAbstract = abstractIndicators.some(indicator =>
    topic.title.toLowerCase().includes(indicator)
  );

  return hasLowSearchData || isProcessOriented || isAbstract;
}
