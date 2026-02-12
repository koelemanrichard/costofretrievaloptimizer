import { describe, it, expect } from 'vitest';
import { analyzeHttpExtraction } from '../extraction/ExtractionAnalyzer';
import type { RawHttpExtraction } from '../extraction/HttpExtractor';

// ============================================================================
// ExtractionAnalyzer tests (unit testable without network)
// ============================================================================

function makeRawExtraction(overrides: Partial<RawHttpExtraction> = {}): RawHttpExtraction {
  return {
    html: '<html><head><title>B&M Dak-Totaal - Uw dakspecialist</title></head><body></body></html>',
    title: 'B&M Dak-Totaal - Uw dakspecialist',
    description: 'De specialist in dakbedekkingen',
    headings: [{ level: 1, text: 'Welkom bij B&M Dak-Totaal' }],
    links: [],
    images: [],
    colors: [
      { hex: '#6eb544', property: 'background-color', count: 15 },
      { hex: '#2b4c9b', property: 'color', count: 8 },
      { hex: '#f5a623', property: 'border-color', count: 3 },
    ],
    fonts: [
      { family: 'Montserrat', weights: [600, 700], source: 'css' },
      { family: 'Open Sans', weights: [400, 500], source: 'css' },
    ],
    sizes: [
      { element: 'h1', size: '2.5rem' },
      { element: 'h2', size: '2rem' },
      { element: 'h3', size: '1.75rem' },
    ],
    spacings: ['16px', '24px', '32px', '48px', '64px', '80px'],
    radii: ['4px', '8px', '12px'],
    shadows: ['0 2px 8px rgba(0,0,0,0.1)', '0 4px 12px rgba(0,0,0,0.15)'],
    googleFontsUrls: ['https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;500&display=swap'],
    pagesAnalyzed: ['https://benmdaktotaal.nl/'],
    ...overrides,
  };
}

describe('analyzeHttpExtraction', () => {
  it('extracts brand name from title', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.brandName).toBe('B&M Dak-Totaal');
  });

  it('falls back to domain for brand name when title is empty', () => {
    const analysis = analyzeHttpExtraction(
      makeRawExtraction({ title: '' }),
      'benmdaktotaal.nl',
    );
    expect(analysis.brandName.toLowerCase()).toContain('benmdaktotaal');
  });

  it('extracts primary color from highest-frequency color', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.colors.primary).toBe('#6eb544');
  });

  it('extracts secondary and accent colors', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.colors.secondary).toBe('#2b4c9b');
    expect(analysis.colors.accent).toBe('#f5a623');
  });

  it('identifies heading and body fonts', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.typography.headingFont.family).toBe('Montserrat');
    expect(analysis.typography.bodyFont.family).toBe('Open Sans');
  });

  it('preserves extracted font sizes', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.typography.sizes.h1).toBe('2.5rem');
    expect(analysis.typography.sizes.h2).toBe('2rem');
  });

  it('sets Google Fonts URL on fonts', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.typography.headingFont.googleFontsUrl).toContain('fonts.googleapis.com');
  });

  it('analyzes spacing from extracted values', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.spacing.sectionPadding.desktop).toMatch(/\d+px/);
    expect(analysis.spacing.cardPadding).toMatch(/\d+px/);
  });

  it('analyzes shapes from extracted radii', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.shapes.buttonRadius).toMatch(/\d+px/);
  });

  it('sets extraction method to http-fetch', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.extractionMethod).toBe('http-fetch');
  });

  it('calculates confidence based on data richness', () => {
    const richAnalysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(richAnalysis.confidence).toBeGreaterThan(0.7);

    const poorAnalysis = analyzeHttpExtraction(makeRawExtraction({
      colors: [],
      fonts: [],
      sizes: [],
      googleFontsUrls: [],
      radii: [],
      shadows: [],
      html: '',
    }), 'test.com');
    expect(poorAnalysis.confidence).toBeLessThan(0.5);
  });

  it('produces a complete BrandAnalysis structure', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.brandName).toBeTruthy();
    expect(analysis.domain).toBe('benmdaktotaal.nl');
    expect(analysis.colors.primary).toBeTruthy();
    expect(analysis.typography.headingFont).toBeDefined();
    expect(analysis.typography.bodyFont).toBeDefined();
    expect(analysis.spacing.sectionPadding).toBeDefined();
    expect(analysis.shapes.buttonRadius).toBeTruthy();
    expect(analysis.personality).toBeDefined();
    expect(analysis.pagesAnalyzed.length).toBeGreaterThan(0);
  });

  it('handles minimal extraction gracefully', () => {
    const minimal = analyzeHttpExtraction(makeRawExtraction({
      colors: [],
      fonts: [],
      sizes: [],
      spacings: [],
      radii: [],
      shadows: [],
      googleFontsUrls: [],
    }), 'example.com');

    // Should still produce a valid analysis with defaults
    expect(minimal.colors.primary).toBeTruthy();
    expect(minimal.typography.headingFont.family).toBeTruthy();
    expect(minimal.shapes.buttonRadius).toBeTruthy();
  });
});

// ============================================================================
// CSS Color Extraction — context-aware weighting
// ============================================================================

import { _testUtils } from '../extraction/HttpExtractor';

