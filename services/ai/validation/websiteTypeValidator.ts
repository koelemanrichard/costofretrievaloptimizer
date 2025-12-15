/**
 * Website Type Validator Service
 *
 * Validates topical map structure against website type-specific rules:
 * - Hub-spoke ratios
 * - Required page types
 * - Core/Author section balance
 * - Linking patterns
 * - EAV coverage
 */

import {
    BusinessInfo,
    EnrichedTopic,
    SemanticTriple,
    WebsiteType
} from '../../../types';
import {
    getWebsiteTypeConfig,
    WebsiteTypeConfig,
    validateHubSpokeRatio
} from '../../../config/websiteTypeTemplates';

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    category: 'hub_spoke' | 'page_types' | 'section_balance' | 'linking' | 'eav_coverage';
    message: string;
    recommendation?: string;
    affectedTopics?: string[];
}

export interface ValidationResult {
    isValid: boolean;
    score: number; // 0-100
    issues: ValidationIssue[];
    summary: {
        hubSpokeScore: number;
        pageTypeScore: number;
        sectionBalanceScore: number;
        eavCoverageScore: number;
    };
    websiteType: WebsiteType;
    config: WebsiteTypeConfig;
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validate a topical map against website type-specific rules
 */
export function validateTopicalMap(
    coreTopics: EnrichedTopic[],
    outerTopics: EnrichedTopic[],
    eavs: SemanticTriple[],
    businessInfo: BusinessInfo
): ValidationResult {
    const websiteType = businessInfo.websiteType || 'INFORMATIONAL';
    const config = getWebsiteTypeConfig(websiteType);

    const issues: ValidationIssue[] = [];

    // Run all validators
    const hubSpokeResult = validateHubSpokeStructure(coreTopics, outerTopics, config);
    const pageTypeResult = validatePageTypes(coreTopics, outerTopics, config);
    const sectionResult = validateSectionBalance(coreTopics, outerTopics, config);
    const eavResult = validateEavCoverage(eavs, config);

    issues.push(...hubSpokeResult.issues);
    issues.push(...pageTypeResult.issues);
    issues.push(...sectionResult.issues);
    issues.push(...eavResult.issues);

    // Calculate overall score (weighted average)
    const weights = {
        hubSpoke: 0.3,
        pageType: 0.2,
        sectionBalance: 0.25,
        eavCoverage: 0.25
    };

    const overallScore = Math.round(
        hubSpokeResult.score * weights.hubSpoke +
        pageTypeResult.score * weights.pageType +
        sectionResult.score * weights.sectionBalance +
        eavResult.score * weights.eavCoverage
    );

    const hasErrors = issues.some(i => i.severity === 'error');

    return {
        isValid: !hasErrors && overallScore >= 70,
        score: overallScore,
        issues,
        summary: {
            hubSpokeScore: hubSpokeResult.score,
            pageTypeScore: pageTypeResult.score,
            sectionBalanceScore: sectionResult.score,
            eavCoverageScore: eavResult.score
        },
        websiteType,
        config
    };
}

// =============================================================================
// HUB-SPOKE VALIDATION
// =============================================================================

function validateHubSpokeStructure(
    coreTopics: EnrichedTopic[],
    outerTopics: EnrichedTopic[],
    config: WebsiteTypeConfig
): { score: number; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];
    const { optimal, min, max } = config.hubSpokeRatio;

    // Count spokes per core topic
    const spokeCountMap = new Map<string, number>();
    for (const outer of outerTopics) {
        if (outer.parent_topic_id) {
            const current = spokeCountMap.get(outer.parent_topic_id) || 0;
            spokeCountMap.set(outer.parent_topic_id, current + 1);
        }
    }

    // Validate each core topic's ratio
    const topicsWithIssues: string[] = [];
    let totalRatio = 0;
    let validCount = 0;

    for (const core of coreTopics) {
        const spokeCount = spokeCountMap.get(core.id) || 0;
        totalRatio += spokeCount;

        const validation = validateHubSpokeRatio(config.type, spokeCount);

        if (!validation.valid) {
            topicsWithIssues.push(core.title);
        } else {
            validCount++;
        }
    }

    const avgRatio = coreTopics.length > 0 ? totalRatio / coreTopics.length : 0;

    // Generate issues
    if (avgRatio < min) {
        issues.push({
            severity: 'warning',
            category: 'hub_spoke',
            message: `Average hub-spoke ratio (${avgRatio.toFixed(1)}) is below the minimum (${min}) for ${config.label} websites`,
            recommendation: `Add ${Math.ceil(min - avgRatio)} more spoke pages per core topic on average`,
            affectedTopics: topicsWithIssues
        });
    }

    if (avgRatio > max) {
        issues.push({
            severity: 'warning',
            category: 'hub_spoke',
            message: `Average hub-spoke ratio (${avgRatio.toFixed(1)}) exceeds the maximum (${max}) for ${config.label} websites`,
            recommendation: `Consider creating ${Math.ceil(avgRatio / optimal)} additional hub pages to better distribute content`,
            affectedTopics: topicsWithIssues
        });
    }

