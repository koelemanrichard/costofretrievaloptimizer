# Site Analysis V2 - Complete Rebuild Plan

## Executive Summary

Rebuild the Site Analysis feature with proper implementation of Koray's Holistic SEO Framework, including:
- Dual extraction (Apify + Jina.ai)
- Semantic foundation discovery with AI inference and user validation
- Neo4j graph database for link/semantic analysis
- Full Supabase persistence with audit history
- Hybrid audit engine (quick pass + deep analysis on-demand)
- Output: Tasks, Topical Map bridge, Exportable reports

---

## Phase 1: Database Schema & Infrastructure

### 1.1 Supabase Tables

```sql
-- Site Analysis Projects
CREATE TABLE site_analysis_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,

  -- Input configuration
  input_method TEXT CHECK (input_method IN ('url', 'sitemap', 'gsc', 'manual')),
  sitemap_url TEXT,

  -- Link to existing topical map project (optional)
  linked_project_id UUID REFERENCES projects(id),

  -- Semantic Foundation (CE/SC/CSI)
  central_entity TEXT,
  central_entity_type TEXT,
  source_context TEXT,
  source_context_type TEXT,
  central_search_intent TEXT,
  pillars_validated BOOLEAN DEFAULT FALSE,
  pillars_validated_at TIMESTAMPTZ,

  -- Status tracking
  status TEXT CHECK (status IN ('created', 'crawling', 'extracting', 'analyzing', 'completed', 'error')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_audit_at TIMESTAMPTZ
);

-- Site Pages
CREATE TABLE site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES site_analysis_projects(id) ON DELETE CASCADE,

  -- Page identification
  url TEXT NOT NULL,
  path TEXT, -- extracted path for easier querying

  -- Discovery metadata
  discovered_via TEXT CHECK (discovered_via IN ('sitemap', 'crawl', 'gsc', 'manual')),
  sitemap_lastmod TIMESTAMPTZ,
  sitemap_priority DECIMAL(2,1),

  -- Content extraction
  content_hash TEXT, -- for change detection
  title TEXT,
  meta_description TEXT,
  h1 TEXT,
  word_count INTEGER,

  -- Technical data (from Apify)
  status_code INTEGER,
  canonical_url TEXT,
  robots_meta TEXT,
  schema_types TEXT[], -- e.g., ['Article', 'FAQ', 'BreadcrumbList']
  schema_json JSONB, -- full schema data
  ttfb_ms INTEGER,
  dom_nodes INTEGER,
  html_size_kb INTEGER,

  -- Semantic data (from Jina)
  headings JSONB, -- [{level: 1, text: '...'}, ...]
  links JSONB, -- [{href, text, isInternal}, ...]
  images JSONB, -- [{src, alt}, ...]
  content_markdown TEXT,

  -- GSC metrics (if available)
  gsc_clicks INTEGER,
  gsc_impressions INTEGER,
  gsc_ctr DECIMAL(5,4),
  gsc_position DECIMAL(4,1),
  gsc_queries JSONB, -- top queries for this page

  -- Status
  crawl_status TEXT CHECK (crawl_status IN ('pending', 'crawled', 'failed', 'skipped')),
  crawl_error TEXT,
  crawled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, url)
);

-- Page Audits (versioned)
CREATE TABLE page_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES site_pages(id) ON DELETE CASCADE,
  project_id UUID REFERENCES site_analysis_projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,

  -- Overall scores
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  technical_score INTEGER,
  semantic_score INTEGER,
  link_structure_score INTEGER,
  content_quality_score INTEGER,
  visual_schema_score INTEGER,

  -- Detailed phase results
  technical_checks JSONB,
  semantic_checks JSONB,
  link_structure_checks JSONB,
  content_quality_checks JSONB,
  visual_schema_checks JSONB,

  -- AI Analysis (for deep analysis)
  ai_analysis_complete BOOLEAN DEFAULT FALSE,
  ce_alignment_score INTEGER,
  ce_alignment_explanation TEXT,
  sc_alignment_score INTEGER,
  sc_alignment_explanation TEXT,
  csi_alignment_score INTEGER,
  csi_alignment_explanation TEXT,
  content_suggestions TEXT[],

  -- Summary
  summary TEXT,
  critical_issues_count INTEGER DEFAULT 0,
  high_issues_count INTEGER DEFAULT 0,

  -- Content hash at audit time (for change detection)
  content_hash_at_audit TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(page_id, version)
);

-- Audit Tasks
CREATE TABLE audit_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES site_analysis_projects(id) ON DELETE CASCADE,
  page_id UUID REFERENCES site_pages(id) ON DELETE SET NULL,
  audit_id UUID REFERENCES page_audits(id) ON DELETE SET NULL,

  -- Task details
  rule_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  remediation TEXT,

  -- Priority and impact
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  estimated_impact TEXT CHECK (estimated_impact IN ('high', 'medium', 'low')),
  phase TEXT CHECK (phase IN ('technical', 'semantic', 'linkStructure', 'contentQuality', 'visualSchema')),

  -- Status
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  dismissed_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit History (for trend tracking)
CREATE TABLE audit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES site_analysis_projects(id) ON DELETE CASCADE,

  -- Snapshot data
  audit_date TIMESTAMPTZ DEFAULT NOW(),
  total_pages INTEGER,
  pages_audited INTEGER,
  average_score INTEGER,

  -- Phase averages
  avg_technical_score INTEGER,
  avg_semantic_score INTEGER,
  avg_link_structure_score INTEGER,
  avg_content_quality_score INTEGER,
  avg_visual_schema_score INTEGER,

  -- Issue counts
  critical_issues INTEGER,
  high_issues INTEGER,
  medium_issues INTEGER,
  low_issues INTEGER,

  -- Top issues snapshot
  top_issues JSONB -- [{ruleId, count}, ...]
);

-- Indexes for performance
CREATE INDEX idx_site_pages_project ON site_pages(project_id);
CREATE INDEX idx_site_pages_url ON site_pages(url);
CREATE INDEX idx_page_audits_page ON page_audits(page_id);
CREATE INDEX idx_page_audits_project ON page_audits(project_id);
CREATE INDEX idx_audit_tasks_project ON audit_tasks(project_id);
CREATE INDEX idx_audit_tasks_status ON audit_tasks(status);
CREATE INDEX idx_audit_history_project ON audit_history(project_id);
```

