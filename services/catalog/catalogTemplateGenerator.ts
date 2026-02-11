/**
 * Catalog Template Generator - Downloadable CSV template for product import
 *
 * Generates a CSV template with all supported column headers and realistic
 * example rows so users know the expected format before importing.
 */

const TEMPLATE_HEADERS = [
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
];

const EXAMPLE_ROWS = [
  [
    'Wireless Noise-Cancelling Headphones',
    'WH-1000XM5',
    'Sony',
    'Industry-leading noise cancellation with 30-hour battery life',
    '349.99',
    'USD',
    '299.99',
    'https://example.com/products/wh-1000xm5',
    'https://example.com/images/wh-1000xm5.jpg',
    'InStock',
    '4.7',
    '2841',
    'wireless;noise-cancelling;over-ear',
    'Audio & Headphones',
  ],
  [
    'Ergonomic Office Chair',
    'ERG-PRO-BK',
    'Herman Miller',
    'Adjustable lumbar support with breathable mesh back',
    '1295.00',
    'USD',
    '',
    'https://example.com/products/ergonomic-chair',
    'https://example.com/images/ergo-chair.jpg',
    'InStock',
    '4.5',
    '1203',
    'ergonomic;office;mesh',
    'Office Furniture',
  ],
  [
    'Organic Dark Chocolate Bar 85%',
    'CHOC-DK-85',
    'Green & Black\'s',
    'Single-origin Peruvian cacao, fair trade certified',
    '4.99',
    'EUR',
    '3.99',
    'https://example.com/products/dark-chocolate-85',
    'https://example.com/images/dark-choc.jpg',
    'InStock',
    '4.8',
    '567',
    'organic;dark-chocolate;fair-trade',
    'Gourmet Food',
  ],
];

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateImportTemplate(): string {
  const headerLine = TEMPLATE_HEADERS.map(escapeCsvField).join(',');
  const dataLines = EXAMPLE_ROWS.map(row =>
    row.map(escapeCsvField).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

export function downloadImportTemplate(): void {
  const csv = generateImportTemplate();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'product-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
