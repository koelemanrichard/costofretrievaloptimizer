/**
 * Phase 3: Page Segmentation Audit
 *
 * Audits the site structure for:
 * - Core vs Author section balance
 * - Hub-spoke architecture
 * - Internal linking quality
 * - Ranking dilution risks
 */

import {
    SegmentationAudit,
    SectionAnalysis,
    PageSegmentInfo,
    HubSpokeAudit,
    HubIssue,
    LinkingAudit,
    AnchorIssue,
    DilutionRisk,
    PageSemanticInfo,
    SemanticDistanceMap
} from './types';
import { WebsiteType, WEBSITE_TYPE_CONFIG } from '../../../types';
import { getWebsiteTypeConfig } from '../../../config/websiteTypeTemplates';

// =============================================================================
// MAIN PHASE 3 EXECUTION
// =============================================================================

export async function executePhase3(
    pageSemantics: PageSemanticInfo[],
    semanticDistances: SemanticDistanceMap[],
    websiteType: WebsiteType,
    onProgress?: (progress: number, step: string) => void
): Promise<SegmentationAudit> {
    onProgress?.(0, 'Analyzing page segments');

    // Get website type configuration for rules
    const typeConfig = getWebsiteTypeConfig(websiteType);
    const optimalHubRatio = typeConfig?.hubSpokeRatio.optimal || 7;

    // Build segment pages
    const pageSegmentInfos = buildPageSegmentInfo(pageSemantics, semanticDistances);
    onProgress?.(20, 'Page segments classified');

    // Analyze core section
    const corePages = pageSegmentInfos.filter(p => p.segment === 'core');
    const coreSection = analyzeSectionPages(corePages, 'core');
    onProgress?.(35, 'Core section analyzed');

    // Analyze author section
    const authorPages = pageSegmentInfos.filter(p => p.segment === 'author');
    const authorSection = analyzeSectionPages(authorPages, 'author');
    onProgress?.(50, 'Author section analyzed');

    // Analyze support pages
    const supportPages = pageSegmentInfos.filter(p => p.segment === 'support');
    const supportPageSection = analyzeSectionPages(supportPages, 'support');
    onProgress?.(60, 'Support pages analyzed');

    // Analyze hub-spoke structure
    const hubSpokeAnalysis = analyzeHubSpoke(pageSegmentInfos, optimalHubRatio);
    onProgress?.(75, 'Hub-spoke structure analyzed');

    // Audit internal linking
    const linkingAudit = auditInternalLinking(pageSegmentInfos);
    onProgress?.(85, 'Internal linking audited');

    // Identify dilution risks
    const dilutionRisks = identifyDilutionRisks(pageSemantics, semanticDistances);
    onProgress?.(95, 'Dilution risks identified');

    // Calculate overall score
    const overallScore = calculateOverallScore(
        coreSection,
        authorSection,
        hubSpokeAnalysis,
        linkingAudit,
        dilutionRisks
    );

    onProgress?.(100, 'Segmentation audit complete');

    return {
        coreSection,
        authorSection,
        supportPages: supportPageSection,
        hubSpokeAnalysis,
        linkingAudit,
        dilutionRisks,
        overallScore
    };
}

// =============================================================================
// PAGE SEGMENT INFO BUILDING
// =============================================================================

function buildPageSegmentInfo(
    pages: PageSemanticInfo[],
    distances: SemanticDistanceMap[]
): PageSegmentInfo[] {
    // Build connection counts from distances
    const connectionCounts = new Map<string, { inbound: number; outbound: number }>();

    for (const page of pages) {
        connectionCounts.set(page.url, { inbound: 0, outbound: 0 });
    }

    // Count potential links based on shouldLink
    for (const dist of distances) {
        if (dist.shouldLink) {
            const countA = connectionCounts.get(dist.pageA);
            const countB = connectionCounts.get(dist.pageB);
            if (countA) countA.outbound++;
            if (countB) countB.inbound++;
        }
    }

    return pages.map(page => {
        const connections = connectionCounts.get(page.url) || { inbound: 0, outbound: 0 };

        // Determine if this is a hub (high spoke count)
        const spokeCount = countSpokes(page.url, distances, pages);
        const isHub = spokeCount >= 3;

        // Calculate compliance score based on segment alignment and confidence
        const complianceScore = calculatePageComplianceScore(page);

        return {
            url: page.url,
            title: page.title,
            segment: page.segment || 'support',
            isHub,
            spokeCount,
            inboundLinks: connections.inbound,
            outboundLinks: connections.outbound,
            eavCount: 0, // Would come from actual EAV data
            complianceScore
        };
    });
}

