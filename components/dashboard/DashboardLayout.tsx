/**
 * DashboardLayout
 *
 * Main layout wrapper for the project dashboard.
 * Implements progressive disclosure with collapsible sections.
 */

import React from 'react';
import CollapsiblePanel, { PanelGroup, useDashboardLayout } from './CollapsiblePanel';

interface DashboardLayoutProps {
  children: React.ReactNode;
  projectName: string;
  mapName?: string;
  onBackToProjects?: () => void;
  onMigrationWorkbench?: () => void;
  headerActions?: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  projectName,
  mapName,
  onBackToProjects,
  onMigrationWorkbench,
  headerActions,
}) => {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Project Header */}
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Project/Map Name */}
              <div>
                <h1 className="text-lg font-semibold text-white">
                  {projectName}
                </h1>
                {mapName && (
                  <p className="text-sm text-gray-400">
                    Topical Map: {mapName}
                  </p>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              {headerActions}

              {onMigrationWorkbench && (
                <button
                  onClick={onMigrationWorkbench}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                >
                  Migration Workbench
                </button>
              )}

              {onBackToProjects && (
                <button
                  onClick={onBackToProjects}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Projects
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

/**
 * Section wrapper for dashboard sections
 */
interface DashboardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  children,
  className = '',
}) => {
  return (
    <section className={`space-y-4 ${className}`}>
      {children}
    </section>
  );
};

/**
 * Next Step Card - highlights the primary action
 */
interface NextStepCardProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  isLoading?: boolean;
  variant?: 'info' | 'warning' | 'success';
  icon?: React.ReactNode;
}

export const NextStepCard: React.FC<NextStepCardProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  isLoading,
  variant = 'info',
  icon,
}) => {
  const variantStyles = {
    info: {
      bg: 'bg-blue-500/10 border-blue-500/30',
      icon: 'text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    warning: {
      bg: 'bg-yellow-500/10 border-yellow-500/30',
      icon: 'text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700',
    },
    success: {
      bg: 'bg-green-500/10 border-green-500/30',
      icon: 'text-green-400',
      button: 'bg-green-600 hover:bg-green-700',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`rounded-lg border ${styles.bg} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && <span className={`${styles.icon} mt-0.5`}>{icon}</span>}
          <div>
            <h3 className="text-white font-medium">{title}</h3>
            <p className="text-gray-400 text-sm mt-0.5">{description}</p>
          </div>
        </div>
        <button
          onClick={onAction}
          disabled={isLoading}
          className={`
            px-4 py-2 rounded-lg text-white text-sm font-medium
            ${styles.button}
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors flex-shrink-0
          `}
        >
          {isLoading ? 'Loading...' : actionLabel}
        </button>
      </div>
    </div>
  );
};

/**
 * Stat Card for metrics display
 */
interface StatCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  detail?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  trend,
  detail,
  onClick,
}) => {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400',
  };

  return (
    <div
      className={`
        bg-gray-800/50 border border-gray-700/50 rounded-lg p-4
        ${onClick ? 'cursor-pointer hover:bg-gray-800/70 transition-colors' : ''}
      `}
      onClick={onClick}
    >
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
      {detail && (
        <div className={`text-xs mt-1 ${trend ? trendColors[trend] : 'text-gray-500'}`}>
          {detail}
        </div>
      )}
    </div>
  );
};

/**
 * Action Group - grouped set of related actions
 */
interface ActionGroupProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const ActionGroup: React.FC<ActionGroupProps> = ({
  title,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
};

export { CollapsiblePanel, PanelGroup, useDashboardLayout };
export default DashboardLayout;
