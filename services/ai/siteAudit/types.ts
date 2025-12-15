/**
 * Site Audit Types
 *
 * Type definitions for the multi-page audit workflow based on Holistic SEO research:
 * - Phase 0: Technical Baseline
 * - Phase 1: CE/SC/CSI Extraction
 * - Phase 2: Knowledge Graph Alignment
 * - Phase 3: Page Segmentation Audit
 * - Phase 4: Improvement Roadmap
 */

import { SemanticTriple, WebsiteType } from '../../../types';

// =============================================================================
// AUDIT STATUS AND PHASES
// =============================================================================

export type AuditPhase = 0 | 1 | 2 | 3 | 4;

export type AuditStatus =
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'failed'
    | 'paused';

export interface AuditProgress {
    phase: AuditPhase;
    status: AuditStatus;
    progress: number; // 0-100
    currentStep: string;
    startedAt?: string;
    completedAt?: string;
    error?: string;
}

// =============================================================================
// PHASE 0: TECHNICAL BASELINE
// =============================================================================

export interface TechnicalBaseline {
    crawlDate: string;
    totalPages: number;
    indexedPages: number;
    indexationRate: number;
    pages: PageTechnicalInfo[];
    issues: TechnicalIssue[];
    corMetrics: {
        averagePageSize: number;
        averageLoadTime: number;
        totalCrawlBudget: number;
    };
}

export interface PageTechnicalInfo {
    url: string;
    title: string;
    statusCode: number;
    pageSize: number; // bytes
    loadTime: number; // ms
    isIndexed: boolean;
    canonicalUrl?: string;
    redirectsTo?: string;
    internalLinks: number;
    externalLinks: number;
    h1Count: number;
    metaDescription?: string;
    issues: string[];
}

export interface TechnicalIssue {
    type: 'error' | 'warning' | 'info';
    category: 'indexation' | 'redirect' | 'performance' | 'structure' | 'duplicate';
    message: string;
    affectedUrls: string[];
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
}

// =============================================================================
// PHASE 1: CE/SC/CSI EXTRACTION
// =============================================================================

export interface SemanticExtraction {
    siteLevel: {
        centralEntity: string;
        sourceContext: string;
        centralSearchIntent: string;
        confidence: number;
    };
    pageLevel: PageSemanticInfo[];
    consistency: {
        ceConsistency: number; // 0-100
        scConsistency: number;
        issues: SemanticConsistencyIssue[];
    };
}

export interface PageSemanticInfo {
    url: string;
    title: string;
    extractedCE: string;
    extractedSC: string;
    extractedCSI: string;
    matchesSiteCE: boolean;
    matchesSiteSC: boolean;
    confidence: number;
    segment?: 'core' | 'author' | 'support' | 'unknown';
}

export interface SemanticConsistencyIssue {
    type: 'ce_mismatch' | 'sc_mismatch' | 'csi_conflict' | 'orphan_page';
    severity: 'high' | 'medium' | 'low';
    message: string;
    affectedUrls: string[];
    recommendation: string;
}

// =============================================================================
// PHASE 2: KNOWLEDGE GRAPH ALIGNMENT
// =============================================================================

export interface KnowledgeGraphAnalysis {
    totalEntities: number;
    totalRelationships: number;
    entityTypes: Record<string, number>;
    consistencyScore: number; // 0-100
    coverage: {
        eavCoverage: number;
        attributeCompleteness: number;
        valueConsistency: number;
    };
    clusters: EntityCluster[];
    orphanPages: string[];
    semanticDistances: SemanticDistanceMap[];
    issues: KGIssue[];
}

export interface EntityCluster {
    id: string;
    centralEntity: string;
    relatedEntities: string[];
    pageCount: number;
    cohesionScore: number;
    pages: string[];
}

export interface SemanticDistanceMap {
    pageA: string;
    pageB: string;
    distance: number;
    shouldLink: boolean;
    linkReason?: string;
}

export interface KGIssue {
    type: 'inconsistent_value' | 'missing_attribute' | 'orphan_entity' | 'weak_connection';
    severity: 'high' | 'medium' | 'low';
    entity: string;
    attribute?: string;
    message: string;
    affectedPages: string[];
    recommendation: string;
}

// =============================================================================
// PHASE 3: PAGE SEGMENTATION AUDIT
// =============================================================================

export interface SegmentationAudit {
    coreSection: SectionAnalysis;
    authorSection: SectionAnalysis;
    supportPages: SectionAnalysis;
    hubSpokeAnalysis: HubSpokeAudit;
    linkingAudit: LinkingAudit;
    dilutionRisks: DilutionRisk[];
    overallScore: number;
}

export interface SectionAnalysis {
    pageCount: number;
    pages: PageSegmentInfo[];
    coverage: number;
    depth: 'deep' | 'moderate' | 'shallow';
    issues: string[];
}

