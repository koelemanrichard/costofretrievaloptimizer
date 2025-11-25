
# Flow Audit Task 02: UI Implementation & Integration

**Status:** [x] Completed
**Priority:** HIGH
**Target Files:** 
- `components/FlowAuditModal.tsx` (New)
- `components/dashboard/AnalysisToolsPanel.tsx`
- `components/ProjectDashboardContainer.tsx`
- `components/ProjectDashboard.tsx`
- `state/appState.ts`

## 1. Objective
Create the visual interface for the "Flow Validator". This includes a new Modal component to display the complex audit results (Heading Vectors, Discourse Gaps) and adding the trigger button to the main dashboard.

## 2. Implementation Steps

### Step 2.1: Update State (`state/appState.ts`)
- Add `flowAuditResult: FlowAuditResult | null` to `AppState`.
- Add `SET_FLOW_AUDIT_RESULT` action.
- Add `flowAudit` to `modals` state.

### Step 2.2: Create `components/FlowAuditModal.tsx`
- **Layout:** Two-column layout.
    - **Left (Vector):** A visual timeline of the H-tags (`headingVector`). Green line for good flow, Red break for issues.
    - **Right (Details):**
        - Scorecard (Overall, Vector, Density).
        - List of Issues (Discourse Gaps, Attribute Ordering).
- **Interaction:** "Fix" suggestions where applicable (display remediation text).

### Step 2.3: Update `AnalysisToolsPanel.tsx`
- Add a new button: **"Deep Semantic Audit"**.
- Disable if `isLoading.flowAudit` is true.

### Step 2.4: Wiring (`ProjectDashboardContainer.tsx`)
- Implement `onAnalyzeFlow`.
    - Since this is a "Lab" tool, we need a text input. For V1, we will launch a prompt asking for the Text to analyze (or use the Description of the active topic/brief if available).
    - *Better approach for V1:* Connect it to the **Drafting Modal** (for drafts) AND the **Dashboard** (for general text).
    - *Dashboard Implementation:* Open a simple prompt or modal input to paste text or URL. For MVP, we will add a "Text Input" intermediate step inside `ProjectDashboardContainer` logic or use a hardcoded sample text logic for the first test, OR strictly link it to the **Drafting Modal** where we actually have text.
    - **Decision:** We will add it to the **Drafting Modal** first, as that is where the content actually lives.

### Step 2.5: Update `DraftingModal.tsx`
- Add a tab or button for "Flow & Vector Audit" (separate from the standard Integrity Audit).
- Wire it to call `aiService.analyzeContextualFlow`.
- Display the result in the new `FlowAuditModal`.

## 3. Verification
- Open a Draft.
- Click "Flow Audit".
- Verify the Modal opens and visualizes the H-tag structure and flow scores.
