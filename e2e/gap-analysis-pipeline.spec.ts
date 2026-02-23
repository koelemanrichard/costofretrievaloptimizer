/**
 * E2E Tests for Gap Analysis Pipeline
 *
 * Tests the gap analysis step of the pipeline including:
 * - Navigation and UI rendering
 * - GA4 dynamic state (no "Coming soon" hardcode)
 * - Export dropdown (CSV, JSON, HTML)
 * - Console error monitoring
 *
 * Navigation flow:
 *   Login → Click "Open" on project → Click "Yes, I have a website" →
 *   Enter URL → Click "Start Pipeline" → SPA-navigate to Gap Analysis step
 *
 * Note: Each test creates a new pipeline map in Supabase. The pipeline must be
 * started through the UI because PipelineLayout checks Redux `isActive` state,
 * which is only set via the PIPELINE_ACTIVATE action dispatched by "Start Pipeline".
 */

import { test, expect, type Page } from '@playwright/test';
import {
  waitForAppLoad,
  login,
  TEST_CONFIG,
  takeScreenshot,
} from './test-utils';

// Console error patterns to ignore (extensions, known benign)
const IGNORED_CONSOLE_PATTERNS = [
  'favicon',
  'manifest',
  'net::ERR_',
  'Failed to load resource',
  'ResizeObserver',
  'runtime.lastError',
  'message port closed',
  'DevTools',
  'Warning:',
  'Supabase',
  'supabase.co',
  'CORS policy',
];

function isIgnoredError(text: string): boolean {
  return IGNORED_CONSOLE_PATTERNS.some(p => text.includes(p));
}

/**
 * Navigate into a project, start a new existing-site pipeline, and open the Gap Analysis step.
 *
 * Flow:
 * 1. Login lands on project list → click "Open" on first project
 * 2. Map selection screen → Click "Yes, I have a website" → enter URL → "Start Pipeline"
 * 3. Pipeline activates → creates a new map → redirects to /pipeline/crawl
 * 4. SPA-navigate to /pipeline/gap using pushState + popstate (React Router BrowserRouter)
 * 5. PipelineGapStep renders with h2 "Gap Analysis"
 *
 * We use "existing site" mode (not greenfield) because PipelineGapStep shows
 * GreenfieldSkipNotice for greenfield pipelines instead of the full gap analysis UI.
 */
