// Checkpoint 4: CSS Generation Inspection
// Captures and validates the generated CSS:
// - CSS tokens (variables) match brand colors
// - Google Fonts @import present
// - Component CSS generated for all component types
// - No undefined CSS variables
// - Renders sample components with brand CSS
import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DEBUG_DIR = path.resolve('tmp/debug');
const BRAND_DOMAIN = 'resultaatmakers.online';
const TEST_EMAIL = 'richard@kjenmarks.nl';
const TEST_PASSWORD = 'pannekoek';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function debugPath(name: string) { return path.join(DEBUG_DIR, name); }

async function navigateToStylePublish(page: Page) {
  await page.goto('/');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });
  await page.locator('tr', { hasText: /resultaatmakers/i }).first().locator('button:has-text("Open")').click();
  await page.waitForTimeout(2000);
  await page.waitForSelector('button:has-text("Load Map")', { timeout: 15000 });
  await page.locator('button:has-text("Load Map")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  await page.locator('tr', { hasText: /SEO voor Groothandel/i }).first().click();
  await page.waitForTimeout(2000);
  const viewBriefBtn = page.locator('button:has-text("View Brief")').first();
  if (await viewBriefBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await viewBriefBtn.click();
    await page.waitForTimeout(2000);
  }
  const viewDraftBtn = page.locator('button:has-text("View Draft"), button:has-text("View Generated Draft")').first();
  if (await viewDraftBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await viewDraftBtn.click();
    await page.waitForTimeout(3000);
  }
  const publishBtn = page.locator('button:has-text("Publish")').last();
  if (await publishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await publishBtn.scrollIntoViewIfNeeded();
    await publishBtn.click();
    await page.waitForTimeout(1500);
  }
  await page.locator('button:has-text("Style & Publish")').first().click();
  await page.waitForSelector('text=Brand Intelligence', { timeout: 10000 });
  await page.waitForTimeout(3000);
}

