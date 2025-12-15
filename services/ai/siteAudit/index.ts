/**
 * Site Audit Orchestrator
 *
 * Main entry point for running multi-page site audits.
 * Coordinates 5 phases:
 *   Phase 0: Technical Baseline
 *   Phase 1: CE/SC/CSI Extraction
 *   Phase 2: Knowledge Graph Alignment
 *   Phase 3: Page Segmentation Audit
 *   Phase 4: Improvement Roadmap
 */

import {
    SiteAuditResult,
    AuditConfig,
    AuditProgress,
    AuditPhase,
    AuditStatus,
    DEFAULT_AUDIT_CONFIG,
    PageTechnicalInfo
} from './types';
import { executePhase0, createPageTechnicalInfo } from './phase0Technical';
import { executePhase1 } from './phase1Extraction';
import { executePhase2 } from './phase2SemanticGraph';
import { executePhase3 } from './phase3Segmentation';
import { executePhase4 } from './phase4Roadmap';
import { BusinessInfo, SemanticTriple, WebsiteType } from '../../../types';

// =============================================================================
// AUDIT ORCHESTRATOR
// =============================================================================

export interface AuditCallbacks {
    onProgress?: (progress: AuditProgress) => void;
    onPhaseComplete?: (phase: AuditPhase, result: unknown) => void;
    onError?: (phase: AuditPhase, error: Error) => void;
}

/**
 * Run a complete site audit across all 5 phases
 */
export async function runSiteAudit(
    projectId: string,
    domain: string,
    businessInfo: BusinessInfo,
    existingPages: PageTechnicalInfo[],
    existingEavs: SemanticTriple[],
    config: Partial<AuditConfig> = {},
    callbacks: AuditCallbacks = {}
): Promise<SiteAuditResult> {
    const auditId = generateAuditId();
    const startedAt = new Date().toISOString();
    const fullConfig: AuditConfig = { ...DEFAULT_AUDIT_CONFIG, ...config };
    const websiteType = businessInfo.websiteType || fullConfig.websiteType;

    // Initialize result
    const result: SiteAuditResult = {
        id: auditId,
        projectId,
        domain,
        websiteType,
        startedAt,
        status: 'in_progress',
        progress: {
            phase: 0,
            status: 'pending',
            progress: 0,
            currentStep: 'Initializing audit',
            startedAt
        },
        scores: {
            technical: 0,
            semantic: 0,
            structural: 0,
            overall: 0
        },
        pagesAudited: 0,
        issuesFound: 0,
        recommendationsGenerated: 0
    };

    try {
        // Phase 0: Technical Baseline
        if (!fullConfig.skipPhases?.includes(0)) {
            result.progress = updateProgress(0, 'in_progress', 0, 'Running technical baseline');
            callbacks.onProgress?.(result.progress);

            result.phase0 = await executePhase0(
                domain,
                existingPages,
                fullConfig,
                (progress, step) => {
                    result.progress = updateProgress(0, 'in_progress', progress, step);
                    callbacks.onProgress?.(result.progress);
                }
            );

            result.progress = updateProgress(0, 'completed', 100, 'Technical baseline complete');
            callbacks.onPhaseComplete?.(0, result.phase0);
        }

        // Phase 1: CE/SC/CSI Extraction
        if (!fullConfig.skipPhases?.includes(1)) {
            result.progress = updateProgress(1, 'in_progress', 0, 'Extracting semantic identities');
            callbacks.onProgress?.(result.progress);

            const pages = result.phase0?.pages || existingPages;
            result.phase1 = await executePhase1(
                pages,
                businessInfo,
                (progress, step) => {
                    result.progress = updateProgress(1, 'in_progress', progress, step);
                    callbacks.onProgress?.(result.progress);
                }
            );

            result.progress = updateProgress(1, 'completed', 100, 'Semantic extraction complete');
            callbacks.onPhaseComplete?.(1, result.phase1);
        }

        // Phase 2: Knowledge Graph Alignment
        if (!fullConfig.skipPhases?.includes(2)) {
            result.progress = updateProgress(2, 'in_progress', 0, 'Analyzing knowledge graph');
            callbacks.onProgress?.(result.progress);

            const pageSemantics = result.phase1?.pageLevel || [];
            result.phase2 = await executePhase2(
                pageSemantics,
                existingEavs,
                (progress, step) => {
                    result.progress = updateProgress(2, 'in_progress', progress, step);
                    callbacks.onProgress?.(result.progress);
                }
            );

            result.progress = updateProgress(2, 'completed', 100, 'Knowledge graph analysis complete');
            callbacks.onPhaseComplete?.(2, result.phase2);
        }

        // Phase 3: Page Segmentation Audit
        if (!fullConfig.skipPhases?.includes(3)) {
            result.progress = updateProgress(3, 'in_progress', 0, 'Auditing page segments');
            callbacks.onProgress?.(result.progress);

            const pageSemantics = result.phase1?.pageLevel || [];
            const semanticDistances = result.phase2?.semanticDistances || [];

            result.phase3 = await executePhase3(
                pageSemantics,
                semanticDistances,
                websiteType,
                (progress, step) => {
                    result.progress = updateProgress(3, 'in_progress', progress, step);
                    callbacks.onProgress?.(result.progress);
                }
            );

            result.progress = updateProgress(3, 'completed', 100, 'Segmentation audit complete');
            callbacks.onPhaseComplete?.(3, result.phase3);
        }

        // Phase 4: Improvement Roadmap
        if (!fullConfig.skipPhases?.includes(4)) {
            result.progress = updateProgress(4, 'in_progress', 0, 'Generating improvement roadmap');
            callbacks.onProgress?.(result.progress);

            if (result.phase0 && result.phase1 && result.phase2 && result.phase3) {
                result.phase4 = await executePhase4(
                    result.phase0,
                    result.phase1,
                    result.phase2,
                    result.phase3,
                    websiteType,
                    (progress, step) => {
                        result.progress = updateProgress(4, 'in_progress', progress, step);
                        callbacks.onProgress?.(result.progress);
                    }
                );

                result.progress = updateProgress(4, 'completed', 100, 'Roadmap generation complete');
                callbacks.onPhaseComplete?.(4, result.phase4);
            }
        }

        // Calculate final scores
        result.scores = calculateFinalScores(result);
        result.pagesAudited = result.phase0?.totalPages || existingPages.length;
        result.issuesFound = countTotalIssues(result);
        result.recommendationsGenerated = result.phase4?.summary.totalTasks || 0;

        result.status = 'completed';
        result.completedAt = new Date().toISOString();
        result.progress = {
            phase: 4,
            status: 'completed',
            progress: 100,
            currentStep: 'Audit complete',
            startedAt,
            completedAt: result.completedAt
        };

    } catch (error) {
        result.status = 'failed';
        result.progress.status = 'failed';
        result.progress.error = error instanceof Error ? error.message : 'Unknown error';
        callbacks.onError?.(result.progress.phase, error instanceof Error ? error : new Error('Unknown error'));
    }

    return result;
}

