import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FactValidator } from '../FactValidator';
import type { FactClaim, VerificationSource } from '../types';
import type { ClaimVerifier, FactValidationCacheAdapter } from '../FactValidator';

describe('FactValidator', () => {
  describe('extractClaims', () => {
    const validator = new FactValidator();

    it('identifies statistics claims (percentages)', async () => {
      const text = '83% of marketers use content marketing. The company was founded in 2015.';
      const claims = await validator.extractClaims(text, 'en');
      expect(claims.length).toBeGreaterThanOrEqual(2);
      expect(claims.find(c => c.claimType === 'statistic')).toBeDefined();
      expect(claims.find(c => c.claimType === 'date')).toBeDefined();
    });

    it('identifies attribution claims', async () => {
      const text = 'According to Harvard Business Review, companies that invest in SEO see 3x ROI.';
      const claims = await validator.extractClaims(text, 'en');
      expect(claims.find(c => c.claimType === 'attribution')).toBeDefined();
    });

    it('identifies comparison claims', async () => {
      const text = 'Organic search drives more than 50% of website traffic compared to paid advertising.';
      const claims = await validator.extractClaims(text, 'en');
      // Should match either statistic or comparison
      expect(claims.length).toBeGreaterThanOrEqual(1);
    });

    it('skips very short sentences', async () => {
      const text = 'Short. Also short. This is a longer sentence with 42% conversion rate.';
      const claims = await validator.extractClaims(text, 'en');
      // Only the last sentence should produce a claim
      expect(claims.every(c => c.text.length >= 15)).toBe(true);
    });

    it('returns empty for content with no claims', async () => {
      const text = 'This is a simple paragraph about content marketing strategies.';
      const claims = await validator.extractClaims(text, 'en');
      expect(claims).toHaveLength(0);
    });
  });

  describe('verifyClaim', () => {
    it('returns verified status with sources when verifier confirms', async () => {
      const mockVerifier: ClaimVerifier = vi.fn().mockResolvedValue({
        status: 'verified',
        sources: [{
          url: 'https://example.com/source',
          title: 'Source Article',
          snippet: 'Confirms the claim',
          agreesWithClaim: true,
          retrievedAt: new Date().toISOString(),
        }],
      });

      const validator = new FactValidator(mockVerifier);
      const claim: FactClaim = {
        id: 'test-1',
        text: 'The Earth orbits the Sun',
        claimType: 'general',
        confidence: 0.9,
        verificationStatus: 'unverified',
        verificationSources: [],
      };

      const result = await validator.verifyClaim(claim);
      expect(result.verificationStatus).toBe('verified');
      expect(result.verificationSources.length).toBeGreaterThanOrEqual(1);
    });

    it('flags outdated statistics without calling verifier', async () => {
      const mockVerifier: ClaimVerifier = vi.fn();
      const validator = new FactValidator(mockVerifier);

      const claim: FactClaim = {
        id: 'test-2',
        text: 'As of 2019, 65% of businesses use social media',
        claimType: 'statistic',
        confidence: 0.8,
        verificationStatus: 'unverified',
        verificationSources: [],
      };

      const result = await validator.verifyClaim(claim);
      expect(result.verificationStatus).toBe('outdated');
      expect(result.suggestion).toContain('older than 2 years');
      expect(mockVerifier).not.toHaveBeenCalled();
    });

    it('handles verifier errors gracefully', async () => {
      const mockVerifier: ClaimVerifier = vi.fn().mockRejectedValue(new Error('Service unavailable'));
      const validator = new FactValidator(mockVerifier);

      const claim: FactClaim = {
        id: 'test-3',
        text: 'A new study shows content marketing is effective',
        claimType: 'general',
        confidence: 0.7,
        verificationStatus: 'unverified',
        verificationSources: [],
      };

      const result = await validator.verifyClaim(claim);
      expect(result.verificationStatus).toBe('unable_to_verify');
    });
  });

  describe('verifyAll', () => {
    it('batch-verifies with concurrency limit', async () => {
      const callOrder: number[] = [];
      let activeCount = 0;
      let maxActive = 0;

      const mockVerifier: ClaimVerifier = vi.fn().mockImplementation(async () => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        callOrder.push(activeCount);
        await new Promise(resolve => setTimeout(resolve, 10));
        activeCount--;
        return { status: 'verified' as const, sources: [] };
      });

      const validator = new FactValidator(mockVerifier);
      const claims: FactClaim[] = Array.from({ length: 6 }, (_, i) => ({
        id: `claim-${i}`,
        text: `Claim number ${i} is a test statement`,
        claimType: 'general' as const,
        confidence: 0.8,
        verificationStatus: 'unverified' as const,
        verificationSources: [],
      }));

      const results = await validator.verifyAll(claims, 3);
      expect(results).toHaveLength(6);
      results.forEach(r => expect(r.verificationStatus).not.toBe('unverified'));
      // Concurrency should be respected: max 3 at a time
      expect(maxActive).toBeLessThanOrEqual(3);
    });
  });

  describe('helper methods', () => {
    const validator = new FactValidator();

    it('isOutdated detects old years', () => {
      expect(validator.isOutdated('In 2019, the market grew')).toBe(true);
      expect(validator.isOutdated('In 2025, the market will grow')).toBe(false);
    });

    it('isUnattributed detects statistics without attribution', () => {
      expect(validator.isUnattributed('83% of users prefer organic search')).toBe(true);
      expect(validator.isUnattributed('According to Google, 83% of users prefer organic search')).toBe(false);
    });
  });

  describe('caching', () => {
    it('returns cached result without calling verifier', async () => {
      const mockVerifier: ClaimVerifier = vi.fn();
      const mockCache: FactValidationCacheAdapter = {
        get: vi.fn().mockResolvedValue({
          verificationStatus: 'verified',
          verificationSources: [{ url: 'https://cached.com', title: 'Cached', snippet: 'From cache', agreesWithClaim: true, retrievedAt: '2026-01-01' }],
        }),
        set: vi.fn(),
      };

      const validator = new FactValidator(mockVerifier, mockCache);
      const claim: FactClaim = {
        id: 'cache-test',
        text: 'The sky is blue',
        claimType: 'general',
        confidence: 0.9,
        verificationStatus: 'unverified',
        verificationSources: [],
      };

      const result = await validator.verifyClaim(claim);
      expect(result.verificationStatus).toBe('verified');
      expect(mockVerifier).not.toHaveBeenCalled();
      expect(mockCache.get).toHaveBeenCalled();
    });

    it('stores verified result in cache', async () => {
      const mockVerifier: ClaimVerifier = vi.fn().mockResolvedValue({
        status: 'verified',
        sources: [],
      });
      const mockCache: FactValidationCacheAdapter = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
      };

      const validator = new FactValidator(mockVerifier, mockCache);
      const claim: FactClaim = {
        id: 'store-test',
        text: 'Water is wet',
        claimType: 'general',
        confidence: 0.9,
        verificationStatus: 'unverified',
        verificationSources: [],
      };

      await validator.verifyClaim(claim);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('works without cache adapter (backward compatible)', async () => {
      const mockVerifier: ClaimVerifier = vi.fn().mockResolvedValue({
        status: 'verified',
        sources: [],
      });

      const validator = new FactValidator(mockVerifier);
      const claim: FactClaim = {
        id: 'no-cache-test',
        text: 'Gravity exists on Earth',
        claimType: 'general',
        confidence: 0.9,
        verificationStatus: 'unverified',
        verificationSources: [],
      };

      const result = await validator.verifyClaim(claim);
      expect(result.verificationStatus).toBe('verified');
      expect(mockVerifier).toHaveBeenCalled();
    });

    it('handles cache set failure gracefully', async () => {
      const mockVerifier: ClaimVerifier = vi.fn().mockResolvedValue({
        status: 'verified',
        sources: [],
      });
      const mockCache: FactValidationCacheAdapter = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockRejectedValue(new Error('Cache write failed')),
      };

      const validator = new FactValidator(mockVerifier, mockCache);
      const claim: FactClaim = {
        id: 'cache-fail-test',
        text: 'The moon orbits Earth',
        claimType: 'general',
        confidence: 0.9,
        verificationStatus: 'unverified',
        verificationSources: [],
      };

      // Should not throw despite cache failure
      const result = await validator.verifyClaim(claim);
      expect(result.verificationStatus).toBe('verified');
    });
  });
});
