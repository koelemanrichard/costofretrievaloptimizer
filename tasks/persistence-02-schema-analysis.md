
# Persistence Task 02: Schema & Types for Analysis Caching

**Status:** [x] Completed
**Priority:** HIGH
**Target Files:** 
- `docs/migrations/03_add_analysis_state.txt`
- `types.ts`
- `utils/parsers.ts`

## 1. The Issue
The `topical_maps` table currently has no place to store the results of expensive AI analyses (Validation, Semantics, Authority, etc.). We need a JSON column to cache these reports so they persist across reloads.

## 2. Implementation Steps

### Step 2.1: Create Migration Script
- Create `docs/migrations/03_add_analysis_state.txt`.
- SQL command: `ALTER TABLE public.topical_maps ADD COLUMN IF NOT EXISTS analysis_state jsonb;`

### Step 2.2: Update Types
- Update `TopicalMap` interface in `types.ts`:
    ```typescript
    export interface TopicalMap {
        // ... existing fields
        analysis_state?: {
            validationResult?: ValidationResult;
            semanticAnalysisResult?: SemanticAnalysisResult;
            contextualCoverageResult?: ContextualCoverageMetrics;
            internalLinkAuditResult?: InternalLinkAuditResult;
            topicalAuthorityScore?: TopicalAuthorityScore;
            publicationPlan?: PublicationPlan;
            gscOpportunities?: GscOpportunity[];
        };
    }
    ```

### Step 2.3: Update Parser
- Update `parseTopicalMap` in `utils/parsers.ts` to safely parse this new `analysis_state` column (handling nulls/strings).

## 3. Verification
- Run the SQL script in Supabase.
- Ensure the application compiles with the new types.
