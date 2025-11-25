// services/siteAnalysisService.ts
// Main orchestrator for site analysis and page audits

import {
  SiteAnalysisProject,
  SitePageRecord,
  CrawlSession,
  PageAuditResult,
  PhaseAuditResult,
  AuditCheck,
  PageAuditActionItem,
  BusinessInfo,
  GscRow,
  JinaExtraction,
  ApifyTechnicalData
} from '../types';
import { extractPageContent, generateContentHash } from './jinaService';
import { parseSitemap, discoverSitemap, analyzeSitemapStructure, SitemapUrl } from './sitemapService';
import { importGscCsv, groupQueriesByPage, GscPagesRow } from './gscImportService';
import { ALL_AUDIT_RULES, PHASE_CONFIG, AuditRule, getRulesByPhase } from '../config/pageAuditRules';
import { AppAction } from '../state/appState';

// Generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a new site analysis project
 */
export const createProject = (
  name: string,
  domain: string,
  inputMethod: SiteAnalysisProject['inputMethod']
): SiteAnalysisProject => {
  return {
    id: generateId(),
    name,
    domain: normalizeDomain(domain),
    status: 'created',
    inputMethod,
    pages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pillarsValidated: false,
    userId: '',
  };
};

/**
 * Normalize domain (remove protocol, trailing slash)
 */
const normalizeDomain = (domain: string): string => {
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase();
};

/**
 * Initialize project from a sitemap URL
 */
