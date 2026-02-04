// services/brand-replication/storage/SupabaseStorageAdapter.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StorageAdapter } from './types';
import type {
  BrandComponent,
  SectionDesignDecision,
  ValidationOutput,
  IntelligenceOutput,
  DiscoveryOutput,
} from '../interfaces';

/**
 * Database row types for brand replication tables
 */
interface DbBrandReplicationComponent {
  id: string;
  brand_id: string;
  project_id: string;
  name: string;
  purpose: string;
  usage_context: string;
  css: string;
  html_template: string;
  preview_html: string | null;
  source_component: Record<string, unknown>;
  match_score: number;
  variants: unknown[];
  created_at: string;
  updated_at: string;
}

interface DbBrandReplicationDecision {
  id: string;
  brand_id: string;
  project_id: string;
  article_id: string;
  section_id: string;
  section_heading: string;
  component_id: string | null;
  component_name: string;
  variant: string | null;
  layout: Record<string, unknown>;
  reasoning: string;
  semantic_role: string;
  content_mapping: Record<string, unknown> | null;
  confidence: number;
  created_at: string;
  updated_at: string;
}

interface DbBrandReplicationValidation {
  id: string;
  brand_id: string;
  project_id: string;
  article_id: string;
  scores: Record<string, unknown>;
  wow_factor_checklist: unknown[];
  passes_threshold: boolean;
  suggestions: string[];
  status: 'success' | 'partial' | 'failed';
  errors: string[] | null;
  created_at: string;
}

