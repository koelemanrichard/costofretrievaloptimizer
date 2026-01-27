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

            # Step 2: Click on mvgm vve project row
            print("\n[2] Opening mvgm vve project...")
            # Click on the project name text directly
            project_link = page.locator('text=mvgm vve').first
            if project_link.is_visible():
                project_link.click()
                page.wait_for_timeout(2000)
                print("   Clicked mvgm vve")

            page.screenshot(path='tmp/vve_final_01.png')

            # Step 3: Check if we need to select a map
            print("\n[3] Looking for maps...")
            page.wait_for_timeout(1000)

            # Look for Load Map buttons
            load_map_btns = page.locator('button:has-text("Load Map")').all()
            print(f"   Found {len(load_map_btns)} Load Map buttons")

            if len(load_map_btns) > 0:
                # Click the second one if available (usually has more content)
                idx = 1 if len(load_map_btns) > 1 else 0
                load_map_btns[idx].click()
                page.wait_for_timeout(3000)
                print(f"   Clicked Load Map button {idx+1}")

            page.screenshot(path='tmp/vve_final_02.png')

            # Step 4: Find Totaal VvE Beheer Almere
            print("\n[4] Finding 'Totaal VvE Beheer Almere'...")

            # Click Table view first
            table_btn = page.locator('button:has-text("Table")').first
            if table_btn.is_visible():
                table_btn.click()
                page.wait_for_timeout(1000)

            # Use keyboard shortcut or search to find the topic
            # Try searching
            search_input = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i]').first
            if search_input.is_visible():
                search_input.fill("Totaal VvE")
                page.wait_for_timeout(1000)

            # Click on the topic row
            topic_row = page.locator('tr:has-text("Totaal VvE Beheer Almere"), tr:has-text("Totaal VvE Beheer")').first
            if topic_row.is_visible():
                topic_row.click()
                page.wait_for_timeout(1000)
                print("   Found and clicked topic")
            else:
                # Try text locator
                topic_text = page.locator('text=Totaal VvE Beheer Almere').first
                if topic_text.is_visible():
                    topic_text.click()
                    page.wait_for_timeout(1000)
                    print("   Clicked topic text")
                else:
                    print("   WARNING: Could not find topic")

            page.screenshot(path='tmp/vve_final_03.png')

            # Step 5: Click View Brief
            print("\n[5] Opening Brief modal...")
            view_brief = page.locator('button:has-text("View Brief")').first
            if view_brief.is_visible():
                view_brief.click()
                page.wait_for_timeout(2000)
                print("   Clicked View Brief")
            else:
                print("   View Brief not visible, looking for alternatives...")
                # Maybe click on Actions dropdown
                actions_btn = page.locator('button:has-text("Actions"), button[aria-label*="action" i]').first
                if actions_btn.is_visible():
                    actions_btn.click()
                    page.wait_for_timeout(500)

            page.screenshot(path='tmp/vve_final_04.png')

            # Step 6: Click Draft tab
            print("\n[6] Clicking Draft tab...")
            draft_tab = page.locator('[role="tab"]:has-text("Draft"), button[role="tab"]:has-text("Draft")').first
            if draft_tab.is_visible():
                draft_tab.click()
                page.wait_for_timeout(2000)
                print("   Clicked Draft tab")
            else:
                # Try any element with Draft text
                draft_elem = page.locator('text=Draft').first
                if draft_elem.is_visible():
                    draft_elem.click()
                    page.wait_for_timeout(2000)
                    print("   Clicked Draft element")

            page.screenshot(path='tmp/vve_final_05.png')

            # Step 7: Find and click Style & Publish
            print("\n[7] Looking for Style & Publish...")

            # Look for Publish dropdown first
            publish_btn = page.locator('button:has-text("Publish")').first
            if publish_btn.is_visible():
                publish_btn.click()
                page.wait_for_timeout(500)
                print("   Opened Publish dropdown")

            # Now find Style & Publish option
            style_option = page.locator('text=Style & Publish, button:has-text("Style & Publish")').first
            if style_option.is_visible():
                style_option.click()
                page.wait_for_timeout(3000)
                print("   Clicked Style & Publish")

            page.screenshot(path='tmp/vve_final_06.png')

            # Step 8: Fill brand URL and extract
            print("\n[8] Configuring brand...")
            url_input = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="website" i]').first
            if url_input.is_visible():
                url_input.fill("https://mvgm.com")
                page.wait_for_timeout(500)
                print("   Entered brand URL")

            # Click Extract/Analyze
            extract_btn = page.locator('button:has-text("Extract"), button:has-text("Analyze"), button:has-text("Detect")').first
            if extract_btn.is_visible():
                extract_btn.click()
                page.wait_for_timeout(10000)
                print("   Extracting brand...")

            page.screenshot(path='tmp/vve_final_07.png')

            # Step 9: Navigate through wizard
            print("\n[9] Navigating wizard...")
            for step in range(6):
                page.wait_for_timeout(2000)

                # Check for Generate button first
                gen_btn = page.locator('button:has-text("Generate Preview"), button:has-text("Generate Styled")').first
                if gen_btn.is_visible():
                    gen_btn.click()
                    print(f"   Step {step+1}: Clicked Generate")
                    page.wait_for_timeout(15000)  # Wait for generation
                    break

                # Otherwise click Next
                next_btn = page.locator('button:has-text("Next"), button:has-text("Continue")').first
                if next_btn.is_visible():
                    try:
                        next_btn.click()
                        print(f"   Step {step+1}: Clicked Next")
                    except:
                        break
                else:
                    break

            page.screenshot(path='tmp/vve_final_08.png')

            # Step 10: Capture final state
            print("\n[10] Capturing final state...")
            page.wait_for_timeout(5000)
            page.screenshot(path='tmp/vve_final_09.png', full_page=True)

            # Analyze console logs
            print("\n" + "="*80)
            print("CONSOLE LOG ANALYSIS")
            print("="*80)

            styling_logs = [l for l in console_logs if "[STYLING PIPELINE]" in l]
            print(f"\nTotal STYLING PIPELINE logs: {len(styling_logs)}")

            print("\nKey STYLING PIPELINE logs:")
            for log in styling_logs:
                if any(k in log for k in ["articleContent", "usingSource", "processedContent", "sectionCount", "hasImages"]):
                    safe_log = log.encode('ascii', 'replace').decode()
                    print(f"  {safe_log[:200]}")

            # Final verification
            print("\n" + "="*80)
            print("VERIFICATION SUMMARY")
            print("="*80)

            all_logs = " ".join(console_logs)

            checks = [
                ("articleContent passed", "Passing articleContent to renderBlueprint" in all_logs or "hasArticleContent: true" in all_logs),
                ("Using ACTUAL ARTICLE", "articleContent (ACTUAL ARTICLE)" in all_logs),
                ("NOT using brief summary", "blueprint.sourceContent (BRIEF SUMMARY)" not in all_logs or "articleContent (ACTUAL ARTICLE)" in all_logs),
                ("Has images in content", "hasImages: true" in all_logs),
            ]

            all_pass = True
            for name, passed in checks:
                status = "PASS" if passed else "????"
                print(f"  [{status}] {name}")
                if not passed:
                    all_pass = False

            if len(styling_logs) == 0:
                print("\n  [WARNING] No STYLING PIPELINE logs captured!")
                print("  This means the styling pipeline was not triggered.")
                print("  Check if the Style & Publish modal was properly opened.")

            # Save logs
            with open('tmp/vve_final_logs.txt', 'w', encoding='utf-8') as f:
                f.write("\n".join(console_logs))
            print(f"\nLogs saved to: tmp/vve_final_logs.txt")
            print(f"Screenshots saved to: tmp/vve_final_*.png")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/vve_final_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
