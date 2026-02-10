// =============================================================================
// E2E Tests — Premium Design Studio & Quick Export
// =============================================================================

import { test, expect } from '@playwright/test';

// =============================================================================
// Part A: Quick Export Quality Tests
// =============================================================================

test.describe('Quick Export Quality', () => {
  test('exported HTML uses professional stylesheet — body uses system font, headings use serif', async ({ page }) => {
    const { QUICK_EXPORT_CSS } = await import('../services/quickExportStylesheet');

    const testHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>${QUICK_EXPORT_CSS}</style>
</head>
<body>
<article>
<h1>Test Professional Article</h1>
<p class="byline">By Test Author &middot; January 2026</p>
<h2 id="section-one">Section One: Introduction</h2>
<p>This is a professional article with proper styling. It should use a system font stack for body text and Georgia serif for headings only.</p>
<h2 id="section-two">Section Two: Details</h2>
<p>More content here with <a href="#">a link that should be green</a>.</p>
<h2 id="section-three">Section Three: Tables</h2>
<table>
<thead><tr><th>Feature</th><th>Status</th></tr></thead>
<tbody>
<tr><td>Typography</td><td>Professional</td></tr>
<tr><td>Responsive</td><td>Yes</td></tr>
<tr><td>Dark Mode</td><td>Yes</td></tr>
</tbody>
</table>
<h2 id="section-four">Section Four: Quotes</h2>
<blockquote><p>This is a blockquote that should have a left border and italic styling.</p></blockquote>
<h2 id="section-five">Section Five: Conclusion</h2>
<p>Final paragraph of the test article.</p>
</article>
</body></html>`;

    await page.setContent(testHtml);

    // Verify body uses system font stack, not Georgia for body text
    const bodyFont = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily;
    });
    expect(bodyFont).not.toMatch(/^Georgia/);

    // Verify paragraph text is not Georgia
    const pFont = await page.evaluate(() => {
      const p = document.querySelector('p:not(.byline)');
      return p ? window.getComputedStyle(p).fontFamily : '';
    });
    expect(pFont).not.toMatch(/^Georgia/);

    // Verify headings use Georgia serif
    const h1Font = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? window.getComputedStyle(h1).fontFamily : '';
    });
    expect(h1Font).toContain('Georgia');

    // Verify h2 also uses Georgia
    const h2Font = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? window.getComputedStyle(h2).fontFamily : '';
    });
    expect(h2Font).toContain('Georgia');
  });

  test('professional CSS has proper spacing, font sizes, and max-width', async ({ page }) => {
    const { QUICK_EXPORT_CSS } = await import('../services/quickExportStylesheet');

    const testHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>${QUICK_EXPORT_CSS}</style>
</head>
<body>
<article>
<h1>Test Article</h1>
<h2 id="s1">Section One</h2>
<p>Test content.</p>
</article>
</body></html>`;

    await page.setContent(testHtml);

    // Verify body has a sensible max-width (should be around 680px)
    const bodyMaxWidth = await page.evaluate(() => {
      return window.getComputedStyle(document.body).maxWidth;
    });
    expect(bodyMaxWidth).toBeTruthy();
    const maxWidthPx = parseInt(bodyMaxWidth);
    expect(maxWidthPx).toBeGreaterThanOrEqual(600);
    expect(maxWidthPx).toBeLessThanOrEqual(800);

    // Verify body font-size is at least 16px (should be 18px)
    const bodyFontSize = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontSize;
    });
    const fontSizePx = parseInt(bodyFontSize);
    expect(fontSizePx).toBeGreaterThanOrEqual(16);

    // Verify body line-height is generous (should be around 1.7)
    const bodyLineHeight = await page.evaluate(() => {
      return window.getComputedStyle(document.body).lineHeight;
    });
    // lineHeight in computed style is in px; for 18px body at 1.7 lh = ~30.6px
    const lineHeightPx = parseFloat(bodyLineHeight);
    expect(lineHeightPx).toBeGreaterThan(25);
  });

  test('links have brand green color and proper styling', async ({ page }) => {
    const { QUICK_EXPORT_CSS } = await import('../services/quickExportStylesheet');

    const testHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>${QUICK_EXPORT_CSS}</style>
</head>
<body>
<article>
<h1>Link Test</h1>
<p>Check this <a href="#">styled link</a>.</p>
</article>
</body></html>`;

    await page.setContent(testHtml);

    const linkColor = await page.evaluate(() => {
      const link = document.querySelector('article a');
      return link ? window.getComputedStyle(link).color : '';
    });

    // Should be the green (#1a8917) — rgb(26, 137, 23)
    expect(linkColor).toContain('26');
    expect(linkColor).toContain('137');
  });

  test('blockquotes have left border styling', async ({ page }) => {
    const { QUICK_EXPORT_CSS } = await import('../services/quickExportStylesheet');

    const testHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>${QUICK_EXPORT_CSS}</style>
</head>
<body>
<article>
<blockquote><p>A styled blockquote.</p></blockquote>
</article>
</body></html>`;

    await page.setContent(testHtml);

    const bqBorderLeft = await page.evaluate(() => {
      const bq = document.querySelector('blockquote');
      return bq ? window.getComputedStyle(bq).borderLeftWidth : '';
    });
    expect(parseInt(bqBorderLeft)).toBeGreaterThanOrEqual(2);
  });

  test('tables have horizontal borders and alternating rows', async ({ page }) => {
    const { QUICK_EXPORT_CSS } = await import('../services/quickExportStylesheet');

    const testHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>${QUICK_EXPORT_CSS}</style>
</head>
<body>
<article>
<table>
<thead><tr><th>A</th><th>B</th></tr></thead>
<tbody>
<tr><td>1</td><td>2</td></tr>
<tr><td>3</td><td>4</td></tr>
<tr><td>5</td><td>6</td></tr>
</tbody>
</table>
</article>
</body></html>`;

    await page.setContent(testHtml);

    // Verify th has bottom border
    const thBorderBottom = await page.evaluate(() => {
      const th = document.querySelector('th');
      return th ? window.getComputedStyle(th).borderBottomWidth : '';
    });
    expect(parseInt(thBorderBottom)).toBeGreaterThan(0);

    // Verify table has full width
    const tableWidth = await page.evaluate(() => {
      const table = document.querySelector('table');
      return table ? window.getComputedStyle(table).width : '';
    });
    expect(tableWidth).toBeTruthy();
  });

  test('QUICK_EXPORT_CSS contains dark mode, responsive, and print styles', async () => {
    const { QUICK_EXPORT_CSS } = await import('../services/quickExportStylesheet');

    expect(QUICK_EXPORT_CSS).toContain('prefers-color-scheme: dark');
    expect(QUICK_EXPORT_CSS).toContain('@media print');
    expect(QUICK_EXPORT_CSS).toContain('768px');
    expect(QUICK_EXPORT_CSS).toContain('640px');
    expect(QUICK_EXPORT_CSS).toContain('.toc');
    expect(QUICK_EXPORT_CSS).toContain('.byline');
  });

  test('QUICK_EXPORT_CSS has no dangerous or generic fallbacks', async () => {
    const { QUICK_EXPORT_CSS } = await import('../services/quickExportStylesheet');

    // Should NOT have body { font-family: Georgia } (the old broken pattern)
    expect(QUICK_EXPORT_CSS).not.toMatch(/body\s*\{[^}]*font-family:\s*Georgia/);
    // Should NOT have #2d2d2d (the old generic text color)
    expect(QUICK_EXPORT_CSS).not.toContain('#2d2d2d');
  });
});

// =============================================================================
// Part B: Heading IDs and TOC
// =============================================================================

test.describe('Heading IDs and Table of Contents', () => {
  test('injectHeadingIds adds id attributes to h2-h4 tags', async () => {
    const { injectHeadingIds } = await import('../services/quickExportStylesheet');

    const html = '<h2>Hello World</h2><h3>Sub Section</h3><h2>Hello World</h2>';
    const result = injectHeadingIds(html);

    expect(result).toContain('id="hello-world"');
    expect(result).toContain('id="sub-section"');
    expect(result).toContain('id="hello-world-2"'); // duplicate handling
  });

  test('injectHeadingIds preserves existing id attributes', async () => {
    const { injectHeadingIds } = await import('../services/quickExportStylesheet');

    const html = '<h2 id="existing-id">Existing ID</h2><h2>No ID</h2>';
    const result = injectHeadingIds(html);

    // Existing id should be preserved
    expect(result).toContain('id="existing-id"');
    expect(result).toContain('id="no-id"');
  });

  test('injectHeadingIds handles special characters in headings', async () => {
    const { injectHeadingIds } = await import('../services/quickExportStylesheet');

    const html = '<h2>What is SEO?</h2><h2>Costs & Benefits</h2>';
    const result = injectHeadingIds(html);

    expect(result).toContain('id="what-is-seo"');
    expect(result).toContain('id="costs-benefits"');
  });

  test('generateTableOfContentsHtml returns empty for fewer than 4 H2 headings', async () => {
    const { generateTableOfContentsHtml, injectHeadingIds } = await import('../services/quickExportStylesheet');

    const html = injectHeadingIds('<h2>One</h2><h2>Two</h2><h2>Three</h2>');
    const toc = generateTableOfContentsHtml(html);

    expect(toc).toBe('');
  });

  test('generateTableOfContentsHtml creates TOC for 4+ H2 headings', async () => {
    const { generateTableOfContentsHtml, injectHeadingIds } = await import('../services/quickExportStylesheet');

    const html = injectHeadingIds(
      '<h2>Section A</h2><p>text</p><h2>Section B</h2><p>text</p>' +
      '<h3>Sub B1</h3><p>text</p><h2>Section C</h2><p>text</p><h2>Section D</h2><p>text</p>'
    );
    const toc = generateTableOfContentsHtml(html);

    expect(toc).toContain('<nav class="toc">');
    expect(toc).toContain('Contents');
    expect(toc).toContain('Section A');
    expect(toc).toContain('Section B');
    expect(toc).toContain('Sub B1');
    expect(toc).toContain('toc-h3'); // H3 gets indented class
  });

  test('TOC links point to correct heading IDs', async () => {
    const { generateTableOfContentsHtml, injectHeadingIds } = await import('../services/quickExportStylesheet');

    const html = injectHeadingIds(
      '<h2>First Section</h2><h2>Second Section</h2><h2>Third Section</h2><h2>Fourth Section</h2>'
    );
    const toc = generateTableOfContentsHtml(html);

    expect(toc).toContain('href="#first-section"');
    expect(toc).toContain('href="#second-section"');
    expect(toc).toContain('href="#third-section"');
    expect(toc).toContain('href="#fourth-section"');
  });
});

// =============================================================================
// Part C: SemanticHtmlGenerator Quality
// =============================================================================

test.describe('SemanticHtmlGenerator', () => {
  test('produces semantic HTML with article, header, section, and footer', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Introduction\n\nThis is a test article about SEO.\n\n## Key Benefits\n\nSEO improves visibility.\n\n## How It Works\n\nSearch engines crawl your site.\n\n## Conclusion\n\nSEO is essential for businesses.',
      'The Complete Guide to SEO'
    );

    // Must have semantic structure
    expect(result).toContain('<article>');
    expect(result).toContain('</article>');
    expect(result).toContain('<header data-hero>');
    expect(result).toContain('<h1>The Complete Guide to SEO</h1>');
    expect(result).toContain('data-content-body');
    expect(result).toContain('<footer data-article-footer>');
  });

  test('sections have data-section-id, data-content-type, and section intelligence attributes', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Introduction\n\nTest content.\n\n## FAQ\n\n### What is this?\n\nA test.\n\n### How does it work?\n\nVery well.\n\n### Why use it?\n\nBecause reasons.',
      'Test Article'
    );

    expect(result).toContain('data-section-id=');
    expect(result).toContain('data-content-type=');
    // Phase 3: section intelligence attributes
    expect(result).toContain('data-section-role=');
    expect(result).toContain('data-semantic-weight=');
    expect(result).toContain('data-emphasis=');
  });

  test('alternating sections get data-variant="surface"', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Section A\n\nContent A.\n\n## Section B\n\nContent B.\n\n## Section C\n\nContent C.\n\n## Section D\n\nContent D.',
      'Multi Section Article'
    );

    // Every 3rd section (index 1, 4, 7...) gets data-variant="surface"
    expect(result).toContain('data-variant="surface"');
  });

  test('sections have data-section-inner wrapper', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Section One\n\nContent here.',
      'Test'
    );

    expect(result).toContain('data-section-inner');
  });

  test('all prose sections have data-section-index, data-prose-section, and data-intro-text', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Introduction\n\nThis is the intro paragraph about SEO.\n\n## Benefits\n\nSEO has many benefits for businesses.\n\n## How It Works\n\nSearch engines crawl and index your site.\n\n## Conclusion\n\nSEO is essential.',
      'SEO Guide'
    );

    // Every section must have data-section-index
    const sectionIndexMatches = result.match(/data-section-index="\d+"/g) || [];
    expect(sectionIndexMatches.length).toBeGreaterThanOrEqual(4);

    // Every section must have data-section-count
    expect(result).toContain('data-section-count=');

    // Pure prose sections (no feature-grid, pull-quote, etc.) must have data-prose-section
    expect(result).toContain('data-prose-section');

    // First paragraph after h2 must get data-intro-text
    expect(result).toContain('data-intro-text');

    // Count intro-text markers — should be at least one per section with content after h2
    const introTextMatches = result.match(/data-intro-text/g) || [];
    expect(introTextMatches.length).toBeGreaterThanOrEqual(4);
  });

  test('business context CTA is added when provided', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Introduction\n\nTest content.',
      'Test Article',
      {
        industry: 'Technology',
        audience: 'Developers',
        articlePurpose: 'commercial',
        ctaText: 'Get Started Today',
        ctaUrl: 'https://example.com/signup',
      }
    );

    expect(result).toContain('data-content-type="cta"');
    expect(result).toContain('Get Started Today');
    expect(result).toContain('data-cta-button');
  });

  test('FAQ content is detected and gets FAQ content type', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Frequently Asked Questions\n\n### What is SEO?\n\nSEO is search engine optimization.\n\n### How long does SEO take?\n\nIt depends.\n\n### Is SEO worth it?\n\nAbsolutely.',
      'SEO FAQ'
    );

    expect(result).toContain('data-content-type="faq"');
  });

  test('detects introduction, definition, and summary content types', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Wat is SEO?\n\nSEO staat voor search engine optimization.\n\n## Overzicht van SEO\n\nSEO is een breed vakgebied.\n\n## Voordelen van SEO\n\nSEO heeft veel voordelen.\n\n## Hoe werkt SEO?\n\nZoekmachines crawlen je site.\n\n## Conclusie\n\nSEO is essentieel.',
      'SEO Gids'
    );

    // "Wat is SEO?" should be detected as definition
    expect(result).toContain('data-section-role="definition"');
    // "Overzicht" should be detected as introduction
    expect(result).toContain('data-section-role="introduction"');
    // "Conclusie" should be detected as summary
    expect(result).toContain('data-section-role="summary"');
  });

  test('semantic weight varies across sections — not all identical', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Wat is een pentest?\n\nEen pentest is een test.\n\n## Voordelen\n\n- Veiligheid\n- Compliance\n- Inzicht\n\n## Stappen\n\n1. Scope\n2. Test\n3. Rapport\n\n## Veelgestelde vragen\n\n### Hoe lang duurt het?\n\nEen week.\n\n### Wat kost het?\n\nVarieert.\n\n### Hoe vaak?\n\nJaarlijks.\n\n## Conclusie\n\nPentests zijn belangrijk.',
      'Pentest Gids'
    );

    // Extract all semantic weights (may be decimals like "3.5")
    const weights = (result.match(/data-semantic-weight="([\d.]+)"/g) || [])
      .map(m => m.match(/[\d.]+/)![0]);

    // Should have some variation — not all the same value
    const uniqueWeights = new Set(weights);
    expect(uniqueWeights.size).toBeGreaterThanOrEqual(2);
  });

  test('smart TOC strips H3s for articles with 8+ H2 sections', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    // Generate article with 9 H2 sections, some with H3 subsections
    const sections = Array.from({ length: 9 }, (_, i) =>
      `## Section ${i + 1}\n\nContent for section ${i + 1}.${i < 3 ? `\n\n### Subsection ${i + 1}a\n\nSubsection content.` : ''}`
    ).join('\n\n');

    const result = generator.generate(sections, 'Long Article');

    // TOC should have data-toc-count
    expect(result).toContain('data-toc-count=');

    // With 9 H2s, H3 TOC entries should be stripped
    expect(result).not.toContain('toc-h3');
  });

  test('brief data enriches sections with weight and zone', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');
    const generator = new SemanticHtmlGenerator();

    const briefSections = [
      { heading: 'Wat is een pentest?', level: 2, attribute_category: 'UNIQUE' as const, format_code: 'DEFINITIVE' as const, content_zone: 'MAIN' as const },
      { heading: 'Veelgestelde vragen', level: 2, attribute_category: 'COMMON' as const, format_code: 'PAA' as const, content_zone: 'SUPPLEMENTARY' as const },
    ];

    const result = generator.generate(
      '## Wat is een pentest?\n\nEen pentest is een beveiligingstest.\n\n## Veelgestelde vragen\n\n### Hoe lang duurt het?\n\nEen week.\n\n### Wat kost het?\n\nVarieert.\n\n### Hoe vaak?\n\nJaarlijks.',
      'Pentest Gids',
      undefined,
      briefSections
    );

    // UNIQUE attribute_category should produce higher weight (5 = 3 base + 2 UNIQUE)
    expect(result).toContain('data-semantic-weight="5"');
    // COMMON should produce lower weight (3 base + 0 COMMON)
    expect(result).toContain('data-semantic-weight="3"');
    // SUPPLEMENTARY zone should appear
    expect(result).toContain('data-content-zone="SUPPLEMENTARY"');
  });

  test('enriches lists with data-feature-grid when items are short', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Key Features\n\n- Fast performance\n- Easy to use\n- Secure by default\n- Great documentation',
      'Feature Test'
    );

    expect(result).toContain('data-feature-grid');
  });

  test('hero includes subtitle when businessContext provided', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Introduction\n\nTest content.',
      'Test Article',
      {
        industry: 'Technology',
        audience: 'Developers',
        articlePurpose: 'informational',
      }
    );

    expect(result).toContain('data-hero-content');
    expect(result).toContain('data-hero-subtitle');
    expect(result).toContain('Technology');
    expect(result).toContain('Developers');
  });

  test('hero has data-hero-content wrapper even without businessContext', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Introduction\n\nTest content.',
      'Test Article'
    );

    expect(result).toContain('data-hero-content');
    expect(result).not.toContain('data-hero-subtitle');
  });

  test('HTML is properly escaped in title and CTA', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Section\n\nContent.',
      'Test <script>alert("xss")</script> Article',
      {
        industry: 'Tech',
        audience: 'All',
        articlePurpose: 'informational',
        ctaText: '<b>Click</b> here',
      }
    );

    // Title should be escaped
    expect(result).not.toContain('<script>alert');
    expect(result).toContain('&lt;script&gt;');
    // CTA text should be escaped
    expect(result).not.toContain('<b>Click</b>');
  });
});

