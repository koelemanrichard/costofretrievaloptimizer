// services/ai/contentGeneration/rulesEngine/prompts/sectionOptimizationPromptBuilder.ts
import {
  SectionOptimizationContext,
  ContentGenerationSection,
  HolisticSummaryContext,
  ContentFormatBudget,
  ContentBrief,
  BusinessInfo
} from '../../../../../types';
import { serializeHolisticContext } from '../../holisticAnalyzer';

/**
 * Section-level prompt builders for optimization passes 2-7.
 * Each prompt includes:
 * - Current section content (the only content AI will modify)
 * - Holistic context summary (for article-wide awareness)
 * - Adjacent section context (for discourse continuity)
 * - Pass-specific rules
 */

// ============================================
// Pass 2: Header Optimization
// ============================================

export function buildPass2Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, adjacentContext, brief, businessInfo } = ctx;
  const lang = businessInfo.language || 'English';

  return `You are a Holistic SEO editor specializing in heading optimization.

**LANGUAGE: ${lang} | Target: ${businessInfo.targetMarket || 'Global'}**

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
"${adjacentContext.previousSection.lastParagraph.substring(0, 150)}..."
` : ''}

${adjacentContext.nextSection ? `
## Next Section (for flow reference)
**${adjacentContext.nextSection.heading}** begins with:
"${adjacentContext.nextSection.firstParagraph.substring(0, 150)}..."
` : ''}

## Header Optimization Rules:
1. **Contextual Overlap**: Heading must contain terms linking to "${holistic.centralEntity}"
2. **No Level Skips**: Maintain proper H${section.section_level} level
3. **Query Pattern Matching**: Heading should match likely search queries in ${lang}
4. **Subordinate Text**: First sentence after heading must directly support it

## Instructions:
1. Improve the heading if it lacks connection to "${holistic.centralEntity}"
2. Ensure first paragraph directly answers/defines what the heading promises
3. Maintain all content - do not summarize
4. Keep language in ${lang}

**OUTPUT ONLY the optimized section content (heading + paragraphs). No explanations.**`;
}

// ============================================
// Pass 3: Lists & Tables
// ============================================

export function buildPass3Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, brief, businessInfo } = ctx;
  const lang = businessInfo.language || 'English';

  return `You are a Holistic SEO editor specializing in structured data optimization.

**LANGUAGE: ${lang}**

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
  const lang = businessInfo.language || 'English';

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

**LANGUAGE: ${lang}**

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

**OUTPUT ONLY the section markers and optimized content in ${lang}. No explanations.**`;
}

// ============================================
// Pass 4: Visual Semantics
// ============================================

export function buildPass4Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, brief, businessInfo } = ctx;
  const lang = businessInfo.language || 'English';
  const isFirstSection = section.section_order === 0 || section.section_key === 'intro';

  return `You are a Holistic SEO editor specializing in visual semantics.

**LANGUAGE: ${lang}**

## Your Task
Insert image placeholders in ONE section. Return ONLY the optimized section.

## Current Section to Optimize
**Heading:** ${section.section_heading}
**Section Order:** ${section.section_order + 1} of ${holistic.articleStructure.totalSections}
**Content:**
${section.current_content}

## Central Entity: ${holistic.centralEntity}
## Title: ${holistic.articleStructure.title}

${isFirstSection ? `
## HERO Image Required
This is the first section - include a HERO image after the first paragraph.
Hero images appear at LCP position and should include title overlay.
` : ''}

## Visual Semantics Rules:
1. **Alt Tag Vocabulary Extension**: Alt tags use NEW vocabulary not in headings (synonyms, related terms)
2. **Context Bridging**: Alt text bridges image to surrounding content
3. **No Image Between H and Text**: NEVER place image between heading and first paragraph
4. **Textual Qualification**: Sentence before/after image MUST reference it

## Image Placeholder Format:
[IMAGE: detailed description | alt="vocabulary-extending alt text"]

## Image Types:
- **HERO**: For first section, includes text overlay
- **SECTION**: Supporting content, placed AFTER explanations
- **CHART**: For statistical data, comparisons
- **INFOGRAPHIC**: For bullet points, process summaries
- **DIAGRAM**: For process flows, how-to steps

## Vocabulary Terms to Avoid in Alt Text (already overused):
${holistic.vocabularyMetrics.overusedTerms.slice(0, 5).map(t => t.term).join(', ')}

