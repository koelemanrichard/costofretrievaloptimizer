/**
 * Phase 1: CE/SC/CSI Extraction
 *
 * Extracts semantic identity from each page:
 * - Central Entity (CE) - what the page is about
 * - Source Context (SC) - the business/monetization context
 * - Central Search Intent (CSI) - the primary user intent
 *
 * Compares page-level extractions to site-level definitions for consistency.
 */

import {
    SemanticExtraction,
    PageSemanticInfo,
    SemanticConsistencyIssue,
    PageTechnicalInfo
} from './types';
import { BusinessInfo } from '../../../types';

// =============================================================================
// MAIN PHASE 1 EXECUTION
// =============================================================================

export async function executePhase1(
    pages: PageTechnicalInfo[],
    businessInfo: BusinessInfo,
    onProgress?: (progress: number, step: string) => void
): Promise<SemanticExtraction> {
    onProgress?.(0, 'Starting semantic extraction');

    // Define site-level CE/SC/CSI from business info
    const siteLevel = extractSiteLevelSemantics(businessInfo);
    onProgress?.(10, 'Site-level semantics defined');

    // Extract page-level semantics
    const pageLevel: PageSemanticInfo[] = [];
    const totalPages = pages.length;

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const progress = 10 + Math.round((i / totalPages) * 70);
        onProgress?.(progress, `Analyzing page ${i + 1}/${totalPages}`);

        const pageSemantics = extractPageSemantics(page, siteLevel);
        pageLevel.push(pageSemantics);
    }

    onProgress?.(85, 'Checking semantic consistency');

    // Check consistency
    const consistency = checkSemanticConsistency(pageLevel, siteLevel);

    onProgress?.(100, 'Semantic extraction complete');

    return {
        siteLevel,
        pageLevel,
        consistency
    };
}

// =============================================================================
// SITE-LEVEL EXTRACTION
// =============================================================================

function extractSiteLevelSemantics(businessInfo: BusinessInfo): {
    centralEntity: string;
    sourceContext: string;
    centralSearchIntent: string;
    confidence: number;
} {
    // CE is typically the seed keyword or main topic
    const centralEntity = businessInfo.seedKeyword || businessInfo.industry || '';

    // SC is the business model / value proposition
    const sourceContext = businessInfo.valueProp || businessInfo.model || '';

    // CSI combines CE + SC into an action-oriented intent
    const centralSearchIntent = deriveCentralSearchIntent(
        centralEntity,
        sourceContext,
        businessInfo.websiteType
    );

    // Confidence based on completeness
    const hasAllFields = centralEntity && sourceContext && centralSearchIntent;
    const confidence = hasAllFields ? 0.9 : 0.6;

    return {
        centralEntity,
        sourceContext,
        centralSearchIntent,
        confidence
    };
}

function deriveCentralSearchIntent(
    ce: string,
    sc: string,
    websiteType?: string
): string {
    // Generate CSI based on website type
    switch (websiteType) {
        case 'ECOMMERCE':
            return `buy ${ce}`;
        case 'SAAS':
            return `${ce} software`;
        case 'SERVICE_B2B':
            return `${ce} services`;
        case 'AFFILIATE_REVIEW':
            return `best ${ce}`;
        case 'INFORMATIONAL':
        default:
            return `learn about ${ce}`;
    }
}

// =============================================================================
// PAGE-LEVEL EXTRACTION
// =============================================================================

function extractPageSemantics(
    page: PageTechnicalInfo,
    siteLevel: { centralEntity: string; sourceContext: string; centralSearchIntent: string }
): PageSemanticInfo {
    const title = page.title || '';
    const url = page.url || '';

    // Extract CE from page title (first major noun phrase)
    const extractedCE = extractCentralEntityFromTitle(title, siteLevel.centralEntity);

    // Extract SC from context clues in URL and title
    const extractedSC = extractSourceContextFromPage(url, title, siteLevel.sourceContext);

    // Derive CSI from page focus
    const extractedCSI = extractSearchIntentFromPage(title, url);

    // Check alignment with site-level
    const matchesSiteCE = calculateSimilarity(extractedCE, siteLevel.centralEntity) > 0.3;
    const matchesSiteSC = calculateSimilarity(extractedSC, siteLevel.sourceContext) > 0.2;

    // Determine segment
    const segment = determinePageSegment(url, title, matchesSiteCE);

    // Calculate confidence
    const confidence = (matchesSiteCE ? 0.4 : 0) + (matchesSiteSC ? 0.3 : 0) + (segment !== 'unknown' ? 0.3 : 0);

    return {
        url,
        title,
        extractedCE,
        extractedSC,
        extractedCSI,
        matchesSiteCE,
        matchesSiteSC,
        confidence,
        segment
    };
}

function extractCentralEntityFromTitle(title: string, siteCE: string): string {
    // Check if site CE appears in title
    if (title.toLowerCase().includes(siteCE.toLowerCase())) {
        return siteCE;
    }

    // Extract first significant phrase (before separator)
    const separators = /[|\-–—:]/;
    const parts = title.split(separators);
    if (parts.length > 0) {
        return parts[0].trim();
    }

    return title.trim();
}

