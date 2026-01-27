"""
Screenshot capture script for marketing presentation.
Captures key screens from the Holistic SEO Topical Map Generator.
"""
from playwright.sync_api import sync_playwright
import time
import os

SCREENSHOTS_DIR = r"D:\www\cost-of-retreival-reducer\tmp\presentation-screenshots"
BASE_URL = "http://localhost:3001"
EMAIL = "richard@kjenmarks.nl"
PASSWORD = os.getenv("TEST_PASSWORD", "pannekoek")

def capture_screenshot(page, name, full_page=True):
    """Capture and save a screenshot with the given name."""
    path = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=full_page)
    print(f"Captured: {name}.png")
    return path

def main():
    with sync_playwright() as p:
        # Launch browser with larger viewport for better screenshots
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=2  # High DPI for crisp screenshots
        )
        page = context.new_page()

        print("Starting screenshot capture...")

        # 1. Login page
        print("\n--- Capturing Login Page ---")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        capture_screenshot(page, "01_login_page", full_page=False)

        # 2. Login process
        print("\n--- Logging in ---")

        # Fill email
        page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL)
        time.sleep(0.5)

        # Fill password
        page.fill('input[type="password"]', PASSWORD)
        time.sleep(0.5)

        capture_screenshot(page, "01b_login_filled", full_page=False)

        # Click login button and wait for navigation
        print("Clicking Sign In button...")
        page.click('button:has-text("Sign In")')

        # Wait for URL change or new content
        print("Waiting for login to complete...")
        try:
            # Wait for URL to change from login page
            page.wait_for_url(lambda url: "login" not in url.lower() and "signin" not in url.lower(), timeout=10000)
        except:
            print("URL didn't change, checking for new content...")

        page.wait_for_load_state('networkidle')
        time.sleep(3)

        # Debug: print current URL
        print(f"Current URL after login: {page.url}")

        # 3. Capture whatever screen we're on
        print("\n--- Capturing Post-Login Screen ---")
        capture_screenshot(page, "02_after_login", full_page=False)

        # Check page content
        page_content = page.content()
        print(f"Page title contains: {page.title()}")

        # Look for project/map selection elements
        if "project" in page_content.lower() or "select" in page_content.lower():
            print("Found project selection page")
            capture_screenshot(page, "03_project_selection", full_page=False)

            # Try to click on a project
            project_buttons = page.locator('button, [role="button"], .cursor-pointer').all()
            print(f"Found {len(project_buttons)} clickable elements")

            # Look for specific project-related buttons
            for btn in project_buttons[:10]:
                try:
                    text = btn.text_content() or ""
                    if any(word in text.lower() for word in ["open", "select", "view", "edit", "project", "map"]):
                        print(f"Found button with text: {text[:50]}")
                except:
                    pass

        # Try clicking on elements that look like projects/maps
        try:
            # Look for cards or list items
            cards = page.locator('[class*="card"], [class*="Card"], [class*="item"], [class*="Item"]').all()
            print(f"Found {len(cards)} card-like elements")

            if len(cards) > 0:
                print("Clicking first card...")
                cards[0].click()
                page.wait_for_load_state('networkidle')
                time.sleep(2)
                capture_screenshot(page, "04_after_card_click", full_page=False)
        except Exception as e:
            print(f"Card click error: {e}")

        # 4. Explore navigation/tabs if present
        print("\n--- Looking for navigation ---")

        # Look for tab-like elements in various ways
        nav_selectors = [
            'nav button',
            'nav a',
            '[role="tablist"] button',
            '[role="tablist"] [role="tab"]',
            '.tabs button',
            '.tab-list button',
            'button[class*="tab"]',
            '[class*="TabsTrigger"]',
            '[class*="nav"] button',
        ]

        for selector in nav_selectors:
            tabs = page.locator(selector).all()
            if len(tabs) > 0:
                print(f"Found {len(tabs)} elements with selector: {selector}")
                for i, tab in enumerate(tabs[:3]):
                    try:
                        text = tab.text_content() or f"tab_{i}"
                        print(f"  Tab {i}: {text[:30]}")
                    except:
                        pass
                break

        # 5. Full page capture
        print("\n--- Capturing full page ---")
        capture_screenshot(page, "05_full_page", full_page=True)

        # 6. Try to get page HTML structure for debugging
        print("\n--- Page structure ---")
        # Get main visible text
        body_text = page.locator('body').text_content() or ""
        print(f"Visible text preview: {body_text[:500]}...")

        # Clean up
        browser.close()
        print("\nScreenshot capture complete!")
        print(f"Screenshots saved to: {SCREENSHOTS_DIR}")

if __name__ == "__main__":
    main()