export interface PageSegmentInfo {
    url: string;
    title: string;
    segment: 'core' | 'author' | 'support';
    isHub: boolean;
    spokeCount: number;
    inboundLinks: number;
    outboundLinks: number;
    eavCount: number;
    complianceScore: number;
}

export interface HubSpokeAudit {
    totalHubs: number;
    averageRatio: number;
    optimalRatio: number;
    hubsWithIssues: HubIssue[];
    recommendations: string[];
}

export interface HubIssue {
    hubUrl: string;
    hubTitle: string;
    currentRatio: number;
    issue: 'too_few_spokes' | 'too_many_spokes' | 'orphan_hub';
    recommendation: string;
}

export interface LinkingAudit {
    totalInternalLinks: number;
    averageLinksPerPage: number;
    maxLinksPage: { url: string; count: number };
    anchorTextDiversity: number;
    anchorRepetitionIssues: AnchorIssue[];
    linkDirectionScore: number; // How well links flow author → core
    qualityNodeCoverage: number;
}

export interface AnchorIssue {
    anchorText: string;
    occurrences: number;
    pages: string[];
    recommendation: string;
}

export interface DilutionRisk {
    type: 'keyword_cannibalization' | 'topic_overlap' | 'thin_content' | 'orphan_page';
    severity: 'high' | 'medium' | 'low';
    affectedPages: string[];
    message: string;
    recommendation: string;
}

// =============================================================================
// PHASE 4: IMPROVEMENT ROADMAP
// =============================================================================

export interface ImprovementRoadmap {
    summary: RoadmapSummary;
    priorities: PriorityGroup[];
    newPagesNeeded: NewPageSuggestion[];
    pagesToMerge: MergeSuggestion[];
    pagesToDelete: DeleteSuggestion[];
    contentBriefSuggestions: BriefSuggestion[];
    technicalFixes: TechnicalFix[];
    estimatedImpact: ImpactEstimate;
}

export interface RoadmapSummary {
    totalTasks: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    overallHealthScore: number;
    targetHealthScore: number;
}

export interface PriorityGroup {
    priority: 'high' | 'medium' | 'low';
    category: string;
    tasks: RoadmapTask[];
}

export interface RoadmapTask {
    id: string;
    type: 'create' | 'update' | 'merge' | 'delete' | 'fix' | 'optimize';
    title: string;
    description: string;
    affectedUrls: string[];
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    category: string;
}

export interface NewPageSuggestion {
    suggestedTitle: string;
    suggestedSlug: string;
    targetKeywords: string[];
    parentHub?: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    briefOutline?: string[];
}

export interface MergeSuggestion {
    sourcePages: string[];
    targetPage: string;
    reason: string;
    expectedBenefit: string;
}

export interface DeleteSuggestion {
    url: string;
    title: string;
    reason: string;
    redirectTo?: string;
}

export interface BriefSuggestion {
    pageUrl: string;
    pageTitle: string;
    improvements: string[];
    missingEavs: string[];
    suggestedSections: string[];
}

export interface TechnicalFix {
    type: 'redirect' | 'canonical' | 'meta' | 'structure' | 'performance';
    url: string;
    issue: string;
    fix: string;
    priority: 'high' | 'medium' | 'low';
}

export interface ImpactEstimate {
    trafficPotential: 'high' | 'medium' | 'low';
    authorityImprovement: number; // percentage
    indexationImprovement: number;
    userExperienceScore: number;
}

// =============================================================================
// MAIN AUDIT RESULT
// =============================================================================

export interface SiteAuditResult {
    id: string;
    projectId: string;
    domain: string;
    websiteType: WebsiteType;
    startedAt: string;
    completedAt?: string;
    status: AuditStatus;
    progress: AuditProgress;

    // Phase Results
    phase0?: TechnicalBaseline;
    phase1?: SemanticExtraction;
    phase2?: KnowledgeGraphAnalysis;
    phase3?: SegmentationAudit;
    phase4?: ImprovementRoadmap;

    // Overall Scores
    scores: {
        technical: number;
        semantic: number;
        structural: number;
        overall: number;
    };

    // Metadata
    pagesAudited: number;
    issuesFound: number;
    recommendationsGenerated: number;
}

// =============================================================================
// AUDIT CONFIGURATION
// =============================================================================

export interface AuditConfig {
    maxPages: number;
    includeExternal: boolean;
    deepCrawl: boolean;
    checkIndexation: boolean;
    skipPhases?: AuditPhase[];
    websiteType: WebsiteType;
    existingEavs?: SemanticTriple[];
}

export const DEFAULT_AUDIT_CONFIG: AuditConfig = {
    maxPages: 100,
    includeExternal: false,
    deepCrawl: true,
    checkIndexation: true,
    websiteType: 'INFORMATIONAL'
};
