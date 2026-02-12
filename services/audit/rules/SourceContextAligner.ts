/**
 * SourceContextAligner
 *
 * Validates that page content aligns with the project's Source Context (SC)
 * and Content Specification Index (CSI) — the business info, pillar definitions,
 * target keywords, and required attributes that define the page's strategic purpose.
 *
 * Rules implemented:
 *   rule-6-ce         - Central entity must appear in the content
 *   rule-6-business   - Content must reference business/industry context
 *   rule-6-keywords   - At least 50% of target keywords must appear
 *   rule-6-attributes - At least 30% of required attributes must be covered
 */

export interface AlignmentIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export interface SourceContext {
  businessName: string;
  industry: string;
  targetAudience: string;
  coreServices: string[];
  uniqueSellingPoints: string[];
}

export interface ContentSpecification {
  centralEntity: string;
  pillarTopic?: string;
  targetKeywords: string[];
  requiredAttributes: string[];
}

export class SourceContextAligner {
  /**
   * Check if content aligns with Source Context and Content Specification.
   * Rule 6: Content must serve the business goals defined in SC/CSI.
   */
  validate(
    content: string,
    sourceContext: SourceContext,
    spec: ContentSpecification
  ): AlignmentIssue[] {
    const issues: AlignmentIssue[] = [];
    const lowerContent = content.toLowerCase();

    this.checkCentralEntityPresence(lowerContent, spec, issues);
    this.checkBusinessAlignment(lowerContent, sourceContext, issues);
    this.checkKeywordCoverage(lowerContent, spec, issues);
    this.checkAttributeCoverage(lowerContent, spec, issues);

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Rule 6-CE: Central entity must appear in the content
  // ---------------------------------------------------------------------------

  private checkCentralEntityPresence(
    lowerContent: string,
    spec: ContentSpecification,
    issues: AlignmentIssue[]
  ): void {
    const centralEntity = spec.centralEntity.toLowerCase();

    if (!lowerContent.includes(centralEntity)) {
      issues.push({
        ruleId: 'rule-6-ce',
        severity: 'critical',
        title: 'Central entity missing from content',
        description:
          `The central entity "${spec.centralEntity}" does not appear anywhere in the content. ` +
          'The central entity is the primary topic the page must address according to the Content ' +
          'Specification Index. Its absence signals a fundamental misalignment between the page ' +
          'and its strategic purpose.',
        affectedElement: spec.centralEntity,
        exampleFix:
          `Ensure "${spec.centralEntity}" appears naturally in the title, introduction, ` +
          'and throughout the body content.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 6-Business: Content should reference business/industry context
  // ---------------------------------------------------------------------------

  private checkBusinessAlignment(
    lowerContent: string,
    sourceContext: SourceContext,
    issues: AlignmentIssue[]
  ): void {
    const terms = [
      ...sourceContext.coreServices,
      sourceContext.industry,
    ];

    const hasAlignment = terms.some(
      (term) => term && lowerContent.includes(term.toLowerCase())
    );

    if (!hasAlignment) {
      issues.push({
        ruleId: 'rule-6-business',
        severity: 'high',
        title: 'No business or industry alignment detected',
        description:
          'The content does not reference any of the core services or the industry defined ' +
          `in the Source Context. Industry: "${sourceContext.industry}". Core services: ` +
          `${sourceContext.coreServices.map((s) => `"${s}"`).join(', ')}. ` +
          'Content should naturally weave in the business context to reinforce topical authority.',
        affectedElement: 'Overall content',
        exampleFix:
          `Reference the business's industry ("${sourceContext.industry}") or at least one ` +
          `core service (e.g., "${sourceContext.coreServices[0] ?? ''}") within the content.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 6-Keywords: At least 50% of target keywords should appear
  // ---------------------------------------------------------------------------

  private checkKeywordCoverage(
    lowerContent: string,
    spec: ContentSpecification,
    issues: AlignmentIssue[]
  ): void {
    if (spec.targetKeywords.length === 0) return;

    const found = spec.targetKeywords.filter((kw) =>
      lowerContent.includes(kw.toLowerCase())
    );
    const coverage = found.length / spec.targetKeywords.length;

    if (coverage < 0.5) {
      const missing = spec.targetKeywords.filter(
        (kw) => !lowerContent.includes(kw.toLowerCase())
      );

      issues.push({
        ruleId: 'rule-6-keywords',
        severity: 'medium',
        title: 'Low target keyword coverage',
        description:
          `Only ${found.length} of ${spec.targetKeywords.length} target keywords ` +
          `(${Math.round(coverage * 100)}%) appear in the content. At least 50% coverage ` +
          `is recommended. Missing keywords: ${missing.map((k) => `"${k}"`).join(', ')}.`,
        affectedElement: 'Target keywords',
        exampleFix:
          'Incorporate the missing keywords naturally into the content, ' +
          'especially in headings and topic sentences.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 6-Attributes: At least 30% of required attributes should be covered
  // ---------------------------------------------------------------------------

  private checkAttributeCoverage(
    lowerContent: string,
    spec: ContentSpecification,
    issues: AlignmentIssue[]
  ): void {
    if (spec.requiredAttributes.length === 0) return;

    const found = spec.requiredAttributes.filter((attr) =>
      lowerContent.includes(attr.toLowerCase())
    );
    const coverage = found.length / spec.requiredAttributes.length;

    if (coverage < 0.3) {
      const missing = spec.requiredAttributes.filter(
        (attr) => !lowerContent.includes(attr.toLowerCase())
      );

      issues.push({
        ruleId: 'rule-6-attributes',
        severity: 'high',
        title: 'Low required attribute coverage',
        description:
          `Only ${found.length} of ${spec.requiredAttributes.length} required attributes ` +
          `(${Math.round(coverage * 100)}%) appear in the content. At least 30% coverage ` +
          `is recommended. Missing attributes: ${missing.map((a) => `"${a}"`).join(', ')}.`,
        affectedElement: 'Required attributes',
        exampleFix:
          'Add sections or paragraphs that address the missing attributes to strengthen ' +
          'the semantic completeness of the content.',
      });
    }
  }
}
