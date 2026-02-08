// =============================================================================
// AiCssGenerator — AI-powered CSS generation from target website screenshot
// =============================================================================

import type { CrawledCssTokens, ValidationResult, PremiumDesignConfig, BusinessContext } from './types';

export class AiCssGenerator {
  private config: PremiumDesignConfig;

  constructor(config: PremiumDesignConfig) {
    this.config = config;
  }

  async generateInitialCss(
    targetScreenshot: string,
    crawledTokens: CrawledCssTokens,
    articleHtml: string,
    businessContext?: BusinessContext
  ): Promise<string> {
    const htmlPreview = articleHtml.substring(0, 12000);
    const sectionManifest = this.extractSectionManifest(articleHtml);
    const prompt = this.buildInitialPrompt(crawledTokens, htmlPreview, sectionManifest, businessContext);
    const css = await this.callVisionAI(targetScreenshot, null, prompt);
    return this.sanitizeCss(css);
  }

  async refineCss(
    currentCss: string,
    targetScreenshot: string,
    outputScreenshot: string,
    validationResult: ValidationResult,
    articleHtml?: string
  ): Promise<string> {
    const sectionManifest = articleHtml ? this.extractSectionManifest(articleHtml) : '';
    const prompt = this.buildRefinementPrompt(currentCss, validationResult, sectionManifest);
    const css = await this.callVisionAI(targetScreenshot, outputScreenshot, prompt);
    return this.sanitizeCss(css);
  }

