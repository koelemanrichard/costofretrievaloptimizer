/**
 * Help Documentation System Types
 *
 * TypeScript interfaces for the comprehensive help documentation system
 * including categories, articles, screenshots, and search functionality.
 */

// =============================================================================
// BASE TYPES
// =============================================================================

export type HelpArticleStatus = 'draft' | 'published' | 'archived';

// =============================================================================
// HELP CATEGORY
// =============================================================================

export interface HelpCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sort_order: number;
  is_published: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HelpCategoryWithArticles extends HelpCategory {
  articles: HelpArticle[];
}

export interface CreateHelpCategoryInput {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  is_published?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateHelpCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  is_published?: boolean;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// HELP ARTICLE
// =============================================================================

export interface HelpArticle {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  sort_order: number;
  parent_article_id?: string;
  status: HelpArticleStatus;
  published_at?: string;
  feature_keys: string[];
  search_keywords?: string[];
  created_by?: string;
  updated_by?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HelpArticleWithCategory extends HelpArticle {
  category_name: string;
  category_slug: string;
}

export interface HelpArticleWithScreenshots extends HelpArticle {
  screenshots: HelpScreenshot[];
}

export interface HelpArticleFull extends HelpArticle {
  category_name: string;
  category_slug: string;
  screenshots: HelpScreenshot[];
  related_articles?: HelpArticlePreview[];
}

export interface HelpArticlePreview {
  id: string;
  category_slug: string;
  article_slug: string;
  title: string;
  summary?: string;
}

export interface CreateHelpArticleInput {
  category_id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  sort_order?: number;
  parent_article_id?: string;
  status?: HelpArticleStatus;
  feature_keys?: string[];
  search_keywords?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateHelpArticleInput {
  category_id?: string;
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  sort_order?: number;
  parent_article_id?: string;
  status?: HelpArticleStatus;
  published_at?: string;
  feature_keys?: string[];
  search_keywords?: string[];
  metadata?: Record<string, unknown>;
}

// =============================================================================
// HELP SCREENSHOT
// =============================================================================

export interface HelpScreenshot {
  id: string;
  article_id: string;
  storage_path: string;
  storage_bucket: string;
  filename: string;
  alt_text: string;
  caption?: string;
  width?: number;
  height?: number;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateHelpScreenshotInput {
  article_id: string;
  storage_path: string;
  storage_bucket?: string;
  filename: string;
  alt_text: string;
  caption?: string;
  width?: number;
  height?: number;
  sort_order?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateHelpScreenshotInput {
  storage_path?: string;
  filename?: string;
  alt_text?: string;
  caption?: string;
  width?: number;
  height?: number;
  sort_order?: number;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// HELP ARTICLE VERSION
// =============================================================================

export interface HelpArticleVersion {
  id: string;
  article_id: string;
  title: string;
  content: string;
  version_number: number;
  change_summary?: string;
  created_by?: string;
  created_at: string;
}

// =============================================================================
// SEARCH
// =============================================================================

export interface HelpSearchResult {
  id: string;
  category_id: string;
  title: string;
  summary?: string;
  slug: string;
  category_slug: string;
  rank: number;
}

export interface HelpSearchParams {
  query: string;
  limit?: number;
}

// =============================================================================
// NAVIGATION STATE
// =============================================================================

export interface HelpNavigationState {
  categorySlug?: string;
  articleSlug?: string;
  searchQuery?: string;
}

// =============================================================================
// CONTEXTUAL HELP
// =============================================================================

/**
 * Feature keys follow the pattern: type:name
 * Examples:
 * - modal:contentBrief
 * - button:generateBrief
 * - wizard:eavDiscovery
 * - panel:topicTree
 * - tab:analysisTools
 */
export type FeatureKeyType = 'modal' | 'button' | 'wizard' | 'panel' | 'tab' | 'section' | 'field';

export interface FeatureHelpLookup {
  featureKey: string;
  articleId?: string;
  categorySlug?: string;
  articleSlug?: string;
  title?: string;
  summary?: string;
}

// =============================================================================
// HELP CONTENT SEEDING
// =============================================================================

export interface HelpCategorySeed {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
}

export interface HelpArticleSeed {
  categorySlug: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  sort_order: number;
  feature_keys: string[];
  search_keywords: string[];
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface HelpApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface HelpListResponse<T> {
  data: T[];
  count: number;
  error: string | null;
}

// =============================================================================
// EDITOR STATE
// =============================================================================

export interface HelpEditorState {
  article: HelpArticle | null;
  isDirty: boolean;
  isSaving: boolean;
  isPreviewMode: boolean;
  lastSaved?: string;
  validationErrors: string[];
}

export interface HelpEditorActions {
  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  setSummary: (summary: string) => void;
  setFeatureKeys: (keys: string[]) => void;
  setSearchKeywords: (keywords: string[]) => void;
  setStatus: (status: HelpArticleStatus) => void;
  save: () => Promise<void>;
  publish: () => Promise<void>;
  revert: (versionNumber: number) => Promise<void>;
  togglePreview: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const HELP_STORAGE_BUCKET = 'help-screenshots';

export const HELP_CATEGORY_ICONS: Record<string, string> = {
  'getting-started': 'rocket',
  'project-management': 'folder',
  'topical-map-creation': 'map',
  'working-with-topics': 'list-tree',
  'content-briefs': 'file-text',
  'article-generation': 'pen-tool',
  'analysis-tools': 'chart-bar',
  'site-analysis': 'globe',
  'export-integration': 'download',
  'settings': 'settings',
  'troubleshooting': 'help-circle',
  'advanced-topics': 'graduation-cap'
};

export const DEFAULT_HELP_CATEGORIES: HelpCategorySeed[] = [
  {
    name: 'Getting Started',
    slug: 'getting-started',
    description: 'Learn the basics of the Holistic SEO Topical Map Generator',
    icon: 'rocket',
    sort_order: 1
  },
  {
    name: 'Project Management',
    slug: 'project-management',
    description: 'Create, manage, and organize your SEO projects',
    icon: 'folder',
    sort_order: 2
  },
  {
    name: 'Topical Map Creation',
    slug: 'topical-map-creation',
    description: 'Build comprehensive topical maps with wizards and tools',
    icon: 'map',
    sort_order: 3
  },
  {
    name: 'Working with Topics',
    slug: 'working-with-topics',
    description: 'Add, edit, organize, and manage topics in your map',
    icon: 'list-tree',
    sort_order: 4
  },
  {
    name: 'Content Briefs',
    slug: 'content-briefs',
    description: 'Generate and customize AI-powered content briefs',
    icon: 'file-text',
    sort_order: 5
  },
  {
    name: 'Article Generation',
    slug: 'article-generation',
    description: 'Multi-pass AI article generation and optimization',
    icon: 'pen-tool',
    sort_order: 6
  },
  {
    name: 'Analysis Tools',
    slug: 'analysis-tools',
    description: 'Semantic analysis, linking audits, and coverage tools',
    icon: 'chart-bar',
    sort_order: 7
  },
  {
    name: 'Site Analysis',
    slug: 'site-analysis',
    description: 'Crawl sites, analyze gaps, and audit existing content',
    icon: 'globe',
    sort_order: 8
  },
  {
    name: 'Export & Integration',
    slug: 'export-integration',
    description: 'Export your work in various formats',
    icon: 'download',
    sort_order: 9
  },
  {
    name: 'Settings',
    slug: 'settings',
    description: 'Configure API keys, AI providers, and preferences',
    icon: 'settings',
    sort_order: 10
  },
  {
    name: 'Troubleshooting',
    slug: 'troubleshooting',
    description: 'Solve common issues and optimize performance',
    icon: 'help-circle',
    sort_order: 11
  },
  {
    name: 'Advanced Topics',
    slug: 'advanced-topics',
    description: 'Deep dives into Knowledge Graphs, Semantic Distance, and more',
    icon: 'graduation-cap',
    sort_order: 12
  }
];
