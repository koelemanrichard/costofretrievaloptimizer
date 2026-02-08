// =============================================================================
// DesignValidationService — Validates brand match between target and output
// =============================================================================
// Wraps DesignQualityValidator with premium-pipeline-specific logic:
// adds spacingMatch dimension and actionable CSS fix instructions.

import type { CrawledCssTokens, ValidationResult, PremiumDesignConfig } from './types';

/**
 * Validates design output against target website screenshot.
 * Returns scores, dimensional breakdowns, and specific CSS fix instructions.
 */
export class DesignValidationService {
  private config: PremiumDesignConfig;

  constructor(config: PremiumDesignConfig) {
    this.config = config;
  }

  /**
   * Validate the rendered output against the target screenshot.
   */
  async validate(
    targetScreenshot: string,
    outputScreenshot: string,
    crawledTokens: CrawledCssTokens,
    currentCss: string
  ): Promise<ValidationResult> {
    const prompt = this.buildValidationPrompt(crawledTokens, currentCss);

    try {
      const result = await this.callVisionAI(targetScreenshot, outputScreenshot, prompt);
      return this.parseResult(result);
    } catch (err) {
      console.error('[DesignValidationService] Vision AI call failed:', err);
      return this.getDefaultResult();
    }
  }

  /**
   * Build the validation prompt with crawled token references.
   */
  private buildValidationPrompt(tokens: CrawledCssTokens, currentCss: string): string {
    const primaryColors = tokens.colors.slice(0, 5).map(c => c.hex).join(', ');
    const fonts = tokens.fonts.map(f => f.family).join(', ');
    const cssSnippet = currentCss.substring(0, 3000);

    return `You are an expert visual design validator. Compare these two images:

IMAGE 1: The TARGET website design (brand reference)
IMAGE 2: The CURRENT article output (generated from CSS)

## Brand Reference Tokens
- Primary colors: ${primaryColors}
- Fonts: ${fonts}
- Border radius: ${tokens.borderRadius.join(', ') || 'none'}
- Shadows: ${tokens.shadows.join('; ') || 'none'}

## Current CSS (first 3000 chars)
\`\`\`css
${cssSnippet}
\`\`\`

## Validation Task

Score the output (IMAGE 2) against the target (IMAGE 1) on these 6 dimensions (0-100 each):

1. **colorMatch** — Do the brand colors match? Are primary, secondary, accent colors used correctly?
2. **typographyMatch** — Do fonts, sizes, weights, line-heights match the target?
3. **spacingMatch** — Does padding, margins, section spacing match the target's rhythm?
4. **visualDepth** — Do shadows, gradients, borders, layering match the target?
5. **brandFit** — Overall, would a brand manager accept this as "on brand"?
6. **layoutSophistication** — Score using these specific criteria:
   - Do ALL sections have card treatment (background, border-radius, padding, shadow)? If not → score below 60
   - Are there at least 2 distinct background treatments (e.g. white + surface)? If uniform → score below 55
   - Do h2 headings have decorative treatment (gradient border, underline, or accent)? If plain → subtract 10
   - Is the intro paragraph ([data-intro-text]) styled differently from body text (larger, muted)? If not → subtract 5
   - Are there 3+ distinct visual components (grids, cards, pull quotes, step indicators, highlight boxes)? Score 90+ only if yes
   - Does the page look like unstyled prose with just font changes? → score below 50

Also provide:
- **overallScore**: Weighted average (color 20%, typography 15%, spacing 15%, depth 15%, brand 15%, layout 20%)
- **cssFixInstructions**: Array of 3-8 SPECIFIC CSS fix instructions. Each must reference an exact CSS selector and property to change. Example: "Change \`article > section:first-child\` background from \`#f9fafb\` to \`#0a2540\` to match the dark hero section"
- **passesThreshold**: true if overallScore >= ${this.config.targetScore}

## Response Format (JSON only)

\`\`\`json
{
  "overallScore": 72,
  "colorMatch": { "score": 80, "notes": "Primary color correct but accent is off" },
  "typographyMatch": { "score": 65, "notes": "Font family correct, heading size too small" },
  "spacingMatch": { "score": 70, "notes": "Section gaps too tight" },
  "visualDepth": { "score": 75, "notes": "Missing box shadows on cards" },
  "brandFit": { "score": 68, "notes": "Close but header area doesn't match" },
  "layoutSophistication": { "score": 55, "notes": "No grid layouts or card components — just styled text" },
  "cssFixInstructions": [
    "Change article h1 font-size from 2rem to 2.5rem",
    "Add box-shadow: 0 2px 8px rgba(0,0,0,0.1) to section elements"
  ],
  "passesThreshold": false
}
\`\`\`

Return ONLY valid JSON. No markdown fences, no extra text.`;
  }

