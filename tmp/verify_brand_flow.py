"""
Quick verification test for Brand Extraction flow.
Focuses on verifying the Full Brand Extraction mode works without errors.
"""
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3001"
TEST_EMAIL = "richard@kjenmarks.nl"
TEST_PASSWORD = "Richard01!"

def main():
    errors_found = []

    def track_console(msg):
        if msg.type == "error":
            text = msg.text
            # Ignore common non-critical errors
            if "SES Removing" in text or "cdn.tailwindcss" in text:
                return
            errors_found.append(text)
            print(f"[CONSOLE ERROR] {text[:200]}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=50)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        page.on("console", track_console)

        try:
            # 1. Load app
            print("[1] Loading app...")
            page.goto(BASE_URL)
            page.wait_for_load_state("networkidle")
            time.sleep(2)

            # 2. Login if needed
            if page.locator('input[type="email"]').count() > 0:
                print("[2] Logging in...")
                page.fill('input[type="email"]', TEST_EMAIL)
                page.fill('input[type="password"]', TEST_PASSWORD)
                page.click('button[type="submit"]')
                page.wait_for_load_state("networkidle")
                time.sleep(3)
            else:
                print("[2] Already logged in")

            page.screenshot(path="tmp/verify_brand_01.png")

            # 3. Select NFIR project
            print("[3] Selecting project...")
            time.sleep(2)
            project_btn = page.locator('button:has-text("NFIR"), [class*="project"]:has-text("NFIR")').first
            if project_btn.count() > 0:
                project_btn.click()
                page.wait_for_load_state("networkidle")
                time.sleep(2)

            page.screenshot(path="tmp/verify_brand_02.png")

            # 4. Find a topic with draft
            print("[4] Looking for topic...")
            time.sleep(2)
            topic = page.locator('button:has-text("Incident Response"), [data-topic]:has-text("Incident")').first
            if topic.count() > 0:
                topic.click()
                time.sleep(2)

            page.screenshot(path="tmp/verify_brand_03.png")

            # 5. Open Style & Publish
            print("[5] Opening Style & Publish...")
            time.sleep(2)

            # Look for publish dropdown
            publish_trigger = page.locator('button:has-text("Publish"), [data-testid="publish-menu"]')
            if publish_trigger.count() > 0:
                publish_trigger.first.click()
                time.sleep(1)

            # Click Style & Publish option
            style_option = page.locator('button:has-text("Style & Publish"), [role="menuitem"]:has-text("Style")')
            if style_option.count() > 0:
                style_option.first.click()
                time.sleep(2)

            page.screenshot(path="tmp/verify_brand_04.png")

            # 6. Verify modal opened
            print("[6] Checking modal...")
            modal = page.locator('text="Brand Intelligence"')
            if modal.count() == 0:
                print("ERROR: Brand Intelligence modal not found!")
                page.screenshot(path="tmp/verify_brand_error_no_modal.png")
                browser.close()
                return

            print("   Modal opened successfully")

            # 7. Click Re-detect if available
            print("[7] Looking for Re-detect...")
            redetect = page.locator('button:has-text("Re-detect"), button:has-text("Re-analyze")')
            if redetect.count() > 0:
                print("   Clicking Re-detect...")
                redetect.first.click()
                time.sleep(1)
                page.screenshot(path="tmp/verify_brand_05_after_redetect.png")
            else:
                print("   No Re-detect button (no cached brand)")

            # 8. Check Full Extraction mode
            print("[8] Testing Full Extraction mode...")
            full_ext = page.locator('button:has-text("Full Extraction")')
            if full_ext.count() > 0:
                full_ext.first.click()
                time.sleep(1)

            page.screenshot(path="tmp/verify_brand_06_full_mode.png")

            # 9. Check for error messages in the Full Extraction section
            print("[9] Checking for errors in Full Extraction section...")
            error_indicators = [
                'text="Apify token is required"',
                'text="Cannot read properties"',
                'text="credentials not provided"',
                'text="Supabase credentials"',
                'text="not been initialized"'
            ]

            found_errors = []
            for indicator in error_indicators:
                if page.locator(indicator).count() > 0:
                    found_errors.append(indicator)

            if found_errors:
                print(f"   ERRORS FOUND: {found_errors}")
                page.screenshot(path="tmp/verify_brand_07_error.png")
            else:
                print("   No error messages found in UI")

            # 10. Try entering a URL
            print("[10] Testing URL input...")
            url_input = page.locator('input[placeholder*="domain"], input[placeholder*="example.com"]')
            if url_input.count() > 0:
                print("   URL input found, entering test domain...")
                url_input.fill("mvgm.com")
                time.sleep(0.5)
                page.screenshot(path="tmp/verify_brand_08_url_entered.png")

                # Try clicking Discover
                discover_btn = page.locator('button:has-text("Discover")')
                if discover_btn.count() > 0:
                    print("   Clicking Discover button...")
                    discover_btn.first.click()
                    time.sleep(3)  # Wait for API call
                    page.screenshot(path="tmp/verify_brand_09_after_discover.png")
            else:
                print("   URL input NOT found")
                page.screenshot(path="tmp/verify_brand_08_no_input.png")

            # Final check
            print("\n" + "="*60)
            print("VERIFICATION RESULTS")
            print("="*60)

            if errors_found:
                print(f"\nConsole errors: {len(errors_found)}")
                for err in errors_found[:10]:
                    print(f"  - {err[:150]}")
            else:
                print("\nNo console errors found")

            if found_errors:
                print(f"\nUI errors found: {found_errors}")
            else:
                print("\nNo UI error messages found")

            page.screenshot(path="tmp/verify_brand_final.png")
            print("\nScreenshots saved to tmp/verify_brand_*.png")

        except Exception as e:
            print(f"\nTest failed with exception: {e}")
            page.screenshot(path="tmp/verify_brand_exception.png")
            raise
        finally:
            time.sleep(2)
            browser.close()

if __name__ == "__main__":
    main()
