
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import { AuditProgress } from '../../services/ai/unifiedAudit';

interface AnalysisToolsPanelProps {
    isLoading: { [key: string]: boolean | undefined };
    onValidateMap: () => void;
    onFindMergeOpportunities: () => void;
    onAnalyzeSemanticRelationships: () => void;
    onAnalyzeContextualCoverage: () => void;
    onAuditInternalLinking: () => void;
    onCalculateTopicalAuthority: () => void;
    onGeneratePublicationPlan: () => void;
    onRunUnifiedAudit: () => void;
    onQueryNetworkAudit?: () => void;
    onMentionScanner?: () => void;
    onCorpusAudit?: () => void;
    onComprehensiveAudit?: () => void;
    onRepairBriefs?: () => Promise<{ repaired: number; skipped: number; errors: string[] }>;
    auditProgress?: AuditProgress | null;
}

const AnalysisToolsPanel: React.FC<AnalysisToolsPanelProps> = ({
    isLoading,
    onValidateMap,
    onFindMergeOpportunities,
    onAnalyzeSemanticRelationships,
    onAnalyzeContextualCoverage,
    onAuditInternalLinking,
    onCalculateTopicalAuthority,
    onGeneratePublicationPlan,
    onRunUnifiedAudit,
    onQueryNetworkAudit,
    onMentionScanner,
    onCorpusAudit,
    onComprehensiveAudit,
    onRepairBriefs,
    auditProgress
}) => {
    const [isRepairing, setIsRepairing] = useState(false);
    const [repairResult, setRepairResult] = useState<{ repaired: number; skipped: number; errors: string[] } | null>(null);

    const handleRepairBriefs = async () => {
        if (!onRepairBriefs) return;
        setIsRepairing(true);
        setRepairResult(null);
        try {
            const result = await onRepairBriefs();
            setRepairResult(result);
            if (result.repaired > 0) {
                // Brief notification that reload may be needed
                setTimeout(() => setRepairResult(null), 5000);
            }
        } finally {
            setIsRepairing(false);
        }
    };
    const renderAuditButton = () => {
        if (!isLoading.unifiedAudit) {
            return 'Health Check';
        }

        if (auditProgress) {
            const { phase, currentCategory, percentComplete, issuesFound } = auditProgress;
            if (phase === 'preparing') {
                return (
                    <span className="flex items-center gap-2">
                        <SmartLoader context="loading" size="sm" showText={false} /> Preparing...
                    </span>
                );
            }
            if (phase === 'checking' && currentCategory) {
                return (
                    <span className="flex flex-col items-center text-xs">
                        <span className="flex items-center gap-1">
                            <SmartLoader context="analyzing" size="sm" showText={false} /> {percentComplete}%
                        </span>
                        <span className="truncate max-w-[80px]">{currentCategory}</span>
                    </span>
                );
            }
            if (phase === 'calculating') {
                return (
                    <span className="flex items-center gap-2">
                        <SmartLoader context="auditing" size="sm" showText={false} /> {issuesFound} issues
                    </span>
                );
            }
        }

        return <SmartLoader context="analyzing" size="sm" showText={false} />;
    };

    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Advanced Analysis & Tools</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <Button onClick={onValidateMap} disabled={isLoading.validation} variant="secondary">{isLoading.validation ? <SmartLoader context="analyzing" size="sm" showText={false} /> : 'Validate Map'}</Button>
                <Button onClick={onFindMergeOpportunities} disabled={isLoading.merge} variant="secondary">{isLoading.merge ? <SmartLoader context="analyzing" size="sm" showText={false} /> : 'Find Merges'}</Button>
                <Button onClick={onAnalyzeSemanticRelationships} disabled={isLoading.semantic} variant="secondary">{isLoading.semantic ? <SmartLoader context="analyzing" size="sm" showText={false} /> : 'Semantics'}</Button>
                <Button onClick={onAnalyzeContextualCoverage} disabled={isLoading.coverage} variant="secondary">{isLoading.coverage ? <SmartLoader context="analyzing" size="sm" showText={false} /> : 'Coverage'}</Button>
                <Button onClick={onAuditInternalLinking} disabled={isLoading.linkingAudit} variant="secondary">{isLoading.linkingAudit ? <SmartLoader context="analyzing" size="sm" showText={false} /> : 'Link Audit'}</Button>
                <Button onClick={onCalculateTopicalAuthority} disabled={isLoading.authority} variant="secondary">{isLoading.authority ? <SmartLoader context="analyzing" size="sm" showText={false} /> : 'Authority'}</Button>
                <Button onClick={onGeneratePublicationPlan} disabled={isLoading.plan} variant="secondary">{isLoading.plan ? <SmartLoader context="analyzing" size="sm" showText={false} /> : 'Plan'}</Button>
                <Button onClick={onRunUnifiedAudit} disabled={isLoading.unifiedAudit} className="bg-purple-700 hover:bg-purple-600">{renderAuditButton()}</Button>
                {onQueryNetworkAudit && (
                    <Button onClick={onQueryNetworkAudit} className="bg-blue-700 hover:bg-blue-600">Query Network</Button>
                )}
                {onMentionScanner && (
                    <Button onClick={onMentionScanner} className="bg-green-700 hover:bg-green-600">E-A-T Scanner</Button>
                )}
                {onCorpusAudit && (
                    <Button onClick={onCorpusAudit} className="bg-indigo-700 hover:bg-indigo-600">Corpus Audit</Button>
                )}
                {onComprehensiveAudit && (
                    <Button onClick={onComprehensiveAudit} className="bg-amber-700 hover:bg-amber-600">Full Research</Button>
                )}
            </div>

            {/* Progress bar when audit is running */}
            {isLoading.unifiedAudit && auditProgress && (
                <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                        <span>Auditing: {auditProgress.currentCategory || auditProgress.phase}</span>
                        <span>{auditProgress.percentComplete}% • {auditProgress.issuesFound} issues found</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${auditProgress.percentComplete}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Data Repair Section */}
            {onRepairBriefs && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-gray-300">Data Repair</h3>
                            <p className="text-xs text-gray-500">Fix malformed briefs that may cause display errors</p>
                        </div>
                        <Button
                            onClick={handleRepairBriefs}
                            disabled={isRepairing}
                            variant="secondary"
                            className="text-xs"
                        >
                            {isRepairing ? <><SmartLoader context="building" size="sm" showText={false} /> Repairing...</> : 'Repair Briefs'}
                        </Button>
                    </div>
                    {repairResult && (
                        <div className={`mt-2 text-xs p-2 rounded ${repairResult.repaired > 0 ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                            {repairResult.repaired > 0
                                ? `✓ Repaired ${repairResult.repaired} brief(s). Reload the page to see changes.`
                                : `No repairs needed (${repairResult.skipped} briefs checked).`
                            }
                            {repairResult.errors.length > 0 && (
                                <div className="text-red-400 mt-1">Errors: {repairResult.errors.join(', ')}</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default AnalysisToolsPanel;
