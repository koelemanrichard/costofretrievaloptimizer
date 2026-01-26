# Intelligent Layout Engine - Design Document

> Design document for implementing design-agency quality output through intelligent, brand-aware layout generation that respects Semantic SEO principles.

**Status:** Ready for Implementation
**Created:** 2026-01-26
**Author:** Claude (with user direction)
**Related:** `2026-01-25-ai-vision-brand-design-system.md`

---

## Executive Summary

The current system has a fundamental disconnect: rich brand DNA is extracted but ignored during rendering. Only basic colors and fonts are passed to the renderer, while 95% of detected design properties (shapes, effects, motion, component preferences) go unused. The result is "templates with colors" instead of design-agency quality output.

This document outlines an **Intelligent Layout Engine** that:

1. **Consumes ALL available signals** (Topical Map, Content Brief, DesignDNA, Audits, Competitors)
2. **Respects Semantic SEO as the CORE** (format codes are immutable, design only styles them)
3. **Uses complete BrandDesignSystem** (including the currently-ignored `compiledCss`)
4. **Produces varied layouts** (full-width, narrow, two-column, floating) based on content importance
5. **Includes AI visual validation** comparing output to source brand screenshots

**Core Principle:** Semantic SEO dictates WHAT exists (structure). Design dictates HOW it's presented (styling).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INTELLIGENT LAYOUT ENGINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │   Section   │   │   Layout    │   │  Component  │   │   Visual    │     │
│  │  Analyzer   │──▶│   Planner   │──▶│  Selector   │──▶│ Emphasizer  │     │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘     │
│         │                 │                 │                 │             │
│         ▼                 ▼                 ▼                 ▼             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       SUGGESTION GENERATOR                          │   │
│  │              (AI improvements, auto-applied)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        LAYOUT BLUEPRINT                             │   │
│  │         (Complete section specifications + reasoning)               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     BRAND-AWARE RENDERER                            │   │
│  │        (Uses BrandDesignSystem.compiledCss + Blueprint)             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AI VISUAL VALIDATION                             │   │
│  │         (Screenshot comparison, brand alignment score)              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

INPUT SIGNALS (All Available Intelligence):
┌──────────────────────────────────────────────────────────────────────────────┐
│ Topical Map: Core/Outer topics, EAVs (ROOT/RARE/UNIQUE), parent context     │
│ Content Brief: Format codes, FS targets, visual requirements, competitors   │
│ Generated Draft: Headings, paragraphs, lists, tables, images, CTAs          │
│ Design DNA: 150+ design properties (colors, shapes, effects, motion, etc.)  │
│ Competitor Analysis: What works, differentiation opportunities              │
│ Business Context: Industry, tone, trust signals needed                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Component 1: Section Analyzer

**Purpose:** Understand each content section's semantic role and visual requirements.

**File:** `services/layout-engine/SectionAnalyzer.ts`

### Input Signals

From **Content Brief**:
- `formatCode` (FS-protected): Dictates structure (list, table, paragraph, steps)
- `visualRequirements`: Image needs, chart types
- `targetSnippetType`: Featured Snippet target (paragraph, list, table)

From **Topical Map**:
- `attributeCategory`: ROOT/RARE/UNIQUE/COMMON (semantic importance)
- `coreVsOuter`: Is this a core topic section?
- `searchIntent`: Informational, transactional, navigational

From **Generated Draft**:
- `headingLevel`: H2, H3, H4
- `wordCount`: Section length
- `elementTypes`: Lists, tables, images, blockquotes present

### Output

```typescript
interface SectionAnalysis {
  sectionId: string;

  // Content characteristics
  contentType: 'introduction' | 'explanation' | 'steps' | 'comparison' |
               'faq' | 'evidence' | 'cta' | 'summary' | 'deep-dive';
  formatCode: string;              // From brief, immutable

  // Semantic weight (drives visual emphasis)
  semanticWeight: 1 | 2 | 3 | 4 | 5;
  weightFactors: {
    hasUniqueTopic: boolean;       // UNIQUE attribute
    hasRareTopic: boolean;         // RARE attribute
    isCoreTopic: boolean;          // Core vs outer
    answersMainIntent: boolean;    // Central search intent
    hasFSTarget: boolean;          // Featured Snippet opportunity
  };

  // Immutable constraints
  constraints: {
    formatCodeRequired: string;    // MUST maintain this format
    fsProtection: boolean;         // Cannot alter for FS
    imageRequired: boolean;        // From visual requirements
    tableRequired: boolean;        // From format code
  };
}
```

