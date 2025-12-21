import React, { useState, useCallback, useId } from 'react';
import { GscRow, GscOpportunity } from '../../types';
import * as gscService from '../../services/gscService';
import { useAppState } from '../../state/appState';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import GscOpportunityItem from '../GscOpportunityItem';
import { Modal } from '../ui/Modal';

interface GscExpansionHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (gscData: GscRow[]) => void;
  onAddTopic: (title: string, description: string) => void;
}

const GscExpansionHubModal: React.FC<GscExpansionHubModalProps> = ({ isOpen, onClose, onAnalyze, onAddTopic }) => {
    const { state } = useAppState();
    const { isLoading, gscOpportunities } = state;
    const fileInputId = useId();
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
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="GSC Expansion Hub"
            description="Upload Google Search Console data to discover content opportunities"
            maxWidth="max-w-4xl"
        >
            {!gscData ? (
                <div>
                    <p id={`${fileInputId}-desc`} className="text-gray-400 mb-4">
                        Upload a CSV export from Google Search Console containing your top queries. The AI will analyze it to find content gaps and opportunities.
                    </p>
                    <label htmlFor={fileInputId} className="sr-only">Upload GSC CSV file</label>
                    <input
                        id={fileInputId}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        aria-describedby={`${fileInputId}-desc`}
                        className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    {fileError && <p className="text-red-500 mt-2" role="alert">{fileError}</p>}
                </div>
            ) : (
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Parsed GSC Data ({gscData.length} rows)</h3>
                    <Button onClick={handleAnalyze} disabled={isLoading.gsc}>
                        {isLoading.gsc ? <Loader /> : 'Analyze with AI'}
                    </Button>

                    {isLoading.gsc && (
                        <p className="text-gray-400 mt-2" aria-live="polite">
                            AI is analyzing your data... this may take a moment.
                        </p>
                    )}

                    {gscOpportunities && gscOpportunities.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-green-400 mb-3">AI-Identified Opportunities</h3>
                            <div className="space-y-3" role="list" aria-label="Content opportunities">
                                {gscOpportunities.map(opp => (
                                    <GscOpportunityItem key={opp.query} opportunity={opp} onAddTopic={handleAdd} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default GscExpansionHubModal;