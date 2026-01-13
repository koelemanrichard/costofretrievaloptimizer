// services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts

import { SectionGenerationContext, BriefSection, FormatCode, BusinessInfo, SectionFlowGuidance } from '../../../../../types';
import type { ContentGenerationPriorities } from '../../../../../types/contentGeneration';
import { BriefCodeParser } from '../briefCodeParser';
import { PROHIBITED_PATTERNS } from '../validators/prohibitedLanguage';
import { getLanguageAndRegionInstruction, getLanguageName } from '../../../../../utils/languageUtils';

// Extended BusinessInfo type that may include generation priorities
type ExtendedBusinessInfo = BusinessInfo & { generationPriorities?: ContentGenerationPriorities };

export class SectionPromptBuilder {
  /**
   * Build priority guidance instructions based on user's content priorities
   */
  private static buildPriorityGuidance(businessInfo: ExtendedBusinessInfo): string {
    const priorities = businessInfo.generationPriorities;
    if (!priorities) return '';

    // Determine primary focus based on highest priority
    const sortedPriorities = [
      { name: 'humanReadability', value: priorities.humanReadability, label: 'Reader-First' },
      { name: 'businessConversion', value: priorities.businessConversion, label: 'Business-Focused' },
      { name: 'machineOptimization', value: priorities.machineOptimization, label: 'SEO-Optimized' },
      { name: 'factualDensity', value: priorities.factualDensity, label: 'Information-Dense' },
    ].sort((a, b) => b.value - a.value);

    const primary = sortedPriorities[0];
    const secondary = sortedPriorities[1];

    let guidance = `## Content Priority (User Settings)
Primary focus: ${primary.label} (${primary.value}%)
Secondary focus: ${secondary.label} (${secondary.value}%)

`;

    // Add specific guidance based on primary priority
    if (primary.name === 'humanReadability' && primary.value >= 35) {
      guidance += `**READER-FIRST WRITING:**
- Use conversational transitions between ideas
- Vary sentence length for rhythm (mix short punchy with longer explanatory)
- Include relatable examples when appropriate
- Prioritize clarity over keyword density
- Use second-person "you" where natural

`;
    } else if (primary.name === 'businessConversion' && primary.value >= 35) {
      guidance += `**BUSINESS-FOCUSED WRITING:**
- Emphasize value propositions and benefits
- Include clear calls-to-action where appropriate
- Connect features to reader outcomes
- Use persuasive but not pushy language
- Highlight unique differentiators

`;
    } else if (primary.name === 'machineOptimization' && primary.value >= 35) {
      guidance += `**SEO-OPTIMIZED WRITING:**
- Position key entities early in paragraphs
- Use clear subject-predicate-object structures
- Include semantic variations of key terms
- Maintain entity consistency throughout
- Structure for featured snippet potential

`;
    } else if (primary.name === 'factualDensity' && primary.value >= 35) {
      guidance += `**INFORMATION-DENSE WRITING:**
- Pack multiple facts per paragraph
- Use specific numbers and data points
- Minimize filler words and transitions
- Every sentence must add new information
- Prioritize completeness over readability

`;
    }

    return guidance;
  }

