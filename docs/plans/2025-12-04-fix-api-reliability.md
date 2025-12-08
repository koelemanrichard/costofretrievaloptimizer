# Fix API Reliability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore reliable API calls across all application functions by reverting problematic changes and creating a clean, tested implementation.

**Architecture:** Revert all uncommitted changes to AI service files, then apply minimal, focused fixes for the content generation `targetKeyword` issue only. Use git to track what was working before.

**Tech Stack:** TypeScript, React, Supabase Edge Functions

---

## Problem Analysis

Multiple uncommitted changes across 28+ files have introduced instability:
1. `anthropicService.ts` - Modified `callApi` signature, added options parameter, changed error handling
2. `providerUtils.ts` - Added new fallback functions, changed retry logic
3. `pass1DraftGeneration.ts` - Added new error handling functions
4. `config/prompts.ts` - Changed `info.seedKeyword` to `brief.targetKeyword`

The safest approach is to:
1. Revert all AI service changes to last working commit
2. Apply ONLY the targetKeyword fix (which is a valid bug fix)
3. Test thoroughly

---

### Task 1: Create Safety Backup Branch

**Files:**
- None (git operation)

**Step 1: Create backup branch of current state**

```bash
git stash push -m "backup-before-revert-2025-12-04"
```

**Step 2: Verify stash was created**

Run: `git stash list`
Expected: Shows `stash@{0}: On master: backup-before-revert-2025-12-04`

---

### Task 2: Revert anthropicService.ts to Last Commit

**Files:**
- Restore: `services/anthropicService.ts`

**Step 1: Revert the file**

```bash
git checkout HEAD -- services/anthropicService.ts
```

**Step 2: Verify revert**

Run: `git diff services/anthropicService.ts`
Expected: No output (file matches committed version)

---

### Task 3: Revert providerUtils.ts to Last Commit

**Files:**
- Restore: `services/ai/contentGeneration/providerUtils.ts`

**Step 1: Revert the file**

```bash
git checkout HEAD -- services/ai/contentGeneration/providerUtils.ts
```

**Step 2: Verify revert**

Run: `git diff services/ai/contentGeneration/providerUtils.ts`
Expected: No output

---

### Task 4: Revert pass1DraftGeneration.ts to Last Commit

**Files:**
- Restore: `services/ai/contentGeneration/passes/pass1DraftGeneration.ts`

**Step 1: Revert the file**

```bash
git checkout HEAD -- services/ai/contentGeneration/passes/pass1DraftGeneration.ts
```

**Step 2: Verify revert**

Run: `git diff services/ai/contentGeneration/passes/pass1DraftGeneration.ts`
Expected: No output

---

### Task 5: Revert All Other Modified Pass Files

**Files:**
- Restore: `services/ai/contentGeneration/passes/pass2Headers.ts`
- Restore: `services/ai/contentGeneration/passes/pass3Lists.ts`
- Restore: `services/ai/contentGeneration/passes/pass4Visuals.ts`
- Restore: `services/ai/contentGeneration/passes/pass5MicroSemantics.ts`
- Restore: `services/ai/contentGeneration/passes/pass6Discourse.ts`
- Restore: `services/ai/contentGeneration/passes/pass7Introduction.ts`

**Step 1: Revert all pass files**

```bash
git checkout HEAD -- services/ai/contentGeneration/passes/
```

**Step 2: Verify revert**

Run: `git diff services/ai/contentGeneration/passes/`
Expected: No output

---

### Task 6: Revert config/prompts.ts to Last Commit

**Files:**
- Restore: `config/prompts.ts`

**Step 1: Revert the file**

```bash
git checkout HEAD -- config/prompts.ts
```

**Step 2: Verify revert**

Run: `git diff config/prompts.ts`
Expected: No output

---

### Task 7: Revert Other Modified Service Files

**Files:**
- Restore: `services/openRouterService.ts`
- Restore: `services/batchProcessor.ts`

**Step 1: Revert service files**

```bash
git checkout HEAD -- services/openRouterService.ts services/batchProcessor.ts
```

**Step 2: Verify revert**

Run: `git diff services/`
Expected: No output for these files

---

### Task 8: Verify Build After Reverts

**Files:**
- None

**Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 2: Run tests**

Run: `npm test`
Expected: All tests pass

---

