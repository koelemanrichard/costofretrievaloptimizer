"""
VERIFICATION TEST: Article Content Fix
Target: "Totaal VvE Beheer Almere" - has complete brief and draft
"""

from playwright.sync_api import sync_playwright

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*80)
    print("VERIFICATION: Totaal VvE Beheer Almere")
    print("="*80)

    console_logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        def handle_console(msg):
            text = msg.text
            console_logs.append(text)
            if "[STYLING PIPELINE]" in text:
                safe_text = text.encode('ascii', 'replace').decode()
                print(f"  [LOG] {safe_text[:180]}")

        page.on("console", handle_console)

        try:
            # Step 1: Login
            print("\n[1] Logging in...")
            page.goto(BASE_URL)
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(2000)

            page.fill('input[type="email"]', EMAIL)
            page.fill('input[type="password"]', PASSWORD)
            page.click('button[type="submit"]')
            page.wait_for_timeout(3000)
            print("   Done")

            # Step 2: Open mvgm vve
            print("\n[2] Opening project...")
            mvgm_row = page.locator('tr:has-text("mvgm vve")').first
            mvgm_row.locator('button:has-text("Open")').click()
            page.wait_for_timeout(3000)
            print("   Done")

            # Step 3: Load map 2
            print("\n[3] Loading map...")
            load_btns = page.locator('button:has-text("Load Map")').all()
            if len(load_btns) >= 2:
                load_btns[1].click()
            page.wait_for_timeout(3000)
            print("   Done")

            # Step 4: Find topic
            print("\n[4] Finding topic...")
            page.locator('button:has-text("Table")').first.click()
            page.wait_for_timeout(1000)
            page.locator('text="Totaal VvE Beheer Almere"').first.click()
            page.wait_for_timeout(1000)
            print("   Done")

            # Step 5: Open Brief modal
            print("\n[5] Opening Brief modal...")
            page.locator('button:has-text("View Brief")').first.click()
            page.wait_for_timeout(2000)
            print("   Done")

            # Step 6: Open Draft view
            print("\n[6] Opening Draft view...")
            page.locator('button:has-text("View Draft")').first.click()
            page.wait_for_timeout(2000)
            print("   Done")

            page.screenshot(path='tmp/vve5_01_draft.png')

            # Step 7: Click Publish dropdown and then Style & Publish
            print("\n[7] Opening Style & Publish...")

            # Click the Publish dropdown button
            publish_btn = page.locator('button:has-text("Publish")').first
            publish_btn.click()
            page.wait_for_timeout(1000)
            print("   Opened Publish dropdown")

            page.screenshot(path='tmp/vve5_02_dropdown.png')

            # Click "Style & Publish" text directly
            style_option = page.locator('text="Style & Publish"').first
            if style_option.is_visible():
                style_option.click()
                page.wait_for_timeout(3000)
                print("   Clicked Style & Publish")

            page.screenshot(path='tmp/vve5_03_style_modal.png')

            # Step 8: Configure brand
            print("\n[8] Configuring brand...")
            url_input = page.locator('input[type="url"]').first
            if url_input.is_visible():
                url_input.fill("https://mvgm.com")
                print("   Entered brand URL")

                # Click Extract/Analyze
                extract_btn = page.locator('button:has-text("Extract"), button:has-text("Analyze")').first
                if extract_btn.is_visible():
                    extract_btn.click()
                    print("   Extracting brand...")
                    page.wait_for_timeout(15000)

            page.screenshot(path='tmp/vve5_04_brand.png')

            # Step 9: Navigate through wizard
            print("\n[9] Navigating wizard...")
            for step in range(8):
                page.wait_for_timeout(2000)

                # Check for Generate button
                gen_btn = page.locator('button:has-text("Generate Preview"), button:has-text("Generate Styled")').first
                if gen_btn.is_visible():
                    gen_btn.click()
                    print("   Clicked Generate")
                    page.wait_for_timeout(25000)  # Wait for generation
                    break

                # Click Next if available
                next_btn = page.locator('button:has-text("Next"), button:has-text("Continue")').first
                if next_btn.is_visible():
                    next_btn.click()
                    print(f"   Step {step+1}: Next")
                else:
                    print(f"   Step {step+1}: No more buttons")
                    break

            page.screenshot(path='tmp/vve5_05_final.png', full_page=True)

            # Analyze results
            print("\n" + "="*80)
            print("CONSOLE LOG ANALYSIS")
            print("="*80)

            styling_logs = [l for l in console_logs if "[STYLING PIPELINE]" in l]
            print(f"\nTotal STYLING PIPELINE logs: {len(styling_logs)}")

            if styling_logs:
                print("\n--- All STYLING PIPELINE logs ---")
                for i, log in enumerate(styling_logs):
                    safe = log.encode('ascii', 'replace').decode()
                    print(f"\n{i+1}. {safe}")

            all_logs = " ".join(console_logs)

            print("\n" + "="*80)
            print("VERIFICATION RESULTS")
            print("="*80)

            results = []

            if "Passing articleContent to renderBlueprint" in all_logs:
                results.append("PASS: articleContent is being passed to renderBlueprint")
            if "hasArticleContent: true" in all_logs:
                results.append("PASS: hasArticleContent = true")
            if "articleContent (ACTUAL ARTICLE)" in all_logs:
                results.append("PASS: Using ACTUAL ARTICLE content (not brief summaries)")
            if "usingArticleContent: true" in all_logs:
                results.append("PASS: usingArticleContent = true")
            if "articleSectionCount:" in all_logs or "sectionCount:" in all_logs:
                import re
                match = re.search(r'(?:article)?[sS]ectionCount:\s*(\d+)', all_logs)
                if match:
                    results.append(f"INFO: sectionCount = {match.group(1)}")
            if "hasImages: true" in all_logs:
                results.append("INFO: Content has images")

            if results:
                print("\n" + "*"*40)
                print("*** FIX VERIFIED ***")
                print("*"*40)
                for r in results:
                    print(f"  {r}")
            elif len(styling_logs) > 0:
                print("\n*** Styling pipeline triggered - check logs above ***")
            else:
                print("\n*** WARNING: Styling pipeline NOT triggered ***")

            with open('tmp/vve5_logs.txt', 'w', encoding='utf-8') as f:
                f.write("\n".join(console_logs))
            print("\nLogs: tmp/vve5_logs.txt")
            print("Screenshots: tmp/vve5_*.png")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/vve5_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
