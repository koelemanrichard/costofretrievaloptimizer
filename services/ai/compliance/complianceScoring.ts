/**
 * Semantic Compliance Scoring Service
 *
 * Calculates compliance scores based on Holistic SEO research requirements:
 * - EAV Coverage (required attributes present)
 * - Contextual Flow (heading progression)
 * - Anchor Diversity (max 3 repetitions rule)
 * - Format Compliance (correct format for query type)
 * - Schema Completeness (required schemas present)
 * - Visual Hierarchy (proper heading structure)
 *
 * Target: >= 85% compliance score
 */

import { ContentBrief, EnrichedTopic, SemanticTriple, WebsiteType } from '../../../types';
import { getWebsiteTypeConfig } from '../../../config/websiteTypeTemplates';

// =============================================================================
// TYPES
// =============================================================================

export interface ComplianceIssue {
    factor: ComplianceFactor;
    severity: 'critical' | 'major' | 'minor';
    message: string;
    recommendation: string;
    deduction: number; // Points deducted
}

export type ComplianceFactor =
    | 'eav_coverage'
    | 'contextual_flow'
    | 'anchor_diversity'
    | 'format_compliance'
    | 'schema_completeness'
    | 'visual_hierarchy'
    | 'central_entity_focus'
    | 'subordinate_text'
    | 'freshness_signals';

export interface ComplianceBreakdown {
    eavCoverage: number;        // 0-100: Required EAVs present
    contextualFlow: number;     // 0-100: Heading progression logic
    anchorDiversity: number;    // 0-100: Max 3 repetition rule
    formatCompliance: number;   // 0-100: Correct format for query type
    schemaCompleteness: number; // 0-100: Required schemas present
    visualHierarchy: number;    // 0-100: Font sizes match heading ranks
    centralEntityFocus: number; // 0-100: Single macro context maintained
    subordinateText: number;    // 0-100: First sentence answers heading
    freshnessSignals: number;   // 0-100: Appropriate freshness indicators
}

export interface ComplianceScore {
    overall: number;            // 0-100 weighted average
    passed: boolean;            // >= 85%
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    breakdown: ComplianceBreakdown;
    issues: ComplianceIssue[];
    recommendations: string[];
    factorsAnalyzed: number;
    timestamp: number;
}

// =============================================================================
// WEIGHTS FOR EACH COMPLIANCE FACTOR
// =============================================================================

const COMPLIANCE_WEIGHTS: Record<keyof ComplianceBreakdown, number> = {
    eavCoverage: 0.15,
    contextualFlow: 0.15,
    anchorDiversity: 0.10,
    formatCompliance: 0.12,
    schemaCompleteness: 0.12,
    visualHierarchy: 0.10,
    centralEntityFocus: 0.12,
    subordinateText: 0.08,
    freshnessSignals: 0.06
};

// Threshold for passing compliance
export const COMPLIANCE_THRESHOLD = 85;

// =============================================================================
// MAIN COMPLIANCE SCORING FUNCTION
// =============================================================================

/**
 * Calculate comprehensive compliance score for a content brief
 */
export function calculateBriefCompliance(
    brief: ContentBrief,
    topic: EnrichedTopic,
    allEavs: SemanticTriple[],
    websiteType?: WebsiteType
): ComplianceScore {
    const issues: ComplianceIssue[] = [];
    const config = websiteType ? getWebsiteTypeConfig(websiteType) : null;

    // Calculate each factor
    const eavResult = calculateEavCoverage(brief, allEavs, config);
    const flowResult = calculateContextualFlow(brief);
    const anchorResult = calculateAnchorDiversity(brief);
    const formatResult = calculateFormatCompliance(brief, topic);
    const schemaResult = calculateSchemaCompleteness(brief, config);
    const hierarchyResult = calculateVisualHierarchy(brief);
    const ceResult = calculateCentralEntityFocus(brief, topic);
    const subordinateResult = calculateSubordinateText(brief);
    const freshnessResult = calculateFreshnessSignals(brief, topic);

    // Collect issues
    issues.push(...eavResult.issues);
    issues.push(...flowResult.issues);
    issues.push(...anchorResult.issues);
    issues.push(...formatResult.issues);
    issues.push(...schemaResult.issues);
    issues.push(...hierarchyResult.issues);
    issues.push(...ceResult.issues);
    issues.push(...subordinateResult.issues);
    issues.push(...freshnessResult.issues);

    // Build breakdown
    const breakdown: ComplianceBreakdown = {
        eavCoverage: eavResult.score,
        contextualFlow: flowResult.score,
        anchorDiversity: anchorResult.score,
        formatCompliance: formatResult.score,
        schemaCompleteness: schemaResult.score,
        visualHierarchy: hierarchyResult.score,
        centralEntityFocus: ceResult.score,
        subordinateText: subordinateResult.score,
        freshnessSignals: freshnessResult.score
    };

    // Calculate weighted overall score
    const overall = Math.round(
        Object.entries(breakdown).reduce((sum, [key, value]) => {
            const weight = COMPLIANCE_WEIGHTS[key as keyof ComplianceBreakdown];
            return sum + (value * weight);
        }, 0)
    );

    // Determine grade
    const grade = getGrade(overall);

    // Generate top recommendations
    const recommendations = generateRecommendations(breakdown, issues);

    return {
        overall,
        passed: overall >= COMPLIANCE_THRESHOLD,
        grade,
        breakdown,
        issues,
        recommendations,
        factorsAnalyzed: Object.keys(breakdown).length,
        timestamp: Date.now()
    };
}

