
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { EnrichedTopic, ContentBrief, DashboardMetrics, KnowledgeGraph } from '../types';

export const slugify = (text: string): string => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

export const cleanSlug = (parentSlug: string, childTitle: string): string => {
    if (!parentSlug || !childTitle) return slugify(childTitle);
    
    const parentParts = parentSlug.split('/').filter(p => p);
    const parentLastPart = parentParts[parentParts.length - 1] || '';
    
    // Slugify the child title
    let childSlug = slugify(childTitle);
    
    // Heuristic: Remove the parent's slug words from the start of the child slug if they exist to prevent redundancy
    // e.g. parent: "visa-services", child: "visa-services-cost" -> "cost"
    // This aligns with Rule II.E of the Holistic SEO framework.
    if (parentLastPart && childSlug.startsWith(parentLastPart + '-')) {
        childSlug = childSlug.replace(parentLastPart + '-', '');
    }
    
    return childSlug;
};

export const sanitizeForUI = (text: string | null | undefined): string => {
    if (typeof document === 'undefined' || !text) return text || ''; // Return empty string for null/undefined or if not in browser
    const element = document.createElement('div');
    element.innerText = text;
    return element.innerHTML;
};

interface MetricsInput {
    briefs: Record<string, ContentBrief>;
    knowledgeGraph: KnowledgeGraph | null;
    allTopics: EnrichedTopic[];
}

export const calculateDashboardMetrics = ({ briefs, knowledgeGraph, allTopics }: MetricsInput): DashboardMetrics => {
    const totalTopics = allTopics.length;
    const briefsGenerated = Object.keys(briefs).length;

    const briefGenerationProgress = totalTopics > 0 ? (briefsGenerated / totalTopics) * 100 : 0;
    
    // Placeholder for knowledge domain coverage
    const knowledgeDomainCoverage = knowledgeGraph ? (knowledgeGraph.getNodes().size / (totalTopics + 1)) * 50 : 10;
    
    const totalEAVs = Object.values(briefs).reduce((sum, brief) => sum + (brief.contextualVectors?.length || 0), 0);
    const avgEAVsPerBrief = briefsGenerated > 0 ? totalEAVs / briefsGenerated : 0;

    // Placeholder for contextual flow score
    const contextualFlowScore = (avgEAVsPerBrief / 10) * 100 + (briefGenerationProgress / 10);
    
    return {
        briefGenerationProgress: Math.min(100, Math.round(briefGenerationProgress)),
        knowledgeDomainCoverage: Math.min(100, Math.round(knowledgeDomainCoverage)),
        avgEAVsPerBrief: parseFloat(avgEAVsPerBrief.toFixed(1)),
        contextualFlowScore: Math.min(100, Math.round(contextualFlowScore)),
    };
};
