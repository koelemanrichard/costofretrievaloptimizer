
import React, { useEffect } from 'react';
import { AppAction } from '../state/appState';
import { KnowledgeGraph } from '../lib/knowledgeGraph';
import { TopicalMap } from '../types';

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
                    log('Active map has EAVs. Rebuilding knowledge graph...');
                    eavsData.forEach((triple: any) => {
                        if (triple?.subject?.label) kg.addNode({ id: triple.subject.label, term: triple.subject.label, type: triple.subject.type || 'Unknown', definition: '', metadata: { importance: 8, source: 'DB' } });
                        if (triple?.object?.value) kg.addNode({ id: String(triple.object.value), term: String(triple.object.value), type: triple.object.type || 'Unknown', definition: '', metadata: { importance: 5, source: 'DB' } });
                    });
                    log(`KG rebuild complete. Nodes found: ${kg.getNodes().size}.`);
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
