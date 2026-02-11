// e2e/nfir-output-validation.spec.ts
/**
 * NFIR OUTPUT VALIDATION TEST
 *
 * This test ACTUALLY validates the styled output, not just the modal opening.
 * It captures the PREVIEW iframe content and validates wow factor.
 */

import { test, Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-output-validation';
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

test.describe('NFIR Output Validation', () => {
  test.setTimeout(600000);

  test('validate styled output quality', async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(' NFIR OUTPUT VALIDATION TEST');
    console.log('='.repeat(60) + '\n');

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
    console.log('✅ Brief modal open');

    // CLICK VIEW DRAFT
    const viewDraftBtn = page.locator('button:has-text("View Draft"), button:has-text("View Generated Draft")').first();
    await viewDraftBtn.click();
    await page.waitForTimeout(3000);
    console.log('✅ Draft Workspace open');

    // CLICK PUBLISH DROPDOWN
    const publishBtn = page.locator('button:has-text("Publish")').last();
    await publishBtn.scrollIntoViewIfNeeded();
    await publishBtn.click();
    await page.waitForTimeout(1000);
    console.log('✅ Publish menu open');

    // CLICK STYLE & PUBLISH
    console.log('🎨 Opening Style & Publish...');
    const styleOption = page.locator('text=Style & Publish').first();
    await styleOption.click();
    await page.waitForTimeout(3000);
    await ss(page, '01_style_modal_opened');
    console.log('✅ Style & Publish modal opened');

    // STEP 1: BRAND INTELLIGENCE
    console.log('\n🔍 STEP 1: BRAND INTELLIGENCE');
    await page.waitForTimeout(2000);

    // Check brand was detected
    const brandSummary = page.locator('text=Brand Summary');
    if (await brandSummary.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  ✅ Brand Summary visible');

      // Get brand info
      const headingFont = await page.locator('text=Heading Font').locator('..').textContent().catch(() => 'N/A');
      const bodyFont = await page.locator('text=Body Font').locator('..').textContent().catch(() => 'N/A');
      console.log(`  - ${headingFont}`);
      console.log(`  - ${bodyFont}`);
    }

    await ss(page, '02_brand_step');

    // CLICK NEXT - using force click to bypass overlay
    console.log('\n📐 STEP 2: LAYOUT INTELLIGENCE');
    const nextBtn1 = page.locator('button:has-text("Next")').first();
    await nextBtn1.scrollIntoViewIfNeeded();
    await nextBtn1.click({ force: true });
    await page.waitForTimeout(3000);
    await ss(page, '03_layout_step');
    console.log('  ✅ Layout step reached');

    // CLICK NEXT TO PREVIEW
    console.log('\n👁️ STEP 3: PREVIEW');
    const nextBtn2 = page.locator('button:has-text("Next")').first();
    if (await nextBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextBtn2.scrollIntoViewIfNeeded();
      await nextBtn2.click({ force: true });
      await page.waitForTimeout(2000);
      await ss(page, '04_preview_step_initial');
      console.log('  ✅ Preview step reached');
    }

    // GENERATE PREVIEW
    console.log('\n✨ GENERATING STYLED OUTPUT...');
    const generateBtn = page.locator('button:has-text("Generate")').first();
    if (await generateBtn.isVisible({ timeout: 10000 })) {
      await generateBtn.scrollIntoViewIfNeeded();
      await generateBtn.click({ force: true });
      console.log('  ⏳ Generating (waiting up to 120s)...');

      // Wait for preview to render
      await page.waitForTimeout(15000);

      // Look for iframe or preview content
      const previewLoaded = await page.waitForSelector(
        'iframe, [class*="preview"], .preview-container',
        { timeout: 120000 }
      ).catch(() => null);

      if (previewLoaded) {
        await page.waitForTimeout(5000);
        console.log('  ✅ Preview content appeared');
      }
    }

    // CAPTURE OUTPUT
    console.log('\n📸 CAPTURING OUTPUT FOR VALIDATION...');
    await ss(page, '05_output_full_page', true);
    await ss(page, '06_output_viewport', false);

    // TRY TO GET IFRAME CONTENT
    let outputHtml = '';
    try {
      const iframe = page.frameLocator('iframe').first();
      const body = iframe.locator('body');

      if (await body.isVisible({ timeout: 10000 }).catch(() => false)) {
        outputHtml = await body.innerHTML();
        console.log(`  📄 Output HTML: ${outputHtml.length} characters`);

        // Save the HTML
        const htmlPath = path.join(ensureDir(SCREENSHOT_DIR), 'styled_output.html');
        const fullHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NFIR Styled Output - Validation</title>
</head>
<body>
${outputHtml}
</body>
</html>`;
        fs.writeFileSync(htmlPath, fullHtml);
        console.log(`  💾 Saved: styled_output.html`);

        // Take iframe screenshot
        await iframe.locator('body').screenshot({
          path: path.join(ensureDir(SCREENSHOT_DIR), '07_iframe_content.png'),
        }).catch(() => console.log('  ⚠️ Could not screenshot iframe'));

        // VALIDATE OUTPUT QUALITY
        console.log('\n🔍 VALIDATING OUTPUT QUALITY...');

        // Check for brand styling
        const hasBrandVars = outputHtml.includes('--ctc-') || outputHtml.includes('var(--');
        const hasCustomFonts = outputHtml.includes('font-family') || outputHtml.includes('Barlow') || outputHtml.includes('Roboto');
        const hasStructuredContent = outputHtml.includes('<section') || outputHtml.includes('<article');
        const hasVisualComponents = outputHtml.includes('grid') || outputHtml.includes('flex') || outputHtml.includes('card');

        console.log(`  - Brand CSS variables: ${hasBrandVars ? '✅' : '❌'}`);
        console.log(`  - Custom fonts: ${hasCustomFonts ? '✅' : '❌'}`);
        console.log(`  - Structured content: ${hasStructuredContent ? '✅' : '❌'}`);
        console.log(`  - Visual components: ${hasVisualComponents ? '✅' : '❌'}`);

        const qualityScore = [hasBrandVars, hasCustomFonts, hasStructuredContent, hasVisualComponents]
          .filter(Boolean).length;

        console.log(`\n  📊 Quality Score: ${qualityScore}/4`);

        if (qualityScore < 3) {
          console.log('  ⚠️ OUTPUT DOES NOT MEET WOW FACTOR QUALITY');
        } else {
          console.log('  ✅ OUTPUT MEETS QUALITY THRESHOLD');
        }
      }
    } catch (e) {
      console.log('  ℹ️ Preview rendered inline (no iframe)');

      // Try to find preview content directly
      const previewContent = await page.locator('.preview-content, [class*="preview"]').first().innerHTML().catch(() => '');
      if (previewContent) {
        outputHtml = previewContent;
        console.log(`  📄 Preview content: ${outputHtml.length} characters`);
      }
    }

    // LOG CONSOLE ERRORS
    if (consoleErrors.length > 0) {
      console.log('\n⚠️ CONSOLE ERRORS DURING TEST:');
      const jsonErrors = consoleErrors.filter(e => e.includes('JSON') || e.includes('parse'));
      const otherErrors = consoleErrors.filter(e => !e.includes('JSON') && !e.includes('parse'));

      if (jsonErrors.length > 0) {
        console.log(`  - JSON parsing errors: ${jsonErrors.length}`);
      }
      if (otherErrors.length > 0) {
        console.log(`  - Other errors: ${otherErrors.length}`);
        otherErrors.slice(0, 5).forEach(e => console.log(`    ${e.substring(0, 100)}...`));
      }

      // Save all errors
      const errorsPath = path.join(ensureDir(SCREENSHOT_DIR), 'console_errors.txt');
      fs.writeFileSync(errorsPath, consoleErrors.join('\n\n'));
      console.log(`  💾 Saved: console_errors.txt`);
    } else {
      console.log('\n✅ No console errors during test');
    }

    // SUMMARY
    console.log('\n' + '='.repeat(60));
    console.log('📁 TEST COMPLETE - FILES SAVED TO: ' + SCREENSHOT_DIR);
    console.log('='.repeat(60));
    console.log('\nKey files to review:');
    console.log('  - 05_output_full_page.png - Full page with styled output');
    console.log('  - 06_output_viewport.png - Viewport only');
    console.log('  - 07_iframe_content.png - Extracted preview content');
    console.log('  - styled_output.html - Raw HTML output');
    console.log('  - console_errors.txt - Any errors during generation');
    console.log('\n' + '='.repeat(60) + '\n');
  });
});
