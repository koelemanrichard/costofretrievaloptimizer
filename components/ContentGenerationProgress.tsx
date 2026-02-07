// components/ContentGenerationProgress.tsx
import React, { useState, useMemo, useEffect, memo, useCallback } from 'react';
import { ContentGenerationJob, ContentGenerationSection, PASS_NAMES, PassesStatus } from '../types';
import { SimpleMarkdown } from './ui/SimpleMarkdown';

// Memoized section preview to prevent unnecessary re-renders
const SectionPreview = memo(({ section, index }: { section: ContentGenerationSection; index: number }) => {
  // Truncate very long content to prevent performance issues
  const truncatedContent = useMemo(() => {
    const content = section.current_content || '';
    if (content.length > 2000) {
      return content.substring(0, 2000) + '\n\n*[Content truncated in preview...]*';
    }
    return content;
  }, [section.current_content]);

  return (
    <div className="mb-4 pb-4 border-b border-gray-800 last:border-b-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
          {section.section_order + 1}
        </span>
        <span className="text-xs text-gray-500">
          {section.section_heading}
        </span>
      </div>
      <SimpleMarkdown content={truncatedContent} />
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if section content actually changed
  return prevProps.section.current_content === nextProps.section.current_content &&
         prevProps.section.section_key === nextProps.section.section_key;
});

// Activity messages for each pass to show what's happening
const PASS_ACTIVITY_MESSAGES: Record<number, string[]> = {
  1: ['Generating draft content...', 'Writing section content...', 'Creating initial draft...'],
  2: ['Optimizing headings...', 'Improving header hierarchy...', 'Refining section titles...'],
  3: ['Adding lists and tables...', 'Structuring data...', 'Creating formatted elements...'],
  4: ['Integrating discourse flow...', 'Adding transitions...', 'Improving content flow...'],
  5: ['Applying micro semantics...', 'Optimizing word choice...', 'Refining language...'],
  6: ['Adding visual elements...', 'Inserting image placeholders...', 'Optimizing visual layout...'],
  7: ['Synthesizing introduction...', 'Crafting opening...', 'Finalizing intro paragraph...'],
  8: ['Final polish pass...', 'Smoothing transitions...', 'Final content refinement...'],
  9: ['Running content audit...', 'Checking quality rules...', 'Validating SEO compliance...'],
  10: ['Generating schema...', 'Creating structured data...', 'Building JSON-LD markup...'],
};

interface ContentGenerationProgressProps {
  job: ContentGenerationJob;
  sections: ContentGenerationSection[];
  progress: number;
  currentPassName: string;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry?: () => void;
  onRerunFromPass?: (passNumber: number) => void;
  onApproveCheckpoint?: () => void;
  error?: string | null;
  /** Template name being used for generation (from brief.selectedTemplate) */
  templateName?: string;
  /** Template selection confidence score (0-100) */
  templateConfidence?: number;
}

// Estimated average seconds per section per pass (based on historical data)
// New 10-pass order:
// 1: Draft, 2: Headers, 3: Intro Synthesis, 4: Lists/Tables, 5: Discourse,
// 6: Micro Semantics, 7: Visual Semantics, 8: Final Polish, 9: Audit, 10: Schema
const ESTIMATED_SECONDS_PER_SECTION: Record<number, number> = {
  1: 45,  // Draft generation - longest
  2: 15,  // Headers optimization
  3: 10,  // Introduction synthesis (only 1-2 sections)
  4: 15,  // Lists/tables
  5: 15,  // Discourse integration
  6: 15,  // Micro semantics
  7: 15,  // Visual semantics
  8: 30,  // Final polish (full article)
  9: 20,  // Audit
  10: 15, // Schema generation
};

/**
 * Calculate estimated time remaining based on current progress
 */
function calculateEstimatedTimeRemaining(
  currentPass: number,
  totalSections: number,
  completedSections: number,
  passesStatus: PassesStatus
): { minutes: number; seconds: number } | null {
  if (!totalSections || totalSections === 0) return null;

  let remainingSeconds = 0;

  // Calculate remaining time for current pass
  if (currentPass === 1) {
    const sectionsLeft = totalSections - (completedSections || 0);
    remainingSeconds += sectionsLeft * ESTIMATED_SECONDS_PER_SECTION[1];
  }

  // Add time for remaining passes (10 total in new order)
  // New order: 1-draft, 2-headers, 3-intro, 4-lists, 5-discourse, 6-microsemantics, 7-visuals, 8-polish, 9-audit, 10-schema
  const passKeyMap: Record<number, string> = {
    1: 'draft', 2: 'headers', 3: 'intro', 4: 'lists', 5: 'discourse',
    6: 'microsemantics', 7: 'visuals', 8: 'polish', 9: 'audit', 10: 'schema'
  };

  for (let pass = Math.max(currentPass, 2); pass <= 10; pass++) {
    const passKey = `pass_${pass}_${passKeyMap[pass]}` as keyof PassesStatus;
    const status = passesStatus[passKey];

    if (status !== 'completed') {
      // Pass 3 (intro) and Pass 8 (polish) process fewer sections
      const sectionsToProcess = (pass === 3 || pass === 8) ? 1 : Math.ceil(totalSections * 0.7); // ~70% of sections need optimization
      remainingSeconds += sectionsToProcess * (ESTIMATED_SECONDS_PER_SECTION[pass] || 15);
    }
  }

  if (remainingSeconds <= 0) return null;

  return {
    minutes: Math.floor(remainingSeconds / 60),
    seconds: remainingSeconds % 60
  };
}

/**
 * Format time remaining as a human-readable string
 */
function formatTimeRemaining(estimate: { minutes: number; seconds: number } | null): string {
  if (!estimate) return '';
  if (estimate.minutes === 0) return `~${estimate.seconds}s remaining`;
  if (estimate.minutes < 2) return `~${estimate.minutes}m ${estimate.seconds}s remaining`;
  return `~${estimate.minutes} min remaining`;
}

const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-4 h-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const CircleIcon = () => (
  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
  </svg>
);

const getPassStatus = (job: ContentGenerationJob, passNum: number): 'completed' | 'in_progress' | 'pending' | 'failed' => {
  // Correct 10-pass order:
  // 1: Draft, 2: Headers, 3: Lists/Tables, 4: Discourse, 5: Micro Semantics,
  // 6: Visual Semantics, 7: Intro Synthesis, 8: Final Polish, 9: Audit, 10: Schema
  const passKeys: (keyof PassesStatus)[] = [
    'pass_1_draft', 'pass_2_headers', 'pass_3_lists', 'pass_4_discourse',
    'pass_5_microsemantics', 'pass_6_visuals', 'pass_7_intro', 'pass_8_polish',
    'pass_9_audit', 'pass_10_schema'
  ];
  const key = passKeys[passNum - 1];
  // Defensive null check - prevents crash when passes_status is null/undefined
  if (!job.passes_status) return 'pending';
  return job.passes_status[key] || 'pending';
};

// Pulsing dot indicator for active processing
const PulsingDot = () => (
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
  </span>
);

// One-line descriptions for each pass to help users understand what's happening
const PASS_DESCRIPTIONS: Record<number, string> = {
  1: 'Writing initial draft for each section',
  2: 'Optimizing headings and structure',
  3: 'Adding lists and tables for Featured Snippets',
  4: 'Adding transitions and contextual bridges',
  5: 'Fine-tuning language and modality',
  6: 'Inserting image placeholders with semantic alt text',
  7: 'Rewriting introduction to match full article',
  8: 'Final polish and formatting',
  9: 'Quality audit scoring content against 21+ rules',
  10: 'Generating JSON-LD schema markup',
};

// Memoized pass list item to prevent unnecessary re-renders
const PassListItem = memo(({ num, name, status }: { num: string; name: string; status: 'completed' | 'in_progress' | 'pending' | 'failed' }) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-center gap-2 text-sm">
      {status === 'completed' ? (
        <CheckIcon />
      ) : status === 'in_progress' ? (
        <SpinnerIcon />
      ) : (
        <CircleIcon />
      )}
      <span className={status === 'completed' ? 'text-gray-400' : 'text-gray-200'}>
        Pass {num}: {name}
      </span>
    </div>
    {status === 'in_progress' && PASS_DESCRIPTIONS[parseInt(num)] && (
      <span className="text-xs text-gray-500 ml-6">{PASS_DESCRIPTIONS[parseInt(num)]}</span>
    )}
  </div>
));

