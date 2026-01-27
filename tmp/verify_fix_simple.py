"""
SIMPLIFIED VERIFICATION: Article Content Fix (Problem 0)

This test verifies the code changes by checking console logs
when the Style & Publish modal generates a preview.

Key verification:
- Console should show: "usingSource: 'articleContent (ACTUAL ARTICLE)'"
- NOT: "usingSource: 'blueprint.sourceContent (BRIEF SUMMARY)'"
"""

from playwright.sync_api import sync_playwright
import time

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*80)
    print("VERIFICATION: Article Content Fix")
    print("="*80)

    console_logs = []
    key_indicators = {
        "articleContent_passed": False,
        "using_actual_article": False,
        "has_images": False,
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})
        page = context.new_page()

        def handle_console(msg):
            text = msg.text
            console_logs.append(text)
            if "[STYLING PIPELINE]" in text:
                safe_text = text.encode('ascii', 'replace').decode()
                print(f"  [LOG] {safe_text[:150]}")

                # Check key indicators
                if "hasArticleContent: true" in text:
                    key_indicators["articleContent_passed"] = True
                if "articleContent (ACTUAL ARTICLE)" in text:
                    key_indicators["using_actual_article"] = True
                if "hasImages: true" in text:
                    key_indicators["has_images"] = True

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

            # Step 2: Open project
            print("\n[2] Opening project...")
            # Try to find mvgm vve project row
            try:
                mvgm_row = page.get_by_role("row", name="mvgm vve")
                open_btn = mvgm_row.get_by_role("button").nth(1)
                open_btn.click()
                page.wait_for_timeout(2000)
                print("   Opened mvgm vve")
            except:
                # Fall back to clicking first project
                page.locator('button:has-text("Open")').first.click()
                page.wait_for_timeout(2000)
                print("   Opened first project")

            page.screenshot(path='tmp/verify_simple_01.png')

            # Step 3: Load map
            print("\n[3] Loading map...")
            load_buttons = page.get_by_role("button", name="Load Map").all()
            if len(load_buttons) >= 2:
                load_buttons[1].click()  # Second map usually has content
            elif len(load_buttons) >= 1:
                load_buttons[0].click()
            page.wait_for_timeout(3000)
            print("   Map loaded")

            page.screenshot(path='tmp/verify_simple_02.png')

            # Step 4: Find topic with Draft and click on it
            print("\n[4] Finding topic with draft...")

            # Click on Table view to see all topics
            table_btn = page.locator('button:has-text("Table")').first
            if table_btn.is_visible():
                table_btn.click()
                page.wait_for_timeout(1000)

            # Look for "Totaal VvE Beheer Almere" which has a draft
            topic = page.locator('tr:has-text("Totaal VvE Beheer"), tr:has-text("VvE Beheer")').first
            if topic.is_visible():
                topic.click()
                page.wait_for_timeout(1000)
                print("   Selected VvE Beheer topic")
            else:
                # Click any row in the table
                rows = page.locator('tbody tr').all()
                if rows:
                    rows[0].click()
                    page.wait_for_timeout(1000)
                    print("   Selected first topic")

            page.screenshot(path='tmp/verify_simple_03.png')

            # Step 5: Click View Brief button
            print("\n[5] Opening Brief modal...")
            view_brief = page.locator('button:has-text("View Brief")').first
            if view_brief.is_visible():
                view_brief.click()
                page.wait_for_timeout(2000)
                print("   Brief modal opened")

            page.screenshot(path='tmp/verify_simple_04.png')

            # Step 6: Click on Draft tab
            print("\n[6] Clicking Draft tab...")
            draft_tab = page.locator('[role="tab"]:has-text("Draft"), button:has-text("Draft")').first
            if draft_tab.is_visible():
                draft_tab.click()
                page.wait_for_timeout(2000)
                print("   Draft tab clicked")

            page.screenshot(path='tmp/verify_simple_05.png')

            # Step 7: Look for Style & Publish button in the drafting modal
            print("\n[7] Looking for Style & Publish...")

            # Look for dropdown or direct button
            style_btn = page.locator('button:has-text("Style & Publish"), button:has-text("Stylize")').first
            if style_btn.is_visible():
                style_btn.click()
                page.wait_for_timeout(3000)
                print("   Style & Publish clicked")

            page.screenshot(path='tmp/verify_simple_06.png')

            # Step 8: Configure brand and generate preview
            print("\n[8] Configuring and generating...")

            # Fill brand URL if visible
            url_input = page.locator('input[placeholder*="url" i], input[type="url"]').first
            if url_input.is_visible():
                url_input.fill("https://mvgm.com")
                page.wait_for_timeout(500)

            # Click through wizard steps
            for i in range(5):
                next_btn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Generate")').first
                if next_btn.is_visible():
                    try:
                        next_btn.click()
                        page.wait_for_timeout(3000)
                    except:
                        break

            page.screenshot(path='tmp/verify_simple_07.png')

            # Step 9: Wait for generation and check logs
            print("\n[9] Waiting for generation...")
            page.wait_for_timeout(5000)

            page.screenshot(path='tmp/verify_simple_08.png', full_page=True)

            # Step 10: Analyze results
            print("\n" + "="*80)
            print("VERIFICATION RESULTS")
            print("="*80)

            # Count STYLING PIPELINE logs
            styling_logs = [l for l in console_logs if "[STYLING PIPELINE]" in l]
            print(f"\nTotal STYLING PIPELINE logs captured: {len(styling_logs)}")

            # Show key logs
            print("\nKey log entries:")
            for log in styling_logs:
                if any(k in log for k in ["articleContent", "usingSource", "hasImages", "sectionCount"]):
                    safe_log = log[:150].encode('ascii', 'replace').decode()
                    print(f"  {safe_log}")

            # Final verdict
            print("\n" + "-"*40)
            print("FIX VERIFICATION:")
            print("-"*40)

            if key_indicators["articleContent_passed"]:
                print("  [PASS] articleContent parameter was passed to renderBlueprint")
            else:
                print("  [FAIL] articleContent parameter NOT detected in logs")
                print("         (May need to trigger preview generation)")

            if key_indicators["using_actual_article"]:
                print("  [PASS] Using ACTUAL ARTICLE content (not brief summaries)")
            else:
                print("  [FAIL] Not using actual article content")
                print("         (Check for 'articleContent (ACTUAL ARTICLE)' in logs)")

            if key_indicators["has_images"]:
                print("  [PASS] Images detected in content")
            else:
                print("  [INFO] No image indicators in logs (may be expected)")

            # Save all logs
            with open('tmp/verify_simple_logs.txt', 'w', encoding='utf-8') as f:
                f.write("\n".join(console_logs))
            print("\nFull logs saved to: tmp/verify_simple_logs.txt")
            print("Screenshots saved to: tmp/verify_simple_*.png")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/verify_simple_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
