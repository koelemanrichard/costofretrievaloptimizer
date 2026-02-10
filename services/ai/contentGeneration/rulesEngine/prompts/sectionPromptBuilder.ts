// services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts

import { SectionGenerationContext, BriefSection, FormatCode, BusinessInfo, SectionFlowGuidance, ContextualBridgeLink, ContentBrief } from '../../../../../types';
import type { CategoryPageContext } from '../../../../../types/catalog';
import type { ContentGenerationPriorities } from '../../../../../types/contentGeneration';
import { BriefCodeParser } from '../briefCodeParser';
import { PROHIBITED_PATTERNS } from '../validators/prohibitedLanguage';
import { getLanguageAndRegionInstruction, getLanguageName } from '../../../../../utils/languageUtils';
import { getAuditPatterns } from '../../passes/auditPatternsMultilingual';

/**
 * Extract contextual bridge links from a ContentBrief
 * Handles both legacy array format and new section format
 */
function extractContextualBridgeLinks(brief: ContentBrief): ContextualBridgeLink[] {
  const links: ContextualBridgeLink[] = [];

  // Extract from contextualBridge
  if (brief.contextualBridge) {
    if (Array.isArray(brief.contextualBridge)) {
      links.push(...brief.contextualBridge);
    } else if (brief.contextualBridge.type === 'section' && brief.contextualBridge.links) {
      links.push(...brief.contextualBridge.links);
    }
  }

  // Extract from suggested_internal_links (newer format)
  if (brief.suggested_internal_links && brief.suggested_internal_links.length > 0) {
    for (const suggestion of brief.suggested_internal_links) {
      const anchorText = suggestion.anchor_text || suggestion.anchor || '';
      const isDuplicate = links.some(l =>
        l.anchorText.toLowerCase() === anchorText.toLowerCase()
      );

      if (!isDuplicate && anchorText) {
        links.push({
          targetTopic: suggestion.url || suggestion.title || suggestion.anchor || '',
          anchorText,
          reasoning: suggestion.title ? `Related: ${suggestion.title}` : 'Related topic',
          annotation_text_hint: undefined
        });
      }
    }
  }

  return links;
}

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
   * Build template-aware format guidance section
   * Uses section.format_code directly (when available) and adds visual semantics
   */
  private static buildTemplateFormatGuidance(section: BriefSection, brief: ContentBrief): string {
    const formatCode = section.format_code;
    if (!formatCode) return '';

    let guidance = `\n## FORMAT REQUIREMENTS (from template)\n`;

    // Get format constraints based on format code
    switch (formatCode) {
      case 'FS':
        guidance += `Format: Featured Snippet\n`;
        guidance += `- Keep the definition/answer in 40-50 words\n`;
        guidance += `- Lead with the entity name\n`;
        guidance += `- Use a single, self-contained paragraph\n`;
        guidance += `- Optimize for Google's Featured Snippet box\n`;
        break;
      case 'PAA':
        guidance += `Format: People Also Ask\n`;
        guidance += `- Structure as clear question-answer pairs\n`;
        guidance += `- Each answer should be 2-4 sentences\n`;
        guidance += `- Focus on commonly searched questions\n`;
        break;
      case 'LISTING':
        guidance += `Format: List/Bullet Points\n`;
        guidance += `- Use semantic HTML list structure\n`;
        guidance += `- Each item should be concise but complete\n`;
        guidance += `- Ideal for comparison and quick scanning\n`;
        break;
      case 'TABLE':
        guidance += `Format: Table/Comparison\n`;
        guidance += `- Structure data in HTML table format\n`;
        guidance += `- Include clear headers and consistent columns\n`;
        guidance += `- Optimize for featured snippet table display\n`;
        break;
      case 'DEFINITIVE':
        guidance += `Format: Definitive/Comprehensive\n`;
        guidance += `- Provide complete, authoritative coverage\n`;
        guidance += `- Include all relevant sub-topics\n`;
        guidance += `- Use proper heading hierarchy\n`;
        break;
      default:
        guidance += `Format: ${formatCode}\n`;
    }

    // Add visual semantics ONLY if brief designates an image for this section
    const enhancedVS = brief.enhanced_visual_semantics;
    let briefDesignatesImage = false;
    let imageSpec: any = null;

    if (enhancedVS) {
      const sectionKey = section.key || section.heading?.toLowerCase().replace(/\s+/g, '-');
      const headingLower = section.heading?.toLowerCase() || '';

      // Try Record-based section_images first
      if (enhancedVS.section_images && typeof enhancedVS.section_images === 'object') {
        const matchingEntry = Object.entries(enhancedVS.section_images).find(([key]) => {
          const keyLower = key.toLowerCase();
          const sectionKeyLower = sectionKey?.toLowerCase() || '';
          // Match with normalization (handles section-0 vs section_0)
          return keyLower === sectionKeyLower ||
                 keyLower.replace(/-/g, '_') === sectionKeyLower.replace(/-/g, '_') ||
                 keyLower.replace(/_/g, '-') === sectionKeyLower.replace(/_/g, '-');
        });

        if (matchingEntry) {
          briefDesignatesImage = true;
          imageSpec = matchingEntry[1];
        }
      }
      // Fall back to array-based sectionImages
      else if (Array.isArray((enhancedVS as any).sectionImages)) {
        const visualGuide = (enhancedVS as any).sectionImages.find(
          (v: { sectionKey: string }) => {
            const vKeyLower = v.sectionKey?.toLowerCase() || '';
            const sectionKeyLower = sectionKey?.toLowerCase() || '';
            return vKeyLower === sectionKeyLower || headingLower.includes(vKeyLower);
          }
        );
        if (visualGuide) {
          briefDesignatesImage = true;
          imageSpec = visualGuide;
        }
      }
    }

    // ONLY add image placeholder if brief designates it
    if (briefDesignatesImage && imageSpec) {
      const imageType = imageSpec.n_gram_match?.[0]?.toUpperCase() || imageSpec.type || 'SECTION';
      const description = imageSpec.image_description || imageSpec.description;
      const altText = imageSpec.alt_text_recommendation || imageSpec.altText;

      guidance += `\n## VISUAL PLACEHOLDER (Brief-Designated)
Type: ${imageType}
Description: ${description}
Alt text: ${altText}
**REQUIRED:** Insert exactly one image placeholder: [IMAGE: ${description} | alt="${altText}"]
Place after the first paragraph, never between heading and first paragraph.
`;
    } else {
      // NO image for this section per brief - explicitly forbid
      guidance += `\n## NO IMAGE FOR THIS SECTION
The content brief does not designate an image for this section.
Do NOT insert any [IMAGE:] placeholders in this section.
`;
    }

    return guidance;
  }

  /**
   * Build language-specific prohibited content (LLM signatures and generic headings)
   */
  private static buildLanguageSpecificProhibitions(language: string | undefined): string {
    const patterns = getAuditPatterns(language);
    const langName = getLanguageName(language);

    // Get top LLM signature phrases for this language
    const llmPhrases = patterns.llmSignaturePhrases.slice(0, 15);

    // Get generic headings for this language
    const genericHeadings = patterns.genericHeadings;

    return `
## STRICTLY PROHIBITED - ${langName} SPECIFIC
**LLM Signature Phrases (NEVER use):**
${llmPhrases.map(p => `- "${p}"`).join('\n')}

**Generic Headings (NEVER use as H2/H3):**
${genericHeadings.map(h => `- "${h}"`).join('\n')}
`;
  }

  /**
   * Build the subordinate text rule guidance
   * This is ALWAYS required per Korayanese framework - first sentence must answer heading
   */
  private static buildSubordinateTextGuidance(
    section: BriefSection,
    centralEntity: string,
    language: string | undefined
  ): string {
    const langName = getLanguageName(language);
    const patterns = getAuditPatterns(language);

    // Get language-appropriate definitive verbs for examples
    const definitiveVerbsExample = langName === 'Dutch' ? 'is, zijn, betekent, bestaat uit' :
      langName === 'German' ? 'ist, sind, bedeutet, besteht aus' :
      langName === 'French' ? 'est, sont, signifie, consiste en' :
      langName === 'Spanish' ? 'es, son, significa, consiste en' :
      'is, are, means, consists of';

    if (section.subordinate_text_hint) {
      return `
**MANDATORY FIRST SENTENCE (Subordinate Text Rule)**:
Your FIRST sentence after the heading MUST be: ${section.subordinate_text_hint}
This directly answers the heading's implicit question.`;
    }

    // Even without a hint, enforce the subordinate text rule
    return `
**MANDATORY FIRST SENTENCE (Subordinate Text Rule)**:
The FIRST sentence after your heading MUST:
1. Directly answer the heading's implicit question
2. Contain the subject "${centralEntity}" or heading's key term
3. Use a definitive verb (${definitiveVerbsExample})
4. Be under 40 words
5. NOT be a question or introductory fluff

Example structure: "[Subject] [definitive verb] [direct answer to heading]."`;
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

    // Check if we need to generate the heading dynamically
    const needsGeneratedHeading = (section as any).generateHeading === true;
    const sectionType = (section as any).section_type || 'body';

    // Get language-specific patterns
    const langName = getLanguageName(businessInfo.language);
    const patterns = getAuditPatterns(businessInfo.language);

    // CRITICAL: Language instruction MUST be at the absolute top
    let prompt = `###### LANGUAGE REQUIREMENT - READ FIRST ######
${getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region)}
ALL content below MUST be written in ${langName}. No exceptions.
################################################

You are an expert content writer following the Koray Tuğberk GÜBÜR Semantic Content Framework.
Target market: ${businessInfo.targetMarket || 'Global'}.

## Section to Generate
${needsGeneratedHeading ? `**GENERATE HEADING**: Create an appropriate H${section.level} heading for this ${sectionType} section.
The heading should be:
- SEO-optimized and keyword-rich
- Written in ${langName}
- Contextually relevant to "${brief.title}"
- NOT generic (avoid: ${patterns.genericHeadings.slice(0, 5).join(', ')})
- Action-oriented or question-based when appropriate

Topic context: ${brief.targetKeyword || brief.title}` : `Heading: ${section.heading}`}
Level: H${section.level}
${sectionType !== 'body' ? `Section Type: ${sectionType}` : ''}

## Format Requirements
${formatConstraints}
${this.buildSubordinateTextGuidance(section, businessInfo.seedKeyword, businessInfo.language)}

## Article Context
Title: ${brief.title}
Central Entity: ${businessInfo.seedKeyword}

`;

    // Add template-aware format guidance (uses section.format_code directly + visual semantics)
    const templateGuidance = this.buildTemplateFormatGuidance(section, brief);
    if (templateGuidance) {
      prompt += templateGuidance;
    }

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

    // Add contextual bridge links for internal linking (full context)
    const bridgeLinks = extractContextualBridgeLinks(brief);
    if (bridgeLinks.length > 0) {
      prompt += `## Internal Links (with contextual guidance)
Insert these internal links naturally within your content:

${bridgeLinks.slice(0, 5).map(link => `- **Anchor text:** "${link.anchorText}"
  **Links to:** ${link.targetTopic}
  **Why link:** ${link.reasoning}${link.annotation_text_hint ? `\n  **Context hint:** ${link.annotation_text_hint}` : ''}`).join('\n\n')}

### Link Placement Rules:
1. Place links AFTER defining the concept, never in the first sentence
2. The sentence BEFORE the link should establish relevance
3. Use the exact anchor text provided
4. Format: [anchor text](/topics/topic-slug)

`;
    } else if (parsedCodes.anchorTexts.length > 0) {
      // Fallback to basic anchor texts from methodology_note codes
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

    // Add section-specific EAV enforcement
    if (context.sectionEavs && context.sectionEavs.length > 0) {
      prompt += `## Semantic Triples to Cover in This Section
This section MUST incorporate the following Entity-Attribute-Value facts:
${context.sectionEavs.map(eav => {
  const category = eav.predicate?.category || 'UNCLASSIFIED';
  return `- [${category}] ${eav.subject?.label || '?'} → ${eav.predicate?.relation || '?'} → ${eav.object?.value || '?'}`;
}).join('\n')}
Each triple must appear as a factual statement. Use the entity name explicitly (no pronouns).

`;
    }

    // Add prohibited patterns - both general and language-specific
    prompt += `## STRICTLY PROHIBITED (General)
- Stop words: ${PROHIBITED_PATTERNS.STOP_WORDS.slice(0, 8).join(', ')}...
- Opinions: "I think", "we believe", "unfortunately", "beautiful", "amazing"
- Analogies: "like a", "similar to", "is like", "imagine"
- Fluff openers: "In this article", "Let's dive", "Have you ever wondered"
- Ambiguous pronouns: Use "${businessInfo.seedKeyword}" instead of "it/they/this"
`;

    // Add language-specific prohibitions (LLM signatures, generic headings)
    prompt += this.buildLanguageSpecificProhibitions(businessInfo.language);

    prompt += `
## MANDATORY RULES (Korayanese Framework)
1. **EAV Density**: Every sentence = Entity + Attribute + Value (one fact per sentence)
2. **Modality**: Facts use definitive verbs (is/are/has), NOT hedging (might/could/should)
3. **Active Voice**: Subject-Predicate-Object structure (entity first, then action)
4. **No Repetition**: Each sentence adds NEW information (no paraphrasing)
5. **Complete Sentences**: Never end mid-thought
6. **First Sentence Rule**: First sentence MUST directly answer the heading (see above)
7. **Entity Consistency**: Use "${businessInfo.seedKeyword}" consistently, avoid pronouns
8. **No LLM Signatures**: Avoid AI-sounding phrases listed above

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

    // Add SERP analysis insights
    if (brief.serpAnalysis) {
      prompt += this.buildSerpAnalysisGuidance(brief.serpAnalysis, section, context.allSections || []);
    }

    // Add category page context (real product data for ecommerce)
    if (brief.categoryContext) {
      prompt += this.buildCategoryContextGuidance(brief.categoryContext, section);
    }

    // Add fix instructions if this is a retry
    if (fixInstructions) {
      prompt += `## CORRECTIONS REQUIRED (from previous attempt)
${fixInstructions}

`;
    }

    // Final output instruction - different for generated headings
    if (needsGeneratedHeading) {
      prompt += `Write the section now. Start with your generated H${section.level} heading on a new line using markdown format (## for H2, ### for H3), then write the prose content.

Output format:
## [Your Generated Heading Here]

[Prose content...]`;
    } else {
      prompt += `Write the section content now. Output ONLY prose content, no heading or metadata.`;
    }

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

      // Add full contextual bridge content if available
      if (fg.bridgeContent) {
        section += `**CONTEXTUAL BRIDGE (include this transition):**
${fg.bridgeContent}

Use this bridge content to smoothly transition between topics. Integrate it naturally with your section.

`;
      }
    }

    // Add suggested opener if available
    if (fg.suggestedOpener && !fg.bridgeContent) {
      // Only show suggested opener if we don't have full bridge content
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

  /**
   * Build SERP analysis guidance
   * Uses People Also Ask, competitor headings, and content gaps to inform content
   */
  private static buildSerpAnalysisGuidance(
    serpAnalysis: NonNullable<import('../../../../../types').ContentBrief['serpAnalysis']>,
    currentSection: BriefSection,
    allSections: BriefSection[]
  ): string {
    let section = '';
    const sectionIndex = allSections.findIndex(s => s.key === currentSection.key);
    const sectionHeadingLower = currentSection.heading.toLowerCase();

    // People Also Ask - match relevant questions to this section
    if (serpAnalysis.peopleAlsoAsk && serpAnalysis.peopleAlsoAsk.length > 0) {
      // Find questions that might be relevant to this section
      const relevantQuestions = serpAnalysis.peopleAlsoAsk.filter(q => {
        const qLower = q.toLowerCase();
        // Match if question contains words from section heading or vice versa
        const headingWords = sectionHeadingLower.split(/\s+/).filter(w => w.length > 3);
        return headingWords.some(word => qLower.includes(word));
      });

      if (relevantQuestions.length > 0) {
        section += `## People Also Ask (Answer these if relevant)
${relevantQuestions.slice(0, 3).map(q => `- ${q}`).join('\n')}

Integrate answers naturally into the content (don't use Q&A format unless appropriate).

`;
      } else if (sectionIndex === 0 || sectionIndex === allSections.length - 1) {
        // For intro/conclusion, show all PAA questions as context
        section += `## People Also Ask (Context)
Users searching this topic also ask:
${serpAnalysis.peopleAlsoAsk.slice(0, 5).map(q => `- ${q}`).join('\n')}

${sectionIndex === 0 ? 'Ensure the article will address these questions.' : 'Summarize how this article addressed key user questions.'}

`;
      }
    }

    // Content Gaps - opportunities to differentiate from competitors
    if (serpAnalysis.contentGaps && serpAnalysis.contentGaps.length > 0) {
      // Find gaps relevant to this section
      const relevantGaps = serpAnalysis.contentGaps.filter(gap => {
        const gapLower = gap.toLowerCase();
        const headingWords = sectionHeadingLower.split(/\s+/).filter(w => w.length > 3);
        return headingWords.some(word => gapLower.includes(word));
      });

      if (relevantGaps.length > 0) {
        section += `## Content Gap Opportunity
Competitors are MISSING this information - differentiate by covering:
${relevantGaps.slice(0, 2).map(g => `- ${g}`).join('\n')}

`;
      }
    }

    // Competitor headings - for structural alignment (only for early sections)
    if (sectionIndex < 3 && serpAnalysis.competitorHeadings && serpAnalysis.competitorHeadings.length > 0) {
      // Extract common patterns from competitor headings
      const allHeadings = serpAnalysis.competitorHeadings.flatMap(c => c.headings.map(h => h.text));
      const relevantHeadings = allHeadings.filter(h => {
        const hLower = h.toLowerCase();
        const headingWords = sectionHeadingLower.split(/\s+/).filter(w => w.length > 3);
        return headingWords.some(word => hLower.includes(word));
      });

      if (relevantHeadings.length >= 2) {
        section += `## Competitor Structure (for reference)
Similar sections in ranking content:
${[...new Set(relevantHeadings)].slice(0, 3).map(h => `- "${h}"`).join('\n')}

`;
      }
    }

    // Query type format guidance
    if (serpAnalysis.query_type) {
      section += `## Query Type: ${serpAnalysis.query_type}
${this.getQueryTypeGuidance(serpAnalysis.query_type)}

`;
    }

    return section;
  }

  /**
   * Build category page context guidance for ecommerce sections.
   * Injects real product data (names, prices, attributes) into section prompts.
   */
  private static buildCategoryContextGuidance(
    ctx: CategoryPageContext,
    section: BriefSection
  ): string {
    const headingLower = section.heading?.toLowerCase() || '';
    let guidance = `## REAL PRODUCT DATA (Category Page: "${ctx.categoryName}")
Total Products: ${ctx.totalProductCount}
`;

    if (ctx.priceRange) {
      guidance += `Price Range: ${ctx.priceRange.currency} ${ctx.priceRange.min.toFixed(2)} – ${ctx.priceRange.max.toFixed(2)}
`;
    }

    if (ctx.subcategories.length > 0) {
      guidance += `Subcategories: ${ctx.subcategories.map(s => `${s.name} (${s.productCount})`).join(', ')}
`;
    }

    // Determine which product details to include based on section type
    const isTopPicks = headingLower.includes('top') || headingLower.includes('pick') || headingLower.includes('best') || headingLower.includes('recommend');
    const isComparison = headingLower.includes('compar') || headingLower.includes('vs') || section.format_code === 'TABLE';
    const isBuyingGuide = headingLower.includes('buy') || headingLower.includes('choos') || headingLower.includes('how to');
    const isOverview = headingLower.includes('overview') || headingLower.includes('intro') || headingLower.includes('what');

    if (ctx.products.length > 0) {
      const productLimit = isComparison || isTopPicks ? 10 : 5;
      const products = ctx.products.slice(0, productLimit);

      guidance += `\n**Products to reference:**\n`;
      for (const p of products) {
        const details = [p.name];
        if (p.brand) details.push(`by ${p.brand}`);
        if (p.price) details.push(`${p.currency || 'USD'} ${p.price.toFixed(2)}`);
        if (p.rating) details.push(`${p.rating}/5 (${p.reviewCount || 0} reviews)`);
        if (p.availability) details.push(p.availability);
        guidance += `- ${details.join(' | ')}\n`;
      }

      // For comparison/table sections, list common attributes for table columns
      if (isComparison) {
        const attrKeys = new Map<string, number>();
        for (const p of ctx.products) {
          for (const key of Object.keys(p.attributes)) {
            attrKeys.set(key, (attrKeys.get(key) || 0) + 1);
          }
        }
        const commonAttrs = [...attrKeys.entries()]
          .filter(([, count]) => count >= 3)
          .map(([key]) => key);

        if (commonAttrs.length > 0) {
          guidance += `\n**Use these as comparison table columns:** ${commonAttrs.join(', ')}\n`;
          guidance += `Build a real comparison table using actual product attribute values.\n`;
        }
      }

      // For buying guide sections, highlight attribute keys as buying criteria
      if (isBuyingGuide) {
        const attrKeys = new Set<string>();
        for (const p of ctx.products) {
          for (const key of Object.keys(p.attributes)) attrKeys.add(key);
        }
        if (attrKeys.size > 0) {
          guidance += `\n**Buying criteria (from real product attributes):** ${[...attrKeys].slice(0, 10).join(', ')}\n`;
        }
      }
    }

    if (ctx.isSketchMode) {
      guidance += `\n**SKETCH MODE:** Some products lack real URLs and prices. Use estimated/placeholder language where data is missing.\n`;
    }

    guidance += `\n**CRITICAL:** Use REAL product names and prices from above. Do NOT invent products that are not listed.\n\n`;

    return guidance;
  }

  /**
   * Get specific guidance based on query type
   */
  private static getQueryTypeGuidance(queryType: string): string {
    const type = queryType.toLowerCase();

    if (type.includes('definitional') || type.includes('what is')) {
      return `Structure for DEFINITION queries:
- Lead with a clear, concise definition
- Follow with key characteristics
- Include examples for clarity`;
    }

    if (type.includes('comparative') || type.includes('vs') || type.includes('versus')) {
      return `Structure for COMPARISON queries:
- Use comparison tables or structured lists
- Highlight key differentiators
- Include pros/cons for each option`;
    }

    if (type.includes('procedural') || type.includes('how to')) {
      return `Structure for HOW-TO queries:
- Use numbered steps
- Include prerequisites if any
- Be specific and actionable`;
    }

    if (type.includes('causal') || type.includes('why')) {
      return `Structure for CAUSAL queries:
- Explain root causes clearly
- Use cause-effect relationships
- Include supporting evidence`;
    }

    if (type.includes('list') || type.includes('best') || type.includes('top')) {
      return `Structure for LIST queries:
- Use numbered or bulleted lists
- Include brief descriptions for each item
- Consider ranking or categorizing`;
    }

    return `Follow natural content flow for this query type.`;
  }
}