## Instructions:
1. Insert 0-2 image placeholders where appropriate
2. Place images AFTER paragraphs, never right after headings
3. Use vocabulary-extending alt text
4. Write descriptions and alt text in ${lang}

**OUTPUT ONLY the optimized section content with image placeholders. No explanations.**`;
}

// ============================================
// Pass 5: Micro Semantics
// ============================================

export function buildPass5Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, businessInfo } = ctx;
  const lang = businessInfo.language || 'English';

  return `You are a Holistic SEO editor specializing in micro-semantic optimization.

**LANGUAGE: ${lang}**

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

## Instructions:
Apply ALL rules. Maintain content meaning. Keep language in ${lang}.

**OUTPUT ONLY the optimized section content. No explanations.**`;
}

// ============================================
// Pass 6: Discourse Integration
// ============================================

export function buildPass6Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, adjacentContext, businessInfo, brief } = ctx;
  const lang = businessInfo.language || 'English';

  // Extract contextual bridge links from brief if available
  const contextualBridgeLinks = extractContextualBridgeLinks(brief);
  const hasLinksToBridge = contextualBridgeLinks.length > 0;

  return `You are a Holistic SEO editor specializing in discourse integration.

**LANGUAGE: ${lang}**

## Your Task
Improve discourse flow for ONE section. Return ONLY the optimized section.

## Current Section to Optimize
**Heading:** ${section.section_heading}
**Content:**
${section.current_content}

${adjacentContext.previousSection ? `
## PREVIOUS Section (ensure smooth transition FROM this)
**${adjacentContext.previousSection.heading}**
Last paragraph: "${adjacentContext.previousSection.lastParagraph.substring(0, 200)}..."
Key terms: ${adjacentContext.previousSection.keyTerms.join(', ')}
` : '## This is the FIRST section - no transition needed at start'}

${adjacentContext.nextSection ? `
## NEXT Section (prepare transition TO this)
**${adjacentContext.nextSection.heading}**
First paragraph: "${adjacentContext.nextSection.firstParagraph.substring(0, 200)}..."
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

## Instructions:
1. Add/improve transitional sentences at section start (if not first section)
2. Add/improve closing sentence that leads to next section (if not last section)
3. Smooth any abrupt paragraph transitions within the section
${hasLinksToBridge ? '4. Insert internal links with proper contextual bridges (see INTERNAL LINKS section)' : ''}
5. Keep all content in ${lang}

**OUTPUT ONLY the optimized section content. No explanations.**`;
}

/**
 * Extract contextual bridge links from brief
 */
function extractContextualBridgeLinks(brief?: ContentBrief): Array<{
  targetTopic: string;
  anchorText: string;
  reasoning: string;
  annotation_text_hint?: string;
}> {
  if (!brief?.contextualBridge) return [];

  // Handle both array and section object formats
  if (Array.isArray(brief.contextualBridge)) {
    return brief.contextualBridge;
  }

  // Section format with nested links
  if (brief.contextualBridge.type === 'section' && brief.contextualBridge.links) {
    return brief.contextualBridge.links;
  }

  return [];
}

// ============================================
// Pass 7: Introduction Synthesis
// ============================================

export function buildPass7Prompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, brief, businessInfo } = ctx;
  const lang = businessInfo.language || 'English';

  // This pass only processes the introduction section
  // It rewrites the intro AFTER the full article exists
  // Now also generates a topic-specific heading (not generic "Introduction")

  return `You are a Holistic SEO editor rewriting the introduction AFTER the full article exists.

**LANGUAGE: ${lang}**

## Your Task
Write a NEW introduction with a TOPIC-SPECIFIC heading. Return both the heading and content.

## Current Introduction
${section.current_content}

## Full Article Structure (the intro must preview ALL these sections in order)
${holistic.articleStructure.headingOutline
  .filter(h => h.key !== 'intro' && !h.heading.toLowerCase().includes('introduction'))
  .map((h, i) => `${i + 1}. ${h.heading} (${h.wordCount} words)`)
  .join('\n')}

## Brief Info
Title: ${holistic.articleStructure.title}
Central Entity: ${holistic.centralEntity}
Key Takeaways: ${brief.keyTakeaways?.slice(0, 3).join(', ') || 'N/A'}
${holistic.featuredSnippetTarget ? `Featured Snippet Target: ${holistic.featuredSnippetTarget.question}` : ''}

## Introduction Synthesis Rules:
1. **Topic-Specific Heading**: NEVER use "Introduction" or "Overview" - use heading that includes central entity
   - Good examples: "Wat is ${holistic.centralEntity}", "${holistic.centralEntity}: Een Overzicht", "Alles over ${holistic.centralEntity}"
   - Bad examples: "Introduction", "Overview", "Getting Started"
2. **Centerpiece Annotation**: Core answer/definition in FIRST 400 characters after heading
3. **Summary Alignment**: Preview ALL H2/H3 topics in SAME ORDER as article
4. **Key Terms**: Include at least one term from each major section
5. **Featured Snippet**: Address the featured snippet target immediately
6. **No Fluff**: Maximum information density
7. **Word Count**: 150-250 words for content

## Instructions:
Write a NEW introduction (NOT just edit the old one) that:
1. Has a topic-specific H2 heading containing "${holistic.centralEntity}" or key topic terms
2. Starts with direct definition/answer (centerpiece annotation)
3. Previews ALL major sections in order they appear
4. Includes key terms from each section
5. Sets reader expectations clearly
6. Is written entirely in ${lang}

**OUTPUT FORMAT:**
## [Topic-specific heading in ${lang}]

[Introduction content in ${lang}]`;
}

