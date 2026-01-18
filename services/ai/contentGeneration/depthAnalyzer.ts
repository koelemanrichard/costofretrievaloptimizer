/**
 * Depth Analyzer Module
 *
 * Analyzes competitor data and context to suggest optimal content depth.
 * Provides AI-driven recommendations with user override capability.
 *
 * Key features:
 * - Analyzes competitor word counts to benchmark content length
 * - Considers SERP difficulty, topic type, and topical authority
 * - Recommends depth mode: high-quality, moderate, or quick-publish
 * - Allows user to override with preset or custom settings
 *
 * Created: 2026-01-18 - Content Template Routing implementation (Task 4)
 *
 * @module services/ai/contentGeneration/depthAnalyzer
 */

import {
  DepthAnalyzerInput,
  DepthSuggestion,
  DepthMode,
} from '../../../types/contentTemplates';

// ============================================================================
// DEPTH PRESETS
// ============================================================================

/**
 * Predefined settings for each depth mode
 */
export const DEPTH_PRESETS: Record<DepthMode, {
  maxSections: number;
  minSections: number;
  targetWordCount: { min: number; max: number };
  sectionDepth: 'comprehensive' | 'moderate' | 'brief';
  avgWordsPerSection: number;
}> = {
  'high-quality': {
    maxSections: 12,
    minSections: 8,
    targetWordCount: { min: 2000, max: 4000 },
    sectionDepth: 'comprehensive',
    avgWordsPerSection: 300,
  },
  'moderate': {
    maxSections: 7,
    minSections: 5,
    targetWordCount: { min: 1200, max: 2000 },
    sectionDepth: 'moderate',
    avgWordsPerSection: 200,
  },
  'quick-publish': {
    maxSections: 5,
    minSections: 3,
    targetWordCount: { min: 600, max: 1200 },
    sectionDepth: 'brief',
    avgWordsPerSection: 150,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate average of an array of numbers
 */
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  return Math.round(sum / numbers.length);
}

/**
 * Estimate number of sections from word count
 */
function estimateSections(wordCount: number): number {
  // Assume average section is ~200 words
  return Math.max(3, Math.round(wordCount / 200));
}

/**
 * Calculate competitor benchmarks from word counts
 */
function calculateCompetitorBenchmark(wordCounts: number[]): {
  avgWordCount: number;
  avgSections: number;
  topPerformerWordCount: number;
} {
  if (wordCounts.length === 0) {
    return {
      avgWordCount: 1500,
      avgSections: 6,
      topPerformerWordCount: 2000,
    };
  }

  const avgWordCount = calculateAverage(wordCounts);
  const topPerformerWordCount = Math.max(...wordCounts);
  const avgSections = estimateSections(avgWordCount);

  return {
    avgWordCount,
    avgSections,
    topPerformerWordCount,
  };
}

// ============================================================================
// SIGNAL ANALYSIS
// ============================================================================

/**
 * Scoring weights for different signals
 */
const SIGNAL_WEIGHTS = {
  competitorWordCount: 0.35,
  serpDifficulty: 0.25,
  topicType: 0.20,
  topicalAuthority: 0.15,
  queryIntent: 0.05,
};

/**
 * Calculate depth score from input signals
 * Higher score = more depth needed (high-quality)
 * Lower score = less depth needed (quick-publish)
 * Returns a score from 0-100
 */
function calculateDepthScore(input: DepthAnalyzerInput): {
  score: number;
  signals: Record<string, { value: number; reasoning: string }>;
} {
  const signals: Record<string, { value: number; reasoning: string }> = {};

  // 1. Competitor word count signal (0-100)
  const avgWordCount = calculateAverage(input.competitorWordCounts);
  let wordCountScore: number;
  let wordCountReasoning: string;

  if (avgWordCount >= 2000) {
    wordCountScore = 90;
    wordCountReasoning = `Competitors average ${avgWordCount} words - comprehensive content required`;
  } else if (avgWordCount >= 1200) {
    wordCountScore = 60;
    wordCountReasoning = `Competitors average ${avgWordCount} words - moderate depth expected`;
  } else {
    wordCountScore = 30;
    wordCountReasoning = `Competitors average ${avgWordCount} words - shorter content may suffice`;
  }
  signals.competitorWordCount = { value: wordCountScore, reasoning: wordCountReasoning };

  // 2. SERP difficulty signal (0-100)
  let difficultyScore: number;
  let difficultyReasoning: string;

  switch (input.serpDifficulty) {
    case 'high':
      difficultyScore = 90;
      difficultyReasoning = 'High SERP difficulty demands thorough, authoritative content';
      break;
    case 'medium':
      difficultyScore = 55;
      difficultyReasoning = 'Medium SERP difficulty suggests balanced content depth';
      break;
    case 'low':
      difficultyScore = 25;
      difficultyReasoning = 'Low SERP difficulty allows for quicker content production';
      break;
  }
  signals.serpDifficulty = { value: difficultyScore, reasoning: difficultyReasoning };

  // 3. Topic type signal (0-100)
  let topicTypeScore: number;
  let topicTypeReasoning: string;

  switch (input.topicType) {
    case 'core':
      topicTypeScore = 95;
      topicTypeReasoning = 'Core/pillar topics require comprehensive coverage for topical authority';
      break;
    case 'outer':
      topicTypeScore = 50;
      topicTypeReasoning = 'Outer topics benefit from moderate depth to support core content';
      break;
    case 'child':
      topicTypeScore = 30;
      topicTypeReasoning = 'Child topics can be more focused and concise';
      break;
  }
  signals.topicType = { value: topicTypeScore, reasoning: topicTypeReasoning };

  // 4. Topical authority signal (0-100) - inverse relationship
  // High authority = can publish quicker, low authority = need more depth
  const authorityScore = 100 - input.existingTopicalAuthority;
  let authorityReasoning: string;

  if (input.existingTopicalAuthority >= 70) {
    authorityReasoning = 'High existing topical authority allows for efficient content production';
  } else if (input.existingTopicalAuthority >= 40) {
    authorityReasoning = 'Moderate topical authority suggests standard content depth';
  } else {
    authorityReasoning = 'Low topical authority requires comprehensive content to build credibility';
  }
  signals.topicalAuthority = { value: authorityScore, reasoning: authorityReasoning };

  // 5. Query intent signal (0-100)
  let intentScore: number;
  let intentReasoning: string;

  switch (input.queryIntent.toLowerCase()) {
    case 'informational':
      intentScore = 75;
      intentReasoning = 'Informational queries benefit from in-depth explanatory content';
      break;
    case 'commercial':
      intentScore = 65;
      intentReasoning = 'Commercial queries need comprehensive comparison and detail';
      break;
    case 'transactional':
      intentScore = 45;
      intentReasoning = 'Transactional queries can be more direct and action-focused';
      break;
    case 'navigational':
      intentScore = 25;
      intentReasoning = 'Navigational queries typically require concise, direct content';
      break;
    default:
      intentScore = 50;
      intentReasoning = 'Standard content depth for this query intent';
  }
  signals.queryIntent = { value: intentScore, reasoning: intentReasoning };

  // Calculate weighted score
  const score = Math.round(
    signals.competitorWordCount.value * SIGNAL_WEIGHTS.competitorWordCount +
    signals.serpDifficulty.value * SIGNAL_WEIGHTS.serpDifficulty +
    signals.topicType.value * SIGNAL_WEIGHTS.topicType +
    signals.topicalAuthority.value * SIGNAL_WEIGHTS.topicalAuthority +
    signals.queryIntent.value * SIGNAL_WEIGHTS.queryIntent
  );

  return { score, signals };
}

/**
 * Determine depth mode from score
 */
function scoreToDepthMode(score: number): DepthMode {
  if (score >= 70) return 'high-quality';
  if (score >= 45) return 'moderate';
  return 'quick-publish';
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Analyze input signals and suggest optimal content depth
 *
 * @param input - Depth analyzer input with competitor data and context
 * @returns DepthSuggestion with recommended mode, reasoning, and settings
 */
export function analyzeAndSuggestDepth(input: DepthAnalyzerInput): DepthSuggestion {
  // Calculate competitor benchmarks
  const competitorBenchmark = calculateCompetitorBenchmark(input.competitorWordCounts);

  // Calculate depth score and get signal analysis
  const { score, signals } = calculateDepthScore(input);

  // Determine recommended depth mode
  const recommended = scoreToDepthMode(score);

  // Get preset settings for recommended mode
  const preset = DEPTH_PRESETS[recommended];

  // Build reasoning from signals (top 3 most impactful)
  const reasoning: string[] = [];

  // Always include the most relevant signals
  const sortedSignals = Object.entries(signals)
    .sort((a, b) => {
      // Weight the signals by their impact on the final decision
      const aImpact = Math.abs(a[1].value - 50) * (SIGNAL_WEIGHTS[a[0] as keyof typeof SIGNAL_WEIGHTS] || 0.1);
      const bImpact = Math.abs(b[1].value - 50) * (SIGNAL_WEIGHTS[b[0] as keyof typeof SIGNAL_WEIGHTS] || 0.1);
      return bImpact - aImpact;
    })
    .slice(0, 4);

  for (const [, signal] of sortedSignals) {
    reasoning.push(signal.reasoning);
  }

  // Adjust settings based on competitor benchmark
  const settings = {
    maxSections: preset.maxSections,
    targetWordCount: { ...preset.targetWordCount },
    sectionDepth: preset.sectionDepth,
  };

  // If competitors have significantly higher word counts, adjust targets
  if (recommended === 'high-quality' && competitorBenchmark.avgWordCount > settings.targetWordCount.min) {
    settings.targetWordCount.min = Math.max(
      settings.targetWordCount.min,
      Math.round(competitorBenchmark.avgWordCount * 0.9)
    );
    settings.targetWordCount.max = Math.max(
      settings.targetWordCount.max,
      competitorBenchmark.topPerformerWordCount
    );
  }

  return {
    recommended,
    reasoning,
    competitorBenchmark,
    settings,
  };
}

/**
 * Custom settings that can be provided by the user
 */
export interface CustomDepthSettings {
  maxSections?: number;
  targetWordCount?: { min: number; max: number };
  sectionDepth?: 'comprehensive' | 'moderate' | 'brief';
}

/**
 * Apply user's depth choice to override the AI suggestion
 *
 * @param suggestion - Original AI suggestion
 * @param userChoice - User's selected depth mode or 'custom'
 * @param customSettings - Optional custom settings when userChoice is 'custom'
 * @returns Updated DepthSuggestion with user's preferences applied
 */
export function applyUserDepthChoice(
  suggestion: DepthSuggestion,
  userChoice: DepthMode | 'custom',
  customSettings?: CustomDepthSettings
): DepthSuggestion {
  // If custom, apply custom settings
  if (userChoice === 'custom' && customSettings) {
    const basePreset = DEPTH_PRESETS['moderate'];

    return {
      ...suggestion,
      recommended: 'moderate', // Custom is treated as moderate
      settings: {
        maxSections: customSettings.maxSections ?? suggestion.settings.maxSections,
        targetWordCount: customSettings.targetWordCount ?? suggestion.settings.targetWordCount,
        sectionDepth: customSettings.sectionDepth ?? basePreset.sectionDepth,
      },
      reasoning: [
        'User selected custom depth settings',
        ...suggestion.reasoning.slice(0, 2),
      ],
    };
  }

  // Apply preset for the chosen depth mode
  const preset = DEPTH_PRESETS[userChoice as DepthMode];

  return {
    ...suggestion,
    recommended: userChoice as DepthMode,
    settings: {
      maxSections: preset.maxSections,
      targetWordCount: { ...preset.targetWordCount },
      sectionDepth: preset.sectionDepth,
    },
    reasoning: [
      `User selected ${userChoice} depth mode`,
      ...suggestion.reasoning.slice(0, 2),
    ],
  };
}
