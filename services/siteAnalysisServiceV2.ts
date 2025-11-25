// services/siteAnalysisServiceV2.ts
// V2 Site Analysis Orchestrator with Supabase persistence, dual extraction, and pillar discovery

import { SupabaseClient } from '@supabase/supabase-js';
import {
  SiteAnalysisProject,
  SitePageRecord,
  SiteAnalysisStatus,
  PageAudit,
  AuditCheck,
  AuditTask,
  AuditHistoryEntry,
  DiscoveredPillars,
  ExtractedPageData,
  GscRow,
  SEOPillars,
} from '../types';
import { extractPages, extractSinglePage, mergeExtractionData, ExtractionConfig, ExtractionProgress } from './pageExtractionService';
import { parseSitemap, discoverSitemap, SitemapUrl, ProxyConfig } from './sitemapService';
import { importGscCsv, groupQueriesByPage } from './gscImportService';
import { initNeo4j, buildProjectGraph, calculatePageRank, findOrphanPages, findHubPages, closeNeo4j } from './neo4jService';
import { ALL_AUDIT_RULES, PHASE_CONFIG, AuditRule, getRulesByPhase } from '../config/pageAuditRules';
import { AppAction } from '../state/appState';

// ============================================
// UTILITY FUNCTIONS
// ============================================

const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const normalizeDomain = (domain: string): string => {
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase();
};

const extractDomain = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// ============================================
// PROJECT MANAGEMENT
// ============================================

/**
 * Create a new site analysis project in Supabase
 */
