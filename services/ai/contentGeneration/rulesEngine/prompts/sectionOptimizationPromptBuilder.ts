// services/ai/contentGeneration/rulesEngine/prompts/sectionOptimizationPromptBuilder.ts
import {
  SectionOptimizationContext,
  ContentGenerationSection,
  HolisticSummaryContext,
  ContentFormatBudget,
  ContentBrief,
  BusinessInfo,
  BriefVisualSemantics,
  VisualSemanticAnalysis
} from '../../../../../types';
import { serializeHolisticContext } from '../../holisticAnalyzer';
import { getLanguageName, getLanguageAndRegionInstruction, getRegionalLanguageVariant } from '../../../../../utils/languageUtils';

/**
 * Section-level prompt builders for optimization passes 2-7.
 * Each prompt includes:
 * - Current section content (the only content AI will modify)
 * - Holistic context summary (for article-wide awareness)
 * - Adjacent section context (for discourse continuity)
 * - Pass-specific rules
 */

/**
 * Self-verification checklist to improve AI compliance with quality rules.
 * Included at the end of each optimization prompt.
 */
function buildSelfVerificationChecklist(
  centralEntity: string,
  hasImages: boolean,
  passNumber: number
): string {
  const checks: string[] = [];

  // Core checks for all passes
  checks.push(`☐ Central Entity "${centralEntity}" appears in first sentence or paragraph`);
  checks.push(`☐ Each sentence contains ONE complete fact (Entity + Attribute + Value)`);
  checks.push(`☐ No sentences start with "Also", "Additionally", "Furthermore", "Moreover"`);
  checks.push(`☐ No filler words: "very", "really", "basically", "actually", "just"`);
  checks.push(`☐ Passive voice used sparingly (≤2 times per 100 words)`);

  // Preservation checks for later passes
  if (passNumber > 2) {
    checks.push(`☐ Heading hierarchy intact (no H2/H3 levels changed)`);
  }

  // Image preservation check
  if (hasImages || passNumber >= 7) {
    checks.push(`☐ All [IMAGE: ...] placeholders preserved EXACTLY (count unchanged)`);
  }

  // Structure preservation
  if (passNumber > 3) {
    checks.push(`☐ Lists and tables preserved (if any existed)`);
  }

  return `
## SELF-VERIFICATION CHECKLIST (Complete before returning)
Before returning your response, silently verify ALL of the following:

${checks.join('\n')}

If ANY check fails, revise your output before returning. Do not mention this checklist in your output.`;
}

// ============================================
// Pass 2: Header Optimization
// ============================================

export function buildPass2Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, adjacentContext, brief, businessInfo } = ctx;
  const regionalLang = getRegionalLanguageVariant(businessInfo.language, businessInfo.region);

  return `You are a Holistic SEO editor specializing in heading optimization.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}
**Target Market: ${businessInfo.targetMarket || 'Global'}**

## Your Task
Optimize the heading and content structure for ONE section. Return ONLY the optimized section content.

## Current Section to Optimize
**Heading:** ${section.section_heading}
**Level:** H${section.section_level}
**Content:**
${section.current_content}

## Article Context (Read-Only Reference)
${serializeHolisticContext(holistic)}

${adjacentContext.previousSection ? `
## Previous Section (for flow reference)
**${adjacentContext.previousSection.heading}** ends with:
"${(adjacentContext.previousSection.lastParagraph || '').substring(0, 150)}..."
` : ''}

${adjacentContext.nextSection ? `
## Next Section (for flow reference)
**${adjacentContext.nextSection.heading}** begins with:
"${(adjacentContext.nextSection.firstParagraph || '').substring(0, 150)}..."
` : ''}

## Header Optimization Rules:
1. **Contextual Overlap**: Heading must contain terms linking to "${holistic.centralEntity}"
2. **No Level Skips**: Maintain proper H${section.section_level} level
3. **Query Pattern Matching**: Heading should match likely search queries in ${regionalLang}
4. **Subordinate Text**: First sentence after heading must directly support it

## Instructions:
1. Improve the heading if it lacks connection to "${holistic.centralEntity}"
2. Ensure first paragraph directly answers/defines what the heading promises
3. Maintain all content - do not summarize
4. Keep language in ${regionalLang}
${buildSelfVerificationChecklist(holistic.centralEntity, section.current_content?.includes('[IMAGE:') || false, 2)}

**OUTPUT ONLY the optimized section content (heading + paragraphs). No explanations.**`;
}

// ============================================
// Pass 3: Lists & Tables
// ============================================

export function buildPass3Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, brief, businessInfo } = ctx;

  return `You are a Holistic SEO editor specializing in structured data optimization.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}

## Your Task
Optimize lists and tables in ONE section for Featured Snippet opportunities. Return ONLY the optimized section.

## Current Section to Optimize
**Heading:** ${section.section_heading}
**Content:**
${section.current_content}

## Article Context
Total sections: ${holistic.articleStructure.totalSections}
This section: ${Math.round((holistic.coverageDistribution.find(c => c.sectionKey === section.section_key)?.percentage || 0))}% of article
${holistic.featuredSnippetTarget ? `Featured Snippet Target: ${holistic.featuredSnippetTarget.targetType}` : ''}

## List & Table Rules:
1. **Ordered Lists (<ol>)**: ONLY for rankings, steps, or superlatives ("Top 10", "How to")
2. **Unordered Lists (<ul>)**: For types, examples, components where order doesn't matter
3. **List Preamble**: Every list MUST be preceded by exact count ("The 5 main types include:")
4. **Table Structure**: Columns = attributes (Price, Speed), Rows = entities
5. **One Fact Per Item**: Each list item delivers ONE unique fact
6. **Instructional Lists**: Items in how-to lists start with command verbs

## Instructions:
1. Convert appropriate prose to lists where Featured Snippet opportunity exists
2. Ensure every list has a proper count preamble
3. Verify ordered vs unordered is semantically correct
4. Keep prose where it's more appropriate than lists
${buildSelfVerificationChecklist(holistic.centralEntity, section.current_content?.includes('[IMAGE:') || false, 3)}

**OUTPUT ONLY the optimized section content. No explanations.**`;
}

/**
 * Batch prompt for Pass 3: Lists & Tables
 * Processes multiple sections in a single API call while respecting format budget.
 */
