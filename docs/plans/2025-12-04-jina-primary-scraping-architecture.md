# Jina-Primary Scraping Architecture Design

**Date:** 2025-12-04
**Status:** Approved
**Author:** Claude Code

## Overview

Replace the unreliable Firecrawl-as-fallback pattern with a **Jina-Primary architecture** where Jina.ai is the default provider for semantic extraction, with Firecrawl and Apify as fallbacks.

## Problem Statement

The current `pageExtractionService.ts` uses:
- **Apify** for technical extraction (schema, performance, status codes)
- **Jina** for semantic extraction (markdown, headings, content)
- **Firecrawl** as fallback when Apify fails

Issues:
1. Firecrawl has reliability problems (503 errors, timeouts)
2. Apify is used even when only semantic data is needed (expensive)
3. No user preference for provider selection
4. No intelligent routing based on extraction type

## Solution

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Unified Page Extraction Service                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Input: URL + ExtractionConfig                                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Step 1: Determine Extraction Strategy                          │ │
│  │                                                                 │ │
│  │  ExtractionType:                                                │ │
│  │   • "semantic_only"  → Content, headings, word count            │ │
│  │   • "technical_only" → Schema, links, performance, status       │ │
│  │   • "full_audit"     → Both technical + semantic                │ │
│  │   • "auto" (default) → Smart selection based on use case        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Step 2: Select Provider(s)                                     │ │
│  │                                                                 │ │
│  │  For Semantic Extraction:                                       │ │
│  │   Priority: Jina → Firecrawl → (Apify as last resort)          │ │
│  │                                                                 │ │
│  │  For Technical Extraction:                                      │ │
│  │   Priority: Apify → Firecrawl (limited data)                   │ │
│  │                                                                 │ │
│  │  User Override: preferredProvider skips to that provider        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Step 3: Execute with Fallback Chain                            │ │
│  │                                                                 │ │
│  │  try {                                                          │ │
│  │    result = await primaryProvider.extract(url);                 │ │
│  │  } catch (error) {                                              │ │
│  │    if (enableFallback) {                                        │ │
│  │      result = await fallbackProvider.extract(url);              │ │
│  │    }                                                            │ │
│  │  }                                                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Step 4: Merge & Normalize Results                              │ │
│  │                                                                 │ │
│  │  ExtractedPageData {                                            │ │
│  │    url: string;                                                 │ │
│  │    technical: ApifyPageData | null;                             │ │
│  │    semantic: JinaExtraction | null;                             │ │
│  │    contentHash: string;                                         │ │
│  │    extractedAt: number;                                         │ │
│  │    provider: 'jina' | 'firecrawl' | 'apify';                    │ │
│  │    errors?: string[];                                           │ │
│  │  }                                                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Provider Capabilities Matrix

| Capability | Jina.ai | Firecrawl | Apify |
|------------|---------|-----------|-------|
| **Markdown Content** | ✅ Excellent | ✅ Good | ⚠️ Via HTML |
| **Headings (H1-H6)** | ✅ Clean | ✅ Good | ✅ Via HTML |
| **Word Count** | ✅ Native | ✅ Derived | ⚠️ Estimated |
| **Internal Links** | ✅ With position | ✅ Basic | ✅ With position |
| **External Links** | ✅ | ✅ | ✅ |
| **Images + Alt** | ✅ AI-generated | ✅ Basic | ✅ Basic |
| **Schema (JSON-LD)** | ⚠️ If in content | ✅ Regex | ✅ Direct |
| **HTTP Status** | ❌ | ✅ | ✅ |
| **Performance (TTFB)** | ❌ | ❌ | ✅ |
| **DOM Nodes** | ❌ | ⚠️ Estimated | ✅ |
| **Canonical/Robots** | ❌ | ✅ | ✅ |
| **JS Rendering** | ❌ | ✅ waitFor | ✅ Playwright |
| **Cookie Consent** | ✅ Headers | ✅ waitFor | ✅ Custom |
| **Price** | Free (1M tokens) | $19+/mo | Pay per run |
| **Rate Limits** | Generous | Strict | Per account |

### Use Case → Provider Mapping

| Use Case | Extraction Type | Primary | Fallback | Data Needed |
|----------|----------------|---------|----------|-------------|
| Competitor Content Analysis | semantic_only | Jina | Firecrawl | Content, headings |
| Published Topic Progress | full_audit | Jina + Apify | Firecrawl | Content + schema |
| Schema Validation | technical_only | Apify | Firecrawl | JSON-LD, status |
| Internal Link Audit | technical_only | Apify | Firecrawl | Link positions |
| Content Quality Check | semantic_only | Jina | Firecrawl | Markdown, headings |
| Navigation Structure | technical_only | Apify | - | Nav links |
| Performance Audit | technical_only | Apify | - | TTFB, load time |
| Image Alt Text Audit | semantic_only | Jina | Firecrawl | Images + alt |
| Bridge Topic Discovery | semantic_only | Jina | Firecrawl | Content for AI |

