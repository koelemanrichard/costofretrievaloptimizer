# Comprehensive System Audit: Identified Issues & Fix Plan

**Date:** January 13, 2026
**Status:** Critical issues requiring architectural fixes

---

## Executive Summary

The application has **8 critical systemic issues** stemming from a lack of single source of truth and incomplete data flows. These issues cause:
- Data not persisting across page reloads
- Competitor analysis returning wrong results
- Content brief data not flowing into content generation
- Multiple inconsistent views of the same content

---

## ISSUE 1: Competitor SERP Search Ignores Business Context

### Severity: CRITICAL

### Problem
The DataForSEO SERP query uses ONLY the topic title without any business/industry context.

**Example:**
- Topic: "Winterinspectie Checklist"
- Business: Dakdekker (Roofer) for flat roofs
- Search sent: `"Winterinspectie Checklist"` (generic)
- Results returned: Car winterization companies (bovag.nl, anwb.nl, etc.)
- Expected: Roofing/building inspection content

### Root Cause
```typescript
// serpService.ts line 133-134
const data = await fetchFullSerpData(
  topic,  // Just topic title, no business context!
  businessInfo.dataforseoLogin,
  ...
);
```

The `businessInfo` object contains industry/niche information but it's NOT used to contextualize the search.

### Fix Required
```typescript
// Add business context to search query
function buildContextualizedQuery(topic: string, businessInfo: BusinessInfo): string {
  const industry = businessInfo.businessName || businessInfo.niche || '';
  const modifiers = businessInfo.topicModifiers || [];

  // For "Winterinspectie Checklist" + dakdekker context:
  // Returns: "Winterinspectie Checklist plat dak dakdekker"
  return `${topic} ${industry} ${modifiers.join(' ')}`.trim();
}
```

### Files to Modify
- `services/serpService.ts` - Add query contextualization
- `types.ts` - Add `topicModifiers?: string[]` to BusinessInfo

---

## ISSUE 2: Competitor Analysis Returns All Zeros

### Severity: CRITICAL

### Problem
Even in "Real Data" mode with DataForSEO, the analysis returns:
- Avg Words: 0
- Schema: None
- Root/Rare/Unique Attributes: None found

### Root Cause Chain
1. DataForSEO returns wrong competitors (Issue 1)
2. Jina API key may be missing → content fetch fails silently
3. Error caught and swallowed (holisticCompetitorAnalyzer.ts:701-703)
4. Empty `competitors[]` array → `aggregatePatterns([])` returns zeros

```typescript
// holisticCompetitorAnalyzer.ts line 701-703
} catch (error) {
  console.error(`Failed to analyze competitor ${url}:`, error);
  // Error silently caught, competitor skipped
}
```

### Fix Required
1. Fix Issue 1 first (correct competitors)
2. Add warning accumulation instead of silent fail
3. Show user which competitors failed and why
4. Require minimum successful analyses before showing patterns

### Files to Modify
- `services/holisticCompetitorAnalyzer.ts` - Add warning collection
- `components/analysis/TopicSerpPanel.tsx` - Show warnings to user

---

## ISSUE 3: Generated Images Lost on Page Reload

### Severity: HIGH

### Problem
When user generates or uploads images in the Images tab, they disappear after page reload.

### Root Cause
```typescript
// DraftingModal.tsx line 164-166
const imagePlaceholders = useMemo(() => {
  return extractPlaceholdersFromDraft(draftContent);
}, [draftContent]);
```

Images are stored in `content_generation_jobs.image_placeholders` (with `generatedUrl`, `userUploadUrl`), BUT:
- On reload, `imagePlaceholders` is re-parsed from draft markdown text only
- The `job.image_placeholders` with URLs is NEVER read back
- Result: Placeholder markers exist, but URLs are lost

