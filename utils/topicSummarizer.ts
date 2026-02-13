// utils/topicSummarizer.ts
// Compresses topic data for AI prompts to prevent token overflow on large maps

import { EnrichedTopic } from '../types';
import { SERVICE_REGISTRY } from '../config/serviceRegistry';

interface FullTopicSummary {
  title: string;
  type: string;
  topic_class: string;
  parent: string | null;
  description: string;
}

interface CompactTopicSummary {
  title: string;
  parentTitle: string | null;
  topic_class: string;
}

/**
 * Summarize topics for inclusion in AI prompts. When topic count exceeds
 * maxFull, core topics get full detail while outer topics are compressed
 * to title/parent/class only, with a truncation note appended.
 */
export function summarizeTopicsForPrompt(
  topics: EnrichedTopic[],
  maxFull: number = SERVICE_REGISTRY.limits.topicMap.promptFullMax
): string {
  if (topics.length <= maxFull) {
    // Under threshold: full detail for all
    const coreTopics = topics.filter(t => t.type === 'core');
    return JSON.stringify(topics.map(t => ({
      title: t.title,
      type: t.type,
      topic_class: t.topic_class || 'unknown',
      parent: coreTopics.find(c => c.id === t.parent_topic_id)?.title || null,
      description: t.description
    } satisfies FullTopicSummary)), null, 2);
  }

  // Over threshold: full detail for cores, compact for outers
  const coreTopics = topics.filter(t => t.type === 'core');
  const outerTopics = topics.filter(t => t.type !== 'core');

  const fullCores = coreTopics.map(t => ({
    title: t.title,
    type: t.type,
    topic_class: t.topic_class || 'unknown',
    parent: null,
    description: t.description
  } satisfies FullTopicSummary));

  const compactOuters = outerTopics.map(t => ({
    title: t.title,
    parentTitle: coreTopics.find(c => c.id === t.parent_topic_id)?.title || null,
    topic_class: t.topic_class || 'unknown'
  } satisfies CompactTopicSummary));

  return JSON.stringify({
    coreTopics: fullCores,
    outerTopics: compactOuters
  }, null, 2) + `\n\nNote: ${outerTopics.length} outer topics summarized to conserve tokens. Full descriptions omitted.`;
}

/**
 * Cap a pre-calculated pairs array to a maximum sample size.
 * Preserves highest-similarity pairs (most likely to be actionable).
 */
export function samplePairsForPrompt<T extends { similarity: number }>(
  pairs: T[],
  maxPairs: number = SERVICE_REGISTRY.limits.topicMap.promptPairSampleMax
): { pairs: T[]; wasTruncated: boolean; totalPairs: number } {
  if (pairs.length <= maxPairs) {
    return { pairs, wasTruncated: false, totalPairs: pairs.length };
  }

  // Sort by similarity descending and take top N
  const sorted = [...pairs].sort((a, b) => b.similarity - a.similarity);
  return {
    pairs: sorted.slice(0, maxPairs),
    wasTruncated: true,
    totalPairs: pairs.length
  };
}

/**
 * Cap a topic ID list for merge opportunity prompts.
 * Returns first N topics (preserving hierarchy order).
 */
export function capTopicsForMerge(
  topics: EnrichedTopic[],
  maxTopics: number = 300
): { topics: { id: string; title: string }[]; wasTruncated: boolean; totalTopics: number } {
  const mapped = topics.map(t => ({ id: t.id, title: t.title }));
  if (mapped.length <= maxTopics) {
    return { topics: mapped, wasTruncated: false, totalTopics: mapped.length };
  }

  return {
    topics: mapped.slice(0, maxTopics),
    wasTruncated: true,
    totalTopics: mapped.length
  };
}
