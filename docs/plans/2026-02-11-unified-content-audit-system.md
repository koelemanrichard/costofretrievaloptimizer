# Unified Content Audit System — Architecture & Implementation Brainstorm

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify 16+ existing audit subsystems into one cohesive, multilingual content audit experience with external URL support, fact validation, performance tracking, GSC/GA4 integration, and exportable results.

**Architecture:** Facade-based unification over existing audit services (no rewrite). A new `UnifiedAuditOrchestrator` coordinates existing services, adds missing capabilities (fact validation, external URL discovery, GSC API, GA4 API), and feeds a single `ComprehensiveAuditDashboard` UI.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL + Edge Functions), Vitest, Playwright, TailwindCSS, Recharts

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Gap Analysis Against Requirements](#2-gap-analysis-against-requirements)
3. [Unified Architecture](#3-unified-architecture)
4. [User Flows](#4-user-flows)
5. [Implementation Sprints](#5-implementation-sprints)
6. [UX/UI Specifications](#6-uxui-specifications)
7. [Testing Strategy](#7-testing-strategy)
8. [Data Model](#8-data-model)
9. [Export System](#9-export-system)
10. [Performance Tracking](#10-performance-tracking)

---

## 1. Current State Analysis

### 1.1 Existing Audit Systems (16 subsystems)

| # | System | Service File | UI Component | Status |
|---|--------|-------------|--------------|--------|
| 1 | **Unified Audit** (6-category topical map) | `services/ai/unifiedAudit.ts` | `ComprehensiveAuditDashboard.tsx` | Working |
| 2 | **Pass 8 Content Audit** (35 algorithmic checks) | `services/ai/contentGeneration/passes/auditChecks.ts` | `AuditIssuesPanel.tsx` | Working |
| 3 | **Linking Audit** (4-pass) | `services/ai/linkingAudit.ts` | `LinkingAuditDashboard.tsx` | Working |
| 4 | **EAV Audit** (consistency + grading) | `services/ai/eavAudit.ts` | `EavCompletenessCard.tsx` | Working |
| 5 | **Site Analysis V2** (5-phase page audit) | `services/siteAnalysisServiceV2.ts` | `AuditDashboardV2.tsx`, `PageAuditDetailV2.tsx` | Working |
| 6 | **Query Network Audit** (competitive gaps) | `services/ai/queryNetworkAudit.ts` | `QueryNetworkAudit.tsx` | Working |
| 7 | **Corpus Audit** (site-wide) | `services/ai/corpusAudit.ts` | `CorpusAuditReport.tsx` | Partial |
| 8 | **Content Validation** (rules engine) | `services/ai/contentValidation.ts` | `ContentValidationPanel.tsx` | Working |
| 9 | **Flow Validator** (discourse coherence) | `services/ai/flowValidator.ts` | inline in drafting | Working |
| 10 | **Quality Rules** (113+ rules) | `config/qualityRulesRegistry.ts` | `QualityRulePanel.tsx` | Working |
| 11 | **E-A-T Scanner** | `services/ai/eatScanner.ts` | `EATScannerCard.tsx` | Working |
| 12 | **Schema Validator** (JSON-LD) | `services/ai/contentGeneration/schemaGeneration/validator.ts` | inline in Pass 9 | Working |
| 13 | **Visual Semantics Validator** | `services/ai/contentGeneration/passes/pass4VisualSemantics.ts` | inline in Pass 4 | Working |
| 14 | **Hreflang Validator** | `services/ai/hreflangValidator.ts` | inline | Working |
| 15 | **Alt Text Validator** | `services/ai/altTextValidator.ts` | inline | Working |
| 16 | **Central Entity Analyzer** | `services/ai/centralEntityAnalyzer.ts` | inline | Working |

### 1.2 Existing Entry Points

| Entry Point | Location | What It Audits |
|------------|----------|---------------|
| Dashboard "Audit" button | `AnalysisToolsPanel.tsx` | Topical map (unified audit) |
| Dashboard "Linking Audit" button | `AnalysisToolsPanel.tsx` | Internal linking structure |
| Dashboard "Quality" button | `AnalysisToolsPanel.tsx` | 113+ quality rules |
| Dashboard "Authority" button | `AnalysisToolsPanel.tsx` | Topical authority score |
| Dashboard "E-A-T Scanner" | `AnalysisToolsPanel.tsx` | E-A-T compliance |
| Dashboard "Gap Analysis" button | `AnalysisToolsPanel.tsx` | Competitor gaps |
| Dashboard "Corpus Audit" button | `AnalysisToolsPanel.tsx` | Site-wide content |
| `/audit` page | Route | Site analysis V2 |
| `/insights` page | Route | Performance insights |
| `/quality` page | Route | Quality rules |
| `/gap-analysis` page | Route | Query network |
| Content drafting panel | `AuditIssuesPanel.tsx` | Pass 8 checks on draft |
| Topic context menu | Topic cards | Per-topic audit |
| Migration workbench | URL list | Click-to-audit |

### 1.3 Existing Scoring Systems

| System | Scale | Thresholds |
|--------|-------|-----------|
| Unified Audit | 0-100 | >=80 green, >=60 yellow, >=40 orange, <40 red |
| EAV Audit | A-F grade | A: >=95, B: >=90, C: >=80, D: >=70, E: >=60, F: <60 |
| Page Audit V2 | 0-100 per phase | Same color coding as unified |
| Pass 8 Content Audit | 0-100 | Per-check pass/fail |
| Linking Audit | 0-100 | Pass/issues/failed per pass |
| Quality Rules | 113 binary checks | Pass/fail per rule |
| Authority | 0-100 | AI-scored |

### 1.4 Existing Database Tables

| Table | Purpose |
|-------|---------|
| `audit_results` | Unified audit snapshots |
| `linking_audit_results` | Linking audit results |
| `query_network_audits` | Competitive gap data |
| `eat_scanner_audits` | E-A-T scan results |
| `corpus_audits` | Site-wide analysis |
| `enhanced_metrics_snapshots` | Performance metrics over time |
| `content_generation_jobs` | Stores Pass 8 audit scores |

### 1.5 Existing Export Capabilities

| Format | Supported | Source |
|--------|-----------|--------|
| CSV | Yes | `enhancedExportUtils.ts` |
| XLSX | Yes | `enhancedExportUtils.ts` |
| HTML | Yes | `reportExportService.ts` |
| PDF | Yes | `reportExportService.ts` |
| ZIP (multi-file) | Yes | `enhancedExportUtils.ts` |

---

## 2. Gap Analysis Against Requirements

| # | Requirement | Current State | Gap | Priority |
|---|------------|---------------|-----|----------|
| 1 | Audit app-generated content | Pass 8 + unified audit exist but are disconnected | **Connect**: route all app content through unified flow | HIGH |
| 2 | Referenced content awareness (bridges, links) | Linking audit has bridge detection, but not connected to content audit | **Wire**: feed linking data into content audit context | MEDIUM |
| 3 | External URL auditing | Site Analysis V2 uses Jina for external pages | **Enhance**: add user-configurable scraping (Jina/Firecrawl/Apify), ensure both semantic + HTML extraction | HIGH |
| 4 | Related URL discovery on target site | Not implemented | **BUILD**: sitemap/crawl discovery, present related URLs, let user select | HIGH |
| 5 | Click-to-audit from published URLs | Partially in migration workbench | **Extend**: add audit button to all URL displays (published, migration, performance) | MEDIUM |
| 6 | Clear visual results (good vs improvement) | Color coding exists but inconsistent across dashboards | **Unify**: single visual language, score cards, progress indicators | HIGH |
| 7 | AI improvement suggestions with examples | Auto-fix exists for some checks, but suggestions lack context | **Enhance**: add "why wrong", "example fix", "impact" to every finding | HIGH |
| 8 | 3-pillar prerequisite | Not enforced at audit entry | **ADD**: gate check — business info + pillars + EAVs must be defined | LOW |
| 9 | Critical 80%+ philosophy | Scoring exists but no messaging about expectations | **ADD**: onboarding copy, score interpretation guide | LOW |
| 10 | Online research + knowledge base + internal data | Query network audit does SERP research; internal data used in unified audit | **Enhance**: combine SERP + internal knowledge graph + EAVs in single context | MEDIUM |
| 11 | Fact validation | **NOT IMPLEMENTED** | **BUILD**: claim extraction + source verification service | HIGH |
| 12 | Export (CSV, Excel, HTML) | All 3 + PDF + ZIP already exist | **Wire**: connect export to unified audit results | LOW |
| 13 | Performance tracking + GSC/GA4 | GSC: CSV only. GA4: not connected. Audit versioning: partial | **BUILD**: GSC API + GA4 API integration, audit timeline with correlation | HIGH |
| 14 | Visual performance overview | `enhanced_metrics_snapshots` exists but UI is minimal | **BUILD**: timeline chart with audit scores + GSC/GA4 metrics overlay | HIGH |
| — | Content merge suggestions | Exists in validation but not integrated | **Wire**: surface merge candidates in audit results | MEDIUM |
| — | Missing knowledge graph topics | EAV audit detects gaps | **Wire**: include KG gap recommendations in unified results | MEDIUM |
| — | Content value assessment | Not implemented as standalone | **ADD**: relevance scoring per content section | MEDIUM |
| — | Multilingual from day one | Stop words + LLM phrases already support EN/NL/DE/FR/ES | **Extend**: all new UI strings through i18n, all checks language-aware | HIGH |

---

## 3. Unified Architecture

### 3.1 Orchestration Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                    UnifiedAuditOrchestrator                       │
│  (NEW: services/audit/UnifiedAuditOrchestrator.ts)               │
│                                                                   │
│  Inputs:                                                          │
│  ├─ Internal content (from content_generation_jobs)               │
│  ├─ External URL (user-provided, scraped)                         │
│  ├─ Published URL (from migration workbench / project URLs)       │
│  └─ Project context (business info, pillars, EAVs, topical map)  │
│                                                                   │
│  Coordinates:                                                     │
│  ├─ ContentFetcher (Jina / Firecrawl / Apify with fallback)      │
│  ├─ RelatedUrlDiscoverer (sitemap + crawl-based discovery)        │
│  ├─ AuditPhaseRunner (runs all applicable audit phases)           │
│  ├─ FactValidator (claim extraction + verification)               │
│  ├─ PerformanceTracker (GSC API + GA4 API + audit history)        │
│  └─ AuditResultAggregator (scoring, ranking, export)              │
│                                                                   │
│  Output: ComprehensiveAuditReport                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Audit Phase Architecture

The unified audit runs **8 audit phases**, each wrapping existing services:

| Phase | Weight | Wraps Existing Service | New Work |
|-------|--------|----------------------|----------|
| 1. **Technical SEO** | 15% | `siteAnalysisServiceV2.ts` (technical phase) | Add external URL support |
| 2. **Content Quality** | 25% | `auditChecks.ts` (35 checks) + `contentValidation.ts` + `qualityRulesRegistry.ts` | Merge into single score |
| 3. **Semantic Richness** | 20% | `eavAudit.ts` + `centralEntityAnalyzer.ts` + EAV density | Add KG gap detection |
| 4. **Link Structure** | 15% | `linkingAudit.ts` (4-pass) + contextual bridges | Add external link E-A-T check |
| 5. **Schema & Structured Data** | 10% | `schemaGeneration/validator.ts` + `visualSemantics` | Add competitor schema comparison |
| 6. **E-A-T & Authority** | 10% | `eatScanner.ts` + `topicalAuthority` | Combine scores |
| 7. **Fact Validation** | 5% | **NEW** | Build claim extraction + source verification |
| 8. **Performance Correlation** | 0% (info only) | **NEW** | GSC/GA4 data overlay (not scored) |

### 3.3 Content Fetching Strategy

```
User selects scraping method (or uses default):
  ├─ Jina.ai (default) → semantic text + metadata
  ├─ Firecrawl → semantic text + full HTML
  ├─ Apify → full page crawl + screenshots
  └─ Direct HTML fetch (built-in) → raw HTML only

Fallback chain: User's preferred → Jina → Firecrawl → Direct fetch

Both outputs captured:
  ├─ semanticContent: cleaned text for content quality analysis
  └─ rawHtml: full HTML for technical SEO analysis (tags, schema, headers)
```

### 3.4 Service Directory Structure

```
services/audit/                          # NEW directory
├── UnifiedAuditOrchestrator.ts          # Main coordinator
├── ContentFetcher.ts                    # Multi-provider fetching with fallback
├── RelatedUrlDiscoverer.ts              # Sitemap + internal link discovery
├── FactValidator.ts                     # Claim extraction + verification
├── AuditPhaseRunner.ts                  # Phase execution coordinator
├── AuditResultAggregator.ts             # Score calculation + ranking
├── PerformanceCorrelator.ts             # GSC + GA4 data correlation
├── phases/                              # Phase adapters (wrap existing services)
│   ├── TechnicalSeoPhase.ts             # Wraps siteAnalysisServiceV2
│   ├── ContentQualityPhase.ts           # Wraps auditChecks + contentValidation
│   ├── SemanticRichnessPhase.ts         # Wraps eavAudit + centralEntity
│   ├── LinkStructurePhase.ts            # Wraps linkingAudit
│   ├── SchemaPhase.ts                   # Wraps schema validator
│   ├── EatAuthorityPhase.ts             # Wraps eatScanner + authority
│   └── FactValidationPhase.ts           # New implementation
├── adapters/                            # Analytics API adapters
│   ├── GscApiAdapter.ts                 # Google Search Console API
│   └── Ga4ApiAdapter.ts                 # Google Analytics 4 API
└── __tests__/                           # Tests for all new services
    ├── UnifiedAuditOrchestrator.test.ts
    ├── ContentFetcher.test.ts
    ├── RelatedUrlDiscoverer.test.ts
    ├── FactValidator.test.ts
    ├── PerformanceCorrelator.test.ts
    └── phases/
        └── *.test.ts
```

---

## 4. User Flows

### 4.1 Flow A: Audit Generated Content (from application)

```
User is on content drafting page or topic detail
  → Clicks "Run Full Audit" button
  → System checks 3-pillar prerequisite:
      ├─ Business info defined? ✓/✗
      ├─ SEO pillars defined? ✓/✗
      └─ EAVs defined? ✓/✗
      → If any missing: show modal with links to setup wizards
  → Audit runs with full project context:
      ├─ Content from content_generation_jobs
      ├─ Topical map context (linked topics, bridges)
      ├─ EAV triples for semantic checks
      └─ Knowledge graph for gap detection
  → Results displayed in unified dashboard
  → User can:
      ├─ View per-phase scores with drill-down
      ├─ Click any finding for AI suggestion with "why", "example", "fix"
      ├─ Apply auto-fixes where available
      ├─ Export results (CSV / XLSX / HTML)
      └─ Save snapshot for historical comparison
```

### 4.2 Flow B: Audit External URL

```
User navigates to /audit or enters URL in dashboard
  → Enters external URL
  → System:
      1. Validates URL format
      2. Checks 3-pillar prerequisite (warning if missing, allows proceed)
      3. Fetches content using preferred scraping method:
         ├─ Settings modal: choose Jina / Firecrawl / Apify
         ├─ Captures both semantic text AND raw HTML
         └─ Falls back through chain on failure
      4. Discovers related URLs:
         ├─ Fetches /sitemap.xml from target domain
         ├─ Extracts internal links from fetched page
         ├─ Identifies pages with similar topic/entity
         ├─ Presents top 5-10 related URLs to user
         └─ User selects which to include (checkboxes)
      5. Runs all 8 audit phases on primary URL
      6. Optionally runs reduced audit on selected related URLs
  → Results displayed with:
      ├─ Primary URL: full 8-phase dashboard
      ├─ Related URLs: summary scores in sidebar
      ├─ Cross-URL findings (duplicates, cannibalization)
      └─ Recommendations referencing project's topical map
```

### 4.3 Flow C: Click-to-Audit from Published URLs

```
Anywhere a URL appears in the application:
  ├─ Migration workbench URL list
  ├─ Content performance analysis
  ├─ Published content overview
  ├─ GSC/GA4 data tables
  └─ Topic cards with published URLs

  → URL has a small "audit" icon button (magnifying glass with checkmark)
  → Click opens audit in:
      ├─ Side panel (if on dashboard/list page)
      └─ Full page (if on detail page)
  → Uses the external URL flow (4.2) but:
      ├─ Pre-fills project context automatically
      ├─ Links findings back to the source topic/brief
      └─ Suggests specific edits to the content in the application
```

### 4.4 Flow D: Audit from Performance Data

```
User views GSC/GA4 performance data
  → Sees URLs with declining metrics (clicks, impressions, CTR)
  → Clicks "Audit" on a declining URL
  → System runs audit with performance context:
      ├─ Highlights what changed since last audit
      ├─ Correlates audit scores with performance metrics
      └─ Prioritizes findings by expected performance impact
  → "Suggested Actions" section shows:
      ├─ "This page scores 45% on semantic richness. Similar pages in your niche score 78%."
      ├─ "Consider merging with [topic X] — 68% content overlap detected"
      ├─ "Add these 3 missing EAV triples: [entity] [attribute] [value]"
      └─ "Update schema: missing FAQ and HowTo markup that competitors use"
```

### 4.5 Flow E: Bulk/Corpus Audit

```
User on dashboard
  → Clicks "Full Site Audit"
  → Configures:
      ├─ Scope: all topics / specific pillar / custom selection
      ├─ Depth: quick (technical + content) / deep (all 8 phases)
      ├─ Include published URLs: yes/no
      └─ Include external competitors: yes/no
  → Progress bar shows phase-by-phase completion
  → Results:
      ├─ Site-wide score distribution chart
      ├─ Top 10 issues across all pages (sorted by impact)
      ├─ Cannibalization detection (pages competing for same entity)
      ├─ Content merge suggestions
      ├─ Missing topic gaps from knowledge graph
      ├─ Trend line: this audit vs previous audits
      └─ Performance correlation (if GSC/GA4 connected)
```

---

## 5. Implementation Sprints

### Sprint 1: Audit Orchestrator Foundation

**Goal**: Create the `UnifiedAuditOrchestrator` that coordinates existing services through phase adapters.

#### Task 1.1: Create audit service directory and base types

**Files:**
- Create: `services/audit/types.ts`

Define the unified types:

```typescript
export interface AuditRequest {
  type: 'internal' | 'external' | 'published';
  // Internal content
  projectId: string;
  mapId?: string;
  topicId?: string;
  jobId?: string; // content_generation_jobs.id
  // External
  url?: string;
  relatedUrls?: string[];
  // Options
  depth: 'quick' | 'deep';
  phases: AuditPhaseName[];
  scrapingProvider: 'jina' | 'firecrawl' | 'apify' | 'direct';
  language: string;
  includeFactValidation: boolean;
  includePerformanceData: boolean;
}

export type AuditPhaseName =
  | 'technical' | 'contentQuality' | 'semanticRichness'
  | 'linkStructure' | 'schema' | 'eatAuthority'
  | 'factValidation' | 'performance';

export interface AuditPhaseResult {
  phase: AuditPhaseName;
  score: number; // 0-100
  weight: number; // percentage weight
  passedChecks: number;
  totalChecks: number;
  findings: AuditFinding[];
  summary: string;
}

export interface AuditFinding {
  id: string;
  phase: AuditPhaseName;
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  whyItMatters: string;       // Explains WHY this is a problem
  currentValue?: string;       // What the current state is
  expectedValue?: string;      // What it should be
  exampleFix?: string;         // Concrete example of how to fix
  affectedElement?: string;    // CSS selector, heading text, etc.
  autoFixAvailable: boolean;
  autoFixAction?: () => Promise<void>;
  estimatedImpact: 'high' | 'medium' | 'low';
  category: string;
  language?: string;
}

export interface UnifiedAuditReport {
  id: string;
  projectId: string;
  auditType: AuditRequest['type'];
  url?: string;

  overallScore: number;
  phaseResults: AuditPhaseResult[];

  // Cross-cutting concerns
  contentMergeSuggestions: ContentMergeSuggestion[];
  missingKnowledgeGraphTopics: string[];
  cannibalizationRisks: CannibalizationRisk[];

  // Performance data (if available)
  performanceData?: PerformanceSnapshot;
  performanceCorrelation?: PerformanceCorrelation;

  // Related URLs (for external audits)
  relatedUrlScores?: { url: string; score: number; summary: string }[];

  // Metadata
  language: string;
  version: number;
  createdAt: string;
  auditDurationMs: number;

  // Prerequisites check
  prerequisitesMet: {
    businessInfo: boolean;
    pillars: boolean;
    eavs: boolean;
  };
}

export interface ContentMergeSuggestion {
  sourceUrl: string;
  targetUrl: string;
  overlapPercentage: number;
  reason: string;
  suggestedAction: 'merge' | 'differentiate' | 'redirect';
}

export interface CannibalizationRisk {
  urls: string[];
  sharedEntity: string;
  sharedKeywords: string[];
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface PerformanceSnapshot {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  pageviews?: number;
  bounceRate?: number;
  avgSessionDuration?: number;
  period: { start: string; end: string };
}

export interface PerformanceCorrelation {
  auditScoreTrend: { date: string; score: number }[];
  clicksTrend: { date: string; value: number }[];
  impressionsTrend: { date: string; value: number }[];
  correlationCoefficient: number; // -1 to 1
  insight: string; // AI-generated interpretation
}
```

#### Task 1.2: Create UnifiedAuditOrchestrator

**Files:**
- Create: `services/audit/UnifiedAuditOrchestrator.ts`

```typescript
export class UnifiedAuditOrchestrator {
  // Check 3-pillar prerequisite
  async checkPrerequisites(projectId: string): Promise<PrerequisiteCheck>

  // Run full audit
  async runAudit(request: AuditRequest): Promise<UnifiedAuditReport>

  // Run single phase (for incremental/on-demand)
  async runPhase(request: AuditRequest, phase: AuditPhaseName): Promise<AuditPhaseResult>

  // Save audit snapshot for history
  async saveSnapshot(report: UnifiedAuditReport): Promise<string>

  // Get audit history for trend analysis
  async getHistory(projectId: string, url?: string): Promise<UnifiedAuditReport[]>
}
```

Key behaviors:
- Checks prerequisites before running (warns but doesn't block for external URLs)
- Runs phases in parallel where possible (technical + content quality can run simultaneously)
- Emits progress events for UI updates
- Catches phase errors gracefully (one phase failing doesn't block others)
- Deduplicates findings across phases
- Calculates weighted overall score

#### Task 1.3: Create phase adapters

**Files:**
- Create: `services/audit/phases/TechnicalSeoPhase.ts`
- Create: `services/audit/phases/ContentQualityPhase.ts`
- Create: `services/audit/phases/SemanticRichnessPhase.ts`
- Create: `services/audit/phases/LinkStructurePhase.ts`
- Create: `services/audit/phases/SchemaPhase.ts`
- Create: `services/audit/phases/EatAuthorityPhase.ts`

Each adapter:
1. Takes `AuditRequest` + fetched content
2. Calls existing service methods
3. Transforms results into `AuditPhaseResult` with enriched `AuditFinding` objects
4. Adds `whyItMatters`, `exampleFix`, and `estimatedImpact` to each finding

Example for `ContentQualityPhase.ts`:
```typescript
export class ContentQualityPhase implements AuditPhase {
  async run(request: AuditRequest, content: FetchedContent): Promise<AuditPhaseResult> {
    // 1. Run Pass 8 algorithmic checks
    const pass8Results = await runAllChecks(content.text, content.brief, content.language);

    // 2. Run quality rules
    const qualityResults = await runQualityRules(content.text, content.language);

    // 3. Run content validation
    const validationResults = await validateContent(content.text, content.brief);

    // 4. Merge and deduplicate findings
    // 5. Enrich each finding with contextual suggestions
    // 6. Calculate phase score
  }
}
```

#### Task 1.4: Write tests for orchestrator

**Files:**
- Create: `services/audit/__tests__/UnifiedAuditOrchestrator.test.ts`
- Create: `services/audit/__tests__/phases/ContentQualityPhase.test.ts`

Test cases:
- Prerequisites check with missing pillars
- Full audit with mock phase results
- Phase failure isolation (one fails, others succeed)
- Score calculation with weights
- Finding deduplication
- Progress event emission

---

### Sprint 2: Content Fetching & External URL Support

**Goal**: Multi-provider content fetching with fallback, plus related URL discovery.

#### Task 2.1: Create ContentFetcher service

**Files:**
- Create: `services/audit/ContentFetcher.ts`

```typescript
export interface FetchedContent {
  url: string;
  semanticText: string;      // Clean text for content analysis
  rawHtml: string;            // Full HTML for technical analysis
  title: string;
  metaDescription: string;
  headings: { level: number; text: string }[];
  images: { src: string; alt: string }[];
  internalLinks: { href: string; anchor: string }[];
  externalLinks: { href: string; anchor: string }[];
  schemaMarkup: object[];     // JSON-LD blocks
  language: string;           // Detected language
  fetchedAt: string;
  provider: 'jina' | 'firecrawl' | 'apify' | 'direct';
  fetchDurationMs: number;
}

export class ContentFetcher {
  async fetch(url: string, options: FetchOptions): Promise<FetchedContent> {
    // Try preferred provider, then fallback chain
    const providers = this.buildFallbackChain(options.preferredProvider);

    for (const provider of providers) {
      try {
        const result = await this.fetchWithProvider(provider, url);
        // Always ensure we have BOTH semantic text AND raw HTML
        if (!result.rawHtml) {
          result.rawHtml = await this.fetchRawHtml(url);
        }
        if (!result.semanticText) {
          result.semanticText = this.extractTextFromHtml(result.rawHtml);
        }
        return result;
      } catch (error) {
        console.warn(`Provider ${provider} failed for ${url}:`, error);
        continue;
      }
    }
    throw new Error(`All providers failed for ${url}`);
  }
}
```

Provider-specific implementations:
- **Jina**: `GET https://r.jina.ai/{url}` — returns cleaned markdown (semantic), minimal HTML
- **Firecrawl**: Uses `firecrawlService.ts` — returns both markdown and HTML
- **Apify**: Uses `crawl-worker` edge function — full page crawl
- **Direct**: Built-in `fetch()` — raw HTML only, parse with DOMParser

#### Task 2.2: Create RelatedUrlDiscoverer

**Files:**
- Create: `services/audit/RelatedUrlDiscoverer.ts`

```typescript
export class RelatedUrlDiscoverer {
  async discover(url: string, limit: number = 10): Promise<DiscoveredUrl[]> {
    const results: DiscoveredUrl[] = [];

    // Strategy 1: Parse sitemap.xml
    const sitemapUrls = await this.parseSitemap(url);

    // Strategy 2: Extract internal links from the page itself
    const internalLinks = await this.extractInternalLinks(url);

    // Strategy 3: Check for common URL patterns (category pages, related posts)
    const patternUrls = this.findRelatedByPattern(url, sitemapUrls);

    // Deduplicate and rank by relevance
    // Return top N with relevance reasoning
  }
}

export interface DiscoveredUrl {
  url: string;
  title?: string;
  relevanceScore: number; // 0-1
  discoveryMethod: 'sitemap' | 'internal_link' | 'pattern';
  reason: string; // "Same category", "Linked from target page", etc.
}
```

#### Task 2.3: Create user scraping preference UI

**Files:**
- Modify: existing settings component

Add a "Content Fetching" section to user settings:
- Radio buttons: Jina (default), Firecrawl, Apify, Direct
- Toggle: "Enable automatic fallback" (default: on)
- Info text explaining each provider's strengths

#### Task 2.4: Write tests

**Files:**
- Create: `services/audit/__tests__/ContentFetcher.test.ts`
- Create: `services/audit/__tests__/RelatedUrlDiscoverer.test.ts`

---

### Sprint 3: Fact Validation Service

**Goal**: Extract factual claims from content and verify them against sources.

#### Task 3.1: Create FactValidator service

**Files:**
- Create: `services/audit/FactValidator.ts`
- Create: `services/audit/phases/FactValidationPhase.ts`

```typescript
export interface FactClaim {
  id: string;
  text: string;                    // The claim text
  claimType: 'statistic' | 'date' | 'attribution' | 'definition' | 'comparison' | 'general';
  confidence: number;              // 0-1 how confident we are this IS a factual claim
  sourceInContent?: string;        // Citation in the content, if any
  verificationStatus: 'verified' | 'unverified' | 'disputed' | 'outdated' | 'unable_to_verify';
  verificationSources: VerificationSource[];
  suggestion?: string;             // What to change if disputed/outdated
}

export interface VerificationSource {
  url: string;
  title: string;
  snippet: string;
  agreesWithClaim: boolean;
  retrievedAt: string;
}

export class FactValidator {
  // Step 1: Extract claims using AI
  async extractClaims(content: string, language: string): Promise<FactClaim[]>

  // Step 2: Verify each claim via search
  async verifyClaim(claim: FactClaim): Promise<FactClaim>

  // Step 3: Batch verification with rate limiting
  async verifyAll(claims: FactClaim[]): Promise<FactClaim[]>
}
```

Implementation approach:
1. Use AI (Gemini fast) to extract factual claims from content
2. For each claim, use Perplexity or web search to find corroborating/contradicting sources
3. AI judges whether sources agree/disagree with the claim
4. Flag outdated statistics (dates older than 2 years)
5. Flag unattributed statistics ("studies show..." without citation)

#### Task 3.2: Write tests

**Files:**
- Create: `services/audit/__tests__/FactValidator.test.ts`

Test cases:
- Statistic extraction ("83% of marketers...")
- Date claim extraction ("Founded in 2015...")
- Attribution verification ("According to Harvard...")
- Outdated data detection (2-year threshold)
- Unverifiable claims handling

---

### Sprint 4: GSC API & GA4 API Integration

**Goal**: Connect to Google Search Console and Google Analytics 4 APIs for live performance data.

#### Task 4.1: Create GSC API Adapter

**Files:**
- Create: `services/audit/adapters/GscApiAdapter.ts`
- Create: `supabase/functions/gsc-proxy/index.ts` (edge function for OAuth)

```typescript
export class GscApiAdapter {
  // OAuth flow
  async authorize(projectId: string): Promise<string> // Returns auth URL
  async handleCallback(code: string, projectId: string): Promise<void>

  // Data retrieval
  async getSearchAnalytics(params: {
    siteUrl: string;
    startDate: string;
    endDate: string;
    dimensions: ('query' | 'page' | 'device' | 'country')[];
    rowLimit?: number;
  }): Promise<GscRow[]>

  // Convenience methods
  async getPagePerformance(url: string, days: number): Promise<PerformanceSnapshot>
  async getTopQueries(url: string, limit: number): Promise<GscQueryRow[]>
  async getClickTrend(url: string, days: number): Promise<{ date: string; clicks: number }[]>
}
```

Also keep existing CSV import (`gscService.ts`) as fallback for users who don't want API connection.

#### Task 4.2: Create GA4 API Adapter

**Files:**
- Create: `services/audit/adapters/Ga4ApiAdapter.ts`
- Create: `supabase/functions/ga4-proxy/index.ts` (edge function for OAuth)

```typescript
export class Ga4ApiAdapter {
  async authorize(projectId: string): Promise<string>
  async handleCallback(code: string, projectId: string): Promise<void>

  async getPageMetrics(params: {
    propertyId: string;
    pagePath: string;
    startDate: string;
    endDate: string;
  }): Promise<Ga4PageMetrics>

  async getPageviewsTrend(pagePath: string, days: number): Promise<{ date: string; views: number }[]>
}

export interface Ga4PageMetrics {
  pageviews: number;
  uniquePageviews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  exitRate: number;
  scrollDepth?: number;
}
```

#### Task 4.3: Create PerformanceCorrelator

**Files:**
- Create: `services/audit/PerformanceCorrelator.ts`

```typescript
export class PerformanceCorrelator {
  // Combine GSC + GA4 + audit history into correlation data
  async correlate(
    projectId: string,
    url: string,
    auditHistory: UnifiedAuditReport[]
  ): Promise<PerformanceCorrelation>

  // Generate AI insight about the correlation
  async generateInsight(correlation: PerformanceCorrelation): Promise<string>
}
```

#### Task 4.4: Analytics settings UI

**Files:**
- Modify: settings/integrations section

Add "Analytics Integration" panel:
- GSC: "Connect Google Search Console" button → OAuth flow
- GA4: "Connect Google Analytics 4" button → OAuth flow
- CSV: "Import CSV" button (existing, unchanged)
- Show connection status with last sync date

#### Task 4.5: Write tests

**Files:**
- Create: `services/audit/__tests__/adapters/GscApiAdapter.test.ts`
- Create: `services/audit/__tests__/adapters/Ga4ApiAdapter.test.ts`
- Create: `services/audit/__tests__/PerformanceCorrelator.test.ts`

---

### Sprint 5: Unified Audit Dashboard UI

**Goal**: Single, cohesive audit dashboard that replaces fragmented audit UIs.

#### Task 5.1: Create UnifiedAuditDashboard component

**Files:**
- Create: `components/audit/UnifiedAuditDashboard.tsx`

Layout:
```
┌──────────────────────────────────────────────────────────────────────┐
│  [URL/Content Title]                          [Export ▼] [Re-audit]  │
│  Overall Score: [87/100] ████████░░ (was 72 last audit, +15)        │
│  Audit type: Deep | Language: English | Duration: 45s               │
│                                                                      │
│  Prerequisites: ✅ Business Info  ✅ Pillars  ✅ EAVs               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │Technical│ │Content  │ │Semantic │ │  Links  │ │ Schema  │ ...   │
│  │  85%    │ │  92%    │ │  78%    │ │  90%    │ │  65%    │       │
│  │  ████░  │ │  █████  │ │  ████░  │ │  ████░  │ │  ███░░  │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                                      │
│  ┌─── Critical Issues (3) ────────────────────────────────────────┐  │
│  │ ❌ Missing H1 tag                                    [Fix →]  │  │
│  │    Why: H1 is the primary signal for page topic to search...  │  │
│  │    Current: No H1 found | Expected: Single H1 matching...    │  │
│  │    Example: <h1>Your Primary Keyword - Supporting Context</h1>│  │
│  │                                                                │  │
│  │ ❌ No FAQ schema detected                            [Fix →]  │  │
│  │    Why: FAQ schema enables rich snippets, increasing CTR...   │  │
│  │    Current: No FAQ markup | Expected: FAQPage schema          │  │
│  │    Example: {"@type": "FAQPage", "mainEntity": [...]}        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─── High Priority (7) ──────────────────────────────────────────┐  │
│  │ ⚠️ Low EAV density (2 triples, need 5+)             [Fix →]  │  │
│  │ ⚠️ Missing contextual bridge to pillar page          [Fix →]  │  │
│  │ ...                                                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─── Suggestions (12) ───────────────────────────────────────────┐  │
│  │ 💡 Consider adding comparison table for Feature X    [Apply]  │  │
│  │ 💡 Merge with "Topic Y" — 68% content overlap        [View]  │  │
│  │ ...                                                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─── Performance Trend ──────────────────────────────────────────┐  │
│  │  [Line chart: audit score + clicks + impressions over time]   │  │
│  │  📈 Insight: "Your audit score improved 15 points since Jan.  │  │
│  │     Clicks increased 23% in the same period, suggesting       │  │
│  │     your content improvements are driving results."           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─── Fact Check Results (if enabled) ────────────────────────────┐  │
│  │  ✅ "83% of marketers use content marketing" — Verified (CMI) │  │
│  │  ⚠️ "Founded in 2010" — Outdated (actually 2008, per Wiki)   │  │
│  │  ❓ "Studies show 5x ROI" — Unable to verify source           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  80%+ scoring philosophy note:                                       │
│  "This audit is intentionally thorough. Achieving 100% is rare      │
│   and not the goal. Focus on reaching 80%+ — that puts you in       │
│   the top tier. Critical issues should always be addressed first."  │
└──────────────────────────────────────────────────────────────────────┘
```

#### Task 5.2: Create AuditFindingCard component

**Files:**
- Create: `components/audit/AuditFindingCard.tsx`

Each finding card shows:
- Severity icon (color-coded)
- Title + phase badge
- Expandable details:
  - "Why It Matters" section
  - "Current" vs "Expected" comparison
  - "Example Fix" with code/text sample
  - "Estimated Impact" badge
- Action buttons: Auto-fix (if available), Dismiss, View in context

#### Task 5.3: Create PhaseScoreCard component

**Files:**
- Create: `components/audit/PhaseScoreCard.tsx`

Compact score card for each phase:
- Phase name and icon
- Score with progress bar (color-coded)
- Passed/total checks count
- Click to expand phase detail view

#### Task 5.4: Create AuditScoreRing component

**Files:**
- Create: `components/audit/AuditScoreRing.tsx`

Circular progress indicator showing:
- Overall score in center
- Ring color matches threshold (green/yellow/orange/red)
- Delta from previous audit (+/-N)
- Animated on load

#### Task 5.5: Create PerformanceTrendChart component

**Files:**
- Create: `components/audit/PerformanceTrendChart.tsx`

Recharts-based line chart:
- Dual Y-axes: audit score (left) + clicks/impressions (right)
- Time series with audit snapshots as data points
- Hover tooltip with all values
- AI-generated insight text below chart

#### Task 5.6: Create ExternalUrlInput component

**Files:**
- Create: `components/audit/ExternalUrlInput.tsx`

Input component for external URL auditing:
- URL text input with validation
- Provider selector dropdown (Jina/Firecrawl/Apify)
- "Discover related pages" checkbox
- "Run Audit" button with loading state

#### Task 5.7: Create RelatedUrlSelector component

**Files:**
- Create: `components/audit/RelatedUrlSelector.tsx`

Shows discovered related URLs:
- Checkbox list with URL, title, relevance score
- Select all / deselect all
- "Include in audit" button
- Shows discovery method badge (sitemap/link/pattern)

#### Task 5.8: Create AuditPrerequisiteGate component

**Files:**
- Create: `components/audit/AuditPrerequisiteGate.tsx`

Modal/banner shown when prerequisites are missing:
- Checklist of 3 pillars with status
- Links to setup wizards for missing items
- "Proceed anyway" option for external URLs (with warning)

---

### Sprint 6: Click-to-Audit Integration Points

**Goal**: Add audit triggers to every URL display in the application.

#### Task 6.1: Create AuditButton component

**Files:**
- Create: `components/audit/AuditButton.tsx`

Small, reusable button:
```typescript
interface AuditButtonProps {
  url: string;
  projectId: string;
  topicId?: string;
  variant: 'icon' | 'text' | 'icon-text';
  size: 'sm' | 'md';
  onAuditComplete?: (report: UnifiedAuditReport) => void;
}
```

Renders as magnifying glass icon with checkmark. On click:
- Opens audit in side panel or navigates to `/audit?url=...`
- Pre-fills project context

#### Task 6.2: Add AuditButton to URL displays

**Files to modify:**
- `components/migration/MigrationUrlList.tsx` — add to each URL row
- `components/performance/PerformanceTable.tsx` — add to URL column
- `components/content/PublishedContentList.tsx` — add to each item
- `components/dashboard/TopicCard.tsx` — add to published URL display
- `components/gsc/GscDataTable.tsx` — add to URL column

#### Task 6.3: Create audit side panel

**Files:**
- Create: `components/audit/AuditSidePanel.tsx`

Slide-out panel (right side, 50% width) showing:
- Compact version of UnifiedAuditDashboard
- Close button to return to source view
- "Open full audit" link

---

### Sprint 7: Multilingual Support

**Goal**: All audit checks, messages, and UI elements support EN, NL, DE, FR, ES from day one.

#### Task 7.1: Create audit i18n configuration

**Files:**
- Create: `config/audit-i18n/index.ts`
- Create: `config/audit-i18n/en.ts`
- Create: `config/audit-i18n/nl.ts`
- Create: `config/audit-i18n/de.ts`
- Create: `config/audit-i18n/fr.ts`
- Create: `config/audit-i18n/es.ts`

Structure per language:
```typescript
export const auditStrings = {
  phases: {
    technical: { name: 'Technical SEO', description: '...' },
    contentQuality: { name: 'Content Quality', description: '...' },
    // ...
  },
  findings: {
    'missing-h1': {
      title: 'Missing H1 tag',
      whyItMatters: 'The H1 tag is the primary signal...',
      exampleFix: '<h1>Your Primary Keyword</h1>',
    },
    // ... all finding templates
  },
  ui: {
    overallScore: 'Overall Score',
    runAudit: 'Run Audit',
    criticalIssues: 'Critical Issues',
    // ...
  },
  philosophy: {
    scoringNote: 'This audit is intentionally thorough...',
  },
};
```

#### Task 7.2: Make all audit checks language-aware

Ensure existing checks use language parameter:
- Stop word detection: already supports 5 languages via `STOP_WORD_PATTERNS`
- LLM phrase detection: already supports 5 languages via `LLM_PHRASE_PATTERNS`
- Sentence structure analysis: needs language-specific rules for DE (verb-final), FR (adjective position)
- Readability scoring: needs language-specific formulas

#### Task 7.3: Detect content language automatically

Use existing language detection (from content or user settings) to:
- Auto-select audit rules for the correct language
- Display findings in the content's language
- Keep UI in the user's preferred language (may differ from content language)

---

### Sprint 8: Export System Enhancement

**Goal**: Connect unified audit results to the existing export system.

#### Task 8.1: Create AuditReportExporter

**Files:**
- Create: `services/audit/AuditReportExporter.ts`

```typescript
export class AuditReportExporter {
  async exportCsv(report: UnifiedAuditReport): Promise<Blob>
  async exportXlsx(report: UnifiedAuditReport): Promise<Blob>
  async exportHtml(report: UnifiedAuditReport): Promise<Blob>
}
```

**CSV format**: One row per finding, columns: Phase, Severity, Rule, Title, Current Value, Expected Value, Fix Suggestion, Score Impact

**XLSX format**:
- Sheet 1: "Summary" — overall scores, phase scores, trend
- Sheet 2: "Findings" — all findings sorted by severity
- Sheet 3: "Performance" — GSC/GA4 data if available
- Sheet 4: "Fact Check" — claim verification results
- Conditional formatting: red/yellow/green cells based on scores

**HTML format**: Styled report matching dashboard layout, suitable for printing/sharing

#### Task 8.2: Add export buttons to dashboard

Dropdown button in dashboard header:
- Export as CSV
- Export as Excel (formatted)
- Export as HTML
- Export as PDF (reuse existing PDF export)

---

### Sprint 9: Performance Timeline & Audit History

**Goal**: Track audit versions over time, visualize improvement trajectory with performance correlation.

#### Task 9.1: Create audit_snapshots table

**Files:**
- Create: migration for `unified_audit_snapshots` table

```sql
CREATE TABLE unified_audit_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT,
  audit_type TEXT NOT NULL CHECK (audit_type IN ('internal', 'external', 'published')),

  overall_score NUMERIC(5,2) NOT NULL,
  technical_score NUMERIC(5,2),
  content_quality_score NUMERIC(5,2),
  semantic_richness_score NUMERIC(5,2),
  link_structure_score NUMERIC(5,2),
  schema_score NUMERIC(5,2),
  eat_authority_score NUMERIC(5,2),
  fact_validation_score NUMERIC(5,2),

  findings_count_critical INT DEFAULT 0,
  findings_count_high INT DEFAULT 0,
  findings_count_medium INT DEFAULT 0,
  findings_count_low INT DEFAULT 0,

  full_report JSONB, -- Complete UnifiedAuditReport for drill-down

  language TEXT DEFAULT 'en',
  version INT NOT NULL DEFAULT 1,

  -- Performance data at time of audit
  gsc_clicks INT,
  gsc_impressions INT,
  gsc_ctr NUMERIC(5,4),
  gsc_position NUMERIC(5,2),
  ga4_pageviews INT,
  ga4_bounce_rate NUMERIC(5,4),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- For finding changes between audits
  content_hash TEXT
);

CREATE INDEX idx_audit_snapshots_project ON unified_audit_snapshots(project_id);
CREATE INDEX idx_audit_snapshots_url ON unified_audit_snapshots(url);
CREATE INDEX idx_audit_snapshots_created ON unified_audit_snapshots(created_at);
```

#### Task 9.2: Create AuditTimelineView component

**Files:**
- Create: `components/audit/AuditTimelineView.tsx`

Timeline visualization:
- Horizontal timeline with audit snapshots as nodes
- Each node shows: date, overall score, change delta
- Click node to view that historical audit
- Overlay line for GSC clicks / GA4 pageviews
- Highlight periods of improvement / decline

#### Task 9.3: Create audit comparison view

**Files:**
- Create: `components/audit/AuditComparisonView.tsx`

Side-by-side comparison of two audit snapshots:
- Phase-by-phase score comparison with arrows (↑↓)
- New findings (appeared since last audit)
- Resolved findings (fixed since last audit)
- Persistent findings (still present)

---

### Sprint 10: Advanced Features & Polish

#### Task 10.1: Content merge suggestions integration

Wire the existing content overlap detection from `corpusAudit.ts` into the unified audit:
- When auditing a page, check for overlap with other project pages
- Show merge suggestions with overlap percentage
- "This content covers 68% of the same ground as [Topic Y]. Consider merging or differentiating the angle."

#### Task 10.2: Knowledge graph gap detection

Wire EAV audit gaps into unified results:
- "Your knowledge graph is missing these entities: [X, Y, Z]"
- "Add EAV triples for: [Entity] [has_benefit] [Value]"
- Link to EAV Discovery Wizard for fixing

#### Task 10.3: Content value assessment

For each content section, provide relevance scoring:
- "This paragraph doesn't add unique value (generic filler)"
- "This section is critical for [keyword] — keep and expand"
- "Consider removing: duplicates information from [other section]"

#### Task 10.4: 80%+ scoring philosophy messaging

Add contextual messaging throughout the UI:
- Onboarding tooltip: "Our audit is intentionally thorough. Most professional content scores 60-80%. Reaching 80%+ means you're in the top tier."
- Score interpretation badges: "Excellent (90+)", "Very Good (80-89)", "Good (70-79)", "Needs Work (60-69)", "Poor (<60)"
- Achievement indicators when score improves past 80%

#### Task 10.5: Audit scheduling (future-ready)

Add database schema for scheduled audits (implementation deferred):
- Weekly/monthly re-audit of published URLs
- Alert when score drops below threshold
- Automatic GSC/GA4 data refresh

---

## 6. UX/UI Specifications

### 6.1 Color System (consistent across all audit views)

| Score Range | Color | Hex | Usage |
|------------|-------|-----|-------|
| 90-100 | Deep Green | `#059669` | Excellent — exceeding expectations |
| 80-89 | Green | `#10b981` | Very Good — top tier |
| 70-79 | Yellow-Green | `#84cc16` | Good — on track |
| 60-69 | Yellow | `#eab308` | Acceptable — room for improvement |
| 40-59 | Orange | `#f97316` | Needs Work — priority fixes needed |
| 0-39 | Red | `#ef4444` | Poor — critical issues |

### 6.2 Severity Icons

| Severity | Icon | Color | Description |
|----------|------|-------|-------------|
| Critical | `XCircle` | Red | Must fix — blocks ranking/indexing |
| High | `AlertTriangle` | Orange | Should fix — significant impact |
| Medium | `Info` | Yellow | Consider fixing — moderate impact |
| Low | `Lightbulb` | Blue | Suggestion — nice to have |

### 6.3 Dashboard Layout Principles

- **Progressive disclosure**: Show overall score first, then phase cards, then findings grouped by severity
- **Action-oriented**: Every finding has a clear next action (auto-fix, manual fix, dismiss)
- **Context-rich**: Each finding explains WHY it matters, not just WHAT is wrong
- **Comparison-ready**: Always show delta from previous audit where available
- **Mobile-responsive**: Phase cards stack vertically on mobile, findings remain readable

### 6.4 Animation & Transitions

- Score rings animate from 0 to final value on load (500ms ease-out)
- Phase cards fade in sequentially (100ms stagger)
- Finding cards expand/collapse with smooth height transition
- Progress bar during audit shows phase names as they complete

---

## 7. Testing Strategy

### 7.1 Unit Tests (Vitest)

| Component/Service | Test File | Key Test Cases |
|------------------|-----------|---------------|
| UnifiedAuditOrchestrator | `*.test.ts` | Prerequisites, phase coordination, error isolation, scoring |
| ContentFetcher | `*.test.ts` | Provider fallback, both outputs captured, error handling |
| RelatedUrlDiscoverer | `*.test.ts` | Sitemap parsing, link extraction, deduplication |
| FactValidator | `*.test.ts` | Claim extraction, verification, edge cases |
| Each phase adapter | `phases/*.test.ts` | Correct wrapping of existing service, finding enrichment |
| PerformanceCorrelator | `*.test.ts` | Data merging, correlation calculation, insight generation |
| AuditReportExporter | `*.test.ts` | CSV format, XLSX structure, HTML rendering |

### 7.2 Integration Tests (Vitest)

- Full audit flow with mocked external services
- Audit + export pipeline
- Audit + save snapshot + load history + compare
- Multi-language audit execution

### 7.3 E2E Tests (Playwright)

| Test | Description |
|------|-------------|
| `audit-internal-content.spec.ts` | Navigate to topic → click audit → see results → export |
| `audit-external-url.spec.ts` | Enter URL → select provider → run audit → view findings |
| `audit-related-urls.spec.ts` | Enter URL → discover related → select → audit all |
| `audit-click-to-audit.spec.ts` | Navigate to URL list → click audit icon → see side panel |
| `audit-performance-timeline.spec.ts` | Run audit → view timeline → compare snapshots |
| `audit-export.spec.ts` | Run audit → export CSV → verify file content |
| `audit-prerequisite-gate.spec.ts` | Try audit without pillars → see gate → complete setup → audit |

### 7.4 Runtime Validation

After each sprint, validate:
1. `npx tsc --noEmit` — zero TypeScript errors
2. `npx vitest run` — all tests pass
3. Manual smoke test of the new flow
4. Grep verification: no hardcoded values outside config

---

## 8. Data Model

### 8.1 Key Relationships

```
project
  ├── topical_map
  │   ├── topics[] ──→ content_briefs[] ──→ content_generation_jobs[]
  │   ├── eavs[]
  │   └── linking_structure
  │
  ├── unified_audit_snapshots[]
  │   ├── links to: topic / URL / content job
  │   ├── stores: full report JSON
  │   └── stores: performance data at audit time
  │
  ├── gsc_connections (NEW)
  │   └── OAuth tokens for Search Console API
  │
  └── ga4_connections (NEW)
      └── OAuth tokens for Analytics API
```

### 8.2 New Tables Summary

| Table | Purpose |
|-------|---------|
| `unified_audit_snapshots` | Versioned audit results with performance data |
| `gsc_connections` | Google Search Console OAuth tokens per project |
| `ga4_connections` | Google Analytics 4 OAuth tokens per project |
| `fact_validation_cache` | Cached fact verification results (TTL: 30 days) |

---

## 9. Export System

### 9.1 CSV Export Structure

```csv
Phase,Severity,Rule ID,Title,Current Value,Expected Value,Fix Suggestion,Score Impact,Status
Technical SEO,critical,missing-h1,"Missing H1 tag","No H1 found","Single descriptive H1","Add <h1>Primary Keyword</h1>",High,Open
Content Quality,high,low-eav-density,"Low EAV density","2 triples","5+ triples","Add: [Entity] [has_benefit] [Value]",Medium,Open
```

### 9.2 XLSX Export Structure

- **Sheet "Overview"**: Scores summary, radar chart data, trend data
- **Sheet "Findings"**: All findings with full detail columns
- **Sheet "Phase Details"**: Per-phase check-by-check results
- **Sheet "Performance"**: GSC + GA4 metrics if available
- **Sheet "Fact Check"**: Verification results if enabled
- **Sheet "History"**: Previous audit scores for comparison

### 9.3 HTML Export

Standalone HTML file with:
- Inline CSS (no external dependencies)
- All charts rendered as SVG
- Print-friendly layout
- Company/project branding from settings

---

## 10. Performance Tracking

### 10.1 Metrics Tracked Over Time

| Source | Metrics |
|--------|---------|
| **Audit** | Overall score, phase scores, finding counts by severity |
| **GSC** | Clicks, impressions, CTR, average position |
| **GA4** | Pageviews, bounce rate, avg session duration, scroll depth |

### 10.2 Correlation Analysis

The `PerformanceCorrelator` calculates:
- Pearson correlation between audit score changes and metric changes
- Time-lagged correlation (audit improvements may take 2-4 weeks to show in metrics)
- Per-phase correlation (which audit phases correlate most with performance)

### 10.3 AI-Generated Insights

After correlation analysis, AI generates human-readable insights:
- "Your content quality improvements (+18 points) correlate with a 23% increase in organic clicks over the past 30 days."
- "Technical SEO fixes from January are likely responsible for the 15% improvement in average position."
- "Despite improved audit scores, clicks declined — this may be due to seasonal trends or algorithm updates."

---

## Additional Considerations

### Security
- OAuth tokens stored encrypted in Supabase
- External URL fetching respects robots.txt
- Rate limiting on audit API calls
- No PII in audit exports

### Performance
- Phase adapters run in parallel where possible
- Large audits show progress bar with cancelation option
- Fact validation is opt-in (expensive operation)
- Related URL discovery has configurable limit (default: 10)
- Audit snapshots use JSONB for flexible querying without schema migrations

### Extensibility
- Phase system is plugin-based: add new phases by implementing `AuditPhase` interface
- Finding templates are data-driven (i18n files), not hardcoded
- Export formats can be extended without changing core audit logic
- Scoring weights are configurable per project (future feature)

---

## Implementation Order Summary

| Sprint | Focus | Key Deliverable |
|--------|-------|-----------------|
| 1 | Orchestrator + Phase Adapters | Core architecture working |
| 2 | Content Fetching + URL Discovery | External URL auditing |
| 3 | Fact Validation | Claim extraction + verification |
| 4 | GSC API + GA4 API | Live performance data |
| 5 | Unified Dashboard UI | Single cohesive audit experience |
| 6 | Click-to-Audit Integration | Audit from any URL in the app |
| 7 | Multilingual Support | EN/NL/DE/FR/ES |
| 8 | Export Enhancement | CSV/XLSX/HTML with full data |
| 9 | Performance Timeline | Historical tracking + correlation |
| 10 | Advanced Features | Merge suggestions, KG gaps, polish |

**Estimated total**: ~60-80 tasks across 10 sprints. Each sprint builds on the previous but can be shipped independently.
