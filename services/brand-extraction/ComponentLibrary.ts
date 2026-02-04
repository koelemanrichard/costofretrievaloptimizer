/**
 * ComponentLibrary
 *
 * Manages storage and retrieval of extracted brand components.
 * Uses Supabase for persistence in the brand_components table.
 */

import { supabase } from '../../lib/supabase';
import type { ExtractedComponent, ComponentMatch } from '../../types/brandExtraction';

export class ComponentLibrary {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Find a component matching the given description.
   * Returns the best matching component with confidence score, or null if no match.
   */
  async findMatchingComponent(description: string): Promise<ComponentMatch | null> {
    const components = await this.getAll();

    if (components.length === 0) {
      return null;
    }

    // Simple text-based matching - find component with most similar description
    let bestMatch: ComponentMatch | null = null;
    let bestScore = 0;

    const descriptionLower = description.toLowerCase();
    const descriptionWords = descriptionLower.split(/\s+/);

    for (const component of components) {
      const componentDescLower = component.visualDescription.toLowerCase();
      const componentWords = componentDescLower.split(/\s+/);

      // Calculate word overlap score
      let matchedWords = 0;
      for (const word of descriptionWords) {
        if (componentWords.some(cw => cw.includes(word) || word.includes(cw))) {
          matchedWords++;
        }
      }

      // Also check componentType match
      if (component.componentType && descriptionLower.includes(component.componentType.toLowerCase())) {
        matchedWords += 2;
      }

      const score = descriptionWords.length > 0
        ? matchedWords / descriptionWords.length
        : 0;

      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = {
          component,
          confidence: Math.min(score, 1.0),
          matchReason: `Matched ${matchedWords} words from description`
        };
      }
    }

    return bestMatch;
  }

  /**
   * Save a component to the database.
   */
  async saveComponent(component: ExtractedComponent): Promise<void> {
    // Use direct REST with upsert (RLS delegation to projects table handles access control)
    const { error } = await supabase
      .from('brand_components')
      .upsert({
        id: component.id,
        extraction_id: component.extractionId,
        project_id: component.projectId,
        visual_description: component.visualDescription,
        component_type: component.componentType,
        literal_html: component.literalHtml,
        literal_css: component.literalCss,
        their_class_names: component.theirClassNames,
        content_slots: component.contentSlots || null,
        bounding_box: component.boundingBox || null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to save component: ${error.message}`);
    }
  }

  /**
   * Retrieve all components for this project.
   */
  async getAll(): Promise<ExtractedComponent[]> {
    const { data, error } = await supabase
      .from('brand_components')
      .select('*')
      .eq('project_id', this.projectId);

    if (error) {
      throw new Error(`Failed to retrieve components: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      extractionId: row.extraction_id as string,
      projectId: row.project_id as string,
      visualDescription: row.visual_description as string,
      componentType: row.component_type as string | undefined,
      literalHtml: row.literal_html as string,
      literalCss: row.literal_css as string,
      theirClassNames: row.their_class_names as string[],
      contentSlots: row.content_slots as ExtractedComponent['contentSlots'],
      boundingBox: row.bounding_box as ExtractedComponent['boundingBox'],
      createdAt: row.created_at as string
    }));
  }

  /**
   * Clear all components for this project.
   * Used before re-analysis to remove stale components.
   */
  async clearAll(): Promise<void> {
    const { error } = await supabase
      .from('brand_components')
      .delete()
      .eq('project_id', this.projectId);

    if (error) {
      console.warn(`Failed to clear components: ${error.message}`);
      // Don't throw - it's ok if there were no components to delete
    }
  }
}
