/**
 * Fact Validation Phase Adapter
 *
 * Extracts factual claims from content and verifies them against external sources.
 * Bonus/optional phase — only runs when includeFactValidation is enabled.
 *
 * TODO: Implement in Sprint 3 — fact extraction, verification against sources, citation checks
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult } from '../types';

export class FactValidationPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'factValidation';

  async execute(request: AuditRequest): Promise<AuditPhaseResult> {
    // TODO (Sprint 3): Implement fact validation
    // Will extract factual claims and verify against external sources
    return this.buildResult([], 0);
  }
}
