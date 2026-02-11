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
    const allowBtn = page.locator('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, button:has-text("Allow all")');
    await allowBtn.first().click({ timeout: 5000 });
    await page.waitForTimeout(1000);
  } catch {
    // no cookie dialog
  }
}

test.describe('NFIR Article Capture', () => {
  test.setTimeout(60000);

  test('capture actual article page', async ({ page }) => {
    const dir = ensureDir(DIR);
    
    // Try actual blog article URL
    await page.goto('https://www.nfir.nl/top-10-best-tips-voor-gegevensbeveiliging/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissCookie(page);
    await page.waitForTimeout(1000);

    // Log the actual URL after any redirects
    console.log('Landed on URL:', page.url());
    console.log('Page title:', await page.title());

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'blog_article_top.png') });

    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'blog_article_content.png') });

    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'blog_article_mid.png') });

    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'blog_article_lower.png') });

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'blog_article_full.png'), fullPage: true });

    console.log('Blog article captured');
  });

  test('capture pentest service page', async ({ page }) => {
    const dir = ensureDir(DIR);
    
    await page.goto('https://www.nfir.nl/pentesten/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissCookie(page);
    await page.waitForTimeout(1000);

    console.log('Landed on URL:', page.url());
    console.log('Page title:', await page.title());

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'pentest_service_top.png') });

    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'pentest_service_content.png') });

    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'pentest_service_mid.png') });

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'pentest_service_full.png'), fullPage: true });

    console.log('Pentest service page captured');
  });
});
