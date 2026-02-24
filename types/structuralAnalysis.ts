/**
 * Structural Analysis Types
 *
 * Rich HTML structural analysis per page: heading tree, content regions,
 * schema markup, entity prominence. Computed by the html-structure-analyzer
 * edge function and stored in site_analysis_pages.structural_analysis.
 *
 * @module types/structuralAnalysis
 */

// ============================================================================
// HEADING TREE
// ============================================================================

export interface HeadingNode {
  level: number;            // 1-6
  text: string;
  wordCountBelow: number;   // Words between this heading and next same-or-higher level
  entityMentions: number;   // CE mentions in this section's text
  children: HeadingNode[];  // Nested sub-headings
}

// ============================================================================
// CONTENT REGIONS
// ============================================================================

export interface RegionStats {
  wordCount: number;
  percentage: number;       // Of total page word count
  exists: boolean;          // Whether semantic tag was found
}

// ============================================================================
// SECTION ANALYSIS
// ============================================================================

export interface SectionAnalysis {
  heading: string;
  level: number;
  wordCount: number;
  paragraphCount: number;
  listCount: number;
  tableCount: number;
  imageCount: number;
  entityMentions: number;
  subSections: SectionAnalysis[];  // Nested H3s under H2
}

// ============================================================================
// ENTITY PROMINENCE
// ============================================================================

export interface EntityProminence {
  entity: string;           // The CE being measured
  inTitle: boolean;
  inH1: boolean;
  inFirstH2: boolean;
  inMetaDescription: boolean;
  totalMentions: number;
  mainContentMentions: number;
  sidebarMentions: number;
  footerMentions: number;
  firstMentionPosition: number;  // 0-1 scale (0 = start of main content)
  headingMentionRate: number;    // % of headings containing CE
}

// ============================================================================
// SCHEMA MARKUP
// ============================================================================

export interface SchemaBlock {
  type: string;             // e.g., "Organization", "Article", "FAQPage"
  properties: Record<string, unknown>;
  source: 'json-ld' | 'microdata' | 'rdfa';
}

// ============================================================================
// STRUCTURAL ANALYSIS (main type)
// ============================================================================

export interface StructuralAnalysis {
  headingTree: HeadingNode[];
  regions: {
    main:    RegionStats;
    sidebar: RegionStats;
    nav:     RegionStats;
    header:  RegionStats;
    footer:  RegionStats;
  };
  mainContentText: string;
  mainContentWordCount: number;
  sections: SectionAnalysis[];
  entityProminence: EntityProminence;
  schemaMarkup: SchemaBlock[];
  domMetrics: {
    totalNodes: number;
    mainContentNodes: number;
    nestingDepth: number;
    htmlSizeBytes: number;
  };
  analyzedAt: string;
  analyzerVersion: string;
}

// ============================================================================
// EDGE FUNCTION REQUEST/RESPONSE
// ============================================================================

export interface StructuralAnalysisRequest {
  url?: string;
  html?: string;
  centralEntity?: string;
  language?: string;
}

export interface StructuralAnalysisResponse {
  ok: boolean;
  analysis?: StructuralAnalysis;
  error?: string;
  processingTimeMs?: number;
}
