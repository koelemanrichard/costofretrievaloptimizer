"""
Verify the application loads without 406 database errors after fixes.
Run this after signing in to the app.
"""

from playwright.sync_api import sync_playwright
import time
import json

def test_no_database_errors():
    print("=" * 70)
    print("VERIFYING NO 406 DATABASE ERRORS")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={'width': 1400, 'height': 900})
        page = context.new_page()

        # Collect console logs
        console_logs = []
        def handle_console(msg):
            console_logs.append({
                'type': msg.type,
                'text': msg.text,
                'location': msg.location
            })
        page.on('console', handle_console)

        # Collect network errors
        network_errors = []
        def handle_response(response):
            if response.status >= 400:
                network_errors.append({
                    'url': response.url,
                    'status': response.status,
                    'statusText': response.status_text
                })
        page.on('response', handle_response)

        print("\n[1] Navigating to application...")
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        time.sleep(3)

        # Take screenshot
        page.screenshot(path='tmp/verify_01_initial.png')
        print("   Screenshot: tmp/verify_01_initial.png")

        # Check if signed in
        page_content = page.content()
        if 'Sign In' in page_content:
            print("\n⚠️  Not signed in - please sign in manually and re-run")
            browser.close()
            return

        print("\n[2] Looking for Style & Publish button...")
        time.sleep(2)

        # Wait for any modal or dashboard content
        page.screenshot(path='tmp/verify_02_dashboard.png')
        print("   Screenshot: tmp/verify_02_dashboard.png")

        # Analyze errors
        print("\n[3] Analyzing collected data...")

        # Check for 406 errors specifically
        errors_406 = [e for e in network_errors if e['status'] == 406]
        design_table_errors = [e for e in errors_406 if any(
            table in e['url'] for table in [
                'brand_design_systems', 'brand_design_dna',
                'design_profiles', 'project_design_defaults',
                'topical_map_design_rules', 'design_preferences'
            ]
        )]

        print(f"\n   Total network errors: {len(network_errors)}")
        print(f"   406 errors: {len(errors_406)}")
        print(f"   Design table 406 errors: {len(design_table_errors)}")

        if design_table_errors:
            print("\n   ❌ Design table errors found:")
            for e in design_table_errors[:5]:
                url_short = e['url'].split('?')[0].split('/')[-1]
                print(f"      - {e['status']} {url_short}")
        else:
            print("\n   ✅ No design table 406 errors!")

        # Check for Apify token warnings in console
        apify_warnings = [l for l in console_logs if 'apify' in l['text'].lower() and 'token' in l['text'].lower()]
        if apify_warnings:
            print(f"\n   ⚠️  Apify token warnings: {len(apify_warnings)}")
            for w in apify_warnings[:3]:
                print(f"      - {w['text'][:100]}")
        else:
            print("\n   ✅ No Apify token warnings!")

        # Summary
        print("\n" + "=" * 70)
        if not design_table_errors and not apify_warnings:
            print("✅ VERIFICATION PASSED - No errors found")
        else:
            print("⚠️  Some issues remain - check above")
        print("=" * 70)

        browser.close()

if __name__ == "__main__":
    test_no_database_errors()
