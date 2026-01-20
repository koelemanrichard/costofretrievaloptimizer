# Contextual Content Editor - Design Document

**Date**: 2026-01-20
**Status**: Approved
**Feature**: AI-powered text editing and image generation from text selection

---

## 1. Feature Overview

### Core Capabilities

1. **AI Text Editing** - Select text → right-click → quick actions or custom instructions → AI rewrites following Semantic SEO rules
2. **AI Image Generation** - Select context → generate image → approve → auto-insert with optimal placement

### Design Principles

- **Smart scope**: AI determines optimal edit scope, user confirms when expanding beyond selection
- **Semantic SEO compliance**: All rewrites follow algorithmic authorship rules (S-P-O structure, one fact per sentence, no fluff, proper modality)
- **Context-aware**: AI analyzes selection against full article, BusinessInfo, and EAV facts
- **Non-destructive**: Granular undo during session, consolidated versioning on save
- **Asset management**: All generated images go to gallery for complete asset bucket

---

## 2. User Flows

### 2.1 Text Editing Flow

```
1. User selects text in article preview
2. Small floating menu appears with quick actions
3. Background: AI analyzes selection against full article context
4. User either:
   a. Clicks quick action (Fix accuracy, Improve flow, etc.)
   b. Clicks "More options" → panel expands with AI suggestions + custom input
5. AI generates rewrite, checks if scope needs expansion
6. If expanding beyond selection → asks user confirmation
7. Preview shown (inline diff for small changes, panel for large rewrites)
8. User approves → edit applied, added to session undo stack
9. On save → all session edits consolidated to version_history
```

### 2.2 Image Generation Flow

```
1. User selects context text (paragraph or heading + text)
2. Floating menu → clicks "Generate Image"
3. Panel expands showing AI-generated prompt based on context
4. User can edit prompt, then clicks "Generate"
5. Image generated via preferred provider
6. Preview shown with AI-suggested placement (based on Pass 4 Visual Semantics rules)
7. User confirms placement (if setting enabled) or auto-inserts
8. Image added to gallery + inserted in article at optimal position
```

---

## 3. UI Components

### 3.1 Floating Context Menu

**Trigger**: Text selection + right-click OR text selection + small delay

**Appearance**: Small horizontal toolbar positioned above/below selection

**Quick Actions** (icon buttons):
- Fix accuracy (factual corrections)
- Remove service (not offered)
- Fix grammar
- Improve flow
- Simplify
- Expand detail
- Change tone (dropdown: formal/casual/persuasive)
- SEO optimize
- Generate image
- More options (expands panel)

**Behavior**:
- Appears at cursor/selection position
- Dismisses on click outside or Escape
- "More options" expands to side panel

### 3.2 Expanded Editor Panel

**Trigger**: "More options" from floating menu OR complex action selected

**Position**: Slides in from right (similar to RequirementsRail)

**Sections**:

1. **Selection Preview**
   - Shows selected text with context (sentence before/after grayed out)
   - Highlights the exact selection

2. **AI Analysis** (auto-populated)
   - Detected issues (contradictions, missing services, SEO violations)
   - Smart suggestions based on analysis
   - Each suggestion is clickable to apply

3. **Action Input**
   - Category tabs: Corrections | Rewrites | SEO | Custom
   - Quick action buttons per category
   - Free-text input for custom instructions
   - "Apply" button

4. **Scope Indicator**
   - Shows what will be affected (selection only / paragraph / section)
   - Toggle to force narrow scope

5. **Preview Area** (after AI generates)
   - For large rewrites: full before/after comparison
   - Accept / Reject / Try Again buttons

### 3.3 Image Generation Panel

**Trigger**: "Generate Image" from floating menu

**Position**: Same right panel, different mode

**Sections**:

1. **Context Display**
   - Selected text that will inform the image
   - Detected entities and themes

2. **Prompt Editor**
   - AI-generated prompt (editable)
   - Style suggestions (photograph, illustration, diagram, etc.)
   - Aspect ratio selector

