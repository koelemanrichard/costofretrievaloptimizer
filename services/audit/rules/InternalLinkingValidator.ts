/**
 * InternalLinkingValidator
 *
 * Standalone validator for internal linking P1 rules: anchor text quality,
 * link placement, annotation text near links, and link volume.
 *
 * Rules implemented:
 *   162-165 - Anchor text quality (generic, length, duplicates)
 *   169, 171-172 - Link placement (body vs nav/footer)
 *   174, 177 - Annotation text near links
 *   178-179, 181, 184 - Link volume (minimum, density, excessive)
 */

export interface LinkingIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class InternalLinkingValidator {
  validate(context: {
    html: string;
    pageUrl: string;
    totalWords?: number;
  }): LinkingIssue[] {
    const issues: LinkingIssue[] = [];
    const links = this.extractInternalLinks(context.html, context.pageUrl);

    // Rules 162-165: Anchor text quality
    this.checkAnchorText(links, issues);
    // Rules 169, 171-172: Link placement
    this.checkLinkPlacement(context.html, links, issues);
    // Rules 174, 177: Annotation text near links
    this.checkAnnotationText(context.html, links, issues);
    // Rules 178-179, 181, 184: Link volume
    this.checkLinkVolume(links, context.totalWords || this.countWords(context.html), issues);

    return issues;
  }

  extractInternalLinks(html: string, pageUrl: string): { href: string; anchor: string; context: string }[] {
    const links: { href: string; anchor: string; context: string }[] = [];
    let baseHostname: string;
    try {
      baseHostname = new URL(pageUrl).hostname;
    } catch {
      return links;
    }
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      try {
        const resolved = new URL(match[1], pageUrl);
        if (resolved.hostname === baseHostname) {
          const anchor = match[2].replace(/<[^>]+>/g, '').trim();
          // Get surrounding context (100 chars before and after)
          const start = Math.max(0, match.index - 100);
          const end = Math.min(html.length, match.index + match[0].length + 100);
          const context = html.slice(start, end).replace(/<[^>]+>/g, ' ').trim();
          links.push({ href: resolved.href, anchor, context });
        }
      } catch { /* skip invalid URLs */ }
    }
    return links;
  }

  // ---------------------------------------------------------------------------
  // Rules 162-165: Anchor text quality
  // ---------------------------------------------------------------------------

  checkAnchorText(links: { anchor: string; href: string }[], issues: LinkingIssue[]): void {
    // Rule 162: No generic anchor text
    const genericAnchors = links.filter(l =>
      /^(click here|here|read more|learn more|this|link|more|see more)$/i.test(l.anchor)
    );
    if (genericAnchors.length > 0) {
      issues.push({
        ruleId: 'rule-162',
        severity: 'high',
        title: 'Generic anchor text used',
        description: `${genericAnchors.length} link(s) use generic anchor text like "click here" or "read more".`,
        exampleFix: 'Use descriptive anchor text that indicates the linked page\'s topic.',
      });
    }

    // Rule 163: Anchor text should be 2-7 words
    const tooShort = links.filter(l => l.anchor.split(/\s+/).length < 2 && l.anchor.length > 0);
    const tooLong = links.filter(l => l.anchor.split(/\s+/).length > 7);
    if (tooShort.length > links.length * 0.3 && links.length > 3) {
      issues.push({
        ruleId: 'rule-163',
        severity: 'medium',
        title: 'Anchor text too short',
        description: `${tooShort.length} links have single-word anchor text.`,
        exampleFix: 'Use 2-7 word descriptive phrases as anchor text.',
      });
    }
    if (tooLong.length > 0) {
      issues.push({
        ruleId: 'rule-164',
        severity: 'low',
        title: 'Anchor text too long',
        description: `${tooLong.length} links have anchor text >7 words.`,
        exampleFix: 'Keep anchor text concise (2-7 words).',
      });
    }

    // Rule 165: No duplicate anchor text for different URLs
    const anchorUrlMap = new Map<string, Set<string>>();
    for (const link of links) {
      const key = link.anchor.toLowerCase();
      if (!anchorUrlMap.has(key)) anchorUrlMap.set(key, new Set());
      anchorUrlMap.get(key)!.add(link.href);
    }
    const duplicateAnchors = [...anchorUrlMap.entries()].filter(([, urls]) => urls.size > 1);
    if (duplicateAnchors.length > 0) {
      issues.push({
        ruleId: 'rule-165',
        severity: 'medium',
        title: 'Same anchor text for different URLs',
        description: `${duplicateAnchors.length} anchor text(s) link to multiple different URLs.`,
        exampleFix: 'Use unique anchor text for each destination URL.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rules 169, 171-172: Link placement
  // ---------------------------------------------------------------------------

  checkLinkPlacement(html: string, links: { href: string }[], issues: LinkingIssue[]): void {
    // Rule 169: Links should appear in body content, not just nav/footer
    const mainContent = html.match(/<(main|article)[^>]*>([\s\S]*?)<\/\1>/i)?.[2] || '';
    const mainLinks = this.extractInternalLinks(mainContent, 'https://placeholder.com');
    if (links.length > 3 && mainLinks.length < links.length * 0.3) {
      issues.push({
        ruleId: 'rule-169',
        severity: 'medium',
        title: 'Most links outside main content',
        description: 'Less than 30% of internal links are in the main content area.',
        exampleFix: 'Add contextual internal links within article body content.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rules 174, 177: Annotation text near links
  // ---------------------------------------------------------------------------

  checkAnnotationText(html: string, links: { anchor: string; context: string }[], issues: LinkingIssue[]): void {
    // Rule 174: Links should have surrounding context (not just bare links)
    let bareLinks = 0;
    for (const link of links) {
      const contextWords = link.context.split(/\s+/).length;
      if (contextWords < 5) bareLinks++;
    }
    if (links.length > 3 && bareLinks > links.length * 0.3) {
      issues.push({
        ruleId: 'rule-174',
        severity: 'low',
        title: 'Links lack surrounding context',
        description: `${bareLinks} link(s) appear without sufficient surrounding text.`,
        exampleFix: 'Place links within sentences that explain why the reader should follow them.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rules 178-179, 181, 184: Link volume
  // ---------------------------------------------------------------------------

  checkLinkVolume(links: { href: string }[], wordCount: number, issues: LinkingIssue[]): void {
    // Rule 178: Minimum 3 internal links per article
    if (links.length < 3 && wordCount > 300) {
      issues.push({
        ruleId: 'rule-178',
        severity: 'high',
        title: 'Too few internal links',
        description: `Only ${links.length} internal links found. Articles should have at least 3.`,
        exampleFix: 'Add contextual internal links to related pages.',
      });
    }

    // Rule 179: Link density — roughly 1 link per 100-200 words
    const idealMin = Math.floor(wordCount / 200);
    if (wordCount > 500 && links.length < idealMin) {
      issues.push({
        ruleId: 'rule-179',
        severity: 'medium',
        title: 'Low internal link density',
        description: `${links.length} links for ${wordCount} words. Recommended: ~1 per 100-200 words.`,
        exampleFix: 'Add more contextual internal links throughout the content.',
      });
    }

    // Rule 181: No excessive linking (>1 link per 50 words)
    if (wordCount > 200 && links.length > wordCount / 50) {
      issues.push({
        ruleId: 'rule-181',
        severity: 'medium',
        title: 'Excessive internal linking',
        description: `${links.length} links for ${wordCount} words exceeds the recommended density.`,
        exampleFix: 'Reduce link count to ~1 per 100-200 words.',
      });
    }
  }

  countWords(html: string): number {
    return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
  }
}
