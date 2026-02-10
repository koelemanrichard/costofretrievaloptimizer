// =============================================================================
// E2E Tests — Style Guide Extraction System
// =============================================================================
// Tests for style guide types, CSS generation, HTML export, and visual quality.

import { test, expect } from '@playwright/test';
import type { StyleGuide, StyleGuideElement, StyleGuideColor } from '../types/styleGuide';

// =============================================================================
// Test fixtures
// =============================================================================

function createTestElement(overrides: Partial<StyleGuideElement> = {}): StyleGuideElement {
  return {
    id: 'el-' + Math.random().toString(36).slice(2, 8),
    category: 'typography',
    subcategory: 'h1',
    label: 'H1 — Inter Bold 2.5rem #1a1a2e',
    pageRegion: 'main',
    outerHtml: '<h1 class="title">Test Heading</h1>',
    computedCss: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '2.5rem',
      fontWeight: '700',
      color: 'rgb(26, 26, 46)',
      lineHeight: '1.2',
      letterSpacing: '-0.02em',
    },
    selfContainedHtml: '<h1 style="font-family: Inter, sans-serif; font-size: 2.5rem; font-weight: 700; color: #1a1a2e; line-height: 1.2;">Test Heading</h1>',
    selector: 'h1',
    elementTag: 'h1',
    classNames: ['title'],
    approvalStatus: 'approved',
    ...overrides,
  };
}

function createTestColor(overrides: Partial<StyleGuideColor> = {}): StyleGuideColor {
  return {
    hex: '#ff6b00',
    rgb: 'rgb(255, 107, 0)',
    usage: 'brand',
    source: 'button, a.cta',
    frequency: 15,
    approvalStatus: 'approved',
    ...overrides,
  };
}

function createTestStyleGuide(overrides: Partial<StyleGuide> = {}): StyleGuide {
  return {
    id: 'sg-test-001',
    hostname: 'nfir.nl',
    sourceUrl: 'https://nfir.nl',
    extractedAt: new Date().toISOString(),
    elements: [
      createTestElement({ subcategory: 'h1', label: 'H1 — Inter Bold 2.5rem #1a1a2e' }),
      createTestElement({
        subcategory: 'h2',
        label: 'H2 — Inter SemiBold 1.75rem #37474f',
        computedCss: {
          fontFamily: '"Inter", sans-serif',
          fontSize: '1.75rem',
          fontWeight: '600',
          color: 'rgb(55, 71, 79)',
          lineHeight: '1.3',
        },
        selfContainedHtml: '<h2 style="font-family: Inter, sans-serif; font-size: 1.75rem; font-weight: 600; color: #37474f; line-height: 1.3;">Section Heading</h2>',
        selector: 'h2',
        elementTag: 'h2',
      }),
      createTestElement({
        subcategory: 'body-text',
        label: 'Body — Inter 1rem #333',
        computedCss: {
          fontFamily: '"Inter", sans-serif',
          fontSize: '1rem',
          fontWeight: '400',
          color: 'rgb(51, 51, 51)',
          lineHeight: '1.7',
        },
        selfContainedHtml: '<p style="font-family: Inter, sans-serif; font-size: 1rem; font-weight: 400; color: #333; line-height: 1.7;">Body text paragraph.</p>',
        selector: 'p',
        elementTag: 'p',
      }),
      createTestElement({
        category: 'buttons',
        subcategory: 'primary-button',
        label: 'Button — Primary Orange',
        computedCss: {
          backgroundColor: 'rgb(255, 107, 0)',
          color: 'rgb(255, 255, 255)',
          borderRadius: '8px',
          padding: '12px 24px',
          fontFamily: '"Inter", sans-serif',
          fontSize: '1rem',
          fontWeight: '600',
          border: 'none',
        },
        selfContainedHtml: '<button style="background-color: #ff6b00; color: #fff; border-radius: 8px; padding: 12px 24px; font-family: Inter, sans-serif; font-size: 1rem; font-weight: 600; border: none;">Get Started</button>',
        selector: 'button.btn-primary',
        elementTag: 'button',
        classNames: ['btn-primary'],
      }),
      createTestElement({
        category: 'cards',
        subcategory: 'feature-card',
        label: 'Card — Feature Card',
        computedCss: {
          backgroundColor: 'rgb(255, 255, 255)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          padding: '24px',
          border: '1px solid rgb(229, 231, 235)',
        },
        selfContainedHtml: '<div style="background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 24px; border: 1px solid #e5e7eb;"><h3 style="margin: 0 0 8px;">Feature</h3><p style="margin: 0; color: #666;">Description of feature.</p></div>',
        selector: '.feature-card',
        elementTag: 'div',
        classNames: ['feature-card'],
      }),
    ],
    colors: [
      createTestColor({ hex: '#ff6b00', usage: 'brand / interactive', frequency: 15 }),
      createTestColor({ hex: '#1a1a2e', usage: 'heading text', frequency: 25 }),
      createTestColor({ hex: '#333333', usage: 'body text', frequency: 40 }),
      createTestColor({ hex: '#ffffff', usage: 'background', frequency: 50 }),
      createTestColor({ hex: '#e5e7eb', usage: 'neutral border', frequency: 20 }),
    ],
    googleFontsUrls: ['https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'],
    googleFontFamilies: ['Inter'],
    isApproved: false,
    extractionDurationMs: 5200,
    elementCount: 5,
    version: 1,
    ...overrides,
  };
}

