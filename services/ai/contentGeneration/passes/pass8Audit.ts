// services/ai/contentGeneration/passes/pass8Audit.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo, AuditDetails, HolisticSummaryContext, EnrichedTopic, SemanticTriple, FreshnessProfile } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { runAlgorithmicAudit } from './auditChecks';
import { buildHolisticSummary } from '../holisticAnalyzer';
import { calculateBriefCompliance, COMPLIANCE_THRESHOLD } from '../../compliance/complianceScoring';
import { validateCrossPageEavConsistency } from '../rulesEngine/validators/crossPageEavValidator';
import { useSupabase } from '../../../supabaseClient';
import { createLogger } from '../../../../utils/debugLogger';
import { getTemplateByName } from '../../../../config/contentTemplates';
import { TemplateName } from '../../../../types/contentTemplates';

const log = createLogger('Pass8Audit');

/**
 * Pass 8: Final Audit
 *
 * Runs algorithmic audit checks on the assembled article.
 * Now assembles from sections first (since sections are the source of truth
 * after section-by-section processing in passes 2-7).
 *
 * Uses holistic context for metrics that benefit from pre-computed data.
 */
export async function executePass8(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): Promise<{ draft: string; score: number; details: AuditDetails; holisticContext?: HolisticSummaryContext }> {
  // NOTE: This is now Pass 9 in the new 10-pass order (aliased via index.ts)
  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_9_audit: 'in_progress' }
  });

  // CRITICAL: With section-by-section processing, sections are the source of truth
  // Assemble the draft from sections first
  const sections = await orchestrator.getSections(job.id);
  const assembledDraft = await orchestrator.assembleDraft(job.id);
  const legacyDraft = job.draft_content || '';

  // Use the longer content (assembled sections should always be longer/equal after section processing)
  const draft = assembledDraft.length >= legacyDraft.length ? assembledDraft : legacyDraft;

  if (assembledDraft.length < legacyDraft.length) {
    log.warn(` Unexpected: assembled sections (${assembledDraft.length} chars) < draft_content (${legacyDraft.length} chars)`);
  }

  log.log(` Auditing ${draft.length} chars from ${sections.length} sections`);

  // Build holistic context for enhanced audit metrics
  // NOTE: buildHolisticSummary is now async and yields internally to prevent browser freeze
  const holisticContext = await buildHolisticSummary(sections, brief, businessInfo);
  log.log(` Holistic context: TTR=${(holisticContext.vocabularyMetrics.typeTokenRatio * 100).toFixed(1)}%, ${holisticContext.articleStructure.totalWordCount} words`);

  // Get all EAVs from the brief (or empty array) - also used for algorithmic audit
  const allEavs: SemanticTriple[] = brief.eavs || [];

  // Resolve template for template compliance checks
  const template = brief.selectedTemplate
    ? getTemplateByName(brief.selectedTemplate as TemplateName)
    : undefined;

  if (template) {
    log.log(` Using template: ${template.label} (${template.templateName})`);
  }

  // Run all algorithmic checks (pass language, EAVs, and template for proper validation)
  // NOTE: runAlgorithmicAudit is now async and yields to main thread to prevent browser freeze
  const algorithmicResults = await runAlgorithmicAudit(draft, brief, businessInfo, businessInfo.language, allEavs, template);

  // Calculate algorithmic score
  const passingRules = algorithmicResults.filter(r => r.isPassing).length;
  const totalRules = algorithmicResults.length;
  const algorithmicScore = totalRules > 0 ? Math.round((passingRules / totalRules) * 100) : 0;

  // Calculate semantic compliance score (target >= 85%)
  // Create a minimal topic object for compliance calculation
  const topic: EnrichedTopic = {
    id: brief.id || 'temp',
    map_id: job.map_id || '',
    title: brief.topic || brief.title || '',
    slug: (brief.topic || brief.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: brief.description || '',
    type: 'core',
    parent_topic_id: null,
    freshness: (brief.freshness as FreshnessProfile) || FreshnessProfile.STANDARD,
    response_code: brief.response_code,
    metadata: {}
  };

  // allEavs is already defined above for algorithmic audit

  const complianceResult = calculateBriefCompliance(
    brief,
    topic,
    allEavs,
    businessInfo.websiteType
  );

  log.log(` Compliance Score: ${complianceResult.overall}% (${complianceResult.grade}) - ${complianceResult.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}`);
  if (complianceResult.issues.length > 0) {
    log.log(` Compliance Issues: ${complianceResult.issues.length} (${complianceResult.issues.filter(i => i.severity === 'critical').length} critical)`);
  }

  // Cross-page EAV consistency check (Knowledge-Based Trust)
  // This ensures facts are consistent across all articles in the topical map
  let crossPageContradictions: Array<{
    entity: string;
    attribute: string;
    currentValue: string;
    conflictingValue: string;
    conflictingArticle: { id: string; title: string };
  }> = [];
  let crossPagePenalty = 0;

  if (job.map_id && allEavs.length > 0) {
    try {
      const supabase = useSupabase();
      const crossPageResult = await validateCrossPageEavConsistency(
        job.id,
        job.map_id,
        allEavs,
        supabase
      );

      if (!crossPageResult.isConsistent) {
        crossPageContradictions = crossPageResult.contradictions;
        // Apply penalty: -5 per factual contradiction, max -20
        crossPagePenalty = Math.min(crossPageResult.contradictions.length * 5, 20);
        log.warn(` Cross-page contradictions found: ${crossPageResult.contradictions.length}`);
        for (const contradiction of crossPageResult.contradictions) {
          log.warn(`   - "${contradiction.entity}" ${contradiction.attribute}: "${contradiction.currentValue}" vs "${contradiction.conflictingValue}" in "${contradiction.conflictingArticle.title}"`);
        }
      } else {
        log.log(` Cross-page EAV consistency: PASSED (no contradictions)`);
      }
    } catch (err) {
      // Non-fatal - log but continue with audit
      log.warn(` Cross-page EAV check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Combined final score: 60% algorithmic + 40% compliance - cross-page penalty
  const finalScore = Math.max(0, Math.round(algorithmicScore * 0.6 + complianceResult.overall * 0.4) - crossPagePenalty);

  // Quality enforcement thresholds
  const CRITICAL_THRESHOLD = 70;  // Below this, content is blocked — enterprise SEO standard
  const WARNING_THRESHOLD = 85;   // Below this, content needs improvement

  // Identify critical failing rules
  const failingRules = algorithmicResults.filter(r => !r.isPassing);
  const criticalFailures = failingRules.filter(r =>
    (r.ruleName || '').includes('CENTERPIECE') ||
    (r.ruleName || '').includes('HEADING_HIERARCHY') ||
    (r.ruleName || '').includes('LLM_SIGNATURE') ||
    (r.ruleName || '').includes('IMAGE_PLACEMENT')
  );

  // Build audit details before threshold checks (needed by failure path)
  const auditDetails: AuditDetails = {
    algorithmicResults,
    passingRules,
    totalRules,
    timestamp: new Date().toISOString(),
    complianceScore: {
      overall: complianceResult.overall,
      passed: complianceResult.passed,
      grade: complianceResult.grade,
      breakdown: complianceResult.breakdown,
      issues: complianceResult.issues.map(i => ({
        factor: i.factor,
        severity: i.severity,
        message: i.message,
        recommendation: i.recommendation
      })),
      recommendations: complianceResult.recommendations
    },
    // Include cross-page contradictions if any were found
    ...(crossPageContradictions.length > 0 && { crossPageContradictions })
  };

  // Quality gate enforcement
  if (finalScore < CRITICAL_THRESHOLD) {
    log.error(` Quality audit FAILED: Score ${finalScore}% below ${CRITICAL_THRESHOLD}% threshold`);
    log.error(` Failing rules: ${failingRules.map(r => r.ruleName || 'unknown').join(', ')}`);

    // Identify which pass to re-run based on failing rules
    const rerunSuggestion = identifyRerunTarget(failingRules);

    // Update job with audit_failed status and re-run suggestion (not hard 'failed')
    await orchestrator.updateJob(job.id, {
      status: 'audit_failed',
      final_audit_score: finalScore,
      audit_details: { ...auditDetails, rerunSuggestion } as any,
      last_error: `Audit score ${finalScore}% below ${CRITICAL_THRESHOLD}% threshold. Suggested: re-run from Pass ${rerunSuggestion.targetPass} (${rerunSuggestion.reason}).`,
      passes_status: { ...job.passes_status, pass_9_audit: 'failed' }
    });

    throw new Error(
      `Quality audit failed: Score ${finalScore}% is below the ${CRITICAL_THRESHOLD}% minimum threshold. ` +
      `${failingRules.length} rules failed: ${failingRules.slice(0, 5).map(r => r.ruleName || 'unknown').join(', ')}${failingRules.length > 5 ? '...' : ''}. ` +
      `Suggested: re-run from Pass ${rerunSuggestion.targetPass}.`
    );
  }

  if (finalScore < WARNING_THRESHOLD) {
    log.warn(` Quality audit WARNING: Score ${finalScore}% below ${WARNING_THRESHOLD}% threshold`);
    log.warn(` Failing rules (${failingRules.length}): ${failingRules.map(r => r.ruleName || 'unknown').join(', ')}`);
    // Content continues but with warning logged
  }

  // Update job with the assembled draft (source of truth after section processing)
  await orchestrator.updateJob(job.id, {
    draft_content: draft,
    final_audit_score: finalScore,
    audit_details: auditDetails,
    passes_status: { ...job.passes_status, pass_9_audit: 'completed' },
    current_pass: 10 // Transition to Pass 10 (Schema Generation)
  });

  // Sync the final draft to the content_briefs table
  if (brief.id && draft) {
    await orchestrator.syncDraftToBrief(brief.id, draft);
    log.log(` Synced to brief: ${draft.length} chars, score: ${finalScore}%`);
  }

  return { draft, score: finalScore, details: auditDetails, holisticContext };
}

/**
 * Map failing audit rules to the pass most likely to fix them.
 * Returns the earliest pass that addresses the most failures.
 */
function identifyRerunTarget(
  failingRules: Array<{ ruleName?: string; isPassing: boolean }>
): { targetPass: number; reason: string } {
  const ruleToPass: Record<string, number> = {
    'CENTERPIECE': 1,
    'HEADING_HIERARCHY': 2,
    'LIST_LOGIC': 3,
    'IMAGE_PLACEMENT': 6,
    'EAV_DENSITY': 5,
    'LLM_SIGNATURE': 5,
    'WORD_COUNT': 1,
    'LANGUAGE': 1,
  };

  const passCounts: Record<number, number> = {};
  for (const rule of failingRules) {
    const pass = ruleToPass[rule.ruleName || ''] || 1;
    passCounts[pass] = (passCounts[pass] || 0) + 1;
  }

  const entries = Object.entries(passCounts).sort((a, b) => b[1] - a[1]);
  const targetPass = entries.length > 0 ? parseInt(entries[0][0]) : 1;
  const count = entries.length > 0 ? entries[0][1] : failingRules.length;

  return {
    targetPass,
    reason: `${count} failing rule(s) addressable by Pass ${targetPass}`,
  };
}
