/**
 * ContentObstructionChecker
 *
 * Detects ads, share buttons, banners, and other obstructive elements
 * that appear before the main content text.
 *
 * Rules implemented:
 *   118 - No share buttons, ads, or banners before main content text
 */

export interface ObstructionIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class ContentObstructionChecker {
  /**
   * Rule 118: Check for ads, share buttons, banners, or other obstructive elements
   * appearing before the main content text.
   *
   * Looks for common patterns of obstruction elements in the HTML before the first
   * substantial text content.
   */
  check(html: string): ObstructionIssue[] {
    const issues: ObstructionIssue[] = [];

    // Find the start of main content (first <main>, <article>, or first <p> with substantial text)
    const mainContentStart = this.findMainContentStart(html);
    if (mainContentStart < 0) return issues;

    const beforeContent = html.slice(0, mainContentStart).toLowerCase();

    // Check for ad-related elements before main content
    const adPatterns = this.detectAds(beforeContent);
    const sharePatterns = this.detectShareButtons(beforeContent);
    const bannerPatterns = this.detectBanners(beforeContent);

    const allObstructions = [...adPatterns, ...sharePatterns, ...bannerPatterns];

    if (allObstructions.length > 0) {
      issues.push({
        ruleId: 'rule-118',
        severity: 'high',
        title: 'Obstructive elements before main content',
        description: `Found ${allObstructions.length} potentially obstructive element(s) before main content: ${allObstructions.join(', ')}`,
        affectedElement: allObstructions.slice(0, 3).join(', '),
        exampleFix:
          'Move ads, share buttons, and banners below the main content or into a sidebar.',
      });
    }

    return issues;
  }

  /**
   * Find the character index where main content begins.
   * Looks for <main>, <article>, or first <p> with >50 chars of text.
   */
  findMainContentStart(html: string): number {
    // Try <main> tag first
    const mainMatch = html.match(/<main[\s>]/i);
    if (mainMatch?.index !== undefined) return mainMatch.index;

    // Try <article> tag
    const articleMatch = html.match(/<article[\s>]/i);
    if (articleMatch?.index !== undefined) return articleMatch.index;

    // Fall back to first substantial <p>
    const pRegex = /<p[^>]*>([^<]{50,})/gi;
    const pMatch = pRegex.exec(html);
    if (pMatch?.index !== undefined) return pMatch.index;

    return -1;
  }

  // ---------------------------------------------------------------------------
  // Detection helpers
  // ---------------------------------------------------------------------------

  detectAds(htmlBefore: string): string[] {
    const found: string[] = [];

    if (/class="[^"]*\bad[s\-_]?\b[^"]*"/i.test(htmlBefore)) found.push('ad container');
    if (/class="[^"]*\badsense\b[^"]*"/i.test(htmlBefore)) found.push('AdSense');
    if (/class="[^"]*\bsponsored\b[^"]*"/i.test(htmlBefore)) found.push('sponsored content');
    if (/<ins\b[^>]*class="[^"]*adsbygoogle/i.test(htmlBefore)) found.push('Google Ads');
    if (/data-ad-slot/i.test(htmlBefore)) found.push('ad slot');
    if (/id="[^"]*\bad[s\-_]?\b[^"]*"/i.test(htmlBefore)) found.push('ad element');

    return found;
  }

  detectShareButtons(htmlBefore: string): string[] {
    const found: string[] = [];

    if (/class="[^"]*\bshare\b[^"]*"/i.test(htmlBefore)) found.push('share buttons');
    if (/class="[^"]*\bsocial[_-]?share\b[^"]*"/i.test(htmlBefore))
      found.push('social share');
    if (/class="[^"]*\bsharing[_-]?buttons\b[^"]*"/i.test(htmlBefore))
      found.push('sharing buttons');
    if (/addthis|sharethis/i.test(htmlBefore)) found.push('share widget');

    return found;
  }

  detectBanners(htmlBefore: string): string[] {
    const found: string[] = [];

    if (/class="[^"]*\bbanner\b[^"]*"/i.test(htmlBefore)) found.push('banner');
    if (/class="[^"]*\bpopup\b[^"]*"/i.test(htmlBefore)) found.push('popup');
    if (/class="[^"]*\bmodal\b[^"]*"/i.test(htmlBefore)) found.push('modal');
    if (/class="[^"]*\binterstitial\b[^"]*"/i.test(htmlBefore)) found.push('interstitial');
    if (/class="[^"]*\bcookie[_-]?consent\b[^"]*"/i.test(htmlBefore))
      found.push('cookie consent');

    return found;
  }
}