export function buildPass3BatchPrompt(
  batch: ContentGenerationSection[],
  holistic: HolisticSummaryContext,
  budget: ContentFormatBudget,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): string {
  const regionalLang = getRegionalLanguageVariant(businessInfo.language, businessInfo.region);

  // Build section entries
  const sectionEntries = batch.map(section => {
    const classification = budget.sectionClassifications.find(c => c.sectionKey === section.section_key);
    const needsList = budget.sectionsNeedingOptimization.lists.includes(section.section_key);
    const needsTable = budget.sectionsNeedingOptimization.tables.includes(section.section_key);

    return `
[SECTION: ${section.section_key}]
**Type:** ${classification?.type || 'body'}
**Heading:** ${section.section_heading}
**Recommendation:** ${needsList ? 'ADD LIST' : ''} ${needsTable ? 'ADD TABLE' : ''}
**Current Content:**
${section.current_content}
`;
  }).join('\n---\n');

  return `You are a Holistic SEO editor optimizing lists and tables for multiple sections.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}

## Content Format Budget (Baker Principle)
The article needs balanced prose and structured content:
- Current sections with lists: ${budget.currentStats.sectionsWithLists}/${budget.currentStats.totalSections} (max: ${budget.constraints.maxListSections})
- Current sections with tables: ${budget.currentStats.sectionsWithTables}/${budget.currentStats.totalSections} (max: ${budget.constraints.maxTableSections})
- Prose ratio: ${(budget.currentStats.proseToStructuredRatio * 100).toFixed(0)}% (target: 60-80%)

## List & Table Rules
1. **List Definition Rule**: Every list MUST be preceded by a definition sentence ending with ":"
   - Correct: "The primary benefits include:" [list]
   - Wrong: [heading] → [list] (disconnects list from context)

2. **Ordered Lists (<ol>)**: ONLY for rankings, steps, or superlatives ("Top 10", "How to")
3. **Unordered Lists (<ul>)**: For types, examples, components where order doesn't matter
4. **Table Appropriateness**: Tables ONLY for comparing 2+ entities with 2+ attributes
   - Two-column tables should be converted to lists
5. **Macro Context (intro/definitions)**: Keep PARAGRAPH-HEAVY, minimal lists
6. **Supplementary Sections**: Lists are acceptable here

## Sections to Optimize
${sectionEntries}

## Output Format
For EACH section, output:
[SECTION: section-key]
...optimized content...

Keep sections in order. Apply list/table ONLY where marked with recommendation.
Preserve prose where structured content is not needed.

**OUTPUT ONLY the section markers and optimized content in ${regionalLang}. No explanations.**`;
}

// ============================================
// Pass 4: Visual Semantics (in new 10-pass order: now Pass 7)
// ============================================

/**
 * Extract image descriptions from previous sections to avoid duplicates.
 * Looks for [IMAGE: description | alt="..."] patterns.
 */
function extractExistingImageDescriptions(
  currentSection: ContentGenerationSection,
  allSections: ContentGenerationSection[]
): string[] {
  const imagePattern = /\[IMAGE:\s*([^|]+)\s*\|/gi;
  const descriptions: string[] = [];

  for (const section of allSections) {
    // Only check sections that come before the current one
    if (section.section_order >= currentSection.section_order) continue;

    const content = section.current_content || '';
    let match;
    while ((match = imagePattern.exec(content)) !== null) {
      const desc = match[1].trim();
      if (desc && desc.length > 10) {
        descriptions.push(desc);
      }
    }
  }

  return descriptions;
}

/**
 * Get visual semantics suggestions relevant to a specific section.
 * Checks enhanced_visual_semantics.section_images first (keyed by section),
 * then falls back to visual_semantics array with fuzzy matching.
 */
function getRelevantVisualSemantics(
  section: ContentGenerationSection,
  visualSemantics: Array<{ description: string; alt_text?: string; section_hint?: string; type?: string }> | undefined,
  enhancedVisualSemantics?: BriefVisualSemantics
): Array<{ description: string; alt_text?: string; type?: string; figcaption?: string }> {
  const results: Array<{ description: string; alt_text?: string; type?: string; figcaption?: string }> = [];
  const sectionKey = section.section_key?.toLowerCase() || '';
  const sectionHeading = section.section_heading?.toLowerCase() || '';

  // First, check enhanced_visual_semantics.section_images (keyed by section)
  if (enhancedVisualSemantics?.section_images) {
    // Try exact key match first
    const exactMatch = Object.entries(enhancedVisualSemantics.section_images).find(
      ([key]) => key.toLowerCase() === sectionKey
    );
    if (exactMatch) {
      const vs = exactMatch[1];
      results.push({
        description: vs.image_description,
        alt_text: vs.alt_text_recommendation,
        type: 'ENHANCED',
        figcaption: vs.figcaption_text
      });
    }

    // Also check if this is intro section and needs hero image
    if ((sectionKey === 'intro' || section.section_order === 0) && enhancedVisualSemantics.hero_image) {
      const hero = enhancedVisualSemantics.hero_image;
      results.push({
        description: hero.image_description + ' (HERO IMAGE)',
        alt_text: hero.alt_text_recommendation,
        type: 'HERO',
        figcaption: hero.figcaption_text
      });
    }
  }

  // If we found enhanced semantics, return those (they're more specific)
  if (results.length > 0) return results;

  // Fall back to visual_semantics array with fuzzy matching
  if (!visualSemantics || visualSemantics.length === 0) return [];

  const sectionContent = (section.current_content || '').toLowerCase().substring(0, 500);

  return visualSemantics.filter(vs => {
    const desc = vs.description?.toLowerCase() || '';
    const hint = vs.section_hint?.toLowerCase() || '';

    // Match if section_hint references this section
    if (hint && (sectionKey.includes(hint) || sectionHeading.includes(hint) || hint.includes(sectionKey))) {
      return true;
    }

    // Match if description has significant overlap with section heading/content
    const descWords = desc.split(/\s+/).filter(w => w.length > 4);
    const matchingWords = descWords.filter(w =>
      sectionHeading.includes(w) || sectionContent.includes(w)
    );

    return matchingWords.length >= 2;
  });
}

export function buildPass4Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, brief, businessInfo } = ctx;
  const regionalLang = getRegionalLanguageVariant(businessInfo.language, businessInfo.region);
  const isFirstSection = section.section_order === 0 || section.section_key === 'intro';

  // Get visual semantics from brief - check enhanced_visual_semantics first, then fall back to visual_semantics
  const briefVisualSemantics = brief?.visual_semantics || [];
  const relevantSemantics = getRelevantVisualSemantics(section, briefVisualSemantics, brief?.enhanced_visual_semantics);

  // Check what images already exist in previous sections to avoid duplicates
  const existingImageDescriptions = extractExistingImageDescriptions(section, ctx.allSections || []);

  // Format visual semantics for the prompt
  const visualSemanticsSection = relevantSemantics.length > 0
    ? `
## VISUAL SEMANTICS FROM CONTENT BRIEF (PRIMARY GUIDE)
These images were planned during content briefing. Use them as your guide:
${relevantSemantics.map((vs, i) => `
${i + 1}. **Description:** ${vs.description}
   **Alt Text:** ${vs.alt_text || 'Generate vocabulary-extending alt text'}
   **Type:** ${vs.type || 'SECTION'}${vs.figcaption ? `
   **Figcaption:** ${vs.figcaption}` : ''}
