// services/brand-replication/phase3-intelligence/SectionAnalyzer.ts

import type { SectionContext } from '../interfaces';
import { SECTION_ANALYSIS_PROMPT } from '../config/defaultPrompts';
import { getFastModel, getDefaultModel } from '../../../config/serviceRegistry';

/**
 * Result of semantic section analysis.
 */
export interface SectionAnalysis {
  /** The section's semantic purpose (introduction, key-benefits, process-steps, etc.) */
  semanticRole: string;
  /** Content structure type */
  contentStructure: 'list' | 'process' | 'comparison' | 'single-concept' | 'mixed';
  /** Visual importance level */
  emphasisLevel: 'hero' | 'featured' | 'standard' | 'supporting' | 'minimal';
  /** What the reader needs from this section */
  readerNeed: string;
  /** Reasoning behind the analysis */
  reasoning: string;
}

/**
 * Configuration for SectionAnalyzer.
 */
export interface SectionAnalyzerConfig {
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  customPrompt?: string;
}

/**
 * SectionAnalyzer uses AI to determine the semantic role and ideal presentation
 * of each article section based on full context.
 */
export class SectionAnalyzer {
  private config: SectionAnalyzerConfig;
  private lastRawResponse: string = '';

  constructor(config: SectionAnalyzerConfig) {
    this.config = config;
  }

  /**
   * Analyzes a section to determine its semantic role and presentation needs.
   */
  async analyze(
    sectionContext: SectionContext,
    articleTitle: string,
    mainMessage: string,
    centralEntity: string,
    sourceContext: string,
    targetAudience: string
  ): Promise<SectionAnalysis> {
    const prompt = this.buildPrompt(
      sectionContext,
      articleTitle,
      mainMessage,
      centralEntity,
      sourceContext,
      targetAudience
    );

    const response = await this.callAI(prompt);
    this.lastRawResponse = response;

    return this.parseResponse(response);
  }

  /**
   * Performs a quick heuristic analysis without AI for fallback scenarios.
   */
  analyzeHeuristically(sectionContext: SectionContext): SectionAnalysis {
    const { section, position } = sectionContext;
    const content = section.content.toLowerCase();
    const heading = section.heading.toLowerCase();

    // Determine content structure based on content patterns
    let contentStructure: SectionAnalysis['contentStructure'] = 'single-concept';
    if (content.includes('<li>') || content.includes('- ') || content.match(/^\d+\./m)) {
      contentStructure = 'list';
    } else if (
      heading.includes('step') ||
      heading.includes('how to') ||
      heading.includes('process')
    ) {
      contentStructure = 'process';
    } else if (
      heading.includes('vs') ||
      heading.includes('comparison') ||
      heading.includes('difference')
    ) {
      contentStructure = 'comparison';
    } else if (content.length > 1000 && (content.includes('<li>') || content.includes('<table'))) {
      contentStructure = 'mixed';
    }

    // Determine semantic role based on position and heading
    let semanticRole: string;
    let emphasisLevel: SectionAnalysis['emphasisLevel'];
    let readerNeed: string;

    if (position === 'intro') {
      semanticRole = 'introduction';
      emphasisLevel = 'hero';
      readerNeed = 'Quick understanding of topic and value proposition';
    } else if (position === 'conclusion') {
      if (
        heading.includes('cta') ||
        heading.includes('contact') ||
        heading.includes('get started')
      ) {
        semanticRole = 'call-to-action';
        emphasisLevel = 'featured';
        readerNeed = 'Clear next steps and action prompt';
      } else {
        semanticRole = 'conclusion';
        emphasisLevel = 'standard';
        readerNeed = 'Summary and key takeaways';
      }
    } else {
      // Body section - determine based on content
      if (
        heading.includes('benefit') ||
        heading.includes('advantage') ||
        heading.includes('why')
      ) {
        semanticRole = 'key-benefits';
        emphasisLevel = 'featured';
        readerNeed = 'Understand the value proposition';
      } else if (heading.includes('warning') || heading.includes('caution') || heading.includes('risk')) {
        semanticRole = 'warning';
        emphasisLevel = 'featured';
        readerNeed = 'Important safety or risk information';
      } else if (heading.includes('example') || heading.includes('case')) {
        semanticRole = 'case-study';
        emphasisLevel = 'standard';
        readerNeed = 'Real-world application and proof';
      } else if (contentStructure === 'process') {
        semanticRole = 'process-steps';
        emphasisLevel = 'standard';
        readerNeed = 'Step-by-step guidance';
      } else if (contentStructure === 'comparison') {
        semanticRole = 'comparison';
        emphasisLevel = 'standard';
        readerNeed = 'Objective comparison to make decisions';
      } else {
        semanticRole = 'supporting-detail';
        emphasisLevel = section.wordCount > 300 ? 'standard' : 'supporting';
        readerNeed = 'Detailed information about specific aspect';
      }
    }

    return {
      semanticRole,
      contentStructure,
      emphasisLevel,
      readerNeed,
      reasoning: `Heuristic analysis based on position (${position}), heading keywords, and content patterns.`,
    };
  }

  /**
   * Builds the analysis prompt from the template.
   */
  private buildPrompt(
    ctx: SectionContext,
    articleTitle: string,
    mainMessage: string,
    centralEntity: string,
    sourceContext: string,
    targetAudience: string
  ): string {
    const template = this.config.customPrompt ?? SECTION_ANALYSIS_PROMPT;

    return template
      .replace('{{centralEntity}}', centralEntity || 'Not specified')
      .replace('{{sourceContext}}', sourceContext || 'Not specified')
      .replace('{{targetAudience}}', targetAudience || 'General audience')
      .replace('{{articleTitle}}', articleTitle)
      .replace('{{mainMessage}}', mainMessage || 'Not specified')
      .replace('{{position}}', ctx.position)
      .replace('{{positionIndex}}', String(ctx.positionIndex + 1))
      .replace('{{totalSections}}', String(ctx.totalSections))
      .replace('{{sectionHeading}}', ctx.section.heading)
      .replace('{{sectionContent}}', this.truncateContent(ctx.section.content, 2000))
      .replace('{{precedingSections}}', ctx.precedingSections.join(', ') || 'None')
      .replace('{{followingSections}}', ctx.followingSections.join(', ') || 'None');
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
   * Calls the AI provider to analyze the section.
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
   * Parses the AI response to extract the analysis.
   */
  private parseResponse(response: string): SectionAnalysis {
    // Try to extract JSON from response
    const jsonMatch =
      response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not parse section analysis response as JSON');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];

    try {
      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.semanticRole || !parsed.contentStructure || !parsed.emphasisLevel) {
        throw new Error('Missing required fields in section analysis');
      }

      // Normalize emphasisLevel to valid values
      const validEmphasis = ['hero', 'featured', 'standard', 'supporting', 'minimal'];
      if (!validEmphasis.includes(parsed.emphasisLevel)) {
        parsed.emphasisLevel = 'standard';
      }

      // Normalize contentStructure to valid values
      const validStructures = ['list', 'process', 'comparison', 'single-concept', 'mixed'];
      if (!validStructures.includes(parsed.contentStructure)) {
        parsed.contentStructure = 'single-concept';
      }

      return {
        semanticRole: String(parsed.semanticRole),
        contentStructure: parsed.contentStructure,
        emphasisLevel: parsed.emphasisLevel,
        readerNeed: String(parsed.readerNeed || 'Information about this topic'),
        reasoning: String(parsed.reasoning || 'AI analysis'),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse section analysis JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Returns the last raw AI response for debugging.
   */
  getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}
