# Intelligent Dialogue Engine — Design Document

**Date:** 2026-02-24
**Scope:** Strategy (Step 3) + EAV Inventory (Step 4) + Map Planning (Step 5)
**Pattern:** Step-Embedded Inline Dialogue with Forward-Propagating Context

---

## Problem

The pipeline currently operates as "generate-and-dump": AI produces output, user approves or rejects the whole thing. There is no intelligent back-and-forth to validate assumptions, clarify ambiguities, or gather missing business context.

Concrete example: The EAV step shows a "Data Requests" panel with 5 questions (Q1-Q5) but provides **no input fields** to answer them. The approval gate has a checkbox "Data requests answered" with no mechanism to actually answer anything.

Claude Desktop solves this by conducting a focused conversation — presenting findings, asking targeted questions, interpreting answers, and iterating until the context is validated. This design brings that pattern into the pipeline.

---

## Design Decisions (Validated with User)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI placement | Inline within each step | Questions live in the step page, not a side panel or separate chat |
| Question generation | AI-driven dynamic questions | Adapts to actual generated output; no questions if everything is clear |
| Answer processing | AI interprets → shows interpretation → user confirms | The Claude Desktop pattern: interpret, show, validate |
| Gate interaction | Questions come BEFORE approval gate | Gate stamps an already-validated result |
| Scope | Strategy + EAVs + Map Planning | The "business understanding" chain where each step feeds the next |
| Follow-ups | "No" answers get alternatives + custom input | AI suggests alternatives, never dead-ends |
| Cascade detection | Foundational changes trigger downstream warnings | CE change → flag affected EAVs/topics |

---

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `types/dialogue.ts` | TypeScript interfaces for dialogue state |
| `services/ai/dialogueEngine.ts` | AI service: question generation + answer processing + cascade detection |
| `components/pipeline/StepDialogue.tsx` | Reusable inline dialogue UI component |
| `components/pipeline/DialogueQuestion.tsx` | Single question card (choice/text/confirm/multi_text) |
| `components/pipeline/DialogueAnswer.tsx` | Confirmed answer display with extracted data |
| `components/pipeline/CascadeWarning.tsx` | Warning when foundational change affects downstream data |

### Modified Files

| File | Changes |
|------|---------|
| `components/pages/pipeline/PipelineStrategyStep.tsx` | Add `<StepDialogue>` between output and gate |
| `components/pages/pipeline/PipelineEavsStep.tsx` | Replace static Data Requests with `<StepDialogue>`, remove `DataRequestsPanel` |
| `components/pages/pipeline/PipelineMapStep.tsx` | Add `<StepDialogue>` for topic validation |
| `services/ai/eavGeneration.ts` | Include `dialogue_context` from strategy in prompt |
| `services/ai/pillarSuggestion.ts` | Return question-worthy analysis alongside suggestions |

---

## Data Model

### `dialogue_context` (new JSONB column on `topical_maps`)

```typescript
interface DialogueContext {
  strategy: StepDialogueState;
  eavs: StepDialogueState;
  map_planning: StepDialogueState;
}

interface StepDialogueState {
  answers: DialogueAnswer[];
  status: 'pending' | 'in_progress' | 'complete' | 'skipped';
  questionsGenerated: number;
  questionsAnswered: number;
}

interface DialogueAnswer {
  questionId: string;
  question: string;           // The question as shown to user
  questionType: 'choice' | 'text' | 'confirm' | 'multi_text';
  answer: string;             // User's raw answer
  extractedData: ExtractedData;  // AI's structured interpretation
  confirmedByUser: boolean;   // User validated the interpretation
  timestamp: string;
  followUpOf?: string;        // questionId this is a follow-up to
}

interface ExtractedData {
  // What the AI extracted from the answer
  newTriples?: SemanticTriple[];           // New EAVs to add
  updatedFields?: Record<string, any>;     // Fields to update (CE, SC, etc.)
  topicDecisions?: Record<string, string>; // Topic merge/split/keep decisions
  rawInsight?: string;                     // Free-form context for downstream prompts
}
```