/**
 * Run a single phase of the audit
 */
export async function runAuditPhase(
    phase: AuditPhase,
    context: {
        domain: string;
        businessInfo: BusinessInfo;
        pages: PageTechnicalInfo[];
        eavs: SemanticTriple[];
        config: AuditConfig;
        previousPhases?: Partial<SiteAuditResult>;
    },
    onProgress?: (progress: number, step: string) => void
): Promise<unknown> {
    const websiteType = context.businessInfo.websiteType || context.config.websiteType;

    switch (phase) {
        case 0:
            return executePhase0(context.domain, context.pages, context.config, onProgress);

        case 1:
            return executePhase1(context.pages, context.businessInfo, onProgress);

        case 2: {
            const pageSemantics = context.previousPhases?.phase1?.pageLevel || [];
            return executePhase2(pageSemantics, context.eavs, onProgress);
        }

        case 3: {
            const pageSemantics = context.previousPhases?.phase1?.pageLevel || [];
            const distances = context.previousPhases?.phase2?.semanticDistances || [];
            return executePhase3(pageSemantics, distances, websiteType, onProgress);
        }

        case 4: {
            const { phase0, phase1, phase2, phase3 } = context.previousPhases || {};
            if (phase0 && phase1 && phase2 && phase3) {
                return executePhase4(phase0, phase1, phase2, phase3, websiteType, onProgress);
            }
            throw new Error('Phase 4 requires all previous phases to be complete');
        }

        default:
            throw new Error(`Invalid phase: ${phase}`);
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function updateProgress(
    phase: AuditPhase,
    status: AuditStatus,
    progress: number,
    currentStep: string
): AuditProgress {
    return {
        phase,
        status,
        progress,
        currentStep
    };
}

function calculateFinalScores(result: SiteAuditResult): SiteAuditResult['scores'] {
    const technical = result.phase0
        ? Math.max(0, 100 - result.phase0.issues.length * 5)
        : 0;

    const semantic = result.phase1
        ? (result.phase1.consistency.ceConsistency + result.phase1.consistency.scConsistency) / 2
        : 0;

    const structural = result.phase3?.overallScore || 0;

    const overall = Math.round(
        (technical * 0.25) + (semantic * 0.35) + (structural * 0.4)
    );

    return {
        technical: Math.round(technical),
        semantic: Math.round(semantic),
        structural: Math.round(structural),
        overall: Math.max(0, Math.min(100, overall))
    };
}

function countTotalIssues(result: SiteAuditResult): number {
    let count = 0;

    if (result.phase0) {
        count += result.phase0.issues.length;
    }

    if (result.phase1) {
        count += result.phase1.consistency.issues.length;
    }

    if (result.phase2) {
        count += result.phase2.issues.length;
    }

    if (result.phase3) {
        count += result.phase3.dilutionRisks.length;
        count += result.phase3.hubSpokeAnalysis.hubsWithIssues.length;
        count += result.phase3.linkingAudit.anchorRepetitionIssues.length;
    }

    return count;
}

function generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    // Types
    SiteAuditResult,
    AuditConfig,
    AuditProgress,
    AuditPhase,
    AuditStatus,
    DEFAULT_AUDIT_CONFIG,
    PageTechnicalInfo,

    // Phase executors (for individual phase runs)
    executePhase0,
    executePhase1,
    executePhase2,
    executePhase3,
    executePhase4,

    // Helpers
    createPageTechnicalInfo
};

export * from './types';
