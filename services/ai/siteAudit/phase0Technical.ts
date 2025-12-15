/**
 * Phase 0: Technical Baseline
 *
 * Crawls site structure and establishes technical baseline:
 * - Page inventory and status codes
 * - Indexation status
 * - COR (Cost of Retrieval) per page
 * - Technical issues (redirects, 404s, duplicates)
 */

import {
    TechnicalBaseline,
    PageTechnicalInfo,
    TechnicalIssue,
    AuditConfig
} from './types';

// =============================================================================
// MAIN PHASE 0 EXECUTION
// =============================================================================

export async function executePhase0(
    domain: string,
    existingPages: PageTechnicalInfo[],
    config: AuditConfig,
    onProgress?: (progress: number, step: string) => void
): Promise<TechnicalBaseline> {
    onProgress?.(0, 'Starting technical baseline analysis');

    const pages = existingPages.length > 0
        ? existingPages
        : await crawlSitePages(domain, config, onProgress);

    onProgress?.(50, 'Analyzing page metrics');

    // Analyze pages
    const analyzedPages = pages.map(page => analyzePageTechnical(page));

    onProgress?.(70, 'Identifying technical issues');

    // Identify issues
    const issues = identifyTechnicalIssues(analyzedPages);

    onProgress?.(90, 'Calculating COR metrics');

    // Calculate COR metrics
    const corMetrics = calculateCorMetrics(analyzedPages);

    // Calculate indexation
    const indexedPages = analyzedPages.filter(p => p.isIndexed).length;

    onProgress?.(100, 'Technical baseline complete');

    return {
        crawlDate: new Date().toISOString(),
        totalPages: analyzedPages.length,
        indexedPages,
        indexationRate: analyzedPages.length > 0
            ? (indexedPages / analyzedPages.length) * 100
            : 0,
        pages: analyzedPages,
        issues,
        corMetrics
    };
}

// =============================================================================
// CRAWLING (PLACEHOLDER - Uses existing page data in practice)
// =============================================================================

async function crawlSitePages(
    domain: string,
    config: AuditConfig,
    onProgress?: (progress: number, step: string) => void
): Promise<PageTechnicalInfo[]> {
    // In practice, this would use the pageExtractionService or a crawler
    // For now, return empty array - pages should be provided from existing data
    onProgress?.(25, 'Crawling site structure');

    console.log(`[Phase0] Would crawl ${domain} with max ${config.maxPages} pages`);

    return [];
}

// =============================================================================
// PAGE ANALYSIS
// =============================================================================

function analyzePageTechnical(page: PageTechnicalInfo): PageTechnicalInfo {
    const issues: string[] = [];

    // Check for common issues
    if (page.statusCode !== 200) {
        issues.push(`Non-200 status: ${page.statusCode}`);
    }

    if (!page.title || page.title.length < 10) {
        issues.push('Title too short or missing');
    }

    if (page.title && page.title.length > 60) {
        issues.push('Title too long (>60 chars)');
    }

    if (!page.metaDescription) {
        issues.push('Missing meta description');
    }

    if (page.metaDescription && page.metaDescription.length > 160) {
        issues.push('Meta description too long (>160 chars)');
    }

    if (page.h1Count === 0) {
        issues.push('Missing H1 tag');
    }

    if (page.h1Count > 1) {
        issues.push(`Multiple H1 tags (${page.h1Count})`);
    }

    if (page.pageSize > 3000000) { // 3MB
        issues.push('Page size too large (>3MB)');
    }

    if (page.loadTime > 3000) { // 3 seconds
        issues.push('Slow page load (>3s)');
    }

    if (page.internalLinks < 2) {
        issues.push('Too few internal links');
    }

    if (page.internalLinks > 150) {
        issues.push('Too many internal links (>150)');
    }

    return {
        ...page,
        issues
    };
}

// =============================================================================
// ISSUE IDENTIFICATION
// =============================================================================