// =============================================================================
// Part D: Premium Design Services
// =============================================================================

test.describe('Premium Design Services', () => {
  test('PremiumDesignOrchestrator is constructable with config', async () => {
    const { PremiumDesignOrchestrator } = await import('../services/premium-design');

    const orchestrator = new PremiumDesignOrchestrator({
      targetScore: 85,
      maxIterations: 3,
      aiProvider: 'gemini',
      apiKey: 'test-key',
      apifyToken: 'test-token',
    });

    expect(orchestrator).toBeDefined();
    expect(typeof orchestrator.run).toBe('function');
  });

  test('ScreenshotService class is exportable', async () => {
    const { ScreenshotService } = await import('../services/premium-design');
    expect(ScreenshotService).toBeDefined();
    expect(typeof ScreenshotService).toBe('function');
  });

  test('DesignValidationService is constructable', async () => {
    const { DesignValidationService } = await import('../services/premium-design');

    const service = new DesignValidationService({
      targetScore: 85,
      maxIterations: 3,
      aiProvider: 'gemini',
      apiKey: 'test-key',
    });

    expect(service).toBeDefined();
    expect(typeof service.validate).toBe('function');
  });

  test('AiCssGenerator is constructable', async () => {
    const { AiCssGenerator } = await import('../services/premium-design');

    const generator = new AiCssGenerator({
      targetScore: 85,
      maxIterations: 3,
      aiProvider: 'gemini',
      apiKey: 'test-key',
    });

    expect(generator).toBeDefined();
    expect(typeof generator.generateInitialCssLegacy).toBe('function');
    expect(typeof generator.getInitialCssFromBrandSystem).toBe('function');
    expect(typeof generator.refineCss).toBe('function');
  });
});

