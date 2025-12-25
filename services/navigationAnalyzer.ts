/**
 * Navigation Analyzer Service
 *
 * Analyzes website navigation patterns to detect dynamic vs static navigation.
 * Dynamic navigation is a Semantic SEO best practice for maintaining contextual relevance.
 *
 * Research Source: linking in website.md
 *
 * Quote: "Gebruik Dynamic Headers en Footers om links te wijzigen op basis van
 * de huidige contextuele sectie van de gebruiker. Statische mega-menu's die
 * naar elke categorie linken, ongeacht de context = FOUT."
 */

import {
  NavigationAnalysis,
  HeaderAnalysis,
  FooterAnalysis,
  SidebarAnalysis,
  NavigationIssue,
} from '../types/competitiveIntelligence';

// =============================================================================
// Types
// =============================================================================

/**
 * Extracted link from HTML
 */
export interface ExtractedLink {
  href: string;
  text: string;
  isInternal: boolean;
}

/**
 * Navigation section (header, footer, sidebar)
 */
export interface NavigationSection {
  html: string;
  links: ExtractedLink[];
}

// =============================================================================
// HTML Parsing Helpers
// =============================================================================

/**
 * Extract domain from URL for internal link detection
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Check if a link is internal
 */
function isInternalLink(href: string, pageDomain: string): boolean {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
    return false;
  }

  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
    return true;
  }

  try {
    const linkDomain = extractDomain(href);
    return linkDomain === pageDomain || linkDomain === '';
  } catch {
    return false;
  }
}

/**
 * Extract all links from HTML section
 */
function extractLinksFromHtml(html: string, pageDomain: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();

    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({
        href,
        text,
        isInternal: isInternalLink(href, pageDomain),
      });
    }
  }

  return links;
}

/**
 * Extract header section from HTML
 */
