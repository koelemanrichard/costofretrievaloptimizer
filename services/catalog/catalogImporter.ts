/**
 * Catalog Importer - CSV/JSON parsing and field mapping
 *
 * Handles file parsing, auto-detection of field mappings,
 * validation, and merge strategies for re-imports.
 */

import type {
  CsvFieldMapping,
  CatalogProductField,
  ImportValidationResult,
  ImportWarning,
  ImportError,
  CatalogProduct,
} from '../../types/catalog';

// ============================================================================
// FIELD NAME AUTO-DETECTION MAP
// ============================================================================

const FIELD_ALIASES: Record<CatalogProductField | 'category', string[]> = {
  name: ['name', 'product name', 'product_name', 'title', 'product title', 'item name', 'item'],
  sku: ['sku', 'product sku', 'item number', 'item_number', 'article number', 'id', 'product_id', 'product id'],
  brand: ['brand', 'brand name', 'brand_name', 'manufacturer', 'vendor'],
  short_description: ['description', 'short description', 'short_description', 'summary', 'product description'],
  price: ['price', 'unit price', 'unit_price', 'regular price', 'regular_price', 'cost', 'amount'],
  currency: ['currency', 'currency code', 'currency_code'],
  sale_price: ['sale price', 'sale_price', 'discount price', 'special price', 'special_price'],
  product_url: ['url', 'product url', 'product_url', 'link', 'product link', 'page url', 'permalink'],
  image_url: ['image', 'image url', 'image_url', 'photo', 'thumbnail', 'main image', 'main_image'],
  availability: ['availability', 'stock', 'in stock', 'in_stock', 'stock status', 'stock_status'],
  rating_value: ['rating', 'rating value', 'rating_value', 'stars', 'score', 'avg rating'],
  review_count: ['reviews', 'review count', 'review_count', 'number of reviews', 'num reviews'],
  tags: ['tags', 'labels', 'categories tags'],
  category: ['category', 'categories', 'product type', 'product_type', 'department', 'type', 'collection'],
};

// ============================================================================
// FILE PARSING
// ============================================================================

/**
 * Parse CSV text into an array of row objects.
 * Auto-detects delimiter (comma, semicolon, tab).
 */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Auto-detect delimiter
  const firstLine = lines[0];
  const delimiters = [',', ';', '\t'];
  const delimiterCounts = delimiters.map(d => ({
    delimiter: d,
    count: (firstLine.match(new RegExp(d === '\t' ? '\\t' : escapeRegex(d), 'g')) || []).length,
  }));
  const bestDelimiter = delimiterCounts.sort((a, b) => b.count - a.count)[0]?.delimiter || ',';

  // Parse headers
  const headers = parseRow(lines[0], bestDelimiter);

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i], bestDelimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse JSON text into rows. Supports array of objects or { products: [...] }.
 */
export function parseJson(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const parsed = JSON.parse(text);
  const items = Array.isArray(parsed) ? parsed : (parsed.products || parsed.items || []);

  if (!Array.isArray(items) || items.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = [...new Set(items.flatMap((item: Record<string, unknown>) => Object.keys(item)))];
  const rows = items.map((item: Record<string, unknown>) => {
    const row: Record<string, string> = {};
    headers.forEach(h => {
      const val = item[h];
      row[h] = val != null ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : '';
    });
    return row;
  });

  return { headers, rows };
}

// ============================================================================
// FIELD MAPPING AUTO-DETECTION
// ============================================================================

/**
 * Auto-detect field mappings from CSV column headers.
 */
export function autoDetectFieldMappings(headers: string[]): CsvFieldMapping[] {
  return headers.map(header => {
    const normalized = header.toLowerCase().trim();

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(normalized)) {
        return {
          csvColumn: header,
          mappedField: field as CatalogProductField | 'category',
        };
      }
    }

    // Unmapped columns become attributes
    return {
      csvColumn: header,
      mappedField: 'attribute' as const,
      attributeKey: header,
    };
  });
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate parsed rows against field mappings.
 */
