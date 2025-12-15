/**
 * Phase 4: Improvement Roadmap
 *
 * Generates prioritized improvement recommendations:
 * - New pages to create
 * - Pages to merge or delete
 * - Content brief suggestions
 * - Technical fixes
 */

import {
    ImprovementRoadmap,
    RoadmapSummary,
    PriorityGroup,
    RoadmapTask,
    NewPageSuggestion,
    MergeSuggestion,
    DeleteSuggestion,
    BriefSuggestion,
    TechnicalFix,
    ImpactEstimate,
    TechnicalBaseline,
    SemanticExtraction,
    KnowledgeGraphAnalysis,
    SegmentationAudit,
    TechnicalIssue,
    DilutionRisk
} from './types';
import { WebsiteType } from '../../../types';
import { getWebsiteTypeConfig } from '../../../config/websiteTypeTemplates';

// =============================================================================
// MAIN PHASE 4 EXECUTION
// =============================================================================

export async function executePhase4(
    technical: TechnicalBaseline,
    semantic: SemanticExtraction,
    knowledgeGraph: KnowledgeGraphAnalysis,
    segmentation: SegmentationAudit,
    websiteType: WebsiteType,
    onProgress?: (progress: number, step: string) => void
): Promise<ImprovementRoadmap> {
    onProgress?.(0, 'Generating improvement roadmap');

    const typeConfig = getWebsiteTypeConfig(websiteType);
    const optimalRatio = typeConfig?.hubSpokeRatio.optimal || 7;

    // Generate new page suggestions
    onProgress?.(15, 'Identifying content gaps');
    const newPagesNeeded = generateNewPageSuggestions(
        segmentation,
        knowledgeGraph,
        optimalRatio
    );

    // Generate merge suggestions
    onProgress?.(30, 'Finding merge opportunities');
    const pagesToMerge = generateMergeSuggestions(segmentation.dilutionRisks);

    // Generate delete suggestions
    onProgress?.(45, 'Identifying removable content');
    const pagesToDelete = generateDeleteSuggestions(
        technical,
        semantic,
        knowledgeGraph.orphanPages
    );

    // Generate content brief suggestions
    onProgress?.(60, 'Creating brief improvement suggestions');
    const contentBriefSuggestions = generateBriefSuggestions(
        semantic,
        knowledgeGraph,
        segmentation
    );

    // Generate technical fixes
    onProgress?.(75, 'Compiling technical fixes');
    const technicalFixes = generateTechnicalFixes(technical);

    // Build priority groups
    onProgress?.(85, 'Prioritizing tasks');
    const priorities = buildPriorityGroups(
        newPagesNeeded,
        pagesToMerge,
        pagesToDelete,
        contentBriefSuggestions,
        technicalFixes
    );

    // Calculate summary
    const summary = calculateSummary(
        priorities,
        technical,
        semantic,
        knowledgeGraph,
        segmentation
    );

    // Estimate impact
    onProgress?.(95, 'Estimating impact');
    const estimatedImpact = estimateImpact(
        newPagesNeeded,
        pagesToMerge,
        technicalFixes,
        segmentation.overallScore
    );

    onProgress?.(100, 'Roadmap generation complete');

    return {
        summary,
        priorities,
        newPagesNeeded,
        pagesToMerge,
        pagesToDelete,
        contentBriefSuggestions,
        technicalFixes,
        estimatedImpact
    };
}

// =============================================================================
// NEW PAGE SUGGESTIONS
// =============================================================================

