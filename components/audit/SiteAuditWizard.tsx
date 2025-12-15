/**
 * Site Audit Wizard Component
 *
 * Multi-step wizard for running site-wide audits:
 * - Configuration step
 * - Progress tracking across 5 phases
 * - Results summary
 */

import React, { useState, useCallback } from 'react';
import {
    runSiteAudit,
    SiteAuditResult,
    AuditProgress,
    AuditPhase,
    PageTechnicalInfo,
    DEFAULT_AUDIT_CONFIG
} from '../../services/ai/siteAudit';
import { BusinessInfo, SemanticTriple, WebsiteType } from '../../types';
import AuditReportView from './AuditReportView';

interface SiteAuditWizardProps {
    projectId: string;
    domain: string;
    businessInfo: BusinessInfo;
    existingPages?: PageTechnicalInfo[];
    existingEavs?: SemanticTriple[];
    onComplete?: (result: SiteAuditResult) => void;
    onClose?: () => void;
}

type WizardStep = 'config' | 'running' | 'results';

const PHASE_NAMES: Record<AuditPhase, string> = {
    0: 'Technical Baseline',
    1: 'Semantic Extraction',
    2: 'Knowledge Graph',
    3: 'Segmentation',
    4: 'Roadmap'
};

const PHASE_DESCRIPTIONS: Record<AuditPhase, string> = {
    0: 'Analyzing page inventory, status codes, and COR metrics',
    1: 'Extracting Central Entity, Source Context, and Search Intent',
    2: 'Building semantic distance map and identifying clusters',
    3: 'Auditing hub-spoke structure and internal linking',
    4: 'Generating prioritized improvement recommendations'
};

