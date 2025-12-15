/**
 * Audit Report View Component
 *
 * Displays comprehensive audit results with:
 * - Overall score dashboard
 * - Phase-by-phase breakdowns
 * - Issue lists with recommendations
 * - Improvement roadmap
 */

import React, { useState } from 'react';
import { SiteAuditResult, PriorityGroup, RoadmapTask } from '../../services/ai/siteAudit';

interface AuditReportViewProps {
    result: SiteAuditResult;
    onClose?: () => void;
    onRerun?: () => void;
}

type ReportTab = 'overview' | 'technical' | 'semantic' | 'structure' | 'roadmap';

export const AuditReportView: React.FC<AuditReportViewProps> = ({
    result,
    onClose,
    onRerun
}) => {
    const [activeTab, setActiveTab] = useState<ReportTab>('overview');
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreBgColor = (score: number) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const toggleTask = (taskId: string) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    // Overview Tab
    const renderOverview = () => (
        <div className="space-y-6">
            {/* Score Cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Overall', score: result.scores.overall, icon: '📊' },
                    { label: 'Technical', score: result.scores.technical, icon: '⚙️' },
                    { label: 'Semantic', score: result.scores.semantic, icon: '🧠' },
                    { label: 'Structural', score: result.scores.structural, icon: '🏗️' }
                ].map((item) => (
                    <div
                        key={item.label}
                        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">{item.label}</span>
                            <span>{item.icon}</span>
                        </div>
                        <div className={`text-3xl font-bold ${getScoreColor(item.score)}`}>
                            {item.score}%
                        </div>
                        <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${getScoreBgColor(item.score)} transition-all`}
                                style={{ width: `${item.score}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-2xl font-bold text-white">{result.pagesAudited}</div>
                    <div className="text-sm text-gray-400">Pages Audited</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-2xl font-bold text-yellow-400">{result.issuesFound}</div>
                    <div className="text-sm text-gray-400">Issues Found</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-2xl font-bold text-cyan-400">{result.recommendationsGenerated}</div>
                    <div className="text-sm text-gray-400">Recommendations</div>
                </div>
            </div>

            {/* Top Issues Summary */}
            {result.phase4 && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-lg font-medium text-white mb-3">Priority Summary</h4>
                    <div className="space-y-2">
                        {result.phase4.summary.highPriority > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-red-500 rounded-full" />
                                <span className="text-gray-300">
                                    {result.phase4.summary.highPriority} high priority tasks
                                </span>
                            </div>
                        )}
                        {result.phase4.summary.mediumPriority > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-yellow-500 rounded-full" />
                                <span className="text-gray-300">
                                    {result.phase4.summary.mediumPriority} medium priority tasks
                                </span>
                            </div>
                        )}
                        {result.phase4.summary.lowPriority > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-blue-500 rounded-full" />
                                <span className="text-gray-300">
                                    {result.phase4.summary.lowPriority} low priority tasks
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    // Technical Tab
    const renderTechnical = () => {
        if (!result.phase0) {
            return <div className="text-gray-400">Technical analysis not available</div>;
        }

        const { phase0 } = result;

        return (
            <div className="space-y-6">
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-sm text-gray-400 mb-1">Indexation Rate</div>
                        <div className={`text-2xl font-bold ${getScoreColor(phase0.indexationRate)}`}>
                            {phase0.indexationRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">
                            {phase0.indexedPages} / {phase0.totalPages} pages
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-sm text-gray-400 mb-1">Avg Page Size</div>
                        <div className="text-2xl font-bold text-white">
                            {(phase0.corMetrics.averagePageSize / 1024).toFixed(0)} KB
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-sm text-gray-400 mb-1">Avg Load Time</div>
                        <div className={`text-2xl font-bold ${phase0.corMetrics.averageLoadTime > 3000 ? 'text-red-400' : 'text-green-400'}`}>
                            {(phase0.corMetrics.averageLoadTime / 1000).toFixed(1)}s
                        </div>
                    </div>
                </div>

                {/* Issues List */}
                <div className="bg-gray-800 rounded-lg border border-gray-700">
                    <div className="p-4 border-b border-gray-700">
                        <h4 className="text-lg font-medium text-white">
                            Technical Issues ({phase0.issues.length})
                        </h4>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {phase0.issues.map((issue, idx) => (
                            <div
                                key={idx}
                                className={`p-4 border-b border-gray-700 last:border-b-0 ${
                                    issue.type === 'error' ? 'bg-red-900/10' : 'bg-yellow-900/10'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className={`px-2 py-0.5 text-xs rounded ${
                                        issue.priority === 'high'
                                            ? 'bg-red-500/20 text-red-300'
                                            : issue.priority === 'medium'
                                            ? 'bg-yellow-500/20 text-yellow-300'
                                            : 'bg-blue-500/20 text-blue-300'
                                    }`}>
                                        {issue.priority}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-gray-200">{issue.message}</p>
                                        <p className="text-sm text-gray-500 mt-1">{issue.recommendation}</p>
                                        {issue.affectedUrls.length > 0 && (
                                            <div className="mt-2 text-xs text-gray-600">
                                                Affects {issue.affectedUrls.length} pages
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {phase0.issues.length === 0 && (
                            <div className="p-4 text-center text-gray-500">
                                No technical issues found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Semantic Tab
    const renderSemantic = () => {
        if (!result.phase1 || !result.phase2) {
            return <div className="text-gray-400">Semantic analysis not available</div>;
        }

        const { phase1, phase2 } = result;

        return (
            <div className="space-y-6">
                {/* Consistency Scores */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-sm text-gray-400 mb-1">CE Consistency</div>
                        <div className={`text-2xl font-bold ${getScoreColor(phase1.consistency.ceConsistency)}`}>
                            {phase1.consistency.ceConsistency.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500">
                            Central Entity alignment
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-sm text-gray-400 mb-1">SC Consistency</div>
                        <div className={`text-2xl font-bold ${getScoreColor(phase1.consistency.scConsistency)}`}>
                            {phase1.consistency.scConsistency.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500">
                            Source Context alignment
                        </div>
                    </div>
                </div>

                {/* Site-Level Semantics */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-lg font-medium text-white mb-3">Site-Level Identity</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Central Entity:</span>
                            <span className="text-cyan-400">{phase1.siteLevel.centralEntity || 'Not defined'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Source Context:</span>
                            <span className="text-cyan-400">{phase1.siteLevel.sourceContext || 'Not defined'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Central Search Intent:</span>
                            <span className="text-cyan-400">{phase1.siteLevel.centralSearchIntent || 'Not defined'}</span>
                        </div>
                    </div>
                </div>

                {/* Knowledge Graph Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <div className="text-2xl font-bold text-white">{phase2.totalEntities}</div>
                        <div className="text-sm text-gray-400">Entities</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <div className="text-2xl font-bold text-white">{phase2.clusters.length}</div>
                        <div className="text-sm text-gray-400">Clusters</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <div className="text-2xl font-bold text-yellow-400">{phase2.orphanPages.length}</div>
                        <div className="text-sm text-gray-400">Orphan Pages</div>
                    </div>
                </div>

                {/* KG Issues */}
                {phase2.issues.length > 0 && (
                    <div className="bg-gray-800 rounded-lg border border-gray-700">
                        <div className="p-4 border-b border-gray-700">
                            <h4 className="text-lg font-medium text-white">
                                Knowledge Graph Issues ({phase2.issues.length})
                            </h4>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {phase2.issues.map((issue, idx) => (
                                <div key={idx} className="p-3 border-b border-gray-700 last:border-b-0">
                                    <div className="flex items-start gap-2">
                                        <span className={`px-2 py-0.5 text-xs rounded ${
                                            issue.severity === 'high'
                                                ? 'bg-red-500/20 text-red-300'
                                                : issue.severity === 'medium'
                                                ? 'bg-yellow-500/20 text-yellow-300'
                                                : 'bg-blue-500/20 text-blue-300'
                                        }`}>
                                            {issue.type}
                                        </span>
                                        <div>
                                            <p className="text-gray-300 text-sm">{issue.message}</p>
                                            <p className="text-xs text-gray-500 mt-1">{issue.recommendation}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Structure Tab
    const renderStructure = () => {
        if (!result.phase3) {
            return <div className="text-gray-400">Structural analysis not available</div>;
        }

        const { phase3 } = result;

        return (
            <div className="space-y-6">
                {/* Section Summary */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-sm text-gray-400 mb-1">Core Section</div>
                        <div className="text-2xl font-bold text-white">{phase3.coreSection.pageCount}</div>
                        <div className="text-xs text-gray-500">pages • {phase3.coreSection.depth} depth</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-sm text-gray-400 mb-1">Author Section</div>
                        <div className="text-2xl font-bold text-white">{phase3.authorSection.pageCount}</div>
                        <div className="text-xs text-gray-500">pages • {phase3.authorSection.depth} depth</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-sm text-gray-400 mb-1">Support Pages</div>
                        <div className="text-2xl font-bold text-white">{phase3.supportPages.pageCount}</div>
                        <div className="text-xs text-gray-500">pages</div>
                    </div>
                </div>

                {/* Hub-Spoke Analysis */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-lg font-medium text-white mb-3">Hub-Spoke Analysis</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <div className="text-sm text-gray-400">Total Hubs</div>
                            <div className="text-xl font-bold text-white">{phase3.hubSpokeAnalysis.totalHubs}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400">Avg Ratio</div>
                            <div className="text-xl font-bold text-white">1:{phase3.hubSpokeAnalysis.averageRatio}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400">Optimal</div>
                            <div className="text-xl font-bold text-cyan-400">1:{phase3.hubSpokeAnalysis.optimalRatio}</div>
                        </div>
                    </div>
                    {phase3.hubSpokeAnalysis.recommendations.map((rec, idx) => (
                        <p key={idx} className="text-sm text-gray-400 mt-2">{rec}</p>
                    ))}
                </div>

                {/* Linking Audit */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-lg font-medium text-white mb-3">Internal Linking</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-sm text-gray-400">Total Links</div>
                            <div className="text-xl font-bold text-white">{phase3.linkingAudit.totalInternalLinks}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400">Avg Per Page</div>
                            <div className="text-xl font-bold text-white">{phase3.linkingAudit.averageLinksPerPage}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400">Link Direction</div>
                            <div className={`text-xl font-bold ${getScoreColor(phase3.linkingAudit.linkDirectionScore)}`}>
                                {phase3.linkingAudit.linkDirectionScore}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dilution Risks */}
                {phase3.dilutionRisks.length > 0 && (
                    <div className="bg-gray-800 rounded-lg border border-gray-700">
                        <div className="p-4 border-b border-gray-700">
                            <h4 className="text-lg font-medium text-white">
                                Dilution Risks ({phase3.dilutionRisks.length})
                            </h4>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {phase3.dilutionRisks.map((risk, idx) => (
                                <div key={idx} className="p-3 border-b border-gray-700 last:border-b-0">
                                    <div className="flex items-start gap-2">
                                        <span className={`px-2 py-0.5 text-xs rounded ${
                                            risk.severity === 'high'
                                                ? 'bg-red-500/20 text-red-300'
                                                : risk.severity === 'medium'
                                                ? 'bg-yellow-500/20 text-yellow-300'
                                                : 'bg-blue-500/20 text-blue-300'
                                        }`}>
                                            {risk.type.replace('_', ' ')}
                                        </span>
                                        <div>
                                            <p className="text-gray-300 text-sm">{risk.message}</p>
                                            <p className="text-xs text-gray-500 mt-1">{risk.recommendation}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Roadmap Tab
    const renderRoadmap = () => {
        if (!result.phase4) {
            return <div className="text-gray-400">Roadmap not available</div>;
        }

        const { phase4 } = result;

        const renderTaskGroup = (group: PriorityGroup) => (
            <div key={group.priority} className="mb-6">
                <h4 className={`text-sm font-medium mb-3 ${
                    group.priority === 'high' ? 'text-red-400' :
                    group.priority === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                    {group.priority.toUpperCase()} PRIORITY - {group.category}
                </h4>
                <div className="space-y-2">
                    {group.tasks.map((task) => (
                        <div
                            key={task.id}
                            className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                        >
                            <button
                                onClick={() => toggleTask(task.id)}
                                className="w-full p-3 flex items-center justify-between hover:bg-gray-800/80"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${
                                        task.type === 'fix' ? 'bg-red-500' :
                                        task.type === 'create' ? 'bg-green-500' :
                                        task.type === 'merge' ? 'bg-yellow-500' :
                                        task.type === 'delete' ? 'bg-gray-500' :
                                        'bg-cyan-500'
                                    }`} />
                                    <span className="text-gray-200 text-sm">{task.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                        {task.impact} impact / {task.effort} effort
                                    </span>
                                    <svg
                                        className={`w-4 h-4 text-gray-400 transform transition-transform ${
                                            expandedTasks.has(task.id) ? 'rotate-180' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>
                            {expandedTasks.has(task.id) && (
                                <div className="px-3 pb-3 pt-0 border-t border-gray-700">
                                    <p className="text-sm text-gray-400 mt-2">{task.description}</p>
                                    {task.affectedUrls.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-500 mb-1">Affected URLs:</p>
                                            <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                                                {task.affectedUrls.slice(0, 5).map((url, i) => (
                                                    <div key={i}>{url}</div>
                                                ))}
                                                {task.affectedUrls.length > 5 && (
                                                    <div>...and {task.affectedUrls.length - 5} more</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );

        return (
            <div className="space-y-6">
                {/* Impact Estimate */}
                <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-lg p-4 border border-cyan-700/50">
                    <h4 className="text-lg font-medium text-white mb-3">Estimated Impact</h4>
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <div className="text-sm text-gray-400">Traffic Potential</div>
                            <div className={`text-lg font-bold ${
                                phase4.estimatedImpact.trafficPotential === 'high' ? 'text-green-400' :
                                phase4.estimatedImpact.trafficPotential === 'medium' ? 'text-yellow-400' : 'text-gray-400'
                            }`}>
                                {phase4.estimatedImpact.trafficPotential.toUpperCase()}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400">Authority</div>
                            <div className="text-lg font-bold text-green-400">
                                +{phase4.estimatedImpact.authorityImprovement}%
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400">Indexation</div>
                            <div className="text-lg font-bold text-green-400">
                                +{phase4.estimatedImpact.indexationImprovement}%
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400">UX Score</div>
                            <div className="text-lg font-bold text-cyan-400">
                                {phase4.estimatedImpact.userExperienceScore}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Task Groups */}
                <div className="max-h-[500px] overflow-y-auto pr-2">
                    {phase4.priorities.map(renderTaskGroup)}
                </div>
            </div>
        );
    };

    const tabs: { id: ReportTab; label: string }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'technical', label: 'Technical' },
        { id: 'semantic', label: 'Semantic' },
        { id: 'structure', label: 'Structure' },
        { id: 'roadmap', label: 'Roadmap' }
    ];

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'bg-cyan-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'technical' && renderTechnical()}
                {activeTab === 'semantic' && renderSemantic()}
                {activeTab === 'structure' && renderStructure()}
                {activeTab === 'roadmap' && renderRoadmap()}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                {onRerun && (
                    <button
                        onClick={onRerun}
                        className="px-4 py-2 text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Run Again
                    </button>
                )}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                    >
                        Close
                    </button>
                )}
            </div>
        </div>
    );
};

export default AuditReportView;
