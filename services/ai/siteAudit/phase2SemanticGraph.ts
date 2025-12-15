/**
 * Phase 2: Knowledge Graph Alignment
 *
 * Analyzes the site-wide knowledge graph for:
 * - Entity consistency across pages
 * - Semantic distance calculations
 * - Cluster identification
 * - Orphan page detection
 */

import {
    KnowledgeGraphAnalysis,
    EntityCluster,
    SemanticDistanceMap,
    KGIssue,
    PageSemanticInfo
} from './types';
import { SemanticTriple } from '../../../types';

// =============================================================================
// MAIN PHASE 2 EXECUTION
// =============================================================================

export async function executePhase2(
    pageSemantics: PageSemanticInfo[],
    eavs: SemanticTriple[],
    onProgress?: (progress: number, step: string) => void
): Promise<KnowledgeGraphAnalysis> {
    onProgress?.(0, 'Building knowledge graph');

    // Build entity index from EAVs
    const entityIndex = buildEntityIndex(eavs);
    onProgress?.(20, 'Entity index built');

    // Calculate entity types distribution
    const entityTypes = calculateEntityTypes(eavs);
    onProgress?.(30, 'Entity types analyzed');

    // Build semantic distance matrix
    const semanticDistances = calculateSemanticDistances(pageSemantics, eavs);
    onProgress?.(50, 'Semantic distances calculated');

    // Identify clusters
    const clusters = identifyClusters(pageSemantics, semanticDistances);
    onProgress?.(70, 'Clusters identified');

    // Find orphan pages
    const orphanPages = findOrphanPages(pageSemantics, clusters);
    onProgress?.(80, 'Orphan pages identified');

    // Check for KG issues
    const issues = identifyKGIssues(eavs, pageSemantics, clusters);
    onProgress?.(90, 'Issues identified');

    // Calculate coverage metrics
    const coverage = calculateCoverage(eavs, pageSemantics);
    onProgress?.(95, 'Coverage calculated');

    // Calculate consistency score
    const consistencyScore = calculateConsistencyScore(issues, coverage);

    onProgress?.(100, 'Knowledge graph analysis complete');

    return {
        totalEntities: entityIndex.size,
        totalRelationships: eavs.length,
        entityTypes,
        consistencyScore,
        coverage,
        clusters,
        orphanPages,
        semanticDistances,
        issues
    };
}

// =============================================================================
// ENTITY INDEX BUILDING
// =============================================================================

function buildEntityIndex(eavs: SemanticTriple[]): Map<string, EntityInfo> {
    const index = new Map<string, EntityInfo>();

    for (const eav of eavs) {
        // Index subject entities
        const subjectKey = eav.entity.toLowerCase().trim();
        if (!index.has(subjectKey)) {
            index.set(subjectKey, {
                entity: eav.entity,
                attributes: new Map(),
                occurrences: 0,
                contexts: []
            });
        }
        const subjectInfo = index.get(subjectKey)!;
        subjectInfo.occurrences++;

        // Track attribute-value pairs
        const attrKey = eav.attribute.toLowerCase().trim();
        if (!subjectInfo.attributes.has(attrKey)) {
            subjectInfo.attributes.set(attrKey, []);
        }
        subjectInfo.attributes.get(attrKey)!.push(eav.value);

        // Track context if available
        if (eav.context) {
            subjectInfo.contexts.push(eav.context);
        }
    }

    return index;
}

interface EntityInfo {
    entity: string;
    attributes: Map<string, string[]>;
    occurrences: number;
    contexts: string[];
}

// =============================================================================
// ENTITY TYPE ANALYSIS
// =============================================================================

function calculateEntityTypes(eavs: SemanticTriple[]): Record<string, number> {
    const types: Record<string, number> = {};

    for (const eav of eavs) {
        // Use classification as type indicator
        const type = eav.classification || 'UNCLASSIFIED';
        types[type] = (types[type] || 0) + 1;
    }

    // Also track by category
    for (const eav of eavs) {
        const category = eav.category || 'UNCATEGORIZED';
        const categoryKey = `category_${category}`;
        types[categoryKey] = (types[categoryKey] || 0) + 1;
    }

    return types;
}

