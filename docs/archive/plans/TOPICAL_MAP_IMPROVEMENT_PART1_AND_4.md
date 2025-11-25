# Topical Map Improvement Plan: Expansion & Maintenance (Part 4)

**Status:** Proposed
**Objective:** Upgrade the application's lifecycle management capabilities. We must move beyond "Creating" a map to "Growing" and "Maintaining" it. This involves specific strategies for Expansion (Rule A), Publication Momentum (Rule B), Topological Refinement (Rule C), and Multilingual Symmetry (Rule D).

---

## 1. The Expansion Engine (Rule A: Cover Missing Links)

**Current State:** The app has a generic "Expand Sub-Topics" button on Core Topics. It likely generates random related concepts.
**The Fix:** We must implement specific **Expansion Modes** based on Semantic Relationships.

### Implementation Plan

#### A. New Expansion Modes
**Target:** `services/aiService.ts` (`expandCoreTopic`), `components/ui/TopicDetailPanel.tsx`

We will replace the single "Expand" button with a dropdown or selection of specific expansion strategies:

1.  **Attribute Expansion (Depth):**
    *   *Logic:* Analyze the Core Entity. List its specific attributes (Features, Parts, Phases). Create topics for *deep dives* into these attributes.
    *   *Prompt:* "For the entity '{topic.title}', generate sub-topics specifically covering its technical attributes, components, and specifications."
2.  **Entity Expansion (Breadth - Similar/Alternative):**
    *   *Logic:* Find "Sibling" entities.
    *   *Prompt:* "Identify alternative solutions, competitors, or similar concepts to '{topic.title}' that a user might consider. Generate comparison topics."
3.  **Contextual Expansion (Origin/Background):**
    *   *Logic:* Go backwards in time or up the taxonomy.
    *   *Prompt:* "Generate topics covering the history, origin, and evolution of '{topic.title}'."

#### B. The Gap Finder
**Target:** `components/ContextualCoverageModal.tsx`

*   **New Analysis:** "Missing Link Detector".
*   **Logic:** Analyze the graph. If we have "Electric Cars" and "Hybrid Cars", but missing "Hydrogen Cars" (Sibling), suggest it. If we have "Battery Life" but missing "Charging Speed" (Attribute sibling), suggest it.

---

## 2. Momentum & Publication Logic (Rule B)

**Current State:** The `generatePublicationPlan` function exists but is likely a simple linear list.
**The Fix:** The plan must prioritize the **Core Section** (Monetization) to establish authority *before* expanding into the Author Section.

### Implementation Plan

#### A. Priority Queue Algorithm
**Target:** `services/aiService.ts` (`generatePublicationPlan`)

1.  **Phase 1 (Authority Anchor):**
    *   **Mandatory:** All `Core Section` (Monetization) pages.
    *   **Mandatory:** The Homepage and specific "About" pages (Trust).
    *   **Ratio:** 100% Core / 0% Outer.
2.  **Phase 2 (Contextual Support):**
    *   **Action:** Begin publishing `Author Section` (Informational) pages that link directly to the Phase 1 pages.
    *   **Ratio:** 20% Core updates / 80% New Outer.

#### B. Momentum Tracker
**Target:** `components/ui/StrategicDashboard.tsx`

*   **New Metric:** `Publication Velocity`.
*   **Input:** User defines "Articles per Week" capacity.
*   **Visual:** A burn-down chart showing if the current publication speed matches the required momentum to signal authority to search engines.

---

## 3. Topological Refinement (Rule C: Create New Indices)

**Current State:** The app allows adding any topic.
**The Fix:** "The Page vs. Section Test". Before adding a topic, the AI must decide if it deserves a unique URL (Index) or if it should be merged into an existing page.

### Implementation Plan

#### A. "Topic Viability Check" (The Gatekeeper)
**Target:** `services/aiService.ts` (`addTopicIntelligently`), `components/AddTopicModal.tsx`

When a user tries to add a topic (e.g., "Blue Widgets"), the AI runs a check:
1.  **Search Demand:** Is there specific search volume/intent for "Blue Widgets"?
2.  **Complexity:** Can "Blue Widgets" be fully explained in 300 words?
3.  **Decision:**
    *   *If High Demand + High Complexity:* **Create New Topic**.
    *   *If Low Demand OR Low Complexity:* **Suggest Merge**. "This topic is too thin for a dedicated page. We recommend adding it as an H2 section to the 'Widgets' page instead."

#### B. "Content Integration" Briefs
**Target:** `types.ts`, `ContentBrief`

*   We need a new type of "Brief" called an `UpdateBrief`.
*   Instead of creating a new page, it generates a prompt to *update* an existing page's content draft to include the new nuance.

---

## 4. Multilingual Symmetry (Rule D)

**Current State:** Single language support.
**The Fix:** Enforce structural symmetry via "Master Blueprints".

### Implementation Plan

#### A. Structural Locking
**Target:** `services/geminiService.ts` (`generateContentBrief`)

*   **Constraint:** When generating a brief for a localized version (future feature), strictly enforce the *exact same* H2/H3 structure as the original language brief.
*   **Implementation:**
    *   Add `master_structure_id` to `content_briefs`.
    *   When creating a brief, check if it's a translation. If yes, fetch the Master Brief's outline and only allow the AI to translate the headings, not change the hierarchy.

#### B. Universal EAVs
**Target:** `EavDiscoveryWizard.tsx`

*   **Validation:** Ensure EAVs are language-agnostic concepts where possible (e.g., `Entity: "Apple"`, `Property: "Color"`, `Value: "Red"`).
*   **Logic:** When switching languages, we translate the *labels* of the EAVs, but the *relationships* (the graph structure) must remain identical.

---

## 5. Execution Task List

1.  **Task 4.1 (Expansion):** Refactor `expandCoreTopic` to accept `ExpansionMode` (`ATTRIBUTE`, `ENTITY`, `CONTEXT`) and update the prompt to generate specific types of topics.
2.  **Task 4.2 (Refinement):** Implement `analyzeTopicViability` in `aiService`. Update `AddTopicModal` to warn users if they are creating "Dead Weight" pages (Low complexity/demand).
3.  **Task 4.3 (Momentum):** Update `generatePublicationPlan` to strictly prioritize `Core Section` topics in the first phase.
4.  **Task 4.4 (Symmetry):** Update `ContentBrief` schema to include `structural_template_hash`. This hash represents the outline structure. Future briefs can be validated against this hash to ensure symmetry.