// Memoized pass list to prevent re-renders when job changes but pass statuses haven't
const MemoizedPassList = memo(({ passesStatus, currentPass }: { passesStatus: PassesStatus | null; currentPass: number }) => {
  // Create a stable key based on actual pass statuses
  const passStatusKey = useMemo(() => {
    if (!passesStatus) return 'none';
    return Object.entries(passesStatus)
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
  }, [passesStatus]);

  return (
    <div className="space-y-1 mb-4">
      {Object.entries(PASS_NAMES).map(([num, name]) => {
        const passNum = parseInt(num);
        const passKeys: (keyof PassesStatus)[] = [
          'pass_1_draft', 'pass_2_headers', 'pass_3_lists', 'pass_4_discourse',
          'pass_5_microsemantics', 'pass_6_visuals', 'pass_7_intro', 'pass_8_polish',
          'pass_9_audit', 'pass_10_schema'
        ];
        const key = passKeys[passNum - 1];
        const status = passesStatus?.[key] || 'pending';
        return (
          <PassListItem key={num} num={num} name={name} status={status} />
        );
      })}
    </div>
  );
}, (prev, next) => {
  // Only re-render if pass statuses or current pass changed
  if (prev.currentPass !== next.currentPass) return false;
  if (!prev.passesStatus && !next.passesStatus) return true;
  if (!prev.passesStatus || !next.passesStatus) return false;
  // Compare actual pass status values
  const keys = Object.keys(prev.passesStatus) as (keyof PassesStatus)[];
  return keys.every(k => prev.passesStatus![k] === next.passesStatus![k]);
});

