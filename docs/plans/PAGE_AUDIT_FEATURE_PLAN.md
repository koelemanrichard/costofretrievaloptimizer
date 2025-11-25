# Site Analysis & Page Audit Feature - Implementation Plan

## Overview
Build a standalone **Site Analysis Tool** with site-first architecture based on Koray's Holistic SEO framework. The tool enables crawling existing websites, auditing pages, and eventually generating topical maps from existing content.

## Feature Summary
- **Architecture**: Site-first (site → pages → audits → topical map)
- **Position**: Standalone tool, reuses existing services
- **Data Input**: URL, Sitemap, GSC data upload
- **Data Sources**: Jina.ai, Apify crawling, GSC
- **Output**: Site overview, page audits, action items, (future: topical map)

## Roadmap
1. **Phase A**: Site crawl & data ingestion ← Current focus
2. **Phase B**: Page-level audits
3. **Phase C**: Topical map generation from existing site

---

## Site-First Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SITE ANALYSIS PROJECT                       │
│  (Container for all site-related data)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   INPUT      │    │   CRAWL      │    │   STORAGE    │       │
│  │  - URL       │───▶│  - Apify     │───▶│  - Pages[]   │       │
│  │  - Sitemap   │    │  - Jina.ai   │    │  - Links[]   │       │
│  │  - GSC CSV   │    │              │    │  - GSC Data  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                 │                │
│                                                 ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    PAGE AUDITS                            │   │
│  │  For each page: Technical, Semantic, Links, Content,     │   │
│  │  Visual/Schema → Score + Action Items                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                 │                │
│                                                 ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              TOPICAL MAP GENERATION (Future)              │   │
│  │  Extract CE/SC/CSI → Cluster pages → Generate map        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation & Types (Day 1-2)

### 1.1 Create Site-Level Type Definitions
**File**: `types.ts` (append)

```typescript
// ============================================
// SITE ANALYSIS TYPES (Site-First Architecture)
// ============================================

// Site Analysis Project - Top-level container
export interface SiteAnalysisProject {
  id: string;
  name: string;
  domain: string;
  status: 'created' | 'crawling' | 'analyzing' | 'completed' | 'error';
  createdAt: number;
  updatedAt: number;

  // Input sources
  inputMethod: 'url' | 'sitemap' | 'gsc' | 'manual';
  sitemapUrl?: string;

  // Crawl state
  crawlSession?: CrawlSession;

  // Extracted site-level data
  siteSemantics?: SiteSemantics;

  // Pages
  pages: SitePageRecord[];

  // GSC data (if uploaded)
  gscData?: GscRow[];

  // Future: Generated topical map
  generatedTopicalMapId?: string;
}

// Crawl session tracking
export interface CrawlSession {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  totalUrls: number;
  crawledUrls: number;
  failedUrls: number;
  errors: string[];
}

// Individual page record in site analysis
export interface SitePageRecord {
  id: string;
  url: string;
  status: 'pending' | 'crawled' | 'analyzed' | 'audited' | 'error';
  crawledAt?: number;

  // Raw extracted data
  rawData?: PageRawData;

  // Content hash for change detection
  contentHash?: string;

  // Audit result (when audited)
  auditResult?: PageAuditResult;

  // GSC metrics for this URL
  gscMetrics?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    queries: string[];
  };
}

// Site-level semantic extraction
export interface SiteSemantics {
  centralEntity: string;
  centralEntityConfidence: number;
  sourceContext: string;
  centralSearchIntent: string;
  dominantNGrams: { phrase: string; count: number }[];
  sectionClassification: {
    coreSection: string[];  // URLs in monetization/core section
    authorSection: string[]; // URLs in informational/author section
  };
}

// ============================================
// PAGE-LEVEL TYPES
// ============================================

export interface PageAuditInput {
  url: string;
  siteProjectId?: string;  // Link to parent site project
  includeGscData?: boolean;
  gscData?: GscRow[];
}

export interface PageAuditResult {
  url: string;
  timestamp: number;
  overallScore: number;
  summary: string;
  phases: {
    technical: PhaseAuditResult;      // Phase 0: CoR, TTFB, DOM
    semantic: PhaseAuditResult;       // Phase 1: CE, SC, CSI
    linkStructure: PhaseAuditResult;  // Phase 3: Links, bridges
    contentQuality: PhaseAuditResult; // Phase 4: Vectors, EAV
    visualSchema: PhaseAuditResult;   // Phase 5: Schema, images
  };
  actionItems: PageAuditActionItem[];
  rawData: PageRawData;
}

export interface PhaseAuditResult {
  name: string;
  score: number;
  status: 'pass' | 'warning' | 'fail';
  checks: AuditCheck[];
}

export interface AuditCheck {
  id: string;
  rule: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  score: number;
  actual: string | number | null;
  expected: string | number | null;
  remediation?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface PageAuditActionItem {
  id: string;
  phase: string;
  checkId: string;
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'quick' | 'medium' | 'complex';
  impact: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
}

export interface PageRawData {
  html?: string;
  jinaContent?: JinaExtraction;
  apifyData?: ApifyTechnicalData;
  gscData?: GscRow[];
}

export interface JinaExtraction {
  title: string;
  description: string;
  content: string;
  headings: { level: number; text: string }[];
  links: { href: string; text: string; isInternal: boolean }[];
  images: { src: string; alt: string }[];
  schema: any[];
  wordCount: number;
  readingTime: number;
}

export interface ApifyTechnicalData {
  statusCode: number;
  ttfb: number;
  domSize: number;
  htmlSize: number;
  linkCount: number;
  canonicalUrl: string | null;
  robotsMeta: string | null;
}
```

