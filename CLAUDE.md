# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run Commands

```bash
npm install        # Install dependencies
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run preview    # Preview production build
```

### Supabase Deployment

```bash
# Deploy edge functions (ALWAYS use these flags to avoid auth/network issues)
supabase functions deploy <function-name> --no-verify-jwt --use-api
```

## Project Overview

**Holistic SEO Topical Map Generator** - A strategic tool implementing the Holistic SEO framework. The AI assists users in creating topical maps, content briefs, and article drafts constrained by user-defined business context, SEO pillars, and SERP data.

## Architecture

### Frontend
- **React 18** SPA with **TypeScript** and **TailwindCSS**
- **Vite** for build tooling
- Global state via React Context + `useReducer` in `state/appState.ts`

### Backend
- **Supabase** serverless architecture:
  - PostgreSQL database with Row Level Security (RLS)
  - Supabase Auth for user management
  - Deno Edge Functions in `supabase/functions/`

### AI Service Layer
Multi-provider abstraction supporting Gemini, OpenAI, Anthropic, Perplexity, and OpenRouter:
- `services/aiService.ts` - Facade that re-exports from `services/ai/`
- `services/ai/` - Modular AI services:
  - `mapGeneration.ts` - Topic map generation
  - `briefGeneration.ts` - Content brief generation
  - `analysis.ts` - SEO analysis functions
  - `clustering.ts` - Topic clustering
  - `flowValidator.ts` - Content flow validation
  - `contentGeneration/` - Multi-pass article generation system
- Individual provider implementations: `geminiService.ts`, `openAiService.ts`, `anthropicService.ts`, etc.

### Semantic SEO Core Services

**Topical Authority Calculation** (`services/ai/analysis.ts`):
- `calculateTopicalAuthority()` - AI-based holistic authority scoring (0-100)
- Returns breakdown: contentDepth, contentBreadth, interlinking, semanticRichness
- UI: "Authority" button in `AnalysisToolsPanel`
- Prompt: `config/prompts/` domain modules (decomposed from monolithic `prompts.ts`)

**Semantic Distance & Clustering** (`lib/knowledgeGraph.ts` + `services/ai/clustering.ts`):
- `calculateSemanticDistance(entityA, entityB)` - Formula: `1 - (CosineSimilarity × ContextWeight × CoOccurrence)`
- Distance thresholds: <0.2 (cannibalization risk), 0.3-0.7 (linking sweet spot), >0.7 (different clusters)
- `findLinkingCandidates(entity)` - Returns entities in optimal linking range
- `clusterTopicsSemanticDistance()` - Hierarchical agglomerative clustering
- `findCannibalizationRisks()` - Identifies topics too similar (<0.2 distance)
- UI: `SemanticDistanceMatrix.tsx` (heatmap visualization)

**Gap Analysis** (`services/ai/queryNetworkAudit.ts`):
- `runQueryNetworkAudit()` - Full competitive gap analysis
- Fetches SERP data, extracts competitor EAVs, identifies missing attributes
- Returns: `{ contentGaps[], competitorEAVs[], recommendations[] }`
- UI: `QueryNetworkAudit.tsx` + `CompetitorGapGraph.tsx` (network visualization)
- Hook: `useCompetitorGapNetwork.ts`

**EAV Services** (`services/ai/eavService.ts`, `eavClassifier.ts`, `eavAudit.ts`):
- Industry-specific predicate suggestions (10+ industries)
- Auto-classification with 70+ predicate patterns
- Coverage scoring and gap detection
- UI: `EavDiscoveryWizard.tsx`, `EavCompletenessCard.tsx`

### Multi-Pass Content Generation
The `services/ai/contentGeneration/` module implements a 10-pass article generation system:

1. **Pass 1 - Draft Generation**: Section-by-section content creation with resumability
2. **Pass 2 - Header Optimization**: Heading hierarchy and contextual overlap
3. **Pass 3 - Lists & Tables**: Structured data optimization for Featured Snippets
4. **Pass 4 - Visual Semantics**: Image placeholder insertion with vocabulary-extending alt text
5. **Pass 5 - Micro Semantics**: Linguistic optimization (modality, stop words, subject positioning)
6. **Pass 6 - Discourse Integration**: Transitions and contextual bridges
7. **Pass 7 - Introduction Synthesis**: Post-hoc introduction rewriting
8. **Pass 8 - Final Audit**: Algorithmic content audit with scoring
9. **Pass 9 - Schema Generation**: JSON-LD structured data with entity resolution (Wikidata), page type detection, validation, and auto-fix

