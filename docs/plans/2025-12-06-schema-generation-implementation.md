# Schema Generation Implementation Plan

## Overview

Implement a comprehensive, context-aware schema generation system aligned with Koray's Holistic SEO framework, search engine patents, and AI model understanding. The system will generate maximum-coverage JSON-LD schemas with full validation and entity resolution.

## Architecture Decisions (from Brainstorm)

| Aspect | Decision |
|--------|----------|
| Page Types | Full website coverage with intelligent auto-detection |
| Input Context | Page type + draft analysis + external entity resolution |
| Graph Structure | Hybrid @graph with @id references |
| Property Coverage | Maximum properties with validation |
| Validation | Full 4-stage pipeline |
| Workflow | Hybrid progressive collection + Pass 9 |
| Entity Resolution | AI-first with Wikidata verification |
| Storage | Hybrid (job table + entity cache) |
| UI | Enhanced modal with validation/preview |

---

## Phase 1: Database Schema & Types

### Task 1.1: Create Entity Resolution Cache Table

```sql
-- supabase/migrations/YYYYMMDD_entity_resolution_cache.sql
CREATE TABLE entity_resolution_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'Person', 'Organization', 'Place', etc.
  wikidata_id TEXT,
  wikipedia_url TEXT,
  resolved_data JSONB, -- Full entity data from Wikidata
  confidence_score DECIMAL(3,2),
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_name, entity_type)
);

CREATE INDEX idx_entity_cache_name ON entity_resolution_cache(entity_name);
CREATE INDEX idx_entity_cache_wikidata ON entity_resolution_cache(wikidata_id);
```

### Task 1.2: Add Schema Fields to Content Generation Jobs

```sql
-- Add to content_generation_jobs table
ALTER TABLE content_generation_jobs ADD COLUMN IF NOT EXISTS
  schema_data JSONB DEFAULT NULL;

ALTER TABLE content_generation_jobs ADD COLUMN IF NOT EXISTS
  schema_validation_results JSONB DEFAULT NULL;

ALTER TABLE content_generation_jobs ADD COLUMN IF NOT EXISTS
  schema_entities JSONB DEFAULT NULL; -- Resolved entity references

ALTER TABLE content_generation_jobs ADD COLUMN IF NOT EXISTS
  pass9_status TEXT DEFAULT 'pending';
```

### Task 1.3: Update TypeScript Types

```typescript
// types.ts additions

// Page type detection
export type SchemaPageType =
  | 'HomePage'
  | 'Article'
  | 'BlogPosting'
  | 'Product'
  | 'ProfilePage'      // Author profile
  | 'CollectionPage'   // Category/tag page
  | 'FAQPage'
  | 'HowTo'
  | 'WebPage';         // Generic fallback

// Entity resolution
export interface ResolvedEntity {
  name: string;
  type: 'Person' | 'Organization' | 'Place' | 'Thing' | 'Event';
  wikidataId?: string;
  wikipediaUrl?: string;
  sameAs: string[];
  description?: string;
  properties: Record<string, unknown>;
  confidenceScore: number;
  source: 'wikidata' | 'ai_inferred' | 'user_provided';
}

// Schema validation
export interface SchemaValidationResult {
  isValid: boolean;
  syntaxErrors: ValidationError[];
  schemaOrgErrors: ValidationError[];
  contentParityErrors: ValidationError[];
  eavConsistencyErrors: ValidationError[];
  entityErrors: ValidationError[];
  warnings: ValidationWarning[];
  autoFixApplied: boolean;
  autoFixChanges: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
  autoFixable: boolean;
}

export interface ValidationWarning {
  path: string;
  message: string;
  recommendation: string;
}

// Progressive schema data (collected during passes 1-8)
export interface ProgressiveSchemaData {
  // From Pass 1 (Draft)
  mainEntity: string;
  headline: string;
  description: string;
  wordCount: number;
  sections: Array<{
    name: string;
    about: string;
  }>;

  // From Pass 3 (Lists & Tables)
  hasPart: Array<{
    type: 'ItemList' | 'HowToStep' | 'FAQPage';
    items: unknown[];
  }>;

  // From Pass 4 (Visual Semantics)
  images: Array<{
    description: string;
    caption: string;
    contentUrl?: string;
  }>;

  // From Pass 5 (Micro Semantics)
  keywords: string[];
  entities: string[];

  // From Pass 7 (Introduction)
  abstractText: string;

  // From Pass 8 (Audit)
  qualityScore: number;
  readabilityScore: number;
}

// Full schema generation result
export interface EnhancedSchemaResult {
  schema: object;              // The full JSON-LD @graph
  schemaString: string;        // Stringified for display
  pageType: SchemaPageType;
  resolvedEntities: ResolvedEntity[];
  validation: SchemaValidationResult;
  reasoning: string;
  generatedAt: string;
  version: number;
}

// Pass 9 configuration
export interface Pass9Config {
  pageType?: SchemaPageType;   // Override auto-detection
  includeEntities: boolean;
  maxEntityResolutions: number;
  validationLevel: 'basic' | 'standard' | 'strict';
  autoFix: boolean;
  externalValidation: boolean;
}
```

