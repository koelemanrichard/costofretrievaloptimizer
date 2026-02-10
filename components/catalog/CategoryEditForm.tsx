/**
 * CategoryEditForm - Form for creating/editing catalog categories
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import type { CatalogCategory } from '../../types/catalog';

interface CategoryEditFormProps {
  category?: CatalogCategory | null;
  parentCategories: CatalogCategory[];
  onSave: (data: {
    name: string;
    description?: string;
    slug?: string;
    store_url?: string;
    parent_category_id?: string | null;
  }) => void;
  onCancel: () => void;
}

const CategoryEditForm: React.FC<CategoryEditFormProps> = ({
  category,
  parentCategories,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [slug, setSlug] = useState(category?.slug || '');
  const [storeUrl, setStoreUrl] = useState(category?.store_url || '');
  const [parentId, setParentId] = useState<string>(category?.parent_category_id || '');

  useEffect(() => {
    if (!slug && name) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      slug: slug.trim() || undefined,
      store_url: storeUrl.trim() || undefined,
      parent_category_id: parentId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-medium text-gray-200">
        {category ? 'Edit Category' : 'New Category'}
      </h3>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Category Name *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
          placeholder="e.g., Organic Baby Bodysuits"
          autoFocus
          required
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Parent Category</label>
        <select
          value={parentId}
          onChange={e => setParentId(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="">None (root category)</option>
          {parentCategories
            .filter(c => c.id !== category?.id)
            .map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))
          }
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
          rows={2}
          placeholder="Brief description of this category..."
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Store URL (optional)</label>
        <input
          type="url"
          value={storeUrl}
          onChange={e => setStoreUrl(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
          placeholder="https://store.example.com/category/..."
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">URL Slug</label>
        <input
          type="text"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
          placeholder="organic-baby-bodysuits"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" variant="primary" size="sm" disabled={!name.trim()}>
          {category ? 'Save' : 'Create'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default CategoryEditForm;
