# Architecture Audit: Full Refactoring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Systematically address every finding from the February 2026 architecture audit — eliminate god files, fix security gaps, remove dead code, consolidate duplicated patterns, enforce single sources of truth, and add automated runtime testing for each refactored area.

**Architecture:** Incremental refactoring with TDD validation at every step. Each sprint targets one audit dimension. Every task produces a passing test suite before and after changes, proving no regressions. E2E smoke tests run after each sprint to validate runtime behavior.

**Tech Stack:** React 18 + TypeScript 5.8 + Vite 6 + Vitest + Playwright + Supabase Edge Functions (Deno)

---

## Validation Strategy

Every task in this plan follows this pattern:
1. **Baseline:** Run existing tests, confirm green (`npm test` + `npm run test:e2e -- --grep "core"`)
2. **Write failing test** for the new behavior / refactored module
3. **Implement** the minimal change
4. **Run tests** to confirm pass
5. **Run E2E smoke** to confirm no runtime regression
6. **Commit** with descriptive message

**Smoke test command** (run after every sprint):
```bash
npm test && npx playwright test e2e/auth.spec.ts e2e/projects.spec.ts e2e/topical-map.spec.ts e2e/global-ui.spec.ts
```

---

## Sprint 1: Safety & Security Fixes

### Task 1.1: Replace Silent Error Catches in apifyService

**Files:**
- Modify: `services/apifyService.ts:128,144,152,158,177`
- Create: `services/__tests__/apifyService.test.ts`

**Step 1: Write failing test**

```typescript
// services/__tests__/apifyService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('apifyService error handling', () => {
  it('should log warning when usage logging fails instead of silently swallowing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Import and trigger a code path where logApifyUsage rejects
    // Verify console.warn was called with descriptive message
    warnSpy.mockRestore();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/__tests__/apifyService.test.ts`
Expected: FAIL (test structure needs actual implementation to match)

**Step 3: Replace all 5 silent catches**

Replace every `.catch(() => {})` on lines 128, 144, 152, 158, 177 with:
```typescript
.catch((err) => console.warn('[ApifyService] Usage logging failed:', err?.message));
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/__tests__/apifyService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/apifyService.ts services/__tests__/apifyService.test.ts
git commit -m "fix: replace silent error catches in apifyService with warn logging"
```

---

### Task 1.2: Replace Empty Catches in firecrawlService

**Files:**
- Modify: `services/firecrawlService.ts:155,220,226,256,461`
- Test: `services/__tests__/firecrawlService.test.ts` (already exists — extend)

**Step 1: Write failing tests**

Add test cases verifying that invalid JSON schema markup, invalid URLs, and invalid image URLs produce `console.warn` calls instead of being silently swallowed.

**Step 2: Run test to verify they fail**

Run: `npx vitest run services/__tests__/firecrawlService.test.ts`

**Step 3: Replace empty catches**

- Line 155 (`catch (e) { // Ignore invalid JSON }`): Replace with `catch (e) { console.warn('[Firecrawl] Invalid schema JSON:', (e as Error)?.message); }`
- Lines 220, 226 (`catch { // Skip invalid URLs }`): Replace with `catch { /* invalid URL — skip */ }` (these are intentional skips for URL parsing, add inline comment explaining why)
- Line 256 (`catch { // Skip invalid image URLs }`): Same — add explanatory comment
- Line 461 (`catch { return false; }`): This is valid — validateApiKey returning false on error is correct behavior. Add comment: `// API key validation failed — key is invalid`

**Step 4: Run tests**

Run: `npx vitest run services/__tests__/firecrawlService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/firecrawlService.ts services/__tests__/firecrawlService.test.ts
git commit -m "fix: add logging/comments to empty catch blocks in firecrawlService"
```

---

### Task 1.3: Fix Error Swallowing in cacheService

**Files:**
- Modify: `services/cacheService.ts:42,57,66,182,199`
- Create: `services/__tests__/cacheService.test.ts`

**Step 1: Write failing tests**

Test that IndexedDB failures are handled gracefully: `getFromDb` returns null, `setToDb` doesn't throw, `clearByPrefix` doesn't throw — but all log to console.error (already happening). Verify the pattern is consistent. The existing `console.error` calls are acceptable for a cache service (cache miss is not an application error). Document this as intentional.

**Step 2: Assess — these catches are already logging**

cacheService already calls `console.error(...)` in every catch block. This is **not** silent swallowing — it's graceful degradation for a cache layer. **No code change needed.**

**Step 3: Write the test confirming current behavior is correct**

```typescript
describe('cacheService graceful degradation', () => {
  it('should return null from getFromDb when IndexedDB fails', async () => {
    // Mock idb to throw
    const result = await getFromDb('nonexistent-key');
    expect(result).toBeNull();
  });
});
```

**Step 4: Run and confirm**

Run: `npx vitest run services/__tests__/cacheService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/__tests__/cacheService.test.ts
git commit -m "test: add cacheService graceful degradation tests"
```

---

### Task 1.4: Fix CORS Wildcard in Edge Functions

**Files:**
- Modify: `supabase/functions/_shared/utils.ts:8-15`

**Step 1: Write failing test**

Since edge functions run in Deno and are tested via E2E, write an E2E test:

```typescript
// e2e/security-cors.spec.ts
import { test, expect } from '@playwright/test';

test.describe('CORS Security', () => {
  test('API should not return wildcard CORS in production', async ({ request }) => {
    // OPTIONS preflight to any edge function
    const response = await request.fetch(
      `${process.env.SUPABASE_URL || 'https://shtqshmmsrmtquuhyupl.supabase.co'}/functions/v1/health-check`,
      { method: 'OPTIONS', headers: { 'Origin': 'https://evil.example.com' } }
    );
    const corsHeader = response.headers()['access-control-allow-origin'];
    expect(corsHeader).not.toBe('*');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/security-cors.spec.ts`
Expected: FAIL (currently returns `*`)

**Step 3: Implement origin whitelist**

```typescript
// supabase/functions/_shared/utils.ts
const ALLOWED_ORIGINS = [
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

export function corsHeaders(requestOrigin?: string) {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin || '')
    ? requestOrigin!
    : ALLOWED_ORIGINS[0]; // Default to production origin
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}
```

**Step 4: Update all edge functions** to pass `req.headers.get('origin')` to `corsHeaders()`:

