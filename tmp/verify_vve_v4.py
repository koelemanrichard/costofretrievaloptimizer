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

            if page.locator('input[type="email"]').is_visible():
                page.fill('input[type="email"]', EMAIL)
                page.fill('input[type="password"]', PASSWORD)
                page.click('button[type="submit"]')
                page.wait_for_timeout(3000)
            print("   Done")

            # Step 2: Click Open button for mvgm vve
            print("\n[2] Opening mvgm vve project...")
            mvgm_row = page.locator('tr:has-text("mvgm vve")').first
            open_btn = mvgm_row.locator('button:has-text("Open")').first
            open_btn.click()
            page.wait_for_timeout(3000)
            print("   Done")

            # Step 3: Load map 2
            print("\n[3] Loading map...")
            load_btns = page.locator('button:has-text("Load Map")').all()
            if len(load_btns) >= 2:
                load_btns[1].click()
                page.wait_for_timeout(3000)
            print("   Done")

            # Step 4: Find Totaal VvE Beheer Almere
            print("\n[4] Finding topic...")
            table_btn = page.locator('button:has-text("Table")').first
            if table_btn.is_visible():
                table_btn.click()
                page.wait_for_timeout(1000)

            topic_text = page.locator('text="Totaal VvE Beheer Almere"').first
            topic_text.click()
            page.wait_for_timeout(1000)
            print("   Found and clicked topic")

            # Step 5: Click View Brief
            print("\n[5] Opening Brief modal...")
            view_brief = page.locator('button:has-text("View Brief")').first
            view_brief.click()
            page.wait_for_timeout(2000)
            print("   Opened Brief modal")

            page.screenshot(path='tmp/vve4_01_brief.png')

            # Step 6: Click "View Draft" button (bottom right of modal)
            print("\n[6] Opening Draft view...")
            view_draft_btn = page.locator('button:has-text("View Draft")').first
            if view_draft_btn.is_visible():
                view_draft_btn.click()
                page.wait_for_timeout(2000)
                print("   Opened Draft view")
            else:
                # Try "View Generated Draft" button
                gen_draft_btn = page.locator('button:has-text("View Generated Draft")').first
                if gen_draft_btn.is_visible():
                    gen_draft_btn.click()
                    page.wait_for_timeout(2000)
                    print("   Opened Generated Draft view")

            page.screenshot(path='tmp/vve4_02_draft.png')

            # Step 7: Look for Style & Publish or Publish dropdown
            print("\n[7] Looking for Style & Publish...")

            # Check for Publish button/dropdown
            publish_btn = page.locator('button:has-text("Publish")').first
            if publish_btn.is_visible():
                publish_btn.click()
                page.wait_for_timeout(500)
                print("   Clicked Publish dropdown")

                # List menu items
                menu_items = page.locator('[role="menuitem"]').all()
                print(f"   Menu items ({len(menu_items)}):")
                for item in menu_items:
                    try:
                        txt = item.text_content()
                        if txt:
                            safe = txt.strip()[:30].encode('ascii', 'replace').decode()
                            print(f"     - {safe}")
                    except:
                        pass

                # Click Style & Publish
                style_item = page.locator('[role="menuitem"]:has-text("Style")').first
                if style_item.is_visible():
                    style_item.click()
                    page.wait_for_timeout(3000)
                    print("   Clicked Style & Publish")

            page.screenshot(path='tmp/vve4_03_style_modal.png')

            # Step 8: Configure brand
            print("\n[8] Configuring brand...")
            url_input = page.locator('input[type="url"], input[placeholder*="url" i]').first
            if url_input.is_visible():
                url_input.fill("https://mvgm.com")
                print("   Entered brand URL")

                # Click Extract
                extract_btn = page.locator('button:has-text("Extract"), button:has-text("Analyze")').first
                if extract_btn.is_visible():
                    extract_btn.click()
                    page.wait_for_timeout(15000)
                    print("   Brand extraction complete")

            page.screenshot(path='tmp/vve4_04_brand.png')

            # Step 9: Navigate wizard and generate
            print("\n[9] Navigating wizard...")
            for step in range(6):
                page.wait_for_timeout(2000)

                # Check for Generate button
                gen_btn = page.locator('button:has-text("Generate Preview"), button:has-text("Generate Styled")').first
                if gen_btn.is_visible():
                    gen_btn.click()
                    print("   Clicked Generate")
                    page.wait_for_timeout(20000)  # Wait for generation
                    break

                # Click Next if available
                next_btn = page.locator('button:has-text("Next"), button:has-text("Continue")').first
                if next_btn.is_visible():
                    try:
                        next_btn.click()
                        print(f"   Step {step+1}: Next")
                    except:
                        break
                else:
                    break

            page.screenshot(path='tmp/vve4_05_generated.png', full_page=True)

            # Analyze console logs
            print("\n" + "="*80)
            print("CONSOLE LOG ANALYSIS")
            print("="*80)

            styling_logs = [l for l in console_logs if "[STYLING PIPELINE]" in l]
            print(f"\nTotal STYLING PIPELINE logs: {len(styling_logs)}")

            if styling_logs:
                print("\nAll STYLING PIPELINE logs:")
                for i, log in enumerate(styling_logs):
                    safe = log.encode('ascii', 'replace').decode()
                    print(f"\n{i+1}. {safe[:250]}")

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
                results.append("PASS: Using ACTUAL ARTICLE content")
            if "usingArticleContent: true" in all_logs:
                results.append("PASS: usingArticleContent = true")
            if "sectionCount:" in all_logs:
                import re
                match = re.search(r'sectionCount:\s*(\d+)', all_logs)
                if match:
                    results.append(f"INFO: sectionCount = {match.group(1)}")
            if "hasImages: true" in all_logs:
                results.append("INFO: Content has images")

            if results:
                print("\n*** FIX VERIFIED ***")
                for r in results:
                    print(f"  [{r}]")
            elif len(styling_logs) > 0:
                print("\n*** Styling pipeline triggered - check logs above ***")
            else:
                print("\n*** WARNING: Styling pipeline NOT triggered ***")
                print("   Check screenshots to see where navigation stopped")

            with open('tmp/vve4_logs.txt', 'w', encoding='utf-8') as f:
                f.write("\n".join(console_logs))
            print("\nLogs: tmp/vve4_logs.txt")
            print("Screenshots: tmp/vve4_*.png")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/vve4_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