`).join('')}

IMPORTANT: Use these pre-planned image descriptions when inserting placeholders.
`
    : briefVisualSemantics.length > 0
      ? `
## VISUAL SEMANTICS AVAILABLE (may not match this section)
The brief contains ${briefVisualSemantics.length} planned images. If none apply to this section,
generate appropriate images based on the content.
`
      : '';

  // Check visual_placement_map for this section's specific placement data
  const placementEntry = brief?.visual_placement_map?.find(
    (vp: any) => vp.section_heading?.toLowerCase() === section.section_heading?.toLowerCase()
  );
  const placementMapSection = placementEntry
    ? `
## VISUAL PLACEMENT MAP (EAV-grounded)
This section has a specific image placement from the content brief:
- **Entity Anchor:** ${placementEntry.entity_anchor || 'N/A'}
- **Placement:** ${placementEntry.placement_rationale || 'after first paragraph'}
- **Image Type:** ${placementEntry.image_type || 'SCENE'}${placementEntry.eav_reference ? `
- **EAV Reference:** ${placementEntry.eav_reference.subject || '?'} → ${placementEntry.eav_reference.predicate || '?'} → ${placementEntry.eav_reference.object || '?'}
- Use this EAV in the alt text to ground the image semantically.` : ''}

Use this placement data to generate a precise, EAV-grounded image placeholder.
`
    : '';

  // Add deduplication warning if there are already images in the article
  const deduplicationWarning = existingImageDescriptions.length > 0
    ? `
## CRITICAL: AVOID DUPLICATE IMAGES
The following images ALREADY exist in earlier sections. DO NOT use similar descriptions:
${existingImageDescriptions.slice(0, 5).map(d => `- "${d.slice(0, 60)}..."`).join('\n')}

Generate a UNIQUE image specific to THIS section's content. Each section needs its own distinct visual.
`
    : '';

  return `You are a Holistic SEO editor applying KORAYANESE FRAMEWORK for visual semantics.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}

## Your Task
Insert image placeholders following STRICT Korayanese positioning rules.
${relevantSemantics.length > 0 ? `Use the pre-planned visual semantics from the content brief.` : ''}

## Current Section to Optimize
**Heading:** ${section.section_heading}
**Section Order:** ${section.section_order + 1} of ${holistic.articleStructure.totalSections}
**Content:**
${section.current_content}

## Central Entity: ${holistic.centralEntity}
## Title: ${holistic.articleStructure.title}

${isFirstSection ? `
## HERO IMAGE REQUIRED (PHOTOGRAPHIC-FIRST APPROACH)
This is the INTRODUCTION section. You MUST insert a HERO image.

### HERO IMAGE POSITIONING RULE:
The hero image MUST be placed:
- AFTER the first paragraph (the definition/centerpiece annotation)
- BEFORE any subsequent paragraphs
- NEVER between the heading and the first paragraph

### HERO IMAGE TYPE: SCENE PHOTOGRAPH
- Must be a PHOTOGRAPH, not an infographic or diagram
- Should visually represent the central topic through imagery
- NO TEXT OVERLAYS - all text goes in figcaption
- Wide cinematic composition (16:9 aspect ratio)
- Must represent the central entity "${holistic.centralEntity}"

### CORRECT STRUCTURE:
## [Heading]
[First paragraph - the definition/centerpiece annotation]

[IMAGE: SCENE photograph showing ${holistic.centralEntity} in context | alt="vocabulary-extending alt describing ${holistic.centralEntity}"]

[Second paragraph onwards...]

### WRONG STRUCTURE:
## [Heading]
[IMAGE: ...] <-- WRONG: Image before definition
[First paragraph]
` : `
## SECTION IMAGE RULES
For body sections (non-intro):
- Place images AFTER explanatory paragraphs, not before
- Pattern: Heading → Answer paragraph → Image → Next content
- NEVER place image between heading and its answer
`}
${visualSemanticsSection}
${placementMapSection}
${deduplicationWarning}
## KORAYANESE IMAGE POSITIONING RULES:

### RULE 1: HEADING-ANSWER PROXIMITY
**NEVER place image between a heading and its first paragraph.**
- The first paragraph after ANY heading must be the direct answer/definition
- Images come AFTER the answer paragraph

### RULE 2: IMAGE PLACEMENT PATTERN
CORRECT: Heading → Paragraph (answer) → Image → Next paragraph
WRONG: Heading → Image → Paragraph

### RULE 3: TEXTUAL QUALIFICATION
The sentence BEFORE or AFTER an image must reference what the image shows.
- Example: "De onderstaande afbeelding toont..." or "...zoals weergegeven in het diagram hieronder."

### RULE 4: PHOTOGRAPHIC OVER DIAGRAMMATIC
- Prefer: Scene photographs, object photos, action shots, concept imagery
- Use sparingly: Minimal flowcharts (only for explicit processes)
- NEVER use: Infographics with text, labeled diagrams, charts with numbers

AI image generators cannot reliably render text. All explanatory text belongs in:
- <figcaption> elements below the image
- Alt text attributes
- Surrounding paragraph text

## Image Placeholder Format:
[IMAGE: detailed description of PHOTOGRAPHIC visual | alt="vocabulary-extending alt text with NEW terms not in headings"]

## Image Types (PHOTOGRAPHIC-FIRST):
- **SCENE**: Environmental/contextual photographs (DEFAULT)
- **OBJECT**: Product or item close-up photographs
- **ACTION**: People performing activities
- **CONCEPT**: Abstract photorealistic imagery for ideas/data
- **FLOWCHART**: ONLY for explicit step-by-step processes (minimal shapes, NO labels)
- **COMPARISON**: ONLY for explicit A vs B content (visual contrast, NO text)

## DEPRECATED (DO NOT USE):
- ~~INFOGRAPHIC~~ → Use CONCEPT photograph instead
- ~~CHART~~ → Use CONCEPT photograph instead
- ~~DIAGRAM with labels~~ → Use FLOWCHART with shapes only

## Vocabulary Terms to AVOID in Alt Text (already overused):
${holistic.vocabularyMetrics.overusedTerms.slice(0, 5).map(t => t.term).join(', ')}

## Instructions:
1. ${isFirstSection ? 'Insert HERO image AFTER first paragraph' : 'Insert 0-2 section images AFTER explanation paragraphs'}
2. NEVER place image between heading and first paragraph
3. Use PHOTOGRAPHIC image types (scene, object, action, concept) over diagrams
4. Use vocabulary-extending alt text with synonyms/related terms
5. Write in ${regionalLang}

**OUTPUT the section with properly positioned image placeholders. No explanations.**`;
}

