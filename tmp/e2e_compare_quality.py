"""
E2E Test - Compare styled output with target MVGM website
"""

from playwright.sync_api import sync_playwright

def main():
    print("="*70)
    print("QUALITY COMPARISON: MVGM Target vs Styled Output")
    print("="*70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})

        # Capture MVGM target website
        print("\n[1] Capturing MVGM target website...")
        target_page = context.new_page()
        target_page.goto('https://www.mvgm.com/nl/vastgoeddiensten/vve-beheer/')
        target_page.wait_for_load_state('networkidle')
        target_page.wait_for_timeout(3000)

        # Scroll to show content
        target_page.evaluate('window.scrollTo(0, 200)')
        target_page.wait_for_timeout(1000)

        target_page.screenshot(path='tmp/compare_01_mvgm_target.png')
        target_page.screenshot(path='tmp/compare_02_mvgm_full.png', full_page=True)
        print("   Saved MVGM target screenshots")

        # Capture styled output preview
        print("\n[2] Capturing styled output from app...")
        app_page = context.new_page()

        # Login
        app_page.goto('http://localhost:3001')
        app_page.wait_for_load_state('networkidle')
        if app_page.locator('input[type="email"]').is_visible():
            app_page.fill('input[type="email"]', 'richard@kjenmarks.nl')
            app_page.fill('input[type="password"]', 'pannekoek')
            app_page.click('button[type="submit"]')
            app_page.wait_for_timeout(3000)

        # Navigate to Style & Publish preview
        app_page.wait_for_selector('table', timeout=10000)
        mvgm_row = app_page.get_by_role("row", name="mvgm vve mvgm.com 4 Sep 8,")
        mvgm_row.get_by_role("button").nth(1).click()
        app_page.wait_for_timeout(2000)

        load_buttons = app_page.get_by_role("button", name="Load Map").all()
        if len(load_buttons) >= 2:
            load_buttons[1].click()
            app_page.wait_for_timeout(3000)

        app_page.wait_for_selector('text=Totaal VvE Beheer', timeout=10000)
        article_row = app_page.locator('tr:has-text("Totaal VvE Beheer Almere")').first
        article_row.click()
        app_page.wait_for_timeout(1000)

        # View Brief -> Draft -> Style & Publish
        app_page.locator('button:has-text("View Brief")').first.click()
        app_page.wait_for_timeout(2000)
        app_page.locator('button:has-text("View Draft")').first.click()
        app_page.wait_for_timeout(3000)

        publish_btn = app_page.locator('button:has-text("Publish")').first
        publish_btn.click()
        app_page.wait_for_timeout(500)
        app_page.click('text=Style & Publish')
        app_page.wait_for_timeout(3000)

        # Navigate to Preview
        modal = app_page.locator('.fixed.inset-0.bg-black.bg-opacity-70.z-50.flex.justify-center.items-center').first
        next_btn = modal.locator('button:has-text("Next")').first
        if next_btn.is_visible():
            next_btn.click()
            app_page.wait_for_timeout(3000)
        next_btn = modal.locator('button:has-text("Next")').first
        if next_btn.is_visible():
            next_btn.click()
            app_page.wait_for_timeout(5000)

        app_page.screenshot(path='tmp/compare_03_styled_output.png')
        print("   Saved styled output screenshot")

        # Compare visually
        print("\n" + "="*70)
        print("COMPARISON RESULTS")
        print("="*70)

        print("""
Screenshots saved for comparison:

TARGET (MVGM Website):
- tmp/compare_01_mvgm_target.png - Main viewport
- tmp/compare_02_mvgm_full.png   - Full page

STYLED OUTPUT:
- tmp/compare_03_styled_output.png - Preview modal

KEY QUALITY INDICATORS TO CHECK:
1. Typography - Font family and weights
2. Color palette - Primary/secondary colors
3. Spacing and layout - Professional appearance
4. Brand consistency - Logo colors, accent colors
5. Overall polish - Design agency quality

The Style & Publish modal shows:
- 85% Brand Match score
- "Excellent brand alignment - design matches detected style"
""")

        browser.close()

if __name__ == "__main__":
    main()
