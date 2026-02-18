/**
 * AnchorSegmentChainValidator
 *
 * Validates anchor text segment chains and LIFT model ordering in HTML content.
 * Checks for descriptive anchor text, contextual annotation quality, link
 * placement within sections, link density, and duplicate anchor-destination pairs.
 *
 * Rules implemented:
 *   ASC-1 - Generic anchor text (non-descriptive phrases like "click here")
 *   ASC-2 - Poor annotation context around links (< 10 words surrounding)
 *   ASC-3 - Link in first sentence of a section (too early placement)
 *   ASC-4 - Link density outside 1 per 100-200 words range
 *   ASC-5 - Same anchor text used >2x for the same destination URL
 */

export interface LinkChainIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

/**
 * Generic anchor text patterns that provide no descriptive value to
 * users or search engines.
 */
const GENERIC_ANCHOR_PATTERNS = [
  /^click\s+here$/i,
  /^here$/i,
  /^read\s+more$/i,
  /^learn\s+more$/i,
  /^more$/i,
  /^see\s+more$/i,
  /^this$/i,
  /^link$/i,
  /^this\s+link$/i,
  /^this\s+page$/i,
  /^go$/i,
  /^continue$/i,
  /^details$/i,
  /^more\s+info$/i,
  /^more\s+information$/i,
  /^find\s+out\s+more$/i,
  /^check\s+it\s+out$/i,
];

interface ExtractedLink {
  href: string;
  anchor: string;
  /** Plain-text context surrounding the link (approx 150 chars each side) */
  context: string;
  /** Index position in the HTML string */
  position: number;
}

export class AnchorSegmentChainValidator {
  validate(html: string, pageUrl?: string): LinkChainIssue[] {
    const issues: LinkChainIssue[] = [];
    const links = this.extractLinks(html, pageUrl);
    const wordCount = this.countWords(html);

    this.checkGenericAnchors(links, issues);
    this.checkAnnotationContext(links, issues);
    this.checkFirstSentencePlacement(html, links, issues);
    this.checkLinkDensity(links, wordCount, issues);
    this.checkDuplicateAnchorDestination(links, issues);

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Link extraction
  // ---------------------------------------------------------------------------

  /**
   * Extract all anchor elements from the HTML. If a pageUrl is provided,
   * resolves relative hrefs against it.
   */
  private extractLinks(html: string, pageUrl?: string): ExtractedLink[] {
    const links: ExtractedLink[] = [];
    const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1];

      // Resolve relative URLs if a page URL is available
      if (pageUrl && !/^https?:\/\//i.test(href) && !href.startsWith('mailto:') && !href.startsWith('#')) {
        try {
          href = new URL(href, pageUrl).href;
        } catch {
          // keep original href if URL resolution fails
        }
      }

      const anchor = match[2].replace(/<[^>]+>/g, '').trim();

      // Get surrounding context (150 chars before and after)
      const contextStart = Math.max(0, match.index - 150);
      const contextEnd = Math.min(html.length, match.index + match[0].length + 150);
      const context = html
        .slice(contextStart, contextEnd)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      links.push({
        href,
        anchor,
        context,
        position: match.index,
      });
    }

