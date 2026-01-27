"""
E2E Test - Check mvgm vve project for articles
"""

from playwright.sync_api import sync_playwright

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("MVGM VVE PROJECT TEST")
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

            # Open mvgm vve project (has 4 maps)
            print("\n[2] Opening mvgm vve project...")
            page.wait_for_timeout(1000)
            mvgm_row = page.get_by_role("row", name="mvgm vve mvgm.com 4 Sep 8,")
            open_btn = mvgm_row.get_by_role("button").nth(1)
            open_btn.click()
            page.wait_for_timeout(2000)
            print("   Done")

            page.screenshot(path='tmp/vve_01_maps.png')

            # List all maps available
            print("\n[3] Available maps:")
            map_sections = page.locator('[class*="map"], [class*="Map"]').all()

            # Check for Load Map buttons and their associated names
            load_buttons = page.get_by_role("button", name="Load Map").all()
            print(f"   Found {len(load_buttons)} maps")

            # Try loading each map to find one with content
            for i, btn in enumerate(load_buttons):
                print(f"\n[4.{i+1}] Loading map {i+1}...")
                btn.click()
                page.wait_for_timeout(3000)

                page.screenshot(path=f'tmp/vve_map{i+1}.png')

                # Check if this map has topics
                empty_text = page.locator('text=Topical Map is Empty')
                if not empty_text.is_visible():
                    print(f"   Map {i+1} has content!")

                    # Look for VvE Beheer article
                    vve_loc = page.locator('text=VvE Beheer').first
                    if vve_loc.is_visible():
                        print("   Found VvE Beheer article!")
                        vve_loc.click()
                        page.wait_for_timeout(2000)
                        page.screenshot(path='tmp/vve_article_found.png')

                        # Look for Style & Publish
                        style_btn = page.locator('button:has-text("Style"), button:has-text("Publish")').first
                        if style_btn.is_visible():
                            print("   Found Style/Publish button!")
                            page.screenshot(path='tmp/vve_style_btn.png')
                        break
                else:
                    print(f"   Map {i+1} is empty")

                # Go back to map selection
                back_btn = page.locator('text=Back to Projects').first
                if back_btn.is_visible():
                    back_btn.click()
                    page.wait_for_timeout(1000)
                    # Re-open mvgm vve
                    mvgm_row = page.get_by_role("row", name="mvgm vve mvgm.com 4 Sep 8,")
                    open_btn = mvgm_row.get_by_role("button").nth(1)
                    open_btn.click()
                    page.wait_for_timeout(2000)

            # Final state
            page.screenshot(path='tmp/vve_final.png', full_page=True)

            print("\n" + "="*70)
            print("Test complete - check tmp/vve_*.png")
            print("="*70)

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/vve_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
