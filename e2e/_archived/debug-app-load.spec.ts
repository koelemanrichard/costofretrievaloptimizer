// e2e/debug-app-load.spec.ts
/**
 * Debug test to check app loading and console errors
 */

import { test, expect } from '@playwright/test';

test.describe('Debug App Load', () => {
  test('should load app and capture any errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleLogs: string[] = [];

    // Capture console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    // Navigate to the app
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });

    // Wait a bit for any dynamic content
    await page.waitForTimeout(5000);

    // Take a screenshot
    await page.screenshot({ path: 'screenshots/debug-app-load.png', fullPage: true });

    // Get the page content
    const bodyContent = await page.locator('body').innerHTML();
    console.log('\n=== Page Body Content (first 500 chars) ===');
    console.log(bodyContent.substring(0, 500));

    // Log console errors
    if (consoleErrors.length > 0) {
      console.log('\n=== Console Errors ===');
      consoleErrors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    } else {
      console.log('\n=== No Console Errors ===');
    }

    // Log some console messages
    console.log('\n=== Console Logs (first 10) ===');
    consoleLogs.slice(0, 10).forEach((log, i) => console.log(`${i + 1}. ${log}`));

    // Check if the login form or main content is visible
    const loginForm = page.locator('input[type="email"]');
    const projectSelection = page.locator('h2:has-text("Create New Project")');

    const hasLoginForm = await loginForm.isVisible({ timeout: 5000 }).catch(() => false);
    const hasProjectSelection = await projectSelection.isVisible({ timeout: 5000 }).catch(() => false);

    console.log(`\n=== App State ===`);
    console.log(`Login form visible: ${hasLoginForm}`);
    console.log(`Project selection visible: ${hasProjectSelection}`);

    // This test is informational - it should help us understand what's happening
    expect(true).toBe(true);
  });
});
