
import { TopicalMap, ValidationResult } from '../types';

export type RecommendationType =
    | 'GENERATE_INITIAL_MAP'
    | 'ANALYZE_DOMAIN'
    | 'GENERATE_BRIEFS'
    | 'VALIDATE_MAP'
    | 'FIX_VALIDATION_ISSUES'
    | 'EXPORT_DATA'
    | 'EXPAND_TOPICS'
    | 'CONFIGURE_NAVIGATION'
    | 'GENERATE_FOUNDATION_PAGES';

export interface Recommendation {
    id: string;
    type: RecommendationType;
    title: string;
    description: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    actionLabel: string;
}

export const calculateNextSteps = (map: TopicalMap, validationResult: ValidationResult | null): Recommendation[] => {
    const recommendations: Recommendation[] = [];
    const topics = map.topics || [];
    const briefs = map.briefs || {};
    const briefCount = Object.keys(briefs).length;
    const coreTopics = topics.filter(t => t.type === 'core');
    const outerTopics = topics.filter(t => t.type === 'outer');

    // 1. Critical: Empty Map
    if (topics.length === 0) {
        recommendations.push({
            id: 'gen_map',
            type: 'GENERATE_INITIAL_MAP',
            title: 'Generate Your Topical Map',
            description: 'Your map structure is empty. Start by generating the initial set of Core and Outer topics based on your pillars.',
            priority: 'CRITICAL',
            actionLabel: 'Generate Map'
        });
        return recommendations; // Stop here, nothing else matters yet
    }

    // 2. High: Knowledge Domain (Prerequisite for most things)
    // We assume if there are topics but we haven't run domain analysis (which populates EAVs/Graph usually), we should.
    // Since we don't have direct access to "Graph Loaded" state here easily without passing it in, 
    // we check if EAVs exist on the map as a proxy for "Analysis done at least once".
    // Note: checking map.eavs length might be a good proxy.
    const eavs = map.eavs as any[] || [];
    if (eavs.length === 0) {
        recommendations.push({
            id: 'analyze_domain',
            type: 'ANALYZE_DOMAIN',
            title: 'Analyze Knowledge Domain',
            description: 'Build the semantic graph for your topics. This is required before generating content briefs or expanding topics.',
            priority: 'HIGH',
            actionLabel: 'Analyze Domain'
        });
    }

    // 3. High: Brief Generation
    if (briefCount === 0 && topics.length > 0) {
        recommendations.push({
            id: 'gen_briefs',
            type: 'GENERATE_BRIEFS',
            title: 'Generate Content Briefs',
            description: `You have ${topics.length} topics but no content briefs. Generate briefs to give your writers detailed instructions.`,
            priority: 'HIGH',
            actionLabel: 'Generate All Briefs'
        });
    } else if (briefCount > 0 && briefCount < topics.length) {
         recommendations.push({
            id: 'gen_remaining_briefs',
            type: 'GENERATE_BRIEFS',
            title: 'Complete Your Briefs',
            description: `You have ${topics.length - briefCount} topics pending briefs. Finish generating them to complete your strategy.`,
            priority: 'MEDIUM',
            actionLabel: 'Generate Remaining'
        });
    }

    // 4. High: Validation
    if (!validationResult && topics.length > 10) {
        recommendations.push({
            id: 'validate_map',
            type: 'VALIDATE_MAP',
            title: 'Validate Map Structure',
            description: 'Run an AI audit to check for structural gaps, cannibalization risks, and hub-spoke ratios.',
            priority: 'MEDIUM',
            actionLabel: 'Validate Map'
        });
    } else if (validationResult && validationResult.issues.some(i => i.severity === 'CRITICAL')) {
         recommendations.push({
            id: 'fix_issues',
            type: 'FIX_VALIDATION_ISSUES',
            title: 'Fix Critical Issues',
            description: 'Your map has critical structural issues found by the validator. Review and fix them to ensure authority flow.',
            priority: 'HIGH',
            actionLabel: 'View Report'
        });
    }

    // 5. Medium: Foundation Pages
    const foundationPages = map.foundationPages || [];
    if (foundationPages.length === 0 && topics.length > 5) {
        recommendations.push({
            id: 'gen_foundation',
            type: 'GENERATE_FOUNDATION_PAGES',
            title: 'Create Foundation Pages',
            description: 'Generate essential pages (Homepage, About, Contact) to establish your site\'s E-A-T foundation.',
            priority: 'MEDIUM',
            actionLabel: 'Generate Pages'
        });
    }

    // 6. Medium: Navigation Structure
    const hasNavigation = map.navigation && (
        (map.navigation.header?.primary_nav?.length ?? 0) > 0 ||
        (map.navigation.footer?.sections?.length ?? 0) > 0
    );
    if (foundationPages.length > 0 && !hasNavigation && coreTopics.length > 3) {
        // Count pillars for better messaging
        const pillarCount = coreTopics.filter(t => t.cluster_role === 'pillar').length;
        const pillarMsg = pillarCount > 0
            ? `${pillarCount} pillar pages detected.`
            : 'No pillars detected - navigation will use monetization priority.';

        recommendations.push({
            id: 'configure_nav',
            type: 'CONFIGURE_NAVIGATION',
            title: 'Configure Site Navigation',
            description: `Generate an intelligent navigation structure based on your topical map. ${pillarMsg} Proper navigation optimizes PageRank flow to money pages.`,
            priority: 'MEDIUM',
            actionLabel: 'Setup Navigation'
        });
    }

    // 7. Medium: Expansion
    // Check Hub-Spoke ratios loosely
    const weakCores = coreTopics.filter(core => {
        const spokes = outerTopics.filter(t => t.parent_topic_id === core.id);
        return spokes.length < 5;
    });

    if (weakCores.length > 0) {
         recommendations.push({
            id: 'expand_topics',
            type: 'EXPAND_TOPICS',
            title: 'Strengthen Core Clusters',
            description: `${weakCores.length} Core Topics have fewer than 5 spokes. Expand them to build better topical authority.`,
            priority: 'MEDIUM',
            actionLabel: 'Add Topics'
        });
    }

    // 8. Low: Export
    if (briefCount > 0 && briefCount === topics.length) {
         recommendations.push({
            id: 'export_data',
            type: 'EXPORT_DATA',
            title: 'Export Strategy',
            description: 'Your map appears complete! Export the data to Excel/CSV for your content team.',
            priority: 'LOW',
            actionLabel: 'Export Data'
        });
    }

    return recommendations.sort((a, b) => {
        const pMap = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        return pMap[a.priority] - pMap[b.priority];
    });
};
