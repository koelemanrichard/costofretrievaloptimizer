"""
Test - Export styled HTML after regeneration to verify brand colors
"""

from playwright.sync_api import sync_playwright
import os

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("EXPORT STYLED HTML AFTER FIX")
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
            page.wait_for_timeout(5000)
            print("   Done")

            # Navigate to Preview step
            print("\n[8] Navigating to Preview...")
            modal = page.locator('.fixed.inset-0.bg-black.bg-opacity-70.z-50.flex.justify-center.items-center').first
            next_btn = modal.locator('button:has-text("Next")').first
            if next_btn.is_visible():
                next_btn.click()
                page.wait_for_timeout(3000)

            next_btn = modal.locator('button:has-text("Next")').first
            if next_btn.is_visible():
                next_btn.click()
                page.wait_for_timeout(5000)
            print("   On Preview step")

            # Force regenerate to use the fixed code
            print("\n[9] Forcing regenerate to use fixed code...")
            regenerate_btn = modal.locator('button:has-text("Regenerate")').first
            if regenerate_btn.is_visible():
                regenerate_btn.click()
                page.wait_for_timeout(8000)
                print("   Regenerated")

            page.screenshot(path='tmp/export_fixed_01.png')

            # Extract HTML from preview iframe
            print("\n[10] Extracting HTML from preview iframe...")
            html_from_iframe = page.evaluate("""
                () => {
                    const iframe = document.querySelector('iframe');
                    if (iframe) {
                        if (iframe.srcdoc) {
                            return { source: 'srcdoc', html: iframe.srcdoc };
                        }
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

                # Save the full HTML
                output_path = 'tmp/stylizer_new/fixed_output_mvgm.html'
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(html_from_iframe['html'])
                print(f"   Saved to {output_path}")

                # Check the CSS for brand colors
                html = html_from_iframe['html']

                print("\n" + "="*70)
                print("CSS ANALYSIS")
                print("="*70)

                # Check which CSS path was used
                if 'Brand Design System - Auto-Generated' in html:
                    print("   ✅ Using BRAND DESIGN SYSTEM (correct!)")
                elif 'Generated from design personality tokens' in html:
                    print("   ❌ Using LEGACY PERSONALITY TOKENS (wrong!)")
                else:
                    print("   ⚠️ Unknown CSS source")

                # Check for zinc colors (bad)
                zinc_colors = ['#18181B', '#3F3F46', '#09090B', '#71717A']
                found_zinc = [c for c in zinc_colors if c in html]
                if found_zinc:
                    print(f"   ❌ Found zinc colors (personality): {found_zinc}")
                else:
                    print("   ✅ No zinc colors found")

                # Check for MVGM brand colors (good)
                mvgm_colors = ['#012d55', '#012D55', '#004B8D', '#004b8d']  # MVGM blue
                found_mvgm = [c for c in mvgm_colors if c in html.upper()]
                if found_mvgm:
                    print(f"   ✅ Found MVGM brand colors: {found_mvgm}")
                else:
                    print("   ⚠️ MVGM brand colors not found (may be in different format)")

                # Show first CSS variables
                print("\n   First CSS variables in output:")
                lines = html.split('\n')
                in_style = False
                var_count = 0
                for line in lines:
                    if '<style>' in line:
                        in_style = True
                    if '</style>' in line:
                        break
                    if in_style and '--ctc-primary' in line:
                        print(f"      {line.strip()}")
                        var_count += 1
                        if var_count >= 5:
                            break

            print("\n" + "="*70)
            print("Export complete - check tmp/stylizer_new/fixed_output_mvgm.html")
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
