/**
 * Design Inheritance Service
 *
 * Manages the hierarchical design inheritance system:
 * Project → Topical Map → Article
 *
 * Each level can:
 * - Inherit from parent level
 * - Override specific settings
 * - Opt out of inheritance entirely
 *
 * @module services/publishing/designInheritance/DesignInheritanceService
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DesignTokens,
  DesignPreferences,
  DesignFeedback,
  DesignInheritance,
  ResolvedDesignSettings,
} from '../../../types/publishing';

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

export interface DesignProfileRow {
  id: string;
  project_id: string;
  name: string;
  target_url: string | null;
  screenshot_url: string | null;
  brand_discovery: Record<string, unknown>;
  user_overrides: Record<string, unknown>;
  final_tokens: DesignTokens;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectDesignDefaultsRow {
  id: string;
  project_id: string;
  design_profile_id: string | null;
  default_personality: string;
  component_preferences: Record<string, string>;
  spacing_preference: string;
  visual_intensity: string;
  created_at: string;
  updated_at: string;
}

export interface TopicalMapDesignRulesRow {
  id: string;
  topical_map_id: string;
  project_id: string;
  inherit_from_project: boolean;
  overrides: Record<string, unknown>;
  cluster_rules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

export interface DesignInheritanceConfig {
  supabase: SupabaseClient;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_PREFERENCES: DesignPreferences = {
  layoutPatterns: {},
  visualRhythm: {
    defaultPacing: 'balanced',
    breathingRoomScale: 1.0,
  },
  componentOverrides: {},
};

const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    primary: '#3B82F6',
    secondary: '#6366F1',
    accent: '#F59E0B',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
  spacing: {
    sectionGap: 'normal',
    contentWidth: 'standard',
    paragraphSpacing: 'normal',
  },
  borderRadius: 'rounded',
  shadows: 'subtle',
  typography: {
    headingWeight: 'semibold',
    bodyLineHeight: 'normal',
    headingLineHeight: 'tight',
  },
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DesignInheritanceService {
  private supabase: SupabaseClient;

  constructor(config: DesignInheritanceConfig) {
    this.supabase = config.supabase;
  }

  // --------------------------------------------------------------------------
  // LOAD OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Load the active design profile for a project
   */
  async getActiveDesignProfile(projectId: string): Promise<DesignProfileRow | null> {
    const { data, error } = await this.supabase
      .from('design_profiles')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as DesignProfileRow;
  }

  /**
   * Load project design defaults
   */
  async getProjectDefaults(projectId: string): Promise<ProjectDesignDefaultsRow | null> {
    const { data, error } = await this.supabase
      .from('project_design_defaults')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as ProjectDesignDefaultsRow;
  }

  /**
   * Load topical map design rules
   */
  async getTopicalMapRules(topicalMapId: string): Promise<TopicalMapDesignRulesRow | null> {
    const { data, error } = await this.supabase
      .from('topical_map_design_rules')
      .select('*')
      .eq('topical_map_id', topicalMapId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as TopicalMapDesignRulesRow;
  }

  // --------------------------------------------------------------------------
  // INHERITANCE RESOLUTION
  // --------------------------------------------------------------------------

  /**
   * Load and resolve the complete design inheritance hierarchy
   */
  async loadInheritanceHierarchy(
    projectId: string,
    topicalMapId?: string,
    articleId?: string
  ): Promise<DesignInheritance> {
    // Load project level
    const [profile, projectDefaults] = await Promise.all([
      this.getActiveDesignProfile(projectId),
      this.getProjectDefaults(projectId),
    ]);

    const inheritance: DesignInheritance = {
      projectLevel: {
        designProfileId: profile?.id || '',
        preferences: this.projectDefaultsToPreferences(projectDefaults),
      },
    };

    // Load topical map level if provided
    if (topicalMapId) {
      const mapRules = await this.getTopicalMapRules(topicalMapId);

      if (mapRules) {
        inheritance.topicalMapLevel = {
          topicalMapId,
          preferences: this.overridesToPreferences(mapRules.overrides),
          feedback: [],
        };
      }
    }

    // Article level would be loaded from a separate table or passed in
    // For now, we don't have article-level storage

    return inheritance;
  }

  /**
   * Resolve final design settings by merging all inheritance levels
   */
  async resolveDesignSettings(
    projectId: string,
    topicalMapId?: string,
    articleOverrides?: Partial<DesignPreferences>
  ): Promise<ResolvedDesignSettings> {
    // Load profile for tokens
    const profile = await this.getActiveDesignProfile(projectId);
    const tokens = profile?.final_tokens || DEFAULT_TOKENS;

    // Load inheritance hierarchy
    const hierarchy = await this.loadInheritanceHierarchy(projectId, topicalMapId);

    // Start with project preferences
    let mergedPreferences = { ...hierarchy.projectLevel.preferences };
    let preferencesSource: 'project' | 'topicalMap' | 'article' = 'project';

    // Merge topical map overrides
    if (hierarchy.topicalMapLevel) {
      mergedPreferences = this.mergePreferences(
        mergedPreferences,
        hierarchy.topicalMapLevel.preferences
      );
      if (Object.keys(hierarchy.topicalMapLevel.preferences).length > 0) {
        preferencesSource = 'topicalMap';
      }
    }

    // Merge article overrides
    if (articleOverrides && Object.keys(articleOverrides).length > 0) {
      mergedPreferences = this.mergePreferences(mergedPreferences, articleOverrides);
      preferencesSource = 'article';
    }

    return {
      tokens,
      preferences: mergedPreferences,
      inheritanceSource: {
        tokens: 'project', // Tokens always come from project profile
        preferences: preferencesSource,
      },
    };
  }

  // --------------------------------------------------------------------------
  // SAVE OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Save or update project design defaults
   */
  async saveProjectDefaults(
    projectId: string,
    defaults: Partial<ProjectDesignDefaultsRow>
  ): Promise<void> {
    const existing = await this.getProjectDefaults(projectId);

    if (existing) {
      await this.supabase
        .from('project_design_defaults')
        .update({
          ...defaults,
          updated_at: new Date().toISOString(),
        })
        .eq('project_id', projectId);
    } else {
      await this.supabase
        .from('project_design_defaults')
        .insert({
          project_id: projectId,
          ...defaults,
        });
    }
  }

  /**
   * Save or update topical map design rules
   */
  async saveTopicalMapRules(
    topicalMapId: string,
    projectId: string,
    rules: Partial<TopicalMapDesignRulesRow>
  ): Promise<void> {
    const existing = await this.getTopicalMapRules(topicalMapId);

    if (existing) {
      await this.supabase
        .from('topical_map_design_rules')
        .update({
          ...rules,
          updated_at: new Date().toISOString(),
        })
        .eq('topical_map_id', topicalMapId);
    } else {
      await this.supabase
        .from('topical_map_design_rules')
        .insert({
          topical_map_id: topicalMapId,
          project_id: projectId,
          ...rules,
        });
    }
  }

  /**
   * Record design feedback for learning
   */
  async recordFeedback(
    projectId: string,
    feedback: DesignFeedback
  ): Promise<void> {
    await this.supabase.from('design_preferences').upsert(
      {
        project_id: projectId,
        preference_type: feedback.feedbackType,
        context: `section_${feedback.sectionIndex}`,
        choice: feedback.chosenComponent,
        frequency: 1,
        last_used: feedback.timestamp,
      },
      {
        onConflict: 'project_id,preference_type,context',
        ignoreDuplicates: false,
      }
    );

    // If conflict, increment frequency
    await this.supabase.rpc('increment_design_preference_frequency', {
      p_project_id: projectId,
      p_preference_type: feedback.feedbackType,
      p_context: `section_${feedback.sectionIndex}`,
    });
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  /**
   * Convert project defaults row to DesignPreferences
   */
  private projectDefaultsToPreferences(
    defaults: ProjectDesignDefaultsRow | null
  ): DesignPreferences {
    if (!defaults) {
      return DEFAULT_PREFERENCES;
    }

    return {
      layoutPatterns: defaults.component_preferences || {},
      visualRhythm: {
        defaultPacing: this.spacingToPacing(defaults.spacing_preference),
        breathingRoomScale: this.intensityToScale(defaults.visual_intensity),
      },
      componentOverrides: {},
    };
  }

  /**
   * Convert generic overrides to DesignPreferences
   */
  private overridesToPreferences(
    overrides: Record<string, unknown>
  ): Partial<DesignPreferences> {
    const result: Partial<DesignPreferences> = {};

    if (overrides.layoutPatterns) {
      result.layoutPatterns = overrides.layoutPatterns as Record<string, string>;
    }

    if (overrides.visualRhythm) {
      result.visualRhythm = overrides.visualRhythm as DesignPreferences['visualRhythm'];
    }

    if (overrides.componentOverrides) {
      result.componentOverrides = overrides.componentOverrides as Record<
        string,
        Partial<Record<string, string>>
      >;
    }

    return result;
  }

  /**
   * Merge preferences, with later values overriding earlier
   */
  private mergePreferences(
    base: DesignPreferences,
    overrides: Partial<DesignPreferences>
  ): DesignPreferences {
    return {
      layoutPatterns: {
        ...base.layoutPatterns,
        ...(overrides.layoutPatterns || {}),
      },
      visualRhythm: {
        ...base.visualRhythm,
        ...(overrides.visualRhythm || {}),
      },
      componentOverrides: {
        ...base.componentOverrides,
        ...(overrides.componentOverrides || {}),
      },
    };
  }

  /**
   * Convert spacing preference to pacing
   */
  private spacingToPacing(spacing: string): 'dense' | 'balanced' | 'spacious' {
    switch (spacing) {
      case 'compact':
        return 'dense';
      case 'generous':
        return 'spacious';
      default:
        return 'balanced';
    }
  }

  /**
   * Convert visual intensity to scale
   */
  private intensityToScale(intensity: string): number {
    switch (intensity) {
      case 'minimal':
        return 0.75;
      case 'high':
        return 1.25;
      default:
        return 1.0;
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let serviceInstance: DesignInheritanceService | null = null;

/**
 * Initialize the design inheritance service with Supabase client
 */
export function initDesignInheritanceService(
  supabase: SupabaseClient
): DesignInheritanceService {
  serviceInstance = new DesignInheritanceService({ supabase });
  return serviceInstance;
}

/**
 * Get the initialized service instance
 */
export function getDesignInheritanceService(): DesignInheritanceService {
  if (!serviceInstance) {
    throw new Error(
      'DesignInheritanceService not initialized. Call initDesignInheritanceService first.'
    );
  }
  return serviceInstance;
}

export default DesignInheritanceService;
