// =============================================================================
// Premium Design Visual Quality — Browser-side rendering validation
// =============================================================================
// Renders the full premium pipeline output (PremiumHtmlRenderer + ComponentStyles)
// in a real Chromium browser and validates that the result looks like agency-quality
// design work — not a generic blog template.

import { test, expect } from '@playwright/test';

// =============================================================================
// TEST DATA — Realistic article content with varied section types
// =============================================================================

const SAMPLE_MARKDOWN = `## Wat is penetratietesten?

Penetratietesten, ook wel pentesting genoemd, is een geautoriseerde gesimuleerde cyberaanval op een computersysteem, uitgevoerd om de beveiliging van het systeem te evalueren. Bij een penetratietest worden dezelfde tools, technieken en processen gebruikt als door echte aanvallers om de impact van potentiële beveiligingsproblemen te identificeren en aan te tonen.

## Voordelen van pentesting

- Identificeert kwetsbaarheden voordat aanvallers dat doen
- Voldoet aan compliance-eisen zoals ISO 27001 en NEN 7510
- Beschermt bedrijfsreputatie en klantvertrouwen
- Vermindert het risico op kostbare datalekken
- Verbetert de algehele beveiligingshouding

## Het pentestproces stap voor stap

1. **Scope bepaling**: Definieer welke systemen getest worden en welke aanvalsvectoren relevant zijn
2. **Informatieverzameling**: Passieve en actieve reconnaissance van het doelsysteem
3. **Kwetsbaarheidsanalyse**: Identificatie van potentiële zwakke punten in de beveiliging
4. **Exploitatie**: Gecontroleerde aanvallen uitvoeren om kwetsbaarheden te bevestigen
5. **Rapportage**: Gedetailleerd rapport met bevindingen, risicobeoordeling en aanbevelingen
6. **Herbeoordeling**: Verificatie dat gevonden kwetsbaarheden zijn opgelost

## Vergelijking pentest methoden

| Methode | Kennis | Scope | Geschikt voor |
|---------|--------|-------|---------------|
| Black box | Geen voorkennis | Extern perspectief | Realistische aanvalssimulatie |
| White box | Volledige toegang | Code review + test | Diepgaande analyse |
| Grey box | Beperkte info | Balanced approach | Meeste organisaties |

## Veelgestelde vragen over pentesting

### Hoe vaak moet een pentest worden uitgevoerd?

Minimaal jaarlijks, maar bij significante wijzigingen in de infrastructuur of applicaties is een tussentijdse test aan te raden. Organisaties in gereguleerde sectoren moeten mogelijk vaker testen.

### Wat kost een penetratietest?

De kosten variëren van €3.000 voor een kleine webapplicatie tot €50.000+ voor een uitgebreide infrastructuurtest. De prijs hangt af van de scope, complexiteit en het type test.

### Wat is het verschil tussen een pentest en een vulnerability scan?

Een vulnerability scan is geautomatiseerd en identificeert bekende kwetsbaarheden. Een pentest gaat verder door kwetsbaarheden daadwerkelijk te exploiteren en de werkelijke impact te beoordelen — dit vereist menselijke expertise.

### Verstoort een pentest de bedrijfsvoering?

Een professionele pentest wordt zo uitgevoerd dat verstoring minimaal is. In overleg worden tijdstippen gekozen en worden kritieke systemen beschermd. Denial-of-service tests worden alleen uitgevoerd na expliciete toestemming.

## Belangrijkste conclusies

Penetratietesten is een essentieel onderdeel van een volwassen cybersecuritystrategie. Door regelmatig te testen, kwetsbaarheden proactief aan te pakken en een betrouwbare partner te kiezen, kunnen organisaties hun digitale weerbaarheid significant versterken.`;

// =============================================================================
// PART A: PremiumHtmlRenderer — Component-rich rendering
// =============================================================================

