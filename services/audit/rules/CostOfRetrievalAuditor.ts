/**
 * CostOfRetrievalAuditor
 *
 * Standalone validator for Cost of Retrieval P1 rules.
 * Evaluates technical delivery metrics that affect how efficiently
 * search engines and users can retrieve page content.
 *
 * Rules implemented:
 *   292 - DOM node count should be < 1500 for optimal rendering
 *   304 - Time to First Byte should be < 100ms (acceptable < 200ms)
 *   308 - Response should use compression (gzip/br/deflate)
 */

export interface CoRIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  currentValue?: string;
  expectedValue?: string;
  exampleFix?: string;
}

export interface FetchMetrics {
  ttfbMs?: number;
  contentEncodingHeader?: string;
}

export class CostOfRetrievalAuditor {
  validate(html: string, metrics?: FetchMetrics): CoRIssue[] {
    const issues: CoRIssue[] = [];

    this.checkDomNodeCount(html, issues);       // Rule 292
    this.checkTtfb(metrics, issues);            // Rule 304
    this.checkCompression(metrics, issues);     // Rule 308

    return issues;
  }

  // Rule 292: DOM nodes should be < 1500 for optimal rendering
  checkDomNodeCount(html: string, issues: CoRIssue[]): void {
    // Count opening tags as proxy for DOM nodes
    const tagCount = (html.match(/<[a-z][a-z0-9]*[\s>]/gi) || []).length;

    if (tagCount > 1500) {
      issues.push({
        ruleId: 'rule-292',
        severity: 'high',
        title: 'Excessive DOM nodes',
        description: `Estimated ${tagCount} DOM nodes. Recommended: <1500 for optimal rendering performance.`,
        currentValue: `${tagCount} nodes`,
        expectedValue: '<1500 nodes',
        exampleFix: 'Simplify HTML structure. Remove unnecessary wrapper elements.',
      });
    } else if (tagCount > 1000) {
      issues.push({
        ruleId: 'rule-292-warn',
        severity: 'medium',
        title: 'High DOM node count',
        description: `Estimated ${tagCount} DOM nodes. Getting close to the 1500 threshold.`,
        currentValue: `${tagCount} nodes`,
        exampleFix: 'Consider simplifying the HTML structure.',
      });
    }
  }

  // Rule 304: TTFB should be < 100ms (or < 200ms acceptable)
  checkTtfb(metrics: FetchMetrics | undefined, issues: CoRIssue[]): void {
    if (!metrics?.ttfbMs) return;

    if (metrics.ttfbMs > 500) {
      issues.push({
        ruleId: 'rule-304',
        severity: 'critical',
        title: 'Very slow TTFB',
        description: `Time to First Byte: ${metrics.ttfbMs}ms. Should be <200ms, ideally <100ms.`,
        currentValue: `${metrics.ttfbMs}ms`,
        expectedValue: '<100ms',
        exampleFix: 'Optimize server response time. Consider CDN, caching, or server upgrades.',
      });
    } else if (metrics.ttfbMs > 200) {
      issues.push({
        ruleId: 'rule-304-slow',
        severity: 'high',
        title: 'Slow TTFB',
        description: `Time to First Byte: ${metrics.ttfbMs}ms. Should be <200ms.`,
        currentValue: `${metrics.ttfbMs}ms`,
        expectedValue: '<200ms',
        exampleFix: 'Optimize server response time.',
      });
    }
  }

  // Rule 308: Response should use compression (gzip/br/deflate)
  checkCompression(metrics: FetchMetrics | undefined, issues: CoRIssue[]): void {
    if (!metrics?.contentEncodingHeader) {
      // If we don't have header info, skip
      if (metrics && 'contentEncodingHeader' in metrics) {
        issues.push({
          ruleId: 'rule-308',
          severity: 'high',
          title: 'No compression enabled',
          description: 'Response does not use content compression. Enable gzip or Brotli.',
          exampleFix: 'Enable gzip or Brotli compression on the server.',
        });
      }
      return;
    }

    const encoding = metrics.contentEncodingHeader.toLowerCase();
    const hasCompression = encoding.includes('gzip') || encoding.includes('br') || encoding.includes('deflate');

    if (!hasCompression) {
      issues.push({
        ruleId: 'rule-308',
        severity: 'high',
        title: 'No compression enabled',
        description: `Content-Encoding: "${metrics.contentEncodingHeader}". Should use gzip or Brotli.`,
        exampleFix: 'Enable gzip or Brotli compression on the server.',
      });
    }
  }
}
