
# Task: Implement Flow Remediation Service

**Status:** [x] Completed
**Priority:** HIGH
**Target Files:**
- `config/prompts.ts`
- `services/geminiService.ts` (and other providers)
- `services/ai/flowValidator.ts`

## 1. Objective
Implement the backend logic for the "Auto-Fix" feature in the Flow Audit system. This requires a specialized prompt and a service function that can rewrite a specific text segment to resolve a semantic flow issue.

## 2. Implementation Steps

### Step 2.1: Prompt Engineering (`config/prompts.ts`)
- [x] Create `APPLY_FLOW_REMEDIATION_PROMPT`.
- [x] Input: `originalSnippet`, `issueDetails`, `remediationInstruction`, `businessInfo`.
- [x] Output: JSON with `refinedText`.
- [x] Logic: Instruct the AI to act as a Semantic Editor. Rewrite ONLY the snippet to fix the specific violation (e.g., insert a discourse anchor) while maintaining tone.

### Step 2.2: Service Implementation
- [x] **`services/geminiService.ts`**: Implement `applyFlowRemediation`.
    - Call the prompt.
    - Call API.
    - Sanitize response.
- [x] **`services/ai/flowValidator.ts`**: Export the function and add the provider switch logic.
- [x] **Stubs**: Update `openAiService.ts` and others with the new method signature to prevent build errors.

## 3. Verification
- (This step is part of the Integration task later)
- Call the function with a sample "broken" sentence and an instruction to "Add a transition".
- Verify the returned string contains the transition.
