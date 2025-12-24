/**
 * useCompetitorGapNetwork Hook
 *
 * Transforms competitor analysis data (ContentGap[], CompetitorEAV[], SemanticTriple[])
 * into a graph visualization structure (CompetitorGapNetwork) for the Gap Analysis view.
 *
 * This hook is used by CompetitorGapGraph.tsx to visualize:
 * - Your EAVs (green nodes) - what you cover
 * - Gap nodes (red/orange) - what competitors have that you don't
 * - Edges representing semantic relationships
 */

import { useMemo, useCallback, useState } from 'react';
import {
  ContentGap,
  CompetitorEAV,
  SemanticTriple,
  GapNode,
  GapEdge,
  GapNodeType,
  GapEdgeType,
  CompetitorGapNetwork
} from '../types';

// ============================================
// TYPES
// ============================================

export interface CompetitorGapNetworkInput {
  /** User's own EAVs from topical map */
  ownEAVs?: SemanticTriple[];

  /** User's own EAVs in competitor format (from QueryNetworkAnalysis) */
  ownCompetitorEAVs?: CompetitorEAV[];

  /** All competitor EAVs extracted from SERP analysis */
  competitorEAVs: CompetitorEAV[];

  /** Identified content gaps */
  contentGaps: ContentGap[];

  /** Central entity for the analysis */
  centralEntity: string;
}

export interface UseCompetitorGapNetworkOptions {
  /** Minimum competitor count to include a gap node (default: 1) */
  minCompetitorCount?: number;

  /** Maximum nodes to display (default: 100) */
  maxNodes?: number;

  /** Semantic distance threshold for creating edges (default: 0.7) */
  edgeDistanceThreshold?: number;

  /** Include competitor EAV nodes (can be very numerous) */
  showCompetitorEAVs?: boolean;
}

export interface UseCompetitorGapNetworkReturn {
  /** The transformed network data for visualization */
  network: CompetitorGapNetwork;

  /** Loading state while transforming */
  isTransforming: boolean;

  /** Error if transformation failed */
  error: string | null;

  /** Get node by ID */
  getNodeById: (id: string) => GapNode | undefined;

  /** Get edges connected to a node */
  getNodeEdges: (nodeId: string) => GapEdge[];

  /** Get gap nodes only */
  getGapNodes: () => GapNode[];

  /** Get your coverage nodes only */
  getYourNodes: () => GapNode[];

  /** Filter nodes by priority */
  getNodesByPriority: (priority: 'high' | 'medium' | 'low') => GapNode[];

  /** Recalculate network with new options */
  recalculate: (newOptions: UseCompetitorGapNetworkOptions) => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Creates a unique ID for a gap node based on attribute
 */
function createGapNodeId(missingAttribute: string): string {
  return `gap-${missingAttribute.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

/**
 * Creates a unique ID for an EAV node
 */
function createEAVNodeId(entity: string, attribute: string, isOwn: boolean): string {
  const prefix = isOwn ? 'own' : 'comp';
  const key = `${entity}-${attribute}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${prefix}-${key}`;
}

/**
 * Simple semantic similarity based on shared words
 * Returns value between 0 (identical) and 1 (completely different)
 */
function calculateSimpleDistance(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 1;

  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;

  // Jaccard distance: 1 - (intersection / union)
  return 1 - (intersection / union);
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// ============================================
// TRANSFORMATION FUNCTIONS
// ============================================

/**
 * Transform user's own EAVs to GapNodes
 */
function transformOwnEAVsToNodes(
  eavs: SemanticTriple[] | undefined,
  competitorEAVFormat: CompetitorEAV[] | undefined
): GapNode[] {
  const nodes: GapNode[] = [];
  const seen = new Set<string>();

  // Process SemanticTriple format (from topical map)
  if (eavs) {
    for (const eav of eavs) {
      const id = createEAVNodeId(eav.subject.label, eav.predicate.relation, true);
      if (seen.has(id)) continue;
      seen.add(id);

      nodes.push({
        id,
        type: 'your_eav',
        entity: eav.subject.label,
        attribute: eav.predicate.relation,
        value: String(eav.object.value),
        competitorCount: 0,
        competitorUrls: [],
        label: `${eav.subject.label}: ${eav.predicate.relation}`,
        priority: 'low' // Your own EAVs have low priority (you have them)
      });
    }
  }

  // Process CompetitorEAV format (from QueryNetworkAnalysis)
  if (competitorEAVFormat) {
    for (const eav of competitorEAVFormat) {
      const id = createEAVNodeId(eav.entity, eav.attribute, true);
      if (seen.has(id)) continue;
      seen.add(id);

      nodes.push({
        id,
        type: 'your_eav',
        entity: eav.entity,
        attribute: eav.attribute,
        value: eav.value,
        competitorCount: 0,
        competitorUrls: [],
        label: `${eav.entity}: ${eav.attribute}`,
        priority: 'low'
      });
    }
  }

  return nodes;
}

/**
 * Transform content gaps to GapNodes
 */
function transformGapsToNodes(
  gaps: ContentGap[],
  minCompetitorCount: number
): GapNode[] {
  return gaps
    .filter(gap => gap.frequency >= minCompetitorCount)
    .map(gap => {
      const id = createGapNodeId(gap.missingAttribute);

      // Parse entity:attribute from missingAttribute
      const parts = gap.missingAttribute.split(' - ');
      const entity = parts[0] || gap.missingAttribute;
      const attribute = parts[1] || '';

      return {
        id,
        type: 'gap' as GapNodeType,
        entity,
        attribute,
        missingAttribute: gap.missingAttribute,
        suggestedContent: gap.suggestedContent,
        competitorCount: gap.frequency,
        competitorUrls: gap.foundInCompetitors,
        label: gap.missingAttribute,
        priority: gap.priority
      };
    });
}

/**
 * Transform competitor EAVs to GapNodes (optional, can be numerous)
 */
function transformCompetitorEAVsToNodes(
  eavs: CompetitorEAV[],
  ownNodeIds: Set<string>,
  gapNodeIds: Set<string>
): GapNode[] {
  const nodes: GapNode[] = [];
  const seen = new Set<string>();

  // Group by entity:attribute
  const grouped = new Map<string, CompetitorEAV[]>();
  for (const eav of eavs) {
    const key = `${eav.entity.toLowerCase()}:${eav.attribute.toLowerCase()}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(eav);
  }

