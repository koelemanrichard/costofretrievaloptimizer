// services/ai/contentGeneration/passes/pass8Audit.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo, AuditDetails } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { runAlgorithmicAudit } from './auditChecks';

export async function executePass8(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): Promise<{ draft: string; score: number; details: AuditDetails }> {
  const draft = job.draft_content || '';

  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_8_audit: 'in_progress' }
  });

  // Run all algorithmic checks
  const algorithmicResults = runAlgorithmicAudit(draft, brief, businessInfo);

  // Calculate final score
  const passingRules = algorithmicResults.filter(r => r.isPassing).length;
  const totalRules = algorithmicResults.length;
  const finalScore = totalRules > 0 ? Math.round((passingRules / totalRules) * 100) : 0;

  const auditDetails: AuditDetails = {
    algorithmicResults,
    passingRules,
    totalRules,
    timestamp: new Date().toISOString()
  };

  await orchestrator.updateJob(job.id, {
    draft_content: draft,
    final_audit_score: finalScore,
    audit_details: auditDetails,
    passes_status: { ...job.passes_status, pass_8_audit: 'completed' },
    current_pass: 9 // Transition to Pass 9 (Schema Generation)
  });

  // Sync the final draft to the content_briefs table so it's available in Article Draft Workspace
  if (brief.id && draft) {
    await orchestrator.syncDraftToBrief(brief.id, draft);
  }

  return { draft, score: finalScore, details: auditDetails };
}
