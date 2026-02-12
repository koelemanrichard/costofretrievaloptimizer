/**
 * Style & Publish Modal
 *
 * 4-step modal for styled content publishing:
 * 1. Brand Intelligence - One-click brand detection with AI Vision
 *    - Integrates Phase 1 Discovery (ScreenshotCapture + VisualAnalyzer)
 *    - Integrates Phase 2 CodeGen for component CSS/HTML generation
 * 2. Layout Intelligence - AI layout decisions with section-by-section breakdown
 *    - Integrates Phase 3 Intelligence for semantic design decisions
 * 3. Preview - Live preview with brand validation
 *    - Integrates Phase 4 Validation with QualityDashboard
 * 4. Publish - WordPress settings and publish
 *
 * @module components/publishing/StylePublishModal
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppState } from '../../state/appState';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getSupabaseClient } from '../../services/supabaseClient';
import { BrandIntelligenceStep } from './steps/BrandIntelligenceStep';
import { LayoutIntelligenceStep } from './steps/LayoutIntelligenceStep';
import { PreviewStep } from './steps/PreviewStep';
import { PublishOptionsStep } from './steps/PublishOptionsStep';
import { useDesignInheritance } from '../../hooks/useDesignInheritance';
import { useBrandReplicationPipeline } from '../../hooks/useBrandReplicationPipeline';
// Brand Replication UI Components
import { ComponentGallery, SectionDesigner, QualityDashboard } from '../brand-replication';
import { LayoutEngine, type LayoutBlueprintOutput } from '../../services/layout-engine/LayoutEngine';
import type { LayoutBlueprint as LayoutEngineBlueprint, BlueprintSection } from '../../services/layout-engine/types';
import type { DesignDNA, BrandDesignSystem } from '../../types/designDna';
import type {
  DiscoveryOutput,
  CodeGenOutput,
  IntelligenceOutput,
  ValidationOutput,
  BrandComponent,
  DiscoveredComponent,
  SectionDesignDecision,
  ArticleSection,
} from '../../services/brand-replication';
import type {
  StylePublishStep,
  PublishingStyle,
  DesignTokens,
  LayoutConfiguration,
  StyledContentOutput,
  ContentTypeTemplate,
} from '../../types/publishing';
import type { EnrichedTopic, ContentBrief, TopicalMap } from '../../types';
import type { BrandKit } from '../../types/business';
import {
  createInMemoryStyle,
  brandKitToDesignTokens,
} from '../../services/publishing/styleConfigService';
import {
  createInMemoryLayout,
} from '../../services/publishing/layoutConfigService';
import { suggestTemplate } from '../../config/publishingTemplates';
import { assemblePage, type PageTemplate } from '../../services/publishing/pageAssembler';
import type { DesignPersonalityId } from '../../config/designTokens/personalities';
import {
  generateBlueprintHeuristicV2,
  analyzeBlueprintQuality,
  applyLearnedPreferences,
  getStylePreferenceSummary,
  getLearnedPreferences,
  initPatternLearningClient,
  renderBlueprint,
  initBlueprintSupabase,
  upsertProjectBlueprint,
  upsertTopicalMapBlueprint,
  getProjectBlueprint as fetchProjectBlueprint,
  getTopicalMapBlueprint as fetchTopicalMapBlueprint,
  type LayoutBlueprint,
  type ProjectBlueprint,
  type TopicalMapBlueprint,
  type TopicalMapBlueprintRow,
  type ProjectBlueprintRow,
  type LearnedPreferences,
} from '../../services/publishing';
import {
  initBrandDesignSystemStorage,
  saveDesignDNA,
  getDesignDNA,
  saveBrandDesignSystem,
  getBrandDesignSystem,
} from '../../services/design-analysis/brandDesignSystemStorage';
import { renderContent } from '../../services/publishing/renderer';
import { htmlToArticleContent } from '../../services/publishing/renderer/contentAdapter';
import { ComponentLibrary } from '../../services/brand-extraction/ComponentLibrary';

// Map ContentTypeTemplate to PageTemplate
function mapTemplateToPageTemplate(template: ContentTypeTemplate): PageTemplate {
  const mapping: Record<ContentTypeTemplate, PageTemplate> = {
    'blog-article': 'blog-article',
    'landing-page': 'landing-page',
    'ecommerce-product': 'product-page',
    'ecommerce-category': 'landing-page',
    'service-page': 'service-page',
  };
  return mapping[template] || 'blog-article';
}

// ============================================================================
// Types
// ============================================================================

export interface StylePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: EnrichedTopic;
  articleDraft: string;
  brief?: ContentBrief;
  brandKit?: BrandKit;
  topicalMap?: TopicalMap;
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectId?: string;
  onPublishSuccess?: () => void;
  asPage?: boolean;
}

interface StepInfo {
  id: StylePublishStep;
  label: string;
  icon: string;
}

// ============================================================================
// Constants
// ============================================================================

const STEPS: StepInfo[] = [
  { id: 'brand', label: 'Brand', icon: '🎨' },
  { id: 'layout', label: 'Layout', icon: '🧠' },
  { id: 'preview', label: 'Preview', icon: '👁️' },
  { id: 'publish', label: 'Publish', icon: '🚀' },
];

// ============================================================================
// Component
// ============================================================================

export const StylePublishModal: React.FC<StylePublishModalProps> = ({
  isOpen,
  onClose,
  topic,
  articleDraft,
  brief,
  brandKit,
  topicalMap,
  supabaseUrl,
  supabaseAnonKey,
  projectId,
  onPublishSuccess,
  asPage,
}) => {
  // Get app state for API keys
  const { state, dispatch } = useAppState();

  // State
  const [currentStep, setCurrentStep] = useState<StylePublishStep>('brand');
  const [style, setStyle] = useState<PublishingStyle | null>(null);
  const [layout, setLayout] = useState<LayoutConfiguration | null>(null);
  const [blueprint, setBlueprint] = useState<LayoutBlueprint | null>(null);
  const [preview, setPreview] = useState<StyledContentOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBlueprintGenerating, setIsBlueprintGenerating] = useState(false);
  const [detectionSuccess, setDetectionSuccess] = useState<string | null>(null);
  const [blueprintQuality, setBlueprintQuality] = useState<{
    coherence: {
      score: number;
      issues: {
        type: 'spacing' | 'background' | 'emphasis' | 'weight' | 'divider';
        severity: 'warning' | 'error';
        message: string;
        sectionIndex: number;
      }[];
      suggestions: {
        sectionIndex: number;
        property: string;
        currentValue: unknown;
        suggestedValue: unknown;
        reason: string;
      }[];
    };
    report: string;
    overallScore: number;
  } | null>(null);
  const [learnedPreferences, setLearnedPreferences] = useState<LearnedPreferences | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [isApplyingStyle, setIsApplyingStyle] = useState(false);
  const [projectBlueprint, setProjectBlueprint] = useState<ProjectBlueprint | null>(null);
  const [topicalMapBlueprint, setTopicalMapBlueprint] = useState<TopicalMapBlueprint | null>(null);
  const [isRegeneratingHierarchy, setIsRegeneratingHierarchy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [personalityId, setPersonalityId] = useState<DesignPersonalityId>('corporate-professional');

  // Brand detection result state (for passing to Preview step)
  const [detectedDesignDna, setDetectedDesignDna] = useState<DesignDNA | null>(null);
  const [detectedDesignSystem, setDetectedDesignSystem] = useState<BrandDesignSystem | null>(null);
  const [detectedScreenshot, setDetectedScreenshot] = useState<string | null>(null);
  // Extracted components with literal HTML/CSS from target site (for BrandAwareComposer)
  const [extractedComponents, setExtractedComponents] = useState<import('../../types/brandExtraction').ExtractedComponent[]>([]);

  // Saved brand extraction data (URL suggestions + components from DB)
  const [savedComponents, setSavedComponents] = useState<import('../../types/brandExtraction').ExtractedComponent[]>([]);
  const [savedUrlSuggestions, setSavedUrlSuggestions] = useState<import('../../services/brand-extraction/UrlDiscoveryService').UrlSuggestion[]>([]);

  // Saved brand data state (persistence)
  const [savedBrandDataLoaded, setSavedBrandDataLoaded] = useState(false);
  const [isLoadingSavedBrand, setIsLoadingSavedBrand] = useState(false);
  const [savedBrandSourceUrl, setSavedBrandSourceUrl] = useState<string | null>(null);
  const [savedBrandExtractedAt, setSavedBrandExtractedAt] = useState<string | null>(null);
  const [skipBrandReload, setSkipBrandReload] = useState(false); // Flag to skip reload during regeneration

  // Layout Engine state (for new LayoutIntelligenceStep)
  const [layoutEngineBlueprint, setLayoutEngineBlueprint] = useState<LayoutEngineBlueprint | null>(null);
  const [isLayoutEngineGenerating, setIsLayoutEngineGenerating] = useState(false);
  const [layoutEngineError, setLayoutEngineError] = useState<string | null>(null);

  // Brand validation state (for Preview step)
  const [brandMatchScore, setBrandMatchScore] = useState<number | undefined>(undefined);
  const [brandAssessment, setBrandAssessment] = useState<string | undefined>(undefined);

  // Rendering metadata state (for Preview step notifications)
  const [renderingMetadata, setRenderingMetadata] = useState<{
    rendererUsed: string;
    fallbackReason?: string;
    brandScore?: number;
    unresolvedImageCount?: number;
    // Clear user messaging
    renderMessage?: string;
    renderReason?: string;
    renderLevel?: 'info' | 'warning' | 'error';
    renderDetails?: {
      brandExtractionUsed?: boolean;
      layoutBlueprintUsed?: boolean;
      aiLayoutUsed?: boolean;
      compiledCssUsed?: boolean;
      componentsDetected?: number;
      fallbackTriggered?: boolean;
      semanticLayoutUsed?: boolean;
    };
    pipelineTelemetry?: import('../../types/publishing').PipelineTelemetry;
  } | null>(null);

  // Semantic Layout Engine toggle - AI-driven layout intelligence
  const [useSemanticLayoutEngine, setUseSemanticLayoutEngine] = useState(false);

  // Renderer path selector - user controls which rendering engine to use
  const [rendererPath, setRendererPath] = useState<'auto' | 'brand-templates' | 'clean-components'>('auto');
  const rendererPathInitialRef = useRef(true); // Skip auto-regenerate on mount

  // ============================================================================
  // Brand Replication Pipeline State (Feature Flag: ENABLE_BRAND_REPLICATION)
  // ============================================================================
  // This integrates the new 4-phase brand replication pipeline:
  // - Phase 1: Discovery (ScreenshotCapture + VisualAnalyzer)
  // - Phase 2: CodeGen (CSS/HTML generation for components)
  // - Phase 3: Intelligence (Section design decisions)
  // - Phase 4: Validation (Quality scoring with wow-factor checklist)
  const [enableBrandReplication, setEnableBrandReplication] = useState(false);
  const [pipelineDiscoveryOutput, setPipelineDiscoveryOutput] = useState<DiscoveryOutput | null>(null);
  const [pipelineCodeGenOutput, setPipelineCodeGenOutput] = useState<CodeGenOutput | null>(null);
  const [pipelineIntelligenceOutput, setPipelineIntelligenceOutput] = useState<IntelligenceOutput | null>(null);
  const [pipelineValidationOutput, setPipelineValidationOutput] = useState<ValidationOutput | null>(null);
  const [showComponentGallery, setShowComponentGallery] = useState(false);
  const [showSectionDesigner, setShowSectionDesigner] = useState(false);
  const [showQualityDashboard, setShowQualityDashboard] = useState(false);
  const [selectedPipelineComponentId, setSelectedPipelineComponentId] = useState<string | undefined>(undefined);
  const [selectedPipelineSectionId, setSelectedPipelineSectionId] = useState<string | undefined>(undefined);

  // Get API keys and AI provider from app state (must be defined before useCallback hooks that reference them)
  const aiProvider = state.businessInfo?.aiProvider || 'gemini';
  const apifyToken = state.businessInfo?.apifyToken || '';
  const geminiApiKey = state.businessInfo?.geminiApiKey || localStorage.getItem('gemini_api_key') || '';
  const anthropicApiKey = state.businessInfo?.anthropicApiKey || localStorage.getItem('anthropic_api_key') || '';
  const openAiApiKey = state.businessInfo?.openAiApiKey || localStorage.getItem('openai_api_key') || '';

  // Get the appropriate API key based on the user's selected provider
  const activeAiApiKey = aiProvider === 'anthropic' ? anthropicApiKey
    : aiProvider === 'openai' ? openAiApiKey
    : geminiApiKey; // Default to Gemini for gemini, perplexity, openrouter

  // Brand Replication Pipeline Hook
  // Provides methods to run each phase and access outputs
  const brandReplicationPipeline = useBrandReplicationPipeline({
    aiProvider: aiProvider === 'anthropic' ? 'anthropic' : 'gemini',
    apiKey: aiProvider === 'anthropic' ? anthropicApiKey : geminiApiKey,
    model: state.businessInfo?.aiModel,
    enabled: enableBrandReplication && !!(aiProvider === 'anthropic' ? anthropicApiKey : geminiApiKey),
  });

  // Sync pipeline outputs to local state for UI rendering
  useEffect(() => {
    if (brandReplicationPipeline.state.discoveryOutput) {
      setPipelineDiscoveryOutput(brandReplicationPipeline.state.discoveryOutput);
    }
    if (brandReplicationPipeline.state.codeGenOutput) {
      setPipelineCodeGenOutput(brandReplicationPipeline.state.codeGenOutput);
    }
    if (brandReplicationPipeline.state.intelligenceOutput) {
      setPipelineIntelligenceOutput(brandReplicationPipeline.state.intelligenceOutput);
    }
    if (brandReplicationPipeline.state.validationOutput) {
      setPipelineValidationOutput(brandReplicationPipeline.state.validationOutput);
    }
  }, [
    brandReplicationPipeline.state.discoveryOutput,
    brandReplicationPipeline.state.codeGenOutput,
    brandReplicationPipeline.state.intelligenceOutput,
    brandReplicationPipeline.state.validationOutput,
  ]);

  // Design inheritance - load project/map level settings
  const supabaseClient = useMemo(
    () => getSupabaseClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey]
  );

  const designInheritance = useDesignInheritance({
    supabase: supabaseClient,
    projectId: projectId || '',
    topicalMapId: topic.map_id,
    // Skip initial load - design_profiles tables may not exist yet
    // User can manually reload when design inheritance feature is deployed
    skipInitialLoad: true,
  });

  // Apply inherited tokens to style when loaded
  useEffect(() => {
    if (designInheritance.tokens && style && !designInheritance.isLoading) {
      // Only apply if we don't already have custom tokens set
      const hasCustomTokens = style.designTokens.colors.primary !== '#3B82F6';
      if (!hasCustomTokens) {
        console.log('[Style & Publish] Applying inherited design tokens');
        setStyle({
          ...style,
          designTokens: designInheritance.tokens,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }, [designInheritance.tokens, designInheritance.isLoading]);

  // Initialize style and layout on open
  useEffect(() => {
    if (isOpen && !style) {
      // Create initial style from BrandKit or default
      const initialStyle = createInMemoryStyle(brandKit, 'Project Style');
      setStyle(initialStyle);

      // Suggest template based on content
      const suggestedTemplate = suggestTemplate(articleDraft, topic.title);
      const initialLayout = createInMemoryLayout(suggestedTemplate);
      setLayout(initialLayout);
    }
  }, [isOpen, style, brandKit, articleDraft, topic.title]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('brand');
      setPreview(null);
      setErrors([]);
      // Don't reset brand data on close - we want to preserve it for reuse
      // Only reset the "loaded" flag so we check for updates next time
      setSavedBrandDataLoaded(false);
      // Reset skip flag so next open will load saved data
      setSkipBrandReload(false);
      // Clear saved extraction data so it reloads fresh on next open
      setSavedComponents([]);
      setSavedUrlSuggestions([]);
      // Reset brand replication pipeline state
      setPipelineDiscoveryOutput(null);
      setPipelineCodeGenOutput(null);
      setPipelineIntelligenceOutput(null);
      setPipelineValidationOutput(null);
      setShowComponentGallery(false);
      setShowSectionDesigner(false);
      setShowQualityDashboard(false);
      setSelectedPipelineComponentId(undefined);
      setSelectedPipelineSectionId(undefined);
      if (brandReplicationPipeline.reset) {
        brandReplicationPipeline.reset();
      }
    }
  }, [isOpen]);

  // Initialize blueprint storage and fetch existing blueprints
  useEffect(() => {
    if (!isOpen || !topic.map_id) return;

    const initAndFetch = async () => {
      try {
        // Initialize the blueprint storage client
        initBlueprintSupabase(supabaseUrl, supabaseAnonKey);

        // Fetch existing blueprints in parallel
        // Note: projectId is required for project blueprints, map_id for topical map blueprints
        const [projectBpRow, topicalMapBpRow] = await Promise.all([
          projectId ? fetchProjectBlueprint(projectId).catch(() => null) : Promise.resolve(null),
          fetchTopicalMapBlueprint(topic.map_id!).catch(() => null),
        ]);

        // Convert row data to blueprint objects if they exist
        if (projectBpRow) {
          setProjectBlueprint({
            projectId: projectBpRow.project_id,
            defaults: {
              visualStyle: projectBpRow.visual_style,
              pacing: projectBpRow.pacing,
              colorIntensity: projectBpRow.color_intensity,
              ctaStrategy: {
                positions: (projectBpRow.cta_positions || []) as any[],
                intensity: (projectBpRow.cta_intensity || 'moderate') as any,
                style: (projectBpRow.cta_style || 'banner') as any,
              },
            },
            componentPreferences: (projectBpRow.component_preferences || {}) as any,
            avoidComponents: (projectBpRow.avoid_components || []) as any[],
            reasoning: projectBpRow.ai_reasoning || '',
            generatedAt: projectBpRow.updated_at,
          });
        }

        if (topicalMapBpRow) {
          setTopicalMapBlueprint({
            topicalMapId: topicalMapBpRow.topical_map_id,
            projectId: topicalMapBpRow.project_id,
            defaults: {
              visualStyle: topicalMapBpRow.visual_style || undefined,
              pacing: topicalMapBpRow.pacing || undefined,
              colorIntensity: topicalMapBpRow.color_intensity || undefined,
              ctaStrategy: topicalMapBpRow.cta_positions ? {
                positions: (topicalMapBpRow.cta_positions || []) as any[],
                intensity: (topicalMapBpRow.cta_intensity || 'moderate') as any,
                style: (topicalMapBpRow.cta_style || 'banner') as any,
              } : undefined,
            },
            componentPreferences: (topicalMapBpRow.component_preferences || {}) as any,
            clusterSpecificRules: (topicalMapBpRow.cluster_rules || []) as any[],
            reasoning: topicalMapBpRow.ai_reasoning || '',
            generatedAt: topicalMapBpRow.updated_at,
          });
        }

        console.log('[Style & Publish] Fetched blueprints:', {
          hasProject: !!projectBpRow,
          hasTopicalMap: !!topicalMapBpRow,
        });
      } catch (error) {
        console.error('Error fetching blueprints:', error);
        // Don't show error to user - blueprints are optional
      }
    };

    initAndFetch();
  }, [isOpen, topic.map_id, projectId, supabaseUrl, supabaseAnonKey]);

  // Load saved brand data when modal opens
  useEffect(() => {
    if (!isOpen || !projectId || savedBrandDataLoaded || skipBrandReload) return;

    const loadSavedBrandData = async () => {
      setIsLoadingSavedBrand(true);
      try {
        // Initialize the brand storage client
        initBrandDesignSystemStorage(supabaseUrl, supabaseAnonKey);

        // Fetch saved Design DNA and Brand Design System
        const [savedDna, savedSystem] = await Promise.all([
          getDesignDNA(projectId).catch(() => null),
          getBrandDesignSystem(projectId).catch(() => null),
        ]);

        if (savedDna) {
          console.log('[Style & Publish] Loaded saved brand data:', {
            sourceUrl: savedDna.sourceUrl,
            extractedAt: savedDna.extractedAt,
            hasScreenshot: !!savedDna.screenshotBase64,
          });

          // Set the saved data
          setDetectedDesignDna(savedDna.designDna);
          setDetectedScreenshot(savedDna.screenshotBase64);
          setSavedBrandSourceUrl(savedDna.sourceUrl);
          setSavedBrandExtractedAt(savedDna.extractedAt);

          // Apply design tokens from saved DNA to style
          if (savedDna.designDna && style) {
            const dna = savedDna.designDna;
            const colors = dna?.colors || {} as typeof dna.colors;
            const neutrals = colors?.neutrals || {} as Record<string, string>;
            const typography = dna?.typography || {} as typeof dna.typography;

            const getColorHex = (color: { hex?: string } | string | undefined, fallback: string): string => {
              if (!color) return fallback;
              if (typeof color === 'string') return color;
              return color.hex || fallback;
            };

            const primaryHex = getColorHex(colors?.primary, '#3b82f6');
            const secondaryHex = getColorHex(colors?.secondary, '#1f2937');

            const newTokens = brandKitToDesignTokens({
              colors: {
                primary: primaryHex,
                secondary: secondaryHex,
                background: neutrals?.lightest || '#f9fafb',
                surface: neutrals?.light || '#f3f4f6',
                text: neutrals?.darkest || '#111827',
                textMuted: neutrals?.medium || '#6b7280',
                border: neutrals?.light || '#e5e7eb',
                textOnImage: '#ffffff',
                overlayGradient: `linear-gradient(135deg, ${primaryHex}, ${secondaryHex})`
              },
              fonts: {
                heading: typography?.headingFont?.family || 'system-ui',
                body: typography?.bodyFont?.family || 'system-ui'
              },
              logoPlacement: 'top-left',
              logoOpacity: 1,
              copyright: { holder: '' },
              heroTemplates: []
            });

            setStyle(prevStyle => {
              if (!prevStyle) return prevStyle;
              return {
                ...prevStyle,
                designTokens: { ...prevStyle.designTokens, ...newTokens },
                updatedAt: new Date().toISOString()
              };
            });
          }

          // Also set saved design system if available
          if (savedSystem) {
            console.log('[Style & Publish] Loaded saved design system:', {
              hasCompiledCss: !!savedSystem.compiledCss,
              compiledCssLength: savedSystem.compiledCss?.length || 0,
              brandName: savedSystem.brandName,
              designDnaHash: savedSystem.designDnaHash,
            });
            setDetectedDesignSystem(savedSystem);
          }
        }

        // Fetch saved components and URL suggestions in parallel
        const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
        const [componentsResult, urlSuggestionsResult] = await Promise.all([
          new ComponentLibrary(projectId).getAll().catch((err) => {
            console.warn('[Style & Publish] Failed to load saved components:', err);
            return [] as import('../../types/brandExtraction').ExtractedComponent[];
          }),
          (async () => {
            try {
              const { data, error: qErr } = await supabase
                .from('brand_url_suggestions')
                .select('*')
                .eq('project_id', projectId)
                .order('prominence_score', { ascending: false });
              if (qErr) {
                console.warn('[Style & Publish] Failed to load saved URL suggestions:', qErr);
                return [] as import('../../services/brand-extraction/UrlDiscoveryService').UrlSuggestion[];
              }
              return (data || []).map((row: { suggested_url: string; page_type: string; discovered_from: string; prominence_score: number | null; visual_context: string | null }) => ({
                url: row.suggested_url,
                pageType: row.page_type as 'homepage' | 'service' | 'article' | 'contact' | 'other',
                discoveredFrom: row.discovered_from as 'sitemap' | 'nav_link' | 'hero_cta' | 'featured_content' | 'footer',
                prominenceScore: (row.prominence_score ?? 0.5) * 100,
                visualContext: row.visual_context || '',
              }));
            } catch (err) {
              console.warn('[Style & Publish] Failed to load saved URL suggestions:', err);
              return [] as import('../../services/brand-extraction/UrlDiscoveryService').UrlSuggestion[];
            }
          })(),
        ]);

        if (componentsResult.length > 0) {
          setSavedComponents(componentsResult);
          // Also populate extractedComponents so the renderer has them immediately
          setExtractedComponents(componentsResult);
          console.log('[Style & Publish] Loaded', componentsResult.length, 'saved components');
        }
        if (urlSuggestionsResult.length > 0) {
          setSavedUrlSuggestions(urlSuggestionsResult);
          console.log('[Style & Publish] Loaded', urlSuggestionsResult.length, 'saved URL suggestions');
        }

        setSavedBrandDataLoaded(true);
      } catch (error) {
        console.error('[Style & Publish] Error loading saved brand data:', error);
        // Don't show error to user - saved data is optional
        setSavedBrandDataLoaded(true);
      } finally {
        setIsLoadingSavedBrand(false);
      }
    };

    loadSavedBrandData();
  }, [isOpen, projectId, savedBrandDataLoaded, skipBrandReload, supabaseUrl, supabaseAnonKey, style]);

  // Get current step index
  const currentStepIndex = useMemo(() =>
    STEPS.findIndex(s => s.id === currentStep),
    [currentStep]
  );

  // Generate blueprint using the heuristic approach
  const generateBlueprint = useCallback(async (styleOverride?: DesignTokens, personalityOverride?: DesignPersonalityId): Promise<typeof blueprint | undefined> => {
    if (!articleDraft) return undefined;
    setIsBlueprintGenerating(true);
    setErrors([]);

    try {
      // Use current or overridden values
      const activePersonality = personalityOverride || personalityId;

      // Extract full business context for intelligent design
      const businessContext = {
        domain: topicalMap?.business_info?.domain || '',
        projectName: (topicalMap?.business_info as any)?.projectName || topic.title,
        industry: (topicalMap?.business_info as any)?.industry || 'general',
        model: (topicalMap?.business_info as any)?.model || 'content',
        valueProp: (topicalMap?.business_info as any)?.valueProp || '',
        audience: (topicalMap?.business_info as any)?.audience || '',
        expertise: (topicalMap?.business_info as any)?.expertise || '',
        seedKeyword: (topicalMap?.business_info as any)?.seedKeyword || topic.title,
        language: (topicalMap?.business_info as any)?.language || 'en',
        targetMarket: (topicalMap?.business_info as any)?.targetMarket || '',
        aiProvider: (topicalMap?.business_info as any)?.aiProvider || 'gemini',
        aiModel: (topicalMap?.business_info as any)?.aiModel || '',
        supabaseUrl: supabaseUrl,
        supabaseAnonKey: supabaseAnonKey,
      };

      // Use passed styleOverride if provided, otherwise fall back to state
      const activeDesignTokens = styleOverride || style?.designTokens;

      console.log('[Style & Publish] generateBlueprint - using design tokens:', {
        hasStyleOverride: !!styleOverride,
        usingOverride: !!styleOverride,
        tokens: activeDesignTokens ? {
          primary: activeDesignTokens.colors?.primary,
          secondary: activeDesignTokens.colors?.secondary,
          background: activeDesignTokens.colors?.background,
        } : 'NO TOKENS',
      });

      const generatedBlueprint = generateBlueprintHeuristicV2(
        articleDraft,
        topic.title,
        topic.id,
        businessContext as any,
        {
          brief,
          preferences: {
            styleLeaning: 'auto',
          },
          // Use the passed override tokens or fall back to state tokens
          styleOverride: activeDesignTokens,
          personalityOverride: activePersonality
        }
      );

      // Analyze blueprint quality
      const quality = analyzeBlueprintQuality(generatedBlueprint);
      setBlueprintQuality(quality);

      setBlueprint(generatedBlueprint);

      // Fetch learned preferences in the background
      fetchLearnedPreferences();

      return generatedBlueprint;
    } catch (error) {
      console.error('Error generating blueprint:', error);
      setErrors(['Failed to generate layout blueprint. Please try again.']);
      return undefined;
    } finally {
      setIsBlueprintGenerating(false);
    }
  }, [articleDraft, topic.title, topic.id, brief, personalityId, style, topicalMap?.business_info, supabaseUrl, supabaseAnonKey]);

  // Generate layout engine blueprint for the LayoutIntelligenceStep
  // When fixInstructions is provided, uses AI to fix specific design issues
  const generateLayoutEngineBlueprint = useCallback(async (dna?: DesignDNA, fixInstructions?: string) => {
    if (!articleDraft) return;
    setIsLayoutEngineGenerating(true);
    setLayoutEngineError(null);

    try {
      // Convert brief sections if available
      // IMPORTANT: Use snake_case field names to match BriefSection interface in types.ts
      const briefSections = ((brief?.structured_outline as any)?.sections || brief?.structured_outline || [])?.map((s: any) => ({
        heading: s.heading || s.section_heading || '',
        section_heading: s.section_heading || s.heading || '',
        level: s.level || s.heading_level || 2,
        heading_level: s.heading_level || s.level || 2,
        format_code: s.format_code || s.format || undefined,
        attribute_category: s.attribute_category || s.attributeCategory || undefined,
        content_zone: s.content_zone || 'MAIN',
      })) || [];

      console.log('[Style & Publish] Brief sections for Layout Engine:', {
        count: briefSections.length,
        sections: briefSections.map((s: any) => ({
          heading: s.heading?.substring(0, 30),
          attribute_category: s.attribute_category,
          format_code: s.format_code,
        })),
      });

      let output;

      // Use AI-powered layout when fix instructions are provided (or Gemini key available)
      const geminiKey = geminiApiKey || (state?.businessInfo as any)?.geminiApiKey;
      if (fixInstructions && geminiKey) {
        console.log('[Style & Publish] Using AI-powered layout with fix instructions:', fixInstructions.substring(0, 100));
        output = await LayoutEngine.generateBlueprintWithAI(
          articleDraft,
          topic.title,
          { provider: 'gemini', apiKey: geminiKey },
          dna || detectedDesignDna || undefined,
          {
            language: 'auto',
            fixInstructions,
          }
        );
      } else {
        // Generate using pattern-based LayoutEngine (fallback)
        output = LayoutEngine.generateBlueprint(
          articleDraft,
          briefSections,
          dna || detectedDesignDna || undefined,
          {
            topicTitle: topic.title,
            isCoreTopic: (topic as any).is_core_topic || (topic as any).isCoreTopic,
            mainIntent: (brief as any)?.mainIntent || (brief as any)?.searchIntent,
          }
        );
      }

      // Convert LayoutBlueprintOutput to LayoutEngineBlueprint format for UI
      const layoutBlueprint: LayoutEngineBlueprint = {
        id: output.id,
        articleId: output.articleId,
        createdAt: output.generatedAt,
        version: 1,
        sections: output.sections,
        globalSettings: {
          defaultWidth: output.pageSettings.maxWidth.includes('768') ? 'narrow' :
                       output.pageSettings.maxWidth.includes('1024') ? 'medium' :
                       output.pageSettings.maxWidth.includes('1200') ? 'wide' : 'full',
          defaultSpacing: output.pageSettings.baseSpacing.includes('16') ? 'tight' :
                         output.pageSettings.baseSpacing.includes('24') ? 'normal' :
                         output.pageSettings.baseSpacing.includes('32') ? 'generous' : 'dramatic',
          primaryFont: dna?.typography?.headingFont?.family || 'system-ui',
          secondaryFont: dna?.typography?.bodyFont?.family || 'system-ui',
          colorScheme: output.pageSettings.colorMode,
        },
        designDnaHash: dna ? `dna-${Date.now()}` : undefined,
        metadata: {
          totalSections: output.sections.length,
          mainSectionCount: output.sections.filter(s => s.contentZone === 'MAIN').length,
          supplementarySectionCount: output.sections.filter(s => s.contentZone === 'SUPPLEMENTARY').length,
          averageSemanticWeight: output.sections.length > 0
            ? output.sections.reduce((sum, s) => sum + s.semanticWeight, 0) / output.sections.length
            : 0,
          heroSectionId: output.sections.find(s => s.emphasis.level === 'hero')?.id,
        },
      };

      setLayoutEngineBlueprint(layoutBlueprint);

      // Set brand validation score from the new engine
      setBrandMatchScore(output.validation.brandAlignmentScore);
      setBrandAssessment(
        output.validation.brandAlignmentScore >= 80
          ? 'Excellent brand alignment - design matches detected style'
          : output.validation.brandAlignmentScore >= 60
          ? 'Good alignment - minor adjustments may improve consistency'
          : 'Review recommended - some elements may not match brand guidelines'
      );

      console.log('[Style & Publish] Layout engine blueprint generated:', {
        sections: layoutBlueprint.sections.length,
        heroSection: layoutBlueprint.metadata.heroSectionId,
        brandScore: output.validation.brandAlignmentScore,
      });
    } catch (error) {
      console.error('Error generating layout engine blueprint:', error);
      setLayoutEngineError('Failed to analyze content structure. Please try again.');
    } finally {
      setIsLayoutEngineGenerating(false);
    }
  }, [articleDraft, brief, topic.title, (topic as any).is_core_topic, detectedDesignDna, geminiApiKey]);

  // Handle brand detection completion from BrandIntelligenceStep
  const handleBrandDetectionComplete = useCallback((result: {
    designDna: DesignDNA;
    designSystem: BrandDesignSystem;
    screenshotBase64: string;
    extractedComponents?: import('../../types/brandExtraction').ExtractedComponent[];
  }) => {
    console.log('[Style & Publish] Brand detection complete:', result);
    console.log('[Style & Publish] Extracted components received:', result.extractedComponents?.length || 0);

    // Store the detection results
    setDetectedDesignDna(result.designDna);
    setDetectedDesignSystem(result.designSystem);
    setDetectedScreenshot(result.screenshotBase64);
    // Store extracted components for BrandAwareComposer
    if (result.extractedComponents && result.extractedComponents.length > 0) {
      setExtractedComponents(result.extractedComponents);
      console.log('[Style & Publish] Stored', result.extractedComponents.length, 'extracted components for rendering');
    }

    // Convert DesignDNA to DesignTokens for the style
    const dna = result.designDna;

    // Safe accessors for nested properties
    const getColorHex = (color: { hex?: string } | string | undefined, fallback: string): string => {
      if (!color) return fallback;
      if (typeof color === 'string') return color;
      return color.hex || fallback;
    };

    const colors = dna?.colors || {} as typeof dna.colors;
    const neutrals = colors?.neutrals || {} as Record<string, string>;
    const typography = dna?.typography || {} as typeof dna.typography;
    const effects = dna?.effects || {} as typeof dna.effects;

    const primaryHex = getColorHex(colors?.primary, '#3b82f6');
    const secondaryHex = getColorHex(colors?.secondary, '#1f2937');

    // Determine personality based on detected mood
    let suggestedPersonality: DesignPersonalityId = 'modern-minimal';
    const dominantMood = colors?.dominantMood;
    if (dominantMood === 'corporate') {
      suggestedPersonality = 'corporate-professional';
    } else if (dominantMood === 'creative' || dominantMood === 'bold') {
      suggestedPersonality = 'bold-creative';
    } else if (dominantMood === 'luxurious' || dominantMood === 'minimal') {
      suggestedPersonality = 'modern-minimal';
    }

    // Update personality
    setPersonalityId(suggestedPersonality);

    // Convert to DesignTokens and update style
    console.log('[Style & Publish] Detected brand colors:', {
      primary: primaryHex,
      secondary: secondaryHex,
      neutrals: {
        darkest: neutrals?.darkest,
        dark: neutrals?.dark,
        medium: neutrals?.medium,
        light: neutrals?.light,
        lightest: neutrals?.lightest,
      },
      fonts: {
        heading: typography?.headingFont?.family,
        body: typography?.bodyFont?.family,
      }
    });

    const newTokens = brandKitToDesignTokens({
      colors: {
        primary: primaryHex,
        secondary: secondaryHex,
        background: neutrals?.lightest || '#f9fafb',
        surface: neutrals?.light || '#f3f4f6',
        text: neutrals?.darkest || '#111827',
        textMuted: neutrals?.medium || '#6b7280',
        border: neutrals?.light || '#e5e7eb',
        textOnImage: '#ffffff',
        overlayGradient: effects?.gradients?.primaryGradient || `linear-gradient(135deg, ${primaryHex}, ${secondaryHex})`
      },
      fonts: {
        heading: typography?.headingFont?.family || 'system-ui',
        body: typography?.bodyFont?.family || 'system-ui'
      },
      logoPlacement: 'top-left',
      logoOpacity: 1,
      copyright: { holder: '' },
      heroTemplates: []
    });

    console.log('[Style & Publish] New design tokens created:', {
      primaryColor: newTokens.colors.primary,
      secondaryColor: newTokens.colors.secondary,
      backgroundColor: newTokens.colors.background,
      textColor: newTokens.colors.text,
      headingFont: newTokens.fonts.heading,
      bodyFont: newTokens.fonts.body,
    });

    // Use functional setState to avoid stale closure issues
    setStyle(prevStyle => {
      if (!prevStyle) return prevStyle;
      const updatedStyle = {
        ...prevStyle,
        designTokens: {
          ...prevStyle.designTokens,
          ...newTokens,
        },
        updatedAt: new Date().toISOString()
      };
      console.log('[Style & Publish] Updated style.designTokens:', updatedStyle.designTokens.colors);
      return updatedStyle;
    });

    // Auto-generate blueprints with the new design tokens
    console.log('[Style & Publish] Auto-generating blueprints with detected colors...');
    generateBlueprint(newTokens, suggestedPersonality);
    generateLayoutEngineBlueprint(result.designDna);
    setPreview(null);

    // Save brand data to database for reuse
    if (projectId) {
      const saveBrandData = async () => {
        try {
          initBrandDesignSystemStorage(supabaseUrl, supabaseAnonKey);

          // Get the source URL from the topical map domain
          const sourceUrl = topicalMap?.business_info?.domain || '';

          // Save Design DNA (best-effort - continues if tables don't exist)
          // Use user's configured model, falling back to providerConfig defaults
          const userGeminiModel = state.businessInfo?.aiModel || '';
          const dnaId = await saveDesignDNA(projectId, {
            designDna: result.designDna,
            screenshotBase64: result.screenshotBase64,
            sourceUrl,
            extractedAt: new Date().toISOString(),
            aiModel: userGeminiModel || 'gemini-3-pro-preview', // User's preference or latest default
            processingTimeMs: 0
          });

          console.log('[Style & Publish] Saved Design DNA with id:', dnaId || '(skipped - table not found)');

          // Save Brand Design System (dnaId may be null if table doesn't exist)
          if (result.designSystem) {
            await saveBrandDesignSystem(projectId, dnaId, result.designSystem);
            console.log('[Style & Publish] Saved Brand Design System');
          }

          // Update local state to reflect saved data
          setSavedBrandSourceUrl(sourceUrl);
          setSavedBrandExtractedAt(new Date().toISOString());
          setSavedBrandDataLoaded(true);
        } catch (error) {
          console.error('[Style & Publish] Error saving brand data:', error);
          // Don't show error to user - saving is a background operation
        }
      };
      saveBrandData();
    }

    // ============================================================================
    // Brand Replication Pipeline - Enhanced Brand Step
    // ============================================================================
    // If brand replication is enabled, also run Phase 1 Discovery and Phase 2 CodeGen
    // This extracts component patterns from the brand website for later use
    if (enableBrandReplication && topicalMap?.business_info?.domain && result.designDna) {
      console.log('[Style & Publish] Running Brand Replication Pipeline Phase 1 & 2...');
      const runPipelinePhases = async () => {
        try {
          // Phase 1: Discovery - captures screenshots and discovers components
          const discoveryOutput = await brandReplicationPipeline.runDiscovery({
            brandUrl: topicalMap.business_info?.domain || '',
            brandId: projectId || `brand-${Date.now()}`,
            options: {
              maxPages: 3, // Analyze up to 3 pages
              includeScreenshots: true,
            },
          });

          if (discoveryOutput && discoveryOutput.status !== 'failed') {
            console.log('[Style & Publish] Phase 1 Discovery complete:', {
              components: discoveryOutput.discoveredComponents.length,
              screenshots: discoveryOutput.screenshots.length,
            });

            // Phase 2: CodeGen - generates CSS/HTML for discovered components
            const codeGenOutput = await brandReplicationPipeline.runCodeGen(
              discoveryOutput,
              result.designDna
            );

            if (codeGenOutput && codeGenOutput.status !== 'failed') {
              console.log('[Style & Publish] Phase 2 CodeGen complete:', {
                components: codeGenOutput.components.length,
                cssLength: codeGenOutput.compiledCss.length,
              });

              // Show component gallery when we have components
              if (codeGenOutput.components.length > 0) {
                setShowComponentGallery(true);
              }
            }
          }
        } catch (pipelineError) {
          console.error('[Style & Publish] Brand replication pipeline error:', pipelineError);
          // Don't show error to user - pipeline is enhancement only
        }
      };
      runPipelinePhases();
    }
  }, [generateBlueprint, generateLayoutEngineBlueprint, projectId, supabaseUrl, supabaseAnonKey, topicalMap?.business_info?.domain, enableBrandReplication, brandReplicationPipeline]);

  // ============================================================================
  // Brand Replication Pipeline Handlers
  // ============================================================================

  // Run Phase 3 Intelligence - design decisions for article sections
  const handleRunIntelligencePhase = useCallback(async () => {
    if (!pipelineCodeGenOutput || !articleDraft || !topic) {
      console.warn('[Style & Publish] Cannot run intelligence phase: missing prerequisites');
      return;
    }

    // Convert article draft to sections
    const sections = articleDraft
      .split(/(?=<h[1-6])/gi)
      .filter(Boolean)
      .map((section, index) => {
        const headingMatch = section.match(/<h([1-6])[^>]*>(.*?)<\/h\1>/i);
        return {
          id: `section-${index}`,
          heading: headingMatch ? headingMatch[2].replace(/<[^>]+>/g, '') : `Section ${index + 1}`,
          headingLevel: headingMatch ? parseInt(headingMatch[1]) : 2,
          content: section,
          wordCount: section.split(/\s+/).length,
        } as ArticleSection;
      });

    const contentContext = {
      pillars: {
        centralEntity: topicalMap?.pillars?.[0]?.central_entity || '',
        sourceContext: topicalMap?.pillars?.[0]?.source_context || '',
        centralSearchIntent: topicalMap?.pillars?.[0]?.central_search_intent || '',
      },
      topicalMap: {
        id: topic.map_id || '',
        coreTopic: topic.title,
        relatedTopics: [],
        contentGaps: [],
        targetAudience: (topicalMap?.business_info as any)?.audience || '',
      },
      article: {
        id: topic.id,
        title: topic.title,
        fullContent: articleDraft,
        sections,
        keyEntities: [],
        mainMessage: brief?.targetKeyword || '',
        callToAction: 'Learn more',
      },
    };

    try {
      const intelligenceOutput = await brandReplicationPipeline.runIntelligence({
        articleId: topic.id,
        contentContext,
        topicalMap: topicalMap || undefined,
        brief: brief || undefined,
        topic,
      });

      if (intelligenceOutput && intelligenceOutput.status !== 'failed') {
        console.log('[Style & Publish] Phase 3 Intelligence complete:', {
          decisions: intelligenceOutput.decisions.length,
        });
        setShowSectionDesigner(true);
      }
    } catch (error) {
      console.error('[Style & Publish] Intelligence phase error:', error);
    }
  }, [pipelineCodeGenOutput, articleDraft, topic, topicalMap, brief, brandReplicationPipeline]);

  // Run Phase 4 Validation
  const handleRunValidationPhase = useCallback(async () => {
    if (!preview?.html) {
      console.warn('[Style & Publish] Cannot run validation: no preview HTML');
      return;
    }

    try {
      const validationOutput = await brandReplicationPipeline.runValidation(preview.html);

      if (validationOutput && validationOutput.status !== 'failed') {
        console.log('[Style & Publish] Phase 4 Validation complete:', {
          overallScore: validationOutput.scores.overall,
          passesThreshold: validationOutput.passesThreshold,
        });
        setShowQualityDashboard(true);
      }
    } catch (error) {
      console.error('[Style & Publish] Validation phase error:', error);
    }
  }, [preview?.html, brandReplicationPipeline]);

  // Handle section design decision update from SectionDesigner
  const handleUpdateSectionDecision = useCallback((
    sectionId: string,
    changes: Partial<SectionDesignDecision>
  ) => {
    if (!pipelineIntelligenceOutput) return;

    const updatedDecisions = pipelineIntelligenceOutput.decisions.map(d =>
      d.sectionId === sectionId ? { ...d, ...changes } : d
    );

    setPipelineIntelligenceOutput({
      ...pipelineIntelligenceOutput,
      decisions: updatedDecisions,
    });
  }, [pipelineIntelligenceOutput]);

  // Handle quality dashboard approval
  const handleApproveQuality = useCallback(() => {
    console.log('[Style & Publish] Quality approved, proceeding to publish');
    setShowQualityDashboard(false);
    setCurrentStep('publish');
  }, []);

  // Handle quality revalidation
  const handleRevalidate = useCallback(async () => {
    if (preview?.html) {
      await handleRunValidationPhase();
    }
  }, [preview?.html, handleRunValidationPhase]);

  // Fetch learned preferences for this project
  const fetchLearnedPreferences = useCallback(async () => {
    // Use map_id as the project scope for now since EnrichedTopic doesn't have project_id
    const projectScope = topic.map_id;
    if (!projectScope) return;

    setIsLoadingPreferences(true);
    try {
      // Initialize the pattern learning client
      initPatternLearningClient(supabaseUrl, supabaseAnonKey);

      const preferences = await getLearnedPreferences(projectScope, topic.map_id);
      setLearnedPreferences(preferences);
    } catch (error) {
      console.error('Error fetching learned preferences:', error);
      // Don't show error - this is optional feature
    } finally {
      setIsLoadingPreferences(false);
    }
  }, [topic.map_id, supabaseUrl, supabaseAnonKey]);

  // Apply learned style preferences to the blueprint
  const handleApplyMyStyle = useCallback(() => {
    if (!blueprint || !learnedPreferences) return;

    setIsApplyingStyle(true);
    try {
      const updatedBlueprint = applyLearnedPreferences(blueprint, {
        preferredComponents: learnedPreferences.preferredComponents,
        avoidedComponents: learnedPreferences.avoidedComponents,
        preferredVisualStyle: learnedPreferences.preferredVisualStyle,
        emphasisPatterns: learnedPreferences.emphasisPatterns,
        componentSwaps: learnedPreferences.componentSwaps,
      });

      setBlueprint(updatedBlueprint);

      // Re-analyze quality after applying preferences
      const quality = analyzeBlueprintQuality(updatedBlueprint);
      setBlueprintQuality(quality);
    } catch (error) {
      console.error('Error applying style preferences:', error);
      setErrors(['Failed to apply style preferences.']);
    } finally {
      setIsApplyingStyle(false);
    }
  }, [blueprint, learnedPreferences]);

  // Generate blueprint for project or topical map level and save to database
  const handleRegenerateHierarchy = useCallback(async (level: 'project' | 'topical_map') => {
    if (!topic.map_id) {
      console.error('[Style & Publish] Cannot generate hierarchy blueprint: no map_id');
      return;
    }

    setIsRegeneratingHierarchy(true);
    setErrors([]);

    try {
      // Ensure storage client is initialized
      initBlueprintSupabase(supabaseUrl, supabaseAnonKey);

      if (level === 'project') {
        // Generate project-level blueprint defaults
        const projectBp: ProjectBlueprint = {
          projectId: topic.map_id,
          defaults: {
            visualStyle: 'editorial',
            pacing: 'balanced',
            colorIntensity: 'moderate',
            ctaStrategy: {
              intensity: 'moderate',
              positions: ['after-intro', 'mid-content', 'end'],
              style: 'banner',
            },
          },
          componentPreferences: {
            preferredListStyle: 'icon-list',
            preferredTimelineStyle: 'steps-numbered',
            preferredFaqStyle: 'faq-accordion',
          },
          avoidComponents: [] as any[],
          reasoning: 'Default project blueprint generated for styling consistency',
          generatedAt: new Date().toISOString(),
        };

        // Save to database (only if we have a project ID)
        if (projectId) {
          await upsertProjectBlueprint(projectId, projectBp);
          setProjectBlueprint(projectBp);
          console.log('[Style & Publish] Project blueprint generated and saved');
        } else {
          console.warn('[Style & Publish] Cannot save project blueprint: no projectId available');
          setProjectBlueprint(projectBp);
        }
      } else {
        // Generate topical map-level blueprint defaults
        const topicalMapBp: TopicalMapBlueprint = {
          topicalMapId: topic.map_id,
          projectId: projectId || topic.map_id, // Use actual projectId if available
          defaults: {
            visualStyle: 'editorial',
            pacing: 'balanced' as any,
            colorIntensity: 'moderate' as any,
          },
          componentPreferences: {} as any,
          reasoning: 'Default topical map blueprint generated for styling consistency',
          generatedAt: new Date().toISOString(),
        };

        // Save to database (need projectId for RLS)
        if (projectId) {
          await upsertTopicalMapBlueprint(topic.map_id, projectId, topicalMapBp);
          setTopicalMapBlueprint(topicalMapBp);
          console.log('[Style & Publish] Topical map blueprint generated and saved');
        } else {
          console.warn('[Style & Publish] Cannot save topical map blueprint: no projectId available');
          setTopicalMapBlueprint(topicalMapBp);
        }
      }
    } catch (error) {
      console.error(`Error generating ${level} blueprint:`, error);
      setErrors([`Failed to generate ${level} blueprint. Please try again.`]);
    } finally {
      setIsRegeneratingHierarchy(false);
    }
  }, [topic.map_id, projectId, supabaseUrl, supabaseAnonKey]);

  // Handle project blueprint changes
  const handleProjectChange = useCallback((updates: Partial<ProjectBlueprint>) => {
    if (projectBlueprint) {
      setProjectBlueprint({
        ...projectBlueprint,
        ...updates,
        generatedAt: new Date().toISOString(),
      });
    }
  }, [projectBlueprint]);

  // Handle topical map blueprint changes
  const handleTopicalMapChange = useCallback((updates: Partial<TopicalMapBlueprint>) => {
    if (topicalMapBlueprint) {
      setTopicalMapBlueprint({
        ...topicalMapBlueprint,
        ...updates,
        generatedAt: new Date().toISOString(),
      });
    }
  }, [topicalMapBlueprint]);

  // Handle saving hierarchy blueprints to database
  const handleSaveHierarchy = useCallback(async () => {
    if (!topic.map_id) {
      console.error('[Style & Publish] Cannot save blueprints: no map_id');
      return;
    }

    if (!projectId) {
      console.warn('[Style & Publish] Cannot save blueprints to database: no projectId available');
      return;
    }

    console.log('[Style & Publish] Saving hierarchy blueprints to database:', {
      projectId,
      mapId: topic.map_id,
      projectBlueprint: projectBlueprint ? 'present' : 'none',
      topicalMapBlueprint: topicalMapBlueprint ? 'present' : 'none',
    });

    try {
      // Ensure storage client is initialized
      initBlueprintSupabase(supabaseUrl, supabaseAnonKey);

      // Save project blueprint if it exists
      if (projectBlueprint) {
        await upsertProjectBlueprint(projectId, projectBlueprint);
        console.log('[Style & Publish] Project blueprint saved');
      }

      // Save topical map blueprint if it exists
      if (topicalMapBlueprint) {
        await upsertTopicalMapBlueprint(topic.map_id, projectId, topicalMapBlueprint);
        console.log('[Style & Publish] Topical map blueprint saved');
      }

      // If we have both blueprints, regenerate the article blueprint with inherited settings
      if (blueprint && (projectBlueprint || topicalMapBlueprint)) {
        const inheritedDefaults = {
          ...projectBlueprint?.defaults,
          ...topicalMapBlueprint?.defaults,
        };

        // Update article blueprint with inherited settings
        setBlueprint({
          ...blueprint,
          pageStrategy: {
            ...blueprint.pageStrategy,
            visualStyle: inheritedDefaults.visualStyle || blueprint.pageStrategy.visualStyle,
            pacing: inheritedDefaults.pacing || blueprint.pageStrategy.pacing,
            colorIntensity: inheritedDefaults.colorIntensity || blueprint.pageStrategy.colorIntensity,
          },
          globalElements: {
            ...blueprint.globalElements,
            ctaStrategy: inheritedDefaults.ctaStrategy || blueprint.globalElements.ctaStrategy,
          },
          metadata: {
            ...blueprint.metadata,
            generatedAt: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('[Style & Publish] Error saving blueprints:', error);
      throw error; // Re-throw so the UI can show an error
    }
  }, [projectBlueprint, topicalMapBlueprint, blueprint, topic.map_id, projectId, supabaseUrl, supabaseAnonKey]);

  // Get style preference summary for UI
  const stylePreferenceSummary = useMemo(() => {
    if (!learnedPreferences) return null;
    return getStylePreferenceSummary({
      preferredComponents: learnedPreferences.preferredComponents,
      avoidedComponents: learnedPreferences.avoidedComponents,
      preferredVisualStyle: learnedPreferences.preferredVisualStyle,
      componentSwaps: learnedPreferences.componentSwaps,
    });
  }, [learnedPreferences]);

  // Generate preview when entering preview step
  const generatePreview = useCallback(async (blueprintOverride?: typeof blueprint) => {
    if (!style || !layout) {
      setErrors(['Style and layout configuration required']);
      return;
    }

    // Use blueprint override (from handleNext) to avoid React state timing issues,
    // or fall back to the state blueprint
    const effectiveBlueprint = blueprintOverride || blueprint;

    setIsGenerating(true);
    setErrors([]);

    try {
      // If we have a blueprint, use the new blueprint renderer
      if (effectiveBlueprint) {
        // Extract language from topical map context
        const language = topicalMap?.business_info?.language || 'en';

        // Log the design tokens being used for rendering
        console.log('[Style & Publish] generatePreview - using designTokens:', {
          hasTokens: !!style?.designTokens,
          colors: style?.designTokens?.colors ? {
            primary: style.designTokens.colors.primary,
            secondary: style.designTokens.colors.secondary,
            background: style.designTokens.colors.background,
            text: style.designTokens.colors.text,
          } : 'NO TOKENS',
          fonts: style?.designTokens?.fonts,
        });

        // ============================================================================
        // STYLING PIPELINE LOGGING - Modal entry point
        // ============================================================================
        console.log('='.repeat(80));
        console.log('[STYLING PIPELINE] MODAL ENTRY: generatePreview() called');
        console.log('='.repeat(80));
        console.log('[STYLING PIPELINE] Brand Detection State:', {
          hasDetectedDesignDna: !!detectedDesignDna,
          hasDetectedDesignSystem: !!detectedDesignSystem,
          hasCompiledCss: !!detectedDesignSystem?.compiledCss,
          compiledCssLength: detectedDesignSystem?.compiledCss?.length || 0,
          brandName: detectedDesignSystem?.brandName || '(not detected)',
          designDnaHash: detectedDesignSystem?.designDnaHash || '(none)',
          savedBrandSourceUrl: savedBrandSourceUrl || '(none)',
        });
        console.log('[STYLING PIPELINE] Style Configuration:', {
          hasStyleTokens: !!style?.designTokens,
          primaryColor: style?.designTokens?.colors?.primary || '(default)',
          secondaryColor: style?.designTokens?.colors?.secondary || '(default)',
          headingFont: style?.designTokens?.fonts?.heading || '(default)',
          bodyFont: style?.designTokens?.fonts?.body || '(default)',
        });
        console.log('[STYLING PIPELINE] Content Info:', {
          topicId: topic.id,
          topicTitle: topic.title,
          articleDraftLength: articleDraft.length,
          projectId: projectId || '(none)',
          hasBlueprint: !!effectiveBlueprint,
          blueprintSections: effectiveBlueprint?.sections?.length || 0,
        });

        // NEW: Try unified renderer first (routes to BrandAwareComposer when extractions exist)
        if (projectId) {
          try {
            // Fetch generated images from content_generation_jobs
            const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
            let generatedImages: Array<{
              id: string;
              type: string;
              description: string;
              altTextSuggestion: string;
              generatedUrl?: string;
              userUploadUrl?: string;
              status: string;
              specs?: { width: number; height: number };
            }> = [];

            if (topic.id) {
              // First get the brief_id for this topic
              const { data: briefData } = await supabase
                .from('content_briefs')
                .select('id')
                .eq('topic_id', topic.id)
                .limit(1)
                .single();

              if (briefData?.id) {
                // Images are stored in content_generation_jobs.image_placeholders
                const { data: jobData } = await supabase
                  .from('content_generation_jobs')
                  .select('image_placeholders')
                  .eq('brief_id', briefData.id)
                  .eq('status', 'completed')
                  .order('updated_at', { ascending: false })
                  .limit(1)
                  .single();

              if (jobData?.image_placeholders && Array.isArray(jobData.image_placeholders)) {
                // Filter to only include generated or uploaded images
                const placeholders = jobData.image_placeholders as Array<{
                  id: string;
                  type?: string;
                  description?: string;
                  altTextSuggestion?: string;
                  generatedUrl?: string;
                  userUploadUrl?: string;
                  status?: string;
                  specs?: { width: number; height: number };
                }>;

                generatedImages = placeholders
                  .filter(img => img.status === 'generated' || img.status === 'uploaded')
                  .map(img => ({
                    id: img.id,
                    type: img.type || 'SECTION',
                    description: img.description || '',
                    altTextSuggestion: img.altTextSuggestion || img.description || '',
                    generatedUrl: img.generatedUrl,
                    userUploadUrl: img.userUploadUrl,
                    status: img.status || 'placeholder',
                    specs: img.specs,
                  }));

                console.log('[Style & Publish] Found', generatedImages.length, 'generated/uploaded images for topic');
              }
              }
            }

            const articleContent = htmlToArticleContent(articleDraft, topic.title);

            // Use user's preferred AI provider for layout engine
            // Gemini: direct browser calls (no CORS issues)
            // Anthropic/OpenAI: uses Supabase edge function proxy
            const userPreferredProvider = (state.businessInfo?.aiProvider || 'gemini') as 'gemini' | 'anthropic' | 'openai';
            const userPreferredModel = state.businessInfo?.aiModel || '';

            // Inform user which provider is being used
            if (useSemanticLayoutEngine) {
              const proxyNote = userPreferredProvider !== 'gemini' ? ' (via Supabase proxy)' : '';
              dispatch({
                type: 'LOG_EVENT',
                payload: {
                  service: 'Style & Publish',
                  message: `AI Layout using ${userPreferredProvider}${proxyNote}`,
                  status: 'info',
                  timestamp: Date.now(),
                },
              });
            }

            const unifiedOutput = await renderContent(articleContent, {
              projectId,
              aiProvider: userPreferredProvider,
              aiModel: userPreferredModel,
              // Pass the active API key for general use
              aiApiKey: activeAiApiKey,
              // Pass all API keys for flexibility and fallback
              geminiApiKey,
              anthropicApiKey,
              openAiApiKey,
              blueprint: effectiveBlueprint,
              brief,
              topic,
              topicalMap,
              personalityId,
              // Pass DesignDNA for CleanArticleRenderer (NO TEMPLATES)
              designDna: detectedDesignDna || undefined,
              // Pass Layout Engine blueprint for component/emphasis decisions
              layoutBlueprint: layoutEngineBlueprint || undefined,
              designTokens: style?.designTokens ? {
                colors: {
                  primary: style.designTokens.colors.primary,
                  secondary: style.designTokens.colors.secondary,
                  accent: style.designTokens.colors.accent,
                  background: style.designTokens.colors.background,
                  surface: style.designTokens.colors.surface,
                  text: style.designTokens.colors.text,
                  textMuted: style.designTokens.colors.textMuted,
                  border: style.designTokens.colors.border,
                },
                fonts: {
                  heading: style.designTokens.fonts.heading,
                  body: style.designTokens.fonts.body,
                },
              } : undefined,
              darkMode: false,
              minifyCss: false,
              language,
              heroImage: layout.components.hero.imageUrl,
              ctaConfig: {
                primaryText: layout.components.ctaBanners.primaryText || undefined,
                primaryUrl: '#contact',
                secondaryText: layout.components.ctaBanners.secondaryText || undefined,
                secondaryUrl: '#',
              },
              // Pass brandDesignSystem for AI-generated CSS injection
              brandDesignSystem: detectedDesignSystem || undefined,
              // Pass generated images for injection
              generatedImages: generatedImages as any,
              // Pass extracted components directly (bypass database lookup)
              extractedComponents: extractedComponents.length > 0 ? extractedComponents : undefined,
              // Semantic Layout Engine - AI-driven layout intelligence
              useSemanticLayoutEngine,
              mapId: topic.map_id,
              topicId: topic.id,
              // Required for Semantic Layout Engine (centralized AI service layer)
              dispatch,
              supabaseUrl,
              supabaseAnonKey,
              // Pipeline decisions from Phase 3 Intelligence (when available)
              pipelineDecisions: pipelineIntelligenceOutput?.decisions,
              pipelineComponents: pipelineCodeGenOutput?.components,
              // Renderer path override (user selection)
              rendererPath,
            });

            console.log('[Style & Publish] Unified renderer succeeded');
            setPreview(unifiedOutput);

            // Use renderInfo from output for clear user messaging
            const renderInfo = (unifiedOutput as any).renderInfo;
            setRenderingMetadata({
              rendererUsed: renderInfo?.renderer || (unifiedOutput as any).template || 'unknown',
              brandScore: brandMatchScore,
              unresolvedImageCount: (unifiedOutput as any).renderMetadata?.unresolvedImageCount || 0,
              // NEW: Clear user messaging
              renderMessage: renderInfo?.message,
              renderReason: renderInfo?.reason,
              renderLevel: renderInfo?.level || 'info',
              renderDetails: renderInfo?.details,
              pipelineTelemetry: renderInfo?.pipelineTelemetry,
            });
            console.log('[Style & Publish] Render info:', renderInfo);
            return;
          } catch (error) {
            console.log('[Style & Publish] Unified renderer failed, falling back:', error);
            // Set fallback metadata
            setRenderingMetadata({
              rendererUsed: 'BlueprintRenderer',
              fallbackReason: error instanceof Error ? error.message : 'Unified renderer unavailable',
            });
            // Fall through to direct renderBlueprint
          }
        }

        // EXISTING: Direct blueprint rendering as fallback
        const output = renderBlueprint(
          effectiveBlueprint,
          topic.title,
          {
            brief,
            topic,
            topicalMap,
            personalityId: personalityId,
            language,
            heroImage: layout.components.hero.imageUrl,
            // Pass brandDesignSystem for compiledCss injection (THE KEY FIX)
            brandDesignSystem: detectedDesignSystem || undefined,
            designTokens: style?.designTokens ? {
              colors: {
                primary: style.designTokens.colors.primary,
                secondary: style.designTokens.colors.secondary,
                accent: style.designTokens.colors.accent,
                background: style.designTokens.colors.background,
                surface: style.designTokens.colors.surface,
                text: style.designTokens.colors.text,
                textMuted: style.designTokens.colors.textMuted,
                border: style.designTokens.colors.border,
              },
              fonts: {
                heading: style.designTokens.fonts.heading,
                body: style.designTokens.fonts.body,
              },
            } : undefined,
            darkMode: false,
            minifyCss: false,
            ctaConfig: {
              // Only pass explicit values if user has configured them
              // Otherwise let the renderer use localized defaults
              primaryText: layout.components.ctaBanners.primaryText || undefined,
              primaryUrl: '#contact',
              secondaryText: layout.components.ctaBanners.secondaryText || undefined,
              secondaryUrl: '#',
              bannerTitle: undefined, // Let renderer use localized default
              bannerText: '',
            },
          }
        );

        // Map the output to the expected StyledContentOutput format for the preview
        setPreview({
          html: output.html,
          css: output.css,
          cssVariables: {} as any, // Not used in new system
          components: output.metadata.componentsUsed.map(c => ({
            type: c,
            detected: true,
          })) as any,
          seoValidation: {
            isValid: true,
            warnings: [],
            headingStructure: {
              hasH1: output.html.includes('<h1'),
              hierarchy: [],
              issues: [],
            },
            schemaPreserved: output.jsonLd.length > 0,
            metaPreserved: true,
          },
          template: layout.template,
        });

        console.log('[Style & Publish] Preview generated using blueprint renderer:', {
          sectionsRendered: output.metadata.sectionsRendered,
          componentsUsed: output.metadata.componentsUsed,
          visualStyle: output.metadata.blueprint.visualStyle,
        });

        // Set rendering metadata for fallback path
        const hasBrandDesignSystem = !!detectedDesignSystem?.compiledCss;
        setRenderingMetadata({
          rendererUsed: 'BlueprintRenderer',
          fallbackReason: hasBrandDesignSystem
            ? undefined
            : 'No brand extraction available. Using design tokens for styling.',
          brandScore: brandMatchScore,
        });
      } else {
        // Fallback to old assemblePage if no blueprint (shouldn't happen normally)
        const output = assemblePage({
          template: mapTemplateToPageTemplate(layout.template),
          personalityId: personalityId,
          content: articleDraft,
          title: topic.title,
          seoConfig: {
            title: topic.title,
            metaDescription: brief?.metaDescription || '',
            primaryKeyword: brief?.targetKeyword || topic.title,
            secondaryKeywords: [],
          },
          ctaConfig: {
            primaryCta: {
              text: layout.components.ctaBanners.primaryText || 'Learn More',
              url: '#contact',
            },
            secondaryCta: layout.components.ctaBanners.secondaryText ? {
              text: layout.components.ctaBanners.secondaryText,
              url: '#',
            } : undefined,
          },
          brief,
          topic,
          darkMode: false,
          minifyCss: false,
        });

        // Map the output to the expected StyledContentOutput format for the preview
        setPreview({
          html: output.html,
          css: output.css,
          cssVariables: {} as any, // Not used in new system
          components: output.components as any,
          seoValidation: {
            isValid: output.seoValidation.isValid,
            warnings: output.seoValidation.issues.map(i => ({
              type: i.type === 'error' ? 'heading' : i.type === 'warning' ? 'schema' : 'meta',
              severity: i.type,
              message: i.message,
            })) as any,
            headingStructure: {
              hasH1: output.html.includes('<h1'),
              hierarchy: [],
              issues: [],
            },
            schemaPreserved: output.jsonLd.length > 0,
            metaPreserved: true,
          },
          template: layout.template,
        });

        // Check for SEO warnings
        if (!output.seoValidation.isValid) {
          const seoErrors = output.seoValidation.issues
            .filter(i => i.type === 'error')
            .map(i => i.message);
          if (seoErrors.length > 0) {
            setErrors(seoErrors);
          }
        }
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      setErrors(['Failed to generate preview. Please try again.']);
    } finally {
      setIsGenerating(false);
    }
  }, [style, layout, articleDraft, topic, brief, personalityId, blueprint, detectedDesignSystem, topicalMap, useSemanticLayoutEngine, detectedDesignDna, layoutEngineBlueprint, extractedComponents, activeAiApiKey, aiProvider, projectId, supabaseUrl, supabaseAnonKey, brandMatchScore, rendererPath]);

  // Auto-regenerate preview when renderer path changes (user switched dropdown)
  useEffect(() => {
    if (rendererPathInitialRef.current) {
      rendererPathInitialRef.current = false;
      return;
    }
    // Only regenerate when on the preview step with valid style/layout
    if (currentStep === 'preview' && style && layout) {
      generatePreview();
    }
  }, [rendererPath]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally only trigger on rendererPath change

  // Navigation handlers
  const handleNext = useCallback(async () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      const nextStep = STEPS[nextIndex].id;

      // Generate layout engine blueprint when moving to layout step (if not already generated)
      if (nextStep === 'layout' && !layoutEngineBlueprint) {
        await generateLayoutEngineBlueprint(detectedDesignDna || undefined);
      }

      // Generate rendering blueprint if not already generated when moving to preview
      let newBlueprint: typeof blueprint | undefined;
      if (nextStep === 'preview' && !blueprint) {
        newBlueprint = await generateBlueprint();
      }

      // Generate preview when entering preview step
      // Pass newBlueprint directly to avoid React state timing issue
      // (setBlueprint in generateBlueprint hasn't flushed yet)
      if (nextStep === 'preview') {
        await generatePreview(newBlueprint || blueprint || undefined);
      }

      setCurrentStep(nextStep);
    }
  }, [currentStepIndex, generatePreview, generateBlueprint, blueprint, generateLayoutEngineBlueprint, layoutEngineBlueprint, detectedDesignDna]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  const handleStepClick = useCallback(async (stepId: StylePublishStep) => {
    const targetIndex = STEPS.findIndex(s => s.id === stepId);

    // Only allow going back or to current step
    if (targetIndex <= currentStepIndex) {
      setCurrentStep(stepId);
    }
  }, [currentStepIndex]);

  // Style update handler
  const handleStyleChange = useCallback((updates: Partial<PublishingStyle>) => {
    if (style) {
      setStyle({
        ...style,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      // Clear preview when style changes
      setPreview(null);
    }
  }, [style]);

  // Layout update handler
  const handleLayoutChange = useCallback((updates: Partial<LayoutConfiguration>) => {
    if (layout) {
      setLayout({
        ...layout,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      // Clear preview when layout changes
      setPreview(null);
    }
  }, [layout]);

  // Template change handler
  const handleTemplateChange = useCallback((template: ContentTypeTemplate) => {
    const newLayout = createInMemoryLayout(template);
    setLayout(newLayout);
    setPreview(null);
  }, []);

  // Publish success handler
  const handlePublishSuccess = useCallback(() => {
    onPublishSuccess?.();
    onClose();
  }, [onPublishSuccess, onClose]);

  // Handle brand regenerate - clears saved data and allows new detection
  const handleBrandRegenerate = useCallback(() => {
    console.log('[Style & Publish] Regenerating brand detection...');
    // Set skip flag to prevent useEffect from reloading saved data
    setSkipBrandReload(true);
    // Clear all brand-related state
    setDetectedDesignDna(null);
    setDetectedDesignSystem(null);
    setDetectedScreenshot(null);
    setSavedBrandSourceUrl(null);
    setSavedBrandExtractedAt(null);
    setSavedBrandDataLoaded(false);
    // Clear saved extraction data
    setSavedComponents([]);
    setSavedUrlSuggestions([]);
    setExtractedComponents([]);
    // Clear preview and blueprints that depend on brand
    setPreview(null);
    setLayoutEngineBlueprint(null);
  }, []);

  // Debug: Log API key status (API keys are defined above, near the top of the component)
  console.log('[Style & Publish] API Keys status:', {
    aiProvider,
    hasActiveKey: !!activeAiApiKey,
    hasApifyToken: !!apifyToken,
    apifyTokenLength: apifyToken?.length || 0,
    hasGeminiKey: !!geminiApiKey,
    hasAnthropicKey: !!anthropicApiKey,
    businessInfoKeys: Object.keys(state.businessInfo || {}),
  });

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'brand':
        return (
          <div className="space-y-6">
            <BrandIntelligenceStep
              defaultDomain={topicalMap?.business_info?.domain}
              apifyToken={apifyToken}
              geminiApiKey={geminiApiKey}
              anthropicApiKey={anthropicApiKey}
              supabaseUrl={supabaseUrl}
              supabaseAnonKey={supabaseAnonKey}
              projectId={projectId}
              designDna={detectedDesignDna}
              brandDesignSystem={detectedDesignSystem}
              screenshotBase64={detectedScreenshot}
              savedSourceUrl={savedBrandSourceUrl}
              savedExtractedAt={savedBrandExtractedAt}
              isLoadingSavedData={isLoadingSavedBrand}
              savedUrlSuggestions={savedUrlSuggestions}
              savedComponents={savedComponents}
              onDetectionComplete={handleBrandDetectionComplete}
              onDesignDnaChange={setDetectedDesignDna}
              onRegenerate={handleBrandRegenerate}
              onReset={() => {
                // Clear all cached brand data to allow entering a new URL
                setDetectedDesignDna(null);
                setDetectedDesignSystem(null);
                setDetectedScreenshot(null);
                setSavedBrandSourceUrl(null);
                setSavedBrandExtractedAt(null);
                setSavedComponents([]);
                setSavedUrlSuggestions([]);
                setExtractedComponents([]);
                console.log('[Style & Publish] Brand data reset - ready for new URL');
              }}
            />

            {/* Styleguide Integration Notice */}
            {topicalMap?.styleguide_data && (
              <div className="p-3 border border-blue-800/40 rounded-lg bg-blue-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-blue-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    <span>Brand styleguide available</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-3 h-3 rounded" style={{ background: topicalMap.styleguide_data.designTokens.colors.primary[400] }} />
                    <span>{topicalMap.styleguide_data.designTokens.colors.primary[400]}</span>
                    <span className="text-gray-600">|</span>
                    <span>{topicalMap.styleguide_data.designTokens.typography.headingFont.split(',')[0].replace(/['"]/g, '').trim()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Brand Replication Feature Toggle */}
            {detectedDesignDna && (
              <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-700/50 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableBrandReplication}
                    onChange={(e) => setEnableBrandReplication(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-700 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  <div>
                    <span className="text-sm font-medium text-white">Advanced Brand Replication</span>
                    <span className="text-xs text-zinc-500 ml-2">(BETA)</span>
                  </div>
                </label>
                <div className="text-xs text-zinc-400 space-y-1.5 pl-14">
                  {enableBrandReplication ? (
                    <>
                      <p className="text-blue-300 font-medium">Enabled: Using real HTML/CSS from your website</p>
                      <p>The output will use actual component HTML and CSS extracted from your brand website for pixel-perfect matching. This produces the most accurate brand replication but is experimental.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-zinc-300">Default: AI-generated styling</p>
                      <p>The output will be styled using AI-generated CSS based on detected brand colors, fonts, and personality. This is the recommended approach for most cases.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Component Gallery - Shows discovered components from Phase 1-2 */}
            {enableBrandReplication && showComponentGallery && pipelineDiscoveryOutput && pipelineCodeGenOutput && (
              <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowComponentGallery(!showComponentGallery)}
                  className="w-full p-4 flex items-center justify-between bg-zinc-900/40 hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-sm font-medium text-zinc-300">
                    Discovered Components ({pipelineCodeGenOutput.components.length})
                  </span>
                  <span className="text-zinc-400">
                    {showComponentGallery ? '\u25BC' : '\u25B6'}
                  </span>
                </button>
                {showComponentGallery && (
                  <div className="p-4 bg-zinc-950/50">
                    <ComponentGallery
                      discoveredComponents={pipelineDiscoveryOutput.discoveredComponents}
                      brandComponents={pipelineCodeGenOutput.components}
                      screenshots={pipelineDiscoveryOutput.screenshots}
                      selectedComponentId={selectedPipelineComponentId}
                      onSelectComponent={setSelectedPipelineComponentId}
                      isLoading={brandReplicationPipeline.state.isRunning && brandReplicationPipeline.state.currentPhase === 'codegen'}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Pipeline Status */}
            {enableBrandReplication && brandReplicationPipeline.state.isRunning && (
              <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-500/30 flex items-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="text-sm text-blue-300">
                  Running {brandReplicationPipeline.state.currentPhase === 'discovery' ? 'discovery' : 'code generation'}...
                </span>
              </div>
            )}

            {/* Pipeline Error */}
            {enableBrandReplication && brandReplicationPipeline.state.error && (
              <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
                <p className="text-sm text-yellow-300">
                  Brand replication: {brandReplicationPipeline.state.error.message}
                </p>
                <p className="text-xs text-yellow-400/70 mt-1">
                  {brandReplicationPipeline.state.error.suggestion || 'This is an optional enhancement. Standard brand detection will be used.'}
                </p>
              </div>
            )}
          </div>
        );

      case 'layout':
        return (
          <div className="space-y-6">
            <LayoutIntelligenceStep
              blueprint={layoutEngineBlueprint}
              isGenerating={isLayoutEngineGenerating}
              error={layoutEngineError}
              onRegenerate={() => generateLayoutEngineBlueprint(detectedDesignDna || undefined)}
              onBlueprintChange={setLayoutEngineBlueprint}
            />

            {/* Section Designer - Shows Phase 3 design decisions when enabled */}
            {enableBrandReplication && pipelineCodeGenOutput && pipelineCodeGenOutput.components.length > 0 && (
              <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
                <div className="p-4 bg-zinc-900/40 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">Semantic Section Designer</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      AI-driven design decisions based on content context
                    </p>
                  </div>
                  {!pipelineIntelligenceOutput && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRunIntelligencePhase}
                      disabled={brandReplicationPipeline.state.isRunning}
                      className="text-xs"
                    >
                      {brandReplicationPipeline.state.isRunning && brandReplicationPipeline.state.currentPhase === 'intelligence'
                        ? 'Analyzing...'
                        : 'Run Section Analysis'}
                    </Button>
                  )}
                </div>

                {pipelineIntelligenceOutput && (
                  <div className="p-4 bg-zinc-950/50">
                    <SectionDesigner
                      sections={
                        articleDraft
                          .split(/(?=<h[1-6])/gi)
                          .filter(Boolean)
                          .map((section, index) => {
                            const headingMatch = section.match(/<h([1-6])[^>]*>(.*?)<\/h\1>/i);
                            return {
                              id: `section-${index}`,
                              heading: headingMatch ? headingMatch[2].replace(/<[^>]+>/g, '') : `Section ${index + 1}`,
                              headingLevel: headingMatch ? parseInt(headingMatch[1]) : 2,
                              content: section,
                              wordCount: section.split(/\s+/).length,
                            } as ArticleSection;
                          })
                      }
                      decisions={pipelineIntelligenceOutput.decisions}
                      componentLibrary={pipelineCodeGenOutput.components}
                      selectedSectionId={selectedPipelineSectionId}
                      onSelectSection={setSelectedPipelineSectionId}
                      onUpdateDecision={handleUpdateSectionDecision}
                      onAcceptAll={() => {
                        console.log('[Style & Publish] All section decisions accepted');
                        setShowSectionDesigner(false);
                      }}
                      isLoading={brandReplicationPipeline.state.isRunning && brandReplicationPipeline.state.currentPhase === 'intelligence'}
                    />
                  </div>
                )}

                {/* Intelligence Phase Status */}
                {brandReplicationPipeline.state.isRunning && brandReplicationPipeline.state.currentPhase === 'intelligence' && (
                  <div className="p-3 bg-blue-900/30 border-t border-blue-500/30 flex items-center gap-3">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    <span className="text-sm text-blue-300">Analyzing sections and matching components...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'preview':
        return (
          <>
          <PreviewStep
            preview={preview}
            isGenerating={isGenerating}
            onRegenerate={async () => {
              // Regenerate BOTH blueprint and preview to pick up code changes
              await generateBlueprint();
              await generatePreview();
            }}
            seoWarnings={preview?.seoValidation.warnings || []}
            // Layout configuration for collapsible panel
            layout={layout || undefined}
            onLayoutChange={handleLayoutChange}
            onTemplateChange={handleTemplateChange}
            // Blueprint configuration for collapsible panel
            blueprint={blueprint}
            onBlueprintChange={setBlueprint}
            isBlueprintGenerating={isBlueprintGenerating}
            onRegenerateBlueprint={() => generateBlueprint()}
            // Brand validation display
            brandMatchScore={brandMatchScore}
            brandAssessment={brandAssessment}
            onShowBrandDetails={() => setCurrentStep('brand')}
            // Quality/fallback notifications
            blueprintQuality={blueprintQuality}
            renderingMetadata={renderingMetadata}
            // Visual quality check - when issues detected, offer rework option
            geminiApiKey={geminiApiKey}
            onReworkOutput={async () => {
              // Rework output: regenerate with potentially different approach
              console.log('[Style & Publish] Reworking output due to quality issues...');
              // First regenerate the layout blueprint with fresh analysis
              await generateLayoutEngineBlueprint(detectedDesignDna || undefined);
              // Then regenerate the rendering blueprint
              await generateBlueprint();
              // Finally regenerate the preview
              await generatePreview();
            }}
            // Business context for design quality assessment
            businessContext={{
              industry: (topicalMap?.business_info as any)?.industry,
              model: (topicalMap?.business_info as any)?.model,
              audience: (topicalMap?.business_info as any)?.audience,
              valueProp: (topicalMap?.business_info as any)?.valueProp,
            }}
            contentContext={{
              title: topic.title,
              intent: (brief as any)?.mainIntent || (brief as any)?.searchIntent,
              isCoreTopic: (topic as any).is_core_topic || (topic as any).isCoreTopic,
            }}
            // AI-assisted design fixes - level-aware (output, layout, brand, or all)
            onAutoFixIssue={async (issue) => {
              const fixLevel = (issue as any).fixLevel || 'output';
              const layoutPrompt = (issue as any).layoutFixPrompt;
              const brandPrompt = (issue as any).brandFixPrompt;
              const autoFixPrompt = (issue as any).autoFixPrompt || `Fix this issue: ${issue.title}. ${issue.description || ''}`;

              console.log('[Style & Publish] AI fixing design issue:', issue.title, 'at level:', fixLevel);

              // Handle layout-level fixes
              if (fixLevel === 'layout' || fixLevel === 'all') {
                const prompt = layoutPrompt || autoFixPrompt;
                console.log('[Style & Publish] Applying layout fix:', prompt.substring(0, 80));
                await generateLayoutEngineBlueprint(detectedDesignDna || undefined, prompt);
              }

              // Handle brand-level fixes (update design system for future articles)
              if ((fixLevel === 'brand' || fixLevel === 'all') && brandPrompt && detectedDesignSystem) {
                console.log('[Style & Publish] Applying brand fix (for future designs):', brandPrompt.substring(0, 80));
                // Note: Brand updates would be saved to database for future articles
                // For now, log the intent - full implementation would update brand design system
                console.log('[Style & Publish] Brand fix prompt saved for future reference');
              }

              // Regenerate output with the fixes applied
              if (fixLevel === 'output' || fixLevel === 'all') {
                // For output-only fixes, still use the autoFixPrompt but don't save to patterns
                await generateLayoutEngineBlueprint(detectedDesignDna || undefined, autoFixPrompt);
              }

              await generateBlueprint();
              await generatePreview();
            }}
            onRegenerateWithInstructions={async (instructions) => {
              console.log('[Style & Publish] Regenerating with AI instructions:', instructions.substring(0, 100));
              // Pass all fix instructions to AI for comprehensive regeneration
              await generateLayoutEngineBlueprint(detectedDesignDna || undefined, instructions);
              await generateBlueprint();
              await generatePreview();
            }}
            // Renderer path selector
            rendererPath={rendererPath}
            onRendererPathChange={(path) => {
              setRendererPath(path as 'auto' | 'brand-templates' | 'clean-components');
              // Preview is cleared; useEffect on rendererPath will auto-regenerate
              setPreview(null);
            }}
            // Semantic Layout Engine toggle (requires Gemini API key)
            useSemanticLayoutEngine={useSemanticLayoutEngine}
            onSemanticLayoutEngineChange={(enabled) => {
              if (enabled && !geminiApiKey) {
                console.warn('[Style & Publish] Semantic Layout Engine requires a Gemini API key');
                setErrors(['Semantic Layout Engine requires a Gemini API key. Please add one in settings.']);
                return;
              }
              setUseSemanticLayoutEngine(enabled);
              // Clear preview - user will need to click Regenerate to see new output
              // This avoids closure issues with auto-regeneration
              setPreview(null);
            }}
          />

          {/* Quality Dashboard - Shows Phase 4 Validation results when brand replication is enabled */}
          {enableBrandReplication && pipelineIntelligenceOutput && preview?.html && (
            <div className="mt-6 border border-zinc-700/50 rounded-xl overflow-hidden">
              <div className="p-4 bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">Brand Quality Validation</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Comprehensive quality scoring with wow-factor checklist
                  </p>
                </div>
                {!pipelineValidationOutput && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRunValidationPhase}
                    disabled={brandReplicationPipeline.state.isRunning}
                    className="text-xs"
                  >
                    {brandReplicationPipeline.state.isRunning && brandReplicationPipeline.state.currentPhase === 'validation'
                      ? 'Validating...'
                      : 'Run Quality Check'}
                  </Button>
                )}
              </div>

              {pipelineValidationOutput && (
                <div className="p-4 bg-zinc-950/50">
                  <QualityDashboard
                    validationResult={pipelineValidationOutput}
                    onApprove={handleApproveQuality}
                    onRevalidate={handleRevalidate}
                    isLoading={brandReplicationPipeline.state.isRunning && brandReplicationPipeline.state.currentPhase === 'validation'}
                  />
                </div>
              )}

              {/* Validation Phase Status */}
              {brandReplicationPipeline.state.isRunning && brandReplicationPipeline.state.currentPhase === 'validation' && (
                <div className="p-3 bg-blue-900/30 border-t border-blue-500/30 flex items-center gap-3">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span className="text-sm text-blue-300">Running comprehensive quality validation...</span>
                </div>
              )}
            </div>
          )}
          </>
        );

      case 'publish':
        return style && layout && preview ? (
          <PublishOptionsStep
            topic={topic}
            brief={brief}
            style={style}
            layout={layout}
            styledContent={preview}
            supabaseUrl={supabaseUrl}
            supabaseAnonKey={supabaseAnonKey}
            onSuccess={handlePublishSuccess}
          />
        ) : null;

      default:
        return null;
    }
  };

  // Footer buttons
  const footerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {currentStep !== 'brand' && (
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={isGenerating}
          >
            Back
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Error display */}
        {errors.length > 0 && (
          <span className="text-sm text-red-400">
            {errors[0]}
          </span>
        )}

        {/* Next/Publish button */}
        {currentStep !== 'publish' ? (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={isGenerating || !style || !layout}
          >
            {isGenerating ? 'Generating...' : 'Next'}
          </Button>
        ) : null}
      </div>
    </div>
  );

  const stepProgressAndContent = (
    <>
      {/* Step Progress */}
      <div className="flex items-center justify-between mb-6 px-4">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = index < currentStepIndex;
          const isClickable = index <= currentStepIndex;

          return (
            <React.Fragment key={step.id}>
              {/* Step indicator */}
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                disabled={!isClickable}
                className={`
                  flex flex-col items-center gap-1 transition-all
                  ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                `}
              >
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-lg
                    transition-all
                    ${isActive
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900'
                      : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? '✓' : step.icon}
                </div>
                <span
                  className={`
                    text-xs font-medium
                    ${isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-500'}
                  `}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2
                    ${index < currentStepIndex ? 'bg-green-600' : 'bg-gray-700'}
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStepContent()}
      </div>
    </>
  );

  if (asPage) {
    return (
      <div className="-m-4">
        <Card className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden p-6">
          <div className="flex-shrink-0">
            <button
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-gray-300 mb-1"
            >
              &larr; Back to Draft
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Style & Publish</h2>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {stepProgressAndContent}
          </div>
          <div className="border-t border-gray-700 pt-4 mt-4 flex-shrink-0">
            {footerContent}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Style & Publish"
      maxWidth="max-w-5xl"
      footer={footerContent}
      headerIcon={<span className="text-2xl">🎨</span>}
    >
      {stepProgressAndContent}
    </Modal>
  );
};

export default StylePublishModal;
