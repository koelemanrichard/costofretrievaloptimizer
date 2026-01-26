/**
 * TopicBridgingContext
 *
 * Intelligent bridging recommendation for a topic in the Content Brief modal.
 * Uses Semantic SEO principles to identify the SINGLE BEST internal link
 * that will strengthen topical authority and close knowledge gaps.
 *
 * Scoring factors:
 * 1. Attribute Category Weight (UNIQUE > ROOT > RARE > COMMON)
 * 2. Central Search Intent alignment
 * 3. Structural hole priority
 * 4. Semantic distance (not too close, not too far)
 */

import React, { useMemo } from 'react';
import { KnowledgeGraph, StructuralHole } from '../../lib/knowledgeGraph';
import { EnrichedTopic, SemanticTriple, SEOPillars, AttributeCategory } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface TopicBridgingContextProps {
  topic: EnrichedTopic;
  knowledgeGraph: KnowledgeGraph | null;
  eavs: SemanticTriple[];
  pillars?: SEOPillars;
  allTopics: EnrichedTopic[];
  onAddInternalLink?: (targetTopic: EnrichedTopic, anchorSuggestion: string) => void;
}

// Attribute category weights for scoring (Semantic SEO principle)
const CATEGORY_WEIGHTS: Record<AttributeCategory, number> = {
  UNIQUE: 1.0,
  ROOT: 0.8,
  RARE: 0.5,
  COMMON: 0.2,
};

interface BridgeRecommendation {
  targetTopic: EnrichedTopic;
  score: number;
  reason: string;
  anchorSuggestion: string;
  seoImpact: 'high' | 'medium' | 'low';
  sharedEntities: string[];
}

/**
 * Calculate bridge score based on Semantic SEO principles
 */
function calculateBridgeScore(
  sourceTopic: EnrichedTopic,
  targetTopic: EnrichedTopic,
  eavs: SemanticTriple[],
  pillars: SEOPillars | undefined,
  structuralHoles: StructuralHole[]
): { score: number; reason: string; sharedEntities: string[]; anchorSuggestion: string } {
  let score = 0;
  const reasons: string[] = [];
  const sharedEntities: string[] = [];

  const sourceTitle = (sourceTopic.title || '').toLowerCase();
  const targetTitle = (targetTopic.title || '').toLowerCase();

  // Early exit if no titles
  if (!sourceTitle || !targetTitle) {
    return { score: 0, reason: 'missing title', sharedEntities: [], anchorSuggestion: '' };
  }

  // 1. Find shared EAV entities between topics (semantic proximity)
  const sourceEntities = new Set<string>();
  const targetEntities = new Set<string>();

  eavs.forEach(eav => {
    if (!eav.entity) return;
    const entityLower = eav.entity.toLowerCase();
    const valueLower = (eav.value || '').toLowerCase();

    if (sourceTitle.includes(entityLower) || sourceTitle.includes(valueLower)) {
      sourceEntities.add(eav.entity);
      if (eav.value) sourceEntities.add(eav.value);
    }
    if (targetTitle.includes(entityLower) || targetTitle.includes(valueLower)) {
      targetEntities.add(eav.entity);
      if (eav.value) targetEntities.add(eav.value);
    }
  });

  // Find overlap
  sourceEntities.forEach(entity => {
    if (targetEntities.has(entity)) {
      sharedEntities.push(entity);
    }
  });

  // 2. Score based on shared entities with category weights
  const relevantEavs = eavs.filter(eav =>
    sharedEntities.includes(eav.entity) || sharedEntities.includes(eav.value || '')
  );

  relevantEavs.forEach(eav => {
    const categoryWeight = CATEGORY_WEIGHTS[eav.category] || 0.2;
    score += categoryWeight * 10;
  });

  // 3. CSI alignment bonus - does target reinforce central search intent?
  if (pillars?.centralSearchIntent && Array.isArray(pillars.centralSearchIntent)) {
    const csiMatch = pillars.centralSearchIntent.some(intent => {
      if (!intent || typeof intent !== 'string') return false;
      const intentLower = intent.toLowerCase();
      return targetTitle.includes(intentLower) ||
        intentLower.includes(targetTitle.split(' ')[0]);
    });
    if (csiMatch) {
      score += 15;
      reasons.push('reinforces central search intent');
    }
  }

  // 4. Structural hole bonus - does this bridge a gap?
  const bridgesHole = structuralHoles.some(hole => {
    const inClusterA = (hole.clusterA || []).some(e => {
      if (!e || typeof e !== 'string') return false;
      const eLower = e.toLowerCase();
      return sourceTitle.includes(eLower) || eLower.includes(sourceTitle);
    });
    const inClusterB = (hole.clusterB || []).some(e => {
      if (!e || typeof e !== 'string') return false;
      const eLower = e.toLowerCase();
      return targetTitle.includes(eLower) || eLower.includes(targetTitle);
    });
    return (inClusterA && inClusterB) || (inClusterB && inClusterA);
  });

  if (bridgesHole) {
    score += 20;
    reasons.push('bridges content gap');
  }

  // 5. Topic class complementarity
  const sourceClass = sourceTopic.topic_class || sourceTopic.metadata?.topic_class;
  const targetClass = targetTopic.topic_class || targetTopic.metadata?.topic_class;

  // Informational → Commercial is good (funnel progression)
  if (sourceClass === 'informational' && targetClass === 'commercial') {
    score += 10;
    reasons.push('guides user toward conversion');
  }
  // Commercial → Transactional is good
  if (sourceClass === 'commercial' && targetClass === 'transactional') {
    score += 12;
    reasons.push('supports purchase decision');
  }
  // Foundation pages deserve links
  if (targetTopic.metadata?.is_foundation_page || targetClass === 'navigational') {
    score += 8;
    reasons.push('strengthens site architecture');
  }

  // 6. Parent-child relationship bonus
  if (sourceTopic.parent_id === targetTopic.id || targetTopic.parent_id === sourceTopic.id) {
    score += 5;
    reasons.push('maintains topic hierarchy');
  }

  // 7. Penalty for same-cluster redundancy (we want diversity)
  if (sourceTopic.parent_id === targetTopic.parent_id && sourceTopic.parent_id) {
    score -= 5; // Sibling topics - slightly less valuable
  }

  // Generate anchor text suggestion from shared entities or target title
  let anchorSuggestion = '';
  if (sharedEntities.length > 0) {
    // Use highest-value shared entity
    const bestEntity = relevantEavs.sort((a, b) =>
      (CATEGORY_WEIGHTS[b.category] || 0) - (CATEGORY_WEIGHTS[a.category] || 0)
    )[0];
    anchorSuggestion = bestEntity?.entity || sharedEntities[0];
  } else {
    // Fallback to target topic's core keyword
    anchorSuggestion = targetTopic.title.split(':')[0].trim();
  }

  // Build reason string
  const reasonText = reasons.length > 0
    ? reasons.join(', ')
    : sharedEntities.length > 0
      ? `shares ${sharedEntities.length} semantic connection${sharedEntities.length > 1 ? 's' : ''}`
      : 'related topic';

  return { score, reason: reasonText, sharedEntities, anchorSuggestion };
}

