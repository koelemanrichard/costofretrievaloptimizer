// services/brand-replication/phase3-intelligence/ComponentMatcher.ts

import type { BrandComponent, SectionDesignDecision } from '../interfaces';
import type { SectionAnalysis } from './SectionAnalyzer';
import { COMPONENT_MATCHING_PROMPT } from '../config/defaultPrompts';
import { getFastModel, getDefaultModel } from '../../../config/serviceRegistry';

/**
 * Configuration for ComponentMatcher.
 */
export interface ComponentMatcherConfig {
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  customPrompt?: string;
}

/**
 * Raw matching result from AI before transformation.
 */
interface MatchingResult {
  componentId: string;
  componentName: string;
  variant: string;
  layout: {
    columns: number;
    width: string;
    emphasis: string;
  };
  contentMapping: Record<string, unknown>;
  reasoning: string;
}

/**
 * ComponentMatcher selects the best brand component for a section
 * based on the section's semantic analysis and available component library.
 */
export class ComponentMatcher {
  private config: ComponentMatcherConfig;
  private lastRawResponse: string = '';

  constructor(config: ComponentMatcherConfig) {
    this.config = config;
  }

  /**
   * Matches a section to the best component from the library.
   */
  async match(
    sectionId: string,
    sectionHeading: string,
    sectionContent: string,
    analysis: SectionAnalysis,
    componentLibrary: BrandComponent[]
  ): Promise<SectionDesignDecision> {
    // If no components, use fallback
    if (componentLibrary.length === 0) {
      return this.createFallbackDecision(sectionId, sectionHeading, analysis);
    }

    const prompt = this.buildPrompt(analysis, sectionContent, componentLibrary);

    const response = await this.callAI(prompt);
    this.lastRawResponse = response;

    const parsed = this.parseResponse(response);

    // Validate the selected component exists
    const selectedComponent = componentLibrary.find(
      c => c.id === parsed.componentId || c.name === parsed.componentName
    );

    if (!selectedComponent) {
      // AI selected a non-existent component, use best heuristic match
      const bestMatch = this.findBestHeuristicMatch(analysis, componentLibrary);
      return this.createDecision(sectionId, sectionHeading, analysis, bestMatch, parsed);
    }

    return this.createDecision(sectionId, sectionHeading, analysis, selectedComponent, parsed);
  }

  /**
   * Performs heuristic matching without AI for fallback scenarios.
   */
  matchHeuristically(
    sectionId: string,
    sectionHeading: string,
    analysis: SectionAnalysis,
    componentLibrary: BrandComponent[]
  ): SectionDesignDecision {
    if (componentLibrary.length === 0) {
      return this.createFallbackDecision(sectionId, sectionHeading, analysis);
    }

    const bestMatch = this.findBestHeuristicMatch(analysis, componentLibrary);

    return {
      sectionId,
      sectionHeading,
      component: bestMatch.name,
      componentId: bestMatch.id,
      variant: 'default',
      layout: this.inferLayout(analysis),
      reasoning: `Heuristic match: ${bestMatch.name} for ${analysis.semanticRole} content with ${analysis.contentStructure} structure.`,
      semanticRole: analysis.semanticRole,
      contentMapping: {},
      confidence: 0.7,
    };
  }

  /**
   * Builds the matching prompt from the template.
   */
  private buildPrompt(
    analysis: SectionAnalysis,
    sectionContent: string,
    componentLibrary: BrandComponent[]
  ): string {
    const template = this.config.customPrompt ?? COMPONENT_MATCHING_PROMPT;

    const componentList = componentLibrary
      .map(
        c =>
          `- ${c.id}: ${c.name} - ${c.purpose} (context: ${c.usageContext})${
            c.variants.length > 0
              ? ` [variants: ${c.variants.map(v => v.name).join(', ')}]`
              : ''
          }`
      )
      .join('\n');

    return template
      .replace('{{semanticRole}}', analysis.semanticRole)
      .replace('{{contentStructure}}', analysis.contentStructure)
      .replace('{{emphasisLevel}}', analysis.emphasisLevel)
      .replace('{{readerNeed}}', analysis.readerNeed)
      .replace('{{componentList}}', componentList)
      .replace('{{sectionContent}}', this.truncateContent(sectionContent, 1500));
  }