### Semantic Weight Calculation

```typescript
function calculateSemanticWeight(section: Section, brief: ContentBrief): 1|2|3|4|5 {
  let weight = 3; // Base weight

  // Boost for semantic importance
  if (section.attributeCategory === 'UNIQUE') weight += 2;
  else if (section.attributeCategory === 'RARE') weight += 1;
  else if (section.attributeCategory === 'ROOT') weight += 0.5;

  // Boost for core topics
  if (section.isCoreTopic) weight += 1;

  // Boost for FS targets
  if (section.hasFeaturedSnippetTarget) weight += 1;

  // Boost for answering main intent
  if (section.answersMainSearchIntent) weight += 1;

  return Math.min(5, Math.max(1, Math.round(weight)));
}
```

---

## Component 2: Layout Planner

**Purpose:** Determine page-level layout parameters respecting brand personality and content flow.

**File:** `services/layout-engine/LayoutPlanner.ts`

### Input Signals

From **Design DNA**:
- `spacing.density`: compact/comfortable/spacious/airy
- `spacing.contentWidth`: narrow/medium/wide/full
- `layout.gridStyle`: strict-12/asymmetric/fluid/modular
- `layout.alignment`: left/center/mixed
- `personality.formality`: 1-5 scale

From **Section Analysis**:
- Semantic weights per section
- Content types and requirements

### Layout Parameters

```typescript
interface LayoutParameters {
  // Width variations
  width: 'narrow' | 'standard' | 'wide' | 'full';

  // Multi-column support
  columns: 1 | 2 | 3;
  columnLayout?: 'equal' | 'main-sidebar' | 'sidebar-main' | 'asymmetric';

  // Image positioning
  imagePosition: 'inline' | 'float-left' | 'float-right' | 'full-width' |
                 'pull-quote-style' | 'background';

  // Spacing
  verticalSpacing: 'tight' | 'normal' | 'generous' | 'dramatic';

  // Visual breaks
  hasVisualBreak: boolean;
  breakType?: 'divider' | 'color-band' | 'whitespace' | 'pattern';
}
```

### Width Decision Matrix

| Semantic Weight | Content Type | Brand Density | Result Width |
|-----------------|--------------|---------------|--------------|
| 5 (Hero) | Introduction | Any | full |
| 5 (Hero) | CTA | Any | wide |
| 4 (Featured) | Explanation | Spacious | wide |
| 4 (Featured) | Comparison | Any | wide (table needs room) |
| 3 (Standard) | Any | Comfortable | standard |
| 2 (Supporting) | Evidence | Compact | narrow |
| 1 (Minimal) | Any | Any | narrow |

### Column Decision Logic

```typescript
function determineColumns(section: SectionAnalysis, dna: DesignDNA): LayoutParameters {
  // Never break format codes
  if (section.constraints.formatCodeRequired === 'table') {
    return { columns: 1, width: 'wide' }; // Tables need full width
  }

  // Two-column for comparison content
  if (section.contentType === 'comparison' && !section.constraints.fsProtection) {
    return { columns: 2, columnLayout: 'equal' };
  }

  // Sidebar for supporting evidence
  if (section.semanticWeight <= 2 && dna.layout.gridStyle === 'asymmetric') {
    return { columns: 2, columnLayout: 'main-sidebar' };
  }

  // Default to single column
  return { columns: 1 };
}
```

---

## Component 3: Component Selector

**Purpose:** Select visual components based on content patterns AND brand personality.

**File:** `services/layout-engine/ComponentSelector.ts`

### Two-Factor Selection

Components are selected based on:
1. **Content Pattern** (from format code + content type)
2. **Brand Personality** (from DesignDNA)

```typescript
interface ComponentSelection {
  componentType: string;           // 'faq-accordion', 'steps-timeline', etc.
  variant: string;                 // Brand-specific variant
  className: string;               // CSS class from BrandDesignSystem
  reasoning: string;               // Why this was chosen
}
```