Every edge function has a pattern like:
```typescript
const origin = req.headers.get('origin') || '*';
```
Change to:
```typescript
const origin = req.headers.get('origin') || undefined;
```
And in the CORS response call:
```typescript
return new Response(null, { headers: corsHeaders(origin) });
```

**Step 5: Deploy and test**

Run: `bash deploy_functions.sh` then `npx playwright test e2e/security-cors.spec.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add supabase/functions/
git commit -m "fix: replace wildcard CORS with origin whitelist in edge functions"
```

---

### Task 1.5: Sanitize Error Responses in AI Proxy Functions

**Files:**
- Modify: `supabase/functions/anthropic-proxy/index.ts:113,153-158,185-189`
- Modify: `supabase/functions/openai-proxy/index.ts` (same pattern)
- Create: `e2e/security-error-responses.spec.ts`

**Step 1: Write failing E2E test**

```typescript
// e2e/security-error-responses.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Error Response Security', () => {
  test('AI proxy errors should not leak internal details', async ({ request }) => {
    const response = await request.post(
      `${process.env.SUPABASE_URL || 'https://shtqshmmsrmtquuhyupl.supabase.co'}/functions/v1/anthropic-proxy`,
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer invalid' },
        data: { model: 'claude-sonnet-4-5-20250929', messages: [] }
      }
    );
    const body = await response.json();
    // Should NOT contain raw API error text
    if (body.details) {
      expect(body.details).not.toContain('anthropic');
      expect(body.details).not.toContain('sk-ant-');
    }
    // Should NOT contain model_requested
    expect(body.model_requested).toBeUndefined();
    // Should NOT contain elapsed_ms
    expect(body.elapsed_ms).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/security-error-responses.spec.ts`

**Step 3: Sanitize error responses**

In `anthropic-proxy/index.ts`:
- Remove `details: errorText` from error responses — replace with generic `details: 'AI provider returned an error'`
- Remove `model_requested` field from error JSON
- Remove `elapsed_ms` from error JSON (keep it in server-side logs only)
- Keep status code forwarding (401, 429, etc.)

Apply identical changes to `openai-proxy/index.ts`.

**Step 4: Deploy and test**

Run: `bash deploy_functions.sh && npx playwright test e2e/security-error-responses.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/anthropic-proxy/ supabase/functions/openai-proxy/ e2e/security-error-responses.spec.ts
git commit -m "fix: sanitize error responses in AI proxy functions to prevent info leakage"
```

---

### Task 1.6: Add Rate Limiting Utility for Edge Functions

**Files:**
- Create: `supabase/functions/_shared/rateLimit.ts`
- Modify: `supabase/functions/anthropic-proxy/index.ts` (add rate check)
- Modify: `supabase/functions/openai-proxy/index.ts` (add rate check)

**Step 1: Design rate limiter**

Use Supabase database for distributed rate limiting:

```typescript
// supabase/functions/_shared/rateLimit.ts
import { createClient } from '@supabase/supabase-js';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  endpoint: string,
  maxRequests: number = 60,
  windowMinutes: number = 1
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart);

  const currentCount = count || 0;
  return {
    allowed: currentCount < maxRequests,
    remaining: Math.max(0, maxRequests - currentCount),
    resetAt: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString(),
  };
}
```

**Step 2: Integrate into proxy functions**

Add at the top of the POST handler (after auth):
```typescript
const rateCheck = await checkRateLimit(supabaseService, user.id, 'anthropic-proxy');
if (!rateCheck.allowed) {
  return json({ ok: false, error: 'Rate limit exceeded', remaining: 0 }, 429, origin);
}
```

**Step 3: Write E2E test**

```typescript
// In e2e/security-cors.spec.ts, add:
test('AI proxy should return rate limit headers', async ({ request }) => {
  // Verify 429 response includes rate limit info
});
```

**Step 4: Deploy and test**

**Step 5: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add rate limiting to AI proxy edge functions"
```

---

### Sprint 1 Validation

Run full smoke test:
```bash
npm test && npx playwright test e2e/auth.spec.ts e2e/projects.spec.ts e2e/topical-map.spec.ts e2e/global-ui.spec.ts
```
Expected: All PASS. Zero regressions.

---

## Sprint 2: Consolidate Duplicated Patterns

### Task 2.1: Extract Shared AI Provider Base Module

**Files:**
- Create: `services/ai/shared/providerContext.ts`
- Modify: `services/anthropicService.ts:23-65`
- Modify: `services/openRouterService.ts:22-32`
- Modify: `services/perplexityService.ts:23-33`
- Modify: `services/geminiService.ts:50-65`
- Create: `services/ai/shared/__tests__/providerContext.test.ts`

**Step 1: Write failing test**

```typescript
// services/ai/shared/__tests__/providerContext.test.ts
import { describe, it, expect } from 'vitest';
import { createProviderContext } from '../providerContext';