### Fix Required
```typescript
// On modal load, merge job data with parsed placeholders
const jobPlaceholders = databaseJobInfo?.image_placeholders || [];
const parsedPlaceholders = extractPlaceholdersFromDraft(draftContent);

const imagePlaceholders = parsedPlaceholders.map(p => {
  const jobData = jobPlaceholders.find(jp => jp.id === p.id);
  return {
    ...p,
    generatedUrl: jobData?.generatedUrl,
    userUploadUrl: jobData?.userUploadUrl,
    status: jobData?.status || 'pending'
  };
});
```

### Files to Modify
- `components/modals/DraftingModal.tsx` - Restore images from job data

---

## ISSUE 4: Content Brief visual_semantics Not Enforced

### Severity: HIGH

### Problem
The content brief specifies detailed image requirements (hero image, section images with specific descriptions), but:
- Generated content may have different/missing placeholders
- No linkage between brief's planned images and actual placeholders
- User can't verify "did Pass 6 create the images I planned?"

### Root Cause
`brief.visual_semantics` is passed to AI as "guidance" only (sectionOptimizationPromptBuilder.ts:267-289), but:
- AI may not follow the guidance exactly
- No validation that all planned images were created
- No mapping between planned images and created placeholders

### Fix Required
1. Pre-create image placeholders from `visual_semantics` before Pass 6
2. Pass 6 should UPDATE existing placeholders, not create new ones
3. Add validation: "All visual_semantics have corresponding placeholders"
4. Store `visual_semantic_id` in each placeholder for traceability

### Files to Modify
- `services/ai/contentGeneration/passes/pass6VisualSemantics.ts`
- `types/content.ts` - Add visual_semantic_id to ImagePlaceholder

---

## ISSUE 5: Multiple Content Versions Out of Sync

### Severity: HIGH

### Problem
Content exists in multiple places that can diverge:
1. `content_generation_sections.pass_N_content` - Per-section per-pass
2. `content_generation_jobs.draft_content` - Assembled cache
3. `content_briefs.article_draft` - User-facing draft

Symptoms:
- Introduction missing in preview but present in download
- Introduction cut off mid-word in export
- Different content in different views

### Root Cause
- Preview strips H1 with regex that may capture too much
- Export functions differ (`convertToSemanticHtml` vs `convertMarkdownToHtml`)
- No single assembly function used everywhere

### Fix Required
1. Create ONE canonical assembly function
2. All views (preview, export, download) must use same function
3. Store final HTML alongside markdown for consistency
4. Add checksum validation between sources

### Files to Modify
- `services/ai/contentGeneration/orchestrator.ts` - Single assembly function
- `components/modals/DraftingModal.tsx` - Use canonical function
- `utils/exportUtils.ts` - Use canonical function

---

## ISSUE 6: Hero Image Duplicated/Missing

### Severity: MEDIUM

### Problem
- Hero image placeholder appears twice (header + in-content)
- Hero image missing from HTML download
- Same image spec for hero and in-content placeholder

### Root Cause
Hero image handling is split across multiple places:
- `brief.visual_semantics[0]` (if type=hero)
- In-content `[IMAGE: ...]` placeholders
- HTML export adds hero separately
- No deduplication logic

### Fix Required
1. Clear hero image handling: Store separately in brief
2. In-content placeholders should NOT duplicate hero
3. Export should check both hero and in-content sources
4. Add `isHero` flag to prevent duplication

### Files to Modify
- `types/content.ts` - Separate hero image field
- `components/modals/DraftingModal.tsx` - Hero deduplication
- Export functions - Unified hero handling

---

## ISSUE 7: Introduction Text Cut Off

### Severity: MEDIUM

### Problem
Introduction paragraph gets truncated mid-word in HTML download.

### Root Cause
The `centerpiece` extraction (DraftingModal.tsx:1972-1978) may be cutting at wrong boundary, or character limit applied incorrectly.

### Fix Required
1. Audit centerpiece extraction logic
2. Ensure sentence/paragraph boundary detection
3. Add validation that intro isn't truncated

### Files to Modify
- `components/modals/DraftingModal.tsx` - Fix centerpiece extraction

---

## ISSUE 8: Fast Mode Returns Empty Data

### Severity: MEDIUM