// =============================================================================
// Part A: StyleGuideCssGenerator — CSS Output Quality
// =============================================================================

test.describe('StyleGuideCssGenerator', () => {
  test('generates CSS with :root custom properties from approved colors', async () => {
    const { StyleGuideCssGenerator } = await import('../services/premium-design/StyleGuideCssGenerator');
    const guide = createTestStyleGuide();
    const css = StyleGuideCssGenerator.generate(guide);

    expect(css).toContain(':root');
    expect(css).toContain('--sg-primary');
    expect(css).toContain('--sg-text');
    expect(css).toContain('--sg-background');
  });

  test('generates H1, H2, body, button, and card selectors', async () => {
    const { StyleGuideCssGenerator } = await import('../services/premium-design/StyleGuideCssGenerator');
    const guide = createTestStyleGuide();
    const css = StyleGuideCssGenerator.generate(guide);

    // Typography selectors
    expect(css).toContain('.article-header h1, h1');
    expect(css).toContain('.section-heading, h2');
    expect(css).toContain('body, p, .prose');

    // Button selector
    expect(css).toContain('.cta-banner a, .cta-button, button.primary, .btn-primary');

    // Card selector
    expect(css).toContain('.feature-card, .card, .info-card');
  });

  test('includes Google Fonts @import', async () => {
    const { StyleGuideCssGenerator } = await import('../services/premium-design/StyleGuideCssGenerator');
    const guide = createTestStyleGuide();
    const css = StyleGuideCssGenerator.generate(guide);

    expect(css).toContain("@import url('https://fonts.googleapis.com/css2?family=Inter");
  });

  test('uses real computed values in CSS properties', async () => {
    const { StyleGuideCssGenerator } = await import('../services/premium-design/StyleGuideCssGenerator');
    const guide = createTestStyleGuide();
    const css = StyleGuideCssGenerator.generate(guide);

    // H1 typography values from our fixture
    expect(css).toContain('font-family: "Inter", sans-serif');
    expect(css).toContain('font-size: 2.5rem');
    expect(css).toContain('font-weight: 700');

    // Button values
    expect(css).toContain('border-radius: 8px');
  });

  test('skips rejected elements', async () => {
    const { StyleGuideCssGenerator } = await import('../services/premium-design/StyleGuideCssGenerator');
    const guide = createTestStyleGuide({
      elements: [
        createTestElement({ subcategory: 'h1', approvalStatus: 'rejected' }),
        createTestElement({
          subcategory: 'h2',
          approvalStatus: 'approved',
          computedCss: { fontFamily: '"Inter"', fontSize: '1.75rem', fontWeight: '600', color: '#37474f', lineHeight: '1.3' },
        }),
      ],
    });
    const css = StyleGuideCssGenerator.generate(guide);

    // Should NOT contain H1 rule (rejected)
    expect(css).not.toContain('.article-header h1, h1');
    // Should contain H2 rule (approved)
    expect(css).toContain('.section-heading, h2');
  });

  test('handles empty style guide gracefully', async () => {
    const { StyleGuideCssGenerator } = await import('../services/premium-design/StyleGuideCssGenerator');
    const guide = createTestStyleGuide({ elements: [], colors: [] });
    const css = StyleGuideCssGenerator.generate(guide);

    // Should still produce valid (though minimal) output
    expect(css).toBeDefined();
    expect(typeof css).toBe('string');
    // Should have the Google Fonts import at minimum
    expect(css).toContain('@import');
  });
});

