import type { SiteInventoryItem, EnrichedTopic, ActionType } from '../../types';
import type { AutoMatchResult, MatchResult, GapTopic } from './AutoMatchService';
import { classifyPageType } from './pageTypeClassifier';

// ── Result interfaces ──────────────────────────────────────────────────────

export interface PlanInput {
  inventory: SiteInventoryItem[];
  topics: EnrichedTopic[];
  matchResult: AutoMatchResult;
  context?: {
    language?: string;
    industry?: string;
    centralEntity?: string;
    sourceContext?: string;
  };
}

export interface PlanDataPoint {
  label: string;
  value: string;
  impact: string;
}

export interface PlannedAction {
  inventoryId: string;
  url: string;
  action: ActionType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'none' | 'low' | 'medium' | 'high';
  reasoning: string;
  dataPoints: PlanDataPoint[];
  topicId?: string;
  mergeTargetUrl?: string;
  redirectTargetUrl?: string;
}

// ── User-friendly action explanations ──────────────────────────────────────

export const ACTION_EXPLANATIONS: Record<string, string> = {
  KEEP: 'This page is fine as-is. No changes needed.',
  OPTIMIZE: 'This page has potential but needs content improvements to rank better.',
  REWRITE: 'This page needs to be completely rewritten to properly cover its topic.',
  MERGE: 'This page competes with another page for the same topic. Combine them into one stronger page.',
  REDIRECT_301: 'This page should redirect visitors to a better page, preserving any link value.',
  PRUNE_410: 'This page should be removed. It has no traffic and low quality.',
  CANONICALIZE: 'Google sees a different version of this page as the main one. Fix the canonical tag.',
  CREATE_NEW: 'No page exists for this topic yet. Create new content to fill this gap.',
};

// ── Priority ordering for sort ─────────────────────────────────────────────

