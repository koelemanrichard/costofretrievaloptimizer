/**
 * MetaValidator
 *
 * Validates meta tags and structured data (JSON-LD) for SEO audit purposes.
 * Checks presence and quality of essential page-level metadata required
 * for correct indexing, rendering, and rich result eligibility.
 *
 * Rules implemented:
 *   270 - Meta description must be present and 120-160 characters
 *   276 - HTML lang attribute must be present
 *   277 - Viewport meta tag must be present
 *   278 - Charset declaration must be present
 *   279 - JSON-LD structured data should exist with appropriate @type
 *   284 - JSON-LD schema must be valid JSON with @type or @graph
 */

export interface MetaIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  currentValue?: string;
  exampleFix?: string;
}

export class MetaValidator {
  validate(html: string): MetaIssue[] {
    const issues: MetaIssue[] = [];

    this.checkMetaDescription(html, issues);  // Rule 270
    this.checkLangAttribute(html, issues);    // Rule 276
    this.checkViewport(html, issues);         // Rule 277
    this.checkCharset(html, issues);          // Rule 278
    this.checkSchemaType(html, issues);       // Rule 279
    this.checkSchemaValidity(html, issues);   // Rule 284

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Rule 270: Meta description should exist and be 120-160 characters
  // ---------------------------------------------------------------------------

  checkMetaDescription(html: string, issues: MetaIssue[]): void {
    const match =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*?)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']*?)["'][^>]+name=["']description["']/i);

    if (!match) {
      issues.push({
        ruleId: 'rule-270',
        severity: 'high',
        title: 'Missing meta description',
        description: 'No meta description tag found.',
        exampleFix: 'Add <meta name="description" content="..."> with 120-160 characters.',
      });
      return;
    }

    const desc = match[1];
    if (desc.length < 70) {
      issues.push({
        ruleId: 'rule-270-short',
        severity: 'medium',
        title: 'Meta description too short',
        description: `Meta description is ${desc.length} chars. Recommended: 120-160.`,
        currentValue: desc,
        exampleFix: 'Expand the meta description to 120-160 characters.',
      });
    } else if (desc.length > 160) {
      issues.push({
        ruleId: 'rule-270-long',
        severity: 'low',
        title: 'Meta description too long',
        description: `Meta description is ${desc.length} chars. May be truncated in SERPs.`,
        currentValue: desc,
        exampleFix: 'Shorten to 160 characters or less.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 276: HTML lang attribute
  // ---------------------------------------------------------------------------

  checkLangAttribute(html: string, issues: MetaIssue[]): void {
    if (!/<html[^>]+lang=["'][^"']+["']/i.test(html)) {
      issues.push({
        ruleId: 'rule-276',
        severity: 'high',
        title: 'Missing lang attribute',
        description: 'The <html> element lacks a lang attribute.',
        exampleFix: 'Add lang="en" (or appropriate language) to the <html> tag.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 277: Viewport meta tag
  // ---------------------------------------------------------------------------

  checkViewport(html: string, issues: MetaIssue[]): void {
    if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
      issues.push({
        ruleId: 'rule-277',
        severity: 'high',
        title: 'Missing viewport meta tag',
        description: 'No viewport meta tag found. Required for mobile responsiveness.',
        exampleFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 278: Charset declaration
  // ---------------------------------------------------------------------------

  checkCharset(html: string, issues: MetaIssue[]): void {
    if (!/<meta[^>]+charset=["']?[^"'>]+["']?/i.test(html)) {
      issues.push({
        ruleId: 'rule-278',
        severity: 'medium',
        title: 'Missing charset declaration',
        description: 'No <meta charset="utf-8"> found.',
        exampleFix: 'Add <meta charset="utf-8"> as the first element in <head>.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 279: JSON-LD schema should match page type
  // ---------------------------------------------------------------------------

  checkSchemaType(html: string, issues: MetaIssue[]): void {
    const schemaRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    const schemas: string[] = [];
    while ((match = schemaRegex.exec(html)) !== null) {
      schemas.push(match[1]);
    }

    if (schemas.length === 0) {
      issues.push({
        ruleId: 'rule-279',
        severity: 'medium',
        title: 'No JSON-LD structured data',
        description: 'No JSON-LD schema found. Structured data improves rich result eligibility.',
        exampleFix: 'Add Article, FAQ, HowTo, or other relevant JSON-LD schema.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 284: Schema should be valid JSON
  // ---------------------------------------------------------------------------

  checkSchemaValidity(html: string, issues: MetaIssue[]): void {
    const schemaRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let invalidCount = 0;
    while ((match = schemaRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (!parsed['@type'] && !parsed['@graph']) {
          invalidCount++;
        }
      } catch {
        invalidCount++;
      }
    }

    if (invalidCount > 0) {
      issues.push({
        ruleId: 'rule-284',
        severity: 'high',
        title: 'Invalid JSON-LD schema',
        description: `${invalidCount} JSON-LD block(s) contain invalid JSON or missing @type.`,
        exampleFix: 'Fix JSON syntax and ensure every schema has an @type property.',
      });
    }
  }
}
