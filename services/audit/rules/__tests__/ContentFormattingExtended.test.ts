import { describe, it, expect } from 'vitest';
import { ContentFormattingExtended } from '../ContentFormattingExtended';

describe('ContentFormattingExtended', () => {
  const validator = new ContentFormattingExtended();

  // ---------------------------------------------------------------------------
  // Rule 211 — List item consistency (no item >3x longer than average)
  // ---------------------------------------------------------------------------

  it('detects inconsistent list item lengths (rule 211)', () => {
    const html = `
      <ul>
        <li>Short</li>
        <li>Brief</li>
        <li>Tiny</li>
        <li>This is an extremely long list item that goes on and on with way too much detail about a topic that should really be its own paragraph rather than crammed into a single list item because it overwhelms the reader and makes the entire list hard to scan quickly</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-211', severity: 'low' })
    );
  });

  it('passes lists with consistent item lengths (rule 211)', () => {
    const html = `
      <ul>
        <li>Install Node.js from the official website</li>
        <li>Configure the project settings properly</li>
        <li>Run the test suite to verify everything</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-211')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 212 — List item punctuation consistency
  // ---------------------------------------------------------------------------

  it('detects inconsistent list item punctuation (rule 212)', () => {
    const html = `
      <ul>
        <li>First item with a period.</li>
        <li>Second item without period</li>
        <li>Third item also with period.</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-212', severity: 'low' })
    );
  });

  it('passes lists where all items end with periods (rule 212)', () => {
    const html = `
      <ul>
        <li>First item.</li>
        <li>Second item.</li>
        <li>Third item.</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-212')).toBeUndefined();
  });

  it('passes lists where no items end with periods (rule 212)', () => {
    const html = `
      <ul>
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-212')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 213 — List item parallelism
  // ---------------------------------------------------------------------------

  it('detects non-parallel list items (rule 213)', () => {
    const html = `
      <ul>
        <li>Install the dependencies</li>
        <li>The configuration is important</li>
        <li>Running tests regularly</li>
        <li>A good practice for deployment</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-213', severity: 'medium' })
    );
  });

  it('passes parallel list items starting with verbs (rule 213)', () => {
    const html = `
      <ul>
        <li>Install the dependencies</li>
        <li>Configure the settings</li>
        <li>Run the test suite</li>
        <li>Deploy to production</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-213')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 214 — List size (3-10 items)
  // ---------------------------------------------------------------------------

  it('detects lists with too few items (rule 214)', () => {
    const html = `
      <ul>
        <li>Only one</li>
        <li>And two</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-214', severity: 'low' })
    );
  });

  it('detects lists with too many items (rule 214)', () => {
    const items = Array.from({ length: 12 }, (_, i) => `<li>Item ${i + 1}</li>`).join('\n');
    const html = `<ul>${items}</ul>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-214' })
    );
  });

  // ---------------------------------------------------------------------------
  // Rule 215 — Nested list depth (max 2 levels)
  // ---------------------------------------------------------------------------

  it('detects deeply nested lists beyond 2 levels (rule 215)', () => {
    const html = `
      <ul>
        <li>Level 1
          <ul>
            <li>Level 2
              <ul>
                <li>Level 3 - too deep</li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-215', severity: 'medium' })
    );
  });

  it('passes lists with 2 levels of nesting (rule 215)', () => {
    const html = `
      <ul>
        <li>Level 1
          <ul>
            <li>Level 2 item A</li>
            <li>Level 2 item B</li>
          </ul>
        </li>
        <li>Another Level 1 item</li>
        <li>Third Level 1 item</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-215')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 216 — Table header descriptiveness (extends existing rule)
  // ---------------------------------------------------------------------------

  it('detects generic table headers like "Column 1" (rule 216)', () => {
    const html = `
      <table>
        <thead>
          <tr><th>Column 1</th><th>Column 2</th><th>Name</th></tr>
        </thead>
        <tbody>
          <tr><td>A</td><td>B</td><td>C</td></tr>
        </tbody>
      </table>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-216', severity: 'medium' })
    );
  });

  it('detects empty table headers (rule 216)', () => {
    const html = `
      <table>
        <thead>
          <tr><th></th><th>Price</th></tr>
        </thead>
        <tbody>
          <tr><td>Widget</td><td>$10</td></tr>
        </tbody>
      </table>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-216' })
    );
  });

  it('passes tables with descriptive headers (rule 216)', () => {
    const html = `
      <table>
        <thead>
          <tr><th>Product Name</th><th>Price</th><th>Category</th></tr>
        </thead>
        <tbody>
          <tr><td>Widget</td><td>$10</td><td>Tools</td></tr>
        </tbody>
      </table>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-216')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 218 — Table caption
  // ---------------------------------------------------------------------------

  it('detects tables without captions (rule 218)', () => {
    const html = `
      <table>
        <thead><tr><th>Name</th><th>Value</th></tr></thead>
        <tbody><tr><td>A</td><td>1</td></tr></tbody>
      </table>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-218', severity: 'low' })
    );
  });

  it('passes tables with captions (rule 218)', () => {
    const html = `
      <table>
        <caption>Product pricing overview</caption>
        <thead><tr><th>Name</th><th>Value</th></tr></thead>
        <tbody><tr><td>A</td><td>1</td></tr></tbody>
      </table>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-218')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 219 — Table complexity
  // ---------------------------------------------------------------------------

  it('detects tables with too many columns (rule 219)', () => {
    const headers = Array.from({ length: 9 }, (_, i) => `<th>Col ${i + 1}</th>`).join('');
    const cells = Array.from({ length: 9 }, (_, i) => `<td>Val ${i + 1}</td>`).join('');
    const html = `
      <table>
        <thead><tr>${headers}</tr></thead>
        <tbody><tr>${cells}</tr></tbody>
      </table>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-219', severity: 'medium' })
    );
  });

  it('detects tables with too many rows (rule 219)', () => {
    const rows = Array.from({ length: 22 }, (_, i) =>
      `<tr><td>Row ${i + 1}</td><td>Data</td></tr>`
    ).join('\n');
    const html = `
      <table>
        <thead><tr><th>Name</th><th>Value</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-219' })
    );
  });

  // ---------------------------------------------------------------------------
  // Rule 220 — Scannable content (heading/break every 300 words)
  // ---------------------------------------------------------------------------

  it('detects content blocks exceeding 300 words without breaks (rule 220)', () => {
    // Generate 400 words of content without any headings or breaks
    const longText = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ');
    const html = `<h1>Title</h1><p>${longText}</p>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-220', severity: 'medium' })
    );
  });

  it('passes well-structured content with regular headings (rule 220)', () => {
    const shortText = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
    const html = `
      <h1>Title</h1>
      <p>${shortText}</p>
      <h2>Section 2</h2>
      <p>${shortText}</p>
      <h2>Section 3</h2>
      <p>${shortText}</p>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-220')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 221 — Emphasis usage (max 5%)
  // ---------------------------------------------------------------------------

  it('detects excessive emphasis usage above 5% (rule 221)', () => {
    // Create text where >5% is bold
    const normalText = 'This is normal text repeated several times. ';
    const html = `<p>${normalText.repeat(5)}<strong>${normalText.repeat(4)}</strong></p>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-221', severity: 'low' })
    );
  });

  it('passes content with moderate emphasis usage (rule 221)', () => {
    // Ensure emphasis ratio stays well under 5%: 9 chars of emphasis in ~500 chars of total text
    const html = `
      <p>This is a regular paragraph with some <strong>key</strong> content and
      additional plain text that is not styled with any emphasis at all. The majority
      of this article consists of unformatted prose, which keeps the emphasis ratio
      well under five percent of the total content length. We want to make sure that
      only the most <em>vital</em> terms receive formatting so the reader can quickly
      identify what matters. Adding more plain text here helps dilute the ratio even
      further, ensuring we remain below the threshold comfortably.</p>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-221')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 222 — Blockquote usage (should contain actual quotes)
  // ---------------------------------------------------------------------------

  it('detects blockquotes used for styling without actual quotes (rule 222)', () => {
    const html = `
      <blockquote>
        This is just some regular content that someone wrapped in a blockquote
        for visual styling purposes without any actual quotation.
      </blockquote>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-222', severity: 'low' })
    );
  });

  it('passes blockquotes that contain actual quotation marks (rule 222)', () => {
    const html = `
      <blockquote>
        "The only way to do great work is to love what you do."
        \u2014 Steve Jobs
      </blockquote>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-222')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 223 — Content variety (>1000 words should use 3+ types)
  // ---------------------------------------------------------------------------

  it('detects low content variety in long articles (rule 223)', () => {
    // Generate >1000 words of prose-only content with paragraphs
    const longParagraph = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
    const html = `
      <h1>Title</h1>
      <p>${longParagraph}</p>
      <p>${longParagraph}</p>
      <p>${longParagraph}</p>
      <p>${longParagraph}</p>
      <p>${longParagraph}</p>
      <p>${longParagraph}</p>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-223', severity: 'medium' })
    );
  });

  it('passes long articles with diverse content types (rule 223)', () => {
    const paragraph = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
    const html = `
      <h1>Title</h1>
      <p>${paragraph}</p>
      <p>${paragraph}</p>
      <p>${paragraph}</p>
      <ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>
      <table>
        <thead><tr><th>A</th><th>B</th></tr></thead>
        <tbody><tr><td>1</td><td>2</td></tr></tbody>
      </table>
      <img src="photo.jpg" alt="Photo" />
      <p>${paragraph}</p>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-223')).toBeUndefined();
  });

  it('skips content variety check for articles under 1000 words (rule 223)', () => {
    const html = `<p>Short article with only paragraphs. Nothing else here.</p>`;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-223')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 224 — Whitespace distribution (no paragraph >150 words)
  // ---------------------------------------------------------------------------

  it('detects wall-of-text paragraphs exceeding 150 words (rule 224)', () => {
    const wallOfText = Array.from({ length: 160 }, (_, i) => `word${i}`).join(' ');
    const html = `<p>${wallOfText}</p>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-224', severity: 'low' })
    );
  });

  it('passes paragraphs under 150 words (rule 224)', () => {
    const shortParagraph = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ');
    const html = `
      <p>${shortParagraph}</p>
      <p>${shortParagraph}</p>
    `;
    const issues = validator.validate(html);
    expect(issues.find(i => i.ruleId === 'rule-224')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('handles empty HTML input without errors', () => {
    const issues = validator.validate('');
    expect(issues).toHaveLength(0);
  });

  it('handles HTML with no lists or tables without errors', () => {
    const html = '<p>Just a simple paragraph with no special formatting.</p>';
    const issues = validator.validate(html);
    // Should not throw; may or may not have issues from visual hierarchy rules
    expect(Array.isArray(issues)).toBe(true);
  });

  it('returns no issues for well-formatted content', () => {
    const html = `
      <h1>Understanding CSS Grid</h1>
      <p>CSS Grid is a powerful layout system. It provides a two-dimensional
      grid-based approach that makes complex layouts simple.</p>

      <h2>Basic Concepts</h2>
      <p>Here are the key concepts to understand:</p>
      <ul>
        <li>Grid container defines the grid context</li>
        <li>Grid items are direct children of the container</li>
        <li>Grid lines form the boundaries of columns and rows</li>
        <li>Grid tracks are the spaces between adjacent lines</li>
      </ul>

      <h2>Comparison with Flexbox</h2>
      <table>
        <caption>CSS Grid vs Flexbox comparison</caption>
        <thead>
          <tr><th>Feature</th><th>Grid</th><th>Flexbox</th></tr>
        </thead>
        <tbody>
          <tr><td>Dimensions</td><td>2D</td><td>1D</td></tr>
          <tr><td>Alignment</td><td>Both axes</td><td>Main axis</td></tr>
          <tr><td>Overlap</td><td>Supported</td><td>Not supported</td></tr>
        </tbody>
      </table>

      <h2>Conclusion</h2>
      <blockquote>
        "CSS Grid is the most powerful layout system available in CSS."
        \u2014 Rachel Andrew
      </blockquote>
      <p>In summary, CSS Grid should be your go-to for complex layouts.</p>
    `;
    const issues = validator.validate(html);
    expect(issues).toHaveLength(0);
  });
});
