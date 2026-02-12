import { describe, it, expect } from 'vitest';
import { ImageMetadataValidator } from '../ImageMetadataValidator';

describe('ImageMetadataValidator', () => {
  const validator = new ImageMetadataValidator();

  // ---------------------------------------------------------------------------
  // Rule 260 — Next-gen image formats
  // ---------------------------------------------------------------------------

  it('flags legacy image formats .jpg, .png, .gif (rule 260)', () => {
    const html =
      '<img src="photo.jpg" alt="Photo">' +
      '<img src="banner.png" alt="Banner">' +
      '<img src="animation.gif" alt="Anim">';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-260');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('medium');
    expect(issue!.description).toContain('3 image(s)');
  });

  it('does not flag next-gen formats (rule 260)', () => {
    const html =
      '<img src="photo.webp" alt="Photo">' +
      '<img src="banner.avif" alt="Banner">' +
      '<img src="icon.svg" alt="Icon">';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-260')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 261 — Width/height attributes
  // ---------------------------------------------------------------------------

  it('detects images missing width/height (rule 261)', () => {
    const html =
      '<img src="a.webp" alt="A">' +
      '<img src="b.webp" alt="B" width="100">';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-261');
    expect(issue).toBeDefined();
    expect(issue!.description).toContain('2 image(s)');
  });

  it('passes images with both width and height (rule 261)', () => {
    const html = '<img src="a.webp" alt="A" width="800" height="600">';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-261')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 262 — File size hints
  // ---------------------------------------------------------------------------

  it('flags filenames suggesting unoptimized images (rule 262)', () => {
    const html =
      '<img src="/images/original-photo.jpg" alt="Photo">' +
      '<img src="/img/full-size-banner.png" alt="Banner">';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-262');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('low');
    expect(issue!.description).toContain('2 image(s)');
  });

  it('does not flag normal filenames (rule 262)', () => {
    const html = '<img src="/images/mountain-landscape.webp" alt="Mountain">';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-262')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 263 — Responsive images
  // ---------------------------------------------------------------------------

  it('detects images without srcset or <picture> (rule 263)', () => {
    const html =
      '<img src="photo.webp" alt="Photo">' +
      '<img src="banner.webp" alt="Banner">';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-263', severity: 'medium' })
    );
  });

  it('passes images with srcset (rule 263)', () => {
    const html =
      '<img src="photo-800.webp" srcset="photo-400.webp 400w, photo-800.webp 800w" alt="Photo">';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-263')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 264 — Descriptive file names
  // ---------------------------------------------------------------------------

  it('flags generic file names like IMG_001.jpg (rule 264)', () => {
    const html =
      '<img src="/photos/IMG_001.jpg" alt="Photo">' +
      '<img src="image1.png" alt="Image">' +
      '<img src="screenshot.png" alt="Screenshot">';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-264');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('low');
    expect(issue!.description).toContain('3 image(s)');
  });

  it('does not flag descriptive file names (rule 264)', () => {
    const html =
      '<img src="red-mountain-bike.webp" alt="Red mountain bike">' +
      '<img src="sunset-over-ocean.avif" alt="Sunset">';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-264')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 265 — Lazy loading
  // ---------------------------------------------------------------------------

  it('flags when >3 images and none have lazy loading (rule 265)', () => {
    const html =
      '<img src="a.webp" alt="A">' +
      '<img src="b.webp" alt="B">' +
      '<img src="c.webp" alt="C">' +
      '<img src="d.webp" alt="D">';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-265', severity: 'medium' })
    );
  });

  it('does not flag when at least one image has lazy loading (rule 265)', () => {
    const html =
      '<img src="a.webp" alt="A" loading="eager">' +
      '<img src="b.webp" alt="B" loading="lazy">' +
      '<img src="c.webp" alt="C">' +
      '<img src="d.webp" alt="D">';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-265')).toBeUndefined();
  });

  it('does not flag when 3 or fewer images (rule 265)', () => {
    const html =
      '<img src="a.webp" alt="A">' +
      '<img src="b.webp" alt="B">' +
      '<img src="c.webp" alt="C">';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-265')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 266 — Decorative images
  // ---------------------------------------------------------------------------

  it('flags decorative images (alt="") without role="presentation" (rule 266)', () => {
    const html = '<img src="divider.svg" alt="">';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-266', severity: 'low' })
    );
  });

  it('passes decorative images with role="presentation" (rule 266)', () => {
    const html = '<img src="divider.svg" alt="" role="presentation">';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-266')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 267 — Image captions
  // ---------------------------------------------------------------------------

  it('flags <figure> with <img> but no <figcaption> (rule 267)', () => {
    const html = '<figure><img src="chart.webp" alt="Chart"></figure>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-267', severity: 'low' })
    );
  });

  it('passes <figure> with <img> and <figcaption> (rule 267)', () => {
    const html =
      '<figure>' +
      '<img src="chart.webp" alt="Chart">' +
      '<figcaption>Quarterly revenue chart</figcaption>' +
      '</figure>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-267')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('returns no issues for HTML without images', () => {
    const html = '<article><h1>Title</h1><p>No images here.</p></article>';
    const issues = validator.validate(html);
    expect(issues).toHaveLength(0);
  });

  it('returns no issues for empty string', () => {
    const issues = validator.validate('');
    expect(issues).toHaveLength(0);
  });

  it('reports multiple issues simultaneously', () => {
    const html =
      '<img src="IMG_001.jpg" alt="">' +
      '<img src="photo.png" alt="">' +
      '<img src="image1.gif" alt="">' +
      '<img src="screenshot.jpg" alt="">' +
      '<figure><img src="original-chart.png" alt="Chart"></figure>';
    const issues = validator.validate(html);

    const ruleIds = issues.map(i => i.ruleId);
    expect(ruleIds).toContain('rule-260'); // legacy formats
    expect(ruleIds).toContain('rule-261'); // missing dimensions
    expect(ruleIds).toContain('rule-264'); // generic filenames
    expect(ruleIds).toContain('rule-265'); // no lazy loading (5 images, none lazy)
    expect(ruleIds).toContain('rule-266'); // decorative without role
    expect(ruleIds).toContain('rule-267'); // figure without figcaption
  });
});
