/**
 * ToolsPanel
 *
 * Grouped tools and settings panel for the dashboard.
 * Organizes actions by category for better discoverability.
 */

import React from 'react';
import { Button } from '../ui/Button';

interface ToolAction {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
  badge?: string | number;
}

interface ToolGroup {
  id: string;
  title: string;
  icon?: React.ReactNode;
  actions: ToolAction[];
}

interface ToolsPanelProps {
  groups: ToolGroup[];
  className?: string;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({ groups, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {groups.map((group) => (
        <ToolGroupCard key={group.id} group={group} />
      ))}
    </div>
  );
};

/**
 * Tool Group Card
 */
interface ToolGroupCardProps {
  group: ToolGroup;
}

const ToolGroupCard: React.FC<ToolGroupCardProps> = ({ group }) => {
  return (
    <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        {group.icon && <span className="text-gray-500">{group.icon}</span>}
        {group.title}
      </h4>
      <div className="space-y-2">
        {group.actions.map((action) => (
          <ToolButton key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
};

/**
 * Tool Button
 */
interface ToolButtonProps {
  action: ToolAction;
}

const ToolButton: React.FC<ToolButtonProps> = ({ action }) => {
  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      className={`
        w-full flex items-center justify-between gap-2
        px-3 py-2 rounded-md text-sm text-left
        ${action.variant === 'primary'
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
      `}
    >
      <span className="flex items-center gap-2">
        {action.icon && <span className="w-4 h-4">{action.icon}</span>}
        {action.loading ? 'Loading...' : action.label}
      </span>
      {action.badge && (
        <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-600 text-gray-300">
          {action.badge}
        </span>
      )}
    </button>
  );
};

/**
 * Predefined tool groups configuration factory
 */
export interface ToolsPanelConfig {
  contentStrategy: {
    onEditPillars: () => void;
    onManageEavs: () => void;
    onManageCompetitors: () => void;
    onBlueprints?: () => void;
    isGeneratingBlueprints?: boolean;
  };
  dataImport: {
    onUploadGsc: () => void;
    onImportKeywords?: () => void;
    onBusinessInfo: () => void;
    onFoundationPages?: () => void;
  };
  analysis: {
    onValidate: () => void;
    onLinkAudit: () => void;
    onAuthority?: () => void;
    onCoverage?: () => void;
    isValidating?: boolean;
    isAuditing?: boolean;
  };
  advanced?: {
    onRegenerateMap?: () => void;
    onRepairBriefs?: () => void;
    onHealthCheck?: () => void;
    onDangerZone?: () => void;
  };
}

export function createToolGroups(config: Partial<ToolsPanelConfig>): ToolGroup[] {
  const groups: ToolGroup[] = [];

  if (config.contentStrategy) {
    groups.push({
      id: 'content-strategy',
      title: 'Content Strategy',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      actions: [
        { id: 'pillars', label: 'Edit Pillars', onClick: config.contentStrategy.onEditPillars },
        { id: 'eavs', label: 'Manage EAVs', onClick: config.contentStrategy.onManageEavs },
        { id: 'competitors', label: 'Manage Competitors', onClick: config.contentStrategy.onManageCompetitors },
        ...(config.contentStrategy.onBlueprints ? [{
          id: 'blueprints',
          label: 'Generate Blueprints',
          onClick: config.contentStrategy.onBlueprints,
          loading: config.contentStrategy.isGeneratingBlueprints,
        }] : []),
      ],
    });
  }

  if (config.dataImport) {
    groups.push({
      id: 'data-import',
      title: 'Data & Import',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      actions: [
        { id: 'gsc', label: 'Upload GSC Data', onClick: config.dataImport.onUploadGsc },
        { id: 'business', label: 'Business Info', onClick: config.dataImport.onBusinessInfo },
        ...(config.dataImport.onFoundationPages ? [{
          id: 'foundation',
          label: 'Foundation Pages',
          onClick: config.dataImport.onFoundationPages,
        }] : []),
        ...(config.dataImport.onImportKeywords ? [{
          id: 'keywords',
          label: 'Import Keywords',
          onClick: config.dataImport.onImportKeywords,
        }] : []),
      ],
    });
  }

  if (config.analysis) {
    groups.push({
      id: 'analysis',
      title: 'Analysis',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      actions: [
        { id: 'validate', label: 'Validate Map', onClick: config.analysis.onValidate, loading: config.analysis.isValidating },
        { id: 'links', label: 'Link Audit', onClick: config.analysis.onLinkAudit, loading: config.analysis.isAuditing },
        ...(config.analysis.onAuthority ? [{
          id: 'authority',
          label: 'Topical Authority',
          onClick: config.analysis.onAuthority,
        }] : []),
        ...(config.analysis.onCoverage ? [{
          id: 'coverage',
          label: 'Coverage Analysis',
          onClick: config.analysis.onCoverage,
        }] : []),
      ],
    });
  }

  if (config.advanced) {
    groups.push({
      id: 'advanced',
      title: 'Advanced',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      actions: [
        ...(config.advanced.onRegenerateMap ? [{
          id: 'regenerate',
          label: 'Regenerate Map',
          onClick: config.advanced.onRegenerateMap,
        }] : []),
        ...(config.advanced.onRepairBriefs ? [{
          id: 'repair',
          label: 'Repair Briefs',
          onClick: config.advanced.onRepairBriefs,
        }] : []),
        ...(config.advanced.onHealthCheck ? [{
          id: 'health',
          label: 'Health Check',
          onClick: config.advanced.onHealthCheck,
        }] : []),
        ...(config.advanced.onDangerZone ? [{
          id: 'danger',
          label: 'Danger Zone',
          onClick: config.advanced.onDangerZone,
          variant: 'ghost' as const,
        }] : []),
      ],
    });
  }

  return groups;
}

export default ToolsPanel;
