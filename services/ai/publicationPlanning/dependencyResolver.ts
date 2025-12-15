/**
 * Dependency Resolver for Publication Planning
 *
 * Determines publication order based on topic relationships:
 * - Parent topics must be published before children
 * - Pillar topics before cluster content
 * - Handles circular dependency detection
 */

import { EnrichedTopic } from '../../../types';

interface DependencyResult {
    topic_id: string;
    dependencies: string[];  // Topic IDs that must be published first
    dependents: string[];    // Topic IDs that depend on this topic
    order: number;           // Publication order (0 = can publish immediately)
}

/**
 * Resolve publication dependencies for all topics
 */
export function resolveDependencies(topics: EnrichedTopic[]): DependencyResult[] {
    const results: DependencyResult[] = [];
    const topicMap = new Map(topics.map(t => [t.id, t]));

    // Build dependency graph
    const dependencies = new Map<string, Set<string>>();
    const dependents = new Map<string, Set<string>>();

    topics.forEach(topic => {
        dependencies.set(topic.id, new Set());
        dependents.set(topic.id, new Set());
    });

    // Add parent-child dependencies
    topics.forEach(topic => {
        if (topic.parent_topic_id && topicMap.has(topic.parent_topic_id)) {
            // Child depends on parent
            dependencies.get(topic.id)!.add(topic.parent_topic_id);
            // Parent has dependent
            dependents.get(topic.parent_topic_id)!.add(topic.id);
        }
    });

    // Add pillar-cluster dependencies
    const pillarTopics = topics.filter(t => t.cluster_role === 'pillar');
    const clusterTopics = topics.filter(t => t.cluster_role === 'cluster_content');

    clusterTopics.forEach(cluster => {
        // Find the pillar this cluster belongs to (via parent chain)
        let current = cluster;
        const visited = new Set<string>();

        while (current.parent_topic_id && !visited.has(current.id)) {
            visited.add(current.id);
            const parent = topicMap.get(current.parent_topic_id);
            if (!parent) break;

            if (parent.cluster_role === 'pillar') {
                // Cluster depends on pillar
                if (parent.id !== cluster.id) {
                    dependencies.get(cluster.id)!.add(parent.id);
                    dependents.get(parent.id)!.add(cluster.id);
                }
                break;
            }
            current = parent;
        }
    });

    // Calculate publication order using topological sort
    const order = calculateOrder(topics.map(t => t.id), dependencies);

    // Build results
    topics.forEach(topic => {
        results.push({
            topic_id: topic.id,
            dependencies: Array.from(dependencies.get(topic.id) || []),
            dependents: Array.from(dependents.get(topic.id) || []),
            order: order.get(topic.id) || 0
        });
    });

    return results;
}

/**
 * Calculate publication order using Kahn's algorithm for topological sort
 */
function calculateOrder(
    topicIds: string[],
    dependencies: Map<string, Set<string>>
): Map<string, number> {
    const order = new Map<string, number>();
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, Set<string>>();

    // Initialize
    topicIds.forEach(id => {
        inDegree.set(id, 0);
        adjList.set(id, new Set());
    });

    // Build adjacency list and in-degrees
    topicIds.forEach(id => {
        const deps = dependencies.get(id) || new Set();
        deps.forEach(depId => {
            if (adjList.has(depId)) {
                adjList.get(depId)!.add(id);
                inDegree.set(id, (inDegree.get(id) || 0) + 1);
            }
        });
    });

    // Queue for topics with no dependencies
    const queue: string[] = [];
    topicIds.forEach(id => {
        if (inDegree.get(id) === 0) {
            queue.push(id);
        }
    });

    let currentOrder = 0;

    while (queue.length > 0) {
        // Process all topics at current order level
        const currentLevel = [...queue];
        queue.length = 0;

        currentLevel.forEach(id => {
            order.set(id, currentOrder);

            // Reduce in-degree of dependents
            const deps = adjList.get(id) || new Set();
            deps.forEach(depId => {
                const newDegree = (inDegree.get(depId) || 0) - 1;
                inDegree.set(depId, newDegree);
                if (newDegree === 0) {
                    queue.push(depId);
                }
            });
        });

        currentOrder++;
    }

    // Handle any remaining topics (circular dependencies)
    topicIds.forEach(id => {
        if (!order.has(id)) {
            // Topic is part of a cycle, assign high order
            order.set(id, currentOrder);
        }
    });

    return order;
}

/**
 * Check if there are circular dependencies
 */
export function hasCircularDependencies(topics: EnrichedTopic[]): boolean {
    const dependencies = resolveDependencies(topics);
    const maxOrder = Math.max(...dependencies.map(d => d.order));

    // If any topic has order equal to total count of non-zero orders,
    // it indicates a cycle was detected
    const orderedCount = dependencies.filter(d => d.dependencies.length > 0).length;
    return maxOrder > orderedCount;
}

/**
 * Get topics that can be published immediately (no unmet dependencies)
 */
export function getPublishableTopics(
    topics: EnrichedTopic[],
    publishedTopicIds: Set<string>
): string[] {
    const dependencies = resolveDependencies(topics);

    return dependencies
        .filter(d => {
            // All dependencies must be published
            return d.dependencies.every(depId => publishedTopicIds.has(depId));
        })
        .filter(d => !publishedTopicIds.has(d.topic_id))
        .map(d => d.topic_id);
}

export type { DependencyResult };