/**
 * Batch prompt for Pass 4: Visual Semantics
 * Processes multiple sections in a single API call with image placement.
 * Uses [SECTION: key] markers for reliable parsing.
 */
export function buildPass4BatchPrompt(
  batch: ContentGenerationSection[],
  holistic: HolisticSummaryContext,
  budget: ContentFormatBudget,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): string {
  const regionalLang = getRegionalLanguageVariant(businessInfo.language, businessInfo.region);

  // Track all images already in the article to prevent duplicates
  const allExistingImages: string[] = [];
  const imagePattern = /\[IMAGE:\s*([^|]+)\s*\|/gi;

  // Get visual semantics from brief for guidance
  const briefVisualSemantics = brief?.visual_semantics || [];
  const enhancedVisualSemantics = brief?.enhanced_visual_semantics;

  // Build section entries with deduplication context and section-specific image recommendations
  const sectionEntries = batch.map((section, idx) => {
    // Extract images from this section and all previous
    const content = section.current_content || '';
    let match;
    while ((match = imagePattern.exec(content)) !== null) {
      allExistingImages.push(match[1].trim());
    }

    const isFirstSection = section.section_order === 0 || section.section_key === 'intro';
    const classification = budget.sectionClassifications.find(c => c.sectionKey === section.section_key);
    const needsImage = budget.sectionsNeedingOptimization.images.includes(section.section_key);

    // Get section-specific image from enhanced_visual_semantics if available
    const sectionKey = section.section_key?.toLowerCase() || '';
    let sectionImageRecommendation = '';
    if (enhancedVisualSemantics?.section_images) {
      const match = Object.entries(enhancedVisualSemantics.section_images).find(
        ([key]) => key.toLowerCase() === sectionKey
      );
      if (match) {
        const vs = match[1];
        sectionImageRecommendation = `
**RECOMMENDED IMAGE:** ${vs.image_description}
**ALT TEXT:** ${vs.alt_text_recommendation}
**FIGCAPTION:** ${vs.figcaption_text}`;
      }
    }

    // Hero image for intro section
    if (isFirstSection && enhancedVisualSemantics?.hero_image) {
      const hero = enhancedVisualSemantics.hero_image;
      sectionImageRecommendation = `
**HERO IMAGE RECOMMENDED:** ${hero.image_description}
**ALT TEXT:** ${hero.alt_text_recommendation}
**FIGCAPTION:** ${hero.figcaption_text}`;
    }

    return `
[SECTION: ${section.section_key}]
**Type:** ${classification?.type || 'body'}
**Heading:** ${section.section_heading}
**Section Order:** ${section.section_order + 1} of ${holistic.articleStructure.totalSections}
**Needs Image:** ${needsImage ? 'YES' : 'NO (preserve existing only)'}
${isFirstSection ? '**HERO REQUIRED:** YES - This is the intro section' : ''}${sectionImageRecommendation}
**Current Content:**
${content}
`;
  }).join('\n---\n');

  return `You are a Holistic SEO editor applying KORAYANESE FRAMEWORK for visual semantics to MULTIPLE sections.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}

## Central Entity: ${holistic.centralEntity}
## Article Title: ${holistic.articleStructure.title}

## CRITICAL: UNIQUE IMAGES PER SECTION
Each section MUST have a UNIQUE image. DO NOT reuse or duplicate image descriptions across sections.

${allExistingImages.length > 0 ? `
## IMAGES ALREADY IN ARTICLE (DO NOT DUPLICATE):
${allExistingImages.slice(0, 10).map(d => `- "${d.slice(0, 60)}..."`).join('\n')}
` : ''}

${briefVisualSemantics.length > 0 ? `
## VISUAL SEMANTICS FROM BRIEF (Use as guidance):
${briefVisualSemantics.slice(0, 5).map((vs, i) => `${i + 1}. ${vs.description} (${vs.type || 'SECTION'})`).join('\n')}
` : ''}

## PHOTOGRAPHIC-FIRST IMAGE RULES:
1. **NEVER** place image between heading and first paragraph
2. Pattern: Heading → Answer paragraph → Image → Next content
3. HERO image (intro only): After first definition paragraph, scene photograph
4. Use PHOTOGRAPHIC types: scene, object, action, concept photos (NOT infographics)
5. Alt text must extend vocabulary (use synonyms, NOT heading words)
6. NO TEXT OVERLAYS - AI cannot render text reliably. All text goes in figcaption.

## Image Placeholder Format:
[IMAGE: detailed description of PHOTOGRAPHIC visual | alt="vocabulary-extending alt text"]

## Image Types (PHOTOGRAPHIC-FIRST):
- **SCENE**: Environmental/contextual photographs (DEFAULT)
- **OBJECT**: Product or item close-up photographs
- **ACTION**: People performing activities
- **CONCEPT**: Abstract photorealistic imagery for ideas/data
- **FLOWCHART**: ONLY for explicit step-by-step processes (minimal shapes, NO labels)

## DEPRECATED (DO NOT USE):
- ~~INFOGRAPHIC~~ → Use CONCEPT photograph instead
- ~~CHART~~ → Use CONCEPT photograph instead
- ~~DIAGRAM with labels~~ → Use FLOWCHART with shapes only

## Vocabulary Terms to AVOID in Alt Text:
${holistic.vocabularyMetrics.overusedTerms.slice(0, 5).map(t => t.term).join(', ')}

## Sections to Process
${sectionEntries}

## Output Format
For EACH section, output exactly:
[SECTION: section-key]
...content with properly positioned image placeholder(s)...

CRITICAL RULES:
- Each [SECTION: key] marker MUST match the original section key EXACTLY
- Each section must have UNIQUE image descriptions (no duplicates)
- Keep sections in the same order as input
- Only add images to sections marked "Needs Image: YES"
- Preserve all existing content structure

**OUTPUT ONLY the section markers and content in ${regionalLang}. No explanations.**`;
}

// ============================================
// Pass 5: Micro Semantics
// ============================================

export function buildPass5Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, businessInfo } = ctx;
  const regionalLang = getRegionalLanguageVariant(businessInfo.language, businessInfo.region);

  return `You are a Holistic SEO editor specializing in micro-semantic optimization.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}

## Your Task
Apply micro-semantic optimization to ONE section. Return ONLY the optimized section.

## Current Section to Optimize
**Heading:** ${section.section_heading}
**Content:**
${section.current_content}

## Central Entity: ${holistic.centralEntity}

## Article-Wide Vocabulary Metrics
- TTR: ${(holistic.vocabularyMetrics.typeTokenRatio * 100).toFixed(1)}%
- Overused Terms: ${holistic.vocabularyMetrics.overusedTerms.slice(0, 5).map(t => `${t.term}(${t.count}x)`).join(', ')}

## MICRO SEMANTICS RULES:

### 1. Modality Certainty
Replace uncertain language with definitive verbs:
- BAD: "can be", "might be", "could be"
- GOOD: "is", "are" (for facts)

### 2. Stop Word Removal
Remove fluff: "also", "basically", "very", "maybe", "actually", "really", "just", "quite"

### 3. Subject Positioning
"${holistic.centralEntity}" should be grammatical SUBJECT, not object:
- BAD: "Financial advisors help you achieve financial independence"
- GOOD: "Financial independence relies on sufficient savings"

### 4. Information Density
Every sentence adds a NEW fact. No entity repetition without new attribute.

### 5. Reference Principle
Links at END of sentences, not start:
- BAD: "[According to research], the method works"
- GOOD: "The method works effectively, as [research confirms]"

### 6. Vocabulary Diversity
Avoid overused terms. Use synonyms for: ${holistic.vocabularyMetrics.overusedTerms.slice(0, 3).map(t => t.term).join(', ')}

## CRITICAL: STRUCTURE PRESERVATION
**Lists and Tables:**
- You MUST preserve ALL existing lists (ordered <ol> and unordered <ul>) exactly as structured
- You MUST preserve ALL existing tables with their structure intact
- Do NOT convert lists back to prose paragraphs
- Do NOT remove or merge table rows/columns
- You may ONLY optimize the TEXT within list items or table cells, NOT the structure

**Image Placeholders:**
If the content contains [IMAGE: description | alt text] placeholders:
- You MUST preserve ALL image placeholders EXACTLY as they appear
- Do NOT modify, move, reword, or remove any text matching the pattern [IMAGE: ... | ...]
- Copy them character-for-character to your output
- These placeholders are essential for later image generation

## Instructions:
Apply ALL rules. Maintain content meaning. Keep language in ${regionalLang}.
PRESERVE all lists, tables, and [IMAGE: ...] placeholders exactly as they appear.
${buildSelfVerificationChecklist(holistic.centralEntity, section.current_content?.includes('[IMAGE:') || false, 5)}

**OUTPUT ONLY the optimized section content. No explanations.**`;
}

