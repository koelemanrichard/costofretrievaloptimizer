/**
 * Catalog Service - Supabase CRUD operations for product catalog
 *
 * Handles all database operations for catalogs, categories, products,
 * and category assignments using the verified database service pattern.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  verifiedInsert,
  verifiedUpdate,
  verifiedDelete,
  verifiedBulkInsert,
  verifiedBulkDelete,
} from '../verifiedDatabaseService';
import type {
  ProductCatalog,
  CatalogCategory,
  CatalogProduct,
  ProductCategoryAssignment,
  CategoryPageContext,
  CategoryProductSnapshot,
} from '../../types/catalog';

// ============================================================================
// CATALOG OPERATIONS
// ============================================================================

export async function getOrCreateCatalog(
  supabase: SupabaseClient,
  mapId: string,
  userId: string
): Promise<ProductCatalog> {
  // Try to fetch existing catalog
  const { data: existing } = await supabase
    .from('product_catalogs')
    .select('*')
    .eq('map_id', mapId)
    .single();

  if (existing) return existing as ProductCatalog;

  // Create new catalog
  const result = await verifiedInsert<Record<string, unknown>>(
    supabase,
    { table: 'product_catalogs', operationDescription: 'Create product catalog' },
    { map_id: mapId, user_id: userId, name: 'Product Catalog', source_type: 'manual' }
  );

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create catalog');
  }
  return result.data as unknown as ProductCatalog;
}

export async function getCatalog(
  supabase: SupabaseClient,
  mapId: string
): Promise<ProductCatalog | null> {
  const { data, error } = await supabase
    .from('product_catalogs')
    .select('*')
    .eq('map_id', mapId)
    .single();

  // Gracefully handle 406 (PostgREST schema cache stale) and PGRST116 (no rows)
  if (error && (error.code === 'PGRST116' || error.message?.includes('406'))) {
    return null;
  }
  return data as ProductCatalog | null;
}

export async function updateCatalog(
  supabase: SupabaseClient,
  catalogId: string,
  updates: Partial<Pick<ProductCatalog, 'name' | 'source_type' | 'source_url' | 'product_count' | 'category_count'>>
): Promise<ProductCatalog> {
  const result = await verifiedUpdate<Record<string, unknown>>(
    supabase,
    { table: 'product_catalogs', operationDescription: 'Update catalog' },
    { column: 'id', value: catalogId },
    updates as Record<string, unknown>
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to update catalog');
  }
  return result.data as unknown as ProductCatalog;
}

export async function deleteCatalog(
  supabase: SupabaseClient,
  catalogId: string
): Promise<void> {
  const result = await verifiedDelete(
    supabase,
    { table: 'product_catalogs', operationDescription: 'Delete catalog' },
    { column: 'id', value: catalogId }
  );
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete catalog');
  }
}

// ============================================================================
// CATEGORY OPERATIONS
// ============================================================================

export async function getCategories(
  supabase: SupabaseClient,
  catalogId: string
): Promise<CatalogCategory[]> {
  const { data, error } = await supabase
    .from('catalog_categories')
    .select('*')
    .eq('catalog_id', catalogId)
    .order('name');

  if (error) throw new Error(`Failed to fetch categories: ${error.message}`);
  return (data || []) as CatalogCategory[];
}

export async function createCategory(
  supabase: SupabaseClient,
  category: Omit<CatalogCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<CatalogCategory> {
  const result = await verifiedInsert<Record<string, unknown>>(
    supabase,
    { table: 'catalog_categories', operationDescription: 'Create category' },
    category as unknown as Record<string, unknown>
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create category');
  }
  return result.data as unknown as CatalogCategory;
}

export async function updateCategory(
  supabase: SupabaseClient,
  categoryId: string,
  updates: Partial<CatalogCategory>
): Promise<CatalogCategory> {
  const result = await verifiedUpdate<Record<string, unknown>>(
    supabase,
    { table: 'catalog_categories', operationDescription: 'Update category' },
    { column: 'id', value: categoryId },
    updates as Record<string, unknown>
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to update category');
  }
  return result.data as unknown as CatalogCategory;
}

export async function deleteCategory(
  supabase: SupabaseClient,
  categoryId: string
): Promise<void> {
  const result = await verifiedDelete(
    supabase,
    { table: 'catalog_categories', operationDescription: 'Delete category' },
    { column: 'id', value: categoryId }
  );
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete category');
  }
}

export async function linkCategoryToTopic(
  supabase: SupabaseClient,
  categoryId: string,
  topicId: string | null
): Promise<CatalogCategory> {
  return updateCategory(supabase, categoryId, { linked_topic_id: topicId } as Partial<CatalogCategory>);
}

// ============================================================================
// PRODUCT OPERATIONS
// ============================================================================

export async function getProducts(
  supabase: SupabaseClient,
  catalogId: string
): Promise<CatalogProduct[]> {
  const { data, error } = await supabase
    .from('catalog_products')
    .select('*')
    .eq('catalog_id', catalogId)
    .order('name');

  if (error) throw new Error(`Failed to fetch products: ${error.message}`);
  return (data || []) as CatalogProduct[];
}

export async function getProductsByCategory(
  supabase: SupabaseClient,
  categoryId: string
): Promise<CatalogProduct[]> {
  const { data, error } = await supabase
    .from('product_category_assignments')
    .select('product_id, catalog_products(*)')
    .eq('category_id', categoryId)
    .order('sort_order');

  if (error) throw new Error(`Failed to fetch products for category: ${error.message}`);
  return (data || []).map((row: any) => row.catalog_products).filter(Boolean) as CatalogProduct[];
}

export async function createProduct(
  supabase: SupabaseClient,
  product: Omit<CatalogProduct, 'id' | 'created_at' | 'updated_at'>,
  categoryIds?: { categoryId: string; isPrimary: boolean }[]
): Promise<CatalogProduct> {
  const result = await verifiedInsert<Record<string, unknown>>(
    supabase,
    { table: 'catalog_products', operationDescription: 'Create product' },
    product as unknown as Record<string, unknown>
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create product');
  }

  // Create category assignments
  if (categoryIds && categoryIds.length > 0) {
    const assignments = categoryIds.map((cat, idx) => ({
      product_id: (result.data as any).id,
      category_id: cat.categoryId,
      is_primary: cat.isPrimary,
      sort_order: idx,
    }));
    await verifiedBulkInsert<Record<string, unknown>>(
      supabase,
      { table: 'product_category_assignments', operationDescription: 'Assign product to categories' },
      assignments
    );
  }

  return result.data as unknown as CatalogProduct;
}

export async function bulkCreateProducts(
  supabase: SupabaseClient,
  products: Omit<CatalogProduct, 'id' | 'created_at' | 'updated_at'>[]
): Promise<CatalogProduct[]> {
  if (products.length === 0) return [];

  const result = await verifiedBulkInsert<Record<string, unknown>>(
    supabase,
    { table: 'catalog_products', operationDescription: `Insert ${products.length} products` },
    products as unknown as Record<string, unknown>[]
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to bulk create products');
  }
  return result.data as unknown as CatalogProduct[];
}

export async function updateProduct(
  supabase: SupabaseClient,
  productId: string,
  updates: Partial<CatalogProduct>
): Promise<CatalogProduct> {
  const result = await verifiedUpdate<Record<string, unknown>>(
    supabase,
    { table: 'catalog_products', operationDescription: 'Update product' },
    { column: 'id', value: productId },
    updates as Record<string, unknown>
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to update product');
  }
  return result.data as unknown as CatalogProduct;
}

export async function deleteProduct(
  supabase: SupabaseClient,
  productId: string
): Promise<void> {
  const result = await verifiedDelete(
    supabase,
    { table: 'catalog_products', operationDescription: 'Delete product' },
    { column: 'id', value: productId }
  );
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete product');
  }
}

// ============================================================================
// ASSIGNMENT OPERATIONS
// ============================================================================

export async function assignProductToCategory(
  supabase: SupabaseClient,
  productId: string,
  categoryId: string,
  isPrimary: boolean = false
): Promise<ProductCategoryAssignment> {
  const result = await verifiedInsert<Record<string, unknown>>(
    supabase,
    { table: 'product_category_assignments', operationDescription: 'Assign product to category' },
    { product_id: productId, category_id: categoryId, is_primary: isPrimary, sort_order: 0 }
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to assign product to category');
  }
  return result.data as unknown as ProductCategoryAssignment;
}

export async function removeProductFromCategory(
  supabase: SupabaseClient,
  productId: string,
  categoryId: string
): Promise<void> {
  const { error } = await supabase
    .from('product_category_assignments')
    .delete()
    .eq('product_id', productId)
    .eq('category_id', categoryId);

  if (error) throw new Error(`Failed to remove assignment: ${error.message}`);
}

// ============================================================================
// PRODUCT CATEGORY ASSIGNMENTS (bulk query)
// ============================================================================

export async function getProductCategoryAssignments(
  supabase: SupabaseClient,
  catalogId: string
): Promise<Map<string, string[]>> {
  const { data, error } = await supabase
    .from('product_category_assignments')
    .select('product_id, category_id, catalog_categories!inner(catalog_id)')
    .eq('catalog_categories.catalog_id', catalogId);

  if (error) {
    // Fallback: query without join if the schema doesn't support it
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('product_category_assignments')
      .select('product_id, category_id');

    if (fallbackError) return new Map();

    const map = new Map<string, string[]>();
    for (const row of (fallbackData || []) as { product_id: string; category_id: string }[]) {
      const existing = map.get(row.product_id) || [];
      existing.push(row.category_id);
      map.set(row.product_id, existing);
    }
    return map;
  }

  const map = new Map<string, string[]>();
  for (const row of (data || []) as { product_id: string; category_id: string }[]) {
    const existing = map.get(row.product_id) || [];
    existing.push(row.category_id);
    map.set(row.product_id, existing);
  }
  return map;
}

// ============================================================================
// CATALOG COUNTS (Denormalization helpers)
// ============================================================================

export async function refreshCatalogCounts(
  supabase: SupabaseClient,
  catalogId: string
): Promise<void> {
  const [{ count: productCount }, { count: categoryCount }] = await Promise.all([
    supabase.from('catalog_products').select('*', { count: 'exact', head: true }).eq('catalog_id', catalogId),
    supabase.from('catalog_categories').select('*', { count: 'exact', head: true }).eq('catalog_id', catalogId),
  ]);

  await updateCatalog(supabase, catalogId, {
    product_count: productCount || 0,
    category_count: categoryCount || 0,
  });
}

export async function refreshCategoryCounts(
  supabase: SupabaseClient,
  categoryId: string
): Promise<void> {
  const { count } = await supabase
    .from('product_category_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  await updateCategory(supabase, categoryId, { product_count: count || 0 });
}

// ============================================================================
// CATEGORY PAGE CONTEXT BUILDER
// ============================================================================

/**
 * Build the CategoryPageContext for a category-linked topic.
 * This is the data structure passed to content generation.
 */
