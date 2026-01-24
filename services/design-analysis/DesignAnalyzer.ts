
import { runApifyActor } from '../apifyService';

export interface RawDesignTokens {
    colors: {
        background: string;
        text: string;
        primary: string; // link color
        secondary: string; // usually h1 color or button color
        accent: string;
    };
    typography: {
        bodyFont: string;
        headingFont: string;
        baseFontSize: string;
    };
    components: {
        button: {
            backgroundColor: string;
            color: string;
            borderRadius: string;
        };
        card: {
            backgroundColor: string;
            borderRadius: string;
            boxShadow: string;
        };
    };
}

const WEB_SCRAPER_ACTOR_ID = 'apify/web-scraper';

/**
 * Service to analyze a target website's design system using browser automation.
 * Extracts computed styles for typography, colors, and core components.
 */
export const DesignAnalyzer = {
    /**
     * extracting raw computed styles from a URL
     */
    async analyzeUrl(url: string, apiToken: string): Promise<RawDesignTokens | null> {
        if (!apiToken) {
            throw new Error('Apify API token is required for design analysis');
        }

        // Define the browser-side function to extract styles
        const pageFunction = `
      async function pageFunction(context) {
        const { request, page, log } = context;
        await page.waitForLoadState('networkidle');
        
        // 1. GLOBAL COLOR SAMPLER (The "Histogram" Approach)
        // We look for colors that are actually used in the design, not just CSS variables
        const elements = Array.from(document.querySelectorAll('h1, h2, h3, button, a, span, div'))
          .slice(0, 100);
        
        const colorCounts = {};
        const bgCounts = {};
        
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const bg = style.backgroundColor;
          
          if (color && !color.includes('rgba(0, 0, 0, 0)') && color !== 'rgb(255, 255, 255)' && color !== 'rgb(0, 0, 0)') {
            colorCounts[color] = (colorCounts[color] || 0) + 1;
          }
          if (bg && !bg.includes('rgba(0, 0, 0, 0)') && bg !== 'rgb(255, 255, 255)' && bg !== 'rgb(0, 0, 0)') {
            bgCounts[bg] = (bgCounts[bg] || 0) + 1;
          }
        });

        const getMostFrequent = (counts) => {
          return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
        };

        // 2. ELEMENT SPECIFIC DETECTORS
        const findPrimaryButton = () => {
          const btnSelectors = ['button[class*="primary"]', '.wp-block-button__link', '.btn-primary', 'button', 'a.button'];
          for (const sel of btnSelectors) {
            const el = document.querySelector(sel);
            if (el) return el;
          }
          return null;
        };

        const bodyStyle = window.getComputedStyle(document.body);
        const h1 = document.querySelector('h1');
        const h1Style = h1 ? window.getComputedStyle(h1) : bodyStyle;
        const primBtn = findPrimaryButton();
        const btnStyle = primBtn ? window.getComputedStyle(primBtn) : null;

        // 3. RESOLVE BRAND COLOR (The "Orange" Fix)
        // Hierarchy: Button BG -> Most frequent BG -> H1 Color -> Link Color
        let brandColor = btnStyle?.backgroundColor;
        if (!brandColor || brandColor.includes('rgba(0, 0, 0, 0)') || brandColor === 'rgb(255, 255, 255)') {
          brandColor = getMostFrequent(bgCounts) || h1Style.color || getMostFrequent(colorCounts) || 'rgb(59, 130, 246)';
        }

        // 4. THEME DETECTION
        const rgb = bodyStyle.backgroundColor.match(/\\d+/g);
        const luma = rgb ? (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) : 255;
        const isDark = luma < 128;

        return {
          colors: {
            background: bodyStyle.backgroundColor || '#ffffff',
            text: bodyStyle.color || '#000000',
            primary: brandColor,
            secondary: h1Style.color || '#000000',
            isDark
          },
          typography: {
            bodyFont: bodyStyle.fontFamily || 'sans-serif',
            headingFont: h1Style.fontFamily || 'sans-serif',
            baseFontSize: bodyStyle.fontSize || '16px'
          },
          components: {
            button: btnStyle ? {
              backgroundColor: btnStyle.backgroundColor,
              color: btnStyle.color,
              borderRadius: btnStyle.borderRadius,
              fontFamily: btnStyle.fontFamily
            } : null
          }
        };
      }
    `;

        const runInput = {
            startUrls: [{ url }],
            pageFunction,
            proxyConfiguration: {
                useApifyProxy: true,
            },
            maxConcurrency: 1, // Single page analysis, no need for parallel
            maxRequestsPerCrawl: 1,
            linkSelector: '', // Don't crawl links
        };

        try {
            const results = await runApifyActor(WEB_SCRAPER_ACTOR_ID, apiToken, runInput);

            if (!results || results.length === 0) {
                console.warn('[DesignAnalyzer] No results returned from Apify');
                return null;
            }

            const data = results[0];

            // Map scraping result to RawDesignTokens interface
            // Note: The structure returned from pageFunction matches what we put in `return {...}` inside it.
            // But we need to ensure defaults if things are missing

            return {
                colors: {
                    background: data.colors?.background || '#ffffff',
                    text: data.colors?.text || '#000000',
                    primary: data.colors?.primary || '#3b82f6',
                    secondary: data.colors?.secondary || '#000000',
                    accent: data.colors?.primary || '#3b82f6' // Default accent to primary
                },
                typography: {
                    bodyFont: data.typography?.bodyFont || 'system-ui, sans-serif',
                    headingFont: data.typography?.headingFont || 'system-ui, sans-serif',
                    baseFontSize: data.typography?.baseFontSize || '16px'
                },
                components: {
                    button: {
                        backgroundColor: data.components?.button?.backgroundColor || '#3b82f6',
                        color: data.components?.button?.color || '#ffffff',
                        borderRadius: data.components?.button?.borderRadius || '4px'
                    },
                    card: {
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }
                }
            };

        } catch (error) {
            console.error('[DesignAnalyzer] Failed to analyze design:', error);
            throw error;
        }
    }
};
