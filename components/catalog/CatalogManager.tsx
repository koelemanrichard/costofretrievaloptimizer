/**
 * CatalogManager - Main two-panel catalog management interface
 *
 * Left panel: Category tree (30% width)
 * Right panel: Product table or category details (70% width)
 * Top: Action bar with import, auto-link, export
 */

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import CategoryTree from './CategoryTree';
import CategoryEditForm from './CategoryEditForm';
import ProductTable from './ProductTable';
import ProductDetailPanel from './ProductDetailPanel';
import AutoLinkDialog from './AutoLinkDialog';
import CatalogImportWizard from './import/CatalogImportWizard';
import { useCatalog } from '../../hooks/useCatalog';
import { useAppState } from '../../state/appState';
import type { CatalogProduct } from '../../types/catalog';

interface CatalogManagerProps {
  mapId: string;
}

const CatalogManager: React.FC<CatalogManagerProps> = ({ mapId }) => {
  const { state } = useAppState();
  const {
    catalog,
    categories,
    products,
    isLoading,
    selectedCategory,
    selectedCategoryId,
    rootCategories,
    importProgress,
    autoLinkResults,
    isAutoLinking,
    loadCatalog,
    ensureCatalog,
    addCategory,
    updateCategory,
    deleteCategory,
    linkCategoryToTopic,
    selectCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    bulkAddProducts,
    runAutoLink,
    clearAutoLinkResults,
  } = useCatalog(mapId);

  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryFormParentId, setCategoryFormParentId] = useState<string | undefined>();
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);

  const activeMap = state.topicalMaps.find(m => m.id === mapId);
  const topics = activeMap?.topics || [];

  // Category actions
  const handleAddCategory = useCallback((parentId?: string) => {
    setCategoryFormParentId(parentId);
    setShowCategoryForm(true);
  }, []);

  const handleSaveCategory = useCallback(async (data: {
    name: string;
    description?: string;
    slug?: string;
    store_url?: string;
    parent_category_id?: string | null;
  }) => {
    await addCategory(data.name, data.parent_category_id || undefined, data.description);
    setShowCategoryForm(false);
  }, [addCategory]);

  const handleDeleteCategory = useCallback(async (categoryId: string) => {
    if (confirm('Delete this category? Products will not be deleted but will be unassigned.')) {
      await deleteCategory(categoryId);
    }
  }, [deleteCategory]);

  // Product actions
  const handleSelectProduct = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) setEditingProduct(product);
  }, [products]);

  const handleSaveProduct = useCallback(async (productId: string, updates: Partial<CatalogProduct>) => {
    await updateProduct(productId, updates);
    setEditingProduct(null);
  }, [updateProduct]);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    if (confirm('Delete this product?')) {
      await deleteProduct(productId);
    }
  }, [deleteProduct]);

  const handleCreateProduct = useCallback(async (product: Omit<CatalogProduct, 'id' | 'created_at' | 'updated_at'>) => {
    const categoryIds = selectedCategoryId
      ? [{ categoryId: selectedCategoryId, isPrimary: true }]
      : undefined;
    await addProduct(product, categoryIds);
    setShowNewProduct(false);
  }, [addProduct, selectedCategoryId]);

  // Import
  const handleImportComplete = useCallback(async () => {
    setShowImportWizard(false);
    await loadCatalog();
  }, [loadCatalog]);

  // Auto-link
  const handleAutoLinkApply = useCallback(async (
    links: { categoryId: string; topicId: string }[],
    _newTopics: { categoryId: string; title: string; type: 'core' | 'outer' | 'child'; topicClass: 'monetization' | 'informational'; parentTopicId?: string }[]
  ) => {
    for (const link of links) {
      await linkCategoryToTopic(link.categoryId, link.topicId);
    }
    // TODO: Create new topics for _newTopics entries
    clearAutoLinkResults();
  }, [linkCategoryToTopic, clearAutoLinkResults]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading catalog...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-gray-200">Product Catalog</h2>
          <span className="text-xs text-gray-500">
            {products.length} products in {categories.length} categories
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportWizard(true)}
          >
            Import Products
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={runAutoLink}
            disabled={isAutoLinking || categories.length === 0 || topics.length === 0}
          >
            {isAutoLinking ? 'Linking...' : 'Auto-link to Topics'}
          </Button>
        </div>
      </div>

      {/* Import progress bar */}
      {importProgress && (
        <div className="px-4 py-2 bg-blue-900/20 border-b border-blue-900/30">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-blue-300">
              {importProgress.current}/{importProgress.total}
            </span>
          </div>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Category Tree */}
        <div className="w-[30%] min-w-[200px] border-r border-gray-700 overflow-y-auto bg-gray-900/30">
          <CategoryTree
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={selectCategory}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        </div>

        {/* Right Panel - Products */}
        <div className="flex-1 overflow-hidden">
          {/* Category header when a category is selected */}
          {selectedCategory && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800/30 border-b border-gray-700">
              <div>
                <h3 className="text-sm font-medium text-gray-200">{selectedCategory.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedCategory.store_url && (
                    <a
                      href={selectedCategory.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {selectedCategory.store_url}
                    </a>
                  )}
                  {selectedCategory.linked_topic_id ? (
                    <span className="text-xs text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded">
                      Linked to topic
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                      Not linked
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <ProductTable
            products={products}
            onSelectProduct={handleSelectProduct}
            onUpdateProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddProduct={() => setShowNewProduct(true)}
          />
        </div>
      </div>

      {/* Category Edit Form (modal-style overlay) */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96">
            <CategoryEditForm
              parentCategories={categories}
              onSave={handleSaveCategory}
              onCancel={() => setShowCategoryForm(false)}
            />
          </div>
        </div>
      )}

      {/* Product Detail Panel (slide-out) */}
      {(editingProduct || showNewProduct) && catalog && (
        <ProductDetailPanel
          product={editingProduct}
          catalogId={catalog.id}
          onSave={handleSaveProduct}
          onClose={() => { setEditingProduct(null); setShowNewProduct(false); }}
          isNew={showNewProduct}
          onCreateNew={handleCreateProduct}
        />
      )}

      {/* Import Wizard */}
      {showImportWizard && catalog && (
        <CatalogImportWizard
          catalogId={catalog.id}
          onComplete={handleImportComplete}
          onClose={() => setShowImportWizard(false)}
        />
      )}

      {/* Auto-Link Dialog */}
      {autoLinkResults && (
        <AutoLinkDialog
          suggestions={autoLinkResults.suggestions}
          newTopicSuggestions={autoLinkResults.newTopicSuggestions}
          topics={topics}
          onApply={handleAutoLinkApply}
          onClose={clearAutoLinkResults}
        />
      )}
    </div>
  );
};

export default CatalogManager;
