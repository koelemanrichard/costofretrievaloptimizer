# Holistic SEO Workbench: Functional Specification

This document provides a comprehensive overview of all features currently implemented in the application, as well as a list of features that were part of the original design but are not currently present.

## Current Features

### 1. Project & Topical Map Management

-   **Feature:** Project Creation & Loading
    -   **User Benefit:** Provides a persistent, organized workspace. Users can manage multiple SEO strategies for different domains without losing their work.
    -   **Workflow:** On the `ProjectSelectionScreen`, users can create a new project by providing a name and domain, or select a previously created project from a list.
    -   **Core Logic Location:** `App.tsx` (handlers: `handleCreateProject`, `handleLoadProject`), `components/ProjectTypeSelection.tsx` (UI)
    -   **Services & Dependencies:** `services/supabaseClient.ts` for database persistence.

-   **Feature:** Topical Map Selection & Creation
    -   **User Benefit:** Allows a single project to have multiple, distinct content strategies (e.g., "Q1 Content Plan", "Competitor Analysis Map").
    -   **Workflow:** After loading a project, the `MapSelectionScreen` displays all associated maps. Users can load a map or click "Create New Map" which opens the `NewMapModal`.
    -   **Core Logic Location:** `App.tsx` (`handleCreateMap`), `components/MapSelectionScreen.tsx`, `components/NewMapModal.tsx`
    -   **Services & Dependencies:** `services/supabaseClient.ts`.

### 2. New Topical Map Generation Wizard

This is the core workflow for creating a new content strategy from scratch.

-   **Feature:** Step 1: Business Info Definition
    -   **User Benefit:** Aligns the entire AI strategy with the user's specific business context, ensuring relevance and quality.
    -   **Workflow:** The user fills out the `BusinessInfoForm` with details like their value proposition and seed keyword. This data is saved to the specific topical map record.
    -   **Core Logic Location:** `components/ProjectWorkspace.tsx` (`handleBusinessInfoComplete`), `components/BusinessInfoForm.tsx`.
    -   **Services & Dependencies:** `services/supabaseClient.ts`.

-   **Feature:** Step 2: SEO Pillar Definition
    -   **User Benefit:** Establishes the strategic foundation (Central Entity, Source Context, Search Intent) of the topical map, based on the Holistic SEO framework.
    -   **Workflow:** The `PillarDefinitionWizard` uses AI to suggest candidates for each pillar. The user selects or refines these suggestions.
    -   **Core Logic Location:** `components/ProjectWorkspace.tsx` (`handlePillarsFinalized`), `components/PillarDefinitionWizard.tsx`.
    -   **Services & Dependencies:** `services/aiService.ts` (`suggestCentralEntityCandidates`, etc.).

-   **Feature:** Step 3: Semantic Triple (EAV) Discovery
    -   **User Benefit:** Builds the semantic "skeleton" of the map by defining core facts about the Central Entity, ensuring content is factually grounded.
    -   **Workflow:** The `EavDiscoveryWizard` uses AI to suggest EAVs (e.g., `Software - HAS_FEATURE - Automation`). The user can review, edit, and expand this list.
    -   **Core Logic Location:** `components/ProjectWorkspace.tsx` (`handleEavsFinalized`), `components/EavDiscoveryWizard.tsx`.
    -   **Services & Dependencies:** `services/aiService.ts` (`discoverCoreSemanticTriples`).

-   **Feature:** Step 4: Competitor Refinement & Map Generation
    -   **User Benefit:** Uses real-world SERP data to inform the AI's topic generation, making the map competitively aware.
    -   **Workflow:** The `CompetitorRefinementWizard` uses the seed keyword to find top competitors. The user refines this list. Upon finalizing, the AI uses all previously defined strategic data to generate the initial set of core and outer topics.
    -   **Core Logic Location:** `components/ProjectWorkspace.tsx` (`handleCompetitorsFinalized`), `components/CompetitorRefinementWizard.tsx`.
    -   **Services & Dependencies:** `services/serpApiService.ts`, `services/aiService.ts` (`generateInitialTopicalMap`), `services/supabaseClient.ts`.

### 3. Topical Map Dashboard & Content Workflow

-   **Feature:** Dashboard View
    -   **User Benefit:** Provides the main workspace for viewing and interacting with a generated topical map.
    -   **Workflow:** After a map is loaded or created, the `ProjectDashboard` is displayed, showing key metrics and the list of topics.
    -   **Core Logic Location:** `components/ProjectDashboardContainer.tsx` (data fetching & view logic), `components/ProjectDashboard.tsx` (UI).
    -   **Services & Dependencies:** `state/appState.ts`.

-   **Feature:** Topic Visualization (List & Graph)
    -   **User Benefit:** Allows users to understand the map's structure both textually and visually.
    -   **Workflow:** The user can toggle between a hierarchical list view and a force-directed graph view of the topics.
    -   **Core Logic Location:** `components/TopicalMapDisplay.tsx`, `components/TopicalMapGraphView.tsx`.
    -   **Services & Dependencies:** None.

