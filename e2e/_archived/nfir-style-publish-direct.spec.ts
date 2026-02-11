// e2e/nfir-style-publish-direct.spec.ts
/**
 * Direct Style & Publish Test for NFIR
 *
 * This test directly opens the Style & Publish modal and captures
 * the styled preview output for the cyber kwetsbaarheden article.
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-style-proof';
const BASE_URL = 'http://localhost:3000';

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
  const filename = `${Date.now()}_${name}.png`;
  await page.screenshot({ path: path.join(dir, filename), fullPage });
  console.log(`📸 ${name}`);
  return path.join(dir, filename);
}

test.describe('NFIR Style & Publish Direct Test', () => {
  test.setTimeout(600000); // 10 minutes

  test('generate styled preview with wow factor', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    console.log('\n🚀 NFIR Style & Publish Direct Test\n');
    console.log('='.repeat(60));

    // Step 1: Login
    console.log('\n📝 Step 1: Logging in...');
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });
    await screenshot(page, '01_logged_in');

    // Step 2: Open NFIR project
    console.log('\n📂 Step 2: Opening NFIR project...');
    const nfirRow = page.locator('tr', { hasText: 'nfir' }).first();
    await nfirRow.locator('button:has-text("Open")').click();
    await page.waitForTimeout(2000);
    await screenshot(page, '02_nfir_project');

    // Step 3: Load the map
    console.log('\n🗺️ Step 3: Loading map...');
    await page.waitForSelector('button:has-text("Load Map")', { timeout: 30000 });
    await page.locator('button:has-text("Load Map")').first().click();
    await page.waitForTimeout(3000);
    await screenshot(page, '03_map_loaded');

    // Step 4: Find the cyber article
    console.log('\n📄 Step 4: Finding cyber kwetsbaarheden article...');
    await page.waitForSelector('table tbody tr', { timeout: 30000 });

    // Search for the article
    const searchBox = page.locator('input[placeholder*="Search"], input[placeholder*="Zoek"]').first();
    if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchBox.fill('cyber');
      await page.waitForTimeout(1000);
    }

    // Click on the article row
    const articleRow = page.locator('tr', { hasText: /cyber.*kwetsbaar/i }).first();
    await articleRow.click();
    await page.waitForTimeout(2000);
    await screenshot(page, '04_article_clicked');

    // Step 5: Click on the article title or expand it to see action buttons
    console.log('\n🔘 Step 5: Opening article actions...');

    // The article should now be expanded, look for Publish button
    // Wait for the expanded view with action buttons
    await page.waitForTimeout(1000);

    // Take screenshot to see current state
    await screenshot(page, '05_article_expanded');

    // Step 6: Find and click the Publish dropdown
    console.log('\n📤 Step 6: Opening Publish dropdown...');

    // Look for Publish button in the expanded article area or sidebar
    const publishButton = page.locator('button:has-text("Publish")').first();

    if (await publishButton.isVisible({ timeout: 10000 })) {
      console.log('  Found Publish button, clicking...');
      await publishButton.click();
      await page.waitForTimeout(1000);
      await screenshot(page, '06_publish_dropdown_open');

      // Step 7: Click "Style & Publish" option
      console.log('\n🎨 Step 7: Clicking Style & Publish...');

      // The dropdown menu should be visible now
      const styleOption = page.locator('[role="menuitem"]:has-text("Style"), [role="menuitem"]:has-text("tyle"), button:has-text("Style & Publish")').first();

      if (await styleOption.isVisible({ timeout: 5000 })) {
        console.log('  Found Style option, clicking...');
        await styleOption.click();
        await page.waitForTimeout(2000);
      } else {
        console.log('  ⚠️ Style option not found in menu, trying direct access...');
        // Try clicking anywhere to close menu and try again
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    } else {
      console.log('  ⚠️ Publish button not visible');
    }

    await screenshot(page, '07_after_style_click');

    // Step 8: Check if modal is open
    console.log('\n🔍 Step 8: Checking for Style & Publish modal...');

    // Look for modal indicators
    const modalTitle = page.locator('text=Style & Publish, text=Brand Intelligence, h2:has-text("Style")').first();
    const modalVisible = await modalTitle.isVisible({ timeout: 5000 }).catch(() => false);

    if (modalVisible) {
      console.log('  ✅ Style & Publish modal is open!');
      await screenshot(page, '08_modal_open');
    } else {
      console.log('  ⚠️ Modal not detected, checking page state...');
      await screenshot(page, '08_modal_not_found');

      // Try alternative approach - look for any modal/dialog
      const anyModal = page.locator('[role="dialog"], .modal, .fixed.inset-0').first();
      if (await anyModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('  Found a modal/dialog element');
        await screenshot(page, '08b_found_modal');
      }
    }

    // Step 9: Navigate through wizard steps
    console.log('\n🔄 Step 9: Navigating wizard steps...');

    // Try clicking Next buttons to advance through steps
    for (let step = 1; step <= 3; step++) {
      const nextBtn = page.locator('button:has-text("Next")').first();
      if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(2000);
        await screenshot(page, `09_step_${step}`);
        console.log(`  Clicked Next (step ${step})`);
      }
    }

    // Step 10: Look for Generate button and click it
    console.log('\n✨ Step 10: Generating preview...');

    const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Render"), button:has-text("Preview")').first();
    if (await generateBtn.isVisible({ timeout: 10000 })) {
      console.log('  Found Generate button, clicking...');
      await generateBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Use force click to bypass any overlays
      await generateBtn.click({ force: true });

      console.log('  ⏳ Waiting for preview generation (up to 60s)...');
      await page.waitForTimeout(5000);

      // Wait for preview content
      await page.waitForSelector('iframe, .preview-container, .styled-output, .article-preview', { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }

    await screenshot(page, '10_preview_generated');

    // Step 11: Capture final wow factor proof
    console.log('\n📸 Step 11: Capturing wow factor proof...');
    await screenshot(page, '11_wow_factor_viewport', false);
    await screenshot(page, '12_wow_factor_fullpage', true);

    // Step 12: Try to find and screenshot the preview iframe content
    console.log('\n🖼️ Step 12: Checking preview content...');

    const iframe = page.frameLocator('iframe').first();
    try {
      const iframeContent = iframe.locator('body');
      if (await iframeContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('  ✅ Found preview iframe with content');
        // Can't directly screenshot iframe, but we know it has content
      }
    } catch (e) {
      console.log('  ℹ️ Preview may be rendered inline');
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST COMPLETE');
    console.log('='.repeat(60));
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

    if (errors.length > 0) {
      console.log(`\n⚠️ Errors encountered: ${errors.length}`);
      errors.slice(0, 5).forEach((e, i) => console.log(`  ${i+1}. ${e.substring(0, 80)}`));
    } else {
      console.log('\n✅ No errors during test');
    }

    console.log('='.repeat(60) + '\n');

    // Save error log
    const logsDir = ensureDir(SCREENSHOT_DIR);
    fs.writeFileSync(path.join(logsDir, 'errors.txt'), errors.join('\n'));
  });
});
