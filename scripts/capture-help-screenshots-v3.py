"""
Comprehensive screenshot capture for help documentation - V3.
Focuses on capturing all UI states after loading an existing project.
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

def screenshot(page, name, desc=""):
    """Take a screenshot."""
    filepath = f"{SCREENSHOT_DIR}/{name}.png"
    page.screenshot(path=filepath, full_page=False)
    print(f"[+] {name}: {desc}")
    return filepath

def click_if_visible(page, selector, timeout=3000):
    """Click element if visible."""
    try:
        loc = page.locator(selector).first
        if loc.is_visible(timeout=timeout):
            loc.click()
            return True
    except:
        pass
    return False

def close_modal(page):
    """Close any open modal."""
    page.keyboard.press('Escape')
    time.sleep(0.3)

def main():
    ensure_dir(SCREENSHOT_DIR)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})

        print("\n=== HELP SCREENSHOT CAPTURE V3 ===\n")

        # ========== LOGIN ==========
        print("--- LOGIN ---")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        screenshot(page, "01-auth-login", "Login screen")

        # Sign up tab
        click_if_visible(page, 'button:has-text("Sign Up")')
        time.sleep(0.5)
        screenshot(page, "02-auth-signup", "Sign up tab")
        click_if_visible(page, 'button:has-text("Sign In")')
        time.sleep(0.3)

        # Login
        page.fill('input[type="email"]', EMAIL)
        page.fill('input[type="password"]', PASSWORD)
        page.click('button[type="submit"]:has-text("Sign In")')
        page.wait_for_load_state('networkidle')
        time.sleep(3)

        # ========== PROJECT SELECTION ==========
        print("--- PROJECT SELECTION ---")
        screenshot(page, "03-project-selection", "Project selection after login")

        # ========== LOAD PROJECT ==========
        print("--- LOADING PROJECT ---")
        # Load kjenmarks project (last one)
        load_btns = page.locator('button:has-text("Load")')
        if load_btns.count() > 0:
            load_btns.last.click()
            page.wait_for_load_state('networkidle')
            time.sleep(4)

        screenshot(page, "04-dashboard-main", "Main dashboard after loading project")

        # ========== EXPLORE DASHBOARD ==========
        print("--- DASHBOARD EXPLORATION ---")

        # Check for map dropdown
        map_select = page.locator('select, button:has-text("Select"), [role="combobox"]')
        if map_select.first.is_visible(timeout=2000):
            screenshot(page, "05-map-selector", "Topical map selection")

        # Look for tab navigation
        tabs = page.locator('button[role="tab"], .tab-button, nav button')
        tab_count = tabs.count()
        print(f"  Found {tab_count} potential tabs")

        # Capture each visible section
        sections = ['Topical Map', 'Topics', 'Briefs', 'Analysis', 'Publication', 'Insights']
        for section in sections:
            btn = page.locator(f'button:has-text("{section}"), a:has-text("{section}")')
            if btn.first.is_visible(timeout=1000):
                btn.first.click()
                time.sleep(1)
                screenshot(page, f"06-section-{section.lower().replace(' ', '-')}", f"{section} section")

        # ========== TOPIC INTERACTION ==========
        print("--- TOPIC MANAGEMENT ---")

        # Find topic rows
        topic_rows = page.locator('tr[role="row"], .topic-item, [data-topic-id]')
        if topic_rows.count() > 0:
            screenshot(page, "07-topic-list", "List of topics")

            # Click first topic
            topic_rows.first.click()
            time.sleep(1)
            screenshot(page, "08-topic-selected", "Topic selected with details")

        # ========== MODALS ==========
        print("--- MODALS ---")

        # Settings (gear icon at bottom right)
        page.keyboard.press('Escape')  # Clear any selection
        time.sleep(0.3)

        # Try clicking various buttons for modals
        modal_triggers = [
            ('button:has-text("Add Topic")', "09-modal-add-topic", "Add topic modal"),
            ('button:has-text("Generate Brief")', "10-modal-brief", "Content brief modal"),
            ('button:has-text("Brief")', "10-modal-brief-alt", "Brief modal"),
            ('button:has-text("Export")', "11-modal-export", "Export options"),
            ('button:has-text("Validate")', "12-modal-validate", "Validation modal"),
            ('button:has-text("Audit")', "13-modal-audit", "Audit modal"),
            ('button:has-text("EAV")', "14-modal-eav", "EAV manager"),
            ('button:has-text("Pillar")', "15-modal-pillar", "Pillar editor"),
        ]

        for selector, name, desc in modal_triggers:
            if click_if_visible(page, selector, timeout=2000):
                time.sleep(1)
                if page.locator('[role="dialog"]').is_visible(timeout=2000):
                    screenshot(page, name, desc)
                    close_modal(page)
                    time.sleep(0.3)

        # ========== SITE ANALYSIS ==========
        print("--- SITE ANALYSIS ---")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        if click_if_visible(page, 'button:has-text("Open Site Analysis")'):
            time.sleep(2)
            screenshot(page, "16-site-analysis", "Site Analysis V2")

            if click_if_visible(page, 'button:has-text("New Analysis")'):
                time.sleep(1)
                if page.locator('[role="dialog"]').is_visible(timeout=2000):
                    screenshot(page, "17-site-analysis-new", "New site analysis")
                    close_modal(page)

        # ========== ADMIN ==========
        print("--- ADMIN ---")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        if click_if_visible(page, 'button:has-text("Admin")'):
            time.sleep(2)
            screenshot(page, "18-admin-dashboard", "Admin dashboard")

        browser.close()

        # Summary
        files = sorted(os.listdir(SCREENSHOT_DIR))
        print(f"\n=== DONE ===")
        print(f"Screenshots: {len(files)} in {SCREENSHOT_DIR}/")

if __name__ == "__main__":
    main()
