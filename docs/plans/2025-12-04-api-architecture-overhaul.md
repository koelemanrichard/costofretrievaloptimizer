# API Architecture Overhaul: Reliability & Context Flow

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a rock-solid, future-proof AI service layer with complete strategic context flowing through ALL content generation steps (Topical Map → Content Brief → Multi-pass Draft), explicit output mode control, and single source of truth for all configuration.

**Architecture:** Implement unified context objects that carry the full Holistic SEO context (3 Pillars, EAVs, BusinessInfo, Competitors, TopicalMap metadata) through all major steps. Establish clear separation between JSON and Text generation modes. Centralize all provider configuration.

**Tech Stack:** TypeScript, React, Supabase Edge Functions

---

## Context Flow Validation Report

### Current State Analysis

| Step | Context Elements | Status |
|------|-----------------|--------|
| **1. Topical Map Creation** | Pillars, EAVs, Competitors, BusinessInfo | ✅ Mostly Complete (minor gaps) |
| **2. Content Brief Creation** | Topic, Pillars, KnowledgeGraph, Topics | ⚠️ Missing: EAVs, Author Profile, Full Competitors |
| **3. Multi-pass Content Gen** | Brief, BusinessInfo | ❌ Critical Gaps: Missing Pillars, EAVs, Linking, Featured Snippet |

### Critical Gaps Identified

#### Step 1: Topical Map Creation
| Data Element | Available | Passed | Gap |
|--------------|-----------|--------|-----|
| SEO Pillars | ✅ | ✅ Full JSON | - |
| EAVs | ✅ | ⚠️ Only first 20 | Truncation |
| Competitors | ✅ | ✅ | - |
| BusinessInfo | ✅ | ✅ | - |
| Website Type | ✅ | ❌ | Not passed |
| Primary/Auxiliary Verbs | ✅ | ❌ | Not passed |

#### Step 2: Content Brief Creation
| Data Element | Available | Passed | Gap |
|--------------|-----------|--------|-----|
| Topic | ✅ | ✅ | - |
| Pillars | ✅ | ✅ | - |
| Knowledge Graph | ✅ | ⚠️ 15 nodes max | Truncation |
| All Topics (linking) | ✅ | ✅ | - |
| EAVs | ✅ | ❌ | **Not passed** |
| Author Profile | ✅ | ❌ | **Not passed** |
| Topic Class (monetization/info) | ✅ | ❌ | **Not passed** |
| Competitor SERP Data | ✅ | ❌ | **Not in prompt** |

#### Step 3: Multi-pass Content Generation (CRITICAL)
| Data Element | Available | Pass 1 | Pass 2-7 | Pass 8 |
|--------------|-----------|--------|----------|--------|
| Brief.title | ✅ | ✅ | ✅ | - |
| Brief.targetKeyword | ✅ | ✅ | ✅ | - |
| Brief.contextualVectors (EAVs) | ✅ | ⚠️ First 5 only | ❌ | ❌ |
| Brief.featured_snippet_target | ✅ | ❌ | ❌ | ❌ |
| Brief.contextualBridge | ✅ | ❌ | ❌ | ❌ |
| Brief.discourse_anchors | ✅ | ❌ | Pass 6 only | ❌ |
| Brief.visual_semantics | ✅ | ❌ | ❌ | ❌ |
| SEO Pillars | ✅ | ❌ | ❌ | ❌ |
| pillars.centralEntity | ✅ | ❌ Indirect only | ❌ | ❌ |
| pillars.sourceContext | ✅ | ❌ | ❌ | ❌ |
| pillars.centralSearchIntent | ✅ | ❌ | ❌ | ❌ |
| BusinessInfo (full) | ✅ | ✅ | ❌ | ❌ |
| Author Profile | ✅ | ✅ | ❌ | ❌ |
| Related Topics (linking) | ✅ | ❌ | ❌ | ❌ |
| Topic Type (core/outer) | ✅ | ❌ | ❌ | ❌ |

---

## Executive Summary

### Problems Identified

1. **Missing Strategic Context**: Content generation prompts don't receive the 3 Pillars (Central Entity, Source Context, Central Search Intent) or EAVs - the foundational elements of the Holistic SEO framework.

