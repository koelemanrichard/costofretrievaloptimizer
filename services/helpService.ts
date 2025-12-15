/**
 * Help Documentation Service
 *
 * CRUD operations for the help documentation system including
 * categories, articles, screenshots, and search functionality.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  HelpCategory,
  HelpCategoryWithArticles,
  HelpArticle,
  HelpArticleWithCategory,
  HelpArticleFull,
  HelpArticlePreview,
  HelpArticleVersion,
  HelpScreenshot,
  HelpSearchResult,
  CreateHelpCategoryInput,
  UpdateHelpCategoryInput,
  CreateHelpArticleInput,
  UpdateHelpArticleInput,
  CreateHelpScreenshotInput,
  UpdateHelpScreenshotInput,
  FeatureHelpLookup,
  HELP_STORAGE_BUCKET
} from '../types/help';

// =============================================================================
// CATEGORY OPERATIONS
// =============================================================================

/**
 * Get all published help categories
 */
export async function getCategories(
  supabase: SupabaseClient
): Promise<HelpCategory[]> {
  const { data, error } = await supabase
    .from('help_categories')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch categories: ${error.message}`);
  return data || [];
}

/**
 * Get all categories (including unpublished) for admin
 */
export async function getAllCategories(
  supabase: SupabaseClient
): Promise<HelpCategory[]> {
  const { data, error } = await supabase
    .from('help_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch categories: ${error.message}`);
  return data || [];
}

/**
 * Get categories with their articles
 */
export async function getCategoriesWithArticles(
  supabase: SupabaseClient
): Promise<HelpCategoryWithArticles[]> {
  const { data: categories, error: catError } = await supabase
    .from('help_categories')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (catError) throw new Error(`Failed to fetch categories: ${catError.message}`);

  const { data: articles, error: artError } = await supabase
    .from('help_articles')
    .select('*')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  if (artError) throw new Error(`Failed to fetch articles: ${artError.message}`);

  return (categories || []).map(cat => ({
    ...cat,
    articles: (articles || []).filter(art => art.category_id === cat.id)
  }));
}

/**
 * Get a single category by slug
 */
export async function getCategoryBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<HelpCategory | null> {
  const { data, error } = await supabase
    .from('help_categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch category: ${error.message}`);
  }
  return data;
}

/**
 * Create a new category
 */
export async function createCategory(
  supabase: SupabaseClient,
  input: CreateHelpCategoryInput
): Promise<HelpCategory> {
  const { data, error } = await supabase
    .from('help_categories')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create category: ${error.message}`);
  return data;
}

/**
 * Update a category
 */
export async function updateCategory(
  supabase: SupabaseClient,
  id: string,
  input: UpdateHelpCategoryInput
): Promise<HelpCategory> {
  const { data, error } = await supabase
    .from('help_categories')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update category: ${error.message}`);
  return data;
}

/**
 * Delete a category
 */
export async function deleteCategory(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('help_categories')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete category: ${error.message}`);
}

// =============================================================================
// ARTICLE OPERATIONS
// =============================================================================

/**
 * Get published articles for a category
 */
export async function getArticlesByCategory(
  supabase: SupabaseClient,
  categoryId: string
): Promise<HelpArticle[]> {
  const { data, error } = await supabase
    .from('help_articles')
    .select('*')
    .eq('category_id', categoryId)
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch articles: ${error.message}`);
  return data || [];
}

/**
 * Get all articles for a category (including drafts) for admin
 */
export async function getAllArticlesByCategory(
  supabase: SupabaseClient,
  categoryId: string
): Promise<HelpArticle[]> {
  const { data, error } = await supabase
    .from('help_articles')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch articles: ${error.message}`);
  return data || [];
}

/**
 * Get a single article by category and article slug
 */
export async function getArticleBySlug(
  supabase: SupabaseClient,
  categorySlug: string,
  articleSlug: string
): Promise<HelpArticleFull | null> {
  // Use the database function for article lookup
  const { data, error } = await supabase
    .rpc('get_help_article_by_slug', {
      p_category_slug: categorySlug,
      p_article_slug: articleSlug
    });

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch article: ${error.message}`);
  }

  if (!data || data.length === 0) return null;

  const article = data[0];

  // Fetch screenshots for this article
  const { data: screenshots, error: screenshotError } = await supabase
    .from('help_screenshots')
    .select('*')
    .eq('article_id', article.id)
    .order('sort_order', { ascending: true });

  if (screenshotError) {
    console.warn('Failed to fetch screenshots:', screenshotError.message);
  }

  // Fetch related articles
  const { data: related, error: relatedError } = await supabase
    .rpc('get_related_help_articles', {
      p_article_id: article.id,
      p_limit: 5
    });

  if (relatedError) {
    console.warn('Failed to fetch related articles:', relatedError.message);
  }

  return {
    id: article.id,
    category_id: article.category_id,
    category_name: article.category_name,
    category_slug: article.category_slug,
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    content: article.content,
    sort_order: 0,
    status: 'published',
    feature_keys: article.feature_keys || [],
    published_at: article.published_at,
    metadata: article.metadata || {},
    created_at: '',
    updated_at: '',
    screenshots: screenshots || [],
    related_articles: related || []
  };
}

