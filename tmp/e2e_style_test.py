"""
E2E Test for Style & Publish with MVGM vastgoedmanagement map
"""

from playwright.sync_api import sync_playwright
import time

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("STYLE & PUBLISH E2E TEST")
    print("="*70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1400, 'height': 900})
        page = context.new_page()

        try:
            # Login
            print("\n[1] Logging in...")
            page.goto(BASE_URL)
            page.wait_for_load_state('networkidle')

            if page.locator('input[type="email"]').is_visible():
                page.fill('input[type="email"]', EMAIL)
                page.fill('input[type="password"]', PASSWORD)
                page.click('button[type="submit"]')
                page.wait_for_timeout(3000)
            print("   Done")

            # Open MVGM project
            print("\n[2] Opening MVGM project...")
            page.wait_for_timeout(1000)
            mvgm_row = page.get_by_role("row", name="MVGM mvgm.com 3 Dec 16, 2025")
            open_btn = mvgm_row.get_by_role("button").nth(1)
            open_btn.click()
            page.wait_for_timeout(2000)
            print("   Done")

            # Load the vastgoedmanagement map (first Load Map button)
            print("\n[3] Loading MVGM vastgoedmanagement map...")
            load_buttons = page.get_by_role("button", name="Load Map").all()
            if len(load_buttons) > 0:
                load_buttons[0].click()  # First one is vastgoedmanagement
                page.wait_for_timeout(3000)
                print("   Map loaded")

            page.screenshot(path='tmp/style_01_dashboard.png')

            # Now we should be in the dashboard with the map loaded
            # Look for topics in the Content section
            print("\n[4] Looking for topics...")

            # Click on Content menu
            content_btn = page.locator('button:has-text("Content")').first
            if content_btn.is_visible():
                content_btn.click()
                page.wait_for_timeout(1000)

            page.screenshot(path='tmp/style_02_content.png')

            # Look for any topic/article items
            # Try clicking on a visible topic
            topic_items = page.locator('[class*="topic"], [class*="Topic"], li, tr').all()
            print(f"   Found {len(topic_items)} potential topic elements")

            # Take full page screenshot to see all content
            page.screenshot(path='tmp/style_03_full.png', full_page=True)

            # Check for VvE text anywhere
            vve_loc = page.locator('text=VvE').first
            if vve_loc.is_visible():
                print("   Found VvE text - clicking...")
                vve_loc.click()
                page.wait_for_timeout(2000)
                page.screenshot(path='tmp/style_04_vve.png')

            # Look for Style & Publish button
            print("\n[5] Looking for Style & Publish...")
            style_btn = page.locator('button:has-text("Style")').first
            if style_btn.is_visible():
                print("   Found Style button")
                style_btn.click()
                page.wait_for_timeout(2000)
                page.screenshot(path='tmp/style_05_modal.png')

            # Look for Publish button
            publish_btn = page.locator('button:has-text("Publish")').first
            if publish_btn.is_visible():
                print("   Found Publish button")
                page.screenshot(path='tmp/style_06_publish.png')

            # Check for any modal or panel that opened
            page.screenshot(path='tmp/style_07_state.png', full_page=True)

            # Print current URL and page title for debugging
            print(f"\n   Current URL: {page.url}")

            print("\n" + "="*70)
            print("Screenshots saved - review tmp/style_*.png")
            print("="*70)

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/style_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