// ============================================
// Pass 7: Conclusion Synthesis
// ============================================

export function buildPass7ConclusionPrompt(ctx: SectionOptimizationContext): string {
  const { section, holistic, brief, businessInfo } = ctx;
  const lang = businessInfo.language || 'English';

  // Determine if this is a monetization topic (needs CTA)
  const isMonetization = brief.topic_class === 'monetization' ||
    (brief as any).topicClass === 'monetization';

  return `You are a Holistic SEO editor rewriting the conclusion AFTER the full article exists.

**LANGUAGE: ${lang}**

## Your Task
Write a NEW conclusion with a TOPIC-SPECIFIC heading. Return both the heading and content.

## Current Conclusion
${section.current_content}

## Full Article Structure (summarize key points from each section)
${holistic.articleStructure.headingOutline
  .filter(h => h.key !== 'conclusion' && !h.heading.toLowerCase().includes('conclusion'))
  .map((h, i) => `${i + 1}. ${h.heading}`)
  .join('\n')}

## Brief Info
Title: ${holistic.articleStructure.title}
Central Entity: ${holistic.centralEntity}
Key Takeaways: ${brief.keyTakeaways?.slice(0, 5).join(', ') || 'N/A'}
${isMonetization ? `Business CTA: Contact for ${holistic.centralEntity} services/products` : ''}

## Conclusion Synthesis Rules:
1. **Topic-Specific Heading**: NEVER use "Conclusion" or "Summary" - use heading that includes central entity
   - Good examples: "Conclusie: ${holistic.centralEntity} voor Uw Project", "${holistic.centralEntity} Samengevat", "De Keuze voor ${holistic.centralEntity}"
   - Bad examples: "Conclusion", "Summary", "Final Thoughts", "Wrapping Up"
2. **Key Points Summary**: Summarize 3-5 main takeaways from the article
3. **Central Entity Reinforcement**: Reference ${holistic.centralEntity} explicitly
4. **Actionable Close**: End with clear next step for the reader
${isMonetization ? `5. **Call-to-Action**: Include CTA for ${holistic.centralEntity} services/consultation` : '5. **Educational Close**: Reinforce the learning value'}
6. **No Fluff**: Maximum information density
7. **Word Count**: 100-200 words for content

## Instructions:
Write a NEW conclusion (NOT just edit the old one) that:
1. Has a topic-specific H2 heading containing "${holistic.centralEntity}" or key topic terms
2. Summarizes key insights from ALL major sections
3. Reinforces the central entity's importance
4. Provides clear next steps/actionable advice
${isMonetization ? '5. Includes appropriate call-to-action' : '5. Closes with educational value statement'}
6. Is written entirely in ${lang}

**OUTPUT FORMAT:**
## [Topic-specific conclusion heading in ${lang}]

[Conclusion content in ${lang}]`;
}

// ============================================
// Export all builders as named object
// ============================================

export const SectionOptimizationPromptBuilder = {
  buildPass2Prompt,
  buildPass3Prompt,
  buildPass3BatchPrompt,
  buildPass4Prompt,
  buildPass5Prompt,
  buildPass6Prompt,
  buildPass7Prompt,
  buildPass7ConclusionPrompt
};

export default SectionOptimizationPromptBuilder;
