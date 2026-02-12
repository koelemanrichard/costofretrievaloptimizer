/**
 * AuthorEntityChecker
 *
 * Checks for author entity signals in HTML content.
 * Validates E-E-A-T authorship signals that strengthen topical authority.
 *
 * Rules implemented:
 *   rule-17 - Author entity should exist (meta, schema, or byline)
 *   rule-19 - Author should have Person schema markup
 */

export interface AuthorIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class AuthorEntityChecker {
  /**
   * Validate author entity signals in the given HTML.
   * Returns an array of issues found (empty if all checks pass).
   */
  validate(html: string): AuthorIssue[] {
    const issues: AuthorIssue[] = [];

    // Rule 17: Author entity should exist — check for author meta, schema, or byline
    if (!this.hasAuthorSignal(html)) {
      issues.push({
        ruleId: 'rule-17',
        severity: 'high',
        title: 'No author entity found',
        description:
          'The page has no identifiable author entity (no author meta, schema, or byline). ' +
          'Author signals are a key E-E-A-T factor that search engines use to evaluate content credibility.',
        exampleFix:
          'Add an author byline, author meta tag, or Person schema for the author.',
      });
    }

    // Rule 19: Author should have Person schema
    if (!this.hasAuthorSchema(html)) {
      issues.push({
        ruleId: 'rule-19',
        severity: 'medium',
        title: 'No author schema markup',
        description:
          'The page lacks a Person schema for the author. Author schema enhances E-E-A-T signals ' +
          'and helps search engines connect the content to a known entity.',
        exampleFix:
          'Add JSON-LD Person schema with name, url, and sameAs properties.',
      });
    }

    return issues;
  }

  /**
   * Check for any common author signal in the HTML:
   *   - <meta name="author" ...>
   *   - rel="author" link/anchor
   *   - class containing "author"
   *   - itemprop="author"
   *   - JSON-LD "@type": "Person"
   */
  hasAuthorSignal(html: string): boolean {
    const authorMeta = /<meta[^>]+name=["']author["']/i.test(html);
    const authorRel = /rel=["']author["']/i.test(html);
    const authorClass = /class=["'][^"]*author[^"]*["']/i.test(html);
    const authorItemprop = /itemprop=["']author["']/i.test(html);
    const authorSchema = /"@type"\s*:\s*"Person"/i.test(html);
    return authorMeta || authorRel || authorClass || authorItemprop || authorSchema;
  }

  /**
   * Check for structured Person schema markup:
   *   - JSON-LD with "@type": "Person"
   *   - JSON-LD with "author": { "@type": "Person" }
   */
  hasAuthorSchema(html: string): boolean {
    const hasPersonSchema = /"@type"\s*:\s*"Person"/i.test(html);
    const hasAuthorProp = /"author"\s*:\s*\{[^}]*"@type"\s*:\s*"Person"/i.test(html);
    return hasPersonSchema || hasAuthorProp;
  }
}
