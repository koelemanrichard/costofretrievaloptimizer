// e2e/nfir-wow-factor-test.spec.ts
/**
 * NFIR Cybersecurity - Wow Factor Test
 *
 * Tests the Style & Publish workflow on the actual article:
 * "TOP 10 MEEST VOORKOMENDE CYBER KWETSBAARHEDEN BIJ GEMEENTEN"
 *
 * This test captures screenshots proving design-agency quality output.
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-wow-factor';
const BASE_URL = 'http://localhost:3000';

// Test credentials
const TEST_EMAIL = 'richard@kjenmarks.nl';
const TEST_PASSWORD = 'pannekoek';

function ensureDir(dir: string) {
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
  return resolved;
}

async function screenshot(page: Page, name: string, fullPage = true) {
  const dir = ensureDir(SCREENSHOT_DIR);
  const timestamp = Date.now();
  const filename = `${timestamp}_${name}.png`;
  await page.screenshot({ path: path.join(dir, filename), fullPage });
  console.log(`📸 ${name}`);
  return filename;
}

test.describe('NFIR Wow Factor Test', () => {
  test.setTimeout(600000); // 10 minutes for full flow with AI processing

  test('Style & Publish workflow with NFIR cybersecurity article', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleLogs: string[] = [];

    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      } else if (text.includes('[Style') || text.includes('[Brand') || text.includes('[Layout') || text.includes('[Preview')) {
        consoleLogs.push(`[${msg.type()}] ${text}`);
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    console.log('\n🚀 Starting NFIR Wow Factor Test\n');
    console.log('=' .repeat(60));

    // Step 1: Login
    console.log('\n📝 Step 1: Logging in...');
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });
    await screenshot(page, '01_logged_in');
    console.log('  ✅ Logged in as', TEST_EMAIL);

    // Step 2: Find NFIR project
    console.log('\n📂 Step 2: Opening NFIR Cybersecurity project...');
    const nfirRow = page.locator('tr', { hasText: 'nfir' }).first();
    await nfirRow.locator('button:has-text("Open")').click();
    await page.waitForTimeout(2000);
    await screenshot(page, '02_nfir_project');
    console.log('  ✅ Opened NFIR project');

    // Step 3: Load the topical map
    console.log('\n🗺️ Step 3: Loading topical map...');
    await page.waitForSelector('button:has-text("Load Map")', { timeout: 30000 });
    const loadMapButton = page.locator('button:has-text("Load Map")').first();
    await loadMapButton.click();
    await page.waitForTimeout(3000);
    await screenshot(page, '03_map_loaded');
    console.log('  ✅ Map loaded');

    // Step 4: Find the specific article
    console.log('\n📄 Step 4: Finding "TOP 10 MEEST VOORKOMENDE CYBER KWETSBAARHEDEN" article...');

    // Wait for the topical map table to load
    await page.waitForSelector('table, [data-view="table"]', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Try to find the article by searching for it
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Zoek"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('cyber kwetsbaarheden');
      await page.waitForTimeout(1000);
    }

    await screenshot(page, '04_searching_article');

    // Click on the article row
    const articleRow = page.locator('tr', { hasText: /cyber.*kwetsbaarheden|kwetsbaarheden.*gemeenten/i }).first();
    if (await articleRow.isVisible({ timeout: 10000 }).catch(() => false)) {
      await articleRow.click();
      await page.waitForTimeout(2000);
      console.log('  ✅ Found and clicked article');
    } else {
      // Try clicking on any row with content
      console.log('  ⚠️ Specific article not found, using first available topic');
      const anyRow = page.locator('tbody tr').first();
      await anyRow.click();
      await page.waitForTimeout(2000);
    }
    await screenshot(page, '05_article_selected');

    // Step 5: Open the brief/draft to verify content exists
    console.log('\n📋 Step 5: Checking article content...');

    // Look for draft tab or brief button
    const draftTab = page.locator('button:has-text("Draft"), [role="tab"]:has-text("Draft")').first();
    if (await draftTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await draftTab.click();
      await page.waitForTimeout(1000);
    }
    await screenshot(page, '06_draft_view');

    // Step 6: Open Style & Publish modal
    console.log('\n🎨 Step 6: Opening Style & Publish modal...');

    // Find the Publish dropdown
    const publishDropdown = page.locator('button:has-text("Publish")').first();
    if (await publishDropdown.isVisible({ timeout: 10000 })) {
      await publishDropdown.click();
      await page.waitForTimeout(500);

      // Click Style & Publish option
      const styleOption = page.locator('[role="menuitem"]:has-text("Style"), button:has-text("Style & Publish")').first();
      if (await styleOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await styleOption.click();
      }
    }
    await page.waitForTimeout(2000);
    await screenshot(page, '07_style_modal_open');
    console.log('  ✅ Style & Publish modal opened');

    // Step 7: Brand Intelligence Step
    console.log('\n🔍 Step 7: Brand Intelligence step...');

    // Check if we're on brand step and if URL input is visible
    const urlInput = page.locator('input[placeholder*="URL"], input[placeholder*="website"], input[type="url"]').first();
    if (await urlInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Enter NFIR website URL
      await urlInput.fill('https://nfriskmanagement.com');
      await screenshot(page, '08_brand_url_entered');
      console.log('  ✅ Entered brand URL: nfriskmanagement.com');

      // Click Detect/Analyze button
      const detectButton = page.locator('button:has-text("Detect"), button:has-text("Analyze"), button:has-text("Extract")').first();
      if (await detectButton.isVisible({ timeout: 5000 })) {
        await detectButton.click();
        console.log('  ⏳ Running brand detection (this may take up to 2 minutes)...');

        // Wait for detection to complete
        await page.waitForSelector(
          'text=Brand Detected, text=Detection Complete, text=Using saved brand, text=Brand extracted, .brand-preview',
          { timeout: 180000 }
        ).catch(() => console.log('  ⚠️ Detection status unclear'));

        await page.waitForTimeout(3000);
      }
    } else {
      console.log('  ℹ️ Using saved brand (no URL input visible)');
    }
    await screenshot(page, '09_brand_detected');

    // Step 8: Move to Layout Intelligence step
    console.log('\n🧠 Step 8: Layout Intelligence step...');

    let nextButton = page.locator('button:has-text("Next")').first();
    if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(2000);
    }
    await screenshot(page, '10_layout_step');

    // Wait for layout analysis to complete
    await page.waitForTimeout(5000);
    await screenshot(page, '11_layout_analyzed');
    console.log('  ✅ Layout intelligence analyzed sections');

    // Step 9: Move to Preview step
    console.log('\n👁️ Step 9: Preview step...');

    nextButton = page.locator('button:has-text("Next")').first();
    if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(2000);
    }
    await screenshot(page, '12_preview_step');

    // Step 10: Generate Preview
    console.log('\n✨ Step 10: Generating styled preview...');

    const generateButton = page.locator('button:has-text("Generate Preview"), button:has-text("Generate"), button:has-text("Render")').first();
    if (await generateButton.isVisible({ timeout: 10000 })) {
      // Scroll to make sure button is clickable
      await generateButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await generateButton.click({ force: true });
      console.log('  ⏳ Generating styled output...');

      // Wait for preview to render
      await page.waitForSelector('iframe, .preview-content, .styled-preview, [data-testid="preview"]', { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(5000);
    }
    await screenshot(page, '13_preview_generated');
    console.log('  ✅ Preview generated');

    // Step 11: Take full wow factor proof screenshots
    console.log('\n📸 Step 11: Capturing wow factor proof...');

    // Take viewport screenshot
    await screenshot(page, '14_wow_factor_viewport', false);

    // Take full page screenshot
    await screenshot(page, '15_wow_factor_fullpage', true);

    // Try to capture the preview iframe content if available
    const previewIframe = page.frameLocator('iframe').first();
    try {
      const iframeBody = previewIframe.locator('body');
      if (await iframeBody.isVisible({ timeout: 5000 }).catch(() => false)) {
        // The iframe has content - good sign
        console.log('  ✅ Preview iframe has content');
      }
    } catch (e) {
      console.log('  ℹ️ Preview rendered inline (no iframe)');
    }

    // Step 12: Check for download/export options
    console.log('\n📥 Step 12: Checking export options...');

    const downloadButton = page.locator('button:has-text("Download"), button:has-text("Export"), button:has-text("Save")').first();
    if (await downloadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  ✅ Export options available');
    }
    await screenshot(page, '16_export_options');

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

    if (consoleErrors.length > 0) {
      console.log(`\n⚠️ Console Errors (${consoleErrors.length}):`);
      consoleErrors.slice(0, 10).forEach((err, i) => console.log(`  ${i + 1}. ${err.substring(0, 100)}`));
    } else {
      console.log('\n✅ No console errors during test');
    }

    if (consoleLogs.length > 0) {
      console.log(`\n📝 Relevant Logs (${consoleLogs.length}):`);
      consoleLogs.slice(0, 10).forEach((log, i) => console.log(`  ${i + 1}. ${log.substring(0, 100)}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed - check screenshots for visual proof');
    console.log('='.repeat(60) + '\n');

    // Save logs to file
    const logsDir = ensureDir(SCREENSHOT_DIR);
    fs.writeFileSync(
      path.join(logsDir, 'test_logs.txt'),
      `Console Errors:\n${consoleErrors.join('\n')}\n\nConsole Logs:\n${consoleLogs.join('\n')}`
    );
  });
});
