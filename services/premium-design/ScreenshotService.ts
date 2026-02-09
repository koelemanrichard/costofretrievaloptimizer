// =============================================================================
// ScreenshotService — Captures screenshots of rendered HTML using html2canvas
// =============================================================================

/**
 * Captures a screenshot of rendered HTML+CSS in a hidden iframe.
 * Uses lazy-loaded html2canvas (same pattern as pdfExportService).
 */
export class ScreenshotService {
  private html2canvasModule: typeof import('html2canvas') | null = null;

  /**
   * Lazy-load html2canvas to avoid bundle bloat.
   */
  private async loadHtml2Canvas() {
    if (!this.html2canvasModule) {
      this.html2canvasModule = await import('html2canvas');
    }
    return this.html2canvasModule.default;
  }

  /**
   * Render HTML+CSS in a hidden iframe and capture as base64 JPEG.
   *
   * @param html - The article HTML body content
   * @param css - The CSS stylesheet to apply
   * @returns base64-encoded JPEG string (without data: prefix)
   */
  async captureRenderedOutput(html: string, css: string): Promise<string> {
    const html2canvas = await this.loadHtml2Canvas();

    // Create iframe — visible but clipped so the browser actually renders it.
    // Using left:-9999px can cause zero-dimension bodies in some browsers.
    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;top:0;left:0;width:1200px;height:900px;border:none;' +
      'clip:rect(0,0,0,0);clip-path:inset(50%);overflow:hidden;opacity:0;pointer-events:none;z-index:-1;';
    document.body.appendChild(iframe);

    try {
      // Build full HTML document
      const fullDocument = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1200">
<style>
/* Ensure body has dimensions even if CSS resets everything */
html, body { min-height: 100vh; min-width: 100%; margin: 0; padding: 0; }
${css}
</style>
</head>
<body>${html}</body>
</html>`;

      // Use srcdoc instead of document.write() — never blocked by the browser,
      // triggers a proper load event, and creates a same-origin document.
      iframe.srcdoc = fullDocument;

      // Wait for the iframe load event (srcdoc fires load when parsing is complete)
      await new Promise<void>((resolve) => {
        iframe.addEventListener('load', () => resolve(), { once: true });
        // Fallback timeout for large AI-generated CSS
        setTimeout(resolve, 3000);
      });

      // Access contentDocument AFTER load — with srcdoc the document
      // isn't available until the iframe fires its load event.
      const doc = iframe.contentDocument;
      if (!doc) throw new Error('Failed to access iframe document');

      // Wait for fonts to load (timeout 5s for external fonts like Google Fonts)
      if (doc.fonts && doc.fonts.ready) {
        await Promise.race([
          doc.fonts.ready,
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);
      }

      // Additional paint delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify the body has dimensions before capturing
      const bodyRect = doc.body.getBoundingClientRect();
      if (bodyRect.width === 0 || bodyRect.height === 0) {
        console.warn('[ScreenshotService] Body has zero dimensions, forcing layout');
        // Force a reflow
        doc.body.style.minHeight = '900px';
        doc.body.style.minWidth = '1200px';
        doc.body.offsetHeight; // trigger reflow
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Capture screenshot
      const canvas = await html2canvas(doc.body, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 1200,
        height: Math.min(doc.body.scrollHeight || 900, 6000),
        windowWidth: 1200,
        windowHeight: 900,
        logging: false,
      });

      // Verify canvas has content
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('html2canvas produced a zero-dimension canvas');
      }

      // Convert to base64 JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      // Strip the data:image/jpeg;base64, prefix
      return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    } finally {
      // Clean up iframe
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
  }
}
