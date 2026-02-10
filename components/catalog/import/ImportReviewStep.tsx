/**
 * ImportReviewStep - Step 3 of CSV Import Wizard
 *
 * Shows validation summary, warnings, and confirmation before importing.
 */

import React, { useMemo } from 'react';
import { Button } from '../../ui/Button';
import { validateImport } from '../../../services/catalog/catalogImporter';
import type { CsvFieldMapping, ImportValidationResult } from '../../../types/catalog';

interface ImportReviewStepProps {
  rows: Record<string, string>[];
  mappings: CsvFieldMapping[];
  existingSkus?: Set<string>;
  isImporting: boolean;
  onImport: () => void;
  onBack: () => void;
}

const ImportReviewStep: React.FC<ImportReviewStepProps> = ({
  rows,
  mappings,
  existingSkus,
  isImporting,
  onImport,
  onBack,
}) => {
  const validation: ImportValidationResult = useMemo(
    () => validateImport(rows, mappings, existingSkus),
    [rows, mappings, existingSkus]
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-200">Review & Import</h3>
        <p className="text-sm text-gray-400 mt-1">
          Review the import summary before proceeding.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{validation.productsToCreate}</div>
          <div className="text-xs text-gray-400 mt-1">New Products</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{validation.productsToUpdate}</div>
          <div className="text-xs text-gray-400 mt-1">Updates (by SKU)</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{validation.categoriesDetected.length}</div>
          <div className="text-xs text-gray-400 mt-1">Categories Detected</div>
        </div>
      </div>

      {/* Categories */}
      {validation.categoriesDetected.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Categories to Create</h4>
          <div className="flex flex-wrap gap-1.5">
            {validation.categoriesDetected.map(cat => (
              <span key={cat} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {validation.errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded p-4">
          <h4 className="text-sm font-medium text-red-300 mb-2">
            Errors ({validation.errors.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {validation.errors.map((err, idx) => (
              <div key={idx} className="text-xs text-red-400">
                Row {err.row}: {err.field} - {err.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded p-4">
          <h4 className="text-sm font-medium text-yellow-300 mb-2">
            Warnings ({validation.warnings.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {validation.warnings.map((warn, idx) => (
              <div key={idx} className="text-xs text-yellow-400">
                Row {warn.row}: {warn.field} - {warn.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing SKUs */}
      {validation.productsToRemove > 0 && (
        <div className="bg-gray-800 rounded p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            {validation.productsToRemove} existing product(s) not in import
          </h4>
          <p className="text-xs text-gray-400">
            These products exist in your catalog but aren't in the import file.
            They will be kept as-is (not removed).
          </p>
        </div>
      )}

      {/* Row stats */}
      <div className="text-xs text-gray-500">
        {validation.totalRows} total rows, {validation.validRows} valid,{' '}
        {validation.totalRows - validation.validRows} skipped due to errors
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onImport}
          disabled={validation.validRows === 0 || isImporting}
        >
          {isImporting ? 'Importing...' : `Import ${validation.validRows} Products`}
        </Button>
      </div>
    </div>
  );
};

export default ImportReviewStep;
