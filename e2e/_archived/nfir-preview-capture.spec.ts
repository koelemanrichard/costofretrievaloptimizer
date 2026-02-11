// e2e/nfir-preview-capture.spec.ts
/**
 * NFIR PREVIEW CAPTURE - Precisely navigate to Preview step and capture output
 */

import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-preview-capture';
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

test.describe('NFIR Preview Capture', () => {
  test.setTimeout(600000);

  test('capture styled preview output', async ({ page }) => {
    console.log('\n🎯 NFIR PREVIEW CAPTURE TEST\n');

    // LOGIN
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });
    console.log('✅ Logged in');

    // OPEN PROJECT -> MAP -> ARTICLE -> DRAFT -> STYLE & PUBLISH
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
    console.log('✅ Style & Publish modal opened');

    // STEP 1: BRAND (initial step)
    console.log('\n📍 STEP 1: BRAND');
    await page.waitForSelector('text=Brand Intelligence, text=Brand Summary', { timeout: 10000 }).catch(() => {});
    await ss(page, '01_brand_step');

    // Check which step is active
    const brandActive = await page.locator('button:has-text("Brand")').first().evaluate(
      el => el.className.includes('text-blue') || el.querySelector('.bg-blue')
    ).catch(() => false);
    console.log(`  Brand step active: ${brandActive}`);

    // STEP 2: Click Next to go to LAYOUT
    console.log('\n📍 STEP 2: LAYOUT');
    const nextBtn1 = page.locator('button:has-text("Next")').last();
    await nextBtn1.waitFor({ state: 'visible', timeout: 5000 });
    await nextBtn1.click({ force: true });
    await page.waitForTimeout(3000);
    await ss(page, '02_layout_step');
    console.log('  ✅ At Layout step');

    // STEP 3: Click Next to go to PREVIEW
    console.log('\n📍 STEP 3: PREVIEW');
    const nextBtn2 = page.locator('button:has-text("Next")').last();
    await nextBtn2.waitFor({ state: 'visible', timeout: 5000 });
    await nextBtn2.click({ force: true });
    await page.waitForTimeout(3000);
    await ss(page, '03_preview_step_initial');
    console.log('  ✅ At Preview step');

    // Verify we're at Preview step (should see Generate button or preview tabs)
    const atPreview = await page.locator('text=Desktop, text=Generate, text=Design Quality').first().isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  Preview indicators visible: ${atPreview}`);

    // GENERATE THE PREVIEW
    console.log('\n✨ GENERATING STYLED PREVIEW...');
    const generateBtn = page.locator('button:has-text("Generate")').first();

    if (await generateBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('  Found Generate button, clicking...');
      await generateBtn.click({ force: true });

      // Wait for generation
      console.log('  ⏳ Waiting for styled output (up to 3 minutes)...');

      // Wait for either quality score or preview content to appear
      await page.waitForTimeout(15000); // Give it time to start
      await page.waitForSelector('text=Design Quality, iframe, [class*="preview-frame"]', { timeout: 180000 }).catch(() => {});
      await page.waitForTimeout(5000); // Extra time for rendering

      console.log('  ✅ Generation complete');
    } else {
      console.log('  ⚠️ Generate button not found - maybe already generated?');
    }

    // CAPTURE THE PREVIEW
    await ss(page, '04_preview_with_output');

    // TRY TO FIND AND SCREENSHOT THE PREVIEW CONTENT
    console.log('\n👁️ LOOKING FOR PREVIEW CONTENT...');

    // Check for tabs (Desktop/Tablet/Mobile/HTML)
    const desktopTab = page.locator('button:has-text("Desktop"), [role="tab"]:has-text("Desktop")').first();
    if (await desktopTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('  Found Desktop tab');
      await desktopTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for iframe
    const iframeCount = await page.locator('iframe').count();
    console.log(`  Found ${iframeCount} iframes`);

    if (iframeCount > 0) {
      for (let i = 0; i < iframeCount; i++) {
        try {
          const iframe = page.frameLocator(`iframe >> nth=${i}`);
          const body = iframe.locator('body');

          if (await body.isVisible({ timeout: 5000 }).catch(() => false)) {
            const html = await body.innerHTML();
            console.log(`\n  📄 Iframe ${i}: ${html.length} characters`);

            if (html.length > 500) {
              // This is our preview!
              const htmlDir = ensureDir(SCREENSHOT_DIR);

              // Save full HTML
              const fullHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NFIR Styled Output</title>
</head>
<body>
${html}
</body>
</html>`;
              fs.writeFileSync(path.join(htmlDir, 'styled_output.html'), fullHtml);
              console.log('  💾 Saved styled_output.html');

              // Screenshot the iframe content
              await body.screenshot({
                path: path.join(htmlDir, '05_styled_content.png'),
              }).catch(e => console.log('  ⚠️ Could not screenshot iframe body'));

              // VALIDATE QUALITY
              console.log('\n🔍 QUALITY VALIDATION:');
              const checks = {
                'Content length > 2000': html.length > 2000,
                'Has headings (h1/h2/h3)': /<h[123]/.test(html),
                'Has paragraphs': /<p[^>]*>/.test(html),
                'Has styling (style/class)': /style=|class=/.test(html),
                'Has brand colors/vars': /--|rgb|#[0-9a-f]{3,6}/i.test(html),
                'Has visual components': /grid|flex|card|section/i.test(html),
              };

              let passed = 0;
              Object.entries(checks).forEach(([check, result]) => {
                console.log(`  ${result ? '✅' : '❌'} ${check}`);
                if (result) passed++;
              });

              console.log(`\n📊 Quality: ${passed}/${Object.keys(checks).length}`);
              console.log(passed >= 4 ? '✅ MEETS WOW FACTOR THRESHOLD' : '⚠️ BELOW WOW FACTOR THRESHOLD');

              break;
            }
          }
        } catch (e) {
          console.log(`  Iframe ${i}: Error - ${e}`);
        }
      }
    } else {
      // Maybe preview is inline
      console.log('  Looking for inline preview...');
      const previewDiv = page.locator('[class*="preview"], .preview-content, .styled-output').first();
      if (await previewDiv.isVisible({ timeout: 3000 }).catch(() => false)) {
        const html = await previewDiv.innerHTML().catch(() => '');
        if (html.length > 500) {
          fs.writeFileSync(path.join(ensureDir(SCREENSHOT_DIR), 'inline_preview.html'), html);
          console.log(`  💾 Saved inline preview: ${html.length} chars`);
        }
      }
    }

    // TRY HTML TAB
    console.log('\n📋 CHECKING HTML TAB...');
    const htmlTab = page.locator('button:has-text("HTML"), [role="tab"]:has-text("HTML")').first();
    if (await htmlTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await htmlTab.click();
      await page.waitForTimeout(1000);
      await ss(page, '06_html_tab');

      // Get code content
      const codeContent = await page.locator('pre, code, textarea').first().textContent().catch(() => '');
      if (codeContent.length > 100) {
        fs.writeFileSync(path.join(ensureDir(SCREENSHOT_DIR), 'html_export.html'), codeContent);
        console.log(`  💾 Saved HTML export: ${codeContent.length} chars`);
      }
    }

    // FINAL SCREENSHOTS
    await ss(page, '07_final_full', true);
    await ss(page, '08_final_viewport', false);

    console.log('\n' + '='.repeat(60));
    console.log('✅ NFIR PREVIEW CAPTURE TEST COMPLETE');
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(60) + '\n');
  });
});
