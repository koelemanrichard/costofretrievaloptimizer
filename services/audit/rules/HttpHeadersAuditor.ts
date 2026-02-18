/**
 * HttpHeadersAuditor
 *
 * Validates caching headers and HTTP security headers.
 *
 * Rules implemented:
 *   311 - Cache-Control header should be present for static assets
 *   312 - ETag header should be present for conditional requests
 *   313 - Cache-Control max-age should meet minimum thresholds
 *   314 - Expires header should not be set to a past date
 *   315 - Strict-Transport-Security (HSTS) should be present with adequate max-age
 *   316 - X-Content-Type-Options should be "nosniff"
 *   317 - X-Frame-Options should be DENY or SAMEORIGIN
 *   318 - Referrer-Policy should be present
 *   319 - Content-Security-Policy should be present
 *   320b - Brotli compression support (Content-Encoding: br preferred over gzip)
 *   321b - HTTP/2 protocol support
 *   322b - UTF-8 consistency in Content-Type header
 */

export interface HttpHeadersInput {
  /** Response headers as key-value pairs */
  headers: Record<string, string>;
  /** Whether this is a static asset (CSS, JS, image) vs HTML page */
  isStaticAsset?: boolean;
  /** The URL being checked */
  url?: string;
  /** The HTTP protocol version (e.g., "h2", "http/2", "http/1.1") */
  protocol?: string;
}

