"""
Debug test - check console logs when generating preview
"""

from playwright.sync_api import sync_playwright
import json

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("DEBUG TEST: Check brandDesignSystem state during preview generation")
    print("="*70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})
        page = context.new_page()

        # Capture console logs
        console_logs = []
        page.on('console', lambda msg: console_logs.append({
            'type': msg.type,
            'text': msg.text
        }))

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

            # Load map 2
            print("\n[3] Loading map with content...")
            page.wait_for_selector('button:has-text("Load Map")', timeout=10000)
            load_buttons = page.get_by_role("button", name="Load Map").all()
            if len(load_buttons) >= 2:
                load_buttons[1].click()
                page.wait_for_timeout(3000)
            print("   Done")

            # Select VvE Beheer article
            print("\n[4] Selecting VvE Beheer article...")
            page.wait_for_selector('text=Totaal VvE Beheer', timeout=10000)
            article_row = page.locator('tr:has-text("Totaal VvE Beheer Almere")').first
            if article_row.is_visible():
                article_row.click()
                page.wait_for_timeout(1000)
            print("   Done")

            # Open View Brief
            print("\n[5] Opening Content Brief...")
            view_brief = page.locator('button:has-text("View Brief")').first
            if view_brief.is_visible():
                view_brief.click()
                page.wait_for_timeout(2000)
            print("   Done")

            # Open Draft Workspace
            print("\n[6] Opening Article Draft Workspace...")
            view_draft = page.locator('button:has-text("View Draft")').first
            if view_draft.is_visible():
                view_draft.click()
                page.wait_for_timeout(3000)
            print("   Done")

            # Open Style & Publish
            print("\n[7] Opening Style & Publish...")
            publish_btn = page.locator('button:has-text("Publish")').first
            if publish_btn.is_visible():
                publish_btn.click()
                page.wait_for_timeout(500)
            page.click('text=Style & Publish')
            page.wait_for_timeout(5000)  # Wait for saved brand data to load
            print("   Done")

            # Navigate to Preview step
            print("\n[8] Navigating to Preview...")

            # Step 1 -> 2
            modal = page.locator('.fixed.inset-0.bg-black.bg-opacity-70.z-50.flex.justify-center.items-center').first
            next_btn = modal.locator('button:has-text("Next")').first
            if next_btn.is_visible():
                next_btn.click()
                page.wait_for_timeout(3000)

            # Step 2 -> 3
            next_btn = modal.locator('button:has-text("Next")').first
            if next_btn.is_visible():
                next_btn.click()
                page.wait_for_timeout(8000)  # Wait for preview generation
            print("   On Preview step")

            page.screenshot(path='tmp/debug_preview_01.png')

            # Force regenerate to see the logs
            print("\n[9] Forcing regenerate...")
            regenerate_btn = modal.locator('button:has-text("Regenerate")').first
            if regenerate_btn.is_visible():
                regenerate_btn.click()
                page.wait_for_timeout(8000)  # Wait for preview generation
                print("   Regenerated")
            else:
                print("   Regenerate button not found")

            page.screenshot(path='tmp/debug_preview_02.png')

            # Filter console logs for relevant messages
            print("\n" + "="*70)
            print("CONSOLE LOGS (filtered for brandDesignSystem)")
            print("="*70)

            for log in console_logs:
                text = log['text']
                # Expand filter to catch more relevant logs
                keywords = ['Style & Publish', 'BlueprintRenderer', 'brandDesignSystem', 'compiledCss', 'generatePreview', 'FALLBACK', 'CSS generation']
                if any(kw.lower() in text.lower() for kw in keywords):
                    # Truncate long logs
                    if len(text) > 300:
                        text = text[:300] + '...'
                    print(f"  [{log['type']}] {text}")

            print("\n" + "="*70)
            print("Debug complete - check tmp/debug_preview_01.png")
            print("="*70)

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/debug_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
