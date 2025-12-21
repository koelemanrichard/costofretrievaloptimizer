// services/ai/corpusAudit.ts
// Site-Wide Content Corpus Audit Service

import type {
  BusinessInfo,
  CorpusAuditConfig,
  CorpusAuditProgress,
  CorpusAuditResult,
  CorpusAuditIssue,
  CorpusAuditRecommendation,
  CorpusPage,
  CorpusMetrics,
  ContentOverlap,
  AnchorTextPattern,
  SemanticTriple,
} from '../../types';

import { analyzeCompetitorSitemap } from '../serpApiService';
import { extractPageContent } from '../jinaService';

// Progress callback type
type ProgressCallback = (progress: CorpusAuditProgress) => void;

// Generic anchor texts that should be diversified
const GENERIC_ANCHORS = [
  'click here', 'read more', 'learn more', 'here', 'this', 'link',
  'more', 'continue', 'see more', 'view', 'details', 'info',
  'klik hier', 'lees meer', 'meer informatie', // Dutch
  'cliquez ici', 'en savoir plus', // French
  'klicken sie hier', 'mehr erfahren', // German
];

/**
 * Discover pages from sitemap
 */
export async function discoverPages(
  domain: string,
  maxPages: number = 100
): Promise<string[]> {
  try {
    const pages = await analyzeCompetitorSitemap(domain);
    return pages.slice(0, maxPages);
  } catch (error) {
    console.error('[CorpusAudit] Error discovering pages:', error);
    return [];
  }
}

/**
 * Extract and analyze a single page
 */
export async function analyzePage(
  url: string,
  businessInfo: BusinessInfo
): Promise<CorpusPage | null> {
  if (!businessInfo.jinaApiKey) {
    console.warn('[CorpusAudit] Jina API key not configured');
    return null;
  }

  try {
    const content = await extractPageContent(url, businessInfo.jinaApiKey, {
      supabaseUrl: businessInfo.supabaseUrl,
      supabaseAnonKey: businessInfo.supabaseAnonKey,
    });

    // Extract links from content
    const internalLinks: { url: string; anchorText: string }[] = [];
    const externalLinks: { url: string; anchorText: string }[] = [];
    const domain = new URL(url).hostname;

    // Parse markdown links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content.content)) !== null) {
      const anchorText = match[1];
      const linkUrl = match[2];

      try {
        const linkDomain = new URL(linkUrl, url).hostname;
        if (linkDomain === domain || linkDomain.endsWith('.' + domain)) {
          internalLinks.push({ url: linkUrl, anchorText });
        } else {
          externalLinks.push({ url: linkUrl, anchorText });
        }
      } catch {
        // Invalid URL, skip
      }
    }

    return {
      url,
      title: content.title || '',
      wordCount: content.wordCount || 0,
      headings: content.headings || [],
      internalLinks,
      externalLinks,
    };
  } catch (error) {
    console.error(`[CorpusAudit] Error analyzing page ${url}:`, error);
    return null;
  }
}

/**
 * Detect content overlaps between pages
 */
export function detectContentOverlaps(
  pages: CorpusPage[],
  threshold: number = 0.3
): ContentOverlap[] {
  const overlaps: ContentOverlap[] = [];

  // Extract significant phrases from each page (using headings as proxy)
  const pageSignatures = pages.map(page => ({
    url: page.url,
    phrases: page.headings.map(h => h.text.toLowerCase()),
  }));

  // Compare each pair of pages
  for (let i = 0; i < pageSignatures.length; i++) {
    for (let j = i + 1; j < pageSignatures.length; j++) {
      const pageA = pageSignatures[i];
      const pageB = pageSignatures[j];

      // Find shared phrases
      const sharedPhrases = pageA.phrases.filter(p =>
        pageB.phrases.some(bp => bp.includes(p) || p.includes(bp))
      );

      const overlapPercentage = sharedPhrases.length / Math.max(pageA.phrases.length, pageB.phrases.length);

      if (overlapPercentage >= threshold) {
        let overlapType: ContentOverlap['overlapType'];
        if (overlapPercentage >= 0.8) {
          overlapType = 'duplicate';
        } else if (overlapPercentage >= 0.6) {
          overlapType = 'near_duplicate';
        } else if (overlapPercentage >= 0.4) {
          overlapType = 'partial';
        } else {
          overlapType = 'thematic';
        }

        overlaps.push({
          pageA: pageA.url,
          pageB: pageB.url,
          overlapPercentage: Math.round(overlapPercentage * 100),
          sharedPhrases,
          overlapType,
        });
      }
    }
  }

  return overlaps.sort((a, b) => b.overlapPercentage - a.overlapPercentage);
}