export interface HttpHeaderIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class HttpHeadersAuditor {
  validate(input: HttpHeadersInput): HttpHeaderIssue[] {
    const issues: HttpHeaderIssue[] = [];
    const headers = this.normalizeHeaders(input.headers);
    const isStatic = input.isStaticAsset ?? false;

    this.checkCacheControl(headers, issues);
    this.checkETag(headers, issues);
    this.checkMaxAge(headers, isStatic, issues);
    this.checkExpires(headers, issues);
    this.checkHsts(headers, issues);
    this.checkContentTypeOptions(headers, issues);
    this.checkFrameOptions(headers, issues);
    this.checkReferrerPolicy(headers, issues);
    this.checkContentSecurityPolicy(headers, issues);
    this.checkBrotliCompression(headers, issues);
    this.checkHttp2Protocol(input.protocol, issues);
    this.checkUtf8Consistency(headers, issues);

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Header normalization
  // ---------------------------------------------------------------------------

  /**
   * Normalize header keys to lowercase for case-insensitive lookup.
   */
  private normalizeHeaders(headers: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  // ---------------------------------------------------------------------------
  // Caching rules (311-314)
  // ---------------------------------------------------------------------------

  /**
   * Rule 311: Cache-Control header should be present.
   */
  private checkCacheControl(headers: Record<string, string>, issues: HttpHeaderIssue[]): void {
    if (!headers['cache-control']) {
      issues.push({
        ruleId: 'rule-311',
        severity: 'medium',
        title: 'Missing Cache-Control header',
        description:
          'The response does not include a Cache-Control header. ' +
          'Without Cache-Control, browsers and CDNs may use heuristic caching or no caching at all, ' +
          'leading to unnecessary network requests and slower page loads.',
        affectedElement: 'Cache-Control',
        exampleFix: 'Cache-Control: public, max-age=86400',
      });
    }
  }

  /**
   * Rule 312: ETag header should be present for conditional requests.
   */
  private checkETag(headers: Record<string, string>, issues: HttpHeaderIssue[]): void {
    if (!headers['etag']) {
      issues.push({
        ruleId: 'rule-312',
        severity: 'low',
        title: 'Missing ETag header',
        description:
          'The response does not include an ETag header. ' +
          'ETags enable conditional requests (If-None-Match), allowing the server to respond with ' +
          '304 Not Modified when content has not changed, saving bandwidth and improving performance.',
        affectedElement: 'ETag',
        exampleFix: 'ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"',
      });
    }
  }

  /**
   * Rule 313: Cache-Control max-age should meet minimum thresholds.
   * Static assets (CSS, JS, images): max-age >= 86400 (1 day)
   * HTML pages: max-age >= 3600 (1 hour)
   */
  private checkMaxAge(
    headers: Record<string, string>,
    isStaticAsset: boolean,
    issues: HttpHeaderIssue[]
  ): void {
    const cacheControl = headers['cache-control'];
    if (!cacheControl) return;

    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    if (!maxAgeMatch) return;

    const maxAge = parseInt(maxAgeMatch[1], 10);
    const threshold = isStaticAsset ? 86400 : 3600;
    const label = isStaticAsset ? 'static assets' : 'HTML pages';
    const recommendation = isStaticAsset ? '86400 (1 day)' : '3600 (1 hour)';

    if (maxAge < threshold) {
      issues.push({
        ruleId: 'rule-313',
        severity: 'medium',
        title: 'Cache-Control max-age too low',
        description:
          `The Cache-Control max-age is set to ${maxAge} seconds, which is below the ` +
          `recommended minimum of ${recommendation} for ${label}. A higher max-age reduces ` +
          'repeat requests and improves loading performance.',
        affectedElement: `Cache-Control: ${cacheControl}`,
        exampleFix: `Cache-Control: public, max-age=${threshold}`,
      });
    }
  }

  /**
   * Rule 314: Expires header should not be set to a past date.
   */
  private checkExpires(headers: Record<string, string>, issues: HttpHeaderIssue[]): void {
    const expires = headers['expires'];
    if (!expires) return;

    const expiresDate = new Date(expires);
    if (isNaN(expiresDate.getTime())) return;

    if (expiresDate.getTime() < Date.now()) {
      issues.push({
        ruleId: 'rule-314',
        severity: 'low',
        title: 'Expires header set to a past date',
        description:
          `The Expires header is set to "${expires}", which is in the past. ` +
          'A past Expires date causes the browser to treat the resource as immediately stale, ' +
          'defeating caching. Either remove the Expires header (relying on Cache-Control instead) ' +
          'or set it to a future date.',
        affectedElement: `Expires: ${expires}`,
        exampleFix: 'Expires: Thu, 31 Dec 2026 23:59:59 GMT',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Security header rules (315-319)
  // ---------------------------------------------------------------------------

  /**
   * Rule 315: Strict-Transport-Security (HSTS) should be present with max-age >= 31536000.
   */
  private checkHsts(headers: Record<string, string>, issues: HttpHeaderIssue[]): void {
    const hsts = headers['strict-transport-security'];

    if (!hsts) {
      issues.push({
        ruleId: 'rule-315',
        severity: 'medium',
        title: 'Missing Strict-Transport-Security (HSTS) header',
        description:
          'The response does not include a Strict-Transport-Security header. ' +
          'HSTS tells browsers to only access the site over HTTPS, protecting against ' +
          'protocol downgrade attacks and cookie hijacking.',
        affectedElement: 'Strict-Transport-Security',
        exampleFix: 'Strict-Transport-Security: max-age=31536000; includeSubDomains',
      });
      return;
    }

    const maxAgeMatch = hsts.match(/max-age=(\d+)/i);
    if (!maxAgeMatch) {
      issues.push({
        ruleId: 'rule-315',
        severity: 'medium',
        title: 'HSTS header missing max-age directive',
        description:
          'The Strict-Transport-Security header is present but does not include a max-age directive. ' +
          'Without max-age, the HSTS policy is not effective.',
        affectedElement: `Strict-Transport-Security: ${hsts}`,
        exampleFix: 'Strict-Transport-Security: max-age=31536000; includeSubDomains',
      });
      return;
    }

    const maxAge = parseInt(maxAgeMatch[1], 10);
    if (maxAge < 31536000) {
      issues.push({
        ruleId: 'rule-315',
        severity: 'medium',
        title: 'HSTS max-age too low',
        description:
          `The HSTS max-age is set to ${maxAge} seconds, which is below the recommended ` +
          'minimum of 31536000 (1 year). A shorter max-age reduces the window of protection ' +
          'against downgrade attacks.',
        affectedElement: `Strict-Transport-Security: ${hsts}`,
        exampleFix: 'Strict-Transport-Security: max-age=31536000; includeSubDomains',
      });
    }
  }

  /**
   * Rule 316: X-Content-Type-Options should be "nosniff".
   */
  private checkContentTypeOptions(
    headers: Record<string, string>,
    issues: HttpHeaderIssue[]
  ): void {
    const value = headers['x-content-type-options'];

    if (!value || value.trim().toLowerCase() !== 'nosniff') {
      issues.push({
        ruleId: 'rule-316',
        severity: 'medium',
        title: 'Missing or incorrect X-Content-Type-Options header',
        description:
          !value
            ? 'The response does not include an X-Content-Type-Options header. ' +
              'This header prevents browsers from MIME-sniffing the content type, ' +
              'reducing exposure to drive-by download attacks.'
            : `The X-Content-Type-Options header is set to "${value}" instead of "nosniff". ` +
              'Only "nosniff" is a valid value for this header.',
        affectedElement: 'X-Content-Type-Options',
        exampleFix: 'X-Content-Type-Options: nosniff',
      });
    }
  }

  /**
   * Rule 317: X-Frame-Options should be DENY or SAMEORIGIN.
   */
  private checkFrameOptions(headers: Record<string, string>, issues: HttpHeaderIssue[]): void {
    const value = headers['x-frame-options'];

    if (!value) {
      issues.push({
        ruleId: 'rule-317',
        severity: 'low',
        title: 'Missing X-Frame-Options header',
        description:
          'The response does not include an X-Frame-Options header. ' +
          'This header prevents the page from being embedded in iframes on other sites, ' +
          'protecting against clickjacking attacks.',
        affectedElement: 'X-Frame-Options',
        exampleFix: 'X-Frame-Options: DENY',
      });
      return;
    }

    const normalized = value.trim().toUpperCase();
    if (normalized !== 'DENY' && normalized !== 'SAMEORIGIN') {
      issues.push({
        ruleId: 'rule-317',
        severity: 'low',
        title: 'Invalid X-Frame-Options value',
        description:
          `The X-Frame-Options header is set to "${value}", which is not a recommended value. ` +
          'Use "DENY" to prevent all framing, or "SAMEORIGIN" to allow framing only by the same origin.',
        affectedElement: `X-Frame-Options: ${value}`,
        exampleFix: 'X-Frame-Options: DENY',
      });
    }
  }

  /**
   * Rule 318: Referrer-Policy should be present.
   */
  private checkReferrerPolicy(headers: Record<string, string>, issues: HttpHeaderIssue[]): void {
    if (!headers['referrer-policy']) {
      issues.push({
        ruleId: 'rule-318',
        severity: 'low',
        title: 'Missing Referrer-Policy header',
        description:
          'The response does not include a Referrer-Policy header. ' +
          'This header controls how much referrer information is sent with requests. ' +
          'Without it, browsers use their default policy, which may leak sensitive URL information.',
        affectedElement: 'Referrer-Policy',
        exampleFix: 'Referrer-Policy: strict-origin-when-cross-origin',
      });
    }
  }

  /**
   * Rule 319: Content-Security-Policy should be present.
   */
  private checkContentSecurityPolicy(
    headers: Record<string, string>,
    issues: HttpHeaderIssue[]
  ): void {
    if (!headers['content-security-policy']) {
      issues.push({
        ruleId: 'rule-319',
        severity: 'medium',
        title: 'Missing Content-Security-Policy header',
        description:
          'The response does not include a Content-Security-Policy header. ' +
          'CSP helps prevent cross-site scripting (XSS), clickjacking, and other code injection attacks ' +
          'by specifying which content sources are allowed.',
        affectedElement: 'Content-Security-Policy',
        exampleFix: "Content-Security-Policy: default-src 'self'; script-src 'self'",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Compression & protocol rules (320b-322b)
  // ---------------------------------------------------------------------------

  /**
   * Rule 320b: Brotli compression support. Brotli (br) provides 15-25% better
   * compression than gzip. If compression is gzip-only, recommend Brotli.
   */
  private checkBrotliCompression(
    headers: Record<string, string>,
    issues: HttpHeaderIssue[]
  ): void {
    const contentEncoding = headers['content-encoding'];
    if (!contentEncoding) return; // No compression at all is handled by rule 308

    const encoding = contentEncoding.toLowerCase();
    const hasBrotli = encoding.includes('br');
    const hasGzip = encoding.includes('gzip') || encoding.includes('deflate');

    if (!hasBrotli && hasGzip) {
      issues.push({
        ruleId: 'rule-320b',
        severity: 'low',
        title: 'Brotli compression not enabled',
        description:
          `The response uses "${contentEncoding}" compression but not Brotli (br). ` +
          'Brotli provides 15-25% better compression ratios than gzip for text-based content, ' +
          'reducing transfer size and improving load times. All modern browsers support Brotli.',
        affectedElement: `Content-Encoding: ${contentEncoding}`,
        exampleFix:
          'Enable Brotli compression on the server. In Nginx: brotli on; In Apache: use mod_brotli. ' +
          'Most CDNs (Cloudflare, Fastly, AWS CloudFront) support Brotli natively.',
      });
    }
  }

  /**
   * Rule 321b: HTTP/2 protocol support. HTTP/2 enables multiplexing, header
   * compression, and server push for significantly faster page loads.
   */
  private checkHttp2Protocol(
    protocol: string | undefined,
    issues: HttpHeaderIssue[]
  ): void {
    if (!protocol) return;

    const normalized = protocol.toLowerCase().replace(/\s+/g, '');
    const isHttp2OrAbove =
      normalized.includes('h2') ||
      normalized.includes('http/2') ||
      normalized.includes('h3') ||
      normalized.includes('http/3');

    if (!isHttp2OrAbove) {
      issues.push({
        ruleId: 'rule-321b',
        severity: 'medium',
        title: 'HTTP/2 not supported',
        description:
          `The server is using "${protocol}" instead of HTTP/2 or HTTP/3. ` +
          'HTTP/2 enables multiplexed requests, header compression (HPACK), and eliminates ' +
          'head-of-line blocking, resulting in significantly faster page loads. ' +
          'HTTP/2 is supported by all modern browsers and most hosting providers.',
        affectedElement: `Protocol: ${protocol}`,
        exampleFix:
          'Enable HTTP/2 on the server. In Nginx: listen 443 ssl http2; ' +
          'In Apache: Protocols h2 http/1.1. Ensure TLS 1.2+ is configured.',
      });
    }
  }

  /**
   * Rule 322b: UTF-8 consistency in Content-Type header. The Content-Type
   * should explicitly declare charset=utf-8 for HTML documents.
   */
  private checkUtf8Consistency(
    headers: Record<string, string>,
    issues: HttpHeaderIssue[]
  ): void {
    const contentType = headers['content-type'];
    if (!contentType) return;

    // Only check HTML documents
    if (!contentType.toLowerCase().includes('text/html')) return;

    const hasCharset = /charset\s*=/i.test(contentType);
    const hasUtf8 = /charset\s*=\s*utf-?8/i.test(contentType);

    if (!hasCharset) {
      issues.push({
        ruleId: 'rule-322b',
        severity: 'medium',
        title: 'Content-Type missing charset declaration',
        description:
          `The Content-Type header "${contentType}" does not declare a character encoding. ` +
          'Without an explicit charset, browsers may use heuristic encoding detection, ' +
          'potentially causing garbled text for international content. ' +
          'Always declare charset=utf-8 for HTML documents.',
        affectedElement: `Content-Type: ${contentType}`,
        exampleFix: 'Content-Type: text/html; charset=utf-8',
      });
    } else if (!hasUtf8) {
      issues.push({
        ruleId: 'rule-322b',
        severity: 'low',
        title: 'Content-Type uses non-UTF-8 charset',
        description:
          `The Content-Type header "${contentType}" declares a charset that is not UTF-8. ` +
          'UTF-8 is the universal standard encoding for the web, supporting all languages and scripts. ' +
          'Using a different encoding may cause character rendering issues and is not recommended.',
        affectedElement: `Content-Type: ${contentType}`,
        exampleFix: 'Content-Type: text/html; charset=utf-8',
      });
    }
  }
}
