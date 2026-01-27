"""
Visual Comparison - Screenshot local files only
"""

from playwright.sync_api import sync_playwright

def main():
    print("="*70)
    print("VISUAL COMPARISON: Fixed vs Broken Output")
    print("="*70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1400, 'height': 900})

        # Screenshot 1: Fixed output
        print("\n[1] Rendering fixed output...")
        page1 = context.new_page()
        page1.goto('file:///D:/www/cost-of-retreival-reducer/tmp/stylizer_new/final_verified_output.html')
        page1.wait_for_timeout(5000)  # Wait for Tailwind to load
        page1.screenshot(path='tmp/compare_fixed_output.png')
        page1.screenshot(path='tmp/compare_fixed_output_full.png', full_page=True)
        print("   Saved tmp/compare_fixed_output.png")

        # Screenshot 2: Broken output (for comparison)
        print("\n[2] Rendering broken output (for comparison)...")
        page2 = context.new_page()
        page2.goto('file:///D:/www/cost-of-retreival-reducer/tmp/stylizer_new/example_output_mvgm_vvebeheer_3.html')
        page2.wait_for_timeout(3000)
        page2.screenshot(path='tmp/compare_broken_output.png')
        print("   Saved tmp/compare_broken_output.png")

        print("\n" + "="*70)
        print("Screenshots saved for comparison:")
        print("  - tmp/compare_fixed_output.png (Fixed output - AFTER)")
        print("  - tmp/compare_broken_output.png (Broken output - BEFORE)")
        print("="*70)

        browser.close()

if __name__ == "__main__":
    main()
