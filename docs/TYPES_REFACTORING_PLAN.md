# Types Refactoring Plan

## Overview

The main `types.ts` file has grown to 4,305 lines, making it difficult to maintain. This document outlines the plan to split it into domain-specific modules while maintaining backward compatibility.

## Current State

- **Main file:** `types.ts` (4,305 lines)
- **Files importing:** 175 files
- **Existing modules:**
  - `types/contentGeneration.ts` (544 lines) - Content generation V2 types
  - `types/insights.ts` (493 lines) - Insights/analytics types
  - `types/help.ts` (414 lines) - Help system types
  - `types/reports.ts` - Report types
  - `types/core.ts` (NEW) - Core enums and types

## Target Structure

```
types/
├── index.ts              # Barrel exports (re-export everything)
├── core.ts               # AppStep, WebsiteType, StylometryType, AIProvider (CREATED)
├── business.ts           # BusinessInfo, AuthorProfile, SEOPillars, BrandKit
├── semantic.ts           # SemanticTriple, AttributeCategory, AttributeClass, EAV types
├── content.ts            # ContentBrief, EnrichedTopic, TopicViability
├── schema.ts             # JSON-LD types, SchemaEntity, SchemaPageType
├── publication.ts        # PublicationPlan, Calendar, Scheduling, Performance
├── audit.ts              # ValidationResult, AuditResult, Violations
├── migration.ts          # Migration workbench types
├── siteAnalysis.ts       # Site analysis V2 types
├── navigation.ts         # Navigation and foundation page types
├── knowledgePanel.ts     # KP strategy types
├── contentGeneration.ts  # (EXISTS) Multi-pass generation types
├── insights.ts           # (EXISTS) Insights types
├── help.ts               # (EXISTS) Help types
├── reports.ts            # (EXISTS) Report types
└── database.ts           # Database row types (snake_case)
```

## Migration Strategy

### Phase 1: Create New Modules (Non-Breaking)
1. Create new type modules with extracted types
2. Have `types.ts` re-export from new modules
3. Existing imports continue to work unchanged

### Phase 2: Gradual Migration (Optional)
1. Update imports in new files to use specific modules
2. Deprecate direct exports from `types.ts`
3. Eventually make `types.ts` a pure barrel file

## Module Boundaries

### types/core.ts (CREATED)
```typescript
// Fundamental enums and types
export enum AppStep { ... }
export type WebsiteType = 'ECOMMERCE' | 'SAAS' | ...;
export const WEBSITE_TYPE_CONFIG: Record<WebsiteType, WebsiteTypeConfig>;
export type StylometryType = 'ACADEMIC_FORMAL' | ...;
export type AIProvider = 'gemini' | 'openai' | ...;
```

### types/business.ts (TO CREATE)
```typescript
// Business context types
export interface BusinessInfo { ... }
export interface AuthorProfile { ... }
export interface SEOPillars { ... }
export interface BrandKit { ... }
export interface EntityIdentity { ... }
```

### types/semantic.ts (TO CREATE)
```typescript
// Semantic SEO types
export type AttributeCategory = 'CORE_DEFINITION' | 'SEARCH_DEMAND' | ...;
export type AttributeClass = 'TYPE' | 'COMPONENT' | ...;
export interface SemanticTriple { ... }
export interface KnowledgeGraphNode { ... }
export interface KnowledgeGraphEdge { ... }
```

### types/content.ts (TO CREATE)
```typescript
// Content and topic types
export interface EnrichedTopic { ... }
export interface ContentBrief { ... }
export interface BriefSection { ... }
export interface TopicViabilityResult { ... }
```

### types/schema.ts (TO CREATE)
```typescript
// JSON-LD schema types
export type SchemaPageType = 'Article' | 'BlogPosting' | ...;
export interface SchemaEntity { ... }
export interface SchemaGraph { ... }
export interface Pass9Config { ... }
```

### types/audit.ts (TO CREATE)
```typescript
// Validation and audit types
export interface ValidationResult { ... }
export interface ValidationIssue { ... }
export interface AuditResult { ... }
export interface AuditRule { ... }
```

### types/publication.ts (TO CREATE)
```typescript
// Publication planning types
export interface PublicationPlan { ... }
export interface PublicationCalendarItem { ... }
export interface PerformanceSnapshot { ... }
export interface PublicationFilters { ... }
```

