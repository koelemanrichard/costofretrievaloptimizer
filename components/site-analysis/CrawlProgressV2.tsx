// components/site-analysis/CrawlProgressV2.tsx
// V2 Crawl/Extraction progress display with dual extraction phases

import React from 'react';
import { Card } from '../ui/Card';
import { SiteAnalysisProject } from '../../types';
import { ExtractionProgress } from '../../services/pageExtractionService';

interface CrawlProgressV2Props {
  project: SiteAnalysisProject;
  progress: ExtractionProgress | null;
}

export const CrawlProgressV2: React.FC<CrawlProgressV2Props> = ({
  project,
  progress,
}) => {
  const totalPages = project.pageCount || project.pages?.length || 0;
  const completed = progress?.completed || 0;
  const phase = progress?.phase || 'technical';
  const errors = progress?.errors || [];

  // Calculate overall progress percentage
  const phaseWeight = { technical: 0.5, semantic: 0.5, complete: 1 };
  const phaseBase = phase === 'semantic' ? 50 : phase === 'complete' ? 100 : 0;
  const phaseProgress = totalPages > 0 ? (completed / totalPages) * 50 : 0;
  const overallProgress = Math.min(100, phaseBase + (phase !== 'complete' ? phaseProgress : 0));

  const phaseLabels = {
    technical: 'Technical Extraction (Apify)',
    semantic: 'Semantic Extraction (Jina)',
    complete: 'Complete',
  };

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Extracting Content</h2>
          <span className="text-2xl font-bold text-purple-400">
            {Math.round(overallProgress)}%
          </span>
        </div>

        {/* Overall Progress Bar */}
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Phase Indicators */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Technical Phase */}
          <div className={`p-4 rounded-lg border ${
            phase === 'technical'
              ? 'border-purple-500 bg-purple-500/10'
              : phase === 'semantic' || phase === 'complete'
                ? 'border-green-500/50 bg-green-500/10'
                : 'border-gray-700 bg-gray-800/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {phase === 'technical' ? (
                <div className="w-4 h-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
              ) : phase === 'semantic' || phase === 'complete' ? (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
              )}
              <span className={`text-sm font-medium ${
                phase === 'technical' ? 'text-purple-400' :
                phase === 'semantic' || phase === 'complete' ? 'text-green-400' : 'text-gray-500'
              }`}>
                Technical
              </span>
            </div>
            <p className="text-xs text-gray-500">HTML, Schema, Performance</p>
          </div>

          {/* Semantic Phase */}
          <div className={`p-4 rounded-lg border ${
            phase === 'semantic'
              ? 'border-cyan-500 bg-cyan-500/10'
              : phase === 'complete'
                ? 'border-green-500/50 bg-green-500/10'
                : 'border-gray-700 bg-gray-800/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {phase === 'semantic' ? (
                <div className="w-4 h-4 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
              ) : phase === 'complete' ? (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
              )}
              <span className={`text-sm font-medium ${
                phase === 'semantic' ? 'text-cyan-400' :
                phase === 'complete' ? 'text-green-400' : 'text-gray-500'
              }`}>
                Semantic
              </span>
            </div>
            <p className="text-xs text-gray-500">Content, Links, Structure</p>
          </div>

          {/* Complete Phase */}
          <div className={`p-4 rounded-lg border ${
            phase === 'complete'
              ? 'border-green-500 bg-green-500/10'
              : 'border-gray-700 bg-gray-800/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {phase === 'complete' ? (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
              )}
              <span className={`text-sm font-medium ${
                phase === 'complete' ? 'text-green-400' : 'text-gray-500'
              }`}>
                Complete
              </span>
            </div>
            <p className="text-xs text-gray-500">Ready for analysis</p>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {phase !== 'complete' ? phaseLabels[phase] : 'Extraction Complete'}
            </span>
            <span className="text-white font-medium">
              {completed} / {totalPages} pages
            </span>
          </div>
          {progress?.currentUrl && phase !== 'complete' && (
            <p className="text-xs text-gray-500 mt-2 truncate">
              Current: {progress.currentUrl}
            </p>
          )}
        </div>
      </Card>

      {/* Project Info */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{project.name}</h3>
            <p className="text-gray-400 text-sm">{project.domain}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Input Method</p>
            <p className="text-white capitalize">{project.inputMethod}</p>
          </div>
        </div>
      </Card>

      {/* Errors (if any) */}
      {errors.length > 0 && (
        <Card className="p-4 border-yellow-500/50">
          <h3 className="text-sm font-semibold text-yellow-400 mb-2">
            Extraction Warnings ({errors.length})
          </h3>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {errors.slice(0, 10).map((err, i) => (
              <div key={i} className="text-xs text-gray-400 bg-gray-800/50 rounded p-2">
                <span className="text-yellow-400">{err.phase}:</span>{' '}
                <span className="text-gray-300 truncate">{err.url}</span>
                <p className="text-gray-500 mt-1">{err.error}</p>
              </div>
            ))}
            {errors.length > 10 && (
              <p className="text-xs text-gray-500">
                ...and {errors.length - 10} more
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Tips */}
      <Card className="p-4 bg-gray-800/30 border-gray-700/50">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-gray-300">
              <strong>Dual Extraction</strong> combines Apify (technical HTML data) with
              Jina.ai (semantic content) for comprehensive page analysis.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              This process may take several minutes for larger sites.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CrawlProgressV2;
