import React from 'react';
import { SemanticActionItem, BusinessInfo } from '../../types';
import { SmartFixButton } from './SmartFixButton';
import { AppAction } from '../../state/appState';

interface SemanticActionCardProps {
  action: SemanticActionItem;
  pageContent: string;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<AppAction>;
  onFixGenerated?: (actionId: string, fix: string) => void;
}

export const SemanticActionCard: React.FC<SemanticActionCardProps> = ({
  action,
  pageContent,
  businessInfo,
  dispatch,
  onFixGenerated,
}) => {
  // Category color mapping (left border)
  const categoryColors: Record<typeof action.category, string> = {
    'Low Hanging Fruit': 'border-green-500',
    'Mid Term': 'border-yellow-500',
    'Long Term': 'border-blue-500',
  };

  // Impact badge styling
  const impactBadges: Record<typeof action.impact, string> = {
    High: 'bg-red-500/20 text-red-400',
    Medium: 'bg-yellow-500/20 text-yellow-400',
    Low: 'bg-green-500/20 text-green-400',
  };

  const borderColor = categoryColors[action.category];
  const impactBadgeClass = impactBadges[action.impact];

  const handleFixGenerated = (fix: string) => {
    if (onFixGenerated) {
      onFixGenerated(action.id, fix);
    }
  };

  return (
    <div
      className={`
        bg-gray-800/50 border-l-4 ${borderColor}
        rounded-md p-4 mb-4
        shadow-md
      `}
    >
      {/* Header: Category Label + Type */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {action.category}
        </span>
        <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded">
          {action.type}
        </span>
      </div>

      {/* Title with Impact Badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-white flex-1">
          {action.title}
        </h3>
        <span
          className={`
            ${impactBadgeClass}
            text-xs font-semibold px-2.5 py-1 rounded-full
            whitespace-nowrap
          `}
        >
          {action.impact} Impact
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 leading-relaxed mb-3">
        {action.description}
      </p>

      {/* Rule Reference (if present) */}
      {action.ruleReference && (
        <div className="text-xs text-gray-500 mb-3 italic">
          Rule: {action.ruleReference}
        </div>
      )}

      {/* Smart Fix Button */}
      <SmartFixButton
        action={action}
        pageContent={pageContent}
        businessInfo={businessInfo}
        dispatch={dispatch}
        onFixGenerated={handleFixGenerated}
      />
    </div>
  );
};