function extractHeader(html: string): string {
  // Try semantic header first
  const headerMatch = html.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
  if (headerMatch) return headerMatch[0];

  // Try common header patterns
  const patterns = [
    /<nav[^>]*class=["'][^"']*(?:main|primary|top|header)[^"']*["'][^>]*>[\s\S]*?<\/nav>/i,
    /<div[^>]*(?:id|class)=["'][^"']*(?:header|navbar|navigation|menu)[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[0];
  }

  return '';
}

/**
 * Extract footer section from HTML
 */
function extractFooter(html: string): string {
  // Try semantic footer first
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  if (footerMatch) return footerMatch[0];

  // Try common footer patterns
  const patterns = [
    /<div[^>]*(?:id|class)=["'][^"']*footer[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[0];
  }

  return '';
}

/**
 * Extract sidebar section from HTML
 */
function extractSidebar(html: string): string {
  // Try semantic aside first
  const asideMatch = html.match(/<aside[^>]*>([\s\S]*?)<\/aside>/i);
  if (asideMatch) return asideMatch[0];

  // Try common sidebar patterns
  const patterns = [
    /<div[^>]*(?:id|class)=["'][^"']*sidebar[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
    /<div[^>]*(?:id|class)=["'][^"']*(?:side-nav|sidenav|side-menu)[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[0];
  }

  return '';
}

// =============================================================================
// Navigation Type Detection
// =============================================================================

/**
 * Detect if navigation is likely dynamic or static
 *
 * Signals for dynamic navigation:
 * - Low link count (< 15)
 * - Links contextually relevant to page
 * - Different links on different pages (requires comparison)
 *
 * Signals for static navigation:
 * - High link count (50+, mega-menu)
 * - Same links across all pages
 * - Low contextual relevance
 */
function detectNavigationType(
  links: ExtractedLink[],
  pageContext: string,
  otherPageLinks?: ExtractedLink[][]
): {
  isDynamic: 'likely_dynamic' | 'likely_static' | 'unknown';
  dynamicSignals: string[];
  staticSignals: string[];
} {
  const dynamicSignals: string[] = [];
  const staticSignals: string[] = [];

  // Check 1: Link count
  if (links.length > 50) {
    staticSignals.push(`High link count (${links.length}) suggests mega-menu`);
  } else if (links.length < 15) {
    dynamicSignals.push(`Low link count (${links.length}) suggests curated/dynamic`);
  }

  // Check 2: Contextual relevance
  const contextWords = pageContext.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const relevantLinks = links.filter(link => {
    const linkText = link.text.toLowerCase();
    return contextWords.some(word => linkText.includes(word));
  });

  const relevanceRatio = links.length > 0 ? relevantLinks.length / links.length : 0;

  if (relevanceRatio > 0.5) {
    dynamicSignals.push(`High contextual relevance (${Math.round(relevanceRatio * 100)}% of links relevant)`);
  } else if (relevanceRatio < 0.2) {
    staticSignals.push(`Low contextual relevance (${Math.round(relevanceRatio * 100)}% relevant)`);
  }

  // Check 3: Compare with other pages if available
  if (otherPageLinks && otherPageLinks.length > 0) {
    const currentHrefs = new Set(links.map(l => l.href));

    let matchingPages = 0;
    for (const otherLinks of otherPageLinks) {
      const otherHrefs = new Set(otherLinks.map(l => l.href));
      const overlap = [...currentHrefs].filter(h => otherHrefs.has(h)).length;
      const similarity = overlap / Math.max(currentHrefs.size, otherHrefs.size);

      if (similarity > 0.9) matchingPages++;
    }

    if (matchingPages === otherPageLinks.length) {
      staticSignals.push('Navigation identical across sampled pages');
    } else {
      dynamicSignals.push('Navigation varies across pages');
    }
  }

  // Determine type
  let isDynamic: 'likely_dynamic' | 'likely_static' | 'unknown';

  if (dynamicSignals.length > staticSignals.length) {
    isDynamic = 'likely_dynamic';
  } else if (staticSignals.length > dynamicSignals.length) {
    isDynamic = 'likely_static';
  } else {
    isDynamic = 'unknown';
  }

  return { isDynamic, dynamicSignals, staticSignals };
}

/**
 * Detect if header is a mega-menu
 */
function isMegaMenu(headerHtml: string, links: ExtractedLink[]): boolean {
  // High link count
  if (links.length > 50) return true;

  // Check for mega-menu class patterns
  const megaMenuPatterns = [
    /class=["'][^"']*mega[^"']*["']/i,
    /class=["'][^"']*dropdown[^"']*["']/i,
    /class=["'][^"']*submenu[^"']*["']/i,
  ];

  return megaMenuPatterns.some(p => p.test(headerHtml));
}

/**
 * Count mega-menu categories
 */
function countMegaMenuCategories(headerHtml: string): number {
  // Count top-level nav items
  const topLevelPatterns = [
    /<li[^>]*class=["'][^"']*(?:menu-item|nav-item|dropdown)[^"']*["'][^>]*>/gi,
    /<a[^>]*class=["'][^"']*(?:nav-link|menu-link|dropdown-toggle)[^"']*["'][^>]*>/gi,
  ];

  let maxCount = 0;
  for (const pattern of topLevelPatterns) {
    const matches = headerHtml.match(pattern);
    if (matches && matches.length > maxCount) {
      maxCount = matches.length;
    }
  }

  return maxCount;
}

// =============================================================================
// Footer Analysis
// =============================================================================

/**
 * Check for corporate links in footer
 */
function detectCorporateLinks(footerHtml: string, links: ExtractedLink[]): FooterAnalysis['hasCorporateLinks'] {
  const lowerFooter = footerHtml.toLowerCase();
  const linkTexts = links.map(l => l.text.toLowerCase());

  return {
    aboutUs: linkTexts.some(t => t.includes('about')) ||
             lowerFooter.includes('about us') ||
             lowerFooter.includes('over ons'),

    privacyPolicy: linkTexts.some(t => t.includes('privacy')) ||
                   lowerFooter.includes('privacy policy') ||
                   lowerFooter.includes('privacybeleid'),

    termsOfService: linkTexts.some(t => t.includes('terms') || t.includes('conditions')) ||
                    lowerFooter.includes('terms of service') ||
                    lowerFooter.includes('terms and conditions') ||
                    lowerFooter.includes('algemene voorwaarden'),

    contact: linkTexts.some(t => t.includes('contact')) ||
             lowerFooter.includes('contact us') ||
             lowerFooter.includes('contact'),
  };
}

// =============================================================================
// Sidebar Analysis
// =============================================================================

/**
 * Analyze sidebar for contextual relevance
 */
function analyzeSidebarRelevance(
  links: ExtractedLink[],
  pageContext: string
): { linksRelevantToPage: number; relevanceScore: number } {
  if (links.length === 0) {
    return { linksRelevantToPage: 0, relevanceScore: 0 };
  }

  const contextWords = pageContext.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  const relevantLinks = links.filter(link => {
    const linkText = link.text.toLowerCase();
    return contextWords.some(word => linkText.includes(word));
  });

  return {
    linksRelevantToPage: relevantLinks.length,
    relevanceScore: Math.round((relevantLinks.length / links.length) * 100),
  };
}

// =============================================================================
// Issue Detection
// =============================================================================

/**
 * Identify navigation issues
 */
function identifyNavigationIssues(
  header: HeaderAnalysis,
  footer: FooterAnalysis,
  sidebar: SidebarAnalysis
): NavigationIssue[] {
  const issues: NavigationIssue[] = [];

  // Mega-menu dilution
  if (header.isMegaMenu) {
    issues.push({
      issue: 'mega_menu_dilution',
      severity: 'warning',
      description: `Large mega-menu with ${header.megaMenuCategories} categories may dilute PageRank`,
      recommendation: 'Consider dynamic navigation that shows only contextually relevant links',
    });
  }

  // Static navigation
  if (header.isDynamic === 'likely_static' && header.linkCount > 20) {
    issues.push({
      issue: 'static_footer',
      severity: 'info',
      description: 'Header appears to be static across pages',
      recommendation: 'Implement dynamic headers that change based on current section',
    });
  }

  // Irrelevant sidebar
  if (sidebar.present && sidebar.relevanceScore < 30) {
    issues.push({
      issue: 'irrelevant_sidebar',
      severity: 'warning',
      description: `Sidebar has low contextual relevance (${sidebar.relevanceScore}%)`,
      recommendation: 'Make sidebar content contextually relevant to current page topic',
    });
  }

  // Missing corporate links
  const corporateLinks = footer.hasCorporateLinks;
  const missingCorporate = !corporateLinks.aboutUs || !corporateLinks.privacyPolicy ||
                           !corporateLinks.termsOfService || !corporateLinks.contact;

  if (missingCorporate) {
    const missing = [];
    if (!corporateLinks.aboutUs) missing.push('About');
    if (!corporateLinks.privacyPolicy) missing.push('Privacy');
    if (!corporateLinks.termsOfService) missing.push('Terms');
    if (!corporateLinks.contact) missing.push('Contact');

    issues.push({
      issue: 'missing_corporate',
      severity: 'info',
      description: `Missing corporate links: ${missing.join(', ')}`,
      recommendation: 'Add standard corporate links to footer for trust signals',
    });
  }

  return issues;
}

/**
 * Calculate overall navigation score
 */
function calculateNavigationScore(
  header: HeaderAnalysis,
  footer: FooterAnalysis,
  sidebar: SidebarAnalysis
): number {
  let score = 50; // Start neutral

  // Header scoring
  if (header.isDynamic === 'likely_dynamic') {
    score += 20;
  } else if (header.isDynamic === 'likely_static') {
    score -= 10;
  }

  if (header.isMegaMenu) {
    score -= 15;
  }

  // Footer scoring
  const corporateLinks = footer.hasCorporateLinks;
  const corporateCount = [
    corporateLinks.aboutUs,
    corporateLinks.privacyPolicy,
    corporateLinks.termsOfService,
    corporateLinks.contact,
  ].filter(Boolean).length;
  score += corporateCount * 5;

  // Sidebar scoring
  if (sidebar.present) {
    if (sidebar.relevanceScore >= 70) {
      score += 15;
    } else if (sidebar.relevanceScore >= 40) {
      score += 5;
    } else {
      score -= 5;
    }
  }

  return Math.min(100, Math.max(0, score));
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Perform complete navigation analysis on HTML content
 */
export function analyzeNavigation(
  html: string,
  pageUrl: string,
  pageContext: string = '',
  otherPagesHtml?: string[]
): NavigationAnalysis {
  const pageDomain = extractDomain(pageUrl);

  // Extract navigation sections
  const headerHtml = extractHeader(html);
  const footerHtml = extractFooter(html);
  const sidebarHtml = extractSidebar(html);

  // Extract links
  const headerLinks = extractLinksFromHtml(headerHtml, pageDomain);
  const footerLinks = extractLinksFromHtml(footerHtml, pageDomain);
  const sidebarLinks = extractLinksFromHtml(sidebarHtml, pageDomain);

  // Get links from other pages for comparison
  const otherPageHeaderLinks = otherPagesHtml?.map(h => {
    const header = extractHeader(h);
    return extractLinksFromHtml(header, pageDomain);
  });

  // Analyze header
  const headerType = detectNavigationType(headerLinks, pageContext, otherPageHeaderLinks);
  const header: HeaderAnalysis = {
    linkCount: headerLinks.length,
    isDynamic: headerType.isDynamic,
    dynamicSignals: headerType.dynamicSignals,
    staticSignals: headerType.staticSignals,
    isMegaMenu: isMegaMenu(headerHtml, headerLinks),
    megaMenuCategories: countMegaMenuCategories(headerHtml),
  };

  // Analyze footer
  const footerType = detectNavigationType(footerLinks, pageContext);
  const footer: FooterAnalysis = {
    linkCount: footerLinks.length,
    isDynamic: footerType.isDynamic,
    dynamicSignals: footerType.dynamicSignals,
    staticSignals: footerType.staticSignals,
    hasCorporateLinks: detectCorporateLinks(footerHtml, footerLinks),
  };

  // Analyze sidebar
  const sidebarRelevance = analyzeSidebarRelevance(sidebarLinks, pageContext);
  const sidebarType = detectNavigationType(sidebarLinks, pageContext);
  const sidebar: SidebarAnalysis = {
    present: sidebarHtml.length > 0,
    linkCount: sidebarLinks.length,
    isDynamic: sidebarType.isDynamic,
    linksRelevantToPage: sidebarRelevance.linksRelevantToPage,
    relevanceScore: sidebarRelevance.relevanceScore,
  };

  // Identify issues
  const issues = identifyNavigationIssues(header, footer, sidebar);

  // Calculate score
  const navigationScore = calculateNavigationScore(header, footer, sidebar);

  return {
    header,
    footer,
    sidebar,
    navigationScore,
    issues,
  };
}

/**
 * Quick check if navigation is optimized
 */
export function isNavigationOptimized(html: string, pageUrl: string): boolean {
  const analysis = analyzeNavigation(html, pageUrl);
  return analysis.navigationScore >= 60 && analysis.issues.filter(i => i.severity === 'critical').length === 0;
}

// =============================================================================
// Export
// =============================================================================

export default {
  analyzeNavigation,
  isNavigationOptimized,
  extractHeader,
  extractFooter,
  extractSidebar,
  extractLinksFromHtml,
};