export const createProjectV2 = async (
  supabase: SupabaseClient,
  userId: string,
  name: string,
  domain: string,
  inputMethod: 'url' | 'sitemap' | 'gsc' | 'manual' | 'single_page',
  linkedMapId?: string
): Promise<SiteAnalysisProject> => {
  const { data, error } = await supabase
    .from('site_analysis_projects')
    .insert({
      user_id: userId,
      name,
      domain: normalizeDomain(domain),
      input_method: inputMethod,
      linked_project_id: linkedMapId || null, // Note: stores map ID, column naming is legacy
      status: 'created',
      pillars_validated: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create project: ${error.message}`);

  return mapDbProjectToModel(data);
};

/**
 * Delete a site analysis project and all related data (cascade delete)
 */
export const deleteProjectV2 = async (
  supabase: SupabaseClient,
  projectId: string
): Promise<void> => {
  // Delete in order of dependencies (child tables first)

  // 1. Delete audit tasks
  await supabase
    .from('audit_tasks')
    .delete()
    .eq('project_id', projectId);

  // 2. Delete page audits
  await supabase
    .from('page_audits')
    .delete()
    .eq('project_id', projectId);

  // 3. Delete audit history
  await supabase
    .from('audit_history')
    .delete()
    .eq('project_id', projectId);

  // 4. Delete site pages
  await supabase
    .from('site_pages')
    .delete()
    .eq('project_id', projectId);

  // 5. Finally, delete the project itself
  const { error } = await supabase
    .from('site_analysis_projects')
    .delete()
    .eq('id', projectId);

  if (error) throw new Error(`Failed to delete project: ${error.message}`);
};

/**
 * Load a project with its pages from Supabase
 */
export const loadProject = async (
  supabase: SupabaseClient,
  projectId: string
): Promise<SiteAnalysisProject> => {
  const { data: project, error: projectError } = await supabase
    .from('site_analysis_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) throw new Error(`Failed to load project: ${projectError.message}`);

  const { data: pages, error: pagesError } = await supabase
    .from('site_pages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (pagesError) throw new Error(`Failed to load pages: ${pagesError.message}`);

  return {
    ...mapDbProjectToModel(project),
    pages: pages?.map(mapDbPageToModel) || [],
    pageCount: pages?.length || 0,
  };
};

/**
 * Update project status
 */
export const updateProjectStatus = async (
  supabase: SupabaseClient,
  projectId: string,
  status: SiteAnalysisStatus,
  errorMessage?: string
): Promise<void> => {
  const { error } = await supabase
    .from('site_analysis_projects')
    .update({
      status,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) throw new Error(`Failed to update project status: ${error.message}`);
};

/**
 * Update project pillars
 */
export const updateProjectPillars = async (
  supabase: SupabaseClient,
  projectId: string,
  pillars: {
    centralEntity: string;
    centralEntityType?: string;
    sourceContext: string;
    sourceContextType?: string;
    centralSearchIntent: string;
  },
  source: 'inferred' | 'linked' | 'manual'
): Promise<void> => {
  const { error } = await supabase
    .from('site_analysis_projects')
    .update({
      central_entity: pillars.centralEntity,
      central_entity_type: pillars.centralEntityType,
      source_context: pillars.sourceContext,
      source_context_type: pillars.sourceContextType,
      central_search_intent: pillars.centralSearchIntent,
      pillars_source: source,
      pillars_validated: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) throw new Error(`Failed to update pillars: ${error.message}`);
};

/**
 * Validate (confirm) project pillars
 */
export const validateProjectPillars = async (
  supabase: SupabaseClient,
  projectId: string
): Promise<void> => {
  const { error } = await supabase
    .from('site_analysis_projects')
    .update({
      pillars_validated: true,
      pillars_validated_at: new Date().toISOString(),
      status: 'building_graph',
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) throw new Error(`Failed to validate pillars: ${error.message}`);
};

// ============================================
// URL DISCOVERY
// ============================================

/**
 * Initialize from sitemap URL
 */
export const initFromSitemapV2 = async (
  supabase: SupabaseClient,
  project: SiteAnalysisProject,
  sitemapUrl: string,
  dispatch: React.Dispatch<AppAction>,
  options?: { maxUrls?: number; proxyConfig?: ProxyConfig }
): Promise<SiteAnalysisProject> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Parsing sitemap: ${sitemapUrl}`, status: 'info', timestamp: Date.now() }
  });

  await updateProjectStatus(supabase, project.id, 'crawling');

  const result = await parseSitemap(sitemapUrl, {
    followSitemapIndex: true,
    maxUrls: options?.maxUrls || 500,
    proxyConfig: options?.proxyConfig,
  });

  if (result.errors.length > 0) {
    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: `Sitemap warnings: ${result.errors.join(', ')}`, status: 'warning', timestamp: Date.now() }
    });
  }

  // Deduplicate URLs (sitemaps can have duplicates)
  const seenUrls = new Set<string>();
  const uniqueUrls = result.urls.filter(url => {
    if (seenUrls.has(url.loc)) return false;
    seenUrls.add(url.loc);
    return true;
  });

  // Batch insert pages
  const pageRecords = uniqueUrls.map(url => ({
    project_id: project.id,
    url: url.loc,
    path: new URL(url.loc).pathname,
    discovered_via: 'sitemap',
    sitemap_lastmod: url.lastmod || null,
    sitemap_priority: url.priority || null,
    sitemap_changefreq: url.changefreq || null,
    crawl_status: 'pending',
  }));

  // Use upsert to handle retries (existing records from previous attempts)
  const { data: insertedPages, error } = await supabase
    .from('site_pages')
    .upsert(pageRecords, {
      onConflict: 'project_id,url',
      ignoreDuplicates: false,
    })
    .select();

  if (error) throw new Error(`Failed to insert pages: ${error.message}`);

  // Update project with sitemap URL
  await supabase
    .from('site_analysis_projects')
    .update({ sitemap_url: sitemapUrl })
    .eq('id', project.id);

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Discovered ${insertedPages?.length || 0} URLs from sitemap`, status: 'success', timestamp: Date.now() }
  });

  return {
    ...project,
    sitemapUrl,
    pages: insertedPages?.map(mapDbPageToModel) || [],
    pageCount: insertedPages?.length || 0,
  };
};

/**
 * Initialize from a single URL (auto-discover sitemap)
 */
export const initFromUrlV2 = async (
  supabase: SupabaseClient,
  project: SiteAnalysisProject,
  url: string,
  dispatch: React.Dispatch<AppAction>,
  proxyConfig?: ProxyConfig
): Promise<SiteAnalysisProject> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Discovering sitemap for ${url}...`, status: 'info', timestamp: Date.now() }
  });

  let domain: string;
  try {
    const parsed = new URL(url);
    domain = parsed.origin;
  } catch {
    domain = url.startsWith('http') ? url : `https://${url}`;
  }

  // Try to discover sitemap (using proxy to avoid CORS)
  const sitemapUrls = await discoverSitemap(domain, proxyConfig);

  if (sitemapUrls.length > 0) {
    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: `Found sitemap: ${sitemapUrls[0]}`, status: 'info', timestamp: Date.now() }
    });

    return initFromSitemapV2(supabase, project, sitemapUrls[0], dispatch, { proxyConfig });
  }

  // No sitemap found - start with single URL
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'No sitemap found, starting with single URL', status: 'warning', timestamp: Date.now() }
  });

  const fullUrl = url.startsWith('http') ? url : `https://${url}`;

  // Use upsert to handle retries
  const { data: insertedPage, error } = await supabase
    .from('site_pages')
    .upsert({
      project_id: project.id,
      url: fullUrl,
      path: new URL(fullUrl).pathname,
      discovered_via: 'manual',
      crawl_status: 'pending',
    }, {
      onConflict: 'project_id,url',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to insert page: ${error.message}`);

  return {
    ...project,
    pages: insertedPage ? [mapDbPageToModel(insertedPage)] : [],
    pageCount: 1,
  };
};

/**
 * Initialize from a single page URL (no sitemap discovery, no crawling)
 * Used for single-page audits
 */
export const initFromSinglePageV2 = async (
  supabase: SupabaseClient,
  project: SiteAnalysisProject,
  url: string,
  dispatch: React.Dispatch<AppAction>
): Promise<SiteAnalysisProject> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Setting up single page audit for ${url}`, status: 'info', timestamp: Date.now() }
  });

  const fullUrl = url.startsWith('http') ? url : `https://${url}`;

  // Insert just this one page - no sitemap discovery
  const { data: insertedPage, error } = await supabase
    .from('site_pages')
    .upsert({
      project_id: project.id,
      url: fullUrl,
      path: new URL(fullUrl).pathname,
      discovered_via: 'single_page',
      crawl_status: 'pending',
    }, {
      onConflict: 'project_id,url',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to insert page: ${error.message}`);

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'Single page ready for extraction', status: 'success', timestamp: Date.now() }
  });

  return {
    ...project,
    pages: insertedPage ? [mapDbPageToModel(insertedPage)] : [],
    pageCount: 1,
  };
};

/**
 * Initialize from GSC CSV
 */
export const initFromGscV2 = async (
  supabase: SupabaseClient,
  project: SiteAnalysisProject,
  csvText: string,
  dispatch: React.Dispatch<AppAction>
): Promise<SiteAnalysisProject> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'Parsing GSC CSV data...', status: 'info', timestamp: Date.now() }
  });

  const importResult = importGscCsv(csvText);

  if (importResult.type === 'unknown') {
    throw new Error('Could not detect GSC CSV format');
  }

  let pageRecords: any[] = [];
  let gscData: GscRow[] = [];

  if (importResult.type === 'pages' && importResult.pages) {
    // Deduplicate by URL
    const seenUrls = new Set<string>();
    pageRecords = importResult.pages.data
      .filter(row => {
        if (seenUrls.has(row.page)) return false;
        seenUrls.add(row.page);
        return true;
      })
      .map(row => ({
        project_id: project.id,
        url: row.page,
        path: new URL(row.page).pathname,
        discovered_via: 'gsc',
        crawl_status: 'pending',
        gsc_clicks: row.clicks,
        gsc_impressions: row.impressions,
        gsc_ctr: row.ctr,
        gsc_position: row.position,
      }));
  } else if (importResult.type === 'page_queries' && importResult.pageQueries) {
    // groupQueriesByPage already deduplicates by URL (uses Map)
    const grouped = groupQueriesByPage(importResult.pageQueries.data);

    pageRecords = Array.from(grouped.entries()).map(([url, queries]) => ({
      project_id: project.id,
      url,
      path: new URL(url).pathname,
      discovered_via: 'gsc',
      crawl_status: 'pending',
      gsc_clicks: queries.reduce((sum, q) => sum + q.clicks, 0),
      gsc_impressions: queries.reduce((sum, q) => sum + q.impressions, 0),
      gsc_ctr: queries.length > 0 ? queries.reduce((sum, q) => sum + q.ctr, 0) / queries.length : 0,
      gsc_position: queries.length > 0 ? queries.reduce((sum, q) => sum + q.position, 0) / queries.length : 0,
      gsc_queries: queries,
    }));
  }

  // Use upsert to handle retries (existing records from previous attempts)
  const { data: insertedPages, error } = await supabase
    .from('site_pages')
    .upsert(pageRecords, {
      onConflict: 'project_id,url',
      ignoreDuplicates: false,
    })
    .select();

  if (error) throw new Error(`Failed to insert pages: ${error.message}`);

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Imported ${insertedPages?.length || 0} pages from GSC`, status: 'success', timestamp: Date.now() }
  });

  return {
    ...project,
    gscData: gscData.length > 0 ? gscData : undefined,
    pages: insertedPages?.map(mapDbPageToModel) || [],
    pageCount: insertedPages?.length || 0,
  };
};

