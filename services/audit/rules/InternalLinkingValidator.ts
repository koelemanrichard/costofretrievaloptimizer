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
 *   185 - Annotation text quality (paragraph sentence count)
 *   186-188 - Link placement rules (after definition, never first sentence, density)
 *   189 - Anchor text repetition (same anchor→destination >2 times)
 *   190-191 - Jump link / ToC validation (long content needs ToC)
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
    // Rule 185: Annotation text quality (Finding #62)
    this.checkAnnotationTextQuality(context.html, links, issues);
    // Rules 186-188: Link placement rules (Finding #63)
    this.checkLinkPlacementRules(context.html, links, issues);
    // Rule 189: Anchor text repetition (Finding #64)
    this.checkAnchorTextRepetition(links, issues);
    // Rules 190-191: Jump link / ToC validation (Finding #66)
    this.checkJumpLinksAndToc(context.html, context.totalWords || this.countWords(context.html), issues);

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

  // ---------------------------------------------------------------------------
  // Rule 185: Annotation text quality (Finding #62)
  // Paragraphs containing links should have at least 2 sentences to
  // semantically justify why the link exists.
  // ---------------------------------------------------------------------------

  checkAnnotationTextQuality(
    html: string,
    links: { anchor: string; context: string }[],
    issues: LinkingIssue[],
  ): void {
    if (links.length === 0) return;

    // Extract paragraphs that contain internal links
    const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    const linkHrefRegex = /<a[^>]+href=["'][^"']+["'][^>]*>/i;
    let weakAnnotations = 0;
    let paragraphsWithLinks = 0;
    let match;

    while ((match = paragraphRegex.exec(html)) !== null) {
      const paragraphHtml = match[1];
      if (!linkHrefRegex.test(paragraphHtml)) continue;

      paragraphsWithLinks++;
      // Strip HTML tags to get plain text
      const plainText = paragraphHtml.replace(/<[^>]+>/g, '').trim();
      // Count sentences by splitting on sentence-ending punctuation
      const sentences = plainText
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);
      if (sentences.length < 2) {
        weakAnnotations++;
      }
    }

    if (paragraphsWithLinks > 0 && weakAnnotations > paragraphsWithLinks * 0.3) {
      issues.push({
        ruleId: 'rule-185',
        severity: 'medium',
        title: 'Weak annotation text around links',
        description: `${weakAnnotations} of ${paragraphsWithLinks} paragraphs with links have fewer than 2 sentences. Surrounding text should semantically justify why the link exists.`,
        exampleFix: 'Expand link-containing paragraphs to at least 2 sentences that explain the relationship to the linked page.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rules 186-188: Link placement rules (Finding #63)
  // - Links should appear AFTER an entity/concept is defined, not before
  // - Links should NEVER be in the first sentence of a page/section
  // - Link density should be approximately 1 link per 100-200 words
  // ---------------------------------------------------------------------------

  checkLinkPlacementRules(
    html: string,
    links: { href: string; anchor: string; context: string }[],
    issues: LinkingIssue[],
  ): void {
    if (links.length === 0) return;

    // Rule 186: Links should not appear in the first sentence of the page
    // Get the main content area
    const mainContent = html.match(/<(main|article|body)[^>]*>([\s\S]*?)<\/\1>/i)?.[2] || html;
    // Find the first paragraph
    const firstParagraph = mainContent.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
    const firstParagraphPlain = firstParagraph.replace(/<[^>]+>/g, '').trim();
    // Get the first sentence (up to first sentence-ending punctuation)
    const firstSentence = firstParagraphPlain.split(/[.!?]/)[0] || '';
    // Check if the first sentence contains a link
    const firstSentenceHtml = firstParagraph.split(/[.!?]/)[0] || '';
    const linkInFirstSentence = /<a[^>]+href=["'][^"']+["'][^>]*>/i.test(firstSentenceHtml);

    if (linkInFirstSentence && firstSentence.trim().length > 10) {
      issues.push({
        ruleId: 'rule-186',
        severity: 'medium',
        title: 'Link in first sentence of content',
        description: 'An internal link appears in the first sentence of the page. Links should appear after a concept is introduced, not before.',
        affectedElement: firstSentence.trim().slice(0, 80) + (firstSentence.length > 80 ? '...' : ''),
        exampleFix: 'Move the link to the second sentence or later, after the concept has been defined.',
      });
    }

    // Rule 187: Links should not appear in the first sentence of sections
    const sectionRegex = /<h[2-6][^>]*>[\s\S]*?<\/h[2-6]>\s*([\s\S]*?)(?=<h[2-6]|$)/gi;
    let sectionMatch;
    let sectionsWithFirstSentenceLink = 0;
    let totalSections = 0;

    while ((sectionMatch = sectionRegex.exec(mainContent)) !== null) {
      totalSections++;
      const sectionBody = sectionMatch[1];
      const sectionFirstP = sectionBody.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
      const sectionFirstSentenceHtml = sectionFirstP.split(/[.!?]/)[0] || '';
      if (/<a[^>]+href=["'][^"']+["'][^>]*>/i.test(sectionFirstSentenceHtml)) {
        sectionsWithFirstSentenceLink++;
      }
    }

    if (totalSections > 2 && sectionsWithFirstSentenceLink > totalSections * 0.5) {
      issues.push({
        ruleId: 'rule-187',
        severity: 'medium',
        title: 'Links in first sentence of sections',
        description: `${sectionsWithFirstSentenceLink} of ${totalSections} sections have links in their first sentence. Links should appear after the concept is defined.`,
        exampleFix: 'Move links to the second sentence or later within each section, after introducing the concept.',
      });
    }

    // Rule 188: Link density per section should be roughly even
    // (not all links clustered in one section)
    if (totalSections > 2 && links.length > 3) {
      const sectionLinkCounts: number[] = [];
      const sectionRegex2 = /<h[2-6][^>]*>[\s\S]*?<\/h[2-6]>\s*([\s\S]*?)(?=<h[2-6]|$)/gi;
      let sm;
      while ((sm = sectionRegex2.exec(mainContent)) !== null) {
        const sectionBody = sm[1];
        const sectionLinkMatches = sectionBody.match(/<a[^>]+href=["'][^"']+["'][^>]*>/gi);
        sectionLinkCounts.push(sectionLinkMatches?.length || 0);
      }
      if (sectionLinkCounts.length > 2) {
        const maxLinks = Math.max(...sectionLinkCounts);
        const totalLinks = sectionLinkCounts.reduce((a, b) => a + b, 0);
        // If one section has more than 60% of all links, flag uneven distribution
        if (totalLinks > 3 && maxLinks > totalLinks * 0.6) {
          issues.push({
            ruleId: 'rule-188',
            severity: 'low',
            title: 'Uneven link distribution across sections',
            description: `One section contains ${maxLinks} of ${totalLinks} internal links (>${Math.round((maxLinks / totalLinks) * 100)}%). Distribute links more evenly across sections.`,
            exampleFix: 'Spread internal links across all sections rather than clustering them in one area.',
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 189: Anchor text repetition (Finding #64)
  // Same anchor text should NOT link to the same destination more than 2 times.
  // ---------------------------------------------------------------------------

  checkAnchorTextRepetition(
    links: { href: string; anchor: string }[],
    issues: LinkingIssue[],
  ): void {
    if (links.length === 0) return;

    // Track anchor+destination combinations
    const anchorDestMap = new Map<string, number>();
    const duplicates: { anchor: string; href: string; count: number }[] = [];

    for (const link of links) {
      const key = `${link.anchor.toLowerCase()}|||${link.href}`;
      const count = (anchorDestMap.get(key) || 0) + 1;
      anchorDestMap.set(key, count);
    }

    for (const [key, count] of anchorDestMap.entries()) {
      if (count > 2) {
        const [anchor, href] = key.split('|||');
        duplicates.push({ anchor, href, count });
      }
    }

    if (duplicates.length > 0) {
      const examples = duplicates
        .slice(0, 3)
        .map(d => `"${d.anchor}" \u2192 ${new URL(d.href).pathname} (${d.count}x)`)
        .join('; ');
      issues.push({
        ruleId: 'rule-189',
        severity: 'medium',
        title: 'Repeated anchor text to same destination',
        description: `${duplicates.length} anchor\u2192destination combination(s) appear more than 2 times: ${examples}.`,
        exampleFix: 'Link to each destination at most 2 times per page. Vary anchor text or remove redundant links.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rules 190-191: Jump link / ToC validation (Finding #66)
  // Long content (>2000 words) should have a Table of Contents with jump links.
  // Headings should have id attributes and corresponding anchor links.
  // ---------------------------------------------------------------------------

  checkJumpLinksAndToc(
    html: string,
    wordCount: number,
    issues: LinkingIssue[],
  ): void {
    // Only check long content
    if (wordCount < 2000) return;

    // Rule 190: Check for Table of Contents
    // Look for common ToC patterns: <nav> with "toc"/"table-of-contents" class/id,
    // or an ordered/unordered list with multiple fragment links early in the page
    const tocPatterns = [
      /<nav[^>]*(?:id|class)=["'][^"']*(?:toc|table-of-contents|tableofcontents)[^"']*["'][^>]*>/i,
      /<div[^>]*(?:id|class)=["'][^"']*(?:toc|table-of-contents|tableofcontents)[^"']*["'][^>]*>/i,
      /<ol[^>]*(?:id|class)=["'][^"']*(?:toc|table-of-contents)[^"']*["'][^>]*>/i,
    ];
    const hasToc = tocPatterns.some(p => p.test(html));

    // Also check for a cluster of fragment links (#...) in a list early in the doc
    const fragmentLinkRegex = /<a[^>]+href=["']#[^"']+["'][^>]*>/gi;
    const fragmentLinks = html.match(fragmentLinkRegex) || [];
    const hasFragmentCluster = fragmentLinks.length >= 3;

    if (!hasToc && !hasFragmentCluster) {
      issues.push({
        ruleId: 'rule-190',
        severity: 'medium',
        title: 'Long content missing Table of Contents',
        description: `Content has ~${wordCount} words but no Table of Contents with jump links was detected. Long-form content should include a ToC for navigation.`,
        exampleFix: 'Add a Table of Contents with anchor links (e.g., <a href="#section-1">Section 1</a>) near the top of the page.',
      });
    }

    // Rule 191: Headings should have id attributes for jump link targets
    const headingRegex = /<h[2-6]([^>]*)>([\s\S]*?)<\/h[2-6]>/gi;
    let headingMatch;
    let headingsTotal = 0;
    let headingsWithId = 0;

    while ((headingMatch = headingRegex.exec(html)) !== null) {
      headingsTotal++;
      const attrs = headingMatch[1];
      if (/\bid=["'][^"']+["']/i.test(attrs)) {
        headingsWithId++;
      }
    }

    if (headingsTotal >= 3 && headingsWithId < headingsTotal * 0.5) {
      issues.push({
        ruleId: 'rule-191',
        severity: 'low',
        title: 'Headings missing id attributes for jump links',
        description: `Only ${headingsWithId} of ${headingsTotal} headings have id attributes. Without ids, jump links and ToC navigation cannot work.`,
        exampleFix: 'Add id attributes to headings (e.g., <h2 id="section-name">Section Name</h2>) to enable jump link navigation.',
      });
    }
  }

  countWords(html: string): number {
    return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
  }
}
