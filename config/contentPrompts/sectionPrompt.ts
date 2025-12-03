// config/contentPrompts/sectionPrompt.ts
import { ContentGenerationSettings, ContentGenerationPriorities } from '../../types/contentGeneration';
import { ContentBrief, BusinessInfo, BriefSection } from '../../types';

export interface SectionDefinition {
  key: string;
  heading: string;
  level: number;
  order: number;
  subordinateTextHint?: string;
  methodologyNote?: string;
}

export interface GeneratedSection {
  key: string;
  heading: string;
  content: string;
}

export interface PromptContext {
  section: SectionDefinition;
  brief: Partial<ContentBrief>;
  businessInfo: Partial<BusinessInfo>;
  settings: ContentGenerationSettings;
  allSections: SectionDefinition[];
  previousSections?: GeneratedSection[];
}

export function buildSectionPrompt(ctx: PromptContext): string {
  const { section, brief, businessInfo, settings, allSections, previousSections } = ctx;
  const { priorities, tone, audienceExpertise } = settings;

  return `
# CONTENT GENERATION TASK

You are an expert content writer creating a section for an article about "${brief.title || 'the topic'}".

## YOUR WRITING PRIORITIES (Follow this balance)

${buildPriorityInstructions(priorities)}

## SECTION DETAILS

**Section Heading:** ${section.heading}
**Heading Level:** H${section.level}
**Position in Article:** Section ${section.order + 1} of ${allSections.length}

## CRITICAL: FIRST SENTENCE RULE (Subordinate Text)

${section.subordinateTextHint ? `
YOUR FIRST SENTENCE MUST: ${section.subordinateTextHint}

This is the "Candidate Answer Passage" - the sentence search engines will extract for Featured Snippets.
Make it definitive, factual, and directly responsive to the heading.
` : `
Start with a direct, informative sentence that answers the question implied by the heading.
`}

## CONTENT FORMAT REQUIREMENT

${buildMethodologyInstructions(section, brief)}

## LANGUAGE & TONE

- **Language:** ${businessInfo.language || 'English'}
- **Target Market:** ${businessInfo.targetMarket || 'Global'}
- **Tone:** ${getToneInstructions(tone)}
- **Audience Level:** ${getAudienceInstructions(audienceExpertise)}

## ARTICLE CONTEXT

**Central Entity:** ${businessInfo.seedKeyword || brief.targetKeyword || 'the topic'}
**Target Keyword:** ${brief.targetKeyword || businessInfo.seedKeyword || 'N/A'}
**Meta Description:** ${brief.metaDescription || 'N/A'}
**Key Takeaways:** ${brief.keyTakeaways?.join(', ') || 'N/A'}

## FULL ARTICLE STRUCTURE (for flow context)

${allSections.map((s, i) => `${i + 1}. ${s.heading}${s.key === section.key ? ' ← YOU ARE HERE' : ''}`).join('\n')}

${previousSections?.length ? `
## PREVIOUSLY WRITTEN SECTIONS (maintain continuity)

${previousSections.slice(-2).map(s => `### ${s.heading}\n${s.content.substring(0, 300)}...`).join('\n\n')}
` : ''}

## SERP INTELLIGENCE

${buildSerpInstructions(brief, section)}

## QUALITY RULES

${buildQualityRules(priorities)}

## OUTPUT INSTRUCTIONS

Write ${getWordCountRange(section)} words of content for this section.

- Output ONLY the prose content
- Do NOT include the heading itself
- Do NOT add meta-commentary
- Write in ${businessInfo.language || 'English'}

BEGIN WRITING:
`;
}

