// =============================================================================
// PremiumDesignOrchestrator — Orchestrates the premium design pipeline
// =============================================================================
// Flow: Capture target → Extract DesignDNA → Generate BrandDesignSystem CSS
//       → Layout blueprint → Component-rich HTML → Validate → Iterate CSS
//
// NEW PIPELINE (bridging existing sophisticated systems):
// 1. BrandDiscoveryService → screenshot + basic tokens
// 2. AIDesignAnalyzer → 180+ field DesignDNA (heroStyle, cardStyle, etc.)
// 3. BrandDesignSystemGenerator → 5-pass AI CSS (10-50KB production CSS)
// 4. LayoutEngine → component-rich layout blueprint
// 5. PremiumHtmlRenderer → visual components (timelines, grids, cards, etc.)
// 6. Validate → Refine CSS (small targeted fixes only)
//
// FALLBACK CHAIN: Each step falls back to the previous approach if it fails.

import { v4 as uuidv4 } from 'uuid';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BrandDiscoveryService } from '../design-analysis/BrandDiscoveryService';
import { AIDesignAnalyzer } from '../design-analysis/AIDesignAnalyzer';
import { BrandDesignSystemGenerator } from '../design-analysis/BrandDesignSystemGenerator';
import { LayoutEngine } from '../layout-engine/LayoutEngine';
import { PremiumHtmlRenderer } from './PremiumHtmlRenderer';
import { SemanticHtmlGenerator } from './SemanticHtmlGenerator';
import { AiCssGenerator } from './AiCssGenerator';
import { ScreenshotService } from './ScreenshotService';
import { DesignValidationService } from './DesignValidationService';
import { savePremiumDesign } from './designPersistence';
import { QUICK_EXPORT_CSS } from '../quickExportStylesheet';
import { generateComponentStyles } from '../publishing/renderer/ComponentStyles';
import type {
  PremiumDesignSession,
  PremiumDesignConfig,
  CrawledCssTokens,
  BusinessContext,
  DesignIteration,
  SavedPremiumDesign,
} from './types';
import type { BriefSection } from '../../types';
import type { StyleGuide } from '../../types/styleGuide';
import { StyleGuideCssGenerator } from './StyleGuideCssGenerator';

// =============================================================================
// CSS LAYER HELPER
// =============================================================================

/**
 * Wrap CSS in a @layer declaration so it has lower cascade priority than
 * unlayered styles. Extracts @import rules (which cannot appear inside @layer)
 * and places them before the layer block.
 *
 * Also strips !important declarations from the CSS. In CSS Cascade Layers,
 * !important rules have INVERTED priority: layered !important beats unlayered
 * normal styles. Since brand CSS may be AI-generated and contain !important,
 * we must strip them to ensure ComponentStyles (unlayered) always wins.
 */
function wrapInCssLayer(css: string, layerName: string): string {
  // Strip !important to prevent cascade inversion
  let cleaned = css.replace(/\s*!important/gi, '');

  const lines = cleaned.split('\n');
  const imports: string[] = [];
  const rest: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('@import')) {
      imports.push(line);
    } else {
      rest.push(line);
    }
  }

  const importsBlock = imports.length > 0 ? imports.join('\n') + '\n\n' : '';
  return `${importsBlock}@layer ${layerName} {\n${rest.join('\n')}\n}`;
}

export type ProgressCallback = (session: PremiumDesignSession) => void;

export interface PersistenceOptions {
  supabase: SupabaseClient;
  userId: string;
  topicId: string;
  briefId?: string;
  mapId?: string;
}

// =============================================================================
// DESIGN DNA CACHE
// =============================================================================

interface CachedDesignData {
  designDna: NonNullable<PremiumDesignSession['designDna']>;
  brandDesignSystem: NonNullable<PremiumDesignSession['brandDesignSystem']>;
  timestamp: number;
}

const designDnaCache = new Map<string, CachedDesignData>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// =============================================================================
// ORCHESTRATOR
// =============================================================================

