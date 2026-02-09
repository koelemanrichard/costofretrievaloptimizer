// =============================================================================
// AiCssGenerator — CSS refinement for premium design pipeline
// =============================================================================
// Primary CSS comes from BrandDesignSystemGenerator (5-pass AI generation).
// This service handles:
// 1. Iteration refinement based on validation feedback + DesignDNA patterns
// 2. Legacy fallback when BrandDesignSystem is not available

import type { DesignDNA, BrandDesignSystem } from '../../types/designDna';
import type { CrawledCssTokens, ValidationResult, PremiumDesignConfig, BusinessContext } from './types';

export class AiCssGenerator {
  private config: PremiumDesignConfig;

  constructor(config: PremiumDesignConfig) {
    this.config = config;
  }

  /**
   * Get initial CSS from BrandDesignSystem (primary path).
   * The BrandDesignSystemGenerator already produced complete CSS via 5 AI passes.
   */
  getInitialCssFromBrandSystem(
    brandDesignSystem: BrandDesignSystem,
    googleFontsUrl?: string | null
  ): string {
    let css = brandDesignSystem.compiledCss;

    // Inject Google Fonts @import if not already present
    if (googleFontsUrl && !css.includes('@import')) {
      css = `@import url('${googleFontsUrl}');\n\n${css}`;
    }

    return css;
  }

  /**
   * Legacy: Generate initial CSS from screenshot + crawled tokens.
   * Used as fallback when BrandDesignSystemGenerator fails.
   */
  async generateInitialCssLegacy(
    targetScreenshot: string,
    crawledTokens: CrawledCssTokens,
    articleHtml: string,
    businessContext?: BusinessContext
  ): Promise<string> {
    const baseCss = this.generateLegacyBase(crawledTokens);
    const htmlPreview = articleHtml.substring(0, 3000);
    const sectionManifest = this.extractSectionManifest(articleHtml);
    const prompt = this.buildLegacyInitialPrompt(crawledTokens, htmlPreview, sectionManifest, businessContext, baseCss);
    const aiEnhancedCss = await this.callVisionAI(targetScreenshot, null, prompt);
    let css = this.sanitizeCss(aiEnhancedCss);

    if (css.length < 200) {
      console.warn('[AiCssGenerator] AI returned insufficient CSS, using legacy base');
      css = baseCss;
    }

    if (crawledTokens.googleFontsUrl) {
      css = `@import url('${crawledTokens.googleFontsUrl}');\n\n${css}`;
    }

    return css;
  }

  /**
   * Refine CSS based on validation feedback.
   * Enhanced with DesignDNA context for pattern-aware refinement.
   */
  async refineCss(
    currentCss: string,
    targetScreenshot: string,
    outputScreenshot: string,
    validationResult: ValidationResult,
    articleHtml?: string,
    crawledTokens?: CrawledCssTokens,
    designDna?: DesignDNA
  ): Promise<string> {
    const sectionManifest = articleHtml ? this.extractSectionManifest(articleHtml) : '';
    const prompt = this.buildRefinementPrompt(currentCss, validationResult, sectionManifest, designDna);
    const aiCss = await this.callVisionAI(targetScreenshot, outputScreenshot, prompt);
    let css = this.sanitizeCss(aiCss);

    // Re-inject Google Fonts @import if it was lost during refinement
    if (crawledTokens?.googleFontsUrl && !css.includes('@import')) {
      css = `@import url('${crawledTokens.googleFontsUrl}');\n\n${css}`;
    }

    return css;
  }

  // ─── Refinement Prompt (DesignDNA-aware) ──────────────────────────────────

