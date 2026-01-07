/**
 * Priority Tier Assignment
 *
 * Assigns topics to priority tiers:
 * - Tier 1 (Core): Essential, high-intent, competitor must-haves
 * - Tier 2 (Supporting): Authority builders, semantic bridges
 * - Tier 3 (Extended): Long-tail, differentiation plays
 */

import type { EnrichedTopic, TopicalMap, SEOPillars } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

export type TierId = 'core' | 'supporting' | 'extended';

export interface PriorityTier {
  id: TierId;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
  whyImportant: string[];
  effort: string;
  impact: 'high' | 'medium-high' | 'medium' | 'low';
  impactBars: number; // 1-5 for visual display
}

export interface TierAssignment {
  topicId: string;
  tierId: TierId;
  reason: string;
}

export interface TierSummary {
  tier: PriorityTier;
  topics: EnrichedTopic[];
  briefsReady: number;
  briefsTotal: number;
  progressPercent: number;
  status: 'not-started' | 'in-progress' | 'almost-done' | 'complete';
  statusEmoji: string;
  statusLabel: string;
}

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

export const PRIORITY_TIERS: Record<TierId, PriorityTier> = {
  core: {
    id: 'core',
    name: 'THE ESSENTIALS',
    emoji: '🔴',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    description: "Start here. Seriously. These pages = foundation.",
    whyImportant: [
      'Directly tied to revenue',
      'Highest search intent alignment',
      'Your competitors ALL have these'
    ],
    effort: '2-3 weeks',
    impact: 'high',
    impactBars: 5
  },
  supporting: {
    id: 'supporting',
    name: 'THE AUTHORITY BUILDERS',
    emoji: '🟡',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    description: "These make Google trust your Tier 1 content.",
    whyImportant: [
      'Build semantic context around your core',
      'Answer related questions users have',
      'Create internal linking opportunities'
    ],
    effort: '6-8 weeks',
    impact: 'medium-high',
    impactBars: 4
  },
  extended: {
    id: 'extended',
    name: 'THE DOMINANCE PLAYS',
    emoji: '🟢',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    description: "For when you want to OWN the conversation.",
    whyImportant: [
      'Long-tail opportunities',
      'Competitive differentiation',
      'Complete semantic coverage'
    ],
    effort: '4-6 weeks',
    impact: 'medium',
    impactBars: 3
  }
};

// ============================================================================
// TIER ASSIGNMENT LOGIC
// ============================================================================

/**
 * Get tier configuration by ID
 */
export function getTierConfig(tierId: TierId): PriorityTier {
  return PRIORITY_TIERS[tierId];
}

/**
 * Check if a topic is high-intent (commercial/transactional)
 */
function isHighIntentTopic(topic: EnrichedTopic): boolean {
  const intent = topic.search_intent?.toLowerCase() || '';
  return (
    intent === 'commercial' ||
    intent === 'commercial_investigation' ||
    intent === 'transactional'
  );
}

/**
 * Check if a topic is a direct service/product topic
 */
function isDirectServiceTopic(topic: EnrichedTopic, businessInfo: any): boolean {
  const services = businessInfo?.services || [];
  const products = businessInfo?.products || [];
  const offerings = [...services, ...products].map((s: string) => s.toLowerCase());

  const titleLower = topic.title.toLowerCase();
  return offerings.some((offering: string) => titleLower.includes(offering));
}

/**
 * Check if topic title suggests long-tail (4+ words)
 */
function isLongTailTopic(topic: EnrichedTopic): boolean {
  const words = topic.title.trim().split(/\s+/);
  return words.length >= 4;
}

/**
 * Check if topic is E-E-A-T related
 */
function isEEATTopic(topic: EnrichedTopic): boolean {
  const eeatKeywords = [
    'about', 'team', 'expert', 'certified', 'experience',
    'case study', 'testimonial', 'review', 'award', 'credential',
    'methodology', 'process', 'approach', 'philosophy',
    'who we are', 'our story', 'our team'
  ];
  const titleLower = topic.title.toLowerCase();
  return eeatKeywords.some(kw => titleLower.includes(kw));
}

/**
 * Assign topics to priority tiers
 */
