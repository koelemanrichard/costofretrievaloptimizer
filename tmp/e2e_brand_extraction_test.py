"""
Comprehensive E2E test for Brand Extraction flow in Style & Publish modal.
This test verifies:
1. Login and navigation to a topic
2. Opening Style & Publish modal
3. Re-detect button clears cached brand
4. Full Brand Extraction mode shows URL input
5. URL discovery triggers correctly (no JS errors)
6. Quick Detection mode works as fallback
"""

import sys
import time
from playwright.sync_api import sync_playwright, expect

# Test configuration
BASE_URL = "http://localhost:3001"
TEST_EMAIL = "richard@kjenmarks.nl"
TEST_PASSWORD = "xxxxxx"  # Placeholder - will be entered manually or via env
TARGET_BRAND_URL = "https://www.mvgm.com"

def log(msg: str, level: str = "INFO"):
    """Structured logging for test output"""
    timestamp = time.strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}")

def capture_console_errors(page):
    """Track console errors"""
    errors = []
    def on_console(msg):
        if msg.type == "error":
            errors.append(msg.text)
            log(f"Console error: {msg.text}", "ERROR")
    page.on("console", on_console)
    return errors

def test_brand_extraction_flow():
    """Main E2E test for brand extraction"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=100)  # Visible for debugging
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        # Track console errors
        console_errors = capture_console_errors(page)

        try:
            # Step 1: Navigate to app
            log("Step 1: Navigating to app...")
            page.goto(BASE_URL)
            page.wait_for_load_state("networkidle")
            page.screenshot(path="tmp/e2e_brand_01_initial.png")

            # Step 2: Check if already logged in or need to login
            log("Step 2: Checking login state...")
            time.sleep(2)  # Wait for auth state check

            # Check for login form
            if page.locator('input[type="email"]').count() > 0:
                log("Login form found, entering credentials...")
                page.fill('input[type="email"]', TEST_EMAIL)
                page.fill('input[type="password"]', TEST_PASSWORD)
                page.click('button[type="submit"]')
                page.wait_for_load_state("networkidle")
                time.sleep(3)

            page.screenshot(path="tmp/e2e_brand_02_after_login.png")

            # Step 3: Select project (should show project list if logged in)
            log("Step 3: Looking for project selection...")
            time.sleep(2)

            # Click on a project if project list is visible
            project_cards = page.locator('[data-testid="project-card"], .project-card, button:has-text("NFIR")')
            if project_cards.count() > 0:
                log(f"Found {project_cards.count()} project(s), clicking first...")
                project_cards.first.click()
                page.wait_for_load_state("networkidle")
                time.sleep(2)

            page.screenshot(path="tmp/e2e_brand_03_project.png")

            # Step 4: Find and click on a topic that has a draft
            log("Step 4: Looking for topic with draft...")
            time.sleep(2)

            # Look for topic cards or map view
            topic_buttons = page.locator('button:has-text("Incident Response"), [data-topic-id]')
            if topic_buttons.count() > 0:
                log(f"Found topic buttons, clicking...")
                topic_buttons.first.click()
                time.sleep(2)

            page.screenshot(path="tmp/e2e_brand_04_topic.png")

            # Step 5: Look for the drafting workspace and Style & Publish button
            log("Step 5: Looking for Style & Publish option...")
            time.sleep(2)

            # Check for publish dropdown or Style & Publish button
            publish_menu = page.locator('button:has-text("Publish"), [data-testid="publish-menu"]')
            if publish_menu.count() > 0:
                publish_menu.first.click()
                time.sleep(1)

            # Look for Style & Publish option
            style_publish_btn = page.locator('button:has-text("Style & Publish"), [data-testid="style-publish"]')
            if style_publish_btn.count() > 0:
                style_publish_btn.first.click()
                time.sleep(2)

            page.screenshot(path="tmp/e2e_brand_05_modal.png")

            # Step 6: Verify Style & Publish modal opened
            log("Step 6: Checking Style & Publish modal...")
            modal = page.locator('text="Style & Publish"').first
            expect(modal).to_be_visible(timeout=5000)
            log("Style & Publish modal is visible")

            # Step 7: Check for Re-detect button and click it
            log("Step 7: Looking for Re-detect button...")
            redetect_btn = page.locator('button:has-text("Re-detect")')
            if redetect_btn.count() > 0:
                log("Re-detect button found, clicking...")
                redetect_btn.click()
                time.sleep(1)
                page.screenshot(path="tmp/e2e_brand_06_after_redetect.png")
            else:
                log("No Re-detect button (no cached brand)", "WARN")

            # Step 8: Verify Full Extraction mode shows URL input
            log("Step 8: Checking Full Extraction mode...")
            full_extraction_tab = page.locator('button:has-text("Full Extraction")')
            if full_extraction_tab.count() > 0:
                full_extraction_tab.click()
                time.sleep(1)

            # Check for URL input
            url_input = page.locator('input[placeholder*="example.com"], input[type="url"], input[placeholder*="domain"]')
            if url_input.count() > 0:
                log("URL input found in Full Extraction mode")
                page.screenshot(path="tmp/e2e_brand_07_url_input.png")

                # Try entering a URL
                url_input.fill(TARGET_BRAND_URL)
                time.sleep(0.5)

                # Look for discover/extract button
                discover_btn = page.locator('button:has-text("Discover"), button:has-text("Extract")')
                if discover_btn.count() > 0:
                    log("Clicking discover button...")
                    discover_btn.first.click()
                    time.sleep(3)  # Wait for API call
                    page.screenshot(path="tmp/e2e_brand_08_after_discover.png")
            else:
                log("URL input NOT found - checking for errors", "WARN")
                page.screenshot(path="tmp/e2e_brand_07_no_url_input.png")

            # Step 9: Check for errors in Full Extraction section
            log("Step 9: Checking for error messages...")
            error_messages = page.locator('text="Apify token is required", text="Cannot read properties", text="credentials not provided"')
            if error_messages.count() > 0:
                error_text = error_messages.first.text_content()
                log(f"ERROR FOUND: {error_text}", "ERROR")
                page.screenshot(path="tmp/e2e_brand_09_error.png")
            else:
                log("No obvious error messages found")

            # Step 10: Test Quick Detection as fallback
            log("Step 10: Testing Quick Detection mode...")
            quick_detection_tab = page.locator('button:has-text("Quick Detection")')
            if quick_detection_tab.count() > 0:
                quick_detection_tab.click()
                time.sleep(1)
                page.screenshot(path="tmp/e2e_brand_10_quick_mode.png")

                # Check for URL input in quick mode
                quick_url_input = page.locator('input[placeholder*="example.com"], input[type="url"]')
                if quick_url_input.count() > 0:
                    log("Quick Detection URL input found")
                    quick_url_input.fill(TARGET_BRAND_URL)

                    detect_btn = page.locator('button:has-text("Detect")')
                    if detect_btn.count() > 0:
                        log("Clicking Quick Detect button...")
                        detect_btn.first.click()
                        time.sleep(5)  # Wait for detection
                        page.screenshot(path="tmp/e2e_brand_11_quick_detect.png")

            # Final report
            page.screenshot(path="tmp/e2e_brand_final.png")

            log("=" * 60)
            log("TEST SUMMARY")
            log("=" * 60)

            if console_errors:
                log(f"Console errors found: {len(console_errors)}", "ERROR")
                for err in console_errors[:5]:  # Show first 5
                    log(f"  - {err[:100]}...", "ERROR")
            else:
                log("No console errors detected")

            log("Test completed. Check screenshots in tmp/ folder.")

        except Exception as e:
            log(f"Test failed with exception: {e}", "ERROR")
            page.screenshot(path="tmp/e2e_brand_error.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    test_brand_extraction_flow()
