/**
 * HTML Technical Phase Adapter
 *
 * Validates HTML tag structure, heading hierarchy, semantic HTML usage, and schema markup presence.
 * Covers on-page technical SEO checks at the HTML level.
 *
 * TODO: Implement in Sprint 5 — HTML tag validation, heading hierarchy, schema markup checks
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult } from '../types';

export class HtmlTechnicalPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'htmlTechnical';

  async execute(request: AuditRequest): Promise<AuditPhaseResult> {
    // TODO (Sprint 5): Implement HTML technical validation
    // Will check: heading hierarchy, semantic HTML tags, schema markup in HTML
    return this.buildResult([], 0);
  }
}