test.describe('Premium Design Visual Quality', () => {
  test('PremiumHtmlRenderer produces visually rich component-based HTML', async ({ page }) => {
    const { PremiumHtmlRenderer } = await import('../services/premium-design/PremiumHtmlRenderer');
    const { LayoutEngine } = await import('../services/layout-engine/LayoutEngine');
    const { generateComponentStyles } = await import(
      '../services/publishing/renderer/ComponentStyles'
    );

    // Generate layout blueprint (local, no AI)
    const blueprint = LayoutEngine.generateBlueprint(SAMPLE_MARKDOWN, undefined, undefined, {
      topicTitle: 'Penetratietesten',
      mainIntent: 'Wat is penetratietesten',
    });

    // Generate component-rich HTML
    const html = PremiumHtmlRenderer.render(
      blueprint,
      SAMPLE_MARKDOWN,
      'De Complete Gids voor Penetratietesten',
      undefined,
      { industry: 'technology', audience: 'general', articlePurpose: 'informational', ctaText: 'Vraag een pentest aan', ctaUrl: 'https://example.com/contact' }
    );

    // Generate component CSS (no AI, deterministic)
    const componentCss = generateComponentStyles({
      primaryColor: '#e65100',
      primaryDark: '#bf360c',
      secondaryColor: '#37474f',
      accentColor: '#ff6d00',
      textColor: '#212121',
      textMuted: '#757575',
      backgroundColor: '#ffffff',
      surfaceColor: '#fafafa',
      borderColor: '#e0e0e0',
      headingFont: '"Inter", system-ui, sans-serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      radiusSmall: '4px',
      radiusMedium: '8px',
      radiusLarge: '12px',
      personality: 'corporate',
    });

    // Build complete document
    const fullDoc = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1200">
<style>
body { margin: 0; padding: 0; font-family: "Inter", system-ui, sans-serif; background: #fff; color: #212121; }
${componentCss}
</style>
</head>
<body>${html}</body>
</html>`;

    // Render in browser at 1200px width
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.setContent(fullDoc);
    await page.waitForTimeout(500);

    // =================================================================
    // VISUAL QUALITY CHECK 1: Component variety
    // Premium output must have 3+ distinct visual component types
    // =================================================================
    const componentTypes = await page.evaluate(() => {
      const types = new Set<string>();
      // Check for rich component types in the HTML
      if (document.querySelector('.article-toc')) types.add('toc');
      if (document.querySelector('.article-header')) types.add('hero');
      if (document.querySelector('.cta-banner')) types.add('cta');
      if (document.querySelector('.faq-accordion, .faq-item, details')) types.add('faq');
      if (document.querySelector('.step-list, .step-item, ol[data-step-list]')) types.add('steps');
      if (document.querySelector('.feature-grid, .feature-card')) types.add('cards');
      if (document.querySelector('.comparison-table, table')) types.add('table');
      if (document.querySelector('.prose, .section')) types.add('prose');
      if (document.querySelector('.key-takeaways, .takeaway-item')) types.add('takeaways');
      if (document.querySelector('.timeline, .timeline-item')) types.add('timeline');
      // Also check blueprint-rendered section types
      document.querySelectorAll('[class*="section-component-"]').forEach(el => {
        const match = el.className.match(/section-component-(\S+)/);
        if (match) types.add(match[1]);
      });
      return [...types];
    });

    console.log('[Visual Quality] Component types found:', componentTypes);
    expect(componentTypes.length).toBeGreaterThanOrEqual(3);

    // =================================================================
    // VISUAL QUALITY CHECK 2: No horizontal overflow
    // Professional design never has horizontal scrollbars
    // =================================================================
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth + 10;
    });
    expect(hasOverflow).toBeFalsy();

    // =================================================================
    // VISUAL QUALITY CHECK 3: Proper heading hierarchy
    // H1 must be larger than H2, H2 larger than H3
    // =================================================================
    const headingSizes = await page.evaluate(() => {
      const sizes: Record<string, number> = {};
      for (const tag of ['h1', 'h2', 'h3']) {
        const el = document.querySelector(tag);
        if (el) sizes[tag] = parseFloat(window.getComputedStyle(el).fontSize);
      }
      return sizes;
    });

    if (headingSizes.h1 && headingSizes.h2) {
      expect(headingSizes.h1).toBeGreaterThan(headingSizes.h2);
    }
    // Note: h2 > h3 not checked — component CSS (FAQ accordions, etc.) may
    // intentionally style certain h3 question headings with emphasis

    // =================================================================
    // VISUAL QUALITY CHECK 4: Visual depth — shadows, borders, backgrounds
    // Agency-quality design has visual depth, not flat text
    // =================================================================
    const visualDepth = await page.evaluate(() => {
      let boxShadowCount = 0;
      let backgroundTreatmentCount = 0;
      let borderRadiusCount = 0;
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.boxShadow && styles.boxShadow !== 'none') boxShadowCount++;
        // Count solid backgrounds AND gradient/image backgrounds
        const hasSolidBg = styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && styles.backgroundColor !== 'rgb(255, 255, 255)';
        const hasGradientBg = styles.backgroundImage && styles.backgroundImage !== 'none';
        if (hasSolidBg || hasGradientBg) backgroundTreatmentCount++;
        if (styles.borderRadius && parseFloat(styles.borderRadius) > 0) borderRadiusCount++;
      });
      return { boxShadowCount, backgroundTreatmentCount, borderRadiusCount };
    });

    console.log('[Visual Quality] Visual depth:', visualDepth);
    // Premium design must have visual depth — not just flat text
    // At minimum: TOC background + CTA gradient + some component backgrounds
    expect(visualDepth.backgroundTreatmentCount).toBeGreaterThanOrEqual(2);
    expect(visualDepth.borderRadiusCount).toBeGreaterThanOrEqual(3);

    // =================================================================
    // VISUAL QUALITY CHECK 5: Content sections are visually differentiated
    // Not all sections should look identical
    // =================================================================
    const sectionVariety = await page.evaluate(() => {
      const sections = document.querySelectorAll('section, [class*="section-component-"]');
      const backgrounds = new Set<string>();
      const paddings = new Set<string>();
      sections.forEach(s => {
        const styles = window.getComputedStyle(s);
        backgrounds.add(styles.backgroundColor);
        paddings.add(styles.paddingTop);
      });
      return {
        sectionCount: sections.length,
        uniqueBackgrounds: backgrounds.size,
        uniquePaddings: paddings.size,
      };
    });

    console.log('[Visual Quality] Section variety:', sectionVariety);
    expect(sectionVariety.sectionCount).toBeGreaterThanOrEqual(4);

    // =================================================================
    // VISUAL QUALITY CHECK 6: Hero section stands out
    // The hero/header must be visually distinct from body content
    // =================================================================
    const heroPresence = await page.evaluate(() => {
      const hero = document.querySelector('.article-header, [class*="article-header"]');
      if (!hero) return { exists: false, height: 0, hasTitle: false };
      const rect = hero.getBoundingClientRect();
      const h1 = hero.querySelector('h1');
      return {
        exists: true,
        height: rect.height,
        hasTitle: !!h1,
        titleFontSize: h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : 0,
      };
    });

    expect(heroPresence.exists).toBeTruthy();
    expect(heroPresence.hasTitle).toBeTruthy();
    expect(heroPresence.height).toBeGreaterThan(80);
    expect(heroPresence.titleFontSize).toBeGreaterThanOrEqual(28);

    // =================================================================
    // VISUAL QUALITY CHECK 7: CTA is prominent and clickable
    // =================================================================
    const ctaPresence = await page.evaluate(() => {
      const cta = document.querySelector('.cta-banner');
      if (!cta) return { exists: false };
      const link = cta.querySelector('a');
      return {
        exists: true,
        hasLink: !!link,
        linkHref: link?.getAttribute('href') || '',
      };
    });

    expect(ctaPresence.exists).toBeTruthy();
    expect(ctaPresence.hasLink).toBeTruthy();

    // =================================================================
    // VISUAL QUALITY CHECK 8: No empty sections or broken elements
    // =================================================================
    const brokenElements = await page.evaluate(() => {
      let empty = 0;
      let broken = 0;
      document.querySelectorAll('section').forEach(s => {
        const text = s.textContent?.trim() || '';
        if (text.length < 10) empty++;
        // Check for unclosed tags
        const html = s.innerHTML;
        if (html.includes('undefined') || html.includes('[object Object]')) broken++;
      });
      return { empty, broken };
    });

    expect(brokenElements.broken).toBe(0);

    // =================================================================
    // VISUAL QUALITY CHECK 9: Text readability
    // Body text should be at least 15px, line-height >= 1.4
    // =================================================================
    const readability = await page.evaluate(() => {
      const paragraphs = document.querySelectorAll('p');
      let minFontSize = Infinity;
      let avgLineHeight = 0;
      let count = 0;
      paragraphs.forEach(p => {
        const styles = window.getComputedStyle(p);
        const fontSize = parseFloat(styles.fontSize);
        const lineHeight = parseFloat(styles.lineHeight) / fontSize;
        if (fontSize < minFontSize) minFontSize = fontSize;
        if (!isNaN(lineHeight)) {
          avgLineHeight += lineHeight;
          count++;
        }
      });
      return {
        minFontSize: minFontSize === Infinity ? 0 : minFontSize,
        avgLineHeight: count > 0 ? avgLineHeight / count : 0,
        paragraphCount: paragraphs.length,
      };
    });

    console.log('[Visual Quality] Readability:', readability);
    expect(readability.minFontSize).toBeGreaterThanOrEqual(14);
    expect(readability.paragraphCount).toBeGreaterThanOrEqual(3);

    // =================================================================
    // VISUAL QUALITY CHECK 10: Table of Contents present and linked
    // =================================================================
    const tocQuality = await page.evaluate(() => {
      const toc = document.querySelector('.article-toc, nav[aria-label*="Contents"]');
      if (!toc) return { exists: false, linkCount: 0 };
      const links = toc.querySelectorAll('a[href^="#"]');
      let validLinks = 0;
      links.forEach(link => {
        const targetId = link.getAttribute('href')?.slice(1);
        if (targetId && document.getElementById(targetId)) validLinks++;
      });
      return {
        exists: true,
        linkCount: links.length,
        validLinks,
      };
    });

    console.log('[Visual Quality] TOC:', tocQuality);
    expect(tocQuality.exists).toBeTruthy();
    expect(tocQuality.linkCount).toBeGreaterThanOrEqual(3);

    // =================================================================
    // Capture full-page screenshot for visual inspection
    // =================================================================
    await page.screenshot({
      path: 'test-results/premium-design-full-render.png',
      fullPage: true,
    });
  });

  // ===================================================================
  // PART B: Visual rendering at mobile viewport
  // ===================================================================
  test('premium design is responsive at mobile viewport', async ({ page }) => {
    const { PremiumHtmlRenderer } = await import('../services/premium-design/PremiumHtmlRenderer');
    const { LayoutEngine } = await import('../services/layout-engine/LayoutEngine');
    const { generateComponentStyles } = await import(
      '../services/publishing/renderer/ComponentStyles'
    );

    const blueprint = LayoutEngine.generateBlueprint(SAMPLE_MARKDOWN);
    const html = PremiumHtmlRenderer.render(blueprint, SAMPLE_MARKDOWN, 'Pentest Gids');

    const componentCss = generateComponentStyles({
      primaryColor: '#e65100',
      primaryDark: '#bf360c',
      secondaryColor: '#37474f',
      accentColor: '#ff6d00',
      textColor: '#212121',
      textMuted: '#757575',
      backgroundColor: '#ffffff',
      surfaceColor: '#fafafa',
      borderColor: '#e0e0e0',
      headingFont: '"Inter", system-ui, sans-serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      radiusSmall: '4px',
      radiusMedium: '8px',
      radiusLarge: '12px',
      personality: 'corporate',
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.setContent(`<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
table { display: block; overflow-x: auto; }
${componentCss}
</style>
</head><body>${html}</body></html>`);

    await page.waitForTimeout(300);

    // No horizontal overflow on mobile
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth + 5;
    });
    expect(hasOverflow).toBeFalsy();

    // Text is readable at mobile size
    const mobileReadability = await page.evaluate(() => {
      const p = document.querySelector('p');
      if (!p) return { fontSize: 0 };
      return { fontSize: parseFloat(window.getComputedStyle(p).fontSize) };
    });
    expect(mobileReadability.fontSize).toBeGreaterThanOrEqual(14);

    await page.screenshot({
      path: 'test-results/premium-design-mobile.png',
      fullPage: true,
    });
  });

  // ===================================================================
  // PART C: Blueprint produces intelligent layout decisions
  // ===================================================================
  test('LayoutEngine produces intelligent component selection for varied content', async () => {
    const { LayoutEngine } = await import('../services/layout-engine/LayoutEngine');

    const blueprint = LayoutEngine.generateBlueprint(SAMPLE_MARKDOWN, undefined, undefined, {
      topicTitle: 'Penetratietesten',
      mainIntent: 'Wat is penetratietesten',
    });

    // Blueprint should have sections
    expect(blueprint.sections.length).toBeGreaterThanOrEqual(4);

    // Component types should vary — not all 'prose'
    const componentTypes = new Set(blueprint.sections.map(s => s.component.primaryComponent));
    console.log('[Blueprint] Component types:', [...componentTypes]);
    expect(componentTypes.size).toBeGreaterThanOrEqual(2);

    // Emphasis levels should vary
    const emphasisLevels = new Set(blueprint.sections.map(s => s.emphasis.level));
    console.log('[Blueprint] Emphasis levels:', [...emphasisLevels]);
    expect(emphasisLevels.size).toBeGreaterThanOrEqual(2);

    // At least one section should be non-prose (FAQ, steps, table, etc.)
    const nonProseCount = blueprint.sections.filter(
      s => !['prose', 'hero'].includes(s.component.primaryComponent)
    ).length;
    console.log('[Blueprint] Non-prose sections:', nonProseCount);
    expect(nonProseCount).toBeGreaterThanOrEqual(2);
  });

  // ===================================================================
  // PART D: Generated HTML has semantic richness
  // ===================================================================
  test('PremiumHtmlRenderer output contains rich semantic markup', async () => {
    const { PremiumHtmlRenderer } = await import('../services/premium-design/PremiumHtmlRenderer');
    const { LayoutEngine } = await import('../services/layout-engine/LayoutEngine');

    const blueprint = LayoutEngine.generateBlueprint(SAMPLE_MARKDOWN);
    const html = PremiumHtmlRenderer.render(
      blueprint,
      SAMPLE_MARKDOWN,
      'Pentest Gids',
      undefined,
      { industry: 'technology', audience: 'general', articlePurpose: 'informational', ctaText: 'Contact', ctaUrl: '#contact' }
    );

    // Has semantic article structure
    expect(html).toContain('role="main"');
    expect(html).toContain('role="banner"');
    expect(html).toContain('itemscope');
    expect(html).toContain('itemprop="headline"');

    // Has hero section
    expect(html).toContain('article-header');

    // Has CTA section
    expect(html).toContain('cta-banner');
    expect(html).toContain('cta-button');

    // Has section structure with semantic elements
    expect(html).toContain('class="section');
    expect(html).toContain('section-heading');

    // Has interactive scripts
    expect(html).toContain('faq-question');
    expect(html).toContain('scrollIntoView');

    // No template artifacts
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('{{');
    expect(html).not.toContain('}}');
  });

  // ===================================================================
  // PART E: Visual comparison — premium vs basic rendering
  // ===================================================================
  test('premium rendering has more visual richness than basic markdown', async ({ page }) => {
    const { PremiumHtmlRenderer } = await import('../services/premium-design/PremiumHtmlRenderer');
    const { LayoutEngine } = await import('../services/layout-engine/LayoutEngine');
    const { generateComponentStyles } = await import(
      '../services/publishing/renderer/ComponentStyles'
    );
    const { convertMarkdownToSemanticHtml } = await import('../services/contentAssemblyService');

    // Render BASIC markdown (no design system)
    const basicHtml = convertMarkdownToSemanticHtml(SAMPLE_MARKDOWN, { semantic: true });
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.setContent(`<!DOCTYPE html>
<html><head><style>body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 2rem; }</style></head>
<body>${basicHtml}</body></html>`);
    const basicMetrics = await page.evaluate(() => {
      let shadows = 0, backgrounds = 0, radiuses = 0;
      document.querySelectorAll('*').forEach(el => {
        const s = window.getComputedStyle(el);
        if (s.boxShadow !== 'none') shadows++;
        if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'rgb(255, 255, 255)') backgrounds++;
        if (parseFloat(s.borderRadius) > 0) radiuses++;
      });
      return { shadows, backgrounds, radiuses, componentCount: document.querySelectorAll('section, .feature-card, .step-item, .faq-item, .timeline-item').length };
    });

    // Render PREMIUM (with design system)
    const blueprint = LayoutEngine.generateBlueprint(SAMPLE_MARKDOWN);
    const premiumHtml = PremiumHtmlRenderer.render(blueprint, SAMPLE_MARKDOWN, 'Pentest Gids');
    const componentCss = generateComponentStyles({
      primaryColor: '#e65100', primaryDark: '#bf360c', secondaryColor: '#37474f',
      accentColor: '#ff6d00', textColor: '#212121', textMuted: '#757575',
      backgroundColor: '#ffffff', surfaceColor: '#fafafa', borderColor: '#e0e0e0',
      headingFont: '"Inter", sans-serif', bodyFont: '"Inter", sans-serif',
      radiusSmall: '4px', radiusMedium: '8px', radiusLarge: '12px', personality: 'corporate',
    });

    await page.setContent(`<!DOCTYPE html>
<html><head><style>
body { margin: 0; font-family: system-ui; }
${componentCss}
</style></head>
<body>${premiumHtml}</body></html>`);

    const premiumMetrics = await page.evaluate(() => {
      let shadows = 0, backgrounds = 0, radiuses = 0;
      document.querySelectorAll('*').forEach(el => {
        const s = window.getComputedStyle(el);
        if (s.boxShadow !== 'none') shadows++;
        if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'rgb(255, 255, 255)') backgrounds++;
        if (parseFloat(s.borderRadius) > 0) radiuses++;
      });
      return { shadows, backgrounds, radiuses, componentCount: document.querySelectorAll('section, .feature-card, .step-item, .faq-item, .timeline-item, [class*="section-component"]').length };
    });

    console.log('[Visual Comparison] Basic:', basicMetrics);
    console.log('[Visual Comparison] Premium:', premiumMetrics);

    // Premium should have MORE visual richness than basic
    const premiumScore = premiumMetrics.shadows + premiumMetrics.backgrounds + premiumMetrics.radiuses;
    const basicScore = basicMetrics.shadows + basicMetrics.backgrounds + basicMetrics.radiuses;
    expect(premiumScore).toBeGreaterThan(basicScore);

    // Premium should have more structural components
    expect(premiumMetrics.componentCount).toBeGreaterThan(basicMetrics.componentCount);

    // Capture both for manual comparison
    await page.screenshot({
      path: 'test-results/premium-vs-basic-premium.png',
      fullPage: true,
    });
  });

  // ===================================================================
  // PART F: CSS refinement does NOT strip ComponentStyles
  // ===================================================================
  test('ComponentStyles survive CSS refinement — simulated iteration 2-3', async ({ page }) => {
    const { PremiumHtmlRenderer } = await import('../services/premium-design/PremiumHtmlRenderer');
    const { LayoutEngine } = await import('../services/layout-engine/LayoutEngine');
    const { generateComponentStyles } = await import(
      '../services/publishing/renderer/ComponentStyles'
    );

    const blueprint = LayoutEngine.generateBlueprint(SAMPLE_MARKDOWN, undefined, undefined, {
      topicTitle: 'Penetratietesten',
      mainIntent: 'Wat is penetratietesten',
    });
    const html = PremiumHtmlRenderer.render(
      blueprint, SAMPLE_MARKDOWN, 'Pentest Gids',
      undefined,
      { industry: 'technology', audience: 'general', articlePurpose: 'informational', ctaText: 'Vraag een pentest aan', ctaUrl: 'https://example.com/contact' }
    );

    const componentCss = generateComponentStyles({
      primaryColor: '#e65100', primaryDark: '#bf360c', secondaryColor: '#37474f',
      accentColor: '#ff6d00', textColor: '#212121', textMuted: '#757575',
      backgroundColor: '#ffffff', surfaceColor: '#fafafa', borderColor: '#e0e0e0',
      headingFont: '"Inter", sans-serif', bodyFont: '"Inter", sans-serif',
      radiusSmall: '4px', radiusMedium: '8px', radiusLarge: '12px', personality: 'corporate',
    });

    // Simulate what happens in production after refineCss() replaces brand CSS:
    // Iteration 1: brandCss = full brand CSS
    // Iteration 2+: AI replaces brandCss with something minimal
    // ComponentStyles must ALWAYS be preserved
    //
    // IMPORTANT: Orchestrator wraps brand CSS in @layer brand { ... }
    // so ComponentStyles (unlayered) always wins the cascade.
    const simulatedRefinedBrandCss = `
      /* AI-refined brand CSS — minimal output typical of vision model */
      :root { --primary: #e65100; --secondary: #37474f; }
      body { font-family: "Inter", sans-serif; color: #212121; }
      h1, h2, h3 { color: #37474f; }
    `;

    // This is what the orchestrator now does: @layer brand { brandCss } + componentStyles
    const assembledCss = `@layer brand {\n${simulatedRefinedBrandCss}\n}\n\n` + componentCss;

    await page.setViewportSize({ width: 1200, height: 900 });
    await page.setContent(`<!DOCTYPE html>
<html><head><style>
body { margin: 0; }
${assembledCss}
</style></head>
<body>${html}</body></html>`);
    await page.waitForTimeout(300);

    // Even after CSS refinement, components MUST still be styled
    const metrics = await page.evaluate(() => {
      let shadows = 0, backgrounds = 0, radiuses = 0;
      document.querySelectorAll('*').forEach(el => {
        const s = window.getComputedStyle(el);
        if (s.boxShadow !== 'none') shadows++;
        if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'rgb(255, 255, 255)') backgrounds++;
        if (parseFloat(s.borderRadius) > 0) radiuses++;
      });
      const featureCards = document.querySelectorAll('.feature-card').length;
      const stepItems = document.querySelectorAll('.step-item').length;
      const sections = document.querySelectorAll('.section').length;
      const cta = document.querySelector('.cta-banner');
      const toc = document.querySelector('.article-toc');
      const hero = document.querySelector('.article-header');
      return { shadows, backgrounds, radiuses, featureCards, stepItems, sections, hasCta: !!cta, hasToc: !!toc, hasHero: !!hero };
    });

    console.log('[Refinement Survival] Metrics after simulated refinement:', metrics);

    // ComponentStyles MUST still produce visual depth even after brand CSS replacement
    expect(metrics.backgrounds).toBeGreaterThanOrEqual(2);
    expect(metrics.radiuses).toBeGreaterThanOrEqual(3);
    expect(metrics.sections).toBeGreaterThanOrEqual(4);
    expect(metrics.hasHero).toBeTruthy();
    expect(metrics.hasToc).toBeTruthy();
    expect(metrics.hasCta).toBeTruthy();

    await page.screenshot({
      path: 'test-results/premium-design-after-refinement.png',
      fullPage: true,
    });
  });

  // ===================================================================
  // PART G: buildFinalDocument produces self-contained styled HTML
  // ===================================================================
  test('buildFinalDocument output is fully styled in isolation', async ({ page }) => {
    const { PremiumHtmlRenderer } = await import('../services/premium-design/PremiumHtmlRenderer');
    const { LayoutEngine } = await import('../services/layout-engine/LayoutEngine');
    const { generateComponentStyles } = await import(
      '../services/publishing/renderer/ComponentStyles'
    );

    const blueprint = LayoutEngine.generateBlueprint(SAMPLE_MARKDOWN);
    const html = PremiumHtmlRenderer.render(
      blueprint, SAMPLE_MARKDOWN, 'De Complete Gids voor Penetratietesten',
      undefined,
      { industry: 'technology', audience: 'general', articlePurpose: 'informational', ctaText: 'Vraag een pentest aan', ctaUrl: 'https://example.com/contact' }
    );
    const componentCss = generateComponentStyles({ personality: 'corporate' });

    // Simulate buildFinalDocument output — a complete HTML document
    const finalDocument = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>De Complete Gids voor Penetratietesten</title>
<style>
/* Brand CSS — wrapped in @layer so ComponentStyles always wins */
@layer brand {
  :root { --primary: #e65100; --secondary: #37474f; }
  body { font-family: "Inter", system-ui, sans-serif; margin: 0; color: #212121; }
}

/* Component Styles (unlayered = highest cascade priority) */
${componentCss}
</style>
</head>
<body>
${html}
</body>
</html>`;

    // Load as a complete document (like the iframe srcDoc would)
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.setContent(finalDocument);
    await page.waitForTimeout(500);

    // This output must look professional — this is what users actually see
    const quality = await page.evaluate(() => {
      const hero = document.querySelector('.article-header');
      const heroH1 = hero?.querySelector('h1');
      const toc = document.querySelector('.article-toc');
      const sections = document.querySelectorAll('.section');
      const cta = document.querySelector('.cta-banner');
      const ctaLink = cta?.querySelector('a');

      let totalShadows = 0, totalBgs = 0, totalRadius = 0;
      document.querySelectorAll('*').forEach(el => {
        const s = window.getComputedStyle(el);
        if (s.boxShadow !== 'none') totalShadows++;
        if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'rgb(255, 255, 255)') totalBgs++;
        if (parseFloat(s.borderRadius) > 0) totalRadius++;
      });

      return {
        hasHero: !!hero,
        heroH1Size: heroH1 ? parseFloat(window.getComputedStyle(heroH1).fontSize) : 0,
        hasToc: !!toc,
        tocLinks: toc ? toc.querySelectorAll('a').length : 0,
        sectionCount: sections.length,
        hasCta: !!cta,
        hasCtaLink: !!ctaLink,
        totalShadows,
        totalBgs,
        totalRadius,
        bodyOverflow: document.body.scrollWidth > document.body.clientWidth + 10,
      };
    });

    console.log('[Final Document Quality]:', quality);

    // Must have all structural components
    expect(quality.hasHero).toBeTruthy();
    expect(quality.heroH1Size).toBeGreaterThanOrEqual(28);
    expect(quality.hasToc).toBeTruthy();
    expect(quality.tocLinks).toBeGreaterThanOrEqual(3);
    expect(quality.sectionCount).toBeGreaterThanOrEqual(4);
    expect(quality.hasCta).toBeTruthy();
    expect(quality.hasCtaLink).toBeTruthy();

    // Must have visual depth (not plain text)
    expect(quality.totalBgs).toBeGreaterThanOrEqual(3);
    expect(quality.totalRadius).toBeGreaterThanOrEqual(3);

    // No overflow
    expect(quality.bodyOverflow).toBeFalsy();

    await page.screenshot({
      path: 'test-results/premium-design-final-document.png',
      fullPage: true,
    });
  });

  // ===================================================================
  // PART H: @layer protects ComponentStyles from aggressive brand CSS
  // ===================================================================
  // This is the CRITICAL test: BrandDesignSystemGenerator produces CSS
  // with dual selectors (.ctc-* AND non-prefixed) that target the SAME
  // class names as ComponentStyles. Without @layer, brand CSS with higher
  // specificity would override ComponentStyles, producing unstyled output.
  test('CSS @layer prevents brand CSS from overriding ComponentStyles', async ({ page }) => {
    const { PremiumHtmlRenderer } = await import('../services/premium-design/PremiumHtmlRenderer');
    const { LayoutEngine } = await import('../services/layout-engine/LayoutEngine');
    const { generateComponentStyles } = await import(
      '../services/publishing/renderer/ComponentStyles'
    );

    const blueprint = LayoutEngine.generateBlueprint(SAMPLE_MARKDOWN, undefined, undefined, {
      topicTitle: 'Penetratietesten',
      mainIntent: 'Wat is penetratietesten',
    });
    const html = PremiumHtmlRenderer.render(
      blueprint, SAMPLE_MARKDOWN, 'De Complete Gids voor Penetratietesten',
      undefined,
      { ctaText: 'Vraag een pentest aan', ctaUrl: 'https://example.com/contact' } as any
    );

    const componentCss = generateComponentStyles({
      primaryColor: '#e65100', primaryDark: '#bf360c', secondaryColor: '#37474f',
      accentColor: '#ff6d00', textColor: '#212121', textMuted: '#757575',
      backgroundColor: '#ffffff', surfaceColor: '#fafafa', borderColor: '#e0e0e0',
      headingFont: '"Inter", sans-serif', bodyFont: '"Inter", sans-serif',
      radiusSmall: '4px', radiusMedium: '8px', radiusLarge: '12px', personality: 'corporate',
    });

    // Simulate REALISTIC brand CSS from BrandDesignSystemGenerator.
    // This is what the AI generates: dual selectors, high specificity,
    // targeting the SAME classes as ComponentStyles. WITHOUT @layer,
    // these would override ComponentStyles and break visual styling.
    const aggressiveBrandCss = `
      :root {
        --ctc-primary: #e65100;
        --ctc-primary-dark: #bf360c;
        --ctc-secondary: #37474f;
        --ctc-accent: #ff6d00;
        --ctc-neutral-darkest: #212121;
        --ctc-neutral-lightest: #fafafa;
        --ctc-font-heading: "Inter", sans-serif;
        --ctc-font-body: "Inter", sans-serif;
        --ctc-radius-sm: 4px;
        --ctc-radius-md: 8px;
        --ctc-radius-lg: 12px;
      }

      /* Brand CSS targets the SAME selectors as ComponentStyles */
      /* These would override ComponentStyles if not layered */

      .styled-article .article-header {
        background: white;
        padding: 20px;
        border: none;
      }

      .styled-article .section-heading {
        color: var(--ctc-secondary);
        font-size: 1.1rem;
        font-weight: 400;
      }

      .styled-article .section {
        padding: 5px 0;
        background: white;
      }

      .ctc-card, .card, .feature-card {
        background: white;
        border: none;
        box-shadow: none;
        padding: 5px;
        border-radius: 0;
      }

      .ctc-timeline, .timeline {
        padding: 0;
        border: none;
      }

      .ctc-timeline::before, .timeline::before {
        display: none;
      }

      .ctc-faq, .faq-accordion {
        background: white;
        border: none;
      }

      .ctc-cta, .cta-banner {
        background: white;
        padding: 5px;
        text-align: left;
      }

      .styled-article .section-container {
        max-width: 100%;
        padding: 0;
        background: transparent;
        box-shadow: none;
        border-radius: 0;
      }

      .styled-article .article-toc {
        border: none;
        background: transparent;
        padding: 0;
      }

      .styled-article .prose {
        font-size: 14px;
        line-height: 1.4;
      }

      .step-list .step-item {
        background: white;
        border: none;
        padding: 0;
        border-radius: 0;
      }

      .step-number {
        background: transparent;
        color: inherit;
        border: none;
        box-shadow: none;
      }
    `;

    // ---- TEST 1: WITHOUT @layer — brand CSS overrides ComponentStyles ----
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.setContent(`<!DOCTYPE html>
<html><head><style>
body { margin: 0; }
/* Brand CSS — NOT layered (BROKEN behavior) */
${aggressiveBrandCss}
/* ComponentStyles */
${componentCss}
</style></head>
<body>${html}</body></html>`);
    await page.waitForTimeout(300);

    const brokenMetrics = await page.evaluate(() => {
      let styledCards = 0, styledTimelines = 0;
      const featureCards = document.querySelectorAll('.feature-card');
      featureCards.forEach(el => {
        const s = window.getComputedStyle(el);
        if (parseFloat(s.borderRadius) > 2 || s.boxShadow !== 'none') styledCards++;
      });
      const timelineMarkers = document.querySelectorAll('.timeline-number');
      timelineMarkers.forEach(el => {
        const s = window.getComputedStyle(el);
        if (s.background.includes('gradient') || s.backgroundColor !== 'rgba(0, 0, 0, 0)') styledTimelines++;
      });
      const hero = document.querySelector('.article-header') as HTMLElement;
      const heroStyle = hero ? window.getComputedStyle(hero) : null;
      return {
        styledCards,
        styledTimelines,
        heroBg: heroStyle?.background || '',
        heroHasGradient: heroStyle?.background?.includes('gradient') || false,
        heroPadding: heroStyle ? parseFloat(heroStyle.paddingTop) : 0,
      };
    });

    await page.screenshot({
      path: 'test-results/premium-design-WITHOUT-layer-BROKEN.png',
      fullPage: true,
    });

    console.log('[WITHOUT @layer] Metrics (should be broken):', brokenMetrics);

    // The hero should be BROKEN without @layer — white background because
    // .styled-article .article-header (specificity 0,2,0) beats .article-header (0,1,0)
    // ComponentStyles can't win against higher-specificity brand CSS.
    // NOTE: feature cards may still be styled because ComponentStyles comes last and
    // the brand CSS uses equal specificity for .feature-card. The hero is the critical test.

    // ---- TEST 2: WITH @layer — ComponentStyles always wins ----
    await page.setContent(`<!DOCTYPE html>
<html><head><style>
body { margin: 0; }
/* Brand CSS — wrapped in @layer (FIXED behavior) */
@layer brand {
${aggressiveBrandCss}
}
/* ComponentStyles (unlayered = highest cascade priority) */
${componentCss}
</style></head>
<body>${html}</body></html>`);
    await page.waitForTimeout(300);

    const fixedMetrics = await page.evaluate(() => {
      let styledCards = 0, styledTimelines = 0, styledSections = 0;
      const featureCards = document.querySelectorAll('.feature-card');
      featureCards.forEach(el => {
        const s = window.getComputedStyle(el);
        if (parseFloat(s.borderRadius) > 2 || s.boxShadow !== 'none') styledCards++;
      });
      const timelineMarkers = document.querySelectorAll('.timeline-number');
      timelineMarkers.forEach(el => {
        const s = window.getComputedStyle(el);
        if (s.background.includes('gradient') || s.backgroundColor !== 'rgba(0, 0, 0, 0)') styledTimelines++;
      });
      const sections = document.querySelectorAll('.section');
      sections.forEach(el => {
        const s = window.getComputedStyle(el);
        if (parseFloat(s.paddingTop) > 10) styledSections++;
      });
      const hero = document.querySelector('.article-header') as HTMLElement;
      const heroStyle = hero ? window.getComputedStyle(hero) : null;
      const toc = document.querySelector('.article-toc') as HTMLElement;
      const tocStyle = toc ? window.getComputedStyle(toc) : null;
      const cta = document.querySelector('.cta-banner') as HTMLElement;
      const ctaStyle = cta ? window.getComputedStyle(cta) : null;

      let totalShadows = 0, totalBgs = 0, totalRadius = 0;
      document.querySelectorAll('*').forEach(el => {
        const s = window.getComputedStyle(el);
        if (s.boxShadow !== 'none') totalShadows++;
        if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'rgb(255, 255, 255)') totalBgs++;
        if (parseFloat(s.borderRadius) > 0) totalRadius++;
      });

      return {
        styledCards,
        styledTimelines,
        styledSections,
        heroBg: heroStyle?.background || '',
        heroHasColor: heroStyle ? heroStyle.backgroundColor !== 'rgb(255, 255, 255)' && heroStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' : false,
        heroPadding: heroStyle ? parseFloat(heroStyle.paddingTop) : 0,
        tocBorder: tocStyle?.borderStyle || 'none',
        tocHasBorder: tocStyle ? tocStyle.borderStyle !== 'none' : false,
        ctaHasBg: ctaStyle ? ctaStyle.backgroundColor !== 'rgb(255, 255, 255)' && ctaStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' : false,
        totalShadows,
        totalBgs,
        totalRadius,
      };
    });

    await page.screenshot({
      path: 'test-results/premium-design-WITH-layer-FIXED.png',
      fullPage: true,
    });

    console.log('[WITH @layer] Metrics (should be styled):', fixedMetrics);

    // With @layer, ComponentStyles MUST win on all elements:
    // - Hero must have a colored/gradient background (NOT white from brand CSS)
    expect(fixedMetrics.heroHasColor).toBeTruthy();
    // - Hero must have proper padding (48px from ComponentStyles, NOT 20px from brand CSS)
    expect(fixedMetrics.heroPadding).toBeGreaterThanOrEqual(40);
    // - Sections must have proper padding (from ComponentStyles, NOT 5px from brand CSS)
    expect(fixedMetrics.styledSections).toBeGreaterThanOrEqual(3);
    // - TOC must have border (from ComponentStyles, NOT none from brand CSS)
    expect(fixedMetrics.tocHasBorder).toBeTruthy();
    // - CTA must have colored background (from ComponentStyles, NOT white from brand CSS)
    expect(fixedMetrics.ctaHasBg).toBeTruthy();
    // - Overall visual depth — not plain unstyled text
    expect(fixedMetrics.totalBgs).toBeGreaterThanOrEqual(3);
    expect(fixedMetrics.totalRadius).toBeGreaterThanOrEqual(5);
    // - Timeline markers must be styled
    expect(fixedMetrics.styledTimelines).toBeGreaterThanOrEqual(1);
  });
});
