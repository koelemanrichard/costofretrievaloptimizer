import { describe, it, expect } from 'vitest';
import { HtmlTechnicalValidator } from '../HtmlTechnicalValidator';

describe('HtmlTechnicalValidator', () => {
  const validator = new HtmlTechnicalValidator();

  // ---------------------------------------------------------------------------
  // Rule 233 — Content not wrapped in <article>
  // ---------------------------------------------------------------------------

  it('detects missing <article> wrapper (rule 233)', () => {
    const html = '<main><h1>Title</h1><p>Content</p></main>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-233', severity: 'medium' })
    );
  });

  it('passes when <article> is present (rule 233)', () => {
    const html = '<article><h1>Title</h1><p>Content</p></article>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-233')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 239 — Multiple <main> elements
  // ---------------------------------------------------------------------------

  it('detects multiple <main> elements (rule 239)', () => {
    const html = '<main><p>First</p></main><main><p>Second</p></main>';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-239');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('high');
    expect(issue!.description).toContain('2');
  });

  it('allows a single <main> element (rule 239)', () => {
    const html = '<article><main><p>Content</p></main></article>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-239')).toBeUndefined();
  });

  it('allows zero <main> elements without flagging (rule 239)', () => {
    const html = '<article><div><p>Content</p></div></article>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-239')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 244 — Pseudo-headings
  // ---------------------------------------------------------------------------

  it('detects bold-as-heading pseudo-headings (rule 244)', () => {
    const html =
      '<article><p><strong>This Is A Section Title</strong></p><p>Content below.</p></article>';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-244');
    expect(issue).toBeDefined();
    expect(issue!.affectedElement).toContain('This Is A Section Title');
  });

  it('detects <b> tag pseudo-headings (rule 244)', () => {
    const html = '<article><p><b>Another Bold Title Here</b></p></article>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-244' })
    );
  });

  it('does not flag short bold text inside paragraph (rule 244)', () => {
    // Bold text shorter than 5 chars should not trigger
    const html = '<article><p><strong>Hi</strong> there</p></article>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-244')).toBeUndefined();
  });

  it('detects excessive font-size styled pseudo-headings (rule 244)', () => {
    const html =
      '<article>' +
      '<p style="font-size: 2em">Title One</p>' +
      '<p style="font-size: 1.8rem">Title Two</p>' +
      '<p style="font-size: 24px">Title Three</p>' +
      '</article>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-244' })
    );
  });

  // ---------------------------------------------------------------------------
  // Rule 255 — Duplicate images
  // ---------------------------------------------------------------------------

  it('detects duplicate image sources (rule 255)', () => {
    const html =
      '<article>' +
      '<img src="photo.jpg" alt="Photo" width="300" height="200" loading="eager">' +
      '<img src="photo.jpg" alt="Same photo" width="300" height="200" loading="lazy">' +
      '</article>';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-255');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('low');
    expect(issue!.description).toContain('1 duplicate');
  });

  it('passes with all unique image sources (rule 255)', () => {
    const html =
      '<article>' +
      '<img src="a.jpg" alt="A" width="100" height="100" loading="eager">' +
      '<img src="b.jpg" alt="B" width="100" height="100" loading="lazy">' +
      '</article>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-255')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 258 — Missing lazy loading
  // ---------------------------------------------------------------------------

  it('detects images missing lazy loading (rule 258)', () => {
    const html =
      '<article>' +
      '<img src="hero.jpg" alt="Hero" width="800" height="400">' +
      '<img src="content.jpg" alt="Content" width="600" height="300">' +
      '<img src="footer.jpg" alt="Footer" width="400" height="200">' +
      '</article>';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-258');
    expect(issue).toBeDefined();
    // First image is skipped (above fold), so 2 should be flagged
    expect(issue!.description).toContain('2 image(s)');
  });

  it('does not flag first image missing loading attribute (rule 258)', () => {
    // Only one image = above fold, no lazy loading needed
    const html = '<article><img src="hero.jpg" alt="Hero" width="800" height="400"></article>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-258')).toBeUndefined();
  });

  it('passes when images have loading attribute (rule 258)', () => {
    const html =
      '<article>' +
      '<img src="hero.jpg" alt="Hero" width="800" height="400" loading="eager">' +
      '<img src="content.jpg" alt="Content" width="600" height="300" loading="lazy">' +
      '</article>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-258')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 261 — Missing dimensions
  // ---------------------------------------------------------------------------

  it('detects images missing width/height (rule 261)', () => {
    const html =
      '<article>' +
      '<img src="a.jpg" alt="A" loading="eager">' +
      '<img src="b.jpg" alt="B" width="100" loading="lazy">' +
      '</article>';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-261');
    expect(issue).toBeDefined();
    // First image: missing both; second image: missing height => 2
    expect(issue!.description).toContain('2 image(s)');
  });

  it('passes when images have both width and height (rule 261)', () => {
    const html =
      '<article>' +
      '<img src="a.jpg" alt="A" width="300" height="200" loading="eager">' +
      '<img src="b.jpg" alt="B" width="600" height="400" loading="lazy">' +
      '</article>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-261')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Clean HTML — no issues
  // ---------------------------------------------------------------------------

  it('passes fully compliant HTML with zero issues', () => {
    const html =
      '<main>' +
      '<article>' +
      '<h1>Great Title</h1>' +
      '<h2>Section One</h2>' +
      '<p>Some content here.</p>' +
      '<img src="hero.jpg" alt="Hero image" width="800" height="400" loading="eager">' +
      '<img src="detail.jpg" alt="Detail image" width="600" height="300" loading="lazy">' +
      '</article>' +
      '</main>';
    const issues = validator.validate(html);
    expect(issues).toHaveLength(0);
  });

  it('passes empty string with zero issues', () => {
    // Empty string has no <article> — that IS flagged by rule 233
    // But no main/img/pseudo-heading issues
    const issues = validator.validate('');
    // Only rule-233 should fire for empty string
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('rule-233');
  });

  // ---------------------------------------------------------------------------
  // Combined scenario
  // ---------------------------------------------------------------------------

  it('reports multiple issues simultaneously', () => {
    const html =
      '<main><p>Content</p></main>' +
      '<main><p>More content</p></main>' +
      '<p><strong>Fake Heading Text Here</strong></p>' +
      '<img src="dup.jpg" alt="Dup">' +
      '<img src="dup.jpg" alt="Dup again">';
    const issues = validator.validate(html);

    const ruleIds = issues.map(i => i.ruleId);
    expect(ruleIds).toContain('rule-233'); // no <article>
    expect(ruleIds).toContain('rule-239'); // multiple <main>
    expect(ruleIds).toContain('rule-244'); // pseudo-heading
    expect(ruleIds).toContain('rule-255'); // duplicate img src
    expect(ruleIds).toContain('rule-261'); // missing dimensions
  });
});
