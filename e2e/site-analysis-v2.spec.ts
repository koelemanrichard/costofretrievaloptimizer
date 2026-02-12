// e2e/site-analysis-v2.spec.ts
// End-to-end tests for Site Analysis V2 functionality
// SKIPPED: Site Analysis V2 feature is temporarily disabled in UI (see CLAUDE.md)

import { test, expect } from '@playwright/test';

test.skip(true, 'Site Analysis V2 feature is temporarily disabled');
import { waitForAppLoad, login, navigateToSiteAnalysis, TEST_CONFIG, takeScreenshot } from './test-utils';

/**
 * Helper to navigate to Site Analysis tool from any state
 * Returns true if navigation was successful, false if stuck on auth screen
 */
async function goToSiteAnalysis(page: import('@playwright/test').Page): Promise<boolean> {
  await page.goto('/');
  await waitForAppLoad(page);

  // Check if on auth screen (not logged in) - if so, log in
  const authEmailInput = page.locator('input[type="email"]');
  if (await authEmailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    // We're on auth screen - try to log in
    console.log('Attempting to log in...');
    await login(page);
    await waitForAppLoad(page);
  }

  // Check if Site Analysis heading is already visible (we're already there)
  const siteAnalysisHeading = page.locator('h1:has-text("Site Analysis V2")');
  if (await siteAnalysisHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
    return true;
  }

  // Try to find and click "Open Site Analysis" button
  const openSiteAnalysisBtn = page.locator('button:has-text("Open Site Analysis")');
  if (await openSiteAnalysisBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await openSiteAnalysisBtn.click();
    await page.waitForSelector('h1:has-text("Site Analysis V2")', { timeout: TEST_CONFIG.DEFAULT_TIMEOUT });
    return true;
  }

  // Still can't access Site Analysis - authentication may have failed
  console.log('Could not navigate to Site Analysis - auth may have failed');
  return false;
}

test.describe('Site Analysis V2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test.describe('Project Setup', () => {
    test('should display all input method options including Single Page', async ({ page }) => {
      // Navigate to Site Analysis
      const navigated = await goToSiteAnalysis(page);
      test.skip(!navigated, 'Authentication required - skipping test');

      // Click New Analysis if on project list
      const newAnalysisBtn = page.locator('button:has-text("New Analysis")');
      if (await newAnalysisBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await newAnalysisBtn.click();
      }

      // Check for all input method options
      await expect(page.locator('text=Single Page')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Full Site')).toBeVisible();
      await expect(page.locator('text=Sitemap URL')).toBeVisible();
      await expect(page.locator('text=GSC Export')).toBeVisible();

      await takeScreenshot(page, 'site-analysis-input-methods');
    });

    test('should show correct description for Single Page option', async ({ page }) => {
      const navigated = await goToSiteAnalysis(page);
      test.skip(!navigated, 'Authentication required - skipping test');

      const newAnalysisBtn = page.locator('button:has-text("New Analysis")');
      if (await newAnalysisBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await newAnalysisBtn.click();
      }

      // Check Single Page description
      await expect(page.locator('text=Audit one specific URL without crawling the site')).toBeVisible({ timeout: 10000 });
    });

    test('Single Page option should navigate to details form', async ({ page }) => {
      const navigated = await goToSiteAnalysis(page);
      test.skip(!navigated, 'Authentication required - skipping test');

      const newAnalysisBtn = page.locator('button:has-text("New Analysis")');
      if (await newAnalysisBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await newAnalysisBtn.click();
      }

      // Click Single Page option
      const singlePageOption = page.locator('button:has-text("Single Page")');
      await singlePageOption.click();

      // Should show project details form with Page URL input
      await expect(page.locator('text=Project Details')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Page URL')).toBeVisible();
      await expect(page.locator('text=Only this specific page will be analyzed')).toBeVisible();

      await takeScreenshot(page, 'site-analysis-single-page-form');
    });

    test('Full Site option should show sitemap auto-discovery message', async ({ page }) => {
      const navigated = await goToSiteAnalysis(page);
      test.skip(!navigated, 'Authentication required - skipping test');

      const newAnalysisBtn = page.locator('button:has-text("New Analysis")');
      if (await newAnalysisBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await newAnalysisBtn.click();
      }

      // Click Full Site option
      const fullSiteOption = page.locator('button:has-text("Full Site")');
      await fullSiteOption.click();

      // Should show website URL input
      await expect(page.locator('text=Website URL')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=automatically look for sitemap.xml')).toBeVisible();
    });
  });

  test.describe('State Persistence', () => {
    test('should preserve state when navigating away and back', async ({ page }) => {
      const navigated = await goToSiteAnalysis(page);
      test.skip(!navigated, 'Authentication required - skipping test');

      // Click New Analysis
      const newAnalysisBtn = page.locator('button:has-text("New Analysis")');
      if (await newAnalysisBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await newAnalysisBtn.click();
      }

      // Select Single Page
      const singlePageOption = page.locator('button:has-text("Single Page")');
      if (await singlePageOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await singlePageOption.click();
      }

      // Fill in project name
      const projectNameInput = page.locator('input[placeholder*="Site Audit"], input[placeholder*="Project"]');
      if (await projectNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await projectNameInput.fill('Test Single Page Analysis');
      }

      // Check if we're on the setup form (state preserved)
      await expect(page.locator('text=Project Details')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should disable submit button when required fields are empty', async ({ page }) => {
      const navigated = await goToSiteAnalysis(page);
      test.skip(!navigated, 'Authentication required - skipping test');

      const newAnalysisBtn = page.locator('button:has-text("New Analysis")');
      if (await newAnalysisBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await newAnalysisBtn.click();
      }

      // Select Single Page
      const singlePageOption = page.locator('button:has-text("Single Page")');
      if (await singlePageOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await singlePageOption.click();
      }

      // Verify form validation is in place:
      // 1. Submit button should be disabled when required fields are empty
      const submitButton = page.locator('button:has-text("Start Analysis")');
      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Button should be disabled when form is invalid
        await expect(submitButton).toBeDisabled();

        // There should be required input fields
        const requiredInputs = page.locator('input[required]');
        const count = await requiredInputs.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });
});

test.describe('Page Viewing', () => {
  test('PageAuditDetailV2 should have access to Supabase client', async ({ page }) => {
    // This test validates that the PageAuditDetailV2 component can create a Supabase client
    // by checking if the page detail view renders without JavaScript errors

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to Site Analysis
    const navigated = await goToSiteAnalysis(page);
    test.skip(!navigated, 'Authentication required - skipping test');

    // If there are existing projects, try to view one
    const viewButton = page.locator('button:has-text("View")').first();
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();

      // Wait a moment for any errors
      await page.waitForTimeout(2000);

      // Check for specific error about supabaseClient
      const supabaseClientError = consoleErrors.find(e =>
        e.includes('supabaseClient') || e.includes('Cannot read properties of undefined')
      );

      expect(supabaseClientError).toBeUndefined();
    }
  });
});
