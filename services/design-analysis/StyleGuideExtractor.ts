// =============================================================================
// StyleGuideExtractor — Extract actual HTML + computed CSS from target site DOM
// =============================================================================
// Uses Apify playwright-scraper to capture real design elements, not AI guesses.
// Each element is extracted as self-contained HTML with inline styles.
// v2: Smart filtering, complexity limits, multi-page crawling, element screenshots.

import { runApifyActor, ApifyProxyConfig } from '../apifyService';

const PLAYWRIGHT_SCRAPER_ACTOR_ID = 'apify/playwright-scraper';

/** CSS properties to capture per element category */
const CSS_PROPS_MAP: Record<string, string[]> = {
  typography: [
    'fontFamily', 'fontSize', 'fontWeight', 'color', 'lineHeight',
    'letterSpacing', 'textTransform', 'margin', 'marginTop', 'marginBottom',
    'textDecoration', 'fontStyle',
  ],
  buttons: [
    'background', 'backgroundColor', 'color', 'border', 'borderRadius',
    'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
    'fontFamily', 'fontSize', 'fontWeight', 'boxShadow', 'textTransform',
    'letterSpacing', 'lineHeight', 'display', 'cursor',
  ],
  cards: [
    'background', 'backgroundColor', 'border', 'borderRadius', 'boxShadow',
    'padding', 'overflow', 'display', 'flexDirection', 'gap',
  ],
  navigation: [
    'display', 'gap', 'background', 'backgroundColor', 'color',
    'fontFamily', 'fontSize', 'fontWeight', 'padding',
  ],
  accordions: [
    'border', 'background', 'backgroundColor', 'padding', 'borderRadius',
  ],
  'section-breaks': [
    'border', 'borderTop', 'borderBottom', 'height', 'background',
    'backgroundColor', 'margin', 'marginTop', 'marginBottom',
  ],
  backgrounds: [
    'background', 'backgroundColor', 'backgroundImage', 'padding',
    'borderRadius',
  ],
  images: [
    'borderRadius', 'boxShadow', 'border', 'objectFit', 'maxWidth',
  ],
  tables: [
    'borderCollapse', 'border', 'background', 'backgroundColor',
    'fontFamily', 'fontSize', 'padding',
  ],
  forms: [
    'border', 'borderRadius', 'padding', 'background', 'backgroundColor',
    'fontFamily', 'fontSize', 'color', 'outline',
  ],
};

/** Discovered page from navigation link discovery */
export interface DiscoveredPage {
  url: string;
  label: string;
  section: 'navigation' | 'footer' | 'content';
}

/** Raw element data returned from Apify page function */
export interface RawExtractedElement {
  category: string;
  subcategory: string;
  selector: string;
  elementTag: string;
  classNames: string[];
  outerHtml: string;
  computedCss: Record<string, string>;
  selfContainedHtml: string;
  pageRegion: string;
  elementScreenshotBase64?: string;
  sourcePageUrl?: string;
  childCount?: number;
  outerHtmlLength?: number;
  hoverCss?: Record<string, string>;
  ancestorBackground?: { backgroundColor: string; backgroundImage: string };
}

/** Raw extraction result from Apify */
export interface RawStyleGuideExtraction {
  elements: RawExtractedElement[];
  googleFontsUrls: string[];
  googleFontFamilies: string[];
  screenshotBase64: string;
  url: string;
  extractionDurationMs: number;
  error?: string;
  colorMap?: Record<string, { count: number; sources: string[] }>;
  pageScreenshots?: { url: string; base64: string }[];
  pagesScanned?: number;
}

