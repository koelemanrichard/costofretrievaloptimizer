"""
Test - Simple export using Copy Bundle button
"""

from playwright.sync_api import sync_playwright

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("SIMPLE EXPORT - Use Copy Bundle Button")
    print("="*70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})
        page = context.new_page()

        # Capture clipboard
        clipboard_content = {'html': ''}

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

            # Load map 2
            print("\n[3] Loading map...")
            page.wait_for_selector('button:has-text("Load Map")', timeout=10000)
            load_buttons = page.get_by_role("button", name="Load Map").all()
            if len(load_buttons) >= 2:
                load_buttons[1].click()
                page.wait_for_timeout(3000)

            # Select VvE Beheer article
            print("\n[4] Selecting article...")
            page.wait_for_selector('text=Totaal VvE Beheer', timeout=10000)
            article_row = page.locator('tr:has-text("Totaal VvE Beheer Almere")').first
            article_row.click()
            page.wait_for_timeout(1000)

            # Open View Brief
            view_brief = page.locator('button:has-text("View Brief")').first
            view_brief.click()
            page.wait_for_timeout(2000)

            # Open Draft Workspace
            view_draft = page.locator('button:has-text("View Draft")').first
            view_draft.click()
            page.wait_for_timeout(3000)

            # Open Style & Publish
            print("\n[5] Opening Style & Publish...")
            publish_btn = page.locator('button:has-text("Publish")').first
            publish_btn.click()
            page.wait_for_timeout(500)
            page.click('text=Style & Publish')
            page.wait_for_timeout(5000)

            # Navigate to Preview step
            print("\n[6] Navigating to Preview...")
            modal = page.locator('.fixed.inset-0.bg-black.bg-opacity-70.z-50.flex.justify-center.items-center').first
            next_btn = modal.locator('button:has-text("Next")').first
            next_btn.click()
            page.wait_for_timeout(3000)

            next_btn = modal.locator('button:has-text("Next")').first
            next_btn.click()
            page.wait_for_timeout(5000)

            # Force regenerate
            print("\n[7] Regenerating preview...")
            regenerate_btn = modal.locator('button:has-text("Regenerate")').first
            if regenerate_btn.is_visible():
                regenerate_btn.click()
                page.wait_for_timeout(8000)

            page.screenshot(path='tmp/export_simple_01.png')

            # Get the preview HTML/CSS using JavaScript to intercept the preview state
            print("\n[8] Extracting preview HTML and CSS...")
            preview_data = page.evaluate("""
                () => {
                    // Try to get from iframe srcdoc
                    const iframe = document.querySelector('iframe');
                    if (iframe && iframe.srcdoc) {
                        return { source: 'iframe-srcdoc', html: iframe.srcdoc };
                    }

                    // Look for any large text content that looks like HTML
                    const textareas = document.querySelectorAll('textarea');
                    for (const ta of textareas) {
                        if (ta.value && ta.value.includes('<style>')) {
                            return { source: 'textarea', html: ta.value };
                        }
                    }

                    return null;
                }
            """)

            if preview_data:
                html = preview_data['html']
                print(f"   Got HTML from {preview_data['source']}: {len(html)} chars")

                # Save it
                with open('tmp/stylizer_new/simple_export_mvgm.html', 'w', encoding='utf-8') as f:
                    f.write(html)
                print("   Saved to tmp/stylizer_new/simple_export_mvgm.html")

                # Analyze
                print("\n" + "="*70)
                print("CSS ANALYSIS")
                print("="*70)

                if 'Brand Design System - Auto-Generated' in html:
                    print("   ✅ Using BRAND DESIGN SYSTEM")
                elif 'Generated from design personality tokens' in html:
                    print("   ❌ Using LEGACY PERSONALITY TOKENS")

                # Show first few lines of CSS
                print("\n   First lines of style block:")
                start = html.find('<style>')
                if start != -1:
                    end = html.find('</style>')
                    css = html[start:end+8]
                    for line in css.split('\n')[:20]:
                        print(f"      {line[:80]}")
            else:
                print("   No HTML found via JavaScript")

                # Debug: List all iframes
                iframe_info = page.evaluate("""
                    () => {
                        const iframes = document.querySelectorAll('iframe');
                        return Array.from(iframes).map(f => ({
                            id: f.id,
                            src: f.src?.substring(0, 100),
                            hasSrcdoc: !!f.srcdoc,
                            srcdocLength: f.srcdoc?.length || 0
                        }));
                    }
                """)
                print(f"   Iframes found: {iframe_info}")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/export_simple_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
