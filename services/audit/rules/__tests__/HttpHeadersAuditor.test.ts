import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpHeadersAuditor, type HttpHeadersInput } from '../HttpHeadersAuditor';

describe('HttpHeadersAuditor', () => {
  const auditor = new HttpHeadersAuditor();

  // ---------------------------------------------------------------------------
  // Rule 311 — Cache-Control header presence
  // ---------------------------------------------------------------------------
  describe('rule-311: Cache-Control presence', () => {
    it('flags missing Cache-Control header', () => {
      const issues = auditor.validate({ headers: {} });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-311' }));
    });

    it('passes when Cache-Control header is present', () => {
      const issues = auditor.validate({
        headers: { 'Cache-Control': 'public, max-age=86400' },
      });
      expect(issues.find(i => i.ruleId === 'rule-311')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 312 — ETag header presence
  // ---------------------------------------------------------------------------
  describe('rule-312: ETag presence', () => {
    it('flags missing ETag header', () => {
      const issues = auditor.validate({ headers: {} });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-312' }));
    });

    it('passes when ETag header is present', () => {
      const issues = auditor.validate({
        headers: { ETag: '"abc123"' },
      });
      expect(issues.find(i => i.ruleId === 'rule-312')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 313 — Cache-Control max-age thresholds
  // ---------------------------------------------------------------------------
  describe('rule-313: max-age thresholds', () => {
    it('flags low max-age for static assets (<86400)', () => {
      const issues = auditor.validate({
        headers: { 'Cache-Control': 'public, max-age=3600' },
        isStaticAsset: true,
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-313' }));
    });

    it('passes adequate max-age for static assets (>=86400)', () => {
      const issues = auditor.validate({
        headers: { 'Cache-Control': 'public, max-age=86400' },
        isStaticAsset: true,
      });
      expect(issues.find(i => i.ruleId === 'rule-313')).toBeUndefined();
    });

    it('flags low max-age for HTML pages (<3600)', () => {
      const issues = auditor.validate({
        headers: { 'Cache-Control': 'public, max-age=600' },
        isStaticAsset: false,
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-313' }));
    });

    it('passes adequate max-age for HTML pages (>=3600)', () => {
      const issues = auditor.validate({
        headers: { 'Cache-Control': 'public, max-age=3600' },
        isStaticAsset: false,
      });
      expect(issues.find(i => i.ruleId === 'rule-313')).toBeUndefined();
    });

    it('does not flag rule-313 when Cache-Control has no max-age directive', () => {
      const issues = auditor.validate({
        headers: { 'Cache-Control': 'no-store' },
        isStaticAsset: true,
      });
      expect(issues.find(i => i.ruleId === 'rule-313')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 314 — Expires header not in the past
  // ---------------------------------------------------------------------------
  describe('rule-314: Expires date', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('flags Expires header set to a past date', () => {
      const issues = auditor.validate({
        headers: { Expires: 'Thu, 01 Jan 2020 00:00:00 GMT' },
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-314' }));
    });

    it('passes Expires header set to a future date', () => {
      const issues = auditor.validate({
        headers: { Expires: 'Thu, 31 Dec 2099 23:59:59 GMT' },
      });
      expect(issues.find(i => i.ruleId === 'rule-314')).toBeUndefined();
    });

    it('ignores unparseable Expires value', () => {
      const issues = auditor.validate({
        headers: { Expires: 'not-a-date' },
      });
      expect(issues.find(i => i.ruleId === 'rule-314')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 315 — Strict-Transport-Security (HSTS)
  // ---------------------------------------------------------------------------
  describe('rule-315: HSTS', () => {
    it('flags missing HSTS header', () => {
      const issues = auditor.validate({ headers: {} });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-315' }));
    });

    it('flags HSTS with max-age below 31536000', () => {
      const issues = auditor.validate({
        headers: { 'Strict-Transport-Security': 'max-age=86400' },
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-315', title: expect.stringContaining('too low') })
      );
    });

    it('passes HSTS with max-age >= 31536000', () => {
      const issues = auditor.validate({
        headers: { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' },
      });
      expect(issues.find(i => i.ruleId === 'rule-315')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 316 — X-Content-Type-Options
  // ---------------------------------------------------------------------------
  describe('rule-316: X-Content-Type-Options', () => {
    it('flags missing X-Content-Type-Options', () => {
      const issues = auditor.validate({ headers: {} });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-316' }));
    });

    it('flags incorrect X-Content-Type-Options value', () => {
      const issues = auditor.validate({
        headers: { 'X-Content-Type-Options': 'sniff' },
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-316' }));
    });

    it('passes correct X-Content-Type-Options: nosniff', () => {
      const issues = auditor.validate({
        headers: { 'X-Content-Type-Options': 'nosniff' },
      });
      expect(issues.find(i => i.ruleId === 'rule-316')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 317 — X-Frame-Options
  // ---------------------------------------------------------------------------
  describe('rule-317: X-Frame-Options', () => {
    it('flags missing X-Frame-Options', () => {
      const issues = auditor.validate({ headers: {} });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-317' }));
    });

    it('flags invalid X-Frame-Options value', () => {
      const issues = auditor.validate({
        headers: { 'X-Frame-Options': 'ALLOW-FROM https://example.com' },
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-317' }));
    });

    it('passes X-Frame-Options: DENY', () => {
      const issues = auditor.validate({
        headers: { 'X-Frame-Options': 'DENY' },
      });
      expect(issues.find(i => i.ruleId === 'rule-317')).toBeUndefined();
    });

    it('passes X-Frame-Options: SAMEORIGIN', () => {
      const issues = auditor.validate({
        headers: { 'X-Frame-Options': 'SAMEORIGIN' },
      });
      expect(issues.find(i => i.ruleId === 'rule-317')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 318 — Referrer-Policy
  // ---------------------------------------------------------------------------
  describe('rule-318: Referrer-Policy', () => {
    it('flags missing Referrer-Policy', () => {
      const issues = auditor.validate({ headers: {} });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-318' }));
    });

    it('passes when Referrer-Policy is present', () => {
      const issues = auditor.validate({
        headers: { 'Referrer-Policy': 'strict-origin-when-cross-origin' },
      });
      expect(issues.find(i => i.ruleId === 'rule-318')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 319 — Content-Security-Policy
  // ---------------------------------------------------------------------------
  describe('rule-319: Content-Security-Policy', () => {
    it('flags missing Content-Security-Policy', () => {
      const issues = auditor.validate({ headers: {} });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-319' }));
    });

    it('passes when Content-Security-Policy is present', () => {
      const issues = auditor.validate({
        headers: { 'Content-Security-Policy': "default-src 'self'" },
      });
      expect(issues.find(i => i.ruleId === 'rule-319')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Combined / integration tests
  // ---------------------------------------------------------------------------
  describe('combined scenarios', () => {
    it('returns zero issues for a fully secured response', () => {
      const issues = auditor.validate({
        headers: {
          'Cache-Control': 'public, max-age=86400',
          ETag: '"abc123"',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Content-Security-Policy': "default-src 'self'",
        },
        isStaticAsset: true,
      });
      expect(issues).toHaveLength(0);
    });

    it('triggers all 9 rules for a completely insecure response', () => {
      const issues = auditor.validate({
        headers: { Expires: 'Thu, 01 Jan 2020 00:00:00 GMT' },
      });

      const ruleIds = issues.map(i => i.ruleId);
      expect(ruleIds).toContain('rule-311');
      expect(ruleIds).toContain('rule-312');
      // rule-313 not triggered: no Cache-Control means no max-age to check
      expect(ruleIds).toContain('rule-314');
      expect(ruleIds).toContain('rule-315');
      expect(ruleIds).toContain('rule-316');
      expect(ruleIds).toContain('rule-317');
      expect(ruleIds).toContain('rule-318');
      expect(ruleIds).toContain('rule-319');
      expect(issues.length).toBe(8);
    });

    it('returns all 9 rule IDs for insecure response with low max-age', () => {
      const issues = auditor.validate({
        headers: {
          'Cache-Control': 'public, max-age=10',
          Expires: 'Thu, 01 Jan 2020 00:00:00 GMT',
        },
        isStaticAsset: true,
      });

      const ruleIds = issues.map(i => i.ruleId);
      // Cache-Control is present, so rule-311 should NOT fire
      expect(ruleIds).not.toContain('rule-311');
      expect(ruleIds).toContain('rule-312');
      expect(ruleIds).toContain('rule-313');
      expect(ruleIds).toContain('rule-314');
      expect(ruleIds).toContain('rule-315');
      expect(ruleIds).toContain('rule-316');
      expect(ruleIds).toContain('rule-317');
      expect(ruleIds).toContain('rule-318');
      expect(ruleIds).toContain('rule-319');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles empty headers object', () => {
      const issues = auditor.validate({ headers: {} });
      expect(issues.length).toBeGreaterThan(0);
      // Should flag 311, 312, 315, 316, 317, 318, 319 (7 issues)
      expect(issues).toHaveLength(7);
    });

    it('handles case-insensitive header keys', () => {
      const issues = auditor.validate({
        headers: {
          'CACHE-CONTROL': 'public, max-age=86400',
          'ETAG': '"abc"',
          'STRICT-TRANSPORT-SECURITY': 'max-age=31536000',
          'X-CONTENT-TYPE-OPTIONS': 'nosniff',
          'X-FRAME-OPTIONS': 'DENY',
          'REFERRER-POLICY': 'no-referrer',
          'CONTENT-SECURITY-POLICY': "default-src 'self'",
        },
        isStaticAsset: true,
      });
      expect(issues).toHaveLength(0);
    });
  });
});
