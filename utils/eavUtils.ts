// utils/eavUtils.ts
// Utility functions for extracting structured data from EAV triples

import type { SemanticTriple, EnrichedTopic } from '../types';

/**
 * Service-related predicate patterns.
 * Matches predicates that indicate the entity offers/provides a service or product.
 */
const SERVICE_PREDICATE_PATTERNS = [
  'offers', 'provides', 'specializes', 'service', 'performs',
  'has_feature', 'solution', 'delivers', 'supplies', 'installs',
];

const SERVICE_PREDICATE_EXACT = [
  'offers_service', 'provides_solution', 'has_feature', 'specializes_in',
  'offers_product', 'provides_service', 'performs_service',
];

const SERVICE_CLASSIFICATIONS = new Set(['COMPONENT', 'BENEFIT']);

/**
 * Extract business services/products from EAV triples.
 *
 * Strategy:
 * 1. Exact predicate match (offers_service, provides_solution, etc.)
 * 2. Predicate contains service keyword (offers, provides, etc.)
 * 3. COMPONENT/BENEFIT classification where subject matches CE
 * 4. Deduplicate by normalized object value
 */
export function extractServicesFromEavs(
  eavs: SemanticTriple[],
  centralEntity: string
): string[] {
  if (!eavs || eavs.length === 0) return [];

  const ceLower = centralEntity.toLowerCase();
  const seen = new Set<string>();
  const services: string[] = [];

  const addService = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (normalized && normalized.length > 1 && !seen.has(normalized)) {
      seen.add(normalized);
      services.push(value.trim());
    }
  };

  for (const eav of eavs) {
    const predicate = (eav.predicate?.relation || eav.attribute || '').toLowerCase();
    const objectValue = String(eav.object?.value ?? eav.value ?? '');
    const subjectLabel = (eav.subject?.label || eav.entity || '').toLowerCase();
    const classification = eav.predicate?.classification || eav.classification;

    if (!objectValue.trim()) continue;

    // 1. Exact predicate match
    if (SERVICE_PREDICATE_EXACT.some(p => predicate === p)) {
      addService(objectValue);
      continue;
    }

    // 2. Predicate contains service keyword
    if (SERVICE_PREDICATE_PATTERNS.some(p => predicate.includes(p))) {
      addService(objectValue);
      continue;
    }

    // 3. COMPONENT/BENEFIT classification where subject matches CE
    if (
      classification &&
      SERVICE_CLASSIFICATIONS.has(classification) &&
      (subjectLabel.includes(ceLower) || ceLower.includes(subjectLabel))
    ) {
      addService(objectValue);
    }
  }

  return services;
}

/**
 * Summarize EAVs for prompt inclusion.
 * Prioritizes UNIQUE/RARE over COMMON/ROOT to preserve differentiating attributes.
 *
 * - For ≤30 EAVs: include all
 * - For >30 EAVs: all UNIQUE/RARE + first 20 COMMON/ROOT
 */
export function summarizeEavsForPrompt(eavs: SemanticTriple[]): string {
  if (!eavs || eavs.length === 0) return '[]';

  if (eavs.length <= 30) {
    return JSON.stringify(eavs, null, 2);
  }

  const priorityCategories = new Set(['UNIQUE', 'RARE', 'CORE_DEFINITION', 'SEARCH_DEMAND']);
  const priority: SemanticTriple[] = [];
  const standard: SemanticTriple[] = [];

  for (const eav of eavs) {
    const category = eav.predicate?.category || eav.category || 'UNCLASSIFIED';
    if (priorityCategories.has(category)) {
      priority.push(eav);
    } else {
      standard.push(eav);
    }
  }

  const result = [...priority, ...standard.slice(0, 20)];
  return JSON.stringify(result, null, 2);
}

// ── ServiceWithPage: matches services to existing crawled URLs ──

export interface ServiceWithPage {
  name: string;           // e.g. "Bitumen Dakbedekking"
  existingUrl?: string;   // e.g. "https://example.nl/bitumen-dakbedekking/"
  existingTitle?: string; // Page <title> or H1 if available
  existingSlug?: string;  // e.g. "bitumen-dakbedekking"
}

/**
 * Match business services to existing crawled URLs.
 * For each service, finds the best-matching URL based on word overlap.
 */
export function matchServicesToExistingUrls(
  services: string[],
  crawledUrls: string[],
  siteInventory?: Array<{ url: string; title?: string }>
): ServiceWithPage[] {
  if (!services.length) return [];

  // Parse crawled URLs into pathname + word tokens
  const crawledEntries = crawledUrls.map(url => {
    let pathname: string;
    try {
      pathname = new URL(url).pathname.replace(/\/$/, '').toLowerCase();
    } catch {
      pathname = url.replace(/\/$/, '').toLowerCase();
    }
    return { url, pathname, words: extractPathWords(pathname) };
  });

  // Build title lookup from siteInventory
  const titleByUrl = new Map<string, string>();
  if (siteInventory) {
    for (const item of siteInventory) {
      if (item.title) titleByUrl.set(item.url, item.title);
    }
  }

  return services.map(serviceName => {
    const result: ServiceWithPage = { name: serviceName };

    if (!crawledEntries.length) return result;

    // Normalize service name into word tokens
    const serviceWords = serviceName
      .toLowerCase()
      .split(/[\s\-_/]+/)
      .filter(w => w.length > 2 && !SLUG_STOP_WORDS.has(w));

    if (serviceWords.length === 0) return result;

    // Find best matching URL by word overlap
    let bestMatch: { url: string; pathname: string; overlap: number } | null = null;
    for (const entry of crawledEntries) {
      if (entry.words.length === 0) continue;
      const overlap = serviceWords.filter(w => entry.words.includes(w)).length;
      // Require at least 1 meaningful word match (service names are often short)
      if (overlap >= 1 && (!bestMatch || overlap > bestMatch.overlap)) {
        bestMatch = { url: entry.url, pathname: entry.pathname, overlap };
      }
    }

    if (bestMatch) {
      result.existingUrl = bestMatch.url;
      // Extract slug from pathname (last segment)
      const segments = bestMatch.pathname.split('/').filter(Boolean);
      result.existingSlug = segments[segments.length - 1] || undefined;
      // Pull title from siteInventory if available, else derive from slug
      result.existingTitle = titleByUrl.get(bestMatch.url)
        || (result.existingSlug
          ? result.existingSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : undefined);
    }

    return result;
  });
}