// =============================================================================
// INDIVIDUAL FACTOR CALCULATIONS
// =============================================================================

interface FactorResult {
    score: number;
    issues: ComplianceIssue[];
}

/**
 * EAV Coverage: Check if required EAVs are represented in the brief
 */
function calculateEavCoverage(
    brief: ContentBrief,
    allEavs: SemanticTriple[],
    config: ReturnType<typeof getWebsiteTypeConfig> | null
): FactorResult {
    const issues: ComplianceIssue[] = [];

    if (!brief.eavs || brief.eavs.length === 0) {
        return {
            score: 0,
            issues: [{
                factor: 'eav_coverage',
                severity: 'critical',
                message: 'No EAVs assigned to this content brief',
                recommendation: 'Assign relevant semantic triples to ensure factual consistency',
                deduction: 100
            }]
        };
    }

    // Check coverage by category
    const briefCategories = new Set(brief.eavs.map(e => e.category));
    const requiredCategories = ['ROOT', 'UNIQUE'];
    const missingCategories = requiredCategories.filter(c => !briefCategories.has(c as any));

    if (missingCategories.length > 0) {
        issues.push({
            factor: 'eav_coverage',
            severity: 'major',
            message: `Missing EAV categories: ${missingCategories.join(', ')}`,
            recommendation: 'Ensure brief includes ROOT (essential) and UNIQUE (differentiating) attributes',
            deduction: missingCategories.length * 15
        });
    }

    // Check quantity (should have at least 5 EAVs for comprehensive coverage)
    if (brief.eavs.length < 5) {
        issues.push({
            factor: 'eav_coverage',
            severity: 'minor',
            message: `Only ${brief.eavs.length} EAVs assigned (recommended: 5+)`,
            recommendation: 'Add more semantic triples for comprehensive attribute coverage',
            deduction: (5 - brief.eavs.length) * 5
        });
    }

    const totalDeduction = issues.reduce((sum, i) => sum + i.deduction, 0);
    return {
        score: Math.max(0, 100 - totalDeduction),
        issues
    };
}

/**
 * Contextual Flow: Check heading progression is logical
 */
function calculateContextualFlow(brief: ContentBrief): FactorResult {
    const issues: ComplianceIssue[] = [];

    if (!brief.structured_outline || brief.structured_outline.length === 0) {
        return {
            score: 0,
            issues: [{
                factor: 'contextual_flow',
                severity: 'critical',
                message: 'No structured outline present',
                recommendation: 'Generate a structured outline with proper heading hierarchy',
                deduction: 100
            }]
        };
    }

    // Check heading levels progress logically (H2 -> H3 -> H4, no skipping)
    let prevLevel = 1; // Start after H1
    let flowIssues = 0;

    for (const section of brief.structured_outline) {
        const level = section.heading_level || 2;

        // Skipping levels (e.g., H2 -> H4)
        if (level > prevLevel + 1) {
            flowIssues++;
        }

        prevLevel = level;
    }

    if (flowIssues > 0) {
        issues.push({
            factor: 'contextual_flow',
            severity: 'major',
            message: `${flowIssues} heading level skips detected (e.g., H2 → H4)`,
            recommendation: 'Ensure headings progress incrementally: H2 → H3 → H4',
            deduction: flowIssues * 10
        });
    }

    // Check for minimum sections
    if (brief.structured_outline.length < 3) {
        issues.push({
            factor: 'contextual_flow',
            severity: 'minor',
            message: 'Too few sections in outline',
            recommendation: 'Consider expanding the outline for more comprehensive coverage',
            deduction: 10
        });
    }

    const totalDeduction = issues.reduce((sum, i) => sum + i.deduction, 0);
    return {
        score: Math.max(0, 100 - totalDeduction),
        issues
    };
}

