// components/screens/MapSelectionScreen.tsx
import React, { useState } from 'react';
import { TopicalMap } from '../../types';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import MergeMapWizard from '../merge/MergeMapWizard';
import { useAppState } from '../../state/appState';

interface MapSelectionScreenProps {
  projectName: string;
  topicalMaps: TopicalMap[];
  onSelectMap: (mapId: string) => void;
  onCreateNewMap: () => void;
  onStartAnalysis: () => void;
  onBackToProjects: () => void;
  onInitiateDeleteMap: (map: TopicalMap) => void;
}

const MapSelectionScreen: React.FC<MapSelectionScreenProps> = ({
    projectName,
    topicalMaps,
    onSelectMap,
    onCreateNewMap,
    onStartAnalysis,
    onBackToProjects,
    onInitiateDeleteMap
}) => {
    const { state } = useAppState(); // Get state for loading status
    const [isMergeWizardOpen, setIsMergeWizardOpen] = useState(false);
    
    return (
        <div className="max-w-5xl mx-auto w-full space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold text-white">{projectName}</h1>
                    <p className="text-lg text-gray-400 mt-1">Select a topical map or create a new one.</p>
                </div>
                <Button onClick={onBackToProjects} variant="secondary">Back to Projects</Button>
            </header>

            {/* Dual-Path Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Path A: New Strategy */}
                <div
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-600 transition-colors cursor-pointer group"
                    onClick={onCreateNewMap}
                >
                    <div className="w-12 h-12 rounded-lg bg-blue-900/30 border border-blue-700/50 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">New Strategy</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Build your content strategy from the ground up. Define your business context,
                        SEO pillars, and generate an ideal topical map.
                    </p>
                    <p className="text-xs text-gray-500 mb-4">Best for: New websites, major pivots, greenfield content</p>
                    <Button variant="primary" className="w-full group-hover:bg-blue-500">
                        Start Fresh
                    </Button>
                </div>

                {/* Path B: Optimize Existing Site */}
                <div
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-green-600 transition-colors cursor-pointer group"
                    onClick={onStartAnalysis}
                >
                    <div className="w-12 h-12 rounded-lg bg-green-900/30 border border-green-700/50 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Optimize Existing Site</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Import your site, analyze what you have, discover your SEO pillars from
                        existing content, and build an optimized strategy around your reality.
                    </p>
                    <p className="text-xs text-gray-500 mb-4">Best for: Existing websites, site optimization, content audits</p>
                    <Button onClick={onStartAnalysis} variant="secondary" className="w-full border-green-700 text-green-400 hover:bg-green-900/30">
                        Import Site
                    </Button>
                </div>
            </div>

            {/* Existing Maps & Tools */}
            {(topicalMaps.length > 0) && (
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Your Maps</h3>
                        {topicalMaps.length >= 2 && (
                            <Button
                                onClick={() => setIsMergeWizardOpen(true)}
                                variant="secondary"
                                size="sm"
                            >
                                Merge Maps
                            </Button>
                        )}
                    </div>
                    {state.isLoading.map ? (
                        <div className="flex justify-center py-8"><SmartLoader context="loading" size="lg" /></div>
                    ) : (
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                            {topicalMaps.map(map => (
                                <div key={map.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex justify-between items-center hover:border-gray-600 transition-colors">
                                    <div>
                                        <p className="font-semibold text-white">{map.name}</p>
                                        <p className="text-xs text-gray-500">Created: {new Date(map.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => onInitiateDeleteMap(map)} variant="secondary" className="!p-2 !bg-red-900/50 hover:!bg-red-800/50" title="Delete Map">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </Button>
                                        <Button onClick={() => onSelectMap(map.id)} variant="secondary">Load Map</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Merge Wizard Modal */}
            <MergeMapWizard
                isOpen={isMergeWizardOpen}
                onClose={() => setIsMergeWizardOpen(false)}
                availableMaps={topicalMaps}
            />
        </div>
    );
};

export default MapSelectionScreen;
