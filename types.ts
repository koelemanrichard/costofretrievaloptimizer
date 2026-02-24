
// types.ts
//
// Barrel re-export file for all domain-specific type modules.
// Each module contains types for a specific domain concern.
//
// Re-exports from domain modules:
// - types/core.ts - Core enums and types (AppStep, WebsiteType, Project, TopicalMap, AIProvider)
// - types/business.ts - Business types (BusinessInfo, AuthorProfile, SEOPillars, BrandKit, EntityIdentity)
// - types/semantic.ts - Semantic types (SemanticTriple, AttributeCategory, FreshnessProfile, FrameSemantics, MoneyPage)
// - types/content.ts - Content types (EnrichedTopic, ContentBrief, BriefSection, ImagePlaceholder, GscRow)
// - types/audit.ts - Audit types (ValidationResult, AuditRule, UnifiedAuditResult, PageAuditResult, SEOAuditReport)
// - types/schema.ts - JSON-LD schema types (SchemaPageType, Pass9Config, EnhancedSchemaResult)
// - types/publication.ts - Publication types (PublicationStatus, TopicPublicationPlan)
// - types/navigation.ts - Navigation types (FoundationPage, NavigationStructure, NAPData, TOCEntry, Hreflang)
// - types/migration.ts - Migration types (TransitionStatus, MapMergeState, SiteInventoryItem, MigrationPlan)
// - types/siteAnalysis.ts - Site analysis types (SiteAnalysisProject, SitePageRecord, JinaExtraction)
// - types/structuralAnalysis.ts - Structural analysis types (StructuralAnalysis, HeadingNode, EntityProminence)
// - types/contentGeneration.ts - Content generation types (ContentGenerationJob, PassesStatus, PASS_NAMES)
// - types/contentTemplates.ts - Content template routing types
// - types/competitiveIntelligence.ts - Competitive intelligence (GapNode, CompetitorGapNetwork, MentionScanner)
// - types/hero.ts - Hero image editor types (HeroLayerConfig, HeroValidationResult, HeroEditorState)
// - types/social.ts - Social media publishing types (campaigns, posts, compliance)
// - types/wave.ts - Wave types (WaveConfiguration, Wave, WaveAssignmentResult, WaveProgress)

// Re-export KnowledgeGraph class
export { KnowledgeGraph } from './lib/knowledgeGraph';

// Re-export from domain modules
export * from './types/core';
export * from './types/business';
export * from './types/semantic';
export * from './types/content';
export * from './types/audit';
export * from './types/schema';
export * from './types/publication';
export * from './types/navigation';
export * from './types/migration';
export * from './types/siteAnalysis';
export * from './types/structuralAnalysis';
export * from './types/contentGeneration';
export * from './types/contentTemplates';
export * from './types/competitiveIntelligence';
export * from './types/hero';
export * from './types/wordpress';
export * from './types/organization';
export * from './types/social';
export * from './types/contextualEditor';
export * from './types/quotation';
export * from './types/designDna';
export * from './types/entityHealth';
export * from './types/brandExtraction';
export * from './types/catalog';
export * from './types/wave';
export * from './types/dialogue';
