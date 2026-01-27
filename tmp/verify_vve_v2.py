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

            page.screenshot(path='tmp/vve2_01_login.png')

            # Step 2: Click Open button for mvgm vve
            print("\n[2] Opening mvgm vve project...")
            # Find the row containing "mvgm vve" and click its Open button
            mvgm_row = page.locator('tr:has-text("mvgm vve")').first
            if mvgm_row.is_visible():
                open_btn = mvgm_row.locator('button:has-text("Open")').first
                if open_btn.is_visible():
                    open_btn.click()
                    page.wait_for_timeout(3000)
                    print("   Clicked Open button")

            page.screenshot(path='tmp/vve2_02_opened.png')

            # Step 3: Select map with content
            print("\n[3] Selecting map...")
            page.wait_for_timeout(1000)

            # Look for map cards or Load Map buttons
            load_btns = page.locator('button:has-text("Load Map")').all()
            print(f"   Found {len(load_btns)} Load Map buttons")

            # Click the second one if available (usually has VvE content)
            if len(load_btns) >= 2:
                load_btns[1].click()
                page.wait_for_timeout(3000)
                print("   Loaded map 2")
            elif len(load_btns) >= 1:
                load_btns[0].click()
                page.wait_for_timeout(3000)
                print("   Loaded map 1")

            page.screenshot(path='tmp/vve2_03_map.png')

            # Step 4: Find and select Totaal VvE Beheer Almere
            print("\n[4] Finding 'Totaal VvE Beheer Almere'...")

            # Make sure we're in Table view
            table_btn = page.locator('button:has-text("Table")').first
            if table_btn.is_visible():
                table_btn.click()
                page.wait_for_timeout(1000)
                print("   Switched to Table view")

            page.screenshot(path='tmp/vve2_04_table.png')

            # Try to find the topic - it might need scrolling
            # First, let's look for it directly
            topic_cell = page.locator('td:has-text("Totaal VvE Beheer Almere"), text=Totaal VvE Beheer Almere').first
            if topic_cell.is_visible():
                topic_cell.click()
                page.wait_for_timeout(1000)
                print("   Clicked topic cell")
            else:
                print("   Topic not immediately visible, trying scroll...")
                # Try using page down or scrolling
                page.keyboard.press('End')
                page.wait_for_timeout(1000)
                topic_cell = page.locator('td:has-text("Totaal VvE Beheer Almere")').first
                if topic_cell.is_visible():
                    topic_cell.click()
                    print("   Found after scroll")

            page.screenshot(path='tmp/vve2_05_selected.png')

            # Step 5: Click View Brief
            print("\n[5] Opening Brief modal...")
            view_brief = page.locator('button:has-text("View Brief")').first
            if view_brief.is_visible():
                view_brief.click()
                page.wait_for_timeout(2000)
                print("   Opened Brief modal")
            else:
                print("   WARNING: View Brief button not found")
                # List visible buttons
                btns = page.locator('button:visible').all()
                print(f"   Visible buttons ({len(btns)}):")
                for b in btns[:10]:
                    try:
                        txt = b.text_content()
                        if txt and len(txt.strip()) > 1:
                            print(f"     - {txt.strip()[:40]}")
                    except:
                        pass

            page.screenshot(path='tmp/vve2_06_brief.png')

            # Step 6: Click Draft tab
            print("\n[6] Clicking Draft tab...")
            # Look for tabs
            tabs = page.locator('[role="tab"]').all()
            print(f"   Found {len(tabs)} tabs")
            for tab in tabs:
                try:
                    txt = tab.text_content()
                    print(f"     Tab: {txt}")
                    if "Draft" in txt:
                        tab.click()
                        page.wait_for_timeout(2000)
                        print("   Clicked Draft tab")
                        break
                except:
                    pass

            page.screenshot(path='tmp/vve2_07_draft.png')

            # Step 7: Find Style & Publish
            print("\n[7] Looking for Style & Publish...")

            # Check for Publish dropdown
            publish_btn = page.locator('button:has-text("Publish")').first
            if publish_btn.is_visible():
                publish_btn.click()
                page.wait_for_timeout(500)
                print("   Opened Publish menu")

            # Look for Style & Publish option
            style_link = page.locator('[role="menuitem"]:has-text("Style"), text=Style & Publish').first
            if style_link.is_visible():
                style_link.click()
                page.wait_for_timeout(3000)
                print("   Clicked Style & Publish")
            else:
                # Try direct button
                style_btn = page.locator('button:has-text("Style & Publish"), button:has-text("Stylize")').first
                if style_btn.is_visible():
                    style_btn.click()
                    page.wait_for_timeout(3000)
                    print("   Clicked Style button")

            page.screenshot(path='tmp/vve2_08_style.png')

            # Step 8: Configure brand and generate
            print("\n[8] Configuring brand...")
            url_input = page.locator('input[type="url"], input[placeholder*="url" i]').first
            if url_input.is_visible():
                url_input.fill("https://mvgm.com")
                print("   Entered brand URL")

            extract_btn = page.locator('button:has-text("Extract"), button:has-text("Analyze")').first
            if extract_btn.is_visible():
                extract_btn.click()
                page.wait_for_timeout(12000)
                print("   Brand extraction in progress...")

            page.screenshot(path='tmp/vve2_09_brand.png')

            # Step 9: Click through wizard to generate
            print("\n[9] Navigating wizard to generate preview...")
            for step in range(6):
                page.wait_for_timeout(2000)

                gen_btn = page.locator('button:has-text("Generate Preview"), button:has-text("Generate Styled"), button:has-text("Generate")').first
                if gen_btn.is_visible():
                    gen_btn.click()
                    print(f"   Clicked Generate")
                    page.wait_for_timeout(15000)
                    break

                next_btn = page.locator('button:has-text("Next"), button:has-text("Continue")').first
                if next_btn.is_visible():
                    try:
                        next_btn.click()
                        print(f"   Step {step+1}: Next")
                    except:
                        break
                else:
                    break

            page.screenshot(path='tmp/vve2_10_final.png', full_page=True)

            # Analyze results
            print("\n" + "="*80)
            print("CONSOLE LOG ANALYSIS")
            print("="*80)

            styling_logs = [l for l in console_logs if "[STYLING PIPELINE]" in l]
            print(f"\nTotal STYLING PIPELINE logs: {len(styling_logs)}")

            if styling_logs:
                print("\nKey logs:")
                for log in styling_logs:
                    if any(k in log for k in ["articleContent", "usingSource", "sectionCount", "hasImages"]):
                        safe = log.encode('ascii', 'replace').decode()
                        print(f"  {safe[:200]}")

            all_logs = " ".join(console_logs)

            print("\n" + "="*80)
            print("VERIFICATION RESULTS")
            print("="*80)

            if "articleContent (ACTUAL ARTICLE)" in all_logs:
                print("\n*** PASS: Using ACTUAL ARTICLE content ***")
            elif "Passing articleContent to renderBlueprint" in all_logs:
                print("\n*** PASS: articleContent is being passed ***")
            elif len(styling_logs) > 0:
                print("\n*** INFO: Styling pipeline was triggered, check logs ***")
            else:
                print("\n*** WARNING: Styling pipeline was NOT triggered ***")

            with open('tmp/vve2_logs.txt', 'w', encoding='utf-8') as f:
                f.write("\n".join(console_logs))
            print("\nLogs: tmp/vve2_logs.txt")
            print("Screenshots: tmp/vve2_*.png")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/vve2_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
