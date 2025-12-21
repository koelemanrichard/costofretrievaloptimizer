"""
Comprehensive screenshot capture for help documentation.
Navigates through all app features and captures screenshots.
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
    print(f"[OK] {name}: {description}")
    return filepath

def safe_click(page, selector, timeout=5000):
    """Safely click an element if it exists."""
    try:
        elem = page.locator(selector).first
        if elem.is_visible(timeout=timeout):
            elem.click()
            return True
    except:
        pass
    return False

def close_modal(page):
    """Close any open modal."""
    try:
        # Try Escape key first
        page.keyboard.press('Escape')
        time.sleep(0.5)
        # If modal still visible, try close button
        close_btn = page.locator('button[aria-label*="Close"], button:has-text("Close"), button:has-text("Cancel")')
        if close_btn.first.is_visible(timeout=1000):
            close_btn.first.click()
            time.sleep(0.3)
    except:
        pass

def main():
    ensure_dir(SCREENSHOT_DIR)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        print("\n=== HELP DOCUMENTATION SCREENSHOT CAPTURE ===\n")

        # ========================================
        # SECTION 1: AUTHENTICATION
        # ========================================
        print("\n--- 1. AUTHENTICATION ---")

        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        # Login screen
        take_screenshot(page, "auth-01-login", "Login screen with Sign In tab active")

        # Sign Up tab
        if safe_click(page, 'button:has-text("Sign Up")'):
            time.sleep(0.5)
            take_screenshot(page, "auth-02-signup", "Sign Up tab for new user registration")
            safe_click(page, 'button:has-text("Sign In")')
            time.sleep(0.5)

        # Fill login form
        page.fill('input[type="email"]', EMAIL)
        page.fill('input[type="password"]', PASSWORD)
        take_screenshot(page, "auth-03-credentials", "Login form with credentials entered")

        # Login
        page.click('button[type="submit"]:has-text("Sign In")')
        page.wait_for_load_state('networkidle')
        time.sleep(3)

        # ========================================
        # SECTION 2: PROJECT SELECTION
        # ========================================
        print("\n--- 2. PROJECT SELECTION ---")

        take_screenshot(page, "project-01-selection", "Project selection screen after login")

        # Show validation error for empty project
        page.click('button:has-text("Create and Open Project")')
        time.sleep(0.5)
        take_screenshot(page, "project-02-validation", "Validation error when creating project without name")

        # Fill project form (don't submit)
        page.fill('input[placeholder*="Project"]', "Example Project")
        page.fill('input[placeholder*="domain"]', "example.com")
        take_screenshot(page, "project-03-create-form", "Create project form filled out")

        # Clear the form
        page.fill('input[placeholder*="Project"]', "")
        page.fill('input[placeholder*="domain"]', "")

        # ========================================
        # SECTION 3: LOAD PROJECT AND DASHBOARD
        # ========================================
        print("\n--- 3. PROJECT DASHBOARD ---")

        # Load the kjenmarks project
        load_btns = page.locator('button:has-text("Load")')
        if load_btns.count() > 0:
            # Click the last project (kjenmarks)
            load_btns.last.click()
            page.wait_for_load_state('networkidle')
            time.sleep(3)
            take_screenshot(page, "dashboard-01-main", "Main project dashboard view")

        # ========================================
        # SECTION 4: SETTINGS MODAL
        # ========================================
        print("\n--- 4. SETTINGS ---")

        # Click settings gear icon
        settings_btn = page.locator('button[class*="settings"], svg[class*="settings"]').first
        if not settings_btn.is_visible(timeout=2000):
            # Try the gear icon at bottom
            settings_btn = page.locator('button').filter(has=page.locator('svg')).last

        # Alternative: look for gear icon
        gear_btns = page.locator('button').all()
        for btn in gear_btns:
            try:
                if 'settings' in btn.get_attribute('class', '') or 'gear' in btn.inner_html().lower():
                    btn.click()
                    break
            except:
                continue

        time.sleep(1)
        if page.locator('[role="dialog"]').is_visible(timeout=2000):
            take_screenshot(page, "settings-01-modal", "Settings modal with API configuration")

            # Try to click through settings tabs
            tabs = page.locator('[role="dialog"] button, [role="dialog"] [role="tab"]')
            for i in range(tabs.count()):
                try:
                    tab = tabs.nth(i)
                    tab_text = tab.inner_text().strip()
                    if tab_text and len(tab_text) < 30:
                        tab.click()
                        time.sleep(0.3)
                        take_screenshot(page, f"settings-02-tab-{i+1}", f"Settings tab: {tab_text}")
                except:
                    continue

            close_modal(page)
            time.sleep(0.5)

        # ========================================
        # SECTION 5: MAP SELECTION
        # ========================================
        print("\n--- 5. TOPICAL MAPS ---")

        # Check for map selection UI
        map_dropdown = page.locator('select, [role="listbox"], button:has-text("Select Map")')
        if map_dropdown.first.is_visible(timeout=2000):
            take_screenshot(page, "map-01-selection", "Topical map selection dropdown")

        # Look for New Map button
        if safe_click(page, 'button:has-text("New Map"), button:has-text("Create Map")'):
            time.sleep(1)
            if page.locator('[role="dialog"]').is_visible(timeout=2000):
                take_screenshot(page, "map-02-create-modal", "Create new topical map modal")
                close_modal(page)

        # ========================================
        # SECTION 6: TOPIC LIST AND MANAGEMENT
        # ========================================
        print("\n--- 6. TOPIC MANAGEMENT ---")

        # Look for topics in the list
        topics = page.locator('tr, [data-testid*="topic"], .topic-row')
        if topics.count() > 0:
            take_screenshot(page, "topic-01-list", "List of topics in the topical map")

            # Click on first topic
            topics.first.click()
            time.sleep(1)
            take_screenshot(page, "topic-02-selected", "Topic selected with detail panel")

        # Look for Add Topic button
        if safe_click(page, 'button:has-text("Add Topic"), button:has-text("New Topic")'):
            time.sleep(1)
            if page.locator('[role="dialog"]').is_visible(timeout=2000):
                take_screenshot(page, "topic-03-add-modal", "Add new topic modal")
                close_modal(page)

        # ========================================
        # SECTION 7: CONTENT BRIEF
        # ========================================
        print("\n--- 7. CONTENT BRIEFS ---")

        # Look for Generate Brief button
        brief_btn = page.locator('button:has-text("Brief"), button:has-text("Generate")')
        if brief_btn.first.is_visible(timeout=2000):
            brief_btn.first.click()
            time.sleep(1)
            if page.locator('[role="dialog"]').is_visible(timeout=3000):
                take_screenshot(page, "brief-01-modal", "Content brief generation modal")
                close_modal(page)

        # ========================================
        # SECTION 8: ANALYSIS TOOLS
        # ========================================
        print("\n--- 8. ANALYSIS TOOLS ---")

        # Look for Analysis/Audit buttons
        analysis_btns = page.locator('button:has-text("Analysis"), button:has-text("Audit"), button:has-text("Validate")')
        for i in range(min(analysis_btns.count(), 3)):
            try:
                btn = analysis_btns.nth(i)
                btn_text = btn.inner_text().strip()
                btn.click()
                time.sleep(1)
                if page.locator('[role="dialog"]').is_visible(timeout=2000):
                    take_screenshot(page, f"analysis-0{i+1}-{btn_text.lower().replace(' ', '-')}", f"Analysis: {btn_text}")
                    close_modal(page)
            except:
                continue

        # ========================================
        # SECTION 9: EXPORT OPTIONS
        # ========================================
        print("\n--- 9. EXPORT ---")

        if safe_click(page, 'button:has-text("Export")'):
            time.sleep(1)
            if page.locator('[role="dialog"]').is_visible(timeout=2000):
                take_screenshot(page, "export-01-modal", "Export options modal")
                close_modal(page)

        # ========================================
        # SECTION 10: FOOTER DOCK
        # ========================================
        print("\n--- 10. FOOTER & NAVIGATION ---")

        # Take screenshot of footer dock if visible
        footer = page.locator('footer, .footer-dock, [data-testid="footer"]')
        if footer.first.is_visible(timeout=2000):
            take_screenshot(page, "footer-01-dock", "Footer dock with action buttons")

        # ========================================
        # SECTION 11: SITE ANALYSIS
        # ========================================
        print("\n--- 11. SITE ANALYSIS ---")

        # Go back to project selection
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        if safe_click(page, 'button:has-text("Open Site Analysis")'):
            page.wait_for_load_state('networkidle')
            time.sleep(2)
            take_screenshot(page, "site-analysis-01-main", "Site Analysis V2 main screen")

            # New Analysis button
            if safe_click(page, 'button:has-text("New Analysis")'):
                time.sleep(1)
                if page.locator('[role="dialog"]').is_visible(timeout=2000):
                    take_screenshot(page, "site-analysis-02-create", "Create new site analysis modal")
                    close_modal(page)

        # ========================================
        # SECTION 12: ADMIN DASHBOARD
        # ========================================
        print("\n--- 12. ADMIN ---")

        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        if safe_click(page, 'button:has-text("Admin Dashboard"), button:has-text("Admin")'):
            page.wait_for_load_state('networkidle')
            time.sleep(2)
            take_screenshot(page, "admin-01-dashboard", "Admin dashboard overview")

        # ========================================
        # SECTION 13: HELP MODAL
        # ========================================
        print("\n--- 13. HELP ---")

        # Look for help button
        if safe_click(page, 'button:has-text("Help"), button[aria-label*="Help"]'):
            time.sleep(1)
            if page.locator('[role="dialog"]').is_visible(timeout=2000):
                take_screenshot(page, "help-01-modal", "Help documentation modal")
                close_modal(page)

        browser.close()

        # Summary
        screenshots = os.listdir(SCREENSHOT_DIR)
        print(f"\n=== CAPTURE COMPLETE ===")
        print(f"Total screenshots: {len(screenshots)}")
        print(f"Location: {SCREENSHOT_DIR}/")
        for s in sorted(screenshots):
            print(f"  - {s}")

if __name__ == "__main__":
    main()
