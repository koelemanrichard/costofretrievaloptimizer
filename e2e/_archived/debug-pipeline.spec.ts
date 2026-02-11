// e2e/debug-pipeline.spec.ts
/**
 * Interactive Pipeline Debugging - Style & Publish
 *
 * Navigates to "SEO voor Groothandel" in Resultaatmakers project,
 * opens Style & Publish modal, then debugs each pipeline stage.
 *
 * Run individual checkpoints: npx playwright test e2e/debug-pipeline.spec.ts -g "2.1"
 */

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

function debugPath(name: string) {
  return path.join(DEBUG_DIR, name);
}

async function ss(page: Page, name: string, full = true) {
  ensureDir(DEBUG_DIR);
  await page.screenshot({ path: debugPath(`${name}.png`), fullPage: full });
  console.log(`Screenshot: ${name}.png`);
}

/**
 * Login → Resultaatmakers → Load Map → SEO voor Groothandel → View Draft → Style & Publish
 */
async function navigateToStylePublish(page: Page) {
  await page.goto('/');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });

  // Open Resultaatmakers project
  const projectRow = page.locator('tr', { hasText: /resultaatmakers/i }).first();
  await projectRow.locator('button:has-text("Open")').click();
  await page.waitForTimeout(2000);

  // Load first map
  await page.waitForSelector('button:has-text("Load Map")', { timeout: 15000 });
  await page.locator('button:has-text("Load Map")').first().click();
  await page.waitForTimeout(3000);

  // Select "SEO voor Groothandel" topic
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  const topicRow = page.locator('tr', { hasText: /SEO voor Groothandel/i }).first();
  await topicRow.click();
  await page.waitForTimeout(2000);

  // Open brief modal → View Draft
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

  // Open Publish dropdown (UpwardDropdownMenu renders plain <button> items)
  const publishBtn = page.locator('button:has-text("Publish")').last();
  if (await publishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await publishBtn.scrollIntoViewIfNeeded();
    await publishBtn.click();
    await page.waitForTimeout(1500);
  }

  // Click "Style & Publish" (plain <button> in UpwardDropdownMenu)
  const styleBtn = page.locator('button:has-text("Style & Publish")').first();
  if (await styleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await styleBtn.click();
  }

  // Wait for modal to appear
  await page.waitForSelector('text=Brand Intelligence', { timeout: 10000 });
  await page.waitForTimeout(2000);
}

// ─────────────────────────────────────────────
// PHASE 2: Brand Discovery
// ─────────────────────────────────────────────

test.describe('Pipeline Debug', () => {
  test.setTimeout(300000); // 5 min

  test('2.1 - Enter brand domain and start URL discovery', async ({ page }) => {
    const consoleLogs: { type: string; text: string }[] = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    });

    await navigateToStylePublish(page);
    await ss(page, '2_1a_modal_open');

    // "Full Extraction (Recommended)" tab should be active
    // Domain input: placeholder="Enter domain (e.g., example.com)"
    const domainInput = page.locator('input[placeholder*="Enter domain"]').first();
    await domainInput.waitFor({ state: 'visible', timeout: 5000 });
    await domainInput.fill(BRAND_DOMAIN);
    await ss(page, '2_1b_domain_entered');

    // Click "Discover URLs"
    const discoverBtn = page.locator('button:has-text("Discover URLs")').first();
    await discoverBtn.click();
    console.log('Clicked Discover URLs...');
    await page.waitForTimeout(5000);
    await ss(page, '2_1c_discovering');

    // Wait for URLs to appear (Apify crawl - can take 15-60s)
    let found = false;
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(5000);
      // Look for checkboxes (URL list items) or any URL-like text
      const checkboxCount = await page.locator('input[type="checkbox"]').count();
      if (checkboxCount > 0) {
        found = true;
        console.log(`URLs discovered after ${(i + 1) * 5}s: ${checkboxCount} items`);
        break;
      }
    }
    await ss(page, '2_1d_urls_discovered');

    // Save logs
    ensureDir(DEBUG_DIR);
    fs.writeFileSync(
      debugPath('2_1_console_logs.json'),
      JSON.stringify(consoleLogs.filter(l =>
        l.text.includes('[') || l.type === 'error'
      ), null, 2)
    );

    console.log(`Discovery done: ${found}`);
  });
});
