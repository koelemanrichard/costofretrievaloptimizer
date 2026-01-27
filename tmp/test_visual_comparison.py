"""
Visual Comparison - Screenshot the fixed output vs target website
"""

from playwright.sync_api import sync_playwright

def main():
    print("="*70)
    print("VISUAL COMPARISON: Fixed Output vs Target")
    print("="*70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})

        # Screenshot 1: Target MVGM website
        print("\n[1] Capturing MVGM target website...")
        page1 = context.new_page()
        page1.goto('https://www.mvgm.com/nl/vastgoeddiensten/vve-beheer/')
        page1.wait_for_load_state('networkidle')
        page1.wait_for_timeout(3000)
        page1.screenshot(path='tmp/compare_target_mvgm.png')
        page1.screenshot(path='tmp/compare_target_mvgm_full.png', full_page=True)
        print("   Saved tmp/compare_target_mvgm.png")

        # Screenshot 2: Fixed output
        print("\n[2] Rendering fixed output...")
        page2 = context.new_page()
        page2.goto('file:///D:/www/cost-of-retreival-reducer/tmp/stylizer_new/final_verified_output.html')
        page2.wait_for_load_state('networkidle')
        page2.wait_for_timeout(3000)
        page2.screenshot(path='tmp/compare_fixed_output.png')
        page2.screenshot(path='tmp/compare_fixed_output_full.png', full_page=True)
        print("   Saved tmp/compare_fixed_output.png")

        # Screenshot 3: Broken output (for comparison)
        print("\n[3] Rendering broken output (for comparison)...")
        page3 = context.new_page()
        page3.goto('file:///D:/www/cost-of-retreival-reducer/tmp/stylizer_new/example_output_mvgm_vvebeheer_3.html')
        page3.wait_for_load_state('networkidle')
        page3.wait_for_timeout(3000)
        page3.screenshot(path='tmp/compare_broken_output.png')
        print("   Saved tmp/compare_broken_output.png")

        print("\n" + "="*70)
        print("Screenshots saved for comparison:")
        print("  - tmp/compare_target_mvgm.png (MVGM website)")
        print("  - tmp/compare_fixed_output.png (Fixed output)")
        print("  - tmp/compare_broken_output.png (Broken output - before fix)")
        print("="*70)

        browser.close()

if __name__ == "__main__":
    main()
