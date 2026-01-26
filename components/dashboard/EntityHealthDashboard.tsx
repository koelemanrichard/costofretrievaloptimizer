/**
 * EntityHealthDashboard Component
 *
 * Dashboard component for displaying entity health analysis results.
 * Shows verification status, health score, and issues requiring attention.
 *
 * Features:
 * - Health score with color-coded indicator
 * - Progress tracking during analysis
 * - Expandable sections for issues and verified entities
 * - Actions for marking entities as proprietary or disambiguating
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useEntityHealth } from '../../hooks/useEntityHealth';
import {
  EntityHealthRecord,
  EntityHealthSummary,
  EntityIssueType,
} from '../../types/entityHealth';
import { SemanticTriple } from '../../types';
import { Button } from '../ui/Button';
import { KnowledgeGraph, StructuralHole } from '../../lib/knowledgeGraph';
import {
  generateBridgeSuggestions,
  BridgeSuggestion,
  BridgeSuggestionInput,
} from '../../services/ai/bridgeSuggestionService';

// ============================================================================
// TYPES
// ============================================================================

interface EntityHealthDashboardProps {
  eavs: SemanticTriple[];
  centralEntity: string;
  coreTopicIds?: string[];
  googleApiKey?: string;
  knowledgeGraph?: KnowledgeGraph | null;
  sourceContext?: string;
  centralSearchIntent?: string[];
  onClose?: () => void;
}

// ============================================================================
// INTERNAL COMPONENTS
// ============================================================================

/**
 * EntityIssueCard - Displays a single entity with issues
 */
interface EntityIssueCardProps {
  entity: EntityHealthRecord;
  onMarkProprietary: (entityName: string) => void;
  onDisambiguate?: (entity: EntityHealthRecord) => void;
}

