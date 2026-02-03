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

  test('rendered article CSS provides visual styling for all used components', async () => {
    const result = await renderTestArticle({ withBlueprint: true, withCompiledCss: true });

    // Helper: check that a selector has real visual styling, not just structural
    function hasVisualStyling(css: string, selector: string): boolean {
      const nonMediaCss = css.replace(/@media[^{]*\{[^}]*(\{[^}]*\})*[^}]*\}/g, '');
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped + '\\s*\\{([^}]+)\\}', 'g');
      const matches = [...nonMediaCss.matchAll(regex)];
      if (matches.length === 0) return false;

      return matches.some(m => {
        const props = m[1];
        return (
          props.includes('background') ||
          props.includes('border') ||
          props.includes('box-shadow') ||
          props.includes('color:')
        );
      });
    }

    // Every visual component must have visual CSS
    expect(hasVisualStyling(result.css, '.feature-card')).toBe(true);
    expect(hasVisualStyling(result.css, '.step-item')).toBe(true);
    expect(hasVisualStyling(result.css, '.faq-item')).toBe(true);
    expect(hasVisualStyling(result.css, '.timeline-number')).toBe(true);
    expect(hasVisualStyling(result.css, '.checklist-check')).toBe(true);
    expect(hasVisualStyling(result.css, '.card')).toBe(true);
    expect(hasVisualStyling(result.css, '.article-header')).toBe(true);
    expect(hasVisualStyling(result.css, '.alert-box')).toBe(true);
    expect(hasVisualStyling(result.css, '.info-box')).toBe(true);
    expect(hasVisualStyling(result.css, '.lead-paragraph')).toBe(true);

    // Brand colors must appear in rendered CSS
    expect(result.css).toContain('#0056b3');

    // CSS must have hover effects (agency quality indicator)
    expect(result.css).toMatch(/\.feature-card:hover/);
    expect(result.css).toMatch(/\.step-item:hover/);
    expect(result.css).toMatch(/\.faq-item:hover/);
  });

  test('all blueprint components render as visual elements, not prose fallback', async () => {
    const result = await renderTestArticle({ withBlueprint: true });

    // Parse sections from HTML
    const sectionRegex = /<section[^>]*data-component="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g;
    const sections: Array<{ component: string; html: string }> = [];
    let match;
    while ((match = sectionRegex.exec(result.html)) !== null) {
      sections.push({ component: match[1], html: match[2] });
    }

    // Map of component type -> expected HTML class in rendered output
    const componentIndicators: Record<string, string[]> = {
      'feature-grid': ['feature-card', 'feature-grid'],
      'step-list': ['step-item', 'step-number'],
      'timeline': ['timeline-item', 'timeline-number'],
      'faq-accordion': ['faq-item', 'faq-question'],
      'checklist': ['checklist-item', 'checklist-check'],
      'stat-highlight': ['stat-item', 'stat-value'],
      'alert-box': ['alert-box'],
      'info-box': ['info-box'],
    };

    for (const section of sections) {
      const indicators = componentIndicators[section.component];
      if (indicators) {
        const hasVisualStructure = indicators.some(cls => section.html.includes(cls));
        const hasProseFallback = section.html.includes('class="prose"') && !hasVisualStructure;

        if (hasProseFallback) {
          console.warn(`Section with component="${section.component}" rendered as prose fallback`);
        }
        expect(hasVisualStructure || !hasProseFallback).toBeTruthy();
      }
    }
  });
});

// ============================================================================
// COMPONENT SELECTOR - ALERT/INFO PATTERN DETECTION
// ============================================================================

