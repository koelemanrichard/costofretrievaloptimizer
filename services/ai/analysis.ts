
import { BusinessInfo, GscRow, KnowledgeGraph, GscOpportunity, EnrichedTopic, SEOPillars, ValidationResult, ValidationIssue, MapImprovementSuggestion, SemanticAnalysisResult, ContextualCoverageMetrics, ContentBrief, InternalLinkAuditResult, TopicalAuthorityScore, PublicationPlan, HubSpokeMetric, AnchorTextMetric, FreshnessMetric, ContentIntegrityResult, ContextualBridgeLink, FoundationPage, NavigationStructure, FoundationPageType } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import React from 'react';

// --- Local Algorithmic Checks (The "Quality Engine") ---

/**
 * Calculates the Hub-Spoke ratio for Core Topics.
 * Holistic SEO Rule: 1 Core should have ~7 Spokes.
 */
const calculateHubSpokeMetrics = (topics: EnrichedTopic[]): HubSpokeMetric[] => {
    const coreTopics = topics.filter(t => t.type === 'core');
    const metrics: HubSpokeMetric[] = [];

    coreTopics.forEach(core => {
        const spokeCount = topics.filter(t => t.parent_topic_id === core.id).length;
        let status: HubSpokeMetric['status'] = 'OPTIMAL';

        if (spokeCount < 4) {
            status = 'UNDER_SUPPORTED';
        } else if (spokeCount > 15) {
            status = 'DILUTED';
        }

        metrics.push({
            hubId: core.id,
            hubTitle: core.title,
            spokeCount,
            status
        });
    });

    return metrics;
};

/**
 * Audits anchor text diversity across all generated briefs.
 * Rule: Do not use the same anchor text > 3 times for the same link (or generally).
 */
const calculateAnchorTextMetrics = (briefs: Record<string, ContentBrief> | undefined): AnchorTextMetric[] => {
    if (!briefs) return [];

    const anchorCounts: Record<string, number> = {};

    Object.values(briefs).forEach(brief => {
        const bridge = brief.contextualBridge;
        let links: ContextualBridgeLink[] = [];

        if (Array.isArray(bridge)) {
            links = bridge;
        } else if (bridge && typeof bridge === 'object' && 'links' in bridge) {
            links = bridge.links;
        }

        links.forEach(link => {
            const text = link.anchorText.toLowerCase().trim();
            anchorCounts[text] = (anchorCounts[text] || 0) + 1;
        });
    });

    const metrics: AnchorTextMetric[] = Object.entries(anchorCounts).map(([text, count]) => ({
        anchorText: text,
        count,
        isRepetitive: count > 3
    })).sort((a, b) => b.count - a.count); // Sort by most frequent

    return metrics;
};

/**
 * Calculates content decay based on freshness profile.
 * Rule: Content must be updated based on its profile (Frequent vs Evergreen).
 */
const calculateFreshnessMetrics = (topics: EnrichedTopic[]): FreshnessMetric[] => {
    return topics.map(topic => {
        // Default decay if no last_audited/created date is tracked (using mocked logic for now)
        // In a real app, we'd compare Date.now() vs topic.last_updated_at
        // For this implementation, we trust the `decay_score` if populated, or simulate based on type
        
        let decay = topic.decay_score || 100; 
        
        // Simulation logic if no score exists:
        if (topic.decay_score === undefined) {
             // Assume newly created topics are fresh (100)
             decay = 100;
        }

        return {
            topicId: topic.id,
            title: topic.title,
            freshness: topic.freshness,
            decayScore: decay
        };
    }).filter(m => m.decayScore < 80); // Only return items that are starting to decay
};

// --- Foundation Pages Validation ---

interface FoundationPageIssue {
    pageType: FoundationPageType;
    missingFields: string[];
}

interface FoundationValidationResult {
    missingPages: FoundationPageType[];
    incompletePages: FoundationPageIssue[];
    suggestions: string[];
    issues: ValidationIssue[];
}

const REQUIRED_FOUNDATION_PAGES: FoundationPageType[] = ['homepage', 'about', 'contact', 'privacy', 'terms'];

/**
 * Validates foundation pages completeness and quality
 */