/**
 * SupabaseStorageAdapter implements StorageAdapter using Supabase as the backend.
 *
 * This adapter maps the key-value interface to three Supabase tables:
 * - brand_replication_components: Stores BrandComponent[] per brand
 * - brand_replication_decisions: Stores SectionDesignDecision[] per brand/article
 * - brand_replication_validations: Stores ValidationOutput per brand/article
 *
 * Key patterns:
 * - "components:{brandId}" -> BrandComponent[]
 * - "decisions:{brandId}:{articleId}" -> IntelligenceOutput
 * - "validation:{brandId}:{articleId}" -> ValidationOutput
 * - "discovery:{brandId}" -> DiscoveryOutput (stored in local storage or memory as fallback)
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  private supabase: SupabaseClient;
  private projectId: string;
  private localCache = new Map<string, unknown>();

  constructor(supabase: SupabaseClient, projectId: string) {
    this.supabase = supabase;
    this.projectId = projectId;
  }

  /**
   * Get a value by key
   */
  async get<T>(key: string): Promise<T | null> {
    const parsed = this.parseKey(key);

    switch (parsed.type) {
      case 'components':
        return (await this.getComponents(parsed.brandId)) as unknown as T;

      case 'decisions':
        return (await this.getDecisions(
          parsed.brandId,
          parsed.articleId!
        )) as unknown as T;

      case 'validation':
        return (await this.getValidation(
          parsed.brandId,
          parsed.articleId!
        )) as unknown as T;

      case 'discovery':
        // Discovery data is typically ephemeral or stored elsewhere
        // Fall back to local cache
        return (this.localCache.get(key) as T) ?? null;

      default:
        // Unknown key pattern - try local cache
        return (this.localCache.get(key) as T) ?? null;
    }
  }

  /**
   * Set a value by key
   */
  async set<T>(key: string, value: T): Promise<void> {
    const parsed = this.parseKey(key);

    switch (parsed.type) {
      case 'components':
        await this.saveComponents(parsed.brandId, value as unknown as BrandComponent[]);
        break;

      case 'decisions':
        await this.saveDecisions(value as unknown as IntelligenceOutput);
        break;

      case 'validation':
        await this.saveValidation(value as unknown as ValidationOutput);
        break;

      case 'discovery':
        // Store discovery data in local cache
        this.localCache.set(key, value);
        break;

      default:
        // Unknown key pattern - store in local cache
        this.localCache.set(key, value);
        break;
    }
  }

  /**
   * Delete a value by key
   */
  async delete(key: string): Promise<void> {
    const parsed = this.parseKey(key);

    switch (parsed.type) {
      case 'components':
        await this.deleteComponents(parsed.brandId);
        break;

      case 'decisions':
        await this.deleteDecisions(parsed.brandId, parsed.articleId!);
        break;

      case 'validation':
        await this.deleteValidation(parsed.brandId, parsed.articleId!);
        break;

      default:
        this.localCache.delete(key);
        break;
    }
  }

  /**
   * List all keys with a given prefix
   */
  async list(prefix: string): Promise<string[]> {
    const parsed = this.parseKey(prefix);
    const keys: string[] = [];

    switch (parsed.type) {
      case 'components':
        // List all brands that have components
        const { data: componentBrands } = await this.supabase
          .from('brand_replication_components')
          .select('brand_id')
          .eq('project_id', this.projectId);

        if (componentBrands) {
          const uniqueBrands = [...new Set(componentBrands.map(r => r.brand_id))];
          keys.push(...uniqueBrands.map(b => `components:${b}`));
        }
        break;

      case 'decisions':
        // List all articles for a brand
        if (parsed.brandId) {
          const { data: articles } = await this.supabase
            .from('brand_replication_decisions')
            .select('article_id')
            .eq('project_id', this.projectId)
            .eq('brand_id', parsed.brandId);

          if (articles) {
            const uniqueArticles = [...new Set(articles.map(r => r.article_id))];
            keys.push(...uniqueArticles.map(a => `decisions:${parsed.brandId}:${a}`));
          }
        }
        break;

      case 'validation':
        // List all validations for a brand
        if (parsed.brandId) {
          const { data: validations } = await this.supabase
            .from('brand_replication_validations')
            .select('article_id')
            .eq('project_id', this.projectId)
            .eq('brand_id', parsed.brandId);

          if (validations) {
            keys.push(
              ...validations.map(v => `validation:${parsed.brandId}:${v.article_id}`)
            );
          }
        }
        break;

      default:
        // List from local cache
        for (const k of this.localCache.keys()) {
          if (k.startsWith(prefix)) {
            keys.push(k);
          }
        }
        break;
    }

    return keys.filter(k => k.startsWith(prefix));
  }

  // =========================================================================
  // Private: Components
  // =========================================================================

  private async getComponents(brandId: string): Promise<BrandComponent[]> {
    const { data, error } = await this.supabase
      .from('brand_replication_components')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[SupabaseStorageAdapter] Error fetching components:', error);
      return [];
    }

    return (data || []).map(this.dbToComponent);
  }

  private async saveComponents(brandId: string, components: BrandComponent[]): Promise<void> {
    // First delete existing components for this brand
    await this.deleteComponents(brandId);

    if (components.length === 0) return;

    const rows = components.map(c => this.componentToDb(brandId, c));

    const { error } = await this.supabase
      .from('brand_replication_components')
      .insert(rows);

    if (error) {
      console.error('[SupabaseStorageAdapter] Error saving components:', error);
      throw error;
    }
  }

  private async deleteComponents(brandId: string): Promise<void> {
    const { error } = await this.supabase
      .from('brand_replication_components')
      .delete()
      .eq('project_id', this.projectId)
      .eq('brand_id', brandId);

    if (error) {
      console.error('[SupabaseStorageAdapter] Error deleting components:', error);
    }
  }

  private dbToComponent(row: DbBrandReplicationComponent): BrandComponent {
    return {
      id: row.id,
      brandId: row.brand_id,
      name: row.name,
      purpose: row.purpose,
      usageContext: row.usage_context,
      css: row.css,
      htmlTemplate: row.html_template,
      previewHtml: row.preview_html || '',
      sourceComponent: row.source_component as unknown as BrandComponent['sourceComponent'],
      matchScore: row.match_score,
      variants: (row.variants || []) as BrandComponent['variants'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private componentToDb(
    brandId: string,
    component: BrandComponent
  ): Omit<DbBrandReplicationComponent, 'id' | 'created_at' | 'updated_at'> {
    return {
      brand_id: brandId,
      project_id: this.projectId,
      name: component.name,
      purpose: component.purpose,
      usage_context: component.usageContext,
      css: component.css,
      html_template: component.htmlTemplate,
      preview_html: component.previewHtml || null,
      source_component: component.sourceComponent as unknown as Record<string, unknown>,
      match_score: component.matchScore,
      variants: component.variants || [],
    };
  }

  // =========================================================================
  // Private: Decisions
  // =========================================================================

  private async getDecisions(
    brandId: string,
    articleId: string
  ): Promise<IntelligenceOutput | null> {
    const { data, error } = await this.supabase
      .from('brand_replication_decisions')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('brand_id', brandId)
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[SupabaseStorageAdapter] Error fetching decisions:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Reconstruct IntelligenceOutput from rows
    const decisions = data.map(this.dbToDecision);

    return {
      brandId,
      articleId,
      decisions,
      overallStrategy: '', // Not stored per-decision, would need separate storage
      timestamp: data[0].created_at,
      status: 'success',
    };
  }

  private async saveDecisions(output: IntelligenceOutput): Promise<void> {
    // First delete existing decisions for this brand/article
    await this.deleteDecisions(output.brandId, output.articleId);

    if (output.decisions.length === 0) return;

    const rows = output.decisions.map(d =>
      this.decisionToDb(output.brandId, output.articleId, d)
    );

    const { error } = await this.supabase
      .from('brand_replication_decisions')
      .insert(rows);

    if (error) {
      console.error('[SupabaseStorageAdapter] Error saving decisions:', error);
      throw error;
    }
  }

  private async deleteDecisions(brandId: string, articleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('brand_replication_decisions')
      .delete()
      .eq('project_id', this.projectId)
      .eq('brand_id', brandId)
      .eq('article_id', articleId);

    if (error) {
      console.error('[SupabaseStorageAdapter] Error deleting decisions:', error);
    }
  }

  private dbToDecision(row: DbBrandReplicationDecision): SectionDesignDecision {
    const layout = row.layout as SectionDesignDecision['layout'];
    const contentMapping = row.content_mapping as SectionDesignDecision['contentMapping'];

    return {
      sectionId: row.section_id,
      sectionHeading: row.section_heading,
      component: row.component_name,
      componentId: row.component_id || '',
      variant: row.variant || '',
      layout: {
        columns: layout.columns || 1,
        width: layout.width || 'medium',
        emphasis: layout.emphasis || 'standard',
      },
      reasoning: row.reasoning,
      semanticRole: row.semantic_role,
      contentMapping: contentMapping || {},
      confidence: row.confidence,
    };
  }

  private decisionToDb(
    brandId: string,
    articleId: string,
    decision: SectionDesignDecision
  ): Omit<DbBrandReplicationDecision, 'id' | 'created_at' | 'updated_at'> {
    return {
      brand_id: brandId,
      project_id: this.projectId,
      article_id: articleId,
      section_id: decision.sectionId,
      section_heading: decision.sectionHeading,
      component_id: decision.componentId || null,
      component_name: decision.component,
      variant: decision.variant || null,
      layout: decision.layout as unknown as Record<string, unknown>,
      reasoning: decision.reasoning,
      semantic_role: decision.semanticRole,
      content_mapping: decision.contentMapping as unknown as Record<string, unknown>,
      confidence: decision.confidence,
    };
  }

  // =========================================================================
  // Private: Validations
  // =========================================================================

  private async getValidation(
    brandId: string,
    articleId: string
  ): Promise<ValidationOutput | null> {
    const { data, error } = await this.supabase
      .from('brand_replication_validations')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('brand_id', brandId)
      .eq('article_id', articleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('[SupabaseStorageAdapter] Error fetching validation:', error);
      return null;
    }

    return this.dbToValidation(data);
  }

  private async saveValidation(output: ValidationOutput): Promise<void> {
    const row = this.validationToDb(output);

    const { error } = await this.supabase
      .from('brand_replication_validations')
      .upsert(row, {
        onConflict: 'brand_id,article_id',
      });

    if (error) {
      console.error('[SupabaseStorageAdapter] Error saving validation:', error);
      throw error;
    }
  }

  private async deleteValidation(brandId: string, articleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('brand_replication_validations')
      .delete()
      .eq('project_id', this.projectId)
      .eq('brand_id', brandId)
      .eq('article_id', articleId);

    if (error) {
      console.error('[SupabaseStorageAdapter] Error deleting validation:', error);
    }
  }

  private dbToValidation(row: DbBrandReplicationValidation): ValidationOutput {
    return {
      brandId: row.brand_id,
      articleId: row.article_id,
      scores: row.scores as ValidationOutput['scores'],
      wowFactorChecklist: row.wow_factor_checklist as ValidationOutput['wowFactorChecklist'],
      passesThreshold: row.passes_threshold,
      suggestions: row.suggestions || [],
      timestamp: row.created_at,
      status: row.status,
      errors: row.errors || undefined,
    };
  }

  private validationToDb(
    output: ValidationOutput
  ): Omit<DbBrandReplicationValidation, 'id' | 'created_at'> {
    return {
      brand_id: output.brandId,
      project_id: this.projectId,
      article_id: output.articleId,
      scores: output.scores as unknown as Record<string, unknown>,
      wow_factor_checklist: output.wowFactorChecklist || [],
      passes_threshold: output.passesThreshold,
      suggestions: output.suggestions || [],
      status: output.status,
      errors: output.errors || null,
    };
  }

  // =========================================================================
  // Private: Key parsing
  // =========================================================================

  private parseKey(key: string): {
    type: 'components' | 'decisions' | 'validation' | 'discovery' | 'unknown';
    brandId: string;
    articleId?: string;
  } {
    const parts = key.split(':');
    const prefix = parts[0];

    switch (prefix) {
      case 'components':
        return { type: 'components', brandId: parts[1] || '' };

      case 'decisions':
        return { type: 'decisions', brandId: parts[1] || '', articleId: parts[2] };

      case 'validation':
        return { type: 'validation', brandId: parts[1] || '', articleId: parts[2] };

      case 'discovery':
        return { type: 'discovery', brandId: parts[1] || '' };

      default:
        return { type: 'unknown', brandId: '' };
    }
  }

  /**
   * Clear all local cache
   */
  clearLocalCache(): void {
    this.localCache.clear();
  }

  /**
   * Get the project ID this adapter is configured for
   */
  getProjectId(): string {
    return this.projectId;
  }
}

/**
 * Factory function to create a SupabaseStorageAdapter
 */
export function createSupabaseStorageAdapter(
  supabase: SupabaseClient,
  projectId: string
): SupabaseStorageAdapter {
  return new SupabaseStorageAdapter(supabase, projectId);
}
