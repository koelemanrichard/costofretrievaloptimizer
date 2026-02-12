import { describe, it, expect } from 'vitest';
import { ContentFormatValidator } from '../ContentFormatValidator';

describe('ContentFormatValidator', () => {
  const validator = new ContentFormatValidator();

  // -------------------------------------------------------------------------
  // Rule 205 — How-to content should use <ol>, not <ul>
  // -------------------------------------------------------------------------

  it('detects how-to content using <ul> instead of <ol> (rule 205)', () => {
    const html = `
      <h2>How to Install Node.js</h2>
      <ul>
        <li>Download the installer</li>
        <li>Run the setup wizard</li>
        <li>Verify the installation</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-205', severity: 'medium' })
    );
  });

  it('passes how-to content that correctly uses <ol> (rule 205)', () => {
    const html = `
      <h2>How to Install Node.js</h2>
      <ol>
        <li>Download the installer</li>
        <li>Run the setup wizard</li>
        <li>Verify the installation</li>
      </ol>
    `;
    const issues = validator.validate(html);
    expect(issues.find((i) => i.ruleId === 'rule-205')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 206 — Comparison content should use <table>, not lists
  // -------------------------------------------------------------------------

  it('detects comparison content without a table (rule 206)', () => {
    const html = `
      <h2>React vs Vue Comparison</h2>
      <p>React and Vue differ in several ways.</p>
      <ul>
        <li>React uses JSX</li>
        <li>Vue uses templates</li>
        <li>React has a larger ecosystem</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-206', severity: 'medium' })
    );
  });

  it('passes comparison content that includes a table (rule 206)', () => {
    const html = `
      <h2>React vs Vue Comparison</h2>
      <table>
        <thead><tr><th>Feature</th><th>React</th><th>Vue</th></tr></thead>
        <tbody><tr><td>Syntax</td><td>JSX</td><td>Templates</td></tr></tbody>
      </table>
    `;
    const issues = validator.validate(html);
    expect(issues.find((i) => i.ruleId === 'rule-206')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 210 — Long list items (>25 words)
  // -------------------------------------------------------------------------

  it('detects list items exceeding 25 words (rule 210)', () => {
    const longItem =
      'This is a very long list item that contains way too many words and should really be shortened because it goes on and on without stopping and the reader will lose track of the point being made';
    const html = `
      <ul>
        <li>${longItem}</li>
        <li>Short item</li>
        <li>Another short item</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-210', severity: 'low' })
    );
  });

  // -------------------------------------------------------------------------
  // Rule 215 — Lists should have 3-10 items
  // -------------------------------------------------------------------------

  it('detects lists with fewer than 3 items (rule 215)', () => {
    const html = `
      <ul>
        <li>Only one item</li>
        <li>And another</li>
      </ul>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-215', severity: 'low' })
    );
  });

  it('detects lists with more than 10 items (rule 215)', () => {
    const items = Array.from({ length: 12 }, (_, i) => `<li>Item ${i + 1}</li>`).join('\n');
    const html = `<ol>${items}</ol>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-215' })
    );
  });

  // -------------------------------------------------------------------------
  // Rule 216 — Tables must have header rows
  // -------------------------------------------------------------------------

  it('detects tables without header rows (rule 216)', () => {
    const html = `
      <table>
        <tbody>
          <tr><td>Cell 1</td><td>Cell 2</td></tr>
          <tr><td>Cell 3</td><td>Cell 4</td></tr>
        </tbody>
      </table>
    `;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-216', severity: 'high' })
    );
  });

  it('passes tables with <th> elements (rule 216)', () => {
    const html = `
      <table>
        <tr><th>Name</th><th>Value</th></tr>
        <tr><td>A</td><td>1</td></tr>
      </table>
    `;
    const issues = validator.validate(html);
    expect(issues.find((i) => i.ruleId === 'rule-216')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 229 — IR Zone optimization
  // -------------------------------------------------------------------------

  it('detects when target query is not answered in first 400 chars (rule 229)', () => {
    const html = `
      <h1>Introduction</h1>
      <p>Welcome to our website. We have been in business since 2005 and pride ourselves on customer service.
      Our team is dedicated to providing the best experience possible for all visitors.
      We offer a wide range of resources and tutorials covering many topics in the software engineering space.
      Our editorial team reviews every article for accuracy and completeness before publication.</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      <h2>How to Install Python on Windows</h2>
      <p>First download the installer from the official website and run the setup wizard.</p>
    `;
    const issues = validator.validate(html, 'install python windows');
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-229', severity: 'high' })
    );
  });

  it('passes when target query terms appear in first 400 chars (rule 229)', () => {
    const html = `
      <h1>How to Install Python on Windows</h1>
      <p>To install Python on Windows, download the official installer from python.org and run the setup wizard.</p>
    `;
    const issues = validator.validate(html, 'install python windows');
    expect(issues.find((i) => i.ruleId === 'rule-229')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Clean pass — well-formatted content
  // -------------------------------------------------------------------------

  it('returns no issues for well-formatted content', () => {
    const html = `
      <h1>Understanding TypeScript Generics</h1>
      <p>TypeScript generics allow you to write reusable, type-safe code.</p>
      <ol>
        <li>Define a generic type parameter</li>
        <li>Use it in your function signature</li>
        <li>Pass the type when calling</li>
      </ol>
      <table>
        <thead><tr><th>Type</th><th>Usage</th></tr></thead>
        <tbody><tr><td>T</td><td>General purpose</td></tr></tbody>
      </table>
    `;
    const issues = validator.validate(html);
    expect(issues).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it('skips IR zone check when no target query is provided', () => {
    const html = '<p>Some content here.</p>';
    const issues = validator.validate(html);
    expect(issues.find((i) => i.ruleId === 'rule-229')).toBeUndefined();
  });

  it('handles empty HTML input without errors', () => {
    const issues = validator.validate('');
    expect(issues).toHaveLength(0);
  });
});
