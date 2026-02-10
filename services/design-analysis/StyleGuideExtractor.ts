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
   * Extract style guide elements from a target URL using Apify playwright-scraper.
   * v2: Crawls up to 4 pages on the same domain, merges results.
   */
  async extractStyleGuide(
    url: string,
    apiToken: string,
    proxyConfig?: ApifyProxyConfig
  ): Promise<RawStyleGuideExtraction> {
    if (!apiToken) {
      throw new Error('Apify API token is required');
    }

    const startTime = Date.now();

    // Ensure URL has protocol
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Extract hostname for same-domain restriction
    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = url.replace(/^https?:\/\//, '').split('/')[0];
    }

    const pageFunction = buildPageFunction();

    const runInput = {
      startUrls: [{ url }],
      pageFunction,
      proxyConfiguration: { useApifyProxy: true },
      maxConcurrency: 2,
      maxRequestsPerCrawl: 4,
      linkSelector: 'a[href]',
      pseudoUrls: [
        { purl: `https://${hostname}[.*]` },
        { purl: `http://${hostname}[.*]` },
      ],
      launchContext: {
        launchOptions: { headless: true },
      },
      navigationTimeoutSecs: 60,
      requestHandlerTimeoutSecs: 120,
    };

    console.log('[StyleGuideExtractor] Starting multi-page extraction for:', url, '(up to 4 pages on', hostname, ')');
    const results = await runApifyActor(PLAYWRIGHT_SCRAPER_ACTOR_ID, apiToken, runInput, proxyConfig);

    if (!results || results.length === 0) {
      throw new Error('No results from style guide extraction — Apify returned empty dataset');
    }

    // Merge results from all crawled pages
    const allElements: RawExtractedElement[] = [];
    const pageScreenshots: { url: string; base64: string }[] = [];
    let googleFontsUrls: string[] = [];
    let googleFontFamilies: string[] = [];
    const colorMaps: Record<string, { count: number; sources: string[] }>[] = [];
    let firstScreenshot = '';
    let pagesScanned = 0;

    for (const result of results) {
      if (result.error) {
        console.warn('[StyleGuideExtractor] Page error:', result.url, result.error);
        continue;
      }
      pagesScanned++;

      if (result.elements) {
        for (const el of result.elements) {
          el.sourcePageUrl = result.url;
          allElements.push(el);
        }
      }

      if (result.screenshotBase64) {
        pageScreenshots.push({ url: result.url, base64: result.screenshotBase64 });
        if (!firstScreenshot) firstScreenshot = result.screenshotBase64;
      }

      if (result.googleFontsUrls) googleFontsUrls.push(...result.googleFontsUrls);
      if (result.googleFontFamilies) googleFontFamilies.push(...result.googleFontFamilies);
      if (result.colorMap) colorMaps.push(result.colorMap);
    }

    // Deduplicate fonts
    googleFontsUrls = [...new Set(googleFontsUrls)];
    googleFontFamilies = [...new Set(googleFontFamilies)];

    // Merge colorMaps
    const mergedColorMap: Record<string, { count: number; sources: string[] }> = {};
    for (const cm of colorMaps) {
      for (const [color, data] of Object.entries(cm)) {
        if (!mergedColorMap[color]) mergedColorMap[color] = { count: 0, sources: [] };
        mergedColorMap[color].count += data.count;
        mergedColorMap[color].sources.push(...(data.sources || []));
      }
    }

    console.log('[StyleGuideExtractor] Merged', allElements.length, 'elements from', pagesScanned, 'pages');

    return {
      elements: allElements,
      screenshotBase64: firstScreenshot,
      pageScreenshots,
      googleFontsUrls,
      googleFontFamilies,
      colorMap: mergedColorMap,
      url,
      extractionDurationMs: Date.now() - startTime,
      pagesScanned,
    };
  },
};

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

          // ── v2: Depth-limited self-contained HTML builder ──
          function buildSelfContained(el, computedCss, maxDepth) {
            maxDepth = maxDepth || 3;

            function cloneWithDepth(node, depth) {
              if (depth > maxDepth) return null;
              var clone = node.cloneNode(false);

              // Apply inline styles to root
              if (depth === 0) {
                var styleStr = Object.entries(computedCss)
                  .map(function(pair) { return pair[0].replace(/([A-Z])/g, '-$1').toLowerCase() + ': ' + pair[1]; })
                  .join('; ');
                clone.setAttribute('style', styleStr);
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

              // Remove noise attributes
              if (clone.removeAttribute) {
                var attrs = Array.from(clone.attributes || []);
                for (var j = 0; j < attrs.length; j++) {
                  var attr = attrs[j];
                  if (attr.name.startsWith('data-') && attr.name !== 'data-sg-id') {
                    clone.removeAttribute(attr.name);
                  }
                  if (attr.name === 'onclick' || attr.name === 'onload') {
                    clone.removeAttribute(attr.name);
                  }
                }
              }

              // Remove script elements
              if (clone.querySelectorAll) {
                clone.querySelectorAll('script').forEach(function(s) { s.remove(); });
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
                    'button[class*="btn"]:not([class*="menu"]):not([class*="toggle"]):not([class*="close"]):not([class*="nav"])',
                    '.wp-block-button a',
                    'input[type="submit"]',
                    'a[class*="button"]:not(nav a):not(header a)',
                    'button[type="submit"]',
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
                { name: 'table', selectors: ['table'] },
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

              // Determine clone depth: simplified nav gets depth 2
              var cloneDepth = sub.simplifyNav ? 2 : 3;

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

                    elements.push({
                      category: cat.category,
                      subcategory: sub.name,
                      selector: selector,
                      elementTag: el.tagName.toLowerCase(),
                      classNames: Array.from(el.classList || []),
                      outerHtml: outerHtml,
                      computedCss: computed,
                      selfContainedHtml: truncateHtml(selfContained, 5000),
                      pageRegion: getPageRegion(el),
                      childCount: el.children.length,
                      outerHtmlLength: originalHtmlLen,
                    });
                  }
                } catch (e) {
                  // Selector failed, continue
                }
              }
            }
          }

          // ── Extract background sections ──
          if (elements.length < MAX_TOTAL) {
            try {
              var sections = document.querySelectorAll('section, [class*="section"], .hero, [class*="hero"], [class*="banner"]');
              var bgCount = 0;
              var bgProps = cssPropsMap['backgrounds'];

              for (var bi = 0; bi < sections.length; bi++) {
                var section = sections[bi];
                if (bgCount >= 3 || elements.length >= MAX_TOTAL) break;

                // v2: Skip noise ancestors
                if (isInsideNoise(section)) continue;

                var style = window.getComputedStyle(section);
                var bg = style.backgroundColor;
                var bgImage = style.backgroundImage;

                // Skip white/transparent backgrounds
                if ((!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'rgb(255, 255, 255)') &&
                    (!bgImage || bgImage === 'none')) continue;

                var computed = getComputedProps(section, bgProps);
                var selfContained = '<div style="' +
                  Object.entries(computed).map(function(pair) { return pair[0].replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + pair[1]; }).join(';') +
                  ';min-height:80px;width:100%"></div>';

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
        var MAX_SCREENSHOTS = 25;
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