// ============================================
// Pass 6: Discourse Integration
// ============================================

export function buildPass6Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, adjacentContext, businessInfo, brief } = ctx;
  const regionalLang = getRegionalLanguageVariant(businessInfo.language, businessInfo.region);

  // Extract contextual bridge links from brief if available
  const contextualBridgeLinks = extractContextualBridgeLinks(brief);
  const hasLinksToBridge = contextualBridgeLinks.length > 0;

  return `You are a Holistic SEO editor specializing in discourse integration.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}

## Your Task
Improve discourse flow for ONE section. Return ONLY the optimized section.

## Current Section to Optimize
**Heading:** ${section.section_heading}
**Content:**
${section.current_content}

${adjacentContext.previousSection ? `
## PREVIOUS Section (ensure smooth transition FROM this)
**${adjacentContext.previousSection.heading}**
Last paragraph: "${(adjacentContext.previousSection.lastParagraph || '').substring(0, 200)}..."
Key terms: ${(adjacentContext.previousSection.keyTerms || []).join(', ')}
` : '## This is the FIRST section - no transition needed at start'}

${adjacentContext.nextSection ? `
## NEXT Section (prepare transition TO this)
**${adjacentContext.nextSection.heading}**
First paragraph: "${(adjacentContext.nextSection.firstParagraph || '').substring(0, 200)}..."
` : '## This is the LAST section - ensure strong conclusion'}

## Discourse Anchors (use at transitions)
${holistic.discourseAnchors.join(', ')}

${hasLinksToBridge ? `
## INTERNAL LINKS TO ADD WITH CONTEXTUAL BRIDGES
These internal links must be inserted with proper contextual bridges:
${contextualBridgeLinks.map(link => `
- **Link to:** "${link.targetTopic}"
  **Anchor text:** "${link.anchorText}"
  **Why link:** ${link.reasoning}
  ${link.annotation_text_hint ? `**Context hint:** ${link.annotation_text_hint}` : ''}
`).join('')}

### Contextual Bridge Rules:
1. NEVER place link at start of sentence - links come at END
2. The sentence BEFORE the link must establish WHY this topic is relevant
3. The link anchor text should flow naturally in the sentence
4. Example pattern:
   - "Understanding [concept] requires examining its core components. This is where [anchor text](link) becomes essential."
   - NOT: "[Anchor text](link) is important because..."
` : ''}

## Discourse Rules:
1. **Paragraph Transitions**: End of paragraph A hooks into start of paragraph B
2. **Section Opening**: Reference previous section's conclusion if applicable
3. **Section Closing**: Hint at what comes next if applicable
4. **Contextual Bridges**: Use bridge sentences between sub-topics
5. **Link Annotation**: Text around links explains WHY the link exists

## CRITICAL: STRUCTURE PRESERVATION
**Lists and Tables:**
- You MUST preserve ALL existing lists (ordered <ol> and unordered <ul>) exactly as structured
- You MUST preserve ALL existing tables with their structure intact
- Do NOT convert lists back to prose paragraphs
- Do NOT remove or merge table rows/columns
- You may ONLY optimize transitions BETWEEN structured elements, NOT the structures themselves

**Image Placeholders:**
If the content contains [IMAGE: description | alt text] placeholders:
- You MUST preserve ALL image placeholders EXACTLY as they appear
- Do NOT modify, move, reword, or remove any text matching the pattern [IMAGE: ... | ...]
- Copy them character-for-character to your output
- These placeholders are essential for later image generation

## Instructions:
1. Add/improve transitional sentences at section start (if not first section)
2. Add/improve closing sentence that leads to next section (if not last section)
3. Smooth any abrupt paragraph transitions within the section
${hasLinksToBridge ? '4. Insert internal links with proper contextual bridges (see INTERNAL LINKS section)' : ''}
5. Keep all content in ${regionalLang}
6. PRESERVE all lists, tables, and [IMAGE: ...] placeholders exactly as they appear
${buildSelfVerificationChecklist(holistic.centralEntity, section.current_content?.includes('[IMAGE:') || false, 6)}

**OUTPUT ONLY the optimized section content. No explanations.**`;
}

