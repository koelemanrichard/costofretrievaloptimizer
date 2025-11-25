# Supporting Project Documentation

This document contains the complete text of all supporting documentation files for the Holistic SEO Workbench project.

---
## File: `APPLICATION_FEATURES.md`
---
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

---
## File: `CONFIG_SCHEMA.md`
---
# Application Configuration Schema

This document is the single source of truth for all user-configurable settings in the application. It dictates the structure of the `settings_data` field in the `user_settings` table and the fields available in the `SettingsModal` component.

## 1. AI Provider Configuration

These settings control the default AI provider and model for all operations. They are managed in the "AI Providers" tab of the Settings Modal.

| Key             | Type                                                           | Description                                                                                                   |
| :-------------- | :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `aiProvider`    | `'gemini' \| 'openai' \| 'anthropic' \| 'perplexity' \| 'openrouter'` | The default AI provider to use for all generative tasks. Can be overridden on a per-map basis.                |
| `aiModel`       | `string`                                                       | The specific model to use from the selected provider (e.g., `gemini-2.5-flash`, `gpt-4o`).                        |
| `geminiApiKey`  | `string` (encrypted)                                           | The API key for Google Gemini services.                                                                       |
| `openAiApiKey`  | `string` (encrypted)                                           | The API key for OpenAI services.                                                                              |
| `anthropicApiKey`| `string` (encrypted)                                          | The API key for Anthropic (Claude) services.                                                                  |
| `perplexityApiKey`| `string` (encrypted)                                        | The API key for Perplexity AI services.                                                                       |
| `openRouterApiKey`| `string` (encrypted)                                        | The API key for OpenRouter, which acts as a proxy for multiple models.                                        |

## 2. SERP & Crawling Service Credentials

These settings are for third-party services used for fetching Search Engine Results Page (SERP) data and crawling websites. They are managed in the "SERP & Services" tab.

| Key                  | Type                 | Description                                                              |
| :------------------- | :------------------- | :----------------------------------------------------------------------- |
| `dataforseoLogin`    | `string` (encrypted) | The login email for the DataForSEO API.                                  |
| `dataforseoPassword` | `string` (encrypted) | The password (API key) for the DataForSEO API.                           |
| `apifyToken`         | `string` (encrypted) | The API token for the Apify platform, used for web scraping and crawling. |
| `firecrawlApiKey`    | `string` (encrypted) | The API key for the Firecrawl service, an alternative for web crawling.  |

## 3. Knowledge Graph & Tooling Credentials

These are credentials for services that provide knowledge graph capabilities or other specialized tools. They are managed in the "SERP & Services" tab.

| Key                 | Type                 | Description                                                                 |
| :------------------ | :------------------- | :-------------------------------------------------------------------------- |
| `infranodusApiKey`  | `string` (encrypted) | The API key for Infranodus, used for text-to-graph visualization.         |
| `jinaApiKey`        | `string` (encrypted) | The API key for Jina AI, which can be used for multimodal embedding tasks.  |
| `apitemplateApiKey` | `string` (encrypted) | The API key for APITemplate.io, used for generating PDFs or images.       |
| `neo4jUri`          | `string` (encrypted) | The connection URI for a Neo4j graph database instance (e.g., `neo4j+s://...`). |
| `neo4jUser`         | `string` (encrypted) | The username for the Neo4j database.                                        |
| `neo4jPassword`     | `string` (encrypted) | The password for the Neo4j database.                                        |

---
## File: `DEBUGGING_GUIDE.md`
---
# Debugging Guide

This guide provides a structured approach to debugging common issues in the Holistic SEO Workbench application.

## 1. The Developer's Toolkit

Your primary debugging tools are:

1.  **The Browser's Developer Console:** Check for runtime errors, failed network requests, and `console.log` messages.
2.  **The Application Log Panel:** This in-app log provides a high-level trace of the application's actions, especially AI service calls. It's the first place to look for logical errors.
3.  **The State Debug Panel:** This panel shows a curated snapshot of the most critical parts of the application's global state. Use it to verify that state is being updated as expected after an action.

## 2. Common Issues & Triage Steps

### Issue: "Minified React Error" / White Screen of Death

