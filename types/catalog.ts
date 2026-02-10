/**
 * Product Catalog Types Module
 *
 * Types for the ecommerce product catalog system including:
 * - ProductCatalog: Container per topical map
 * - CatalogCategory: Store categories linked to topics
 * - CatalogProduct: Individual products with flexible attributes
 * - ProductCategoryAssignment: Many-to-many join
 * - CategoryPageContext: Data passed to content generation
 *
 * @module types/catalog
 */

// ============================================================================
// PRODUCT CATALOG
// ============================================================================

export type CatalogSourceType = 'manual' | 'csv_import' | 'url_scrape';
export type CatalogItemStatus = 'active' | 'discontinued';
export type ProductAvailability = 'InStock' | 'OutOfStock' | 'PreOrder';

export interface ProductCatalog {
  id: string;
  map_id: string;
  user_id: string;
  name: string;
  source_type: CatalogSourceType;
  source_url?: string;
  product_count: number;
  category_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CATALOG CATEGORY
// ============================================================================

export interface CatalogCategory {
  id: string;
  catalog_id: string;
  parent_category_id: string | null;
  name: string;
  slug?: string;
  description?: string;
  store_url?: string;
  image_url?: string;
  linked_topic_id: string | null;
  applicable_modifiers: string[];
  product_count: number;
  status: CatalogItemStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CATALOG PRODUCT
// ============================================================================

export interface CatalogProduct {
  id: string;
  catalog_id: string;
  name: string;
  sku?: string;
  brand?: string;
  short_description?: string;
  price?: number;
  currency: string;
  sale_price?: number;
  product_url?: string;
  image_url?: string;
  additional_images: string[];
  availability: ProductAvailability;
  attributes: Record<string, string>;
  rating_value?: number;
  review_count: number;
  tags: string[];
  status: CatalogItemStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PRODUCT CATEGORY ASSIGNMENT
// ============================================================================

export interface ProductCategoryAssignment {
  id: string;
  product_id: string;
  category_id: string;
  is_primary: boolean;
  sort_order: number;
}

// ============================================================================
// CATEGORY PAGE CONTEXT (passed to content generation)
// ============================================================================

export interface CategoryPageContext {
  categoryName: string;
  categoryUrl?: string;
  parentCategory?: { name: string; url?: string };
  subcategories: { name: string; url?: string; productCount: number }[];
  products: CategoryProductSnapshot[];
  priceRange?: { min: number; max: number; currency: string };
  totalProductCount: number;
  applicableModifiers: string[];
  isSketchMode: boolean;
}

export interface CategoryProductSnapshot {
  name: string;
  sku?: string;
  brand?: string;
  price?: number;
  currency?: string;
  salePrice?: number;
  availability: string;
  productUrl?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  attributes: Record<string, string>;
}

// ============================================================================
// AUTO-LINK TYPES
// ============================================================================

export interface AutoLinkSuggestion {
  categoryId: string;
  categoryName: string;
  suggestedTopicId: string | null;
  suggestedTopicTitle: string | null;
  confidence: number;
  action: 'accept' | 'change' | 'create' | 'skip';
}

export interface NewTopicSuggestion {
  categoryId: string;
  categoryName: string;
  suggestedTitle: string;
  suggestedParentTopicId?: string;
  suggestedType: 'core' | 'outer' | 'child';
  suggestedTopicClass: 'monetization' | 'informational';
}

// ============================================================================
// IMPORT TYPES
// ============================================================================

export interface CsvFieldMapping {
  csvColumn: string;
  mappedField: CatalogProductField | 'category' | 'attribute' | 'skip';
  attributeKey?: string; // When mapped to 'attribute', the key name
}

export type CatalogProductField =
  | 'name' | 'sku' | 'brand' | 'short_description'
  | 'price' | 'currency' | 'sale_price'
  | 'product_url' | 'image_url'
  | 'availability' | 'rating_value' | 'review_count'
  | 'tags';

export interface ImportValidationResult {
  totalRows: number;
  validRows: number;
  warnings: ImportWarning[];
  errors: ImportError[];
  categoriesDetected: string[];
  productsToCreate: number;
  productsToUpdate: number;
  productsToRemove: number;
}

export interface ImportWarning {
  row: number;
  field: string;
  message: string;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportMergeStrategy {
  newSkus: 'insert';
  changedSkus: 'update';
  missingSkus: 'discontinue' | 'keep' | 'prompt';
}
