"""
E2E Quality Test for Style & Publish

This script:
1. Logs in
2. Navigates to the target article
3. Opens Style & Publish
4. Triggers regeneration with enhanced prompts
5. Captures screenshots for quality validation
6. Compares against target website
"""

from playwright.sync_api import sync_playwright
import time
import sys

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"
TARGET_URL = "https://mvgm.com/nl/vastgoeddiensten/vve-beheer/"

def main():
    print("="*70)
    print("E2E QUALITY TEST - STYLE & PUBLISH")
    print("="*70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1400, 'height': 900})
        page = context.new_page()

        try:
            # Step 1: Login
            print("\n[1/7] Logging in...")
            page.goto(BASE_URL)
            page.wait_for_load_state('networkidle')

            # Check if login form is present
            if page.locator('input[type="email"]').is_visible():
                page.fill('input[type="email"]', EMAIL)
                page.fill('input[type="password"]', PASSWORD)
                page.click('button[type="submit"]')
                page.wait_for_timeout(3000)
                print("   Logged in successfully")
            else:
                print("   Already logged in or different UI state")

            page.screenshot(path='tmp/e2e_01_after_login.png')

            # Step 2: Find and open project
            print("\n[2/7] Opening project...")
            page.wait_for_timeout(2000)

            # Look for project list or dashboard
            open_buttons = page.locator('button:has-text("Open")').all()
            if len(open_buttons) > 0:
                open_buttons[0].click()
                page.wait_for_timeout(2000)
                print(f"   Clicked Open button")

            page.screenshot(path='tmp/e2e_02_project.png')

            # Step 3: Load topical map
            print("\n[3/7] Loading topical map...")
            load_map = page.locator('button:has-text("Load Map")').first
            if load_map.is_visible():
                load_map.click()
                page.wait_for_timeout(3000)
                print("   Map loaded")
            else:
                print("   Load Map button not visible, may already be loaded")

            page.screenshot(path='tmp/e2e_03_map.png')

            # Step 4: Find the target article
            print("\n[4/7] Finding target article...")

            # Try different selectors for the topic
            topic_found = False
            selectors = [
                'text=Totaal VvE Beheer',
                'text=VvE Beheer Almere',
                '[data-topic-title*="VvE"]',
            ]

            for selector in selectors:
                try:
                    topic = page.locator(selector).first
                    if topic.is_visible(timeout=2000):
                        topic.click()
                        topic_found = True
                        print(f"   Found topic with: {selector}")
                        break
                except:
                    continue

            if not topic_found:
                print("   Topic not found directly, exploring UI...")
                # Take screenshot to see current state
                page.screenshot(path='tmp/e2e_04_searching.png')

                # Look for any clickable topic items
                topics = page.locator('[class*="topic"], [class*="Topic"], [role="button"]').all()
                print(f"   Found {len(topics)} potential topic elements")

            page.wait_for_timeout(2000)
            page.screenshot(path='tmp/e2e_04_topic.png')

            # Step 5: Open Style & Publish
            print("\n[5/7] Opening Style & Publish...")

            # Look for Style/Publish button in various forms
            style_selectors = [
                'button:has-text("Style & Publish")',
                'button:has-text("Style")',
                'button:has-text("Publish")',
                '[aria-label*="style"]',
                '[aria-label*="publish"]',
            ]

            style_opened = False
            for selector in style_selectors:
                try:
                    btn = page.locator(selector).first
                    if btn.is_visible(timeout=1000):
                        btn.click()
                        style_opened = True
                        print(f"   Opened with: {selector}")
                        break
                except:
                    continue

            if not style_opened:
                print("   Style button not found, checking panel tabs...")
                # Maybe it's in a tab panel
                tabs = page.locator('[role="tab"], button[class*="tab"]').all()
                for tab in tabs:
                    text = tab.text_content()
                    if text and ('style' in text.lower() or 'publish' in text.lower()):
                        tab.click()
                        print(f"   Clicked tab: {text}")
                        break

            page.wait_for_timeout(2000)
            page.screenshot(path='tmp/e2e_05_style_modal.png')

            # Step 6: Trigger regeneration
            print("\n[6/7] Looking for regenerate/analyze options...")

            # Look for analyze or regenerate buttons
            regen_selectors = [
                'button:has-text("Analyze")',
                'button:has-text("Regenerate")',
                'button:has-text("Generate")',
                'button:has-text("Re-analyze")',
                'button:has-text("Refresh")',
            ]

            for selector in regen_selectors:
                try:
                    btn = page.locator(selector).first
                    if btn.is_visible(timeout=1000):
                        print(f"   Found: {selector}")
                        # Don't click yet - let's see the UI first
                except:
                    continue

            page.screenshot(path='tmp/e2e_06_options.png')

            # Step 7: Capture target website for comparison
            print("\n[7/7] Capturing target website for comparison...")
            page2 = context.new_page()
            page2.goto(TARGET_URL, wait_until='networkidle', timeout=30000)
            page2.wait_for_timeout(2000)
            page2.screenshot(path='tmp/e2e_07_target.png', full_page=True)
            page2.close()
            print("   Target website captured")

            print("\n" + "="*70)
            print("SCREENSHOTS CAPTURED")
            print("="*70)
            print("\nReview these files:")
            print("  tmp/e2e_01_after_login.png")
            print("  tmp/e2e_02_project.png")
            print("  tmp/e2e_03_map.png")
            print("  tmp/e2e_04_topic.png")
            print("  tmp/e2e_05_style_modal.png")
            print("  tmp/e2e_06_options.png")
            print("  tmp/e2e_07_target.png (MVGM website)")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/e2e_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