-   **Feature:** Content Brief Generation
    -   **User Benefit:** Creates detailed, AI-powered outlines for writers, ensuring every piece of content aligns with the overall strategy.
    -   **Workflow:** User clicks the "Generate Brief" icon on a topic. The `ResponseCodeSelectionModal` appears, suggesting a content template. Upon confirmation, the AI generates the brief.
    -   **Core Logic Location:** `App.tsx` (`handleGenerateBrief`), `components/ResponseCodeSelectionModal.tsx`.
    -   **Services & Dependencies:** `services/aiService.ts` (`generateContentBrief`).

-   **Feature:** Article Draft Generation, Audit, and Schema
    -   **User Benefit:** Accelerates content production, ensures quality, and makes content machine-readable.
    -   **Workflow:** From the `ContentBriefModal`, the user clicks "Generate Draft." From the resulting `DraftingModal`, the user can then "Audit Content Integrity" or "Generate Schema."
    -   **Core Logic Location:** `App.tsx` (`handleGenerateDraft`, `handleAuditDraft`, `handleGenerateSchema`), `components/DraftingModal.tsx`, `components/ContentIntegrityModal.tsx`, `components/SchemaModal.tsx`.
    -   **Services & Dependencies:** `services/aiService.ts`.

-   **Feature:** GSC Expansion Hub
    -   **User Benefit:** Finds new content opportunities based on real-world search performance data.
    -   **Workflow:** User clicks "Upload GSC CSV" on the dashboard. In the `GscExpansionHubModal`, they upload their file. The AI analyzes it to find "striking distance" keywords, which can be added to the map.
    -   **Core Logic Location:** `App.tsx` (`handleAnalyzeGsc`), `components/GscExpansionHubModal.tsx`.
    -   **Services & Dependencies:** `services/gscService.ts`, `services/aiService.ts` (`findGscOpportunities`).

-   **Feature:** Internal Linking Visualization
    -   **User Benefit:** Provides a visual, interactive graph of the site's internal linking structure, helping to identify orphan pages and understand how topical authority flows between articles.
    -   **Workflow:** (Trigger is currently missing from the dashboard). When opened, `InternalLinkingModal` displays a force-directed graph of all topics. Solid lines are hierarchical links, dashed lines are contextual links from briefs.
    -   **Core Logic Location:** `components/InternalLinkingModal.tsx`, `components/ui/GraphVisualization.tsx`.
    -   **Services & Dependencies:** `state/appState.ts`.

-   **Feature:** Knowledge Domain Analysis
    -   **User Benefit:** Analyzes the entire map to build a knowledge graph, which can then be used to find content gaps and suggest new topics.
    -   **Workflow:** User clicks "Analyze Knowledge Domain" on the dashboard. The AI builds the graph and suggests new topics, which are displayed in the `KnowledgeDomainModal`.
    -   **Core Logic Location:** `App.tsx` (`handleAnalyzeKnowledgeDomain`), `components/KnowledgeDomainModal.tsx`.
    -   **Services & Dependencies:** `services/aiService.ts` (`buildKnowledgeGraphFromMap`, `findKnowledgeGapsAndSuggestTopics`).
    -   **Note:** Currently buggy, as noted in `PLACEHOLDERS.md`.

---

## Removed or Not Yet Implemented Features

This section lists features that were part of the application's design or previous iterations but are currently missing from the main user workflow.

1.  **AI Analysis of an Existing Website (Audit Workflow)**
    -   **Description:** This was a major project type where a user could input a domain, and a backend pipeline of Supabase Edge Functions (`start-website-analysis`, `sitemap-discovery`, `crawl-worker`, etc.) would crawl the site, analyze its content, and generate a report comparing its current topical map to an ideal one.
    -   **Status:** **Removed from Frontend.** The backend Edge Functions (`/supabase/functions/`) for this entire pipeline still exist in the codebase, but there is no longer any UI in the `ProjectSelectionScreen` or anywhere else to trigger this workflow. It was likely removed during the refactor to focus on the "New Map" creation workflow first.
    -   **Reinstatement Priority:** High. This is a critical half of the application's intended functionality.

2.  **Advanced Analysis Tools**
    -   **Description:** The dashboard was intended to have a suite of buttons to trigger deep analysis of the completed map. This included Semantic Analysis, Publication Planning, Link Auditing, and Topical Authority Scoring.
    -   **Status:** **Not Implemented.** The modals to *display* the results of these analyses exist (`SemanticAnalysisModal.tsx`, etc.), but the dashboard buttons, `App.tsx` handlers, and `aiService.ts` functions to *perform* the analyses have not been created. This is why the modals are never shown.
    -   **Reinstatement Priority:** High. These tools are the primary way for a user to refine and improve their map after the initial generation.

3.  **Manual Topic Management**
    -   **Description:** The ability for a user to manually add a new core or outer topic directly from the dashboard, without it being an AI suggestion.
    -   **Status:** **Removed/Not Implemented.** This basic functionality appears to have been overlooked during the implementation of the AI-driven topic suggestion features.
    -   **Reinstatement Priority:** Medium. While AI suggestions are powerful, manual control is essential for user agency.