// =============================================================================
// SEMANTIC DISTANCE CALCULATION
// =============================================================================

function calculateSemanticDistances(
    pages: PageSemanticInfo[],
    eavs: SemanticTriple[]
): SemanticDistanceMap[] {
    const distances: SemanticDistanceMap[] = [];

    // Build page-entity mapping
    const pageEntities = new Map<string, Set<string>>();
    for (const page of pages) {
        const entities = new Set<string>();
        entities.add(page.extractedCE.toLowerCase());
        pageEntities.set(page.url, entities);
    }

    // Enrich with EAVs if they have page context
    for (const eav of eavs) {
        if (eav.context) {
            const pageUrl = eav.context;
            if (pageEntities.has(pageUrl)) {
                pageEntities.get(pageUrl)!.add(eav.entity.toLowerCase());
            }
        }
    }

    // Calculate pairwise distances
    for (let i = 0; i < pages.length; i++) {
        for (let j = i + 1; j < pages.length; j++) {
            const pageA = pages[i];
            const pageB = pages[j];

            const entitiesA = pageEntities.get(pageA.url) || new Set();
            const entitiesB = pageEntities.get(pageB.url) || new Set();

            // Full semantic distance formula:
            // Distance = 1 - (CosineSimilarity × ContextWeight × CoOccurrence)
            const cosineSim = calculateJaccardSimilarity(entitiesA, entitiesB);
            const contextWeight = calculateContextWeight(pageA, pageB);
            const coOccurrence = calculateCoOccurrence(pageA, pageB, eavs);

            const distance = 1 - (cosineSim * contextWeight * coOccurrence);

            // Determine if pages should be linked
            // Sweet spot: 0.3-0.7 distance (related but not duplicate)
            const shouldLink = distance >= 0.3 && distance <= 0.7;
            let linkReason: string | undefined;

            if (shouldLink) {
                if (distance < 0.5) {
                    linkReason = 'Strongly related - consider contextual linking';
                } else {
                    linkReason = 'Moderately related - good for supporting links';
                }
            } else if (distance < 0.3) {
                linkReason = 'Too similar - risk of cannibalization';
            } else {
                linkReason = 'Too different - linking may dilute relevance';
            }

            distances.push({
                pageA: pageA.url,
                pageB: pageB.url,
                distance: Math.round(distance * 100) / 100,
                shouldLink,
                linkReason
            });
        }
    }

    return distances;
}

function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 1;
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    setA.forEach(item => {
        if (setB.has(item)) intersection++;
    });

    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
}

function calculateContextWeight(pageA: PageSemanticInfo, pageB: PageSemanticInfo): number {
    // Context weight based on segment alignment
    let weight = 0.5; // Base weight

    // Same segment = higher weight
    if (pageA.segment === pageB.segment) {
        weight += 0.2;
    }

    // Both match site CE = higher weight
    if (pageA.matchesSiteCE && pageB.matchesSiteCE) {
        weight += 0.15;
    }

    // Both match site SC = higher weight
    if (pageA.matchesSiteSC && pageB.matchesSiteSC) {
        weight += 0.15;
    }

    return Math.min(weight, 1);
}