// =============================================================================
// Part B: StyleGuideExport — HTML Export Quality
// =============================================================================

test.describe('StyleGuideExport', () => {
  test('generates valid HTML document with doctype and meta', async () => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide();
    const html = generateStyleGuideHtml(guide);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<meta charset="UTF-8">');
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain('<title>Style Guide');
    expect(html).toContain('nfir.nl');
  });

  test('includes color swatches section', async () => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide();
    const html = generateStyleGuideHtml(guide);

    expect(html).toContain('sg-color-grid');
    expect(html).toContain('sg-color-swatch');
    expect(html).toContain('#ff6b00');
    expect(html).toContain('#1a1a2e');
  });

  test('includes element sections by category', async () => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide();
    const html = generateStyleGuideHtml(guide);

    expect(html).toContain('Typography');
    expect(html).toContain('Buttons');
    expect(html).toContain('Cards');
  });

  test('escapes HTML in labels and metadata', async () => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide({
      hostname: 'test<script>alert("xss")</script>.nl',
    });
    const html = generateStyleGuideHtml(guide);

    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  test('includes footer with version', async () => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide();
    const html = generateStyleGuideHtml(guide);

    expect(html).toContain('sg-footer');
    expect(html).toContain('Holistic SEO Style Guide Extractor');
    expect(html).toContain('v1');
  });

  test('includes CSS properties in expandable details', async () => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide();
    const html = generateStyleGuideHtml(guide);

    expect(html).toContain('<details class="sg-code">');
    expect(html).toContain('CSS Properties');
    expect(html).toContain('font-family');
  });

  test('only includes approved elements', async () => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide({
      elements: [
        createTestElement({ label: 'Approved Heading', approvalStatus: 'approved' }),
        createTestElement({ label: 'Rejected Button', category: 'buttons', approvalStatus: 'rejected' }),
      ],
    });
    const html = generateStyleGuideHtml(guide);

    expect(html).toContain('Approved Heading');
    expect(html).not.toContain('Rejected Button');
  });
});

// =============================================================================
// Part C: Visual Quality — Style Guide Export Renders Properly
// =============================================================================

