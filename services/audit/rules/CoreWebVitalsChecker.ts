/**
 * CoreWebVitalsChecker
 *
 * Validates Core Web Vitals and related performance metrics against
 * established thresholds. Uses a two-tier approach for the main CWV
 * metrics (LCP, INP, CLS): "needs improvement" vs "poor".
 *
 * Rules implemented:
 *   320 - LCP (Largest Contentful Paint) — critical
 *   321 - FID / INP (Interaction to Next Paint) — critical
 *   322 - CLS (Cumulative Layout Shift) — critical
 *   323 - FCP (First Contentful Paint) — high
 *   324 - TTFB (Time To First Byte) — high
 *   325 - TBT (Total Blocking Time) — medium
 *   326 - Speed Index — medium
 *   327 - DOM size — low (CWV context, see also rule 292)
 *   328 - JavaScript payload — medium
 *   329 - CSS payload — medium
 *   330 - Third-party impact — low
 *   331 - Render-blocking resources — medium
 *   332 - Font loading (font-display) — low
 *   333 - Image above-the-fold fetchpriority — medium
 */

export interface CoreWebVitalsInput {
  /** Core Web Vitals metrics (in ms for time, float for CLS) */
  lcp?: number;
  fid?: number;
  inp?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  tbt?: number;
  speedIndex?: number;

  /** Page metrics */
  domNodes?: number;
  jsPayloadKb?: number;
  cssPayloadKb?: number;
  thirdPartyJsKb?: number;
  totalJsKb?: number;
  renderBlockingCount?: number;

  /** HTML content for font and image checks */
  html?: string;
}