2. **Broken Text Generation**: `anthropicService.callApi()` always adds JSON formatting instructions, even for text output. The regex workaround in `generateText()` doesn't work.

3. **Duplicate/Scattered Logic**: Fallback logic, model names, error handling are duplicated across multiple files with inconsistencies.

4. **No Single Source of Truth**: Configuration scattered across files, hardcoded values instead of dynamic data.

### Solution Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    CONTENT GENERATION CONTEXT                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ 3 Pillars   │  │   EAVs      │  │ BusinessInfo│  │ ContentBrief│       │
│  │ - CE        │  │ - Triples   │  │ - Provider  │  │ - Outline   │       │
│  │ - SC        │  │ - Categories│  │ - API Keys  │  │ - Keywords  │       │
│  │ - CSI       │  │             │  │ - Language  │  │ - SERP      │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED PROVIDER LAYER                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ providerConfig.ts (SINGLE SOURCE OF TRUTH)                           │ │
│  │ - Valid models per provider                                          │ │
│  │ - Fallback order                                                     │ │
│  │ - Retry settings                                                     │ │
│  │ - Timeout values                                                     │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ providerUtils.ts (CENTRALIZED FALLBACK LOGIC)                        │ │
│  │ - callProviderWithFallback()                                         │ │
│  │ - Error classification                                               │ │
│  │ - API key validation                                                 │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    PROVIDER SERVICES                                       │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │ anthropic     │ │ gemini        │ │ openai        │ │ perplexity    │  │
│  │ generateJson()│ │ generateJson()│ │ generateJson()│ │ generateJson()│  │
│  │ generateText()│ │ generateText()│ │ generateText()│ │ generateText()│  │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Development Branch Setup

**CRITICAL: All work MUST be done in a new branch before merging.**

### Task 0.1: Create Feature Branch

```bash
git checkout -b feature/api-architecture-overhaul
git push -u origin feature/api-architecture-overhaul
```

---

## Phase 1: Create Single Source of Truth for Provider Configuration

### Task 1.1: Create providerConfig.ts

**Files:**
- Create: `services/ai/providerConfig.ts`

This file becomes the SINGLE SOURCE OF TRUTH for all AI provider configuration.

```typescript
// services/ai/providerConfig.ts
// SINGLE SOURCE OF TRUTH for AI provider configuration

import { BusinessInfo } from '../../types';

/**
 * Valid model IDs per provider
 * Updated: December 2025
 */
export const VALID_MODELS = {
  anthropic: [
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5-20251001',
    'claude-opus-4-1-20250805',
    'claude-sonnet-4-20250514',
    // Legacy (deprecated but functional)
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
  ],
  gemini: [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  perplexity: [
    'llama-3.1-sonar-large-128k-online',
    'llama-3.1-sonar-small-128k-online',
  ],
  openrouter: [
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o',
    'google/gemini-pro-1.5',
  ],
} as const;

/**
 * Default model per provider (used when no specific model is configured)
 */
export const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
  perplexity: 'llama-3.1-sonar-large-128k-online',
  openrouter: 'anthropic/claude-3.5-sonnet',
} as const;

/**
 * Fast/cheap models per provider (for large prompts or fallback)
 */
export const FAST_MODELS = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
  perplexity: 'llama-3.1-sonar-small-128k-online',
  openrouter: 'openai/gpt-4o-mini',
} as const;

/**
 * Fallback order when primary provider fails
 */
export const FALLBACK_ORDER = ['anthropic', 'openai', 'gemini', 'openrouter', 'perplexity'] as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelayMs: 2000,
  maxDelayMs: 8000,
  // Prompt length threshold for switching to fast model
  largPromptThreshold: 40000,
} as const;

/**
 * Timeout configuration (in milliseconds)
 */
export const TIMEOUT_CONFIG = {
  default: 120000,      // 2 minutes
  largePrompt: 180000,  // 3 minutes
  edgeFunction: 55000,  // Supabase edge function limit
} as const;

/**
 * Provider type
 */
export type Provider = keyof typeof VALID_MODELS;

/**
 * Check if a model is valid for a provider
 */
export function isValidModel(provider: Provider, model: string): boolean {
  return VALID_MODELS[provider].includes(model as any);
}

/**
 * Get the best model for a provider based on prompt size
 */
export function getModelForPrompt(provider: Provider, promptLength: number, configuredModel?: string): string {
  if (promptLength > RETRY_CONFIG.largPromptThreshold) {
    console.log(`[ProviderConfig] Large prompt (${promptLength} chars) - using fast model`);
    return FAST_MODELS[provider];
  }
  if (configuredModel && isValidModel(provider, configuredModel)) {
    return configuredModel;
  }
  return DEFAULT_MODELS[provider];
}

/**
 * Check if provider has a configured API key
 */
export function hasApiKey(info: BusinessInfo, provider: Provider): boolean {
  switch (provider) {
    case 'anthropic': return !!info.anthropicApiKey;
    case 'openai': return !!info.openAiApiKey;
    case 'gemini': return !!info.geminiApiKey;
    case 'perplexity': return !!info.perplexityApiKey;
    case 'openrouter': return !!info.openRouterApiKey;
    default: return false;
  }
}

/**
 * Get available providers based on configured API keys
 */
export function getAvailableProviders(info: BusinessInfo): Provider[] {
  return FALLBACK_ORDER.filter(p => hasApiKey(info, p));
}
```

