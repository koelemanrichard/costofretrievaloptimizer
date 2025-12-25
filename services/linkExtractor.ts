/**
 * Link Extractor Service
 *
 * Extracts all links from HTML with rich metadata including:
 * - Position (paragraph number, percentage through content)
 * - Context (surrounding text)
 * - Anchor text
 * - Destination classification (internal/external)
 *
 * Research Source: linking in website.md
 *
 * Quote: "Link position, context, and anchor text quality all contribute
 * to how search engines evaluate link value and relevance."
 *
 * Created: December 25, 2024
 *
 * @module services/linkExtractor
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Content location for a link
 */
export interface LinkLocation {
  /** Type of content container */
  type: 'main' | 'nav' | 'header' | 'footer' | 'sidebar' | 'related' | 'unknown';
  /** Paragraph number within content (1-indexed) */
  paragraphNumber: number;
  /** Total paragraphs in content */
  totalParagraphs: number;
  /** Percentage through content (0-100) */
  percentageThrough: number;
  /** Content zone (early: 0-33%, middle: 34-66%, late: 67-100%) */
  zone: 'early' | 'middle' | 'late';
  /** Whether link is in a list item */
  inList: boolean;
  /** Whether link is in a table */
  inTable: boolean;
}

/**
 * Link context - surrounding text
 */
export interface LinkContext {
  /** Text before the anchor */
  textBefore: string;
  /** The anchor text itself */
  anchorText: string;
  /** Text after the anchor */
  textAfter: string;
  /** Full sentence containing the link */
  fullSentence: string;
  /** Heading this link appears under */
  underHeading: string | null;
  /** Whether this is the first word of a paragraph */
  isFirstWord: boolean;
}

/**
 * Extracted link with full metadata
 */
export interface ExtractedLinkData {
  /** The href/URL of the link */
  href: string;
  /** Anchor text */
  anchorText: string;
  /** Whether link is internal */
  isInternal: boolean;
  /** Whether link is external */
  isExternal: boolean;
  /** Link rel attributes */
  rel: string[];
  /** Whether link has nofollow */
  isNofollow: boolean;
  /** Whether link is on an image */
  isImageLink: boolean;
  /** Whether link opens in new tab */
  opensInNewTab: boolean;
  /** Link location in content */
  location: LinkLocation;
  /** Link context */
  context: LinkContext;
  /** Raw HTML of the anchor tag */
  rawHtml: string;
}

/**
 * Link extraction result
 */
