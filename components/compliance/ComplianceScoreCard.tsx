/**
 * Compliance Score Card Component
 *
 * Displays semantic compliance score with:
 * - Circular progress indicator
 * - Color coding (red < 70%, yellow 70-85%, green >= 85%)
 * - Expandable breakdown by factor
 * - Issues list with recommendations
 */

import React, { useState } from 'react';
import { AuditDetails } from '../../types';

interface ComplianceScoreCardProps {
    auditDetails?: AuditDetails;
    className?: string;
    compact?: boolean;
}

const COMPLIANCE_THRESHOLD = 85;

export const ComplianceScoreCard: React.FC<ComplianceScoreCardProps> = ({
    auditDetails,
    className = '',
    compact = false
}) => {
    const [expanded, setExpanded] = useState(false);
    const complianceScore = auditDetails?.complianceScore;

    if (!complianceScore) {
        return (
            <div className={`p-4 bg-gray-800 rounded-lg border border-gray-700 ${className}`}>
                <div className="flex items-center gap-2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Compliance score not available</span>
                </div>
            </div>
        );
    }

    const { overall, passed, grade, breakdown, issues, recommendations } = complianceScore;

    // Determine color based on score
    const getScoreColor = (score: number) => {
        if (score >= COMPLIANCE_THRESHOLD) return { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' };
        if (score >= 70) return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500' };
        return { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' };
    };

    const color = getScoreColor(overall);

    // Calculate stroke dasharray for circular progress
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${(overall / 100) * circumference} ${circumference}`;

    // Get severity icon
    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <span className="text-red-500">X</span>;
            case 'major':
                return <span className="text-yellow-500">!</span>;
            default:
                return <span className="text-blue-500">i</span>;
        }
    };

    // Factor label formatting
    const formatFactorLabel = (factor: string) => {
        return factor
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    if (compact) {
        return (
            <div className={`flex items-center gap-3 p-3 bg-gray-800 rounded-lg border ${color.border} ${className}`}>
                <div className={`w-10 h-10 rounded-full ${color.bg} bg-opacity-20 flex items-center justify-center`}>
                    <span className={`text-lg font-bold ${color.text}`}>{grade}</span>
                </div>
                <div>
                    <div className={`text-sm font-medium ${color.text}`}>
                        {overall}% Compliance
                    </div>
                    <div className="text-xs text-gray-400">
                        {passed ? 'Passed' : 'Needs improvement'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Semantic Compliance
                    </h3>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg
                            className={`w-5 h-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Score Display */}
            <div className="p-6">
                <div className="flex items-center gap-6">
                    {/* Circular Progress */}
                    <div className="relative">
                        <svg width="100" height="100" className="-rotate-90">
                            {/* Background circle */}
                            <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="none"
                                stroke="#374151"
                                strokeWidth="8"
                            />
                            {/* Progress circle */}
                            <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="none"
                                stroke={overall >= COMPLIANCE_THRESHOLD ? '#10B981' : overall >= 70 ? '#F59E0B' : '#EF4444'}
                                strokeWidth="8"
                                strokeDasharray={strokeDasharray}
                                strokeLinecap="round"
                                className="transition-all duration-500"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-2xl font-bold ${color.text}`}>{overall}%</span>
                            <span className="text-xs text-gray-400">Score</span>
                        </div>
                    </div>

                    {/* Status and Grade */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                                passed
                                    ? 'bg-green-900/50 text-green-300 border border-green-700'
                                    : 'bg-red-900/50 text-red-300 border border-red-700'
                            }`}>
                                {passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                            </span>
                            <span className={`px-2 py-1 rounded text-sm font-bold ${color.text} bg-gray-700`}>
                                Grade: {grade}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400">
                            Target: {COMPLIANCE_THRESHOLD}%+ for optimal semantic alignment
                        </p>
                        {!passed && recommendations.length > 0 && (
                            <p className="text-sm text-yellow-400 mt-2">
                                Top fix: {recommendations[0]}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Expandable Details */}
            {expanded && (
                <div className="border-t border-gray-700">
                    {/* Breakdown Grid */}
                    <div className="p-4 border-b border-gray-700">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Score Breakdown</h4>
                        <div className="grid grid-cols-3 gap-3">
                            {Object.entries(breakdown).map(([factor, score]) => {
                                const factorColor = getScoreColor(score);
                                return (
                                    <div
                                        key={factor}
                                        className="bg-gray-900/50 rounded p-2"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-gray-400 truncate">
                                                {formatFactorLabel(factor)}
                                            </span>
                                            <span className={`text-xs font-medium ${factorColor.text}`}>
                                                {score}%
                                            </span>
                                        </div>
                                        <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${factorColor.bg} transition-all duration-300`}
                                                style={{ width: `${score}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Issues List */}
                    {issues.length > 0 && (
                        <div className="p-4">
                            <h4 className="text-sm font-medium text-gray-300 mb-3">
                                Issues ({issues.length})
                            </h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {issues.map((issue, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-2 rounded text-sm ${
                                            issue.severity === 'critical'
                                                ? 'bg-red-900/30 border border-red-700/50'
                                                : issue.severity === 'major'
                                                ? 'bg-yellow-900/30 border border-yellow-700/50'
                                                : 'bg-blue-900/30 border border-blue-700/50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="mt-0.5">
                                                {getSeverityIcon(issue.severity)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-gray-200">{issue.message}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Fix: {issue.recommendation}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    {recommendations.length > 0 && issues.length === 0 && (
                        <div className="p-4">
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Recommendations</h4>
                            <ul className="space-y-1">
                                {recommendations.map((rec, idx) => (
                                    <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                                        <span className="text-cyan-400 mt-1">-</span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ComplianceScoreCard;
