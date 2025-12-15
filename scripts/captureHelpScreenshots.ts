/**
 * captureHelpScreenshots.ts
 *
 * Playwright script to capture screenshots for help documentation.
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/captureHelpScreenshots.ts
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'help-screenshots');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://blucvnmncvwzlwxoyoum.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Login credentials
const LOGIN_EMAIL = process.env.LOGIN_EMAIL || 'richard@kjenmarks.nl';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'pannekoek';

// Ensure directory exists
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Check if we're on the login page
async function isOnLoginPage(page: Page): Promise<boolean> {
  return await page.locator('#email').isVisible({ timeout: 2000 }).catch(() => false);
}

// Check if we're logged in (can see dashboard content)
async function isLoggedIn(page: Page): Promise<boolean> {
  // Look for elements that only appear when logged in
  const loggedInIndicators = [
    'text="Projects"',
    'button:has-text("New Project")',
    'text="Topical Maps"',
    '[data-testid="project-list"]',
    '.project-card',
    'text="No projects yet"'
  ];

  for (const selector of loggedInIndicators) {
    if (await page.locator(selector).first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return true;
    }
  }
  return false;
}

// Login function
async function login(page: Page): Promise<boolean> {
  console.log('🔐 Logging in...');

  try {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if already logged in
    if (await isLoggedIn(page)) {
      console.log('  ✅ Already logged in\n');
      return true;
    }

    // Check for login form
    if (!await isOnLoginPage(page)) {
      console.log('  ⚠️ Not on login page and not logged in\n');
      return false;
    }

    console.log('  Found login form, entering credentials...');

    // Ensure Sign In tab is selected
    const signInTab = page.locator('button:has-text("Sign In")').first();
    if (await signInTab.isVisible()) {
      await signInTab.click();
      await page.waitForTimeout(300);
    }

    // Fill credentials
    await page.locator('#email').fill(LOGIN_EMAIL);
    await page.locator('#password').fill(LOGIN_PASSWORD);

    console.log('  Submitting...');
    await page.locator('button[type="submit"]').click();

    // Wait for login to complete
    await page.waitForLoadState('networkidle');

    // Wait longer and check for dashboard
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      if (await isLoggedIn(page)) {
        console.log('  ✅ Login successful!\n');
        return true;
      }
      if (!await isOnLoginPage(page)) {
        // Navigated away but not seeing dashboard yet - keep waiting
        continue;
      }
    }

    // Check for error
    const error = await page.locator('.text-red-400').first().textContent().catch(() => null);
    if (error) {
      console.log(`  ❌ Login error: ${error}\n`);
    } else {
      console.log('  ⚠️ Login status uncertain\n');
    }

    return !await isOnLoginPage(page);
  } catch (error) {
    console.error('  ❌ Login error:', error);
    return false;
  }
}

// Screenshot configuration
interface ScreenshotConfig {
  id: string;
  category: string;
  articleSlug: string;
  name: string;
  altText: string;
  caption?: string;
  actions: (page: Page) => Promise<void>;
}

const SCREENSHOTS: ScreenshotConfig[] = [
  {
    id: 'dashboard-overview',
    category: 'project-management',
    articleSlug: 'managing-projects',
    name: 'dashboard-overview',
    altText: 'Project dashboard showing topic tree, analysis tools, and content metrics',
    caption: 'The main dashboard provides an overview of your content strategy',
    actions: async (page) => {
      // Should already be on dashboard after login
      // Wait for project list or dashboard content
      await page.waitForTimeout(2000);
    }
  },
  {
    id: 'new-project-modal',
    category: 'getting-started',
    articleSlug: 'creating-first-project',
    name: 'new-project-modal',
    altText: 'New project creation dialog',
    caption: 'Create a new project to start building your topical map',
    actions: async (page) => {
      // Click new project button if visible
      const newBtn = page.locator('button:has-text("New Project"), button:has-text("Create Project"), button:has-text("New")').first();
      if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  },
  {
    id: 'settings-modal',
    category: 'settings',
    articleSlug: 'api-keys',
    name: 'settings-modal',
    altText: 'Settings modal showing API key configuration',
    caption: 'Configure API keys for various AI providers',
    actions: async (page) => {
      // Look for settings button (gear icon or text)
      const settingsBtn = page.locator('button:has-text("Settings"), button[aria-label*="Settings"], [data-testid="settings-button"]').first();
      if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await settingsBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  }
];

// Capture screenshot
async function captureScreenshot(
  page: Page,
  config: ScreenshotConfig,
  supabase: ReturnType<typeof createClient> | null
): Promise<boolean> {
  console.log(`📸 Capturing: ${config.id}`);

  try {
    // Verify we're logged in
    if (await isOnLoginPage(page)) {
      console.log('  ⚠️ On login page - screenshot will show login screen');
    }

    // Run actions
    await config.actions(page);
    await page.waitForTimeout(500);

    // Capture
    const categoryDir = path.join(SCREENSHOT_DIR, config.category);
    ensureDir(categoryDir);
    const screenshotPath = path.join(categoryDir, `${config.name}.png`);

    const buffer = await page.screenshot({ type: 'png' });
    fs.writeFileSync(screenshotPath, buffer);
    console.log(`  💾 Saved: ${screenshotPath}`);

    // Upload to Supabase
    if (supabase) {
      const storagePath = `${config.category}/${config.articleSlug}/${config.name}.png`;
      const { error } = await supabase.storage
        .from('help-screenshots')
        .upload(storagePath, buffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) {
        console.log(`  ⚠️ Upload error: ${error.message}`);
      } else {
        console.log(`  ☁️ Uploaded: ${storagePath}`);
      }
    }

    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error}`);
    return false;
  }
}

// Main
async function main() {
  console.log('🚀 Help Screenshot Capture\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Login: ${LOGIN_EMAIL}\n`);

  ensureDir(SCREENSHOT_DIR);

  // Supabase client
  let supabase: ReturnType<typeof createClient> | null = null;
  if (SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('✅ Supabase initialized\n');
  }

  // Launch browser (not headless so we can debug)
  const browser = await chromium.launch({
    headless: false, // Set to true for production
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  // Login
  const loggedIn = await login(page);
  if (!loggedIn) {
    console.log('❌ Login failed - cannot capture authenticated screenshots');
    await browser.close();
    return;
  }

  // Take a test screenshot to verify what we see
  console.log('📸 Taking test screenshot to verify login state...');
  const testPath = path.join(SCREENSHOT_DIR, 'test-login-state.png');
  await page.screenshot({ path: testPath });
  console.log(`  Saved to: ${testPath}`);
  console.log('  Please check this file to verify we are logged in!\n');

  // Capture each screenshot
  let success = 0;
  let failed = 0;

  for (const config of SCREENSHOTS) {
    // Navigate back to base URL before each screenshot
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    if (await captureScreenshot(page, config, supabase)) {
      success++;
    } else {
      failed++;
    }
    console.log('');
  }

  await browser.close();

  console.log('\n📊 Summary:');
  console.log(`   Success: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n📁 Screenshots: ${SCREENSHOT_DIR}`);
}

main().catch(console.error);
