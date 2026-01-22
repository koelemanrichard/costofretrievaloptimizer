/**
 * Blueprint Storage Service
 *
 * Handles persistence of layout blueprints to Supabase.
 * Manages the blueprint hierarchy (project → topical map → article).
 *
 * @module services/publishing/architect/blueprintStorage
 */

import { getSupabaseClient } from '../../supabaseClient';
import type {
  LayoutBlueprint,
  ProjectBlueprint,
  TopicalMapBlueprint,
  ArticleBlueprintOverrides,
  VisualStyle,
  ContentPacing,
  ColorIntensity,
  ComponentType,
} from './blueprintTypes';

// Module-level Supabase client cache
let supabaseClient: ReturnType<typeof getSupabaseClient> | null = null;

/**
 * Initialize or get the Supabase client
 * Must be called with URL and key before using storage functions
 */
export function initSupabaseClient(supabaseUrl: string, supabaseAnonKey: string) {
  supabaseClient = getSupabaseClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

/**
 * Get the cached Supabase client (throws if not initialized)
 */
function getClient() {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initSupabaseClient first.');
  }
  return supabaseClient;
}

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectBlueprintRow {
  id: string;
  project_id: string;
  visual_style: VisualStyle;
  pacing: ContentPacing;
  color_intensity: ColorIntensity;
  cta_positions: string[];
  cta_intensity: string;
  cta_style: string;
  component_preferences: Record<string, unknown>;
  avoid_components: string[];
  ai_reasoning: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopicalMapBlueprintRow {
  id: string;
  topical_map_id: string;
  project_id: string;
  visual_style: VisualStyle | null;
  pacing: ContentPacing | null;
  color_intensity: ColorIntensity | null;
  cta_positions: string[] | null;
  cta_intensity: string | null;
  cta_style: string | null;
  component_preferences: Record<string, unknown> | null;
  cluster_rules: unknown[];
  ai_reasoning: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleBlueprintRow {
  id: string;
  topic_id: string;
  topical_map_id: string;
  blueprint: LayoutBlueprint;
  user_overrides: ArticleBlueprintOverrides | null;
  visual_style: VisualStyle;
  pacing: ContentPacing;
  sections_count: number;
  components_used: string[];
  word_count: number;
  model_used: string | null;
  generation_duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PROJECT BLUEPRINTS
// ============================================================================

// Note: Using type assertions because database types may not include blueprint tables yet.
// After running the migration and regenerating types, these assertions can be removed.

/**
 * Get project blueprint (or null if none exists)
 */
export async function getProjectBlueprint(projectId: string): Promise<ProjectBlueprintRow | null> {
  const { data, error } = await (getClient() as any)
    .from('project_blueprints')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching project blueprint:', error);
    throw error;
  }

  return data as ProjectBlueprintRow | null;
}

/**
 * Create or update project blueprint
 */
export async function upsertProjectBlueprint(
  projectId: string,
  blueprint: Partial<ProjectBlueprint>
): Promise<ProjectBlueprintRow> {
  const row = {
    project_id: projectId,
    visual_style: blueprint.defaults?.visualStyle || 'editorial',
    pacing: blueprint.defaults?.pacing || 'balanced',
    color_intensity: blueprint.defaults?.colorIntensity || 'moderate',
    cta_positions: blueprint.defaults?.ctaStrategy?.positions || ['end'],
    cta_intensity: blueprint.defaults?.ctaStrategy?.intensity || 'moderate',
    cta_style: blueprint.defaults?.ctaStrategy?.style || 'banner',
    component_preferences: blueprint.componentPreferences || {},
    avoid_components: blueprint.avoidComponents || [],
    ai_reasoning: blueprint.reasoning || null,
  };

  const { data, error } = await (getClient() as any)
    .from('project_blueprints')
    .upsert(row, { onConflict: 'project_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting project blueprint:', error);
    throw error;
  }

  return data;
}

/**
 * Delete project blueprint
 */
export async function deleteProjectBlueprint(projectId: string): Promise<void> {
  const { error } = await (getClient() as any)
    .from('project_blueprints')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    console.error('Error deleting project blueprint:', error);
    throw error;
  }
}

// ============================================================================
// TOPICAL MAP BLUEPRINTS
// ============================================================================

/**
 * Get topical map blueprint
 */
export async function getTopicalMapBlueprint(topicalMapId: string): Promise<TopicalMapBlueprintRow | null> {
  const { data, error } = await (getClient() as any)
    .from('topical_map_blueprints')
    .select('*')
    .eq('topical_map_id', topicalMapId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching topical map blueprint:', error);
    throw error;
  }

  return data;
}

/**
 * Create or update topical map blueprint
 */
export async function upsertTopicalMapBlueprint(
  topicalMapId: string,
  projectId: string,
  blueprint: Partial<TopicalMapBlueprint>
): Promise<TopicalMapBlueprintRow> {
  const row = {
    topical_map_id: topicalMapId,
    project_id: projectId,
    visual_style: blueprint.defaults?.visualStyle || null,
    pacing: blueprint.defaults?.pacing || null,
    color_intensity: blueprint.defaults?.colorIntensity || null,
    cta_positions: blueprint.defaults?.ctaStrategy?.positions || null,
    cta_intensity: blueprint.defaults?.ctaStrategy?.intensity || null,
    cta_style: blueprint.defaults?.ctaStrategy?.style || null,
    component_preferences: blueprint.componentPreferences || null,
    cluster_rules: blueprint.clusterSpecificRules || [],
    ai_reasoning: blueprint.reasoning || null,
  };

  const { data, error } = await (getClient() as any)
    .from('topical_map_blueprints')
    .upsert(row, { onConflict: 'topical_map_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting topical map blueprint:', error);
    throw error;
  }

  return data;
}

/**
 * Delete topical map blueprint
 */
export async function deleteTopicalMapBlueprint(topicalMapId: string): Promise<void> {
  const { error } = await (getClient() as any)
    .from('topical_map_blueprints')
    .delete()
    .eq('topical_map_id', topicalMapId);

  if (error) {
    console.error('Error deleting topical map blueprint:', error);
    throw error;
  }
}

// ============================================================================
// ARTICLE BLUEPRINTS
// ============================================================================

/**
 * Get article blueprint
 */
export async function getArticleBlueprint(topicId: string): Promise<ArticleBlueprintRow | null> {
  const { data, error } = await (getClient() as any)
    .from('article_blueprints')
    .select('*')
    .eq('topic_id', topicId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching article blueprint:', error);
    throw error;
  }

  return data;
}

/**
 * Get all article blueprints for a topical map
 */
export async function getArticleBlueprintsForMap(topicalMapId: string): Promise<ArticleBlueprintRow[]> {
  const { data, error } = await (getClient() as any)
    .from('article_blueprints')
    .select('*')
    .eq('topical_map_id', topicalMapId);

  if (error) {
    console.error('Error fetching article blueprints:', error);
    throw error;
  }

  return data || [];
}

/**
 * Save article blueprint
 */
export async function saveArticleBlueprint(
  topicId: string,
  topicalMapId: string,
  blueprint: LayoutBlueprint
): Promise<ArticleBlueprintRow> {
  const row = {
    topic_id: topicId,
    topical_map_id: topicalMapId,
    blueprint: blueprint,
    visual_style: blueprint.pageStrategy.visualStyle,
    pacing: blueprint.pageStrategy.pacing,
    sections_count: blueprint.sections.length,
    components_used: [...new Set(blueprint.sections.map(s => s.presentation.component))],
    word_count: blueprint.metadata.wordCount,
    model_used: blueprint.metadata.modelUsed,
    generation_duration_ms: blueprint.metadata.generationDurationMs,
  };

  const { data, error } = await (getClient() as any)
    .from('article_blueprints')
    .upsert(row, { onConflict: 'topic_id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving article blueprint:', error);
    throw error;
  }

  // Save to history
  await saveBlueprintHistory(data.id, blueprint, 'generated', 'Initial blueprint generation');

  return data;
}

/**
 * Update article blueprint with user overrides
 */
export async function updateArticleBlueprintOverrides(
  topicId: string,
  overrides: ArticleBlueprintOverrides
): Promise<ArticleBlueprintRow> {
  const { data, error } = await (getClient() as any)
    .from('article_blueprints')
    .update({
      user_overrides: overrides,
    })
    .eq('topic_id', topicId)
    .select()
    .single();

  if (error) {
    console.error('Error updating article blueprint overrides:', error);
    throw error;
  }

  // Save to history
  await saveBlueprintHistory(data.id, data.blueprint, 'refined', 'User refinement applied');

  return data;
}

/**
 * Delete article blueprint
 */
export async function deleteArticleBlueprint(topicId: string): Promise<void> {
  const { error } = await (getClient() as any)
    .from('article_blueprints')
    .delete()
    .eq('topic_id', topicId);

  if (error) {
    console.error('Error deleting article blueprint:', error);
    throw error;
  }
}

// ============================================================================
// BLUEPRINT HISTORY
// ============================================================================

/**
 * Save blueprint to history
 */
async function saveBlueprintHistory(
  articleBlueprintId: string,
  blueprint: LayoutBlueprint,
  changeType: 'generated' | 'refined' | 'bulk_update' | 'manual_edit' | 'reverted',
  description?: string
): Promise<void> {
  const { error } = await (getClient() as any)
    .from('blueprint_history')
    .insert({
      article_blueprint_id: articleBlueprintId,
      blueprint_snapshot: blueprint,
      change_type: changeType,
      change_description: description,
    });

  if (error) {
    console.error('Error saving blueprint history:', error);
    // Don't throw - history is nice to have but not critical
  }
}

/**
 * Get blueprint history for an article
 */
export async function getBlueprintHistory(topicId: string): Promise<Array<{
  id: string;
  blueprint_snapshot: LayoutBlueprint;
  change_type: string;
  change_description: string | null;
  created_at: string;
}>> {
  // First get the article blueprint ID
  const articleBlueprint = await getArticleBlueprint(topicId);
  if (!articleBlueprint) return [];

  const { data, error } = await (getClient() as any)
    .from('blueprint_history')
    .select('*')
    .eq('article_blueprint_id', articleBlueprint.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching blueprint history:', error);
    throw error;
  }

  return data || [];
}

/**
 * Revert to a previous blueprint version
 */
export async function revertToHistory(
  topicId: string,
  historyId: string
): Promise<ArticleBlueprintRow> {
  // Get the history entry
  const { data: history, error: historyError } = await (getClient() as any)
    .from('blueprint_history')
    .select('*')
    .eq('id', historyId)
    .single();

  if (historyError || !history) {
    throw new Error('History entry not found');
  }

  // Update the article blueprint
  const { data, error } = await (getClient() as any)
    .from('article_blueprints')
    .update({
      blueprint: history.blueprint_snapshot,
      visual_style: history.blueprint_snapshot.pageStrategy.visualStyle,
      pacing: history.blueprint_snapshot.pageStrategy.pacing,
      sections_count: history.blueprint_snapshot.sections.length,
      components_used: [...new Set(history.blueprint_snapshot.sections.map((s: any) => s.presentation.component))],
      user_overrides: history.user_overrides_snapshot || null,
    })
    .eq('topic_id', topicId)
    .select()
    .single();

  if (error) {
    console.error('Error reverting blueprint:', error);
    throw error;
  }

  // Save revert to history
  await saveBlueprintHistory(data.id, history.blueprint_snapshot, 'reverted', `Reverted to version from ${history.created_at}`);

  return data;
}

// ============================================================================
// BLUEPRINT HIERARCHY RESOLUTION
// ============================================================================

/**
 * Get effective blueprint settings by merging hierarchy
 * (project defaults → topical map overrides → article specifics)
 */
export async function getEffectiveSettings(
  topicId: string,
  topicalMapId: string,
  projectId: string
): Promise<{
  visualStyle: VisualStyle;
  pacing: ContentPacing;
  colorIntensity: ColorIntensity;
  ctaStrategy: {
    positions: string[];
    intensity: string;
    style: string;
  };
  componentPreferences: Record<string, unknown>;
  avoidComponents: string[];
}> {
  // Get all levels
  const [projectBlueprint, mapBlueprint, articleBlueprint] = await Promise.all([
    getProjectBlueprint(projectId),
    getTopicalMapBlueprint(topicalMapId),
    getArticleBlueprint(topicId),
  ]);

  // Start with defaults
  let result = {
    visualStyle: 'editorial' as VisualStyle,
    pacing: 'balanced' as ContentPacing,
    colorIntensity: 'moderate' as ColorIntensity,
    ctaStrategy: {
      positions: ['end'],
      intensity: 'moderate',
      style: 'banner',
    },
    componentPreferences: {} as Record<string, unknown>,
    avoidComponents: [] as string[],
  };

  // Apply project level
  if (projectBlueprint) {
    result = {
      visualStyle: projectBlueprint.visual_style,
      pacing: projectBlueprint.pacing,
      colorIntensity: projectBlueprint.color_intensity,
      ctaStrategy: {
        positions: projectBlueprint.cta_positions,
        intensity: projectBlueprint.cta_intensity,
        style: projectBlueprint.cta_style,
      },
      componentPreferences: projectBlueprint.component_preferences,
      avoidComponents: projectBlueprint.avoid_components,
    };
  }

  // Apply topical map overrides (only non-null values)
  if (mapBlueprint) {
    if (mapBlueprint.visual_style) result.visualStyle = mapBlueprint.visual_style;
    if (mapBlueprint.pacing) result.pacing = mapBlueprint.pacing;
    if (mapBlueprint.color_intensity) result.colorIntensity = mapBlueprint.color_intensity;
    if (mapBlueprint.cta_positions) result.ctaStrategy.positions = mapBlueprint.cta_positions;
    if (mapBlueprint.cta_intensity) result.ctaStrategy.intensity = mapBlueprint.cta_intensity;
    if (mapBlueprint.cta_style) result.ctaStrategy.style = mapBlueprint.cta_style;
    if (mapBlueprint.component_preferences) {
      result.componentPreferences = { ...result.componentPreferences, ...mapBlueprint.component_preferences };
    }
  }

  // Article blueprint overrides would be applied at render time from articleBlueprint.user_overrides

  return result;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Apply a component change to all articles in a topical map
 */
export async function bulkUpdateComponent(
  topicalMapId: string,
  fromComponent: ComponentType,
  toComponent: ComponentType
): Promise<number> {
  // Get all article blueprints for this map
  const blueprints = await getArticleBlueprintsForMap(topicalMapId);

  let updatedCount = 0;

  for (const bp of blueprints) {
    const blueprint = bp.blueprint;
    let modified = false;

    // Update sections that use the source component
    const updatedSections = blueprint.sections.map(section => {
      if (section.presentation.component === fromComponent) {
        modified = true;
        return {
          ...section,
          presentation: {
            ...section.presentation,
            component: toComponent,
          },
        };
      }
      return section;
    });

    if (modified) {
      const updatedBlueprint = {
        ...blueprint,
        sections: updatedSections,
      };

      await (getClient() as any)
        .from('article_blueprints')
        .update({
          blueprint: updatedBlueprint,
          components_used: [...new Set(updatedSections.map(s => s.presentation.component))],
        })
        .eq('id', bp.id);

      await saveBlueprintHistory(bp.id, updatedBlueprint, 'bulk_update', `Bulk update: ${fromComponent} → ${toComponent}`);
      updatedCount++;
    }
  }

  return updatedCount;
}

// Types are already exported with their interface declarations above
