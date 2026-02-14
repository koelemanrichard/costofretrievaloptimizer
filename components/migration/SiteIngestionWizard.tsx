import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Loader } from '../ui/Loader';
import * as migrationService from '../../services/migrationService';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';

interface SiteIngestionWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    inventoryCount?: number;
}

export const SiteIngestionWizard: React.FC<SiteIngestionWizardProps> = ({ isOpen, onClose, onComplete, inventoryCount = 0 }) => {
    const { state, dispatch } = useAppState();
    const { activeProjectId, businessInfo } = state;
    
    // Wizard State
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1 State
    const [sitemapUrl, setSitemapUrl] = useState('');
    
    // Step 2 State
    const [gscFile, setGscFile] = useState<File | null>(null);
    const [gscProperty, setGscProperty] = useState<{ id: string; property_id: string; property_name: string | null; last_synced_at: string | null } | null>(null);
    const [gscCheckDone, setGscCheckDone] = useState(false);

    // Shared State
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [progress, setProgress] = useState<{current: number, total: number} | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successCount, setSuccessCount] = useState<number | null>(null);

    // Check for linked GSC property when wizard opens
    useEffect(() => {
        if (!isOpen || !activeProjectId || gscCheckDone) return;
        migrationService.getLinkedGscProperty(
            activeProjectId,
            businessInfo.supabaseUrl,
            businessInfo.supabaseAnonKey
        ).then(prop => {
            setGscProperty(prop);
            setGscCheckDone(true);
        }).catch(() => setGscCheckDone(true));
    }, [isOpen, activeProjectId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, gscCheckDone]);

    if (!isOpen) return null;

    const handleGscApiImport = async () => {
        if (!activeProjectId) return;

        setIsProcessing(true);
        setError(null);
        setStatusMessage('Fetching GSC data...');
        setProgress(null);

        try {
            const count = await migrationService.importGscFromApi(
                activeProjectId,
                businessInfo.supabaseUrl,
                businessInfo.supabaseAnonKey,
                (current, total) => setProgress({ current, total }),
                (msg) => setStatusMessage(msg)
            );

            dispatch({ type: 'SET_NOTIFICATION', payload: `Imported ${count} pages from GSC.` });

            setTimeout(() => {
                setStep(3);
                setIsProcessing(false);
                setProgress(null);
                setStatusMessage('');
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'GSC API import failed.');
            setIsProcessing(false);
        }
    };

    const handleSitemapImport = async () => {
        if (!activeProjectId) {
            setError("No active project found.");
            return;
        }
        if (!sitemapUrl) {
            setError("Please enter a Sitemap URL.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setStatusMessage('Fetching and parsing sitemap...');
        setProgress(null);
        setSuccessCount(null);

        try {
            const urls = await migrationService.fetchAndParseSitemap(
                sitemapUrl,
                (msg) => setStatusMessage(msg),
                { supabaseUrl: businessInfo.supabaseUrl, supabaseAnonKey: businessInfo.supabaseAnonKey }
            );
            
            if (urls.length === 0) {
                throw new Error("No URLs found in the provided sitemap.");
            }
            
            setSuccessCount(urls.length);
            setStatusMessage(`Found ${urls.length} URLs. Saving to inventory...`);

            await migrationService.initializeInventory(
                activeProjectId, 
                urls, 
                businessInfo.supabaseUrl, 
                businessInfo.supabaseAnonKey,
                (current, total) => setProgress({ current, total })
            );
            
            dispatch({ type: 'SET_NOTIFICATION', payload: `Successfully imported ${urls.length} pages.` });
            
            setTimeout(() => {
                setStep(2);
                setIsProcessing(false);
                setProgress(null);
                setStatusMessage('');
                setSuccessCount(null);
                setError(null);
            }, 1000);
            
        } catch (e) {
            console.error("Import failed:", e);
            setError(e instanceof Error ? e.message : "An unknown error occurred during import.");
            setIsProcessing(false);
        }
    };

    const handleGscImport = async () => {
        if (!activeProjectId || !gscFile) return;

        setIsProcessing(true);
        setError(null);
        setStatusMessage('Reading CSV file...');
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) {
                setError("Failed to read file.");
                setIsProcessing(false);
                return;
            }

            try {
                setStatusMessage('Processing GSC Data...');
                await migrationService.processGscPages(
                    activeProjectId,
                    text,
                    businessInfo.supabaseUrl,
                    businessInfo.supabaseAnonKey,
                    (current, total) => setProgress({ current, total })
                );
                dispatch({ type: 'SET_NOTIFICATION', payload: `GSC Data overlay complete.` });
                
                // Move to Step 3
                setTimeout(() => {
                    setStep(3);
                    setIsProcessing(false);
                    setProgress(null);
                }, 1000);

            } catch (err) {
                setError(err instanceof Error ? err.message : "GSC Import Failed.");
                setIsProcessing(false);
            }
        };
        reader.readAsText(gscFile);
    };

    const handleTechnicalCrawl = async (limit: number) => {
        if (!activeProjectId) return;

        setIsProcessing(true);
        setError(null);
        setStatusMessage('Fetching inventory list...');
        
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            
            // Fetch top pages based on GSC impressions (prioritize high traffic)
            const { data: pages, error } = await supabase
                .from('site_inventory')
                .select('url')
                .eq('project_id', activeProjectId)
                .order('gsc_impressions', { ascending: false })
                .limit(limit);

            if (error) throw error;
            if (!pages || pages.length === 0) throw new Error("No pages found in inventory to crawl.");

            const urls = pages.map(p => p.url);
            
            setStatusMessage(`Starting audit for ${urls.length} pages. This may take a while...`);
            
            await migrationService.runTechnicalCrawl(
                activeProjectId,
                urls,
                businessInfo,
                businessInfo.supabaseUrl,
                businessInfo.supabaseAnonKey,
                (current, total) => {
                    setProgress({ current, total });
                    setStatusMessage(`Auditing ${current}/${total}: Calculating Cost of Retrieval...`);
                }
            );

            dispatch({ type: 'SET_NOTIFICATION', payload: `Technical audit complete for ${urls.length} pages.` });
            onComplete();

        } catch (err) {
            console.error("Crawl failed:", err);
            setError(err instanceof Error ? err.message : "Technical crawl failed.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Import Website Inventory</h2>
                            {/* Clickable Tabs */}
                            <div className="flex items-center gap-2 mt-2 text-sm">
                                <button 
                                    onClick={() => !isProcessing && setStep(1)}
                                    className={`px-2 py-0.5 rounded-full transition-colors ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}`}
                                >
                                    1. Sitemap
                                </button>
                                <span className="text-gray-600">→</span>
                                <button 
                                    onClick={() => !isProcessing && setStep(2)}
                                    className={`px-2 py-0.5 rounded-full transition-colors ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}`}
                                >
                                    2. GSC Data
                                </button>
                                <span className="text-gray-600">→</span>
                                <button 
                                    onClick={() => !isProcessing && setStep(3)}
                                    className={`px-2 py-0.5 rounded-full transition-colors ${step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}`}
                                >
                                    3. Technical Audit
                                </button>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>

                    <div className="space-y-6">
                        {/* Step 1: Sitemap */}
                        {step === 1 && (
                            <div>
                                <Label htmlFor="sitemap-url">Sitemap URL</Label>
                                <div className="flex gap-3">
                                    <Input 
                                        id="sitemap-url"
                                        value={sitemapUrl}
                                        onChange={(e) => setSitemapUrl(e.target.value)}
                                        placeholder="https://example.com/sitemap.xml"
                                        disabled={isProcessing}
                                    />
                                    <Button onClick={handleSitemapImport} disabled={isProcessing || !sitemapUrl}>
                                        {isProcessing ? <Loader className="w-4 h-4" /> : 'Fetch & Import'}
                                    </Button>
                                </div>
                                {inventoryCount > 0 && (
                                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded flex justify-between items-center">
                                        <span className="text-sm text-blue-300">
                                            Inventory already contains <strong>{inventoryCount}</strong> pages.
                                        </span>
                                        <Button variant="secondary" className="text-xs py-1 px-3" onClick={() => setStep(2)}>
                                            Skip to GSC Data →
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: GSC Data */}
                        {step === 2 && (
                            <div className="space-y-4">
                                {/* Option A: Fetch from connected GSC */}
                                {gscProperty ? (
                                    <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium text-green-300">Connected GSC Property</h4>
                                                <p className="text-xs text-gray-400 font-mono mt-0.5">{gscProperty.property_id}</p>
                                                {gscProperty.last_synced_at && (
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        Last synced: {new Date(gscProperty.last_synced_at).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                            <Button onClick={handleGscApiImport} disabled={isProcessing}>
                                                {isProcessing ? <Loader className="w-4 h-4" /> : 'Fetch from GSC'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : gscCheckDone ? (
                                    <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                                        <p className="text-xs text-gray-500">
                                            No GSC property linked. Connect one in <strong>Settings &rarr; Search Console</strong> to import directly, or upload a CSV below.
                                        </p>
                                    </div>
                                ) : null}

                                {/* Divider */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 border-t border-gray-700" />
                                    <span className="text-xs text-gray-500 uppercase">or upload CSV</span>
                                    <div className="flex-1 border-t border-gray-700" />
                                </div>

                                {/* Option B: CSV Upload */}
                                <div>
                                    <Label htmlFor="gsc-file">Google Search Console Export (Pages.csv)</Label>
                                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors bg-gray-800/50">
                                        <input
                                            type="file"
                                            id="gsc-file"
                                            accept=".csv"
                                            onChange={(e) => setGscFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                        />
                                        <label htmlFor="gsc-file" className="cursor-pointer flex flex-col items-center">
                                            <span className="text-blue-400 font-medium hover:underline text-sm">
                                                {gscFile ? gscFile.name : "Click to Upload 'Pages.csv'"}
                                            </span>
                                            <span className="text-xs text-gray-500 mt-1">
                                                Export from GSC performance report (Pages tab).
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button variant="secondary" onClick={() => setStep(3)}>Skip to Audit</Button>
                                    <Button onClick={handleGscImport} disabled={!gscFile || isProcessing}>
                                        {isProcessing ? <Loader className="w-4 h-4" /> : 'Process CSV'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Technical Audit */}
                        {step === 3 && (
                            <div>
                                <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded mb-4">
                                    <h4 className="text-yellow-300 font-bold text-sm mb-1">⚠️ Firecrawl Usage Warning</h4>
                                    <p className="text-xs text-gray-300">
                                        This step will scrape pages to calculate the <strong>Cost of Retrieval (CoR)</strong>. 
                                        Each page audit consumes 1 Firecrawl credit.
                                    </p>
                                </div>
                                
                                <Label className="mb-3">Choose Audit Scope</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div 
                                        className="border border-gray-600 bg-gray-800/50 p-4 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-900/10 transition-all"
                                        onClick={() => handleTechnicalCrawl(10)}
                                    >
                                        <span className="block font-bold text-white mb-1">Quick Sample</span>
                                        <span className="text-xs text-gray-400">Top 10 pages (10 credits)</span>
                                    </div>
                                    <div 
                                        className="border border-gray-600 bg-gray-800/50 p-4 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-900/10 transition-all"
                                        onClick={() => handleTechnicalCrawl(50)}
                                    >
                                        <span className="block font-bold text-white mb-1">Priority Audit</span>
                                        <span className="text-xs text-gray-400">Top 50 pages (50 credits)</span>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <Button variant="secondary" onClick={onComplete} disabled={isProcessing}>Finish</Button>
                                </div>
                            </div>
                        )}

                        {/* Status & Progress UI */}
                        {(statusMessage || progress) && (
                            <div className={`p-4 rounded-lg border ${error ? 'bg-red-900/20 border-red-700 text-red-200' : 'bg-blue-900/20 border-blue-700 text-blue-200'}`}>
                                <div className="flex items-center gap-3">
                                    {isProcessing && !error && <Loader className="w-4 h-4 text-blue-400" />}
                                    <div className="flex-grow">
                                        <p className="text-sm font-medium">{statusMessage}</p>
                                        {progress && (
                                            <div className="w-full bg-blue-900/50 h-2 rounded-full mt-2 overflow-hidden">
                                                <div 
                                                    className="bg-blue-400 h-full transition-all duration-300" 
                                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {error && <p className="text-xs mt-2 opacity-90">{error}</p>}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end gap-3">
                     <Button variant="secondary" onClick={onClose} disabled={isProcessing}>Close</Button>
                </div>
            </Card>
        </div>
    );
};