/**
 * Format ServiceWithPage[] for prompt inclusion.
 * Separates services into existing-page vs new categories.
 */
export function formatServicesForPrompt(services: ServiceWithPage[]): string {
  const withPages = services.filter(s => s.existingUrl);
  const withoutPages = services.filter(s => !s.existingUrl);

  let block = '**Business Services/Products — EXISTING PAGES ARE YOUR HUB ANCHORS:**\n\n';

  if (withPages.length > 0) {
    block += 'Services with EXISTING pages on the website (these ARE your hub topics — do NOT create new hubs):\n';
    withPages.forEach((s, i) => {
      const slug = s.existingSlug || new URL(s.existingUrl!).pathname.replace(/^\/|\/$/g, '');
      block += `${i + 1}. "${s.name}" → EXISTING: /${slug}/ — Use this slug as url_slug_hint\n`;
    });
    block += '\n';
  }

  if (withoutPages.length > 0) {
    block += 'Services WITHOUT existing pages (create new hub topics for these):\n';
    withoutPages.forEach((s, i) => {
      block += `${withPages.length + i + 1}. "${s.name}" → NEW — Create a hub topic\n`;
    });
    block += '\n';
  }

  block += `RULES:
- For EXISTING services: adopt the existing slug as url_slug_hint. Hub title should match the existing page.
- For NEW services: create a new hub topic as normal.
- ALL spokes must support their parent hub. Spokes are bridge content, not standalone pages.
- MANDATORY: Every service listed above MUST have at least one dedicated hub topic.
`;

  return block;
}

// ── Stop words to exclude from slug matching ──
const SLUG_STOP_WORDS = new Set([
  'the', 'and', 'for', 'van', 'het', 'een', 'des', 'der', 'die', 'das',
  'mit', 'und', 'fur', 'les', 'des', 'aux', 'pour', 'con', 'del', 'los',
  'wat', 'hoe', 'over', 'met', 'bij', 'naar', 'uit', 'als',
  'what', 'how', 'about', 'with', 'from', 'your', 'our', 'best', 'top',
]);

/**
 * Extract meaningful words from a URL path or slug.
 * Splits on slashes and hyphens, filters short/stop words.
 */
function extractPathWords(path: string): string[] {
  return path
    .toLowerCase()
    .split(/[/\-_]+/)
    .filter(w => w.length > 2 && !SLUG_STOP_WORDS.has(w));
}

/**
 * Match topics to existing crawled URLs by slug similarity
 * and set `target_url` on matched topics (mutates in-place).
 *
 * Matching strategy (mirrors ExistingPageMappingPanel logic):
 * 1. Exact slug match → set target_url
 * 2. Partial match (≥2 meaningful word overlap) → set target_url to best match
 */
export function matchTopicsToExistingUrls(
  topics: EnrichedTopic[],
  crawledUrls: string[],
  domain?: string
): void {
  if (!crawledUrls.length) return;

  // Parse crawled URLs into pathname + word tokens
  const crawledEntries = crawledUrls.map(url => {
    let pathname: string;
    try {
      pathname = new URL(url).pathname.replace(/\/$/, '').toLowerCase();
    } catch {
      pathname = url.replace(/\/$/, '').toLowerCase();
    }
    return { url, pathname, words: extractPathWords(pathname) };
  });

  // Build a Set of normalized pathnames for fast exact-match lookup
  const crawledPathSet = new Set(crawledEntries.map(e => e.pathname));

  for (const topic of topics) {
    // Skip topics that already have a target_url
    if (topic.target_url) continue;

    const slug = topic.slug;
    if (!slug) continue;

    const normalizedSlug = `/${slug.replace(/^\//, '')}`.toLowerCase();

    // 1. Exact match
    if (crawledPathSet.has(normalizedSlug)) {
      const matched = crawledEntries.find(e => e.pathname === normalizedSlug);
      if (matched) {
        topic.target_url = matched.url;
        continue;
      }
    }

    // 2. Partial match — find best crawled URL by word overlap
    const slugWords = extractPathWords(slug);
    if (slugWords.length < 2) continue; // Need at least 2 words to partial-match

    let bestMatch: { url: string; overlap: number } | null = null;
    for (const entry of crawledEntries) {
      if (entry.words.length === 0) continue;
      const overlap = slugWords.filter(w => entry.words.includes(w)).length;
      if (overlap >= 2 && (!bestMatch || overlap > bestMatch.overlap)) {
        bestMatch = { url: entry.url, overlap };
      }
    }

    if (bestMatch) {
      topic.target_url = bestMatch.url;
    }
  }
}
