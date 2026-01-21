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

export const ACTIONS_REQUIRING_CONFIRMATION: QuickAction[] = ['fix_accuracy'];

export interface DetectedItem {
  id: string;
  textFragment: string;
  itemType: 'service_mention' | 'factual_claim' | 'unverified_statement';
  aiAssessment: 'potentially_incorrect' | 'unverified' | 'needs_review';
  userDecision: 'keep' | 'fix' | 'remove' | null;
  userCorrection?: string;
  reason: string;
}

export interface AnalysisForConfirmation {
  action: QuickAction;
  detectedItems: DetectedItem[];
  summary: string;
}

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

export type EditorMode = 'idle' | 'menu' | 'panel_text' | 'panel_image' | 'analysis' | 'preview';
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
  // Analysis confirmation flow state
  analysisForConfirmation: AnalysisForConfirmation | null;
  customInstruction: string;
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
