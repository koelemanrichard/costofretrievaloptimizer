
# Flow Audit Task 01: Schema & Logic Engine Setup

**Status:** [x] Completed
**Priority:** HIGH
**Target Files:** 
- `types.ts`
- `config/prompts.ts`
- `services/ai/flowValidator.ts`

## 1. Objective
Establish the data structures and AI logic required for the "Flow Validator". This involves defining the new Audit Result types and creating the prompts that will enforce the specific "Contextual Vector" and "Attribute Order" rules.

## 2. Implementation Steps

### Step 2.1: Update `types.ts`
Add the new interfaces:
- `ContextualFlowIssue` (category, rule, score, details, snippet, remediation).
- `FlowAuditResult` (overallFlowScore, vectorStraightness, informationDensity, issues[], headingVector[], discourseGaps[]).

### Step 2.2: Create Prompts (`config/prompts.ts`)
Add new prompts:
1.  **`AUDIT_INTRA_PAGE_FLOW_PROMPT`**: 
    -   Input: Text, Central Entity.
    -   Output: JSON with `headingVector` (list), `vectorIssues` (list), `attributeOrderIssues` (list).
    -   Logic: Check H-tag progression and Unique->Root->Rare ordering.
2.  **`AUDIT_DISCOURSE_INTEGRATION_PROMPT`**:
    -   Input: Text.
    -   Output: JSON with `discourseGaps` (indices of paragraphs failing the bridge check).
    -   Logic: Compare Para[i].end vs Para[i+1].start for mutual words.

### Step 2.3: Create Service (`services/ai/flowValidator.ts`)
Create the service module that orchestrates these calls.
-   **Function:** `analyzeContextualFlow(text: string, context: BusinessInfo): Promise<FlowAuditResult>`
-   **Logic:** 
    -   Call both prompts in parallel (or sequence).
    -   Merge results into a single `FlowAuditResult` object.
    -   Calculate simulated scores (e.g., 100 - (issues.length * 10)).

## 3. Verification
-   Create a unit test or temporary button to run `analyzeContextualFlow` on a sample string.
-   Verify the JSON structure matches `FlowAuditResult`.

**Progress Update:**
- Defined strict TypeScript interfaces for `ContextualFlowIssue` and `FlowAuditResult`.
- Implemented two distinct AI prompts: `AUDIT_INTRA_PAGE_FLOW_PROMPT` (for vector/structure) and `AUDIT_DISCOURSE_INTEGRATION_PROMPT` (for linguistic flow).
- Implemented the logic engine in `services/geminiService.ts` to run these prompts in parallel and aggregate scores.
- Created the `services/ai/flowValidator.ts` facade for standard dispatching.

**Next Task:** `tasks/flow-audit-02-ui-implementation.md` (Create `FlowAuditModal` and integrate).
