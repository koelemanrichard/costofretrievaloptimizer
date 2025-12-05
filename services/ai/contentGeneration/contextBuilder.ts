// services/ai/contentGeneration/contextBuilder.ts
// Builds complete ContentGenerationContext from available data

import {
  BusinessInfo,
  ContentBrief,
  TopicalMap,
  EnrichedTopic,
  ContentGenerationContext,
  SEOPillars,
  SemanticTriple
} from '../../../types';

/**
 * Builds a complete ContentGenerationContext from available data
 * This is the SINGLE place where context is assembled for content generation
 */
export function buildContentGenerationContext(
  businessInfo: BusinessInfo,
  brief: ContentBrief,
  topic: EnrichedTopic,
  topicalMap: TopicalMap
): ContentGenerationContext {
  // Extract pillars with fallbacks
  const pillars = topicalMap.pillars || {
    centralEntity: businessInfo.seedKeyword || '',
    sourceContext: businessInfo.valueProp || '',
    centralSearchIntent: `${businessInfo.seedKeyword || ''} ${topic.title}`,
  };

  // Get EAVs from topical map
  const eavs: SemanticTriple[] = topicalMap.eavs || [];

  // Get related topics for linking context
  const allTopics = topicalMap.topics || [];
  const relatedTopics = allTopics
    .filter(t => t.id !== topic.id)
    .slice(0, 20)
    .map(t => ({
      id: t.id,
      title: t.title,
      type: t.type || 'outer',
    }));

  return {
    pillars: {
      centralEntity: pillars.centralEntity || '',
      sourceContext: pillars.sourceContext || '',
      centralSearchIntent: pillars.centralSearchIntent || '',
      primaryVerb: pillars.primary_verb,
      auxiliaryVerb: pillars.auxiliary_verb,
    },
    eavs,
    businessInfo,
    brief,
    topic: {
      id: topic.id,
      title: topic.title,
      type: (topic.type as 'core' | 'outer') || 'outer',
      parentTopicId: topic.parent_topic_id,
      topicClass: topic.topic_class as 'monetization' | 'informational' | undefined,
    },
    topicalMap: {
      id: topicalMap.id,
      name: topicalMap.name,
      totalTopics: allTopics.length,
      relatedTopics,
    },
    knowledgeGraphTerms: extractKnowledgeTerms(eavs),
  };
}

/**
 * Extract key terms from EAVs for semantic grounding
 */
function extractKnowledgeTerms(eavs: SemanticTriple[]): string[] {
  const terms = new Set<string>();

  eavs.forEach(eav => {
    if (eav.subject?.label) terms.add(eav.subject.label);
    if (eav.object?.value && typeof eav.object.value === 'string') {
      terms.add(eav.object.value);
    }
  });

  return Array.from(terms).slice(0, 30);
}

/**
 * Create a summary of the context for prompts
 * This is a helper for embedding context into AI prompts
 */
export function contextToPromptString(ctx: ContentGenerationContext): string {
  return `
## Strategic Context (3 Pillars)
- Central Entity: ${ctx.pillars.centralEntity}
- Source Context: ${ctx.pillars.sourceContext}
- Central Search Intent: ${ctx.pillars.centralSearchIntent}
${ctx.pillars.primaryVerb ? `- Primary Verb: ${ctx.pillars.primaryVerb}` : ''}
${ctx.pillars.auxiliaryVerb ? `- Auxiliary Verb: ${ctx.pillars.auxiliaryVerb}` : ''}

## Topic Context
- Topic: ${ctx.topic.title} (${ctx.topic.type} topic)
- Section: ${ctx.topic.topicClass === 'monetization' ? 'Core Section (Monetization)' : 'Author Section (Informational)'}
- Topical Map: ${ctx.topicalMap.name} (${ctx.topicalMap.totalTopics} total topics)

## Business Context
- Domain: ${ctx.businessInfo.domain || 'N/A'}
- Industry: ${ctx.businessInfo.industry || 'N/A'}
- Target Audience: ${ctx.businessInfo.audience || 'N/A'}
- Value Proposition: ${ctx.businessInfo.valueProp || 'N/A'}
- Language: ${ctx.businessInfo.language || 'English'}
- Target Market: ${ctx.businessInfo.targetMarket || 'Global'}

## Semantic Foundation (Key EAV Terms)
${ctx.knowledgeGraphTerms?.slice(0, 15).join(', ') || 'No EAV data available'}

## Related Topics (for Internal Linking)
${ctx.topicalMap.relatedTopics.slice(0, 10).map(t => `- ${t.title}`).join('\n')}
`.trim();
}

/**
 * Minimal context for fallback cases where full topicalMap is not available
 */
export function buildMinimalContext(
  businessInfo: BusinessInfo,
  brief: ContentBrief,
  topic: EnrichedTopic
): ContentGenerationContext {
  return {
    pillars: {
      centralEntity: businessInfo.seedKeyword || brief.targetKeyword || brief.title,
      sourceContext: businessInfo.valueProp || '',
      centralSearchIntent: brief.searchIntent || 'informational',
    },
    eavs: [],
    businessInfo,
    brief,
    topic: {
      id: topic.id,
      title: topic.title,
      type: (topic.type as 'core' | 'outer') || 'outer',
      parentTopicId: topic.parent_topic_id,
      topicClass: topic.topic_class as 'monetization' | 'informational' | undefined,
    },
    topicalMap: {
      id: '',
      name: '',
      totalTopics: 0,
      relatedTopics: [],
    },
    knowledgeGraphTerms: [],
  };
}
