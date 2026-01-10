/**
 * ContentGenerationWithQuality Component
 *
 * Enhanced content generation progress view that integrates quality enforcement
 * components for full visibility into rule compliance during generation.
 *
 * Features:
 * - Real-time progress tracking with LiveGenerationMonitor
 * - Collapsible QualityRulePanel showing all 113+ rules
 * - ArticleQualityReport when generation completes
 * - Pass delta tracking and conflict detection
 *
 * @module components
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ContentGenerationJob, ContentGenerationSection, ValidationViolation } from '../types';
import { ContentGenerationProgress } from './ContentGenerationProgress';
import {
  QualityRulePanel,
  LiveGenerationMonitor,
  ArticleQualityReport,
} from './quality';
import type { PassDelta } from '../services/ai/contentGeneration/tracking';

// =============================================================================
// Types
// =============================================================================

export interface ContentGenerationWithQualityProps {
  /** The content generation job */
  job: ContentGenerationJob;
  /** Generated sections */
  sections: ContentGenerationSection[];
  /** Overall progress percentage */
  progress: number;
  /** Current pass name */
  currentPassName: string;
  /** Callback to pause generation */
  onPause: () => void;
  /** Callback to resume generation */
  onResume: () => void;
  /** Callback to cancel generation */
  onCancel: () => void;
  /** Callback to retry failed generation */
  onRetry?: () => void;
  /** Current error message */
  error?: string | null;
  /** Current validation violations */
  violations?: ValidationViolation[];
  /** Pass deltas from tracking */
  passDeltas?: PassDelta[];
  /** Callback when user approves completed article */
  onApprove?: () => void;
  /** Callback to request fixes for rules */
  onRequestFix?: (ruleIds: string[]) => void;
  /** Callback to edit article manually */
  onEdit?: () => void;
  /** Callback to regenerate article */
  onRegenerate?: () => void;
  /** Additional CSS classes */
  className?: string;
}

type ViewMode = 'progress' | 'quality' | 'report';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert job passes_status to PassDelta array for LiveGenerationMonitor
 * Provides indicative improvements based on what each pass typically optimizes
 */
function generatePassDeltasFromJob(job: ContentGenerationJob): PassDelta[] {
  const deltas: PassDelta[] = [];

  const passKeys = [
    'pass_1_draft', 'pass_2_headers', 'pass_3_intro', 'pass_4_lists',
    'pass_5_discourse', 'pass_6_microsemantics', 'pass_7_visuals',
    'pass_8_polish', 'pass_9_audit', 'pass_10_schema'
  ];

  // Indicative improvements per pass (based on typical pass function)
  const passImprovements: Record<number, string[]> = {
    1: ['CONTENT_CREATED'],
    2: ['HEADING_HIERARCHY', 'HEADING_OVERLAP'],
    3: ['CENTERPIECE', 'INTRO_CONTEXT'],
    4: ['LIST_STRUCTURE', 'TABLE_FORMAT'],
    5: ['DISCOURSE_FLOW', 'TRANSITIONS'],
    6: ['MODALITY', 'STOP_WORDS', 'SUBJECT_POSITION'],
    7: ['IMAGE_PLACEMENT', 'ALT_TEXT'],
    8: ['POLISH_REFINEMENT', 'COHERENCE'],
    9: [],
    10: ['SCHEMA_GENERATED'],
  };

  if (!job.passes_status) return deltas;

  passKeys.forEach((key, index) => {
    const status = job.passes_status[key as keyof typeof job.passes_status];
    const passNum = index + 1;
    if (status === 'completed') {
      const fixed = passImprovements[passNum] || [];
      deltas.push({
        passNumber: passNum,
        rulesFixed: fixed,
        rulesRegressed: [],
        rulesUnchanged: [],
        netChange: fixed.length,
        recommendation: 'accept' as const,
      });
    }
  });

  return deltas;
}

/**
 * Convert audit details to violations
 */
function auditDetailsToViolations(job: ContentGenerationJob): ValidationViolation[] {
  if (!job.audit_details?.algorithmicResults) return [];

  return job.audit_details.algorithmicResults
    .filter(r => !r.isPassing)
    .map(r => ({
      rule: r.ruleName,
      text: r.details,
      position: 0,
      suggestion: r.remediation || 'Review and fix this issue',
      severity: 'warning' as const,
    }));
}

// =============================================================================
// Main Component
// =============================================================================

