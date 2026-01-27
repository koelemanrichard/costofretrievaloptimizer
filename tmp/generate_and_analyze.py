"""
Generate actual styled output and analyze quality
"""

from playwright.sync_api import sync_playwright
import os

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*80)
    print("GENERATING ACTUAL STYLED OUTPUT")
    print("="*80)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        try:
            # Navigate to Style & Publish
            print("\n[1] Navigating...")
            page.goto(BASE_URL)
            page.wait_for_timeout(2000)

            page.fill('input[type="email"]', EMAIL)
            page.fill('input[type="password"]', PASSWORD)
            page.click('button[type="submit"]')
            page.wait_for_timeout(3000)

            page.locator('tr:has-text("mvgm vve")').locator('button:has-text("Open")').click()
            page.wait_for_timeout(3000)

            load_btns = page.locator('button:has-text("Load Map")').all()
            if len(load_btns) >= 2:
                load_btns[1].click()
            page.wait_for_timeout(3000)

            page.locator('button:has-text("Table")').click()
            page.wait_for_timeout(1000)
            page.locator('text="Totaal VvE Beheer Almere"').click()
            page.wait_for_timeout(1000)

            page.locator('button:has-text("View Brief")').click()
            page.wait_for_timeout(2000)
            page.locator('button:has-text("View Draft")').click()
            page.wait_for_timeout(2000)

            page.locator('button:has-text("Publish")').click()
            page.wait_for_timeout(500)
            page.locator('text="Style & Publish"').click()
            page.wait_for_timeout(3000)
            print("   Opened Style & Publish")

            # Navigate through wizard steps using force clicks
            print("\n[2] Navigating wizard to Preview step...")

            # Step through: Brand -> Layout -> Preview
            for step in range(4):
                page.wait_for_timeout(2000)

                # Check current step indicator
                steps = page.locator('[class*="step"], [class*="wizard"]').all()

                next_btn = page.locator('button:has-text("Next")').first
                if next_btn.is_visible():
                    next_btn.click(force=True)
                    print(f"   Step {step+1}: Next")
                else:
                    break

            page.wait_for_timeout(3000)
            page.screenshot(path='tmp/quality_01_preview_step.png', full_page=True)

            # Look for Generate button
            print("\n[3] Looking for Generate button...")
            gen_btn = page.locator('button:has-text("Generate")').first
            if gen_btn.is_visible():
                print("   Found Generate button, clicking...")
                gen_btn.click(force=True)
                print("   Waiting for generation (this takes time)...")
                page.wait_for_timeout(45000)  # Wait 45 seconds for generation

            page.screenshot(path='tmp/quality_02_after_generate.png', full_page=True)

            # Try to find the preview iframe or preview content
            print("\n[4] Looking for preview content...")

            # Check for iframe
            iframes = page.locator('iframe').all()
            print(f"   Found {len(iframes)} iframes")

            html_content = None

            for i, iframe in enumerate(iframes):
                try:
                    frame = page.frame_locator('iframe').nth(i)
                    body = frame.locator('body')
                    if body.is_visible():
                        html_content = body.inner_html()
                        if len(html_content) > 500 and 'ctc-' in html_content:
                            print(f"   Found styled content in iframe {i} ({len(html_content)} chars)")

                            # Save the HTML
                            with open('tmp/quality_output.html', 'w', encoding='utf-8') as f:
                                f.write(f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Styled Output</title>
</head>
<body>
{html_content}
</body>
</html>''')
                            print("   Saved to tmp/quality_output.html")

                            # Take screenshot of just the iframe
                            frame.locator('body').screenshot(path='tmp/quality_03_iframe_content.png')
                            break
                except Exception as e:
                    print(f"   Error with iframe {i}: {e}")

            # Also check for preview container directly
            preview = page.locator('[class*="preview"], [class*="output"], [class*="result"]').all()
            print(f"   Found {len(preview)} preview containers")

            for p_elem in preview:
                try:
                    html = p_elem.inner_html()
                    if 'ctc-' in html and len(html) > 1000:
                        print(f"   Found preview content ({len(html)} chars)")
                        with open('tmp/quality_preview.html', 'w', encoding='utf-8') as f:
                            f.write(html)
                        break
                except:
                    pass

            # Final screenshot
            page.screenshot(path='tmp/quality_04_final.png', full_page=True)

            print("\n[5] Screenshots saved:")
            print("   - tmp/quality_01_preview_step.png")
            print("   - tmp/quality_02_after_generate.png")
            print("   - tmp/quality_03_iframe_content.png (if found)")
            print("   - tmp/quality_04_final.png")
            print("   - tmp/quality_output.html (if found)")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/quality_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
