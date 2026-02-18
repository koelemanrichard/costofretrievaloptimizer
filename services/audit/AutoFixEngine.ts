// services/audit/AutoFixEngine.ts

/**
 * AutoFixEngine
 *
 * Provides automatic fix suggestions and implementations for common
 * audit findings. Maps audit rule IDs to fix actions that can be
 * applied programmatically.
 *
 * Supported auto-fix categories:
 * - Meta tags (title, description, canonical)
 * - Alt text generation
 * - Heading structure
 * - Schema markup
 * - Internal link suggestions
 */

import type { AuditFinding } from './types';

export interface AutoFix {
  /** The finding being fixed */
  ruleId: string;
  /** Fix category */
  category: 'meta' | 'alt_text' | 'heading' | 'schema' | 'link' | 'content' | 'technical';
  /** Human-readable description of the fix */
  description: string;
  /** The fix action */
  action: AutoFixAction;
  /** Confidence that this fix is correct (0-1) */
  confidence: number;
  /** Does this require human review? */
  requiresReview: boolean;
}

export type AutoFixAction =
  | { type: 'replace_text'; selector: string; oldValue: string; newValue: string }
  | { type: 'add_attribute'; selector: string; attribute: string; value: string }
  | { type: 'add_element'; parentSelector: string; position: 'before' | 'after' | 'prepend' | 'append'; html: string }
  | { type: 'remove_element'; selector: string }
  | { type: 'add_meta'; name: string; content: string }
  | { type: 'add_schema'; jsonLd: Record<string, unknown> }
  | { type: 'suggestion_only'; suggestion: string };

export interface AutoFixReport {
  /** Total findings processed */
  totalFindings: number;
  /** Findings with auto-fixes available */
  fixableCount: number;
  /** Auto-fixes generated */
  fixes: AutoFix[];
  /** Findings that require manual intervention */
  manualOnly: string[];
}

export class AutoFixEngine {
  private static fixGenerators = new Map<string, (finding: AuditFinding, context?: AutoFixContext) => AutoFix | null>();

  static {
    // Register fix generators for known rule IDs
    this.registerFixGenerators();
  }

  /**
   * Generate auto-fixes for a list of audit findings.
   */
  static generateFixes(
    findings: AuditFinding[],
    context?: AutoFixContext
  ): AutoFixReport {
    const fixes: AutoFix[] = [];
    const manualOnly: string[] = [];

    for (const finding of findings) {
      const generator = this.fixGenerators.get(finding.ruleId);
      if (generator) {
        const fix = generator(finding, context);
        if (fix) {
          fixes.push(fix);
          continue;
        }
      }

      // Try category-based fix
      const categoryFix = this.tryCategoryFix(finding, context);
      if (categoryFix) {
        fixes.push(categoryFix);
      } else {
        manualOnly.push(finding.ruleId);
      }
    }

    return {
      totalFindings: findings.length,
      fixableCount: fixes.length,
      fixes,
      manualOnly,
    };
  }

  /**
   * Apply fixes to HTML content (returns modified HTML).
   */
  static applyFixes(html: string, fixes: AutoFix[]): string {
    let result = html;

    for (const fix of fixes) {
      if (fix.requiresReview) continue; // Skip fixes needing review

      switch (fix.action.type) {
        case 'replace_text': {
          const { oldValue, newValue } = fix.action;
          result = result.replace(oldValue, newValue);
          break;
        }
        case 'add_meta': {
          const { name, content } = fix.action;
          const metaTag = `<meta name="${name}" content="${this.escapeHtml(content)}" />`;
          result = result.replace('</head>', `  ${metaTag}\n</head>`);
          break;
        }
        case 'add_schema': {
          const script = `<script type="application/ld+json">\n${JSON.stringify(fix.action.jsonLd, null, 2)}\n</script>`;
          result = result.replace('</head>', `  ${script}\n</head>`);
          break;
        }
        // Other action types would need DOM manipulation (cheerio/jsdom)
        default:
          break;
      }
    }

    return result;
  }

