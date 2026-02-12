/**
 * WebsiteTypeRuleEngine
 *
 * Applies audit rules specific to the detected website type.
 * Each website type has a distinct set of expectations for schema markup,
 * content structure, and required elements.
 *
 * Website types supported:
 *   ecommerce      (rules 400-410)
 *   saas           (rules 411-420)
 *   b2b            (rules 421-425)
 *   blog           (rules 426-432)
 *   local-business (future expansion)
 *   other          (no type-specific rules)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebsiteType =
  | 'ecommerce'
  | 'saas'
  | 'b2b'
  | 'blog'
  | 'local-business'
  | 'other';

export interface WebsiteTypeInput {
  websiteType: WebsiteType;
  html: string;
  text?: string;
  url?: string;
  schemaTypes?: string[];
}

export interface WebsiteTypeIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class WebsiteTypeRuleEngine {
  validate(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    switch (input.websiteType) {
      case 'ecommerce':
        return this.validateEcommerce(input);
      case 'saas':
        return this.validateSaas(input);
      case 'b2b':
        return this.validateB2b(input);
      case 'blog':
        return this.validateBlog(input);
      case 'local-business':
        return this.validateLocalBusiness(input);
      case 'other':
      default:
        return [];
    }
  }

  // -----------------------------------------------------------------------
  // E-commerce (rules 400-410)
  // -----------------------------------------------------------------------

  private validateEcommerce(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 400: Product schema present
    if (!schemas.some((s) => s === 'Product')) {
      issues.push({
        ruleId: 'rule-400',
        severity: 'critical',
        title: 'Missing Product schema',
        description:
          'E-commerce pages should include JSON-LD with "@type": "Product" for rich results.',
        exampleFix:
          'Add a JSON-LD script block with "@type": "Product" including name, image, offers.',
      });
    }

    // Rule 401: Price info present
    if (!this.hasPriceInfo(html, schemas)) {
      issues.push({
        ruleId: 'rule-401',
        severity: 'high',
        title: 'No price information found',
        description:
          'Product pages should clearly display price information in the content or schema.',
        exampleFix:
          'Include visible price and/or Offer schema with price and priceCurrency.',
      });
    }

    // Rule 402: Availability stated
    if (!this.hasAvailability(html)) {
      issues.push({
        ruleId: 'rule-402',
        severity: 'medium',
        title: 'No availability information',
        description:
          'Product availability (in stock, out of stock, pre-order) should be clearly stated.',
        affectedElement: 'product availability',
        exampleFix:
          'Add availability text ("In Stock", "Out of Stock") or schema.org availability property.',
      });
    }

    // Rule 403: Product images exist
    if (!this.hasMultipleImages(html)) {
      issues.push({
        ruleId: 'rule-403',
        severity: 'medium',
        title: 'Insufficient product images',
        description:
          'Product pages benefit from multiple images showing different angles or use cases.',
        exampleFix:
          'Add at least 2 product images with descriptive alt text.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // SaaS (rules 411-420)
  // -----------------------------------------------------------------------

  private validateSaas(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;

    // Rule 411: Feature comparison present
    if (!this.hasComparisonTable(html)) {
      issues.push({
        ruleId: 'rule-411',
        severity: 'medium',
        title: 'No feature comparison table',
        description:
          'SaaS pages benefit from comparison tables that differentiate tiers or competitors.',
        exampleFix:
          'Add a feature comparison table with clear headers and checkmarks or values.',
      });
    }

    // Rule 412: Pricing info present
    if (!this.hasPricingInfo(html)) {
      issues.push({
        ruleId: 'rule-412',
        severity: 'high',
        title: 'No pricing information found',
        description:
          'SaaS pages should include visible pricing or a clear link to a pricing page.',
        exampleFix:
          'Add pricing details, tiers, or a prominent "See Pricing" call-to-action.',
      });
    }

    // Rule 413: Documentation structure
    if (!this.hasDocumentationStructure(html)) {
      issues.push({
        ruleId: 'rule-413',
        severity: 'low',
        title: 'No documentation or code references',
        description:
          'SaaS products benefit from technical documentation signals (code blocks, API references).',
        exampleFix:
          'Include code samples, API endpoints, or links to developer documentation.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // B2B (rules 421-425)
  // -----------------------------------------------------------------------

  private validateB2b(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 421: Case study / testimonial present
    if (!this.hasCaseStudyOrTestimonial(html)) {
      issues.push({
        ruleId: 'rule-421',
        severity: 'medium',
        title: 'No case studies or testimonials found',
        description:
          'B2B pages should include social proof through case studies, testimonials, or reviews.',
        exampleFix:
          'Add a case study section, customer testimonials, or review quotes with attribution.',
      });
    }

    // Rule 422: Service page schema
    if (!schemas.some((s) => s === 'Service')) {
      issues.push({
        ruleId: 'rule-422',
        severity: 'medium',
        title: 'Missing Service schema',
        description:
          'B2B service pages should include JSON-LD with "@type": "Service" for better search representation.',
        exampleFix:
          'Add a JSON-LD script block with "@type": "Service" including name, description, provider.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Blog (rules 426-432)
  // -----------------------------------------------------------------------

  private validateBlog(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 426: Article schema present
    const hasArticleSchema = schemas.some(
      (s) => s === 'Article' || s === 'BlogPosting' || s === 'NewsArticle',
    );
    if (!hasArticleSchema) {
      issues.push({
        ruleId: 'rule-426',
        severity: 'high',
        title: 'Missing Article schema',
        description:
          'Blog posts should include JSON-LD with "@type": "Article" or "BlogPosting" for rich results.',
        exampleFix:
          'Add a JSON-LD script with "@type": "Article" including headline, datePublished, author.',
      });
    }

    // Rule 427: Author info present
    if (!this.hasAuthorInfo(html)) {
      issues.push({
        ruleId: 'rule-427',
        severity: 'high',
        title: 'No author information found',
        description:
          'Blog posts should identify the author through a byline, author bio, or author schema.',
        exampleFix:
          'Add an author byline with name and link to author page or bio.',
      });
    }

    // Rule 428: Publication date present
    if (!this.hasPublicationDate(html)) {
      issues.push({
        ruleId: 'rule-428',
        severity: 'medium',
        title: 'No publication date found',
        description:
          'Blog posts should display a publication or last-updated date for freshness signals.',
        exampleFix:
          'Add a visible publication date and/or "datePublished" in schema markup.',
      });
    }

    // Rule 429: Category / tags present
    if (!this.hasCategoryOrTags(html)) {
      issues.push({
        ruleId: 'rule-429',
        severity: 'low',
        title: 'No category or tag elements found',
        description:
          'Blog posts benefit from category or tag markup for topical organization and internal linking.',
        exampleFix:
          'Add category links, tag elements, or breadcrumbs to place content in topical context.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Local Business (stub for future expansion)
  // -----------------------------------------------------------------------

  private validateLocalBusiness(_input: WebsiteTypeInput): WebsiteTypeIssue[] {
    // Future: rules for NAP consistency, LocalBusiness schema, Maps embed, etc.
    return [];
  }

  // -----------------------------------------------------------------------
  // Detection helpers
  // -----------------------------------------------------------------------

  /** Extract @type values from JSON-LD script blocks in HTML. */
  private extractSchemaTypes(html: string): string[] {
    const types: string[] = [];
    const scriptRegex =
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1]);
        this.collectTypes(json, types);
      } catch {
        // Ignore malformed JSON-LD
      }
    }
    return types;
  }

  private collectTypes(obj: unknown, types: string[]): void {
    if (Array.isArray(obj)) {
      for (const item of obj) this.collectTypes(item, types);
    } else if (obj && typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      if (typeof record['@type'] === 'string') {
        types.push(record['@type']);
      }
      if (Array.isArray(record['@type'])) {
        for (const t of record['@type']) {
          if (typeof t === 'string') types.push(t);
        }
      }
      if (record['@graph'] && Array.isArray(record['@graph'])) {
        for (const item of record['@graph']) this.collectTypes(item, types);
      }
    }
  }

  /** Check for price patterns in HTML or schema. */
  private hasPriceInfo(html: string, schemas: string[]): boolean {
    const hasPriceInSchema =
      /"price"\s*:/i.test(html) || schemas.includes('Offer');
    const hasPriceText =
      /(\$|€|£|USD|EUR|GBP)\s*\d+|\d+\.\d{2}\s*(USD|EUR|GBP)|\bprice\b/i.test(
        html,
      );
    return hasPriceInSchema || hasPriceText;
  }

  /** Check for availability patterns. */
  private hasAvailability(html: string): boolean {
    return /\b(in\s*stock|out\s*of\s*stock|available|unavailable|pre-?order|back\s*order|availability)\b/i.test(
      html,
    );
  }

  /** Check for multiple product images. */
  private hasMultipleImages(html: string): boolean {
    const imgMatches = html.match(/<img\b/gi);
    return (imgMatches?.length ?? 0) >= 2;
  }

  /** Check for comparison table. */
  private hasComparisonTable(html: string): boolean {
    const hasTable = /<table\b/i.test(html);
    const hasComparisonKeyword =
      /\b(comparison|compare|versus|vs\.?|features?|plan|tier)\b/i.test(html);
    return hasTable && hasComparisonKeyword;
  }

  /** Check for pricing patterns in SaaS context. */
  private hasPricingInfo(html: string): boolean {
    return /\b(pricing|price|plan|tier|monthly|annually|\/mo|\/month|\/year|free\s*trial|subscription)\b/i.test(
      html,
    );
  }

  /** Check for code blocks or API references. */
  private hasDocumentationStructure(html: string): boolean {
    const hasCodeBlock = /<code\b|<pre\b|```/i.test(html);
    const hasApiRef = /\b(API|endpoint|SDK|npm\s+install|import\s+\{)/i.test(
      html,
    );
    return hasCodeBlock || hasApiRef;
  }

  /** Check for case study or testimonial content. */
  private hasCaseStudyOrTestimonial(html: string): boolean {
    return /\b(case\s*study|testimonial|review|client\s*story|success\s*story|customer\s*said|we\s*helped)\b/i.test(
      html,
    );
  }

  /** Check for author identification. */
  private hasAuthorInfo(html: string): boolean {
    const authorMeta = /<meta[^>]+name=["']author["']/i.test(html);
    const authorClass = /class=["'][^"]*author[^"]*["']/i.test(html);
    const authorItemprop = /itemprop=["']author["']/i.test(html);
    const authorRel = /rel=["']author["']/i.test(html);
    const authorSchema = /"author"\s*:/i.test(html);
    const byline = /\b(by|written\s*by|author)\s*:?\s*[A-Z]/i.test(html);
    return (
      authorMeta ||
      authorClass ||
      authorItemprop ||
      authorRel ||
      authorSchema ||
      byline
    );
  }

  /** Check for publication date. */
  private hasPublicationDate(html: string): boolean {
    const dateSchema = /"datePublished"\s*:/i.test(html);
    const dateModified = /"dateModified"\s*:/i.test(html);
    const timeDatetime = /<time[^>]+datetime=/i.test(html);
    const dateClass = /class=["'][^"]*(?:date|published|posted)[^"]*["']/i.test(
      html,
    );
    const datePattern =
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i.test(
        html,
      );
    const isoDate = /\b\d{4}-\d{2}-\d{2}\b/.test(html);
    return (
      dateSchema ||
      dateModified ||
      timeDatetime ||
      dateClass ||
      datePattern ||
      isoDate
    );
  }

  /** Check for category or tag elements. */
  private hasCategoryOrTags(html: string): boolean {
    const categoryClass =
      /class=["'][^"]*(?:category|tag|topic|label|breadcrumb)[^"]*["']/i.test(
        html,
      );
    const categoryRel = /rel=["']tag["']/i.test(html);
    const categoryText =
      /\b(category|categories|tags?|filed\s*under|topics?)\s*:/i.test(html);
    return categoryClass || categoryRel || categoryText;
  }
}
