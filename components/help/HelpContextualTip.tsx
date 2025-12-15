/**
 * HelpContextualTip.tsx
 *
 * Small inline help icon that links to relevant documentation.
 * Place next to UI elements to provide contextual help access.
 */

import React, { useState, useRef, useEffect } from 'react';

interface HelpContextualTipProps {
  /**
   * Feature key that maps to a help article.
   * Format: "category:feature" (e.g., "modal:contentBrief", "button:generateBrief")
   */
  featureKey: string;

  /**
   * Optional tooltip text. If not provided, shows "Get help"
   */
  tooltip?: string;

  /**
   * Icon size in pixels
   * @default 16
   */
  size?: number;

  /**
   * Optional className for custom styling
   */
  className?: string;

  /**
   * Position of the tooltip
   * @default 'top'
   */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Opens the help window to a specific feature's documentation.
 */
const openHelpForFeature = (featureKey: string) => {
  // Convert feature key to URL path
  // Format: "category:feature" -> "#/category/feature"
  // Or direct article link if known
  const url = `/help.html#/${featureKey.replace(':', '/')}`;
  window.open(url, 'holistic-seo-help', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no');
};

export const HelpContextualTip: React.FC<HelpContextualTipProps> = ({
  featureKey,
  tooltip = 'Get help',
  size = 16,
  className = '',
  tooltipPosition = 'top'
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openHelpForFeature(featureKey);
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openHelpForFeature(featureKey);
    }
  };

  // Position styles for tooltip
  const getTooltipPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      whiteSpace: 'nowrap',
      zIndex: 50
    };

    switch (tooltipPosition) {
      case 'top':
        return { ...base, bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '4px' };
      case 'bottom':
        return { ...base, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '4px' };
      case 'left':
        return { ...base, right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '4px' };
      case 'right':
        return { ...base, left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '4px' };
      default:
        return base;
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      className={`relative inline-flex items-center justify-center text-gray-400 hover:text-cyan-400 focus:text-cyan-400 focus:outline-none transition-colors ${className}`}
      style={{ width: size, height: size }}
      aria-label={tooltip}
      title={tooltip}
    >
      {/* Question mark icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
      </svg>

      {/* Tooltip */}
      {showTooltip && (
        <span
          style={getTooltipPositionStyles()}
          className="px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg border border-gray-700 pointer-events-none"
        >
          {tooltip}
        </span>
      )}
    </button>
  );
};

/**
 * A wrapper variant that displays as an inline badge with "?" and label
 */
interface HelpBadgeProps extends HelpContextualTipProps {
  label?: string;
}

export const HelpBadge: React.FC<HelpBadgeProps> = ({
  featureKey,
  tooltip = 'Learn more',
  label = 'Help',
  className = ''
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openHelpForFeature(featureKey);
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-700/50 hover:bg-cyan-900/30 text-gray-400 hover:text-cyan-400 rounded transition-colors ${className}`}
      title={tooltip}
    >
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
      </svg>
      {label}
    </button>
  );
};

/**
 * A variant that shows as an icon in section headers
 */
interface HelpSectionTipProps {
  featureKey: string;
  tooltip?: string;
}

export const HelpSectionTip: React.FC<HelpSectionTipProps> = ({
  featureKey,
  tooltip = 'Learn about this section'
}) => {
  return (
    <HelpContextualTip
      featureKey={featureKey}
      tooltip={tooltip}
      size={14}
      className="ml-1 opacity-50 hover:opacity-100"
      tooltipPosition="right"
    />
  );
};

export default HelpContextualTip;
