/**
 * Action Plan Service
 *
 * Provides AI-powered topic action type suggestion, rationale generation,
 * and strategic summary for the Content Briefs pipeline step.
 *
 * Created: 2026-02-25 - Content Briefs redesign
 *
 * @module services/ai/actionPlanService
 */

import type { EnrichedTopic, BusinessInfo, SEOPillars, SemanticTriple } from '../../types';
import type { ActionType } from '../../types/migration';
import type { ActionPlanEntry, ActionPriority, WaveDefinition, TopicConfig } from '../../types/actionPlan';
import { dispatchToProvider } from './providerDispatcher';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import {
  getLanguageAndRegionInstruction,
  businessContext,
  jsonResponseInstruction,
} from '../../config/prompts/_common';
import React from 'react';

// ============================================================================
// PURE LOGIC — suggestTopicConfig (no AI needed)
// ============================================================================

/**
 * Pre-fill TopicConfig based on topic characteristics.
 * Deterministic — used as initial defaults before user override.
 *
 * Uses a layered approach:
 * 1. Base defaults from topic type/class
 * 2. Metadata-based overrides from keyword difficulty, competitor word counts,
 *    search volume, and search intent (when available)
 */
export function suggestTopicConfig(topic: EnrichedTopic): TopicConfig {
  const meta = topic.metadata ?? {};

  // Extract metadata signals (safely typed)
  const keywordDifficulty = typeof meta.keyword_difficulty === 'number' ? meta.keyword_difficulty : undefined;
  const competitorAvgWordCount = typeof meta.competitor_avg_word_count === 'number'
    ? meta.competitor_avg_word_count
    : (typeof meta.word_count === 'number' ? meta.word_count : undefined);
  const searchVolume = typeof meta.search_volume === 'number' ? meta.search_volume : undefined;
  const searchIntent = typeof meta.search_intent === 'string' ? meta.search_intent.toLowerCase() : undefined;

  // --- Layer 1: Base defaults from topic type/class ---
  let contentLength: TopicConfig['contentLength'] = 'standard';
  let contentLengthReason = 'Standard length based on topic type.';
  if (topic.topic_class === 'monetization' || topic.type === 'core') {
    contentLength = 'comprehensive';
    contentLengthReason = 'Core/monetization topic — comprehensive coverage for ranking and conversions.';
  } else if (topic.type === 'outer') {
    contentLength = 'short';
    contentLengthReason = 'Outer topic — flat informational content to support topical authority.';
  } else if (topic.type === 'child') {
    contentLength = 'minimal';
    contentLengthReason = 'Bridge topic — minimal content to complete semantic network.';
  }

  // --- Layer 2: Metadata-based overrides ---
  const reasonParts: string[] = [];

  // Search volume + monetization combo: always comprehensive
  if (searchVolume !== undefined && searchVolume > 1000 && topic.topic_class === 'monetization') {
    contentLength = 'comprehensive';
    reasonParts.push(`High search volume (${searchVolume}) with monetization intent — comprehensive coverage for maximum conversions.`);
  }

  // Very low search volume: can go minimal unless already comprehensive from monetization
  if (searchVolume !== undefined && searchVolume < 50 && contentLength !== 'comprehensive') {
    contentLength = 'minimal';
    reasonParts.push(`Low search volume (${searchVolume}) — minimal content to complete semantic network.`);
  }

  // Keyword difficulty overrides
  if (keywordDifficulty !== undefined && keywordDifficulty > 70) {
    contentLength = 'comprehensive';
    reasonParts.push(`High keyword difficulty (${keywordDifficulty}) — comprehensive coverage needed to compete.`);
  } else if (keywordDifficulty !== undefined && keywordDifficulty < 20 && contentLength !== 'comprehensive') {
    // Only downgrade if not already set to comprehensive by monetization/volume
    if (contentLength === 'standard') {
      contentLength = 'short';
    }
    reasonParts.push(`Low keyword difficulty (${keywordDifficulty}) — shorter content sufficient to rank.`);
  }

  // Competitor word count overrides
  if (competitorAvgWordCount !== undefined && competitorAvgWordCount > 2000) {
    contentLength = 'comprehensive';
    reasonParts.push(`Competitors average ${competitorAvgWordCount} words — comprehensive coverage to match or exceed.`);
  } else if (competitorAvgWordCount !== undefined && competitorAvgWordCount < 800 && contentLength !== 'comprehensive') {
    if (contentLength === 'standard') {
      contentLength = 'short';
    }
    reasonParts.push(`Competitors average only ${competitorAvgWordCount} words — shorter content is competitive.`);
  }

  // If metadata provided reasoning, use it; otherwise keep the base reason
  if (reasonParts.length > 0) {
    contentLengthReason = reasonParts.join(' ');
  }

  // --- Featured snippet format based on title/query patterns ---
  let featuredSnippetFormat: TopicConfig['featuredSnippetFormat'] = 'PARAGRAPH';
  const titleLower = (topic.title || '').toLowerCase();
  if (/\bvs\.?\b|\bversus\b|compared|comparison/i.test(titleLower)) {
    featuredSnippetFormat = 'TABLE';
  } else if (/\btypes\b|\bbest\b|\btop\s+\d/i.test(titleLower)) {
    featuredSnippetFormat = 'LIST';
  } else if (/\bhow\s+to\b|\bsteps\b|\bprocess/i.test(titleLower)) {
    featuredSnippetFormat = 'LIST';
  } else if (/\bwhat\s+is\b|\bdefinition\b|\bmeaning/i.test(titleLower)) {
    featuredSnippetFormat = 'PARAGRAPH';
  }

  // Search intent overrides for featured snippet format
  if (searchIntent) {
    if (searchIntent === 'informational' && /\b(what|who|where|when|why|how|is|are|does|do|can)\b/i.test(titleLower)) {
      featuredSnippetFormat = 'PARAGRAPH';
    } else if (searchIntent === 'transactional' || searchIntent === 'navigational') {
      featuredSnippetFormat = 'NONE';
    }
  }

  // Audience level based on topic depth
  let audienceLevel: TopicConfig['audienceLevel'] = 'intermediate';
  if (topic.cluster_role === 'pillar') audienceLevel = 'beginner';
  else if (topic.type === 'outer') audienceLevel = 'expert';

  // Section count max based on content length
  const sectionCountMap: Record<string, number> = {
    minimal: 4, short: 6, standard: 8, comprehensive: 12,
  };

  return {
    contentLength,
    contentLengthReason,
    featuredSnippetFormat,
    toneOverride: 'professional',
    audienceLevel,
    sectionCountMax: sectionCountMap[contentLength],
    briefStatus: 'pending',
  };
}

