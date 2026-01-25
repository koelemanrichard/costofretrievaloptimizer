/**
 * Style & Publish Modal
 *
 * 3-step modal for styled content publishing:
 * 1. Brand - One-click brand detection with AI Vision
 * 2. Preview - Live preview with layout/blueprint panels
 * 3. Publish - WordPress settings and publish
 *
 * @module components/publishing/StylePublishModal
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { getSupabaseClient } from '../../services/supabaseClient';
import { BrandStep } from './steps/BrandStep';
import { PreviewStep } from './steps/PreviewStep';
import { PublishOptionsStep } from './steps/PublishOptionsStep';
import { useDesignInheritance } from '../../hooks/useDesignInheritance';
import type { DesignDNA, BrandDesignSystem } from '../../types/designDna';
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
}) => {
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

  // Design inheritance - load project/map level settings
  const supabaseClient = useMemo(
    () => getSupabaseClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey]
  );

  const designInheritance = useDesignInheritance({
    supabase: supabaseClient,
    projectId: projectId || '',
    topicalMapId: topic.map_id,
    skipInitialLoad: !projectId, // Skip if no project ID
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
      setDetectedDesignDna(null);
      setDetectedDesignSystem(null);
      setDetectedScreenshot(null);
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

  // Get current step index
  const currentStepIndex = useMemo(() =>
    STEPS.findIndex(s => s.id === currentStep),
    [currentStep]
  );

  // Generate blueprint using the heuristic approach
  const generateBlueprint = useCallback(async (styleOverride?: DesignTokens, personalityOverride?: DesignPersonalityId) => {
    if (!articleDraft) return;
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
          // HOLISTIC FIX: Use the ACTUAL design tokens from state
          styleOverride: style?.designTokens,
          personalityOverride: activePersonality
        }
      );

      // Analyze blueprint quality
      const quality = analyzeBlueprintQuality(generatedBlueprint);
      setBlueprintQuality(quality);

      setBlueprint(generatedBlueprint);

      // Fetch learned preferences in the background
      fetchLearnedPreferences();
    } catch (error) {
      console.error('Error generating blueprint:', error);
      setErrors(['Failed to generate layout blueprint. Please try again.']);
    } finally {
      setIsBlueprintGenerating(false);
    }
  }, [articleDraft, topic.title, topic.id, brief, personalityId, style, topicalMap?.business_info, supabaseUrl, supabaseAnonKey]);

  // Handle brand detection completion from BrandStep
  const handleBrandDetectionComplete = useCallback((result: {
    designDna: DesignDNA;
    designSystem: BrandDesignSystem;
    screenshotBase64: string;
  }) => {
    console.log('[Style & Publish] Brand detection complete:', result);

    // Store the detection results
    setDetectedDesignDna(result.designDna);
    setDetectedDesignSystem(result.designSystem);
    setDetectedScreenshot(result.screenshotBase64);

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

    // Auto-generate blueprint with the new design tokens
    console.log('[Style & Publish] Auto-generating blueprint with detected colors...');
    generateBlueprint(newTokens, suggestedPersonality);
    setPreview(null);
  }, [generateBlueprint]);

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
  const generatePreview = useCallback(async () => {
    if (!style || !layout) {
      setErrors(['Style and layout configuration required']);
      return;
    }

    setIsGenerating(true);
    setErrors([]);

    try {
      // If we have a blueprint, use the new blueprint renderer
      if (blueprint) {
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

        const output = renderBlueprint(
          blueprint,
          topic.title,
          {
            brief,
            topic,
            topicalMap,
            personalityId: personalityId,
            language,
            heroImage: layout.components.hero.imageUrl,
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
  }, [style, layout, articleDraft, topic, brief, personalityId, blueprint]);

  // Navigation handlers
  const handleNext = useCallback(async () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      const nextStep = STEPS[nextIndex].id;

      // Generate blueprint if not already generated when moving to preview
      if (nextStep === 'preview' && !blueprint) {
        await generateBlueprint();
      }

      // Generate preview when entering preview step
      if (nextStep === 'preview') {
        await generatePreview();
      }

      setCurrentStep(nextStep);
    }
  }, [currentStepIndex, generatePreview, generateBlueprint, blueprint]);

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

  // Get API keys from topical map business info
  const apifyToken = (topicalMap?.business_info as any)?.apifyToken || '';
  const geminiApiKey = (topicalMap?.business_info as any)?.geminiApiKey || localStorage.getItem('gemini_api_key') || '';
  const anthropicApiKey = (topicalMap?.business_info as any)?.anthropicApiKey || localStorage.getItem('anthropic_api_key') || '';

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'brand':
        return (
          <BrandStep
            defaultDomain={topicalMap?.business_info?.domain}
            apifyToken={apifyToken}
            geminiApiKey={geminiApiKey}
            anthropicApiKey={anthropicApiKey}
            supabaseUrl={supabaseUrl}
            supabaseAnonKey={supabaseAnonKey}
            projectId={projectId}
            onDetectionComplete={handleBrandDetectionComplete}
            onDesignDnaChange={setDetectedDesignDna}
          />
        );

      case 'preview':
        return (
          <PreviewStep
            preview={preview}
            isGenerating={isGenerating}
            onRegenerate={generatePreview}
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
          />
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Style & Publish"
      maxWidth="max-w-5xl"
      footer={footerContent}
      headerIcon={<span className="text-2xl">🎨</span>}
    >
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
    </Modal>
  );
};

export default StylePublishModal;
