// services/brand-replication/phase1-discovery/VisualAnalyzer.ts

import type { DiscoveredComponent, Screenshot } from '../interfaces';
import { DISCOVERY_PROMPT } from '../config/defaultPrompts';
import { getFastModel, getDefaultModel } from '../../../config/serviceRegistry';

export interface VisualAnalyzerConfig {
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  customPrompt?: string;
  minOccurrences: number;
  confidenceThreshold: number;
}

interface AnalysisResult {
  components: Array<{
    name: string;
    purpose: string;
    visualDescription: string;
    usageContext: string;
    occurrences: number;
    confidence: number;
  }>;
  brandObservations: string;
}

export class VisualAnalyzer {
  private config: VisualAnalyzerConfig;
  private lastRawResponse: string = '';

  constructor(config: VisualAnalyzerConfig) {
    this.config = config;
  }

  async analyze(screenshots: Screenshot[]): Promise<{
    components: DiscoveredComponent[];
    rawAnalysis: string;
  }> {
    const prompt = this.config.customPrompt ?? DISCOVERY_PROMPT;

    // Use base64Data from screenshots (must be provided by caller)
    const images = screenshots
      .filter(s => s.base64Data) // Only use screenshots with base64 data
      .map(s => ({
        url: s.url,
        base64: s.base64Data!,
        mimeType: s.mimeType ?? 'image/png',
      }));

    if (images.length === 0) {
      throw new Error('No screenshots with base64Data provided. Screenshots must include base64Data for visual analysis.');
    }

    // Call AI with vision capability
    const response = await this.callAI(prompt, images);
    this.lastRawResponse = response;

    // Parse response
    const analysis = this.parseAnalysis(response);

    // Convert to DiscoveredComponent format and filter by thresholds
    const components = analysis.components
      .filter(c => c.occurrences >= this.config.minOccurrences)
      .filter(c => c.confidence >= this.config.confidenceThreshold)
      .map((c, index) => ({
        id: `discovered-${Date.now()}-${index}`,
        name: c.name,
        purpose: c.purpose,
        visualDescription: c.visualDescription,
        usageContext: c.usageContext,
        sourceScreenshots: screenshots.map(s => s.path),
        occurrences: c.occurrences,
        confidence: c.confidence,
      }));

    return {
      components,
      rawAnalysis: response,
    };
  }

  private async callAI(prompt: string, images: { base64: string; mimeType: string; url: string }[]): Promise<string> {
    if (this.config.aiProvider === 'anthropic') {
      return this.callAnthropic(prompt, images);
    } else {
      return this.callGemini(prompt, images);
    }
  }

  private async callAnthropic(prompt: string, images: { base64: string; mimeType: string }[]): Promise<string> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: this.config.apiKey });

    const content: any[] = images.map(img => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mimeType,
        data: img.base64,
      },
    }));
    content.push({ type: 'text', text: prompt });

    const response = await client.messages.create({
      model: this.config.model ?? getDefaultModel('anthropic'),
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : '';
  }

  private async callGemini(prompt: string, images: { base64: string; mimeType: string }[]): Promise<string> {
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey: this.config.apiKey });

    // Build content parts with images and text prompt
    const parts: any[] = images.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    }));
    parts.push({ text: prompt });

    const response = await genAI.models.generateContent({
      model: this.config.model ?? getFastModel('gemini'),
      contents: [{ parts }],
    });
    return response.text ?? '';
  }

  private parseAnalysis(response: string): AnalysisResult {
    // Extract JSON from response (might be wrapped in markdown code blocks)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  }

  getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}
