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
 *   309 - HTML size should be < 125KB (ideal) / < 450KB (hard max)
 *   310 - TCP Slow Start: first 14KB should contain critical content
 *   311b - Crawl efficiency: ratio of indexable to total URLs
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
  htmlSizeKb?: number;
}

export interface CrawlData {
  totalUrls?: number;
  indexableUrls?: number;
}

export class CostOfRetrievalAuditor {
  validate(html: string, metrics?: FetchMetrics, crawlData?: CrawlData): CoRIssue[] {
    const issues: CoRIssue[] = [];

    this.checkDomNodeCount(html, issues);       // Rule 292
    this.checkTtfb(metrics, issues);            // Rule 304
    this.checkCompression(metrics, issues);     // Rule 308
    this.checkHtmlSize(metrics, issues);        // Rule 309
    this.checkTcpSlowStart(html, issues);       // Rule 310
    this.checkCrawlEfficiency(crawlData, issues); // Rule 311b

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

  // Rule 309: HTML size should be < 125KB ideal, < 450KB hard max
  checkHtmlSize(metrics: FetchMetrics | undefined, issues: CoRIssue[]): void {
    if (!metrics?.htmlSizeKb) return;

    if (metrics.htmlSizeKb > 450) {
      issues.push({
        ruleId: 'rule-309',
        severity: 'critical',
        title: 'HTML size exceeds hard maximum',
        description: `HTML document is ${metrics.htmlSizeKb.toFixed(0)}KB, exceeding the 450KB hard maximum. ` +
          'Extremely large HTML documents slow down parsing, increase memory usage, and waste crawl budget. ' +
          'Search engine crawlers may truncate or abandon parsing oversized documents.',
        currentValue: `${metrics.htmlSizeKb.toFixed(0)}KB`,
        expectedValue: '<125KB (ideal), <450KB (max)',
        exampleFix: 'Remove inline SVGs, excessive inline styles/scripts, and redundant markup. Consider pagination or lazy loading.',
      });
    } else if (metrics.htmlSizeKb > 125) {
      issues.push({
        ruleId: 'rule-309-warn',
        severity: 'medium',
        title: 'HTML size above ideal threshold',
        description: `HTML document is ${metrics.htmlSizeKb.toFixed(0)}KB, exceeding the 125KB ideal size. ` +
          'Aim for lean HTML documents under 125KB for optimal parsing speed and crawl efficiency.',
        currentValue: `${metrics.htmlSizeKb.toFixed(0)}KB`,
        expectedValue: '<125KB',
        exampleFix: 'Reduce HTML size by externalizing styles and scripts, and removing unnecessary whitespace and comments.',
      });
    }
  }

  // Rule 310: TCP Slow Start — first 14KB should contain critical content
  checkTcpSlowStart(html: string, issues: CoRIssue[]): void {
    // TCP slow start initial congestion window is typically 10 segments = ~14KB
    // The first 14KB of the HTML response should include meta, title, h1, and first paragraph
    const first14Kb = html.slice(0, 14 * 1024);

    const hasMeta = /<meta\b/i.test(first14Kb);
    const hasTitle = /<title\b[^>]*>[^<]+<\/title>/i.test(first14Kb);
    const hasH1 = /<h1\b/i.test(first14Kb);
    const hasFirstParagraph = /<p\b[^>]*>[^<]{10,}/i.test(first14Kb);

    const missing: string[] = [];
    if (!hasMeta) missing.push('<meta>');
    if (!hasTitle) missing.push('<title>');
    if (!hasH1) missing.push('<h1>');
    if (!hasFirstParagraph) missing.push('first <p>');

    if (missing.length >= 2) {
      issues.push({
        ruleId: 'rule-310',
        severity: 'high',
        title: 'Critical content missing from first 14KB (TCP slow start window)',
        description: `The first 14KB of the HTML response is missing critical elements: ${missing.join(', ')}. ` +
          'During TCP slow start, only ~14KB is delivered in the initial round trip. ' +
          'Critical content (meta tags, title, h1, first paragraph) should appear within this window ' +
          'to enable search engines to extract key signals immediately.',
        currentValue: `Missing: ${missing.join(', ')}`,
        expectedValue: 'meta, title, h1, and first paragraph within first 14KB',
        exampleFix: 'Move critical HTML elements above bulky inline styles/scripts. ' +
          'Externalize CSS/JS that appears before the main content in the document.',
      });
    }
  }

  // Rule 311b: Crawl efficiency — ratio of indexable to total URLs
  checkCrawlEfficiency(crawlData: CrawlData | undefined, issues: CoRIssue[]): void {
    if (!crawlData?.totalUrls || !crawlData?.indexableUrls) return;
    if (crawlData.totalUrls === 0) return;

    const ratio = crawlData.indexableUrls / crawlData.totalUrls;

    if (ratio < 0.5) {
      issues.push({
        ruleId: 'rule-311b',
        severity: 'high',
        title: 'Poor crawl efficiency',
        description: `Only ${(ratio * 100).toFixed(0)}% of crawled URLs are indexable ` +
          `(${crawlData.indexableUrls} of ${crawlData.totalUrls}). ` +
          'More than half of the crawl budget is wasted on non-indexable pages (redirects, error pages, ' +
          'noindex pages). This severely limits how efficiently search engines can discover and index content.',
        currentValue: `${(ratio * 100).toFixed(0)}% indexable`,
        expectedValue: '>80% indexable',
        exampleFix: 'Remove or consolidate non-indexable URLs. Block low-value pages in robots.txt. ' +
          'Fix redirect chains and remove broken pages from internal links.',
      });
    } else if (ratio < 0.8) {
      issues.push({
        ruleId: 'rule-311b-warn',
        severity: 'medium',
        title: 'Crawl efficiency below optimal',
        description: `${(ratio * 100).toFixed(0)}% of crawled URLs are indexable ` +
          `(${crawlData.indexableUrls} of ${crawlData.totalUrls}). ` +
          'Aim for at least 80% of URLs to be indexable to maximize crawl budget efficiency.',
        currentValue: `${(ratio * 100).toFixed(0)}% indexable`,
        expectedValue: '>80% indexable',
        exampleFix: 'Audit non-indexable URLs and reduce their proportion through consolidation or removal.',
      });
    }
  }
}
