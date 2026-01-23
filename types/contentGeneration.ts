// types/contentGeneration.ts
// Content Generation V2 Types - Priority-based generation with user control

// ============================================================================
// PRIORITY & SETTINGS TYPES
// ============================================================================

/**
 * User-configurable priority weights for content generation.
 * Values should be 0-100 and ideally sum to 100 for balanced normalization.
 */
export interface ContentGenerationPriorities {
  humanReadability: number;      // Natural flow, engagement, readability
  businessConversion: number;    // CTAs, value props, action-oriented content
  machineOptimization: number;   // SEO signals, entity positioning, CoR reduction
  factualDensity: number;        // Information per sentence, EAV triples
}

/**
 * Content tone options
 */
export enum ContentTone {
  CONVERSATIONAL = 'conversational',
  PROFESSIONAL = 'professional',
  ACADEMIC = 'academic',
  SALES = 'sales',
}

/**
 * Audience expertise level
 */
export enum AudienceExpertise {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert',
}

// ============================================================================
// CONTENT LENGTH TYPES
// ============================================================================

/**
 * Content length presets based on Korayanese framework
 * - minimal: Bridge topics, definitions, simple queries (200-400 words)
 * - short: Outer topics, informational content (500-700 words)
 * - standard: Standard articles based on SERP analysis (dynamic)
 * - comprehensive: Core topics, quality nodes, pillar content (2000+ words)
 */
export type ContentLengthPreset = 'minimal' | 'short' | 'standard' | 'comprehensive';

/**
 * Preset configuration for content length
 */
export interface LengthPresetConfig {
  targetWords: number | 'serp';  // 'serp' means use SERP average
  maxSections: number;
  description: string;
  sectionWordRange: {
    min: number;
    max: number;
  };
}

/**
 * Content length preset definitions
 */
export const LENGTH_PRESETS: Record<ContentLengthPreset, LengthPresetConfig> = {
  minimal: {
    targetWords: 350,
    maxSections: 3,
    description: 'Bridge topics, definitions, simple queries',
    sectionWordRange: { min: 80, max: 150 }
  },
  short: {
    targetWords: 600,
    maxSections: 5,
    description: 'Outer topics, informational content',
    sectionWordRange: { min: 100, max: 180 }
  },
  standard: {
    targetWords: 'serp',  // Dynamic based on competitor analysis
    maxSections: 8,
    description: 'Standard articles based on SERP analysis',
    sectionWordRange: { min: 150, max: 300 }
  },
  comprehensive: {
    targetWords: 2000,
    maxSections: 12,
    description: 'Core topics, quality nodes, pillar content',
    sectionWordRange: { min: 200, max: 400 }
  }
};

/**
 * User-configurable content length settings
 */
export interface ContentLengthSettings {
  preset: ContentLengthPreset;
  targetWordCount?: number;        // User override (optional, takes precedence)
  maxSections?: number;            // User override for max sections
  respectTopicType: boolean;       // Auto-adjust for core vs outer topics
}

/**
 * Default content length settings
 */
export const DEFAULT_CONTENT_LENGTH_SETTINGS: ContentLengthSettings = {
  preset: 'standard',
  respectTopicType: true
};

/**
 * Configuration for individual refinement passes
 */
export interface PassConfig {
  enabled: boolean;
  storeVersion: boolean;
  requireApproval?: boolean;  // If true, pause before this pass
}

/**
 * Full pass configuration object matching database schema
 */
/**
 * CORRECT 10-PASS KEY ORDER (matches pass implementations):
 * Pass 4 is Discourse, Pass 6 is Visuals, Pass 8 is Polish, Pass 9 is Audit
 */
export interface PassConfigMap {
  pass_2_headers: PassConfig;
  pass_3_lists: PassConfig;
  pass_4_discourse: PassConfig;
  pass_5_microsemantics: PassConfig;
  pass_6_visuals: PassConfig;
  pass_7_intro: PassConfig;
  pass_8_polish: PassConfig;
  pass_9_audit: PassConfig;
}

/**
 * Content Generation Settings - stored per user/map
 */
