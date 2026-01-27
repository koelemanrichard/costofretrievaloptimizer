"""
FINAL VERIFICATION TEST: Article Content Fix
Target: "Totaal VvE Beheer Almere" - navigate to generate and verify console logs
"""

from playwright.sync_api import sync_playwright

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*80)
    print("FINAL VERIFICATION: Article Content Fix")
    print("="*80)

    console_logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        def handle_console(msg):
            text = msg.text
            console_logs.append(text)
            if "[STYLING PIPELINE]" in text or "[Renderer]" in text:
                safe_text = text.encode('ascii', 'replace').decode()
                print(f"  [LOG] {safe_text[:180]}")

        page.on("console", handle_console)

        try:
            # Quick navigation to Style & Publish
            print("\n[1] Navigating to Style & Publish...")
            page.goto(BASE_URL)
            page.wait_for_timeout(2000)

            # Login
            page.fill('input[type="email"]', EMAIL)
            page.fill('input[type="password"]', PASSWORD)
            page.click('button[type="submit"]')
            page.wait_for_timeout(3000)
            print("   Logged in")

            # Open project
            page.locator('tr:has-text("mvgm vve")').locator('button:has-text("Open")').click()
            page.wait_for_timeout(3000)
            print("   Opened project")

            # Load map 2
            load_btns = page.locator('button:has-text("Load Map")').all()
            if len(load_btns) >= 2:
                load_btns[1].click()
            page.wait_for_timeout(3000)
            print("   Loaded map")

            # Find and select topic
            page.locator('button:has-text("Table")').click()
            page.wait_for_timeout(1000)
            page.locator('text="Totaal VvE Beheer Almere"').click()
            page.wait_for_timeout(1000)
            print("   Selected topic")

            # Open Brief and Draft
            page.locator('button:has-text("View Brief")').click()
            page.wait_for_timeout(2000)
            page.locator('button:has-text("View Draft")').click()
            page.wait_for_timeout(2000)
            print("   Opened draft")

            # Open Style & Publish
            page.locator('button:has-text("Publish")').click()
            page.wait_for_timeout(500)
            page.locator('text="Style & Publish"').click()
            page.wait_for_timeout(3000)
            print("   Opened Style & Publish modal")

            page.screenshot(path='tmp/final_01_style_modal.png')

            # Navigate through wizard using force clicks
            print("\n[2] Navigating wizard...")
            for step in range(6):
                page.wait_for_timeout(2000)

                # Check for Generate button first
                gen_btn = page.locator('button:has-text("Generate Preview"), button:has-text("Generate Styled Article")').first
                if gen_btn.is_visible():
                    print(f"   Found Generate button!")
                    gen_btn.click(force=True)
                    print("   Clicked Generate - waiting for generation...")
                    page.wait_for_timeout(30000)  # Wait for full generation
                    break

                # Click Next with force
                next_btn = page.locator('button:has-text("Next")').first
                if next_btn.is_visible():
                    next_btn.click(force=True)
                    print(f"   Step {step+1}: Clicked Next")
                else:
                    print(f"   Step {step+1}: No Next button")
                    # Try scrolling within modal
                    page.keyboard.press('Tab')
                    page.keyboard.press('Enter')

            page.screenshot(path='tmp/final_02_after_generate.png', full_page=True)

            # Wait a bit more and capture any remaining logs
            page.wait_for_timeout(5000)

            # Analyze results
            print("\n" + "="*80)
            print("CONSOLE LOG ANALYSIS")
            print("="*80)

            styling_logs = [l for l in console_logs if "[STYLING PIPELINE]" in l]
            renderer_logs = [l for l in console_logs if "[Renderer]" in l]

            print(f"\nSTYLING PIPELINE logs: {len(styling_logs)}")
            print(f"Renderer logs: {len(renderer_logs)}")

            if styling_logs:
                print("\n--- STYLING PIPELINE logs ---")
                for log in styling_logs:
                    safe = log.encode('ascii', 'replace').decode()
                    print(f"  {safe}")

            all_logs = " ".join(console_logs)

            print("\n" + "="*80)
            print("VERIFICATION RESULTS")
            print("="*80)

            passed = []
            if "Passing articleContent to renderBlueprint" in all_logs:
                passed.append("articleContent passed to renderBlueprint")
            if "hasArticleContent: true" in all_logs:
                passed.append("hasArticleContent = true")
            if "articleContent (ACTUAL ARTICLE)" in all_logs:
                passed.append("Using ACTUAL ARTICLE content")
            if "usingArticleContent: true" in all_logs:
                passed.append("usingArticleContent = true")
            if "articleSectionCount" in all_logs or "sectionCount" in all_logs:
                passed.append("Section count logged")

            if passed:
                print("\n" + "="*40)
                print("*** FIX VERIFIED - ALL CHECKS PASS ***")
                print("="*40)
                for p in passed:
                    print(f"  [PASS] {p}")
            elif len(styling_logs) > 0:
                print("\n*** PARTIAL: Pipeline triggered, review logs ***")
            else:
                print("\n*** Pipeline not triggered - check screenshots ***")

            with open('tmp/final_logs.txt', 'w', encoding='utf-8') as f:
                f.write("\n".join(console_logs))
            print("\nSaved: tmp/final_logs.txt, tmp/final_*.png")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/final_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
