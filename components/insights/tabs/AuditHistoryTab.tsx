// components/insights/tabs/AuditHistoryTab.tsx
// Audit History - historical record of all audit types

import React from 'react';
import { Card } from '../../ui/Card';
import type { AggregatedInsights, InsightActionType } from '../../../types/insights';

interface AuditHistoryTabProps {
  insights: AggregatedInsights;
  mapId: string;
  onRefresh: () => void;
  onAction?: (actionType: InsightActionType, payload?: Record<string, any>) => Promise<void>;
  actionLoading?: string | null;
}

const getScoreColor = (score: number) => {
  if (score >= 85) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  if (score >= 50) return 'text-orange-400';
  return 'text-red-400';
};

export const AuditHistoryTab: React.FC<AuditHistoryTabProps> = ({
  insights,
}) => {
  const { auditHistory } = insights;

  const hasAnyHistory =
    auditHistory.queryNetworkHistory.length > 0 ||
    auditHistory.eatScannerHistory.length > 0 ||
    auditHistory.corpusHistory.length > 0 ||
    auditHistory.metricsHistory.length > 0;

  if (!hasAnyHistory) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Audit History</h3>
        <p className="text-gray-400">Run audits to build a historical record of your map's health over time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Query Network History */}
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Query Network Audits</h4>
          {auditHistory.queryNetworkHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No audits yet</p>
          ) : (
            <div className="space-y-2">
              {auditHistory.queryNetworkHistory.map((audit) => (
                <div key={audit.id} className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{audit.label}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{audit.details}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* E-A-T Scanner History */}
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-white mb-4">E-A-T Scans</h4>
          {auditHistory.eatScannerHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No scans yet</p>
          ) : (
            <div className="space-y-2">
              {auditHistory.eatScannerHistory.map((audit) => (
                <div key={audit.id} className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{audit.label}</span>
                    {audit.score !== undefined && (
                      <span className={`text-sm ${getScoreColor(audit.score)}`}>
                        {audit.score}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(audit.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Corpus Audit History */}
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Corpus Audits</h4>
          {auditHistory.corpusHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No audits yet</p>
          ) : (
            <div className="space-y-2">
              {auditHistory.corpusHistory.map((audit) => (
                <div key={audit.id} className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{audit.label}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{audit.details}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Metrics Snapshots */}
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Metrics Snapshots</h4>
          {auditHistory.metricsHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No snapshots yet</p>
          ) : (
            <div className="space-y-2">
              {auditHistory.metricsHistory.map((snapshot) => (
                <div key={snapshot.id} className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{snapshot.label}</span>
                    {snapshot.score !== undefined && (
                      <span className={`text-sm ${getScoreColor(snapshot.score)}`}>
                        {snapshot.score}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(snapshot.created_at).toLocaleDateString()} | {snapshot.details}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
