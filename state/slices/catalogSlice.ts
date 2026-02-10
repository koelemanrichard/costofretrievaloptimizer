/**
 * Catalog Slice - Handles product catalog state
 *
 * Manages:
 * - Catalog container (per topical map)
 * - Categories with tree hierarchy
 * - Products
 * - Import progress
 * - Selected category/product for UI
 */

import type {
  ProductCatalog,
  CatalogCategory,
  CatalogProduct,
} from '../../types/catalog';

// ============================================================================
// STATE TYPES
// ============================================================================

export interface CatalogState {
  catalog: ProductCatalog | null;
  categories: CatalogCategory[];
  products: CatalogProduct[];
  isLoading: boolean;
  importProgress: { current: number; total: number } | null;
  selectedCategoryId: string | null;
  selectedProductId: string | null;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialCatalogState: CatalogState = {
  catalog: null,
  categories: [],
  products: [],
  isLoading: false,
  importProgress: null,
  selectedCategoryId: null,
  selectedProductId: null,
};

// ============================================================================
// ACTION TYPES
// ============================================================================

export type CatalogAction =
  | { type: 'SET_CATALOG'; payload: ProductCatalog | null }
  | { type: 'SET_CATALOG_CATEGORIES'; payload: CatalogCategory[] }
  | { type: 'ADD_CATALOG_CATEGORY'; payload: CatalogCategory }
  | { type: 'UPDATE_CATALOG_CATEGORY'; payload: { categoryId: string; updates: Partial<CatalogCategory> } }
  | { type: 'DELETE_CATALOG_CATEGORY'; payload: { categoryId: string } }
  | { type: 'SET_CATALOG_PRODUCTS'; payload: CatalogProduct[] }
  | { type: 'ADD_CATALOG_PRODUCT'; payload: CatalogProduct }
  | { type: 'ADD_CATALOG_PRODUCTS'; payload: CatalogProduct[] }
  | { type: 'UPDATE_CATALOG_PRODUCT'; payload: { productId: string; updates: Partial<CatalogProduct> } }
  | { type: 'DELETE_CATALOG_PRODUCT'; payload: { productId: string } }
  | { type: 'SET_CATALOG_LOADING'; payload: boolean }
  | { type: 'SET_CATALOG_IMPORT_PROGRESS'; payload: { current: number; total: number } | null }
  | { type: 'SET_SELECTED_CATEGORY'; payload: string | null }
  | { type: 'SET_SELECTED_PRODUCT'; payload: string | null }
  | { type: 'LINK_CATEGORY_TO_TOPIC'; payload: { categoryId: string; topicId: string | null } }
  | { type: 'RESET_CATALOG' };

// ============================================================================
// REDUCER
// ============================================================================

export function catalogReducer(
  state: CatalogState,
  action: CatalogAction
): CatalogState {
  switch (action.type) {
    case 'SET_CATALOG':
      return { ...state, catalog: action.payload };

    case 'SET_CATALOG_CATEGORIES':
      return { ...state, categories: action.payload };

    case 'ADD_CATALOG_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };

    case 'UPDATE_CATALOG_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c =>
          c.id === action.payload.categoryId
            ? { ...c, ...action.payload.updates }
            : c
        ),
      };

    case 'DELETE_CATALOG_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload.categoryId),
        selectedCategoryId: state.selectedCategoryId === action.payload.categoryId
          ? null
          : state.selectedCategoryId,
      };

    case 'SET_CATALOG_PRODUCTS':
      return { ...state, products: action.payload };

    case 'ADD_CATALOG_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };

    case 'ADD_CATALOG_PRODUCTS':
      return { ...state, products: [...state.products, ...action.payload] };

    case 'UPDATE_CATALOG_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload.productId
            ? { ...p, ...action.payload.updates }
            : p
        ),
      };

    case 'DELETE_CATALOG_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload.productId),
        selectedProductId: state.selectedProductId === action.payload.productId
          ? null
          : state.selectedProductId,
      };

    case 'SET_CATALOG_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_CATALOG_IMPORT_PROGRESS':
      return { ...state, importProgress: action.payload };

    case 'SET_SELECTED_CATEGORY':
      return { ...state, selectedCategoryId: action.payload };

    case 'SET_SELECTED_PRODUCT':
      return { ...state, selectedProductId: action.payload };

    case 'LINK_CATEGORY_TO_TOPIC':
      return {
        ...state,
        categories: state.categories.map(c =>
          c.id === action.payload.categoryId
            ? { ...c, linked_topic_id: action.payload.topicId }
            : c
        ),
      };

    case 'RESET_CATALOG':
      return initialCatalogState;

    default:
      return state;
  }
}

// ============================================================================
// ACTION CREATORS
// ============================================================================

export const catalogActions = {
  setCatalog: (catalog: ProductCatalog | null): CatalogAction => ({
    type: 'SET_CATALOG',
    payload: catalog,
  }),

  setCategories: (categories: CatalogCategory[]): CatalogAction => ({
    type: 'SET_CATALOG_CATEGORIES',
    payload: categories,
  }),

  addCategory: (category: CatalogCategory): CatalogAction => ({
    type: 'ADD_CATALOG_CATEGORY',
    payload: category,
  }),

  updateCategory: (categoryId: string, updates: Partial<CatalogCategory>): CatalogAction => ({
    type: 'UPDATE_CATALOG_CATEGORY',
    payload: { categoryId, updates },
  }),

  deleteCategory: (categoryId: string): CatalogAction => ({
    type: 'DELETE_CATALOG_CATEGORY',
    payload: { categoryId },
  }),

  setProducts: (products: CatalogProduct[]): CatalogAction => ({
    type: 'SET_CATALOG_PRODUCTS',
    payload: products,
  }),

  addProduct: (product: CatalogProduct): CatalogAction => ({
    type: 'ADD_CATALOG_PRODUCT',
    payload: product,
  }),

  addProducts: (products: CatalogProduct[]): CatalogAction => ({
    type: 'ADD_CATALOG_PRODUCTS',
    payload: products,
  }),

  updateProduct: (productId: string, updates: Partial<CatalogProduct>): CatalogAction => ({
    type: 'UPDATE_CATALOG_PRODUCT',
    payload: { productId, updates },
  }),

  deleteProduct: (productId: string): CatalogAction => ({
    type: 'DELETE_CATALOG_PRODUCT',
    payload: { productId },
  }),

  setLoading: (isLoading: boolean): CatalogAction => ({
    type: 'SET_CATALOG_LOADING',
    payload: isLoading,
  }),

  setImportProgress: (progress: { current: number; total: number } | null): CatalogAction => ({
    type: 'SET_CATALOG_IMPORT_PROGRESS',
    payload: progress,
  }),

  selectCategory: (categoryId: string | null): CatalogAction => ({
    type: 'SET_SELECTED_CATEGORY',
    payload: categoryId,
  }),

  selectProduct: (productId: string | null): CatalogAction => ({
    type: 'SET_SELECTED_PRODUCT',
    payload: productId,
  }),

  linkCategoryToTopic: (categoryId: string, topicId: string | null): CatalogAction => ({
    type: 'LINK_CATEGORY_TO_TOPIC',
    payload: { categoryId, topicId },
  }),

  reset: (): CatalogAction => ({
    type: 'RESET_CATALOG',
  }),
};