### Question Generation Response

```typescript
interface DialogueQuestion {
  questionId: string;
  question: string;
  questionType: 'choice' | 'text' | 'confirm' | 'multi_text';
  choices?: Array<{
    label: string;
    description?: string;
  }>;
  allowCustomInput: boolean;   // Always true for 'choice' type
  context: string;             // Why this question matters (shown as subtitle)
  priority: 'critical' | 'important' | 'optional';
  triggerCondition: string;    // What triggered this question (for debugging)
}

interface DialogueQuestionsResult {
  questions: DialogueQuestion[];
  introText: string;           // "Based on your CE 'plat dak', I have a few questions..."
  allClear: boolean;           // true = no questions needed
  allClearMessage?: string;    // "Everything looks well-defined — ready for review"
}
```

---

## Dialogue Engine (`services/ai/dialogueEngine.ts`)

### Three Core Functions

#### 1. `generateStepQuestions(step, output, businessInfo, dialogueContext)`

Sends the step's generated output + accumulated context to AI. Returns 0-5 targeted questions.

**Prompt strategy:**
- Analyze the generated output for gaps, ambiguities, and assumptions
- Cross-reference with business context and previous dialogue answers
- Generate questions that are GOAL-DIRECTED: each question should improve the topical map quality
- If output is complete and unambiguous, return `allClear: true` with no questions
- Questions must be in the user's language (using `getLanguageAndRegionInstruction`)
- Each question includes `context` explaining why it matters

**Per-step focus:**

Strategy:
- CE scope and disambiguation
- SC type and positioning accuracy
- CSI predicate completeness
- Content area coverage of revenue model

EAVs:
- Missing trust signals (certifications, reviews, guarantees)
- Business-specific values that are pending (📋 markers)
- Sub-entity completeness
- Pricing/specification gaps

Map Planning:
- Semantic overlap between topics (merge candidates)
- Standalone vs section decisions for borderline topics
- Pillar coverage gaps
- Depth balance across content areas

#### 2. `processAnswer(question, answer, stepContext, businessInfo)`

Takes a user's answer and extracts structured data.

**Resilience requirements:**
- Must handle informal/shorthand answers ("ja dat klopt", "ook sedum", "nee meer richting renovatie")
- Must extract multiple data points from compound answers ("BRL-2312 en Komo, en we hebben ook ISO 9001")
- If answer is unclear, return a follow-up question instead of guessing
- Always return the interpretation for user confirmation before applying
- Produce data in the correct language

**Return structure:**
```typescript
interface AnswerProcessingResult {
  interpretation: string;        // "I'll add: has_certification → BRL-2312, Komo, ISO 9001"
  extractedData: ExtractedData;  // Structured data to apply
  confidence: number;            // How sure the AI is about the interpretation
  followUpQuestion?: DialogueQuestion;  // If answer needs clarification
  alternativesOffered?: string[];       // If user said "no" to a confirm question
}
```

#### 3. `detectCascadeImpact(changedField, changedValue, currentData)`

When a foundational value changes (CE, SC, CSI), analyzes what downstream data is affected.

**Returns:**
```typescript
interface CascadeImpact {
  hasImpact: boolean;
  affectedEavCount: number;        // How many EAVs reference the old value
  affectedTopicCount: number;      // How many topics are affected
  affectedFields: string[];        // Which fields would change
  description: string;             // "Changing CE affects 42 facts and 15 topics"
  severity: 'info' | 'warning' | 'critical';
}
```

**User options when cascade detected:**
- "Update all automatically" → AI regenerates affected data
- "Let me review changes first" → Shows diff of what would change
- "Cancel" → Revert the change

---

## UI Component: `<StepDialogue>`

### Props

