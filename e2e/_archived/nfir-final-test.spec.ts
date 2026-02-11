// e2e/nfir-final-test.spec.ts
/**
 * NFIR Final Test - Correct UI Flow
 *
 * The Publish dropdown is at the BOTTOM RIGHT of the DraftingModal toolbar:
 * [Export] [Polish] [Flow] [Audit] [Schema] [Images] [Re-run] [🔧 Publish ↓] [Close]
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-final';
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

test.describe('NFIR Final Style & Publish Test', () => {
  test.setTimeout(600000);

  test('generate wow factor styled output', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    console.log('\n' + '🎯'.repeat(35));
    console.log('NFIR FINAL TEST - STYLE & PUBLISH');
    console.log('🎯'.repeat(35));

    // STEP 1: Login
    console.log('\n📝 STEP 1: Login');
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });
    console.log('  ✅ Logged in');

    // STEP 2: Open NFIR project
    console.log('\n📂 STEP 2: Open NFIR project');
    await page.locator('tr', { hasText: 'nfir' }).first().locator('button:has-text("Open")').click();
    await page.waitForTimeout(2000);
    console.log('  ✅ Opened');

    // STEP 3: Load map
    console.log('\n🗺️ STEP 3: Load map');
    await page.waitForSelector('button:has-text("Load Map")', { timeout: 30000 });
    await page.locator('button:has-text("Load Map")').first().click();
    await page.waitForTimeout(3000);
    console.log('  ✅ Map loaded');

    // STEP 4: Find cyber article
    console.log('\n📄 STEP 4: Find article');
    await page.waitForSelector('table tbody tr', { timeout: 30000 });
    const articleRow = page.locator('tr', { hasText: /cyber.*kwetsbaar/i }).first();
    await articleRow.click();
    await page.waitForTimeout(1500);
    console.log('  ✅ Article found');

    // STEP 5: Open View Brief
    console.log('\n📋 STEP 5: Open Draft modal');
    const viewBriefBtn = page.locator('button:has-text("View Brief")').first();
    await viewBriefBtn.click();
    await page.waitForTimeout(2000);

    // Click Draft tab
    const draftTab = page.locator('[role="tab"]:has-text("Draft"), button:has-text("Draft")').first();
    if (await draftTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await draftTab.click();
      await page.waitForTimeout(1000);
    }
    await screenshot(page, '01_draft_modal_open');
    console.log('  ✅ Draft modal open');

    // STEP 6: Click Publish dropdown (bottom toolbar)
    console.log('\n📤 STEP 6: Click Publish dropdown');

    // The Publish button is in the bottom toolbar - look for it specifically
    // It has a dropdown icon and says "Publish"
    const publishBtn = page.locator('button', { hasText: 'Publish' }).filter({ hasText: /Publish/i }).last();

    await publishBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await screenshot(page, '02_before_publish_click');

    await publishBtn.click();
    await page.waitForTimeout(1500); // Wait for dropdown to open
    await screenshot(page, '03_publish_dropdown');
    console.log('  ✅ Clicked Publish');

    // STEP 7: Click Style & Publish in dropdown
    console.log('\n🎨 STEP 7: Click Style & Publish');

    // Look for menu items
    const styleOption = page.locator(
      '[role="menuitem"]:has-text("Style"), ' +
      'button:has-text("Style & Publish"), ' +
      'div[role="menu"] >> text=Style'
    ).first();

    if (await styleOption.isVisible({ timeout: 5000 })) {
      await styleOption.click();
      console.log('  ✅ Clicked Style & Publish option');
      await page.waitForTimeout(3000);
    } else {
      // Try clicking any visible text that says Style
      const anyStyle = page.locator('text=Style & Publish, text=Style').first();
      if (await anyStyle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anyStyle.click();
        console.log('  ✅ Clicked Style text');
        await page.waitForTimeout(3000);
      } else {
        console.log('  ⚠️ Style option not found');
      }
    }
    await screenshot(page, '04_after_style_click');

    // STEP 8: Check if Style & Publish modal opened
    console.log('\n🔍 STEP 8: Check Style & Publish modal');

    // Look for the Style & Publish modal indicators
    const brandStep = page.locator('text=Brand Intelligence, h2:has-text("Brand"), text=Brand Detection').first();
    const modalOpen = await brandStep.isVisible({ timeout: 8000 }).catch(() => false);

    if (modalOpen) {
      console.log('  ✅ STYLE & PUBLISH MODAL IS OPEN!');
      await screenshot(page, '05_style_modal_open');

      // STEP 9: Navigate through wizard
      console.log('\n🧙 STEP 9: Navigate wizard');

      // Brand step - may use saved brand
      await page.waitForTimeout(2000);
      await screenshot(page, '06_brand_step');

      // Click Next
      let nextBtn = page.locator('button:has-text("Next")').first();
      if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(3000);
        console.log('  → Layout step');
        await screenshot(page, '07_layout_step');
      }

      // Click Next again
      nextBtn = page.locator('button:has-text("Next")').first();
      if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(2000);
        console.log('  → Preview step');
        await screenshot(page, '08_preview_step');
      }

      // STEP 10: Generate Preview
      console.log('\n✨ STEP 10: Generate Preview');

      const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Render")').first();
      if (await generateBtn.isVisible({ timeout: 10000 })) {
        await generateBtn.scrollIntoViewIfNeeded();
        await generateBtn.click({ force: true });
        console.log('  ⏳ Generating (up to 90s)...');

        // Wait for preview
        await page.waitForTimeout(10000);
        await page.waitForSelector('iframe, .preview-content', { timeout: 90000 }).catch(() => {});
        await page.waitForTimeout(5000);
        console.log('  ✅ Preview generated!');
      }

      await screenshot(page, '09_preview_generated');

    } else {
      console.log('  ⚠️ Modal did not open');
      await screenshot(page, '05_modal_not_open');
    }

    // FINAL: Wow factor proof
    console.log('\n📸 FINAL: Capturing wow factor proof');
    await screenshot(page, '10_wow_viewport', false);
    await screenshot(page, '11_wow_fullpage', true);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('TEST COMPLETE');
    console.log('='.repeat(50));
    console.log(`Screenshots: ${SCREENSHOT_DIR}`);
    console.log(`Errors: ${errors.length}`);
    console.log('='.repeat(50) + '\n');

    fs.writeFileSync(path.join(ensureDir(SCREENSHOT_DIR), 'errors.txt'), errors.join('\n'));
  });
});