  private static registerFixGenerators(): void {
    // Meta title too short/long
    this.fixGenerators.set('meta-title-length', (finding, context) => {
      if (!context?.pageTitle || !context?.centralEntity) return null;
      const title = context.pageTitle;
      if (title.length > 60) {
        return {
          ruleId: 'meta-title-length',
          category: 'meta',
          description: `Shorten title from ${title.length} to ≤60 characters`,
          action: {
            type: 'replace_text',
            selector: 'title',
            oldValue: title,
            newValue: title.substring(0, 57) + '...',
          },
          confidence: 0.7,
          requiresReview: true,
        };
      }
      return null;
    });

    // Missing canonical
    this.fixGenerators.set('missing-canonical', (_finding, context) => ({
      ruleId: 'missing-canonical',
      category: 'meta',
      description: 'Add canonical URL',
      action: {
        type: 'add_element',
        parentSelector: 'head',
        position: 'append',
        html: `<link rel="canonical" href="${context?.currentUrl || ''}" />`,
      },
      confidence: 0.9,
      requiresReview: false,
    }));

    // Missing alt text
    this.fixGenerators.set('missing-alt-text', (finding, context) => ({
      ruleId: 'missing-alt-text',
      category: 'alt_text',
      description: 'Generate alt text for image',
      action: {
        type: 'add_attribute',
        selector: finding.affectedElement || 'img',
        attribute: 'alt',
        value: context?.centralEntity
          ? `${context.centralEntity} - ${finding.currentValue || 'image'}`
          : finding.currentValue || 'Image',
      },
      confidence: 0.6,
      requiresReview: true,
    }));

    // Missing meta description
    this.fixGenerators.set('missing-meta-description', (_finding, context) => {
      if (!context?.firstParagraph) return null;
      const desc = context.firstParagraph.substring(0, 155);
      return {
        ruleId: 'missing-meta-description',
        category: 'meta',
        description: 'Generate meta description from first paragraph',
        action: {
          type: 'add_meta',
          name: 'description',
          content: desc,
        },
        confidence: 0.7,
        requiresReview: true,
      };
    });

    // Missing WebSite schema
    this.fixGenerators.set('missing-website-schema', (_finding, context) => ({
      ruleId: 'missing-website-schema',
      category: 'schema',
      description: 'Add WebSite schema markup',
      action: {
        type: 'add_schema',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: context?.siteName || '',
          url: context?.siteUrl || '',
        },
      },
      confidence: 0.8,
      requiresReview: true,
    }));

    // Heading hierarchy broken
    this.fixGenerators.set('heading-hierarchy', (finding) => ({
      ruleId: 'heading-hierarchy',
      category: 'heading',
      description: 'Fix heading hierarchy — adjust skipped heading level',
      action: {
        type: 'suggestion_only',
        suggestion: finding.exampleFix || 'Ensure headings follow sequential order (H1 → H2 → H3).',
      },
      confidence: 0.5,
      requiresReview: true,
    }));
  }

  private static tryCategoryFix(
    finding: AuditFinding,
    _context?: AutoFixContext
  ): AutoFix | null {
    // Generic fix based on finding severity and category
    if (finding.exampleFix) {
      return {
        ruleId: finding.ruleId,
        category: 'content',
        description: finding.exampleFix,
        action: {
          type: 'suggestion_only',
          suggestion: finding.exampleFix,
        },
        confidence: 0.3,
        requiresReview: true,
      };
    }
    return null;
  }

  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export interface AutoFixContext {
  /** Current page URL */
  currentUrl?: string;
  /** Page title */
  pageTitle?: string;
  /** Central entity */
  centralEntity?: string;
  /** First paragraph text */
  firstParagraph?: string;
  /** Site name */
  siteName?: string;
  /** Site URL */
  siteUrl?: string;
}
