/**
 * Layout Configuration Service
 *
 * Handles CRUD operations for layout templates including:
 * - Creating and managing user-level layout templates
 * - Managing project-specific layout overrides
 * - Template component configuration
 *
 * @module services/publishing/layoutConfigService
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  LayoutConfiguration,
  LayoutTemplateRow,
  ContentTypeTemplate,
  ComponentConfig,
  TemplateComponentCount,
} from '../../types/publishing';
import { getDefaultComponents, contentTemplates } from '../../config/publishingTemplates';

// ============================================================================
// Layout CRUD Operations
// ============================================================================

/**
 * Create a new layout template for a user
 */
export async function createLayoutTemplate(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  templateType: ContentTypeTemplate,
  components: ComponentConfig,
  isDefault: boolean = false
): Promise<LayoutConfiguration | null> {
  // If setting as default for this template type, unset existing
  if (isDefault) {
    await supabase
      .from('layout_templates')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('template_type', templateType);
  }

  const { data, error } = await supabase
    .from('layout_templates')
    .insert({
      user_id: userId,
      name,
      template_type: templateType,
      layout_config: { components },
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating layout template:', error);
    return null;
  }

  return rowToLayoutConfiguration(data as LayoutTemplateRow);
}

/**
 * Get all layout templates for a user
 */
export async function getUserLayoutTemplates(
  supabase: SupabaseClient,
  userId: string
): Promise<LayoutConfiguration[]> {
  const { data, error } = await supabase
    .from('layout_templates')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching layout templates:', error);
    return [];
  }

  return (data as LayoutTemplateRow[]).map(rowToLayoutConfiguration);
}

/**
 * Get layout templates by template type
 */