function generateNewPageSuggestions(
    segmentation: SegmentationAudit,
    knowledgeGraph: KnowledgeGraphAnalysis,
    optimalRatio: number
): NewPageSuggestion[] {
    const suggestions: NewPageSuggestion[] = [];

    // Suggest spokes for hubs with too few
    for (const hubIssue of segmentation.hubSpokeAnalysis.hubsWithIssues) {
        if (hubIssue.issue === 'too_few_spokes') {
            const spokesNeeded = 3 - hubIssue.currentRatio;
            for (let i = 0; i < spokesNeeded; i++) {
                suggestions.push({
                    suggestedTitle: `Supporting content for ${hubIssue.hubTitle}`,
                    suggestedSlug: `${slugify(hubIssue.hubTitle)}-guide-${i + 1}`,
                    targetKeywords: [hubIssue.hubTitle.toLowerCase()],
                    parentHub: hubIssue.hubUrl,
                    reason: `Hub "${hubIssue.hubTitle}" needs more supporting content`,
                    priority: 'high',
                    briefOutline: [
                        'Introduction to subtopic',
                        'Key concepts explained',
                        'Practical applications',
                        'Link back to hub page'
                    ]
                });
            }
        }
    }

    // Suggest hub pages for orphan clusters
    for (const cluster of knowledgeGraph.clusters) {
        if (cluster.cohesionScore < 0.3 && cluster.pageCount > 1) {
            suggestions.push({
                suggestedTitle: `${capitalize(cluster.centralEntity)} Overview`,
                suggestedSlug: `${slugify(cluster.centralEntity)}-overview`,
                targetKeywords: [cluster.centralEntity, ...cluster.relatedEntities.slice(0, 3)],
                reason: `Weak cluster around "${cluster.centralEntity}" needs a hub page`,
                priority: 'medium',
                briefOutline: [
                    `Introduction to ${cluster.centralEntity}`,
                    'Key aspects and components',
                    'Related topics overview',
                    'Next steps and resources'
                ]
            });
        }
    }

    // Suggest content for orphan pages
    for (const orphanUrl of knowledgeGraph.orphanPages.slice(0, 5)) {
        suggestions.push({
            suggestedTitle: 'Supporting content for orphan page',
            suggestedSlug: `related-${slugify(orphanUrl.split('/').pop() || 'content')}`,
            targetKeywords: [],
            reason: `Page "${orphanUrl}" is semantically isolated - create related content`,
            priority: 'low'
        });
    }

    // Suggest based on weak section coverage
    if (segmentation.authorSection.depth === 'shallow' && segmentation.coreSection.pageCount > 0) {
        suggestions.push({
            suggestedTitle: 'Educational blog content',
            suggestedSlug: 'blog/getting-started',
            targetKeywords: [],
            reason: 'Author section lacks depth - create supporting educational content',
            priority: 'medium',
            briefOutline: [
                'Introduction for beginners',
                'Step-by-step guide',
                'Common questions answered',
                'Links to core product/service pages'
            ]
        });
    }

    return suggestions;
}

// =============================================================================
// MERGE SUGGESTIONS
// =============================================================================

function generateMergeSuggestions(dilutionRisks: DilutionRisk[]): MergeSuggestion[] {
    const suggestions: MergeSuggestion[] = [];

    for (const risk of dilutionRisks) {
        if (risk.type === 'keyword_cannibalization' && risk.affectedPages.length >= 2) {
            // Suggest merging cannibalized pages
            const targetPage = risk.affectedPages[0]; // Keep the first one
            const sourcePages = risk.affectedPages.slice(1);

            suggestions.push({
                sourcePages,
                targetPage,
                reason: 'These pages compete for the same keywords',
                expectedBenefit: 'Consolidating will concentrate ranking signals and eliminate internal competition'
            });
        }

        if (risk.type === 'topic_overlap' && risk.affectedPages.length >= 3) {
            // Suggest consolidating overlapping topics
            suggestions.push({
                sourcePages: risk.affectedPages.slice(1),
                targetPage: risk.affectedPages[0],
                reason: 'Multiple pages targeting the same search intent',
                expectedBenefit: 'Creating one comprehensive page will provide better user experience and SEO value'
            });
        }
    }

    return suggestions;
}

// =============================================================================
// DELETE SUGGESTIONS
// =============================================================================