export interface LinkExtractionResult {
  /** All extracted links */
  links: ExtractedLinkData[];
  /** Internal links only */
  internalLinks: ExtractedLinkData[];
  /** External links only */
  externalLinks: ExtractedLinkData[];
  /** Links in main content */
  contentLinks: ExtractedLinkData[];
  /** Links in navigation */
  navigationLinks: ExtractedLinkData[];
  /** Total link count */
  totalCount: number;
  /** Unique internal targets */
  uniqueInternalTargets: number;
  /** Unique external domains */
  uniqueExternalDomains: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Check if URL is internal
 */
function isInternalUrl(href: string, pageDomain: string): boolean {
  if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }

  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
    return true;
  }

  try {
    const linkDomain = extractDomain(href);
    return linkDomain === pageDomain;
  } catch {
    return false;
  }
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(href: string, baseUrl: string): string {
  try {
    if (href.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.hostname}${href}`;
    }
    return href;
  } catch {
    return href;
  }
}

/**
 * Detect location type from HTML context
 */
function detectLocationType(html: string, linkPosition: number): LinkLocation['type'] {
  // Get surrounding context
  const start = Math.max(0, linkPosition - 500);
  const context = html.slice(start, linkPosition + 500).toLowerCase();

  // Check for semantic containers
  if (context.includes('<nav') && !context.includes('</nav')) {
    return 'nav';
  }
  if (context.includes('<header') && !context.includes('</header')) {
    return 'header';
  }
  if (context.includes('<footer') && !context.includes('</footer')) {
    return 'footer';
  }
  if (context.includes('<aside') && !context.includes('</aside')) {
    return 'sidebar';
  }
  if (context.includes('related-posts') || context.includes('related-articles') || context.includes('you-might-like')) {
    return 'related';
  }
  if (context.includes('<article') || context.includes('<main')) {
    return 'main';
  }

  return 'unknown';
}

/**
 * Calculate zone from percentage
 */
function calculateZone(percentage: number): 'early' | 'middle' | 'late' {
  if (percentage <= 33) return 'early';
  if (percentage <= 66) return 'middle';
  return 'late';
}

/**
 * Extract text around a position
 */
function extractSurroundingText(text: string, position: number, chars: number = 100): { before: string; after: string } {
  const before = text.slice(Math.max(0, position - chars), position).trim();
  const after = text.slice(position, position + chars).trim();
  return { before, after };
}

/**
 * Find the sentence containing a position
 */
function findContainingSentence(text: string, position: number): string {
  // Find sentence boundaries
  const beforeText = text.slice(0, position);
  const afterText = text.slice(position);

  // Find start of sentence (look for . ! ? followed by space and capital)
  const sentenceStartMatch = beforeText.match(/[.!?]\s+[A-Z][^.!?]*$/);
  const start = sentenceStartMatch ? beforeText.lastIndexOf(sentenceStartMatch[0]) + 2 : 0;

  // Find end of sentence
  const sentenceEndMatch = afterText.match(/[.!?](\s|$)/);
  const end = sentenceEndMatch ? position + sentenceEndMatch.index! + 1 : text.length;

  return text.slice(start, end).trim();
}

/**
 * Check if anchor is at start of paragraph
 */
function isFirstWordOfParagraph(html: string, linkPosition: number, anchorText: string): boolean {
  // Look for paragraph start pattern before this link
  const before = html.slice(Math.max(0, linkPosition - 50), linkPosition);
  const paragraphPatterns = [/<p[^>]*>\s*$/i, /<li[^>]*>\s*$/i, /<div[^>]*>\s*$/i];

  return paragraphPatterns.some(pattern => pattern.test(before));
}

/**
 * Find the heading above a position
 */
function findPrecedingHeading(html: string, position: number): string | null {
  const beforeHtml = html.slice(0, position);

  // Find last heading
  const headingMatch = beforeHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi);
  if (headingMatch && headingMatch.length > 0) {
    const lastHeading = headingMatch[headingMatch.length - 1];
    const textMatch = lastHeading.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
    return textMatch ? textMatch[1].trim() : null;
  }

  return null;
}

/**
 * Extract paragraphs from HTML
 */
function extractParagraphs(html: string): { start: number; end: number; text: string }[] {
  const paragraphs: { start: number; end: number; text: string }[] = [];
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;

  while ((match = paragraphRegex.exec(html)) !== null) {
    paragraphs.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    });
  }

  return paragraphs;
}

/**
 * Get plain text from HTML
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// =============================================================================
// Main Extraction Function
// =============================================================================

/**
 * Extract all links from HTML with full metadata
 */
export function extractLinks(html: string, pageUrl: string): LinkExtractionResult {
  const pageDomain = extractDomain(pageUrl);
  const links: ExtractedLinkData[] = [];
  const paragraphs = extractParagraphs(html);
  const plainText = htmlToText(html);

  // Find all anchor tags
  const linkRegex = /<a\s+([^>]*href\s*=\s*["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const attributes = match[1];
    const href = match[2];
    const innerHtml = match[3];
    const position = match.index;

    // Skip empty hrefs, anchors, javascript, mailto, tel
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    // Extract anchor text
    const anchorText = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Check if image link
    const isImageLink = /<img\s/i.test(innerHtml);

    // Parse rel attribute
    const relMatch = attributes.match(/rel\s*=\s*["']([^"']+)["']/i);
    const rel = relMatch ? relMatch[1].split(/\s+/) : [];
    const isNofollow = rel.includes('nofollow');

    // Check target
    const targetMatch = attributes.match(/target\s*=\s*["']([^"']+)["']/i);
    const opensInNewTab = targetMatch && targetMatch[1] === '_blank';

    // Determine if internal/external
    const isInternal = isInternalUrl(href, pageDomain);
    const isExternal = !isInternal && (href.startsWith('http://') || href.startsWith('https://'));

    // Find which paragraph this link is in
    let paragraphNumber = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      if (position >= paragraphs[i].start && position <= paragraphs[i].end) {
        paragraphNumber = i + 1;
        break;
      }
    }

    const totalParagraphs = paragraphs.length || 1;
    const percentageThrough = paragraphs.length > 0
      ? Math.round((paragraphNumber / totalParagraphs) * 100)
      : Math.round((position / html.length) * 100);

    // Detect location type
    const locationType = detectLocationType(html, position);

    // Check if in list or table
    const contextBefore = html.slice(Math.max(0, position - 200), position).toLowerCase();
    const inList = contextBefore.includes('<li') && !contextBefore.includes('</li');
    const inTable = contextBefore.includes('<td') && !contextBefore.includes('</td');

    // Build location
    const location: LinkLocation = {
      type: locationType,
      paragraphNumber,
      totalParagraphs,
      percentageThrough,
      zone: calculateZone(percentageThrough),
      inList,
      inTable,
    };

    // Extract context
    const textPosition = plainText.indexOf(anchorText);
    const { before: textBefore, after: textAfter } = extractSurroundingText(plainText, textPosition, 80);
    const fullSentence = findContainingSentence(plainText, textPosition);
    const underHeading = findPrecedingHeading(html, position);
    const isFirstWord = isFirstWordOfParagraph(html, position, anchorText);

    const context: LinkContext = {
      textBefore,
      anchorText,
      textAfter,
      fullSentence,
      underHeading,
      isFirstWord,
    };

    links.push({
      href: normalizeUrl(href, pageUrl),
      anchorText,
      isInternal,
      isExternal,
      rel,
      isNofollow,
      isImageLink,
      opensInNewTab: opensInNewTab || false,
      location,
      context,
      rawHtml: fullMatch,
    });
  }

  // Categorize links
  const internalLinks = links.filter(l => l.isInternal);
  const externalLinks = links.filter(l => l.isExternal);
  const contentLinks = links.filter(l => l.location.type === 'main' || l.location.type === 'unknown');
  const navigationLinks = links.filter(l => ['nav', 'header', 'footer', 'sidebar'].includes(l.location.type));

  // Count unique targets
  const uniqueInternalTargets = new Set(internalLinks.map(l => l.href)).size;
  const uniqueExternalDomains = new Set(externalLinks.map(l => extractDomain(l.href))).size;

  return {
    links,
    internalLinks,
    externalLinks,
    contentLinks,
    navigationLinks,
    totalCount: links.length,
    uniqueInternalTargets,
    uniqueExternalDomains,
  };
}

/**
 * Quick link count without full extraction
 */
export function quickLinkCount(html: string, pageUrl: string): {
  total: number;
  internal: number;
  external: number;
} {
  const pageDomain = extractDomain(pageUrl);
  let total = 0;
  let internal = 0;
  let external = 0;

  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }
    total++;
    if (isInternalUrl(href, pageDomain)) {
      internal++;
    } else if (href.startsWith('http://') || href.startsWith('https://')) {
      external++;
    }
  }

  return { total, internal, external };
}

// =============================================================================
// Export
// =============================================================================

export default {
  extractLinks,
  quickLinkCount,
};
