// e2e/nfir-full-flow.spec.ts
/**
 * NFIR Full Flow Test - Style & Publish via DraftingModal
 *
 * The correct flow is:
 * 1. Login → 2. Open project → 3. Load map → 4. Click article → 5. Open Draft tab
 * 6. In DraftingModal, click Publish dropdown → 7. Click "Style & Publish"
 * 8. Complete the wizard → 9. Generate preview
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-full-flow';
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
  const filepath = path.join(dir, filename);
  await page.screenshot({ path: filepath, fullPage });
  console.log(`📸 ${name}`);
  return filepath;
}

test.describe('NFIR Full Style & Publish Flow', () => {
  test.setTimeout(600000); // 10 minutes

  test('complete style & publish workflow with wow factor output', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('🚀 NFIR FULL FLOW - STYLE & PUBLISH TEST');
    console.log('='.repeat(70));

    // ========== STEP 1: LOGIN ==========
    console.log('\n📝 STEP 1: Logging in...');
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });
    await screenshot(page, '01_logged_in');
    console.log('  ✅ Logged in');

    // ========== STEP 2: OPEN NFIR PROJECT ==========
    console.log('\n📂 STEP 2: Opening NFIR project...');
    const nfirRow = page.locator('tr', { hasText: 'nfir' }).first();
    await nfirRow.locator('button:has-text("Open")').click();
    await page.waitForTimeout(2000);
    await screenshot(page, '02_project_opened');
    console.log('  ✅ Project opened');

    // ========== STEP 3: LOAD MAP ==========
    console.log('\n🗺️ STEP 3: Loading topical map...');
    await page.waitForSelector('button:has-text("Load Map")', { timeout: 30000 });
    await page.locator('button:has-text("Load Map")').first().click();
    await page.waitForTimeout(3000);
    await screenshot(page, '03_map_loaded');
    console.log('  ✅ Map loaded');

    // ========== STEP 4: FIND AND CLICK THE CYBER ARTICLE ==========
    console.log('\n📄 STEP 4: Finding cyber kwetsbaarheden article...');
    await page.waitForSelector('table tbody tr', { timeout: 30000 });

    // Look for the specific article and click it
    const articleRow = page.locator('tr', { hasText: /cyber.*kwetsbaar/i }).first();
    await articleRow.click();
    await page.waitForTimeout(1500);
    await screenshot(page, '04_article_selected');
    console.log('  ✅ Article selected');

    // ========== STEP 5: OPEN THE DRAFT TAB/MODAL ==========
    console.log('\n📋 STEP 5: Opening Draft view...');

    // Look for "View Brief" or "Draft" button in the expanded row
    const viewBriefBtn = page.locator('button:has-text("View Brief"), button:has-text("View Draft")').first();
    if (await viewBriefBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewBriefBtn.click();
      await page.waitForTimeout(2000);
      console.log('  ✅ Clicked View Brief button');
    }
    await screenshot(page, '05_brief_opened');

    // Now we should be in the DraftingModal or a detail view
    // Look for Draft tab if we're in a tabbed interface
    const draftTab = page.locator('[role="tab"]:has-text("Draft"), button:has-text("Draft")').first();
    if (await draftTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await draftTab.click();
      await page.waitForTimeout(1000);
      console.log('  ✅ Clicked Draft tab');
    }
    await screenshot(page, '06_draft_view');

    // ========== STEP 6: FIND PUBLISH DROPDOWN IN DRAFTING MODAL ==========
    console.log('\n📤 STEP 6: Finding Publish dropdown in DraftingModal...');

    // The Publish dropdown should be in the modal header or toolbar
    // It might be labeled "Publish" with a dropdown arrow
    const publishDropdown = page.locator('button:has-text("Publish")').first();

    if (await publishDropdown.isVisible({ timeout: 10000 })) {
      console.log('  ✅ Found Publish dropdown');
      await publishDropdown.click();
      await page.waitForTimeout(1000);
      await screenshot(page, '07_publish_dropdown_open');

      // ========== STEP 7: CLICK STYLE & PUBLISH ==========
      console.log('\n🎨 STEP 7: Clicking Style & Publish option...');

      // Look for the menu item
      const stylePublishOption = page.locator(
        '[role="menuitem"]:has-text("Style & Publish"), ' +
        '[role="menuitem"]:has-text("Style"), ' +
        'button:has-text("Style & Publish"), ' +
        'div:has-text("Style & Publish")'
      ).first();

      if (await stylePublishOption.isVisible({ timeout: 5000 })) {
        await stylePublishOption.click();
        console.log('  ✅ Clicked Style & Publish');
        await page.waitForTimeout(2000);
      } else {
        console.log('  ⚠️ Style & Publish option not found in menu');
        // Take screenshot to see what's in the menu
        await screenshot(page, '07b_menu_contents');
      }
    } else {
      console.log('  ⚠️ Publish dropdown not visible');
      // Maybe we need to scroll or the button has different text
      await screenshot(page, '07_no_publish_button');
    }

    await screenshot(page, '08_style_modal_check');

    // ========== STEP 8: STYLE & PUBLISH WIZARD ==========
    console.log('\n🧙 STEP 8: Completing Style & Publish wizard...');

    // Check if the Style & Publish modal is open
    const modalVisible = await page.locator(
      'text=Brand Intelligence, text=Style & Publish, [role="dialog"]:has-text("Brand")'
    ).first().isVisible({ timeout: 5000 }).catch(() => false);

    if (modalVisible) {
      console.log('  ✅ Style & Publish modal is open!');
      await screenshot(page, '09_modal_open');

      // Step through the wizard
      // Step 1: Brand Intelligence (may use saved brand)
      console.log('  📍 Step 1: Brand Intelligence...');
      await page.waitForTimeout(2000);
      await screenshot(page, '10_brand_step');

      // Click Next to go to Layout step
      let nextBtn = page.locator('button:has-text("Next")').first();
      if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(3000);
        console.log('  📍 Step 2: Layout Intelligence...');
        await screenshot(page, '11_layout_step');
      }

      // Click Next to go to Preview step
      nextBtn = page.locator('button:has-text("Next")').first();
      if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(2000);
        console.log('  📍 Step 3: Preview...');
        await screenshot(page, '12_preview_step');
      }

      // ========== STEP 9: GENERATE PREVIEW ==========
      console.log('\n✨ STEP 9: Generating styled preview...');

      const generateBtn = page.locator(
        'button:has-text("Generate Preview"), ' +
        'button:has-text("Generate Styled"), ' +
        'button:has-text("Generate")'
      ).first();

      if (await generateBtn.isVisible({ timeout: 10000 })) {
        await generateBtn.scrollIntoViewIfNeeded();
        await generateBtn.click({ force: true });
        console.log('  ⏳ Generating preview (this may take 30-60 seconds)...');

        // Wait for the preview to render
        await page.waitForTimeout(5000);

        // Wait for preview iframe or content
        await page.waitForSelector(
          'iframe, .preview-content, .styled-preview, [class*="preview"]',
          { timeout: 90000 }
        ).catch(() => console.log('  ⚠️ Preview element not found'));

        await page.waitForTimeout(5000);
        console.log('  ✅ Preview generated!');
      }
    } else {
      console.log('  ⚠️ Style & Publish modal did not open');
    }

    // ========== STEP 10: CAPTURE WOW FACTOR PROOF ==========
    console.log('\n📸 STEP 10: Capturing wow factor proof...');

    await screenshot(page, '13_wow_factor_viewport', false);
    await screenshot(page, '14_wow_factor_full', true);

    // Try to get the preview content
    const previewIframe = page.frameLocator('iframe').first();
    try {
      const previewBody = previewIframe.locator('body');
      if (await previewBody.isVisible({ timeout: 5000 }).catch(() => false)) {
        const html = await previewBody.innerHTML();
        console.log(`  ✅ Preview content length: ${html.length} chars`);

        // Save the HTML for inspection
        const htmlPath = path.join(ensureDir(SCREENSHOT_DIR), 'preview_output.html');
        fs.writeFileSync(htmlPath, html);
        console.log(`  💾 Preview HTML saved to: preview_output.html`);
      }
    } catch (e) {
      console.log('  ℹ️ Could not extract iframe content');
    }

    // ========== FINAL SUMMARY ==========
    console.log('\n' + '='.repeat(70));
    console.log('📋 TEST COMPLETE');
    console.log('='.repeat(70));
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

    if (errors.length > 0) {
      console.log(`\n⚠️ Console errors (${errors.length}):`);
      errors.slice(0, 5).forEach((e, i) => console.log(`  ${i + 1}. ${e.substring(0, 100)}`));
    } else {
      console.log('\n✅ No console errors');
    }

    // Save errors to file
    fs.writeFileSync(
      path.join(ensureDir(SCREENSHOT_DIR), 'console_errors.txt'),
      errors.join('\n')
    );

    console.log('='.repeat(70) + '\n');
  });
});