function identifyTechnicalIssues(pages: PageTechnicalInfo[]): TechnicalIssue[] {
    const issues: TechnicalIssue[] = [];

    // Group pages by issue type
    const redirect3xx = pages.filter(p => p.statusCode >= 300 && p.statusCode < 400);
    const error4xx = pages.filter(p => p.statusCode >= 400 && p.statusCode < 500);
    const error5xx = pages.filter(p => p.statusCode >= 500);
    const notIndexed = pages.filter(p => !p.isIndexed && p.statusCode === 200);
    const missingH1 = pages.filter(p => p.h1Count === 0);
    const multipleH1 = pages.filter(p => p.h1Count > 1);
    const slowPages = pages.filter(p => p.loadTime > 3000);
    const largePages = pages.filter(p => p.pageSize > 3000000);
    const tooManyLinks = pages.filter(p => p.internalLinks > 150);

    // Redirect issues
    if (redirect3xx.length > 0) {
        issues.push({
            type: 'warning',
            category: 'redirect',
            message: `${redirect3xx.length} pages have redirect status codes`,
            affectedUrls: redirect3xx.map(p => p.url),
            recommendation: 'Update internal links to point directly to final URLs',
            priority: 'medium'
        });
    }

    // 4xx errors
    if (error4xx.length > 0) {
        issues.push({
            type: 'error',
            category: 'indexation',
            message: `${error4xx.length} pages return 4xx errors`,
            affectedUrls: error4xx.map(p => p.url),
            recommendation: 'Fix or redirect broken pages, update internal links',
            priority: 'high'
        });
    }

    // 5xx errors
    if (error5xx.length > 0) {
        issues.push({
            type: 'error',
            category: 'indexation',
            message: `${error5xx.length} pages return 5xx server errors`,
            affectedUrls: error5xx.map(p => p.url),
            recommendation: 'Investigate server issues immediately',
            priority: 'high'
        });
    }

    // Not indexed
    if (notIndexed.length > 0) {
        const indexationRate = ((pages.length - notIndexed.length) / pages.length) * 100;
        issues.push({
            type: indexationRate < 50 ? 'error' : 'warning',
            category: 'indexation',
            message: `${notIndexed.length} pages are not indexed (${indexationRate.toFixed(1)}% indexation rate)`,
            affectedUrls: notIndexed.map(p => p.url),
            recommendation: 'Check robots.txt, noindex tags, and internal linking to non-indexed pages',
            priority: indexationRate < 50 ? 'high' : 'medium'
        });
    }

    // Missing H1
    if (missingH1.length > 0) {
        issues.push({
            type: 'warning',
            category: 'structure',
            message: `${missingH1.length} pages missing H1 tag`,
            affectedUrls: missingH1.map(p => p.url),
            recommendation: 'Add a single, descriptive H1 tag to each page',
            priority: 'medium'
        });
    }

    // Multiple H1
    if (multipleH1.length > 0) {
        issues.push({
            type: 'warning',
            category: 'structure',
            message: `${multipleH1.length} pages have multiple H1 tags`,
            affectedUrls: multipleH1.map(p => p.url),
            recommendation: 'Ensure only one H1 per page for clear document structure',
            priority: 'low'
        });
    }

    // Slow pages
    if (slowPages.length > 0) {
        issues.push({
            type: 'warning',
            category: 'performance',
            message: `${slowPages.length} pages load slowly (>3s)`,
            affectedUrls: slowPages.map(p => p.url),
            recommendation: 'Optimize images, enable caching, reduce JavaScript',
            priority: 'medium'
        });
    }

    // Large pages
    if (largePages.length > 0) {
        issues.push({
            type: 'warning',
            category: 'performance',
            message: `${largePages.length} pages are too large (>3MB)`,
            affectedUrls: largePages.map(p => p.url),
            recommendation: 'Compress images, lazy load content, optimize assets',
            priority: 'medium'
        });
    }

    // Too many links
    if (tooManyLinks.length > 0) {
        issues.push({
            type: 'warning',
            category: 'structure',
            message: `${tooManyLinks.length} pages have >150 internal links`,
            affectedUrls: tooManyLinks.map(p => p.url),
            recommendation: 'Reduce link count to improve crawl efficiency and PageRank distribution',
            priority: 'medium'
        });
    }

    // Check for duplicate titles
    const titleMap = new Map<string, string[]>();
    pages.forEach(p => {
        if (p.title) {
            const existing = titleMap.get(p.title) || [];
            existing.push(p.url);
            titleMap.set(p.title, existing);
        }
    });

    const duplicateTitles = Array.from(titleMap.entries()).filter(([, urls]) => urls.length > 1);
    if (duplicateTitles.length > 0) {
        issues.push({
            type: 'warning',
            category: 'duplicate',
            message: `${duplicateTitles.length} duplicate page titles found`,
            affectedUrls: duplicateTitles.flatMap(([, urls]) => urls),
            recommendation: 'Create unique, descriptive titles for each page',
            priority: 'medium'
        });
    }

    return issues;
}

// =============================================================================
// COR METRICS
// =============================================================================

function calculateCorMetrics(pages: PageTechnicalInfo[]): {
    averagePageSize: number;
    averageLoadTime: number;
    totalCrawlBudget: number;
} {
    if (pages.length === 0) {
        return { averagePageSize: 0, averageLoadTime: 0, totalCrawlBudget: 0 };
    }

    const totalSize = pages.reduce((sum, p) => sum + (p.pageSize || 0), 0);
    const totalTime = pages.reduce((sum, p) => sum + (p.loadTime || 0), 0);

    return {
        averagePageSize: Math.round(totalSize / pages.length),
        averageLoadTime: Math.round(totalTime / pages.length),
        totalCrawlBudget: totalSize // Total bytes to crawl
    };
}

// =============================================================================
// HELPER: CREATE PAGE INFO FROM EXTRACTED DATA
// =============================================================================

export function createPageTechnicalInfo(
    url: string,
    extractedData: {
        title?: string;
        metaDescription?: string;
        h1Count?: number;
        internalLinks?: number;
        externalLinks?: number;
        pageSize?: number;
        loadTime?: number;
    }
): PageTechnicalInfo {
    return {
        url,
        title: extractedData.title || '',
        statusCode: 200, // Assume 200 if we have data
        pageSize: extractedData.pageSize || 0,
        loadTime: extractedData.loadTime || 0,
        isIndexed: true, // Assume indexed unless told otherwise
        internalLinks: extractedData.internalLinks || 0,
        externalLinks: extractedData.externalLinks || 0,
        h1Count: extractedData.h1Count || 1,
        metaDescription: extractedData.metaDescription,
        issues: []
    };
}