function countSpokes(
    hubUrl: string,
    distances: SemanticDistanceMap[],
    pages: PageSemanticInfo[]
): number {
    // Count pages that are closely related (potential spokes)
    let spokeCount = 0;

    for (const dist of distances) {
        const isRelated = dist.pageA === hubUrl || dist.pageB === hubUrl;
        // Spokes should be moderately close (0.2-0.5 distance)
        const isSpoke = isRelated && dist.distance >= 0.2 && dist.distance <= 0.5;

        if (isSpoke) spokeCount++;
    }

    return spokeCount;
}

function calculatePageComplianceScore(page: PageSemanticInfo): number {
    let score = 50; // Base score

    // Add for matching site CE
    if (page.matchesSiteCE) score += 20;

    // Add for matching site SC
    if (page.matchesSiteSC) score += 15;

    // Add for known segment
    if (page.segment !== 'unknown') score += 10;

    // Add confidence weight
    score += page.confidence * 5;

    return Math.min(100, Math.round(score));
}

// =============================================================================
// SECTION ANALYSIS
// =============================================================================

function analyzeSectionPages(
    pages: PageSegmentInfo[],
    sectionType: 'core' | 'author' | 'support'
): SectionAnalysis {
    const issues: string[] = [];

    // Calculate coverage
    const coverage = pages.length > 0 ? 100 : 0;

    // Determine depth based on hub presence and spoke counts
    const hubs = pages.filter(p => p.isHub);
    const avgSpokeCount = hubs.length > 0
        ? hubs.reduce((sum, h) => sum + h.spokeCount, 0) / hubs.length
        : 0;

    let depth: 'deep' | 'moderate' | 'shallow';
    if (avgSpokeCount >= 5) {
        depth = 'deep';
    } else if (avgSpokeCount >= 2) {
        depth = 'moderate';
    } else {
        depth = 'shallow';
    }

    // Identify section-specific issues
    if (sectionType === 'core') {
        if (hubs.length === 0 && pages.length > 0) {
            issues.push('Core section has no hub pages');
        }
        if (depth === 'shallow') {
            issues.push('Core section lacks depth - add more supporting content');
        }
        const lowCompliance = pages.filter(p => p.complianceScore < 70);
        if (lowCompliance.length > pages.length * 0.3) {
            issues.push(`${lowCompliance.length} core pages have low compliance scores`);
        }
    }

    if (sectionType === 'author') {
        // Author section should support core
        const disconnected = pages.filter(p => p.outboundLinks === 0);
        if (disconnected.length > 0) {
            issues.push(`${disconnected.length} author pages have no links to core content`);
        }
    }

    if (sectionType === 'support') {
        // Support pages should be minimal
        if (pages.length > 10) {
            issues.push('Too many support pages - consider consolidating');
        }
    }

    return {
        pageCount: pages.length,
        pages,
        coverage,
        depth,
        issues
    };
}

// =============================================================================
// HUB-SPOKE ANALYSIS
// =============================================================================

function analyzeHubSpoke(
    pages: PageSegmentInfo[],
    optimalRatio: number
): HubSpokeAudit {
    const hubs = pages.filter(p => p.isHub);
    const recommendations: string[] = [];
    const hubsWithIssues: HubIssue[] = [];

    // Calculate average ratio
    let totalRatio = 0;
    for (const hub of hubs) {
        const ratio = hub.spokeCount;
        totalRatio += ratio;

        // Check for issues
        if (ratio < 3) {
            hubsWithIssues.push({
                hubUrl: hub.url,
                hubTitle: hub.title,
                currentRatio: ratio,
                issue: 'too_few_spokes',
                recommendation: `Add ${3 - ratio} more supporting pages to this hub`
            });
        } else if (ratio > optimalRatio + 2) {
            hubsWithIssues.push({
                hubUrl: hub.url,
                hubTitle: hub.title,
                currentRatio: ratio,
                issue: 'too_many_spokes',
                recommendation: `Consider splitting this hub into ${Math.ceil(ratio / optimalRatio)} sub-hubs`
            });
        }
    }

    const averageRatio = hubs.length > 0 ? totalRatio / hubs.length : 0;

    // Generate recommendations
    if (hubs.length === 0) {
        recommendations.push('No hub pages identified - create central hub pages for main topics');
    } else if (averageRatio < optimalRatio - 2) {
        recommendations.push(`Current hub-spoke ratio (1:${averageRatio.toFixed(1)}) is below optimal (1:${optimalRatio}) - add more supporting content`);
    } else if (averageRatio > optimalRatio + 2) {
        recommendations.push(`Current hub-spoke ratio (1:${averageRatio.toFixed(1)}) exceeds optimal (1:${optimalRatio}) - consider creating sub-topics`);
    }

    // Check for orphan hubs (hubs with no spokes)
    const orphanHubs = hubs.filter(h => h.spokeCount === 0);
    for (const orphan of orphanHubs) {
        hubsWithIssues.push({
            hubUrl: orphan.url,
            hubTitle: orphan.title,
            currentRatio: 0,
            issue: 'orphan_hub',
            recommendation: 'This hub page has no connected content - create supporting spoke pages'
        });
    }

    return {
        totalHubs: hubs.length,
        averageRatio: Math.round(averageRatio * 10) / 10,
        optimalRatio,
        hubsWithIssues,
        recommendations
    };
}