---

## Phase 2: Create ContentGenerationContext Type

### Task 2.1: Add ContentGenerationContext to types.ts

**Files:**
- Modify: `types.ts` (add near ContentBrief interface)

This type carries the FULL strategic context through all content generation passes.

```typescript
/**
 * Complete context for content generation
 * Carries all strategic information from the Topical Map through all passes
 */
export interface ContentGenerationContext {
  // The 3 Pillars - Foundation of Holistic SEO
  pillars: {
    centralEntity: string;      // The primary entity of the entire topical map
    sourceContext: string;      // Who you are, how you monetize
    centralSearchIntent: string; // The canonical action/goal
    primaryVerb?: string;       // e.g., "Buy", "Hire"
    auxiliaryVerb?: string;     // e.g., "Learn", "Compare"
  };

  // Semantic Foundation
  eavs: SemanticTriple[];       // Entity-Attribute-Value triples

  // Business & Author Context
  businessInfo: BusinessInfo;

  // The specific content being generated
  brief: ContentBrief;

  // Topic metadata
  topic: {
    id: string;
    title: string;
    type: 'core' | 'outer';     // Core Section vs Author Section
    parentTopicId?: string;     // For outer topics, the parent core topic
    topicClass?: 'monetization' | 'informational';
  };

  // Topical Map context
  topicalMap: {
    id: string;
    name: string;
    totalTopics: number;
    relatedTopics: { id: string; title: string; type: string }[]; // For linking
  };

  // Knowledge Graph excerpt (for semantic grounding)
  knowledgeGraphTerms?: string[];
}

/**
 * Output mode for AI calls
 */
export type AIOutputMode = 'json' | 'text';
```

---

### Task 2.2: Create context builder utility

**Files:**
- Create: `services/ai/contentGeneration/contextBuilder.ts`