---

## Phase 2: Entity Resolution Service

### Task 2.1: Create Wikidata API Service

**File: `services/wikidataService.ts`**

```typescript
// Core functions:
// - searchEntity(name: string, type: string): Promise<WikidataSearchResult[]>
// - getEntityDetails(wikidataId: string): Promise<WikidataEntity>
// - resolveEntity(name: string, context: string, type: string): Promise<ResolvedEntity>
// - batchResolveEntities(entities: EntityCandidate[]): Promise<ResolvedEntity[]>

// Wikidata SPARQL endpoint: https://query.wikidata.org/sparql
// Wikidata API: https://www.wikidata.org/w/api.php

// Key properties to extract:
// - P31 (instance of)
// - P18 (image)
// - P856 (official website)
// - P2002 (Twitter username)
// - P2013 (Facebook ID)
// - P2003 (Instagram username)
// - P496 (ORCID ID) for authors
// - P569 (date of birth)
// - P19 (place of birth)
// - P106 (occupation)
// - P108 (employer)
```

### Task 2.2: Create Entity Resolution Cache Service

**File: `services/entityResolutionCache.ts`**

```typescript
// Functions:
// - getCachedEntity(name: string, type: string): Promise<ResolvedEntity | null>
// - cacheEntity(entity: ResolvedEntity): Promise<void>
// - refreshStaleEntities(olderThan: Date): Promise<void>
// - getOrResolveEntity(name: string, type: string, context: string): Promise<ResolvedEntity>
```

### Task 2.3: Create AI Entity Extraction Service

**File: `services/ai/entityExtraction.ts`**

```typescript
// Functions:
// - extractEntitiesFromDraft(draft: string): Promise<EntityCandidate[]>
// - suggestEntityTypes(entity: string, context: string): Promise<string[]>
// - generateEntityContext(entity: string, draft: string): Promise<string>

// Uses LLM to identify:
// - Main subject entity
// - Author/creator entities
// - Organization entities
// - Place entities
// - Mentioned entities (for 'mentions' property)
// - Topic entities (for 'about' property)
```

---

## Phase 3: Schema Generation Core

### Task 3.1: Page Type Detection Service

**File: `services/ai/schemaPageTypeDetector.ts`**

```typescript
// Intelligent page type detection based on:
// - URL patterns
// - Content structure analysis
// - Brief metadata
// - Section types (FAQ sections, How-to steps, etc.)

// Detection rules:
// - /author/, /team/, /about-us/ → ProfilePage
// - /category/, /tag/, /topics/ → CollectionPage
// - /product/, /shop/ → Product
// - FAQ section detected → FAQPage (or Article with FAQPage)
// - How-to structure → HowTo (or Article with HowTo)
// - Default for blog content → Article or BlogPosting
```

### Task 3.2: Schema Template System

