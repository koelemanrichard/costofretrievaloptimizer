# Content Template Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement AI-driven template selection with reasoning, depth analyzer, and conflict resolution to ensure optimal content structure per website type and query intent.

**Architecture:** Template routing uses a layered approach: (1) `contentTemplates.ts` defines 12 template structures, (2) `templateRouter.ts` selects templates based on context with AI reasoning, (3) `depthAnalyzer.ts` suggests content depth based on competition, (4) `conflictResolver.ts` detects and resolves brief/template mismatches while maintaining single source of truth.

**Tech Stack:** TypeScript, Vitest for testing, existing content generation pipeline in `services/ai/contentGeneration/`

---

## Task 1: Create Content Template Types

**Files:**
- Create: `types/contentTemplates.ts`

**Step 1: Write the type definitions**

```typescript
// types/contentTemplates.ts

import { FormatCode, ContentZone } from './content';
import { AttributeCategory } from './semantic';
import { WebsiteType } from '../types';

/**
 * Template names for content generation
 */
export type TemplateName =
  | 'DEFINITIONAL'
  | 'PROCESS_HOWTO'
  | 'ECOMMERCE_PRODUCT'
  | 'COMPARISON'
  | 'HEALTHCARE_YMYL'
  | 'SAAS_FEATURE'
  | 'NEWS_ARTICLE'
  | 'LISTING_DIRECTORY'
  | 'EVENT_EXPERIENCE'
  | 'COURSE_EDUCATION'
  | 'IMPACT_NONPROFIT'
  | 'LOCATION_REALESTATE';

/**
 * Stylometry options for content tone
 */
export type Stylometry = 'ACADEMIC_FORMAL' | 'DIRECT_TECHNICAL' | 'PERSUASIVE_SALES' | 'INSTRUCTIONAL_CLEAR';

/**
 * Section template within a content template
 */
export interface SectionTemplate {
  /** Heading pattern with {entity} placeholder */
  headingPattern: string;
  /** Default format code for this section */
  formatCode: FormatCode;
  /** Attribute category for ordering */
  attributeCategory: AttributeCategory;
  /** Content zone classification */
  contentZone: ContentZone;
  /** Whether this section is required */
  required: boolean;
  /** Order in the template (1-based) */
  order: number;
}

/**
 * Full template configuration
 */
export interface TemplateConfig {
  /** Template identifier */
  templateName: TemplateName;
  /** Human-readable label */
  label: string;
  /** Template description */
  description: string;
  /** Section structure */
  sectionStructure: SectionTemplate[];
  /** Default format codes by section type */
  formatCodeDefaults: Partial<Record<string, FormatCode>>;
  /** Attribute ordering override */
  attributeOrderOverride?: AttributeCategory[];
  /** Maximum sections for this template */
  maxSections: number;
  /** Minimum sections for this template */
  minSections: number;
  /** CSI predicates for linking */
  csiPredicates: string[];
  /** Default stylometry */
  stylometry: Stylometry;
}

/**
 * Input for template selection
 */
export interface TemplateRouterInput {
  websiteType: WebsiteType;
  queryIntent: 'informational' | 'transactional' | 'commercial' | 'navigational';
  queryType: string;
  topicType: 'core' | 'outer' | 'child';
  topicClass: 'monetization' | 'informational';
  competitorAnalysis?: {
    dominantFormat: string;
    avgSectionCount: number;
    avgWordCount: number;
  };
  briefHints?: {
    hasComparisonSections: boolean;
    hasStepSections: boolean;
    hasSpecsSections: boolean;
  };
}

/**
 * Result from template selection with AI reasoning
 */
export interface TemplateSelectionResult {
  template: TemplateConfig;
  confidence: number;
  reasoning: string[];
  alternatives: Array<{
    templateName: TemplateName;
    reason: string;
  }>;
}

/**
 * Depth suggestion modes
 */
export type DepthMode = 'high-quality' | 'quick-publish' | 'moderate';

/**
 * Input for depth analysis
 */
export interface DepthAnalyzerInput {
  competitorWordCounts: number[];
  serpDifficulty: 'low' | 'medium' | 'high';
  queryIntent: string;
  topicType: 'core' | 'outer' | 'child';
  existingTopicalAuthority: number;
}

/**
 * Depth suggestion result
 */
export interface DepthSuggestion {
  recommended: DepthMode;
  reasoning: string[];
  competitorBenchmark: {
    avgWordCount: number;
    avgSections: number;
    topPerformerWordCount: number;
  };
  settings: {
    maxSections: number;
    targetWordCount: { min: number; max: number };
    sectionDepth: 'comprehensive' | 'moderate' | 'brief';
  };
}

/**
 * Conflict item between template and brief
 */
export interface ConflictItem {
  field: string;
  briefValue: unknown;
  templateValue: unknown;
  severity: 'minor' | 'moderate' | 'critical';
  semanticSeoArgument: string;
}

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: ConflictItem[];
  overallSeverity: 'minor' | 'moderate' | 'critical';
  aiRecommendation: {
    action: 'use-template' | 'use-brief' | 'merge';
    reasoning: string[];
  };
}
```

**Step 2: Export from types index**

Add to `types/index.ts`:
```typescript
export * from './contentTemplates';
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add types/contentTemplates.ts types/index.ts
git commit -m "feat(types): add content template types for routing system"
```

---

## Task 2: Create Content Templates Configuration

**Files:**
- Create: `config/contentTemplates.ts`
- Test: `config/__tests__/contentTemplates.test.ts`

**Step 1: Write the failing test**

```typescript
// config/__tests__/contentTemplates.test.ts
import { describe, it, expect } from 'vitest';
import { CONTENT_TEMPLATES, getTemplateByName, getTemplateForWebsiteType } from '../contentTemplates';

describe('contentTemplates', () => {
  describe('CONTENT_TEMPLATES', () => {
    it('should have 12 template definitions', () => {
      expect(Object.keys(CONTENT_TEMPLATES)).toHaveLength(12);
    });

    it('should have DEFINITIONAL template with required sections', () => {
      const template = CONTENT_TEMPLATES.DEFINITIONAL;
      expect(template.templateName).toBe('DEFINITIONAL');
      expect(template.sectionStructure.length).toBeGreaterThan(0);
      expect(template.sectionStructure.some(s => s.required)).toBe(true);
    });

    it('should have valid format codes for all sections', () => {
      const validCodes = ['FS', 'PAA', 'LISTING', 'DEFINITIVE', 'TABLE', 'PROSE'];
      for (const [name, template] of Object.entries(CONTENT_TEMPLATES)) {
        for (const section of template.sectionStructure) {
          expect(validCodes).toContain(section.formatCode);
        }
      }
    });
  });

  describe('getTemplateByName', () => {
    it('should return template by name', () => {
      const template = getTemplateByName('DEFINITIONAL');
      expect(template?.templateName).toBe('DEFINITIONAL');
    });

    it('should return undefined for unknown template', () => {
      const template = getTemplateByName('UNKNOWN' as any);
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplateForWebsiteType', () => {
    it('should return ECOMMERCE_PRODUCT for ECOMMERCE website', () => {
      const template = getTemplateForWebsiteType('ECOMMERCE');
      expect(template.templateName).toBe('ECOMMERCE_PRODUCT');
    });

    it('should return DEFINITIONAL for INFORMATIONAL website', () => {
      const template = getTemplateForWebsiteType('INFORMATIONAL');
      expect(template.templateName).toBe('DEFINITIONAL');
    });

    it('should return HEALTHCARE_YMYL for HEALTHCARE website', () => {
      const template = getTemplateForWebsiteType('HEALTHCARE');
      expect(template.templateName).toBe('HEALTHCARE_YMYL');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run config/__tests__/contentTemplates.test.ts`
Expected: FAIL - module not found

**Step 3: Create the config directory test folder if needed**

```bash
mkdir -p config/__tests__
```

**Step 4: Write the implementation**

