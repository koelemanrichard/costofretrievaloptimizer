// components/drafting/PassDiffViewer.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Loader } from '../ui/Loader';
import type { StructuralSnapshot, SnapshotDiff } from '../../services/ai/contentGeneration/structuralValidator';
import { compareSnapshots } from '../../services/ai/contentGeneration/structuralValidator';
import { getSupabaseClient } from '../../services/supabaseClient';
import { PASS_NAMES } from '../../types';

interface PassDiffViewerProps {
  jobId: string;
  structuralSnapshots: Record<string, StructuralSnapshot>;
  qualityScores: Record<string, number>;
  qualityWarning?: string | null;
  supabaseUrl: string;
  supabaseAnonKey: string;
  onRollback?: (passNumber: number) => void;
  /** If true, enables content viewing per pass (requires fetching sections) */
  enableContentViewing?: boolean;
}

// Badge component for element changes
const ChangeBadge: React.FC<{
  label: string;
  value: number;
  type?: 'count' | 'delta';
}> = ({ label, value, type = 'count' }) => {
  if (type === 'delta') {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded border ${
        isPositive
          ? 'bg-green-900/60 text-green-300 border-green-700'
          : 'bg-red-900/60 text-red-300 border-red-700'
      }`}>
        {label}: {isPositive ? '+' : ''}{value}
      </span>
    );
  }

  return (
    <span className="text-[10px] px-2 py-0.5 rounded border bg-gray-800 text-gray-300 border-gray-600">
      {label}: {value}
    </span>
  );
};

// Quality score badge
const QualityBadge: React.FC<{ score: number; prevScore?: number }> = ({ score, prevScore }) => {
  const delta = prevScore !== undefined ? score - prevScore : 0;
  const colorClass = score >= 80
    ? 'bg-green-900/60 text-green-300 border-green-700'
    : score >= 60
    ? 'bg-amber-900/60 text-amber-300 border-amber-700'
    : 'bg-red-900/60 text-red-300 border-red-700';

  return (
    <div className="flex items-center gap-1">
      <span className={`text-[10px] px-2 py-0.5 rounded border ${colorClass}`}>
        Quality: {score}%
      </span>
      {delta !== 0 && (
        <span className={`text-[10px] px-1 ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
          ({delta > 0 ? '+' : ''}{delta})
        </span>
      )}
    </div>
  );
};

