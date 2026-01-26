/**
 * BridgingOpportunitiesPanel
 *
 * Intelligent dashboard view of the TOP bridging opportunities.
 * Uses Semantic SEO principles to show only the most valuable content gaps
 * with clear, actionable recommendations.
 *
 * Shows maximum 3 prioritized opportunities based on:
 * - Structural hole priority
 * - EAV attribute category importance
 * - CSI alignment potential
 */

import React, { useMemo } from 'react';
import { KnowledgeGraph, StructuralHole } from '../../lib/knowledgeGraph';
import { SemanticTriple, SEOPillars, EnrichedTopic, AttributeCategory } from '../../types';
import { Button } from '../ui/Button';

interface BridgingOpportunitiesPanelProps {
  knowledgeGraph: KnowledgeGraph | null;
  eavs: SemanticTriple[];
  pillars?: SEOPillars;
  topics: EnrichedTopic[];
  onSelectTopic?: (topicId: string) => void;
  onCreateTopic?: (title: string) => void;
}

// Attribute category weights for scoring
const CATEGORY_WEIGHTS: Record<AttributeCategory, number> = {
  UNIQUE: 1.0,
  ROOT: 0.8,
  RARE: 0.5,
  COMMON: 0.2,
};

interface ScoredOpportunity {
  hole: StructuralHole;
  score: number;
  primaryAction: {
    type: 'link_existing' | 'create_new';
    targetTopic?: EnrichedTopic;
    suggestedTitle?: string;
    reason: string;
  };
  impactLevel: 'critical' | 'high' | 'medium';
}

/**
 * Score and rank bridging opportunities
 */
function scoreOpportunities(
  holes: StructuralHole[],
  eavs: SemanticTriple[],
  topics: EnrichedTopic[],
  pillars?: SEOPillars
): ScoredOpportunity[] {
  const scored: ScoredOpportunity[] = [];

  for (const hole of holes) {
    let score = 0;

    // 1. Base score from priority
    if (hole.priority === 'critical') score += 40;
    else if (hole.priority === 'high') score += 30;
    else if (hole.priority === 'medium') score += 20;
    else score += 10;

    // 2. Score based on EAV category importance in clusters
    const clusterEntities = [...hole.clusterA, ...hole.clusterB];
    const relevantEavs = eavs.filter(eav =>
      clusterEntities.some(entity =>
        entity.toLowerCase().includes(eav.entity.toLowerCase()) ||
        eav.entity.toLowerCase().includes(entity.toLowerCase())
      )
    );

    // Higher value EAVs = more important gap
    relevantEavs.forEach(eav => {
      score += (CATEGORY_WEIGHTS[eav.category] || 0.2) * 5;
    });

    // 3. CSI alignment - does bridging help CSI?
    if (pillars?.centralSearchIntent && Array.isArray(pillars.centralSearchIntent)) {
      const csiRelevant = pillars.centralSearchIntent.some(intent =>
        clusterEntities.some(entity =>
          entity.toLowerCase().includes(intent.toLowerCase()) ||
          intent.toLowerCase().includes(entity.toLowerCase())
        )
      );
      if (csiRelevant) score += 15;
    }

    // 4. Determine best action
    let primaryAction: ScoredOpportunity['primaryAction'];

    // Check if any existing topic could serve as a bridge
    const potentialBridge = topics.find(topic => {
      const title = topic.title.toLowerCase();
      const matchesA = hole.clusterA.some(e => title.includes(e.toLowerCase()));
      const matchesB = hole.clusterB.some(e => title.includes(e.toLowerCase()));
      const isBridgeCandidate = hole.bridgeCandidates.some(c =>
        title.includes(c.toLowerCase()) || c.toLowerCase().includes(title)
      );
      return (matchesA && matchesB) || isBridgeCandidate;
    });

    if (potentialBridge) {
      primaryAction = {
        type: 'link_existing',
        targetTopic: potentialBridge,
        reason: 'Add internal links from this topic to both clusters',
      };
    } else if (hole.bridgeCandidates.length > 0) {
      // Suggest creating a new topic
      const bestCandidate = hole.bridgeCandidates[0];
      primaryAction = {
        type: 'create_new',
        suggestedTitle: bestCandidate,
        reason: `Create content about "${bestCandidate}" to bridge these clusters`,
      };
    } else {
      // Generic suggestion based on cluster overlap
      const clusterAMain = hole.clusterA[0] || 'Cluster A';
      const clusterBMain = hole.clusterB[0] || 'Cluster B';
      primaryAction = {
        type: 'create_new',
        suggestedTitle: `${clusterAMain} and ${clusterBMain}`,
        reason: 'Create content that connects both topic areas',
      };
    }

    // Determine impact level
    const impactLevel: 'critical' | 'high' | 'medium' =
      score >= 50 ? 'critical' : score >= 30 ? 'high' : 'medium';

    scored.push({ hole, score, primaryAction, impactLevel });
  }

  // Sort by score descending, take top 3
  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}

