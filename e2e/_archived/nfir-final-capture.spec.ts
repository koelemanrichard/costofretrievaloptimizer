// e2e/nfir-final-capture.spec.ts
/**
 * NFIR FINAL CAPTURE - Get the actual styled output
 */

import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-final-capture';
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

test.describe('NFIR Final Capture', () => {
  test.setTimeout(600000);

  test('capture actual styled output', async ({ page }) => {
    console.log('\n🎯 NFIR FINAL CAPTURE TEST\n');

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

    // Navigate to Preview step (Brand -> Layout -> Preview)
    console.log('\n📍 Navigating to Preview step...');

    // Click Next twice to get to Preview
    for (let i = 0; i < 2; i++) {
      const nextBtn = page.locator('button:has-text("Next")').last();
      await nextBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }

    await ss(page, '01_preview_step');
    console.log('✅ At Preview step');

    // Click Generate if available
    const generateBtn = page.locator('button:has-text("Generate")').first();
    if (await generateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✨ Clicking Generate...');
      await generateBtn.click({ force: true });
      await page.waitForTimeout(15000); // Wait for generation
    }

    await ss(page, '02_after_generate');

    // Try clicking EXPAND button to see full preview
    console.log('\n🔍 Looking for Expand button...');
    const expandBtn = page.locator('button:has-text("Expand")').first();
    if (await expandBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('📐 Clicking Expand...');
      await expandBtn.click({ force: true });
      await page.waitForTimeout(2000);
      await ss(page, '03_expanded_preview');
      console.log('✅ Expanded view');
    }

    // Look for iframe in expanded view
    console.log('\n👁️ Looking for preview content...');
    const iframeCount = await page.locator('iframe').count();
    console.log(`Found ${iframeCount} iframes`);

    if (iframeCount > 0) {
      for (let i = 0; i < iframeCount; i++) {
        try {
          const iframe = page.frameLocator(`iframe >> nth=${i}`);
          const body = iframe.locator('body');

          if (await body.isVisible({ timeout: 5000 }).catch(() => false)) {
            const html = await body.innerHTML();
            console.log(`📄 Iframe ${i}: ${html.length} characters`);

            if (html.length > 500) {
              // Save HTML
              fs.writeFileSync(
                path.join(ensureDir(SCREENSHOT_DIR), 'styled_output.html'),
                `<!DOCTYPE html><html><head><meta charset="utf-8"><title>NFIR Styled Output</title></head><body>${html}</body></html>`
              );
              console.log('💾 Saved styled_output.html');

              // Screenshot iframe
              await body.screenshot({
                path: path.join(ensureDir(SCREENSHOT_DIR), '04_styled_content.png')
              }).catch(() => {});
              console.log('📸 04_styled_content');

              // Validate
              console.log('\n🔍 VALIDATION:');
              console.log(`  Length: ${html.length > 2000 ? '✅' : '❌'} (${html.length} chars)`);
              console.log(`  Headings: ${/<h[123]/.test(html) ? '✅' : '❌'}`);
              console.log(`  Paragraphs: ${/<p/.test(html) ? '✅' : '❌'}`);
              console.log(`  Styling: ${/style=|class=/.test(html) ? '✅' : '❌'}`);
              break;
            }
          }
        } catch (e) {
          console.log(`  Iframe ${i}: Error`);
        }
      }
    }

    // If no iframe, try Download HTML button
    if (iframeCount === 0) {
      console.log('\n📥 Trying Download HTML...');
      const downloadBtn = page.locator('button:has-text("Download HTML")').first();
      if (await downloadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Set up download handler
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
          downloadBtn.click({ force: true })
        ]);

        if (download) {
          const downloadPath = path.join(ensureDir(SCREENSHOT_DIR), 'downloaded_output.html');
          await download.saveAs(downloadPath);
          console.log('💾 Downloaded: downloaded_output.html');

          // Read and validate
          const downloadedHtml = fs.readFileSync(downloadPath, 'utf-8');
          console.log(`📄 Downloaded HTML: ${downloadedHtml.length} characters`);
        }
      }
    }

    // Also try scrolling down in modal to see preview
    console.log('\n📜 Scrolling modal to find preview...');
    const modalContent = page.locator('[role="dialog"], .modal-content, [class*="modal"]').first();
    if (await modalContent.isVisible().catch(() => false)) {
      await modalContent.evaluate(el => el.scrollTop = el.scrollHeight);
      await page.waitForTimeout(1000);
      await ss(page, '05_scrolled_modal');
    }

    // Take final screenshots
    await ss(page, '06_final_full', true);
    await ss(page, '07_final_viewport', false);

    // Get quality metrics from the page
    console.log('\n📊 QUALITY METRICS:');
    const brandMatch = await page.locator('text=/\\d+%/').first().textContent().catch(() => 'N/A');
    console.log(`  Brand Match visible: ${brandMatch}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE');
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(60) + '\n');
  });
});