### Task 9: Apply targetKeyword Fix to config/prompts.ts

**Files:**
- Modify: `config/prompts.ts`

This is the ONLY change that should be kept - fixing the content generation to use the topic's keyword instead of the map's seed keyword.

**Step 1: Edit GENERATE_SECTION_DRAFT_PROMPT**

In `config/prompts.ts`, find the `GENERATE_SECTION_DRAFT_PROMPT` function and change:

```typescript
// FIND (around line 2224):
Central Entity: ${info.seedKeyword}

// REPLACE WITH:
Central Entity: ${brief.targetKeyword || brief.title}
```

**Step 2: Edit Subject Positioning rule**

```typescript
// FIND (around line 2250):
4. **Subject Positioning**: "${info.seedKeyword}" should be the grammatical SUBJECT

// REPLACE WITH:
4. **Subject Positioning**: "${brief.targetKeyword || brief.title}" should be the grammatical SUBJECT
```

**Step 3: Edit PASS_2_HEADER_OPTIMIZATION_PROMPT**

```typescript
// FIND (around line 2278):
## Central Entity: ${info.seedKeyword}

// REPLACE WITH:
## Central Entity: ${brief.targetKeyword || brief.title}
```

**Step 4: Edit PASS_2 heading instruction**

```typescript
// FIND (around line 2291):
2. Ensure each heading includes a contextual term related to "${info.seedKeyword}"

// REPLACE WITH:
2. Ensure each heading includes a contextual term related to "${brief.targetKeyword || brief.title}"
```

**Step 5: Edit PASS_4_VISUAL_SEMANTICS_PROMPT**

```typescript
// FIND (around line 2342):
## Central Entity: ${info.seedKeyword}

// REPLACE WITH:
## Central Entity: ${brief.targetKeyword || brief.title}
```

**Step 6: Edit PASS_5_MICRO_SEMANTICS_PROMPT Central Entity**

```typescript
// FIND (around line 2377):
## Central Entity: ${info.seedKeyword}

// REPLACE WITH:
## Central Entity: ${brief.targetKeyword || brief.title}
```

**Step 7: Edit PASS_5 Subject Positioning**

```typescript
// FIND (around line 2395):
- The Central Entity ("${info.seedKeyword}") must be the grammatical SUBJECT

// REPLACE WITH:
- The Central Entity ("${brief.targetKeyword || brief.title}") must be the grammatical SUBJECT
```

**Step 8: Edit PASS_7_INTRO_SYNTHESIS_PROMPT**

```typescript
// FIND (around line 2477):
Central Entity: ${info.seedKeyword}

// REPLACE WITH:
Central Entity: ${brief.targetKeyword || brief.title}
```

---

### Task 10: Verify Build and Tests After Fix

**Files:**
- None

**Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Run tests**

Run: `npm test`
Expected: All 341 tests pass

---

### Task 11: Manual Testing - AI Strategist

**Files:**
- None (manual test)

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test AI Strategist**

1. Open the application
2. Click on The Strategist button
3. Type "What should I do next?"
4. Verify response is received without error

Expected: AI responds with helpful strategy advice, no "I encountered an error" message

---

### Task 12: Manual Testing - Content Generation

**Files:**
- None (manual test)

**Step 1: Test content generation**

1. Select a topic with a content brief
2. Open the content brief modal
3. Start content generation

Expected: Content generation proceeds without 400 errors, content matches the topic (not generic SEO content)

---

### Task 13: Commit the targetKeyword Fix

**Files:**
- Commit: `config/prompts.ts`

**Step 1: Stage the fix**

```bash
git add config/prompts.ts
```

**Step 2: Commit**

```bash
git commit -m "fix(prompts): use brief.targetKeyword instead of info.seedKeyword for content generation

The content generation prompts were using the topical map's seedKeyword
(e.g., 'SEO') instead of the specific topic's targetKeyword (e.g.,
'Commercieel Vastgoedbeheer Software'), causing generated content to
be about the wrong subject.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

After completing all tasks:

- [ ] `git status` shows only `config/prompts.ts` as modified (and committed)
- [ ] `npm run build` succeeds
- [ ] `npm test` shows 341 tests passing
- [ ] AI Strategist responds without errors
- [ ] Content generation works without 400 errors
- [ ] Generated content matches the topic's keyword, not the map's seed keyword
