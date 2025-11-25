
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';

interface WorkbenchPanelProps {
    isLoading: { [key: string]: boolean | undefined };
    canGenerateBriefs: boolean;
    briefGenerationStatus: string | null;
    onAnalyzeKnowledgeDomain: () => void;
    onAddTopicManually: () => void;
    onViewInternalLinking: () => void;
    onUploadGsc: () => void;
    onGenerateAllBriefs: () => void;
    onExportData: (format: 'csv' | 'xlsx') => void;
}

const WorkbenchPanel: React.FC<WorkbenchPanelProps> = ({
    isLoading,
    canGenerateBriefs,
    briefGenerationStatus,
    onAnalyzeKnowledgeDomain,
    onAddTopicManually,
    onViewInternalLinking,
    onUploadGsc,
    onGenerateAllBriefs,
    onExportData
}) => {
    const [showExportMenu, setShowExportMenu] = useState(false);

    return (
        <Card className="p-6 relative">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Workbench</h2>
                <div className="relative">
                    <Button 
                        variant="secondary" 
                        className="text-sm !py-1 !px-3" 
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={isLoading.export}
                    >
                        {isLoading.export ? <Loader className="w-4 h-4" /> : 'Export Data ▼'}
                    </Button>
                    {showExportMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20">
                            <button 
                                onClick={() => { onExportData('xlsx'); setShowExportMenu(false); }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            >
                                Download as Excel (.xlsx)
                            </button>
                            <button 
                                onClick={() => { onExportData('csv'); setShowExportMenu(false); }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            >
                                Download as CSV
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Button onClick={onAnalyzeKnowledgeDomain} disabled={isLoading.knowledgeDomain}>
                    {isLoading.knowledgeDomain ? <Loader className="w-5 h-5 mx-auto" /> : 'Analyze Domain'}
                </Button>
                <Button onClick={onAddTopicManually} variant="secondary">Add Topic Manually</Button>
                <Button onClick={onViewInternalLinking} variant="secondary">View Internal Linking</Button> 
                <Button onClick={onUploadGsc} variant="secondary">Upload GSC CSV</Button>
                <Button onClick={onGenerateAllBriefs} disabled={isLoading.briefs || !canGenerateBriefs} title={!canGenerateBriefs ? "Define Pillars and Analyze Domain to enable." : ""} className="lg:col-span-1 bg-green-700 hover:bg-green-800">
                        {isLoading.briefs ? <div className="flex items-center justify-center gap-2"><Loader className="h-5 w-5" /> <span>{briefGenerationStatus || 'Generating...'}</span></div> : 'Generate All Briefs'}
                </Button>
            </div>
            {/* Click backdrop to close menu */}
            {showExportMenu && (
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
            )}
        </Card>
    );
};

export default WorkbenchPanel;