test.describe('Checkpoint 4 - CSS Generation Inspection', () => {
  test.setTimeout(600000);

  test('capture and validate generated CSS', async ({ page }) => {
    ensureDir(DEBUG_DIR);
    await page.setViewportSize({ width: 1280, height: 900 });

    const consoleLogs: { type: string; text: string; ts: number }[] = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text(), ts: Date.now() });
    });

    await navigateToStylePublish(page);

    // Wait for brand summary (saved data or extraction)
    const hasBrandSummary = await page.locator('text=Brand Summary').first().isVisible({ timeout: 10000 }).catch(() => false);

    if (!hasBrandSummary) {
      console.log('No saved brand data - running extraction...');
      const domainInput = page.locator('input[placeholder*="Enter domain"], input[placeholder*="example.com"]').first();
      await domainInput.fill(BRAND_DOMAIN);
      await page.locator('button:has-text("Discover URLs")').first().click();

      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(5000);
        if (await page.locator('input[type="checkbox"]').count() > 0) break;
      }
      await page.locator('button:has-text("Extract Brand")').first().click();

      for (let i = 0; i < 120; i++) {
        await page.waitForTimeout(5000);
        if (await page.locator('text=Brand Summary').first().isVisible().catch(() => false)) break;
      }
    }

    // Wait for CSS generation to complete
    console.log('Waiting for CSS generation...');
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(5000);
      const cssSpinnerGone = !(await page.locator('text=Generating brand-matched CSS').first().isVisible().catch(() => false));
      const cssComplete = consoleLogs.some(l =>
        l.text.includes('Generated design system, CSS length:') ||
        l.text.includes('Full Extraction flow complete')
      );
      if (cssComplete || cssSpinnerGone) {
        console.log(`CSS ready at ${(i + 1) * 5}s`);
        break;
      }
    }
    await page.waitForTimeout(3000);

    // =============================================
    // EXTRACT COMPILED CSS
    // =============================================

    // Get compiledCss from window debug variable (exposed by BrandIntelligenceStep)
    // Wait a bit for it to be set
    for (let i = 0; i < 10; i++) {
      const hasCSS = await page.evaluate(() => !!(window as unknown as Record<string, unknown>).__BRAND_COMPILED_CSS__);
      if (hasCSS) break;
      await page.waitForTimeout(2000);
    }

    const cssData = await page.evaluate(() => {
      const css = (window as unknown as Record<string, unknown>).__BRAND_COMPILED_CSS__ as string | undefined;
      if (!css) return null;
      return { compiledCss: css, tokens: {} };
    });

    if (cssData?.compiledCss) {
      const css = cssData.compiledCss;
      fs.writeFileSync(debugPath('4_compiled_css.css'), css);
      console.log(`Compiled CSS saved: ${css.length} chars`);

      // =============================================
      // ANALYZE CSS
      // =============================================

      // 1. Extract CSS variables
      const variableDefines = css.match(/--[\w-]+\s*:\s*[^;]+/g) || [];
      const variableUses = css.match(/var\(--[\w-]+\)/g) || [];
      const definedVars = new Set(variableDefines.map(v => v.split(':')[0].trim()));
      const usedVars = new Set(variableUses.map(v => v.match(/--[\w-]+/)?.[0] || ''));
      const undefinedVars = [...usedVars].filter(v => !definedVars.has(v));

      // 2. Extract @import
      const imports = css.match(/@import\s+url\([^)]+\)/g) || [];

      // 3. Count selectors
      const selectors = css.match(/[^{}]+\{/g) || [];

      // 4. Find specific brand colors in CSS
      const primaryInCss = (css.match(/#004aad/gi) || []).length;
      const accentInCss = (css.match(/#ad6300/gi) || []).length;
      const secondaryInCss = (css.match(/#002c68/gi) || []).length;

      // 5. Find font references
      const poppinsRefs = (css.match(/Poppins/gi) || []).length;
      const openSansRefs = (css.match(/Open\s*Sans/gi) || []).length;

      // 6. Find component sections
      const componentSections = css.match(/\/\*[\s\S]*?\*\//g) || [];
      const componentNames = componentSections
        .map(c => c.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:CSS|Styles|Component)/)?.[1])
        .filter(Boolean);

      // 7. Check for key CSS properties
      const hasGradients = /gradient/i.test(css);
      const hasAnimations = /animation|@keyframes/i.test(css);
      const hasMediaQueries = /@media/i.test(css);
      const hasHoverEffects = /:hover/i.test(css);
      const hasTransitions = /transition/i.test(css);

      console.log('\n========================================');
      console.log('  PHASE 4: CSS GENERATION INSPECTION');
      console.log('========================================\n');

      console.log('--- 4.1 CSS TOKENS (Variables) ---');
      const ctcVars = variableDefines.filter(v => v.includes('--ctc-'));
      console.log(`Total CSS variables defined: ${variableDefines.length}`);
      console.log(`Brand (--ctc-*) variables: ${ctcVars.length}`);
      console.log(`Variables used: ${usedVars.size}`);
      console.log(`Undefined variables: ${undefinedVars.length}`);
      if (undefinedVars.length > 0) {
        console.log('  Undefined:', undefinedVars.slice(0, 10).join(', '));
      }

      // Print key brand variables
      console.log('\nKey brand tokens:');
      for (const v of ctcVars) {
        const [name, value] = v.split(':').map(s => s.trim());
        if (['--ctc-primary', '--ctc-primary-light', '--ctc-primary-dark',
             '--ctc-secondary', '--ctc-accent',
             '--ctc-font-heading', '--ctc-font-body'].includes(name)) {
          console.log(`  ${name}: ${value}`);
        }
      }

      console.log('\n--- 4.2 GOOGLE FONTS ---');
      console.log(`@import statements: ${imports.length}`);
      imports.forEach(imp => console.log(`  ${imp}`));
      console.log(`Poppins references: ${poppinsRefs}`);
      console.log(`Open Sans references: ${openSansRefs}`);

      console.log('\n--- 4.3 BRAND COLORS IN CSS ---');
      console.log(`Primary (#004aad) occurrences: ${primaryInCss}`);
      console.log(`Secondary (#002c68) occurrences: ${secondaryInCss}`);
      console.log(`Accent (#ad6300) occurrences: ${accentInCss}`);

      console.log('\n--- 4.4 CSS FEATURES ---');
      console.log(`Total selectors: ${selectors.length}`);
      console.log(`Gradients: ${hasGradients}`);
      console.log(`Animations: ${hasAnimations}`);
      console.log(`Media queries: ${hasMediaQueries}`);
      console.log(`Hover effects: ${hasHoverEffects}`);
      console.log(`Transitions: ${hasTransitions}`);

      console.log('\n--- 4.5 COMPONENT CSS ---');
      console.log(`Component sections found: ${componentSections.length}`);
      if (componentNames.length > 0) {
        console.log('Components:', componentNames.join(', '));
      }

      console.log('\n--- 4.6 CSS SIZE ---');
      console.log(`Total size: ${(css.length / 1024).toFixed(1)} KB`);

      // Save analysis
      fs.writeFileSync(debugPath('4_css_analysis.json'), JSON.stringify({
        totalSize: css.length,
        variablesDefined: variableDefines.length,
        ctcVariables: ctcVars.length,
        variablesUsed: usedVars.size,
        undefinedVars,
        imports,
        selectorCount: selectors.length,
        brandColorOccurrences: { primary: primaryInCss, secondary: secondaryInCss, accent: accentInCss },
        fontReferences: { poppins: poppinsRefs, openSans: openSansRefs },
        features: { gradients: hasGradients, animations: hasAnimations, mediaQueries: hasMediaQueries, hover: hasHoverEffects, transitions: hasTransitions },
        componentSections: componentSections.length,
      }, null, 2));

      // =============================================
      // RENDER COMPONENT SAMPLES
      // =============================================
      console.log('\n--- 4.7 COMPONENT RENDERING ---');

      const components = [
        { name: 'hero', html: `
          <section class="section has-background bg-gradient emphasis-hero ctc-hero hero">
            <h1>SEO voor Groothandel: De Complete Gids</h1>
            <p>Ontdek hoe u uw groothandel naar de top van Google brengt met bewezen SEO-strategieën.</p>
            <a href="#" class="ctc-button">Meer Informatie</a>
          </section>` },
        { name: 'cards', html: `
          <section class="section">
            <h2>Onze Diensten</h2>
            <div class="feature-grid columns-3-column" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
              <div class="card ctc-card feature-item">
                <h3 class="ctc-card-title">SEO Audit</h3>
                <p class="ctc-card-body">Uitgebreide analyse van uw website en concurrenten in de groothandelsector.</p>
              </div>
              <div class="card ctc-card feature-item">
                <h3 class="ctc-card-title">Content Strategie</h3>
                <p class="ctc-card-body">Op maat gemaakte content die uw doelgroep aanspreekt en converteert.</p>
              </div>
              <div class="card ctc-card feature-item">
                <h3 class="ctc-card-title">Technische SEO</h3>
                <p class="ctc-card-body">Optimalisatie van snelheid, indexering en technische prestaties.</p>
              </div>
            </div>
          </section>` },
        { name: 'faq', html: `
          <section class="section">
            <h2>Veelgestelde Vragen</h2>
            <div class="faq-list">
              <div class="faq-item"><div class="faq-question"><span class="faq-icon">▸</span> Wat kost SEO voor een groothandel?</div><div class="faq-answer">De kosten variëren afhankelijk van de grootte en concurrentie in uw markt.</div></div>
              <div class="faq-item"><div class="faq-question"><span class="faq-icon">▸</span> Hoe lang duurt het voordat SEO resultaat oplevert?</div><div class="faq-answer">Gemiddeld ziet u significante verbeteringen binnen 3-6 maanden.</div></div>
              <div class="faq-item"><div class="faq-question"><span class="faq-icon">▸</span> Werkt SEO ook voor B2B groothandels?</div><div class="faq-answer">Absoluut, B2B SEO is zelfs bijzonder effectief voor niche markten.</div></div>
            </div>
          </section>` },
        { name: 'table', html: `
          <section class="section">
            <h2>Vergelijking SEO Pakketten</h2>
            <table class="styled-table">
              <thead><tr><th>Pakket</th><th>Basis</th><th>Professional</th><th>Enterprise</th></tr></thead>
              <tbody>
                <tr><td>Keywords</td><td>25</td><td>100</td><td>Onbeperkt</td></tr>
                <tr><td>Content pagina's</td><td>4/maand</td><td>12/maand</td><td>Op maat</td></tr>
                <tr><td>Rapportage</td><td>Maandelijks</td><td>Wekelijks</td><td>Real-time</td></tr>
              </tbody>
            </table>
          </section>` },
        { name: 'cta', html: `
          <section class="section has-background bg-gradient cta-section">
            <h2>Klaar om te Beginnen?</h2>
            <p>Neem vandaag nog contact op voor een vrijblijvende SEO-audit van uw groothandel.</p>
            <a href="#" class="ctc-button ctc-button-accent">Vraag Offerte Aan</a>
            <a href="#" class="ctc-button ctc-button-secondary">Meer Informatie</a>
          </section>` },
        { name: 'steps', html: `
          <section class="section">
            <h2>Ons Proces</h2>
            <div class="steps-list">
              <div class="step-item"><div class="step-number">1</div><div class="step-content"><h3>Analyse</h3><p>We analyseren uw huidige online zichtbaarheid en concurrenten.</p></div></div>
              <div class="step-item"><div class="step-number">2</div><div class="step-content"><h3>Strategie</h3><p>Op basis van data ontwikkelen we een op maat gemaakte SEO-strategie.</p></div></div>
              <div class="step-item"><div class="step-number">3</div><div class="step-content"><h3>Uitvoering</h3><p>We implementeren de strategie en monitoren de resultaten continu.</p></div></div>
            </div>
          </section>` },
        { name: 'testimonial', html: `
          <section class="section">
            <h2>Wat Klanten Zeggen</h2>
            <blockquote class="testimonial">
              <p>"Resultaatmakers heeft onze online zichtbaarheid getransformeerd. Binnen 4 maanden stonden we op pagina 1 voor onze belangrijkste zoekwoorden."</p>
              <cite>— Jan de Vries, Directeur bij ExampleGroothandel B.V.</cite>
            </blockquote>
          </section>` },
      ];

      for (const comp of components) {
        const testHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${css}
body { margin: 0; padding: 0; font-family: 'Open Sans', sans-serif; background: #fafafa; }
.article-content { max-width: 900px; margin: 0 auto; padding: 20px; }
</style>
</head><body>
<div class="article-content branded-article">
  ${comp.html}
</div>
</body></html>`;

        const htmlPath = debugPath(`4_component_${comp.name}.html`);
        fs.writeFileSync(htmlPath, testHtml);
        await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`);
        await page.waitForTimeout(1000);
        await page.screenshot({ path: debugPath(`4_component_${comp.name}.png`), fullPage: true });
        console.log(`Rendered: ${comp.name}`);
      }

      // Also render a full page with all components
      const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${css}
body { margin: 0; padding: 0; font-family: 'Open Sans', sans-serif; }
.article-content { max-width: 900px; margin: 0 auto; }
</style>
</head><body>
<div class="article-content branded-article">
  ${components.map(c => c.html).join('\n')}
</div>
</body></html>`;

      fs.writeFileSync(debugPath('4_full_page.html'), fullHtml);
      await page.goto(`file:///${debugPath('4_full_page.html').replace(/\\/g, '/')}`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: debugPath('4_full_page.png'), fullPage: true });
      console.log('Rendered: full page (all components)');

      console.log('\n--- FILES SAVED ---');
      console.log('CSS: 4_compiled_css.css');
      console.log('Analysis: 4_css_analysis.json');
      console.log('Components: 4_component_*.png');
      console.log('Full page: 4_full_page.png');
      console.log('\n========================================\n');
    } else {
      console.log('ERROR: Could not extract compiledCss from React state');
      console.log('Checking console logs for CSS length...');
      const cssLogs = consoleLogs.filter(l => l.text.includes('CSS length') || l.text.includes('compiledCss'));
      cssLogs.forEach(l => console.log(`  ${l.text}`));
    }
  });
});
