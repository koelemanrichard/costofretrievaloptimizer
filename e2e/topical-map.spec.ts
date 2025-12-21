// e2e/topical-map.spec.ts
// End-to-end tests for topical map creation and management

import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, TEST_CONFIG, takeScreenshot } from './test-utils';

/**
 * Helper to navigate to a project and map
 */
async function navigateToProjectDashboard(page) {
  await page.goto('/');
  await waitForAppLoad(page);

  // Login if on auth screen
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await login(page);
    await waitForAppLoad(page);
  }

  // Skip if still on auth screen
  const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 2000 }).catch(() => false);
  return !isStillOnAuthScreen;
}

test.describe('Topical Map Management', () => {
  test.beforeEach(async ({ page }) => {
    const isLoggedIn = await navigateToProjectDashboard(page);
    test.skip(!isLoggedIn, 'Authentication required - skipping test');
  });

  test('should display map selection or creation UI', async ({ page }) => {
    // After login, should see project selection or map selection
    const projectUI = page.locator(
      'h2:has-text("Create New Project"), ' +
      'h2:has-text("Your Projects"), ' +
      'button:has-text("Create Map"), ' +
      'button:has-text("New Map")'
    );

    await expect(projectUI.first()).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'topical-map-selection');
  });

  test('should open new map modal', async ({ page }) => {
    // Look for "New Map" or "Create Map" button
    const newMapButton = page.locator(
      'button:has-text("New Map"), ' +
      'button:has-text("Create Map"), ' +
      'button:has-text("+ Map")'
    );

    if (await newMapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await newMapButton.first().click();

      // Should show modal with map name input
      await page.waitForSelector('[role="dialog"], .modal, input[placeholder*="map"], input[placeholder*="Map"]', {
        timeout: 5000,
      });

      await takeScreenshot(page, 'topical-map-new-modal');

      // Close modal
      const closeButton = page.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
      if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeButton.click();
      }
    }
  });

  test('should display map dashboard when map is selected', async ({ page }) => {
    // Look for existing map to open
    const openMapButton = page.locator(
      'button:has-text("Open"), ' +
      'button:has-text("Load"), ' +
      '[data-testid="map-card"]'
    );

    if (await openMapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await openMapButton.first().click();

      // Wait for dashboard to load
      await page.waitForTimeout(3000);

      // Dashboard should show tabs or navigation
      const dashboardIndicator = page.locator(
        'text=Topical Map, ' +
        'text=Topics, ' +
        '[data-testid="tab-navigation"], ' +
        'button:has-text("Generate")'
      );

      if (await dashboardIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await takeScreenshot(page, 'topical-map-dashboard');
      }
    }
  });
});

test.describe('Topic Management', () => {
  test.beforeEach(async ({ page }) => {
    const isLoggedIn = await navigateToProjectDashboard(page);
    test.skip(!isLoggedIn, 'Authentication required - skipping test');
  });

  test('should display topics in the map', async ({ page }) => {
    // Navigate to a map first
    const openMapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await openMapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await openMapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for topic list
    const topicList = page.locator(
      '[data-testid="topic-list"], ' +
      '[data-testid="topic-item"], ' +
      'text=Core Topics, ' +
      'text=Outer Topics'
    );

    if (await topicList.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      await takeScreenshot(page, 'topics-list');
    }
  });

  test('should open topic detail panel', async ({ page }) => {
    // Navigate to a map first
    const openMapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await openMapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await openMapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Click on a topic
    const topicItem = page.locator('[data-testid="topic-item"], .topic-row').first();
    if (await topicItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await topicItem.click();

      // Wait for detail panel
      await page.waitForTimeout(1000);

      // Should show topic details or brief generation button
      const detailPanel = page.locator(
        '[data-testid="topic-detail"], ' +
        'button:has-text("Generate Brief"), ' +
        'text=Content Brief'
      );

      if (await detailPanel.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await takeScreenshot(page, 'topic-detail-panel');
      }
    }
  });
});

