// components/ExportSettingsModal.tsx
import React, { useState, useId } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export interface ExportSettings {
  // Content inclusion
  includeBriefJsonFiles: boolean;      // Full brief data as JSON
  includeArticleDrafts: boolean;       // Markdown draft files
  includeSchemas: boolean;             // Generated JSON-LD schemas
  includeAuditResults: boolean;        // Audit scores and details

  // Display options
  compactBriefsView: boolean;          // Metadata only vs full
  includeEavMatrix: boolean;           // Semantic triples matrix

  // Export type
  exportFormat: 'xlsx' | 'zip';        // Excel only or full ZIP

  // Image Sitemap options
  includeImageSitemap: boolean;        // Generate image sitemap XML
  imageSitemapBaseUrl: string;         // Base URL for sitemap
  imageSitemapEnhancedVisual: boolean; // Include enhanced visual semantics
}

interface ExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
  hasSchemas: boolean;
  hasAuditResults: boolean;
}

export const ExportSettingsModal: React.FC<ExportSettingsModalProps> = ({
  isOpen,
  onClose,
  onExport,
  hasSchemas,
  hasAuditResults
}) => {
  const formId = useId();
  const [settings, setSettings] = useState<ExportSettings>({
    includeBriefJsonFiles: true,
    includeArticleDrafts: true,
    includeSchemas: false,
    includeAuditResults: false,
    compactBriefsView: false,
    includeEavMatrix: true,
    exportFormat: 'zip',
    includeImageSitemap: false,
    imageSitemapBaseUrl: '',
    imageSitemapEnhancedVisual: true
  });

  const footer = (
    <div className="flex justify-end gap-3 w-full">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button onClick={() => onExport(settings)}>Export</Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Settings"
      description="Configure export options for your topical map data"
      maxWidth="max-w-md"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Content to Include */}
        <fieldset>
          <legend className="text-sm font-semibold text-gray-300 mb-3">
            CONTENT TO INCLUDE
          </legend>
          <div className="space-y-2" role="group" aria-label="Content inclusion options">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={settings.includeBriefJsonFiles}
                onChange={(e) => setSettings(s => ({ ...s, includeBriefJsonFiles: e.target.checked }))}
                className="rounded border-gray-600"
              />
              Include full brief JSON files
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={settings.includeArticleDrafts}
                onChange={(e) => setSettings(s => ({ ...s, includeArticleDrafts: e.target.checked }))}
                className="rounded border-gray-600"
              />
              Include article drafts (Markdown)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={settings.includeSchemas}
                onChange={(e) => setSettings(s => ({ ...s, includeSchemas: e.target.checked }))}
                disabled={!hasSchemas}
                aria-disabled={!hasSchemas}
                className="rounded border-gray-600 disabled:opacity-50"
              />
              Include generated schemas
              {!hasSchemas && <span className="text-gray-600">(none available)</span>}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={settings.includeAuditResults}
                onChange={(e) => setSettings(s => ({ ...s, includeAuditResults: e.target.checked }))}
                disabled={!hasAuditResults}
                aria-disabled={!hasAuditResults}
                className="rounded border-gray-600 disabled:opacity-50"
              />
              Include audit results
              {!hasAuditResults && <span className="text-gray-600">(none available)</span>}
            </label>
          </div>
        </fieldset>

        {/* Display Options */}
        <fieldset>
          <legend className="text-sm font-semibold text-gray-300 mb-3">
            DISPLAY OPTIONS
          </legend>
          <div className="space-y-2" role="group" aria-label="Display options">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={settings.compactBriefsView}
                onChange={(e) => setSettings(s => ({ ...s, compactBriefsView: e.target.checked }))}
                className="rounded border-gray-600"
              />
              Compact briefs view (metadata only)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={settings.includeEavMatrix}
                onChange={(e) => setSettings(s => ({ ...s, includeEavMatrix: e.target.checked }))}
                className="rounded border-gray-600"
              />
              Include EAV/Semantic triples matrix
            </label>
          </div>
        </fieldset>

        {/* Export Format */}
        <fieldset>
          <legend id={`${formId}-format-label`} className="text-sm font-semibold text-gray-300 mb-3">
            EXPORT FORMAT
          </legend>
          <div className="space-y-2" role="radiogroup" aria-labelledby={`${formId}-format-label`}>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="radio"
                name={`${formId}-format`}
                checked={settings.exportFormat === 'xlsx'}
                onChange={() => setSettings(s => ({ ...s, exportFormat: 'xlsx' }))}
                className="border-gray-600"
              />
              Excel Workbook (.xlsx)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="radio"
                name={`${formId}-format`}
                checked={settings.exportFormat === 'zip'}
                onChange={() => setSettings(s => ({ ...s, exportFormat: 'zip' }))}
                className="border-gray-600"
              />
              Full Package (.zip) - includes separate files for large content
            </label>
          </div>
        </fieldset>

        {/* Image Sitemap Options */}
        <fieldset>
          <legend className="text-sm font-semibold text-gray-300 mb-3">
            IMAGE SITEMAP (Google Images)
          </legend>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={settings.includeImageSitemap}
                onChange={(e) => setSettings(s => ({ ...s, includeImageSitemap: e.target.checked }))}
                aria-controls={`${formId}-sitemap-options`}
                aria-expanded={settings.includeImageSitemap}
                className="rounded border-gray-600"
              />
              Generate Image Sitemap XML
            </label>

            {settings.includeImageSitemap && (
              <div id={`${formId}-sitemap-options`} className="ml-6 space-y-3 p-3 bg-gray-800/50 rounded border border-gray-700">
                <div>
                  <label htmlFor={`${formId}-base-url`} className="block text-xs text-gray-400 mb-1">
                    Base URL (required)
                  </label>
                  <input
                    id={`${formId}-base-url`}
                    type="url"
                    value={settings.imageSitemapBaseUrl}
                    onChange={(e) => setSettings(s => ({ ...s, imageSitemapBaseUrl: e.target.value }))}
                    placeholder="https://example.com"
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={settings.imageSitemapEnhancedVisual}
                    onChange={(e) => setSettings(s => ({ ...s, imageSitemapEnhancedVisual: e.target.checked }))}
                    className="rounded border-gray-600"
                  />
                  Include enhanced visual semantics (alt text, captions)
                </label>
                <p className="text-xs text-gray-500">
                  Generates an XML sitemap with all images from content briefs for Google Images discovery.
                  Uses vocabulary-extending alt text from visual semantics.
                </p>
              </div>
            )}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
};
