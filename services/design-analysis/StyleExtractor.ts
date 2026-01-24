
import { RawDesignTokens } from './DesignAnalyzer';

export interface ProcessedDesignSystem {
    themeId: string;
    name: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string; // card background
        text: string;
        textMuted: string;
        border: string;
    };
    typography: {
        headingFont: string;
        bodyFont: string;
        h1Size: string;
        h2Size: string;
        baseSize: string;
    };
    borderRadius: {
        button: string;
        card: string;
    };
    cssVariables: string; // Ready-to-inject CSS variables block
}

/**
 * Service to process raw design tokens into a sanitized, ready-to-use Design System.
 */
export const StyleExtractor = {
    /**
     * Process raw tokens into a fully formed Design System object
     */
    processTokens(raw: RawDesignTokens, sourceUrl: string): ProcessedDesignSystem {

        // 1. Clean up fonts
        const cleanFont = (fontStack: string) => {
            return fontStack.replace(/"/g, "'").split(',')[0].trim(); // Take primary font
        };

        const headingFont = cleanFont(raw.typography.headingFont);
        const bodyFont = cleanFont(raw.typography.bodyFont);

        // 2. Normalize colors (ensure valid hex/rgb is skipped for now, assuming browser returns valid CSS)

        // 3. Generate CSS Variables block
        const cssVariables = `
      --c-primary: ${raw.colors.primary};
      --c-secondary: ${raw.colors.secondary};
      --c-bg: ${raw.colors.background};
      --c-text: ${raw.colors.text};
      --c-accent: ${raw.colors.accent};
      
      --f-heading: ${raw.typography.headingFont};
      --f-body: ${raw.typography.bodyFont};
      
      --r-btn: ${raw.components.button.borderRadius};
      --r-card: ${raw.components.card.borderRadius};
      
      --btn-bg: ${raw.components.button.backgroundColor};
      --btn-text: ${raw.components.button.color};
    `;

        return {
            themeId: `extracted-${Date.now()}`,
            name: `Extracted from ${new URL(sourceUrl).hostname}`,
            colors: {
                primary: raw.colors.primary,
                secondary: raw.colors.secondary,
                background: raw.colors.background,
                surface: raw.components.card.backgroundColor,
                text: raw.colors.text,
                textMuted: 'rgba(0,0,0,0.6)', // Reasonable default
                border: 'rgba(0,0,0,0.1)', // Reasonable default
            },
            typography: {
                headingFont: raw.typography.headingFont,
                bodyFont: raw.typography.bodyFont,
                h1Size: '2.5rem', // Default scaling
                h2Size: '2rem',
                baseSize: raw.typography.baseFontSize
            },
            borderRadius: {
                button: raw.components.button.borderRadius,
                card: raw.components.card.borderRadius
            },
            cssVariables: cssVariables.replace(/\s+/g, ' ').trim() // Minify slightly
        };
    }
};