**File: `config/schemaTemplates.ts`**

```typescript
// Base templates for each page type with maximum property coverage

// Article/BlogPosting template includes:
// @context, @type, @id, mainEntityOfPage, headline, name, description,
// image, datePublished, dateModified, author (Person with @id reference),
// publisher (Organization with @id reference), articleBody, wordCount,
// articleSection, keywords, about, mentions, citation, isPartOf,
// speakable, hasPart (for ItemList, HowTo, FAQ), inLanguage,
// copyrightHolder, copyrightYear, license, isAccessibleForFree,
// thumbnailUrl, backstory

// Organization template (defined once, referenced via @id):
// @type, @id, name, url, logo, sameAs[], contactPoint, address,
// foundingDate, founder, numberOfEmployees, areaServed

// Person/Author template:
// @type, @id, name, url, image, sameAs[], jobTitle, worksFor,
// alumniOf, knowsAbout[], description, email

// Product template:
// @type, @id, name, description, image, brand, offers, aggregateRating,
// review, sku, gtin, mpn, category, material, color, size

// FAQPage template:
// @type, mainEntity (array of Question/Answer pairs)

// HowTo template:
// @type, name, description, image, totalTime, estimatedCost,
// supply, tool, step (HowToStep array), yield
```

### Task 3.3: Schema Generator Service

**File: `services/ai/schemaGeneration/schemaGenerator.ts`**

```typescript
// Main generation orchestration

interface SchemaGenerationContext {
  brief: ContentBrief;
  draft: string;
  progressiveData: ProgressiveSchemaData;
  pageType: SchemaPageType;
  resolvedEntities: ResolvedEntity[];
  config: Pass9Config;
}

// Functions:
// - generateSchema(context: SchemaGenerationContext): Promise<EnhancedSchemaResult>
// - buildGraphStructure(pageType: SchemaPageType, data: SchemaData): object
// - injectEntities(schema: object, entities: ResolvedEntity[]): object
// - optimizeForRichResults(schema: object, pageType: SchemaPageType): object
```

### Task 3.4: Schema Prompt Engineering

**File: `config/schemaPrompts.ts`**

```typescript
// Comprehensive prompts for schema generation

// Pre-generation analysis prompt:
// - Analyze draft for schema opportunities
// - Identify all entities requiring resolution
// - Detect content patterns (FAQ, HowTo, Lists)
// - Map EAVs to schema properties

// Main generation prompt:
// - Include full Schema.org vocabulary reference
// - Koray's framework rules for semantic density
// - Search engine patent insights
// - AI model understanding requirements
// - Content parity enforcement

// Post-generation refinement prompt:
// - Validate against original content
// - Check entity consistency
// - Optimize for rich results eligibility
```

---

## Phase 4: Validation Pipeline

### Task 4.1: Pre-Generation Validation

**File: `services/ai/schemaGeneration/preValidation.ts`**

```typescript
// Validates inputs before generation:
// - Draft completeness check
// - Required entity availability
// - EAV consistency verification
// - Content structure analysis
```

### Task 4.2: Post-Generation Validation

**File: `services/ai/schemaGeneration/postValidation.ts`**

```typescript
// Validates generated schema:
// - JSON syntax validation
// - Schema.org type/property validation
// - Required property presence
// - Value type correctness
// - @id reference integrity
// - Nested entity validation
```

### Task 4.3: Content Parity Validation

**File: `services/ai/schemaGeneration/parityValidation.ts`**

```typescript
// Ensures schema matches visible content:
// - Headline matches H1
// - Description matches meta/intro
// - Images exist in content
// - Dates are accurate
// - Author information matches byline
// - Organization matches site info
```

### Task 4.4: EAV Consistency Validation

**File: `services/ai/schemaGeneration/eavValidation.ts`**

```typescript
// Cross-references schema with EAV triples:
// - Main entity matches Central Entity
// - Properties align with defined attributes
// - Value assertions are consistent
// - Semantic triple coverage
```

### Task 4.5: External API Validation