export const ContentGenerationWithQuality: React.FC<ContentGenerationWithQualityProps> = ({
  job,
  sections,
  progress,
  currentPassName,
  onPause,
  onResume,
  onCancel,
  onRetry,
  error,
  violations: propViolations,
  passDeltas: propPassDeltas,
  onApprove,
  onRequestFix,
  onEdit,
  onRegenerate,
  className = '',
}) => {
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('progress');

  // Derive violations from audit details if not provided
  const violations = useMemo(() => {
    if (propViolations && propViolations.length > 0) return propViolations;
    return auditDetailsToViolations(job);
  }, [propViolations, job]);

  // Derive pass deltas from job if not provided
  const passDeltas = useMemo(() => {
    if (propPassDeltas && propPassDeltas.length > 0) return propPassDeltas;
    return generatePassDeltasFromJob(job);
  }, [propPassDeltas, job]);

  // Determine if we should show the report (job completed)
  const showReport = job.status === 'completed' && viewMode === 'report';
  const isGenerating = job.status === 'in_progress';

  // Auto-switch to report view when completed
  React.useEffect(() => {
    if (job.status === 'completed' && viewMode === 'progress') {
      setViewMode('report');
    }
  }, [job.status, viewMode]);

  // Handlers
  const handleRuleClick = useCallback((ruleId: string) => {
    console.log('Rule clicked:', ruleId);
    // Could open a modal with rule details
  }, []);

  const handleApprove = useCallback(() => {
    onApprove?.();
  }, [onApprove]);

  const handleRequestFix = useCallback((ruleIds: string[]) => {
    onRequestFix?.(ruleIds);
  }, [onRequestFix]);

  const handleEdit = useCallback(() => {
    onEdit?.();
  }, [onEdit]);

  const handleRegenerate = useCallback(() => {
    onRegenerate?.();
  }, [onRegenerate]);

  return (
    <div className={`content-generation-with-quality ${className}`}>
      {/* View Mode Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
        <button
          onClick={() => setViewMode('progress')}
          className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors ${
            viewMode === 'progress'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Progress
        </button>
        <button
          onClick={() => setViewMode('quality')}
          className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors ${
            viewMode === 'quality'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Quality Rules
          {violations.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-600 rounded-full">
              {violations.length}
            </span>
          )}
        </button>
        {job.status === 'completed' && (
          <button
            onClick={() => setViewMode('report')}
            className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors ${
              viewMode === 'report'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Quality Report
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setShowQualityPanel(!showQualityPanel)}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {showQualityPanel ? 'Hide Rules Panel' : 'Show Rules Panel'}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-4">
        {/* Left: Main View */}
        <div className={`flex-1 ${showQualityPanel ? 'max-w-[60%]' : ''}`}>
          {viewMode === 'progress' && (
            <div className="space-y-4">
              {/* Original Progress Component */}
              <ContentGenerationProgress
                job={job}
                sections={sections}
                progress={progress}
                currentPassName={currentPassName}
                onPause={onPause}
                onResume={onResume}
                onCancel={onCancel}
                onRetry={onRetry}
                error={error}
              />

              {/* Live Generation Monitor */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <LiveGenerationMonitor
                  jobId={job.id}
                  currentPass={job.current_pass}
                  totalPasses={10}
                  passDeltas={passDeltas}
                  isGenerating={isGenerating}
                  onPauseGeneration={onPause}
                  onResumeGeneration={onResume}
                />
              </div>
            </div>
          )}

          {viewMode === 'quality' && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 max-h-[600px] overflow-y-auto">
              <QualityRulePanel
                violations={violations}
                onRuleClick={handleRuleClick}
              />
            </div>
          )}

          {viewMode === 'report' && job.status === 'completed' && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <ArticleQualityReport
                jobId={job.id}
                violations={violations}
                passDeltas={passDeltas}
                overallScore={job.final_audit_score || 0}
                onApprove={handleApprove}
                onRequestFix={handleRequestFix}
                onEdit={handleEdit}
                onRegenerate={handleRegenerate}
              />
            </div>
          )}
        </div>

        {/* Right: Quality Panel (collapsible) */}
        {showQualityPanel && (
          <div className="w-[40%] max-w-md">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Quality Rules</h3>
                <button
                  onClick={() => setShowQualityPanel(false)}
                  className="text-gray-400 hover:text-white"
                >
                  &times;
                </button>
              </div>
              <QualityRulePanel
                violations={violations}
                onRuleClick={handleRuleClick}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-400 border-t border-gray-700 pt-4">
        <div className="flex items-center gap-4">
          <span>
            Pass {job.current_pass}/10
          </span>
          <span>
            {job.completed_sections || 0}/{job.total_sections || '?'} sections
          </span>
          {violations.length > 0 && (
            <span className="text-red-400">
              {violations.length} issue{violations.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="font-mono text-xs">
          Job: {job.id.slice(0, 8)}...
        </span>
      </div>
    </div>
  );
};

export default ContentGenerationWithQuality;
