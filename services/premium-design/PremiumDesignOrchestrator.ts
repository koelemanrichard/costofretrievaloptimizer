// =============================================================================
// PremiumDesignOrchestrator — Orchestrates the premium design pipeline
// =============================================================================
// Flow: Capture target → Generate HTML → AI CSS → Render → Validate → Iterate

import { v4 as uuidv4 } from 'uuid';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BrandDiscoveryService } from '../design-analysis/BrandDiscoveryService';
import { SemanticHtmlGenerator } from './SemanticHtmlGenerator';
import { AiCssGenerator } from './AiCssGenerator';
import { ScreenshotService } from './ScreenshotService';
import { DesignValidationService } from './DesignValidationService';
import { savePremiumDesign } from './designPersistence';
import { QUICK_EXPORT_CSS } from '../quickExportStylesheet';
import type {
  PremiumDesignSession,
  PremiumDesignConfig,
  CrawledCssTokens,
  BusinessContext,
  DesignIteration,
  SavedPremiumDesign,
} from './types';

export type ProgressCallback = (session: PremiumDesignSession) => void;

export interface PersistenceOptions {
  supabase: SupabaseClient;
  userId: string;
  topicId: string;
  briefId?: string;
  mapId?: string;
}

/**
 * Orchestrates the full premium design pipeline:
 * 1. Capture target website screenshot + CSS tokens
 * 2. Generate semantic HTML from article
 * 3. AI CSS generation from target screenshot
 * 4. Render + screenshot the output
 * 5. Validate against target
 * 6. Iterate if score < threshold
 */
export class PremiumDesignOrchestrator {
  private config: PremiumDesignConfig;
  private htmlGenerator: SemanticHtmlGenerator;
  private cssGenerator: AiCssGenerator;
  private screenshotService: ScreenshotService;
  private validationService: DesignValidationService;

  constructor(config: PremiumDesignConfig) {
    this.config = {
      targetScore: config.targetScore || 85,
      maxIterations: config.maxIterations || 3,
      ...config,
    };
    this.htmlGenerator = new SemanticHtmlGenerator();
    this.cssGenerator = new AiCssGenerator(this.config);
    this.screenshotService = new ScreenshotService();
    this.validationService = new DesignValidationService(this.config);
  }