### 1.2 Create Audit Rules Configuration
**File**: `config/pageAuditRules.ts` (new)

Define all audit rules from the specification with thresholds:
- Phase 0: TTFB < 200ms, DOM size limits, status codes
- Phase 1: CE/SC/CSI detection rules
- Phase 3: Link count < 150, anchor text rules
- Phase 4: Heading vector, EAV density, discourse rules
- Phase 5: Schema validation, image metadata rules

---

## Phase 2: Services Layer (Day 3-5)

### 2.0 Site Analysis Orchestrator (NEW - Site-First)
**File**: `services/siteAnalysisService.ts` (new)

Main orchestrator for site-level operations:

```typescript
export const createSiteAnalysisProject = async (
  input: { domain: string; name: string; inputMethod: 'url' | 'sitemap' | 'gsc' },
  businessInfo: BusinessInfo
): Promise<SiteAnalysisProject> => {
  // Create project container
};

export const startSiteCrawl = async (
  project: SiteAnalysisProject,
  options: { maxPages?: number; includeExternal?: boolean },
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<CrawlSession> => {
  // 1. Discover URLs (from sitemap, homepage crawl, or GSC)
  // 2. Queue pages for crawling
  // 3. Track progress
};

export const importGscData = async (
  project: SiteAnalysisProject,
  csvData: string
): Promise<GscRow[]> => {
  // Parse GSC CSV export
  // Match to existing pages or create new page records
};

export const extractSiteSemantics = async (
  project: SiteAnalysisProject,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<SiteSemantics> => {
  // AI analysis across all pages to extract CE, SC, CSI
  // N-gram analysis for dominant phrases
  // Section classification
};

export const auditAllPages = async (
  project: SiteAnalysisProject,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>,
  options?: { concurrency?: number; priorityUrls?: string[] }
): Promise<void> => {
  // Batch audit all pages with progress tracking
};

// Future Phase C
export const generateTopicalMapFromSite = async (
  project: SiteAnalysisProject,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<{ coreTopics: EnrichedTopic[]; outerTopics: EnrichedTopic[] }> => {
  // Use site semantics + page content to generate topical map
};
```

### 2.1 Jina.ai Service
**File**: `services/jinaService.ts` (new)

