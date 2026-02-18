import { KnowledgeNode, KnowledgeEdge, AttributeCategory } from '../types';

export interface KnowledgeGap {
    entityId: string;
    entityTerm: string;
    missingCategories: AttributeCategory[];
    suggestions: string[];
}

/**
 * Co-occurrence entry tracking how often two entities appear together
 */
export interface CoOccurrence {
    entityA: string;
    entityB: string;
    count: number;
    contexts: string[]; // URLs or page identifiers where they co-occur
    proximity: 'same_sentence' | 'same_section' | 'same_page';
}

/**
 * Context weight for entity positions
 */
export type EntityPosition = 'h1' | 'h2' | 'h3' | 'body' | 'alt_text' | 'meta';

export interface EntityContext {
    entityId: string;
    position: EntityPosition;
    pageUrl: string;
    weight: number;
}

/**
 * Full semantic distance result
 */
export interface SemanticDistanceResult {
    distance: number;           // 0-1, where 0 = identical, 1 = completely different
    cosineSimilarity: number;   // Base similarity from shared neighbors
    contextWeight: number;      // Weight based on entity positions
    coOccurrenceScore: number;  // Score based on co-occurrence frequency
    shouldLink: boolean;        // Whether pages should be linked (0.3-0.7 sweet spot)
    linkingRecommendation: string;
}

/**
 * Structural hole between topic clusters.
 * Represents gaps where connection strength is below threshold,
 * indicating opportunities for bridge content.
 */
export interface StructuralHole {
    clusterA: string[];           // Node IDs in first cluster
    clusterB: string[];           // Node IDs in second cluster
    connectionStrength: number;   // 0-1 score (cross-edges / (|clusterA| * |clusterB|))
    bridgeCandidates: string[];   // Entities that could bridge the gap
    priority: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Snapshot of graph state at a point in time.
 * Used as a baseline for drift detection.
 */
export interface GraphSnapshot {
    timestamp: number;
    entityIds: Set<string>;
    entityTerms: Map<string, string>;
    edgeKeys: Set<string>;         // Composite keys: "source::target::relation"
    edgeIds: Set<string>;
    nodeCount: number;
    edgeCount: number;
}

/**
 * Result of comparing the current graph state against a baseline snapshot.
 */
export interface GraphDriftResult {
    baselineTimestamp: number;
    currentTimestamp: number;
    addedEntities: Array<{ id: string; term: string }>;
    removedEntities: Array<{ id: string; term: string }>;
    addedEdges: Array<{ source: string; target: string; relation: string }>;
    removedEdges: Array<{ source: string; target: string; relation: string }>;
    orphanedEntities: Array<{ id: string; term: string }>;
    /** Overall drift score: 0 = no drift, 100 = completely different */
    driftScore: number;
    /** Entity-only drift score (0-100) */
    entityDrift: number;
    /** Edge-only drift score (0-100) */
    edgeDrift: number;
    /** Summary counts for quick overview */
    summary: {
        entitiesAdded: number;
        entitiesRemoved: number;
        edgesAdded: number;
        edgesRemoved: number;
        orphanedCount: number;
        baselineNodeCount: number;
        baselineEdgeCount: number;
        currentNodeCount: number;
        currentEdgeCount: number;
    };
}

// Position weights for context calculation
const POSITION_WEIGHTS: Record<EntityPosition, number> = {
    h1: 1.0,
    h2: 0.8,
    h3: 0.6,
    body: 0.4,
    alt_text: 0.5,  // Vocabulary extension bonus
    meta: 0.3
};

export class KnowledgeGraph {
    private nodes: Map<string, KnowledgeNode> = new Map();
    private edges: Map<string, KnowledgeEdge> = new Map();

    // Co-occurrence tracking
    private coOccurrences: Map<string, CoOccurrence> = new Map();

    // Entity context tracking (position weights per entity per page)
    private entityContexts: Map<string, EntityContext[]> = new Map();

    // Cached betweenness centrality scores (invalidated on graph changes)
    private centralityCache: Map<string, number> | null = null;

    constructor() {
        // Initialize empty graph
    }

    // ==========================================================================
    // CO-OCCURRENCE TRACKING
    // ==========================================================================

    /**
     * Record a co-occurrence between two entities.
     * Call this when entities appear together in content.
     */
    addCoOccurrence(
        entityA: string,
        entityB: string,
        context: string,
        proximity: CoOccurrence['proximity'] = 'same_page'
    ): void {
        // Normalize key (alphabetically sorted to avoid duplicates)
        const key = [entityA.toLowerCase(), entityB.toLowerCase()].sort().join('::');

        const existing = this.coOccurrences.get(key);
        if (existing) {
            existing.count++;
            if (!existing.contexts.includes(context)) {
                existing.contexts.push(context);
            }
            // Upgrade proximity if closer
            if (proximity === 'same_sentence') {
                existing.proximity = 'same_sentence';
            } else if (proximity === 'same_section' && existing.proximity === 'same_page') {
                existing.proximity = 'same_section';
            }
        } else {
            this.coOccurrences.set(key, {
                entityA: entityA.toLowerCase(),
                entityB: entityB.toLowerCase(),
                count: 1,
                contexts: [context],
                proximity
            });
        }
    }

    /**
     * Get co-occurrence score between two entities.
     * Returns a value between 0 and 1.
     */
    getCoOccurrenceScore(entityA: string, entityB: string): number {
        const key = [entityA.toLowerCase(), entityB.toLowerCase()].sort().join('::');
        const coOcc = this.coOccurrences.get(key);

        if (!coOcc) return 0.5; // Default neutral score

        // Base score from count (log scale to prevent runaway values)
        const countScore = Math.min(1, Math.log10(coOcc.count + 1) / 2);

        // Proximity multiplier
        const proximityMultiplier =
            coOcc.proximity === 'same_sentence' ? 1.0 :
            coOcc.proximity === 'same_section' ? 0.7 : 0.4;

        // Scale to 0.5-1.0 range (0.5 = no co-occurrence, 1.0 = strong co-occurrence)
        return 0.5 + (countScore * proximityMultiplier * 0.5);
    }

