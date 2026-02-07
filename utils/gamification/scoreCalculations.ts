/**
 * Semantic Authority Score Calculations
 *
 * Calculates a comprehensive score (0-100) based on 5 weighted pillars:
 * - Entity Clarity (25%): How well-defined is the central entity?
 * - Topical Coverage (25%): Does the map cover the expected semantic space?
 * - Intent Alignment (20%): Do topics match actual search intents?
 * - Competitive Parity (15%): How do we compare to competitors?
 * - Content Readiness (15%): Are briefs complete and ready to publish?
 */

import type { TopicalMap, SemanticTriple, EnrichedTopic, ContentBrief, SEOPillars } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

// Auto-Fix Types for AI-powered improvement suggestions
export type AutoFixType =
  | 'add_unique_eavs'
  | 'add_root_eavs'
  | 'add_common_eavs'
  | 'expand_eavs'
  | 'add_value_props'
  | 'analyze_intents'
  | 'add_buyer_topics'
  | 'add_supporting_topics'
  | 'generate_briefs'
  | 'complete_briefs'
  | 'add_competitors'
  | null; // null = no auto-fix available

export interface ImprovementSuggestion {
  text: string;
  autoFixType: AutoFixType;
  priority?: number; // Lower = higher priority
}

export interface SubScore {
  score: number; // 0-100
  weight: number; // 0-1
  label: string; // Fun label like "Crystal clear"
  details: string[];
  improvements: ImprovementSuggestion[]; // Changed from string[] to ImprovementSuggestion[]
}

export interface SemanticAuthorityScore {
  overall: number; // 0-100
  breakdown: {
    entityClarity: SubScore;
    topicalCoverage: SubScore;
    intentAlignment: SubScore;
    competitiveParity: SubScore;
    contentReadiness: SubScore;
  };
  tier: ScoreTier;
  tierConfig: TierConfig;
  message: string;
  timestamp: Date;
}

export type ScoreTier =
  | 'just-starting'
  | 'building-momentum'
  | 'getting-serious'
  | 'looking-sharp'
  | 'almost-elite'
  | 'absolute-unit';

export interface TierConfig {
  range: [number, number];
  emoji: string;
  label: string;
  message: string;
  color: string;
  animation: string;
}

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

export const SCORE_TIERS: Record<ScoreTier, TierConfig> = {
  'just-starting': {
    range: [0, 30],
    emoji: '🌱',
    label: 'Just Getting Started',
    message: "Every expert was once a beginner. Let's build your foundation.",
    color: '#6B7280', // gray-500
    animation: 'gentle-pulse'
  },
  'building-momentum': {
    range: [31, 50],
    emoji: '🚀',
    label: 'Building Momentum',
    message: "You're picking up steam. The map is taking shape.",
    color: '#3B82F6', // blue-500
    animation: 'upward-sparkles'
  },
  'getting-serious': {
    range: [51, 70],
    emoji: '💪',
    label: 'Getting Serious',
    message: "Now we're talking. Your semantic foundation is solid.",
    color: '#8B5CF6', // purple-500
    animation: 'steady-glow'
  },
  'looking-sharp': {
    range: [71, 85],
    emoji: '🔥',
    label: 'Looking Sharp',
    message: "This is quality work. You're ahead of most.",
    color: '#F59E0B', // amber-500
    animation: 'fire-particles'
  },
  'almost-elite': {
    range: [86, 95],
    emoji: '⚡',
    label: 'Almost Elite',
    message: "So close to perfection. A few tweaks and you're there.",
    color: '#EF4444', // red-500
    animation: 'electric-crackle'
  },
  'absolute-unit': {
    range: [96, 100],
    emoji: '🏆',
    label: 'Absolute Unit',
    message: "This is elite-level SEO. No fluff, pure ranking potential.",
    color: '#10B981', // emerald-500
    animation: 'confetti-burst'
  }
};

// ============================================================================
// SUB-SCORE LABEL GENERATORS
// ============================================================================

export function getEntityClarityLabel(score: number): string {
  if (score >= 90) return "Crystal clear";
  if (score >= 70) return "Well-defined";
  if (score >= 50) return "Getting there";
  if (score >= 30) return "Needs focus";
  return "Undefined";
}

