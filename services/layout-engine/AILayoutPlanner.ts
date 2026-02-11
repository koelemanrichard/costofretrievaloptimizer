/**
 * AILayoutPlanner
 *
 * AI-based layout planning that understands content semantically.
 * Unlike pattern-based detection, this uses AI to analyze the full context
 * and make intelligent layout decisions like a professional designer would.
 *
 * Key capabilities:
 * - Understands the meaning and purpose of each section
 * - Considers how sections relate to each other
 * - Makes context-aware component selections
 * - Adjusts visual emphasis based on semantic importance
 * - Language and region aware
 */

import type { DesignDNA } from '../../types/designDna';
import type {
  BlueprintSection,
  ComponentType,
  ContentType,
  EmphasisLevel,
  SectionAnalysis,
  ComponentSelection,
  LayoutParameters,
  VisualEmphasis,
} from './types';
import { SectionAnalyzer } from './SectionAnalyzer';
import { LayoutPlanner } from './LayoutPlanner';
import { VisualEmphasizer } from './VisualEmphasizer';
import { API_ENDPOINTS } from '../../config/apiEndpoints';
import { getFastModel, getDefaultModel } from '../../config/serviceRegistry';

// AI Provider type
export type AIProvider = 'gemini' | 'anthropic';

// ============================================================================
// TYPES
// ============================================================================

interface AILayoutDecision {
  sectionId: string;
  heading: string;
  component: ComponentType;
  componentVariant: string;
  emphasisLevel: EmphasisLevel;
  layoutWidth: 'narrow' | 'medium' | 'wide' | 'full';
  layoutColumns: '1-column' | '2-column' | '3-column' | 'asymmetric';
  reasoning: string;
}

interface AILayoutResponse {
  sections: AILayoutDecision[];
  overallStrategy: string;
  keyDesignDecisions: string[];
}

interface AILayoutInput {
  title: string;
  sections: Array<{
    id: string;
    heading: string;
    content: string;
    wordCount: number;
  }>;
  brandPersonality: string;
  language: string;
}

// ============================================================================
// AI PROMPT
// ============================================================================

const AI_LAYOUT_PROMPT = `You are a senior UI/UX designer at a top design agency. Your task is to analyze article content and make intelligent layout decisions.

## Your Design Philosophy
- Each section should have purposeful visual treatment, not generic styling
- Variety creates visual interest - avoid monotonous "wall of text" designs
- Important insights deserve visual emphasis (larger text, colored backgrounds, icons)
- Process/step content works best as timelines or numbered flows
- Statistics and data should be visually highlighted
- Related content can be grouped in cards or grids
- Conclusions and key takeaways need special treatment

## Available Components
Choose the most appropriate component for each section:
- "hero": Opening sections with high visual impact (gradient backgrounds, large text)
- "feature-grid": Benefits, features, capabilities (multi-column icon cards)
- "timeline": Processes, sequences, history (vertical connected nodes)
- "step-list": How-to guides, tutorials (numbered step indicators)
- "faq-accordion": FAQ sections (collapsible Q&A)
- "comparison-table": Comparisons, specifications (styled tables)
- "testimonial-card": Quotes, social proof (attribution with styling)
- "key-takeaways": Conclusions, summaries (highlighted box)
- "cta-banner": Call-to-action sections (gradient banner with buttons)
- "stat-highlight": Statistics, metrics (large numbers with labels)
- "checklist": Requirements, feature lists (check icons)
- "blockquote": Pull quotes, important statements (styled quote)
- "definition-box": Definitions, terms (icon + definition)
- "card": General elevated content (shadow container)
- "prose": Standard text paragraphs (default, use sparingly)

## Emphasis Levels
- "hero": Maximum visual impact, full-width, dramatic styling
- "featured": High emphasis, colored background or border
- "standard": Normal styling
- "supporting": Reduced visual weight, smaller text
- "minimal": De-emphasized, compact

## Layout Options
Width: narrow (focused reading), medium (balanced), wide (more content), full (edge-to-edge)
Columns: 1-column (focused), 2-column (comparison), 3-column (features), asymmetric (visual interest)

## Input Format
{
  "title": "Article title",
  "sections": [{ "id": "...", "heading": "...", "content": "first 500 chars...", "wordCount": 250 }],
  "brandPersonality": "corporate|creative|minimal|luxurious|friendly|bold|elegant|playful",
  "language": "en|nl|de|..."
}

## Output Format (JSON only, no markdown)
{
  "sections": [
    {
      "sectionId": "section-0",
      "heading": "...",
      "component": "timeline",
      "componentVariant": "professional",
      "emphasisLevel": "featured",
      "layoutWidth": "wide",
      "layoutColumns": "1-column",
      "reasoning": "This section describes a step-by-step process, so a timeline component best visualizes the sequential nature of the content."
    }
  ],
  "overallStrategy": "This article is a technical guide, so I'm using professional components with clear visual hierarchy...",
  "keyDesignDecisions": [
    "Using timeline for process sections to visualize sequence",
    "Key statistics highlighted with stat-highlight for impact"
  ]
}

IMPORTANT:
- Analyze the MEANING of each section, not just keywords
- Provide variety - don't use the same component for everything
- Use "prose" sparingly - most content benefits from more visual components
- Consider the FLOW of the article - how sections connect
- Be language-aware - Dutch "Hoe" = English "How", etc.

Now analyze this content and provide layout decisions:`;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate layout blueprint using AI analysis of content.
 * This provides context-aware, semantically intelligent layout decisions
 * that pattern-based detection cannot achieve.
 *
 * @param content - Full article content
 * @param title - Article title
 * @param options - Configuration including AI provider and optional fix instructions
 * @param options.fixInstructions - When provided, AI will focus on these specific improvements
 */
