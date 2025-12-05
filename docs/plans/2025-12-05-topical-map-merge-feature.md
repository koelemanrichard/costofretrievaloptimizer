# Topical Map Merge Feature Design

**Date:** 2025-12-05
**Status:** Approved for Implementation
**Author:** Claude (with user validation)

---

## Overview

Enable merging two or more topical maps within the same project, combining the best topics, EAVs, and business context from each source map into a new unified map.

### Goals

1. Allow users to consolidate multiple experimental or partial topical maps
2. Provide AI-assisted smart matching of similar topics across maps
3. Maintain full human-in-the-loop control over every merge decision
4. Support offline collaboration via export/import workflow
5. Preserve source maps (non-destructive merge)

### Non-Goals

- Cross-project map merging (maps must be in same project)
- Automatic unattended merging (always requires human review)
- Real-time collaborative editing (single-user workflow)

---

## User Flow

### Entry Point

New "Merge Maps" button in `MapSelectionScreen.tsx` Actions panel, opens `MergeMapWizard` modal.

### Wizard Steps

```
Step 1: Select Maps
    ↓
Step 2: Business Context & Pillars Alignment
    ↓
Step 3: EAV Consolidation
    ↓
Step 4: Topic Matching ← [Export] [Import]
    ↓
Step 5: Review & Finalize ← [Export Final]
    ↓
Create New Merged Map
```

---

## Detailed Step Design

### Step 1: Select Maps

**UI Components:**
- Multi-select list of all maps in current project
- Each map shows: name, topic count, created date
- Minimum 2 maps required, no maximum

**Validation:**
- At least 2 maps selected
- All maps must belong to same project

**State:**
```typescript
selectedMapIds: string[]
```

---

### Step 2: Business Context & Pillars Alignment

**Purpose:** Reconcile all contextual information that affects content generation.

**Fields to Align:**

| Category | Fields |
|----------|--------|
| Business Identity | domain, projectName, industry, model (website type), valueProp, audience, expertise |
| Market | language, targetMarket |
| SEO Pillars | centralEntity, sourceContext, centralSearchIntent, primary_verb, auxiliary_verb |
| Author | authorProfile (name, bio, credentials, stylometry) |

**UI Behavior:**

1. **Matching fields** - Collapsed, shown as "✓ Aligned"
2. **Conflicting fields** - Expanded with:
   - Values from each source map
   - AI recommendation with reasoning
   - Radio buttons: [Use Map A] [Use Map B] [Use AI Suggestion]
   - Custom text input for manual override

**AI Analysis Prompt Requirements:**
- Compare field values semantically, not just string equality
- Suggest combined values where appropriate (e.g., "Small business owners" + "Marketing managers" → "Small business owners and marketing managers")
- Provide reasoning for each recommendation

**State:**
```typescript
resolvedContext: {
  businessInfo: Partial<BusinessInfo>;
  pillars: SEOPillars;
  conflicts: ContextConflict[];
  resolutionLog: { field: string; source: 'mapA' | 'mapB' | 'ai' | 'custom'; value: string }[];
}
```

---

### Step 3: EAV Consolidation

**Purpose:** Combine semantic triples (Entity-Attribute-Value) from all source maps.

**Categories:**

| Category | Behavior |
|----------|----------|
| **Unique to Map A** | Auto-include (user can exclude) |
| **Unique to Map B** | Auto-include (user can exclude) |
| **Duplicates** | Same subject+predicate+value → Keep one, auto-dedupe |
| **Conflicts** | Same subject+predicate, different value → User must resolve |

**UI Components:**
- Grouped list by category
- Checkbox for include/exclude per EAV
- For conflicts: radio selection + preview of resolved value
- "Add New EAV" button for manual additions
- Bulk actions: "Include All Unique", "Exclude All Duplicates"

**State:**
```typescript
resolvedEavs: SemanticTriple[]
eavDecisions: {
  id: string;
  sourceMap: string;
  action: 'include' | 'exclude' | 'merge';
  mergedValue?: string;
}[]
```

