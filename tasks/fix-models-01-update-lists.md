
# Task: Update AI Model Lists & Defaults

**Status:** Pending
**Priority:** CRITICAL
**Target Files:**
- `services/modelDiscoveryService.ts`
- `config/defaults.ts`
- `services/geminiService.ts`

## 1. Objective
Replace invalid/future model IDs with valid production IDs and set a stable default to prevent errors.

## 2. Implementation Steps

### Step 2.1: Update `modelDiscoveryService.ts`
Update the constants with these exact strings:

```typescript
const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-3-pro-preview', // Keep as option
    'gemini-1.5-pro'
];

const OPENAI_MODELS = [
    'gpt-4o',
    'gpt-4o-mini',
    'o1-preview',
    'o1-mini',
    'gpt-4-turbo'
];

const ANTHROPIC_MODELS = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229'
];

const PERPLEXITY_MODELS = [
    'sonar-reasoning-pro',
    'sonar-pro',
    'sonar'
];
```

### Step 2.2: Update `config/defaults.ts`
- Change `defaultBusinessInfo.aiModel` to `'gemini-2.5-flash'`.

### Step 2.3: Update `services/geminiService.ts`
- Change `GEMINI_FALLBACK_MODEL` to `'gemini-2.5-flash'`.

## 3. Verification
1.  Open "Settings" or "Generate Brief".
2.  Select "OpenAI". Verify "gpt-4o" is available and "gpt-5" is gone.
3.  Select "Anthropic". Verify "claude-3-5-sonnet..." is available.
4.  Generate a brief using "gemini-2.5-flash". It should succeed without quota errors.
