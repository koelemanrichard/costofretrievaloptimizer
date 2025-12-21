# Comprehensive Webpage Audit System

This document describes the enhanced audit system features implemented as part of Phase 1-3 of the Comprehensive Webpage Audit System plan.

## Table of Contents

1. [Overview](#overview)
2. [New Services](#new-services)
3. [New Components](#new-components)
4. [Enhanced Audit Checks](#enhanced-audit-checks)
5. [Export Enhancements](#export-enhancements)
6. [Usage Guide](#usage-guide)
7. [API Reference](#api-reference)

---

## Overview

The Comprehensive Webpage Audit System extends the existing audit infrastructure with:

- **E-A-T Scanner** - Validates entity authority through Wikipedia, Wikidata, and Google Knowledge Graph
- **Corpus Audit** - Site-wide content analysis for patterns, duplicates, and semantic coverage
- **Enhanced Semantic Checks** - 8 new content-level audit rules for LLM optimization
- **Improved Metrics** - Semantic compliance scoring, authority indicators, and action roadmaps
- **Rich Exports** - Enhanced XLSX, HTML, and PDF reports with new metrics

---

## New Services

### 1. Mention Scanner (`services/ai/mentionScanner.ts`)

Analyzes entity authority and E-A-T (Expertise, Authority, Trust) signals.

**Features:**
- Entity identity validation via Wikipedia, Wikidata, Knowledge Graph APIs
- Reputation signal analysis from reviews, news, and social mentions
- Entity co-occurrence detection for topical associations
- E-A-T breakdown scoring with weighted factors
- Actionable recommendations generation

**Usage:**
```typescript
import { runMentionScanner } from './services/ai/mentionScanner';

const result = await runMentionScanner(
  {
    entityName: 'Your Brand',
    domain: 'yourdomain.com',
    industry: 'Technology',
    language: 'en',
    includeReviews: true,
    includeSocialMentions: true,
    includeNewsArticles: true,
  },
  businessInfo,
  (progress) => console.log(progress)
);
```

**Output:**
- `entityAuthority` - Wikipedia, Wikidata, Knowledge Graph presence
- `reputationSignals` - Sources mentioning the entity with sentiment
- `coOccurrences` - Related entities found in the same contexts
- `eatBreakdown` - Expertise, Authority, Trust scores with signals
- `recommendations` - Prioritized actions to improve E-A-T

### 2. Corpus Audit (`services/ai/corpusAudit.ts`)

Site-wide content audit for patterns and optimization opportunities.

**Features:**
- Page discovery from sitemaps
- Content overlap/duplicate detection
- Anchor text pattern analysis
- Semantic coverage calculation against target EAVs
- Issue identification with recommendations

**Usage:**
```typescript
import { runCorpusAudit } from './services/ai/corpusAudit';

const result = await runCorpusAudit(
  {
    domain: 'yourdomain.com',
    sitemapUrl: 'https://yourdomain.com/sitemap.xml',
    pageLimit: 100,
    checkOverlap: true,
    checkAnchors: true,
    targetEAVs: semanticTriples,
  },
  (progress) => console.log(progress)
);
```

### 3. Query Network Audit (`services/ai/queryNetworkAudit.ts`)

Analyzes search intent and competitive positioning.

**Features:**
- Query network generation from seed keywords
- Intent classification (informational, commercial, navigational)
- Competitor EAV extraction from SERP results
- Content gap analysis
- Question generation for Featured Snippet optimization

---

## New Components

### 1. Mention Scanner Dashboard (`components/MentionScannerDashboard.tsx`)

Full-featured UI for E-A-T scanning with:
- Configuration form for entity/domain input
- Real-time progress display
- Tabbed results (Overview, E-A-T Breakdown, Reputation, Recommendations)
- Export to Markdown/JSON

**Access:** Dashboard > Advanced Analysis > E-A-T Scanner button

### 2. Corpus Audit Report (`components/CorpusAuditReport.tsx`)

Comprehensive UI for site-wide audits with:
- Configuration panel for audit options
- Progress tracking with phase indicators
- Results display with filtering
- Overlap detection visualization
- Anchor pattern analysis

**Access:** Dashboard > Advanced Analysis > Corpus Audit button

### 3. Enhanced Metrics Dashboard (`components/dashboard/EnhancedMetricsDashboard.tsx`)

Visual dashboard for semantic compliance and authority metrics:
- Score gauges with targets
- EAV category/classification distribution charts
- Authority indicators cards
- Recommendation list
- Prioritized action roadmap

---

## Enhanced Audit Checks

### New Semantic Compliance Rules (`services/ai/auditHelpers.ts`)

| Rule | Description | Parameters |
|------|-------------|------------|
| `checkFeaturedSnippetCompliance` | Validates answer length for Featured Snippets | text |
| `checkModalityCompliance` | Detects hedging language (can, might, should) | text |
| `checkIRZoneContent` | Ensures key terms in first 400 chars | text, keyTerms |
| `checkDiscourseIntegration` | Measures topic repetition across paragraphs | text, primaryTopic |
| `checkEAVDensity` | Validates EAV declaration coverage | text, expectedEAVs |
| `checkPredicateConsistency` | Detects inconsistent verb usage | text |
| `checkInformationDensity` | Calculates facts-per-sentence ratio | text |

### Enhanced Unified Audit (`services/ai/unifiedAudit.ts`)

New semantic consistency checks added:
- **EAV Density Check** - At least 3 EAVs per topic
- **Missing Categories** - UNIQUE, ROOT, RARE, COMMON coverage
- **Predicate Diversity** - TYPE, COMPONENT, BENEFIT, RISK, PROCESS, SPECIFICATION usage

### New Audit Rules (`config/auditRules.ts`)

```javascript
semantic-low-eav-density      // Topics should have 3+ EAVs
semantic-missing-categories   // All 4 categories should be present
semantic-predicate-diversity  // 3+ predicate types recommended
semantic-orphan-eavs          // EAVs should link to topics
```

---

## Export Enhancements

### XLSX Export (`utils/exportUtils.ts`)

New tabs added to master export:
- **Audit Metrics** - Semantic compliance scores, authority indicators
- **Category Distribution** - EAV category breakdown with percentages
- **Classification Dist** - Predicate type analysis
- **Recommendations** - Prioritized optimization actions
- **Audit Summary** - Unified audit overview (if available)
- **Audit Categories** - Category-by-category breakdown
- **Audit Issues** - All issues with severity and remediation

### HTML/PDF Export (`services/pdfExportService.ts`)

New functions:
- `generateEnhancedMetricsHtmlReport()` - Standalone HTML report generator
- `exportEnhancedMetricsToHtml()` - Download enhanced metrics as HTML file

---

## Usage Guide

### Running an E-A-T Scan

1. Navigate to the Dashboard
2. Click "E-A-T Scanner" in the Advanced Analysis panel
3. Enter entity name (company/brand name)
4. Configure options (reviews, social mentions, news)
5. Click "Run Scan"
6. Review results across tabs
7. Export as Markdown or JSON

### Running a Corpus Audit

1. Navigate to the Dashboard
2. Click "Corpus Audit" in the Advanced Analysis panel
3. Enter domain and sitemap URL
4. Set page limit (recommended: 50-100 for first audit)
5. Enable/disable overlap and anchor checks
6. Click "Start Audit"
7. Review pages, overlaps, anchor patterns
8. Export results

### Viewing Enhanced Metrics

Enhanced metrics are automatically calculated when EAVs exist:
1. Ensure EAVs are defined (via EAV Discovery wizard)
2. Metrics appear in the Enhanced Metrics Dashboard
3. Export via XLSX or HTML for reporting

### Exporting Reports with New Metrics

**XLSX Export:**
```typescript
import { generateMasterExport } from './utils/exportUtils';

generateMasterExport({
  topics,
  briefs,
  pillars,
  eavs,
  unifiedAuditResult, // Include for audit tabs
}, 'xlsx', 'audit-report');
```

**HTML Report:**
```typescript
import { exportEnhancedMetricsToHtml } from './services/pdfExportService';

exportEnhancedMetricsToHtml({
  projectName: 'My Project',
  semanticCompliance,
  authorityIndicators,
  topicCount: topics.length,
  actionRoadmap,
}, 'enhanced-audit-report');
```

---

## API Reference

### Types

```typescript
// Mention Scanner
interface MentionScannerConfig {
  entityName: string;
  domain: string;
  industry?: string;
  language?: string;
  includeReviews?: boolean;
  includeSocialMentions?: boolean;
  includeNewsArticles?: boolean;
}

interface MentionScannerResult {
  entityName: string;
  entityAuthority: EntityAuthorityResult;
  reputationSignals: ReputationSignal[];
  coOccurrences: EntityCoOccurrence[];
  eatBreakdown: EATBreakdown;
  overallSentiment: 'positive' | 'negative' | 'mixed' | 'neutral';
  recommendations: Recommendation[];
  timestamp: string;
}

// Corpus Audit
interface CorpusAuditConfig {
  domain: string;
  sitemapUrl?: string;
  pageLimit?: number;
  checkOverlap?: boolean;
  checkAnchors?: boolean;
  targetEAVs?: SemanticTriple[];
}

interface CorpusAuditResult {
  domain: string;
  pages: CorpusPage[];
  overlaps: ContentOverlap[];
  anchorPatterns: AnchorTextPattern[];
  semanticCoverage: {
    covered: SemanticTriple[];
    missing: SemanticTriple[];
    coveragePercentage: number;
  };
  metrics: CorpusMetrics;
  issues: CorpusIssue[];
  timestamp: string;
}

// Enhanced Metrics
interface EnhancedAuditMetrics {
  semanticCompliance: {
    score: number;
    target: number;
    eavCoverage: number;
    categoryDistribution: Record<string, number>;
    classificationDistribution: Record<string, number>;
    recommendations: string[];
  };
  authorityIndicators: {
    eavAuthorityScore: number;
    uniqueEavCount: number;
    rootEavCount: number;
    rareEavCount: number;
    commonEavCount: number;
    topicalDepthScore: number;
  };
  informationDensity: {
    avgFactsPerSection: number;
    targetFactsPerSection: number;
  };
  actionRoadmap: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    action: string;
    impact: string;
  }>;
}
```

### Functions

```typescript
// Mention Scanner
runMentionScanner(config, businessInfo, onProgress): Promise<MentionScannerResult>
generateBusinessSummary(result): string
generateTechnicalReport(result): string

// Corpus Audit
runCorpusAudit(config, onProgress): Promise<CorpusAuditResult>

// Enhanced Metrics
calculateSemanticComplianceMetrics(eavs): SemanticComplianceMetrics
calculateAuthorityIndicators(eavs, topicCount): AuthorityIndicators
generateEnhancedMetrics(eavs, topicCount, issues): EnhancedAuditMetrics
generateActionRoadmap(semanticMetrics, authorityIndicators, issues): ActionRoadmap

// Audit Helpers
checkFeaturedSnippetCompliance(text): AuditRuleResult
checkModalityCompliance(text): AuditRuleResult
checkIRZoneContent(text, keyTerms): AuditRuleResult
checkDiscourseIntegration(text, primaryTopic): AuditRuleResult
checkEAVDensity(text, expectedEAVs): AuditRuleResult
checkPredicateConsistency(text): AuditRuleResult
checkInformationDensity(text): AuditRuleResult

// Exports
generateMasterExport(input, format, filename): void
generateFullZipExport(input, filename): Promise<void>
exportEnhancedMetricsToHtml(data, filename): void
generateEnhancedMetricsHtmlReport(data): string
```

---

## Best Practices

### Semantic Compliance

1. **Target Score: 85%** - Aim for comprehensive EAV coverage
2. **EAV Density: 3+ per topic** - Ensure each topic has sufficient semantic triples
3. **Category Balance** - Include UNIQUE and ROOT EAVs for authority
4. **Predicate Diversity** - Use at least 3 different classification types

### E-A-T Optimization

1. **Wikipedia Presence** - Create/update Wikipedia article for your entity
2. **Knowledge Graph** - Implement comprehensive Schema.org markup
3. **Reviews** - Build presence on review platforms in your industry
4. **Co-occurrences** - Associate your brand with authoritative entities

### Content Audit

1. **Regular Audits** - Run corpus audits quarterly
2. **Overlap Detection** - Address content cannibalization early
3. **Anchor Diversity** - Avoid repetitive anchor text patterns
4. **Gap Analysis** - Use semantic coverage to identify missing content

---

## Changelog

### v2.0.0 (Phase 1-3 Complete)

- Added E-A-T Scanner service and dashboard
- Added Corpus Audit service and report component
- Added Query Network Audit service
- Enhanced auditHelpers with 8 new semantic checks
- Enhanced unified audit with EAV density and category checks
- Added enhanced metrics dashboard component
- Added XLSX export tabs for audit metrics
- Added HTML report generator for enhanced metrics
- Created comprehensive documentation
