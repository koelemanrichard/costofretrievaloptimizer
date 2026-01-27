"""
Capture comparison screenshots: OLD (broken) vs NEW (design agency quality)
"""

from playwright.sync_api import sync_playwright

def main():
    print("=" * 70)
    print("VISUAL COMPARISON: OLD vs NEW Output")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1400, 'height': 900})

        # Screenshot 1: OLD broken output (before fix)
        print("\n[1] Rendering OLD output (all prose, no visual components)...")
        page1 = context.new_page()
        page1.goto('file:///D:/www/cost-of-retreival-reducer/tmp/stylizer_new/example_output_mvgm_vvebeheer_4.html')
        page1.wait_for_timeout(3000)
        page1.screenshot(path='tmp/comparison_OLD_broken.png')
        page1.screenshot(path='tmp/comparison_OLD_broken_full.png', full_page=True)
        print("   Saved: tmp/comparison_OLD_broken.png")

        # Screenshot 2: NEW design agency output (after fix)
        print("\n[2] Rendering NEW output (visual components)...")
        page2 = context.new_page()
        page2.goto('file:///D:/www/cost-of-retreival-reducer/tmp/stylizer_new/design_agency_test_output.html')
        page2.wait_for_timeout(3000)
        page2.screenshot(path='tmp/comparison_NEW_design_agency.png')
        page2.screenshot(path='tmp/comparison_NEW_design_agency_full.png', full_page=True)
        print("   Saved: tmp/comparison_NEW_design_agency.png")

        # Screenshot 3: Target reference (my handcrafted design)
        print("\n[3] Rendering TARGET reference (handcrafted design)...")
        page3 = context.new_page()
        page3.goto('file:///D:/www/cost-of-retreival-reducer/tmp/stylizer_new/mvgm_design_agency_quality.html')
        page3.wait_for_timeout(3000)
        page3.screenshot(path='tmp/comparison_TARGET_reference.png')
        page3.screenshot(path='tmp/comparison_TARGET_reference_full.png', full_page=True)
        print("   Saved: tmp/comparison_TARGET_reference.png")

        print("\n" + "=" * 70)
        print("COMPARISON SCREENSHOTS SAVED:")
        print("=" * 70)
        print("""
  1. tmp/comparison_OLD_broken.png         - BEFORE: All prose, no visual components
  2. tmp/comparison_NEW_design_agency.png  - AFTER: Card grids, timelines, FAQ accordion
  3. tmp/comparison_TARGET_reference.png   - TARGET: Handcrafted design agency quality

  Full page versions also saved with _full suffix.
        """)

        browser.close()

if __name__ == "__main__":
    main()
