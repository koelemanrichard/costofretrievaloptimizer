/**
 * CatalogPage - Setup wizard step for product catalog
 *
 * Optional step between Competitors and Blueprint for ecommerce projects.
 * Offers three paths: CSV import, manual entry, or skip.
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../ui/Button';
import CatalogManager from '../../catalog/CatalogManager';
import CatalogImportWizard from '../../catalog/import/CatalogImportWizard';
import { useCatalog } from '../../../hooks/useCatalog';
import { useAppState } from '../../../state/appState';

const CatalogPage: React.FC = () => {
  const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();
  const navigate = useNavigate();
  const { state } = useAppState();
  const {
    catalog,
    categories,
    products,
    hasCatalog,
    ensureCatalog,
  } = useCatalog(mapId || null);

  const [showImport, setShowImport] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const basePath = `/p/${projectId}/m/${mapId}/setup`;
  const hasProducts = products.length > 0;

  const handleSkip = () => {
    navigate(`${basePath}/blueprint`);
  };

  const handleContinue = () => {
    navigate(`${basePath}/blueprint`);
  };

  const handleStartImport = async () => {
    await ensureCatalog();
    setShowImport(true);
  };

  const handleStartManual = async () => {
    await ensureCatalog();
    setShowManual(true);
  };

  // If user has already started working with the catalog, show the full manager
  if (showManual || hasProducts) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Product Catalog</h2>
            <p className="text-sm text-gray-400 mt-1">
              Add your store's products and categories. This data will be used to generate
              category page content grounded in real product information.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleContinue}>
            Continue to Blueprint
          </Button>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg" style={{ height: '60vh' }}>
          <CatalogManager mapId={mapId!} />
        </div>
      </div>
    );
  }

  // Initial choice screen
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-100">Product Catalog</h2>
        <p className="text-sm text-gray-400 mt-2 max-w-lg mx-auto">
          Connect your product data to generate SEO content that references real products,
          prices, and specifications. This step is optional — you can add products later from the dashboard.
        </p>
      </div>

      {/* Three option cards */}
      <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
        {/* CSV Import */}
        <button
          onClick={handleStartImport}
          className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-left hover:border-blue-600 transition-colors group"
        >
          <svg className="w-8 h-8 text-blue-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <h3 className="text-sm font-medium text-gray-200 group-hover:text-blue-300">
            Import from CSV
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Upload a product feed (CSV, JSON). We'll auto-detect fields.
          </p>
        </button>

        {/* Manual Entry */}
        <button
          onClick={handleStartManual}
          className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-left hover:border-green-600 transition-colors group"
        >
          <svg className="w-8 h-8 text-green-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          <h3 className="text-sm font-medium text-gray-200 group-hover:text-green-300">
            Add Manually
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Sketch your categories and products. Only name is required.
          </p>
        </button>

        {/* Skip */}
        <button
          onClick={handleSkip}
          className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-left hover:border-gray-500 transition-colors group"
        >
          <svg className="w-8 h-8 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
          </svg>
          <h3 className="text-sm font-medium text-gray-200 group-hover:text-gray-300">
            Skip for Now
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Continue without products. Add from the dashboard anytime.
          </p>
        </button>
      </div>

      {/* Import wizard modal */}
      {showImport && catalog && (
        <CatalogImportWizard
          catalogId={catalog.id}
          onComplete={() => { setShowImport(false); setShowManual(true); }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
};

export default CatalogPage;