export const initFromSitemap = async (
  project: SiteAnalysisProject,
  sitemapUrl: string,
  dispatch: React.Dispatch<AppAction>,
  options?: { maxUrls?: number; filterPattern?: RegExp }
): Promise<SiteAnalysisProject> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Parsing sitemap: ${sitemapUrl}`, status: 'info', timestamp: Date.now() }
  });

  const result = await parseSitemap(sitemapUrl, {
    followSitemapIndex: true,
    maxUrls: options?.maxUrls || 1000,
    filterPattern: options?.filterPattern,
  });

  if (result.errors.length > 0) {
    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: `Sitemap errors: ${result.errors.join(', ')}`, status: 'warning', timestamp: Date.now() }
    });
  }

  const structure = analyzeSitemapStructure(result.urls);

  // Create page records from sitemap URLs
  const pages: SitePageRecord[] = result.urls.map(url => ({
    id: generateId(),
    url: url.loc,
    status: 'pending',
    discoveredAt: Date.now(),
    sitemapData: {
      lastmod: url.lastmod,
      changefreq: url.changefreq,
      priority: url.priority,
    },
  }));

  return {
    ...project,
    sitemapUrl,
    status: 'created',
    pages,
    crawlSession: {
      id: generateId(),
      startedAt: Date.now(),
      status: 'pending',
      urlsDiscovered: pages.length,
      urlsCrawled: 0,
      urlsFailed: 0,
      totalUrls: pages.length,
      crawledUrls: 0,
      failedUrls: 0,
      errors: [],
    },
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Initialize project from GSC CSV data
 */
export const initFromGscCsv = async (
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

  let pages: SitePageRecord[] = [];
  let gscData: GscRow[] = [];

  if (importResult.type === 'pages' && importResult.pages) {
    pages = importResult.pages.data.map(row => ({
      id: generateId(),
      url: row.page,
      status: 'pending',
      discoveredAt: Date.now(),
      gscMetrics: {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
    }));

    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: `Imported ${pages.length} pages from GSC`, status: 'info', timestamp: Date.now() }
    });

  } else if (importResult.type === 'queries' && importResult.queries) {
    gscData = importResult.queries.data;
    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: `Imported ${gscData.length} queries from GSC`, status: 'info', timestamp: Date.now() }
    });

  } else if (importResult.type === 'page_queries' && importResult.pageQueries) {
    const grouped = groupQueriesByPage(importResult.pageQueries.data);

    pages = Array.from(grouped.entries()).map(([url, queries]) => ({
      id: generateId(),
      url,
      status: 'pending',
      discoveredAt: Date.now(),
      gscMetrics: {
        clicks: queries.reduce((sum, q) => sum + q.clicks, 0),
        impressions: queries.reduce((sum, q) => sum + q.impressions, 0),
        ctr: queries.length > 0 ? queries.reduce((sum, q) => sum + q.ctr, 0) / queries.length : 0,
        position: queries.length > 0 ? queries.reduce((sum, q) => sum + q.position, 0) / queries.length : 0,
      },
      gscData: queries,
    }));

    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: `Imported ${pages.length} pages with ${importResult.pageQueries.data.length} queries`, status: 'info', timestamp: Date.now() }
    });
  }

  return {
    ...project,
    status: 'created',
    pages,
    gscData: gscData.length > 0 ? gscData : undefined,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Initialize project from a single URL (auto-discover sitemap)
 */
export const initFromUrl = async (
  project: SiteAnalysisProject,
  url: string,
  dispatch: React.Dispatch<AppAction>
): Promise<SiteAnalysisProject> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Discovering sitemap for ${url}...`, status: 'info', timestamp: Date.now() }
  });

  // Extract domain from URL
  let domain: string;
  try {
    const parsed = new URL(url);
    domain = parsed.origin;
  } catch {
    domain = url.startsWith('http') ? url : `https://${url}`;
  }

  // Try to discover sitemap
  const sitemapUrls = await discoverSitemap(domain);

  if (sitemapUrls.length > 0) {
    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: `Found sitemap: ${sitemapUrls[0]}`, status: 'info', timestamp: Date.now() }
    });

    return initFromSitemap({ ...project, domain: normalizeDomain(domain) }, sitemapUrls[0], dispatch);
  }

  // No sitemap found - start with the single URL
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'No sitemap found, starting with single URL', status: 'warning', timestamp: Date.now() }
  });

  return {
    ...project,
    domain: normalizeDomain(domain),
    status: 'created',
    pages: [{
      id: generateId(),
      url: url.startsWith('http') ? url : `https://${url}`,
      status: 'pending',
      discoveredAt: Date.now(),
    }],
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Extract content for a single page using Jina
 */
export const extractPageContentForProject = async (
  page: SitePageRecord,
  jinaApiKey: string,
  dispatch: React.Dispatch<AppAction>
): Promise<SitePageRecord> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Extracting content: ${page.url}`, status: 'info', timestamp: Date.now() }
  });

  try {
    const extraction = await extractPageContent(page.url, jinaApiKey);
    const contentHash = generateContentHash(extraction.content);

    return {
      ...page,
      status: 'crawled',
      crawledAt: new Date().toISOString(),
      jinaExtraction: extraction,
      contentHash,
      // Check if content changed (if we had a previous hash)
      contentChanged: page.contentHash ? page.contentHash !== contentHash : undefined,
    };
  } catch (error) {
    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'SiteAnalysis', message: `Failed to extract ${page.url}: ${error instanceof Error ? error.message : 'Unknown error'}`, status: 'failure', timestamp: Date.now() }
    });

    return {
      ...page,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Crawl all pending pages in a project
 */
export const crawlProject = async (
  project: SiteAnalysisProject,
  jinaApiKey: string,
  dispatch: React.Dispatch<AppAction>,
  onProgress?: (crawled: number, total: number) => void
): Promise<SiteAnalysisProject> => {
  const pendingPages = project.pages.filter(p => p.status === 'pending');

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Starting crawl of ${pendingPages.length} pages`, status: 'info', timestamp: Date.now() }
  });

  const updatedPages = [...project.pages];
  let crawled = 0;
  let failed = 0;

  for (let i = 0; i < updatedPages.length; i++) {
    const page = updatedPages[i];
    if (page.status !== 'pending') continue;

    const updatedPage = await extractPageContentForProject(page, jinaApiKey, dispatch);
    updatedPages[i] = updatedPage;

    if (updatedPage.status === 'crawled') {
      crawled++;
    } else {
      failed++;
    }

    if (onProgress) {
      onProgress(crawled + failed, pendingPages.length);
    }

    // Rate limiting
    if (i < updatedPages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Crawl complete: ${crawled} succeeded, ${failed} failed`, status: 'info', timestamp: Date.now() }
  });

  return {
    ...project,
    status: 'analyzing',
    pages: updatedPages,
    crawlSession: project.crawlSession ? {
      ...project.crawlSession,
      status: 'completed',
      completedAt: Date.now(),
      urlsCrawled: crawled,
      urlsFailed: failed,
    } : undefined,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Run a single audit rule check
 */
const runAuditCheck = (
  rule: AuditRule,
  page: SitePageRecord
): AuditCheck => {
  const check: AuditCheck = {
    ruleId: rule.id,
    ruleName: rule.name,
    passed: false,
    score: 0,
    details: '',
    suggestion: rule.remediation,
  };

  // Technical rules with measurable thresholds
  if (rule.threshold?.type !== 'ai') {
    switch (rule.id) {
      case 'tech-status-code':
        // We don't have status code from Jina, assume 200 if crawled
        check.passed = page.status === 'crawled';
        check.score = check.passed ? 100 : 0;
        check.details = check.passed ? 'Page loaded successfully' : 'Page failed to load';
        break;

      case 'tech-canonical':
        // Check if canonical is in Jina content (simplified check)
        const hasCanonical = page.jinaExtraction?.content?.includes('canonical') || false;
        check.passed = hasCanonical;
        check.score = hasCanonical ? 100 : 0;
        check.details = hasCanonical ? 'Canonical tag detected' : 'No canonical tag found';
        break;

      case 'link-count':
        const linkCount = page.jinaExtraction?.links?.length || 0;
        const maxLinks = rule.threshold?.value || 150;
        check.passed = linkCount <= maxLinks;
        check.score = check.passed ? 100 : Math.max(0, 100 - ((linkCount - maxLinks) / maxLinks) * 100);
        check.details = `Found ${linkCount} links (max ${maxLinks})`;
        check.value = linkCount;
        break;

      case 'visual-schema-present':
        const hasSchema = (page.jinaExtraction?.schema?.length || 0) > 0;
        check.passed = hasSchema;
        check.score = hasSchema ? 100 : 0;
        check.details = hasSchema ? `Found ${page.jinaExtraction?.schema?.length} schema(s)` : 'No structured data found';
        break;

      case 'link-no-generic':
        const genericAnchors = ['click here', 'read more', 'learn more', 'here', 'more'];
        const links = page.jinaExtraction?.links || [];
        const genericLinks = links.filter(l =>
          genericAnchors.some(g => l.text.toLowerCase().trim() === g)
        );
        check.passed = genericLinks.length === 0;
        check.score = check.passed ? 100 : Math.max(0, 100 - (genericLinks.length * 20));
        check.details = check.passed ? 'No generic anchor texts found' : `Found ${genericLinks.length} generic anchors`;
        break;

      default:
        // For rules we can't check without AI, mark as needing AI analysis
        check.details = 'Requires AI analysis';
        check.score = 50; // Neutral score
    }
  } else {
    // AI-based rules - placeholder for AI analysis
    check.details = 'Pending AI analysis';
    check.score = 50;
  }

  return check;
};

/**
 * Run phase audit for a page
 */
const runPhaseAudit = (
  phase: AuditRule['phase'],
  page: SitePageRecord
): PhaseAuditResult => {
  const rules = getRulesByPhase(phase);
  const checks = rules.map(rule => runAuditCheck(rule, page));

  const passedCount = checks.filter(c => c.passed).length;
  const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
  const weightedScore = checks.reduce((sum, check, i) => {
    return sum + (check.score * rules[i].weight);
  }, 0) / (totalWeight || 1);

  return {
    phase,
    score: Math.round(weightedScore),
    passedCount,
    totalCount: checks.length,
    checks,
  };
};

/**
 * Generate action items from audit results
 */
const generateActionItems = (
  phases: PageAuditResult['phases'],
  rules: AuditRule[]
): PageAuditActionItem[] => {
  const items: PageAuditActionItem[] = [];

  const allPhases = [
    phases.technical,
    phases.semantic,
    phases.linkStructure,
    phases.contentQuality,
    phases.visualSchema,
  ];

  for (const phase of allPhases) {
    for (const check of phase.checks) {
      if (!check.passed && check.score < 70) {
        const rule = rules.find(r => r.id === check.ruleId);
        if (rule) {
          items.push({
            id: generateId(),
            ruleId: rule.id,
            priority: rule.priority,
            title: rule.name,
            description: check.details,
            remediation: check.suggestion || rule.remediation,
            status: 'pending',
            estimatedImpact: rule.priority === 'critical' ? 'high' :
                           rule.priority === 'high' ? 'medium' : 'low',
          });
        }
      }
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items;
};

/**
 * Run full audit for a single page
 */
export const auditPage = (page: SitePageRecord): PageAuditResult => {
  const phases = {
    technical: runPhaseAudit('technical', page),
    semantic: runPhaseAudit('semantic', page),
    linkStructure: runPhaseAudit('linkStructure', page),
    contentQuality: runPhaseAudit('contentQuality', page),
    visualSchema: runPhaseAudit('visualSchema', page),
  };

  // Calculate overall score (weighted by phase weights)
  const overallScore = Math.round(
    phases.technical.score * PHASE_CONFIG.technical.weight +
    phases.semantic.score * PHASE_CONFIG.semantic.weight +
    phases.linkStructure.score * PHASE_CONFIG.linkStructure.weight +
    phases.contentQuality.score * PHASE_CONFIG.contentQuality.weight +
    phases.visualSchema.score * PHASE_CONFIG.visualSchema.weight
  );

  const actionItems = generateActionItems(phases, ALL_AUDIT_RULES);

  // Generate summary
  const criticalIssues = actionItems.filter(i => i.priority === 'critical').length;
  const highIssues = actionItems.filter(i => i.priority === 'high').length;

  let summary = `Overall score: ${overallScore}/100. `;
  if (criticalIssues > 0) {
    summary += `${criticalIssues} critical issue(s) found. `;
  }
  if (highIssues > 0) {
    summary += `${highIssues} high priority issue(s). `;
  }
  if (criticalIssues === 0 && highIssues === 0) {
    summary += 'No critical issues found.';
  }

  return {
    url: page.url,
    timestamp: Date.now(),
    overallScore,
    summary,
    phases,
    actionItems,
    rawData: {
      jinaExtraction: page.jinaExtraction,
      gscData: page.gscData,
    },
  };
};

/**
 * Run audits for all crawled pages in a project
 */
export const auditProject = (
  project: SiteAnalysisProject,
  dispatch: React.Dispatch<AppAction>
): SiteAnalysisProject => {
  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: 'Starting page audits...', status: 'info', timestamp: Date.now() }
  });

  const updatedPages = project.pages.map(page => {
    if (page.status !== 'crawled') return page;

    const auditResult = auditPage(page);
    return {
      ...page,
      status: 'audited' as const,
      auditResult,
    };
  });

  const auditedCount = updatedPages.filter(p => p.status === 'audited').length;

  dispatch({
    type: 'LOG_EVENT',
    payload: { service: 'SiteAnalysis', message: `Audited ${auditedCount} pages`, status: 'info', timestamp: Date.now() }
  });

  return {
    ...project,
    status: 'completed',
    pages: updatedPages,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Get project summary statistics
 */
export const getProjectSummary = (project: SiteAnalysisProject): {
  totalPages: number;
  crawledPages: number;
  auditedPages: number;
  failedPages: number;
  averageScore: number;
  criticalIssues: number;
  highIssues: number;
  topIssues: { ruleId: string; ruleName: string; count: number }[];
} => {
  const auditedPages = project.pages.filter(p => p.auditResult);
  const scores = auditedPages.map(p => p.auditResult!.overallScore);
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Aggregate issues
  const issueCounts = new Map<string, { ruleName: string; count: number }>();
  let criticalIssues = 0;
  let highIssues = 0;

  for (const page of auditedPages) {
    for (const item of page.auditResult!.actionItems) {
      if (item.priority === 'critical') criticalIssues++;
      if (item.priority === 'high') highIssues++;

      const existing = issueCounts.get(item.ruleId);
      if (existing) {
        existing.count++;
      } else {
        issueCounts.set(item.ruleId, { ruleName: item.title, count: 1 });
      }
    }
  }

  const topIssues = Array.from(issueCounts.entries())
    .map(([ruleId, data]) => ({ ruleId, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalPages: project.pages.length,
    crawledPages: project.pages.filter(p => p.status === 'crawled' || p.status === 'audited').length,
    auditedPages: auditedPages.length,
    failedPages: project.pages.filter(p => p.status === 'failed').length,
    averageScore,
    criticalIssues,
    highIssues,
    topIssues,
  };
};

/**
 * Export audit results to JSON
 */
export const exportAuditResults = (project: SiteAnalysisProject): string => {
  const summary = getProjectSummary(project);
  const exportData = {
    project: {
      id: project.id,
      name: project.name,
      domain: project.domain,
      createdAt: project.createdAt,
      completedAt: project.updatedAt,
    },
    summary,
    pages: project.pages.map(page => ({
      url: page.url,
      status: page.status,
      auditResult: page.auditResult ? {
        overallScore: page.auditResult.overallScore,
        summary: page.auditResult.summary,
        phases: {
          technical: page.auditResult.phases.technical.score,
          semantic: page.auditResult.phases.semantic.score,
          linkStructure: page.auditResult.phases.linkStructure.score,
          contentQuality: page.auditResult.phases.contentQuality.score,
          visualSchema: page.auditResult.phases.visualSchema.score,
        },
        actionItems: page.auditResult.actionItems,
      } : null,
    })),
  };

  return JSON.stringify(exportData, null, 2);
};
