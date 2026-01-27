"""
Full Application Test - Captures everything:
1. App state after load
2. Console errors (especially 406)
3. Network requests
4. Screenshots at each step
"""

from playwright.sync_api import sync_playwright
import time
import json

def main():
    print("=" * 70)
    print("FULL APPLICATION TEST WITH ERROR CAPTURE")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Visible for debugging
        context = browser.new_context(viewport={'width': 1400, 'height': 900})
        page = context.new_page()

        # Collect ALL console messages
        console_logs = []
        def log_console(msg):
            console_logs.append({
                'type': msg.type,
                'text': msg.text[:500],  # Truncate long messages
            })
        page.on('console', log_console)

        # Collect ALL network errors (4xx, 5xx)
        network_errors = []
        def log_response(response):
            if response.status >= 400:
                network_errors.append({
                    'url': response.url[:200],
                    'status': response.status,
                    'statusText': response.status_text
                })
        page.on('response', log_response)

        # ============================================================
        # STEP 1: Navigate to app
        # ============================================================
        print("\n[STEP 1] Navigating to localhost:3000...")
        page.goto('http://localhost:3000', timeout=60000)
        page.wait_for_load_state('networkidle')
        time.sleep(3)

        page.screenshot(path='tmp/app_test/01_initial.png')
        print("   Screenshot: tmp/app_test/01_initial.png")

        # Check if we need to sign in
        if 'Sign In' in page.content():
            print("   [!] App requires sign-in. Cannot proceed with automated test.")
            print("   Please sign in manually and run again.")

            # Still save the error summary
            save_error_summary(console_logs, network_errors)
            browser.close()
            return

        # ============================================================
        # STEP 2: Wait for dashboard to load
        # ============================================================
        print("\n[STEP 2] Dashboard loaded, waiting for data...")
        time.sleep(5)

        page.screenshot(path='tmp/app_test/02_dashboard.png')
        print("   Screenshot: tmp/app_test/02_dashboard.png")

        # ============================================================
        # STEP 3: Find and click Style & Publish button
        # ============================================================
        print("\n[STEP 3] Looking for Style & Publish button...")

        # Try different selectors
        style_btn = page.locator('button:has-text("Style")').first
        if style_btn.is_visible():
            print("   Found Style button, clicking...")
            style_btn.click()
            time.sleep(3)

            page.screenshot(path='tmp/app_test/03_modal_opened.png')
            print("   Screenshot: tmp/app_test/03_modal_opened.png")
        else:
            print("   [X] Style button not found")
            page.screenshot(path='tmp/app_test/03_no_button.png')

        # ============================================================
        # STEP 4: Capture final state
        # ============================================================
        print("\n[STEP 4] Capturing final state...")
        time.sleep(2)
        page.screenshot(path='tmp/app_test/04_final.png', full_page=True)
        print("   Screenshot: tmp/app_test/04_final.png")

        # ============================================================
        # ERROR SUMMARY
        # ============================================================
        save_error_summary(console_logs, network_errors)

        browser.close()

def save_error_summary(console_logs, network_errors):
    import os
    os.makedirs('tmp/app_test', exist_ok=True)

    print("\n" + "=" * 70)
    print("ERROR SUMMARY")
    print("=" * 70)

    # Filter 406 errors
    errors_406 = [e for e in network_errors if e['status'] == 406]
    design_table_406 = [e for e in errors_406 if any(t in e['url'] for t in [
        'brand_design', 'design_profile', 'project_design', 'topical_map_design'
    ])]

    print(f"\nTotal network errors: {len(network_errors)}")
    print(f"406 errors: {len(errors_406)}")
    print(f"Design table 406 errors: {len(design_table_406)}")

    if design_table_406:
        print("\n[X] DESIGN TABLE 406 ERRORS FOUND:")
        for e in design_table_406:
            table = e['url'].split('/')[-1].split('?')[0]
            print(f"   - {table}: {e['status']} {e['statusText']}")
    else:
        print("\n[OK] No design table 406 errors!")

    # Console errors
    console_errors = [l for l in console_logs if l['type'] == 'error']
    console_warnings = [l for l in console_logs if l['type'] == 'warning']

    print(f"\nConsole errors: {len(console_errors)}")
    print(f"Console warnings: {len(console_warnings)}")

    # Check for Apify warning
    apify_warns = [l for l in console_logs if 'apify' in l['text'].lower()]
    if apify_warns:
        print(f"\n[!]  APIFY WARNINGS FOUND: {len(apify_warns)}")
        for w in apify_warns[:3]:
            print(f"   - {w['text'][:100]}")
    else:
        print("\n[OK] No Apify token warnings!")

    # Save detailed report
    with open('tmp/app_test/error_report.json', 'w') as f:
        json.dump({
            'network_errors': network_errors,
            'console_logs': console_logs[-100:],  # Last 100
            'summary': {
                'total_network_errors': len(network_errors),
                '406_errors': len(errors_406),
                'design_table_406': len(design_table_406),
                'console_errors': len(console_errors),
                'apify_warnings': len(apify_warns)
            }
        }, f, indent=2)
    print(f"\nDetailed report saved to: tmp/app_test/error_report.json")

    print("\n" + "=" * 70)

if __name__ == "__main__":
    import os
    os.makedirs('tmp/app_test', exist_ok=True)
    main()