test.describe('ComponentSelector content pattern detection', () => {
  /**
   * Helper: Create a minimal SectionAnalysis for testing
   */
  function createAnalysis(overrides: Record<string, unknown> = {}) {
    return {
      sectionId: 'section-test',
      heading: 'Test Section',
      headingLevel: 2,
      contentType: 'explanation' as const,
      semanticWeight: 3,
      semanticWeightFactors: {
        baseWeight: 3,
        topicCategoryBonus: 0,
        coreTopicBonus: 0,
        fsTargetBonus: 0,
        mainIntentBonus: 0,
        totalWeight: 3,
      },
      constraints: {},
      wordCount: 50,
      hasTable: false,
      hasList: false,
      hasQuote: false,
      hasImage: false,
      isCoreTopic: false,
      answersMainIntent: false,
      contentZone: 'MAIN' as const,
      ...overrides,
    };
  }

  test('ComponentSelector assigns alert-box for Dutch warning content', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const warningContent =
      '<p><strong>Waarschuwing:</strong> Dit netwerk is kwetsbaar voor aanvallen.</p>' +
      '<p>Neem onmiddellijk actie om uw systeem te beveiligen.</p>';

    const analysis = createAnalysis();
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: warningContent,
    });

    expect(result.primaryComponent).toBe('alert-box');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('ComponentSelector assigns alert-box for English warning content', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const warningContent =
      '<p><strong>Warning:</strong> This system is vulnerable to attacks.</p>' +
      '<p>Take immediate action to secure your environment.</p>';

    const analysis = createAnalysis();
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: warningContent,
    });

    expect(result.primaryComponent).toBe('alert-box');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('ComponentSelector assigns alert-box for risk keyword content', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const riskContent =
      '<p>There is a significant risk of data loss if backups are not configured.</p>' +
      '<p>This danger cannot be ignored.</p>';

    const analysis = createAnalysis();
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: riskContent,
    });

    expect(result.primaryComponent).toBe('alert-box');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('ComponentSelector assigns alert-box for "Belangrijk:" prefix', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const importantContent =
      '<p><strong>Belangrijk:</strong> Controleer altijd de certificaten.</p>';

    const analysis = createAnalysis();
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: importantContent,
    });

    expect(result.primaryComponent).toBe('alert-box');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('ComponentSelector assigns info-box for Dutch tip content', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const tipContent =
      '<p><strong>Tip:</strong> Gebruik altijd sterke wachtwoorden voor extra bescherming.</p>';

    const analysis = createAnalysis();
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: tipContent,
    });

    expect(result.primaryComponent).toBe('info-box');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  test('ComponentSelector assigns info-box for English note content', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const noteContent =
      '<p><strong>Note:</strong> This feature is only available in the premium plan.</p>';

    const analysis = createAnalysis();
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: noteContent,
    });

    expect(result.primaryComponent).toBe('info-box');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  test('ComponentSelector assigns info-box for "Goed om te weten:" prefix', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const infoContent =
      '<p><strong>Goed om te weten:</strong> De API ondersteunt ook bulk-verzoeken.</p>';

    const analysis = createAnalysis();
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: infoContent,
    });

    expect(result.primaryComponent).toBe('info-box');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  test('ComponentSelector assigns lead-paragraph for introductory first section', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const introContent =
      '<p>In dit artikel bespreken we de belangrijkste trends op het gebied van netwerksecurity.</p>';

    const analysis = createAnalysis({
      contentType: 'introduction',
      sectionId: 'section-0',
    });

    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: introContent,
      isFirstSection: true,
    });

    expect(result.primaryComponent).toBe('lead-paragraph');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('ComponentSelector does NOT assign lead-paragraph for non-first sections', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const introContent =
      '<p>This is another section that happens to be introductory.</p>';

    const analysis = createAnalysis({
      contentType: 'introduction',
      sectionId: 'section-3',
    });

    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: introContent,
      isFirstSection: false,
    });

    // Should NOT be lead-paragraph when not first section
    expect(result.primaryComponent).not.toBe('lead-paragraph');
  });

  test('ComponentSelector falls back to matrix selection for neutral content', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const neutralContent =
      '<p>SEO is een belangrijk onderdeel van digitale marketing.</p>' +
      '<p>Het helpt bedrijven om beter gevonden te worden in zoekmachines.</p>';

    const analysis = createAnalysis();
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: neutralContent,
    });

    // Should fall through to standard matrix (prose for explanation content)
    expect(result.primaryComponent).toBe('prose');
  });

  test('ComponentSelector prefers feature-grid for short benefit lists', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    // Content with a short list of benefits/features (< 100 chars each)
    const featureListContent =
      '<ul>' +
      '<li>Snellere laadtijden voor uw website</li>' +
      '<li>Verbeterde beveiliging tegen aanvallen</li>' +
      '<li>Automatische back-ups elke dag</li>' +
      '<li>24/7 klantenondersteuning beschikbaar</li>' +
      '</ul>';

    const analysis = createAnalysis({ contentType: 'list', hasList: true });
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: featureListContent,
    });

    expect(result.primaryComponent).toBe('feature-grid');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('ComponentSelector assigns step-list for sequential content', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    // Content with sequential keywords (Dutch)
    const sequentialContent =
      '<p>Eerst moet u het formulier invullen met uw gegevens.</p>' +
      '<p>Vervolgens controleert het systeem uw aanvraag.</p>' +
      '<p>Daarna ontvangt u een bevestigingsmail.</p>' +
      '<p>Tot slot wordt uw account geactiveerd.</p>';

    const analysis = createAnalysis({ contentType: 'explanation' });
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: sequentialContent,
    });

    expect(['step-list', 'timeline']).toContain(result.primaryComponent);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('ComponentSelector assigns step-list for numbered list content', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    // Content with numbered items
    const numberedContent =
      '<ol>' +
      '<li>Download the installer from the website.</li>' +
      '<li>Run the setup wizard and follow the prompts.</li>' +
      '<li>Configure your preferences in the settings panel.</li>' +
      '<li>Restart the application to apply changes.</li>' +
      '</ol>';

    const analysis = createAnalysis({ contentType: 'explanation', hasList: true });
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: numberedContent,
    });

    expect(['step-list', 'timeline']).toContain(result.primaryComponent);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('ComponentSelector assigns faq-accordion for Q&A format content', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    // Content with bold questions and answers
    const qaContent =
      '<p><strong>Wat is SEO?</strong></p>' +
      '<p>SEO staat voor Search Engine Optimization en helpt uw website beter vindbaar te maken.</p>' +
      '<p><strong>Hoeveel kost SEO?</strong></p>' +
      '<p>De kosten variëren afhankelijk van de omvang van uw project.</p>' +
      '<p><strong>Hoe lang duurt SEO?</strong></p>' +
      '<p>Resultaten zijn meestal zichtbaar na 3 tot 6 maanden.</p>';

    const analysis = createAnalysis({ contentType: 'explanation' });
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: qaContent,
    });

    expect(result.primaryComponent).toBe('faq-accordion');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('ComponentSelector assigns faq-accordion for question-mark content', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    // Content with questions followed by answers (no bold, but with question marks)
    const questionContent =
      '<p>What are the system requirements?</p>' +
      '<p>You need at least 8GB RAM and 50GB of disk space.</p>' +
      '<p>How do I reset my password?</p>' +
      '<p>Click on the "Forgot Password" link on the login page.</p>' +
      '<p>Can I cancel my subscription?</p>' +
      '<p>Yes, you can cancel at any time from your account settings.</p>';

    const analysis = createAnalysis({ contentType: 'explanation' });
    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: questionContent,
    });

    expect(result.primaryComponent).toBe('faq-accordion');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('ComponentSelector without content option behaves as before', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const analysis = createAnalysis({ contentType: 'explanation' });
    const result = ComponentSelector.selectComponent(analysis);

    // Without content, should use standard matrix selection
    expect(result.primaryComponent).toBe('prose');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  test('FS-protected sections still override content pattern detection', async () => {
    const { ComponentSelector } = await import(
      '../services/layout-engine/ComponentSelector'
    );

    const warningContent =
      '<p><strong>Warning:</strong> This is a critical warning.</p>';

    const analysis = createAnalysis({
      formatCode: 'FS',
      constraints: { fsTarget: true },
    });

    const result = ComponentSelector.selectComponent(analysis, undefined, {
      content: warningContent,
    });

    // FS-protected should still win over content patterns
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });
});

