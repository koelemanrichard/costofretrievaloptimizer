// services/audit/rules/HreflangValidator.ts

/**
 * HreflangValidator
 *
 * Validates hreflang annotations for multilingual sites.
 * Ensures bidirectional symmetry, valid language codes,
 * x-default presence, and self-referencing tags.
 */

export interface HreflangTag {
  /** Language code (e.g., 'en', 'nl', 'de') */
  lang: string;
  /** URL for that language version */
  href: string;
}

export interface HreflangIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  exampleFix?: string;
}

export interface HreflangReport {
  /** Total hreflang tags found */
  totalTags: number;
  /** Unique languages found */
  languages: string[];
  /** Issues found */
  issues: HreflangIssue[];
  /** Is x-default present? */
  hasXDefault: boolean;
  /** Is self-referencing tag present? */
  hasSelfReference: boolean;
  /** Symmetry score (0-100) */
  symmetryScore: number;
}

const VALID_LANGUAGE_CODES = new Set([
  'en', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
  'ar', 'hi', 'bn', 'pl', 'uk', 'sv', 'da', 'no', 'fi', 'cs', 'sk',
  'ro', 'hu', 'el', 'tr', 'th', 'vi', 'id', 'ms', 'tl', 'he', 'fa',
  'en-us', 'en-gb', 'en-au', 'en-ca', 'en-in',
  'pt-br', 'pt-pt', 'zh-cn', 'zh-tw', 'zh-hk',
  'fr-ca', 'fr-be', 'fr-ch',
  'es-mx', 'es-ar', 'es-co',
  'de-at', 'de-ch',
  'nl-be',
]);

export class HreflangValidator {
  /**
   * Extract hreflang tags from HTML.
   */
  static extractHreflangTags(html: string): HreflangTag[] {
    const tags: HreflangTag[] = [];
    const regex = /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*\/?>/gi;
    const regexReversed = /<link[^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*\/?>/gi;

    let match;
    while ((match = regex.exec(html)) !== null) {
      tags.push({ lang: match[1].toLowerCase(), href: match[2] });
    }
    // Also try reversed attribute order
    while ((match = regexReversed.exec(html)) !== null) {
      const exists = tags.some(t => t.lang === match![1].toLowerCase() && t.href === match![2]);
      if (!exists) {
        tags.push({ lang: match[1].toLowerCase(), href: match[2] });
      }
    }

    return tags;
  }

  /**
   * Validate hreflang tags for a given page URL.
   */
  static validate(
    html: string,
    currentUrl: string,
    otherPageHreflangSets?: Map<string, HreflangTag[]>
  ): HreflangReport {
    const tags = this.extractHreflangTags(html);
    const issues: HreflangIssue[] = [];
    const languages = [...new Set(tags.map(t => t.lang).filter(l => l !== 'x-default'))];
    const hasXDefault = tags.some(t => t.lang === 'x-default');
    const hasSelfReference = tags.some(t => {
      try {
        const tagUrl = new URL(t.href);
        const curUrl = new URL(currentUrl);
        return tagUrl.pathname === curUrl.pathname && tagUrl.hostname === curUrl.hostname;
      } catch {
        return t.href === currentUrl;
      }
    });

    // Rule: hreflang-1 - No hreflang tags
    if (tags.length === 0) {
      // Not necessarily an issue if site is monolingual
      return {
        totalTags: 0,
        languages: [],
        issues: [],
        hasXDefault: false,
        hasSelfReference: false,
        symmetryScore: 100,
      };
    }

    // Rule: hreflang-2 - Missing x-default
    if (!hasXDefault && tags.length > 0) {
      issues.push({
        ruleId: 'hreflang-2',
        severity: 'high',
        title: 'Missing x-default hreflang',
        description: 'Hreflang annotations should include x-default for users whose language is not targeted.',
        exampleFix: '<link rel="alternate" hreflang="x-default" href="https://example.com/" />',
      });
    }

    // Rule: hreflang-3 - Missing self-reference
    if (!hasSelfReference) {
      issues.push({
        ruleId: 'hreflang-3',
        severity: 'high',
        title: 'Missing self-referencing hreflang tag',
        description: 'Each page must include a hreflang tag pointing to itself.',
        exampleFix: `<link rel="alternate" hreflang="en" href="${currentUrl}" />`,
      });
    }

    // Rule: hreflang-4 - Invalid language codes
    for (const tag of tags) {
      if (tag.lang !== 'x-default' && !VALID_LANGUAGE_CODES.has(tag.lang)) {
        issues.push({
          ruleId: 'hreflang-4',
          severity: 'medium',
          title: `Invalid hreflang language code: "${tag.lang}"`,
          description: `"${tag.lang}" is not a recognized ISO 639-1 language code or language-region combination.`,
          exampleFix: 'Use ISO 639-1 codes like "en", "nl", "de" or language-region like "en-us", "pt-br".',
        });
      }
    }

    // Rule: hreflang-5 - Duplicate language codes
    const langCounts = new Map<string, number>();
    for (const tag of tags) {
      langCounts.set(tag.lang, (langCounts.get(tag.lang) || 0) + 1);
    }
    for (const [lang, count] of langCounts) {
      if (count > 1) {
        issues.push({
          ruleId: 'hreflang-5',
          severity: 'high',
          title: `Duplicate hreflang for "${lang}"`,
          description: `Language "${lang}" appears ${count} times. Each language should only be declared once.`,
        });
      }
    }

    // Rule: hreflang-6 - Relative URLs
    for (const tag of tags) {
      if (!tag.href.startsWith('http://') && !tag.href.startsWith('https://')) {
        issues.push({
          ruleId: 'hreflang-6',
          severity: 'critical',
          title: 'Relative URL in hreflang',
          description: `Hreflang href "${tag.href}" must be an absolute URL.`,
          exampleFix: `Use full URL: https://example.com${tag.href}`,
        });
      }
    }

    // Rule: hreflang-7 - Bidirectional symmetry (requires other page data)
    let symmetryScore = 100;
    if (otherPageHreflangSets) {
      let totalChecks = 0;
      let symmetricChecks = 0;

      for (const tag of tags) {
        if (tag.lang === 'x-default') continue;
        totalChecks++;

        const otherPageTags = otherPageHreflangSets.get(tag.href);
        if (!otherPageTags) {
          issues.push({
            ruleId: 'hreflang-7',
            severity: 'high',
            title: `No return hreflang from ${tag.lang} version`,
            description: `Page "${tag.href}" should contain a hreflang tag pointing back to "${currentUrl}", but no data was found for that page.`,
          });
          continue;
        }

        const hasReturn = otherPageTags.some(t => {
          try {
            const tagUrl = new URL(t.href);
            const curUrl = new URL(currentUrl);
            return tagUrl.pathname === curUrl.pathname && tagUrl.hostname === curUrl.hostname;
          } catch {
            return t.href === currentUrl;
          }
        });

        if (hasReturn) {
          symmetricChecks++;
        } else {
          issues.push({
            ruleId: 'hreflang-7',
            severity: 'critical',
            title: `Missing return hreflang from ${tag.lang} version`,
            description: `Page "${tag.href}" does not contain a hreflang tag pointing back to "${currentUrl}". Hreflang must be bidirectional.`,
          });
        }
      }

      symmetryScore = totalChecks > 0
        ? Math.round((symmetricChecks / totalChecks) * 100)
        : 100;
    }

    return {
      totalTags: tags.length,
      languages,
      issues,
      hasXDefault,
      hasSelfReference,
      symmetryScore,
    };
  }
}
