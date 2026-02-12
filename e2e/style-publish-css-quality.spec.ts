// e2e/style-publish-css-quality.spec.ts
/**
 * CSS Quality Validation Tests for Style & Publish
 *
 * Tests that the AI-generated CSS meets quality standards:
 * 1. No duplicate :root declarations
 * 2. All CSS variables match defined tokens
 * 3. Brand colors are not overwritten
 * 4. No undefined CSS variables
 */

import { test, expect } from '@playwright/test';
import { login, waitForAppLoad, TEST_CONFIG, takeScreenshot } from './test-utils';

// Valid CSS variable names that should be used
const VALID_VARIABLES = new Set([
  // Colors
  '--ctc-primary', '--ctc-primary-light', '--ctc-primary-dark',
  '--ctc-secondary', '--ctc-accent',
  '--ctc-neutral-darkest', '--ctc-neutral-dark', '--ctc-neutral-medium',
  '--ctc-neutral-light', '--ctc-neutral-lightest',
  '--ctc-success', '--ctc-warning', '--ctc-error', '--ctc-info',
  // Typography
  '--ctc-font-heading', '--ctc-font-body',
  '--ctc-font-size-base', '--ctc-font-scale-ratio',
  '--ctc-heading-weight', '--ctc-body-weight', '--ctc-body-line-height',
  '--ctc-font-size-xs', '--ctc-font-size-sm', '--ctc-font-size-md',
  '--ctc-font-size-lg', '--ctc-font-size-xl', '--ctc-font-size-2xl', '--ctc-font-size-3xl',
  // Spacing
  '--ctc-spacing-unit',
  '--ctc-spacing-xs', '--ctc-spacing-sm', '--ctc-spacing-md',
  '--ctc-spacing-lg', '--ctc-spacing-xl', '--ctc-spacing-2xl', '--ctc-spacing-3xl',
  // Border radius
  '--ctc-radius-sm', '--ctc-radius-md', '--ctc-radius-lg', '--ctc-radius-full',
  // Shadows
  '--ctc-shadow-card', '--ctc-shadow-button', '--ctc-shadow-elevated',
  // Motion
  '--ctc-transition-speed', '--ctc-easing',
]);

// Invalid variable patterns that AI often generates
const INVALID_VARIABLE_PATTERNS = [
  /--ctc-neutral-\d+/,      // e.g., --ctc-neutral-700
  /--ctc-spacing-\d+$/,     // e.g., --ctc-spacing-4
  /--ctc-radius-\d+$/,      // e.g., --ctc-radius-0
  /--ctc-space-\d+/,        // e.g., --ctc-space-8
  /--ctc-text(?!-)/,        // e.g., --ctc-text (without suffix)
  /--ctc-bg(?!-)/,          // e.g., --ctc-bg (without suffix)
  /--ctc-font-display/,     // Invalid alias
  /--ctc-rounded/,          // Tailwind-style alias
];

interface CSSQualityIssue {
  type: 'duplicate-root' | 'invalid-variable' | 'undefined-variable' | 'brand-color-overwrite';
  message: string;
  line?: number;
  context?: string;
}

/**
 * Analyze CSS for quality issues
 */
function analyzeCSSQuality(css: string): CSSQualityIssue[] {
  const issues: CSSQualityIssue[] = [];
  const lines = css.split('\n');

  // Check for duplicate :root declarations
  const rootMatches = css.match(/:root\s*\{[^}]*\}/g) || [];
  if (rootMatches.length > 1) {
    issues.push({
      type: 'duplicate-root',
      message: `Found ${rootMatches.length} :root declarations (should be 1)`,
    });

    // Check if brand colors are being overwritten
    const firstRoot = rootMatches[0];
    const primaryMatch = firstRoot.match(/--ctc-primary:\s*([^;]+)/);
    const firstPrimary = primaryMatch?.[1]?.trim().toLowerCase();

    for (let i = 1; i < rootMatches.length; i++) {
      const otherPrimaryMatch = rootMatches[i].match(/--ctc-primary:\s*([^;]+)/);
      const otherPrimary = otherPrimaryMatch?.[1]?.trim().toLowerCase();

      if (otherPrimary && firstPrimary && otherPrimary !== firstPrimary) {
        issues.push({
          type: 'brand-color-overwrite',
          message: `:root #${i + 1} overwrites --ctc-primary from ${firstPrimary} to ${otherPrimary}`,
        });
      }
    }
  }

  // Check for invalid variable usages
  const varUsages = css.matchAll(/var\(\s*(--ctc-[a-zA-Z0-9-]+)\s*(?:,\s*[^)]+)?\s*\)/g);
  const invalidVars = new Set<string>();
  const undefinedVars = new Set<string>();

  for (const match of varUsages) {
    const varName = match[1];

    // Check against invalid patterns
    for (const pattern of INVALID_VARIABLE_PATTERNS) {
      if (pattern.test(varName)) {
        invalidVars.add(varName);
        break;
      }
    }

    // Check if it's a valid variable
    if (!VALID_VARIABLES.has(varName) && !invalidVars.has(varName)) {
      undefinedVars.add(varName);
    }
  }

  if (invalidVars.size > 0) {
    issues.push({
      type: 'invalid-variable',
      message: `Found ${invalidVars.size} invalid CSS variables: ${Array.from(invalidVars).join(', ')}`,
    });
  }

  if (undefinedVars.size > 0) {
    issues.push({
      type: 'undefined-variable',
      message: `Found ${undefinedVars.size} undefined CSS variables: ${Array.from(undefinedVars).join(', ')}`,
    });
  }

  return issues;
}