// ============================================
// CONTENT EXTRACTION
// ============================================

/**
 * Extract content for all pending pages using dual extraction (Apify + Jina)
 */
export const extractProjectContent = async (
  supabase: SupabaseClient,
  project: SiteAnalysisProject,
  config: ExtractionConfig,
  dispatch: React.Dispatch<AppAction>,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<SiteAnalysisProject> => {
  const pendingPages = project.pages?.filter(p => p.crawlStatus === 'pending') || [];

  if (pendingPages.length === 0) {
    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: 'No pending pages to extract', status: 'info', timestamp: Date.now() }
    });
    return project;
  }

  await updateProjectStatus(supabase, project.id, 'extracting');

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Starting dual extraction for ${pendingPages.length} pages`, status: 'info', timestamp: Date.now() }
  });

  const urls = pendingPages.map(p => p.url);

  // Run extraction
  const extractions = await extractPages(urls, config, onProgress);

  // Update pages in database
  let crawledCount = 0;
  let failedCount = 0;

  for (const extraction of extractions) {
    const page = pendingPages.find(p => p.url === extraction.url);
    if (!page) continue;

    const merged = mergeExtractionData(extraction);
    const hasContent = extraction.technical || extraction.semantic;

    // Build links array with isInternal flag for proper round-trip
    const allLinks = [
      ...merged.internalLinks.map(l => ({ href: l.href, text: l.text, isInternal: true })),
      ...merged.externalLinks.map(l => ({ href: l.href, text: l.text, isInternal: false })),
    ];

    const updateData: any = {
      crawl_status: hasContent ? 'crawled' : 'failed',
      crawled_at: new Date().toISOString(),
      apify_crawled: !!extraction.technical,
      jina_crawled: !!extraction.semantic,
      content_hash: merged.contentHash || null,
      title: (merged.title || '').slice(0, 500), // Prevent overflow
      meta_description: (merged.metaDescription || '').slice(0, 1000),
      h1: (merged.h1 || '').slice(0, 500),
      word_count: merged.wordCount || 0,
      status_code: merged.statusCode || 0,
      canonical_url: merged.canonicalUrl || null,
      robots_meta: merged.robotsMeta || null,
      schema_types: merged.schemaTypes || [],
      schema_json: merged.schemaJson || [],
      ttfb_ms: merged.ttfbMs || null,
      load_time_ms: merged.loadTimeMs || null,
      dom_nodes: merged.domNodes || null,
      html_size_kb: merged.htmlSizeKb || null,
      headings: merged.headings || [],
      links: allLinks,
      images: merged.images || [],
      content_markdown: merged.contentMarkdown || null,
    };

    if (extraction.errors?.length) {
      updateData.crawl_error = extraction.errors.join('; ');
    }

    const { error } = await supabase
      .from('site_pages')
      .update(updateData)
      .eq('id', page.id);

    if (error) {
      console.error('[SiteAnalysis] Update failed:', {
        pageId: page.id,
        url: page.url,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      dispatch({
        type: 'LOG_EVENT',
        payload: { service: 'SiteAnalysis', message: `Failed to update page ${page.url}: ${error.message} (${error.code})`, status: 'failure', timestamp: Date.now() }
      });
    }

    if (hasContent) crawledCount++;
    else failedCount++;
  }

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Extraction complete: ${crawledCount} succeeded, ${failedCount} failed`, status: 'success', timestamp: Date.now() }
  });

  // Reload project
  return loadProject(supabase, project.id);
};

