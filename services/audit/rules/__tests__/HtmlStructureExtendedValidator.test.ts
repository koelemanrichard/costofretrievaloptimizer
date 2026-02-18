import { describe, it, expect } from 'vitest';
import { HtmlStructureExtendedValidator } from '../HtmlStructureExtendedValidator';

describe('HtmlStructureExtendedValidator', () => {
  const validator = new HtmlStructureExtendedValidator();

  // ---------------------------------------------------------------------------
  // Rule 245 — Empty elements
  // ---------------------------------------------------------------------------

  it('detects empty <p> elements (rule 245)', () => {
    const html = '<div><p></p><p>Content</p></div>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-245', severity: 'low' })
    );
  });

  it('detects empty <div> and <span> elements (rule 245)', () => {
    const html = '<div></div><span></span><span>text</span>';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-245');
    expect(issue).toBeDefined();
    expect(issue!.description).toContain('2 empty element');
  });

  it('detects whitespace-only elements as empty (rule 245)', () => {
    const html = '<p>   </p><p>&nbsp;</p>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-245' })
    );
  });

  it('does not flag elements with content (rule 245)', () => {
    const html = '<p>Hello</p><div>World</div><span>!</span>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-245')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 246 — Deprecated tags
  // ---------------------------------------------------------------------------

  it('detects deprecated <font> and <center> tags (rule 246)', () => {
    const html = '<font color="red">text</font><center>centered</center>';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-246');
    expect(issue).toBeDefined();
    expect(issue!.affectedElement).toContain('<font>');
    expect(issue!.affectedElement).toContain('<center>');
  });

  it('detects <marquee> and <blink> tags (rule 246)', () => {
    const html = '<marquee>scrolling</marquee><blink>blinking</blink>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-246' })
    );
  });

  it('does not flag modern HTML tags (rule 246)', () => {
    const html = '<article><section><p>Modern HTML</p></section></article>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-246')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 247 — Proper list usage
  // ---------------------------------------------------------------------------

  it('detects non-<li> direct children in <ul> (rule 247)', () => {
    const html = '<ul><div>Not a list item</div><li>Item</li></ul>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-247', severity: 'medium' })
    );
  });

  it('detects non-<li> direct children in <ol> (rule 247)', () => {
    const html = '<ol><p>Paragraph in list</p><li>Item 1</li></ol>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-247' })
    );
  });

  it('allows properly structured lists (rule 247)', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li></ol>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-247')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 248 — Inline styles
  // ---------------------------------------------------------------------------

  it('flags excessive inline styles (>3) (rule 248)', () => {
    const html =
      '<p style="color: red">a</p>' +
      '<p style="font-size: 12px">b</p>' +
      '<p style="margin: 0">c</p>' +
      '<p style="padding: 10px">d</p>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-248', severity: 'low' })
    );
  });

  it('does not flag 3 or fewer inline styles (rule 248)', () => {
    const html =
      '<p style="color: red">a</p>' +
      '<p style="font-size: 12px">b</p>' +
      '<p>c</p>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-248')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 249 — Table structure
  // ---------------------------------------------------------------------------

  it('detects table without <thead> and <th> (rule 249)', () => {
    const html =
      '<table><tr><td>Data 1</td><td>Data 2</td></tr></table>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-249', severity: 'medium' })
    );
  });

  it('passes table with proper <thead> and <th> (rule 249)', () => {
    const html =
      '<table><thead><tr><th>Header 1</th><th>Header 2</th></tr></thead>' +
      '<tbody><tr><td>Data</td><td>Data</td></tr></tbody></table>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-249')).toBeUndefined();
  });

  it('flags table with <th> outside <thead> (rule 249)', () => {
    const html =
      '<table><tr><th>Header</th></tr><tr><td>Data</td></tr></table>';
    const issues = validator.validate(html);
    const issue = issues.find(i => i.ruleId === 'rule-249');
    expect(issue).toBeDefined();
    expect(issue!.description).toContain('<th> elements exist but are not wrapped in <thead>');
  });

  // ---------------------------------------------------------------------------
  // Rule 250 — Excessive nesting
  // ---------------------------------------------------------------------------

  it('detects nesting deeper than 6 levels (rule 250)', () => {
    const html =
      '<div><div><div><div><div><div><div><p>Deep</p></div></div></div></div></div></div></div>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-250', severity: 'low' })
    );
  });

  it('does not flag nesting at exactly 6 levels (rule 250)', () => {
    // 5 <div> + 1 <p> = 6 levels deep, which is exactly at the threshold
    const html =
      '<div><div><div><div><div><p>Just right</p></div></div></div></div></div>';
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-250')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Clean HTML — no issues
  // ---------------------------------------------------------------------------

  it('passes clean HTML with zero issues', () => {
    const html =
      '<header><nav>Navigation links here</nav></header>' +
      '<main><article>' +
      '<h1>Title</h1>' +
      '<p>Content paragraph</p>' +
      '<ul><li>Item 1</li><li>Item 2</li></ul>' +
      '<table><thead><tr><th>Col</th></tr></thead>' +
      '<tbody><tr><td>Data</td></tr></tbody></table>' +
      '</article></main>' +
      '<footer><p>Footer content</p></footer>';
    const issues = validator.validate(html);
    expect(issues).toHaveLength(0);
  });

  it('passes empty string with zero issues', () => {
    const issues = validator.validate('');
    expect(issues).toHaveLength(0);
  });
});