export function getTopicalCoverageLabel(score: number): string {
  if (score >= 90) return "Comprehensive";
  if (score >= 70) return "Strong foundation";
  if (score >= 50) return "Building up";
  if (score >= 30) return "Sparse";
  return "Empty";
}

export function getIntentAlignmentLabel(score: number): string {
  if (score >= 90) return "Laser-targeted";
  if (score >= 70) return "Well-aligned";
  if (score >= 50) return "Partially aligned";
  if (score >= 30) return "Needs work";
  return "Misaligned";
}

export function getCompetitiveParityLabel(score: number): string {
  if (score >= 90) return "Dominating";
  if (score >= 70) return "Competitive";
  if (score >= 50) return "Holding ground";
  if (score >= 30) return "Falling behind";
  return "Outmatched";
}

export function getContentReadinessLabel(score: number): string {
  if (score >= 90) return "Ready to publish";
  if (score >= 70) return "Almost there";
  if (score >= 50) return "In progress";
  if (score >= 30) return "Early stages";
  return "Not started";
}

// ============================================================================
// SCORE CALCULATIONS
// ============================================================================

/**
 * Calculate Entity Clarity Score (25% weight)
 * Measures how well-defined the central entity is
 */
export function calculateEntityClarity(map: TopicalMap): SubScore {
  let score = 0;
  const details: string[] = [];
  const improvements: ImprovementSuggestion[] = [];

  // Central entity defined (0-20 points)
  const businessInfo = map.business_info || {};
  const pillars = map.pillars as SEOPillars | undefined;

  // Check pillars for central entity (it's in SEOPillars, not BusinessInfo)
  if (pillars?.centralEntity) {
    score += 10;
    details.push('Central entity defined');
  } else {
    improvements.push({ text: 'Define your central entity', autoFixType: null, priority: 1 });
  }

  // Industry serves as a proxy for entity type
  if (businessInfo.industry) {
    score += 10;
    details.push('Industry specified');
  } else {
    improvements.push({ text: 'Specify industry for better entity clarity', autoFixType: null, priority: 2 });
  }

  // E-A-V completeness (0-40 points)
  const eavs = (map.eavs as SemanticTriple[]) || [];
  const eavCount = eavs.length;

  if (eavCount >= 50) {
    score += 40;
    details.push(`${eavCount} E-A-V triples (excellent depth)`);
  } else if (eavCount >= 30) {
    score += 30;
    details.push(`${eavCount} E-A-V triples (good coverage)`);
    improvements.push({ text: 'Add more E-A-Vs to reach 50+ for comprehensive coverage', autoFixType: 'expand_eavs', priority: 3 });
  } else if (eavCount >= 15) {
    score += 20;
    details.push(`${eavCount} E-A-V triples`);
    improvements.push({ text: 'Expand E-A-V triples to strengthen entity definition', autoFixType: 'expand_eavs', priority: 3 });
  } else if (eavCount >= 5) {
    score += 10;
    details.push(`${eavCount} E-A-V triples (basic)`);
    improvements.push({ text: 'Your entity needs more facts - aim for 30+ E-A-Vs', autoFixType: 'expand_eavs', priority: 3 });
  } else {
    improvements.push({ text: 'Add E-A-V triples to define your entity', autoFixType: 'expand_eavs', priority: 3 });
  }

  // E-A-V category distribution (0-20 points)
  // Support both nested (predicate.category) and flat (category) EAV structures
  const getEavCategory = (e: SemanticTriple): string | undefined =>
    e.predicate?.category || e.category;

  const hasUniqueEavs = eavs.some(e => getEavCategory(e) === 'UNIQUE');
  const hasRootEavs = eavs.some(e => getEavCategory(e) === 'ROOT');
  const hasCommonEavs = eavs.some(e => getEavCategory(e) === 'COMMON');

  if (hasUniqueEavs) {
    score += 8;
    details.push('Has UNIQUE differentiating facts');
  } else if (eavCount > 0) {
    improvements.push({ text: 'Add UNIQUE category E-A-Vs to differentiate', autoFixType: 'add_unique_eavs', priority: 2 });
  }

  if (hasRootEavs) {
    score += 7;
    details.push('Has ROOT foundational facts');
  }

  if (hasCommonEavs) {
    score += 5;
    details.push('Has COMMON industry facts');
  }

  // Business info completeness (0-20 points)
  if (businessInfo.domain) {
    score += 5;
    details.push('Domain specified');
  } else {
    improvements.push({ text: 'Add your domain', autoFixType: null, priority: 4 });
  }

  if (businessInfo.projectName) {
    score += 5;
    details.push('Project name set');
  }

  // audience is the field name in BusinessInfo
  if (businessInfo.audience) {
    score += 5;
    details.push('Target audience defined');
  } else {
    improvements.push({ text: 'Define your target audience', autoFixType: null, priority: 4 });
  }

  // uniqueDataAssets serves as USP indicator
  if (businessInfo.uniqueDataAssets) {
    score += 5;
    details.push('Unique data assets defined');
  } else {
    improvements.push({ text: 'Add unique data assets or selling points', autoFixType: 'add_value_props', priority: 3 });
  }

  const finalScore = Math.min(100, score);

  return {
    score: finalScore,
    weight: 0.25,
    label: getEntityClarityLabel(finalScore),
    details,
    improvements
  };
}