export const StyleGuideExtractor = {
  /**
   * Discover navigable pages from a website's navigation, header, and footer links.
   * Lightweight Apify run (~15-20s) — no element extraction, just link discovery.
   */
  async discoverPages(
    url: string,
    apiToken: string,
    proxyConfig?: ApifyProxyConfig
  ): Promise<DiscoveredPage[]> {
    if (!apiToken) {
      throw new Error('Apify API token is required');
    }

    // Ensure URL has protocol
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const pageFunction = buildDiscoverPagesFunction();

    const runInput = {
      startUrls: [{ url }],
      pageFunction,
      proxyConfiguration: { useApifyProxy: true },
      maxConcurrency: 1,
      maxRequestsPerCrawl: 1,
      linkSelector: '',
      launchContext: {
        launchOptions: { headless: true },
      },
      navigationTimeoutSecs: 30,
      requestHandlerTimeoutSecs: 30,
    };

    console.log('[StyleGuideExtractor] Discovering pages for:', url);
    const results = await runApifyActor(PLAYWRIGHT_SCRAPER_ACTOR_ID, apiToken, runInput, proxyConfig);

    if (!results || results.length === 0) {
      console.warn('[StyleGuideExtractor] No results from page discovery');
      return [];
    }

    const result = results[0];
    if (result.error) {
      console.warn('[StyleGuideExtractor] Page discovery failed:', result.error);
      return [];
    }

    const rawLinks: Array<{ url: string; label: string; section: string }> = result.links || [];

    // Post-processing: filter, deduplicate, sort
    let baseUrl: URL;
    try {
      baseUrl = new URL(url);
    } catch {
      return [];
    }

    const noisePatterns = /\/(login|logout|sign-in|sign-out|cart|checkout|account|register|wp-admin|wp-login|feed|xmlrpc|\.pdf|\.zip|\.jpg|\.png|\.gif)/i;
    const seen = new Set<string>();
    const pages: DiscoveredPage[] = [];

    for (const link of rawLinks) {
      // Skip non-http links
      if (!link.url || !link.url.startsWith('http')) continue;

      // Check same domain
      let linkUrl: URL;
      try {
        linkUrl = new URL(link.url);
      } catch { continue; }
      if (linkUrl.hostname !== baseUrl.hostname) continue;

      // Skip hash-only, javascript:, mailto:, tel:
      if (link.url.includes('javascript:') || link.url.includes('mailto:') || link.url.includes('tel:')) continue;

      // Normalize: remove trailing slash, hash, query for dedup
      const normalized = linkUrl.origin + linkUrl.pathname.replace(/\/+$/, '');
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      // Skip noise URLs
      if (noisePatterns.test(linkUrl.pathname)) continue;

      // Skip homepage itself (will be auto-added by UI)
      if (linkUrl.pathname === '/' || linkUrl.pathname === '') continue;

      const section = (link.section === 'navigation' || link.section === 'footer' || link.section === 'content')
        ? link.section as DiscoveredPage['section']
        : 'content';

      pages.push({
        url: linkUrl.origin + linkUrl.pathname,
        label: link.label?.trim() || linkUrl.pathname,
        section,
      });
    }

    // Sort: navigation first, then footer, then content
    const sectionOrder: Record<string, number> = { navigation: 0, footer: 1, content: 2 };
    pages.sort((a, b) => (sectionOrder[a.section] ?? 2) - (sectionOrder[b.section] ?? 2));

    // Cap at 20 results
    const capped = pages.slice(0, 20);
    console.log('[StyleGuideExtractor] Discovered', capped.length, 'pages');
    return capped;
  },

  /**
   * Extract style guide elements from a target URL (or multiple URLs) using Apify playwright-scraper.
   * v2: Smart filtering, complexity limits, element screenshots.
   * When given an array of URLs, crawls each explicitly (no link following) and merges results.
   */
  async extractStyleGuide(
    urls: string | string[],
    apiToken: string,
    proxyConfig?: ApifyProxyConfig
  ): Promise<RawStyleGuideExtraction> {
    if (!apiToken) {
      throw new Error('Apify API token is required');
    }

    const startTime = Date.now();

    // Normalize input to array
    const urlList = Array.isArray(urls) ? urls : [urls];
    const isMultiPage = urlList.length > 1;

    // Ensure all URLs have protocol
    const normalizedUrls = urlList.map(u => {
      if (u && !u.startsWith('http://') && !u.startsWith('https://')) {
        return 'https://' + u;
      }
      return u;
    });

    const pageFunction = buildPageFunction();

    const runInput = {
      startUrls: normalizedUrls.map(u => ({ url: u })),
      pageFunction,
      proxyConfiguration: { useApifyProxy: true },
      maxConcurrency: isMultiPage ? 2 : 1,
      maxRequestsPerCrawl: normalizedUrls.length,
      linkSelector: '',
      launchContext: {
        launchOptions: { headless: true },
      },
      navigationTimeoutSecs: 60,
      requestHandlerTimeoutSecs: 180,
    };

    console.log('[StyleGuideExtractor] Starting extraction for', normalizedUrls.length, 'URL(s):', normalizedUrls[0]);
    const results = await runApifyActor(PLAYWRIGHT_SCRAPER_ACTOR_ID, apiToken, runInput, proxyConfig);

    if (!results || results.length === 0) {
      throw new Error('No results from style guide extraction — Apify returned empty dataset');
    }

    // Single page: return directly (existing behavior)
    if (!isMultiPage) {
      const result = results[0];
      if (result.error) {
        throw new Error(`Style guide extraction failed: ${result.error}`);
      }

      console.log('[StyleGuideExtractor] Extracted', result.elements?.length || 0, 'elements');

      return {
        elements: result.elements || [],
        screenshotBase64: result.screenshotBase64 || '',
        pageScreenshots: result.screenshotBase64 ? [{ url: result.url, base64: result.screenshotBase64 }] : [],
        googleFontsUrls: result.googleFontsUrls || [],
        googleFontFamilies: result.googleFontFamilies || [],
        colorMap: result.colorMap || {},
        url: normalizedUrls[0],
        extractionDurationMs: Date.now() - startTime,
        pagesScanned: 1,
      };
    }

    // Multi-page: merge results from all pages
    const allElements: RawExtractedElement[] = [];
    const allGoogleFontsUrls: string[] = [];
    const allGoogleFontFamilies: string[] = [];
    const mergedColorMap: Record<string, { count: number; sources: string[] }> = {};
    const pageScreenshots: { url: string; base64: string }[] = [];
    let primaryScreenshot = '';

    for (const result of results) {
      if (result.error) {
        console.warn('[StyleGuideExtractor] Page failed:', result.url, result.error);
        continue;
      }

      // Tag elements with source page
      const elements = (result.elements || []).map((el: RawExtractedElement) => ({
        ...el,
        sourcePageUrl: result.url,
      }));
      allElements.push(...elements);

      // Collect screenshots
      if (result.screenshotBase64) {
        pageScreenshots.push({ url: result.url, base64: result.screenshotBase64 });
        if (!primaryScreenshot) primaryScreenshot = result.screenshotBase64;
      }

      // Merge Google Fonts (deduplicate)
      for (const fontUrl of (result.googleFontsUrls || [])) {
        if (!allGoogleFontsUrls.includes(fontUrl)) allGoogleFontsUrls.push(fontUrl);
      }
      for (const family of (result.googleFontFamilies || [])) {
        if (!allGoogleFontFamilies.includes(family)) allGoogleFontFamilies.push(family);
      }

      // Merge color maps
      for (const [color, data] of Object.entries(result.colorMap || {})) {
        const existing = mergedColorMap[color];
        if (existing) {
          existing.count += (data as { count: number; sources: string[] }).count;
          for (const src of (data as { count: number; sources: string[] }).sources) {
            if (existing.sources.length < 5 && !existing.sources.includes(src)) {
              existing.sources.push(src);
            }
          }
        } else {
          mergedColorMap[color] = { ...(data as { count: number; sources: string[] }) };
        }
      }
    }

    // Deduplicate elements by CSS hash (same logic as in page function)
    const deduped = deduplicateElements(allElements);

    console.log('[StyleGuideExtractor] Merged', deduped.length, 'elements from', results.length, 'pages');

    return {
      elements: deduped,
      screenshotBase64: primaryScreenshot,
      pageScreenshots,
      googleFontsUrls: allGoogleFontsUrls,
      googleFontFamilies: allGoogleFontFamilies,
      colorMap: mergedColorMap,
      url: normalizedUrls[0],
      extractionDurationMs: Date.now() - startTime,
      pagesScanned: results.filter(r => !r.error).length,
    };
  },
};