// ============================================================================
// PURE LOGIC — suggestActionType (no AI needed)
// ============================================================================

/**
 * Suggest an action type for a topic based on its properties.
 * Pure logic — no AI call. Used as initial assignment before AI enrichment.
 */
export function suggestActionType(topic: EnrichedTopic): ActionType {
  // If topic has a target_url, it's an existing page
  if (topic.target_url) {
    // Check metadata for performance signals
    const meta = topic.metadata ?? {};
    const impressions = typeof meta.gsc_impressions === 'number' ? meta.gsc_impressions : undefined;
    const clicks = typeof meta.gsc_clicks === 'number' ? meta.gsc_clicks : undefined;
    const wordCount = typeof meta.word_count === 'number' ? meta.word_count : undefined;

    // Low-performing pages with thin content → REWRITE
    if (wordCount !== undefined && wordCount < 300 && impressions !== undefined && impressions < 10) {
      return 'REWRITE';
    }

    // Very low performance → consider PRUNE
    if (impressions !== undefined && impressions < 5 && clicks !== undefined && clicks === 0) {
      return 'PRUNE_410';
    }

    // Has content, reasonable performance → OPTIMIZE
    return 'OPTIMIZE';
  }

  // No target_url = new content
  return 'CREATE_NEW';
}

/**
 * Suggest priority based on topic type and class.
 */
export function suggestPriority(topic: EnrichedTopic): ActionPriority {
  if (topic.cluster_role === 'pillar') return 'critical';
  if (topic.type === 'core' && topic.topic_class === 'monetization') return 'high';
  if (topic.type === 'core') return 'medium';
  return 'low';
}