### Component Matrix

| Content Pattern | Corporate Brand | Creative Brand | Minimal Brand |
|-----------------|-----------------|----------------|---------------|
| FAQ | accordion-clean | accordion-colorful | accordion-minimal |
| Steps | timeline-vertical | timeline-playful | steps-numbered |
| Comparison | table-striped | cards-grid | table-simple |
| List (short) | list-bullets | list-icons | list-dashes |
| List (long) | cards-compact | cards-featured | list-spaced |
| Quote | blockquote-bordered | blockquote-large | blockquote-simple |
| CTA | banner-contained | banner-gradient | button-text |

### High-Value Content Components

For UNIQUE/RARE attribute sections, specialized components:

```typescript
const highValueComponents = {
  uniqueInsight: {
    corporate: 'callout-executive-summary',
    creative: 'highlight-card-gradient',
    minimal: 'callout-bordered'
  },
  keyTakeaway: {
    corporate: 'takeaway-box-professional',
    creative: 'takeaway-card-vibrant',
    minimal: 'takeaway-simple'
  },
  expertQuote: {
    corporate: 'quote-attributed-formal',
    creative: 'quote-featured-large',
    minimal: 'quote-inline'
  }
};
```

### FS Protection

```typescript
function selectComponent(section: SectionAnalysis, dna: DesignDNA): ComponentSelection {
  // CRITICAL: Never alter FS-protected format codes
  if (section.constraints.fsProtection) {
    // Use standard component that preserves format
    return selectFSCompliantComponent(section.formatCode, dna);
  }

  // Free to use enhanced components
  return selectEnhancedComponent(section, dna);
}

function selectFSCompliantComponent(formatCode: string, dna: DesignDNA): ComponentSelection {
  // Maps format codes to FS-safe components
  const fsCompliant = {
    'numbered-list': 'list-ordered-plain',      // Clean <ol> for FS
    'bulleted-list': 'list-unordered-plain',    // Clean <ul> for FS
    'definition-list': 'list-definition-plain', // Clean <dl> for FS
    'table': 'table-standard',                  // Clean <table> for FS
    'paragraph': 'prose-standard'               // Clean <p> for FS
  };

  return {
    componentType: fsCompliant[formatCode],
    variant: 'fs-compliant',
    reasoning: 'FS-protected format code requires standard HTML structure'
  };
}
```

---

## Component 4: Visual Emphasizer

**Purpose:** Apply appropriate visual emphasis based on semantic weight.

**File:** `services/layout-engine/VisualEmphasizer.ts`

### Emphasis Levels

```typescript
type EmphasisLevel = 'hero' | 'featured' | 'standard' | 'supporting' | 'minimal';

interface VisualEmphasis {
  level: EmphasisLevel;

  // Typography
  headingSize: 'xl' | 'lg' | 'md' | 'sm';
  headingDecoration: boolean;      // Underline, accent, etc.

  // Spacing
  paddingMultiplier: number;       // 1.5x, 2x base padding
  marginMultiplier: number;

  // Background
  hasBackgroundTreatment: boolean;
  backgroundType?: 'solid' | 'gradient' | 'pattern' | 'image';

  // Border/Accent
  hasAccentBorder: boolean;
  accentPosition?: 'left' | 'top' | 'bottom' | 'all';

  // Shadow/Depth
  elevation: 0 | 1 | 2 | 3;        // Shadow levels

  // Animation (brand permitting)
  hasEntryAnimation: boolean;
  animationType?: 'fade' | 'slide' | 'scale';
}
```

### Semantic Weight to Emphasis Mapping