/**
 * Orchestrates the full premium design pipeline.
 * Uses the sophisticated existing design-analysis and layout-engine systems
 * instead of simplified parallel implementations.
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
   */
  async run(
    articleMarkdown: string,
    title: string,
    targetUrl: string,
    onProgress?: ProgressCallback,
    businessContext?: BusinessContext,
    persistence?: PersistenceOptions,
    structuredOutline?: BriefSection[],
    approvedStyleGuide?: StyleGuide
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

      // ── Step 2: Deep brand extraction (DesignDNA + BrandDesignSystem) ──
      // Check cache first
      const cacheKey = getCacheKey(targetUrl);
      const cached = designDnaCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        console.log('[PremiumDesignOrchestrator] Using cached DesignDNA + BrandDesignSystem for:', cacheKey);
        session.designDna = cached.designDna;
        session.brandDesignSystem = cached.brandDesignSystem;
      } else {
        // Extract DesignDNA (180+ fields) from screenshot
        try {
          console.log('[PremiumDesignOrchestrator] Extracting DesignDNA from target screenshot...');
          const analyzerProvider = this.config.aiProvider === 'openai' ? 'gemini' : this.config.aiProvider;
          const analyzer = new AIDesignAnalyzer({
            provider: analyzerProvider as 'gemini' | 'anthropic',
            apiKey: this.config.apiKey,
            model: this.config.model,
          });
          const dnaResult = await analyzer.extractDesignDNA(report.screenshotBase64, targetUrl);
          session.designDna = dnaResult.designDna;
          console.log('[PremiumDesignOrchestrator] DesignDNA extracted:', {
            heroStyle: session.designDna.layout?.heroStyle,
            cardStyle: session.designDna.shapes?.cardStyle,
            personality: session.designDna.personality?.overall,
            gradientUsage: session.designDna.effects?.gradients?.usage,
          });
        } catch (dnaErr) {
          console.warn('[PremiumDesignOrchestrator] DesignDNA extraction failed, using minimal DNA from tokens:', dnaErr);
          // Construct minimal DesignDNA from crawled tokens (fallback)
          session.designDna = this.buildMinimalDesignDna(session.crawledCssTokens);
        }

        // Generate BrandDesignSystem CSS (5-pass AI generation)
        try {
          console.log('[PremiumDesignOrchestrator] Generating BrandDesignSystem CSS...');
          const analyzerProvider = this.config.aiProvider === 'openai' ? 'gemini' : this.config.aiProvider;
          const cssGen = new BrandDesignSystemGenerator({
            provider: analyzerProvider as 'gemini' | 'anthropic',
            apiKey: this.config.apiKey,
            model: this.config.model,
          });
          session.brandDesignSystem = await cssGen.generate(
            session.designDna!,
            cacheKey,
            targetUrl,
            report.screenshotBase64,
            report.googleFontsUrl
          );
          console.log('[PremiumDesignOrchestrator] BrandDesignSystem generated:',
            session.brandDesignSystem.compiledCss.length, 'chars CSS');

          // Cache the results
          designDnaCache.set(cacheKey, {
            designDna: session.designDna!,
            brandDesignSystem: session.brandDesignSystem,
            timestamp: Date.now(),
          });
        } catch (cssGenErr) {
          console.warn('[PremiumDesignOrchestrator] BrandDesignSystem generation failed, will use legacy CSS:', cssGenErr);
          session.brandDesignSystem = undefined;
        }
      }

      // ── Step 3: Generate layout blueprint + component-rich HTML ──
      let usedPremiumHtml = false;
      try {
        if (session.designDna) {
          console.log('[PremiumDesignOrchestrator] Generating layout blueprint...');
          session.layoutBlueprint = LayoutEngine.generateBlueprint(
            articleMarkdown,
            structuredOutline,
            session.designDna,
            { mainIntent: businessContext?.articlePurpose }
          );
          console.log('[PremiumDesignOrchestrator] Layout blueprint generated:',
            session.layoutBlueprint.sections.length, 'sections,',
            session.layoutBlueprint.sections.map(s => s.component.primaryComponent).filter((v, i, a) => a.indexOf(v) === i).join(', '));

          // Render component-rich HTML
          session.articleHtml = PremiumHtmlRenderer.render(
            session.layoutBlueprint,
            articleMarkdown,
            title,
            session.designDna,
            businessContext
          );
          usedPremiumHtml = true;
          console.log('[PremiumDesignOrchestrator] Component-rich HTML generated:', session.articleHtml.length, 'chars');
        }
      } catch (layoutErr) {
        console.warn('[PremiumDesignOrchestrator] LayoutEngine/PremiumHtmlRenderer failed, falling back to SemanticHtmlGenerator:', layoutErr);
      }

      // Fallback to SemanticHtmlGenerator
      if (!usedPremiumHtml) {
        session.articleHtml = this.htmlGenerator.generate(articleMarkdown, title, businessContext, structuredOutline);
      }
      emit();

      // ── Step 4: CSS → Render → Validate → Iterate ──
      // CRITICAL: ComponentStyles CSS provides ALL visual styling for component
      // class names (.section, .prose, .feature-grid, .step-list, .faq-accordion,
      // .timeline, .card, .cta-banner, etc.) used by PremiumHtmlRenderer.
      // It must NEVER be lost or sent to AI for refinement.
      //
      // Strategy: Track brandCss separately. Only send brandCss to AI for
      // refinement. Always assemble: currentCss = brandCss + componentStylesCss.
      const componentStylesCss = this.generateComponentStylesCss(session.designDna);
      let currentBrandCss = '';
      let currentCss = '';

      for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
        session.currentIteration = iteration;
        const startTime = Date.now();

        session.status = iteration === 1 ? 'generating-css' : 'iterating';
        emit();

        if (iteration === 1) {
          // First iteration: choose CSS source
          if (approvedStyleGuide) {
            // PRIMARY PATH: Use real CSS from approved style guide elements
            console.log('[PremiumDesignOrchestrator] Using approved style guide CSS (' +
              approvedStyleGuide.elements.filter(e => e.approvalStatus === 'approved').length + ' approved elements)');
            currentBrandCss = StyleGuideCssGenerator.generate(approvedStyleGuide);
          } else if (session.brandDesignSystem) {
            // Secondary: use BrandDesignSystem CSS
            currentBrandCss = this.cssGenerator.getInitialCssFromBrandSystem(
              session.brandDesignSystem,
              session.crawledCssTokens.googleFontsUrl
            );
          } else {
            // Legacy fallback
            currentBrandCss = await this.cssGenerator.generateInitialCssLegacy(
              session.targetScreenshot,
              session.crawledCssTokens,
              session.articleHtml,
              businessContext
            );
          }
        } else {
          // Subsequent iterations: refine ONLY the brand CSS (NOT ComponentStyles)
          // ComponentStyles is immutable production CSS — never send to AI
          const lastIteration = session.iterations[session.iterations.length - 1];
          currentBrandCss = await this.cssGenerator.refineCss(
            currentBrandCss,
            session.targetScreenshot,
            lastIteration.screenshotBase64,
            lastIteration.validationResult,
            session.articleHtml,
            session.crawledCssTokens,
            session.designDna
          );
        }

        // Always assemble: brand CSS (layered) + ComponentStyles (unlayered = highest priority)
        // CSS @layer ensures ComponentStyles ALWAYS wins over brand CSS regardless of
        // selector specificity. BrandDesignSystemGenerator generates CSS targeting the same
        // selectors (.section, .article-header, .feature-grid, etc.) and may use higher-
        // specificity selectors that would otherwise override ComponentStyles.
        const layeredBrandCss = wrapInCssLayer(currentBrandCss, 'brand');
        currentCss = layeredBrandCss + '\n\n' + componentStylesCss;
        console.log('[PremiumDesignOrchestrator] CSS assembled (iteration ' + iteration + '):', {
          brandCssLength: currentBrandCss.length,
          componentStylesLength: componentStylesCss.length,
          totalCssLength: currentCss.length,
        });

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
          await new Promise(resolve => setTimeout(resolve, 1000));
          outputScreenshot = await this.screenshotService.captureRenderedOutput(
            session.articleHtml,
            currentCss
          );
        }

        // Validate (now with DesignDNA context)
        session.status = 'validating';
        emit();

        const validationResult = await this.validationService.validate(
          session.targetScreenshot,
          outputScreenshot,
          session.crawledCssTokens,
          currentCss,
          session.designDna
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
      session.finalHtml = this.buildFinalDocument(
        session.articleHtml,
        session.finalCss,
        title,
        session.crawledCssTokens.googleFontsUrl
      );
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
        session.articleHtml || this.htmlGenerator.generate(articleMarkdown, title, businessContext, structuredOutline),
        QUICK_EXPORT_CSS,
        title,
        session.crawledCssTokens.googleFontsUrl
      );
      emit();

      return session;
    }
  }

  /**
   * Accept the current design early (stop iterations).
   */
  buildFinalFromIteration(session: PremiumDesignSession, iterationIndex?: number): string {
    const idx = iterationIndex ?? session.iterations.length - 1;
    const iteration = session.iterations[idx];
    if (!iteration) return session.finalHtml;

    return this.buildFinalDocument(session.articleHtml, iteration.css, '', session.crawledCssTokens.googleFontsUrl);
  }

  /**
   * Clear the DesignDNA + BrandDesignSystem cache for a specific URL.
   * Called when user clicks "Refresh brand analysis".
   */
  static clearCache(targetUrl: string): void {
    const cacheKey = getCacheKey(targetUrl);
    designDnaCache.delete(cacheKey);
    console.log('[PremiumDesignOrchestrator] Cache cleared for:', cacheKey);
  }

  /**
   * Clear the entire cache.
   */
  static clearAllCache(): void {
    designDnaCache.clear();
    console.log('[PremiumDesignOrchestrator] All cache cleared');
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Generate ComponentStyles CSS with brand colors from DesignDNA.
   * This CSS provides the visual styling for all component class names
   * (.section, .prose, .feature-grid, .step-list, .faq-accordion, etc.)
   * used by PremiumHtmlRenderer.
   */
  private generateComponentStylesCss(designDna?: NonNullable<PremiumDesignSession['designDna']>): string {
    if (!designDna) {
      return generateComponentStyles();
    }

    return generateComponentStyles({
      primaryColor: designDna.colors?.primary?.hex,
      primaryDark: designDna.colors?.primaryDark?.hex,
      secondaryColor: designDna.colors?.secondary?.hex,
      accentColor: designDna.colors?.accent?.hex,
      textColor: designDna.colors?.neutrals?.darkest || '#1f2937',
      textMuted: designDna.colors?.neutrals?.medium || '#6b7280',
      backgroundColor: '#ffffff',
      surfaceColor: designDna.colors?.neutrals?.lightest || '#f9fafb',
      borderColor: designDna.colors?.neutrals?.light || '#e5e7eb',
      headingFont: designDna.typography?.headingFont?.family || 'system-ui, sans-serif',
      bodyFont: designDna.typography?.bodyFont?.family || 'system-ui, sans-serif',
      radiusSmall: designDna.shapes?.borderRadius?.small || '4px',
      radiusMedium: designDna.shapes?.borderRadius?.medium || '8px',
      radiusLarge: designDna.shapes?.borderRadius?.large || '16px',
      personality: designDna.personality?.overall as any,
    });
  }

  /**
   * Capture target website using BrandDiscoveryService.
   * Routes through Supabase fetch-proxy to avoid CORS when proxyConfig is provided.
   */
  private async captureTarget(url: string) {
    if (!this.config.apifyToken) {
      throw new Error('Apify API token is required for website capture. Add it in Settings.');
    }
    return BrandDiscoveryService.analyze(url, this.config.apifyToken, this.config.proxyConfig);
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
      googleFontsUrl: report.googleFontsUrl || null,
    };
  }

  /**
   * Build minimal DesignDNA from CrawledCssTokens when AIDesignAnalyzer fails.
   */
  private buildMinimalDesignDna(tokens: CrawledCssTokens): NonNullable<PremiumDesignSession['designDna']> {
    const primary = tokens.colors.find(c => c.usage === 'primary')?.hex || '#3b82f6';
    const secondary = tokens.colors.find(c => c.usage === 'secondary')?.hex || '#1f2937';
    const accent = tokens.colors.find(c => c.usage === 'accent')?.hex || primary;
    const bg = tokens.colors.find(c => c.usage === 'background')?.hex || '#ffffff';
    const headingFont = tokens.fonts.find(f => f.usage === 'heading')?.family || 'system-ui';
    const bodyFont = tokens.fonts.find(f => f.usage === 'body')?.family || 'system-ui';

    return {
      colors: {
        primary: { hex: primary, usage: 'primary', confidence: 80 },
        primaryLight: { hex: primary, usage: 'light variant', confidence: 50 },
        primaryDark: { hex: secondary, usage: 'dark variant', confidence: 50 },
        secondary: { hex: secondary, usage: 'secondary', confidence: 70 },
        accent: { hex: accent, usage: 'accent', confidence: 70 },
        neutrals: { darkest: '#111827', dark: '#374151', medium: '#6b7280', light: '#d1d5db', lightest: '#f9fafb' },
        semantic: { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
        harmony: 'monochromatic' as const,
        dominantMood: 'corporate',
        contrastLevel: 'medium' as const,
      },
      typography: {
        headingFont: { family: headingFont, fallback: 'sans-serif', weight: 700, style: 'sans-serif', character: 'modern' },
        bodyFont: { family: bodyFont, fallback: 'sans-serif', weight: 400, style: 'sans-serif', lineHeight: 1.6 },
        scaleRatio: 1.25,
        baseSize: '16px',
        headingCase: 'none' as const,
        headingLetterSpacing: 'normal',
        usesDropCaps: false,
        headingUnderlineStyle: 'none' as const,
        linkStyle: 'underline' as const,
      },
      spacing: {
        baseUnit: 16,
        density: 'comfortable' as const,
        sectionGap: 'moderate' as const,
        contentWidth: 'medium' as const,
        whitespacePhilosophy: 'balanced' as const,
      },
      shapes: {
        borderRadius: {
          style: 'rounded' as const,
          small: tokens.borderRadius[0] || '4px',
          medium: tokens.borderRadius[0] || '8px',
          large: '16px',
          full: '9999px',
        },
        buttonStyle: 'rounded' as const,
        cardStyle: 'subtle-shadow' as const,
        inputStyle: 'bordered' as const,
      },
      effects: {
        shadows: {
          style: 'subtle' as const,
          cardShadow: tokens.shadows[0] || '0 1px 3px rgba(0,0,0,0.1)',
          buttonShadow: '0 1px 2px rgba(0,0,0,0.05)',
          elevatedShadow: '0 10px 25px rgba(0,0,0,0.15)',
        },
        gradients: {
          usage: 'subtle' as const,
          primaryGradient: `linear-gradient(135deg, ${primary}, ${secondary})`,
          heroGradient: `linear-gradient(135deg, ${bg} 0%, #f3f4f6 100%)`,
          ctaGradient: `linear-gradient(135deg, ${primary}, ${accent})`,
        },
        backgrounds: { usesPatterns: false, usesTextures: false, usesOverlays: false },
        borders: { style: 'subtle' as const, defaultColor: '#e5e7eb', accentBorderUsage: false },
      },
      decorative: {
        dividerStyle: 'line' as const,
        usesFloatingShapes: false,
        usesCornerAccents: false,
        usesWaveShapes: false,
        usesGeometricPatterns: false,
        iconStyle: 'outline' as const,
        decorativeAccentColor: primary,
      },
      layout: {
        gridStyle: 'fluid' as const,
        alignment: 'center' as const,
        heroStyle: 'contained' as const,
        cardLayout: 'grid' as const,
        ctaPlacement: 'section-end' as const,
        navigationStyle: 'standard' as const,
      },
      motion: {
        overall: 'subtle' as const,
        transitionSpeed: 'normal' as const,
        easingStyle: 'ease',
        hoverEffects: { buttons: 'darken' as const, cards: 'lift' as const, links: 'color' as const },
        scrollAnimations: false,
        parallaxEffects: false,
      },
      images: {
        treatment: 'natural' as const,
        frameStyle: 'rounded' as const,
        hoverEffect: 'none' as const,
        aspectRatioPreference: '16:9' as const,
      },
      componentPreferences: {
        preferredListStyle: 'bullets' as const,
        preferredCardStyle: 'elevated' as const,
        testimonialStyle: 'card' as const,
        faqStyle: 'accordion' as const,
        ctaStyle: 'button' as const,
      },
      personality: {
        overall: 'corporate' as const,
        formality: 3,
        energy: 3,
        warmth: 3,
        trustSignals: 'moderate' as const,
      },
      confidence: { overall: 40, colorsConfidence: 60, typographyConfidence: 50, layoutConfidence: 30 },
      analysisNotes: ['Built from crawled tokens — limited analysis'],
    };
  }

  /**
   * Build a self-contained HTML document with embedded CSS.
   */
  private buildFinalDocument(articleHtml: string, css: string, title: string, googleFontsUrl?: string | null): string {
    const fontsLink = googleFontsUrl
      ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="${googleFontsUrl}" rel="stylesheet">\n`
      : '';
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${title ? `<title>${title}</title>` : ''}
${fontsLink}<style>
${css}
</style>
</head>
<body>
${articleHtml}
</body>
</html>`;
  }
}
