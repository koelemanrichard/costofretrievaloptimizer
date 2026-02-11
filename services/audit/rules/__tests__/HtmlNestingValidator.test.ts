import { describe, it, expect } from 'vitest';
import { HtmlNestingValidator } from '../HtmlNestingValidator';

describe('HtmlNestingValidator', () => {
  const validator = new HtmlNestingValidator();

  // -------------------------------------------------------------------------
  // Rule 242 — <figure> inside <p>
  // -------------------------------------------------------------------------

  it('detects <figure> nested inside <p> (rule 242)', () => {
    const html = '<p>Text <figure><img src="x.jpg"></figure> more text</p>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-242' }));
  });

  it('does not flag <figure> outside <p>', () => {
    const html = '<p>Text</p><figure><img src="x.jpg"></figure>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-242')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 243 — Block elements inside <p>
  // -------------------------------------------------------------------------

  it('detects block elements in <p> (rule 243)', () => {
    const html = '<p>Text <div>block</div></p>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-243' }));
  });

  it('detects <table> in <p> (rule 243)', () => {
    const html = '<p>Data: <table><tr><td>1</td></tr></table></p>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-243' }));
  });

  it('detects <ul> in <p> (rule 243)', () => {
    const html = '<p>List: <ul><li>item</li></ul></p>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-243' }));
  });

  it('detects <blockquote> in <p> (rule 243)', () => {
    const html = '<p>Quote: <blockquote>wise words</blockquote></p>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-243' }));
  });

  it('does not flag inline elements in <p>', () => {
    const html = '<p>Text <strong>bold</strong> and <em>italic</em></p>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-243')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 251 — Multiple <h1>
  // -------------------------------------------------------------------------

  it('detects multiple <h1> tags (rule 251)', () => {
    const html = '<h1>First</h1><h1>Second</h1>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-251' }));
  });

  it('allows single <h1>', () => {
    const html = '<h1>Only One</h1><h2>Sub</h2>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-251')).toBeUndefined();
  });

  it('allows zero <h1> tags without flagging rule 251', () => {
    const html = '<h2>Sub</h2><h3>SubSub</h3>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-251')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 252 — Heading level skip
  // -------------------------------------------------------------------------

  it('detects heading level skip (rule 252)', () => {
    const html = '<h1>Title</h1><h3>Skipped h2</h3>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-252' }));
  });

  it('allows proper heading sequence', () => {
    const html = '<h1>Title</h1><h2>Sub</h2><h3>SubSub</h3>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-252')).toBeUndefined();
  });

  it('allows heading level going UP (e.g. h3 -> h1)', () => {
    const html = '<h1>Title</h1><h2>Section</h2><h3>Detail</h3><h1>New Section</h1>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-252')).toBeUndefined();
  });

  it('detects skip from h2 to h4', () => {
    const html = '<h1>Title</h1><h2>Sub</h2><h4>Skipped h3</h4>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-252', title: 'Heading level skip: <h2> to <h4>' })
    );
  });

  // -------------------------------------------------------------------------
  // Clean HTML — no issues
  // -------------------------------------------------------------------------

  it('passes clean HTML', () => {
    const html =
      '<article><h1>Title</h1><p>Text</p><figure><img src="x.jpg"></figure></article>';
    const issues = validator.validate(html);
    expect(issues).toHaveLength(0);
  });

  it('passes empty string', () => {
    const issues = validator.validate('');
    expect(issues).toHaveLength(0);
  });
});