/**
 * Calculate Topical Coverage Score (25% weight)
 * Measures how well the map covers the semantic space
 */
export function calculateTopicalCoverage(map: TopicalMap): SubScore {
  let score = 0;
  const details: string[] = [];
  const improvements: ImprovementSuggestion[] = [];

  const topics = (map.topics || []) as EnrichedTopic[];
  const topicCount = topics.length;
  const pillars = map.pillars as SEOPillars | undefined;

  // SEOPillars is an object with centralEntity, sourceContext, centralSearchIntent
  // We consider pillars "defined" if centralEntity exists
  const hasPillars = !!pillars?.centralEntity;

  // Calculate expected topics (baseline 30, or more if pillars defined)
  const expectedTopics = hasPillars ? 40 : 30;

  // Topic count vs expected (0-50 points)
  const coverageRatio = topicCount / expectedTopics;
  const coveragePoints = Math.min(50, Math.round(coverageRatio * 50));
  score += coveragePoints;

  if (coverageRatio >= 1) {
    details.push(`${topicCount} topics (meets or exceeds expected ${expectedTopics})`);
  } else if (coverageRatio >= 0.7) {
    details.push(`${topicCount} topics (${Math.round(coverageRatio * 100)}% of expected)`);
    improvements.push({
      text: `Add ${expectedTopics - topicCount} more topics for full coverage`,
      autoFixType: 'add_supporting_topics',
      priority: 2
    });
  } else {
    details.push(`${topicCount} topics`);
    improvements.push({
      text: 'Expand topic coverage - your semantic space has gaps',
      autoFixType: 'add_supporting_topics',
      priority: 1
    });
  }

  // Pillar definition check (0-25 points)
  if (hasPillars) {
    score += 15;
    details.push(`Central entity: "${pillars!.centralEntity}"`);

    if (pillars?.sourceContext) {
      score += 5;
      details.push('Source context defined');
    } else {
      improvements.push({
        text: 'Define source context for better semantic framing',
        autoFixType: null,
        priority: 3
      });
    }

    if (pillars?.centralSearchIntent) {
      score += 5;
      details.push('Central search intent defined');
    } else {
      improvements.push({
        text: 'Define central search intent',
        autoFixType: null,
        priority: 3
      });
    }
  } else {
    improvements.push({
      text: 'Define SEO pillars (central entity, source context) to structure your content',
      autoFixType: null,
      priority: 1
    });
  }

  // Topic depth - has both core and outer topics (0-25 points)
  // EnrichedTopic uses 'type' not 'topic_type'
  const coreTopics = topics.filter(t => t.type === 'core').length;
  const outerTopics = topics.filter(t => t.type !== 'core').length;

  if (coreTopics > 0 && outerTopics > 0) {
    score += 15;
    details.push(`${coreTopics} core + ${outerTopics} supporting topics`);

    if (outerTopics >= coreTopics * 2) {
      score += 10;
      details.push('Good core-to-supporting ratio');
    } else {
      improvements.push({
        text: 'Add more supporting topics around your core topics',
        autoFixType: 'add_supporting_topics',
        priority: 2
      });
    }
  } else if (coreTopics > 0) {
    score += 5;
    details.push(`${coreTopics} core topics`);
    improvements.push({
      text: 'Add supporting/outer topics to build semantic depth',
      autoFixType: 'add_supporting_topics',
      priority: 2
    });
  } else if (outerTopics > 0) {
    score += 5;
    improvements.push({
      text: 'Define core topics for your pillars',
      autoFixType: null,
      priority: 1
    });
  }

  const finalScore = Math.min(100, score);

  return {
    score: finalScore,
    weight: 0.25,
    label: getTopicalCoverageLabel(finalScore),
    details,
    improvements
  };
}

