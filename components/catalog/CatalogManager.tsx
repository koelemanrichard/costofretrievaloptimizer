/**
 * CatalogManager - Main two-panel catalog management interface
 *
 * Left panel: Category tree (30% width)
 * Right panel: Product table or category details (70% width)
 * Top: Action bar with import, export, auto-link
 */

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { AuditButton } from '../audit/AuditButton';
import CategoryTree from './CategoryTree';
import CategoryEditForm from './CategoryEditForm';
import ProductTable from './ProductTable';
import ProductDetailPanel from './ProductDetailPanel';
import AutoLinkDialog from './AutoLinkDialog';
import TopicLinkPopover from './TopicLinkPopover';
import RelinkConsentDialog from './RelinkConsentDialog';
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
    exportCatalog,
    runAutoLink,
    clearAutoLinkResults,
  } = useCatalog(mapId);

  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryFormParentId, setCategoryFormParentId] = useState<string | undefined>();
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [linkPopover, setLinkPopover] = useState<{ categoryId: string; anchorPosition: { top: number; left: number } } | null>(null);
  const [showRelinkConsent, setShowRelinkConsent] = useState(false);

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

  // Topic link popover
  const handleLinkClick = useCallback((categoryId: string, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setLinkPopover({
      categoryId,
      anchorPosition: { top: rect.bottom + 4, left: rect.left },
    });
  }, []);

  const handleLinkChange = useCallback(async (categoryId: string, topicId: string | null) => {
    await linkCategoryToTopic(categoryId, topicId);
    setLinkPopover(null);
  }, [linkCategoryToTopic]);

  // Import
  const handleImportComplete = useCallback(async (options?: { triggerRelink: boolean }) => {
    setShowImportWizard(false);
    await loadCatalog();

    if (options?.triggerRelink) {
      // Check if any linked categories have topics with briefs
      const linkedCategories = categories.filter(c => c.linked_topic_id);
      const linkedTopicIds = new Set(linkedCategories.map(c => c.linked_topic_id!));
      const topicsWithBriefs = topics.filter(t => linkedTopicIds.has(t.id));
      if (topicsWithBriefs.length > 0) {
        setShowRelinkConsent(true);
      }
    }
  }, [loadCatalog, categories, topics]);

  // Relink consent
  const handleRelinkConfirm = useCallback(() => {
    setShowRelinkConsent(false);
    runAutoLink();
  }, [runAutoLink]);

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

  // Resolve linked topic name for selected category header
  const selectedCategoryLinkedTopic = selectedCategory?.linked_topic_id
    ? topics.find(t => t.id === selectedCategory.linked_topic_id)
    : null;

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
            onClick={exportCatalog}
            disabled={products.length === 0}
          >
            Export Catalog
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
            topics={topics}
            onSelectCategory={selectCategory}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onLinkClick={handleLinkClick}
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
                    <>
                      <a
                        href={selectedCategory.store_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        {selectedCategory.store_url}
                      </a>
                      <AuditButton url={selectedCategory.store_url} variant="icon" size="sm" />
                    </>
                  )}
                  {selectedCategoryLinkedTopic ? (
                    <button
                      onClick={(e) => handleLinkClick(selectedCategory.id, e)}
                      className="flex items-center gap-1 text-xs text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded hover:bg-green-900/30 transition-colors"
                    >
                      <span>Linked to: {selectedCategoryLinkedTopic.title}</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleLinkClick(selectedCategory.id, e)}
                      className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded hover:bg-gray-700 hover:text-gray-400 transition-colors"
                    >
                      Not linked — click to link
                    </button>
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
          existingProducts={products}
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

      {/* Topic Link Popover */}
      {linkPopover && (
        <TopicLinkPopover
          categoryId={linkPopover.categoryId}
          currentTopicId={categories.find(c => c.id === linkPopover.categoryId)?.linked_topic_id || null}
          topics={topics}
          anchorPosition={linkPopover.anchorPosition}
          onLink={handleLinkChange}
          onClose={() => setLinkPopover(null)}
        />
      )}

      {/* Relink Consent Dialog */}
      {showRelinkConsent && (
        <RelinkConsentDialog
          affectedTopicCount={categories.filter(c => c.linked_topic_id).length}
          onRelink={handleRelinkConfirm}
          onKeep={() => setShowRelinkConsent(false)}
        />
      )}
    </div>
  );
};

export default CatalogManager;
