# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Accessibility Improvements (2024-12-19)

- **New `Modal` Component** (`components/ui/Modal.tsx`)
  - Fully accessible modal implementing WAI-ARIA Dialog Modal pattern
  - `role="dialog"` and `aria-modal="true"` for screen readers
  - `aria-labelledby` linked to modal title
  - `aria-describedby` for optional description (screen reader only)
  - Focus trapping (Tab cycles within modal)
  - Escape key to close
  - Click outside to close (configurable)
  - Body scroll lock when open
  - Auto-focus first focusable element on open
  - Return focus to trigger element on close

- **Accessibility Documentation** (`docs/ACCESSIBILITY_CHANGES.md`)
  - Complete documentation of accessibility improvements
  - Migration guide for existing modals
  - Testing instructions for accessibility features
  - List of remaining modals to migrate

- **Modal Migrations to Accessible Modal Component** (2024-12-19)
  - `ValidationResultModal.tsx` - With ARIA tabs pattern for 4 tabs
  - `SemanticAnalysisModal.tsx` - Topic relationship analysis
  - `PublicationPlanModal.tsx` - Publication planning display
  - `EavManagerModal.tsx` - Semantic triples management
  - `FlowAuditModal.tsx` - Semantic flow audit
  - `GenerationLogModal.tsx` - Data generation log
  - `SchemaModal.tsx` - JSON-LD schema with ARIA tabs

- **Additional Modal Migrations** (2024-12-20)
  - `TopicExpansionModal.tsx` - ARIA radiogroup for expansion strategy selection
  - `ContentCalendarModal.tsx` - Simple calendar display
  - `GscExpansionHubModal.tsx` - File upload with accessible labels, aria-live status
  - `InternalLinkingModal.tsx` - Full-height visualization modal
  - `MergeSuggestionsModal.tsx` - List with role="list" and role="listitem"
  - `PillarEditModal.tsx` - Form inputs with aria-describedby, role="status" for completion
  - `ExportSettingsModal.tsx` - Fieldset/legend for form groups, radiogroup pattern
  - `TopicResourcesModal.tsx` - role="list", aria-hidden for decorative emojis
  - `ImprovementConfirmationModal.tsx` - role="alert" for warnings, accessible checkbox
  - `ResponseCodeSelectionModal.tsx` - ARIA radiogroup for card selection, aria-live status
  - `PillarChangeConfirmationModal.tsx` - role="alert" for destructive action warning
  - `ImprovementLogModal.tsx` - Semantic lists with aria-labelledby
  - `TopicalAuthorityModal.tsx` - role="img" for score visualization, dl/dt/dd for breakdown
  - `BriefReviewModal.tsx` - Custom header, Modal wrapper
  - `ContentIntegrityModal.tsx` - role="list" for compliance rules
  - `ContextualCoverageModal.tsx` - role="list" for gaps, role="status" for added items
  - `KnowledgeDomainModal.tsx` - Full ARIA tabs pattern with tabpanel
  - `CompetitorManagerModal.tsx` - role="list" for competitor URLs, aria-label on remove buttons
  - `InternalLinkingAuditModal.tsx` - Modal wrapper, role="list" for missed links and dilution risks
  - `LinkingAuditModal.tsx` - Full ARIA tabs pattern, expandable sections with aria-expanded/aria-controls, role="status" for loading states

#### Types Refactoring (2024-12-19)

- **New `types/core.ts` Module**
  - Extracted core enums: `AppStep`, `WebsiteType`, `StylometryType`, `AIProvider`
  - Extracted `WEBSITE_TYPE_CONFIG` registry
  - First step in splitting monolithic `types.ts` (4,305 lines)

- **New `types/business.ts` Module**
  - Extracted business types: `BusinessInfo`, `AuthorProfile`, `SEOPillars`, `BrandKit`
  - Extracted Knowledge Panel types: `EntityIdentity`, `KPMetadata`, `SeedSource*`
  - Extracted image generation types: `ImageStyle`, `ImageProviderPreference`, `ImageGenerationSettings`, `HeroTemplate`

- **New `types/semantic.ts` Module**
  - Extracted semantic types: `SemanticTriple`, `AttributeCategory`, `AttributeClass`
  - Extracted `AttributeMetadata`, `TopicBlueprint`, `FreshnessProfile`
  - Extracted wizard types: `CandidateEntity`, `SourceContextOption`

