"""
Comprehensive screenshot capture for complete help documentation.
Captures ALL modals, screens, and features systematically.
"""

from playwright.sync_api import sync_playwright
import os
import time

BASE_URL = "http://localhost:3002"
EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
SCREENSHOT_DIR = "docs/help-screenshots"

os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# Counter for naming
counter = {"value": 1}

def shot(page, name, desc=""):
    """Take a screenshot with sequential numbering"""
    num = str(counter["value"]).zfill(3)
    path = f"{SCREENSHOT_DIR}/{num}-{name}.png"
    page.screenshot(path=path)
    print(f"[{num}] {name}: {desc}")
    counter["value"] += 1
    return path

def wait_modal(page, timeout=5000):
    """Wait for modal to appear"""
    try:
        page.wait_for_selector('[role="dialog"], .modal, [data-state="open"], .fixed.inset-0', timeout=timeout)
        time.sleep(0.5)
        return True
    except:
        return False

def close_modal(page):
    """Close modal"""
    try:
        # Try clicking X button first
        close_btn = page.locator('button:has-text("Cancel"), button[aria-label="Close"], button:has(svg.lucide-x)').first
        if close_btn.is_visible(timeout=1000):
            close_btn.click()
            time.sleep(0.3)
            return
    except:
        pass
    # Fallback to Escape
    page.keyboard.press('Escape')
    time.sleep(0.3)

