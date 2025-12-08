# API Reliability Architecture Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a reliable, consistent AI service layer with proper separation of concerns between JSON and text generation modes.

**Architecture:** Implement a unified provider abstraction with explicit output mode control (JSON vs Text), centralized fallback logic, and single source of truth for provider configuration.

**Tech Stack:** TypeScript, React, Supabase Edge Functions

---

## Root Cause Analysis

### Issue 1: Broken Text Generation in Committed Code
The committed `anthropicService.callApi()` ALWAYS adds JSON formatting instructions:
```typescript
const effectivePrompt = `${prompt}\n\nCRITICAL FORMATTING REQUIREMENT: Your response must be ONLY a valid JSON object...`;
```

The `generateText()` function attempts to work around this:
```typescript
const textPrompt = prompt.replace(/IMPORTANT:.*JSON.*\./gi, ''); // Remove JSON instructions
return callApi(textPrompt, businessInfo, dispatch, (text) => text);
```

**Problem:** The regex `IMPORTANT:.*JSON.*\.` does NOT match `CRITICAL FORMATTING REQUIREMENT...`. So:
1. `generateText` removes nothing from the prompt
2. `callApi` adds JSON instructions
3. Claude returns JSON-formatted response
4. Consumer expects plain text → **BREAKS**

### Issue 2: Inconsistent Provider Implementations
- 5 provider services with 40+ functions each
- Each has different JSON/text handling approaches
- No unified contract for output modes
- `geminiService.generateText` passes `false` for jsonMode
- `anthropicService.generateText` uses broken regex workaround
- `openAiService.generateText` passes `false` for jsonMode

### Issue 3: Duplicate Fallback Logic
- `providerUtils.ts` (new file) implements fallback logic
- `pass1DraftGeneration.ts` also has fallback logic
- Different retry counts, different error classification
- Maintenance nightmare

### Issue 4: No Single Source of Truth
- Model names scattered across files
- Fallback order defined in multiple places
- API key checks duplicated

---

## Solution Architecture

### Principle 1: Explicit Output Mode
Every AI call must explicitly declare its expected output:
- `generateJson<T>()` - Returns parsed JSON object
- `generateText()` - Returns plain text/markdown

### Principle 2: Single Provider Abstraction
Create a unified `AIProvider` interface that all services implement:
```typescript
interface AIProvider {
  generateJson<T>(prompt: string, fallback: T): Promise<T>;
  generateText(prompt: string): Promise<string>;
}
```

### Principle 3: Centralized Fallback
One place for fallback logic: `providerUtils.ts`
All passes use this, no duplication.

### Principle 4: Configuration Objects
Single source of truth for:
- Valid model names per provider
- Fallback order
- Retry settings
- Timeout values

---

## Implementation Tasks

### Phase 1: Fix anthropicService.ts (Critical - Fixes Strategist & Content Gen)

#### Task 1.1: Add proper jsonMode parameter to callApi

**Files:**
- Modify: `services/anthropicService.ts:23-30`

**Step 1: Update callApi signature**

```typescript
const callApi = async <T>(
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>,
    sanitizerFn: (text: string) => T,
    jsonMode: boolean = true  // Explicit boolean, default true for backward compat
): Promise<T> => {
```

**Step 2: Conditional JSON instructions**

Replace the hardcoded effectivePrompt with:
```typescript
    // Only add JSON formatting instructions when jsonMode is true
    const effectivePrompt = jsonMode
        ? `${prompt}\n\nCRITICAL FORMATTING REQUIREMENT: Your response must be ONLY a valid JSON object. Do NOT include any text before or after the JSON. Do NOT wrap it in markdown code blocks. Start your response directly with { and end with }.`
        : prompt;
```

**Step 3: Conditional system message**

Update the system message to be mode-aware:
```typescript
    const systemMessage = jsonMode
        ? "You are a helpful, expert SEO strategist. You ALWAYS output valid JSON when requested. Never include explanatory text, markdown formatting, or code blocks around your JSON response. Start directly with { and end with }. Keep responses concise."
        : "You are a helpful, expert SEO strategist and content writer. Provide clear, well-structured responses. Use markdown formatting when appropriate.";
```

---

#### Task 1.2: Fix generateText to pass jsonMode=false

**Files:**
- Modify: `services/anthropicService.ts:420-430` (line numbers approximate)

**Step 1: Simplify generateText**

Replace the broken regex workaround:
```typescript
export const generateText = async (
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    // Pass jsonMode=false to get plain text output
    return callApi(prompt, businessInfo, dispatch, (text) => text, false);
};
```

---

#### Task 1.3: Keep generateJson unchanged

**Files:**
- Verify: `services/anthropicService.ts` generateJson function

No changes needed - it already calls `callApi` without the jsonMode param, defaulting to true.

---

#### Task 1.4: Verify other provider services have consistent pattern

**Files:**
- Review: `services/geminiService.ts`
- Review: `services/openAiService.ts`
- Review: `services/perplexityService.ts`
- Review: `services/openRouterService.ts`

**Step 1: Check each service's generateText function**

Ensure each passes `false` or equivalent for JSON mode:
- geminiService: `callApi(..., false)` ✓
- openAiService: `callApi(..., false)` ✓
- openRouterService: `callApi(..., false)` ✓
- perplexityService: Check and fix if needed

---

### Phase 2: Consolidate Fallback Logic

#### Task 2.1: Verify providerUtils.ts is complete

**Files:**
- Review: `services/ai/contentGeneration/providerUtils.ts`

Confirm it has:
- `callProviderWithFallback(info, prompt, maxRetries)` - with full fallback
- `callProviderWithPrompt(info, prompt)` - simple routing
- Error classification functions
- API key checking