export interface ContentGenerationSettings {
  id: string;
  userId: string;
  mapId?: string;
  name: string;
  isDefault: boolean;

  // Priority weights
  priorities: ContentGenerationPriorities;

  // Style configuration
  tone: ContentTone;
  audienceExpertise: AudienceExpertise;

  // Content length control
  contentLength: ContentLengthSettings;

  // Pass control
  checkpointAfterPass1: boolean;
  passes: PassConfigMap;

  // Validation & Debug settings
  validationMode: 'soft' | 'hard' | 'checkpoint';  // soft=warn, hard=fail, checkpoint=pause
  storePassSnapshots: boolean;  // Store content before/after each pass for debugging
  enableDebugExport: boolean;   // Allow exporting full generation data

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for content_generation_settings
 */
export interface ContentGenerationSettingsRow {
  id: string;
  user_id: string;
  map_id: string | null;
  name: string;
  is_default: boolean;
  priority_human_readability: number;
  priority_business_conversion: number;
  priority_machine_optimization: number;
  priority_factual_density: number;
  tone: string;
  audience_expertise: string;
  // Content length columns
  length_preset: string;
  target_word_count: number | null;
  max_sections: number | null;
  respect_topic_type: boolean;
  pass_config: {
    checkpoint_after_pass_1: boolean;
    passes: Record<string, { enabled: boolean; store_version: boolean }>;
    validation_mode?: 'soft' | 'hard' | 'checkpoint';
    store_pass_snapshots?: boolean;
    enable_debug_export?: boolean;
  };
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PROMPT TEMPLATE TYPES
// ============================================================================

/**
 * Variable that can be used in a prompt template
 */
export interface PromptVariable {
  name: string;                                    // e.g., "section.heading"
  description: string;                             // Human-readable description
  source: 'brief' | 'businessInfo' | 'settings' | 'section' | 'computed';
  example: string;                                 // Example value
}

/**
 * User-customizable prompt template
 */
export interface PromptTemplate {
  id: string;
  userId: string;
  promptKey: string;                               // e.g., 'pass_1_section', 'pass_2_headers'
  name: string;
  description: string;
  templateContent: string;                         // Uses {{variables}} syntax
  availableVariables: PromptVariable[];
  version: number;
  isActive: boolean;
  parentVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for prompt_templates
 */
export interface PromptTemplateRow {
  id: string;
  user_id: string;
  prompt_key: string;
  name: string;
  description: string | null;
  template_content: string;
  available_variables: PromptVariable[];
  version: number;
  is_active: boolean;
  parent_version_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Available prompt keys (for type safety)
 */
export type PromptKey =
  | 'pass_1_section'
  | 'pass_2_headers'
  | 'pass_3_lists'
  | 'pass_4_discourse'
  | 'pass_5_microsemantics'
  | 'pass_6_visuals'
  | 'pass_7_intro'
  | 'pass_8_polish'
  | 'pass_9_audit';

// ============================================================================
// CONTENT VERSION TYPES
// ============================================================================

/**
 * Section-level compliance result
 */
export interface SectionCompliance {
  sectionKey: string;
  sectionHeading: string;
  compliant: boolean;
  issues: string[];
}

/**
 * Link compliance result
 */
export interface LinkCompliance {
  targetTopic: string;
  anchorText: string;
  found: boolean;
  correctPosition: boolean;
  issues: string[];
}

/**
 * Full compliance audit result for a content version
 */
export interface ComplianceAuditResult {
  // Brief compliance checks
  subordinateTextCompliance: SectionCompliance[];
  methodologyCompliance: SectionCompliance[];
  featuredSnippetCompliance: boolean;
  internalLinkCompliance: LinkCompliance[];

  // Quality metrics
  eachSentenceHasEAV: boolean;
  noRepetitiveOpenings: boolean;
  languageCorrect: boolean;
  toneMatches: boolean;

  // Business metrics
  ctaPresent: boolean;
  valuePropositionClear: boolean;

  // Scores (0-100)
  briefComplianceScore: number;
  qualityScore: number;
  businessScore: number;
  overallScore: number;

