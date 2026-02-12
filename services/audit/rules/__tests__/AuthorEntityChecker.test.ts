import { describe, it, expect } from 'vitest';
import { AuthorEntityChecker } from '../AuthorEntityChecker';

describe('AuthorEntityChecker', () => {
  const checker = new AuthorEntityChecker();

  // ---------------------------------------------------------------------------
  // Rule 17 — Author entity existence
  // ---------------------------------------------------------------------------

  it('detects missing author entity (rule 17)', () => {
    const issues = checker.validate('<html><body><p>Content</p></body></html>');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-17' }));
  });

  it('passes when author meta present', () => {
    const issues = checker.validate('<meta name="author" content="John"><body></body>');
    expect(issues.find((i) => i.ruleId === 'rule-17')).toBeUndefined();
  });

  it('passes when author class present', () => {
    const issues = checker.validate('<span class="author-name">John Doe</span>');
    expect(issues.find((i) => i.ruleId === 'rule-17')).toBeUndefined();
  });

  it('passes when rel="author" present', () => {
    const issues = checker.validate('<a rel="author" href="/john">John Doe</a>');
    expect(issues.find((i) => i.ruleId === 'rule-17')).toBeUndefined();
  });

  it('passes when itemprop="author" present', () => {
    const issues = checker.validate('<span itemprop="author">John Doe</span>');
    expect(issues.find((i) => i.ruleId === 'rule-17')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 19 — Author Person schema
  // ---------------------------------------------------------------------------

  it('detects missing author schema (rule 19)', () => {
    const issues = checker.validate('<meta name="author" content="John"><body></body>');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-19' }));
  });

  it('passes when Person schema present', () => {
    const html =
      '<script type="application/ld+json">{"@type": "Person", "name": "John"}</script>';
    const issues = checker.validate(html);
    expect(issues.find((i) => i.ruleId === 'rule-19')).toBeUndefined();
  });

  it('passes when author property contains Person schema', () => {
    const html =
      '<script type="application/ld+json">{"@type": "Article", "author": {"@type": "Person", "name": "Jane"}}</script>';
    const issues = checker.validate(html);
    expect(issues.find((i) => i.ruleId === 'rule-19')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Combined — no issues for well-formed pages
  // ---------------------------------------------------------------------------

  it('returns no issues for page with author meta and Person schema', () => {
    const html =
      '<meta name="author" content="John">' +
      '<script type="application/ld+json">{"@type": "Person", "name": "John"}</script>';
    const issues = checker.validate(html);
    expect(issues).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('handles empty HTML', () => {
    const issues = checker.validate('');
    expect(issues).toHaveLength(2); // both rule-17 and rule-19
  });

  it('is case-insensitive for meta name matching', () => {
    const issues = checker.validate('<META NAME="Author" CONTENT="John">');
    expect(issues.find((i) => i.ruleId === 'rule-17')).toBeUndefined();
  });
});
