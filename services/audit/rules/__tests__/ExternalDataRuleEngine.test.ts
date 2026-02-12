import { describe, it, expect, vi } from 'vitest';
import {
  ExternalDataRuleEngine,
  ExternalDataInput,
  ExternalDataProviders,
} from '../ExternalDataRuleEngine';

describe('ExternalDataRuleEngine', () => {
  const engine = new ExternalDataRuleEngine();

  // -------------------------------------------------------------------------
  // Edge case: empty / minimal input
  // -------------------------------------------------------------------------

  it('returns no issues for empty input (only url)', () => {
    const issues = engine.validate({ url: 'https://example.com' });
    expect(issues).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Rule 20 — Author citations
  // -------------------------------------------------------------------------

  it('rule-20: flags when authorCitations is empty and authorName is provided', () => {
    const issues = engine.validate({
      url: 'https://example.com',
      authorName: 'John Doe',
      authorCitations: [],
    });
    const rule20 = issues.find((i) => i.ruleId === 'rule-20');
    expect(rule20).toBeDefined();
    expect(rule20!.severity).toBe('medium');
    expect(rule20!.description).toContain('John Doe');
  });

  it('rule-20: passes when authorCitations has entries', () => {
    const issues = engine.validate({
      url: 'https://example.com',
      authorName: 'John Doe',
      authorCitations: [
        { url: 'https://external.com/john', title: 'John Doe interview' },
      ],
    });
    expect(issues.find((i) => i.ruleId === 'rule-20')).toBeUndefined();
  });

  it('rule-20: skips when authorName is not provided', () => {
    const issues = engine.validate({
      url: 'https://example.com',
      authorCitations: [],
    });
    expect(issues.find((i) => i.ruleId === 'rule-20')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rules 368-370 — GSC Indexation
  // -------------------------------------------------------------------------

  it('rule-368: flags when page is not indexed', () => {
    const issues = engine.validate({
      url: 'https://example.com/page',
      gscStatus: { indexed: false },
    });
    const rule368 = issues.find((i) => i.ruleId === 'rule-368');
    expect(rule368).toBeDefined();
    expect(rule368!.severity).toBe('critical');
  });

  it('rule-368: passes when page is indexed', () => {
    const issues = engine.validate({
      url: 'https://example.com/page',
      gscStatus: { indexed: true },
    });
    expect(issues.find((i) => i.ruleId === 'rule-368')).toBeUndefined();
  });

  it('rule-369: flags when page was crawled more than 30 days ago', () => {
    const sixtyDaysAgo = new Date(
      Date.now() - 60 * 24 * 60 * 60 * 1000
    ).toISOString();
    const issues = engine.validate({
      url: 'https://example.com/page',
      gscStatus: { indexed: true, lastCrawled: sixtyDaysAgo },
    });
    const rule369 = issues.find((i) => i.ruleId === 'rule-369');
    expect(rule369).toBeDefined();
    expect(rule369!.severity).toBe('high');
    expect(rule369!.description).toContain('days ago');
  });

  it('rule-369: passes when crawled recently', () => {
    const fiveDaysAgo = new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000
    ).toISOString();
    const issues = engine.validate({
      url: 'https://example.com/page',
      gscStatus: { indexed: true, lastCrawled: fiveDaysAgo },
    });
    expect(issues.find((i) => i.ruleId === 'rule-369')).toBeUndefined();
  });

  it('rule-370: flags when coverage contains error keywords', () => {
    const issues = engine.validate({
      url: 'https://example.com/page',
      gscStatus: { indexed: true, coverage: 'Excluded by noindex tag' },
    });
    const rule370 = issues.find((i) => i.ruleId === 'rule-370');
    expect(rule370).toBeDefined();
    expect(rule370!.severity).toBe('high');
    expect(rule370!.description).toContain('Excluded by noindex tag');
  });

  it('rule-370: passes when coverage is clean', () => {
    const issues = engine.validate({
      url: 'https://example.com/page',
      gscStatus: { indexed: true, coverage: 'Submitted and indexed' },
    });
    expect(issues.find((i) => i.ruleId === 'rule-370')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rules 186-189 — Navigation & Dynamic Links
  // -------------------------------------------------------------------------

  it('rule-186: flags JavaScript-based navigation', () => {
    const html =
      '<div onclick="window.location=\'/about\'">About</div>' +
      '<button onclick="navigate(\'/contact\')">Contact</button>';
    const issues = engine.validate({ url: 'https://example.com', html });
    const rule186 = issues.find((i) => i.ruleId === 'rule-186');
    expect(rule186).toBeDefined();
    expect(rule186!.severity).toBe('high');
  });

  it('rule-186: passes when no JS navigation patterns', () => {
    const html = '<a href="/about">About</a><a href="/contact">Contact</a>';
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-186')).toBeUndefined();
  });

  it('rule-187: flags insufficient navigation links', () => {
    const issues = engine.validate({
      url: 'https://example.com',
      pageLinks: [
        { href: '/home', text: 'Home', isNavigation: true },
        { href: '/about', text: 'About', isNavigation: true },
        { href: '/blog/post', text: 'Read more', isNavigation: false },
      ],
    });
    const rule187 = issues.find((i) => i.ruleId === 'rule-187');
    expect(rule187).toBeDefined();
    expect(rule187!.description).toContain('2 navigation link(s)');
  });

  it('rule-187: passes with adequate navigation links', () => {
    const issues = engine.validate({
      url: 'https://example.com',
      pageLinks: [
        { href: '/home', text: 'Home', isNavigation: true },
        { href: '/about', text: 'About', isNavigation: true },
        { href: '/contact', text: 'Contact', isNavigation: true },
        { href: '/blog', text: 'Blog', isNavigation: true },
      ],
    });
    expect(issues.find((i) => i.ruleId === 'rule-187')).toBeUndefined();
  });

  it('rule-188: flags missing breadcrumb', () => {
    const html = '<nav><ul><li>Home</li></ul></nav><main>Content</main>';
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-188')).toBeDefined();
  });

  it('rule-188: passes with breadcrumb aria-label', () => {
    const html = '<nav aria-label="breadcrumb"><ol><li>Home</li></ol></nav>';
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-188')).toBeUndefined();
  });

  it('rule-188: passes with BreadcrumbList schema', () => {
    const html =
      '<script type="application/ld+json">{"@type": "BreadcrumbList"}</script>';
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-188')).toBeUndefined();
  });

  it('rule-189: flags missing footer', () => {
    const html = '<html><body><main>Content</main></body></html>';
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-189')).toBeDefined();
  });

  it('rule-189: flags footer without links', () => {
    const html = '<footer><p>Copyright 2024</p></footer>';
    const issues = engine.validate({ url: 'https://example.com', html });
    const rule189 = issues.find((i) => i.ruleId === 'rule-189');
    expect(rule189).toBeDefined();
    expect(rule189!.title).toBe('Footer has no links');
  });

  it('rule-189: passes with footer containing links', () => {
    const html =
      '<footer><a href="/privacy">Privacy</a><a href="/sitemap">Sitemap</a></footer>';
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-189')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rules 190-194 — URL Fragments / Jump Links
  // -------------------------------------------------------------------------

  it('rule-190: flags jump links with missing targets', () => {
    const html = '<div id="introduction">Intro</div><div id="pricing">Pricing</div>';
    const issues = engine.validate({
      url: 'https://example.com',
      html,
      fragmentTargets: ['introduction', 'pricing', 'nonexistent'],
    });
    const rule190 = issues.find((i) => i.ruleId === 'rule-190');
    expect(rule190).toBeDefined();
    expect(rule190!.description).toContain('nonexistent');
  });

  it('rule-190: passes when all targets exist', () => {
    const html =
      '<div id="introduction">Intro</div><div id="pricing">Pricing</div>';
    const issues = engine.validate({
      url: 'https://example.com',
      html,
      fragmentTargets: ['introduction', 'pricing'],
    });
    expect(issues.find((i) => i.ruleId === 'rule-190')).toBeUndefined();
  });

  it('rule-191: flags long content without TOC', () => {
    // Generate >2000 words of content
    const longText = ('word '.repeat(2500)).trim();
    const html = `<html><body><p>${longText}</p></body></html>`;
    const issues = engine.validate({ url: 'https://example.com', html });
    const rule191 = issues.find((i) => i.ruleId === 'rule-191');
    expect(rule191).toBeDefined();
    expect(rule191!.severity).toBe('medium');
  });

  it('rule-191: passes when content is short', () => {
    const shortText = ('word '.repeat(500)).trim();
    const html = `<html><body><p>${shortText}</p></body></html>`;
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-191')).toBeUndefined();
  });

  it('rule-191: passes when long content has TOC-like fragment links', () => {
    const longText = ('word '.repeat(2500)).trim();
    const html =
      '<nav><a href="#section-a">A</a><a href="#section-b">B</a><a href="#section-c">C</a></nav>' +
      `<p>${longText}</p>`;
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-191')).toBeUndefined();
  });

  it('rule-192: flags non-descriptive IDs', () => {
    const html =
      '<div id="s1">Section</div><div id="section2">Section</div><div id="a">Link</div>';
    const issues = engine.validate({ url: 'https://example.com', html });
    const rule192 = issues.find((i) => i.ruleId === 'rule-192');
    expect(rule192).toBeDefined();
    expect(rule192!.description).toContain('s1');
  });

  it('rule-192: passes with descriptive IDs', () => {
    const html =
      '<div id="pricing-overview">Pricing</div><div id="feature-comparison">Features</div>';
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-192')).toBeUndefined();
  });

  it('rule-193: detects broken fragment links in HTML', () => {
    const html =
      '<a href="#existing">Go</a><a href="#missing">Go</a>' +
      '<div id="existing">Here</div>';
    const issues = engine.validate({ url: 'https://example.com', html });
    const rule193 = issues.find((i) => i.ruleId === 'rule-193');
    expect(rule193).toBeDefined();
    expect(rule193!.description).toContain('missing');
  });

  it('rule-193: passes when all fragment links match IDs', () => {
    const html =
      '<a href="#intro">Go</a><a href="#body">Go</a>' +
      '<div id="intro">Intro</div><div id="body">Body</div>';
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-193')).toBeUndefined();
  });

  it('rule-194: flags missing skip-to-content link', () => {
    const html =
      '<nav><a href="/home">Home</a></nav><main id="main-content">Content</main>';
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-194')).toBeDefined();
  });

  it('rule-194: passes with skip-to-content link', () => {
    const html =
      '<a href="#main-content" class="skip-link">Skip to content</a>' +
      '<nav><a href="/home">Home</a></nav><main id="main-content">Content</main>';
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-194')).toBeUndefined();
  });

  it('rule-194: passes with skip-nav class', () => {
    const html =
      '<a class="skip-nav" href="#content">Skip</a><main id="content">Content</main>';
    const issues = engine.validate({ url: 'https://example.com', html });
    expect(issues.find((i) => i.ruleId === 'rule-194')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // validateWithFetch — async with mock providers
  // -------------------------------------------------------------------------

  it('validateWithFetch fetches missing data from providers', async () => {
    const providers: ExternalDataProviders = {
      getGscIndexStatus: vi.fn().mockResolvedValue({
        indexed: false,
        lastCrawled: new Date().toISOString(),
        coverage: 'Excluded by noindex tag',
      }),
      searchAuthorCitations: vi.fn().mockResolvedValue([]),
    };

    const issues = await engine.validateWithFetch(
      { url: 'https://example.com', authorName: 'Jane Doe' },
      providers
    );

    expect(providers.getGscIndexStatus).toHaveBeenCalledWith(
      'https://example.com'
    );
    expect(providers.searchAuthorCitations).toHaveBeenCalledWith('Jane Doe');

    // Should flag: not indexed (368), coverage issue (370), no citations (20)
    expect(issues.find((i) => i.ruleId === 'rule-368')).toBeDefined();
    expect(issues.find((i) => i.ruleId === 'rule-370')).toBeDefined();
    expect(issues.find((i) => i.ruleId === 'rule-20')).toBeDefined();
  });

  it('validateWithFetch does not overwrite pre-fetched data', async () => {
    const providers: ExternalDataProviders = {
      getGscIndexStatus: vi.fn().mockResolvedValue({
        indexed: false,
      }),
    };

    const issues = await engine.validateWithFetch(
      {
        url: 'https://example.com',
        gscStatus: { indexed: true },
      },
      providers
    );

    // Should NOT call the provider since gscStatus was already provided
    expect(providers.getGscIndexStatus).not.toHaveBeenCalled();
    // Should not flag rule-368 since pre-fetched data says indexed
    expect(issues.find((i) => i.ruleId === 'rule-368')).toBeUndefined();
  });

  it('validateWithFetch handles provider errors gracefully', async () => {
    const providers: ExternalDataProviders = {
      getGscIndexStatus: vi
        .fn()
        .mockRejectedValue(new Error('Network error')),
      searchAuthorCitations: vi
        .fn()
        .mockRejectedValue(new Error('API timeout')),
    };

    // Should not throw, just skip those rules
    const issues = await engine.validateWithFetch(
      { url: 'https://example.com', authorName: 'Jane Doe' },
      providers
    );

    expect(issues).toBeInstanceOf(Array);
    // No GSC or citation data → those rules are simply skipped
    expect(issues.find((i) => i.ruleId === 'rule-368')).toBeUndefined();
    expect(issues.find((i) => i.ruleId === 'rule-20')).toBeUndefined();
  });
});