  for (const [key, groupEavs] of grouped) {
    const id = createEAVNodeId(groupEavs[0].entity, groupEavs[0].attribute, false);

    // Skip if already covered by own nodes or gap nodes
    if (ownNodeIds.has(id.replace('comp-', 'own-')) || seen.has(id)) continue;

    // Skip if this is already a gap node
    const gapId = createGapNodeId(`${groupEavs[0].entity} - ${groupEavs[0].attribute}`);
    if (gapNodeIds.has(gapId)) continue;

    seen.add(id);

    const sources = [...new Set(groupEavs.map(e => e.source))];

    nodes.push({
      id,
      type: 'competitor_eav',
      entity: groupEavs[0].entity,
      attribute: groupEavs[0].attribute,
      value: groupEavs[0].value,
      competitorCount: sources.length,
      competitorUrls: sources,
      label: `${groupEavs[0].entity}: ${groupEavs[0].attribute}`,
      priority: sources.length >= 5 ? 'high' : sources.length >= 2 ? 'medium' : 'low'
    });
  }

  return nodes;
}

/**
 * Create edges between semantically related nodes
 */
function createSemanticEdges(
  nodes: GapNode[],
  distanceThreshold: number
): GapEdge[] {
  const edges: GapEdge[] = [];
  const edgeSet = new Set<string>();

  // Compare each pair of nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      // Calculate semantic distance based on labels
      const distance = calculateSimpleDistance(nodeA.label, nodeB.label);

      if (distance < distanceThreshold) {
        const edgeId = `${nodeA.id}-${nodeB.id}`;
        if (edgeSet.has(edgeId)) continue;
        edgeSet.add(edgeId);

        // Determine edge type
        let edgeType: GapEdgeType = 'semantic';
        if (nodeA.type === 'gap' || nodeB.type === 'gap') {
          edgeType = 'suggested_bridge';
        }

        // Calculate weight (inverse of distance, scaled 1-10)
        const weight = Math.round((1 - distance) * 9) + 1;

        edges.push({
          id: edgeId,
          source: nodeA.id,
          target: nodeB.id,
          type: edgeType,
          semanticDistance: distance,
          weight,
          bridgeReason: edgeType === 'suggested_bridge'
            ? `Semantic overlap: ${Math.round((1 - distance) * 100)}%`
            : undefined
        });
      }
    }
  }

  return edges;
}

/**
 * Group nodes into clusters based on shared entity
 */
function createClusters(
  nodes: GapNode[]
): CompetitorGapNetwork['clusters'] {
  const entityGroups = new Map<string, GapNode[]>();

  for (const node of nodes) {
    const entity = node.entity?.toLowerCase() || 'other';
    if (!entityGroups.has(entity)) {
      entityGroups.set(entity, []);
    }
    entityGroups.get(entity)!.push(node);
  }

  return Array.from(entityGroups.entries())
    .filter(([, nodes]) => nodes.length > 1)
    .map(([entity, clusterNodes]) => ({
      id: `cluster-${entity}`,
      label: entity,
      nodeIds: clusterNodes.map(n => n.id),
      centroidNodeId: clusterNodes.reduce((best, node) =>
        (node.competitorCount > (best?.competitorCount || 0)) ? node : best
        , clusterNodes[0])?.id
    }));
}

// ============================================
// MAIN HOOK
// ============================================