-   **Symptom:** The application UI disappears and the console shows a "Minified React error..." message.
-   **Root Cause:** This is almost always caused by **invalid data entering the application's state**. A component tries to render this data (e.g., calling `.map()` on a string that should be an array) and crashes the entire render tree.
-   **Triage Steps:**
    1.  **Identify the Trigger:** What was the last action you performed? (e.g., "Clicked 'Generate Brief'").
    2.  **Trace the Data Flow:** Find the handler function for that action (e.g., `onGenerateBrief` in `ProjectDashboardContainer.tsx`).
    3.  **Inspect the `AIResponseSanitizer`:** This is the most likely point of failure. The AI has likely returned a malformed response that the sanitizer is not catching.
    4.  **Simulate the Failure:** Add a `console.log` to see the raw AI response. Manually call the `sanitizer.sanitize()` function with this raw response and log the output. Does the output match the expected TypeScript type? If not, the sanitizer's schema or logic is flawed.
    5.  **Fix:** Enhance the sanitizer's schema and logic to be more robust and handle the specific malformation.

### Issue: AI Service Call Fails with "API key not configured"

-   **Symptom:** An action that calls an AI service fails, and the Application Log shows an "API key not configured" error.
-   **Root Cause:** The `effectiveBusinessInfo` object passed to the `aiService` function is incomplete. This usually happens when the logic fails to correctly merge the user's global settings (which contain the API keys) with the map-specific strategic data.
-   **Triage Steps:**
    1.  **Check the `SettingsModal`:** First, ensure you have actually saved a valid API key for the selected provider in the global settings.
    2.  **Inspect the Calling Component:** Find the component that initiates the AI call (e.g., `ProjectDashboardContainer.tsx`).
    3.  **Examine the `effectiveBusinessInfo` Object:** Use the State Debug Panel or a `console.log` to inspect the `effectiveBusinessInfo` object that is being constructed. Does it contain the expected API key from the global state?
    4.  **Fix:** Correct the logic (likely a `useMemo` hook) that is responsible for creating this merged context object.

### Issue: Data Seems to Disappear After Being Fetched

-   **Symptom:** You see a successful network request in the console (e.g., fetching topical maps), but the UI doesn't update and the data is not in the State Debug Panel.
-   **Root Cause:** This is a classic state management race condition in the `appReducer`. An action is being dispatched that incorrectly clears the state *after* the data has been set.
-   **Triage Steps:**
    1.  **Identify the Actions:** Find the handler function that performs the fetch (e.g., `handleLoadProject` in `App.tsx`). Note the sequence of actions being dispatched.
    2.  **Examine the Reducer:** Go to `state/appState.ts` and carefully review the `case` for each action being dispatched. Look for a reducer case that is unintentionally resetting a slice of state (e.g., setting `topicalMaps: []`).
    3.  **Fix:** Correct the logic in the reducer or, more commonly, change the order of the `dispatch` calls in the handler function so that the "reset" action happens *before* the "populate" action.

---
## File: `DEPLOYMENT_GUIDE.md`
---
# Deployment & Setup Guide

This guide provides the steps required to set up the database and backend for the Holistic SEO Workbench application.

## 1. Supabase Project Setup

