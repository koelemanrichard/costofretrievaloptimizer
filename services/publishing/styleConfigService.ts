/**
 * Style Configuration Service
 *
 * Handles CRUD operations for publishing styles including:
 * - Creating and managing project-level styles
 * - Converting BrandKit to design tokens
 * - Managing style presets
 *
 * @module services/publishing/styleConfigService
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  PublishingStyle,
  DesignTokens,
  PublishingStyleRow,
  CssVariables,
} from '../../types/publishing';
import type { BrandKit } from '../../types/business';
import { defaultDesignTokens, stylePresets, applyPresetToTokens } from '../../config/publishingTemplates';

// ============================================================================
// BrandKit Conversion
// ============================================================================

/**
 * Convert BrandKit to design tokens
 * Extends BrandKit colors/fonts with additional publishing tokens
 */
export function brandKitToDesignTokens(brandKit: BrandKit | undefined): DesignTokens {
  if (!brandKit) {
    return defaultDesignTokens;
  }

  return {
    colors: {
      primary: brandKit.colors?.primary || defaultDesignTokens.colors.primary,
      secondary: brandKit.colors?.secondary || defaultDesignTokens.colors.secondary,
      accent: brandKit.colors?.primary || defaultDesignTokens.colors.accent, // Use primary as accent fallback
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
      heading: brandKit.fonts?.heading || defaultDesignTokens.fonts.heading,
      body: brandKit.fonts?.body || defaultDesignTokens.fonts.body,
      mono: defaultDesignTokens.fonts.mono,
    },
    spacing: defaultDesignTokens.spacing,
    borderRadius: defaultDesignTokens.borderRadius,
    shadows: defaultDesignTokens.shadows,
    typography: defaultDesignTokens.typography,
  };
}

/**
 * Generate CSS variables from design tokens
 */
export function designTokensToCssVariables(tokens: DesignTokens): CssVariables {
  // Map spacing values to CSS
  const sectionGapMap = {
    compact: '2rem',
    normal: '3rem',
    spacious: '4rem',
  };

  const contentWidthMap = {
    narrow: '640px',
    standard: '768px',
    wide: '1024px',
    full: '100%',
  };

  const borderRadiusMap = {
    none: '0',
    subtle: '0.25rem',
    rounded: '0.5rem',
    pill: '9999px',
  };

  const shadowMap = {
    none: 'none',
    subtle: '0 1px 2px rgba(0,0,0,0.05)',
    medium: '0 4px 6px -1px rgba(0,0,0,0.1)',
    dramatic: '0 10px 15px -3px rgba(0,0,0,0.1)',
  };

  return {
    '--ctc-primary': tokens.colors.primary,
    '--ctc-secondary': tokens.colors.secondary,
    '--ctc-accent': tokens.colors.accent,
    '--ctc-background': tokens.colors.background,
    '--ctc-surface': tokens.colors.surface,
    '--ctc-text': tokens.colors.text,
    '--ctc-text-muted': tokens.colors.textMuted,
    '--ctc-border': tokens.colors.border,
    '--ctc-font-heading': tokens.fonts.heading,
    '--ctc-font-body': tokens.fonts.body,
    '--ctc-font-mono': tokens.fonts.mono || 'monospace',
    '--ctc-radius': borderRadiusMap[tokens.borderRadius],
    '--ctc-shadow': shadowMap[tokens.shadows],
    '--ctc-section-gap': sectionGapMap[tokens.spacing.sectionGap],
    '--ctc-content-width': contentWidthMap[tokens.spacing.contentWidth],
  };
}

/**
 * Generate CSS string from CSS variables
 */
export function cssVariablesToString(variables: CssVariables): string {
  const entries = Object.entries(variables)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `:root {\n${entries}\n}`;
}

// ============================================================================
// Style CRUD Operations
// ============================================================================

/**
 * Create a new publishing style for a project
 */