/**
 * Calculate Intent Alignment Score (20% weight)
 * Measures how well topics align with search intents
 */
export function calculateIntentAlignment(map: TopicalMap): SubScore {
  let score = 0;
  const details: string[] = [];
  const improvements: ImprovementSuggestion[] = [];

  const topics = map.topics || [];

  if (topics.length === 0) {
    return {
      score: 0,
      weight: 0.20,
      label: getIntentAlignmentLabel(0),
      details: ['No topics to analyze'],
      improvements: [{ text: 'Generate topics first', autoFixType: null, priority: 1 }]
    };
  }

  // Count topics with defined search intent
  const topicsWithIntent = topics.filter(t => t.search_intent);
  const intentCoverage = topicsWithIntent.length / topics.length;

  // Intent coverage (0-40 points)
  const coveragePoints = Math.round(intentCoverage * 40);
  score += coveragePoints;

  if (intentCoverage >= 0.9) {
    details.push(`${topicsWithIntent.length}/${topics.length} topics have defined intent`);
  } else if (intentCoverage >= 0.5) {
    details.push(`${topicsWithIntent.length}/${topics.length} topics have defined intent`);
    improvements.push({
      text: 'Define search intent for remaining topics',
      autoFixType: 'analyze_intents',
      priority: 2
    });
  } else {
    improvements.push({
      text: 'Most topics lack search intent - analyze and assign intents',
      autoFixType: 'analyze_intents',
      priority: 1
    });
  }

  // Intent diversity (0-30 points)
  const intents = new Set(topicsWithIntent.map(t => t.search_intent));

  if (intents.has('informational')) {
    score += 10;
    details.push('Has informational intent topics');
  }
  if (intents.has('commercial') || intents.has('commercial_investigation')) {
    score += 10;
    details.push('Has commercial intent topics');
  }
  if (intents.has('transactional')) {
    score += 10;
    details.push('Has transactional intent topics');
  }

  if (intents.size < 3 && topicsWithIntent.length > 0) {
    improvements.push({
      text: 'Diversify search intents for broader coverage',
      autoFixType: 'add_buyer_topics',
      priority: 3
    });
  }

  // Buyer intent presence (0-30 points)
  const buyerIntentTopics = topics.filter(t =>
    t.search_intent === 'commercial' ||
    t.search_intent === 'commercial_investigation' ||
    t.search_intent === 'transactional'
  );
  const buyerRatio = buyerIntentTopics.length / topics.length;

  if (buyerRatio >= 0.3) {
    score += 30;
    details.push(`${buyerIntentTopics.length} topics target buyer intent (${Math.round(buyerRatio * 100)}%)`);
  } else if (buyerRatio >= 0.2) {
    score += 20;
    details.push(`${buyerIntentTopics.length} buyer intent topics`);
    improvements.push({
      text: 'Add more commercial/transactional topics for conversions',
      autoFixType: 'add_buyer_topics',
      priority: 2
    });
  } else if (buyerRatio >= 0.1) {
    score += 10;
    details.push(`${buyerIntentTopics.length} buyer intent topics (low)`);
    improvements.push({
      text: 'Your map lacks buyer intent topics - add commercial content',
      autoFixType: 'add_buyer_topics',
      priority: 2
    });
  } else {
    improvements.push({
      text: 'Add topics targeting buyers ready to convert',
      autoFixType: 'add_buyer_topics',
      priority: 1
    });
  }

  const finalScore = Math.min(100, score);

  return {
    score: finalScore,
    weight: 0.20,
    label: getIntentAlignmentLabel(finalScore),
    details,
    improvements
  };
}

