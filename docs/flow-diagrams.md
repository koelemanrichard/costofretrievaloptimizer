# System Flow Diagrams

## Table of Contents
1. [Topical Map Creation Flow](#1-topical-map-creation-flow)
2. [Content Brief Creation Flow](#2-content-brief-creation-flow)
3. [Article Draft Generation Flow (10-Pass System)](#3-article-draft-generation-flow)

---

# 1. TOPICAL MAP CREATION FLOW

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TOPICAL MAP CREATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   USER ACTION    │
│  Create New Map  │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: PROJECT & MAP INITIALIZATION                                           │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Component: App.tsx, SetupWizardLayout.tsx                                      │
│  Database:  INSERT INTO topical_maps (skeleton record)                          │
│                                                                                 │
│  User selects/creates project → Creates new map → Router navigates to wizard    │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: BUSINESS INFO COLLECTION                                               │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Component: BusinessInfoPage.tsx + BusinessInfoForm.tsx                         │
│  Database:  topical_maps.business_info (JSONB)                                  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  USER INPUTS:                                                            │   │
│  │  ───────────────────────────────────────────────────────────────────────│   │
│  │  Strategic Context:                                                      │   │
│  │    • seedKeyword (primary keyword)                                       │   │
│  │    • industry (business vertical)                                        │   │
│  │    • valueProp (unique value proposition)                                │   │
│  │    • audience (target audience)                                          │   │
│  │    • language (content language: en, nl, de, etc.)                       │   │
│  │    • targetMarket (geographic region)                                    │   │
│  │    • websiteType (E-commerce, SaaS, Blog, etc.)                          │   │
│  │                                                                          │   │
│  │  Author Profile:                                                         │   │
│  │    • authorProfile.credentials                                           │   │
│  │    • authorProfile.bio                                                   │   │
│  │    • authorProfile.stylometry (INSTRUCTIONAL/ACADEMIC/DIRECT/PERSUASIVE) │   │
│  │    • authorProfile.customStylometryRules (words to avoid)                │   │
│  │                                                                          │   │
│  │  Brand & Creative:                                                       │   │
│  │    • brandKit (colors, typography)                                       │   │
│  │    • Image generation API keys (optional)                                │   │
│  │                                                                          │   │
│  │  AI Configuration:                                                       │   │
│  │    • aiProvider (gemini/openai/anthropic/perplexity/openrouter)          │   │
│  │    • aiModel (specific model for this map)                               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  dispatch({ type: 'UPDATE_MAP_DATA', payload: { business_info } })              │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: SEO PILLARS DISCOVERY (4-Part Wizard)                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Component: PillarDefinitionWizard.tsx                                          │
│  Service:   services/ai/mapGeneration.ts                                        │
│  Database:  topical_maps.pillars (JSONB)                                        │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  3a. CENTRAL ENTITY SELECTION                                             │ │
│  │  ─────────────────────────────────────────────────────────────────────── │ │
│  │     ┌──────────────┐                                                      │ │
│  │     │ Business     │                                                      │ │
│  │     │ Info         │──────┐                                               │ │
│  │     └──────────────┘      │                                               │ │
│  │                           ▼                                               │ │
│  │                  ┌─────────────────────┐     ┌───────────────────────┐   │ │
│  │                  │ AI Service          │────►│ CandidateEntity[]     │   │ │
│  │                  │ suggestCentral      │     │ - entity name         │   │ │
│  │                  │ EntityCandidates()  │     │ - reasoning           │   │ │
│  │                  └─────────────────────┘     │ - confidence score    │   │ │
│  │                           │                  └───────────────────────┘   │ │
│  │                           │                             │                │ │
│  │                           │  Provider: Gemini/OpenAI/   │                │ │
│  │                           │  Anthropic/Perplexity/      │                │ │
│  │                           │  OpenRouter                 ▼                │ │
│  │                           │                  ┌───────────────────────┐   │ │
│  │                           │                  │ User selects entity   │   │ │
│  │                           │                  │ e.g., "Robotics       │   │ │
│  │                           │                  │        Engineering"   │   │ │
│  │                           │                  └───────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  3b. SOURCE CONTEXT SELECTION                                             │ │
│  │  ─────────────────────────────────────────────────────────────────────── │ │
│  │     ┌──────────────┐     ┌─────────────────────┐                         │ │
│  │     │ Central      │────►│ AI Service          │                         │ │
│  │     │ Entity       │     │ suggestSourceContext│                         │ │
│  │     └──────────────┘     │ Options()           │                         │ │
│  │     ┌──────────────┐     └─────────────────────┘                         │ │
│  │     │ Business     │────►          │                                     │ │
│  │     │ Info         │               ▼                                     │ │
│  │     └──────────────┘     ┌───────────────────────┐                       │ │
│  │                          │ SourceContextOption[] │                       │ │
│  │                          │ e.g., "Enterprise     │                       │ │
│  │                          │        Solutions"     │                       │ │
│  │                          └───────────────────────┘                       │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  3c. CENTRAL SEARCH INTENT SELECTION                                      │ │
│  │  ─────────────────────────────────────────────────────────────────────── │ │
│  │     ┌──────────────┐                                                      │ │
│  │     │ Entity +     │     ┌─────────────────────┐                         │ │
│  │     │ Context      │────►│ AI Service          │                         │ │
│  │     └──────────────┘     │ suggestCentralSearch│                         │ │
│  │                          │ Intent()            │                         │ │
│  │                          └─────────────────────┘                         │ │
│  │                                    │                                     │ │
│  │                                    ▼                                     │ │
│  │                          ┌───────────────────────┐                       │ │
│  │                          │ Intent options with   │                       │ │
│  │                          │ reasoning             │                       │ │
│  │                          │ e.g., "How to build"  │                       │ │
│  │                          └───────────────────────┘                       │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  3d. CONFIRMATION & STORAGE                                               │ │
│  │  ─────────────────────────────────────────────────────────────────────── │ │
│  │     SEOPillars = {                                                        │ │
│  │       centralEntity: "Robotics Engineering",                              │ │
│  │       sourceContext: "Enterprise Solutions",                              │ │
│  │       centralSearchIntent: "Solve automation challenges"                  │ │
│  │     }                                                                     │ │
│  │                                                                           │ │
│  │     → Save to topical_maps.pillars                                        │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: SEMANTIC TRIPLES (EAVs) DISCOVERY                                      │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Component: EavDiscoveryWizard.tsx                                              │
│  Service:   services/ai/eavService.ts + mapGeneration.ts                        │
│  Database:  topical_maps.eavs (JSONB array)                                     │
│                                                                                 │
│     ┌──────────────┐     ┌─────────────────────────────────────────────────┐   │
│     │ Business     │────►│                                                 │   │
│     │ Info         │     │  AI Service: discoverCoreSemanticTriples()     │   │
│     └──────────────┘     │                                                 │   │
│     ┌──────────────┐     │  Input:  Business context + SEO pillars         │   │
│     │ SEO          │────►│  Output: SemanticTriple[]                       │   │
│     │ Pillars      │     │                                                 │   │
│     └──────────────┘     └─────────────────────────────────────────────────┘   │
│                                         │                                       │
│                                         ▼                                       │
│     ┌───────────────────────────────────────────────────────────────────────┐  │
│     │  SEMANTIC TRIPLE STRUCTURE (EAV)                                      │  │
│     │  ───────────────────────────────────────────────────────────────────  │  │
│     │  {                                                                    │  │
│     │    subject: { label: "Robot", type: "Thing" },                        │  │
│     │    predicate: {                                                       │  │
│     │      relation: "hasCapability",                                       │  │
│     │      category: "UNIQUE" | "ROOT" | "RARE" | "COMMON",                 │  │
│     │      classification: "TYPE" | "COMPONENT" | "BENEFIT" | "RISK" | etc. │  │
│     │    },                                                                 │  │
│     │    object: { value: "autonomous navigation", type: "string" },        │  │
│     │    lexical: { synonyms: [...], hypernyms: [...] },                    │  │
│     │    kpMetadata: { isKPEligible: true }  // Knowledge Panel            │  │
│     │  }                                                                    │  │
│     └───────────────────────────────────────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│     ┌───────────────────────────────────────────────────────────────────────┐  │
│     │  USER ACTIONS                                                         │  │
│     │  ─────────────────────────────────────────────────────────────────── │  │
│     │  • View EAV completeness score & distribution chart                   │  │
│     │  • Click "Expand +15/50/100" → expandSemanticTriples()                │  │
│     │  • Toggle star icon → Mark as "KP Eligible" (Knowledge Panel)         │  │
│     │  • Save all EAVs to database                                          │  │
│     └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: COMPETITOR REFINEMENT                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Component: CompetitorRefinementWizard.tsx                                      │
│  Service:   services/serpApiService.ts + perplexityService.ts                   │
│  Database:  topical_maps.competitors (JSONB array of URLs)                      │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  COMPETITOR DISCOVERY FLOW                                               │  │
│  │                                                                          │  │
│  │  ┌─────────────┐     Has DataForSEO credentials?                         │  │
│  │  │ Central     │                │                                        │  │
│  │  │ Entity      │                ▼                                        │  │
│  │  └─────────────┘         ┌──────┴──────┐                                 │  │
│  │                          │             │                                 │  │
│  │                         YES           NO                                 │  │
│  │                          │             │                                 │  │
│  │                          ▼             ▼                                 │  │
│  │            ┌─────────────────┐  ┌─────────────────┐                      │  │
│  │            │ SERP API        │  │ Perplexity AI   │                      │  │
│  │            │ Discovery       │  │ Fallback        │                      │  │
│  │            │                 │  │                 │                      │  │
│  │            │ • Localized     │  │ • AI-generated  │                      │  │
│  │            │   query build   │  │   competitor    │                      │  │
│  │            │ • DataForSEO    │  │   list          │                      │  │
│  │            │   via Supabase  │  │ • Labeled "AI"  │                      │  │
│  │            │   edge proxy    │  │                 │                      │  │
│  │            │ • Filter pub    │  │                 │                      │  │
│  │            │   sites (Medium │  │                 │                      │  │
│  │            │   LinkedIn)     │  │                 │                      │  │
│  │            │ • Rank by       │  │                 │                      │  │
│  │            │   relevance     │  │                 │                      │  │
│  │            └─────────────────┘  └─────────────────┘                      │  │
│  │                          │             │                                 │  │
│  │                          └──────┬──────┘                                 │  │
│  │                                 ▼                                        │  │
│  │                    ┌────────────────────────┐                            │  │
│  │                    │ Competitor URL List    │                            │  │
│  │                    │ (SERP or AI-generated) │                            │  │
│  │                    └────────────────────────┘                            │  │
│  │                                 │                                        │  │
│  │                                 ▼                                        │  │
│  │                    ┌────────────────────────┐                            │  │
│  │                    │ USER: Select/deselect  │                            │  │
│  │                    │ + Add manual URLs      │                            │  │
│  │                    └────────────────────────┘                            │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 6: BLUEPRINT CONFIGURATION (Optional)                                     │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Component: WebsiteBlueprintWizard.tsx                                          │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  USER INPUTS:                                                            │  │
│  │  • Foundation Pages: Homepage, About, Contact, Privacy, Terms, etc.      │  │
│  │  • NAP Data: Business name, address, phone, service areas, hours         │  │
│  │                                                                          │  │
│  │  DEFAULT (if skipped): Homepage, About, Contact, Privacy, Terms          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 7: TOPICAL MAP GENERATION (AI-Driven)                                     │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Hook:      useMapGeneration.ts → generateMapWithBlueprint()                    │
│  Service:   services/ai/mapGeneration.ts                                        │
│  Database:  topical_maps, topics, foundation_pages, navigation_structures       │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  7a. PERSIST ALL WIZARD DATA                                             │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  verifiedUpdate() to topical_maps:                                       │  │
│  │    • business_info (strategic context)                                   │  │
│  │    • pillars (SEO pillars)                                               │  │
│  │    • eavs (semantic triples array)                                       │  │
│  │    • competitors (competitor URLs)                                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  7b. INITIAL TOPIC GENERATION (AI)                                       │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  ┌──────────────┐                                                        │  │
│  │  │ business_info│                                                        │  │
│  │  │ pillars      │────►┌─────────────────────────────────────────────┐   │  │
│  │  │ eavs         │     │                                             │   │  │
│  │  │ competitors  │     │  aiService.generateInitialTopicalMap()      │   │  │
│  │  └──────────────┘     │                                             │   │  │
│  │                       │  Provider: Gemini/OpenAI/Anthropic/etc.     │   │  │
│  │                       │                                             │   │  │
│  │                       │  Output: {                                  │   │  │
│  │                       │    coreTopics: EnrichedTopic[],             │   │  │
│  │                       │    outerTopics: EnrichedTopic[]             │   │  │
│  │                       │  }                                          │   │  │
│  │                       └─────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  7c. HUB-SPOKE ROLE ASSIGNMENT                                           │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  assignClusterRoles(coreTopics, outerTopics, websiteType)                │  │
│  │                                                                          │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │  │
│  │  │  WEBSITE TYPE THRESHOLDS:                                       │    │  │
│  │  │  • E-commerce: 3-10 spokes per hub                              │    │  │
│  │  │  • SaaS: 5-12 spokes per hub                                    │    │  │
│  │  │  • Blog: 7-15 spokes per hub                                    │    │  │
│  │  │  • News: 5-10 spokes per hub                                    │    │  │
│  │  └─────────────────────────────────────────────────────────────────┘    │  │
│  │                                                                          │  │
│  │  cluster_role assignment:                                                │  │
│  │    • "pillar" → Core topics with 3+ spokes (or website-type minimum)     │  │
│  │    • "cluster_content" → All other topics                                │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  7d. TOPIC METADATA ENRICHMENT                                           │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  Each topic gets:                                                        │  │
│  │    • id (UUID)                                                           │  │
│  │    • slug (URL-friendly: parent-slug/topic-slug)                         │  │
│  │    • topic_class ("monetization" or "informational")                     │  │
│  │    • cluster_role ("pillar" or "cluster_content")                        │  │
│  │    • canonical_query (primary keyword)                                   │  │
│  │    • query_network (related queries)                                     │  │
│  │    • query_type (Definitional, Comparative, etc.)                        │  │
│  │    • planned_publication_date (3-day spacing algorithm)                  │  │
│  │    • url_slug_hint (max 3-word URL guidance)                             │  │
│  │    • freshness (EVERGREEN, STANDARD, FREQUENT)                           │  │
│  │    • blueprint (structural guidance)                                     │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  7e. DATABASE INSERTION                                                  │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  verifiedBulkInsert() to topics table:                                   │  │
│  │    id, map_id, user_id, parent_topic_id, title, slug, description,       │  │
│  │    type, freshness, topic_class, cluster_role, attribute_focus,          │  │
│  │    canonical_query, query_network, query_type, topical_border_note,      │  │
│  │    planned_publication_date, url_slug_hint, blueprint, metadata          │  │
│  │                                                                          │  │
│  │  Read-back verification ensures all topics saved correctly               │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  7f. FOUNDATION PAGES (If Blueprint Selected)                            │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  Service: services/ai/foundationPages.ts                                 │  │
│  │                                                                          │  │
│  │  Pages Generated:                                                        │  │
│  │    • Homepage (with NAP, hero, pillar navigation)                        │  │
│  │    • About (E-E-A-T signals, author credibility)                         │  │
│  │    • Contact (NAP integration, lead capture)                             │  │
│  │    • Privacy/Terms (legal compliance)                                    │  │
│  │    • Optional: Pricing, Blog landing, Services                           │  │
│  │                                                                          │  │
│  │  → INSERT INTO foundation_pages                                          │  │
│  │  → INSERT INTO navigation_structures (pillar-based menus)                │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  7g. STATE UPDATE & REDIRECT                                             │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId, topics } })    │  │
│  │  dispatch({ type: 'SET_FOUNDATION_PAGES', payload: foundationPages })    │  │
│  │  dispatch({ type: 'SET_NAVIGATION', payload: navigationStructure })      │  │
│  │                                                                          │  │
│  │  → Redirect to PROJECT_DASHBOARD                                         │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ✅ TOPICAL MAP COMPLETE                                                        │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  DATA CREATED:                                                                  │
│    • topical_maps: business_info, pillars, eavs, competitors                    │
│    • topics: Core topics (pillars) + Outer topics (spoke content)               │
│    • foundation_pages: Homepage, About, Contact, etc. (if selected)             │
│    • navigation_structures: Site navigation menus                               │
│                                                                                 │
│  USER CAN NOW:                                                                  │
│    • View topics in dashboard                                                   │
│    • Generate content briefs for each topic                                     │
│    • Run semantic distance analysis                                             │
│    • Identify cannibalization risks                                             │
│    • Find linking opportunities                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# 2. CONTENT BRIEF CREATION FLOW

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CONTENT BRIEF CREATION FLOW                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   USER ACTION    │
│  "Generate Brief"│
│  on topic card   │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: RESPONSE CODE SELECTION                                                │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Component: ResponseCodeSelectionModal.tsx                                      │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  1a. AI SUGGESTS OPTIMAL RESPONSE CODE                                   │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  ┌──────────────┐     ┌─────────────────────────┐                       │  │
│  │  │ Topic        │────►│ suggestResponseCode()   │                       │  │
│  │  │ (title,      │     │                         │                       │  │
│  │  │  search_     │     │ Analyzes topic type,    │                       │  │
│  │  │  intent)     │     │ search intent, query    │                       │  │
│  │  └──────────────┘     │ patterns                │                       │  │
│  │                       └─────────────────────────┘                       │  │
│  │                                   │                                     │  │
│  │                                   ▼                                     │  │
│  │                       ┌─────────────────────────┐                       │  │
│  │                       │ RESPONSE CODES:         │                       │  │
│  │                       │ • DEFINITION            │                       │  │
│  │                       │ • PROCESS (How-To)      │                       │  │
│  │                       │ • COMPARISON (X vs Y)   │                       │  │
│  │                       │ • LIST (Top 10)         │                       │  │
│  │                       │ • INFORMATIONAL         │                       │  │
│  │                       │ • PRODUCT_SERVICE       │                       │  │
│  │                       │ • CAUSE_EFFECT          │                       │  │
│  │                       │ • BENEFIT_ADVANTAGE     │                       │  │
│  │                       └─────────────────────────┘                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  1b. USER CONFIRMS OR OVERRIDES                                          │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • Select response code (or keep AI suggestion)                          │  │
│  │  • Optional: Override AI provider/model for this brief                   │  │
│  │  • Click "Generate Brief"                                                │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: CONTEXT GATHERING                                                      │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Component: ProjectDashboardContainer.tsx → onGenerateBrief()                   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  DATA SOURCES ASSEMBLED:                                                 │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  ┌─────────────────┐                                                     │  │
│  │  │ From Topic:     │                                                     │  │
│  │  │ • title         │                                                     │  │
│  │  │ • type          │                                                     │  │
│  │  │ • search_intent │                                                     │  │
│  │  │ • metadata      │                                                     │  │
│  │  │ • blueprint     │                                                     │  │
│  │  └─────────────────┘                                                     │  │
│  │                                                                          │  │
│  │  ┌─────────────────┐                                                     │  │
│  │  │ From Map:       │                                                     │  │
│  │  │ • pillars       │  (centralEntity, sourceContext, centralSearchIntent)│  │
│  │  │ • eavs          │  (semantic triples for this topic)                  │  │
│  │  │ • competitors   │  (competitor URLs for analysis)                     │  │
│  │  │ • business_info │  (language, audience, industry, author profile)     │  │
│  │  └─────────────────┘                                                     │  │
│  │                                                                          │  │
│  │  ┌─────────────────┐                                                     │  │
│  │  │ From Context:   │                                                     │  │
│  │  │ • allTopics     │  (all topics in map for internal linking)           │  │
│  │  │ • knowledgeGraph│  (semantic relationships)                           │  │
│  │  └─────────────────┘                                                     │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: OPTIONAL COMPETITOR ANALYSIS (Enhanced Path)                           │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Hook: useEnhancedBriefGeneration.ts                                            │
│  Services: serpService.ts, ComprehensiveCompetitorExtractor.ts                  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  3a. CHECK CACHE                                                         │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  If cached analysis exists (within 30 days) → Skip to Brief Generation   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                       │
│         │ No cache                                                              │
│         ▼                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  3b. SERP DATA FETCHING                                                  │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  serpService.getSerpResults():                                           │  │
│  │    • Fetch top 10-20 search results                                      │  │
│  │    • Extract: People Also Ask questions                                  │  │
│  │    • Extract: Competitor URLs                                            │  │
│  │    • Extract: Featured snippets                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                       │
│         ▼                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  3c. COMPETITOR CONTENT EXTRACTION                                       │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  ComprehensiveCompetitorExtractor:                                       │  │
│  │    • Fetch 3-10 competitor pages (based on analysis depth)               │  │
│  │    • Via Jina AI Reader API or Firecrawl                                 │  │
│  │    • Extract: Word count, heading structure                              │  │
│  │    • Extract: Images (count, types)                                      │  │
│  │    • Extract: Schema markup presence                                     │  │
│  │    • Extract: Table of contents patterns                                 │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                       │
│         ▼                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  3d. MARKET PATTERN AGGREGATION                                          │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  MarketPatternAggregator.aggregate():                                    │  │
│  │                                                                          │  │
│  │  Output: CompetitorSpecs = {                                             │  │
│  │    dataQuality: "high" | "medium" | "low" | "none",                      │  │
│  │    analysisDate: "2026-02-06",                                           │  │
│  │    competitorsAnalyzed: 5,                                               │  │
│  │    targetWordCount: 2500,                                                │  │
│  │    wordCountRange: { min: 1800, max: 4200 },                             │  │
│  │    targetImageCount: 6,                                                  │  │
│  │    recommendedImageTypes: ["diagram", "screenshot", "infographic"],      │  │
│  │    hasVideoPercentage: 40,                                               │  │
│  │    avgH2Count: 8,                                                        │  │
│  │    avgH3Count: 15,                                                       │  │
│  │    requiredTopics: ["definition", "benefits", "comparison"],             │  │
│  │    benchmarks: { topCompetitorWordCount: 5000, ... }                     │  │
│  │  }                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: AI BRIEF GENERATION                                                    │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Service: services/ai/briefGeneration.ts                                        │
│  AI Providers: Gemini, OpenAI, Anthropic, Perplexity, OpenRouter                │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  PROMPT CONSTRUCTION                                                     │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  GENERATE_CONTENT_BRIEF_PROMPT includes:                                 │  │
│  │                                                                          │  │
│  │  ┌────────────────────────┐  ┌────────────────────────┐                 │  │
│  │  │ Topic Info             │  │ Strategic Context      │                 │  │
│  │  │ • Title                │  │ • SEO pillars          │                 │  │
│  │  │ • Search intent        │  │ • Central entity       │                 │  │
│  │  │ • Response code        │  │ • Industry/audience    │                 │  │
│  │  │ • Type (core/outer)    │  │ • Language/region      │                 │  │
│  │  └────────────────────────┘  └────────────────────────┘                 │  │
│  │                                                                          │  │
│  │  ┌────────────────────────┐  ┌────────────────────────┐                 │  │
│  │  │ Semantic Context       │  │ Competitor Insights    │                 │  │
│  │  │ • EAVs for topic       │  │ • Target word count    │                 │  │
│  │  │ • Knowledge graph      │  │ • Image recommendations│                 │  │
│  │  │ • Related topics       │  │ • Heading structure    │                 │  │
│  │  │ • Linking candidates   │  │ • Required topics      │                 │  │
│  │  └────────────────────────┘  └────────────────────────┘                 │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  AI SERVICE CALL                                                         │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │     dispatchToProvider(businessInfo, {                                   │  │
│  │       gemini: () => geminiService.generateContentBrief(...),             │  │
│  │       openai: () => openAiService.generateContentBrief(...),             │  │
│  │       anthropic: () => anthropicService.generateContentBrief(...),       │  │
│  │       perplexity: () => perplexityService.generateContentBrief(...),     │  │
│  │       openrouter: () => openRouterService.generateContentBrief(...)      │  │
│  │     })                                                                   │  │
│  │                                                                          │  │
│  │     ┌────────────────────────────────────────────────────────────────┐  │  │
│  │     │ RESPONSE PARSING                                               │  │  │
│  │     │ • JSON schema validation                                       │  │  │
│  │     │ • AIResponseSanitizer catches malformed data                   │  │  │
│  │     │ • Retry with fallback model if structured_outline empty        │  │  │
│  │     └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: POST-GENERATION ENRICHMENT                                             │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Service: briefGeneration.ts (lines 427-473)                                    │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  5a. VALIDATION                                                          │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • Language/region validation (log warnings if incomplete)               │  │
│  │  • Monetization brief validation (meets minimums?)                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                       │
│         ▼                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  5b. LENGTH SUGGESTION                                                   │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  suggestLengthPreset(topic, brief):                                      │  │
│  │                                                                          │  │
│  │    ┌──────────────────────────────────────────────────────────────┐     │  │
│  │    │ Topic Type        │ Preset        │ Target Words            │     │  │
│  │    │───────────────────│───────────────│─────────────────────────│     │  │
│  │    │ Core/monetization │ comprehensive │ 3000-5000               │     │  │
│  │    │ Outer/authority   │ short         │ 800-1200                │     │  │
│  │    │ Child/bridge      │ minimal       │ 400-600                 │     │  │
│  │    │ Standard          │ standard      │ 1500-2500               │     │  │
│  │    └──────────────────────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                       │
│         ▼                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  5c. VISUAL SEMANTICS ENRICHMENT                                         │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  enrichBriefWithVisualSemantics(brief):                                  │  │
│  │                                                                          │  │
│  │  Service: visualSemanticsService.ts                                      │  │
│  │                                                                          │  │
│  │  Adds enhanced_visual_semantics = {                                      │  │
│  │    hero_image: {                                                         │  │
│  │      image_description: "Primary visual...",                             │  │
│  │      alt_text_recommendation: "Vocabulary-extending alt text",           │  │
│  │      n_gram_match: ["hero", "featured"]                                  │  │
│  │    },                                                                    │  │
│  │    section_images: {                                                     │  │
│  │      "section-0": { image_description, alt_text, n_gram_match },         │  │
│  │      "section-1": { ... },                                               │  │
│  │      ...                                                                 │  │
│  │    },                                                                    │  │
│  │    image_count: 5                                                        │  │
│  │  }                                                                       │  │
│  │                                                                          │  │
│  │  Based on Koray's "Pixels, Letters, and Bytes" framework                 │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                       │
│         ▼                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  5d. COMPETITOR SPECS ATTACHMENT                                         │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  If marketPatterns provided → Attach as brief.competitorSpecs            │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 6: BRIEF STRUCTURE (Output)                                               │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  ContentBrief = {                                                        │  │
│  │    // Identifiers                                                        │  │
│  │    id: "uuid",                                                           │  │
│  │    topic_id: "uuid",                                                     │  │
│  │                                                                          │  │
│  │    // Basic Info                                                         │  │
│  │    title: "How to Build a Robot",                                        │  │
│  │    slug: "how-to-build-a-robot",                                         │  │
│  │    metaDescription: "Learn to build...",                                 │  │
│  │                                                                          │  │
│  │    // Content Structure                                                  │  │
│  │    keyTakeaways: ["...", "..."],                                         │  │
│  │    structured_outline: BriefSection[],   // Detailed sections            │  │
│  │                                                                          │  │
│  │    // SERP Data                                                          │  │
│  │    serpAnalysis: {                                                       │  │
│  │      peopleAlsoAsk: ["What is...", "How do..."],                         │  │
│  │      competitorHeadings: [...],                                          │  │
│  │      avgWordCount: 2500,                                                 │  │
│  │      contentGaps: ["missing topic 1", "missing topic 2"]                 │  │
│  │    },                                                                    │  │
│  │                                                                          │  │
│  │    // Visual Strategy                                                    │  │
│  │    enhanced_visual_semantics: {                                          │  │
│  │      hero_image: {...},                                                  │  │
│  │      section_images: {...},                                              │  │
│  │      image_count: 5                                                      │  │
│  │    },                                                                    │  │
│  │                                                                          │  │
│  │    // Semantic Context                                                   │  │
│  │    contextualVectors: SemanticTriple[],  // EAVs                         │  │
│  │    contextualBridge: ContextualBridgeLink[],  // Internal links          │  │
│  │                                                                          │  │
│  │    // Featured Snippet Targeting                                         │  │
│  │    featured_snippet_target: {                                            │  │
│  │      question: "What is a robot?",                                       │  │
│  │      answer_format: "paragraph",                                         │  │
│  │      target_section: "section-0"                                         │  │
│  │    },                                                                    │  │
│  │                                                                          │  │
│  │    // Competitor Insights                                                │  │
│  │    competitorSpecs: CompetitorSpecs,                                     │  │
│  │                                                                          │  │
│  │    // UI Hints                                                           │  │
│  │    suggestedLengthPreset: "comprehensive",                               │  │
│  │    suggestedLengthReason: "Core topic requires depth"                    │  │
│  │  }                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  BriefSection (structured_outline) = {                                   │  │
│  │    heading: "Understanding Robot Components",                            │  │
│  │    level: 2,  // H2                                                      │  │
│  │    subordinate_text_hint: "Explain motors, sensors, controllers...",     │  │
│  │    methodology_note: "Use comparison table for component types",         │  │
│  │    suggested_internal_links: ["sensors-guide", "motor-types"]            │  │
│  │  }                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 7: USER REVIEW & PERSISTENCE                                              │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Component: BriefReviewModal.tsx                                                │
│  Database:  INSERT INTO content_briefs                                          │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  USER ACTIONS:                                                           │  │
│  │  • Review generated brief                                                │  │
│  │  • Edit fields manually                                                  │  │
│  │  • Accept and save to Supabase                                           │  │
│  │  • Or: Regenerate with different settings                                │  │
│  │                                                                          │  │
│  │  ON SAVE:                                                                │  │
│  │  → INSERT INTO content_briefs (all fields)                               │  │
│  │  → dispatch({ type: 'ADD_BRIEF', payload: brief })                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ✅ CONTENT BRIEF COMPLETE                                                      │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  USER CAN NOW:                                                                  │
│    • View brief in ContentBriefModal                                            │
│    • Edit sections individually                                                 │
│    • Run competitive analysis                                                   │
│    • Repair missing fields                                                      │
│    • Generate article draft (10-pass system)                                    │
│                                                                                 │
│  BRIEF SERVES AS:                                                               │
│    • Single source of truth for article generation                              │
│    • Image plan (what images, where)                                            │
│    • Section guidance (headings, content hints)                                 │
│    • Internal linking strategy                                                  │
│    • Featured snippet targeting                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# 3. ARTICLE DRAFT GENERATION FLOW

