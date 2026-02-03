// e2e/visual-quality.spec.ts
/**
 * Visual Quality Validation for Style & Publish
 *
 * Unit-style tests that validate the rendered HTML output
 * contains proper visual styling, not just structural markup.
 *
 * Tests:
 * 1. Feature cards have visible backgrounds/borders (not just plain text)
 * 2. Timeline nodes have colored markers
 * 3. Step numbers have styled indicators
 * 4. Brand colors appear in rendered CSS
 * 5. Visual hierarchy exists (hero section is visually distinct)
 * 6. No section is 100% unstyled prose when a visual component was assigned
 * 7. CSS pipeline includes component styles alongside compiledCss
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = 'e2e/screenshots';

function ensureDir(d: string) {
  const r = path.resolve(d);
  if (!fs.existsSync(r)) fs.mkdirSync(r, { recursive: true });
  return r;
}

// ============================================================================
// CSS PIPELINE VALIDATION (no browser needed - pure analysis)
// ============================================================================

test.describe('CSS Pipeline Validation', () => {
  test('generateComponentStyles produces visual styles for all component types', async () => {
    // Import the function directly for unit testing
    const { generateComponentStyles } = await import(
      '../services/publishing/renderer/ComponentStyles'
    );

    const css = generateComponentStyles({
      primaryColor: '#0056b3',
      primaryDark: '#003d80',
      secondaryColor: '#6c757d',
      accentColor: '#ff6b35',
      textColor: '#212529',
      textMuted: '#6c757d',
      backgroundColor: '#ffffff',
      surfaceColor: '#f8f9fa',
      borderColor: '#dee2e6',
      headingFont: 'Inter, sans-serif',
      bodyFont: 'Inter, sans-serif',
      radiusSmall: '4px',
      radiusMedium: '8px',
      radiusLarge: '16px',
    });

    // Feature cards must have background, border, and hover styles
    expect(css).toContain('.feature-card');
    expect(css).toMatch(/\.feature-card\s*\{[^}]*background/);
    expect(css).toMatch(/\.feature-card\s*\{[^}]*border/);
    expect(css).toMatch(/\.feature-card:hover/);

    // Timeline markers must have colored backgrounds
    expect(css).toContain('.timeline-number');
    expect(css).toMatch(/\.timeline-number\s*\{[^}]*background/);

    // Step numbers must have styled indicators
    expect(css).toContain('.step-number');
    expect(css).toMatch(/\.step-number\s*\{[^}]*background/);
    expect(css).toMatch(/\.step-number\s*\{[^}]*border-radius/);

    // Step items must have padding and borders
    expect(css).toContain('.step-item');
    expect(css).toMatch(/\.step-item\s*\{[^}]*border/);

    // FAQ items must have hover states
    expect(css).toContain('.faq-item');
    expect(css).toMatch(/\.faq-item:hover/);

    // Checklist items must have visual check marks
    expect(css).toContain('.checklist-check');
    expect(css).toMatch(/\.checklist-check\s*\{[^}]*background/);

    // Brand primary color must appear in CSS values
    expect(css).toContain('#0056b3');

    // Hero emphasis must have colored backgrounds
    expect(css).toMatch(/\.emphasis-hero\s*\{[^}]*background/);

    // Section rhythm styles
    expect(css).toContain('nth-child(even)');
    expect(css).toContain('.emphasis-featured .section-container');
  });

  test('component styles include brand colors, not just defaults', async () => {
    const { generateComponentStyles } = await import(
      '../services/publishing/renderer/ComponentStyles'
    );

    const customPrimary = '#e63946';
    const customAccent = '#2a9d8f';
    const css = generateComponentStyles({
      primaryColor: customPrimary,
      accentColor: customAccent,
    });

    // Brand colors must be used in CSS, not just the defaults
    expect(css).toContain(customPrimary);
    expect(css).toContain(customAccent);

    // Default blue should NOT appear when custom colors are provided
    expect(css).not.toContain('#3b82f6');
  });

  test('step-number sizing varies by emphasis level', async () => {
    const { generateComponentStyles } = await import(
      '../services/publishing/renderer/ComponentStyles'
    );

    const css = generateComponentStyles();

    // Large step numbers for hero emphasis
    expect(css).toMatch(/\.step-large\s+\.step-number\s*\{[^}]*font-size:\s*1\.5rem/);

    // Medium step numbers for featured emphasis
    expect(css).toMatch(/\.step-medium\s+\.step-number\s*\{[^}]*font-size:\s*1\.25rem/);
  });

  test('component styles adapt to brand personality', async () => {
    const { generateComponentStyles } = await import(
      '../services/publishing/renderer/ComponentStyles'
    );

    const corporateCss = generateComponentStyles({
      primaryColor: '#1a365d',
      accentColor: '#dd6b20',
      personality: 'corporate',
    });

    const creativeCss = generateComponentStyles({
      primaryColor: '#7c3aed',
      accentColor: '#ec4899',
      personality: 'creative',
    });

    const minimalCss = generateComponentStyles({
      primaryColor: '#333333',
      accentColor: '#666666',
      personality: 'minimal',
    });

    // Corporate: sharp corners (small radii like 2px, 4px, 6px)
    expect(corporateCss).toMatch(/border-radius:\s*[0-4]px/);
    // Corporate should NOT have large radii like 20px
    expect(corporateCss).not.toMatch(/border-radius:\s*20px/);

    // Creative: rounded corners (large radii like 12px, 20px)
    expect(creativeCss).toMatch(/border-radius:\s*(12|16|20|24)px/);
    // Creative should NOT have tiny 2px radii
    expect(creativeCss).not.toMatch(/border-radius:\s*2px/);

    // Minimal: near-zero radii (0px, 2px)
    expect(minimalCss).toMatch(/border-radius:\s*0px/);

    // Personality should affect box-shadow values
    // Minimal has 'none' shadows
    expect(minimalCss).toMatch(/box-shadow:\s*none/);
    // Creative has bolder shadows
    expect(creativeCss).toMatch(/box-shadow:\s*0 4px 16px/);

    // Personality should affect transition durations
    expect(corporateCss).toMatch(/transition.*0\.2s/);
    expect(creativeCss).toMatch(/transition.*0\.4s/);
    expect(minimalCss).toMatch(/transition.*0\.15s/);
  });

  test('alert-box and info-box component styles are generated', async () => {
    const { generateComponentStyles } = await import(
      '../services/publishing/renderer/ComponentStyles'
    );
    const css = generateComponentStyles({
      primaryColor: '#0056b3',
      accentColor: '#ff6b35',
    });

    // Alert box must have warning styling
    expect(css).toContain('.alert-box');
    expect(css).toMatch(/\.alert-box\s*\{[^}]*border-left/);
    expect(css).toMatch(/\.alert-box\s*\{[^}]*background/);

    // Info box must have informational styling
    expect(css).toContain('.info-box');
    expect(css).toMatch(/\.info-box\s*\{[^}]*background/);

    // Lead paragraph
    expect(css).toContain('.lead-paragraph');
    expect(css).toMatch(/\.lead-paragraph\s*\{[^}]*border-left/);
  });

  test('compiledCss brand-specific properties override generic ComponentStyles', async () => {
    // When compiledCss exists, it should come AFTER componentCss in the output
    // so that brand-specific AI-generated values override generic visual base
    const { CleanArticleRenderer } = await import(
      '../services/publishing/renderer/CleanArticleRenderer'
    );

    const designDna = {
      colors: {
        primary: { hex: '#0056b3', usage: 'primary', confidence: 0.8 },
        primaryDark: { hex: '#003d80', usage: 'primary-dark', confidence: 0.8 },
        secondary: { hex: '#6c757d', usage: 'secondary', confidence: 0.7 },
        accent: { hex: '#ff6b35', usage: 'accent', confidence: 0.7 },
        neutrals: { lightest: '#f8f9fa', light: '#dee2e6', medium: '#6c757d', dark: '#212529', darkest: '#000000' },
      },
      typography: {
        headingFont: { family: 'Inter', fallback: 'sans-serif', weight: 700 },
        bodyFont: { family: 'Inter', fallback: 'sans-serif', weight: 400 },
      },
      shapes: { borderRadius: { small: '4px', medium: '8px', large: '16px' } },
    } as any;

    const compiledCss = '/* brand-compiled */ .feature-card { box-shadow: 0 8px 32px rgba(0,86,179,0.15); }';
    const renderer = new CleanArticleRenderer(designDna, 'TestBrand', undefined, compiledCss);
    const result = renderer.render({ title: 'Test', sections: [{ id: 's1', content: '<p>text</p>' }] });

    // componentCss generates .feature-card with generic styles
    const componentFeatureCard = result.css.indexOf('.feature-card');
    // compiledCss marker should come AFTER componentCss
    const brandOverrideMarker = result.css.indexOf('Brand-Specific Overrides');
    // The brand-compiled content should come after componentCss's .feature-card
    const brandCompiledPos = result.css.indexOf('brand-compiled');

    // All three must be present
    expect(componentFeatureCard).toBeGreaterThan(-1);
    expect(brandOverrideMarker).toBeGreaterThan(-1);
    expect(brandCompiledPos).toBeGreaterThan(-1);

    // compiledCss (brand overrides) must come AFTER componentCss (visual base)
    expect(brandOverrideMarker).toBeGreaterThan(componentFeatureCard);
    expect(brandCompiledPos).toBeGreaterThan(componentFeatureCard);
  });

  test('structural CSS does not override component visual styles', async () => {
    // This test verifies the cascade fix: generateStructuralCSS() must NOT
    // contain component-specific selectors that override ComponentStyles' visual properties.
    // The bug was: StructuralCSS re-declared .feature-card, .step-item, .faq-item etc.
    // with structural-only properties (display, gap, padding) that stripped out backgrounds,
    // borders, shadows, and colors from ComponentStyles.

    const { CleanArticleRenderer } = await import(
      '../services/publishing/renderer/CleanArticleRenderer'
    );

    const designDna = {
      colors: {
        primary: { hex: '#0056b3', usage: 'primary', confidence: 0.8 },
        neutrals: { lightest: '#f8f9fa', light: '#dee2e6', medium: '#6c757d', dark: '#212529', darkest: '#000000' },
      },
      typography: {
        headingFont: { family: 'Inter', fallback: 'sans-serif', weight: 700 },
        bodyFont: { family: 'Inter', fallback: 'sans-serif', weight: 400 },
      },
      shapes: { borderRadius: { small: '4px', medium: '8px', large: '16px' } },
    } as any;

    const renderer = new CleanArticleRenderer(
      designDna, 'TestBrand', undefined,
      '/* compiledCss */ .ctc-card { color: inherit; }'
    );
    const result = renderer.render({ title: 'Test', sections: [{ id: 's1', content: '<p>text</p>' }] });

    // Find component definitions OUTSIDE @media queries.
    // After the fix, these should have visual properties (background, border, etc.)
    // NOT be stripped down to structural-only properties by StructuralCSS.
    // Use a helper to find the main (non-media-query) definition of a selector.
    function findMainDefinition(css: string, selector: string): string | null {
      // Split by @media to isolate non-media-query CSS
      const nonMediaCss = css.replace(/@media[^{]*\{[^}]*(\{[^}]*\})*[^}]*\}/g, '');
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped + '\\s*\\{([^}]+)\\}', 'g');
      const matches = [...nonMediaCss.matchAll(regex)];
      // Return the last (winning) definition outside media queries
      return matches.length > 0 ? matches[matches.length - 1][1] : null;
    }

    // .feature-card must have visual properties
    const featureCardProps = findMainDefinition(result.css, '.feature-card');
    expect(featureCardProps).not.toBeNull();
    expect(featureCardProps!).toMatch(/background/);
    expect(featureCardProps!).toMatch(/border/);
    expect(featureCardProps!).toMatch(/transition/);

    // .step-item must have visual properties
    const stepItemProps = findMainDefinition(result.css, '.step-item');
    expect(stepItemProps).not.toBeNull();
    expect(stepItemProps!).toMatch(/background/);
    expect(stepItemProps!).toMatch(/border/);

    // .faq-item must have visual properties
    const faqItemProps = findMainDefinition(result.css, '.faq-item');
    expect(faqItemProps).not.toBeNull();
    expect(faqItemProps!).toMatch(/background/);
    expect(faqItemProps!).toMatch(/border/);

    // Verify structural CSS section does NOT contain component selectors
    const structuralMarker = 'Structural CSS - Layout primitives ONLY';
    const structuralStart = result.css.indexOf(structuralMarker);
    if (structuralStart > 0) {
      const structuralSection = result.css.substring(structuralStart);
      // Structural section should NOT redefine component-specific selectors
      expect(structuralSection).not.toMatch(/\.feature-card\s*\{/);
      expect(structuralSection).not.toMatch(/\.step-item\s*\{/);
      expect(structuralSection).not.toMatch(/\.faq-item\s*\{/);
      expect(structuralSection).not.toMatch(/\.timeline-item\s*\{/);
      expect(structuralSection).not.toMatch(/\.timeline-marker\s*\{/);
      expect(structuralSection).not.toMatch(/\.checklist-item\s*\{/);
    }
  });
});

// ============================================================================
// HTML STRUCTURE VALIDATION
// ============================================================================

test.describe('HTML Visual Structure Validation', () => {
  /**
   * Helper: Render test content using CleanArticleRenderer and return HTML + CSS
   */
  async function renderTestArticle(options?: {
    withCompiledCss?: boolean;
    withBlueprint?: boolean;
  }) {
    const { CleanArticleRenderer } = await import(
      '../services/publishing/renderer/CleanArticleRenderer'
    );

    // Minimal DesignDNA
    const designDna = {
      colors: {
        primary: { hex: '#0056b3', usage: 'primary', confidence: 0.8 },
        primaryDark: { hex: '#003d80', usage: 'primary-dark', confidence: 0.8 },
        secondary: { hex: '#6c757d', usage: 'secondary', confidence: 0.7 },
        accent: { hex: '#ff6b35', usage: 'accent', confidence: 0.7 },
        neutrals: {
          lightest: '#f8f9fa',
          light: '#dee2e6',
          medium: '#6c757d',
          dark: '#212529',
          darkest: '#000000',
        },
      },
      typography: {
        headingFont: { family: 'Inter', fallback: 'sans-serif', weight: 700 },
        bodyFont: { family: 'Inter', fallback: 'sans-serif', weight: 400 },
      },
      shapes: {
        borderRadius: { small: '4px', medium: '8px', large: '16px' },
      },
    } as any;

    const article = {
      title: 'Visual Quality Test Article',
      sections: [
        { id: 'intro', heading: 'Introduction', headingLevel: 2, content: '<p>First paragraph about the topic.</p><p>Second paragraph with more details.</p>' },
        { id: 'features', heading: 'Key Features', headingLevel: 2, content: '<ul><li>Feature one description</li><li>Feature two description</li><li>Feature three description</li></ul>' },
        { id: 'process', heading: 'Process Steps', headingLevel: 2, content: '<ol><li>First step in the process</li><li>Second step in the process</li><li>Third step in the process</li></ol>' },
        { id: 'faq', heading: 'FAQ Section', headingLevel: 2, content: '<p><strong>Q: What is this?</strong></p><p>A: This is a test answer.</p><p><strong>Q: How does it work?</strong></p><p>A: It works by testing.</p>' },
      ],
    };

    // Optionally add blueprint for layout engine decisions
    function makeSection(id: string, heading: string, order: number, contentType: string, emphasisLevel: string, component: string, width: string, columns: string) {
      return {
        id,
        sectionId: id,
        order,
        heading,
        headingLevel: 2,
        contentType,
        semanticWeight: 3,
        emphasis: { level: emphasisLevel, headingSize: 'md', padding: 'normal', background: 'none', animations: [] },
        component: { primaryComponent: component, componentVariant: 'default', alternativeComponents: [], confidence: 0.8, reasoning: 'test' },
        layout: { width, columns, spacing: { before: 'normal', after: 'normal' } },
        constraints: { minWidth: 'narrow', maxWidth: 'full', breakBefore: false, breakAfter: false, keepWithNext: false },
        contentZone: 'MAIN' as const,
        cssClasses: [],
      } as any;
    }

    const blueprint = options?.withBlueprint ? {
      sections: [
        makeSection('intro', 'Introduction', 0, 'introduction', 'hero', 'hero', 'wide', '1-column'),
        makeSection('features', 'Key Features', 1, 'benefits', 'featured', 'feature-grid', 'wide', '3-column'),
        makeSection('process', 'Process Steps', 2, 'process', 'standard', 'step-list', 'medium', '1-column'),
        makeSection('faq', 'FAQ Section', 3, 'faq', 'standard', 'faq-accordion', 'medium', '1-column'),
      ],
    } : undefined;

    const compiledCss = options?.withCompiledCss ? '/* compiledCss stub */ .ctc-card { color: inherit; }' : undefined;

    const renderer = new CleanArticleRenderer(designDna, 'TestBrand', blueprint, compiledCss);
    return renderer.render(article);
  }

  test('rendered output with blueprint includes feature-card elements', async () => {
    const result = await renderTestArticle({ withBlueprint: true });
    expect(result.html).toContain('feature-card');
    expect(result.html).toContain('feature-grid');
  });

  test('rendered output with blueprint includes step-item elements', async () => {
    const result = await renderTestArticle({ withBlueprint: true });
    expect(result.html).toContain('step-item');
    expect(result.html).toContain('step-number');
  });

  test('CSS with compiledCss still includes component visual styles', async () => {
    const result = await renderTestArticle({ withBlueprint: true, withCompiledCss: true });

    // The critical fix: component styles must be present even with compiledCss
    expect(result.css).toContain('.feature-card');
    expect(result.css).toContain('.timeline-number');
    expect(result.css).toContain('.step-number');
    expect(result.css).toContain('.faq-item');

    // Brand colors should be in the CSS
    expect(result.css).toContain('#0056b3');

    // compiledCss should also be present
    expect(result.css).toContain('compiledCss stub');

    // Structural CSS should be present
    expect(result.css).toContain('.section-container');
  });

  test('CSS without compiledCss includes component visual styles', async () => {
    const result = await renderTestArticle({ withBlueprint: true, withCompiledCss: false });

    // Component styles should be present in the fallback path too
    expect(result.css).toContain('.feature-card');
    expect(result.css).toContain('.step-item');
  });

  test('no section assigned a visual component renders as 100% unstyled prose', async () => {
    const result = await renderTestArticle({ withBlueprint: true });

    // Extract sections from HTML
    const sectionMatches = result.html.match(/<section[^>]*data-component="([^"]+)"[^>]*>[\s\S]*?<\/section>/g) || [];

    for (const section of sectionMatches) {
      const componentMatch = section.match(/data-component="([^"]+)"/);
      const component = componentMatch?.[1] || 'unknown';

      // Visual components should NOT render as plain prose only
      if (['feature-grid', 'timeline', 'step-list', 'checklist', 'stat-highlight'].includes(component)) {
        // Should contain at least one visual structure element
        const hasVisualStructure =
          section.includes('feature-card') ||
          section.includes('timeline-item') ||
          section.includes('step-item') ||
          section.includes('checklist-item') ||
          section.includes('stat-item');
        const hasProseFallback = section.includes('class="prose"');

        // Either has visual structure or at least has the component wrapper
        expect(hasVisualStructure || !hasProseFallback).toBeTruthy();
      }
    }
  });

  test('pipeline telemetry is populated', async () => {
    const result = await renderTestArticle({ withBlueprint: true, withCompiledCss: true });

    expect(result.pipelineTelemetry).toBeDefined();
    expect(result.pipelineTelemetry!.cssSources.compiledCss).toBe(true);
    expect(result.pipelineTelemetry!.cssSources.componentStyles).toBe(true);
    expect(result.pipelineTelemetry!.cssSources.structural).toBe(true);
    expect(result.pipelineTelemetry!.sectionDecisions.length).toBeGreaterThan(0);
    expect(result.pipelineTelemetry!.brandInfo?.brandName).toBe('TestBrand');
    expect(result.pipelineTelemetry!.brandInfo?.primaryColor).toContain('#');
  });

  test('hero section includes subtitle when article has intro content', async () => {
    const result = await renderTestArticle({ withBlueprint: true });
    // Hero should contain the article-header
    expect(result.html).toContain('article-header');
    // Hero must have the gradient/styled background from ComponentStyles
    expect(result.css).toMatch(/\.article-header\s*\{[^}]*background/);
    // Subtitle and meta CSS should exist
    expect(result.css).toContain('.article-subtitle');
    expect(result.css).toContain('.article-meta');
    // Subtitle should be rendered in the HTML when intro content qualifies
    expect(result.html).toContain('article-subtitle');
  });
});

// ============================================================================
// SCREENSHOT CAPTURE (requires running app)
// ============================================================================

test.describe('Visual Screenshot Capture', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');

  test('capture full-page preview screenshot for manual review', async ({ page }) => {
    // This test requires a running app with test data
    // Skip if no server is available
    try {
      await page.goto('http://localhost:3000', { timeout: 5000 });
    } catch {
      test.skip(true, 'No dev server running');
      return;
    }

    const dir = ensureDir(SCREENSHOTS_DIR);
    await page.screenshot({
      path: path.join(dir, 'visual-quality-baseline.png'),
      fullPage: true,
    });
  });
});
