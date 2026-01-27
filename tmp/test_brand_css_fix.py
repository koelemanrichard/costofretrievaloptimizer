"""
Test that brand CSS is applied correctly without inline styles overriding it.
Uses "Totaal VvE Beheer Almere" as the brand.
"""
from playwright.sync_api import sync_playwright
import time
import re

def test_brand_css_fix():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})

        print("1. Navigating to app...")
        page.goto('http://localhost:3001')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        page.screenshot(path='tmp/css_fix_01_initial.png')
        print("   Screenshot: tmp/css_fix_01_initial.png")

        # Login
        print("2. Logging in...")
        page.fill('input[type="email"]', 'info@vfrfrfr.nl')
        page.fill('input[type="password"]', 'frdkFRDK@#21frdkFRDK@#21')
        page.screenshot(path='tmp/css_fix_02_filled.png')

        # Click the sign in button and wait for navigation
        page.click('button:has-text("Sign In")')
        print("   Clicked Sign In button")

        # Wait for the page to change (login to complete)
        try:
            page.wait_for_url('**/projects**', timeout=10000)
            print("   Login successful - redirected to projects")
        except:
            # Maybe it stays on same URL but content changes
            page.wait_for_timeout(5000)
            print("   Waited for login response")

        page.screenshot(path='tmp/css_fix_03_after_login.png')
        print("   Screenshot: tmp/css_fix_03_after_login.png")

        # Check if we're logged in by looking for user indicator or projects
        page_content = page.content()
        if 'Sign in' in page_content and 'Email Address' in page_content:
            print("   WARNING: Still on login page!")
            # Try clicking again
            page.click('button:has-text("Sign In")')
            page.wait_for_timeout(5000)
            page.screenshot(path='tmp/css_fix_03b_retry.png')

        # Now look for project list
        print("3. Looking for projects...")
        page.wait_for_timeout(2000)

        # Debug: print all visible buttons and clickable elements
        buttons = page.locator('button').all()
        print(f"   Found {len(buttons)} buttons:")
        for btn in buttons[:5]:
            try:
                text = btn.inner_text()[:30]
                print(f"      - {text}")
            except:
                pass

        # Look for any card-like containers
        cards = page.locator('[class*="rounded"], [class*="shadow"], [class*="card"]').all()
        print(f"   Found {len(cards)} card-like elements")

        page.screenshot(path='tmp/css_fix_04_projects.png', full_page=True)
        print("   Screenshot: tmp/css_fix_04_projects.png")

        # Try to click on the first project - look for VvE or any project name
        print("4. Clicking on first project...")
        try:
            # Try clicking on a heading that might be a project name
            project = page.locator('h2, h3, h4').first
            project_text = project.inner_text()
            print(f"   Found potential project: {project_text}")
            project.click()
            page.wait_for_timeout(2000)
        except Exception as e:
            print(f"   Could not click project heading: {e}")
            # Try any clickable card
            try:
                page.locator('[class*="hover"], [class*="cursor"]').first.click()
                page.wait_for_timeout(2000)
            except:
                pass

        page.screenshot(path='tmp/css_fix_05_project_clicked.png')
        print("   Screenshot: tmp/css_fix_05_project_clicked.png")

        # Look for maps
        print("5. Looking for maps...")
        page.wait_for_timeout(1500)

        # Try to find map items
        try:
            map_heading = page.locator('h3, h4, [class*="map"]').first
            map_text = map_heading.inner_text()
            print(f"   Found potential map: {map_text}")
            map_heading.click()
            page.wait_for_timeout(2000)
        except Exception as e:
            print(f"   Could not click map: {e}")

        page.screenshot(path='tmp/css_fix_06_map.png')
        print("   Screenshot: tmp/css_fix_06_map.png")

        # Look for topics (graph nodes or list items)
        print("6. Looking for topics...")
        page.wait_for_timeout(1500)

        # Try SVG elements (graph nodes)
        try:
            svg_element = page.locator('svg g[class*="node"], svg circle, svg text').first
            svg_element.click()
            page.wait_for_timeout(1500)
            print("   Clicked graph node")
        except:
            # Try list items
            try:
                page.locator('li[class*="topic"], [class*="topic"]').first.click()
                page.wait_for_timeout(1500)
                print("   Clicked topic list item")
            except:
                print("   No topics found to click")

        page.screenshot(path='tmp/css_fix_07_topic.png')
        print("   Screenshot: tmp/css_fix_07_topic.png")

        # Look for publish menu
        print("7. Looking for Style & Publish...")

        # First look for any dropdown or menu that says Publish
        try:
            # Try direct text match
            if page.locator('text=Style & Publish').is_visible(timeout=2000):
                page.click('text=Style & Publish')
                print("   Clicked Style & Publish directly")
            else:
                # Look for publish button/dropdown
                publish = page.locator('button:has-text("Publish"), [class*="publish"]').first
                publish.click()
                page.wait_for_timeout(500)
                # Now look for Style & Publish in menu
                page.click('text=Style & Publish')
                print("   Clicked Style & Publish from menu")
            page.wait_for_timeout(2000)
        except Exception as e:
            print(f"   Could not find Style & Publish: {e}")

        page.screenshot(path='tmp/css_fix_08_modal.png')
        print("   Screenshot: tmp/css_fix_08_modal.png")

        # At this point we should have the Style & Publish modal open
        # Look for brand URL input
        print("8. Looking for brand URL input...")

        inputs = page.locator('input').all()
        print(f"   Found {len(inputs)} inputs")
        for inp in inputs:
            try:
                placeholder = inp.get_attribute('placeholder') or ''
                input_type = inp.get_attribute('type') or ''
                print(f"      - type={input_type} placeholder={placeholder[:30]}")
            except:
                pass

        # Try to find URL input and fill it
        try:
            url_input = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="website" i]').first
            url_input.fill('https://www.totaalvvebeheeralmere.nl')
            print("   Filled brand URL")
        except:
            print("   Could not find URL input")

        page.screenshot(path='tmp/css_fix_09_url_entered.png')
        print("   Screenshot: tmp/css_fix_09_url_entered.png")

        # Click extract button
        print("9. Looking for extract button...")
        try:
            extract = page.locator('button:has-text("Extract"), button:has-text("Fetch"), button:has-text("Analyze")').first
            extract.click()
            print("   Clicked extract button")
            page.wait_for_timeout(15000)  # Wait for extraction
        except:
            print("   Could not find extract button")

        page.screenshot(path='tmp/css_fix_10_extracting.png')
        print("   Screenshot: tmp/css_fix_10_extracting.png")

        # Navigate through wizard
        print("10. Navigating wizard steps...")
        for step in range(6):
            page.screenshot(path=f'tmp/css_fix_11_step_{step}.png')

            # Look for Next/Continue buttons
            try:
                next_btn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Generate Preview"), button:has-text("Preview")').first
                if next_btn.is_visible() and next_btn.is_enabled():
                    next_btn.click()
                    print(f"   Step {step}: clicked next")
                    page.wait_for_timeout(3000)
                else:
                    print(f"   Step {step}: no more next buttons")
                    break
            except:
                print(f"   Step {step}: exception finding next button")
                break

        page.screenshot(path='tmp/css_fix_12_final.png', full_page=True)
        print("   Screenshot: tmp/css_fix_12_final.png")

        # Now analyze the output
        print("\n11. Analyzing generated output...")

        # Look for preview iframe
        iframes = page.locator('iframe').all()
        print(f"   Found {len(iframes)} iframes")

        html_to_analyze = None

        for i, iframe in enumerate(iframes):
            try:
                frame = page.frame_locator('iframe').nth(i)
                body_html = frame.locator('body').inner_html()
                if body_html and len(body_html) > 100:
                    html_to_analyze = body_html
                    print(f"   Got HTML from iframe {i} ({len(body_html)} chars)")
                    break
            except Exception as e:
                print(f"   Could not access iframe {i}: {e}")

        if not html_to_analyze:
            # Try preview container
            preview = page.locator('[class*="preview"], [class*="output"]').all()
            for p in preview:
                try:
                    html = p.inner_html()
                    if 'ctc-' in html:
                        html_to_analyze = html
                        print(f"   Got HTML from preview container ({len(html)} chars)")
                        break
                except:
                    continue

        if html_to_analyze:
            # Save HTML
            with open('tmp/css_fix_output.html', 'w', encoding='utf-8') as f:
                f.write(html_to_analyze)
            print("   Saved to tmp/css_fix_output.html")

            # Analyze for inline styles
            print("\n12. Checking for inline styles on CTC elements...")

            # Find elements with BOTH ctc- class AND style attribute containing layout properties
            problematic = re.findall(
                r'<(header|section|div|article)[^>]*class="[^"]*ctc-[^"]*"[^>]*style="[^"]*(background|padding|margin)[^"]*"',
                html_to_analyze, re.IGNORECASE
            )

            if problematic:
                print(f"   WARNING: Found {len(problematic)} elements with inline styles!")
                full_matches = re.findall(
                    r'(<(?:header|section)[^>]*class="[^"]*ctc-[^"]*"[^>]*style="[^"]*"[^>]*>)',
                    html_to_analyze, re.IGNORECASE
                )
                for m in full_matches[:3]:
                    print(f"   {m[:200]}...")
            else:
                print("   SUCCESS: No problematic inline styles found on CTC elements!")

            # Count CTC classes
            classes = set()
            for match in re.findall(r'class="([^"]*)"', html_to_analyze):
                for cls in match.split():
                    if cls.startswith('ctc-'):
                        classes.add(cls)

            print(f"\n   Found {len(classes)} unique CTC classes:")
            for cls in sorted(classes)[:25]:
                print(f"      {cls}")

            # Check hero specifically
            hero_match = re.search(r'<header[^>]*class="([^"]*ctc-hero[^"]*)"', html_to_analyze)
            if hero_match:
                hero_classes = hero_match.group(1)
                has_inline = re.search(r'<header[^>]*class="[^"]*ctc-hero[^"]*"[^>]*style=', html_to_analyze)
                print(f"\n   Hero classes: {hero_classes}")
                print(f"   Hero has inline style: {bool(has_inline)}")

        else:
            print("   Could not find generated HTML")
            with open('tmp/css_fix_page.html', 'w', encoding='utf-8') as f:
                f.write(page.content())
            print("   Saved full page to tmp/css_fix_page.html")

        print("\n13. Test complete!")
        browser.close()

if __name__ == '__main__':
    test_brand_css_fix()
