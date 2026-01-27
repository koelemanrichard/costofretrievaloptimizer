"""
Final E2E Test - Style & Publish the VvE Beheer article
"""

from playwright.sync_api import sync_playwright
import os

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("STYLE & PUBLISH - VVE BEHEER ARTICLE")
    print("="*70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})
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

            # Open mvgm vve project
            print("\n[2] Opening mvgm vve project...")
            mvgm_row = page.get_by_role("row", name="mvgm vve mvgm.com 4 Sep 8,")
            mvgm_row.get_by_role("button").nth(1).click()
            page.wait_for_timeout(2000)
            print("   Done")

            # Load map 2 (second Load Map button)
            print("\n[3] Loading map with content...")
            load_buttons = page.get_by_role("button", name="Load Map").all()
            if len(load_buttons) >= 2:
                load_buttons[1].click()  # Second map has content
                page.wait_for_timeout(3000)
            print("   Done")

            page.screenshot(path='tmp/final_01_map.png')

            # Find and click on the VvE Beheer article row
            print("\n[4] Selecting VvE Beheer article...")
            article_row = page.locator('text=Totaal VvE Beheer Almere').first
            if article_row.is_visible():
                article_row.click()
                page.wait_for_timeout(1000)

            page.screenshot(path='tmp/final_02_selected.png')

            # Look for Style & Publish or related action buttons
            print("\n[5] Looking for Style & Publish...")

            # Check all buttons in the page for style-related text
            all_buttons = page.locator('button').all()
            style_buttons = []
            for btn in all_buttons:
                try:
                    text = btn.text_content() or ""
                    if any(keyword in text.lower() for keyword in ['style', 'publish', 'draft', 'generate']):
                        style_buttons.append(text.strip()[:50])
                except:
                    pass

            print(f"   Found buttons: {style_buttons}")

            # Look for icons/action buttons in the row
            action_icons = page.locator('[class*="action"], [class*="icon"], svg').all()
            print(f"   Found {len(action_icons)} action/icon elements")

            # Try clicking on the page/document icon in the Actions column
            # The Actions column has icons for viewing/editing
            page_icons = page.locator('button:has(svg), [role="button"]:has(svg)').all()
            print(f"   Found {len(page_icons)} icon buttons")

            # Look for View Brief button
            view_brief = page.locator('button:has-text("View Brief")').first
            if view_brief.is_visible():
                print("   Found View Brief button")

            # Look for Expand Topic button
            expand_topic = page.locator('button:has-text("Expand Topic")').first
            if expand_topic.is_visible():
                print("   Found Expand Topic button")
                expand_topic.click()
                page.wait_for_timeout(2000)

            page.screenshot(path='tmp/final_03_expanded.png')

            # Check the right sidebar or panel for Style options
            print("\n[6] Checking for Style panel...")

            # Look in the right side panel or modal
            style_panel = page.locator('[class*="panel"], [class*="sidebar"], [class*="modal"]')

            # Take full screenshot
            page.screenshot(path='tmp/final_04_full.png', full_page=True)

            # Check the Advanced menu
            print("\n[7] Checking Advanced menu...")
            advanced_btn = page.locator('button:has-text("Advanced")').first
            if advanced_btn.is_visible():
                advanced_btn.click()
                page.wait_for_timeout(1000)
                page.screenshot(path='tmp/final_05_advanced.png')

            # Look for any dropdown menu items
            menu_items = page.locator('[role="menuitem"], [class*="menu-item"]').all()
            print(f"   Found {len(menu_items)} menu items")
            for item in menu_items[:10]:
                try:
                    text = item.text_content()
                    if text:
                        print(f"   - {text.strip()[:40]}")
                except:
                    pass

            # Check Planning menu
            print("\n[8] Checking Planning menu...")
            planning_btn = page.locator('button:has-text("Planning")').first
            if planning_btn.is_visible():
                planning_btn.click()
                page.wait_for_timeout(1000)
                page.screenshot(path='tmp/final_06_planning.png')

            # Final screenshot
            page.screenshot(path='tmp/final_07_state.png', full_page=True)

            print("\n" + "="*70)
            print("Screenshots saved to tmp/final_*.png")
            print("="*70)

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/final_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
