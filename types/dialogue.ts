/**
 * Dialogue Engine Types Module
 *
 * Contains types for the intelligent dialogue engine that adds inline AI-driven
 * Q&A to pipeline steps (Strategy, EAVs, Map Planning). Supports dynamic question
 * generation, answer processing, forward-propagating context, and cascade detection.
 *
 * Created: 2026-02-24 - Intelligent Dialogue Engine
 *
 * @module types/dialogue
 */

import type { SemanticTriple } from './semantic';

// ============================================================================
// DIALOGUE CONTEXT (persisted on topical_maps.dialogue_context)
// ============================================================================

/**
 * Top-level dialogue context container, keyed by pipeline step.
 * Stored as JSONB on topical_maps for persistence and forward propagation.
 */
export interface DialogueContext {
  strategy: StepDialogueState;
  eavs: StepDialogueState;
  map_planning: StepDialogueState;
}

/**
 * Per-step dialogue state tracking answers and completion status.
 */
export interface StepDialogueState {
  answers: DialogueAnswer[];
  status: 'pending' | 'in_progress' | 'complete' | 'skipped';
  questionsGenerated: number;
  questionsAnswered: number;
}

// ============================================================================
// DIALOGUE ANSWERS
// ============================================================================

/** Question input types supported by the dialogue engine. */
export type DialogueQuestionType = 'choice' | 'text' | 'confirm' | 'multi_text';

/** Priority levels for generated questions. */
export type DialogueQuestionPriority = 'critical' | 'important' | 'optional';

/**
 * A confirmed Q&A pair with the AI's structured interpretation.
 */
export interface DialogueAnswer {
  questionId: string;
  question: string;
  questionType: DialogueQuestionType;
  answer: string;
  extractedData: ExtractedData;
  confirmedByUser: boolean;
  timestamp: string;
  followUpOf?: string;
}

/**
 * Structured data extracted by the AI from a user's answer.
 * Used to update EAVs, strategy fields, or topic decisions.
 */
export interface ExtractedData {
  newTriples?: SemanticTriple[];
  updatedFields?: Record<string, any>;
  topicDecisions?: Record<string, string>;
  rawInsight?: string;
}

// ============================================================================
// DIALOGUE QUESTIONS (AI-generated)
// ============================================================================

/**
 * A single AI-generated question presented to the user inline within a step.
 */
export interface DialogueQuestion {
  questionId: string;
  question: string;
  questionType: DialogueQuestionType;
  choices?: Array<{
    label: string;
    description?: string;
  }>;
  allowCustomInput: boolean;
  context: string;
  priority: DialogueQuestionPriority;
  triggerCondition: string;
}

/**
 * Result of AI question generation for a step.
 * Contains 0-5 questions or an allClear flag if no questions are needed.
 */
export interface DialogueQuestionsResult {
  questions: DialogueQuestion[];
  introText: string;
  allClear: boolean;
  allClearMessage?: string;
}

// ============================================================================
// ANSWER PROCESSING
// ============================================================================

/**
 * Result of AI processing a user's answer to a dialogue question.
 * Contains the interpretation, extracted data, and optional follow-up.
 */
export interface AnswerProcessingResult {
  interpretation: string;
  extractedData: ExtractedData;
  confidence: number;
  followUpQuestion?: DialogueQuestion;
  alternativesOffered?: string[];
}

// ============================================================================
// CASCADE DETECTION
// ============================================================================

/**
 * Impact analysis when a foundational value (CE, SC, CSI) changes.
 * Shows what downstream data would be affected.
 */
export interface CascadeImpact {
  hasImpact: boolean;
  affectedEavCount: number;
  affectedTopicCount: number;
  affectedFields: string[];
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

// ============================================================================
// COMPONENT PROPS (for StepDialogue and sub-components)
// ============================================================================

/** Steps that support inline dialogue. */
export type DialogueStep = 'strategy' | 'eavs' | 'map_planning';

/** State machine states for the StepDialogue component. */
export type DialogueUIState =
  | 'loading'
  | 'active'
  | 'processing'
  | 'interpretation'
  | 'follow_up'
  | 'complete'
  | 'all_clear';
