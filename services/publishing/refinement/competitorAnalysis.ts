/**
 * Competitor Design Analysis Service
 *
 * Analyzes competitor websites to extract design patterns and insights
 * that can inform AI layout decisions.
 *
 * @module services/publishing/refinement/competitorAnalysis
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  VisualStyle,
  ComponentType,
} from '../architect/blueprintTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface CompetitorDesignAnalysis {
  id: string;
  projectId: string;
  competitorUrl: string;
  competitorName?: string;
  analysisDate: string;
  designPatterns: {
    visualStyle: VisualStyle;
    colorScheme: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
    typography: {
      headingFont: string;
      bodyFont: string;
      headingWeight: string;
    };
    layoutPatterns: string[];
    componentUsage: Partial<Record<ComponentType, number>>;
    ctaStyle: {
      intensity: 'subtle' | 'moderate' | 'prominent';
      placements: string[];
      buttonStyle: string;
    };
    spacing: 'dense' | 'balanced' | 'spacious';
    strengths: string[];
    weaknesses: string[];
  };
}

export interface CompetitorInsights {
  commonPatterns: string[];
  differentiationOpportunities: string[];
  industryNorms: {
    preferredVisualStyle: VisualStyle;
    commonComponents: ComponentType[];
    ctaIntensity: 'subtle' | 'moderate' | 'prominent';
    colorTrends: string[];
  };
  recommendations: {
    adopt: string[];
    avoid: string[];
    differentiate: string[];
  };
}

export interface ExtractedDesignFeatures {
  colors: string[];
  fonts: string[];
  layoutStructure: string;
  componentTypes: string[];
  ctaCount: number;
  heroStyle?: string;
  navigationStyle?: string;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

let supabase: SupabaseClient | null = null;

export function initCompetitorAnalysisClient(url: string, anonKey: string): void {
  supabase = createClient(url, anonKey);
}

function getClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Competitor analysis client not initialized. Call initCompetitorAnalysisClient first.');
  }
  return supabase;
}

// ============================================================================
// DESIGN EXTRACTION (Heuristic-based)
// ============================================================================

/**
 * Extract design features from HTML content
 * This is a heuristic-based approach that analyzes HTML structure
 */
export function extractDesignFeatures(html: string): ExtractedDesignFeatures {
  const features: ExtractedDesignFeatures = {
    colors: [],
    fonts: [],
    layoutStructure: 'unknown',
    componentTypes: [],
    ctaCount: 0,
  };

  // Extract colors from inline styles and common patterns
  const colorMatches = html.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|rgba\([^)]+\)/gi);
  if (colorMatches) {
    features.colors = [...new Set(colorMatches)].slice(0, 10);
  }

  // Extract font families
  const fontMatches = html.match(/font-family:\s*([^;]+)/gi);
  if (fontMatches) {
    features.fonts = [...new Set(fontMatches.map(f => f.replace('font-family:', '').trim()))].slice(0, 5);
  }

  // Detect layout structure
  if (html.includes('sidebar') || html.includes('aside')) {
    features.layoutStructure = 'sidebar';
  } else if (html.includes('grid') || html.includes('masonry')) {
    features.layoutStructure = 'grid';
  } else if (html.includes('flex') || html.includes('flexbox')) {
    features.layoutStructure = 'flex';
  } else {
    features.layoutStructure = 'linear';
  }

  // Detect component types
  const componentPatterns: [string, string][] = [
    ['faq', 'accordion|faq|frequently'],
    ['timeline', 'timeline|steps|process'],
    ['testimonial', 'testimonial|review|quote'],
    ['hero', 'hero|banner|jumbotron'],
    ['card', 'card|tile|feature'],
    ['cta', 'cta|call-to-action|button.*primary'],
    ['table', '<table|comparison'],
    ['list', 'bullet|checklist|icon-list'],
  ];

  for (const [componentType, pattern] of componentPatterns) {
    if (new RegExp(pattern, 'i').test(html)) {
      features.componentTypes.push(componentType);
    }
  }

  // Count CTAs
  const ctaMatches = html.match(/btn|button|cta|call-to-action/gi);
  features.ctaCount = ctaMatches ? ctaMatches.length : 0;

  // Detect hero style
  if (html.match(/hero.*full|full.*hero|100vh|100vw/i)) {
    features.heroStyle = 'full-width';
  } else if (html.match(/hero.*split|split.*hero/i)) {
    features.heroStyle = 'split';
  } else if (html.match(/hero/i)) {
    features.heroStyle = 'standard';
  }

  // Detect navigation style
  if (html.match(/nav.*sticky|sticky.*nav|fixed.*header/i)) {
    features.navigationStyle = 'sticky';
  } else if (html.match(/hamburger|mobile-menu|toggle-nav/i)) {
    features.navigationStyle = 'hamburger';
  } else {
    features.navigationStyle = 'standard';
  }

  return features;
}

/**
 * Infer visual style from extracted features
 */