```typescript
function mapWeightToEmphasis(weight: 1|2|3|4|5, dna: DesignDNA): VisualEmphasis {
  const emphasisMap = {
    5: { // Hero - Maximum visual impact
      level: 'hero',
      headingSize: 'xl',
      headingDecoration: true,
      paddingMultiplier: 2,
      hasBackgroundTreatment: true,
      backgroundType: dna.personality.overall === 'minimal' ? 'solid' : 'gradient',
      elevation: 0, // Hero sections are foundational
      hasEntryAnimation: dna.motion.overall !== 'static'
    },
    4: { // Featured - Strong visual presence
      level: 'featured',
      headingSize: 'lg',
      headingDecoration: true,
      paddingMultiplier: 1.5,
      hasBackgroundTreatment: dna.personality.energy >= 3,
      hasAccentBorder: true,
      accentPosition: 'left',
      elevation: 2
    },
    3: { // Standard - Normal treatment
      level: 'standard',
      headingSize: 'md',
      headingDecoration: false,
      paddingMultiplier: 1,
      hasBackgroundTreatment: false,
      elevation: 0
    },
    2: { // Supporting - Reduced emphasis
      level: 'supporting',
      headingSize: 'sm',
      paddingMultiplier: 0.75,
      hasBackgroundTreatment: false,
      elevation: 0
    },
    1: { // Minimal - Least emphasis
      level: 'minimal',
      headingSize: 'sm',
      paddingMultiplier: 0.5,
      hasBackgroundTreatment: false,
      elevation: 0
    }
  };

  return emphasisMap[weight];
}
```

---

## Component 5: Suggestion Generator

**Purpose:** AI-powered improvements automatically applied to layouts.

**File:** `services/layout-engine/SuggestionGenerator.ts`

### Suggestion Types

```typescript
interface LayoutSuggestion {
  type: 'visual_break' | 'emphasis_adjustment' | 'component_upgrade' |
        'image_placement' | 'spacing_adjustment';

  sectionId: string;

  // The improvement
  change: {
    before: any;
    after: any;
  };

  // Why this helps
  reasoning: string;

  // Confidence (auto-apply if high)
  confidence: number;

  // Does this alter FS-protected content?
  fsImpact: boolean;
}
```

### Auto-Apply Mode

```typescript
async function generateAndApplySuggestions(
  blueprint: LayoutBlueprint,
  dna: DesignDNA,
  brief: ContentBrief
): Promise<{
  improvedBlueprint: LayoutBlueprint;
  appliedSuggestions: LayoutSuggestion[];
  skippedSuggestions: LayoutSuggestion[];
}> {
  const suggestions = await generateSuggestions(blueprint, dna, brief);

  const appliedSuggestions = [];
  const skippedSuggestions = [];

  for (const suggestion of suggestions) {
    // Never auto-apply if it impacts FS
    if (suggestion.fsImpact) {
      skippedSuggestions.push(suggestion);
      continue;
    }

    // Auto-apply high-confidence suggestions
    if (suggestion.confidence >= 0.8) {
      blueprint = applySuggestion(blueprint, suggestion);
      appliedSuggestions.push(suggestion);
    } else {
      skippedSuggestions.push(suggestion);
    }
  }

  return { improvedBlueprint: blueprint, appliedSuggestions, skippedSuggestions };
}
```

### Suggestion Categories

**Visual Rhythm:**
- "Three consecutive text-heavy sections. Suggesting visual break after section 4."
- "Long article with no width variation. Suggesting featured section go full-width."

**Component Upgrades:**
- "This 6-item list would be more scannable as icon cards (non-FS section)."
- "FAQ section could use accordion for better UX (FS-safe structure maintained)."

**Image Placement:**
- "High-importance section has no visual. Suggesting brand image from business kit."
- "Section discusses concept that could benefit from diagram placeholder."

---

## Component 6: Image Handling

**Purpose:** Manage image placement following Semantic SEO rules.

**File:** `services/layout-engine/ImageHandler.ts`

### Semantic SEO Image Rules (Immutable)

From the Semantic SEO framework, these rules are **never violated**:

1. **NEVER place images between heading and first paragraph**
   - Image after H2 MUST come after at least one paragraph

2. **Images must be semantically relevant**
   - Alt text extends vocabulary (not decorative descriptions)
   - Caption adds semantic context

3. **Featured images have specific placement**
   - Hero images: Before or after introduction, never mid-section
   - Section images: After establishing paragraph

### Image Sources (Priority Order)

```typescript
type ImageSource =
  | 'article_generated'    // Images from content generation (uploaded/generated)
  | 'brand_kit'            // From business brand kit
  | 'screenshot_derived'   // Elements from brand screenshots
  | 'placeholder'          // Structured placeholder with specs
  | 'none';                // No image for this section
```