**File: `services/ai/schemaGeneration/externalValidation.ts`**

```typescript
// Optional external validation:
// - Google Rich Results Test API (if available)
// - Schema.org validator
// - Custom validation rules

// Note: May require Supabase Edge Function for CORS
```

### Task 4.6: Auto-Fix Engine

**File: `services/ai/schemaGeneration/autoFix.ts`**

```typescript
// Iterative repair for common issues:
// - Missing required properties → add from context
// - Type mismatches → convert values
// - Broken @id references → regenerate IDs
// - Missing sameAs URLs → resolve from entity cache
// - Date format issues → standardize to ISO 8601
```

---

## Phase 5: Progressive Data Collection

### Task 5.1: Pass Integration Points

Update each pass to collect schema-relevant data:

**Pass 1 (Draft Generation):**
- Extract headline, description, word count
- Identify main entity
- Capture section structure

**Pass 3 (Lists & Tables):**
- Detect ItemList structures
- Identify HowToStep sequences
- Extract FAQ pairs

**Pass 4 (Visual Semantics):**
- Collect image metadata
- Capture alt text for schema images

**Pass 5 (Micro Semantics):**
- Extract keywords
- Identify entity mentions

**Pass 7 (Introduction):**
- Capture abstract/description text

**Pass 8 (Audit):**
- Record quality scores
- Flag schema opportunities

### Task 5.2: Progressive Data Aggregator

**File: `services/ai/contentGeneration/progressiveSchemaCollector.ts`**

```typescript
// Aggregates data from all passes:
// - collectFromPass(passNumber: number, data: PassResult): void
// - getProgressiveData(): ProgressiveSchemaData
// - validateCompleteness(): ValidationResult
```

---

## Phase 6: Pass 9 Implementation

### Task 6.1: Pass 9 Orchestrator

**File: `services/ai/contentGeneration/passes/pass9SchemaGeneration.ts`**

```typescript
// Pass 9 workflow:
// 1. Gather progressive data from passes 1-8
// 2. Detect page type (or use override)
// 3. Extract and resolve entities
// 4. Run pre-generation validation
// 5. Generate schema with full context
// 6. Run post-generation validation
// 7. Apply auto-fixes if needed (up to 3 iterations)
// 8. Run external validation (optional)
// 9. Store results and update job status

export async function executePass9(
  jobId: string,
  config: Pass9Config
): Promise<EnhancedSchemaResult>
```

### Task 6.2: Update Content Generation Orchestrator

**File: `services/ai/contentGeneration/orchestrator.ts`**

Add Pass 9 to the orchestration flow:
- Add pass9 to PassStatus type
- Update job status handling
- Add schema generation after pass 8
- Handle schema validation failures

---

## Phase 7: UI Components

### Task 7.1: Enhanced Schema Modal

**File: `components/SchemaModal.tsx`**

Complete rewrite with:
- Tabbed interface (Schema | Validation | Entities | Export)
- Syntax-highlighted JSON display with line numbers
- Collapsible @graph sections
- Validation results panel with error/warning counts
- Entity resolution preview cards
- Export options (JSON, JSON-LD script tag, copy)
- Regenerate with options button
- Schema comparison (if previous version exists)

### Task 7.2: Schema Validation Panel

**File: `components/schema/SchemaValidationPanel.tsx`**

```typescript
// Displays validation results:
// - Overall status badge
// - Error/warning counts by category
// - Expandable error details
// - Auto-fix suggestions with apply button
// - External validation results (if run)
```

### Task 7.3: Entity Resolution Panel

**File: `components/schema/EntityResolutionPanel.tsx`**

```typescript
// Shows resolved entities:
// - Entity cards with type icons
// - Wikidata/Wikipedia links
// - Confidence scores
// - sameAs URLs
// - Manual override option
```

### Task 7.4: Schema Preview Panel

**File: `components/schema/SchemaPreviewPanel.tsx`**

```typescript
// Visual schema preview:
// - Rich result preview simulation
// - Property coverage visualization
// - @graph relationship diagram (optional)
```

