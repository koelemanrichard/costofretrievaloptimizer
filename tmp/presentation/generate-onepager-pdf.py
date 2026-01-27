"""Generate PDF from HTML one-pager using Playwright."""
from playwright.sync_api import sync_playwright
import os

HTML_FILE = os.path.join(os.path.dirname(__file__), 'one-pager.html')
PDF_FILE = os.path.join(os.path.dirname(__file__), 'Holistic-SEO-Workbench-OnePager.pdf')

def main():
    print("Generating PDF from one-pager HTML...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load HTML file
        file_url = f'file:///{HTML_FILE.replace(os.sep, "/")}'
        page.goto(file_url)
        page.wait_for_load_state('networkidle')

        # Generate PDF
        page.pdf(
            path=PDF_FILE,
            format='A4',
            print_background=True,
            margin={'top': '0mm', 'right': '0mm', 'bottom': '0mm', 'left': '0mm'}
        )

        browser.close()

    print(f"✅ PDF created: {PDF_FILE}")

if __name__ == "__main__":
    main()
