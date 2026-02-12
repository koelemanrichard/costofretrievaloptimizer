import React from 'react';
import { Card } from '../../ui/Card';
import { SitePageRecord, PageAudit } from '../../../types';
import { AuditButton } from '../../audit/AuditButton';

interface AuditHeaderProps {
    page: SitePageRecord;
    audit: PageAudit | null;
    onBack: () => void;
    onReextract?: (pageId: string) => Promise<void>;
    onReaudit?: (pageId: string) => Promise<void>;
    onShowReport: () => void;
    isProcessing: boolean;
}

export const AuditHeader: React.FC<AuditHeaderProps> = ({
    page,
    audit,
    onBack,
    onReextract,
    onReaudit,
    onShowReport,
    isProcessing
}) => {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    return (
        <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <button
                        onClick={onBack}
                        className="text-gray-400 hover:text-white text-sm mb-2 flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </button>
                    <h2 className="text-xl font-bold text-white">{page.title || page.url}</h2>
                    <div className="flex items-center gap-2">
                        <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-sm"
                        >
                            {page.url} ↗
                        </a>
                        <AuditButton url={page.url} variant="icon-text" size="sm" />
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {onReextract && (
                            <button
                                onClick={() => onReextract(page.id)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 text-sm rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing...' : 'Re-extract'}
                            </button>
                        )}
                        {onReaudit && (
                            <button
                                onClick={() => onReaudit(page.id)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 text-sm rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing...' : 'Re-audit'}
                            </button>
                        )}
                        <button
                            onClick={onShowReport}
                            className="px-3 py-1.5 text-sm rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        >
                            Page Report
                        </button>
                    </div>
                    {audit && (
                        <div className="text-right">
                            <div className={`text-4xl font-bold ${getScoreColor(audit.overallScore)}`}>
                                {audit.overallScore}
                            </div>
                            <p className="text-sm text-gray-400">Overall Score</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Status Code</p>
                    <p className={`text-lg font-bold ${page.statusCode === 200 ? 'text-green-400' : 'text-red-400'}`}>
                        {page.statusCode || '-'}
                    </p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Word Count</p>
                    <p className="text-lg font-bold text-white">{page.wordCount || '-'}</p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">TTFB</p>
                    <p className={`text-lg font-bold ${(page.ttfbMs || 0) < 800 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {page.ttfbMs ? `${page.ttfbMs}ms` : '-'}
                    </p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Schema Types</p>
                    <p className="text-lg font-bold text-white">{page.schemaTypes?.length || 0}</p>
                </div>
            </div>
        </Card>
    );
};
