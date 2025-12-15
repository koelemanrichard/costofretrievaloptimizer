/**
 * CollapsiblePanel
 *
 * A reusable collapsible section for the dashboard.
 * Supports expand/collapse with animation and persistent state.
 */

import React, { useState, useEffect, useRef } from 'react';

interface CollapsiblePanelProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
  priority?: 'primary' | 'secondary' | 'advanced';
  className?: string;
  headerActions?: React.ReactNode;
  onToggle?: (expanded: boolean) => void;
  persistKey?: string; // If provided, saves state to localStorage
}

const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  id,
  title,
  icon,
  defaultExpanded = true,
  children,
  badge,
  priority = 'primary',
  className = '',
  headerActions,
  onToggle,
  persistKey,
}) => {
  // Initialize expanded state from localStorage if persistKey provided
  const [isExpanded, setIsExpanded] = useState(() => {
    if (persistKey) {
      try {
        const saved = localStorage.getItem(`panel-${persistKey}`);
        if (saved !== null) {
          return JSON.parse(saved);
        }
      } catch {
        // Ignore parse errors
      }
    }
    return defaultExpanded;
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');

  // Update content height when expanded changes
  useEffect(() => {
    if (contentRef.current) {
      if (isExpanded) {
        setContentHeight(contentRef.current.scrollHeight);
        // After animation, set to auto for dynamic content
        const timer = setTimeout(() => setContentHeight('auto'), 300);
        return () => clearTimeout(timer);
      } else {
        setContentHeight(contentRef.current.scrollHeight);
        // Force reflow then collapse
        requestAnimationFrame(() => setContentHeight(0));
      }
    }
  }, [isExpanded]);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);

    if (persistKey) {
      try {
        localStorage.setItem(`panel-${persistKey}`, JSON.stringify(newState));
      } catch {
        // Ignore storage errors
      }
    }

    onToggle?.(newState);
  };

  // Priority-based styling
  const priorityStyles = {
    primary: {
      wrapper: 'bg-gray-800/40 border-gray-700/50',
      header: 'hover:bg-gray-700/30',
      title: 'text-white font-semibold',
      icon: 'text-blue-400',
    },
    secondary: {
      wrapper: 'bg-gray-800/20 border-gray-700/30',
      header: 'hover:bg-gray-700/20',
      title: 'text-gray-200 font-medium',
      icon: 'text-gray-400',
    },
    advanced: {
      wrapper: 'bg-gray-900/30 border-gray-700/20',
      header: 'hover:bg-gray-800/30',
      title: 'text-gray-400 font-medium text-sm',
      icon: 'text-gray-500',
    },
  };

  const styles = priorityStyles[priority];

  return (
    <div
      id={id}
      className={`rounded-lg border ${styles.wrapper} overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-between p-3 ${styles.header} transition-colors`}
      >
        <div className="flex items-center gap-2">
          {/* Expand/Collapse Icon */}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          {/* Icon */}
          {icon && <span className={`${styles.icon}`}>{icon}</span>}

          {/* Title */}
          <span className={styles.title}>{title}</span>

          {/* Badge */}
          {badge && <span className="ml-2">{badge}</span>}
        </div>

        {/* Header Actions (don't collapse on click) */}
        {headerActions && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2"
          >
            {headerActions}
          </div>
        )}
      </button>

      {/* Content with animation */}
      <div
        ref={contentRef}
        style={{
          height: typeof contentHeight === 'number' ? `${contentHeight}px` : contentHeight,
          overflow: isExpanded ? 'visible' : 'hidden',
        }}
        className="transition-[height] duration-300 ease-in-out"
      >
        <div className="p-3 pt-0">{children}</div>
      </div>
    </div>
  );
};

/**
 * Panel Group - manages a set of collapsible panels
 */
interface PanelGroupProps {
  children: React.ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}

export const PanelGroup: React.FC<PanelGroupProps> = ({
  children,
  className = '',
  gap = 'md',
}) => {
  const gapClasses = {
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
  };

  return <div className={`${gapClasses[gap]} ${className}`}>{children}</div>;
};

/**
 * Hook for managing panel states across components
 */
export function useDashboardLayout(defaultPanels: string[] = []) {
  const [expandedPanels, setExpandedPanels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dashboard-panels');
      return saved ? JSON.parse(saved) : defaultPanels;
    } catch {
      return defaultPanels;
    }
  });

  const togglePanel = (panelId: string) => {
    setExpandedPanels((prev) => {
      const next = prev.includes(panelId)
        ? prev.filter((id) => id !== panelId)
        : [...prev, panelId];
      try {
        localStorage.setItem('dashboard-panels', JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const isPanelExpanded = (panelId: string) => expandedPanels.includes(panelId);

  const expandAll = (panelIds: string[]) => {
    setExpandedPanels(panelIds);
    try {
      localStorage.setItem('dashboard-panels', JSON.stringify(panelIds));
    } catch {
      // Ignore
    }
  };

  const collapseAll = () => {
    setExpandedPanels([]);
    try {
      localStorage.setItem('dashboard-panels', JSON.stringify([]));
    } catch {
      // Ignore
    }
  };

  return {
    expandedPanels,
    togglePanel,
    isPanelExpanded,
    expandAll,
    collapseAll,
  };
}

export default CollapsiblePanel;
