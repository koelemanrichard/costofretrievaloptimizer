// e2e/test-utils.ts
// Shared utilities for E2E tests

import { Page, expect } from '@playwright/test';

/**
 * Test configuration - set these in .env.test or as environment variables
 */
export const TEST_CONFIG = {
  // Test user credentials (create a test user in Supabase)
  TEST_EMAIL: process.env.TEST_EMAIL || 'richard@kjenmarks.nl',
  TEST_PASSWORD: process.env.TEST_PASSWORD || 'pannekoek',

  // Supabase config (should match your dev environment)
  SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://shtqshmmsrmtquuhyupl.supabase.co',

  // Timeouts
  DEFAULT_TIMEOUT: 30000,
  LONG_TIMEOUT: 60000,
};

/**
 * Wait for the app to fully load
 */
export async function waitForAppLoad(page: Page) {
  // Wait for the app container to be present
  await page.waitForSelector('.min-h-screen.bg-gray-900', {
    timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
  });

  // Then wait for actual content - either auth form or project selection heading
  await page.waitForSelector('h1:has-text("Holistic SEO Workbench"), input[type="email"], .container', {
    timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
  }).catch(() => {
    // Fallback: just wait for the container
    return page.waitForSelector('.container', { timeout: TEST_CONFIG.DEFAULT_TIMEOUT });
  });
}

/**
 * Login to the application
 */
export async function login(page: Page, email?: string, password?: string) {
  const testEmail = email || TEST_CONFIG.TEST_EMAIL;
  const testPassword = password || TEST_CONFIG.TEST_PASSWORD;

  // Navigate to home
  await page.goto('/');
  await waitForAppLoad(page);

  // Fill in email and password
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  if (await emailInput.isVisible()) {
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);

    // Click login button - use the submit button inside the form (not the tab)
    const loginButton = page.locator('button[type="submit"]:has-text("Sign In")');
    await loginButton.click();

    // Wait for navigation to project selection - look for "Create New Project" heading
    await page.waitForSelector('h2:has-text("Create New Project"), h2:has-text("Site Analysis")', {
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
    }).catch(() => {
      // May already be logged in or auth failed
    });
  }
}

/**
 * Navigate to Site Analysis V2 tool
 */
export async function navigateToSiteAnalysis(page: Page) {
  // Look for "Open Site Analysis" button on the project selection screen
  const siteAnalysisButton = page.locator('button:has-text("Open Site Analysis")');

  if (await siteAnalysisButton.isVisible()) {
    await siteAnalysisButton.click();
  }

  // Wait for Site Analysis to load - look for the Site Analysis heading or input methods
  await page.waitForSelector('h2:has-text("Site Analysis"), text=Choose Input Method, text=URL Input', {
    timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
  });
}

/**
 * Check if an element exists and is visible
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector);
    return await element.isVisible({ timeout: 5000 });
  } catch {
    return false;
  }
}

/**
 * Wait for and dismiss any error modals/toasts
 */
export async function dismissErrors(page: Page) {
  const errorCloseButtons = page.locator('[data-dismiss="error"], .error-close, button:has-text("Dismiss")');
  const count = await errorCloseButtons.count();
  for (let i = 0; i < count; i++) {
    await errorCloseButtons.nth(i).click().catch(() => {});
  }
}

/**
 * Check if Supabase is reachable
 */
export async function checkSupabaseConnection(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get(`${TEST_CONFIG.SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
      },
    });
    return response.ok();
  } catch {
    return false;
  }
}

/**
 * Check if a Supabase function is deployed and responding
 */
export async function checkSupabaseFunction(page: Page, functionName: string): Promise<{ ok: boolean; status?: number }> {
  try {
    const response = await page.request.post(`${TEST_CONFIG.SUPABASE_URL}/functions/v1/${functionName}`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
      },
      data: {},
    });
    return { ok: response.status() !== 404, status: response.status() };
  } catch {
    return { ok: false };
  }
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
}