export async function generateAILayoutBlueprint(
  content: string,
  title: string,
  options: {
    aiProvider: AIProvider;
    apiKey: string;
    designDna?: DesignDNA;
    language?: string;
    fixInstructions?: string; // Design quality issue fix instructions
  }
): Promise<{ sections: BlueprintSection[]; aiReasoning: AILayoutResponse }> {
  // 1. Parse content into sections
  const analyses = SectionAnalyzer.analyzeAllSections(content);

  if (analyses.length === 0) {
    return { sections: [], aiReasoning: { sections: [], overallStrategy: '', keyDesignDecisions: [] } };
  }

  // 2. Prepare input for AI
  const brandPersonality = options.designDna?.personality?.overall || 'corporate';
  const language = options.language || detectLanguage(content);

  const aiInput: AILayoutInput = {
    title,
    sections: analyses.map((a, i) => ({
      id: a.sectionId,
      heading: a.heading,
      content: extractSectionContent(content, a.heading).substring(0, 500),
      wordCount: a.wordCount,
    })),
    brandPersonality,
    language,
  };

  // 3. Call AI for layout decisions
  console.log('[AILayoutPlanner] Requesting AI layout analysis...');
  console.log('[AILayoutPlanner] Sections to analyze:', aiInput.sections.length);
  if (options.fixInstructions) {
    console.log('[AILayoutPlanner] Fix instructions provided:', options.fixInstructions.substring(0, 100));
  }

  let aiResponse: AILayoutResponse;
  try {
    // Build the prompt, including fix instructions if provided
    let prompt = AI_LAYOUT_PROMPT;

    if (options.fixInstructions) {
      prompt += `\n\n## PRIORITY FIX INSTRUCTIONS
The previous layout had quality issues. You MUST address these specific improvements:
${options.fixInstructions}

Apply these fixes while maintaining overall coherence. Be creative with component selection to achieve visual variety.`;
    }

    prompt += `\n\n${JSON.stringify(aiInput, null, 2)}`;
    const responseText = await callAIProvider(options.aiProvider, options.apiKey, prompt);

    // Parse AI response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    aiResponse = JSON.parse(jsonMatch[0]);
    console.log('[AILayoutPlanner] AI analysis complete:', aiResponse.overallStrategy);
  } catch (error) {
    console.error('[AILayoutPlanner] AI analysis failed, using pattern-based fallback:', error);
    // Fall back to pattern-based analysis
    return {
      sections: buildPatternBasedSections(analyses, options.designDna),
      aiReasoning: {
        sections: [],
        overallStrategy: 'Pattern-based fallback (AI unavailable)',
        keyDesignDecisions: [],
      },
    };
  }

  // 4. Build BlueprintSections from AI decisions
  const sections = buildSectionsFromAIDecisions(analyses, aiResponse, options.designDna);

  return { sections, aiReasoning: aiResponse };
}