/**
 * Deduplicate extracted elements by CSS hash across pages.
 * Keeps max 3 per subcategory (same as in-page limit).
 */
function deduplicateElements(elements: RawExtractedElement[]): RawExtractedElement[] {
  const hashKeys = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'backgroundColor',
    'borderRadius', 'padding', 'border', 'boxShadow'];

  function hashCss(css: Record<string, string>): string {
    return hashKeys.map(k => css[k] || '').join('|');
  }

  const MAX_PER_SUBCATEGORY = 3;
  const subcategoryCounts: Record<string, number> = {};
  const seenHashes: Record<string, Set<string>> = {};
  const result: RawExtractedElement[] = [];

  for (const el of elements) {
    const sub = el.subcategory;
    if (!subcategoryCounts[sub]) subcategoryCounts[sub] = 0;
    if (!seenHashes[sub]) seenHashes[sub] = new Set();

    if (subcategoryCounts[sub] >= MAX_PER_SUBCATEGORY) continue;

    const hash = hashCss(el.computedCss);
    if (seenHashes[sub].has(hash)) continue;

    seenHashes[sub].add(hash);
    subcategoryCounts[sub]++;
    result.push(el);
  }

  return result;
}

/**
 * Build a lightweight Apify page function for navigation link discovery.
 * Only extracts links from nav, header, footer, and main — no element extraction.
 */
function buildDiscoverPagesFunction(): string {
  return `
    async function pageFunction(context) {
      var request = context.request;
      var page = context.page;
      var log = context.log;

      try {
        log.info('Discovering navigation links for:', request.url);

        await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
        await page.waitForTimeout(1500);

        // Dismiss cookie consent (reuse common selectors)
        try {
          var cookieSelectors = [
            '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
            '#CybotCookiebotDialogBodyButtonAccept',
            '#onetrust-accept-btn-handler',
            '.cky-btn-accept',
            'button:has-text("Accept all")',
            'button:has-text("Accept All")',
            'button:has-text("Allow all")',
            'button:has-text("Accept cookies")',
            'button:has-text("I agree")',
            'button:has-text("OK")',
            'button:has-text("Accepteren")',
            'button:has-text("Alles accepteren")',
            'button:has-text("Akkoord")',
            'button:has-text("Alle akzeptieren")',
            'button:has-text("Tout accepter")',
          ];

          for (var ci = 0; ci < cookieSelectors.length; ci++) {
            try {
              var btn = await page.$(cookieSelectors[ci]);
              if (btn) {
                var isVisible = await btn.isVisible().catch(function() { return false; });
                if (isVisible) {
                  await btn.click({ timeout: 2000 });
                  await page.waitForTimeout(500);
                  break;
                }
              }
            } catch (e) { /* next */ }
          }
        } catch (e) { /* done */ }

        // Extract links from navigation areas
        var links = await page.evaluate(function() {
          var results = [];
          var seen = {};

          function addLinks(selector, section) {
            var anchors = document.querySelectorAll(selector);
            for (var i = 0; i < anchors.length; i++) {
              var a = anchors[i];
              var href = a.getAttribute('href');
              if (!href) continue;

              // Resolve to absolute
              try {
                var resolved = new URL(href, window.location.origin).href;
                if (seen[resolved]) continue;
                seen[resolved] = true;

                var text = (a.textContent || '').trim().replace(/\\s+/g, ' ');
                if (text.length > 60) text = text.substring(0, 60);

                results.push({
                  url: resolved,
                  label: text || href,
                  section: section,
                });
              } catch (e) { /* invalid URL */ }
            }
          }

          // Priority order: nav links first, then header, footer, main content
          addLinks('nav a[href]', 'navigation');
          addLinks('header a[href]', 'navigation');
          addLinks('[role="navigation"] a[href]', 'navigation');
          addLinks('footer a[href]', 'footer');
          addLinks('main a[href]', 'content');
          addLinks('[role="main"] a[href]', 'content');

          return results;
        });

        log.info('Found', links.length, 'links');

        return {
          links: links,
          url: request.url,
        };
      } catch (error) {
        log.error('Page discovery failed:', error.message);
        return {
          error: error.message,
          url: request.url,
          links: [],
        };
      }
    }
  `;
}

