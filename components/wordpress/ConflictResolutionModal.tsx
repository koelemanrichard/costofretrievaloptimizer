// components/wordpress/ConflictResolutionModal.tsx
// Modal for resolving content conflicts between app and WordPress

import React, { useState, useMemo } from 'react';
import { getSupabaseClient } from '../../services/supabaseClient';
import { useAppState } from '../../state/appState';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { ConflictReport, ConflictResolution } from '../../types/wordpress';
import { resolveConflict } from '../../services/wordpress';

// ============================================================================
// Types
// ============================================================================

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: ConflictReport;
  appContent: string;
  onResolved?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflict,
  appContent,
  onResolved
}) => {
  const { state } = useAppState();
  const user = state.user;

  // Get supabase client - memoized to prevent unnecessary re-renders
  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) return null;
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution>('merge');
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const handleResolve = async () => {
    if (!supabase || !user) return;

    setIsResolving(true);
    setError(null);

    try {
      const result = await resolveConflict(
        supabase,
        user.id,
        conflict.publication_id,
        selectedResolution,
        selectedResolution === 'keep_app' ? appContent : undefined
      );

      if (!result.success) {
        setError(result.error || 'Failed to resolve conflict');
        return;
      }

      onResolved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
    } finally {
      setIsResolving(false);
    }
  };

  // Format dates
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Calculate word difference
  const wordDiff = conflict.wp_version.word_count - conflict.app_version.word_count;
  const wordDiffText = wordDiff > 0
    ? `+${wordDiff} words in WordPress`
    : wordDiff < 0
      ? `${wordDiff} words in WordPress`
      : 'Same word count';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Content Conflict Detected"
      description="The WordPress version has been modified since your last push"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Conflict Overview */}
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <WarningIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-yellow-300 font-medium">
                The content in WordPress differs from your local version
              </p>
              <p className="text-sm text-yellow-400/70 mt-1">
                Someone may have edited the post directly in WordPress since you last pushed changes.
              </p>
            </div>
          </div>
        </div>

        {/* Version Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* App Version */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <AppIcon className="w-5 h-5 text-blue-400" />
              <h4 className="font-medium text-white">Your Version</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Words:</span>
                <span className="text-white">{conflict.app_version.word_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last modified:</span>
                <span className="text-white">{formatDate(conflict.app_version.last_modified)}</span>
              </div>
              {conflict.app_version.content_preview && (
                <div className="mt-3 p-2 bg-gray-800/50 rounded text-xs text-gray-400 line-clamp-3">
                  {conflict.app_version.content_preview}...
                </div>
              )}
            </div>
          </div>

          {/* WP Version */}
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <WordPressIcon className="w-5 h-5 text-purple-400" />
              <h4 className="font-medium text-white">WordPress Version</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Words:</span>
                <span className="text-white">{conflict.wp_version.word_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last modified:</span>
                <span className="text-white">{formatDate(conflict.wp_version.last_modified)}</span>
              </div>
              {conflict.wp_version.modified_by && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Modified by:</span>
                  <span className="text-white">{conflict.wp_version.modified_by}</span>
                </div>
              )}
              {conflict.wp_version.content_preview && (
                <div className="mt-3 p-2 bg-gray-800/50 rounded text-xs text-gray-400 line-clamp-3">
                  {conflict.wp_version.content_preview}...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Diff Summary */}
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {conflict.diff_summary.sections_changed}
            </div>
            <div className="text-xs text-gray-400">Sections changed</div>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center">
            <div className={`text-2xl font-bold ${wordDiff > 0 ? 'text-green-400' : wordDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {wordDiffText}
            </div>
            <div className="text-xs text-gray-400">Word difference</div>
          </div>
        </div>

        {/* Resolution Options */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Choose resolution:</h4>
          <div className="space-y-3">
            <ResolutionOption
              value="keep_app"
              current={selectedResolution}
              onChange={setSelectedResolution}
              icon={<AppIcon className="w-5 h-5" />}
              title="Keep Your Version"
              description="Overwrite WordPress with your app version. WordPress changes will be lost."
              recommended={false}
            />
            <ResolutionOption
              value="keep_wp"
              current={selectedResolution}
              onChange={setSelectedResolution}
              icon={<WordPressIcon className="w-5 h-5" />}
              title="Keep WordPress Version"
              description="Accept WordPress changes and update your app to match."
              recommended={false}
            />
            <ResolutionOption
              value="merge"
              current={selectedResolution}
              onChange={setSelectedResolution}
              icon={<MergeIcon className="w-5 h-5" />}
              title="Smart Merge"
              description="Attempt to automatically merge both versions. You'll review the result."
              recommended={true}
              disabled={true}
              disabledReason="Coming soon"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <ErrorIcon className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <Button
            variant="ghost"
            onClick={() => setShowDiff(!showDiff)}
            className="text-gray-400 hover:text-white"
          >
            <DiffIcon className="w-4 h-4 mr-2" />
            {showDiff ? 'Hide' : 'Show'} Differences
          </Button>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isResolving}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={isResolving || selectedResolution === 'merge'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isResolving ? (
                <>
                  <Loader className="w-4 h-4 mr-2" />
                  Resolving...
                </>
              ) : (
                'Apply Resolution'
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

interface ResolutionOptionProps {
  value: ConflictResolution;
  current: ConflictResolution;
  onChange: (value: ConflictResolution) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  recommended?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

const ResolutionOption: React.FC<ResolutionOptionProps> = ({
  value,
  current,
  onChange,
  icon,
  title,
  description,
  recommended,
  disabled,
  disabledReason
}) => {
  const isSelected = value === current;

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(value)}
      disabled={disabled}
      className={`w-full p-4 rounded-lg border text-left transition-colors ${
        disabled
          ? 'border-gray-700 bg-gray-800/30 opacity-60 cursor-not-allowed'
          : isSelected
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700/50 text-gray-400'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
              {title}
            </span>
            {recommended && (
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                Recommended
              </span>
            )}
            {disabledReason && (
              <span className="text-xs px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded">
                {disabledReason}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          isSelected ? 'border-blue-500' : 'border-gray-600'
        }`}>
          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
        </div>
      </div>
    </button>
  );
};

// ============================================================================
// Icons
// ============================================================================

const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const AppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const WordPressIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 1.5c4.687 0 8.5 3.813 8.5 8.5 0 4.687-3.813 8.5-8.5 8.5-4.687 0-8.5-3.813-8.5-8.5 0-4.687 3.813-8.5 8.5-8.5zM4.5 12c0 2.51 1.243 4.732 3.147 6.087l-2.66-7.283A7.458 7.458 0 004.5 12zm12.35 4.082l-2.436-7.058-2.32 6.746c.77.056 1.463.168 1.463.168.69.082.609 1.097-.082 1.056 0 0-2.073-.163-3.412-.163-1.26 0-3.377.163-3.377.163-.69.041-.772-.974-.082-1.056 0 0 .652-.112 1.34-.168l1.99-5.454-1.401-4.192-2.33 9.646A7.453 7.453 0 0012 19.5c1.65 0 3.178-.535 4.418-1.444l-.068-.024z"/>
  </svg>
);

const MergeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const DiffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default ConflictResolutionModal;