export function inferVisualStyle(features: ExtractedDesignFeatures): VisualStyle {
  // Check for bold/dramatic style
  if (features.colors.length > 5 || features.heroStyle === 'full-width') {
    return 'bold';
  }

  // Check for minimal style
  if (features.colors.length <= 2 && features.componentTypes.length <= 3) {
    return 'minimal';
  }

  // Check for marketing style
  if (features.ctaCount > 5 || features.componentTypes.includes('testimonial')) {
    return 'marketing';
  }

  // Check for warm/friendly style
  if (features.componentTypes.includes('card') && features.layoutStructure === 'grid') {
    return 'warm-modern';
  }

  // Default to editorial
  return 'editorial';
}

/**
 * Infer component usage from features
 */
export function inferComponentUsage(features: ExtractedDesignFeatures): Partial<Record<ComponentType, number>> {
  const usage: Partial<Record<ComponentType, number>> = {};

  const componentMapping: Record<string, ComponentType> = {
    faq: 'faq-accordion',
    timeline: 'timeline-vertical',
    testimonial: 'testimonial-single',
    hero: 'image-hero',
    card: 'card-grid',
    cta: 'cta-banner',
    table: 'comparison-table',
    list: 'bullet-list',
  };

  for (const detected of features.componentTypes) {
    const component = componentMapping[detected];
    if (component) {
      usage[component] = (usage[component] || 0) + 1;
    }
  }

  return usage;
}

// ============================================================================
// ANALYSIS STORAGE
// ============================================================================

/**
 * Store competitor design analysis
 */
export async function storeCompetitorAnalysis(
  projectId: string,
  analysis: Omit<CompetitorDesignAnalysis, 'id' | 'projectId'>
): Promise<string> {
  const client = getClient();

  const { data, error } = await client
    .from('competitor_designs')
    .upsert({
      project_id: projectId,
      competitor_url: analysis.competitorUrl,
      competitor_name: analysis.competitorName,
      analysis_date: analysis.analysisDate,
      design_patterns: analysis.designPatterns,
    }, {
      onConflict: 'project_id,competitor_url',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to store competitor analysis: ${error.message}`);
  }

  return data.id;
}

/**
 * Get all competitor analyses for a project
 */
export async function getCompetitorAnalyses(
  projectId: string
): Promise<CompetitorDesignAnalysis[]> {
  const client = getClient();

  const { data, error } = await client
    .from('competitor_designs')
    .select('*')
    .eq('project_id', projectId)
    .order('analysis_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch competitor analyses: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    projectId: row.project_id,
    competitorUrl: row.competitor_url,
    competitorName: row.competitor_name,
    analysisDate: row.analysis_date,
    designPatterns: row.design_patterns,
  }));
}

/**
 * Delete a competitor analysis
 */
export async function deleteCompetitorAnalysis(
  projectId: string,
  analysisId: string
): Promise<void> {
  const client = getClient();

  const { error } = await client
    .from('competitor_designs')
    .delete()
    .eq('id', analysisId)
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to delete competitor analysis: ${error.message}`);
  }
}

// ============================================================================
// INSIGHT GENERATION
// ============================================================================

/**
 * Generate insights from multiple competitor analyses
 */
export function generateCompetitorInsights(
  analyses: CompetitorDesignAnalysis[]
): CompetitorInsights {
  if (analyses.length === 0) {
    return {
      commonPatterns: [],
      differentiationOpportunities: [],
      industryNorms: {
        preferredVisualStyle: 'editorial',
        commonComponents: [],
        ctaIntensity: 'moderate',
        colorTrends: [],
      },
      recommendations: {
        adopt: [],
        avoid: [],
        differentiate: [],
      },
    };
  }

  // Count visual styles
  const styleCounts = new Map<VisualStyle, number>();
  for (const analysis of analyses) {
    const style = analysis.designPatterns.visualStyle;
    styleCounts.set(style, (styleCounts.get(style) || 0) + 1);
  }

  // Find most common style
  const preferredVisualStyle = [...styleCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'editorial';

  // Count component usage
  const componentCounts = new Map<ComponentType, number>();
  for (const analysis of analyses) {
    for (const [component, count] of Object.entries(analysis.designPatterns.componentUsage)) {
      componentCounts.set(
        component as ComponentType,
        (componentCounts.get(component as ComponentType) || 0) + count
      );
    }
  }

  // Get common components (used by at least half of competitors)
  const threshold = analyses.length / 2;
  const commonComponents = [...componentCounts.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([component]) => component);

  // Count CTA intensities
  const ctaCounts = new Map<string, number>();
  for (const analysis of analyses) {
    const intensity = analysis.designPatterns.ctaStyle.intensity;
    ctaCounts.set(intensity, (ctaCounts.get(intensity) || 0) + 1);
  }
  const ctaIntensity = [...ctaCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] as 'subtle' | 'moderate' | 'prominent' || 'moderate';

  // Collect common patterns (strengths mentioned multiple times)
  const patternCounts = new Map<string, number>();
  for (const analysis of analyses) {
    for (const strength of analysis.designPatterns.strengths) {
      patternCounts.set(strength, (patternCounts.get(strength) || 0) + 1);
    }
  }
  const commonPatterns = [...patternCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([pattern]) => pattern);

  // Collect weaknesses as differentiation opportunities
  const weaknessCounts = new Map<string, number>();
  for (const analysis of analyses) {
    for (const weakness of analysis.designPatterns.weaknesses) {
      weaknessCounts.set(weakness, (weaknessCounts.get(weakness) || 0) + 1);
    }
  }
  const differentiationOpportunities = [...weaknessCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([weakness]) => weakness);

  // Generate recommendations
  const recommendations = {
    adopt: commonPatterns.slice(0, 3),
    avoid: [], // Would need more sophisticated analysis
    differentiate: differentiationOpportunities.slice(0, 3),
  };

  // Collect color trends
  const colorCounts = new Map<string, number>();
  for (const analysis of analyses) {
    const primary = analysis.designPatterns.colorScheme.primary;
    if (primary) {
      colorCounts.set(primary, (colorCounts.get(primary) || 0) + 1);
    }
  }
  const colorTrends = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([color]) => color);

  return {
    commonPatterns,
    differentiationOpportunities,
    industryNorms: {
      preferredVisualStyle,
      commonComponents,
      ctaIntensity,
      colorTrends,
    },
    recommendations,
  };
}