/**
 * Build the Apify page function string for style guide extraction.
 * This runs inside the Playwright browser context.
 * v2: Smart filtering, complexity limits, depth-limited cloning, element screenshots.
 */
function buildPageFunction(): string {
  const cssPropsMapStr = JSON.stringify(CSS_PROPS_MAP);

  return `
    async function pageFunction(context) {
      const { request, page, log } = context;
      const startTime = Date.now();

      try {
        log.info('Starting style guide extraction for:', request.url);

        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        await page.waitForTimeout(2000);

        // ── Dismiss cookie consent dialogs ──
        log.info('Dismissing cookie consent dialogs...');
        try {
          const cookieAcceptSelectors = [
            '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
            '#CybotCookiebotDialogBodyButtonAccept',
            '[id*="CookiebotDialog"] button[id*="Allow"]',
            '[id*="CookiebotDialog"] button[id*="Accept"]',
            '#onetrust-accept-btn-handler',
            '.onetrust-close-btn-handler',
            '.cky-btn-accept',
            'button:has-text("Accept all")',
            'button:has-text("Accept All")',
            'button:has-text("Allow all")',
            'button:has-text("Allow All")',
            'button:has-text("Accept cookies")',
            'button:has-text("Accept Cookies")',
            'button:has-text("I agree")',
            'button:has-text("Got it")',
            'button:has-text("OK")',
            'button:has-text("Accepteren")',
            'button:has-text("Alles accepteren")',
            'button:has-text("Alle cookies accepteren")',
            'button:has-text("Akkoord")',
            'button:has-text("Toestaan")',
            'button:has-text("Alles toestaan")',
            'button:has-text("Alle akzeptieren")',
            'button:has-text("Akzeptieren")',
            'button:has-text("Zustimmen")',
            'button:has-text("Tout accepter")',
            'button:has-text("Accepter")',
            '[class*="cookie"] button:has-text("Accept")',
            '[class*="cookie"] button:has-text("OK")',
            '[class*="consent"] button:has-text("Accept")',
            '[id*="cookie"] button:has-text("Accept")',
            '[id*="consent"] button:has-text("Accept")',
          ];

          for (const selector of cookieAcceptSelectors) {
            try {
              const btn = await page.$(selector);
              if (btn) {
                const isVisible = await btn.isVisible().catch(() => false);
                if (isVisible) {
                  await btn.click({ timeout: 3000 });
                  log.info('Dismissed cookie consent via:', selector);
                  await page.waitForTimeout(1000);
                  break;
                }
              }
            } catch (e) { /* selector not found, try next */ }
          }
        } catch (e) {
          log.info('Cookie consent dismissal completed');
        }

        await page.waitForTimeout(500);

        // ── Capture page screenshot ──
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: false });
        const screenshotBase64 = screenshot.toString('base64');

        // ── Extract design elements from DOM ──
        const cssPropsMap = ${cssPropsMapStr};

        const extractionResult = await page.evaluate((cssPropsMap) => {
          const MAX_PER_SUBCATEGORY = 3;
          const MAX_TOTAL = 50;
          const elements = [];

          // ── v2: Noise ancestor check — skip elements inside cookie/consent/widget containers ──
          const NOISE_SELECTOR = '[class*="cookie"],[id*="cookie"],[class*="Cookie"],[id*="Cookie"],[class*="consent"],[id*="consent"],[id*="CookieBot"],[id*="Cookiebot"],[id*="CybotCookiebotDialog"],[class*="gdpr"],[id*="gdpr"],[class*="popup"],[class*="modal"],[class*="overlay"],[class*="chat-widget"],[class*="intercom"],[id*="hubspot"],[class*="cookie-banner"],[class*="notice-banner"]';

          function isInsideNoise(el) {
            try {
              return !!el.closest(NOISE_SELECTOR);
            } catch (e) { return false; }
          }

          // ── v2: Complexity check — reject elements that are too large ──
          function isElementTooComplex(el) {
            const html = el.outerHTML;
            if (html.length > 8000) return true;
            if (el.children.length > 25) return true;
            if (el.querySelectorAll('*').length > 100) return true;
            return false;
          }

          // ── Helper: Get computed CSS properties ──
          function getComputedProps(el, propNames) {
            const style = window.getComputedStyle(el);
            const result = {};
            for (const prop of propNames) {
              const val = style[prop];
              if (val && val !== '' && val !== 'none' && val !== 'normal' && val !== '0px' && val !== 'rgba(0, 0, 0, 0)') {
                result[prop] = val;
              }
            }
            return result;
          }

          // ── Helper: Capture hover styles from CSS rules ──
          function capturePseudoStyles(el, propNames) {
            var hoverStyles = {};
            try {
              var sheets = document.styleSheets;
              for (var i = 0; i < sheets.length; i++) {
                try {
                  var rules = sheets[i].cssRules || [];
                  for (var j = 0; j < rules.length; j++) {
                    var rule = rules[j];
                    if (rule.selectorText && rule.selectorText.includes(':hover') && el.matches(rule.selectorText.replace(/:hover/g, ''))) {
                      for (var k = 0; k < rule.style.length; k++) {
                        var prop = rule.style[k];
                        var camel = prop.replace(/-([a-z])/g, function(m, c) { return c.toUpperCase(); });
                        hoverStyles[camel] = rule.style.getPropertyValue(prop);
                      }
                    }
                  }
                } catch(e) { /* cross-origin stylesheet */ }
              }
            } catch(e) { /* ignore */ }
            return hoverStyles;
          }

          // ── Helper: Determine page region ──
          function getPageRegion(el) {
            const parent = el.closest('header, nav, main, article, aside, footer, [role="banner"], [role="main"], [role="contentinfo"], [role="complementary"]');
            if (!parent) return 'unknown';
            const tag = parent.tagName.toLowerCase();
            const role = parent.getAttribute('role') || '';
            if (tag === 'header' || role === 'banner') return 'header';
            if (tag === 'nav') return 'header';
            if (tag === 'footer' || role === 'contentinfo') return 'footer';
            if (tag === 'aside' || role === 'complementary') return 'sidebar';
            if (tag === 'main' || tag === 'article' || role === 'main') return 'main';
            return 'unknown';
          }

          // ── Helper: Find nearest ancestor with a non-transparent background ──
          function getAncestorBackground(el) {
            var current = el;
            while (current && current !== document.documentElement) {
              var style = window.getComputedStyle(current);
              var bg = style.backgroundColor;
              var bgImg = style.backgroundImage;
              if (bgImg && bgImg !== 'none') return { backgroundColor: bg, backgroundImage: bgImg };
              if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return { backgroundColor: bg, backgroundImage: 'none' };
              current = current.parentElement;
            }
            return { backgroundColor: 'rgb(255, 255, 255)', backgroundImage: 'none' };
          }

          // ── v2: Depth-limited self-contained HTML builder ──
          function buildSelfContained(el, computedCss, maxDepth) {
            maxDepth = maxDepth || 3;

            // Compact property list for child elements
            var childProps = ['fontFamily','fontSize','fontWeight','color','lineHeight',
              'letterSpacing','textTransform','textDecoration','background','backgroundColor',
              'border','borderRadius','padding','margin','display','flexDirection',
              'alignItems','justifyContent','gap','boxShadow','textAlign','width','maxWidth','opacity'];

            function cloneWithDepth(node, depth) {
              if (depth > maxDepth) return null;
              var clone = node.cloneNode(false);

              // Apply computed styles to element nodes (root + first 2 levels of children)
              if (clone.nodeType === 1 && clone.setAttribute) {
                if (depth === 0) {
                  // Root: use the pre-computed CSS from category-specific props
                  var styleStr = Object.entries(computedCss)
                    .map(function(pair) { return pair[0].replace(/([A-Z])/g, '-$1').toLowerCase() + ': ' + pair[1]; })
                    .join('; ');
                  clone.setAttribute('style', styleStr);
                } else if (depth <= 2) {
                  // Children (depth 1-2): compute their styles from compact property list
                  var childStyle = window.getComputedStyle(node);
                  var entries = [];
                  for (var ci = 0; ci < childProps.length; ci++) {
                    var val = childStyle[childProps[ci]];
                    if (val && val !== '' && val !== 'none' && val !== 'normal'
                        && val !== '0px' && val !== 'rgba(0, 0, 0, 0)') {
                      entries.push(childProps[ci].replace(/([A-Z])/g, '-$1').toLowerCase() + ': ' + val);
                    }
                  }
                  if (entries.length > 0) clone.setAttribute('style', entries.join('; '));
                }
              }

              // Clone children with depth limit
              for (var i = 0; i < node.childNodes.length; i++) {
                var child = node.childNodes[i];
                if (child.nodeType === 3) { // Text node
                  clone.appendChild(child.cloneNode(false));
                } else if (child.nodeType === 1) { // Element node
                  var childClone = cloneWithDepth(child, depth + 1);
                  if (childClone) clone.appendChild(childClone);
                }
              }

              // Remove noise and dangerous attributes
              if (clone.removeAttribute) {
                var attrs = Array.from(clone.attributes || []);
                for (var j = 0; j < attrs.length; j++) {
                  var attr = attrs[j];
                  if (attr.name.startsWith('data-') && attr.name !== 'data-sg-id') {
                    clone.removeAttribute(attr.name);
                  }
                  // Strip ALL on* event handler attributes
                  if (attr.name.match(/^on/i)) {
                    clone.removeAttribute(attr.name);
                  }
                  // Neutralize javascript: URIs
                  if ((attr.name === 'href' || attr.name === 'src' || attr.name === 'action') && attr.value && attr.value.trim().toLowerCase().startsWith('javascript:')) {
                    clone.removeAttribute(attr.name);
                  }
                }
                // Strip external src on img/source/video/audio (won't resolve in preview)
                var tagLower = clone.tagName ? clone.tagName.toLowerCase() : '';
                if (tagLower === 'img' || tagLower === 'source' || tagLower === 'video' || tagLower === 'audio') {
                  var elSrc = clone.getAttribute('src');
                  if (elSrc && (elSrc.startsWith('http://') || elSrc.startsWith('https://'))) {
                    clone.removeAttribute('src');
                  }
                  // Strip external srcset
                  var srcset = clone.getAttribute('srcset');
                  if (srcset && srcset.match(/https?:\/\//)) {
                    clone.removeAttribute('srcset');
                  }
                  // Strip poster (video)
                  var poster = clone.getAttribute('poster');
                  if (poster && (poster.startsWith('http://') || poster.startsWith('https://'))) {
                    clone.removeAttribute('poster');
                  }
                }
                // Strip SVG external references (use/image href, xlink:href)
                if (tagLower === 'use' || tagLower === 'image') {
                  var svgHref = clone.getAttribute('href') || clone.getAttribute('xlink:href');
                  if (svgHref && (svgHref.startsWith('http://') || svgHref.startsWith('https://'))) {
                    clone.removeAttribute('href');
                    clone.removeAttribute('xlink:href');
                  }
                }
                // Strip data-src (lazy-load attributes)
                if (clone.getAttribute('data-src') && clone.getAttribute('data-src').match(/^https?:\/\//)) {
                  clone.removeAttribute('data-src');
                }
                // Neutralize url() in inline style with external URLs
                var inlineStyle = clone.getAttribute('style');
                if (inlineStyle && inlineStyle.match(/url\s*\(\s*['"]?https?:\/\//)) {
                  clone.setAttribute('style', inlineStyle.replace(/url\(\s*['"]?https?:\/\/[^'")]+['"]?\s*\)/gi, 'url(data:,)'));
                }
              }

              // Remove dangerous elements from clone
              if (clone.querySelectorAll) {
                clone.querySelectorAll('script,link,iframe,embed,object,meta,base,noscript').forEach(function(s) { s.remove(); });
              }

              return clone;
            }

            var result = cloneWithDepth(el, 0);
            return result ? result.outerHTML : '';
          }

          // ── Helper: Hash computed CSS for dedup ──
          function hashCss(css) {
            var keys = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'backgroundColor',
                          'borderRadius', 'padding', 'border', 'boxShadow'];
            return keys.map(function(k) { return css[k] || ''; }).join('|');
          }

          // ── Helper: Truncate outerHTML ──
          function truncateHtml(html, maxLen) {
            if (html.length <= maxLen) return html;
            return html.substring(0, maxLen) + '<!-- truncated -->';
          }

          // ── v2: Size filter check ──
          function passesSizeFilter(el, filter) {
            if (!filter) return true;
            var rect = el.getBoundingClientRect();
            if (filter.maxWidth && rect.width > filter.maxWidth) return false;
            if (filter.maxHeight && rect.height > filter.maxHeight) return false;
            return true;
          }

          // ── v2: Improved category extraction configs ──
          var categories = [
            {
              category: 'typography',
              subcategories: [
                { name: 'h1', selectors: ['h1'] },
                { name: 'h2', selectors: ['h2'] },
                { name: 'h3', selectors: ['h3'] },
                { name: 'h4', selectors: ['h4'] },
                { name: 'body-text', selectors: ['p', '.content p', 'article p'] },
                { name: 'links', selectors: ['a:not(nav a):not(header a):not(footer a)'] },
                { name: 'lists', selectors: ['ul', 'ol'] },
              ],
            },
            {
              category: 'buttons',
              subcategories: [
                {
                  name: 'cta-button',
                  selectors: [
                    'a[class*="btn"]:not(nav a)',
                    'a[class*="cta"]',
                    'a[class*="button"]:not(nav a):not(header a)',
                    'button[class*="btn"]:not([class*="menu"]):not([class*="toggle"]):not([class*="close"]):not([class*="nav"])',
                    'button[class*="button"]:not([class*="menu"]):not([class*="toggle"]):not([class*="close"])',
                    '.wp-block-button a',
                    'input[type="submit"]',
                    'button[type="submit"]',
                    '[role="button"]:not(nav [role="button"])',
                    'a[class*="action"]',
                    'a[class*="link-button"]',
                    'a[class*="primary"]',
                    'a[class*="secondary"]',
                  ],
                },
              ],
            },
            {
              category: 'cards',
              subcategories: [
                {
                  name: 'card',
                  selectors: [
                    '.card:not(body > .card)',
                    '[class*="feature-box"]', '[class*="pricing-table"]',
                    '[class*="service-item"]', '[class*="team-member"]',
                    '[class*="post-card"]', '[class*="blog-card"]',
                  ],
                  sizeFilter: { maxWidth: 800, maxHeight: 1000 },
                },
              ],
            },
            {
              category: 'navigation',
              subcategories: [
                {
                  name: 'nav-bar',
                  selectors: ['nav > ul', 'nav > div > ul', '[role="navigation"] > ul'],
                  simplifyNav: true,
                },
                {
                  name: 'breadcrumb',
                  selectors: ['.breadcrumbs', '.breadcrumb', '[class*="breadcrumb"]'],
                },
              ],
            },
            {
              category: 'accordions',
              subcategories: [
                {
                  name: 'accordion',
                  selectors: [
                    '[class*="accordion"]', '[class*="collapse"]',
                    'details', '[class*="tab"]',
                  ],
                },
              ],
            },
            {
              category: 'section-breaks',
              subcategories: [
                {
                  name: 'divider',
                  selectors: ['hr', '[class*="divider"]', '[class*="separator"]'],
                },
              ],
            },
            {
              category: 'images',
              subcategories: [
                { name: 'image', selectors: ['img'] },
              ],
            },
            {
              category: 'tables',
              subcategories: [
                {
                  name: 'table',
                  selectors: [
                    'table',
                    '[class*="pricing"]',
                    '[class*="comparison"]',
                    '[role="grid"]',
                  ],
                },
              ],
            },
            {
              category: 'forms',
              subcategories: [
                {
                  name: 'input',
                  selectors: ['input:not([type="hidden"])', 'select', 'textarea'],
                },
              ],
            },
          ];

          var seenHashes = {}; // subcategory -> { hash: true }

          for (var ci = 0; ci < categories.length; ci++) {
            var cat = categories[ci];
            if (elements.length >= MAX_TOTAL) break;

            var cssProps = cssPropsMap[cat.category] || cssPropsMap['typography'];

            for (var si = 0; si < cat.subcategories.length; si++) {
              var sub = cat.subcategories[si];
              if (elements.length >= MAX_TOTAL) break;

              if (!seenHashes[sub.name]) seenHashes[sub.name] = {};
              var hashSet = seenHashes[sub.name];
              var count = 0;

              // Determine clone depth by category
              var cloneDepth = sub.simplifyNav ? 2 :
                (cat.category === 'accordions' || cat.category === 'cards' || cat.category === 'tables') ? 5 : 3;

              for (var seli = 0; seli < sub.selectors.length; seli++) {
                var selector = sub.selectors[seli];
                if (count >= MAX_PER_SUBCATEGORY) break;

                try {
                  var matched = document.querySelectorAll(selector);
                  var limit = cat.category === 'images' ? 5 : matched.length;

                  for (var i = 0; i < Math.min(limit, matched.length); i++) {
                    if (count >= MAX_PER_SUBCATEGORY) break;
                    if (elements.length >= MAX_TOTAL) break;

                    var el = matched[i];

                    // v2: Skip elements inside noise ancestors
                    if (isInsideNoise(el)) continue;

                    // Skip hidden/tiny elements
                    var rect = el.getBoundingClientRect();
                    if (rect.width < 10 || rect.height < 5) continue;
                    // Skip offscreen
                    if (rect.top > 5000) continue;

                    // v2: Complexity check
                    if (isElementTooComplex(el)) continue;

                    // v2: Size filter for cards etc.
                    if (!passesSizeFilter(el, sub.sizeFilter)) continue;

                    var computed = getComputedProps(el, cssProps);
                    var hash = hashCss(computed);

                    // Deduplicate
                    if (hashSet[hash]) continue;
                    hashSet[hash] = true;
                    count++;

                    var originalHtmlLen = el.outerHTML.length;
                    var outerHtml = truncateHtml(el.outerHTML, 3000);
                    var selfContained = buildSelfContained(el, computed, cloneDepth);

                    // Tag element for screenshot capture
                    var sgId = elements.length;
                    el.setAttribute('data-sg-id', String(sgId));

                    var elData = {
                      category: cat.category,
                      subcategory: sub.name,
                      selector: selector,
                      elementTag: el.tagName.toLowerCase(),
                      classNames: Array.from(el.classList || []),
                      outerHtml: outerHtml,
                      computedCss: computed,
                      selfContainedHtml: truncateHtml(selfContained, 8000),
                      pageRegion: getPageRegion(el),
                      childCount: el.children.length,
                      outerHtmlLength: originalHtmlLen,
                      ancestorBackground: getAncestorBackground(el),
                    };

                    // Capture hover styles for buttons and links
                    if (cat.category === 'buttons' || sub.name === 'links') {
                      var hoverCss = capturePseudoStyles(el, cssProps);
                      if (Object.keys(hoverCss).length > 0) {
                        elData.hoverCss = hoverCss;
                      }
                    }

                    elements.push(elData);
                  }
                } catch (e) {
                  // Selector failed, continue
                }
              }
            }
          }

          // ── Extract background sections (enhanced: 6 max, hero selectors, content included) ──
          if (elements.length < MAX_TOTAL) {
            try {
              var sections = document.querySelectorAll('section, [class*="section"], .hero, [class*="hero"], [class*="banner"], [class*="jumbotron"], [class*="cta-section"], [class*="feature"], main > div:first-child');
              var bgCount = 0;
              var bgProps = cssPropsMap['backgrounds'];

              for (var bi = 0; bi < sections.length; bi++) {
                var section = sections[bi];
                if (bgCount >= 6 || elements.length >= MAX_TOTAL) break;

                // v2: Skip noise ancestors
                if (isInsideNoise(section)) continue;

                var style = window.getComputedStyle(section);
                var bg = style.backgroundColor;
                var bgImage = style.backgroundImage;

                // Skip white/transparent backgrounds
                if ((!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'rgb(255, 255, 255)') &&
                    (!bgImage || bgImage === 'none')) continue;

                var computed = getComputedProps(section, bgProps);

                // Extract heading and first paragraph text for context
                var heading = section.querySelector('h1, h2, h3, h4');
                var headingText = heading ? (heading.textContent || '').trim().substring(0, 60) : '';
                var firstPara = section.querySelector('p');
                var paraText = firstPara ? (firstPara.textContent || '').trim().substring(0, 100) : '';

                var contentHtml = '';
                if (headingText) contentHtml += '<h3 style="margin:0 0 8px;font-size:16px;color:inherit;">' + headingText + '</h3>';
                if (paraText) contentHtml += '<p style="margin:0;font-size:13px;color:inherit;opacity:0.8;">' + paraText + '</p>';

                var selfContained = '<div style="' +
                  Object.entries(computed).map(function(pair) { return pair[0].replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + pair[1]; }).join(';') +
                  ';min-height:80px;width:100%;padding:20px;box-sizing:border-box;">' + contentHtml + '</div>';

                var bgSgId = elements.length;
                section.setAttribute('data-sg-id', String(bgSgId));

                elements.push({
                  category: 'backgrounds',
                  subcategory: 'section-bg',
                  selector: section.tagName.toLowerCase() + (section.className ? '.' + Array.from(section.classList).join('.') : ''),
                  elementTag: section.tagName.toLowerCase(),
                  classNames: Array.from(section.classList || []),
                  outerHtml: '<!-- background section -->',
                  computedCss: computed,
                  selfContainedHtml: selfContained,
                  pageRegion: 'main',
                  childCount: section.children.length,
                  outerHtmlLength: 0,
                });
                bgCount++;
              }
            } catch (e) { /* ignore */ }
          }

          // ── Extract Google Fonts ──
          var googleFontsUrls = [];
          var googleFontFamilies = [];
          try {
            var links = document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]');
            links.forEach(function(link) {
              var href = link.getAttribute('href');
              if (href) googleFontsUrls.push(href);
            });

            var styles = document.querySelectorAll('style');
            styles.forEach(function(style) {
              var text = style.textContent || '';
              var importMatches = text.match(/@import\\s+url\\(['"]?(https?:\\/\\/fonts\\.googleapis\\.com[^'")]+)['"]?\\)/g);
              if (importMatches) {
                importMatches.forEach(function(m) {
                  var urlMatch = m.match(/url\\(['"]?(https?:\\/\\/fonts\\.googleapis\\.com[^'")]+)['"]?\\)/);
                  if (urlMatch) googleFontsUrls.push(urlMatch[1]);
                });
              }
            });

            googleFontsUrls.forEach(function(url) {
              var familyMatches = url.match(/family=([^&]+)/g);
              if (familyMatches) {
                familyMatches.forEach(function(fm) {
                  var name = fm.replace('family=', '').split(':')[0].replace(/\\+/g, ' ');
                  if (name && !googleFontFamilies.includes(name)) googleFontFamilies.push(name);
                });
              }
            });
          } catch (e) { /* ignore */ }

          // ── Extract colors from all elements ──
          var colorMap = {};
          try {
            var colorEls = document.querySelectorAll('a, button, h1, h2, h3, h4, p, [class*="btn"], [class*="cta"], nav a, header, footer');
            colorEls.forEach(function(el) {
              // v2: Skip noise
              if (isInsideNoise(el)) return;

              var style = window.getComputedStyle(el);
              var bg = style.backgroundColor;
              var color = style.color;
              if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                colorMap[bg] = (colorMap[bg] || { count: 0, sources: [] });
                colorMap[bg].count++;
                if (colorMap[bg].sources.length < 3) colorMap[bg].sources.push(el.tagName.toLowerCase());
              }
              if (color) {
                colorMap[color] = (colorMap[color] || { count: 0, sources: [] });
                colorMap[color].count++;
                if (colorMap[color].sources.length < 3) colorMap[color].sources.push(el.tagName.toLowerCase());
              }
            });
          } catch (e) { /* ignore */ }

          return {
            elements: elements,
            googleFontsUrls: googleFontsUrls,
            googleFontFamilies: googleFontFamilies,
            colorMap: colorMap,
          };
        }, cssPropsMap);

        // ── v2: Capture per-element screenshots ──
        var MAX_SCREENSHOTS = 15;
        var elementCount = extractionResult.elements.length;
        log.info('Capturing element screenshots (max ' + MAX_SCREENSHOTS + ' of ' + elementCount + ')...');

        for (var i = 0; i < Math.min(elementCount, MAX_SCREENSHOTS); i++) {
          try {
            var loc = page.locator('[data-sg-id="' + i + '"]').first();
            var isVis = await loc.isVisible({ timeout: 1000 }).catch(function() { return false; });
            if (isVis) {
              var shot = await loc.screenshot({ type: 'jpeg', quality: 70, timeout: 3000 });
              extractionResult.elements[i].elementScreenshotBase64 = shot.toString('base64');
            }
          } catch (e) {
            // Skip screenshot for this element
          }
        }

        var extractionDurationMs = Date.now() - startTime;
        log.info('Extraction complete:', extractionResult.elements.length, 'elements in', extractionDurationMs, 'ms');

        return {
          elements: extractionResult.elements,
          googleFontsUrls: extractionResult.googleFontsUrls,
          googleFontFamilies: extractionResult.googleFontFamilies,
          colorMap: extractionResult.colorMap,
          screenshotBase64: screenshotBase64,
          url: request.url,
          extractionDurationMs: extractionDurationMs,
        };
      } catch (error) {
        log.error('Style guide extraction failed:', error.message);
        return {
          error: error.message,
          url: request.url,
          elements: [],
          googleFontsUrls: [],
          googleFontFamilies: [],
          screenshotBase64: null,
          extractionDurationMs: Date.now() - startTime,
        };
      }
    }
  `;
}