## Implementation Notes

### Backward Compatibility
The main `types.ts` should become a barrel file:
```typescript
// types.ts (after refactoring)
export * from './types/core';
export * from './types/business';
export * from './types/semantic';
export * from './types/content';
export * from './types/schema';
export * from './types/audit';
export * from './types/publication';
// ... etc
```

### Circular Dependencies
Watch for circular dependencies when splitting:
- `ContentBrief` references `SemanticTriple` - both should be in separate files
- `EnrichedTopic` references `ContentBrief` - content.ts depends on brief types
- Solution: Create a `types/base.ts` for shared primitives

### Database Types
Database row types (snake_case) should remain in `database.types.ts` and be kept separate from domain types (camelCase).

## Progress

| Module | Status | Notes |
|--------|--------|-------|
| core.ts | **Created** | AppStep, WebsiteType, StylometryType, AIProvider, WEBSITE_TYPE_CONFIG |
| business.ts | **Created** | BusinessInfo, AuthorProfile, SEOPillars, BrandKit, EntityIdentity, KPMetadata, SeedSource types, ImageGeneration types |
| semantic.ts | **Created** | SemanticTriple, AttributeCategory, AttributeClass, AttributeMetadata, TopicBlueprint, FreshnessProfile, CandidateEntity, SourceContextOption |
| content.ts | **Created** | EnrichedTopic, ContentBrief, BriefSection, ResponseCode, FormatCode, ContextualBridge, VisualSemantics, SERP types, GSC types |
| audit.ts | **Created** | ValidationResult, AuditRule, UnifiedAuditResult, PageAudit, LinkingAuditResult, CorpusAuditResult, SchemaValidationResult, 80+ types |
| schema.ts | **Created** | SchemaPageType, SchemaEntityType, ResolvedEntity, EntityCandidate, Pass9Config, EnhancedSchemaResult, ProgressiveSchemaData |
| publication.ts | **Created** | PublicationStatus, PublicationPhase, PublicationPriority, TopicPublicationPlan, PerformanceSnapshot, PriorityScoreBreakdown |
| navigation.ts | **Created** | FoundationPageType, FoundationPage, NavigationLink, NavigationStructure, NAPData, FooterSection, SitemapNode, SitemapView |
| migration.ts | **Created** | TransitionStatus, ActionType, SiteInventoryItem, MergeWizardStep, MapMergeState, TopicSimilarityResult, MigrationDecision |
| siteAnalysis.ts | **Created** | SiteAnalysisStatus, SiteAnalysisProject, SitePageRecord, CrawlSession, JinaExtraction, ApifyPageData, ExtractedPageData |
| knowledgePanel.ts | Pending | KP strategy types (lower priority - can be done in Phase 2) |

### Phase 1 Status: COMPLETE

**Completed (2024-12-19):**
- Created `types/core.ts` with core enums and WEBSITE_TYPE_CONFIG
- Created `types/business.ts` with business context types
- Created `types/semantic.ts` with semantic SEO types
- Created `types/content.ts` with content and topic types
- Created `types/audit.ts` with comprehensive audit types (850+ lines)
- Created `types/schema.ts` with JSON-LD schema types (~230 lines)
- Created `types/publication.ts` with publication planning types (~200 lines)
- Created `types/navigation.ts` with navigation and foundation page types (~270 lines)
- Created `types/migration.ts` with migration and merge wizard types (~320 lines)
- Created `types/siteAnalysis.ts` with site analysis V2 types (~390 lines)
- Updated `types.ts` header and re-exports for all modules

**Notes:**
- types.ts still contains duplicate definitions (for now)
- Re-exports ensure backward compatibility
- Phase 2 will remove duplicates from types.ts
- types/audit.ts imports FoundationPageType from navigation.ts
- types/migration.ts uses forward declarations to avoid circular dependencies
- types/siteAnalysis.ts imports from audit.ts and content.ts

## Estimated Effort

- **Phase 1 (Non-Breaking):** 2-4 hours
  - Create all new modules
  - Update types.ts to re-export
  - Verify build passes

- **Phase 2 (Migration):** 4-8 hours
  - Update 175+ files to use specific imports
  - Update import patterns in linting rules
  - Test all functionality

## Related Documentation

- See `ACCESSIBILITY_CHANGES.md` for accessibility improvements
- See audit plan for full architecture review
