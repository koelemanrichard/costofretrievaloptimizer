import { describe, it, expect } from 'vitest';
import { UrlStructureValidator } from '../UrlStructureValidator';
import type { UrlStructureInput } from '../UrlStructureValidator';

describe('UrlStructureValidator', () => {
  const validator = new UrlStructureValidator();

  // ---------------------------------------------------------------------------
  // Rule 336 — URL path length
  // ---------------------------------------------------------------------------
  describe('rule-336: URL path length', () => {
    it('flags URL path exceeding 75 characters', () => {
      const longSlug = 'a-very-long-url-slug-that-keeps-going-and-going-and-going-until-it-exceeds-the-limit';
      const issues = validator.validate({
        url: `https://example.com/${longSlug}`,
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-336', severity: 'medium' })
      );
    });

    it('passes URL path within 75 characters', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog/seo-best-practices',
      });
      expect(issues.find((i) => i.ruleId === 'rule-336')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 337 — URL slug word count
  // ---------------------------------------------------------------------------
  describe('rule-337: URL slug word count', () => {
    it('flags URL slug with too many words (>5)', () => {
      const issues = validator.validate({
        url: 'https://example.com/how-to-build-a-great-website-from-scratch',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-337' })
      );
      // Should complain about too many words
      const issue = issues.find((i) => i.ruleId === 'rule-337');
      expect(issue?.title).toContain('too many words');
    });

    it('flags URL slug with too few words (<3)', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-337' })
      );
      const issue = issues.find((i) => i.ruleId === 'rule-337');
      expect(issue?.title).toContain('too few words');
    });

    it('passes URL slug with 3-5 words', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog/seo-best-practices',
      });
      expect(issues.find((i) => i.ruleId === 'rule-337')).toBeUndefined();
    });

    it('skips root path', () => {
      const issues = validator.validate({
        url: 'https://example.com/',
      });
      expect(issues.find((i) => i.ruleId === 'rule-337')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 339 — Word separators
  // ---------------------------------------------------------------------------
  describe('rule-339: word separators', () => {
    it('flags underscores in URL path', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog/my_great_post',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-339', severity: 'medium' })
      );
      const issue = issues.find((i) => i.ruleId === 'rule-339');
      expect(issue?.description).toContain('underscores');
    });

    it('flags encoded spaces (%20) in URL path', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog/my%20great%20post',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-339' })
      );
      const issue = issues.find((i) => i.ruleId === 'rule-339');
      expect(issue?.description).toContain('spaces');
    });

    it('flags camelCase in URL path', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog/myGreatPost',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-339' })
      );
      const issue = issues.find((i) => i.ruleId === 'rule-339');
      expect(issue?.description).toContain('camelCase');
    });

    it('passes clean hyphenated URL', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog/my-great-post',
      });
      expect(issues.find((i) => i.ruleId === 'rule-339')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 341 — URL directory depth
  // ---------------------------------------------------------------------------
  describe('rule-341: URL directory depth', () => {
    it('flags URL with more than 3 directory levels', () => {
      const issues = validator.validate({
        url: 'https://example.com/a/b/c/d/page',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-341', severity: 'medium' })
      );
    });

    it('passes URL with exactly 3 directory levels', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog/category/post',
      });
      expect(issues.find((i) => i.ruleId === 'rule-341')).toBeUndefined();
    });

    it('passes URL with 1 directory level', () => {
      const issues = validator.validate({
        url: 'https://example.com/about',
      });
      expect(issues.find((i) => i.ruleId === 'rule-341')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 342 — URL contains target keyword
  // ---------------------------------------------------------------------------
  describe('rule-342: target keyword in URL', () => {
    it('flags when target keyword is missing from URL', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog/latest-updates',
        targetKeyword: 'react performance optimization',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-342', severity: 'low' })
      );
    });

    it('passes when at least one keyword word is present', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog/react-performance-tips',
        targetKeyword: 'react performance optimization',
      });
      expect(issues.find((i) => i.ruleId === 'rule-342')).toBeUndefined();
    });

    it('skips when no target keyword is provided', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog/some-post',
      });
      expect(issues.find((i) => i.ruleId === 'rule-342')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 343 — No stop words in URL
  // ---------------------------------------------------------------------------
  describe('rule-343: stop words in URL', () => {
    it('flags URL with multiple stop words', () => {
      const issues = validator.validate({
        url: 'https://example.com/the-best-guide-for-seo',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-343', severity: 'low' })
      );
    });

    it('passes URL without stop words', () => {
      const issues = validator.validate({
        url: 'https://example.com/best-seo-guide',
      });
      expect(issues.find((i) => i.ruleId === 'rule-343')).toBeUndefined();
    });

    it('passes URL with only one stop word (tolerance)', () => {
      const issues = validator.validate({
        url: 'https://example.com/guide-for-beginners',
      });
      expect(issues.find((i) => i.ruleId === 'rule-343')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 344 — Trailing slash consistency
  // ---------------------------------------------------------------------------
  describe('rule-344: trailing slash consistency', () => {
    it('flags inconsistent trailing slash usage', () => {
      const issues = validator.validate({
        url: 'https://example.com/page-one',
        otherUrls: [
          'https://example.com/page-two/',
          'https://example.com/page-three',
          'https://example.com/page-four/',
        ],
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-344', severity: 'medium' })
      );
    });

    it('passes consistent trailing slash usage (all without)', () => {
      const issues = validator.validate({
        url: 'https://example.com/page-one',
        otherUrls: [
          'https://example.com/page-two',
          'https://example.com/page-three',
        ],
      });
      expect(issues.find((i) => i.ruleId === 'rule-344')).toBeUndefined();
    });

    it('passes consistent trailing slash usage (all with)', () => {
      const issues = validator.validate({
        url: 'https://example.com/page-one/',
        otherUrls: [
          'https://example.com/page-two/',
          'https://example.com/page-three/',
        ],
      });
      expect(issues.find((i) => i.ruleId === 'rule-344')).toBeUndefined();
    });

    it('skips when no otherUrls provided', () => {
      const issues = validator.validate({
        url: 'https://example.com/page',
      });
      expect(issues.find((i) => i.ruleId === 'rule-344')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 345 — No file extensions
  // ---------------------------------------------------------------------------
  describe('rule-345: no file extensions', () => {
    it('flags .html extension in URL', () => {
      const issues = validator.validate({
        url: 'https://example.com/about.html',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-345', severity: 'low' })
      );
    });

    it('flags .php extension in URL', () => {
      const issues = validator.validate({
        url: 'https://example.com/contact.php',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-345' })
      );
    });

    it('flags .aspx extension in URL', () => {
      const issues = validator.validate({
        url: 'https://example.com/products/list.aspx',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-345' })
      );
    });

    it('passes clean URL without file extension', () => {
      const issues = validator.validate({
        url: 'https://example.com/about',
      });
      expect(issues.find((i) => i.ruleId === 'rule-345')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Integration: combined scenarios
  // ---------------------------------------------------------------------------
  describe('combined scenarios', () => {
    it('returns zero issues for a fully clean URL', () => {
      const issues = validator.validate({
        url: 'https://example.com/blog/seo-best-practices',
        targetKeyword: 'seo best practices',
        otherUrls: [
          'https://example.com/blog/content-strategy',
          'https://example.com/blog/keyword-research',
        ],
      });
      expect(issues).toHaveLength(0);
    });

    it('reports multiple issues for a badly structured URL', () => {
      // Path = /a/b/c/d/the-best_complete-guide-for-absolute-beginners-and-everyone-else-who-wants-to-learn.html
      // Length: >75 chars (rule 336)
      // Words (split by / and -): a, b, c, d, the, best_complete, guide, for, absolute, beginners, and, everyone, else, who, wants, to, learn.html => >5 words (rule 337)
      // Underscores: best_complete (rule 339)
      // Depth: 5 levels (rule 341)
      // No keyword match for "react hooks tutorial" (rule 342)
      // Stop words: the, for, and, to => 4 stop words (rule 343)
      // Mixed trailing slashes with otherUrls (rule 344)
      // .html extension (rule 345)
      const input: UrlStructureInput = {
        url: 'https://example.com/a/b/c/d/the-best_complete-guide-for-absolute-beginners-and-everyone-else-who-wants-to-learn.html',
        targetKeyword: 'react hooks tutorial',
        otherUrls: [
          'https://example.com/page-one/',
          'https://example.com/page-two',
        ],
      };
      const issues = validator.validate(input);
      const ruleIds = issues.map((i) => i.ruleId);

      // Should trigger all 8 active rules
      expect(ruleIds).toContain('rule-336');
      expect(ruleIds).toContain('rule-337');
      expect(ruleIds).toContain('rule-339');
      expect(ruleIds).toContain('rule-341');
      expect(ruleIds).toContain('rule-342');
      expect(ruleIds).toContain('rule-343');
      expect(ruleIds).toContain('rule-344');
      expect(ruleIds).toContain('rule-345');
    });
  });
});
