/**
 * Catalog Exporter - Export catalog data to CSV for bulk editing and re-import
 *
 * Generates a CSV with all product fields, category names, and linked topic info.
 */

import type { CatalogProduct, CatalogCategory } from '../../types/catalog';
import type { EnrichedTopic } from '../../types';

const EXPORT_HEADERS = [
  'name',
  'sku',
  'brand',
  'description',
  'price',
  'currency',
  'sale_price',
  'product_url',
  'image_url',
  'availability',
  'rating',
  'review_count',
  'tags',
  'category',
  'linked_topic_title',
  'linked_topic_id',
];

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportCatalogCsv(
  products: CatalogProduct[],
  categories: CatalogCategory[],
  topics: EnrichedTopic[],
  categoryAssignments: Map<string, string[]>
): string {
  const headerLine = EXPORT_HEADERS.map(escapeCsvField).join(',');

  const dataLines = products.map(product => {
    const assignedCategoryIds = categoryAssignments.get(product.id) || [];
    const primaryCategory = assignedCategoryIds.length > 0
      ? categories.find(c => c.id === assignedCategoryIds[0])
      : undefined;
    const linkedTopic = primaryCategory?.linked_topic_id
      ? topics.find(t => t.id === primaryCategory.linked_topic_id)
      : undefined;

    const row = [
      product.name || '',
      product.sku || '',
      product.brand || '',
      product.short_description || '',
      product.price != null ? String(product.price) : '',
      product.currency || '',
      product.sale_price != null ? String(product.sale_price) : '',
      product.product_url || '',
      product.image_url || '',
      product.availability || '',
      product.rating_value != null ? String(product.rating_value) : '',
      String(product.review_count || 0),
      (product.tags || []).join(';'),
      primaryCategory?.name || '',
      linkedTopic?.title || '',
      primaryCategory?.linked_topic_id || '',
    ];

    return row.map(escapeCsvField).join(',');
  });

  return [headerLine, ...dataLines].join('\n');
}

export function downloadCatalogExport(
  products: CatalogProduct[],
  categories: CatalogCategory[],
  topics: EnrichedTopic[],
  categoryAssignments: Map<string, string[]>
): void {
  const csv = exportCatalogCsv(products, categories, topics, categoryAssignments);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const date = new Date().toISOString().split('T')[0];
  link.download = `catalog-export-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