  private buildInitialPrompt(
    tokens: CrawledCssTokens,
    htmlPreview: string,
    sectionManifest: string,
    businessContext?: BusinessContext
  ): string {
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

    return `You are a senior web designer at a top design agency. Study the target website screenshot. Create a VISUALLY STUNNING article page that captures the brand's energy and feels like a premium page on that website. Go beyond matching — elevate the content with sophisticated visual design.

SCREENSHOT: The attached image is the target website. Observe its:
- Header/hero styling, background treatment, color intensity
- Card/section styling patterns, shadows, borders
- Button and link styling
- Whitespace rhythm and spacing patterns
- Visual components (grids, cards, pull quotes, step indicators)

## Extracted Brand Tokens

:root {
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

## HTML to style (truncated)

\`\`\`html
${htmlPreview}
\`\`\`

## Section Manifest (full article structure)

${sectionManifest}

Sections marked (prose-only) have NO special content patterns — they MUST receive visual card treatment, decorative headings, and styled intro paragraphs to avoid looking like unstyled prose.
${businessContext ? `\nIndustry: ${businessContext.industry} | Audience: ${businessContext.audience}` : ''}

## Design Requirements — Agency Quality

Write a COMPLETE CSS stylesheet (400-700 lines, quality over quantity). The result must look like a premium page designed by a top agency — with bold visual components, not just styled paragraphs.

### Mandatory CSS Seed Patterns — Customize these to match the brand

You MUST include variations of ALL these patterns in your output, adapted to the brand colors and style:

\`\`\`css
/* Section card treatment — every section gets this */
section[data-section-id] { background: var(--brand-bg); border-radius: var(--brand-radius); padding: 2.5rem 2rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: box-shadow 0.2s; }
section[data-section-id]:hover { box-shadow: var(--brand-shadow); }

/* Surface variant — visually distinct from default */
[data-variant="surface"] { background: var(--brand-surface); border: 1px solid var(--brand-border); }

/* Prose-only sections — gradient left border accent */
[data-prose-section] { border-left: 4px solid transparent; border-image: linear-gradient(180deg, var(--brand-primary), var(--brand-accent, var(--brand-secondary))) 1; }

/* Intro text — first paragraph after h2, larger muted text */
[data-intro-text] { font-size: 1.15rem; color: var(--brand-text-muted); line-height: 1.7; margin-bottom: 1.5rem; }

/* h2 decorative bottom gradient border */
h2 { padding-bottom: 0.75rem; border-bottom: 3px solid transparent; border-image: linear-gradient(90deg, var(--brand-primary), transparent) 1; margin-bottom: 1.5rem; }

/* Content body flex column with gap */
[data-content-body] { display: flex; flex-direction: column; gap: 1.5rem; max-width: 780px; margin: 0 auto; padding: 2rem; }
\`\`\`

### Mandatory Design Patterns

1. **Page layout**: Full-width body. Content sections max-width 780px centered. Hero and CTA sections can break out to full width.

2. **Hero section** (\`[data-hero]\`): Bold, eye-catching. Use brand primary as gradient background (45deg from primary to secondary). White/light text. Large h1 (2.5-3.5rem). If \`[data-hero-subtitle]\` present, style as lighter/smaller text. Minimum 200px height with vertical centering via flexbox.

3. **Feature grids** (\`[data-feature-grid]\`): CSS Grid \`grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))\`. Remove list-style, add gap. Each \`li\` gets card treatment: surface background, brand-radius, padding 1.5rem, subtle shadow on hover, transition.

4. **Pull quotes** (\`[data-pull-quote]\`): Large italic text (1.3-1.5rem), centered, brand-primary top+bottom borders (3px), generous vertical margin, no left-border (that's for regular blockquotes).

5. **Step lists** (\`[data-step-list]\`): Counter-based numbered circles in brand-primary. Each \`li\` gets left-padding for the circle, connecting vertical line between items. Numbers in white on brand-primary circles.

6. **Highlight boxes** (\`[data-highlight-box]\`): Left border 4px brand-accent, surface background, padding 1.5rem, border-radius. Optional decorative icon-hint via ::before.

7. **Comparison tables** (\`[data-comparison-table] table\`): Modern striped design, brand-primary header row with white text, rounded container with overflow hidden, hover effect on rows.

8. **Section rhythm**: Alternate sections between white and surface backgrounds. Every \`[data-variant="surface"]\` section should feel distinctly different — not just a shade lighter.

9. **Typography hierarchy**: h2 gets decorative treatment (left border + brand primary, OR bottom gradient underline). h3 has medium weight, h4 has brand-primary color. Use heading font for headings, body font for text.

10. **CTA section** (\`[data-content-type="cta"]\`): Full-width brand gradient background, large centered text, prominent button with white bg on brand color (or inverted), rounded-full or rounded-lg button, hover scale effect.

11. **FAQ sections** (\`[data-content-type="faq"]\`): Details/summary as clean cards with separator borders, brand-colored expand indicators, smooth transitions.

12. **Links**: Brand primary, subtle underline offset. Hover: slightly darker, underline.

13. **Tables**: Brand-primary header, horizontal borders only, alternating subtle row colors.

14. **Responsive**: At 768px: 2-col grids become 1-col. Reduce hero padding. At 480px: further reduce font sizes and padding.

15. **Print**: Clean black-on-white, show URLs after links, hide gradients/shadows.

### Critical Rules

- Use the exact brand token values from :root variables above
- Target semantic elements and \`[data-*]\` attribute selectors — no class names
- Body/main text must always have high contrast (dark text on light bg or vice versa)
- Never make text unreadable — only use brand colors as backgrounds where text is white/contrasting

## Output

Return ONLY CSS. No markdown fences. No explanations. Start with \`:root {\`.`;
  }

