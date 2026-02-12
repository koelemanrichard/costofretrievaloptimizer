import type { FactClaim, VerificationSource } from './types';

/**
 * Function signature for claim verification.
 * Accepts a claim text and returns verification results.
 */
export type ClaimVerifier = (claimText: string) => Promise<{
  status: FactClaim['verificationStatus'];
  sources: VerificationSource[];
  suggestion?: string;
}>;

/**
 * Optional cache adapter for storing/retrieving fact verification results.
 * Implementations may use Supabase, localStorage, or any other storage backend.
 */
export interface FactValidationCacheAdapter {
  get(claimHash: string): Promise<FactClaim | null>;
  set(claimHash: string, claim: FactClaim): Promise<void>;
}

export class FactValidator {
  private readonly verifier: ClaimVerifier;
  private readonly cache?: FactValidationCacheAdapter;

  /**
   * @param verifier Optional custom verifier. Defaults to a stub that marks claims as unable_to_verify.
   *                 In production, pass a Perplexity-based verifier.
   * @param cache    Optional cache adapter. When provided, verified claims are cached and
   *                 subsequent lookups skip the verifier if a cached result exists.
   */
  constructor(verifier?: ClaimVerifier, cache?: FactValidationCacheAdapter) {
    this.verifier = verifier || this.defaultVerifier;
    this.cache = cache;
  }

  /**
   * Extract factual claims from content using regex patterns.
   * Identifies: statistics (percentages, numbers), dates, attributions, comparisons.
   */
  async extractClaims(content: string, language: string = 'en'): Promise<FactClaim[]> {
    const claims: FactClaim[] = [];
    const sentences = this.splitSentences(content);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed || trimmed.length < 15) continue;

      // Check for statistics (percentages, specific numbers)
      if (this.isStatistic(trimmed)) {
        claims.push(this.makeClaim(trimmed, 'statistic', this.isOutdated(trimmed) ? 0.6 : 0.8));
      }
      // Check for dates
      else if (this.isDateClaim(trimmed)) {
        claims.push(this.makeClaim(trimmed, 'date', 0.7));
      }
      // Check for attributions ("according to", "study by", etc.)
      else if (this.isAttribution(trimmed)) {
        claims.push(this.makeClaim(trimmed, 'attribution', 0.85));
      }
      // Check for comparisons ("more than", "X times", "better than")
      else if (this.isComparison(trimmed)) {
        claims.push(this.makeClaim(trimmed, 'comparison', 0.7));
      }
    }

    return claims;
  }

  /**
   * Verify a single claim using the verifier function.
   * When a cache adapter is configured, results are checked/stored in cache.
   */
  async verifyClaim(claim: FactClaim): Promise<FactClaim> {
    // Check for outdated statistics first
    if (claim.claimType === 'statistic' && this.isOutdated(claim.text)) {
      return {
        ...claim,
        verificationStatus: 'outdated',
        suggestion: 'This statistic appears to reference data older than 2 years. Consider updating with recent data.',
      };
    }

    // Check cache if available
    const hash = this.hashClaim(claim.text);
    if (this.cache) {
      const cached = await this.cache.get(hash);
      if (cached) return { ...claim, ...cached };
    }

    // Call verifier
    try {
      const result = await this.verifier(claim.text);
      const verified: FactClaim = {
        ...claim,
        verificationStatus: result.status,
        verificationSources: result.sources,
        suggestion: result.suggestion,
      };

      // Store in cache (non-fatal if it fails)
      if (this.cache) {
        await this.cache.set(hash, verified).catch(() => {});
      }

      return verified;
    } catch {
      return {
        ...claim,
        verificationStatus: 'unable_to_verify',
        suggestion: 'Verification service unavailable.',
      };
    }
  }

  /**
   * Verify multiple claims with concurrency limit.
   */
  async verifyAll(claims: FactClaim[], concurrency: number = 3): Promise<FactClaim[]> {
    const results: FactClaim[] = [];
    const queue = [...claims];

    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);
      const batchResults = await Promise.all(batch.map(c => this.verifyClaim(c)));
      results.push(...batchResults);
    }

    return results;
  }

  // --- Internal helpers ---

  private splitSentences(text: string): string[] {
    // Split on sentence boundaries
    return text.split(/(?<=[.!?])\s+/).filter(s => s.length > 0);
  }

  private makeClaim(text: string, type: FactClaim['claimType'], confidence: number): FactClaim {
    return {
      id: `claim-${crypto.randomUUID().slice(0, 8)}`,
      text,
      claimType: type,
      confidence,
      verificationStatus: 'unverified',
      verificationSources: [],
    };
  }

  /**
   * Create a simple hash string for cache key lookup.
   * Consistent for the same claim text.
   */
  private hashClaim(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `fv-${Math.abs(hash).toString(36)}`;
  }

  /**
   * Detect if text contains a statistic (percentage, large number).
   */
  private isStatistic(text: string): boolean {
    return /\d+(\.\d+)?%/.test(text) || /\b\d{1,3}(,\d{3})+\b/.test(text) || /\b\d+(\.\d+)?\s*(million|billion|trillion)\b/i.test(text);
  }

  /**
   * Detect if text references a specific date or year.
   */
  private isDateClaim(text: string): boolean {
    return /\b(in|since|as of|by|from|until)\s+\d{4}\b/i.test(text) ||
           /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i.test(text);
  }

  /**
   * Detect if text is an attribution ("According to X", "X reported", "study by X").
   */
  private isAttribution(text: string): boolean {
    return /\b(according to|as reported by|research by|study by|survey by|data from|published by|cited by|source:|per)\b/i.test(text);
  }

  /**
   * Detect if text makes a comparison.
   */
  private isComparison(text: string): boolean {
    return /\b(\d+(\.\d+)?x|more than|less than|greater than|better than|worse than|compared to|outperform|surpass)\b/i.test(text);
  }

  /**
   * Detect if a statistic references data older than 2 years.
   */
  isOutdated(text: string): boolean {
    const currentYear = new Date().getFullYear();
    const yearMatch = text.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      return currentYear - year > 2;
    }
    return false;
  }

  /**
   * Detect if a statistic lacks attribution.
   */
  isUnattributed(text: string): boolean {
    return this.isStatistic(text) && !this.isAttribution(text);
  }

  private defaultVerifier: ClaimVerifier = async (_claimText: string) => ({
    status: 'unable_to_verify' as const,
    sources: [],
    suggestion: 'No verification service configured.',
  });
}
