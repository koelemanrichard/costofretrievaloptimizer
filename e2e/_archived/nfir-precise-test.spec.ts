// e2e/nfir-precise-test.spec.ts
/**
 * NFIR PRECISE TEST - Properly navigates Style & Publish wizard
 */

import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-precise';
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

test.describe('NFIR Precise Test', () => {
  test.setTimeout(600000);

  test('navigate wizard and capture output', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') consoleErrors.push(text);
      if (text.includes('[LayoutIntelligence]') || text.includes('[Style')) {
        consoleLogs.push(text);
      }
    });

    console.log('\n🎯 NFIR PRECISE TEST\n');

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

    // FIND ARTICLE
    await page.waitForSelector('table tbody tr');
    await page.locator('tr', { hasText: /cyber.*kwetsbaar/i }).first().click();
    await page.waitForTimeout(1500);
    console.log('✅ Article selected');

    // OPEN BRIEF -> DRAFT
    await page.locator('button:has-text("View Brief")').first().click();
    await page.waitForTimeout(2000);
    const viewDraftBtn = page.locator('button:has-text("View Draft"), button:has-text("View Generated Draft")').first();
    await viewDraftBtn.click();
    await page.waitForTimeout(3000);
    console.log('✅ Draft workspace');

    // OPEN STYLE & PUBLISH
    const publishBtn = page.locator('button:has-text("Publish")').last();
    await publishBtn.scrollIntoViewIfNeeded();
    await publishBtn.click();
    await page.waitForTimeout(1000);
    await page.locator('text=Style & Publish').first().click();
    await page.waitForTimeout(3000);
    console.log('✅ Style & Publish modal opened');
    await ss(page, '01_brand_step');

    // WAIT FOR BRAND EXTRACTION
    console.log('\n⏳ Waiting for brand extraction...');
    await page.waitForSelector('text=Brand Summary', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // FIND THE FOOTER NEXT BUTTON (in the modal footer area)
    // The footer has class containing "border-t" and "rounded-b"
    const modalFooter = page.locator('div[class*="border-t"][class*="rounded-b"]');
    const footerNextBtn = modalFooter.locator('button:has-text("Next")');

    // Check if button is enabled
    const isDisabled = await footerNextBtn.isDisabled().catch(() => true);
    console.log(`Footer Next button disabled: ${isDisabled}`);

    if (isDisabled) {
      console.log('⚠️ Next button is disabled. Checking why...');
      // Take screenshot of current state
      await ss(page, '01b_next_disabled');
    }

    // STEP 1 -> STEP 2: Click Next to go to Layout
    console.log('\n📐 Moving to Layout step...');
    if (!isDisabled) {
      await footerNextBtn.click({ timeout: 10000 });
      await page.waitForTimeout(3000);
      await ss(page, '02_layout_step');
      console.log('✅ Layout step');
    } else {
      // Try clicking by coordinates - scroll to bottom of modal and click
      console.log('Attempting alternative click...');
      const nextBtnAny = page.locator('button', { hasText: 'Next' }).last();
      await nextBtnAny.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await nextBtnAny.click({ force: true, timeout: 5000 });
      await page.waitForTimeout(3000);
      await ss(page, '02_layout_step_alt');
    }

    // STEP 2 -> STEP 3: Click Next to go to Preview
    console.log('\n👁️ Moving to Preview step...');
    const nextBtn2 = page.locator('button', { hasText: 'Next' }).last();
    await nextBtn2.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await nextBtn2.click({ force: true });
    await page.waitForTimeout(3000);
    await ss(page, '03_preview_step');
    console.log('✅ Preview step');

    // CHECK CURRENT STEP
    const currentStep = await page.locator('.text-blue-400, .text-primary').first().textContent().catch(() => 'unknown');
    console.log(`Current step indicator: ${currentStep}`);

    // LOOK FOR GENERATE BUTTON
    console.log('\n✨ Looking for Generate button...');
    const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Generate Preview")').first();
    const generateVisible = await generateBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (generateVisible) {
      console.log('Found Generate button, clicking...');
      await generateBtn.scrollIntoViewIfNeeded();
      await generateBtn.click({ force: true });
      console.log('⏳ Waiting for styled output to generate (up to 2 minutes)...');

      // Wait for generation to complete
      await page.waitForTimeout(10000);

      // Check for iframe or preview content appearing
      const previewAppeared = await page.waitForSelector('iframe, .preview-frame, [class*="preview-content"]', {
        timeout: 120000
      }).catch(() => null);

      if (previewAppeared) {
        console.log('✅ Preview content appeared!');
        await page.waitForTimeout(5000);
      }
    } else {
      console.log('⚠️ Generate button not found');
      // List all buttons in modal
      const allButtons = await page.locator('button').allTextContents();
      console.log('Available buttons:', allButtons.slice(0, 10).join(', '));
    }

    // CAPTURE FINAL OUTPUT
    console.log('\n📸 Capturing final output...');
    await ss(page, '04_final_output', true);
    await ss(page, '05_final_viewport', false);

    // TRY TO EXTRACT IFRAME CONTENT
    try {
      const iframe = page.frameLocator('iframe').first();
      const iframeBody = iframe.locator('body');

      if (await iframeBody.isVisible({ timeout: 10000 }).catch(() => false)) {
        const html = await iframeBody.innerHTML();
        console.log(`\n📄 Iframe content: ${html.length} chars`);

        // Save HTML
        const htmlPath = path.join(ensureDir(SCREENSHOT_DIR), 'styled_output.html');
        fs.writeFileSync(htmlPath, `<!DOCTYPE html><html><body>${html}</body></html>`);
        console.log('💾 Saved styled_output.html');

        // Screenshot iframe
        await iframeBody.screenshot({
          path: path.join(ensureDir(SCREENSHOT_DIR), '06_iframe_content.png')
        });
        console.log('📸 06_iframe_content');

        // QUALITY VALIDATION
        console.log('\n🔍 QUALITY VALIDATION:');
        const checks = {
          hasBrandColors: html.includes('--ctc-') || html.includes('#') || html.includes('rgb'),
          hasFonts: html.includes('font-family') || html.includes('Barlow') || html.includes('Roboto'),
          hasCards: html.includes('card') || html.includes('grid') || html.includes('flex'),
          hasHeadings: html.includes('<h1') || html.includes('<h2') || html.includes('<h3'),
          hasLength: html.length > 2000,
        };

        Object.entries(checks).forEach(([key, value]) => {
          console.log(`  ${value ? '✅' : '❌'} ${key}`);
        });

        const score = Object.values(checks).filter(Boolean).length;
        console.log(`\n📊 Quality: ${score}/5`);
        console.log(score >= 3 ? '✅ MEETS QUALITY THRESHOLD' : '❌ BELOW QUALITY THRESHOLD');
      } else {
        console.log('⚠️ No iframe body visible');
      }
    } catch (e) {
      console.log('⚠️ Could not extract iframe:', e);
    }

    // LOG ERRORS
    if (consoleErrors.length > 0) {
      console.log('\n⚠️ Console errors:');
      consoleErrors.slice(0, 5).forEach(e => console.log(`  - ${e.substring(0, 100)}`));
      fs.writeFileSync(
        path.join(ensureDir(SCREENSHOT_DIR), 'errors.txt'),
        consoleErrors.join('\n')
      );
    }

    // LOG RELEVANT LOGS
    if (consoleLogs.length > 0) {
      console.log('\n📋 Layout Intelligence logs:');
      consoleLogs.forEach(l => console.log(`  ${l.substring(0, 120)}`));
    }

    console.log('\n✅ TEST COMPLETE');
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}\n`);
  });
});