```typescript
// config/contentTemplates.ts
/**
 * Content Templates Configuration
 *
 * Defines 12 distinct template structures for different content types
 * based on the Semantic SEO framework (Koray Tugberk GUBUR).
 *
 * Templates are mapped to website types and query intents for optimal
 * Cost of Retrieval reduction.
 */

import {
  TemplateConfig,
  TemplateName,
  SectionTemplate,
} from '../types/contentTemplates';
import { FormatCode, ContentZone } from '../types/content';
import { WebsiteType } from '../types';

// =============================================================================
// TEMPLATE DEFINITIONS
// =============================================================================

export const CONTENT_TEMPLATES: Record<TemplateName, TemplateConfig> = {
  DEFINITIONAL: {
    templateName: 'DEFINITIONAL',
    label: 'Definitional Article',
    description: 'Informational article explaining what something is',
    sectionStructure: [
      { headingPattern: 'What is {entity}?', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'Key Characteristics of {entity}', formatCode: FormatCode.LISTING, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'Types of {entity}', formatCode: FormatCode.LISTING, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: false, order: 3 },
      { headingPattern: 'Benefits of {entity}', formatCode: FormatCode.LISTING, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: false, order: 4 },
      { headingPattern: '{entity} vs {alternative}', formatCode: FormatCode.TABLE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 5 },
      { headingPattern: 'How to Use {entity}', formatCode: FormatCode.LISTING, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 6 },
      { headingPattern: 'Common Mistakes with {entity}', formatCode: FormatCode.PAA, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 7 },
      { headingPattern: 'Frequently Asked Questions', formatCode: FormatCode.PAA, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 8 },
    ],
    formatCodeDefaults: {
      definition: FormatCode.FS,
      list: FormatCode.LISTING,
      comparison: FormatCode.TABLE,
      faq: FormatCode.PAA,
    },
    attributeOrderOverride: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    maxSections: 8,
    minSections: 3,
    csiPredicates: ['learn', 'understand', 'discover', 'define'],
    stylometry: 'INSTRUCTIONAL_CLEAR',
  },

  PROCESS_HOWTO: {
    templateName: 'PROCESS_HOWTO',
    label: 'How-To Guide',
    description: 'Step-by-step process or tutorial',
    sectionStructure: [
      { headingPattern: 'How to {action} {entity}', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'What You Will Need', formatCode: FormatCode.LISTING, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'Step 1: {first_action}', formatCode: FormatCode.DEFINITIVE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 3 },
      { headingPattern: 'Step 2: {second_action}', formatCode: FormatCode.DEFINITIVE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: false, order: 4 },
      { headingPattern: 'Step 3: {third_action}', formatCode: FormatCode.DEFINITIVE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: false, order: 5 },
      { headingPattern: 'Common Problems and Solutions', formatCode: FormatCode.PAA, attributeCategory: 'RARE', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 6 },
      { headingPattern: 'Expected Results', formatCode: FormatCode.PROSE, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 7 },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      prerequisites: FormatCode.LISTING,
      step: FormatCode.DEFINITIVE,
      troubleshooting: FormatCode.PAA,
    },
    attributeOrderOverride: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    maxSections: 10,
    minSections: 4,
    csiPredicates: ['do', 'make', 'create', 'build', 'setup'],
    stylometry: 'INSTRUCTIONAL_CLEAR',
  },

  ECOMMERCE_PRODUCT: {
    templateName: 'ECOMMERCE_PRODUCT',
    label: 'Product Page',
    description: 'E-commerce product with features and specifications',
    sectionStructure: [
      { headingPattern: '{product} Overview', formatCode: FormatCode.FS, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'Key Features', formatCode: FormatCode.LISTING, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'Specifications', formatCode: FormatCode.TABLE, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 3 },
      { headingPattern: 'Who Is This For?', formatCode: FormatCode.PROSE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 4 },
      { headingPattern: '{product} vs {alternative}', formatCode: FormatCode.TABLE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 5 },
      { headingPattern: 'Customer Reviews', formatCode: FormatCode.LISTING, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 6 },
      { headingPattern: 'Frequently Asked Questions', formatCode: FormatCode.PAA, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 7 },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      features: FormatCode.LISTING,
      specs: FormatCode.TABLE,
      comparison: FormatCode.TABLE,
      faq: FormatCode.PAA,
    },
    attributeOrderOverride: ['UNIQUE', 'ROOT', 'RARE', 'COMMON'],
    maxSections: 8,
    minSections: 3,
    csiPredicates: ['buy', 'compare', 'choose', 'purchase'],
    stylometry: 'PERSUASIVE_SALES',
  },

  COMPARISON: {
    templateName: 'COMPARISON',
    label: 'Comparison Article',
    description: 'Side-by-side comparison of two or more options',
    sectionStructure: [
      { headingPattern: '{optionA} vs {optionB}: Quick Verdict', formatCode: FormatCode.FS, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'Quick Comparison', formatCode: FormatCode.TABLE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'What is {optionA}?', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 3 },
      { headingPattern: 'What is {optionB}?', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 4 },
      { headingPattern: 'Key Differences', formatCode: FormatCode.TABLE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 5 },
      { headingPattern: 'When to Choose {optionA}', formatCode: FormatCode.PROSE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 6 },
      { headingPattern: 'When to Choose {optionB}', formatCode: FormatCode.PROSE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 7 },
      { headingPattern: 'Our Verdict', formatCode: FormatCode.PROSE, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 8 },
    ],
    formatCodeDefaults: {
      verdict: FormatCode.FS,
      comparison: FormatCode.TABLE,
      definition: FormatCode.FS,
      useCase: FormatCode.PROSE,
    },
    attributeOrderOverride: ['UNIQUE', 'ROOT', 'RARE', 'COMMON'],
    maxSections: 8,
    minSections: 5,
    csiPredicates: ['compare', 'versus', 'difference', 'better'],
    stylometry: 'DIRECT_TECHNICAL',
  },

  HEALTHCARE_YMYL: {
    templateName: 'HEALTHCARE_YMYL',
    label: 'Healthcare/YMYL Article',
    description: 'Medical or health-related content with strict accuracy requirements',
    sectionStructure: [
      { headingPattern: 'What is {condition}?', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'Causes and Risk Factors', formatCode: FormatCode.LISTING, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'Symptoms', formatCode: FormatCode.LISTING, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 3 },
      { headingPattern: 'Diagnosis', formatCode: FormatCode.PROSE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: false, order: 4 },
      { headingPattern: 'Treatment Options', formatCode: FormatCode.TABLE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 5 },
      { headingPattern: 'Prevention', formatCode: FormatCode.LISTING, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 6 },
      { headingPattern: 'When to See a Doctor', formatCode: FormatCode.PAA, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: true, order: 7 },
      { headingPattern: 'Frequently Asked Questions', formatCode: FormatCode.PAA, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 8 },
    ],
    formatCodeDefaults: {
      definition: FormatCode.FS,
      symptoms: FormatCode.LISTING,
      treatment: FormatCode.TABLE,
      faq: FormatCode.PAA,
    },
    attributeOrderOverride: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    maxSections: 8,
    minSections: 5,
    csiPredicates: ['treat', 'diagnose', 'prevent', 'cure'],
    stylometry: 'ACADEMIC_FORMAL',
  },

  SAAS_FEATURE: {
    templateName: 'SAAS_FEATURE',
    label: 'SaaS Feature Page',
    description: 'Software feature with capabilities and use cases',
    sectionStructure: [
      { headingPattern: 'What is {feature}?', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'Key Capabilities', formatCode: FormatCode.LISTING, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'Use Cases', formatCode: FormatCode.LISTING, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 3 },
      { headingPattern: 'How It Works', formatCode: FormatCode.DEFINITIVE, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: false, order: 4 },
      { headingPattern: 'Integration Options', formatCode: FormatCode.TABLE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 5 },
      { headingPattern: '{feature} vs Alternatives', formatCode: FormatCode.TABLE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 6 },
      { headingPattern: 'Getting Started', formatCode: FormatCode.LISTING, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 7 },
    ],
    formatCodeDefaults: {
      definition: FormatCode.FS,
      capabilities: FormatCode.LISTING,
      howItWorks: FormatCode.DEFINITIVE,
      integrations: FormatCode.TABLE,
    },
    attributeOrderOverride: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    maxSections: 7,
    minSections: 3,
    csiPredicates: ['generate', 'automate', 'manage', 'track', 'integrate'],
    stylometry: 'DIRECT_TECHNICAL',
  },

  NEWS_ARTICLE: {
    templateName: 'NEWS_ARTICLE',
    label: 'News Article',
    description: 'News or media article with timely information',
    sectionStructure: [
      { headingPattern: '{headline}', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'Background', formatCode: FormatCode.PROSE, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'What Happened', formatCode: FormatCode.DEFINITIVE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 3 },
      { headingPattern: 'Reactions', formatCode: FormatCode.LISTING, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: false, order: 4 },
      { headingPattern: 'What This Means', formatCode: FormatCode.PROSE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 5 },
      { headingPattern: 'What\'s Next', formatCode: FormatCode.PROSE, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 6 },
    ],
    formatCodeDefaults: {
      headline: FormatCode.FS,
      background: FormatCode.PROSE,
      details: FormatCode.DEFINITIVE,
      reactions: FormatCode.LISTING,
    },
    attributeOrderOverride: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    maxSections: 6,
    minSections: 3,
    csiPredicates: ['report', 'investigate', 'analyze', 'announce'],
    stylometry: 'ACADEMIC_FORMAL',
  },

  LISTING_DIRECTORY: {
    templateName: 'LISTING_DIRECTORY',
    label: 'Directory/Listing Page',
    description: 'Directory or listing of items in a category',
    sectionStructure: [
      { headingPattern: 'About {category}', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'Top {category} in {location}', formatCode: FormatCode.LISTING, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'How to Choose {category}', formatCode: FormatCode.PROSE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: false, order: 3 },
      { headingPattern: '{category} Comparison', formatCode: FormatCode.TABLE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 4 },
      { headingPattern: 'Frequently Asked Questions', formatCode: FormatCode.PAA, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 5 },
    ],
    formatCodeDefaults: {
      about: FormatCode.FS,
      listings: FormatCode.LISTING,
      comparison: FormatCode.TABLE,
      faq: FormatCode.PAA,
    },
    attributeOrderOverride: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    maxSections: 6,
    minSections: 2,
    csiPredicates: ['find', 'search', 'connect', 'discover'],
    stylometry: 'DIRECT_TECHNICAL',
  },

  EVENT_EXPERIENCE: {
    templateName: 'EVENT_EXPERIENCE',
    label: 'Event/Experience Page',
    description: 'Event or experience with schedule and details',
    sectionStructure: [
      { headingPattern: 'Event Overview', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'Schedule & Highlights', formatCode: FormatCode.LISTING, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'Who Should Attend', formatCode: FormatCode.PROSE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: false, order: 3 },
      { headingPattern: 'Ticket Options', formatCode: FormatCode.TABLE, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: false, order: 4 },
      { headingPattern: 'Location & Travel', formatCode: FormatCode.PROSE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 5 },
      { headingPattern: 'Frequently Asked Questions', formatCode: FormatCode.PAA, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 6 },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      schedule: FormatCode.LISTING,
      tickets: FormatCode.TABLE,
      faq: FormatCode.PAA,
    },
    attributeOrderOverride: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    maxSections: 6,
    minSections: 2,
    csiPredicates: ['attend', 'register', 'experience', 'participate'],
    stylometry: 'PERSUASIVE_SALES',
  },

  COURSE_EDUCATION: {
    templateName: 'COURSE_EDUCATION',
    label: 'Course/Education Page',
    description: 'Educational course with curriculum and outcomes',
    sectionStructure: [
      { headingPattern: 'Course Overview', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'What You Will Learn', formatCode: FormatCode.LISTING, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'Prerequisites', formatCode: FormatCode.LISTING, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: false, order: 3 },
      { headingPattern: 'Course Structure', formatCode: FormatCode.TABLE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: false, order: 4 },
      { headingPattern: 'Who Is This For?', formatCode: FormatCode.PROSE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 5 },
      { headingPattern: 'Instructor Profile', formatCode: FormatCode.PROSE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 6 },
      { headingPattern: 'Student Outcomes', formatCode: FormatCode.LISTING, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 7 },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      curriculum: FormatCode.LISTING,
      structure: FormatCode.TABLE,
      outcomes: FormatCode.LISTING,
    },
    attributeOrderOverride: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    maxSections: 7,
    minSections: 2,
    csiPredicates: ['learn', 'enroll', 'master', 'study'],
    stylometry: 'INSTRUCTIONAL_CLEAR',
  },

  IMPACT_NONPROFIT: {
    templateName: 'IMPACT_NONPROFIT',
    label: 'Impact/Nonprofit Page',
    description: 'Nonprofit or cause-related content with impact metrics',
    sectionStructure: [
      { headingPattern: 'Our Mission', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'The Problem We\'re Solving', formatCode: FormatCode.PROSE, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'Our Approach', formatCode: FormatCode.LISTING, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 3 },
      { headingPattern: 'Impact So Far', formatCode: FormatCode.TABLE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: false, order: 4 },
      { headingPattern: 'How to Get Involved', formatCode: FormatCode.LISTING, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 5 },
      { headingPattern: 'Frequently Asked Questions', formatCode: FormatCode.PAA, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 6 },
    ],
    formatCodeDefaults: {
      mission: FormatCode.FS,
      approach: FormatCode.LISTING,
      impact: FormatCode.TABLE,
      faq: FormatCode.PAA,
    },
    attributeOrderOverride: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    maxSections: 6,
    minSections: 3,
    csiPredicates: ['donate', 'support', 'volunteer', 'help'],
    stylometry: 'PERSUASIVE_SALES',
  },

  LOCATION_REALESTATE: {
    templateName: 'LOCATION_REALESTATE',
    label: 'Location/Real Estate Page',
    description: 'Property or location with features and specifications',
    sectionStructure: [
      { headingPattern: 'Overview', formatCode: FormatCode.FS, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 1 },
      { headingPattern: 'Key Features', formatCode: FormatCode.LISTING, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: true, order: 2 },
      { headingPattern: 'Specifications', formatCode: FormatCode.TABLE, attributeCategory: 'ROOT', contentZone: ContentZone.MAIN, required: true, order: 3 },
      { headingPattern: 'Location & Neighborhood', formatCode: FormatCode.PROSE, attributeCategory: 'UNIQUE', contentZone: ContentZone.MAIN, required: false, order: 4 },
      { headingPattern: 'Similar Properties', formatCode: FormatCode.TABLE, attributeCategory: 'RARE', contentZone: ContentZone.MAIN, required: false, order: 5 },
      { headingPattern: 'Frequently Asked Questions', formatCode: FormatCode.PAA, attributeCategory: 'COMMON', contentZone: ContentZone.SUPPLEMENTARY, required: false, order: 6 },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      features: FormatCode.LISTING,
      specs: FormatCode.TABLE,
      comparison: FormatCode.TABLE,
      faq: FormatCode.PAA,
    },
    attributeOrderOverride: ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
    maxSections: 7,
    minSections: 3,
    csiPredicates: ['discover', 'invest', 'tour', 'buy'],
    stylometry: 'PERSUASIVE_SALES',
  },
};

// =============================================================================
// WEBSITE TYPE TO TEMPLATE MAPPING
// =============================================================================

/**
 * Maps website types to their primary template
 */
export const WEBSITE_TYPE_TEMPLATE_MAP: Record<WebsiteType, TemplateName> = {
  ECOMMERCE: 'ECOMMERCE_PRODUCT',
  SAAS: 'SAAS_FEATURE',
  SERVICE_B2B: 'DEFINITIONAL',
  INFORMATIONAL: 'DEFINITIONAL',
  AFFILIATE_REVIEW: 'COMPARISON',
  HEALTHCARE: 'HEALTHCARE_YMYL',
  LEAD_GENERATION: 'DEFINITIONAL',
  REAL_ESTATE: 'LOCATION_REALESTATE',
  MARKETPLACE: 'ECOMMERCE_PRODUCT',
  RECRUITMENT: 'LISTING_DIRECTORY',
  EDUCATION: 'COURSE_EDUCATION',
  HOSPITALITY: 'EVENT_EXPERIENCE',
  NEWS_MEDIA: 'NEWS_ARTICLE',
  DIRECTORY: 'LISTING_DIRECTORY',
  COMMUNITY: 'DEFINITIONAL',
  NONPROFIT: 'IMPACT_NONPROFIT',
  EVENTS: 'EVENT_EXPERIENCE',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get template by name
 */
export function getTemplateByName(name: TemplateName): TemplateConfig | undefined {
  return CONTENT_TEMPLATES[name];
}

/**
 * Get primary template for a website type
 */
export function getTemplateForWebsiteType(websiteType: WebsiteType): TemplateConfig {
  const templateName = WEBSITE_TYPE_TEMPLATE_MAP[websiteType] || 'DEFINITIONAL';
  return CONTENT_TEMPLATES[templateName];
}

/**
 * Get all available template names
 */
export function getAllTemplateNames(): TemplateName[] {
  return Object.keys(CONTENT_TEMPLATES) as TemplateName[];
}

/**
 * Get required sections for a template
 */
export function getRequiredSections(templateName: TemplateName): SectionTemplate[] {
  const template = CONTENT_TEMPLATES[templateName];
  return template?.sectionStructure.filter(s => s.required) || [];
}

/**
 * Get optional sections for a template
 */
export function getOptionalSections(templateName: TemplateName): SectionTemplate[] {
  const template = CONTENT_TEMPLATES[templateName];
  return template?.sectionStructure.filter(s => !s.required) || [];
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run config/__tests__/contentTemplates.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add config/contentTemplates.ts config/__tests__/contentTemplates.test.ts types/contentTemplates.ts types/index.ts
git commit -m "feat(config): add 12 content templates with website type mapping"
```

