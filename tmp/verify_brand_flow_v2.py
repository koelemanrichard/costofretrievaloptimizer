"""
Improved verification test for Brand Extraction flow.
More robust navigation with better error handling.
"""
import time
from playwright.sync_api import sync_playwright, TimeoutError

BASE_URL = "http://localhost:3001"
TEST_EMAIL = "richard@kjenmarks.nl"
TEST_PASSWORD = "Richard01!"

def log(msg, level="INFO"):
    print(f"[{level}] {msg}")

def main():
    errors_found = []

    def track_console(msg):
        if msg.type == "error":
            text = msg.text
            if "SES Removing" in text or "cdn.tailwindcss" in text or "404" in text:
                return
            errors_found.append(text)
            log(f"Console: {text[:200]}", "ERROR")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=100)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        page.on("console", track_console)

        try:
            # 1. Load app
            log("Loading app...")
            page.goto(BASE_URL)
            page.wait_for_load_state("networkidle")
            time.sleep(3)

            # 2. Login if needed
            login_input = page.locator('input[type="email"], input[id="email"]')
            if login_input.count() > 0 and login_input.is_visible():
                log("Logging in...")
                login_input.fill(TEST_EMAIL)
                page.locator('input[type="password"]').fill(TEST_PASSWORD)
                page.locator('button[type="submit"]').click()
                page.wait_for_load_state("networkidle")
                time.sleep(4)
            else:
                log("Already logged in or login not visible")

            page.screenshot(path="tmp/v2_01_after_login.png")

            # 3. Wait for project list or map view
            log("Waiting for main view...")
            time.sleep(3)

            # Take a screenshot to see current state
            page.screenshot(path="tmp/v2_02_current_state.png")

            # Log what's visible
            log(f"Page title: {page.title()}")
            log(f"URL: {page.url}")

            # Look for project cards
            projects = page.locator('[class*="project"], [class*="Project"]').all()
            log(f"Found {len(projects)} project-like elements")

            # Look for any clickable items
            buttons = page.locator('button').all()
            log(f"Found {len(buttons)} buttons")
            for i, btn in enumerate(buttons[:10]):
                try:
                    text = btn.text_content()[:50] if btn.text_content() else "no text"
                    log(f"  Button {i}: {text}")
                except:
                    pass

            # Try clicking on NFIR project
            nfir = page.locator('text="NFIR"').first
            if nfir.count() > 0:
                log("Found NFIR, clicking...")
                nfir.click()
                time.sleep(3)
                page.screenshot(path="tmp/v2_03_after_nfir.png")

            # 4. Look for topics
            log("Looking for topics...")
            time.sleep(2)

            # See what's in the view now
            page.screenshot(path="tmp/v2_04_looking_for_topics.png")

            # Try to find something with "Incident" in it
            incident = page.locator('text=/Incident/i').first
            if incident.count() > 0:
                log("Found Incident topic, clicking...")
                incident.click()
                time.sleep(2)
                page.screenshot(path="tmp/v2_05_after_incident.png")

            # 5. Look for Style & Publish
            log("Looking for Style & Publish or Publish dropdown...")
            time.sleep(2)

            # Check for dropdown trigger
            dropdowns = page.locator('[class*="dropdown"], [class*="Dropdown"]').all()
            log(f"Found {len(dropdowns)} dropdown elements")

            # Look for Publish button
            publish = page.locator('button:has-text("Publish")').first
            if publish.count() > 0:
                log("Found Publish button, clicking...")
                publish.click()
                time.sleep(1)
                page.screenshot(path="tmp/v2_06_after_publish.png")

            # Look for Style & Publish in dropdown
            style_publish = page.locator('text="Style & Publish"').first
            if style_publish.count() > 0:
                log("Found Style & Publish option, clicking...")
                style_publish.click()
                time.sleep(2)
                page.screenshot(path="tmp/v2_07_style_modal.png")
            else:
                log("Style & Publish not found in dropdown", "WARN")
                # Maybe need to look elsewhere
                style_btn = page.locator('button:has-text("Style")').first
                if style_btn.count() > 0:
                    style_btn.click()
                    time.sleep(2)
                    page.screenshot(path="tmp/v2_07_style_btn.png")

            # 6. Check for Brand Intelligence
            log("Checking for Brand Intelligence...")
            brand_intel = page.locator('text="Brand Intelligence"')
            if brand_intel.count() > 0:
                log("Brand Intelligence found!")

                # Look for Re-detect button
                redetect = page.locator('button:has-text("Re-detect"), button:has-text("Re-analyze")')
                if redetect.count() > 0:
                    log("Re-detect found, clicking...")
                    redetect.first.click()
                    time.sleep(1)
                    page.screenshot(path="tmp/v2_08_after_redetect.png")

                # Look for Full Extraction tab
                full_ext = page.locator('button:has-text("Full Extraction")')
                if full_ext.count() > 0:
                    log("Clicking Full Extraction tab...")
                    full_ext.first.click()
                    time.sleep(1)
                    page.screenshot(path="tmp/v2_09_full_extraction.png")

                # Check for URL input
                url_input = page.locator('input[placeholder*="domain"], input[placeholder*="example"]')
                if url_input.count() > 0:
                    log("URL input found!")
                    url_input.fill("mvgm.com")
                    time.sleep(0.5)

                    # Click Discover
                    discover = page.locator('button:has-text("Discover")')
                    if discover.count() > 0:
                        log("Clicking Discover URLs...")
                        discover.first.click()
                        time.sleep(5)  # Wait for API call
                        page.screenshot(path="tmp/v2_10_after_discover.png")

                        # Check for errors
                        error_text = page.locator('text=/error|Error|failed|Failed/i')
                        if error_text.count() > 0:
                            log(f"Error found in UI: {error_text.first.text_content()[:100]}", "ERROR")
                else:
                    log("URL input NOT found", "WARN")
                    # Check what's visible instead
                    visible_text = page.locator('[class*="Brand"], [class*="brand"]').first
                    if visible_text.count() > 0:
                        log(f"Brand section content: {visible_text.text_content()[:200]}")
            else:
                log("Brand Intelligence NOT found", "ERROR")

            # Final screenshot
            page.screenshot(path="tmp/v2_final.png")

            # Summary
            log("\n" + "="*60)
            log("TEST SUMMARY")
            log("="*60)

            if errors_found:
                log(f"Console errors: {len(errors_found)}", "ERROR")
                for err in errors_found[:5]:
                    log(f"  {err[:150]}", "ERROR")
            else:
                log("No critical console errors")

            log("\nScreenshots saved to tmp/v2_*.png")

        except Exception as e:
            log(f"Test failed: {e}", "ERROR")
            page.screenshot(path="tmp/v2_exception.png")
            import traceback
            traceback.print_exc()
        finally:
            time.sleep(2)
            browser.close()

if __name__ == "__main__":
    main()
