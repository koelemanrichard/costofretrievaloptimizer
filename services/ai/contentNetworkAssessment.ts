/**
 * Content Network Assessment Service
 *
 * Analyzes a collection of pages to assess the content network structure,
 * identifying page types, orphan pages, hub-spoke clarity, publishing
 * frequency, and content gaps.
 */

export interface ContentNetworkPage {
  url: string;
  title?: string;
  type?: string; // 'service', 'product', 'blog', 'about', 'utility'
  publishDate?: string;
  internalLinksTo?: string[];
  internalLinksFrom?: string[];
  parent?: string;
  children?: string[];
}

export interface ContentNetworkResult {
  totalPages: number;
  corePages: string[];        // service/product pages
  authorPages: string[];       // blog/knowledge pages
  utilityPages: string[];      // about/contact/privacy
  orphanPages: string[];       // no links in or out (both arrays empty, length 0)
  hubSpokeClarity: number;     // 0-100 (% of pages with parent/children)
  publishingFrequency: string; // daily/weekly/bi-weekly/monthly/irregular/unknown
  contentGaps: string[];
}

const CORE_URL_PATTERNS = [
  /\/services?\//i,
  /\/products?\//i,
  /\/solutions?\//i,
  /\/offerings?\//i,
];

const AUTHOR_URL_PATTERNS = [
  /\/blog\//i,
  /\/blogs?\//i,
  /\/articles?\//i,
  /\/news\//i,
  /\/resources?\//i,
  /\/knowledge-?base\//i,
  /\/learn\//i,
  /\/guides?\//i,
];

const UTILITY_URL_PATTERNS = [
  /\/about/i,
  /\/contact/i,
  /\/privacy/i,
  /\/terms/i,
  /\/legal/i,
  /\/faq/i,
  /\/careers/i,
  /\/team/i,
  /\/sitemap/i,
  /\/cookie/i,
  /\/imprint/i,
  /\/disclaimer/i,
];

function classifyPage(page: ContentNetworkPage): 'core' | 'author' | 'utility' | 'unknown' {
  // Explicit type field takes precedence
  if (page.type) {
    const t = page.type.toLowerCase();
    if (t === 'service' || t === 'product') return 'core';
    if (t === 'blog' || t === 'article' || t === 'knowledge') return 'author';
    if (t === 'about' || t === 'utility' || t === 'contact' || t === 'privacy') return 'utility';
  }

  // URL pattern matching
  const url = page.url;
  if (CORE_URL_PATTERNS.some(p => p.test(url))) return 'core';
  if (AUTHOR_URL_PATTERNS.some(p => p.test(url))) return 'author';
  if (UTILITY_URL_PATTERNS.some(p => p.test(url))) return 'utility';

  return 'unknown';
}

function isOrphan(page: ContentNetworkPage): boolean {
  // Only flag as orphan if BOTH arrays are explicitly provided and empty
  // If either is undefined, we don't have enough data to determine orphan status
  if (!Array.isArray(page.internalLinksTo) || !Array.isArray(page.internalLinksFrom)) {
    return false;
  }
  return page.internalLinksTo.length === 0 && page.internalLinksFrom.length === 0;
}

function calculateHubSpokeClarity(pages: ContentNetworkPage[]): number {
  if (pages.length === 0) return 0;
  const pagesWithHierarchy = pages.filter(
    p => (p.parent && p.parent.length > 0) || (p.children && p.children.length > 0)
  );
  return Math.round((pagesWithHierarchy.length / pages.length) * 100);
}

function calculatePublishingFrequency(pages: ContentNetworkPage[]): string {
  const dates = pages
    .map(p => p.publishDate)
    .filter((d): d is string => !!d)
    .map(d => new Date(d).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  if (dates.length < 2) return 'unknown';

  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    intervals.push(dates[i] - dates[i - 1]);
  }

  const avgIntervalMs = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
  const avgDays = avgIntervalMs / (1000 * 60 * 60 * 24);

  // Check variance to detect irregular patterns
  const variance = intervals.reduce((sum, v) => {
    const diffDays = v / (1000 * 60 * 60 * 24);
    return sum + Math.pow(diffDays - avgDays, 2);
  }, 0) / intervals.length;
  const stdDevDays = Math.sqrt(variance);

  // If standard deviation is more than the mean, publishing is irregular
  if (stdDevDays > avgDays && avgDays > 0) return 'irregular';

  if (avgDays <= 2) return 'daily';
  if (avgDays <= 10) return 'weekly';
  if (avgDays <= 21) return 'bi-weekly';
  if (avgDays <= 45) return 'monthly';
  return 'irregular';
}

function detectContentGaps(
  corePages: string[],
  authorPages: string[],
  orphanPages: string[],
  totalPages: number
): string[] {
  if (totalPages === 0) return [];

  const gaps: string[] = [];

  if (corePages.length === 0) {
    gaps.push('No service or product pages detected');
  }

  if (authorPages.length === 0) {
    gaps.push('No blog or knowledge content detected');
  }

  if (totalPages > 0) {
    const orphanRatio = orphanPages.length / totalPages;
    if (orphanRatio > 0.2) {
      gaps.push(`High orphan page ratio (${Math.round(orphanRatio * 100)}% of pages have no internal links)`);
    }
  }

  return gaps;
}

export function assessContentNetwork(pages: ContentNetworkPage[]): ContentNetworkResult {
  const corePages: string[] = [];
  const authorPages: string[] = [];
  const utilityPages: string[] = [];
  const orphanPages: string[] = [];

  for (const page of pages) {
    const classification = classifyPage(page);
    switch (classification) {
      case 'core':
        corePages.push(page.url);
        break;
      case 'author':
        authorPages.push(page.url);
        break;
      case 'utility':
        utilityPages.push(page.url);
        break;
    }

    if (isOrphan(page)) {
      orphanPages.push(page.url);
    }
  }

  const hubSpokeClarity = calculateHubSpokeClarity(pages);
  const publishingFrequency = calculatePublishingFrequency(pages);
  const contentGaps = detectContentGaps(corePages, authorPages, orphanPages, pages.length);

  return {
    totalPages: pages.length,
    corePages,
    authorPages,
    utilityPages,
    orphanPages,
    hubSpokeClarity,
    publishingFrequency,
    contentGaps,
  };
}