---

## Task 3: Create Template Router

**Files:**
- Create: `services/ai/contentGeneration/templateRouter.ts`
- Test: `services/ai/contentGeneration/__tests__/templateRouter.test.ts`

**Step 1: Write the failing test**

```typescript
// services/ai/contentGeneration/__tests__/templateRouter.test.ts
import { describe, it, expect } from 'vitest';
import { selectTemplate, routeToTemplate, getFormatCodeForSection } from '../templateRouter';
import { TemplateRouterInput } from '../../../../types/contentTemplates';

describe('templateRouter', () => {
  describe('selectTemplate', () => {
    it('should select ECOMMERCE_PRODUCT for ECOMMERCE website with high confidence', () => {
      const input: TemplateRouterInput = {
        websiteType: 'ECOMMERCE',
        queryIntent: 'transactional',
        queryType: 'product',
        topicType: 'core',
        topicClass: 'monetization',
      };

      const result = selectTemplate(input);

      expect(result.template.templateName).toBe('ECOMMERCE_PRODUCT');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should select COMPARISON when brief has comparison sections', () => {
      const input: TemplateRouterInput = {
        websiteType: 'INFORMATIONAL',
        queryIntent: 'commercial',
        queryType: 'comparative',
        topicType: 'outer',
        topicClass: 'informational',
        briefHints: {
          hasComparisonSections: true,
          hasStepSections: false,
          hasSpecsSections: false,
        },
      };

      const result = selectTemplate(input);

      expect(result.template.templateName).toBe('COMPARISON');
      expect(result.reasoning.some(r => r.includes('comparison'))).toBe(true);
    });

    it('should provide alternatives in result', () => {
      const input: TemplateRouterInput = {
        websiteType: 'SAAS',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
      };

      const result = selectTemplate(input);

      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives[0]).toHaveProperty('templateName');
      expect(result.alternatives[0]).toHaveProperty('reason');
    });
  });

  describe('routeToTemplate', () => {
    it('should return template config directly', () => {
      const input: TemplateRouterInput = {
        websiteType: 'HEALTHCARE',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
      };

      const template = routeToTemplate(input);

      expect(template.templateName).toBe('HEALTHCARE_YMYL');
      expect(template.sectionStructure.length).toBeGreaterThan(0);
    });
  });

  describe('getFormatCodeForSection', () => {
    it('should return FS for definitional query type', () => {
      const code = getFormatCodeForSection('definitional', 'overview');
      expect(code).toBe('FS');
    });

    it('should return TABLE for comparative query type', () => {
      const code = getFormatCodeForSection('comparative', 'comparison');
      expect(code).toBe('TABLE');
    });

    it('should return LISTING for list query type', () => {
      const code = getFormatCodeForSection('list', 'items');
      expect(code).toBe('LISTING');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/contentGeneration/__tests__/templateRouter.test.ts`