function generateDeleteSuggestions(
    technical: TechnicalBaseline,
    semantic: SemanticExtraction,
    orphanPages: string[]
): DeleteSuggestion[] {
    const suggestions: DeleteSuggestion[] = [];

    // Suggest deleting 4xx error pages
    for (const issue of technical.issues) {
        if (issue.category === 'indexation' && issue.message.includes('4xx')) {
            for (const url of issue.affectedUrls) {
                suggestions.push({
                    url,
                    title: 'Error page',
                    reason: 'Page returns 4xx error status',
                    redirectTo: '/' // Redirect to homepage
                });
            }
        }
    }

    // Suggest deleting very low confidence orphan pages
    const lowConfidenceOrphans = semantic.pageLevel.filter(
        p => orphanPages.includes(p.url) && p.confidence < 0.3
    );

    for (const page of lowConfidenceOrphans.slice(0, 10)) {
        suggestions.push({
            url: page.url,
            title: page.title,
            reason: 'Low semantic value and no connections to site structure'
        });
    }

    // Suggest deleting duplicate title pages
    for (const issue of technical.issues) {
        if (issue.category === 'duplicate') {
            // Keep one, suggest deleting others
            const duplicates = issue.affectedUrls.slice(1);
            for (const url of duplicates) {
                suggestions.push({
                    url,
                    title: 'Duplicate content',
                    reason: 'Duplicate page title - consolidate with primary page',
                    redirectTo: issue.affectedUrls[0]
                });
            }
        }
    }

    return suggestions;
}

// =============================================================================
// BRIEF SUGGESTIONS
// =============================================================================

function generateBriefSuggestions(
    semantic: SemanticExtraction,
    knowledgeGraph: KnowledgeGraphAnalysis,
    segmentation: SegmentationAudit
): BriefSuggestion[] {
    const suggestions: BriefSuggestion[] = [];

    // Suggest improvements for low compliance pages
    for (const page of segmentation.coreSection.pages) {
        if (page.complianceScore < 70) {
            const semanticPage = semantic.pageLevel.find(p => p.url === page.url);

            suggestions.push({
                pageUrl: page.url,
                pageTitle: page.title,
                improvements: [
                    'Strengthen central entity alignment',
                    'Add more structured sections',
                    'Improve heading hierarchy'
                ],
                missingEavs: getMissingEavs(page.url, knowledgeGraph),
                suggestedSections: getDefaultSections(semanticPage?.extractedCSI || 'informational')
            });
        }
    }

    // Suggest EAV additions for pages with orphan entities
    for (const issue of knowledgeGraph.issues) {
        if (issue.type === 'orphan_entity') {
            suggestions.push({
                pageUrl: issue.affectedPages[0] || '',
                pageTitle: issue.entity,
                improvements: ['Add EAV definitions for this entity'],
                missingEavs: [
                    `${issue.entity} - definition`,
                    `${issue.entity} - type`,
                    `${issue.entity} - primary benefit`
                ],
                suggestedSections: []
            });
        }
    }

    // Suggest improvements for pages with weak connections
    for (const issue of knowledgeGraph.issues) {
        if (issue.type === 'weak_connection') {
            for (const pageUrl of issue.affectedPages.slice(0, 3)) {
                const existingSuggestion = suggestions.find(s => s.pageUrl === pageUrl);
                if (existingSuggestion) {
                    existingSuggestion.improvements.push('Add contextual bridges to related content');
                } else {
                    suggestions.push({
                        pageUrl,
                        pageTitle: 'Page with weak connections',
                        improvements: ['Add contextual bridges to related content'],
                        missingEavs: [],
                        suggestedSections: ['Related Topics', 'Further Reading']
                    });
                }
            }
        }
    }

    return suggestions;
}

function getMissingEavs(pageUrl: string, knowledgeGraph: KnowledgeGraphAnalysis): string[] {
    const missing: string[] = [];

    for (const issue of knowledgeGraph.issues) {
        if (issue.type === 'missing_attribute' && issue.affectedPages.includes(pageUrl)) {
            if (issue.attribute) {
                missing.push(`${issue.entity} - ${issue.attribute}`);
            }
        }
    }

    return missing;
}

function getDefaultSections(intent: string): string[] {
    switch (intent.toLowerCase()) {
        case 'transactional':
            return ['Product Overview', 'Key Features', 'Pricing', 'How to Purchase'];
        case 'commercial':
            return ['Comparison Overview', 'Feature Analysis', 'Pros and Cons', 'Verdict'];
        case 'navigational':
            return ['Quick Links', 'Account Options', 'Support Resources'];
        case 'informational':
        default:
            return ['Introduction', 'Key Concepts', 'How It Works', 'FAQ', 'Conclusion'];
    }
}