  /**
   * Call the AI vision API based on configured provider.
   */
  private async callVisionAI(
    img1: string,
    img2: string,
    prompt: string
  ): Promise<string> {
    switch (this.config.aiProvider) {
      case 'gemini':
        return this.callGemini(img1, img2, prompt);
      case 'anthropic':
        return this.callClaude(img1, img2, prompt);
      case 'openai':
        return this.callOpenAI(img1, img2, prompt);
      default:
        return this.callGemini(img1, img2, prompt);
    }
  }

  private async callGemini(img1: string, img2: string, prompt: string): Promise<string> {
    const model = this.config.model || 'gemini-2.0-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: img1 } },
              { inlineData: { mimeType: 'image/jpeg', data: img2 } },
            ],
          }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
        }),
      }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  }

  private async callClaude(img1: string, img2: string, prompt: string): Promise<string> {
    const model = this.config.model || 'claude-sonnet-4-20250514';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2024-01-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img1 } },
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img2 } },
          ],
        }],
      }),
    });

    const data = await response.json();
    return data.content?.[0]?.text || '{}';
  }

  private async callOpenAI(img1: string, img2: string, prompt: string): Promise<string> {
    const model = this.config.model || 'gpt-4o';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img1}` } },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img2}` } },
          ],
        }],
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '{}';
  }

  /**
   * Parse AI response into a ValidationResult.
   */
  private parseResult(raw: string): ValidationResult {
    try {
      // Strip markdown fences if present
      let text = raw.trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

      // Find JSON object
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.getDefaultResult();

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : 50,
        colorMatch: this.parseDimension(parsed.colorMatch),
        typographyMatch: this.parseDimension(parsed.typographyMatch),
        spacingMatch: this.parseDimension(parsed.spacingMatch),
        visualDepth: this.parseDimension(parsed.visualDepth),
        brandFit: this.parseDimension(parsed.brandFit),
        layoutSophistication: this.parseDimension(parsed.layoutSophistication),
        cssFixInstructions: Array.isArray(parsed.cssFixInstructions) ? parsed.cssFixInstructions : [],
        passesThreshold: !!parsed.passesThreshold,
      };
    } catch (err) {
      console.error('[DesignValidationService] Failed to parse validation result:', err);
      return this.getDefaultResult();
    }
  }

  private parseDimension(dim: any): { score: number; notes: string } {
    if (!dim || typeof dim !== 'object') return { score: 50, notes: 'Unable to validate' };
    return {
      score: typeof dim.score === 'number' ? dim.score : 50,
      notes: typeof dim.notes === 'string' ? dim.notes : 'Unable to validate',
    };
  }

  private getDefaultResult(): ValidationResult {
    return {
      overallScore: 50,
      colorMatch: { score: 50, notes: 'Unable to validate' },
      typographyMatch: { score: 50, notes: 'Unable to validate' },
      spacingMatch: { score: 50, notes: 'Unable to validate' },
      visualDepth: { score: 50, notes: 'Unable to validate' },
      brandFit: { score: 50, notes: 'Unable to validate' },
      layoutSophistication: { score: 50, notes: 'Unable to validate' },
      cssFixInstructions: [],
      passesThreshold: false,
    };
  }
}
