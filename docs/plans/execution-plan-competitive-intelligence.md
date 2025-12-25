# Execution Plan: Topic-Level Competitive Intelligence

> **Document Created:** December 25, 2024
> **Status:** Ready for Execution
> **Estimated Total Effort:** 8-12 days
> **Prerequisites:** All decisions made, DataForSEO available

---

## Existing Infrastructure

### Already Available

| Component | Location | Current Capability | Gap |
|-----------|----------|-------------------|-----|
| **DataForSEO SERP** | `services/serpApiService.ts` | `fetchSerpResults()` - organic results | Only organic, no features |
| **DataForSEO Keywords** | `services/serpApiService.ts` | `fetchKeywordSearchVolume()` | Working |
| **Competitor Discovery** | `services/serpApiService.ts` | `discoverInitialCompetitors()` | Filters publications |
| **Caching** | `services/cacheService.ts` | Generic cache service | Needs 7-day TTL for SERP |
| **Jina Reader** | `services/jinaService.ts` | Content extraction | Markdown only, need HTML |
| **Perplexity** | `services/perplexityService.ts` | AI queries | Need SERP inference prompts |
| **EAV Extraction** | `services/ai/` | Existing EAV logic | Need classification |
| **Gap Graph** | `components/visualization/` | CompetitorGapGraph | Needs cluster filter |

### DataForSEO Response Fields (Currently Unused)

The API returns more data than we currently extract:

```typescript
// Currently extracted:
{ position, title, link, snippet }

// Available but not extracted:
{
  type: string,              // 'organic', 'featured_snippet', 'people_also_ask', etc.
  featured_snippet?: string,  // Content if this is the FS
  breadcrumb?: string,

  // Rich result data
  rating?: { value, votes_count, rating_max },
  price?: { current, regular, currency },

  // Extended organic data
  domain?: string,
  cached_page_link?: string,
  related_search_queries?: string[],

  // SERP features present in response
  item_types: string[],       // All feature types on this SERP
}
```

---

## Execution Phases

### Phase 0: Infrastructure Updates (Day 1-2)

**Goal:** Prepare the foundation for all subsequent work.

#### Task 0.1: Extend SERP Cache to 7 Days
**File:** `services/serpApiService.ts`
**Effort:** 30 minutes

```typescript
// Change line 196:
// FROM: return cacheService.cacheThrough('serp:dataforseo', { query, locationName, languageCode }, fetchFn, 3600);
// TO:
return cacheService.cacheThrough('serp:dataforseo', { query, locationName, languageCode }, fetchFn, 604800); // 7 days
```

#### Task 0.2: Extract Full SERP Data from DataForSEO
**File:** `services/serpApiService.ts`
**Effort:** 2 hours

Create new function that extracts all available data:

```typescript
export interface FullSerpResult {
  // Organic results
  organicResults: {
    position: number;
    url: string;
    domain: string;
    title: string;
    snippet: string;
    breadcrumb?: string;
    rating?: { value: number; count: number };
    price?: { current: number; currency: string };
  }[];

  // SERP features detected
  features: {
    hasFeaturedSnippet: boolean;
    featuredSnippet?: { type: 'paragraph' | 'list' | 'table'; content: string; url: string };
    hasPeopleAlsoAsk: boolean;
    peopleAlsoAsk: { question: string; url?: string }[];
    hasImagePack: boolean;
    hasVideoCarousel: boolean;
    hasLocalPack: boolean;
    hasKnowledgePanel: boolean;
    hasSitelinks: boolean;
    hasReviews: boolean;
    hasFaq: boolean;
  };

  // Metadata
  query: string;
  totalResults: number;
  searchTime: number;
  fetchedAt: Date;
}

export const fetchFullSerpData = async (
  query: string,
  login: string,
  password: string,
  locationName: string,
  languageCode: string
): Promise<FullSerpResult> => {
  // Implementation extracts all item types from DataForSEO response
};
```

#### Task 0.3: Create AI Inference SERP Service
**File:** `services/ai/serpInference.ts` (new)
**Effort:** 3 hours

