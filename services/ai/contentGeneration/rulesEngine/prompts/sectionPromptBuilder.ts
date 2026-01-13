// services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts

import { SectionGenerationContext, BriefSection, FormatCode, BusinessInfo } from '../../../../../types';
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

    // Add fix instructions if this is a retry
    if (fixInstructions) {
      prompt += `## CORRECTIONS REQUIRED (from previous attempt)
${fixInstructions}

`;
    }

    prompt += `Write the section content now. Output ONLY prose content, no heading or metadata.`;

    return prompt;
  }
}