```typescript
const JINA_READER_URL = 'https://r.jina.ai/';

export const extractPageContent = async (
  url: string,
  apiKey: string
): Promise<JinaExtraction> => {
  const response = await fetch(`${JINA_READER_URL}${url}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
      'X-Return-Format': 'markdown'
    }
  });
  // Parse and structure response
};
```

### 2.2 Technical Data Service (Apify Extension)
**File**: `services/apifyService.ts` (extend)

Add function to extract technical metrics:
```typescript
export const extractTechnicalMetrics = async (
  url: string,
  apiToken: string
): Promise<ApifyTechnicalData> => {
  // Use Website Content Crawler with technical metrics
  // Extract: TTFB, DOM size, link count, canonical, robots
};
```

### 2.3 Page Audit Orchestrator Service
**File**: `services/pageAuditService.ts` (new)

Main orchestration service that:
1. Fetches data from all sources (Jina, Apify, GSC)
2. Runs all phase audits
3. Aggregates results
4. Generates action items

```typescript
export const auditPage = async (
  input: PageAuditInput,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<PageAuditResult> => {
  // 1. Fetch raw data in parallel
  const [jinaData, apifyData] = await Promise.all([
    jinaService.extractPageContent(input.url, businessInfo.jinaApiKey),
    apifyService.extractTechnicalMetrics(input.url, businessInfo.apifyToken)
  ]);

  // 2. Run phase audits
  const phases = {
    technical: await auditTechnical(apifyData),
    semantic: await auditSemantic(jinaData, businessInfo, dispatch),
    linkStructure: await auditLinkStructure(jinaData),
    contentQuality: await auditContentQuality(jinaData, businessInfo, dispatch),
    visualSchema: await auditVisualSchema(jinaData)
  };

  // 3. Calculate overall score
  // 4. Generate action items
  // 5. Return result
};
```

### 2.4 AI-Powered Audit Functions
**File**: `services/ai/pageAuditAnalysis.ts` (new)

AI functions for semantic analysis:
- `extractPageSemantics()` - CE, SC, CSI detection
- `analyzeContentQuality()` - EAV density, discourse
- `evaluateContextualVector()` - Heading flow analysis
- `generateRemediations()` - Actionable fixes

---

## Phase 3: UI Components (Day 4-5)

### 3.1 Page Audit Entry Point
**File**: `components/PageAuditTool.tsx` (new)

Main standalone component:
- URL input field
- Options (include GSC data, select data sources)
- Start audit button
- Progress indicator
- Results display

### 3.2 Audit Results Display
**File**: `components/PageAuditResults.tsx` (new)

```typescript
interface Props {
  result: PageAuditResult;
  onActionStatusChange: (itemId: string, status: string) => void;
  onExport: (format: 'json' | 'csv' | 'pdf') => void;
}
```

Features:
- Overall score circle (reuse ProgressCircle)
- Phase-by-phase breakdown with expandable sections
- Pass/warning/fail indicators for each check
- Action items checklist with filters

### 3.3 Phase Audit Cards
**File**: `components/audit/PhaseAuditCard.tsx` (new)

Reusable card for each phase:
- Phase name and score
- Expandable check list
- Status badges (pass/warning/fail)
- Remediation suggestions

### 3.4 Action Items Panel
**File**: `components/audit/ActionItemsPanel.tsx` (new)

Interactive checklist:
- Filter by priority/phase/status
- Mark as complete/dismissed
- Effort/impact indicators
- Bulk actions

### 3.5 Export Report Modal
**File**: `components/audit/ExportReportModal.tsx` (new)

Export options:
- JSON (raw data)
- CSV (action items only)
- PDF (formatted report)

---

## Phase 4: Integration (Day 6)

### 4.1 State Management
**File**: `state/appState.ts` (extend)

Add actions:
```typescript
| { type: 'START_PAGE_AUDIT'; payload: PageAuditInput }
| { type: 'PAGE_AUDIT_PROGRESS'; payload: { phase: string; progress: number } }
| { type: 'PAGE_AUDIT_COMPLETE'; payload: PageAuditResult }
| { type: 'PAGE_AUDIT_ERROR'; payload: string }
| { type: 'UPDATE_ACTION_ITEM'; payload: { id: string; status: string } }
```

### 4.2 Navigation Integration
**File**: `App.tsx` (extend)

Add route/tab for Page Audit tool:
- New navigation item
- Render PageAuditTool component
- Maintain separation from existing workflows

### 4.3 Supabase Storage (Optional)
**File**: `supabase/migrations/xxx_add_page_audits.sql` (new)

```sql
CREATE TABLE page_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  url TEXT NOT NULL,
  result JSONB NOT NULL,
  overall_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 5: Testing & Polish (Day 7)

### 5.1 Test with Real URLs
- Test various page types (homepage, article, product)
- Verify all audit checks work correctly
- Validate scoring accuracy

### 5.2 Error Handling
- Handle API failures gracefully
- Timeout handling for slow pages
- Invalid URL handling

### 5.3 UI Polish
- Loading states for each phase
- Error messages
- Responsive design

---

## File Structure Summary (Site-First Architecture)

```
services/
├── siteAnalysisService.ts      [NEW] ← Main orchestrator
├── jinaService.ts              [NEW]
├── pageAuditService.ts         [NEW]
├── sitemapService.ts           [NEW] ← Parse sitemaps
├── gscImportService.ts         [NEW] ← GSC CSV parsing
├── apifyService.ts             [EXTEND]
└── ai/
    ├── siteSemanticAnalysis.ts [NEW] ← CE/SC/CSI extraction
    └── pageAuditAnalysis.ts    [NEW]

components/
├── SiteAnalysisTool.tsx        [NEW] ← Main entry point
├── site-analysis/
│   ├── SiteSetupWizard.tsx     [NEW] ← URL/Sitemap/GSC input
│   ├── CrawlProgressPanel.tsx  [NEW] ← Crawl status & progress
│   ├── SiteOverviewDashboard.tsx [NEW] ← Site-level metrics
│   ├── PageListPanel.tsx       [NEW] ← All pages with status
│   └── SiteSemanticsCard.tsx   [NEW] ← CE/SC/CSI display
├── page-audit/
│   ├── PageAuditResults.tsx    [NEW]
│   ├── PhaseAuditCard.tsx      [NEW]
│   ├── ActionItemsPanel.tsx    [NEW]
│   ├── AuditCheckItem.tsx      [NEW]
│   └── ExportReportModal.tsx   [NEW]
└── shared/
    └── GscUploadModal.tsx      [NEW]

config/
├── pageAuditRules.ts           [NEW]
└── siteAnalysisConfig.ts       [NEW]

types.ts                        [EXTEND] ← Site + Page types
state/
├── appState.ts                 [EXTEND]
└── siteAnalysisState.ts        [NEW] ← Dedicated state slice
App.tsx                         [EXTEND]
```

---

## Audit Checks by Phase

### Phase 0: Technical (CoR)
| Check | Rule | Threshold |
|-------|------|-----------|
| TTFB | Time to First Byte | < 200ms (optimal < 100ms) |
| DOM Size | Document Object Model size | < 1500 nodes |
| HTML Size | Response size | < 100KB |
| Status Code | HTTP response | 200 |
| Canonical | Canonical tag present | Required |
| Robots | No noindex | Required |

### Phase 1: Semantic Foundation
| Check | Rule | Validation |
|-------|------|------------|
| CE Detection | Central Entity identified | AI analysis |
| SC Alignment | Source Context matches content | AI analysis |
| CSI Presence | Central Search Intent in H1/title | AI analysis |
| Section Class | Core vs Author section | AI analysis |

### Phase 3: Link Structure
| Check | Rule | Threshold |
|-------|------|-----------|
| Link Count | Total internal links | < 150 |
| Link Prominence | Links in main content | > 50% |
| Anchor Diversity | Unique anchor texts | > 70% |
| Annotation Text | Surrounding text relevance | AI analysis |

### Phase 4: Content Quality
| Check | Rule | Validation |
|-------|------|------------|
| Heading Vector | Logical H1→Hx flow | AI analysis |
| Subordinate Text | First sentence responsiveness | AI analysis |
| Discourse Integration | Paragraph transitions | AI analysis |
| EAV Density | One fact per sentence | AI analysis |
| Content Format | Correct format for query type | AI analysis |

### Phase 5: Visual & Schema
| Check | Rule | Validation |
|-------|------|-----------|
| Visual Hierarchy | Heading sizes descend | CSS analysis |
| Image Alt Tags | Descriptive, not H1 repeat | Text analysis |
| Schema Markup | Valid JSON-LD | Schema validation |
| Schema Completeness | Required fields present | Schema check |

---

## Success Criteria

### Phase A: Site Crawl & Data Ingestion
1. ✅ User can create a site analysis project
2. ✅ Support 3 input methods: URL, Sitemap, GSC CSV
3. ✅ Crawl pages using Apify + Jina.ai
4. ✅ Track crawl progress with real-time updates
5. ✅ Store pages with content hash for change detection
6. ✅ Extract site-level semantics (CE, SC, CSI)

### Phase B: Page Audits
7. ✅ Audit individual pages (all 5 phases)
8. ✅ Batch audit all pages in project
9. ✅ Overall + per-phase compliance scores
10. ✅ Actionable items with priorities
11. ✅ Interactive checklist for task tracking
12. ✅ Export capability (JSON, CSV)

### Phase C: Topical Map Generation (Future)
13. ⏳ Generate topical map from existing site content
14. ⏳ Map existing pages to topics
15. ⏳ Identify content gaps

### Non-Functional
16. ✅ Existing app functionality unaffected
17. ✅ Reuses existing services (AI, Apify, Supabase)
18. ✅ Scalable to 1000+ page sites

---

## Future Extensibility

This architecture directly supports:

| Future Feature | How It Fits |
|----------------|-------------|
| **Multi-site management** | Each `SiteAnalysisProject` is independent |
| **Scheduled re-crawls** | `contentHash` enables change detection |
| **Competitor analysis** | Create projects for competitor domains |
| **Topical map from site** | `SiteSemantics` + pages → `generateTopicalMapFromSite()` |
| **Content gap analysis** | Compare site topics vs ideal topical map |
| **Historical tracking** | Store audit results over time |
| **Team collaboration** | Link projects to Supabase user/org |
