"""Test that the app loads correctly at localhost:3001"""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to the app
    page.goto('http://localhost:3001')

    # Wait for the app to fully load
    page.wait_for_load_state('networkidle')

    # Take a screenshot
    page.screenshot(path='D:/www/cost-of-retreival-reducer/tmp/app_screenshot.png', full_page=True)

    # Check for any console errors
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

    # Get the page title to verify it loaded
    title = page.title()
    print(f"Page title: {title}")

    # Check if there are any visible error messages
    error_elements = page.locator('text=/error|Error|ERROR/i').all()
    if error_elements:
        print(f"Found {len(error_elements)} potential error elements on page")

    # Check for main app container
    content = page.content()
    if 'id="root"' in content or 'id="app"' in content:
        print("App root container found")

    print(f"Screenshot saved to tmp/app_screenshot.png")

    browser.close()