export const validateFoundationPages = (foundationPages: FoundationPage[]): FoundationValidationResult => {
    const result: FoundationValidationResult = {
        missingPages: [],
        incompletePages: [],
        suggestions: [],
        issues: []
    };

    // Filter out deleted pages
    const activePages = foundationPages.filter(p => !p.deleted_at);
    const pageTypes = activePages.map(p => p.page_type);

    // Check for missing required pages
    REQUIRED_FOUNDATION_PAGES.forEach(requiredType => {
        if (!pageTypes.includes(requiredType)) {
            result.missingPages.push(requiredType);
        }
    });

    if (result.missingPages.length > 0) {
        result.issues.push({
            rule: 'Foundation Page Completeness',
            message: `Missing required foundation pages: ${result.missingPages.join(', ')}`,
            severity: 'WARNING',
            offendingTopics: result.missingPages
        });
        result.suggestions.push(`Add missing pages: ${result.missingPages.join(', ')}`);
    }

    // Check each active page for completeness
    activePages.forEach(page => {
        const missingFields: string[] = [];

        if (!page.title || page.title.trim() === '') {
            missingFields.push('title');
        }
        if (!page.meta_description || page.meta_description.trim() === '') {
            missingFields.push('meta_description');
        }
        if (!page.h1_template || page.h1_template.trim() === '') {
            missingFields.push('h1_template');
        }
        if (!page.schema_type) {
            missingFields.push('schema_type');
        }

        // Homepage and About should have NAP data
        if ((page.page_type === 'homepage' || page.page_type === 'about') && !page.nap_data) {
            missingFields.push('nap_data');
        }

        // Check for sections
        if (!page.sections || page.sections.length === 0) {
            missingFields.push('sections');
        }

        if (missingFields.length > 0) {
            result.incompletePages.push({
                pageType: page.page_type as FoundationPageType,
                missingFields
            });
            result.issues.push({
                rule: 'Foundation Page Completeness',
                message: `${page.page_type} page is missing: ${missingFields.join(', ')}`,
                severity: 'SUGGESTION',
                offendingTopics: [page.page_type]
            });
        }
    });

    // Add suggestions based on issues found
    if (result.incompletePages.length > 0) {
        const pagesNeedingNap = result.incompletePages.filter(p => p.missingFields.includes('nap_data'));
        if (pagesNeedingNap.length > 0) {
            result.suggestions.push('Add NAP (Name, Address, Phone) data for better local SEO');
        }

        const pagesNeedingMeta = result.incompletePages.filter(p => p.missingFields.includes('meta_description'));
        if (pagesNeedingMeta.length > 0) {
            result.suggestions.push('Complete meta descriptions for all foundation pages');
        }

        const pagesNeedingSections = result.incompletePages.filter(p => p.missingFields.includes('sections'));
        if (pagesNeedingSections.length > 0) {
            result.suggestions.push('Add content sections to define page structure');
        }
    }

    return result;
};

// --- Navigation Validation ---

interface NavigationValidationResult {
    headerLinkCount: number;
    headerLinkLimit: number;
    footerLinkCount: number;
    footerLinkLimit: number;
    missingInHeader: string[];
    missingInFooter: string[];
    suggestions: string[];
    issues: ValidationIssue[];
}

/**
 * Validates navigation structure against best practices
 */