// ============================================
// PILLAR DISCOVERY
// ============================================

/**
 * Discover semantic pillars (CE/SC/CSI) from crawled content
 * This uses AI to analyze the site content and suggest pillars
 */
export const discoverPillars = async (
  supabase: SupabaseClient,
  project: SiteAnalysisProject,
  aiAnalyzer: (content: string) => Promise<DiscoveredPillars>,
  dispatch: React.Dispatch<AppAction>
): Promise<DiscoveredPillars> => {
  await updateProjectStatus(supabase, project.id, 'discovering_pillars');

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'Analyzing content to discover semantic pillars...', status: 'info', timestamp: Date.now() }
  });

  // Gather content from crawled pages for analysis
  const crawledPages = project.pages?.filter(p => p.crawlStatus === 'crawled') || [];

  if (crawledPages.length === 0) {
    throw new Error('No crawled pages available for pillar discovery');
  }

  // Build content summary for AI analysis
  const contentSummary = crawledPages.slice(0, 20).map(page => ({
    url: page.url,
    title: page.title || '',
    h1: page.h1 || '',
    metaDescription: page.metaDescription || '',
    headings: page.headings?.slice(0, 10) || [],
    schemaTypes: page.schemaTypes || [],
  }));

  const analysisInput = JSON.stringify(contentSummary, null, 2);

  // Call AI analyzer
  const discoveredPillars = await aiAnalyzer(analysisInput);

  // Store discovered pillars
  await updateProjectPillars(
    supabase,
    project.id,
    {
      centralEntity: discoveredPillars.centralEntity.suggested,
      centralEntityType: discoveredPillars.centralEntity.type,
      sourceContext: discoveredPillars.sourceContext.suggested,
      sourceContextType: discoveredPillars.sourceContext.type,
      centralSearchIntent: discoveredPillars.centralSearchIntent.suggested,
    },
    'inferred'
  );

  await updateProjectStatus(supabase, project.id, 'awaiting_validation');

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'Pillar discovery complete - awaiting validation', status: 'success', timestamp: Date.now() }
  });

  return discoveredPillars;
};

/**
 * Copy pillars from linked topical map
 */
export const copyPillarsFromLinkedMap = async (
  supabase: SupabaseClient,
  projectId: string,
  linkedMapId: string,
  dispatch: React.Dispatch<AppAction>
): Promise<void> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'Copying pillars from linked topical map...', status: 'info', timestamp: Date.now() }
  });

  // Load linked topical map by its ID
  const { data: topicalMap, error } = await supabase
    .from('topical_maps')
    .select('pillars')
    .eq('id', linkedMapId)
    .single();

  if (error || !topicalMap?.pillars) {
    throw new Error('Could not load pillars from linked topical map');
  }

  const pillars = topicalMap.pillars as SEOPillars;

  await updateProjectPillars(
    supabase,
    projectId,
    {
      centralEntity: pillars.centralEntity,
      sourceContext: pillars.sourceContext,
      centralSearchIntent: pillars.centralSearchIntent,
    },
    'linked'
  );

  await updateProjectStatus(supabase, projectId, 'awaiting_validation');

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'Pillars copied from linked project', status: 'success', timestamp: Date.now() }
  });
};

// ============================================
// GRAPH BUILDING
// ============================================

/**
 * Build Neo4j graph for the project
 */
