/**
 * AiCrawlManagementValidator
 *
 * Checks robots.txt for AI crawler policies and HTML meta tags for AI-specific directives.
 * Reports which AI crawlers are addressed and which are not. All findings are low severity
 * (informational) — the goal is awareness, not penalty.
 *
 * Rules implemented:
 *   rule-ai-crawl-policy - AI crawler User-agent coverage in robots.txt
 *   rule-ai-meta-tags    - AI-specific meta directives (noai, noimageai)
 */

export interface AiCrawlIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

const AI_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'CCBot',
  'PerplexityBot',
  'Bytespider',
  'ChatGPT-User',
];

export class AiCrawlManagementValidator {
  validate(robotsTxt: string): AiCrawlIssue[] {
    const issues: AiCrawlIssue[] = [];
    const lower = robotsTxt.toLowerCase();

    const addressed = AI_CRAWLERS.filter(crawler =>
      lower.includes(`user-agent: ${crawler.toLowerCase()}`)
    );
    const missing = AI_CRAWLERS.filter(crawler =>
      !lower.includes(`user-agent: ${crawler.toLowerCase()}`)
    );

    if (missing.length > 0) {
      issues.push({
        ruleId: 'rule-ai-crawl-policy',
        severity: 'low',
        title: `${missing.length} AI crawlers not addressed in robots.txt`,
        description: `These AI crawlers have no explicit policy: ${missing.join(', ')}. ${
          addressed.length > 0
            ? `${addressed.length} crawlers are addressed: ${addressed.join(', ')}.`
            : 'No AI crawlers are currently addressed.'
        }`,
        exampleFix: `Add User-agent directives for: ${missing.join(', ')}`,
      });
    }

    // Check for wildcard User-agent that might implicitly cover AI crawlers
    const hasWildcard = /user-agent:\s*\*/i.test(robotsTxt);
    if (hasWildcard && addressed.length === 0) {
      issues.push({
        ruleId: 'rule-ai-crawl-wildcard',
        severity: 'low',
        title: 'AI crawlers only covered by wildcard User-agent',
        description:
          'A wildcard (*) User-agent rule exists but no AI-specific crawler rules are defined. ' +
          'Consider adding explicit rules for AI crawlers to differentiate training crawls from search crawls.',
        exampleFix: 'User-agent: GPTBot\nDisallow: /private/',
      });
    }

    return issues;
  }

  validateMetaTags(html: string): AiCrawlIssue[] {
    const issues: AiCrawlIssue[] = [];

    const hasNoai = /content="[^"]*noai[^"]*"/i.test(html);
    const hasNoimageai = /content="[^"]*noimageai[^"]*"/i.test(html);

    if (!hasNoai && !hasNoimageai) {
      issues.push({
        ruleId: 'rule-ai-meta-tags',
        severity: 'low',
        title: 'No AI-specific meta directives found',
        description:
          'Page does not include noai or noimageai meta directives. ' +
          'These can be used to control AI training usage of your content.',
        exampleFix:
          'Add <meta name="robots" content="noai, noimageai"> if you want to opt out of AI training',
      });
    }

    return issues;
  }
}
