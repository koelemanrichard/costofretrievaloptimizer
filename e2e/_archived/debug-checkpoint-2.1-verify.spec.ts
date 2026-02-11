// Verify fixes for checkpoint 2.1 - focused screenshots of the modal
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

async function navigateToStylePublish(page: Page) {
  await page.goto('/');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });

  const projectRow = page.locator('tr', { hasText: /resultaatmakers/i }).first();
  await projectRow.locator('button:has-text("Open")').click();
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
  const styleBtn = page.locator('button:has-text("Style & Publish")').first();
  if (await styleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await styleBtn.click();
  }
  await page.waitForSelector('text=Brand Intelligence', { timeout: 10000 });
  await page.waitForTimeout(2000);
}

test.describe('Verify 2.1 fixes', () => {
  test.setTimeout(300000);

  test('focused modal screenshots after URL discovery', async ({ page }) => {
    ensureDir(DEBUG_DIR);

    // Use larger viewport for clearer screenshots
    await page.setViewportSize({ width: 1280, height: 900 });

    await navigateToStylePublish(page);

    // Enter domain and discover
    const domainInput = page.locator('input[placeholder*="Enter domain"]').first();
    await domainInput.fill(BRAND_DOMAIN);
    const discoverBtn = page.locator('button:has-text("Discover URLs")').first();
    await discoverBtn.click();

    // Wait for URLs
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(5000);
      if (await page.locator('input[type="checkbox"]').count() > 0) break;
    }
    await page.waitForTimeout(1000);

    // Screenshot just the modal dialog (not the whole page)
    const modal = page.locator('[class*="modal"], [role="dialog"], .fixed.inset-0').first();

    // Try to find the modal container more specifically
    const modalContent = page.locator('text=Style & Publish').locator('..').locator('..').locator('..').locator('..');

    // Full page screenshot at high resolution
    await page.screenshot({
      path: debugPath('2_1_verify_full.png'),
      fullPage: false  // viewport only, not full page scroll
    });

    // Also clip just the center modal area
    await page.screenshot({
      path: debugPath('2_1_verify_modal.png'),
      clip: { x: 120, y: 50, width: 950, height: 800 }
    });

    // Scroll down inside the modal to see the Extract button
    const modalBody = page.locator('.overflow-y-auto').first();
    if (await modalBody.isVisible()) {
      await modalBody.evaluate(el => el.scrollTop = el.scrollHeight);
      await page.waitForTimeout(500);
      await page.screenshot({
        path: debugPath('2_1_verify_modal_scrolled.png'),
        clip: { x: 120, y: 50, width: 950, height: 800 }
      });
    }

    // Collect the text content of URL items to verify no email and prominence values
    const urlItems = await page.evaluate(() => {
      const items: { text: string }[] = [];
      document.querySelectorAll('label').forEach(label => {
        const text = label.textContent || '';
        if (text.includes('prominence') || text.includes('Discovered')) {
          items.push({ text: text.trim().replace(/\s+/g, ' ') });
        }
      });
      return items;
    });

    fs.writeFileSync(
      debugPath('2_1_verify_url_items.json'),
      JSON.stringify(urlItems, null, 2)
    );

    console.log('URL items found:', urlItems.length);
    for (const item of urlItems) {
      console.log('  -', item.text.substring(0, 120));
    }
  });
});
