/**
 * FieldMappingStep - Step 2 of CSV Import Wizard
 *
 * Two-column layout mapping CSV columns to product fields.
 * Auto-detects common column names.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { autoDetectFieldMappings } from '../../../services/catalog/catalogImporter';
import type { CsvFieldMapping, CatalogProductField } from '../../../types/catalog';

interface FieldMappingStepProps {
  headers: string[];
  sampleRow: Record<string, string>;
  onMapped: (mappings: CsvFieldMapping[]) => void;
  onBack: () => void;
}

const FIELD_OPTIONS: { value: CatalogProductField | 'category' | 'attribute' | 'skip'; label: string }[] = [
  { value: 'name', label: 'Product Name *' },
  { value: 'sku', label: 'SKU' },
  { value: 'brand', label: 'Brand' },
  { value: 'short_description', label: 'Description' },
  { value: 'price', label: 'Price' },
  { value: 'currency', label: 'Currency' },
  { value: 'sale_price', label: 'Sale Price' },
  { value: 'product_url', label: 'Product URL' },
  { value: 'image_url', label: 'Image URL' },
  { value: 'availability', label: 'Availability' },
  { value: 'rating_value', label: 'Rating' },
  { value: 'review_count', label: 'Review Count' },
  { value: 'tags', label: 'Tags' },
  { value: 'category', label: 'Category' },
  { value: 'attribute', label: 'Custom Attribute' },
  { value: 'skip', label: 'Skip (ignore)' },
];

const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  headers,
  sampleRow,
  onMapped,
  onBack,
}) => {
  const [mappings, setMappings] = useState<CsvFieldMapping[]>([]);

  useEffect(() => {
    setMappings(autoDetectFieldMappings(headers));
  }, [headers]);

  const updateMapping = (index: number, field: string) => {
    const updated = [...mappings];
    if (field === 'attribute') {
      updated[index] = {
        csvColumn: updated[index].csvColumn,
        mappedField: 'attribute',
        attributeKey: updated[index].csvColumn,
      };
    } else {
      updated[index] = {
        csvColumn: updated[index].csvColumn,
        mappedField: field as CatalogProductField | 'category' | 'skip',
      };
    }
    setMappings(updated);
  };

  const updateAttributeKey = (index: number, key: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], attributeKey: key };
    setMappings(updated);
  };

  const hasNameMapping = mappings.some(m => m.mappedField === 'name');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-200">Map Fields</h3>
        <p className="text-sm text-gray-400 mt-1">
          Map your CSV columns to product fields. We've auto-detected what we can.
          Unmapped columns become custom attributes.
        </p>
      </div>

      {/* Mapping table */}
      <div className="border border-gray-700 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Your Column</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 w-12">Sample</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Map To</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping, idx) => (
              <tr key={mapping.csvColumn} className="border-t border-gray-800">
                <td className="px-4 py-2">
                  <span className="text-sm text-gray-200 font-mono">{mapping.csvColumn}</span>
                </td>
                <td className="px-4 py-2">
                  <span className="text-xs text-gray-500 truncate block max-w-[150px]">
                    {sampleRow[mapping.csvColumn] || '-'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2 items-center">
                    <select
                      value={mapping.mappedField}
                      onChange={e => updateMapping(idx, e.target.value)}
                      className={`bg-gray-800 border rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none ${
                        mapping.mappedField === 'skip'
                          ? 'border-gray-700 text-gray-500'
                          : mapping.mappedField === 'attribute'
                            ? 'border-yellow-800 text-yellow-300'
                            : 'border-green-800 text-green-300'
                      }`}
                    >
                      {FIELD_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {mapping.mappedField === 'attribute' && (
                      <input
                        type="text"
                        value={mapping.attributeKey || ''}
                        onChange={e => updateAttributeKey(idx, e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 w-32"
                        placeholder="Attribute key"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!hasNameMapping && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded px-4 py-2 text-sm text-yellow-300">
          A "Product Name" mapping is required. Please map at least one column to "Product Name".
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" size="sm" onClick={() => onMapped(mappings)} disabled={!hasNameMapping}>
          Continue to Review
        </Button>
      </div>
    </div>
  );
};

export default FieldMappingStep;
