/**
 * Fact Validation Phase Adapter
 *
 * Extracts factual claims from content and verifies them against external sources.
 * Bonus/optional phase — only runs when includeFactValidation is enabled.
 *
 * Delegates to FactValidator for claim extraction and verification,
 * then transforms problematic claims into AuditFinding[].
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding, FetchedContent, FactClaim } from '../types';
import { FactValidator } from '../FactValidator';
import type { ClaimVerifier } from '../FactValidator';

export class FactValidationPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'factValidation';
  private readonly factValidator: FactValidator;

  constructor(verifier?: ClaimVerifier) {
    super();
    this.factValidator = new FactValidator(verifier);
  }

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    // Only run if fact validation is requested AND content is available
    if (!request.includeFactValidation) {
      return this.buildResult([], 0);
    }

    const fetched = content as FetchedContent | undefined;
    if (!fetched?.semanticText) {
      return this.buildResult([], 0);
    }

    // Step 1: Extract claims
    const claims = await this.factValidator.extractClaims(fetched.semanticText, request.language);
    if (claims.length === 0) {
      return this.buildResult([], 0);
    }

    // Step 2: Verify all claims
    const verified = await this.factValidator.verifyAll(claims);

    // Step 3: Transform problematic claims to findings
    const findings = this.transformClaimsToFindings(verified);
    const totalChecks = verified.length;

    return this.buildResult(findings, totalChecks);
  }

  private transformClaimsToFindings(claims: FactClaim[]): AuditFinding[] {
    return claims
      .filter(c => c.verificationStatus !== 'verified' && c.verificationStatus !== 'unverified')
      .map(claim => this.createFinding({
        ruleId: `fv-${claim.claimType}-${claim.id}`,
        severity: this.claimSeverity(claim),
        title: this.claimTitle(claim),
        description: claim.text,
        whyItMatters: this.whyItMatters(claim),
        currentValue: claim.verificationStatus,
        expectedValue: 'verified',
        exampleFix: claim.suggestion || this.defaultSuggestion(claim),
        category: 'Fact Validation',
        estimatedImpact: claim.verificationStatus === 'disputed' ? 'high' : 'medium',
      }));
  }

  private claimSeverity(claim: FactClaim): AuditFinding['severity'] {
    switch (claim.verificationStatus) {
      case 'disputed': return 'critical';
      case 'outdated': return 'high';
      case 'unable_to_verify': return 'medium';
      default: return 'low';
    }
  }

  private claimTitle(claim: FactClaim): string {
    switch (claim.verificationStatus) {
      case 'disputed': return `Disputed ${claim.claimType}: may be inaccurate`;
      case 'outdated': return `Outdated ${claim.claimType}: data may be stale`;
      case 'unable_to_verify': return `Unverifiable ${claim.claimType}: no sources found`;
      default: return `${claim.claimType} claim needs review`;
    }
  }

  private whyItMatters(claim: FactClaim): string {
    switch (claim.verificationStatus) {
      case 'disputed': return 'Disputed facts damage credibility and E-E-A-T signals. Search engines increasingly verify factual accuracy.';
      case 'outdated': return 'Outdated statistics reduce content freshness signals and may mislead readers, harming trust and authority.';
      case 'unable_to_verify': return 'Unverifiable claims weaken topical authority. Adding source citations improves E-E-A-T and user trust.';
      default: return 'Factual accuracy is a core component of content quality and E-E-A-T.';
    }
  }

  private defaultSuggestion(claim: FactClaim): string {
    switch (claim.verificationStatus) {
      case 'disputed': return 'Verify this claim against authoritative sources and correct or remove if inaccurate.';
      case 'outdated': return 'Update this statistic with the most recent available data and add a source citation.';
      case 'unable_to_verify': return 'Add a source citation or link to support this claim.';
      default: return 'Review this claim for accuracy.';
    }
  }
}
