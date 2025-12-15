import { KnowledgeNode, KnowledgeEdge, AttributeCategory } from '../types';
import { SparqlQueryEngine } from '../services/sparqlQueryService';

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
    private queryEngine: SparqlQueryEngine;

    // New: Co-occurrence tracking
    private coOccurrences: Map<string, CoOccurrence> = new Map();

    // New: Entity context tracking (position weights per entity per page)
    private entityContexts: Map<string, EntityContext[]> = new Map();

    constructor() {
        this.queryEngine = new SparqlQueryEngine(this.nodes, this.edges);
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
    }

    addEdge(edge: KnowledgeEdge) {
        this.edges.set(edge.id, edge);
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

    query(sparqlQuery: string): Record<string, any>[] {
        return this.queryEngine.executeQuery(sparqlQuery);
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