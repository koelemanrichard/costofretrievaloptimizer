"""
Targeted screenshot capture for specific modals and dialogs.
Captures each modal by clicking buttons and waiting for dialog to appear.
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
    path = f"{SCREENSHOT_DIR}/{name}.png"
    page.screenshot(path=path)
    print(f"[OK] {name}: {desc}")
    return path

def wait_for_modal(page, timeout=5000):
    """Wait for modal dialog to appear"""
    try:
        page.wait_for_selector('[role="dialog"], .modal, [data-state="open"]', timeout=timeout)
        time.sleep(0.5)  # Let animation complete
        return True
    except:
        return False

def close_modal(page):
    """Close modal by pressing Escape"""
    page.keyboard.press('Escape')
    time.sleep(0.3)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})

        print("\n=== MODAL SCREENSHOT CAPTURE ===\n")

        # 1. LOGIN
        print("--- Logging in ---")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        page.fill('input[type="email"]', EMAIL)
        page.fill('input[type="password"]', PASSWORD)
        page.click('button[type="submit"]:has-text("Sign In")')
        page.wait_for_load_state('networkidle')
        time.sleep(3)

        # 2. SETTINGS MODAL (from project selection)
        print("--- Settings Modal ---")
        # Click gear icon in bottom right
        gear = page.locator('button').filter(has=page.locator('svg')).last
        try:
            gear.click()
            time.sleep(1)
            if wait_for_modal(page):
                shot(page, "modal-settings", "Settings modal with API configuration")
                close_modal(page)
        except Exception as e:
            print(f"  Settings modal failed: {e}")

        # 3. LOAD A PROJECT
        print("--- Loading project ---")
        load_btns = page.locator('button:has-text("Load")')
        if load_btns.count() > 0:
            load_btns.last.click()
            page.wait_for_load_state('networkidle')
            time.sleep(3)

        # 4. LOAD A MAP
        print("--- Loading map ---")
        map_btns = page.locator('button:has-text("Load Map")')
        if map_btns.count() > 0:
            map_btns.first.click()
            page.wait_for_load_state('networkidle')
            time.sleep(3)

        # 5. EDIT PILLARS MODAL
        print("--- SEO Pillars Modal ---")
        try:
            pillar_btn = page.locator('button:has-text("Edit Pillars")')
            if pillar_btn.is_visible(timeout=3000):
                pillar_btn.click()
                if wait_for_modal(page):
                    shot(page, "modal-seo-pillars", "SEO Pillars modal with CE, SC, CSI fields")
                    close_modal(page)
        except Exception as e:
            print(f"  Pillars modal failed: {e}")

        # 6. MANAGE EAVS MODAL
        print("--- EAV Manager Modal ---")
        try:
            eav_btn = page.locator('button:has-text("Manage EAVs")')
            if eav_btn.is_visible(timeout=3000):
                eav_btn.click()
                if wait_for_modal(page):
                    shot(page, "modal-eav-manager", "EAV Manager with semantic triples")
                    close_modal(page)
        except Exception as e:
            print(f"  EAV modal failed: {e}")

        # 7. COMPETITORS MODAL
        print("--- Competitors Modal ---")
        try:
            comp_btn = page.locator('button:has-text("Competitors")')
            if comp_btn.is_visible(timeout=3000):
                comp_btn.click()
                if wait_for_modal(page):
                    shot(page, "modal-competitors", "Competitor Manager modal")
                    close_modal(page)
        except Exception as e:
            print(f"  Competitors modal failed: {e}")

        # 8. CLICK ON A TOPIC ROW
        print("--- Topic Selection ---")
        try:
            topic_row = page.locator('tbody tr').first
            if topic_row.is_visible(timeout=3000):
                topic_row.click()
                time.sleep(1)
                shot(page, "topic-selected", "Topic row selected with detail panel")
        except Exception as e:
            print(f"  Topic selection failed: {e}")

        # 9. CONTENT BRIEF MODAL (click on Brief score number)
        print("--- Content Brief Modal ---")
        try:
            # Look for brief score button (number in green/red)
            brief_btn = page.locator('button:has-text("Brief"), td button').first
            if brief_btn.is_visible(timeout=3000):
                brief_btn.click()
                if wait_for_modal(page):
                    shot(page, "modal-content-brief", "Content Brief modal with outline")
                    close_modal(page)
        except Exception as e:
            print(f"  Brief modal failed: {e}")

        # 10. GENERATE REPORT MODAL
        print("--- Generate Report ---")
        try:
            report_btn = page.locator('button:has-text("Generate Report")')
            if report_btn.is_visible(timeout=3000):
                report_btn.click()
                if wait_for_modal(page):
                    shot(page, "modal-report", "Report generation modal")
                    close_modal(page)
        except Exception as e:
            print(f"  Report modal failed: {e}")

        # 11. AI USAGE
        print("--- AI Usage ---")
        try:
            usage_btn = page.locator('button:has-text("AI Usage")')
            if usage_btn.is_visible(timeout=3000):
                usage_btn.click()
                if wait_for_modal(page):
                    shot(page, "modal-ai-usage", "AI Usage statistics")
                    close_modal(page)
        except Exception as e:
            print(f"  AI Usage failed: {e}")

        # 12. ANALYSIS DROPDOWN MENU
        print("--- Analysis Menu ---")
        try:
            analysis_tab = page.locator('button:has-text("Analysis")')
            if analysis_tab.is_visible(timeout=3000):
                analysis_tab.click()
                time.sleep(0.5)
                shot(page, "menu-analysis-dropdown", "Analysis dropdown menu")

                # Click first menu item - Validate Map Structure
                validate_btn = page.locator('button:has-text("Validate Map Structure"), [role="menuitem"]:has-text("Validate")')
                if validate_btn.is_visible(timeout=2000):
                    validate_btn.click()
                    if wait_for_modal(page):
                        shot(page, "modal-validate-structure", "Validate Map Structure modal")
                        close_modal(page)
        except Exception as e:
            print(f"  Analysis menu failed: {e}")

        # 13. GRAPH VIEW
        print("--- Graph View ---")
        try:
            graph_btn = page.locator('button:has-text("Graph")')
            if graph_btn.is_visible(timeout=3000):
                graph_btn.click()
                time.sleep(2)
                shot(page, "view-graph", "Knowledge graph visualization")
        except Exception as e:
            print(f"  Graph view failed: {e}")

        # 14. ASK STRATEGIST
        print("--- Ask Strategist ---")
        try:
            strategist_btn = page.locator('button:has-text("Ask Strategist")')
            if strategist_btn.is_visible(timeout=3000):
                strategist_btn.click()
                if wait_for_modal(page):
                    shot(page, "modal-ask-strategist", "Ask Strategist AI chat")
                    close_modal(page)
        except Exception as e:
            print(f"  Ask Strategist failed: {e}")

        browser.close()

        # Summary
        files = sorted([f for f in os.listdir(SCREENSHOT_DIR) if f.startswith('modal-') or f.startswith('menu-') or f.startswith('view-')])
        print(f"\n=== DONE: {len(files)} modal/menu screenshots ===")
        for f in files:
            print(f"  {f}")

if __name__ == "__main__":
    main()
