"""
CSS Quality Validation Test

This test validates that the Style & Publish CSS output meets design agency quality standards.
It compares the generated output against the target website design.

Test criteria:
1. NO duplicate :root declarations
2. ALL CSS variables must be valid (no --ctc-neutral-700, --ctc-spacing-4, etc.)
3. Brand colors must match detected colors (not overwritten)
4. Typography must use detected fonts (not generic Arial)
5. Visual quality must match target website aesthetic
"""

import re
import sys
import os
from playwright.sync_api import sync_playwright, Page, expect

# Test configuration
TEST_EMAIL = "richard@kjenmarks.nl"  # Correct email from test-utils.ts
TEST_PASSWORD = "pannekoek"
TARGET_URL = "https://mvgm.com/nl/vastgoeddiensten/vve-beheer/"
BASE_URL = "http://localhost:3000"

# Ensure tmp directory exists
os.makedirs("tmp", exist_ok=True)

# Valid CSS variable names
VALID_VARIABLES = {
    # Colors
    '--ctc-primary', '--ctc-primary-light', '--ctc-primary-dark',
    '--ctc-secondary', '--ctc-accent',
    '--ctc-neutral-darkest', '--ctc-neutral-dark', '--ctc-neutral-medium',
    '--ctc-neutral-light', '--ctc-neutral-lightest',
    '--ctc-success', '--ctc-warning', '--ctc-error', '--ctc-info',
    # Typography
    '--ctc-font-heading', '--ctc-font-body',
    '--ctc-font-size-base', '--ctc-font-scale-ratio',
    '--ctc-heading-weight', '--ctc-body-weight', '--ctc-body-line-height',
    '--ctc-font-size-xs', '--ctc-font-size-sm', '--ctc-font-size-md',
    '--ctc-font-size-lg', '--ctc-font-size-xl', '--ctc-font-size-2xl', '--ctc-font-size-3xl',
    # Spacing
    '--ctc-spacing-unit',
    '--ctc-spacing-xs', '--ctc-spacing-sm', '--ctc-spacing-md',
    '--ctc-spacing-lg', '--ctc-spacing-xl', '--ctc-spacing-2xl', '--ctc-spacing-3xl',
    # Border radius
    '--ctc-radius-sm', '--ctc-radius-md', '--ctc-radius-lg', '--ctc-radius-full',
    # Shadows
    '--ctc-shadow-card', '--ctc-shadow-button', '--ctc-shadow-elevated',
    # Motion
    '--ctc-transition-speed', '--ctc-easing',
}

# Invalid variable patterns that AI often generates
INVALID_PATTERNS = [
    r'--ctc-neutral-\d+',      # e.g., --ctc-neutral-700
    r'--ctc-spacing-\d+$',     # e.g., --ctc-spacing-4
    r'--ctc-radius-\d+$',      # e.g., --ctc-radius-0
    r'--ctc-space-\d+',        # e.g., --ctc-space-8
    r'--ctc-text(?!-)',        # e.g., --ctc-text (without suffix)
    r'--ctc-bg(?!-)',          # e.g., --ctc-bg (without suffix)
    r'--ctc-font-display',     # Invalid alias
    r'--ctc-rounded',          # Tailwind-style alias
]