```typescript
// services/ai/contentGeneration/contextBuilder.ts
import {
  BusinessInfo,
  ContentBrief,
  TopicalMap,
  EnrichedTopic,
  ContentGenerationContext,
  SEOPillars,
  SemanticTriple
} from '../../../types';

/**
 * Builds a complete ContentGenerationContext from available data
 * This is the SINGLE place where context is assembled
 */
export function buildContentGenerationContext(
  businessInfo: BusinessInfo,
  brief: ContentBrief,
  topic: EnrichedTopic,
  topicalMap: TopicalMap
): ContentGenerationContext {
  // Extract pillars with fallbacks
  const pillars = topicalMap.pillars || {
    centralEntity: businessInfo.seedKeyword,
    sourceContext: businessInfo.valueProp,
    centralSearchIntent: `${businessInfo.seedKeyword} ${topic.title}`,
  };

  // Get EAVs from topical map
  const eavs = topicalMap.eavs || [];

  // Get related topics for linking context
  const allTopics = topicalMap.topics || [];
  const relatedTopics = allTopics
    .filter(t => t.id !== topic.id)
    .slice(0, 20)
    .map(t => ({
      id: t.id,
      title: t.title,
      type: t.type || 'outer',
    }));

  return {
    pillars: {
      centralEntity: pillars.centralEntity,
      sourceContext: pillars.sourceContext,
      centralSearchIntent: pillars.centralSearchIntent,
      primaryVerb: pillars.primary_verb,
      auxiliaryVerb: pillars.auxiliary_verb,
    },
    eavs,
    businessInfo,
    brief,
    topic: {
      id: topic.id,
      title: topic.title,
      type: topic.type || 'outer',
      parentTopicId: topic.parent_topic_id,
      topicClass: topic.topic_class,
    },
    topicalMap: {
      id: topicalMap.id,
      name: topicalMap.name,
      totalTopics: allTopics.length,
      relatedTopics,
    },
    knowledgeGraphTerms: extractKnowledgeTerms(eavs),
  };
}

/**
 * Extract key terms from EAVs for semantic grounding
 */
function extractKnowledgeTerms(eavs: SemanticTriple[]): string[] {
  const terms = new Set<string>();

  eavs.forEach(eav => {
    if (eav.subject?.label) terms.add(eav.subject.label);
    if (eav.object?.value && typeof eav.object.value === 'string') {
      terms.add(eav.object.value);
    }
  });

  return Array.from(terms).slice(0, 30);
}

/**
 * Create a summary of the context for prompts
 */
export function contextToPromptString(ctx: ContentGenerationContext): string {
  return `
## Strategic Context (3 Pillars)
- Central Entity: ${ctx.pillars.centralEntity}
- Source Context: ${ctx.pillars.sourceContext}
- Central Search Intent: ${ctx.pillars.centralSearchIntent}
${ctx.pillars.primaryVerb ? `- Primary Verb: ${ctx.pillars.primaryVerb}` : ''}
${ctx.pillars.auxiliaryVerb ? `- Auxiliary Verb: ${ctx.pillars.auxiliaryVerb}` : ''}

## Topic Context
- Topic: ${ctx.topic.title} (${ctx.topic.type} topic)
- Section: ${ctx.topic.topicClass === 'monetization' ? 'Core Section (Monetization)' : 'Author Section (Informational)'}
- Topical Map: ${ctx.topicalMap.name} (${ctx.topicalMap.totalTopics} total topics)

## Business Context
- Domain: ${ctx.businessInfo.domain}
- Industry: ${ctx.businessInfo.industry}
- Target Audience: ${ctx.businessInfo.audience}
- Value Proposition: ${ctx.businessInfo.valueProp}
- Language: ${ctx.businessInfo.language}
- Target Market: ${ctx.businessInfo.targetMarket}

## Semantic Foundation (Key EAV Terms)
${ctx.knowledgeGraphTerms?.slice(0, 15).join(', ') || 'No EAV data available'}

## Related Topics (for Internal Linking)
${ctx.topicalMap.relatedTopics.slice(0, 10).map(t => `- ${t.title}`).join('\n')}
`.trim();
}
```

---

## Phase 3: Fix Provider Services (JSON vs Text Mode)

### Task 3.1: Fix anthropicService.ts callApi

**Files:**
- Modify: `services/anthropicService.ts`

**Step 1: Update callApi signature to use explicit jsonMode boolean**

```typescript
const callApi = async <T>(
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>,
    sanitizerFn: (text: string) => T,
    jsonMode: boolean = true  // Explicit: true = JSON output, false = text output
): Promise<T> => {
```

**Step 2: Conditional prompt formatting based on jsonMode**

```typescript
    // Only add JSON formatting instructions when jsonMode is true
    const effectivePrompt = jsonMode
        ? `${prompt}\n\nCRITICAL FORMATTING REQUIREMENT: Your response must be ONLY a valid JSON object. Do NOT include any text before or after the JSON. Do NOT wrap it in markdown code blocks. Start your response directly with { and end with }.`
        : prompt;
```

**Step 3: Conditional system message based on jsonMode**