/**
 * Anchor Diversity: Check anchor text repetition (max 3 rule)
 */
function calculateAnchorDiversity(brief: ContentBrief): FactorResult {
    const issues: ComplianceIssue[] = [];

    if (!brief.suggested_internal_links || brief.suggested_internal_links.length === 0) {
        // No links is acceptable, full score
        return { score: 100, issues: [] };
    }

    // Count anchor text occurrences
    const anchorCounts = new Map<string, number>();
    for (const link of brief.suggested_internal_links) {
        const anchor = (link.anchor_text || link.title || '').toLowerCase();
        anchorCounts.set(anchor, (anchorCounts.get(anchor) || 0) + 1);
    }

    // Find violations
    const violations: string[] = [];
    anchorCounts.forEach((count, anchor) => {
        if (count > 3) {
            violations.push(`"${anchor}" (${count}x)`);
        }
    });

    if (violations.length > 0) {
        issues.push({
            factor: 'anchor_diversity',
            severity: 'major',
            message: `Anchor text repetition exceeds limit: ${violations.join(', ')}`,
            recommendation: 'Diversify anchor text. Use synonyms, variations, or contextual phrases',
            deduction: violations.length * 15
        });
    }

    const totalDeduction = issues.reduce((sum, i) => sum + i.deduction, 0);
    return {
        score: Math.max(0, 100 - totalDeduction),
        issues
    };
}

/**
 * Format Compliance: Check content format matches query type
 */
function calculateFormatCompliance(brief: ContentBrief, topic: EnrichedTopic): FactorResult {
    const issues: ComplianceIssue[] = [];

    // Determine expected format based on query type
    const queryType = topic.response_code || brief.serpAnalysis?.query_type || 'informational';
    const outline = brief.structured_outline || [];

    // Check for appropriate structures based on query type
    const hasTable = outline.some(s => s.format === 'table' || s.content_type === 'comparison');
    const hasList = outline.some(s => s.format === 'list' || s.content_type === 'steps');
    const hasHowTo = outline.some(s =>
        s.heading?.toLowerCase().includes('how to') ||
        s.content_type === 'instructional'
    );

    // Transactional queries should have tables/comparisons
    if (queryType === 'transactional' && !hasTable) {
        issues.push({
            factor: 'format_compliance',
            severity: 'minor',
            message: 'Transactional query missing comparison table',
            recommendation: 'Add a comparison table for better user decision-making',
            deduction: 15
        });
    }

    // How-to queries should have step lists
    if (queryType === 'how-to' && !hasList && !hasHowTo) {
        issues.push({
            factor: 'format_compliance',
            severity: 'major',
            message: 'How-to query missing step-by-step structure',
            recommendation: 'Add numbered steps or instructional list format',
            deduction: 20
        });
    }

    // Listicle queries should have lists
    if (queryType === 'listicle' && !hasList) {
        issues.push({
            factor: 'format_compliance',
            severity: 'minor',
            message: 'Listicle query missing list structure',
            recommendation: 'Add ordered or unordered lists as primary content format',
            deduction: 15
        });
    }

    const totalDeduction = issues.reduce((sum, i) => sum + i.deduction, 0);
    return {
        score: Math.max(0, 100 - totalDeduction),
        issues
    };
}

/**
 * Schema Completeness: Check required schemas are present
 */
function calculateSchemaCompleteness(
    brief: ContentBrief,
    config: ReturnType<typeof getWebsiteTypeConfig> | null
): FactorResult {
    const issues: ComplianceIssue[] = [];

    // Basic schema requirements (universal)
    const requiredSchemas = ['BreadcrumbList'];

    // Add type-specific schemas
    if (config) {
        requiredSchemas.push(...config.coreSectionRules.schemaTypes.slice(0, 2));
    }

    // Check if brief has schema suggestions
    const briefSchemas = brief.schema_suggestions || [];

    const missingSchemas = requiredSchemas.filter(s =>
        !briefSchemas.some(bs => bs.toLowerCase().includes(s.toLowerCase()))
    );

    if (missingSchemas.length > 0) {
        issues.push({
            factor: 'schema_completeness',
            severity: 'minor',
            message: `Missing recommended schemas: ${missingSchemas.join(', ')}`,
            recommendation: 'Add appropriate structured data for better SERP visibility',
            deduction: missingSchemas.length * 10
        });
    }

    // Always recommend FAQPage if there's an FAQ section
    const hasFaqSection = brief.structured_outline?.some(s =>
        s.heading?.toLowerCase().includes('faq') ||
        s.heading?.toLowerCase().includes('question')
    );

    if (hasFaqSection && !briefSchemas.some(s => s.toLowerCase().includes('faq'))) {
        issues.push({
            factor: 'schema_completeness',
            severity: 'minor',
            message: 'FAQ section present but FAQPage schema not suggested',
            recommendation: 'Add FAQPage schema to qualify for FAQ rich results',
            deduction: 10
        });
    }

    const totalDeduction = issues.reduce((sum, i) => sum + i.deduction, 0);
    return {
        score: Math.max(0, 100 - totalDeduction),
        issues
    };
}

