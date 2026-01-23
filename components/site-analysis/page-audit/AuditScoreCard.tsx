import React from 'react';
import { AuditCheck } from '../../../types';

interface AuditScoreCardProps {
    name: string;
    score: number;
    checks: AuditCheck[];
}

export const AuditScoreCard: React.FC<AuditScoreCardProps> = ({ name, score, checks }) => {
    const passed = checks.filter(c => c.passed).length;

    const getScoreColor = (score: number): string => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreBgColor = (score: number): string => {
        if (score >= 80) return 'bg-green-500/20';
        if (score >= 60) return 'bg-yellow-500/20';
        if (score >= 40) return 'bg-orange-500/20';
        return 'bg-red-500/20';
    };

    return (
        <div className={`p-4 rounded-lg ${getScoreBgColor(score)}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">{name}</span>
                <span className={`text-xl font-bold ${getScoreColor(score)}`}>{score}</span>
            </div>
            <div className="text-xs text-gray-500">
                {passed}/{checks.length} checks passed
            </div>
        </div>
    );
};
