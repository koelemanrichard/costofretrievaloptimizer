/**
 * RedirectChainChecker
 *
 * Detects HTTP errors and redirect chains/loops by following redirects
 * up to a configurable maximum number of hops.
 *
 * Rules implemented:
 *   358   - Server error (5xx)
 *   363   - Redirect loop detected
 *   363-chain - Long redirect chain (>2 hops)
 */

export interface RedirectIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export interface RedirectCheckResult {
  finalUrl: string;
  statusCode: number;
  redirectChain: { url: string; status: number }[];
  issues: RedirectIssue[];
}

/**
 * Fetcher function type for dependency injection (testability).
 * Returns the HTTP status code and Location header for a URL.
 */
export type UrlFetcher = (url: string) => Promise<{ status: number; location?: string }>;

export class RedirectChainChecker {
  private readonly fetcher: UrlFetcher;
  private readonly maxHops: number;

  constructor(fetcher?: UrlFetcher, maxHops = 10) {
    this.fetcher = fetcher || this.defaultFetcher;
    this.maxHops = maxHops;
  }

  async check(url: string): Promise<RedirectCheckResult> {
    const redirectChain: { url: string; status: number }[] = [];
    const issues: RedirectIssue[] = [];
    let currentUrl = url;
    const visited = new Set<string>();

    for (let i = 0; i < this.maxHops; i++) {
      if (visited.has(currentUrl)) {
        // Redirect loop detected
        issues.push({
          ruleId: 'rule-363',
          severity: 'critical',
          title: 'Redirect loop detected',
          description: `URL redirects form a loop: ${currentUrl} was already visited.`,
          affectedElement: currentUrl,
          exampleFix: 'Fix the redirect configuration to avoid circular redirects.',
        });
        break;
      }
      visited.add(currentUrl);

      const response = await this.fetcher(currentUrl);
      redirectChain.push({ url: currentUrl, status: response.status });

      if (response.status >= 500) {
        issues.push({
          ruleId: 'rule-358',
          severity: 'critical',
          title: 'Server error (5xx)',
          description: `URL returned HTTP ${response.status}: ${currentUrl}`,
          affectedElement: currentUrl,
          exampleFix: 'Investigate and fix the server error.',
        });
        break;
      }

      if (response.status >= 300 && response.status < 400 && response.location) {
        currentUrl = new URL(response.location, currentUrl).href;
        continue;
      }

      // Non-redirect response, we're done
      break;
    }

    // Check chain length
    const redirectCount = redirectChain.filter(r => r.status >= 300 && r.status < 400).length;
    if (redirectCount > 2) {
      issues.push({
        ruleId: 'rule-363-chain',
        severity: 'high',
        title: 'Long redirect chain',
        description: `${redirectCount} redirects before reaching final URL. Recommend max 1-2 redirects.`,
        affectedElement: redirectChain.map(r => `${r.status} ${r.url}`).join(' → '),
        exampleFix: 'Update links to point directly to the final URL.',
      });
    }

    const finalEntry = redirectChain[redirectChain.length - 1];
    return {
      finalUrl: finalEntry?.url || url,
      statusCode: finalEntry?.status || 0,
      redirectChain,
      issues,
    };
  }

  private defaultFetcher: UrlFetcher = async (url) => {
    const response = await fetch(url, { redirect: 'manual' });
    return {
      status: response.status,
      location: response.headers.get('location') || undefined,
    };
  };
}