- **New `types/content.ts` Module**
  - Extracted content types: `EnrichedTopic`, `ContentBrief`, `BriefSection`
  - Extracted codes: `ResponseCode`, `FormatCode`, `ContentZone`
  - Extracted linking types: `ContextualBridgeLink`, `ContextualBridgeSection`
  - Extracted visual types: `VisualSemantics`, `FeaturedSnippetTarget`
  - Extracted SERP types: `SerpResult`, `FullSerpData`, `ScrapedContent`
  - Extracted GSC types: `GscRow`, `GscOpportunity`

- **New `types/audit.ts` Module** (850+ lines)
  - Extracted validation types: `ValidationResult`, `ValidationIssue`, `TypeMisclassification`
  - Extracted content audit: `AuditRuleResult`, `ContentIntegrityResult`, `FlowAuditResult`
  - Extracted page audit: `PageAudit`, `AuditCheck`, `AuditTask`, `AuditHistoryEntry`
  - Extracted linking audit: `LinkingAuditResult`, `LinkingIssue`, `LinkingAutoFix`
  - Extracted site-wide audit: `SiteLinkAuditResult`, `LinkFlowAnalysis`, `SiteWideAuditResult`
  - Extracted unified audit: `AuditRule`, `UnifiedAuditResult`, `AuditFix`
  - Extracted schema validation: `SchemaValidationResult`, `SchemaValidationError`
  - Extracted corpus audit: `CorpusAuditResult`, `CorpusAuditIssue`
  - Uses forward declarations to avoid circular dependencies

- **New `types/schema.ts` Module** (~230 lines)
  - Extracted JSON-LD schema types: `SchemaPageType`, `SchemaEntityType`
  - Extracted entity resolution: `ResolvedEntity`, `EntityCandidate`, `EntityResolutionCache`
  - Extracted Pass 9 config: `Pass9Config`, `DEFAULT_PASS9_CONFIG`
  - Extracted schema results: `EnhancedSchemaResult`, `ProgressiveSchemaData`

- **New `types/publication.ts` Module** (~200 lines)
  - Extracted status types: `PublicationStatus`, `PublicationPhase`, `PublicationPriority`
  - Extracted planning types: `TopicPublicationPlan`, `PublicationCalendarItem`
  - Extracted performance types: `PerformanceSnapshot`, `PriorityScoreBreakdown`
  - Extracted filter types: `PublicationFilters`, `PublicationFilterOptions`

- **New `types/navigation.ts` Module** (~270 lines)
  - Extracted foundation types: `FoundationPageType`, `FoundationPage`, `FoundationPageSection`
  - Extracted navigation types: `NavigationLink`, `NavigationStructure`, `FooterSection`
  - Extracted E-A-T types: `NAPData`, `OfficeLocation`
  - Extracted sitemap types: `SitemapNode`, `SitemapView`
  - Exported `DEFAULT_INTERNAL_LINKING_RULES` constant

- **New `types/migration.ts` Module** (~320 lines)
  - Extracted migration types: `TransitionStatus`, `ActionType`, `SectionType`
  - Extracted inventory types: `SiteInventoryItem`, `TransitionSnapshot`, `ContentChunk`
  - Extracted merge wizard types: `MergeWizardStep`, `MapMergeState`, `ContextConflict`
  - Extracted similarity types: `TopicSimilarityResult`, `TopicMergeDecision`
  - Uses forward declarations for EnrichedTopic, TopicalMap, BusinessInfo

- **New `types/siteAnalysis.ts` Module** (~390 lines)
  - Extracted site analysis types: `SiteAnalysisStatus`, `SiteAnalysisProject`, `DiscoveredPillars`
  - Extracted page record types: `SitePageRecord`, `CrawlSession`, `CrawlProgress`
  - Extracted extraction types: `JinaExtraction`, `ApifyPageData`, `ExtractedPageData`
  - Extracted provider types: `ScrapingProvider`, `ExtractionType`, `ProviderResult`
  - Extracted dashboard types: `DashboardMetrics`, `ContentCalendarEntry`

- **Updated `types.ts`**
  - Added re-exports from all 10 new domain modules for backward compatibility
  - All 175+ files importing from types.ts continue to work unchanged
  - Updated header documentation to list all module contents
  - Phase 1 of types refactoring now complete

