/**
 * CatalogImportWizard - 3-step import wizard container
 *
 * Step 1: File Upload + Preview
 * Step 2: Field Mapping
 * Step 3: Review & Import
 */

import React, { useState, useCallback, useMemo } from 'react';
import FileUploadStep from './FileUploadStep';
import FieldMappingStep from './FieldMappingStep';
import ImportReviewStep from './ImportReviewStep';
import { rowsToProducts } from '../../../services/catalog/catalogImporter';
import { useCatalog } from '../../../hooks/useCatalog';
import { useAppState } from '../../../state/appState';
import type { CsvFieldMapping, CatalogProduct } from '../../../types/catalog';

interface CatalogImportWizardProps {
  catalogId: string;
  existingProducts?: CatalogProduct[];
  onComplete: (options?: { triggerRelink: boolean }) => void;
  onClose: () => void;
}

type WizardStep = 'upload' | 'mapping' | 'review';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'mapping', label: 'Map Fields' },
  { key: 'review', label: 'Review' },
];

const CatalogImportWizard: React.FC<CatalogImportWizardProps> = ({
  catalogId,
  existingProducts,
  onComplete,
  onClose,
}) => {
  const { state, dispatch } = useAppState();
  const { bulkAddProducts, addCategory } = useCatalog(state.activeMapId);

  const [step, setStep] = useState<WizardStep>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<CsvFieldMapping[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const existingSkus = useMemo(() => {
    if (!existingProducts || existingProducts.length === 0) return undefined;
    const skus = existingProducts.filter(p => p.sku).map(p => p.sku!);
    return skus.length > 0 ? new Set(skus) : undefined;
  }, [existingProducts]);

  const handleParsed = useCallback((h: string[], r: Record<string, string>[], _fileName: string) => {
    setHeaders(h);
    setRows(r);
    setStep('mapping');
  }, []);

  const handleMapped = useCallback((m: CsvFieldMapping[]) => {
    setMappings(m);
    setStep('review');
  }, []);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    try {
      const { products, categoryAssignments } = rowsToProducts(rows, mappings, catalogId);

      // Create categories from detected values
      const categoryNames = [...new Set(categoryAssignments.values())];
      const categoryMap = new Map<string, string>(); // name -> categoryId

      for (const catName of categoryNames) {
        try {
          const cat = await addCategory(catName);
          categoryMap.set(catName, cat.id);
        } catch {
          // Category might already exist, continue
        }
      }

      // Import products in batches
      await bulkAddProducts(products);

      dispatch({ type: 'SET_NOTIFICATION', payload: `Imported ${products.length} products successfully.` });
      const isReimport = existingSkus && existingSkus.size > 0;
      const hasCategories = categoryNames.length > 0;
      onComplete(isReimport && hasCategories ? { triggerRelink: true } : undefined);
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsImporting(false);
    }
  }, [rows, mappings, catalogId, bulkAddProducts, addCategory, dispatch, onComplete]);

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header with step indicator */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-gray-200">Import Products</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, idx) => (
              <React.Fragment key={s.key}>
                <div className={`flex items-center gap-1.5 text-xs ${
                  idx === currentStepIndex
                    ? 'text-blue-400 font-medium'
                    : idx < currentStepIndex
                      ? 'text-green-400'
                      : 'text-gray-600'
                }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    idx < currentStepIndex
                      ? 'bg-green-600 border-green-600 text-white'
                      : idx === currentStepIndex
                        ? 'border-blue-400'
                        : 'border-gray-700'
                  }`}>
                    {idx < currentStepIndex ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : idx + 1}
                  </span>
                  {s.label}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${idx < currentStepIndex ? 'bg-green-600' : 'bg-gray-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'upload' && (
            <FileUploadStep onParsed={handleParsed} />
          )}
          {step === 'mapping' && (
            <FieldMappingStep
              headers={headers}
              sampleRow={rows[0] || {}}
              onMapped={handleMapped}
              onBack={() => setStep('upload')}
            />
          )}
          {step === 'review' && (
            <ImportReviewStep
              rows={rows}
              mappings={mappings}
              existingSkus={existingSkus}
              isImporting={isImporting}
              onImport={handleImport}
              onBack={() => setStep('mapping')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogImportWizard;