const EntityIssueCard: React.FC<EntityIssueCardProps> = ({
  entity,
  onMarkProprietary,
  onDisambiguate,
}) => {
  const isCritical = entity.criticality.isCritical;
  const mainIssue = entity.issues[0];
  const severityColor = mainIssue?.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Severity indicator */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${severityColor}`} />

          {/* Entity name */}
          <span className="font-medium text-gray-200 truncate">
            {entity.entityName}
          </span>

          {/* Critical badge */}
          {isCritical && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-red-900/50 text-red-300 rounded flex-shrink-0">
              Critical
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {entity.verificationStatus === 'unverified' && (
            <button
              onClick={() => onMarkProprietary(entity.entityName)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              Mark Proprietary
            </button>
          )}
          {entity.verificationStatus === 'ambiguous' && onDisambiguate && (
            <button
              onClick={() => onDisambiguate(entity)}
              className="px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
            >
              Disambiguate
            </button>
          )}
        </div>
      </div>

      {/* Issue message */}
      {mainIssue && (
        <p className="mt-2 text-sm text-gray-400 pl-4">
          {mainIssue.message}
        </p>
      )}
    </div>
  );
};

/**
 * VerifiedEntityCard - Displays a verified entity (compact)
 */
interface VerifiedEntityCardProps {
  entity: EntityHealthRecord;
}

const VerifiedEntityCard: React.FC<VerifiedEntityCardProps> = ({ entity }) => {
  const statusColor = entity.verificationStatus === 'verified'
    ? 'text-green-400'
    : 'text-yellow-400';

  return (
    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-800/30 rounded">
      <span className="text-sm text-gray-300">{entity.entityName}</span>
      <span className={`text-xs ${statusColor}`}>
        {entity.verificationStatus === 'verified' ? 'Verified' : 'Partial'}
      </span>
    </div>
  );
};

/**
 * StructuralHoleCard - Displays a structural hole with bridge suggestions
 */
interface StructuralHoleCardProps {
  hole: StructuralHole;
  index: number;
  clusterATerms: string[];
  clusterBTerms: string[];
  isExpanded: boolean;
  suggestions?: BridgeSuggestion;
  isLoading: boolean;
  onToggleExpand: () => void;
  onGetSuggestions: () => void;
}

const StructuralHoleCard: React.FC<StructuralHoleCardProps> = ({
  hole,
  index,
  clusterATerms,
  clusterBTerms,
  isExpanded,
  suggestions,
  isLoading,
  onToggleExpand,
  onGetSuggestions,
}) => {
  const priorityColors: Record<string, string> = {
    critical: 'bg-red-900/50 text-red-300 border-red-500/50',
    high: 'bg-orange-900/50 text-orange-300 border-orange-500/50',
    medium: 'bg-yellow-900/50 text-yellow-300 border-yellow-500/50',
    low: 'bg-blue-900/50 text-blue-300 border-blue-500/50',
  };

  const priorityLabels: Record<string, string> = {
    critical: 'Critical Gap',
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
  };

  return (
    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${priorityColors[hole.priority]}`}>
              {priorityLabels[hole.priority]}
            </span>
            <span className="text-xs text-gray-500">
              Connection: {Math.round(hole.connectionStrength * 100)}%
            </span>
          </div>

          {/* Cluster visualization */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex-1 p-2 bg-gray-700/50 rounded">
              <div className="text-xs text-gray-500 mb-1">Cluster A ({clusterATerms.length})</div>
              <div className="text-gray-300 truncate">
                {clusterATerms.slice(0, 3).join(', ')}
                {clusterATerms.length > 3 && <span className="text-gray-500"> +{clusterATerms.length - 3}</span>}
              </div>
            </div>
            <div className="text-gray-500">↔</div>
            <div className="flex-1 p-2 bg-gray-700/50 rounded">
              <div className="text-xs text-gray-500 mb-1">Cluster B ({clusterBTerms.length})</div>
              <div className="text-gray-300 truncate">
                {clusterBTerms.slice(0, 3).join(', ')}
                {clusterBTerms.length > 3 && <span className="text-gray-500"> +{clusterBTerms.length - 3}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={suggestions ? onToggleExpand : onGetSuggestions}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-wait text-white rounded transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Loading...
            </span>
          ) : suggestions ? (
            isExpanded ? 'Hide Suggestions' : 'Show Suggestions'
          ) : (
            'Get Bridge Ideas'
          )}
        </button>
      </div>

      {/* Expanded suggestions */}
      {isExpanded && suggestions && (
        <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-4">
          {/* Research Questions */}
          {suggestions.researchQuestions.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Research Questions
              </h5>
              <ul className="space-y-2">
                {suggestions.researchQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-400 mt-0.5">?</span>
                    <div>
                      <span className="text-gray-300">{q.question}</span>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-gray-500">Target: {q.targetAttribute}</span>
                        <span className="text-xs text-gray-500">Bridges: {q.entityA} ↔ {q.entityB}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Topic Suggestions */}
          {suggestions.topicSuggestions.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Suggested Bridge Topics
              </h5>
              <ul className="space-y-2">
                {suggestions.topicSuggestions.map((t, idx) => (
                  <li key={idx} className="p-2 bg-gray-700/30 rounded">
                    <div className="text-sm text-gray-200 font-medium">{t.title}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.predicates.map((pred, pIdx) => (
                        <span key={pIdx} className="px-1.5 py-0.5 text-xs bg-green-900/30 text-green-400 rounded">
                          {pred}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Bridges: {t.bridgesEntities.join(' ↔ ')}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bridge Candidates from KG */}
          {hole.bridgeCandidates.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Existing Bridge Entities
              </h5>
              <div className="flex flex-wrap gap-2">
                {hole.bridgeCandidates.map((candidate, idx) => (
                  <span key={idx} className="px-2 py-1 text-xs bg-purple-900/30 text-purple-300 rounded">
                    {candidate}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                These entities have high centrality and could serve as natural bridges.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * ExpandableSection - Collapsible section with count badge
 */
interface ExpandableSectionProps {
  title: string;
  count: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  count,
  defaultExpanded = false,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        <span className="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded">
          {count}
        </span>
      </button>
      {isExpanded && (
        <div className="p-3 border-t border-gray-700/50 space-y-2 max-h-64 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * HealthScoreDisplay - Large color-coded health score
 */
interface HealthScoreDisplayProps {
  score: number;
}

const HealthScoreDisplay: React.FC<HealthScoreDisplayProps> = ({ score }) => {
  // Determine color based on score
  const getScoreColor = (s: number) => {
    if (s >= 80) return { bg: 'bg-green-900/30', border: 'border-green-500/50', text: 'text-green-400' };
    if (s >= 60) return { bg: 'bg-yellow-900/30', border: 'border-yellow-500/50', text: 'text-yellow-400' };
    return { bg: 'bg-red-900/30', border: 'border-red-500/50', text: 'text-red-400' };
  };

  const colors = getScoreColor(score);

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-lg border ${colors.bg} ${colors.border}`}>
      <span className={`text-5xl font-bold ${colors.text}`}>{score}%</span>
      <span className="mt-2 text-sm text-gray-400">Entity Health Score</span>
    </div>
  );
};

/**
 * VerificationBreakdown - Progress bar showing verification status breakdown
 */
interface VerificationBreakdownProps {
  summary: EntityHealthSummary;
}

const VerificationBreakdown: React.FC<VerificationBreakdownProps> = ({ summary }) => {
  const total = summary.totalEntities || 1; // Avoid division by zero

  const segments = [
    { label: 'Verified', count: summary.verifiedCount, color: 'bg-green-500' },
    { label: 'Partial', count: summary.partialCount, color: 'bg-yellow-500' },
    { label: 'Proprietary', count: summary.proprietaryCount, color: 'bg-blue-500' },
    { label: 'Unverified', count: summary.unverifiedCount, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-3">
      {/* Stacked progress bar */}
      <div className="h-3 rounded-full bg-gray-700 flex overflow-hidden">
        {segments.map((seg, idx) => {
          const width = (seg.count / total) * 100;
          if (width === 0) return null;
          return (
            <div
              key={idx}
              className={`${seg.color} transition-all duration-300`}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${seg.color}`} />
            <span className="text-gray-400">
              {seg.label}: <span className="text-gray-300 font-medium">{seg.count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * CriticalEntitiesCard - Shows critical entities verification status
 */
interface CriticalEntitiesCardProps {
  total: number;
  verified: number;
}

const CriticalEntitiesCard: React.FC<CriticalEntitiesCardProps> = ({ total, verified }) => {
  const percentage = total > 0 ? Math.round((verified / total) * 100) : 100;
  const isHealthy = percentage >= 80;

  return (
    <div className={`p-4 rounded-lg border ${
      isHealthy
        ? 'bg-green-900/20 border-green-500/30'
        : 'bg-amber-900/20 border-amber-500/30'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-300">Critical Entities</h4>
          <p className="text-xs text-gray-500 mt-1">
            High-importance entities for your content strategy
          </p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold ${isHealthy ? 'text-green-400' : 'text-amber-400'}`}>
            {verified}/{total}
          </span>
          <p className="text-xs text-gray-500">verified</p>
        </div>
      </div>
    </div>
  );
};

/**
 * ProgressIndicator - Shows analysis progress
 */
interface ProgressIndicatorProps {
  phase: string;
  progress: number;
  currentEntity?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ phase, progress, currentEntity }) => {
  const phaseLabels: Record<string, string> = {
    extracting: 'Extracting entities...',
    calculating_criticality: 'Calculating criticality scores...',
    verifying: 'Verifying entities...',
    categorizing: 'Categorizing results...',
    complete: 'Analysis complete',
    error: 'Error occurred',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">{phaseLabels[phase] || phase}</span>
        <span className="text-gray-500">{Math.round(progress)}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current entity */}
      {currentEntity && (
        <p className="text-xs text-gray-500 truncate">
          Processing: {currentEntity}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EntityHealthDashboard: React.FC<EntityHealthDashboardProps> = ({
  eavs,
  centralEntity,
  coreTopicIds,
  googleApiKey,
  knowledgeGraph,
  sourceContext = '',
  centralSearchIntent = [],
  onClose,
}) => {
  const {
    result,
    progress,
    isAnalyzing,
    error,
    analyze,
    markProprietary,
    reset,
  } = useEntityHealth();

  // Structural holes state
  const [expandedHole, setExpandedHole] = useState<number | null>(null);
  const [bridgeSuggestions, setBridgeSuggestions] = useState<Map<number, BridgeSuggestion>>(new Map());
  const [loadingSuggestions, setLoadingSuggestions] = useState<Set<number>>(new Set());

  // Calculate structural holes from knowledge graph
  const structuralHoles = useMemo(() => {
    if (!knowledgeGraph) return [];
    try {
      return knowledgeGraph.identifyStructuralHoles(0.15);
    } catch (err) {
      console.error('Failed to identify structural holes:', err);
      return [];
    }
  }, [knowledgeGraph]);

  // Get node terms from IDs for display
  const getNodeTerms = useCallback((nodeIds: string[]): string[] => {
    if (!knowledgeGraph) return nodeIds;
    return nodeIds.map(id => {
      const node = knowledgeGraph.getNode(id);
      return node?.term || id;
    });
  }, [knowledgeGraph]);

  // Generate bridge suggestions for a structural hole
  const handleGetBridgeSuggestions = useCallback(async (holeIndex: number, hole: StructuralHole) => {
    if (loadingSuggestions.has(holeIndex)) return;

    setLoadingSuggestions(prev => new Set(prev).add(holeIndex));

    try {
      const input: BridgeSuggestionInput = {
        clusterATerms: getNodeTerms(hole.clusterA),
        clusterBTerms: getNodeTerms(hole.clusterB),
        centralEntity,
        sourceContext,
        centralSearchIntent,
      };

      const suggestions = await generateBridgeSuggestions(input, false);

      setBridgeSuggestions(prev => {
        const next = new Map(prev);
        next.set(holeIndex, suggestions);
        return next;
      });
      setExpandedHole(holeIndex);
    } catch (err) {
      console.error('Failed to generate bridge suggestions:', err);
    } finally {
      setLoadingSuggestions(prev => {
        const next = new Set(prev);
        next.delete(holeIndex);
        return next;
      });
    }
  }, [centralEntity, sourceContext, centralSearchIntent, getNodeTerms, loadingSuggestions]);

  const handleAnalyze = () => {
    analyze(eavs, centralEntity, coreTopicIds, googleApiKey);
  };

  const handleRetry = () => {
    reset();
    handleAnalyze();
  };

  // Render states
  // 1. Not yet analyzed
  if (!result && !isAnalyzing && !error) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Entity Health Check</h3>
            <p className="mt-1 text-sm text-gray-400">
              Verify your entities against authoritative sources
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-gray-300">{eavs.length}</span>
            <span>EAV triples to analyze</span>
          </div>

          <Button onClick={handleAnalyze} variant="primary">
            Check Entity Health
          </Button>
        </div>
      </div>
    );
  }

  // 2. Analyzing
  if (isAnalyzing && progress) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {/* Spinner */}
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-lg font-semibold text-white">Analyzing Entities</h3>
          </div>

          <ProgressIndicator
            phase={progress.phase}
            progress={progress.progress}
            currentEntity={progress.currentEntity}
          />

          <div className="text-xs text-gray-500">
            {progress.processedEntities} of {progress.totalEntities} entities processed
          </div>
        </div>
      </div>
    );
  }

  // 3. Error
  if (error) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg border border-red-700/50">
        <div className="text-center space-y-4">
          {/* Error icon */}
          <div className="w-16 h-16 mx-auto bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Analysis Failed</h3>
            <p className="mt-2 text-sm text-red-400">{error}</p>
          </div>

          <Button onClick={handleRetry} variant="secondary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // 4. Results
  if (result) {
    const { summary, issuesRequiringAttention, autoVerified } = result;

    return (
      <div className="p-6 bg-gray-900 rounded-lg border border-gray-700 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Entity Health Results</h3>
          <span className="text-xs text-gray-500">
            Analyzed {summary.lastAnalyzedAt ? new Date(summary.lastAnalyzedAt).toLocaleString() : 'just now'}
          </span>
        </div>

        {/* Score and Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Health Score */}
          <HealthScoreDisplay score={summary.healthScore} />

          {/* Stats */}
          <div className="space-y-3">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Verified Entities</span>
                <span className="text-lg font-bold text-white">
                  {summary.verifiedCount + summary.partialCount} / {summary.totalEntities}
                </span>
              </div>
            </div>

            <VerificationBreakdown summary={summary} />
          </div>
        </div>

        {/* Critical Entities Status */}
        <CriticalEntitiesCard
          total={summary.criticalEntities}
          verified={summary.criticalVerified}
        />

        {/* Issues Requiring Attention */}
        {issuesRequiringAttention.length > 0 && (
          <ExpandableSection
            title="Issues Requiring Attention"
            count={issuesRequiringAttention.length}
            defaultExpanded={true}
          >
            {issuesRequiringAttention.map((entity, idx) => (
              <EntityIssueCard
                key={`${entity.normalizedName}-${idx}`}
                entity={entity}
                onMarkProprietary={markProprietary}
              />
            ))}
          </ExpandableSection>
        )}

        {/* Auto-Verified */}
        {autoVerified.length > 0 && (
          <ExpandableSection
            title="Auto-Verified Entities"
            count={autoVerified.length}
            defaultExpanded={false}
          >
            {autoVerified.map((entity, idx) => (
              <VerifiedEntityCard
                key={`${entity.normalizedName}-${idx}`}
                entity={entity}
              />
            ))}
          </ExpandableSection>
        )}

        {/* Structural Holes / Bridge Opportunities */}
        {structuralHoles.length > 0 && (
          <ExpandableSection
            title="Content Bridging Opportunities"
            count={structuralHoles.length}
            defaultExpanded={false}
          >
            <p className="text-xs text-gray-500 mb-3">
              These topic clusters are disconnected or weakly connected. Create bridge content to strengthen your topical authority.
            </p>
            {structuralHoles.map((hole, idx) => (
              <StructuralHoleCard
                key={idx}
                hole={hole}
                index={idx}
                clusterATerms={getNodeTerms(hole.clusterA)}
                clusterBTerms={getNodeTerms(hole.clusterB)}
                isExpanded={expandedHole === idx}
                suggestions={bridgeSuggestions.get(idx)}
                isLoading={loadingSuggestions.has(idx)}
                onToggleExpand={() => setExpandedHole(expandedHole === idx ? null : idx)}
                onGetSuggestions={() => handleGetBridgeSuggestions(idx, hole)}
              />
            ))}
          </ExpandableSection>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
          <Button onClick={handleRetry} variant="ghost" size="sm">
            Re-analyze
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="primary" size="sm">
              Done
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Fallback (should not reach)
  return null;
};

export default EntityHealthDashboard;