/**
 * Visual Hierarchy: Check heading structure makes sense
 */
function calculateVisualHierarchy(brief: ContentBrief): FactorResult {
    const issues: ComplianceIssue[] = [];
    const outline = brief.structured_outline || [];

    if (outline.length === 0) {
        return { score: 100, issues: [] };
    }

    // Check for proper H2 -> H3 -> H4 distribution
    const h2Count = outline.filter(s => (s.heading_level || 2) === 2).length;
    const h3Count = outline.filter(s => s.heading_level === 3).length;
    const h4Count = outline.filter(s => s.heading_level === 4).length;

    // Should have at least some H2s
    if (h2Count === 0) {
        issues.push({
            factor: 'visual_hierarchy',
            severity: 'major',
            message: 'No H2 sections defined',
            recommendation: 'Structure content with H2 main sections',
            deduction: 25
        });
    }

    // H3s should only exist if there are H2s
    if (h3Count > 0 && h2Count === 0) {
        issues.push({
            factor: 'visual_hierarchy',
            severity: 'major',
            message: 'H3 sections without parent H2 sections',
            recommendation: 'Ensure H3s are nested under H2 parent sections',
            deduction: 15
        });
    }

    // Too many top-level sections can dilute structure
    if (h2Count > 10) {
        issues.push({
            factor: 'visual_hierarchy',
            severity: 'minor',
            message: `Too many H2 sections (${h2Count}) - may indicate flat structure`,
            recommendation: 'Consider grouping related sections under fewer H2 headers',
            deduction: 10
        });
    }

    const totalDeduction = issues.reduce((sum, i) => sum + i.deduction, 0);
    return {
        score: Math.max(0, 100 - totalDeduction),
        issues
    };
}

/**
 * Central Entity Focus: Check single macro context is maintained
 */
function calculateCentralEntityFocus(brief: ContentBrief, topic: EnrichedTopic): FactorResult {
    const issues: ComplianceIssue[] = [];

    // Check if central entity is mentioned in title
    const centralEntity = topic.title || brief.topic || '';
    const h1 = brief.suggested_h1 || brief.topic || '';

    // H1 should contain or relate to the central entity
    if (!h1.toLowerCase().includes(centralEntity.toLowerCase().split(' ')[0])) {
        issues.push({
            factor: 'central_entity_focus',
            severity: 'minor',
            message: 'H1 may not clearly reference the central entity',
            recommendation: 'Ensure H1 explicitly includes the main topic/entity',
            deduction: 10
        });
    }

    // Check if outline sections stay on topic (basic heuristic)
    const outline = brief.structured_outline || [];
    const entityWords = centralEntity.toLowerCase().split(' ').filter(w => w.length > 3);

    let offTopicCount = 0;
    for (const section of outline) {
        const heading = (section.heading || '').toLowerCase();
        const hasEntityWord = entityWords.some(w => heading.includes(w));
        const hasContextualWord = heading.includes('how') || heading.includes('what') ||
            heading.includes('why') || heading.includes('best') || heading.includes('guide');

        if (!hasEntityWord && !hasContextualWord && heading.length > 10) {
            offTopicCount++;
        }
    }

    if (offTopicCount > outline.length * 0.3) {
        issues.push({
            factor: 'central_entity_focus',
            severity: 'major',
            message: `${offTopicCount} sections may drift from central entity focus`,
            recommendation: 'Ensure all sections relate back to the main topic',
            deduction: 20
        });
    }

    const totalDeduction = issues.reduce((sum, i) => sum + i.deduction, 0);
    return {
        score: Math.max(0, 100 - totalDeduction),
        issues
    };
}

/**
 * Subordinate Text: Check first sentences answer the heading
 */
