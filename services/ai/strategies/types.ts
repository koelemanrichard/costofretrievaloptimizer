
import { 
    BusinessInfo, 
    SEOPillars, 
    SemanticTriple, 
    EnrichedTopic, 
    ContentBrief, 
    ResponseCode, 
    ValidationIssue, 
    ExpansionMode,
    TopicViabilityResult,
    KnowledgeGraph
} from '../../../types';

export interface ContentStrategy {
    // Core Generation
    getInitialMapPrompt(pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string;
    getTopicExpansionPrompt(pillars: SEOPillars, coreTopic: EnrichedTopic, allTopics: EnrichedTopic[], kg: KnowledgeGraph, mode: ExpansionMode, userContext?: string): string;
    getTopicViabilityPrompt(topic: string, context: string): string;
    
    // Briefs & Content
    getBriefPrompt(topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, responseCode: ResponseCode): string;
    getDraftPrompt(brief: ContentBrief): string;
    
    // EAV & Semantic
    getEavPrompt(pillars: SEOPillars): string;
    getEavExpansionPrompt(pillars: SEOPillars, existingTriples: SemanticTriple[], count?: number): string;
    
    // Validation
    getValidationPrompt(topics: EnrichedTopic[], pillars: SEOPillars): string;
}