### API Design

#### Types

```typescript
// types.ts additions

export type ExtractionType =
  | 'semantic_only'   // Content, headings, word count
  | 'technical_only'  // Schema, links, status, performance
  | 'full_audit'      // Both technical + semantic
  | 'auto';           // Smart selection (default)

export type ScrapingProvider = 'jina' | 'firecrawl' | 'apify';

export interface ExtractionConfig {
  // API Keys (at least one required)
  jinaApiKey?: string;
  firecrawlApiKey?: string;
  apifyToken?: string;

  // Extraction strategy
  extractionType?: ExtractionType;  // Default: 'auto'

  // Provider selection
  preferredProvider?: ScrapingProvider | 'auto';  // Default: 'auto'
  enableFallback?: boolean;  // Default: true
  fallbackOrder?: ScrapingProvider[];  // Default: ['jina', 'firecrawl', 'apify']

  // Known JS-heavy domains that should skip to Apify
  forceApifyDomains?: string[];

  // Proxy config for CORS
  proxyConfig?: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };

  // Batch settings
  batchSize?: number;
  timeoutMs?: number;
}

// Extended extraction result
export interface ExtractedPageData {
  url: string;
  technical: ApifyPageData | null;
  semantic: JinaExtraction | null;
  contentHash: string;
  extractedAt: number;

  // New fields
  primaryProvider: ScrapingProvider;
  fallbackUsed?: ScrapingProvider;
  errors?: string[];
}
```

#### Service Interface

```typescript
// services/pageExtractionService.ts

/**
 * Extract a single page with intelligent provider selection
 */
export async function extractPage(
  url: string,
  config: ExtractionConfig
): Promise<ExtractedPageData>;

/**
 * Extract multiple pages with progress reporting
 */
export async function extractPages(
  urls: string[],
  config: ExtractionConfig,
  onProgress?: ProgressCallback
): Promise<ExtractedPageData[]>;

/**
 * Get recommended extraction type for a use case
 */
export function getExtractionTypeForUseCase(
  useCase: 'competitor_analysis' | 'topic_progress' | 'schema_audit' |
           'link_audit' | 'content_quality' | 'performance' | 'full_seo'
): ExtractionType;

/**
 * Check which providers are available based on config
 */
export function getAvailableProviders(
  config: ExtractionConfig
): ScrapingProvider[];
```

### Implementation Plan

#### Phase 1: Core Refactor (Non-breaking)
1. Add new types to `types.ts`
2. Create `services/scrapingProviderRouter.ts` for provider selection logic
3. Update `pageExtractionService.ts` to use router
4. Add `extractionType` and `preferredProvider` parameters
5. Keep existing behavior as default (`'auto'`)

#### Phase 2: Provider Improvements
1. Enhance `jinaService.ts` with retry logic
2. Enhance `firecrawlService.ts` with better error handling
3. Add provider health tracking (success rates per domain)
4. Add request queuing for rate limit management

#### Phase 3: UI Integration
1. Add provider selection to Site Analysis settings
2. Add extraction type selection per use case
3. Show which provider was used in results
4. Add provider status indicators

#### Phase 4: Optimization
1. Cache extraction results by contentHash
2. Domain-specific provider preferences (learned from failures)
3. Parallel extraction for full_audit type
4. Batch optimization per provider

### Files to Create/Modify

**New Files:**
- `services/scrapingProviderRouter.ts` - Provider selection and fallback logic
- `types/scraping.ts` - Scraping-specific types (optional, can go in types.ts)

**Modified Files:**
- `types.ts` - Add ExtractionType, ScrapingProvider, update ExtractionConfig
- `services/pageExtractionService.ts` - Use provider router, add new parameters
- `services/jinaService.ts` - Add retry logic, better error messages
- `services/firecrawlService.ts` - Add retry logic, timeout handling
- `services/apifyService.ts` - Minor updates for consistency
- `services/siteAnalysisServiceV2.ts` - Pass extraction config
- `components/site-analysis/` - UI for provider/type selection

### Success Criteria

1. ✅ Jina.ai is the default provider for semantic extraction
2. ✅ Firecrawl is used as fallback when Jina fails
3. ✅ Apify reserved for technical-only or complex JS sites
4. ✅ User can override provider preference
5. ✅ Extraction type can be selected per use case
6. ✅ Fallback chain is configurable
7. ✅ Results indicate which provider was used
8. ✅ No breaking changes to existing API

### References

- [Jina AI vs. Firecrawl for web-LLM extraction](https://blog.apify.com/jina-ai-vs-firecrawl/)
- [Best Firecrawl alternatives - Apify](https://apify.com/alternatives/firecrawl-alternatives)
- [Crawl4AI Documentation](https://docs.crawl4ai.com/)
- [Top 15 AI Web Crawlers 2025](https://thunderbit.com/blog/best-AI-web-crawler)