```typescript
    const systemMessage = jsonMode
        ? "You are a helpful, expert SEO strategist. You ALWAYS output valid JSON when requested. Never include explanatory text, markdown formatting, or code blocks around your JSON response. Start directly with { and end with }. Keep responses concise."
        : "You are a helpful, expert SEO strategist and content writer. Provide clear, well-structured responses in the requested format and language. Use markdown formatting when appropriate for content.";
```

**Step 4: Fix generateText to pass jsonMode=false**

```typescript
export const generateText = async (
    prompt: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    // Text mode: no JSON instructions, returns plain text/markdown
    return callApi(prompt, businessInfo, dispatch, (text) => text, false);
};
```

---

### Task 3.2: Verify other provider services

**Files:**
- Review: `services/geminiService.ts`
- Review: `services/openAiService.ts`
- Review: `services/perplexityService.ts`
- Review: `services/openRouterService.ts`

Ensure each has:
- `generateText()` that passes `false` (or equivalent) to disable JSON mode
- `generateJson()` that uses JSON mode

---

## Phase 4: Update Content Generation Prompts

### Task 4.1: Update GENERATE_SECTION_DRAFT_PROMPT to use full context

**Files:**
- Modify: `config/prompts.ts`

Replace the current prompt to use `ContentGenerationContext`:

```typescript
export const GENERATE_SECTION_DRAFT_PROMPT = (
  section: { key: string; heading: string; level: number; subordinateTextHint?: string; methodologyNote?: string },
  ctx: ContentGenerationContext,
  allSections: { heading: string }[]
): string => {
  const { brief, pillars, businessInfo: info, eavs, topic, topicalMap } = ctx;

  // Extract SERP-related data from brief
  const serpPAA = brief.serpAnalysis?.peopleAlsoAsk || [];
  const perspectives = brief.perspectives || [];

  return `
You are an expert content writer following the Holistic SEO framework.

**CRITICAL LANGUAGE REQUIREMENT**: Write ALL content in ${info.language || 'English'}. Target market: ${info.targetMarket || 'Global'}.

Write ONLY the content for this specific section. Do NOT include the heading itself - just the body text.

## Strategic Foundation (3 Pillars)
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}
${pillars.primaryVerb ? `- Primary Action Verb: ${pillars.primaryVerb}` : ''}

## Section to Write
Heading: ${section.heading}
Level: H${section.level}
${section.subordinateTextHint ? `Content Direction: ${section.subordinateTextHint}` : ''}
${section.methodologyNote ? `Format Requirement: ${section.methodologyNote}` : ''}

## Article Context
Title: ${brief.title}
Target Keyword: ${brief.targetKeyword || brief.title}
Topic Type: ${topic.type === 'core' ? 'Core Section (Monetization Focus)' : 'Author Section (Informational)'}
Meta Description: ${brief.metaDescription}
Key Takeaways: ${brief.keyTakeaways?.join(', ') || 'N/A'}
Search Intent: ${brief.searchIntent || 'informational'}
${perspectives.length > 0 ? `Perspectives to Include: ${perspectives.join(', ')}` : ''}

## Semantic Foundation (EAV Context)
${eavs.slice(0, 10).map(e => `- ${e.subject?.label || 'Entity'}: ${e.predicate?.relation || 'has'} ${e.object?.value || 'value'}`).join('\n')}

## Full Article Structure
${allSections.map((s, i) => `${i + 1}. ${s.heading}`).join('\n')}

${serpPAA.length > 0 ? `## Related Questions (SERP "People Also Ask")
${serpPAA.slice(0, 5).map(q => `- ${q}`).join('\n')}` : ''}

## Business Context
- Domain: ${info.domain}
- Industry: ${info.industry}
- Target Audience: ${info.audience}
- Unique Value: ${info.valueProp}

## Related Topics (Internal Linking Opportunities)
${topicalMap.relatedTopics.slice(0, 8).map(t => `- ${t.title}`).join('\n')}