Key files:
- `orchestrator.ts` - Job management, Supabase persistence, progress tracking
- `passes/pass1DraftGeneration.ts` - Section-by-section draft with retry logic
- `passes/pass9SchemaGeneration.ts` - JSON-LD schema generation with entity resolution
- `passes/auditChecks.ts` - 10 algorithmic audit rules
- `schemaGeneration/` - Schema generator, validator, auto-fix, and templates
- `progressiveSchemaCollector.ts` - Collects schema-relevant data during passes 1-8
- `hooks/useContentGeneration.ts` - React hook with realtime updates
- `components/ContentGenerationProgress.tsx` - UI for progress tracking

Database tables (see migrations):
- `content_generation_jobs` - Job state, pass status, audit results, schema data
- `content_generation_sections` - Per-section content with version history
- `entity_resolution_cache` - Cached Wikidata entity resolutions

### Unified Content Audit System

The `services/audit/` module implements a 282+ rule content audit system with 15 phases, multilingual support, site-level aggregation, auto-fix, and export capabilities.

**Architecture:**
- `services/audit/UnifiedAuditOrchestrator.ts` - Facade that coordinates all 15 audit phases
- `services/audit/phases/` - Phase adapters extending `AuditPhase` abstract base class
- `services/audit/rules/` - Standalone rule validators (40+ files) implementing specific audit checks
- `services/audit/types.ts` - Core types: `AuditRequest`, `AuditPhaseResult`, `AuditFinding`, `UnifiedAuditReport`
- `services/audit/AuditReportExporter.ts` - Export to CSV, HTML, JSON
- `services/audit/SiteAuditAggregator.ts` - Site-level audit aggregation across pages
- `services/audit/AutoFixEngine.ts` - Auto-fix suggestion engine for common issues
- `services/audit/verifiers/PerplexityFactVerifier.ts` - Fact verification via Perplexity AI
- `services/audit/ruleRegistry.ts` - Dynamic rule inventory builder with data dependencies

**15 Audit Phases** (in `services/audit/phases/`):
1. Strategic Foundation (10%) - CE positioning, author entity, context qualifiers
2. EAV System (15%) - Triple coverage, pronoun density, quantitative values
3. Micro-Semantics (13%) - Modality, predicate specificity, SPO patterns
4. Information Density (8%) - Redundancy, filler, vagueness, preamble
5. Contextual Flow (15%) - CE distribution, transitions, headings, bridges
6. Internal Linking (10%) - Anchor text, placement, annotations, volume
7. Semantic Distance (3%) - Cannibalization detection via Jaccard similarity
8. Content Format (5%) - Lists, tables, visual hierarchy, featured snippets
9. HTML Technical (7%) - Nesting, alt text, image metadata, structure
10. Meta & Structured Data (5%) - Canonical, meta tags, schema validation
11. Cost of Retrieval (4%) - DOM size, CWV, headers, compression
12. URL Architecture (3%) - Structure, redirects, sitemap, indexation
13. Cross-Page Consistency (2%) - Signal conflicts, robots, orphan pages
14. Website Type Specific (bonus) - E-commerce, SaaS, B2B, Blog rules
15. Fact Validation (bonus) - External source verification