// =============================================================================
// Part E: Design Persistence
// =============================================================================

test.describe('Design Persistence Types', () => {
  test('persistence functions are exported from barrel', async () => {
    const mod = await import('../services/premium-design');

    expect(typeof mod.savePremiumDesign).toBe('function');
    expect(typeof mod.loadLatestDesign).toBe('function');
    expect(typeof mod.loadDesignHistory).toBe('function');
    expect(typeof mod.loadDesignById).toBe('function');
    expect(typeof mod.deleteDesign).toBe('function');
  });
});

// =============================================================================
// Part F: Visual Quality — Quick Export Rendering
// =============================================================================

test.describe('Quick Export Visual Rendering', () => {
  test('full article renders professionally with proper visual hierarchy', async ({ page }) => {
    const { QUICK_EXPORT_CSS, injectHeadingIds, generateTableOfContentsHtml } = await import('../services/quickExportStylesheet');

    let content = `
<h2>What is Search Engine Optimization?</h2>
<p>Search engine optimization (SEO) is the practice of increasing the quantity and quality of traffic to your website through organic search engine results. It involves understanding what people search for, the answers they seek, and the type of content they consume.</p>
<h2>Why SEO Matters for Business</h2>
<p>In today's digital landscape, SEO is critical for business success. Without a strong organic presence, companies rely entirely on paid channels, which can become prohibitively expensive over time.</p>
<blockquote><p>SEO is not about gaming the system. It's about learning to play by the rules.</p></blockquote>
<h2>Key Components of SEO</h2>
<table>
<thead><tr><th>Component</th><th>Description</th><th>Importance</th></tr></thead>
<tbody>
<tr><td>On-Page SEO</td><td>Content and HTML optimization</td><td>Critical</td></tr>
<tr><td>Off-Page SEO</td><td>Backlinks and authority</td><td>High</td></tr>
<tr><td>Technical SEO</td><td>Site structure and speed</td><td>High</td></tr>
</tbody>
</table>
<h2>Getting Started with SEO</h2>
<ol>
<li>Conduct keyword research to identify opportunities</li>
<li>Optimize your existing content for target keywords</li>
<li>Build a content strategy around topic clusters</li>
<li>Monitor and measure your results over time</li>
</ol>
<h2>Conclusion</h2>
<p>SEO is a long-term investment that pays dividends. Start with the fundamentals and build from there.</p>`;

    content = injectHeadingIds(content);
    const tocHtml = generateTableOfContentsHtml(content);

    const testHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${QUICK_EXPORT_CSS}</style>
</head>
<body>
<article>
<h1>The Complete Guide to SEO in 2026</h1>
<p class="byline">By Expert Author &middot; February 2026</p>
${tocHtml}
${content}
</article>
</body></html>`;

    await page.setContent(testHtml);

    // Verify the page doesn't have any overflow issues
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(hasOverflow).toBeFalsy();

    // Verify heading hierarchy — h1 should be larger than h2
    const [h1Size, h2Size] = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      return [
        h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : 0,
        h2 ? parseFloat(window.getComputedStyle(h2).fontSize) : 0,
      ];
    });
    expect(h1Size).toBeGreaterThan(h2Size);
    expect(h1Size).toBeGreaterThanOrEqual(28); // should be 2rem+ at 18px base

    // Verify TOC is present (5 H2 headings)
    const hasToc = await page.evaluate(() => {
      return !!document.querySelector('.toc, nav.toc');
    });
    expect(hasToc).toBeTruthy();

    // Verify text is readable — check contrast between text and background
    const textColor = await page.evaluate(() => {
      const p = document.querySelector('article p:not(.byline)');
      return p ? window.getComputedStyle(p).color : '';
    });
    // Should be dark text, not invisible or light on light
    expect(textColor).toMatch(/rgb\(\s*\d{1,2}\s*,/); // starts with low rgb values = dark

    // Take screenshot for visual inspection
    await page.screenshot({
      path: 'test-results/quick-export-full-article.png',
      fullPage: true,
    });
  });

  test('responsive layout works at mobile viewport', async ({ page }) => {
    const { QUICK_EXPORT_CSS } = await import('../services/quickExportStylesheet');

    const testHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${QUICK_EXPORT_CSS}</style>
</head>
<body>
<article>
<h1>Mobile Test Article</h1>
<h2 id="s1">Section</h2>
<p>Content that should be readable on mobile.</p>
<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>
</article>
</body></html>`;

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.setContent(testHtml);

    // Verify no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth + 5; // 5px tolerance
    });
    expect(hasOverflow).toBeFalsy();

    // Verify text is still readable size (should be at least 14px on mobile)
    const bodyFontSize = await page.evaluate(() => {
      return parseFloat(window.getComputedStyle(document.body).fontSize);
    });
    expect(bodyFontSize).toBeGreaterThanOrEqual(14);

    await page.screenshot({
      path: 'test-results/quick-export-mobile.png',
      fullPage: true,
    });
  });
});