/**
 * Calculate Competitive Parity Score (15% weight)
 * Measures coverage compared to competitors
 */
export function calculateCompetitiveParity(map: TopicalMap): SubScore {
  const details: string[] = [];
  const improvements: ImprovementSuggestion[] = [];

  const competitors = map.competitors || [];

  // If no competitors, return neutral score
  if (competitors.length === 0) {
    return {
      score: 50,
      weight: 0.15,
      label: 'Unknown',
      details: ['No competitors defined'],
      improvements: [{
        text: 'Add competitor URLs for gap analysis',
        autoFixType: 'add_competitors',
        priority: 1
      }]
    };
  }

  let score = 0;

  // Has competitors defined (0-20 points)
  const competitorPoints = Math.min(20, competitors.length * 7);
  score += competitorPoints;
  details.push(`Tracking ${competitors.length} competitor(s)`);

  if (competitors.length < 3) {
    improvements.push({
      text: 'Add more competitors for comprehensive analysis',
      autoFixType: 'add_competitors',
      priority: 2
    });
  }

  // Base competitive score — full integration depends on Query Network Audit results
  score += 30;
  details.push('Competitor analysis available');

  const finalScore = Math.min(100, score);

  return {
    score: finalScore,
    weight: 0.15,
    label: getCompetitiveParityLabel(finalScore),
    details,
    improvements
  };
}

/**
 * Calculate Content Readiness Score (15% weight)
 * Measures how ready the content is for publishing
 */
export function calculateContentReadiness(
  map: TopicalMap,
  briefs: ContentBrief[]
): SubScore {
  const details: string[] = [];
  const improvements: ImprovementSuggestion[] = [];

  const topics = map.topics || [];

  if (topics.length === 0) {
    return {
      score: 0,
      weight: 0.15,
      label: getContentReadinessLabel(0),
      details: ['No topics to create content for'],
      improvements: [{ text: 'Generate topics first', autoFixType: null, priority: 1 }]
    };
  }

  let score = 0;

  // Briefs generated (0-40 points)
  const briefsGenerated = briefs.length;
  const briefRatio = briefsGenerated / topics.length;
  const briefPoints = Math.round(briefRatio * 40);
  score += briefPoints;

  if (briefRatio >= 0.9) {
    details.push(`${briefsGenerated}/${topics.length} briefs generated`);
  } else if (briefRatio >= 0.5) {
    details.push(`${briefsGenerated}/${topics.length} briefs generated`);
    improvements.push({
      text: `Generate briefs for ${topics.length - briefsGenerated} remaining topics`,
      autoFixType: 'generate_briefs',
      priority: 2
    });
  } else {
    details.push(`${briefsGenerated} briefs generated`);
    improvements.push({
      text: 'Generate more content briefs',
      autoFixType: 'generate_briefs',
      priority: 1
    });
  }

  // Brief quality - has outline and meta (0-40 points)
  // ContentBrief uses metaDescription (camelCase) and structured_outline
  const completeBriefs = briefs.filter(b =>
    (b.structured_outline && b.structured_outline.length > 0) &&
    b.metaDescription &&
    b.title
  );
  const qualityRatio = completeBriefs.length / Math.max(1, briefs.length);
  const qualityPoints = Math.round(qualityRatio * 40);
  score += qualityPoints;

  if (qualityRatio >= 0.9) {
    details.push(`${completeBriefs.length} briefs are complete`);
  } else if (qualityRatio >= 0.5) {
    details.push(`${completeBriefs.length}/${briefs.length} briefs are complete`);
    improvements.push({
      text: 'Complete remaining briefs with outlines and meta',
      autoFixType: 'complete_briefs',
      priority: 2
    });
  } else if (briefs.length > 0) {
    improvements.push({
      text: 'Most briefs are incomplete - add outlines and meta descriptions',
      autoFixType: 'complete_briefs',
      priority: 1
    });
  }

  // Drafts created (0-20 points)
  // ContentBrief uses articleDraft (camelCase)
  const draftsCreated = briefs.filter(b =>
    b.articleDraft && b.articleDraft.length > 100
  ).length;
  const draftRatio = draftsCreated / Math.max(1, topics.length);
  const draftPoints = Math.round(draftRatio * 20);
  score += draftPoints;

  if (draftsCreated > 0) {
    details.push(`${draftsCreated} article drafts created`);
  }

  if (draftRatio < 0.5 && briefs.length > 0) {
    improvements.push({
      text: 'Create article drafts from your briefs',
      autoFixType: null, // Article drafts require the multi-pass generation flow
      priority: 3
    });
  }

  const finalScore = Math.min(100, score);

  return {
    score: finalScore,
    weight: 0.15,
    label: getContentReadinessLabel(finalScore),
    details,
    improvements
  };
}

