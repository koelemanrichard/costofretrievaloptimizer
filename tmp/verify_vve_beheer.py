"""
VERIFICATION TEST: Article Content Fix
Target: "Totaal VvE Beheer Almere" - has complete brief and draft

This test verifies that ACTUAL article content is rendered (not brief summaries)
"""

from playwright.sync_api import sync_playwright
import time

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*80)
    print("VERIFICATION: Totaal VvE Beheer Almere")
    print("="*80)

    console_logs = []
    key_indicators = {
        "articleContent_passed": False,
        "using_actual_article": False,
        "has_processed_content": False,
        "section_count": 0,
    }

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

                # Check key indicators
                if "hasArticleContent: true" in text:
                    key_indicators["articleContent_passed"] = True
                if "articleContent (ACTUAL ARTICLE)" in text:
                    key_indicators["using_actual_article"] = True
                if "hasProcessedContent: true" in text:
                    key_indicators["has_processed_content"] = True
                if "sectionCount:" in text:
                    import re
                    match = re.search(r'sectionCount:\s*(\d+)', text)
                    if match:
                        key_indicators["section_count"] = int(match.group(1))

        page.on("console", handle_console)

        try:
            # Step 1: Login
            print("\n[1] Logging in...")
            page.goto(BASE_URL)
            page.wait_for_load_state('networkidle')

            if page.locator('input[type="email"]').is_visible():
                page.fill('input[type="email"]', EMAIL)
                page.fill('input[type="password"]', PASSWORD)
                page.click('button[type="submit"]')
                page.wait_for_timeout(3000)
            print("   Done")

            # Step 2: Open mvgm vve project
            print("\n[2] Opening mvgm vve project...")
            page.wait_for_timeout(2000)

            # Find and click the Open button for mvgm vve
            mvgm_row = page.locator('tr:has-text("mvgm vve")').first
            if mvgm_row.is_visible():
                open_btn = mvgm_row.locator('button').nth(1)  # Second button is usually "Open"
                open_btn.click()
                page.wait_for_timeout(2000)
                print("   Opened mvgm vve project")

            page.screenshot(path='tmp/vve_01_project.png')

            # Step 3: Load the map with VvE Beheer content
            print("\n[3] Loading map...")
            # The second map typically has the content
            load_buttons = page.locator('button:has-text("Load Map")').all()
            print(f"   Found {len(load_buttons)} Load Map buttons")

            if len(load_buttons) >= 2:
                load_buttons[1].click()
                print("   Clicked second Load Map button")
            elif len(load_buttons) >= 1:
                load_buttons[0].click()
                print("   Clicked first Load Map button")

            page.wait_for_timeout(3000)
            page.screenshot(path='tmp/vve_02_map.png')

            # Step 4: Find "Totaal VvE Beheer Almere" in the table
            print("\n[4] Finding 'Totaal VvE Beheer Almere'...")

            # Make sure we're in Table view
            table_btn = page.locator('button:has-text("Table")').first
            if table_btn.is_visible():
                table_btn.click()
                page.wait_for_timeout(1000)

            # Scroll to find the topic - it might be lower in the list
            # First try direct text match
            topic_row = page.locator('tr:has-text("Totaal VvE Beheer Almere")').first

            if not topic_row.is_visible():
                print("   Scrolling to find topic...")
                # Try scrolling the table
                table_body = page.locator('tbody').first
                for _ in range(5):
                    table_body.evaluate('el => el.scrollTop += 300')
                    page.wait_for_timeout(500)
                    topic_row = page.locator('tr:has-text("Totaal VvE Beheer Almere")').first
                    if topic_row.is_visible():
                        break

            if topic_row.is_visible():
                topic_row.click()
                page.wait_for_timeout(1000)
                print("   Selected 'Totaal VvE Beheer Almere'")
            else:
                print("   WARNING: Could not find topic, trying alternative...")
                # Try clicking on any row with VvE
                alt_row = page.locator('tr:has-text("VvE Beheer")').first
                if alt_row.is_visible():
                    alt_row.click()
                    page.wait_for_timeout(1000)

            page.screenshot(path='tmp/vve_03_selected.png')

            # Step 5: Click View Brief button
            print("\n[5] Opening Brief modal...")
            view_brief = page.locator('button:has-text("View Brief")').first
            if view_brief.is_visible():
                view_brief.click()
                page.wait_for_timeout(2000)
                print("   Brief modal opened")
            else:
                print("   WARNING: View Brief button not visible")
                # Try looking for it in the expanded row or sidebar
                page.screenshot(path='tmp/vve_04_no_brief_btn.png')

            page.screenshot(path='tmp/vve_04_brief.png')

            # Step 6: Click on Draft tab
            print("\n[6] Clicking Draft tab...")
            draft_tab = page.locator('[role="tab"]:has-text("Draft")').first
            if not draft_tab.is_visible():
                draft_tab = page.locator('button:has-text("Draft")').first

            if draft_tab.is_visible():
                draft_tab.click()
                page.wait_for_timeout(2000)
                print("   Draft tab clicked")
            else:
                print("   WARNING: Draft tab not found")
                # List all tabs
                tabs = page.locator('[role="tab"]').all()
                print(f"   Available tabs: {len(tabs)}")
                for tab in tabs:
                    try:
                        print(f"     - {tab.text_content()[:30]}")
                    except:
                        pass

            page.screenshot(path='tmp/vve_05_draft.png')

            # Step 7: Look for Style & Publish or Publish dropdown
            print("\n[7] Looking for Style & Publish...")

            # First check for a Publish dropdown/menu
            publish_dropdown = page.locator('button:has-text("Publish")').first
            if publish_dropdown.is_visible():
                publish_dropdown.click()
                page.wait_for_timeout(1000)
                print("   Clicked Publish dropdown")

                # Now look for Style & Publish in the menu
                style_option = page.locator('text=Style & Publish').first
                if style_option.is_visible():
                    style_option.click()
                    page.wait_for_timeout(2000)
                    print("   Clicked Style & Publish option")

            # Alternative: direct Style & Publish button
            style_btn = page.locator('button:has-text("Style & Publish")').first
            if style_btn.is_visible():
                style_btn.click()
                page.wait_for_timeout(2000)
                print("   Clicked Style & Publish button")

            page.screenshot(path='tmp/vve_06_style_modal.png')

            # Step 8: Configure and generate preview
            print("\n[8] Configuring brand and generating preview...")

            # Check if we're in the Style & Publish wizard
            # Look for URL input or brand configuration
            url_input = page.locator('input[placeholder*="url" i], input[placeholder*="website" i], input[type="url"]').first
            if url_input.is_visible():
                url_input.fill("https://mvgm.com")
                page.wait_for_timeout(500)
                print("   Entered brand URL")

                # Look for Extract/Analyze button
                extract_btn = page.locator('button:has-text("Extract"), button:has-text("Analyze"), button:has-text("Detect")').first
                if extract_btn.is_visible():
                    extract_btn.click()
                    page.wait_for_timeout(8000)
                    print("   Brand extraction started, waiting...")

            page.screenshot(path='tmp/vve_07_brand.png')

            # Step 9: Navigate through wizard to preview
            print("\n[9] Navigating to preview...")

            for step in range(5):
                page.wait_for_timeout(2000)

                # Look for Next/Continue/Generate buttons
                next_btn = page.locator('button:has-text("Next"), button:has-text("Continue")').first
                generate_btn = page.locator('button:has-text("Generate Preview"), button:has-text("Generate")').first

                if generate_btn.is_visible():
                    generate_btn.click()
                    print(f"   Step {step+1}: Clicked Generate")
                    page.wait_for_timeout(10000)  # Wait for generation
                    break
                elif next_btn.is_visible():
                    next_btn.click()
                    print(f"   Step {step+1}: Clicked Next")
                else:
                    print(f"   Step {step+1}: No navigation button found")
                    break

            page.screenshot(path='tmp/vve_08_preview.png')

            # Step 10: Wait and capture final state
            print("\n[10] Capturing final state...")
            page.wait_for_timeout(5000)
            page.screenshot(path='tmp/vve_09_final.png', full_page=True)

            # Analyze results
            print("\n" + "="*80)
            print("CONSOLE LOG ANALYSIS")
            print("="*80)

            styling_logs = [l for l in console_logs if "[STYLING PIPELINE]" in l]
            print(f"\nTotal STYLING PIPELINE logs: {len(styling_logs)}")

            # Show all styling logs
            print("\nAll STYLING PIPELINE logs:")
            for i, log in enumerate(styling_logs):
                safe_log = log.encode('ascii', 'replace').decode()
                print(f"  {i+1}. {safe_log[:200]}")

            # Final verification
            print("\n" + "="*80)
            print("VERIFICATION RESULTS")
            print("="*80)

            if key_indicators["articleContent_passed"] or key_indicators["has_processed_content"]:
                print("\n[PASS] articleContent/processedContent was passed to renderBlueprint")
            else:
                print("\n[????] articleContent parameter - check logs above")

            if key_indicators["using_actual_article"]:
                print("[PASS] Using ACTUAL ARTICLE content (not brief summaries)")
            else:
                print("[????] Article content usage - check logs above")

            if key_indicators["section_count"] > 0:
                print(f"[INFO] Section count: {key_indicators['section_count']}")

            # Check for key phrases in logs
            all_log_text = " ".join(console_logs)

            if "articleContent (ACTUAL ARTICLE)" in all_log_text:
                print("\n*** CONFIRMED: 'articleContent (ACTUAL ARTICLE)' found in logs ***")
            elif "blueprint.sourceContent (BRIEF SUMMARY)" in all_log_text:
                print("\n*** WARNING: Still using 'blueprint.sourceContent (BRIEF SUMMARY)' ***")

            if "Passing articleContent to renderBlueprint" in all_log_text:
                print("*** CONFIRMED: articleContent is being passed ***")

            # Save logs
            with open('tmp/vve_console_logs.txt', 'w', encoding='utf-8') as f:
                f.write("\n".join(console_logs))
            print("\nFull logs saved to: tmp/vve_console_logs.txt")
            print("Screenshots saved to: tmp/vve_*.png")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/vve_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