export const validateNavigation = (
    navigation: NavigationStructure | null,
    foundationPages: FoundationPage[]
): NavigationValidationResult => {
    const result: NavigationValidationResult = {
        headerLinkCount: 0,
        headerLinkLimit: 10,
        footerLinkCount: 0,
        footerLinkLimit: 30,
        missingInHeader: [],
        missingInFooter: [],
        suggestions: [],
        issues: []
    };

    if (!navigation) {
        result.issues.push({
            rule: 'Navigation Structure',
            message: 'No navigation structure defined. Consider creating header and footer navigation.',
            severity: 'SUGGESTION'
        });
        result.suggestions.push('Create navigation structure for better site architecture');
        return result;
    }

    // Check header links
    result.headerLinkLimit = navigation.max_header_links || 10;
    result.headerLinkCount = navigation.header?.primary_nav?.length || 0;

    if (result.headerLinkCount > result.headerLinkLimit) {
        result.issues.push({
            rule: 'Navigation Link Limits',
            message: `Header has ${result.headerLinkCount} links, exceeding the recommended limit of ${result.headerLinkLimit}`,
            severity: 'WARNING'
        });
        result.suggestions.push(`Reduce header navigation to ${result.headerLinkLimit} or fewer links`);
    }

    // Check footer links
    result.footerLinkLimit = navigation.max_footer_links || 30;
    const footerSectionLinks = navigation.footer?.sections?.reduce((acc: number, section: any) => {
        return acc + (section.links?.length || 0);
    }, 0) || 0;
    const legalLinks = navigation.footer?.legal_links?.length || 0;
    result.footerLinkCount = footerSectionLinks + legalLinks;

    if (result.footerLinkCount > result.footerLinkLimit) {
        result.issues.push({
            rule: 'Navigation Link Limits',
            message: `Footer has ${result.footerLinkCount} links, exceeding the recommended limit of ${result.footerLinkLimit}`,
            severity: 'WARNING'
        });
        result.suggestions.push(`Reduce footer links to ${result.footerLinkLimit} or fewer`);
    }

    // Check if homepage is in header
    const headerLinks = navigation.header?.primary_nav || [];
    const homepageInHeader = headerLinks.some((link: any) =>
        link.slug === '/' || link.slug === '' || link.text?.toLowerCase() === 'home'
    );
    if (!homepageInHeader && headerLinks.length > 0) {
        result.missingInHeader.push('homepage');
        result.issues.push({
            rule: 'Navigation Essential Links',
            message: 'Homepage link is missing from header navigation',
            severity: 'SUGGESTION'
        });
    }

    // Check if legal pages are in footer
    const activePages = foundationPages.filter(p => !p.deleted_at);
    const hasPrivacyPage = activePages.some(p => p.page_type === 'privacy');
    const hasTermsPage = activePages.some(p => p.page_type === 'terms');
    const footerLegalLinks = navigation.footer?.legal_links || [];

    if (hasPrivacyPage) {
        const privacyInFooter = footerLegalLinks.some((link: any) =>
            link.slug?.includes('privacy') || link.text?.toLowerCase().includes('privacy')
        );
        if (!privacyInFooter) {
            result.missingInFooter.push('privacy');
        }
    }

    if (hasTermsPage) {
        const termsInFooter = footerLegalLinks.some((link: any) =>
            link.slug?.includes('terms') || link.text?.toLowerCase().includes('terms')
        );
        if (!termsInFooter) {
            result.missingInFooter.push('terms');
        }
    }

    if (result.missingInFooter.length > 0) {
        result.issues.push({
            rule: 'Navigation Essential Links',
            message: `Legal pages missing from footer: ${result.missingInFooter.join(', ')}`,
            severity: 'SUGGESTION'
        });
        result.suggestions.push('Add legal page links (privacy, terms) to footer');
    }

    // Check NAP display for local businesses
    if (navigation.footer?.nap_display === false) {
        result.suggestions.push('Consider enabling NAP display in footer for local SEO');
    }

    return result;
};

// --- Main Exported Functions ---

export const analyzeGscDataForOpportunities = (
    gscRows: GscRow[], knowledgeGraph: KnowledgeGraph, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<GscOpportunity[]> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.analyzeGscDataForOpportunities(gscRows, knowledgeGraph, businessInfo, dispatch);
        case 'anthropic': return anthropicService.analyzeGscDataForOpportunities(gscRows, knowledgeGraph, businessInfo, dispatch);
        case 'perplexity': return perplexityService.analyzeGscDataForOpportunities(gscRows, knowledgeGraph, businessInfo, dispatch);
        case 'openrouter': return openRouterService.analyzeGscDataForOpportunities(gscRows, knowledgeGraph, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.analyzeGscDataForOpportunities(gscRows, knowledgeGraph, businessInfo, dispatch);
    }
};

