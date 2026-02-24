import React from 'react';
import type { CascadeImpact } from '../../types/dialogue';

// ──── Types ────

interface CascadeWarningProps {
  impact: CascadeImpact;
  onAction: (action: 'update_all' | 'review' | 'cancel') => void;
}

// ──── Severity Config ────

const SEVERITY_STYLES: Record<CascadeImpact['severity'], { border: string; bg: string; iconColor: string; titleColor: string }> = {
  info: {
    border: 'border-blue-600/30',
    bg: 'bg-blue-900/20',
    iconColor: 'text-blue-400',
    titleColor: 'text-blue-300',
  },
  warning: {
    border: 'border-amber-600/30',
    bg: 'bg-amber-900/20',
    iconColor: 'text-amber-400',
    titleColor: 'text-amber-300',
  },
  critical: {
    border: 'border-red-600/30',
    bg: 'bg-red-900/20',
    iconColor: 'text-red-400',
    titleColor: 'text-red-300',
  },
};

// ──── Main Component ────

const CascadeWarning: React.FC<CascadeWarningProps> = ({ impact, onAction }) => {
  const styles = SEVERITY_STYLES[impact.severity];

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-5`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Warning triangle icon */}
        <svg
          className={`w-5 h-5 ${styles.iconColor} flex-shrink-0 mt-0.5`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <h3 className={`text-sm font-semibold ${styles.titleColor}`}>
            Downstream Impact Detected
          </h3>
          <p className="text-sm text-gray-300 mt-1">
            {impact.description}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 mb-4">
        {impact.affectedEavCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-900/40 text-amber-200 border border-amber-700/30">
            {impact.affectedEavCount} EAV{impact.affectedEavCount !== 1 ? 's' : ''} affected
          </span>
        )}
        {impact.affectedTopicCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-900/40 text-amber-200 border border-amber-700/30">
            {impact.affectedTopicCount} topic{impact.affectedTopicCount !== 1 ? 's' : ''} affected
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onAction('update_all')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Update all automatically
        </button>
        <button
          type="button"
          onClick={() => onAction('review')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          Review changes first
        </button>
        <button
          type="button"
          onClick={() => onAction('cancel')}
          className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
        >
          Cancel change
        </button>
      </div>
    </div>
  );
};

export default CascadeWarning;