export function assignTopicTiers(
  topics: EnrichedTopic[],
  map: TopicalMap,
  competitorTopics: Set<string> = new Set()
): Map<string, TierAssignment> {
  const assignments = new Map<string, TierAssignment>();
  const businessInfo = map.business_info || {};

  topics.forEach(topic => {
    let tierId: TierId;
    let reason: string;

    // TIER 1 (Core): High-value, must-have topics
    // EnrichedTopic uses 'type' not 'topic_type'
    if (topic.type === 'core') {
      tierId = 'core';
      reason = 'Core topic for your pillar';
    } else if (isHighIntentTopic(topic)) {
      tierId = 'core';
      reason = 'High buyer intent (commercial/transactional)';
    } else if (isDirectServiceTopic(topic, businessInfo)) {
      tierId = 'core';
      reason = 'Directly related to your services/products';
    } else if (isEEATTopic(topic)) {
      tierId = 'core';
      reason = 'Establishes E-E-A-T credibility';
    }
    // TIER 3 (Extended): Long-tail and differentiation
    else if (isLongTailTopic(topic)) {
      tierId = 'extended';
      reason = 'Long-tail opportunity';
    } else if (competitorTopics.size > 0 && !competitorTopics.has(topic.title.toLowerCase())) {
      tierId = 'extended';
      reason = 'Differentiation opportunity (competitors don\'t cover this)';
    }
    // TIER 2 (Supporting): Everything else
    else {
      tierId = 'supporting';
      reason = 'Builds semantic context and authority';
    }

    assignments.set(topic.id, { topicId: topic.id, tierId, reason });
  });

  return assignments;
}

/**
 * Get tier summary with progress info
 */
export function getTierSummary(
  tierId: TierId,
  topics: EnrichedTopic[],
  briefsMap: Map<string, boolean> // topicId -> hasCompleteBrief
): TierSummary {
  const tier = PRIORITY_TIERS[tierId];

  const briefsReady = topics.filter(t => briefsMap.get(t.id)).length;
  const briefsTotal = topics.length;
  const progressPercent = briefsTotal > 0
    ? Math.round((briefsReady / briefsTotal) * 100)
    : 0;

  let status: TierSummary['status'];
  let statusEmoji: string;
  let statusLabel: string;

  if (progressPercent === 0) {
    status = 'not-started';
    statusEmoji = '🌱';
    statusLabel = 'Not started';
  } else if (progressPercent < 50) {
    status = 'in-progress';
    statusEmoji = '💪';
    statusLabel = 'In progress';
  } else if (progressPercent < 100) {
    status = 'almost-done';
    statusEmoji = '🔥';
    statusLabel = 'Almost there!';
  } else {
    status = 'complete';
    statusEmoji = '✅';
    statusLabel = 'Complete!';
  }

  return {
    tier,
    topics,
    briefsReady,
    briefsTotal,
    progressPercent,
    status,
    statusEmoji,
    statusLabel
  };
}

/**
 * Get all tier summaries for a map
 */
export function getAllTierSummaries(
  topics: EnrichedTopic[],
  tierAssignments: Map<string, TierAssignment>,
  briefsMap: Map<string, boolean>
): TierSummary[] {
  const tierTopics: Record<TierId, EnrichedTopic[]> = {
    core: [],
    supporting: [],
    extended: []
  };

  // Group topics by tier
  topics.forEach(topic => {
    const assignment = tierAssignments.get(topic.id);
    if (assignment) {
      tierTopics[assignment.tierId].push(topic);
    }
  });

  // Create summaries in order
  return [
    getTierSummary('core', tierTopics.core, briefsMap),
    getTierSummary('supporting', tierTopics.supporting, briefsMap),
    getTierSummary('extended', tierTopics.extended, briefsMap)
  ];
}

/**
 * Get pro tip message based on tier progress
 */
export function getTierProTip(summaries: TierSummary[]): string {
  const coreSummary = summaries.find(s => s.tier.id === 'core');
  const supportingSummary = summaries.find(s => s.tier.id === 'supporting');
  const totalTopics = summaries.reduce((sum, s) => sum + s.topics.length, 0);

  if (!coreSummary || coreSummary.topics.length === 0) {
    return "Your topics haven't been tiered yet. Generate briefs to see your priority breakdown.";
  }

  if (coreSummary.status === 'not-started') {
    return `Don't try to do all ${totalTopics} at once. Start with Tier 1, nail it, then expand. ${coreSummary.topics.length} great pages beat ${totalTopics} mediocre ones every time.`;
  }

  if (coreSummary.status === 'complete' && supportingSummary?.status === 'not-started') {
    return "Tier 1 complete! Your foundation is solid. Now Tier 2 will amplify everything you've built.";
  }

  if (supportingSummary?.progressPercent && supportingSummary.progressPercent >= 50) {
    return "Halfway through Tier 2. Your semantic authority is growing with every piece.";
  }

  const allComplete = summaries.every(s => s.status === 'complete');
  if (allComplete) {
    return "All tiers complete. You're not just competing anymore — you're dominating the semantic space.";
  }

  return `Focus on completing Tier 1 first (${coreSummary.progressPercent}% done). Foundation before expansion.`;
}
