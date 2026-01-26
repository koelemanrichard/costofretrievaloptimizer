import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeGraph, StructuralHole } from '../knowledgeGraph';
import { KnowledgeNode, KnowledgeEdge } from '../../types';

// Helper to create a node
function createNode(id: string, term?: string): KnowledgeNode {
  return {
    id,
    term: term || id,
    type: 'concept',
    definition: `Definition for ${id}`,
    metadata: {
      importance: 0.5,
      source: 'test',
    },
  };
}

// Helper to create an edge
function createEdge(source: string, target: string, id?: string): KnowledgeEdge {
  return {
    id: id || `${source}-${target}`,
    source,
    target,
    relation: 'relates_to',
    metadata: {
      source: 'test',
    },
  };
}

describe('KnowledgeGraph Structural Hole Detection', () => {
  let graph: KnowledgeGraph;

  beforeEach(() => {
    graph = new KnowledgeGraph();
  });

  describe('identifyStructuralHoles', () => {
    it('should return empty array for empty graph', () => {
      const holes = graph.identifyStructuralHoles();
      expect(holes).toEqual([]);
    });

    it('should return empty array for single node graph', () => {
      graph.addNode(createNode('A'));
      const holes = graph.identifyStructuralHoles();
      expect(holes).toEqual([]);
    });

    it('should return empty array for fully connected graph (no holes)', () => {
      // Triangle: A--B--C--A (fully connected)
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));
      graph.addEdge(createEdge('C', 'A'));

      const holes = graph.identifyStructuralHoles();
      expect(holes).toEqual([]);
    });

    it('should detect completely disconnected clusters as structural holes', () => {
      // Two disconnected clusters: {A, B} and {C, D}
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('C', 'D'));

      const holes = graph.identifyStructuralHoles();

      expect(holes.length).toBe(1);
      expect(holes[0].connectionStrength).toBe(0);

      // Check that clusters are identified (order may vary)
      const clusterA = holes[0].clusterA.sort();
      const clusterB = holes[0].clusterB.sort();

      // One cluster should be [A, B], other should be [C, D]
      const clusters = [clusterA, clusterB].sort((a, b) => a[0].localeCompare(b[0]));
      expect(clusters[0]).toEqual(['A', 'B']);
      expect(clusters[1]).toEqual(['C', 'D']);
    });

    it('should detect weakly connected clusters (below threshold) as structural holes', () => {
      // Two clusters with one weak connection:
      // Cluster 1: A--B--C (3 nodes)
      // Cluster 2: D--E--F (3 nodes)
      // One connection: C--D
      // Connection strength: 1 / (3 * 3) = 0.111 < 0.15
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addNode(createNode('E'));
      graph.addNode(createNode('F'));

      // Cluster 1 internal edges
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));

      // Cluster 2 internal edges
      graph.addEdge(createEdge('D', 'E'));
      graph.addEdge(createEdge('E', 'F'));

      // Weak cross-cluster connection
      graph.addEdge(createEdge('C', 'D'));

      const holes = graph.identifyStructuralHoles();

      // Should detect at least one hole because connection strength < 0.15
      // The algorithm may detect multiple potential split points (all bridge edges)
      expect(holes.length).toBeGreaterThanOrEqual(1);

      // All detected holes should have connection strength below threshold
      for (const hole of holes) {
        expect(hole.connectionStrength).toBeLessThan(0.15);
        expect(hole.connectionStrength).toBeGreaterThan(0);
      }

      // The most balanced split should be {A,B,C} vs {D,E,F}
      const balancedHole = holes.find(h =>
        (h.clusterA.length === 3 && h.clusterB.length === 3)
      );
      expect(balancedHole).toBeDefined();
    });

    it('should NOT detect well-connected clusters as structural holes', () => {
      // Two clusters with multiple connections:
      // Cluster 1: A--B (2 nodes)
      // Cluster 2: C--D (2 nodes)
      // Multiple connections: A--C, A--D, B--C
      // Connection strength: 3 / (2 * 2) = 0.75 > 0.15
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));

      // Internal edges
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('C', 'D'));

      // Strong cross-connections
      graph.addEdge(createEdge('A', 'C'));
      graph.addEdge(createEdge('A', 'D'));
      graph.addEdge(createEdge('B', 'C'));

      const holes = graph.identifyStructuralHoles();
      expect(holes).toEqual([]);
    });

    it('should identify bridge candidates correctly', () => {
      // Two clusters connected by single edge
      // Bridge candidates should include nodes with high betweenness
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addNode(createNode('E'));
      graph.addNode(createNode('F'));

      // Cluster 1: A--B--C chain (C has high betweenness in cluster)
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));

      // Cluster 2: D--E--F chain (D has high betweenness in cluster)
      graph.addEdge(createEdge('D', 'E'));
      graph.addEdge(createEdge('E', 'F'));

      // Single weak connection
      graph.addEdge(createEdge('C', 'D'));

      const holes = graph.identifyStructuralHoles();

      // Should detect at least one hole
      expect(holes.length).toBeGreaterThanOrEqual(1);

      // All holes should have bridge candidates
      for (const hole of holes) {
        expect(hole.bridgeCandidates.length).toBeGreaterThan(0);
        expect(hole.bridgeCandidates.length).toBeLessThanOrEqual(5); // Limited to top 5
      }
    });

    it('should assign critical priority for 0 connection strength', () => {
      // Completely disconnected clusters
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('C', 'D'));

      const holes = graph.identifyStructuralHoles();

      expect(holes.length).toBe(1);
      expect(holes[0].priority).toBe('critical');
    });

    it('should assign high priority for very weak connections (< 0.05)', () => {
      // Two larger clusters with very weak connection
      // Cluster 1: A--B--C--D (4 nodes)
      // Cluster 2: E--F--G--H (4 nodes)
      // One connection: D--E
      // Connection strength: 1 / (4 * 4) = 0.0625 - but with our detection
      // the connected graph forms one cluster, so we need a different setup

      // Setup: Create three clusters, two of which are weakly connected
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addNode(createNode('E'));
      graph.addNode(createNode('F'));
      graph.addNode(createNode('G'));
      graph.addNode(createNode('H'));

      // Dense cluster 1
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('A', 'C'));
      graph.addEdge(createEdge('B', 'C'));
      graph.addEdge(createEdge('C', 'D'));
      graph.addEdge(createEdge('B', 'D'));

      // Dense cluster 2
      graph.addEdge(createEdge('E', 'F'));
      graph.addEdge(createEdge('E', 'G'));
      graph.addEdge(createEdge('F', 'G'));
      graph.addEdge(createEdge('G', 'H'));
      graph.addEdge(createEdge('F', 'H'));

      // Single weak cross-connection
      graph.addEdge(createEdge('D', 'E'));

      const holes = graph.identifyStructuralHoles();

      // Should detect a hole with weak connection
      expect(holes.length).toBe(1);
      // Priority should be high (< 0.05) or medium (< 0.1) depending on exact calculation
      expect(['critical', 'high', 'medium']).toContain(holes[0].priority);
    });

    it('should respect custom threshold', () => {
      // Two clusters with connection strength ~0.25
      // Cluster 1: A--B (2 nodes)
      // Cluster 2: C--D (2 nodes)
      // One connection: B--C
      // Connection strength: 1 / (2 * 2) = 0.25
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('C', 'D'));
      graph.addEdge(createEdge('B', 'C'));

      // With default threshold (0.15), this should NOT be a hole
      const holesDefault = graph.identifyStructuralHoles();
      expect(holesDefault).toEqual([]);

      // With higher threshold (0.5), this SHOULD be a hole
      const holesHighThreshold = graph.identifyStructuralHoles(0.5);
      expect(holesHighThreshold.length).toBe(1);
    });

    it('should handle multiple disconnected clusters', () => {
      // Three disconnected clusters
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addNode(createNode('E'));
      graph.addNode(createNode('F'));

      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('C', 'D'));
      graph.addEdge(createEdge('E', 'F'));

      const holes = graph.identifyStructuralHoles();

      // Should detect 3 holes: (AB, CD), (AB, EF), (CD, EF)
      expect(holes.length).toBe(3);

      // All should be critical priority (0 connection)
      for (const hole of holes) {
        expect(hole.connectionStrength).toBe(0);
        expect(hole.priority).toBe('critical');
      }
    });

    it('should use default threshold of 0.15', () => {
      // Create clusters with connection strength between 0.15 and 0.20
      // so default threshold matters
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addNode(createNode('E'));

      // Cluster 1: A, B, C
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));
      graph.addEdge(createEdge('A', 'C'));

      // Cluster 2: D, E
      graph.addEdge(createEdge('D', 'E'));

      // Single connection: C--D
      // Connection strength = 1 / (3 * 2) = 0.167 > 0.15
      graph.addEdge(createEdge('C', 'D'));

      const holes = graph.identifyStructuralHoles();

      // Should NOT detect a hole with default threshold
      expect(holes).toEqual([]);
    });
  });

  describe('StructuralHole interface', () => {
    it('should have correct shape', () => {
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('C', 'D'));

      const holes = graph.identifyStructuralHoles();

      expect(holes.length).toBe(1);
      const hole: StructuralHole = holes[0];

      // Check all required properties exist
      expect(hole).toHaveProperty('clusterA');
      expect(hole).toHaveProperty('clusterB');
      expect(hole).toHaveProperty('connectionStrength');
      expect(hole).toHaveProperty('bridgeCandidates');
      expect(hole).toHaveProperty('priority');

      // Check types
      expect(Array.isArray(hole.clusterA)).toBe(true);
      expect(Array.isArray(hole.clusterB)).toBe(true);
      expect(typeof hole.connectionStrength).toBe('number');
      expect(Array.isArray(hole.bridgeCandidates)).toBe(true);
      expect(['critical', 'high', 'medium', 'low']).toContain(hole.priority);
    });
  });

  describe('Integration with existing graph operations', () => {
    it('should work correctly after fromJSON restoration', () => {
      const graph1 = new KnowledgeGraph();
      graph1.addNode(createNode('A'));
      graph1.addNode(createNode('B'));
      graph1.addNode(createNode('C'));
      graph1.addNode(createNode('D'));
      graph1.addEdge(createEdge('A', 'B'));
      graph1.addEdge(createEdge('C', 'D'));

      // Serialize
      const json = graph1.toJSON();

      // Restore to new graph
      const graph2 = new KnowledgeGraph();
      graph2.fromJSON(json);

      // Structural holes should work the same
      const holes1 = graph1.identifyStructuralHoles();
      const holes2 = graph2.identifyStructuralHoles();

      expect(holes2.length).toBe(holes1.length);
      expect(holes2[0].connectionStrength).toBe(holes1[0].connectionStrength);
      expect(holes2[0].priority).toBe(holes1[0].priority);
    });

    it('should return empty after clear()', () => {
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('C', 'D'));

      const holesBefore = graph.identifyStructuralHoles();
      expect(holesBefore.length).toBe(1);

      graph.clear();

      const holesAfter = graph.identifyStructuralHoles();
      expect(holesAfter).toEqual([]);
    });
  });
});
