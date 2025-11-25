// components/site-analysis/CrawlProgress.tsx
// Crawl progress display component

import React from 'react';
import { Card } from '../ui/Card';
import { ProgressCircle } from '../ui/ProgressCircle';
import { SiteAnalysisProject } from '../../types';

interface CrawlProgressProps {
  project: SiteAnalysisProject | null;
  crawled: number;
  total: number;
}

export const CrawlProgress: React.FC<CrawlProgressProps> = ({
  project,
  crawled,
  total,
}) => {
  const percentage = total > 0 ? Math.round((crawled / total) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Analyzing Your Site
          </h2>
          <p className="text-gray-400 mb-8">
            {project?.domain || 'Processing...'}
          </p>

          {/* Progress Circle */}
          <div className="flex justify-center mb-8">
            <ProgressCircle
              percentage={percentage}
              size={160}
              strokeWidth={12}
              color="#3b82f6"
            />
          </div>

          {/* Progress Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-3xl font-bold text-white">{total}</p>
              <p className="text-sm text-gray-400">Pages Found</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-3xl font-bold text-blue-400">{crawled}</p>
              <p className="text-sm text-gray-400">Crawled</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-3xl font-bold text-gray-400">{total - crawled}</p>
              <p className="text-sm text-gray-400">Remaining</p>
            </div>
          </div>

          {/* Current Status */}
          <div className="flex items-center justify-center gap-3 text-gray-300">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>
              {percentage < 100
                ? 'Extracting page content...'
                : 'Running audits...'}
            </span>
          </div>

          {/* Phase Indicators */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="flex justify-between">
              {['Discovery', 'Extraction', 'Analysis', 'Complete'].map((phase, index) => {
                const isActive = index === (percentage < 100 ? 1 : percentage < 100 ? 2 : 3);
                const isComplete = index < (percentage < 100 ? 1 : percentage < 100 ? 2 : 3);

                return (
                  <div key={phase} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        isComplete
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {isComplete ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-xs ${isActive ? 'text-blue-400' : isComplete ? 'text-green-400' : 'text-gray-500'}`}>
                      {phase}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Tips */}
      <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
        <h3 className="text-white font-medium mb-2">While you wait...</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>Each page is analyzed for semantic structure</li>
          <li>Links, headings, and schema data are extracted</li>
          <li>Content is evaluated against 25 audit rules</li>
        </ul>
      </div>
    </div>
  );
};

export default CrawlProgress;