/**
 * Analyze anchor text patterns across the corpus
 */
export function analyzeAnchorPatterns(pages: CorpusPage[]): AnchorTextPattern[] {
  const anchorCounts = new Map<string, { urls: Set<string>; count: number }>();

  // Count all anchor texts
  for (const page of pages) {
    for (const link of page.internalLinks) {
      const normalizedAnchor = link.anchorText.toLowerCase().trim();
      if (!anchorCounts.has(normalizedAnchor)) {
        anchorCounts.set(normalizedAnchor, { urls: new Set(), count: 0 });
      }
      const entry = anchorCounts.get(normalizedAnchor)!;
      entry.urls.add(link.url);
      entry.count++;
    }
  }

  // Convert to patterns
  const patterns: AnchorTextPattern[] = [];

  for (const [anchor, data] of anchorCounts) {
    if (data.count >= 2) { // Only include anchors used multiple times
      const isGeneric = GENERIC_ANCHORS.some(g =>
        anchor === g || anchor.includes(g)
      );

      // Check for over-optimization (same exact anchor to many different URLs)
      const isOverOptimized = data.urls.size > 5 && !isGeneric;

      patterns.push({
        anchorText: anchor,
        frequency: data.count,
        targetUrls: [...data.urls],
        isGeneric,
        isOverOptimized,
      });
    }
  }

  return patterns.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Calculate semantic coverage against target EAVs
 */
export function calculateSemanticCoverage(
  pages: CorpusPage[],
  targetEAVs: SemanticTriple[]
): { covered: SemanticTriple[]; missing: SemanticTriple[]; coveragePercentage: number } {
  if (targetEAVs.length === 0) {
    return { covered: [], missing: [], coveragePercentage: 100 };
  }

  // Combine all page content (using headings as proxy)
  const corpusText = pages
    .flatMap(p => [p.title, ...p.headings.map(h => h.text)])
    .join(' ')
    .toLowerCase();

  const covered: SemanticTriple[] = [];
  const missing: SemanticTriple[] = [];

  for (const eav of targetEAVs) {
    // Check if subject and predicate are mentioned
    const subjectFound = corpusText.includes(eav.subject.label.toLowerCase());
    const predicateFound = corpusText.includes(eav.predicate.relation.toLowerCase());

    if (subjectFound && predicateFound) {
      covered.push(eav);
    } else {
      missing.push(eav);
    }
  }

  const coveragePercentage = Math.round((covered.length / targetEAVs.length) * 100);

  return { covered, missing, coveragePercentage };
}

/**
 * Calculate corpus-wide metrics
 */
export function calculateCorpusMetrics(
  pages: CorpusPage[],
  semanticCoverage: number
): CorpusMetrics {
  const totalPages = pages.length;
  const totalWordCount = pages.reduce((sum, p) => sum + p.wordCount, 0);
  const avgWordCount = totalPages > 0 ? Math.round(totalWordCount / totalPages) : 0;

  const avgInternalLinks = totalPages > 0
    ? Math.round(pages.reduce((sum, p) => sum + p.internalLinks.length, 0) / totalPages)
    : 0;

  const avgExternalLinks = totalPages > 0
    ? Math.round(pages.reduce((sum, p) => sum + p.externalLinks.length, 0) / totalPages)
    : 0;

  const avgHeadings = totalPages > 0
    ? Math.round(pages.reduce((sum, p) => sum + p.headings.length, 0) / totalPages)
    : 0;

  // Content freshness based on available metadata (placeholder - would need actual dates)
  const contentFreshness = 70; // Default moderate freshness

  return {
    totalPages,
    totalWordCount,
    avgWordCount,
    avgInternalLinks,
    avgExternalLinks,
    avgHeadings,
    topicalCoverage: semanticCoverage,
    contentFreshness,
  };
}

/**
 * Identify issues in the corpus
 */
export function identifyIssues(
  pages: CorpusPage[],
  overlaps: ContentOverlap[],
  anchorPatterns: AnchorTextPattern[],
  metrics: CorpusMetrics
): CorpusAuditIssue[] {
  const issues: CorpusAuditIssue[] = [];

  // Duplicate content issues
  const duplicates = overlaps.filter(o => o.overlapType === 'duplicate' || o.overlapType === 'near_duplicate');
  if (duplicates.length > 0) {
    issues.push({
      type: 'duplicate_content',
      severity: 'critical',
      affectedUrls: [...new Set(duplicates.flatMap(d => [d.pageA, d.pageB]))],
      description: `${duplicates.length} page pair(s) have significant content overlap.`,
      details: duplicates.map(d => `${d.pageA} ↔ ${d.pageB} (${d.overlapPercentage}%)`).join('; '),
    });
  }

  // Thin content issues
  const thinPages = pages.filter(p => p.wordCount < 300);
  if (thinPages.length > 0) {
    issues.push({
      type: 'thin_content',
      severity: thinPages.length > pages.length * 0.2 ? 'high' : 'medium',
      affectedUrls: thinPages.map(p => p.url),
      description: `${thinPages.length} page(s) have thin content (<300 words).`,
    });
  }

  // Orphan page detection
  const linkedUrls = new Set(pages.flatMap(p => p.internalLinks.map(l => l.url)));
  const orphanPages = pages.filter(p => !linkedUrls.has(p.url) && p.internalLinks.length === 0);
  if (orphanPages.length > 0) {
    issues.push({
      type: 'orphan_page',
      severity: 'medium',
      affectedUrls: orphanPages.map(p => p.url),
      description: `${orphanPages.length} page(s) appear to be orphaned (no incoming or outgoing internal links).`,
    });
  }

  // Generic anchor issues
  const genericAnchors = anchorPatterns.filter(p => p.isGeneric && p.frequency > 5);
  if (genericAnchors.length > 0) {
    issues.push({
      type: 'generic_anchors',
      severity: 'medium',
      affectedUrls: genericAnchors.flatMap(a => a.targetUrls).slice(0, 10),
      description: `${genericAnchors.length} generic anchor text pattern(s) detected.`,
      details: genericAnchors.map(a => `"${a.anchorText}" used ${a.frequency} times`).join('; '),
    });
  }

  // Over-optimized anchors
  const overOptimized = anchorPatterns.filter(p => p.isOverOptimized);
  if (overOptimized.length > 0) {
    issues.push({
      type: 'anchor_over_optimization',
      severity: 'high',
      affectedUrls: overOptimized.flatMap(a => a.targetUrls).slice(0, 10),
      description: `${overOptimized.length} anchor text(s) may be over-optimized.`,
      details: overOptimized.map(a => `"${a.anchorText}" points to ${a.targetUrls.length} URLs`).join('; '),
    });
  }

  // Coverage gaps
  if (metrics.topicalCoverage < 70) {
    issues.push({
      type: 'coverage_gap',
      severity: metrics.topicalCoverage < 50 ? 'high' : 'medium',
      affectedUrls: [],
      description: `Topical coverage is only ${metrics.topicalCoverage}% of target topics.`,
    });
  }

  return issues.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Generate recommendations from issues
 */
export function generateRecommendations(
  issues: CorpusAuditIssue[],
  metrics: CorpusMetrics
): CorpusAuditRecommendation[] {
  const recommendations: CorpusAuditRecommendation[] = [];

  for (const issue of issues) {
    switch (issue.type) {
      case 'duplicate_content':
        recommendations.push({
          type: 'consolidate',
          priority: 'critical',
          title: 'Consolidate Duplicate Content',
          description: issue.description,
          affectedUrls: issue.affectedUrls,
          suggestedAction: 'Merge duplicate pages into comprehensive resources, implement canonical tags, or create distinct content angles for each page.',
        });
        break;

      case 'thin_content':
        recommendations.push({
          type: 'expand',
          priority: issue.severity === 'high' ? 'high' : 'medium',
          title: 'Expand Thin Content',
          description: issue.description,
          affectedUrls: issue.affectedUrls,
          suggestedAction: 'Add comprehensive content including FAQs, examples, case studies, and detailed explanations to reach at least 800-1500 words.',
        });
        break;

      case 'orphan_page':
        recommendations.push({
          type: 'relink',
          priority: 'medium',
          title: 'Connect Orphan Pages',
          description: issue.description,
          affectedUrls: issue.affectedUrls,
          suggestedAction: 'Add internal links from related content to these pages and ensure they link out to other relevant pages.',
        });
        break;

      case 'generic_anchors':
        recommendations.push({
          type: 'diversify_anchors',
          priority: 'medium',
          title: 'Diversify Anchor Text',
          description: issue.description,
          affectedUrls: issue.affectedUrls,
          suggestedAction: 'Replace generic anchors like "click here" with descriptive, keyword-rich anchor text that describes the linked content.',
        });
        break;

      case 'anchor_over_optimization':
        recommendations.push({
          type: 'diversify_anchors',
          priority: 'high',
          title: 'Reduce Anchor Over-Optimization',
          description: issue.description,
          affectedUrls: issue.affectedUrls,
          suggestedAction: 'Vary anchor text across links to the same page. Use natural language variations and partial matches instead of exact match anchors.',
        });
        break;

      case 'coverage_gap':
        recommendations.push({
          type: 'add_content',
          priority: issue.severity === 'high' ? 'high' : 'medium',
          title: 'Fill Content Gaps',
          description: issue.description,
          affectedUrls: [],
          suggestedAction: 'Create new content to cover missing topics identified in the target EAV list. Focus on comprehensive, authoritative articles.',
        });
        break;
    }
  }

  // Add general recommendations based on metrics
  if (metrics.avgInternalLinks < 3) {
    recommendations.push({
      type: 'relink',
      priority: 'medium',
      title: 'Increase Internal Linking',
      description: `Average internal links per page is ${metrics.avgInternalLinks}, which is below recommended minimum of 3.`,
      affectedUrls: [],
      suggestedAction: 'Add contextual internal links throughout content to improve site structure and distribute page authority.',
    });
  }

  if (metrics.avgHeadings < 4) {
    recommendations.push({
      type: 'expand',
      priority: 'low',
      title: 'Improve Content Structure',
      description: `Average headings per page is ${metrics.avgHeadings}, suggesting content may lack structure.`,
      affectedUrls: [],
      suggestedAction: 'Add more subheadings (H2, H3) to break up content and improve scannability and SEO.',
    });
  }

  return recommendations;
}

/**
 * Run a complete Corpus Audit
 */
export async function runCorpusAudit(
  config: CorpusAuditConfig,
  businessInfo: BusinessInfo,
  onProgress?: ProgressCallback
): Promise<CorpusAuditResult> {
  const updateProgress = (
    phase: CorpusAuditProgress['phase'],
    currentStep: string,
    processedPages: number,
    totalPages: number
  ) => {
    if (onProgress) {
      onProgress({
        phase,
        currentStep,
        totalPages,
        processedPages,
        progress: totalPages > 0 ? Math.round((processedPages / totalPages) * 100) : 0,
      });
    }
  };

  try {
    // Step 1: Discover pages
    updateProgress('discovering', 'Discovering pages from sitemap...', 0, 0);
    const pageUrls = await discoverPages(config.domain, config.maxPages || 50);

    if (pageUrls.length === 0) {
      throw new Error('No pages found in sitemap');
    }

    const totalPages = pageUrls.length;

    // Step 2: Crawl and analyze pages
    updateProgress('crawling', 'Crawling pages...', 0, totalPages);
    const pages: CorpusPage[] = [];

    for (let i = 0; i < pageUrls.length; i++) {
      updateProgress('crawling', `Analyzing page ${i + 1}/${totalPages}`, i, totalPages);

      const page = await analyzePage(pageUrls[i], businessInfo);
      if (page) {
        pages.push(page);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 3: Detect content overlaps
    updateProgress('detecting_overlaps', 'Detecting content overlaps...', totalPages, totalPages);
    const contentOverlaps = config.checkDuplicates
      ? detectContentOverlaps(pages)
      : [];

    // Step 4: Analyze anchor patterns
    updateProgress('analyzing', 'Analyzing anchor patterns...', totalPages, totalPages);
    const anchorPatterns = config.checkAnchors
      ? analyzeAnchorPatterns(pages)
      : [];

    // Step 5: Calculate semantic coverage
    const semanticCoverage = config.checkCoverage && config.targetEAVs
      ? calculateSemanticCoverage(pages, config.targetEAVs)
      : { covered: [], missing: [], coveragePercentage: 100 };

    // Step 6: Calculate metrics
    updateProgress('calculating_metrics', 'Calculating metrics...', totalPages, totalPages);
    const metrics = calculateCorpusMetrics(pages, semanticCoverage.coveragePercentage);

    // Step 7: Identify issues and generate recommendations
    const issues = identifyIssues(pages, contentOverlaps, anchorPatterns, metrics);
    const recommendations = generateRecommendations(issues, metrics);

    updateProgress('complete', 'Audit complete', totalPages, totalPages);

    return {
      domain: config.domain,
      timestamp: new Date().toISOString(),
      pages,
      contentOverlaps,
      anchorPatterns,
      semanticCoverage,
      metrics,
      issues,
      recommendations,
    };
  } catch (error) {
    console.error('[CorpusAudit] Audit failed:', error);

    if (onProgress) {
      onProgress({
        phase: 'error',
        currentStep: 'Audit failed',
        totalPages: 0,
        processedPages: 0,
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    throw error;
  }
}

/**
 * Generate a business-friendly summary
 */
export function generateBusinessSummary(result: CorpusAuditResult): string {
  let summary = `# Site Content Audit: ${result.domain}\n\n`;

  // Executive summary
  summary += `## Executive Summary\n\n`;
  summary += `Analyzed **${result.metrics.totalPages}** pages with **${result.metrics.totalWordCount.toLocaleString()}** total words.\n\n`;

  const criticalIssues = result.issues.filter(i => i.severity === 'critical').length;
  const highIssues = result.issues.filter(i => i.severity === 'high').length;

  if (criticalIssues > 0) {
    summary += `**${criticalIssues} critical issue(s)** require immediate attention.\n`;
  }
  if (highIssues > 0) {
    summary += `**${highIssues} high-priority issue(s)** should be addressed soon.\n`;
  }

  // Key metrics
  summary += `\n## Key Metrics\n\n`;
  summary += `| Metric | Value |\n`;
  summary += `|--------|-------|\n`;
  summary += `| Total Pages | ${result.metrics.totalPages} |\n`;
  summary += `| Avg Word Count | ${result.metrics.avgWordCount} |\n`;
  summary += `| Avg Internal Links | ${result.metrics.avgInternalLinks} |\n`;
  summary += `| Topical Coverage | ${result.metrics.topicalCoverage}% |\n`;

  // Priority actions
  const priorityRecs = result.recommendations.filter(r => r.priority === 'critical' || r.priority === 'high');
  if (priorityRecs.length > 0) {
    summary += `\n## Priority Actions\n\n`;
    for (const rec of priorityRecs.slice(0, 5)) {
      summary += `### ${rec.title}\n`;
      summary += `${rec.description}\n\n`;
      summary += `**Action:** ${rec.suggestedAction}\n\n`;
    }
  }

  return summary;
}

/**
 * Generate a technical report
 */
export function generateTechnicalReport(result: CorpusAuditResult): string {
  let report = `# Technical Corpus Audit: ${result.domain}\n\n`;
  report += `Generated: ${result.timestamp}\n\n`;

  // Metrics
  report += `## Corpus Metrics\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  for (const [key, value] of Object.entries(result.metrics)) {
    report += `| ${key} | ${value} |\n`;
  }

  // Content overlaps
  if (result.contentOverlaps.length > 0) {
    report += `\n## Content Overlaps (${result.contentOverlaps.length})\n\n`;
    for (const overlap of result.contentOverlaps.slice(0, 10)) {
      report += `- **${overlap.overlapType}** (${overlap.overlapPercentage}%): ${overlap.pageA} ↔ ${overlap.pageB}\n`;
    }
  }

  // Anchor patterns
  if (result.anchorPatterns.length > 0) {
    report += `\n## Anchor Patterns (Top 20)\n\n`;
    report += `| Anchor | Frequency | Generic | Over-Optimized |\n`;
    report += `|--------|-----------|---------|----------------|\n`;
    for (const pattern of result.anchorPatterns.slice(0, 20)) {
      report += `| ${pattern.anchorText} | ${pattern.frequency} | ${pattern.isGeneric ? '⚠️' : '✓'} | ${pattern.isOverOptimized ? '⚠️' : '✓'} |\n`;
    }
  }

  // All issues
  report += `\n## All Issues (${result.issues.length})\n\n`;
  for (const issue of result.issues) {
    report += `### [${issue.severity.toUpperCase()}] ${issue.type}\n`;
    report += `${issue.description}\n`;
    if (issue.details) {
      report += `Details: ${issue.details}\n`;
    }
    if (issue.affectedUrls.length > 0) {
      report += `Affected: ${issue.affectedUrls.slice(0, 5).join(', ')}${issue.affectedUrls.length > 5 ? '...' : ''}\n`;
    }
    report += `\n`;
  }

  return report;
}
