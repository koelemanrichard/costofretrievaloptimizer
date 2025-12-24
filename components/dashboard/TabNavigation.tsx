/**
 * TabNavigation
 *
 * Horizontal tab navigation with dropdown menus for organizing dashboard actions.
 * Groups related features into logical categories for cleaner UX.
 */

import React, { useState, useRef, useEffect } from 'react';
import { InfoTooltip } from '../ui/InfoTooltip';

interface NavAction {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  helpText?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'danger';
  currentValue?: string; // Shows current value/status below label
}

interface NavTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  helpText?: string;
  actions: NavAction[];
}

interface TabNavigationProps {
  tabs: NavTab[];
  primaryAction?: NavAction;
  className?: string;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ tabs, primaryAction, className = '' }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current.get(openDropdown);
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const setDropdownRef = (tabId: string, el: HTMLDivElement | null) => {
    if (el) dropdownRefs.current.set(tabId, el);
    else dropdownRefs.current.delete(tabId);
  };

  return (
    <nav className={`bg-gray-800/50 border border-gray-700 rounded-lg ${className}`}>
      <div className="flex items-center justify-between px-2">
        {/* Tab Items */}
        <div className="flex items-center">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              ref={(el) => setDropdownRef(tab.id, el)}
              className="relative"
            >
              <button
                onClick={() => setOpenDropdown(openDropdown === tab.id ? null : tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium
                  transition-colors
                  ${openDropdown === tab.id
                    ? 'text-white bg-gray-700/50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                  }
                `}
              >
                <span className="w-4 h-4">{tab.icon}</span>
                <span>{tab.label}</span>
                <svg
                  className={`w-3 h-3 transition-transform ${openDropdown === tab.id ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {openDropdown === tab.id && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  {tab.helpText && (
                    <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-800">
                      {tab.helpText}
                    </div>
                  )}
                  {tab.actions.map((action, idx) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        if (!action.disabled && !action.loading) {
                          action.onClick();
                          setOpenDropdown(null);
                        }
                      }}
                      disabled={action.disabled || action.loading}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
                        transition-colors
                        ${action.disabled || action.loading
                          ? 'opacity-50 cursor-not-allowed'
                          : action.variant === 'danger'
                            ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                            : action.variant === 'primary'
                              ? 'text-blue-400 hover:bg-blue-500/10 hover:text-blue-300'
                              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }
                        ${idx > 0 ? 'border-t border-gray-800/50' : ''}
                      `}
                    >
                      {action.icon && (
                        <span className="w-4 h-4 flex-shrink-0">{action.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="block">{action.loading ? 'Loading...' : action.label}</span>
                        {action.currentValue && (
                          <span className="block text-xs text-gray-500 truncate">{action.currentValue}</span>
                        )}
                      </div>
                      {action.helpText && (
                        <InfoTooltip text={action.helpText} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Primary Action (always visible) */}
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled || primaryAction.loading}
            className={`
              flex items-center gap-2 px-4 py-2 mr-2 rounded-md text-sm font-medium
              bg-blue-600 hover:bg-blue-700 text-white
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
          >
            {primaryAction.icon && <span className="w-4 h-4">{primaryAction.icon}</span>}
            {primaryAction.loading ? 'Loading...' : primaryAction.label}
          </button>
        )}
      </div>
    </nav>
  );
};

/**
 * Predefined icons for navigation tabs
 */
export const NavIcons = {
  strategy: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  content: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  data: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  analysis: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  advanced: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  plus: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  export: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  planning: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
};

/**
 * Factory function to create standard dashboard navigation tabs
 */
export interface DashboardNavConfig {
  onEditPillars: () => void;
  onManageEavs: () => void;
  onManageCompetitors: () => void;
  onBusinessInfo: () => void;
  onGenerateBriefs: () => void;
  onAddTopic: () => void;
  onUploadGsc: () => void;
  onValidate: () => void;
  onLinkAudit: () => void;
  onUnifiedAudit: () => void;
  onQueryNetworkAudit?: () => void;
  onMentionScanner?: () => void;
  onCorpusAudit?: () => void;
  onEnhancedMetrics?: () => void;
  onComprehensiveAudit?: () => void;
  onMapAuditDashboard?: () => void;
  onRegenerateMap?: () => void;
  onRepairBriefs?: () => void;
  onExport: () => void;
  isValidating?: boolean;
  isAuditing?: boolean;
  canGenerateBriefs?: boolean;
  // Current values for display
  currentPillars?: { ce?: string; sc?: string; csi?: string };
  eavCount?: number;
  competitorCount?: number;
  // Planning
  onOpenPlanning?: () => void;
  onGeneratePlan?: () => void;
  onImportPerformance?: () => void;
  isGeneratingPlan?: boolean;
  hasPlan?: boolean;
  // Knowledge Panel (KP) Strategy
  onKPStrategy?: () => void;
  onEntityAuthority?: () => void;
}

export function createDashboardTabs(config: DashboardNavConfig): NavTab[] {
  return [
    {
      id: 'strategy',
      label: 'Strategy',
      icon: NavIcons.strategy,
      helpText: 'Define your SEO strategy and content pillars',
      actions: [
        {
          id: 'pillars',
          label: 'Edit SEO Pillars',
          onClick: config.onEditPillars,
          helpText: 'Define central entity, source context, and search intent',
          currentValue: config.currentPillars
            ? `CE: ${config.currentPillars.ce || 'Not set'} | SC: ${config.currentPillars.sc || 'Not set'}`
            : 'Not configured',
        },
        {
          id: 'eavs',
          label: 'Manage Semantic Triples',
          onClick: config.onManageEavs,
          helpText: 'Entity-Attribute-Value data for content differentiation',
          currentValue: config.eavCount !== undefined ? `${config.eavCount} triples defined` : undefined,
        },
        {
          id: 'competitors',
          label: 'Manage Competitors',
          onClick: config.onManageCompetitors,
          helpText: 'Add competitor URLs for SERP analysis',
          currentValue: config.competitorCount !== undefined ? `${config.competitorCount} competitors` : undefined,
        },
        {
          id: 'business',
          label: 'Business Information',
          onClick: config.onBusinessInfo,
          helpText: 'Update project details and value proposition',
        },
        ...(config.onKPStrategy ? [{
          id: 'kp-strategy',
          label: 'KP Strategy',
          onClick: config.onKPStrategy,
          helpText: 'Define entity identity and track seed sources for Knowledge Panel',
          variant: 'primary' as const,
        }] : []),
      ],
    },
    {
      id: 'content',
      label: 'Content',
      icon: NavIcons.content,
      helpText: 'Manage topics and generate content',
      actions: [
        {
          id: 'generate-briefs',
          label: 'Generate All Briefs',
          onClick: config.onGenerateBriefs,
          disabled: !config.canGenerateBriefs,
          helpText: config.canGenerateBriefs
            ? 'Generate content briefs for all topics without briefs'
            : 'Define SEO Pillars first to enable brief generation',
          variant: 'primary',
        },
        {
          id: 'add-topic',
          label: 'Add Topics',
          onClick: config.onAddTopic,
          helpText: 'Add topics manually, from templates, or with AI assistance',
        },
      ],
    },
    {
      id: 'data',
      label: 'Data',
      icon: NavIcons.data,
      helpText: 'Import and manage external data',
      actions: [
        {
          id: 'gsc',
          label: 'Upload GSC Data',
          onClick: config.onUploadGsc,
          helpText: 'Import Google Search Console data for keyword analysis',
        },
      ],
    },
    {
      id: 'planning',
      label: 'Planning',
      icon: NavIcons.planning,
      helpText: 'Schedule and track content publication',
      actions: [
        ...(config.onOpenPlanning ? [{
          id: 'open-planning',
          label: 'Open Planning Dashboard',
          onClick: config.onOpenPlanning,
          helpText: 'View publication calendar and tracking',
          variant: 'primary' as const,
        }] : []),
        ...(config.onGeneratePlan ? [{
          id: 'generate-plan',
          label: config.hasPlan ? 'Regenerate Publication Plan' : 'Generate Publication Plan',
          onClick: config.onGeneratePlan,
          loading: config.isGeneratingPlan,
          helpText: 'AI-calculates optimal publication dates based on semantic SEO guidelines',
        }] : []),
        ...(config.onImportPerformance ? [{
          id: 'import-performance',
          label: 'Import Performance Data',
          onClick: config.onImportPerformance,
          helpText: 'Import GSC CSV export to track content performance',
        }] : []),
      ],
    },
    {
      id: 'analysis',
      label: 'Analysis',
      icon: NavIcons.analysis,
      helpText: 'Analyze and validate your content strategy',
      actions: [
        {
          id: 'validate',
          label: 'Validate Map Structure',
          onClick: config.onValidate,
          loading: config.isValidating,
          helpText: 'Check for structural issues in your topical map',
        },
        {
          id: 'link-audit',
          label: 'Internal Link Audit',
          onClick: config.onLinkAudit,
          loading: config.isAuditing,
          helpText: 'Analyze internal linking opportunities',
        },
        {
          id: 'unified-audit',
          label: 'Full Health Check',
          onClick: config.onUnifiedAudit,
          helpText: 'Comprehensive audit of map quality',
          variant: 'primary',
        },
        ...(config.onQueryNetworkAudit ? [{
          id: 'query-network',
          label: 'Query Network Audit',
          onClick: config.onQueryNetworkAudit,
          helpText: 'Competitive content analysis and gap identification',
        }] : []),
        ...(config.onMentionScanner ? [{
          id: 'mention-scanner',
          label: 'E-A-T Scanner',
          onClick: config.onMentionScanner,
          helpText: 'Analyze entity authority and trust signals',
        }] : []),
        ...(config.onCorpusAudit ? [{
          id: 'corpus-audit',
          label: 'Corpus Audit',
          onClick: config.onCorpusAudit,
          helpText: 'Site-wide content analysis and duplicate detection',
        }] : []),
        ...(config.onEnhancedMetrics ? [{
          id: 'enhanced-metrics',
          label: 'Enhanced Metrics Dashboard',
          onClick: config.onEnhancedMetrics,
          helpText: 'Semantic compliance, authority scores, and action roadmap',
          variant: 'primary' as const,
        }] : []),
        ...(config.onComprehensiveAudit ? [{
          id: 'comprehensive-audit',
          label: 'Full Research Dashboard',
          onClick: config.onComprehensiveAudit,
          helpText: 'Combined view of all research: Query Network, E-A-T, Corpus, and historical data',
          variant: 'primary' as const,
        }] : []),
        ...(config.onMapAuditDashboard ? [{
          id: 'map-audit-dashboard',
          label: 'Map Audit Dashboard',
          onClick: config.onMapAuditDashboard,
          helpText: 'Gap analysis, semantic distance matrix, and competitor coverage visualization',
          variant: 'primary' as const,
        }] : []),
        ...(config.onEntityAuthority ? [{
          id: 'entity-authority',
          label: 'Entity Authority',
          onClick: config.onEntityAuthority,
          helpText: 'Knowledge Panel readiness, EAV consensus tracking, and priority actions',
          variant: 'primary' as const,
        }] : []),
      ],
    },
    {
      id: 'advanced',
      label: 'Advanced',
      icon: NavIcons.advanced,
      helpText: 'Advanced tools and maintenance options',
      actions: [
        ...(config.onRepairBriefs ? [{
          id: 'repair',
          label: 'Repair Briefs',
          onClick: config.onRepairBriefs,
          helpText: 'Fix malformed brief data',
        }] : []),
        {
          id: 'export',
          label: 'Export Data',
          onClick: config.onExport,
          helpText: 'Export topical map and briefs',
        },
        // Destructive action at bottom with separator
        ...(config.onRegenerateMap ? [{
          id: 'regenerate',
          label: '⚠️ Regenerate Map',
          onClick: config.onRegenerateMap,
          helpText: 'WARNING: Deletes all topics and regenerates from scratch. This cannot be undone.',
          variant: 'danger' as const,
        }] : []),
      ],
    },
  ];
}

export default TabNavigation;
