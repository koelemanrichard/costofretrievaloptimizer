/**
 * Website Type-Specific Phase Adapter
 *
 * Applies audit rules specific to the website type (e-commerce, blog, SaaS, etc.).
 * Bonus/optional phase — not included in the standard 100% weight total.
 *
 * TODO: Implement in Sprint 7 — e-commerce rules, blog rules, SaaS rules, type detection
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult } from '../types';

export class WebsiteTypeSpecificPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'websiteTypeSpecific';

  async execute(request: AuditRequest): Promise<AuditPhaseResult> {
    // TODO (Sprint 7): Implement website type-specific rules
    // Will detect website type and apply: e-commerce, blog, SaaS specific checks
    return this.buildResult([], 0);
  }
}