---

### Step 4: Topic Matching (Core Feature)

**Purpose:** AI-assisted identification and resolution of topic relationships across maps.

**AI Analysis Categories:**

| Category | Criteria | Default Action |
|----------|----------|----------------|
| **Exact Match** | Same title OR same slug | Auto-merge |
| **High Similarity** | Semantic similarity > 80% | Suggest merge |
| **Parent-Child Candidate** | One topic subsumes another | Suggest hierarchy |
| **Unique** | No match found | Auto-include |

**Topic Merge Decision Type:**
```typescript
interface TopicMergeDecision {
  id: string;
  topicA: EnrichedTopic | null;
  topicB: EnrichedTopic | null;
  similarityScore: number;
  aiSuggestedAction: 'merge' | 'parent_child' | 'keep_separate';
  aiSuggestedTitle?: string;
  aiReasoning: string;
  userDecision: 'merge' | 'keep_both' | 'keep_a' | 'keep_b' | 'delete';
  finalTitle?: string;
  finalParentId?: string;
}
```

**UI Components:**
- Grouped sections: Similar Topics, Parent-Child Candidates, Unique Topics
- Each suggestion card shows:
  - Source topic titles with map labels
  - Similarity score / AI confidence
  - AI suggested action + reasoning
  - Action buttons: [Merge] [Keep Both] [Keep A Only] [Keep B Only] [Delete]
  - Editable title field for merged result
- Topic tree preview panel (optional, collapsed by default)
- Filter controls: by confidence level, source map, topic type
- "Re-analyze" button to re-run AI after manual changes

**Delete Functionality:**
- Any topic can be marked for deletion
- Deleted topics shown in separate "Excluded" section
- Can be restored before finalizing

**Add New Topic:**
- "+ Add New Topic" button
- Form: title, description, type (core/outer), parent selection
- New topics marked with "NEW" badge

---

### Step 5: Review & Finalize

**Purpose:** Final review and confirmation before creating merged map.

**UI Components:**
- Complete hierarchical tree view of merged topics
- Summary statistics:
  - Total topics: X (Y from Map A, Z from Map B, W merged, N new)
  - Topics excluded: X
  - EAVs: X total
- Map name input field (required)
- Final edit capabilities:
  - Click topic to edit title/description
  - Drag-drop to rearrange hierarchy
  - Delete button per topic
- Brief merge preview (if both source topics have briefs)

**Actions:**
- "Create Merged Map" - Executes merge, creates new map
- "Back" - Return to previous step
- "Export Final" - Download completed plan
- "Cancel" - Discard all changes

---

## Export/Import Workflow

### Export Format (Excel .xlsx)

**Sheet 1: Business Context**
| Field | Value | Source |
|-------|-------|--------|
| industry | Digital Marketing & SEO | AI (combined) |
| audience | Small business owners | Map A |
| centralEntity | Holistic SEO Services | Map B |
| ... | ... | ... |

**Sheet 2: EAVs**
| Subject | Predicate | Value | Source Map | Include | Conflict Note |
|---------|-----------|-------|------------|---------|---------------|
| SEO | has_component | Keywords | Map A | yes | |
| SEO | has_component | Backlinks | Map B | yes | |
| SEO | avg_price | $500/mo | Map A | yes | CONFLICT: Map B says $750/mo |

**Sheet 3: Topics**
| ID | Source | Title | Description | Type | Parent Title | Merge Decision | Merge Partner | Final Title | Include | Notes |
|----|--------|-------|-------------|------|--------------|----------------|---------------|-------------|---------|-------|
| abc123 | Map A | Best SEO Tools | ... | core | | merge | Top SEO Software | Best SEO Tools & Software | yes | |
| def456 | Map B | Top SEO Software | ... | core | | merge | Best SEO Tools | Best SEO Tools & Software | yes | |
| ghi789 | Map A | Keyword Research | ... | outer | Best SEO Tools | keep | | | yes | |
| - | NEW | Content Strategy | User added | core | | new | | | yes | Added by stakeholder |