### Image Placement Logic

```typescript
interface ImagePlacement {
  position: 'after-intro-paragraph' | 'section-end' | 'float-right' |
            'float-left' | 'full-width-break' | 'inline';
  source: ImageSource;
  semanticRole: 'hero' | 'explanatory' | 'evidence' | 'decorative';

  // For placeholders
  placeholder?: {
    aspectRatio: '16:9' | '4:3' | '1:1' | 'auto';
    suggestedContent: string;       // "Diagram showing X process"
    altTextTemplate: string;        // Vocabulary-extending alt text
  };
}

function determineImagePlacement(
  section: SectionAnalysis,
  sectionContent: string,
  dna: DesignDNA
): ImagePlacement | null {
  // Rule: Never between heading and first paragraph
  // Implementation: All image positions are AFTER at least one paragraph

  // Check if section already has image from content generation
  if (section.hasGeneratedImage) {
    return {
      position: 'after-intro-paragraph', // Safe position
      source: 'article_generated',
      semanticRole: 'explanatory'
    };
  }

  // High semantic weight sections may get brand imagery
  if (section.semanticWeight >= 4 && !section.constraints.fsProtection) {
    return {
      position: 'full-width-break',
      source: 'brand_kit',
      semanticRole: 'decorative'
    };
  }

  // Concept sections get diagram placeholders
  if (section.contentType === 'explanation' && section.hasComplexConcept) {
    return {
      position: 'after-intro-paragraph',
      source: 'placeholder',
      semanticRole: 'explanatory',
      placeholder: {
        aspectRatio: '16:9',
        suggestedContent: `Diagram illustrating ${section.mainConcept}`,
        altTextTemplate: `${section.mainConcept} visualization showing...`
      }
    };
  }

  return null; // No image needed
}
```

---

## Component 7: Layout Blueprint Output

**Purpose:** Complete specification for the Brand-Aware Renderer.

**File:** `types/layoutBlueprint.ts`

```typescript
interface LayoutBlueprint {
  // Metadata
  id: string;
  articleId: string;
  generatedAt: string;

  // Page-level settings
  pageSettings: {
    maxWidth: string;              // '1200px', '100%', etc.
    baseSpacing: string;           // '24px', '32px', etc.
    colorMode: 'light' | 'dark' | 'auto';
  };

  // Section specifications
  sections: BlueprintSection[];

  // AI reasoning (for transparency)
  reasoning: {
    layoutStrategy: string;        // Why this overall approach
    keyDecisions: string[];        // Notable choices made
    suggestionsApplied: LayoutSuggestion[];
    suggestionsSkipped: LayoutSuggestion[];
  };

  // Validation results
  validation: {
    semanticSeoCompliant: boolean;
    fsProtectionMaintained: boolean;
    brandAlignmentScore: number;   // 0-100
    issues: string[];
  };
}

interface BlueprintSection {
  id: string;

  // Content reference
  originalSectionId: string;
  headingText: string;

  // Layout parameters
  layout: LayoutParameters;

  // Component selection
  component: ComponentSelection;

  // Visual emphasis
  emphasis: VisualEmphasis;

  // Image handling
  image: ImagePlacement | null;

  // CSS classes to apply
  cssClasses: string[];

  // Inline style overrides (minimal use)
  inlineStyles?: Record<string, string>;

  // Reasoning for this section
  reasoning: string;
}
```

---

## Component 8: Brand-Aware Renderer

**Purpose:** Render blueprints using complete BrandDesignSystem including compiledCss.

**File:** `services/publishing/renderer/BrandAwareRenderer.ts`

### Key Change: Use compiledCss

The current renderer ignores `BrandDesignSystem.compiledCss`. The new renderer uses it fully:

