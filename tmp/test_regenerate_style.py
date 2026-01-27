"""
Test script to regenerate styled content with enhanced AI prompts.

This script:
1. Starts the dev server
2. Logs in
3. Navigates to Style & Publish
4. Triggers regeneration
5. Captures screenshot for quality comparison
"""

from playwright.sync_api import sync_playwright
import subprocess
import time
import sys
import os

# Test credentials
EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"

# URLs
BASE_URL = "http://localhost:3001"

def wait_for_server(url, timeout=60):
    """Wait for dev server to be ready."""
    import urllib.request
    import urllib.error

    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(url, timeout=5)
            return True
        except (urllib.error.URLError, ConnectionRefusedError):
            time.sleep(1)
    return False

def main():
    print("="*70)
    print("STYLE & PUBLISH QUALITY TEST WITH ENHANCED PROMPTS")
    print("="*70)

    # Check if server is already running
    print("\nChecking if dev server is running...")
    if not wait_for_server(BASE_URL, timeout=5):
        print("Dev server not running. Please start it with 'npm run dev' first.")
        print("Then run this script again.")
        sys.exit(1)

    print("Dev server is ready!")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Show browser for debugging
        context = browser.new_context(viewport={'width': 1400, 'height': 900})
        page = context.new_page()

        try:
            # Step 1: Navigate to app and login
            print("\n1. Navigating to app and logging in...")
            page.goto(BASE_URL)
            page.wait_for_load_state('networkidle')
            page.screenshot(path='tmp/test_01_initial.png')

            # Check if already logged in
            if page.locator('text=Projects').first.is_visible():
                print("   Already logged in!")
            else:
                # Fill login form
                page.fill('input[type="email"]', EMAIL)
                page.fill('input[type="password"]', PASSWORD)
                page.click('button:has-text("Sign")')
                page.wait_for_timeout(3000)
                page.screenshot(path='tmp/test_02_after_login.png')

            # Step 2: Find and open project
            print("\n2. Opening project...")
            page.wait_for_selector('text=Projects', timeout=10000)

            # Look for the project with MVGM map
            project_cards = page.locator('[class*="project"]').all()
            print(f"   Found {len(project_cards)} project elements")

            # Click on Open button if visible
            open_btn = page.locator('button:has-text("Open")').first
            if open_btn.is_visible():
                open_btn.click()
                page.wait_for_timeout(2000)

            page.screenshot(path='tmp/test_03_project_view.png')

            # Step 3: Load the topical map
            print("\n3. Loading topical map...")
            load_map_btn = page.locator('button:has-text("Load Map")').first
            if load_map_btn.is_visible():
                load_map_btn.click()
                page.wait_for_timeout(3000)

            page.screenshot(path='tmp/test_04_map_loaded.png')

            # Step 4: Find the article topic
            print("\n4. Finding article topic...")
            # Look for Totaal VvE Beheer article
            topic = page.locator('text=Totaal VvE Beheer').first
            if topic.is_visible():
                topic.click()
                page.wait_for_timeout(2000)
                page.screenshot(path='tmp/test_05_topic_selected.png')
            else:
                print("   Could not find 'Totaal VvE Beheer' topic")
                # List available topics for debugging
                topics = page.locator('[class*="topic"]').all()
                print(f"   Available topics: {len(topics)}")

            # Step 5: Open Style & Publish modal
            print("\n5. Opening Style & Publish modal...")
            style_btn = page.locator('button:has-text("Style")').first
            if not style_btn.is_visible():
                style_btn = page.locator('button:has-text("Publish")').first

            if style_btn.is_visible():
                style_btn.click()
                page.wait_for_timeout(2000)
                page.screenshot(path='tmp/test_06_style_modal.png')
            else:
                print("   Style button not found")

            # Step 6: Look for regenerate or analyze option
            print("\n6. Looking for regenerate/analyze options...")
            page.screenshot(path='tmp/test_07_current_state.png')

            # Wait for user to see the state
            print("\nScreenshots saved. Review them to understand current UI state.")
            print("Press Enter to close browser...")
            input()

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/test_error.png')
            raise
        finally:
            browser.close()

    print("\n" + "="*70)
    print("TEST COMPLETE - Review screenshots in tmp/ folder")
    print("="*70)

if __name__ == "__main__":
    main()
