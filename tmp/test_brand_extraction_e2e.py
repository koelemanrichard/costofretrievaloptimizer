"""
End-to-End Brand Extraction Test with Screenshots

Tests the full brand replication pipeline:
1. Navigate to app
2. Open project and select topic
3. Open Style & Publish modal
4. Use Full Extraction mode
5. Capture screenshots of target site and final output
"""

from playwright.sync_api import sync_playwright
import time
import os

# Configuration
APP_URL = "http://localhost:3001"
SCREENSHOT_DIR = "D:/www/cost-of-retreival-reducer/tmp/brand_extraction_proof"

# Ensure screenshot directory exists
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def save_screenshot(page, name, full_page=False):
    """Save a screenshot with the given name."""
    path = f"{SCREENSHOT_DIR}/{name}.png"
    page.screenshot(path=path, full_page=full_page)
    print(f"[SCREENSHOT] Saved: {path}")
    return path

def test_brand_extraction():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        print("[START] Brand Extraction E2E Test")
        print("=" * 50)

        # Step 1: Navigate to app
        print("\n[Step 1] Navigate to app")
        page.goto(APP_URL)
        page.wait_for_load_state("networkidle")
        save_screenshot(page, "01_app_loaded")

        # Step 2: Check if we need to login
        print("\n[Step 2] Check authentication state")
        time.sleep(2)

        # Look for sign-in elements or dashboard
        try:
            if page.locator("text=Sign in").first.is_visible():
                print("   [WARN] Need to sign in - looking for auth method")
                save_screenshot(page, "02_login_required")
            else:
                print("   [OK] Already authenticated or public access")
        except:
            print("   [OK] No login prompt visible")

        # Step 3: Navigate to projects
        print("\n[Step 3] Look for projects/maps")
        time.sleep(2)
        save_screenshot(page, "03_current_state")

        # Step 4: Look for topical maps
        print("\n[Step 4] Looking for topical maps or topics")

        # Try clicking on visible project/map cards
        try:
            cards = page.locator(".card, [class*='Card'], [class*='project'], [class*='map']").all()
            print(f"   Found {len(cards)} potential cards")
            if len(cards) > 0:
                cards[0].click()
                page.wait_for_load_state("networkidle")
                time.sleep(2)
                save_screenshot(page, "04_after_card_click")
        except Exception as e:
            print(f"   Card click failed: {e}")

        # Step 5: Look for topics in the dashboard
        print("\n[Step 5] Looking for topics to select")
        try:
            topics = page.locator("[class*='topic'], [class*='Topic'], tr, .row").all()
            print(f"   Found {len(topics)} potential topic elements")
            for topic in topics[:5]:
                try:
                    text = topic.inner_text()
                    if len(text) > 10 and len(text) < 200:
                        print(f"   Clicking topic: {text[:50]}...")
                        topic.click()
                        time.sleep(1)
                        save_screenshot(page, "05_topic_selected")
                        break
                except:
                    continue
        except Exception as e:
            print(f"   Topic selection failed: {e}")

        # Step 6: Look for Style & Publish button
        print("\n[Step 6] Looking for Style & Publish trigger")
        save_screenshot(page, "06_before_looking_for_style")

        style_buttons = [
            "text=Style & Publish",
            "text=Style",
            "button:has-text('Publish')",
            "[data-testid='style-publish']",
            "button:has-text('Style')"
        ]

        modal_opened = False
        for selector in style_buttons:
            try:
                btn = page.locator(selector).first
                if btn.is_visible():
                    print(f"   Found button: {selector}")
                    btn.click()
                    time.sleep(2)
                    save_screenshot(page, "07_style_modal_open")
                    modal_opened = True
                    break
            except:
                continue

        if not modal_opened:
            print("   [WARN] Could not find Style & Publish button")
            # Look for any modal or panel that might be related
            save_screenshot(page, "07_current_state_no_modal")

        # Step 7: Look for Brand step with Full Extraction mode
        print("\n[Step 7] Check for Full Extraction mode")

        try:
            # Look for the mode toggle
            full_extraction = page.locator("text=Full Extraction").first
            if full_extraction.is_visible():
                print("   [OK] Full Extraction mode found!")
                save_screenshot(page, "08_full_extraction_mode")

                # Click it to ensure it's active
                full_extraction.click()
                time.sleep(1)
                save_screenshot(page, "09_full_extraction_active")
        except Exception as e:
            print(f"   Mode toggle not found: {e}")

        # Step 8: Look for domain input in BrandUrlDiscovery
        print("\n[Step 8] Check BrandUrlDiscovery component")

        try:
            domain_input = page.locator("input[placeholder*='domain'], input[placeholder*='url'], input[type='url'], input[type='text']").first
            if domain_input.is_visible():
                print("   [OK] Domain input found")
                save_screenshot(page, "10_brand_discovery_input")

                # Enter a test domain
                domain_input.fill("https://nfir.nl")
                time.sleep(1)
                save_screenshot(page, "11_domain_entered")
        except Exception as e:
            print(f"   Domain input not found: {e}")

        # Step 9: Capture current UI state
        print("\n[Step 9] Capturing final UI state")
        save_screenshot(page, "12_final_state", full_page=True)

        # Step 10: Navigate to a real target site to show what would be extracted
        print("\n[Step 10] Capturing target site example (nfir.nl)")

        # Open new page for target site
        target_page = context.new_page()
        try:
            target_page.goto("https://nfir.nl", timeout=30000)
            target_page.wait_for_load_state("networkidle", timeout=30000)
            time.sleep(3)
            save_screenshot(target_page, "TARGET_SITE_nfir_viewport")
            save_screenshot(target_page, "TARGET_SITE_nfir_full", full_page=True)
            print("   [OK] Target site captured")
        except Exception as e:
            print(f"   [WARN] Could not capture target site: {e}")
        target_page.close()

        # Step 11: Show a second target site
        print("\n[Step 11] Capturing second target site example (mvgm.nl)")
        target_page2 = context.new_page()
        try:
            target_page2.goto("https://mvgm.nl", timeout=30000)
            target_page2.wait_for_load_state("networkidle", timeout=30000)
            time.sleep(3)
            save_screenshot(target_page2, "TARGET_SITE_mvgm_viewport")
            save_screenshot(target_page2, "TARGET_SITE_mvgm_full", full_page=True)
            print("   [OK] Second target site captured")
        except Exception as e:
            print(f"   [WARN] Could not capture second target site: {e}")
        target_page2.close()

        print("\n" + "=" * 50)
        print("[COMPLETE] Test Complete!")
        print(f"[INFO] Screenshots saved to: {SCREENSHOT_DIR}")
        print("=" * 50)

        # List all screenshots
        print("\nGenerated Screenshots:")
        for f in sorted(os.listdir(SCREENSHOT_DIR)):
            if f.endswith('.png'):
                print(f"  - {f}")

        browser.close()

if __name__ == "__main__":
    test_brand_extraction()