export const validateTopicalMap = async (
    topics: EnrichedTopic[],
    pillars: SEOPillars,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>,
    briefs?: Record<string, ContentBrief>,
    foundationPages?: FoundationPage[],
    navigation?: NavigationStructure | null
): Promise<ValidationResult> => {
    // 1. Run AI Validation (Semantic Checks)
    let aiResult: ValidationResult;
    switch (businessInfo.aiProvider) {
        case 'openai': aiResult = await openAiService.validateTopicalMap(topics, pillars, businessInfo, dispatch); break;
        case 'anthropic': aiResult = await anthropicService.validateTopicalMap(topics, pillars, businessInfo, dispatch); break;
        case 'perplexity': aiResult = await perplexityService.validateTopicalMap(topics, pillars, businessInfo, dispatch); break;
        case 'openrouter': aiResult = await openRouterService.validateTopicalMap(topics, pillars, businessInfo, dispatch); break;
        case 'gemini':
        default:
             aiResult = await geminiService.validateTopicalMap(topics, pillars, businessInfo, dispatch);
    }

    // 2. Run Local Algorithmic Checks (Holistic Metrics)
    const hubSpoke = calculateHubSpokeMetrics(topics);
    const anchorText = calculateAnchorTextMetrics(briefs);
    const contentFreshness = calculateFreshnessMetrics(topics);

    // 3. Run Foundation Pages and Navigation Validation (if provided)
    const foundationValidation = foundationPages ? validateFoundationPages(foundationPages) : null;
    const navigationValidation = (foundationPages && navigation !== undefined)
        ? validateNavigation(navigation, foundationPages)
        : null;

    // 4. Merge Results
    // Add algorithmic issues to the AI issues list
    const algorithmicIssues: ValidationIssue[] = [];

    hubSpoke.filter(m => m.status === 'UNDER_SUPPORTED').forEach(m => {
        algorithmicIssues.push({
            rule: 'Hub-Spoke Ratio (1:7)',
            message: `Core Topic "${m.hubTitle}" has only ${m.spokeCount} spokes. Target is 7. You need to expand this cluster.`,
            severity: 'CRITICAL', // Marked critical to force improvement
            offendingTopics: [m.hubTitle]
        });
    });

    hubSpoke.filter(m => m.status === 'DILUTED').forEach(m => {
        algorithmicIssues.push({
            rule: 'Hub-Spoke Ratio (1:7)',
            message: `Core Topic "${m.hubTitle}" has ${m.spokeCount} spokes. This may dilute authority or cause cannibalization.`,
            severity: 'WARNING',
            offendingTopics: [m.hubTitle]
        });
    });

    anchorText.filter(m => m.isRepetitive).forEach(m => {
        algorithmicIssues.push({
            rule: 'Anchor Text Variety',
            message: `The anchor text "${m.anchorText}" is used ${m.count} times. Repeated anchor text can trigger spam filters.`,
            severity: 'WARNING'
        });
    });

    // Add foundation page issues
    if (foundationValidation) {
        algorithmicIssues.push(...foundationValidation.issues);
    }

    // Add navigation issues
    if (navigationValidation) {
        algorithmicIssues.push(...navigationValidation.issues);
    }

    // Recalculate score based on algorithmic failures
    let scorePenalty = 0;
    algorithmicIssues.forEach(i => {
        if (i.severity === 'CRITICAL') scorePenalty += 15; // Higher penalty for ratio violation
        if (i.severity === 'WARNING') scorePenalty += 5;
        if (i.severity === 'SUGGESTION') scorePenalty += 1; // Minor penalty for suggestions
    });

    return {
        ...aiResult,
        overallScore: Math.max(0, aiResult.overallScore - scorePenalty),
        issues: [...aiResult.issues, ...algorithmicIssues],
        metrics: {
            hubSpoke,
            anchorText,
            contentFreshness
        },
        // Add foundation and navigation validation results
        foundationPageIssues: foundationValidation ? {
            missingPages: foundationValidation.missingPages,
            incompletePages: foundationValidation.incompletePages,
            suggestions: foundationValidation.suggestions
        } : undefined,
        navigationIssues: navigationValidation ? {
            headerLinkCount: navigationValidation.headerLinkCount,
            headerLinkLimit: navigationValidation.headerLinkLimit,
            footerLinkCount: navigationValidation.footerLinkCount,
            footerLinkLimit: navigationValidation.footerLinkLimit,
            missingInHeader: navigationValidation.missingInHeader,
            missingInFooter: navigationValidation.missingInFooter,
            suggestions: navigationValidation.suggestions
        } : undefined
    };
};