  /**
   * Build a comprehensive prompt for section generation
   * Includes all semantic framework rules
   */
  static build(context: SectionGenerationContext, fixInstructions?: string): string {
    const { section, brief, businessInfo, discourseContext, isYMYL, ymylCategory } = context;
    const extendedBusinessInfo = businessInfo as ExtendedBusinessInfo;

    // Parse format codes from methodology note
    const parsedCodes = BriefCodeParser.parseFormatCodes(section.methodology_note || '');
    const formatConstraints = BriefCodeParser.getFormatConstraints(parsedCodes.formatCode);

    let prompt = `You are an expert content writer following the Koray Tuğberk GÜBÜR Semantic Content Framework.

${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}
Target market: ${businessInfo.targetMarket || 'Global'}.

## Section to Generate
Heading: ${section.heading}
Level: H${section.level}

## Format Requirements
${formatConstraints}
${section.subordinate_text_hint ? `\n**MANDATORY FIRST SENTENCE**: ${section.subordinate_text_hint}` : ''}

## Article Context
Title: ${brief.title}
Central Entity: ${businessInfo.seedKeyword}

`;

    // Add discourse context if available
    if (discourseContext) {
      prompt += `## Discourse Integration (S-P-O Chaining)
The previous section ended with: "${discourseContext.lastSentence}"
Key object to reference: "${discourseContext.lastObject}"
${discourseContext.subjectHint}
**START** your section by connecting to this context.

`;
    }

    // Add flow guidance if available
    if (context.flowGuidance) {
      prompt += this.buildFlowGuidanceSection(context.flowGuidance);
    }

    // Add required phrases
    if (parsedCodes.requiredPhrases.length > 0) {
      prompt += `## Required Phrases (MUST include exactly)
${parsedCodes.requiredPhrases.map(p => `- "${p}"`).join('\n')}

`;
    }

    // Add anchor texts for internal linking
    if (parsedCodes.anchorTexts.length > 0) {
      prompt += `## Internal Links (use these as anchor text)
${parsedCodes.anchorTexts.map(a => `- [${a}]`).join('\n')}
Place links AFTER defining the concept, never in the first sentence.

`;
    }

    // Add YMYL protocol
    if (isYMYL) {
      prompt += `## YMYL Safe Answer Protocol (${ymylCategory} content)
1. Boolean questions: Start with Yes/No
2. Include condition/exception: "However...", "Unless...", "Depending on..."
3. Fact first, then citation (not "According to X...")
4. Consider professional consultation recommendation

`;
    }

    // Add prohibited patterns
    prompt += `## STRICTLY PROHIBITED
- Stop words: ${PROHIBITED_PATTERNS.STOP_WORDS.slice(0, 8).join(', ')}...
- Opinions: "I think", "we believe", "unfortunately", "beautiful", "amazing"
- Analogies: "like a", "similar to", "is like", "imagine"
- Fluff openers: "In this article", "Let's dive", "Have you ever wondered"
- Ambiguous pronouns: Use "${businessInfo.seedKeyword}" instead of "it/they/this"

## MANDATORY RULES
1. **EAV Density**: Every sentence = Entity + Attribute + Value
2. **Modality**: Facts use "is/are", possibilities use "can/may"
3. **Active Voice**: Subject-Predicate-Object structure
4. **No Repetition**: Each sentence adds NEW information
5. **Complete Sentences**: Never end mid-thought

`;

    // Add user-configured priority guidance
    const priorityGuidance = this.buildPriorityGuidance(extendedBusinessInfo);
    if (priorityGuidance) {
      prompt += priorityGuidance;
    }

    // Add content length guidance if available
    if (context.lengthGuidance) {
      const { targetWords, presetName, isShortContent } = context.lengthGuidance;
      prompt += `## Content Length (${presetName} preset)
Target: ${targetWords.min}-${targetWords.max} words for this section.
${isShortContent ? `**SHORT CONTENT MODE**: Be concise and dense. Every sentence must add unique value. No padding or transitions for their own sake.` : `Standard length section - balance depth with clarity.`}

`;
    }

    // Add competitor-derived specifications if available
    if (brief.competitorSpecs && brief.competitorSpecs.dataQuality !== 'none') {
      prompt += this.buildCompetitorSpecsSection(brief.competitorSpecs, context.allSections?.length || 0);
    }

    // Add search intent alignment guidance
    if (brief.searchIntent) {
      prompt += this.buildSearchIntentGuidance(brief.searchIntent, section, context.allSections || []);
    }

    // Add fix instructions if this is a retry
    if (fixInstructions) {
      prompt += `## CORRECTIONS REQUIRED (from previous attempt)
${fixInstructions}

`;
    }

    prompt += `Write the section content now. Output ONLY prose content, no heading or metadata.`;

    return prompt;
  }

  /**
   * Build the flow guidance section for the prompt
   */
  private static buildFlowGuidanceSection(fg: SectionFlowGuidance): string {
    let section = `## Content Flow Context
Article: "${fg.articleTitle}" about "${fg.centralEntity}"
Position: Section ${fg.sectionIndex + 1} of ${fg.totalSections}
${fg.previousSectionHeading ? `Previous: "${fg.previousSectionHeading}"` : 'This is the opening section'}
${fg.nextSectionHeading ? `Next: "${fg.nextSectionHeading}"` : 'This is the final section'}

**FLOW PATTERN: ${fg.transitionPattern.toUpperCase()}**
${this.getFlowInstructions(fg)}

`;

    // Add zone transition warning if applicable
    if (fg.isZoneTransition) {
      section += `**ZONE TRANSITION**: Moving from MAIN content to SUPPLEMENTARY. Use bridging language to signal the shift.

`;
    }

    // Add suggested opener if available
    if (fg.suggestedOpener) {
      section += `**SUGGESTED OPENER**: "${fg.suggestedOpener}"

`;
    }

    // Add attribute progression context
    if (fg.attributeProgression) {
      section += `**PROGRESSION**: ${fg.attributeProgression}

`;
    }

    return section;
  }

