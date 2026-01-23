import React from 'react';
import { PageAudit } from '../../../../types';
import { AuditScoreCard } from './AuditScoreCard';

interface AuditScoreGridProps {
    audit: PageAudit;
}

export const AuditScoreGrid: React.FC<AuditScoreGridProps> = ({ audit }) => {
    return (
        <div className="grid grid-cols-5 gap-4">
            <AuditScoreCard name="Technical" score={audit.technicalScore} checks={audit.technicalChecks} />
            <AuditScoreCard name="Semantic" score={audit.semanticScore} checks={audit.semanticChecks} />
            <AuditScoreCard name="Link Structure" score={audit.linkStructureScore} checks={audit.linkStructureChecks} />
            <AuditScoreCard name="Content" score={audit.contentQualityScore} checks={audit.contentQualityChecks} />
            <AuditScoreCard name="Schema" score={audit.visualSchemaScore} checks={audit.visualSchemaChecks} />
        </div>
    );
};
