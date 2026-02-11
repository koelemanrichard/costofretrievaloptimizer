// e2e/nfir-proof-capture.spec.ts
/**
 * Opens the rendered HTML output directly in browser and captures proof screenshots
 */
import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/nfir-proof';
const HTML_FILE = path.resolve('screenshots/nfir-regenerate/regenerated_output.html');

function ensureDir(dir: string) {
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

async function ss(page: any, name: string, full = false) {
  const dir = ensureDir(SCREENSHOT_DIR);
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full });
  console.log(`📸 ${name}`);
}

test.describe('NFIR Proof Capture', () => {
  test.setTimeout(60000);

  test('capture rendered article proof', async ({ page }) => {
    console.log('\n🎯 NFIR PROOF CAPTURE\n');

    // Verify HTML file exists
    if (!fs.existsSync(HTML_FILE)) {
      console.error('❌ HTML file not found:', HTML_FILE);
      return;
    }
    console.log('✅ HTML file found:', HTML_FILE);
    const htmlSize = fs.statSync(HTML_FILE).size;
    console.log(`📄 File size: ${(htmlSize / 1024).toFixed(1)} KB`);

    // Open the HTML file directly in browser
    await page.goto(`file:///${HTML_FILE.replace(/\\/g, '/')}`);
    await page.waitForTimeout(3000); // Wait for fonts and CSS to load

    // Capture hero/top section
    await ss(page, '01_hero_viewport');

    // Scroll down to see card components
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await ss(page, '02_first_sections');

    // Scroll to see definition boxes
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await ss(page, '03_definition_boxes');

    // Scroll to see cards and feature grids
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await ss(page, '04_cards_and_grids');

    // More content
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await ss(page, '05_more_content');

    // Scroll further
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await ss(page, '06_mid_content');

    // Keep scrolling
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await ss(page, '07_lower_content');

    // Near bottom
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await ss(page, '08_near_bottom');

    // Bottom/footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await ss(page, '09_footer');

    // Full page screenshot
    await ss(page, '10_full_page', true);

    // Log component stats
    const stats = await page.evaluate(() => {
      return {
        cards: document.querySelectorAll('.card').length,
        featureGrids: document.querySelectorAll('.feature-grid').length,
        definitionBoxes: document.querySelectorAll('.definition-box').length,
        checklists: document.querySelectorAll('.checklist').length,
        stepLists: document.querySelectorAll('.step-list').length,
        sections: document.querySelectorAll('section').length,
        images: document.querySelectorAll('img').length,
        headings: document.querySelectorAll('h1, h2, h3').length,
        heroSections: document.querySelectorAll('.emphasis-hero').length,
        featuredSections: document.querySelectorAll('.emphasis-featured').length,
        backgroundSections: document.querySelectorAll('.has-background').length,
      };
    });

    console.log('\n📊 COMPONENT STATS:');
    console.log(`  Cards: ${stats.cards}`);
    console.log(`  Feature Grids: ${stats.featureGrids}`);
    console.log(`  Definition Boxes: ${stats.definitionBoxes}`);
    console.log(`  Checklists: ${stats.checklists}`);
    console.log(`  Step Lists: ${stats.stepLists}`);
    console.log(`  Sections: ${stats.sections}`);
    console.log(`  Images: ${stats.images}`);
    console.log(`  Headings: ${stats.headings}`);
    console.log(`  Hero Sections: ${stats.heroSections}`);
    console.log(`  Featured Sections: ${stats.featuredSections}`);
    console.log(`  Background Sections: ${stats.backgroundSections}`);

    console.log(`\n✅ PROOF CAPTURED`);
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}\n`);
  });
});