/**
 * Create initial action plan entries from topics (no AI).
 * Fast, deterministic initialization.
 */
export function createInitialEntries(
  topics: EnrichedTopic[],
  waveAssignment: Map<string, number>
): ActionPlanEntry[] {
  return topics.map(topic => {
    const entry: ActionPlanEntry = {
      topicId: topic.id,
      actionType: suggestActionType(topic),
      priority: suggestPriority(topic),
      wave: waveAssignment.get(topic.id) ?? 1,
      rationale: '',
      config: suggestTopicConfig(topic),
    };

    // Force existing service page pillars to Wave 1
    if (topic.target_url && topic.cluster_role === 'pillar' &&
        (topic.metadata as any)?.is_existing_page) {
      entry.wave = 1;
      entry.rationale = 'Existing service page — optimize first to establish hub authority.';
      entry.actionType = 'OPTIMIZE';
      entry.priority = 'critical';
    }

    return entry;
  });
}

// ============================================================================
// AI-POWERED — Topic Rationales
// ============================================================================

const BATCH_SIZE = 15;

interface RationaleResult {
  topicId: string;
  actionType: ActionType;
  priority: ActionPriority;
  suggestedWave: number;
  rationale: string;
}

export interface RationaleWithWaveDefinitions {
  rationales: RationaleResult[];
  waveDefinitions: WaveDefinition[];
}

/**
 * Build the prompt for generating topic rationales in batch.
 */
function buildRationalePrompt(
  topics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  pillars: SEOPillars,
  eavs: SemanticTriple[]
): string {
  const languageInstruction = getLanguageAndRegionInstruction(
    businessInfo.language,
    businessInfo.region
  );

  const topicList = topics.map((t, i) => {
    const actionHint = t.target_url ? 'EXISTING PAGE' : 'NEW CONTENT';
    const classLabel = t.topic_class === 'monetization' ? 'Revenue' : 'Authority';
    return `${i + 1}. "${t.title}" [${t.type}/${classLabel}] [${actionHint}]${t.target_url ? ` URL: ${t.target_url}` : ''}`;
  }).join('\n');

  return `
${languageInstruction}

You are a Holistic SEO strategist creating a strategic action plan for a content production pipeline.

${businessContext(businessInfo)}
**SEO Pillars:**
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

**EAV Coverage:** ${eavs.length} semantic triples defined

**Topics to analyze:**
${topicList}

**WAVE DEFINITION TASK:** Before assigning topics, define the wave structure. Determine the NUMBER of waves (2-8) based on business goals and topic diversity. Each wave should represent a distinct publishing phase with a clear strategic purpose.

**WAVE PRAGMATISM RULES:**
- Each wave should contain a manageable number of pages (5-15 ideally). Distribute work across waves — never put all topics in Wave 1.
- Wave count should scale with topic count: 10-20 topics = 2-3 waves, 20-40 = 3-5 waves, 40+ = 5-8 waves.
- Each wave must have a distinct strategic purpose tied to business goals. Avoid generic names like "Other" or "Miscellaneous".
- Think as a pragmatic SEO consultant advising a small team. Waves are a publishing schedule — each wave should be achievable in 2-4 weeks of focused work.

Example wave structures:
- B2B service site (4 waves): Foundation Services → Supporting Authority → Regional Expansion → Thought Leadership
- E-commerce (3 waves): Core Product Pages → Category Support → Buying Guides
- SaaS (5 waves): Feature Pages → Use Case Pages → Integration Guides → Comparison Content → Educational Content
- Local business (3 waves): Core Services → Service Area Pages → Trust & Authority Content

**EXISTING PAGE PRIORITY RULES:**
- Topics marked [EXISTING PAGE + PILLAR] should be in Wave 1 with actionType OPTIMIZE (optimize existing pages first to establish hub authority)
- Their supporting spokes should be in Wave 2+ (create supporting content after hub is optimized)

For each topic, determine:
1. **actionType** — One of: CREATE_NEW, OPTIMIZE, REWRITE, MERGE, REDIRECT_301, PRUNE_410, CANONICALIZE, KEEP
   - Topics marked [NEW CONTENT] should typically be CREATE_NEW
   - Topics marked [EXISTING PAGE] should be OPTIMIZE, REWRITE, or KEEP based on strategic value
2. **priority** — One of: critical, high, medium, low
   - Pillar pages = critical
   - Core monetization = high
   - Core informational = medium
   - Outer/authority = low
3. **suggestedWave** — Assign to the wave number you defined in waveDefinitions.
4. **rationale** — 1-2 sentence explanation of WHY this action and wave assignment make strategic sense for the business.

${jsonResponseInstruction}
Return a JSON object with two fields:
{
  "waveDefinitions": [
    { "number": 1, "name": "Short name", "description": "Strategic purpose of this wave" }
  ],
  "topics": [
    {
      "topicIndex": 1,
      "actionType": "CREATE_NEW",
      "priority": "high",
      "suggestedWave": 1,
      "rationale": "This pillar page establishes topical authority for the core monetization cluster..."
    }
  ]
}
`;
}

