// components/insights/exports/ComprehensiveExportModal.tsx
// Modal for configuring and downloading exports from the Insights Hub

import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import type { AggregatedInsights } from '../../../types/insights';
import type { BusinessInfo, EnrichedTopic, SemanticTriple } from '../../../types';
import {
  exportExecutiveReport,
  exportTechnicalReport,
  exportContentPlan,
  exportFullDataJson,
  downloadExport,
  type ExportFormat,
  type ExportSection,
} from '../../../services/insights/exportOrchestrator';

interface ComprehensiveExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  insights: AggregatedInsights;
  businessInfo: BusinessInfo;
  topics: EnrichedTopic[];
  eavs: SemanticTriple[];
  mapInfo: { name: string; projectName: string };
}

type ExportType = 'executive' | 'technical' | 'content-plan' | 'full-data';

export const ComprehensiveExportModal: React.FC<ComprehensiveExportModalProps> = ({
  isOpen,
  onClose,
  insights,
  businessInfo,
  topics,
  eavs,
  mapInfo,
}) => {
  const [selectedType, setSelectedType] = useState<ExportType>('executive');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const exportTypes = [
    {
      id: 'executive' as ExportType,
      title: 'Executive Summary',
      description: 'C-suite ready report with KPIs, trends, and recommendations',
      format: 'HTML/PDF',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'technical' as ExportType,
      title: 'Technical Report',
      description: 'Detailed data export with topics, EAVs, gaps, and issues',
      format: 'CSV',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'content-plan' as ExportType,
      title: 'Content Plan',
      description: 'Editorial calendar with topics and content gaps',
      format: 'CSV',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'full-data' as ExportType,
      title: 'Full Data Export',
      description: 'Complete JSON export of all insights and data',
      format: 'JSON',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
          <path d="M9 12h6m-3-3v6" />
        </svg>
      ),
    },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      let result;

      switch (selectedType) {
        case 'executive':
          result = await exportExecutiveReport(insights, businessInfo, mapInfo);
          break;
        case 'technical':
          result = await exportTechnicalReport(insights, businessInfo, topics, eavs);
          break;
        case 'content-plan':
          result = await exportContentPlan(insights, topics);
          break;
        case 'full-data':
          result = await exportFullDataJson(insights, businessInfo, topics, eavs);
          break;
      }

      if (result.success) {
        downloadExport(result);
        onClose();
      } else {
        setExportError(result.error || 'Export failed');
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-gray-900 border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Export Insights</h2>
            <p className="text-sm text-gray-400 mt-1">Choose an export format for your SEO data</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Export Type Selection */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedType === type.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedType === type.id ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {type.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white">{type.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        selectedType === type.id ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-500'
                      }`}>
                        {type.format}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{type.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Export Details */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Export includes:</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              {selectedType === 'executive' && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Health score overview with trends
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Key performance metrics
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Priority alerts and actions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Strategic recommendations
                  </li>
                </>
              )}
              {selectedType === 'technical' && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> All topics with metadata
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> EAV triples and categories
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Content gaps from competitors
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Cannibalization risks
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Action items by priority
                  </li>
                </>
              )}
              {selectedType === 'content-plan' && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> All topics as calendar entries
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Content gaps as planned items
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Priority and status columns
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Import-ready for project tools
                  </li>
                </>
              )}
              {selectedType === 'full-data' && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Complete insights data structure
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> All topics and EAVs
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Business info context
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Machine-readable JSON format
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Error Display */}
          {exportError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-400">{exportError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Export
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ComprehensiveExportModal;