Expected: FAIL - module not found

**Step 3: Create directory if needed**

```bash
mkdir -p services/ai/contentGeneration/__tests__
```

**Step 4: Write the implementation**

```typescript
// services/ai/contentGeneration/templateRouter.ts
/**
 * Template Router
 *
 * AI-driven template selection with reasoning based on:
 * - Website type from topical map context
 * - Competitor analysis signals
 * - Query intent from brief
 * - Content brief structure hints
 *
 * Part of the Semantic SEO Content Template Routing system.
 */

import {
  TemplateConfig,
  TemplateName,
  TemplateRouterInput,
  TemplateSelectionResult,
} from '../../../types/contentTemplates';
import { FormatCode } from '../../../types/content';
import {
  CONTENT_TEMPLATES,
  WEBSITE_TYPE_TEMPLATE_MAP,
  getTemplateByName,
} from '../../../config/contentTemplates';

// =============================================================================
// TEMPLATE SELECTION LOGIC
// =============================================================================

/**
 * Select the optimal template with AI reasoning
 */
export function selectTemplate(input: TemplateRouterInput): TemplateSelectionResult {
  const reasoning: string[] = [];
  let selectedTemplateName: TemplateName;
  let confidence = 70; // Base confidence

  // Step 1: Start with website type mapping
  const primaryTemplate = WEBSITE_TYPE_TEMPLATE_MAP[input.websiteType] || 'DEFINITIONAL';
  selectedTemplateName = primaryTemplate;
  reasoning.push(`Website type is ${input.websiteType} - primary template is ${primaryTemplate}`);
  confidence += 10;

  // Step 2: Check query intent overrides
  if (input.queryIntent === 'commercial' && input.briefHints?.hasComparisonSections) {
    selectedTemplateName = 'COMPARISON';
    reasoning.push('Commercial intent with comparison sections detected - switching to COMPARISON template');
    confidence = 90;
  } else if (input.queryIntent === 'transactional' && input.websiteType === 'ECOMMERCE') {
    reasoning.push('Transactional intent confirms ECOMMERCE_PRODUCT template');
    confidence += 10;
  } else if (input.queryIntent === 'informational') {
    reasoning.push(`Informational intent aligns with ${selectedTemplateName} template`);
  }

  // Step 3: Check query type overrides
  if (input.queryType === 'procedural' || input.queryType === 'how-to') {
    if (selectedTemplateName !== 'PROCESS_HOWTO') {
      reasoning.push(`Query type "${input.queryType}" suggests PROCESS_HOWTO template as alternative`);
    }
  } else if (input.queryType === 'comparative' || input.queryType === 'versus') {
    if (selectedTemplateName !== 'COMPARISON') {
      selectedTemplateName = 'COMPARISON';
      reasoning.push(`Query type "${input.queryType}" - switching to COMPARISON template`);
      confidence = 85;
    }
  }

  // Step 4: Check brief hints
  if (input.briefHints?.hasStepSections && selectedTemplateName !== 'PROCESS_HOWTO') {
    reasoning.push('Brief contains step-based sections - PROCESS_HOWTO may be appropriate');
  }
  if (input.briefHints?.hasSpecsSections && selectedTemplateName !== 'ECOMMERCE_PRODUCT') {
    reasoning.push('Brief contains specifications sections - ECOMMERCE_PRODUCT may be appropriate');
  }

  // Step 5: Check competitor analysis
  if (input.competitorAnalysis?.dominantFormat) {
    reasoning.push(`Competitors predominantly use ${input.competitorAnalysis.dominantFormat} format`);
    if (input.competitorAnalysis.avgSectionCount) {
      reasoning.push(`Competitor average: ${input.competitorAnalysis.avgSectionCount} sections`);
    }
  }

  // Step 6: Adjust for topic type
  if (input.topicType === 'child') {
    reasoning.push('Child topic - sections will be reduced to brief depth');
  } else if (input.topicType === 'core') {
    reasoning.push('Core/pillar topic - comprehensive section coverage recommended');
    confidence += 5;
  }

  // Get the selected template
  const template = getTemplateByName(selectedTemplateName) || CONTENT_TEMPLATES.DEFINITIONAL;

  // Generate alternatives
  const alternatives = generateAlternatives(input, selectedTemplateName);

  return {
    template,
    confidence: Math.min(100, confidence),
    reasoning,
    alternatives,
  };
}

/**
 * Simple routing function for backwards compatibility
 */
export function routeToTemplate(input: TemplateRouterInput): TemplateConfig {
  return selectTemplate(input).template;
}

/**
 * Get format code for a section based on query type
 */
export function getFormatCodeForSection(queryType: string, sectionType: string): FormatCode {
  const queryTypeMap: Record<string, FormatCode> = {
    'definitional': FormatCode.FS,
    'definition': FormatCode.FS,
    'comparative': FormatCode.TABLE,
    'comparison': FormatCode.TABLE,
    'versus': FormatCode.TABLE,
    'list': FormatCode.LISTING,
    'procedural': FormatCode.LISTING,
    'how-to': FormatCode.LISTING,
    'faq': FormatCode.PAA,
    'question': FormatCode.PAA,
    'causal': FormatCode.PROSE,
    'explanation': FormatCode.PROSE,
  };

  return queryTypeMap[queryType.toLowerCase()] || FormatCode.PROSE;
}

/**
 * Get attribute order for website type and intent
 */
export function getAttributeOrder(
  websiteType: string,
  intent: string
): ('ROOT' | 'UNIQUE' | 'RARE' | 'COMMON')[] {
  // Transactional/commercial intent: lead with differentiators
  if (intent === 'transactional' || intent === 'commercial') {
    return ['UNIQUE', 'ROOT', 'RARE', 'COMMON'];
  }

  // E-commerce product pages: lead with differentiators
  if (websiteType === 'ECOMMERCE' || websiteType === 'MARKETPLACE') {
    return ['UNIQUE', 'ROOT', 'RARE', 'COMMON'];
  }

  // Default: standard SEO ordering (definitions first)
  return ['ROOT', 'UNIQUE', 'RARE', 'COMMON'];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate alternative template suggestions
 */
function generateAlternatives(
  input: TemplateRouterInput,
  selectedTemplate: TemplateName
): Array<{ templateName: TemplateName; reason: string }> {
  const alternatives: Array<{ templateName: TemplateName; reason: string }> = [];

  // Always suggest DEFINITIONAL as a fallback for informational content
  if (selectedTemplate !== 'DEFINITIONAL' && input.queryIntent === 'informational') {
    alternatives.push({
      templateName: 'DEFINITIONAL',
      reason: 'Standard informational article structure',
    });
  }

  // Suggest COMPARISON for commercial intent
  if (selectedTemplate !== 'COMPARISON' && input.queryIntent === 'commercial') {
    alternatives.push({
      templateName: 'COMPARISON',
      reason: 'Commercial intent often benefits from comparison format',
    });
  }

  // Suggest PROCESS_HOWTO for procedural queries
  if (selectedTemplate !== 'PROCESS_HOWTO' && (input.queryType === 'procedural' || input.briefHints?.hasStepSections)) {
    alternatives.push({
      templateName: 'PROCESS_HOWTO',
      reason: 'Step-by-step format for actionable content',
    });
  }

  // Suggest the primary template for the website type if different
  const primaryForType = WEBSITE_TYPE_TEMPLATE_MAP[input.websiteType];
  if (primaryForType && primaryForType !== selectedTemplate && !alternatives.some(a => a.templateName === primaryForType)) {
    alternatives.push({
      templateName: primaryForType,
      reason: `Primary template for ${input.websiteType} websites`,
    });
  }

  return alternatives.slice(0, 3); // Max 3 alternatives
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run services/ai/contentGeneration/__tests__/templateRouter.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add services/ai/contentGeneration/templateRouter.ts services/ai/contentGeneration/__tests__/templateRouter.test.ts
git commit -m "feat(templateRouter): add AI-driven template selection with reasoning"
```