function buildPriorityInstructions(priorities: ContentGenerationPriorities): string {
  const total = Object.values(priorities).reduce((a, b) => a + b, 0) || 100;
  const norm = (v: number) => Math.round((v / total) * 100);
  const lines: string[] = [];

  if (norm(priorities.humanReadability) >= 30) {
    lines.push(`### Human Readability (${norm(priorities.humanReadability)}% priority)
- Write naturally, like explaining to a knowledgeable friend
- Use varied sentence structures and rhythms
- Create smooth transitions between ideas
- Make it engaging - the reader should WANT to continue reading
- Avoid robotic, template-like language`);
  }

  if (norm(priorities.businessConversion) >= 20) {
    lines.push(`### Business & Conversion (${norm(priorities.businessConversion)}% priority)
- Every section should move the reader toward action
- Clearly communicate VALUE - what does the reader gain?
- Address objections and build confidence
- Use language that motivates without being pushy`);
  }

  if (norm(priorities.machineOptimization) >= 20) {
    lines.push(`### Machine Optimization (${norm(priorities.machineOptimization)}% priority)
- Use the central entity as the grammatical SUBJECT where natural
- Structure sentences for clear Entity-Attribute-Value extraction
- Include contextual terms that link back to the main topic
- Place the most important information early in paragraphs`);
  }

  if (norm(priorities.factualDensity) >= 15) {
    lines.push(`### Information Density (${norm(priorities.factualDensity)}% priority)
- Every sentence should add a new fact or insight
- Avoid filler words: "basically", "actually", "very", "really"
- Use specific numbers, dates, and measurements where available
- No sentence should repeat information from another sentence`);
  }

  return lines.join('\n\n');
}

function buildMethodologyInstructions(section: SectionDefinition, brief: Partial<ContentBrief>): string {
  const methodology = section.methodologyNote || 'prose';

  switch (methodology) {
    case 'ordered_list':
      return `**FORMAT: ORDERED LIST**
- Use a numbered list for this section
- Start with a complete sentence stating the count
- Each list item MUST start with an ACTION VERB
- Each item delivers ONE clear instruction`;
    case 'unordered_list':
      return `**FORMAT: UNORDERED LIST**
- Use bullet points for this section
- Start with a complete sentence introducing the list
- Each item should be a distinct category/type/benefit
- Bold the key term at the start of each item`;
    case 'comparison_table':
      return `**FORMAT: COMPARISON TABLE**
- Create a markdown table for this section
- Columns = attributes (features, specs, prices)
- Rows = entities being compared`;
    case 'definition_prose':
      return `**FORMAT: DEFINITION PROSE**
- First sentence MUST be a clear definition
- Use the "Is-A" structure (hypernymy)
- Be authoritative and precise`;
    default:
      return `**FORMAT: PROSE**
- Use flowing paragraphs
- Vary sentence length for rhythm
- Use transitions between ideas`;
  }
}

function buildSerpInstructions(brief: Partial<ContentBrief>, section: SectionDefinition): string {
  const lines: string[] = [];

  if (brief.serpAnalysis?.peopleAlsoAsk?.length) {
    lines.push(`**"People Also Ask" Questions (address if relevant to this section):**
${brief.serpAnalysis.peopleAlsoAsk.slice(0, 4).map(q => `- ${q}`).join('\n')}`);
  }

  return lines.length ? lines.join('\n\n') : 'No specific SERP data for this section.';
}

function buildQualityRules(priorities: ContentGenerationPriorities): string {
  const rules = [
    '1. **No Repetitive Openings**: Each paragraph must start differently',
    '2. **Definitive Language**: Use "is/are" not "can be/might be" for facts',
    '3. **No Fluff**: Remove "also", "basically", "very", "actually", "really"'
  ];

  if (priorities.machineOptimization > 25) {
    rules.push('4. **Subject Positioning**: Central entity should be grammatical SUBJECT');
  }

  if (priorities.factualDensity > 20) {
    rules.push('5. **One Fact Per Sentence**: Each sentence adds unique information');
  }

  return rules.join('\n');
}

function getToneInstructions(tone: string): string {
  switch (tone) {
    case 'conversational': return 'Friendly and approachable, like talking to a colleague';
    case 'professional': return 'Authoritative but accessible. Clear and confident';
    case 'academic': return 'Formal and precise. Measured and objective';
    case 'sales': return 'Persuasive and benefit-focused';
    default: return 'Professional and clear';
  }
}

function getAudienceInstructions(level: string): string {
  switch (level) {
    case 'beginner': return 'Explain concepts from scratch. Define technical terms';
    case 'intermediate': return 'Assume basic familiarity. Can use industry terms';
    case 'expert': return 'Assume deep knowledge. Focus on nuance';
    default: return 'Assume intermediate familiarity';
  }
}

function getWordCountRange(section: SectionDefinition): string {
  if (section.level === 2) return '200-350';
  if (section.level === 3) return '150-250';
  return '100-200';
}