test.describe('StyleGuideExport Visual Quality', () => {
  test('exported HTML renders with proper layout and no overflow', async ({ page }) => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide();
    const html = generateStyleGuideHtml(guide);

    await page.setContent(html);

    // Verify no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth + 5;
    });
    expect(hasOverflow).toBeFalsy();

    // Verify container exists and is centered
    const containerStyles = await page.evaluate(() => {
      const container = document.querySelector('.sg-container');
      if (!container) return null;
      const cs = window.getComputedStyle(container);
      return {
        maxWidth: cs.maxWidth,
        marginLeft: cs.marginLeft,
        marginRight: cs.marginRight,
      };
    });
    expect(containerStyles).toBeTruthy();
    expect(parseInt(containerStyles!.maxWidth)).toBe(900);
  });

  test('color swatches render as circular chips', async ({ page }) => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide();
    const html = generateStyleGuideHtml(guide);

    await page.setContent(html);

    // Verify color circles exist and are round
    const circleStyles = await page.evaluate(() => {
      const circle = document.querySelector('.sg-color-circle');
      if (!circle) return null;
      const cs = window.getComputedStyle(circle);
      return {
        width: cs.width,
        height: cs.height,
        borderRadius: cs.borderRadius,
        backgroundColor: cs.backgroundColor,
      };
    });

    expect(circleStyles).toBeTruthy();
    expect(circleStyles!.width).toBe('40px');
    expect(circleStyles!.height).toBe('40px');
    expect(circleStyles!.borderRadius).toBe('50%');
    // First color is #ff6b00
    expect(circleStyles!.backgroundColor).toContain('255');
    expect(circleStyles!.backgroundColor).toContain('107');
  });

  test('element preview sections have white background', async ({ page }) => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide();
    const html = generateStyleGuideHtml(guide);

    await page.setContent(html);

    const previewBg = await page.evaluate(() => {
      const preview = document.querySelector('.sg-preview');
      return preview ? window.getComputedStyle(preview).backgroundColor : '';
    });
    expect(previewBg).toContain('255, 255, 255');
  });

  test('heading hierarchy — h1 > h2 > h3 in font size', async ({ page }) => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide();
    const html = generateStyleGuideHtml(guide);

    await page.setContent(html);

    const sizes = await page.evaluate(() => {
      const h1 = document.querySelector('.sg-header h1');
      const h2 = document.querySelector('.sg-section > h2');
      const h3 = document.querySelector('.sg-element-header h3');
      return {
        h1: h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : 0,
        h2: h2 ? parseFloat(window.getComputedStyle(h2).fontSize) : 0,
        h3: h3 ? parseFloat(window.getComputedStyle(h3).fontSize) : 0,
      };
    });

    expect(sizes.h1).toBeGreaterThan(sizes.h2);
    expect(sizes.h2).toBeGreaterThan(sizes.h3);
  });

  test('renders properly at mobile viewport', async ({ page }) => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide();
    const html = generateStyleGuideHtml(guide);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.setContent(html);

    // Verify no horizontal overflow on mobile
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth + 5;
    });
    expect(hasOverflow).toBeFalsy();

    // Verify text is readable at mobile size
    const bodyFontSize = await page.evaluate(() => {
      return parseFloat(window.getComputedStyle(document.body).fontSize);
    });
    expect(bodyFontSize).toBeGreaterThanOrEqual(14);
  });

  test('full export screenshot — visual proof of quality', async ({ page }) => {
    const { generateStyleGuideHtml } = await import('../components/premium-design/StyleGuideExport');
    const guide = createTestStyleGuide();
    const html = generateStyleGuideHtml(guide);

    await page.setContent(html);

    // Verify all expected sections are visible
    const sectionCount = await page.evaluate(() => {
      return document.querySelectorAll('.sg-section').length;
    });
    // Colors + Typography + Buttons + Cards = 4 sections
    expect(sectionCount).toBeGreaterThanOrEqual(3);

    // Verify element cards are rendered
    const elementCount = await page.evaluate(() => {
      return document.querySelectorAll('.sg-element').length;
    });
    expect(elementCount).toBeGreaterThanOrEqual(3);

    // Take screenshot for visual inspection (viewport only — fullPage can fail on large pages)
    await page.screenshot({
      path: 'test-results/style-guide-export.png',
    });
  });
});

// =============================================================================
// Part D: Generated CSS Renders Properly in Browser
// =============================================================================