// ============================================================================
// MAIN CALCULATION
// ============================================================================

/**
 * Get the tier for a given score
 */
export function getTierForScore(score: number): ScoreTier {
  if (score >= 96) return 'absolute-unit';
  if (score >= 86) return 'almost-elite';
  if (score >= 71) return 'looking-sharp';
  if (score >= 51) return 'getting-serious';
  if (score >= 31) return 'building-momentum';
  return 'just-starting';
}

/**
 * Calculate the complete Semantic Authority Score
 */
export function calculateSemanticAuthorityScore(
  map: TopicalMap,
  briefs: ContentBrief[] = []
): SemanticAuthorityScore {
  // Calculate all sub-scores
  const entityClarity = calculateEntityClarity(map);
  const topicalCoverage = calculateTopicalCoverage(map);
  const intentAlignment = calculateIntentAlignment(map);
  const competitiveParity = calculateCompetitiveParity(map);
  const contentReadiness = calculateContentReadiness(map, briefs);

  // Calculate weighted overall score
  const overall = Math.round(
    entityClarity.score * entityClarity.weight +
    topicalCoverage.score * topicalCoverage.weight +
    intentAlignment.score * intentAlignment.weight +
    competitiveParity.score * competitiveParity.weight +
    contentReadiness.score * contentReadiness.weight
  );

  // Get tier
  const tier = getTierForScore(overall);
  const tierConfig = SCORE_TIERS[tier];

  return {
    overall,
    breakdown: {
      entityClarity,
      topicalCoverage,
      intentAlignment,
      competitiveParity,
      contentReadiness
    },
    tier,
    tierConfig,
    message: tierConfig.message,
    timestamp: new Date()
  };
}

/**
 * Compare two scores and return the difference
 */
export function compareScores(
  oldScore: SemanticAuthorityScore,
  newScore: SemanticAuthorityScore
): {
  overallChange: number;
  tierChanged: boolean;
  oldTier: ScoreTier;
  newTier: ScoreTier;
  improvements: string[];
  regressions: string[];
} {
  const overallChange = newScore.overall - oldScore.overall;
  const tierChanged = newScore.tier !== oldScore.tier;

  const improvements: string[] = [];
  const regressions: string[] = [];

  // Check each sub-score
  const categories = [
    'entityClarity',
    'topicalCoverage',
    'intentAlignment',
    'competitiveParity',
    'contentReadiness'
  ] as const;

  categories.forEach(cat => {
    const oldSub = oldScore.breakdown[cat];
    const newSub = newScore.breakdown[cat];
    const diff = newSub.score - oldSub.score;

    if (diff >= 5) {
      improvements.push(`${cat}: +${diff} points`);
    } else if (diff <= -5) {
      regressions.push(`${cat}: ${diff} points`);
    }
  });

  return {
    overallChange,
    tierChanged,
    oldTier: oldScore.tier,
    newTier: newScore.tier,
    improvements,
    regressions
  };
}
