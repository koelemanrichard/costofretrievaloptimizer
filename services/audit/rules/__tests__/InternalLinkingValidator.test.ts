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
    const html = buildHtml(links, { extraWords: 50 });
    const issues = validator.validate({ html, pageUrl: PAGE_URL, totalWords: 800 });
    expect(issues).toHaveLength(0);
  });
});
