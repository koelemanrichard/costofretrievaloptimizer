/**
 * HelpEditor.tsx
 *
 * Admin interface for managing help documentation content.
 * Allows creating, editing, and organizing help categories and articles.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Loader } from '../ui/Loader';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import {
  HelpCategory,
  HelpArticle,
  HelpCategoryWithArticles,
  DEFAULT_HELP_CATEGORIES
} from '../../types/help';
import {
  getCategories,
  getCategoriesWithArticles,
  createCategory,
  updateCategory,
  deleteCategory,
  createArticle,
  updateArticle,
  deleteArticle,
  bulkCreateCategories
} from '../../services/helpService';
import { SimpleMarkdown } from '../ui/SimpleMarkdown';

// =============================================================================
// CATEGORY MANAGER
// =============================================================================

interface CategoryManagerProps {
  categories: HelpCategory[];
  onRefresh: () => void;
  onSelectCategory: (category: HelpCategory) => void;
  selectedCategoryId?: string;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onRefresh,
  onSelectCategory,
  selectedCategoryId
}) => {
  const { state, dispatch } = useAppState();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', icon: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) return;
    setIsSubmitting(true);
    try {
      await createCategory(supabase, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        icon: formData.icon || undefined,
        sort_order: categories.length
      });
      setFormData({ name: '', slug: '', description: '', icon: '' });
      setIsCreating(false);
      onRefresh();
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Category created successfully.' });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to create category.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.name || !formData.slug) return;
    setIsSubmitting(true);
    try {
      await updateCategory(supabase, editingId, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        icon: formData.icon || undefined
      });
      setEditingId(null);
      setFormData({ name: '', slug: '', description: '', icon: '' });
      onRefresh();
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Category updated successfully.' });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to update category.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? All articles in it will be deleted.')) return;
    try {
      await deleteCategory(supabase, id);
      onRefresh();
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Category deleted.' });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to delete category.' });
    }
  };

  const handleSeedCategories = async () => {
    if (!confirm('This will create all default help categories. Continue?')) return;
    setIsSubmitting(true);
    try {
      await bulkCreateCategories(supabase, DEFAULT_HELP_CATEGORIES);
      onRefresh();
      dispatch({ type: 'SET_NOTIFICATION', payload: `Created ${DEFAULT_HELP_CATEGORIES.length} categories.` });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to seed categories.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (cat: HelpCategory) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || ''
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Categories</h3>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button
              variant="secondary"
              className="text-xs"
              onClick={handleSeedCategories}
              disabled={isSubmitting}
            >
              Seed Default Categories
            </Button>
          )}
          <Button
            className="text-xs bg-green-600 hover:bg-green-700"
            onClick={() => {
              setIsCreating(true);
              setEditingId(null);
              setFormData({ name: '', slug: '', description: '', icon: '' });
            }}
          >
            + Add Category
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <Card className="p-4 border-cyan-500/30">
          <h4 className="text-sm font-semibold text-white mb-3">
            {editingId ? 'Edit Category' : 'New Category'}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Getting Started"
              />
            </div>
            <div>
              <Label className="text-xs">Slug</Label>
              <Input
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                placeholder="getting-started"
              />
            </div>
            <div>
              <Label className="text-xs">Icon (emoji)</Label>
              <Input
                value={formData.icon}
                onChange={e => setFormData({ ...formData, icon: e.target.value })}
                placeholder="📚"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Learn the basics"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => {
                setIsCreating(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="text-xs"
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader className="w-4 h-4" /> : (editingId ? 'Update' : 'Create')}
            </Button>
          </div>
        </Card>
      )}

      {/* Category List */}
      <div className="space-y-1">
        {categories.map(cat => (
          <div
            key={cat.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              selectedCategoryId === cat.id
                ? 'bg-cyan-900/30 border border-cyan-500/30'
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            }`}
            onClick={() => onSelectCategory(cat)}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{cat.icon || '📄'}</span>
              <div>
                <p className="text-white text-sm font-medium">{cat.name}</p>
                <p className="text-gray-500 text-xs">{cat.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${cat.is_published ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                {cat.is_published ? 'Published' : 'Draft'}
              </span>
              <button
                onClick={e => { e.stopPropagation(); startEdit(cat); }}
                className="text-blue-400 hover:text-blue-300 text-xs"
              >
                Edit
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(cat.id); }}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">
            No categories yet. Seed the defaults or create a new one.
          </p>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// ARTICLE EDITOR
// =============================================================================

interface ArticleEditorProps {
  category: HelpCategory;
  articles: HelpArticle[];
  onRefresh: () => void;
}

const ArticleEditor: React.FC<ArticleEditorProps> = ({ category, articles, onRefresh }) => {
  const { state, dispatch } = useAppState();
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    feature_keys: '',
    search_keywords: ''
  });

  const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      summary: '',
      content: '',
      status: 'draft',
      feature_keys: '',
      search_keywords: ''
    });
  };

  const loadArticle = (article: HelpArticle) => {
    setSelectedArticle(article);
    setIsCreating(false);
    setFormData({
      title: article.title,
      slug: article.slug,
      summary: article.summary || '',
      content: article.content || '',
      status: article.status,
      feature_keys: (article.feature_keys || []).join(', '),
      search_keywords: (article.search_keywords || []).join(', ')
    });
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.slug || !formData.content) return;
    setIsSubmitting(true);
    try {
      await createArticle(supabase, {
        category_id: category.id,
        title: formData.title,
        slug: formData.slug,
        summary: formData.summary || undefined,
        content: formData.content,
        status: formData.status,
        feature_keys: formData.feature_keys.split(',').map(s => s.trim()).filter(Boolean),
        search_keywords: formData.search_keywords.split(',').map(s => s.trim()).filter(Boolean),
        sort_order: articles.length
      });
      resetForm();
      setIsCreating(false);
      onRefresh();
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Article created successfully.' });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to create article.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedArticle || !formData.title || !formData.slug || !formData.content) return;
    setIsSubmitting(true);
    try {
      await updateArticle(supabase, selectedArticle.id, {
        title: formData.title,
        slug: formData.slug,
        summary: formData.summary || undefined,
        content: formData.content,
        status: formData.status,
        feature_keys: formData.feature_keys.split(',').map(s => s.trim()).filter(Boolean),
        search_keywords: formData.search_keywords.split(',').map(s => s.trim()).filter(Boolean)
      });
      onRefresh();
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Article updated successfully.' });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to update article.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      await deleteArticle(supabase, id);
      if (selectedArticle?.id === id) {
        setSelectedArticle(null);
        resetForm();
      }
      onRefresh();
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Article deleted.' });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to delete article.' });
    }
  };

  const handlePublish = async () => {
    if (!selectedArticle) return;
    setIsSubmitting(true);
    try {
      await updateArticle(supabase, selectedArticle.id, {
        status: 'published',
        published_at: new Date().toISOString()
      });
      setFormData({ ...formData, status: 'published' });
      onRefresh();
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Article published!' });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to publish article.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Article List */}
      <div className="w-64 flex-shrink-0 space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-semibold text-white">Articles in {category.name}</h4>
          <Button
            className="text-xs bg-green-600 hover:bg-green-700"
            onClick={() => {
              setIsCreating(true);
              setSelectedArticle(null);
              resetForm();
            }}
          >
            + New
          </Button>
        </div>
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {articles.map(article => (
            <button
              key={article.id}
              onClick={() => loadArticle(article)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedArticle?.id === article.id
                  ? 'bg-cyan-900/30 border border-cyan-500/30'
                  : 'bg-gray-800/50 hover:bg-gray-700/50'
              }`}
            >
              <p className="text-white text-sm truncate">{article.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  article.status === 'published' ? 'bg-green-900/50 text-green-300' :
                  article.status === 'archived' ? 'bg-gray-700 text-gray-400' :
                  'bg-yellow-900/50 text-yellow-300'
                }`}>
                  {article.status}
                </span>
              </div>
            </button>
          ))}
          {articles.length === 0 && (
            <p className="text-gray-500 text-xs text-center py-4">No articles yet.</p>
          )}
        </div>
      </div>

      {/* Editor */}
      <Card className="flex-1 p-4 overflow-y-auto">
        {!selectedArticle && !isCreating ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select an article to edit or create a new one.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-white">
                {isCreating ? 'New Article' : 'Edit Article'}
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
                {selectedArticle && formData.status !== 'published' && (
                  <Button
                    className="text-xs bg-green-600 hover:bg-green-700"
                    onClick={handlePublish}
                    disabled={isSubmitting}
                  >
                    Publish
                  </Button>
                )}
                {selectedArticle && (
                  <button
                    onClick={() => handleDelete(selectedArticle.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {showPreview ? (
              <div className="prose prose-invert max-w-none bg-gray-800/50 rounded-lg p-6">
                <h1>{formData.title || 'Untitled'}</h1>
                {formData.summary && <p className="lead text-gray-400">{formData.summary}</p>}
                <SimpleMarkdown content={formData.content || '*No content yet*'} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Getting Started Guide"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Slug</Label>
                    <Input
                      value={formData.slug}
                      onChange={e => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="getting-started-guide"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Summary</Label>
                  <Input
                    value={formData.summary}
                    onChange={e => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="A brief description of this article"
                  />
                </div>

                <div>
                  <Label className="text-xs">Content (Markdown)</Label>
                  <textarea
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your help content here using Markdown..."
                    className="w-full h-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Feature Keys (comma-separated)</Label>
                    <Input
                      value={formData.feature_keys}
                      onChange={e => setFormData({ ...formData, feature_keys: e.target.value })}
                      placeholder="modal:contentBrief, button:generateBrief"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for contextual help links from UI elements.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Search Keywords (comma-separated)</Label>
                    <Input
                      value={formData.search_keywords}
                      onChange={e => setFormData({ ...formData, search_keywords: e.target.value })}
                      placeholder="tutorial, setup, configuration"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedArticle(null);
                      setIsCreating(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={isCreating ? handleCreate : handleUpdate}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader className="w-4 h-4" /> : (isCreating ? 'Create Article' : 'Save Changes')}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

// =============================================================================
// MAIN HELP EDITOR COMPONENT
// =============================================================================

const HelpEditor: React.FC = () => {
  const { state } = useAppState();
  const [categories, setCategories] = useState<HelpCategoryWithArticles[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCategoriesWithArticles(supabase);
      setCategories(data);
    } catch (e) {
      console.error('Failed to fetch help categories:', e);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleSelectCategory = (cat: HelpCategory) => {
    setSelectedCategory(cat);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8" />
      </div>
    );
  }

  const selectedCategoryWithArticles = categories.find(c => c.id === selectedCategory?.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Help Documentation</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage help categories and articles. Content supports Markdown formatting.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleRefresh}>
            Refresh
          </Button>
          <Button
            onClick={() => window.open('/help.html', 'holistic-seo-help', 'width=1200,height=800')}
          >
            Preview Help Window
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Categories Panel */}
        <Card className="p-4 col-span-1">
          <CategoryManager
            categories={categories}
            onRefresh={handleRefresh}
            onSelectCategory={handleSelectCategory}
            selectedCategoryId={selectedCategory?.id}
          />
        </Card>

        {/* Articles Panel */}
        <div className="col-span-2">
          {selectedCategoryWithArticles ? (
            <ArticleEditor
              category={selectedCategoryWithArticles}
              articles={selectedCategoryWithArticles.articles}
              onRefresh={handleRefresh}
            />
          ) : (
            <Card className="p-8 flex items-center justify-center h-full">
              <p className="text-gray-500">Select a category to manage its articles.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpEditor;