  /**
   * Get specific instructions for each flow pattern
   */
  private static getFlowInstructions(fg: SectionFlowGuidance): string {
    switch (fg.transitionPattern) {
      case 'opening':
        return `- Establish the central entity "${fg.centralEntity}" immediately
- Set reader expectations for what the article will cover
- Use definitive language ("is", "are") not hedging ("might be")
- Make a strong opening statement that anchors the topic`;

      case 'deepening':
        return `- Build on previous section's foundation
- Progress from general to specific details
- Reference concepts from "${fg.previousSectionHeading || 'the previous section'}" where natural
- Go deeper into technical or nuanced aspects`;

      case 'parallel':
        return `- Cover a related aspect at the same depth level
- Use parallel structure to previous section
- Connect back to central entity "${fg.centralEntity}"
- Treat this as exploring another facet of the topic`;

      case 'bridging':
        return `- Explicitly signal topic transition to reader
- Summarize what was covered, preview what comes next
- Use transitional phrases: "Having covered X, we now turn to Y"
- Help the reader understand why we're shifting focus`;

      case 'concluding':
        return `- Synthesize key points from the article
- Return to central entity "${fg.centralEntity}" with summary statement
- Do NOT introduce new information or arguments
- Provide closure and reinforce main takeaways
- Avoid generic "In conclusion" openers - be specific`;

      default:
        return '- Follow natural topic progression';
    }
  }

  /**
   * Build competitor-derived specifications guidance
   * Uses data from SERP competitor analysis to inform content creation
   */
  private static buildCompetitorSpecsSection(
    specs: NonNullable<import('../../../../../types').ContentBrief['competitorSpecs']>,
    totalSections: number
  ): string {
    let section = `## Competitor Analysis Insights (${specs.dataQuality} confidence)
Based on analysis of ${specs.competitorsAnalyzed} ranking competitors:

`;

    // Word count target
    if (specs.targetWordCount > 0) {
      const sectionTarget = totalSections > 0
        ? Math.round(specs.targetWordCount / totalSections)
        : specs.targetWordCount;
      section += `**Target Article Length**: ~${specs.targetWordCount.toLocaleString()} words total
**Per-Section Target**: ~${sectionTarget} words (to match competitors)
`;
      if (specs.wordCountConfidence === 'high') {
        section += `This is a HIGH CONFIDENCE target - competitors consistently use this length.
`;
      }
    }

    // Required schema types
    if (specs.requiredSchemaTypes && specs.requiredSchemaTypes.length > 0) {
      section += `
**Competitors Use Schema**: ${specs.requiredSchemaTypes.join(', ')}
(Ensure content supports these structured data types)
`;
    }

    // Image guidance
    if (specs.targetImageCount > 0) {
      section += `
**Image Expectation**: ${specs.targetImageCount} images (${specs.recommendedImageTypes?.join(', ') || 'general illustrations'})
`;
    }

    section += '\n';
    return section;
  }

  /**
   * Build search intent alignment guidance
   * Adjusts content structure and focus based on user's search intent
   */
  private static buildSearchIntentGuidance(
    intent: string,
    currentSection: BriefSection,
    allSections: BriefSection[]
  ): string {
    const normalizedIntent = intent.toLowerCase().trim();
    const sectionIndex = allSections.findIndex(s => s.key === currentSection.key);
    const isEarlySection = sectionIndex < 3;

    let section = `## Search Intent Alignment (${normalizedIntent})
`;

    switch (normalizedIntent) {
      case 'informational':
        section += `**INFORMATIONAL INTENT - User wants to LEARN**
- Lead with clear definitions and explanations
- Use what/why/how structure
- Prioritize educational value over promotion
- Include examples that clarify concepts
${isEarlySection ? '- Early sections should establish foundational understanding' : '- Build on established concepts from earlier sections'}

`;
        break;

      case 'commercial':
      case 'commercial investigation':
        section += `**COMMERCIAL INTENT - User wants to COMPARE/EVALUATE**
- Lead with benefits and value propositions
- Use comparison structures where appropriate
- Highlight differentiating factors
- Address common objections or concerns
- Include specific features with clear benefits
${isEarlySection ? '- Early sections should establish credibility and unique value' : '- Build toward decision-making information'}

`;
        break;

      case 'transactional':
        section += `**TRANSACTIONAL INTENT - User wants to ACT/BUY**
- Lead with action-oriented steps
- Clear, direct instructions
- Minimize barriers to action
- Include specific next steps
- Use imperative verbs ("Get", "Start", "Contact")
${isEarlySection ? '- Early sections should quickly establish what to do and how' : '- Guide toward conversion/action'}

`;
        break;

      case 'navigational':
        section += `**NAVIGATIONAL INTENT - User wants to FIND**
- Be direct and specific
- Include relevant paths/links
- Clear signposting for navigation
- Minimize unnecessary explanation

`;
        break;

      default:
        // Mixed or unclear intent - provide balanced guidance
        section += `**BALANCED APPROACH**
- Mix educational content with practical application
- Include both explanations and actionable guidance

`;
    }

    return section;
  }
}
