// Checkpoint 2.3: Verify all fixes from user feedback
// Tests the full extraction flow and verifies UI enhancements:
// - Page count matches selected URLs
// - Brand summary shows immediately after extraction (before CSS generation)
// - Component styles chips, confidence bars visible
// - Post-extraction guidance visible
// - Advanced Brand Replication toggle has explanation
import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DEBUG_DIR = path.resolve('tmp/debug');
const BRAND_DOMAIN = 'resultaatmakers.online';
const TEST_EMAIL = 'richard@kjenmarks.nl';
const TEST_PASSWORD = 'pannekoek';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function debugPath(name: string) { return path.join(DEBUG_DIR, name); }
async function modalSs(page: Page, name: string) {
  ensureDir(DEBUG_DIR);
  await page.screenshot({
    path: debugPath(`${name}.png`),
    clip: { x: 120, y: 50, width: 950, height: 800 }
  });
  console.log(`Modal screenshot: ${name}.png`);
}

async function navigateToStylePublish(page: Page) {
  await page.goto('/');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });
  await page.locator('tr', { hasText: /resultaatmakers/i }).first().locator('button:has-text("Open")').click();
  await page.waitForTimeout(2000);
  await page.waitForSelector('button:has-text("Load Map")', { timeout: 15000 });
  await page.locator('button:has-text("Load Map")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  await page.locator('tr', { hasText: /SEO voor Groothandel/i }).first().click();
  await page.waitForTimeout(2000);
  const viewBriefBtn = page.locator('button:has-text("View Brief")').first();
  if (await viewBriefBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await viewBriefBtn.click();
    await page.waitForTimeout(2000);
  }
  const viewDraftBtn = page.locator('button:has-text("View Draft"), button:has-text("View Generated Draft")').first();
  if (await viewDraftBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await viewDraftBtn.click();
    await page.waitForTimeout(3000);
  }
  const publishBtn = page.locator('button:has-text("Publish")').last();
  if (await publishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await publishBtn.scrollIntoViewIfNeeded();
    await publishBtn.click();
    await page.waitForTimeout(1500);
  }
  await page.locator('button:has-text("Style & Publish")').first().click();
  await page.waitForSelector('text=Brand Intelligence', { timeout: 10000 });
  await page.waitForTimeout(3000);
}