## Writing Rules
1. **LANGUAGE**: Write entirely in ${info.language || 'English'}
2. **Central Entity Focus**: Every section must reinforce "${pillars.centralEntity}" - the Central Entity
3. **Source Context Alignment**: Content must align with "${pillars.sourceContext}"
4. **EAV Density**: Each sentence should contain an Entity-Attribute-Value triple
5. **Subject Positioning**: "${brief.targetKeyword || brief.title}" should be the grammatical SUBJECT in key sentences
6. **No Fluff**: Avoid filler words - maximize Information Density
7. **Modality**: Use definitive verbs ("is", "are") not uncertainty ("can be", "might")
8. **Unique Openings**: Start each section DIFFERENTLY - questions, statistics, scenarios, comparisons

Write 150-300 words of content for this section in ${info.language || 'English'}. Output ONLY the prose content, no headings or metadata.
`;
};
```

---

### Task 4.2: Update all PASS prompts to use ContentGenerationContext

**Files:**
- Modify: `config/prompts.ts` - Update PASS_2 through PASS_7 prompts

Each prompt should:
1. Accept `ctx: ContentGenerationContext` instead of separate parameters
2. Include the 3 Pillars in the prompt
3. Reference EAVs for semantic grounding
4. Use `brief.targetKeyword || brief.title` (not `info.seedKeyword`)

---

## Phase 5: Fix Topical Map Creation Context (Step 1)

### Task 5.1: Update GENERATE_INITIAL_TOPICAL_MAP_PROMPT

**Files:**
- Modify: `config/prompts.ts`

**Current Gaps:**
- Website Type not passed (affects topic hierarchy strategy)
- Primary/Auxiliary verbs not passed
- EAVs truncated to first 20

**Step 1: Add website type to prompt**

In `GENERATE_INITIAL_TOPICAL_MAP_PROMPT`:
```typescript
**Website Type:** ${info.websiteType || 'INFORMATIONAL'}
**Business Model Approach:**
${info.websiteType === 'ECOMMERCE' ? '- Focus on product categories, buying guides, comparisons' : ''}
${info.websiteType === 'SAAS' ? '- Focus on features, use cases, integrations, pricing' : ''}
${info.websiteType === 'SERVICE' ? '- Focus on service types, process explanations, case studies' : ''}
${info.websiteType === 'INFORMATIONAL' ? '- Focus on educational content, definitions, how-tos' : ''}
```

**Step 2: Add primary/auxiliary verbs**

```typescript
**Central Search Intent Breakdown:**
- Primary Action: ${pillars.primary_verb || 'Learn about'} ${pillars.centralEntity}
- Secondary Action: ${pillars.auxiliary_verb || 'Understand'} ${pillars.centralEntity}
```

**Step 3: Increase EAV limit or pass all**

Change from:
```typescript
eavs.slice(0, 20)
```
To:
```typescript
eavs.slice(0, 50)  // Increased limit for semantic grounding
```

---

## Phase 6: Fix Content Brief Creation Context (Step 2)

### Task 6.1: Create BriefGenerationContext type

**Files:**
- Modify: `types.ts`

```typescript
/**
 * Complete context for content brief generation
 */
export interface BriefGenerationContext {
  businessInfo: BusinessInfo;
  topic: EnrichedTopic;
  allTopics: EnrichedTopic[];
  pillars: SEOPillars;
  knowledgeGraph: KnowledgeGraph;
  responseCode: ResponseCode;

  // NEW: Additional context that was missing
  eavs: SemanticTriple[];           // Full EAV list from topical map
  authorProfile?: AuthorProfile;     // For E-A-T signals in brief
  topicClass: 'monetization' | 'informational';  // Core vs Author section
  competitors: string[];             // For SERP positioning
  relatedBriefs?: ContentBrief[];    // For cross-referencing consistency
}
```

### Task 6.2: Update GENERATE_CONTENT_BRIEF_PROMPT

**Files:**
- Modify: `config/prompts.ts`

**Step 1: Add EAVs to prompt**

After the Knowledge Graph section, add:
```typescript
**Semantic Foundation (EAV Triples):**
${eavs.slice(0, 30).map(e =>
  `- ${e.subject?.label || 'Entity'} ${e.predicate?.relation || 'has'} ${e.object?.value || 'value'} (${e.category || 'COMMON'})`
).join('\n')}
```

**Step 2: Add Author Profile for E-A-T**

