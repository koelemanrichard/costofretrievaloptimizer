// =============================================================================
// StyleGuideExtractor — Extract actual HTML + computed CSS from target site DOM
// =============================================================================
// Uses Apify playwright-scraper to capture real design elements, not AI guesses.
// Each element is extracted as self-contained HTML with inline styles.

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
}

export const StyleGuideExtractor = {
  /**
   * Extract style guide elements from a target URL using Apify playwright-scraper.
   */
  async extractStyleGuide(
    url: string,
    apiToken: string,
    proxyConfig?: ApifyProxyConfig
  ): Promise<RawStyleGuideExtraction> {
    if (!apiToken) {
      throw new Error('Apify API token is required');
    }

    // Ensure URL has protocol
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const pageFunction = buildPageFunction();

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
      navigationTimeoutSecs: 60,
      requestHandlerTimeoutSecs: 120,
    };

    console.log('[StyleGuideExtractor] Starting extraction for:', url);
    const results = await runApifyActor(PLAYWRIGHT_SCRAPER_ACTOR_ID, apiToken, runInput, proxyConfig);

    if (!results || results.length === 0) {
      throw new Error('No results from style guide extraction — Apify returned empty dataset');
    }

    const result = results[0];
    if (result.error) {
      throw new Error(`Style guide extraction failed: ${result.error}`);
    }

    console.log('[StyleGuideExtractor] Extracted', result.elements?.length || 0, 'elements');
    return result as RawStyleGuideExtraction;
  },
};

/**
 * Build the Apify page function string for style guide extraction.
 * This runs inside the Playwright browser context.
 */
