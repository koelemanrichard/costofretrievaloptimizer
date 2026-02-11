import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DIR = 'screenshots/nfir-brand-reference';

function ensureDir(dir: string) {
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

async function dismissCookie(page: any) {
  try {
    // Wait for and click "Allow all" on Cookiebot
    const allowBtn = page.locator('button:has-text("Allow all"), a:has-text("Allow all"), #CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
    await allowBtn.first().click({ timeout: 5000 });
    await page.waitForTimeout(1000);
  } catch {
    console.log('No cookie dialog found or already dismissed');
  }
}

async function capturePage(page: any, url: string, prefix: string) {
  const dir = ensureDir(DIR);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await dismissCookie(page);
  await page.waitForTimeout(1000);
  
  // Top of page
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(dir, `${prefix}_top.png`) });
  
  // Scroll down to content area
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(dir, `${prefix}_content.png`) });
  
  // Scroll further
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(dir, `${prefix}_mid.png`) });
  
  // Full page
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(dir, `${prefix}_full.png`), fullPage: true });
  
  console.log(`Captured: ${prefix}`);
}

test.describe('NFIR Brand Reference', () => {
  test.setTimeout(120000);

  test('capture homepage', async ({ page }) => {
    await capturePage(page, 'https://www.nfir.nl/', 'homepage');
  });

  test('capture penetratietest page', async ({ page }) => {
    await capturePage(page, 'https://www.nfir.nl/penetratietest/', 'pentest');
  });

  test('capture a blog/article page', async ({ page }) => {
    await capturePage(page, 'https://www.nfir.nl/kwetsbaarheden-bij-gemeenten/', 'article');
  });

  test('capture cybersecurity incident page', async ({ page }) => {
    await capturePage(page, 'https://www.nfir.nl/cybersecurity-incident/', 'incident');
  });
});