**Sheet 4: AI Suggestions (Reference)**
| Topic A | Topic B | Similarity | Suggested Action | Reasoning |
|---------|---------|------------|------------------|-----------|
| Best SEO Tools | Top SEO Software | 92% | merge | Both cover same intent... |

### Import Workflow

1. User uploads modified Excel file
2. System parses and validates structure
3. **Diff Detection:**
   - New rows (Source = "NEW" or empty ID) → Add as new topics
   - Include = "no" → Mark for deletion
   - Changed titles, parents, merge decisions → Update state
4. **Conflict Resolution:**
   - Circular parent references → Error
   - Deleted topic referenced as parent → Warning, suggest resolution
   - Invalid merge partner → Warning
5. **Preview Changes:**
   - Summary of adds, deletes, modifications
   - List of warnings/errors
6. **Apply or Cancel**

### Round-trip Support

- Can export, modify, import multiple times before finalizing
- Each import creates a diff, not a full replacement
- Import history tracked for audit purposes

---

## Data Model

### New Types

```typescript
// State for the merge wizard
interface MapMergeState {
  step: 'select' | 'context' | 'eavs' | 'topics' | 'review';
  selectedMapIds: string[];
  sourceMaps: TopicalMap[];

  // Step 2
  resolvedContext: {
    businessInfo: Partial<BusinessInfo>;
    pillars: SEOPillars;
  };
  contextConflicts: ContextConflict[];

  // Step 3
  resolvedEavs: SemanticTriple[];
  eavDecisions: EavDecision[];

  // Step 4
  topicSimilarities: TopicSimilarityResult[];
  topicDecisions: TopicMergeDecision[];
  newTopics: EnrichedTopic[];
  excludedTopicIds: string[];

  // Step 5
  finalTopics: EnrichedTopic[];
  newMapName: string;

  // Import/Export
  importHistory: ImportHistoryEntry[];
}

interface ContextConflict {
  field: string;
  values: { mapId: string; mapName: string; value: any }[];
  aiSuggestion: { value: any; reasoning: string };
  resolution: 'mapA' | 'mapB' | 'ai' | 'custom';
  customValue?: any;
}

interface EavDecision {
  eavId: string;
  sourceMapId: string;
  action: 'include' | 'exclude' | 'merge';
  conflictWith?: string;
  resolvedValue?: string;
}

interface TopicSimilarityResult {
  topicA: EnrichedTopic;
  topicB: EnrichedTopic;
  similarityScore: number;
  matchType: 'exact' | 'semantic' | 'parent_child';
  aiSuggestedAction: 'merge' | 'parent_child' | 'keep_separate';
  aiSuggestedTitle?: string;
  aiSuggestedParent?: string;
  reasoning: string;
}

interface TopicMergeDecision {
  id: string;
  topicAId: string | null;
  topicBId: string | null;
  userDecision: 'merge' | 'keep_both' | 'keep_a' | 'keep_b' | 'delete';
  finalTitle: string;
  finalDescription: string;
  finalType: 'core' | 'outer';
  finalParentId: string | null;
}

interface ImportHistoryEntry {
  timestamp: string;
  filename: string;
  changes: {
    topicsAdded: number;
    topicsDeleted: number;
    topicsModified: number;
    decisionsChanged: number;
  };
}

// Export row for Excel/CSV
interface MergeExportTopicRow {
  id: string;
  sourceMap: string;
  title: string;
  description: string;
  type: 'core' | 'outer';
  parentTitle: string | null;
  mergeDecision: 'keep' | 'merge' | 'delete' | 'new';
  mergePartnerTitle: string | null;
  finalTitle: string | null;
  include: 'yes' | 'no';
  notes: string;
}
```

---

## AI Service Functions

### New Service: `services/ai/mapMerge.ts`

