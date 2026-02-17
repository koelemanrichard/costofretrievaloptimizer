// ── Overlay Service ─────────────────────────────────────────────────────────
// Computes the topic-map overlay: for each topic in the topical map, determines
// whether it is covered by an existing page, needs work, is a gap, or has
// cannibalization issues. Also surfaces orphan pages (pages not mapped to any
// topic).
//
// Pure synchronous function — no network calls, no side effects.
// ────────────────────────────────────────────────────────────────────────────

// ── Input types ─────────────────────────────────────────────────────────────

export interface OverlayTopic {
  id: string;
  title: string;
  type: 'core' | 'outer' | 'child' | string;
}

export interface OverlayInventoryItem {
  id: string;
  url: string;
  mapped_topic_id: string | null;
  ce_alignment?: number;
  sc_alignment?: number;
  csi_alignment?: number;
  gsc_clicks?: number;
  audit_score?: number;
}

export interface OverlayInput {
  topics: OverlayTopic[];
  inventory: OverlayInventoryItem[];
}

// ── Output types ────────────────────────────────────────────────────────────

export type OverlayStatus =
  | 'covered_aligned'
  | 'covered_needs_work'
  | 'gap'
  | 'orphan'
  | 'cannibalization';

export type OverlayStatusColor = 'green' | 'yellow' | 'red' | 'orange' | 'gray';

export interface OverlayMatchedPage {
  inventoryId: string;
  url: string;
  alignmentScore: number;
  gscClicks: number;
  auditScore: number;
}

export interface OverlayNode {
  /** Topic ID (for topic-based nodes) or a synthetic ID for orphan pages */
  id: string;
  /** Display label */
  title: string;
  /** Topic type (core/outer/child) or 'orphan' */
  type: string;
  /** Overlay status classification */
  status: OverlayStatus;
  /** Color mapping for UI rendering */
  statusColor: OverlayStatusColor;
  /** Pages matched to this topic (empty for gaps, single for orphans) */
  matchedPages: OverlayMatchedPage[];
  /** Weighted alignment score (0-100), null for gaps */
  alignmentScore: number | null;
}

// ── Constants ───────────────────────────────────────────────────────────────

/** Alignment threshold: pages scoring at or above this are "aligned" (green) */
const ALIGNMENT_THRESHOLD = 60;

/** Status → color mapping */
const STATUS_COLORS: Record<OverlayStatus, OverlayStatusColor> = {
  covered_aligned: 'green',
  covered_needs_work: 'yellow',
  gap: 'red',
  orphan: 'gray',
  cannibalization: 'orange',
};

// ── Service ─────────────────────────────────────────────────────────────────

export class OverlayService {
  /**
   * Compute the overlay for every topic in the topical map, plus any orphan
   * pages from the site inventory.
   *
   * Classification rules:
   * - **covered_aligned** (green): 1 page mapped, alignment >= 60
   * - **covered_needs_work** (yellow): 1 page mapped, alignment < 60
   * - **gap** (red): no pages mapped to this topic
   * - **cannibalization** (orange): 2+ pages mapped to the same topic
   * - **orphan** (gray): page has no mapped_topic_id
   */
  computeOverlay(input: OverlayInput): OverlayNode[] {
    const { topics, inventory } = input;
    const nodes: OverlayNode[] = [];

    // Group inventory items by mapped_topic_id
    const pagesByTopic = new Map<string, OverlayInventoryItem[]>();
    const orphanPages: OverlayInventoryItem[] = [];

    for (const item of inventory) {
      if (item.mapped_topic_id == null) {
        orphanPages.push(item);
      } else {
        const existing = pagesByTopic.get(item.mapped_topic_id) || [];
        existing.push(item);
        pagesByTopic.set(item.mapped_topic_id, existing);
      }
    }

    // Process each topic
    for (const topic of topics) {
      const mappedPages = pagesByTopic.get(topic.id) || [];

      if (mappedPages.length === 0) {
        // Gap: no pages cover this topic
        nodes.push({
          id: topic.id,
          title: topic.title,
          type: topic.type,
          status: 'gap',
          statusColor: STATUS_COLORS.gap,
          matchedPages: [],
          alignmentScore: null,
        });
      } else if (mappedPages.length >= 2) {
        // Cannibalization: multiple pages compete for the same topic
        const matched = mappedPages.map((p) => this.toMatchedPage(p));
        const avgAlignment = this.averageAlignment(mappedPages);
        nodes.push({
          id: topic.id,
          title: topic.title,
          type: topic.type,
          status: 'cannibalization',
          statusColor: STATUS_COLORS.cannibalization,
          matchedPages: matched,
          alignmentScore: avgAlignment,
        });
      } else {
        // Single page mapped — check alignment
        const page = mappedPages[0];
        const alignment = this.computeAlignmentScore(page);
        const status: OverlayStatus =
          alignment >= ALIGNMENT_THRESHOLD ? 'covered_aligned' : 'covered_needs_work';

        nodes.push({
          id: topic.id,
          title: topic.title,
          type: topic.type,
          status,
          statusColor: STATUS_COLORS[status],
          matchedPages: [this.toMatchedPage(page)],
          alignmentScore: alignment,
        });
      }
    }

    // Add orphan pages as overlay nodes
    for (const page of orphanPages) {
      nodes.push({
        id: `orphan-${page.id}`,
        title: page.url,
        type: 'orphan',
        status: 'orphan',
        statusColor: STATUS_COLORS.orphan,
        matchedPages: [this.toMatchedPage(page)],
        alignmentScore: null,
      });
    }

    return nodes;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Compute a weighted alignment score (0-100) from CE, SC, and CSI alignment
   * fields. Falls back to audit_score if alignment data is missing.
   */
  private computeAlignmentScore(item: OverlayInventoryItem): number {
    const ce = item.ce_alignment;
    const sc = item.sc_alignment;
    const csi = item.csi_alignment;

    if (ce != null && sc != null && csi != null) {
      // Weighted average: CE 40%, SC 30%, CSI 30%
      return Math.round(ce * 0.4 + sc * 0.3 + csi * 0.3);
    }

    // Partial alignment data: average available scores
    const scores = [ce, sc, csi].filter((s): s is number => s != null);
    if (scores.length > 0) {
      return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    // No alignment data — fall back to audit score
    return item.audit_score ?? 0;
  }

  /**
   * Compute the average alignment score across multiple pages.
   */
  private averageAlignment(pages: OverlayInventoryItem[]): number {
    if (pages.length === 0) return 0;
    const total = pages.reduce((sum, p) => sum + this.computeAlignmentScore(p), 0);
    return Math.round(total / pages.length);
  }

  /**
   * Convert an inventory item into an OverlayMatchedPage summary.
   */
  private toMatchedPage(item: OverlayInventoryItem): OverlayMatchedPage {
    return {
      inventoryId: item.id,
      url: item.url,
      alignmentScore: this.computeAlignmentScore(item),
      gscClicks: item.gsc_clicks ?? 0,
      auditScore: item.audit_score ?? 0,
    };
  }
}
