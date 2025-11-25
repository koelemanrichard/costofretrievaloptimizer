import { KnowledgeNode, KnowledgeEdge } from '../types';

type TriplePattern = { subject: string, predicate: string, object: string };
type Bindings = Record<string, any>;

export class SparqlQueryEngine {
    private nodes: Map<string, KnowledgeNode>;
    private edges: Map<string, KnowledgeEdge>;

    constructor(nodes: Map<string, KnowledgeNode>, edges: Map<string, KnowledgeEdge>) {
        this.nodes = nodes;
        this.edges = edges;
    }

    private parseQuery(queryString: string): { select: string[], where: TriplePattern[], limit?: number } {
        const selectMatch = queryString.match(/SELECT\s+((?:\?\w+\s*)+)/i);
        const whereMatch = queryString.match(/WHERE\s*\{\s*([\s\S]+?)\s*\}/i);
        const limitMatch = queryString.match(/LIMIT\s+(\d+)/i);

        if (!selectMatch || !whereMatch) {
            throw new Error("Invalid SPARQL query: Must contain SELECT and WHERE clauses.");
        }

        const select = selectMatch[1].trim().split(/\s+/).map(v => v.substring(1)); // remove '?'
        
        const whereClauses = whereMatch[1].trim().split(/\s*\.\s*/).filter(s => s.trim());
        const where: TriplePattern[] = whereClauses.map(clause => {
            const parts = clause.match(/(?:"[^"]+"|'[^']+'|\S+)/g);
            if (!parts || parts.length !== 3) {
                throw new Error(`Malformed triple pattern: ${clause}`);
            }
            return { subject: parts[0], predicate: parts[1], object: parts[2] };
        });

        const limit = limitMatch ? parseInt(limitMatch[1], 10) : undefined;

        return { select, where, limit };
    }
    
    private matchPattern(pattern: TriplePattern, bindings: Bindings[]): Bindings[] {
        const newSolutions: Bindings[] = [];

        for (const binding of bindings) {
            // This logic handles properties on nodes, e.g., ?node term ?term
            for (const node of this.nodes.values()) {
                const subjectVar = pattern.subject.substring(1);
                
                // 1. Match subject
                // Check if the current node is compatible with the binding's subject, if the subject is already bound
                if (pattern.subject.startsWith('?') && binding[subjectVar] && binding[subjectVar] !== node.term) {
                    continue; // This binding is for a different subject, so this node can't extend it.
                }
                
                // 2. Match predicate (as a property on the node or its metadata)
                const prop = pattern.predicate as keyof KnowledgeNode | keyof KnowledgeNode['metadata'];
                let value: any;
                if (prop in node) {
                    value = node[prop as keyof KnowledgeNode];
                } else if (prop in node.metadata) {
                    value = node.metadata[prop as keyof KnowledgeNode['metadata']];
                }

                if (value === undefined) continue; // Property doesn't exist on this node for this pattern.

                // 3. Match object
                const objectVar = pattern.object.substring(1);
                // Check if the node's value is compatible with the binding's object, if the object is already bound
                if (pattern.object.startsWith('?') && binding[objectVar] && String(binding[objectVar]) !== String(value)) {
                    continue; // This binding has a conflicting value for the object
                }
                
                // All checks passed. This node can extend the current binding.
                const newBinding = { ...binding };
                if (pattern.subject.startsWith('?')) {
                    newBinding[subjectVar] = node.term;
                }
                if (pattern.object.startsWith('?')) {
                    newBinding[objectVar] = value;
                }
                newSolutions.push(newBinding);
            }
        }
        return newSolutions;
    }
    
    public executeQuery(queryString: string): Record<string, any>[] {
        const { select, where, limit } = this.parseQuery(queryString);
        let solutions: Bindings[] = [{}]; // Start with one empty binding for the first pattern to match against

        for (const pattern of where) {
            solutions = this.matchPattern(pattern, solutions);
        }

        // Project the results to only include the SELECT variables
        let finalResults = solutions.map(solution => {
            const projected: Record<string, any> = {};
            for (const variable of select) {
                projected[variable] = solution[variable];
            }
            return projected;
        });

        // Deduplicate results
        const seen = new Set();
        finalResults = finalResults.filter(item => {
            const key = JSON.stringify(item);
            return seen.has(key) ? false : seen.add(key);
        });

        if (limit) {
            return finalResults.slice(0, limit);
        }

        return finalResults;
    }
}