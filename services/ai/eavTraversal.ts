// services/ai/eavTraversal.ts

import type { SemanticTriple } from '../../types';

/**
 * Traversal path through EAV graph.
 * Represents a chain of entities connected by shared attributes.
 */
export interface TraversalPath {
  /** Starting entity */
  from: string;
  /** Ending entity */
  to: string;
  /** Shared attribute that connects them */
  sharedAttribute: string;
  /** Shared or related values */
  sharedValues: string[];
  /** Path distance (number of hops) */
  distance: number;
}

/**
 * Entity cluster based on shared attributes.
 */
export interface EntityCluster {
  /** Common attribute */
  attribute: string;
  /** Entities sharing this attribute */
  entities: string[];
  /** Values for each entity */
  values: Map<string, string>;
}

/**
 * EavTraversal - Cross-entity linking through shared attributes.
 *
 * Implements "Traversal Retrieval" from the semantic SEO framework:
 * - Finds connections between entities via shared attribute values
 * - Identifies clusters of entities with common attributes
 * - Suggests internal links based on attribute overlap
 * - Supports multi-hop traversal (A→shared_attr→B→shared_attr→C)
 */
export class EavTraversal {
  private entityAttributes: Map<string, Map<string, string[]>> = new Map();

  constructor(triples: SemanticTriple[]) {
    this.buildIndex(triples);
  }

  /**
   * Build an index: entity → { attribute → [values] }
   */
  private buildIndex(triples: SemanticTriple[]): void {
    for (const triple of triples) {
      const entity = triple.subject?.label?.toLowerCase() || '';
      const attribute = triple.predicate?.relation?.toLowerCase() || '';
      const value = typeof triple.object?.value === 'string'
        ? triple.object.value.toLowerCase()
        : '';

      if (!entity || !attribute || !value) continue;

      if (!this.entityAttributes.has(entity)) {
        this.entityAttributes.set(entity, new Map());
      }
      const attrs = this.entityAttributes.get(entity)!;
      if (!attrs.has(attribute)) {
        attrs.set(attribute, []);
      }
      attrs.get(attribute)!.push(value);
    }
  }

  /**
   * Find direct connections between two entities via shared attributes.
   */
  findDirectConnections(entityA: string, entityB: string): TraversalPath[] {
    const a = entityA.toLowerCase();
    const b = entityB.toLowerCase();
    const paths: TraversalPath[] = [];

    const attrsA = this.entityAttributes.get(a);
    const attrsB = this.entityAttributes.get(b);
    if (!attrsA || !attrsB) return paths;

    // Find shared attributes
    for (const [attr, valuesA] of attrsA) {
      const valuesB = attrsB.get(attr);
      if (!valuesB) continue;

      // Find shared values
      const shared = valuesA.filter(v => valuesB.includes(v));
      if (shared.length > 0) {
        paths.push({
          from: entityA,
          to: entityB,
          sharedAttribute: attr,
          sharedValues: shared,
          distance: 1,
        });
      }

      // Even if values differ, same attribute type is a connection
      if (shared.length === 0) {
        paths.push({
          from: entityA,
          to: entityB,
          sharedAttribute: attr,
          sharedValues: [...new Set([...valuesA, ...valuesB])],
          distance: 1,
        });
      }
    }

    return paths;
  }

  /**
   * Find all entities connected to a given entity.
   */
  findConnectedEntities(entity: string): TraversalPath[] {
    const lower = entity.toLowerCase();
    const paths: TraversalPath[] = [];
    const attrs = this.entityAttributes.get(lower);
    if (!attrs) return paths;

    for (const [otherEntity] of this.entityAttributes) {
      if (otherEntity === lower) continue;
      const connections = this.findDirectConnections(entity, otherEntity);
      paths.push(...connections);
    }

    return paths;
  }

  /**
   * Find entity clusters based on shared attributes.
   */
  findClusters(): EntityCluster[] {
    const clusters: EntityCluster[] = [];
    const allAttributes = new Set<string>();

    // Collect all attributes
    for (const [, attrs] of this.entityAttributes) {
      for (const [attr] of attrs) {
        allAttributes.add(attr);
      }
    }

    // For each attribute, find entities that share it
    for (const attribute of allAttributes) {
      const entities: string[] = [];
      const values = new Map<string, string>();

      for (const [entity, attrs] of this.entityAttributes) {
        const vals = attrs.get(attribute);
        if (vals && vals.length > 0) {
          entities.push(entity);
          values.set(entity, vals[0]); // Store first value
        }
      }

      if (entities.length >= 2) {
        clusters.push({ attribute, entities, values });
      }
    }

    // Sort by cluster size (largest first)
    return clusters.sort((a, b) => b.entities.length - a.entities.length);
  }

  /**
   * Multi-hop traversal: find paths between two entities that may go through intermediaries.
   * Limited to maxHops to prevent exponential blowup.
   */
  findMultiHopPath(
    from: string,
    to: string,
    maxHops: number = 3
  ): TraversalPath[] {
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    // BFS for shortest path
    const visited = new Set<string>([fromLower]);
    const queue: { entity: string; path: TraversalPath[] }[] = [
      { entity: fromLower, path: [] },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.path.length >= maxHops) continue;

      const connections = this.findConnectedEntities(current.entity);
      for (const conn of connections) {
        const nextEntity = conn.to.toLowerCase();

        if (nextEntity === toLower) {
          return [...current.path, conn];
        }

        if (!visited.has(nextEntity)) {
          visited.add(nextEntity);
          queue.push({
            entity: nextEntity,
            path: [...current.path, conn],
          });
        }
      }
    }

    return []; // No path found
  }

  /**
   * Suggest internal links based on EAV attribute overlap.
   * Returns pairs of entities that should link to each other.
   */
  suggestLinks(): { from: string; to: string; reason: string; strength: number }[] {
    const suggestions: { from: string; to: string; reason: string; strength: number }[] = [];
    const entities = Array.from(this.entityAttributes.keys());

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const connections = this.findDirectConnections(entities[i], entities[j]);
        if (connections.length > 0) {
          const sharedValueCount = connections.reduce(
            (sum, c) => sum + c.sharedValues.length, 0
          );
          const strength = Math.min(1, connections.length * 0.3 + sharedValueCount * 0.1);

          if (strength > 0.2) {
            const attrs = connections.map(c => c.sharedAttribute).join(', ');
            suggestions.push({
              from: entities[i],
              to: entities[j],
              reason: `Shared attributes: ${attrs}`,
              strength,
            });
          }
        }
      }
    }

    return suggestions.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Get all entities in the index.
   */
  getEntities(): string[] {
    return Array.from(this.entityAttributes.keys());
  }

  /**
   * Get all attributes for an entity.
   */
  getEntityAttributes(entity: string): Map<string, string[]> | undefined {
    return this.entityAttributes.get(entity.toLowerCase());
  }
}
