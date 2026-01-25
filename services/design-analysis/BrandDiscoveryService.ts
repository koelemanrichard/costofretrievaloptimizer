import { runApifyActor } from '../apifyService';
import type {
  BrandDiscoveryReport,
  DesignFinding,
  ExtractionConfidence,
  DesignTokens
} from '../../types/publishing';

const WEB_SCRAPER_ACTOR_ID = 'apify/web-scraper';

/**
 * Enhanced Brand Discovery Service with screenshot capture and confidence scoring.
 * Analyzes target websites to extract design tokens with provenance tracking.
 */
export const BrandDiscoveryService = {
  /**
   * Analyze a URL and generate a complete Brand Discovery Report
   */
  async analyze(url: string, apiToken: string): Promise<BrandDiscoveryReport> {
    if (!apiToken) {
      throw new Error('Apify API token is required');
    }

    const pageFunction = `
      async function pageFunction(context) {
        const { request, page } = context;
        await page.waitForLoadState('networkidle');

        // Capture screenshot
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality: 80,
          fullPage: false
        });
        const screenshotBase64 = screenshot.toString('base64');

        // Helper: Check if color is neutral (white, black, gray)
        const isNeutral = (c) => {
          if (!c || c.includes('rgba(0, 0, 0, 0)')) return true;

          let r, g, b;

          // Handle hex colors
          if (c.startsWith('#')) {
            const hex = c.replace('#', '');
            const fullHex = hex.length === 3
              ? hex.split('').map(ch => ch + ch).join('')
              : hex;
            r = parseInt(fullHex.slice(0, 2), 16);
            g = parseInt(fullHex.slice(2, 4), 16);
            b = parseInt(fullHex.slice(4, 6), 16);
          } else {
            // Handle rgb/rgba
            const match = c.match(/\\d+/g);
            if (!match || match.length < 3) return true;
            [r, g, b] = match.map(Number);
          }

          if (r === 255 && g === 255 && b === 255) return true;
          if (r === 0 && g === 0 && b === 0) return true;
          // Gray detection: all channels similar
          if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15) return true;
          return false;
        };

        // Helper: Convert RGB to hex
        const rgbToHex = (c) => {
          if (!c) return null;
          if (c.startsWith('#')) return c;
          const match = c.match(/\\d+/g);
          if (!match || match.length < 3) return null;
          const [r, g, b] = match.map(Number);
          return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        };

        // Helper: Extract CSS custom properties from :root
        const extractCssVariables = () => {
          const vars = {};
          try {
            const rootStyles = getComputedStyle(document.documentElement);
            const colorVarNames = [
              '--primary', '--primary-color', '--accent', '--accent-color',
              '--brand', '--brand-color', '--theme-color', '--main-color',
              '--color-primary', '--color-accent', '--wp--preset--color--primary',
              '--global-palette1', '--global-palette2' // Kadence theme
            ];
            colorVarNames.forEach(name => {
              const val = rootStyles.getPropertyValue(name).trim();
              if (val && !isNeutral(val)) {
                vars[name] = val;
              }
            });
          } catch (e) {}
          return vars;
        };

        // Color extraction with source tracking
        const extractColors = () => {
          const results = { primary: null, secondary: null, accent: null, background: null };
          const sources = { primary: 'fallback', secondary: 'fallback', accent: 'fallback', background: 'element' };

          // 1. FIRST: Try CSS custom properties (highest confidence for modern sites)
          const cssVars = extractCssVariables();
          const cssVarKeys = Object.keys(cssVars);
          if (cssVarKeys.length > 0) {
            // Prioritize --primary, --accent, etc.
            const primaryVar = cssVarKeys.find(k => k.includes('primary') || k.includes('brand'));
            const accentVar = cssVarKeys.find(k => k.includes('accent'));
            if (primaryVar) {
              results.primary = cssVars[primaryVar];
              sources.primary = 'css_variable';
            }
            if (accentVar && accentVar !== primaryVar) {
              results.accent = cssVars[accentVar];
              sources.accent = 'css_variable';
            }
          }

          // 2. Try button colors (expanded selectors for WordPress/Elementor)
          if (!results.primary) {
            const btnSelectors = [
              // Standard WordPress
              '.wp-block-button__link', '.wp-element-button',
              // Elementor
              '.elementor-button', '[class*="elementor-button"]', '.e-button',
              // Kadence
              '.kb-button', '.kb-btn', '[class*="kb-button"]',
              // Generic
              'button[class*="primary"]', '.btn-primary', 'a.button',
              'a[class*="btn"]', 'a[class*="button"]', 'button:not([class*="close"])',
              // CTA sections
              '.cta a', '.hero a[href]', '[class*="cta"] a'
            ];

            for (const sel of btnSelectors) {
              try {
                const btn = document.querySelector(sel);
                if (btn) {
                  const style = window.getComputedStyle(btn);
                  const bg = style.backgroundColor;
                  if (bg && !isNeutral(bg)) {
                    results.primary = bg;
                    sources.primary = 'button';
                    break;
                  }
                }
              } catch (e) {}
            }
          }

          // 3. Try link colors (often the brand color)
          if (!results.primary) {
            const links = document.querySelectorAll('a[href]:not([class*="logo"]):not([class*="nav"])');
            for (const link of Array.from(links).slice(0, 20)) {
              const style = window.getComputedStyle(link);
              const color = style.color;
              if (color && !isNeutral(color)) {
                results.primary = color;
                sources.primary = 'link_color';
                break;
              }
            }
          }

          // 4. Heading color for secondary
          const h1 = document.querySelector('h1, h2');
          if (h1) {
            const color = window.getComputedStyle(h1).color;
            results.secondary = color || '#18181b';
            sources.secondary = isNeutral(color) ? 'heading_neutral' : 'heading';
          }

          // 5. Background from body
          results.background = window.getComputedStyle(document.body).backgroundColor || '#ffffff';

          // 6. Fallback: frequency analysis for primary (with improved element selection)
          if (!results.primary) {
            const colors = {};
            const elements = document.querySelectorAll(
              'a, button, [class*="btn"], [class*="button"], nav a, header a, ' +
              '.elementor-widget, [class*="cta"], [class*="primary"], [class*="accent"]'
            );
            elements.forEach(el => {
              const style = window.getComputedStyle(el);
              // Check both background AND text color
              const bg = style.backgroundColor;
              const color = style.color;
              if (!isNeutral(bg)) {
                colors[bg] = (colors[bg] || 0) + 2; // Higher weight for backgrounds
              }
              if (!isNeutral(color)) {
                colors[color] = (colors[color] || 0) + 1;
              }
            });
            const sorted = Object.entries(colors).sort((a, b) => b[1] - a[1]);
            if (sorted.length > 0) {
              results.primary = sorted[0][0];
              sources.primary = 'frequency';
            }
          }

          // 7. Final fallback: vibrant orange (better than black!)
          if (!results.primary || isNeutral(results.primary)) {
            results.primary = 'rgb(234, 88, 12)';
            sources.primary = 'fallback';
          }

          // 8. Accent defaults to primary if not already set
          if (!results.accent) {
            results.accent = results.primary;
            sources.accent = sources.primary;
          }

          // Convert all to hex for consistency
          Object.keys(results).forEach(key => {
            if (results[key]) {
              const hex = rgbToHex(results[key]);
              if (hex) results[key] = hex;
            }
          });

          return { colors: results, sources };
        };

        // Typography extraction
        const extractTypography = () => {
          const h1 = document.querySelector('h1, h2');
          const body = document.body;

          return {
            fonts: {
              heading: h1 ? window.getComputedStyle(h1).fontFamily : 'system-ui, sans-serif',
              body: window.getComputedStyle(body).fontFamily || 'system-ui, sans-serif',
              baseSize: window.getComputedStyle(body).fontSize || '16px'
            },
            sources: {
              heading: h1 ? 'h1_element' : 'fallback',
              body: 'body_element'
            }
          };
        };

        // Component style extraction
        const extractComponents = () => {
          const btn = document.querySelector('button, .btn, a.button, [class*="button"]');
          const card = document.querySelector('.card, [class*="card"], article, .wp-block-group');

          return {
            button: btn ? {
              borderRadius: window.getComputedStyle(btn).borderRadius || '4px',
              source: 'button_element'
            } : { borderRadius: '8px', source: 'fallback' },
            shadow: card ? {
              style: window.getComputedStyle(card).boxShadow || 'none',
              source: 'card_element'
            } : { style: '0 4px 6px rgba(0,0,0,0.1)', source: 'fallback' }
          };
        };

        const colorData = extractColors();
        const typoData = extractTypography();
        const compData = extractComponents();

        return {
          screenshotBase64,
          colors: colorData.colors,
          colorSources: colorData.sources,
          typography: typoData.fonts,
          typographySources: typoData.sources,
          components: compData,
          url: request.url
        };
      }
    `;

    const runInput = {
      startUrls: [{ url }],
      pageFunction,
      proxyConfiguration: { useApifyProxy: true },
      maxConcurrency: 1,
      maxRequestsPerCrawl: 1,
      linkSelector: ''
    };

    const results = await runApifyActor(WEB_SCRAPER_ACTOR_ID, apiToken, runInput);

    if (!results || results.length === 0) {
      throw new Error('No results from brand analysis');
    }

    return this.buildReport(url, results[0]);
  },

  /**
   * Calculate confidence level based on extraction source
   */
  calculateConfidence(field: string, source: string): ExtractionConfidence {
    const highConfidenceSources = ['button', 'button_element', 'h1_element', 'body_element', 'heading'];
    const mediumConfidenceSources = ['frequency', 'card_element', 'element'];

    if (highConfidenceSources.includes(source)) return 'found';
    if (mediumConfidenceSources.includes(source)) return 'guessed';
    return 'defaulted';
  },

  /**
   * Build complete Brand Discovery Report from raw extraction data
   */
  buildReport(url: string, data: any): BrandDiscoveryReport {
    const makeFinding = (value: string, source: string): DesignFinding => ({
      value,
      confidence: this.calculateConfidence('', source),
      source
    });

    const findings = {
      primaryColor: makeFinding(
        data.colors?.primary || '#ea580c',
        data.colorSources?.primary || 'fallback'
      ),
      secondaryColor: makeFinding(
        data.colors?.secondary || '#18181b',
        data.colorSources?.secondary || 'fallback'
      ),
      accentColor: makeFinding(
        data.colors?.accent || data.colors?.primary || '#ea580c',
        data.colorSources?.accent || data.colorSources?.primary || 'fallback'
      ),
      backgroundColor: makeFinding(
        data.colors?.background || '#ffffff',
        'element'
      ),
      headingFont: makeFinding(
        data.typography?.heading || 'system-ui, sans-serif',
        data.typographySources?.heading || 'fallback'
      ),
      bodyFont: makeFinding(
        data.typography?.body || 'system-ui, sans-serif',
        data.typographySources?.body || 'body_element'
      ),
      borderRadius: makeFinding(
        data.components?.button?.borderRadius || '8px',
        data.components?.button?.source || 'fallback'
      ),
      shadowStyle: makeFinding(
        data.components?.shadow?.style || '0 4px 6px rgba(0,0,0,0.1)',
        data.components?.shadow?.source || 'fallback'
      )
    };

    // Calculate overall confidence score (0-100)
    const confidenceValues = Object.values(findings).map(f =>
      f.confidence === 'found' ? 100 : f.confidence === 'guessed' ? 60 : 20
    );
    const overallConfidence = Math.round(
      confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
    );

    // Derive design tokens from findings
    const derivedTokens: DesignTokens = {
      colors: {
        primary: findings.primaryColor.value,
        secondary: findings.secondaryColor.value,
        accent: findings.accentColor.value,
        background: findings.backgroundColor.value,
        surface: '#f9fafb',
        text: '#111827',
        textMuted: '#6b7280',
        border: '#e5e7eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      fonts: {
        heading: findings.headingFont.value,
        body: findings.bodyFont.value,
        mono: 'JetBrains Mono, monospace'
      },
      spacing: {
        sectionGap: 'normal',
        contentWidth: 'standard',
        paragraphSpacing: 'normal'
      },
      borderRadius: 'rounded',
      shadows: 'subtle',
      typography: {
        headingWeight: 'bold',
        bodyLineHeight: 'normal',
        headingLineHeight: 'tight'
      }
    };

    return {
      id: `discovery-${Date.now()}`,
      targetUrl: url,
      screenshotBase64: data.screenshotBase64,
      analyzedAt: new Date().toISOString(),
      findings,
      overallConfidence,
      derivedTokens
    };
  }
};