  private buildRefinementPrompt(
    currentCss: string,
    validationResult: ValidationResult,
    sectionManifest: string
  ): string {
    const fixes = validationResult.cssFixInstructions
      .map((fix, i) => `${i + 1}. ${fix}`)
      .join('\n');

    return `You are refining a CSS stylesheet to better match a target website design.

## Current Scores
- Overall: ${validationResult.overallScore}/100
- Color Match: ${validationResult.colorMatch.score} — ${validationResult.colorMatch.notes}
- Typography: ${validationResult.typographyMatch.score} — ${validationResult.typographyMatch.notes}
- Spacing: ${validationResult.spacingMatch.score} — ${validationResult.spacingMatch.notes}
- Visual Depth: ${validationResult.visualDepth.score} — ${validationResult.visualDepth.notes}
- Brand Fit: ${validationResult.brandFit.score} — ${validationResult.brandFit.notes}
- Layout Sophistication: ${validationResult.layoutSophistication.score} — ${validationResult.layoutSophistication.notes}
${sectionManifest ? `\n## Section Manifest (full article structure)\n\n${sectionManifest}\n` : ''}
## Available data-* Selectors in the HTML

- \`[data-hero]\`, \`[data-hero-content]\`, \`[data-hero-subtitle]\` — Hero header
- \`[data-content-body]\` — Main content wrapper
- \`[data-section-id]\` — Every section
- \`[data-section-index="N"]\` — Section by index (0-based)
- \`[data-section-count="N"]\` — Total section count
- \`[data-content-type="prose|faq|steps|comparison|timeline|checklist|cta"]\`
- \`[data-variant="surface"]\` — Alternating surface sections
- \`[data-prose-section]\` — Prose-only sections (no enrichment hooks)
- \`[data-intro-text]\` — First paragraph after each h2
- \`[data-section-inner]\` — Inner wrapper in each section
- \`[data-feature-grid]\` — Short list as card grid
- \`[data-pull-quote]\` — Short blockquote
- \`[data-step-list]\` — Ordered list with step styling
- \`[data-highlight-box]\` — Important/tip callout
- \`[data-comparison-table]\` — Comparison table wrapper
- \`[data-cta-button]\` — CTA link button
- \`[data-article-footer]\`, \`[data-footer-text]\` — Footer

## Required Fixes
${fixes}

IMPORTANT: If Layout Sophistication is below 75, you MUST add visual components:
- Every section must have card treatment (background, radius, shadow)
- \`[data-prose-section]\` must get a decorative left border accent
- \`[data-intro-text]\` must be styled larger/muted (1.15rem)
- h2 must have decorative bottom gradient border
- Create visual variety between sections — avoid uniform styling

## Current CSS
\`\`\`css
${currentCss.substring(0, 10000)}
\`\`\`

IMAGE 1 = target website, IMAGE 2 = current output.

Apply ALL fixes. Return the COMPLETE revised CSS (not a diff). Enhance visual sophistication — the page should impress a design agency creative director. Keep text readable (dark on light or light on dark, never colored bg on body text).

Return ONLY CSS. No markdown fences. No explanations.`;
  }

  private extractSectionManifest(html: string): string {
    const lines: string[] = [];
    const sectionRegex = /<section[^>]*data-section-id="([^"]*)"[^>]*data-content-type="([^"]*)"[^>]*>/gi;
    let match;
    while ((match = sectionRegex.exec(html)) !== null) {
      const tag = match[0];
      const contentType = match[2];
      const indexMatch = tag.match(/data-section-index="(\d+)"/);
      const index = indexMatch ? indexMatch[1] : '?';

      const flags: string[] = [];
      if (tag.includes('data-variant="surface"')) flags.push('surface');
      if (tag.includes('data-prose-section')) flags.push('prose-only');

      // Find enrichment hooks in this section's content (up to next </section>)
      const sectionStart = match.index;
      const sectionEnd = html.indexOf('</section>', sectionStart);
      const sectionContent = sectionEnd > sectionStart ? html.substring(sectionStart, sectionEnd) : '';
      const hooks: string[] = [];
      if (sectionContent.includes('data-feature-grid')) hooks.push('feature-grid');
      if (sectionContent.includes('data-pull-quote')) hooks.push('pull-quote');
      if (sectionContent.includes('data-step-list')) hooks.push('step-list');
      if (sectionContent.includes('data-highlight-box')) hooks.push('highlight-box');
      if (sectionContent.includes('data-comparison-table')) hooks.push('comparison-table');
      if (sectionContent.includes('data-intro-text')) hooks.push('intro-text');

      const flagStr = flags.length > 0 ? ` (${flags.join(', ')})` : '';
      const hookStr = hooks.length > 0 ? ` {${hooks.join(', ')}}` : '';
      lines.push(`#${index} [${contentType}]${flagStr}${hookStr}`);
    }

    // Check for CTA section
    if (html.includes('data-content-type="cta"')) {
      lines.push('#cta [cta]');
    }

    return lines.length > 0 ? lines.join('\n') : 'No sections detected';
  }

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

  private sanitizeCss(raw: string): string {
    let css = raw.trim();
    css = css.replace(/^```(?:css)?\s*/i, '').replace(/\s*```\s*$/i, '');

    const rootIndex = css.indexOf(':root');
    const articleIndex = css.indexOf('article');
    const bodyIndex = css.indexOf('body');
    const starIndex = css.indexOf('*');
    const firstSelector = Math.min(
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
}
