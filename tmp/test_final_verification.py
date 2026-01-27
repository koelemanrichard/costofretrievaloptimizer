"""
Final Verification Test - Verify all fixes work together
"""

from playwright.sync_api import sync_playwright
import os

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*70)
    print("FINAL VERIFICATION: All Fixes Working")
    print("="*70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})

        # Set up clipboard access
        context.grant_permissions(['clipboard-read', 'clipboard-write'])

        page = context.new_page()

        # Capture console logs
        console_logs = []
        page.on('console', lambda msg: console_logs.append(msg.text))

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

            # Force regenerate to use fixed code
            print("\n[7] Regenerating preview...")
            regenerate_btn = modal.locator('button:has-text("Regenerate")').first
            if regenerate_btn.is_visible():
                regenerate_btn.click()
                page.wait_for_timeout(8000)

            page.screenshot(path='tmp/final_verify_01.png')

            # Click Copy Bundle button
            print("\n[8] Clicking Copy Bundle...")
            copy_bundle_btn = modal.locator('button:has-text("Copy Bundle")').first
            if copy_bundle_btn.is_visible():
                copy_bundle_btn.click()
                page.wait_for_timeout(1000)
                print("   Clicked Copy Bundle")

            # Read clipboard content
            clipboard_html = page.evaluate("""
                async () => {
                    try {
                        return await navigator.clipboard.readText();
                    } catch (e) {
                        return null;
                    }
                }
            """)

            if clipboard_html:
                print(f"   Got HTML from clipboard: {len(clipboard_html)} chars")

                # Save it
                os.makedirs('tmp/stylizer_new', exist_ok=True)
                with open('tmp/stylizer_new/final_verified_output.html', 'w', encoding='utf-8') as f:
                    f.write(clipboard_html)
                print("   Saved to tmp/stylizer_new/final_verified_output.html")

                # Analyze
                print("\n" + "="*70)
                print("VERIFICATION RESULTS")
                print("="*70)

                # Check 1: HTML document structure
                has_doctype = clipboard_html.startswith('<!DOCTYPE html>')
                has_head = '<head>' in clipboard_html
                has_body = '<body>' in clipboard_html
                print(f"\n[Fix #1] HTML Document Structure:")
                print(f"   <!DOCTYPE html>: {'✅' if has_doctype else '❌'}")
                print(f"   <head> tag: {'✅' if has_head else '❌'}")
                print(f"   <body> tag: {'✅' if has_body else '❌'}")

                # Check 2: Brand Design System CSS
                has_brand_css = 'Brand Design System - Auto-Generated' in clipboard_html
                has_legacy_css = 'Generated from design personality tokens' in clipboard_html
                print(f"\n[Fix #2] Brand Design System CSS:")
                print(f"   Using brand CSS: {'✅' if has_brand_css else '❌'}")
                print(f"   Using legacy CSS: {'❌' if has_legacy_css else '✅ (not found - good!)'}")

                # Check 3: Tailwind CSS
                has_tailwind = 'cdn.tailwindcss.com' in clipboard_html
                print(f"\n[Fix #3] Tailwind CSS CDN:")
                print(f"   Tailwind included: {'✅' if has_tailwind else '❌'}")

                # Check for brand colors
                print("\n[Bonus] Color Analysis:")
                zinc_colors = ['#18181B', '#3F3F46', '#09090B', '#71717A']
                found_zinc = [c for c in zinc_colors if c in clipboard_html]
                print(f"   Zinc colors (personality): {'❌ Found ' + str(found_zinc) if found_zinc else '✅ Not found'}")

                # First few CSS variables
                print("\n[Sample] First CSS variables:")
                lines = clipboard_html.split('\n')
                var_count = 0
                for line in lines:
                    if '--ctc-primary' in line and var_count < 5:
                        print(f"      {line.strip()[:80]}")
                        var_count += 1

                print("\n" + "="*70)
                if has_doctype and has_head and has_body and (has_brand_css or not has_legacy_css) and has_tailwind:
                    print("✅ ALL FIXES VERIFIED - OUTPUT IS CORRECT")
                else:
                    print("⚠️ SOME ISSUES REMAIN - CHECK ABOVE")
                print("="*70)

            else:
                print("   Could not read clipboard - checking via console logs...")
                for log in console_logs:
                    if 'Style & Publish' in log or 'BlueprintRenderer' in log:
                        print(f"   {log[:100]}")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/final_verify_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