---

## Task 4: Create Depth Analyzer

**Files:**
- Create: `services/ai/contentGeneration/depthAnalyzer.ts`
- Test: `services/ai/contentGeneration/__tests__/depthAnalyzer.test.ts`

**Step 1: Write the failing test**

```typescript
// services/ai/contentGeneration/__tests__/depthAnalyzer.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeAndSuggestDepth, applyUserDepthChoice } from '../depthAnalyzer';
import { DepthAnalyzerInput } from '../../../../types/contentTemplates';

describe('depthAnalyzer', () => {
  describe('analyzeAndSuggestDepth', () => {
    it('should recommend high-quality for competitive SERP with high word counts', () => {
      const input: DepthAnalyzerInput = {
        competitorWordCounts: [2500, 3000, 2800, 2200, 2600],
        serpDifficulty: 'high',
        queryIntent: 'informational',
        topicType: 'core',
        existingTopicalAuthority: 20,
      };

      const result = analyzeAndSuggestDepth(input);

      expect(result.recommended).toBe('high-quality');
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.settings.maxSections).toBeGreaterThanOrEqual(8);
      expect(result.settings.targetWordCount.min).toBeGreaterThanOrEqual(2000);
    });

    it('should recommend quick-publish for easy SERP with low word counts', () => {
      const input: DepthAnalyzerInput = {
        competitorWordCounts: [500, 700, 600, 800, 550],
        serpDifficulty: 'low',
        queryIntent: 'navigational',
        topicType: 'child',
        existingTopicalAuthority: 80,
      };

      const result = analyzeAndSuggestDepth(input);

      expect(result.recommended).toBe('quick-publish');
      expect(result.settings.maxSections).toBeLessThanOrEqual(5);
      expect(result.settings.targetWordCount.max).toBeLessThanOrEqual(1500);
    });

    it('should include competitor benchmark in result', () => {
      const input: DepthAnalyzerInput = {
        competitorWordCounts: [1000, 1200, 1100, 1300, 1150],
        serpDifficulty: 'medium',
        queryIntent: 'informational',
        topicType: 'outer',
        existingTopicalAuthority: 50,
      };

      const result = analyzeAndSuggestDepth(input);

      expect(result.competitorBenchmark.avgWordCount).toBe(1150);
      expect(result.competitorBenchmark.topPerformerWordCount).toBe(1300);
    });

    it('should provide reasoning for core topics', () => {
      const input: DepthAnalyzerInput = {
        competitorWordCounts: [1500, 1800, 1600],
        serpDifficulty: 'medium',
        queryIntent: 'informational',
        topicType: 'core',
        existingTopicalAuthority: 40,
      };

      const result = analyzeAndSuggestDepth(input);

      expect(result.reasoning.some(r => r.toLowerCase().includes('core') || r.toLowerCase().includes('pillar'))).toBe(true);
    });
  });

  describe('applyUserDepthChoice', () => {
    it('should override to high-quality settings', () => {
      const suggestion = analyzeAndSuggestDepth({
        competitorWordCounts: [800, 900, 850],
        serpDifficulty: 'low',
        queryIntent: 'navigational',
        topicType: 'child',
        existingTopicalAuthority: 90,
      });

      const result = applyUserDepthChoice(suggestion, 'high-quality');

      expect(result.recommended).toBe('high-quality');
      expect(result.settings.maxSections).toBeGreaterThanOrEqual(8);
      expect(result.settings.sectionDepth).toBe('comprehensive');
    });

    it('should override to quick-publish settings', () => {
      const suggestion = analyzeAndSuggestDepth({
        competitorWordCounts: [2500, 3000, 2800],
        serpDifficulty: 'high',
        queryIntent: 'informational',
        topicType: 'core',
        existingTopicalAuthority: 20,
      });

      const result = applyUserDepthChoice(suggestion, 'quick-publish');

      expect(result.recommended).toBe('quick-publish');
      expect(result.settings.maxSections).toBeLessThanOrEqual(5);
      expect(result.settings.sectionDepth).toBe('brief');
    });

    it('should apply custom settings when provided', () => {
      const suggestion = analyzeAndSuggestDepth({
        competitorWordCounts: [1500, 1800, 1600],
        serpDifficulty: 'medium',
        queryIntent: 'informational',
        topicType: 'outer',
        existingTopicalAuthority: 50,
      });

      const result = applyUserDepthChoice(suggestion, 'custom', {
        maxSections: 6,
        targetWordCount: { min: 1200, max: 1800 },
      });

      expect(result.settings.maxSections).toBe(6);
      expect(result.settings.targetWordCount.min).toBe(1200);
      expect(result.settings.targetWordCount.max).toBe(1800);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/contentGeneration/__tests__/depthAnalyzer.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
// services/ai/contentGeneration/depthAnalyzer.ts
/**
 * Depth Analyzer
 *
 * Analyzes competitor content and SERP difficulty to suggest
 * optimal content depth. Users can override with:
 * - High-Quality Mode: Comprehensive content for ranking
 * - Quick Publish Mode: Shorter content for blog velocity
 * - Custom: User-defined settings
 *
 * Part of the Semantic SEO Content Template Routing system.
 */

import {
  DepthAnalyzerInput,
  DepthSuggestion,
  DepthMode,
} from '../../../types/contentTemplates';

// =============================================================================
// DEPTH PRESETS
// =============================================================================

const DEPTH_PRESETS: Record<DepthMode, Omit<DepthSuggestion['settings'], 'targetWordCount'> & { wordCountMultiplier: number }> = {
  'high-quality': {
    maxSections: 10,
    sectionDepth: 'comprehensive',
    wordCountMultiplier: 1.3, // 30% above competitor average
  },
  'moderate': {
    maxSections: 6,
    sectionDepth: 'moderate',
    wordCountMultiplier: 1.0, // Match competitor average
  },
  'quick-publish': {
    maxSections: 4,
    sectionDepth: 'brief',
    wordCountMultiplier: 0.6, // 60% of competitor average
  },
};

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================

/**
 * Analyze competitor data and suggest content depth
 */
export function analyzeAndSuggestDepth(input: DepthAnalyzerInput): DepthSuggestion {
  const reasoning: string[] = [];

  // Calculate competitor benchmarks
  const avgWordCount = calculateAverage(input.competitorWordCounts);
  const topPerformerWordCount = Math.max(...input.competitorWordCounts);
  const avgSections = estimateSectionCount(avgWordCount);

  // Determine recommendation based on signals
  let recommended: DepthMode = 'moderate';

  // Signal 1: Competitor word counts
  if (avgWordCount > 2000) {
    reasoning.push(`Competitors average ${Math.round(avgWordCount)} words - comprehensive coverage needed for ranking`);
    recommended = 'high-quality';
  } else if (avgWordCount < 1000) {
    reasoning.push(`Competitors average only ${Math.round(avgWordCount)} words - shorter content may suffice`);
    recommended = 'quick-publish';
  } else {
    reasoning.push(`Competitors average ${Math.round(avgWordCount)} words - moderate depth recommended`);
  }

  // Signal 2: SERP difficulty
  if (input.serpDifficulty === 'high') {
    reasoning.push(`SERP difficulty is high - depth signals topical authority`);
    if (recommended !== 'high-quality') {
      recommended = 'high-quality';
    }
  } else if (input.serpDifficulty === 'low') {
    reasoning.push(`SERP difficulty is low - quick content can still rank`);
    if (recommended === 'high-quality') {
      recommended = 'moderate';
    }
  }

  // Signal 3: Topic type
  if (input.topicType === 'core') {
    reasoning.push(`Core/pillar topic requires comprehensive treatment to establish topical hub`);
    recommended = 'high-quality';
  } else if (input.topicType === 'child') {
    reasoning.push(`Child topic can be brief - references parent content`);
    if (recommended === 'high-quality') {
      recommended = 'moderate';
    }
  }

  // Signal 4: Existing topical authority
  if (input.existingTopicalAuthority < 30) {
    reasoning.push(`Low existing topical authority (${input.existingTopicalAuthority}%) - comprehensive content builds foundation`);
    if (recommended === 'quick-publish') {
      recommended = 'moderate';
    }
  } else if (input.existingTopicalAuthority > 70) {
    reasoning.push(`Strong existing topical authority (${input.existingTopicalAuthority}%) - can leverage existing content`);
  }

  // Signal 5: Query intent
  if (input.queryIntent === 'navigational') {
    reasoning.push(`Navigational intent - users want quick answers`);
    if (recommended === 'high-quality') {
      recommended = 'moderate';
    }
  }

  // Calculate settings based on recommendation
  const preset = DEPTH_PRESETS[recommended];
  const targetBase = avgWordCount * preset.wordCountMultiplier;

  return {
    recommended,
    reasoning,
    competitorBenchmark: {
      avgWordCount: Math.round(avgWordCount),
      avgSections: Math.round(avgSections),
      topPerformerWordCount: Math.round(topPerformerWordCount),
    },
    settings: {
      maxSections: preset.maxSections,
      targetWordCount: {
        min: Math.round(targetBase * 0.8),
        max: Math.round(targetBase * 1.2),
      },
      sectionDepth: preset.sectionDepth,
    },
  };
}

/**
 * Apply user's depth choice override
 */
export function applyUserDepthChoice(
  suggestion: DepthSuggestion,
  userChoice: DepthMode | 'custom',
  customSettings?: {
    maxSections?: number;
    targetWordCount?: { min: number; max: number };
  }
): DepthSuggestion {
  if (userChoice === 'custom' && customSettings) {
    return {
      ...suggestion,
      recommended: 'moderate', // Custom is treated as moderate for reporting
      reasoning: [...suggestion.reasoning, 'User selected custom depth settings'],
      settings: {
        maxSections: customSettings.maxSections ?? suggestion.settings.maxSections,
        targetWordCount: customSettings.targetWordCount ?? suggestion.settings.targetWordCount,
        sectionDepth: determineSectionDepth(customSettings.maxSections ?? suggestion.settings.maxSections),
      },
    };
  }

  const preset = DEPTH_PRESETS[userChoice as DepthMode];
  const targetBase = suggestion.competitorBenchmark.avgWordCount * preset.wordCountMultiplier;

  return {
    ...suggestion,
    recommended: userChoice as DepthMode,
    reasoning: [...suggestion.reasoning, `User overrode to ${userChoice} mode`],
    settings: {
      maxSections: preset.maxSections,
      targetWordCount: {
        min: Math.round(targetBase * 0.8),
        max: Math.round(targetBase * 1.2),
      },
      sectionDepth: preset.sectionDepth,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 1500; // Default if no data
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function estimateSectionCount(wordCount: number): number {
  // Rough estimate: ~300 words per section average
  return Math.max(3, Math.round(wordCount / 300));
}

function determineSectionDepth(maxSections: number): 'comprehensive' | 'moderate' | 'brief' {
  if (maxSections >= 8) return 'comprehensive';
  if (maxSections >= 5) return 'moderate';
  return 'brief';
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/ai/contentGeneration/__tests__/depthAnalyzer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/depthAnalyzer.ts services/ai/contentGeneration/__tests__/depthAnalyzer.test.ts
git commit -m "feat(depthAnalyzer): add AI-suggested depth with user adjustment"
```