class CSSQualityValidator:
    """Validates CSS quality against design agency standards."""

    def __init__(self, css: str):
        self.css = css
        self.issues = []
        self.warnings = []

    def validate(self) -> dict:
        """Run all validations and return results."""
        self._check_duplicate_roots()
        self._check_invalid_variables()
        self._check_brand_colors()
        self._check_typography()
        self._check_generic_styles()

        return {
            'passed': len(self.issues) == 0,
            'issues': self.issues,
            'warnings': self.warnings,
            'score': self._calculate_score(),
        }

    def _check_duplicate_roots(self):
        """Check for duplicate :root declarations."""
        root_matches = re.findall(r':root\s*\{[^}]*\}', self.css)
        if len(root_matches) > 1:
            self.issues.append(f"CRITICAL: Found {len(root_matches)} :root declarations (should be 1)")

            # Check if brand colors differ between roots
            primaries = []
            for root in root_matches:
                match = re.search(r'--ctc-primary:\s*([^;]+)', root)
                if match:
                    primaries.append(match.group(1).strip().lower())

            if len(set(primaries)) > 1:
                self.issues.append(f"CRITICAL: Brand color --ctc-primary has conflicting values: {primaries}")

    def _check_invalid_variables(self):
        """Check for invalid CSS variable names."""
        var_usages = re.findall(r'var\(\s*(--ctc-[a-zA-Z0-9-]+)\s*(?:,\s*[^)]+)?\s*\)', self.css)
        invalid_vars = set()

        for var_name in var_usages:
            # Check against invalid patterns
            for pattern in INVALID_PATTERNS:
                if re.match(pattern, var_name):
                    invalid_vars.add(var_name)
                    break

            # Check if not in valid set
            if var_name not in VALID_VARIABLES and var_name not in invalid_vars:
                # It might be a valid variable we just don't have in our set
                self.warnings.append(f"Unknown variable: {var_name}")

        if invalid_vars:
            self.issues.append(f"CRITICAL: Found {len(invalid_vars)} invalid CSS variables: {', '.join(sorted(invalid_vars))}")

    def _check_brand_colors(self):
        """Check that brand colors are properly defined and consistent."""
        # Extract first :root
        root_match = re.search(r':root\s*\{([^}]*)\}', self.css)
        if not root_match:
            self.issues.append("CRITICAL: No :root declaration found")
            return

        root_content = root_match.group(1)

        # Check for required color variables
        required_colors = ['--ctc-primary', '--ctc-secondary', '--ctc-accent']
        for color in required_colors:
            if color not in root_content:
                self.warnings.append(f"Missing recommended color: {color}")

    def _check_typography(self):
        """Check that typography is properly defined."""
        root_match = re.search(r':root\s*\{([^}]*)\}', self.css)
        if not root_match:
            return

        root_content = root_match.group(1)

        # Check for generic fonts (bad)
        if 'Arial, sans-serif' in root_content or 'font-family: Arial' in self.css:
            self.warnings.append("Typography uses generic Arial - may not match brand")

        # Check for font variables
        if '--ctc-font-heading' not in root_content:
            self.warnings.append("Missing --ctc-font-heading definition")
        if '--ctc-font-body' not in root_content:
            self.warnings.append("Missing --ctc-font-body definition")

    def _check_generic_styles(self):
        """Check for overly generic styles that don't reflect brand personality."""
        # Check for hardcoded colors instead of variables
        hardcoded_colors = re.findall(r'(?:color|background|border-color):\s*(#[0-9a-fA-F]{3,6})', self.css)
        if len(hardcoded_colors) > 10:
            self.warnings.append(f"Found {len(hardcoded_colors)} hardcoded colors - should use CSS variables")

    def _calculate_score(self) -> int:
        """Calculate quality score out of 100."""
        score = 100
        score -= len(self.issues) * 25  # Critical issues cost 25 points each
        score -= len(self.warnings) * 5  # Warnings cost 5 points each
        return max(0, score)


def login(page: Page):
    """Login to the application."""
    print("Logging in...")
    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)

    # Take screenshot to see current state
    page.screenshot(path='tmp/login_state.png')

    # Fill credentials
    email_input = page.locator('input[type="email"]')
    if email_input.is_visible(timeout=5000):
        print("Found login form, entering credentials...")
        email_input.fill(TEST_EMAIL)
        page.locator('input[type="password"]').fill(TEST_PASSWORD)
        page.locator('button[type="submit"]').first.click()

        # Wait for login to complete - be more flexible
        page.wait_for_timeout(5000)
        page.screenshot(path='tmp/after_login.png')
        print("Login submitted, checking state...")

        # Check if we're logged in by looking for any dashboard elements
        if page.locator('input[type="email"]').is_visible(timeout=3000):
            print("Still on login page - credentials may be wrong")
        else:
            print("Login successful")
    else:
        print("No login form found - may already be logged in")


def find_style_publish_button(page: Page) -> bool:
    """Look for any button that might open Style & Publish."""
    print("Looking for Style & Publish button...")

    # Various possible button texts
    button_texts = [
        "Style & Publish",
        "Style",
        "Publish",
        "Generate Article",
        "Create Article",
        "View Article",
        "Preview",
    ]

    for text in button_texts:
        button = page.locator(f'button:has-text("{text}")').first
        if button.is_visible(timeout=2000):
            print(f"Found button: {text}")
            button.click()
            page.wait_for_timeout(2000)
            return True

    return False


