
# Improvement Task 06: Canonical Clustering

**Status:** [x] Completed
**Priority:** MEDIUM
**Objective:** Prevent cannibalization by grouping topics under "Canonical Queries" (Part 5).

## 1. Logic Implementation
**File:** `services/ai/clustering.ts`

*   **New Function:** `identifyCanonicalQueries(topics)`.
*   **Prompt:** "Group these titles into clusters based on the underlying User Search Intent. Assign a 'Canonical Query' to each group."
*   **Conflict Detection:** If multiple *Core Topics* map to the same Canonical Query, flag them as a **Critical Merge Opportunity**.

## 2. UI Integration
**File:** `components/MergeSuggestionsModal.tsx`

*   Update the UI to explicitly show the "Canonical Query" that triggered the merge suggestion.
*   *Example:* "Merge 'Cost of CRM' and 'CRM Pricing' because they both target Canonical Query: 'CRM Cost'."

## 3. Verification
*   Create a map with two very similar topics.
*   Run "Find Merge Opportunities".
*   Verify the reason cites the Canonical Query.