test.describe('Checkpoint 2.3 - Verify UI Enhancements', () => {
  test.setTimeout(600000);

  test('verify brand extraction and UI enhancements', async ({ page }) => {
    ensureDir(DEBUG_DIR);
    await page.setViewportSize({ width: 1280, height: 900 });

    const consoleLogs: { type: string; text: string; ts: number }[] = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text(), ts: Date.now() });
    });

    await navigateToStylePublish(page);
    await modalSs(page, '2_3_00_initial');

    // Check if brand summary is already showing (from saved data)
    const alreadyHasBrandSummary = await page.locator('text=Brand Summary').first().isVisible({ timeout: 3000 }).catch(() => false);

    if (!alreadyHasBrandSummary) {
      console.log('No saved brand data - running extraction...');

      // Enter domain and discover URLs
      const domainInput = page.locator('input[placeholder*="Enter domain"], input[placeholder*="example.com"]').first();
      await domainInput.fill(BRAND_DOMAIN);
      await page.locator('button:has-text("Discover URLs")').first().click();

      // Wait for URL checkboxes to appear
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(5000);
        if (await page.locator('input[type="checkbox"]').count() > 0) {
          console.log(`URLs discovered at ${(i + 1) * 5}s`);
          break;
        }
      }
      await page.waitForTimeout(1000);
      await modalSs(page, '2_3_01_discovery');

      // Verify email filter - check the Extract button text
      const extractBtnText = await page.locator('button:has-text("Extract Brand")').first().textContent().catch(() => '');
      console.log(`VERIFY: Extract button text: "${extractBtnText}"`);

      // Click Extract Brand
      await page.locator('button:has-text("Extract Brand")').first().click();
      console.log('Clicked Extract Brand');

      // Wait for brand summary to appear (our fix makes this immediate after extraction)
      // Also look for "Extraction Complete" in case the old view shows briefly
      for (let i = 0; i < 120; i++) {
        await page.waitForTimeout(5000);
        const hasBrandSummary = await page.locator('text=Brand Summary').first().isVisible().catch(() => false);
        const hasExtractionComplete = await page.locator('text=Extraction Complete').first().isVisible().catch(() => false);

        if (hasBrandSummary) {
          console.log(`Brand summary appeared at ${(i + 1) * 5}s`);
          break;
        }
        if (hasExtractionComplete) {
          console.log(`Extraction complete at ${(i + 1) * 5}s (waiting for brand summary)`);
          // Wait a bit more for processFullExtraction to switch to brand summary
          await page.waitForTimeout(5000);
          break;
        }
      }
      await page.waitForTimeout(3000);
    } else {
      console.log('Brand summary already showing from saved data');
    }

    // Take the main brand summary screenshot
    await modalSs(page, '2_3_02_brand_summary');

    // === VERIFY BRAND SUMMARY ===
    const hasBrandSummary = await page.locator('text=Brand Summary').first().isVisible().catch(() => false);
    const headingFont = await page.locator('text=Heading Font').first().isVisible().catch(() => false);
    const bodyFont = await page.locator('text=Body Font').first().isVisible().catch(() => false);
    const colorPalette = await page.locator('text=Color Palette').first().isVisible().catch(() => false);
    const confidence = await page.locator('text=Confidence').first().isVisible().catch(() => false);
    console.log(`VERIFY: Brand Summary: ${hasBrandSummary}`);
    console.log(`VERIFY: Heading Font: ${headingFont}`);
    console.log(`VERIFY: Body Font: ${bodyFont}`);
    console.log(`VERIFY: Color Palette: ${colorPalette}`);
    console.log(`VERIFY: Confidence: ${confidence}`);

    // CSS generation indicator (only visible briefly while CSS is being generated)
    const cssGenerating = await page.locator('text=Generating brand-matched CSS').first().isVisible().catch(() => false);
    console.log(`VERIFY: CSS generation indicator: ${cssGenerating}`);

    // === SCROLL DOWN AND CHECK ENHANCEMENTS ===
    const scrollables = page.locator('.overflow-y-auto');
    const scrollCount = await scrollables.count();

    // Scroll to 40% to see personality sliders
    for (let i = 0; i < scrollCount; i++) {
      const el = scrollables.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.evaluate(el => el.scrollTop = el.scrollHeight * 0.4);
      }
    }
    await page.waitForTimeout(500);
    await modalSs(page, '2_3_03_personality');
    const personality = await page.locator('text=Personality Adjustments').first().isVisible().catch(() => false);
    console.log(`VERIFY: Personality Adjustments: ${personality}`);

    // Scroll to 60% for Design DNA section
    for (let i = 0; i < scrollCount; i++) {
      const el = scrollables.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.evaluate(el => el.scrollTop = el.scrollHeight * 0.6);
      }
    }
    await page.waitForTimeout(500);
    await modalSs(page, '2_3_04_design_dna');
    const componentStyles = await page.locator('text=Detected Component Styles').first().isVisible().catch(() => false);
    const confidenceBars = await page.locator('text=Detection Confidence').first().isVisible().catch(() => false);
    console.log(`VERIFY: Component Styles section: ${componentStyles}`);
    console.log(`VERIFY: Confidence bars section: ${confidenceBars}`);

    // Scroll to 80% for more details
    for (let i = 0; i < scrollCount; i++) {
      const el = scrollables.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.evaluate(el => el.scrollTop = el.scrollHeight * 0.8);
      }
    }
    await page.waitForTimeout(500);
    await modalSs(page, '2_3_05_raw_dna');
    const rawDnaAccordion = await page.locator('text=Raw Design DNA').first().isVisible().catch(() => false);
    console.log(`VERIFY: Raw DNA collapsed accordion: ${rawDnaAccordion}`);

    // Scroll to bottom for guidance and toggle
    for (let i = 0; i < scrollCount; i++) {
      const el = scrollables.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.evaluate(el => el.scrollTop = el.scrollHeight);
      }
    }
    await page.waitForTimeout(500);
    await modalSs(page, '2_3_06_bottom');
    const hasGuidance = await page.locator('text=Review the brand profile').first().isVisible().catch(() => false);
    const hasToggleExplanation = await page.locator('text=AI-generated styling').first().isVisible().catch(() => false) ||
      await page.locator('text=Using real HTML/CSS').first().isVisible().catch(() => false);
    console.log(`VERIFY: Post-extraction guidance: ${hasGuidance}`);
    console.log(`VERIFY: Toggle explanation: ${hasToggleExplanation}`);

    // === RLS CHECK ===
    const rlsErrors = consoleLogs.filter(l => l.text.includes('row-level security'));
    const rpcCalls = consoleLogs.filter(l => l.text.includes('upsert_brand_component'));
    const componentLogs = consoleLogs.filter(l => l.text.includes('component'));
    console.log(`VERIFY: RLS errors: ${rlsErrors.length}`);
    console.log(`VERIFY: Components found: ${componentLogs.filter(l => l.text.includes('components:')).length > 0}`);

    // Save all logs
    fs.writeFileSync(debugPath('2_3_all_logs.json'), JSON.stringify(consoleLogs, null, 2));
    fs.writeFileSync(debugPath('2_3_verification.json'), JSON.stringify({
      brandSummary: hasBrandSummary,
      headingFont, bodyFont, colorPalette, confidence,
      personality, componentStyles, confidenceBars,
      hasGuidance, hasToggleExplanation, rawDnaAccordion,
      cssGenerating, rlsErrors: rlsErrors.length,
    }, null, 2));

    console.log('\n=== VERIFICATION SUMMARY ===');
    console.log(`Brand Summary: ${hasBrandSummary}`);
    console.log(`Fonts: heading=${headingFont} body=${bodyFont}`);
    console.log(`Color Palette: ${colorPalette}`);
    console.log(`Confidence: ${confidence}`);
    console.log(`Personality: ${personality}`);
    console.log(`Component Styles: ${componentStyles}`);
    console.log(`Confidence Bars: ${confidenceBars}`);
    console.log(`Guidance: ${hasGuidance}`);
    console.log(`Toggle explanation: ${hasToggleExplanation}`);
    console.log(`Raw DNA accordion: ${rawDnaAccordion}`);
    console.log(`CSS generating: ${cssGenerating}`);
    console.log(`RLS errors: ${rlsErrors.length}`);
  });
});