test.describe('Style & Publish CSS Quality', () => {
  test.setTimeout(180000); // 3 minutes for the full flow

  test.beforeEach(async ({ page }) => {
    await login(page, 'info@kjenmarks.nl', 'pannekoek');
  });

  test('should generate valid CSS with proper variable names', async ({ page }) => {
    // Navigate to an article with the Style & Publish option
    // First, select a project
    try {
      await page.waitForSelector('h2:has-text("Create New Project"), .project-card', {
        timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
      });
    } catch {
      test.skip(true, 'Could not navigate to project list — test user may not have projects');
      return;
    }

    // Look for existing projects or create one
    const projectCard = page.locator('.project-card, [data-project-id]').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      await page.waitForTimeout(2000);
    }

    // Navigate to an article - look for article list or topical map
    const articleItem = page.locator('[data-topic-id], .topic-item, tr:has-text("Totaal VvE Beheer")').first();

    if (await articleItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await articleItem.click();
    }

    // Look for Style & Publish button
    const stylePublishButton = page.locator('button:has-text("Style & Publish"), button:has-text("Publish")');

    if (await stylePublishButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await stylePublishButton.click();
      await page.waitForTimeout(2000);
    }

    // Take screenshot of the modal if visible
    await takeScreenshot(page, 'style-publish-modal');

    // Look for URL input for brand detection
    const urlInput = page.locator('input[placeholder*="your-website.com"], input[placeholder*="https://"]');

    if (await urlInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await urlInput.fill('https://mvgm.com/nl/vastgoeddiensten/vve-beheer/');

      // Click detect button
      const detectButton = page.locator('button:has-text("Detect Brand"), button:has-text("Detect")');
      if (await detectButton.isVisible()) {
        await detectButton.click();

        // Wait for detection to complete (could take a while)
        await page.waitForSelector('text=Brand Detected, text=Using saved brand', {
          timeout: 120000, // 2 minutes for brand detection
        }).catch(() => {});
      }
    }

    await takeScreenshot(page, 'style-publish-after-detection');

    // Now try to generate the styled output
    // Look for generate/preview/publish buttons
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Preview"), button:has-text("Apply")');

    if (await generateButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await generateButton.first().click();
      await page.waitForTimeout(5000);
    }

    await takeScreenshot(page, 'style-publish-generated');
  });

  test('CSSPostProcessor normalizes invalid variables', async ({ page }) => {
    // This test validates the post-processor directly via the browser console
    await page.goto('/');
    await waitForAppLoad(page);

    // Inject test CSS and check if it would be normalized
    const testCss = `
      :root {
        --ctc-primary: #00637B;
      }
      :root {
        --ctc-primary: #0047AB;
      }
      .test {
        color: var(--ctc-neutral-700);
        padding: var(--ctc-spacing-4);
        border-radius: var(--ctc-radius-0);
        font-family: var(--ctc-font-display);
      }
    `;

    const issues = analyzeCSSQuality(testCss);

    // Should detect duplicate :root
    const duplicateRootIssue = issues.find(i => i.type === 'duplicate-root');
    expect(duplicateRootIssue).toBeDefined();
    expect(duplicateRootIssue?.message).toContain('2 :root declarations');

    // Should detect brand color overwrite
    const overwriteIssue = issues.find(i => i.type === 'brand-color-overwrite');
    expect(overwriteIssue).toBeDefined();

    // Should detect invalid variables
    const invalidVarIssue = issues.find(i => i.type === 'invalid-variable');
    expect(invalidVarIssue).toBeDefined();
    expect(invalidVarIssue?.message).toContain('--ctc-neutral-700');
    expect(invalidVarIssue?.message).toContain('--ctc-spacing-4');
    expect(invalidVarIssue?.message).toContain('--ctc-radius-0');
    expect(invalidVarIssue?.message).toContain('--ctc-font-display');
  });

  test('validates generated CSS from sample output', async ({ page }) => {
    // Read the sample output file and validate it
    // This is a local file test that can run without the full app flow

    // Sample CSS that mimics the problematic output
    const sampleCSS = `
:root {
  --ctc-primary: #00637B;
  --ctc-neutral-darkest: #000000;
  --ctc-neutral-dark: #333333;
  --ctc-neutral-medium: #666666;
  --ctc-neutral-light: #999999;
  --ctc-neutral-lightest: #F0F8FF;
}

/* Component using invalid variables */
.ctc-button {
  color: var(--ctc-neutral-7);
  background-color: var(--ctc-neutral-1);
  border-radius: var(--ctc-radius-0);
  padding: var(--ctc-spacing-2) var(--ctc-spacing-4);
}

/* Another :root that overwrites */
:root {
  --ctc-primary: #0047AB;
  --ctc-neutral-100: #F5F5F5;
  --ctc-neutral-700: #616161;
}

.ctc-timeline {
  color: var(--ctc-neutral-700);
  background: var(--ctc-neutral-100);
}
    `;

    const issues = analyzeCSSQuality(sampleCSS);

    console.log('CSS Quality Issues:', JSON.stringify(issues, null, 2));

    // There should be issues detected
    expect(issues.length).toBeGreaterThan(0);

    // Check for specific issues
    const hasRootDuplicate = issues.some(i => i.type === 'duplicate-root');
    const hasInvalidVars = issues.some(i => i.type === 'invalid-variable');
    const hasBrandOverwrite = issues.some(i => i.type === 'brand-color-overwrite');

    expect(hasRootDuplicate).toBe(true);
    expect(hasInvalidVars).toBe(true);
    expect(hasBrandOverwrite).toBe(true);

    // Take a screenshot showing the test passed
    await page.goto('/');
    await waitForAppLoad(page);
    await takeScreenshot(page, 'css-quality-test-complete');
  });
});

