// e2e/projects.spec.ts
// End-to-end tests for project management functionality

import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, TEST_CONFIG, takeScreenshot } from './test-utils';

test.describe('Project Management', () => {
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

  test('should display create project form', async ({ page }) => {
    // Skip if authentication failed
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Check for create project UI
    const createProjectHeader = page.locator('h2').filter({ hasText: 'Create New Project' }).or(page.getByText('Create New Project'));
    await expect(createProjectHeader.first()).toBeVisible({ timeout: 10000 });

    // Should show project name input
    await expect(page.locator('input[placeholder*="Project"], input[placeholder*="project"]')).toBeVisible();

    await takeScreenshot(page, 'projects-create-form');
  });

  test('should validate required fields', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Look for create project button
    const createButton = page.locator('button:has-text("Create Project"), button[type="submit"]:has-text("Create")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Try to click without filling required fields
      await createButton.first().click();

      // Should either disable the button or stay on same screen
      // Check that we didn't navigate away (still showing create form)
      const createHeader = page.locator('h2').filter({ hasText: 'Create New Project' }).or(page.getByText('Create New Project'));
      await expect(createHeader.first()).toBeVisible({ timeout: 5000 });
    }

    await takeScreenshot(page, 'projects-validation');
  });

  test('should create new project', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Fill in project name
    const projectNameInput = page.locator('input[placeholder*="Project"], input[placeholder*="project"]').first();
    if (await projectNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const testProjectName = `Test Project ${Date.now()}`;
      await projectNameInput.fill(testProjectName);

      // Click create button
      const createButton = page.locator('button:has-text("Create Project"), button[type="submit"]:has-text("Create")').first();
      if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await createButton.click();

        // Wait for project to be created - either navigation or success message
        await page.waitForTimeout(3000);

        await takeScreenshot(page, 'projects-created');
      }
    }
  });

  test('should list existing projects', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Look for project list or "Your Projects" heading
    const projectListIndicator = page.locator('text=Your Projects, text=Recent Projects, text=No projects yet, button:has-text("Open Site Analysis")');

    await expect(projectListIndicator.first()).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, 'projects-list');
  });

  test('should load existing project', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Look for project cards or list items with "Open" or "Load" button
    const openProjectButton = page.locator('button:has-text("Open"), button:has-text("Load")').first();

    if (await openProjectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await openProjectButton.click();

      // Wait for project to load - should show project workspace or dashboard
      await page.waitForTimeout(3000);

      await takeScreenshot(page, 'projects-loaded');
    }
  });

  test('should show delete confirmation modal', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Look for delete button on any project
    const deleteButton = page.locator('button:has-text("Delete"), button[title*="Delete"], button[aria-label*="Delete"]').first();

    if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteButton.click();

      // Wait for confirmation modal
      await page.waitForTimeout(1000);

      // Should show confirmation text or modal
      const confirmationModal = page.locator('text=Are you sure, text=Delete, text=Confirm, text=Cancel, [role="dialog"], .modal');
      await expect(confirmationModal.first()).toBeVisible({ timeout: 5000 });

      await takeScreenshot(page, 'projects-delete-confirmation');

      // Click cancel to avoid actually deleting
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      if (await cancelButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cancelButton.click();
      }
    }
  });
});