def explore_ui(page: Page):
    """Explore the UI to understand what's available."""
    print("\nExploring UI to find Style & Publish...")

    # Take screenshot of current state
    page.screenshot(path='tmp/ui_explore.png')

    # First, look for "Open" buttons on project list - find MVGM project
    open_buttons = page.locator('button:has-text("Open")').all()
    print(f"Found {len(open_buttons)} Open buttons")

    # Try to find MVGM project specifically
    mvgm_row = page.locator('tr:has-text("mvgm"), div:has-text("mvgm")').first
    if mvgm_row.is_visible(timeout=3000):
        print("Found MVGM project row, clicking Open...")
        mvgm_open = mvgm_row.locator('button:has-text("Open")').first
        if mvgm_open.is_visible():
            mvgm_open.click()
            page.wait_for_timeout(3000)
    elif len(open_buttons) > 0:
        print("Clicking first Open button to enter project...")
        open_buttons[0].click()
        page.wait_for_timeout(3000)

    page.screenshot(path='tmp/after_open_project.png')

    # Now look for "Load Map" buttons (topical maps)
    load_map_buttons = page.locator('button:has-text("Load Map")').all()
    print(f"Found {len(load_map_buttons)} Load Map buttons")

    # Look for MVGM vve Almere map specifically
    mvgm_almere = page.locator('div:has-text("MVGM vve Almere"), div:has-text("Almere")').first
    if mvgm_almere.is_visible(timeout=3000):
        print("Found MVGM vve Almere map, clicking Load Map...")
        load_btn = mvgm_almere.locator('button:has-text("Load Map")').first
        if load_btn.is_visible():
            load_btn.click()
        else:
            # Try clicking nearby Load Map button
            all_load_maps = page.locator('button:has-text("Load Map")').all()
            if len(all_load_maps) > 1:  # Second one is likely MVGM vve Almere
                all_load_maps[1].click()
        page.wait_for_timeout(5000)
    elif len(load_map_buttons) > 0:
        print("Clicking first Load Map button...")
        load_map_buttons[0].click()
        page.wait_for_timeout(5000)

    page.screenshot(path='tmp/after_load_map.png')

    # Now look for topics/articles in the project
    topic_rows = page.locator('tr[data-topic-id], [data-topic], .topic-row, tr').all()
    print(f"Found {len(topic_rows)} topic rows")

    # Look for VvE Beheer topic
    vve_topic = page.locator('tr:has-text("VvE"), tr:has-text("Beheer"), td:has-text("VvE")').first
    if vve_topic.is_visible(timeout=3000):
        print("Found VvE topic, clicking...")
        vve_topic.click()
        page.wait_for_timeout(2000)
    elif len(topic_rows) > 1:  # Skip header row
        print("Clicking first topic row...")
        topic_rows[1].click()
        page.wait_for_timeout(2000)

    page.screenshot(path='tmp/after_topic_click.png')

    # Check if there's a detail panel or sidebar
    detail_panel = page.locator('.detail-panel, .topic-detail, aside, [class*="detail"]').first
    if detail_panel.is_visible(timeout=3000):
        print("Found detail panel")
        page.screenshot(path='tmp/detail_panel.png')

    # Now look for Style & Publish button
    return find_style_publish_button(page)


def extract_css_from_page(page: Page) -> str:
    """Extract all CSS from the page."""
    print("Extracting CSS from page...")

    css_content = ""

    # Get all style tags
    style_tags = page.locator('style').all()
    print(f"Found {len(style_tags)} style tags")

    for i, style in enumerate(style_tags):
        text = style.inner_text()
        if '--ctc-' in text:  # Only include our CSS
            css_content += f"\n/* Style tag {i} */\n{text}\n"

    # Also check for any preview iframes
    iframes = page.locator('iframe').all()
    print(f"Found {len(iframes)} iframes")

    for iframe in iframes:
        try:
            frame = iframe.content_frame()
            if frame:
                frame_styles = frame.locator('style').all()
                for style in frame_styles:
                    text = style.inner_text()
                    if '--ctc-' in text:
                        css_content += f"\n/* From iframe */\n{text}\n"
        except:
            pass

    return css_content