export const buildProjectGraphV2 = async (
  project: SiteAnalysisProject,
  neo4jConfig: { uri: string; user: string; password: string },
  dispatch: React.Dispatch<AppAction>
): Promise<void> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'Building link graph in Neo4j...', status: 'info', timestamp: Date.now() }
  });

  const crawledPages = project.pages?.filter(p => p.crawlStatus === 'crawled') || [];

  if (crawledPages.length === 0) {
    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: 'No crawled pages to build graph', status: 'warning', timestamp: Date.now() }
    });
    return;
  }

  // Initialize Neo4j connection
  initNeo4j(neo4jConfig.uri, neo4jConfig.user, neo4jConfig.password);

  // Transform pages for Neo4j with required fields
  const graphPages = crawledPages.map(page => ({
    id: page.id,
    url: page.url,
    path: page.path,
    title: page.title || '',
    domain: project.domain,
    wordCount: page.wordCount || 0,
    contentHash: page.contentHash,
    links: page.links?.map(l => ({
      href: l.href,
      text: l.text,
      isInternal: l.isInternal,
    })) || [],
  }));

  await buildProjectGraph(project.id, graphPages);

  // Calculate PageRank (requires Neo4j GDS plugin - optional)
  try {
    const pageRankResults = await calculatePageRank(project.id);
    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: `Calculated PageRank for ${pageRankResults.length} pages`, status: 'info', timestamp: Date.now() }
    });
  } catch (error: any) {
    // GDS plugin not installed - skip PageRank calculation
    const isGdsError = error?.message?.includes('gds.') || error?.message?.includes('procedure');
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'SiteAnalysis',
        message: isGdsError
          ? 'PageRank skipped (Neo4j GDS plugin not installed)'
          : `PageRank calculation failed: ${error.message}`,
        status: 'warning',
        timestamp: Date.now()
      }
    });
  }

  // Find orphan pages
  const orphanPages = await findOrphanPages(project.id);
  if (orphanPages.length > 0) {
    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: `Found ${orphanPages.length} orphan pages`, status: 'warning', timestamp: Date.now() }
    });
  }

  // Find hub pages
  const hubPages = await findHubPages(project.id, 5);
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Identified ${hubPages.length} hub pages`, status: 'info', timestamp: Date.now() }
  });

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'Graph building complete', status: 'success', timestamp: Date.now() }
  });
};

// ============================================
// AUDITING
// ============================================

/**
 * Run audit for a single page
 */
export const auditPageV2 = (
  page: SitePageRecord,
  project: SiteAnalysisProject
): Omit<PageAudit, 'id' | 'createdAt'> => {
  const phases = {
    technical: runPhaseAudit('technical', page, project),
    semantic: runPhaseAudit('semantic', page, project),
    linkStructure: runPhaseAudit('linkStructure', page, project),
    contentQuality: runPhaseAudit('contentQuality', page, project),
    visualSchema: runPhaseAudit('visualSchema', page, project),
  };

  // Calculate weighted overall score
  const overallScore = Math.round(
    phases.technical.score * PHASE_CONFIG.technical.weight +
    phases.semantic.score * PHASE_CONFIG.semantic.weight +
    phases.linkStructure.score * PHASE_CONFIG.linkStructure.weight +
    phases.contentQuality.score * PHASE_CONFIG.contentQuality.weight +
    phases.visualSchema.score * PHASE_CONFIG.visualSchema.weight
  );

  // Count issues
  const allChecks = [
    ...phases.technical.checks,
    ...phases.semantic.checks,
    ...phases.linkStructure.checks,
    ...phases.contentQuality.checks,
    ...phases.visualSchema.checks,
  ];

  const criticalIssuesCount = allChecks.filter(c => !c.passed && getRulePriority(c.ruleId) === 'critical').length;
  const highIssuesCount = allChecks.filter(c => !c.passed && getRulePriority(c.ruleId) === 'high').length;
  const mediumIssuesCount = allChecks.filter(c => !c.passed && getRulePriority(c.ruleId) === 'medium').length;
  const lowIssuesCount = allChecks.filter(c => !c.passed && getRulePriority(c.ruleId) === 'low').length;

  // Generate summary
  let summary = `Overall score: ${overallScore}/100. `;
  if (criticalIssuesCount > 0) summary += `${criticalIssuesCount} critical issue(s). `;
  if (highIssuesCount > 0) summary += `${highIssuesCount} high priority issue(s). `;
  if (criticalIssuesCount === 0 && highIssuesCount === 0) summary += 'No critical issues.';

  return {
    pageId: page.id,
    projectId: project.id,
    version: 1,
    overallScore,
    technicalScore: phases.technical.score,
    semanticScore: phases.semantic.score,
    linkStructureScore: phases.linkStructure.score,
    contentQualityScore: phases.contentQuality.score,
    visualSchemaScore: phases.visualSchema.score,
    technicalChecks: phases.technical.checks,
    semanticChecks: phases.semantic.checks,
    linkStructureChecks: phases.linkStructure.checks,
    contentQualityChecks: phases.contentQuality.checks,
    visualSchemaChecks: phases.visualSchema.checks,
    aiAnalysisComplete: false,
    summary,
    criticalIssuesCount,
    highIssuesCount,
    mediumIssuesCount,
    lowIssuesCount,
    contentHashAtAudit: page.contentHash || '',
    auditType: 'quick',
  };
};

/**
 * Run audits for all crawled pages and save to database
 */
export const auditProjectV2 = async (
  supabase: SupabaseClient,
  project: SiteAnalysisProject,
  dispatch: React.Dispatch<AppAction>
): Promise<SiteAnalysisProject> => {
  await updateProjectStatus(supabase, project.id, 'analyzing');

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'Starting page audits...', status: 'info', timestamp: Date.now() }
  });

  const crawledPages = project.pages?.filter(p => p.crawlStatus === 'crawled') || [];

  for (const page of crawledPages) {
    // Get next version number
    const { data: versionData } = await supabase
      .rpc('get_next_audit_version', { p_page_id: page.id });

    const audit = auditPageV2(page, project);
    audit.version = versionData || 1;

    // Insert audit
    const { data: insertedAudit, error } = await supabase
      .from('page_audits')
      .insert({
        page_id: audit.pageId,
        project_id: audit.projectId,
        version: audit.version,
        overall_score: audit.overallScore,
        technical_score: audit.technicalScore,
        semantic_score: audit.semanticScore,
        link_structure_score: audit.linkStructureScore,
        content_quality_score: audit.contentQualityScore,
        visual_schema_score: audit.visualSchemaScore,
        technical_checks: audit.technicalChecks,
        semantic_checks: audit.semanticChecks,
        link_structure_checks: audit.linkStructureChecks,
        content_quality_checks: audit.contentQualityChecks,
        visual_schema_checks: audit.visualSchemaChecks,
        ai_analysis_complete: audit.aiAnalysisComplete,
        summary: audit.summary,
        critical_issues_count: audit.criticalIssuesCount,
        high_issues_count: audit.highIssuesCount,
        medium_issues_count: audit.mediumIssuesCount,
        low_issues_count: audit.lowIssuesCount,
        content_hash_at_audit: audit.contentHashAtAudit,
        audit_type: audit.auditType,
      })
      .select()
      .single();

    if (error) {
      dispatch({
        type: 'LOG_EVENT',
        payload: { service: 'SiteAnalysis', message: `Failed to save audit for ${page.url}: ${error.message}`, status: 'failure', timestamp: Date.now() }
      });
      continue;
    }

    // Update page with latest audit reference
    await supabase
      .from('site_pages')
      .update({
        latest_audit_id: insertedAudit?.id,
        latest_audit_score: audit.overallScore,
        latest_audit_at: new Date().toISOString(),
      })
      .eq('id', page.id);

    // Generate tasks from failed checks
    await generateAuditTasks(supabase, project.id, page.id, insertedAudit?.id, audit);
  }

  // Save audit history snapshot
  await saveAuditHistory(supabase, project);

  await updateProjectStatus(supabase, project.id, 'completed');

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Audited ${crawledPages.length} pages`, status: 'success', timestamp: Date.now() }
  });

  return loadProject(supabase, project.id);
};