### 1.2 Neo4j Schema

```cypher
// Node types
(:Page {
  id: string,
  url: string,
  path: string,
  title: string,
  domain: string,
  projectId: string,
  overallScore: int,
  wordCount: int,
  contentHash: string
})

(:Entity {
  name: string,
  type: string  // 'central', 'supporting', 'mentioned'
})

(:Topic {
  name: string,
  clusterId: string
})

// Relationship types
(:Page)-[:LINKS_TO {
  anchorText: string,
  context: string,  // surrounding text
  position: string  // 'nav', 'content', 'footer', 'sidebar'
}]->(:Page)

(:Page)-[:MENTIONS {
  frequency: int,
  prominence: float  // 0-1 based on position (title > h1 > h2 > body)
}]->(:Entity)

(:Page)-[:BELONGS_TO]->(:Topic)

(:Entity)-[:RELATED_TO {
  strength: float
}]->(:Entity)
```

### 1.3 Neo4j Service Setup

Create `services/neo4jService.ts`:
- Connection management
- Graph CRUD operations
- Link structure queries (PageRank, hub detection)
- Entity co-occurrence analysis
- Topic clustering

---

## Phase 2: Extraction Services

### 2.1 Apify Service Enhancement

Update `services/apifyService.ts` to extract:

```typescript
interface ApifyPageData {
  url: string;
  statusCode: number;

  // Meta
  title: string;
  metaDescription: string;
  canonical: string;
  robotsMeta: string;

  // Schema
  schemaMarkup: any[];  // All JSON-LD schemas found
  schemaTypes: string[];

  // Performance
  ttfbMs: number;
  loadTimeMs: number;
  htmlSizeKb: number;
  domNodes: number;

  // Full HTML for custom parsing
  html: string;

  // Links
  internalLinks: { href: string; text: string; rel: string }[];
  externalLinks: { href: string; text: string; rel: string }[];

  // Images
  images: { src: string; alt: string; width: number; height: number }[];
}
```

### 2.2 Jina Service (already exists, enhance)

Keep semantic extraction but add:
- Better content sectioning
- Reading level analysis
- Key phrase extraction

### 2.3 Unified Extraction Orchestrator

Create `services/pageExtractionService.ts`:

```typescript
interface ExtractedPageData {
  // From Apify
  technical: ApifyPageData;

  // From Jina
  semantic: JinaExtraction;

  // Merged/computed
  contentHash: string;
  extractedAt: number;
}

// Orchestrates parallel Apify + Jina extraction
export const extractPage = async (
  url: string,
  apifyToken: string,
  jinaApiKey: string
): Promise<ExtractedPageData>
```

---

## Phase 3: Semantic Foundation Discovery

### 3.1 Pillar Discovery Service

Create `services/pillarDiscoveryService.ts`:

```typescript
interface DiscoveredPillars {
  centralEntity: {
    suggested: string;
    confidence: number;
    evidence: string[];  // quotes from content
    alternatives: string[];
  };
  sourceContext: {
    suggested: string;
    confidence: number;
    evidence: string[];
    alternatives: string[];
  };
  centralSearchIntent: {
    suggested: string;
    confidence: number;
    evidence: string[];
    alternatives: string[];
  };
}

// Analyzes crawled pages to infer CE/SC/CSI
export const discoverPillars = async (
  pages: SitePageRecord[],
  businessInfo: BusinessInfo,
  dispatch: Dispatch
): Promise<DiscoveredPillars>
```

### 3.2 Pillar Validation UI

Create `components/site-analysis/PillarValidation.tsx`:
- Display AI-suggested pillars with confidence scores
- Show evidence (quotes from content)
- Allow editing
- "Approve" / "Edit & Approve" actions
- Option to link to existing project's pillars

---

## Phase 4: Neo4j Graph Analysis

### 4.1 Graph Builder

Create `services/graphBuilderService.ts`:
- Build page nodes from crawled data
- Create LINKS_TO relationships from link data
- Extract and create Entity nodes
- Compute topic clusters

### 4.2 Graph Analysis Queries

```typescript
// Link structure analysis
export const analyzePageRank = async (projectId: string): Promise<PageRankResults>
export const findOrphanPages = async (projectId: string): Promise<string[]>
export const findHubPages = async (projectId: string): Promise<HubPage[]>
export const analyzeLinkEquity = async (projectId: string): Promise<LinkEquityMap>

// Semantic analysis
export const findEntityClusters = async (projectId: string): Promise<EntityCluster[]>
export const analyzeTopicalCoverage = async (projectId: string, ce: string): Promise<CoverageAnalysis>
export const findSemanticGaps = async (projectId: string): Promise<SemanticGap[]>
```

---

## Phase 5: Hybrid Audit Engine

### 5.1 Quick Audit (All Pages)

Create `services/quickAuditService.ts`:

Checks that can run WITHOUT AI:
- Technical: status code, canonical, robots, schema presence, performance metrics
- Link Structure: internal link count, orphan detection (via Neo4j), anchor diversity
- Visual/Schema: schema validation, image alt presence

Checks that use simple AI scoring:
- Semantic: basic CE presence check, heading structure
- Content: word count adequacy, heading hierarchy

### 5.2 Deep Audit (On-Demand)

Create `services/deepAuditService.ts`:

Full AI analysis for selected pages:
- CE alignment with detailed explanation
- SC alignment with detailed explanation
- CSI alignment with detailed explanation
- Content quality assessment
- EAV density analysis
- Contextual vector integrity
- Specific rewrite suggestions

### 5.3 Audit Orchestrator

Create `services/auditOrchestrator.ts`:

```typescript
// Run quick audit on all pages
export const runQuickAudit = async (
  project: SiteAnalysisProject,
  pages: SitePageRecord[],
  dispatch: Dispatch
): Promise<QuickAuditResults>

// Run deep audit on specific page
export const runDeepAudit = async (
  page: SitePageRecord,
  project: SiteAnalysisProject,
  dispatch: Dispatch
): Promise<DeepAuditResult>

// Generate tasks from audit results
export const generateTasks = async (
  auditResults: AuditResults,
  project: SiteAnalysisProject
): Promise<AuditTask[]>
```

---

## Phase 6: Outputs

### 6.1 Task Management

Update `services/taskService.ts`:
- Create tasks from audit findings
- Group by page or issue type
- Priority assignment
- Status tracking
- Bulk operations

### 6.2 Topical Map Bridge

Create `services/topicalMapBridgeService.ts`:

```typescript
// Analyze content gaps based on audit
export const identifyContentGaps = async (
  project: SiteAnalysisProject,
  auditResults: AuditResults
): Promise<ContentGap[]>

// Generate topical map from existing site
export const generateTopicalMapFromSite = async (
  project: SiteAnalysisProject,
  pages: SitePageRecord[],
  pillars: SEOPillars
): Promise<TopicalMap>

// Map existing pages to topics in a topical map
export const mapPagesToTopics = async (
  pages: SitePageRecord[],
  topicalMap: TopicalMap
): Promise<PageTopicMapping[]>
```

### 6.3 Report Generation

Create `services/reportService.ts`:

```typescript
// Generate PDF report
export const generatePdfReport = async (
  project: SiteAnalysisProject,
  auditResults: AuditResults,
  options: ReportOptions
): Promise<Blob>

// Generate HTML report
export const generateHtmlReport = async (
  project: SiteAnalysisProject,
  auditResults: AuditResults,
  options: ReportOptions
): Promise<string>
```

### 6.4 History & Trends

Create `services/auditHistoryService.ts`:

```typescript
// Save audit snapshot
export const saveAuditSnapshot = async (
  projectId: string,
  auditResults: AuditResults
): Promise<void>

// Get trend data
export const getScoreTrends = async (
  projectId: string,
  dateRange: DateRange
): Promise<TrendData>

// Detect changes since last audit
export const detectChanges = async (
  projectId: string
): Promise<ChangeReport>
```

