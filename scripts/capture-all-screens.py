"""
Complete screenshot capture - navigates through entire app flow.
"""

from playwright.sync_api import sync_playwright
import os
import time

BASE_URL = "http://localhost:3002"
EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
SCREENSHOT_DIR = "docs/help-screenshots"

os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def shot(page, name, desc=""):
    page.screenshot(path=f"{SCREENSHOT_DIR}/{name}.png")
    print(f"[+] {name}: {desc}")

def click(page, selector, wait=1):
    try:
        page.locator(selector).first.click()
        time.sleep(wait)
        return True
    except:
        return False

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})

        print("\n=== COMPLETE APP SCREENSHOT CAPTURE ===\n")

        # 1. AUTH
        print("--- AUTH ---")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        shot(page, "a01-login", "Login screen")

        click(page, 'button:has-text("Sign Up")', 0.5)
        shot(page, "a02-signup", "Sign up screen")
        click(page, 'button:has-text("Sign In")', 0.3)

        page.fill('input[type="email"]', EMAIL)
        page.fill('input[type="password"]', PASSWORD)
        shot(page, "a03-login-filled", "Login with credentials")

        page.click('button[type="submit"]:has-text("Sign In")')
        page.wait_for_load_state('networkidle')
        time.sleep(3)

        # 2. PROJECT SELECTION
        print("--- PROJECTS ---")
        shot(page, "b01-project-selection", "Project selection screen")

        # 3. LOAD A PROJECT (kjenmarks - last one)
        print("--- PROJECT WORKSPACE ---")
        load_btns = page.locator('button:has-text("Load")')
        if load_btns.count() > 0:
            load_btns.last.click()
            page.wait_for_load_state('networkidle')
            time.sleep(3)
        shot(page, "b02-project-workspace", "Project workspace with map options")

        # 4. LOAD THE MAP
        print("--- LOADING MAP ---")
        if click(page, 'button:has-text("Load Map")', 3):
            shot(page, "c01-map-dashboard", "Map dashboard with topics")

        # 5. EXPLORE DASHBOARD TABS
        print("--- DASHBOARD TABS ---")

        # Look for tab buttons in various locations
        tab_selectors = [
            'button:has-text("Topical Map")',
            'button:has-text("Topics")',
            'button:has-text("SEO Insights")',
            'button:has-text("Analysis")',
            'button:has-text("Publication")',
            'button:has-text("Graph")',
        ]

        for i, sel in enumerate(tab_selectors):
            if click(page, sel, 1):
                tab_name = sel.split('"')[1].lower().replace(' ', '-')
                shot(page, f"c0{i+2}-tab-{tab_name}", f"Tab: {sel.split('\"')[1]}")

        # 6. TOPIC INTERACTIONS
        print("--- TOPICS ---")

        # Look for topic rows in table
        rows = page.locator('tbody tr, [data-topic-id], .topic-row')
        if rows.count() > 0:
            shot(page, "d01-topics-list", "Topics list view")
            rows.first.click()
            time.sleep(1)
            shot(page, "d02-topic-selected", "Topic selected")

        # 7. FOOTER DOCK BUTTONS
        print("--- FOOTER ACTIONS ---")

        footer_buttons = [
            ('button:has-text("Add Topic")', "e01-add-topic", "Add topic modal"),
            ('button:has-text("Generate")', "e02-generate", "Generate button"),
            ('button:has-text("Brief")', "e03-brief", "Brief modal"),
            ('button:has-text("Export")', "e04-export", "Export modal"),
        ]

        for selector, name, desc in footer_buttons:
            if click(page, selector, 1):
                if page.locator('[role="dialog"]').is_visible(timeout=2000):
                    shot(page, name, desc)
                    page.keyboard.press('Escape')
                    time.sleep(0.3)

        # 8. SETTINGS MODAL
        print("--- SETTINGS ---")

        # Settings is usually a gear icon - look for it
        settings_candidates = page.locator('button').all()
        for btn in settings_candidates[-5:]:  # Check last 5 buttons
            try:
                html = btn.inner_html()
                if 'settings' in html.lower() or 'gear' in html.lower() or 'cog' in html.lower():
                    btn.click()
                    time.sleep(1)
                    if page.locator('[role="dialog"]').is_visible(timeout=2000):
                        shot(page, "f01-settings", "Settings modal")

                        # Try clicking tabs in settings
                        settings_tabs = page.locator('[role="dialog"] [role="tab"], [role="dialog"] button')
                        for j in range(min(settings_tabs.count(), 5)):
                            try:
                                settings_tabs.nth(j).click()
                                time.sleep(0.3)
                            except:
                                pass
                        shot(page, "f02-settings-tabs", "Settings with tabs")
                        page.keyboard.press('Escape')
                    break
            except:
                continue

        # 9. ANALYSIS TOOLS
        print("--- ANALYSIS ---")

        analysis_btns = [
            'button:has-text("Validation")',
            'button:has-text("Audit")',
            'button:has-text("Linking")',
            'button:has-text("Semantic")',
            'button:has-text("EAV")',
            'button:has-text("Pillar")',
        ]

        for i, sel in enumerate(analysis_btns):
            if click(page, sel, 1):
                if page.locator('[role="dialog"]').is_visible(timeout=2000):
                    name = sel.split('"')[1].lower()
                    shot(page, f"g0{i+1}-{name}", f"{name} modal")
                    page.keyboard.press('Escape')
                    time.sleep(0.3)

        # 10. WIZARD FLOWS
        print("--- WIZARDS ---")

        # Go back to project workspace to access wizards
        if click(page, 'button:has-text("Back")', 2):
            shot(page, "h01-back-to-workspace", "Back to workspace")

            if click(page, 'button:has-text("Start Wizard")', 2):
                shot(page, "h02-wizard-start", "Wizard started")
                page.keyboard.press('Escape')
                time.sleep(0.5)

        # 11. SITE ANALYSIS
        print("--- SITE ANALYSIS ---")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        if click(page, 'button:has-text("Open Site Analysis")', 2):
            shot(page, "i01-site-analysis", "Site Analysis V2")

            if click(page, 'button:has-text("New Analysis")', 1):
                if page.locator('[role="dialog"]').is_visible(timeout=2000):
                    shot(page, "i02-new-analysis", "New analysis modal")
                    page.keyboard.press('Escape')

        # 12. ADMIN
        print("--- ADMIN ---")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        if click(page, 'button:has-text("Admin")', 2):
            shot(page, "j01-admin", "Admin dashboard")

            # Admin tabs
            admin_tabs = ['Users', 'Usage', 'Maps', 'Logs']
            for tab in admin_tabs:
                if click(page, f'button:has-text("{tab}")', 0.5):
                    shot(page, f"j02-admin-{tab.lower()}", f"Admin {tab} tab")

        # 13. ASK STRATEGIST
        print("--- ASK STRATEGIST ---")
        if click(page, 'button:has-text("Ask Strategist")', 1):
            if page.locator('[role="dialog"]').is_visible(timeout=2000):
                shot(page, "k01-strategist", "Ask Strategist chat")
                page.keyboard.press('Escape')

        browser.close()

        # Summary
        files = sorted([f for f in os.listdir(SCREENSHOT_DIR) if f.endswith('.png')])
        print(f"\n=== DONE: {len(files)} screenshots ===\n")
        for f in files:
            print(f"  {f}")

if __name__ == "__main__":
    main()
