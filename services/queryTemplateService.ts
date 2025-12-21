/**
 * Query Template Service
 * Handles parsing, validation, and expansion of query templates
 * for Local SEO and service variations.
 */

import type {
  QueryTemplate,
  TemplatePlaceholder,
  TemplateVariableSet,
  ExpandedTemplateResult,
  TemplateBatchConfig,
  LocationEntity,
  EnrichedTopic,
  FreshnessProfile,
} from '../types';
import { QUERY_TEMPLATES, getTemplateById } from '../config/queryTemplateLibrary';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../utils/helpers';

// =============================================================================
// TEMPLATE PARSING
// =============================================================================

/**
 * Parse a template pattern to extract placeholders
 */
export function parseTemplate(pattern: string): TemplatePlaceholder[] {
  const placeholderRegex = /\[([^\]]+)\]/g;
  const placeholders: TemplatePlaceholder[] = [];
  let match;

  while ((match = placeholderRegex.exec(pattern)) !== null) {
    const name = match[1];
    placeholders.push({
      name,
      bracket_syntax: match[0],
      entity_type: inferEntityType(name),
      example_values: [],
      required: true,
    });
  }

  return placeholders;
}

/**
 * Infer entity type from placeholder name
 */
function inferEntityType(name: string): string {
  const typeMap: Record<string, string> = {
    city: 'City',
    region: 'AdministrativeArea',
    neighborhood: 'Place',
    country: 'Country',
    service: 'Service',
    product: 'Product',
    brand: 'Brand',
    audience: 'Audience',
    'use case': 'UseCase',
    year: 'Year',
    price: 'PriceRange',
  };

  const normalized = name.toLowerCase();
  return typeMap[normalized] || 'Thing';
}

// =============================================================================
// TEMPLATE EXPANSION
// =============================================================================

/**
 * Expand a template with a single set of variables
 */
export function expandTemplate(
  template: QueryTemplate,
  variables: TemplateVariableSet
): string {
  let result = template.pattern;

  for (const placeholder of template.placeholders) {
    const value = variables[placeholder.name];
    if (value) {
      const replacement = Array.isArray(value) ? value[0] : value;
      result = result.replace(placeholder.bracket_syntax, replacement);
    }
  }

  return result;
}

/**
 * Validate placeholder values against their constraints
 */
export function validatePlaceholderValue(
  value: string,
  placeholder: TemplatePlaceholder
): { valid: boolean; error?: string } {
  if (placeholder.required && !value) {
    return { valid: false, error: `${placeholder.name} is required` };
  }

  if (placeholder.validation_pattern && value) {
    const regex = new RegExp(placeholder.validation_pattern);
    if (!regex.test(value)) {
      return { valid: false, error: `${placeholder.name} does not match expected format` };
    }
  }

  return { valid: true };
}

/**
 * Validate all variables for a template
 */
