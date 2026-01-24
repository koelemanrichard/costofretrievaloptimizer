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
          const match = c.match(/\\d+/g);
          if (!match) return true;
          const [r, g, b] = match.map(Number);
          if (r === 255 && g === 255 && b === 255) return true;
          if (r === 0 && g === 0 && b === 0) return true;
          if (Math.abs(r-g) < 15 && Math.abs(g-b) < 15) return true;
          return false;
        };

        // Color extraction with source tracking
        const extractColors = () => {
          const results = { primary: null, secondary: null, accent: null, background: null };
          const sources = { primary: 'fallback', secondary: 'fallback', accent: 'fallback', background: 'element' };

          // Try primary button first (highest confidence)
          const btnSelectors = [
            'button[class*="primary"]', '.btn-primary',
            '.wp-block-button__link', 'button', 'a.button',
            'a[class*="btn"]', 'a[class*="button"]'
          ];

          for (const sel of btnSelectors) {
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
          }

          // Heading color for secondary
          const h1 = document.querySelector('h1, h2');
          if (h1) {
            const color = window.getComputedStyle(h1).color;
            if (!isNeutral(color)) {
              results.secondary = color;
              sources.secondary = 'heading';
            }
          }

          // Background from body
          results.background = window.getComputedStyle(document.body).backgroundColor || '#ffffff';

          // Fallback: frequency analysis for primary
          if (!results.primary) {
            const colors = {};
            document.querySelectorAll('a, button, [class*="btn"], nav, header').forEach(el => {
              const bg = window.getComputedStyle(el).backgroundColor;
              if (!isNeutral(bg)) {
                colors[bg] = (colors[bg] || 0) + 1;
              }
            });
            const sorted = Object.entries(colors).sort((a, b) => b[1] - a[1]);
            if (sorted.length > 0) {
              results.primary = sorted[0][0];
              sources.primary = 'frequency';
            }
          }

          // Final fallback: vibrant orange
          if (!results.primary) {
            results.primary = 'rgb(234, 88, 12)';
            sources.primary = 'fallback';
          }

          // Accent defaults to primary
          results.accent = results.primary;
          sources.accent = sources.primary;

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
