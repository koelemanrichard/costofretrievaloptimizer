
import { BusinessInfo, GscRow, KnowledgeGraph, GscOpportunity, EnrichedTopic, SEOPillars, ValidationResult, ValidationIssue, MapImprovementSuggestion, SemanticAnalysisResult, ContextualCoverageMetrics, ContentBrief, InternalLinkAuditResult, TopicalAuthorityScore, PublicationPlan, HubSpokeMetric, AnchorTextMetric, FreshnessMetric, ContentIntegrityResult, ContextualBridgeLink } from '../../types';
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
    topics: EnrichedTopic[], pillars: SEOPillars, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>, briefs?: Record<string, ContentBrief>
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

    // 3. Merge Results
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

    // Recalculate score based on algorithmic failures
    let scorePenalty = 0;
    algorithmicIssues.forEach(i => {
        if (i.severity === 'CRITICAL') scorePenalty += 15; // Higher penalty for ratio violation
        if (i.severity === 'WARNING') scorePenalty += 5;
    });

    return {
        ...aiResult,
        overallScore: Math.max(0, aiResult.overallScore - scorePenalty),
        issues: [...aiResult.issues, ...algorithmicIssues],
        metrics: {
            hubSpoke,
            anchorText,
            contentFreshness
        }
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