function buildPageFunction(): string {
  // Stringify the CSS props map for injection into the page function
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

        // ── Capture screenshot ──
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: false });
        const screenshotBase64 = screenshot.toString('base64');

        // ── Extract design elements from DOM ──
        const cssPropsMap = ${cssPropsMapStr};

        const extractionResult = await page.evaluate((cssPropsMap) => {
          const MAX_PER_SUBCATEGORY = 3;
          const MAX_TOTAL = 50;
          const elements = [];

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

          // ── Helper: Build self-contained HTML ──
          function buildSelfContained(el, computedCss) {
            const clone = el.cloneNode(true);
            // Remove data-* attributes and scripts
            clone.querySelectorAll('script').forEach(s => s.remove());
            const allEls = [clone, ...clone.querySelectorAll('*')];
            for (const child of allEls) {
              const attrs = Array.from(child.attributes || []);
              for (const attr of attrs) {
                if (attr.name.startsWith('data-') || attr.name === 'onclick' || attr.name === 'onload') {
                  child.removeAttribute(attr.name);
                }
              }
            }
            // Apply computed styles inline
            const styleStr = Object.entries(computedCss)
              .map(([k, v]) => k.replace(/([A-Z])/g, '-$1').toLowerCase() + ': ' + v)
              .join('; ');
            clone.setAttribute('style', styleStr);
            return clone.outerHTML;
          }

          // ── Helper: Hash computed CSS for dedup ──
          function hashCss(css) {
            const keys = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'backgroundColor',
                          'borderRadius', 'padding', 'border', 'boxShadow'];
            return keys.map(k => css[k] || '').join('|');
          }

          // ── Helper: Truncate outerHTML ──
          function truncateHtml(html, maxLen) {
            if (html.length <= maxLen) return html;
            return html.substring(0, maxLen) + '<!-- truncated -->';
          }

          // ── Category extraction configs ──
          const categories = [
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
                  name: 'button',
                  selectors: [
                    'button:not([class*="cookie"]):not([class*="consent"])',
                    '.btn', '[class*="button"]:not([class*="cookie"])',
                    'a[class*="btn"]', '[role="button"]',
                    'input[type="submit"]',
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
                    '.card', '[class*="card"]', 'article',
                    '[class*="feature"]', '[class*="pricing"]',
                  ],
                },
              ],
            },
            {
              category: 'navigation',
              subcategories: [
                {
                  name: 'nav',
                  selectors: ['nav', '[role="navigation"]', '.breadcrumbs', '.breadcrumb'],
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

          const seenHashes = new Map(); // subcategory -> Set<hash>

          for (const cat of categories) {
            if (elements.length >= MAX_TOTAL) break;

            const cssProps = cssPropsMap[cat.category] || cssPropsMap['typography'];

            for (const sub of cat.subcategories) {
              if (elements.length >= MAX_TOTAL) break;

              const hashSet = seenHashes.get(sub.name) || new Set();
              seenHashes.set(sub.name, hashSet);
              let count = 0;

              for (const selector of sub.selectors) {
                if (count >= MAX_PER_SUBCATEGORY) break;

                try {
                  const matched = document.querySelectorAll(selector);
                  const limit = cat.category === 'images' ? 5 : matched.length;

                  for (let i = 0; i < Math.min(limit, matched.length); i++) {
                    if (count >= MAX_PER_SUBCATEGORY) break;
                    if (elements.length >= MAX_TOTAL) break;

                    const el = matched[i];

                    // Skip hidden/tiny elements
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 10 || rect.height < 5) continue;
                    // Skip offscreen
                    if (rect.top > 5000) continue;

                    const computed = getComputedProps(el, cssProps);
                    const hash = hashCss(computed);

                    // Deduplicate
                    if (hashSet.has(hash)) continue;
                    hashSet.add(hash);
                    count++;

                    const outerHtml = truncateHtml(el.outerHTML, 3000);
                    const selfContained = buildSelfContained(el, computed);

                    elements.push({
                      category: cat.category,
                      subcategory: sub.name,
                      selector: selector,
                      elementTag: el.tagName.toLowerCase(),
                      classNames: Array.from(el.classList || []),
                      outerHtml,
                      computedCss: computed,
                      selfContainedHtml: truncateHtml(selfContained, 5000),
                      pageRegion: getPageRegion(el),
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
              const sections = document.querySelectorAll('section, [class*="section"], .hero, [class*="hero"], [class*="banner"]');
              let bgCount = 0;
              const bgProps = cssPropsMap['backgrounds'];

              for (const section of sections) {
                if (bgCount >= 3 || elements.length >= MAX_TOTAL) break;
                const style = window.getComputedStyle(section);
                const bg = style.backgroundColor;
                const bgImage = style.backgroundImage;

                // Skip white/transparent backgrounds
                if ((!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'rgb(255, 255, 255)') &&
                    (!bgImage || bgImage === 'none')) continue;

                const computed = getComputedProps(section, bgProps);
                const selfContained = '<div style="' +
                  Object.entries(computed).map(([k, v]) => k.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + v).join(';') +
                  ';min-height:80px;width:100%"></div>';

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
                });
                bgCount++;
              }
            } catch (e) { /* ignore */ }
          }

          // ── Extract Google Fonts ──
          const googleFontsUrls = [];
          const googleFontFamilies = [];
          try {
            const links = document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]');
            links.forEach(link => {
              const href = link.getAttribute('href');
              if (href) googleFontsUrls.push(href);
            });

            const styles = document.querySelectorAll('style');
            styles.forEach(style => {
              const text = style.textContent || '';
              const importMatches = text.match(/@import\\s+url\\(['"]?(https?:\\/\\/fonts\\.googleapis\\.com[^'")]+)['"]?\\)/g);
              if (importMatches) {
                importMatches.forEach(m => {
                  const urlMatch = m.match(/url\\(['"]?(https?:\\/\\/fonts\\.googleapis\\.com[^'")]+)['"]?\\)/);
                  if (urlMatch) googleFontsUrls.push(urlMatch[1]);
                });
              }
            });

            googleFontsUrls.forEach(url => {
              const familyMatches = url.match(/family=([^&]+)/g);
              if (familyMatches) {
                familyMatches.forEach(fm => {
                  const name = fm.replace('family=', '').split(':')[0].replace(/\\+/g, ' ');
                  if (name && !googleFontFamilies.includes(name)) googleFontFamilies.push(name);
                });
              }
            });
          } catch (e) { /* ignore */ }

          // ── Extract colors from all elements ──
          const colorMap = {};
          try {
            const colorEls = document.querySelectorAll('a, button, h1, h2, h3, h4, p, [class*="btn"], [class*="cta"], nav a, header, footer');
            colorEls.forEach(el => {
              const style = window.getComputedStyle(el);
              const bg = style.backgroundColor;
              const color = style.color;
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
            elements,
            googleFontsUrls,
            googleFontFamilies,
            colorMap,
          };
        }, cssPropsMap);

        const extractionDurationMs = Date.now() - startTime;

        log.info('Extraction complete:', extractionResult.elements.length, 'elements in', extractionDurationMs, 'ms');

        return {
          elements: extractionResult.elements,
          googleFontsUrls: extractionResult.googleFontsUrls,
          googleFontFamilies: extractionResult.googleFontFamilies,
          colorMap: extractionResult.colorMap,
          screenshotBase64,
          url: request.url,
          extractionDurationMs,
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