export function useCompetitorGapNetwork(
  input: CompetitorGapNetworkInput | null,
  options?: UseCompetitorGapNetworkOptions
): UseCompetitorGapNetworkReturn {
  const {
    minCompetitorCount = 1,
    maxNodes = 100,
    edgeDistanceThreshold = 0.7,
    showCompetitorEAVs = false
  } = options || {};

  const [currentOptions, setCurrentOptions] = useState(options);

  // Transform input data into network structure
  const network = useMemo<CompetitorGapNetwork>(() => {
    if (!input) {
      return {
        nodes: [],
        edges: [],
        metrics: {
          totalGaps: 0,
          highPriorityGaps: 0,
          yourCoverage: 0,
          avgCompetitorCoverage: 0,
          centralEntity: '',
          competitors: []
        }
      };
    }

    console.log('[useCompetitorGapNetwork] Transforming data...', {
      ownEAVs: input.ownEAVs?.length || 0,
      ownCompetitorEAVs: input.ownCompetitorEAVs?.length || 0,
      competitorEAVs: input.competitorEAVs.length,
      contentGaps: input.contentGaps.length
    });

    // 1. Transform own EAVs to nodes
    const ownNodes = transformOwnEAVsToNodes(input.ownEAVs, input.ownCompetitorEAVs);
    const ownNodeIds = new Set(ownNodes.map(n => n.id));

    // 2. Transform content gaps to nodes
    const gapNodes = transformGapsToNodes(input.contentGaps, minCompetitorCount);
    const gapNodeIds = new Set(gapNodes.map(n => n.id));

    // 3. Optionally transform competitor EAVs to nodes
    let competitorNodes: GapNode[] = [];
    if (showCompetitorEAVs) {
      competitorNodes = transformCompetitorEAVsToNodes(
        input.competitorEAVs,
        ownNodeIds,
        gapNodeIds
      );
    }

    // 4. Combine all nodes (limit to maxNodes)
    let allNodes = [...gapNodes, ...ownNodes, ...competitorNodes];

    // Sort by priority and competitor count, then limit
    allNodes.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.competitorCount - a.competitorCount;
    });

    if (allNodes.length > maxNodes) {
      allNodes = allNodes.slice(0, maxNodes);
    }

    // 5. Create edges between semantically related nodes
    const edges = createSemanticEdges(allNodes, edgeDistanceThreshold);

    // 6. Create clusters
    const clusters = createClusters(allNodes);

    // 7. Calculate metrics
    const totalGaps = gapNodes.length;
    const highPriorityGaps = gapNodes.filter(n => n.priority === 'high').length;

    // Unique competitors
    const allCompetitorUrls = new Set<string>();
    for (const node of allNodes) {
      for (const url of node.competitorUrls) {
        allCompetitorUrls.add(extractDomain(url));
      }
    }

    // Coverage calculation: your EAVs / (your EAVs + gaps)
    const yourCoverage = ownNodes.length > 0
      ? Math.round((ownNodes.length / (ownNodes.length + gapNodes.length)) * 100)
      : 0;

    // Average competitor coverage
    const avgCompetitorCoverage = gapNodes.length > 0
      ? Math.round(gapNodes.reduce((sum, n) => sum + n.competitorCount, 0) / gapNodes.length)
      : 0;

    console.log('[useCompetitorGapNetwork] Network created:', {
      nodes: allNodes.length,
      edges: edges.length,
      clusters: clusters?.length || 0,
      gaps: totalGaps,
      coverage: yourCoverage
    });

    return {
      nodes: allNodes,
      edges,
      metrics: {
        totalGaps,
        highPriorityGaps,
        yourCoverage,
        avgCompetitorCoverage,
        centralEntity: input.centralEntity,
        competitors: Array.from(allCompetitorUrls)
      },
      clusters
    };
  }, [input, minCompetitorCount, maxNodes, edgeDistanceThreshold, showCompetitorEAVs]);

  // Helper functions
  const getNodeById = useCallback(
    (id: string): GapNode | undefined => {
      return network.nodes.find(n => n.id === id);
    },
    [network.nodes]
  );

  const getNodeEdges = useCallback(
    (nodeId: string): GapEdge[] => {
      return network.edges.filter(e => e.source === nodeId || e.target === nodeId);
    },
    [network.edges]
  );

  const getGapNodes = useCallback(
    (): GapNode[] => {
      return network.nodes.filter(n => n.type === 'gap');
    },
    [network.nodes]
  );

  const getYourNodes = useCallback(
    (): GapNode[] => {
      return network.nodes.filter(n => n.type === 'your_eav');
    },
    [network.nodes]
  );

  const getNodesByPriority = useCallback(
    (priority: 'high' | 'medium' | 'low'): GapNode[] => {
      return network.nodes.filter(n => n.priority === priority);
    },
    [network.nodes]
  );

  const recalculate = useCallback(
    (newOptions: UseCompetitorGapNetworkOptions) => {
      setCurrentOptions(newOptions);
    },
    []
  );

  return {
    network,
    isTransforming: false, // Synchronous for now
    error: null,
    getNodeById,
    getNodeEdges,
    getGapNodes,
    getYourNodes,
    getNodesByPriority,
    recalculate
  };
}

export default useCompetitorGapNetwork;
