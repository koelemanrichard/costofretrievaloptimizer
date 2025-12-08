# Semantic Audit Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the Macro/Micro Semantics audit framework from the prototype into the application, adding AI-powered semantic analysis, inline Smart Fix buttons, and effort-based action prioritization.

**Architecture:** Create a new `semanticAnalysisService.ts` that uses Gemini/OpenAI structured output to analyze page content. Add reusable UI components for Core Entity display, Smart Fix inline buttons, and phase-grouped action plans. Integrate into both Site Analysis (`PageAuditDetailV2`) and Migration Workbench (`MigrationWorkbenchModal`).

**Tech Stack:** React, TypeScript, Tailwind CSS, Gemini API (structured JSON output), Supabase for persistence.

---

## Task 1: Add Semantic Analysis Types

**Files:**
- Modify: `types.ts` (append to end)

**Step 1: Add the new types to types.ts**

Append to `types.ts`:

```typescript
// =============================================================================
// SEMANTIC ANALYSIS TYPES (Macro/Micro Framework)
// =============================================================================

export interface CoreEntities {
  centralEntity: string;
  searchIntent: string;
  detectedSourceContext: string;
}

export interface MacroAnalysis {
  contextualVector: string;  // H1-H6 flow and linearity analysis
  hierarchy: string;         // Heading depth and order analysis
  sourceContext: string;     // Brand alignment and tone analysis
}

export interface MicroAnalysis {
  sentenceStructure: string;    // Modality, verbs, subject positioning
  informationDensity: string;   // Fluff words and fact density
  htmlSemantics: string;        // Lists, tables, alt tags
}

export type SemanticActionCategory = 'Low Hanging Fruit' | 'Mid Term' | 'Long Term';
export type SemanticActionType = 'Micro-Semantics' | 'Macro-Semantics';
export type SemanticActionImpact = 'High' | 'Medium' | 'Low';

export interface SemanticActionItem {
  id: string;
  title: string;
  description: string;
  category: SemanticActionCategory;
  impact: SemanticActionImpact;
  type: SemanticActionType;
  ruleReference?: string;
  smartFix?: string;  // AI-generated fix suggestion
}

export interface SemanticAuditResult {
  overallScore: number;
  summary: string;
  coreEntities: CoreEntities;
  macroAnalysis: MacroAnalysis;
  microAnalysis: MicroAnalysis;
  actions: SemanticActionItem[];
  analyzedAt: string;
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors related to new types

**Step 3: Commit**

```bash
git add types.ts
git commit -m "feat: add semantic analysis types for Macro/Micro framework"
```

---

## Task 2: Create Semantic Framework Constants

**Files:**
- Create: `config/semanticFramework.ts`

**Step 1: Create the framework constants file**

```typescript
// config/semanticFramework.ts
// Semantic SEO Framework based on Koray Tugberk GUBUR methodology

export const SEMANTIC_FRAMEWORK = `
MACRO SEMANTICS (Structure & Architecture)
=========================================
**Macro-Semantics** defines the overall **Contextual Vector**, the hierarchy of information, and the "skeleton" of meaning.

1. **The Contextual Vector (Straight Line of Meaning)**
   - **Linearity**: The content must flow logically from H1 to the final heading. No detours.
   - **H1 Alignment**: H1 must reflect the Central Entity and User Intent.
   - **Signifiers**: Consistent use of predicates and adjectives (e.g., if discussing "Risks", use negative verbs).

2. **Contextual Hierarchy (Headings)**
   - **Incremental Ordering**: H2 -> H3 must follow logical depth (Attribute -> Sub-attribute).
   - **Feature Snippets**: Use lists in headings for "Types of", "Benefits of", etc.
   - **Prioritization**: Most important attributes (e.g., "Location" for a country) come before minor ones (e.g., "Cinema").

3. **Page Segmentation (Macro vs Micro)**
   - **Border Control**: Clear separation between Main Content and Supplementary Content.
   - **Contextual Bridges**: Logical sentences connecting different sections (e.g., "Now that we understand X, let's look at Y...").
   - **Link Placement**: Links to distinct topics should be in the footer/supplementary zone, not disrupting the main vector.

4. **Source Context & Brand**
   - **Sharpening**: Content must align with the site's expertise/monetization model.
   - **Tone**: Definitive statements ("X is Y") build authority.

MICRO SEMANTICS (Granular & Linguistics)
=======================================
**Micro-Semantics** determines *how* the search engine scores accuracy and relevance at the sentence/word level.

1. **Sentence Structure & Modality**
   - **Modality**: Use "is/are" (definitive) over "can/might" (probability) wherever possible.
   - **Stop Words**: Remove fluff words ("also", "basically", "very").
   - **Subject Positioning**: The main entity should be the Subject of the sentence.
   - **Information Density**: Every sentence must add a new "Fact" (Entity + Attribute + Value).

2. **Contextual Flow**
   - **First Sentence Rule**: The first sentence of a paragraph must directly answer/define the header above it.
   - **Centerpiece Annotation**: The core answer to the user's query must exist in the first 400 characters.

3. **HTML & Visual Semantics**
   - **Lists**: Use <ul> for ingredients/unordered, <ol> for steps/rankings.
   - **Tables**: Use for comparing attributes (Price, Specs).
   - **Alt Text**: Describe the *relation* of the image to the text, not just the image itself.
`;