function calculateCoOccurrence(
    pageA: PageSemanticInfo,
    pageB: PageSemanticInfo,
    eavs: SemanticTriple[]
): number {
    // Find shared entities in EAVs
    const entitiesA = new Set<string>();
    const entitiesB = new Set<string>();

    for (const eav of eavs) {
        if (eav.context === pageA.url) {
            entitiesA.add(eav.entity.toLowerCase());
        }
        if (eav.context === pageB.url) {
            entitiesB.add(eav.entity.toLowerCase());
        }
    }

    // Also add extracted CEs
    entitiesA.add(pageA.extractedCE.toLowerCase());
    entitiesB.add(pageB.extractedCE.toLowerCase());

    // Calculate co-occurrence score
    let coOccurring = 0;
    entitiesA.forEach(entity => {
        if (entitiesB.has(entity)) coOccurring++;
    });

    // Normalize by smaller set size
    const minSize = Math.min(entitiesA.size, entitiesB.size);
    if (minSize === 0) return 0.5; // Default if no entities

    return 0.5 + (coOccurring / minSize) * 0.5; // Scale from 0.5-1.0
}

// =============================================================================
// CLUSTER IDENTIFICATION
// =============================================================================

function identifyClusters(
    pages: PageSemanticInfo[],
    distances: SemanticDistanceMap[]
): EntityCluster[] {
    const clusters: EntityCluster[] = [];

    // Build adjacency map for pages with distance < 0.5
    const adjacency = new Map<string, Set<string>>();
    for (const page of pages) {
        adjacency.set(page.url, new Set());
    }

    for (const dist of distances) {
        if (dist.distance < 0.5) {
            adjacency.get(dist.pageA)?.add(dist.pageB);
            adjacency.get(dist.pageB)?.add(dist.pageA);
        }
    }

    // Find connected components using BFS
    const visited = new Set<string>();
    let clusterId = 1;

    for (const page of pages) {
        if (visited.has(page.url)) continue;

        const clusterPages: string[] = [];
        const queue = [page.url];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;

            visited.add(current);
            clusterPages.push(current);

            const neighbors = adjacency.get(current) || new Set();
            neighbors.forEach(neighbor => {
                if (!visited.has(neighbor)) {
                    queue.push(neighbor);
                }
            });
        }

        if (clusterPages.length > 0) {
            // Find central entity for cluster (most common CE)
            const ceCount = new Map<string, number>();
            for (const url of clusterPages) {
                const p = pages.find(pg => pg.url === url);
                if (p) {
                    const ce = p.extractedCE.toLowerCase();
                    ceCount.set(ce, (ceCount.get(ce) || 0) + 1);
                }
            }

            let centralEntity = '';
            let maxCount = 0;
            ceCount.forEach((count, ce) => {
                if (count > maxCount) {
                    maxCount = count;
                    centralEntity = ce;
                }
            });

            // Calculate cohesion score
            const cohesionScore = calculateClusterCohesion(clusterPages, distances);

            // Get related entities
            const relatedEntities: string[] = [];
            ceCount.forEach((_, ce) => {
                if (ce !== centralEntity) {
                    relatedEntities.push(ce);
                }
            });

            clusters.push({
                id: `cluster_${clusterId++}`,
                centralEntity,
                relatedEntities,
                pageCount: clusterPages.length,
                cohesionScore,
                pages: clusterPages
            });
        }
    }

    return clusters;
}

function calculateClusterCohesion(
    clusterPages: string[],
    distances: SemanticDistanceMap[]
): number {
    if (clusterPages.length < 2) return 1;

    let totalDistance = 0;
    let pairCount = 0;

    for (const dist of distances) {
        if (clusterPages.includes(dist.pageA) && clusterPages.includes(dist.pageB)) {
            totalDistance += dist.distance;
            pairCount++;
        }
    }

    if (pairCount === 0) return 1;

    // Cohesion = 1 - average distance (higher = better)
    return 1 - (totalDistance / pairCount);
}

// =============================================================================
// ORPHAN PAGE DETECTION
// =============================================================================