```typescript
async function renderBlueprint(
  blueprint: LayoutBlueprint,
  brandDesignSystem: BrandDesignSystem,
  content: ArticleContent,
  outputMode: 'wordpress' | 'html' | 'pdf'
): Promise<RenderedOutput> {

  // 1. Start with complete brand CSS (THE KEY FIX)
  const css = [
    brandDesignSystem.compiledCss,           // Complete design system CSS
    brandDesignSystem.interactions.keyframes, // Animations
    generateLayoutCss(blueprint)              // Layout-specific overrides
  ].join('\n');

  // 2. Render each section with brand-aware components
  const sectionsHtml = blueprint.sections.map(section => {
    return renderSection(section, brandDesignSystem, content);
  }).join('\n');

  // 3. Add decorative elements
  const decoratedHtml = addDecorativeElements(sectionsHtml, brandDesignSystem.decorative);

  // 4. Wrap in page structure
  const html = wrapInPageStructure(decoratedHtml, blueprint.pageSettings);

  // 5. Output mode specific processing
  return processForOutputMode(html, css, outputMode);
}

function renderSection(
  section: BlueprintSection,
  brandDesignSystem: BrandDesignSystem,
  content: ArticleContent
): string {
  const sectionContent = content.sections[section.originalSectionId];

  // Get component renderer
  const componentRenderer = getComponentRenderer(section.component.componentType);

  // Build CSS classes from brand system + emphasis
  const classes = [
    ...section.cssClasses,
    brandDesignSystem.variantMappings[section.component.componentType]?.[section.component.variant],
    getEmphasisClasses(section.emphasis)
  ].filter(Boolean).join(' ');

  // Build wrapper styles
  const wrapperStyles = buildWrapperStyles(section.layout, section.emphasis);

  // Render
  return `
    <section class="${classes}" style="${wrapperStyles}" data-section-id="${section.id}">
      ${componentRenderer.render(sectionContent, section, brandDesignSystem)}
    </section>
  `;
}
```

### WordPress Output Mode

For WordPress (priority output mode):

```typescript
function processForWordPress(html: string, css: string): WordPressOutput {
  return {
    // Gutenberg block-compatible HTML
    content: html,

    // CSS as custom block styles or theme customizer
    customCss: css,

    // WordPress-specific metadata
    meta: {
      // Custom fields for brand settings
      brandDesignSystemId: string,
      layoutBlueprintId: string,

      // SEO fields
      yoastPrimaryKeyword: string,
      schemaMarkup: string
    },

    // Block registration if using custom blocks
    blocks: extractGutenbergBlocks(html)
  };
}
```

---

## Component 9: AI Visual Validation

**Purpose:** Compare rendered output to brand source, ensuring alignment.

**File:** `services/layout-engine/VisualValidator.ts`

### Process

1. Render preview to screenshot
2. Compare to brand source screenshot
3. AI evaluates alignment on multiple dimensions
4. Return validation result with feedback

```typescript
interface VisualValidationResult {
  overallScore: number;            // 0-100 brand alignment

  dimensions: {
    colorAlignment: number;        // Do colors match brand palette?
    typographyAlignment: number;   // Fonts and hierarchy match?
    spacingAlignment: number;      // Density and rhythm match?
    componentStyleAlignment: number; // Do components feel on-brand?
    overallVibe: number;          // Does it "feel" like the brand?
  };

  issues: {
    severity: 'critical' | 'warning' | 'suggestion';
    description: string;
    suggestion: string;
  }[];

  aiAssessment: string;            // Natural language assessment
}
```

### AI Prompt for Visual Comparison

```typescript
export const VISUAL_VALIDATION_PROMPT = `
You are comparing two designs to assess brand alignment.

IMAGE 1: Brand source website screenshot
IMAGE 2: Generated article preview

Evaluate how well the generated preview captures the brand's visual identity:

1. **Color Alignment** (0-100)
   - Are the same primary/secondary/accent colors used?
   - Is the color application similar (buttons, backgrounds, accents)?

2. **Typography Alignment** (0-100)
   - Do heading styles match?
   - Is the text hierarchy similar?
   - Are font weights/styles consistent?

3. **Spacing Alignment** (0-100)
   - Is the density (compact/spacious) similar?
   - Are margins and padding proportional?

4. **Component Style Alignment** (0-100)
   - Do cards, buttons, lists look on-brand?
   - Are border-radius treatments consistent?
   - Do shadow/depth effects match?

5. **Overall Vibe** (0-100)
   - Does it "feel" like the same brand?
   - Would someone recognize this as from the same company?

