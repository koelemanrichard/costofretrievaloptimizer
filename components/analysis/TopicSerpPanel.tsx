/**
 * Topic SERP Panel Component
 *
 * Displays SERP analysis results for a topic including:
 * - Mode selector (Fast/Deep)
 * - Competitor selection (for Deep mode)
 * - SERP snapshot summary
 * - Gap scores
 * - Attribute gaps (Root/Rare/Unique)
 * - Priority actions
 *
 * Created: December 25, 2024
 * Updated: January 13, 2026 - Added competitor selection for deep mode
 */

import React, { useState, useCallback } from 'react';
import {
  TopicSerpIntelligence,
} from '../../types/competitiveIntelligence';
import { SerpMode } from '../../services/serpService';
import CompetitorSelectionPanel, { CompetitorItem } from './CompetitorSelectionPanel';

// =============================================================================
// Types
// =============================================================================

/** Phase of the analysis workflow */
type AnalysisPhase = 'idle' | 'selecting_competitors' | 'analyzing' | 'complete';

/** Competitor from SERP results */
export interface SerpCompetitor {
  url: string;
  domain: string;
  title: string;
  position: number;
  snippet?: string;
}

interface TopicSerpPanelProps {
  /** Topic being analyzed */
  topic: string;
  /** Analysis data (null if not yet analyzed) */
  intelligence: TopicSerpIntelligence | null;
  /** Whether analysis is in progress */
  isLoading: boolean;
  /** Progress (0-100) */
  progress: number;
  /** Progress detail message */
  progressDetail?: string;
  /** Error message if analysis failed */
  error?: string;
  /** Callback to trigger analysis - now accepts optional competitor URLs for deep mode */
  onAnalyze: (mode: SerpMode, selectedCompetitorUrls?: string[]) => void;
  /** Callback to fetch SERP competitors without full analysis */
  onFetchSerpCompetitors?: (mode: SerpMode) => Promise<SerpCompetitor[]>;
  /** Whether deep mode is available (has DataForSEO credentials) */
  deepModeAvailable: boolean;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Sub-components
// =============================================================================

const ScoreCard: React.FC<{
  label: string;
  score: number;
  description: string;
  color: 'green' | 'yellow' | 'red' | 'blue';
}> = ({ label, score, description, color }) => {
  const colorClasses = {
    green: 'bg-green-900/30 border-green-700 text-green-400',
    yellow: 'bg-yellow-900/30 border-yellow-700 text-yellow-400',
    red: 'bg-red-900/30 border-red-700 text-red-400',
    blue: 'bg-blue-900/30 border-blue-700 text-blue-400',
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{score}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs opacity-70 mt-1">{description}</div>
    </div>
  );
};

const GapSection: React.FC<{
  title: string;
  items: { label: string; detail: string }[];
  priority: 'critical' | 'high' | 'medium';
  emptyMessage: string;
}> = ({ title, items, priority, emptyMessage }) => {
  const priorityColors = {
    critical: 'border-red-700 bg-red-900/20',
    high: 'border-yellow-700 bg-yellow-900/20',
    medium: 'border-blue-700 bg-blue-900/20',
  };

  const badgeColors = {
    critical: 'bg-red-600',
    high: 'bg-yellow-600',
    medium: 'bg-blue-600',
  };

  return (
    <div className={`p-3 rounded-lg border ${priorityColors[priority]}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-200">{title}</h4>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColors[priority]} text-white`}>
          {priority.toUpperCase()}
        </span>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.slice(0, 5).map((item, idx) => (
            <li key={idx} className="text-sm text-gray-400">
              <span className="text-gray-300">{item.label}</span>
              <span className="text-gray-500"> - {item.detail}</span>
            </li>
          ))}
          {items.length > 5 && (
            <li className="text-sm text-gray-500 italic">
              +{items.length - 5} more...
            </li>
          )}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 italic">{emptyMessage}</p>
      )}
    </div>
  );
};