/**
 * Get article by ID (for admin editing)
 */
export async function getArticleById(
  supabase: SupabaseClient,
  id: string
): Promise<HelpArticleWithCategory | null> {
  const { data, error } = await supabase
    .from('help_articles')
    .select(`
      *,
      help_categories!inner (
        name,
        slug
      )
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch article: ${error.message}`);
  }

  if (!data) return null;

  return {
    ...data,
    category_name: data.help_categories.name,
    category_slug: data.help_categories.slug
  };
}

/**
 * Create a new article
 */
export async function createArticle(
  supabase: SupabaseClient,
  input: CreateHelpArticleInput,
  userId?: string
): Promise<HelpArticle> {
  const { data, error } = await supabase
    .from('help_articles')
    .insert({
      ...input,
      created_by: userId,
      updated_by: userId
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create article: ${error.message}`);
  return data;
}

/**
 * Update an article
 */
export async function updateArticle(
  supabase: SupabaseClient,
  id: string,
  input: UpdateHelpArticleInput,
  userId?: string
): Promise<HelpArticle> {
  const updateData: UpdateHelpArticleInput & { updated_by?: string; published_at?: string } = {
    ...input,
    updated_by: userId
  };

  // Set published_at if transitioning to published
  if (input.status === 'published') {
    const { data: existing } = await supabase
      .from('help_articles')
      .select('status, published_at')
      .eq('id', id)
      .single();

    if (existing && existing.status !== 'published' && !existing.published_at) {
      updateData.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('help_articles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update article: ${error.message}`);
  return data;
}

/**
 * Delete an article
 */
export async function deleteArticle(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('help_articles')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete article: ${error.message}`);
}

/**
 * Publish an article
 */
export async function publishArticle(
  supabase: SupabaseClient,
  id: string,
  userId?: string
): Promise<HelpArticle> {
  return updateArticle(supabase, id, { status: 'published' }, userId);
}

/**
 * Unpublish an article (set to draft)
 */
export async function unpublishArticle(
  supabase: SupabaseClient,
  id: string,
  userId?: string
): Promise<HelpArticle> {
  return updateArticle(supabase, id, { status: 'draft' }, userId);
}

// =============================================================================
// ARTICLE VERSION OPERATIONS
// =============================================================================

/**
 * Get version history for an article
 */
export async function getArticleVersions(
  supabase: SupabaseClient,
  articleId: string
): Promise<HelpArticleVersion[]> {
  const { data, error } = await supabase
    .from('help_article_versions')
    .select('*')
    .eq('article_id', articleId)
    .order('version_number', { ascending: false });

  if (error) throw new Error(`Failed to fetch versions: ${error.message}`);
  return data || [];
}

/**
 * Revert article to a specific version
 */
export async function revertToVersion(
  supabase: SupabaseClient,
  articleId: string,
  versionNumber: number,
  userId?: string
): Promise<HelpArticle> {
  // Get the version
  const { data: version, error: versionError } = await supabase
    .from('help_article_versions')
    .select('*')
    .eq('article_id', articleId)
    .eq('version_number', versionNumber)
    .single();

  if (versionError) throw new Error(`Failed to fetch version: ${versionError.message}`);

  // Update the article with version content (this will trigger auto-versioning)
  return updateArticle(supabase, articleId, {
    title: version.title,
    content: version.content
  }, userId);
}

// =============================================================================
// SCREENSHOT OPERATIONS
// =============================================================================

/**
 * Get screenshots for an article
 */
export async function getScreenshots(
  supabase: SupabaseClient,
  articleId: string
): Promise<HelpScreenshot[]> {
  const { data, error } = await supabase
    .from('help_screenshots')
    .select('*')
    .eq('article_id', articleId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch screenshots: ${error.message}`);
  return data || [];
}

/**
 * Create a screenshot record
 */
