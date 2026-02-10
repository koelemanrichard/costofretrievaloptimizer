/**
 * ProductDetailPanel - Slide-out panel for viewing/editing a single product
 *
 * Shows all product fields including the flexible attribute key-value editor.
 * Used as a side panel that slides in from the right.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import type { CatalogProduct, ProductAvailability } from '../../types/catalog';

interface ProductDetailPanelProps {
  product: CatalogProduct | null;
  catalogId: string;
  onSave: (productId: string, updates: Partial<CatalogProduct>) => void;
  onClose: () => void;
  isNew?: boolean;
  onCreateNew?: (product: Omit<CatalogProduct, 'id' | 'created_at' | 'updated_at'>) => void;
}

const ProductDetailPanel: React.FC<ProductDetailPanelProps> = ({
  product,
  catalogId,
  onSave,
  onClose,
  isNew,
  onCreateNew,
}) => {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    brand: '',
    short_description: '',
    price: '',
    currency: 'USD',
    sale_price: '',
    product_url: '',
    image_url: '',
    availability: 'InStock' as ProductAvailability,
    rating_value: '',
    review_count: '',
    tags: '',
  });
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku || '',
        brand: product.brand || '',
        short_description: product.short_description || '',
        price: product.price != null ? String(product.price) : '',
        currency: product.currency || 'USD',
        sale_price: product.sale_price != null ? String(product.sale_price) : '',
        product_url: product.product_url || '',
        image_url: product.image_url || '',
        availability: product.availability || 'InStock',
        rating_value: product.rating_value != null ? String(product.rating_value) : '',
        review_count: product.review_count != null ? String(product.review_count) : '',
        tags: (product.tags || []).join(', '),
      });
      setAttributes(
        Object.entries(product.attributes || {}).map(([key, value]) => ({ key, value }))
      );
    } else {
      setForm({
        name: '', sku: '', brand: '', short_description: '',
        price: '', currency: 'USD', sale_price: '',
        product_url: '', image_url: '',
        availability: 'InStock', rating_value: '', review_count: '', tags: '',
      });
      setAttributes([]);
    }
  }, [product]);

  const handleSave = () => {
    const attrs: Record<string, string> = {};
    attributes.forEach(a => {
      if (a.key.trim()) attrs[a.key.trim()] = a.value;
    });

    const updates: Partial<CatalogProduct> = {
      name: form.name,
      sku: form.sku || undefined,
      brand: form.brand || undefined,
      short_description: form.short_description || undefined,
      price: form.price ? parseFloat(form.price) : undefined,
      currency: form.currency,
      sale_price: form.sale_price ? parseFloat(form.sale_price) : undefined,
      product_url: form.product_url || undefined,
      image_url: form.image_url || undefined,
      availability: form.availability,
      rating_value: form.rating_value ? parseFloat(form.rating_value) : undefined,
      review_count: form.review_count ? parseInt(form.review_count, 10) : 0,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      attributes: attrs,
    };

    if (isNew && onCreateNew) {
      onCreateNew({
        ...updates,
        catalog_id: catalogId,
        name: form.name,
        currency: form.currency,
        availability: form.availability,
        additional_images: [],
        review_count: updates.review_count || 0,
        tags: updates.tags || [],
        attributes: attrs,
        status: 'active',
      } as Omit<CatalogProduct, 'id' | 'created_at' | 'updated_at'>);
    } else if (product) {
      onSave(product.id, updates);
    }
    onClose();
  };

  const addAttribute = () => {
    setAttributes([...attributes, { key: '', value: '' }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const updateAttribute = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...attributes];
    updated[index] = { ...updated[index], [field]: val };
    setAttributes(updated);
  };

  const Field: React.FC<{
    label: string; value: string; field: keyof typeof form;
    type?: string; placeholder?: string; required?: boolean;
  }> = ({ label, value, field, type = 'text', placeholder, required }) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}{required && ' *'}</label>
      <input
        type={type}
        value={value}
        onChange={e => setForm({ ...form, [field]: e.target.value })}
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
        placeholder={placeholder}
        required={required}
      />
    </div>
  );

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-700 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-200">
          {isNew ? 'New Product' : 'Edit Product'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <Field label="Product Name" value={form.name} field="name" placeholder="Required" required />

        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU" value={form.sku} field="sku" placeholder="Optional" />
          <Field label="Brand" value={form.brand} field="brand" placeholder="Optional" />
        </div>

        <Field label="Short Description" value={form.short_description} field="short_description" placeholder="Brief product description" />

        <div className="grid grid-cols-3 gap-3">
          <Field label="Price" value={form.price} field="price" type="number" placeholder="0.00" />
          <Field label="Sale Price" value={form.sale_price} field="sale_price" type="number" placeholder="0.00" />
          <div>
            <label className="block text-xs text-gray-400 mb-1">Currency</label>
            <select
              value={form.currency}
              onChange={e => setForm({ ...form, currency: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Availability</label>
          <select
            value={form.availability}
            onChange={e => setForm({ ...form, availability: e.target.value as ProductAvailability })}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="InStock">In Stock</option>
            <option value="OutOfStock">Out of Stock</option>
            <option value="PreOrder">Pre-Order</option>
          </select>
        </div>

        <Field label="Product URL" value={form.product_url} field="product_url" type="url" placeholder="Optional for sketch mode" />
        <Field label="Image URL" value={form.image_url} field="image_url" type="url" placeholder="Optional" />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Rating (0-5)" value={form.rating_value} field="rating_value" type="number" placeholder="4.5" />
          <Field label="Review Count" value={form.review_count} field="review_count" type="number" placeholder="0" />
        </div>

        <Field label="Tags (comma-separated)" value={form.tags} field="tags" placeholder="organic, bestseller" />

        {/* Attributes key-value editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">Custom Attributes</label>
            <button
              onClick={addAttribute}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {attributes.map((attr, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={attr.key}
                  onChange={e => updateAttribute(idx, 'key', e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200"
                  placeholder="Key (e.g., color)"
                />
                <input
                  type="text"
                  value={attr.value}
                  onChange={e => updateAttribute(idx, 'value', e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200"
                  placeholder="Value (e.g., Red)"
                />
                <button
                  onClick={() => removeAttribute(idx)}
                  className="text-gray-500 hover:text-red-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-4 py-3 border-t border-gray-700">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!form.name.trim()}>
          {isNew ? 'Create Product' : 'Save Changes'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default ProductDetailPanel;