export const SMART_FIX_PROMPT_TEMPLATE = `
You are a Micro-Semantic Expert Assistant.

TASK: The user needs to implement the following action on their webpage:
Action: "{title}"
Description: "{description}"
Rule Reference: "{ruleReference}"

CONTEXT (The specific webpage content):
"""
{pageContent}
"""

INSTRUCTION:
Provide a CONCRETE, PRACTICAL example of how to fix this *specifically* for this content.
- If it's a contextual bridge, write the exact sentence to insert.
- If it's a heading fix, show the Old Heading vs New Heading.
- If it's fluff removal, show the sentence before and after.
- Explain *why* this specific change helps the vector/semantics.
- Keep it concise but actionable (max 200 words).
`;
```

**Step 2: Verify file is valid**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add config/semanticFramework.ts
git commit -m "feat: add semantic framework constants and prompt templates"
```

---

## Task 3: Create Semantic Analysis Service

**Files:**
- Create: `services/ai/semanticAnalysis.ts`

**Step 1: Create the semantic analysis service**

```typescript
// services/ai/semanticAnalysis.ts
// AI-powered semantic analysis using structured output

import { v4 as uuidv4 } from 'uuid';
import {
  SemanticAuditResult,
  SemanticActionItem,
  CoreEntities,
  MacroAnalysis,
  MicroAnalysis,
  BusinessInfo,
} from '../../types';
import { SEMANTIC_FRAMEWORK, SMART_FIX_PROMPT_TEMPLATE } from '../../config/semanticFramework';
import { callGemini, callOpenAI, callAnthropic } from '../aiService';

// JSON Schema for structured output
const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    overall_score: { type: 'number', description: '0-100 score based on semantic adherence' },
    summary: { type: 'string', description: 'Executive summary of audit findings (2-3 sentences)' },
    core_entities: {
      type: 'object',
      properties: {
        central_entity: { type: 'string', description: 'The single main concept or entity of the page' },
        search_intent: { type: 'string', description: 'User intent: Know, Do, Go, Commercial, etc.' },
        detected_source_context: { type: 'string', description: 'Who does the text sound like? e.g. Medical Expert, Generic Blogger' },
      },
      required: ['central_entity', 'search_intent', 'detected_source_context'],
    },
    macro_analysis: {
      type: 'object',
      properties: {
        contextual_vector: { type: 'string', description: 'Analysis of H1-H6 flow and linearity. Use bullet points.' },
        hierarchy: { type: 'string', description: 'Analysis of heading depth and order. Use bullet points.' },
        source_context: { type: 'string', description: 'Analysis of brand alignment and tone. Use bullet points.' },
      },
      required: ['contextual_vector', 'hierarchy', 'source_context'],
    },
    micro_analysis: {
      type: 'object',
      properties: {
        sentence_structure: { type: 'string', description: 'Analysis of modality, verbs, subject positioning. Use bullet points.' },
        information_density: { type: 'string', description: 'Analysis of fluff words and fact density. Use bullet points.' },
        html_semantics: { type: 'string', description: 'Analysis of lists, tables, alt tags. Use bullet points.' },
      },
      required: ['sentence_structure', 'information_density', 'html_semantics'],
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string', enum: ['Low Hanging Fruit', 'Mid Term', 'Long Term'] },
          impact: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          type: { type: 'string', enum: ['Micro-Semantics', 'Macro-Semantics'] },
          rule_reference: { type: 'string', description: 'Which specific rule from the framework does this fix?' },
        },
        required: ['title', 'description', 'category', 'impact', 'type'],
      },
    },
  },
  required: ['overall_score', 'summary', 'core_entities', 'macro_analysis', 'micro_analysis', 'actions'],
};

/**
 * Analyze page content using AI with structured output
 */
export const analyzePageSemantics = async (
  content: string,
  url: string,
  businessInfo: BusinessInfo
): Promise<SemanticAuditResult> => {
  const prompt = `
You are an elite Semantic SEO Auditor. Analyze this webpage against the Micro-Semantics and Macro-Semantics framework.

