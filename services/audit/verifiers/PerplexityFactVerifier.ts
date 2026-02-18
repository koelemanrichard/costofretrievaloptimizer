// services/audit/verifiers/PerplexityFactVerifier.ts

/**
 * PerplexityFactVerifier
 *
 * Uses Perplexity AI's search-grounded responses to verify factual claims.
 * Replaces the stubbed fact validation that always returns "unable_to_verify".
 *
 * Verification process:
 * 1. Extract factual claims from content (EAV triples)
 * 2. Send each claim to Perplexity for verification
 * 3. Compare Perplexity's response with the claim
 * 4. Return verification status with sources
 */

import { getProviderEndpoint, SERVICE_REGISTRY } from '../../../config/serviceRegistry';

export type VerificationStatus = 'verified' | 'contradicted' | 'unverifiable' | 'outdated' | 'partially_correct';

export interface FactClaim {
  /** The entity (subject) */
  entity: string;
  /** The attribute (predicate) */
  attribute: string;
  /** The claimed value (object) */
  value: string;
  /** Source text containing the claim */
  sourceText?: string;
}

export interface FactVerificationResult {
  /** The claim being verified */
  claim: FactClaim;
  /** Verification status */
  status: VerificationStatus;
  /** Confidence score (0-1) */
  confidence: number;
  /** What Perplexity found */
  foundValue?: string;
  /** Sources that support or contradict */
  sources?: string[];
  /** Explanation */
  explanation: string;
}

export interface FactVerificationReport {
  /** Total claims checked */
  totalClaims: number;
  /** Verified claims */
  verified: number;
  /** Contradicted claims */
  contradicted: number;
  /** Unverifiable claims */
  unverifiable: number;
  /** Outdated claims */
  outdated: number;
  /** Partially correct claims */
  partiallyCorrect: number;
  /** Overall accuracy score (0-100) */
  accuracyScore: number;
  /** Per-claim results */
  results: FactVerificationResult[];
}

export class PerplexityFactVerifier {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || SERVICE_REGISTRY.providers.perplexity?.models?.default || 'sonar';
  }

  /**
   * Verify a single factual claim.
   */
  async verifyClaim(claim: FactClaim): Promise<FactVerificationResult> {
    try {
      const query = `Is it true that ${claim.entity} ${claim.attribute} is ${claim.value}? Provide a brief factual answer with sources.`;

      const response = await fetch(getProviderEndpoint('perplexity', 'chat'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a fact-checking assistant. Verify the following claim and respond with: VERIFIED if true, CONTRADICTED if false (provide correct value), OUTDATED if was true but no longer, PARTIALLY_CORRECT if somewhat right, or UNVERIFIABLE if cannot be confirmed. Always provide your reasoning concisely.',
            },
            {
              role: 'user',
              content: query,
            },
          ],
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        return {
          claim,
          status: 'unverifiable',
          confidence: 0,
          explanation: `API error: ${response.status}`,
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const citations = data.citations || [];

      return this.parseVerificationResponse(claim, content, citations);
    } catch (error) {
      return {
        claim,
        status: 'unverifiable',
        confidence: 0,
        explanation: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verify multiple claims in batch.
   */
  async verifyBatch(
    claims: FactClaim[],
    concurrency: number = 3
  ): Promise<FactVerificationReport> {
    const results: FactVerificationResult[] = [];

    // Process in batches for rate limiting
    for (let i = 0; i < claims.length; i += concurrency) {
      const batch = claims.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(claim => this.verifyClaim(claim))
      );
      results.push(...batchResults);
    }

    // Aggregate
    const counts = {
      verified: 0,
      contradicted: 0,
      unverifiable: 0,
      outdated: 0,
      partiallyCorrect: 0,
    };

    for (const result of results) {
      switch (result.status) {
        case 'verified': counts.verified++; break;
        case 'contradicted': counts.contradicted++; break;
        case 'unverifiable': counts.unverifiable++; break;
        case 'outdated': counts.outdated++; break;
        case 'partially_correct': counts.partiallyCorrect++; break;
      }
    }

    const verifiable = claims.length - counts.unverifiable;
    const accuracyScore = verifiable > 0
      ? Math.round(((counts.verified + counts.partiallyCorrect * 0.5) / verifiable) * 100)
      : 0;

    return {
      totalClaims: claims.length,
      ...counts,
      accuracyScore,
      results,
    };
  }

  /**
   * Extract factual claims from content (basic heuristic extraction).
   */
  static extractClaims(content: string, entity: string): FactClaim[] {
    const claims: FactClaim[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();

      // Pattern: "Entity is/are/was value"
      const isMatch = trimmed.match(new RegExp(
        `${entity}\\s+(?:is|are|was|were|has|have|had)\\s+(.+)`,
        'i'
      ));
      if (isMatch) {
        claims.push({
          entity,
          attribute: 'is',
          value: isMatch[1].trim(),
          sourceText: trimmed,
        });
        continue;
      }

      // Pattern: "The attribute of Entity is value"
      const ofMatch = trimmed.match(/the\s+(\w+(?:\s+\w+)?)\s+of\s+(.+?)\s+is\s+(.+)/i);
      if (ofMatch) {
        claims.push({
          entity: ofMatch[2].trim(),
          attribute: ofMatch[1].trim(),
          value: ofMatch[3].trim(),
          sourceText: trimmed,
        });
        continue;
      }

      // Pattern: "Entity verb number/percentage"
      const numMatch = trimmed.match(new RegExp(
        `${entity}\\s+(?:\\w+\\s+){0,3}(\\d[\\d,.]+(?:\\s*%|\\s+\\w+)?)`,
        'i'
      ));
      if (numMatch) {
        claims.push({
          entity,
          attribute: 'statistic',
          value: numMatch[1].trim(),
          sourceText: trimmed,
        });
      }
    }

    return claims.slice(0, 50); // Limit to 50 claims
  }

  private parseVerificationResponse(
    claim: FactClaim,
    content: string,
    citations: string[]
  ): FactVerificationResult {
    const contentUpper = content.toUpperCase();

    let status: VerificationStatus = 'unverifiable';
    let confidence = 0.5;

    if (contentUpper.includes('VERIFIED') || contentUpper.includes('TRUE') || contentUpper.includes('CORRECT')) {
      status = 'verified';
      confidence = 0.85;
    } else if (contentUpper.includes('CONTRADICTED') || contentUpper.includes('FALSE') || contentUpper.includes('INCORRECT')) {
      status = 'contradicted';
      confidence = 0.8;
    } else if (contentUpper.includes('OUTDATED') || contentUpper.includes('NO LONGER') || contentUpper.includes('PREVIOUSLY')) {
      status = 'outdated';
      confidence = 0.75;
    } else if (contentUpper.includes('PARTIALLY') || contentUpper.includes('SOMEWHAT')) {
      status = 'partially_correct';
      confidence = 0.7;
    }

    // Extract found value if contradicted
    let foundValue: string | undefined;
    if (status === 'contradicted' || status === 'outdated') {
      const valueMatch = content.match(/(?:actually|currently|correct value is|should be)\s+(.+?)(?:\.|,|$)/i);
      if (valueMatch) foundValue = valueMatch[1].trim();
    }

    return {
      claim,
      status,
      confidence,
      foundValue,
      sources: citations.length > 0 ? citations : undefined,
      explanation: content.substring(0, 500),
    };
  }
}
