"""
Comprehensive NFIR Test
1. Screenshot nfir.nl (target design)
2. Screenshot current app output
3. Create optimized styled article
4. Compare all outputs
"""

from playwright.sync_api import sync_playwright
import time
import os

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def main():
    output_dir = 'tmp/nfir_comparison'
    ensure_dir(output_dir)

    print("=" * 70)
    print("NFIR COMPREHENSIVE COMPARISON TEST")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1400, 'height': 900})

        # =================================================================
        # STEP 1: Screenshot NFIR.nl (Target Design)
        # =================================================================
        print("\n[STEP 1] Capturing NFIR.nl target design...")
        page_nfir = context.new_page()
        page_nfir.goto('https://www.nfir.nl', wait_until='networkidle', timeout=60000)
        page_nfir.wait_for_timeout(3000)

        # Viewport screenshot
        page_nfir.screenshot(path=f'{output_dir}/01_TARGET_nfir_viewport.png')
        print(f"   Saved: {output_dir}/01_TARGET_nfir_viewport.png")

        # Full page
        page_nfir.screenshot(path=f'{output_dir}/01_TARGET_nfir_full.png', full_page=True)
        print(f"   Saved: {output_dir}/01_TARGET_nfir_full.png")

        # =================================================================
        # STEP 2: Screenshot current app output (exampleoutput_1.html)
        # =================================================================
        print("\n[STEP 2] Capturing current output (exampleoutput_1.html)...")
        page_current = context.new_page()
        page_current.goto('file:///D:/www/cost-of-retreival-reducer/tmp/stylizer_new/test_nfir/exampleoutput_1.html')
        page_current.wait_for_timeout(2000)

        page_current.screenshot(path=f'{output_dir}/02_CURRENT_output_viewport.png')
        print(f"   Saved: {output_dir}/02_CURRENT_output_viewport.png")

        page_current.screenshot(path=f'{output_dir}/02_CURRENT_output_full.png', full_page=True)
        print(f"   Saved: {output_dir}/02_CURRENT_output_full.png")

        # =================================================================
        # STEP 3: Screenshot the design_agency_test_output.html (latest fix)
        # =================================================================
        print("\n[STEP 3] Capturing latest test output (design_agency_test)...")
        page_test = context.new_page()
        page_test.goto('file:///D:/www/cost-of-retreival-reducer/tmp/stylizer_new/design_agency_test_output.html')
        page_test.wait_for_timeout(2000)

        page_test.screenshot(path=f'{output_dir}/03_FIXED_test_viewport.png')
        print(f"   Saved: {output_dir}/03_FIXED_test_viewport.png")

        page_test.screenshot(path=f'{output_dir}/03_FIXED_test_full.png', full_page=True)
        print(f"   Saved: {output_dir}/03_FIXED_test_full.png")

        browser.close()

    print("\n" + "=" * 70)
    print("SCREENSHOTS CAPTURED")
    print("=" * 70)
    print(f"""
Files saved to {output_dir}/:
  1. 01_TARGET_nfir_viewport.png    - NFIR.nl website (what we're matching)
  2. 02_CURRENT_output_viewport.png - Current app output
  3. 03_FIXED_test_viewport.png     - Latest test with visual components

Full page versions also available with _full suffix.
""")

if __name__ == "__main__":
    main()