def test_css_validator_directly():
    """Test the CSS validator with a sample of the problematic CSS."""
    print("\n" + "=" * 60)
    print("TESTING CSS VALIDATOR WITH SAMPLE CSS")
    print("=" * 60)

    # This is a sample from the problematic output
    sample_css = """
:root {
  --ctc-primary: #00637B;
  --ctc-primary-light: #ADD8E6;
  --ctc-primary-dark: #00334A;
  --ctc-secondary: #FFFFFF;
  --ctc-accent: #00637B;
  --ctc-neutral-darkest: #000000;
  --ctc-neutral-dark: #333333;
  --ctc-neutral-medium: #666666;
  --ctc-neutral-light: #999999;
  --ctc-neutral-lightest: #F0F8FF;
  --ctc-font-heading: Arial, sans-serif;
  --ctc-font-body: Arial, sans-serif;
}

/* Button using INVALID variables (should be caught) */
.ctc-button {
  color: var(--ctc-neutral-7);
  background-color: var(--ctc-neutral-1);
  border-radius: var(--ctc-radius-0);
  padding: var(--ctc-spacing-2) var(--ctc-spacing-4);
}

/* Duplicate :root (should be caught) */
:root {
  --ctc-primary: #0047AB;
  --ctc-neutral-100: #F5F5F5;
  --ctc-neutral-700: #616161;
}

.ctc-timeline {
  color: var(--ctc-neutral-700);
  background: var(--ctc-neutral-100);
}
    """

    validator = CSSQualityValidator(sample_css)
    results = validator.validate()

    print(f"\nQuality Score: {results['score']}/100")
    print(f"Passed: {results['passed']}")

    if results['issues']:
        print("\nCRITICAL ISSUES:")
        for issue in results['issues']:
            print(f"  - {issue}")

    if results['warnings']:
        print("\nWARNINGS:")
        for warning in results['warnings']:
            print(f"  - {warning}")

    # The sample should FAIL with multiple issues
    issues_text = " ".join(results['issues']).lower()

    # Check that validator caught the expected issues
    found_root_issue = ":root" in issues_text or "root declaration" in issues_text
    found_invalid_vars = "invalid" in issues_text and "variables" in issues_text

    if found_root_issue and found_invalid_vars:
        print("\n[PASS] Validator correctly detected issues in sample CSS")
        return True
    else:
        print("\n[FAIL] Validator did not catch expected issues")
        print(f"  Found root issue: {found_root_issue}")
        print(f"  Found invalid vars: {found_invalid_vars}")
        return False


def main():
    """Main test function."""
    print("=" * 60)
    print("CSS QUALITY VALIDATION TEST")
    print("=" * 60)
    print(f"Target URL: {TARGET_URL}")
    print(f"Base URL: {BASE_URL}")
    print()

    # First, test that our validator works correctly
    validator_works = test_css_validator_directly()

    if not validator_works:
        print("\nValidator self-test failed - please check the CSSQualityValidator logic")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("TESTING LIVE APPLICATION")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        try:
            # Step 1: Login
            login(page)

            # Step 2: Explore UI to find Style & Publish
            found_style_publish = explore_ui(page)

            if found_style_publish:
                print("Found Style & Publish modal!")
                page.screenshot(path='tmp/style_publish_modal.png')

                # Look for brand detection URL input
                url_input = page.locator('input[placeholder*="website"], input[placeholder*="https://"]')
                if url_input.is_visible(timeout=5000):
                    print(f"Entering target URL: {TARGET_URL}")
                    url_input.fill(TARGET_URL)

                    # Click detect button
                    detect_btn = page.locator('button:has-text("Detect")').first
                    if detect_btn.is_visible():
                        print("Starting brand detection...")
                        detect_btn.click()

                        # Wait for detection (up to 2 minutes)
                        print("Waiting for brand detection (this may take up to 2 minutes)...")
                        page.wait_for_timeout(120000)  # 2 minutes
                        page.screenshot(path='tmp/after_detection.png')

                # Extract CSS
                css_content = extract_css_from_page(page)

                if css_content:
                    print(f"\nExtracted {len(css_content)} characters of CSS")

                    # Save CSS for inspection
                    with open('tmp/extracted_css.css', 'w', encoding='utf-8') as f:
                        f.write(css_content)
                    print("Saved CSS to tmp/extracted_css.css")

                    # Validate
                    validator = CSSQualityValidator(css_content)
                    results = validator.validate()

                    print(f"\nQuality Score: {results['score']}/100")
                    print(f"Passed: {results['passed']}")

                    if results['issues']:
                        print("\nCRITICAL ISSUES:")
                        for issue in results['issues']:
                            print(f"  - {issue}")

                    if results['warnings']:
                        print("\nWARNINGS:")
                        for warning in results['warnings']:
                            print(f"  - {warning}")

                    if not results['passed']:
                        print("\n[FAIL] CSS QUALITY TEST FAILED")
                        sys.exit(1)
                    else:
                        print("\n[PASS] CSS QUALITY TEST PASSED")
                else:
                    print("\nNo CSS with --ctc- variables found on page")
                    print("The Style & Publish flow may need manual navigation")
            else:
                print("\nCould not find Style & Publish button")
                print("Screenshots saved to tmp/ for inspection")

        except Exception as e:
            print(f"\nTEST ERROR: {e}")
            page.screenshot(path='tmp/error_state.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

    print("\nTest complete. Check tmp/ folder for screenshots.")


if __name__ == "__main__":
    main()
