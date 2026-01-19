"""
Simple Content Generation Test

Run this while the dev server is running (npm run dev) and content generation is active.
This test monitors for:
1. Pass transition issues (Pass 8 -> 9 hang)
2. Tab switch causing white screen/freeze
3. React state sync issues

Usage:
1. Start your dev server: npm run dev
2. Navigate to the app and start a content generation
3. Run this script: python tests/e2e/run_generation_test.py

The test will:
- Open the app in a browser
- Monitor console logs for pass transitions
- Simulate tab switching
- Report any issues found
"""
import asyncio
import re
import time
from playwright.async_api import async_playwright


async def main():
    print("=" * 60)
    print("Content Generation + Tab Switch Test")
    print("=" * 60)
    print("\nThis test monitors content generation and tab switching.")
    print("Make sure npm run dev is running and you're logged in.\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Track console logs
        console_logs = []
        errors = []
        pass_transitions = []

        def on_console(msg):
            text = msg.text
            console_logs.append(text)

            # Track pass transitions
            if '[runPasses] After Pass' in text:
                pass_transitions.append(text)
                print(f"[PASS TRANSITION] {text}")
            elif '[Pass' in text and 'COMPLETED' in text:
                print(f"[PASS COMPLETE] {text}")
            elif 'Error' in text or 'error' in text:
                if 'ReferenceError' in text or 'TypeError' in text:
                    errors.append(text)
                    print(f"[ERROR] {text}")

        def on_error(error):
            errors.append(str(error))
            print(f"[PAGE ERROR] {error}")

        page.on("console", on_console)
        page.on("pageerror", on_error)

        try:
            print("1. Navigating to http://localhost:5173...")
            await page.goto("http://localhost:5173", wait_until="networkidle", timeout=30000)
            print("   Page loaded successfully!")

            # Check if generation is in progress
            print("\n2. Checking for active generation...")
            await asyncio.sleep(3)

            progress_text = await page.locator('text=/Pass \\d+ of 10/').first.text_content(timeout=5000).catch(lambda: None)
            if progress_text:
                print(f"   Generation in progress: {progress_text}")
            else:
                print("   No active generation detected.")
                print("   Please start a content generation and re-run this test.")

            # Monitor for 30 seconds
            print("\n3. Monitoring for 30 seconds...")
            start_time = time.time()
            last_pass = 0

            while time.time() - start_time < 30:
                # Get current pass from UI
                try:
                    progress_text = await page.locator('text=/Pass \\d+ of 10/').first.text_content(timeout=1000)
                    if progress_text:
                        match = re.search(r'Pass (\d+) of 10', progress_text)
                        if match:
                            current_pass = int(match.group(1))
                            if current_pass != last_pass:
                                print(f"   UI shows: Pass {current_pass}")
                                last_pass = current_pass
                except:
                    pass
                await asyncio.sleep(2)

            # Tab switch test
            print("\n4. Testing tab visibility changes...")

            # Simulate hiding tab
            print("   Simulating tab hidden...")
            await page.evaluate("""
                Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
                document.dispatchEvent(new Event('visibilitychange'));
            """)

            # Wait in "background"
            await asyncio.sleep(5)

            # Simulate showing tab
            print("   Simulating tab visible...")
            await page.evaluate("""
                Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
                document.dispatchEvent(new Event('visibilitychange'));
            """)

            await asyncio.sleep(3)

            # Check page state after tab switch
            print("\n5. Checking page state after tab switch...")

            # Check if page is blank
            body_text = await page.evaluate("document.body.innerText")
            if len(body_text.strip()) < 50:
                print("   WARNING: Page appears blank after tab switch!")
                errors.append("Page blank after tab switch")
            else:
                print("   Page has content after tab switch - OK")

            # Check background color (should be dark, not white)
            bg_color = await page.evaluate("window.getComputedStyle(document.body).backgroundColor")
            if bg_color == "rgb(255, 255, 255)":
                print(f"   WARNING: Background is white - possible CSS issue")
                errors.append("Background is white after tab switch")
            else:
                print(f"   Background color: {bg_color} - OK")

            # Monitor for another 30 seconds after tab switch
            print("\n6. Monitoring for 30 more seconds after tab switch...")
            start_time = time.time()

            while time.time() - start_time < 30:
                try:
                    progress_text = await page.locator('text=/Pass \\d+ of 10/').first.text_content(timeout=1000)
                    if progress_text:
                        match = re.search(r'Pass (\d+) of 10', progress_text)
                        if match:
                            current_pass = int(match.group(1))
                            if current_pass != last_pass:
                                print(f"   UI shows: Pass {current_pass}")
                                last_pass = current_pass
                except:
                    pass
                await asyncio.sleep(2)

            # Summary
            print("\n" + "=" * 60)
            print("TEST SUMMARY")
            print("=" * 60)
            print(f"Total console logs: {len(console_logs)}")
            print(f"Pass transitions detected: {len(pass_transitions)}")
            print(f"Errors detected: {len(errors)}")

            if pass_transitions:
                print("\nPass transitions:")
                for t in pass_transitions:
                    print(f"  {t}")

            if errors:
                print("\nERRORS FOUND:")
                for e in errors[:10]:  # Limit to 10
                    print(f"  {e}")
                print("\nTEST FAILED - errors detected")
            else:
                print("\nTEST PASSED - no critical errors detected")

            # Keep browser open for manual inspection
            print("\nBrowser will stay open for 30 seconds for manual inspection...")
            await asyncio.sleep(30)

        except Exception as e:
            print(f"\nTEST ERROR: {e}")
            import traceback
            traceback.print_exc()

        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