// Pass accordion item
const PassAccordionItem: React.FC<{
  passNumber: number;
  passName: string;
  snapshot?: StructuralSnapshot;
  diff?: SnapshotDiff;
  qualityScore?: number;
  prevQualityScore?: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRollback?: () => void;
  isRollingBack: boolean;
  enableContentViewing?: boolean;
  passContent?: string;
  isLoadingContent?: boolean;
  onViewContent?: () => void;
}> = ({
  passNumber,
  passName,
  snapshot,
  diff,
  qualityScore,
  prevQualityScore,
  isExpanded,
  onToggle,
  onRollback,
  isRollingBack,
  enableContentViewing,
  passContent,
  isLoadingContent,
  onViewContent
}) => {
  const hasData = snapshot !== undefined;

  return (
    <div className={`border rounded-lg overflow-hidden ${
      diff?.hasRegressions
        ? 'border-red-700/50'
        : diff?.hasImprovements
        ? 'border-green-700/50'
        : 'border-gray-700/50'
    }`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 transition-colors"
        disabled={!hasData}
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${hasData ? 'text-white' : 'text-gray-500'}`}>
            Pass {passNumber}: {passName}
          </span>
          {diff?.hasRegressions && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700">
              Regressions
            </span>
          )}
          {diff?.hasImprovements && !diff?.hasRegressions && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-green-900/60 text-green-300 border border-green-700">
              Improvements
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {qualityScore !== undefined && (
            <QualityBadge score={qualityScore} prevScore={prevQualityScore} />
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {isExpanded && hasData && (
        <div className="p-3 bg-gray-900/50 space-y-3">
          {/* Element counts */}
          <div className="flex flex-wrap gap-2">
            <ChangeBadge label="Images" value={snapshot!.elements.images} />
            <ChangeBadge label="Lists" value={snapshot!.elements.lists} />
            <ChangeBadge label="Tables" value={snapshot!.elements.tables} />
            <ChangeBadge label="H2s" value={snapshot!.elements.h2Count} />
            <ChangeBadge label="H3s" value={snapshot!.elements.h3Count} />
            <ChangeBadge label="Words" value={snapshot!.elements.wordCount} />
          </div>

          {/* Changes from previous pass */}
          {diff && (
            <div className="pt-2 border-t border-gray-700/50">
              <div className="text-[10px] text-gray-500 uppercase mb-2">Changes from previous pass</div>
              <div className="flex flex-wrap gap-2">
                <ChangeBadge label="Images" value={diff.changes.images} type="delta" />
                <ChangeBadge label="Lists" value={diff.changes.lists} type="delta" />
                <ChangeBadge label="Tables" value={diff.changes.tables} type="delta" />
                <ChangeBadge label="Words" value={diff.changes.wordCount} type="delta" />
              </div>
            </div>
          )}

          {/* Regressions list */}
          {diff?.regressions && diff.regressions.length > 0 && (
            <div className="pt-2 border-t border-gray-700/50">
              <div className="text-[10px] text-red-400 uppercase mb-1">Regressions</div>
              <ul className="text-xs text-red-300 space-y-1">
                {diff.regressions.map((r, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-500">-</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements list */}
          {diff?.improvements && diff.improvements.length > 0 && (
            <div className="pt-2 border-t border-gray-700/50">
              <div className="text-[10px] text-green-400 uppercase mb-1">Improvements</div>
              <ul className="text-xs text-green-300 space-y-1">
                {diff.improvements.map((r, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-green-500">+</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 border-t border-gray-700/50 flex justify-between items-center">
            {/* View Content button */}
            {enableContentViewing && (
              <Button
                onClick={onViewContent}
                disabled={isLoadingContent}
                variant="secondary"
                className="text-xs py-1"
              >
                {isLoadingContent ? (
                  <><Loader className="w-3 h-3 mr-1" /> Loading...</>
                ) : passContent ? (
                  <>Hide Content</>
                ) : (
                  <>View Content</>
                )}
              </Button>
            )}
            {!enableContentViewing && <div />}

            {/* Rollback button */}
            {onRollback && passNumber > 1 && (
              <Button
                onClick={onRollback}
                disabled={isRollingBack}
                variant="secondary"
                className="text-xs py-1"
              >
                {isRollingBack ? (
                  <><Loader className="w-3 h-3 mr-1" /> Rolling back...</>
                ) : (
                  <>Rollback to this pass</>
                )}
              </Button>
            )}
          </div>

          {/* Content display */}
          {passContent && (
            <div className="pt-3 border-t border-gray-700/50">
              <div className="text-[10px] text-gray-500 uppercase mb-2">Content at Pass {passNumber}</div>
              <div className="bg-gray-950 rounded-lg p-3 max-h-96 overflow-y-auto">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {passContent}
                </pre>
              </div>
              <div className="mt-2 text-[10px] text-gray-500">
                {passContent.split(/\s+/).length} words
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * PassDiffViewer Component
 *
 * Displays an accordion of all passes with structural element tracking.
 * Shows changes between passes (regressions/improvements) and allows rollback.
 */
export const PassDiffViewer: React.FC<PassDiffViewerProps> = ({
  jobId,
  structuralSnapshots,
  qualityScores,
  qualityWarning,
  supabaseUrl,
  supabaseAnonKey,
  onRollback,
  enableContentViewing = true
}) => {
  const [expandedPass, setExpandedPass] = useState<number | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [loadingContentPass, setLoadingContentPass] = useState<number | null>(null);
  const [passContents, setPassContents] = useState<Record<number, string>>({});

  // Build snapshots array and diffs
  const passData = useMemo(() => {
    const data: Array<{
      passNumber: number;
      passName: string;
      snapshot?: StructuralSnapshot;
      diff?: SnapshotDiff;
      qualityScore?: number;
      prevQualityScore?: number;
    }> = [];

    for (let i = 1; i <= 10; i++) {
      const passKey = `pass_${i}`;
      const snapshot = structuralSnapshots[passKey];
      const qualityScore = qualityScores[passKey];

      // Get previous pass data for diff
      const prevPassKey = `pass_${i - 1}`;
      const prevSnapshot = i > 1 ? structuralSnapshots[prevPassKey] : undefined;
      const prevQualityScore = i > 1 ? qualityScores[prevPassKey] : undefined;

      // Calculate diff if we have both snapshots
      let diff: SnapshotDiff | undefined;
      if (snapshot && prevSnapshot) {
        diff = compareSnapshots(prevSnapshot, snapshot);
      }

      // Get pass name from PASS_NAMES constant
      const passName = PASS_NAMES[i as keyof typeof PASS_NAMES] || `Pass ${i}`;

      data.push({
        passNumber: i,
        passName,
        snapshot,
        diff,
        qualityScore,
        prevQualityScore
      });
    }

    return data;
  }, [structuralSnapshots, qualityScores]);

  // Handle rollback
  const handleRollback = useCallback(async (passNumber: number) => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    setIsRollingBack(true);
    try {
      const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase.rpc('rollback_to_pass', {
        p_job_id: jobId,
        p_pass_number: passNumber
      });

      if (error) {
        console.error('[PassDiffViewer] Rollback failed:', error);
        return;
      }

      console.log(`[PassDiffViewer] Rolled back to pass ${passNumber}`);
      onRollback?.(passNumber);
    } catch (err) {
      console.error('[PassDiffViewer] Rollback error:', err);
    } finally {
      setIsRollingBack(false);
    }
  }, [jobId, supabaseUrl, supabaseAnonKey, onRollback]);

  // Handle viewing pass content
  const handleViewContent = useCallback(async (passNumber: number) => {
    // If already loaded, toggle off
    if (passContents[passNumber]) {
      setPassContents(prev => {
        const next = { ...prev };
        delete next[passNumber];
        return next;
      });
      return;
    }

    if (!supabaseUrl || !supabaseAnonKey) return;

    setLoadingContentPass(passNumber);
    try {
      const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

      // Fetch sections with their pass_contents
      const { data: sections, error } = await supabase
        .from('content_generation_sections')
        .select('section_key, section_heading, section_order, pass_contents')
        .eq('job_id', jobId)
        .order('section_order', { ascending: true });

      if (error) {
        console.error('[PassDiffViewer] Failed to fetch sections:', error);
        return;
      }

      // Assemble content for this pass from all sections
      const passKey = `pass_${passNumber}`;
      const contentParts: string[] = [];

      sections?.forEach(section => {
        const sectionPassContents = section.pass_contents as Record<string, string> | null;
        const content = sectionPassContents?.[passKey];

        if (content) {
          // Add section heading and content
          const heading = section.section_heading || `Section ${section.section_order}`;
          contentParts.push(`## ${heading}\n\n${content}`);
        }
      });

      const assembledContent = contentParts.length > 0
        ? contentParts.join('\n\n---\n\n')
        : `No content saved for Pass ${passNumber}`;

      setPassContents(prev => ({
        ...prev,
        [passNumber]: assembledContent
      }));

      console.log(`[PassDiffViewer] Loaded content for pass ${passNumber}: ${assembledContent.length} chars`);
    } catch (err) {
      console.error('[PassDiffViewer] Error loading pass content:', err);
    } finally {
      setLoadingContentPass(null);
    }
  }, [jobId, supabaseUrl, supabaseAnonKey, passContents]);

  // Check if we have any data to show
  const hasData = Object.keys(structuralSnapshots).length > 0 || Object.keys(qualityScores).length > 0;

  if (!hasData) {
    return (
      <Card className="p-4 bg-gray-900/50">
        <div className="text-center text-gray-500 text-sm">
          No pass tracking data available yet.
          <br />
          <span className="text-xs">Data will appear as passes complete.</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quality warning banner */}
      {qualityWarning && (
        <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-red-300">{qualityWarning}</div>
          </div>
        </div>
      )}

      {/* Pass accordion */}
      <div className="space-y-2">
        {passData.map((pass) => (
          <PassAccordionItem
            key={pass.passNumber}
            passNumber={pass.passNumber}
            passName={pass.passName}
            snapshot={pass.snapshot}
            diff={pass.diff}
            qualityScore={pass.qualityScore}
            prevQualityScore={pass.prevQualityScore}
            isExpanded={expandedPass === pass.passNumber}
            onToggle={() => setExpandedPass(
              expandedPass === pass.passNumber ? null : pass.passNumber
            )}
            onRollback={pass.snapshot ? () => handleRollback(pass.passNumber) : undefined}
            isRollingBack={isRollingBack}
            enableContentViewing={enableContentViewing}
            passContent={passContents[pass.passNumber]}
            isLoadingContent={loadingContentPass === pass.passNumber}
            onViewContent={() => handleViewContent(pass.passNumber)}
          />
        ))}
      </div>
    </div>
  );
};

export default PassDiffViewer;
