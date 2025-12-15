/**
 * PerformanceImportModal
 *
 * Modal for importing GSC CSV exports to track content performance.
 * Handles file upload, URL matching preview, and import confirmation.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useAppState } from '../../state/appState';
import { EnrichedTopic } from '../../types';
import {
    parseGSCCSV,
    matchRowsToTopics,
    importPerformanceData,
    loadExistingBaselines,
    ImportPreview,
    ImportResult
} from '../../services/performanceImportService';

interface PerformanceImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    topics: EnrichedTopic[];
    mapId: string;
    userId: string;
    supabaseUrl: string;
    supabaseKey: string;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

const PerformanceImportModal: React.FC<PerformanceImportModalProps> = ({
    isOpen,
    onClose,
    topics,
    mapId,
    userId,
    supabaseUrl,
    supabaseKey
}) => {
    const { dispatch } = useAppState();
    const [step, setStep] = useState<ImportStep>('upload');
    const [csvContent, setCsvContent] = useState<string>('');
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset modal state when closed
    const handleClose = useCallback(() => {
        setStep('upload');
        setCsvContent('');
        setPreview(null);
        setResult(null);
        setError(null);
        setIsProcessing(false);
        onClose();
    }, [onClose]);

    // Handle file upload
    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setCsvContent(content);
            setError(null);
        };
        reader.onerror = () => {
            setError('Failed to read file');
        };
        reader.readAsText(file);
    }, []);

    // Process CSV and generate preview
    const handlePreview = useCallback(() => {
        if (!csvContent) return;

        setIsProcessing(true);
        setError(null);

        try {
            const rows = parseGSCCSV(csvContent);
            if (rows.length === 0) {
                setError('No valid data rows found in CSV');
                setIsProcessing(false);
                return;
            }

            const preview = matchRowsToTopics(rows, topics);
            setPreview(preview);
            setStep('preview');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse CSV');
        } finally {
            setIsProcessing(false);
        }
    }, [csvContent, topics]);

    // Execute import
    const handleImport = useCallback(async () => {
        if (!preview) return;

        setStep('importing');
        setError(null);

        try {
            const existingBaselines = await loadExistingBaselines(mapId, supabaseUrl, supabaseKey);
            const result = await importPerformanceData(
                preview,
                mapId,
                userId,
                existingBaselines,
                supabaseUrl,
                supabaseKey
            );

            setResult(result);
            setStep('complete');

            if (result.success) {
                dispatch({
                    type: 'SET_NOTIFICATION',
                    payload: `Imported performance data for ${result.snapshotsCreated} topics${result.baselinesSet > 0 ? ` (${result.baselinesSet} baselines set)` : ''}`
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
            setStep('preview');
        }
    }, [preview, mapId, userId, supabaseUrl, supabaseKey, dispatch]);

    // Summary stats for preview
    const previewStats = useMemo(() => {
        if (!preview) return null;
        const matchRate = preview.totalRows > 0
            ? ((preview.matched.length / preview.totalRows) * 100).toFixed(1)
            : '0';
        return {
            total: preview.totalRows,
            matched: preview.matched.length,
            unmatched: preview.unmatched.length,
            matchRate
        };
    }, [preview]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white">Import Performance Data</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Upload Step */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            <p className="text-gray-300">
                                Upload a CSV export from Google Search Console to track performance metrics for your topics.
                            </p>
                            <p className="text-sm text-gray-500">
                                The CSV should include: Page URL, Clicks, Impressions, CTR, Position
                            </p>

                            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="csv-upload"
                                />
                                <label
                                    htmlFor="csv-upload"
                                    className="cursor-pointer flex flex-col items-center gap-2"
                                >
                                    <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-gray-300 font-medium">
                                        {csvContent ? 'File loaded' : 'Click to upload CSV'}
                                    </span>
                                    {csvContent && (
                                        <span className="text-green-400 text-sm">CSV ready for processing</span>
                                    )}
                                </label>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preview Step */}
                    {step === 'preview' && preview && previewStats && (
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-gray-800 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-white">{previewStats.total}</div>
                                    <div className="text-xs text-gray-400">Total Rows</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-green-400">{previewStats.matched}</div>
                                    <div className="text-xs text-gray-400">Matched</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-yellow-400">{previewStats.unmatched}</div>
                                    <div className="text-xs text-gray-400">Unmatched</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-400">{previewStats.matchRate}%</div>
                                    <div className="text-xs text-gray-400">Match Rate</div>
                                </div>
                            </div>

                            {/* Matched Topics */}
                            {preview.matched.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-300 mb-2">
                                        Matched Topics ({preview.matched.length})
                                    </h3>
                                    <div className="bg-gray-800 rounded-lg max-h-48 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-700/50 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-gray-400">Topic</th>
                                                    <th className="px-3 py-2 text-right text-gray-400">Clicks</th>
                                                    <th className="px-3 py-2 text-right text-gray-400">Impressions</th>
                                                    <th className="px-3 py-2 text-right text-gray-400">CTR</th>
                                                    <th className="px-3 py-2 text-right text-gray-400">Position</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.matched.slice(0, 50).map((item) => (
                                                    <tr key={item.topic_id} className="border-t border-gray-700/50">
                                                        <td className="px-3 py-2 text-gray-300 truncate max-w-[200px]" title={item.topic_title}>
                                                            {item.topic_title}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-gray-300">{item.clicks}</td>
                                                        <td className="px-3 py-2 text-right text-gray-300">{item.impressions}</td>
                                                        <td className="px-3 py-2 text-right text-gray-300">{(item.ctr * 100).toFixed(1)}%</td>
                                                        <td className="px-3 py-2 text-right text-gray-300">{item.position.toFixed(1)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {preview.matched.length > 50 && (
                                            <div className="px-3 py-2 text-center text-gray-500 text-sm">
                                                And {preview.matched.length - 50} more...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Unmatched URLs */}
                            {preview.unmatched.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-yellow-400 mb-2">
                                        Unmatched URLs ({preview.unmatched.length})
                                    </h3>
                                    <div className="bg-gray-800 rounded-lg max-h-32 overflow-y-auto p-3">
                                        <div className="space-y-1 text-xs text-gray-400">
                                            {preview.unmatched.slice(0, 10).map((item, idx) => (
                                                <div key={idx} className="truncate" title={item.url}>
                                                    {item.url}
                                                </div>
                                            ))}
                                            {preview.unmatched.length > 10 && (
                                                <div className="text-gray-500">
                                                    And {preview.unmatched.length - 10} more...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Importing Step */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-gray-300">Importing performance data...</p>
                        </div>
                    )}

                    {/* Complete Step */}
                    {step === 'complete' && result && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500' : 'bg-yellow-500/10 border border-yellow-500'}`}>
                                <div className="flex items-center gap-3">
                                    {result.success ? (
                                        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    )}
                                    <div>
                                        <h3 className={`font-semibold ${result.success ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {result.success ? 'Import Complete' : 'Import Completed with Errors'}
                                        </h3>
                                        <p className="text-gray-300 text-sm">
                                            {result.snapshotsCreated} snapshots created
                                            {result.baselinesSet > 0 && ` (${result.baselinesSet} baselines set)`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
                                    <h4 className="text-red-400 font-medium mb-2">Errors:</h4>
                                    <ul className="text-red-300 text-sm space-y-1">
                                        {result.errors.map((err, idx) => (
                                            <li key={idx}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
                    {step === 'upload' && (
                        <>
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePreview}
                                disabled={!csvContent || isProcessing}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isProcessing ? 'Processing...' : 'Preview Import'}
                            </button>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <button
                                onClick={() => setStep('upload')}
                                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!preview || preview.matched.length === 0}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Import {preview?.matched.length || 0} Topics
                            </button>
                        </>
                    )}

                    {step === 'complete' && (
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PerformanceImportModal;
