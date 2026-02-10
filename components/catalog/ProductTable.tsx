/**
 * ProductTable - Spreadsheet-style product listing
 *
 * Shows products in a sortable table with inline editing for price/availability.
 * Supports selection, bulk operations, and row-click to open detail panel.
 */

import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import type { CatalogProduct } from '../../types/catalog';

interface ProductTableProps {
  products: CatalogProduct[];
  onSelectProduct: (productId: string) => void;
  onUpdateProduct: (productId: string, updates: Partial<CatalogProduct>) => void;
  onDeleteProduct: (productId: string) => void;
  onAddProduct: () => void;
}

type SortField = 'name' | 'sku' | 'price' | 'brand' | 'availability' | 'rating_value';
type SortDirection = 'asc' | 'desc';

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onSelectProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddProduct,
}) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const aStr = aVal != null ? String(aVal) : '';
      const bStr = bVal != null ? String(bVal) : '';
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [products, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const startEdit = (id: string, field: string, currentValue: string) => {
    setEditingCell({ id, field });
    setEditValue(currentValue);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;

    if (field === 'price' || field === 'sale_price') {
      const num = parseFloat(editValue.replace(/[,$]/g, ''));
      onUpdateProduct(id, { [field]: isNaN(num) ? undefined : num } as any);
    } else if (field === 'availability') {
      onUpdateProduct(id, { availability: editValue as any });
    } else {
      onUpdateProduct(id, { [field]: editValue } as any);
    }
    setEditingCell(null);
  };

  const SortHeader: React.FC<{ field: SortField; label: string; className?: string }> = ({ field, label, className }) => (
    <th
      className={`px-3 py-2 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-200 select-none ${className || ''}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        )}
      </span>
    </th>
  );

  const formatPrice = (price?: number, currency?: string) => {
    if (price == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <span className="text-xs text-gray-400">
          {products.length} product{products.length !== 1 ? 's' : ''}
        </span>
        <Button variant="primary" size="sm" onClick={onAddProduct}>
          + Add Product
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm">No products yet</p>
            <p className="text-xs mt-1">Add products manually or import a CSV</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr>
                <SortHeader field="name" label="Name" />
                <SortHeader field="sku" label="SKU" className="w-24" />
                <SortHeader field="price" label="Price" className="w-24" />
                <SortHeader field="brand" label="Brand" className="w-32" />
                <SortHeader field="availability" label="Status" className="w-28" />
                <SortHeader field="rating_value" label="Rating" className="w-20" />
                <th className="px-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map(product => (
                <tr
                  key={product.id}
                  className="border-b border-gray-800 hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => onSelectProduct(product.id)}
                >
                  <td className="px-3 py-2 text-sm text-gray-200">{product.name}</td>
                  <td className="px-3 py-2 text-xs text-gray-400 font-mono">{product.sku || '-'}</td>
                  <td
                    className="px-3 py-2 text-sm text-gray-300"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEdit(product.id, 'price', product.price != null ? String(product.price) : '');
                    }}
                  >
                    {editingCell?.id === product.id && editingCell.field === 'price' ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                        className="w-20 bg-gray-900 border border-blue-500 rounded px-1 py-0.5 text-sm"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      formatPrice(product.price, product.currency)
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-400">{product.brand || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      product.availability === 'InStock'
                        ? 'bg-green-900/30 text-green-400'
                        : product.availability === 'PreOrder'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-red-900/30 text-red-400'
                    }`}>
                      {product.availability}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-400">
                    {product.rating_value != null ? `${product.rating_value}/5` : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id); }}
                      className="text-gray-500 hover:text-red-400 text-xs"
                      title="Delete product"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProductTable;
