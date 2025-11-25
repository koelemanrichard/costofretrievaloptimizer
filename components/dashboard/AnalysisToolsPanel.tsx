
import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';

interface AnalysisToolsPanelProps {
    isLoading: { [key: string]: boolean | undefined };
    onValidateMap: () => void;
    onFindMergeOpportunities: () => void;
    onAnalyzeSemanticRelationships: () => void;
    onAnalyzeContextualCoverage: () => void;
    onAuditInternalLinking: () => void;
    onCalculateTopicalAuthority: () => void;
    onGeneratePublicationPlan: () => void;
}

const AnalysisToolsPanel: React.FC<AnalysisToolsPanelProps> = ({
    isLoading,
    onValidateMap,
    onFindMergeOpportunities,
    onAnalyzeSemanticRelationships,
    onAnalyzeContextualCoverage,
    onAuditInternalLinking,
    onCalculateTopicalAuthority,
    onGeneratePublicationPlan
}) => {
    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Advanced Analysis & Tools</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Button onClick={onValidateMap} disabled={isLoading.validation} variant="secondary">{isLoading.validation ? <Loader /> : 'Validate Map'}</Button>
                <Button onClick={onFindMergeOpportunities} disabled={isLoading.merge} variant="secondary">{isLoading.merge ? <Loader /> : 'Find Merges'}</Button>
                <Button onClick={onAnalyzeSemanticRelationships} disabled={isLoading.semantic} variant="secondary">{isLoading.semantic ? <Loader /> : 'Semantics'}</Button>
                <Button onClick={onAnalyzeContextualCoverage} disabled={isLoading.coverage} variant="secondary">{isLoading.coverage ? <Loader /> : 'Coverage'}</Button>
                <Button onClick={onAuditInternalLinking} disabled={isLoading.linkingAudit} variant="secondary">{isLoading.linkingAudit ? <Loader /> : 'Link Audit'}</Button>
                <Button onClick={onCalculateTopicalAuthority} disabled={isLoading.authority} variant="secondary">{isLoading.authority ? <Loader /> : 'Authority'}</Button>
                <Button onClick={onGeneratePublicationPlan} disabled={isLoading.plan} variant="secondary">{isLoading.plan ? <Loader /> : 'Plan'}</Button>
            </div>
        </Card>
    );
};

export default AnalysisToolsPanel;