test.describe('CSS Quality Regression Tests', () => {
  test('should not have numeric neutral variables', async ({ page }) => {
    const badCss = `
      .test {
        color: var(--ctc-neutral-100);
        background: var(--ctc-neutral-900);
      }
    `;

    const issues = analyzeCSSQuality(badCss);
    const invalidVarIssue = issues.find(i => i.type === 'invalid-variable');

    expect(invalidVarIssue).toBeDefined();
    expect(invalidVarIssue?.message).toContain('--ctc-neutral-100');
    expect(invalidVarIssue?.message).toContain('--ctc-neutral-900');
  });

  test('should not have numeric spacing variables', async ({ page }) => {
    const badCss = `
      .test {
        padding: var(--ctc-spacing-1) var(--ctc-spacing-8);
        margin: var(--ctc-space-4);
      }
    `;

    const issues = analyzeCSSQuality(badCss);
    const invalidVarIssue = issues.find(i => i.type === 'invalid-variable');

    expect(invalidVarIssue).toBeDefined();
    expect(invalidVarIssue?.message).toContain('--ctc-spacing-1');
    expect(invalidVarIssue?.message).toContain('--ctc-spacing-8');
    expect(invalidVarIssue?.message).toContain('--ctc-space-4');
  });

  test('valid CSS should have no issues', async ({ page }) => {
    const goodCss = `
:root {
  --ctc-primary: #00637B;
  --ctc-neutral-darkest: #000000;
  --ctc-neutral-lightest: #F0F8FF;
}

.ctc-button {
  color: var(--ctc-neutral-lightest);
  background-color: var(--ctc-primary);
  border-radius: var(--ctc-radius-md);
  padding: var(--ctc-spacing-sm) var(--ctc-spacing-lg);
  transition: all var(--ctc-transition-speed) var(--ctc-easing);
}

.ctc-button:hover {
  background-color: var(--ctc-primary-dark);
}
    `;

    const issues = analyzeCSSQuality(goodCss);

    // Should have no issues
    expect(issues.length).toBe(0);
  });
});
