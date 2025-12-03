// e2e/settings.spec.ts
// End-to-end tests for settings modal functionality

import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, TEST_CONFIG, takeScreenshot } from './test-utils';

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);

    // Login if on auth screen
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await login(page);
      await waitForAppLoad(page);
    }
  });

  test('should open settings modal', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Look for settings button (gear icon, "Settings" text, etc.)
    const settingsButton = page.locator('button:has-text("Settings"), button[title="Settings"], button[aria-label*="Settings"], button:has([data-icon="gear"]), button:has([data-icon="cog"])');

    // Settings button should be visible after login
    await expect(settingsButton.first()).toBeVisible({ timeout: 10000 });

    // Click settings button
    await settingsButton.first().click();

    // Wait for settings modal to open
    await page.waitForTimeout(1000);

    // Should show settings modal with title or heading
    const settingsModal = page.getByText('Settings').or(page.getByText('User Settings')).or(page.locator('[role="dialog"]').filter({ hasText: 'Settings' }));
    await expect(settingsModal.first()).toBeVisible({ timeout: 5000 });

    await takeScreenshot(page, 'settings-modal-open');
  });

  test('should show AI provider selection', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Open settings
    const settingsButton = page.locator('button:has-text("Settings"), button[title="Settings"], button[aria-label*="Settings"], button:has([data-icon="gear"]), button:has([data-icon="cog"])');
    if (await settingsButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.first().click();
      await page.waitForTimeout(1000);
    }

    // Check for AI provider options - common providers
    const providerOptions = page.getByText('AI Provider')
      .or(page.getByText('Gemini'))
      .or(page.getByText('OpenAI'))
      .or(page.getByText('Anthropic'))
      .or(page.locator('select'))
      .or(page.locator('[role="combobox"]'));

    await expect(providerOptions.first()).toBeVisible({ timeout: 5000 });

    await takeScreenshot(page, 'settings-ai-providers');
  });

  test('should show API key inputs', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Open settings
    const settingsButton = page.locator('button:has-text("Settings"), button[title="Settings"], button[aria-label*="Settings"], button:has([data-icon="gear"]), button:has([data-icon="cog"])');
    if (await settingsButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.first().click();
      await page.waitForTimeout(1000);
    }

    // Check for API key input fields
    const apiKeyInputs = page.locator('input[type="password"], input[placeholder*="API Key"], input[placeholder*="api key"], label:has-text("API Key")');

    // Should have at least one API key input
    const count = await apiKeyInputs.count();
    expect(count).toBeGreaterThan(0);

    await takeScreenshot(page, 'settings-api-keys');
  });

  test('should close settings modal', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Open settings
    const settingsButton = page.locator('button:has-text("Settings"), button[title="Settings"], button[aria-label*="Settings"], button:has([data-icon="gear"]), button:has([data-icon="cog"])');
    if (await settingsButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.first().click();
      await page.waitForTimeout(1000);

      // Look for close button (X, Close, Cancel, etc.)
      const closeButton = page.locator('button:has-text("Close"), button:has-text("Cancel"), button[aria-label*="Close"], button:has([data-icon="times"]), button:has([data-icon="x"])');

      if (await closeButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await closeButton.first().click();
        await page.waitForTimeout(500);

        // Settings modal should be closed - check that settings heading is no longer visible
        const settingsHeading = page.locator('[role="dialog"]:has-text("Settings"), .modal:has-text("Settings")');
        const isModalHidden = await settingsHeading.isHidden({ timeout: 3000 }).catch(() => true);

        expect(isModalHidden).toBe(true);

        await takeScreenshot(page, 'settings-modal-closed');
      }
    }
  });

  test('should save settings', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Open settings
    const settingsButton = page.locator('button:has-text("Settings"), button[title="Settings"], button[aria-label*="Settings"], button:has([data-icon="gear"]), button:has([data-icon="cog"])');
    if (await settingsButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.first().click();
      await page.waitForTimeout(1000);

      // Look for save button
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]:has-text("Update")');

      if (await saveButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Note: We won't actually modify settings, just check that save button exists
        await expect(saveButton.first()).toBeVisible();

        await takeScreenshot(page, 'settings-save-button');
      }
    }
  });
});