/**
 * Generate AI-powered rationales for a batch of topics.
 * Returns enriched action plan entries with rationales and wave definitions.
 */
export async function generateTopicRationales(
  topics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  pillars: SEOPillars,
  eavs: SemanticTriple[],
  dispatch: React.Dispatch<any>
): Promise<RationaleWithWaveDefinitions> {
  const results: RationaleResult[] = [];
  let waveDefinitions: WaveDefinition[] = [];

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < topics.length; i += BATCH_SIZE) {
    const batch = topics.slice(i, i + BATCH_SIZE);
    const prompt = buildRationalePrompt(batch, businessInfo, pillars, eavs);

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'ActionPlan',
        message: `Analyzing topics ${i + 1}-${Math.min(i + BATCH_SIZE, topics.length)} of ${topics.length}...`,
        status: 'info',
        timestamp: Date.now(),
      },
    });

    try {
      const response = await dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateText(prompt, businessInfo, dispatch),
        openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
        anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
        perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
        openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch),
      });

      // Try to parse as JSON object with waveDefinitions + topics (new format)
      const jsonObjMatch = response.match(/\{[\s\S]*\}/);
      const jsonArrMatch = response.match(/\[[\s\S]*\]/);

      let topicItems: Array<{
        topicIndex: number;
        actionType: string;
        priority: string;
        suggestedWave: number;
        rationale: string;
      }> = [];

      if (jsonObjMatch) {
        try {
          const parsed = JSON.parse(jsonObjMatch[0]);
          // New format: { waveDefinitions: [...], topics: [...] }
          if (parsed.waveDefinitions && Array.isArray(parsed.waveDefinitions) && i === 0) {
            waveDefinitions = parsed.waveDefinitions.map((wd: any) => ({
              number: wd.number,
              name: String(wd.name || ''),
              description: String(wd.description || ''),
            }));
          }
          if (parsed.topics && Array.isArray(parsed.topics)) {
            topicItems = parsed.topics;
          } else if (Array.isArray(parsed)) {
            // Fallback: AI returned a raw array in an object wrapper
            topicItems = parsed;
          }
        } catch {
          // Fall through to array match
        }
      }

      // Fallback: try to parse as plain JSON array (old format)
      if (topicItems.length === 0 && jsonArrMatch) {
        try {
          topicItems = JSON.parse(jsonArrMatch[0]);
        } catch { /* ignore */ }
      }

      const validActions: ActionType[] = [
        'KEEP', 'OPTIMIZE', 'REWRITE', 'MERGE',
        'REDIRECT_301', 'PRUNE_410', 'CANONICALIZE', 'CREATE_NEW',
      ];
      const validPriorities: ActionPriority[] = ['critical', 'high', 'medium', 'low'];
      const maxWave = waveDefinitions.length > 0
        ? Math.max(...waveDefinitions.map(w => w.number))
        : 4;

      for (const item of topicItems) {
        const topicIdx = (item.topicIndex ?? 1) - 1;
        const topic = batch[topicIdx];
        if (!topic) continue;

        results.push({
          topicId: topic.id,
          actionType: validActions.includes(item.actionType as ActionType)
            ? (item.actionType as ActionType)
            : suggestActionType(topic),
          priority: validPriorities.includes(item.priority as ActionPriority)
            ? (item.priority as ActionPriority)
            : suggestPriority(topic),
          suggestedWave: (item.suggestedWave >= 1 && item.suggestedWave <= maxWave)
            ? item.suggestedWave
            : 1,
          rationale: (item.rationale || '').trim(),
        });
      }
    } catch (error) {
      console.warn(`[ActionPlan] Batch ${i / BATCH_SIZE + 1} failed, using defaults:`, error);
      // Fall back to pure-logic defaults for this batch
      for (const topic of batch) {
        results.push({
          topicId: topic.id,
          actionType: suggestActionType(topic),
          priority: suggestPriority(topic),
          suggestedWave: 1,
          rationale: '',
        });
      }
    }
  }

  // Provide default wave definitions if AI didn't return any
  if (waveDefinitions.length === 0) {
    waveDefinitions = [
      { number: 1, name: 'Foundation', description: 'Core pillar and monetization pages' },
      { number: 2, name: 'Knowledge Depth', description: 'Informational support content' },
      { number: 3, name: 'Extension', description: 'Regional and variant pages' },
      { number: 4, name: 'Authority', description: 'Outer authority expansion topics' },
    ];
  }

  return { rationales: results, waveDefinitions };
}

