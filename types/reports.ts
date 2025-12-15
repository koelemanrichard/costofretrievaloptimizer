/**
 * Report Generation Types
 *
 * Type definitions for the business reporting system that generates
 * professional PDF/HTML reports for stakeholders.
 */

import {
  TopicalMap,
  ContentBrief,
  ContentGenerationJob,
  EnrichedTopic,
  SemanticTriple,
  SiteInventoryItem,
  TransitionStatus,
  ActionType
} from '../types';
import { SiteAuditResult } from '../services/ai/siteAudit/types';

// ============================================
// REPORT CONFIGURATION
// ============================================

export type ReportFormat = 'pdf' | 'html';

export type ReportType =
  | 'topical-map'
  | 'content-brief'
  | 'article-draft'
  | 'migration';

export interface BaseReportConfig {
  format: ReportFormat;
  includeCharts: boolean;
  includeLogo: boolean;
  includeTimestamp: boolean;
  customTitle?: string;
  customSubtitle?: string;
}

export interface TopicalMapReportConfig extends BaseReportConfig {
  type: 'topical-map';
  includeEavDetails: boolean;
  includeGapAnalysis: boolean;
  includeStrategicAlignment: boolean;
  includeNextSteps: boolean;
}

export interface ContentBriefReportConfig extends BaseReportConfig {
  type: 'content-brief';
  batchMode: boolean;
  selectedBriefIds?: string[];
  includeCompetitorAnalysis: boolean;
  includeLinkingStrategy: boolean;
  includeVisualRequirements: boolean;
}

export interface ArticleDraftReportConfig extends BaseReportConfig {
  type: 'article-draft';
  includeAuditDetails: boolean;
  includeSectionBreakdown: boolean;
  includeImprovementAreas: boolean;
}

export interface MigrationReportConfig extends BaseReportConfig {
  type: 'migration';
  includeImplementationGuide: boolean;
  includeRedirectMap: boolean;
  includeActionPlan: boolean;
  includeQualityChecklists: boolean;
  exportRedirectsCsv: boolean;
}

export type ReportConfig =
  | TopicalMapReportConfig
  | ContentBriefReportConfig
  | ArticleDraftReportConfig
  | MigrationReportConfig;

// ============================================
// TRANSFORMED REPORT DATA
// ============================================

/**
 * Business-friendly metric card for reports
 */
export interface MetricCard {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}

/**
 * Chart data for pie/donut charts
 */
export interface PieChartData {
  name: string;
  value: number;
  color: string;
  percentage?: number;
  [key: string]: unknown; // Index signature for Recharts compatibility
}

/**
 * Chart data for bar charts
 */
export interface BarChartData {
  name: string;
  value: number;
  label?: string;
  color?: string;
}

/**
 * Progress timeline item
 */
export interface TimelineItem {
  step: number;
  label: string;
  status: 'completed' | 'in-progress' | 'pending' | 'failed';
  description?: string;
  timestamp?: string;
}

/**
 * Priority matrix item (impact vs effort)
 */
export interface PriorityMatrixItem {
  id: string;
  label: string;
  impact: number; // 0-100
  effort: number; // 0-100
  category?: string;
}

/**
 * Action item for reports
 */
export interface ReportActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  status?: 'pending' | 'in-progress' | 'completed';
}

/**
 * Gap/issue item
 */
export interface GapItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  recommendation?: string;
}

// ============================================
// TOPICAL MAP REPORT DATA
// ============================================

export interface TopicalMapReportData {
  // Header info
  mapName: string;
  domain?: string;
  generatedAt: string;

  // Executive Summary
  executiveSummary: {
    headline: string;
    totalTopics: number;
    coreTopics: number;
    outerTopics: number;
    targetMarket: string;
    // The 3 pillars of Holistic SEO
    centralEntity: string;
    sourceContext: string;
    centralSearchIntent: string;
  };

  // Strategic Foundation - Why this matters for the business
  strategicFoundation: {
    // The 3 pillars explained for business readers
    pillars: {
      centralEntity: {
        value: string;
        explanation: string;
        businessImpact: string;
      };
      sourceContext: {
        value: string;
        explanation: string;
        businessImpact: string;
      };
      centralSearchIntent: {
        value: string;
        explanation: string;
        businessImpact: string;
      };
    };
    overallStrategy: string;
  };

  // Topic Hierarchy
  topicHierarchy: {
    distribution: PieChartData[];
    pillars: { name: string; topicCount: number; description?: string; }[];
    depth: number;
  };

