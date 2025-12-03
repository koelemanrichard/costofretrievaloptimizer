// services/contentGenerationSettingsService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import {
  ContentGenerationSettings,
  ContentGenerationSettingsRow,
  ContentGenerationPriorities,
  PRIORITY_PRESETS,
  DEFAULT_CONTENT_GENERATION_SETTINGS,
  settingsRowToInterface,
  settingsToDbInsert
} from '../types/contentGeneration';

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
}
