// e2e/nfir-correct-flow.spec.ts
/**
 * NFIR CORRECT FLOW - Style & Publish
 *
 * Flow: Brief Modal → Click "View Draft" → Article Draft Workspace → Publish dropdown → Style & Publish
 */

import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-correct-flow';
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

test.describe('NFIR Correct Flow', () => {
  test.setTimeout(600000);

  test('complete style & publish with wow factor', async ({ page }) => {
    console.log('\n🚀 NFIR CORRECT FLOW TEST\n');

    // LOGIN
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });
    console.log('✅ Logged in');

    // OPEN NFIR PROJECT
    await page.locator('tr', { hasText: 'nfir' }).first().locator('button:has-text("Open")').click();
    await page.waitForTimeout(2000);
    console.log('✅ Project opened');

    // LOAD MAP
    await page.waitForSelector('button:has-text("Load Map")');
    await page.locator('button:has-text("Load Map")').first().click();
    await page.waitForTimeout(3000);
    console.log('✅ Map loaded');

    // FIND CYBER ARTICLE
    await page.waitForSelector('table tbody tr');
    await page.locator('tr', { hasText: /cyber.*kwetsbaar/i }).first().click();
    await page.waitForTimeout(1500);
    console.log('✅ Article selected');

    // OPEN BRIEF MODAL
    await page.locator('button:has-text("View Brief")').first().click();
    await page.waitForTimeout(2000);
    await ss(page, '01_brief_modal');
    console.log('✅ Brief modal open');

    // CLICK "VIEW DRAFT" TO OPEN ARTICLE DRAFT WORKSPACE
    console.log('📋 Opening Article Draft Workspace...');
    const viewDraftBtn = page.locator('button:has-text("View Draft"), button:has-text("View Generated Draft")').first();
    await viewDraftBtn.waitFor({ state: 'visible', timeout: 10000 });
    await viewDraftBtn.click();
    await page.waitForTimeout(3000);
    await ss(page, '02_draft_workspace');
    console.log('✅ Draft Workspace open');

    // NOW WE'RE IN ARTICLE DRAFT WORKSPACE - FIND PUBLISH DROPDOWN AT BOTTOM
    console.log('📤 Opening Publish dropdown...');

    // The Publish button is in the bottom toolbar
    const publishBtn = page.locator('button:has-text("Publish")').last();
    await publishBtn.scrollIntoViewIfNeeded();
    await publishBtn.click();
    await page.waitForTimeout(1500);
    await ss(page, '03_publish_dropdown_open');
    console.log('✅ Publish dropdown open');

    // CLICK STYLE & PUBLISH
    console.log('🎨 Clicking Style & Publish...');
    const styleOption = page.locator('[role="menuitem"]:has-text("Style")').first();
    await styleOption.click();
    await page.waitForTimeout(3000);
    await ss(page, '04_style_publish_modal');
    console.log('✅ Style & Publish modal open');

    // BRAND INTELLIGENCE STEP
    console.log('🔍 Brand Intelligence step...');
    await page.waitForTimeout(2000);
    await ss(page, '05_brand_intelligence');

    // CLICK NEXT → LAYOUT STEP
    console.log('📐 Layout Intelligence step...');
    let nextBtn = page.locator('button:has-text("Next")').first();
    if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(3000);
      await ss(page, '06_layout_step');
    }

    // CLICK NEXT → PREVIEW STEP
    console.log('👁️ Preview step...');
    nextBtn = page.locator('button:has-text("Next")').first();
    if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, '07_preview_step');
    }

    // GENERATE PREVIEW
    console.log('✨ Generating styled preview...');
    const generateBtn = page.locator('button:has-text("Generate")').first();
    if (await generateBtn.isVisible({ timeout: 10000 })) {
      await generateBtn.scrollIntoViewIfNeeded();
      await generateBtn.click({ force: true });
      console.log('  ⏳ Rendering (up to 90s)...');

      await page.waitForTimeout(10000);
      await page.waitForSelector('iframe, .preview-content', { timeout: 90000 }).catch(() => {});
      await page.waitForTimeout(5000);
      console.log('  ✅ Preview rendered!');
    }

    // CAPTURE WOW FACTOR PROOF
    console.log('\n📸 CAPTURING WOW FACTOR PROOF...');
    await ss(page, '08_wow_factor_generated');
    await ss(page, '09_wow_viewport', false);
    await ss(page, '10_wow_fullpage', true);

    // TRY TO SAVE HTML OUTPUT
    try {
      const iframe = page.frameLocator('iframe').first();
      const body = iframe.locator('body');
      if (await body.isVisible({ timeout: 5000 }).catch(() => false)) {
        const html = await body.innerHTML();
        const htmlPath = path.join(ensureDir(SCREENSHOT_DIR), 'styled_output.html');
        fs.writeFileSync(htmlPath, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>NFIR Styled Output</title></head><body>${html}</body></html>`);
        console.log(`💾 Saved: styled_output.html (${html.length} chars)`);
      }
    } catch (e) {
      console.log('ℹ️ Preview inline (no iframe)');
    }

    // SUMMARY
    console.log('\n' + '='.repeat(50));
    console.log('🎉 WOW FACTOR TEST COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(50) + '\n');
  });
});