const PRIORITY_ORDER: Record<PlannedAction['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ── Signal weights ─────────────────────────────────────────────────────────

const SIGNAL_WEIGHTS = {
  contentHealth: 0.30,
  trafficOpportunity: 0.25,
  strategicAlignment: 0.20,
  technicalHealth: 0.15,
  linkingStrength: 0.10,
} as const;

// ── Site-wide averages ─────────────────────────────────────────────────────

interface SiteAverages {
  avgInternalLinks: number;
  avgWordCount: number;
}

function computeSiteAverages(inventory: SiteInventoryItem[]): SiteAverages {
  const items = inventory.filter(i => i.word_count || i.internal_link_count);
  const totalLinks = items.reduce((sum, i) => sum + (i.internal_link_count ?? 0), 0);
  const totalWords = items.reduce((sum, i) => sum + (i.word_count ?? 0), 0);
  const count = items.length || 1;
  return {
    avgInternalLinks: Math.round(totalLinks / count),
    avgWordCount: Math.round(totalWords / count),
  };
}

// ── Signal scoring functions (pure, synchronous) ───────────────────────────

/**
 * Content Health (0-100): audit_score + word_count bonus + schema presence
 */
function computeContentHealth(item: SiteInventoryItem): number {
  let auditScore = item.audit_score ?? 0;
  // Blend with semantic overall score if available
  if (item.semantic_overall_score != null) {
    auditScore = auditScore > 0
      ? Math.round((auditScore + item.semantic_overall_score) / 2)
      : item.semantic_overall_score;
  }
  // Word count bonus: thin content (<300 words) penalized, >1000 words gets bonus
  let wordCountBonus = 0;
  if (item.word_count != null) {
    if (item.word_count < 300) wordCountBonus = -15;
    else if (item.word_count < 600) wordCountBonus = -5;
    else if (item.word_count >= 1000) wordCountBonus = 5;
    else if (item.word_count >= 2000) wordCountBonus = 10;
  }
  // Schema presence bonus
  const schemaBonus = (item.schema_types && item.schema_types.length > 0) ? 5 : 0;
  return clamp(auditScore + wordCountBonus + schemaBonus, 0, 100);
}

/**
 * Traffic Opportunity (0-100): clicks (log scale) + impressions + striking distance
 */
function computeTrafficOpportunity(item: SiteInventoryItem): number {
  const clicks = item.gsc_clicks ?? 0;
  const impressions = item.gsc_impressions ?? 0;
  const position = item.gsc_position ?? 0;
  const strikingDistance = item.striking_distance_keywords ?? [];

  // Clicks score: logarithmic scale (1 click = 20, 10 = 40, 100 = 60, 1000 = 80)
  const clickScore = clicks > 0 ? Math.min(20 * Math.log10(clicks + 1), 80) : 0;

  // Impressions bonus: high impressions with low clicks = untapped opportunity
  let impressionBonus = 0;
  if (impressions > 100) impressionBonus = 5;
  if (impressions > 1000) impressionBonus = 10;
  if (impressions > 5000) impressionBonus = 15;

  // Striking distance bonus: keywords at position 5-20 are quick wins
  const strikingBonus = strikingDistance.length > 0
    ? Math.min(strikingDistance.length * 5, 20)
    : (position >= 5 && position <= 20 && impressions > 50 ? 15 : 0);

  return clamp(Math.round(clickScore + impressionBonus + strikingBonus), 0, 100);
}

/**
 * Technical Health (0-100): CWV assessment + COR score + DOM size + TTFB
 */
function computeTechnicalHealth(item: SiteInventoryItem): number {
  let score = 70; // Default assumption (no data = assume okay)

  // CWV assessment
  if (item.cwv_assessment) {
    if (item.cwv_assessment === 'good') score = 90;
    else if (item.cwv_assessment === 'needs-improvement') score = 60;
    else if (item.cwv_assessment === 'poor') score = 30;
  }

  // COR score penalty (0-100 scale, high = bad)
  if (item.cor_score != null) {
    if (item.cor_score > 70) score -= 20;
    else if (item.cor_score > 50) score -= 10;
  }

  // DOM size penalty
  if (item.dom_size != null) {
    if (item.dom_size > 3000) score -= 15; // >3MB DOM
    else if (item.dom_size > 1500) score -= 5;
  }

  // TTFB penalty
  if (item.ttfb_ms != null) {
    if (item.ttfb_ms > 2000) score -= 15;
    else if (item.ttfb_ms > 800) score -= 5;
  }

  return clamp(score, 0, 100);
}

/**
 * Strategic Alignment (0-100): prefer semantic alignment scores over match_confidence
 */
function computeStrategicAlignment(item: SiteInventoryItem): number {
  // Use semantic alignment if available (from pillar-based analysis)
  if (item.ce_alignment != null && item.sc_alignment != null && item.csi_alignment != null) {
    return clamp(Math.round(
      item.ce_alignment * 0.4 + item.sc_alignment * 0.3 + item.csi_alignment * 0.3
    ), 0, 100);
  }
  // Fall back to match confidence from auto-matching
  const confidence = item.match_confidence ?? 0;
  return clamp(Math.round(confidence * 100), 0, 100);
}

/**
 * Linking Strength (0-100): internal links relative to site average + external links
 */
function computeLinkingStrength(item: SiteInventoryItem, siteAvg: SiteAverages): number {
  const internalLinks = item.internal_link_count ?? 0;
  const externalLinks = item.external_link_count ?? 0;
  const avg = siteAvg.avgInternalLinks || 1;

  // Ratio-based: at average = 60, double average = 80, half = 40
  const ratio = internalLinks / avg;
  let linkScore = Math.round(60 * ratio);

  // External link bonus (up to 15)
  if (externalLinks > 0) linkScore += Math.min(externalLinks * 3, 15);

  return clamp(linkScore, 0, 100);
}

/**
 * Compute weighted composite score from all signals
 */
function computeCompositeScore(
  contentHealth: number,
  trafficOpportunity: number,
  technicalHealth: number,
  strategicAlignment: number,
  linkingStrength: number,
): number {
  return Math.round(
    contentHealth * SIGNAL_WEIGHTS.contentHealth +
    trafficOpportunity * SIGNAL_WEIGHTS.trafficOpportunity +
    technicalHealth * SIGNAL_WEIGHTS.technicalHealth +
    strategicAlignment * SIGNAL_WEIGHTS.strategicAlignment +
    linkingStrength * SIGNAL_WEIGHTS.linkingStrength,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getClicks(item: SiteInventoryItem): number {
  return item.gsc_clicks ?? 0;
}

function getAuditScore(item: SiteInventoryItem): number {
  return item.audit_score ?? 0;
}

function buildInventoryLookup(inventory: SiteInventoryItem[]): Map<string, SiteInventoryItem> {
  const map = new Map<string, SiteInventoryItem>();
  for (const item of inventory) {
    map.set(item.id, item);
  }
  return map;
}

/**
 * Detect if an item has striking distance keywords (position 5-20, meaningful impressions)
 */
function isStrikingDistance(item: SiteInventoryItem): boolean {
  const pos = item.gsc_position ?? 0;
  const impressions = item.gsc_impressions ?? 0;
  const strikingKw = item.striking_distance_keywords ?? [];
  return strikingKw.length > 0 || (pos >= 5 && pos <= 20 && impressions > 50);
}

/**
 * Build a compact signal summary for reasoning strings
 */
function buildSignalSummary(
  item: SiteInventoryItem,
  scores: { contentHealth: number; trafficOpp: number; techHealth: number; alignment: number; linking: number; composite: number },
  siteAvg: SiteAverages,
): string {
  const parts: string[] = [];
  parts.push(`Composite score ${scores.composite}/100`);
  parts.push(`content health ${scores.contentHealth}`);
  parts.push(`traffic opportunity ${scores.trafficOpp}`);

  const clicks = item.gsc_clicks ?? 0;
  const impressions = item.gsc_impressions ?? 0;
  const position = item.gsc_position ?? 0;
  if (clicks > 0 || impressions > 0) {
    let trafficDetail = `(${clicks} clicks`;
    if (impressions > 0) trafficDetail += `, ${formatNumber(impressions)} impressions`;
    if (position > 0) trafficDetail += `, position #${Math.round(position)}`;
    trafficDetail += ')';
    parts.push(trafficDetail);
  }

  const strikingKw = item.striking_distance_keywords ?? [];
  if (strikingKw.length > 0) {
    parts.push(`${strikingKw.length} striking distance keyword(s)`);
  } else if (isStrikingDistance(item)) {
    parts.push('striking distance opportunity');
  }

  parts.push(`technical health ${scores.techHealth}`);

  if (item.cwv_assessment && item.cwv_assessment !== 'good') {
    parts.push(`CWV: ${item.cwv_assessment}`);
  }

  const internalLinks = item.internal_link_count ?? 0;
  const avg = siteAvg.avgInternalLinks;
  if (avg > 0 && internalLinks < avg * 0.5) {
    parts.push(`internal linking weak (${internalLinks} vs ${avg} avg)`);
  } else if (avg > 0) {
    parts.push(`internal links: ${internalLinks}`);
  }

  if (item.schema_types && item.schema_types.length > 0) {
    parts.push(`schema: ${item.schema_types.join(', ')}`);
  }

  return parts.join('. ') + '.';
}

/**
 * Build comprehensive data points from all signals
 */
function buildComprehensiveDataPoints(
  item: SiteInventoryItem,
  scores: { contentHealth: number; trafficOpp: number; techHealth: number; alignment: number; linking: number; composite: number },
  siteAvg: SiteAverages,
): PlanDataPoint[] {
  const points: PlanDataPoint[] = [
    { label: 'Composite Score', value: `${scores.composite}/100`, impact: scores.composite >= 70 ? 'Strong' : scores.composite >= 40 ? 'Moderate' : 'Weak' },
    { label: 'Content Health', value: `${scores.contentHealth}/100`, impact: scores.contentHealth >= 70 ? 'Good' : scores.contentHealth >= 40 ? 'Needs work' : 'Poor' },
    { label: 'Traffic Opportunity', value: `${scores.trafficOpp}/100`, impact: scores.trafficOpp >= 40 ? 'Active traffic' : scores.trafficOpp > 0 ? 'Some traffic' : 'No traffic' },
  ];

  const clicks = item.gsc_clicks ?? 0;
  const impressions = item.gsc_impressions ?? 0;
  if (clicks > 0 || impressions > 0) {
    points.push({ label: 'Monthly Clicks', value: String(clicks), impact: clicks > 50 ? 'High traffic' : clicks > 0 ? 'Active traffic' : 'No clicks' });
    if (impressions > 0) {
      points.push({ label: 'Impressions', value: formatNumber(impressions), impact: impressions > 1000 ? 'High visibility' : 'Some visibility' });
    }
  }

  if (item.gsc_position && item.gsc_position > 0) {
    points.push({ label: 'Avg Position', value: `#${Math.round(item.gsc_position)}`, impact: item.gsc_position <= 10 ? 'Page 1' : item.gsc_position <= 20 ? 'Striking distance' : 'Deep' });
  }

  const strikingKw = item.striking_distance_keywords ?? [];
  if (strikingKw.length > 0) {
    points.push({ label: 'Striking Distance', value: `${strikingKw.length} keyword(s)`, impact: 'Quick-win optimization target' });
  }

  points.push({ label: 'Technical Health', value: `${scores.techHealth}/100`, impact: scores.techHealth >= 70 ? 'Good' : scores.techHealth >= 40 ? 'Issues detected' : 'Poor' });

  if (item.cwv_assessment) {
    points.push({ label: 'Core Web Vitals', value: item.cwv_assessment, impact: item.cwv_assessment === 'good' ? 'Passing' : 'Needs improvement' });
  }

  if (item.word_count != null) {
    points.push({ label: 'Word Count', value: String(item.word_count), impact: item.word_count < 300 ? 'Thin content' : item.word_count >= 1000 ? 'Comprehensive' : 'Adequate' });
  }

  const internalLinks = item.internal_link_count ?? 0;
  const avg = siteAvg.avgInternalLinks;
  points.push({
    label: 'Internal Links',
    value: `${internalLinks}${avg > 0 ? ` (avg ${avg})` : ''}`,
    impact: avg > 0 && internalLinks < avg * 0.5 ? 'Below site average' : 'Adequate',
  });

  if (item.schema_types && item.schema_types.length > 0) {
    points.push({ label: 'Schema Types', value: item.schema_types.join(', '), impact: 'Structured data present' });
  }

  if (item.match_confidence != null) {
    points.push({ label: 'Match Confidence', value: `${Math.round(item.match_confidence * 100)}%`, impact: item.match_confidence >= 0.7 ? 'Strong match' : item.match_confidence >= 0.4 ? 'Partial match' : 'Weak match' });
  }

  return points;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/**
 * Data Completeness (0-100): measures how much actual data we have for an item.
 * Prevents destructive recommendations (PRUNE, REDIRECT) when data is insufficient.
 */
export function computeDataCompleteness(item: SiteInventoryItem): number {
  let score = 0;
  let maxScore = 0;

  // Audit data (weight: 30)
  maxScore += 30;
  if (item.audit_score != null) score += 30;

  // GSC data (weight: 25)
  maxScore += 25;
  if (item.gsc_clicks != null && item.gsc_impressions != null) score += 25;

  // Technical data (weight: 20)
  maxScore += 20;
  if (item.cwv_assessment != null || item.cor_score != null) score += 20;

  // Content data (weight: 15)
  maxScore += 15;
  if (item.word_count != null && item.word_count > 0) score += 15;

  // Linking data (weight: 10)
  maxScore += 10;
  if (item.internal_link_count != null) score += 10;

  return Math.round((score / maxScore) * 100);
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class MigrationPlanEngine {
  private siteAverages: SiteAverages = { avgInternalLinks: 0, avgWordCount: 0 };

  /**
   * Generate a deterministic, prioritized migration plan using multi-signal
   * composite scoring across content health, traffic, technical performance,
   * strategic alignment, and internal linking.
   *
   * Pure synchronous function -- no network calls, no AI, no side effects.
   */
  generatePlan(input: PlanInput): PlannedAction[] {
    const { inventory, topics, matchResult } = input;
    const inventoryLookup = buildInventoryLookup(inventory);
    const actions: PlannedAction[] = [];

    // Precompute site-wide averages for relative scoring
    this.siteAverages = computeSiteAverages(inventory);

    // Index matches by inventoryId for fast lookup
    const matchByInventoryId = new Map<string, MatchResult>();
    for (const match of matchResult.matches) {
      matchByInventoryId.set(match.inventoryId, match);
    }

    // Group cannibalization matches by topicId
    const cannibalizationGroups = new Map<string, MatchResult[]>();
    for (const match of matchResult.matches) {
      if (match.category === 'cannibalization' && match.topicId) {
        const existing = cannibalizationGroups.get(match.topicId) || [];
        existing.push(match);
        cannibalizationGroups.set(match.topicId, existing);
      }
    }

    // Track which cannibalization inventoryIds we already handled
    const handledCannibalizationIds = new Set<string>();

    // ── Process each match ─────────────────────────────────────────────
    for (const match of matchResult.matches) {
      const item = inventoryLookup.get(match.inventoryId);
      if (!item) continue;

      if (match.category === 'matched') {
        actions.push(this.planMatched(item, match));
      } else if (match.category === 'cannibalization') {
        // Process cannibalization as a group (once per topicId)
        if (!handledCannibalizationIds.has(match.inventoryId) && match.topicId) {
          const group = cannibalizationGroups.get(match.topicId);
          if (group) {
            const groupActions = this.planCannibalization(group, inventoryLookup, topics);
            actions.push(...groupActions);
            for (const m of group) {
              handledCannibalizationIds.add(m.inventoryId);
            }
          }
        }
      } else if (match.category === 'orphan') {
        actions.push(this.planOrphan(item, match));
      }
    }

    // ── Gap topics (CREATE_NEW) ────────────────────────────────────────
    for (const gap of matchResult.gaps) {
      actions.push(this.planGap(gap, topics));
    }

    // ── Sort: priority tier first, then composite score descending ─────
    actions.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Within same priority, sort by composite score descending (from data points)
      const aScore = this.extractCompositeFromDataPoints(a);
      const bScore = this.extractCompositeFromDataPoints(b);
      return bScore - aScore;
    });

    return actions;
  }

  // ── Compute all signals for an item ──────────────────────────────────

  private computeSignals(item: SiteInventoryItem) {
    const contentHealth = computeContentHealth(item);
    const trafficOpp = computeTrafficOpportunity(item);
    const techHealth = computeTechnicalHealth(item);
    const alignment = computeStrategicAlignment(item);
    const linking = computeLinkingStrength(item, this.siteAverages);
    const composite = computeCompositeScore(contentHealth, trafficOpp, techHealth, alignment, linking);
    return { contentHealth, trafficOpp, techHealth, alignment, linking, composite };
  }

  // ── Matched URL rules ────────────────────────────────────────────────

  private planMatched(item: SiteInventoryItem, match: MatchResult): PlannedAction {
    const scores = this.computeSignals(item);
    const clicks = getClicks(item);
    const impressions = item.gsc_impressions ?? 0;
    const summary = buildSignalSummary(item, scores, this.siteAverages);
    const dataPoints = buildComprehensiveDataPoints(item, scores, this.siteAverages);

    // Add page type classification for context
    const classification = classifyPageType(item.url);
    dataPoints.push({ label: 'Page Type', value: classification.type, impact: classification.reason });

    // Priority 1: Striking distance — quick win, highest ROI optimization
    if (isStrikingDistance(item) && clicks > 0) {
      const strikingKw = item.striking_distance_keywords ?? [];
      return this.buildAction(item, match, {
        action: 'OPTIMIZE',
        priority: 'critical',
        effort: 'medium',
        reasoning: `Quick-win opportunity: ${strikingKw.length > 0 ? `${strikingKw.length} keyword(s) in striking distance` : `position #${Math.round(item.gsc_position ?? 0)} with ${formatNumber(impressions)} impressions`}. ${summary}`,
        dataPoints,
      });
    }

    // Priority 2: Composite-based decision tree
    if (scores.composite >= 70) {
      return this.buildAction(item, match, {
        action: 'KEEP',
        priority: 'low',
        effort: 'none',
        reasoning: `Strong overall performance. ${summary}`,
        dataPoints,
      });
    }

    if (scores.composite >= 40) {
      // Has traffic or potential — optimize
      if (clicks > 0 || impressions > 100) {
        // Identify weak areas for targeted callouts
        const weakAreas: string[] = [];
        if (scores.contentHealth < 50) weakAreas.push('content quality');
        if (scores.techHealth < 50) weakAreas.push('technical performance');
        if (scores.linking < 40) weakAreas.push('internal linking');

        return this.buildAction(item, match, {
          action: 'OPTIMIZE',
          priority: 'high',
          effort: 'medium',
          reasoning: `Moderate score with active traffic — optimize to protect and grow. ${weakAreas.length > 0 ? `Focus areas: ${weakAreas.join(', ')}. ` : ''}${summary}`,
          dataPoints,
        });
      }

      // Moderate composite but no traffic — still optimize, not rewrite
      return this.buildAction(item, match, {
        action: 'OPTIMIZE',
        priority: 'medium',
        effort: 'medium',
        reasoning: `Moderate score but no traffic yet — content has potential if optimized. ${summary}`,
        dataPoints,
      });
    }

    // Composite < 40
    if (clicks > 0) {
      // Low quality but has traffic — rewrite urgently
      const failAreas: string[] = [];
      if (scores.contentHealth < 40) failAreas.push('content health');
      if (scores.techHealth < 40) failAreas.push('technical health');
      if (scores.linking < 30) failAreas.push('internal linking');

      return this.buildAction(item, match, {
        action: 'REWRITE',
        priority: 'critical',
        effort: 'high',
        reasoning: `Low composite score with active traffic at risk. ${failAreas.length > 0 ? `Critical failures: ${failAreas.join(', ')}. ` : ''}${summary}`,
        dataPoints,
      });
    }

    // Low quality + no traffic
    return this.buildAction(item, match, {
      action: 'REWRITE',
      priority: 'medium',
      effort: 'high',
      reasoning: `Weak across all signals with no traffic. Fundamental rework needed. ${summary}`,
      dataPoints,
    });
  }

  // ── Cannibalization rules ────────────────────────────────────────────

  private planCannibalization(
    group: MatchResult[],
    inventoryLookup: Map<string, SiteInventoryItem>,
    topics: EnrichedTopic[],
  ): PlannedAction[] {
    const actions: PlannedAction[] = [];

    // Resolve inventory items for the group
    const groupItems = group
      .map((m) => ({
        match: m,
        item: inventoryLookup.get(m.inventoryId),
      }))
      .filter((entry): entry is { match: MatchResult; item: SiteInventoryItem } => !!entry.item);

    if (groupItems.length < 2) return actions;

    // Find the topic title for the reasoning string
    const topicId = group[0].topicId!;
    const topic = topics.find((t) => t.id === topicId);
    const topicTitle = topic?.title ?? 'unknown topic';

    // Sort by composite score descending — pick the strongest overall page as merge target
    groupItems.sort((a, b) => {
      const scoresA = this.computeSignals(a.item);
      const scoresB = this.computeSignals(b.item);
      return scoresB.composite - scoresA.composite;
    });

    const mergeTarget = groupItems[0];
    const mergeTargetScores = this.computeSignals(mergeTarget.item);

    for (let i = 0; i < groupItems.length; i++) {
      const { item, match } = groupItems[i];
      const isMergeTarget = i === 0;
      const scores = this.computeSignals(item);
      const dataPoints = buildComprehensiveDataPoints(item, scores, this.siteAverages);
      dataPoints.unshift(
        { label: 'Competing URLs', value: `${groupItems.length} pages`, impact: 'Diluting ranking signals' },
        { label: 'Topic', value: topicTitle, impact: 'Keyword cannibalization' },
      );

      // Add merge/redirect target as data point for non-target items
      if (!isMergeTarget) {
        dataPoints.push(
          { label: 'Merge Target', value: mergeTarget.item.url, impact: 'Consolidate content here' },
          { label: 'Redirect Target', value: mergeTarget.item.url, impact: 'Redirect this page after merge' },
        );
      }

      actions.push({
        inventoryId: item.id,
        url: item.url,
        action: 'MERGE',
        priority: 'high',
        effort: 'medium',
        reasoning: isMergeTarget
          ? `${groupItems.length} pages compete for "${topicTitle}". This page has the strongest composite score (${mergeTargetScores.composite}/100) — merge the best content from the other pages here and redirect them.`
          : `This page competes with ${groupItems.length - 1} other page(s) for "${topicTitle}" (composite ${scores.composite}/100). Merge its best content into the strongest page (${mergeTarget.item.url}) and redirect.`,
        dataPoints,
        topicId,
        mergeTargetUrl: isMergeTarget ? undefined : mergeTarget.item.url,
        redirectTargetUrl: isMergeTarget ? undefined : mergeTarget.item.url,
      });
    }

    return actions;
  }

  // ── Orphan URL rules ─────────────────────────────────────────────────

  private planOrphan(item: SiteInventoryItem, match: MatchResult): PlannedAction {
    const scores = this.computeSignals(item);
    const clicks = getClicks(item);
    const summary = buildSignalSummary(item, scores, this.siteAverages);
    const dataPoints = buildComprehensiveDataPoints(item, scores, this.siteAverages);
    dataPoints.push({ label: 'Match Status', value: 'No matching topic', impact: 'Orphaned content' });

    // Classify page type for safety checks
    const classification = classifyPageType(item.url);
    dataPoints.push({ label: 'Page Type', value: classification.type, impact: classification.reason });

    // Check data completeness — refuse destructive actions on insufficient data
    const completeness = computeDataCompleteness(item);
    dataPoints.push({ label: 'Data Coverage', value: `${completeness}%`, impact: completeness < 30 ? 'Low confidence — needs more data' : 'Sufficient data' });

    // NEVER prune protected pages (conversion, utility, location, homepage)
    if (classification.protectedFromPrune) {
      return this.buildAction(item, match, {
        action: 'KEEP',
        priority: 'low',
        effort: 'none',
        reasoning: `${classification.reason} — protected from pruning. Consider mapping to a topic. ${summary}`,
        dataPoints,
      });
    }

    // Insufficient data — default to KEEP with warning
    if (completeness < 30) {
      return this.buildAction(item, match, {
        action: 'KEEP',
        priority: 'low',
        effort: 'none',
        reasoning: `Insufficient data for confident recommendation (${completeness}% data available). Audit this page first. ${summary}`,
        dataPoints,
      });
    }

    // Check canonical mismatch first (highest specificity)
    if (item.google_canonical && item.google_canonical !== item.url) {
      dataPoints.push({ label: 'Google Canonical', value: item.google_canonical, impact: 'Ranking signal dilution' });
      return this.buildAction(item, match, {
        action: 'CANONICALIZE',
        priority: 'high',
        effort: 'low',
        reasoning: `Google chose a different canonical URL (${item.google_canonical}) instead of this page. Fix the canonical tag to consolidate ranking signals.`,
        dataPoints,
      });
    }

    // Use traffic opportunity score instead of hard clicks > 10 threshold
    if (scores.trafficOpp >= 30) {
      return this.buildAction(item, match, {
        action: 'REDIRECT_301',
        priority: 'high',
        effort: 'low',
        reasoning: `Orphan page with meaningful traffic signal. Redirect to preserve link equity. ${summary}`,
        dataPoints,
      });
    }

    // No traffic + low quality + not indexed = strong prune signal
    const notIndexed = item.index_status && item.index_status !== 'indexed';
    if (scores.composite < 30 && scores.trafficOpp === 0) {
      return this.buildAction(item, match, {
        action: 'PRUNE_410',
        priority: 'medium',
        effort: 'low',
        reasoning: `Orphan page with no traffic and weak composite score (${scores.composite}/100).${notIndexed ? ' Not indexed by Google.' : ''} Removing it helps search engines focus on better content. ${summary}`,
        dataPoints,
      });
    }

    // Decent quality orphan
    return this.buildAction(item, match, {
      action: 'KEEP',
      priority: 'low',
      effort: 'none',
      reasoning: `Orphan with moderate quality (composite ${scores.composite}/100) but no matching topic. Consider adding a related topic to your map or redirecting. ${summary}`,
      dataPoints,
    });
  }

  // ── Gap topic rules ──────────────────────────────────────────────────

  private planGap(gap: GapTopic, topics: EnrichedTopic[]): PlannedAction {
    const topic = topics.find((t) => t.id === gap.topicId);
    const isPillar = gap.importance === 'pillar';

    return {
      inventoryId: '', // No existing inventory item
      url: '',
      action: 'CREATE_NEW',
      priority: isPillar ? 'critical' : 'medium',
      effort: 'high',
      reasoning: isPillar
        ? `No page exists for "${gap.topicTitle}" — a core pillar topic. Creating this content is essential for establishing topical authority in your niche.`
        : `No page covers "${gap.topicTitle}" yet. Adding this supporting content strengthens your topic cluster and improves overall coverage.`,
      dataPoints: [
        { label: 'Topic', value: gap.topicTitle, impact: isPillar ? 'Pillar gap' : 'Coverage gap' },
        { label: 'Importance', value: gap.importance, impact: isPillar ? 'Critical for authority' : 'Supports cluster depth' },
        ...(topic?.parent_topic_id
          ? [{ label: 'Parent Topic', value: topic.parent_topic_id, impact: 'Part of topic cluster' }]
          : []),
      ],
      topicId: gap.topicId,
    };
  }

  // ── Utility methods ──────────────────────────────────────────────────

  private buildAction(
    item: SiteInventoryItem,
    match: MatchResult,
    overrides: {
      action: ActionType;
      priority: PlannedAction['priority'];
      effort: PlannedAction['effort'];
      reasoning: string;
      dataPoints: PlanDataPoint[];
    },
  ): PlannedAction {
    return {
      inventoryId: item.id,
      url: item.url,
      action: overrides.action,
      priority: overrides.priority,
      effort: overrides.effort,
      reasoning: overrides.reasoning,
      dataPoints: overrides.dataPoints,
      topicId: match.topicId ?? undefined,
    };
  }

  /**
   * Extract the composite score from a PlannedAction's dataPoints for sorting.
   */
  private extractCompositeFromDataPoints(action: PlannedAction): number {
    const compositePoint = action.dataPoints.find((dp) => dp.label === 'Composite Score');
    if (compositePoint) {
      const parsed = parseInt(compositePoint.value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    // Fallback: try Monthly Clicks for gap/merge actions without composite
    const clicksPoint = action.dataPoints.find((dp) => dp.label === 'Monthly Clicks');
    if (clicksPoint) {
      const parsed = parseInt(clicksPoint.value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}