---

## Phase 7: UI Components

### 7.1 Main Workflow Components

```
components/site-analysis/
├── SiteAnalysisTool.tsx          # Main orchestrator (rebuild)
├── ProjectSetup.tsx              # Input method selection (rebuild)
├── CrawlProgress.tsx             # Extraction progress (rebuild)
├── PillarValidation.tsx          # CE/SC/CSI validation (NEW)
├── AuditDashboard.tsx            # Results overview (rebuild)
├── PageList.tsx                  # Page listing with filters (NEW)
├── PageAuditDetail.tsx           # Per-page audit (rebuild)
├── DeepAnalysisModal.tsx         # Trigger deep AI analysis (NEW)
├── TaskManager.tsx               # Task list and management (NEW)
├── TrendChart.tsx                # Score history visualization (NEW)
├── TopicalMapBridge.tsx          # Content gap → topical map (NEW)
└── ReportExport.tsx              # Report generation UI (NEW)
```

### 7.2 Workflow States

```
SETUP → CRAWLING → PILLARS → ANALYZING → RESULTS
         ↓
      EXTRACTING
         ↓
     GRAPH_BUILD
```

---

## Phase 8: Implementation Order

### Sprint 1: Foundation (Database + Basic Flow)
1. Create Supabase tables and migrations
2. Set up Neo4j connection service
3. Rebuild extraction orchestrator (Apify + Jina)
4. Basic UI flow: Setup → Crawl → Results

### Sprint 2: Semantic Discovery
5. Implement pillar discovery service
6. Create PillarValidation UI
7. Link to existing project option
8. Store validated pillars

### Sprint 3: Graph Analysis
9. Build Neo4j graph from crawled data
10. Implement link structure queries
11. Add entity extraction and clustering
12. Integrate graph insights into audit

### Sprint 4: Hybrid Audit
13. Implement quick audit (non-AI checks)
14. Implement deep audit (AI analysis)
15. Generate tasks from findings
16. Task management UI

### Sprint 5: Outputs & History
17. Report generation (PDF/HTML)
18. Audit history snapshots
19. Trend visualization
20. Change detection

### Sprint 6: Topical Map Bridge
21. Content gap analysis
22. Generate topical map from site
23. Map pages to topics
24. UI for bridge workflow

---

## File Changes Summary

### New Services (12)
- `services/neo4jService.ts`
- `services/pageExtractionService.ts`
- `services/pillarDiscoveryService.ts`
- `services/graphBuilderService.ts`
- `services/graphAnalysisService.ts`
- `services/quickAuditService.ts`
- `services/deepAuditService.ts`
- `services/auditOrchestrator.ts`
- `services/taskService.ts`
- `services/topicalMapBridgeService.ts`
- `services/reportService.ts`
- `services/auditHistoryService.ts`

### Updated Services (3)
- `services/apifyService.ts` - Enhanced extraction
- `services/jinaService.ts` - Additional analysis
- `services/siteAnalysisService.ts` - Complete rebuild

### New UI Components (8)
- `components/site-analysis/PillarValidation.tsx`
- `components/site-analysis/PageList.tsx`
- `components/site-analysis/DeepAnalysisModal.tsx`
- `components/site-analysis/TaskManager.tsx`
- `components/site-analysis/TrendChart.tsx`
- `components/site-analysis/TopicalMapBridge.tsx`
- `components/site-analysis/ReportExport.tsx`
- `components/site-analysis/GraphInsights.tsx`

### Updated UI Components (4)
- `components/site-analysis/SiteAnalysisTool.tsx` - Rebuild
- `components/site-analysis/ProjectSetup.tsx` - Rebuild
- `components/site-analysis/AuditDashboard.tsx` - Rebuild
- `components/site-analysis/PageAuditDetail.tsx` - Rebuild

### Database (1)
- `supabase/migrations/xxx_site_analysis_tables.sql`

### Types (1)
- `types.ts` - Add/update site analysis types

---

## Success Criteria

1. **Extraction**: Both Apify (technical) and Jina (semantic) data captured
2. **Schema Detection**: JSON-LD schemas correctly extracted and validated
3. **Pillars**: CE/SC/CSI inferred from content and user-validated
4. **Graph**: Neo4j populated with pages, links, entities
5. **Quick Audit**: All pages scored in <1 minute for 100 pages
6. **Deep Audit**: Per-page AI analysis with specific recommendations
7. **Persistence**: All data saved to Supabase, survives refresh
8. **History**: Re-audits show trends, detect content changes
9. **Tasks**: Actionable items generated with priorities
10. **Bridge**: Content gaps identified, topical map generation option
