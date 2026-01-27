"""
E2E Test - Export styled HTML bundle for quality review
"""

from playwright.sync_api import sync_playwright
import os

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("EXPORT STYLED HTML FOR QUALITY REVIEW")
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
            page.wait_for_timeout(3000)
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
                page.wait_for_timeout(5000)
            print("   On Preview step")

            page.screenshot(path='tmp/export_01_preview.png')

            # Extract HTML from the preview iframe using JavaScript
            print("\n[9] Extracting HTML from preview iframe...")
            html_from_iframe = page.evaluate("""
                () => {
                    const iframe = document.querySelector('iframe');
                    if (iframe) {
                        // Try srcdoc first (most common for inline preview)
                        if (iframe.srcdoc) {
                            return { source: 'srcdoc', html: iframe.srcdoc };
                        }
                        // Try contentDocument
                        try {
                            if (iframe.contentDocument && iframe.contentDocument.documentElement) {
                                return { source: 'contentDocument', html: iframe.contentDocument.documentElement.outerHTML };
                            }
                        } catch(e) {}
                    }
                    return null;
                }
            """)

            if html_from_iframe:
                print(f"   Got HTML from iframe ({html_from_iframe['source']}): {len(html_from_iframe['html'])} chars")
                with open('tmp/preview_styled.html', 'w', encoding='utf-8') as f:
                    f.write(html_from_iframe['html'])
                print("   Saved to tmp/preview_styled.html")

                # Also save a snippet for inspection
                snippet = html_from_iframe['html'][:2000]
                print(f"\n   HTML snippet (first 2000 chars):")
                print("-" * 60)
                # Just show first few lines
                for line in snippet.split('\n')[:30]:
                    print(f"   {line[:100]}")
                print("   ...")
                print("-" * 60)
            else:
                print("   No HTML found in iframe")

            # Take final screenshots
            page.screenshot(path='tmp/export_02_final.png')

            print("\n" + "="*70)
            print("Export complete - check tmp/preview_styled.html")
            print("="*70)

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/export_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