export const TopicBridgingContext: React.FC<TopicBridgingContextProps> = ({
  topic,
  knowledgeGraph,
  eavs,
  pillars,
  allTopics,
  onAddInternalLink,
}) => {
  // Calculate the SINGLE BEST bridge recommendation
  const recommendation = useMemo<BridgeRecommendation | null>(() => {
    if (!knowledgeGraph || allTopics.length < 2) return null;

    // Get structural holes for scoring
    let structuralHoles: StructuralHole[] = [];
    try {
      structuralHoles = knowledgeGraph.identifyStructuralHoles(0.15);
    } catch (err) {
      console.error('Failed to identify structural holes:', err);
    }

    // Score all potential target topics
    const candidates: BridgeRecommendation[] = [];

    for (const targetTopic of allTopics) {
      // Skip self
      if (targetTopic.id === topic.id) continue;

      // Skip topics without titles
      if (!targetTopic.title) continue;

      const { score, reason, sharedEntities, anchorSuggestion } = calculateBridgeScore(
        topic,
        targetTopic,
        eavs,
        pillars,
        structuralHoles
      );

      // Only consider topics with meaningful scores
      if (score > 5) {
        candidates.push({
          targetTopic,
          score,
          reason,
          anchorSuggestion,
          seoImpact: score >= 30 ? 'high' : score >= 15 ? 'medium' : 'low',
          sharedEntities,
        });
      }
    }

    // Return only the BEST recommendation
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  }, [topic, knowledgeGraph, eavs, pillars, allTopics]);

  // Don't show if no meaningful recommendation
  if (!recommendation || recommendation.score < 10) {
    return null;
  }

  const impactColors = {
    high: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    medium: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    low: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  };

  return (
    <Card className="p-4 bg-emerald-950/20 border border-emerald-800/50">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <h3 className="font-semibold text-emerald-300">Recommended Internal Link</h3>
        <span className={`text-xs px-2 py-0.5 rounded border ${impactColors[recommendation.seoImpact]}`}>
          {recommendation.seoImpact} SEO impact
        </span>
      </div>

      {/* The single recommendation */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Target topic */}
            <p className="text-white font-medium text-base mb-1">
              Link to: <span className="text-emerald-300">{recommendation.targetTopic.title}</span>
            </p>

            {/* Why - the SEO reason */}
            <p className="text-sm text-gray-400 mb-3">
              <span className="text-gray-500">Why:</span> This link {recommendation.reason}.
            </p>

            {/* Suggested anchor text */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Anchor text:</span>
              <code className="bg-gray-900 px-2 py-0.5 rounded text-cyan-300 text-xs">
                {recommendation.anchorSuggestion}
              </code>
            </div>
          </div>

          {/* Action button */}
          {onAddInternalLink && (
            <Button
              onClick={() => onAddInternalLink(recommendation.targetTopic, recommendation.anchorSuggestion)}
              variant="primary"
              size="sm"
              className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Link
            </Button>
          )}
        </div>

        {/* Shared semantic connections (if any, keep minimal) */}
        {recommendation.sharedEntities.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <span className="text-xs text-gray-500">Shared entities: </span>
            <span className="text-xs text-gray-400">
              {recommendation.sharedEntities.slice(0, 3).join(', ')}
              {recommendation.sharedEntities.length > 3 && ` +${recommendation.sharedEntities.length - 3} more`}
            </span>
          </div>
        )}
      </div>

      {/* Brief explanation */}
      <p className="text-xs text-gray-500 mt-3">
        Internal links strengthen topical authority by connecting related content.
        This recommendation is based on semantic relevance, content gaps, and user journey optimization.
      </p>
    </Card>
  );
};

export default TopicBridgingContext;