export const ContentGenerationProgress: React.FC<ContentGenerationProgressProps> = ({
  job,
  sections,
  progress,
  currentPassName,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onRerunFromPass,
  onApproveCheckpoint,
  error,
  templateName,
  templateConfidence
}) => {
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [activityMessageIndex, setActivityMessageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // PERFORMANCE: Cycle activity messages less frequently (every 10 seconds instead of 3)
  // This reduces re-renders during long-running generation
  useEffect(() => {
    if (job.status !== 'in_progress') return;

    const messageInterval = setInterval(() => {
      setActivityMessageIndex(prev => prev + 1);
    }, 10000); // Reduced from 3000ms to 10000ms

    return () => clearInterval(messageInterval);
  }, [job.status]);

  // PERFORMANCE: Track elapsed time less frequently (every 30 seconds instead of 5)
  // This significantly reduces re-renders during generation
  useEffect(() => {
    if (job.status !== 'in_progress') {
      setElapsedSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 30);
    }, 30000); // Reduced from 5000ms to 30000ms

    return () => clearInterval(timer);
  }, [job.status, job.current_pass]); // Removed job.current_section_key to reduce re-mount frequency

  // Reset elapsed time when pass or section changes
  useEffect(() => {
    setElapsedSeconds(0);
  }, [job.current_pass, job.current_section_key]);

  // Get current activity message
  const currentActivityMessage = useMemo(() => {
    const messages = PASS_ACTIVITY_MESSAGES[job.current_pass] || ['Processing...'];
    return messages[activityMessageIndex % messages.length];
  }, [job.current_pass, activityMessageIndex]);

  // Get current section being processed (for passes 2+)
  const currentProcessingSection = useMemo(() => {
    if (job.current_section_key) {
      const section = sections.find(s => s.section_key === job.current_section_key);
      return section?.section_heading || job.current_section_key;
    }
    return null;
  }, [job.current_section_key, sections]);

  // Get completed sections with content for preview
  const completedSections = sections
    .filter(s => s.status === 'completed' && s.current_content)
    .sort((a, b) => a.section_order - b.section_order);

  // Calculate word count of generated content
  const totalWords = completedSections.reduce((sum, s) => {
    const words = s.current_content?.split(/\s+/).length || 0;
    return sum + words;
  }, 0);

  // Calculate estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    if (job.status !== 'in_progress') return null;
    return calculateEstimatedTimeRemaining(
      job.current_pass,
      job.total_sections || sections.length,
      job.completed_sections || completedSections.length,
      job.passes_status
    );
  }, [job.current_pass, job.total_sections, job.completed_sections, job.passes_status, job.status, sections.length, completedSections.length]);

  const timeRemainingText = formatTimeRemaining(estimatedTimeRemaining);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">
              Generating Article Draft
            </h3>
            {/* Template Badge - shows selected template with confidence indicator */}
            {templateName && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                  templateConfidence && templateConfidence >= 80
                    ? 'bg-green-900/30 border-green-600/50 text-green-400'
                    : templateConfidence && templateConfidence >= 60
                    ? 'bg-yellow-900/30 border-yellow-600/50 text-yellow-400'
                    : 'bg-gray-700/50 border-gray-600/50 text-gray-400'
                }`}
                title={`Template: ${templateName}${templateConfidence ? ` (${templateConfidence}% match)` : ''}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                {templateName.replace(/_/g, ' ')}
                {templateConfidence && (
                  <span className="text-[10px] opacity-70">{templateConfidence}%</span>
                )}
              </span>
            )}
          </div>
          {timeRemainingText && job.status === 'in_progress' && (
            <p className="text-xs text-gray-400 mt-1">{timeRemainingText}</p>
          )}
        </div>
        {completedSections.length > 0 && (
          <button
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              showLivePreview
                ? 'bg-blue-900/50 border-blue-600 text-blue-200'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {showLivePreview ? '▲ Hide Preview' : '▼ Live Preview'} ({totalWords} words)
          </button>
        )}
      </div>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1 text-gray-300">
          <span>Pass {job.current_pass} of 10: {currentPassName}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Real-time Activity Status */}
      {job.status === 'in_progress' && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <div className="flex items-center gap-3">
            <PulsingDot />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-blue-200 font-medium truncate">
                {currentActivityMessage}
              </p>
              {currentProcessingSection && (
                <p className="text-xs text-blue-300/70 mt-0.5 truncate">
                  Section: {currentProcessingSection}
                </p>
              )}
            </div>
            <div className="text-xs text-blue-400/60 tabular-nums">
              {elapsedSeconds > 0 && `${elapsedSeconds}s`}
            </div>
          </div>
        </div>
      )}

      {/* Section Progress - Simplified to prevent browser hang */}
      {/* Only show detailed section list for Pass 1; show simple counter for other passes */}
      {job.status === 'in_progress' && sections.length > 0 && (
        <div className="mb-4 border border-gray-700/50 rounded-lg p-3 bg-gray-900/30">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">
              {job.current_pass === 1
                ? `Section ${job.completed_sections || 0} of ${job.total_sections || sections.length}`
                : `Optimizing ${sections.length} sections`
              }
            </p>
            <span className="text-xs text-gray-500">Pass {job.current_pass}</span>
          </div>
          {/* Simple progress bar instead of detailed section list to prevent re-render lag */}
          {job.current_pass === 1 && (
            <div className="mt-2">
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${((job.completed_sections || 0) / (job.total_sections || sections.length)) * 100}%` }}
                />
              </div>
              {/* Only show current section being processed */}
              {currentProcessingSection && (
                <div className="flex items-center gap-2 mt-2">
                  <SpinnerIcon />
                  <span className="text-xs text-blue-300 truncate">{currentProcessingSection}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pass List - Memoized to prevent excessive re-renders */}
      <MemoizedPassList passesStatus={job.passes_status} currentPass={job.current_pass} />

      {/* Stall Warning - Show if processing for too long (adjusted for 30s timer intervals) */}
      {job.status === 'in_progress' && elapsedSeconds >= 120 && (
        <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-amber-300 font-medium">Taking longer than expected</p>
              <p className="text-xs text-amber-400/80 mt-1">
                This operation is taking longer than usual ({Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s).
                The AI model may be experiencing high load. You can wait, or try pausing and resuming.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {(job.last_error || error) && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-300 font-medium mb-1">Generation Error</p>
              <p className="text-xs text-red-400">{job.last_error || error}</p>
              {(job.last_error || error)?.includes('503') || (job.last_error || error)?.includes('overloaded') ? (
                <p className="text-xs text-amber-400 mt-2">
                  Tip: The model is overloaded. Try resuming in a few seconds or switch to a different AI provider in Settings.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Audit Score */}
      {/* Audit Score + Next Steps */}
      {job.status === 'completed' && job.final_audit_score !== null && (
        <div className="mb-4 space-y-3">
          <div className="p-3 bg-green-900/30 border border-green-700 rounded">
            <p className="text-green-300 font-semibold">
              Audit Score: {job.final_audit_score}%
            </p>
          </div>
          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded">
            <p className="text-sm font-medium text-gray-300 mb-2">Next Steps:</p>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>Review article quality in the Quality tab</li>
              <li>Export as HTML or Markdown</li>
              <li>Publish to WordPress (if connected)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Audit Failed Guidance */}
      {job.status === 'audit_failed' && (
        <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700 rounded">
          <p className="text-amber-300 font-semibold mb-1">
            Audit Score: {job.final_audit_score ?? 0}% — Target: 70%
          </p>
          <p className="text-sm text-amber-200/70 mb-2">
            Content quality is below the minimum threshold. Use the re-run button below to address failing rules.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {job.status === 'in_progress' && (
          <button
            onClick={onPause}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
          >
            Pause
          </button>
        )}
        {job.status === 'paused' && (
          <button
            onClick={onResume}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Resume
          </button>
        )}
        {(job.status === 'failed' || job.status === 'audit_failed') && onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        )}
        {job.status === 'audit_failed' && onRerunFromPass && (
          <button
            onClick={() => {
              const suggestion = (job.audit_details as any)?.rerunSuggestion;
              onRerunFromPass(suggestion?.targetPass || 1);
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Re-run from suggested pass
          </button>
        )}
        {job.status === ('checkpoint' as any) && (
          <div className="flex gap-2">
            {onApproveCheckpoint && (
              <button
                onClick={onApproveCheckpoint}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
              >
                Approve & Continue
              </button>
            )}
            {onRerunFromPass && (
              <button
                onClick={() => onRerunFromPass(Math.max(1, (job.current_pass || 1) - 1))}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm"
              >
                Rollback
              </button>
            )}
          </div>
        )}
        {(job.status === 'in_progress' || job.status === 'paused' || job.status === 'failed' || job.status === 'audit_failed' || job.status === ('checkpoint' as any)) && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Live Preview Panel - Limited to 5 sections during generation for performance */}
      {showLivePreview && completedSections.length > 0 && (
        <div className="mt-4 border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-300">
              Live Preview ({completedSections.length} sections generated)
            </h4>
            <span className="text-xs text-gray-500">
              {job.status === 'in_progress' ? 'Showing first 5 sections' : 'Content will be refined in subsequent passes'}
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="prose prose-invert prose-sm max-w-none">
              {/* Limit to 5 sections during generation to prevent performance issues */}
              {(job.status === 'in_progress' ? completedSections.slice(0, 5) : completedSections).map((section, idx) => (
                <SectionPreview
                  key={`preview-${section.section_key}-${section.id || idx}`}
                  section={section}
                  index={idx}
                />
              ))}
              {job.status === 'in_progress' && completedSections.length > 5 && (
                <p className="text-gray-500 text-sm text-center py-2">
                  +{completedSections.length - 5} more sections (full preview after completion)
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-amber-400/70 mt-2 italic">
            ⚠️ This is draft content. If you see issues, you can Pause or Cancel and adjust the brief before continuing.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContentGenerationProgress;