// ============================================================================
// ANALYSIS WORKFLOW
// ============================================================================

/**
 * Analyze a competitor URL and store results
 * This is a simplified version - a full implementation would use
 * a headless browser or web scraping service
 */
export async function analyzeCompetitorUrl(
  projectId: string,
  url: string,
  html: string,
  competitorName?: string
): Promise<CompetitorDesignAnalysis> {
  const features = extractDesignFeatures(html);
  const visualStyle = inferVisualStyle(features);
  const componentUsage = inferComponentUsage(features);

  const analysis: CompetitorDesignAnalysis = {
    id: '', // Will be assigned by database
    projectId,
    competitorUrl: url,
    competitorName,
    analysisDate: new Date().toISOString(),
    designPatterns: {
      visualStyle,
      colorScheme: {
        primary: features.colors[0] || '#000000',
        secondary: features.colors[1] || '#666666',
        accent: features.colors[2] || '#0066cc',
        background: features.colors[3] || '#ffffff',
      },
      typography: {
        headingFont: features.fonts[0] || 'system-ui',
        bodyFont: features.fonts[1] || features.fonts[0] || 'system-ui',
        headingWeight: 'bold',
      },
      layoutPatterns: [features.layoutStructure],
      componentUsage,
      ctaStyle: {
        intensity: features.ctaCount > 5 ? 'prominent' : features.ctaCount > 2 ? 'moderate' : 'subtle',
        placements: features.ctaCount > 0 ? ['header', 'content', 'footer'] : [],
        buttonStyle: 'rounded',
      },
      spacing: features.layoutStructure === 'grid' ? 'balanced' : 'spacious',
      strengths: [],
      weaknesses: [],
    },
  };

  // Auto-detect strengths based on features
  if (features.heroStyle === 'full-width') {
    analysis.designPatterns.strengths.push('Strong visual impact with full-width hero');
  }
  if (features.navigationStyle === 'sticky') {
    analysis.designPatterns.strengths.push('Easy navigation with sticky header');
  }
  if (features.componentTypes.includes('testimonial')) {
    analysis.designPatterns.strengths.push('Social proof with testimonials');
  }
  if (features.componentTypes.includes('faq')) {
    analysis.designPatterns.strengths.push('Addresses common questions with FAQ');
  }

  // Auto-detect weaknesses
  if (features.ctaCount < 2) {
    analysis.designPatterns.weaknesses.push('Limited calls-to-action');
  }
  if (features.colors.length > 6) {
    analysis.designPatterns.weaknesses.push('Potentially inconsistent color scheme');
  }
  if (!features.componentTypes.includes('testimonial')) {
    analysis.designPatterns.weaknesses.push('Missing social proof elements');
  }

  // Store in database
  const id = await storeCompetitorAnalysis(projectId, analysis);
  analysis.id = id;

  return analysis;
}

/**
 * Get design recommendations based on competitor analysis
 */
export async function getDesignRecommendations(
  projectId: string
): Promise<{
  visualStyle: VisualStyle;
  preferredComponents: ComponentType[];
  ctaIntensity: 'subtle' | 'moderate' | 'prominent';
  differentiators: string[];
}> {
  const analyses = await getCompetitorAnalyses(projectId);

  if (analyses.length === 0) {
    return {
      visualStyle: 'editorial',
      preferredComponents: ['prose', 'bullet-list', 'faq-accordion'],
      ctaIntensity: 'moderate',
      differentiators: [],
    };
  }

  const insights = generateCompetitorInsights(analyses);

  return {
    visualStyle: insights.industryNorms.preferredVisualStyle,
    preferredComponents: insights.industryNorms.commonComponents,
    ctaIntensity: insights.industryNorms.ctaIntensity,
    differentiators: insights.differentiationOpportunities,
  };
}