3. **Generation Controls**
   - Provider selector (DALL-E 3 / Gemini / MarkupGo)
   - Generate button
   - Loading state with preview placeholder

4. **Result & Placement**
   - Generated image preview
   - AI-suggested placement with rationale
   - Placement override (before heading / after paragraph / replace placeholder)
   - Alt text (auto-generated, editable)
   - Approve / Regenerate / Cancel

---

## 4. AI Integration

### 4.1 Context Analysis Service

**Purpose**: Analyze selected text against full article context

**Inputs**:
- Selected text
- Full article content
- BusinessInfo (services, location, etc.)
- EAV facts from brief
- Content brief data

**Outputs**:
```typescript
interface ContextAnalysis {
  issues: Array<{
    type: 'contradiction' | 'missing_service' | 'seo_violation' | 'factual_concern' | 'readability';
    description: string;
    severity: 'error' | 'warning' | 'suggestion';
    suggestedFix?: string;
  }>;
  suggestions: Array<{
    action: string;
    description: string;
    confidence: number;
  }>;
  semanticContext: {
    relatedSections: string[];
    relevantEavs: SemanticTriple[];
    mentionedServices: string[];
  };
}
```

### 4.2 Text Rewrite Service

**Purpose**: Generate rewritten text following Semantic SEO rules

**Inputs**:
- Selected text
- Surrounding context (paragraph/section)
- User instruction (quick action or custom)
- Scope preference (narrow/smart/section)
- Full article for consistency
- Algorithmic authorship rules

**Processing Rules** (from Semantic SEO framework):
- S-P-O sentence structure
- One EAV triple per sentence
- Max 30 words per sentence
- No ambiguous pronouns
- No fluff words (actually, basically, really, very, etc.)
- Proper modality (is/are for facts, can/may for possibilities)
- Important terms early in sentences
- No generic AI phrases

**Outputs**:
```typescript
interface RewriteResult {
  originalText: string;
  rewrittenText: string;
  scopeExpanded: boolean;
  expandedTo: 'selection' | 'sentence' | 'paragraph' | 'section';
  expandReason?: string;
  changesDescription: string;
  affectedHeading?: string; // If header was modified
  wordCountDelta: number;
  complianceScore: number; // Semantic SEO compliance
}
```

### 4.3 Image Prompt Generation Service

**Purpose**: Generate optimal image prompt from context

**Inputs**:
- Selected context text
- Section heading
- Article topic/title
- BusinessInfo (for brand context)
- Image type (content image, not hero)

**Outputs**:
```typescript
interface ImagePromptResult {
  prompt: string;
  suggestedStyle: 'photograph' | 'illustration' | 'diagram' | 'infographic';
  suggestedAspectRatio: '16:9' | '4:3' | '1:1' | '3:4';
  altTextSuggestion: string;
  placementSuggestion: {
    position: 'before_heading' | 'after_paragraph' | 'inline';
    rationale: string;
    sectionKey: string;
  };
}
```

### 4.4 Image Placement Rules (Pass 4 Visual Semantics)

Based on existing Pass 4 rules:
- Images should extend vocabulary (alt text adds semantic value)
- Placement near relevant text for context association
- One content image per major section recommended
- Alt text should include entity names and attributes
- Caption optional but adds semantic value

---

## 5. Data Model Changes

### 5.1 Session Edit Tracking (In-Memory)

```typescript
interface SessionEdit {
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

interface EditSession {
  edits: SessionEdit[];
  currentIndex: number; // For undo/redo navigation
}
```

### 5.2 Version History Extension

Existing `version_history` in `ContentGenerationSection`:

```typescript
// Add new version type for manual edits
version_history: {
  pass_1?: string;
  pass_2?: string;
  // ... existing passes
  manual_v1?: string;  // First save after manual edits
  manual_v2?: string;  // Second save, etc.
}
```

### 5.3 User Settings Extension

Add to user settings:

```typescript
interface ContentEditorSettings {
  imagePlacementConfirmation: boolean;  // Default: false
  showAiAnalysisSuggestions: 'always' | 'on_request' | 'never';  // Default: 'always'
  rewriteScopeConfirmation: 'always' | 'smart' | 'never';  // Default: 'smart'
  preferredImageProvider: 'dalle3' | 'gemini' | 'markupgo';  // From existing
  autoSaveAfterEdits: boolean;  // Default: false
}
```

---

## 6. Component Architecture

### 6.1 New Components

```
components/
  contextualEditor/
    ContextMenu.tsx              # Floating quick-action menu
    EditorPanel.tsx              # Expanded right panel
    TextRewritePanel.tsx         # Text editing UI within panel
    ImageGenerationPanel.tsx     # Image gen UI within panel
    InlineDiff.tsx               # Inline strikethrough/highlight diff
    ScopeBadge.tsx               # Shows affected scope
    AiSuggestionCard.tsx         # Clickable suggestion display
    UndoStack.tsx                # Undo/redo controls
```

### 6.2 New Hooks

```
hooks/
  useTextSelection.ts            # Track selection in article preview
  useContextualEditor.ts         # Main hook managing editor state
  useEditSession.ts              # Session edit tracking & undo
  useContextAnalysis.ts          # AI analysis of selection
  useTextRewrite.ts              # AI rewrite generation
  useImagePromptGeneration.ts    # AI image prompt from context
```

### 6.3 New Services

```
services/
  ai/
    contextualEditing/
      contextAnalyzer.ts         # Analyze selection vs full context
      textRewriter.ts            # Generate rewrites with SEO rules
      imagePromptGenerator.ts    # Generate image prompts from context
      scopeDetector.ts           # Determine optimal edit scope
```

### 6.4 Integration Points

- **DraftingModal.tsx**: Add text selection listener, render ContextMenu
- **SimpleMarkdown.tsx**: Enable text selection, expose selection events
- **ImageManagementPanel.tsx**: Receive images from contextual generation
- **RequirementsRail.tsx**: Update when edits affect keyword/EAV coverage

---

## 7. User Settings UI

Add new section to settings:

**Content Editor Settings**
- [ ] Confirm image placement before inserting
- AI suggestions: [Always ▾] / On request / Never
- Scope confirmation: [Smart ▾] / Always ask / Never
- [ ] Auto-save after each edit

---

## 8. Smart Switching Logic

### Inline Diff vs Panel Preview

```typescript
function shouldUseInlineDiff(original: string, rewritten: string): boolean {
  const wordCountChange = Math.abs(
    original.split(/\s+/).length - rewritten.split(/\s+/).length
  );
  const characterChange = Math.abs(original.length - rewritten.length);

  // Use inline diff for small changes
  return wordCountChange < 50 && characterChange < 300;
}
```

### Scope Expansion Confirmation

```typescript
function shouldConfirmScopeExpansion(
  settings: ContentEditorSettings,
  originalScope: 'selection',
  expandedScope: 'sentence' | 'paragraph' | 'section'
): boolean {
  if (settings.rewriteScopeConfirmation === 'never') return false;
  if (settings.rewriteScopeConfirmation === 'always') return true;

  // Smart: only confirm significant expansions
  return expandedScope === 'section' || expandedScope === 'paragraph';
}
```

---

## 9. Error Handling

### AI Failures
- Show error in panel with "Try Again" button
- Fallback: allow user to edit manually
- Log failures for debugging

### Scope Conflicts
- If edit would conflict with another section, warn user
- Show affected sections before applying

### Image Generation Failures
- Provider fallback chain: primary → secondary → manual upload prompt
- Show error with option to try different provider

---

## 10. Performance Considerations

- **Debounce selection events** (300ms) to avoid excessive AI calls
- **Cache context analysis** per selection (invalidate on article change)
- **Lazy load** editor panel components
- **Optimistic UI** for edit application (show immediately, sync in background)
- **Batch save** session edits to reduce database writes

---

## 11. Future Enhancements (Out of Scope)

- Multi-selection editing (edit several passages at once)
- Collaborative editing (multiple users)
- Edit suggestions proactively shown (not just on selection)
- Voice input for edit instructions
- Bulk image generation for all placeholders from context