**Rule Validators** (in `services/audit/rules/`):
Each validator is a standalone class with a `validate()` method returning typed issues. Key validators:
- `SourceContextAligner` - CE/business/keyword alignment
- `CentralEntityPositionChecker` - CE placement rules
- `CanonicalValidator` - Canonical URL validation
- `CoreWebVitalsChecker` - LCP, INP, CLS thresholds
- `AiAssistedRuleEngine` - Rules requiring LLM analysis
- `WebsiteTypeRuleEngine` - Industry-specific rules (e-commerce LIFT, SaaS hybrid, B2B augmentation, homepage)
- `ExternalDataRuleEngine` - GSC/navigation/citation rules
- `SchemaValidator` - About vs mentions, @graph consolidation, Content Parity, ImageObject licensing
- `InternalLinkingValidator` - Annotation text quality, placement rules, anchor repetition, ToC validation
- `BoilerplateDetector` - Main content vs boilerplate weighting
- `AnchorSegmentChainValidator` - Anchor segment chain and LIFT model validation
- `HreflangValidator` - Bidirectional hreflang symmetry
- `NgramConsistencyChecker` - Cross-page N-gram distribution and boilerplate ratio
- `ImageSitemapGenerator` - Image sitemap validation
- `CrossPageEavAuditor` - Cross-page EAV consistency

**Adding New Rules:**
1. Create validator in `services/audit/rules/NewValidator.ts`
2. Create test in `services/audit/rules/__tests__/NewValidator.test.ts`
3. Wire into appropriate phase adapter in `services/audit/phases/`
4. Add `totalChecks++` and `createFinding()` in the phase's `execute()` method

**Weight Configuration:**
- Default weights in `services/audit/types.ts` → `DEFAULT_AUDIT_WEIGHTS`
- Per-project overrides stored in `project_audit_config` table
- Phases sum to 100% (websiteTypeSpecific and factValidation are bonus)

**Scoring:**
- `AuditPhase.buildResult()` computes: `score = max(0, 100 - totalPenalty)`
- Penalties: critical=15, high=8, medium=4, low=1
- Overall score = weighted average of phase scores

**UI Components** (in `components/audit/`):
- `UnifiedAuditDashboard` - Main dashboard with phase grid and severity tabs
- `AuditFindingCard` - Expandable finding with severity colors
- `PhaseScoreCard` - Phase score with progress bar
- `AuditScoreRing` - SVG circular score indicator
- `AuditWeightSliders` - Weight configuration (sum=100 constraint)
- `AuditButton` - Click-to-audit for any URL
- `AuditSidePanel` - Inline audit results panel
- `ExternalUrlInput` - External URL audit input
- `AuditPrerequisiteGate` - Setup requirement checker
- `WebsiteTypeSelector` - Industry type dropdown
- `AuditTimelineView` - Score history SVG chart
- `AuditComparisonView` - Snapshot diff view

**Multilingual Support:**
- `config/audit-i18n/` - Translation files for EN, NL, DE, FR, ES
- `services/audit/rules/LanguageSpecificRules.ts` - Language-specific stop words and compound word detection

**Database Tables:**
- `project_audit_config` - Per-project weight/type config
- `unified_audit_snapshots` - Audit history with performance correlation
- `audit_schedules` - Future automated audit scheduling

### Intelligent Layout Engine
The `services/layout-engine/` module transforms content into design-agency quality layouts using AI-detected brand intelligence:

**Core Services:**
- `SectionAnalyzer.ts` - Analyzes content sections, calculates semantic weight (1-5) based on attribute category (UNIQUE/RARE/ROOT/COMMON)
- `LayoutPlanner.ts` - Determines width, columns, spacing based on semantic weight
- `ComponentSelector.ts` - Two-factor selection: content type × brand personality, with FS protection
- `VisualEmphasizer.ts` - Maps weight to visual properties (hero/featured/standard/supporting/minimal)
- `ImageHandler.ts` - Semantic image placement (CRITICAL: never between heading and first paragraph)
- `LayoutEngine.ts` - Orchestrates all services, generates complete LayoutBlueprint

**Key Types (in `services/layout-engine/types.ts`):**
- `SectionAnalysis` - Content type, semantic weight, constraints
- `LayoutParameters` - Width, columns, spacing, breaks
- `VisualEmphasis` - Heading size, padding, background, animations
- `ComponentSelection` - Primary/alternative components with reasoning
- `BlueprintSection` - Complete section specification
- `LayoutBlueprint` - Full article layout specification

**Integration with Publishing:**
- `services/publishing/renderer/blueprintRenderer.ts` - Uses `BrandDesignSystem.compiledCss` (THE KEY FIX)
- Accepts `brandDesignSystem?: BrandDesignSystem` option
- Falls back to legacy `designTokens` if no brand system provided