// ============================================
// TASK GENERATION
// ============================================

/**
 * Generate audit tasks from failed checks
 */
const generateAuditTasks = async (
  supabase: SupabaseClient,
  projectId: string,
  pageId: string,
  auditId: string | undefined,
  audit: Omit<PageAudit, 'id' | 'createdAt'>
): Promise<void> => {
  const allChecks = [
    ...audit.technicalChecks.map(c => ({ ...c, phase: 'technical' as const })),
    ...audit.semanticChecks.map(c => ({ ...c, phase: 'semantic' as const })),
    ...audit.linkStructureChecks.map(c => ({ ...c, phase: 'linkStructure' as const })),
    ...audit.contentQualityChecks.map(c => ({ ...c, phase: 'contentQuality' as const })),
    ...audit.visualSchemaChecks.map(c => ({ ...c, phase: 'visualSchema' as const })),
  ];

  const tasks = allChecks
    .filter(check => !check.passed && check.score < 70)
    .map(check => {
      const rule = ALL_AUDIT_RULES.find(r => r.id === check.ruleId);
      return {
        project_id: projectId,
        page_id: pageId,
        audit_id: auditId,
        rule_id: check.ruleId,
        title: check.ruleName,
        description: check.details,
        remediation: check.suggestion || rule?.remediation || '',
        priority: rule?.priority || 'medium',
        estimated_impact: rule?.priority === 'critical' ? 'high' : rule?.priority === 'high' ? 'medium' : 'low',
        phase: check.phase,
        status: 'pending',
      };
    });

  if (tasks.length > 0) {
    await supabase.from('audit_tasks').insert(tasks);
  }
};

/**
 * Save audit history snapshot
 */
