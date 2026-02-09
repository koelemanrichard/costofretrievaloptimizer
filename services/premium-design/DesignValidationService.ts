// =============================================================================
// DesignValidationService — Validates brand match between target and output
// =============================================================================
// Wraps DesignQualityValidator with premium-pipeline-specific logic:
// adds spacingMatch dimension and actionable CSS fix instructions.

import type { DesignDNA } from '../../types/designDna';
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
   * When DesignDNA is provided, validation becomes pattern-aware —
   * comparing against specific design decisions (heroStyle, cardStyle, etc.)
   * instead of just generic "brand fit".
   */
  async validate(
    targetScreenshot: string,
    outputScreenshot: string,
    crawledTokens: CrawledCssTokens,
    currentCss: string,
    designDna?: DesignDNA
  ): Promise<ValidationResult> {
    const prompt = this.buildValidationPrompt(crawledTokens, currentCss, designDna);

    try {
      const result = await this.callVisionAI(targetScreenshot, outputScreenshot, prompt);
      return this.parseResult(result);
    } catch (err) {
      console.error('[DesignValidationService] Vision AI call failed:', err);
      return this.getDefaultResult();
    }
  }

  /**
   * Build the validation prompt with crawled token references and DesignDNA patterns.
   */
  private buildValidationPrompt(tokens: CrawledCssTokens, currentCss: string, designDna?: DesignDNA): string {
    const primaryColors = tokens.colors.slice(0, 5).map(c => c.hex).join(', ');
    const fonts = tokens.fonts.map(f => f.family).join(', ');
    const cssSnippet = currentCss.substring(0, 3000);

    // Build DesignDNA context for pattern-aware validation
    const dnaContext = designDna ? `
## Target Website Design Patterns (extracted by AI)

The target website uses these SPECIFIC design patterns:
- Hero style: ${designDna.layout?.heroStyle || 'unknown'}${designDna.effects?.gradients?.usage === 'none' ? ' — NO gradient hero' : ''}
- Card style: ${designDna.shapes?.cardStyle || 'unknown'}
- Spacing density: ${designDna.spacing?.density || 'comfortable'}
- Heading font: "${designDna.typography?.headingFont?.family || 'system-ui'}" (${designDna.typography?.headingFont?.character || 'modern'})
- Body font: "${designDna.typography?.bodyFont?.family || 'system-ui'}"
- Gradient usage: ${designDna.effects?.gradients?.usage || 'subtle'}
- Shadow style: ${designDna.effects?.shadows?.style || 'subtle'}
- Border radius: ${designDna.shapes?.borderRadius?.style || 'rounded'}
- Design personality: ${designDna.personality?.overall || 'corporate'}
- Heading decoration: ${designDna.typography?.headingUnderlineStyle || 'none'}

CRITICAL: Score the output against these SPECIFIC patterns, not just generic visual quality.
If the target uses NO gradients but the output has gradients → penalize brandFit and visualDepth.
If the target uses "contained" hero but output has a full-width gradient hero → penalize structuralMatch heavily.
` : '';

    return `You are an expert visual design validator. Compare these two images:

IMAGE 1: The TARGET website design (brand reference)
IMAGE 2: The CURRENT article output (generated from CSS)

## Brand Reference Tokens
- Primary colors: ${primaryColors}
- Fonts: ${fonts}
- Border radius: ${tokens.borderRadius.join(', ') || 'none'}
- Shadows: ${tokens.shadows.join('; ') || 'none'}
${dnaContext}
## Current CSS (first 3000 chars)
\`\`\`css
${cssSnippet}
\`\`\`

## Validation Task

Score the output (IMAGE 2) against the target (IMAGE 1) on these 6 dimensions (0-100 each):

1. **colorMatch** — Do the brand colors match? Are primary, secondary, accent colors used correctly?
2. **typographyMatch** — Do fonts, sizes, weights, line-heights match the target?
3. **spacingMatch** — Does padding, margins, section spacing match the target's rhythm?
4. **visualDepth** — Do shadows, gradients, borders, layering match the target? ${designDna ? `The target uses "${designDna.effects?.shadows?.style}" shadows and "${designDna.effects?.gradients?.usage}" gradients — match these, don't add what isn't there.` : ''}
5. **brandFit** — Overall, would a brand manager accept this as "on brand"? ${designDna ? `The target's personality is "${designDna.personality?.overall}" — does the output match this tone?` : ''}
6. **layoutSophistication** — Score using these specific criteria:
   - Are there 3+ distinct visual components (grids, cards, pull quotes, step indicators, timelines, highlight boxes)? Score 90+ only if yes
   - Is there clear visual rhythm (alternating treatments, breathing room between sections)? If yes → add 10 bonus
   - Does the page look like unstyled prose with just font changes? → score below 50
   - Are sections visually differentiated based on content type (FAQ, steps, comparison, etc.)?
   ${designDna ? `- Does the hero style match "${designDna.layout?.heroStyle}"? If not → subtract 15` : ''}
   ${designDna ? `- Do cards match "${designDna.shapes?.cardStyle}" style? If not → subtract 10` : ''}

Also provide:
- **overallScore**: Weighted average (color 20%, typography 15%, spacing 15%, depth 15%, brand 15%, layout 20%)
- **cssFixInstructions**: Array of 3-8 SPECIFIC CSS fix instructions. Each must reference an exact CSS selector and property to change.
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
  "layoutSophistication": { "score": 55, "notes": "No grid layouts or card components" },
  "cssFixInstructions": [
    "Change .ctc-hero background from gradient to solid white to match contained hero",
    "Add box-shadow: 0 2px 8px rgba(0,0,0,0.1) to .ctc-section elements"
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
