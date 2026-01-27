/**
 * AnalysisResultStep - Shows URL analysis results
 *
 * Displays crawl data, SERP data, and recommendations.
 */

import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { UrlAnalysisResult, ServiceCategory, PriorityLevel } from '../../../types/quotation';
import { CATEGORY_INFO } from '../../../config/quotation/modules';

interface AnalysisResultStepProps {
  analysisResult: UrlAnalysisResult;
  onContinue: () => void;
  onReanalyze: () => void;
}

const priorityColors: Record<PriorityLevel, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const siteSizeLabels: Record<string, string> = {
  small: 'Small (< 50 pages)',
  medium: 'Medium (50-250 pages)',
  large: 'Large (250-1000 pages)',
  enterprise: 'Enterprise (1000+ pages)',
};

export const AnalysisResultStep: React.FC<AnalysisResultStepProps> = ({
  analysisResult,
  onContinue,
  onReanalyze,
}) => {
  const { crawlData, serpData, recommendations, siteSize, complexityScore, domain, isEstimate } = analysisResult;

  return (
    <div className="space-y-6">
      {/* Estimate Warning Banner */}
      {isEstimate && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-yellow-400 font-medium">Quick Estimate Mode</h4>
            <p className="text-gray-400 text-sm mt-1">
              These results are <strong>estimates</strong> based on URL pattern analysis, not actual website data.
              For accurate metrics, configure API keys in Settings and use "Analyze Website" for a full crawl.
            </p>
          </div>
        </div>
      )}

      {/* Domain Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{domain}</h2>
            <p className="text-gray-400 text-sm mt-1">
              {isEstimate ? 'Quick estimate completed' : 'Analysis completed'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Site Classification {isEstimate && '(estimated)'}</div>
            <div className="text-lg font-semibold text-blue-400">{siteSizeLabels[siteSize]}</div>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-white">{crawlData.pageCount}</div>
          <div className="text-sm text-gray-400 mt-1">Pages Analyzed</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-white">{serpData.visibilityScore}%</div>
          <div className="text-sm text-gray-400 mt-1">SERP Visibility</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-white">{serpData.keywordsRanking}</div>
          <div className="text-sm text-gray-400 mt-1">Keywords Ranking</div>
        </Card>
        <Card className="p-4 text-center">
          <div className={`text-3xl font-bold ${complexityScore > 2 ? 'text-red-400' : complexityScore > 1.5 ? 'text-yellow-400' : 'text-green-400'}`}>
            {complexityScore.toFixed(1)}x
          </div>
          <div className="text-sm text-gray-400 mt-1">Complexity Score</div>
        </Card>
      </div>

      {/* Technical Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Technical Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${crawlData.sslValid ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-300">SSL Certificate</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${crawlData.mobileOptimized ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-300">Mobile Optimized</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${crawlData.hasSchema ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-gray-300">Schema Markup</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-400">{crawlData.technicalIssues.critical}</div>
            <div className="text-xs text-gray-400 mt-1">Critical Issues</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-400">{crawlData.technicalIssues.warnings}</div>
            <div className="text-xs text-gray-400 mt-1">Warnings</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-400">{crawlData.technicalIssues.notices}</div>
            <div className="text-xs text-gray-400 mt-1">Notices</div>
          </div>
        </div>
      </Card>

      {/* Competition Level */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Competitive Landscape</h3>
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg font-medium ${
            serpData.competitionLevel === 'high'
              ? 'bg-red-500/20 text-red-400'
              : serpData.competitionLevel === 'medium'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-green-500/20 text-green-400'
          }`}>
            {serpData.competitionLevel.charAt(0).toUpperCase() + serpData.competitionLevel.slice(1)} Competition
          </div>
          <span className="text-gray-400 text-sm">
            {serpData.competitionLevel === 'high'
              ? 'Expect longer timelines and more investment needed'
              : serpData.competitionLevel === 'medium'
              ? 'Moderate effort required for ranking improvements'
              : 'Good opportunity for quick wins'}
          </span>
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recommended Actions</h3>
        <div className="space-y-3">
          {recommendations.slice(0, 6).map((rec, index) => (
            <div key={index} className={`border rounded-lg p-4 ${priorityColors[rec.priority]}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase">{rec.priority}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-400">{CATEGORY_INFO[rec.category]?.name || rec.category}</span>
                  </div>
                  <p className="text-white font-medium">{rec.description}</p>
                  <p className="text-sm text-gray-400 mt-1">{rec.estimatedImpact}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onReanalyze}>
          Re-analyze URL
        </Button>
        <Button onClick={onContinue}>
          Continue to Goals
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
};