**UI Components:**
- `components/publishing/steps/BrandIntelligenceStep.tsx` - Step 1: AI brand detection with personality sliders
- `components/publishing/steps/LayoutIntelligenceStep.tsx` - Step 2: Section preview with emphasis indicators
- `components/publishing/steps/PreviewStep.tsx` - Step 3: Live preview with BrandMatchIndicator
- `components/publishing/SectionPreviewCard.tsx` - Compact section summary card
- `components/publishing/BrandMatchIndicator.tsx` - Brand alignment score (0-100%)

### Topical Map Intelligence Services
Advanced semantic analysis services in `services/ai/`:
- `topicalBorderValidator.ts` - Semantic boundary enforcement from Central Entity
- `tmdDetector.ts` - Topical Map Depth skew detection and cluster redistribution
- `indexConstructionRule.ts` - 7-factor standalone page vs section decision engine
- `queryDeservesPage.ts` - Query Deserves Page matrix (volume + intent + depth)
- `frameSemanticsAnalyzer.ts` - Frame Semantics coverage analysis
- `knowledgePanelBuilder.ts` - Knowledge Panel readiness scoring (6 dimensions)
- `eavCompositeResolver.ts` - Composite/derived EAV attribute resolution
- `eavTraversal.ts` - Cross-entity EAV traversal through shared attributes

### Supporting Services
- `services/contentRefreshTracker.ts` - 30% Refresh Rule implementation
- `services/momentumTracker.ts` - Publication velocity and frequency tracking
- `services/contentPruningAdvisor.ts` - Content pruning (410 vs 301 vs keep) recommendations
- `services/competitorTracker.ts` - Competitor snapshot comparison and change detection
- `services/imageProcessingService.ts` - Image SEO validation (AVIF, EXIF/IPTC, hybrid category)
- `lib/pageRankSimulator.ts` - PageRank flow simulation from internal link structure

### Key Directories
- `components/` - React components (wizards, modals, dashboard panels)
- `components/ui/` - Reusable UI primitives
- `state/` - Global state management
- `config/` - Centralized configuration:
  - `serviceRegistry.ts` - **Single source of truth** for ALL external service config (models, URLs, pricing, limits)
  - `apiEndpoints.ts` - Re-exports API URLs from `serviceRegistry.ts`
  - `scrapingConfig.ts` - HTML scraping selectors and settings
  - `prompts/` - Domain-specific AI prompt modules (9 modules)
- `hooks/` - Custom React hooks (useKnowledgeGraph, useMapData, useTopicEnrichment)
- `utils/` - Export utilities, helpers, parsers
- `services/ai/shared/` - Shared AI provider utilities (retry, context, rate limiting)

### Key Files
- `types.ts` - All TypeScript interfaces and enums
- `App.tsx` - Main application entry
- `state/appState.ts` - State shape and reducer
- `services/aiResponseSanitizer.ts` - Critical: sanitizes AI responses to prevent crashes
- `config/serviceRegistry.ts` - Central registry for all external service configuration

### Service Registry (`config/serviceRegistry.ts`)
All external service configuration is centralized in the service registry. **Never hardcode** model names, API URLs, pricing rates, batch sizes, or timeout values in service files. Instead, import from the registry:

```typescript
import { getDefaultModel, getFastModel, getValidModels, isValidModel,
         SERVICE_REGISTRY, getProviderEndpoint } from '../config/serviceRegistry';
```

**To update models/pricing/URLs**: Edit only `config/serviceRegistry.ts` (and its Deno mirror `supabase/functions/_shared/serviceConfig.ts` for edge functions).

**Registry structure**:
- `SERVICE_REGISTRY.providers.{anthropic|openai|gemini|perplexity|openrouter}` — models, endpoints, limits, pricing
- `SERVICE_REGISTRY.services.{dataforseo|spaceserp|apify|firecrawl|jina|cloudinary|markupgo}` — endpoints, pricing
- `SERVICE_REGISTRY.limits` — shared operational limits (maxTokens, batchSize, timeout)

