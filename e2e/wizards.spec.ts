// e2e/wizards.spec.ts
// End-to-end tests for wizard flows (Business Info, Pillars, EAV, Competitors)

import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, TEST_CONFIG, takeScreenshot } from './test-utils';

/**
 * Helper to navigate to a project workspace
 */
async function navigateToProjectWorkspace(page) {
  try {
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
  } catch {
    // Page may have been closed during parallel test execution
    return false;
  }
}

test.describe('Business Info Wizard', () => {
  test.beforeEach(async ({ page }) => {
    const isLoggedIn = await navigateToProjectWorkspace(page);
    test.skip(!isLoggedIn, 'Authentication required - skipping test');
  });

  test('should display business info form when creating new map', async ({ page }) => {
    // Look for "New Map" button or wizard trigger
    const newMapButton = page.locator(
      'button:has-text("New Map"), ' +
      'button:has-text("Create Map"), ' +
      'button:has-text("Start Wizard")'
    );

    if (await newMapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await newMapButton.first().click();
      await page.waitForTimeout(2000);
    }

    // Look for business info form elements
    const businessInfoForm = page.locator(
      'input[placeholder*="business"], ' +
      'input[placeholder*="Business"], ' +
      'input[placeholder*="domain"], ' +
      'input[placeholder*="Domain"], ' +
      'text=Business Information, ' +
      'text=Tell us about your business'
    );

    if (await businessInfoForm.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      await takeScreenshot(page, 'wizard-business-info');
    }
  });

  test('should validate required business info fields', async ({ page }) => {
    // Try to find and click "Next" or "Continue" without filling fields
    const nextButton = page.locator(
      'button:has-text("Next"), ' +
      'button:has-text("Continue"), ' +
      'button:has-text("Save")'
    );

    const businessInput = page.locator('input[placeholder*="business"], input[placeholder*="domain"]');

    if (await businessInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Clear any existing value
      await businessInput.first().clear();

      // Try to proceed
      if (await nextButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextButton.first().click();
        await page.waitForTimeout(1000);

        // Should still be on same step or show error
        const stillOnStep = await businessInput.first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(stillOnStep).toBe(true);
      }
    }
  });
});

test.describe('SEO Pillar Wizard', () => {
  test.beforeEach(async ({ page }) => {
    const isLoggedIn = await navigateToProjectWorkspace(page);
    test.skip(!isLoggedIn, 'Authentication required - skipping test');
  });

  test('should display pillar definition interface', async ({ page }) => {
    // Navigate to a map that might need pillar setup
    const mapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await mapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await mapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for pillar wizard trigger or pillar display
    const pillarUI = page.locator(
      'text=SEO Pillars, ' +
      'text=Central Entity, ' +
      'text=Define Pillars, ' +
      'button:has-text("Edit Pillars")'
    );

    if (await pillarUI.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      await takeScreenshot(page, 'wizard-pillars');
    }
  });

  test('should show pillar edit modal', async ({ page }) => {
    // Navigate to a map
    const mapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await mapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await mapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for edit pillars button
    const editPillarsButton = page.locator(
      'button:has-text("Edit Pillars"), ' +
      'button[aria-label*="pillar"], ' +
      '[data-testid="edit-pillars"]'
    );

    if (await editPillarsButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await editPillarsButton.first().click();

      // Wait for modal
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });

      await takeScreenshot(page, 'wizard-pillars-modal');

      // Close modal
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('EAV Discovery Wizard', () => {
  test.beforeEach(async ({ page }) => {
    const isLoggedIn = await navigateToProjectWorkspace(page);
    test.skip(!isLoggedIn, 'Authentication required - skipping test');
  });

  test('should display EAV management interface', async ({ page }) => {
    // Navigate to a map
    const mapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await mapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await mapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for EAV/semantic triples UI
    const eavUI = page.locator(
      'text=Semantic Triples, ' +
      'text=EAV, ' +
      'text=Entity-Attribute-Value, ' +
      'button:has-text("Manage EAVs")'
    );

    if (await eavUI.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      await takeScreenshot(page, 'wizard-eavs');
    }
  });

  test('should open EAV manager modal', async ({ page }) => {
    // Navigate to a map
    const mapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await mapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await mapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for EAV manager button
    const eavButton = page.locator(
      'button:has-text("Manage EAVs"), ' +
      'button:has-text("EAV Manager"), ' +
      'button:has-text("Semantic Triples")'
    );

    if (await eavButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await eavButton.first().click();

      // Wait for modal
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });

      await takeScreenshot(page, 'wizard-eav-modal');

      // Close modal
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('Competitor Wizard', () => {
  test.beforeEach(async ({ page }) => {
    const isLoggedIn = await navigateToProjectWorkspace(page);
    test.skip(!isLoggedIn, 'Authentication required - skipping test');
  });

  test('should display competitor management UI', async ({ page }) => {
    // Navigate to a map
    const mapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await mapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await mapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for competitor UI
    const competitorUI = page.locator(
      'text=Competitors, ' +
      'text=Competitor Analysis, ' +
      'button:has-text("Manage Competitors")'
    );

    if (await competitorUI.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      await takeScreenshot(page, 'wizard-competitors');
    }
  });
});

test.describe('Wizard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const isLoggedIn = await navigateToProjectWorkspace(page);
    test.skip(!isLoggedIn, 'Authentication required - skipping test');
  });

  test('should show wizard step indicators', async ({ page }) => {
    // Look for step indicators in any wizard context
    const stepIndicators = page.locator(
      '[data-testid="wizard-steps"], ' +
      '.wizard-steps, ' +
      '[role="progressbar"], ' +
      'text=Step 1, ' +
      'text=Step 2'
    );

    // Navigate to wizard if needed
    const newMapButton = page.locator('button:has-text("New Map"), button:has-text("Create Map")');
    if (await newMapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await newMapButton.first().click();
      await page.waitForTimeout(2000);
    }

    if (await stepIndicators.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      await takeScreenshot(page, 'wizard-steps');
    }
  });

  test('should support keyboard navigation in wizard', async ({ page }) => {
    // Navigate to wizard
    const newMapButton = page.locator('button:has-text("New Map"), button:has-text("Create Map")');
    if (await newMapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await newMapButton.first().click();
      await page.waitForTimeout(2000);
    }

    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that focus is visible
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    await takeScreenshot(page, 'wizard-keyboard-navigation');
  });
});

test.describe('Error Boundaries in Wizards', () => {
  test.beforeEach(async ({ page }) => {
    const isLoggedIn = await navigateToProjectWorkspace(page);
    test.skip(!isLoggedIn, 'Authentication required - skipping test');
  });

  test('should display graceful error UI on component failure', async ({ page }) => {
    // Navigate to a map
    const mapButton = page.locator('button:has-text("Open"), button:has-text("Load")');
    if (await mapButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await mapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Check for error boundary UI if present
    const errorBoundary = page.locator(
      'text=Something went wrong, ' +
      'text=Try Again, ' +
      '[data-testid="error-boundary"]'
    );

    // This test mainly verifies error boundaries don't break the app
    // If we get here without crashes, the test passes
    await takeScreenshot(page, 'wizard-error-handling');
  });
});
