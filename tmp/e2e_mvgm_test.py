"""
E2E Test for MVGM project Style & Publish
"""

from playwright.sync_api import sync_playwright
import time

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("MVGM STYLE & PUBLISH TEST")
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

            # Find and click MVGM project specifically (the one with 3 maps, Dec 16, 2025)
            print("\n[2] Opening MVGM project...")
            page.wait_for_timeout(1000)

            # Use more specific selector - the row with exactly "MVGM" and "Dec 16, 2025"
            mvgm_row = page.get_by_role("row", name="MVGM mvgm.com 3 Dec 16, 2025")
            open_btn = mvgm_row.get_by_role("button").nth(1)  # Second button is Open
            open_btn.click()
            print("   Opened MVGM project")

            page.wait_for_timeout(2000)
            page.screenshot(path='tmp/mvgm_01_project.png')

            # Look for maps
            print("\n[3] Looking for topical maps...")
            page.wait_for_timeout(1000)

            # Check for Load Map button or map selector
            load_map = page.locator('button:has-text("Load Map")')
            if load_map.is_visible():
                load_map.click()
                page.wait_for_timeout(1000)
                print("   Clicked Load Map")

            page.screenshot(path='tmp/mvgm_02_maps.png')

            # Take screenshot of current state
            page.screenshot(path='tmp/mvgm_03_dashboard.png', full_page=True)

            # Try to find Content menu/tab
            print("\n[4] Checking Content menu...")
            content_elements = page.locator('text=Content').all()
            for el in content_elements:
                if el.is_visible():
                    el.click()
                    page.wait_for_timeout(1000)
                    print("   Clicked Content")
                    break

            page.screenshot(path='tmp/mvgm_04_content.png')

            # Look for any article or topic items
            print("\n[5] Looking for articles/topics...")
            page.screenshot(path='tmp/mvgm_05_state.png', full_page=True)

            # Check the Data menu for articles
            print("\n[6] Checking Data menu...")
            data_menu = page.locator('button:has-text("Data")').first
            if data_menu.is_visible():
                data_menu.click()
                page.wait_for_timeout(1000)
                print("   Opened Data menu")
                page.screenshot(path='tmp/mvgm_06_data.png')

            # Check Planning menu
            print("\n[7] Checking Planning menu...")
            planning_menu = page.locator('button:has-text("Planning")').first
            if planning_menu.is_visible():
                planning_menu.click()
                page.wait_for_timeout(1000)
                print("   Opened Planning menu")
                page.screenshot(path='tmp/mvgm_07_planning.png')

            # Final state
            page.screenshot(path='tmp/mvgm_08_final.png', full_page=True)

            print("\n" + "="*70)
            print("Screenshots saved to tmp/mvgm_*.png")
            print("="*70)

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/mvgm_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
