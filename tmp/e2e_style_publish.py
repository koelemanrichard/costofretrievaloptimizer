"""
E2E Test - Navigate to Style & Publish via View Brief
"""

from playwright.sync_api import sync_playwright

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("STYLE & PUBLISH VIA VIEW BRIEF")
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
                load_buttons[1].click()
                page.wait_for_timeout(3000)
            print("   Done")

            # Click on the VvE Beheer article row to expand it
            print("\n[4] Expanding VvE Beheer article...")
            article_row = page.locator('text=Totaal VvE Beheer Almere').first
            if article_row.is_visible():
                article_row.click()
                page.wait_for_timeout(1000)

            page.screenshot(path='tmp/sp_01_selected.png')

            # Click on View Brief button
            print("\n[5] Clicking View Brief...")
            view_brief = page.locator('button:has-text("View Brief")').first
            if view_brief.is_visible():
                view_brief.click()
                page.wait_for_timeout(2000)
                print("   Brief modal opened")

            page.screenshot(path='tmp/sp_02_brief.png')

            # Look for Draft or Style options in the brief modal
            print("\n[6] Looking for Draft/Style options...")

            # Check for tabs or buttons in the modal
            tabs = page.locator('[role="tab"], button[class*="tab"]').all()
            for tab in tabs[:10]:
                try:
                    text = tab.text_content()
                    if text:
                        safe_text = text.encode('ascii', 'replace').decode()
                        print(f"   Tab: {safe_text[:40]}")
                except:
                    pass

            # Look for Generate Draft button
            generate_draft = page.locator('button:has-text("Generate Draft"), button:has-text("Draft")').first
            if generate_draft.is_visible():
                print("   Found Generate Draft button")
                generate_draft.click()
                page.wait_for_timeout(3000)

            page.screenshot(path='tmp/sp_03_drafting.png')

            # Look for Style & Publish in the drafting modal
            print("\n[7] Looking for Style & Publish...")
            style_btn = page.locator('button:has-text("Style"), button:has-text("Publish"), button:has-text("Stylize")').first
            if style_btn.is_visible():
                print("   Found Style/Publish button!")
                style_btn.click()
                page.wait_for_timeout(2000)

            page.screenshot(path='tmp/sp_04_style.png')

            # Check all visible buttons
            print("\n[8] All visible buttons:")
            buttons = page.locator('button:visible').all()
            for btn in buttons[:15]:
                try:
                    text = btn.text_content()
                    if text and len(text.strip()) > 1:
                        safe_text = text.encode('ascii', 'replace').decode().strip()[:40]
                        print(f"   - {safe_text}")
                except:
                    pass

            # Take full page screenshot
            page.screenshot(path='tmp/sp_05_full.png', full_page=True)

            print("\n" + "="*70)
            print("Screenshots saved to tmp/sp_*.png")
            print("="*70)

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/sp_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
