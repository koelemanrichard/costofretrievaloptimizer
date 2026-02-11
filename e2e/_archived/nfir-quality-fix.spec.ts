// e2e/nfir-quality-fix.spec.ts
/**
 * NFIR Quality Fix Test - Generates and fixes quality issues
 */

import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-quality-fix';
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

test.describe('NFIR Quality Fix', () => {
  test.setTimeout(900000); // 15 minutes

  test('generate and fix quality issues', async ({ page }) => {
    console.log('\n🎯 NFIR QUALITY FIX TEST\n');

    // LOGIN
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });
    console.log('✅ Logged in');

    // OPEN PROJECT -> MAP -> ARTICLE
    await page.locator('tr', { hasText: 'nfir' }).first().locator('button:has-text("Open")').click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Load Map")').first().click();
    await page.waitForTimeout(3000);
    await page.locator('tr', { hasText: /cyber.*kwetsbaar/i }).first().click();
    await page.waitForTimeout(1500);
    console.log('✅ Article selected');

    // OPEN DRAFT -> STYLE & PUBLISH
    await page.locator('button:has-text("View Brief")').first().click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("View Draft"), button:has-text("View Generated Draft")').first().click();
    await page.waitForTimeout(3000);
    await page.locator('button:has-text("Publish")').last().click();
    await page.waitForTimeout(1000);
    await page.locator('text=Style & Publish').first().click();
    await page.waitForTimeout(3000);
    console.log('✅ Style & Publish modal');

    // NAVIGATE TO PREVIEW STEP
    console.log('\n📐 Navigating to Preview...');

    // Click through steps
    for (let i = 0; i < 3; i++) {
      const nextBtn = page.locator('button', { hasText: 'Next' }).last();
      if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const isDisabled = await nextBtn.isDisabled().catch(() => true);
        if (!isDisabled) {
          await nextBtn.click({ force: true });
          await page.waitForTimeout(2000);
        }
      }
    }

    await ss(page, '01_preview_initial');
    console.log('✅ At Preview step');

    // LOOK FOR GENERATE BUTTON AND CLICK
    const generateBtn = page.locator('button:has-text("Generate")').first();
    if (await generateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('\n✨ Generating styled output...');
      await generateBtn.click({ force: true });

      // Wait for generation (watch for quality score to appear)
      console.log('⏳ Waiting for generation (up to 3 minutes)...');
      await page.waitForSelector('text=Design Quality Score, text=Quality Score', { timeout: 180000 }).catch(() => {});
      await page.waitForTimeout(5000);
    }

    await ss(page, '02_after_generate');

    // CHECK QUALITY SCORE
    const qualityText = await page.locator('text=/\\d+%/').first().textContent().catch(() => '0%');
    const qualityScore = parseInt(qualityText.replace('%', '')) || 0;
    console.log(`\n📊 Design Quality Score: ${qualityScore}%`);

    if (qualityScore < 70) {
      console.log('⚠️ Quality below threshold, attempting fixes...');

      // Look for "Fix All Issues" button
      const fixBtn = page.locator('button:has-text("Fix"), button:has-text("fix")').first();
      if (await fixBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('🔧 Clicking Fix All Issues...');
        await fixBtn.click({ force: true });

        // Wait for fixes to apply
        console.log('⏳ Applying fixes (up to 2 minutes)...');
        await page.waitForTimeout(30000);

        // Check new quality
        await ss(page, '03_after_fix');
        const newQualityText = await page.locator('text=/\\d+%/').first().textContent().catch(() => '0%');
        const newQuality = parseInt(newQualityText.replace('%', '')) || 0;
        console.log(`📊 New Quality Score: ${newQuality}%`);
      }
    }

    // SCROLL DOWN TO SEE PREVIEW CONTENT
    console.log('\n👁️ Looking for preview content...');

    // Try to find preview area and scroll to it
    const previewArea = page.locator('.preview-frame, iframe, [class*="preview"], [class*="Preview"]').first();
    if (await previewArea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await previewArea.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
      await ss(page, '04_preview_area');
      console.log('✅ Found preview area');
    }

    // CHECK FOR IFRAME
    const iframeCount = await page.locator('iframe').count();
    console.log(`Found ${iframeCount} iframes`);

    if (iframeCount > 0) {
      // Try each iframe
      for (let i = 0; i < iframeCount; i++) {
        try {
          const iframe = page.frameLocator(`iframe >> nth=${i}`);
          const body = iframe.locator('body');

          if (await body.isVisible({ timeout: 5000 }).catch(() => false)) {
            const html = await body.innerHTML();
            console.log(`\n📄 Iframe ${i} content: ${html.length} chars`);

            if (html.length > 500) {
              // This is likely our preview
              const htmlPath = path.join(ensureDir(SCREENSHOT_DIR), `iframe_${i}_content.html`);
              fs.writeFileSync(htmlPath, `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n${html}\n</body>\n</html>`);
              console.log(`💾 Saved iframe_${i}_content.html`);

              // Screenshot iframe content
              await body.screenshot({
                path: path.join(ensureDir(SCREENSHOT_DIR), `05_iframe_${i}_screenshot.png`)
              }).catch(() => {});

              // Validate content
              console.log('\n🔍 CONTENT VALIDATION:');
              console.log(`  - Length: ${html.length > 2000 ? '✅' : '❌'} (${html.length} chars)`);
              console.log(`  - Has headings: ${html.includes('<h1') || html.includes('<h2') ? '✅' : '❌'}`);
              console.log(`  - Has styling: ${html.includes('style') || html.includes('class') ? '✅' : '❌'}`);
              console.log(`  - Has brand vars: ${html.includes('--') || html.includes('rgb') ? '✅' : '❌'}`);
              break;
            }
          }
        } catch (e) {
          console.log(`  Iframe ${i}: not accessible`);
        }
      }
    } else {
      // Maybe preview is inline, not in iframe
      console.log('No iframes found, checking for inline preview...');

      // Look for preview content div
      const previewContent = await page.locator('[class*="preview"] article, [class*="preview"] .content, .styled-content').first().innerHTML().catch(() => '');
      if (previewContent.length > 500) {
        console.log(`📄 Found inline preview: ${previewContent.length} chars`);
        fs.writeFileSync(
          path.join(ensureDir(SCREENSHOT_DIR), 'inline_preview.html'),
          `<!DOCTYPE html>\n<html>\n<body>\n${previewContent}\n</body>\n</html>`
        );
      }
    }

    // FINAL FULL SCREENSHOTS
    await ss(page, '06_final_full', true);
    await ss(page, '07_final_viewport', false);

    // TRY TO CLICK "HTML" TAB TO SEE RAW OUTPUT
    const htmlTab = page.locator('button:has-text("HTML"), [role="tab"]:has-text("HTML")').first();
    if (await htmlTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await htmlTab.click();
      await page.waitForTimeout(1000);
      await ss(page, '08_html_tab');

      // Try to get the HTML from code block
      const codeBlock = await page.locator('pre, code, textarea').first().textContent().catch(() => '');
      if (codeBlock.length > 100) {
        fs.writeFileSync(
          path.join(ensureDir(SCREENSHOT_DIR), 'html_tab_content.html'),
          codeBlock
        );
        console.log(`\n💾 Saved HTML tab content: ${codeBlock.length} chars`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE');
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(60) + '\n');
  });
});
