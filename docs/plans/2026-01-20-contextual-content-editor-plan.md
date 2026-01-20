# Contextual Content Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to select text in the article preview, right-click to access AI-powered editing and image generation actions that follow Semantic SEO rules.

**Architecture:** Hybrid UI (floating menu + expandable panel), service-based AI integration with context analysis, session-based undo with consolidated versioning on save.

**Tech Stack:** React 18, TypeScript, TailwindCSS, existing AI service layer (Gemini/OpenAI/Anthropic), Supabase for persistence.

**Design Doc:** `docs/plans/2026-01-20-contextual-content-editor-design.md`

---

## Phase 1: Types & Data Structures

### Task 1.1: Create Contextual Editor Types

**Files:**
- Create: `types/contextualEditor.ts`

**Step 1: Create the types file**

```typescript
// types/contextualEditor.ts
// Contextual Content Editor Types

import { SemanticTriple } from '../types';

// ============================================================================
// CONTEXT ANALYSIS TYPES
// ============================================================================

export type IssueType = 'contradiction' | 'missing_service' | 'seo_violation' | 'factual_concern' | 'readability';
export type IssueSeverity = 'error' | 'warning' | 'suggestion';

export interface ContextIssue {
  type: IssueType;
  description: string;
  severity: IssueSeverity;
  suggestedFix?: string;
}

export interface ContextSuggestion {
  action: string;
  description: string;
  confidence: number;
}

export interface SemanticContext {
  relatedSections: string[];
  relevantEavs: SemanticTriple[];
  mentionedServices: string[];
}

export interface ContextAnalysis {
  issues: ContextIssue[];
  suggestions: ContextSuggestion[];
  semanticContext: SemanticContext;
  isLoading: boolean;
  error?: string;
}

// ============================================================================
// REWRITE TYPES
// ============================================================================

export type EditScope = 'selection' | 'sentence' | 'paragraph' | 'section';

export type QuickAction =
  | 'fix_accuracy'
  | 'remove_service'
  | 'fix_grammar'
  | 'improve_flow'
  | 'simplify'
  | 'expand_detail'
  | 'change_tone_formal'
  | 'change_tone_casual'
  | 'change_tone_persuasive'
  | 'seo_optimize'
  | 'custom';

export interface RewriteRequest {
  selectedText: string;
  surroundingContext: string;
  sectionKey: string;
  action: QuickAction;
  customInstruction?: string;
  forceNarrowScope?: boolean;
}

export interface RewriteResult {
  originalText: string;
  rewrittenText: string;
  scopeExpanded: boolean;
  expandedTo: EditScope;
  expandReason?: string;
  changesDescription: string;
  affectedHeading?: string;
  wordCountDelta: number;
  complianceScore: number;
}

// ============================================================================
// IMAGE PROMPT TYPES
// ============================================================================

export type ImageStyle = 'photograph' | 'illustration' | 'diagram' | 'infographic';
export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4';
export type ImagePlacement = 'before_heading' | 'after_paragraph' | 'inline';

export interface ImagePromptRequest {
  contextText: string;
  sectionHeading: string;
  articleTitle: string;
}

export interface PlacementSuggestion {
  position: ImagePlacement;
  rationale: string;
  sectionKey: string;
}

export interface ImagePromptResult {
  prompt: string;
  suggestedStyle: ImageStyle;
  suggestedAspectRatio: AspectRatio;
  altTextSuggestion: string;
  placementSuggestion: PlacementSuggestion;
}

// ============================================================================
// SESSION EDIT TYPES
// ============================================================================

export interface SessionEdit {
  id: string;
  timestamp: Date;
  type: 'text_rewrite' | 'image_insert';
  sectionKey: string;

  // For text rewrites
  originalText?: string;
  newText?: string;
  selectionStart?: number;
  selectionEnd?: number;
  instruction?: string;

  // For image inserts
  imageId?: string;
  insertPosition?: number;

  // For undo
  undone: boolean;
}

export interface EditSession {
  edits: SessionEdit[];
  currentIndex: number;
}

// ============================================================================
// TEXT SELECTION TYPES
// ============================================================================

export interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  sectionKey: string;
  rect: DOMRect;
}

// ============================================================================
// EDITOR STATE TYPES
// ============================================================================

export type EditorMode = 'idle' | 'menu' | 'panel_text' | 'panel_image' | 'preview';
export type PanelTab = 'corrections' | 'rewrites' | 'seo' | 'custom';

export interface ContextualEditorState {
  mode: EditorMode;
  selection: TextSelection | null;
  analysis: ContextAnalysis | null;
  rewriteResult: RewriteResult | null;
  imagePromptResult: ImagePromptResult | null;
  activeTab: PanelTab;
  isProcessing: boolean;
  error: string | null;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export type AiSuggestionVisibility = 'always' | 'on_request' | 'never';
export type ScopeConfirmation = 'always' | 'smart' | 'never';

export interface ContentEditorSettings {
  imagePlacementConfirmation: boolean;
  showAiAnalysisSuggestions: AiSuggestionVisibility;
  rewriteScopeConfirmation: ScopeConfirmation;
  preferredImageProvider: 'dalle3' | 'gemini' | 'markupgo';
  autoSaveAfterEdits: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: ContentEditorSettings = {
  imagePlacementConfirmation: false,
  showAiAnalysisSuggestions: 'always',
  rewriteScopeConfirmation: 'smart',
  preferredImageProvider: 'dalle3',
  autoSaveAfterEdits: false,
};
```

**Step 2: Run TypeScript compiler to verify types**

Run: `npx tsc types/contextualEditor.ts --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add types/contextualEditor.ts
git commit -m "feat(contextual-editor): add type definitions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.2: Export Types from Main Index

**Files:**
- Modify: `types.ts` (add export)

**Step 1: Add export to types.ts**

At the end of the file, add:

```typescript
// Contextual Editor Types
export * from './types/contextualEditor';
```

**Step 2: Verify export works**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add types.ts
git commit -m "feat(contextual-editor): export types from main index

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: AI Services

### Task 2.1: Create Context Analyzer Service

**Files:**
- Create: `services/ai/contextualEditing/contextAnalyzer.ts`
- Test: `services/ai/contextualEditing/__tests__/contextAnalyzer.test.ts`

**Step 1: Create test file**

```typescript
// services/ai/contextualEditing/__tests__/contextAnalyzer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { analyzeContext, extractServicesFromBusinessInfo, findContradictions } from '../contextAnalyzer';
import { BusinessInfo, ContentBrief, SemanticTriple } from '../../../../types';