// =============================================================================
// TECHNICAL FIXES
// =============================================================================

function generateTechnicalFixes(technical: TechnicalBaseline): TechnicalFix[] {
    const fixes: TechnicalFix[] = [];

    for (const issue of technical.issues) {
        switch (issue.category) {
            case 'redirect':
                for (const url of issue.affectedUrls) {
                    fixes.push({
                        type: 'redirect',
                        url,
                        issue: 'Page has redirect status',
                        fix: 'Update internal links to point directly to final URL',
                        priority: issue.priority
                    });
                }
                break;

            case 'indexation':
                if (issue.message.includes('not indexed')) {
                    for (const url of issue.affectedUrls.slice(0, 10)) {
                        fixes.push({
                            type: 'meta',
                            url,
                            issue: 'Page not indexed',
                            fix: 'Check robots.txt and noindex tags; ensure page is internally linked',
                            priority: issue.priority
                        });
                    }
                }
                break;

            case 'structure':
                if (issue.message.includes('H1')) {
                    for (const url of issue.affectedUrls) {
                        fixes.push({
                            type: 'structure',
                            url,
                            issue: issue.message,
                            fix: 'Add a single, descriptive H1 tag',
                            priority: issue.priority
                        });
                    }
                }
                break;

            case 'performance':
                for (const url of issue.affectedUrls) {
                    fixes.push({
                        type: 'performance',
                        url,
                        issue: issue.message,
                        fix: 'Optimize images, enable compression, reduce JavaScript',
                        priority: issue.priority
                    });
                }
                break;

            case 'duplicate':
                for (const url of issue.affectedUrls.slice(1)) {
                    fixes.push({
                        type: 'canonical',
                        url,
                        issue: 'Duplicate content detected',
                        fix: `Set canonical to primary page or consolidate content`,
                        priority: issue.priority
                    });
                }
                break;
        }
    }

    return fixes;
}

// =============================================================================
// PRIORITY GROUPS
// =============================================================================

function buildPriorityGroups(
    newPages: NewPageSuggestion[],
    merges: MergeSuggestion[],
    deletes: DeleteSuggestion[],
    briefs: BriefSuggestion[],
    fixes: TechnicalFix[]
): PriorityGroup[] {
    const highTasks: RoadmapTask[] = [];
    const mediumTasks: RoadmapTask[] = [];
    const lowTasks: RoadmapTask[] = [];

    let taskId = 1;

    // Technical fixes (usually high priority)
    for (const fix of fixes) {
        const task: RoadmapTask = {
            id: `task_${taskId++}`,
            type: 'fix',
            title: `Fix: ${fix.issue}`,
            description: fix.fix,
            affectedUrls: [fix.url],
            impact: fix.priority === 'high' ? 'high' : 'medium',
            effort: 'low',
            category: 'Technical'
        };

        if (fix.priority === 'high') {
            highTasks.push(task);
        } else if (fix.priority === 'medium') {
            mediumTasks.push(task);
        } else {
            lowTasks.push(task);
        }
    }

    // Merge suggestions (usually medium-high)
    for (const merge of merges) {
        const task: RoadmapTask = {
            id: `task_${taskId++}`,
            type: 'merge',
            title: `Merge ${merge.sourcePages.length} pages into one`,
            description: merge.reason,
            affectedUrls: [merge.targetPage, ...merge.sourcePages],
            impact: 'high',
            effort: 'medium',
            category: 'Content Consolidation'
        };
        mediumTasks.push(task);
    }

    // Delete suggestions
    for (const del of deletes) {
        const task: RoadmapTask = {
            id: `task_${taskId++}`,
            type: 'delete',
            title: `Remove: ${del.title}`,
            description: del.reason,
            affectedUrls: [del.url],
            impact: 'medium',
            effort: 'low',
            category: 'Content Cleanup'
        };
        lowTasks.push(task);
    }

    // New page suggestions
    for (const page of newPages) {
        const task: RoadmapTask = {
            id: `task_${taskId++}`,
            type: 'create',
            title: `Create: ${page.suggestedTitle}`,
            description: page.reason,
            affectedUrls: page.parentHub ? [page.parentHub] : [],
            impact: page.priority === 'high' ? 'high' : page.priority === 'medium' ? 'medium' : 'low',
            effort: 'high',
            category: 'Content Creation'
        };

        if (page.priority === 'high') {
            highTasks.push(task);
        } else if (page.priority === 'medium') {
            mediumTasks.push(task);
        } else {
            lowTasks.push(task);
        }
    }

    // Brief improvement suggestions
    for (const brief of briefs) {
        const task: RoadmapTask = {
            id: `task_${taskId++}`,
            type: 'update',
            title: `Improve: ${brief.pageTitle}`,
            description: brief.improvements.join('; '),
            affectedUrls: [brief.pageUrl],
            impact: 'medium',
            effort: 'medium',
            category: 'Content Optimization'
        };
        mediumTasks.push(task);
    }

    const groups: PriorityGroup[] = [];

    if (highTasks.length > 0) {
        groups.push({
            priority: 'high',
            category: 'Critical Issues',
            tasks: highTasks
        });
    }

    if (mediumTasks.length > 0) {
        groups.push({
            priority: 'medium',
            category: 'Important Improvements',
            tasks: mediumTasks
        });
    }

    if (lowTasks.length > 0) {
        groups.push({
            priority: 'low',
            category: 'Nice to Have',
            tasks: lowTasks
        });
    }

    return groups;
}