  /**
   * Run the full design pipeline.
   *
   * @param articleMarkdown - The article content in markdown
   * @param title - Article title
   * @param targetUrl - URL of the target website to match
   * @param onProgress - Callback for progress updates
   * @param businessContext - Optional business context for CTA/industry-specific styling
   * @returns The completed design session
   */
  async run(
    articleMarkdown: string,
    title: string,
    targetUrl: string,
    onProgress?: ProgressCallback,
    businessContext?: BusinessContext,
    persistence?: PersistenceOptions
  ): Promise<PremiumDesignSession & { savedDesign?: SavedPremiumDesign | null }> {
    const session: PremiumDesignSession = {
      id: uuidv4(),
      articleHtml: '',
      targetUrl,
      targetScreenshot: '',
      crawledCssTokens: { colors: [], fonts: [], cssVariables: {}, borderRadius: [], shadows: [], spacingPatterns: [] },
      iterations: [],
      currentIteration: 0,
      status: 'capturing',
      finalScore: 0,
      finalCss: '',
      finalHtml: '',
    };

    const emit = () => onProgress?.(structuredClone(session));

    try {
      // ── Step 1: Capture target website ──
      session.status = 'capturing';
      emit();

      const report = await this.captureTarget(targetUrl);
      session.targetScreenshot = report.screenshotBase64;
      session.crawledCssTokens = this.convertToCrawledTokens(report);
      emit();

      // ── Step 2: Generate semantic HTML ──
      session.articleHtml = this.htmlGenerator.generate(articleMarkdown, title, businessContext);
      emit();

      // ── Step 3–6: Generate CSS → Render → Validate → Iterate ──
      let currentCss = '';

      for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
        session.currentIteration = iteration;
        const startTime = Date.now();

        // Generate or refine CSS
        session.status = iteration === 1 ? 'generating-css' : 'iterating';
        emit();

        if (iteration === 1) {
          currentCss = await this.cssGenerator.generateInitialCss(
            session.targetScreenshot,
            session.crawledCssTokens,
            session.articleHtml,
            businessContext
          );
        } else {
          const lastIteration = session.iterations[session.iterations.length - 1];
          currentCss = await this.cssGenerator.refineCss(
            currentCss,
            session.targetScreenshot,
            lastIteration.screenshotBase64,
            lastIteration.validationResult,
            session.articleHtml
          );
        }

        // Render output
        session.status = 'rendering';
        emit();

        let outputScreenshot: string;
        try {
          outputScreenshot = await this.screenshotService.captureRenderedOutput(
            session.articleHtml,
            currentCss
          );
        } catch (err) {
          console.warn('[PremiumDesignOrchestrator] Screenshot failed, retrying:', err);
          // Retry once
          await new Promise(resolve => setTimeout(resolve, 1000));
          outputScreenshot = await this.screenshotService.captureRenderedOutput(
            session.articleHtml,
            currentCss
          );
        }

        // Validate
        session.status = 'validating';
        emit();

        const validationResult = await this.validationService.validate(
          session.targetScreenshot,
          outputScreenshot,
          session.crawledCssTokens,
          currentCss
        );

        const iterationResult: DesignIteration = {
          iteration,
          css: currentCss,
          screenshotBase64: outputScreenshot,
          validationResult,
          durationMs: Date.now() - startTime,
        };

        session.iterations.push(iterationResult);
        session.finalScore = validationResult.overallScore;
        session.finalCss = currentCss;
        emit();

        // Check threshold
        if (validationResult.passesThreshold || validationResult.overallScore >= this.config.targetScore) {
          break;
        }
      }

      // Build final HTML document
      session.finalHtml = this.buildFinalDocument(session.articleHtml, session.finalCss, title);
      session.status = 'complete';
      emit();

      // Save to database if persistence is configured
      let savedDesign: SavedPremiumDesign | null = null;
      if (persistence) {
        try {
          savedDesign = await savePremiumDesign(
            persistence.supabase,
            persistence.userId,
            persistence.topicId,
            session,
            { briefId: persistence.briefId, mapId: persistence.mapId }
          );
          if (savedDesign) {
            console.log('[PremiumDesignOrchestrator] Design saved, version:', savedDesign.version);
          }
        } catch (saveErr) {
          console.error('[PremiumDesignOrchestrator] Failed to persist design:', saveErr);
        }
      }

      return { ...session, savedDesign };
    } catch (err) {
      console.error('[PremiumDesignOrchestrator] Pipeline failed:', err);
      session.status = 'error';
      session.errorMessage = err instanceof Error ? err.message : String(err);

      // Fallback: return Quick Export version
      session.finalCss = QUICK_EXPORT_CSS;
      session.finalHtml = this.buildFinalDocument(
        session.articleHtml || this.htmlGenerator.generate(articleMarkdown, title, businessContext),
        QUICK_EXPORT_CSS,
        title
      );
      emit();

      return session;
    }
  }

  /**
   * Accept the current design early (stop iterations).
   * Called from UI when user clicks "Accept Current Design".
   */
  buildFinalFromIteration(session: PremiumDesignSession, iterationIndex?: number): string {
    const idx = iterationIndex ?? session.iterations.length - 1;
    const iteration = session.iterations[idx];
    if (!iteration) return session.finalHtml;

    return this.buildFinalDocument(session.articleHtml, iteration.css, '');
  }

  /**
   * Capture target website using BrandDiscoveryService.
   */
  private async captureTarget(url: string) {
    if (!this.config.apifyToken) {
      throw new Error('Apify API token is required for website capture. Add it in Settings.');
    }
    return BrandDiscoveryService.analyze(url, this.config.apifyToken);
  }

  /**
   * Convert BrandDiscoveryReport to our CrawledCssTokens format.
   */
  private convertToCrawledTokens(report: any): CrawledCssTokens {
    const findings = report.findings || {};
    const tokens = report.derivedTokens || {};

    const colors: CrawledCssTokens['colors'] = [];
    if (findings.primaryColor) colors.push({ hex: findings.primaryColor.value, usage: 'primary', source: findings.primaryColor.source });
    if (findings.secondaryColor) colors.push({ hex: findings.secondaryColor.value, usage: 'secondary', source: findings.secondaryColor.source });
    if (findings.accentColor) colors.push({ hex: findings.accentColor.value, usage: 'accent', source: findings.accentColor.source });
    if (findings.backgroundColor) colors.push({ hex: findings.backgroundColor.value, usage: 'background', source: findings.backgroundColor.source });

    // Add derived token colors
    if (tokens.colors) {
      if (tokens.colors.surface) colors.push({ hex: tokens.colors.surface, usage: 'surface', source: 'derived' });
      if (tokens.colors.text) colors.push({ hex: tokens.colors.text, usage: 'text', source: 'derived' });
      if (tokens.colors.textMuted) colors.push({ hex: tokens.colors.textMuted, usage: 'text-muted', source: 'derived' });
      if (tokens.colors.border) colors.push({ hex: tokens.colors.border, usage: 'border', source: 'derived' });
    }

    const fonts: CrawledCssTokens['fonts'] = [];
    if (findings.headingFont) fonts.push({ family: findings.headingFont.value, weight: tokens.typography?.headingWeight || 'bold', usage: 'heading' });
    if (findings.bodyFont) fonts.push({ family: findings.bodyFont.value, weight: '400', usage: 'body' });

    return {
      colors,
      fonts,
      cssVariables: {},
      borderRadius: findings.borderRadius ? [findings.borderRadius.value] : [],
      shadows: findings.shadowStyle ? [findings.shadowStyle.value] : [],
      spacingPatterns: [],
    };
  }

  /**
   * Build a self-contained HTML document with embedded CSS.
   */
  private buildFinalDocument(articleHtml: string, css: string, title: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${title ? `<title>${title}</title>` : ''}
<style>
${css}
</style>
</head>
<body>
${articleHtml}
</body>
</html>`;
  }
}