    /**
     * Get all co-occurrences for an entity.
     */
    getCoOccurrencesForEntity(entity: string): CoOccurrence[] {
        const results: CoOccurrence[] = [];
        const entityLower = entity.toLowerCase();

        for (const coOcc of this.coOccurrences.values()) {
            if (coOcc.entityA === entityLower || coOcc.entityB === entityLower) {
                results.push(coOcc);
            }
        }

        return results;
    }

    // ==========================================================================
    // ENTITY CONTEXT TRACKING
    // ==========================================================================

    /**
     * Track entity position in content.
     * Call this when extracting entities from content to record their position.
     */
    addEntityContext(
        entityId: string,
        position: EntityPosition,
        pageUrl: string
    ): void {
        const key = entityId.toLowerCase();
        const contexts = this.entityContexts.get(key) || [];

        // Check if we already have this context
        const existing = contexts.find(
            c => c.pageUrl === pageUrl && c.position === position
        );

        if (!existing) {
            contexts.push({
                entityId: key,
                position,
                pageUrl,
                weight: POSITION_WEIGHTS[position]
            });
            this.entityContexts.set(key, contexts);
        }
    }

    /**
     * Calculate context weight for an entity.
     * Higher weight = more prominent position in content.
     */
    calculateContextWeight(entity: string): number {
        const contexts = this.entityContexts.get(entity.toLowerCase()) || [];

        if (contexts.length === 0) return 0.5; // Default neutral weight

        // Average weight across all contexts, with a boost for variety
        const totalWeight = contexts.reduce((sum, c) => sum + c.weight, 0);
        const avgWeight = totalWeight / contexts.length;

        // Bonus for appearing in multiple positions
        const uniquePositions = new Set(contexts.map(c => c.position)).size;
        const varietyBonus = Math.min(uniquePositions * 0.1, 0.3);

        return Math.min(1, avgWeight + varietyBonus);
    }

    /**
     * Get combined context weight for two entities.
     */
    getCombinedContextWeight(entityA: string, entityB: string): number {
        const weightA = this.calculateContextWeight(entityA);
        const weightB = this.calculateContextWeight(entityB);

        // Geometric mean for balanced weighting
        return Math.sqrt(weightA * weightB);
    }

    // ==========================================================================
    // FULL SEMANTIC DISTANCE CALCULATION
    // ==========================================================================

    /**
     * Calculate full semantic distance between two entities.
     *
     * Formula: Distance = 1 - (CosineSimilarity × ContextWeight × CoOccurrence)
     *
     * This provides a more nuanced measure than simple similarity:
     * - 0.0-0.2: Nearly identical or duplicate topics (cannibalization risk)
     * - 0.3-0.7: Sweet spot for internal linking
     * - 0.8-1.0: Too different to link meaningfully
     */
    calculateSemanticDistance(entityA: string, entityB: string): SemanticDistanceResult {
        // Get base similarity (using existing method, scaled to 0-1)
        const cosineSimilarity = this.semanticSimilarity(entityA, entityB);

        // Get context weight
        const contextWeight = this.getCombinedContextWeight(entityA, entityB);

        // Get co-occurrence score
        const coOccurrenceScore = this.getCoOccurrenceScore(entityA, entityB);

        // Calculate distance using the full formula
        const combinedScore = cosineSimilarity * contextWeight * coOccurrenceScore;
        const distance = 1 - combinedScore;

        // Determine linking recommendation
        const shouldLink = distance >= 0.3 && distance <= 0.7;
        let linkingRecommendation: string;

        if (distance < 0.2) {
            linkingRecommendation = 'Cannibalization risk - too similar, consider merging';
        } else if (distance < 0.3) {
            linkingRecommendation = 'Very closely related - use sparingly to avoid over-linking';
        } else if (distance < 0.5) {
            linkingRecommendation = 'Strongly related - ideal for contextual linking';
        } else if (distance < 0.7) {
            linkingRecommendation = 'Moderately related - good for supporting links';
        } else if (distance < 0.85) {
            linkingRecommendation = 'Loosely related - link only if highly relevant';
        } else {
            linkingRecommendation = 'Too different - avoid linking';
        }

        return {
            distance: Math.round(distance * 100) / 100,
            cosineSimilarity: Math.round(cosineSimilarity * 100) / 100,
            contextWeight: Math.round(contextWeight * 100) / 100,
            coOccurrenceScore: Math.round(coOccurrenceScore * 100) / 100,
            shouldLink,
            linkingRecommendation
        };
    }

    /**
     * Find entities that are good linking candidates for a given entity.
     * Returns entities in the "sweet spot" distance range (0.3-0.7).
     */
    findLinkingCandidates(entity: string): Array<{
        entity: string;
        distance: SemanticDistanceResult;
    }> {
        const candidates: Array<{ entity: string; distance: SemanticDistanceResult }> = [];
        const entityLower = entity.toLowerCase();

        for (const node of this.nodes.values()) {
            if (node.id.toLowerCase() === entityLower || node.term.toLowerCase() === entityLower) {
                continue; // Skip self
            }

            const distanceResult = this.calculateSemanticDistance(entity, node.term);

            if (distanceResult.shouldLink) {
                candidates.push({
                    entity: node.term,
                    distance: distanceResult
                });
            }
        }

        // Sort by distance (prefer middle of range)
        candidates.sort((a, b) => {
            const aDiff = Math.abs(a.distance.distance - 0.5);
            const bDiff = Math.abs(b.distance.distance - 0.5);
            return aDiff - bDiff;
        });

        return candidates;
    }

