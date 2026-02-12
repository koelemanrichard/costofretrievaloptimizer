/**
 * ProjectDashboard Component Tests
 *
 * The ProjectDashboard is a large orchestration component with 60+ props.
 * Testing strategy:
 *   1. Test createDashboardTabs helper (pure function, testable in isolation)
 *   2. Test basic render with minimal props (smoke test)
 *   3. Test tab navigation rendering
 *   4. Test loading states
 *
 * Note: This component is deeply coupled with many child components and
 * global state. Heavy mocking is necessary. Future refactoring to extract
 * more logic into hooks/contexts would improve testability.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all heavy child components to keep tests focused
vi.mock('../TopicalMapDisplay', () => ({
  default: () => <div data-testid="topical-map-display">TopicalMapDisplay</div>,
}));

vi.mock('../dashboard/NextStepsWidget', () => ({
  NextStepsWidget: () => <div data-testid="next-steps-widget">NextStepsWidget</div>,
}));

vi.mock('../FoundationPagesPanel', () => ({
  FoundationPagesPanel: () => <div data-testid="foundation-pages">FoundationPagesPanel</div>,
}));

vi.mock('../modals', () => ({
  AddTopicModal: () => null,
  ContentBriefModal: () => null,
  KnowledgeDomainModal: () => null,
  GscExpansionHubModal: () => null,
  ValidationResultModal: () => null,
  MergeSuggestionsModal: () => null,
  SemanticAnalysisModal: () => null,
  ContextualCoverageModal: () => null,
  InternalLinkingAuditModal: () => null,
  LinkingAuditModal: () => null,
  TopicalAuthorityModal: () => null,
  PublicationPlanModal: () => null,
  ImprovementLogModal: () => null,
  DraftingModal: () => null,
  SchemaModal: () => null,
  ContentIntegrityModal: () => null,
  ResponseCodeSelectionModal: () => null,
  BriefReviewModal: () => null,
  InternalLinkingModal: () => null,
  PillarChangeConfirmationModal: () => null,
  EavManagerModal: () => null,
  CompetitorManagerModal: () => null,
  TopicExpansionModal: () => null,
  TopicResourcesModal: () => null,
  BusinessInfoModal: () => null,
  PillarEditModal: () => null,
}));

vi.mock('../templates/LocationManagerModal', () => ({
  LocationManagerModal: () => null,
}));

vi.mock('../planning', () => ({
  PlanningDashboard: () => null,
  PerformanceImportModal: () => null,
}));

vi.mock('../KPStrategyPage', () => ({
  KPStrategyPage: () => null,
}));

vi.mock('../modals/SocialSignalsModal', () => ({
  default: () => null,
}));

vi.mock('../EntityAuthorityPage', () => ({
  EntityAuthorityPage: () => null,
}));

vi.mock('../QueryNetworkAudit', () => ({
  QueryNetworkAudit: () => null,
}));

vi.mock('../MentionScannerDashboard', () => ({
  MentionScannerDashboard: () => null,
}));

vi.mock('../CorpusAuditReport', () => ({
  CorpusAuditReport: () => null,
}));

vi.mock('../dashboard/EnhancedMetricsDashboard', () => ({
  EnhancedMetricsDashboard: () => null,
}));

vi.mock('../wordpress', () => ({
  ContentCalendar: () => null,
}));

vi.mock('../insights', () => ({
  InsightsHub: () => null,
}));

vi.mock('../gamification', () => ({
  ConfidenceDashboard: () => null,
  PriorityTieringSystem: () => null,
}));

vi.mock('../quality', () => ({
  PortfolioAnalytics: () => null,
}));

vi.mock('../dashboard/EntityHealthDashboard', () => ({
  EntityHealthDashboard: () => null,
}));

vi.mock('../dashboard/BridgingOpportunitiesPanel', () => ({
  default: () => null,
}));

vi.mock('../../services/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({})),
}));

vi.mock('../../services/recommendationEngine', () => ({
  calculateNextSteps: vi.fn(() => []),
  RecommendationType: {},
}));

vi.mock('../../utils/helpers', () => ({
  calculateDashboardMetrics: vi.fn(() => ({
    totalTopics: 0,
    coreTopics: 0,
    outerTopics: 0,
    childTopics: 0,
    topicsWithBriefs: 0,
    topicsWithDrafts: 0,
    briefCompletionPercentage: 0,
    draftCompletionPercentage: 0,
    avgBriefQuality: 0,
  })),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ projectId: 'proj-1', mapId: 'map-1' }),
}));

// Mock app state
const mockDispatch = vi.fn();
vi.mock('../../state/appState', () => ({
  useAppState: () => ({
    state: {
      modals: {},
      isLoading: {},
      briefGenerationStatus: null,
      validationResult: null,
      unifiedAudit: { result: null, isRunning: false },
      publicationPlanning: {},
      businessInfo: { supabaseUrl: '', supabaseAnonKey: '' },
    },
    dispatch: mockDispatch,
  }),
}));

// Now import testing utilities and the component
import { render, screen } from '@testing-library/react';
import { createDashboardTabs } from '../dashboard/TabNavigation';
import type { BusinessInfo, TopicalMap, EnrichedTopic } from '../../types';

// Helper to create minimal TopicalMap
function createMinimalTopicalMap(overrides: Partial<TopicalMap> = {}): TopicalMap {
  return {
    id: 'map-1',
    project_id: 'proj-1',
    user_id: 'user-1',
    name: 'Test Map',
    business_info: {} as BusinessInfo,
    pillars: {
      centralEntity: 'Test Entity',
      sourceContext: 'Test Context',
      centralSearchIntent: 'Test Intent',
    },
    topics: [],
    briefs: {},
    eavs: [],
    competitors: [],
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  } as TopicalMap;
}

describe('ProjectDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // createDashboardTabs (pure function tests)
  // ==========================================
  describe('createDashboardTabs', () => {
    const defaultConfig = {
      onEditPillars: vi.fn(),
      onManageEavs: vi.fn(),
      onManageCompetitors: vi.fn(),
      onBusinessInfo: vi.fn(),
      onGenerateBriefs: vi.fn(),
      onAddTopic: vi.fn(),
      onUploadGsc: vi.fn(),
      onValidate: vi.fn(),
      onLinkAudit: vi.fn(),
      onUnifiedAudit: vi.fn(),
      onQueryNetworkAudit: vi.fn(),
      onMentionScanner: vi.fn(),
      onCorpusAudit: vi.fn(),
      onEnhancedMetrics: vi.fn(),
      onComprehensiveAudit: vi.fn(),
      onMapAuditDashboard: vi.fn(),
      onRegenerateMap: vi.fn(),
      onExport: vi.fn(),
      isValidating: false,
      isAuditing: false,
      canGenerateBriefs: true,
      eavCount: 10,
      competitorCount: 3,
    };

    it('returns an array of tab configurations', () => {
      const tabs = createDashboardTabs(defaultConfig);
      expect(Array.isArray(tabs)).toBe(true);
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('includes Strategy tab', () => {
      const tabs = createDashboardTabs(defaultConfig);
      const strategyTab = tabs.find(t => t.id === 'strategy');
      expect(strategyTab).toBeDefined();
      expect(strategyTab!.label).toBe('Strategy');
    });

    it('includes Content tab', () => {
      const tabs = createDashboardTabs(defaultConfig);
      const contentTab = tabs.find(t => t.id === 'content');
      expect(contentTab).toBeDefined();
      expect(contentTab!.label).toBe('Content');
    });

    it('includes Data tab', () => {
      const tabs = createDashboardTabs(defaultConfig);
      const dataTab = tabs.find(t => t.id === 'data');
      expect(dataTab).toBeDefined();
    });

    it('includes Analysis tab', () => {
      const tabs = createDashboardTabs(defaultConfig);
      const analysisTab = tabs.find(t => t.id === 'analysis');
      expect(analysisTab).toBeDefined();
    });

    it('Strategy tab has Edit SEO Pillars action', () => {
      const tabs = createDashboardTabs(defaultConfig);
      const strategyTab = tabs.find(t => t.id === 'strategy')!;
      const pillarsAction = strategyTab.actions.find(a => a.id === 'pillars');
      expect(pillarsAction).toBeDefined();
      expect(pillarsAction!.label).toBe('Edit SEO Pillars');
    });

    it('Strategy tab shows current pillar values', () => {
      const tabs = createDashboardTabs({
        ...defaultConfig,
        currentPillars: { ce: 'Coffee', sc: 'Brewing', csi: 'How to brew' },
      });
      const strategyTab = tabs.find(t => t.id === 'strategy')!;
      const pillarsAction = strategyTab.actions.find(a => a.id === 'pillars');
      expect(pillarsAction!.currentValue).toContain('Coffee');
      expect(pillarsAction!.currentValue).toContain('Brewing');
    });

    it('Strategy tab shows EAV count', () => {
      const tabs = createDashboardTabs({ ...defaultConfig, eavCount: 42 });
      const strategyTab = tabs.find(t => t.id === 'strategy')!;
      const eavsAction = strategyTab.actions.find(a => a.id === 'eavs');
      expect(eavsAction!.currentValue).toContain('42');
    });

    it('Strategy tab shows competitor count', () => {
      const tabs = createDashboardTabs({ ...defaultConfig, competitorCount: 5 });
      const strategyTab = tabs.find(t => t.id === 'strategy')!;
      const competitorsAction = strategyTab.actions.find(a => a.id === 'competitors');
      expect(competitorsAction!.currentValue).toContain('5');
    });

    it('Content tab disables Generate Briefs when canGenerateBriefs is false', () => {
      const tabs = createDashboardTabs({ ...defaultConfig, canGenerateBriefs: false });
      const contentTab = tabs.find(t => t.id === 'content')!;
      const generateAction = contentTab.actions.find(a => a.id === 'generate-briefs');
      expect(generateAction!.disabled).toBe(true);
    });

    it('Content tab enables Generate Briefs when canGenerateBriefs is true', () => {
      const tabs = createDashboardTabs({ ...defaultConfig, canGenerateBriefs: true });
      const contentTab = tabs.find(t => t.id === 'content')!;
      const generateAction = contentTab.actions.find(a => a.id === 'generate-briefs');
      expect(generateAction!.disabled).toBeFalsy();
    });

    it('Analysis tab shows loading state for validation', () => {
      const tabs = createDashboardTabs({ ...defaultConfig, isValidating: true });
      const analysisTab = tabs.find(t => t.id === 'analysis')!;
      const validateAction = analysisTab.actions.find(a => a.id === 'validate');
      expect(validateAction!.loading).toBe(true);
    });

    it('includes KP Strategy action when callback is provided', () => {
      const tabs = createDashboardTabs({ ...defaultConfig, onKPStrategy: vi.fn() });
      const strategyTab = tabs.find(t => t.id === 'strategy')!;
      const kpAction = strategyTab.actions.find(a => a.id === 'kp-strategy');
      expect(kpAction).toBeDefined();
    });

    it('excludes KP Strategy action when callback is not provided', () => {
      const tabs = createDashboardTabs(defaultConfig);
      const strategyTab = tabs.find(t => t.id === 'strategy')!;
      const kpAction = strategyTab.actions.find(a => a.id === 'kp-strategy');
      expect(kpAction).toBeUndefined();
    });

    it('includes Planning tab with optional actions', () => {
      const tabs = createDashboardTabs({
        ...defaultConfig,
        onOpenPlanning: vi.fn(),
        onGeneratePlan: vi.fn(),
        onImportPerformance: vi.fn(),
        onContentCalendar: vi.fn(),
      });
      const planningTab = tabs.find(t => t.id === 'planning')!;
      expect(planningTab).toBeDefined();
      expect(planningTab.actions.some(a => a.id === 'open-planning')).toBe(true);
      expect(planningTab.actions.some(a => a.id === 'generate-plan')).toBe(true);
      expect(planningTab.actions.some(a => a.id === 'import-performance')).toBe(true);
      expect(planningTab.actions.some(a => a.id === 'content-calendar')).toBe(true);
    });

    it('each tab has an icon', () => {
      const tabs = createDashboardTabs(defaultConfig);
      tabs.forEach(tab => {
        expect(tab.icon).toBeDefined();
      });
    });

    it('action callbacks are wired correctly', () => {
      const onEditPillars = vi.fn();
      const tabs = createDashboardTabs({ ...defaultConfig, onEditPillars });
      const strategyTab = tabs.find(t => t.id === 'strategy')!;
      const pillarsAction = strategyTab.actions.find(a => a.id === 'pillars')!;

      pillarsAction.onClick();
      expect(onEditPillars).toHaveBeenCalledOnce();
    });
  });

  // ==========================================
  // Component render smoke test
  // ==========================================
  describe('component render', () => {
    it('can be imported without errors', async () => {
      const mod = await import('../ProjectDashboard');
      expect(mod.default).toBeDefined();
    });
  });
});
