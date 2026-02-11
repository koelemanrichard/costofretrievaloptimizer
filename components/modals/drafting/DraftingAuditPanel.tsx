// components/modals/drafting/DraftingAuditPanel.tsx
// UI panel for audit issues and quality tab in DraftingModal

import React from 'react';
import { AuditIssuesPanel } from '../../drafting/AuditIssuesPanel';
import { QualityRulePanel, ArticleQualityReport } from '../../quality';
import { PassDiffViewer } from '../../drafting/PassDiffViewer';
import { ContentBrief, BusinessInfo, AuditIssue, ContentGenerationJob } from '../../../types';
import type { DatabaseJobInfo } from './DraftingContext';

interface AuditIssuesPanelSectionProps {
  showAuditPanel: boolean;
  auditIssues: AuditIssue[];
  brief: ContentBrief;
  draftContent: string;
  businessInfo: BusinessInfo;
  onApplyFix: (updatedDraft: string, issueId: string) => void;
  onDismiss: (issueId: string) => void;
  onClose: () => void;
}

/**
 * Collapsible audit issues section that appears at the bottom of DraftingModal.
 */
export const AuditIssuesPanelSection: React.FC<AuditIssuesPanelSectionProps> = ({
  showAuditPanel,
  auditIssues,
  brief,
  draftContent,
  businessInfo,
  onApplyFix,
  onDismiss,
  onClose,
}) => {
  if (!showAuditPanel || auditIssues.length === 0) return null;

  return (
    <div className="border-t border-gray-700 bg-gray-850 max-h-[300px] overflow-y-auto">
      <div className="flex items-center justify-between p-2 bg-gray-800">
        <span className="text-sm font-medium text-gray-200">
          Audit Issues ({auditIssues.filter(i => !i.fixApplied).length} pending)
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-4">
        <AuditIssuesPanel
          issues={auditIssues}
          draft={draftContent}
          brief={brief}
          businessInfo={businessInfo}
          onApplyFix={onApplyFix}
          onDismiss={onDismiss}
        />
      </div>
    </div>
  );
};

interface QualityTabContentProps {
  brief: ContentBrief;
  draftContent: string;
  businessInfo: BusinessInfo;
  databaseJobInfo: DatabaseJobInfo | null;
  minimalJob: ContentGenerationJob | null;
  onSetActiveTab: (tab: 'edit' | 'preview' | 'images' | 'quality' | 'debug') => void;
  dispatch: React.Dispatch<any>;
}

/**
 * Quality tab content for the DraftingModal.
 * Shows quality report, rules checklist, and pass diff viewer.
 */
export const QualityTabContent: React.FC<QualityTabContentProps> = ({
  brief,
  draftContent,
  businessInfo,
  databaseJobInfo,
  minimalJob,
  onSetActiveTab,
  dispatch,
}) => {
  // Get audit rules from either brief.contentAudit OR job.audit_details
  const auditRules = brief?.contentAudit?.frameworkRules?.length > 0
    ? brief.contentAudit.frameworkRules
    : databaseJobInfo?.auditDetails?.algorithmicResults || [];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Quality Report Header */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Content Quality Report</h3>
          {databaseJobInfo?.auditScore && (
            <div className={`text-2xl font-bold ${
              databaseJobInfo.auditScore >= 80 ? 'text-green-400' :
              databaseJobInfo.auditScore >= 60 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {databaseJobInfo.auditScore}%
            </div>
          )}
        </div>
        {minimalJob ? (
          <ArticleQualityReport
            jobId={minimalJob.id}
            violations={auditRules.filter((r: any) => !r.isPassing).map((r: any) => ({
              rule: r.ruleName,
              text: r.details,
              position: 0,
              suggestion: r.remediation || 'Review and address this issue',
              severity: 'warning' as const,
            }))}
            evaluatedRules={auditRules.length > 0 ? auditRules.map((r: any) => ({
              ruleName: r.ruleName,
              isPassing: r.isPassing,
            })) : undefined}
            passDeltas={[]}
            overallScore={databaseJobInfo?.auditScore || 0}
            businessInfo={businessInfo}
            content={draftContent}
            onApprove={() => {
              dispatch({ type: 'SET_NOTIFICATION', payload: 'Article approved!' });
            }}
            onRequestFix={(ruleIds) => {
              console.log('Request fix for rules:', ruleIds);
              dispatch({ type: 'SET_NOTIFICATION', payload: `Requested fix for ${ruleIds.length} rule(s)` });
            }}
            onEdit={() => onSetActiveTab('edit')}
            onRegenerate={() => {
              dispatch({ type: 'SET_NOTIFICATION', payload: 'To regenerate content, close this modal and click "Generate Draft" in the Brief panel. This will start a fresh content generation with your current settings.' });
            }}
          />
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No quality data available yet.</p>
            <p className="text-sm mt-2">Generate or polish content to see quality metrics.</p>
          </div>
        )}
      </div>

      {/* Quality Rules Panel */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Quality Rules Checklist</h3>
        <QualityRulePanel
          violations={auditRules.filter((r: any) => !r.isPassing).map((r: any) => ({
            rule: r.ruleName,
            text: r.details,
            position: 0,
            suggestion: r.remediation || 'Review and address this issue',
            severity: 'warning' as const,
          }))}
          evaluatedRules={auditRules.length > 0 ? auditRules.map((r: any) => ({
            ruleName: r.ruleName,
            isPassing: r.isPassing,
          })) : undefined}
          onRuleClick={(ruleId) => {
            console.log('Rule clicked:', ruleId);
          }}
        />
      </div>

      {/* Pass History & Content Viewer */}
      {databaseJobInfo && businessInfo && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Pass History & Content Viewer</h3>
          <p className="text-sm text-gray-400 mb-4">
            View structural changes and content at each pass. Click a pass to see details, then "View Content" to see the draft at that stage.
          </p>
          <PassDiffViewer
            jobId={databaseJobInfo.jobId}
            structuralSnapshots={databaseJobInfo.structuralSnapshots || {}}
            qualityScores={databaseJobInfo.passQualityScores || {}}
            qualityWarning={databaseJobInfo.qualityWarning}
            supabaseUrl={businessInfo.supabaseUrl}
            supabaseAnonKey={businessInfo.supabaseAnonKey}
            enableContentViewing={true}
            onRollback={(passNumber) => {
              console.log('[DraftingAuditPanel] Rollback requested to pass:', passNumber);
              dispatch({ type: 'SET_NOTIFICATION', payload: `Rolled back to pass ${passNumber}. Refresh to see changes.` });
            }}
          />
        </div>
      )}
    </div>
  );
};

export default QualityTabContent;