describe('createProviderContext', () => {
  it('should set and get usage context', () => {
    const ctx = createProviderContext('anthropic');
    ctx.setUsageContext({ projectId: '123', mapId: '456' }, 'generateBrief');
    expect(ctx.getUsageContext()).toEqual({ projectId: '123', mapId: '456' });
    expect(ctx.getOperation()).toBe('generateBrief');
  });

  it('should default operation to unknown', () => {
    const ctx = createProviderContext('openrouter');
    expect(ctx.getOperation()).toBe('unknown');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/shared/__tests__/providerContext.test.ts`
Expected: FAIL — module doesn't exist

**Step 3: Implement shared context**

```typescript
// services/ai/shared/providerContext.ts
import type { AIUsageContext } from '../../types';

export interface ProviderContext {
  setUsageContext(context: AIUsageContext, operation?: string): void;
  getUsageContext(): AIUsageContext;
  getOperation(): string;
  getProviderName(): string;
}

export function createProviderContext(providerName: string): ProviderContext {
  let currentUsageContext: AIUsageContext = {};
  let currentOperation = 'unknown';

  return {
    setUsageContext(context: AIUsageContext, operation?: string) {
      currentUsageContext = context;
      if (operation) currentOperation = operation;
    },
    getUsageContext: () => currentUsageContext,
    getOperation: () => currentOperation,
    getProviderName: () => providerName,
  };
}
```

**Step 4: Run test**

Run: `npx vitest run services/ai/shared/__tests__/providerContext.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/shared/providerContext.ts services/ai/shared/__tests__/providerContext.test.ts
git commit -m "feat: extract shared AI provider context module"
```

---

### Task 2.2: Migrate anthropicService to Shared Retry

**Files:**
- Modify: `services/anthropicService.ts:23-61` (remove custom fetchWithRetry)
- Test: `services/__tests__/anthropicService.test.ts` (create)

**Step 1: Write failing test**

```typescript
// services/__tests__/anthropicService.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('anthropicService retry behavior', () => {
  it('should use shared retryWithBackoff for network errors', async () => {
    // Mock fetch to fail twice then succeed
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('{"content":[{"type":"text","text":"ok"}]}'));

    // Verify retry was attempted 3 times
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Replace custom fetchWithRetry**

Remove lines 23-61 (the custom `NETWORK_RETRY_ATTEMPTS`, `NETWORK_RETRY_BASE_DELAY_MS`, and `fetchWithRetry` function). Replace all calls to `fetchWithRetry(url, options)` with:

```typescript
import { retryWithBackoff } from './ai/shared/retryWithBackoff';

// Where fetchWithRetry was called:
const response = await retryWithBackoff(() => fetch(url, options));
```

**Step 4: Run test and verify**

Run: `npx vitest run services/__tests__/anthropicService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/anthropicService.ts services/__tests__/anthropicService.test.ts
git commit -m "refactor: replace custom fetchWithRetry with shared retryWithBackoff in anthropicService"
```

---

### Task 2.3: Migrate All Providers to Shared Context

**Files:**
- Modify: `services/anthropicService.ts` (use createProviderContext)
- Modify: `services/openRouterService.ts` (use createProviderContext)
- Modify: `services/geminiService.ts` (use createProviderContext)
- Note: `perplexityService.ts` already uses shared retryWithBackoff (verify context too)

**Step 1: For each service, replace the duplicated block:**

```typescript
// REMOVE from each service:
let currentUsageContext: AIUsageContext = {};
let currentOperation: string = 'unknown';
export function setUsageContext(context: AIUsageContext, operation?: string): void {
  currentUsageContext = context;
  if (operation) currentOperation = operation;
}
```

**Replace with:**
```typescript
import { createProviderContext } from './ai/shared/providerContext';
const ctx = createProviderContext('anthropic'); // or 'openrouter', 'gemini', etc.
export const setUsageContext = ctx.setUsageContext;
```

Update internal references from `currentUsageContext` to `ctx.getUsageContext()` and `currentOperation` to `ctx.getOperation()`.

**Step 2: Run full test suite**

Run: `npm test`
Expected: All existing tests PASS

**Step 3: Commit**

```bash
git add services/anthropicService.ts services/openRouterService.ts services/geminiService.ts services/perplexityService.ts
git commit -m "refactor: consolidate AI provider context to shared module"
```

---

### Task 2.4: Centralize API Endpoints

**Files:**
- Create: `config/apiEndpoints.ts`
- Create: `config/__tests__/apiEndpoints.test.ts`
- Modify: `services/apifyService.ts:8`
- Modify: `services/spaceserpService.ts:7`
- Modify: `services/openRouterService.ts:37`
- Modify: `services/perplexityService.ts:39`
- Modify: `services/htmlFetcherService.ts:27-28`

**Step 1: Write failing test**

```typescript
// config/__tests__/apiEndpoints.test.ts
import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS } from '../apiEndpoints';

describe('API Endpoints', () => {
  it('should export all provider endpoints', () => {
    expect(API_ENDPOINTS.APIFY).toBe('https://api.apify.com/v2');
    expect(API_ENDPOINTS.SPACESERP).toBe('https://api.spaceserp.com');
    expect(API_ENDPOINTS.OPENROUTER).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(API_ENDPOINTS.PERPLEXITY).toBe('https://api.perplexity.ai/chat/completions');
    expect(API_ENDPOINTS.JINA).toBe('https://r.jina.ai/');
    expect(API_ENDPOINTS.FIRECRAWL).toBe('https://api.firecrawl.dev/v1/scrape');
  });

  it('should have all URLs as valid HTTPS URLs', () => {
    Object.values(API_ENDPOINTS).forEach(url => {
      expect(() => new URL(url)).not.toThrow();
      expect(url.startsWith('https://')).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run config/__tests__/apiEndpoints.test.ts`

**Step 3: Create the endpoints file**

```typescript
// config/apiEndpoints.ts
export const API_ENDPOINTS = {
  APIFY: 'https://api.apify.com/v2',
  SPACESERP: 'https://api.spaceserp.com',
  OPENROUTER: 'https://openrouter.ai/api/v1/chat/completions',
  PERPLEXITY: 'https://api.perplexity.ai/chat/completions',
  JINA: 'https://r.jina.ai/',
  FIRECRAWL: 'https://api.firecrawl.dev/v1/scrape',
  FIRECRAWL_MAP: 'https://api.firecrawl.dev/v1/map',
  ANTHROPIC: 'https://api.anthropic.com/v1/messages',
} as const;
```

**Step 4: Run test**

Run: `npx vitest run config/__tests__/apiEndpoints.test.ts`
Expected: PASS

**Step 5: Update all service imports**

Replace hardcoded URLs in each service file with `API_ENDPOINTS.X`.

**Step 6: Run full suite**

Run: `npm test`
Expected: All PASS

**Step 7: Commit**

```bash
git add config/apiEndpoints.ts config/__tests__/apiEndpoints.test.ts services/apifyService.ts services/spaceserpService.ts services/openRouterService.ts services/perplexityService.ts services/htmlFetcherService.ts
git commit -m "refactor: centralize API endpoints to single source of truth"
```

---

### Sprint 2 Validation

```bash
npm test && npx playwright test e2e/auth.spec.ts e2e/projects.spec.ts e2e/topical-map.spec.ts e2e/global-ui.spec.ts
```

---

## Sprint 3: God File Decomposition — config/prompts.ts

### Task 3.1: Create Prompt Module Directory Structure

**Files:**
- Create: `config/prompts/index.ts` (re-exports)
- Create: `config/prompts/helpers.ts`
- Create: `config/prompts/mapGeneration.ts`
- Create: `config/prompts/contentBriefs.ts`
- Create: `config/prompts/draftWriting.ts`
- Create: `config/prompts/auditing.ts`
- Create: `config/prompts/mapAnalysis.ts`
- Create: `config/prompts/topicOperations.ts`
- Create: `config/prompts/flowRemediation.ts`
- Create: `config/prompts/navigation.ts`
- Keep: `config/prompts.ts` as re-export facade (backward compatibility)

**Step 1: Write failing test**

```typescript
// config/__tests__/promptModules.test.ts
import { describe, it, expect } from 'vitest';

describe('Prompt module re-exports', () => {
  it('should export all prompts from config/prompts.ts (backward compat)', async () => {
    const prompts = await import('../prompts');
    // Verify all 66 exported functions exist
    expect(typeof prompts.businessContext).toBe('function');
    expect(typeof prompts.GENERATE_CONTENT_BRIEF_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_INITIAL_TOPICAL_MAP_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_ARTICLE_DRAFT_PROMPT).toBe('function');
    expect(typeof prompts.VALIDATE_TOPICAL_MAP_PROMPT).toBe('function');
    expect(typeof prompts.AUDIT_INTERNAL_LINKING_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_PUBLICATION_PLAN_PROMPT).toBe('function');
    expect(typeof prompts.GENERATE_FOUNDATION_PAGES_PROMPT).toBe('function');
  });

  it('should export the same functions from prompts/index.ts', async () => {
    const oldPrompts = await import('../prompts');
    const newPrompts = await import('../prompts/index');
    // All keys from old must exist in new
    Object.keys(oldPrompts).forEach(key => {
      expect(newPrompts).toHaveProperty(key);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run config/__tests__/promptModules.test.ts`

**Step 3: Extract prompts by domain**

Move functions from `config/prompts.ts` into domain modules according to these groupings:

- `helpers.ts`: `businessContext`, `getWebsiteTypeInstructions`, `getStylometryInstructions`, `buildSerpIntelligenceForMap`, `buildSerpIntelligenceBlock`, `getMarketDataPromptSection` (lines 34-280)
- `mapGeneration.ts`: `SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT`, `SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT`, `SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT`, `DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT`, `EXPAND_SEMANTIC_TRIPLES_PROMPT`, `GENERATE_INITIAL_TOPICAL_MAP_PROMPT`, `GENERATE_MONETIZATION_SECTION_PROMPT`, `GENERATE_INFORMATIONAL_SECTION_PROMPT`, `CLASSIFY_TOPIC_SECTIONS_PROMPT` (lines 292-685)
- `contentBriefs.ts`: `SUGGEST_RESPONSE_CODE_PROMPT`, `GENERATE_CONTENT_BRIEF_PROMPT`, `FIND_MERGE_OPPORTUNITIES_PROMPT` (lines 744-1013)
- `draftWriting.ts`: `GENERATE_ARTICLE_DRAFT_PROMPT`, `POLISH_ARTICLE_DRAFT_PROMPT`, `POLISH_SECTION_PROMPT`, `HOLISTIC_SUMMARY_PROMPT`, `POLISH_SECTION_WITH_CONTEXT_PROMPT`, `COHERENCE_PASS_PROMPT`, `REFINE_DRAFT_SECTION_PROMPT` (lines 1036-1367)
- `auditing.ts`: `AUDIT_CONTENT_INTEGRITY_PROMPT`, `GENERATE_SCHEMA_PROMPT`, `ANALYZE_GSC_DATA_PROMPT` (lines 1396-1460)
- `mapAnalysis.ts`: `VALIDATE_TOPICAL_MAP_PROMPT`, `IMPROVE_TOPICAL_MAP_PROMPT`, `FIND_LINKING_OPPORTUNITIES_PROMPT`, `ANALYZE_CONTEXTUAL_COVERAGE_PROMPT`, `AUDIT_INTERNAL_LINKING_PROMPT`, `CALCULATE_TOPICAL_AUTHORITY_PROMPT`, `GENERATE_PUBLICATION_PLAN_PROMPT`, `ANALYZE_SEMANTIC_RELATIONSHIPS_PROMPT` (lines 1460-1868)
- `topicOperations.ts`: `ADD_TOPIC_INTELLIGENTLY_PROMPT`, `EXPAND_CORE_TOPIC_PROMPT`, `ANALYZE_TOPIC_VIABILITY_PROMPT`, `GENERATE_CORE_TOPIC_SUGGESTIONS_PROMPT`, `GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT`, `ENRICH_TOPIC_METADATA_PROMPT`, `GENERATE_TOPIC_BLUEPRINT_PROMPT` (lines 1931-2145)
- `flowRemediation.ts`: `AUDIT_INTRA_PAGE_FLOW_PROMPT`, `AUDIT_DISCOURSE_INTEGRATION_PROMPT`, `APPLY_FLOW_REMEDIATION_PROMPT`, `BATCH_FLOW_REMEDIATION_PROMPT`, `GENERATE_TASK_SUGGESTION_PROMPT`, `GENERATE_BATCH_TASK_SUGGESTIONS_PROMPT`, `GENERATE_CONTEXT_AWARE_TASK_SUGGESTION_PROMPT` (lines 2181-2450)
- `navigation.ts`: `SEMANTIC_CHUNKING_PROMPT`, `GENERATE_MIGRATION_DECISION_PROMPT`, `GENERATE_FOUNDATION_PAGES_PROMPT`, `GENERATE_DEFAULT_NAVIGATION_PROMPT`, `VALIDATE_FOUNDATION_PAGES_PROMPT`, `GENERATE_ALTERNATIVE_ANCHORS_PROMPT`, `GENERATE_CONTEXTUAL_BRIDGE_PROMPT`, `FIND_LINK_SOURCE_PROMPT` (lines 2476-3688)

**Step 4: Create index.ts re-exporting everything**

```typescript
// config/prompts/index.ts
export * from './helpers';
export * from './mapGeneration';
export * from './contentBriefs';
export * from './draftWriting';
export * from './auditing';
export * from './mapAnalysis';
export * from './topicOperations';
export * from './flowRemediation';
export * from './navigation';
```

**Step 5: Update config/prompts.ts to be a re-export facade**

```typescript
// config/prompts.ts — backward compatibility facade
export * from './prompts/index';
```

**Step 6: Run tests**

Run: `npx vitest run config/__tests__/promptModules.test.ts && npm test`
Expected: All PASS

**Step 7: Commit**

```bash
git add config/prompts/ config/prompts.ts config/__tests__/promptModules.test.ts
git commit -m "refactor: decompose config/prompts.ts (3688 lines) into 9 domain modules"
```

---

### Task 3.2: Remove config/prompts.ts from ESLint Legacy Exceptions

**Files:**
- Modify: `eslint.config.mjs:135-153`

**Step 1: Remove prompts.ts exception** from the ESLint config override list (it should now be within limits since each module is <500 lines).

**Step 2: Run lint**

Run: `npx eslint config/prompts/ --max-warnings 0`
Expected: PASS (all modules under 500 lines)

**Step 3: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: remove prompts.ts from ESLint legacy file size exceptions"
```

---

### Sprint 3 Validation

```bash
npm test && npx playwright test e2e/auth.spec.ts e2e/projects.spec.ts e2e/topical-map.spec.ts e2e/global-ui.spec.ts
```

---

## Sprint 4: God Component Decomposition — ProjectDashboardContainer

### Task 4.1: Extract Map Operations Hook

**Files:**
- Create: `hooks/useMapOperations.ts`
- Create: `hooks/__tests__/useMapOperations.test.ts`
- Modify: `components/ProjectDashboardContainer.tsx` (remove map handler code)

**Step 1: Write failing test**

```typescript
// hooks/__tests__/useMapOperations.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useMapOperations', () => {
  it('should export map operation handlers', () => {
    // Test that the hook returns all expected handler functions
  });
});
```

**Step 2: Extract handlers from ProjectDashboardContainer lines 192-434**

Move `handleSelectMap`, `handleCreateNewMap`, `handleGenerateInitialMap`, `handleRegenerateMap`, `onSavePillars`, `onConfirmPillarChange`, and related state into `useMapOperations.ts`.

**Step 3: Replace in ProjectDashboardContainer**

```typescript
const mapOps = useMapOperations({ state, dispatch, supabase });
// Pass mapOps.handleSelectMap, mapOps.handleCreateNewMap, etc. to ProjectDashboard
```

**Step 4: Run tests**

Run: `npm test && npx playwright test e2e/topical-map.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add hooks/useMapOperations.ts hooks/__tests__/useMapOperations.test.ts components/ProjectDashboardContainer.tsx
git commit -m "refactor: extract useMapOperations hook from ProjectDashboardContainer"
```

---

### Task 4.2: Extract Analysis Operations Hook

**Files:**
- Create: `hooks/useAnalysisOperations.ts`
- Create: `hooks/__tests__/useAnalysisOperations.test.ts`
- Modify: `components/ProjectDashboardContainer.tsx`

Extract from ProjectDashboardContainer lines 1050-1226: knowledge domain analysis, GSC analysis, merge opportunities, semantic analysis, contextual coverage, internal linking audit, topical authority, publication plan, unified audit operations.

Follow same TDD pattern as Task 4.1.

**Commit:**
```bash
git commit -m "refactor: extract useAnalysisOperations hook from ProjectDashboardContainer"
```

---

### Task 4.3: Extract Foundation Pages Hook

**Files:**
- Create: `hooks/useFoundationPageOperations.ts`
- Create: `hooks/__tests__/useFoundationPageOperations.test.ts`
- Modify: `components/ProjectDashboardContainer.tsx`

Extract from ProjectDashboardContainer lines 2481-2819: NAP data, foundation pages CRUD, navigation repair, briefing repairs.

Follow same TDD pattern.

**Commit:**
```bash
git commit -m "refactor: extract useFoundationPageOperations hook from ProjectDashboardContainer"
```

---

### Task 4.4: Extract Content Generation Hook (if not already useContentGeneration)

**Files:**
- Modify: `components/ProjectDashboardContainer.tsx`

Verify that content generation handlers (lines 1605-1800) delegate to existing `useContentGeneration` hook. If not, extract.

**Commit:**
```bash
git commit -m "refactor: delegate content generation to useContentGeneration hook"
```

---

### Task 4.5: Reduce ProjectDashboard Props with Context Providers

**Files:**
- Create: `components/dashboard/DashboardContext.tsx`
- Modify: `components/ProjectDashboard.tsx` (reduce from 60+ to ~15 props)
- Modify: `components/ProjectDashboardContainer.tsx`

**Step 1: Create context**

```typescript
// components/dashboard/DashboardContext.tsx
import { createContext, useContext } from 'react';

interface DashboardOperations {
  mapOps: ReturnType<typeof useMapOperations>;
  analysisOps: ReturnType<typeof useAnalysisOperations>;
  foundationOps: ReturnType<typeof useFoundationPageOperations>;
  // ... other operation groups
}

const DashboardContext = createContext<DashboardOperations | null>(null);

export const DashboardProvider = DashboardContext.Provider;
export function useDashboardOps() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboardOps must be used within DashboardProvider');
  return ctx;
}
```

**Step 2: Wrap in container**

```typescript
// In ProjectDashboardContainer render:
<DashboardProvider value={{ mapOps, analysisOps, foundationOps }}>
  <ProjectDashboard
    projectName={...}
    topicalMap={...}
    allTopics={...}
    // Only ~15 data props, no handler props
  />
</DashboardProvider>
```

**Step 3: Update child components** to use `useDashboardOps()` instead of receiving props.

**Step 4: Run full test suite**

Run: `npm test && npx playwright test e2e/topical-map.spec.ts e2e/projects.spec.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add components/dashboard/DashboardContext.tsx components/ProjectDashboard.tsx components/ProjectDashboardContainer.tsx
git commit -m "refactor: replace 60+ prop drilling with DashboardContext provider"
```

---

### Task 4.6: Verify Size Reduction

**Step 1: Check ProjectDashboardContainer.tsx line count**

Expected: Under 800 lines (down from 3,058).

**Step 2: Remove from ESLint legacy exceptions** if under 500 lines.

**Commit:**
```bash
git commit -m "chore: remove ProjectDashboardContainer from ESLint legacy exceptions"
```

---

### Sprint 4 Validation

```bash
npm test && npx playwright test e2e/auth.spec.ts e2e/projects.spec.ts e2e/topical-map.spec.ts e2e/global-ui.spec.ts
```

---

## Sprint 5: God Component Decomposition — DraftingModal

### Task 5.1: Extract DraftingImagePanel

**Files:**
- Create: `components/modals/drafting/DraftingImagePanel.tsx`
- Create: `components/modals/drafting/__tests__/DraftingImagePanel.test.tsx`
- Modify: `components/modals/DraftingModal.tsx`

Extract all image generation/management UI from DraftingModal: image placeholder parsing, image generation triggers, image URL replacement, image gallery display.

Follow TDD pattern. Test that image panel renders, handles image generation callbacks, and displays image results.

**Commit:**
```bash
git commit -m "refactor: extract DraftingImagePanel from DraftingModal"
```

---

### Task 5.2: Extract DraftingAuditPanel

**Files:**
- Create: `components/modals/drafting/DraftingAuditPanel.tsx`
- Create: `components/modals/drafting/__tests__/DraftingAuditPanel.test.tsx`
- Modify: `components/modals/DraftingModal.tsx`

Extract audit UI: audit trigger, issue display, fix application, quality tab content.

**Commit:**
```bash
git commit -m "refactor: extract DraftingAuditPanel from DraftingModal"
```

---

### Task 5.3: Extract DraftingPublishingPanel

**Files:**
- Create: `components/modals/drafting/DraftingPublishingPanel.tsx`
- Create: `components/modals/drafting/__tests__/DraftingPublishingPanel.test.tsx`
- Modify: `components/modals/DraftingModal.tsx`

Extract publishing integrations: WordPress, Style Publish modal triggers, Premium Design modal, export functionality.

**Commit:**
```bash
git commit -m "refactor: extract DraftingPublishingPanel from DraftingModal"
```

---

### Task 5.4: Extract DraftingSocialPanel

**Files:**
- Create: `components/modals/drafting/DraftingSocialPanel.tsx`
- Create: `components/modals/drafting/__tests__/DraftingSocialPanel.test.tsx`
- Modify: `components/modals/DraftingModal.tsx`

Extract social media transformation and editing UI.

**Commit:**
```bash
git commit -m "refactor: extract DraftingSocialPanel from DraftingModal"
```

---

### Task 5.5: Verify DraftingModal Size Reduction

**Step 1: Check DraftingModal.tsx line count**

Expected: Under 1000 lines (down from 4,311). Should be orchestrator only, delegating to sub-panels.

**Step 2: Remove from ESLint legacy exceptions** if under 500 lines.

**Commit:**
```bash
git commit -m "chore: remove DraftingModal from ESLint legacy exceptions"
```

---

### Sprint 5 Validation

```bash
npm test && npx playwright test e2e/auth.spec.ts e2e/projects.spec.ts e2e/topical-map.spec.ts
```

---

## Sprint 6: TypeScript Quality — Eliminate Critical `any` Types

### Task 6.1: Type AI Provider Supabase Clients

**Files:**
- Modify: `services/openRouterService.ts:58`
- Modify: `services/perplexityService.ts:59`
- Modify: `services/geminiService.ts:219`
- Create: `services/__tests__/providerTypeSafety.test.ts`

**Step 1: Write test**

```typescript
// services/__tests__/providerTypeSafety.test.ts
import { describe, it, expect } from 'vitest';

describe('AI Provider Type Safety', () => {
  it('should not use any for supabase clients', async () => {
    // Import each service and verify types are resolved
    // (This is a compile-time check, but we verify no runtime errors)
    const { default: openRouter } = await import('../openRouterService');
    expect(openRouter).toBeDefined();
  });
});
```

**Step 2: Replace `let supabase: any;` with proper typing**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

let supabase: SupabaseClient<Database> | null = null;
```

**Step 3: Run type checker**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 4: Commit**

```bash
git add services/openRouterService.ts services/perplexityService.ts services/geminiService.ts
git commit -m "fix: replace any-typed supabase clients with SupabaseClient<Database>"
```

---

### Task 6.2: Type AI Provider Function Parameters

**Files:**
- Modify: `services/anthropicService.ts` (lines 977, 982, 1002 — `briefs: any`, `mode: any`)
- Modify: `services/openRouterService.ts` (lines 232-234 — `coreTopics: any[]`)
- Modify: `services/geminiService.ts` (lines 628-652 — `processSection(sectionData: any[])`)

**Step 1: For each `any` parameter, trace the caller** to determine the actual type.

**Step 2: Replace with proper imports from `types/content.ts` or `types/semantic.ts`**

Example:
```typescript
// Before:
auditInternalLinking(..., briefs: any, ...)
// After:
import type { ContentBrief } from '../types/content';
auditInternalLinking(..., briefs: ContentBrief[], ...)
```

**Step 3: Run type checker**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git commit -m "fix: replace critical any types in AI provider services with proper interfaces"
```

---

### Task 6.3: Type Loop Variables and Reduce Callbacks

**Files:** Target the most common patterns across AI services.

Replace patterns like:
```typescript
.forEach((s: any) => ...)
.reduce((acc: number, t: any) => ...)
const textBlock = data.content?.find((b: any) => b.type === 'text');
```

With properly typed alternatives using imported interfaces.

**Commit:**
```bash
git commit -m "fix: replace any-typed loop variables in AI services"
```

---

### Sprint 6 Validation

```bash
npx tsc --noEmit && npm test && npx playwright test e2e/auth.spec.ts e2e/projects.spec.ts
```

---

## Sprint 7: Dead Code Cleanup

### Task 7.1: Delete Orphaned Files and Directories

**Files to delete:**
- `D:\www\cost-of-retreival-reducer\nul` (empty Windows null device file)
- `D:\www\cost-of-retreival-reducer\CLAUDE.md.backup`
- All 7 empty directories with mangled Windows paths (the `D:wwwcost-of-retreival-reducer*` dirs)
- `tmpdebug/` (empty directory)

**Step 1: Verify they're unused**

Run: `grep -r "CLAUDE.md.backup" . --include="*.ts" --include="*.tsx" --include="*.json"` — expect 0 results.

**Step 2: Delete**

```bash
rm nul CLAUDE.md.backup
rm -rf tmpdebug/
# Delete the mangled path directories
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete orphaned files and empty directories"
```

---

### Task 7.2: Archive Debug E2E Tests

**Files:**
- Move to `e2e/_archived/`: All 16 `nfir-*.spec.ts` files and 7 `debug-*.spec.ts` files

**Step 1: Verify they're not in CI**

Check that `playwright.config.ts` test directory is `./e2e` — archived tests in `_archived/` will be excluded.

**Step 2: Move files**

```bash
mkdir -p e2e/_archived
mv e2e/nfir-*.spec.ts e2e/_archived/
mv e2e/debug-*.spec.ts e2e/_archived/
```

**Step 3: Run E2E tests to confirm no failures**

Run: `npx playwright test`
Expected: 23 fewer test files, remaining tests PASS

**Step 4: Commit**

```bash
git add e2e/
git commit -m "chore: archive 23 debug/nfir E2E tests to e2e/_archived"
```

---

### Task 7.3: Remove DEBUG Comments from Production Code

**Files:**
- Modify: `services/publishing/renderer/index.ts` (lines 952, 1001)
- Modify: `services/publishing/renderer/contentAdapter.ts` (lines 119, 251, 387)
- Modify: `services/publishing/renderer/blueprintRenderer.ts` (line 397)

**Step 1: Remove all `// DEBUG:` commented-out logging lines.

**Step 2: Verify no regressions**

Run: `npm test`

**Step 3: Commit**

```bash
git commit -m "chore: remove DEBUG comments from publishing renderer"
```

---

### Task 7.4: Remove DEPRECATED Code with Migration Path

**Files:**
- `services/publishing/renderer/index.ts:942` — "DEPRECATED: BlueprintRenderer"
- `services/publishing/renderer/componentLibrary.ts:74` — "DEPRECATED: Use emphasisClasses()"
- `services/ai/schemaGeneration/schemaValidator.ts:607-632` — DEPRECATED_PROPERTIES

**Step 1: For each deprecated item, verify no callers exist**

Run grep for each function/class name. If zero callers, delete. If callers exist, document the migration path.

**Step 2: Remove dead deprecated code**

**Step 3: Commit**

```bash
git commit -m "chore: remove deprecated code with zero callers"
```

---

### Sprint 7 Validation

```bash
npm test && npx playwright test e2e/auth.spec.ts e2e/projects.spec.ts e2e/topical-map.spec.ts
```

---

## Sprint 8: Critical Test Coverage

### Task 8.1: Add aiService Unit Tests

**Files:**
- Create: `services/__tests__/aiService.test.ts`

Test the main AI service facade: provider selection, error handling, response parsing. Mock all downstream providers.

**Commit:**
```bash
git commit -m "test: add unit tests for aiService facade"
```

---

### Task 8.2: Add geminiService Unit Tests

**Files:**
- Create: `services/__tests__/geminiService.test.ts`

Test: API call construction, response parsing, retry behavior, usage context tracking.

**Commit:**
```bash
git commit -m "test: add unit tests for geminiService"
```

---

### Task 8.3: Add verifiedDatabaseService Unit Tests

**Files:**
- Create: `services/__tests__/verifiedDatabaseService.test.ts`

Test: verified insert (success + failure), verified update, timeout handling, verification callback.

**Commit:**
```bash
git commit -m "test: add unit tests for verifiedDatabaseService"
```

---

### Task 8.4: Add ProjectDashboard Component Tests

**Files:**
- Create: `components/__tests__/ProjectDashboard.test.tsx`

Test: renders with minimal props, tab navigation works, loading states display correctly.

**Commit:**
```bash
git commit -m "test: add component tests for ProjectDashboard"
```

---

### Task 8.5: Add TopicalMapDisplay Component Tests

**Files:**
- Create: `components/__tests__/TopicalMapDisplay.test.tsx`

Test: renders topic list, handles empty state, selection works, filter works.

**Commit:**
```bash
git commit -m "test: add component tests for TopicalMapDisplay"
```

---

### Task 8.6: Add E2E Runtime Regression Suite

**Files:**
- Create: `e2e/regression-smoke.spec.ts`

Comprehensive E2E smoke test that validates the critical user paths:

```typescript
// e2e/regression-smoke.spec.ts
import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, TEST_CONFIG } from './test-utils';

test.describe('Regression Smoke Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('app loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await waitForAppLoad(page);
    // Filter out known acceptable errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('auth flow completes without errors', async ({ page }) => {
    await login(page);
    await expect(page.locator('[data-testid="projects-list"], .min-h-screen')).toBeVisible({ timeout: 15000 });
  });

  test('project dashboard loads after login', async ({ page }) => {
    await login(page);
    // Navigate to first project if available
    const projectLink = page.locator('[data-testid="project-link"]').first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectLink.click();
      await expect(page.locator('[data-testid="dashboard"], .project-dashboard')).toBeVisible({ timeout: 15000 });
    }
  });

  test('settings page loads and saves', async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    await expect(page.locator('text=Settings')).toBeVisible({ timeout: 10000 });
  });
});
```

**Commit:**
```bash
git commit -m "test: add E2E regression smoke suite for critical user paths"
```

---

### Sprint 8 Validation

```bash
npm test && npm run test:coverage && npx playwright test e2e/regression-smoke.spec.ts
```

Review coverage report. Target: services/ at >30% coverage (up from ~5%).

---

## Sprint 9: Remaining File Decomposition

### Task 9.1: Decompose cssGenerator.ts (2,936 lines)

**Files:**
- Create: `services/publishing/css/tokenGenerator.ts`
- Create: `services/publishing/css/resetStyles.ts`
- Create: `services/publishing/css/typography.ts`
- Create: `services/publishing/css/layoutUtilities.ts`
- Create: `services/publishing/css/componentStyles.ts`
- Create: `services/publishing/css/darkMode.ts`
- Create: `services/publishing/css/responsive.ts`
- Create: `services/publishing/css/animations.ts`
- Create: `services/publishing/css/index.ts` (orchestrator)
- Modify: `services/publishing/cssGenerator.ts` → re-export facade

Extract each CSS generation phase into its own module. The main `cssGenerator.ts` becomes a thin orchestrator that calls each phase in sequence.

Follow TDD: write test for each phase module, extract, verify.

**Commit:**
```bash
git commit -m "refactor: decompose cssGenerator.ts into CSS phase modules"
```

---

### Task 9.2: Decompose CleanArticleRenderer.ts (2,899 lines)

**Files:**
- Create: `services/publishing/renderer/contentParser.ts`
- Create: `services/publishing/renderer/htmlGenerator.ts`
- Create: `services/publishing/renderer/telemetryTracker.ts`
- Modify: `services/publishing/renderer/CleanArticleRenderer.ts` (slim down)

Extract content parsing, HTML generation, and telemetry into separate modules. The renderer class becomes a coordinator.

**Commit:**
```bash
git commit -m "refactor: decompose CleanArticleRenderer into parser, generator, and telemetry modules"
```

---

### Task 9.3: Decompose auditChecks.ts (2,244 lines)

**Files:**
- Create: `services/ai/contentGeneration/passes/auditChecks/registry.ts`
- Create: `services/ai/contentGeneration/passes/auditChecks/checks/` (individual check files)
- Modify: `services/ai/contentGeneration/passes/auditChecks.ts` → orchestrator

Extract each of the 30+ audit checks into individual functions. Create a registry pattern:

```typescript
// registry.ts
interface AuditCheck {
  id: string;
  name: string;
  run: (content: string, options: AuditOptions) => AuditResult;
}

export const auditCheckRegistry: AuditCheck[] = [];
export function registerCheck(check: AuditCheck) { auditCheckRegistry.push(check); }
```

Each check file registers itself. The orchestrator iterates the registry.

**Commit:**
```bash
git commit -m "refactor: decompose auditChecks.ts into check registry pattern"
```

---

### Sprint 9 Validation

```bash
npm test && npx playwright test e2e/regression-smoke.spec.ts
```

---

## Sprint 10: Accessibility & Performance

### Task 10.1: Add Accessibility Attributes to Interactive Elements

**Files:**
- Modify: `components/dashboard/TabNavigation.tsx` (add `aria-selected`, `role="tab"`, `aria-controls`)
- Modify: `components/TopicItem.tsx` (add `aria-label` to action buttons)
- Modify: `components/TopicalMapDisplay.tsx` (add keyboard navigation for drag-and-drop)
- Create: `e2e/accessibility.spec.ts`

**Step 1: Write E2E accessibility test**

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import { waitForAppLoad, login } from './test-utils';

test.describe('Accessibility', () => {
  test('tab navigation has proper ARIA roles', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    await login(page);
    // Navigate to dashboard
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
    // Each tab should have aria-selected
    for (let i = 0; i < tabCount; i++) {
      const ariaSelected = await tabs.nth(i).getAttribute('aria-selected');
      expect(ariaSelected).toBeDefined();
    }
  });

  test('interactive buttons have aria-label or visible text', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    const iconButtons = page.locator('button:not(:has-text(*))');
    const count = await iconButtons.count();
    for (let i = 0; i < count; i++) {
      const label = await iconButtons.nth(i).getAttribute('aria-label');
      const title = await iconButtons.nth(i).getAttribute('title');
      expect(label || title).toBeTruthy();
    }
  });
});
```

**Step 2: Fix accessibility issues in components**

**Step 3: Run accessibility tests**

**Commit:**
```bash
git commit -m "fix: add ARIA attributes to interactive elements for accessibility"
```

---

### Task 10.2: Add React.memo to List Item Components

**Files:**
- Modify: `components/TopicRow.tsx` (wrap with React.memo)
- Modify: `components/TopicCompactRow.tsx` (wrap with React.memo)
- Modify: `components/TopicItem.tsx` (wrap with React.memo)
- Modify: `components/GscOpportunityItem.tsx` (wrap with React.memo)
- Modify: `components/AuditIssueCard.tsx` (wrap with React.memo)

**Step 1: For each list item component, wrap the export:**

```typescript
export default React.memo(TopicRow);
```

**Step 2: Run full test suite**

Run: `npm test && npx playwright test e2e/topical-map.spec.ts`

**Step 3: Commit**

```bash
git commit -m "perf: add React.memo to list item components for render optimization"
```

---

### Sprint 10 Validation

```bash
npm test && npx playwright test e2e/regression-smoke.spec.ts e2e/accessibility.spec.ts
```

---

## Sprint 11: Final Hardening

### Task 11.1: Centralize HTML Selectors from htmlFetcherService

**Files:**
- Add to: `config/apiEndpoints.ts` or create `config/scrapingConfig.ts`
- Modify: `services/htmlFetcherService.ts:31-40`

Move `REMOVE_SELECTORS` to config. Add test verifying selectors are importable.

**Commit:**
```bash
git commit -m "refactor: move HTML scraping selectors to config"
```

---

### Task 11.2: Extract E2E BASE_URL to Config

**Files:**
- Modify: `e2e/test-utils.ts` (ensure BASE_URL is exported)
- Modify: 15+ E2E specs that hardcode `const BASE_URL = 'http://localhost:3000'`

Replace all hardcoded BASE_URLs with import from test-utils:
```typescript
import { TEST_CONFIG } from './test-utils';
const BASE_URL = TEST_CONFIG.BASE_URL || 'http://localhost:3000';
```

**Commit:**
```bash
git commit -m "refactor: centralize E2E BASE_URL to test-utils"
```

---

### Task 11.3: Restore CLAUDE.md from Backup

**Files:**
- Copy: `CLAUDE.md.backup` → `CLAUDE.md`
- Delete: `CLAUDE.md.backup`

**Commit:**
```bash
git add CLAUDE.md
git rm CLAUDE.md.backup
git commit -m "chore: restore CLAUDE.md from backup"
```

---

### Task 11.4: Clean tmp/ and Add to .gitignore Verification

**Step 1: Verify tmp/ is in .gitignore**

**Step 2: Remove any tracked tmp/ files**

```bash
git rm -r --cached tmp/ 2>/dev/null || true
```

**Step 3: Commit**

```bash
git commit -m "chore: ensure tmp/ directory is fully untracked"
```

---

### Task 11.5: Final E2E Regression Validation

Run the complete test suite:

```bash
npm run lint && npx tsc --noEmit && npm test && npx playwright test e2e/regression-smoke.spec.ts e2e/auth.spec.ts e2e/projects.spec.ts e2e/topical-map.spec.ts e2e/global-ui.spec.ts e2e/settings.spec.ts
```

All must PASS. If any fail, debug and fix before declaring the refactoring complete.

**Commit:**
```bash
git commit -m "chore: final validation — all tests green after architecture refactoring"
```

---

## Summary: Metrics Before & After

| Metric | Before | After (Target) |
|--------|--------|---------|
| Largest file (DraftingModal) | 4,311 lines | <1,000 lines |
| Largest file (ProjectDashboardContainer) | 3,058 lines | <800 lines |
| config/prompts.ts | 3,688 lines (1 file) | 9 files, each <500 lines |
| ESLint legacy exceptions | 10 files | <5 files |
| Silent error catches | 15+ | 0 |
| CORS wildcard | Default `*` | Origin whitelist |
| `any` in AI services | 261 files | <200 files (targeting critical services) |
| ProjectDashboard props | 60+ | ~15 |
| Unit test files | 99 | 110+ |
| E2E regression suite | None | 1 comprehensive suite |
| Archived debug tests | 0 | 23 archived |
| Orphaned files | 10+ | 0 |
| API endpoints scattered | 6+ services | 1 config file |
| AI provider duplication | 4 copies | 1 shared module |