export function validateVariables(
  template: QueryTemplate,
  variables: TemplateVariableSet
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const placeholder of template.placeholders) {
    const value = variables[placeholder.name];
    const valueStr = Array.isArray(value) ? value[0] : value;
    const validation = validatePlaceholderValue(valueStr || '', placeholder);
    if (!validation.valid && validation.error) {
      errors.push(validation.error);
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// BATCH EXPANSION
// =============================================================================

/**
 * Generate all combinations of variables
 */
export function generateVariableCombinations(
  placeholders: TemplatePlaceholder[],
  variableOptions: Record<string, string[]>
): TemplateVariableSet[] {
  const combinations: TemplateVariableSet[] = [];

  // Get arrays for each placeholder
  const placeholderArrays = placeholders.map(p => {
    const options = variableOptions[p.name] || [];
    return { name: p.name, options };
  });

  // Generate cartesian product
  function generateCombos(
    index: number,
    current: TemplateVariableSet
  ): void {
    if (index >= placeholderArrays.length) {
      combinations.push({ ...current });
      return;
    }

    const { name, options } = placeholderArrays[index];
    if (options.length === 0) {
      // Skip placeholders with no options
      generateCombos(index + 1, current);
      return;
    }

    for (const option of options) {
      current[name] = option;
      generateCombos(index + 1, current);
    }
  }

  generateCombos(0, {});
  return combinations;
}

/**
 * Generate topics from a template with batch configuration
 */
export function generateTopicsFromTemplate(
  config: TemplateBatchConfig,
  mapId: string
): ExpandedTemplateResult {
  const { template, locations, services, audiences, max_combinations, parent_topic_id } = config;

  // Build variable options
  const variableOptions: Record<string, string[]> = {};

  // Add locations
  if (locations && locations.length > 0) {
    const locationPlaceholder = template.placeholders.find(
      p => ['City', 'Region', 'Neighborhood'].includes(p.entity_type)
    );
    if (locationPlaceholder) {
      variableOptions[locationPlaceholder.name] = locations.map(l => l.name);
    }
  }

  // Add services
  if (services && services.length > 0) {
    const servicePlaceholder = template.placeholders.find(
      p => p.entity_type === 'Service' || p.name.toLowerCase().includes('service')
    );
    if (servicePlaceholder) {
      variableOptions[servicePlaceholder.name] = services;
    }
  }

  // Add audiences
  if (audiences && audiences.length > 0) {
    const audiencePlaceholder = template.placeholders.find(
      p => p.entity_type === 'Audience' || p.name.toLowerCase().includes('audience')
    );
    if (audiencePlaceholder) {
      variableOptions[audiencePlaceholder.name] = audiences;
    }
  }

  // Generate combinations
  let combinations = generateVariableCombinations(template.placeholders, variableOptions);

  // Apply limit
  if (max_combinations && combinations.length > max_combinations) {
    combinations = combinations.slice(0, max_combinations);
  }

  // Generate queries and topics
  const generatedQueries: string[] = [];
  const generatedTopics: Partial<EnrichedTopic>[] = [];

  for (const vars of combinations) {
    const query = expandTemplate(template, vars);
    generatedQueries.push(query);

    const topic: Partial<EnrichedTopic> = {
      id: uuidv4(),
      map_id: mapId,
      parent_topic_id: parent_topic_id || null,
      title: query,
      slug: slugify(query),
      description: `Content targeting "${query}" - generated from template "${template.name}"`,
      type: 'outer',
      freshness: 'EVERGREEN' as FreshnessProfile,
      topic_class: template.suggested_topic_class,
      canonical_query: query,
      metadata: {
        generated_from_template: template.id,
        template_variables: vars,
        search_intent: template.search_intent,
      },
    };

    generatedTopics.push(topic);
  }

  return {
    original_template: template,
    variable_combinations: combinations,
    generated_queries: generatedQueries,
    generated_topics: generatedTopics,
    parent_topic_id: parent_topic_id,
  };
}

// =============================================================================
// LOCATION UTILITIES
// =============================================================================

/**
 * Generate location variants for a template
 */
export function generateLocationVariants(
  template: QueryTemplate,
  locations: LocationEntity[],
  mapId: string,
  parentTopicId?: string
): ExpandedTemplateResult {
  const config: TemplateBatchConfig = {
    template,
    locations,
    parent_topic_id: parentTopicId,
  };

  return generateTopicsFromTemplate(config, mapId);
}

/**
 * Prioritize locations by population
 */
export function prioritizeByPopulation(
  locations: LocationEntity[],
  limit?: number
): LocationEntity[] {
  const sorted = [...locations].sort((a, b) => (b.population || 0) - (a.population || 0));
  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Group locations by parent (e.g., cities by region)
 */
export function groupLocationsByParent(
  locations: LocationEntity[]
): Map<string, LocationEntity[]> {
  const groups = new Map<string, LocationEntity[]>();

  for (const location of locations) {
    const parentId = location.parent_location_id || 'root';
    const existing = groups.get(parentId) || [];
    existing.push(location);
    groups.set(parentId, existing);
  }

  return groups;
}

// =============================================================================
// TEMPLATE SUGGESTIONS
// =============================================================================

/**
 * Suggest templates based on business context
 */
export function suggestTemplates(
  businessInfo: { industry?: string; region?: string; websiteType?: string }
): QueryTemplate[] {
  const suggestions: QueryTemplate[] = [];

  // Local businesses should use local templates
  if (businessInfo.region) {
    suggestions.push(...QUERY_TEMPLATES.filter(t => t.category === 'local'));
  }

  // E-commerce should use comparison and review templates
  if (businessInfo.websiteType === 'ECOMMERCE') {
    suggestions.push(...QUERY_TEMPLATES.filter(t =>
      ['comparison', 'review', 'best-of', 'cost'].includes(t.category)
    ));
  }

  // Service businesses should use local and how-to templates
  if (businessInfo.websiteType === 'SERVICE_B2B') {
    suggestions.push(...QUERY_TEMPLATES.filter(t =>
      ['local', 'how-to', 'cost'].includes(t.category)
    ));
  }

  // Informational sites should use how-to and problem-solution
  if (businessInfo.websiteType === 'INFORMATIONAL') {
    suggestions.push(...QUERY_TEMPLATES.filter(t =>
      ['how-to', 'problem-solution', 'comparison'].includes(t.category)
    ));
  }

  // Remove duplicates
  const uniqueIds = new Set<string>();
  return suggestions.filter(t => {
    if (uniqueIds.has(t.id)) return false;
    uniqueIds.add(t.id);
    return true;
  });
}

/**
 * Preview what topics would be generated from a template
 */
export function previewTemplateExpansion(
  templateId: string,
  variables: Record<string, string[]>,
  limit: number = 5
): string[] {
  const template = getTemplateById(templateId);
  if (!template) return [];

  const combinations = generateVariableCombinations(template.placeholders, variables);
  const limited = combinations.slice(0, limit);

  return limited.map(vars => expandTemplate(template, vars));
}

// =============================================================================
// CUSTOM TEMPLATE CREATION
// =============================================================================

/**
 * Create a custom template from a pattern string
 */
export function createCustomTemplate(
  name: string,
  pattern: string,
  description: string = '',
  searchIntent: QueryTemplate['search_intent'] = 'informational',
  topicClass: 'monetization' | 'informational' = 'informational'
): QueryTemplate {
  const placeholders = parseTemplate(pattern);

  return {
    id: `custom-${uuidv4().slice(0, 8)}`,
    name,
    pattern,
    description,
    placeholders,
    category: 'custom',
    search_intent: searchIntent,
    example_output: pattern.replace(/\[[^\]]+\]/g, '[value]'),
    suggested_topic_class: topicClass,
  };
}

/**
 * Validate a custom template pattern
 */
export function validateTemplatePattern(pattern: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for at least one placeholder
  const placeholders = parseTemplate(pattern);
  if (placeholders.length === 0) {
    errors.push('Template must contain at least one placeholder [Name]');
  }

  // Check for unclosed brackets
  const openBrackets = (pattern.match(/\[/g) || []).length;
  const closeBrackets = (pattern.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push('Mismatched brackets in template pattern');
  }

  // Check for empty placeholders
  if (/\[\s*\]/.test(pattern)) {
    errors.push('Empty placeholder found');
  }

  // Check minimum length
  if (pattern.length < 5) {
    errors.push('Template pattern too short');
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// POPULARITY / SEARCH VOLUME RANKING
// Based on user request: templates should be ranked by estimated search volume
// =============================================================================

export interface TemplatePopularityData {
  template_id: string;
  estimated_monthly_volume: number; // Aggregate monthly searches
  volume_trend: 'rising' | 'stable' | 'declining';
  competition_level: 'low' | 'medium' | 'high';
  last_updated: string;
}

/**
 * Estimated search volume ranges for template categories
 * These are baseline estimates - actual volumes vary by market
 */
export const TEMPLATE_VOLUME_ESTIMATES: Record<string, TemplatePopularityData> = {
  // Local SEO templates - typically high volume
  'local-best-service': {
    template_id: 'local-best-service',
    estimated_monthly_volume: 15000,
    volume_trend: 'stable',
    competition_level: 'high',
    last_updated: new Date().toISOString(),
  },
  'local-service-near-me': {
    template_id: 'local-service-near-me',
    estimated_monthly_volume: 25000,
    volume_trend: 'rising',
    competition_level: 'high',
    last_updated: new Date().toISOString(),
  },
  'local-affordable-service': {
    template_id: 'local-affordable-service',
    estimated_monthly_volume: 8000,
    volume_trend: 'rising',
    competition_level: 'medium',
    last_updated: new Date().toISOString(),
  },
  'local-emergency-service': {
    template_id: 'local-emergency-service',
    estimated_monthly_volume: 5000,
    volume_trend: 'stable',
    competition_level: 'medium',
    last_updated: new Date().toISOString(),
  },
  'local-service-for-audience': {
    template_id: 'local-service-for-audience',
    estimated_monthly_volume: 3000,
    volume_trend: 'stable',
    competition_level: 'low',
    last_updated: new Date().toISOString(),
  },

  // Comparison templates - medium-high volume
  'comparison-vs': {
    template_id: 'comparison-vs',
    estimated_monthly_volume: 12000,
    volume_trend: 'stable',
    competition_level: 'medium',
    last_updated: new Date().toISOString(),
  },
  'comparison-vs-use-case': {
    template_id: 'comparison-vs-use-case',
    estimated_monthly_volume: 6000,
    volume_trend: 'stable',
    competition_level: 'low',
    last_updated: new Date().toISOString(),
  },
  'comparison-alternatives': {
    template_id: 'comparison-alternatives',
    estimated_monthly_volume: 20000,
    volume_trend: 'rising',
    competition_level: 'high',
    last_updated: new Date().toISOString(),
  },

  // Best-of templates - very high volume
  'best-of-category-year': {
    template_id: 'best-of-category-year',
    estimated_monthly_volume: 30000,
    volume_trend: 'rising',
    competition_level: 'high',
    last_updated: new Date().toISOString(),
  },
  'best-of-for-audience': {
    template_id: 'best-of-for-audience',
    estimated_monthly_volume: 15000,
    volume_trend: 'stable',
    competition_level: 'medium',
    last_updated: new Date().toISOString(),
  },
  'best-of-under-price': {
    template_id: 'best-of-under-price',
    estimated_monthly_volume: 18000,
    volume_trend: 'rising',
    competition_level: 'high',
    last_updated: new Date().toISOString(),
  },
  'review-product': {
    template_id: 'review-product',
    estimated_monthly_volume: 50000,
    volume_trend: 'stable',
    competition_level: 'high',
    last_updated: new Date().toISOString(),
  },

  // How-to templates - very high volume
  'how-to-action': {
    template_id: 'how-to-action',
    estimated_monthly_volume: 100000,
    volume_trend: 'stable',
    competition_level: 'high',
    last_updated: new Date().toISOString(),
  },
  'how-to-choose': {
    template_id: 'how-to-choose',
    estimated_monthly_volume: 25000,
    volume_trend: 'stable',
    competition_level: 'medium',
    last_updated: new Date().toISOString(),
  },
  'how-to-for-audience': {
    template_id: 'how-to-for-audience',
    estimated_monthly_volume: 10000,
    volume_trend: 'stable',
    competition_level: 'low',
    last_updated: new Date().toISOString(),
  },

  // Cost templates - high volume
  'cost-service': {
    template_id: 'cost-service',
    estimated_monthly_volume: 20000,
    volume_trend: 'stable',
    competition_level: 'medium',
    last_updated: new Date().toISOString(),
  },
  'cost-service-city': {
    template_id: 'cost-service-city',
    estimated_monthly_volume: 8000,
    volume_trend: 'stable',
    competition_level: 'medium',
    last_updated: new Date().toISOString(),
  },
  'cost-product-price': {
    template_id: 'cost-product-price',
    estimated_monthly_volume: 35000,
    volume_trend: 'stable',
    competition_level: 'high',
    last_updated: new Date().toISOString(),
  },

  // Problem-solution templates - medium volume
  'problem-solution': {
    template_id: 'problem-solution',
    estimated_monthly_volume: 15000,
    volume_trend: 'stable',
    competition_level: 'medium',
    last_updated: new Date().toISOString(),
  },
  'problem-cause': {
    template_id: 'problem-cause',
    estimated_monthly_volume: 12000,
    volume_trend: 'stable',
    competition_level: 'low',
    last_updated: new Date().toISOString(),
  },
};

/**
 * Get templates sorted by estimated search volume (highest first)
 */
export function getTemplatesByPopularity(): QueryTemplate[] {
  return [...QUERY_TEMPLATES].sort((a, b) => {
    const volumeA = TEMPLATE_VOLUME_ESTIMATES[a.id]?.estimated_monthly_volume || 0;
    const volumeB = TEMPLATE_VOLUME_ESTIMATES[b.id]?.estimated_monthly_volume || 0;
    return volumeB - volumeA;
  });
}

/**
 * Get templates sorted by opportunity score (high volume + low competition)
 */
export function getTemplatesByOpportunity(): Array<QueryTemplate & { opportunity_score: number }> {
  const competitionMultiplier = {
    low: 1.0,
    medium: 0.7,
    high: 0.4,
  };

  const trendMultiplier = {
    rising: 1.2,
    stable: 1.0,
    declining: 0.8,
  };

  return [...QUERY_TEMPLATES]
    .map(template => {
      const popularity = TEMPLATE_VOLUME_ESTIMATES[template.id];
      if (!popularity) {
        return { ...template, opportunity_score: 0 };
      }

      const baseScore = popularity.estimated_monthly_volume;
      const compMultiplier = competitionMultiplier[popularity.competition_level];
      const trendMult = trendMultiplier[popularity.volume_trend];

      const opportunityScore = Math.round(baseScore * compMultiplier * trendMult);

      return { ...template, opportunity_score: opportunityScore };
    })
    .sort((a, b) => b.opportunity_score - a.opportunity_score);
}

/**
 * Get popularity data for a specific template
 */
export function getTemplatePopularity(templateId: string): TemplatePopularityData | null {
  return TEMPLATE_VOLUME_ESTIMATES[templateId] || null;
}

/**
 * Get templates with rising search trends
 */
export function getRisingTemplates(): QueryTemplate[] {
  const risingIds = Object.entries(TEMPLATE_VOLUME_ESTIMATES)
    .filter(([_, data]) => data.volume_trend === 'rising')
    .map(([id]) => id);

  return QUERY_TEMPLATES.filter(t => risingIds.includes(t.id));
}

/**
 * Get low competition templates (easier to rank)
 */
export function getLowCompetitionTemplates(): QueryTemplate[] {
  const lowCompIds = Object.entries(TEMPLATE_VOLUME_ESTIMATES)
    .filter(([_, data]) => data.competition_level === 'low')
    .map(([id]) => id);

  return QUERY_TEMPLATES.filter(t => lowCompIds.includes(t.id));
}

/**
 * Format volume for display (e.g., "15K", "1.2M")
 */
export function formatSearchVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${Math.round(volume / 1000)}K`;
  }
  return volume.toString();
}

/**
 * Get volume tier label
 */
export function getVolumeTier(volume: number): 'very-high' | 'high' | 'medium' | 'low' {
  if (volume >= 50000) return 'very-high';
  if (volume >= 15000) return 'high';
  if (volume >= 5000) return 'medium';
  return 'low';
}

/**
 * Get color coding for volume tier (for UI)
 */
export function getVolumeTierColor(tier: string): string {
  const colors = {
    'very-high': '#22c55e', // green
    high: '#3b82f6',        // blue
    medium: '#f59e0b',      // amber
    low: '#9ca3af',         // gray
  };
  return colors[tier as keyof typeof colors] || colors.medium;
}

// =============================================================================
// HISTORICAL USAGE TRACKING
// Tracks which templates are used, when, and with what variables
// Enables suggestions based on past usage patterns
// =============================================================================

export interface TemplateUsageEvent {
  template_id: string;
  timestamp: string;
  map_id: string;
  variables: Record<string, string>;
  topics_generated: number;
}

export interface TemplateUsageStats {
  template_id: string;
  total_uses: number;
  total_topics_generated: number;
  last_used: string | null;
  popular_variables: Record<string, string[]>; // placeholder -> most used values
  usage_by_month: Record<string, number>; // YYYY-MM -> count
}

export interface UsageAnalytics {
  most_used_templates: Array<{ template_id: string; uses: number }>;
  most_productive_templates: Array<{ template_id: string; topics: number }>;
  recent_activity: TemplateUsageEvent[];
  usage_trend: 'increasing' | 'stable' | 'decreasing';
  suggested_templates: QueryTemplate[];
}

// In-memory storage (can be persisted to Supabase)
let usageHistory: TemplateUsageEvent[] = [];
let usageStatsCache: Map<string, TemplateUsageStats> = new Map();

/**
 * Record a template usage event
 */
export function recordTemplateUsage(
  templateId: string,
  mapId: string,
  variables: Record<string, string>,
  topicsGenerated: number
): void {
  const event: TemplateUsageEvent = {
    template_id: templateId,
    timestamp: new Date().toISOString(),
    map_id: mapId,
    variables,
    topics_generated: topicsGenerated,
  };

  usageHistory.push(event);
  updateUsageStats(event);

  // Keep history manageable (last 1000 events)
  if (usageHistory.length > 1000) {
    usageHistory = usageHistory.slice(-1000);
  }
}

/**
 * Update usage stats cache after a new event
 */
function updateUsageStats(event: TemplateUsageEvent): void {
  let stats = usageStatsCache.get(event.template_id);

  if (!stats) {
    stats = {
      template_id: event.template_id,
      total_uses: 0,
      total_topics_generated: 0,
      last_used: null,
      popular_variables: {},
      usage_by_month: {},
    };
  }

  stats.total_uses++;
  stats.total_topics_generated += event.topics_generated;
  stats.last_used = event.timestamp;

  // Track variable popularity
  for (const [placeholder, value] of Object.entries(event.variables)) {
    if (!stats.popular_variables[placeholder]) {
      stats.popular_variables[placeholder] = [];
    }
    if (!stats.popular_variables[placeholder].includes(value)) {
      stats.popular_variables[placeholder].push(value);
    }
    // Keep top 20 values
    if (stats.popular_variables[placeholder].length > 20) {
      stats.popular_variables[placeholder] = stats.popular_variables[placeholder].slice(-20);
    }
  }

  // Track monthly usage
  const month = event.timestamp.slice(0, 7); // YYYY-MM
  stats.usage_by_month[month] = (stats.usage_by_month[month] || 0) + 1;

  usageStatsCache.set(event.template_id, stats);
}

/**
 * Get usage stats for a specific template
 */
export function getTemplateUsageStats(templateId: string): TemplateUsageStats | null {
  return usageStatsCache.get(templateId) || null;
}

/**
 * Get all usage stats
 */
export function getAllUsageStats(): TemplateUsageStats[] {
  return Array.from(usageStatsCache.values());
}

/**
 * Get usage history for a specific map
 */
export function getMapUsageHistory(mapId: string): TemplateUsageEvent[] {
  return usageHistory.filter(e => e.map_id === mapId);
}

/**
 * Get comprehensive usage analytics
 */
export function getUsageAnalytics(): UsageAnalytics {
  const allStats = getAllUsageStats();

  // Most used templates
  const mostUsed = allStats
    .sort((a, b) => b.total_uses - a.total_uses)
    .slice(0, 10)
    .map(s => ({ template_id: s.template_id, uses: s.total_uses }));

  // Most productive (topics generated)
  const mostProductive = allStats
    .sort((a, b) => b.total_topics_generated - a.total_topics_generated)
    .slice(0, 10)
    .map(s => ({ template_id: s.template_id, topics: s.total_topics_generated }));

  // Recent activity
  const recentActivity = usageHistory
    .slice(-20)
    .reverse();

  // Calculate usage trend (compare last 30 days to previous 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const recentCount = usageHistory.filter(e => new Date(e.timestamp) >= thirtyDaysAgo).length;
  const previousCount = usageHistory.filter(e => {
    const date = new Date(e.timestamp);
    return date >= sixtyDaysAgo && date < thirtyDaysAgo;
  }).length;

  let usageTrend: UsageAnalytics['usage_trend'];
  if (recentCount > previousCount * 1.2) {
    usageTrend = 'increasing';
  } else if (recentCount < previousCount * 0.8) {
    usageTrend = 'decreasing';
  } else {
    usageTrend = 'stable';
  }

  // Suggest templates based on usage patterns
  const usedTemplateIds = new Set(allStats.map(s => s.template_id));
  const suggestedTemplates = QUERY_TEMPLATES
    .filter(t => !usedTemplateIds.has(t.id))
    .slice(0, 5);

  return {
    most_used_templates: mostUsed,
    most_productive_templates: mostProductive,
    recent_activity: recentActivity,
    usage_trend: usageTrend,
    suggested_templates: suggestedTemplates,
  };
}

/**
 * Get suggested variable values based on past usage
 */
export function getSuggestedVariableValues(
  templateId: string,
  placeholderName: string
): string[] {
  const stats = usageStatsCache.get(templateId);
  if (!stats) return [];

  return stats.popular_variables[placeholderName] || [];
}

/**
 * Get templates the user hasn't tried yet
 */
export function getUnusedTemplates(): QueryTemplate[] {
  const usedIds = new Set(usageStatsCache.keys());
  return QUERY_TEMPLATES.filter(t => !usedIds.has(t.id));
}

/**
 * Get templates similar to frequently used ones
 */
export function getSimilarTemplates(maxResults: number = 5): QueryTemplate[] {
  const stats = getAllUsageStats();
  if (stats.length === 0) return [];

  // Find most used categories
  const categoryUsage = new Map<string, number>();
  for (const stat of stats) {
    const template = QUERY_TEMPLATES.find(t => t.id === stat.template_id);
    if (template) {
      const current = categoryUsage.get(template.category) || 0;
      categoryUsage.set(template.category, current + stat.total_uses);
    }
  }

  // Sort categories by usage
  const sortedCategories = [...categoryUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  // Get unused templates from top categories
  const usedIds = new Set(usageStatsCache.keys());
  const suggestions: QueryTemplate[] = [];

  for (const category of sortedCategories) {
    const categoryTemplates = QUERY_TEMPLATES
      .filter(t => t.category === category && !usedIds.has(t.id));
    suggestions.push(...categoryTemplates);

    if (suggestions.length >= maxResults) break;
  }

  return suggestions.slice(0, maxResults);
}

/**
 * Export usage history to JSON
 */
export function exportUsageHistory(): string {
  return JSON.stringify({
    events: usageHistory,
    stats: Array.from(usageStatsCache.entries()),
    exported_at: new Date().toISOString(),
  }, null, 2);
}

/**
 * Import usage history from JSON
 */
export function importUsageHistory(json: string): { success: boolean; imported: number; error?: string } {
  try {
    const data = JSON.parse(json);

    if (data.events && Array.isArray(data.events)) {
      usageHistory = data.events;
    }

    if (data.stats && Array.isArray(data.stats)) {
      usageStatsCache = new Map(data.stats);
    }

    return { success: true, imported: usageHistory.length };
  } catch (e) {
    return { success: false, imported: 0, error: String(e) };
  }
}

/**
 * Clear all usage data
 */
export function clearUsageHistory(): void {
  usageHistory = [];
  usageStatsCache.clear();
}

/**
 * Get usage summary for display
 */
export function getUsageSummary(): {
  totalTemplatesUsed: number;
  totalTopicsGenerated: number;
  avgTopicsPerUse: number;
  mostUsedTemplate: { template: QueryTemplate | undefined; uses: number } | null;
  lastActivity: string | null;
} {
  const stats = getAllUsageStats();

  if (stats.length === 0) {
    return {
      totalTemplatesUsed: 0,
      totalTopicsGenerated: 0,
      avgTopicsPerUse: 0,
      mostUsedTemplate: null,
      lastActivity: null,
    };
  }

  const totalTopics = stats.reduce((sum, s) => sum + s.total_topics_generated, 0);
  const totalUses = stats.reduce((sum, s) => sum + s.total_uses, 0);

  const mostUsedStat = stats.sort((a, b) => b.total_uses - a.total_uses)[0];
  const mostUsedTemplate = QUERY_TEMPLATES.find(t => t.id === mostUsedStat.template_id);

  const lastEvent = usageHistory[usageHistory.length - 1];

  return {
    totalTemplatesUsed: stats.length,
    totalTopicsGenerated: totalTopics,
    avgTopicsPerUse: totalUses > 0 ? Math.round(totalTopics / totalUses) : 0,
    mostUsedTemplate: mostUsedTemplate
      ? { template: mostUsedTemplate, uses: mostUsedStat.total_uses }
      : null,
    lastActivity: lastEvent?.timestamp || null,
  };
}
