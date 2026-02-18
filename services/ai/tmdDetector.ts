// services/ai/tmdDetector.ts

/**
 * TMD Detector (Topical Map Depth)
 *
 * Identifies topical map skew — when the map is deeper in some clusters
 * than others, indicating unbalanced coverage. Suggests redistribution
 * to improve overall topical authority.
 *
 * TMD = max(cluster_depth) / min(cluster_depth)
 * Ideal TMD ratio: < 2.0 (no cluster is 2x deeper than another)
 */

export interface ClusterDepthInfo {
  /** Cluster/pillar name */
  clusterName: string;
  /** Number of topics in this cluster */
  topicCount: number;
  /** Maximum depth level (root=0, subtopic=1, sub-subtopic=2...) */
  maxDepth: number;
  /** Average depth of topics */
  avgDepth: number;
  /** Topics at each depth level */
  depthDistribution: Record<number, number>;
}

export interface TMDReport {
  /** TMD ratio (max depth / min depth) */
  tmdRatio: number;
  /** Is the map balanced? (ratio < 2.0) */
  isBalanced: boolean;
  /** Overall map depth */
  overallDepth: number;
  /** Per-cluster depth analysis */
  clusters: ClusterDepthInfo[];
  /** Clusters that are too shallow */
  shallowClusters: string[];
  /** Clusters that are too deep */
  deepClusters: string[];
  /** Suggestions for rebalancing */
  suggestions: string[];
}

export interface TopicNode {
  /** Topic name */
  name: string;
  /** Parent topic (null for root) */
  parent?: string | null;
  /** Cluster/pillar this topic belongs to */
  cluster: string;
  /** Depth level */
  depth?: number;
}

export class TMDDetector {
  /**
   * Analyze topical map depth distribution.
   */
  static analyze(topics: TopicNode[]): TMDReport {
    // Calculate depth for each topic
    const topicsWithDepth = this.calculateDepths(topics);

    // Group by cluster
    const clusterMap = new Map<string, TopicNode[]>();
    for (const topic of topicsWithDepth) {
      const cluster = topic.cluster || 'Uncategorized';
      if (!clusterMap.has(cluster)) {
        clusterMap.set(cluster, []);
      }
      clusterMap.get(cluster)!.push(topic);
    }

    // Calculate per-cluster depth info
    const clusters: ClusterDepthInfo[] = [];
    for (const [name, clusterTopics] of clusterMap) {
      const depths = clusterTopics.map(t => t.depth || 0);
      const maxDepth = Math.max(...depths, 0);
      const avgDepth = depths.length > 0
        ? depths.reduce((s, d) => s + d, 0) / depths.length
        : 0;

      const depthDistribution: Record<number, number> = {};
      for (const d of depths) {
        depthDistribution[d] = (depthDistribution[d] || 0) + 1;
      }

      clusters.push({
        clusterName: name,
        topicCount: clusterTopics.length,
        maxDepth,
        avgDepth: Math.round(avgDepth * 10) / 10,
        depthDistribution,
      });
    }

    // Calculate TMD ratio
    const maxClusterDepths = clusters.map(c => c.maxDepth);
    const maxDepth = Math.max(...maxClusterDepths, 1);
    const minDepth = Math.max(Math.min(...maxClusterDepths), 1);
    const tmdRatio = Math.round((maxDepth / minDepth) * 10) / 10;

    // Identify shallow and deep clusters
    const avgClusterDepth = clusters.reduce((s, c) => s + c.maxDepth, 0) / (clusters.length || 1);
    const shallowClusters = clusters
      .filter(c => c.maxDepth < avgClusterDepth * 0.5)
      .map(c => c.clusterName);
    const deepClusters = clusters
      .filter(c => c.maxDepth > avgClusterDepth * 1.5)
      .map(c => c.clusterName);

    // Generate suggestions
    const suggestions: string[] = [];
    if (tmdRatio > 2.0) {
      suggestions.push(`TMD ratio ${tmdRatio} exceeds 2.0. Map is unbalanced.`);
    }
    for (const shallow of shallowClusters) {
      suggestions.push(`Cluster "${shallow}" needs more depth. Add subtopics to match other clusters.`);
    }
    for (const deep of deepClusters) {
      suggestions.push(`Cluster "${deep}" may be over-developed. Consider redistributing some subtopics.`);
    }

    // Topic count imbalance
    const avgTopicCount = topics.length / (clusters.length || 1);
    for (const cluster of clusters) {
      if (cluster.topicCount < avgTopicCount * 0.3) {
        suggestions.push(`Cluster "${cluster.clusterName}" has only ${cluster.topicCount} topics (avg: ${Math.round(avgTopicCount)}). Expand coverage.`);
      }
    }

    return {
      tmdRatio,
      isBalanced: tmdRatio <= 2.0,
      overallDepth: maxDepth,
      clusters,
      shallowClusters,
      deepClusters,
      suggestions,
    };
  }

  /**
   * Calculate depth for each topic based on parent relationships.
   */
  private static calculateDepths(topics: TopicNode[]): TopicNode[] {
    const topicMap = new Map<string, TopicNode>();
    for (const topic of topics) {
      topicMap.set(topic.name.toLowerCase(), { ...topic });
    }

    const getDepth = (name: string, visited: Set<string> = new Set()): number => {
      if (visited.has(name)) return 0; // Circular reference protection
      visited.add(name);

      const topic = topicMap.get(name.toLowerCase());
      if (!topic || !topic.parent) return 0;

      return 1 + getDepth(topic.parent, visited);
    };

    return topics.map(topic => ({
      ...topic,
      depth: getDepth(topic.name),
    }));
  }
}