  // Improvement suggestions
  suggestions: string[];
}

/**
 * Content version stored after each pass
 */
export interface ContentVersion {
  id: string;
  jobId: string;
  passNumber: number;
  versionNumber: number;
  content: string;
  wordCount: number;
  complianceAudit: ComplianceAuditResult | null;
  complianceScore: number | null;
  settingsSnapshot: ContentGenerationSettings | null;
  promptUsed: string | null;
  isActive: boolean;
  revertedAt: string | null;
  revertedBy: string | null;
  createdAt: string;
}

/**
 * Database row format for content_versions
 */
export interface ContentVersionRow {
  id: string;
  job_id: string;
  pass_number: number;
  version_number: number;
  content: string;
  word_count: number | null;
  compliance_audit: ComplianceAuditResult | null;
  compliance_score: number | null;
  settings_snapshot: Record<string, unknown> | null;
  prompt_used: string | null;
  is_active: boolean;
  reverted_at: string | null;
  reverted_by: string | null;
  created_at: string;
}

// ============================================================================
// BRIEF COMPLIANCE TYPES
// ============================================================================

/**
 * Importance level for missing fields
 */
export enum FieldImportance {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Description of a missing field in the content brief
 */
export interface MissingField {
  field: string;                    // Field path (e.g., 'structured_outline', 'subordinate_text_hints')
  importance: FieldImportance;
  description: string;              // Human-readable description
  canAutoGenerate: boolean;         // Whether AI can suggest a value
}

/**
 * Auto-generated suggestion for a missing field
 */
export interface AutoSuggestion {
  field: string;                    // Field path
  suggestedValue: unknown;          // The suggested value
  confidence: number;               // 0-1 confidence score
  source: string;                   // How the suggestion was generated
}

/**
 * Featured snippet target configuration for brief compliance
 */
export interface BriefFeaturedSnippetTarget {
  type: 'paragraph' | 'ordered_list' | 'unordered_list' | 'table';
  target: string;                   // The query this targets
  format: string;                   // Format instructions
  maxLength?: number;               // For paragraph snippets
  maxItems?: number;                // For list snippets
}

/**
 * Complete brief compliance check result
 */
export interface BriefComplianceCheck {
  // Required field checks
  hasStructuredOutline: boolean;
  hasSubordinateTextHints: boolean;
  hasMethodologyNotes: boolean;
  hasSerpAnalysis: boolean;
  hasFeaturedSnippetTarget: boolean;
  hasContextualBridge: boolean;
  hasDiscourseAnchors: boolean;

  // Business field checks
  hasBusinessGoal: boolean;
  hasCTA: boolean;
  hasTargetAudience: boolean;