/**
 * Extract contextual bridge links from brief
 * Combines contextualBridge and suggested_internal_links for comprehensive internal linking
 */
function extractContextualBridgeLinks(brief?: ContentBrief): Array<{
  targetTopic: string;
  anchorText: string;
  reasoning: string;
  annotation_text_hint?: string;
}> {
  const links: Array<{
    targetTopic: string;
    anchorText: string;
    reasoning: string;
    annotation_text_hint?: string;
  }> = [];

  // Extract from contextualBridge (legacy format)
  if (brief?.contextualBridge) {
    // Handle both array and section object formats
    if (Array.isArray(brief.contextualBridge)) {
      links.push(...brief.contextualBridge);
    } else if (brief.contextualBridge.type === 'section' && brief.contextualBridge.links) {
      links.push(...brief.contextualBridge.links);
    }
  }

  // Extract from suggested_internal_links (newer format from brief generation)
  if (brief?.suggested_internal_links && brief.suggested_internal_links.length > 0) {
    for (const suggestion of brief.suggested_internal_links) {
      // Check if this link is already in the list (by anchor text)
      const existingAnchor = suggestion.anchor_text || suggestion.anchor || '';
      const isDuplicate = links.some(l =>
        l.anchorText.toLowerCase() === existingAnchor.toLowerCase()
      );

      if (!isDuplicate && existingAnchor) {
        links.push({
          targetTopic: suggestion.url || suggestion.title || suggestion.anchor || '',
          anchorText: existingAnchor,
          reasoning: suggestion.title ? `Link to related topic: ${suggestion.title}` : 'Suggested internal link for topic relevance',
          annotation_text_hint: undefined
        });
      }
    }
  }

  return links;
}

/**
 * Batch prompt for Pass 6: Discourse Integration
 * Processes multiple sections in a single API call with discourse flow optimization.
 * Uses [SECTION: key] markers for reliable parsing.
 */
export function buildPass6BatchPrompt(
  batch: ContentGenerationSection[],
  holistic: HolisticSummaryContext,
  budget: ContentFormatBudget,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): string {
  const regionalLang = getRegionalLanguageVariant(businessInfo.language, businessInfo.region);

  // Get all sections for adjacent context
  const allSectionKeys = batch.map(s => s.section_key);

  // Extract contextual bridge links from brief
  const contextualBridgeLinks = extractContextualBridgeLinks(brief);
  const hasLinksToBridge = contextualBridgeLinks.length > 0;

  // Build section entries with adjacent context
  const sectionEntries = batch.map((section, idx) => {
    // Find adjacent sections for context
    const prevSection = idx > 0 ? batch[idx - 1] : null;
    const nextSection = idx < batch.length - 1 ? batch[idx + 1] : null;

    const classification = budget.sectionClassifications.find(c => c.sectionKey === section.section_key);
    const needsDiscourse = budget.sectionsNeedingOptimization.discourse.includes(section.section_key);

    return `
[SECTION: ${section.section_key}]
**Type:** ${classification?.type || 'body'}
**Heading:** ${section.section_heading}
**Needs Discourse Improvement:** ${needsDiscourse ? 'YES' : 'NO (preserve as-is)'}
${prevSection ? `**Previous Section:** "${prevSection.section_heading}"` : '**Position:** FIRST section'}
${nextSection ? `**Next Section:** "${nextSection.section_heading}"` : '**Position:** LAST section'}
**Current Content:**
${section.current_content || ''}
`;
  }).join('\n---\n');

  return `You are a Holistic SEO editor specializing in discourse integration for MULTIPLE sections.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}

## Central Entity: ${holistic.centralEntity}
## Article Title: ${holistic.articleStructure.title}

## Discourse Anchors (use at transitions):
${holistic.discourseAnchors.join(', ')}

${hasLinksToBridge ? `
## INTERNAL LINKS TO ADD WITH CONTEXTUAL BRIDGES:
${contextualBridgeLinks.slice(0, 5).map(link => `
- **Link to:** "${link.targetTopic}"
  **Anchor text:** "${link.anchorText}"
  **Why link:** ${link.reasoning}
`).join('')}

### Contextual Bridge Rules:
1. NEVER place link at start of sentence - links come at END
2. The sentence BEFORE the link must establish WHY this topic is relevant
3. The link anchor text should flow naturally in the sentence
` : ''}

## Discourse Rules:
1. **Paragraph Transitions:** End of paragraph A hooks into start of paragraph B
2. **Section Opening:** Reference previous section's conclusion if applicable
3. **Section Closing:** Hint at what comes next if applicable
4. **Contextual Bridges:** Use bridge sentences between sub-topics
5. **Link Annotation:** Text around links explains WHY the link exists

## CRITICAL: STRUCTURE PRESERVATION
- PRESERVE ALL lists, tables, and image placeholders exactly
- DO NOT convert structured content back to prose
- Only optimize TEXT within structures, not the structures themselves

## Sections to Process
${sectionEntries}

## Output Format
For EACH section, output exactly:
[SECTION: section-key]
...content with improved discourse flow...

CRITICAL RULES:
- Each [SECTION: key] marker MUST match the original section key EXACTLY
- Keep sections in the same order as input
- Only modify sections marked "Needs Discourse Improvement: YES"
- Preserve ALL lists, tables, [IMAGE: ...] placeholders, and links

**OUTPUT ONLY the section markers and content in ${regionalLang}. No explanations.**`;
}

// ============================================
// Pass 7: Introduction Synthesis
// ============================================