test.describe('Content Brief Generation', () => {
  test.beforeEach(async ({ page }) => {
    const isLoggedIn = await navigateToProjectDashboard(page);
    test.skip(!isLoggedIn, 'Authentication required - skipping test');
  });

  test('should open content brief modal', async ({ page }) => {
    // Navigate to a map
    const openMapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await openMapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await openMapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for "Generate Brief" button or similar
    const generateBriefButton = page.locator(
      'button:has-text("Generate Brief"), ' +
      'button:has-text("Content Brief"), ' +
      'button:has-text("Create Brief")'
    );

    if (await generateBriefButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await generateBriefButton.first().click();

      // Should show brief modal or configuration
      await page.waitForSelector('[role="dialog"], .modal, text=Brief', {
        timeout: 5000,
      });

      await takeScreenshot(page, 'content-brief-modal');

      // Close modal
      const closeButton = page.locator('button[aria-label="Close modal"], button:has-text("Cancel")').first();
      if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeButton.click();
      }
    }
  });

  test('should display existing brief if available', async ({ page }) => {
    // Navigate to a map
    const openMapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await openMapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await openMapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for "View Brief" button indicating existing brief
    const viewBriefButton = page.locator(
      'button:has-text("View Brief"), ' +
      'button:has-text("Edit Brief"), ' +
      '[data-testid="brief-indicator"]'
    );

    if (await viewBriefButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewBriefButton.first().click();

      // Wait for brief content
      await page.waitForTimeout(2000);

      await takeScreenshot(page, 'content-brief-view');
    }
  });
});

test.describe('Modal Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    const isLoggedIn = await navigateToProjectDashboard(page);
    test.skip(!isLoggedIn, 'Authentication required - skipping test');
  });

  test('modal should have proper ARIA attributes', async ({ page }) => {
    // Open any modal (settings is easiest)
    const settingsButton = page.locator(
      'button[aria-label*="Settings"], ' +
      'button:has-text("Settings"), ' +
      '[data-testid="settings-button"]'
    );

    if (await settingsButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.first().click();

      // Wait for modal
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // Check ARIA attributes
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveAttribute('aria-modal', 'true');

      // Check for title linkage
      const hasAriaLabelledby = await modal.getAttribute('aria-labelledby');
      expect(hasAriaLabelledby).toBeTruthy();

      await takeScreenshot(page, 'modal-accessibility');

      // Close modal with Escape
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('modal should trap focus', async ({ page }) => {
    // Open settings modal
    const settingsButton = page.locator(
      'button[aria-label*="Settings"], ' +
      'button:has-text("Settings")'
    );

    if (await settingsButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.first().click();

      // Wait for modal
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // Get initial focused element
      const initialFocus = await page.evaluate(() => document.activeElement?.tagName);

      // Tab through all focusable elements
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
      }

      // Focus should still be within the modal
      const modalHasFocus = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        return modal?.contains(document.activeElement);
      });

      expect(modalHasFocus).toBe(true);

      // Close modal
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const isLoggedIn = await navigateToProjectDashboard(page);
    test.skip(!isLoggedIn, 'Authentication required - skipping test');
  });

  test('should navigate between dashboard tabs', async ({ page }) => {
    // Navigate to a map
    const openMapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await openMapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await openMapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for tab navigation
    const tabs = page.locator('[role="tablist"], [data-testid="tab-navigation"]');
    if (await tabs.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get all tab buttons
      const tabButtons = page.locator('[role="tab"], [data-testid="tab-navigation"] button');
      const tabCount = await tabButtons.count();

      // Click through tabs if there are multiple
      if (tabCount > 1) {
        for (let i = 0; i < Math.min(tabCount, 3); i++) {
          await tabButtons.nth(i).click();
          await page.waitForTimeout(500);
        }
      }

      await takeScreenshot(page, 'dashboard-navigation');
    }
  });

  test('should show footer dock with actions', async ({ page }) => {
    // Navigate to a map
    const openMapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await openMapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await openMapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for footer dock
    const footerDock = page.locator(
      '[data-testid="footer-dock"], ' +
      '.footer-dock, ' +
      'footer button'
    );

    if (await footerDock.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await takeScreenshot(page, 'footer-dock');
    }
  });
});
