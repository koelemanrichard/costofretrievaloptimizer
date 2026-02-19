/**
 * LayoutRuleEngine
 *
 * Bridges audit rules into layout decisions. This is the central piece of the
 * bidirectional audit-layout integration, translating content audit findings
 * (rules 205-267) into concrete layout constraints that the LayoutEngine can
 * enforce, and providing lightweight post-render validation.
 *
 * Audit rules mapped:
 * - Rule 205: how-to content -> ordered list
 * - Rule 206: comparison content -> table
 * - Rule 215: list size 3-10 items
 * - Rule 220: heading every 300 words
 * - Rule 224: paragraph <= 150 words
 * - Rule 230: list intro sentence required
 * - Rule 263: responsive images required
 * - Rule 265: lazy loading required
 * - Rule 267: image captions required
 */

import type { ComponentType, ContentType } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Layout constraints derived from audit rules and content type analysis.
 * These constraints are consumed by the LayoutEngine to enforce
 * audit-compliant layouts.
 */
export interface LayoutConstraints {
  requiredFormat?: 'ordered-list' | 'unordered-list' | 'table' | 'prose';
  requiresIntroSentence?: boolean;
  maxListItems?: number;
  minTableColumns?: number;
  requiresHeadingEvery?: number;
  maxParagraphWords?: number;
  requiresImageCaption?: boolean;
  requiresLazyLoading?: boolean;
  requiresResponsiveImages?: boolean;
  preferredComponent?: ComponentType;
}

/**
 * A violation found during post-render validation of HTML output.
 */
export interface LayoutViolation {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  element?: string;
}

// =============================================================================
// CONTENT TYPE CONSTRAINTS (from audit rules 205, 206, 215, 230)
// =============================================================================

/**
 * Content-type-specific constraints derived from audit rules.
 *
 * - steps: Rule 205 (how-to -> ordered list), Rule 230 (intro sentence), Rule 215 (list size)
 * - comparison: Rule 206 (comparison -> table)
 * - list: Rule 230 (intro sentence), Rule 215 (list size)
 * - faq: preferred component mapping
 * - definition: preferred component mapping
 */
const CONTENT_TYPE_CONSTRAINTS: Partial<Record<ContentType, Partial<LayoutConstraints>>> = {
  steps: { requiredFormat: 'ordered-list', requiresIntroSentence: true, maxListItems: 10 },
  comparison: { requiredFormat: 'table', minTableColumns: 2 },
  list: { requiresIntroSentence: true, maxListItems: 10 },
  faq: { preferredComponent: 'faq-accordion' },
  definition: { preferredComponent: 'definition-box' },
};

// =============================================================================
// UNIVERSAL CONSTRAINTS (from audit rules 220, 224, 263, 265, 267)
// =============================================================================

/**
 * Universal constraints that apply to all content types.
 *
 * - Rule 220: heading every 300 words
 * - Rule 224: paragraph <= 150 words
 * - Rule 265: lazy loading
 * - Rule 263: responsive images
 * - Rule 267: image captions
 */
const UNIVERSAL_CONSTRAINTS: Partial<LayoutConstraints> = {
  requiresHeadingEvery: 300,
  maxParagraphWords: 150,
  requiresLazyLoading: true,
  requiresResponsiveImages: true,
  requiresImageCaption: true,
};

// =============================================================================
// FORMAT TO CONSTRAINT MAPPING
// =============================================================================

/**
 * Maps format codes to constraint overrides. When the caller knows the
 * intended format (e.g., from brief section data), format-specific
 * constraints can refine the defaults.
 */
const FORMAT_CONSTRAINTS: Partial<Record<string, Partial<LayoutConstraints>>> = {
  'ordered-list': { requiredFormat: 'ordered-list', requiresIntroSentence: true, maxListItems: 10 },
  'unordered-list': { requiredFormat: 'unordered-list', requiresIntroSentence: true, maxListItems: 10 },
  'table': { requiredFormat: 'table', minTableColumns: 2 },
  'prose': { requiredFormat: 'prose' },
};

// =============================================================================
// LAYOUT RULE ENGINE
// =============================================================================

/**
 * Static service that bridges audit rules into layout decisions.
 *
 * All methods are static since the engine is stateless -- it simply maps
 * inputs to outputs based on the rule configuration above.
 */
export class LayoutRuleEngine {
  /**
   * Compute layout constraints for a given content type and format.
   *
   * Merges three layers of constraints (in order of precedence):
   * 1. Universal constraints (always applied)
   * 2. Content-type-specific constraints (if the content type has rules)
   * 3. Format-specific constraints (if a format is provided)
   *
   * Later layers override earlier ones, so a format constraint will
   * override a content-type constraint which will override a universal one.
   *
   * @param contentType - The detected content type of the section
   * @param format - Optional format code (e.g., 'ordered-list', 'table')
   * @returns Merged layout constraints
   */
  static getLayoutConstraints(
    contentType: ContentType,
    format?: string
  ): LayoutConstraints {
    // Start with universal constraints
    const constraints: LayoutConstraints = { ...UNIVERSAL_CONSTRAINTS };

    // Layer content-type-specific constraints
    const typeConstraints = CONTENT_TYPE_CONSTRAINTS[contentType];
    if (typeConstraints) {
      Object.assign(constraints, typeConstraints);
    }

    // Layer format-specific constraints (highest precedence)
    if (format) {
      const formatConstraints = FORMAT_CONSTRAINTS[format];
      if (formatConstraints) {
        Object.assign(constraints, formatConstraints);
      }
    }

    return constraints;
  }

  /**
   * Lightweight post-render validation of HTML output.
   *
   * Performs regex-based checks on rendered HTML to catch common
   * layout violations that the audit system would flag:
   *
   * - img-alt-text: Images missing alt attribute (Rule 267 / Phase 9)
   * - img-placement: Image placed between heading and first paragraph
   *   (critical Semantic SEO rule -- images must never appear between
   *   a heading and the first paragraph of a section)
   *
   * @param html - The rendered HTML string to validate
   * @returns Array of layout violations found
   */
  static validateRenderedOutput(html: string): LayoutViolation[] {
    const violations: LayoutViolation[] = [];

    // Check for images without alt attribute
    // Matches <img ...> tags that do NOT contain alt= anywhere inside
    const imgWithoutAlt = html.match(/<img(?![^>]*\balt\s*=)[^>]*>/gi);
    if (imgWithoutAlt) {
      for (const img of imgWithoutAlt) {
        violations.push({
          rule: 'img-alt-text',
          severity: 'high',
          message: 'Image missing alt attribute',
          element: img.substring(0, 100),
        });
      }
    }

    // Check for image placed between heading and first paragraph
    // Matches pattern: </h1-6> [optional whitespace] <img
    const headingThenImg = html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>\s*<img/gi);
    if (headingThenImg) {
      for (const match of headingThenImg) {
        violations.push({
          rule: 'img-placement',
          severity: 'critical',
          message: 'Image placed between heading and first paragraph',
          element: match.substring(0, 100),
        });
      }
    }

    return violations;
  }
}