    /**
     * Identify potential cannibalization issues.
     * Returns pairs of entities that are too similar (distance < 0.2).
     */
    identifyCannibalizationRisks(): Array<{
        entityA: string;
        entityB: string;
        distance: number;
        recommendation: string;
    }> {
        const risks: Array<{
            entityA: string;
            entityB: string;
            distance: number;
            recommendation: string;
        }> = [];

        const nodeArray = Array.from(this.nodes.values());

        for (let i = 0; i < nodeArray.length; i++) {
            for (let j = i + 1; j < nodeArray.length; j++) {
                const distanceResult = this.calculateSemanticDistance(
                    nodeArray[i].term,
                    nodeArray[j].term
                );

                if (distanceResult.distance < 0.2) {
                    risks.push({
                        entityA: nodeArray[i].term,
                        entityB: nodeArray[j].term,
                        distance: distanceResult.distance,
                        recommendation: distanceResult.linkingRecommendation
                    });
                }
            }
        }

        // Sort by distance (lowest first = highest risk)
        risks.sort((a, b) => a.distance - b.distance);

        return risks;
    }

    /**
     * Build semantic distance matrix for all entities.
     * Useful for clustering and visualization.
     */
    buildDistanceMatrix(): {
        entities: string[];
        matrix: number[][];
        linkMatrix: boolean[][];
    } {
        const nodeArray = Array.from(this.nodes.values());
        const entities = nodeArray.map(n => n.term);
        const matrix: number[][] = [];
        const linkMatrix: boolean[][] = [];

        for (let i = 0; i < nodeArray.length; i++) {
            matrix[i] = [];
            linkMatrix[i] = [];
            for (let j = 0; j < nodeArray.length; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                    linkMatrix[i][j] = false;
                } else {
                    const result = this.calculateSemanticDistance(
                        nodeArray[i].term,
                        nodeArray[j].term
                    );
                    matrix[i][j] = result.distance;
                    linkMatrix[i][j] = result.shouldLink;
                }
            }
        }

        return { entities, matrix, linkMatrix };
    }

    addNode(node: KnowledgeNode) {
        this.nodes.set(node.id, node);
        this.centralityCache = null; // Invalidate cache
    }

    addEdge(edge: KnowledgeEdge) {
        this.edges.set(edge.id, edge);
        this.centralityCache = null; // Invalidate cache
    }

    getNode(termOrId: string): KnowledgeNode | undefined {
        // First, try to get by ID, which is the primary key.
        if (this.nodes.has(termOrId)) {
            return this.nodes.get(termOrId);
        }
        // As a fallback, search by term. This is less efficient but robust.
        for (const node of this.nodes.values()) {
            if (node.term.toLowerCase() === termOrId.toLowerCase()) {
                return node;
            }
        }
        return undefined;
    }


    getNodes(): Map<string, KnowledgeNode> {
        return this.nodes;
    }

    getEdges(): Map<string, KnowledgeEdge> {
        return this.edges;
    }

    /**
     * Get all neighboring node IDs for a given term.
     * Neighbors are nodes connected by an edge (in either direction).
     */
    getNeighbors(termOrId: string): string[] {
        const node = this.getNode(termOrId);
        if (!node) return [];

        const neighborIds = new Set<string>();

        for (const edge of this.edges.values()) {
            if (edge.source === node.id) {
                neighborIds.add(edge.target);
            } else if (edge.target === node.id) {
                neighborIds.add(edge.source);
            }
        }

        return Array.from(neighborIds);
    }

    /**
     * Get all edges connected to a specific node.
     */
    getEdgesForNode(termOrId: string): KnowledgeEdge[] {
        const node = this.getNode(termOrId);
        if (!node) return [];

        const nodeEdges: KnowledgeEdge[] = [];

        for (const edge of this.edges.values()) {
            if (edge.source === node.id || edge.target === node.id) {
                nodeEdges.push(edge);
            }
        }

        return nodeEdges;
    }

    /**
     * Get edges grouped by their category (ROOT, UNIQUE, RARE, COMMON).
     */
    getEdgesByCategory(): Map<AttributeCategory | 'UNCATEGORIZED', KnowledgeEdge[]> {
        const categorized = new Map<AttributeCategory | 'UNCATEGORIZED', KnowledgeEdge[]>();

        for (const edge of this.edges.values()) {
            const category = edge.metadata?.category || 'UNCATEGORIZED';
            if (!categorized.has(category)) {
                categorized.set(category, []);
            }
            categorized.get(category)!.push(edge);
        }

        return categorized;
    }