```typescript
**Author Profile (E-A-T Signals):**
${info.authorProfile ? `
- Name: ${info.authorProfile.name}
- Title: ${info.authorProfile.title || 'Expert'}
- Credentials: ${info.authorProfile.credentials?.join(', ') || 'Industry experience'}
- Expertise Areas: ${info.authorProfile.expertiseAreas?.join(', ') || info.industry}
` : 'Use business domain expertise'}
```

**Step 3: Add Topic Classification**

```typescript
**Topic Classification:**
- Section Type: ${topicClass === 'monetization' ? 'Core Section (Monetization Focus)' : 'Author Section (Trust Building)'}
- Linking Strategy: ${topicClass === 'monetization'
  ? 'Links TO this page from Author Section topics'
  : 'Links FROM this page TO Core Section topics'}
```

**Step 4: Add Competitor Context**

```typescript
**Competitor Landscape:**
${competitors.length > 0
  ? `Key competitors to outperform: ${competitors.join(', ')}\n- Identify content gaps they haven't covered\n- Find unique angles based on Source Context`
  : 'No specific competitors identified - focus on comprehensive coverage'}
```

### Task 6.3: Update briefGeneration.ts service

**Files:**
- Modify: `services/ai/briefGeneration.ts`

Update the function signature to accept full context:
```typescript
export const generateContentBrief = async (
  ctx: BriefGenerationContext,  // Use context object instead of individual params
  dispatch: React.Dispatch<any>
) => {
  const prompt = GENERATE_CONTENT_BRIEF_PROMPT(ctx);
  // ...
}
```

---

## Phase 7: Update Pass Implementations (Step 3)

### Task 7.1: Update pass1DraftGeneration.ts

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass1DraftGeneration.ts`

**Changes:**
1. Accept `ContentGenerationContext` instead of separate parameters
2. Import and use `callProviderWithFallback` from `providerUtils.ts`
3. Remove duplicate fallback logic
4. Pass context to prompt builder

```typescript
import { ContentGenerationContext } from '../../../../types';
import { callProviderWithFallback } from '../providerUtils';
import { GENERATE_SECTION_DRAFT_PROMPT } from '../../../../config/prompts';

export async function executePass1(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  ctx: ContentGenerationContext,  // Full context
  onSectionComplete: (key: string, heading: string, current: number, total: number) => void,
  shouldAbort: () => boolean
): Promise<string> {
  const sections = orchestrator.parseSectionsFromBrief(ctx.brief);

  // ... section generation loop

  const prompt = GENERATE_SECTION_DRAFT_PROMPT(section, ctx, allSections);
  const content = await callProviderWithFallback(ctx.businessInfo, prompt);

  // ...
}
```

---

### Task 5.2: Update pass2-7 implementations

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass2Headers.ts`
- Modify: `services/ai/contentGeneration/passes/pass3Lists.ts`
- Modify: `services/ai/contentGeneration/passes/pass4Visuals.ts`
- Modify: `services/ai/contentGeneration/passes/pass5MicroSemantics.ts`
- Modify: `services/ai/contentGeneration/passes/pass6Discourse.ts`
- Modify: `services/ai/contentGeneration/passes/pass7Introduction.ts`

Each should:
1. Accept `ContentGenerationContext`
2. Use `callProviderWithFallback` from `providerUtils.ts`
3. Pass context to prompt builder

---

## Phase 6: Update Hook and Orchestrator

### Task 6.1: Update useContentGeneration hook

**Files:**
- Modify: `hooks/useContentGeneration.ts`

**Changes:**
1. Accept `topicalMap` as prop (to get pillars and EAVs)
2. Build `ContentGenerationContext` using `buildContentGenerationContext()`
3. Pass context to all pass executions

```typescript
import { buildContentGenerationContext } from '../services/ai/contentGeneration/contextBuilder';

