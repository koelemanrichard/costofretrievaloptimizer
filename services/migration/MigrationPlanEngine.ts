import type { SiteInventoryItem, EnrichedTopic, ActionType } from '../../types';
import type { AutoMatchResult, MatchResult, GapTopic } from './AutoMatchService';

// ── Result interfaces ──────────────────────────────────────────────────────

export interface PlanInput {
  inventory: SiteInventoryItem[];
  topics: EnrichedTopic[];
  matchResult: AutoMatchResult;
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

// ── Engine ─────────────────────────────────────────────────────────────────

export class MigrationPlanEngine {
  /**
   * Generate a deterministic, prioritized migration plan based on audit scores,
   * GSC performance, and auto-match results.
   *
   * Pure synchronous function -- no network calls, no AI, no side effects.
   */
  generatePlan(input: PlanInput): PlannedAction[] {
    const { inventory, topics, matchResult } = input;
    const inventoryLookup = buildInventoryLookup(inventory);
    const actions: PlannedAction[] = [];

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

    // ── Sort: priority tier first, then clicks descending ──────────────
    actions.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Within same priority, sort by clicks descending
      const aClicks = this.extractClicksFromDataPoints(a);
      const bClicks = this.extractClicksFromDataPoints(b);
      return bClicks - aClicks;
    });