// =============================================================================
// SUMMARY CALCULATION
// =============================================================================

function calculateSummary(
    priorities: PriorityGroup[],
    technical: TechnicalBaseline,
    semantic: SemanticExtraction,
    knowledgeGraph: KnowledgeGraphAnalysis,
    segmentation: SegmentationAudit
): RoadmapSummary {
    const highPriority = priorities.find(p => p.priority === 'high')?.tasks.length || 0;
    const mediumPriority = priorities.find(p => p.priority === 'medium')?.tasks.length || 0;
    const lowPriority = priorities.find(p => p.priority === 'low')?.tasks.length || 0;
    const totalTasks = highPriority + mediumPriority + lowPriority;

    // Calculate current health score
    const technicalScore = 100 - (technical.issues.length * 5);
    const semanticScore = semantic.consistency.ceConsistency;
    const structuralScore = segmentation.overallScore;
    const kgScore = knowledgeGraph.consistencyScore;

    const overallHealthScore = Math.round(
        (technicalScore * 0.25 + semanticScore * 0.25 + structuralScore * 0.25 + kgScore * 0.25)
    );

    // Target is 85%
    const targetHealthScore = 85;

    return {
        totalTasks,
        highPriority,
        mediumPriority,
        lowPriority,
        overallHealthScore: Math.max(0, Math.min(100, overallHealthScore)),
        targetHealthScore
    };
}

// =============================================================================
// IMPACT ESTIMATION
// =============================================================================

function estimateImpact(
    newPages: NewPageSuggestion[],
    merges: MergeSuggestion[],
    fixes: TechnicalFix[],
    currentStructuralScore: number
): ImpactEstimate {
    // Traffic potential based on new content and consolidation
    const highPriorityPages = newPages.filter(p => p.priority === 'high').length;
    const trafficPotential = highPriorityPages >= 3 ? 'high' :
        highPriorityPages >= 1 ? 'medium' : 'low';

    // Authority improvement from consolidation
    const authorityImprovement = Math.min(merges.length * 5 + fixes.length * 2, 30);

    // Indexation improvement from technical fixes
    const indexationFixes = fixes.filter(f => f.type === 'meta' || f.type === 'redirect').length;
    const indexationImprovement = Math.min(indexationFixes * 3, 20);

    // UX score improvement
    const perfFixes = fixes.filter(f => f.type === 'performance').length;
    const structFixes = fixes.filter(f => f.type === 'structure').length;
    const userExperienceScore = Math.min(
        currentStructuralScore + (perfFixes * 3) + (structFixes * 2),
        100
    );

    return {
        trafficPotential,
        authorityImprovement,
        indexationImprovement,
        userExperienceScore
    };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