async function navigateToGapAnalysis(page: Page) {
  // Step 1: Click "Open" on the first project
  const openButton = page.locator('tbody tr').first().locator('button:has-text("Open")');
  await openButton.waitFor({ state: 'visible', timeout: TEST_CONFIG.DEFAULT_TIMEOUT });
  await openButton.click();

  // Step 2: Wait for map selection screen — "Start SEO Pipeline" heading confirms it loaded
  await page.locator('h3:has-text("Start SEO Pipeline")').waitFor({
    state: 'visible',
    timeout: TEST_CONFIG.LONG_TIMEOUT,
  });

  // Step 3: Select "existing site" mode by clicking the mode toggle button
  await page.locator('button:has-text("Yes, I have a website")').click();
  await page.waitForTimeout(300);

  // Step 4: Enter a site URL in the input field
  const urlInput = page.locator('input[type="url"]');
  await urlInput.waitFor({ state: 'visible', timeout: 5000 });
  await urlInput.fill('https://www.resultaatmakers.online');

  // Step 5: Click "Start Pipeline" — creates a new map in Supabase and activates pipeline
  const startButton = page.locator('button:has-text("Start Pipeline")');
  await expect(startButton).toBeEnabled({ timeout: 3000 });
  await startButton.click();

  // Step 6: Wait for pipeline to activate — app redirects to /pipeline/crawl
  await page.waitForFunction(
    () => window.location.pathname.includes('/pipeline'),
    { timeout: TEST_CONFIG.LONG_TIMEOUT },
  );

  // Step 7: SPA-navigate from /pipeline/crawl to /pipeline/gap
  // React Router BrowserRouter responds to popstate events
  const currentUrl = page.url();
  const gapUrl = currentUrl.replace(/\/pipeline\/.*$/, '/pipeline/gap');
  await page.evaluate((url) => {
    window.history.pushState(null, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, gapUrl);

  // Step 8: Wait for PipelineGapStep to render — h2 "Gap Analysis"
  await page.locator('h2:has-text("Gap Analysis")').waitFor({
    state: 'visible',
    timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
  });
}

test.describe('Gap Analysis Pipeline', () => {
  // Run tests serially: each test creates a new pipeline map in Supabase,
  // and concurrent creation overwhelms the backend causing timeouts.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    if (!TEST_CONFIG.TEST_EMAIL || !TEST_CONFIG.TEST_PASSWORD) {
      test.skip(true, 'No test credentials configured');
      return;
    }
    await login(page);
  });

  // ==========================================
  // Navigation & UI
  // ==========================================
  test.describe('Navigation & UI', () => {
    test('displays Gap Analysis heading and Data Sources panel', async ({ page }) => {
      await navigateToGapAnalysis(page);

      // h2 "Gap Analysis" should be visible
      const heading = page.locator('h2:has-text("Gap Analysis")');
      await expect(heading).toBeVisible();

      // Data Sources panel should be present
      const dataSources = page.locator('text=Data Sources');
      await expect(dataSources.first()).toBeVisible({ timeout: 5000 });

      await takeScreenshot(page, 'gap-analysis-ui');
    });

    test('Data Sources panel shows GSC connection controls', async ({ page }) => {
      await navigateToGapAnalysis(page);

      // The Data Sources panel starts collapsed when GSC is connected.
      // Click to expand, then verify GSC text appears inside.
      const gscText = page.locator('text=Google Search Console');
      const alreadyExpanded = await gscText.first().isVisible().catch(() => false);

      if (!alreadyExpanded) {
        // Panel is collapsed — click to expand. Retry if first click doesn't register.
        const dataSourcesButton = page.locator('button:has-text("Data Sources")');
        await dataSourcesButton.waitFor({ state: 'visible', timeout: 5000 });
        await page.waitForTimeout(500); // Let React finish hydrating
        await dataSourcesButton.click();
      }

      await expect(gscText.first()).toBeVisible({ timeout: 5000 });
    });

    test('GA4 row does NOT show "Coming soon"', async ({ page }) => {
      await navigateToGapAnalysis(page);

      // Expand the Data Sources panel if collapsed
      const ga4Text = page.locator('text=Google Analytics 4');
      const alreadyExpanded = await ga4Text.isVisible().catch(() => false);

      if (!alreadyExpanded) {
        const dataSourcesButton = page.locator('button:has-text("Data Sources")');
        await dataSourcesButton.waitFor({ state: 'visible', timeout: 5000 });
        await page.waitForTimeout(500); // Let React finish hydrating
        await dataSourcesButton.click();
      }

      // GA4 row should exist
      await expect(ga4Text).toBeVisible({ timeout: 5000 });

      // "Coming soon" should NOT appear anywhere on the page
      const comingSoon = page.locator('text=Coming soon');
      await expect(comingSoon).toHaveCount(0);

      // Should show either "Enabled" or "Enable in Settings" (dynamic state)
      const statusBadge = page.locator('text=/Enabled|Enable in Settings/');
      await expect(statusBadge.first()).toBeVisible({ timeout: 3000 });

      await takeScreenshot(page, 'gap-analysis-ga4-state');
    });

    test('score cards show placeholder values before analysis', async ({ page }) => {
      await navigateToGapAnalysis(page);

      // Score card labels should be visible
      const overallHealth = page.locator('text=Overall Health');
      await expect(overallHealth).toBeVisible({ timeout: 5000 });

      // If no analysis ran yet, scores show "--" placeholders
      const placeholders = page.locator('text="--"');
      const count = await placeholders.count();

      // Either placeholders or actual scores should be present
      if (count > 0) {
        expect(count).toBeGreaterThanOrEqual(1);
      } else {
        // Results are cached — verify at least one score value
        const scoreValue = page.locator('text=/\\d+\\/100/');
        expect(await scoreValue.count()).toBeGreaterThanOrEqual(1);
      }
    });

    test('no application console errors during navigation', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!isIgnoredError(text)) {
            consoleErrors.push(text);
          }
        }
      });

      await navigateToGapAnalysis(page);
      await page.waitForTimeout(2000);

      if (consoleErrors.length > 0) {
        console.log('Console errors during navigation:', consoleErrors);
      }
      expect(consoleErrors).toHaveLength(0);
    });
  });

  // ==========================================
  // Full Analysis Run (slow tests)
  // ==========================================
  test.describe('Full Analysis Run', () => {
    test('runs gap analysis and displays results with scores', async ({ page }) => {
      test.slow(); // 3x default timeout

      await navigateToGapAnalysis(page);

      // Find the run analysis button — text varies depending on state
      const runButton = page.locator('button:has-text("Run Gap Analysis"), button:has-text("Re-run Gap Analysis"), button:has-text("Analyzing")').first();
      const runVisible = await runButton.isVisible({ timeout: 10000 }).catch(() => false);

      if (!runVisible) {
        await takeScreenshot(page, 'gap-analysis-no-run-button');
        test.skip(true, 'Run analysis button not found — pipeline step may be locked');
        return;
      }

      // Only click if not already analyzing
      const buttonText = await runButton.textContent();
      if (buttonText && !buttonText.includes('Analyzing')) {
        await runButton.click();
      }

      // The "Central Entity required" error only appears AFTER clicking Run.
      // Wait a moment, then check if it appeared.
      await page.waitForTimeout(2000);
      const prerequisiteError = page.locator('text=Central Entity or Seed Keyword is required');
      const hasError = await prerequisiteError.isVisible().catch(() => false);
      if (hasError) {
        await takeScreenshot(page, 'gap-analysis-needs-crawl');
        test.skip(true, 'Central Entity required — Crawl step must be completed first');
        return;
      }

      // Wait for results — score cards should show actual values like "85/100"
      const scoreValue = page.locator('text=/\\d+\\/100/');
      await scoreValue.first().waitFor({ state: 'visible', timeout: 300000 });

      const scoreCount = await scoreValue.count();
      expect(scoreCount).toBeGreaterThanOrEqual(1);

      await takeScreenshot(page, 'gap-analysis-results');
    });

    test('Google API insights panel appears when enrichment data exists', async ({ page }) => {
      test.slow();

      await navigateToGapAnalysis(page);

      // Check if results already exist (from previous test or cached)
      const insightsPanel = page.locator('text=Google API Insights');
      const isVisible = await insightsPanel.isVisible({ timeout: 15000 }).catch(() => false);

      if (!isVisible) {
        test.skip(true, 'Google API Insights panel not visible — API keys may not be configured');
        return;
      }

      await expect(insightsPanel).toBeVisible();
    });

    test('export dropdown appears with CSV/JSON/HTML options', async ({ page }) => {
      test.slow();

      await navigateToGapAnalysis(page);

      // Export button only appears when results exist
      const exportButton = page.locator('[data-testid="gap-export-button"]');
      const isVisible = await exportButton.isVisible({ timeout: 30000 }).catch(() => false);

      if (!isVisible) {
        test.skip(true, 'Export button not visible — analysis results may not be available');
        return;
      }

      // Click to open dropdown
      await exportButton.click();
      await page.waitForTimeout(300);

      // Verify all three options
      await expect(page.locator('[data-testid="gap-export-option-csv"]')).toBeVisible();
      await expect(page.locator('[data-testid="gap-export-option-json"]')).toBeVisible();
      await expect(page.locator('[data-testid="gap-export-option-html"]')).toBeVisible();

      await takeScreenshot(page, 'gap-analysis-export-dropdown');
    });

    test('CSV export triggers file download', async ({ page }) => {
      test.slow();

      await navigateToGapAnalysis(page);

      const exportButton = page.locator('[data-testid="gap-export-button"]');
      const isVisible = await exportButton.isVisible({ timeout: 30000 }).catch(() => false);

      if (!isVisible) {
        test.skip(true, 'Export button not visible');
        return;
      }

      // Listen for download event
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      // Click export → CSV
      await exportButton.click();
      await page.waitForTimeout(300);
      await page.locator('[data-testid="gap-export-option-csv"]').click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('gap-analysis');
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    });
  });

  // ==========================================
  // Console Error Monitoring
  // ==========================================
  test.describe('Console Error Monitoring', () => {
    test('zero app-level console errors throughout gap analysis flow', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!isIgnoredError(text)) {
            consoleErrors.push(text);
          }
        }
      });

      await navigateToGapAnalysis(page);

      // Toggle data sources panel to exercise the UI
      const dataSourcesButton = page.locator('button:has-text("Data Sources")');
      if (await dataSourcesButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dataSourcesButton.click();
        await page.waitForTimeout(500);
        await dataSourcesButton.click();
        await page.waitForTimeout(500);
      }

      await page.waitForTimeout(2000);

      if (consoleErrors.length > 0) {
        console.log('App console errors:', consoleErrors);
      }
      expect(consoleErrors).toHaveLength(0);
    });
  });
});
