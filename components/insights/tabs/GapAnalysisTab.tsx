// components/insights/tabs/GapAnalysisTab.tsx
// Gap Analysis - CompetitorGapGraph network visualization

import React, { useState, useMemo } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { CompetitorGapGraph } from '../../visualization/CompetitorGapGraph';
import { useCompetitorGapNetwork, CompetitorGapNetworkInput } from '../../../hooks/useCompetitorGapNetwork';
import { useAppState } from '../../../state/appState';
import type { AggregatedInsights, InsightActionType } from '../../../types/insights';
import type { CompetitorEAV, ContentGap } from '../../../types';

interface GapAnalysisTabProps {
  insights: AggregatedInsights;
  mapId: string;
  onRefresh: () => void;
  onOpenQueryNetworkAudit?: () => void;
  onAction?: (actionType: InsightActionType, payload?: Record<string, any>) => Promise<void>;
  actionLoading?: string | null;
}

export const GapAnalysisTab: React.FC<GapAnalysisTabProps> = ({
  insights,
  mapId,
  onOpenQueryNetworkAudit,
}) => {
  const { state } = useAppState();
  const activeMap = state.topicalMaps.find(m => m.id === mapId);
  const safeEavs = activeMap?.eavs || [];
  const centralEntity = activeMap?.pillars?.centralEntity || '';

  const [selectedGapNode, setSelectedGapNode] = useState<string | null>(null);

  // Build gap network input from insights competitive intel data
  const gapNetworkInput = useMemo<CompetitorGapNetworkInput | null>(() => {
    const { competitiveIntel } = insights;
    const competitorEAVs = competitiveIntel.competitorEavComparison.uniqueToCompetitors;
    const contentGaps = competitiveIntel.contentGaps;

    if (competitorEAVs.length === 0 && contentGaps.length === 0) return null;

    // Map content gaps to the format expected by useCompetitorGapNetwork
    const mappedGaps: ContentGap[] = contentGaps.map(g => ({
      title: g.title,
      description: g.description,
      competitorCoverageCount: g.competitorCoverageCount,
      priority: g.priority >= 7 ? 'high' : g.priority >= 4 ? 'medium' : 'low',
    })) as unknown as ContentGap[];

    // Map competitor EAVs to the format expected
    const mappedCompetitorEAVs: CompetitorEAV[] = competitorEAVs.map(eav => ({
      entity: eav.subject?.label || '',
      attribute: eav.predicate?.relation || '',
      value: String(eav.object?.value || ''),
      category: eav.predicate?.category,
      source: 'competitor',
    })) as unknown as CompetitorEAV[];

    return {
      ownEAVs: safeEavs,
      competitorEAVs: mappedCompetitorEAVs,
      contentGaps: mappedGaps,
      centralEntity: centralEntity || 'Unknown',
    };
  }, [insights, safeEavs, centralEntity]);

  const { network: gapNetwork } = useCompetitorGapNetwork(gapNetworkInput);

  if (!gapNetworkInput || (gapNetwork.nodes || []).length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Gap Analysis Available</h3>
        <p className="text-gray-400 mb-6">Run Competitor Research first to identify content gaps in your coverage.</p>
        {onOpenQueryNetworkAudit && (
          <Button onClick={onOpenQueryNetworkAudit}>Run Competitor Research</Button>
        )}
      </div>
    );
  }

  const selectedNode = selectedGapNode
    ? gapNetwork.nodes.find(n => n.id === selectedGapNode)
    : null;

  return (
    <div className="space-y-6">
      {/* Gap Network Summary */}
      <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Content Gap Network</h3>
            <p className="text-sm text-gray-400">
              Visual representation of content gaps vs your coverage
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-400">Your Coverage:</span>{' '}
              <span className="text-green-400 font-medium">{gapNetwork.metrics.yourCoverage}%</span>
            </div>
            <div>
              <span className="text-gray-400">Total Gaps:</span>{' '}
              <span className="text-red-400 font-medium">{gapNetwork.metrics.totalGaps}</span>
            </div>
            <div>
              <span className="text-gray-400">High Priority:</span>{' '}
              <span className="text-orange-400 font-medium">{gapNetwork.metrics.highPriorityGaps}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gap Network Graph */}
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden h-[500px]">
            <CompetitorGapGraph
              network={gapNetwork}
              onNodeClick={(node) => setSelectedGapNode(node.id)}
              selectedNodeId={selectedGapNode}
            />
          </Card>
        </div>

        {/* Details Panel */}
        <div className="space-y-4">
          {selectedNode ? (
            <Card className="p-4">
              <h4 className="font-semibold text-white mb-3">
                {selectedNode.type === 'gap' ? 'Content Gap' : 'Your Coverage'}
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Label:</span>{' '}
                  <span className="text-white">{selectedNode.label}</span>
                </div>
                {selectedNode.entity && (
                  <div>
                    <span className="text-gray-400">Entity:</span>{' '}
                    <span className="text-white">{selectedNode.entity}</span>
                  </div>
                )}
                {selectedNode.attribute && (
                  <div>
                    <span className="text-gray-400">Attribute:</span>{' '}
                    <span className="text-white">{selectedNode.attribute}</span>
                  </div>
                )}
                {selectedNode.type === 'gap' && (
                  <>
                    <div>
                      <span className="text-gray-400">Priority:</span>{' '}
                      <span className={`font-medium ${
                        selectedNode.priority === 'high' ? 'text-red-400' :
                        selectedNode.priority === 'medium' ? 'text-orange-400' : 'text-yellow-400'
                      }`}>
                        {selectedNode.priority.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Competitors:</span>{' '}
                      <span className="text-purple-400">{selectedNode.competitorCount}</span>
                    </div>
                    {selectedNode.suggestedContent && (
                      <div className="mt-2">
                        <span className="text-gray-400 block mb-1">Suggested Content:</span>
                        <p className="text-gray-300 text-xs bg-gray-800 p-2 rounded">
                          {selectedNode.suggestedContent}
                        </p>
                      </div>
                    )}
                    {(selectedNode.competitorUrls || []).length > 0 && (
                      <div className="mt-2">
                        <span className="text-gray-400 block mb-1">Found In:</span>
                        <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
                          {(selectedNode.competitorUrls || []).slice(0, 5).map((url, i) => (
                            <div key={i} className="text-blue-400 truncate">{url}</div>
                          ))}
                          {(selectedNode.competitorUrls || []).length > 5 && (
                            <div className="text-gray-500">+{(selectedNode.competitorUrls || []).length - 5} more</div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-4 text-center text-gray-400">
              <p>Click a node to see details</p>
            </Card>
          )}

          {/* High Priority Gaps List */}
          <Card className="p-4">
            <h4 className="font-semibold text-white mb-3">High Priority Gaps</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(gapNetwork.nodes || [])
                .filter(n => n.type === 'gap' && n.priority === 'high')
                .slice(0, 10)
                .map(gap => (
                  <button
                    key={gap.id}
                    onClick={() => setSelectedGapNode(gap.id)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      selectedGapNode === gap.id
                        ? 'bg-red-900/50 border border-red-700'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-white truncate">{gap.label}</div>
                    <div className="text-xs text-gray-400">
                      {gap.competitorCount} competitor{gap.competitorCount !== 1 ? 's' : ''}
                    </div>
                  </button>
                ))}
              {(gapNetwork.nodes || []).filter(n => n.type === 'gap' && n.priority === 'high').length === 0 && (
                <p className="text-gray-400 text-sm">No high priority gaps found</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