// ============================================================================
// AI PROVIDER CALLS
// ============================================================================

/**
 * Call AI provider (Gemini or Anthropic) for layout analysis
 */
async function callAIProvider(
  provider: AIProvider,
  apiKey: string,
  prompt: string
): Promise<string> {
  if (provider === 'gemini') {
    return callGemini(apiKey, prompt);
  } else if (provider === 'anthropic') {
    return callAnthropic(apiKey, prompt);
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Call Gemini API
 */
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const model = getFastModel('gemini');
  const apiUrl = `${API_ENDPOINTS.GEMINI}${model}:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Call Anthropic API
 */
async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  const model = getDefaultModel('anthropic');
  const apiUrl = API_ENDPOINTS.ANTHROPIC;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectLanguage(content: string): string {
  // Simple language detection based on common words
  const dutchPatterns = /\b(de|het|een|van|in|op|voor|met|zijn|wordt|deze|naar|ook|als)\b/gi;
  const germanPatterns = /\b(der|die|das|und|ist|von|für|mit|werden|auch|nach|bei)\b/gi;
  const englishPatterns = /\b(the|is|are|of|to|and|for|with|this|that|from|also)\b/gi;

  const dutchCount = (content.match(dutchPatterns) || []).length;
  const germanCount = (content.match(germanPatterns) || []).length;
  const englishCount = (content.match(englishPatterns) || []).length;

  if (dutchCount > englishCount && dutchCount > germanCount) return 'nl';
  if (germanCount > englishCount && germanCount > dutchCount) return 'de';
  return 'en';
}

function extractSectionContent(fullContent: string, heading: string): string {
  if (!heading) return '';

  // Find the heading in the content
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingPattern = new RegExp(`(#{1,6}\\s*${escapedHeading}|<h[1-6][^>]*>${escapedHeading})`, 'i');
  const match = fullContent.match(headingPattern);

  if (!match || match.index === undefined) return '';

  // Get content from heading to next heading
  const startIndex = match.index;
  const nextHeading = fullContent.slice(startIndex + match[0].length).match(/\n#{1,6}\s+|<h[1-6]/);
  const endIndex = nextHeading?.index
    ? startIndex + match[0].length + nextHeading.index
    : fullContent.length;

  return fullContent.slice(startIndex, endIndex);
}

function buildSectionsFromAIDecisions(
  analyses: SectionAnalysis[],
  aiResponse: AILayoutResponse,
  dna?: DesignDNA
): BlueprintSection[] {
  return analyses.map((analysis, index) => {
    // Find AI decision for this section
    const aiDecision = aiResponse.sections.find(
      (d) => d.sectionId === analysis.sectionId || d.heading === analysis.heading
    );

    // Use AI decision if available, otherwise fall back to pattern-based
    const component: ComponentSelection = aiDecision
      ? {
          primaryComponent: aiDecision.component,
          alternativeComponents: ['prose', 'card'],
          componentVariant: aiDecision.componentVariant,
          confidence: 0.9,
          reasoning: aiDecision.reasoning,
        }
      : {
          primaryComponent: 'prose',
          alternativeComponents: ['card'],
          componentVariant: 'default',
          confidence: 0.5,
          reasoning: 'No AI decision available, using default',
        };

    const layout: LayoutParameters = aiDecision
      ? {
          width: aiDecision.layoutWidth,
          columns: aiDecision.layoutColumns === 'asymmetric' ? 'asymmetric-left' : aiDecision.layoutColumns,
          imagePosition: 'none',
          verticalSpacingBefore: 'normal',
          verticalSpacingAfter: 'normal',
          breakBefore: 'none',
          breakAfter: 'none',
          alignText: 'left',
        }
      : LayoutPlanner.planLayout(analysis, dna);

    const emphasis: VisualEmphasis = aiDecision
      ? {
          level: aiDecision.emphasisLevel,
          headingSize: aiDecision.emphasisLevel === 'hero' ? 'xl' : aiDecision.emphasisLevel === 'featured' ? 'lg' : 'md',
          headingDecoration: ['hero', 'featured'].includes(aiDecision.emphasisLevel),
          paddingMultiplier: aiDecision.emphasisLevel === 'hero' ? 2 : aiDecision.emphasisLevel === 'featured' ? 1.5 : 1,
          marginMultiplier: aiDecision.emphasisLevel === 'hero' ? 2 : aiDecision.emphasisLevel === 'featured' ? 1.5 : 1,
          hasBackgroundTreatment: ['hero', 'featured'].includes(aiDecision.emphasisLevel),
          backgroundType: aiDecision.emphasisLevel === 'hero' ? 'gradient' : undefined,
          hasAccentBorder: aiDecision.emphasisLevel === 'featured',
          accentPosition: 'left',
          elevation: aiDecision.emphasisLevel === 'hero' ? 2 : aiDecision.emphasisLevel === 'featured' ? 1 : 0,
          hasEntryAnimation: ['hero', 'featured'].includes(aiDecision.emphasisLevel),
          animationType: 'fade',
        }
      : VisualEmphasizer.calculateEmphasis(analysis, dna);

    // Generate CSS classes
    const cssClasses = [
      `layout-${layout.columns}`,
      `width-${layout.width}`,
      `emphasis-${emphasis.level}`,
      `component-${component.primaryComponent}`,
      emphasis.hasBackgroundTreatment ? 'has-background' : '',
      emphasis.hasAccentBorder ? 'has-accent-border' : '',
    ].filter(Boolean);

    return {
      id: analysis.sectionId,
      order: index,
      heading: analysis.heading,
      headingLevel: analysis.headingLevel,
      contentType: analysis.contentType,
      semanticWeight: analysis.semanticWeight,
      layout,
      emphasis,
      component,
      constraints: analysis.constraints,
      contentZone: analysis.contentZone,
      cssClasses,
    };
  });
}

function buildPatternBasedSections(
  analyses: SectionAnalysis[],
  dna?: DesignDNA
): BlueprintSection[] {
  // Import and use existing LayoutEngine logic
  const { ComponentSelector } = require('./ComponentSelector');
  const { LayoutPlanner } = require('./LayoutPlanner');
  const { VisualEmphasizer } = require('./VisualEmphasizer');

  return analyses.map((analysis, index) => {
    const layout = LayoutPlanner.planLayout(analysis, dna);
    const component = ComponentSelector.selectComponent(analysis, dna);
    const emphasis = VisualEmphasizer.calculateEmphasis(analysis, dna);

    const cssClasses = [
      `layout-${layout.columns}`,
      `width-${layout.width}`,
      `emphasis-${emphasis.level}`,
      `component-${component.primaryComponent}`,
    ];

    return {
      id: analysis.sectionId,
      order: index,
      heading: analysis.heading,
      headingLevel: analysis.headingLevel,
      contentType: analysis.contentType,
      semanticWeight: analysis.semanticWeight,
      layout,
      emphasis,
      component,
      constraints: analysis.constraints,
      contentZone: analysis.contentZone,
      cssClasses,
    };
  });
}

export default { generateAILayoutBlueprint };
