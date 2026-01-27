"""
VERIFICATION TEST: Article Content Fix (Problem 0)

This test verifies that the ACTUAL article content is rendered (not brief summaries)
and that images are properly displayed in the styled output.

Key checks:
1. Article content appears in output (not brief summaries)
2. Images from content generation are displayed
3. Console logs confirm articleContent is being used
"""

from playwright.sync_api import sync_playwright
import re
import os

EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"
BASE_URL = "http://localhost:3001"

def main():
    print("="*80)
    print("VERIFICATION: Article Content Fix (Problem 0)")
    print("="*80)
    print("\nThis test verifies that:")
    print("  1. ACTUAL article content is rendered (not brief summaries)")
    print("  2. Images from content generation are displayed")
    print("  3. Console logs confirm articleContent is being used")
    print("="*80)

    console_logs = []
    verification_results = {
        "articleContent_passed": False,
        "using_actual_article": False,
        "images_present": False,
        "content_length_check": False,
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})
        page = context.new_page()

        # Capture console logs
        def handle_console(msg):
            text = msg.text
            console_logs.append(text)
            # Check for our key fix indicators
            if "[STYLING PIPELINE]" in text:
                safe_text = text[:120].encode('ascii', 'replace').decode()
                print(f"  [CONSOLE] {safe_text}")
                if "articleContent (ACTUAL ARTICLE)" in text:
                    verification_results["using_actual_article"] = True
                if "hasArticleContent: true" in text:
                    verification_results["articleContent_passed"] = True

        page.on("console", handle_console)

        try:
            # Step 1: Login
            print("\n[STEP 1] Logging in...")
            page.goto(BASE_URL)
            page.wait_for_load_state('networkidle')

            if page.locator('input[type="email"]').is_visible():
                page.fill('input[type="email"]', EMAIL)
                page.fill('input[type="password"]', PASSWORD)
                page.click('button[type="submit"]')
                page.wait_for_timeout(3000)
            print("   DONE")

            # Step 2: Open project with content
            print("\n[STEP 2] Opening 'mvgm vve' project...")
            mvgm_row = page.get_by_role("row", name="mvgm vve")
            mvgm_row.get_by_role("button").nth(1).click()
            page.wait_for_timeout(2000)
            print("   DONE")

            # Step 3: Load map with generated content
            print("\n[STEP 3] Loading map with generated content...")
            load_buttons = page.get_by_role("button", name="Load Map").all()
            if len(load_buttons) >= 2:
                load_buttons[1].click()
                page.wait_for_timeout(3000)
            print("   DONE")

            page.screenshot(path='tmp/verify_01_map_loaded.png')

            # Step 4: Find a topic with generated content (look for Draft checkmark)
            print("\n[STEP 4] Finding topic with generated draft...")

            # Look for rows with draft indicator
            rows = page.locator('tr').all()
            target_row = None
            for row in rows:
                text = row.text_content() or ""
                # Look for VvE related content that has draft
                if "VvE" in text or "Beheer" in text or "Almere" in text:
                    target_row = row
                    safe_text = text[:60].encode('ascii', 'replace').decode()
                    print(f"   Found: {safe_text}...")
                    break

            if target_row:
                target_row.click()
                page.wait_for_timeout(1000)

            page.screenshot(path='tmp/verify_02_topic_selected.png')

            # Step 5: Open Style & Publish modal
            print("\n[STEP 5] Opening Style & Publish modal...")

            # First try View Brief
            view_brief = page.locator('button:has-text("View Brief")').first
            if view_brief.is_visible():
                view_brief.click()
                page.wait_for_timeout(2000)
                print("   Brief modal opened")

            page.screenshot(path='tmp/verify_03_brief_modal.png')

            # Look for Draft tab or Generate Draft
            draft_tab = page.locator('button:has-text("Draft"), [role="tab"]:has-text("Draft")').first
            if draft_tab.is_visible():
                draft_tab.click()
                page.wait_for_timeout(2000)
                print("   Draft tab clicked")

            page.screenshot(path='tmp/verify_04_draft_tab.png')

            # Look for Style & Publish button
            style_btn = page.locator('button:has-text("Style & Publish"), button:has-text("Stylize"), button:has-text("Style")').first
            if style_btn.is_visible():
                style_btn.click()
                page.wait_for_timeout(3000)
                print("   Style & Publish clicked")

            page.screenshot(path='tmp/verify_05_style_modal.png')

            # Step 6: Enter brand URL and generate preview
            print("\n[STEP 6] Configuring brand and generating preview...")

            # Look for URL input
            url_input = page.locator('input[placeholder*="url"], input[placeholder*="URL"], input[type="url"]').first
            if url_input.is_visible():
                url_input.fill("https://mvgm.com")
                page.wait_for_timeout(1000)
                print("   Brand URL entered")

            # Look for Extract/Analyze button
            extract_btn = page.locator('button:has-text("Extract"), button:has-text("Analyze"), button:has-text("Detect")').first
            if extract_btn.is_visible():
                extract_btn.click()
                page.wait_for_timeout(5000)
                print("   Brand extraction started")

            page.screenshot(path='tmp/verify_06_brand_step.png')

            # Click Next/Continue to get to preview
            next_btn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Preview")').first
            for _ in range(3):  # Try clicking Next up to 3 times
                if next_btn.is_visible():
                    next_btn.click()
                    page.wait_for_timeout(2000)
                    next_btn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Preview")').first

            page.screenshot(path='tmp/verify_07_preview_step.png')

            # Step 7: Check for Generate/Preview button and click it
            print("\n[STEP 7] Generating styled preview...")
            generate_btn = page.locator('button:has-text("Generate"), button:has-text("Preview")').first
            if generate_btn.is_visible():
                generate_btn.click()
                page.wait_for_timeout(8000)  # Wait for generation
                print("   Preview generated")

            page.screenshot(path='tmp/verify_08_after_generate.png')

            # Step 8: Analyze the output
            print("\n[STEP 8] Analyzing output...")

            # Get page content
            page_content = page.content()

            # Check for iframe with preview
            iframe = page.frame_locator('iframe').first
            preview_content = ""
            try:
                preview_content = iframe.locator('body').inner_html()
            except:
                pass

            # Check for actual article content indicators
            # Brief summaries are short, actual content is long
            content_sections = page.locator('.ctc-prose, .ctc-section, article').all()
            total_content_length = 0
            for section in content_sections:
                try:
                    text = section.text_content() or ""
                    total_content_length += len(text)
                except:
                    pass

            print(f"   Total content length: {total_content_length} chars")

            # Actual articles are much longer than brief summaries
            if total_content_length > 2000:
                verification_results["content_length_check"] = True
                print("   PASS: Content length suggests actual article (>2000 chars)")
            else:
                print("   WARNING: Content length is short, may be brief summary")

            # Check for images
            images = page.locator('img[src]:not([src=""]), img.ctc-image').all()
            image_count = len(images)
            print(f"   Images found: {image_count}")

            if image_count > 0:
                verification_results["images_present"] = True
                print("   PASS: Images are present in output")

            page.screenshot(path='tmp/verify_09_final_output.png', full_page=True)

            # Step 9: Analyze console logs
            print("\n[STEP 9] Analyzing console logs...")

            styling_logs = [log for log in console_logs if "[STYLING PIPELINE]" in log]
            print(f"   Total STYLING PIPELINE logs: {len(styling_logs)}")

            for log in styling_logs:
                if "articleContent" in log or "usingSource" in log:
                    safe_log = log[:100].encode('ascii', 'replace').decode()
                    print(f"   KEY LOG: {safe_log}")

            # Final verification report
            print("\n" + "="*80)
            print("VERIFICATION RESULTS")
            print("="*80)

            all_passed = True

            print(f"\n1. articleContent passed to renderBlueprint: ", end="")
            if verification_results["articleContent_passed"]:
                print("PASS")
            else:
                print("FAIL - Check console for '[STYLING PIPELINE] Passing articleContent'")
                all_passed = False

            print(f"2. Using ACTUAL ARTICLE content: ", end="")
            if verification_results["using_actual_article"]:
                print("PASS")
            else:
                print("FAIL - Should see 'articleContent (ACTUAL ARTICLE)' in logs")
                all_passed = False

            print(f"3. Content length check (>2000 chars): ", end="")
            if verification_results["content_length_check"]:
                print(f"PASS ({total_content_length} chars)")
            else:
                print(f"FAIL ({total_content_length} chars - too short)")
                all_passed = False

            print(f"4. Images present in output: ", end="")
            if verification_results["images_present"]:
                print(f"PASS ({image_count} images)")
            else:
                print("FAIL - No images found")
                all_passed = False

            print("\n" + "="*80)
            if all_passed:
                print("OVERALL: ALL CHECKS PASSED - FIX VERIFIED!")
            else:
                print("OVERALL: SOME CHECKS FAILED - NEEDS INVESTIGATION")
            print("="*80)

            print(f"\nScreenshots saved to tmp/verify_*.png")

            # Save console logs for analysis
            with open('tmp/verify_console_logs.txt', 'w', encoding='utf-8') as f:
                f.write("\n".join(console_logs))
            print("Console logs saved to tmp/verify_console_logs.txt")

        except Exception as e:
            print(f"\nError: {e}")
            page.screenshot(path='tmp/verify_error.png')
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