```typescript
/**
 * Analyze multiple maps for merge, returning recommendations for
 * context alignment, EAV consolidation, and topic matching.
 */
export const analyzeMapMerge = (
  mapsToMerge: TopicalMap[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<MapMergeAnalysis>;

interface MapMergeAnalysis {
  contextRecommendations: {
    field: string;
    recommendation: any;
    reasoning: string;
    confidence: number;
  }[];

  eavAnalysis: {
    unique: { mapId: string; eav: SemanticTriple }[];
    duplicates: { eavs: SemanticTriple[]; keep: SemanticTriple }[];
    conflicts: {
      subject: string;
      predicate: string;
      values: { mapId: string; value: any }[];
      recommendation: any;
      reasoning: string;
    }[];
  };

  topicSimilarities: TopicSimilarityResult[];
}

/**
 * Re-analyze specific topics after user makes changes
 */
export const reanalyzeTopicSimilarity = (
  topicsA: EnrichedTopic[],
  topicsB: EnrichedTopic[],
  existingDecisions: TopicMergeDecision[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<TopicSimilarityResult[]>;
```

### Provider Integration

Follow existing pattern in `services/ai/mapGeneration.ts`:
```typescript
export const analyzeMapMerge = (...) => {
  switch (businessInfo.aiProvider) {
    case 'openai': return openAiService.analyzeMapMerge(...);
    case 'anthropic': return anthropicService.analyzeMapMerge(...);
    // ... etc
  }
};
```

---

## Component Structure

### New Components

```
components/
  merge/
    MergeMapWizard.tsx          # Main wizard container
    MergeMapSelectStep.tsx      # Step 1: Map selection
    MergeContextStep.tsx        # Step 2: Business context alignment
    MergeEavStep.tsx            # Step 3: EAV consolidation
    MergeTopicsStep.tsx         # Step 4: Topic matching
    MergeReviewStep.tsx         # Step 5: Final review
    TopicSimilarityCard.tsx     # Individual similarity suggestion UI
    MergeExportButton.tsx       # Export functionality
    MergeImportButton.tsx       # Import functionality
    MergeTopicTree.tsx          # Hierarchical topic preview
```

### State Management

Add to `state/appState.ts`:

```typescript
// New state slice
mapMerge: {
  isWizardOpen: boolean;
  state: MapMergeState | null;
  isAnalyzing: boolean;
  analysisError: string | null;
};

// New actions
| { type: 'OPEN_MERGE_WIZARD' }
| { type: 'CLOSE_MERGE_WIZARD' }
| { type: 'SET_MERGE_STATE'; payload: Partial<MapMergeState> }
| { type: 'SET_MERGE_ANALYZING'; payload: boolean }
| { type: 'SET_MERGE_ERROR'; payload: string | null }
```

Or alternatively, use local component state with `useReducer` since merge state is wizard-scoped and doesn't need persistence.

---

## Database Operations

### Creating Merged Map

```typescript
async function createMergedMap(
  projectId: string,
  mapName: string,
  resolvedContext: ResolvedContext,
  resolvedEavs: SemanticTriple[],
  finalTopics: EnrichedTopic[],
  sourceBriefs: Record<string, ContentBrief>
): Promise<string> {
  const supabase = getSupabaseClient(...);

  // 1. Create new topical_map
  const { data: newMap } = await supabase
    .from('topical_maps')
    .insert({
      project_id: projectId,
      name: mapName,
      business_info: resolvedContext.businessInfo,
      pillars: resolvedContext.pillars,
      eavs: resolvedEavs,
      map_type: 'merged',
      status: 'active'
    })
    .select()
    .single();

  // 2. Create topics with new map_id
  // Need to generate new IDs and remap parent references
  const topicIdMap = new Map<string, string>(); // old ID -> new ID

  for (const topic of finalTopics) {
    const newId = crypto.randomUUID();
    topicIdMap.set(topic.id, newId);
  }

  const topicsToInsert = finalTopics.map(topic => ({
    id: topicIdMap.get(topic.id),
    map_id: newMap.id,
    parent_topic_id: topic.parent_topic_id
      ? topicIdMap.get(topic.parent_topic_id)
      : null,
    title: topic.title,
    slug: topic.slug,
    description: topic.description,
    type: topic.type,
    // ... other fields
  }));

  await supabase.from('topics').insert(topicsToInsert);

  // 3. Copy/merge briefs
  // For merged topics, combine briefs intelligently
  // For single-source topics, copy with new topic_id

  return newMap.id;
}
```