```typescript
export interface InferredSerpData {
  mode: 'inferred';
  confidence: number;

  // Inferred data
  dominantIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  dominantContentType: 'guide' | 'listicle' | 'product' | 'comparison' | 'how-to' | 'faq';
  estimatedTopDomains: string[];
  estimatedHeadlinePatterns: string[];
  estimatedWordCount: { min: number; max: number; avg: number };
  likelyFeatures: string[];

  // For fast-track gap analysis
  estimatedRequirements: {
    schemaTypes: string[];
    contentElements: string[];
    authoritySignals: string[];
  };
}

export const inferSerpData = async (
  topic: string,
  context: { businessType: string; targetMarket: string }
): Promise<InferredSerpData> => {
  // Use Perplexity/Gemini to infer SERP characteristics
};
```

#### Task 0.4: Create SERP Service Facade
**File:** `services/serpService.ts` (new)
**Effort:** 1 hour

```typescript
export type SerpMode = 'fast' | 'deep';

export interface SerpAnalysisResult {
  mode: SerpMode;
  data: FullSerpResult | InferredSerpData;
  cachedAt?: Date;
  expiresAt?: Date;
}

export const analyzeSerpForTopic = async (
  topic: string,
  mode: SerpMode,
  credentials: { dataforseoLogin?: string; dataforseoPassword?: string },
  context: { locationName: string; languageCode: string; businessType: string }
): Promise<SerpAnalysisResult> => {
  if (mode === 'fast') {
    return { mode, data: await inferSerpData(topic, context) };
  } else {
    if (!credentials.dataforseoLogin) {
      throw new Error('DataForSEO credentials required for deep analysis');
    }
    return { mode, data: await fetchFullSerpData(topic, credentials.dataforseoLogin, credentials.dataforseoPassword, context.locationName, context.languageCode) };
  }
};
```

---

### Phase 1: Content Layer Enhancements (Day 2-3)

**Goal:** Implement Central Entity Consistency + Root/Rare/Unique Classification

#### Task 1.1: Create Attribute Classifier Service
**File:** `services/ai/attributeClassifier.ts` (new)
**Effort:** 3 hours

Implements the classification algorithm from `definitive-improvements-plan.md`:
- Input: EAVs from multiple competitors
- Output: Each EAV tagged as 'root' | 'rare' | 'unique'
- Logic: Based on frequency across top 10 (70%+ = root, 20-69% = rare, <20% = unique)

#### Task 1.2: Create Central Entity Analyzer Service
**File:** `services/ai/centralEntityAnalyzer.ts` (new)
**Effort:** 4 hours

Implements entity consistency checking:
- Detect central entity from H1, title, frequency
- Check presence in H2/H3 headings
- Check distribution across content thirds
- Detect contextual drift

#### Task 1.3: Enhance Content Layer Types
**File:** `types/competitiveIntelligence.ts` (new)
**Effort:** 1 hour

Add all Content Layer types from the definitive plan:
- `ContentLayerAnalysis` with `attributeDistribution`
- `centralEntityAnalysis` with `contextualVector`
- Enhanced `SemanticTriple` with `attributeRarity`

#### Task 1.4: Create Content Analysis Orchestrator
**File:** `services/contentAnalysisService.ts` (new)
**Effort:** 2 hours

Orchestrates:
1. Fetch page content (Jina)
2. Extract EAVs (existing service)
3. Classify attributes (new)
4. Analyze central entity (new)
5. Return `ContentLayerAnalysis`

---

### Phase 2: Technical Layer (Day 4-5)

**Goal:** Schema about/mentions + Dynamic Navigation Detection

#### Task 2.1: Extend Jina Service for HTML
**File:** `services/jinaService.ts`
**Effort:** 2 hours

Add option to return raw HTML alongside markdown for schema/HTML analysis.

#### Task 2.2: Create Schema Entity Analyzer
**File:** `services/schemaEntityAnalyzer.ts` (new)
**Effort:** 3 hours

Implements `about`/`mentions` detection:
- Parse JSON-LD from HTML
- Check for `about` property with Wikidata IDs
- Check for `mentions` property
- Calculate disambiguation score

#### Task 2.3: Create Navigation Analyzer
**File:** `services/navigationAnalyzer.ts` (new)
**Effort:** 3 hours

Implements dynamic vs static navigation detection:
- Extract header/footer/sidebar links
- Compare across page samples (if available)
- Detect mega-menu patterns
- Check for corporate links (About, Privacy, etc.)

#### Task 2.4: Create Technical Layer Orchestrator
**File:** `services/technicalLayerService.ts` (new)
**Effort:** 2 hours

Orchestrates:
1. Fetch HTML (Jina extended)
2. Extract and analyze schema
3. Analyze navigation patterns
4. Extract HTML semantic tags
5. Return `TechnicalLayerAnalysis`

