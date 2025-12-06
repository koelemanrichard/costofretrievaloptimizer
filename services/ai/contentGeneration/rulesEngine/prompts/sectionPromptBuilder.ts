// services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts

import { SectionGenerationContext, BriefSection, FormatCode } from '../../../../../types';
import { BriefCodeParser } from '../briefCodeParser';
import { PROHIBITED_PATTERNS } from '../validators/prohibitedLanguage';

export class SectionPromptBuilder {
  /**
   * Build a comprehensive prompt for section generation
   * Includes all semantic framework rules
   */
  static build(context: SectionGenerationContext, fixInstructions?: string): string {
    const { section, brief, businessInfo, discourseContext, isYMYL, ymylCategory } = context;

    // Parse format codes from methodology note
    const parsedCodes = BriefCodeParser.parseFormatCodes(section.methodology_note || '');
    const formatConstraints = BriefCodeParser.getFormatConstraints(parsedCodes.formatCode);

    let prompt = `You are an expert content writer following the Koray Tuğberk GÜBÜR Semantic Content Framework.

**CRITICAL LANGUAGE**: Write ALL content in ${businessInfo.language || 'English'}. Target market: ${businessInfo.targetMarket || 'Global'}.

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
