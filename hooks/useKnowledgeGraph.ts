
import React, { useEffect } from 'react';
import { AppAction } from '../state/appState';
import { KnowledgeGraph } from '../lib/knowledgeGraph';
import { TopicalMap, SemanticTriple, AttributeCategory, AttributeClass } from '../types';

/**
 * Generate a URL-safe node ID from a term.
 */
const generateNodeId = (term: string): string => {
    return `node_${term.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
};

/**
 * Generate an edge ID from source and target node IDs.
 */
const generateEdgeId = (sourceId: string, targetId: string, relation: string): string => {
    const relationSlug = relation.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `edge_${sourceId}_${relationSlug}_${targetId}`;
};

export const useKnowledgeGraph = (
    activeMap: TopicalMap | undefined,
    knowledgeGraph: KnowledgeGraph | null,
    dispatch: React.Dispatch<AppAction>
) => {
    useEffect(() => {
        const hydrateKnowledgeGraph = () => {
            const log = (message: string, status: 'info' | 'failure' = 'info') => {
                dispatch({ type: 'LOG_EVENT', payload: { service: 'KG Hydration', message, status, timestamp: Date.now() } });
            };

            if (!activeMap) return;

            // Always create a fresh KG instance
            const kg = new KnowledgeGraph();

            try {
                let eavsData = activeMap.eavs;

                if (typeof eavsData === 'string') {
                    try {
                        eavsData = JSON.parse(eavsData);
                    } catch (e) {
                        log('Failed to parse EAVs JSON string from database.', 'failure');
                        eavsData = [];
                    }
                }

                if (Array.isArray(eavsData) && eavsData.length > 0) {
                    log('Active map has EAVs. Rebuilding knowledge graph with nodes AND edges...');

                    let nodeCount = 0;
                    let edgeCount = 0;

                    eavsData.forEach((triple: SemanticTriple, index: number) => {
                        // Validate triple structure
                        if (!triple?.subject?.label || !triple?.object?.value) {
                            return; // Skip malformed triples
                        }

                        const subjectLabel = triple.subject.label;
                        const objectValue = String(triple.object.value);
                        const subjectId = generateNodeId(subjectLabel);
                        const objectId = generateNodeId(objectValue);

                        // Create subject node (entity)
                        if (!kg.getNode(subjectId)) {
                            kg.addNode({
                                id: subjectId,
                                term: subjectLabel,
                                type: triple.subject.type || 'Entity',
                                definition: '',
                                metadata: {
                                    importance: 8,
                                    source: 'EAV',
                                    isSubject: true
                                }
                            });
                            nodeCount++;
                        }

                        // Create object node (value)
                        if (!kg.getNode(objectId)) {
                            kg.addNode({
                                id: objectId,
                                term: objectValue,
                                type: triple.object.type || 'Value',
                                definition: triple.object.unit ? `Unit: ${triple.object.unit}` : '',
                                metadata: {
                                    importance: 5,
                                    source: 'EAV',
                                    isSubject: false,
                                    unit: triple.object.unit,
                                    truthRange: triple.object.truth_range
                                }
                            });
                            nodeCount++;
                        }

                        // Create edge from predicate (THE KEY FIX!)
                        const relation = triple.predicate?.relation || 'has_attribute';
                        const edgeId = generateEdgeId(subjectId, objectId, relation);

                        if (!kg.getEdges().has(edgeId)) {
                            kg.addEdge({
                                id: edgeId,
                                source: subjectId,
                                target: objectId,
                                relation: relation,
                                metadata: {
                                    category: triple.predicate?.category as AttributeCategory || undefined,
                                    classification: triple.predicate?.classification as AttributeClass || undefined,
                                    predicateType: triple.predicate?.type,
                                    source: 'EAV',
                                    eavIndex: index
                                }
                            });
                            edgeCount++;
                        }
                    });

                    log(`KG rebuild complete. Nodes: ${nodeCount}, Edges: ${edgeCount}`);

                    // Log statistics
                    const stats = kg.getStatistics();
                    if (stats.edgeCount > 0) {
                        const categoryInfo = Object.entries(stats.categoryDistribution)
                            .map(([cat, count]) => `${cat}: ${count}`)
                            .join(', ');
                        log(`Edge categories: ${categoryInfo || 'None categorized'}`);
                    }
                } else {
                    log('No EAVs found or invalid format. Initializing empty Knowledge Graph.');
                }

                if (!knowledgeGraph) {
                     dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: kg });
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'An unknown error occurred during KG rebuild.';
                log(`KG Hydration failed: ${message}`, 'failure');
                dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: new KnowledgeGraph() });
            }
        };

        hydrateKnowledgeGraph();
    }, [activeMap, knowledgeGraph, dispatch]);
};