### Task 7.5: Pass 9 Progress Integration

Update `ContentGenerationProgress.tsx`:
- Add Pass 9 to progress display
- Show schema generation status
- Display entity resolution progress
- Show validation stage progress

---

## Phase 8: Integration & Testing

### Task 8.1: Hook Updates

**File: `hooks/useContentGeneration.ts`**

Add schema-related state and actions:
- schemaData state
- schemaValidation state
- generateSchema action
- regenerateSchema action
- resolveEntities action

### Task 8.2: Service Integration

Update existing services to work with schema system:
- `briefGeneration.ts` - Update generateSchema to use new system
- `geminiService.ts` - Add schema-specific methods
- `anthropicService.ts` - Add schema-specific methods

### Task 8.3: Testing

Create comprehensive tests:
- Unit tests for validation functions
- Integration tests for entity resolution
- E2E tests for full schema generation flow
- Snapshot tests for schema templates

---

## Implementation Order

### Sprint 1: Foundation (Tasks 1.1-1.3, 2.1-2.3)
1. Database migrations
2. TypeScript types
3. Entity resolution services
4. Wikidata API integration

### Sprint 2: Core Generation (Tasks 3.1-3.4)
1. Page type detection
2. Schema templates
3. Schema generator service
4. Prompt engineering

### Sprint 3: Validation (Tasks 4.1-4.6)
1. Pre-generation validation
2. Post-generation validation
3. Content parity checks
4. EAV consistency
5. External validation
6. Auto-fix engine

### Sprint 4: Progressive & Pass 9 (Tasks 5.1-5.2, 6.1-6.2)
1. Progressive data collection hooks
2. Data aggregator
3. Pass 9 implementation
4. Orchestrator updates

### Sprint 5: UI (Tasks 7.1-7.5)
1. Enhanced schema modal
2. Validation panel
3. Entity panel
4. Preview panel
5. Progress integration

### Sprint 6: Integration & Polish (Tasks 8.1-8.3)
1. Hook updates
2. Service integration
3. Testing
4. Documentation

---

## Key Files to Create

```
services/
├── wikidataService.ts
├── entityResolutionCache.ts
└── ai/
    ├── entityExtraction.ts
    ├── schemaPageTypeDetector.ts
    └── schemaGeneration/
        ├── schemaGenerator.ts
        ├── preValidation.ts
        ├── postValidation.ts
        ├── parityValidation.ts
        ├── eavValidation.ts
        ├── externalValidation.ts
        └── autoFix.ts

services/ai/contentGeneration/
├── progressiveSchemaCollector.ts
└── passes/
    └── pass9SchemaGeneration.ts

config/
├── schemaTemplates.ts
└── schemaPrompts.ts

components/
├── SchemaModal.tsx (rewrite)
└── schema/
    ├── SchemaValidationPanel.tsx
    ├── EntityResolutionPanel.tsx
    └── SchemaPreviewPanel.tsx

supabase/migrations/
└── YYYYMMDD_schema_generation_tables.sql
```

---

## Success Criteria

1. **Intelligent Detection**: System correctly identifies page type in >95% of cases
2. **Entity Resolution**: Successfully resolves entities to Wikidata in >80% of attempts
3. **Validation Coverage**: All schemas pass syntax and Schema.org validation
4. **Content Parity**: Zero content parity errors in final schemas
5. **Rich Result Eligibility**: Generated schemas qualify for Google Rich Results
6. **Performance**: Schema generation completes in <30 seconds
7. **User Experience**: Clear validation feedback with actionable suggestions

---

## Alignment with Koray's Framework

- **Central Entity Focus**: Schema properly identifies and structures the main entity
- **EAV Integration**: Schema properties derived from semantic triples
- **Source Context**: Organization and author information supports E-E-A-T
- **Content Parity**: Schema reflects only visible, verified content
- **Knowledge-Based Trust**: Entity resolution adds external verification
- **Semantic Density**: Maximum property coverage increases information retrieval signal