const BridgingOpportunitiesPanel: React.FC<BridgingOpportunitiesPanelProps> = ({
  knowledgeGraph,
  eavs,
  pillars,
  topics,
  onSelectTopic,
  onCreateTopic,
}) => {
  // Get and score opportunities
  const opportunities = useMemo(() => {
    if (!knowledgeGraph) return [];

    try {
      const holes = knowledgeGraph.identifyStructuralHoles(0.15);
      if (holes.length === 0) return [];

      return scoreOpportunities(holes, eavs, topics, pillars);
    } catch (err) {
      console.error('Failed to analyze bridging opportunities:', err);
      return [];
    }
  }, [knowledgeGraph, eavs, topics, pillars]);

  if (!knowledgeGraph) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Add EAVs to detect content gaps</p>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="text-center py-4">
        <svg className="w-6 h-6 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-green-400">No critical content gaps detected</p>
        <p className="text-xs text-gray-500 mt-1">Your topic clusters are well connected</p>
      </div>
    );
  }

  const impactColors = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500' },
    high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500' },
    medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500' },
  };

  return (
    <div className="space-y-3">
      {/* Summary */}
      <p className="text-xs text-gray-400">
        Top {opportunities.length} content gap{opportunities.length > 1 ? 's' : ''} that will strengthen your topical authority:
      </p>

      {/* Opportunity cards */}
      {opportunities.map((opp, idx) => {
        const colors = impactColors[opp.impactLevel];
        return (
          <div
            key={idx}
            className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${colors.badge}`} />
                <span className={`text-xs font-medium uppercase ${colors.text}`}>
                  {opp.impactLevel} priority
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {opp.hole.clusterA.length + opp.hole.clusterB.length} entities affected
              </span>
            </div>

            {/* Gap description */}
            <p className="text-sm text-gray-300 mb-2">
              Gap between <span className="text-blue-400">{opp.hole.clusterA.slice(0, 2).join(', ')}</span>
              {' '}and{' '}
              <span className="text-purple-400">{opp.hole.clusterB.slice(0, 2).join(', ')}</span>
            </p>

            {/* Action */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-700/50">
              <p className="text-xs text-gray-400 flex-1">
                {opp.primaryAction.reason}
              </p>

              {opp.primaryAction.type === 'link_existing' && opp.primaryAction.targetTopic && onSelectTopic ? (
                <Button
                  onClick={() => onSelectTopic(opp.primaryAction.targetTopic!.id)}
                  variant="ghost"
                  size="sm"
                  className="text-xs ml-2"
                >
                  View Topic
                </Button>
              ) : opp.primaryAction.type === 'create_new' && onCreateTopic ? (
                <Button
                  onClick={() => onCreateTopic(opp.primaryAction.suggestedTitle || '')}
                  variant="ghost"
                  size="sm"
                  className="text-xs ml-2"
                >
                  Create Topic
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}

      {/* Help text */}
      <p className="text-xs text-gray-500 pt-2 border-t border-gray-700/30">
        Bridging content gaps improves internal linking and demonstrates expertise across related topics.
      </p>
    </div>
  );
};

export default BridgingOpportunitiesPanel;
