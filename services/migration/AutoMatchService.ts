import type { SiteInventoryItem, EnrichedTopic } from '../../types';

// ── Result interfaces ──────────────────────────────────────────────────────

export interface MatchSignal {
  type: 'h1' | 'title' | 'url_slug' | 'gsc_query' | 'content_body' | 'heading_keywords';
  score: number;
  detail: string;
}

export interface MatchResult {
  inventoryId: string;
  topicId: string | null;       // null = orphan
  confidence: number;           // 0.0 - 1.0
  matchSignals: MatchSignal[];  // which signals contributed
  category: 'matched' | 'orphan' | 'cannibalization';
  competingUrls?: string[];     // for cannibalization
}

export interface GapTopic {
  topicId: string;
  topicTitle: string;
  importance: 'pillar' | 'supporting';
}

export interface AutoMatchResult {
  matches: MatchResult[];
  gaps: GapTopic[];
  stats: {
    matched: number;
    orphans: number;
    cannibalization: number;
    gaps: number;
  };
}

// ── Signal weights ─────────────────────────────────────────────────────────

const SIGNAL_WEIGHTS: Record<MatchSignal['type'], number> = {
  h1: 0.30,
  title: 0.25,
  url_slug: 0.20,
  gsc_query: 0.25,
  content_body: 0,       // not used in the current algorithm
  heading_keywords: 0,   // not used in the current algorithm
};

const MATCH_THRESHOLD = 0.4;
const CANNIBALIZATION_THRESHOLD = 0.3;

// ── Text utilities ─────────────────────────────────────────────────────────

/** Lowercase, trim, and split text into word tokens. Removes empty strings. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Classic Jaccard similarity: |A ∩ B| / |A ∪ B|. Returns 0 if both sets are empty. */
function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionSize++;
  }
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * Extract path tokens from a URL.
 * e.g. "https://example.com/services/plumbing-services/" → ['services', 'plumbing', 'services']
 */