def click_button(page, selector, wait=1):
    """Safely click a button"""
    try:
        btn = page.locator(selector).first
        if btn.is_visible(timeout=3000):
            btn.click()
            time.sleep(wait)
            return True
    except Exception as e:
        print(f"  Could not click {selector}: {str(e)[:50]}")
    return False

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})

        print("\n" + "="*60)
        print("COMPREHENSIVE HELP DOCUMENTATION SCREENSHOT CAPTURE")
        print("="*60 + "\n")

        # ============================================================
        # SECTION 1: AUTHENTICATION
        # ============================================================
        print("\n--- SECTION 1: AUTHENTICATION ---\n")

        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        shot(page, "auth-login-empty", "Login screen - empty state")

        # Sign Up tab
        if click_button(page, 'button:has-text("Sign Up")', 0.5):
            shot(page, "auth-signup-tab", "Sign Up tab selected")
            click_button(page, 'button:has-text("Sign In")', 0.3)

        # Fill login
        page.fill('input[type="email"]', EMAIL)
        shot(page, "auth-login-email", "Login with email entered")

        page.fill('input[type="password"]', PASSWORD)
        shot(page, "auth-login-filled", "Login form completely filled")

        # Login
        page.click('button[type="submit"]:has-text("Sign In")')
        page.wait_for_load_state('networkidle')
        time.sleep(3)

        # ============================================================
        # SECTION 2: PROJECT SELECTION SCREEN
        # ============================================================
        print("\n--- SECTION 2: PROJECT SELECTION ---\n")

        shot(page, "projects-selection", "Project selection screen after login")

        # Try to trigger validation
        create_btn = page.locator('button:has-text("Create and Open Project")')
        if create_btn.is_visible(timeout=2000):
            create_btn.click()
            time.sleep(0.5)
            shot(page, "projects-validation-error", "Validation error - empty fields")

        # Fill create form
        name_input = page.locator('input').first
        if name_input.is_visible(timeout=2000):
            name_input.fill("Example SEO Strategy")
            shot(page, "projects-name-filled", "Project name entered")

        # ============================================================
        # SECTION 3: SETTINGS MODAL (from project selection)
        # ============================================================
        print("\n--- SECTION 3: SETTINGS MODAL ---\n")

        # Click gear icon
        gear_btns = page.locator('button').all()
        for btn in gear_btns[-5:]:
            try:
                html = btn.inner_html()
                if 'cog' in html.lower() or 'settings' in html.lower() or 'gear' in html.lower() or 'M12' in html:
                    btn.click()
                    time.sleep(1)
                    if wait_modal(page):
                        shot(page, "settings-modal-main", "Settings modal - main view")

                        # Try to find and click through tabs
                        tabs = page.locator('[role="dialog"] button, [role="dialog"] [role="tab"]').all()
                        for i, tab in enumerate(tabs[:6]):
                            try:
                                text = tab.inner_text().strip()
                                if text and len(text) < 20 and text not in ['Cancel', 'Save', 'Close']:
                                    tab.click()
                                    time.sleep(0.3)
                                    shot(page, f"settings-tab-{text.lower().replace(' ', '-')}", f"Settings - {text} tab")
                            except:
                                pass

                        close_modal(page)
                    break
            except:
                continue

        # ============================================================
        # SECTION 4: LOAD PROJECT -> PROJECT WORKSPACE
        # ============================================================
        print("\n--- SECTION 4: PROJECT WORKSPACE ---\n")

        # Clear the form first
        page.reload()
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        # Load existing project
        load_btns = page.locator('button:has-text("Load")')
        if load_btns.count() > 0:
            load_btns.last.click()
            page.wait_for_load_state('networkidle')
            time.sleep(3)

            shot(page, "workspace-main", "Project workspace - main view")

            # Capture each card section
            if page.locator('text="Create New Topical Map"').is_visible(timeout=2000):
                shot(page, "workspace-create-map-section", "Create New Topical Map section")

            if page.locator('text="Analyze Existing Website"').is_visible(timeout=2000):
                shot(page, "workspace-analyze-section", "Analyze Existing Website section")

            if page.locator('text="Merge Topical Maps"').is_visible(timeout=2000):
                shot(page, "workspace-merge-section", "Merge Topical Maps section")

        # ============================================================
        # SECTION 5: LOAD MAP -> MAP DASHBOARD
        # ============================================================
        print("\n--- SECTION 5: MAP DASHBOARD ---\n")

        map_btns = page.locator('button:has-text("Load Map")')
        if map_btns.count() > 0:
            map_btns.first.click()
            page.wait_for_load_state('networkidle')
            time.sleep(3)

            shot(page, "dashboard-main", "Map dashboard - main view")

            # Strategy Overview section
            if page.locator('text="Strategy Overview"').is_visible(timeout=2000):
                shot(page, "dashboard-strategy-overview", "Strategy Overview panel")

            # ============================================================
            # SECTION 6: DASHBOARD NAVIGATION TABS
            # ============================================================
            print("\n--- SECTION 6: NAVIGATION TABS ---\n")

            tabs = ['Strategy', 'Content', 'Data', 'Planning', 'Analysis', 'Advanced']
            for tab in tabs:
                btn = page.locator(f'button:has-text("{tab}")').first
                if btn.is_visible(timeout=2000):
                    btn.click()
                    time.sleep(1)
                    shot(page, f"dashboard-tab-{tab.lower()}", f"Dashboard - {tab} tab")

                    # If Analysis tab, capture dropdown menu
                    if tab == 'Analysis':
                        time.sleep(0.5)
                        shot(page, "dashboard-analysis-dropdown", "Analysis dropdown menu open")

            # ============================================================
            # SECTION 7: SEO PILLARS MODAL
            # ============================================================
            print("\n--- SECTION 7: SEO PILLARS ---\n")

            # Go back to Strategy tab
            click_button(page, 'button:has-text("Strategy")', 1)

            if click_button(page, 'button:has-text("Edit Pillars")', 1):
                if wait_modal(page):
                    shot(page, "modal-seo-pillars-filled", "SEO Pillars modal with data")
                    close_modal(page)

            # ============================================================
            # SECTION 8: EAV MANAGER MODAL
            # ============================================================
            print("\n--- SECTION 8: EAV MANAGER ---\n")

            if click_button(page, 'button:has-text("Manage EAVs")', 1):
                if wait_modal(page):
                    shot(page, "modal-eav-manager-main", "EAV Manager modal")

                    # Scroll down to see more EAVs
                    modal = page.locator('[role="dialog"]').first
                    if modal.is_visible():
                        modal.evaluate('el => el.scrollTop = 300')
                        time.sleep(0.3)
                        shot(page, "modal-eav-manager-scrolled", "EAV Manager - scrolled view")

                    close_modal(page)

            # ============================================================
            # SECTION 9: COMPETITOR MANAGER
            # ============================================================
            print("\n--- SECTION 9: COMPETITORS ---\n")

            if click_button(page, 'button:has-text("Competitors")', 1):
                if wait_modal(page):
                    shot(page, "modal-competitors-main", "Manage Competitors modal")
                    close_modal(page)

            # ============================================================
            # SECTION 10: TOPIC INTERACTIONS
            # ============================================================
            print("\n--- SECTION 10: TOPIC DETAIL ---\n")

            # Click on first topic row
            topic_row = page.locator('tbody tr').first
            if topic_row.is_visible(timeout=3000):
                topic_row.click()
                time.sleep(1)
                shot(page, "topic-detail-panel", "Topic selected with detail panel")

                # View Brief button
                if click_button(page, 'button:has-text("View Brief")', 1):
                    if wait_modal(page):
                        shot(page, "modal-content-brief-view", "Content Brief modal - view mode")

                        # Scroll to see more content
                        modal = page.locator('[role="dialog"]').first
                        if modal.is_visible():
                            modal.evaluate('el => el.scrollTop = 500')
                            time.sleep(0.3)
                            shot(page, "modal-content-brief-scrolled", "Content Brief - scrolled")

                        close_modal(page)

            # ============================================================
            # SECTION 11: ADD TOPIC MODAL
            # ============================================================
            print("\n--- SECTION 11: ADD TOPIC ---\n")

            if click_button(page, 'button:has-text("Add Topic"), button:has-text("New Topic")', 1):
                if wait_modal(page):
                    shot(page, "modal-add-topic-empty", "Add Topic modal - empty")

                    # Fill some fields
                    title_input = page.locator('[role="dialog"] input').first
                    if title_input.is_visible(timeout=2000):
                        title_input.fill("Example Topic Title")
                        shot(page, "modal-add-topic-filled", "Add Topic modal - filled")

                    close_modal(page)

            # ============================================================
            # SECTION 12: EXPAND TOPIC
            # ============================================================
            print("\n--- SECTION 12: EXPAND TOPIC ---\n")

            # Click topic again to select
            topic_row = page.locator('tbody tr').first
            if topic_row.is_visible(timeout=2000):
                topic_row.click()
                time.sleep(0.5)

                if click_button(page, 'button:has-text("Expand Topic")', 1):
                    if wait_modal(page):
                        shot(page, "modal-expand-topic", "Expand Topic modal")
                        close_modal(page)

            # ============================================================
            # SECTION 13: GENERATE REPORT
            # ============================================================
            print("\n--- SECTION 13: REPORT GENERATION ---\n")

            if click_button(page, 'button:has-text("Generate Report")', 1):
                if wait_modal(page):
                    shot(page, "modal-report-generate", "Generate Report modal")
                    close_modal(page)

            # ============================================================
            # SECTION 14: AI USAGE
            # ============================================================
            print("\n--- SECTION 14: AI USAGE ---\n")

            if click_button(page, 'button:has-text("AI Usage")', 1):
                if wait_modal(page):
                    shot(page, "modal-ai-usage", "AI Usage statistics")
                    close_modal(page)

            # ============================================================
            # SECTION 15: VIEW TOGGLES
            # ============================================================
            print("\n--- SECTION 15: VIEW MODES ---\n")

            # Cards view
            if click_button(page, 'button:has-text("Cards")', 1):
                shot(page, "view-cards", "Topics in Cards view")

            # Table view
            if click_button(page, 'button:has-text("Table")', 1):
                shot(page, "view-table", "Topics in Table view")

            # Graph view
            if click_button(page, 'button:has-text("Graph")', 1):
                time.sleep(2)  # Graph takes time to render
                shot(page, "view-graph", "Topics in Graph view")

            # ============================================================
            # SECTION 16: ANALYSIS TOOLS (each item)
            # ============================================================
            print("\n--- SECTION 16: ANALYSIS TOOLS ---\n")

            analysis_items = [
                ('Validate Map Structure', 'validate-structure'),
                ('Internal Link Audit', 'internal-link-audit'),
                ('Full Health Check', 'full-health-check'),
                ('Query Network', 'query-network'),
                ('E-A-T Scanner', 'eat-scanner'),
                ('Corpus Audit', 'corpus-audit'),
                ('Enhanced Metrics', 'enhanced-metrics'),
                ('Entity Authority', 'entity-authority'),
            ]

            for item_text, item_slug in analysis_items:
                # Open Analysis dropdown
                click_button(page, 'button:has-text("Analysis")', 0.5)
                time.sleep(0.3)

                # Click the item
                item_btn = page.locator(f'button:has-text("{item_text}"), [role="menuitem"]:has-text("{item_text}")')
                if item_btn.first.is_visible(timeout=2000):
                    item_btn.first.click()
                    time.sleep(1)

                    if wait_modal(page, timeout=3000):
                        shot(page, f"analysis-{item_slug}", f"Analysis - {item_text}")
                        close_modal(page)
                        time.sleep(0.5)

            # ============================================================
            # SECTION 17: CONTENT BRIEF GENERATION
            # ============================================================
            print("\n--- SECTION 17: BRIEF GENERATION ---\n")

            # Click Content tab
            click_button(page, 'button:has-text("Content")', 1)

            # Look for brief-related buttons
            if click_button(page, 'button:has-text("Generate Brief"), button:has-text("New Brief")', 1):
                if wait_modal(page):
                    shot(page, "modal-brief-generate", "Brief generation modal")
                    close_modal(page)

            # ============================================================
            # SECTION 18: DRAFTING MODAL
            # ============================================================
            print("\n--- SECTION 18: DRAFT EDITOR ---\n")

            # Click on a topic with a brief
            topic_rows = page.locator('tbody tr').all()
            for row in topic_rows[:5]:
                try:
                    row.click()
                    time.sleep(0.5)

                    # Look for Draft/Edit button
                    draft_btn = page.locator('button:has-text("Draft"), button:has-text("Edit Draft"), button:has-text("Generate Draft")')
                    if draft_btn.first.is_visible(timeout=2000):
                        draft_btn.first.click()
                        time.sleep(1)

                        if wait_modal(page):
                            shot(page, "modal-drafting-editor", "Draft Editor modal")

                            # Scroll to see more
                            modal = page.locator('[role="dialog"]').first
                            if modal.is_visible():
                                modal.evaluate('el => el.scrollTop = 400')
                                time.sleep(0.3)
                                shot(page, "modal-drafting-scrolled", "Draft Editor - scrolled")

                            close_modal(page)
                            break
                except:
                    continue

            # ============================================================
            # SECTION 19: EXPORT OPTIONS
            # ============================================================
            print("\n--- SECTION 19: EXPORT ---\n")

            # Data tab for export
            click_button(page, 'button:has-text("Data")', 1)

            if click_button(page, 'button:has-text("Export"), button:has-text("Download")', 1):
                if wait_modal(page):
                    shot(page, "modal-export-settings", "Export Settings modal")
                    close_modal(page)

            # ============================================================
            # SECTION 20: PUBLICATION PLANNING
            # ============================================================
            print("\n--- SECTION 20: PUBLICATION PLANNING ---\n")

            click_button(page, 'button:has-text("Planning")', 1)
            shot(page, "planning-tab-main", "Planning tab view")

            if click_button(page, 'button:has-text("Publication Plan"), button:has-text("Create Plan")', 1):
                if wait_modal(page):
                    shot(page, "modal-publication-plan", "Publication Plan modal")
                    close_modal(page)

            if click_button(page, 'button:has-text("Calendar"), button:has-text("Content Calendar")', 1):
                if wait_modal(page):
                    shot(page, "modal-content-calendar", "Content Calendar modal")
                    close_modal(page)

            # ============================================================
            # SECTION 21: MIGRATION WORKBENCH
            # ============================================================
            print("\n--- SECTION 21: MIGRATION WORKBENCH ---\n")

            if click_button(page, 'button:has-text("Migration Workbench")', 1):
                if wait_modal(page):
                    shot(page, "modal-migration-workbench", "Migration Workbench")

                    # Look for tabs/sections in migration
                    migration_tabs = ['Triage', 'Inventory', 'Kanban', 'Export']
                    for mtab in migration_tabs:
                        mtab_btn = page.locator(f'[role="dialog"] button:has-text("{mtab}")')
                        if mtab_btn.first.is_visible(timeout=1000):
                            mtab_btn.first.click()
                            time.sleep(0.5)
                            shot(page, f"migration-{mtab.lower()}", f"Migration - {mtab} view")

                    close_modal(page)

            # ============================================================
            # SECTION 22: ASK STRATEGIST
            # ============================================================
            print("\n--- SECTION 22: ASK STRATEGIST ---\n")

            if click_button(page, 'button:has-text("Ask Strategist")', 1):
                if wait_modal(page):
                    shot(page, "modal-ask-strategist", "Ask Strategist AI chat")

                    # Type a question
                    chat_input = page.locator('[role="dialog"] input, [role="dialog"] textarea').first
                    if chat_input.is_visible(timeout=2000):
                        chat_input.fill("What topics should I prioritize?")
                        shot(page, "modal-ask-strategist-question", "Ask Strategist with question")

                    close_modal(page)

        # ============================================================
        # SECTION 23: SITE ANALYSIS V2
        # ============================================================
        print("\n--- SECTION 23: SITE ANALYSIS ---\n")

        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        if click_button(page, 'button:has-text("Open Site Analysis")', 2):
            shot(page, "site-analysis-main", "Site Analysis V2 - main view")

            if click_button(page, 'button:has-text("New Analysis"), button:has-text("Create")', 1):
                if wait_modal(page):
                    shot(page, "site-analysis-new-modal", "New Site Analysis modal")
                    close_modal(page)

            # Close site analysis
            click_button(page, 'button:has-text("Close")', 1)

        # ============================================================
        # SECTION 24: ADMIN DASHBOARD
        # ============================================================
        print("\n--- SECTION 24: ADMIN ---\n")

        if click_button(page, 'button:has-text("Admin Dashboard"), button:has-text("Admin")', 2):
            shot(page, "admin-main", "Admin Console - main view")

            admin_sections = [
                ('System Overview', 'system-overview'),
                ('AI Usage', 'ai-usage'),
                ('Configuration', 'configuration'),
                ('User Management', 'users'),
                ('Help Documentation', 'help-docs'),
            ]

            for section_text, section_slug in admin_sections:
                section_btn = page.locator(f'button:has-text("{section_text}"), a:has-text("{section_text}")')
                if section_btn.first.is_visible(timeout=2000):
                    section_btn.first.click()
                    time.sleep(1)
                    shot(page, f"admin-{section_slug}", f"Admin - {section_text}")

            # Back to projects
            click_button(page, 'button:has-text("Back to Projects")', 2)

        # ============================================================
        # SECTION 25: HELP MODAL
        # ============================================================
        print("\n--- SECTION 25: HELP ---\n")

        if click_button(page, 'button:has-text("Help"), button[aria-label*="Help"]', 1):
            if wait_modal(page):
                shot(page, "modal-help-main", "Help modal")
                close_modal(page)

        browser.close()

        # ============================================================
        # SUMMARY
        # ============================================================
        print("\n" + "="*60)
        print("CAPTURE COMPLETE")
        print("="*60)

        files = sorted([f for f in os.listdir(SCREENSHOT_DIR) if f.endswith('.png')])
        print(f"\nTotal screenshots: {len(files)}")
        print(f"Location: {SCREENSHOT_DIR}/\n")

        for f in files:
            print(f"  {f}")

if __name__ == "__main__":
    main()
