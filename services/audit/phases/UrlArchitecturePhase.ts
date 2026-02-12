/**
 * URL Architecture Phase Adapter
 *
 * Evaluates URL structure, slug optimization, breadcrumb consistency, and URL hierarchy.
 * Ensures URLs align with site taxonomy and topical map structure.
 *
 * Rules implemented:
 *   358       - Server error (5xx)
 *   363       - Redirect loop detected
 *   363-chain - Long redirect chain (>2 hops)
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { RedirectChainChecker, type UrlFetcher } from '../rules/RedirectChainChecker';
import { UrlArchitectureAuditor } from '../rules/UrlArchitectureAuditor';
import { UrlStructureValidator } from '../rules/UrlStructureValidator';

export class UrlArchitecturePhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'urlArchitecture';
  private readonly urlFetcher?: UrlFetcher;

  constructor(urlFetcher?: UrlFetcher) {
    super();
    this.urlFetcher = urlFetcher;
  }

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    const contentData = this.extractContent(content);

    if (request.url) {
      // Rules 358, 363: Redirect chain and 5xx detection
      totalChecks += 2;
      const checker = new RedirectChainChecker(this.urlFetcher);
      try {
        const result = await checker.check(request.url);
        for (const issue of result.issues) {
          findings.push(this.createFinding({
            ruleId: issue.ruleId,
            severity: issue.severity,
            title: issue.title,
            description: issue.description,
            affectedElement: issue.affectedElement,
            exampleFix: issue.exampleFix,
            whyItMatters: 'Server errors and redirect chains waste crawl budget and harm user experience.',
            category: 'URL Architecture',
          }));
        }
      } catch {
        // Non-fatal: redirect check may fail for network reasons
      }

      // Rules 338, 340, 348, 354-355, 359, 361-362, 365, 367, 374-375, 378: URL architecture
      totalChecks++;
      const urlArchAuditor = new UrlArchitectureAuditor();
      const urlArchIssues = urlArchAuditor.validate({
        url: request.url,
        canonicalUrl: contentData?.canonicalUrl,
        statusCode: contentData?.statusCode,
        redirectTarget: contentData?.redirectTarget,
        redirectStatusCode: contentData?.redirectStatusCode,
        responseTimeMs: contentData?.responseTimeMs,
        sitemapUrls: contentData?.sitemapUrls,
      });
      for (const issue of urlArchIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'URL architecture affects crawl efficiency, indexing, and user trust.',
          category: 'URL Architecture',
        }));
      }

      // Rules 336-345: URL structure (length, slug, separators, depth, keyword, stop words, etc.)
      totalChecks++;
      const urlStructValidator = new UrlStructureValidator();
      const urlStructIssues = urlStructValidator.validate({
        url: request.url,
        targetKeyword: contentData?.targetKeyword,
        otherUrls: contentData?.otherUrls,
      });
      for (const issue of urlStructIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Clean URL structure improves crawlability and helps users understand page context.',
          category: 'URL Architecture',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): {
    canonicalUrl?: string;
    statusCode?: number;
    redirectTarget?: string;
    redirectStatusCode?: number;
    responseTimeMs?: number;
    sitemapUrls?: string[];
    targetKeyword?: string;
    otherUrls?: string[];
  } | null {
    if (!content) return null;
    if (typeof content === 'object') {
      const c = content as Record<string, unknown>;
      return {
        canonicalUrl: c.canonicalUrl as string | undefined,
        statusCode: c.statusCode as number | undefined,
        redirectTarget: c.redirectTarget as string | undefined,
        redirectStatusCode: c.redirectStatusCode as number | undefined,
        responseTimeMs: c.responseTimeMs as number | undefined,
        sitemapUrls: c.sitemapUrls as string[] | undefined,
        targetKeyword: c.targetKeyword as string | undefined,
        otherUrls: c.otherUrls as string[] | undefined,
      };
    }
    return null;
  }
}