    // Core topics without any spokes
    const orphanedHubs = coreTopics.filter(c => (spokeCountMap.get(c.id) || 0) === 0);
    if (orphanedHubs.length > 0) {
        issues.push({
            severity: 'error',
            category: 'hub_spoke',
            message: `${orphanedHubs.length} core topic(s) have no spoke pages`,
            recommendation: 'Every core topic should have supporting content. Add spoke pages or consolidate these into other topics.',
            affectedTopics: orphanedHubs.map(t => t.title)
        });
    }

    // Calculate score
    const score = coreTopics.length > 0
        ? Math.min(100, Math.round((validCount / coreTopics.length) * 100))
        : 100;

    return { score, issues };
}

// =============================================================================
// PAGE TYPE VALIDATION
// =============================================================================

function validatePageTypes(
    coreTopics: EnrichedTopic[],
    outerTopics: EnrichedTopic[],
    config: WebsiteTypeConfig
): { score: number; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];
    const allTopics = [...coreTopics, ...outerTopics];

    // Check for required page types in core section
    const requiredCore = config.coreSectionRules.requiredPageTypes;
    const coreTopicTitles = coreTopics.map(t => t.title.toLowerCase());

    const missingCoreTypes: string[] = [];
    for (const required of requiredCore) {
        const found = coreTopicTitles.some(title =>
            title.includes(required.replace(/_/g, ' ')) ||
            title.includes(required.replace(/_/g, '-'))
        );
        if (!found) {
            missingCoreTypes.push(required);
        }
    }

    if (missingCoreTypes.length > 0) {
        issues.push({
            severity: 'info',
            category: 'page_types',
            message: `Missing recommended page types for ${config.label}: ${missingCoreTypes.join(', ')}`,
            recommendation: `Consider adding topics covering: ${missingCoreTypes.map(t => t.replace(/_/g, ' ')).join(', ')}`
        });
    }

    // Check for required page types in author section
    const requiredAuthor = config.authorSectionRules.requiredPageTypes;
    const authorTopics = outerTopics.filter(t =>
        t.metadata?.segment === 'author_section' ||
        t.metadata?.cluster_role === 'cluster_content'
    );
    const authorTitles = authorTopics.map(t => t.title.toLowerCase());

    const missingAuthorTypes: string[] = [];
    for (const required of requiredAuthor) {
        const found = authorTitles.some(title =>
            title.includes(required.replace(/_/g, ' ')) ||
            title.includes(required.replace(/_/g, '-'))
        );
        if (!found) {
            missingAuthorTypes.push(required);
        }
    }

    if (missingAuthorTypes.length > 0) {
        issues.push({
            severity: 'info',
            category: 'page_types',
            message: `Missing author section page types: ${missingAuthorTypes.join(', ')}`,
            recommendation: `For ${config.label} sites, consider adding: ${missingAuthorTypes.map(t => t.replace(/_/g, ' ')).join(', ')}`
        });
    }

    // Calculate score based on coverage
    const totalRequired = requiredCore.length + requiredAuthor.length;
    const totalMissing = missingCoreTypes.length + missingAuthorTypes.length;
    const score = totalRequired > 0
        ? Math.round(((totalRequired - totalMissing) / totalRequired) * 100)
        : 100;

    return { score, issues };
}

// =============================================================================
// SECTION BALANCE VALIDATION
// =============================================================================

function validateSectionBalance(
    coreTopics: EnrichedTopic[],
    outerTopics: EnrichedTopic[],
    config: WebsiteTypeConfig
): { score: number; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];

    // Core section should have deeper content
    const coreCount = coreTopics.length;
    const outerCount = outerTopics.length;
    const totalCount = coreCount + outerCount;

    if (totalCount === 0) {
        return { score: 0, issues: [{ severity: 'error', category: 'section_balance', message: 'No topics found' }] };
    }

    // Ideal ratio varies by website type
    const idealCoreRatio = config.coreSectionRules.contentDepth === 'deep' ? 0.25 : 0.35;
    const actualCoreRatio = coreCount / totalCount;

    // Too few core topics
    if (actualCoreRatio < 0.1) {
        issues.push({
            severity: 'warning',
            category: 'section_balance',
            message: 'Core section is underrepresented (< 10% of topics)',
            recommendation: `For ${config.label} sites, consider adding more monetization-focused core topics`
        });
    }

    // Too many core topics (could indicate poor hierarchy)
    if (actualCoreRatio > 0.5) {
        issues.push({
            severity: 'warning',
            category: 'section_balance',
            message: 'Core section is overrepresented (> 50% of topics)',
            recommendation: 'Consider converting some core topics to spokes, or expanding with more author section content'
        });
    }

    // Check pillar distribution
    const pillars = coreTopics.filter(t => t.cluster_role === 'pillar');
    if (pillars.length === 0 && coreCount > 0) {
        issues.push({
            severity: 'warning',
            category: 'section_balance',
            message: 'No pillar pages identified (core topics with sufficient spokes)',
            recommendation: 'Ensure at least some core topics have enough spokes to qualify as pillars'
        });
    }

    // Calculate score
    const ratioScore = Math.round(Math.max(0, 100 - Math.abs(actualCoreRatio - idealCoreRatio) * 200));
    const pillarScore = pillars.length > 0 ? 100 : 70;
    const score = Math.round((ratioScore + pillarScore) / 2);

    return { score, issues };
}

