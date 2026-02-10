// Checkpoint 3: DesignDNA Inspection
// Captures and validates the AI-extracted DesignDNA data:
// - Colors (primary, secondary, accent, neutrals)
// - Typography (heading font, body font, scale)
// - Personality (overall, formality, energy, warmth)
// - Component preferences
// - Confidence scores
// Also captures the CSS generation output for Phase 4 inspection.
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

test.describe('Checkpoint 3 - DesignDNA Inspection', () => {
  test.setTimeout(600000);

  test('capture DesignDNA data from brand extraction', async ({ page }) => {
    ensureDir(DEBUG_DIR);
    await page.setViewportSize({ width: 1280, height: 900 });

    const consoleLogs: { type: string; text: string; ts: number }[] = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text(), ts: Date.now() });
    });

    await navigateToStylePublish(page);

    // Check if brand data is already loaded or we need extraction
    const alreadyHasBrandSummary = await page.locator('text=Brand Summary').first().isVisible({ timeout: 5000 }).catch(() => false);

    if (!alreadyHasBrandSummary) {
      console.log('No saved brand data - running full extraction...');

      const domainInput = page.locator('input[placeholder*="Enter domain"], input[placeholder*="example.com"]').first();
      await domainInput.fill(BRAND_DOMAIN);
      await page.locator('button:has-text("Discover URLs")').first().click();

      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(5000);
        if (await page.locator('input[type="checkbox"]').count() > 0) {
          console.log(`URLs discovered at ${(i + 1) * 5}s`);
          break;
        }
      }
      await page.waitForTimeout(1000);

      await page.locator('button:has-text("Extract Brand")').first().click();
      console.log('Clicked Extract Brand');

      // Wait for brand summary (our immediate notification fix)
      for (let i = 0; i < 120; i++) {
        await page.waitForTimeout(5000);
        if (await page.locator('text=Brand Summary').first().isVisible().catch(() => false)) {
          console.log(`Brand summary appeared at ${(i + 1) * 5}s`);
          break;
        }
      }
      await page.waitForTimeout(3000);
    } else {
      console.log('Brand data already loaded from database');
    }

    // Wait extra time for CSS generation to complete (background process)
    console.log('Waiting for CSS generation to complete...');
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(5000);
      const cssComplete = consoleLogs.some(l =>
        l.text.includes('Generated design system, CSS length:') ||
        l.text.includes('Full Extraction flow complete')
      );
      const cssSpinnerGone = !(await page.locator('text=Generating brand-matched CSS').first().isVisible().catch(() => false));

      if (cssComplete || (cssSpinnerGone && alreadyHasBrandSummary)) {
        console.log(`CSS generation complete at ${(i + 1) * 5}s`);
        break;
      }
      if (i % 6 === 0) {
        console.log(`Still waiting for CSS... (${(i + 1) * 5}s)`);
      }
    }
    await page.waitForTimeout(2000);

    // =============================================
    // EXTRACT DESIGN DNA FROM THE DOM
    // =============================================
    console.log('\n=== EXTRACTING DESIGN DNA DATA ===\n');

    // 1. Extract color palette from the UI
    const colorData = await page.evaluate(() => {
      const colors: { label: string; hex: string; bgColor: string }[] = [];
      // Color swatches in the Brand Summary section
      const swatches = document.querySelectorAll('[class*="rounded-full"], [class*="color-swatch"]');
      swatches.forEach(s => {
        const style = window.getComputedStyle(s);
        const bg = style.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && s.clientWidth >= 16 && s.clientWidth <= 40) {
          // Try to find label nearby
          const parent = s.parentElement;
          const label = parent?.textContent?.trim() || '';
          colors.push({ label, hex: '', bgColor: bg });
        }
      });
      return colors;
    });

    // 2. Extract font information from the UI
    const fontData = await page.evaluate(() => {
      const fonts: { type: string; text: string }[] = [];
      const allText = document.body.innerText;

      // Look for heading font line
      const headingMatch = allText.match(/Heading Font[:\s]*([^\n]+)/i);
      if (headingMatch) fonts.push({ type: 'heading', text: headingMatch[1].trim() });

      // Look for body font line
      const bodyMatch = allText.match(/Body Font[:\s]*([^\n]+)/i);
      if (bodyMatch) fonts.push({ type: 'body', text: bodyMatch[1].trim() });

      return fonts;
    });

    // 3. Extract personality data from the UI
    const personalityData = await page.evaluate(() => {
      const sliders: { label: string; value: number }[] = [];
      // Find range inputs (personality sliders)
      const ranges = document.querySelectorAll('input[type="range"]');
      ranges.forEach(r => {
        const input = r as HTMLInputElement;
        const label = r.closest('div')?.querySelector('label, span, p')?.textContent?.trim() || '';
        sliders.push({ label, value: parseFloat(input.value) });
      });
      return sliders;
    });

    // 4. Extract confidence scores from the UI
    const confidenceData = await page.evaluate(() => {
      const scores: { label: string; width: string }[] = [];
      // Look for confidence bars (progress bars)
      const bars = document.querySelectorAll('[class*="bg-"][class*="rounded"]');
      bars.forEach(b => {
        const el = b as HTMLElement;
        const style = el.style.width;
        if (style && style.includes('%')) {
          const label = el.closest('div')?.parentElement?.querySelector('span, label')?.textContent?.trim() || '';
          scores.push({ label, width: style });
        }
      });
      return scores;
    });

    // 5. Extract the full DesignDNA from React state via window.__DESIGN_DNA__ or console logs
    // Parse console logs for DesignDNA data
    const colorLookupLogs = consoleLogs.filter(l => l.text.includes('Color lookup results'));
    const fontLogs = consoleLogs.filter(l =>
      l.text.includes('heading font:') || l.text.includes('body font:')
    );
    const componentLogs = consoleLogs.filter(l =>
      l.text.includes('components:') || l.text.includes('Component')
    );
    const cssLengthLogs = consoleLogs.filter(l =>
      l.text.includes('CSS length:') || l.text.includes('compiledCss')
    );
    const designSystemLogs = consoleLogs.filter(l =>
      l.text.includes('[BrandDesignSystemGenerator]')
    );
    const brandStorageLogs = consoleLogs.filter(l =>
      l.text.includes('[BrandDesignStorage]')
    );

    // 6. Extract actual DesignDNA object from the page using React devtools bridge
    const designDnaFromPage = await page.evaluate(() => {
      // Search through React fiber tree for DesignDNA data
      function findReactState(root: Element): Record<string, unknown> | null {
        const fiberKey = Object.keys(root).find(k => k.startsWith('__reactFiber$'));
        if (!fiberKey) return null;

        const fiber = (root as unknown as Record<string, unknown>)[fiberKey] as Record<string, unknown>;
        let current: Record<string, unknown> | null = fiber;
        const visited = new Set<Record<string, unknown>>();

        while (current && !visited.has(current)) {
          visited.add(current);
          const memoizedState = current.memoizedState as Record<string, unknown> | null;
          if (memoizedState) {
            // Walk the hooks chain
            let hook = memoizedState;
            const hookVisited = new Set();
            while (hook && !hookVisited.has(hook)) {
              hookVisited.add(hook);
              const queue = hook.queue as Record<string, unknown> | null;
              if (queue) {
                const lastState = queue.lastRenderedState as Record<string, unknown> | null;
                if (lastState && typeof lastState === 'object') {
                  // Check for DesignDNA-shaped objects
                  if ('colors' in lastState && 'typography' in lastState && 'personality' in lastState) {
                    return lastState;
                  }
                  if ('designDna' in lastState && lastState.designDna) {
                    return lastState.designDna as Record<string, unknown>;
                  }
                }
              }
              hook = hook.next as Record<string, unknown>;
            }
          }
          // Try going up the fiber tree
          current = current.return as Record<string, unknown> | null;
        }
        return null;
      }

      // Try from the modal container
      const modals = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="Modal"]');
      for (const modal of modals) {
        const result = findReactState(modal);
        if (result) return result;
      }

      // Fallback: try from root
      const root = document.getElementById('root');
      if (root) return findReactState(root);

      return null;
    });

    // 7. Extract brand screenshot if visible
    const screenshotSrc = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src^="data:image"]');
      for (const img of imgs) {
        const el = img as HTMLImageElement;
        if (el.src.length > 1000) return el.src; // Brand screenshots are large
      }
      return null;
    });

    if (screenshotSrc) {
      const base64 = screenshotSrc.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(debugPath('3_brand_screenshot.png'), Buffer.from(base64, 'base64'));
      console.log('Saved brand screenshot (from DOM)');
    }

    // 8. Take screenshots of the brand summary at various scroll positions
    const scrollables = page.locator('.overflow-y-auto');
    const scrollCount = await scrollables.count();

    // Screenshot: Brand Summary (top)
    for (let i = 0; i < scrollCount; i++) {
      const el = scrollables.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.evaluate(el => el.scrollTop = 0);
      }
    }
    await page.waitForTimeout(300);
    await page.screenshot({
      path: debugPath('3_01_brand_summary_top.png'),
      clip: { x: 120, y: 50, width: 950, height: 800 }
    });

    // Screenshot: Colors section
    for (let i = 0; i < scrollCount; i++) {
      const el = scrollables.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.evaluate(el => el.scrollTop = el.scrollHeight * 0.2);
      }
    }
    await page.waitForTimeout(300);
    await page.screenshot({
      path: debugPath('3_02_colors_section.png'),
      clip: { x: 120, y: 50, width: 950, height: 800 }
    });

    // Screenshot: Personality section
    for (let i = 0; i < scrollCount; i++) {
      const el = scrollables.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.evaluate(el => el.scrollTop = el.scrollHeight * 0.4);
      }
    }
    await page.waitForTimeout(300);
    await page.screenshot({
      path: debugPath('3_03_personality_section.png'),
      clip: { x: 120, y: 50, width: 950, height: 800 }
    });

    // Screenshot: Component preferences
    for (let i = 0; i < scrollCount; i++) {
      const el = scrollables.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.evaluate(el => el.scrollTop = el.scrollHeight * 0.6);
      }
    }
    await page.waitForTimeout(300);
    await page.screenshot({
      path: debugPath('3_04_component_prefs.png'),
      clip: { x: 120, y: 50, width: 950, height: 800 }
    });

    // Screenshot: Confidence section
    for (let i = 0; i < scrollCount; i++) {
      const el = scrollables.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.evaluate(el => el.scrollTop = el.scrollHeight * 0.7);
      }
    }
    await page.waitForTimeout(300);
    await page.screenshot({
      path: debugPath('3_05_confidence_section.png'),
      clip: { x: 120, y: 50, width: 950, height: 800 }
    });

    // Now click "Raw Design DNA" accordion to expand it and capture the full data
    const rawDnaAccordion = page.locator('text=Raw Design DNA').first();
    if (await rawDnaAccordion.isVisible().catch(() => false)) {
      await rawDnaAccordion.click();
      await page.waitForTimeout(500);
    }

    // Scroll to where it expanded
    for (let i = 0; i < scrollCount; i++) {
      const el = scrollables.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.evaluate(el => el.scrollTop = el.scrollHeight * 0.8);
      }
    }
    await page.waitForTimeout(300);
    await page.screenshot({
      path: debugPath('3_06_raw_dna_expanded.png'),
      clip: { x: 120, y: 50, width: 950, height: 800 }
    });

    // Try to extract the raw DNA JSON from the expanded accordion
    const rawDnaText = await page.evaluate(() => {
      // Look for pre/code elements or json-formatted text
      const preElements = document.querySelectorAll('pre, code, [class*="json"]');
      for (const el of preElements) {
        const text = el.textContent?.trim() || '';
        if (text.length > 100 && (text.startsWith('{') || text.includes('"colors"'))) {
          return text;
        }
      }
      // Also try to find it in any collapsed accordion content
      const details = document.querySelectorAll('details');
      for (const detail of details) {
        const text = detail.textContent?.trim() || '';
        if (text.includes('"colors"') || text.includes('"typography"')) {
          return text;
        }
      }
      return null;
    });

    // =============================================
    // COMPILE AND SAVE ALL DATA
    // =============================================
    const phase3Data = {
      // From DOM
      colorSwatches: colorData,
      fonts: fontData,
      personalitySliders: personalityData,
      confidenceBars: confidenceData,
      rawDnaText: rawDnaText ? rawDnaText.substring(0, 5000) : null,

      // From React state
      designDna: designDnaFromPage,

      // From console logs
      console: {
        colorLookup: colorLookupLogs.map(l => l.text),
        fonts: fontLogs.map(l => l.text),
        components: componentLogs.map(l => l.text),
        cssLength: cssLengthLogs.map(l => l.text),
        designSystemGenerator: designSystemLogs.map(l => l.text),
        brandStorage: brandStorageLogs.map(l => l.text),
      },

      // Error summary
      errors: consoleLogs.filter(l => l.type === 'error').map(l => l.text),
      rlsErrors: consoleLogs.filter(l => l.text.includes('row-level security')).map(l => l.text),
    };

    fs.writeFileSync(
      debugPath('3_design_dna_data.json'),
      JSON.stringify(phase3Data, null, 2)
    );

    // Save full console logs
    fs.writeFileSync(
      debugPath('3_all_console_logs.json'),
      JSON.stringify(consoleLogs.filter(l =>
        l.text.includes('[Brand') ||
        l.text.includes('[useBrand') ||
        l.text.includes('[AIDesign') ||
        l.text.includes('[BrandDesign') ||
        l.text.includes('[BrandIntelligence') ||
        l.text.includes('[Style') ||
        l.text.includes('DesignDNA') ||
        l.text.includes('design_dna') ||
        l.text.includes('compiledCss') ||
        l.type === 'error'
      ), null, 2)
    );

    // =============================================
    // PRINT SUMMARY
    // =============================================
    console.log('\n========================================');
    console.log('  PHASE 3: DESIGN DNA INSPECTION RESULTS');
    console.log('========================================\n');

    // Colors
    console.log('--- 3.1 COLORS ---');
    if (designDnaFromPage && typeof designDnaFromPage === 'object' && 'colors' in designDnaFromPage) {
      const colors = designDnaFromPage.colors as Record<string, unknown>;
      const primary = colors.primary as Record<string, unknown>;
      const secondary = colors.secondary as Record<string, unknown>;
      const accent = colors.accent as Record<string, unknown>;
      const primaryLight = colors.primaryLight as Record<string, unknown>;
      const primaryDark = colors.primaryDark as Record<string, unknown>;
      console.log(`Primary:      ${primary?.hex || 'N/A'} (confidence: ${primary?.confidence || 'N/A'})`);
      console.log(`PrimaryLight: ${primaryLight?.hex || 'N/A'} (confidence: ${primaryLight?.confidence || 'N/A'})`);
      console.log(`PrimaryDark:  ${primaryDark?.hex || 'N/A'} (confidence: ${primaryDark?.confidence || 'N/A'})`);
      console.log(`Secondary:    ${secondary?.hex || 'N/A'} (confidence: ${secondary?.confidence || 'N/A'})`);
      console.log(`Accent:       ${accent?.hex || 'N/A'} (confidence: ${accent?.confidence || 'N/A'})`);
      const neutrals = colors.neutrals as Record<string, string>;
      if (neutrals) {
        console.log(`Neutrals:     darkest=${neutrals.darkest} dark=${neutrals.dark} medium=${neutrals.medium} light=${neutrals.light} lightest=${neutrals.lightest}`);
      }
      console.log(`Harmony:      ${colors.harmony || 'N/A'}`);
      console.log(`Mood:         ${colors.dominantMood || 'N/A'}`);
      console.log(`Contrast:     ${colors.contrastLevel || 'N/A'}`);
    } else {
      console.log('Could not extract DesignDNA colors from React state');
      console.log('Console color logs:', colorLookupLogs.length > 0 ? colorLookupLogs[0].text : 'none');
    }

    // Typography
    console.log('\n--- 3.2 TYPOGRAPHY ---');
    if (designDnaFromPage && typeof designDnaFromPage === 'object' && 'typography' in designDnaFromPage) {
      const typo = designDnaFromPage.typography as Record<string, unknown>;
      const heading = typo.headingFont as Record<string, unknown>;
      const body = typo.bodyFont as Record<string, unknown>;
      console.log(`Heading: ${heading?.family || 'N/A'} (${heading?.weight || 'N/A'}, ${heading?.style || 'N/A'}, ${heading?.character || 'N/A'})`);
      console.log(`Body:    ${body?.family || 'N/A'} (${body?.weight || 'N/A'}, ${body?.style || 'N/A'}, lh=${body?.lineHeight || 'N/A'})`);
      console.log(`Scale:   ${typo.scaleRatio || 'N/A'} (base: ${typo.baseSize || 'N/A'})`);
      console.log(`Case:    ${typo.headingCase || 'N/A'}`);
      console.log(`Link:    ${typo.linkStyle || 'N/A'}`);
    } else {
      console.log('Font info from DOM:', JSON.stringify(fontData));
      console.log('Font console logs:', fontLogs.map(l => l.text));
    }

    // Personality
    console.log('\n--- 3.3 PERSONALITY ---');
    if (designDnaFromPage && typeof designDnaFromPage === 'object' && 'personality' in designDnaFromPage) {
      const p = designDnaFromPage.personality as Record<string, unknown>;
      console.log(`Overall:    ${p.overall || 'N/A'}`);
      console.log(`Formality:  ${p.formality || 'N/A'}/5`);
      console.log(`Energy:     ${p.energy || 'N/A'}/5`);
      console.log(`Warmth:     ${p.warmth || 'N/A'}/5`);
      console.log(`Trust:      ${p.trustSignals || 'N/A'}`);
    } else {
      console.log('Personality sliders from DOM:', JSON.stringify(personalityData));
    }

    // Component Preferences
    console.log('\n--- 3.4 COMPONENT PREFERENCES ---');
    if (designDnaFromPage && typeof designDnaFromPage === 'object' && 'componentPreferences' in designDnaFromPage) {
      const cp = designDnaFromPage.componentPreferences as Record<string, unknown>;
      console.log(`List style:        ${cp.preferredListStyle || 'N/A'}`);
      console.log(`Card style:        ${cp.preferredCardStyle || 'N/A'}`);
      console.log(`Testimonial style: ${cp.testimonialStyle || 'N/A'}`);
      console.log(`FAQ style:         ${cp.faqStyle || 'N/A'}`);
      console.log(`CTA style:         ${cp.ctaStyle || 'N/A'}`);
    }

    // Confidence
    console.log('\n--- 3.5 CONFIDENCE ---');
    if (designDnaFromPage && typeof designDnaFromPage === 'object' && 'confidence' in designDnaFromPage) {
      const c = designDnaFromPage.confidence as Record<string, unknown>;
      console.log(`Overall:    ${c.overall || 'N/A'}%`);
      console.log(`Colors:     ${c.colorsConfidence || 'N/A'}%`);
      console.log(`Typography: ${c.typographyConfidence || 'N/A'}%`);
      console.log(`Layout:     ${c.layoutConfidence || 'N/A'}%`);
    } else {
      console.log('Confidence bars from DOM:', JSON.stringify(confidenceData));
    }

    // CSS Generation Status
    console.log('\n--- CSS GENERATION ---');
    const cssLenMatch = cssLengthLogs.find(l => l.text.match(/CSS length:\s*(\d+)/));
    if (cssLenMatch) {
      const match = cssLenMatch.text.match(/CSS length:\s*(\d+)/);
      console.log(`Compiled CSS length: ${match?.[1] || 'unknown'} chars`);
    }
    console.log(`Design system generator logs: ${designSystemLogs.length}`);
    console.log(`Brand storage logs: ${brandStorageLogs.length}`);

    // Errors
    console.log('\n--- ERRORS ---');
    console.log(`Total errors: ${phase3Data.errors.length}`);
    console.log(`RLS errors: ${phase3Data.rlsErrors.length}`);
    if (phase3Data.errors.length > 0) {
      console.log('Error samples:');
      phase3Data.errors.slice(0, 5).forEach(e => console.log(`  - ${e.substring(0, 200)}`));
    }

    console.log('\n--- FILES SAVED ---');
    console.log(`Screenshots: 3_01 through 3_06 in tmp/debug/`);
    console.log(`Data: 3_design_dna_data.json`);
    console.log(`Logs: 3_all_console_logs.json`);
    if (screenshotSrc) console.log(`Brand screenshot: 3_brand_screenshot.png`);
    console.log('\n========================================\n');
  });
});