  // Overall results
  score: number;                    // 0-100 overall compliance score
  missingFields: MissingField[];
  suggestions: AutoSuggestion[];
}

/**
 * Database row format for brief_compliance_checks
 */
export interface BriefComplianceCheckRow {
  id: string;
  brief_id: string;
  user_id: string;
  check_results: BriefComplianceCheck;
  overall_score: number | null;
  missing_fields: MissingField[];
  auto_suggestions: AutoSuggestion[];
  suggestions_applied: boolean;
  applied_at: string | null;
  created_at: string;
}

// ============================================================================
// PROMPT CONTEXT TYPES (for building prompts)
// ============================================================================

/**
 * Section definition for prompt building
 */
export interface SectionDefinition {
  key: string;
  heading: string;
  level: number;                    // H2, H3, etc.
  order: number;                    // Position in article
  subordinateTextHint?: string;
  methodologyNote?: string;
  /** Section type - intro/conclusion headings can be AI-generated */
  section_type?: 'introduction' | 'conclusion' | 'body';
  /** When true, AI should generate appropriate heading (not use pre-defined) */
  generateHeading?: boolean;
}

/**
 * Previously generated section for context continuity
 */
export interface GeneratedSection {
  key: string;
  heading: string;
  content: string;
}

/**
 * Full context for building a section prompt
 */
export interface PromptContext {
  section: SectionDefinition;
  brief: unknown;                   // ContentBrief from types.ts
  businessInfo: unknown;            // BusinessInfo from types.ts
  settings: ContentGenerationSettings;
  allSections: SectionDefinition[];
  previousSections?: GeneratedSection[];
}

// ============================================================================
// PRESETS
// ============================================================================

/**
 * Preset configurations for common use cases
 */
export const PRIORITY_PRESETS: Record<string, ContentGenerationPriorities> = {
  balanced: {
    humanReadability: 40,
    businessConversion: 25,
    machineOptimization: 20,
    factualDensity: 15
  },
  seo_focused: {
    humanReadability: 25,
    businessConversion: 15,
    machineOptimization: 40,
    factualDensity: 20
  },
  conversion_focused: {
    humanReadability: 30,
    businessConversion: 45,
    machineOptimization: 15,
    factualDensity: 10
  },
  academic: {
    humanReadability: 25,
    businessConversion: 10,
    machineOptimization: 20,
    factualDensity: 45
  },
  reader_first: {
    humanReadability: 55,
    businessConversion: 20,
    machineOptimization: 15,
    factualDensity: 10
  }
};

/**
 * Default settings for new users
 */
export const DEFAULT_CONTENT_GENERATION_SETTINGS: Omit<ContentGenerationSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  name: 'Default',
  isDefault: true,
  mapId: undefined,
  priorities: PRIORITY_PRESETS.balanced,
  tone: ContentTone.PROFESSIONAL,
  audienceExpertise: AudienceExpertise.INTERMEDIATE,
  contentLength: DEFAULT_CONTENT_LENGTH_SETTINGS,
  checkpointAfterPass1: false,
  passes: {
    pass_2_headers: { enabled: true, storeVersion: true },
    pass_3_lists: { enabled: true, storeVersion: true },
    pass_4_discourse: { enabled: true, storeVersion: true },
    pass_5_microsemantics: { enabled: true, storeVersion: true },
    pass_6_visuals: { enabled: true, storeVersion: true },
    pass_7_intro: { enabled: true, storeVersion: true },
    pass_8_polish: { enabled: true, storeVersion: true },
    pass_9_audit: { enabled: true, storeVersion: false }
  },
  // Validation & Debug - default to hard mode for quality control
  validationMode: 'hard',
  storePassSnapshots: true,
  enableDebugExport: true
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert database row to TypeScript interface
 */
export function settingsRowToInterface(row: ContentGenerationSettingsRow): ContentGenerationSettings {
  return {
    id: row.id,
    userId: row.user_id,
    mapId: row.map_id ?? undefined,
    name: row.name,
    isDefault: row.is_default,
    priorities: {
      humanReadability: row.priority_human_readability,
      businessConversion: row.priority_business_conversion,
      machineOptimization: row.priority_machine_optimization,
      factualDensity: row.priority_factual_density
    },
    tone: row.tone as ContentTone,
    audienceExpertise: row.audience_expertise as AudienceExpertise,
    contentLength: {
      preset: (row.length_preset as ContentLengthPreset) ?? 'standard',
      targetWordCount: row.target_word_count ?? undefined,
      maxSections: row.max_sections ?? undefined,
      respectTopicType: row.respect_topic_type ?? true
    },
    checkpointAfterPass1: row.pass_config.checkpoint_after_pass_1,
    passes: {
      pass_2_headers: {
        enabled: row.pass_config.passes.pass_2_headers?.enabled ?? true,
        storeVersion: row.pass_config.passes.pass_2_headers?.store_version ?? true
      },
      pass_3_lists: {
        enabled: row.pass_config.passes.pass_3_lists?.enabled ?? true,
        storeVersion: row.pass_config.passes.pass_3_lists?.store_version ?? true
      },
      pass_4_discourse: {
        enabled: row.pass_config.passes.pass_4_discourse?.enabled ?? true,
        storeVersion: row.pass_config.passes.pass_4_discourse?.store_version ?? true
      },
      pass_5_microsemantics: {
        enabled: row.pass_config.passes.pass_5_microsemantics?.enabled ?? true,
        storeVersion: row.pass_config.passes.pass_5_microsemantics?.store_version ?? true
      },
      pass_6_visuals: {
        enabled: row.pass_config.passes.pass_6_visuals?.enabled ?? true,
        storeVersion: row.pass_config.passes.pass_6_visuals?.store_version ?? true
      },
      pass_7_intro: {
        enabled: row.pass_config.passes.pass_7_intro?.enabled ?? true,
        storeVersion: row.pass_config.passes.pass_7_intro?.store_version ?? true
      },
      pass_8_polish: {
        enabled: row.pass_config.passes.pass_8_polish?.enabled ?? true,
        storeVersion: row.pass_config.passes.pass_8_polish?.store_version ?? true
      },
      pass_9_audit: {
        enabled: row.pass_config.passes.pass_9_audit?.enabled ?? true,
        storeVersion: row.pass_config.passes.pass_9_audit?.store_version ?? false
      }
    },
    // Validation & Debug settings (with sensible defaults)
    validationMode: row.pass_config.validation_mode ?? 'hard',
    storePassSnapshots: row.pass_config.store_pass_snapshots ?? true,
    enableDebugExport: row.pass_config.enable_debug_export ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Convert TypeScript interface to database insert format
 */
export function settingsToDbInsert(
  settings: Omit<ContentGenerationSettings, 'id' | 'createdAt' | 'updatedAt'>
): Omit<ContentGenerationSettingsRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: settings.userId,
    map_id: settings.mapId ?? null,
    name: settings.name,
    is_default: settings.isDefault,
    priority_human_readability: settings.priorities.humanReadability,
    priority_business_conversion: settings.priorities.businessConversion,
    priority_machine_optimization: settings.priorities.machineOptimization,
    priority_factual_density: settings.priorities.factualDensity,
    tone: settings.tone,
    audience_expertise: settings.audienceExpertise,
    // Content length columns
    length_preset: settings.contentLength.preset,
    target_word_count: settings.contentLength.targetWordCount ?? null,
    max_sections: settings.contentLength.maxSections ?? null,
    respect_topic_type: settings.contentLength.respectTopicType,
    pass_config: {
      checkpoint_after_pass_1: settings.checkpointAfterPass1,
      passes: {
        pass_2_headers: { enabled: settings.passes.pass_2_headers.enabled, store_version: settings.passes.pass_2_headers.storeVersion },
        pass_3_lists: { enabled: settings.passes.pass_3_lists.enabled, store_version: settings.passes.pass_3_lists.storeVersion },
        pass_4_discourse: { enabled: settings.passes.pass_4_discourse.enabled, store_version: settings.passes.pass_4_discourse.storeVersion },
        pass_5_microsemantics: { enabled: settings.passes.pass_5_microsemantics.enabled, store_version: settings.passes.pass_5_microsemantics.storeVersion },
        pass_6_visuals: { enabled: settings.passes.pass_6_visuals.enabled, store_version: settings.passes.pass_6_visuals.storeVersion },
        pass_7_intro: { enabled: settings.passes.pass_7_intro.enabled, store_version: settings.passes.pass_7_intro.storeVersion },
        pass_8_polish: { enabled: settings.passes.pass_8_polish.enabled, store_version: settings.passes.pass_8_polish.storeVersion },
        pass_9_audit: { enabled: settings.passes.pass_9_audit.enabled, store_version: settings.passes.pass_9_audit.storeVersion }
      },
      // Validation & Debug settings
      validation_mode: settings.validationMode,
      store_pass_snapshots: settings.storePassSnapshots,
      enable_debug_export: settings.enableDebugExport
    }
  };
}

/**
 * Normalize priorities to sum to 100
 */
export function normalizePriorities(priorities: ContentGenerationPriorities): ContentGenerationPriorities {
  const total = priorities.humanReadability + priorities.businessConversion +
                priorities.machineOptimization + priorities.factualDensity;

  if (total === 0) return PRIORITY_PRESETS.balanced;
  if (total === 100) return priorities;

  const factor = 100 / total;
  return {
    humanReadability: Math.round(priorities.humanReadability * factor),
    businessConversion: Math.round(priorities.businessConversion * factor),
    machineOptimization: Math.round(priorities.machineOptimization * factor),
    factualDensity: Math.round(priorities.factualDensity * factor)
  };
}