    return links;
  }

  // ---------------------------------------------------------------------------
  // Rule ASC-1: Generic anchor text
  // ---------------------------------------------------------------------------

  private checkGenericAnchors(links: ExtractedLink[], issues: LinkChainIssue[]): void {
    const genericLinks: ExtractedLink[] = [];

    for (const link of links) {
      if (!link.anchor) continue;
      const isGeneric = GENERIC_ANCHOR_PATTERNS.some(pattern => pattern.test(link.anchor));
      if (isGeneric) {
        genericLinks.push(link);
      }
    }

    if (genericLinks.length > 0) {
      const examples = genericLinks
        .slice(0, 3)
        .map(l => `"${l.anchor}"`)
        .join(', ');

      issues.push({
        ruleId: 'rule-asc-1',
        severity: 'high',
        title: 'Generic anchor text detected',
        description:
          `${genericLinks.length} link(s) use non-descriptive anchor text (${examples}). ` +
          'Generic anchors provide no topical signal to search engines and reduce the ' +
          'semantic value of internal links.',
        affectedElement: genericLinks[0]?.anchor,
        exampleFix:
          'Replace generic text with descriptive phrases that indicate the linked page\'s topic. ' +
          'E.g., instead of "click here", use "our guide to topical authority".',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule ASC-2: Annotation context quality
  // ---------------------------------------------------------------------------

  private checkAnnotationContext(links: ExtractedLink[], issues: LinkChainIssue[]): void {
    if (links.length === 0) return;

    let poorContextCount = 0;

    for (const link of links) {
      // Skip links with empty anchors (e.g., image links)
      if (!link.anchor) continue;

      // Count words in the context excluding the anchor text itself
      const contextWithoutAnchor = link.context
        .replace(link.anchor, '')
        .trim();
      const contextWords = contextWithoutAnchor
        .split(/\s+/)
        .filter(w => w.length > 0).length;

      // A link should have at least 10 surrounding context words
      if (contextWords < 10) {
        poorContextCount++;
      }
    }

    const textLinks = links.filter(l => l.anchor.length > 0);
    if (textLinks.length > 0 && poorContextCount > textLinks.length * 0.3) {
      issues.push({
        ruleId: 'rule-asc-2',
        severity: 'medium',
        title: 'Links lack surrounding annotation context',
        description:
          `${poorContextCount} of ${textLinks.length} link(s) have fewer than 10 words of surrounding context. ` +
          'Links should be embedded within sentences that explain the relationship between the current ' +
          'page and the linked resource.',
        exampleFix:
          'Place each link within a complete sentence that provides context about why the reader ' +
          'should follow the link. E.g., "For a deeper dive into keyword clustering, see our ' +
          'comprehensive clustering guide."',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule ASC-3: No links in first sentence of a section
  // ---------------------------------------------------------------------------

  private checkFirstSentencePlacement(
    html: string,
    links: ExtractedLink[],
    issues: LinkChainIssue[]
  ): void {
    if (links.length === 0) return;

    // Find all sections: content after heading tags
    const sectionPattern = /<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi;
    const headingPositions: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = sectionPattern.exec(html)) !== null) {
      // Record the end position of each heading (where section content starts)
      headingPositions.push(match.index + match[0].length);
    }

    let firstSentenceLinkCount = 0;

    for (const headingEnd of headingPositions) {
      // Extract text after the heading up to the first sentence boundary
      const afterHeading = html.slice(headingEnd, headingEnd + 500);
      const plainText = afterHeading.replace(/<[^>]+>/g, ' ').trim();

      // Find the first sentence end (period, exclamation, or question mark
      // followed by a space or end-of-string)
      const sentenceEndMatch = plainText.match(/[.!?](\s|$)/);
      const firstSentenceEnd = sentenceEndMatch
        ? headingEnd + (afterHeading.indexOf(sentenceEndMatch[0]) > -1
            ? afterHeading.replace(/<[^>]+>/g, ' ').indexOf(sentenceEndMatch[0])
            : 200)
        : headingEnd + 200;

      // Check if any link falls within this first sentence region
      for (const link of links) {
        if (link.position > headingEnd && link.position < headingEnd + firstSentenceEnd) {
          firstSentenceLinkCount++;
        }
      }
    }

    if (firstSentenceLinkCount > 0) {
      issues.push({
        ruleId: 'rule-asc-3',
        severity: 'low',
        title: 'Links placed in the first sentence of a section',
        description:
          `${firstSentenceLinkCount} link(s) appear in the first sentence after a heading. ` +
          'The LIFT model recommends establishing context before presenting a link so ' +
          'readers understand why the linked resource is relevant.',
        affectedElement: `${firstSentenceLinkCount} early-placed link(s)`,
        exampleFix:
          'Move the link to the second or subsequent sentence of the section, ' +
          'after establishing the section\'s context.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule ASC-4: Link density
  // ---------------------------------------------------------------------------

  private checkLinkDensity(
    links: ExtractedLink[],
    wordCount: number,
    issues: LinkChainIssue[]
  ): void {
    if (wordCount < 200) return;

    const idealMin = Math.floor(wordCount / 200);
    const idealMax = Math.ceil(wordCount / 100);

    if (links.length < idealMin) {
      issues.push({
        ruleId: 'rule-asc-4',
        severity: 'medium',
        title: 'Link density too low',
        description:
          `Found ${links.length} link(s) in ${wordCount} words. ` +
          `Recommended density is 1 link per 100-200 words (${idealMin}-${idealMax} links expected).`,
        exampleFix:
          'Add contextual links to related internal pages within the body content.',
      });
    } else if (links.length > idealMax * 2) {
      // Flag only when significantly over-linked (2x the upper ideal)
      issues.push({
        ruleId: 'rule-asc-4',
        severity: 'medium',
        title: 'Link density too high',
        description:
          `Found ${links.length} link(s) in ${wordCount} words. ` +
          `This exceeds twice the recommended upper density of 1 per 100 words. ` +
          'Excessive linking can dilute per-link equity and appear spammy.',
        exampleFix:
          'Reduce the number of links. Keep the most contextually relevant ones ' +
          'and remove redundant or low-value links.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule ASC-5: Same anchor text to same destination >2x
  // ---------------------------------------------------------------------------

  private checkDuplicateAnchorDestination(
    links: ExtractedLink[],
    issues: LinkChainIssue[]
  ): void {
    // Build a map of (anchor + destination) -> count
    const pairCounts = new Map<string, number>();

    for (const link of links) {
      if (!link.anchor) continue;
      const key = `${link.anchor.toLowerCase()}|||${link.href.toLowerCase()}`;
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
    }

    const duplicates: { anchor: string; href: string; count: number }[] = [];
    for (const [key, count] of pairCounts) {
      if (count > 2) {
        const [anchor, href] = key.split('|||');
        duplicates.push({ anchor, href, count });
      }
    }

    if (duplicates.length > 0) {
      const examples = duplicates
        .slice(0, 3)
        .map(d => `"${d.anchor}" -> ${d.href} (${d.count}x)`)
        .join('; ');

      issues.push({
        ruleId: 'rule-asc-5',
        severity: 'medium',
        title: 'Duplicate anchor text for same destination',
        description:
          `${duplicates.length} anchor-destination pair(s) appear more than twice: ${examples}. ` +
          'Repeating the same anchor text to the same URL provides diminishing SEO value ' +
          'and can look unnatural.',
        affectedElement: duplicates[0]?.anchor,
        exampleFix:
          'Use the primary anchor text once or twice, then vary the phrasing for ' +
          'subsequent links to the same page. E.g., "content clustering" and ' +
          '"our clustering methodology".',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private countWords(html: string): number {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0).length;
  }
}
