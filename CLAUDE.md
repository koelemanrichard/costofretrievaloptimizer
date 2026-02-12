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

The `services/audit/` module implements a 437-rule content audit system with 15 phases, multilingual support, and export capabilities.

**Architecture:**
- `services/audit/UnifiedAuditOrchestrator.ts` - Facade that coordinates all 15 audit phases
- `services/audit/phases/` - Phase adapters extending `AuditPhase` abstract base class
- `services/audit/rules/` - Standalone rule validators (33+ files) implementing specific audit checks
- `services/audit/types.ts` - Core types: `AuditRequest`, `AuditPhaseResult`, `AuditFinding`, `UnifiedAuditReport`
- `services/audit/AuditReportExporter.ts` - Export to CSV, HTML, JSON

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
- `WebsiteTypeRuleEngine` - Industry-specific rules
- `ExternalDataRuleEngine` - GSC/navigation/citation rules

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
- All 2,408 tests should pass with zero failures

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

**AI Response Sanitization**: The `AIResponseSanitizer` must validate all nested structures from AI responses. The common failure mode is when AI returns a string instead of an expected object (e.g., `serpAnalysis: "Not available"` instead of `serpAnalysis: { peopleAlsoAsk: [], ... }`). Uncaught malformed responses cause React render crashes (Error #31).

**Semantic Triples (EAVs)**: Entity-Attribute-Value triples are central to the SEO strategy. See `SemanticTriple` interface in `types.ts` for the structure with categories (UNIQUE/ROOT/RARE/COMMON) and classifications (TYPE/COMPONENT/BENEFIT/RISK/PROCESS/SPECIFICATION).

**Content Briefs**: Complex nested structure including `serpAnalysis`, `contextualBridge`, `structured_outline`, and `visual_semantics`. Always validate structure before rendering.

**Disabled Features**: The "Analyze Existing Website" feature (edge function pipeline: `start-website-analysis` → `sitemap-discovery` → `crawl-worker` → `semantic-mapping-worker` → `gap-analysis-worker`) is temporarily disabled in UI. The edge functions exist but are stubs/placeholders awaiting implementation. See `MapSelectionScreen.tsx` for the disabled button.
