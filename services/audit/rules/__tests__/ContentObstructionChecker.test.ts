import { describe, it, expect } from 'vitest';
import { ContentObstructionChecker } from '../ContentObstructionChecker';

describe('ContentObstructionChecker', () => {
  const checker = new ContentObstructionChecker();

  // -------------------------------------------------------------------------
  // Rule 118 — Ads before main content
  // -------------------------------------------------------------------------

  it('detects ad elements before main content (rule 118)', () => {
    const html =
      '<div class="ads-container">Ad here</div><main><p>Content starts here with enough text to be substantial.</p></main>';
    const issues = checker.check(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-118' }));
  });

  it('detects share buttons before content', () => {
    const html =
      '<div class="social-share">Share on Twitter</div><article><p>This is the main article content that is substantial enough.</p></article>';
    const issues = checker.check(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-118' }));
  });

  it('detects banner before content', () => {
    const html =
      '<div class="banner">Big banner</div><main><p>Real content begins here after the banner element was shown.</p></main>';
    const issues = checker.check(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-118' }));
  });

  it('detects Google AdSense before content', () => {
    const html =
      '<ins class="adsbygoogle" data-ad-slot="123"></ins><article><p>Article content with substantial text for detection purposes here.</p></article>';
    const issues = checker.check(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-118' }));
  });

  it('detects popup before content', () => {
    const html =
      '<div class="popup">Subscribe now!</div><main><p>The main content of the page begins here with sufficient text.</p></main>';
    const issues = checker.check(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-118' }));
  });

  it('detects cookie consent before content', () => {
    const html =
      '<div class="cookie-consent">We use cookies</div><main><p>Main page content starts here with enough text to test properly.</p></main>';
    const issues = checker.check(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-118' }));
  });

  it('detects sponsored content before main', () => {
    const html =
      '<div class="sponsored">Sponsored link</div><main><p>Actual content begins here for the reader to consume and enjoy.</p></main>';
    const issues = checker.check(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-118' }));
  });

  it('detects data-ad-slot attribute before content', () => {
    const html =
      '<div data-ad-slot="header-ad"></div><article><p>This article contains enough substantial text content for the checker.</p></article>';
    const issues = checker.check(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-118' }));
  });

  it('detects AddThis share widget before content', () => {
    const html =
      '<div class="addthis_inline_share_toolbox"></div><main><p>Content starts here with more than enough text to be detected as substantial.</p></main>';
    const issues = checker.check(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-118' }));
  });

  // -------------------------------------------------------------------------
  // Clean pages — no issues expected
  // -------------------------------------------------------------------------

  it('passes clean page with no obstructions', () => {
    const html =
      '<nav>Navigation</nav><main><p>Clean content starts immediately without any ads or share buttons in between.</p></main>';
    const issues = checker.check(html);
    expect(issues).toHaveLength(0);
  });

  it('ignores ads after main content', () => {
    const html =
      '<main><p>Content is here first and it is substantial enough to detect properly.</p></main><div class="ads-container">Ad</div>';
    const issues = checker.check(html);
    expect(issues).toHaveLength(0);
  });

  it('returns no issues when no main content found', () => {
    const html = '<div>Short</div>';
    const issues = checker.check(html);
    expect(issues).toHaveLength(0);
  });

  it('passes empty string', () => {
    const issues = checker.check('');
    expect(issues).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Issue shape validation
  // -------------------------------------------------------------------------

  it('includes all required fields in the issue', () => {
    const html =
      '<div class="ads-container">Ad</div><main><p>Some substantial content text here for the checker to find.</p></main>';
    const issues = checker.check(html);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      ruleId: 'rule-118',
      severity: 'high',
      title: 'Obstructive elements before main content',
    });
    expect(issues[0].description).toContain('obstructive element');
    expect(issues[0].exampleFix).toBeDefined();
    expect(issues[0].affectedElement).toBeDefined();
  });

  it('reports multiple obstruction types in a single issue', () => {
    const html =
      '<div class="ads-container">Ad</div><div class="share">Share</div><div class="banner">Banner</div>' +
      '<main><p>Main content finally begins here with enough text to be detected as real content.</p></main>';
    const issues = checker.check(html);
    expect(issues).toHaveLength(1);
    expect(issues[0].description).toContain('3');
  });

  // -------------------------------------------------------------------------
  // findMainContentStart
  // -------------------------------------------------------------------------

  describe('findMainContentStart', () => {
    it('finds <main> tag', () => {
      const idx = checker.findMainContentStart(
        '<header>Nav</header><main>Content</main>'
      );
      expect(idx).toBeGreaterThan(0);
    });

    it('finds <article> tag', () => {
      const idx = checker.findMainContentStart(
        '<header>Nav</header><article>Content</article>'
      );
      expect(idx).toBeGreaterThan(0);
    });

    it('falls back to substantial <p>', () => {
      const idx = checker.findMainContentStart(
        '<div>Short</div><p>This is a paragraph with more than fifty characters of substantial text content here.</p>'
      );
      expect(idx).toBeGreaterThan(0);
    });

    it('prefers <main> over <article>', () => {
      const html = '<article>First</article><main>Second</main>';
      const idx = checker.findMainContentStart(html);
      // <article> comes first so it should be found at index 0
      // Actually <main> is preferred in the implementation: it checks <main> first
      // But since <article> appears first in the string and <main> appears later,
      // the regex will find <article> at 0, but the method checks <main> first.
      // Since there IS a <main> tag, it will return <main>'s index.
      const mainIdx = html.indexOf('<main');
      expect(idx).toBe(mainIdx);
    });

    it('returns -1 for content without recognizable main area', () => {
      const idx = checker.findMainContentStart('<div>Short text</div>');
      expect(idx).toBe(-1);
    });

    it('returns -1 for empty string', () => {
      const idx = checker.findMainContentStart('');
      expect(idx).toBe(-1);
    });
  });
});