  /**
   * Truncates content to avoid exceeding token limits.
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '... [truncated]';
  }

  /**
   * Calls the AI provider to match the component.
   */
  private async callAI(prompt: string): Promise<string> {
    if (this.config.aiProvider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: this.config.apiKey });

      const response = await client.messages.create({
        model: this.config.model ?? getDefaultModel('anthropic'),
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find(block => block.type === 'text');
      return textBlock?.type === 'text' ? textBlock.text : '';
    } else {
      const { GoogleGenAI } = await import('@google/genai');
      const genAI = new GoogleGenAI({ apiKey: this.config.apiKey });
      const response = await genAI.models.generateContent({
        model: this.config.model ?? getFastModel('gemini'),
        contents: prompt,
      });
      return response.text ?? '';
    }
  }

  /**
   * Parses the AI response to extract the matching result.
   */
  private parseResponse(response: string): MatchingResult {
    const jsonMatch =
      response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not parse component matching response as JSON');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];

    try {
      const parsed = JSON.parse(jsonStr);

      return {
        componentId: String(parsed.componentId || ''),
        componentName: String(parsed.componentName || ''),
        variant: String(parsed.variant || 'default'),
        layout: {
          columns: Number(parsed.layout?.columns) || 1,
          width: String(parsed.layout?.width || 'medium'),
          emphasis: String(parsed.layout?.emphasis || 'standard'),
        },
        contentMapping: parsed.contentMapping || {},
        reasoning: String(parsed.reasoning || 'AI selection'),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse component matching JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Creates a SectionDesignDecision from the parsed result and component.
   */
  private createDecision(
    sectionId: string,
    sectionHeading: string,
    analysis: SectionAnalysis,
    component: BrandComponent,
    result: MatchingResult
  ): SectionDesignDecision {
    // Normalize layout values
    const columns = this.normalizeColumns(result.layout.columns);
    const width = this.normalizeWidth(result.layout.width);
    const emphasis = this.normalizeEmphasis(result.layout.emphasis);

    // Validate variant exists or use default
    const variant = component.variants.some(v => v.name === result.variant)
      ? result.variant
      : 'default';

    return {
      sectionId,
      sectionHeading,
      component: component.name,
      componentId: component.id,
      variant,
      layout: { columns, width, emphasis },
      reasoning: result.reasoning,
      semanticRole: analysis.semanticRole,
      contentMapping: this.sanitizeContentMapping(result.contentMapping),
      confidence: 0.85,
    };
  }

  /**
   * Creates a fallback decision when no components are available.
   */
  private createFallbackDecision(
    sectionId: string,
    sectionHeading: string,
    analysis: SectionAnalysis
  ): SectionDesignDecision {
    return {
      sectionId,
      sectionHeading,
      component: 'DefaultSection',
      componentId: 'default-section',
      variant: 'default',
      layout: this.inferLayout(analysis),
      reasoning: 'Fallback: No components in library. Using default section layout.',
      semanticRole: analysis.semanticRole,
      contentMapping: {},
      confidence: 0.5,
    };
  }

  /**
   * Finds the best matching component using heuristics.
   */
  private findBestHeuristicMatch(
    analysis: SectionAnalysis,
    componentLibrary: BrandComponent[]
  ): BrandComponent {
    // Score each component based on keyword matching
    const scores = componentLibrary.map(component => {
      let score = 0;

      const purpose = component.purpose.toLowerCase();
      const context = component.usageContext.toLowerCase();
      const name = component.name.toLowerCase();
      const role = analysis.semanticRole.toLowerCase();
      const structure = analysis.contentStructure.toLowerCase();

      // Role matching
      if (purpose.includes(role) || context.includes(role) || name.includes(role)) {
        score += 10;
      }

      // Structure matching
      if (structure === 'list' && (name.includes('list') || name.includes('card'))) {
        score += 5;
      }
      if (structure === 'process' && (name.includes('step') || name.includes('process'))) {
        score += 5;
      }
      if (structure === 'comparison' && (name.includes('compare') || name.includes('table'))) {
        score += 5;
      }

      // Emphasis matching
      if (analysis.emphasisLevel === 'hero' && (name.includes('hero') || name.includes('banner'))) {
        score += 8;
      }
      if (analysis.emphasisLevel === 'featured' && name.includes('featured')) {
        score += 5;
      }

      // Context keywords
      const contextKeywords = ['benefit', 'feature', 'service', 'cta', 'call', 'action', 'warning'];
      for (const keyword of contextKeywords) {
        if (role.includes(keyword) && (purpose.includes(keyword) || name.includes(keyword))) {
          score += 3;
        }
      }

      return { component, score };
    });

    // Sort by score and return best match
    scores.sort((a, b) => b.score - a.score);

    return scores[0]?.component || componentLibrary[0];
  }

  /**
   * Infers layout parameters from analysis.
   */
  private inferLayout(analysis: SectionAnalysis): SectionDesignDecision['layout'] {
    let columns: 1 | 2 | 3 | 4 = 1;
    let width: 'narrow' | 'medium' | 'wide' | 'full' = 'medium';
    let emphasis = analysis.emphasisLevel;

    // Infer columns from content structure
    if (analysis.contentStructure === 'list' || analysis.contentStructure === 'comparison') {
      columns = 2;
    }
    if (analysis.contentStructure === 'process') {
      columns = 3;
    }

    // Infer width from emphasis
    if (emphasis === 'hero') {
      width = 'full';
    } else if (emphasis === 'featured') {
      width = 'wide';
    } else if (emphasis === 'supporting' || emphasis === 'minimal') {
      width = 'narrow';
    }

    return { columns, width, emphasis };
  }

  /**
   * Normalizes columns to valid values.
   */
  private normalizeColumns(value: number): 1 | 2 | 3 | 4 {
    if (value <= 1) return 1;
    if (value === 2) return 2;
    if (value === 3) return 3;
    return 4;
  }

  /**
   * Normalizes width to valid values.
   */
  private normalizeWidth(value: string): 'narrow' | 'medium' | 'wide' | 'full' {
    const normalized = value.toLowerCase();
    if (normalized === 'narrow') return 'narrow';
    if (normalized === 'wide') return 'wide';
    if (normalized === 'full') return 'full';
    return 'medium';
  }

  /**
   * Normalizes emphasis to valid values.
   */
  private normalizeEmphasis(
    value: string
  ): 'hero' | 'featured' | 'standard' | 'supporting' | 'minimal' {
    const normalized = value.toLowerCase();
    if (normalized === 'hero') return 'hero';
    if (normalized === 'featured') return 'featured';
    if (normalized === 'supporting') return 'supporting';
    if (normalized === 'minimal') return 'minimal';
    return 'standard';
  }

  /**
   * Sanitizes content mapping to ensure valid types.
   */
  private sanitizeContentMapping(
    mapping: Record<string, unknown>
  ): SectionDesignDecision['contentMapping'] {
    const sanitized: SectionDesignDecision['contentMapping'] = {};

    if (typeof mapping.title === 'string') {
      sanitized.title = mapping.title;
    }
    if (Array.isArray(mapping.items)) {
      sanitized.items = mapping.items.map(String);
    }
    if (typeof mapping.ctaText === 'string') {
      sanitized.ctaText = mapping.ctaText;
    }
    if (typeof mapping.ctaUrl === 'string') {
      sanitized.ctaUrl = mapping.ctaUrl;
    }
    if (typeof mapping.highlightedText === 'string') {
      sanitized.highlightedText = mapping.highlightedText;
    }
    if (typeof mapping.iconSuggestion === 'string') {
      sanitized.iconSuggestion = mapping.iconSuggestion;
    }

    return sanitized;
  }

  /**
   * Returns the last raw AI response for debugging.
   */
  getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}
