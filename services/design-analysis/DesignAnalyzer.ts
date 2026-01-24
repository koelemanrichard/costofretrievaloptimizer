
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
        
        // Wait for fonts and styles to settle
        await page.waitForLoadState('networkidle');
        
        // Helper to get computed style
        const getStyle = (selector, prop) => {
          const el = document.querySelector(selector);
          if (!el) return '';
          return window.getComputedStyle(el).getPropertyValue(prop);
        };

        // Helper to get all computed styles
        const getFullStyle = (selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const style = window.getComputedStyle(el);
          return {
            backgroundColor: style.backgroundColor,
            color: style.color,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            borderRadius: style.borderRadius,
            boxShadow: style.boxShadow,
            fontWeight: style.fontWeight
          };
        };

        // Identify primary action button (heuristic)
        // Look for buttons with specific classes or roles
        const findPrimaryButton = () => {
            const selectors = [
                'button[class*="primary"]', 
                'a[class*="button"][class*="primary"]',
                '.btn-primary',
                'button', 
                'a.button',
                'a.btn'
            ];
            
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el) return el;
            }
            return null;
        };

        // Extract Body Styles
        const bodyStyle = getFullStyle('body') || {};
        
        // Extract Heading Styles
        const h1Style = getFullStyle('h1') || {};
        const h2Style = getFullStyle('h2') || {};
        
        // Extract Link Color (often primary brand color)
        const linkColor = getStyle('a', 'color');
        
        // Extract Button Styles
        let buttonStyle = {};
        const primBtn = findPrimaryButton();
        if (primBtn) {
            const style = window.getComputedStyle(primBtn);
            buttonStyle = {
                backgroundColor: style.backgroundColor,
                color: style.color,
                borderRadius: style.borderRadius,
                fontFamily: style.fontFamily
            };
        }

        // Identify "Card" style (heuristic: look for white bg on non-white body, or shadow)
        // This is tricky, maybe skip for now or use a simple heuristic
        const cardStyle = {
            backgroundColor: '#ffffff',
            borderRadius: '0px',
            boxShadow: 'none'
        };

        return {
          colors: {
             background: bodyStyle.backgroundColor || '#ffffff',
             text: bodyStyle.color || '#000000',
             primary: (buttonStyle.backgroundColor && buttonStyle.backgroundColor !== 'transparent' && buttonStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') 
               ? buttonStyle.backgroundColor 
               : (linkColor || '#3b82f6'),
             secondary: h1Style.color || '#000000',
          },
          typography: {
             bodyFont: bodyStyle.fontFamily || 'sans-serif',
             headingFont: h1Style.fontFamily || 'sans-serif',
             baseFontSize: bodyStyle.fontSize || '16px'
          },
          components: {
             button: buttonStyle
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