  // Detailed Topic Tree (optional section)
  topicTree?: {
    coreTopics: {
      id: string;
      title: string;
      description: string;
      reasoning?: string;
      children: {
        id: string;
        title: string;
        description: string;
        reasoning?: string;
      }[];
    }[];
  };

  // Semantic Coverage
  semanticCoverage: {
    totalEavs: number;
    categoryBreakdown: BarChartData[];
    coverageScore: number;
    topAttributes: { attribute: string; count: number; }[];
    explanation: string;
  };

  // EAV Details (optional section)
  eavDetails?: {
    categorizedTree: {
      category: string;
      categoryDescription: string;
      eavs: {
        entity: string;
        attribute: string;
        value: string;
        importance: string;
      }[];
    }[];
    totalByCategory: { category: string; count: number; }[];
  };

  // Content Gaps
  gaps: GapItem[];

  // Strategic Alignment
  strategicAlignment: {
    centralEntityRelations: { topic: string; relation: string; explanation?: string; }[];
    alignmentScore: number;
  };

  // Business Decisions - What the reader needs to decide
  businessDecisions?: {
    title: string;
    description: string;
    options: string[];
    recommendation: string;
    impact: string;
  }[];

  // Next Steps
  nextSteps: ReportActionItem[];

  // Metrics
  metrics: MetricCard[];
}

// ============================================
// CONTENT BRIEF REPORT DATA
// ============================================

export interface ContentBriefReportData {
  // Header
  briefTitle: string;
  targetKeyword: string;
  searchIntent: string;
  generatedAt: string;

  // Article Overview
  overview: {
    headline: string;
    metaDescription: string;
    keyTakeaways: string[];
    whyThisMatters: string;
  };

  // Strategic Context - Why this article exists
  strategicContext: {
    perspectives: string[];
    methodologyNote: string;
    queryTypeFormat: string;
    userJourneyPrediction: string;
    whyThisMatters: string;
  };

  // Featured Snippet Target
  featuredSnippetTarget?: {
    question: string;
    targetType: string;
    answerLengthTarget: number;
    requiredPredicates: string[];
    whyThisMatters: string;
  };

  // Discourse Anchors - for transitions
  discourseAnchors: {
    anchors: string[];
    whyThisMatters: string;
  };

  // SERP Landscape
  serpAnalysis: {
    avgWordCount: number;
    avgHeadings: number;
    competitorCount: number;
    competitorComparison: BarChartData[];
    peopleAlsoAsk: string[];
    contentGaps: string[];
    whyThisMatters: string;
  };

  // Target Structure - Enhanced with section details
  outline: {
    sections: {
      level: number;
      title: string;
      formatCode?: string;
      hint?: string;
      methodologyNote?: string;
      relatedQueries?: string[];
    }[];
    estimatedWordCount: number;
    estimatedReadTime: string;
    whyThisMatters: string;
  };

  // Internal Linking - Enhanced with context
  linkingStrategy: {
    inboundLinks: { title: string; url?: string; anchorText?: string; contextHint?: string; }[];
    outboundLinks: { title: string; url?: string; anchorText?: string; contextHint?: string; }[];
    semanticBridges: string[];
    whyThisMatters: string;
  };

  // Visual Requirements - Enhanced
  visualRequirements: {
    featuredImagePrompt: string;
    inlineImages: {
      description: string;
      altText: string;
      type?: string;
      dimensions?: string;
      captionData?: string;
    }[];
    totalImageCount: number;
    whyThisMatters: string;
  };

  // Semantic Requirements (EAVs to cover)
  semanticRequirements: {
    eavsToInclude: {
      entity: string;
      attribute: string;
      value: string;
      importance: string;
    }[];
    totalEavs: number;
    whyThisMatters: string;
  };

  // Quality Checklist - Comprehensive
  checklist: {
    category: string;
    items: {
      item: string;
      required: boolean;
      reason: string;
    }[];
  }[];

  // Metrics
  metrics: MetricCard[];
}

// ============================================
// ARTICLE DRAFT REPORT DATA
// ============================================

export interface ArticleDraftReportData {
  // Header
  articleTitle: string;
  briefTitle: string;
  targetKeyword: string;
  searchIntent: string;
  generatedAt: string;

  // Executive Summary
  executiveSummary: {
    headline: string;
    overallAssessment: string;
    readinessScore: number;
    readinessLevel: 'publish-ready' | 'minor-edits' | 'needs-review' | 'not-ready';
    keyStrengths: string[];
    criticalIssues: string[];
    whyThisMatters: string;
  };