export function buildPass7Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, brief, businessInfo } = ctx;
  const regionalLang = getRegionalLanguageVariant(businessInfo.language, businessInfo.region);

  // Extract H2 topics for abstractive summary (excluding intro/conclusion)
  const h2Topics = holistic.articleStructure.headingOutline
    .filter(h => h.level === 2 && h.key !== 'intro' && h.key !== 'conclusion' &&
      !h.heading.toLowerCase().includes('introduction') &&
      !h.heading.toLowerCase().includes('conclusion') &&
      !h.heading.toLowerCase().includes('samenvatting'))
    .map((h, i) => `${i + 1}. ${h.heading}`);

  return `You are a Holistic SEO editor applying the KORAYANESE FRAMEWORK for introduction writing.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}

## Your Task
Write a NEW introduction following STRICT Korayanese framework rules. This introduction serves as the ONLY summary - there should be no separate conclusion/summary section duplicating this.

## Current Introduction (to be COMPLETELY REWRITTEN)
${section.current_content}

## MANDATORY RULES FOR INTRODUCTION

### RULE 1: BUSINESS-CONTEXT OPENING (Replaces rigid "X is Y")
**WEAVE the definition into business context, don't isolate it:**
- Start by connecting the topic to ${businessInfo.projectName || 'the business'}'s expertise
- The definition should emerge naturally, not as a standalone sentence
- WRONG: Generic definition first, then company mention separately (disconnected)
- CORRECT: Company expertise + topic + woven definition in ONE sentence
- ALSO CORRECT: Target audience + topic meaning + company connection
- The central entity "${holistic.centralEntity}" MUST still appear in the first 400 characters (Centerpiece Annotation)

### RULE 2: HUMAN READABILITY
**Write for humans first, search engines second:**
- Use natural sentence flow, not keyword-stuffed facts
- Vary sentence structure (not all "X is Y" patterns)
- Include the reader (direct address: "you", "your" or equivalent in ${regionalLang})
- Conversational connectors allowed
- ONE clear value proposition for the reader in first paragraph

### RULE 3: COVER KEY SECTIONS (Not exhaustive list)
**Mention what matters, not everything:**
Article H2 topics to reference (pick 2-3 MOST IMPORTANT):
${h2Topics.join('\n')}

- Reference only the most important topics, NOT all of them
- NOT: "This article covers [topic1], [topic2], [topic3], [topic4], [topic5]..."
- CORRECT: "Discover how [key topic] works and why [benefit]."
- Let the article structure speak for itself

### RULE 4: TOPIC-SPECIFIC HEADING
**BANNED GENERIC TERMS (never use these in heading):**
- Generic words: Introduction, Overview, Summary, Inleiding, Introductie, Overzicht, Samenvatting
- Generic patterns: "[Topic]: Overview", "[Topic]: Introduction"

**GOOD HEADING PATTERNS (adapt to ${regionalLang}):**
- Question format: "What is [Topic]?" / "Wat is [Topic]?"
- Comprehensive: "[Topic]: The Complete Guide" / "[Topic]: De Complete Gids"
- Informative: "Everything about [Topic]" / "Alles over [Topic]"

### RULE 5: KEEP SEMANTIC VALUE
**Still optimize, but naturally:**
- Central entity "${holistic.centralEntity}" MUST appear in first 400 characters
- Include 1-2 EAV triples naturally (not forced)
- Definition can be implicit (helping with X implies what X is)

## Article Info
Title: ${holistic.articleStructure.title}
Central Entity: ${holistic.centralEntity}
Target Keyword: ${brief.targetKeyword || 'N/A'}
${holistic.featuredSnippetTarget ? `Featured Snippet Target: ${holistic.featuredSnippetTarget.question}` : ''}

## OUTPUT FORMAT
## [Topic-specific heading containing "${holistic.centralEntity}"]

[First sentence: Connect ${businessInfo.projectName || 'the business'} with ${holistic.centralEntity.toLowerCase()}, weaving in the definition naturally]

[Second paragraph: Value proposition for reader + mention 2-3 key topics from article]

[Optional: 1-2 more sentences with key facts or reader benefits]

**WORD COUNT: 150-250 words. Quality and human readability over strict brevity.**
**LANGUAGE: ${regionalLang} ONLY**
**TONE: Professional but conversational, NOT robotic or AI-sounding**`;
}

// ============================================
// Pass 7: Conclusion Synthesis
// ============================================

export function buildPass7ConclusionPrompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, brief, businessInfo } = ctx;
  const regionalLang = getRegionalLanguageVariant(businessInfo.language, businessInfo.region);

  // Determine if this is a monetization topic (needs CTA)
  const isMonetization = brief.topic_class === 'monetization' ||
    (brief as any).topicClass === 'monetization';

  // Get user-provided CTA from brief if available
  const userCta = brief.cta?.trim();
  const hasCta = userCta && userCta.length > 0;

  return `You are a Holistic SEO editor applying the KORAYANESE FRAMEWORK for conclusion writing.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}

## Your Task
Write a NEW conclusion that serves as a CALL-TO-ACTION, NOT a summary.

## IMPORTANT: NO REDUNDANT SUMMARY
The INTRODUCTION already contains the abstractive summary of the article.
DO NOT repeat that summary in the conclusion.
The conclusion must ADD NEW VALUE, not duplicate the introduction.

## Current Conclusion (to be COMPLETELY REWRITTEN)
${section.current_content}

## Article Info
Title: ${holistic.articleStructure.title}
Central Entity: ${holistic.centralEntity}
${isMonetization ? `Business: This is a MONETIZATION topic - include service/product CTA` : 'This is an INFORMATIONAL topic - reinforce practical value'}

${hasCta ? `## USER-PROVIDED CALL-TO-ACTION (MUST BE INCLUDED)
**IMPORTANT:** The following CTA text MUST be incorporated into the conclusion:
"${userCta}"