**Usage tracking**: All AI and non-AI service calls log to `ai_usage_logs` via `logAiUsage()` in `services/telemetryService.ts`. Anthropic and Gemini use actual API response tokens (not estimates).

## Testing

```bash
npx tsc --noEmit      # TypeScript type-check (zero errors expected)
npx vitest run         # Run all unit/integration tests
npx playwright test    # Run E2E tests (requires dev server running)
```

- **Unit tests**: Vitest + React Testing Library in `__tests__/` directories
- **E2E tests**: Playwright specs in `e2e/` (archived debug specs in `e2e/_archived/`)
- **Test config**: `e2e/test-utils.ts` exports `TEST_CONFIG` with `BASE_URL`, credentials, timeouts
- All tests should pass with zero failures
- **Zero-Tolerance Test Policy**: Every test failure — including pre-existing ones — MUST be fixed before completing a task. Never leave broken tests behind. If you encounter failing tests unrelated to your changes, fix them as part of your work. Run `npx vitest run` after every change and ensure 0 failures.

## Database Schema (Supabase)

- `user_settings` - User preferences and encrypted API keys
- `projects` - Top-level container for user work
- `topical_maps` - Content strategy with `business_info`, `pillars`, `eavs` JSON blobs
- `topics` - Core and outer topics with parent-child relationships
- `content_briefs` - AI-generated briefs linked to topics
- `content_generation_jobs` - Multi-pass article generation job tracking (status, passes, audit score)
- `content_generation_sections` - Individual section content with version history per pass

## User Flow

1. **Auth** → 2. **Project Selection** → 3. **Map Selection** → 4. **Business Info Wizard** → 5. **SEO Pillar Wizard** → 6. **EAV Discovery Wizard** → 7. **Competitor Refinement** → 8. **Dashboard**

## Critical Implementation Notes

**Business Info + Pillars Are Non-Negotiable**: Business context (`BusinessInfo`: language, region, targetMarket, industry, audience) and SEO Pillars (Central Entity, Source Context, Central Search Intent) are **mandatory prerequisites** for ALL system operations — including topical map generation, semantic analysis, content optimization, migration matching, and fix generation. If these are incorrect or missing, the entire optimization output will be misaligned. **Every user path** (greenfield, existing site optimization, migration) MUST ensure business info and pillars are validated before any AI-driven analysis or map generation begins. When building new features or flows, always verify that business info and pillars are available and correct before invoking semantic analysis, matching, or planning services. The per-map overrides in `topical_maps.business_info` (language, region) take precedence over global settings.