function findOrphanPages(
    pages: PageSemanticInfo[],
    clusters: EntityCluster[]
): string[] {
    const clusteredPages = new Set<string>();
    for (const cluster of clusters) {
        for (const page of cluster.pages) {
            clusteredPages.add(page);
        }
    }

    // Pages in single-page clusters with low confidence are orphans
    const orphans: string[] = [];
    for (const page of pages) {
        if (!clusteredPages.has(page.url)) {
            orphans.push(page.url);
        } else {
            // Check if in a cluster by itself
            const pageCluster = clusters.find(c => c.pages.includes(page.url));
            if (pageCluster && pageCluster.pageCount === 1 && page.confidence < 0.5) {
                orphans.push(page.url);
            }
        }
    }

    return orphans;
}

// =============================================================================
// KG ISSUE IDENTIFICATION
// =============================================================================

function identifyKGIssues(
    eavs: SemanticTriple[],
    pages: PageSemanticInfo[],
    clusters: EntityCluster[]
): KGIssue[] {
    const issues: KGIssue[] = [];

    // Check for inconsistent values
    const entityAttrValues = new Map<string, Map<string, string[]>>();
    for (const eav of eavs) {
        const entityKey = eav.entity.toLowerCase();
        if (!entityAttrValues.has(entityKey)) {
            entityAttrValues.set(entityKey, new Map());
        }
        const attrKey = eav.attribute.toLowerCase();
        if (!entityAttrValues.get(entityKey)!.has(attrKey)) {
            entityAttrValues.get(entityKey)!.set(attrKey, []);
        }
        entityAttrValues.get(entityKey)!.get(attrKey)!.push(eav.value);
    }

    entityAttrValues.forEach((attrs, entity) => {
        attrs.forEach((values, attr) => {
            const uniqueValues = new Set(values.map(v => v.toLowerCase().trim()));
            if (uniqueValues.size > 1 && !isExpectedMultiValue(attr)) {
                issues.push({
                    type: 'inconsistent_value',
                    severity: 'high',
                    entity,
                    attribute: attr,
                    message: `Entity "${entity}" has inconsistent values for "${attr}": ${Array.from(uniqueValues).join(', ')}`,
                    affectedPages: [], // Would need page context in EAVs
                    recommendation: 'Standardize the value for this attribute across all pages'
                });
            }
        });
    });

    // Check for orphan entities (entities with no connections)
    const connectedEntities = new Set<string>();
    for (const eav of eavs) {
        connectedEntities.add(eav.entity.toLowerCase());
    }

    for (const page of pages) {
        const ce = page.extractedCE.toLowerCase();
        if (!connectedEntities.has(ce) && page.segment === 'core') {
            issues.push({
                type: 'orphan_entity',
                severity: 'medium',
                entity: page.extractedCE,
                message: `Core page entity "${page.extractedCE}" has no EAV definitions`,
                affectedPages: [page.url],
                recommendation: 'Add EAV triples to define this entity\'s attributes and relationships'
            });
        }
    }

    // Check for weak cluster connections
    for (const cluster of clusters) {
        if (cluster.cohesionScore < 0.3) {
            issues.push({
                type: 'weak_connection',
                severity: 'medium',
                entity: cluster.centralEntity,
                message: `Cluster around "${cluster.centralEntity}" has weak cohesion (${(cluster.cohesionScore * 100).toFixed(0)}%)`,
                affectedPages: cluster.pages,
                recommendation: 'Strengthen semantic connections between pages or consider restructuring the topic cluster'
            });
        }
    }

    // Check for missing key attributes
    const corePages = pages.filter(p => p.segment === 'core');
    for (const page of corePages) {
        const pageEavs = eavs.filter(e =>
            e.entity.toLowerCase() === page.extractedCE.toLowerCase()
        );

        const attributes = new Set(pageEavs.map(e => e.attribute.toLowerCase()));

        // Check for essential attributes
        const essentialAttributes = ['definition', 'type', 'purpose', 'benefit'];
        const missing = essentialAttributes.filter(attr =>
            !Array.from(attributes).some(a => a.includes(attr))
        );

        if (missing.length > 2) {
            issues.push({
                type: 'missing_attribute',
                severity: 'low',
                entity: page.extractedCE,
                message: `Entity "${page.extractedCE}" missing common attributes: ${missing.join(', ')}`,
                affectedPages: [page.url],
                recommendation: 'Consider adding these attributes to provide comprehensive entity coverage'
            });
        }
    }

    return issues;
}