export async function buildCategoryPageContext(
  supabase: SupabaseClient,
  categoryId: string,
  allCategories: CatalogCategory[]
): Promise<CategoryPageContext> {
  const category = allCategories.find(c => c.id === categoryId);
  if (!category) throw new Error(`Category ${categoryId} not found`);

  // Get parent category
  const parentCategory = category.parent_category_id
    ? allCategories.find(c => c.id === category.parent_category_id)
    : undefined;

  // Get subcategories
  const subcategories = allCategories
    .filter(c => c.parent_category_id === categoryId && c.status === 'active')
    .map(c => ({ name: c.name, url: c.store_url, productCount: c.product_count }));

  // Get products in this category
  const products = await getProductsByCategory(supabase, categoryId);
  const activeProducts = products.filter(p => p.status === 'active');

  // Build product snapshots (top 20 by rating for prompts)
  const sortedProducts = [...activeProducts].sort((a, b) => {
    const ratingA = a.rating_value || 0;
    const ratingB = b.rating_value || 0;
    return ratingB - ratingA;
  });

  const productSnapshots: CategoryProductSnapshot[] = sortedProducts.slice(0, 20).map(p => ({
    name: p.name,
    sku: p.sku,
    brand: p.brand,
    price: p.price,
    currency: p.currency,
    salePrice: p.sale_price,
    availability: p.availability,
    productUrl: p.product_url,
    imageUrl: p.image_url,
    rating: p.rating_value,
    reviewCount: p.review_count,
    attributes: p.attributes || {},
  }));

  // Calculate price range
  const prices = activeProducts
    .map(p => p.price)
    .filter((p): p is number => p != null && p > 0);
  const priceRange = prices.length > 0
    ? { min: Math.min(...prices), max: Math.max(...prices), currency: activeProducts[0]?.currency || 'USD' }
    : undefined;

  // Determine if sketch mode (most products lack URLs and prices)
  const productsWithUrls = activeProducts.filter(p => p.product_url).length;
  const productsWithPrices = activeProducts.filter(p => p.price != null).length;
  const isSketchMode = activeProducts.length > 0 &&
    (productsWithUrls / activeProducts.length < 0.5 || productsWithPrices / activeProducts.length < 0.5);

  return {
    categoryName: category.name,
    categoryUrl: category.store_url,
    parentCategory: parentCategory ? { name: parentCategory.name, url: parentCategory.store_url } : undefined,
    subcategories,
    products: productSnapshots,
    priceRange,
    totalProductCount: activeProducts.length,
    applicableModifiers: category.applicable_modifiers || [],
    isSketchMode,
  };
}

/**
 * Find a category by its linked topic ID.
 * Pure function — searches the in-memory categories array, no DB call needed.
 */
export function findCategoryByLinkedTopicId(
  categories: CatalogCategory[],
  topicId: string
): CatalogCategory | undefined {
  return categories.find(c => c.linked_topic_id === topicId && c.status === 'active');
}
