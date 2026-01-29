// services/brand-replication/phase2-codegen/index.ts

import {
  BaseModule,
  type CodeGenInput,
  type CodeGenOutput,
  type CodeGenConfig,
  type BrandComponent,
  type ValidationResult,
} from '../interfaces';
import { CssGenerator } from './CssGenerator';
import { HtmlGenerator } from './HtmlGenerator';
import { DEFAULT_CODEGEN_CONFIG } from '../config';

export class CodeGenModule extends BaseModule<CodeGenInput, CodeGenOutput, CodeGenConfig> {
  private cssGenerator: CssGenerator;
  private htmlGenerator: HtmlGenerator;

  constructor(config: CodeGenConfig) {
    super(config);

    this.cssGenerator = new CssGenerator({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      customPrompt: config.customPrompt,
      cssStandards: config.cssStandards ?? DEFAULT_CODEGEN_CONFIG.cssStandards,
    });

    this.htmlGenerator = new HtmlGenerator({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
    });
  }

  getPhaseName(): string {
    return 'codegen';
  }

  async run(input: CodeGenInput): Promise<CodeGenOutput> {
    this.updateStatus({ status: 'running', progress: 0, startedAt: new Date().toISOString() });

    const components: BrandComponent[] = [];
    const matchScores: { componentId: string; score: number; details: string }[] = [];
    const errors: string[] = [];

    try {
      const discoveredComponents = input.discoveryOutput.discoveredComponents;
      const total = discoveredComponents.length;

      for (let i = 0; i < total; i++) {
        const discovered = discoveredComponents[i];
        this.updateStatus({
          progress: Math.round((i / total) * 80) + 10,
          message: `Generating code for ${discovered.name}...`,
        });

        try {
          const css = await this.cssGenerator.generate(discovered, input.designDna);
          const htmlTemplate = await this.htmlGenerator.generate(discovered);

          const component: BrandComponent = {
            id: `component-${Date.now()}-${i}`,
            brandId: input.brandId,
            name: discovered.name,
            purpose: discovered.purpose,
            usageContext: discovered.usageContext,
            css,
            htmlTemplate,
            previewHtml: this.generatePreview(htmlTemplate, css),
            sourceComponent: discovered,
            matchScore: 85, // Default score, would be validated in real implementation
            variants: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          components.push(component);
          matchScores.push({
            componentId: component.id,
            score: component.matchScore,
            details: 'Generated successfully',
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to generate ${discovered.name}: ${errorMessage}`);
        }
      }

      // Compile all CSS together
      const compiledCss = components.map(c => `/* ${c.name} */\n${c.css}`).join('\n\n');

      const output: CodeGenOutput = {
        brandId: input.brandId,
        components,
        compiledCss,
        timestamp: new Date().toISOString(),
        status: errors.length === 0 ? 'success' : components.length > 0 ? 'partial' : 'failed',
        errors: errors.length > 0 ? errors : undefined,
        matchScores,
      };

      this.updateStatus({
        status: output.status,
        progress: 100,
        completedAt: new Date().toISOString(),
      });

      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStatus({ status: 'failed', message: errorMessage });

      return {
        brandId: input.brandId,
        components: [],
        compiledCss: '',
        timestamp: new Date().toISOString(),
        status: 'failed',
        errors: [errorMessage],
        matchScores: [],
      };
    }
  }

  private generatePreview(htmlTemplate: string, css: string): string {
    return `<style>${css}</style>\n${htmlTemplate}`;
  }

  validateOutput(output: CodeGenOutput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (output.status === 'failed') {
      errors.push('Code generation failed: ' + (output.errors?.join(', ') ?? 'unknown error'));
    }

    if (output.components.length === 0) {
      errors.push('No components were generated');
    }

    const lowScoreComponents = output.matchScores.filter(s => s.score < this.config.minMatchScore);
    if (lowScoreComponents.length > 0) {
      warnings.push(`${lowScoreComponents.length} components have match scores below threshold`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export { CssGenerator } from './CssGenerator';
export { HtmlGenerator } from './HtmlGenerator';