function isExpectedMultiValue(attribute: string): boolean {
    // Some attributes naturally have multiple values
    const multiValueAttrs = ['type', 'category', 'feature', 'benefit', 'use case', 'example'];
    return multiValueAttrs.some(mv => attribute.toLowerCase().includes(mv));
}

// =============================================================================
// COVERAGE CALCULATION
// =============================================================================

function calculateCoverage(eavs: SemanticTriple[], pages: PageSemanticInfo[]) {
    // EAV coverage: % of pages with at least one EAV
    const pagesWithEav = new Set<string>();
    for (const eav of eavs) {
        if (eav.context) {
            pagesWithEav.add(eav.context);
        }
    }
    const eavCoverage = pages.length > 0
        ? (pagesWithEav.size / pages.length) * 100
        : 0;

    // Attribute completeness: average attributes per entity
    const entityAttrs = new Map<string, Set<string>>();
    for (const eav of eavs) {
        const key = eav.entity.toLowerCase();
        if (!entityAttrs.has(key)) {
            entityAttrs.set(key, new Set());
        }
        entityAttrs.get(key)!.add(eav.attribute.toLowerCase());
    }

    let totalAttrs = 0;
    entityAttrs.forEach(attrs => {
        totalAttrs += attrs.size;
    });
    const avgAttrs = entityAttrs.size > 0 ? totalAttrs / entityAttrs.size : 0;
    const attributeCompleteness = Math.min((avgAttrs / 5) * 100, 100); // 5 attrs = 100%

    // Value consistency: % of attributes with consistent values
    let consistentCount = 0;
    let totalCount = 0;

    const entityAttrValues = new Map<string, Map<string, string[]>>();
    for (const eav of eavs) {
        const entityKey = eav.entity.toLowerCase();
        if (!entityAttrValues.has(entityKey)) {
            entityAttrValues.set(entityKey, new Map());
        }
        const attrKey = eav.attribute.toLowerCase();
        if (!entityAttrValues.get(entityKey)!.has(attrKey)) {
            entityAttrValues.get(entityKey)!.set(attrKey, []);
        }
        entityAttrValues.get(entityKey)!.get(attrKey)!.push(eav.value);
    }

    entityAttrValues.forEach(attrs => {
        attrs.forEach((values, attr) => {
            totalCount++;
            const uniqueValues = new Set(values.map(v => v.toLowerCase().trim()));
            if (uniqueValues.size === 1 || isExpectedMultiValue(attr)) {
                consistentCount++;
            }
        });
    });

    const valueConsistency = totalCount > 0
        ? (consistentCount / totalCount) * 100
        : 100;

    return {
        eavCoverage: Math.round(eavCoverage),
        attributeCompleteness: Math.round(attributeCompleteness),
        valueConsistency: Math.round(valueConsistency)
    };
}

// =============================================================================
// CONSISTENCY SCORE
// =============================================================================

function calculateConsistencyScore(
    issues: KGIssue[],
    coverage: { eavCoverage: number; attributeCompleteness: number; valueConsistency: number }
): number {
    // Start with 100 and deduct for issues
    let score = 100;

    // Deduct for issues by severity
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const mediumIssues = issues.filter(i => i.severity === 'medium').length;
    const lowIssues = issues.filter(i => i.severity === 'low').length;

    score -= highIssues * 10;
    score -= mediumIssues * 5;
    score -= lowIssues * 2;

    // Weight with coverage metrics
    const coverageAvg = (coverage.eavCoverage + coverage.attributeCompleteness + coverage.valueConsistency) / 3;
    score = (score * 0.6) + (coverageAvg * 0.4);

    return Math.max(0, Math.min(100, Math.round(score)));
}
