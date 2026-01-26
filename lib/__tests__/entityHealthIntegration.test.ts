import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeGraph, StructuralHole } from '../knowledgeGraph';
import { calculateCriticalityScore, EntityCriticalityInput } from '../entityCriticality';
import { extractEntitiesFromEAVs } from '../../services/entityHealthService';
import { SemanticTriple, AttributeCategory, KnowledgeNode, KnowledgeEdge } from '../../types';

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

// Helper to create a SemanticTriple
function createSemanticTriple(
  entityLabel: string,
  attribute: string,
  value: string | number,
  category: AttributeCategory = 'COMMON'
): SemanticTriple {
  return {
    subject: {
      label: entityLabel,
      type: 'entity',
    },
    predicate: {
      relation: attribute,
      type: 'attribute',
      category,
    },
    object: {
      value,
      type: typeof value === 'number' ? 'number' : 'string',
    },
  };
}

describe('Entity Health Integration Tests', () => {
  describe('Betweenness centrality feeds into criticality calculation', () => {
    let graph: KnowledgeGraph;

    beforeEach(() => {
      graph = new KnowledgeGraph();
    });

    it('should apply bridge bonus when betweenness centrality is provided', () => {
      // Build a linear graph: A -- B -- C
      // B is the bridge node
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));

      // Calculate betweenness centrality from the graph
      const centrality = graph.calculateBetweennessCentrality();

      // B should have the highest centrality
      const centralityB = centrality.get('B') ?? 0;
      const centralityA = centrality.get('A') ?? 0;
      const centralityC = centrality.get('C') ?? 0;

      expect(centralityB).toBeGreaterThan(centralityA);
      expect(centralityB).toBeGreaterThan(centralityC);

      // Now use that centrality in criticality calculation
      const inputWithBridgeBonus: EntityCriticalityInput = {
        entityName: 'B',
        isCentralEntity: false,
        attributeCategory: 'COMMON',
        isCoreSectionEntity: false,
        topicCount: 1,
        betweennessCentrality: centralityB, // Use the calculated centrality
      };

      const inputWithoutBridgeBonus: EntityCriticalityInput = {
        entityName: 'A',
        isCentralEntity: false,
        attributeCategory: 'COMMON',
        isCoreSectionEntity: false,
        topicCount: 1,
        betweennessCentrality: centralityA, // Endpoint has lower centrality
      };

      const resultWithBridge = calculateCriticalityScore(inputWithBridgeBonus);
      const resultWithoutBridge = calculateCriticalityScore(inputWithoutBridgeBonus);

      // Bridge node should have a higher criticality score due to bridge bonus
      expect(resultWithBridge.score).toBeGreaterThan(resultWithoutBridge.score);

      // Verify the bridge bonus is applied in the breakdown
      expect(resultWithBridge.breakdown.bridgeBonus).toBeGreaterThan(0);
      expect(resultWithBridge.breakdown.bridgeBonus).toBeGreaterThan(resultWithoutBridge.breakdown.bridgeBonus);
    });

    it('should increase criticality score proportionally to betweenness centrality', () => {
      // Build a star graph where CENTER is the hub
      graph.addNode(createNode('CENTER'));
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addEdge(createEdge('CENTER', 'A'));
      graph.addEdge(createEdge('CENTER', 'B'));
      graph.addEdge(createEdge('CENTER', 'C'));
      graph.addEdge(createEdge('CENTER', 'D'));

      const centrality = graph.calculateBetweennessCentrality();
      const centerCentrality = centrality.get('CENTER') ?? 0;

      // CENTER should have normalized centrality of 1.0 (highest in graph)
      expect(centerCentrality).toBe(1.0);

      // Calculate criticality with maximum betweenness
      const input: EntityCriticalityInput = {
        entityName: 'CENTER',
        isCentralEntity: false,
        attributeCategory: 'COMMON', // Base weight: 0.4
        isCoreSectionEntity: false,
        topicCount: 1,
        betweennessCentrality: centerCentrality,
      };

      const result = calculateCriticalityScore(input);

      // Bridge bonus should be centrality * 0.3 = 1.0 * 0.3 = 0.3
      expect(result.breakdown.bridgeBonus).toBeCloseTo(0.3, 2);

      // Total score should be base (0.4) + bridge bonus (0.3) = 0.7
      expect(result.score).toBeCloseTo(0.7, 2);
    });

    it('should cap total criticality score at 1.0 when all bonuses apply', () => {
      graph.addNode(createNode('HUB'));
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addEdge(createEdge('HUB', 'A'));
      graph.addEdge(createEdge('HUB', 'B'));

      const centrality = graph.calculateBetweennessCentrality();
      const hubCentrality = centrality.get('HUB') ?? 0;

      // Create an input that would exceed 1.0 without capping
      const input: EntityCriticalityInput = {
        entityName: 'HUB',
        isCentralEntity: false,
        attributeCategory: 'UNIQUE', // Base: 0.9
        isCoreSectionEntity: true, // +0.2
        topicCount: 5, // +0.3 (max)
        betweennessCentrality: hubCentrality, // +0.3 (max)
      };

      const result = calculateCriticalityScore(input);

      // Should be capped at 1.0 even though sum exceeds it
      expect(result.score).toBe(1.0);
    });
  });

  describe('Structural hole detection', () => {
    let graph: KnowledgeGraph;

    beforeEach(() => {
      graph = new KnowledgeGraph();
    });

    it('should detect holes with connectionStrength = 0 and priority = critical for disconnected clusters', () => {
      // Build two disconnected clusters with at least 2 nodes each
      // Cluster 1: A -- B
      // Cluster 2: C -- D
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('C', 'D'));

      // Call identifyStructuralHoles with threshold 0.15
      const holes = graph.identifyStructuralHoles(0.15);

      // Should detect exactly one hole
      expect(holes.length).toBe(1);

      const hole: StructuralHole = holes[0];

      // Connection strength should be 0 (completely disconnected)
      expect(hole.connectionStrength).toBe(0);

      // Priority should be critical for 0 connection strength
      expect(hole.priority).toBe('critical');

      // Verify clusterA and clusterB contain node IDs (strings)
      expect(Array.isArray(hole.clusterA)).toBe(true);
      expect(Array.isArray(hole.clusterB)).toBe(true);
      expect(hole.clusterA.length).toBeGreaterThanOrEqual(2);
      expect(hole.clusterB.length).toBeGreaterThanOrEqual(2);

      // Check clusters contain expected nodes
      const allNodes = [...hole.clusterA, ...hole.clusterB].sort();
      expect(allNodes).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should detect multiple structural holes for multiple disconnected clusters', () => {
      // Three disconnected clusters
      // Cluster 1: A -- B
      // Cluster 2: C -- D
      // Cluster 3: E -- F
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addNode(createNode('E'));
      graph.addNode(createNode('F'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('C', 'D'));
      graph.addEdge(createEdge('E', 'F'));

      const holes = graph.identifyStructuralHoles(0.15);

      // Should detect 3 holes: (AB,CD), (AB,EF), (CD,EF)
      expect(holes.length).toBe(3);

      // All holes should have critical priority and 0 connection strength
      for (const hole of holes) {
        expect(hole.connectionStrength).toBe(0);
        expect(hole.priority).toBe('critical');
      }
    });

    it('should provide bridgeCandidates for structural holes', () => {
      // Two disconnected clusters
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('C', 'D'));

      const holes = graph.identifyStructuralHoles(0.15);

      expect(holes.length).toBe(1);

      // Bridge candidates should be an array
      expect(Array.isArray(holes[0].bridgeCandidates)).toBe(true);
    });
  });

  describe('Entity extraction from EAVs', () => {
    it('should mark the central entity correctly', () => {
      const eavs: SemanticTriple[] = [
        createSemanticTriple('Solar Panel', 'efficiency', '22%', 'UNIQUE'),
        createSemanticTriple('Solar Panel', 'material', 'Monocrystalline Silicon', 'ROOT'),
        createSemanticTriple('Inverter', 'type', 'String Inverter', 'COMMON'),
      ];

      const centralEntity = 'Solar Panel';
      const extracted = extractEntitiesFromEAVs(eavs, centralEntity);

      // Find the central entity in extracted results
      const centralExtracted = extracted.find(
        (e) => e.entityName.toLowerCase() === centralEntity.toLowerCase()
      );

      expect(centralExtracted).toBeDefined();
      expect(centralExtracted?.isCentralEntity).toBe(true);

      // Other entities should NOT be marked as central
      const inverterExtracted = extracted.find(
        (e) => e.entityName.toLowerCase() === 'inverter'
      );
      expect(inverterExtracted).toBeDefined();
      expect(inverterExtracted?.isCentralEntity).toBe(false);
    });

    it('should extract UNIQUE attribute values with correct category', () => {
      const eavs: SemanticTriple[] = [
        createSemanticTriple('Tesla Model S', 'manufacturer', 'Tesla Motors', 'UNIQUE'),
        createSemanticTriple('Tesla Model S', 'battery_type', 'Lithium-ion', 'ROOT'),
        createSemanticTriple('Tesla Model S', 'range', 405, 'RARE'),
      ];

      const centralEntity = 'Tesla Model S';
      const extracted = extractEntitiesFromEAVs(eavs, centralEntity);

      // Tesla Motors should be extracted from the UNIQUE attribute's value
      const teslaMotors = extracted.find(
        (e) => e.entityName === 'Tesla Motors'
      );

      expect(teslaMotors).toBeDefined();
      // Since Tesla Motors only appears in UNIQUE category, it should have UNIQUE category
      expect(teslaMotors?.attributeCategory).toBe('UNIQUE');
    });

    it('should assign highest priority category when entity appears in multiple triples', () => {
      const eavs: SemanticTriple[] = [
        createSemanticTriple('iPhone', 'os', 'iOS', 'COMMON'),
        createSemanticTriple('iPhone', 'processor', 'Apple Silicon', 'UNIQUE'),
        createSemanticTriple('iPhone', 'design', 'Premium', 'ROOT'),
      ];

      const centralEntity = 'iPhone';
      const extracted = extractEntitiesFromEAVs(eavs, centralEntity);

      // iPhone appears in COMMON, UNIQUE, and ROOT
      // UNIQUE has highest priority
      const iphone = extracted.find(
        (e) => e.entityName.toLowerCase() === 'iphone'
      );

      expect(iphone).toBeDefined();
      // UNIQUE should be selected as highest priority
      expect(iphone?.attributeCategory).toBe('UNIQUE');
    });

    it('should track topicCount correctly', () => {
      // Create EAVs where an entity appears in multiple "topics" (subjects)
      const eavs: SemanticTriple[] = [
        createSemanticTriple('Topic1', 'related_to', 'Shared Entity', 'UNIQUE'),
        createSemanticTriple('Topic2', 'also_related', 'Shared Entity', 'ROOT'),
        createSemanticTriple('Topic3', 'connects_to', 'Shared Entity', 'RARE'),
        createSemanticTriple('Topic1', 'has', 'Unique Value', 'COMMON'),
      ];

      const centralEntity = 'Main Topic';
      const extracted = extractEntitiesFromEAVs(eavs, centralEntity);

      // "Shared Entity" appears in 3 different topic contexts
      const sharedEntity = extracted.find(
        (e) => e.entityName === 'Shared Entity'
      );

      expect(sharedEntity).toBeDefined();
      expect(sharedEntity?.topicCount).toBe(3);

      // "Unique Value" only appears in Topic1
      const uniqueValue = extracted.find(
        (e) => e.entityName === 'Unique Value'
      );

      expect(uniqueValue).toBeDefined();
      expect(uniqueValue?.topicCount).toBe(1);
    });

    it('should track sources (topic IDs) correctly', () => {
      const eavs: SemanticTriple[] = [
        createSemanticTriple('TopicA', 'mentions', 'Entity X', 'UNIQUE'),
        createSemanticTriple('TopicB', 'references', 'Entity X', 'ROOT'),
      ];

      const extracted = extractEntitiesFromEAVs(eavs, 'Central');

      const entityX = extracted.find((e) => e.entityName === 'Entity X');

      expect(entityX).toBeDefined();
      expect(entityX?.sources).toContain('TopicA');
      expect(entityX?.sources).toContain('TopicB');
      expect(entityX?.sources.length).toBe(2);
    });

    it('should mark core section entities when coreTopicIds are provided', () => {
      const eavs: SemanticTriple[] = [
        createSemanticTriple('CoreTopic', 'has', 'Core Entity', 'UNIQUE'),
        createSemanticTriple('NonCoreTopic', 'has', 'Non-Core Entity', 'UNIQUE'),
      ];

      const coreTopicIds = ['CoreTopic'];
      const extracted = extractEntitiesFromEAVs(eavs, 'Central', coreTopicIds);

      const coreEntity = extracted.find((e) => e.entityName === 'Core Entity');
      const nonCoreEntity = extracted.find((e) => e.entityName === 'Non-Core Entity');

      expect(coreEntity?.isCoreSectionEntity).toBe(true);
      expect(nonCoreEntity?.isCoreSectionEntity).toBe(false);
    });
  });

  describe('Full integration: KG centrality to criticality to entity health', () => {
    it('should correctly flow data from KG centrality through criticality calculation', () => {
      // Build a knowledge graph
      const graph = new KnowledgeGraph();
      graph.addNode(createNode('MainTopic'));
      graph.addNode(createNode('RelatedTopic'));
      graph.addNode(createNode('BridgeConcept'));
      graph.addNode(createNode('SubTopic'));
      // MainTopic -- BridgeConcept -- RelatedTopic
      //                    |
      //               SubTopic
      graph.addEdge(createEdge('MainTopic', 'BridgeConcept'));
      graph.addEdge(createEdge('BridgeConcept', 'RelatedTopic'));
      graph.addEdge(createEdge('BridgeConcept', 'SubTopic'));

      // Get centrality
      const centrality = graph.calculateBetweennessCentrality();

      // BridgeConcept should have highest centrality (it's the hub)
      expect(centrality.get('BridgeConcept')).toBeGreaterThan(centrality.get('MainTopic')!);

      // Create EAVs that mirror the graph structure
      const eavs: SemanticTriple[] = [
        createSemanticTriple('MainTopic', 'connects_to', 'BridgeConcept', 'UNIQUE'),
        createSemanticTriple('BridgeConcept', 'links', 'RelatedTopic', 'ROOT'),
        createSemanticTriple('BridgeConcept', 'includes', 'SubTopic', 'RARE'),
      ];

      // Extract entities
      const extracted = extractEntitiesFromEAVs(eavs, 'MainTopic');

      // Find BridgeConcept
      const bridgeEntity = extracted.find((e) => e.entityName === 'BridgeConcept');
      expect(bridgeEntity).toBeDefined();

      // Calculate criticality using the betweenness centrality from the graph
      const bridgeCentrality = centrality.get('BridgeConcept') ?? 0;
      const criticalityInput: EntityCriticalityInput = {
        entityName: bridgeEntity!.entityName,
        isCentralEntity: bridgeEntity!.isCentralEntity,
        attributeCategory: bridgeEntity!.attributeCategory,
        isCoreSectionEntity: bridgeEntity!.isCoreSectionEntity,
        topicCount: bridgeEntity!.topicCount,
        betweennessCentrality: bridgeCentrality,
      };

      const criticalityResult = calculateCriticalityScore(criticalityInput);

      // Bridge entity should have a good criticality score
      expect(criticalityResult.score).toBeGreaterThan(0.5);
      expect(criticalityResult.breakdown.bridgeBonus).toBeGreaterThan(0);
    });
  });
});