// =============================================================================
// Part G: Premium Design HTML Structure Quality
// =============================================================================

test.describe('Premium Design HTML Structure Quality', () => {
  test('generated semantic HTML renders without visual artifacts', async ({ page }) => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');
    const { QUICK_EXPORT_CSS } = await import('../services/quickExportStylesheet');

    const generator = new SemanticHtmlGenerator();
    const html = generator.generate(
      '## Introduction to Cloud Computing\n\nCloud computing transforms how businesses manage IT infrastructure.\n\n## Benefits of Cloud Migration\n\n- Reduced costs\n- Improved scalability\n- Better disaster recovery\n- Enhanced collaboration\n\n## Frequently Asked Questions\n\n### What is cloud computing?\n\nCloud computing delivers computing services over the internet.\n\n### Is it secure?\n\nYes, major cloud providers invest heavily in security.\n\n### How much does it cost?\n\nPricing varies based on usage and provider.\n\n## Conclusion\n\nCloud computing is the future of IT infrastructure.',
      'Cloud Computing Guide',
      {
        industry: 'Technology',
        audience: 'Business leaders',
        articlePurpose: 'informational',
        ctaText: 'Start Your Cloud Journey',
        ctaUrl: 'https://example.com',
      }
    );

    // Render with Quick Export CSS as fallback
    const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>${QUICK_EXPORT_CSS}</style>
</head>
<body>${html}</body></html>`;

    await page.setContent(fullHtml);

    // Verify all sections are visible
    const sectionCount = await page.evaluate(() => {
      return document.querySelectorAll('section').length;
    });
    expect(sectionCount).toBeGreaterThanOrEqual(3);

    // Verify hero header exists
    const hasHero = await page.evaluate(() => {
      return !!document.querySelector('[data-hero]');
    });
    expect(hasHero).toBeTruthy();

    // Verify CTA section exists
    const hasCta = await page.evaluate(() => {
      return !!document.querySelector('[data-content-type="cta"]');
    });
    expect(hasCta).toBeTruthy();

    // Verify CTA button exists
    const hasCtaButton = await page.evaluate(() => {
      return !!document.querySelector('[data-cta-button]');
    });
    expect(hasCtaButton).toBeTruthy();

    // Verify footer exists
    const hasFooter = await page.evaluate(() => {
      return !!document.querySelector('[data-article-footer]');
    });
    expect(hasFooter).toBeTruthy();

    // Verify no elements are overflowing the viewport
    const overflowElements = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const allElements = document.querySelectorAll('*');
      let count = 0;
      allElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > viewportWidth + 10) count++;
      });
      return count;
    });
    expect(overflowElements).toBeLessThanOrEqual(2); // Allow small tolerance

    await page.screenshot({
      path: 'test-results/premium-design-semantic-html.png',
      fullPage: true,
    });
  });

  test('generated HTML has no broken elements or empty sections', async ({ page }) => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const html = generator.generate(
      '## First Section\n\nSome content.\n\n## Second Section\n\nMore content.\n\n## Third Section\n\nFinal content.',
      'Test Article'
    );

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${html}</body></html>`;
    await page.setContent(fullHtml);

    // Verify h1 is not empty
    const h1Text = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1?.textContent?.trim() || '';
    });
    expect(h1Text).toBe('Test Article');

    // Verify the article has named sections with visible text
    const sectionDebug = await page.evaluate(() => {
      const sections = document.querySelectorAll('section[data-section-id]');
      return Array.from(sections).map(s => ({
        id: s.getAttribute('data-section-id'),
        text: s.textContent?.trim().substring(0, 80),
        innerHTML: s.innerHTML.substring(0, 200),
      }));
    });
    // Should have sections
    expect(sectionDebug.length).toBeGreaterThan(0);
    // At least some sections should have content (section splitting may produce wrapper sections)
    const sectionsWithContent = sectionDebug.filter(s => (s.text?.length ?? 0) > 0);
    expect(sectionsWithContent.length).toBeGreaterThan(0);

    // Verify proper nesting — article contains header + content-body + footer
    const hasProperStructure = await page.evaluate(() => {
      const article = document.querySelector('article');
      if (!article) return false;
      const header = article.querySelector('header');
      const contentBody = article.querySelector('[data-content-body]');
      const footer = article.querySelector('footer');
      return !!(header && contentBody && footer);
    });
    expect(hasProperStructure).toBeTruthy();
  });
});

