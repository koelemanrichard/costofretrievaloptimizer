"""
Capture screenshots for help documentation.
This script navigates through the app and takes screenshots of all key screens.
"""

from playwright.sync_api import sync_playwright
import os
import time

# Configuration
BASE_URL = "http://localhost:3002"
EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
SCREENSHOT_DIR = "docs/help-screenshots"

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def take_screenshot(page, name, description=""):
    """Take a screenshot and save with metadata."""
    filepath = f"{SCREENSHOT_DIR}/{name}.png"
    page.screenshot(path=filepath, full_page=False)
    print(f"[OK] Captured: {name} - {description}")
    return filepath

def wait_and_click(page, selector, timeout=5000):
    """Wait for element and click it."""
    try:
        page.wait_for_selector(selector, timeout=timeout)
        page.click(selector)
        return True
    except:
        return False

def main():
    ensure_dir(SCREENSHOT_DIR)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        print("\n=== Starting Help Screenshot Capture ===\n")

        # 1. Login Screen
        print("\n--- Authentication Screens ---")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        take_screenshot(page, "01-login-screen", "Login screen with email and password fields")

        # Check if we're on login screen
        if page.locator('input[type="email"]').is_visible():
            # Take screenshot of Sign Up tab
            if wait_and_click(page, 'button:has-text("Sign Up")'):
                time.sleep(1)
                take_screenshot(page, "02-signup-screen", "Sign up tab with registration fields")
                wait_and_click(page, 'button:has-text("Sign In")')
                time.sleep(0.5)

            # Login
            page.fill('input[type="email"]', EMAIL)
            page.fill('input[type="password"]', PASSWORD)
            take_screenshot(page, "03-login-filled", "Login form with credentials entered")
            page.click('button[type="submit"]:has-text("Sign In")')
            page.wait_for_load_state('networkidle')
            time.sleep(3)

        # 2. Project Selection Screen
        print("\n--- Project Management ---")
        take_screenshot(page, "04-project-selection", "Project selection screen after login")

        # Look for existing projects
        project_cards = page.locator('.project-card, [data-testid="project-card"], button:has-text("Open")')
        if project_cards.count() > 0:
            take_screenshot(page, "05-project-list", "List of existing projects")

        # 3. Try to open a project
        print("\n--- Dashboard Screens ---")
        open_buttons = page.locator('button:has-text("Open"), button:has-text("Load")')
        if open_buttons.count() > 0:
            open_buttons.first.click()
            page.wait_for_load_state('networkidle')
            time.sleep(3)
            take_screenshot(page, "06-project-dashboard", "Project dashboard main view")

            # Look for tab navigation
            tabs = page.locator('[role="tablist"] button, [data-testid="tab-navigation"] button')
            tab_count = tabs.count()
            print(f"  Found {tab_count} tabs")

            for i in range(min(tab_count, 5)):
                try:
                    tab = tabs.nth(i)
                    tab_name = tab.inner_text().strip()[:20]
                    tab.click()
                    time.sleep(1)
                    take_screenshot(page, f"07-tab-{i+1}-{tab_name.lower().replace(' ', '-')}", f"Tab: {tab_name}")
                except:
                    pass

            # 4. Settings Modal
            print("\n--- Settings Modal ---")
            settings_btn = page.locator('button:has-text("Settings"), button[aria-label*="Settings"]')
            if settings_btn.count() > 0:
                settings_btn.first.click()
                page.wait_for_selector('[role="dialog"]', timeout=5000)
                time.sleep(1)
                take_screenshot(page, "08-settings-modal", "Settings modal with API keys")

                # Check for tabs in settings
                settings_tabs = page.locator('[role="dialog"] [role="tab"], [role="dialog"] button').filter(has_text='')
                if settings_tabs.count() > 1:
                    for i in range(min(settings_tabs.count(), 4)):
                        try:
                            settings_tabs.nth(i).click()
                            time.sleep(0.5)
                            take_screenshot(page, f"09-settings-tab-{i+1}", f"Settings tab {i+1}")
                        except:
                            pass

                # Close settings
                page.keyboard.press('Escape')
                time.sleep(0.5)

            # 5. Help Modal
            print("\n--- Help Modal ---")
            help_btn = page.locator('button:has-text("Help"), button[aria-label*="Help"]')
            if help_btn.count() > 0:
                help_btn.first.click()
                page.wait_for_selector('[role="dialog"]', timeout=5000)
                time.sleep(1)
                take_screenshot(page, "10-help-modal", "Help modal with documentation")
                page.keyboard.press('Escape')
                time.sleep(0.5)

            # 6. Topic Management
            print("\n--- Topic Management ---")
            topic_items = page.locator('[data-testid="topic-item"], .topic-row, tr[role="row"]')
            if topic_items.count() > 0:
                take_screenshot(page, "11-topic-list", "List of topics in the map")

                # Click on a topic
                topic_items.first.click()
                time.sleep(1)
                take_screenshot(page, "12-topic-selected", "Topic selected with detail panel")

                # Look for Generate Brief button
                brief_btn = page.locator('button:has-text("Generate Brief"), button:has-text("Content Brief")')
                if brief_btn.count() > 0:
                    brief_btn.first.click()
                    page.wait_for_selector('[role="dialog"]', timeout=5000)
                    time.sleep(1)
                    take_screenshot(page, "13-brief-modal", "Content brief generation modal")
                    page.keyboard.press('Escape')
                    time.sleep(0.5)

            # 7. Look for other modals/buttons
            print("\n--- Other Features ---")

            # Add Topic
            add_topic_btn = page.locator('button:has-text("Add Topic"), button:has-text("New Topic")')
            if add_topic_btn.count() > 0:
                add_topic_btn.first.click()
                time.sleep(1)
                if page.locator('[role="dialog"]').is_visible():
                    take_screenshot(page, "14-add-topic-modal", "Add new topic modal")
                    page.keyboard.press('Escape')
                    time.sleep(0.5)

            # Export
            export_btn = page.locator('button:has-text("Export")')
            if export_btn.count() > 0:
                export_btn.first.click()
                time.sleep(1)
                if page.locator('[role="dialog"]').is_visible():
                    take_screenshot(page, "15-export-modal", "Export options modal")
                    page.keyboard.press('Escape')
                    time.sleep(0.5)

            # Analysis Tools
            analysis_btn = page.locator('button:has-text("Analysis"), button:has-text("Audit")')
            if analysis_btn.count() > 0:
                analysis_btn.first.click()
                time.sleep(1)
                if page.locator('[role="dialog"]').is_visible():
                    take_screenshot(page, "16-analysis-modal", "Analysis tools modal")
                    page.keyboard.press('Escape')
                    time.sleep(0.5)

        # 8. Site Analysis
        print("\n--- Site Analysis ---")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        site_analysis_btn = page.locator('button:has-text("Site Analysis"), button:has-text("Open Site Analysis")')
        if site_analysis_btn.count() > 0:
            site_analysis_btn.first.click()
            page.wait_for_load_state('networkidle')
            time.sleep(2)
            take_screenshot(page, "17-site-analysis", "Site Analysis main screen")

        browser.close()

        print(f"\n=== Screenshots saved to {SCREENSHOT_DIR} ===")
        print(f"Total screenshots: {len(os.listdir(SCREENSHOT_DIR))}")

if __name__ == "__main__":
    main()