  // Generation Summary
  generationSummary: {
    headline: string;
    totalPasses: number;
    completedPasses: number;
    qualityScore: number;
    timeline: TimelineItem[];
    whyThisMatters: string;
  };

  // Article Content (for review)
  articleContent: {
    metaTitle: string;
    metaDescription: string;
    fullContent: string;
    contentExcerpt: string; // First 500 chars
    tableOfContents: { level: number; title: string; anchor: string }[];
    whyThisMatters: string;
  };

  // Image Placeholders
  imagePlaceholders: {
    images: {
      id: string;
      type: string;
      description: string;
      altText: string;
      caption?: string;
      placementSection: string;
      status: 'placeholder' | 'generated' | 'uploaded';
      thumbnailUrl?: string;
    }[];
    totalRequired: number;
    totalPlaced: number;
    whyThisMatters: string;
  };

  // Internal Linking
  internalLinking: {
    linksInContent: { anchor: string; targetTitle: string; targetUrl: string; context: string }[];
    suggestedLinks: { targetTitle: string; anchorSuggestion: string; reason: string }[];
    missingLinks: { targetTitle: string; reason: string }[];
    totalLinks: number;
    recommendedMinimum: number;
    whyThisMatters: string;
  };

  // Facts to Verify
  factsToVerify: {
    facts: {
      claim: string;
      source?: string;
      verificationStatus: 'verified' | 'needs-check' | 'unverified';
      priority: 'critical' | 'high' | 'medium' | 'low';
      reason: string;
    }[];
    totalFacts: number;
    verifiedCount: number;
    whyThisMatters: string;
  };

  // Validation Rules Applied
  validationRules: {
    rules: {
      ruleName: string;
      businessName: string;
      description: string;
      passed: boolean;
      score: number;
      details: string;
      recommendation?: string;
      impact: string;
    }[];
    passedCount: number;
    totalRules: number;
    whyThisMatters: string;
  };

  // Semantic Analysis
  semanticAnalysis: {
    eavCoverage: number;
    coveredAttributes: { attribute: string; value: string; location: string }[];
    missingAttributes: { attribute: string; value: string; suggestion: string }[];
    categoryBreakdown: BarChartData[];
    whyThisMatters: string;
  };

  // Content Metrics
  contentMetrics: {
    wordCount: number;
    targetWordCount: number;
    headingCount: number;
    paragraphCount: number;
    imageCount: number;
    linkCount: number;
    readingTime: string;
    readabilityScore?: number;
    whyThisMatters: string;
  };

  // Section Breakdown
  sectionBreakdown: {
    sections: {
      sectionTitle: string;
      level: number;
      wordCount: number;
      qualityIndicators: {
        hasIntro: boolean;
        hasConclusion: boolean;
        hasExamples: boolean;
        hasData: boolean;
      };
      issues: string[];
      suggestions: string[];
    }[];
    whyThisMatters: string;
  };

  // Publication Checklist
  publicationChecklist: {
    categories: {
      category: string;
      items: {
        item: string;
        status: 'complete' | 'incomplete' | 'na';
        required: boolean;
        reason: string;
        action?: string;
      }[];
    }[];
    completionPercentage: number;
    blockers: string[];
    whyThisMatters: string;
  };

  // Improvement Areas
  improvements: ReportActionItem[];

  // Metrics
  metrics: MetricCard[];
}

// ============================================
// MIGRATION REPORT DATA
// ============================================

export interface MigrationReportData {
  // Header
  domain: string;
  projectName: string;
  generatedAt: string;

  // Executive Summary
  executiveSummary: {
    headline: string;
    pagesAnalyzed: number;
    actionsRequired: number;
    healthScore: number;
    keyFindings: string[];
    estimatedImpact: string[];
  };

  // Current State
  currentState: {
    indexedPages: number;
    averageQualityScore: number;
    statusDistribution: PieChartData[];
    scoreDistribution: BarChartData[];
  };

  // Technical Health
  technicalHealth: {
    overallScore: number;
    issuesBySeverity: PieChartData[];
    topIssues: GapItem[];
  };

  // Semantic Analysis
  semanticAnalysis: {
    alignmentScore: number;
    alignedPages: number;
    misalignedPages: number;
    misalignmentReasons: string[];
  };

  // Content Structure
  contentStructure: {
    hubCount: number;
    spokeCount: number;
    orphanCount: number;
    hubSpokeRatio: number;
    structureChart: PieChartData[];
  };

