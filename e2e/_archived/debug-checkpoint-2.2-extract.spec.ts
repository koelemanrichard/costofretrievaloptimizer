// Checkpoint 2.2: Run full brand extraction, wait for real completion
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
async function ss(page: Page, name: string) {
  ensureDir(DEBUG_DIR);
  await page.screenshot({ path: debugPath(`${name}.png`), fullPage: false });
  console.log(`Screenshot: ${name}.png`);
}
async function modalSs(page: Page, name: string) {
  ensureDir(DEBUG_DIR);
  await page.screenshot({
    path: debugPath(`${name}.png`),
    clip: { x: 120, y: 50, width: 950, height: 800 }
  });
  console.log(`Modal screenshot: ${name}.png`);
}

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
  await page.waitForTimeout(2000);
}

test.describe('Checkpoint 2.2', () => {
  test.setTimeout(600000);

  test('extract brand and capture pipeline data', async ({ page }) => {
    ensureDir(DEBUG_DIR);
    await page.setViewportSize({ width: 1280, height: 900 });

    const consoleLogs: { type: string; text: string; ts: number }[] = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text(), ts: Date.now() });
    });

    await navigateToStylePublish(page);
    await modalSs(page, '2_2_00_initial');

    // Discover URLs
    const domainInput = page.locator('input[placeholder*="Enter domain"]').first();
    await domainInput.fill(BRAND_DOMAIN);
    await page.locator('button:has-text("Discover URLs")').first().click();
    console.log('Clicked Discover URLs');

    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(5000);
      if (await page.locator('input[type="checkbox"]').count() > 0) break;
    }
    await page.waitForTimeout(1000);
    await modalSs(page, '2_2_01_urls_discovered');

    // Verify what was discovered
    const extractBtnText = await page.locator('button:has-text("Extract Brand")').first().textContent().catch(() => 'not found');
    console.log(`Extract button text: "${extractBtnText}"`);

    // Click Extract Brand
    const extractBtn = page.locator('button:has-text("Extract Brand")').first();
    await extractBtn.waitFor({ state: 'visible', timeout: 5000 });
    await extractBtn.click();
    console.log('Clicked Extract Brand');
    await page.waitForTimeout(3000);
    await modalSs(page, '2_2_02_extracting_start');

    // Wait for extraction to complete - use simple text presence polling
    console.log('Waiting for extraction to complete...');
    const startTime = Date.now();
    let lastLog = '';

    for (let i = 0; i < 120; i++) { // Max 10 min
      await page.waitForTimeout(5000);
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      // Check for visible phase indicators using .first() to avoid strict mode issues
      const capturingVisible = await page.locator('text=Capturing Pages').first().isVisible().catch(() => false);
      const analyzingVisible = await page.locator('text=Analyzing Components').first().isVisible().catch(() => false);
      const completeVisible = await page.locator('text=Extraction Complete').first().isVisible().catch(() => false);
      const noComponentsVisible = await page.locator('text=No components extracted').first().isVisible().catch(() => false);
      const componentPreviewVisible = await page.locator('text=Literal Extraction Mode').first().isVisible().catch(() => false);

      const status = `[${elapsed}s] capturing=${capturingVisible} analyzing=${analyzingVisible} complete=${completeVisible} noComponents=${noComponentsVisible} hasPreview=${componentPreviewVisible}`;

      if (status !== lastLog) {
        console.log(status);
        lastLog = status;
        await modalSs(page, `2_2_progress_${elapsed}s`);
      }

      // Done when complete is visible
      if (completeVisible) {
        console.log(`Extraction complete at ${elapsed}s`);
        // Wait a moment for components to render
        await page.waitForTimeout(3000);
        break;
      }

      // Periodic screenshot
      if (i > 0 && i % 12 === 0) {
        await modalSs(page, `2_2_periodic_${elapsed}s`);
      }
    }

    // Final screenshots
    await modalSs(page, '2_2_final_result');
    await ss(page, '2_2_final_full');

    // Scroll to see everything
    const scrollables = page.locator('.overflow-y-auto');
    const scrollCount = await scrollables.count();
    for (let i = 0; i < scrollCount; i++) {
      await scrollables.nth(i).evaluate(el => el.scrollTop = el.scrollHeight);
    }
    await page.waitForTimeout(500);
    await modalSs(page, '2_2_final_scrolled');

    // Check for components
    const hasComponents = await page.locator('text=Literal Extraction Mode').first().isVisible().catch(() => false);
    const noComponents = await page.locator('text=No components extracted').first().isVisible().catch(() => false);
    console.log(`Has component preview: ${hasComponents}, No components: ${noComponents}`);

    // Save brand screenshot if available
    const brandScreenshot = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src^="data:image"]');
      for (const img of imgs) {
        const src = (img as HTMLImageElement).src;
        if (src.length > 10000) return src;
      }
      return null;
    });
    if (brandScreenshot) {
      const base64 = brandScreenshot.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(debugPath('2_2_brand_screenshot.png'), Buffer.from(base64, 'base64'));
      console.log('Saved brand screenshot');
    }

    // Save all logs
    fs.writeFileSync(debugPath('2_2_all_logs.json'), JSON.stringify(consoleLogs, null, 2));

    // Detailed stage extraction from logs
    const stages = {
      extraction: consoleLogs.filter(l => l.text.includes('[useBrandExtraction')),
      brandStorage: consoleLogs.filter(l => l.text.includes('[BrandDesignStorage')),
      aiAnalysis: consoleLogs.filter(l => l.text.includes('AI analysis') || l.text.includes('[ExtractionAnalyzer')),
      components: consoleLogs.filter(l => l.text.includes('component') || l.text.includes('Component')),
      designDna: consoleLogs.filter(l => l.text.includes('DesignDNA') || l.text.includes('[AIDesign')),
      cssGen: consoleLogs.filter(l => l.text.includes('[BrandDesignSystem') || l.text.includes('compiledCss') || l.text.includes('compileCSS')),
      tokens: consoleLogs.filter(l => l.text.includes('token') || l.text.includes('Token')),
      fallback: consoleLogs.filter(l => l.text.includes('fallback') || l.text.includes('Fallback')),
      errors: consoleLogs.filter(l => l.type === 'error'),
      warnings: consoleLogs.filter(l => l.type === 'warning' && !l.text.includes('tailwindcss') && !l.text.includes('React DevTools')),
    };

    fs.writeFileSync(debugPath('2_2_stages.json'), JSON.stringify(stages, null, 2));

    console.log('\n=== CHECKPOINT 2.2 SUMMARY ===');
    console.log(`Total logs: ${consoleLogs.length}`);
    for (const [name, logs] of Object.entries(stages)) {
      if (logs.length > 0) {
        console.log(`\n--- ${name} (${logs.length} logs) ---`);
        for (const l of logs.slice(0, 10)) {
          console.log(`  [${l.type}] ${l.text.substring(0, 200)}`);
        }
        if (logs.length > 10) console.log(`  ... and ${logs.length - 10} more`);
      }
    }
  });
});
