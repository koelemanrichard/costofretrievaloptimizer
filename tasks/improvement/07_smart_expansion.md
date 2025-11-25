
# Improvement Task 07: Smart Expansion Modes

**Status:** Pending
**Priority:** LOW
**Objective:** Replace random expansion with targeted growth strategies (Part 4).

## 1. Logic Implementation
**File:** `services/ai/mapGeneration.ts`

*   Refactor `expandCoreTopic`.
*   Add argument `mode: 'ATTRIBUTE' | 'ENTITY' | 'CONTEXT'`.
*   **Prompts:** Create 3 distinct prompts for these modes in `config/prompts.ts`.
    *   *Attribute:* "List features, specs, and components."
    *   *Entity:* "List competitors and alternatives."
    *   *Context:* "List history and future trends."

## 2. UI Integration
**File:** `components/ui/TopicDetailPanel.tsx`

*   Change the "Expand" button to a Dropdown (or 3 small buttons).
    *   "Deep Dive (Attributes)"
    *   "Compare (Entities)"
    *   "Background (Context)"

## 3. Verification
*   Select a Core Topic.
*   Click "Deep Dive". Verify topics are technical/feature-heavy.
*   Click "Compare". Verify topics are about competitors/alternatives.
