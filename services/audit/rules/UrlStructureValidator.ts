/**
 * UrlStructureValidator
 *
 * Validates URL structure best practices for SEO audit purposes.
 * Checks URL length, slug word count, word separators, directory depth,
 * keyword presence, stop words, trailing slash consistency, and file extensions.
 *
 * Rules implemented:
 *   336 - URL path length should be <=75 characters
 *   337 - URL slug should contain 3-5 meaningful words
 *   339 - URLs should use hyphens as word separators (not underscores, spaces, camelCase)
 *   341 - URL directory depth should be <=3 levels
 *   342 - URL slug should contain at least one target keyword word
 *   343 - URL should not contain common stop words
 *   344 - Trailing slash usage should be consistent across URLs
 *   345 - URLs should not end with file extensions (.html, .php, etc.)
 *
 * Rules 338 (lowercase URLs) and 340 (no session IDs) are implemented
 * in UrlArchitectureAuditor and intentionally skipped here.
 */

export interface UrlStructureInput {
  url: string;
  targetKeyword?: string;
  /** Other URLs on the site for consistency checks */
  otherUrls?: string[];
}

export interface UrlStructureIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

/** Common stop words that add no SEO value in URLs. */
const URL_STOP_WORDS = [
  'the',
  'and',
  'of',
  'to',
  'in',
  'a',
  'an',
  'for',
  'is',
];

/** File extensions that indicate non-clean URLs. */
const FILE_EXTENSIONS = ['.html', '.php', '.asp', '.aspx', '.jsp', '.htm'];

