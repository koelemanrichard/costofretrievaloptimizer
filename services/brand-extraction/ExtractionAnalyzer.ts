import type {
  ExtractionAnalysisResult,
  ExtractedComponent,
  ExtractedTokens,
  ContentSlot
} from '../../types/brandExtraction';

interface AnalyzerConfig {
  provider: 'gemini' | 'anthropic';
  apiKey: string;
}

interface AnalyzeInput {
  screenshotBase64: string;
  rawHtml: string;
}

interface AIExtractionResponse {
  components: Array<{
    visualDescription: string;
    componentType?: string;
    selectorHint: string;
    classNames: string[];
    contentSlots: ContentSlot[];
    boundingBox?: { x: number; y: number; width: number; height: number };
  }>;
  tokens: {
    colors: Array<{ hex: string; usage: string; frequency: number }>;
    typography: {
      headings: { fontFamily: string; fontWeight: number; letterSpacing?: string };
      body: { fontFamily: string; fontWeight: number; lineHeight: number };
    };
    spacing: { sectionGap: string; cardPadding: string; contentWidth: string };
    shadows: { card: string; elevated: string; button?: string };
    borders: { radiusSmall: string; radiusMedium: string; radiusLarge: string; defaultColor: string };
    gradients?: { hero?: string; cta?: string; accent?: string };
  };
  pageLayout: {
    sections: Array<{ order: number; componentRef: number; role: string }>;
    gridSystem: string;
  };
}

/**
 * AI-powered extraction analyzer for brand components
 *
 * Uses vision AI to analyze a website screenshot alongside its HTML
 * to extract LITERAL component code - not abstractions.
 *
 * The key principle: we extract the actual HTML and CSS as-is,
 * identifying content slots where new content can be injected.
 */
export class ExtractionAnalyzer {
  private config: AnalyzerConfig;

  constructor(config: AnalyzerConfig) {
    this.config = config;
  }

  /**
   * Analyze a page screenshot and HTML to extract components with literal code
   *
   * @param input - Screenshot (base64) and raw HTML of the page
   * @returns Extracted components with literal HTML/CSS, tokens, and layout info
   */
  async analyze(input: AnalyzeInput): Promise<ExtractionAnalysisResult> {
    const { screenshotBase64, rawHtml } = input;

    // Build the AI prompt that emphasizes literal extraction
    const prompt = this.buildExtractionPrompt(rawHtml);

    // Call vision AI with screenshot + prompt
    const aiResponse = await this.callVisionAI(screenshotBase64, prompt);

    // Extract literal HTML and CSS for each component identified by AI
    const components = this.extractLiteralCode(aiResponse.components, rawHtml);

    // Build tokens from AI analysis
    const tokens = this.buildTokens(aiResponse.tokens);

    return {
      components,
      tokens,
      pageLayout: aiResponse.pageLayout
    };
  }