**AI Response Sanitization**: The `AIResponseSanitizer` must validate all nested structures from AI responses. The common failure mode is when AI returns a string instead of an expected object (e.g., `serpAnalysis: "Not available"` instead of `serpAnalysis: { peopleAlsoAsk: [], ... }`). Uncaught malformed responses cause React render crashes (Error #31).

**Semantic Triples (EAVs)**: Entity-Attribute-Value triples are central to the SEO strategy. See `SemanticTriple` interface in `types.ts` for the structure with categories (UNIQUE/ROOT/RARE/COMMON) and classifications (TYPE/COMPONENT/BENEFIT/RISK/PROCESS/SPECIFICATION).

**Content Briefs**: Complex nested structure including `serpAnalysis`, `contextualBridge`, `structured_outline`, and `visual_semantics`. Always validate structure before rendering.

**Disabled Features**: The "Analyze Existing Website" feature (edge function pipeline: `start-website-analysis` → `sitemap-discovery` → `crawl-worker` → `semantic-mapping-worker` → `gap-analysis-worker`) is temporarily disabled in UI. The edge functions exist but are stubs/placeholders awaiting implementation. See `MapSelectionScreen.tsx` for the disabled button.

**CORS — No Direct External HTTP Requests from Browser Code**: This is a React SPA running in the browser. **NEVER use `fetch()` or `XMLHttpRequest` to call external websites** (e.g., scraping a URL, calling third-party APIs without CORS headers). The browser will block these with CORS errors. Instead, **always route external HTTP requests through a Supabase Edge Function** (Deno) or an existing proxy service (Jina, Apify, Firecrawl). If building a feature that needs to fetch external content, create or use an edge function in `supabase/functions/` and call it from the frontend via the Supabase client. This applies to ALL external domains — not just APIs, but also website scraping, HTML extraction, and URL validation.

**Data Persistence — Always Verify Load Path**: When saving data to Supabase (e.g., a new JSONB column on `topical_maps`), **always verify that the data is loaded back** when the component remounts or the page is refreshed. Check: (1) the Supabase `SELECT` query includes the new column (or uses `select('*')`), (2) the state management layer (reducer/context) passes the loaded data to the component, (3) the component reads from state on mount (not just after generation). Test by: generating data, refreshing the page, and confirming the data appears without re-generation. The `ProjectLoader.tsx` uses `select('*')` for topical maps, so new columns are automatically included — but the component must read from `topicalMap.new_column` on initial render.

**Iframe Sandbox — Prevent Script Execution Errors**: When rendering user/AI-generated HTML in `<iframe srcDoc>`, the sandbox attribute controls what the iframe can do. Common error: `Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed`. To fix: (1) If the HTML contains `<script>` tags or inline event handlers and you need them to work, use `sandbox="allow-same-origin allow-scripts"`. (2) If you DON'T need scripts (pure CSS/HTML preview), use `sandbox="allow-same-origin"` and **strip all `<script>` tags and `on*` attributes** before setting `srcDoc` (see `sanitizeHtmlForPreview()` in `StyleGuideElementCard.tsx`). (3) **Never use `sandbox=""` (empty)** — it blocks everything including same-origin access needed for height measurement. (4) For CSS `url()` values, replace external URLs with `url(data:,)` NOT `about:blank` to avoid ERR_NAME_NOT_RESOLVED.

## Recurring Issue Patterns (Learned from 198 Fix Commits)

These rules are derived from a systematic analysis of the entire git history. Each category below represents a class of bug that has been fixed **multiple times** — some as many as 8+ separate commits. These rules are **mandatory** to prevent regression.

---

### 1. CORS — Proxy Enforcement (11 fix commits)

The same CORS bug has been fixed 11 times: frontend code calls an external API via `fetch()`, which works locally but fails in production with a CORS error.

**Rules:**
- **Every external HTTP request from browser code MUST go through the `fetch-proxy` Supabase edge function.** Never use `fetch()` for external domains. Never use third-party CORS proxies like `corsproxy.io`.
- **Never make `proxyConfig` an optional parameter.** When a function needs to call an external URL, it must require proxy configuration — not accept it optionally and silently fall back to direct `fetch()`. The safe path must be the only path.
- **Thread `proxyConfig` through the entire call chain.** When adding a new caller to an existing service that fetches external URLs, verify the caller passes `proxyConfig` all the way down. A missing `proxyConfig` compiles fine but fails at runtime.
- **Edge function CORS origins are centralized in `_shared/utils.ts`.** Never define inline `Access-Control-Allow-Origin` headers in individual edge functions. When adding a new origin (e.g., a new domain or port), add it only in `_shared/utils.ts` `ALLOWED_ORIGINS`.

---

### 2. Language/Region Enforcement (13 fix commits across 8 waves)

Every AI prompt must produce output in the user's configured language. This has been broken and fixed 8 separate times because there is no centralized enforcement.

**Rules:**
- **Every AI prompt function MUST accept `businessInfo` (or at minimum `language`/`region`)** and call `getLanguageAndRegionInstruction()`. Place the language directive at the **TOP** of the prompt, not buried at the bottom. LLMs weight top-of-prompt instructions more heavily.
- **Always use per-map `businessInfo`, not global state.** The per-map overrides in `topical_maps.business_info` (language, region) take precedence over `state.businessInfo`. Components must merge these: `effectiveBusinessInfo = { ...globalBI, ...mapBI }`. Never read `state.businessInfo.language` directly — use the merged version.
- **When updating a prompt signature to accept `businessInfo`, update ALL 5 provider callers** (`anthropicService.ts`, `geminiService.ts`, `openAiService.ts`, `openRouterService.ts`, `perplexityService.ts`) in the same commit. Missing one caller means that provider silently generates English output.
- **Never hardcode language values** (e.g., `language: 'en'`). Always read from the effective business info.
- **Test with a non-English language** before marking a prompt feature complete.

---

### 3. Data Persistence — Round-Trip Verification (14 fix commits)

The most frequent class of bug: data is saved but not loaded back on refresh. Five sub-patterns:

**Rule A — Write Path + Read Path Must Be Verified Together:**
When saving data to a new Supabase column, verify ALL of:
1. The database migration exists and has been applied
2. The TypeScript type includes the new field
3. The parser/transformer in `utils/parsers.ts` includes the new field (parsers use whitelists that silently drop unknown fields)
4. The Supabase `SELECT` query includes the column (or uses `select('*')`)
5. The component reads from persisted state on mount, not just after generation
6. **Refresh test**: Generate data → hard refresh → confirm data appears without re-generation
7. **Deep-link test**: Navigate directly to the URL → confirm data loads

**Rule B — Never Use localStorage for Entity-Scoped Data:**
`localStorage` is acceptable only for truly global UI preferences (theme, sidebar state). Any data scoped to a project, map, or user entity must be persisted to the database. `localStorage` is global, unscoped, and causes cross-entity leakage.

**Rule C — Co-locate Migration and Code Changes:**
Every commit that writes to a new database column must include: (a) SQL migration, (b) TypeScript type update, (c) parser/whitelist update, (d) load-path verification. Never reference a column in code without a corresponding migration.

**Rule D — State Hydration Must Work From All Entry Points:**
If state is loaded in one component (e.g., `ProjectDashboardContainer`), verify it also loads when the user deep-links to a child route (e.g., `/pipeline`). Add loading gates to prevent flash-of-empty-state while data restores.

**Rule E — After DB Read, Always Update React State:**
Any function that reads fresh data from the database must also call the React state setter. Reading from DB into a local variable without calling `setX()` creates stale-state bugs.

---

### 4. RLS / Multi-Tenancy (30+ fix commits across 7 waves)

New tables repeatedly ship with legacy `auth.uid() = user_id` RLS instead of the organization-aware `has_project_access()` function.

**Rules:**
- **Every new table MUST use `has_project_access()` for RLS.** Never use `auth.uid() = user_id` or `projects.user_id = auth.uid()` as the sole access check.
  - Tables with `project_id`: `USING (has_project_access(project_id))`
  - Tables linked through `map_id`: chain through `topical_maps` → `projects` → `has_project_access()`
  - Tables linked through deeper chains: follow the chain up to `projects`
- **Always use `.maybeSingle()` for queries that may return 0 rows.** `.single()` throws a PostgREST 406 error when no rows match. Only use `.single()` after an INSERT that returns the created row. Never catch 406 and treat it as "table missing."
- **Long-running operations MUST refresh the auth session.** Any operation >30 minutes must call `supabase.auth.refreshSession()` periodically. Wrap database writes with 403-retry: detect 403/42501 → refresh session → retry once. After any write, verify affected row count > 0 (RLS silently drops unauthorized writes).
- **Schema migrations that add access-control columns MUST include data backfill.** When adding `organization_id` or similar columns, backfill existing rows and update all INSERT functions to populate the new column.
- **Test multi-tenancy**: Create data as User A → log in as User B (same org) → confirm visibility. Log in as User C (different org) → confirm no access.

---

### 5. Edge Functions — Shared Utilities and Env Vars (12 fix commits)

**Rules:**
- **Every edge function MUST import `getEnvVar`, `corsHeaders`, and `json` from `_shared/utils.ts`.** Never copy-paste these functions into individual edge function files. Before committing, verify: `grep -r "function getEnvVar" supabase/functions/ --include="*.ts" | grep -v _shared` returns zero results.
- **Edge functions use custom secret names**: `PROJECT_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` — NOT the auto-injected `SUPABASE_*` variants. The auto-injected values may differ from custom secrets after key rotations.
- **For edge function calls from the frontend, ALWAYS use `getSupabaseClient()` from `services/supabaseClient.ts`** which provides the authenticated client with `functions.invoke()`. Never use `supabase` from `lib/supabase.ts` (lacks `functions` property). Never use `createClient()` directly (unauthenticated). Never use raw `fetch()` to call edge functions (sends anon key instead of user JWT).
- **Edge functions MUST complete within 25 seconds** (leaving margin below the gateway timeout). When processing a list, enforce a max batch size (10-20 items) and let the frontend chunk larger requests. Always include an `AbortController` timeout on upstream `fetch()` calls.

---

### 6. Wiring — Dead Code and Disconnected Components (33 fix commits)

Components and services are repeatedly created but never imported, or props are defined but never passed.

**Rules:**
- **After creating any new file, verify it is imported somewhere.** Run `grep -r "from.*newFileName" src/ --include="*.ts" --include="*.tsx"` and confirm at least one consumer exists. If no consumer imports the file, wire it into the appropriate facade before committing.
- **Never make handler/callback props optional unless "no handler" is a valid UX state.** If a component renders a button that needs an `onClick`, the prop must be required. If the prop is optional, the component MUST hide or disable the element when the prop is absent:
  ```tsx
  {onCreateBrief && <Button onClick={() => onCreateBrief(id)}>Create Brief</Button>}
  ```
- **When creating a new service module**, complete this wiring checklist:
  - [ ] File is imported in its parent facade (`analysis.ts`, `eavService.ts`, `mapGeneration.ts`, etc.)
  - [ ] Facade re-exports the function/class for external consumers
  - [ ] At least one UI component or hook calls the re-exported function
  - [ ] If it is an audit rule validator, its `validate()` is called in the phase adapter's `execute()` method and `totalChecks` is incremented
- **When adding a large batch of files** (5+), audit the entire batch for import connectivity before committing. Do not rely on `tsc --noEmit` — it does not flag unused exports.

---

### 7. Batch Processing and Scale (14 fix commits)

Code works for 20 items but breaks at 200+. This has caused URL overflow, edge function timeouts, UI freezes, and database errors.

**Rules:**
- **Every function that processes a collection MUST enforce a max batch size:**
  - Supabase `.in()` queries: use `batchedIn()` from `utils/supabaseBatchQuery.ts` (limit 200 IDs)
  - Edge function invocations: limit 10-20 items per call
  - AI prompt payloads: use `summarizeTopicsForPrompt()` for maps with 100+ topics
  - Database upserts: de-duplicate by unique key before upserting (Postgres rejects duplicate ON CONFLICT updates in a single statement)
- **Every `fetch()` and Supabase operation MUST have an explicit timeout** via `AbortController` or `Promise.race()`. Never rely on platform defaults.
- **For content >10KB, use fast-path algorithms** (e.g., `indexOf`-based scanning instead of regex). For content >15K chars sent to AI, use hierarchical chunking.
- **UI rendering: virtualize lists >100 rows, cap graph visualizations at 200 nodes.**
- **Numeric accumulators: clamp after each addition**, not just at the end (`Math.min(MAX, value + bonus)` after each bonus).
- **When fixing an unbounded-input bug, audit the entire codebase** for the same pattern and fix all instances in one commit. Do not fix only the call site that triggered the error.

---

### 8. OAuth and Token Management (16 fix commits)

**Rules:**
- **Never make async Supabase calls inside `onAuthStateChange` callbacks.** Known Supabase-js bug (supabase-js#1594) causes deadlocks. Set state in the callback and trigger async work in a separate `useEffect`.
- **OAuth token storage must merge, never overwrite.** When storing tokens after re-authorization: (a) merge new scopes with existing scopes using `Set` union, (b) preserve the existing `refresh_token` when the new response omits it (Google only returns refresh_token on first consent), (c) log before/after scopes for debugging.
- **Every API error path must classify the failure type:**
  - Token expired/revoked → return `{ relink: true }` and prompt re-connection
  - Insufficient scope → return scope-specific message
  - API not enabled → return setup instructions
  - Legitimate "no data" → return empty result
  - Never show raw HTTP status codes or "no data found" when the real issue is auth failure
- **Use `getUser()` (server validation) instead of `getSession()` (cache-only)** when you need to verify a session is actually valid.
- **Long-running operations must not depend on JWT validity for API key access.** Pass API keys directly via headers to edge functions rather than relying on JWT → DB decrypt chains that break when tokens expire mid-operation.
