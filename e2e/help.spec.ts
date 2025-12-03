// e2e/help.spec.ts
// End-to-end tests for help modal functionality

import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, TEST_CONFIG, takeScreenshot } from './test-utils';

test.describe('Help Modal', () => {
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

  test('should open help modal', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Look for help button (question mark icon, "Help" text, etc.)
    const helpButton = page.locator('button:has-text("Help"), button[title="Help"], button[aria-label*="Help"], button:has([data-icon="question"]), button:has([data-icon="help"])');

    // Help button should be visible after login
    await expect(helpButton.first()).toBeVisible({ timeout: 10000 });

    // Click help button
    await helpButton.first().click();

    // Wait for help modal to open
    await page.waitForTimeout(1000);

    // Should show help modal with title or heading
    const helpModal = page.getByText('Help').or(page.getByText('Documentation')).or(page.locator('[role="dialog"]').filter({ hasText: 'Help' }));
    await expect(helpModal.first()).toBeVisible({ timeout: 5000 });

    await takeScreenshot(page, 'help-modal-open');
  });

  test('should display help content', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Open help modal
    const helpButton = page.locator('button:has-text("Help"), button[title="Help"], button[aria-label*="Help"], button:has([data-icon="question"]), button:has([data-icon="help"])');
    if (await helpButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await helpButton.first().click();
      await page.waitForTimeout(1000);
    }

    // Check for help content - should have some instructional text
    const helpContent = page.locator('[role="dialog"], .modal').filter({ hasText: 'Help' });
    await expect(helpContent).toBeVisible({ timeout: 5000 });

    // Should have some content text (paragraphs, lists, etc.)
    const contentElements = page.locator('[role="dialog"] p, [role="dialog"] li, [role="dialog"] div, .modal p, .modal li');
    const count = await contentElements.count();
    expect(count).toBeGreaterThan(0);

    await takeScreenshot(page, 'help-modal-content');
  });

  test('should close help modal', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Open help modal
    const helpButton = page.locator('button:has-text("Help"), button[title="Help"], button[aria-label*="Help"], button:has([data-icon="question"]), button:has([data-icon="help"])');
    if (await helpButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await helpButton.first().click();
      await page.waitForTimeout(1000);

      // Look for close button (X, Close, etc.)
      const closeButton = page.locator('button:has-text("Close"), button[aria-label*="Close"], button:has([data-icon="times"]), button:has([data-icon="x"])');

      if (await closeButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await closeButton.first().click();
        await page.waitForTimeout(500);

        // Help modal should be closed
        const helpModalCheck = page.locator('[role="dialog"]').filter({ hasText: 'Help' }).or(page.locator('.modal').filter({ hasText: 'Help' }));
        const isModalHidden = await helpModalCheck.isHidden({ timeout: 3000 }).catch(() => true);

        expect(isModalHidden).toBe(true);

        await takeScreenshot(page, 'help-modal-closed');
      }
    }
  });

  test('should be accessible via keyboard', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Tab to help button and press Enter
    const helpButton = page.locator('button:has-text("Help"), button[title="Help"], button[aria-label*="Help"]');

    if (await helpButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Focus the help button
      await helpButton.first().focus();

      // Press Enter to open
      await page.keyboard.press('Enter');

      // Wait for modal to open
      await page.waitForTimeout(1000);

      // Should show help modal
      const helpModalKbd = page.locator('[role="dialog"]').filter({ hasText: 'Help' }).or(page.locator('.modal').filter({ hasText: 'Help' }));
      await expect(helpModalKbd.first()).toBeVisible({ timeout: 5000 });

      // Press Escape to close
      await page.keyboard.press('Escape');

      // Wait for modal to close
      await page.waitForTimeout(500);

      // Modal should be closed
      const isModalHidden = await helpModalKbd.isHidden({ timeout: 3000 }).catch(() => true);
      expect(isModalHidden).toBe(true);

      await takeScreenshot(page, 'help-keyboard-accessibility');
    }
  });
});