---

## Task 5: Create Conflict Resolver

**Files:**
- Create: `services/ai/contentGeneration/conflictResolver.ts`
- Test: `services/ai/contentGeneration/__tests__/conflictResolver.test.ts`

**Step 1: Write the failing test**

```typescript
// services/ai/contentGeneration/__tests__/conflictResolver.test.ts
import { describe, it, expect } from 'vitest';
import { detectConflicts, resolveConflicts, generateSeoArgument } from '../conflictResolver';
import { CONTENT_TEMPLATES } from '../../../../config/contentTemplates';
import { FormatCode } from '../../../../types/content';

describe('conflictResolver', () => {
  describe('detectConflicts', () => {
    it('should detect no conflicts when brief matches template', () => {
      const template = CONTENT_TEMPLATES.DEFINITIONAL;
      const brief = {
        structured_outline: [
          { heading: 'What is Test Entity?', format_code: 'FS' },
          { heading: 'Key Characteristics', format_code: 'LISTING' },
        ],
      };

      const result = detectConflicts(template, brief as any);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect format code conflict', () => {
      const template = CONTENT_TEMPLATES.ECOMMERCE_PRODUCT;
      const brief = {
        structured_outline: [
          { heading: 'Key Features', format_code: 'PROSE' }, // Should be LISTING
        ],
      };

      const result = detectConflicts(template, brief as any);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some(c => c.field === 'formatCode')).toBe(true);
    });

    it('should rate severity based on conflict type', () => {
      const template = CONTENT_TEMPLATES.HEALTHCARE_YMYL;
      const brief = {
        structured_outline: [
          { heading: 'Symptoms', format_code: 'PROSE' }, // Should be LISTING - moderate
        ],
      };

      const result = detectConflicts(template, brief as any);

      expect(result.overallSeverity).toBe('moderate');
    });

    it('should provide AI recommendation', () => {
      const template = CONTENT_TEMPLATES.DEFINITIONAL;
      const brief = {
        structured_outline: [
          { heading: 'What is Test?', format_code: 'PROSE' }, // Should be FS
        ],
      };

      const result = detectConflicts(template, brief as any);

      expect(result.aiRecommendation).toBeDefined();
      expect(result.aiRecommendation.action).toBe('use-template');
      expect(result.aiRecommendation.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('resolveConflicts', () => {
    it('should apply template values when user chooses template', () => {
      const template = CONTENT_TEMPLATES.ECOMMERCE_PRODUCT;
      const brief = {
        structured_outline: [
          { heading: 'Key Features', format_code: 'PROSE' },
        ],
      };

      const detection = detectConflicts(template, brief as any);
      const resolved = resolveConflicts(detection, 'template', template, brief as any);

      expect(resolved.formatCodes['Key Features']).toBe('LISTING');
    });

    it('should keep brief values when user chooses brief', () => {
      const template = CONTENT_TEMPLATES.ECOMMERCE_PRODUCT;
      const brief = {
        structured_outline: [
          { heading: 'Key Features', format_code: 'PROSE' },
        ],
      };

      const detection = detectConflicts(template, brief as any);
      const resolved = resolveConflicts(detection, 'brief', template, brief as any);

      expect(resolved.formatCodes['Key Features']).toBe('PROSE');
    });
  });

  describe('generateSeoArgument', () => {
    it('should generate argument for FS format code', () => {
      const argument = generateSeoArgument('formatCode', 'PROSE', 'FS');

      expect(argument).toContain('Featured Snippet');
    });

    it('should generate argument for LISTING format code', () => {
      const argument = generateSeoArgument('formatCode', 'PROSE', 'LISTING');

      expect(argument).toContain('list');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/contentGeneration/__tests__/conflictResolver.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
// services/ai/contentGeneration/conflictResolver.ts
/**
 * Conflict Resolver
 *
 * Detects and resolves conflicts between content brief and template.
 * Ensures single source of truth by syncing changes to brief.
 *
 * Conflicts include:
 * - Format code mismatches
 * - Section ordering differences
 * - Attribute priority conflicts
 *
 * Part of the Semantic SEO Content Template Routing system.
 */

import {
  TemplateConfig,
  ConflictItem,
  ConflictDetectionResult,
} from '../../../types/contentTemplates';
import { FormatCode, ContentBrief } from '../../../types/content';

// =============================================================================
// CONFLICT DETECTION
// =============================================================================

/**
 * Detect conflicts between template and brief
 */
export function detectConflicts(
  template: TemplateConfig,
  brief: Partial<ContentBrief>
): ConflictDetectionResult {
  const conflicts: ConflictItem[] = [];

  // Check format code conflicts
  if (brief.structured_outline) {
    for (const section of brief.structured_outline) {
      const heading = section.heading?.toLowerCase() || '';
      const briefFormatCode = section.format_code;

      // Find matching template section
      const templateSection = template.sectionStructure.find(ts => {
        const pattern = ts.headingPattern.toLowerCase().replace(/{[^}]+}/g, '');
        return heading.includes(pattern.trim()) || pattern.includes(heading.split(' ')[0]);
      });

      if (templateSection && briefFormatCode && briefFormatCode !== templateSection.formatCode) {
        conflicts.push({
          field: 'formatCode',
          briefValue: briefFormatCode,
          templateValue: templateSection.formatCode,
          severity: getFormatCodeConflictSeverity(briefFormatCode, templateSection.formatCode),
          semanticSeoArgument: generateSeoArgument('formatCode', briefFormatCode, templateSection.formatCode),
        });
      }
    }
  }

  // Determine overall severity
  const overallSeverity = determineOverallSeverity(conflicts);

  // Generate AI recommendation
  const aiRecommendation = generateRecommendation(conflicts);

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    overallSeverity,
    aiRecommendation,
  };
}

/**
 * Resolve conflicts based on user choice
 */
export function resolveConflicts(
  detection: ConflictDetectionResult,
  userChoice: 'template' | 'brief' | 'merge',
  template: TemplateConfig,
  brief: Partial<ContentBrief>
): {
  sectionStructure: Array<{ heading: string; format_code: string }>;
  formatCodes: Record<string, string>;
  attributeOrder: string[];
} {
  const formatCodes: Record<string, string> = {};
  const sectionStructure: Array<{ heading: string; format_code: string }> = [];

  if (brief.structured_outline) {
    for (const section of brief.structured_outline) {
      const heading = section.heading || '';
      let resolvedFormatCode = section.format_code || 'PROSE';

      if (userChoice === 'template') {
        // Find template format code for this section
        const templateSection = template.sectionStructure.find(ts => {
          const pattern = ts.headingPattern.toLowerCase().replace(/{[^}]+}/g, '');
          return heading.toLowerCase().includes(pattern.trim());
        });
        if (templateSection) {
          resolvedFormatCode = templateSection.formatCode;
        }
      } else if (userChoice === 'merge') {
        // Prefer template for critical format codes (FS, TABLE)
        const conflict = detection.conflicts.find(c =>
          c.field === 'formatCode' &&
          (c.templateValue === 'FS' || c.templateValue === 'TABLE')
        );
        if (conflict) {
          resolvedFormatCode = conflict.templateValue as string;
        }
      }
      // 'brief' choice keeps original format code

      formatCodes[heading] = resolvedFormatCode;
      sectionStructure.push({
        heading,
        format_code: resolvedFormatCode,
      });
    }
  }

  return {
    sectionStructure,
    formatCodes,
    attributeOrder: template.attributeOrderOverride || ['ROOT', 'UNIQUE', 'RARE', 'COMMON'],
  };
}

/**
 * Generate SEO argument for a conflict
 */
export function generateSeoArgument(
  field: string,
  briefValue: unknown,
  templateValue: unknown
): string {
  if (field === 'formatCode') {
    const templateCode = templateValue as string;
    const briefCode = briefValue as string;

    if (templateCode === 'FS') {
      return `Featured Snippet format (FS) has 2-3x higher click-through rate for definitional queries. Brief uses ${briefCode} which doesn't target position zero.`;
    }
    if (templateCode === 'LISTING') {
      return `List format (LISTING) has 47% higher Featured Snippet win rate for feature-related queries. Brief uses ${briefCode} which is less scannable.`;
    }
    if (templateCode === 'TABLE') {
      return `Table format (TABLE) is optimal for comparison queries and specification data. Brief uses ${briefCode} which is harder to compare.`;
    }
    if (templateCode === 'PAA') {
      return `PAA format targets People Also Ask boxes and FAQ rich results. Brief uses ${briefCode} which misses FAQ schema opportunity.`;
    }
  }

  return `Template recommends ${templateValue} for optimal Cost of Retrieval reduction.`;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getFormatCodeConflictSeverity(
  briefCode: string,
  templateCode: string
): 'minor' | 'moderate' | 'critical' {
  // FS conflicts are critical - affects Featured Snippet targeting
  if (templateCode === 'FS') {
    return 'critical';
  }

  // TABLE conflicts are moderate - affects data presentation
  if (templateCode === 'TABLE') {
    return 'moderate';
  }

  // PAA conflicts are moderate - affects FAQ schema
  if (templateCode === 'PAA') {
    return 'moderate';
  }

  // LISTING vs PROSE is minor
  return 'minor';
}