    return actions;
  }

  // ── Matched URL rules ────────────────────────────────────────────────

  private planMatched(item: SiteInventoryItem, match: MatchResult): PlannedAction {
    const score = getAuditScore(item);
    const clicks = getClicks(item);

    // High quality + traffic
    if (score >= 70 && clicks > 0) {
      return this.buildAction(item, match, {
        action: 'KEEP',
        priority: 'low',
        effort: 'none',
        reasoning: `This page is performing well (quality ${score}/100, ${clicks} clicks/month). Keep it as-is — focus your effort on lower-scoring pages first.`,
        dataPoints: [
          { label: 'Audit Score', value: `${score}/100`, impact: 'Above quality threshold' },
          { label: 'Monthly Clicks', value: String(clicks), impact: 'Active traffic' },
        ],
      });
    }

    // High quality + no traffic
    if (score >= 70 && clicks === 0) {
      return this.buildAction(item, match, {
        action: 'KEEP',
        priority: 'low',
        effort: 'none',
        reasoning: `Content quality is good (${score}/100) but not yet driving traffic. Keep it and monitor for indexing/ranking improvements.`,
        dataPoints: [
          { label: 'Audit Score', value: `${score}/100`, impact: 'Above quality threshold' },
          { label: 'Monthly Clicks', value: '0', impact: 'No traffic yet' },
        ],
      });
    }

    // Medium quality + traffic
    if (score >= 40 && score < 70 && clicks > 0) {
      return this.buildAction(item, match, {
        action: 'OPTIMIZE',
        priority: 'high',
        effort: 'medium',
        reasoning: `This page gets ${clicks} clicks/month but its quality is only ${score}/100. Improving the content will protect and grow this existing traffic.`,
        dataPoints: [
          { label: 'Monthly Clicks', value: String(clicks), impact: 'Traffic at risk without improvement' },
          { label: 'Audit Score', value: `${score}/100`, impact: 'Below quality threshold' },
        ],
      });
    }

    // Low quality + traffic
    if (score < 40 && clicks > 0) {
      return this.buildAction(item, match, {
        action: 'REWRITE',
        priority: 'critical',
        effort: 'high',
        reasoning: `This page gets ${clicks} clicks/month but its content quality is low (${score}/100). Without improvement, you risk losing these rankings to competitors. Rewrite the content to match the target topic.`,
        dataPoints: [
          { label: 'Monthly Clicks', value: String(clicks), impact: 'High traffic at risk' },
          { label: 'Audit Score', value: `${score}/100`, impact: 'Below quality threshold' },
        ],
      });
    }

    // Low quality + no traffic (score < 40 && clicks === 0)
    // Also covers medium quality + no traffic (score 40-69 && clicks === 0) as fallback
    return this.buildAction(item, match, {
      action: 'REWRITE',
      priority: 'medium',
      effort: 'high',
      reasoning: `This page scores ${score}/100 and has no traffic. The content needs a fundamental rework to properly serve its target topic.`,
      dataPoints: [
        { label: 'Audit Score', value: `${score}/100`, impact: 'Below quality threshold' },
        { label: 'Monthly Clicks', value: '0', impact: 'No traffic' },
      ],
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

    // Sort by clicks descending -- the URL with the most clicks becomes the merge target
    groupItems.sort((a, b) => getClicks(b.item) - getClicks(a.item));

    const mergeTarget = groupItems[0];
    const competingUrlList = groupItems.map((g) => g.item.url);

    for (let i = 0; i < groupItems.length; i++) {
      const { item, match } = groupItems[i];
      const isMergeTarget = i === 0;

      actions.push({
        inventoryId: item.id,
        url: item.url,
        action: 'MERGE',
        priority: 'high',
        effort: 'medium',
        reasoning: isMergeTarget
          ? `${groupItems.length} pages compete for "${topicTitle}". This page has the most traffic (${getClicks(item)} clicks) — merge the best content from the other pages here and redirect them to this URL.`
          : `This page competes with ${groupItems.length - 1} other page(s) for "${topicTitle}". Merge its best content into the strongest page and redirect this URL there.`,
        dataPoints: [
          { label: 'Competing URLs', value: `${groupItems.length} pages`, impact: 'Diluting ranking signals' },
          { label: 'Monthly Clicks', value: String(getClicks(item)), impact: isMergeTarget ? 'Strongest page' : 'Weaker page' },
          { label: 'Topic', value: topicTitle, impact: 'Keyword cannibalization' },
        ],
        topicId,
        mergeTargetUrl: isMergeTarget ? undefined : mergeTarget.item.url,
        redirectTargetUrl: isMergeTarget ? undefined : mergeTarget.item.url,
      });
    }

    return actions;
  }

  // ── Orphan URL rules ─────────────────────────────────────────────────

  private planOrphan(item: SiteInventoryItem, match: MatchResult): PlannedAction {
    const clicks = getClicks(item);
    const score = getAuditScore(item);

    // Check canonical mismatch first (highest specificity)
    if (item.google_canonical && item.google_canonical !== item.url) {
      return this.buildAction(item, match, {
        action: 'CANONICALIZE',
        priority: 'high',
        effort: 'low',
        reasoning: `Google chose a different canonical URL (${item.google_canonical}) instead of this page. Fix the canonical tag to consolidate ranking signals into one page.`,
        dataPoints: [
          { label: 'Google Canonical', value: item.google_canonical, impact: 'Ranking signal dilution' },
          { label: 'Current URL', value: item.url, impact: 'Non-canonical' },
        ],
      });
    }

    // Orphan with significant traffic
    if (clicks > 10) {
      return this.buildAction(item, match, {
        action: 'REDIRECT_301',
        priority: 'high',
        effort: 'low',
        reasoning: `This page gets ${clicks} clicks/month but doesn't match any topic in your strategy. Redirect it to a relevant page to preserve the link equity and traffic.`,
        dataPoints: [
          { label: 'Monthly Clicks', value: String(clicks), impact: 'Traffic to preserve' },
          { label: 'Match Status', value: 'No matching topic', impact: 'Orphaned content' },
        ],
      });
    }

    // Low traffic + low quality
    if (clicks <= 10 && score < 30) {
      return this.buildAction(item, match, {
        action: 'PRUNE_410',
        priority: 'medium',
        effort: 'low',
        reasoning: `This page has no traffic and low quality (${score}/100). Removing it helps search engines focus on your better content instead of wasting crawl budget here.`,
        dataPoints: [
          { label: 'Monthly Clicks', value: String(clicks), impact: 'Negligible traffic' },
          { label: 'Audit Score', value: `${score}/100`, impact: 'Below quality threshold' },
        ],
      });
    }

    // Low traffic + decent quality
    return this.buildAction(item, match, {
      action: 'KEEP',
      priority: 'low',
      effort: 'none',
      reasoning: `Decent content (${score}/100) but no matching topic in your strategy. Consider adding a related topic to your map or redirecting this page.`,
      dataPoints: [
        { label: 'Monthly Clicks', value: String(clicks), impact: 'Low traffic' },
        { label: 'Audit Score', value: `${score}/100`, impact: 'Acceptable quality' },
      ],
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
   * Extract the clicks value from a PlannedAction's dataPoints for sorting.
   * Returns 0 if no "Monthly Clicks" data point is found.
   */
  private extractClicksFromDataPoints(action: PlannedAction): number {
    const clicksPoint = action.dataPoints.find((dp) => dp.label === 'Monthly Clicks');
    if (!clicksPoint) return 0;
    const parsed = parseInt(clicksPoint.value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
}
