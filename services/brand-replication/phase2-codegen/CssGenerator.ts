// services/brand-replication/phase2-codegen/CssGenerator.ts

import type { DiscoveredComponent } from '../interfaces';
import type { DesignDNA } from '../../../types/designDna';
import { CSS_GENERATION_PROMPT } from '../config/defaultPrompts';
import { getFastModel, getDefaultModel } from '../../../config/serviceRegistry';

export interface CssGeneratorConfig {
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  customPrompt?: string;
  cssStandards: {
    useCustomProperties: boolean;
    spacingScale: number[];
    requireHoverStates: boolean;
    requireTransitions: boolean;
    requireResponsive: boolean;
  };
}

export class CssGenerator {
  private config: CssGeneratorConfig;
  private lastRawResponse: string = '';

  constructor(config: CssGeneratorConfig) {
    this.config = config;
  }

  async generate(component: DiscoveredComponent, designDna: DesignDNA): Promise<string> {
    const prompt = this.buildPrompt(component, designDna);
    const css = await this.callAI(prompt);
    this.lastRawResponse = css;
    return this.postProcess(css);
  }

  private buildPrompt(component: DiscoveredComponent, designDna: DesignDNA): string {
    const template = this.config.customPrompt ?? CSS_GENERATION_PROMPT;

    return template
      .replace('{{componentName}}', component.name)
      .replace('{{purpose}}', component.purpose)
      .replace('{{visualDescription}}', component.visualDescription)
      .replace('{{designTokens}}', JSON.stringify(this.extractTokens(designDna), null, 2))
      .replace('{{spacingScale}}', this.config.cssStandards.spacingScale.join(', '));
  }

  private extractTokens(designDna: DesignDNA): Record<string, string> {
    return {
      '--brand-primary': designDna.colors.primary.hex,
      '--brand-primary-light': designDna.colors.primaryLight.hex,
      '--brand-primary-dark': designDna.colors.primaryDark.hex,
      '--brand-secondary': designDna.colors.secondary.hex,
      '--brand-accent': designDna.colors.accent.hex,
      '--brand-text': designDna.colors.neutrals.darkest,
      '--brand-text-muted': designDna.colors.neutrals.medium,
      '--brand-background': designDna.colors.neutrals.lightest,
      '--brand-surface': designDna.colors.neutrals.light,
      '--brand-border': designDna.colors.neutrals.medium,
      '--brand-font-heading': designDna.typography.headingFont.family,
      '--brand-font-body': designDna.typography.bodyFont.family,
      '--brand-radius-small': designDna.shapes.borderRadius.small,
      '--brand-radius-medium': designDna.shapes.borderRadius.medium,
      '--brand-radius-large': designDna.shapes.borderRadius.large,
    };
  }

  private async callAI(prompt: string): Promise<string> {
    if (this.config.aiProvider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: this.config.apiKey });
      const response = await client.messages.create({
        model: this.config.model ?? getDefaultModel('anthropic'),
        max_tokens: 4096,
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

  private postProcess(css: string): string {
    // Remove markdown code blocks if present
    let cleaned = css.replace(/```css\s*/g, '').replace(/```\s*/g, '');
    cleaned = cleaned.trim();
    return cleaned;
  }

  getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}