export async function createScreenshot(
  supabase: SupabaseClient,
  input: CreateHelpScreenshotInput
): Promise<HelpScreenshot> {
  const { data, error } = await supabase
    .from('help_screenshots')
    .insert({
      ...input,
      storage_bucket: input.storage_bucket || HELP_STORAGE_BUCKET
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create screenshot: ${error.message}`);
  return data;
}

/**
 * Update a screenshot record
 */
export async function updateScreenshot(
  supabase: SupabaseClient,
  id: string,
  input: UpdateHelpScreenshotInput
): Promise<HelpScreenshot> {
  const { data, error } = await supabase
    .from('help_screenshots')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update screenshot: ${error.message}`);
  return data;
}

/**
 * Delete a screenshot record and optionally the file
 */
export async function deleteScreenshot(
  supabase: SupabaseClient,
  id: string,
  deleteFile: boolean = true
): Promise<void> {
  if (deleteFile) {
    // Get the screenshot to find the storage path
    const { data: screenshot } = await supabase
      .from('help_screenshots')
      .select('storage_path, storage_bucket')
      .eq('id', id)
      .single();

    if (screenshot) {
      // Delete from storage
      await supabase.storage
        .from(screenshot.storage_bucket || HELP_STORAGE_BUCKET)
        .remove([screenshot.storage_path]);
    }
  }

  const { error } = await supabase
    .from('help_screenshots')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete screenshot: ${error.message}`);
}

/**
 * Upload a screenshot file to storage
 */
export async function uploadScreenshot(
  supabase: SupabaseClient,
  file: File,
  path: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(HELP_STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: true
    });

  if (error) throw new Error(`Failed to upload screenshot: ${error.message}`);
  return data.path;
}

/**
 * Get public URL for a screenshot
 */
export function getScreenshotUrl(
  supabase: SupabaseClient,
  path: string,
  bucket: string = HELP_STORAGE_BUCKET
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// =============================================================================
// SEARCH OPERATIONS
// =============================================================================

/**
 * Search help articles
 */
export async function searchArticles(
  supabase: SupabaseClient,
  query: string,
  limit: number = 20
): Promise<HelpSearchResult[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .rpc('search_help_articles', {
      search_query: query,
      result_limit: limit
    });

  if (error) throw new Error(`Search failed: ${error.message}`);
  return data || [];
}

// =============================================================================
// CONTEXTUAL HELP OPERATIONS
// =============================================================================

/**
 * Get help article by feature key
 */
export async function getArticleByFeatureKey(
  supabase: SupabaseClient,
  featureKey: string
): Promise<FeatureHelpLookup | null> {
  const { data, error } = await supabase
    .rpc('get_help_article_by_feature_key', {
      p_feature_key: featureKey
    });

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch article by feature key: ${error.message}`);
  }

  if (!data || data.length === 0) return null;

  const result = data[0];
  return {
    featureKey,
    articleId: result.id,
    categorySlug: result.category_slug,
    articleSlug: result.article_slug,
    title: result.title,
    summary: result.summary
  };
}

// =============================================================================
// BULK OPERATIONS (for seeding)
// =============================================================================

/**
 * Bulk create categories
 */
export async function bulkCreateCategories(
  supabase: SupabaseClient,
  categories: CreateHelpCategoryInput[]
): Promise<HelpCategory[]> {
  const { data, error } = await supabase
    .from('help_categories')
    .insert(categories)
    .select();

  if (error) throw new Error(`Failed to bulk create categories: ${error.message}`);
  return data || [];
}

/**
 * Bulk create articles
 */
export async function bulkCreateArticles(
  supabase: SupabaseClient,
  articles: CreateHelpArticleInput[],
  userId?: string
): Promise<HelpArticle[]> {
  const articlesWithUser = articles.map(a => ({
    ...a,
    created_by: userId,
    updated_by: userId
  }));

  const { data, error } = await supabase
    .from('help_articles')
    .insert(articlesWithUser)
    .select();

  if (error) throw new Error(`Failed to bulk create articles: ${error.message}`);
  return data || [];
}

/**
 * Get category ID by slug (for seeding articles)
 */
export async function getCategoryIdBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('help_categories')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data?.id || null;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

/**
 * Build the full help article URL
 */
export function buildArticleUrl(categorySlug: string, articleSlug: string): string {
  return `/help.html#/${categorySlug}/${articleSlug}`;
}

/**
 * Parse a help URL to extract category and article slugs
 */
export function parseHelpUrl(url: string): { categorySlug?: string; articleSlug?: string } {
  const match = url.match(/\/help\.html#\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return {};
  return {
    categorySlug: match[1],
    articleSlug: match[2]
  };
}