- **Types Refactoring Plan** (`docs/TYPES_REFACTORING_PLAN.md`)
  - Detailed plan for splitting types.ts into domain modules
  - Target structure with 11 domain-specific type files
  - Migration strategy with backward compatibility
  - Module boundaries and dependency considerations
  - **Status: Phase 1 COMPLETE** - 10 of 11 modules created

#### TypeScript Type Safety Improvements (2024-12-19)

- **Replaced `Record<string, any>` with safer types**
  - Changed metadata fields in `types.ts` to use `Record<string, unknown>`
  - Created `TopicMetadata` interface in `types/content.ts` with known fields
  - `unknown` is safer than `any` - requires explicit type narrowing
  - Index signature `[key: string]: unknown` allows extensibility while documenting known properties

#### AppState Reducer Refactoring (2024-12-19)

- **New `state/slices/` Directory**
  - Created modular reducer slices for maintainability
  - Each slice is self-contained with types, initial state, reducer, and action creators

- **New `state/slices/uiSlice.ts`**
  - Handles loading states, errors, notifications
  - Manages modal visibility and confirmation dialogs
  - Includes `uiActions` action creators for convenience

- **New `state/slices/siteAnalysisSlice.ts`**
  - Handles site analysis V2 workflow state
  - Manages view mode, current project, selected page
  - Includes `siteAnalysisActions` action creators

- **New `state/slices/auditSlice.ts`**
  - Handles linking audit (Phase 5) state
  - Handles unified audit (Phase 6) state
  - Includes `linkingAuditActions` and `unifiedAuditActions` action creators

- **New `state/slices/publicationPlanningSlice.ts`** (2024-12-20)
  - Handles publication planning state (calendar/list view, filters, selection)
  - Manages performance snapshots and baselines
  - Includes `publicationPlanningActions` action creators
  - 14 actions delegated from main reducer

- **Updated `state/appState.ts`**
  - Imports and delegates to slice reducers
  - Site analysis actions now delegated to `siteAnalysisReducer`
  - Publication planning actions now delegated to `publicationPlanningReducer`
  - Backward compatible - no changes required to consumers

#### Prompt Template Engine (2024-12-20)

- **New `config/prompts/PromptBuilder.ts`**
  - Centralized prompt construction utilities
  - `PROMPT_CONSTRAINTS` constants for magic numbers (EXACTLY 5, EXACTLY 15, etc.)
  - `businessContext()` and `compactBusinessContext()` for business info
  - `pillarsContext()` for SEO pillars
  - `stylometryInstructions()` for author tone/style
  - `websiteTypeInstructions()` for website-type-specific rules
  - `composePrompt()` for combining prompt parts
  - `criticalRequirement()` for CRITICAL requirement instructions
  - `jsonArrayExample()` for JSON format examples
  - `PromptBuilder` fluent API for constructing complex prompts
  - `createPromptBuilder()` factory function

#### Skeleton Loaders (2024-12-20)

- **New `components/ui/Skeleton.tsx`**
  - `Skeleton` - Base skeleton element with pulse animation
  - `SkeletonText` - Multi-line text placeholder
  - `SkeletonCard` - Card content placeholder with optional image
  - `SkeletonTable` - Table rows placeholder
  - `SkeletonList` - List items with optional icon
  - `SkeletonAvatar` - Avatar with text placeholder
  - `SkeletonStats` - Dashboard stat cards placeholder
  - `SkeletonTopicItem` - Topic/brief item placeholder
  - All components have proper `role="status"` and `aria-label` for accessibility

#### Mobile Responsiveness (2024-12-20)

- **Updated `components/ui/Button.tsx`**
  - Touch-friendly minimum heights (44px) meeting WCAG guidelines
  - Added `touch-manipulation` for improved touch response
  - Added `fullWidth` prop option
  - Added `active:` states for better touch feedback
  - Responsive padding (smaller on mobile, larger on desktop)

- **Updated `components/ui/Modal.tsx`**
  - Responsive padding (p-2/p-3 on mobile, p-4/p-6 on desktop)
  - Responsive margins (my-2 on mobile, my-8 on desktop)
  - Touch-friendly close button (min 44x44px tap target)
  - Footer buttons stack vertically on mobile (flex-col), row on desktop
  - Truncated titles with min-w-0 for long text

