// components/insights/tabs/AuthorityTrustTab.tsx
// Authority & Trust - E-A-T analysis and reputation tracking

import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { ScoreGauge } from '../widgets';
import type { AggregatedInsights, InsightActionType } from '../../../types/insights';

interface AuthorityTrustTabProps {
  insights: AggregatedInsights;
  mapId: string;
  onRefresh: () => void;
  onOpenEATScanner?: () => void;
  onAction?: (actionType: InsightActionType, payload?: Record<string, any>) => Promise<void>;
  actionLoading?: string | null;
}

export const AuthorityTrustTab: React.FC<AuthorityTrustTabProps> = ({
  insights,
  mapId,
  onRefresh,
  onOpenEATScanner,
  onAction,
  actionLoading,
}) => {
  const { authorityTrust } = insights;

  const eatComponents = [
    {
      key: 'expertise',
      label: 'Expertise',
      data: authorityTrust.eatBreakdown.expertise,
      color: '#3b82f6',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      key: 'authority',
      label: 'Authority',
      data: authorityTrust.eatBreakdown.authority,
      color: '#22c55e',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      key: 'trust',
      label: 'Trust',
      data: authorityTrust.eatBreakdown.trust,
      color: '#f97316',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* E-A-T Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Overall Score */}
        <Card className="p-6 flex flex-col items-center justify-center">
          <ScoreGauge
            score={authorityTrust.eatBreakdown.overall}
            size="lg"
            label="Overall E-A-T"
          />
          <Button
            onClick={onOpenEATScanner}
            variant="secondary"
            className="mt-4"
          >
            Run E-A-T Scan
          </Button>
        </Card>

        {/* Component Breakdown */}
        {eatComponents.map((component) => (
          <Card key={component.key} className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${component.color}20` }}>
                <span style={{ color: component.color }}>{component.icon}</span>
              </div>
              <h3 className="text-lg font-semibold text-white">{component.label}</h3>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold" style={{ color: component.color }}>
                  {component.data.score}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${component.data.score}%`,
                    backgroundColor: component.color,
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-400">{component.data.explanation}</p>
          </Card>
        ))}
      </div>

      {/* Factor Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {eatComponents.map((component) => (
          <Card key={`factors-${component.key}`} className="p-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">
              {component.label} Factors
            </h4>
            {component.data.factors.length === 0 ? (
              <p className="text-sm text-gray-500">No factors detected. Run an E-A-T scan.</p>
            ) : (
              <ul className="space-y-2">
                {component.data.factors.map((factor, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={{ color: component.color }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                    <span className="text-gray-300">{factor}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      {/* Entity Recognition */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Entity Recognition Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg border ${
            authorityTrust.entityRecognition.wikipediaPresence
              ? 'bg-green-900/30 border-green-700/50'
              : 'bg-gray-800/50 border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Wikipedia</span>
              {authorityTrust.entityRecognition.wikipediaPresence ? (
                <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className={`text-sm ${authorityTrust.entityRecognition.wikipediaPresence ? 'text-green-400' : 'text-gray-500'}`}>
              {authorityTrust.entityRecognition.wikipediaPresence ? 'Present' : 'Not Found'}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            authorityTrust.entityRecognition.wikidataId
              ? 'bg-green-900/30 border-green-700/50'
              : 'bg-gray-800/50 border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Wikidata</span>
              {authorityTrust.entityRecognition.wikidataId ? (
                <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className={`text-sm ${authorityTrust.entityRecognition.wikidataId ? 'text-green-400' : 'text-gray-500'}`}>
              {authorityTrust.entityRecognition.wikidataId || 'Not Found'}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            authorityTrust.entityRecognition.knowledgeGraphStatus === 'registered'
              ? 'bg-green-900/30 border-green-700/50'
              : authorityTrust.entityRecognition.knowledgeGraphStatus === 'partial'
                ? 'bg-yellow-900/30 border-yellow-700/50'
                : 'bg-gray-800/50 border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Knowledge Graph</span>
              {authorityTrust.entityRecognition.knowledgeGraphStatus === 'registered' && (
                <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {authorityTrust.entityRecognition.knowledgeGraphStatus === 'partial' && (
                <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
              )}
              {authorityTrust.entityRecognition.knowledgeGraphStatus === 'not_found' && (
                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className={`text-sm capitalize ${
              authorityTrust.entityRecognition.knowledgeGraphStatus === 'registered' ? 'text-green-400' :
              authorityTrust.entityRecognition.knowledgeGraphStatus === 'partial' ? 'text-yellow-400' :
              'text-gray-500'
            }`}>
              {authorityTrust.entityRecognition.knowledgeGraphStatus.replace('_', ' ')}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            authorityTrust.entityRecognition.structuredDataValid
              ? 'bg-green-900/30 border-green-700/50'
              : 'bg-red-900/30 border-red-700/50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Structured Data</span>
              {authorityTrust.entityRecognition.structuredDataValid ? (
                <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div className={`text-sm ${authorityTrust.entityRecognition.structuredDataValid ? 'text-green-400' : 'text-red-400'}`}>
              {authorityTrust.entityRecognition.structuredDataValid ? 'Valid' : 'Issues Found'}
            </div>
          </div>
        </div>

        {authorityTrust.entityRecognition.structuredDataIssues.length > 0 && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-red-300 mb-2">Structured Data Issues</h4>
            <ul className="space-y-1">
              {authorityTrust.entityRecognition.structuredDataIssues.map((issue, index) => (
                <li key={index} className="text-sm text-red-200 flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Reputation Signals */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Reputation Signals</h3>
        {authorityTrust.reputationSignals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No reputation signals detected. Run an E-A-T scan to discover mentions.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {authorityTrust.reputationSignals.map((signal, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  signal.sentiment === 'positive' ? 'bg-green-900/20 border-green-700/50' :
                  signal.sentiment === 'negative' ? 'bg-red-900/20 border-red-700/50' :
                  'bg-gray-800/50 border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white">{signal.source}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    signal.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                    signal.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {signal.sentiment}
                  </span>
                </div>
                <div className="text-xs text-gray-500 capitalize">{signal.type}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Improvement Roadmap */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Improvement Roadmap</h3>
        {authorityTrust.improvementRoadmap.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Great job! No major improvements needed at this time.
          </div>
        ) : (
          <div className="space-y-4">
            {authorityTrust.improvementRoadmap.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    item.category === 'expertise' ? 'bg-blue-500/20' :
                    item.category === 'authority' ? 'bg-green-500/20' :
                    'bg-orange-500/20'
                  }`}>
                    {item.category === 'expertise' && (
                      <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    )}
                    {item.category === 'authority' && (
                      <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    )}
                    {item.category === 'trust' && (
                      <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-white">{item.title}</h4>
                      <div className="flex items-center gap-2">
                        {item.external && (
                          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                            External
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded-full">
                          Priority {item.priority}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* AI Actions */}
      <Card className="p-6 bg-gradient-to-r from-blue-900/30 to-green-900/30 border-blue-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">AI-Powered Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onAction?.('expand_eavs', { focus: 'author_schema' })}
            disabled={!!actionLoading}
            className="p-4 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded">
                {actionLoading === 'expand_eavs' ? (
                  <Loader className="w-5 h-5" />
                ) : (
                  <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <span className="font-medium text-white">Generate Author Bio Schema</span>
            </div>
            <p className="text-sm text-gray-400">Create structured data for author credentials</p>
          </button>

          <button
            onClick={() => onAction?.('expand_eavs', { focus: 'citations' })}
            disabled={!!actionLoading}
            className="p-4 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded">
                <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <span className="font-medium text-white">Suggest Citation Opportunities</span>
            </div>
            <p className="text-sm text-gray-400">Find places to add authoritative references</p>
          </button>

          <button
            onClick={() => onAction?.('run_eat_scan')}
            disabled={!!actionLoading}
            className="p-4 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/20 rounded">
                <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="font-medium text-white">Audit Expertise Claims</span>
            </div>
            <p className="text-sm text-gray-400">Verify and strengthen expertise statements</p>
          </button>
        </div>
      </Card>
    </div>
  );
};
