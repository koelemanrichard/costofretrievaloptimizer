"""
E2E Test - Navigate to Style & Publish, capture styled output
"""

from playwright.sync_api import sync_playwright

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("STYLE & PUBLISH - CAPTURE STYLED OUTPUT")
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
            page.wait_for_selector('table', timeout=10000)
            mvgm_row = page.get_by_role("row", name="mvgm vve mvgm.com 4 Sep 8,")
            mvgm_row.get_by_role("button").nth(1).click()
            page.wait_for_timeout(2000)
            print("   Done")

            # Load map 2 (second Load Map button - has content)
            print("\n[3] Loading map with content...")
            page.wait_for_selector('button:has-text("Load Map")', timeout=10000)
            load_buttons = page.get_by_role("button", name="Load Map").all()
            if len(load_buttons) >= 2:
                load_buttons[1].click()
                page.wait_for_timeout(3000)
            print("   Done")

            # Find and click on the VvE Beheer article to select it
            print("\n[4] Selecting VvE Beheer article...")
            page.wait_for_selector('text=Totaal VvE Beheer', timeout=10000)
            article_row = page.locator('tr:has-text("Totaal VvE Beheer Almere")').first
            if article_row.is_visible():
                article_row.click()
                page.wait_for_timeout(1000)
                print("   Article row clicked")

            # Click View Brief button
            print("\n[5] Opening Content Brief modal...")
            view_brief = page.locator('button:has-text("View Brief")').first
            if view_brief.is_visible():
                view_brief.click()
                page.wait_for_timeout(2000)
                print("   Content Brief modal opened")

            # Click "View Draft" button to open the Drafting Modal
            print("\n[6] Opening Article Draft Workspace...")
            view_draft = page.locator('button:has-text("View Draft")').first
            if view_draft.is_visible():
                view_draft.click()
                page.wait_for_timeout(3000)
                print("   Article Draft Workspace opened")

            # Click the Publish dropdown button
            print("\n[7] Opening Publish dropdown and clicking Style & Publish...")
            publish_btn = page.locator('button:has-text("Publish")').first
            if publish_btn.is_visible():
                publish_btn.click()
                page.wait_for_timeout(500)

            # Click Style & Publish
            page.click('text=Style & Publish')
            page.wait_for_timeout(3000)
            print("   Style & Publish modal opened!")

            page.screenshot(path='tmp/styled_01_brand.png')
            print("\n[8] STEP 1: Brand Intelligence")
            print("   - Brand profile auto-loaded from saved data")

            # Wait for any automatic detection to complete
            page.wait_for_timeout(2000)

            # ---- STEP 1 → STEP 2: Click Next ----
            print("\n[9] Clicking Next to go to Layout step...")
            # Find the modal's Next button (blue button at bottom)
            # Use a more specific selector for the Style & Publish modal
            modal = page.locator('.fixed.inset-0.bg-black.bg-opacity-70.z-50.flex.justify-center.items-center').first
            if modal.is_visible():
                next_btn = modal.locator('button:has-text("Next")').first
                if next_btn.is_visible():
                    next_btn.click()
                    page.wait_for_timeout(3000)
                    print("   Clicked Next")

            page.screenshot(path='tmp/styled_02_layout.png')
            print("\n[10] STEP 2: Layout Intelligence")

            # Check if we're on the Layout step
            layout_heading = page.locator('text=Layout Intelligence').first
            if layout_heading.is_visible():
                print("   - Layout analysis visible")

            # Wait for layout generation
            page.wait_for_timeout(2000)

            # ---- STEP 2 → STEP 3: Click Next ----
            print("\n[11] Clicking Next to go to Preview step...")
            modal = page.locator('.fixed.inset-0.bg-black.bg-opacity-70.z-50.flex.justify-center.items-center').first
            if modal.is_visible():
                next_btn = modal.locator('button:has-text("Next")').first
                if next_btn.is_visible():
                    next_btn.click()
                    page.wait_for_timeout(5000)  # Longer wait for preview generation
                    print("   Clicked Next - generating preview...")

            page.screenshot(path='tmp/styled_03_preview.png')
            print("\n[12] STEP 3: Preview")

            # Check if preview is visible
            preview_heading = page.locator('text=Preview, text=Styled Preview, text=Generated Preview').first
            if preview_heading.is_visible():
                print("   - Preview visible!")

            # Look for iframe with styled content
            iframe = page.locator('iframe').first
            if iframe.is_visible():
                print("   - Preview iframe found")

                # Get the iframe content
                frame = page.frame_locator('iframe').first
                if frame:
                    # Take screenshot of just the iframe content
                    page.wait_for_timeout(2000)

            # Wait for preview to fully render
            page.wait_for_timeout(3000)

            # Take full screenshots
            page.screenshot(path='tmp/styled_04_preview_full.png')
            page.screenshot(path='tmp/styled_05_full_page.png', full_page=True)

            # Look for regenerate or export options
            print("\n[13] Checking for actions...")
            regenerate = page.locator('button:has-text("Regenerate")').first
            if regenerate.is_visible():
                print("   - Regenerate button found")

            # Look for the styled HTML content
            print("\n[14] Final state:")
            all_btns = page.locator('button:visible').all()
            print("   Visible buttons:")
            for btn in all_btns[:15]:
                try:
                    text = btn.text_content() or ""
                    text = text.encode('ascii', 'replace').decode().strip()[:50]
                    if text and len(text) > 1:
                        print(f"      - {text}")
                except:
                    pass

            print("\n" + "="*70)
            print("Screenshots saved to tmp/styled_*.png")
            print("="*70)

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/styled_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