const saveAuditHistory = async (
  supabase: SupabaseClient,
  project: SiteAnalysisProject
): Promise<void> => {
  const { data: audits } = await supabase
    .from('page_audits')
    .select('*')
    .eq('project_id', project.id);

  if (!audits || audits.length === 0) return;

  const scores = audits.map(a => a.overall_score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // Count issues
  const { data: tasks } = await supabase
    .from('audit_tasks')
    .select('priority, rule_id, title')
    .eq('project_id', project.id);

  const criticalIssues = tasks?.filter(t => t.priority === 'critical').length || 0;
  const highIssues = tasks?.filter(t => t.priority === 'high').length || 0;
  const mediumIssues = tasks?.filter(t => t.priority === 'medium').length || 0;
  const lowIssues = tasks?.filter(t => t.priority === 'low').length || 0;

  // Count top issues
  const issueCounts = new Map<string, { ruleName: string; count: number }>();
  tasks?.forEach(t => {
    const existing = issueCounts.get(t.rule_id);
    if (existing) existing.count++;
    else issueCounts.set(t.rule_id, { ruleName: t.title, count: 1 });
  });

  const topIssues = Array.from(issueCounts.entries())
    .map(([ruleId, data]) => ({ ruleId, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  await supabase.from('audit_history').insert({
    project_id: project.id,
    total_pages: project.pages?.length || 0,
    pages_audited: audits.length,
    average_score: avgScore,
    avg_technical_score: Math.round(audits.reduce((s, a) => s + a.technical_score, 0) / audits.length),
    avg_semantic_score: Math.round(audits.reduce((s, a) => s + a.semantic_score, 0) / audits.length),
    avg_link_structure_score: Math.round(audits.reduce((s, a) => s + a.link_structure_score, 0) / audits.length),
    avg_content_quality_score: Math.round(audits.reduce((s, a) => s + a.content_quality_score, 0) / audits.length),
    avg_visual_schema_score: Math.round(audits.reduce((s, a) => s + a.visual_schema_score, 0) / audits.length),
    critical_issues: criticalIssues,
    high_issues: highIssues,
    medium_issues: mediumIssues,
    low_issues: lowIssues,
    top_issues: topIssues,
  });
};

// ============================================
// AUDIT RULE HELPERS
// ============================================

const getRulePriority = (ruleId: string): 'critical' | 'high' | 'medium' | 'low' => {
  const rule = ALL_AUDIT_RULES.find(r => r.id === ruleId);
  return rule?.priority || 'medium';
};

/**
 * Run phase audit
 */
const runPhaseAudit = (
  phase: AuditRule['phase'],
  page: SitePageRecord,
  project: SiteAnalysisProject
): { score: number; checks: AuditCheck[] } => {
  const rules = getRulesByPhase(phase);
  const checks = rules.map(rule => runAuditCheck(rule, page, project));

  const passedCount = checks.filter(c => c.passed).length;
  const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
  const weightedScore = checks.reduce((sum, check, i) => {
    return sum + (check.score * rules[i].weight);
  }, 0) / (totalWeight || 1);

  return {
    score: Math.round(weightedScore),
    checks,
  };
};

/**
 * Run single audit check - now with V2 data from Apify + Jina
 */
const runAuditCheck = (
  rule: AuditRule,
  page: SitePageRecord,
  project: SiteAnalysisProject
): AuditCheck => {
  const check: AuditCheck = {
    ruleId: rule.id,
    ruleName: rule.name,
    passed: false,
    score: 0,
    details: '',
    suggestion: rule.remediation,
  };

  // Technical rules with actual data from Apify
  switch (rule.id) {
    case 'tech-status-code':
      const statusCode = page.statusCode || 0;
      check.passed = statusCode === 200;
      check.score = check.passed ? 100 : 0;
      check.value = statusCode;
      check.details = statusCode ? `Status code: ${statusCode}` : 'Status code unavailable';
      break;

    case 'tech-canonical':
      const hasCanonical = !!page.canonicalUrl;
      check.passed = hasCanonical;
      check.score = hasCanonical ? 100 : 0;
      check.details = hasCanonical ? `Canonical: ${page.canonicalUrl}` : 'No canonical tag found';
      break;

    case 'tech-robots':
      const robotsMeta = page.robotsMeta || '';
      const isIndexable = !robotsMeta.includes('noindex');
      check.passed = isIndexable;
      check.score = isIndexable ? 100 : 0;
      check.details = robotsMeta ? `Robots: ${robotsMeta}` : 'No robots meta tag (default index)';
      break;

    case 'tech-ttfb':
      const ttfb = page.ttfbMs || 0;
      const ttfbThreshold = rule.threshold?.value || 800;
      check.passed = ttfb > 0 && ttfb < ttfbThreshold;
      check.score = ttfb === 0 ? 50 : (ttfb < ttfbThreshold ? 100 : Math.max(0, 100 - ((ttfb - ttfbThreshold) / ttfbThreshold) * 100));
      check.value = ttfb;
      check.details = ttfb > 0 ? `TTFB: ${ttfb}ms (threshold: ${ttfbThreshold}ms)` : 'TTFB not measured';
      break;

    case 'link-count':
      const linkCount = page.links?.length || 0;
      const maxLinks = rule.threshold?.value || 150;
      check.passed = linkCount <= maxLinks;
      check.score = check.passed ? 100 : Math.max(0, 100 - ((linkCount - maxLinks) / maxLinks) * 100);
      check.value = linkCount;
      check.details = `Found ${linkCount} links (max ${maxLinks})`;
      break;

    case 'link-no-generic':
      const genericAnchors = ['click here', 'read more', 'learn more', 'here', 'more'];
      const links = page.links || [];
      const genericLinks = links.filter(l =>
        genericAnchors.some(g => l.text?.toLowerCase().trim() === g)
      );
      check.passed = genericLinks.length === 0;
      check.score = check.passed ? 100 : Math.max(0, 100 - (genericLinks.length * 20));
      check.details = check.passed ? 'No generic anchor texts' : `Found ${genericLinks.length} generic anchors`;
      break;

    case 'visual-schema-present':
      const schemaCount = page.schemaTypes?.length || 0;
      check.passed = schemaCount > 0;
      check.score = schemaCount > 0 ? 100 : 0;
      check.details = schemaCount > 0 ? `Schema types: ${page.schemaTypes?.join(', ')}` : 'No structured data found';
      break;

    case 'visual-schema-article':
      const hasArticleSchema = page.schemaTypes?.some(s =>
        ['Article', 'NewsArticle', 'BlogPosting', 'TechArticle'].includes(s)
      ) || false;
      check.passed = hasArticleSchema;
      check.score = hasArticleSchema ? 100 : 0;
      check.details = hasArticleSchema ? 'Article schema present' : 'No Article schema found';
      break;

    case 'semantic-ce-alignment':
      // Check if page title/h1 mentions central entity
      const ce = project.centralEntity?.toLowerCase() || '';
      const titleLower = (page.title || '').toLowerCase();
      const h1Lower = (page.h1 || '').toLowerCase();
      const hasCeInTitle = ce && (titleLower.includes(ce) || h1Lower.includes(ce));
      check.passed = hasCeInTitle;
      check.score = hasCeInTitle ? 100 : 50; // Partial score if not found (needs AI)
      check.details = hasCeInTitle ? 'Central entity found in title/H1' : 'Central entity not found in title/H1 (needs AI analysis)';
      break;

    case 'content-word-count':
      const wordCount = page.wordCount || 0;
      const minWords = rule.threshold?.value || 300;
      check.passed = wordCount >= minWords;
      check.score = wordCount >= minWords ? 100 : Math.min(100, (wordCount / minWords) * 100);
      check.value = wordCount;
      check.details = `Word count: ${wordCount} (min ${minWords})`;
      break;

    case 'content-heading-structure':
      const headings = page.headings || [];
      const hasH1 = headings.some(h => h.level === 1);
      const hasH2 = headings.some(h => h.level === 2);
      check.passed = hasH1 && hasH2;
      check.score = (hasH1 ? 50 : 0) + (hasH2 ? 50 : 0);
      check.details = `H1: ${hasH1 ? 'Yes' : 'No'}, H2: ${hasH2 ? 'Yes' : 'No'}`;
      break;

    case 'visual-image-alt':
      const images = page.images || [];
      const imagesWithAlt = images.filter(img => img.alt && img.alt.trim().length > 0);
      const altRatio = images.length > 0 ? imagesWithAlt.length / images.length : 1;
      check.passed = altRatio >= 0.9;
      check.score = Math.round(altRatio * 100);
      check.details = `${imagesWithAlt.length}/${images.length} images have alt text`;
      break;

    default:
      // Rules requiring AI analysis
      check.details = 'Requires AI analysis';
      check.score = 50;
  }

  return check;
};

// ============================================
// DATABASE MAPPERS
// ============================================

const mapDbProjectToModel = (db: any): SiteAnalysisProject => ({
  id: db.id,
  userId: db.user_id,
  name: db.name,
  domain: db.domain,
  status: db.status,
  errorMessage: db.error_message,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
  lastAuditAt: db.last_audit_at,
  inputMethod: db.input_method,
  sitemapUrl: db.sitemap_url,
  linkedMapId: db.linked_project_id, // Note: column is named linked_project_id but stores map ID
  centralEntity: db.central_entity,
  centralEntityType: db.central_entity_type,
  sourceContext: db.source_context,
  sourceContextType: db.source_context_type,
  centralSearchIntent: db.central_search_intent,
  pillarsValidated: db.pillars_validated,
  pillarsValidatedAt: db.pillars_validated_at,
  pillarsSource: db.pillars_source,
});

const mapDbPageToModel = (db: any): SitePageRecord => ({
  id: db.id,
  projectId: db.project_id,
  url: db.url,
  path: db.path,
  discoveredVia: db.discovered_via,
  sitemapLastmod: db.sitemap_lastmod,
  sitemapPriority: db.sitemap_priority,
  sitemapChangefreq: db.sitemap_changefreq,
  crawlStatus: db.crawl_status,
  crawlError: db.crawl_error,
  crawledAt: db.crawled_at,
  apifyCrawled: db.apify_crawled,
  jinaCrawled: db.jina_crawled,
  contentHash: db.content_hash,
  title: db.title,
  metaDescription: db.meta_description,
  h1: db.h1,
  wordCount: db.word_count,
  statusCode: db.status_code,
  canonicalUrl: db.canonical_url,
  robotsMeta: db.robots_meta,
  schemaTypes: db.schema_types,
  schemaJson: db.schema_json,
  ttfbMs: db.ttfb_ms,
  loadTimeMs: db.load_time_ms,
  domNodes: db.dom_nodes,
  htmlSizeKb: db.html_size_kb,
  headings: db.headings,
  links: db.links,
  images: db.images,
  contentMarkdown: db.content_markdown,
  gscClicks: db.gsc_clicks,
  gscImpressions: db.gsc_impressions,
  gscCtr: db.gsc_ctr,
  gscPosition: db.gsc_position,
  gscQueries: db.gsc_queries,
  latestAuditId: db.latest_audit_id,
  latestAuditScore: db.latest_audit_score,
  latestAuditAt: db.latest_audit_at,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});