function determineOverallSeverity(conflicts: ConflictItem[]): 'minor' | 'moderate' | 'critical' {
  if (conflicts.some(c => c.severity === 'critical')) {
    return 'critical';
  }
  if (conflicts.some(c => c.severity === 'moderate')) {
    return 'moderate';
  }
  return 'minor';
}

function generateRecommendation(conflicts: ConflictItem[]): {
  action: 'use-template' | 'use-brief' | 'merge';
  reasoning: string[];
} {
  const reasoning: string[] = [];

  if (conflicts.length === 0) {
    return { action: 'use-brief', reasoning: ['No conflicts detected - brief aligns with template'] };
  }

  const hasCritical = conflicts.some(c => c.severity === 'critical');
  const hasModerate = conflicts.some(c => c.severity === 'moderate');

  if (hasCritical) {
    reasoning.push('Critical conflicts detected - template format codes optimize for search visibility');
    for (const conflict of conflicts.filter(c => c.severity === 'critical')) {
      reasoning.push(conflict.semanticSeoArgument);
    }
    return { action: 'use-template', reasoning };
  }

  if (hasModerate) {
    reasoning.push('Moderate conflicts detected - template provides better structure');
    return { action: 'use-template', reasoning };
  }

  reasoning.push('Minor conflicts only - either choice is acceptable');
  return { action: 'merge', reasoning };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/ai/contentGeneration/__tests__/conflictResolver.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/conflictResolver.ts services/ai/contentGeneration/__tests__/conflictResolver.test.ts
git commit -m "feat(conflictResolver): add conflict detection and resolution with SEO arguments"
```

---

## Task 6: Create Zone Validator

**Files:**
- Create: `services/ai/contentGeneration/validators/zoneValidator.ts`
- Test: `services/ai/contentGeneration/validators/__tests__/zoneValidator.test.ts`

**Step 1: Write the failing test**

```typescript
// services/ai/contentGeneration/validators/__tests__/zoneValidator.test.ts
import { describe, it, expect } from 'vitest';
import { validateContentZones, ZoneValidationResult } from '../zoneValidator';
import { ContentZone } from '../../../../../types/content';

describe('zoneValidator', () => {
  describe('validateContentZones', () => {
    it('should pass when MAIN sections exceed SUPPLEMENTARY', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.MAIN },
        { heading: 'B', content_zone: ContentZone.MAIN },
        { heading: 'C', content_zone: ContentZone.MAIN },
        { heading: 'D', content_zone: ContentZone.SUPPLEMENTARY },
      ];

      const result = validateContentZones(sections);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should warn when SUPPLEMENTARY exceeds MAIN', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.MAIN },
        { heading: 'B', content_zone: ContentZone.SUPPLEMENTARY },
        { heading: 'C', content_zone: ContentZone.SUPPLEMENTARY },
        { heading: 'D', content_zone: ContentZone.SUPPLEMENTARY },
      ];

      const result = validateContentZones(sections);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('SUPPLEMENTARY'))).toBe(true);
    });

    it('should warn when less than 3 MAIN sections', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.MAIN },
        { heading: 'B', content_zone: ContentZone.MAIN },
        { heading: 'C', content_zone: ContentZone.SUPPLEMENTARY },
      ];

      const result = validateContentZones(sections);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('3 MAIN'))).toBe(true);
    });

    it('should warn when MAIN section appears after SUPPLEMENTARY', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.MAIN },
        { heading: 'B', content_zone: ContentZone.SUPPLEMENTARY },
        { heading: 'C', content_zone: ContentZone.MAIN }, // Wrong order
      ];

      const result = validateContentZones(sections);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('zone flow'))).toBe(true);
    });

    it('should include zone counts in result', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.MAIN },
        { heading: 'B', content_zone: ContentZone.MAIN },
        { heading: 'C', content_zone: ContentZone.SUPPLEMENTARY },
      ];

      const result = validateContentZones(sections);

      expect(result.mainCount).toBe(2);
      expect(result.supplementaryCount).toBe(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/contentGeneration/validators/__tests__/zoneValidator.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
// services/ai/contentGeneration/validators/zoneValidator.ts
/**
 * Zone Validator
 *
 * Validates content zone ordering and distribution:
 * - MAIN sections should come before SUPPLEMENTARY
 * - MAIN sections should outnumber SUPPLEMENTARY
 * - Minimum 3 MAIN sections for adequate primary content
 *
 * Part of the Semantic SEO Content Template Routing system.
 */

import { ContentZone } from '../../../../types/content';

export interface ZoneValidationResult {
  valid: boolean;
  issues: string[];
  mainCount: number;
  supplementaryCount: number;
}

interface SectionWithZone {
  heading: string;
  content_zone: ContentZone | string;
}

/**
 * Validate content zone ordering and distribution
 */
export function validateContentZones(sections: SectionWithZone[]): ZoneValidationResult {
  const issues: string[] = [];

  const mainCount = sections.filter(s => s.content_zone === ContentZone.MAIN || s.content_zone === 'MAIN').length;
  const supplementaryCount = sections.filter(s => s.content_zone === ContentZone.SUPPLEMENTARY || s.content_zone === 'SUPPLEMENTARY').length;

  // Check minimum MAIN sections
  if (mainCount < 3) {
    issues.push('WARNING: Less than 3 MAIN sections - primary content may be insufficient');
  }

  // Check zone ratio
  if (supplementaryCount > mainCount) {
    issues.push('WARNING: SUPPLEMENTARY sections exceed MAIN - content hierarchy inverted');
  }

  // Check zone ordering
  let foundSupplementary = false;
  for (const section of sections) {
    const isSupplementary = section.content_zone === ContentZone.SUPPLEMENTARY || section.content_zone === 'SUPPLEMENTARY';
    const isMain = section.content_zone === ContentZone.MAIN || section.content_zone === 'MAIN';

    if (isSupplementary) {
      foundSupplementary = true;
    } else if (foundSupplementary && isMain) {
      issues.push(`WARNING: MAIN section "${section.heading}" after SUPPLEMENTARY - zone flow broken`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    mainCount,
    supplementaryCount,
  };
}

/**
 * Auto-fix zone ordering by moving MAIN sections before SUPPLEMENTARY
 */
export function reorderByZone(sections: SectionWithZone[]): SectionWithZone[] {
  const mainSections = sections.filter(s => s.content_zone === ContentZone.MAIN || s.content_zone === 'MAIN');
  const supplementarySections = sections.filter(s => s.content_zone === ContentZone.SUPPLEMENTARY || s.content_zone === 'SUPPLEMENTARY');

  return [...mainSections, ...supplementarySections];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/ai/contentGeneration/validators/__tests__/zoneValidator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/validators/zoneValidator.ts services/ai/contentGeneration/validators/__tests__/zoneValidator.test.ts
git commit -m "feat(zoneValidator): add content zone validation for MAIN/SUPPLEMENTARY ordering"
```

---

## Task 7: Export New Modules from Index

**Files:**
- Modify: `services/ai/contentGeneration/index.ts`

**Step 1: Read current index file**

Read the current exports from `services/ai/contentGeneration/index.ts`.

**Step 2: Add new exports**

Add the following exports:

```typescript
// Template routing
export * from './templateRouter';
export * from './depthAnalyzer';
export * from './conflictResolver';

// Validators
export { validateContentZones, reorderByZone } from './validators/zoneValidator';
```

**Step 3: Verify imports work**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/index.ts
git commit -m "feat(contentGeneration): export template routing modules from index"
```

---

## Task 8: Integration - Update Pass 1 to Use Template Router

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass1DraftGeneration.ts`
- Test: Run existing tests

**Step 1: Read current pass1DraftGeneration.ts structure**

Understand how the file currently works before modifying.

**Step 2: Import template router**

Add imports at top of file:

```typescript
import { selectTemplate, routeToTemplate } from '../templateRouter';
import { TemplateRouterInput, TemplateSelectionResult } from '../../../../types/contentTemplates';
```

**Step 3: Add template selection at start of execute()**

In the `execute()` method, after loading the brief and before section parsing, add:

```typescript
// Select template based on context
const templateInput: TemplateRouterInput = {
  websiteType: (businessInfo.websiteType as WebsiteType) || 'INFORMATIONAL',
  queryIntent: (brief.searchIntent as any) || 'informational',
  queryType: brief.serpAnalysis?.query_type || 'definitional',
  topicType: topicType as 'core' | 'outer' | 'child',
  topicClass: (topic.topic_class as 'monetization' | 'informational') || 'informational',
  briefHints: {
    hasComparisonSections: brief.structured_outline?.some(s =>
      s.heading?.toLowerCase().includes('vs') || s.heading?.toLowerCase().includes('comparison')
    ) || false,
    hasStepSections: brief.structured_outline?.some(s =>
      s.heading?.toLowerCase().includes('step') || s.heading?.toLowerCase().includes('how to')
    ) || false,
    hasSpecsSections: brief.structured_outline?.some(s =>
      s.heading?.toLowerCase().includes('spec') || s.heading?.toLowerCase().includes('feature')
    ) || false,
  },
};

const templateSelection = selectTemplate(templateInput);
console.log(`[Pass1] Using template: ${templateSelection.template.templateName} (${templateSelection.confidence}% confidence)`);
for (const reason of templateSelection.reasoning) {
  console.log(`[Pass1]   - ${reason}`);
}
```

**Step 4: Run existing tests to verify no regressions**

Run: `npx vitest run services/ai/contentGeneration/`
Expected: All existing tests PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/passes/pass1DraftGeneration.ts
git commit -m "feat(pass1): integrate template router with AI selection and reasoning"
```

---

## Summary

This plan covers **8 tasks** that establish the foundation for the Content Template Routing system:

1. **Task 1**: Create type definitions (`types/contentTemplates.ts`)
2. **Task 2**: Create 12 template configurations (`config/contentTemplates.ts`)
3. **Task 3**: Create template router with AI reasoning (`templateRouter.ts`)
4. **Task 4**: Create depth analyzer (`depthAnalyzer.ts`)
5. **Task 5**: Create conflict resolver (`conflictResolver.ts`)
6. **Task 6**: Create zone validator (`validators/zoneValidator.ts`)
7. **Task 7**: Export new modules from index
8. **Task 8**: Integrate template router into Pass 1

Each task follows TDD with:
- Write failing test first
- Run to verify failure
- Write minimal implementation
- Run to verify pass
- Commit

---

## Next Steps (Future Tasks)

After these 8 tasks are complete, the following should be implemented:

- **Task 9-11**: UI components (TemplateSelectionModal, DepthSelectionModal, ConflictResolutionModal)
- **Task 12**: Brief sync mechanism for single source of truth
- **Task 13**: Visual semantics integration in SectionPromptBuilder
- **Task 14**: Template compliance scoring in Pass 8
- **Task 15-17**: Testing all 17 website types
