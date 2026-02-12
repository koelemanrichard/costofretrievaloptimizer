import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/**
 * AuditPage - Redirects to the Insights Hub.
 * The ComprehensiveAuditDashboard was consolidated into InsightsHub.
 */
const AuditPage: React.FC = () => {
    const { projectId, mapId } = useParams();
    return <Navigate to={`/p/${projectId}/m/${mapId}/insights`} replace />;
};

export default AuditPage;