export async function getLayoutTemplatesByType(
  supabase: SupabaseClient,
  userId: string,
  templateType: ContentTypeTemplate
): Promise<LayoutConfiguration[]> {
  const { data, error } = await supabase
    .from('layout_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('template_type', templateType)
    .order('is_default', { ascending: false });

  if (error) {
    console.error('Error fetching layout templates by type:', error);
    return [];
  }

  return (data as LayoutTemplateRow[]).map(rowToLayoutConfiguration);
}

/**
 * Get default layout template for a template type
 */
export async function getDefaultLayoutTemplate(
  supabase: SupabaseClient,
  userId: string,
  templateType: ContentTypeTemplate
): Promise<LayoutConfiguration | null> {
  const { data, error } = await supabase
    .from('layout_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('template_type', templateType)
    .eq('is_default', true)
    .single();

  if (error) {
    // If no default found, return first template or built-in default
    if (error.code === 'PGRST116') {
      const templates = await getLayoutTemplatesByType(supabase, userId, templateType);
      if (templates.length > 0) {
        return templates[0];
      }
      // Return built-in default (no database record)
      return createInMemoryLayout(templateType);
    }
    console.error('Error fetching default layout template:', error);
    return null;
  }

  return rowToLayoutConfiguration(data as LayoutTemplateRow);
}

/**
 * Get layout template by ID
 */
export async function getLayoutTemplateById(
  supabase: SupabaseClient,
  templateId: string
): Promise<LayoutConfiguration | null> {
  const { data, error } = await supabase
    .from('layout_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching layout template by id:', error);
    return null;
  }

  return rowToLayoutConfiguration(data as LayoutTemplateRow);
}

/**
 * Update layout template
 */
export async function updateLayoutTemplate(
  supabase: SupabaseClient,
  templateId: string,
  updates: Partial<Pick<LayoutConfiguration, 'name' | 'components' | 'isDefault'>>
): Promise<LayoutConfiguration | null> {
  // If setting as default, unset any existing default
  if (updates.isDefault) {
    const existingTemplate = await getLayoutTemplateById(supabase, templateId);
    if (existingTemplate?.userId) {
      await supabase
        .from('layout_templates')
        .update({ is_default: false })
        .eq('user_id', existingTemplate.userId)
        .eq('template_type', existingTemplate.template)
        .neq('id', templateId);
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.components !== undefined) updateData.layout_config = { components: updates.components };
  if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

  const { data, error } = await supabase
    .from('layout_templates')
    .update(updateData)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating layout template:', error);
    return null;
  }

  return rowToLayoutConfiguration(data as LayoutTemplateRow);
}

/**
 * Delete layout template
 */
export async function deleteLayoutTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('layout_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting layout template:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Component Configuration Helpers
// ============================================================================

/**
 * Count enabled components in a configuration
 */
export function countEnabledComponents(components: ComponentConfig): TemplateComponentCount {
  let total = 0;
  let enabled = 0;
  const categories = {
    layout: 0,
    content: 0,
    conversion: 0,
    experience: 0,
  };

  // Layout components
  const layoutComponents = ['hero', 'toc', 'authorBox'] as const;
  for (const key of layoutComponents) {
    total++;
    if (components[key]?.enabled) {
      enabled++;
      categories.layout++;
    }
  }

  // Content components
  const contentComponents = ['keyTakeaways', 'faq', 'relatedContent'] as const;
  for (const key of contentComponents) {
    total++;
    if (components[key]?.enabled) {
      enabled++;
      categories.content++;
    }
  }

  // Conversion components
  if (components.ctaBanners) {
    total++;
    if (components.ctaBanners.enabled) {
      enabled++;
      categories.conversion++;
    }
  }

  // Experience components
  const experienceComponents = ['progressBar', 'estimatedReadTime', 'socialShare'] as const;
  for (const key of experienceComponents) {
    total++;
    if (components.readingExperience?.[key]) {
      enabled++;
      categories.experience++;
    }
  }

  // Template-specific components
  if (components.product) {
    const productComponents = ['specsTable', 'gallery', 'reviews', 'pricing'] as const;
    for (const key of productComponents) {
      total++;
      if (components.product[key]?.enabled) {
        enabled++;
        categories.content++;
      }
    }
  }

  if (components.landing) {
    const landingComponents = ['benefits', 'processSteps', 'testimonials', 'socialProof'] as const;
    for (const key of landingComponents) {
      total++;
      if (components.landing[key]?.enabled) {
        enabled++;
        categories.conversion++;
      }
    }
  }

  if (components.service) {
    const serviceComponents = ['processSteps', 'team', 'portfolio', 'contactCta'] as const;
    for (const key of serviceComponents) {
      total++;
      if (components.service[key]?.enabled) {
        enabled++;
        categories.content++;
      }
    }
  }

  return { total, enabled, categories };
}

/**
 * Toggle a specific component in the configuration
 */
export function toggleComponent(
  components: ComponentConfig,
  componentPath: string,
  enabled: boolean
): ComponentConfig {
  const clone = JSON.parse(JSON.stringify(components)) as ComponentConfig;
  const parts = componentPath.split('.');

  // Navigate to the component and toggle enabled
  let current: Record<string, unknown> = clone as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (typeof current[lastPart] === 'object' && current[lastPart] !== null) {
    (current[lastPart] as Record<string, unknown>).enabled = enabled;
  } else if (typeof current[lastPart] === 'boolean') {
    current[lastPart] = enabled;
  }

  return clone;
}

/**
 * Update a specific component configuration
 */
export function updateComponentConfig<K extends keyof ComponentConfig>(
  components: ComponentConfig,
  componentKey: K,
  updates: Partial<ComponentConfig[K]>
): ComponentConfig {
  return {
    ...components,
    [componentKey]: {
      ...components[componentKey],
      ...updates,
    },
  };
}

/**
 * Reset components to template defaults
 */
export function resetToTemplateDefaults(templateType: ContentTypeTemplate): ComponentConfig {
  return getDefaultComponents(templateType);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database row to LayoutConfiguration
 */
function rowToLayoutConfiguration(row: LayoutTemplateRow): LayoutConfiguration {
  return {
    id: row.id,
    name: row.name,
    userId: row.user_id,
    template: row.template_type,
    components: row.layout_config.components,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create default in-memory layout (no database)
 */
export function createInMemoryLayout(
  templateType: ContentTypeTemplate,
  name?: string
): LayoutConfiguration {
  const templateInfo = contentTemplates.find(t => t.id === templateType);

  return {
    id: crypto.randomUUID(),
    name: name || templateInfo?.name || 'Custom Layout',
    template: templateType,
    components: getDefaultComponents(templateType),
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Clone a layout configuration with new ID
 */
export function cloneLayout(
  layout: LayoutConfiguration,
  newName?: string
): LayoutConfiguration {
  return {
    ...layout,
    id: crypto.randomUUID(),
    name: newName || `${layout.name} (Copy)`,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get template info for a layout
 */
export function getTemplateInfoForLayout(layout: LayoutConfiguration) {
  return contentTemplates.find(t => t.id === layout.template);
}

/**
 * Validate component configuration for a template
 */
export function validateComponentConfig(
  templateType: ContentTypeTemplate,
  components: ComponentConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic structure validation
  if (!components.hero) errors.push('Missing hero configuration');
  if (!components.readingExperience) errors.push('Missing reading experience configuration');

  // Template-specific validation
  if (templateType === 'ecommerce-product' && !components.product) {
    errors.push('Product template requires product component configuration');
  }
  if (templateType === 'landing-page' && !components.landing) {
    errors.push('Landing page template requires landing component configuration');
  }
  if (templateType === 'service-page' && !components.service) {
    errors.push('Service page template requires service component configuration');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
