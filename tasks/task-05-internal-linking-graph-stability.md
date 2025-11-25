
# Task 05: Stabilize Internal Linking Graph Visualization

**Status:** [x] Completed
**Priority:** LOW (But visible)
**Files Affected:**
- `components/InternalLinkingModal.tsx`
- `components/ui/GraphVisualization.tsx`

## 1. The Issue
The `GraphVisualization` component calculates forces and positions. If the `nodes` array is empty, or if specific node properties (`x`, `y`) become `NaN` during calculation (e.g., division by zero in force simulation), the SVG rendering can fail or throw errors.
Additionally, opening the "View Internal Linking" modal when no topics exist creates a confusing empty state or a potential crash depending on the d3-like logic used.

## 2. Implementation Plan

### Step 2.1: Add Data Guards
**File:** `components/InternalLinkingModal.tsx`
- Before rendering `<GraphVisualization>`, check if `coreTopics.length + outerTopics.length > 0`.
- If 0, render a "No topics available to visualize" empty state message instead of the graph component.

### Step 2.2: Harden Graph Math
**File:** `components/ui/GraphVisualization.tsx`
- In the `runSimulation` function, ensure divisors are not zero.
- Check: `distance = Math.max(distance, 0.1)` (or similar small epsilon) to prevent division by zero in force calculations.
- Ensure `nodes` and `edges` props are defaulted to `[]` if undefined.

## 3. Validation & Testing
1.  **Empty Map:** Create a new map. Do NOT add topics. Click "View Internal Linking".
    - **Expected:** Friendly "No topics" message. No crash.
2.  **Single Topic:** Add 1 topic. View Graph.
    - **Expected:** Single node rendered. No infinite flying off screen (check force simulation stability).

## 4. Systematic Risks
- None. Isolated to visualization components.