  /**
   * Build the extraction prompt that guides AI to identify components
   * and their content slots WITHOUT any abstraction fields
   */
  private buildExtractionPrompt(rawHtml: string): string {
    return `You are a web component extraction specialist. Analyze this website screenshot alongside its HTML to identify reusable components.

## HTML SOURCE (for reference):
\`\`\`html
${rawHtml.substring(0, 50000)}
\`\`\`

## YOUR TASK:
Look at the screenshot and identify the major visual components (hero sections, cards, CTAs, navigation, footers, etc.)

For each component, provide:
1. visualDescription: What it looks like (e.g., "Hero section with large heading and CTA button")
2. componentType: Optional category (hero, card, cta, nav, footer, etc.)
3. selectorHint: CSS selector or class that targets this element in the HTML
4. classNames: Array of class names used by this component
5. contentSlots: Where content can be injected (headings, paragraphs, images, links)
6. boundingBox: Approximate position {x, y, width, height} as percentages

## CRITICAL RULES:
- DO NOT include "variant", "style", or "theme" fields
- DO NOT abstract the design into categories
- Focus on IDENTIFYING components, not describing their style variations
- Content slots should specify: name, selector, type (text/html/image/list/link), required boolean

## Also extract design tokens:
- colors: Array of {hex, usage, frequency} for colors you see
- typography: headings and body font info
- spacing: section gaps, card padding, content width
- shadows: card and elevated shadow values
- borders: radius values and default border color
- gradients: any gradient values used

## Return JSON:
{
  "components": [
    {
      "visualDescription": "...",
      "componentType": "...",
      "selectorHint": ".hero-section or section:first-of-type",
      "classNames": ["hero", "hero-section"],
      "contentSlots": [
        { "name": "heading", "selector": "h1", "type": "text", "required": true },
        { "name": "subheading", "selector": "p.lead", "type": "text", "required": false }
      ],
      "boundingBox": { "x": 0, "y": 0, "width": 100, "height": 50 }
    }
  ],
  "tokens": {
    "colors": [{ "hex": "#3b82f6", "usage": "primary/buttons", "frequency": 5 }],
    "typography": {
      "headings": { "fontFamily": "Inter", "fontWeight": 700 },
      "body": { "fontFamily": "Inter", "fontWeight": 400, "lineHeight": 1.6 }
    },
    "spacing": { "sectionGap": "4rem", "cardPadding": "1.5rem", "contentWidth": "1200px" },
    "shadows": { "card": "0 1px 3px rgba(0,0,0,0.1)", "elevated": "0 4px 6px rgba(0,0,0,0.1)" },
    "borders": { "radiusSmall": "4px", "radiusMedium": "8px", "radiusLarge": "16px", "defaultColor": "#e5e7eb" }
  },
  "pageLayout": {
    "sections": [{ "order": 0, "componentRef": 0, "role": "hero" }],
    "gridSystem": "12-column or flex"
  }
}`;
  }

  /**
   * Call the vision AI API with screenshot and prompt
   */
  private async callVisionAI(
    screenshotBase64: string,
    prompt: string
  ): Promise<AIExtractionResponse> {
    // Strip data URL prefix if present
    const imageData = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');

    if (this.config.provider === 'gemini') {
      return this.callGeminiVision(imageData, prompt);
    } else {
      return this.callClaudeVision(imageData, prompt);
    }
  }