// ============================================================================
// DESIGN QUALITY SCORING VALIDATION
// ============================================================================

test.describe('Design Quality Score Recalibration', () => {
  test('quality score penalizes sections where visual component renders as prose', async () => {
    const { analyzeDesignQuality } = await import(
      '../components/publishing/DesignQualityAssessment'
    );

    // HTML with declared visual components but NO actual visual structures
    // This simulates the bug: data-component="feature-grid" but content is plain paragraphs
    const html = `
      <article>
        <section data-component="feature-grid" class="emphasis-standard">
          <div class="section-container">
            <h2>Key Features</h2>
            <div class="prose"><p>Feature one is great.</p><p>Feature two is better.</p></div>
          </div>
        </section>
        <section data-component="timeline" class="emphasis-standard">
          <div class="section-container">
            <h2>Process</h2>
            <div class="prose"><p>Step one happens first.</p><p>Step two follows.</p></div>
          </div>
        </section>
        <section data-component="step-list" class="emphasis-standard">
          <div class="section-container">
            <h2>Steps</h2>
            <div class="prose"><p>Do this first. Then do that.</p></div>
          </div>
        </section>
        <section data-component="stat-highlight" class="emphasis-standard">
          <div class="section-container">
            <h2>Results</h2>
            <div class="prose"><p>95% satisfaction rate. 50% cost reduction.</p></div>
          </div>
        </section>
        <section data-component="prose" class="emphasis-standard">
          <div class="section-container">
            <h2>About Us</h2>
            <div class="prose"><p>We are a company.</p></div>
          </div>
        </section>
      </article>
    `;

    // CSS with only structural properties - no visual styling
    const css = `
      .section-container { max-width: 800px; margin: 0 auto; padding: 2rem; }
      .prose { line-height: 1.6; }
      .prose p { margin-bottom: 1rem; }
    `;

    const result = analyzeDesignQuality(html, css);

    // Component variety should be very low: visual components declared but not rendered
    expect(result.categoryScores.componentVariety).toBeLessThanOrEqual(10);

    // Should report the visual-components-not-rendered issue
    const notRenderedIssue = result.issues.find(i => i.id === 'visual-components-not-rendered');
    expect(notRenderedIssue).toBeDefined();
    expect(notRenderedIssue!.severity).toBe('critical');

    // Overall score should be under 50 for this poor output
    expect(result.overallScore).toBeLessThan(50);

    // Recommendation should be needs-improvement or rework
    expect(['needs-improvement', 'rework-recommended']).toContain(result.recommendation);
  });

  test('quality score rewards sections with actual visual component structures', async () => {
    const { analyzeDesignQuality } = await import(
      '../components/publishing/DesignQualityAssessment'
    );

    // HTML with proper visual structures actually rendered
    const html = `
      <article>
        <section data-component="hero" class="emphasis-hero section-hero">
          <div class="section-container width-full">
            <div class="hero-content">
              <h1>Great Article Title</h1>
              <p class="article-subtitle">Subtitle here</p>
            </div>
          </div>
        </section>
        <section data-component="feature-grid" class="emphasis-featured has-background has-accent-border">
          <div class="section-container width-wide columns-3">
            <h2>Key Features</h2>
            <div class="feature-grid">
              <div class="feature-card"><h3>Feature 1</h3><p>Description</p></div>
              <div class="feature-card"><h3>Feature 2</h3><p>Description</p></div>
              <div class="feature-card"><h3>Feature 3</h3><p>Description</p></div>
            </div>
          </div>
        </section>
        <section data-component="step-list" class="emphasis-standard">
          <div class="section-container width-medium">
            <h2>Process</h2>
            <div class="step-item"><span class="step-number">1</span><p>First step</p></div>
            <div class="step-item"><span class="step-number">2</span><p>Second step</p></div>
          </div>
        </section>
        <section data-component="faq-accordion" class="emphasis-standard">
          <div class="section-container width-medium">
            <h2>FAQ</h2>
            <div class="faq-item"><strong>Q: Question?</strong><p>Answer.</p></div>
            <div class="faq-item"><strong>Q: Another?</strong><p>Answer.</p></div>
          </div>
        </section>
        <section data-component="stat-highlight" class="emphasis-featured">
          <div class="section-container width-wide">
            <h2>Results</h2>
            <div class="stat-item"><span>95%</span><span>Satisfaction</span></div>
          </div>
        </section>
        <section data-component="key-takeaways" class="emphasis-standard">
          <div class="section-container">
            <h2>Takeaways</h2>
            <div class="takeaway-item"><p>Key point here.</p></div>
          </div>
        </section>
        <section data-component="prose" class="emphasis-standard">
          <div class="section-container">
            <h2>Conclusion</h2>
            <div class="ctc-button--primary">Contact Us</div>
          </div>
        </section>
      </article>
    `;

    // CSS with proper visual styling
    const css = `
      :root { --ctc-primary: #0056b3; --ctc-accent: #ff6b35; }
      .feature-card { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s; }
      .feature-card:hover { transform: translateY(-2px); }
      .step-item { background: #ffffff; border-left: 3px solid #0056b3; padding: 1rem; }
      .step-number { background: #0056b3; color: #ffffff; border-radius: 50%; }
      .faq-item { background: #f8f9fa; border: 1px solid #dee2e6; padding: 1rem; }
      .faq-item:hover { background: #e9ecef; }
      .stat-item { background: linear-gradient(135deg, #0056b3, #003d80); color: #fff; border-radius: 12px; }
      .checklist-check { background: #0056b3; border-radius: 50%; }
      .emphasis-hero { background: linear-gradient(135deg, #0056b3, #003d80); }
      .emphasis-featured .section-container { background: #f8f9fa; border-left: 4px solid #ff6b35; }
      .ctc-button--primary { background: #0056b3; color: #ffffff; }
      .article-header { background: linear-gradient(135deg, #0056b3, #003d80); }
      .section-container { max-width: 800px; margin: 0 auto; }
      section:nth-child(even) { background: #fafafa; }
    `;

    const result = analyzeDesignQuality(html, css);

    // Component variety should be high: multiple actual visual components
    expect(result.categoryScores.componentVariety).toBeGreaterThanOrEqual(80);

    // Should NOT report visual-components-not-rendered
    const notRenderedIssue = result.issues.find(i => i.id === 'visual-components-not-rendered');
    expect(notRenderedIssue).toBeUndefined();

    // Overall score should be high
    expect(result.overallScore).toBeGreaterThanOrEqual(65);

    // Recommendation should be good or excellent
    expect(['good', 'excellent']).toContain(result.recommendation);
  });

  test('CSS with only structural properties scores low on brand consistency', async () => {
    const { analyzeDesignQuality } = await import(
      '../components/publishing/DesignQualityAssessment'
    );

    // HTML with visual components
    const html = `
      <article>
        <section data-component="feature-grid" class="emphasis-standard">
          <div class="section-container">
            <h2>Features</h2>
            <div class="feature-card"><p>Feature 1</p></div>
            <div class="feature-card"><p>Feature 2</p></div>
          </div>
        </section>
        <section data-component="step-list" class="emphasis-standard">
          <div class="section-container">
            <h2>Steps</h2>
            <div class="step-item"><p>Step 1</p></div>
          </div>
        </section>
      </article>
    `;

    // CSS with ONLY structural properties for components - no backgrounds, borders, shadows
    const css = `
      .feature-card { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; }
      .step-item { display: flex; align-items: center; gap: 1rem; padding: 0.5rem; }
    `;

    const result = analyzeDesignQuality(html, css);

    // Should detect structural-only CSS issue
    const structuralOnlyIssue = result.issues.find(i => i.id === 'css-structural-only');
    expect(structuralOnlyIssue).toBeDefined();
    expect(structuralOnlyIssue!.severity).toBe('critical');

    // Brand consistency should be penalized
    expect(result.categoryScores.brandConsistency).toBeLessThanOrEqual(55);
  });

  test('overall score is below 50 for completely unstyled declared components', async () => {
    const { analyzeDesignQuality } = await import(
      '../components/publishing/DesignQualityAssessment'
    );

    // Simulate the original bug: 85% score for unstyled output
    // 8 sections, all declared as visual components, but all render as prose
    const html = `
      <article>
        <section data-component="feature-grid" class="emphasis-standard">
          <div class="section-container"><h2>Features</h2><div class="prose"><p>Plain text.</p></div></div>
        </section>
        <section data-component="timeline" class="emphasis-standard">
          <div class="section-container"><h2>Timeline</h2><div class="prose"><p>Plain text.</p></div></div>
        </section>
        <section data-component="step-list" class="emphasis-standard">
          <div class="section-container"><h2>Steps</h2><div class="prose"><p>Plain text.</p></div></div>
        </section>
        <section data-component="stat-highlight" class="emphasis-standard">
          <div class="section-container"><h2>Stats</h2><div class="prose"><p>Plain text.</p></div></div>
        </section>
        <section data-component="checklist" class="emphasis-standard">
          <div class="section-container"><h2>Checklist</h2><div class="prose"><p>Plain text.</p></div></div>
        </section>
        <section data-component="faq-accordion" class="emphasis-standard">
          <div class="section-container"><h2>FAQ</h2><div class="prose"><p>Plain text.</p></div></div>
        </section>
        <section data-component="testimonial-card" class="emphasis-standard">
          <div class="section-container"><h2>Reviews</h2><div class="prose"><p>Plain text.</p></div></div>
        </section>
        <section data-component="key-takeaways" class="emphasis-standard">
          <div class="section-container"><h2>Summary</h2><div class="prose"><p>Plain text.</p></div></div>
        </section>
      </article>
    `;

    const css = `
      .section-container { max-width: 800px; margin: 0 auto; }
      .prose { line-height: 1.6; }
    `;

    const result = analyzeDesignQuality(html, css);

    // The old bug: score was 85%. Now it should be under 50.
    expect(result.overallScore).toBeLessThan(50);

    // Should have critical issues
    const criticalIssues = result.issues.filter(i => i.severity === 'critical');
    expect(criticalIssues.length).toBeGreaterThanOrEqual(1);

    // Should recommend rework or at minimum needs-improvement
    expect(['needs-improvement', 'rework-recommended']).toContain(result.recommendation);
  });

  test('weights are correctly calibrated', async () => {
    const { analyzeDesignQuality } = await import(
      '../components/publishing/DesignQualityAssessment'
    );

    // Minimal HTML/CSS to just verify weights exist and total to 1.0
    const html = '<article><section><div class="section-container"><p>Test</p></div></section></article>';
    const css = '.section-container { max-width: 800px; }';

    const result = analyzeDesignQuality(html, css);

    // Verify all six categories are present
    expect(result.categoryScores).toHaveProperty('componentVariety');
    expect(result.categoryScores).toHaveProperty('visualHierarchy');
    expect(result.categoryScores).toHaveProperty('businessFit');
    expect(result.categoryScores).toHaveProperty('layoutDesign');
    expect(result.categoryScores).toHaveProperty('engagement');
    expect(result.categoryScores).toHaveProperty('brandConsistency');

    // Verify overall score is a weighted average (between min and max category scores)
    const scores = Object.values(result.categoryScores);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    expect(result.overallScore).toBeGreaterThanOrEqual(minScore);
    expect(result.overallScore).toBeLessThanOrEqual(maxScore);
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