---

### Phase 3: Link Layer (Day 6-8)

**Goal:** All 4 link improvements (Position, Anchor Quality, Flow Direction, Bridge Justification)

#### Task 3.1: Create Link Extractor Service
**File:** `services/linkExtractor.ts` (new)
**Effort:** 2 hours

Extract all links from HTML with:
- Position (paragraph number, percentage through content)
- Context (surrounding text)
- Anchor text
- Destination classification (internal/external)

#### Task 3.2: Create Link Position Analyzer
**File:** `services/linkPositionAnalyzer.ts` (new)
**Effort:** 2 hours

For each link, determine:
- Content zone (early/middle/late)
- Content type (main/supplementary/navigation)
- Optimal placement score

#### Task 3.3: Create Anchor Text Quality Analyzer
**File:** `services/anchorTextQualityAnalyzer.ts` (new)
**Effort:** 2 hours

Implements all anchor text rules:
- Repetition check (max 3 per anchor-target)
- Generic anchor detection
- First-word placement detection
- Annotation text quality

#### Task 3.4: Create PageRank Flow Analyzer
**File:** `services/pageRankFlowAnalyzer.ts` (new)
**Effort:** 4 hours

Implements flow direction analysis:
- Classify page type (core/author/bridge)
- Classify link destinations
- Determine flow direction (correct/reversed)
- Identify flow issues

#### Task 3.5: Create Bridge Justification Analyzer
**File:** `services/bridgeJustificationAnalyzer.ts` (new)
**Effort:** 4 hours

Implements bridge quality analysis:
- Detect subordinate headings before links
- Detect contextual introduction text
- Calculate cluster distance
- Determine if bridge is justified

#### Task 3.6: Create Link Layer Orchestrator
**File:** `services/linkAnalysisService.ts` (new)
**Effort:** 2 hours

Orchestrates all link analyzers into `LinkLayerAnalysis`.

---

### Phase 4: Integration & UI (Day 9-10)

**Goal:** Wire everything together, create UI components

#### Task 4.1: Create Holistic Competitor Analyzer
**File:** `services/holisticCompetitorAnalyzer.ts` (new)
**Effort:** 3 hours

Master orchestrator that:
1. Gets SERP data (fast or deep mode)
2. For each competitor URL:
   - Runs Content Layer analysis
   - Runs Technical Layer analysis
   - Runs Link Layer analysis
3. Aggregates patterns across competitors
4. Identifies gaps
5. Generates action plan

#### Task 4.2: Create Topic SERP Panel Component
**File:** `components/analysis/TopicSerpPanel.tsx` (new)
**Effort:** 4 hours

UI showing:
- Mode selector (Fast/Deep)
- SERP snapshot summary
- Gap score
- Priority score
- Attribute gaps (Root/Rare/Unique)

#### Task 4.3: Create Competitor Analysis Tabs
**File:** `components/analysis/CompetitorAnalysisTabs.tsx` (new)
**Effort:** 4 hours

Tabbed view with:
- Content tab (entity consistency, attribute distribution)
- Technical tab (schema quality, navigation type)
- Links tab (flow direction, anchor quality, bridge justification)
- Comparison table

#### Task 4.4: Integrate into TopicDetailPanel
**File:** `components/TopicDetailPanel.tsx`
**Effort:** 2 hours

Add "Analyze SERP" button and display results.

#### Task 4.5: Add to Content Brief Modal
**File:** `components/modals/ContentBriefModal.tsx`
**Effort:** 2 hours

Add "SERP Intel" tab with competitive insights.

---

### Phase 5: Database & Persistence (Day 10-11)

**Goal:** Store analysis results for reuse

#### Task 5.1: Create Database Migration
**File:** `supabase/migrations/YYYYMMDD_topic_serp_analysis.sql` (new)
**Effort:** 1 hour

```sql
CREATE TABLE topic_serp_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  mode VARCHAR(10) NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),

  serp_data JSONB,
  competitors JSONB,
  patterns JSONB,
  gaps JSONB,
  action_plan JSONB,

  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_topic_serp_topic ON topic_serp_analysis(topic_id);
CREATE INDEX idx_topic_serp_expires ON topic_serp_analysis(expires_at);
```

#### Task 5.2: Create Persistence Service
**File:** `services/topicAnalysisPersistence.ts` (new)
**Effort:** 2 hours

Save and retrieve analysis results from Supabase.

