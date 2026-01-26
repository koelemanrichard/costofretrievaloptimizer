import { describe, it, expect } from 'vitest';
import { ExtractionAnalyzer } from '../ExtractionAnalyzer';

describe('ExtractionAnalyzer', () => {
  describe('analyze', () => {
    it('extracts components with literal HTML and CSS', async () => {
      const analyzer = new ExtractionAnalyzer({
        provider: 'gemini',
        apiKey: process.env.VITE_GEMINI_API_KEY || 'test-key'
      });

      const result = await analyzer.analyze({
        screenshotBase64: 'data:image/png;base64,iVBORw0KGgo=',
        rawHtml: '<html><head><style>.hero{background:blue;padding:40px;}</style></head><body><section class="hero"><h1>Welcome</h1></section></body></html>'
      });

      expect(result.components.length).toBeGreaterThan(0);
      expect(result.components[0].literalHtml).toBeTruthy();
      expect(result.components[0].literalCss).toBeTruthy();
    }, 60000);

    it('does NOT include abstraction fields', async () => {
      const analyzer = new ExtractionAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const result = await analyzer.analyze({
        screenshotBase64: 'data:image/png;base64,test',
        rawHtml: '<html><body><div class="card">Content</div></body></html>'
      });

      const componentJson = JSON.stringify(result.components[0] || {});
      expect(componentJson).not.toContain('"variant"');
      expect(componentJson).not.toContain('"style":');
      expect(componentJson).not.toContain('"theme"');
    }, 60000);
  });
});