## 10-Pass Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         10-PASS CONTENT GENERATION SYSTEM                       │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐           │
│  │ PASS 1  │──►│ PASS 2  │──►│ PASS 3  │──►│ PASS 4  │──►│ PASS 5  │           │
│  │ Draft   │   │ Headers │   │ Lists & │   │Discourse│   │ Micro   │           │
│  │Generation│   │ Optimize│   │ Tables  │   │Integrate│   │Semantics│           │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘           │
│       │                                                        │                │
│       │                                                        ▼                │
│       │        ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐           │
│       │        │ PASS 10 │◄──│ PASS 9  │◄──│ PASS 8  │◄──│ PASS 7  │           │
│       │        │ Schema  │   │ Audit   │   │ Final   │   │ Intro   │           │
│       │        │ JSON-LD │   │ Score   │   │ Polish  │   │Synthesis│           │
│       │        └─────────┘   └─────────┘   └─────────┘   └─────────┘           │
│       │             │                                          ▲                │
│       │             ▼                                          │                │
│       │        ┌─────────┐                              ┌─────────┐            │
│       │        │  FINAL  │                              │ PASS 6  │            │
│       │        │ OUTPUT  │                              │ Visual  │            │
│       │        └─────────┘                              │Semantics│            │
│       │                                                 └─────────┘            │
│       │                                                        ▲                │
│       └────────────────────────────────────────────────────────┘                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Detailed Pass-by-Pass Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  INITIATION: User Clicks "Generate Draft" in DraftingModal                      │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Hook: useContentGeneration.ts                                                  │
│  Service: ContentGenerationOrchestrator                                         │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  JOB CREATION                                                            │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  orchestrator.createJob(briefId, mapId, userId)                          │  │
│  │                                                                          │  │
│  │  → INSERT INTO content_generation_jobs:                                  │  │
│  │    • id, brief_id, map_id, user_id                                       │  │
│  │    • status: "pending"                                                   │  │
│  │    • current_pass: 1                                                     │  │
│  │    • passes_status: { pass_1_draft: null, pass_2_headers: null, ... }    │  │
│  │                                                                          │  │
│  │  → Fetch fresh brief from database (not stale React prop)                │  │
│  │  → Parse sections from brief: orchestrator.parseSectionsFromBrief()      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PASS 1: DRAFT GENERATION                                                       │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  File: pass1DraftGeneration.ts                                                  │
│  Goal: Create all article sections from brief                                   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  INPUT                                                                   │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • structured_outline (sections with headings)                           │  │
│  │  • serpAnalysis (word count targets)                                     │  │
│  │  • visual_semantics (image count hints)                                  │  │
│  │  • contextualBridge (internal linking)                                   │  │
│  │  • EAVs (semantic triples)                                               │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  PROCESSING STEPS                                                        │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  1. SMART LENGTH DETECTION                                               │  │
│  │     ┌────────────────────────────────────────────────────────────────┐  │  │
│  │     │ Analyzes: section count, image count, SERP word target         │  │  │
│  │     │ User topicType influences preset                               │  │  │
│  │     │ Smart cap: prevents 50% deviation from preset                  │  │  │
│  │     │                                                                │  │  │
│  │     │ Presets: minimal | short | standard | comprehensive            │  │  │
│  │     └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  2. TEMPLATE SELECTION                                                   │  │
│  │     ┌────────────────────────────────────────────────────────────────┐  │  │
│  │     │ templateRouter.ts: AI-driven selection                         │  │  │
│  │     │ Based on: website type, query intent, competitor analysis      │  │  │
│  │     │ Returns: template with confidence score and reasoning          │  │  │
│  │     └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  3. SECTION ORDERING                                                     │  │
│  │     ┌────────────────────────────────────────────────────────────────┐  │  │
│  │     │ AttributeRanker orders by EAV category:                        │  │  │
│  │     │ ROOT → UNIQUE → RARE → COMMON                                  │  │  │
│  │     │ Ensures core concepts appear first                             │  │  │
│  │     └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  4. FOR EACH SECTION:                                                    │  │
│  │     ┌────────────────────────────────────────────────────────────────┐  │  │
│  │     │                                                                │  │  │
│  │     │  a) Build section prompt:                                      │  │  │
│  │     │     • sectionPromptBuilder.ts                                  │  │  │
│  │     │     • Includes: heading, content hints, EAVs                   │  │  │
│  │     │     • Includes: flow guidance (position in article)            │  │  │
│  │     │     • Includes: image placeholder instruction (if designated) │  │  │
│  │     │                                                                │  │  │
│  │     │  b) Discourse context chaining:                                │  │  │
│  │     │     • ContextChainer.extractForNext(previousContent)           │  │  │
│  │     │     • Maintains S-P-O continuity between sections              │  │  │
│  │     │                                                                │  │  │
│  │     │  c) AI generation:                                             │  │  │
│  │     │     • dispatchToProvider() → Gemini/OpenAI/etc.                │  │  │
│  │     │     • Generate section content                                 │  │  │
│  │     │                                                                │  │  │
│  │     │  d) Validation:                                                │  │  │
│  │     │     • RulesValidator.validate() checks structure               │  │  │
│  │     │     • Retry up to 3x with fix instructions if fails            │  │  │
│  │     │                                                                │  │  │
│  │     │  e) Save:                                                      │  │  │
│  │     │     • orchestrator.upsertSection() → DB                        │  │  │
│  │     │     • UI callback for progress                                 │  │  │
│  │     │                                                                │  │  │
│  │     └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  OUTPUT                                                                  │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • Individual sections saved to content_generation_sections              │  │
│  │  • pass_1_content column populated for each section                      │  │
│  │  • Job updated: pass_1_draft = 'completed'                               │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PASS 2: HEADER OPTIMIZATION                                                    │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  File: pass2Headers.ts                                                          │
│  Goal: Optimize heading hierarchy and contextual overlap                        │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  PROCESSING                                                              │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • Uses baseSectionPass framework                                        │  │
│  │  • Individual processing (batchSize: 1)                                  │  │
│  │  • AI optimizes:                                                         │  │
│  │    - H1→H2→H3 hierarchy validation                                       │  │
│  │    - Contextual overlap with central entity                              │  │
│  │    - Semantic clarity vs. specificity balance                            │  │
│  │  • Progress checkpoint every 3 sections                                  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  OUTPUT: pass_2_headers column updated, current_content reflects changes        │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PASS 3: LISTS & TABLES OPTIMIZATION                                            │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  File: pass3Lists.ts                                                            │
│  Goal: Add/optimize structured data for featured snippets                       │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  FORMAT BUDGET (Baker Principle)                                         │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • Max lists: 40% of sections                                            │  │
│  │  • Max tables: 15% of sections                                           │  │
│  │  • Prevents over-saturation                                              │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  PROCESSING                                                              │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • Batch processing (batchSize: 3)                                       │  │
│  │  • Only processes sections needing optimization                          │  │
│  │  • Validates: Every list/table has `: ` introduction sentence            │  │
│  │  • Excludes intro/conclusion (handled in Pass 7)                         │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  OUTPUT: Sections with appropriate lists/tables added                           │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PASS 4: DISCOURSE INTEGRATION                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  File: pass6Discourse.ts (aliased to Pass 4)                                    │
│  Goal: Add contextual bridges, transitions, internal linking                    │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  PROCESSING                                                              │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • Batch processing (batchSize: 3)                                       │  │
│  │  • Includes adjacent sections for transition context                     │  │
│  │  • Adds:                                                                 │  │
│  │    - Smooth transitions between paragraphs                               │  │
│  │    - Contextual bridges explaining relevance                             │  │
│  │    - Internal link anchors                                               │  │
│  │  • Fallback: Generate links from topical map if brief lacks bridges      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  OUTPUT: Enhanced discourse flow and internal linking preparation               │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PASS 5: MICRO SEMANTICS OPTIMIZATION                                           │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  File: pass5MicroSemantics.ts                                                   │
│  Goal: Linguistic polish at sentence level                                      │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  OPTIMIZATION TARGETS                                                    │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • Modality certainty: Remove "maybe, might, could" → definitive         │  │
│  │  • Stop word reduction: Remove filler, maintain readability              │  │
│  │  • Subject positioning: Seed keyword early in sentences                  │  │
│  │  • Information density: Increase value per sentence                      │  │
│  │  • Reference principle: Clear pronouns, no ambiguity                     │  │
│  │  • Vocabulary: Type-Token Ratio optimization                             │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  OUTPUT: More definitive, information-dense content                             │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PASS 6: VISUAL SEMANTICS (Images)                                              │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  File: pass4Visuals.ts (aliased to Pass 6)                                      │
│  Goal: Add semantic images with vocabulary-extending alt text                   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  BRIEF-LED IMAGE PROCESSING                                              │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  1. Build set of brief-designated image sections:                        │  │
│  │     enhanced_visual_semantics.section_images → Set<string>               │  │
│  │                                                                          │  │
│  │  2. Filter sections to process:                                          │  │
│  │     ┌────────────────────────────────────────────────────────────────┐  │  │
│  │     │ a) Brief designates this section for image → INCLUDE           │  │  │
│  │     │ b) Section already has [IMAGE:] from Pass 1 → INCLUDE          │  │  │
│  │     │ c) Evaluate justified addition:                                │  │  │
│  │     │    • Word count > 300 AND no image                             │  │  │
│  │     │    • Contains process/step content AND no image                │  │  │
│  │     │    • Featured snippet target AND no image                      │  │  │
│  │     │    • ≥2 criteria met → JUSTIFIED, log via BriefChangeTracker   │  │  │
│  │     │ d) Otherwise → EXCLUDE                                         │  │  │
│  │     └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  3. Image placeholder format:                                            │  │
│  │     [IMAGE: Description of image | alt="Vocabulary-extending alt text"]  │  │
│  │                                                                          │  │
│  │  4. Change tracking:                                                     │  │
│  │     BriefChangeTracker.logImageAdded(pass, sectionKey, ...)              │  │
│  │     → Persists to content_briefs.generation_changes                      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  OUTPUT: Image placeholders added, change log updated                           │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PASS 7: INTRODUCTION SYNTHESIS                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  File: pass7Introduction.ts                                                     │
│  Goal: Rewrite intro AFTER body is fully polished                               │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  WHY AFTER BODY POLISH?                                                  │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • Intro can accurately summarize polished content                       │  │
│  │  • Can see final topic ordering, headings, images                        │  │
│  │  • Better synthesis of main topics                                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  PROCESSING                                                              │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • Topic-specific heading (not generic "Introduction")                   │  │
│  │  • Synthesizes main topics in correct order                              │  │
│  │  • Centerpiece entity clearly identified                                 │  │
│  │                                                                          │  │
│  │  Generic heading removal:                                                │  │
│  │    Banned: "Introduction", "Overview", "Summary"                         │  │
│  │    Replace with: "Wat is [entity]?", "[entity]: De Complete Gids"        │  │
│  │                                                                          │  │
│  │  Image preservation:                                                     │  │
│  │    • Reinserts hero image placeholder from Pass 6                        │  │
│  │    • Never places image between heading and first paragraph              │  │
│  │                                                                          │  │
│  │  NO CONCLUSION:                                                          │  │
│  │    • User preference: "I really dislike conclusions. Only AI does that." │  │
│  │    • Articles end with last substantive H2 section                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  OUTPUT: Topic-specific introduction, hero image preserved, no conclusion       │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PASS 8: FINAL POLISH                                                           │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  File: pass8FinalPolish.ts                                                      │
│  Goal: Publication-ready polishing with preservation                            │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  SMART PRESERVATION ENGINE                                               │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  Problem: Earlier architecture allowed AI to remove lists/tables/images  │  │
│  │  Solution: Section-by-section processing with element counting           │  │
│  │                                                                          │  │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │  │
│  │  │ BEFORE optimization: Count images, lists, tables, headings        │ │  │
│  │  │ AFTER optimization: Verify counts match                           │ │  │
│  │  │                                                                    │ │  │
│  │  │ Block conditions:                                                  │ │  │
│  │  │   • Images decreased → ALWAYS BLOCK                                │ │  │
│  │  │   • Lists/tables decreased AND within budget → BLOCK               │ │  │
│  │  │   • Content reduced >50% → BLOCK                                   │ │  │
│  │  │                                                                    │ │  │
│  │  │ If blocked: Keep original content                                  │ │  │
│  │  └────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                          │  │
│  │  Polish operations (when preserved):                                     │  │
│  │    • Smooth transitions between paragraphs                               │  │
│  │    • Consistent tone and voice                                           │  │
│  │    • Remove redundancy and filler                                        │  │
│  │    • Strengthen weak sentences                                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  OUTPUT: Publication-ready content with all structural elements preserved       │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PASS 9: FINAL AUDIT                                                            │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  File: pass8Audit.ts                                                            │
│  Goal: Quality scoring and compliance validation                                │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  AUDIT PROCESS                                                           │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  1. ASSEMBLE DRAFT                                                       │  │
│  │     orchestrator.assembleDraft() → Combines all sections                 │  │
│  │     Adds Related Topics section with contextual bridges                  │  │
│  │                                                                          │  │
│  │  2. HOLISTIC CONTEXT                                                     │  │
│  │     holisticAnalyzer.ts:                                                 │  │
│  │     • Type-Token Ratio (vocabulary diversity)                            │  │
│  │     • Entity frequency distribution                                      │  │
│  │     • Semantic richness metrics                                          │  │
│  │                                                                          │  │
│  │  3. ALGORITHMIC AUDIT (30+ checks)                                       │  │
│  │     ┌────────────────────────────────────────────────────────────────┐  │  │
│  │     │ Language & Style:                                              │  │  │
│  │     │   • Modality certainty                                         │  │  │
│  │     │   • Stop word density                                          │  │  │
│  │     │   • Subject positioning                                        │  │  │
│  │     │   • Passive voice ratio                                        │  │  │
│  │     │                                                                │  │  │
│  │     │ Structure:                                                     │  │  │
│  │     │   • Heading hierarchy (H1→H2→H3)                               │  │  │
│  │     │   • Heading-entity alignment                                   │  │  │
│  │     │   • Generic heading detection                                  │  │  │
│  │     │                                                                │  │  │
│  │     │ Specificity:                                                   │  │  │
│  │     │   • List count specificity                                     │  │  │
│  │     │   • First sentence precision                                   │  │  │
│  │     │                                                                │  │  │
│  │     │ Semantics:                                                     │  │  │
│  │     │   • Pronoun density                                            │  │  │
│  │     │   • Link positioning                                           │  │  │
│  │     │   • Image placement                                            │  │  │
│  │     │                                                                │  │  │
│  │     │ Compliance:                                                    │  │  │
│  │     │   • Template adherence                                         │  │  │
│  │     │   • EAV density                                                │  │  │
│  │     │   • Featured snippet targets                                   │  │  │
│  │     │                                                                │  │  │
│  │     │ LLM Detection:                                                 │  │  │
│  │     │   • AI signature phrases                                       │  │  │
│  │     │                                                                │  │  │
│  │     │ YMYL Validation (if applicable):                               │  │  │
│  │     │   • Medical/financial/legal compliance                         │  │  │
│  │     └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  4. COMPLIANCE SCORING                                                   │  │
│  │     calculateBriefCompliance():                                          │  │
│  │     • EAV coverage                                                       │  │
│  │     • Featured snippet optimization                                      │  │
│  │     • Target: ≥85% compliance                                            │  │
│  │                                                                          │  │
│  │  5. CROSS-PAGE CONSISTENCY (Knowledge-Based Trust)                       │  │
│  │     validateCrossPageEavConsistency():                                   │  │
│  │     • Compare EAVs against other articles in map                         │  │
│  │     • Detect contradictions: -2 points each, max -10                     │  │
│  │                                                                          │  │
│  │  6. FINAL SCORE CALCULATION                                              │  │
│  │     ┌────────────────────────────────────────────────────────────────┐  │  │
│  │     │                                                                │  │  │
│  │     │ finalScore = (60% × algorithmicScore)                          │  │  │
│  │     │            + (40% × complianceScore)                           │  │  │
│  │     │            - crossPagePenalty                                  │  │  │
│  │     │                                                                │  │  │
│  │     │ Thresholds:                                                    │  │  │
│  │     │   • CRITICAL: < 50% → FAILURE (article blocked)                │  │  │
│  │     │   • WARNING: < 70% → Needs improvement                         │  │  │
│  │     │   • PASS: ≥ 70% → Ready for next pass                          │  │  │
│  │     │                                                                │  │  │
│  │     └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  OUTPUT: final_audit_score, audit_details, draft_content synced to brief        │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PASS 10: SCHEMA GENERATION (JSON-LD)                                           │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  File: pass9SchemaGeneration.ts                                                 │
│  Goal: Generate comprehensive structured data for knowledge graph               │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  SCHEMA GENERATION PROCESS                                               │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │                                                                          │  │
│  │  1. PROGRESSIVE DATA VALIDATION                                          │  │
│  │     validateCompleteness() checks data collected from passes 1-8         │  │
│  │                                                                          │  │
│  │  2. SCHEMA GENERATION                                                    │  │
│  │     schemaGenerator.ts:                                                  │  │
│  │     • Generates base JSON-LD structure                                   │  │
│  │     • Types: Article, NewsArticle, BlogPosting, FAQPage, HowTo           │  │
│  │     • Includes: author, publisher, datePublished, mainEntity             │  │
│  │     • Entity extraction for knowledge graph                              │  │
│  │     • Claims/facts from EAVs                                             │  │
│  │                                                                          │  │
│  │  3. ENTITY RESOLUTION (Wikidata Integration)                             │  │
│  │     ┌────────────────────────────────────────────────────────────────┐  │  │
│  │     │ resolveEntities():                                             │  │  │
│  │     │   • Match entities to Wikidata URIs                            │  │  │
│  │     │   • Cache in entity_resolution_cache table                     │  │  │
│  │     │   • Create sameAs links for knowledge graph connectivity       │  │  │
│  │     │   • Uses Wikidata API for definitive matching                  │  │  │
│  │     │                                                                │  │  │
│  │     │ Example output:                                                │  │  │
│  │     │   "mainEntity": {                                              │  │  │
│  │     │     "@type": "Thing",                                          │  │  │
│  │     │     "name": "Robot",                                           │  │  │
│  │     │     "sameAs": [                                                │  │  │
│  │     │       "https://www.wikidata.org/wiki/Q11012",                  │  │  │
│  │     │       "https://en.wikipedia.org/wiki/Robot"                    │  │  │
│  │     │     ]                                                          │  │  │
│  │     │   }                                                            │  │  │
│  │     └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  4. VALIDATION                                                           │  │
│  │     • Schema structure validation (required fields)                      │  │
│  │     • Entity validation (proper Wikidata URIs)                           │  │
│  │     • Knowledge graph completeness check                                 │  │
│  │                                                                          │  │
│  │  5. AUTO-FIX SYSTEM                                                      │  │
│  │     If enabled: applyAutoFixes()                                         │  │
│  │     • Fix missing required fields                                        │  │
│  │     • Correct schema structure                                           │  │
│  │     • Merge entity sameAs URLs                                           │  │
│  │     • Re-validate after fixes                                            │  │
│  │                                                                          │  │
│  │  6. DATABASE PERSISTENCE                                                 │  │
│  │     Saves to content_generation_jobs:                                    │  │
│  │     • schema_data (full JSON-LD)                                         │  │
│  │     • schema_validation_results                                          │  │
│  │     • schema_entities (resolved entity list)                             │  │
│  │     • schema_page_type (detected page type)                              │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  OUTPUT: EnhancedSchemaResult with JSON-LD, validation, resolved entities       │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  FINALIZATION                                                                   │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  CHANGE TRACKER PERSISTENCE                                              │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  orchestrator.finalizeChangeTracker(jobId)                               │  │
│  │  → Persists all logged changes to content_briefs.generation_changes      │  │
│  │  → UI can display what deviations occurred from original brief           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  JOB STATUS UPDATE                                                       │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  • status: "completed"                                                   │  │
│  │  • completed_at: now()                                                   │  │
│  │  • All pass statuses: "completed"                                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  BRIEF SYNC                                                              │  │
│  │  ─────────────────────────────────────────────────────────────────────── │  │
│  │  orchestrator.syncDraftToBrief()                                         │  │
│  │  → Updates content_briefs.article_draft with final content               │  │
│  │  → Brief becomes authoritative source for article                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ✅ ARTICLE DRAFT COMPLETE                                                      │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  FINAL OUTPUT:                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌─ content_generation_jobs ─────────────────────────────────────────────────┐ │
│  │  • draft_content: Full assembled article                                  │ │
│  │  • final_audit_score: 0-100%                                              │ │
│  │  • audit_details: All rule results + compliance breakdown                 │ │
│  │  • schema_data: Complete JSON-LD                                          │ │
│  │  • schema_entities: Resolved Wikidata entities                            │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─ content_briefs ──────────────────────────────────────────────────────────┐ │
│  │  • article_draft: User's authoritative version                            │ │
│  │  • generation_changes: Log of all deviations from brief plan              │ │
│  │  • generation_summary: Statistics (images added, modified, etc.)          │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  USER CAN NOW:                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  • View article in DraftingModal                                                │
│  • Review quality audit results                                                 │
│  • View generation changes (what deviated from brief)                           │
│  • View/edit JSON-LD schema                                                     │
│  • Export to WordPress                                                          │
│  • Style & Publish (brand-matched HTML rendering)                               │
│  • Generate images from placeholders                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Tables Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  DATABASE TABLES INVOLVED                                                       │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌─ Topical Map Creation ────────────────────────────────────────────────────┐ │
│  │  • user_settings: API keys, default AI provider                           │ │
│  │  • projects: Project container                                            │ │
│  │  • topical_maps: business_info, pillars, eavs, competitors                │ │
│  │  • topics: Core and outer topics                                          │ │
│  │  • foundation_pages: Homepage, About, etc.                                │ │
│  │  • navigation_structures: Site navigation                                 │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─ Content Brief Creation ──────────────────────────────────────────────────┐ │
│  │  • content_briefs: All brief fields including visual_semantics            │ │
│  │  • topical_maps: Pillars, EAVs (read)                                     │ │
│  │  • topics: Topic metadata (read)                                          │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─ Article Draft Generation ────────────────────────────────────────────────┐ │
│  │  • content_generation_jobs: Job state, pass status, scores, schema        │ │
│  │  • content_generation_sections: Per-section content with versioning       │ │
│  │  • content_briefs: article_draft, generation_changes (write)              │ │
│  │  • entity_resolution_cache: Cached Wikidata resolutions                   │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## AI Providers Used

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  AI PROVIDER SYSTEM                                                             │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  SUPPORTED PROVIDERS                                                    │   │
│  │  ───────────────────────────────────────────────────────────────────── │   │
│  │                                                                         │   │
│  │  1. Gemini (Google)      - services/geminiService.ts                   │   │
│  │  2. OpenAI (GPT-4, etc.) - services/openAiService.ts                   │   │
│  │  3. Anthropic (Claude)   - services/anthropicService.ts                │   │
│  │  4. Perplexity           - services/perplexityService.ts               │   │
│  │  5. OpenRouter           - services/openRouterService.ts               │   │
│  │                                                                         │   │
│  │  DISPATCH LOGIC (providerDispatcher.ts):                               │   │
│  │  ─────────────────────────────────────────────────────────────────────│   │
│  │  dispatchToProvider(businessInfo, {                                    │   │
│  │    gemini: () => geminiService.func(...),                              │   │
│  │    openai: () => openAiService.func(...),                              │   │
│  │    anthropic: () => anthropicService.func(...),                        │   │
│  │    perplexity: () => perplexityService.func(...),                      │   │
│  │    openrouter: () => openRouterService.func(...)                       │   │
│  │  })                                                                    │   │
│  │                                                                         │   │
│  │  Provider selection from: businessInfo.aiProvider                      │   │
│  │  Model selection from: businessInfo.aiModel                            │   │
│  │                                                                         │   │
│  │  FALLBACK SYSTEM:                                                      │   │
│  │  callProviderWithFallback(businessInfo, prompt, retries)               │   │
│  │  • Tries primary provider                                              │   │
│  │  • Falls back to secondary on failure                                  │   │
│  │  • Exponential backoff on retries                                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```