FRAMEWORK RULES:
${SEMANTIC_FRAMEWORK}

INSTRUCTIONS:
1. **Analyze Macro-Semantics**: Look at the "Skeleton". Is the H1 aligned? Is the H2-H3 hierarchy logical? Does the topic flow linearly or does it jump?
2. **Analyze Micro-Semantics**: Look at the "Muscles". Are sentences definitive ("is") or weak ("can")? Is there fluff? Are lists used correctly?
3. **Core Entity Detection**: Explicitly identify the Central Entity, the implicit Source Context (who wrote this?), and the User's Search Intent.
4. **Generate Action Plan**: Create a COMPREHENSIVE action plan. List EVERYTHING that is wrong or could be improved.
   - *Low Hanging Fruit*: HTML tags, Title fixes, Fluff removal, First sentence fixes.
   - *Mid Term*: Paragraph rewriting, Structural re-ordering, Internal linking anchors.
   - *Long Term*: Brand positioning, Sitewide N-Grams, Content gaps.

INPUT CONTENT (URL: ${url}):
"""
${content.substring(0, 60000)}
"""

Return strict JSON matching the schema. Use Markdown formatting (bullet points, **bold**) in text fields.
`;

  try {
    let responseText: string;

    if (businessInfo.aiProvider === 'gemini' && businessInfo.geminiApiKey) {
      responseText = await callGemini(prompt, businessInfo.geminiApiKey, businessInfo.aiModel, {
        responseFormat: 'json',
        jsonSchema: ANALYSIS_SCHEMA,
      });
    } else if (businessInfo.aiProvider === 'openai' && businessInfo.openAiApiKey) {
      responseText = await callOpenAI(prompt, businessInfo.openAiApiKey, businessInfo.aiModel, {
        responseFormat: 'json',
      });
    } else if (businessInfo.aiProvider === 'anthropic' && businessInfo.anthropicApiKey) {
      responseText = await callAnthropic(prompt, businessInfo.anthropicApiKey, businessInfo.aiModel);
    } else {
      throw new Error('No valid AI provider configured');
    }

    // Parse and map response
    const parsed = JSON.parse(responseText);
    return mapResponseToResult(parsed);
  } catch (error) {
    console.error('Semantic analysis failed:', error);
    throw error;
  }
};

/**
 * Generate a smart fix for a specific action item
 */
export const generateSmartFix = async (
  action: SemanticActionItem,
  pageContent: string,
  businessInfo: BusinessInfo
): Promise<string> => {
  const prompt = SMART_FIX_PROMPT_TEMPLATE
    .replace('{title}', action.title)
    .replace('{description}', action.description)
    .replace('{ruleReference}', action.ruleReference || '')
    .replace('{pageContent}', pageContent.substring(0, 30000));

  try {
    let responseText: string;

    if (businessInfo.aiProvider === 'gemini' && businessInfo.geminiApiKey) {
      responseText = await callGemini(prompt, businessInfo.geminiApiKey, businessInfo.aiModel);
    } else if (businessInfo.aiProvider === 'openai' && businessInfo.openAiApiKey) {
      responseText = await callOpenAI(prompt, businessInfo.openAiApiKey, businessInfo.aiModel);
    } else if (businessInfo.aiProvider === 'anthropic' && businessInfo.anthropicApiKey) {
      responseText = await callAnthropic(prompt, businessInfo.anthropicApiKey, businessInfo.aiModel);
    } else {
      throw new Error('No valid AI provider configured');
    }

    return responseText;
  } catch (error) {
    console.error('Smart fix generation failed:', error);
    return 'Failed to generate suggestion. Please try again.';
  }
};

/**
 * Map API response to typed result
 */
const mapResponseToResult = (data: any): SemanticAuditResult => {
  return {
    overallScore: data.overall_score || 0,
    summary: data.summary || '',
    coreEntities: {
      centralEntity: data.core_entities?.central_entity || 'Unknown',
      searchIntent: data.core_entities?.search_intent || 'Unknown',
      detectedSourceContext: data.core_entities?.detected_source_context || 'Unknown',
    },
    macroAnalysis: {
      contextualVector: data.macro_analysis?.contextual_vector || '',
      hierarchy: data.macro_analysis?.hierarchy || '',
      sourceContext: data.macro_analysis?.source_context || '',
    },
    microAnalysis: {
      sentenceStructure: data.micro_analysis?.sentence_structure || '',
      informationDensity: data.micro_analysis?.information_density || '',
      htmlSemantics: data.micro_analysis?.html_semantics || '',
    },
    actions: (data.actions || []).map((a: any) => ({
      id: uuidv4(),
      title: a.title || '',
      description: a.description || '',
      category: a.category || 'Mid Term',
      impact: a.impact || 'Medium',
      type: a.type || 'Micro-Semantics',
      ruleReference: a.rule_reference,
    })),
    analyzedAt: new Date().toISOString(),
  };
};
```