Provide:
- Score for each dimension
- Overall score (weighted average)
- List of issues with severity
- Natural language assessment

Be honest - a score of 60-70 is acceptable for a first generation.
Scores above 85 indicate excellent brand alignment.
`;
```

---

## Component 10: Error Handling & Edge Cases

### Missing Design DNA

```typescript
function handleMissingDesignDNA(): DesignDNA {
  // Return sensible defaults based on detected industry/context
  return {
    ...defaultDesignDNA,
    personality: inferPersonalityFromBusinessContext(businessInfo),
    colors: inferColorsFromIndustry(businessInfo.industry)
  };
}
```

### Conflicting Requirements

```typescript
function resolveConflicts(
  semanticRequirement: any,
  designPreference: any
): any {
  // ALWAYS: Semantic SEO wins
  if (semanticRequirement.fsProtection) {
    return semanticRequirement;
  }

  // Otherwise: Design can adjust presentation
  return mergeWithSemanticPriority(semanticRequirement, designPreference);
}
```

### Performance Constraints

```typescript
const LAYOUT_ENGINE_CONSTRAINTS = {
  maxSections: 50,                 // Limit for performance
  maxComponentComplexity: 3,       // Nested component depth
  maxCssSize: 100000,              // 100KB CSS limit
  timeoutMs: 30000                 // 30 second timeout
};
```

---

## Component 11: Output Quality Validation

### Automated Checks

```typescript
interface QualityValidation {
  // HTML validity
  htmlValid: boolean;
  htmlErrors: string[];

  // Accessibility
  accessibilityScore: number;
  accessibilityIssues: string[];

  // Performance
  cssSize: number;
  htmlSize: number;
  estimatedLoadTime: number;

  // Brand consistency
  brandTokensUsed: string[];       // Which tokens were applied
  brandTokensMissing: string[];    // Which should have been used

  // Semantic SEO
  semanticSeoValid: boolean;
  formatCodesPreserved: boolean;
  fsStructuresIntact: boolean;
}
```

---

## UI/UX Design

### Current Pain Points (from analysis)

1. **Redundant Brand Detection UI**: BrandStep and BrandStyleStep duplicate functionality
2. **Hidden Design Personalities**: Sliders buried in tabs, not discoverable
3. **Opaque Blueprint Generation**: Raw JSON, no reasoning visible
4. **Disconnected Layout Controls**: Layout panel separate from blueprint logic
5. **Flow Confusion**: Style config in Step 1, layout adjustments in Step 2

### Redesigned Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: BRAND INTELLIGENCE                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [Screenshot]  Brand DNA Summary                                       │  │
│  │ ┌──────────┐  Colors: ● ● ● ●   Fonts: Heading + Body                │  │
│  │ │          │  Personality: Modern Professional                        │  │
│  │ │  Brand   │                                                          │  │
│  │ │  Image   │  ▼ Adjust Personality (optional)                         │  │
│  │ │          │    Formality  ═══════●══════                             │  │
│  │ └──────────┘    Energy     ════●════════                              │  │
│  │                 Warmth     ══════════●════                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  [Continue →]                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: LAYOUT INTELLIGENCE (NEW)                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ AI Layout Reasoning:                                                  │  │
│  │ "Based on your FS target (people-also-ask) and brand personality      │  │
│  │  (professional), I'm using structured layouts with clear visual       │  │
│  │  hierarchy..."                                                        │  │
│  │                                                                       │  │
│  │ Section Preview (scrollable):                                         │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐   │  │
│  │ │ HERO: Introduction  [Full Width]  ★★★★★                         │   │  │
│  │ │ "Sets context with semantic bridge, high visual weight"         │   │  │
│  │ ├─────────────────────────────────────────────────────────────────┤   │  │
│  │ │ FEATURED: Core Answer  [Wide + Sidebar]  ★★★★                   │   │  │
│  │ │ "Primary content answering central search intent"               │   │  │
│  │ ├─────────────────────────────────────────────────────────────────┤   │  │
│  │ │ STANDARD: Supporting Detail  [Standard]  ★★★                    │   │  │
│  │ │ "Elaborates ROOT attribute with list format"                    │   │  │
│  │ └─────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │ [3 AI Suggestions Applied] ▼ View/Adjust                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  [← Back]                              [Continue →]                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: VISUAL PREVIEW                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [Desktop] [Tablet] [Mobile]              Brand Match: 94% ✓          │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐   │  │
│  │ │                                                                 │   │  │
│  │ │                  LIVE RENDERED PREVIEW                          │   │  │
│  │ │               (with actual brand styling)                       │   │  │
│  │ │                                                                 │   │  │
│  │ └─────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │ AI Validation: "Output matches brand typography and color scheme.    │  │
│  │ Visual hierarchy aligns with source website."                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  [← Back]                              [Publish →]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key UI Changes

