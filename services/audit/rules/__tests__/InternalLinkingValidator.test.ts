import { describe, it, expect } from 'vitest';
import { InternalLinkingValidator } from '../InternalLinkingValidator';

const PAGE_URL = 'https://example.com/page';

/**
 * Builds a minimal HTML article with the given internal links embedded
 * in surrounding paragraph text.
 */
function buildHtml(
  links: { href: string; anchor: string }[],
  options?: { wrapInArticle?: boolean; extraWords?: number }
): string {
  const wrap = options?.wrapInArticle ?? true;
  const extraWords = options?.extraWords ?? 0;
  const padding = extraWords > 0 ? ' ' + Array(extraWords).fill('lorem').join(' ') : '';
  const body = links
    .map(l => `<p>This is contextual surrounding text about <a href="${l.href}">${l.anchor}</a> within a sentence.${padding}</p>`)
    .join('\n');
  return wrap ? `<article>${body}</article>` : body;
}

describe('InternalLinkingValidator', () => {
  const validator = new InternalLinkingValidator();

  // -------------------------------------------------------------------------
  // Rule 162 — Generic anchor text
  // -------------------------------------------------------------------------

  it('detects generic anchor text (rule 162)', () => {
    const html = buildHtml([
      { href: '/about', anchor: 'click here' },
      { href: '/services', anchor: 'read more' },
      { href: '/blog', anchor: 'learn more' },
      { href: '/contact', anchor: 'here' },
    ]);
    const issues = validator.validate({ html, pageUrl: PAGE_URL });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-162' }));
  });

  it('does not flag descriptive anchor text (rule 162 negative)', () => {
    const html = buildHtml([
      { href: '/seo-guide', anchor: 'comprehensive SEO guide' },
      { href: '/link-building', anchor: 'link building strategies' },
      { href: '/content-tips', anchor: 'content optimization tips' },
      { href: '/analytics', anchor: 'analytics dashboard' },
    ]);
    const issues = validator.validate({ html, pageUrl: PAGE_URL });
    expect(issues.find(i => i.ruleId === 'rule-162')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 163 — Anchor text too short
  // -------------------------------------------------------------------------

  it('detects single-word anchor text when prevalent (rule 163)', () => {
    const html = buildHtml([
      { href: '/a', anchor: 'SEO' },
      { href: '/b', anchor: 'links' },
      { href: '/c', anchor: 'content' },
      { href: '/d', anchor: 'strategy' },
      { href: '/e', anchor: 'proper multi-word anchor' },
    ]);
    const issues = validator.validate({ html, pageUrl: PAGE_URL });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-163' }));
  });

  // -------------------------------------------------------------------------
  // Rule 164 — Anchor text too long
  // -------------------------------------------------------------------------

  it('detects overly long anchor text (rule 164)', () => {
    const html = buildHtml([
      { href: '/long', anchor: 'this is an extremely long anchor text that contains way too many words for good practice' },
      { href: '/ok', anchor: 'normal anchor text' },
    ]);
    const issues = validator.validate({ html, pageUrl: PAGE_URL });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-164' }));
  });

  // -------------------------------------------------------------------------
  // Rule 165 — Duplicate anchor text for different URLs
  // -------------------------------------------------------------------------

  it('detects same anchor text pointing to different URLs (rule 165)', () => {
    const html = buildHtml([
      { href: '/page-a', anchor: 'best practices' },
      { href: '/page-b', anchor: 'best practices' },
      { href: '/page-c', anchor: 'unique anchor' },
      { href: '/page-d', anchor: 'another unique one' },
    ]);
    const issues = validator.validate({ html, pageUrl: PAGE_URL });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-165' }));
  });

  it('allows same anchor text pointing to same URL (rule 165 negative)', () => {
    const html = buildHtml([
      { href: '/page-a', anchor: 'best practices' },
      { href: '/page-a', anchor: 'best practices' },
      { href: '/page-b', anchor: 'unique anchor text' },
      { href: '/page-c', anchor: 'another unique one' },
    ]);
    const issues = validator.validate({ html, pageUrl: PAGE_URL });
    expect(issues.find(i => i.ruleId === 'rule-165')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 169 — Link placement outside main content
  // -------------------------------------------------------------------------

  it('detects most links outside main content (rule 169)', () => {
    // Links in nav/footer only, no <article>/<main> wrapper
    const html = `
      <nav>
        <a href="/a">Nav link one</a>
        <a href="/b">Nav link two</a>
        <a href="/c">Nav link three</a>
        <a href="/d">Nav link four</a>
      </nav>
      <article><p>Body text without links.</p></article>
      <footer>
        <a href="/e">Footer link</a>
      </footer>
    `;
    const issues = validator.validate({ html, pageUrl: PAGE_URL });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-169' }));
  });

  it('passes when links are within main content (rule 169 negative)', () => {
    const html = buildHtml([
      { href: '/a', anchor: 'topic A overview' },
      { href: '/b', anchor: 'topic B analysis' },
      { href: '/c', anchor: 'topic C strategies' },
      { href: '/d', anchor: 'topic D results' },
    ]);
    const issues = validator.validate({ html, pageUrl: PAGE_URL });
    expect(issues.find(i => i.ruleId === 'rule-169')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 174 — Bare links without surrounding context
  // -------------------------------------------------------------------------

  it('detects bare links lacking context (rule 174)', () => {
    // Links with minimal surrounding text (< 5 words of context)
    const html = `<article>
      <a href="/a">A</a>
      <a href="/b">B</a>
      <a href="/c">C</a>
      <a href="/d">D</a>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-174' }));
  });

  // -------------------------------------------------------------------------
  // Rule 178 — Too few internal links
  // -------------------------------------------------------------------------

  it('detects too few internal links (rule 178)', () => {
    // Only 1 link in a 400-word article
    const words = Array(400).fill('word').join(' ');
    const html = `<article><p>${words} <a href="/only-link">the only internal link</a></p></article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-178' }));
  });

  it('passes with sufficient links for short content (rule 178 negative)', () => {
    // Short content (< 300 words) with 1 link should not trigger
    const html = `<article><p>Short article. <a href="/a">link one</a></p></article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL });
    expect(issues.find(i => i.ruleId === 'rule-178')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 179 — Low internal link density
  // -------------------------------------------------------------------------

  it('detects low link density for long content (rule 179)', () => {
    // 1000 words but only 1 link => idealMin = floor(1000/200) = 5
    const issues = validator.validate({
      html: '<article><p><a href="/a">single link</a></p></article>',
      pageUrl: PAGE_URL,
      totalWords: 1000,
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-179' }));
  });

  // -------------------------------------------------------------------------
  // Rule 181 — Excessive internal linking
  // -------------------------------------------------------------------------

  it('detects excessive internal linking (rule 181)', () => {
    // 300 words but 10 links => 300/50 = 6, and 10 > 6
    const links = Array.from({ length: 10 }, (_, i) => ({
      href: `/page-${i}`,
      anchor: `topic ${i} guide`,
    }));
    const html = buildHtml(links);
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 300 });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-181' }));
  });

  it('does not flag moderate link count (rule 181 negative)', () => {
    const links = [
      { href: '/a', anchor: 'topic overview' },
      { href: '/b', anchor: 'detailed analysis' },
      { href: '/c', anchor: 'strategy guide' },
    ];
    const html = buildHtml(links);
    // 3 links for 1000 words => 1000/50 = 20, and 3 < 20
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 1000 });
    expect(issues.find(i => i.ruleId === 'rule-181')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // extractInternalLinks
  // -------------------------------------------------------------------------

  it('ignores external links', () => {
    const html = `<article>
      <p>Visit <a href="https://external.com/page">external site</a> for more.</p>
      <p>Also see <a href="/internal">internal resource</a> here.</p>
    </article>`;
    const links = validator.extractInternalLinks(html, PAGE_URL);
    expect(links).toHaveLength(1);
    expect(links[0].anchor).toBe('internal resource');
  });

  // -------------------------------------------------------------------------
  // Clean HTML — no issues
  // -------------------------------------------------------------------------

  it('passes well-linked content with no issues', () => {
    const links = [
      { href: '/seo-basics', anchor: 'SEO fundamentals guide' },
      { href: '/keyword-research', anchor: 'keyword research strategies' },
      { href: '/on-page-seo', anchor: 'on-page optimization tips' },
      { href: '/link-building', anchor: 'link building techniques' },
    ];
    // Build with a leading intro paragraph so first sentence has no link
    const padding = ' ' + Array(50).fill('lorem').join(' ');
    const body = links
      .map(l => `<p>This is contextual surrounding text about the topic. We recommend <a href="${l.href}">${l.anchor}</a> for further reading.${padding}</p>`)
      .join('\n');
    const html = `<article><p>Welcome to our comprehensive guide on search engine optimization. This article covers the most important strategies.</p>\n${body}</article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 800 });
    expect(issues).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Rule 185 — Annotation text quality (Finding #62)
  // -------------------------------------------------------------------------

  it('detects weak annotation text around links (rule 185)', () => {
    // Paragraphs with only 1 sentence each containing a link
    const html = `<article>
      <p>Introduction paragraph without links. This sets up the topic properly.</p>
      <p>See <a href="/a">topic A guide</a>.</p>
      <p>Check <a href="/b">topic B overview</a>.</p>
      <p>Read <a href="/c">topic C analysis</a>.</p>
      <p>Visit <a href="/d">topic D reference</a>.</p>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 500 });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-185' }));
  });

  it('passes when link paragraphs have 2+ sentences (rule 185 negative)', () => {
    const html = `<article>
      <p>Introduction to the concept of SEO linking. This covers everything you need to know about it.</p>
      <p>Internal links help users navigate your site. For detailed guidance see our <a href="/a">linking best practices guide</a>.</p>
      <p>Anchor text matters for SEO signals. Read our <a href="/b">anchor text optimization tips</a> for more.</p>
      <p>Link placement affects user experience. Our <a href="/c">placement strategy article</a> explains the rules.</p>
      <p>Volume should be balanced across sections. Learn more in our <a href="/d">link density calculator</a> overview.</p>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 800 });
    expect(issues.find(i => i.ruleId === 'rule-185')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 186 — Link in first sentence of page (Finding #63)
  // -------------------------------------------------------------------------

  it('detects link in first sentence of content (rule 186)', () => {
    const html = `<article>
      <p>For more information visit our <a href="/guide">comprehensive SEO guide</a> which covers all the basics.</p>
      <p>This paragraph has no links and sets the scene.</p>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 300 });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-186' }));
  });

  it('passes when first sentence has no link (rule 186 negative)', () => {
    const html = `<article>
      <p>Search engine optimization is a broad field. Our <a href="/guide">comprehensive SEO guide</a> covers the fundamentals.</p>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 300 });
    expect(issues.find(i => i.ruleId === 'rule-186')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 187 — Links in first sentence of sections (Finding #63)
  // -------------------------------------------------------------------------

  it('detects links in first sentence of sections (rule 187)', () => {
    const html = `<article>
      <p>Introduction paragraph without links that sets up the context nicely for readers.</p>
      <h2>Section One</h2>
      <p>Check out <a href="/a">topic A guide</a> for more. This section covers the basics.</p>
      <h2>Section Two</h2>
      <p>Visit our <a href="/b">topic B overview</a> for details. We have extensive coverage.</p>
      <h2>Section Three</h2>
      <p>Read the <a href="/c">topic C analysis</a> before continuing. It provides key insights.</p>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 500 });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-187' }));
  });

  // -------------------------------------------------------------------------
  // Rule 189 — Anchor text repetition (Finding #64)
  // -------------------------------------------------------------------------

  it('detects repeated anchor+destination combinations (rule 189)', () => {
    const html = `<article>
      <p>Introduction paragraph to set the context. This is about SEO strategies.</p>
      <p>Read our <a href="/guide">SEO best practices</a> for better rankings.</p>
      <p>You should follow <a href="/guide">SEO best practices</a> consistently.</p>
      <p>Always remember <a href="/guide">SEO best practices</a> in your workflow.</p>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 500 });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-189' }));
  });

  it('allows up to 2 repeated anchor+destination combinations (rule 189 negative)', () => {
    const html = `<article>
      <p>Introduction paragraph about SEO topics. This covers our key strategies.</p>
      <p>Read our <a href="/guide">SEO best practices</a> for insights.</p>
      <p>Follow <a href="/guide">SEO best practices</a> consistently for results.</p>
      <p>Also check our <a href="/tools">SEO analysis tools</a> for auditing.</p>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 500 });
    expect(issues.find(i => i.ruleId === 'rule-189')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 190 — Long content missing ToC (Finding #66)
  // -------------------------------------------------------------------------

  it('detects long content missing Table of Contents (rule 190)', () => {
    const html = `<article>
      <p>Introduction paragraph.</p>
      <h2>Section One</h2>
      <p>Content here.</p>
      <h2>Section Two</h2>
      <p>More content here.</p>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 3000 });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-190' }));
  });

  it('passes when long content has fragment links for ToC (rule 190 negative)', () => {
    const html = `<article>
      <nav class="toc">
        <a href="#section-one">Section One</a>
        <a href="#section-two">Section Two</a>
        <a href="#section-three">Section Three</a>
      </nav>
      <h2 id="section-one">Section One</h2>
      <p>Content here.</p>
      <h2 id="section-two">Section Two</h2>
      <p>More content.</p>
      <h2 id="section-three">Section Three</h2>
      <p>Final content.</p>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 3000 });
    expect(issues.find(i => i.ruleId === 'rule-190')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 191 — Headings missing id attributes (Finding #66)
  // -------------------------------------------------------------------------

  it('detects headings without id attributes in long content (rule 191)', () => {
    const html = `<article>
      <h2>Section One</h2>
      <p>Content here.</p>
      <h2>Section Two</h2>
      <p>More content.</p>
      <h2>Section Three</h2>
      <p>Even more content.</p>
      <h2>Section Four</h2>
      <p>Final content.</p>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 3000 });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-191' }));
  });

  it('passes when headings have id attributes (rule 191 negative)', () => {
    const html = `<article>
      <h2 id="section-one">Section One</h2>
      <p>Content here.</p>
      <h2 id="section-two">Section Two</h2>
      <p>More content.</p>
      <h2 id="section-three">Section Three</h2>
      <p>Final content.</p>
    </article>`;
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 3000 });
    expect(issues.find(i => i.ruleId === 'rule-191')).toBeUndefined();
  });
});