#### Feature Error Boundaries (2024-12-20)

- **New `components/ui/FeatureErrorBoundary.tsx`**
  - Component-level error boundary for feature sections
  - Localized error UI (doesn't take over entire screen)
  - Shows feature name, retry button, and technical details (in development)
  - `withFeatureErrorBoundary` HOC for easy wrapping
  - Added to key components in `ProjectDashboard.tsx`: Topical Map, SEO Insights Hub

#### Component Organization (2024-12-20)

- **New `components/screens/` Directory**
  - Moved screen components: `AuthScreen`, `ProjectSelectionScreen`, `MapSelectionScreen`, `AnalysisStatusScreen`
  - Added barrel export `components/screens/index.ts`
  - Full-page views now grouped separately from modals and widgets

- **New `components/wizards/` Directory**
  - Moved wizard components: `PillarDefinitionWizard`, `EavDiscoveryWizard`, `CompetitorRefinementWizard`, `WebsiteBlueprintWizard`
  - Added barrel export `components/wizards/index.ts`
  - Multi-step workflows now grouped separately

- **New `components/modals/` Directory**
  - Moved 35 modal components from root level
  - Added barrel export `components/modals/index.ts` with organized exports
  - Includes: core modals, content modals, analysis modals, audit modals, publication modals, topic modals, SEO modals, confirmation modals
  - Updated all imports across the codebase

#### String Unions to Enums (2024-12-20)

- **Converted string unions to TypeScript enums for better IDE support and iteration**
  - `types/migration.ts`: `TransitionStatus`, `ActionType`, `SectionType`, `MergeWizardStep`
  - `types/core.ts`: `WebsiteType`, `StylometryType`, `AIProvider`
  - `types/audit.ts`: `AuditSeverity`, `NavigationSegment`
  - `types/content.ts`: `FormatCode`, `ContentZone`
  - `types/semantic.ts`: `ExpansionMode`
  - `types/publication.ts`: `PublicationPriority`
  - `types/contentGeneration.ts`: `ContentTone`, `AudienceExpertise`, `FieldImportance`
  - `types/schema.ts`: `SchemaEntityType`, `EntityRole`, `EntityResolutionSource`
  - `types/business.ts`: `ImageStyle`, `ImageProviderPreference`
  - Benefits: Enum iteration with `Object.values()`, better IDE autocomplete, compile-time safety

#### ESLint Configuration (2024-12-20)

- **New `eslint.config.mjs`**
  - Flat config format for ESLint 9+
  - Import ordering enforcement with `eslint-plugin-import`
  - Groups: builtin, external, internal, parent, sibling, index, type
  - Alphabetization within groups
  - React imports prioritized at top
  - Deep import restrictions to prevent bypassing barrel exports
  - TypeScript unused vars check (allows underscore prefix)

- **New npm scripts**
  - `npm run lint` - Run ESLint on TypeScript files
  - `npm run lint:fix` - Auto-fix fixable issues

#### E2E Test Coverage (2024-12-20)

- **New `e2e/topical-map.spec.ts`** (11 tests)
  - Topical Map Management: map selection, new map modal, map dashboard
  - Topic Management: topics list, topic detail panel
  - Content Brief Generation: brief modal, existing brief display
  - Modal Accessibility: ARIA attributes, focus trapping
  - Dashboard Navigation: tab navigation, footer dock

- **New `e2e/wizards.spec.ts`** (10 tests)
  - Business Info Wizard: form display, field validation
  - SEO Pillar Wizard: pillar interface, edit modal
  - EAV Discovery Wizard: EAV interface, manager modal
  - Competitor Wizard: competitor management UI
  - Wizard Navigation: step indicators, keyboard navigation
  - Error Boundaries: graceful error UI handling

### Changed

#### Modal Components Updated to Use Accessible Modal

- **`components/ui/ConfirmationModal.tsx`**
  - Migrated to use new `Modal` component
  - Added configurable confirm/cancel button text
  - Added `confirmVariant` prop for styling

- **`components/ui/MergeConfirmationModal.tsx`**
  - Migrated to use new `Modal` component
  - Added `role="list"` and `aria-label` to topic list
  - Added `aria-describedby` hints for inputs
  - Added `aria-label` to textarea

- **`components/NewMapModal.tsx`**
  - Migrated to use new `Modal` component
  - Added `aria-describedby` for input hints
  - Form properly linked to submit button via `id` attribute

- **`components/HelpModal.tsx`**
  - Migrated to use new `Modal` component
  - AccordionItem now properly implements ARIA pattern:
    - `aria-expanded` on button
    - `aria-controls` linking to content
    - `role="region"` on content
    - `aria-labelledby` linking to header
    - Unique IDs for each accordion section

#### Additional Modal Migrations (2024-12-19)

- **`components/ContentBriefModal.tsx`**
  - Migrated to use new `Modal` component
  - Added custom header with edit/settings buttons
  - Added `aria-expanded` and `aria-controls` to settings toggle
  - Added `aria-describedby` to multi-pass checkbox
  - Footer moved to footer prop with full-width layout

- **`components/SettingsModal.tsx`**
  - Migrated to use new `Modal` component
  - Added proper tab ARIA pattern with `aria-selected`, `aria-controls`
  - Tab panels now have `role="tabpanel"` and `aria-labelledby`
  - Form linked to submit button via `form` attribute

- **`components/AddTopicModal.tsx`**
  - Migrated to use new `Modal` component
  - Added proper tab ARIA pattern for Manual/Template/AI tabs
  - Tab panels now have `role="tabpanel"` and `aria-labelledby`
  - Footer content moved to footer prop

- **`components/BusinessInfoModal.tsx`**
  - Migrated to use new `Modal` component
  - Added proper tab ARIA pattern for General/Identity/Brand/API tabs
  - Tab panels now have `role="tabpanel"` and `aria-labelledby`
  - Footer content moved to footer prop

#### Deferred Migrations

- **`components/DraftingModal.tsx`** - Deferred (2211 lines)
  - This is a full-workspace application view, not a typical modal
  - Contains multiple nested modals, complex header, and full-screen layout
  - Requires special architectural consideration for migration

### Technical Details

#### Files Created
- `components/ui/Modal.tsx` - New accessible modal component
- `types/core.ts` - Core type definitions module (AppStep, WebsiteType, etc.)
- `types/business.ts` - Business type definitions (BusinessInfo, BrandKit, etc.)
- `types/semantic.ts` - Semantic type definitions (SemanticTriple, AttributeCategory, etc.)
- `types/content.ts` - Content type definitions (EnrichedTopic, ContentBrief, BriefSection, etc.)
- `types/audit.ts` - Audit type definitions (ValidationResult, AuditRule, UnifiedAuditResult, 80+ types)
- `docs/ACCESSIBILITY_CHANGES.md` - Accessibility documentation
- `docs/TYPES_REFACTORING_PLAN.md` - Types refactoring plan
- `CHANGELOG.md` - This changelog file

#### Files Modified
- `components/ui/ConfirmationModal.tsx` - Accessibility migration
- `components/ui/MergeConfirmationModal.tsx` - Accessibility migration
- `components/NewMapModal.tsx` - Accessibility migration
- `components/HelpModal.tsx` - Accessibility migration
- `components/ContentBriefModal.tsx` - Accessibility migration (Phase 2)
- `components/SettingsModal.tsx` - Accessibility migration (Phase 2)
- `components/AddTopicModal.tsx` - Accessibility migration (Phase 2)
- `components/BusinessInfoModal.tsx` - Accessibility migration (Phase 2)

#### Remaining Work (See Documentation)

**Accessibility (Immediate Priority):**
- 30+ modal components need migration to accessible Modal
- See `docs/ACCESSIBILITY_CHANGES.md` for full list

**Types Refactoring (Short-term):**
- 10 additional type modules to create
- 175 files import from types.ts
- See `docs/TYPES_REFACTORING_PLAN.md` for details

**Other Improvements (See Audit Plan):**
- Replace `Record<string, any>` with typed metadata (10+ locations)
- Split AppState reducer into feature slices
- Create prompt template engine
- Add skeleton loaders
- Improve mobile responsiveness

---

## Previous Changes

### Provider Dispatcher Migration (2024-12-18)

- Migrated 56+ switch statements to centralized `dispatchToProvider()` utility
- Created `services/ai/providerDispatcher.ts`
- Reduced duplicate code across 23 files
- Single point of modification for adding new AI providers