export const improveTopicalMap = (
    topics: EnrichedTopic[], issues: ValidationIssue[], businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<MapImprovementSuggestion> => {
     switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.improveTopicalMap(topics, issues, businessInfo, dispatch);
        case 'anthropic': return anthropicService.improveTopicalMap(topics, issues, businessInfo, dispatch);
        case 'perplexity': return perplexityService.improveTopicalMap(topics, issues, businessInfo, dispatch);
        case 'openrouter': return openRouterService.improveTopicalMap(topics, issues, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.improveTopicalMap(topics, issues, businessInfo, dispatch);
    }
};

export const analyzeSemanticRelationships = (
    topics: EnrichedTopic[], businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<SemanticAnalysisResult> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.analyzeSemanticRelationships(topics, businessInfo, dispatch);
        case 'anthropic': return anthropicService.analyzeSemanticRelationships(topics, businessInfo, dispatch);
        case 'perplexity': return perplexityService.analyzeSemanticRelationships(topics, businessInfo, dispatch);
        case 'openrouter': return openRouterService.analyzeSemanticRelationships(topics, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.analyzeSemanticRelationships(topics, businessInfo, dispatch);
    }
};

export const analyzeContextualCoverage = (
    businessInfo: BusinessInfo, topics: EnrichedTopic[], pillars: SEOPillars, dispatch: React.Dispatch<any>
): Promise<ContextualCoverageMetrics> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.analyzeContextualCoverage(businessInfo, topics, pillars, dispatch);
        case 'anthropic': return anthropicService.analyzeContextualCoverage(businessInfo, topics, pillars, dispatch);
        case 'perplexity': return perplexityService.analyzeContextualCoverage(businessInfo, topics, pillars, dispatch);
        case 'openrouter': return openRouterService.analyzeContextualCoverage(businessInfo, topics, pillars, dispatch);
        case 'gemini':
        default:
            return geminiService.analyzeContextualCoverage(businessInfo, topics, pillars, dispatch);
    }
};

export const auditInternalLinking = (
    topics: EnrichedTopic[], briefs: Record<string, ContentBrief>, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<InternalLinkAuditResult> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.auditInternalLinking(topics, briefs, businessInfo, dispatch);
        case 'anthropic': return anthropicService.auditInternalLinking(topics, briefs, businessInfo, dispatch);
        case 'perplexity': return perplexityService.auditInternalLinking(topics, briefs, businessInfo, dispatch);
        case 'openrouter': return openRouterService.auditInternalLinking(topics, briefs, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.auditInternalLinking(topics, briefs, businessInfo, dispatch);
    }
};

export const calculateTopicalAuthority = (
    topics: EnrichedTopic[], briefs: Record<string, ContentBrief>, knowledgeGraph: KnowledgeGraph, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<TopicalAuthorityScore> => {
    switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.calculateTopicalAuthority(topics, briefs, knowledgeGraph, businessInfo, dispatch);
        case 'anthropic': return anthropicService.calculateTopicalAuthority(topics, briefs, knowledgeGraph, businessInfo, dispatch);
        case 'perplexity': return perplexityService.calculateTopicalAuthority(topics, briefs, knowledgeGraph, businessInfo, dispatch);
        case 'openrouter': return openRouterService.calculateTopicalAuthority(topics, briefs, knowledgeGraph, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.calculateTopicalAuthority(topics, briefs, knowledgeGraph, businessInfo, dispatch);
    }
};

export const generatePublicationPlan = (
    topics: EnrichedTopic[], businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<PublicationPlan> => {
     switch (businessInfo.aiProvider) {
        case 'openai': return openAiService.generatePublicationPlan(topics, businessInfo, dispatch);
        case 'anthropic': return anthropicService.generatePublicationPlan(topics, businessInfo, dispatch);
        case 'perplexity': return perplexityService.generatePublicationPlan(topics, businessInfo, dispatch);
        case 'openrouter': return openRouterService.generatePublicationPlan(topics, businessInfo, dispatch);
        case 'gemini':
        default:
            return geminiService.generatePublicationPlan(topics, businessInfo, dispatch);
    }
};

/**
 * Classifies topics into Core Section (monetization) or Author Section (informational).
 * Also verifies topic type (core vs outer) and suggests reclassifications.
 * This is useful for repairing existing maps that were generated before proper topic_class assignment.
 */
export const classifyTopicSections = async (
    topics: EnrichedTopic[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<{ id: string, topic_class: 'monetization' | 'informational', suggestedType?: 'core' | 'outer' | null, suggestedParentTitle?: string | null, typeChangeReason?: string | null }[]> => {
    // Use Gemini as the default classifier as it's reliable
    // In the future, this could be provider-specific
    const result = await geminiService.classifyTopicSections(
        topics.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            type: t.type,
            parent_topic_id: t.parent_topic_id
        })),
        businessInfo,
        dispatch
    );
    return result;
};