// =============================================================================
// INTERNAL LINKING AUDIT
// =============================================================================

function auditInternalLinking(pages: PageSegmentInfo[]): LinkingAudit {
    // Calculate total and average links
    const totalInternalLinks = pages.reduce((sum, p) => sum + p.outboundLinks, 0);
    const averageLinksPerPage = pages.length > 0
        ? totalInternalLinks / pages.length
        : 0;

    // Find page with most links
    let maxLinksPage = { url: '', count: 0 };
    for (const page of pages) {
        if (page.outboundLinks > maxLinksPage.count) {
            maxLinksPage = { url: page.url, count: page.outboundLinks };
        }
    }

    // Anchor text analysis (simplified - would need actual anchor data)
    // For now, we'll simulate based on available data
    const anchorTextDiversity = calculateAnchorDiversity(pages);
    const anchorRepetitionIssues: AnchorIssue[] = [];

    // Check for overused anchors (heuristic based on hub titles)
    const titleCounts = new Map<string, number>();
    pages.forEach(p => {
        const titleLower = p.title.toLowerCase();
        titleCounts.set(titleLower, (titleCounts.get(titleLower) || 0) + 1);
    });

    titleCounts.forEach((count, title) => {
        if (count > 3) {
            anchorRepetitionIssues.push({
                anchorText: title,
                occurrences: count,
                pages: pages.filter(p => p.title.toLowerCase() === title).map(p => p.url),
                recommendation: 'Diversify anchor text to avoid over-optimization'
            });
        }
    });

    // Calculate link direction score (author → core flow)
    const linkDirectionScore = calculateLinkDirectionScore(pages);

    // Quality node coverage
    const qualityNodes = pages.filter(p => p.isHub || p.complianceScore >= 80);
    const qualityNodeCoverage = pages.length > 0
        ? (qualityNodes.length / pages.length) * 100
        : 0;

    return {
        totalInternalLinks,
        averageLinksPerPage: Math.round(averageLinksPerPage * 10) / 10,
        maxLinksPage,
        anchorTextDiversity,
        anchorRepetitionIssues,
        linkDirectionScore,
        qualityNodeCoverage: Math.round(qualityNodeCoverage)
    };
}

function calculateAnchorDiversity(pages: PageSegmentInfo[]): number {
    // Simplified: based on title diversity as proxy for anchor diversity
    const uniqueTitles = new Set(pages.map(p => p.title.toLowerCase()));
    const totalTitles = pages.length;

    if (totalTitles === 0) return 100;

    return Math.round((uniqueTitles.size / totalTitles) * 100);
}

function calculateLinkDirectionScore(pages: PageSegmentInfo[]): number {
    // Score based on proper link flow (author → core)
    let correctFlow = 0;
    let totalLinks = 0;

    const authorPages = pages.filter(p => p.segment === 'author');
    const corePages = pages.filter(p => p.segment === 'core');

    // Author pages should have outbound links
    for (const author of authorPages) {
        if (author.outboundLinks > 0) {
            correctFlow += author.outboundLinks;
        }
        totalLinks += Math.max(author.outboundLinks, 1);
    }

    // Core pages should have inbound links
    for (const core of corePages) {
        if (core.inboundLinks > 0) {
            correctFlow += core.inboundLinks;
        }
        totalLinks += Math.max(core.inboundLinks, 1);
    }

    if (totalLinks === 0) return 50;

    return Math.min(100, Math.round((correctFlow / totalLinks) * 100));
}

// =============================================================================
// DILUTION RISK IDENTIFICATION
// =============================================================================

