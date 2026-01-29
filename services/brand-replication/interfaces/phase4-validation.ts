// services/brand-replication/interfaces/phase4-validation.ts

import type { SectionDesignDecision } from './phase3-intelligence';
import type { BrandComponent } from './phase2-codegen';

export interface ValidationInput {
  brandId: string;
  articleId: string;
  renderedHtml: string;
  decisions: SectionDesignDecision[];
  componentLibrary: BrandComponent[];
  sourceScreenshots: string[];
}

export interface ScoreBreakdown {
  score: number;
  maxScore: number;
  percentage: number;
  details: string[];
  suggestions: string[];
}

export interface WowFactorItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
  passed: boolean;
  details?: string;
}

export interface ValidationOutput {
  brandId: string;
  articleId: string;
  scores: {
    brandMatch: ScoreBreakdown;
    designQuality: ScoreBreakdown;
    userExperience: ScoreBreakdown;
    overall: number;
  };
  wowFactorChecklist: WowFactorItem[];
  passesThreshold: boolean;
  suggestions: string[];
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export interface ValidationConfig {
  customPrompt?: string;
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  debug?: boolean;
  thresholds: {
    brandMatch: number;
    designQuality: number;
    userExperience: number;
    overall: number;
  };
  weights: {
    brandMatch: number;
    designQuality: number;
    userExperience: number;
  };
  wowFactorChecklist: Omit<WowFactorItem, 'passed' | 'details'>[];
}
