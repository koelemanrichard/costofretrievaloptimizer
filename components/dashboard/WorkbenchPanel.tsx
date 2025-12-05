
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { Input } from '../ui/Input';

interface WorkbenchPanelProps {
    isLoading: { [key: string]: boolean | undefined };
    canGenerateBriefs: boolean;
    briefGenerationStatus: string | null;
    onAnalyzeKnowledgeDomain: () => void;
    onAddTopicManually: () => void;
    onViewInternalLinking: () => void;
    onUploadGsc: () => void;
    onGenerateAllBriefs: () => void;
    onExportData: (format: 'csv' | 'xlsx' | 'zip') => void;
    onQuickAudit: (url: string) => void;
    onScrollToWebsiteStructure?: () => void;
    foundationPagesCount?: number;
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
    onExportData,
    onQuickAudit,
    onScrollToWebsiteStructure,
    foundationPagesCount = 0
}) => {
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [auditUrl, setAuditUrl] = useState('');

    const handleAudit = () => {
        if (auditUrl.trim()) {
            onQuickAudit(auditUrl.trim());
        }
    };

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
                        <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20">
                            <button
                                onClick={() => { onExportData('zip'); setShowExportMenu(false); }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white border-b border-gray-700"
                            >
                                Full Export (.zip)
                                <span className="block text-xs text-gray-500">Topics, briefs, articles</span>
                            </button>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Button onClick={onAnalyzeKnowledgeDomain} disabled={isLoading.knowledgeDomain}>
                    {isLoading.knowledgeDomain ? <Loader className="w-5 h-5 mx-auto" /> : 'Analyze Domain'}
                </Button>
                <Button onClick={onAddTopicManually} variant="secondary">Add Topic Manually</Button>
                <Button onClick={onViewInternalLinking} variant="secondary">View Internal Linking</Button>
                <Button onClick={onUploadGsc} variant="secondary">Upload GSC CSV</Button>
                {onScrollToWebsiteStructure && (
                    <Button onClick={onScrollToWebsiteStructure} variant="secondary" className="relative">
                        Website Structure
                        {foundationPagesCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {foundationPagesCount}
                            </span>
                        )}
                    </Button>
                )}
                <Button onClick={onGenerateAllBriefs} disabled={isLoading.briefs || !canGenerateBriefs} title={!canGenerateBriefs ? "Define Pillars and Analyze Domain to enable." : ""} className="bg-green-700 hover:bg-green-800">
                        {isLoading.briefs ? <div className="flex items-center justify-center gap-2"><Loader className="h-5 w-5" /> <span>{briefGenerationStatus || 'Generating...'}</span></div> : 'Generate All Briefs'}
                </Button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quick Actions</h3>
                <div className="flex gap-2">
                     <div className="flex-grow">
                        <Input
                            placeholder="Enter live URL to audit (e.g. https://example.com/blog/post)"
                            value={auditUrl}
                            onChange={(e) => setAuditUrl(e.target.value)}
                            className="text-sm"
                        />
                     </div>
                     <Button onClick={handleAudit} disabled={isLoading.audit || !auditUrl.trim()} className="whitespace-nowrap">
                        {isLoading.audit ? <Loader className="w-4 h-4" /> : 'Audit Page'}
                     </Button>
                </div>
            </div>

            {/* Click backdrop to close menu */}
            {showExportMenu && (
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
            )}
        </Card>
    );
};

export default WorkbenchPanel;