---

## Success Metrics

1. **Usability:** User can complete merge workflow in < 10 minutes for typical maps
2. **Accuracy:** AI similarity detection has > 85% acceptance rate
3. **Flexibility:** Export/import round-trip preserves all user decisions
4. **Reliability:** No data loss, source maps remain intact

---

## Implementation Phases

### Phase 1: Core Wizard (MVP)
- Steps 1-5 basic UI
- AI similarity analysis
- Manual merge decisions
- Create merged map

### Phase 2: Export/Import
- Excel export
- Excel import with diff detection
- Round-trip support

### Phase 3: Polish
- Brief merging logic
- Topic tree drag-drop
- Undo/redo within wizard
- Performance optimization for large maps

---

## Open Questions

1. **Brief Merging Strategy:** When two topics are merged and both have briefs, should we:
   - Keep the more complete brief?
   - AI-merge the briefs?
   - Let user choose?

2. **Metadata Preservation:** Should topic metadata (canonical_query, query_network, blueprint) be merged or regenerated?

3. **Analysis Results:** Should existing analysis_state from source maps be carried over or regenerated for the merged map?

---

## Appendix: UI Mockups

### MapSelectionScreen with Merge Button
```
┌─────────────────────────────────────────────────────────────┐
│ Project: My SEO Project                                     │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────────────────┐│
│ │ Create New Map      │  │ Existing Maps                   ││
│ │ [Start Wizard]      │  │ ┌───────────────────────────┐  ││
│ │                     │  │ │ Map A (25 topics)         │  ││
│ │ Analyze Website     │  │ │ Created: 2025-12-01       │  ││
│ │ [Start Analysis]    │  │ │ [Delete] [Load]           │  ││
│ │                     │  │ └───────────────────────────┘  ││
│ │ ────────────────── │  │ ┌───────────────────────────┐  ││
│ │ Merge Maps     NEW │  │ │ Map B (18 topics)         │  ││
│ │ [Merge Maps]       │  │ │ Created: 2025-12-03       │  ││
│ │                     │  │ │ [Delete] [Load]           │  ││
│ └─────────────────────┘  │ └───────────────────────────┘  ││
│                          └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Topic Matching Step
```
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Topic Matching                    [Export] [Import] │
├─────────────────────────────────────────────────────────────┤
│ Similar Topics (8 suggestions)                    [Expand ▼]│
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔗 92% Similar                                          │ │
│ │ Map A: "Best SEO Tools 2024"                            │ │
│ │ Map B: "Top SEO Software Guide"                         │ │
│ │ AI Suggests: Merge → "Best SEO Tools & Software Guide"  │ │
│ │ Reasoning: Both target same search intent for SEO tool  │ │
│ │ comparison, combining maximizes coverage.               │ │
│ │                                                         │ │
│ │ [✓ Merge] [Keep Both] [Keep A] [Keep B] [Delete]       │ │
│ │ Final Title: [Best SEO Tools & Software Guide____]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔗 78% Similar                                          │ │
│ │ ...                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Unique Topics from Map A (12)              [Include All ✓]  │
│ Unique Topics from Map B (10)              [Include All ✓]  │
├─────────────────────────────────────────────────────────────┤
│ [+ Add New Topic]                                           │
│                                          [Back] [Next →]    │
└─────────────────────────────────────────────────────────────┘
```
