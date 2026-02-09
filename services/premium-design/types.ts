// =============================================================================
// Premium Design Studio — Type Definitions
// =============================================================================

import type { DesignDNA, BrandDesignSystem } from '../../types/designDna';
import type { LayoutBlueprintOutput } from '../layout-engine/LayoutEngine';

export interface PremiumDesignSession {
  id: string;
  articleHtml: string;
  targetUrl: string;
  targetScreenshot: string;       // base64
  crawledCssTokens: CrawledCssTokens;
  iterations: DesignIteration[];
  currentIteration: number;
  status: 'capturing' | 'generating-css' | 'rendering' | 'validating' | 'iterating' | 'complete' | 'error';
  finalScore: number;
  finalCss: string;
  finalHtml: string;
  errorMessage?: string;
  designDna?: DesignDNA;                       // Deep visual analysis (180+ fields)
  brandDesignSystem?: BrandDesignSystem;        // Generated CSS system (5-pass AI)
  layoutBlueprint?: LayoutBlueprintOutput;      // Component-rich layout plan
}

export interface CrawledCssTokens {
  colors: { hex: string; usage: string; source: string }[];
  fonts: { family: string; weight: string; usage: string }[];
  cssVariables: Record<string, string>;
  borderRadius: string[];
  shadows: string[];
  spacingPatterns: string[];
  googleFontsUrl?: string | null;
}

export interface DesignIteration {
  iteration: number;
  css: string;
  screenshotBase64: string;
  validationResult: ValidationResult;
  durationMs: number;
}

export interface ValidationResult {
  overallScore: number;
  colorMatch: { score: number; notes: string };
  typographyMatch: { score: number; notes: string };
  spacingMatch: { score: number; notes: string };
  visualDepth: { score: number; notes: string };
  brandFit: { score: number; notes: string };
  layoutSophistication: { score: number; notes: string };
  cssFixInstructions: string[];
  passesThreshold: boolean;
}

export interface PremiumDesignConfig {
  targetScore: number;           // default 85
  maxIterations: number;         // default 3
  aiProvider: 'gemini' | 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
  apifyToken?: string;
}

export interface BusinessContext {
  industry: string;
  audience: string;
  articlePurpose: 'informational' | 'commercial' | 'transactional';
  ctaText?: string;
  ctaUrl?: string;
}

// =============================================================================
// Database Persistence
// =============================================================================

export interface SavedPremiumDesign {
  id: string;
  user_id: string;
  topic_id: string;
  brief_id?: string;
  map_id?: string;
  version: number;
  target_url: string;
  final_css: string;
  final_html: string;
  final_score: number;
  target_screenshot?: string;      // base64 (nullable to save space)
  output_screenshot?: string;      // base64 (nullable to save space)
  validation_result: ValidationResult | null;
  crawled_tokens: CrawledCssTokens | null;
  iterations_count: number;
  status: 'complete' | 'error';
  created_at: string;
  updated_at: string;
}