describe('extractColors — context-aware weighting', () => {
  it('ranks button background-color higher than heading text color', () => {
    // Simulates benmdaktotaal.nl: blue in headings (many rules), green in buttons (fewer rules)
    const css = `
      h1, h2, h3 { color: #009fe3; }
      h1 { color: #009fe3; font-size: 36px; }
      h2 { color: #009fe3; font-size: 28px; }
      a { color: #009fe3; }
      a:hover { color: #007cb8; }
      ::selection { background-color: #009fe3; color: #fff; }
      .button-offerte { background-color: #52ae32; color: #fff; border: none; }
      .button-offerte:hover { background-color: #67bf47; }
      input[type=submit] { background-color: #52ae32; color: #ffffff; }
      .site-block-dark { background-color: #222d56; }
    `;
    const colors = _testUtils.extractColors(css);
    // Green should be primary due to button context boost (+5 per button selector match)
    // and background-color boost (+3 per background declaration)
    expect(colors[0].hex).toBe('#52ae32');
  });

  it('boosts colors in background-color over text color', () => {
    const css = `
      .header { color: #ff0000; }
      p { color: #ff0000; }
      a { color: #ff0000; }
      span { color: #ff0000; }
      .hero { background-color: #00cc00; }
      .cta { background-color: #00cc00; }
    `;
    const colors = _testUtils.extractColors(css);
    // #ff0000 appears 4 times in text (4 × 1 = 4)
    // #00cc00 appears 2 times in bg (2 × 1 base + 2 × 3 bg boost = 8)
    expect(colors[0].hex).toBe('#00cc00');
  });

  it('gives highest boost to button/CTA selector colors', () => {
    const css = `
      h1 { color: #aaa111; }
      h2 { color: #aaa111; }
      h3 { color: #aaa111; }
      h4 { color: #aaa111; }
      h5 { color: #aaa111; }
      .btn-primary { background-color: #bbb222; color: #ffffff; }
    `;
    const colors = _testUtils.extractColors(css);
    // #aaa111: 5 × 1 = 5
    // #bbb222: 1 base + 3 bg boost + 5 btn boost = 9
    expect(colors[0].hex).toBe('#bbb222');
  });

  it('filters out black, white, and near-gray colors', () => {
    const css = `
      body { color: #000000; background: #ffffff; }
      .muted { color: #52ae32; }
    `;
    const colors = _testUtils.extractColors(css);
    // Black and white should be filtered out
    expect(colors.some(c => c.hex === '#000000')).toBe(false);
    expect(colors.some(c => c.hex === '#ffffff')).toBe(false);
    expect(colors[0].hex).toBe('#52ae32');
  });
});

describe('extractFonts — @font-face support', () => {
  it('extracts self-hosted fonts from @font-face declarations', () => {
    const css = `
      @font-face {
        font-family: 'Outfit';
        font-weight: 700;
        src: url('/wp-content/uploads/2022/09/Outfit-Bold.ttf') format('truetype');
      }
      @font-face {
        font-family: 'Outfit';
        font-weight: 400;
        src: url('/wp-content/uploads/2022/09/Outfit-Regular.ttf') format('truetype');
      }
      h1, h2, h3 { font-family: 'Outfit', sans-serif; }
      body { font-family: 'Open Sans', sans-serif; }
    `;
    const fonts = _testUtils.extractFonts(css);
    const outfit = fonts.find(f => f.family === 'Outfit');
    expect(outfit).toBeDefined();
    expect(outfit!.weights).toContain(400);
    expect(outfit!.weights).toContain(700);
    const openSans = fonts.find(f => f.family === 'Open Sans');
    expect(openSans).toBeDefined();
  });

  it('extracts Google Fonts from link URLs', () => {
    const html = `
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;500&display=swap" rel="stylesheet">
    `;
    const fonts = _testUtils.extractFonts(html);
    const mont = fonts.find(f => f.family === 'Montserrat');
    expect(mont).toBeDefined();
    expect(mont!.weights).toContain(600);
    expect(mont!.weights).toContain(700);
  });
});

describe('extractCssVariableColors — brand CSS variables', () => {
  it('extracts colors from CSS variables with brand-related names', () => {
    const css = `
      :root {
        --e-global-color-primary: #52ae32;
        --e-global-color-secondary: #009fe3;
        --brand-accent: #f5a623;
        --spacing-lg: 24px;
      }
    `;
    const vars = _testUtils.extractCssVariableColors(css);
    expect(vars.length).toBeGreaterThanOrEqual(2);
    // Each should have boosted count of 10
    expect(vars.every(v => v.count === 10)).toBe(true);
  });

  it('ignores CSS variables without brand-related names', () => {
    const css = `
      :root {
        --spacing-lg: 24px;
        --z-index-modal: 100;
      }
    `;
    const vars = _testUtils.extractCssVariableColors(css);
    expect(vars.length).toBe(0);
  });
});

// ============================================================================
// SiteExtractor facade tests (structure only — no network calls)
// ============================================================================

describe('SiteExtractor module structure', () => {
  it('exports extractSite function', async () => {
    const mod = await import('../extraction/SiteExtractor');
    expect(mod.extractSite).toBeDefined();
    expect(typeof mod.extractSite).toBe('function');
  });

  it('exports mergePersonalityData function', async () => {
    const mod = await import('../extraction/SiteExtractor');
    expect(mod.mergePersonalityData).toBeDefined();
  });
});