  private buildRefinementPrompt(
    currentCss: string,
    validationResult: ValidationResult,
    sectionManifest: string,
    designDna?: DesignDNA
  ): string {
    const fixes = validationResult.cssFixInstructions
      .map((fix, i) => `${i + 1}. ${fix}`)
      .join('\n');

    // Build DesignDNA context block for pattern-aware refinement
    const dnaContext = designDna ? `
## Target Website Design DNA (extracted patterns)

The target website uses:
- Hero: ${designDna.layout?.heroStyle || 'unknown'} style${designDna.effects?.gradients?.usage === 'none' ? ' — NO gradient' : ''}
- Cards: ${designDna.shapes?.cardStyle || 'unknown'} style
- Spacing: ${designDna.spacing?.density || 'comfortable'} density
- Typography: "${designDna.typography?.headingFont?.family || 'system-ui'}" headings, "${designDna.typography?.bodyFont?.family || 'system-ui'}" body
- Gradients: ${designDna.effects?.gradients?.usage || 'subtle'} usage
- Personality: ${designDna.personality?.overall || 'corporate'}
- Border radius: ${designDna.shapes?.borderRadius?.style || 'rounded'}
- Shadows: ${designDna.effects?.shadows?.style || 'subtle'}
- Heading decoration: ${designDna.typography?.headingUnderlineStyle || 'none'}

IMPORTANT: Match these SPECIFIC patterns. If the target uses no gradients, do NOT add gradients.
If the target uses flat cards, do NOT add elevated shadows.
` : '';

    return `You are refining a CSS stylesheet to better match a target website design.

## Current Scores
- Overall: ${validationResult.overallScore}/100
- Color Match: ${validationResult.colorMatch.score} — ${validationResult.colorMatch.notes}
- Typography: ${validationResult.typographyMatch.score} — ${validationResult.typographyMatch.notes}
- Spacing: ${validationResult.spacingMatch.score} — ${validationResult.spacingMatch.notes}
- Visual Depth: ${validationResult.visualDepth.score} — ${validationResult.visualDepth.notes}
- Brand Fit: ${validationResult.brandFit.score} — ${validationResult.brandFit.notes}
- Layout Sophistication: ${validationResult.layoutSophistication.score} — ${validationResult.layoutSophistication.notes}
${dnaContext}
${sectionManifest ? `\n## Section Manifest (full article structure)\n\n${sectionManifest}\n` : ''}
## Required Fixes
${fixes}

## Current CSS (first 10000 chars)
\`\`\`css
${currentCss.substring(0, 10000)}
\`\`\`

IMAGE 1 = target website, IMAGE 2 = current output.

Apply ALL fixes. The CSS was generated to match the target's design DNA but the screenshot comparison shows specific differences. Fix ONLY those differences. Return the COMPLETE revised CSS (not a diff). Keep text readable.

Return ONLY CSS. No markdown fences. No explanations.`;
  }

  // ─── Section Manifest & Design Suggestion (used for refinement context) ───

