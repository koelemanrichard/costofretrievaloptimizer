/**
 * RobotsTxtParser
 *
 * Parses robots.txt files into structured groups and validates indexing signals.
 * Also extracts and validates meta robots directives from HTML.
 *
 * Rules implemented:
 *   371 - Page blocked by robots.txt when it should be indexed
 *   372 - Page has noindex meta tag when it should be indexed
 */

export interface RobotsIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

interface RobotsRule {
  type: 'allow' | 'disallow';
  path: string;
}

interface RobotsGroup {
  userAgents: string[];
  rules: RobotsRule[];
}

export class RobotsTxtParser {
  /**
   * Parse robots.txt into structured groups.
   *
   * Parsing rules:
   * - Lines starting with `#` are comments (stripped before processing)
   * - `User-agent:` starts or extends a group (consecutive User-agent lines share a group)
   * - `Disallow:` and `Allow:` are rules within the current group
   * - A blank line or a new User-agent after rules have been added starts a new group
   * - Empty `Disallow:` values are ignored (they mean "allow everything")
   */
  parse(robotsTxt: string): RobotsGroup[] {
    const groups: RobotsGroup[] = [];
    let currentGroup: RobotsGroup | null = null;

    const lines = robotsTxt.split(/\r?\n/);

    for (const rawLine of lines) {
      // Strip comments and trim whitespace
      const line = rawLine.replace(/#.*$/, '').trim();
      if (!line) continue;

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const directive = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();

      if (directive === 'user-agent') {
        // Start a new group if there is no current group or the current group already has rules
        if (!currentGroup || currentGroup.rules.length > 0) {
          currentGroup = { userAgents: [], rules: [] };
          groups.push(currentGroup);
        }
        currentGroup.userAgents.push(value);
      } else if (directive === 'disallow' && currentGroup) {
        // Empty Disallow means allow everything — skip adding it as a rule
        if (value) {
          currentGroup.rules.push({ type: 'disallow', path: value });
        }
      } else if (directive === 'allow' && currentGroup) {
        if (value) {
          currentGroup.rules.push({ type: 'allow', path: value });
        }
      }
    }

    return groups;
  }

  /**
   * Check if a URL path is blocked by the robots.txt rules.
   *
   * Uses the most specific matching rule (longest path match).
   * When two rules match with the same specificity, Allow takes precedence.
   * Checks the specific user-agent first, then falls back to the wildcard `*` group.
   */
  isBlocked(robotsTxt: string, urlPath: string, userAgent = '*'): boolean {
    const groups = this.parse(robotsTxt);

    // Find the applicable group: prefer an exact user-agent match, fall back to *
    let applicableGroup: RobotsGroup | undefined;

    for (const group of groups) {
      const agents = group.userAgents.map((a) => a.toLowerCase());
      if (agents.includes(userAgent.toLowerCase())) {
        applicableGroup = group;
        break;
      }
    }

    if (!applicableGroup) {
      for (const group of groups) {
        if (group.userAgents.includes('*')) {
          applicableGroup = group;
          break;
        }
      }
    }

    if (!applicableGroup) return false;

    // Evaluate rules — longest matching path wins. On tie, Allow > Disallow.
    let bestMatch: { type: 'allow' | 'disallow'; length: number } | null = null;

    for (const rule of applicableGroup.rules) {
      if (this.pathMatchesPattern(urlPath, rule.path)) {
        const matchLength = rule.path.length;
        if (
          !bestMatch ||
          matchLength > bestMatch.length ||
          (matchLength === bestMatch.length && rule.type === 'allow')
        ) {
          bestMatch = { type: rule.type, length: matchLength };
        }
      }
    }

    return bestMatch?.type === 'disallow';
  }

  /**
   * Extract meta robots content from HTML.
   *
   * Matches `<meta name="robots" content="noindex, nofollow">` and returns
   * an array of individual directives, e.g. `['noindex', 'nofollow']`.
   * Handles both attribute orderings (name before content and vice versa).
   */
  extractMetaRobots(html: string): string[] {
    const match =
      html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);

    if (!match?.[1]) return [];

    return match[1]
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
  }

  /**
   * Run validation checks for robots.txt and meta robots directives.
   *
   * Rule 371: Flags when a URL is blocked by robots.txt but should be indexed.
   * Rule 372: Flags when a page has a noindex meta tag but should be indexed.
   */
  validate(context: {
    html: string;
    robotsTxt?: string;
    urlPath: string;
    shouldBeIndexed?: boolean;
  }): RobotsIssue[] {
    const issues: RobotsIssue[] = [];

    // Rule 371: Check if URL is blocked by robots.txt when it should be indexed
    if (context.robotsTxt && context.shouldBeIndexed !== false) {
      if (this.isBlocked(context.robotsTxt, context.urlPath)) {
        issues.push({
          ruleId: 'rule-371',
          severity: 'critical',
          title: 'Page blocked by robots.txt',
          description:
            `The URL path "${context.urlPath}" is blocked by robots.txt but should be indexed.`,
          affectedElement: context.urlPath,
          exampleFix:
            'Update robots.txt to allow this URL, or add an Allow: directive.',
        });
      }
    }

    // Rule 372: Check meta robots noindex when page should be indexed
    const directives = this.extractMetaRobots(context.html);
    if (context.shouldBeIndexed !== false && directives.includes('noindex')) {
      issues.push({
        ruleId: 'rule-372',
        severity: 'critical',
        title: 'Page has noindex meta tag',
        description:
          'The page contains a meta robots noindex directive but should be indexed.',
        affectedElement: `<meta name="robots" content="${directives.join(', ')}">`,
        exampleFix:
          'Remove the noindex directive from the meta robots tag.',
      });
    }

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Simple prefix-based pattern matching with support for trailing `*` wildcard
   * and `$` end-of-path anchor per the robots.txt specification.
   */
  private pathMatchesPattern(path: string, pattern: string): boolean {
    if (pattern.endsWith('$')) {
      const prefix = pattern.slice(0, -1);
      return path === prefix;
    }

    const cleanPattern = pattern.endsWith('*')
      ? pattern.slice(0, -1)
      : pattern;

    return path.startsWith(cleanPattern);
  }
}