export function validateImport(
  rows: Record<string, string>[],
  mappings: CsvFieldMapping[],
  existingSkus?: Set<string>
): ImportValidationResult {
  const warnings: ImportWarning[] = [];
  const errors: ImportError[] = [];
  const categoriesDetected = new Set<string>();
  let validRows = 0;
  let productsToUpdate = 0;
  let productsToRemove = 0;
  const importedSkus = new Set<string>();

  const nameMapping = mappings.find(m => m.mappedField === 'name');
  const skuMapping = mappings.find(m => m.mappedField === 'sku');
  const categoryMapping = mappings.find(m => m.mappedField === 'category');
  const priceMapping = mappings.find(m => m.mappedField === 'price');

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed + header row

    // Check required field: name
    const name = nameMapping ? row[nameMapping.csvColumn]?.trim() : '';
    if (!name) {
      errors.push({ row: rowNum, field: 'name', message: 'Product name is required' });
      return;
    }

    // Validate price if present
    if (priceMapping) {
      const priceStr = row[priceMapping.csvColumn]?.trim();
      if (priceStr && isNaN(parseFloat(priceStr.replace(/[,$]/g, '')))) {
        warnings.push({ row: rowNum, field: 'price', message: `Invalid price: "${priceStr}"` });
      }
    }

    // Track categories
    if (categoryMapping) {
      const cat = row[categoryMapping.csvColumn]?.trim();
      if (cat) categoriesDetected.add(cat);
    }

    // Track SKU for merge detection
    if (skuMapping) {
      const sku = row[skuMapping.csvColumn]?.trim();
      if (sku) {
        importedSkus.add(sku);
        if (existingSkus?.has(sku)) {
          productsToUpdate++;
        }
      }
    }

    validRows++;
  });

  // Count missing SKUs for merge
  if (existingSkus) {
    productsToRemove = [...existingSkus].filter(sku => !importedSkus.has(sku)).length;
  }

  return {
    totalRows: rows.length,
    validRows,
    warnings,
    errors,
    categoriesDetected: [...categoriesDetected],
    productsToCreate: validRows - productsToUpdate,
    productsToUpdate,
    productsToRemove,
  };
}

// ============================================================================
// ROW TO PRODUCT CONVERSION
// ============================================================================

/**
 * Convert parsed rows to CatalogProduct-shaped objects using field mappings.
 */
export function rowsToProducts(
  rows: Record<string, string>[],
  mappings: CsvFieldMapping[],
  catalogId: string
): { products: Omit<CatalogProduct, 'id' | 'created_at' | 'updated_at'>[]; categoryAssignments: Map<number, string> } {
  const products: Omit<CatalogProduct, 'id' | 'created_at' | 'updated_at'>[] = [];
  const categoryAssignments = new Map<number, string>(); // rowIndex -> categoryName

  const mappingsByField = new Map<string, string>();
  const attributeMappings: { csvColumn: string; key: string }[] = [];

  for (const m of mappings) {
    if (m.mappedField === 'attribute' && m.attributeKey) {
      attributeMappings.push({ csvColumn: m.csvColumn, key: m.attributeKey });
    } else if (m.mappedField !== 'skip' && m.mappedField !== 'category') {
      mappingsByField.set(m.mappedField, m.csvColumn);
    }
    if (m.mappedField === 'category') {
      // Track for assignment handling
      mappingsByField.set('_category', m.csvColumn);
    }
  }

  rows.forEach((row, idx) => {
    const getValue = (field: string) => {
      const col = mappingsByField.get(field);
      return col ? row[col]?.trim() || undefined : undefined;
    };

    const name = getValue('name');
    if (!name) return; // Skip rows without name

    // Build attributes from unmapped columns
    const attributes: Record<string, string> = {};
    for (const am of attributeMappings) {
      const val = row[am.csvColumn]?.trim();
      if (val) attributes[am.key] = val;
    }

    // Parse price
    const parsePrice = (val?: string): number | undefined => {
      if (!val) return undefined;
      const cleaned = val.replace(/[,$]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num;
    };

    // Parse tags
    const tagsStr = getValue('tags');
    const tags = tagsStr ? tagsStr.split(/[,;|]/).map(t => t.trim()).filter(Boolean) : [];

    products.push({
      catalog_id: catalogId,
      name,
      sku: getValue('sku'),
      brand: getValue('brand'),
      short_description: getValue('short_description'),
      price: parsePrice(getValue('price')),
      currency: getValue('currency') || 'USD',
      sale_price: parsePrice(getValue('sale_price')),
      product_url: getValue('product_url'),
      image_url: getValue('image_url'),
      additional_images: [],
      availability: normalizeAvailability(getValue('availability')),
      attributes,
      rating_value: getValue('rating_value') ? parseFloat(getValue('rating_value')!) : undefined,
      review_count: getValue('review_count') ? parseInt(getValue('review_count')!, 10) : 0,
      tags,
      status: 'active',
    });

    // Track category assignment
    const catCol = mappingsByField.get('_category');
    if (catCol) {
      const catName = row[catCol]?.trim();
      if (catName) categoryAssignments.set(idx, catName);
    }
  });

  return { products, categoryAssignments };
}

function normalizeAvailability(val?: string): 'InStock' | 'OutOfStock' | 'PreOrder' {
  if (!val) return 'InStock';
  const lower = val.toLowerCase();
  if (lower.includes('out') || lower === 'false' || lower === '0' || lower === 'no') return 'OutOfStock';
  if (lower.includes('pre')) return 'PreOrder';
  return 'InStock';
}