  extractSectionManifest(html: string): string {
    const lines: string[] = [];
    const sectionRegex = /<section[^>]*data-section-id="([^"]*)"[^>]*>/gi;
    let match;

    const tocMatch = html.match(/data-toc-count="(\d+)"/);
    const tocCount = tocMatch ? parseInt(tocMatch[1]) : 0;
    if (tocCount > 0) {
      lines.push(`TOC: ${tocCount} sections${html.includes('data-toc-compact') ? ' (compact 2-col)' : ''}`);
    }

    // Also check for .ctc-* class-based sections (from PremiumHtmlRenderer)
    const ctcSectionRegex = /class="ctc-section[^"]*"/gi;
    const ctcMatches = html.match(ctcSectionRegex);
    if (ctcMatches && ctcMatches.length > 0) {
      lines.push(`Component sections: ${ctcMatches.length} (ctc-* class based)`);
    }

    while ((match = sectionRegex.exec(html)) !== null) {
      const tag = match[0];
      const indexMatch = tag.match(/data-section-index="(\d+)"/);
      const index = indexMatch ? indexMatch[1] : '?';

      const roleMatch = tag.match(/data-section-role="([^"]*)"/);
      const weightMatch = tag.match(/data-semantic-weight="(\d)"/);
      const emphasisMatch = tag.match(/data-emphasis="([^"]*)"/);
      const zoneMatch = tag.match(/data-content-zone="([^"]*)"/);

      const role = roleMatch ? roleMatch[1] : 'prose';
      const weight = weightMatch ? weightMatch[1] : '3';
      const emphasis = emphasisMatch ? emphasisMatch[1] : 'standard';
      const zone = zoneMatch ? zoneMatch[1] : 'MAIN';

      const sectionStart = match.index;
      const sectionEnd = html.indexOf('</section>', sectionStart);
      const sectionContent = sectionEnd > sectionStart ? html.substring(sectionStart, sectionEnd) : '';
      const headingMatch = sectionContent.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      const headingText = headingMatch ? headingMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      const hooks: string[] = [];
      if (sectionContent.includes('data-feature-grid')) hooks.push('feature-grid');
      if (sectionContent.includes('data-pull-quote')) hooks.push('pull-quote');
      if (sectionContent.includes('data-step-list')) hooks.push('step-list');
      if (sectionContent.includes('data-highlight-box')) hooks.push('highlight-box');
      if (sectionContent.includes('data-comparison-table')) hooks.push('comparison-table');
      if (sectionContent.includes('data-intro-text')) hooks.push('intro-text');

      const hookStr = hooks.length > 0 ? ` {${hooks.join(', ')}}` : '';
      const zoneStr = zone !== 'MAIN' ? ` zone:${zone}` : '';

      let line = `#${index} "${headingText}" [${role}] weight:${weight}/5 emphasis:${emphasis}${zoneStr}${hookStr}`;

      const suggestion = this.getDesignSuggestion(role, emphasis);
      if (suggestion) {
        line += `\n   -> ${suggestion}`;
      }

      lines.push(line);
    }

    if (html.includes('data-content-type="cta"') || html.includes('ctc-cta-banner')) {
      lines.push('#cta [cta] weight:3/5 emphasis:featured\n   -> Full-width CTA banner with prominent button');
    }

    return lines.length > 0 ? lines.join('\n') : 'No sections detected';
  }

  /** Generate a design suggestion based on section role and emphasis level */
  getDesignSuggestion(role: string, emphasis: string): string {
    const prefix = emphasis === 'hero' || emphasis === 'featured' ? `${emphasis.toUpperCase()}: ` : '';

    switch (role) {
      case 'introduction':
        return `${prefix}Lead paragraph with larger text, subtle background`;
      case 'definition':
        return `${prefix}Standout card with accent border, clear heading`;
      case 'explanation':
        return `${prefix}Clean prose section with readable typography`;
      case 'list':
        return `${prefix}Card grid layout for visual interest`;
      case 'steps':
        return `${prefix}Numbered step cards or timeline layout`;
      case 'comparison':
        return `${prefix}Styled table with branded headers`;
      case 'faq':
        return emphasis === 'supporting' || emphasis === 'minimal'
          ? 'SUPPORTING: Compact accordion cards'
          : `${prefix}Clean accordion cards with expand indicators`;
      case 'summary':
        return emphasis === 'supporting' || emphasis === 'minimal'
          ? 'SUPPORTING: Compact summary box'
          : `${prefix}Key takeaways card`;
      case 'testimonial':
        return `${prefix}Styled blockquote with decorative marks`;
      case 'data':
        return `${prefix}Data visualization with stat highlights`;
      default:
        return `${prefix}Visual card treatment`;
    }
  }

  // ─── AI Provider Calls ────────────────────────────────────────────────────

  private async callVisionAI(
    image1Base64: string,
    image2Base64: string | null,
    prompt: string
  ): Promise<string> {
    switch (this.config.aiProvider) {
      case 'gemini': return this.callGemini(image1Base64, image2Base64, prompt);
      case 'anthropic': return this.callClaude(image1Base64, image2Base64, prompt);
      case 'openai': return this.callOpenAI(image1Base64, image2Base64, prompt);
      default: return this.callGemini(image1Base64, image2Base64, prompt);
    }
  }

  private async callGemini(img1: string, img2: string | null, prompt: string): Promise<string> {
    const model = this.config.model || 'gemini-2.0-flash';
    const parts: any[] = [{ text: prompt }];
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: img1 } });
    if (img2) parts.push({ inlineData: { mimeType: 'image/jpeg', data: img2 } });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: 8192, temperature: 0.4 },
        }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callClaude(img1: string, img2: string | null, prompt: string): Promise<string> {
    const model = this.config.model || 'claude-sonnet-4-20250514';
    const content: any[] = [
      { type: 'text', text: prompt },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img1 } },
    ];
    if (img2) {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img2 } });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2024-01-01',
      },
      body: JSON.stringify({ model, max_tokens: 8192, messages: [{ role: 'user', content }] }),
    });
    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  private async callOpenAI(img1: string, img2: string | null, prompt: string): Promise<string> {
    const model = this.config.model || 'gpt-4o';
    const content: any[] = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img1}` } },
    ];
    if (img2) {
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img2}` } });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ model, max_tokens: 8192, messages: [{ role: 'user', content }] }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  sanitizeCss(raw: string): string {
    let css = raw.trim();
    css = css.replace(/^```(?:css)?\s*/i, '').replace(/\s*```\s*$/i, '');

    const importIndex = css.indexOf('@import');
    const rootIndex = css.indexOf(':root');
    const articleIndex = css.indexOf('article');
    const bodyIndex = css.indexOf('body');
    const starIndex = css.indexOf('*');
    const firstSelector = Math.min(
      importIndex >= 0 ? importIndex : Infinity,
      rootIndex >= 0 ? rootIndex : Infinity,
      articleIndex >= 0 ? articleIndex : Infinity,
      bodyIndex >= 0 ? bodyIndex : Infinity,
      starIndex >= 0 ? starIndex : Infinity
    );
    if (firstSelector !== Infinity && firstSelector > 0) {
      css = css.substring(firstSelector);
    }

    return css;
  }

  // ─── Legacy Base CSS (fallback) ───────────────────────────────────────────

  private generateLegacyBase(tokens: CrawledCssTokens): string {
    const primary = tokens.colors.find(c => c.usage === 'primary')?.hex || '#1a1a2e';
    const secondary = tokens.colors.find(c => c.usage === 'secondary')?.hex || '#16213e';
    const accent = tokens.colors.find(c => c.usage === 'accent')?.hex || primary;
    const bg = tokens.colors.find(c => c.usage === 'background')?.hex || '#ffffff';
    const text = tokens.colors.find(c => c.usage === 'text')?.hex || '#1a1a1a';
    const textMuted = tokens.colors.find(c => c.usage === 'text-muted')?.hex || '#6b7280';
    const surface = tokens.colors.find(c => c.usage === 'surface')?.hex || '#f9fafb';
    const border = tokens.colors.find(c => c.usage === 'border')?.hex || '#e5e7eb';
    const headingFont = tokens.fonts.find(f => f.usage === 'heading')?.family || 'system-ui, sans-serif';
    const bodyFont = tokens.fonts.find(f => f.usage === 'body')?.family || 'system-ui, sans-serif';
    const radius = tokens.borderRadius[0] || '8px';
    const shadow = tokens.shadows[0] || '0 4px 6px rgba(0,0,0,0.07)';

    return `:root {
  --brand-primary: ${primary};
  --brand-secondary: ${secondary};
  --brand-accent: ${accent};
  --brand-bg: ${bg};
  --brand-text: ${text};
  --brand-text-muted: ${textMuted};
  --brand-surface: ${surface};
  --brand-border: ${border};
  --brand-radius: ${radius};
  --brand-shadow: ${shadow};
  --font-heading: ${headingFont};
  --font-body: ${bodyFont};
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-body); color: var(--brand-text); background: var(--brand-bg); line-height: 1.7; -webkit-font-smoothing: antialiased; }
img { max-width: 100%; height: auto; display: block; }
a { color: var(--brand-primary); text-decoration: underline; text-underline-offset: 2px; transition: color 0.2s; }
a:hover { color: var(--brand-secondary); }
h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--brand-text); line-height: 1.3; }
h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; }
h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }
p { margin-bottom: 1rem; }
ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
li { margin-bottom: 0.35rem; }
table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
th { background: var(--brand-surface); font-weight: 600; text-align: left; padding: 0.6rem 0.8rem; border-bottom: 2px solid var(--brand-border); }
td { padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--brand-border); }
blockquote { border-left: 4px solid var(--brand-primary); padding: 1rem 1.5rem; margin: 1rem 0; color: var(--brand-text-muted); font-style: italic; background: var(--brand-surface); }`;
  }

  private buildLegacyInitialPrompt(
    tokens: CrawledCssTokens,
    htmlPreview: string,
    sectionManifest: string,
    businessContext?: BusinessContext,
    baseCss?: string
  ): string {
    return `You are a senior web designer. Study the target website screenshot and create CSS that matches the target's visual style.

## HTML Preview
\`\`\`html
${htmlPreview}
\`\`\`

## Section Manifest
${sectionManifest}

${businessContext ? `Industry: ${businessContext.industry} | Audience: ${businessContext.audience}\n` : ''}

## Base CSS (starting point)
\`\`\`css
${baseCss}
\`\`\`

Create complete CSS matching the target screenshot's visual language. 300-500 lines. Use the CSS custom properties. Keep text readable.

Return ONLY CSS. No markdown fences. Start with \`:root {\`.`;
  }
}
