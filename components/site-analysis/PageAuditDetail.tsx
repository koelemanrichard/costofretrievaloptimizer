// components/site-analysis/PageAuditDetail.tsx
// Detailed audit view for a single page

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ProgressCircle } from '../ui/ProgressCircle';
import { SitePageRecord, PhaseAuditResult, AuditCheck, PageAuditActionItem } from '../../types';
import { PHASE_CONFIG, getRuleById } from '../../config/pageAuditRules';

interface PageAuditDetailProps {
  page: SitePageRecord;
  onBack: () => void;
}

export const PageAuditDetail: React.FC<PageAuditDetailProps> = ({
  page,
  onBack,
}) => {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(true);

  const { auditResult } = page;
  if (!auditResult) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'medium': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{page.url}</h2>
          <p className="text-sm text-gray-400">{auditResult.summary}</p>
        </div>
        <div className="flex items-center gap-3">
          <ProgressCircle
            percentage={auditResult.overallScore}
            size={70}
            strokeWidth={8}
            color={getScoreColor(auditResult.overallScore)}
          />
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={showChecklist ? 'primary' : 'secondary'}
          onClick={() => setShowChecklist(true)}
        >
          Checklist View
        </Button>
        <Button
          variant={!showChecklist ? 'primary' : 'secondary'}
          onClick={() => setShowChecklist(false)}
        >
          Action Items
        </Button>
      </div>

      {showChecklist ? (
        /* Checklist View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(auditResult.phases).map(([key, phase]) => (
            <PhaseCard
              key={key}
              phaseKey={key}
              phase={phase}
              isExpanded={selectedPhase === key}
              onToggle={() => setSelectedPhase(selectedPhase === key ? null : key)}
            />
          ))}
        </div>
      ) : (
        /* Action Items View */
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Action Items ({auditResult.actionItems.length})
          </h3>
          <div className="space-y-4">
            {auditResult.actionItems.map((item) => (
              <ActionItemCard key={item.id} item={item} />
            ))}
            {auditResult.actionItems.length === 0 && (
              <p className="text-gray-400 text-center py-8">
                No action items - all checks passed!
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Page Data */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Extracted Data</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-white">
              {page.jinaExtraction?.headings?.length || 0}
            </p>
            <p className="text-sm text-gray-400">Headings</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-white">
              {page.jinaExtraction?.links?.length || 0}
            </p>
            <p className="text-sm text-gray-400">Links</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-white">
              {page.jinaExtraction?.images?.length || 0}
            </p>
            <p className="text-sm text-gray-400">Images</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-white">
              {page.jinaExtraction?.wordCount || 0}
            </p>
            <p className="text-sm text-gray-400">Words</p>
          </div>
        </div>

        {/* Headings Preview */}
        {page.jinaExtraction?.headings && page.jinaExtraction.headings.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Heading Structure</h4>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {page.jinaExtraction.headings.slice(0, 20).map((heading, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2"
                  style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
                >
                  <span className="text-xs text-gray-500 font-mono">H{heading.level}</span>
                  <span className="text-gray-300 text-sm truncate">{heading.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

// Phase Card Component
const PhaseCard: React.FC<{
  phaseKey: string;
  phase: PhaseAuditResult;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ phaseKey, phase, isExpanded, onToggle }) => {
  const config = PHASE_CONFIG[phaseKey as keyof typeof PHASE_CONFIG];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <Card className="p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div>
          <h4 className="font-medium text-white">{config.name}</h4>
          <p className="text-xs text-gray-400">{config.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`text-2xl font-bold ${getScoreColor(phase.score)}`}>
              {phase.score}
            </p>
            <p className="text-xs text-gray-400">
              {phase.passedCount}/{phase.totalCount} passed
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
          {phase.checks.map((check) => (
            <CheckItem key={check.ruleId} check={check} />
          ))}
        </div>
      )}
    </Card>
  );
};

// Check Item Component
const CheckItem: React.FC<{ check: AuditCheck }> = ({ check }) => {
  const rule = getRuleById(check.ruleId);

  return (
    <div className="flex items-start gap-3 p-2 rounded hover:bg-gray-800/50">
      <div className="mt-0.5">
        {check.passed ? (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm ${check.passed ? 'text-gray-300' : 'text-white'}`}>
          {check.ruleName}
        </p>
        <p className="text-xs text-gray-500">{check.details}</p>
        {!check.passed && check.suggestion && (
          <p className="text-xs text-blue-400 mt-1">{check.suggestion}</p>
        )}
      </div>
      <div className="text-sm font-medium" style={{
        color: check.score >= 70 ? '#22c55e' : check.score >= 40 ? '#eab308' : '#ef4444'
      }}>
        {check.score}
      </div>
    </div>
  );
};

// Action Item Card Component
const ActionItemCard: React.FC<{ item: PageAuditActionItem }> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-yellow-500/20 text-yellow-400';
      case 'medium': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
      <div
        className="flex items-start gap-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
          {item.priority.toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">{item.title}</p>
          <p className="text-sm text-gray-400">{item.description}</p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h5 className="text-sm font-medium text-gray-400 mb-2">How to fix:</h5>
          <p className="text-sm text-gray-300">{item.remediation}</p>
          {item.estimatedImpact && (
            <p className="text-xs text-gray-500 mt-2">
              Estimated impact: <span className="text-gray-400">{item.estimatedImpact}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PageAuditDetail;