describe('contextAnalyzer', () => {
  describe('extractServicesFromBusinessInfo', () => {
    it('extracts services from offerings array', () => {
      const businessInfo: Partial<BusinessInfo> = {
        offerings: ['Web Design', 'SEO Services', 'Content Marketing'],
      };

      const services = extractServicesFromBusinessInfo(businessInfo as BusinessInfo);

      expect(services).toContain('web design');
      expect(services).toContain('seo services');
      expect(services).toContain('content marketing');
    });

    it('returns empty array when no offerings', () => {
      const businessInfo: Partial<BusinessInfo> = {};
      const services = extractServicesFromBusinessInfo(businessInfo as BusinessInfo);
      expect(services).toEqual([]);
    });
  });

  describe('findContradictions', () => {
    it('detects service mention not in offerings', () => {
      const selectedText = 'We offer premium asbestos removal services';
      const fullArticle = 'Full article content here';
      const services = ['cleaning', 'renovation'];

      const issues = findContradictions(selectedText, fullArticle, services);

      expect(issues.some(i => i.type === 'missing_service')).toBe(true);
    });

    it('returns empty array when service exists', () => {
      const selectedText = 'We offer premium cleaning services';
      const services = ['cleaning', 'renovation'];

      const issues = findContradictions(selectedText, '', services);

      expect(issues.filter(i => i.type === 'missing_service')).toHaveLength(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/ai/contextualEditing/__tests__/contextAnalyzer.test.ts`
Expected: FAIL - module not found

**Step 3: Create the service directory and file**

```typescript
// services/ai/contextualEditing/contextAnalyzer.ts
/**
 * Context Analyzer Service
 *
 * Analyzes selected text against full article context, business info,
 * and EAV facts to detect issues and provide suggestions.
 */

import { BusinessInfo, ContentBrief, SemanticTriple } from '../../../types';
import {
  ContextAnalysis,
  ContextIssue,
  ContextSuggestion,
  SemanticContext,
  IssueType,
  IssueSeverity,
} from '../../../types/contextualEditor';

// Fluff words from algorithmic authorship rules
const FLUFF_WORDS = [
  'actually', 'basically', 'really', 'very', 'quite', 'rather', 'somewhat',
  'overall', 'in conclusion', 'as stated before', 'it goes without saying',
  'needless to say', 'at the end of the day', 'in my opinion',
  'i had the pleasure of', 'it is important to note that',
];

// Generic AI phrases to avoid
const AI_PHRASES = [
  'in today\'s world', 'it\'s important to note', 'firstly', 'secondly',
  'furthermore', 'moreover', 'in this article', 'as we all know',
];

/**
 * Extract normalized service names from business info
 */
export function extractServicesFromBusinessInfo(businessInfo: BusinessInfo): string[] {
  if (!businessInfo?.offerings || !Array.isArray(businessInfo.offerings)) {
    return [];
  }
  return businessInfo.offerings.map(s => s.toLowerCase().trim());
}

/**
 * Find potential contradictions or issues in selected text
 */
export function findContradictions(
  selectedText: string,
  fullArticle: string,
  knownServices: string[]
): ContextIssue[] {
  const issues: ContextIssue[] = [];
  const lowerText = selectedText.toLowerCase();

  // Check for service mentions not in known services
  // Common service-related keywords
  const serviceKeywords = ['service', 'offer', 'provide', 'specialize'];
  const hasServiceMention = serviceKeywords.some(kw => lowerText.includes(kw));

  if (hasServiceMention && knownServices.length > 0) {
    // Extract potential service names (simple heuristic)
    const words = lowerText.split(/\s+/);
    const potentialServices = words.filter(w =>
      w.length > 4 && !serviceKeywords.includes(w)
    );

    // Check if any potential service is not in known services
    for (const potential of potentialServices) {
      const matchesKnown = knownServices.some(known =>
        known.includes(potential) || potential.includes(known.split(' ')[0])
      );
      if (!matchesKnown && potential.length > 5) {
        // This is a heuristic - might need refinement
        // Only flag if it looks like a service name
        const looksLikeService = /removal|cleaning|installation|repair|maintenance|consulting/i.test(potential);
        if (looksLikeService) {
          issues.push({
            type: 'missing_service',
            description: `Mentions "${potential}" which may not be in your service offerings`,
            severity: 'warning',
            suggestedFix: 'Verify this service is offered or remove the mention',
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Check for SEO violations based on algorithmic authorship rules
 */
export function checkSeoViolations(text: string): ContextIssue[] {
  const issues: ContextIssue[] = [];
  const lowerText = text.toLowerCase();

  // Check for fluff words
  for (const fluff of FLUFF_WORDS) {
    if (lowerText.includes(fluff)) {
      issues.push({
        type: 'seo_violation',
        description: `Contains fluff phrase "${fluff}" - reduces information density`,
        severity: 'suggestion',
        suggestedFix: `Remove "${fluff}" and state the fact directly`,
      });
    }
  }

  // Check for generic AI phrases
  for (const phrase of AI_PHRASES) {
    if (lowerText.includes(phrase)) {
      issues.push({
        type: 'seo_violation',
        description: `Contains generic AI phrase "${phrase}"`,
        severity: 'warning',
        suggestedFix: 'Rephrase to be more specific and natural',
      });
    }
  }

  // Check sentence length (>30 words is too long per algorithmic authorship)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  for (const sentence of sentences) {
    const wordCount = sentence.trim().split(/\s+/).length;
    if (wordCount > 30) {
      issues.push({
        type: 'readability',
        description: `Sentence has ${wordCount} words (max recommended: 30)`,
        severity: 'suggestion',
        suggestedFix: 'Split into shorter sentences with clear S-P-O structure',
      });
    }
  }

  return issues;
}

/**
 * Find relevant EAVs that apply to the selected text
 */
export function findRelevantEavs(
  selectedText: string,
  eavs: SemanticTriple[]
): SemanticTriple[] {
  if (!eavs || eavs.length === 0) return [];

  const lowerText = selectedText.toLowerCase();

  return eavs.filter(eav => {
    const entityMatch = eav.entity && lowerText.includes(eav.entity.toLowerCase());
    const valueMatch = eav.value && lowerText.includes(eav.value.toLowerCase());
    return entityMatch || valueMatch;
  });
}

/**
 * Generate smart suggestions based on detected issues
 */
export function generateSuggestions(
  issues: ContextIssue[],
  selectedText: string
): ContextSuggestion[] {
  const suggestions: ContextSuggestion[] = [];

  // Group issues by type
  const issuesByType = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as Record<IssueType, number>);

  if (issuesByType.readability > 0) {
    suggestions.push({
      action: 'simplify',
      description: 'Simplify for better readability (shorter sentences, clearer structure)',
      confidence: 0.8,
    });
  }

  if (issuesByType.seo_violation > 0) {
    suggestions.push({
      action: 'seo_optimize',
      description: 'Remove fluff words and optimize for search engines',
      confidence: 0.9,
    });
  }

  if (issuesByType.missing_service > 0) {
    suggestions.push({
      action: 'remove_service',
      description: 'Remove or correct service mentions not in your offerings',
      confidence: 0.7,
    });
  }

  return suggestions;
}

/**
 * Main analysis function - combines all checks
 */
export async function analyzeContext(params: {
  selectedText: string;
  fullArticle: string;
  businessInfo: BusinessInfo;
  brief: ContentBrief;
  eavs: SemanticTriple[];
}): Promise<ContextAnalysis> {
  const { selectedText, fullArticle, businessInfo, brief, eavs } = params;

  // Extract known services
  const knownServices = extractServicesFromBusinessInfo(businessInfo);

  // Run all checks
  const contradictionIssues = findContradictions(selectedText, fullArticle, knownServices);
  const seoIssues = checkSeoViolations(selectedText);

  // Combine issues
  const allIssues = [...contradictionIssues, ...seoIssues];

  // Find relevant EAVs
  const relevantEavs = findRelevantEavs(selectedText, eavs);

  // Generate suggestions
  const suggestions = generateSuggestions(allIssues, selectedText);

  // Build semantic context
  const semanticContext: SemanticContext = {
    relatedSections: [], // Could be enhanced to find related sections
    relevantEavs,
    mentionedServices: knownServices.filter(s =>
      selectedText.toLowerCase().includes(s)
    ),
  };

  return {
    issues: allIssues,
    suggestions,
    semanticContext,
    isLoading: false,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- services/ai/contextualEditing/__tests__/contextAnalyzer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contextualEditing/
git commit -m "feat(contextual-editor): add context analyzer service

Analyzes selected text for:
- Service mentions not in business offerings
- SEO violations (fluff words, AI phrases)
- Readability issues (sentence length)
- Relevant EAV facts

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.2: Create Text Rewriter Service

**Files:**
- Create: `services/ai/contextualEditing/textRewriter.ts`
- Test: `services/ai/contextualEditing/__tests__/textRewriter.test.ts`

**Step 1: Create test file**

```typescript
// services/ai/contextualEditing/__tests__/textRewriter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { buildRewritePrompt, detectOptimalScope, shouldUseInlineDiff } from '../textRewriter';
import { QuickAction } from '../../../../types/contextualEditor';

describe('textRewriter', () => {
  describe('buildRewritePrompt', () => {
    it('includes algorithmic authorship rules', () => {
      const prompt = buildRewritePrompt({
        selectedText: 'Test text',
        action: 'improve_flow',
        surroundingContext: 'Before. Test text. After.',
      });

      expect(prompt).toContain('S-P-O');
      expect(prompt).toContain('one fact per sentence');
    });

    it('includes custom instruction when provided', () => {
      const prompt = buildRewritePrompt({
        selectedText: 'Test text',
        action: 'custom',
        customInstruction: 'Make it sound more local to Breda',
        surroundingContext: '',
      });

      expect(prompt).toContain('Make it sound more local to Breda');
    });
  });

  describe('detectOptimalScope', () => {
    it('returns selection for grammar fixes', () => {
      const scope = detectOptimalScope('fix_grammar', 'Just a typo here.');
      expect(scope).toBe('selection');
    });

    it('returns paragraph for flow improvements', () => {
      const scope = detectOptimalScope('improve_flow', 'Multiple sentences. That need flow.');
      expect(scope).toBe('paragraph');
    });

    it('returns section for tone changes', () => {
      const scope = detectOptimalScope('change_tone_formal', 'Any text here.');
      expect(scope).toBe('section');
    });
  });

  describe('shouldUseInlineDiff', () => {
    it('returns true for small changes', () => {
      const original = 'This is a short sentence.';
      const rewritten = 'This is a brief sentence.';
      expect(shouldUseInlineDiff(original, rewritten)).toBe(true);
    });

    it('returns false for large changes', () => {
      const original = 'Short.';
      const rewritten = 'This is now a much longer piece of text that has been significantly expanded with many more words and details that were not present in the original version of the text.';
      expect(shouldUseInlineDiff(original, rewritten)).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/ai/contextualEditing/__tests__/textRewriter.test.ts`
Expected: FAIL - module not found

**Step 3: Create the service**

```typescript
// services/ai/contextualEditing/textRewriter.ts
/**
 * Text Rewriter Service
 *
 * Generates AI-powered text rewrites following Semantic SEO
 * algorithmic authorship rules.
 */

import { generateContent } from '../../aiService';
import { BusinessInfo, ContentBrief, SemanticTriple } from '../../../types';
import {
  RewriteRequest,
  RewriteResult,
  QuickAction,
  EditScope,
} from '../../../types/contextualEditor';

// Algorithmic authorship rules to include in prompts
const ALGORITHMIC_AUTHORSHIP_RULES = `
## Writing Rules (Algorithmic Authorship)

Follow these rules strictly:

1. **S-P-O Structure**: Every sentence must have clear Subject-Predicate-Object structure.
   - Correct: "The iPhone 15 weighs 171 grams."
   - Incorrect: "At 171 grams, the weight of the iPhone 15 is something users appreciate."

2. **One fact per sentence**: Each sentence delivers one unique EAV (Entity-Attribute-Value) triple.

3. **Short sentences**: Maximum 30 words per sentence. Keep dependency trees short.

4. **Explicit entity naming**: Avoid ambiguous pronouns. Name entities explicitly.
   - Correct: "Einstein received the Nobel Prize. Einstein developed relativity."
   - Incorrect: "Einstein received the Nobel Prize. He developed relativity."

5. **Important terms first**: Place the most important terms early in sentences.

6. **No fluff words**: Remove: actually, basically, really, very, quite, rather, somewhat, overall, in conclusion.

7. **No generic AI phrases**: Avoid: "in today's world", "it's important to note", "firstly/secondly", "furthermore".

8. **Proper modality**:
   - Use "is/are" for established facts
   - Use "can/may" for possibilities
   - Use "should/must" for recommendations

9. **Specific values**: Replace vague terms ("many", "some") with exact numbers when possible.

10. **Direct answers**: Answer questions immediately without preamble.
`;

/**
 * Map quick actions to human-readable instructions
 */
const ACTION_INSTRUCTIONS: Record<QuickAction, string> = {
  fix_accuracy: 'Fix any factual inaccuracies. Ensure claims are accurate and verifiable.',
  remove_service: 'Remove or rephrase mentions of services that may not be offered. Keep the meaning but remove specific service claims.',
  fix_grammar: 'Fix grammar, spelling, and punctuation errors. Keep the meaning unchanged.',
  improve_flow: 'Improve the flow and readability. Ensure smooth transitions between sentences.',
  simplify: 'Simplify the text. Use shorter sentences and simpler words while preserving meaning.',
  expand_detail: 'Expand with more specific details and facts. Add concrete EAV triples.',
  change_tone_formal: 'Rewrite in a more formal, professional tone.',
  change_tone_casual: 'Rewrite in a more casual, conversational tone.',
  change_tone_persuasive: 'Rewrite to be more persuasive and action-oriented.',
  seo_optimize: 'Optimize for SEO. Ensure clear S-P-O structure, remove fluff, add specific facts.',
  custom: '', // Custom instruction provided separately
};

/**
 * Build the rewrite prompt including all rules
 */
export function buildRewritePrompt(params: {
  selectedText: string;
  action: QuickAction;
  customInstruction?: string;
  surroundingContext: string;
  businessInfo?: BusinessInfo;
  eavs?: SemanticTriple[];
}): string {
  const { selectedText, action, customInstruction, surroundingContext, businessInfo, eavs } = params;

  const instruction = action === 'custom' && customInstruction
    ? customInstruction
    : ACTION_INSTRUCTIONS[action];

  let prompt = `You are an expert content editor following Semantic SEO principles.

${ALGORITHMIC_AUTHORSHIP_RULES}

## Task

Rewrite the following text according to this instruction:
**${instruction}**

## Text to Rewrite

"${selectedText}"

## Surrounding Context (for reference, do not modify)

${surroundingContext}
`;

  if (businessInfo?.offerings && businessInfo.offerings.length > 0) {
    prompt += `
## Business Services (only mention these)

${businessInfo.offerings.join(', ')}
`;
  }

  if (eavs && eavs.length > 0) {
    prompt += `
## Relevant Facts (EAVs) to incorporate if appropriate

${eavs.slice(0, 5).map(e => `- ${e.entity} → ${e.attribute} → ${e.value}`).join('\n')}
`;
  }

  prompt += `
## Output Format

Respond with ONLY the rewritten text. No explanations, no quotes, no markdown formatting around the text itself.
Keep the same general length unless expanding/simplifying was requested.
`;

  return prompt;
}

/**
 * Detect the optimal scope for the edit based on action type
 */
export function detectOptimalScope(action: QuickAction, selectedText: string): EditScope {
  // Grammar/accuracy fixes usually stay narrow
  if (['fix_grammar', 'fix_accuracy'].includes(action)) {
    return 'selection';
  }

  // Flow improvements need paragraph context
  if (['improve_flow', 'simplify', 'expand_detail'].includes(action)) {
    return 'paragraph';
  }

  // Tone changes often affect the whole section
  if (action.startsWith('change_tone_')) {
    return 'section';
  }

  // SEO optimization benefits from section context
  if (action === 'seo_optimize') {
    return 'paragraph';
  }

  // Default to sentence
  return 'sentence';
}

/**
 * Determine if inline diff should be used vs panel preview
 */
export function shouldUseInlineDiff(original: string, rewritten: string): boolean {
  const originalWords = original.split(/\s+/).length;
  const rewrittenWords = rewritten.split(/\s+/).length;
  const wordCountChange = Math.abs(originalWords - rewrittenWords);
  const characterChange = Math.abs(original.length - rewritten.length);

  // Use inline diff for small changes (< 50 word change, < 300 char change)
  return wordCountChange < 50 && characterChange < 300;
}

/**
 * Calculate simple compliance score based on rules
 */
function calculateComplianceScore(text: string): number {
  let score = 100;

  // Check sentence length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  for (const sentence of sentences) {
    if (sentence.split(/\s+/).length > 30) {
      score -= 5;
    }
  }

  // Check for fluff words
  const fluffWords = ['actually', 'basically', 'really', 'very', 'quite', 'overall'];
  for (const fluff of fluffWords) {
    if (text.toLowerCase().includes(fluff)) {
      score -= 3;
    }
  }

  return Math.max(0, score);
}

/**
 * Main rewrite function
 */
export async function rewriteText(params: {
  request: RewriteRequest;
  fullArticle: string;
  businessInfo: BusinessInfo;
  brief: ContentBrief;
  eavs: SemanticTriple[];
  modelId?: string;
}): Promise<RewriteResult> {
  const { request, fullArticle, businessInfo, brief, eavs, modelId } = params;

  // Detect optimal scope
  const optimalScope = detectOptimalScope(request.action, request.selectedText);
  const actualScope = request.forceNarrowScope ? 'selection' : optimalScope;

  // Build prompt
  const prompt = buildRewritePrompt({
    selectedText: request.selectedText,
    action: request.action,
    customInstruction: request.customInstruction,
    surroundingContext: request.surroundingContext,
    businessInfo,
    eavs,
  });

  // Call AI service
  const rewrittenText = await generateContent(
    prompt,
    modelId || 'gemini-1.5-flash',
    { temperature: 0.3 } // Lower temperature for more consistent rewrites
  );

  // Calculate metrics
  const originalWords = request.selectedText.split(/\s+/).length;
  const newWords = rewrittenText.split(/\s+/).length;

  return {
    originalText: request.selectedText,
    rewrittenText: rewrittenText.trim(),
    scopeExpanded: actualScope !== 'selection',
    expandedTo: actualScope,
    expandReason: actualScope !== 'selection'
      ? `"${request.action}" works better with ${actualScope} context`
      : undefined,
    changesDescription: `Rewrote text using "${request.action}" action`,
    affectedHeading: undefined, // Could be enhanced to detect header changes
    wordCountDelta: newWords - originalWords,
    complianceScore: calculateComplianceScore(rewrittenText),
  };
}
```

**Step 4: Run tests**

Run: `npm test -- services/ai/contextualEditing/__tests__/textRewriter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contextualEditing/textRewriter.ts services/ai/contextualEditing/__tests__/textRewriter.test.ts
git commit -m "feat(contextual-editor): add text rewriter service

Implements AI-powered text rewriting with:
- Algorithmic authorship rules embedded in prompts
- Quick action mappings to instructions
- Optimal scope detection per action type
- Inline diff vs panel preview decision logic
- Compliance scoring

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.3: Create Image Prompt Generator Service

**Files:**
- Create: `services/ai/contextualEditing/imagePromptGenerator.ts`
- Test: `services/ai/contextualEditing/__tests__/imagePromptGenerator.test.ts`

**Step 1: Create test file**

```typescript
// services/ai/contextualEditing/__tests__/imagePromptGenerator.test.ts
import { describe, it, expect } from 'vitest';
import {
  suggestImageStyle,
  suggestAspectRatio,
  generateAltText,
  determinePlacement
} from '../imagePromptGenerator';

describe('imagePromptGenerator', () => {
  describe('suggestImageStyle', () => {
    it('suggests diagram for how-to content', () => {
      const style = suggestImageStyle('How to install a heat pump step by step');
      expect(style).toBe('diagram');
    });

    it('suggests photograph for location content', () => {
      const style = suggestImageStyle('Our office in Breda city center');
      expect(style).toBe('photograph');
    });

    it('suggests infographic for data/statistics', () => {
      const style = suggestImageStyle('Energy savings statistics show 40% reduction');
      expect(style).toBe('infographic');
    });
  });

  describe('suggestAspectRatio', () => {
    it('suggests 16:9 for hero/banner images', () => {
      const ratio = suggestAspectRatio('hero');
      expect(ratio).toBe('16:9');
    });

    it('suggests 4:3 for content images', () => {
      const ratio = suggestAspectRatio('content');
      expect(ratio).toBe('4:3');
    });
  });

  describe('generateAltText', () => {
    it('includes key entities from context', () => {
      const alt = generateAltText(
        'Professional heat pump installation in Breda',
        'Heat Pump Installation Services'
      );
      expect(alt.toLowerCase()).toContain('heat pump');
      expect(alt.toLowerCase()).toContain('breda');
    });
  });

  describe('determinePlacement', () => {
    it('places after paragraph by default', () => {
      const placement = determinePlacement('Some content text', 'section-1');
      expect(placement.position).toBe('after_paragraph');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/ai/contextualEditing/__tests__/imagePromptGenerator.test.ts`
Expected: FAIL

**Step 3: Create the service**

```typescript
// services/ai/contextualEditing/imagePromptGenerator.ts
/**
 * Image Prompt Generator Service
 *
 * Generates optimal image prompts from selected context text,
 * following Visual Semantics rules for SEO.
 */

import { generateContent } from '../../aiService';
import { BusinessInfo } from '../../../types';
import {
  ImagePromptRequest,
  ImagePromptResult,
  ImageStyle,
  AspectRatio,
  PlacementSuggestion,
} from '../../../types/contextualEditor';

/**
 * Suggest image style based on content analysis
 */
export function suggestImageStyle(contextText: string): ImageStyle {
  const lower = contextText.toLowerCase();

  // How-to/process content -> diagram
  if (/how to|step|process|install|guide|tutorial/i.test(lower)) {
    return 'diagram';
  }

  // Data/statistics content -> infographic
  if (/statistics|data|percent|%|comparison|chart|graph/i.test(lower)) {
    return 'infographic';
  }

  // Location/physical content -> photograph
  if (/office|location|building|team|staff|city|region/i.test(lower)) {
    return 'photograph';
  }

  // Concept/abstract content -> illustration
  if (/concept|idea|strategy|approach|method|benefit/i.test(lower)) {
    return 'illustration';
  }

  // Default to photograph (most versatile)
  return 'photograph';
}

/**
 * Suggest aspect ratio based on image type
 */
export function suggestAspectRatio(imageType: 'hero' | 'content' | 'inline'): AspectRatio {
  switch (imageType) {
    case 'hero':
      return '16:9';
    case 'content':
      return '4:3';
    case 'inline':
      return '1:1';
    default:
      return '4:3';
  }
}

/**
 * Generate SEO-optimized alt text from context
 * Alt text should extend vocabulary with entity names and attributes
 */
export function generateAltText(contextText: string, sectionHeading: string): string {
  // Extract key phrases (simple heuristic)
  const words = contextText.split(/\s+/);
  const keyPhrases: string[] = [];

  // Look for noun phrases (capitalized words, common patterns)
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i];
    const nextWord = words[i + 1];

    // Capitalized noun phrase
    if (/^[A-Z]/.test(word) && word.length > 2) {
      if (/^[A-Z]/.test(nextWord)) {
        keyPhrases.push(`${word} ${nextWord}`);
        i++; // Skip next word
      } else {
        keyPhrases.push(word);
      }
    }
  }

  // Also include heading context
  const headingWords = sectionHeading.replace(/[^\w\s]/g, '').split(/\s+/);

  // Combine unique phrases
  const allPhrases = [...new Set([...keyPhrases.slice(0, 3), ...headingWords.slice(0, 2)])];

  // Build alt text
  const altText = allPhrases.join(' - ').toLowerCase();

  return altText || 'image related to ' + sectionHeading.toLowerCase();
}

/**
 * Determine optimal image placement based on Visual Semantics rules
 */
export function determinePlacement(
  contextText: string,
  sectionKey: string
): PlacementSuggestion {
  // Default placement is after the paragraph for context association
  return {
    position: 'after_paragraph',
    rationale: 'Placed after paragraph to associate image with preceding text context',
    sectionKey,
  };
}

/**
 * Build the image prompt using AI
 */
async function buildImagePrompt(params: {
  contextText: string;
  sectionHeading: string;
  articleTitle: string;
  style: ImageStyle;
  businessInfo?: BusinessInfo;
}): Promise<string> {
  const { contextText, sectionHeading, articleTitle, style, businessInfo } = params;

  const systemPrompt = `You are an expert at creating image generation prompts for SEO content.

Your task is to create a detailed, specific prompt for generating a ${style} that:
1. Directly relates to the content context
2. Adds visual value without being generic
3. Avoids copyrighted characters, logos, or trademarked content
4. Is appropriate for professional/business content

Context from the article:
"${contextText}"

Section: ${sectionHeading}
Article: ${articleTitle}
${businessInfo?.name ? `Business: ${businessInfo.name}` : ''}
${businessInfo?.location ? `Location: ${businessInfo.location}` : ''}

Generate a single, detailed prompt (50-100 words) for creating this ${style}.
Focus on specific visual elements, composition, and style.
Do not include any explanations, just the prompt.`;

  const result = await generateContent(
    systemPrompt,
    'gemini-1.5-flash',
    { temperature: 0.7 }
  );

  return result.trim();
}

/**
 * Main function to generate complete image prompt result
 */
export async function generateImagePrompt(params: {
  request: ImagePromptRequest;
  businessInfo?: BusinessInfo;
  imageType?: 'hero' | 'content' | 'inline';
}): Promise<ImagePromptResult> {
  const { request, businessInfo, imageType = 'content' } = params;

  // Determine style and aspect ratio
  const suggestedStyle = suggestImageStyle(request.contextText);
  const suggestedAspectRatio = suggestAspectRatio(imageType);

  // Generate the prompt using AI
  const prompt = await buildImagePrompt({
    contextText: request.contextText,
    sectionHeading: request.sectionHeading,
    articleTitle: request.articleTitle,
    style: suggestedStyle,
    businessInfo,
  });

  // Generate alt text
  const altTextSuggestion = generateAltText(request.contextText, request.sectionHeading);

  // Determine placement
  const placementSuggestion = determinePlacement(
    request.contextText,
    'current-section' // Would be passed from context
  );

  return {
    prompt,
    suggestedStyle,
    suggestedAspectRatio,
    altTextSuggestion,
    placementSuggestion,
  };
}
```

**Step 4: Run tests**

Run: `npm test -- services/ai/contextualEditing/__tests__/imagePromptGenerator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contextualEditing/imagePromptGenerator.ts services/ai/contextualEditing/__tests__/imagePromptGenerator.test.ts
git commit -m "feat(contextual-editor): add image prompt generator service

Generates contextual image prompts with:
- Style detection (diagram, photograph, infographic, illustration)
- Aspect ratio suggestions
- SEO-optimized alt text generation
- Visual Semantics placement rules

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.4: Create Service Index

**Files:**
- Create: `services/ai/contextualEditing/index.ts`

**Step 1: Create the index file**

```typescript
// services/ai/contextualEditing/index.ts
/**
 * Contextual Editing Services
 *
 * AI-powered text editing and image generation for the article draft workspace.
 */

export { analyzeContext, extractServicesFromBusinessInfo, findContradictions, checkSeoViolations } from './contextAnalyzer';
export { rewriteText, buildRewritePrompt, detectOptimalScope, shouldUseInlineDiff } from './textRewriter';
export { generateImagePrompt, suggestImageStyle, suggestAspectRatio, generateAltText, determinePlacement } from './imagePromptGenerator';
```

**Step 2: Verify exports work**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add services/ai/contextualEditing/index.ts
git commit -m "feat(contextual-editor): add service index exports

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: React Hooks

### Task 3.1: Create Text Selection Hook

**Files:**
- Create: `hooks/useTextSelection.ts`

**Step 1: Create the hook**

```typescript
// hooks/useTextSelection.ts
/**
 * useTextSelection Hook
 *
 * Tracks text selection within the article preview area.
 * Provides selection text, position, and section context.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TextSelection } from '../types/contextualEditor';

interface UseTextSelectionOptions {
  containerRef: React.RefObject<HTMLElement>;
  debounceMs?: number;
  minSelectionLength?: number;
}

interface UseTextSelectionReturn {
  selection: TextSelection | null;
  clearSelection: () => void;
  isSelecting: boolean;
}

export function useTextSelection(options: UseTextSelectionOptions): UseTextSelectionReturn {
  const { containerRef, debounceMs = 300, minSelectionLength = 3 } = options;

  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const handleSelectionChange = useCallback(() => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsSelecting(true);

    debounceRef.current = setTimeout(() => {
      setIsSelecting(false);

      const windowSelection = window.getSelection();
      if (!windowSelection || windowSelection.isCollapsed) {
        setSelection(null);
        return;
      }

      const text = windowSelection.toString().trim();
      if (text.length < minSelectionLength) {
        setSelection(null);
        return;
      }

      // Check if selection is within our container
      const container = containerRef.current;
      if (!container) {
        setSelection(null);
        return;
      }

      const range = windowSelection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;

      // Verify selection is within container
      if (!container.contains(commonAncestor)) {
        setSelection(null);
        return;
      }

      // Get the bounding rect for positioning the context menu
      const rect = range.getBoundingClientRect();

      // Try to find the section key from data attributes
      let sectionKey = 'unknown';
      let element: HTMLElement | null = commonAncestor as HTMLElement;
      while (element && element !== container) {
        if (element.dataset?.sectionKey) {
          sectionKey = element.dataset.sectionKey;
          break;
        }
        element = element.parentElement;
      }

      setSelection({
        text,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        sectionKey,
        rect,
      });
    }, debounceMs);
  }, [containerRef, debounceMs, minSelectionLength]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [handleSelectionChange]);

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(e.target as Node)) {
        clearSelection();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [containerRef, clearSelection]);

  return {
    selection,
    clearSelection,
    isSelecting,
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc hooks/useTextSelection.ts --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add hooks/useTextSelection.ts
git commit -m "feat(contextual-editor): add useTextSelection hook

Tracks text selection with:
- Debounced selection change detection
- Container boundary checking
- Section key extraction from data attributes
- Bounding rect for menu positioning

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.2: Create Edit Session Hook

**Files:**
- Create: `hooks/useEditSession.ts`

**Step 1: Create the hook**

```typescript
// hooks/useEditSession.ts
/**
 * useEditSession Hook
 *
 * Manages the session edit stack for granular undo/redo.
 * Edits are consolidated into version_history on save.
 */

import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SessionEdit, EditSession } from '../types/contextualEditor';

interface UseEditSessionReturn {
  session: EditSession;
  addEdit: (edit: Omit<SessionEdit, 'id' | 'timestamp' | 'undone'>) => void;
  undo: () => SessionEdit | null;
  redo: () => SessionEdit | null;
  canUndo: boolean;
  canRedo: boolean;
  clearSession: () => void;
  getActiveEdits: () => SessionEdit[];
  getEditCount: () => number;
}

export function useEditSession(): UseEditSessionReturn {
  const [session, setSession] = useState<EditSession>({
    edits: [],
    currentIndex: -1,
  });

  const addEdit = useCallback((edit: Omit<SessionEdit, 'id' | 'timestamp' | 'undone'>) => {
    setSession(prev => {
      // Remove any redoable edits (edits after currentIndex)
      const activeEdits = prev.edits.slice(0, prev.currentIndex + 1);

      const newEdit: SessionEdit = {
        ...edit,
        id: uuidv4(),
        timestamp: new Date(),
        undone: false,
      };

      return {
        edits: [...activeEdits, newEdit],
        currentIndex: activeEdits.length, // Point to new edit
      };
    });
  }, []);

  const undo = useCallback((): SessionEdit | null => {
    let undoneEdit: SessionEdit | null = null;

    setSession(prev => {
      if (prev.currentIndex < 0) return prev;

      const editToUndo = prev.edits[prev.currentIndex];
      undoneEdit = editToUndo;

      // Mark as undone
      const updatedEdits = [...prev.edits];
      updatedEdits[prev.currentIndex] = { ...editToUndo, undone: true };

      return {
        edits: updatedEdits,
        currentIndex: prev.currentIndex - 1,
      };
    });

    return undoneEdit;
  }, []);

  const redo = useCallback((): SessionEdit | null => {
    let redoneEdit: SessionEdit | null = null;

    setSession(prev => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.edits.length) return prev;

      const editToRedo = prev.edits[nextIndex];
      redoneEdit = editToRedo;

      // Mark as not undone
      const updatedEdits = [...prev.edits];
      updatedEdits[nextIndex] = { ...editToRedo, undone: false };

      return {
        edits: updatedEdits,
        currentIndex: nextIndex,
      };
    });

    return redoneEdit;
  }, []);

  const clearSession = useCallback(() => {
    setSession({
      edits: [],
      currentIndex: -1,
    });
  }, []);

  const getActiveEdits = useCallback((): SessionEdit[] => {
    return session.edits.filter(e => !e.undone);
  }, [session.edits]);

  const getEditCount = useCallback((): number => {
    return session.edits.filter(e => !e.undone).length;
  }, [session.edits]);

  const canUndo = useMemo(() => session.currentIndex >= 0, [session.currentIndex]);
  const canRedo = useMemo(() => session.currentIndex < session.edits.length - 1, [session.currentIndex, session.edits.length]);

  return {
    session,
    addEdit,
    undo,
    redo,
    canUndo,
    canRedo,
    clearSession,
    getActiveEdits,
    getEditCount,
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc hooks/useEditSession.ts --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add hooks/useEditSession.ts
git commit -m "feat(contextual-editor): add useEditSession hook

Manages session edit stack with:
- Add/undo/redo operations
- Edit history tracking
- Active edits filtering
- Session clearing for save consolidation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.3: Create Contextual Editor Hook

**Files:**
- Create: `hooks/useContextualEditor.ts`

**Step 1: Create the hook**

```typescript
// hooks/useContextualEditor.ts
/**
 * useContextualEditor Hook
 *
 * Main orchestrating hook for the contextual content editor.
 * Combines text selection, AI analysis, rewriting, and edit session management.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { BusinessInfo, ContentBrief, SemanticTriple } from '../types';
import {
  TextSelection,
  ContextAnalysis,
  RewriteResult,
  ImagePromptResult,
  QuickAction,
  EditorMode,
  PanelTab,
  ContextualEditorState,
  ContentEditorSettings,
  DEFAULT_EDITOR_SETTINGS,
} from '../types/contextualEditor';
import { useTextSelection } from './useTextSelection';
import { useEditSession } from './useEditSession';
import { analyzeContext, rewriteText, generateImagePrompt } from '../services/ai/contextualEditing';

interface UseContextualEditorOptions {
  containerRef: React.RefObject<HTMLElement>;
  fullArticle: string;
  businessInfo: BusinessInfo;
  brief: ContentBrief;
  eavs: SemanticTriple[];
  settings?: ContentEditorSettings;
  onContentChange?: (newContent: string, sectionKey: string) => void;
}

interface UseContextualEditorReturn {
  // State
  state: ContextualEditorState;
  selection: TextSelection | null;

  // Actions
  openMenu: () => void;
  closeMenu: () => void;
  openTextPanel: () => void;
  openImagePanel: () => void;
  closePanel: () => void;

  // Quick actions
  executeQuickAction: (action: QuickAction, customInstruction?: string) => Promise<void>;

  // Rewrite controls
  acceptRewrite: () => void;
  rejectRewrite: () => void;
  retryRewrite: () => Promise<void>;

  // Image generation
  generateImage: () => Promise<void>;
  acceptImage: () => void;
  rejectImage: () => void;

  // Edit session
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  editCount: number;

  // Settings
  setActiveTab: (tab: PanelTab) => void;
}

export function useContextualEditor(options: UseContextualEditorOptions): UseContextualEditorReturn {
  const {
    containerRef,
    fullArticle,
    businessInfo,
    brief,
    eavs,
    settings = DEFAULT_EDITOR_SETTINGS,
    onContentChange,
  } = options;

  // Text selection tracking
  const { selection, clearSelection, isSelecting } = useTextSelection({ containerRef });

  // Edit session management
  const editSession = useEditSession();

  // Editor state
  const [state, setState] = useState<ContextualEditorState>({
    mode: 'idle',
    selection: null,
    analysis: null,
    rewriteResult: null,
    imagePromptResult: null,
    activeTab: 'corrections',
    isProcessing: false,
    error: null,
  });

  // Track last action for retry
  const lastActionRef = useRef<{ action: QuickAction; instruction?: string } | null>(null);

  // Update selection in state
  useEffect(() => {
    setState(prev => ({ ...prev, selection }));
  }, [selection]);

  // Auto-analyze when selection changes (if setting enabled)
  useEffect(() => {
    if (!selection || settings.showAiAnalysisSuggestions === 'never') return;
    if (settings.showAiAnalysisSuggestions === 'on_request') return;

    // Debounced analysis
    const timer = setTimeout(async () => {
      try {
        const analysis = await analyzeContext({
          selectedText: selection.text,
          fullArticle,
          businessInfo,
          brief,
          eavs,
        });
        setState(prev => ({ ...prev, analysis }));
      } catch (error) {
        console.error('Context analysis failed:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [selection, fullArticle, businessInfo, brief, eavs, settings.showAiAnalysisSuggestions]);

  // Mode controls
  const openMenu = useCallback(() => {
    if (selection) {
      setState(prev => ({ ...prev, mode: 'menu' }));
    }
  }, [selection]);

  const closeMenu = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'idle', rewriteResult: null, imagePromptResult: null }));
    clearSelection();
  }, [clearSelection]);

  const openTextPanel = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'panel_text' }));
  }, []);

  const openImagePanel = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'panel_image' }));
  }, []);

  const closePanel = useCallback(() => {
    setState(prev => ({ ...prev, mode: selection ? 'menu' : 'idle' }));
  }, [selection]);

  const setActiveTab = useCallback((tab: PanelTab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // Execute a quick action
  const executeQuickAction = useCallback(async (action: QuickAction, customInstruction?: string) => {
    if (!selection) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    lastActionRef.current = { action, instruction: customInstruction };

    try {
      const result = await rewriteText({
        request: {
          selectedText: selection.text,
          surroundingContext: '', // Would need to extract from DOM
          sectionKey: selection.sectionKey,
          action,
          customInstruction,
        },
        fullArticle,
        businessInfo,
        brief,
        eavs,
      });

      setState(prev => ({
        ...prev,
        rewriteResult: result,
        mode: 'preview',
        isProcessing: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Rewrite failed',
        isProcessing: false,
      }));
    }
  }, [selection, fullArticle, businessInfo, brief, eavs]);

  // Accept rewrite
  const acceptRewrite = useCallback(() => {
    if (!state.rewriteResult || !selection) return;

    // Add to edit session
    editSession.addEdit({
      type: 'text_rewrite',
      sectionKey: selection.sectionKey,
      originalText: state.rewriteResult.originalText,
      newText: state.rewriteResult.rewrittenText,
      selectionStart: selection.startOffset,
      selectionEnd: selection.endOffset,
      instruction: lastActionRef.current?.action,
    });

    // Notify parent of content change
    if (onContentChange) {
      onContentChange(state.rewriteResult.rewrittenText, selection.sectionKey);
    }

    // Reset state
    setState(prev => ({
      ...prev,
      mode: 'idle',
      rewriteResult: null,
    }));
    clearSelection();
  }, [state.rewriteResult, selection, editSession, onContentChange, clearSelection]);

  // Reject rewrite
  const rejectRewrite = useCallback(() => {
    setState(prev => ({
      ...prev,
      mode: selection ? 'menu' : 'idle',
      rewriteResult: null,
    }));
  }, [selection]);

  // Retry rewrite
  const retryRewrite = useCallback(async () => {
    if (!lastActionRef.current) return;
    await executeQuickAction(lastActionRef.current.action, lastActionRef.current.instruction);
  }, [executeQuickAction]);

  // Image generation
  const generateImage = useCallback(async () => {
    if (!selection) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const result = await generateImagePrompt({
        request: {
          contextText: selection.text,
          sectionHeading: '', // Would need to extract
          articleTitle: brief?.title || '',
        },
        businessInfo,
      });

      setState(prev => ({
        ...prev,
        imagePromptResult: result,
        isProcessing: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Image prompt generation failed',
        isProcessing: false,
      }));
    }
  }, [selection, brief, businessInfo]);

  const acceptImage = useCallback(() => {
    // Would integrate with existing image generation modal
    // Add to edit session
    if (state.imagePromptResult && selection) {
      editSession.addEdit({
        type: 'image_insert',
        sectionKey: selection.sectionKey,
        // imageId would come from actual generation
      });
    }

    setState(prev => ({
      ...prev,
      mode: 'idle',
      imagePromptResult: null,
    }));
    clearSelection();
  }, [state.imagePromptResult, selection, editSession, clearSelection]);

  const rejectImage = useCallback(() => {
    setState(prev => ({
      ...prev,
      imagePromptResult: null,
    }));
  }, []);

  // Undo/Redo wrappers
  const undo = useCallback(() => {
    const edit = editSession.undo();
    if (edit && edit.type === 'text_rewrite' && edit.originalText && onContentChange) {
      onContentChange(edit.originalText, edit.sectionKey);
    }
  }, [editSession, onContentChange]);

  const redo = useCallback(() => {
    const edit = editSession.redo();
    if (edit && edit.type === 'text_rewrite' && edit.newText && onContentChange) {
      onContentChange(edit.newText, edit.sectionKey);
    }
  }, [editSession, onContentChange]);

  return {
    state,
    selection,
    openMenu,
    closeMenu,
    openTextPanel,
    openImagePanel,
    closePanel,
    executeQuickAction,
    acceptRewrite,
    rejectRewrite,
    retryRewrite,
    generateImage,
    acceptImage,
    rejectImage,
    undo,
    redo,
    canUndo: editSession.canUndo,
    canRedo: editSession.canRedo,
    editCount: editSession.getEditCount(),
    setActiveTab,
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc hooks/useContextualEditor.ts --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add hooks/useContextualEditor.ts
git commit -m "feat(contextual-editor): add main useContextualEditor hook

Orchestrates:
- Text selection tracking
- Auto context analysis
- AI rewrite execution
- Image prompt generation
- Edit session management
- Undo/redo support

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: UI Components

### Task 4.1: Create Context Menu Component

**Files:**
- Create: `components/contextualEditor/ContextMenu.tsx`

**Step 1: Create the component**

```typescript
// components/contextualEditor/ContextMenu.tsx
/**
 * Floating context menu for quick actions on selected text.
 */

import React, { useEffect, useRef, useState } from 'react';
import { TextSelection, QuickAction, ContextAnalysis } from '../../types/contextualEditor';
import { Button } from '../ui/Button';

interface ContextMenuProps {
  selection: TextSelection;
  analysis: ContextAnalysis | null;
  onQuickAction: (action: QuickAction) => void;
  onMoreOptions: () => void;
  onGenerateImage: () => void;
  onClose: () => void;
  isProcessing: boolean;
}

const QUICK_ACTIONS: { action: QuickAction; icon: string; label: string; tooltip: string }[] = [
  { action: 'fix_accuracy', icon: '✓', label: 'Fix', tooltip: 'Fix accuracy' },
  { action: 'fix_grammar', icon: 'Aa', label: 'Grammar', tooltip: 'Fix grammar' },
  { action: 'improve_flow', icon: '↝', label: 'Flow', tooltip: 'Improve flow' },
  { action: 'simplify', icon: '−', label: 'Simplify', tooltip: 'Simplify' },
  { action: 'seo_optimize', icon: '◎', label: 'SEO', tooltip: 'SEO optimize' },
];

export const ContextMenu: React.FC<ContextMenuProps> = ({
  selection,
  analysis,
  onQuickAction,
  onMoreOptions,
  onGenerateImage,
  onClose,
  isProcessing,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Position the menu above or below selection
  useEffect(() => {
    if (!selection?.rect) return;

    const rect = selection.rect;
    const menuHeight = 48; // Approximate menu height
    const padding = 8;

    // Prefer above, fallback to below if not enough space
    let top = rect.top - menuHeight - padding;
    if (top < 10) {
      top = rect.bottom + padding;
    }

    // Center horizontally on selection
    let left = rect.left + (rect.width / 2);

    // Keep within viewport
    const viewportWidth = window.innerWidth;
    const menuWidth = 400; // Approximate
    if (left - menuWidth / 2 < 10) {
      left = menuWidth / 2 + 10;
    } else if (left + menuWidth / 2 > viewportWidth - 10) {
      left = viewportWidth - menuWidth / 2 - 10;
    }

    setPosition({ top, left });
  }, [selection]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to avoid immediate close on selection
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Show smart suggestion badge if analysis found issues
  const hasIssues = analysis && analysis.issues.length > 0;
  const topSuggestion = analysis?.suggestions[0];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-1 flex items-center gap-1"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Quick action buttons */}
      {QUICK_ACTIONS.map(({ action, icon, label, tooltip }) => (
        <button
          key={action}
          onClick={() => onQuickAction(action)}
          disabled={isProcessing}
          className="px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
          title={tooltip}
        >
          <span className="mr-1">{icon}</span>
          {label}
        </button>
      ))}

      {/* Divider */}
      <div className="w-px h-6 bg-slate-600 mx-1" />

      {/* Image generation */}
      <button
        onClick={onGenerateImage}
        disabled={isProcessing}
        className="px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
        title="Generate image from context"
      >
        🖼️ Image
      </button>

      {/* More options */}
      <button
        onClick={onMoreOptions}
        disabled={isProcessing}
        className="px-2 py-1.5 text-xs font-medium text-blue-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
        title="More options"
      >
        More ▾
      </button>

      {/* Smart suggestion indicator */}
      {hasIssues && topSuggestion && (
        <div className="ml-1 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-300">
          💡 {topSuggestion.action}
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="ml-2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc components/contextualEditor/ContextMenu.tsx --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/contextualEditor/ContextMenu.tsx
git commit -m "feat(contextual-editor): add floating context menu component

Features:
- Quick action buttons (Fix, Grammar, Flow, Simplify, SEO)
- Image generation button
- More options expansion
- Smart suggestion indicator from AI analysis
- Auto-positioning above/below selection
- Escape/click-outside to close

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4.2: Create Inline Diff Component

**Files:**
- Create: `components/contextualEditor/InlineDiff.tsx`

**Step 1: Create the component**

```typescript
// components/contextualEditor/InlineDiff.tsx
/**
 * Inline diff display showing old text (strikethrough) and new text (highlighted).
 */

import React from 'react';
import { RewriteResult } from '../../types/contextualEditor';

interface InlineDiffProps {
  result: RewriteResult;
  onAccept: () => void;
  onReject: () => void;
  onRetry: () => void;
}

export const InlineDiff: React.FC<InlineDiffProps> = ({
  result,
  onAccept,
  onReject,
  onRetry,
}) => {
  const { originalText, rewrittenText, changesDescription, complianceScore } = result;

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-300">
          {changesDescription}
        </span>
        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
          Score: {complianceScore}%
        </span>
      </div>

      {/* Diff display */}
      <div className="text-sm leading-relaxed mb-4">
        {/* Original - strikethrough red */}
        <span className="line-through text-red-400 bg-red-500/10 px-1 rounded">
          {originalText}
        </span>

        {/* Arrow */}
        <span className="mx-2 text-slate-500">→</span>

        {/* New - highlighted green */}
        <span className="text-green-400 bg-green-500/10 px-1 rounded">
          {rewrittenText}
        </span>
      </div>

      {/* Word count delta */}
      {result.wordCountDelta !== 0 && (
        <div className="text-xs text-slate-400 mb-3">
          {result.wordCountDelta > 0 ? '+' : ''}{result.wordCountDelta} words
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAccept}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded transition-colors"
        >
          Accept
        </button>
        <button
          onClick={onReject}
          className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded transition-colors"
        >
          Reject
        </button>
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
        >
          ↻ Try Again
        </button>
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add components/contextualEditor/InlineDiff.tsx
git commit -m "feat(contextual-editor): add inline diff component

Shows:
- Original text with strikethrough
- New text with highlight
- Compliance score
- Word count delta
- Accept/Reject/Retry actions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4.3: Create Editor Panel Component

**Files:**
- Create: `components/contextualEditor/EditorPanel.tsx`

**Step 1: Create the component**

```typescript
// components/contextualEditor/EditorPanel.tsx
/**
 * Expanded side panel for full editing capabilities.
 */

import React, { useState } from 'react';
import {
  TextSelection,
  ContextAnalysis,
  RewriteResult,
  ImagePromptResult,
  QuickAction,
  PanelTab,
} from '../../types/contextualEditor';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

interface EditorPanelProps {
  selection: TextSelection;
  analysis: ContextAnalysis | null;
  rewriteResult: RewriteResult | null;
  imagePromptResult: ImagePromptResult | null;
  activeTab: PanelTab;
  isProcessing: boolean;
  onTabChange: (tab: PanelTab) => void;
  onQuickAction: (action: QuickAction, customInstruction?: string) => void;
  onAcceptRewrite: () => void;
  onRejectRewrite: () => void;
  onRetryRewrite: () => void;
  onClose: () => void;
}

const TAB_CONFIG: { id: PanelTab; label: string }[] = [
  { id: 'corrections', label: 'Corrections' },
  { id: 'rewrites', label: 'Rewrites' },
  { id: 'seo', label: 'SEO' },
  { id: 'custom', label: 'Custom' },
];

const TAB_ACTIONS: Record<PanelTab, { action: QuickAction; label: string }[]> = {
  corrections: [
    { action: 'fix_accuracy', label: 'Fix inaccuracies' },
    { action: 'remove_service', label: 'Remove unverified service' },
    { action: 'fix_grammar', label: 'Fix grammar/spelling' },
  ],
  rewrites: [
    { action: 'improve_flow', label: 'Improve readability' },
    { action: 'simplify', label: 'Simplify text' },
    { action: 'expand_detail', label: 'Add more detail' },
  ],
  seo: [
    { action: 'seo_optimize', label: 'Full SEO optimization' },
  ],
  custom: [],
};

export const EditorPanel: React.FC<EditorPanelProps> = ({
  selection,
  analysis,
  rewriteResult,
  imagePromptResult,
  activeTab,
  isProcessing,
  onTabChange,
  onQuickAction,
  onAcceptRewrite,
  onRejectRewrite,
  onRetryRewrite,
  onClose,
}) => {
  const [customInstruction, setCustomInstruction] = useState('');

  const handleCustomSubmit = () => {
    if (customInstruction.trim()) {
      onQuickAction('custom', customInstruction);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-slate-800 border-l border-slate-600 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-600 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Edit Content</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Selection preview */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <div className="text-xs text-slate-400 mb-1">Selected text:</div>
        <div className="text-sm text-slate-200 max-h-20 overflow-y-auto">
          "{selection.text.slice(0, 200)}{selection.text.length > 200 ? '...' : ''}"
        </div>
      </div>

      {/* AI Analysis suggestions */}
      {analysis && analysis.issues.length > 0 && (
        <div className="p-4 border-b border-slate-700 bg-amber-500/5">
          <div className="text-xs font-medium text-amber-400 mb-2">💡 AI detected issues:</div>
          <div className="space-y-1">
            {analysis.issues.slice(0, 3).map((issue, i) => (
              <div key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className={`flex-shrink-0 ${
                  issue.severity === 'error' ? 'text-red-400' :
                  issue.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                }`}>
                  {issue.severity === 'error' ? '⚠' : issue.severity === 'warning' ? '!' : '💡'}
                </span>
                <span>{issue.description}</span>
              </div>
            ))}
          </div>
          {analysis.suggestions.length > 0 && (
            <button
              onClick={() => onQuickAction(analysis.suggestions[0].action as QuickAction)}
              disabled={isProcessing}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium disabled:opacity-50"
            >
              Apply suggestion: {analysis.suggestions[0].description}
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab !== 'custom' ? (
          <div className="space-y-2">
            {TAB_ACTIONS[activeTab].map(({ action, label }) => (
              <button
                key={action}
                onClick={() => onQuickAction(action)}
                disabled={isProcessing}
                className="w-full px-4 py-2 text-left text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="Describe how you want the text changed..."
              className="w-full h-32 bg-slate-700 border-slate-600 text-slate-200 text-sm"
            />
            <Button
              onClick={handleCustomSubmit}
              disabled={!customInstruction.trim() || isProcessing}
              className="w-full"
            >
              Apply Custom Edit
            </Button>
          </div>
        )}

        {/* Rewrite result */}
        {rewriteResult && (
          <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-600">
            <div className="text-xs text-slate-400 mb-2">AI Suggestion:</div>
            <div className="text-sm text-slate-200 mb-3 whitespace-pre-wrap">
              {rewriteResult.rewrittenText}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                Score: {rewriteResult.complianceScore}%
              </span>
              {rewriteResult.wordCountDelta !== 0 && (
                <span>
                  {rewriteResult.wordCountDelta > 0 ? '+' : ''}{rewriteResult.wordCountDelta} words
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={onAcceptRewrite} variant="primary" size="sm">
                Accept
              </Button>
              <Button onClick={onRejectRewrite} variant="secondary" size="sm">
                Reject
              </Button>
              <button
                onClick={onRetryRewrite}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                ↻ Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-white">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add components/contextualEditor/EditorPanel.tsx
git commit -m "feat(contextual-editor): add expanded editor panel component

Features:
- Selection preview
- AI analysis suggestions with apply button
- Tabbed interface (Corrections/Rewrites/SEO/Custom)
- Quick action buttons per tab
- Custom instruction textarea
- Rewrite result preview with accept/reject
- Processing overlay

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4.4: Create Component Index

**Files:**
- Create: `components/contextualEditor/index.ts`

**Step 1: Create the index file**

```typescript
// components/contextualEditor/index.ts
export { ContextMenu } from './ContextMenu';
export { InlineDiff } from './InlineDiff';
export { EditorPanel } from './EditorPanel';
```

**Step 2: Commit**

```bash
git add components/contextualEditor/index.ts
git commit -m "feat(contextual-editor): add component index exports

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Integration

### Task 5.1: Integrate into DraftingModal

**Files:**
- Modify: `components/modals/DraftingModal.tsx`

**Step 1: Add imports at top of file**

After existing imports, add:

```typescript
// Contextual Editor
import { useContextualEditor } from '../../hooks/useContextualEditor';
import { ContextMenu, EditorPanel, InlineDiff } from '../contextualEditor';
import { shouldUseInlineDiff } from '../../services/ai/contextualEditing';
```

**Step 2: Add ref for content container**

Inside the component, after other refs, add:

```typescript
// Ref for contextual editor text selection
const contentContainerRef = useRef<HTMLDivElement>(null);
```

**Step 3: Initialize the contextual editor hook**

After other hooks, add:

```typescript
// Contextual editor for text selection and AI editing
const contextualEditor = useContextualEditor({
  containerRef: contentContainerRef,
  fullArticle: draftContent,
  businessInfo,
  brief: brief || {} as ContentBrief,
  eavs: activeMap?.eavs || [],
  onContentChange: (newContent, sectionKey) => {
    // Replace the selected text in draft content
    // This is a simplified implementation - would need more robust text replacement
    setDraftContent(prev => {
      // For now, simple find and replace of the original text
      if (contextualEditor.state.rewriteResult) {
        return prev.replace(
          contextualEditor.state.rewriteResult.originalText,
          newContent
        );
      }
      return prev;
    });
    setHasUnsavedChanges(true);
  },
});
```

**Step 4: Wrap content preview with ref and add contextual editor UI**

In the preview/edit area (inside the tab content for 'preview'), wrap the SimpleMarkdown with a div that has the ref:

```typescript
{/* Content Preview with Contextual Editor */}
<div
  ref={contentContainerRef}
  className="relative"
  onContextMenu={(e) => {
    // Show context menu on right-click if there's a selection
    if (contextualEditor.selection) {
      e.preventDefault();
      contextualEditor.openMenu();
    }
  }}
>
  <SimpleMarkdown content={contentWithImages} />

  {/* Contextual Editor UI */}
  {contextualEditor.selection && contextualEditor.state.mode === 'menu' && (
    <ContextMenu
      selection={contextualEditor.selection}
      analysis={contextualEditor.state.analysis}
      onQuickAction={contextualEditor.executeQuickAction}
      onMoreOptions={contextualEditor.openTextPanel}
      onGenerateImage={() => {
        contextualEditor.openImagePanel();
        contextualEditor.generateImage();
      }}
      onClose={contextualEditor.closeMenu}
      isProcessing={contextualEditor.state.isProcessing}
    />
  )}

  {/* Inline diff for small changes */}
  {contextualEditor.state.mode === 'preview' &&
   contextualEditor.state.rewriteResult &&
   shouldUseInlineDiff(
     contextualEditor.state.rewriteResult.originalText,
     contextualEditor.state.rewriteResult.rewrittenText
   ) && (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <InlineDiff
        result={contextualEditor.state.rewriteResult}
        onAccept={contextualEditor.acceptRewrite}
        onReject={contextualEditor.rejectRewrite}
        onRetry={contextualEditor.retryRewrite}
      />
    </div>
  )}
</div>

{/* Editor Panel for expanded editing */}
{(contextualEditor.state.mode === 'panel_text' ||
  (contextualEditor.state.mode === 'preview' &&
   contextualEditor.state.rewriteResult &&
   !shouldUseInlineDiff(
     contextualEditor.state.rewriteResult.originalText,
     contextualEditor.state.rewriteResult.rewrittenText
   ))) &&
  contextualEditor.selection && (
  <EditorPanel
    selection={contextualEditor.selection}
    analysis={contextualEditor.state.analysis}
    rewriteResult={contextualEditor.state.rewriteResult}
    imagePromptResult={contextualEditor.state.imagePromptResult}
    activeTab={contextualEditor.state.activeTab}
    isProcessing={contextualEditor.state.isProcessing}
    onTabChange={contextualEditor.setActiveTab}
    onQuickAction={contextualEditor.executeQuickAction}
    onAcceptRewrite={contextualEditor.acceptRewrite}
    onRejectRewrite={contextualEditor.rejectRewrite}
    onRetryRewrite={contextualEditor.retryRewrite}
    onClose={contextualEditor.closePanel}
  />
)}
```

**Step 5: Add undo/redo controls to the UI**

In the toolbar area (near other action buttons), add:

```typescript
{/* Undo/Redo for contextual edits */}
{contextualEditor.editCount > 0 && (
  <div className="flex items-center gap-1 mr-4">
    <button
      onClick={contextualEditor.undo}
      disabled={!contextualEditor.canUndo}
      className="px-2 py-1 text-sm text-slate-400 hover:text-white disabled:opacity-30"
      title="Undo (Ctrl+Z)"
    >
      ↩
    </button>
    <button
      onClick={contextualEditor.redo}
      disabled={!contextualEditor.canRedo}
      className="px-2 py-1 text-sm text-slate-400 hover:text-white disabled:opacity-30"
      title="Redo (Ctrl+Y)"
    >
      ↪
    </button>
    <span className="text-xs text-slate-500">
      {contextualEditor.editCount} edit{contextualEditor.editCount !== 1 ? 's' : ''}
    </span>
  </div>
)}
```

**Step 6: Add keyboard shortcuts for undo/redo**

Add useEffect for keyboard shortcuts:

```typescript
// Keyboard shortcuts for contextual editor
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      if (contextualEditor.canUndo) {
        e.preventDefault();
        contextualEditor.undo();
      }
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      if (contextualEditor.canRedo) {
        e.preventDefault();
        contextualEditor.redo();
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [contextualEditor]);
```

**Step 7: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 8: Commit**

```bash
git add components/modals/DraftingModal.tsx
git commit -m "feat(contextual-editor): integrate into DraftingModal

Integration includes:
- Text selection tracking on content preview
- Right-click context menu trigger
- Floating menu with quick actions
- Inline diff for small changes
- Side panel for large rewrites
- Undo/redo controls with keyboard shortcuts
- Edit count indicator

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 6: Image Generation Integration

### Task 6.1: Create Image Generation Panel Component

**Files:**
- Create: `components/contextualEditor/ImageGenerationPanel.tsx`

**Step 1: Create the component**

```typescript
// components/contextualEditor/ImageGenerationPanel.tsx
/**
 * Panel for contextual image generation from selected text.
 */

import React, { useState } from 'react';
import { ImagePromptResult, ImageStyle, AspectRatio } from '../../types/contextualEditor';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

interface ImageGenerationPanelProps {
  promptResult: ImagePromptResult | null;
  isGenerating: boolean;
  onGenerate: (prompt: string, style: ImageStyle, aspectRatio: AspectRatio) => void;
  onAccept: (imageUrl: string, altText: string) => void;
  onReject: () => void;
  onClose: () => void;
  generatedImageUrl?: string;
}

const STYLE_OPTIONS: { value: ImageStyle; label: string }[] = [
  { value: 'photograph', label: 'Photograph' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'infographic', label: 'Infographic' },
];

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: '16:9', label: '16:9 (Wide)' },
  { value: '4:3', label: '4:3 (Standard)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '3:4', label: '3:4 (Portrait)' },
];

export const ImageGenerationPanel: React.FC<ImageGenerationPanelProps> = ({
  promptResult,
  isGenerating,
  onGenerate,
  onAccept,
  onReject,
  onClose,
  generatedImageUrl,
}) => {
  const [editedPrompt, setEditedPrompt] = useState(promptResult?.prompt || '');
  const [style, setStyle] = useState<ImageStyle>(promptResult?.suggestedStyle || 'photograph');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(promptResult?.suggestedAspectRatio || '4:3');
  const [altText, setAltText] = useState(promptResult?.altTextSuggestion || '');

  // Update when promptResult changes
  React.useEffect(() => {
    if (promptResult) {
      setEditedPrompt(promptResult.prompt);
      setStyle(promptResult.suggestedStyle);
      setAspectRatio(promptResult.suggestedAspectRatio);
      setAltText(promptResult.altTextSuggestion);
    }
  }, [promptResult]);

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-slate-800 border-l border-slate-600 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-600 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Generate Image</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Prompt editor */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Image Prompt
          </label>
          <Textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            placeholder="Describe the image..."
            className="w-full h-32 bg-slate-700 border-slate-600 text-slate-200 text-sm"
          />
        </div>

        {/* Style selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setStyle(option.value)}
                className={`px-3 py-2 text-sm rounded transition-colors ${
                  style === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect ratio selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Aspect Ratio
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ASPECT_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setAspectRatio(option.value)}
                className={`px-3 py-2 text-sm rounded transition-colors ${
                  aspectRatio === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={() => onGenerate(editedPrompt, style, aspectRatio)}
          disabled={!editedPrompt.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? 'Generating...' : 'Generate Image'}
        </Button>

        {/* Generated image preview */}
        {generatedImageUrl && (
          <div className="border border-slate-600 rounded-lg overflow-hidden">
            <img
              src={generatedImageUrl}
              alt={altText}
              className="w-full h-auto"
            />

            {/* Alt text editor */}
            <div className="p-3 bg-slate-900">
              <label className="block text-xs text-slate-400 mb-1">Alt Text</label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="w-full px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-slate-200"
              />
            </div>

            {/* Placement info */}
            {promptResult?.placementSuggestion && (
              <div className="px-3 pb-3 bg-slate-900">
                <div className="text-xs text-slate-400">
                  Placement: {promptResult.placementSuggestion.position.replace('_', ' ')}
                </div>
                <div className="text-xs text-slate-500">
                  {promptResult.placementSuggestion.rationale}
                </div>
              </div>
            )}

            {/* Accept/Reject */}
            <div className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
              <Button
                onClick={() => onAccept(generatedImageUrl, altText)}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                Insert Image
              </Button>
              <Button
                onClick={onReject}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isGenerating && (
        <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm">Generating image...</span>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Add to exports**

Update `components/contextualEditor/index.ts`:

```typescript
export { ContextMenu } from './ContextMenu';
export { InlineDiff } from './InlineDiff';
export { EditorPanel } from './EditorPanel';
export { ImageGenerationPanel } from './ImageGenerationPanel';
```

**Step 3: Commit**

```bash
git add components/contextualEditor/ImageGenerationPanel.tsx components/contextualEditor/index.ts
git commit -m "feat(contextual-editor): add image generation panel component

Features:
- Editable AI-generated prompt
- Style selection (photograph, illustration, diagram, infographic)
- Aspect ratio selection
- Generated image preview
- Editable alt text
- Placement suggestion display
- Insert/Cancel actions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 7: Testing & Polish

### Task 7.1: Add Integration Tests

**Files:**
- Create: `services/ai/contextualEditing/__tests__/integration.test.ts`

**Step 1: Create integration test file**

```typescript
// services/ai/contextualEditing/__tests__/integration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeContext } from '../contextAnalyzer';
import { rewriteText, shouldUseInlineDiff } from '../textRewriter';
import { generateImagePrompt } from '../imagePromptGenerator';
import { BusinessInfo, ContentBrief, SemanticTriple } from '../../../../types';

// Mock AI service
vi.mock('../../../aiService', () => ({
  generateContent: vi.fn().mockResolvedValue('Rewritten text following SEO rules.'),
}));

describe('Contextual Editing Integration', () => {
  const mockBusinessInfo: BusinessInfo = {
    name: 'Test Company',
    offerings: ['Web Design', 'SEO Services'],
    location: 'Amsterdam',
  } as BusinessInfo;

  const mockBrief: ContentBrief = {
    title: 'Test Article',
  } as ContentBrief;

  const mockEavs: SemanticTriple[] = [
    { entity: 'Test Company', attribute: 'offers', value: 'Web Design' },
  ];

  describe('Full editing workflow', () => {
    it('analyzes context, detects issues, and generates rewrite', async () => {
      // Step 1: Analyze context
      const analysis = await analyzeContext({
        selectedText: 'We basically offer really great services overall.',
        fullArticle: 'Full article content',
        businessInfo: mockBusinessInfo,
        brief: mockBrief,
        eavs: mockEavs,
      });

      expect(analysis.issues.length).toBeGreaterThan(0);
      expect(analysis.issues.some(i => i.type === 'seo_violation')).toBe(true);

      // Step 2: Generate rewrite
      const result = await rewriteText({
        request: {
          selectedText: 'We basically offer really great services overall.',
          surroundingContext: '',
          sectionKey: 'section-1',
          action: 'seo_optimize',
        },
        fullArticle: 'Full article content',
        businessInfo: mockBusinessInfo,
        brief: mockBrief,
        eavs: mockEavs,
      });

      expect(result.rewrittenText).toBeDefined();
      expect(result.complianceScore).toBeGreaterThanOrEqual(0);
    });

    it('generates image prompt from context', async () => {
      const result = await generateImagePrompt({
        request: {
          contextText: 'Professional web design services in Amsterdam',
          sectionHeading: 'Our Services',
          articleTitle: 'Test Article',
        },
        businessInfo: mockBusinessInfo,
      });

      expect(result.prompt).toBeDefined();
      expect(result.suggestedStyle).toBeDefined();
      expect(result.altTextSuggestion).toBeDefined();
    });
  });

  describe('Smart switching logic', () => {
    it('uses inline diff for small changes', () => {
      const original = 'This is a short sentence.';
      const rewritten = 'This is a brief sentence.';

      expect(shouldUseInlineDiff(original, rewritten)).toBe(true);
    });

    it('uses panel preview for large changes', () => {
      const original = 'Short.';
      const rewritten = 'This is now a much longer piece of text that has been significantly expanded with many more words.';

      expect(shouldUseInlineDiff(original, rewritten)).toBe(false);
    });
  });
});
```

**Step 2: Run tests**

Run: `npm test -- services/ai/contextualEditing/__tests__/integration.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add services/ai/contextualEditing/__tests__/integration.test.ts
git commit -m "test(contextual-editor): add integration tests

Tests cover:
- Full editing workflow (analyze -> rewrite)
- Image prompt generation
- Smart switching logic for inline diff vs panel

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 7.2: Final Build Verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(contextual-editor): complete implementation

Contextual Content Editor feature complete:
- AI-powered text editing from selection
- Context analysis with issue detection
- Quick actions following Semantic SEO rules
- Inline diff for small changes, panel for large
- Session-based undo/redo
- Image prompt generation from context
- Integration with DraftingModal

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This implementation plan covers:

1. **Phase 1**: Types & data structures (2 tasks)
2. **Phase 2**: AI services - context analyzer, text rewriter, image prompt generator (4 tasks)
3. **Phase 3**: React hooks - text selection, edit session, main editor hook (3 tasks)
4. **Phase 4**: UI components - context menu, inline diff, editor panel (4 tasks)
5. **Phase 5**: Integration into DraftingModal (1 task)
6. **Phase 6**: Image generation panel (1 task)
7. **Phase 7**: Testing & polish (2 tasks)

**Total: 17 tasks**

Each task follows TDD principles with test-first development where applicable, small commits, and clear verification steps.
