"""
Render existing styled HTML and take screenshots for quality analysis
"""

from playwright.sync_api import sync_playwright
import os

def main():
    print("="*80)
    print("RENDERING EXISTING STYLED OUTPUT FOR QUALITY ANALYSIS")
    print("="*80)

    html_files = [
        ('tmp/stylizer_new/mvgm_design_agency_quality.html', 'mvgm_quality'),
        ('tmp/stylizer_new/final_verified_output.html', 'final_verified'),
        ('tmp/brand_extraction_proof/PROOF_styled_output.html', 'brand_proof'),
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for html_path, name in html_files:
            full_path = os.path.abspath(html_path)
            if not os.path.exists(full_path):
                print(f"\n[SKIP] {html_path} - not found")
                continue

            print(f"\n[RENDER] {html_path}")

            # Create page with viewport
            page = browser.new_page(viewport={'width': 1400, 'height': 900})

            # Load the HTML file
            page.goto(f'file:///{full_path.replace(os.sep, "/")}')
            page.wait_for_timeout(2000)

            # Take viewport screenshot
            page.screenshot(path=f'tmp/QUALITY_{name}_viewport.png')
            print(f"   Viewport: tmp/QUALITY_{name}_viewport.png")

            # Take full page screenshot
            page.screenshot(path=f'tmp/QUALITY_{name}_full.png', full_page=True)
            print(f"   Full page: tmp/QUALITY_{name}_full.png")

            # Analyze the page content
            body_text = page.locator('body').inner_text()
            print(f"   Content length: {len(body_text)} chars")

            # Check for key elements
            hero = page.locator('.hero, [class*="hero"]').count()
            sections = page.locator('section').count()
            images = page.locator('img').count()
            cards = page.locator('[class*="card"]').count()

            print(f"   Hero sections: {hero}")
            print(f"   Total sections: {sections}")
            print(f"   Images: {images}")
            print(f"   Card components: {cards}")

            page.close()

        browser.close()

    print("\n" + "="*80)
    print("QUALITY SCREENSHOTS GENERATED")
    print("="*80)
    print("\nReview these screenshots to assess design quality:")
    print("  - tmp/QUALITY_mvgm_quality_viewport.png")
    print("  - tmp/QUALITY_mvgm_quality_full.png")
    print("  - tmp/QUALITY_final_verified_viewport.png")
    print("  - tmp/QUALITY_brand_proof_viewport.png")

if __name__ == "__main__":
    main()
