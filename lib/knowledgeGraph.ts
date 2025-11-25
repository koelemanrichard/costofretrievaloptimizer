import { KnowledgeNode, KnowledgeEdge } from '../types';
import { SparqlQueryEngine } from '../services/sparqlQueryService';

export class KnowledgeGraph {
    private nodes: Map<string, KnowledgeNode> = new Map();
    private edges: Map<string, KnowledgeEdge> = new Map();
    private queryEngine: SparqlQueryEngine;

    constructor() {
        this.queryEngine = new SparqlQueryEngine(this.nodes, this.edges);
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

    semanticSimilarity(term1: string, term2: string): number {
        // Placeholder for a more complex similarity algorithm (e.g., path-based, shared neighbors)
        if (this.areConnected(term1, term2)) return 0.8;
        return 0.1;
    }

    identifyKnowledgeGaps(): { entities: string[], attributes: string[] }[] {
        // Placeholder for a sophisticated gap analysis algorithm
        return [{ entities: ['Example Entity'], attributes: ['Missing Attribute'] }];
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
     * Controls how this class is serialized to JSON.
     * When JSON.stringify() is called on an instance, this method's
     * return value will be used. This ensures we save the contents
     * of the Maps, not the Map objects themselves.
     */
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values()),
        };
    }
}