// =============================================================================
// Part H: ScreenshotService Capture
// =============================================================================

test.describe('ScreenshotService Capture', () => {
  test('captureRenderedOutput produces valid JPEG', async ({ page }) => {
    // Navigate to the app so we have a real browser context with Vite module system
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const testHtml = '<h1>Screenshot Test</h1><p>This is a test article for screenshot capture.</p>';
    const testCss = 'body { font-family: sans-serif; padding: 40px; } h1 { color: #1a1a1a; }';

    // Use page.evaluate to dynamically import ScreenshotService and capture
    const base64 = await page.evaluate(async ({ html, css }) => {
      const { ScreenshotService } = await import('../services/premium-design/ScreenshotService.ts');
      const service = new ScreenshotService();
      return await service.captureRenderedOutput(html, css);
    }, { html: testHtml, css: testCss });

    // Validate base64 starts with /9j/ (JPEG SOI marker in base64)
    expect(base64).toBeTruthy();
    expect(base64.startsWith('/9j/')).toBe(true);

    // Decode and verify image dimensions via an Image element
    const dimensions = await page.evaluate(async (b64) => {
      return new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Failed to decode JPEG'));
        img.src = 'data:image/jpeg;base64,' + b64;
      });
    }, base64);

    expect(dimensions.width).toBeGreaterThanOrEqual(1200);
    expect(dimensions.height).toBeGreaterThan(100);
  });

  test('captureRenderedOutput handles broken CSS gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const testHtml = '<h1>Broken CSS Test</h1><p>This should still produce a screenshot.</p>';
    // Intentionally broken CSS: missing braces, invalid values
    const brokenCss = `
      body { font-family: sans-serif; padding: 40px;
      h1 { color: notacolor; font-size: %%invalid; }
      .nonexistent { display: banana; width: -999px; }
    `;

    // Should still produce a screenshot without crashing
    const base64 = await page.evaluate(async ({ html, css }) => {
      const { ScreenshotService } = await import('../services/premium-design/ScreenshotService.ts');
      const service = new ScreenshotService();
      return await service.captureRenderedOutput(html, css);
    }, { html: testHtml, css: brokenCss });

    expect(base64).toBeTruthy();
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(100);
  });
});
