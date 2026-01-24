import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * HOLISTIC BRAND VERIFICATION TEST
 * This test simulates the Style & Publish flow to ensure:
 * 1. Detected Orange brand persists.
 * 2. Final HTML is clean (No Blue, No Tailwind).
 */

test('Verify Orange Brand Fidelity and Clean Export', async ({ page }) => {
    // 1. Visit the app
    await page.goto('http://localhost:3000'); // Assuming local dev

    // 2. Open Style & Publish Modal
    await page.click('button:has-text("Style & Publish")');

    // 3. Mock Brand Detection (Orange)
    await page.fill('input[placeholder*="your-website"]', 'https://daadvracht.nl');
    // We mock the response from the analyzer in our dev environment if possible, 
    // but here we assertion on the UI integration.

    // 4. Navigate to Step 4 (Preview)
    await page.click('button:has-text("Next")'); // Layout
    await page.click('button:has-text("Next")'); // Blueprint

    // 5. Select Personality (Bold Editorial)
    await page.click('button:has-text("Bold Editorial")');

    // 6. EXPORT & ASSERT
    await page.click('button:has-text("Copy Bundle")');

    // Get clipboard content
    const bundle = await page.evaluate(() => navigator.clipboard.readText());

    // ASSERTIONS
    expect(bundle).toContain('--ctc-primary');
    expect(bundle).not.toContain('#3b82f6'); // THE BLUE DEATH
    expect(bundle).not.toContain('cdn.tailwindcss.com'); // THE WARNING

    // Verify it contains Orange (roughly)
    // Assuming #EA580C is the detected orange from previous screenshots
    expect(bundle.toLowerCase()).toContain('orange');
});
