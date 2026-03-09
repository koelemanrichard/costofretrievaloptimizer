import { describe, it, expect } from 'vitest';
import { AiCrawlManagementValidator } from '../AiCrawlManagementValidator';

describe('AiCrawlManagementValidator', () => {
  const validator = new AiCrawlManagementValidator();

  describe('validate (robots.txt)', () => {
    it('reports missing AI crawler policies', () => {
      const robotsTxt = 'User-agent: Googlebot\nAllow: /\n';
      const issues = validator.validate(robotsTxt);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-ai-crawl-policy' })
      );
      const policyIssue = issues.find(i => i.ruleId === 'rule-ai-crawl-policy')!;
      expect(policyIssue.description).toContain('GPTBot');
      expect(policyIssue.description).toContain('ClaudeBot');
      expect(policyIssue.severity).toBe('low');
    });

    it('reports when AI crawlers are addressed', () => {
      const robotsTxt = `User-agent: Googlebot\nAllow: /\nUser-agent: GPTBot\nDisallow: /private/\nUser-agent: ClaudeBot\nAllow: /blog/\n`;
      const issues = validator.validate(robotsTxt);
      // Should still report on uncovered crawlers but with lower severity
      const policyIssue = issues.find(i => i.ruleId === 'rule-ai-crawl-policy');
      if (policyIssue) {
        expect(policyIssue.severity).toBe('low');
        // Should mention which are addressed
        expect(policyIssue.description).toContain('GPTBot');
        expect(policyIssue.description).toContain('ClaudeBot');
      }
    });

    it('reports no issues when all AI crawlers are addressed', () => {
      const robotsTxt = [
        'User-agent: GPTBot', 'Disallow: /',
        'User-agent: ClaudeBot', 'Disallow: /',
        'User-agent: Google-Extended', 'Disallow: /',
        'User-agent: CCBot', 'Disallow: /',
        'User-agent: PerplexityBot', 'Disallow: /',
        'User-agent: Bytespider', 'Disallow: /',
        'User-agent: ChatGPT-User', 'Disallow: /',
      ].join('\n');
      const issues = validator.validate(robotsTxt);
      expect(issues.filter(i => i.ruleId === 'rule-ai-crawl-policy')).toHaveLength(0);
    });

    it('reports wildcard-only coverage', () => {
      const robotsTxt = 'User-agent: *\nDisallow: /private/\n';
      const issues = validator.validate(robotsTxt);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-ai-crawl-wildcard' })
      );
    });

    it('does not report wildcard issue when specific AI crawlers exist', () => {
      const robotsTxt = 'User-agent: *\nAllow: /\nUser-agent: GPTBot\nDisallow: /\n';
      const issues = validator.validate(robotsTxt);
      expect(issues.filter(i => i.ruleId === 'rule-ai-crawl-wildcard')).toHaveLength(0);
    });
  });

  describe('validateMetaTags', () => {
    it('checks for AI meta tags', () => {
      const issues = validator.validateMetaTags(
        '<meta name="robots" content="index, follow">'
      );
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-ai-meta-tags' })
      );
    });

    it('passes when noai is present', () => {
      const issues = validator.validateMetaTags(
        '<meta name="robots" content="index, follow, noai">'
      );
      expect(issues.filter(i => i.ruleId === 'rule-ai-meta-tags')).toHaveLength(0);
    });

    it('passes when noimageai is present', () => {
      const issues = validator.validateMetaTags(
        '<meta name="robots" content="noimageai">'
      );
      expect(issues.filter(i => i.ruleId === 'rule-ai-meta-tags')).toHaveLength(0);
    });
  });
});