**Step 2: Verify service compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add services/ai/semanticAnalysis.ts
git commit -m "feat: add semantic analysis service with AI-powered audit"
```

---

## Task 4: Create Core Entity Boxes Component

**Files:**
- Create: `components/ui/CoreEntityBoxes.tsx`

**Step 1: Create the component**

```typescript
// components/ui/CoreEntityBoxes.tsx
// Display Core Entity, Search Intent, and Source Context

import React from 'react';
import { CoreEntities } from '../../types';

interface CoreEntityBoxesProps {
  entities: CoreEntities;
  className?: string;
}

export const CoreEntityBoxes: React.FC<CoreEntityBoxesProps> = ({ entities, className = '' }) => {
  const boxes = [
    { label: 'Central Entity (Subject)', value: entities.centralEntity },
    { label: 'Detected User Intent', value: entities.searchIntent },
    { label: 'Detected Source Context', value: entities.detectedSourceContext },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {boxes.map((box, index) => (
        <div
          key={index}
          className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-4"
        >
          <div className="text-xs text-sky-400 uppercase tracking-wide mb-1">
            {box.label}
          </div>
          <div className="font-semibold text-white text-lg">
            {box.value || 'Not detected'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CoreEntityBoxes;
```

**Step 2: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/ui/CoreEntityBoxes.tsx
git commit -m "feat: add CoreEntityBoxes component for semantic analysis display"
```

---

## Task 5: Create Smart Fix Button Component

**Files:**
- Create: `components/ui/SmartFixButton.tsx`

**Step 1: Create the component**

```typescript
// components/ui/SmartFixButton.tsx
// Inline AI-powered fix suggestion button

import React, { useState } from 'react';
import { SemanticActionItem, BusinessInfo } from '../../types';
import { generateSmartFix } from '../../services/ai/semanticAnalysis';
import { SimpleMarkdown } from './SimpleMarkdown';

interface SmartFixButtonProps {
  action: SemanticActionItem;
  pageContent: string;
  businessInfo: BusinessInfo;
  onFixGenerated?: (fix: string) => void;
}

export const SmartFixButton: React.FC<SmartFixButtonProps> = ({
  action,
  pageContent,
  businessInfo,
  onFixGenerated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fixContent, setFixContent] = useState<string | null>(action.smartFix || null);
  const [isExpanded, setIsExpanded] = useState(!!action.smartFix);

  const handleGenerateFix = async () => {
    if (fixContent) {
      setIsExpanded(!isExpanded);
      return;
    }

    setIsLoading(true);
    try {
      const fix = await generateSmartFix(action, pageContent, businessInfo);
      setFixContent(fix);
      setIsExpanded(true);
      onFixGenerated?.(fix);
    } catch (error) {
      console.error('Failed to generate fix:', error);
      setFixContent('Failed to generate suggestion. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={handleGenerateFix}
        disabled={isLoading}
        className="px-3 py-1.5 text-sm rounded-md bg-purple-500/20 text-purple-400
                   border border-purple-500/30 hover:bg-purple-500/30
                   disabled:opacity-50 flex items-center gap-2 transition-colors"
      >
        {isLoading ? (
          <>
            <span className="animate-spin">⚙️</span>
            Generating...
          </>
        ) : fixContent ? (
          <>
            <span>✨</span>
            {isExpanded ? 'Hide Fix' : 'Show Fix'}
          </>
        ) : (
          <>
            <span>✨</span>
            Get Smart Fix
          </>
        )}
      </button>

      {isExpanded && fixContent && (
        <div className="mt-3 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <div className="text-xs text-purple-400 font-semibold uppercase tracking-wide mb-2">
            Suggested Implementation
          </div>
          <div className="text-gray-200 text-sm prose prose-sm prose-invert max-w-none">
            <SimpleMarkdown content={fixContent} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartFixButton;
```

**Step 2: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/ui/SmartFixButton.tsx
git commit -m "feat: add SmartFixButton component for inline AI fix suggestions"
```

---

## Task 6: Create Semantic Action Card Component

**Files:**
- Create: `components/ui/SemanticActionCard.tsx`

**Step 1: Create the component**

```typescript
// components/ui/SemanticActionCard.tsx
// Action card with category, impact, and Smart Fix integration

import React from 'react';
import { SemanticActionItem, BusinessInfo } from '../../types';
import { SmartFixButton } from './SmartFixButton';

interface SemanticActionCardProps {
  action: SemanticActionItem;
  pageContent: string;
  businessInfo: BusinessInfo;
  onFixGenerated?: (actionId: string, fix: string) => void;
}

export const SemanticActionCard: React.FC<SemanticActionCardProps> = ({
  action,
  pageContent,
  businessInfo,
  onFixGenerated,
}) => {
  const getBorderColor = () => {
    switch (action.category) {
      case 'Low Hanging Fruit': return 'border-green-500';
      case 'Mid Term': return 'border-yellow-500';
      case 'Long Term': return 'border-blue-500';
      default: return 'border-gray-500';
    }
  };

  const getImpactBadgeStyle = () => {
    switch (action.impact) {
      case 'High': return 'bg-red-500/20 text-red-400';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'Low': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className={`bg-gray-800/50 rounded-lg p-4 border-l-4 ${getBorderColor()}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {action.category}
        </span>
        <span className="text-xs text-gray-500">
          {action.type}
        </span>
      </div>

      {/* Title & Impact */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-white">{action.title}</h4>
        <span className={`text-xs px-2 py-0.5 rounded ${getImpactBadgeStyle()}`}>
          {action.impact} Impact
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-300 text-sm leading-relaxed mb-2">
        {action.description}
      </p>

      {/* Rule Reference */}
      {action.ruleReference && (
        <div className="text-xs text-gray-500 italic border-t border-gray-700 pt-2 mt-2">
          Target: {action.ruleReference}
        </div>
      )}

      {/* Smart Fix Button */}
      <SmartFixButton
        action={action}
        pageContent={pageContent}
        businessInfo={businessInfo}
        onFixGenerated={(fix) => onFixGenerated?.(action.id, fix)}
      />
    </div>
  );
};

export default SemanticActionCard;
```

**Step 2: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/ui/SemanticActionCard.tsx
git commit -m "feat: add SemanticActionCard with category badges and Smart Fix"
```

---

## Task 7: Create Semantic Analysis Panel Component

**Files:**
- Create: `components/ui/SemanticAnalysisPanel.tsx`

**Step 1: Create the main panel component**

```typescript
// components/ui/SemanticAnalysisPanel.tsx
// Full semantic analysis display with all sections

import React from 'react';
import { SemanticAuditResult, BusinessInfo } from '../../types';
import { CoreEntityBoxes } from './CoreEntityBoxes';
import { SemanticActionCard } from './SemanticActionCard';
import { SimpleMarkdown } from './SimpleMarkdown';

interface SemanticAnalysisPanelProps {
  result: SemanticAuditResult;
  pageContent: string;
  businessInfo: BusinessInfo;
  onActionFixGenerated?: (actionId: string, fix: string) => void;
}

export const SemanticAnalysisPanel: React.FC<SemanticAnalysisPanelProps> = ({
  result,
  pageContent,
  businessInfo,
  onActionFixGenerated,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Needs Optimization';
    return 'Critical Issues';
  };

  const lowHanging = result.actions.filter(a => a.category === 'Low Hanging Fruit');
  const midTerm = result.actions.filter(a => a.category === 'Mid Term');
  const longTerm = result.actions.filter(a => a.category === 'Long Term');

  return (
    <div className="space-y-6">
      {/* Core Entities */}
      <CoreEntityBoxes entities={result.coreEntities} />

      {/* Score Card */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-blue-500/30">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className={`text-4xl font-bold ${getScoreColor(result.overallScore)}`}>
              Semantic Score: {result.overallScore}/100
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Based on Koray Tugberk GUBUR's Framework
            </p>
          </div>
          <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            result.overallScore >= 80 ? 'bg-green-500/20 text-green-400' :
            result.overallScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {getScoreLabel(result.overallScore)}
          </span>
        </div>
        <div className="border-t border-gray-700 pt-4">
          <SimpleMarkdown content={result.summary} />
        </div>
      </div>

      {/* Macro/Micro Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Macro Analysis */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🌐</span> Macro-Semantics (Structure)
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="text-sky-400 text-sm font-medium mb-2">Contextual Vector & Linearity</h4>
              <div className="text-gray-300 text-sm">
                <SimpleMarkdown content={result.macroAnalysis.contextualVector} />
              </div>
            </div>

            <div>
              <h4 className="text-sky-400 text-sm font-medium mb-2">Hierarchy & Heading Order</h4>
              <div className="text-gray-300 text-sm">
                <SimpleMarkdown content={result.macroAnalysis.hierarchy} />
              </div>
            </div>

            <div>
              <h4 className="text-sky-400 text-sm font-medium mb-2">Source Context & Branding</h4>
              <div className="text-gray-300 text-sm">
                <SimpleMarkdown content={result.macroAnalysis.sourceContext} />
              </div>
            </div>
          </div>
        </div>

        {/* Micro Analysis */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔬</span> Micro-Semantics (Linguistics)
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="text-purple-400 text-sm font-medium mb-2">Sentence Structure & Modality</h4>
              <div className="text-gray-300 text-sm">
                <SimpleMarkdown content={result.microAnalysis.sentenceStructure} />
              </div>
            </div>

            <div>
              <h4 className="text-purple-400 text-sm font-medium mb-2">Information Density & Facts</h4>
              <div className="text-gray-300 text-sm">
                <SimpleMarkdown content={result.microAnalysis.informationDensity} />
              </div>
            </div>

            <div>
              <h4 className="text-purple-400 text-sm font-medium mb-2">HTML Semantics & Lists</h4>
              <div className="text-gray-300 text-sm">
                <SimpleMarkdown content={result.microAnalysis.htmlSemantics} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Plan */}
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Action Plan & Roadmap</h2>
        <p className="text-gray-400 text-sm mb-6">
          Prioritized list of changes. Click "Get Smart Fix" for AI implementation help.
        </p>

        {/* Phase 1: Low Hanging Fruit */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🍏</span>
            <h3 className="text-lg font-semibold text-green-400">
              Phase 1: Low Hanging Fruit (Immediate)
            </h3>
          </div>
          {lowHanging.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowHanging.map(action => (
                <SemanticActionCard
                  key={action.id}
                  action={action}
                  pageContent={pageContent}
                  businessInfo={businessInfo}
                  onFixGenerated={onActionFixGenerated}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No immediate issues found. Good job!</p>
          )}
        </div>

        {/* Phase 2: Mid Term */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏗️</span>
            <h3 className="text-lg font-semibold text-yellow-400">
              Phase 2: Mid-Term (Structure & Linguistics)
            </h3>
          </div>
          {midTerm.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {midTerm.map(action => (
                <SemanticActionCard
                  key={action.id}
                  action={action}
                  pageContent={pageContent}
                  businessInfo={businessInfo}
                  onFixGenerated={onActionFixGenerated}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No mid-term structural changes required.</p>
          )}
        </div>

        {/* Phase 3: Long Term */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏛️</span>
            <h3 className="text-lg font-semibold text-blue-400">
              Phase 3: Long-Term (Strategic & Technical)
            </h3>
          </div>
          {longTerm.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {longTerm.map(action => (
                <SemanticActionCard
                  key={action.id}
                  action={action}
                  pageContent={pageContent}
                  businessInfo={businessInfo}
                  onFixGenerated={onActionFixGenerated}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No long-term strategic changes suggested.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SemanticAnalysisPanel;
```

**Step 2: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/ui/SemanticAnalysisPanel.tsx
git commit -m "feat: add SemanticAnalysisPanel with full Macro/Micro display"
```

---

## Task 8: Create useSemanticAnalysis Hook

**Files:**
- Create: `hooks/useSemanticAnalysis.ts`

**Step 1: Create the hook**

```typescript
// hooks/useSemanticAnalysis.ts
// React hook for managing semantic analysis state

import { useState, useCallback } from 'react';
import { SemanticAuditResult, BusinessInfo } from '../types';
import { analyzePageSemantics } from '../services/ai/semanticAnalysis';

interface UseSemanticAnalysisReturn {
  result: SemanticAuditResult | null;
  isAnalyzing: boolean;
  error: string | null;
  analyze: (content: string, url: string) => Promise<void>;
  reset: () => void;
  updateActionFix: (actionId: string, fix: string) => void;
}

export const useSemanticAnalysis = (businessInfo: BusinessInfo): UseSemanticAnalysisReturn => {
  const [result, setResult] = useState<SemanticAuditResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (content: string, url: string) => {
    if (!content.trim()) {
      setError('No content provided for analysis');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await analyzePageSemantics(content, url, businessInfo);
      setResult(analysisResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      console.error('Semantic analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [businessInfo]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsAnalyzing(false);
  }, []);

  const updateActionFix = useCallback((actionId: string, fix: string) => {
    setResult(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        actions: prev.actions.map(a =>
          a.id === actionId ? { ...a, smartFix: fix } : a
        ),
      };
    });
  }, []);

  return {
    result,
    isAnalyzing,
    error,
    analyze,
    reset,
    updateActionFix,
  };
};

export default useSemanticAnalysis;
```

**Step 2: Verify hook compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add hooks/useSemanticAnalysis.ts
git commit -m "feat: add useSemanticAnalysis hook for state management"
```

---

## Task 9: Add Semantic Analysis Tab to PageAuditDetailV2

**Files:**
- Modify: `components/site-analysis/PageAuditDetailV2.tsx`

**Step 1: Add imports at top of file**

Add after existing imports (around line 14):

```typescript
import { useSemanticAnalysis } from '../../hooks/useSemanticAnalysis';
import { SemanticAnalysisPanel } from '../ui/SemanticAnalysisPanel';
```

**Step 2: Add semantic analysis state inside component**

Add after `const [showReportModal, setShowReportModal] = useState(false);` (around line 59):

```typescript
  // Semantic Analysis Hook
  const {
    result: semanticResult,
    isAnalyzing: isAnalyzingSemantic,
    error: semanticError,
    analyze: runSemanticAnalysis,
    updateActionFix,
  } = useSemanticAnalysis(state.businessInfo);
```

**Step 3: Update activeTab type to include 'semantic_ai'**

Change line 51 from:
```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'semantic' | 'links' | 'content' | 'schema' | 'tasks' | 'raw_data'>('overview');
```

To:
```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'semantic' | 'semantic_ai' | 'links' | 'content' | 'schema' | 'tasks' | 'raw_data'>('overview');
```

**Step 4: Add 'semantic_ai' to tab navigation**

In the tabs nav (around line 592), change the map array from:
```typescript
{['overview', 'technical', 'semantic', 'links', 'content', 'schema', 'tasks', 'raw_data'].map(tab => (
```

To:
```typescript
{['overview', 'technical', 'semantic', 'semantic_ai', 'links', 'content', 'schema', 'tasks', 'raw_data'].map(tab => (
```

**Step 5: Add tab label mapping**

Add before the return statement (around line 489):

```typescript
  const getTabLabel = (tab: string) => {
    if (tab === 'semantic_ai') return 'AI Semantic';
    if (tab === 'raw_data') return 'Raw Data';
    return tab.charAt(0).toUpperCase() + tab.slice(1);
  };
```

Update the tab button text to use this function.

**Step 6: Add semantic_ai tab content**

Add after the `semantic` tab content block (around line 656), before `{activeTab === 'links'`:

```typescript
        {activeTab === 'semantic_ai' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">AI Semantic Analysis</h3>
                <p className="text-sm text-gray-400">Macro & Micro semantics framework analysis</p>
              </div>
              <button
                onClick={() => {
                  if (page?.contentMarkdown) {
                    runSemanticAnalysis(page.contentMarkdown, page.url);
                  }
                }}
                disabled={isAnalyzingSemantic || !page?.contentMarkdown}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 disabled:opacity-50 flex items-center gap-2"
              >
                {isAnalyzingSemantic ? (
                  <>
                    <span className="animate-spin">⚙️</span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <span>🔬</span>
                    {semanticResult ? 'Re-analyze' : 'Run Analysis'}
                  </>
                )}
              </button>
            </div>

            {semanticError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                {semanticError}
              </div>
            )}

            {!semanticResult && !isAnalyzingSemantic && !semanticError && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-4">🔬</p>
                <p>Click "Run Analysis" to analyze this page's semantic structure</p>
                {!page?.contentMarkdown && (
                  <p className="text-sm mt-2 text-yellow-400">
                    Note: Page content must be extracted first
                  </p>
                )}
              </div>
            )}

            {semanticResult && page && (
              <SemanticAnalysisPanel
                result={semanticResult}
                pageContent={page.contentMarkdown || ''}
                businessInfo={state.businessInfo}
                onActionFixGenerated={updateActionFix}
              />
            )}
          </div>
        )}
```

**Step 7: Verify changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add components/site-analysis/PageAuditDetailV2.tsx
git commit -m "feat: add AI Semantic Analysis tab to page audit view"
```

---

## Task 10: Add Semantic Analysis to Migration Workbench

**Files:**
- Modify: `components/migration/MigrationWorkbenchModal.tsx`

**Step 1: Add imports**

Add after existing imports (around line 14):

```typescript
import { useSemanticAnalysis } from '../../hooks/useSemanticAnalysis';
import { SemanticAnalysisPanel } from '../ui/SemanticAnalysisPanel';
import { CoreEntityBoxes } from '../ui/CoreEntityBoxes';
```

**Step 2: Add semantic analysis hook inside component**

Add after `const { chunks, isChunking, error: chunkError, analyzeContent } = useChunking(businessInfo);` (around line 49):

```typescript
    // Semantic Analysis Hook
    const {
        result: semanticResult,
        isAnalyzing: isAnalyzingSemantic,
        error: semanticError,
        analyze: runSemanticAnalysis,
        updateActionFix,
    } = useSemanticAnalysis(businessInfo);
```

**Step 3: Add 'semantic' to activeLeftTab type**

Change line 42 from:
```typescript
const [activeLeftTab, setActiveLeftTab] = useState<'raw' | 'chunks'>('raw');
```

To:
```typescript
const [activeLeftTab, setActiveLeftTab] = useState<'raw' | 'chunks' | 'semantic'>('raw');
```

**Step 4: Add semantic tab button in left panel**

Find the tab buttons in the left panel (around line 228-241) and add a third button:

```typescript
<button
    onClick={() => setActiveLeftTab('semantic')}
    className={`px-3 py-1 text-xs rounded ${activeLeftTab === 'semantic' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
    disabled={!!loadError}
>
    Semantic Audit
</button>
```

**Step 5: Add semantic tab content**

Add after the chunks tab content (around line 304), before the closing `)}`:

```typescript
) : activeLeftTab === 'semantic' ? (
    <div className="h-full overflow-y-auto">
        {!semanticResult && !isAnalyzingSemantic && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <p className="text-4xl mb-4">🔬</p>
                <p className="text-gray-400 mb-4">Run AI semantic analysis to audit this page's structure</p>
                <button
                    onClick={() => {
                        if (originalContent) {
                            runSemanticAnalysis(originalContent, inventoryItem?.url || '');
                        }
                    }}
                    disabled={!originalContent || isAnalyzingSemantic}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 disabled:opacity-50"
                >
                    Run Semantic Analysis
                </button>
            </div>
        )}
        {isAnalyzingSemantic && (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader />
                <p className="text-xs text-gray-500 mt-2">Analyzing macro & micro semantics...</p>
            </div>
        )}
        {semanticError && (
            <div className="p-4 text-red-400">{semanticError}</div>
        )}
        {semanticResult && (
            <div className="p-4">
                <CoreEntityBoxes entities={semanticResult.coreEntities} className="mb-4" />
                <div className="text-center p-4 bg-gray-800/50 rounded-lg mb-4">
                    <div className={`text-3xl font-bold ${
                        semanticResult.overallScore >= 70 ? 'text-green-400' :
                        semanticResult.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                        {semanticResult.overallScore}/100
                    </div>
                    <div className="text-sm text-gray-400">Semantic Score</div>
                </div>
                <div className="text-sm text-gray-300">
                    <p className="font-medium text-white mb-2">Summary:</p>
                    <p>{semanticResult.summary}</p>
                </div>
                <div className="mt-4 text-sm">
                    <p className="text-yellow-400">
                        {semanticResult.actions.filter(a => a.category === 'Low Hanging Fruit').length} quick fixes available
                    </p>
                </div>
            </div>
        )}
    </div>
```

**Step 6: Verify changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add components/migration/MigrationWorkbenchModal.tsx
git commit -m "feat: add semantic analysis tab to Migration Workbench"
```

---

## Task 11: Export New Components from Index Files

**Files:**
- Modify: `services/ai/index.ts`
- Modify: `hooks/useSemanticAnalysis.ts` (verify export)

**Step 1: Add export to services/ai/index.ts**

Add to the exports:

```typescript
export * from './semanticAnalysis';
```

**Step 2: Verify all exports work**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add services/ai/index.ts
git commit -m "feat: export semantic analysis service from AI index"
```

---

## Task 12: Final Integration Test

**Step 1: Start development server**

Run: `npm run dev`
Expected: Server starts without errors

**Step 2: Manual test checklist**

1. Navigate to Site Analysis → Select a page → Click "AI Semantic" tab
2. Click "Run Analysis" button
3. Verify Core Entity boxes appear
4. Verify Semantic Score card appears
5. Verify Macro/Micro analysis grids appear
6. Verify Action Plan with 3 phases appears
7. Click "Get Smart Fix" on an action item
8. Verify AI-generated fix appears inline

**Step 3: Test Migration Workbench**

1. Navigate to Migration Workbench
2. Open a page
3. Click "Semantic Audit" tab
4. Run analysis
5. Verify score and summary appear

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete semantic audit integration with AI analysis"
```

---

## Summary of Created/Modified Files

### New Files Created:
1. `config/semanticFramework.ts` - Framework constants and prompt templates
2. `services/ai/semanticAnalysis.ts` - AI-powered analysis service
3. `components/ui/CoreEntityBoxes.tsx` - Entity display component
4. `components/ui/SmartFixButton.tsx` - Inline fix button component
5. `components/ui/SemanticActionCard.tsx` - Action card with Smart Fix
6. `components/ui/SemanticAnalysisPanel.tsx` - Full analysis display
7. `hooks/useSemanticAnalysis.ts` - State management hook

### Modified Files:
1. `types.ts` - Added semantic analysis types
2. `components/site-analysis/PageAuditDetailV2.tsx` - Added AI Semantic tab
3. `components/migration/MigrationWorkbenchModal.tsx` - Added semantic tab
4. `services/ai/index.ts` - Added export

---

Plan complete and saved to `docs/plans/2025-12-04-semantic-audit-integration.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