export function useContentGeneration(
  businessInfo: BusinessInfo,
  brief: ContentBrief,
  topic: EnrichedTopic,
  topicalMap: TopicalMap,  // ADD THIS
  // ...
) {
  const ctx = useMemo(() =>
    buildContentGenerationContext(businessInfo, brief, topic, topicalMap),
    [businessInfo, brief, topic, topicalMap]
  );

  // Use ctx in all pass executions
}
```

---

### Task 6.2: Update ContentBriefModal to pass topicalMap

**Files:**
- Modify: `components/ContentBriefModal.tsx`

Ensure `topicalMap` is passed to `useContentGeneration`.

---

## Phase 7: Consolidate providerUtils.ts

### Task 7.1: Update providerUtils.ts to use providerConfig

**Files:**
- Modify: `services/ai/contentGeneration/providerUtils.ts`

```typescript
import {
  FALLBACK_ORDER,
  RETRY_CONFIG,
  hasApiKey,
  getModelForPrompt,
  Provider
} from '../providerConfig';

// Remove local FALLBACK_ORDER constant
// Remove local error classification functions (or import from config)
// Use centralized configuration
```

---

## Phase 8: Testing & Verification

### Task 8.1: Update unit tests

**Files:**
- Modify: Relevant test files

Update tests to use `ContentGenerationContext`.

---

### Task 8.2: Run full test suite

```bash
npm run build
npm test
```

Expected: All tests pass.

---

### Task 8.3: Manual testing checklist

1. **AI Strategist**: Type "What should I do next?" - should respond without error
2. **Content Generation**:
   - Start generation for a topic
   - Verify console shows Central Entity, Source Context, CSI in prompts
   - Verify no 400 errors
   - Verify content matches topic keyword (not seedKeyword)
3. **Fallback**: Temporarily use invalid API key, verify fallback to another provider

---

## Phase 9: Documentation & Commit

### Task 9.1: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

Add section documenting the new architecture:

```markdown
### ContentGenerationContext
The `ContentGenerationContext` type carries the complete Holistic SEO context through all 8 passes:
- **3 Pillars**: Central Entity, Source Context, Central Search Intent
- **EAVs**: Semantic triples from the Topical Map
- **Business Context**: Domain, industry, audience, language
- **Topic Context**: Type (core/outer), section class, related topics

### Provider Configuration
All AI provider configuration is centralized in `services/ai/providerConfig.ts`:
- Valid model names per provider
- Default and fast models
- Fallback order
- Retry settings
```

---

### Task 9.2: Commit and create PR

```bash
git add -A
git commit -m "feat(architecture): implement ContentGenerationContext and unified provider layer

- Add ContentGenerationContext type carrying full Holistic SEO context (3 Pillars, EAVs)
- Create providerConfig.ts as single source of truth for AI configuration
- Fix anthropicService.ts jsonMode handling for text vs JSON output
- Update all 8 content generation passes to use full context
- Centralize fallback logic in providerUtils.ts
- Update prompts to include Central Entity, Source Context, CSI

This is a foundational change that ensures:
- Content generation uses the complete strategic context from the Topical Map
- AI provider configuration is centralized and maintainable
- Text generation (Strategist, Content Gen) works correctly
- Fallback between providers works reliably

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push
gh pr create --title "feat: API Architecture Overhaul" --body "..."
```

---

## Verification Checklist

After completing all tasks:

- [ ] Working on `feature/api-architecture-overhaul` branch
- [ ] `providerConfig.ts` created with all configuration
- [ ] `ContentGenerationContext` type added to `types.ts`
- [ ] `contextBuilder.ts` created
- [ ] `anthropicService.ts` fixed (jsonMode parameter)
- [ ] All provider services have consistent `generateText()`/`generateJson()`
- [ ] All prompts updated to use `ContentGenerationContext`
- [ ] All passes updated to accept and use context
- [ ] `useContentGeneration` builds and passes full context
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (341+ tests)
- [ ] AI Strategist works without errors
- [ ] Content generation works without 400 errors
- [ ] Generated content includes Central Entity context
- [ ] Fallback to other providers works
- [ ] PR created for review

---

## Architecture Benefits

1. **Single Source of Truth**: All configuration in `providerConfig.ts`
2. **Complete Context**: 3 Pillars + EAVs flow through all passes
3. **Testable**: Each component can be unit tested
4. **Debuggable**: Clear logging shows what context is being used
5. **Future-Proof**: Easy to add new providers or modify configuration
6. **Simple Operations**: Clear separation of concerns
7. **Dynamic Data**: No hardcoded business data in prompts
