// services/ai/contentGeneration/passes/pass8Audit.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo, AuditDetails, HolisticSummaryContext, EnrichedTopic, SemanticTriple, FreshnessProfile } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { runAlgorithmicAudit } from './auditChecks';
import { buildHolisticSummary } from '../holisticAnalyzer';
import { calculateBriefCompliance, COMPLIANCE_THRESHOLD } from '../../compliance/complianceScoring';
import { createLogger } from '../../../../utils/debugLogger';

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
  const holisticContext = buildHolisticSummary(sections, brief, businessInfo);
  log.log(` Holistic context: TTR=${(holisticContext.vocabularyMetrics.typeTokenRatio * 100).toFixed(1)}%, ${holisticContext.articleStructure.totalWordCount} words`);

  // Run all algorithmic checks
  const algorithmicResults = runAlgorithmicAudit(draft, brief, businessInfo);

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

  // Get all EAVs from the brief (or empty array)
  const allEavs: SemanticTriple[] = brief.eavs || [];

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

  // Combined final score: 60% algorithmic + 40% compliance
  const finalScore = Math.round(algorithmicScore * 0.6 + complianceResult.overall * 0.4);

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
    }
  };

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
