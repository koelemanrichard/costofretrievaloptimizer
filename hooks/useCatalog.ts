/**
 * useCatalog Hook - Data access and operations for the product catalog
 *
 * Handles loading catalog data from Supabase, CRUD operations,
 * CSV import flow, and auto-linking categories to topics.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAppState } from '../state/appState';
import { getSupabaseClient } from '../services/supabaseClient';
import * as catalogService from '../services/catalog/catalogService';
import { autoLinkCategoriesToTopics } from '../services/catalog/catalogAutoLinker';
import { downloadCatalogExport } from '../services/catalog/catalogExporter';
import type {
  ProductCatalog,
  CatalogCategory,
  CatalogProduct,
  AutoLinkSuggestion,
  NewTopicSuggestion,
} from '../types/catalog';

export function useCatalog(mapId: string | null) {
  const { state, dispatch } = useAppState();
  const { businessInfo } = state;
  const { catalog, categories, products, isLoading, selectedCategoryId } = state.catalog;

  const [autoLinkResults, setAutoLinkResults] = useState<{
    suggestions: AutoLinkSuggestion[];
    newTopicSuggestions: NewTopicSuggestion[];
  } | null>(null);
  const [isAutoLinking, setIsAutoLinking] = useState(false);

  const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

  // ========================================================================
  // LOAD CATALOG DATA
  // ========================================================================

  const loadCatalog = useCallback(async () => {
    if (!mapId) return;

    dispatch({ type: 'SET_CATALOG_LOADING', payload: true });
    try {
      const existingCatalog = await catalogService.getCatalog(supabase, mapId);
      dispatch({ type: 'SET_CATALOG', payload: existingCatalog });

      if (existingCatalog) {
        const [cats, prods] = await Promise.all([
          catalogService.getCategories(supabase, existingCatalog.id),
          catalogService.getProducts(supabase, existingCatalog.id),
        ]);
        dispatch({ type: 'SET_CATALOG_CATEGORIES', payload: cats });
        dispatch({ type: 'SET_CATALOG_PRODUCTS', payload: prods });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: `Failed to load catalog: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      dispatch({ type: 'SET_CATALOG_LOADING', payload: false });
    }
  }, [mapId, supabase, dispatch]);

  // Auto-load on mount
  useEffect(() => {
    if (mapId && !catalog) {
      loadCatalog();
    }
  }, [mapId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========================================================================
  // CATALOG OPERATIONS
  // ========================================================================

  const ensureCatalog = useCallback(async (): Promise<ProductCatalog> => {
    if (catalog) return catalog;
    if (!mapId || !state.user?.id) throw new Error('No active map or user');

    const newCatalog = await catalogService.getOrCreateCatalog(supabase, mapId, state.user.id);
    dispatch({ type: 'SET_CATALOG', payload: newCatalog });
    return newCatalog;
  }, [catalog, mapId, state.user?.id, supabase, dispatch]);

  // ========================================================================
  // CATEGORY OPERATIONS
  // ========================================================================

  const addCategory = useCallback(async (
    name: string,
    parentCategoryId?: string,
    description?: string
  ): Promise<CatalogCategory> => {
    const cat = await ensureCatalog();
    const newCategory = await catalogService.createCategory(supabase, {
      catalog_id: cat.id,
      name,
      parent_category_id: parentCategoryId || null,
      description: description || undefined,
      linked_topic_id: null,
      applicable_modifiers: [],
      product_count: 0,
      status: 'active',
    } as Omit<CatalogCategory, 'id' | 'created_at' | 'updated_at'>);
    dispatch({ type: 'ADD_CATALOG_CATEGORY', payload: newCategory });
    await catalogService.refreshCatalogCounts(supabase, cat.id);
    return newCategory;
  }, [ensureCatalog, supabase, dispatch]);

  const updateCategory = useCallback(async (
    categoryId: string,
    updates: Partial<CatalogCategory>
  ) => {
    const updated = await catalogService.updateCategory(supabase, categoryId, updates);
    dispatch({ type: 'UPDATE_CATALOG_CATEGORY', payload: { categoryId, updates: updated } });
  }, [supabase, dispatch]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    await catalogService.deleteCategory(supabase, categoryId);
    dispatch({ type: 'DELETE_CATALOG_CATEGORY', payload: { categoryId } });
    if (catalog) {
      await catalogService.refreshCatalogCounts(supabase, catalog.id);
    }
  }, [supabase, dispatch, catalog]);

  const linkCategoryToTopic = useCallback(async (categoryId: string, topicId: string | null) => {
    await catalogService.linkCategoryToTopic(supabase, categoryId, topicId);
    dispatch({ type: 'LINK_CATEGORY_TO_TOPIC', payload: { categoryId, topicId } });
  }, [supabase, dispatch]);

  const selectCategory = useCallback((categoryId: string | null) => {
    dispatch({ type: 'SET_SELECTED_CATEGORY', payload: categoryId });
  }, [dispatch]);

  // ========================================================================
  // PRODUCT OPERATIONS
  // ========================================================================

  const addProduct = useCallback(async (
    product: Omit<CatalogProduct, 'id' | 'created_at' | 'updated_at'>,
    categoryIds?: { categoryId: string; isPrimary: boolean }[]
  ): Promise<CatalogProduct> => {
    const newProduct = await catalogService.createProduct(supabase, product, categoryIds);
    dispatch({ type: 'ADD_CATALOG_PRODUCT', payload: newProduct });

    // Refresh category counts
    if (categoryIds) {
      for (const cat of categoryIds) {
        await catalogService.refreshCategoryCounts(supabase, cat.categoryId);
      }
    }
    if (catalog) {
      await catalogService.refreshCatalogCounts(supabase, catalog.id);
    }

    return newProduct;
  }, [supabase, dispatch, catalog]);

  const updateProduct = useCallback(async (
    productId: string,
    updates: Partial<CatalogProduct>
  ) => {
    const updated = await catalogService.updateProduct(supabase, productId, updates);
    dispatch({ type: 'UPDATE_CATALOG_PRODUCT', payload: { productId, updates: updated } });
  }, [supabase, dispatch]);

  const deleteProduct = useCallback(async (productId: string) => {
    await catalogService.deleteProduct(supabase, productId);
    dispatch({ type: 'DELETE_CATALOG_PRODUCT', payload: { productId } });
    if (catalog) {
      await catalogService.refreshCatalogCounts(supabase, catalog.id);
    }
  }, [supabase, dispatch, catalog]);

  const bulkAddProducts = useCallback(async (
    productData: Omit<CatalogProduct, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<CatalogProduct[]> => {
    const BATCH_SIZE = 50;
    const allProducts: CatalogProduct[] = [];

    for (let i = 0; i < productData.length; i += BATCH_SIZE) {
      const batch = productData.slice(i, i + BATCH_SIZE);
      dispatch({
        type: 'SET_CATALOG_IMPORT_PROGRESS',
        payload: { current: i, total: productData.length },
      });

      const inserted = await catalogService.bulkCreateProducts(supabase, batch);
      allProducts.push(...inserted);
    }

    dispatch({ type: 'ADD_CATALOG_PRODUCTS', payload: allProducts });
    dispatch({ type: 'SET_CATALOG_IMPORT_PROGRESS', payload: null });

    if (catalog) {
      await catalogService.refreshCatalogCounts(supabase, catalog.id);
    }

    return allProducts;
  }, [supabase, dispatch, catalog]);

  // ========================================================================
  // EXPORT
  // ========================================================================

  const exportCatalog = useCallback(async () => {
    if (!catalog) return;
    const activeMap = state.topicalMaps.find(m => m.id === mapId);
    const topics = activeMap?.topics || [];

    try {
      const assignments = await catalogService.getProductCategoryAssignments(supabase, catalog.id);
      downloadCatalogExport(products, categories, topics, assignments);
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }, [catalog, products, categories, state.topicalMaps, mapId, supabase, dispatch]);

  // ========================================================================
  // AUTO-LINK
  // ========================================================================

  const runAutoLink = useCallback(async () => {
    const activeMap = state.topicalMaps.find(m => m.id === mapId);
    const topics = activeMap?.topics || [];

    if (categories.length === 0 || topics.length === 0) {
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Need both categories and topics to auto-link.' });
      return;
    }

    setIsAutoLinking(true);
    try {
      const results = await autoLinkCategoriesToTopics(categories, topics, businessInfo, dispatch);
      setAutoLinkResults(results);
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: `Auto-link failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsAutoLinking(false);
    }
  }, [categories, state.topicalMaps, mapId, businessInfo, dispatch]);

  const clearAutoLinkResults = useCallback(() => {
    setAutoLinkResults(null);
  }, []);

  // ========================================================================
  // DERIVED STATE
  // ========================================================================

  const selectedCategory = selectedCategoryId
    ? categories.find(c => c.id === selectedCategoryId) || null
    : null;

  const productsForSelectedCategory = selectedCategoryId
    ? products.filter(p => {
        // This is a simplified check. In production, we'd query assignments.
        // For now, we load all products and filter client-side.
        return true; // Will be refined when assignments are loaded
      })
    : products;

  const rootCategories = categories.filter(c => !c.parent_category_id);

  const getCategoryChildren = useCallback((parentId: string) => {
    return categories.filter(c => c.parent_category_id === parentId);
  }, [categories]);

  const hasCatalog = catalog !== null;
  // websiteType is stored per-map in business_info, so check both map-level and global state
  const activeMap = state.topicalMaps.find(m => m.id === mapId);
  const mapBizInfo = activeMap?.business_info as Record<string, unknown> | undefined;
  const isEcommerce = (mapBizInfo?.websiteType || businessInfo.websiteType) === 'ECOMMERCE';

  return {
    // State
    catalog,
    categories,
    products,
    isLoading,
    hasCatalog,
    isEcommerce,
    selectedCategory,
    selectedCategoryId,
    rootCategories,
    importProgress: state.catalog.importProgress,

    // Auto-link
    autoLinkResults,
    isAutoLinking,

    // Actions
    loadCatalog,
    ensureCatalog,
    addCategory,
    updateCategory,
    deleteCategory,
    linkCategoryToTopic,
    selectCategory,
    getCategoryChildren,
    addProduct,
    updateProduct,
    deleteProduct,
    bulkAddProducts,
    exportCatalog,
    runAutoLink,
    clearAutoLinkResults,
  };
}