    // Example high-level methods
    areConnected(term1: string, term2: string): boolean {
        const node1 = this.getNode(term1);
        const node2 = this.getNode(term2);
        if (!node1 || !node2) return false;

        for (const edge of this.edges.values()) {
            if ((edge.source === node1.id && edge.target === node2.id) ||
                (edge.source === node2.id && edge.target === node1.id)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Calculate semantic similarity between two terms using Jaccard similarity
     * based on shared neighbors in the knowledge graph.
     *
     * Returns a value between 0 and 1:
     * - 1.0: Same term
     * - 0.9: Directly connected
     * - 0.3-0.8: Based on shared neighbors (Jaccard coefficient)
     * - 0.2: Same type but no connection
     * - 0.1: Different types, no connection
     * - 0.0: One or both terms not found
     */
    semanticSimilarity(term1: string, term2: string): number {
        const node1 = this.getNode(term1);
        const node2 = this.getNode(term2);

        // If either term is not found, return 0
        if (!node1 || !node2) return 0;

        // Same term = perfect similarity
        if (node1.id === node2.id || term1.toLowerCase() === term2.toLowerCase()) {
            return 1.0;
        }

        // Direct connection = high similarity
        if (this.areConnected(term1, term2)) {
            return 0.9;
        }

        // Calculate Jaccard similarity based on shared neighbors
        const neighbors1 = this.getNeighbors(term1);
        const neighbors2 = this.getNeighbors(term2);

        if (neighbors1.length > 0 || neighbors2.length > 0) {
            const intersection = neighbors1.filter(n => neighbors2.includes(n));
            const unionSet = new Set([...neighbors1, ...neighbors2]);

            if (unionSet.size > 0) {
                // Jaccard coefficient: |A ∩ B| / |A ∪ B|
                const jaccard = intersection.length / unionSet.size;
                // Scale to 0.3-0.8 range for Jaccard-based similarity
                return 0.3 + (0.5 * jaccard);
            }
        }

        // Same type but no connection = weak similarity
        if (node1.type && node2.type && node1.type.toLowerCase() === node2.type.toLowerCase()) {
            return 0.2;
        }

        // No relationship found
        return 0.1;
    }

    /**
     * Identify knowledge gaps by analyzing which entity types are missing
     * key attribute categories (ROOT, UNIQUE, RARE).
     *
     * Returns gaps for entities that are missing important attribute coverage.
     */
    identifyKnowledgeGaps(): KnowledgeGap[] {
        if (this.nodes.size === 0) {
            return [];
        }

        const gaps: KnowledgeGap[] = [];
        const requiredCategories: AttributeCategory[] = ['ROOT', 'UNIQUE', 'RARE'];

        // Find all "subject" nodes (nodes that have outgoing edges)
        const subjectNodeIds = new Set<string>();
        for (const edge of this.edges.values()) {
            subjectNodeIds.add(edge.source);
        }

        // Analyze each subject node for category coverage
        for (const nodeId of subjectNodeIds) {
            const node = this.nodes.get(nodeId);
            if (!node) continue;

            const nodeEdges = this.getEdgesForNode(nodeId);
            const coveredCategories = new Set<AttributeCategory>();

            for (const edge of nodeEdges) {
                if (edge.source === nodeId && edge.metadata?.category) {
                    coveredCategories.add(edge.metadata.category);
                }
            }

            // Find missing categories
            const missingCategories = requiredCategories.filter(
                cat => !coveredCategories.has(cat)
            );

            if (missingCategories.length > 0) {
                const suggestions = this.generateGapSuggestions(node, missingCategories);
                gaps.push({
                    entityId: nodeId,
                    entityTerm: node.term,
                    missingCategories,
                    suggestions
                });
            }
        }

        return gaps;
    }

    /**
     * Generate suggestions for missing attribute categories.
     */
    private generateGapSuggestions(node: KnowledgeNode, missingCategories: AttributeCategory[]): string[] {
        const suggestions: string[] = [];
        const entityType = node.type?.toLowerCase() || 'entity';

        for (const category of missingCategories) {
            switch (category) {
                case 'ROOT':
                    suggestions.push(`Add defining attributes for "${node.term}" (what it is, core characteristics)`);
                    break;
                case 'UNIQUE':
                    suggestions.push(`Add differentiating features for "${node.term}" (what makes it special)`);
                    break;
                case 'RARE':
                    suggestions.push(`Add detailed/technical attributes for "${node.term}" (specifications, advanced features)`);
                    break;
            }
        }

        return suggestions;
    }

    getExpectedAttributes(term: string): string[] {
        // Placeholder, this could be a sophisticated lookup or AI call
        const node = this.getNode(term);
        if(node?.type.toLowerCase() === 'software') {
            return ['features', 'pricing', 'integrations', 'use cases'];
        }
        return ['definition', 'history', 'examples'];
    }

    /**
     * Get statistics about the knowledge graph.
     */
    getStatistics(): {
        nodeCount: number;
        edgeCount: number;
        categoryDistribution: Record<string, number>;
        averageNeighbors: number;
    } {
        const categoryDistribution: Record<string, number> = {};

        for (const edge of this.edges.values()) {
            const category = edge.metadata?.category || 'UNCATEGORIZED';
            categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
        }

        // Calculate average neighbors
        let totalNeighbors = 0;
        for (const node of this.nodes.values()) {
            totalNeighbors += this.getNeighbors(node.id).length;
        }
        const averageNeighbors = this.nodes.size > 0 ? totalNeighbors / this.nodes.size : 0;

        return {
            nodeCount: this.nodes.size,
            edgeCount: this.edges.size,
            categoryDistribution,
            averageNeighbors
        };
    }

    // ==========================================================================
    // BETWEENNESS CENTRALITY
    // ==========================================================================

    /**
     * Build an undirected adjacency list from the graph edges.
     * Both directions are added for each edge.
     */
    private buildAdjacencyList(): Map<string, string[]> {
        const adjacency = new Map<string, string[]>();

        // Initialize all nodes with empty arrays
        for (const node of this.nodes.values()) {
            adjacency.set(node.id, []);
        }

        // Add edges in both directions (undirected graph)
        for (const edge of this.edges.values()) {
            const sourceNeighbors = adjacency.get(edge.source);
            const targetNeighbors = adjacency.get(edge.target);

            if (sourceNeighbors && !sourceNeighbors.includes(edge.target)) {
                sourceNeighbors.push(edge.target);
            }
            if (targetNeighbors && !targetNeighbors.includes(edge.source)) {
                targetNeighbors.push(edge.source);
            }
        }

        return adjacency;
    }

    /**
     * Calculate betweenness centrality for all nodes using Brandes' algorithm.
     * Measures how often a node lies on shortest paths between other nodes.
     * Nodes with high betweenness are "bridge" concepts.
     *
     * Time complexity: O(VE) where V = nodes, E = edges
     *
     * @returns Map of node ID to normalized centrality score (0-1)
     */
    calculateBetweennessCentrality(): Map<string, number> {
        // Return cached result if available
        if (this.centralityCache) {
            return new Map(this.centralityCache);
        }

        const centrality = new Map<string, number>();
        const nodeIds = Array.from(this.nodes.keys());

        // Initialize centrality scores to 0
        for (const nodeId of nodeIds) {
            centrality.set(nodeId, 0);
        }

        // Handle edge cases
        if (nodeIds.length === 0) {
            this.centralityCache = centrality;
            return new Map(centrality);
        }

        const adjacency = this.buildAdjacencyList();

        // Brandes' algorithm: For each source node, perform BFS and accumulate dependencies
        for (const source of nodeIds) {
            // Data structures for BFS
            const stack: string[] = [];
            const predecessors = new Map<string, string[]>();
            const sigma = new Map<string, number>(); // Number of shortest paths
            const distance = new Map<string, number>(); // Distance from source

            // Initialize
            for (const nodeId of nodeIds) {
                predecessors.set(nodeId, []);
                sigma.set(nodeId, 0);
                distance.set(nodeId, -1);
            }
            sigma.set(source, 1);
            distance.set(source, 0);

            // BFS queue
            const queue: string[] = [source];

            while (queue.length > 0) {
                const v = queue.shift()!;
                stack.push(v);

                const neighbors = adjacency.get(v) || [];
                for (const w of neighbors) {
                    // First time visiting w?
                    if (distance.get(w)! < 0) {
                        queue.push(w);
                        distance.set(w, distance.get(v)! + 1);
                    }
                    // Shortest path to w via v?
                    if (distance.get(w) === distance.get(v)! + 1) {
                        sigma.set(w, sigma.get(w)! + sigma.get(v)!);
                        predecessors.get(w)!.push(v);
                    }
                }
            }

            // Accumulate dependencies (back-propagation)
            const delta = new Map<string, number>();
            for (const nodeId of nodeIds) {
                delta.set(nodeId, 0);
            }

            while (stack.length > 0) {
                const w = stack.pop()!;
                for (const v of predecessors.get(w)!) {
                    const contribution = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
                    delta.set(v, delta.get(v)! + contribution);
                }
                if (w !== source) {
                    centrality.set(w, centrality.get(w)! + delta.get(w)!);
                }
            }
        }

        // Normalize scores to 0-1 range
        let maxCentrality = 0;
        for (const score of centrality.values()) {
            if (score > maxCentrality) {
                maxCentrality = score;
            }
        }

        if (maxCentrality > 0) {
            for (const [nodeId, score] of centrality) {
                centrality.set(nodeId, score / maxCentrality);
            }
        }

        // Cache the result
        this.centralityCache = new Map(centrality);

        return centrality;
    }

    /**
     * Get centrality score for a specific entity.
     *
     * @param termOrId Entity term or node ID
     * @returns Normalized centrality score (0-1), or 0 if entity not found
     */
    getCentralityScore(termOrId: string): number {
        const node = this.getNode(termOrId);
        if (!node) return 0;

        const centrality = this.calculateBetweennessCentrality();
        return centrality.get(node.id) ?? 0;
    }

    /**
     * Find bridge entities (high betweenness centrality).
     * Bridge entities are nodes that frequently appear on shortest paths
     * between other nodes, making them important connectors in the graph.
     *
     * @param threshold Minimum centrality score (0-1) to be considered a bridge (default: 0.3)
     * @returns Array of nodes that act as bridges, sorted by centrality descending
     */
    findBridgeEntities(threshold: number = 0.3): KnowledgeNode[] {
        const centrality = this.calculateBetweennessCentrality();
        const bridges: Array<{ node: KnowledgeNode; score: number }> = [];

        for (const [nodeId, score] of centrality) {
            if (score >= threshold) {
                const node = this.nodes.get(nodeId);
                if (node) {
                    bridges.push({ node, score });
                }
            }
        }

        // Sort by centrality score descending
        bridges.sort((a, b) => b.score - a.score);

        return bridges.map(b => b.node);
    }

    // ==========================================================================
    // STRUCTURAL HOLE DETECTION
    // ==========================================================================

    /**
     * Find connected components (clusters) in the graph using BFS.
     * Returns an array of clusters, where each cluster is an array of node IDs.
     */
    private findConnectedComponents(): string[][] {
        const visited = new Set<string>();
        const components: string[][] = [];
        const adjacency = this.buildAdjacencyList();

        for (const nodeId of this.nodes.keys()) {
            if (visited.has(nodeId)) continue;

            // BFS to find all nodes in this component
            const component: string[] = [];
            const queue: string[] = [nodeId];
            visited.add(nodeId);

            while (queue.length > 0) {
                const current = queue.shift()!;
                component.push(current);

                const neighbors = adjacency.get(current) || [];
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }

            components.push(component);
        }

        return components;
    }

    /**
     * Find connected components in a graph with specific edges excluded.
     * Used to detect what sub-clusters would form if bridge edges are removed.
     */
    private findComponentsExcludingEdges(
        nodeIds: string[],
        excludedEdges: Set<string>
    ): string[][] {
        const visited = new Set<string>();
        const components: string[][] = [];
        const nodeSet = new Set(nodeIds);

        // Build adjacency list excluding specific edges
        const adjacency = new Map<string, string[]>();
        for (const nodeId of nodeIds) {
            adjacency.set(nodeId, []);
        }

        for (const edge of this.edges.values()) {
            if (excludedEdges.has(edge.id)) continue;
            if (!nodeSet.has(edge.source) || !nodeSet.has(edge.target)) continue;

            adjacency.get(edge.source)?.push(edge.target);
            adjacency.get(edge.target)?.push(edge.source);
        }

        for (const nodeId of nodeIds) {
            if (visited.has(nodeId)) continue;

            const component: string[] = [];
            const queue: string[] = [nodeId];
            visited.add(nodeId);

            while (queue.length > 0) {
                const current = queue.shift()!;
                component.push(current);

                const neighbors = adjacency.get(current) || [];
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }

            components.push(component);
        }

        return components;
    }

    /**
     * Find bridge edges in a connected component.
     * Bridge edges are edges whose removal would disconnect the component.
     * Uses Tarjan's bridge-finding algorithm.
     */
    private findBridgeEdges(componentNodes: string[]): Array<{ edgeId: string; source: string; target: string }> {
        const bridges: Array<{ edgeId: string; source: string; target: string }> = [];
        const nodeSet = new Set(componentNodes);

        if (componentNodes.length < 2) return bridges;

        // Build adjacency list for this component
        const adjacency = new Map<string, Array<{ neighbor: string; edgeId: string }>>();
        for (const nodeId of componentNodes) {
            adjacency.set(nodeId, []);
        }

        for (const edge of this.edges.values()) {
            if (!nodeSet.has(edge.source) || !nodeSet.has(edge.target)) continue;

            adjacency.get(edge.source)?.push({ neighbor: edge.target, edgeId: edge.id });
            adjacency.get(edge.target)?.push({ neighbor: edge.source, edgeId: edge.id });
        }

        // Tarjan's algorithm for finding bridges
        const visited = new Set<string>();
        const disc = new Map<string, number>(); // Discovery times
        const low = new Map<string, number>();  // Lowest reachable discovery time
        const parent = new Map<string, string | null>();
        let time = 0;

        const dfs = (node: string) => {
            visited.add(node);
            disc.set(node, time);
            low.set(node, time);
            time++;

            const neighbors = adjacency.get(node) || [];
            for (const { neighbor, edgeId } of neighbors) {
                if (!visited.has(neighbor)) {
                    parent.set(neighbor, node);
                    dfs(neighbor);

                    // Update low value
                    low.set(node, Math.min(low.get(node)!, low.get(neighbor)!));

                    // If low value of neighbor > discovery time of node, it's a bridge
                    if (low.get(neighbor)! > disc.get(node)!) {
                        bridges.push({
                            edgeId,
                            source: node,
                            target: neighbor
                        });
                    }
                } else if (neighbor !== parent.get(node)) {
                    // Back edge - update low value
                    low.set(node, Math.min(low.get(node)!, disc.get(neighbor)!));
                }
            }
        };

        // Run DFS from first node
        parent.set(componentNodes[0], null);
        dfs(componentNodes[0]);

        return bridges;
    }

    /**
     * Find potential cluster pairs within a connected component by analyzing bridge edges.
     * Returns pairs of sub-clusters that are weakly connected (by a single bridge edge).
     */
    private findWeaklyConnectedClusters(componentNodes: string[]): Array<{
        clusterA: string[];
        clusterB: string[];
        bridgeEdgeId: string;
    }> {
        const results: Array<{ clusterA: string[]; clusterB: string[]; bridgeEdgeId: string }> = [];

        if (componentNodes.length < 4) {
            // Too small to have meaningful sub-clusters
            return results;
        }

        const bridgeEdges = this.findBridgeEdges(componentNodes);

        if (bridgeEdges.length === 0) {
            // No bridge edges - the component is 2-edge-connected
            return results;
        }

        // For each bridge edge, check if removing it creates two meaningful sub-clusters
        for (const bridge of bridgeEdges) {
            const excludedEdgeIds = new Set([bridge.edgeId]);
            const subClusters = this.findComponentsExcludingEdges(componentNodes, excludedEdgeIds);

            // Only consider if we get exactly 2 meaningful sub-clusters (each with at least 2 nodes)
            const meaningfulClusters = subClusters.filter(c => c.length >= 2);

            if (meaningfulClusters.length === 2) {
                results.push({
                    clusterA: meaningfulClusters[0],
                    clusterB: meaningfulClusters[1],
                    bridgeEdgeId: bridge.edgeId
                });
            }
        }

        return results;
    }

    /**
     * Count edges between two clusters.
     */
    private countCrossEdges(clusterA: string[], clusterB: string[]): number {
        const setA = new Set(clusterA);
        const setB = new Set(clusterB);
        let count = 0;

        for (const edge of this.edges.values()) {
            const sourceInA = setA.has(edge.source);
            const sourceInB = setB.has(edge.source);
            const targetInA = setA.has(edge.target);
            const targetInB = setB.has(edge.target);

            // Edge crosses clusters if one endpoint is in A and other is in B
            if ((sourceInA && targetInB) || (sourceInB && targetInA)) {
                count++;
            }
        }

        return count;
    }

    /**
     * Calculate connection strength between two clusters.
     * Formula: cross-edges / (|clusterA| * |clusterB|)
     */
    private calculateConnectionStrength(clusterA: string[], clusterB: string[]): number {
        const crossEdges = this.countCrossEdges(clusterA, clusterB);
        const maxPossibleEdges = clusterA.length * clusterB.length;

        if (maxPossibleEdges === 0) return 0;

        return crossEdges / maxPossibleEdges;
    }

    /**
     * Determine priority based on connection strength and cluster sizes.
     * - critical: 0 connection strength (completely disconnected)
     * - high: connection strength < 0.05
     * - medium: connection strength < 0.1
     * - low: connection strength < threshold (but >= 0.1)
     */
    private determinePriority(
        connectionStrength: number,
        clusterASize: number,
        clusterBSize: number
    ): 'critical' | 'high' | 'medium' | 'low' {
        if (connectionStrength === 0) {
            return 'critical';
        }

        // Larger clusters with weak connections are more important
        const sizeMultiplier = Math.min((clusterASize + clusterBSize) / 10, 2);
        const adjustedStrength = connectionStrength / sizeMultiplier;

        if (adjustedStrength < 0.05) {
            return 'high';
        } else if (adjustedStrength < 0.1) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Find bridge candidates for a structural hole.
     * Returns entities with high betweenness centrality from both clusters.
     */
    private findBridgeCandidates(
        clusterA: string[],
        clusterB: string[]
    ): string[] {
        const centrality = this.calculateBetweennessCentrality();
        const candidates: Array<{ nodeId: string; score: number }> = [];

        // Get top centrality nodes from each cluster
        for (const nodeId of [...clusterA, ...clusterB]) {
            const score = centrality.get(nodeId) || 0;
            candidates.push({ nodeId, score });
        }

        // Sort by centrality descending and take top 5
        candidates.sort((a, b) => b.score - a.score);

        return candidates
            .slice(0, 5)
            .filter(c => c.score > 0) // Only include nodes with non-zero centrality
            .map(c => c.nodeId);
    }

    /**
     * Identify structural holes in the knowledge graph.
     *
     * Structural holes are gaps between topic clusters where connection
     * strength is below the threshold. These represent opportunities for
     * bridge content that can strengthen the semantic network.
     *
     * Algorithm:
     * 1. Find all disconnected components (these are automatic structural holes with 0 strength)
     * 2. For each connected component, identify weakly connected sub-clusters via bridge edges
     * 3. For each pair of clusters, calculate connection strength
     * 4. If connection strength < threshold, it's a structural hole
     * 5. Identify bridge candidates based on betweenness centrality
     *
     * @param threshold Connection strength below which a gap is considered a hole (default: 0.15)
     * @returns Array of structural holes, sorted by priority
     */
    identifyStructuralHoles(threshold: number = 0.15): StructuralHole[] {
        const nodeCount = this.nodes.size;

        // Edge cases: empty graph or single node
        if (nodeCount === 0 || nodeCount === 1) {
            return [];
        }

        const components = this.findConnectedComponents();
        const holes: StructuralHole[] = [];

        // First, check for disconnected components (structural holes with 0 connection strength)
        if (components.length > 1) {
            for (let i = 0; i < components.length; i++) {
                for (let j = i + 1; j < components.length; j++) {
                    const clusterA = components[i];
                    const clusterB = components[j];

                    // Connection strength is 0 for disconnected components
                    const connectionStrength = 0;

                    const priority = this.determinePriority(
                        connectionStrength,
                        clusterA.length,
                        clusterB.length
                    );

                    const bridgeCandidates = this.findBridgeCandidates(clusterA, clusterB);

                    holes.push({
                        clusterA,
                        clusterB,
                        connectionStrength,
                        bridgeCandidates,
                        priority
                    });
                }
            }
        }

        // Then, check for weakly connected clusters within each connected component
        for (const component of components) {
            const weaklyConnected = this.findWeaklyConnectedClusters(component);

            for (const { clusterA, clusterB } of weaklyConnected) {
                const connectionStrength = this.calculateConnectionStrength(clusterA, clusterB);

                // It's a structural hole if connection strength is below threshold
                if (connectionStrength < threshold) {
                    const priority = this.determinePriority(
                        connectionStrength,
                        clusterA.length,
                        clusterB.length
                    );

                    const bridgeCandidates = this.findBridgeCandidates(clusterA, clusterB);

                    holes.push({
                        clusterA,
                        clusterB,
                        connectionStrength,
                        bridgeCandidates,
                        priority
                    });
                }
            }
        }

        // Sort by priority (critical first, then high, medium, low)
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        holes.sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            // Secondary sort by connection strength (lower = more important)
            return a.connectionStrength - b.connectionStrength;
        });

        return holes;
    }

    // ==========================================================================
    // GRAPH DRIFT MONITORING (Finding #54)
    // ==========================================================================

    /**
     * Snapshot of graph state at a point in time, used as a baseline for drift detection.
     */
    static createSnapshot(graph: KnowledgeGraph): GraphSnapshot {
        return {
            timestamp: Date.now(),
            entityIds: new Set(Array.from(graph.getNodes().keys())),
            entityTerms: new Map(
                Array.from(graph.getNodes().entries()).map(([id, node]) => [id, node.term])
            ),
            edgeKeys: new Set(
                Array.from(graph.getEdges().values()).map(
                    edge => `${edge.source}::${edge.target}::${edge.relation}`
                )
            ),
            edgeIds: new Set(Array.from(graph.getEdges().keys())),
            nodeCount: graph.getNodes().size,
            edgeCount: graph.getEdges().size,
        };
    }

    /**
     * Compare the current graph state against a baseline snapshot to detect drift.
     *
     * Drift detection identifies structural changes between two graph states:
     * - Added/removed entities (nodes)
     * - Added/removed edges (relationships)
     * - Orphaned entities (nodes with no edges after changes)
     *
     * The drift score (0-100) measures how different the current state is from the baseline:
     * - 0 = no drift (identical graphs)
     * - 100 = completely different (no overlap)
     *
     * The score is calculated as a weighted combination of:
     * - Entity drift (50%): Jaccard distance of entity sets
     * - Edge drift (50%): Jaccard distance of edge sets
     *
     * @param baseline A snapshot created earlier via KnowledgeGraph.createSnapshot()
     * @returns Detailed drift report with added/removed items and drift score
     */
    detectDrift(baseline: GraphSnapshot): GraphDriftResult {
        // Current state
        const currentEntityIds = new Set(Array.from(this.nodes.keys()));
        const currentEdgeKeys = new Set(
            Array.from(this.edges.values()).map(
                edge => `${edge.source}::${edge.target}::${edge.relation}`
            )
        );

        // --- Entity drift ---
        const addedEntities: Array<{ id: string; term: string }> = [];
        const removedEntities: Array<{ id: string; term: string }> = [];

        // Find added entities (in current but not in baseline)
        for (const [id, node] of this.nodes) {
            if (!baseline.entityIds.has(id)) {
                addedEntities.push({ id, term: node.term });
            }
        }

        // Find removed entities (in baseline but not in current)
        for (const id of baseline.entityIds) {
            if (!currentEntityIds.has(id)) {
                const term = baseline.entityTerms.get(id) || id;
                removedEntities.push({ id, term });
            }
        }

        // --- Edge drift ---
        const addedEdges: Array<{ source: string; target: string; relation: string }> = [];
        const removedEdges: Array<{ source: string; target: string; relation: string }> = [];

        // Find added edges (in current but not in baseline)
        for (const edge of this.edges.values()) {
            const key = `${edge.source}::${edge.target}::${edge.relation}`;
            if (!baseline.edgeKeys.has(key)) {
                addedEdges.push({
                    source: edge.source,
                    target: edge.target,
                    relation: edge.relation,
                });
            }
        }

        // Find removed edges (in baseline but not in current)
        for (const key of baseline.edgeKeys) {
            if (!currentEdgeKeys.has(key)) {
                const [source, target, relation] = key.split('::');
                removedEdges.push({ source, target, relation });
            }
        }

        // --- Orphaned entities ---
        // Entities that exist in the current graph but have zero edges
        const orphanedEntities: Array<{ id: string; term: string }> = [];
        for (const [id, node] of this.nodes) {
            const edges = this.getEdgesForNode(id);
            if (edges.length === 0) {
                orphanedEntities.push({ id, term: node.term });
            }
        }

        // --- Drift score calculation ---
        // Using Jaccard distance: 1 - (|intersection| / |union|)
        // Weighted: 50% entity drift + 50% edge drift

        // Entity Jaccard distance
        const entityUnionSize = new Set([...baseline.entityIds, ...currentEntityIds]).size;
        const entityIntersectionSize = entityUnionSize > 0
            ? Array.from(baseline.entityIds).filter(id => currentEntityIds.has(id)).length
            : 0;
        const entityJaccardDistance = entityUnionSize > 0
            ? 1 - (entityIntersectionSize / entityUnionSize)
            : 0;

        // Edge Jaccard distance
        const edgeUnionSize = new Set([...baseline.edgeKeys, ...currentEdgeKeys]).size;
        const edgeIntersectionSize = edgeUnionSize > 0
            ? Array.from(baseline.edgeKeys).filter(key => currentEdgeKeys.has(key)).length
            : 0;
        const edgeJaccardDistance = edgeUnionSize > 0
            ? 1 - (edgeIntersectionSize / edgeUnionSize)
            : 0;

        // Weighted drift score (0-100)
        const driftScore = Math.round(
            (entityJaccardDistance * 0.5 + edgeJaccardDistance * 0.5) * 100
        );

        return {
            baselineTimestamp: baseline.timestamp,
            currentTimestamp: Date.now(),
            addedEntities,
            removedEntities,
            addedEdges,
            removedEdges,
            orphanedEntities,
            driftScore: Math.min(100, Math.max(0, driftScore)),
            entityDrift: Math.round(entityJaccardDistance * 100),
            edgeDrift: Math.round(edgeJaccardDistance * 100),
            summary: {
                entitiesAdded: addedEntities.length,
                entitiesRemoved: removedEntities.length,
                edgesAdded: addedEdges.length,
                edgesRemoved: removedEdges.length,
                orphanedCount: orphanedEntities.length,
                baselineNodeCount: baseline.nodeCount,
                baselineEdgeCount: baseline.edgeCount,
                currentNodeCount: this.nodes.size,
                currentEdgeCount: this.edges.size,
            },
        };
    }

    /**
     * Controls how this class is serialized to JSON.
     * When JSON.stringify() is called on an instance, this method's
     * return value will be used. This ensures we save the contents
     * of the Maps, not the Map objects themselves.
     */
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values()),
            coOccurrences: Array.from(this.coOccurrences.values()),
            entityContexts: Array.from(this.entityContexts.entries()).map(
                ([key, contexts]) => ({ entity: key, contexts })
            ),
        };
    }

    /**
     * Restore co-occurrences and entity contexts from serialized data.
     */
    fromJSON(data: {
        nodes?: KnowledgeNode[];
        edges?: KnowledgeEdge[];
        coOccurrences?: CoOccurrence[];
        entityContexts?: Array<{ entity: string; contexts: EntityContext[] }>;
    }): void {
        // Load nodes
        if (data.nodes) {
            for (const node of data.nodes) {
                this.addNode(node);
            }
        }

        // Load edges
        if (data.edges) {
            for (const edge of data.edges) {
                this.addEdge(edge);
            }
        }

        // Load co-occurrences
        if (data.coOccurrences) {
            for (const coOcc of data.coOccurrences) {
                const key = [coOcc.entityA, coOcc.entityB].sort().join('::');
                this.coOccurrences.set(key, coOcc);
            }
        }

        // Load entity contexts
        if (data.entityContexts) {
            for (const entry of data.entityContexts) {
                this.entityContexts.set(entry.entity, entry.contexts);
            }
        }
    }

    /**
     * Clear all data from the graph.
     */
    clear(): void {
        this.nodes.clear();
        this.edges.clear();
        this.coOccurrences.clear();
        this.entityContexts.clear();
        this.centralityCache = null;
    }

    /**
     * Get extended statistics including semantic distance metrics.
     */
    getExtendedStatistics(): {
        nodeCount: number;
        edgeCount: number;
        coOccurrenceCount: number;
        entityContextCount: number;
        categoryDistribution: Record<string, number>;
        averageNeighbors: number;
        cannibalizationRisks: number;
    } {
        const baseStats = this.getStatistics();
        const cannibalizationRisks = this.identifyCannibalizationRisks().length;

        return {
            ...baseStats,
            coOccurrenceCount: this.coOccurrences.size,
            entityContextCount: this.entityContexts.size,
            cannibalizationRisks
        };
    }
}