```typescript
interface StepDialogueProps {
  step: 'strategy' | 'eavs' | 'map_planning';
  stepOutput: any;                    // The generated output to analyze
  businessInfo: BusinessInfo;
  dialogueContext: DialogueContext;   // Accumulated context from previous steps
  onDataExtracted: (data: ExtractedData) => void;  // Callback when user confirms an answer
  onDialogueComplete: () => void;     // All questions answered or skipped
  onCascadeAction: (action: 'update_all' | 'review' | 'cancel', impact: CascadeImpact) => void;
}
```

### States

1. **Loading** — Generating questions (spinner)
2. **Active Question** — Shows current question with input
3. **Processing Answer** — AI interpreting the answer (spinner)
4. **Showing Interpretation** — "I'll add X → Y" with [Looks good] / [Edit] / [Skip]
5. **Follow-up** — AI needs clarification, shows follow-up question with alternatives
6. **All Clear** — No questions or all answered: green banner
7. **Cascade Warning** — Foundational change detected, showing impact

### Visual Design

- Card with subtle gradient border (blue-to-purple)
- Intro text in gray-400
- Active question in a bordered card with slight elevation
- Confirmed answers collapse into compact green-tinted rows
- Progress: "Question 2 of 4" with thin progress bar
- "Skip remaining questions" link at bottom for users who want to move fast

---

## Per-Step Integration

### Strategy Step

**When:** After `suggestPillarsFromBusinessInfo()` returns and form is populated
**What:** StepDialogue analyzes the suggested CE/SC/CSI
**Data flow:** Confirmed answers update the strategy form fields directly + stored in `dialogue_context.strategy`

### EAV Step

**When:** After `generateEavsWithAI()` returns the dual-layer EAVs
**What:** StepDialogue replaces the static `DataRequestsPanel`. Identifies gaps in the generated EAVs and asks about pending (📋) values
**Data flow:** Confirmed answers create new EAV triples or update existing ones + stored in `dialogue_context.eavs`

### Map Planning Step

**When:** After topic generation produces the map structure
**What:** StepDialogue asks about topic overlap, standalone decisions, coverage gaps
**Data flow:** Confirmed answers modify topic structure (merge, split, add) + stored in `dialogue_context.map_planning`

---

## Forward Propagation

Each step's AI generation prompt includes relevant dialogue context:

```
EAV generation prompt includes:
  - dialogue_context.strategy.answers (validated CE/SC/CSI decisions)

Map planning prompt includes:
  - dialogue_context.strategy.answers (pillar decisions)
  - dialogue_context.eavs.answers (validated business facts)
  - dialogue_context.eavs.newTriples (EAVs created from dialogue)

Content brief prompts include:
  - All accumulated dialogue_context (full validated understanding)
```

This ensures that user-validated decisions are never lost and consistently inform all downstream AI calls.

---

## Database Migration

```sql
ALTER TABLE topical_maps
ADD COLUMN IF NOT EXISTS dialogue_context JSONB DEFAULT '{}';
```

No parser changes needed — `ProjectLoader.tsx` uses `select('*')`, so the new column is automatically included.

---

## Verification Criteria

1. **Strategy step:** AI generates questions about CE/SC/CSI ambiguities → user answers → answers refine the strategy fields → answers stored in dialogue_context
2. **EAV step:** Data Requests panel replaced → AI asks about gaps and 📋 values → answers become new EAV triples → answers propagate to map planning
3. **Map Planning step:** AI asks about topic overlap and coverage → answers modify topic structure
4. **Forward propagation:** EAV generation prompt includes strategy dialogue answers → map planning prompt includes both
5. **Cascade detection:** Changing CE in strategy → warns about affected EAVs → user chooses to update or cancel
6. **No questions:** When output is unambiguous, shows "All clear" and approval gate appears immediately
7. **Language:** All questions and processing in the user's configured language
8. **Resilience:** Informal/shorthand answers correctly interpreted → shown for confirmation before applying
