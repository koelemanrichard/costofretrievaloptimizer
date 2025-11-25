// components/MapSelectionScreen.tsx
import React from 'react';
import { TopicalMap } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';

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
    
    return (
        <div className="max-w-6xl w-full mx-auto space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold text-white">{projectName}</h1>
                    <p className="text-lg text-gray-400 mt-1">Select a topical map, create a new one, or analyze your website.</p>
                </div>
                <Button onClick={onBackToProjects} variant="secondary">Back to Projects</Button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Actions */}
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <Card className="p-8 flex flex-col items-center justify-center text-center">
                        <h2 className="text-2xl font-bold text-white">Create New Topical Map</h2>
                        <p className="text-gray-400 mt-2 flex-grow">Start from scratch with our guided wizard to build a content strategy based on your business goals.</p>
                        <Button onClick={onCreateNewMap} className="mt-6 w-full">Start Wizard</Button>
                    </Card>
                    <Card className="p-8 flex flex-col items-center justify-center text-center">
                        <h2 className="text-2xl font-bold text-white">Analyze Existing Website</h2>
                        <p className="text-gray-400 mt-2 flex-grow">Crawl your live website to automatically discover its current topical map and get AI-powered improvement suggestions.</p>
                        <Button onClick={onStartAnalysis} variant="secondary" className="mt-6 w-full">Start Analysis</Button>
                    </Card>
                </div>

                {/* Existing Maps */}
                <div className="lg:col-span-2">
                    <Card className="p-8 h-full">
                        <h2 className="text-2xl font-bold text-white mb-6">Existing Topical Maps</h2>
                        {state.isLoading.map ? <div className="flex justify-center"><Loader /></div> :
                         topicalMaps.length === 0 ? (
                            <p className="text-gray-400 text-center">No topical maps have been created for this project yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                {topicalMaps.map(map => (
                                    <Card key={map.id} className="p-4 flex justify-between items-center hover:bg-gray-700/50 transition-colors">
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
                                    </Card>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

// Add this import at the top of the file
import { useAppState } from '../state/appState';
export default MapSelectionScreen;