function extractSourceContextFromPage(url: string, title: string, siteSC: string): string {
    // Check URL for commerce indicators
    const commercePatterns = ['shop', 'buy', 'product', 'service', 'pricing', 'store'];
    const infoPatterns = ['blog', 'guide', 'how-to', 'learn', 'what-is', 'article'];

    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    for (const pattern of commercePatterns) {
        if (urlLower.includes(pattern) || titleLower.includes(pattern)) {
            return 'commercial';
        }
    }

    for (const pattern of infoPatterns) {
        if (urlLower.includes(pattern) || titleLower.includes(pattern)) {
            return 'informational';
        }
    }

    // Check if title mentions company/brand indicators
    if (siteSC && (titleLower.includes('our') || titleLower.includes('we '))) {
        return siteSC;
    }

    return 'general';
}

function extractSearchIntentFromPage(title: string, url: string): string {
    const titleLower = title.toLowerCase();
    const urlLower = url.toLowerCase();

    // Transactional
    if (/buy|purchase|order|shop|price|cost/i.test(titleLower)) {
        return 'transactional';
    }

    // Navigational
    if (/login|signup|sign up|account|dashboard/i.test(titleLower)) {
        return 'navigational';
    }

    // Commercial investigation
    if (/best|top|review|comparison|vs|versus|alternative/i.test(titleLower)) {
        return 'commercial';
    }

    // Informational (how-to, guide, what is)
    if (/how to|guide|what is|learn|understand|tutorial/i.test(titleLower)) {
        return 'informational';
    }

    // Default
    return 'informational';
}

function determinePageSegment(
    url: string,
    title: string,
    matchesSiteCE: boolean
): 'core' | 'author' | 'support' | 'unknown' {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    // Support pages
    const supportPatterns = [
        'contact', 'about', 'privacy', 'terms', 'legal', 'faq',
        'help', 'support', 'sitemap', 'disclaimer'
    ];
    for (const pattern of supportPatterns) {
        if (urlLower.includes(pattern)) {
            return 'support';
        }
    }

    // Author section (blog, news, resources)
    const authorPatterns = ['blog', 'news', 'article', 'post', 'resource', 'guide'];
    for (const pattern of authorPatterns) {
        if (urlLower.includes(pattern)) {
            return 'author';
        }
    }

    // Core section (product, service, category pages)
    const corePatterns = ['product', 'service', 'category', 'shop', 'pricing', 'feature'];
    for (const pattern of corePatterns) {
        if (urlLower.includes(pattern)) {
            return 'core';
        }
    }

    // If matches site CE, likely core
    if (matchesSiteCE) {
        return 'core';
    }

    return 'unknown';
}

// =============================================================================
// CONSISTENCY CHECKING
// =============================================================================

function checkSemanticConsistency(
    pageLevel: PageSemanticInfo[],
    siteLevel: { centralEntity: string; sourceContext: string }
): {
    ceConsistency: number;
    scConsistency: number;
    issues: SemanticConsistencyIssue[];
} {
    const issues: SemanticConsistencyIssue[] = [];

    // Calculate CE consistency
    const ceMatches = pageLevel.filter(p => p.matchesSiteCE).length;
    const ceConsistency = pageLevel.length > 0
        ? (ceMatches / pageLevel.length) * 100
        : 100;

    // Calculate SC consistency
    const scMatches = pageLevel.filter(p => p.matchesSiteSC).length;
    const scConsistency = pageLevel.length > 0
        ? (scMatches / pageLevel.length) * 100
        : 100;

    // Identify CE mismatches
    const ceMismatches = pageLevel.filter(p => !p.matchesSiteCE && p.segment !== 'support');
    if (ceMismatches.length > 0) {
        issues.push({
            type: 'ce_mismatch',
            severity: ceMismatches.length > pageLevel.length * 0.3 ? 'high' : 'medium',
            message: `${ceMismatches.length} pages don't align with site central entity "${siteLevel.centralEntity}"`,
            affectedUrls: ceMismatches.map(p => p.url),
            recommendation: 'Review page titles and content to ensure they relate to the site\'s central entity'
        });
    }

    // Identify orphan pages (unknown segment, low confidence)
    const orphans = pageLevel.filter(p => p.segment === 'unknown' && p.confidence < 0.5);
    if (orphans.length > 0) {
        issues.push({
            type: 'orphan_page',
            severity: orphans.length > 5 ? 'medium' : 'low',
            message: `${orphans.length} pages have unclear semantic identity`,
            affectedUrls: orphans.map(p => p.url),
            recommendation: 'Clarify the purpose and topic of these pages or consider consolidating'
        });
    }

    // Check for conflicting CSIs (multiple pages targeting same intent)
    const csiGroups = new Map<string, PageSemanticInfo[]>();
    pageLevel.forEach(p => {
        const key = `${p.extractedCE}-${p.extractedCSI}`;
        const existing = csiGroups.get(key) || [];
        existing.push(p);
        csiGroups.set(key, existing);
    });

    const conflicts = Array.from(csiGroups.entries())
        .filter(([, pages]) => pages.length > 2)
        .filter(([key]) => !key.includes('support'));

    if (conflicts.length > 0) {
        issues.push({
            type: 'csi_conflict',
            severity: 'medium',
            message: `${conflicts.length} topic clusters have potential keyword cannibalization`,
            affectedUrls: conflicts.flatMap(([, pages]) => pages.map(p => p.url)),
            recommendation: 'Review pages targeting the same topic/intent for consolidation opportunities'
        });
    }

    return {
        ceConsistency,
        scConsistency,
        issues
    };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function calculateSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;

    const aWords = new Set(a.toLowerCase().split(/\s+/));
    const bWords = new Set(b.toLowerCase().split(/\s+/));

    let intersection = 0;
    aWords.forEach(word => {
        if (bWords.has(word)) intersection++;
    });

    const union = aWords.size + bWords.size - intersection;
    return union > 0 ? intersection / union : 0;
}
