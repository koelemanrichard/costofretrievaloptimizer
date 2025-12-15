
import { ContentStrategy } from './types';
import { BusinessInfo, SEOPillars, SemanticTriple, EnrichedTopic, ContentBrief, ResponseCode, ValidationIssue, ExpansionMode, KnowledgeGraph } from '../../../types';
import * as prompts from '../../../config/prompts';

export class BaseStrategy implements ContentStrategy {
    constructor(protected info: BusinessInfo) {}

    protected getBusinessContext(): string {
        return `
Business Context:
- Domain: ${this.info.domain}
- Industry: ${this.info.industry}
- Business Model: ${this.info.model}
- Website Type: ${this.info.websiteType || 'INFORMATIONAL'}
- Target Audience: ${this.info.audience}
- Unique Value Proposition: ${this.info.valueProp}
- Expertise Level: ${this.info.expertise}
- Seed Keyword: ${this.info.seedKeyword}
- Market: ${this.info.targetMarket} (${this.info.language})
${this.info.authorProfile ? `- Author: ${this.info.authorProfile.name} (${this.info.authorProfile.stylometry})` : ''}
`;
    }

    getInitialMapPrompt(pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string {
        return prompts.GENERATE_INITIAL_TOPICAL_MAP_PROMPT(this.info, pillars, eavs, competitors);
    }

    getTopicExpansionPrompt(pillars: SEOPillars, coreTopic: EnrichedTopic, allTopics: EnrichedTopic[], kg: KnowledgeGraph, mode: ExpansionMode, userContext?: string): string {
        return prompts.EXPAND_CORE_TOPIC_PROMPT(this.info, pillars, coreTopic, allTopics, kg, mode, userContext);
    }

    getTopicViabilityPrompt(topic: string, context: string): string {
        return prompts.ANALYZE_TOPIC_VIABILITY_PROMPT(topic, context, this.info);
    }

    getBriefPrompt(topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, responseCode: ResponseCode): string {
        return prompts.GENERATE_CONTENT_BRIEF_PROMPT(this.info, topic, allTopics, pillars, kg, responseCode);
    }

    getDraftPrompt(brief: ContentBrief): string {
        return prompts.GENERATE_ARTICLE_DRAFT_PROMPT(brief, this.info);
    }

    getEavPrompt(pillars: SEOPillars): string {
        return prompts.DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT(this.info, pillars);
    }

    getEavExpansionPrompt(pillars: SEOPillars, existingTriples: SemanticTriple[], count: number = 15): string {
        return prompts.EXPAND_SEMANTIC_TRIPLES_PROMPT(this.info, pillars, existingTriples, count);
    }

    getValidationPrompt(topics: EnrichedTopic[], pillars: SEOPillars): string {
        return prompts.VALIDATE_TOPICAL_MAP_PROMPT(topics, pillars, this.info);
    }
}
