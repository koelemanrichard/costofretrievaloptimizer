// services/brand-replication/phase2-codegen/HtmlGenerator.ts

import type { DiscoveredComponent } from '../interfaces';
import { HTML_GENERATION_PROMPT } from '../config/defaultPrompts';

export interface HtmlGeneratorConfig {
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  customPrompt?: string;
}

export class HtmlGenerator {
  private config: HtmlGeneratorConfig;
  private lastRawResponse: string = '';

  constructor(config: HtmlGeneratorConfig) {
    this.config = config;
  }

  async generate(component: DiscoveredComponent): Promise<string> {
    const prompt = this.buildPrompt(component);
    const html = await this.callAI(prompt);
    this.lastRawResponse = html;
    return this.postProcess(html);
  }

  private buildPrompt(component: DiscoveredComponent): string {
    const template = this.config.customPrompt ?? HTML_GENERATION_PROMPT;

    return template
      .replace('{{componentName}}', component.name)
      .replace('{{purpose}}', component.purpose)
      .replace('{{visualDescription}}', component.visualDescription);
  }

  private async callAI(prompt: string): Promise<string> {
    if (this.config.aiProvider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: this.config.apiKey });
      const response = await client.messages.create({
        model: this.config.model ?? 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      const textBlock = response.content.find(block => block.type === 'text');
      return textBlock?.type === 'text' ? textBlock.text : '';
    } else {
      const { GoogleGenAI } = await import('@google/genai');
      const genAI = new GoogleGenAI({ apiKey: this.config.apiKey });
      const response = await genAI.models.generateContent({
        model: this.config.model ?? 'gemini-2.0-flash',
        contents: prompt,
      });
      return response.text ?? '';
    }
  }

  private postProcess(html: string): string {
    // Remove markdown code blocks if present
    let cleaned = html.replace(/```html\s*/g, '').replace(/```\s*/g, '');
    cleaned = cleaned.trim();
    return cleaned;
  }

  getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}
