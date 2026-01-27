"""
Capture screenshot of the optimized NFIR article
"""
from playwright.sync_api import sync_playwright

def main():
    print("Capturing optimized NFIR article...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1400, 'height': 900})

        page = context.new_page()
        page.goto('file:///D:/www/cost-of-retreival-reducer/tmp/nfir_comparison/04_OPTIMIZED_nfir_article.html')
        page.wait_for_timeout(2000)

        # Viewport
        page.screenshot(path='tmp/nfir_comparison/04_OPTIMIZED_viewport.png')
        print("Saved: tmp/nfir_comparison/04_OPTIMIZED_viewport.png")

        # Full page
        page.screenshot(path='tmp/nfir_comparison/04_OPTIMIZED_full.png', full_page=True)
        print("Saved: tmp/nfir_comparison/04_OPTIMIZED_full.png")

        browser.close()

    print("\nDone!")

if __name__ == "__main__":
    main()
