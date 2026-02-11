// e2e/nfir-regenerate-test.spec.ts
/**
 * NFIR REGENERATE TEST - Forces regeneration with new CSS
 */

import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-regenerate';
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'richard@kjenmarks.nl';
const TEST_PASSWORD = 'pannekoek';

function ensureDir(dir: string) {
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

async function ss(page: Page, name: string, full = true) {
  const dir = ensureDir(SCREENSHOT_DIR);
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full });
  console.log(`📸 ${name}`);
}

test.describe('NFIR Regenerate Test', () => {
  test.setTimeout(600000);

  test('regenerate with new CSS', async ({ page }) => {
    console.log('\n🎯 NFIR REGENERATE TEST\n');

    // Capture ALL browser console logs for debugging rendering path
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      // Only print rendering-related logs to stdout
      if (text.includes('[STYLING PIPELINE]') || text.includes('Unified renderer') ||
          text.includes('ROUTING TO') || text.includes('CleanArticleRenderer') ||
          text.includes('BlueprintRenderer') || text.includes('effectiveDesignDna') ||
          text.includes('FALLBACK') || text.includes('renderContent') ||
          text.includes('Style & Publish') || text.includes('generatePreview') ||
          text.includes('renderBlueprint') || text.includes('designDna') ||
          text.includes('failed') || text.includes('error') || text.includes('Error')) {
        console.log(`🔍 BROWSER: ${text}`);
      }
    });
    page.on('pageerror', (err) => {
      consoleLogs.push(`[PAGE ERROR] ${err.message}`);
      console.log(`❌ PAGE ERROR: ${err.message}`);
    });

    // LOGIN
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });
    console.log('✅ Logged in');

    // Navigate to Style & Publish
    await page.locator('tr', { hasText: 'nfir' }).first().locator('button:has-text("Open")').click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Load Map")').first().click();
    await page.waitForTimeout(3000);
    await page.locator('tr', { hasText: /cyber.*kwetsbaar/i }).first().click();
    await page.waitForTimeout(1500);
    await page.locator('button:has-text("View Brief")').first().click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("View Draft"), button:has-text("View Generated Draft")').first().click();
    await page.waitForTimeout(3000);
    await page.locator('button:has-text("Publish")').last().click();
    await page.waitForTimeout(1000);
    await page.locator('text=Style & Publish').first().click();
    await page.waitForTimeout(3000);
    console.log('✅ Style & Publish modal');

    // Navigate to Preview step
    for (let i = 0; i < 2; i++) {
      const nextBtn = page.locator('button:has-text("Next")').last();
      await nextBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }
    console.log('✅ At Preview step');

    // Click REGENERATE to force new content generation
    console.log('\n🔄 Clicking Regenerate...');
    const regenerateBtn = page.locator('button:has-text("Regenerate")').first();
    if (await regenerateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await regenerateBtn.click({ force: true });
      console.log('⏳ Waiting for regeneration (up to 2 minutes)...');
      await page.waitForTimeout(60000); // Wait for generation
      await ss(page, '01_after_regenerate');
    } else {
      // Try Generate
      const generateBtn = page.locator('button:has-text("Generate")').first();
      if (await generateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await generateBtn.click({ force: true });
        console.log('⏳ Waiting for generation...');
        await page.waitForTimeout(60000);
        await ss(page, '01_after_generate');
      }
    }

    // Download the HTML
    console.log('\n📥 Downloading HTML...');
    const downloadBtn = page.locator('button:has-text("Download HTML")').first();
    if (await downloadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
        downloadBtn.click({ force: true })
      ]);

      if (download) {
        const downloadPath = path.join(ensureDir(SCREENSHOT_DIR), 'regenerated_output.html');
        await download.saveAs(downloadPath);
        console.log('💾 Downloaded: regenerated_output.html');

        // Check for ComponentStyles CSS
        const html = fs.readFileSync(downloadPath, 'utf-8');
        console.log(`\n📄 HTML size: ${html.length} characters`);

        // Check for ComponentStyles markers
        const hasComponentStyles = html.includes('.card {') || html.includes('.card{');
        const hasFeatureGrid = html.includes('.feature-grid');
        const hasSectionHero = html.includes('.section-hero');

        console.log('\n🔍 CSS VALIDATION:');
        console.log(`  Component .card CSS: ${hasComponentStyles ? '✅' : '❌'}`);
        console.log(`  Component .feature-grid CSS: ${hasFeatureGrid ? '✅' : '❌'}`);
        console.log(`  Component .section-hero CSS: ${hasSectionHero ? '✅' : '❌'}`);

        // HTML STRUCTURE VALIDATION - verify CleanArticleRenderer output
        const hasCtcClasses = html.includes('ctc-section') || html.includes('ctc-card');
        const hasCleanArticleClasses = html.includes('class="card"') || html.includes('class="section-hero"') ||
          html.includes('class="feature-grid"') || html.includes('class="timeline"') ||
          html.includes('class="key-takeaways"') || html.includes('class="section ');
        const hasComponentDivs = (html.match(/class="card/g) || []).length;
        const hasCtcDivs = (html.match(/class="ctc-/g) || []).length;

        console.log('\n🔍 HTML STRUCTURE VALIDATION:');
        console.log(`  Legacy ctc-* classes: ${hasCtcClasses ? '❌ STILL PRESENT (BlueprintRenderer used)' : '✅ NOT PRESENT'}`);
        console.log(`  Component classes (card, section-hero, etc.): ${hasCleanArticleClasses ? '✅ PRESENT (CleanArticleRenderer used)' : '❌ MISSING'}`);
        console.log(`  Component class count: ${hasComponentDivs}`);
        console.log(`  Legacy ctc- class count: ${hasCtcDivs}`);

        // Check rendering path
        const rendererUsed = html.includes('clean-article') ? 'CleanArticleRenderer' :
          html.includes('ctc-section') ? 'BlueprintRenderer' : 'Unknown';
        console.log(`\n📊 RENDERER USED: ${rendererUsed}`);
        console.log(`📊 DESIGN QUALITY: ${hasCleanArticleClasses && !hasCtcClasses ? '✅ HIGH (component-based)' : '❌ LOW (legacy template)'}`);
      }
    }

    // Final screenshots
    await ss(page, '02_final_full', true);
    await ss(page, '03_final_viewport', false);

    // Dump captured browser console logs
    console.log(`\n📋 TOTAL CONSOLE LOGS CAPTURED: ${consoleLogs.length}`);

    // Show rendering-relevant logs
    const renderLogs = consoleLogs.filter(l =>
      l.includes('Style & Publish') || l.includes('STYLING PIPELINE') ||
      l.includes('Unified') || l.includes('Blueprint') || l.includes('render') ||
      l.includes('error') || l.includes('Error') || l.includes('failed') ||
      l.includes('designDna') || l.includes('CleanArticle') || l.includes('PAGE ERROR')
    );
    console.log(`📋 RENDERING-RELATED LOGS: ${renderLogs.length}`);
    renderLogs.forEach(log => console.log(`  ${log}`));

    // Save ALL console logs to file
    const logsPath = path.join(ensureDir(SCREENSHOT_DIR), 'console_logs.txt');
    fs.writeFileSync(logsPath, consoleLogs.join('\n'));
    console.log(`\n💾 All ${consoleLogs.length} console logs saved: ${logsPath}`);

    console.log('\n✅ TEST COMPLETE');
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}\n`);
  });
});