---

## Execution Order Summary

```
Day 1-2: Phase 0 - Infrastructure
├── 0.1: Extend SERP cache to 7 days (30 min)
├── 0.2: Extract full SERP data from DataForSEO (2 hr)
├── 0.3: Create AI inference SERP service (3 hr)
└── 0.4: Create SERP service facade (1 hr)

Day 2-3: Phase 1 - Content Layer
├── 1.1: Attribute classifier service (3 hr)
├── 1.2: Central entity analyzer (4 hr)
├── 1.3: Types file (1 hr)
└── 1.4: Content analysis orchestrator (2 hr)

Day 4-5: Phase 2 - Technical Layer
├── 2.1: Extend Jina for HTML (2 hr)
├── 2.2: Schema entity analyzer (3 hr)
├── 2.3: Navigation analyzer (3 hr)
└── 2.4: Technical layer orchestrator (2 hr)

Day 6-8: Phase 3 - Link Layer
├── 3.1: Link extractor (2 hr)
├── 3.2: Link position analyzer (2 hr)
├── 3.3: Anchor text quality analyzer (2 hr)
├── 3.4: PageRank flow analyzer (4 hr)
├── 3.5: Bridge justification analyzer (4 hr)
└── 3.6: Link layer orchestrator (2 hr)

Day 9-10: Phase 4 - Integration & UI
├── 4.1: Holistic competitor analyzer (3 hr)
├── 4.2: Topic SERP panel component (4 hr)
├── 4.3: Competitor analysis tabs (4 hr)
├── 4.4: TopicDetailPanel integration (2 hr)
└── 4.5: ContentBriefModal integration (2 hr)

Day 10-11: Phase 5 - Database
├── 5.1: Database migration (1 hr)
└── 5.2: Persistence service (2 hr)
```

---

## Success Criteria

| Phase | Criterion | How to Verify |
|-------|-----------|---------------|
| 0 | SERP data cached for 7 days | Check cache timestamps |
| 0 | AI inference returns plausible SERP data | Manual verification on 5 topics |
| 1 | EAVs classified as root/rare/unique | Check classification on competitor content |
| 1 | Central entity consistency score calculated | Score varies between good/bad content |
| 2 | Schema about/mentions detected correctly | Test on 5 pages with known schema |
| 2 | Dynamic vs static navigation detected | Test on 5 different site types |
| 3 | Link positions accurately calculated | Verify against manual inspection |
| 3 | Anchor quality issues identified | Test on page with known issues |
| 3 | PageRank flow direction correct | Verify on author vs core pages |
| 4 | UI displays all analysis data | Visual verification |
| 5 | Analysis persists and retrieves | Analyze, reload, verify data present |

---

## Getting Started

### Start with Task 0.1
```bash
# Open the file
code services/serpApiService.ts

# Find line 196 (SERP cache)
# Change 3600 to 604800
```

### Then Task 0.2
```bash
# Create the enhanced SERP extraction
# Test with a sample query
```

---

## Files to Create (Summary)

| Phase | New Files |
|-------|-----------|
| 0 | `services/ai/serpInference.ts`, `services/serpService.ts` |
| 1 | `services/ai/attributeClassifier.ts`, `services/ai/centralEntityAnalyzer.ts`, `types/competitiveIntelligence.ts`, `services/contentAnalysisService.ts` |
| 2 | `services/schemaEntityAnalyzer.ts`, `services/navigationAnalyzer.ts`, `services/technicalLayerService.ts` |
| 3 | `services/linkExtractor.ts`, `services/linkPositionAnalyzer.ts`, `services/anchorTextQualityAnalyzer.ts`, `services/pageRankFlowAnalyzer.ts`, `services/bridgeJustificationAnalyzer.ts`, `services/linkAnalysisService.ts` |
| 4 | `components/analysis/TopicSerpPanel.tsx`, `components/analysis/CompetitorAnalysisTabs.tsx`, `services/holisticCompetitorAnalyzer.ts` |
| 5 | `supabase/migrations/YYYYMMDD_topic_serp_analysis.sql`, `services/topicAnalysisPersistence.ts` |

---

## Notes

- All services should follow existing patterns in codebase
- Use existing AI service abstractions (aiService.ts)
- Reuse cacheService for all caching
- Follow existing type patterns from types.ts
- UI components should use existing Tailwind/component patterns

---

*Ready to execute. Start with Phase 0, Task 0.1.*
