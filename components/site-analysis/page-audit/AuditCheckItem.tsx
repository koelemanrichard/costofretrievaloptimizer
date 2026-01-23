import React from 'react';
import { AuditCheck } from '../../../types';

interface AuditCheckItemProps {
    check: AuditCheck;
}

export const AuditCheckItem: React.FC<AuditCheckItemProps> = ({ check }) => {
    const getScoreColor = (score: number): string => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    return (
        <div
            className={`p-3 rounded-lg border ${check.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    {check.passed ? (
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                    <span className={`font-medium ${check.passed ? 'text-green-300' : 'text-red-300'}`}>
                        {check.ruleName}
                    </span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(check.score)}`}>
                    {check.score}
                </span>
            </div>
            <p className="text-sm text-gray-400 mt-2 ml-7">{check.details}</p>
            {!check.passed && check.suggestion && (
                <p className="text-sm text-purple-400 mt-2 ml-7">
                    <span className="font-medium">Fix:</span> {check.suggestion}
                </p>
            )}
        </div>
    );
};