export const SiteAuditWizard: React.FC<SiteAuditWizardProps> = ({
    projectId,
    domain,
    businessInfo,
    existingPages = [],
    existingEavs = [],
    onComplete,
    onClose
}) => {
    const [step, setStep] = useState<WizardStep>('config');
    const [progress, setProgress] = useState<AuditProgress | null>(null);
    const [result, setResult] = useState<SiteAuditResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Config options
    const [maxPages, setMaxPages] = useState(DEFAULT_AUDIT_CONFIG.maxPages);
    const [deepCrawl, setDeepCrawl] = useState(DEFAULT_AUDIT_CONFIG.deepCrawl);
    const [skipPhases, setSkipPhases] = useState<AuditPhase[]>([]);

    const handleStartAudit = useCallback(async () => {
        setStep('running');
        setError(null);
        setProgress({
            phase: 0,
            status: 'pending',
            progress: 0,
            currentStep: 'Starting audit...'
        });

        try {
            const auditResult = await runSiteAudit(
                projectId,
                domain,
                businessInfo,
                existingPages,
                existingEavs,
                {
                    maxPages,
                    deepCrawl,
                    skipPhases,
                    websiteType: businessInfo.websiteType || 'INFORMATIONAL'
                },
                {
                    onProgress: (p) => setProgress(p),
                    onPhaseComplete: (phase, _phaseResult) => {
                        console.log(`[SiteAudit] Phase ${phase} complete`);
                    },
                    onError: (phase, err) => {
                        console.error(`[SiteAudit] Phase ${phase} error:`, err);
                        setError(`Phase ${phase} failed: ${err.message}`);
                    }
                }
            );

            setResult(auditResult);
            setStep('results');
            onComplete?.(auditResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStep('config');
        }
    }, [projectId, domain, businessInfo, existingPages, existingEavs, maxPages, deepCrawl, skipPhases, onComplete]);

    const toggleSkipPhase = (phase: AuditPhase) => {
        setSkipPhases(prev =>
            prev.includes(phase)
                ? prev.filter(p => p !== phase)
                : [...prev, phase]
        );
    };

    // Render configuration step
    const renderConfigStep = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-white mb-2">Audit Configuration</h3>
                <p className="text-gray-400 text-sm">
                    Configure the site audit for <span className="text-cyan-400">{domain}</span>
                </p>
            </div>

            {/* Max Pages */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Maximum Pages to Analyze
                </label>
                <input
                    type="number"
                    min={10}
                    max={500}
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value) || 100)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                    {existingPages.length > 0
                        ? `${existingPages.length} pages already loaded`
                        : 'Pages will be crawled from the domain'}
                </p>
            </div>

            {/* Deep Crawl Toggle */}
            <div className="flex items-center justify-between">
                <div>
                    <label className="text-sm font-medium text-gray-300">Deep Crawl</label>
                    <p className="text-xs text-gray-500">Follow all internal links</p>
                </div>
                <button
                    onClick={() => setDeepCrawl(!deepCrawl)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                        deepCrawl ? 'bg-cyan-500' : 'bg-gray-700'
                    }`}
                >
                    <span
                        className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                            deepCrawl ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                    />
                </button>
            </div>

            {/* Phase Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                    Phases to Run
                </label>
                <div className="space-y-2">
                    {([0, 1, 2, 3, 4] as AuditPhase[]).map((phase) => (
                        <label
                            key={phase}
                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                                skipPhases.includes(phase)
                                    ? 'bg-gray-800 opacity-50'
                                    : 'bg-gray-800/50 hover:bg-gray-800'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={!skipPhases.includes(phase)}
                                onChange={() => toggleSkipPhase(phase)}
                                className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 bg-gray-700"
                            />
                            <div className="ml-3">
                                <span className="text-sm font-medium text-white">
                                    Phase {phase}: {PHASE_NAMES[phase]}
                                </span>
                                <p className="text-xs text-gray-500">{PHASE_DESCRIPTIONS[phase]}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                )}
                <button
                    onClick={handleStartAudit}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Start Audit
                </button>
            </div>
        </div>
    );

    // Render progress step
    const renderRunningStep = () => (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-lg font-medium text-white mb-2">Running Site Audit</h3>
                <p className="text-gray-400 text-sm">
                    Analyzing {domain}
                </p>
            </div>

            {/* Phase Progress */}
            <div className="space-y-3">
                {([0, 1, 2, 3, 4] as AuditPhase[]).map((phase) => {
                    const isSkipped = skipPhases.includes(phase);
                    const isCurrent = progress?.phase === phase;
                    const isComplete = progress && progress.phase > phase;
                    const isPending = progress && progress.phase < phase;

                    return (
                        <div
                            key={phase}
                            className={`p-4 rounded-lg border ${
                                isSkipped
                                    ? 'bg-gray-800/30 border-gray-700 opacity-50'
                                    : isCurrent
                                    ? 'bg-cyan-900/30 border-cyan-700'
                                    : isComplete
                                    ? 'bg-green-900/30 border-green-700'
                                    : 'bg-gray-800/30 border-gray-700'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {isSkipped ? (
                                        <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-gray-500">
                                            -
                                        </span>
                                    ) : isComplete ? (
                                        <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                    ) : isCurrent ? (
                                        <span className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center animate-pulse">
                                            <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                        </span>
                                    ) : (
                                        <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                                            {phase}
                                        </span>
                                    )}
                                    <span className={`font-medium ${isCurrent ? 'text-cyan-400' : isComplete ? 'text-green-400' : 'text-gray-400'}`}>
                                        {PHASE_NAMES[phase]}
                                    </span>
                                </div>
                                {isCurrent && (
                                    <span className="text-sm text-cyan-400">
                                        {progress?.progress}%
                                    </span>
                                )}
                            </div>

                            {/* Progress bar for current phase */}
                            {isCurrent && (
                                <>
                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                                        <div
                                            className="h-full bg-cyan-500 transition-all duration-300"
                                            style={{ width: `${progress?.progress || 0}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400">{progress?.currentStep}</p>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                    {error}
                    <button
                        onClick={() => setStep('config')}
                        className="ml-2 underline hover:no-underline"
                    >
                        Go back
                    </button>
                </div>
            )}
        </div>
    );

    // Render results step
    const renderResultsStep = () => {
        if (!result) return null;

        return (
            <AuditReportView
                result={result}
                onClose={onClose}
                onRerun={() => setStep('config')}
            />
        );
    };

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">Site Audit</h2>
                        <p className="text-sm text-gray-400">
                            {step === 'config' && 'Configure audit parameters'}
                            {step === 'running' && 'Audit in progress...'}
                            {step === 'results' && 'Audit complete'}
                        </p>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2">
                    {['config', 'running', 'results'].map((s, i) => (
                        <React.Fragment key={s}>
                            <div
                                className={`w-3 h-3 rounded-full ${
                                    step === s
                                        ? 'bg-cyan-500'
                                        : ['config', 'running', 'results'].indexOf(step) > i
                                        ? 'bg-green-500'
                                        : 'bg-gray-700'
                                }`}
                            />
                            {i < 2 && (
                                <div className={`w-6 h-0.5 ${
                                    ['config', 'running', 'results'].indexOf(step) > i
                                        ? 'bg-green-500'
                                        : 'bg-gray-700'
                                }`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Content */}
            {step === 'config' && renderConfigStep()}
            {step === 'running' && renderRunningStep()}
            {step === 'results' && renderResultsStep()}
        </div>
    );
};

export default SiteAuditWizard;
