// services/contentGenerationSettingsService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import {
  ContentGenerationSettings,
  ContentGenerationSettingsRow,
  ContentGenerationPriorities,
  ContentLengthSettings,
  ContentLengthPreset,
  LengthPresetConfig,
  PRIORITY_PRESETS,
  LENGTH_PRESETS,
  DEFAULT_CONTENT_GENERATION_SETTINGS,
  DEFAULT_CONTENT_LENGTH_SETTINGS,
  settingsRowToInterface,
  settingsToDbInsert
} from '../types/contentGeneration';

/**
 * Topic type for content length adjustments
 */
export type TopicType = 'core' | 'outer' | 'bridge' | 'unknown';

/**
 * Service for managing content generation settings
 */
export class ContentGenerationSettingsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get or create default settings for a user
   */
  async getOrCreateDefaultSettings(userId: string): Promise<ContentGenerationSettings> {
    // Try to get existing default settings
    const { data: existing, error } = await this.supabase
      .from('content_generation_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .is('map_id', null)
      .single();

    if (existing && !error) {
      return settingsRowToInterface(existing as ContentGenerationSettingsRow);
    }

    // Create default settings
    const newSettings = {
      ...DEFAULT_CONTENT_GENERATION_SETTINGS,
      userId
    };

    const { data: created, error: createError } = await this.supabase
      .from('content_generation_settings')
      .insert(settingsToDbInsert(newSettings))
      .select()
      .single();

    if (createError || !created) {
      // Return in-memory defaults if DB fails
      return {
        ...DEFAULT_CONTENT_GENERATION_SETTINGS,
        id: 'default',
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as ContentGenerationSettings;
    }

    return settingsRowToInterface(created as ContentGenerationSettingsRow);
  }

  /**
   * Get settings for a specific map (or fall back to user defaults)
   */
  async getSettingsForMap(userId: string, mapId: string): Promise<ContentGenerationSettings> {
    // Try map-specific settings first
    const { data: mapSettings } = await this.supabase
      .from('content_generation_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('map_id', mapId)
      .single();

    if (mapSettings) {
      return settingsRowToInterface(mapSettings as ContentGenerationSettingsRow);
    }

    // Fall back to user defaults
    return this.getOrCreateDefaultSettings(userId);
  }

  /**
   * Save settings
   */
  async saveSettings(settings: ContentGenerationSettings): Promise<ContentGenerationSettings> {
    const dbData = settingsToDbInsert(settings);

    const { data, error } = await this.supabase
      .from('content_generation_settings')
      .update(dbData)
      .eq('id', settings.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save settings: ${error?.message}`);
    }

    return settingsRowToInterface(data as ContentGenerationSettingsRow);
  }

  /**
   * Save settings for a specific map (upsert).
   * If map-specific settings already exist, update them.
   * If not, create a new row tied to this map.
   */
  async saveSettingsForMap(
    userId: string,
    mapId: string,
    settings: ContentGenerationSettings
  ): Promise<ContentGenerationSettings> {
    // Check if map-specific settings already exist
    const { data: existing } = await this.supabase
      .from('content_generation_settings')
      .select('id')
      .eq('user_id', userId)
      .eq('map_id', mapId)
      .single();

    const dbData = settingsToDbInsert({ ...settings, userId, mapId });

    if (existing) {
      // Update existing map-specific settings
      const { data, error } = await this.supabase
        .from('content_generation_settings')
        .update(dbData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Failed to update map settings: ${error?.message}`);
      }
      return settingsRowToInterface(data as ContentGenerationSettingsRow);
    } else {
      // Create new map-specific settings (not a default row)
      const { data, error } = await this.supabase
        .from('content_generation_settings')
        .insert({ ...dbData, is_default: false })
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Failed to create map settings: ${error?.message}`);
      }
      return settingsRowToInterface(data as ContentGenerationSettingsRow);
    }
  }

  /**
   * Apply a preset to settings
   */
  applyPreset(
    settings: ContentGenerationSettings,
    presetKey: keyof typeof PRIORITY_PRESETS
  ): ContentGenerationSettings {
    return {
      ...settings,
      priorities: { ...PRIORITY_PRESETS[presetKey] }
    };
  }

  /**
   * Get all presets
   */
  getPresets(): Record<string, ContentGenerationPriorities> {
    return PRIORITY_PRESETS;
  }

  /**
   * Get all length presets
   */
  getLengthPresets(): Record<ContentLengthPreset, LengthPresetConfig> {
    return LENGTH_PRESETS;
  }

  /**
   * Apply a length preset to settings
   */
  applyLengthPreset(
    settings: ContentGenerationSettings,
    preset: ContentLengthPreset
  ): ContentGenerationSettings {
    return {
      ...settings,
      contentLength: {
        ...settings.contentLength,
        preset,
        // Clear user overrides when switching presets
        targetWordCount: undefined,
        maxSections: undefined
      }
    };
  }

  /**
   * Calculate effective word count based on settings, topic type, and SERP data
   *
   * Priority order:
   * 1. User's targetWordCount override (highest priority)
   * 2. Topic type adjustment (if respectTopicType is true)
   * 3. Preset target (or SERP average for 'standard' preset)
   *
   * @param settings - Content generation settings
   * @param topicType - Type of topic (core, outer, bridge)
   * @param serpAvgWordCount - Average word count from SERP competitor analysis
   * @returns Effective target word count
   */
  getEffectiveWordCount(
    settings: ContentGenerationSettings,
    topicType: TopicType = 'unknown',
    serpAvgWordCount?: number
  ): number {
    const lengthSettings = settings.contentLength ?? DEFAULT_CONTENT_LENGTH_SETTINGS;
    const preset = LENGTH_PRESETS[lengthSettings.preset];

    // Priority 1: User override takes precedence
    if (lengthSettings.targetWordCount !== undefined) {
      return lengthSettings.targetWordCount;
    }

    // Priority 2: Auto-adjust for topic type
    if (lengthSettings.respectTopicType && topicType !== 'unknown') {
      const suggestedPreset = this.getSuggestedPresetForTopicType(topicType);
      if (suggestedPreset !== lengthSettings.preset) {
        // Return the suggested preset's target if topic type suggests different
        const suggestedConfig = LENGTH_PRESETS[suggestedPreset];
        if (suggestedConfig.targetWords !== 'serp') {
          return suggestedConfig.targetWords;
        }
      }
    }

    // Priority 3: Use preset target
    if (preset.targetWords === 'serp') {
      // For 'standard' preset, use SERP average or sensible default
      return serpAvgWordCount ?? 1200;
    }

    return preset.targetWords;
  }

  /**
   * Calculate effective max sections based on settings and topic type
   */
  getEffectiveMaxSections(
    settings: ContentGenerationSettings,
    topicType: TopicType = 'unknown'
  ): number {
    const lengthSettings = settings.contentLength ?? DEFAULT_CONTENT_LENGTH_SETTINGS;
    const preset = LENGTH_PRESETS[lengthSettings.preset];

    // User override takes precedence
    if (lengthSettings.maxSections !== undefined) {
      return lengthSettings.maxSections;
    }

    // Auto-adjust for topic type
    if (lengthSettings.respectTopicType && topicType !== 'unknown') {
      const suggestedPreset = this.getSuggestedPresetForTopicType(topicType);
      return LENGTH_PRESETS[suggestedPreset].maxSections;
    }

    return preset.maxSections;
  }

  /**
   * Get section word count range based on settings
   */
  getSectionWordRange(
    settings: ContentGenerationSettings,
    topicType: TopicType = 'unknown'
  ): { min: number; max: number } {
    const lengthSettings = settings.contentLength ?? DEFAULT_CONTENT_LENGTH_SETTINGS;
    const preset = LENGTH_PRESETS[lengthSettings.preset];

    // Auto-adjust for topic type
    if (lengthSettings.respectTopicType && topicType !== 'unknown') {
      const suggestedPreset = this.getSuggestedPresetForTopicType(topicType);
      return LENGTH_PRESETS[suggestedPreset].sectionWordRange;
    }

    return preset.sectionWordRange;
  }

  /**
   * Get suggested length preset based on topic type
   * Per Korayanese framework:
   * - Core topics (monetization): comprehensive
   * - Outer topics (authority building): short
   * - Bridge topics (contextual links): minimal
   */
  getSuggestedPresetForTopicType(topicType: TopicType): ContentLengthPreset {
    switch (topicType) {
      case 'core':
        return 'comprehensive';
      case 'outer':
        return 'short';
      case 'bridge':
        return 'minimal';
      default:
        return 'standard';
    }
  }

  /**
   * Check if AI should suggest a different length preset
   * Returns the suggested preset if different from current, or null if no suggestion
   */
  shouldSuggestDifferentLength(
    settings: ContentGenerationSettings,
    topicType: TopicType
  ): { suggestedPreset: ContentLengthPreset; reason: string } | null {
    const currentPreset = settings.contentLength?.preset ?? 'standard';
    const suggestedPreset = this.getSuggestedPresetForTopicType(topicType);

    // Don't suggest if topic type is unknown
    if (topicType === 'unknown') {
      return null;
    }

    // Don't suggest if user has explicit override
    if (settings.contentLength?.targetWordCount !== undefined) {
      return null;
    }

    // Don't suggest if already using the suggested preset
    if (currentPreset === suggestedPreset) {
      return null;
    }

    // Generate reason message
    const reasons: Record<TopicType, string> = {
      core: 'This is a CORE topic (monetization). Comprehensive content (2000+ words) is recommended to cover all user criteria.',
      outer: 'This is an OUTER topic (authority building). Shorter content (600 words) is recommended - flat & informative, not deep.',
      bridge: 'This is a BRIDGE topic (contextual link). Minimal content (350 words) is sufficient to complete the semantic network.',
      unknown: ''
    };

    return {
      suggestedPreset,
      reason: reasons[topicType]
    };
  }
}