const SerpFeatureBadge: React.FC<{ feature: string }> = ({ feature }) => {
  const featureLabels: Record<string, string> = {
    hasFeaturedSnippet: 'Featured Snippet',
    hasPeopleAlsoAsk: 'PAA',
    hasImagePack: 'Images',
    hasVideoCarousel: 'Videos',
    hasLocalPack: 'Local',
    hasKnowledgePanel: 'Knowledge Panel',
    hasSitelinks: 'Sitelinks',
    hasReviews: 'Reviews',
    hasFaq: 'FAQ',
    // Also handle simple feature names
    FeaturedSnippet: 'Featured Snippet',
    PeopleAlsoAsk: 'PAA',
    PAA: 'PAA',
    RelatedSearches: 'Related Searches',
  };

  const label = featureLabels[feature] || feature.replace('has', '');

  return (
    <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
      {label}
    </span>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const TopicSerpPanel: React.FC<TopicSerpPanelProps> = ({
  topic,
  intelligence,
  isLoading,
  progress,
  progressDetail,
  error,
  onAnalyze,
  onFetchSerpCompetitors,
  deepModeAvailable,
  className = '',
}) => {
  const [selectedMode, setSelectedMode] = useState<SerpMode>('fast');
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>('idle');
  const [serpCompetitors, setSerpCompetitors] = useState<SerpCompetitor[]>([]);
  const [selectedCompetitorUrls, setSelectedCompetitorUrls] = useState<string[]>([]);
  const [fetchingCompetitors, setFetchingCompetitors] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Handle initial analyze button click
  const handleAnalyze = useCallback(async () => {
    // Fast mode: go directly to analysis
    if (selectedMode === 'fast') {
      onAnalyze('fast');
      return;
    }

    // Deep mode: first fetch competitors for selection (if callback provided)
    if (selectedMode === 'deep' && onFetchSerpCompetitors) {
      setFetchingCompetitors(true);
      setFetchError(null);
      try {
        const competitors = await onFetchSerpCompetitors('deep');
        setSerpCompetitors(competitors);
        // Pre-select first 5
        setSelectedCompetitorUrls(competitors.slice(0, 5).map(c => c.url));
        setAnalysisPhase('selecting_competitors');
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to fetch competitors');
      } finally {
        setFetchingCompetitors(false);
      }
    } else {
      // No competitor selection callback - go directly to analysis
      onAnalyze('deep');
    }
  }, [selectedMode, onAnalyze, onFetchSerpCompetitors]);

  // Handle competitor selection confirmation
  const handleConfirmCompetitors = useCallback(() => {
    setAnalysisPhase('analyzing');
    onAnalyze('deep', selectedCompetitorUrls);
  }, [onAnalyze, selectedCompetitorUrls]);

  // Handle back from competitor selection
  const handleBackFromSelection = useCallback(() => {
    setAnalysisPhase('idle');
    setSerpCompetitors([]);
    setSelectedCompetitorUrls([]);
  }, []);

  // Convert SerpCompetitor to CompetitorItem for the panel
  const competitorItems: CompetitorItem[] = serpCompetitors.map(c => ({
    url: c.url,
    domain: c.domain,
    title: c.title,
    position: c.position,
    snippet: c.snippet,
  }));

  // Render loading state (during deep analysis)
  if (isLoading) {
    return (
      <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-200 mb-4">
          Analyzing SERP for "{topic}"
        </h3>
        <div className="space-y-3">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400">{progressDetail || 'Analyzing...'}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`bg-gray-800/50 border border-red-700 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-red-400 mb-2">Analysis Failed</h3>
        <p className="text-sm text-gray-400 mb-4">{error}</p>
        <button
          onClick={handleAnalyze}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  // Render competitor selection phase (for deep mode)
  if (analysisPhase === 'selecting_competitors') {
    return (
      <div className={`${className}`}>
        <div className="mb-4">
          <button
            onClick={handleBackFromSelection}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <span>←</span> Back to mode selection
          </button>
        </div>
        <CompetitorSelectionPanel
          competitors={competitorItems}
          selectedUrls={selectedCompetitorUrls}
          onSelectionChange={setSelectedCompetitorUrls}
          onConfirm={handleConfirmCompetitors}
          isLoading={false}
          autoSelectCount={5}
          confirmButtonLabel="Analyze Selected Competitors"
        />
      </div>
    );
  }

  // Render empty state (not yet analyzed)
  if (!intelligence) {
    return (
      <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-200 mb-4">
          SERP Competitive Intelligence
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Analyze the search results for "{topic}" to understand competitor strategies
          and identify content gaps.
        </p>

        {/* Mode Selector */}
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm text-gray-400">Analysis Mode:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedMode('fast')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedMode === 'fast'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Fast (AI Inference)
            </button>
            <button
              onClick={() => setSelectedMode('deep')}
              disabled={!deepModeAvailable}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedMode === 'deep'
                  ? 'bg-blue-600 text-white'
                  : deepModeAvailable
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              title={!deepModeAvailable ? 'Requires DataForSEO credentials' : undefined}
            >
              Deep (Real SERP Data)
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          {selectedMode === 'fast'
            ? 'Uses AI to infer SERP characteristics. Quick and cost-effective.'
            : 'Fetches real SERP data from DataForSEO. You can select which competitors to analyze.'}
        </p>

        {fetchError && (
          <div className="text-red-400 bg-red-900/20 p-3 rounded-md text-sm mb-4">
            {fetchError}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={fetchingCompetitors}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {fetchingCompetitors ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Fetching Competitors...
            </span>
          ) : selectedMode === 'deep' && onFetchSerpCompetitors ? (
            'Fetch Competitors'
          ) : (
            'Analyze SERP'
          )}
        </button>
      </div>
    );
  }

  // Render analysis results
  const { serp, patterns, gaps, scores } = intelligence;

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-200">
              SERP Analysis: {topic}
            </h3>
            <p className="text-sm text-gray-400">
              Mode: {intelligence.mode === 'fast' ? 'AI Inference' : 'Real Data'} |
              Analyzed: {new Date(intelligence.analyzedAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => {
              setAnalysisPhase('idle');
              handleAnalyze();
            }}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm"
          >
            Re-analyze
          </button>
        </div>
      </div>

      {/* Scores Overview */}
      <div className="p-4 border-b border-gray-700">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Opportunity Scores</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ScoreCard
            label="Content Opportunity"
            score={scores.contentOpportunity}
            description="Room to differentiate"
            color={scores.contentOpportunity > 60 ? 'green' : scores.contentOpportunity > 30 ? 'yellow' : 'red'}
          />
          <ScoreCard
            label="Technical Opportunity"
            score={scores.technicalOpportunity}
            description="Competitor weaknesses"
            color={scores.technicalOpportunity > 60 ? 'green' : scores.technicalOpportunity > 30 ? 'yellow' : 'red'}
          />
          <ScoreCard
            label="Link Opportunity"
            score={scores.linkOpportunity}
            description="Linking weaknesses"
            color={scores.linkOpportunity > 60 ? 'green' : scores.linkOpportunity > 30 ? 'yellow' : 'red'}
          />
          <ScoreCard
            label="Difficulty"
            score={scores.overallDifficulty}
            description="Competitor strength"
            color={scores.overallDifficulty < 40 ? 'green' : scores.overallDifficulty < 70 ? 'yellow' : 'red'}
          />
        </div>
      </div>

      {/* SERP Features */}
      {serp.features.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-2">SERP Features Present</h4>
          <div className="flex flex-wrap gap-2">
            {serp.features.map((feature, idx) => (
              <SerpFeatureBadge key={idx} feature={feature} />
            ))}
          </div>
        </div>
      )}

      {/* Top Competitors */}
      {serp.topCompetitors.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Top Competitors</h4>
          <div className="space-y-1">
            {serp.topCompetitors.slice(0, 5).map((comp, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-gray-500">#{comp.position}</span>
                <span className="text-gray-300">{comp.domain}</span>
                <span className="text-gray-500 truncate flex-1">{comp.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attribute Gaps */}
      <div className="p-4 border-b border-gray-700">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Content Gaps</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <GapSection
            title="Root Attributes"
            items={gaps.attributes.missingRoot.map(r => ({
              label: r.attribute,
              detail: `${r.competitorsCovering} competitors cover this`,
            }))}
            priority="critical"
            emptyMessage="No root attributes found"
          />
          <GapSection
            title="Rare Attributes"
            items={gaps.attributes.missingRare.map(r => ({
              label: r.attribute,
              detail: `${r.competitorsCovering} competitors cover this`,
            }))}
            priority="high"
            emptyMessage="No rare attributes found"
          />
          <GapSection
            title="Unique Opportunities"
            items={gaps.attributes.uniqueOpportunities.map(r => ({
              label: r.attribute,
              detail: r.potentialValue,
            }))}
            priority="medium"
            emptyMessage="No differentiation opportunities found"
          />
        </div>
      </div>

      {/* Priority Actions */}
      {gaps.priorityActions.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Priority Actions</h4>
          <div className="space-y-2">
            {gaps.priorityActions.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg"
              >
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  action.priority === 'critical' ? 'bg-red-600' :
                  action.priority === 'high' ? 'bg-yellow-600' :
                  action.priority === 'medium' ? 'bg-blue-600' : 'bg-gray-600'
                } text-white`}>
                  {action.priority.toUpperCase()}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{action.action}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Category: {action.category} | Expected: {action.expectedImpact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patterns Summary */}
      <div className="p-4 bg-gray-900/30 rounded-b-lg">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Market Patterns</h4>
        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
          <span>Content Type: <strong className="text-gray-300">{patterns.dominantContentType}</strong></span>
          <span>Avg Words: <strong className="text-gray-300">{patterns.avgWordCount}</strong></span>
          <span>Schema: <strong className="text-gray-300">{patterns.commonSchemaTypes.join(', ') || 'None'}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default TopicSerpPanel;
