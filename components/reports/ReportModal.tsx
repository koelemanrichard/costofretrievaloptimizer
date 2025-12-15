/**
 * ReportModal
 *
 * Configuration modal for generating and exporting reports
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  ReportConfig,
  ReportType,
  ReportFormat,
  TopicalMapReportConfig,
  ContentBriefReportConfig,
  ArticleDraftReportConfig,
  MigrationReportConfig,
  ReportGenerationState,
  TopicalMapReportData,
  ContentBriefReportData,
  ArticleDraftReportData,
  MigrationReportData
} from '../../types/reports';
import { exportToPdf, exportToHtml, printReport } from '../../services/pdfExportService';
import { TopicalMapReport } from './TopicalMapReport';
import { ContentBriefReport } from './ContentBriefReport';
import { ArticleDraftReport } from './ArticleDraftReport';
import { MigrationReport } from './MigrationReport';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: ReportType;
  data: TopicalMapReportData | ContentBriefReportData | ArticleDraftReportData | MigrationReportData;
  defaultFilename?: string;
  projectName?: string;
}

const reportTitles: Record<ReportType, string> = {
  'topical-map': 'Topical Map Report',
  'content-brief': 'Content Brief Report',
  'article-draft': 'Article Quality Report',
  'migration': 'Site Migration Report'
};

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportType,
  data,
  defaultFilename
}) => {
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [customTitle, setCustomTitle] = useState('');

  // Type-specific options
  const [includeEavDetails, setIncludeEavDetails] = useState(true);
  const [includeGapAnalysis, setIncludeGapAnalysis] = useState(true);
  const [includeCompetitorAnalysis, setIncludeCompetitorAnalysis] = useState(true);
  const [includeAuditDetails, setIncludeAuditDetails] = useState(true);
  const [includeImplementationGuide, setIncludeImplementationGuide] = useState(true);
  const [includeRedirectMap, setIncludeRedirectMap] = useState(true);
  const [includeActionPlan, setIncludeActionPlan] = useState(true);

  const [generationState, setGenerationState] = useState<ReportGenerationState>({
    isGenerating: false,
    progress: 0,
    currentStep: '',
    error: null
  });

  const [showPreview, setShowPreview] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const getConfig = (): Partial<ReportConfig> => {
    const base = {
      format,
      includeCharts,
      includeLogo,
      includeTimestamp,
      customTitle: customTitle || undefined
    };

    switch (reportType) {
      case 'topical-map':
        return {
          ...base,
          type: 'topical-map',
          includeEavDetails,
          includeGapAnalysis,
          includeStrategicAlignment: true,
          includeNextSteps: true
        } as TopicalMapReportConfig;

      case 'content-brief':
        return {
          ...base,
          type: 'content-brief',
          batchMode: false,
          includeCompetitorAnalysis,
          includeLinkingStrategy: true,
          includeVisualRequirements: true
        } as ContentBriefReportConfig;

      case 'article-draft':
        return {
          ...base,
          type: 'article-draft',
          includeAuditDetails,
          includeSectionBreakdown: true,
          includeImprovementAreas: true
        } as ArticleDraftReportConfig;

      case 'migration':
        return {
          ...base,
          type: 'migration',
          includeImplementationGuide,
          includeRedirectMap,
          includeActionPlan,
          includeQualityChecklists: true,
          exportRedirectsCsv: false
        } as MigrationReportConfig;

      default:
        return base;
    }
  };

  const handleExport = useCallback(async () => {
    if (!reportRef.current) return;

    const filename = defaultFilename || `${reportType}-report-${new Date().toISOString().split('T')[0]}`;

    try {
      setGenerationState({
        isGenerating: true,
        progress: 0,
        currentStep: 'Starting export...',
        error: null
      });

      if (format === 'pdf') {
        await exportToPdf(reportRef.current, {
          filename,
          title: customTitle || reportTitles[reportType],
          includeTimestamp,
          onProgress: setGenerationState
        });
      } else {
        exportToHtml(
          reportRef.current,
          filename,
          customTitle || reportTitles[reportType]
        );
        setGenerationState({
          isGenerating: false,
          progress: 100,
          currentStep: 'Complete',
          error: null
        });
      }
    } catch (error) {
      setGenerationState({
        isGenerating: false,
        progress: 0,
        currentStep: 'Error',
        error: error instanceof Error ? error.message : 'Export failed'
      });
    }
  }, [format, reportType, customTitle, includeTimestamp, defaultFilename]);

  const handlePrint = useCallback(() => {
    if (reportRef.current) {
      printReport(reportRef.current);
    }
  }, []);

  const renderReport = () => {
    const config = getConfig();

    switch (reportType) {
      case 'topical-map':
        return (
          <TopicalMapReport
            ref={reportRef}
            data={data as TopicalMapReportData}
            config={config as TopicalMapReportConfig}
          />
        );
      case 'content-brief':
        return (
          <ContentBriefReport
            ref={reportRef}
            data={data as ContentBriefReportData}
            config={config as ContentBriefReportConfig}
          />
        );
      case 'article-draft':
        return (
          <ArticleDraftReport
            ref={reportRef}
            data={data as ArticleDraftReportData}
            config={config as ArticleDraftReportConfig}
          />
        );
      case 'migration':
        return (
          <MigrationReport
            ref={reportRef}
            data={data as MigrationReportData}
            config={config as MigrationReportConfig}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />

        {/* Modal */}
        <div
          className={`relative bg-white rounded-lg shadow-xl ${showPreview ? 'max-w-6xl' : 'max-w-lg'} w-full`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Generate {reportTitles[reportType]}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className={`flex ${showPreview ? 'flex-row' : 'flex-col'}`}>
            {/* Configuration Panel */}
            <div className={`p-6 ${showPreview ? 'w-80 border-r border-gray-200' : 'w-full'}`}>
              {/* Format Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormat('pdf')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      format === 'pdf'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => setFormat('html')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      format === 'html'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    HTML
                  </button>
                </div>
              </div>

              {/* Custom Title */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Title (optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={reportTitles[reportType]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Common Options */}
              <div className="mb-6 space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include charts & visualizations</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLogo}
                    onChange={(e) => setIncludeLogo(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include branding</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTimestamp}
                    onChange={(e) => setIncludeTimestamp(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include timestamp</span>
                </label>
              </div>

              {/* Report-specific options */}
              <div className="mb-6 space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Sections
                </label>

                {reportType === 'topical-map' && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeEavDetails}
                        onChange={(e) => setIncludeEavDetails(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Semantic coverage details</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeGapAnalysis}
                        onChange={(e) => setIncludeGapAnalysis(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Gap analysis</span>
                    </label>
                  </>
                )}

                {reportType === 'content-brief' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCompetitorAnalysis}
                      onChange={(e) => setIncludeCompetitorAnalysis(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Competitor analysis</span>
                  </label>
                )}

                {reportType === 'article-draft' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAuditDetails}
                      onChange={(e) => setIncludeAuditDetails(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Audit rule details</span>
                  </label>
                )}

                {reportType === 'migration' && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeImplementationGuide}
                        onChange={(e) => setIncludeImplementationGuide(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Implementation guide</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeRedirectMap}
                        onChange={(e) => setIncludeRedirectMap(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Redirect map</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeActionPlan}
                        onChange={(e) => setIncludeActionPlan(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Action plan</span>
                    </label>
                  </>
                )}
              </div>

              {/* Progress indicator */}
              {generationState.isGenerating && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">{generationState.currentStep}</span>
                    <span className="text-sm font-medium text-gray-900">{generationState.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${generationState.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {generationState.error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{generationState.error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {showPreview ? 'Hide Preview' : 'Preview'}
                </button>
                <button
                  onClick={handlePrint}
                  className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Print"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
                <button
                  onClick={handleExport}
                  disabled={generationState.isGenerating}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generationState.isGenerating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export {format.toUpperCase()}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview Panel */}
            {showPreview && (
              <div className="flex-1 bg-gray-100 p-4 overflow-auto max-h-[80vh]">
                <div className="transform scale-75 origin-top-left" style={{ width: '133.33%' }}>
                  {renderReport()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
