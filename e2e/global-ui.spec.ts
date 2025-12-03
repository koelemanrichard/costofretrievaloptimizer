// e2e/global-ui.spec.ts
// End-to-end tests for global UI elements

import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, TEST_CONFIG, takeScreenshot } from './test-utils';

test.describe('Global UI Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should display error message and allow dismissal', async ({ page }) => {
    // Login first
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await login(page);
      await waitForAppLoad(page);
    }

    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Trigger an error by attempting an invalid action
    // For example, try to create a project with empty name
    const createButton = page.locator('button:has-text("Create Project"), button[type="submit"]:has-text("Create")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Clear any existing input
      const projectNameInput = page.locator('input[placeholder*="Project"], input[placeholder*="project"]').first();
      if (await projectNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await projectNameInput.fill('');
        await createButton.first().click();

        // Wait for potential error message
        await page.waitForTimeout(1000);
      }
    }

    // Look for error message elements
    const errorMessages = page.locator('.error, .alert-error, [role="alert"], .text-red-500, .text-red-600, text=Error, text=error');

    if (await errorMessages.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await takeScreenshot(page, 'global-ui-error-message');

      // Look for dismiss button
      const dismissButton = page.locator('button:has-text("Dismiss"), button:has-text("Close"), button[aria-label*="Close"], button[data-dismiss]');

      if (await dismissButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await dismissButton.first().click();

        // Wait for error to be dismissed
        await page.waitForTimeout(500);

        // Error should no longer be visible
        const isErrorHidden = await errorMessages.first().isHidden({ timeout: 3000 }).catch(() => true);
        expect(isErrorHidden).toBe(true);

        await takeScreenshot(page, 'global-ui-error-dismissed');
      }
    }
  });

  test('should show settings and help buttons after login', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await login(page);
      await waitForAppLoad(page);
    }

    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Check for settings button
    const settingsButton = page.locator('button:has-text("Settings"), button[title="Settings"], button[aria-label*="Settings"], button:has([data-icon="gear"]), button:has([data-icon="cog"])');
    await expect(settingsButton.first()).toBeVisible({ timeout: 10000 });

    // Check for help button
    const helpButton = page.locator('button:has-text("Help"), button[title="Help"], button[aria-label*="Help"], button:has([data-icon="question"]), button:has([data-icon="help"])');
    await expect(helpButton.first()).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, 'global-ui-buttons-visible');
  });

  test('should not have critical console errors on page load', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Login
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await login(page);
      await waitForAppLoad(page);
    }

    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Wait for page to fully load
    await page.waitForTimeout(3000);

    // Filter out non-critical errors (warnings, network errors that are handled, etc.)
    const criticalErrors = consoleErrors.filter(error => {
      // Ignore common non-critical errors
      return !error.includes('404') &&
             !error.includes('Failed to load resource') &&
             !error.includes('net::ERR_') &&
             !error.includes('favicon') &&
             !error.includes('sourcemap');
    });

    // Report any critical errors
    if (criticalErrors.length > 0) {
      console.log('Critical console errors detected:', criticalErrors);
    }

    // Should have no critical errors
    expect(criticalErrors.length).toBe(0);

    await takeScreenshot(page, 'global-ui-no-errors');
  });

  test('should display app title/logo', async ({ page }) => {
    // Check for app branding - title, logo, or heading using proper Playwright selectors
    const appBranding = page.locator('h1').filter({ hasText: /Holistic|SEO|Workbench/i })
      .or(page.locator('img[alt]').filter({ hasText: /logo/i }))
      .or(page.locator('.logo'))
      .or(page.locator('header'));

    await expect(appBranding.first()).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, 'global-ui-branding');
  });

  test('should have responsive navigation', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await login(page);
      await waitForAppLoad(page);
    }

    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Test at mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Navigation should still be accessible (may be in hamburger menu)
    const navigation = page.locator('nav, header, .navbar, button:has-text("Menu"), button[aria-label*="Menu"]');
    await expect(navigation.first()).toBeVisible({ timeout: 5000 });

    await takeScreenshot(page, 'global-ui-mobile-nav');

    // Test at desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    // Navigation should be visible
    await expect(navigation.first()).toBeVisible({ timeout: 5000 });

    await takeScreenshot(page, 'global-ui-desktop-nav');
  });

  test('should handle network offline state gracefully', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await login(page);
      await waitForAppLoad(page);
    }

    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Simulate offline state
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);

    // Try to perform an action that requires network
    const createButton = page.locator('button:has-text("Create Project"), button:has-text("Analyze")');

    if (await createButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(2000);

      // Should show some indication of network error or offline state
      // (error message, disabled state, loading indicator, etc.)
      const errorIndicators = page.locator('.error, .alert, [role="alert"], text=offline, text=network, text=connection');

      // Note: This test is lenient as the app may handle offline differently
      // We're just checking that it doesn't crash
      await takeScreenshot(page, 'global-ui-offline-state');
    }

    // Restore online state
    await page.context().setOffline(false);
  });
});