function extractUrlSlugTokens(url: string): string[] {
  try {
    const pathname = new URL(url).pathname;
    return tokenize(pathname.replace(/\//g, ' '));
  } catch {
    // If URL parsing fails, try a best-effort extraction
    const slugPart = url.replace(/^https?:\/\/[^/]+/, '');
    return tokenize(slugPart.replace(/\//g, ' '));
  }
}

/**
 * Compute set intersection ratio: |A ∩ B| / max(|A|, |B|).
 * Used for GSC query matching where we want to measure how much of the
 * query set overlaps with topic keywords rather than pure Jaccard.
 */
function setIntersectionScore(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionSize++;
  }
  const maxSize = Math.max(setA.size, setB.size);
  return maxSize === 0 ? 0 : intersectionSize / maxSize;
}

// ── Topic preparation ──────────────────────────────────────────────────────

interface PreparedTopic {
  id: string;
  title: string;
  titleTokens: string[];
  slugTokens: string[];
  keywordTokens: string[];
  clusterRole: 'pillar' | 'cluster_content' | undefined;
  type: 'core' | 'outer' | 'child';
}

function prepareTopic(topic: EnrichedTopic): PreparedTopic {
  const titleTokens = tokenize(topic.title);
  const slugTokens = topic.slug ? tokenize(topic.slug.replace(/-/g, ' ')) : titleTokens;

  // Combine keywords, query_network, and canonical_query for a rich keyword set
  const keywordParts: string[] = [];
  if (topic.keywords && topic.keywords.length > 0) {
    keywordParts.push(...topic.keywords);
  }
  if (topic.query_network && topic.query_network.length > 0) {
    keywordParts.push(...topic.query_network);
  }
  if (topic.canonical_query) {
    keywordParts.push(topic.canonical_query);
  }
  const keywordTokens = keywordParts.length > 0
    ? tokenize(keywordParts.join(' '))
    : titleTokens; // fall back to title tokens if no keywords

  return {
    id: topic.id,
    title: topic.title,
    titleTokens,
    slugTokens,
    keywordTokens,
    clusterRole: topic.cluster_role,
    type: topic.type,
  };
}

// ── Core matching ──────────────────────────────────────────────────────────

/**
 * Compute match signals between a single inventory item and a single topic.
 * Returns the signals and a weighted confidence score.
 */
function computeSignals(
  item: SiteInventoryItem,
  topic: PreparedTopic,
  gscQueries?: string[],
): { confidence: number; signals: MatchSignal[] } {
  const signals: MatchSignal[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  // 1. H1 ↔ topic title (Jaccard)
  if (item.page_h1) {
    const h1Tokens = tokenize(item.page_h1);
    const score = jaccard(h1Tokens, topic.titleTokens);
    signals.push({
      type: 'h1',
      score,
      detail: `H1 "${item.page_h1}" vs topic "${topic.title}"`,
    });
    weightedSum += score * SIGNAL_WEIGHTS.h1;
    totalWeight += SIGNAL_WEIGHTS.h1;
  }

  // 2. Page title ↔ topic title (Jaccard)
  if (item.page_title) {
    const titleTokens = tokenize(item.page_title);
    const score = jaccard(titleTokens, topic.titleTokens);
    signals.push({
      type: 'title',
      score,
      detail: `Page title "${item.page_title}" vs topic "${topic.title}"`,
    });
    weightedSum += score * SIGNAL_WEIGHTS.title;
    totalWeight += SIGNAL_WEIGHTS.title;
  }

  // 3. URL slug ↔ topic slug/keywords (token overlap via Jaccard)
  const urlTokens = extractUrlSlugTokens(item.url);
  if (urlTokens.length > 0) {
    // Compare against both slug tokens and keyword tokens, take the best
    const slugScore = jaccard(urlTokens, topic.slugTokens);
    const keywordScore = jaccard(urlTokens, topic.keywordTokens);
    const score = Math.max(slugScore, keywordScore);
    signals.push({
      type: 'url_slug',
      score,
      detail: `URL tokens [${urlTokens.join(', ')}] vs topic slug/keywords`,
    });
    weightedSum += score * SIGNAL_WEIGHTS.url_slug;
    totalWeight += SIGNAL_WEIGHTS.url_slug;
  }

  // 4. GSC queries ↔ topic keywords (set intersection)
  if (gscQueries && gscQueries.length > 0) {
    const queryTokens = tokenize(gscQueries.join(' '));
    const score = setIntersectionScore(queryTokens, topic.keywordTokens);
    signals.push({
      type: 'gsc_query',
      score,
      detail: `${gscQueries.length} GSC queries vs topic keywords`,
    });
    weightedSum += score * SIGNAL_WEIGHTS.gsc_query;
    totalWeight += SIGNAL_WEIGHTS.gsc_query;
  }

  // Normalize confidence to account for missing signals
  const confidence = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return { confidence, signals };
}

// ── Public API ─────────────────────────────────────────────────────────────

export class AutoMatchService {
  /**
   * Match inventory URLs to topical map topics using multiple text similarity signals.
   *
   * Pure synchronous function — no network calls, no side effects.
   */
  match(
    inventory: SiteInventoryItem[],
    topics: EnrichedTopic[],
    gscQueries?: Map<string, string[]>,
  ): AutoMatchResult {
    // Pre-process topics for efficient comparison
    const preparedTopics = topics.map(prepareTopic);

    // Track which topics have been matched (topicId → best match(es))
    const topicMatchMap = new Map<string, { inventoryId: string; url: string; confidence: number }[]>();

    const matches: MatchResult[] = [];

    // ── Phase 1: Find best topic for each inventory URL ─────────────
    for (const item of inventory) {
      const itemGscQueries = gscQueries?.get(item.url);

      let bestTopicId: string | null = null;
      let bestConfidence = 0;
      let bestSignals: MatchSignal[] = [];

      for (const topic of preparedTopics) {
        const { confidence, signals } = computeSignals(item, topic, itemGscQueries);

        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestTopicId = topic.id;
          bestSignals = signals;
        }
      }

      if (bestConfidence >= MATCH_THRESHOLD && bestTopicId) {
        // Register this URL as a match for the topic
        const existing = topicMatchMap.get(bestTopicId) || [];
        existing.push({ inventoryId: item.id, url: item.url, confidence: bestConfidence });
        topicMatchMap.set(bestTopicId, existing);

        matches.push({
          inventoryId: item.id,
          topicId: bestTopicId,
          confidence: bestConfidence,
          matchSignals: bestSignals,
          category: 'matched', // may be updated to cannibalization in Phase 2
        });
      } else {
        // Orphan — no topic matched above threshold
        matches.push({
          inventoryId: item.id,
          topicId: null,
          confidence: bestConfidence,
          matchSignals: bestSignals,
          category: 'orphan',
        });
      }
    }

    // ── Phase 2: Detect cannibalization ─────────────────────────────
    // Multiple URLs matching the same topic with confidence > CANNIBALIZATION_THRESHOLD
    for (const [topicId, matchEntries] of topicMatchMap.entries()) {
      if (matchEntries.length <= 1) continue;

      // All entries above the cannibalization threshold → mark as cannibalization
      const competingEntries = matchEntries.filter((e) => e.confidence >= CANNIBALIZATION_THRESHOLD);
      if (competingEntries.length <= 1) continue;

      const competingUrls = competingEntries.map((e) => e.url);

      for (const entry of competingEntries) {
        const matchResult = matches.find(
          (m) => m.inventoryId === entry.inventoryId && m.topicId === topicId,
        );
        if (matchResult) {
          matchResult.category = 'cannibalization';
          matchResult.competingUrls = competingUrls.filter((u) => {
            // Find the inventoryId for this URL to exclude self
            const selfEntry = competingEntries.find((e) => e.url === u);
            return selfEntry?.inventoryId !== entry.inventoryId;
          });
        }
      }
    }

    // ── Phase 3: Identify gap topics (no matching URL) ──────────────
    const matchedTopicIds = new Set(
      matches
        .filter((m) => m.topicId !== null && m.category !== 'orphan')
        .map((m) => m.topicId!),
    );

    const gaps: GapTopic[] = [];
    for (const topic of preparedTopics) {
      if (!matchedTopicIds.has(topic.id)) {
        gaps.push({
          topicId: topic.id,
          topicTitle: topic.title,
          importance: topic.clusterRole === 'pillar' || topic.type === 'core'
            ? 'pillar'
            : 'supporting',
        });
      }
    }

    // ── Compute stats ───────────────────────────────────────────────
    const stats = {
      matched: matches.filter((m) => m.category === 'matched').length,
      orphans: matches.filter((m) => m.category === 'orphan').length,
      cannibalization: matches.filter((m) => m.category === 'cannibalization').length,
      gaps: gaps.length,
    };

    return { matches, gaps, stats };
  }
}
