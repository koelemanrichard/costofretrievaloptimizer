"""
Verification script for brand-aware composition.
Tests that:
1. Markdown content is converted to HTML
2. CSS is generated with brand variables
3. No placeholder comments in output
"""

import asyncio
from playwright.async_api import async_playwright
import os

# Test credentials
EMAIL = "dirkkoeleman@gmail.com"
PASSWORD = "Kansen12!"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Visible for inspection
        page = await browser.new_page()

        try:
            print("1. Navigating to app...")
            await page.goto("http://localhost:3001")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)

            # Login if needed
            if await page.locator('input[type="email"]').count() > 0:
                print("2. Logging in...")
                await page.fill('input[type="email"]', EMAIL)
                await page.fill('input[type="password"]', PASSWORD)
                await page.click('button[type="submit"]')
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(3)

            # Click on NFIR project
            print("3. Opening NFIR project...")
            nfir_card = page.locator('text=NFIR').first
            if await nfir_card.count() > 0:
                await nfir_card.click()
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(2)

            # Find a topic with content
            print("4. Looking for topic with content...")
            topic_cells = page.locator('[data-testid="topic-cell"], .topic-cell, [class*="topic"]')
            count = await topic_cells.count()
            print(f"   Found {count} potential topic elements")

            # Click on first visible topic
            for i in range(min(5, count)):
                try:
                    cell = topic_cells.nth(i)
                    if await cell.is_visible():
                        await cell.click()
                        await asyncio.sleep(1)
                        break
                except:
                    continue

            # Take screenshot of current state
            await page.screenshot(path="tmp/verify_01_app_state.png")
            print("   Screenshot saved: tmp/verify_01_app_state.png")

            # Try to find Style & Publish button
            print("5. Looking for Style & Publish option...")

            # Check if there's a dropdown or button
            publish_btn = page.locator('button:has-text("Publish"), button:has-text("Style"), [aria-label*="publish"]')
            if await publish_btn.count() > 0:
                await publish_btn.first.click()
                await asyncio.sleep(2)

            await page.screenshot(path="tmp/verify_02_after_click.png")
            print("   Screenshot saved: tmp/verify_02_after_click.png")

            # Wait for user to manually trigger Style & Publish
            print("\n===================================")
            print("MANUAL STEP: Please trigger Style & Publish in the app")
            print("The script will wait and capture the output HTML")
            print("===================================\n")

            # Wait for a file to be generated
            await asyncio.sleep(30)  # Give time for manual interaction

            # Check for output files in tmp/nfir_comparison
            output_dir = "D:/www/cost-of-retreival-reducer/tmp/nfir_comparison"
            if os.path.exists(output_dir):
                files = sorted(os.listdir(output_dir), key=lambda x: os.path.getmtime(os.path.join(output_dir, x)), reverse=True)
                if files:
                    latest_file = os.path.join(output_dir, files[0])
                    print(f"6. Analyzing latest output: {latest_file}")

                    with open(latest_file, 'r', encoding='utf-8') as f:
                        html_content = f.read()

                    # Check for issues
                    issues = []

                    # Check 1: No placeholder comments
                    if '<!-- Component:' in html_content:
                        issues.append("WARNING: Found placeholder comments (<!-- Component: ...)")

                    # Check 2: Markdown converted to HTML
                    if html_content.count('# ') > 2:  # More than 2 markdown headings
                        issues.append("WARNING: Raw markdown headings found (# )")

                    if '**' in html_content:
                        issues.append("WARNING: Raw markdown bold found (**)")

                    # Check 3: Has proper HTML structure
                    has_sections = '<section' in html_content
                    has_headings = '<h2' in html_content or '<h3' in html_content
                    has_paragraphs = '<p>' in html_content

                    print("\n=== OUTPUT ANALYSIS ===")
                    print(f"   Has <section> tags: {has_sections}")
                    print(f"   Has <h2>/<h3> tags: {has_headings}")
                    print(f"   Has <p> tags: {has_paragraphs}")

                    # Check 4: CSS has brand variables
                    has_css_vars = '--color-' in html_content or '--font-' in html_content
                    has_brand_css = 'brand-section' in html_content or 'brand-content' in html_content

                    print(f"   Has CSS variables: {has_css_vars}")
                    print(f"   Has brand CSS classes: {has_brand_css}")

                    if issues:
                        print("\n=== ISSUES FOUND ===")
                        for issue in issues:
                            print(f"   {issue}")
                    else:
                        print("\n=== NO MAJOR ISSUES ===")

                    print("\n=== FIRST 2000 CHARS OF OUTPUT ===")
                    print(html_content[:2000])

            await browser.close()

        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="tmp/verify_error.png")
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
