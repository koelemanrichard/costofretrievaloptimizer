



import React, { useState, useCallback } from 'react';
// FIX: Corrected import path to be a relative path.
import { GscRow, GscOpportunity } from '../types';
// FIX: Corrected import path to be a relative path.
import * as gscService from '../services/gscService';
// FIX: Corrected import path to be a relative path.
import { useAppState } from '../state/appState';
// FIX: Corrected import path to be a relative path.
import { Card } from './ui/Card';
// FIX: Corrected import path to be a relative path.
import { Button } from './ui/Button';
// FIX: Corrected import path to be a relative path.
import { Loader } from './ui/Loader';
// FIX: Corrected import path to be a relative path.
import GscOpportunityItem from './GscOpportunityItem';

interface GscExpansionHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (gscData: GscRow[]) => void;
  onAddTopic: (title: string, description: string) => void;
}

const GscExpansionHubModal: React.FC<GscExpansionHubModalProps> = ({ isOpen, onClose, onAnalyze, onAddTopic }) => {
    const { state } = useAppState();
    const { isLoading, gscOpportunities } = state;
    const [gscData, setGscData] = useState<GscRow[] | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileError(null);
            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target?.result as string;
                try {
                    const parsedData = await gscService.parseGscCsv(text);
                    setGscData(parsedData);
                } catch (error) {
                    setFileError(error instanceof Error ? error.message : "Failed to parse CSV file.");
                }
            };
            reader.readAsText(file);
        }
    };

    const handleAnalyze = () => {
        if (gscData) {
            onAnalyze(gscData);
        }
    };

    const handleAdd = (title: string) => {
        const desc = `A new topic suggested by GSC data analysis for the query: "${title}".`;
        onAddTopic(title, desc);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-white">GSC Expansion Hub</h2>
                    <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
                </header>
                <div className="p-6 overflow-y-auto">
                    {!gscData ? (
                        <div>
                            <p className="text-gray-400 mb-4">Upload a CSV export from Google Search Console containing your top queries. The AI will analyze it to find content gaps and opportunities.</p>
                            <input type="file" accept=".csv" onChange={handleFileChange} className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"/>
                            {fileError && <p className="text-red-500 mt-2">{fileError}</p>}
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Parsed GSC Data ({gscData.length} rows)</h3>
                            <Button onClick={handleAnalyze} disabled={isLoading.gsc}>
                                {isLoading.gsc ? <Loader /> : 'Analyze with AI'}
                            </Button>
                            
                            {isLoading.gsc && <p className="text-gray-400 mt-2">AI is analyzing your data... this may take a moment.</p>}

                            {gscOpportunities && gscOpportunities.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-green-400 mb-3">AI-Identified Opportunities</h3>
                                    <div className="space-y-3">
                                        {gscOpportunities.map(opp => (
                                            <GscOpportunityItem key={opp.query} opportunity={opp} onAddTopic={handleAdd} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
export default GscExpansionHubModal;