| Current | Proposed | Rationale |
|---------|----------|-----------|
| BrandStep + BrandStyleStep (redundant) | Single Brand Intelligence step | Remove confusion |
| Hidden personality sliders in tabs | Visible, inline personality adjustment | Key brand control must be discoverable |
| Blueprint JSON panel | AI reasoning with section preview | Human-readable decisions |
| Separate Layout panel | Integrated into Layout Intelligence step | Connect decisions to outcomes |
| No visual validation | Brand Match score + AI assessment | Confidence in output quality |
| Manual color/font tabs | Auto-derived from DesignDNA | Users adjust personality, not raw values |

### Components to Remove

1. **BrandStyleStep.tsx manual tabs** (Colors/Typography/Spacing)
   - Replaced by: Personality sliders that cascade to design tokens

2. **Blueprint JSON viewer**
   - Replaced by: Human-readable section preview with reasoning

3. **Disconnected Layout panel**
   - Replaced by: Integrated Layout Intelligence step

### New Components to Create

1. **LayoutIntelligenceStep.tsx**
   - Shows AI reasoning for layout decisions
   - Scrollable section preview with emphasis indicators
   - Collapsible "Suggestions Applied" section

2. **BrandMatchIndicator.tsx**
   - Shows brand alignment score (0-100%)
   - AI assessment text
   - Link to detailed validation

3. **SectionPreviewCard.tsx**
   - Compact section summary
   - Emphasis level (stars)
   - Layout parameters (width, columns)
   - Reasoning snippet

---

## Implementation Phases

### Phase 1: Core Layout Engine (Week 1)
- [ ] Create SectionAnalyzer with semantic weight calculation
- [ ] Create LayoutPlanner with width/column logic
- [ ] Create ComponentSelector with two-factor selection
- [ ] Create VisualEmphasizer with emphasis mapping

### Phase 2: Integration (Week 2)
- [ ] Create SuggestionGenerator with auto-apply
- [ ] Create ImageHandler with semantic rules
- [ ] Create LayoutBlueprint output structure
- [ ] Update BrandAwareRenderer to use compiledCss

### Phase 3: Validation (Week 3)
- [ ] Create VisualValidator with screenshot comparison
- [ ] Create quality validation checks
- [ ] Add error handling and edge cases
- [ ] Add performance constraints

### Phase 4: UI Redesign (Week 4)
- [ ] Consolidate BrandStep + BrandStyleStep
- [ ] Create LayoutIntelligenceStep
- [ ] Add BrandMatchIndicator
- [ ] Update PreviewStep with AI validation
- [ ] Remove obsolete components

---

## Success Criteria

1. **Visual Uniqueness**: Two brands produce visually distinct outputs
2. **Semantic Integrity**: Format codes never altered, FS structures preserved
3. **Brand Alignment**: >80% score on visual validation
4. **User Clarity**: Users understand why layout decisions were made
5. **Quality**: Output looks like a design agency created it
6. **Performance**: Layout generation < 10 seconds
7. **Flexibility**: Users can adjust personality, see real-time updates

---

## Open Questions

1. **Real-time Preview Updates**: Should personality slider changes update preview instantly?
2. **Manual Override Depth**: How much control should users have over individual sections?
3. **AI Model Selection**: Which model for visual validation (Gemini? Claude?)?
4. **Caching Strategy**: Cache layout blueprints or regenerate each time?
5. **Dark Mode**: Auto-generate dark mode layouts from DesignDNA?

---

*Document generated as part of brainstorming session for Intelligent Layout Engine architecture.*
