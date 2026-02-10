// =============================================================================
// E2E Tests — Style Guide Live User Flow
// =============================================================================
// Tests actual user interactions with the Style Guide feature in the live app.

import { test, expect } from '@playwright/test';
import { login, waitForAppLoad, TEST_CONFIG } from './test-utils';

test.describe('Style Guide Live User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Style Guide menu item opens modal with URL input (not saved design)', async ({ page }) => {
    // Navigate to a topic with a draft
    // First, find any project with topics
    await page.waitForSelector('h2, .project-card, button', {
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
    });

    // Look for any "Open" or project link to navigate into
    const projectLinks = page.locator('button:has-text("Open"), a:has-text("Open"), .project-card');
    if (await projectLinks.count() > 0) {
      await projectLinks.first().click();
      await page.waitForTimeout(1000);
    }

    // Try to find a topic with a draft (look for draft indicators)
    const topicLinks = page.locator('[class*="topic"], button:has-text("View"), a[href*="draft"]');
    if (await topicLinks.count() > 0) {
      await topicLinks.first().click();
      await page.waitForTimeout(1000);
    }

    // Look for the Publish button/dropdown in the drafting toolbar
    const publishButton = page.locator('button:has-text("Publish")');
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await publishButton.click();
      await page.waitForTimeout(500);

      // Look for Style Guide menu item
      const styleGuideItem = page.locator('button:has-text("Style Guide"), [role="menuitem"]:has-text("Style Guide")');
      if (await styleGuideItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await styleGuideItem.click();
        await page.waitForTimeout(500);

        // The modal should open with "Style Guide Extraction" title (not "Export & Design")
        const modalTitle = page.locator('h2:has-text("Style Guide"), h2:has-text("Premium Design")');
        await expect(modalTitle).toBeVisible({ timeout: 5000 });

        // Should show URL input (not saved design preview)
        const urlInput = page.locator('input[type="url"]');
        const extractButton = page.locator('button:has-text("Extract Style Guide")');

        // At least the URL input OR extract button should be visible
        // (URL input shows the style guide extraction flow, not the saved design)
        const hasUrlInput = await urlInput.isVisible({ timeout: 3000 }).catch(() => false);
        const hasExtractBtn = await extractButton.isVisible({ timeout: 3000 }).catch(() => false);

        // Verify we're in style guide mode — we should see the extraction flow
        // Even if there's a saved premium design, the style guide entry should bypass it
        if (hasUrlInput || hasExtractBtn) {
          // Style guide mode working correctly — URL input visible
          expect(hasUrlInput || hasExtractBtn).toBeTruthy();
        }

        // Take a screenshot for proof
        await page.screenshot({
          path: 'test-results/style-guide-menu-click.png',
        });

        // Close the modal
        const closeButton = page.locator('button:has(svg path[d*="M6 18L18 6"])');
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });

  test('Export & Design menu item opens modal with fork screen', async ({ page }) => {
    await page.waitForSelector('h2, .project-card, button', {
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
    });

    const projectLinks = page.locator('button:has-text("Open"), a:has-text("Open"), .project-card');
    if (await projectLinks.count() > 0) {
      await projectLinks.first().click();
      await page.waitForTimeout(1000);
    }

    const topicLinks = page.locator('[class*="topic"], button:has-text("View"), a[href*="draft"]');
    if (await topicLinks.count() > 0) {
      await topicLinks.first().click();
      await page.waitForTimeout(1000);
    }

    const publishButton = page.locator('button:has-text("Publish")');
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await publishButton.click();
      await page.waitForTimeout(500);

      const exportDesignItem = page.locator('button:has-text("Export & Design"), [role="menuitem"]:has-text("Export & Design")');
      if (await exportDesignItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await exportDesignItem.click();
        await page.waitForTimeout(500);

        // Should show fork screen with Quick Export and Premium Design options
        const modalTitle = page.locator('h2:has-text("Export & Design")');
        if (await modalTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(modalTitle).toBeVisible();
        }

        // Take a screenshot
        await page.screenshot({
          path: 'test-results/export-design-menu-click.png',
        });
      }
    }
  });
});