export async function createPublishingStyle(
  supabase: SupabaseClient,
  projectId: string,
  name: string,
  designTokens: DesignTokens,
  isDefault: boolean = false,
  sourceUrl?: string
): Promise<PublishingStyle | null> {
  // If setting as default, unset any existing default
  if (isDefault) {
    await supabase
      .from('publishing_styles')
      .update({ is_default: false })
      .eq('project_id', projectId);
  }

  const { data, error } = await supabase
    .from('publishing_styles')
    .insert({
      project_id: projectId,
      name,
      is_default: isDefault,
      source_url: sourceUrl || null,
      design_tokens: designTokens,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating publishing style:', error);
    return null;
  }

  return rowToPublishingStyle(data as PublishingStyleRow);
}

/**
 * Get all publishing styles for a project
 */
export async function getProjectStyles(
  supabase: SupabaseClient,
  projectId: string
): Promise<PublishingStyle[]> {
  const { data, error } = await supabase
    .from('publishing_styles')
    .select('*')
    .eq('project_id', projectId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching publishing styles:', error);
    return [];
  }

  return (data as PublishingStyleRow[]).map(rowToPublishingStyle);
}

/**
 * Get default publishing style for a project
 */
export async function getDefaultStyle(
  supabase: SupabaseClient,
  projectId: string
): Promise<PublishingStyle | null> {
  const { data, error } = await supabase
    .from('publishing_styles')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_default', true)
    .single();

  if (error) {
    // If no default, return first style or create one
    if (error.code === 'PGRST116') {
      const styles = await getProjectStyles(supabase, projectId);
      if (styles.length > 0) {
        return styles[0];
      }
      // No styles exist - return null (caller should create default)
      return null;
    }
    console.error('Error fetching default style:', error);
    return null;
  }

  return rowToPublishingStyle(data as PublishingStyleRow);
}

/**
 * Get publishing style by ID
 */
export async function getStyleById(
  supabase: SupabaseClient,
  styleId: string
): Promise<PublishingStyle | null> {
  const { data, error } = await supabase
    .from('publishing_styles')
    .select('*')
    .eq('id', styleId)
    .single();

  if (error) {
    console.error('Error fetching style by id:', error);
    return null;
  }

  return rowToPublishingStyle(data as PublishingStyleRow);
}

/**
 * Update publishing style
 */
export async function updatePublishingStyle(
  supabase: SupabaseClient,
  styleId: string,
  updates: Partial<Pick<PublishingStyle, 'name' | 'designTokens' | 'isDefault' | 'sourceUrl'>>
): Promise<PublishingStyle | null> {
  // If setting as default, unset any existing default
  if (updates.isDefault) {
    const existingStyle = await getStyleById(supabase, styleId);
    if (existingStyle?.projectId) {
      await supabase
        .from('publishing_styles')
        .update({ is_default: false })
        .eq('project_id', existingStyle.projectId)
        .neq('id', styleId);
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.designTokens !== undefined) updateData.design_tokens = updates.designTokens;
  if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;
  if (updates.sourceUrl !== undefined) updateData.source_url = updates.sourceUrl;

  const { data, error } = await supabase
    .from('publishing_styles')
    .update(updateData)
    .eq('id', styleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating publishing style:', error);
    return null;
  }

  return rowToPublishingStyle(data as PublishingStyleRow);
}

/**
 * Delete publishing style
 */
export async function deletePublishingStyle(
  supabase: SupabaseClient,
  styleId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('publishing_styles')
    .delete()
    .eq('id', styleId);

  if (error) {
    console.error('Error deleting publishing style:', error);
    return false;
  }

  return true;
}

/**
 * Create style from BrandKit
 */
export async function createStyleFromBrandKit(
  supabase: SupabaseClient,
  projectId: string,
  brandKit: BrandKit,
  name: string = 'Brand Style'
): Promise<PublishingStyle | null> {
  const designTokens = brandKitToDesignTokens(brandKit);
  return createPublishingStyle(supabase, projectId, name, designTokens, false);
}

/**
 * Create style from preset
 */
export async function createStyleFromPreset(
  supabase: SupabaseClient,
  projectId: string,
  presetId: string,
  name?: string
): Promise<PublishingStyle | null> {
  const preset = stylePresets.find(p => p.id === presetId);
  if (!preset) {
    console.error('Style preset not found:', presetId);
    return null;
  }

  const designTokens = applyPresetToTokens(defaultDesignTokens, preset);
  return createPublishingStyle(supabase, projectId, name || preset.name, designTokens, false);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database row to PublishingStyle
 */
function rowToPublishingStyle(row: PublishingStyleRow): PublishingStyle {
  return {
    id: row.id,
    name: row.name,
    projectId: row.project_id,
    isDefault: row.is_default,
    sourceUrl: row.source_url || undefined,
    designTokens: row.design_tokens,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create default in-memory style (no database)
 * Use when database operations are not needed
 */
export function createInMemoryStyle(
  brandKit?: BrandKit,
  name: string = 'Default Style'
): PublishingStyle {
  return {
    id: crypto.randomUUID(),
    name,
    isDefault: true,
    designTokens: brandKitToDesignTokens(brandKit),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Merge partial design tokens with defaults
 */
export function mergeDesignTokens(
  base: DesignTokens,
  partial: Partial<DesignTokens>
): DesignTokens {
  return {
    colors: { ...base.colors, ...partial.colors },
    fonts: { ...base.fonts, ...partial.fonts },
    spacing: { ...base.spacing, ...partial.spacing },
    borderRadius: partial.borderRadius ?? base.borderRadius,
    shadows: partial.shadows ?? base.shadows,
    typography: { ...base.typography, ...partial.typography },
  };
}
