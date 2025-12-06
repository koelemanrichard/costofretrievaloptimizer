# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run Commands

```bash
npm install        # Install dependencies
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run preview    # Preview production build
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

### Multi-Pass Content Generation
The `services/ai/contentGeneration/` module implements a 9-pass article generation system:

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

### Key Directories
- `components/` - React components (wizards, modals, dashboard panels)
- `components/ui/` - Reusable UI primitives
- `state/` - Global state management
- `config/` - Defaults, prompts, and schemas
- `hooks/` - Custom React hooks (useKnowledgeGraph, useMapData, useTopicEnrichment)
- `utils/` - Export utilities, helpers, parsers

### Key Files
- `types.ts` - All TypeScript interfaces and enums
- `App.tsx` - Main application entry
- `state/appState.ts` - State shape and reducer
- `services/aiResponseSanitizer.ts` - Critical: sanitizes AI responses to prevent crashes

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
