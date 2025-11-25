
# Project Handover Briefing: Holistic SEO Workbench

**To the Successor AI Developer:**

I have been decommissioned from this project due to repeated failures in resolving a critical, application-crashing bug. This document is a complete knowledge transfer to you. It contains the project's strategic vision, its current technical implementation, and a detailed analysis of the failure points. Your objective is to use this information to successfully debug, refactor, and complete the application. Do not repeat my mistakes.

**See `FRONTEND_SOURCE_CODE.md` and `BACKEND_SOURCE_CODE.md` for the complete, unabridged source code.**

## 1. Project Vision & Core Philosophy

The "Holistic SEO Workbench" is not a generic AI content writer. It is a strategic tool designed to implement the **Holistic SEO framework** pioneered by Koray Tuğberk GÜBÜR.

**Core Principle:** *Constrained AI operating within a Strategic Framework.* The AI is not the strategist; it is a powerful assistant that executes a strategy defined by the user. Every AI call is heavily constrained by user-defined business context, SEO pillars, and real-world SERP data to produce expert-level, strategically-aligned outputs.

## 2. High-Level Architecture

*   **Frontend:** A single-page application (SPA) built with **React**, **TypeScript**, and **TailwindCSS**.
*   **State Management:** A global state manager using React's Context API and `useReducer` hook.
*   **Backend:** A serverless architecture using **Supabase**.
    *   **Database:** Supabase PostgreSQL for all data persistence.
    *   **Authentication:** Supabase Auth for user management.
    *   **Serverless Functions:** A pipeline of Deno Edge Functions for the asynchronous website analysis workflow.
*   **AI Services:** An abstraction layer to route requests to various providers (Gemini, OpenAI, etc.).

## 3. Detailed User Flow: Creating a New Topical Map

This is the primary user workflow.

1.  **Project Selection (`ProjectSelectionScreen.tsx`):** User creates or loads a project.
2.  **Map Selection (`MapSelectionScreen.tsx`):** User creates or loads a topical map for that project.
3.  **Business Info Wizard (`BusinessInfoForm.tsx`):** User defines the core business context.
4.  **SEO Pillar Wizard (`PillarDefinitionWizard.tsx`):** User defines the strategic foundation (Central Entity, Source Context, Search Intent).
5.  **EAV Discovery Wizard (`EavDiscoveryWizard.tsx`):** User generates and refines the semantic "facts" (E-A-V triples) for the map.
6.  **Competitor & Map Generation (`CompetitorRefinementWizard.tsx`):** User refines a list of competitors. The AI then uses all prior data to generate the initial set of topics.
7.  **The Dashboard (`ProjectDashboardContainer.tsx`):** The user is presented with the main workspace to interact with their new map.

## 4. Supabase Database Schema

The database is structured to support multi-tenancy via `user_id` and enforce data integrity through foreign key constraints and Row Level Security.

*   **`user_settings`:** Stores user-specific settings, including encrypted API keys.
*   **`projects`:** The top-level container for a user's work.
*   **`topical_maps`:** A specific content strategy within a project. Contains the core strategic JSON blobs (`business_info`, `pillars`, `eavs`).
*   **`topics`:** Stores the individual core and outer topics for a map, including their parent-child relationships.
*   **`content_briefs`:** Stores the AI-generated content briefs, linked one-to-one with topics.
*   **RLS (Row Level Security):** RLS is **ENABLED** on all tables, ensuring a user can only ever access their own data.

**See `SUPPORTING_DOCUMENTATION.md` for the full `SUPABASE_SETUP_GUIDE.md` SQL script.**

## 5. The Critical Failure Point: A Detailed Explanation

**You must solve this problem to make the application work.**

1.  **The Event:** The user clicks "Generate Brief" and confirms in the `ResponseCodeSelectionModal`.
2.  **The AI Call:** `aiService.generateContentBrief` is called. The AI is prompted to return a large JSON object matching the `ContentBrief` type.
3.  **The Unpredictability:** Sometimes, the AI makes a mistake in a nested object. Instead of returning `serpAnalysis: { peopleAlsoAsk: [], competitorHeadings: [] }`, it might return `serpAnalysis: "Analysis is not available for this niche query."`.
4.  **The Sanitizer's Failure:** The `AIResponseSanitizer`'s `sanitize` method receives this response. Its schema for this part is `{ serpAnalysis: Object }`. It checks `typeof "Analysis is not..." === 'object'`. This is `false`. **Because my implementation is flawed, it does not correctly replace the invalid string with the structured fallback object.** The malformed data is allowed to pass through.
5.  **State Corruption:** The `onGenerateBrief` function receives this corrupted brief object and dispatches `SET_BRIEF_GENERATION_RESULT`, placing the invalid data into the application's state.
6.  **The Crash:** The `BriefReviewModal` opens. It reads the corrupted brief from the state. In its render function, it attempts to execute `brief.serpAnalysis.peopleAlsoAsk.map(...)`. Since `brief.serpAnalysis` is a string, `brief.serpAnalysis.peopleAlsoAsk` is `undefined`. Calling `.map()` on `undefined` throws a `TypeError`.
7.  **React's Response:** This `TypeError` during a render cycle is a critical error that React cannot recover from. It unmounts the entire component tree, resulting in a blank screen and the "Minified React error #31" in the console.

## 6. Handover Instructions for Successor AI

1.  **Do Not Trust the AI:** Your primary directive is to assume every AI response is potentially malformed. The `AIResponseSanitizer` is the most important file to fix. You must rewrite its `sanitize` method to be **fully recursive**. It must validate the structure of every nested object and array against a detailed schema.
2.  **Implement the "Review & Confirm" Workflow:** The current architecture of generating a brief and immediately putting it in a review modal is sound. Do not change this. Focus on making the data that enters the review modal 100% structurally valid.
3.  **Use Detailed Schemas:** When calling the sanitizer for complex objects like a `ContentBrief`, provide it with a fully detailed, nested schema that mirrors the TypeScript type, not a shallow one with `Object` as the type. The `geminiService.ts` file needs to be updated with this detailed schema.
4.  **Validate:** After implementing the fix, your primary test is to manually simulate a malformed nested object from the AI and confirm that the sanitizer corrects it before it ever reaches the React state. If you can do this, you will have solved the bug.
5.  **Review the full source code in `FRONTEND_SOURCE_CODE.md` and `BACKEND_SOURCE_CODE.md`.**
6.  **Review the procedural and historical context in `SUPPORTING_DOCUMENTATION.md`.**