test.describe('StyleGuideCssGenerator Visual Rendering', () => {
  test('generated CSS produces correct visual styling on an article', async ({ page }) => {
    const { StyleGuideCssGenerator } = await import('../services/premium-design/StyleGuideCssGenerator');
    const guide = createTestStyleGuide();
    const css = StyleGuideCssGenerator.generate(guide);

    const testArticle = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body>
<article>
  <header class="article-header">
    <h1>Complete Guide to Penetration Testing</h1>
  </header>
  <section>
    <h2 class="section-heading">What is Penetration Testing?</h2>
    <p class="prose">Penetration testing is a security practice where authorized testers attempt to exploit vulnerabilities in systems, networks, or applications.</p>
  </section>
  <section>
    <h2 class="section-heading">Key Benefits</h2>
    <div class="feature-card">
      <h3>Security Assurance</h3>
      <p>Verify that your security controls are working as intended.</p>
    </div>
  </section>
  <section>
    <h2 class="section-heading">Get Started</h2>
    <p class="prose">Ready to secure your organization?</p>
    <a class="cta-button" href="#">Request a Pentest</a>
  </section>
</article>
</body>
</html>`;

    await page.setContent(testArticle);

    // Wait briefly for fonts to load attempt
    await page.waitForTimeout(500);

    // Verify H1 uses the expected font-family from the style guide
    const h1Font = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? window.getComputedStyle(h1).fontFamily : '';
    });
    expect(h1Font).toContain('Inter');

    // Verify H1 font-size is larger than H2
    const [h1Size, h2Size] = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      return [
        h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : 0,
        h2 ? parseFloat(window.getComputedStyle(h2).fontSize) : 0,
      ];
    });
    expect(h1Size).toBeGreaterThan(h2Size);

    // Verify card has border-radius (12px from fixture)
    const cardBorderRadius = await page.evaluate(() => {
      const card = document.querySelector('.feature-card');
      return card ? window.getComputedStyle(card).borderRadius : '';
    });
    expect(cardBorderRadius).toContain('12px');

    // Verify CTA button has the orange background
    const ctaBg = await page.evaluate(() => {
      const btn = document.querySelector('.cta-button');
      return btn ? window.getComputedStyle(btn).backgroundColor : '';
    });
    expect(ctaBg).toContain('255');
    expect(ctaBg).toContain('107');

    // Verify no overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth + 5;
    });
    expect(hasOverflow).toBeFalsy();

    await page.screenshot({
      path: 'test-results/style-guide-css-article.png',
      fullPage: true,
    });
  });
});

// =============================================================================
// Part E: StyleGuideGenerator unit tests
// =============================================================================

test.describe('StyleGuideGenerator', () => {
  test('generate() produces valid StyleGuide from raw extraction', async () => {
    const { StyleGuideGenerator } = await import('../services/design-analysis/StyleGuideGenerator');

    const rawExtraction = {
      elements: [
        {
          category: 'typography',
          subcategory: 'h1',
          elementTag: 'h1',
          selector: 'h1',
          classNames: ['main-title'],
          outerHtml: '<h1 class="main-title">Hello World</h1>',
          selfContainedHtml: '<h1 style="font-family: Arial; font-size: 2rem; font-weight: 700; color: rgb(0, 0, 0);">Hello World</h1>',
          computedCss: {
            fontFamily: 'Arial',
            fontSize: '2rem',
            fontWeight: '700',
            color: 'rgb(0, 0, 0)',
            lineHeight: '1.2',
          },
          pageRegion: 'main',
        },
        {
          category: 'buttons',
          subcategory: 'primary-button',
          elementTag: 'button',
          selector: 'button.btn',
          classNames: ['btn'],
          outerHtml: '<button class="btn">Click</button>',
          selfContainedHtml: '<button style="background: rgb(255, 107, 0); color: #fff; border-radius: 8px; padding: 12px 24px;">Click</button>',
          computedCss: {
            backgroundColor: 'rgb(255, 107, 0)',
            color: 'rgb(255, 255, 255)',
            borderRadius: '8px',
            padding: '12px 24px',
            fontFamily: 'Arial',
          },
          pageRegion: 'main',
        },
      ],
      googleFontsUrls: ['https://fonts.googleapis.com/css2?family=Roboto'],
      googleFontFamilies: ['Roboto'],
      colorMap: {
        'rgb(255, 107, 0)': { count: 10, sources: ['button'] },
        'rgb(0, 0, 0)': { count: 30, sources: ['h1', 'p'] },
        'rgb(255, 255, 255)': { count: 50, sources: ['body'] },
      },
      extractionDurationMs: 3000,
    };

    const guide = StyleGuideGenerator.generate(rawExtraction as any, null, 'https://example.com');

    expect(guide.hostname).toBe('example.com');
    expect(guide.sourceUrl).toBe('https://example.com');
    expect(guide.elements.length).toBe(2);
    expect(guide.colors.length).toBeGreaterThanOrEqual(2);
    expect(guide.googleFontFamilies).toEqual(['Roboto']);
    expect(guide.isApproved).toBe(false);
    expect(guide.version).toBe(1);

    // All elements approved by default (opt-out model)
    for (const el of guide.elements) {
      expect(el.approvalStatus).toBe('approved');
      expect(el.id).toBeTruthy();
      expect(el.label).toBeTruthy();
    }

    // Colors should also be approved
    for (const c of guide.colors) {
      expect(c.approvalStatus).toBe('approved');
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  test('generate() deduplicates elements with identical computed CSS', async () => {
    const { StyleGuideGenerator } = await import('../services/design-analysis/StyleGuideGenerator');

    const baseElement = {
      category: 'typography',
      subcategory: 'h2',
      elementTag: 'h2',
      selector: 'h2',
      classNames: [],
      outerHtml: '<h2>Title</h2>',
      selfContainedHtml: '<h2 style="font-family: Arial; font-size: 1.5rem;">Title</h2>',
      computedCss: {
        fontFamily: 'Arial',
        fontSize: '1.5rem',
        fontWeight: '600',
        color: 'rgb(0, 0, 0)',
      },
      pageRegion: 'main',
    };

    const rawExtraction = {
      elements: [
        baseElement,
        { ...baseElement, outerHtml: '<h2>Different text but same CSS</h2>' }, // duplicate CSS
      ],
      googleFontsUrls: [],
      googleFontFamilies: [],
      colorMap: {},
      extractionDurationMs: 1000,
    };

    const guide = StyleGuideGenerator.generate(rawExtraction as any, null, 'https://example.com');

    // Should deduplicate to 1 element
    expect(guide.elements.length).toBe(1);
  });

  test('generate() generates human-readable labels', async () => {
    const { StyleGuideGenerator } = await import('../services/design-analysis/StyleGuideGenerator');

    const rawExtraction = {
      elements: [{
        category: 'typography',
        subcategory: 'h1',
        elementTag: 'h1',
        selector: 'h1',
        classNames: [],
        outerHtml: '<h1>Test</h1>',
        selfContainedHtml: '<h1 style="font-family: Inter; font-size: 2.5rem; font-weight: 700; color: rgb(26, 26, 46);">Test</h1>',
        computedCss: {
          fontFamily: 'Inter',
          fontSize: '2.5rem',
          fontWeight: '700',
          color: 'rgb(26, 26, 46)',
        },
        pageRegion: 'header',
      }],
      googleFontsUrls: [],
      googleFontFamilies: [],
      colorMap: {},
      extractionDurationMs: 1000,
    };

    const guide = StyleGuideGenerator.generate(rawExtraction as any, null, 'https://example.com');

    // Label should contain tag, font, size, and color hex
    const label = guide.elements[0].label;
    expect(label).toContain('H1');
    expect(label).toContain('Inter');
    expect(label).toContain('Bold');
    expect(label).toContain('2.5rem');
    expect(label).toContain('#1a1a2e');
  });
});

// =============================================================================
// Part F: Type Safety — Exports and Barrel
// =============================================================================

test.describe('Style Guide Exports', () => {
  test('StyleGuideCssGenerator is exported from barrel', async () => {
    const mod = await import('../services/premium-design');
    expect(mod.StyleGuideCssGenerator).toBeDefined();
    expect(typeof mod.StyleGuideCssGenerator.generate).toBe('function');
  });

  test('generateStyleGuideHtml is exported from StyleGuideExport', async () => {
    const mod = await import('../components/premium-design/StyleGuideExport');
    expect(typeof mod.generateStyleGuideHtml).toBe('function');
  });

  test('StyleGuideGenerator is exported from design-analysis module', async () => {
    const mod = await import('../services/design-analysis/StyleGuideGenerator');
    expect(mod.StyleGuideGenerator).toBeDefined();
    expect(typeof mod.StyleGuideGenerator.generate).toBe('function');
    expect(typeof mod.StyleGuideGenerator.refineElement).toBe('function');
  });
});
