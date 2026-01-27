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
            if mvgm_row.is_visible():
                open_btn = mvgm_row.locator('button:has-text("Open")').first
                if open_btn.is_visible():
                    open_btn.click()
                    page.wait_for_timeout(3000)
                    print("   Clicked Open button")

            page.screenshot(path='tmp/vve3_01.png')

            # Step 3: Select map 2 (with VvE content)
            print("\n[3] Selecting map...")
            load_btns = page.locator('button:has-text("Load Map")').all()
            print(f"   Found {len(load_btns)} Load Map buttons")

            if len(load_btns) >= 2:
                load_btns[1].click()
                page.wait_for_timeout(3000)
                print("   Loaded map 2")

            page.screenshot(path='tmp/vve3_02.png')

            # Step 4: Switch to Table view and find topic
            print("\n[4] Finding 'Totaal VvE Beheer Almere'...")

            table_btn = page.locator('button:has-text("Table")').first
            if table_btn.is_visible():
                table_btn.click()
                page.wait_for_timeout(1000)

            page.screenshot(path='tmp/vve3_03.png')

            # Scroll to find the topic
            found = False
            for scroll_attempt in range(10):
                # Check if topic is visible
                topic_text = page.locator('text="Totaal VvE Beheer Almere"').first
                if topic_text.is_visible():
                    topic_text.click()
                    page.wait_for_timeout(1000)
                    print(f"   Found topic on scroll attempt {scroll_attempt + 1}")
                    found = True
                    break

                # Scroll down
                page.keyboard.press('PageDown')
                page.wait_for_timeout(500)

            if not found:
                print("   WARNING: Topic not found, using first available row")
                # Click first row that looks like it has a draft
                first_row = page.locator('tbody tr').first
                if first_row.is_visible():
                    first_row.click()
                    page.wait_for_timeout(1000)

            page.screenshot(path='tmp/vve3_04.png')

            # Step 5: Click View Brief
            print("\n[5] Opening Brief modal...")
            view_brief = page.locator('button:has-text("View Brief")').first
            if view_brief.is_visible():
                view_brief.click()
                page.wait_for_timeout(2000)
                print("   Opened Brief modal")
            else:
                print("   View Brief not visible")
                # List all visible buttons
                btns = page.locator('button:visible').all()
                for b in btns[:8]:
                    try:
                        txt = b.text_content()
                        if txt:
                            safe = txt.strip()[:30].encode('ascii', 'replace').decode()
                            print(f"     - {safe}")
                    except:
                        pass

            page.screenshot(path='tmp/vve3_05.png')

            # Step 6: Click Draft tab
            print("\n[6] Clicking Draft tab...")
            draft_tab = page.locator('[role="tab"]:has-text("Draft")').first
            if draft_tab.is_visible():
                draft_tab.click()
                page.wait_for_timeout(2000)
                print("   Clicked Draft tab")
            else:
                # List available tabs
                tabs = page.locator('[role="tab"]').all()
                print(f"   Available tabs ({len(tabs)}):")
                for tab in tabs:
                    try:
                        txt = tab.text_content()
                        if txt:
                            safe = txt.strip()[:20].encode('ascii', 'replace').decode()
                            print(f"     - {safe}")
                    except:
                        pass

            page.screenshot(path='tmp/vve3_06.png')

            # Step 7: Find Style & Publish
            print("\n[7] Looking for Style & Publish...")

            # Look for Publish button/dropdown
            publish_btn = page.locator('button:has-text("Publish")').first
            if publish_btn.is_visible():
                publish_btn.click()
                page.wait_for_timeout(500)
                print("   Clicked Publish")

            # Look for Style & Publish in menu
            style_item = page.locator('[role="menuitem"]:has-text("Style")').first
            if style_item.is_visible():
                style_item.click()
                page.wait_for_timeout(3000)
                print("   Clicked Style & Publish menu item")
            else:
                # Try direct button
                style_btn = page.locator('button:has-text("Style & Publish")').first
                if style_btn.is_visible():
                    style_btn.click()
                    page.wait_for_timeout(3000)
                    print("   Clicked Style & Publish button")

            page.screenshot(path='tmp/vve3_07.png')

            # Step 8: Configure and generate
            print("\n[8] Configuring brand and generating...")

            # Fill URL if visible
            url_input = page.locator('input[type="url"]').first
            if url_input.is_visible():
                url_input.fill("https://mvgm.com")
                print("   Entered brand URL")

            # Click Extract/Analyze
            extract_btn = page.locator('button:has-text("Extract"), button:has-text("Analyze")').first
            if extract_btn.is_visible():
                extract_btn.click()
                page.wait_for_timeout(12000)
                print("   Brand extraction...")

            page.screenshot(path='tmp/vve3_08.png')

            # Navigate through wizard
            print("\n[9] Navigating wizard...")
            for step in range(6):
                page.wait_for_timeout(2000)

                gen_btn = page.locator('button:has-text("Generate Preview"), button:has-text("Generate Styled")').first
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

            page.screenshot(path='tmp/vve3_09.png', full_page=True)

            # Analyze results
            print("\n" + "="*80)
            print("CONSOLE LOG ANALYSIS")
            print("="*80)

            styling_logs = [l for l in console_logs if "[STYLING PIPELINE]" in l]
            print(f"\nTotal STYLING PIPELINE logs: {len(styling_logs)}")

            if styling_logs:
                print("\nAll STYLING PIPELINE logs:")
                for i, log in enumerate(styling_logs):
                    safe = log.encode('ascii', 'replace').decode()
                    print(f"  {i+1}. {safe[:200]}")

            all_logs = " ".join(console_logs)

            print("\n" + "="*80)
            print("VERIFICATION RESULTS")
            print("="*80)

            if "articleContent (ACTUAL ARTICLE)" in all_logs:
                print("\n*** PASS: Using ACTUAL ARTICLE content ***")
            elif "Passing articleContent to renderBlueprint" in all_logs:
                print("\n*** PASS: articleContent is being passed ***")
            elif "hasArticleContent: true" in all_logs:
                print("\n*** PASS: articleContent detected ***")
            elif len(styling_logs) > 0:
                print("\n*** INFO: Styling pipeline triggered, check logs ***")
            else:
                print("\n*** WARNING: Styling pipeline NOT triggered ***")

            with open('tmp/vve3_logs.txt', 'w', encoding='utf-8') as f:
                f.write("\n".join(console_logs))
            print("\nLogs: tmp/vve3_logs.txt")
            print("Screenshots: tmp/vve3_*.png")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/vve3_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