// =============================================================================
// EAV COVERAGE VALIDATION
// =============================================================================

function validateEavCoverage(
    eavs: SemanticTriple[],
    config: WebsiteTypeConfig
): { score: number; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];

    if (eavs.length === 0) {
        return {
            score: 0,
            issues: [{
                severity: 'error',
                category: 'eav_coverage',
                message: 'No EAVs (Entity-Attribute-Value triples) defined',
                recommendation: 'Define semantic triples to guide content structure and ensure consistent facts across the site'
            }]
        };
    }

    // Check for required attribute categories
    const requiredCategories = config.eavPriority.requiredCategories;
    const eavPredicates = eavs.map(e => e.predicate?.toLowerCase() || '');

    // Check ROOT attributes
    const rootMissing = requiredCategories.ROOT.filter(attr =>
        !eavPredicates.some(p => p.includes(attr.replace(/_/g, ' ')) || p.includes(attr))
    );

    if (rootMissing.length > 0) {
        issues.push({
            severity: 'warning',
            category: 'eav_coverage',
            message: `Missing ROOT attributes for ${config.label}: ${rootMissing.join(', ')}`,
            recommendation: `Add EAVs covering essential attributes: ${rootMissing.map(a => a.replace(/_/g, ' ')).join(', ')}`
        });
    }

    // Check UNIQUE attributes
    const uniqueMissing = requiredCategories.UNIQUE.filter(attr =>
        !eavPredicates.some(p => p.includes(attr.replace(/_/g, ' ')) || p.includes(attr))
    );

    if (uniqueMissing.length > requiredCategories.UNIQUE.length / 2) {
        issues.push({
            severity: 'info',
            category: 'eav_coverage',
            message: `Missing many UNIQUE (differentiating) attributes: ${uniqueMissing.slice(0, 3).join(', ')}...`,
            recommendation: `For competitive advantage, consider adding: ${uniqueMissing.slice(0, 3).map(a => a.replace(/_/g, ' ')).join(', ')}`
        });
    }

    // Check for dominant attribute
    const dominantAttr = config.eavPriority.dominantAttribute;
    const hasDominant = eavPredicates.some(p =>
        p.includes(dominantAttr) || p.includes(dominantAttr.replace(/_/g, ' '))
    );

    if (!hasDominant) {
        issues.push({
            severity: 'warning',
            category: 'eav_coverage',
            message: `Missing dominant attribute "${dominantAttr}" which is critical for ${config.label} websites`,
            recommendation: `Add EAVs related to "${dominantAttr}" as this is the central pivot for your website type`
        });
    }

    // Calculate coverage score
    const totalRequired = requiredCategories.ROOT.length + requiredCategories.UNIQUE.length;
    const totalMissing = rootMissing.length + uniqueMissing.length;
    const coverageScore = totalRequired > 0
        ? Math.round(((totalRequired - totalMissing) / totalRequired) * 100)
        : 100;

    // Quantity bonus (more EAVs is generally better up to a point)
    const quantityBonus = Math.min(20, eavs.length * 2);

    const score = Math.min(100, coverageScore + quantityBonus);

    return { score, issues };
}

// =============================================================================
// EXPORT HELPER FUNCTIONS
// =============================================================================

/**
 * Get a human-readable validation summary
 */
export function getValidationSummary(result: ValidationResult): string {
    const { score, issues, summary, websiteType, config } = result;

    let summary_text = `Validation Score: ${score}/100 for ${config.label} website\n\n`;

    summary_text += `Breakdown:\n`;
    summary_text += `- Hub-Spoke Structure: ${summary.hubSpokeScore}/100\n`;
    summary_text += `- Page Types: ${summary.pageTypeScore}/100\n`;
    summary_text += `- Section Balance: ${summary.sectionBalanceScore}/100\n`;
    summary_text += `- EAV Coverage: ${summary.eavCoverageScore}/100\n\n`;

    if (issues.length > 0) {
        const errors = issues.filter(i => i.severity === 'error');
        const warnings = issues.filter(i => i.severity === 'warning');
        const info = issues.filter(i => i.severity === 'info');

        if (errors.length > 0) {
            summary_text += `Errors (${errors.length}):\n`;
            errors.forEach(e => { summary_text += `  ❌ ${e.message}\n`; });
        }
        if (warnings.length > 0) {
            summary_text += `Warnings (${warnings.length}):\n`;
            warnings.forEach(w => { summary_text += `  ⚠️ ${w.message}\n`; });
        }
        if (info.length > 0) {
            summary_text += `Suggestions (${info.length}):\n`;
            info.forEach(i => { summary_text += `  ℹ️ ${i.message}\n`; });
        }
    } else {
        summary_text += `✅ No issues found. Topical map structure is optimal for ${config.label} websites.`;
    }

    return summary_text;
}