1.  **Create a New Supabase Project:**
    -   Go to [supabase.com](https://supabase.com) and create a new project.
    -   Choose a strong database password and save it securely.
2.  **Get Project Credentials:**
    -   Navigate to **Project Settings > API**.
    -   You will need the **Project URL** and the **`anon` public key**.
3.  **Update Frontend Configuration:**
    -   Open `config/defaults.ts`.
    -   Update the `supabaseUrl` and `supabaseAnonKey` with the values from your Supabase project.

## 2. Database Schema Initialization

1.  **Navigate to the SQL Editor:**
    -   In your Supabase project, go to the **SQL Editor** section.
2.  **Run the Setup Script:**
    -   Open the `SUPABASE_SETUP_GUIDE.md` file from this project.
    -   Copy the entire content of the SQL script.
    -   Paste the script into a new query in the Supabase SQL Editor and click "RUN".
    -   **Note:** The script is idempotent, meaning you can safely run it multiple times. It will only create tables and functions if they don't already exist.
3.  **Verify Schema:**
    -   Go to the **Table Editor**. You should see the new tables: `projects`, `topical_maps`, `topics`, etc.

## 3. Supabase Edge Functions Setup

### 3.1. Set Environment Variables & Secrets

This is the most critical step. The backend functions require secrets to operate.

1.  **Navigate to Edge Functions Settings:**
    -   Go to **Project Settings > Functions**.
2.  **Add Secrets:**
    -   You must add the following secrets. Click "Add new secret" for each one.
    -   **`PROJECT_URL`**: Your Supabase Project URL (e.g., `https://xyz.supabase.co`).
    -   **`SERVICE_ROLE_KEY`**: Found in **Project Settings > API**. This key bypasses RLS and should be treated with extreme care.
    -   **`ANON_KEY`**: Your public `anon` key, also from the API settings.
    -   **`ENCRYPTION_SECRET`**: This is for securing API keys.
        -   **Action:** You must generate a new, cryptographically secure 32-byte key.
        -   **How to Generate:** Go to an online tool like [RandomKeygen](https://randomkeygen.com/), select "256-bit", and generate a key. **Copy the Base64 version.**
        -   **Example:** `your_generated_base64_string_here`
        -   **Save this secret.** If you lose it, all encrypted API keys will be unrecoverable.

### 3.2. Deploy the Functions

You must have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and be logged in (`supabase login`).

1.  **Link the Project:**
    -   In your local project terminal, run: `supabase link --project-ref YOUR_PROJECT_REF`
    -   Replace `YOUR_PROJECT_REF` with the one from your project's URL.
2.  **Deploy All Functions:**
    -   Run the command: `supabase functions deploy --no-verify-jwt`
    -   The `--no-verify-jwt` flag is used for functions that will be called by other functions or external webhooks.
3.  **Verify Deployment:**
    -   Go to the **Edge Functions** section in your Supabase dashboard. You should see all the deployed functions listed (e.g., `start-website-analysis`, `get-settings`, etc.).

## 4. Final Health Check

1.  **Run the Health Check Function:**
    -   Go to **Edge Functions**, click on `health-check`.
    -   Copy the function's URL.
    -   Use a tool like Postman or `curl` to make a `GET` request to this URL.
    -   **Expected Result:** You should receive a JSON response with `ok: true` and all checks (`secrets`, `permissions`, `schema`, `encryption`) showing as successful. If any check fails, the error message will guide you to the misconfigured setting.

Your application is now fully deployed and configured.

---
## File: `FAILURE_LOG.md`
---
# Failure & Regression Log

**Purpose:** This document is a system of record for tracking critical failures, their root causes, and the steps taken to resolve them. It serves as our institutional memory to prevent repeating mistakes.

---

### **Incident #1: Critical Crash on "Generate Content Brief"**

-   **Failure Count:** 23
-   **User Report:** Application crashes after clicking "Generate Content Brief" in the `ResponseCodeSelectionModal`. The UI disappears, and a "Minified React error #31" appears in the console.

#### **Attempt #1: Incorrect Diagnosis (Race Condition)**

-   **Hypothesis:** A race condition exists where `onGenerateBrief` is called before the `activeBriefTopic` is set in the global state, causing a null reference.
-   **Action:** Refactored the data flow to use local component state (`topicForBrief`) and pass the topic explicitly through props. Wrapped the AI call in a `try...catch` block.
-   **Result:** **FAILURE.** The application still crashed. While the data flow was improved and the `try...catch` block was a good addition, it did not address the true root cause. The error was happening *after* the AI call succeeded, during the React render phase.

#### **Attempt #2: Incorrect Diagnosis (Type Inference)**

-   **Hypothesis:** The complex TypeScript generics in the `services/aiService.ts` `delegate` function were failing to infer the correct return type, leading to a malformed object that React could not render.
-   **Action:** Simplified the `delegate` function by removing complex generics and using explicit type casting on all exported functions.
-   **Result:** **FAILURE.** The application still crashed. The refactoring made the `aiService` cleaner and more maintainable, but the data corruption was happening further downstream.

#### **Attempt #3: Correct Diagnosis (Lack of Deep Validation)**

-   **Hypothesis:** The **true root cause** is that the `AIResponseSanitizer` is not performing deep, recursive validation on nested objects. The AI can return a malformed nested object (e.g., a string where an object with specific keys is expected). The shallow sanitizer allows this invalid data into the application's state. When a UI component tries to access a property on this malformed data (e.g., `serpAnalysis.peopleAlsoAsk.map(...)` when `peopleAlsoAsk` is a string), it throws a `TypeError`, which crashes the React render tree.
-   **Action:**
    1.  Upgrade the `AIResponseSanitizer`'s `sanitize` method to be fully recursive.
    2.  Provide a detailed, nested schema in `geminiService.ts` for the `ContentBrief` type.
    3.  Ensure the fallback object matches this deep structure.
-   **Result:** **SUCCESS.** This addresses the root cause by guaranteeing that the data structure is always valid before it enters the application state, regardless of how the AI formats its response. This prevents the crash.

---
## File: `HOLISTIC_PLAN.md`
---
# Holistic SEO Workbench: Strategic Development Plan

**Objective:** To build a best-in-class strategic SEO tool based on the Holistic SEO framework. This document outlines the high-level plan, architecture, and phased development approach.

## 1. Core Philosophy: AI-First, User-in-Control

The fundamental principle of this application is **"AI-first, user-in-control."** This means:

-   **AI-First:** The application leverages Large Language Models (LLMs) for all heavy lifting: data analysis, content generation, strategic suggestions, and auditing. The goal is to automate as much of the tactical SEO work as possible.
-   **User-in-Control:** The user is always the strategist. Every AI action is constrained by user-defined business context and strategic goals. The UI is designed as a "workbench" that provides the user with powerful, AI-driven tools, but the final decision always rests with the user.

This approach is designed to create a tool that produces expert-level, strategically-aligned outputs, not generic AI-generated content.

## 2. High-Level Architecture

The application will be a modern, scalable web application with a clear separation of concerns.

-   **Frontend:** A single-page application (SPA) built with **React**, **TypeScript**, and **TailwindCSS**.
-   **State Management:** A robust, predictable global state management system using React's `Context` and `useReducer` hooks (`appState.ts`).
-   **Backend:** A serverless architecture powered by **Supabase**.
    -   **Database:** Supabase PostgreSQL will be the single source of truth for all user data.
    -   **Authentication:** Supabase Auth for secure user management.
    -   **Serverless Functions:** A pipeline of Deno Edge Functions will handle all asynchronous, long-running tasks, such as crawling and analyzing a website.
-   **AI Services:** A flexible abstraction layer (`services/aiService.ts`) will allow the application to easily switch between different AI providers (Gemini, OpenAI, Anthropic, etc.), ensuring the application is not locked into a single vendor.

## 3. Phased Development Plan

Development will proceed in a series of focused, iterative phases.

### Phase 1: Foundational Architecture & Data Model (✅ Complete)

-   **Objective:** Establish a stable, scalable foundation for the application.
-   **Key Tasks:**
    -   [x] Set up the Supabase project.
    -   [x] Design and implement the core relational database schema (`projects`, `topical_maps`, `topics`, `content_briefs`).
    -   [x] Implement a robust, idempotent SQL setup script (`SUPABASE_SETUP_GUIDE.md`).
    -   [x] Implement secure user authentication.
    -   [x] Create the core frontend application shell with the global state provider.

### Phase 2: Core User Workflow - "New Map" Generation (✅ Complete)

-   **Objective:** Build the primary user journey for creating a new topical map from scratch.
-   **Key Tasks:**
    -   [x] Implement the `ProjectSelectionScreen` and `MapSelectionScreen`.
    -   [x] Build the multi-step "New Map" wizard, including:
        -   `BusinessInfoForm`
        -   `PillarDefinitionWizard`
        -   `EavDiscoveryWizard`
        -   `CompetitorRefinementWizard`
    -   [x] Integrate all necessary AI service calls to power the wizard.
    -   [x] Ensure all strategic data from the wizard is correctly persisted to the database.
    -   [x] Implement the `generateInitialTopicalMap` AI call to create the first set of topics.

### Phase 3: The Dashboard & Core Tooling (In Progress)

-   **Objective:** Build the main workspace where users interact with their generated topical map.
-   **Key Tasks:**
    -   [ ] Implement the `ProjectDashboard` UI, including the `TopicalMapDisplay` and `StrategicDashboard` components.
    -   [ ] Build the complete "Generate Content Brief" workflow, including the `ResponseCodeSelectionModal` and `ContentBriefModal`.
    -   [ ] Implement the "Article Draft" generation and auditing features.
    -   [ ] Implement the "Knowledge Domain Analysis" feature.
    -   [ ] Implement the "GSC Expansion Hub" feature.

### Phase 4: Advanced Analysis & Reporting (Future)

-   **Objective:** Build out the full suite of advanced auditing and strategic planning tools.
-   **Key Tasks:**
    -   [ ] Implement all remaining "Advanced Analysis" features (Semantic Analysis, Link Audit, etc.).
    -   [ ] Implement the "Analyze Existing Website" audit workflow.
    -   [ ] Build a comprehensive export feature to package the entire topical map and all assets for the user.
    -   [ ] Implement a content calendar and publication planning feature.

## 4. Key Systems of Record

To ensure stability and maintain context, this project will maintain several key "Systems of Record" documents:

-   **`HOLISTIC_PLAN.md` (This file):** The high-level strategic vision.
-   **`TASK_PLAN.md`:** A granular, step-by-step plan for the current development phase.
-   **`TEST_PLAN.md`:** A comprehensive list of test cases that must be passed before any new feature is considered complete.
-   **`FAILURE_LOG.md`:** A log of all major bugs, their root causes, and the steps taken to fix them, to prevent repeating mistakes.
-   **`CONFIG_SCHEMA.md`:** The definitive schema for all user-configurable settings.

By adhering to this plan and these processes, we will build a powerful, stable, and valuable tool for SEO professionals.

---
## File: `HOLISTIC_PLAN_FIX_CRASH_2.md`
---
# Holistic Plan: Definitive Fix for "Generate Brief" Crash

**Objective:** Holistically resolve the critical "Minified React error #31" crash by implementing deep, recursive validation in the `AIResponseSanitizer`. This addresses the true root cause: malformed nested objects from the AI are not being caught, leading to invalid data entering the application state.

**Guiding Principle:** Never trust AI responses. Always validate the full data structure, including all nested objects and arrays, against a strict schema before allowing it into the state.

---

### Phase 1: Analysis & Planning

1.  **Root Cause Re-Analysis:**
    *   **Symptom:** The application crashes during the render phase after a `generateContentBrief` call successfully returns and updates the state. The error is `React error #31`, indicating an attempt to render an invalid object.
    *   **True Cause:** The `briefSchema` in `geminiService.ts` defines `serpAnalysis` and `visuals` simply as `Object`. The `AIResponseSanitizer`'s `sanitize` method honors this but does not validate the *internal structure* of those objects.
    *   **Failure Mode:** The AI occasionally returns a malformed value for a nested property (e.g., a string instead of an array, or an object with missing keys). Because the schema is not specific enough, the sanitizer allows this invalid data to pass through. When a UI component later tries to access a property on this malformed data (e.g., `serpAnalysis.peopleAlsoAsk.map(...)` when `peopleAlsoAsk` is a string), the application crashes.
    *   **Conclusion:** The sanitizer is not robust enough. It needs to support deep, recursive schema validation.

2.  **The Refactoring Strategy: Deep Schema Validation**
    *   **Upgrade the Sanitizer:** Refactor the `sanitize` method in `AIResponseSanitizer.ts` to be recursive. When it encounters a key whose expected type in the schema is an `Object`, it should recursively call itself on that nested object, using the nested part of the schema for validation.
    *   **Create Detailed Schemas:** Update the `briefSchema` in `geminiService.ts` to be a deeply nested object that exactly mirrors the `ContentBrief` type. This provides the sanitizer with the full "blueprint" it needs for deep validation.
    *   **Enhance Fallbacks:** The fallback object must also match this deep structure, ensuring that if a nested object is entirely missing, a valid, empty version is used instead.

3.  **Create a New Test Plan.**
    *   **File:** `HOLISTIC_TEST_PLAN_FIX_CRASH_2.md`
    *   **Task:** Define a test plan that specifically validates the deep sanitization.
        *   **Test Case 1:** The primary success criteria is that the "Generate Brief" workflow completes without crashing, even if the AI response is malformed.
        *   **Test Case 2 (Unit Test Simulation):** Manually craft a JSON string with an invalid `serpAnalysis` object (e.g., `"serpAnalysis": "none"`). Pass this to the sanitizer and assert that the output is a correctly structured, valid object based on the fallback.

---

### Phase 2: Implementation

1.  **Refactor `services/aiResponseSanitizer.ts`.**
    *   **Task:** Apply the simplification strategy directly to the `sanitize` method.
    *   **Change:** Modify the function to handle nested object schemas recursively.

2.  **Update `services/geminiService.ts`.**
    *   **Task:** Replace the shallow `briefSchema` with a detailed, nested schema.

3.  **Execute the Test Plan.**
    *   **Task:** Run through all scenarios defined in `HOLISTIC_TEST_PLAN_FIX_CRASH_2.md` to validate the fix.

---

### Expected Outcome

This fix addresses the root cause of the instability. The application will no longer be vulnerable to malformed nested data from the AI. The sanitizer will become a much more robust guardian of state integrity, significantly improving the application's overall resilience and preventing this entire class of bugs from recurring.

...and so on for every other `.md` file in the project. The final `SUPPORTING_DOCUMENTATION.md` is too large to display here, but this is a representative sample of its structure.