export class UrlStructureValidator {
  validate(input: UrlStructureInput): UrlStructureIssue[] {
    const issues: UrlStructureIssue[] = [];

    const pathname = this.getPathname(input.url);

    this.checkUrlLength(pathname, input, issues);           // Rule 336
    this.checkSlugWordCount(pathname, input, issues);       // Rule 337
    this.checkWordSeparators(pathname, input, issues);      // Rule 339
    this.checkUrlDepth(pathname, input, issues);            // Rule 341
    this.checkTargetKeyword(pathname, input, issues);       // Rule 342
    this.checkStopWords(pathname, input, issues);           // Rule 343
    this.checkTrailingSlashConsistency(input, issues);      // Rule 344
    this.checkFileExtensions(pathname, input, issues);      // Rule 345

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Rule 336 — URL path length should be <=75 characters
  // ---------------------------------------------------------------------------

  private checkUrlLength(
    pathname: string,
    input: UrlStructureInput,
    issues: UrlStructureIssue[]
  ): void {
    if (pathname.length > 75) {
      issues.push({
        ruleId: 'rule-336',
        severity: 'medium',
        title: 'URL path is too long',
        description:
          `The URL path "${pathname}" is ${pathname.length} characters long, exceeding the ` +
          'recommended maximum of 75 characters. Long URLs are harder to share, may be ' +
          'truncated in SERPs, and are less user-friendly.',
        affectedElement: input.url,
        exampleFix:
          'Shorten the URL path by removing unnecessary words and keeping only the most relevant terms.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 337 — URL slug should contain 3-5 meaningful words
  // ---------------------------------------------------------------------------

  private checkSlugWordCount(
    pathname: string,
    input: UrlStructureInput,
    issues: UrlStructureIssue[]
  ): void {
    // Skip root path or paths without meaningful slugs
    if (pathname === '/' || pathname === '') return;

    const words = this.extractSlugWords(pathname);

    // Only check if there are slug words to evaluate
    if (words.length === 0) return;

    if (words.length < 3) {
      issues.push({
        ruleId: 'rule-337',
        severity: 'low',
        title: 'URL slug has too few words',
        description:
          `The URL path "${pathname}" contains only ${words.length} meaningful word(s). ` +
          'URLs with 3-5 words provide better context for both search engines and users.',
        affectedElement: input.url,
        exampleFix:
          'Add descriptive words to the URL slug to better describe the page content (aim for 3-5 words).',
      });
    } else if (words.length > 5) {
      issues.push({
        ruleId: 'rule-337',
        severity: 'low',
        title: 'URL slug has too many words',
        description:
          `The URL path "${pathname}" contains ${words.length} words. ` +
          'URLs with more than 5 words can look spammy and may be less effective for SEO. ' +
          'Aim for 3-5 concise, descriptive words.',
        affectedElement: input.url,
        exampleFix:
          'Remove unnecessary words from the URL slug, keeping only the most important 3-5 terms.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 339 — URLs should use hyphens as word separators
  // ---------------------------------------------------------------------------

  private checkWordSeparators(
    pathname: string,
    input: UrlStructureInput,
    issues: UrlStructureIssue[]
  ): void {
    if (pathname === '/' || pathname === '') return;

    const problems: string[] = [];

    if (pathname.includes('_')) {
      problems.push('underscores (_)');
    }

    if (pathname.includes('%20')) {
      problems.push('encoded spaces (%20)');
    }

    // camelCase detection: a lowercase letter immediately followed by an uppercase letter
    if (/[a-z][A-Z]/.test(pathname)) {
      problems.push('camelCase');
    }

    if (problems.length > 0) {
      issues.push({
        ruleId: 'rule-339',
        severity: 'medium',
        title: 'URL uses incorrect word separators',
        description:
          `The URL path "${pathname}" uses ${problems.join(' and ')} instead of hyphens. ` +
          'Search engines treat hyphens as word separators but may not treat underscores, ' +
          'spaces, or camelCase the same way, potentially missing keyword signals.',
        affectedElement: input.url,
        exampleFix:
          'Replace underscores, spaces, and camelCase with hyphens (-). ' +
          `Example: "${this.suggestHyphenatedPath(pathname)}"`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 341 — URL directory depth should be <=3 levels
  // ---------------------------------------------------------------------------

  private checkUrlDepth(
    pathname: string,
    input: UrlStructureInput,
    issues: UrlStructureIssue[]
  ): void {
    if (pathname === '/' || pathname === '') return;

    // Remove trailing slash for counting
    const cleanPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    // Count directory segments (split by / and filter empty segments)
    const segments = cleanPath.split('/').filter((s) => s.length > 0);
    const depth = segments.length;

    if (depth > 3) {
      issues.push({
        ruleId: 'rule-341',
        severity: 'medium',
        title: 'URL directory depth is too deep',
        description:
          `The URL path "${pathname}" has ${depth} directory levels, exceeding the recommended ` +
          'maximum of 3. Deep URL hierarchies suggest content is far from the root, which can ' +
          'reduce crawl priority and make pages harder to discover.',
        affectedElement: input.url,
        exampleFix:
          'Flatten the URL structure. For example, /a/b/c/d/page could become /a/b/page or /a/page.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 342 — URL slug should contain target keyword
  // ---------------------------------------------------------------------------

  private checkTargetKeyword(
    pathname: string,
    input: UrlStructureInput,
    issues: UrlStructureIssue[]
  ): void {
    if (!input.targetKeyword) return;
    if (pathname === '/' || pathname === '') return;

    const pathLower = pathname.toLowerCase();
    const keywordWords = input.targetKeyword
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2); // Skip very short words like "a", "of"

    if (keywordWords.length === 0) return;

    const hasKeywordWord = keywordWords.some((word) => pathLower.includes(word));

    if (!hasKeywordWord) {
      issues.push({
        ruleId: 'rule-342',
        severity: 'low',
        title: 'URL does not contain target keyword',
        description:
          `The URL path "${pathname}" does not contain any word from the target keyword ` +
          `"${input.targetKeyword}". Including target keyword terms in the URL slug helps ` +
          'search engines understand the page topic and can improve click-through rates.',
        affectedElement: input.url,
        exampleFix:
          `Include at least one word from "${input.targetKeyword}" in the URL slug.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 343 — URL should not contain stop words
  // ---------------------------------------------------------------------------

  private checkStopWords(
    pathname: string,
    input: UrlStructureInput,
    issues: UrlStructureIssue[]
  ): void {
    if (pathname === '/' || pathname === '') return;

    const words = this.extractSlugWords(pathname).map((w) => w.toLowerCase());
    const foundStopWords = words.filter((w) => URL_STOP_WORDS.includes(w));

    // Only flag if more than 1 stop word found (a single stop word can be acceptable)
    if (foundStopWords.length > 1) {
      const unique = [...new Set(foundStopWords)];
      issues.push({
        ruleId: 'rule-343',
        severity: 'low',
        title: 'URL contains stop words',
        description:
          `The URL path "${pathname}" contains ${foundStopWords.length} stop word(s): ` +
          `${unique.join(', ')}. Stop words add no SEO value and make URLs longer without benefit.`,
        affectedElement: input.url,
        exampleFix:
          `Remove stop words from the URL. For example, "/the-best-guide-for-seo" ` +
          'could become "/best-guide-seo".',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 344 — Trailing slash consistency
  // ---------------------------------------------------------------------------

  private checkTrailingSlashConsistency(
    input: UrlStructureInput,
    issues: UrlStructureIssue[]
  ): void {
    if (!input.otherUrls || input.otherUrls.length === 0) return;

    // Combine current URL with other URLs for analysis
    const allUrls = [input.url, ...input.otherUrls];

    // Only consider URLs with actual paths (not just the root)
    const urlsWithPaths = allUrls
      .map((u) => this.getPathname(u))
      .filter((p) => p !== '/' && p !== '');

    if (urlsWithPaths.length < 2) return;

    const withTrailing = urlsWithPaths.filter((p) => p.endsWith('/'));
    const withoutTrailing = urlsWithPaths.filter((p) => !p.endsWith('/'));

    // Flag if both groups exist and neither dominates (>80%)
    if (withTrailing.length > 0 && withoutTrailing.length > 0) {
      const total = urlsWithPaths.length;
      const trailingPct = (withTrailing.length / total) * 100;
      const noTrailingPct = (withoutTrailing.length / total) * 100;

      // Flag if neither convention dominates (neither >80%)
      if (trailingPct <= 80 && noTrailingPct <= 80) {
        issues.push({
          ruleId: 'rule-344',
          severity: 'medium',
          title: 'Inconsistent trailing slash usage',
          description:
            `URLs on the site use inconsistent trailing slash patterns: ${withTrailing.length} URL(s) ` +
            `use trailing slashes and ${withoutTrailing.length} do not. Inconsistent trailing slash ` +
            'usage can create duplicate content issues if both versions are accessible.',
          affectedElement: input.url,
          exampleFix:
            'Choose one convention (with or without trailing slashes) and apply it consistently. ' +
            'Set up redirects from the non-preferred format to the preferred one.',
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 345 — URLs should not end with file extensions
  // ---------------------------------------------------------------------------

  private checkFileExtensions(
    pathname: string,
    input: UrlStructureInput,
    issues: UrlStructureIssue[]
  ): void {
    if (pathname === '/' || pathname === '') return;

    const pathLower = pathname.toLowerCase();
    const matchedExtension = FILE_EXTENSIONS.find((ext) =>
      pathLower.endsWith(ext)
    );

    if (matchedExtension) {
      issues.push({
        ruleId: 'rule-345',
        severity: 'low',
        title: 'URL contains a file extension',
        description:
          `The URL path "${pathname}" ends with "${matchedExtension}". ` +
          'Clean URLs without file extensions are preferred as they are more flexible ' +
          '(technology-agnostic), more user-friendly, and easier to maintain if the backend changes.',
        affectedElement: input.url,
        exampleFix:
          `Remove the file extension: "${pathname.replace(new RegExp(matchedExtension.replace('.', '\\.') + '$', 'i'), '')}"`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Extract the pathname from a URL string, falling back to the raw string
   * if URL parsing fails.
   */
  private getPathname(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  /**
   * Extract meaningful words from a URL path by splitting on slashes and hyphens,
   * and filtering out empty segments.
   */
  private extractSlugWords(pathname: string): string[] {
    return pathname
      .split(/[\/-]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Suggest a hyphenated version of a pathname by replacing underscores,
   * encoded spaces, and camelCase with hyphens.
   */
  private suggestHyphenatedPath(pathname: string): string {
    return pathname
      .replace(/%20/g, '-')
      .replace(/_/g, '-')
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }
}