function identifyDilutionRisks(
    pages: PageSemanticInfo[],
    distances: SemanticDistanceMap[]
): DilutionRisk[] {
    const risks: DilutionRisk[] = [];

    // Keyword cannibalization: pages too similar (distance < 0.2)
    const cannibalizationPairs: { pages: string[]; similarity: number }[] = [];
    for (const dist of distances) {
        if (dist.distance < 0.2) {
            // Very similar - potential cannibalization
            cannibalizationPairs.push({
                pages: [dist.pageA, dist.pageB],
                similarity: 1 - dist.distance
            });
        }
    }

    if (cannibalizationPairs.length > 0) {
        // Group by clusters
        const grouped = groupSimilarPages(cannibalizationPairs);
        for (const group of grouped) {
            risks.push({
                type: 'keyword_cannibalization',
                severity: group.length > 4 ? 'high' : group.length > 2 ? 'medium' : 'low',
                affectedPages: group,
                message: `${group.length} pages are semantically too similar and may compete for rankings`,
                recommendation: 'Consolidate these pages or differentiate their topics more clearly'
            });
        }
    }

    // Topic overlap: same CSI across multiple pages
    const csiGroups = new Map<string, PageSemanticInfo[]>();
    for (const page of pages) {
        const csi = page.extractedCSI.toLowerCase();
        if (!csiGroups.has(csi)) {
            csiGroups.set(csi, []);
        }
        csiGroups.get(csi)!.push(page);
    }

    csiGroups.forEach((group, csi) => {
        if (group.length > 2 && csi !== 'informational') {
            risks.push({
                type: 'topic_overlap',
                severity: group.length > 5 ? 'high' : 'medium',
                affectedPages: group.map(p => p.url),
                message: `${group.length} pages target the same search intent: "${csi}"`,
                recommendation: 'Differentiate the focus of these pages or consolidate into fewer, more comprehensive pages'
            });
        }
    });

    // Thin content: low confidence pages
    const thinPages = pages.filter(p => p.confidence < 0.4);
    if (thinPages.length > 0) {
        risks.push({
            type: 'thin_content',
            severity: thinPages.length > pages.length * 0.2 ? 'high' : 'medium',
            affectedPages: thinPages.map(p => p.url),
            message: `${thinPages.length} pages have weak semantic identity`,
            recommendation: 'Enhance these pages with more focused content and EAV definitions'
        });
    }

    // Orphan pages: unknown segment with low confidence
    const orphans = pages.filter(p => p.segment === 'unknown' && p.confidence < 0.5);
    if (orphans.length > 0) {
        risks.push({
            type: 'orphan_page',
            severity: orphans.length > 5 ? 'high' : 'low',
            affectedPages: orphans.map(p => p.url),
            message: `${orphans.length} pages are not clearly connected to the site's semantic structure`,
            recommendation: 'Link these pages to relevant hub pages or consider removing them'
        });
    }

    return risks;
}

function groupSimilarPages(pairs: { pages: string[]; similarity: number }[]): string[][] {
    const groups: Set<string>[] = [];

    for (const pair of pairs) {
        // Find existing group that contains either page
        let foundGroup: Set<string> | undefined;
        for (const group of groups) {
            if (group.has(pair.pages[0]) || group.has(pair.pages[1])) {
                foundGroup = group;
                break;
            }
        }

        if (foundGroup) {
            foundGroup.add(pair.pages[0]);
            foundGroup.add(pair.pages[1]);
        } else {
            groups.push(new Set(pair.pages));
        }
    }

    // Merge overlapping groups
    const merged: Set<string>[] = [];
    for (const group of groups) {
        let wasMerged = false;
        for (const existing of merged) {
            const overlap = Array.from(group).some(p => existing.has(p));
            if (overlap) {
                group.forEach(p => existing.add(p));
                wasMerged = true;
                break;
            }
        }
        if (!wasMerged) {
            merged.push(group);
        }
    }

    return merged.map(g => Array.from(g));
}

// =============================================================================
// OVERALL SCORE CALCULATION
// =============================================================================

function calculateOverallScore(
    coreSection: SectionAnalysis,
    authorSection: SectionAnalysis,
    hubSpokeAnalysis: HubSpokeAudit,
    linkingAudit: LinkingAudit,
    dilutionRisks: DilutionRisk[]
): number {
    let score = 100;

    // Deduct for core section issues
    score -= coreSection.issues.length * 5;
    if (coreSection.depth === 'shallow') score -= 10;

    // Deduct for author section issues
    score -= authorSection.issues.length * 3;

    // Deduct for hub-spoke issues
    score -= hubSpokeAnalysis.hubsWithIssues.length * 5;
    if (hubSpokeAnalysis.totalHubs === 0) score -= 15;

    // Deduct for linking issues
    if (linkingAudit.linkDirectionScore < 50) score -= 10;
    score -= linkingAudit.anchorRepetitionIssues.length * 3;

    // Deduct for dilution risks
    const highRisks = dilutionRisks.filter(r => r.severity === 'high').length;
    const mediumRisks = dilutionRisks.filter(r => r.severity === 'medium').length;
    score -= highRisks * 10;
    score -= mediumRisks * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
}
