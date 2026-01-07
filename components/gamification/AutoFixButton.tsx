// components/gamification/AutoFixButton.tsx
// One-click auto-fix button for improvement suggestions

import React, { useState } from 'react';
import { AutoFixType } from '../../utils/gamification/scoreCalculations';

interface AutoFixButtonProps {
  fixType: AutoFixType;
  onFix: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Small button that appears next to fixable improvement suggestions
 */
const AutoFixButton: React.FC<AutoFixButtonProps> = ({
  fixType,
  onFix,
  disabled = false,
  size = 'sm'
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Don't render if no fix type
  if (!fixType) return null;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-3 py-1 text-sm gap-1.5';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onFix();
      }}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        inline-flex items-center ${sizeClasses}
        rounded-full font-medium
        transition-all duration-200 ease-out
        ${disabled
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : isHovered
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 scale-105'
            : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white'
        }
      `}
      title={getFixTooltip(fixType)}
    >
      <WrenchIcon className={iconSize} />
      <span>Fix</span>
    </button>
  );
};

// Simple wrench icon
const WrenchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

/**
 * Get tooltip text for a fix type
 */
function getFixTooltip(fixType: AutoFixType): string {
  switch (fixType) {
    case 'add_unique_eavs':
      return 'Generate UNIQUE E-A-Vs to differentiate your brand';
    case 'add_root_eavs':
      return 'Generate foundational ROOT E-A-Vs';
    case 'add_common_eavs':
      return 'Generate industry COMMON E-A-Vs';
    case 'expand_eavs':
      return 'Expand E-A-V coverage';
    case 'analyze_intents':
      return 'Analyze and assign search intents';
    case 'add_buyer_topics':
      return 'Generate commercial/transactional topics';
    case 'add_supporting_topics':
      return 'Generate supporting topics';
    case 'generate_briefs':
      return 'Generate content briefs';
    case 'complete_briefs':
      return 'Complete incomplete briefs';
    case 'add_competitors':
      return 'Add competitor URLs';
    case 'add_value_props':
      return 'Suggest value propositions';
    default:
      return 'Auto-fix this issue';
  }
}

export default AutoFixButton;
