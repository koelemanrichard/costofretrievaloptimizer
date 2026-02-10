/**
 * Catalog to EAV Mapper
 *
 * Extracts Entity-Attribute-Value triples from product catalog data.
 * Uses product attributes, brands, and categories to suggest EAVs
 * that can enrich the topical map's semantic foundation.
 */

import type { SemanticTriple } from '../../types';
import type { CatalogCategory, CatalogProduct } from '../../types/catalog';

/**
 * Extract EAV suggestions from product catalog data.
 * Returns new triples that don't already exist in the map's EAV set.
 */
export function extractEavsFromCatalog(
  categories: CatalogCategory[],
  products: CatalogProduct[],
  existingEavs: SemanticTriple[],
  seedKeyword: string
): SemanticTriple[] {
  const existingKeys = new Set(
    existingEavs.map(e =>
      `${e.subject?.label}:${e.predicate?.relation}:${e.object?.value}`.toLowerCase()
    )
  );

  const suggestions: SemanticTriple[] = [];

  const addIfNew = (triple: SemanticTriple) => {
    const key = `${triple.subject?.label}:${triple.predicate?.relation}:${triple.object?.value}`.toLowerCase();
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      suggestions.push(triple);
    }
  };

  // 1. Extract from product attribute keys (e.g., color, size, material → attributes of the entity)
  const attributeKeys = new Map<string, number>();
  for (const product of products) {
    if (product.attributes && typeof product.attributes === 'object') {
      for (const key of Object.keys(product.attributes)) {
        attributeKeys.set(key, (attributeKeys.get(key) || 0) + 1);
      }
    }
  }

  // Only suggest attributes that appear in at least 3 products
  for (const [key, count] of attributeKeys) {
    if (count < 3) continue;

    // Get unique values for this attribute
    const values = new Set<string>();
    for (const product of products) {
      const val = product.attributes?.[key];
      if (val) values.add(val);
    }

    // Create EAV: Entity = seed keyword, Attribute = "has {key}", Value = common values
    for (const value of [...values].slice(0, 5)) {
      addIfNew({
        subject: { label: seedKeyword, type: 'Entity' },
        predicate: { relation: `has ${key}`, type: 'SPECIFICATION' },
        object: { value, type: 'string' },
        category: 'COMMON',
        classification: 'SPECIFICATION',
        confidence: 0.7,
      });
    }
  }

  // 2. Extract brands as EAVs
  const brands = new Map<string, number>();
  for (const product of products) {
    if (product.brand) {
      brands.set(product.brand, (brands.get(product.brand) || 0) + 1);
    }
  }

  for (const [brand, count] of brands) {
    if (count < 2) continue;
    addIfNew({
      subject: { label: seedKeyword, type: 'Entity' },
      predicate: { relation: 'includes brand', type: 'COMPONENT' },
      object: { value: brand, type: 'string' },
      category: 'ROOT',
      classification: 'COMPONENT',
      confidence: 0.8,
    });
  }

  // 3. Extract category hierarchy as EAVs
  for (const category of categories) {
    if (category.status !== 'active') continue;

    const parentCategory = category.parent_category_id
      ? categories.find(c => c.id === category.parent_category_id)
      : null;

    if (parentCategory) {
      addIfNew({
        subject: { label: category.name, type: 'Entity' },
        predicate: { relation: 'is subcategory of', type: 'TYPE' },
        object: { value: parentCategory.name, type: 'string' },
        category: 'ROOT',
        classification: 'TYPE',
        confidence: 0.9,
      });
    }

    // Category itself as a type of the seed keyword
    addIfNew({
      subject: { label: seedKeyword, type: 'Entity' },
      predicate: { relation: 'includes category', type: 'TYPE' },
      object: { value: category.name, type: 'string' },
      category: 'ROOT',
      classification: 'TYPE',
      confidence: 0.85,
    });
  }

  // 4. Extract price ranges as EAVs per category
  for (const category of categories) {
    if (category.status !== 'active') continue;

    // We don't have direct category-product join here, but we can use the category name
    addIfNew({
      subject: { label: category.name, type: 'Entity' },
      predicate: { relation: 'has product count', type: 'SPECIFICATION' },
      object: { value: String(category.product_count), type: 'number' },
      category: 'COMMON',
      classification: 'SPECIFICATION',
      confidence: 0.6,
    });
  }

  return suggestions;
}
