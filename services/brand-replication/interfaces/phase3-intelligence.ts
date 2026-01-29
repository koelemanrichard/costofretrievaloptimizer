// services/brand-replication/interfaces/phase3-intelligence.ts

import type { BrandComponent } from './phase2-codegen';
import type { TopicalMap, ContentBrief, EnrichedTopic } from '../../../types';

export interface ContentContext {
  pillars: {
    centralEntity: string;
    sourceContext: string;
    centralSearchIntent: string;
  };
  topicalMap: {
    id: string;
    coreTopic: string;
    relatedTopics: string[];
    contentGaps: string[];
    targetAudience: string;
  };
  article: {
    id: string;
    title: string;
    fullContent: string;
    sections: ArticleSection[];
    keyEntities: string[];
    mainMessage: string;
    callToAction: string;
  };
}

export interface ArticleSection {
  id: string;
  heading: string;
  headingLevel: number;
  content: string;
  wordCount: number;
}

export interface SectionContext {
  section: ArticleSection;
  position: 'intro' | 'body' | 'conclusion';
  positionIndex: number;
  totalSections: number;
  precedingSections: string[];
  followingSections: string[];
}

export interface IntelligenceInput {
  brandId: string;
  articleId: string;
  contentContext: ContentContext;
  componentLibrary: BrandComponent[];
  topicalMap?: TopicalMap;
  brief?: ContentBrief;
  topic?: EnrichedTopic;
}

export interface SectionDesignDecision {
  sectionId: string;
  sectionHeading: string;
  component: string;
  componentId: string;
  variant: string;
  layout: {
    columns: 1 | 2 | 3 | 4;
    width: 'narrow' | 'medium' | 'wide' | 'full';
    emphasis: 'hero' | 'featured' | 'standard' | 'supporting' | 'minimal';
  };
  reasoning: string;
  semanticRole: string;
  contentMapping: {
    title?: string;
    items?: string[];
    ctaText?: string;
    ctaUrl?: string;
    highlightedText?: string;
    iconSuggestion?: string;
  };
  confidence: number;
}

export interface IntelligenceOutput {
  brandId: string;
  articleId: string;
  decisions: SectionDesignDecision[];
  overallStrategy: string;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export interface IntelligenceConfig {
  customPrompt?: string;
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  debug?: boolean;
  contextConfig: {
    includePillars: boolean;
    includeTopicalMap: boolean;
    includeFullArticle: boolean;
    includeSurroundingSections: boolean;
    maxContextTokens: number;
  };
  layoutOverrides?: Record<string, Partial<SectionDesignDecision['layout']>>;
}