### Problem
In "Fast" (AI Inference) mode, competitor analysis returns all zeros immediately.

### Root Cause
```typescript
// holisticCompetitorAnalyzer.ts line 605-638
if (serpResult.mode === 'deep' && 'organicResults' in serpResult.data) {
  // ... process competitors
} else {
  // Fast mode - return empty immediately!
  return {
    patterns: { avgWordCount: 0, ... },
    gaps: { missingRoot: [], ... },
    ...
  };
}
```

Fast mode doesn't attempt ANY competitor analysis - it just returns zeros.

### Fix Required
1. Fast mode should use AI inference for competitor patterns
2. Or clearly state "Fast mode cannot analyze competitors"
3. Remove misleading "Re-analyze" button if no analysis possible

### Files to Modify
- `services/holisticCompetitorAnalyzer.ts` - Implement fast mode analysis
- `components/analysis/TopicSerpPanel.tsx` - Show mode limitations

---

## Priority Fix Order

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | SERP query context (Issue 1) | Medium | Critical - fixes competitor analysis |
| 2 | Image persistence (Issue 3) | Low | High - immediate user pain |
| 3 | Analysis zeros (Issue 2) | Medium | High - depends on Issue 1 |
| 4 | Content sync (Issue 5) | High | High - architectural |
| 5 | Brief visual_semantics (Issue 4) | High | Medium - planning feature |
| 6 | Hero duplication (Issue 6) | Low | Medium |
| 7 | Intro truncation (Issue 7) | Low | Medium |
| 8 | Fast mode empty (Issue 8) | Medium | Low - workaround exists |

---

## Single Source of Truth Architecture

### Current State (Broken)

```
                    ┌─────────────────────┐
                    │   content_briefs    │
                    │   .article_draft    │ ← User sees this
                    └─────────────────────┘
                              ↑ (sync at Pass 9 only)
                    ┌─────────────────────┐
                    │ content_generation_ │
                    │   jobs.draft_content│ ← Cache/aggregate
                    └─────────────────────┘
                              ↑ (assembled from)
           ┌──────────────────┴──────────────────┐
           │                                     │
┌──────────────────┐               ┌──────────────────┐
│ sections.pass_1  │               │ sections.pass_N  │
│ sections.pass_2  │  ...          │ .current_content │
│     ...          │               │                  │
└──────────────────┘               └──────────────────┘

PROBLEMS:
- 3 different places store "the content"
- Image URLs stored in job but not read back
- Brief visual_semantics disconnected from placeholders
- Export functions use different assembly logic
```

### Target State (Unified)

```
                    ┌─────────────────────────┐
                    │     CANONICAL DRAFT     │
                    │  content_briefs         │
                    │  .article_draft         │ ← Single source
                    │  .article_html          │ ← Pre-rendered
                    │  .image_placeholders    │ ← Moved here
                    └─────────────────────────┘
                              ↑
                    ┌─────────────────────────┐
                    │  ASSEMBLY FUNCTION      │
                    │  (one canonical)        │
                    └─────────────────────────┘
                              ↑
                    ┌─────────────────────────┐
                    │  content_generation_    │
                    │  sections               │ ← Pass history only
                    └─────────────────────────┘

BENEFITS:
- One place to read content
- One assembly function
- Images stored with their content
- All views use same source
```

---

## Implementation Plan

### Phase 1: Quick Wins (1-2 days)
1. Fix SERP query context - add business industry to search
2. Fix image persistence - read job.image_placeholders on load
3. Fix hero image duplication - add isHero flag

### Phase 2: Content Unification (2-3 days)
4. Create canonical assembly function
5. Update all views to use it
6. Add content checksum validation
7. Fix intro truncation

### Phase 3: Brief Integration (2-3 days)
8. Link visual_semantics to placeholders
9. Pre-create placeholders from brief
10. Add validation for planned images

### Phase 4: Analysis Fixes (2-3 days)
11. Improve error handling in competitor analysis
12. Add warning collection and display
13. Implement or disable fast mode properly