  /**
   * Call Gemini Vision API
   */
  private async callGeminiVision(
    imageBase64: string,
    prompt: string
  ): Promise<AIExtractionResponse> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/png', data: imageBase64 } }
              ]
            }]
          })
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      // Parse JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          // Validate the response has required fields
          return this.validateAndNormalizeResponse(parsed);
        } catch {
          return this.getDefaultResponse();
        }
      }
      return this.getDefaultResponse();
    } catch {
      // Network error or other failure
      return this.getDefaultResponse();
    }
  }

  /**
   * Call Claude Vision API
   */
  private async callClaudeVision(
    imageBase64: string,
    prompt: string
  ): Promise<AIExtractionResponse> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2024-01-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: imageBase64
                }
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          // Validate the response has required fields
          return this.validateAndNormalizeResponse(parsed);
        } catch {
          return this.getDefaultResponse();
        }
      }
      return this.getDefaultResponse();
    } catch {
      // Network error or other failure
      return this.getDefaultResponse();
    }
  }

  /**
   * Validate and normalize the AI response to ensure required fields exist
   */
  private validateAndNormalizeResponse(parsed: any): AIExtractionResponse {
    const defaultResponse = this.getDefaultResponse();

    // Ensure components array exists and has valid items
    const components = Array.isArray(parsed.components) && parsed.components.length > 0
      ? parsed.components.map((comp: any) => ({
          visualDescription: comp.visualDescription || 'Extracted component',
          componentType: comp.componentType,
          selectorHint: comp.selectorHint || 'body > *',
          classNames: Array.isArray(comp.classNames) ? comp.classNames : [],
          contentSlots: Array.isArray(comp.contentSlots) ? comp.contentSlots : [
            { name: 'content', selector: '*', type: 'html' as const, required: true }
          ],
          boundingBox: comp.boundingBox
        }))
      : defaultResponse.components;

    // Ensure tokens object has required fields
    const tokens = parsed.tokens && typeof parsed.tokens === 'object'
      ? {
          colors: Array.isArray(parsed.tokens.colors) ? parsed.tokens.colors : defaultResponse.tokens.colors,
          typography: parsed.tokens.typography || defaultResponse.tokens.typography,
          spacing: parsed.tokens.spacing || defaultResponse.tokens.spacing,
          shadows: parsed.tokens.shadows || defaultResponse.tokens.shadows,
          borders: parsed.tokens.borders || defaultResponse.tokens.borders,
          gradients: parsed.tokens.gradients
        }
      : defaultResponse.tokens;

    // Ensure pageLayout exists
    const pageLayout = parsed.pageLayout && typeof parsed.pageLayout === 'object'
      ? {
          sections: Array.isArray(parsed.pageLayout.sections) ? parsed.pageLayout.sections : defaultResponse.pageLayout.sections,
          gridSystem: parsed.pageLayout.gridSystem || defaultResponse.pageLayout.gridSystem
        }
      : defaultResponse.pageLayout;

    return { components, tokens, pageLayout };
  }

  /**
   * Get default response when AI call fails
   *
   * Used as fallback when the API is unavailable or returns invalid data.
   */
  private getDefaultResponse(): AIExtractionResponse {
    return {
      components: [{
        visualDescription: 'Default component extracted from page',
        selectorHint: 'body',
        classNames: ['__extract_all__'], // Special marker to extract all CSS
        contentSlots: [
          { name: 'content', selector: '*', type: 'html', required: true }
        ]
      }],
      tokens: {
        colors: [{ hex: '#3b82f6', usage: 'primary', frequency: 1 }],
        typography: {
          headings: { fontFamily: 'system-ui', fontWeight: 700 },
          body: { fontFamily: 'system-ui', fontWeight: 400, lineHeight: 1.6 }
        },
        spacing: { sectionGap: '2rem', cardPadding: '1rem', contentWidth: '1200px' },
        shadows: { card: '0 1px 3px rgba(0,0,0,0.1)', elevated: '0 4px 6px rgba(0,0,0,0.1)' },
        borders: { radiusSmall: '4px', radiusMedium: '8px', radiusLarge: '16px', defaultColor: '#e5e7eb' }
      },
      pageLayout: {
        sections: [{ order: 0, componentRef: 0, role: 'content' }],
        gridSystem: 'flex'
      }
    };
  }

  /**
   * Extract literal HTML and CSS for identified components
   *
   * Uses the AI's selector hints to find the actual HTML elements
   * and extract their styles from the page's CSS.
   */
  private extractLiteralCode(
    aiComponents: AIExtractionResponse['components'],
    rawHtml: string
  ): Array<Omit<ExtractedComponent, 'id' | 'extractionId' | 'projectId' | 'createdAt'>> {
    // Parse HTML to extract style blocks
    const styleContent = this.extractStyleContent(rawHtml);

    return aiComponents.map((comp) => {
      // Extract the literal HTML for this component using selector hint
      const literalHtml = this.extractHtmlBySelector(rawHtml, comp.selectorHint);

      // Extract CSS rules that apply to this component's classes
      const literalCss = this.extractCssForClasses(styleContent, comp.classNames);

      return {
        visualDescription: comp.visualDescription,
        componentType: comp.componentType,
        literalHtml,
        literalCss,
        theirClassNames: comp.classNames,
        contentSlots: comp.contentSlots,
        boundingBox: comp.boundingBox
      };
    });
  }

  /**
   * Extract all style content from HTML
   */
  private extractStyleContent(rawHtml: string): string {
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let styles = '';
    let match;
    while ((match = styleRegex.exec(rawHtml)) !== null) {
      styles += match[1] + '\n';
    }
    return styles;
  }

  /**
   * Extract HTML element by CSS selector hint
   *
   * Uses DOMParser for proper HTML parsing in browser environment,
   * with regex fallback for server-side/edge environments.
   */
  private extractHtmlBySelector(rawHtml: string, selectorHint: string): string {
    // First, clean the HTML to remove unwanted content
    const cleanedHtml = this.removeUnwantedContent(rawHtml);

    // Try DOMParser first (works in browser)
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanedHtml, 'text/html');

        // Clean up selector for querySelector
        let cleanSelector = selectorHint;

        // Handle common selector patterns
        if (cleanSelector.includes(' > ')) {
          // Try with and without child combinator
          const parts = cleanSelector.split(' > ');
          cleanSelector = parts[parts.length - 1]; // Use last part
        }

        // Remove pseudo-selectors that querySelector doesn't support well
        cleanSelector = cleanSelector.replace(/:nth-child\([^)]+\)/g, '');
        cleanSelector = cleanSelector.replace(/:first-of-type/g, '');
        cleanSelector = cleanSelector.replace(/:last-of-type/g, '');

        // Try to find the element
        let element = doc.querySelector(cleanSelector);

        // If not found with cleaned selector, try common component selectors
        if (!element) {
          const fallbackSelectors = [
            'article',
            'main',
            'section',
            '.content',
            '.article',
            '.post',
            '[role="main"]',
          ];

          for (const sel of fallbackSelectors) {
            element = doc.querySelector(sel);
            if (element) break;
          }
        }

        if (element) {
          // Get the outer HTML and clean it
          let html = element.outerHTML;
          html = this.cleanExtractedHtml(html);

          if (html && html.length > 50 && html.length < 10000) {
            console.log('[ExtractionAnalyzer] DOM extraction successful for:', selectorHint.substring(0, 50));
            return html;
          }
        }
      } catch (domError) {
        console.warn('[ExtractionAnalyzer] DOMParser failed:', domError);
      }
    }

    // Fallback: Regex-based extraction
    // Handle class selectors like ".hero-section" or "section.hero"
    const classMatch = selectorHint.match(/\.([a-zA-Z0-9_-]+)/);
    if (classMatch) {
      const className = classMatch[1];
      // Look for elements with this class - use non-greedy match
      const elementRegex = new RegExp(
        `<([a-z][a-z0-9]*)\\s+[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`,
        'i'
      );
      const match = rawHtml.match(elementRegex);
      if (match) {
        return match[0];
      }
    }

    // Handle 'body' selector specially - extract main content area
    if (selectorHint === 'body' || selectorHint.startsWith('body')) {
      // Try to find main content area first
      const mainMatch = rawHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      if (mainMatch) {
        return mainMatch[0];
      }
      const articleMatch = rawHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleMatch) {
        return articleMatch[0];
      }
      const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        return bodyMatch[0];
      }
      return rawHtml;
    }

    // Handle tag selectors like "section" or "header"
    const tagMatch = selectorHint.match(/^([a-z][a-z0-9]*)(?:\s|$|:|\.)/i);
    if (tagMatch) {
      const tagName = tagMatch[1];
      const tagRegex = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'i');
      const match = rawHtml.match(tagRegex);
      if (match) {
        return match[0];
      }
    }

    // CRITICAL: Instead of returning placeholder, try to extract ANY suitable content
    // This is the key fix - we should never return just a comment
    const contentSelectors = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<section[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const regex of contentSelectors) {
      const match = rawHtml.match(regex);
      if (match) {
        console.log('[ExtractionAnalyzer] Found content via fallback selector');
        return match[0];
      }
    }

    // Last resort: return empty section template for injection
    console.warn('[ExtractionAnalyzer] Could not extract HTML for:', selectorHint.substring(0, 50));
    return `<section class="brand-content" data-extraction-hint="${selectorHint.substring(0, 50).replace(/"/g, "'")}"></section>`;
  }

  /**
   * Extract CSS rules for specific class names
   */
  private extractCssForClasses(styleContent: string, classNames: string[]): string {
    if (!styleContent) {
      return '';
    }

    // Special case: extract all CSS when marker class is present
    if (classNames.includes('__extract_all__')) {
      return styleContent.trim();
    }

    if (!classNames.length) {
      return '';
    }

    const extractedRules: string[] = [];

    for (const className of classNames) {
      // Match CSS rules that include this class
      const ruleRegex = new RegExp(
        `[^{}]*\\.${className}[^{]*\\{[^}]*\\}`,
        'gi'
      );
      let match;
      while ((match = ruleRegex.exec(styleContent)) !== null) {
        extractedRules.push(match[0].trim());
      }
    }

    return extractedRules.join('\n\n');
  }

  /**
   * Remove unwanted content from HTML before extraction.
   * Filters out cookie consent, tracking scripts, ads, etc.
   */
  private removeUnwantedContent(html: string): string {
    // Remove script tags
    let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Remove style tags (we extract styles separately)
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove noscript tags
    cleaned = cleaned.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

    // Remove common cookie consent elements
    const cookieSelectors = [
      /id="[^"]*cookie[^"]*"/gi,
      /id="[^"]*consent[^"]*"/gi,
      /id="[^"]*gdpr[^"]*"/gi,
      /id="[^"]*privacy[^"]*"/gi,
      /class="[^"]*cookie[^"]*"/gi,
      /class="[^"]*consent[^"]*"/gi,
      /class="[^"]*gdpr[^"]*"/gi,
      /class="[^"]*onetrust[^"]*"/gi,
      /class="[^"]*cookieyes[^"]*"/gi,
    ];

    // Remove elements containing cookie/consent attributes
    for (const selector of cookieSelectors) {
      // This is a simplified removal - in practice we'd use DOM parsing
      cleaned = cleaned.replace(
        new RegExp(`<[^>]*${selector.source}[^>]*>[\\s\\S]*?<\\/[^>]+>`, 'gi'),
        ''
      );
    }

    // Remove common tracking/ad containers
    cleaned = cleaned.replace(/<div[^>]*id="[^"]*(?:ad|banner|tracker|analytics)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

    return cleaned;
  }

  /**
   * Clean extracted HTML to remove unwanted content that slipped through.
   */
  private cleanExtractedHtml(html: string): string {
    // Remove excessive whitespace
    let cleaned = html.replace(/\s+/g, ' ').trim();

    // Remove data-* attributes that may contain tracking info
    cleaned = cleaned.replace(/\sdata-[a-z-]+="[^"]*"/gi, '');

    // Remove onclick and other event handlers
    cleaned = cleaned.replace(/\son[a-z]+="[^"]*"/gi, '');

    // Remove tracking pixels (1x1 images)
    cleaned = cleaned.replace(/<img[^>]*(?:width|height)=["']1["'][^>]*>/gi, '');

    // Remove empty elements
    cleaned = cleaned.replace(/<([a-z][a-z0-9]*)[^>]*>\s*<\/\1>/gi, '');

    // If the extracted content contains cookie/tracking keywords heavily, return empty
    const cookieKeywords = ['cookie', 'tracking', 'gdpr', 'consent', 'privacy policy', 'storage duration'];
    let keywordCount = 0;
    for (const keyword of cookieKeywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = cleaned.match(regex);
      keywordCount += matches ? matches.length : 0;
    }

    // If more than 10 cookie-related keywords, this is probably a cookie consent dialog
    if (keywordCount > 10) {
      console.warn('[ExtractionAnalyzer] Extracted content appears to be cookie consent dialog, skipping');
      return '';
    }

    return cleaned;
  }

  /**
   * Build tokens object from AI response, omitting id/projectId/extractedAt
   */
  private buildTokens(
    aiTokens: AIExtractionResponse['tokens']
  ): Omit<ExtractedTokens, 'id' | 'projectId' | 'extractedAt'> {
    return {
      colors: {
        values: aiTokens.colors || []
      },
      typography: {
        headings: {
          fontFamily: aiTokens.typography?.headings?.fontFamily || 'system-ui',
          fontWeight: aiTokens.typography?.headings?.fontWeight || 700,
          letterSpacing: aiTokens.typography?.headings?.letterSpacing
        },
        body: {
          fontFamily: aiTokens.typography?.body?.fontFamily || 'system-ui',
          fontWeight: aiTokens.typography?.body?.fontWeight || 400,
          lineHeight: aiTokens.typography?.body?.lineHeight || 1.6
        }
      },
      spacing: {
        sectionGap: aiTokens.spacing?.sectionGap || '2rem',
        cardPadding: aiTokens.spacing?.cardPadding || '1rem',
        contentWidth: aiTokens.spacing?.contentWidth || '1200px'
      },
      shadows: {
        card: aiTokens.shadows?.card || '0 1px 3px rgba(0,0,0,0.1)',
        elevated: aiTokens.shadows?.elevated || '0 4px 6px rgba(0,0,0,0.1)',
        button: aiTokens.shadows?.button
      },
      borders: {
        radiusSmall: aiTokens.borders?.radiusSmall || '4px',
        radiusMedium: aiTokens.borders?.radiusMedium || '8px',
        radiusLarge: aiTokens.borders?.radiusLarge || '16px',
        defaultColor: aiTokens.borders?.defaultColor || '#e5e7eb'
      },
      gradients: aiTokens.gradients,
      extractedFrom: ['screenshot', 'html']
    };
  }
}