function calculateSubordinateText(brief: ContentBrief): FactorResult {
    const issues: ComplianceIssue[] = [];

    // This is a heuristic check - actual subordinate text compliance
    // would require the generated content, not just the brief
    const outline = brief.structured_outline || [];

    // Check if sections have guidance for subordinate text
    const sectionsWithGuidance = outline.filter(s =>
        s.key_points && s.key_points.length > 0 ||
        s.content_brief && s.content_brief.length > 20
    );

    const guidanceRatio = outline.length > 0
        ? sectionsWithGuidance.length / outline.length
        : 1;

    if (guidanceRatio < 0.5) {
        issues.push({
            factor: 'subordinate_text',
            severity: 'minor',
            message: 'Many sections lack detailed content guidance',
            recommendation: 'Add key_points or content_brief to guide subordinate text writing',
            deduction: 20
        });
    }

    const score = Math.round(guidanceRatio * 100);
    return { score, issues };
}

/**
 * Freshness Signals: Check appropriate freshness indicators
 */
function calculateFreshnessSignals(brief: ContentBrief, topic: EnrichedTopic): FactorResult {
    const issues: ComplianceIssue[] = [];

    const freshness = topic.freshness || 'STANDARD';
    const outline = brief.structured_outline || [];

    // Time-sensitive content should have freshness indicators
    if (freshness === 'TIME_SENSITIVE' || freshness === 'FAST') {
        const hasDateSection = outline.some(s =>
            s.heading?.toLowerCase().includes('update') ||
            s.heading?.toLowerCase().includes('2024') ||
            s.heading?.toLowerCase().includes('2025') ||
            s.heading?.toLowerCase().includes('latest')
        );

        if (!hasDateSection) {
            issues.push({
                factor: 'freshness_signals',
                severity: 'minor',
                message: 'Time-sensitive topic lacks freshness indicators',
                recommendation: 'Add date-specific sections or "Last Updated" signals',
                deduction: 15
            });
        }
    }

    // Evergreen content shouldn't have excessive time markers
    if (freshness === 'EVERGREEN') {
        const dateMarkers = outline.filter(s =>
            /\b20\d{2}\b/.test(s.heading || '')
        ).length;

        if (dateMarkers > 2) {
            issues.push({
                factor: 'freshness_signals',
                severity: 'minor',
                message: 'Evergreen content has many date-specific references',
                recommendation: 'Consider using timeless language for evergreen content',
                deduction: 10
            });
        }
    }

    const totalDeduction = issues.reduce((sum, i) => sum + i.deduction, 0);
    return {
        score: Math.max(0, 100 - totalDeduction),
        issues
    };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

function generateRecommendations(
    breakdown: ComplianceBreakdown,
    issues: ComplianceIssue[]
): string[] {
    const recommendations: string[] = [];

    // Find lowest scoring factors
    const sortedFactors = Object.entries(breakdown)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 3);

    for (const [factor, score] of sortedFactors) {
        if (score < 70) {
            const factorIssues = issues.filter(i =>
                i.factor === factor.replace(/([A-Z])/g, '_$1').toLowerCase().slice(0, -1)
            );

            if (factorIssues.length > 0) {
                recommendations.push(factorIssues[0].recommendation);
            }
        }
    }

    // Add generic recommendations if needed
    if (recommendations.length === 0 && issues.length > 0) {
        recommendations.push(issues[0].recommendation);
    }

    return recommendations.slice(0, 5);
}

// =============================================================================
// EXPORT UTILITIES
// =============================================================================

/**
 * Quick compliance check without full analysis
 */
export function quickComplianceCheck(brief: ContentBrief): {
    estimatedScore: number;
    majorIssues: string[];
} {
    const majorIssues: string[] = [];
    let deductions = 0;

    // Quick checks
    if (!brief.eavs || brief.eavs.length === 0) {
        majorIssues.push('No EAVs assigned');
        deductions += 20;
    }

    if (!brief.structured_outline || brief.structured_outline.length < 3) {
        majorIssues.push('Insufficient outline structure');
        deductions += 15;
    }

    if (!brief.suggested_h1) {
        majorIssues.push('Missing H1 suggestion');
        deductions += 10;
    }

    return {
        estimatedScore: Math.max(0, 100 - deductions),
        majorIssues
    };
}

/**
 * Get compliance status color
 */
export function getComplianceColor(score: number): 'red' | 'yellow' | 'green' {
    if (score >= COMPLIANCE_THRESHOLD) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
}

/**
 * Format compliance score for display
 */
export function formatComplianceScore(score: ComplianceScore): string {
    const status = score.passed ? '✅ PASSED' : '❌ NEEDS IMPROVEMENT';
    return `${score.overall}% (${score.grade}) - ${status}`;
}