// ============================================================================
// AI-POWERED — Strategic Summary
// ============================================================================

/**
 * Generate a business-oriented strategic summary of the action plan.
 */
export async function generateStrategicSummary(
  entries: ActionPlanEntry[],
  topics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  pillars: SEOPillars,
  dispatch: React.Dispatch<any>,
  waveDefinitions?: WaveDefinition[]
): Promise<string> {
  const languageInstruction = getLanguageAndRegionInstruction(
    businessInfo.language,
    businessInfo.region
  );

  // Compute stats for the prompt
  const actionStats = {
    total: entries.length,
    createNew: entries.filter(e => e.actionType === 'CREATE_NEW').length,
    optimize: entries.filter(e => e.actionType === 'OPTIMIZE').length,
    rewrite: entries.filter(e => e.actionType === 'REWRITE').length,
    merge: entries.filter(e => e.actionType === 'MERGE').length,
    redirect: entries.filter(e => e.actionType === 'REDIRECT_301').length,
    prune: entries.filter(e => e.actionType === 'PRUNE_410').length,
    keep: entries.filter(e => e.actionType === 'KEEP').length,
  };

  // Build dynamic wave stats
  const waveDefs = waveDefinitions ?? [
    { number: 1, name: 'Foundation' },
    { number: 2, name: 'Knowledge' },
    { number: 3, name: 'Extension' },
    { number: 4, name: 'Authority' },
  ];
  const waveStats = waveDefs.map(wd => {
    const count = entries.filter(e => e.wave === wd.number).length;
    return `- Wave ${wd.number} (${wd.name}): ${count} pages`;
  }).join('\n');

  const prompt = `
${languageInstruction}

You are a senior SEO strategist writing a strategic summary for a client.

${businessContext(businessInfo)}
**SEO Pillars:**
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

**Action Plan Statistics:**
- Total pages planned: ${actionStats.total}
- Create New: ${actionStats.createNew} | Optimize: ${actionStats.optimize} | Rewrite: ${actionStats.rewrite}
- Merge: ${actionStats.merge} | Redirect: ${actionStats.redirect} | Prune: ${actionStats.prune} | Keep: ${actionStats.keep}
${waveStats}

Write a 3-5 sentence strategic summary explaining:
1. The overall strategy and WHY this plan makes sense for the business
2. The key priorities (what gets done first and why)
3. Expected outcomes and timeline implications

Be specific and business-focused. Reference the Central Entity and business context.
Return ONLY the summary text, no JSON wrapping.
`;

  try {
    const response = await dispatchToProvider(businessInfo, {
      gemini: () => geminiService.generateText(prompt, businessInfo, dispatch),
      openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
      anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
      perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
      openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch),
    });

    return response.trim();
  } catch (error) {
    console.warn('[ActionPlan] Strategic summary generation failed:', error);
    return `This plan covers ${actionStats.total} pages across ${waveDefs.length} waves, with ${actionStats.createNew} new pages to create and ${actionStats.optimize} existing pages to optimize.`;
  }
}