Integrate this CTA naturally into the conclusion. You may slightly adapt the wording to fit the flow, but the core message and action must be preserved.
` : ''}
## KORAYANESE CONCLUSION RULES

### RULE 1: TOPIC-SPECIFIC HEADING (NOT "Samenvatting" or "Conclusie")
- NEVER use: "Conclusie", "Samenvatting", "Summary", "Tot Slot", "Afsluitend"
- USE: Action-oriented heading with central entity
- Examples: "Neem Contact Op voor ${holistic.centralEntity}", "Start Vandaag met ${holistic.centralEntity}", "${holistic.centralEntity}: Uw Volgende Stap"

### RULE 2: CALL-TO-ACTION FOCUS
${hasCta ? `
**INCLUDE USER'S CTA:**
The CTA "${userCta}" must appear in the conclusion.
Format it prominently, either as its own sentence or as a clear closing statement.
` : isMonetization ? `
**MONETIZATION CTA:**
- Direct invitation to contact/request quote
- Specific next step (call, email, form)
- Urgency or benefit statement
- Example: "Neem vandaag contact op voor een gratis inspectie van uw [product/service]."
` : `
**INFORMATIONAL CLOSE:**
- Practical application statement
- How reader can use this knowledge
- Related topics they might explore
- Example: "Met deze kennis kunt u nu zelfverzekerd [action] uitvoeren."
`}

### RULE 3: NO SUMMARY REPETITION
- DO NOT list key takeaways (intro already did this)
- DO NOT summarize what was covered (intro already did this)
- ONLY add: next steps, CTA, or practical application

### RULE 4: BREVITY
- Maximum 100 words
- Every sentence must add actionable value
- No fluff, no repetition

## OUTPUT FORMAT
## [Action-oriented heading with "${holistic.centralEntity}"]

[2-3 sentences: Actionable close + CTA or practical application]

**WORD COUNT: 50-100 words maximum.**
**LANGUAGE: ${regionalLang} ONLY**`;
}

// ============================================
// Pass 8: Final Polish (Section-by-Section)
// ============================================

/**
 * Batch prompt for Pass 8: Final Polish
 * Performs publication-ready polishing on individual sections while
 * preserving structural elements (lists, tables, images) from earlier passes.
 */
export function buildPass8BatchPrompt(
  batch: ContentGenerationSection[],
  holistic: HolisticSummaryContext,
  budget: ContentFormatBudget,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): string {
  const regionalLang = getRegionalLanguageVariant(businessInfo.language, businessInfo.region);

  // Count structural elements for preservation tracking
  const sectionEntries = batch.map(section => {
    const content = section.current_content || '';
    const listCount = (content.match(/<ul>|<ol>|\n[-*]\s/g) || []).length;
    const tableCount = (content.match(/<table>|\|.*\|/g) || []).length;
    const imageCount = (content.match(/\[IMAGE:[^\]]+\]/g) || []).length;

    return `
[SECTION: ${section.section_key}]
**Heading:** ${section.section_heading}
**Structural Elements:** Lists: ${listCount}, Tables: ${tableCount}, Images: ${imageCount}
**Current Content:**
${content}
`;
  }).join('\n---\n');

  return `You are a Senior Editor performing the FINAL polish pass on sections before publication.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}

## Article Context (Read-Only Reference)
- Central Entity: ${holistic.centralEntity}
- Target Keyword: ${brief.targetKeyword || 'Not specified'}
- Total Sections: ${holistic.articleStructure.totalSections}
- Article Word Count: ${holistic.articleStructure.totalWordCount} words

## POLISHING TASKS (Apply to Each Section)
1. **Smooth Transitions:** Ensure every paragraph flows naturally. Add transitional phrases where needed.
2. **Consistent Voice:** Maintain same tone, reading level, and style throughout.
3. **Remove Redundancy:** Eliminate repetitive phrases and unnecessary filler words.
4. **Strengthen Weak Sentences:** Improve passive, vague, or low-impact sentences. Use definitive statements.
5. **Final Formatting:** **Bold** key entities for scannability. Ensure lists have introductory sentences.

## CRITICAL PRESERVATION REQUIREMENTS
⚠️ **STRUCTURE PRESERVATION IS MANDATORY** ⚠️

For EACH section, you MUST preserve:
- **All [IMAGE: ...] placeholders** - Copy character-for-character
- **All bullet lists and numbered lists** - Keep items intact, only polish wording
- **All tables** - Keep structure, only polish cell content
- **Heading hierarchy** - DO NOT change H2/H3 levels
- **Internal links** - Keep all [text](url) intact

If a section has "Lists: 2", your output MUST have exactly 2 lists.
If a section has "Images: 1", your output MUST have exactly 1 image placeholder.

## Sections to Polish
${sectionEntries}

## Output Format
For EACH section, output:
[SECTION: section-key]
...polished content...

Keep sections in order. Polish language while preserving ALL structural elements.

**OUTPUT ONLY the section markers and polished content in ${regionalLang}. No explanations.**`;
}

/**
 * Single-section prompt for Pass 8 (used when batch size is 1)
 */
export function buildPass8Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, brief, businessInfo } = ctx;
  const regionalLang = getRegionalLanguageVariant(businessInfo.language, businessInfo.region);

  const content = section.current_content || '';
  const listCount = (content.match(/<ul>|<ol>|\n[-*]\s/g) || []).length;
  const tableCount = (content.match(/<table>|\|.*\|/g) || []).length;
  const imageCount = (content.match(/\[IMAGE:[^\]]+\]/g) || []).length;

  return `You are a Senior Editor performing the FINAL polish on a section before publication.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}

## Your Task
Polish ONE section for publication readiness. Return ONLY the polished section content.

## Section to Polish
**Heading:** ${section.section_heading}
**Level:** H${section.section_level}
**Structural Elements:** Lists: ${listCount}, Tables: ${tableCount}, Images: ${imageCount}

**Current Content:**
${content}

## Article Context (Read-Only Reference)
- Central Entity: ${holistic.centralEntity}
- Target Keyword: ${brief.targetKeyword || 'Not specified'}

## Polishing Tasks
1. Smooth paragraph transitions with transitional phrases
2. Consistent tone and voice throughout
3. Remove redundant phrases and filler words
4. Strengthen weak/passive sentences

## PRESERVATION REQUIREMENTS (MANDATORY)
Your output MUST contain:
- Exactly ${imageCount} [IMAGE: ...] placeholder(s) - copied character-for-character
- Exactly ${listCount} list(s) - keep items, polish wording only
- Exactly ${tableCount} table(s) - keep structure, polish content only
- Same heading (unchanged): ${section.section_heading}

**OUTPUT the polished section content in ${regionalLang}. No explanations or wrappers.**`;
}

// ============================================
// Export all builders as named object
// ============================================

export const SectionOptimizationPromptBuilder = {
  buildPass2Prompt,
  buildPass3Prompt,
  buildPass3BatchPrompt,
  buildPass4Prompt,
  buildPass4BatchPrompt,
  buildPass5Prompt,
  buildPass6Prompt,
  buildPass6BatchPrompt,
  buildPass7Prompt,
  buildPass7ConclusionPrompt,
  buildPass8Prompt,
  buildPass8BatchPrompt
};

export default SectionOptimizationPromptBuilder;