  // Migration Decisions
  migrationDecisions: {
    summary: {
      keep: number;
      rewrite: number;
      merge: number;
      redirect: number;
      prune: number;
      canonicalize: number;
    };
    decisionChart: PieChartData[];
    pageDecisions: {
      url: string;
      title: string;
      decision: ActionType;
      confidence: number;
      reason: string;
    }[];
  };

  // Action Plan
  actionPlan: {
    phases: {
      phase: number;
      name: string;
      description: string;
      tasks: ReportActionItem[];
    }[];
    priorityMatrix: PriorityMatrixItem[];
  };

  // Implementation Guide
  implementationGuide: {
    redirectMap: {
      source: string;
      target: string;
      type: '301' | 'Canonical';
    }[];
    technicalNotes: string[];
    codeSnippets: { language: string; code: string; description: string; }[];
  };

  // Quality Assurance
  qualityAssurance: {
    preMigrationChecklist: { item: string; required: boolean; }[];
    postMigrationChecklist: { item: string; required: boolean; }[];
  };

  // Metrics
  metrics: MetricCard[];
}

// ============================================
// BUSINESS LANGUAGE TRANSLATIONS
// ============================================

/**
 * Mapping of technical terms to business-friendly language
 */
export const BUSINESS_LANGUAGE: Record<string, string> = {
  // Technical terms
  'EAV Coverage': 'Topic Attribute Completeness',
  'Semantic Distance': 'Content Relevance Score',
  'Hub-Spoke Ratio': 'Content Organization Efficiency',
  'COR Score': 'Search Visibility Score',
  'Audit Rule Violations': 'Quality Improvement Opportunities',
  'Canonical Issues': 'Duplicate Content Risks',
  'Orphan Pages': 'Disconnected Content',
  'Link Equity Flow': 'Authority Distribution',

  // Pass names (content generation)
  'Pass 1': 'Initial Draft Creation',
  'Pass 2': 'Header Optimization',
  'Pass 3': 'List & Table Enhancement',
  'Pass 4': 'Visual Element Placement',
  'Pass 5': 'Linguistic Refinement',
  'Pass 6': 'Flow & Transitions',
  'Pass 7': 'Introduction Synthesis',
  'Pass 8': 'Quality Audit',
  'Pass 9': 'Schema Generation',

  // Status terms
  'AUDIT_PENDING': 'Awaiting Review',
  'GAP_ANALYSIS': 'Analyzing Gaps',
  'ACTION_REQUIRED': 'Action Needed',
  'IN_PROGRESS': 'In Progress',
  'OPTIMIZED': 'Complete',

  // Action terms
  'KEEP': 'Retain As-Is',
  'REWRITE': 'Content Rewrite',
  'MERGE': 'Consolidate',
  'REDIRECT_301': 'Permanent Redirect',
  'PRUNE_410': 'Remove',
  'CANONICALIZE': 'Set Canonical',

  // EAV Categories
  'CORE_DEFINITION': 'Core Definitions',
  'SEARCH_DEMAND': 'Search-Driven',
  'COMPETITIVE_EXPANSION': 'Competitive Edge',
  'COMPOSITE': 'Combined Concepts',
  'UNIQUE': 'Unique Differentiators',
  'ROOT': 'Foundation Elements',
  'RARE': 'Specialized Content',
  'COMMON': 'Standard Topics'
};

/**
 * Get business-friendly term
 */
export const getBusinessTerm = (technical: string): string => {
  return BUSINESS_LANGUAGE[technical] || technical;
};

// ============================================
// REPORT GENERATION STATE
// ============================================

export interface ReportGenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
}

// ============================================
// CHART COLOR SCHEMES
// ============================================

export const CHART_COLORS = {
  primary: ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'],
  semantic: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    neutral: '#6B7280'
  },
  pastel: ['#FDA4AF', '#FDBA74', '#FDE047', '#86EFAC', '#7DD3FC', '#C4B5FD'],
  professional: ['#1E40AF', '#3730A3', '#4F46E5', '#7C3AED', '#A855F7', '#D946EF']
};

export const DECISION_COLORS: Record<ActionType, string> = {
  'KEEP': '#22C55E',
  'REWRITE': '#F59E0B',
  'MERGE': '#3B82F6',
  'REDIRECT_301': '#8B5CF6',
  'PRUNE_410': '#EF4444',
  'CANONICALIZE': '#6B7280'
};

export const STATUS_COLORS: Record<TransitionStatus, string> = {
  'AUDIT_PENDING': '#6B7280',
  'GAP_ANALYSIS': '#F59E0B',
  'ACTION_REQUIRED': '#EF4444',
  'IN_PROGRESS': '#3B82F6',
  'OPTIMIZED': '#22C55E'
};
