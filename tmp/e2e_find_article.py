"""
Find the correct project with the Totaal VvE Beheer article
"""

from playwright.sync_api import sync_playwright
import time

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("FINDING PROJECT WITH VVE BEHEER ARTICLE")
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

            page.screenshot(path='tmp/find_01_login.png')

            # Look at all projects
            print("\n[2] Examining projects...")
            page.wait_for_timeout(2000)

            # Get all project cards/items
            project_elements = page.locator('[class*="project"], [class*="Project"], [class*="card"], [class*="Card"]').all()
            print(f"   Found {len(project_elements)} potential project elements")

            # Take screenshot of project list
            page.screenshot(path='tmp/find_02_projects.png', full_page=True)

            # Try to find text content
            body_text = page.locator('body').text_content()
            if 'VvE' in body_text or 'vve' in body_text.lower():
                print("   Found 'VvE' in page content")

            # Look for any buttons or links
            buttons = page.locator('button').all()
            print(f"\n   Buttons on page:")
            for i, btn in enumerate(buttons[:10]):
                text = btn.text_content()
                if text:
                    print(f"   {i+1}. {text.strip()[:50]}")

            # Click on Content menu to see if articles are there
            print("\n[3] Checking Content menu...")
            content_menu = page.locator('text=Content').first
            if content_menu.is_visible():
                content_menu.click()
                page.wait_for_timeout(1000)
                page.screenshot(path='tmp/find_03_content_menu.png')

            # Check for any dropdown items
            menu_items = page.locator('[role="menuitem"], [class*="menu-item"], [class*="MenuItem"]').all()
            print(f"   Menu items: {len(menu_items)}")
            for item in menu_items[:10]:
                text = item.text_content()
                if text:
                    print(f"   - {text.strip()[:50]}")

            # Go back to projects and try different project
            print("\n[4] Going back to projects...")
            back_btn = page.locator('text=Back to Projects').first
            if back_btn.is_visible():
                back_btn.click()
                page.wait_for_timeout(2000)
                page.screenshot(path='tmp/find_04_back.png', full_page=True)

            # List all visible text that might be project names
            print("\n[5] Looking for project names...")
            headings = page.locator('h1, h2, h3, h4, [class*="title"], [class*="name"]').all()
            for h in headings[:15]:
                text = h.text_content()
                if text and len(text.strip()) > 2:
                    print(f"   - {text.strip()[:60]}")

            # Final state
            page.screenshot(path='tmp/find_05_final.png', full_page=True)

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/find_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

    print("\n" + "="*70)
    print("Done - check tmp/find_*.png screenshots")
    print("="*70)

if __name__ == "__main__":
    main()
