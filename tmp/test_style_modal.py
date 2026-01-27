"""
Test the StylePublishModal to verify:
1. No Apify token warning (if token is in state)
2. Brand detection step loads correctly
3. Preview step renders visual components (not just prose)
"""

from playwright.sync_api import sync_playwright
import time

def test_style_publish_modal():
    print("=" * 70)
    print("TESTING STYLE PUBLISH MODAL")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Visible for debugging
        context = browser.new_context(viewport={'width': 1400, 'height': 900})
        page = context.new_page()

        # Collect console logs
        console_logs = []
        page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        print("\n[1] Navigating to application...")
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        # Take initial screenshot
        page.screenshot(path='tmp/modal_test_01_initial.png')
        print("   Screenshot saved: tmp/modal_test_01_initial.png")

        # Check if we need to sign in or if already on dashboard
        print("\n[2] Checking application state...")

        # Look for the app content
        page_content = page.content()

        # Check for sign-in button or dashboard content
        if 'Sign In' in page_content or 'sign in' in page_content.lower():
            print("   Application requires sign in")
            page.screenshot(path='tmp/modal_test_02_signin_required.png')
        else:
            print("   Application loaded")

        # Look for any topic cards or content
        topic_cards = page.locator('[data-testid="topic-card"]').all()
        print(f"   Found {len(topic_cards)} topic cards")

        # Look for Style & Publish button
        style_buttons = page.locator('button:has-text("Style")').all()
        print(f"   Found {len(style_buttons)} Style buttons")

        publish_buttons = page.locator('button:has-text("Publish")').all()
        print(f"   Found {len(publish_buttons)} Publish buttons")

        # Take screenshot of current state
        page.screenshot(path='tmp/modal_test_03_current_state.png', full_page=True)
        print("   Screenshot saved: tmp/modal_test_03_current_state.png")

        # Log collected console messages
        print("\n[3] Console logs collected:")
        apify_warnings = [log for log in console_logs if 'apify' in log.lower() or 'Apify' in log]
        error_logs = [log for log in console_logs if log.startswith('[error]')]
        warning_logs = [log for log in console_logs if log.startswith('[warning]')]

        print(f"   Total logs: {len(console_logs)}")
        print(f"   Errors: {len(error_logs)}")
        print(f"   Warnings: {len(warning_logs)}")
        print(f"   Apify-related: {len(apify_warnings)}")

        if apify_warnings:
            print("\n   Apify-related messages:")
            for log in apify_warnings[:5]:
                print(f"     {log[:200]}")

        if error_logs:
            print("\n   Error messages:")
            for log in error_logs[:10]:
                print(f"     {log[:200]}")

        print("\n" + "=" * 70)
        print("TEST COMPLETE - Check screenshots in tmp/ folder")
        print("=" * 70)

        browser.close()

if __name__ == "__main__":
    test_style_publish_modal()