---

#### Task 2.2: Update pass1DraftGeneration.ts to use providerUtils

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass1DraftGeneration.ts`

**Step 1: Remove duplicate fallback logic**

Replace the local `callProviderWithPrompt` and fallback logic with import from providerUtils:
```typescript
import { callProviderWithFallback } from '../providerUtils';

// Remove: local callProviderWithPrompt function
// Remove: local FALLBACK_ORDER constant
// Remove: local isRetryableError function
// Remove: local checkProviderApiKey function
```

**Step 2: Use centralized function in generateSectionWithRetry**

```typescript
async function generateSectionWithRetry(
  section: SectionDefinition,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  allSections: SectionDefinition[],
  maxRetries: number
): Promise<string> {
  const prompt = GENERATE_SECTION_DRAFT_PROMPT(section, brief, businessInfo, allSections);

  // Use centralized fallback logic
  return callProviderWithFallback(businessInfo, prompt, maxRetries);
}
```

---

#### Task 2.3: Update other passes to use providerUtils

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass2Headers.ts`
- Modify: `services/ai/contentGeneration/passes/pass3Lists.ts`
- Modify: `services/ai/contentGeneration/passes/pass4Visuals.ts`
- Modify: `services/ai/contentGeneration/passes/pass5MicroSemantics.ts`
- Modify: `services/ai/contentGeneration/passes/pass6Discourse.ts`
- Modify: `services/ai/contentGeneration/passes/pass7Introduction.ts`

Each should import and use `callProviderWithFallback` from providerUtils.

---

### Phase 3: Fix Content Generation Prompts

#### Task 3.1: Apply targetKeyword fix to prompts

**Files:**
- Modify: `config/prompts.ts`

Replace all instances of `info.seedKeyword` with `brief.targetKeyword || brief.title` in content generation prompts (GENERATE_SECTION_DRAFT_PROMPT, PASS_2 through PASS_7 prompts).

This fix is correct and should be preserved.

---

### Phase 4: Add Reliability Features

#### Task 4.1: Add request logging to anthropicService

**Files:**
- Modify: `services/anthropicService.ts`

Add logging before API call:
```typescript
console.log(`[Anthropic] Request: model=${modelToUse}, prompt_length=${effectivePrompt.length}, jsonMode=${jsonMode}`);
```

---

#### Task 4.2: Add detailed error capture

**Files:**
- Modify: `services/anthropicService.ts`

Capture and log full error details from proxy:
```typescript
if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Anthropic] API Error ${response.status}:`, errorText.substring(0, 500));
    // Parse and include details in thrown error
}
```

---

#### Task 4.3: Add timeout handling

**Files:**
- Modify: `services/anthropicService.ts`

Add AbortController with 3-minute timeout:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 180000);
// ... fetch with signal: controller.signal
// ... clearTimeout in finally
```

---

### Phase 5: Testing & Verification

#### Task 5.1: Run build

**Command:** `npm run build`
**Expected:** Success, no TypeScript errors

---

#### Task 5.2: Run unit tests

**Command:** `npm test`
**Expected:** All 341 tests pass

---

#### Task 5.3: Manual test - AI Strategist

1. Start dev server: `npm run dev`
2. Open app, click Strategist button
3. Type "What should I do next?"
4. **Expected:** Receives helpful response (not "I encountered an error")

---

#### Task 5.4: Manual test - Content Generation

1. Select a topic with content brief
2. Open content brief modal
3. Start multi-pass content generation
4. **Expected:**
   - No 400 errors in console
   - Content matches topic (not generic "SEO")
   - All passes complete

---

## Summary of Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `services/anthropicService.ts` | Fix | Add jsonMode parameter, fix generateText |
| `services/perplexityService.ts` | Verify | Ensure generateText passes jsonMode=false |
| `services/ai/contentGeneration/providerUtils.ts` | Keep | Centralized fallback (already good) |
| `services/ai/contentGeneration/passes/pass1DraftGeneration.ts` | Refactor | Use providerUtils, remove duplicate code |
| `services/ai/contentGeneration/passes/pass2-7*.ts` | Refactor | Use providerUtils |
| `config/prompts.ts` | Fix | Use brief.targetKeyword instead of info.seedKeyword |

---

## Architecture After Fix

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COMPONENTS / HOOKS                              │
│  - useContentGeneration, ContextChatPanel, etc.                     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│               SERVICE AGGREGATION LAYER                             │
│  services/ai/mapGeneration.ts, briefGeneration.ts, etc.             │
│  strategistService.ts → uses generateText (jsonMode=false)          │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│            CONTENT GENERATION SUBSYSTEM                             │
│  orchestrator.ts (DB)                                               │
│  providerUtils.ts (SINGLE fallback logic)                           │
│  passes/pass1-8.ts (all use providerUtils)                          │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│               PROVIDER SERVICES (5 implementations)                 │
│  anthropicService.ts                                                │
│    callApi(prompt, info, dispatch, sanitizer, jsonMode)            │
│    generateJson<T>() → jsonMode=true                               │
│    generateText() → jsonMode=false                                 │
│  (same pattern for gemini, openai, perplexity, openrouter)         │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│               EXTERNAL APIs                                         │
│  Anthropic (via Supabase proxy), Gemini, OpenAI, etc.              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Verification Checklist

After completing all tasks:

- [ ] `npm run build` succeeds
- [ ] `npm test` shows 341 tests passing
- [ ] AI Strategist responds without errors
- [ ] Content generation completes all 8 passes
- [ ] Generated content matches topic keyword
- [ ] Console shows no 400 errors
- [ ] Fallback to other providers works when primary fails