export interface CwvIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class CoreWebVitalsChecker {
  /**
   * Run all CWV checks against the provided input.
   * Only checks metrics that are present (non-undefined).
   * Returns an array of issues found (empty array = clean).
   */
  validate(input: CoreWebVitalsInput): CwvIssue[] {
    const issues: CwvIssue[] = [];

    this.checkLcp(input, issues);              // Rule 320
    this.checkInp(input, issues);              // Rule 321
    this.checkCls(input, issues);              // Rule 322
    this.checkFcp(input, issues);              // Rule 323
    this.checkTtfb(input, issues);             // Rule 324
    this.checkTbt(input, issues);              // Rule 325
    this.checkSpeedIndex(input, issues);       // Rule 326
    this.checkDomSize(input, issues);          // Rule 327
    this.checkJsPayload(input, issues);        // Rule 328
    this.checkCssPayload(input, issues);       // Rule 329
    this.checkThirdPartyImpact(input, issues); // Rule 330
    this.checkRenderBlocking(input, issues);   // Rule 331
    this.checkFontLoading(input, issues);      // Rule 332
    this.checkImageFetchPriority(input, issues); // Rule 333

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Rule 320: LCP — Largest Contentful Paint
  // Good: ≤2500ms | Needs improvement: 2500-4000ms | Poor: >4000ms
  // ---------------------------------------------------------------------------

  private checkLcp(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (input.lcp === undefined) return;

    if (input.lcp > 4000) {
      issues.push({
        ruleId: 'rule-320',
        severity: 'critical',
        title: 'LCP is poor (>4s)',
        description:
          `Largest Contentful Paint is ${(input.lcp / 1000).toFixed(1)}s, ` +
          'which exceeds the 4s "poor" threshold. Google considers LCP >4s as a ' +
          'failing Core Web Vital. This directly impacts search ranking and user experience.',
        affectedElement: `LCP: ${input.lcp}ms`,
        exampleFix:
          'Optimize the largest above-the-fold element: compress images, use next-gen formats (WebP/AVIF), ' +
          'preload critical resources, and reduce server response time.',
      });
    } else if (input.lcp > 2500) {
      issues.push({
        ruleId: 'rule-320',
        severity: 'critical',
        title: 'LCP needs improvement (>2.5s)',
        description:
          `Largest Contentful Paint is ${(input.lcp / 1000).toFixed(1)}s, ` +
          'which exceeds the 2.5s "good" threshold. Aim for LCP ≤2.5s to pass ' +
          'Core Web Vitals assessment.',
        affectedElement: `LCP: ${input.lcp}ms`,
        exampleFix:
          'Preload the LCP image/resource, optimize server response time, and remove render-blocking resources.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 321: INP / FID — Interaction to Next Paint
  // Good: ≤200ms | Needs improvement: 200-500ms | Poor: >500ms
  // ---------------------------------------------------------------------------

  private checkInp(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    // Prefer INP over FID (INP replaced FID as of March 2024)
    const metric = input.inp ?? input.fid;
    if (metric === undefined) return;

    const metricName = input.inp !== undefined ? 'INP' : 'FID';

    if (metric > 500) {
      issues.push({
        ruleId: 'rule-321',
        severity: 'critical',
        title: `${metricName} is poor (>500ms)`,
        description:
          `${metricName} is ${metric}ms, which exceeds the 500ms "poor" threshold. ` +
          'This means user interactions feel sluggish and unresponsive. ' +
          'This directly impacts search ranking as a Core Web Vital.',
        affectedElement: `${metricName}: ${metric}ms`,
        exampleFix:
          'Break up long tasks, reduce JavaScript execution time, use web workers for heavy computation, ' +
          'and optimize event handlers.',
      });
    } else if (metric > 200) {
      issues.push({
        ruleId: 'rule-321',
        severity: 'critical',
        title: `${metricName} needs improvement (>200ms)`,
        description:
          `${metricName} is ${metric}ms, which exceeds the 200ms "good" threshold. ` +
          'Aim for INP ≤200ms to pass Core Web Vitals assessment.',
        affectedElement: `${metricName}: ${metric}ms`,
        exampleFix:
          'Reduce main-thread blocking, defer non-critical JavaScript, and optimize event handlers.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 322: CLS — Cumulative Layout Shift
  // Good: ≤0.1 | Needs improvement: 0.1-0.25 | Poor: >0.25
  // ---------------------------------------------------------------------------

  private checkCls(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (input.cls === undefined) return;

    if (input.cls > 0.25) {
      issues.push({
        ruleId: 'rule-322',
        severity: 'critical',
        title: 'CLS is poor (>0.25)',
        description:
          `Cumulative Layout Shift is ${input.cls.toFixed(3)}, which exceeds the 0.25 ` +
          '"poor" threshold. Elements are shifting significantly during page load, ' +
          'causing a frustrating user experience.',
        affectedElement: `CLS: ${input.cls}`,
        exampleFix:
          'Set explicit width/height on images and embeds, avoid inserting content above existing content, ' +
          'and use CSS contain-intrinsic-size for lazy-loaded elements.',
      });
    } else if (input.cls > 0.1) {
      issues.push({
        ruleId: 'rule-322',
        severity: 'critical',
        title: 'CLS needs improvement (>0.1)',
        description:
          `Cumulative Layout Shift is ${input.cls.toFixed(3)}, which exceeds the 0.1 ` +
          '"good" threshold. Aim for CLS ≤0.1 to pass Core Web Vitals assessment.',
        affectedElement: `CLS: ${input.cls}`,
        exampleFix:
          'Add width and height attributes to images and video elements, and avoid dynamic content injection above the fold.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 323: FCP — First Contentful Paint
  // Good: ≤1800ms | High: >3000ms
  // ---------------------------------------------------------------------------

  private checkFcp(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (input.fcp === undefined) return;

    if (input.fcp > 3000) {
      issues.push({
        ruleId: 'rule-323',
        severity: 'high',
        title: 'FCP is slow (>3s)',
        description:
          `First Contentful Paint is ${(input.fcp / 1000).toFixed(1)}s. ` +
          'Users see no content for over 3 seconds, which leads to high bounce rates. ' +
          'Aim for FCP ≤1.8s.',
        affectedElement: `FCP: ${input.fcp}ms`,
        exampleFix:
          'Reduce server response time, eliminate render-blocking resources, and inline critical CSS.',
      });
    } else if (input.fcp > 1800) {
      issues.push({
        ruleId: 'rule-323',
        severity: 'high',
        title: 'FCP needs improvement (>1.8s)',
        description:
          `First Contentful Paint is ${(input.fcp / 1000).toFixed(1)}s, ` +
          'which exceeds the 1.8s recommended threshold.',
        affectedElement: `FCP: ${input.fcp}ms`,
        exampleFix:
          'Inline critical CSS, defer non-critical JS, and consider server-side rendering for initial content.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 324: TTFB — Time To First Byte
  // Good: ≤800ms | High: >1800ms
  // ---------------------------------------------------------------------------

  private checkTtfb(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (input.ttfb === undefined) return;

    if (input.ttfb > 1800) {
      issues.push({
        ruleId: 'rule-324',
        severity: 'high',
        title: 'TTFB is slow (>1.8s)',
        description:
          `Time To First Byte is ${(input.ttfb / 1000).toFixed(1)}s. ` +
          'The server is taking too long to begin responding. ' +
          'TTFB >1.8s severely limits all downstream metrics.',
        affectedElement: `TTFB: ${input.ttfb}ms`,
        exampleFix:
          'Use a CDN, optimize server-side processing, enable caching, and consider edge computing.',
      });
    } else if (input.ttfb > 800) {
      issues.push({
        ruleId: 'rule-324',
        severity: 'high',
        title: 'TTFB needs improvement (>800ms)',
        description:
          `Time To First Byte is ${(input.ttfb / 1000).toFixed(1)}s, ` +
          'which exceeds the 800ms recommended threshold.',
        affectedElement: `TTFB: ${input.ttfb}ms`,
        exampleFix:
          'Implement server-side caching, use a CDN closer to users, and optimize database queries.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 325: TBT — Total Blocking Time
  // Good: ≤200ms | Medium: >600ms
  // ---------------------------------------------------------------------------

  private checkTbt(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (input.tbt === undefined) return;

    if (input.tbt > 600) {
      issues.push({
        ruleId: 'rule-325',
        severity: 'medium',
        title: 'TBT is high (>600ms)',
        description:
          `Total Blocking Time is ${input.tbt}ms. Long tasks are blocking the main thread ` +
          'for extended periods, degrading interactivity.',
        affectedElement: `TBT: ${input.tbt}ms`,
        exampleFix:
          'Split long JavaScript tasks, use code splitting, and defer non-essential scripts.',
      });
    } else if (input.tbt > 200) {
      issues.push({
        ruleId: 'rule-325',
        severity: 'medium',
        title: 'TBT needs improvement (>200ms)',
        description:
          `Total Blocking Time is ${input.tbt}ms, which exceeds the 200ms recommended threshold. ` +
          'Aim for TBT ≤200ms for optimal interactivity.',
        affectedElement: `TBT: ${input.tbt}ms`,
        exampleFix:
          'Reduce JavaScript execution time and break up long tasks using requestIdleCallback or setTimeout.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 326: Speed Index
  // Good: ≤3400ms | Medium: >5800ms
  // ---------------------------------------------------------------------------

  private checkSpeedIndex(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (input.speedIndex === undefined) return;

    if (input.speedIndex > 5800) {
      issues.push({
        ruleId: 'rule-326',
        severity: 'medium',
        title: 'Speed Index is slow (>5.8s)',
        description:
          `Speed Index is ${(input.speedIndex / 1000).toFixed(1)}s. ` +
          'The page takes too long to visually complete loading.',
        affectedElement: `Speed Index: ${input.speedIndex}ms`,
        exampleFix:
          'Prioritize visible content loading, reduce critical rendering path, and optimize image delivery.',
      });
    } else if (input.speedIndex > 3400) {
      issues.push({
        ruleId: 'rule-326',
        severity: 'medium',
        title: 'Speed Index needs improvement (>3.4s)',
        description:
          `Speed Index is ${(input.speedIndex / 1000).toFixed(1)}s, ` +
          'which exceeds the 3.4s recommended threshold.',
        affectedElement: `Speed Index: ${input.speedIndex}ms`,
        exampleFix:
          'Inline critical CSS, defer off-screen images, and reduce the number of render-blocking resources.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 327: DOM Size
  // Good: <1500 nodes
  // ---------------------------------------------------------------------------

  private checkDomSize(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (input.domNodes === undefined) return;

    if (input.domNodes >= 1500) {
      issues.push({
        ruleId: 'rule-327',
        severity: 'low',
        title: 'Large DOM size',
        description:
          `DOM contains ${input.domNodes} nodes (recommended: <1500). ` +
          'A large DOM increases memory usage, slows style recalculations, and can degrade CLS and INP. ' +
          'Note: also flagged by rule 292 for HTML technical audit.',
        affectedElement: `DOM nodes: ${input.domNodes}`,
        exampleFix:
          'Use virtualization for long lists, lazy-load off-screen content, and simplify nested layouts.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 328: JavaScript Payload
  // Good: <300KB compressed
  // ---------------------------------------------------------------------------

  private checkJsPayload(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (input.jsPayloadKb === undefined) return;

    if (input.jsPayloadKb >= 300) {
      issues.push({
        ruleId: 'rule-328',
        severity: 'medium',
        title: 'JavaScript payload too large',
        description:
          `Total JavaScript is ${input.jsPayloadKb}KB compressed (recommended: <300KB). ` +
          'Excessive JavaScript increases parse/compile time and blocks interactivity.',
        affectedElement: `JS payload: ${input.jsPayloadKb}KB`,
        exampleFix:
          'Use code splitting, tree-shake unused modules, and defer non-critical scripts.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 329: CSS Payload
  // Good: <100KB compressed
  // ---------------------------------------------------------------------------

  private checkCssPayload(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (input.cssPayloadKb === undefined) return;

    if (input.cssPayloadKb >= 100) {
      issues.push({
        ruleId: 'rule-329',
        severity: 'medium',
        title: 'CSS payload too large',
        description:
          `Total CSS is ${input.cssPayloadKb}KB compressed (recommended: <100KB). ` +
          'Large CSS files delay rendering and increase style recalculation time.',
        affectedElement: `CSS payload: ${input.cssPayloadKb}KB`,
        exampleFix:
          'Remove unused CSS (PurgeCSS/UnCSS), split critical vs non-critical styles, and minimize CSS frameworks.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 330: Third-Party Impact
  // Third-party JS should not exceed 30% of total JS
  // ---------------------------------------------------------------------------

  private checkThirdPartyImpact(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (
      input.thirdPartyJsKb === undefined ||
      input.totalJsKb === undefined ||
      input.totalJsKb === 0
    ) {
      return;
    }

    const percentage = (input.thirdPartyJsKb / input.totalJsKb) * 100;

    if (percentage > 30) {
      issues.push({
        ruleId: 'rule-330',
        severity: 'low',
        title: 'Third-party scripts dominate JS payload',
        description:
          `Third-party JavaScript accounts for ${percentage.toFixed(0)}% of total JS ` +
          `(${input.thirdPartyJsKb}KB of ${input.totalJsKb}KB). ` +
          'Recommended: third-party JS should not exceed 30% of total JavaScript.',
        affectedElement: `Third-party JS: ${percentage.toFixed(0)}%`,
        exampleFix:
          'Audit third-party scripts, lazy-load non-essential tags, use a tag manager with consent-based loading, ' +
          'and consider self-hosting critical third-party resources.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 331: Render-Blocking Resources
  // Good: ≤3
  // ---------------------------------------------------------------------------

  private checkRenderBlocking(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (input.renderBlockingCount === undefined) return;

    if (input.renderBlockingCount > 3) {
      issues.push({
        ruleId: 'rule-331',
        severity: 'medium',
        title: 'Too many render-blocking resources',
        description:
          `Found ${input.renderBlockingCount} render-blocking CSS/JS resources (recommended: ≤3). ` +
          'Each render-blocking resource delays First Contentful Paint.',
        affectedElement: `Render-blocking resources: ${input.renderBlockingCount}`,
        exampleFix:
          'Inline critical CSS, defer non-critical CSS with media queries, and add async/defer to script tags.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 332: Font Loading — font-display: swap or optional
  // ---------------------------------------------------------------------------

  private checkFontLoading(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (!input.html) return;

    // Find Google Fonts or other font <link> tags
    const fontLinkRegex = /<link\b[^>]*href=["'][^"']*font[^"']*["'][^>]*>/gi;
    const fontLinks = input.html.match(fontLinkRegex) || [];

    // Check for font-display in the URL query params (Google Fonts pattern)
    const missingDisplayLinks: string[] = [];
    for (const link of fontLinks) {
      // Google Fonts links should contain &display=swap or &display=optional
      if (!/display=(swap|optional)/i.test(link)) {
        const hrefMatch = link.match(/href=["']([^"']+)["']/i);
        missingDisplayLinks.push(hrefMatch ? hrefMatch[1] : link);
      }
    }

    // Check @font-face blocks in <style> tags
    const fontFaceRegex = /@font-face\s*\{[^}]*\}/gi;
    const fontFaces = input.html.match(fontFaceRegex) || [];
    let fontFaceMissingDisplay = 0;

    for (const block of fontFaces) {
      if (!/font-display\s*:\s*(swap|optional)/i.test(block)) {
        fontFaceMissingDisplay++;
      }
    }

    const totalMissing = missingDisplayLinks.length + fontFaceMissingDisplay;

    if (totalMissing > 0) {
      issues.push({
        ruleId: 'rule-332',
        severity: 'low',
        title: 'Web fonts missing font-display strategy',
        description:
          `${totalMissing} font resource(s) lack font-display: swap or font-display: optional. ` +
          'Without a font-display strategy, text may be invisible during font loading (FOIT), ' +
          'degrading perceived performance and CLS.',
        affectedElement:
          missingDisplayLinks.length > 0
            ? missingDisplayLinks.slice(0, 2).join(', ')
            : `${fontFaceMissingDisplay} @font-face block(s)`,
        exampleFix:
          'Add &display=swap to Google Fonts URLs, or set font-display: swap in @font-face declarations.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 333: Image Above-the-Fold fetchpriority
  // LCP image should have fetchpriority="high"
  // ---------------------------------------------------------------------------

  private checkImageFetchPriority(input: CoreWebVitalsInput, issues: CwvIssue[]): void {
    if (!input.html) return;

    // Only flag if LCP is provided and exceeds the good threshold
    if (input.lcp === undefined || input.lcp <= 2500) return;

    // Check if any image has fetchpriority="high"
    const hasFetchPriority = /fetchpriority\s*=\s*["']high["']/i.test(input.html);

    if (!hasFetchPriority) {
      issues.push({
        ruleId: 'rule-333',
        severity: 'medium',
        title: 'No image with fetchpriority="high"',
        description:
          'The LCP metric is above the 2.5s threshold and no image has fetchpriority="high". ' +
          'If the LCP element is an image, adding fetchpriority="high" tells the browser to ' +
          'prioritize downloading it, which can significantly improve LCP.',
        exampleFix:
          'Add fetchpriority="high" to the hero/LCP image: <img src="hero.webp" fetchpriority="high">.',
      });
    }
  }
}
