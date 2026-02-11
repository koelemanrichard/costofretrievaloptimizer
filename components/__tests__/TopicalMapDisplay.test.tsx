/**
 * TopicalMapDisplay Component Tests
 *
 * Tests the main topic list display component which handles:
 *   1. Rendering core and outer topics in a hierarchical view
 *   2. Empty state when no topics exist
 *   3. View mode switching (Cards/Table/Graph)
 *   4. Pipeline filter chips (All/Needs Brief/Needs Draft/Needs Audit)
 *   5. Topic selection for brief generation
 *
 * Strategy: Mock heavy child components and global state to keep
 * tests focused on TopicalMapDisplay logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { EnrichedTopic, ContentBrief } from '../../types';

// Mock child components
vi.mock('../TopicItem', () => ({
  default: ({ topic }: { topic: EnrichedTopic }) => (
    <div data-testid={`topic-item-${topic.id}`}>{topic.title}</div>
  ),
}));

vi.mock('../TopicTableView', () => ({
  TopicTableView: () => <div data-testid="topic-table-view">TopicTableView</div>,
}));

vi.mock('../TopicalMapGraphView', () => ({
  default: () => <div data-testid="topic-graph-view">TopicalMapGraphView</div>,
}));

vi.mock('../reports', () => ({
  ReportExportButton: () => null,
  ReportModal: () => null,
}));

vi.mock('../../hooks/useReportGeneration', () => ({
  useTopicalMapReport: vi.fn(() => ({
    isGenerating: false,
    showModal: false,
    generatedReport: null,
    generateReport: vi.fn(),
    closeModal: vi.fn(),
  })),
}));

vi.mock('../../hooks/useTopicPublications', () => ({
  useTopicPublications: vi.fn(() => ({
    publications: new Map(),
    isLoading: false,
  })),
}));

vi.mock('../ui/Button', () => ({
  Button: ({ children, onClick, disabled, className, variant }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock('../ui/MergeConfirmationModal', () => ({
  default: () => null,
}));

vi.mock('../ui/InfoTooltip', () => ({
  InfoTooltip: ({ text }: { text: string }) => <span title={text}>?</span>,
}));

vi.mock('../ui/BriefHealthBadge', () => ({
  BriefHealthStatsBar: () => <div data-testid="brief-health-stats">BriefHealthStats</div>,
}));

vi.mock('../../utils/briefQualityScore', () => ({
  calculateBriefHealthStats: vi.fn(() => ({ total: 0, complete: 0, partial: 0, empty: 0, withoutBriefs: 0 })),
}));

vi.mock('../admin/MapUsageReport', () => ({
  default: () => null,
}));

vi.mock('../../services/aiService', () => ({
  findMergeOpportunitiesForSelection: vi.fn(),
  classifyTopicSections: vi.fn(),
}));

vi.mock('../../services/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => null),
}));

vi.mock('../../services/verifiedDatabaseService', () => ({
  verifiedDelete: vi.fn(),
  verifiedBulkDelete: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid'),
}));

vi.mock('../../utils/helpers', () => ({
  slugify: vi.fn((text: string) => text.toLowerCase().replace(/\s+/g, '-')),
}));

// Mock app state
const mockDispatch = vi.fn();
vi.mock('../../state/appState', () => ({
  useAppState: () => ({
    state: {
      activeMapId: 'map-1',
      businessInfo: { supabaseUrl: '', supabaseAnonKey: '' },
      isLoading: {},
      briefGenerationStatus: null,
      topicalMaps: [],
      user: { id: 'user-1' },
    },
    dispatch: mockDispatch,
  }),
}));

import TopicalMapDisplay from '../TopicalMapDisplay';

// Helper to create a mock topic
function createMockTopic(overrides: Partial<EnrichedTopic> = {}): EnrichedTopic {
  return {
    id: `topic-${Math.random().toString(36).substr(2, 6)}`,
    map_id: 'map-1',
    parent_topic_id: null,
    title: 'Test Topic',
    slug: 'test-topic',
    description: 'A test topic description',
    type: 'core',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as EnrichedTopic;
}

// Default props for TopicalMapDisplay
function getDefaultProps() {
  return {
    coreTopics: [] as EnrichedTopic[],
    outerTopics: [] as EnrichedTopic[],
    childTopics: [] as EnrichedTopic[],
    briefs: {} as Record<string, ContentBrief>,
    onSelectTopicForBrief: vi.fn(),
    onExpandCoreTopic: vi.fn(),
    expandingCoreTopicId: null,
    onExecuteMerge: vi.fn(),
    canExpandTopics: true,
    canGenerateBriefs: true,
    onUpdateTopic: vi.fn(),
  };
}

describe('TopicalMapDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage for viewMode persistence
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  });

  // ==========================================
  // Empty State
  // ==========================================
  describe('empty state', () => {
    it('renders empty state message when no topics exist', () => {
      render(<TopicalMapDisplay {...getDefaultProps()} />);

      expect(screen.getByText('Topical Map is Empty')).toBeInTheDocument();
      expect(screen.getByText(/no topics yet/)).toBeInTheDocument();
    });

    it('shows Generate Initial Map button when callback is provided', () => {
      const onGenerateInitialMap = vi.fn();
      render(
        <TopicalMapDisplay
          {...getDefaultProps()}
          onGenerateInitialMap={onGenerateInitialMap}
        />
      );

      const generateButton = screen.getByText(/Generate Initial Map Structure/);
      expect(generateButton).toBeInTheDocument();
    });

    it('does not show Generate button when callback is not provided', () => {
      render(<TopicalMapDisplay {...getDefaultProps()} />);

      expect(screen.queryByText(/Generate Initial Map Structure/)).not.toBeInTheDocument();
    });

    it('clicking Generate Initial Map calls the callback', () => {
      const onGenerateInitialMap = vi.fn();
      render(
        <TopicalMapDisplay
          {...getDefaultProps()}
          onGenerateInitialMap={onGenerateInitialMap}
        />
      );

      fireEvent.click(screen.getByText(/Generate Initial Map Structure/));
      expect(onGenerateInitialMap).toHaveBeenCalledOnce();
    });
  });

  // ==========================================
  // Topic rendering
  // ==========================================
  describe('topic rendering', () => {
    it('renders topics when core topics are provided', () => {
      const coreTopics = [
        createMockTopic({ id: 'core-1', title: 'SEO Strategy', type: 'core' }),
        createMockTopic({ id: 'core-2', title: 'Content Marketing', type: 'core' }),
      ];

      render(
        <TopicalMapDisplay
          {...getDefaultProps()}
          coreTopics={coreTopics}
        />
      );

      // Should not show empty state
      expect(screen.queryByText('Topical Map is Empty')).not.toBeInTheDocument();
    });

    it('renders all provided core topics', () => {
      const coreTopics = [
        createMockTopic({ id: 'core-1', title: 'Topic A', type: 'core' }),
        createMockTopic({ id: 'core-2', title: 'Topic B', type: 'core' }),
      ];
      const outerTopics = [
        createMockTopic({ id: 'outer-1', title: 'Subtopic A', type: 'outer', parent_topic_id: 'core-1' }),
      ];

      render(
        <TopicalMapDisplay
          {...getDefaultProps()}
          coreTopics={coreTopics}
          outerTopics={outerTopics}
        />
      );

      // All core topic items should be rendered
      expect(screen.getByTestId('topic-item-core-1')).toBeInTheDocument();
      expect(screen.getByTestId('topic-item-core-2')).toBeInTheDocument();
    });
  });

  // ==========================================
  // View mode switching
  // ==========================================
  describe('view mode switching', () => {
    const topicProps = {
      ...getDefaultProps(),
      coreTopics: [createMockTopic({ id: 'core-1', title: 'Test Core', type: 'core' })],
    };

    it('renders Cards/Table/Graph view mode buttons', () => {
      render(<TopicalMapDisplay {...topicProps} />);

      expect(screen.getByText('Cards')).toBeInTheDocument();
      expect(screen.getByText('Table')).toBeInTheDocument();
      expect(screen.getByText('Graph')).toBeInTheDocument();
    });

    it('switching to Table view shows table component', () => {
      render(<TopicalMapDisplay {...topicProps} />);

      fireEvent.click(screen.getByText('Table'));

      expect(screen.getByTestId('topic-table-view')).toBeInTheDocument();
    });

    it('switching to Graph view shows graph component', () => {
      render(<TopicalMapDisplay {...topicProps} />);

      fireEvent.click(screen.getByText('Graph'));

      expect(screen.getByTestId('topic-graph-view')).toBeInTheDocument();
    });

    it('persists view mode to localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      render(<TopicalMapDisplay {...topicProps} />);

      fireEvent.click(screen.getByText('Table'));

      expect(setItemSpy).toHaveBeenCalledWith('topicViewMode', 'table');
    });
  });

  // ==========================================
  // Pipeline filter
  // ==========================================
  describe('pipeline filter', () => {
    const topicProps = {
      ...getDefaultProps(),
      coreTopics: [
        createMockTopic({ id: 'core-1', title: 'Topic 1', type: 'core' }),
        createMockTopic({ id: 'core-2', title: 'Topic 2', type: 'core' }),
      ],
    };

    it('renders pipeline filter chips when topics exist', () => {
      render(<TopicalMapDisplay {...topicProps} />);

      // Pipeline filter chips include counts in parentheses
      expect(screen.getByText(/All \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText(/Needs Brief \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText(/Needs Draft \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText(/Needs Audit \(\d+\)/)).toBeInTheDocument();
    });

    it('shows correct counts in filter chips', () => {
      // 2 topics with no briefs means both "need brief"
      render(<TopicalMapDisplay {...topicProps} />);

      // "All (2)" should appear
      expect(screen.getByText(/All \(2\)/)).toBeInTheDocument();
      // "Needs Brief (2)" should appear since no briefs exist
      expect(screen.getByText(/Needs Brief \(2\)/)).toBeInTheDocument();
    });

    it('does not render filter chips when no topics exist', () => {
      render(<TopicalMapDisplay {...getDefaultProps()} />);

      expect(screen.queryByText(/Needs Brief/)).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // Sort options
  // ==========================================
  describe('sort functionality', () => {
    it('renders sort dropdown when topics exist', () => {
      const topicProps = {
        ...getDefaultProps(),
        coreTopics: [createMockTopic({ id: 'core-1', title: 'Topic', type: 'core' })],
      };

      render(<TopicalMapDisplay {...topicProps} />);

      // The sort select should be rendered
      const sortSelect = screen.getByDisplayValue(/Newest/i);
      expect(sortSelect).toBeInTheDocument();
    });
  });

  // ==========================================
  // Header elements
  // ==========================================
  describe('header rendering', () => {
    it('renders Topical Map heading', () => {
      render(
        <TopicalMapDisplay
          {...getDefaultProps()}
          coreTopics={[createMockTopic({ id: 'c-1', title: 'T', type: 'core' })]}
        />
      );

      expect(screen.getByText('Topical Map')).toBeInTheDocument();
    });
  });
});
