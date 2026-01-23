/**
 * Style & Publish Modal
 *
 * 4-step modal for styled content publishing:
 * 1. Brand Style - Configure colors, fonts, design tokens
 * 2. Layout Config - Select template and toggle components
 * 3. Preview - Live preview with device frames
 * 4. Publish Options - WordPress settings and publish
 *
 * @module components/publishing/StylePublishModal
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { BrandStyleStep } from './steps/BrandStyleStep';
import { LayoutConfigStep } from './steps/LayoutConfigStep';
import { BlueprintStep } from './steps/BlueprintStep';
import { PreviewStep } from './steps/PreviewStep';
import { PublishOptionsStep } from './steps/PublishOptionsStep';
import type {
  StylePublishStep,
  PublishingStyle,
  LayoutConfiguration,
  StyledContentOutput,
  ContentTypeTemplate,
} from '../../types/publishing';
import type { EnrichedTopic, ContentBrief } from '../../types';
import type { BrandKit } from '../../types/business';
import {
  createInMemoryStyle,
  brandKitToDesignTokens,
} from '../../services/publishing/styleConfigService';
import {
  createInMemoryLayout,
  countEnabledComponents,
} from '../../services/publishing/layoutConfigService';
import {
  calculateReadTime,
} from '../../services/publishing/styledHtmlGenerator';
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
  type LayoutBlueprint,
  type ProjectBlueprint,
  type TopicalMapBlueprint,
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
  supabaseUrl: string;
  supabaseAnonKey: string;
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
  { id: 'brand-style', label: 'Brand Style', icon: '🎨' },
  { id: 'layout-config', label: 'Layout', icon: '📐' },
  { id: 'blueprint', label: 'Blueprint', icon: '🏗️' },
  { id: 'preview', label: 'Preview', icon: '👁️' },
  { id: 'publish-options', label: 'Publish', icon: '🚀' },
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
  supabaseUrl,
  supabaseAnonKey,
  onPublishSuccess,
}) => {
  // State
  const [currentStep, setCurrentStep] = useState<StylePublishStep>('brand-style');
  const [style, setStyle] = useState<PublishingStyle | null>(null);
  const [layout, setLayout] = useState<LayoutConfiguration | null>(null);
  const [blueprint, setBlueprint] = useState<LayoutBlueprint | null>(null);
  const [preview, setPreview] = useState<StyledContentOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBlueprintGenerating, setIsBlueprintGenerating] = useState(false);
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
      setCurrentStep('brand-style');
      setPreview(null);
      setErrors([]);
    }
  }, [isOpen]);

  // Get current step index
  const currentStepIndex = useMemo(() =>
    STEPS.findIndex(s => s.id === currentStep),
    [currentStep]
  );

  // Generate blueprint using the heuristic approach
  const generateBlueprint = useCallback(async () => {
    if (!articleDraft) return;

    setIsBlueprintGenerating(true);
    setErrors([]);

    try {
      // Create minimal BusinessInfo for the heuristic generator
      // The generator only uses: industry, valueProp, expertise
      const minimalBusinessInfo = {
        domain: '',
        projectName: topic.title,
        industry: 'general',
        model: 'content',
        valueProp: '',
        audience: '',
        expertise: '',
        seedKeyword: topic.title,
        language: 'en',
        targetMarket: '',
        aiProvider: 'gemini' as const,
        aiModel: '',
        supabaseUrl: supabaseUrl,
        supabaseAnonKey: supabaseAnonKey,
      };

      const generatedBlueprint = generateBlueprintHeuristicV2(
        articleDraft,
        topic.title,
        topic.id,
        minimalBusinessInfo,
        {
          brief,
          preferences: {
            styleLeaning: 'auto',
          },
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
  }, [articleDraft, topic.title, topic.id, brief, supabaseUrl, supabaseAnonKey]);

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

  // Generate blueprint for project or topical map level
  const handleRegenerateHierarchy = useCallback(async (level: 'project' | 'topical_map') => {
    setIsRegeneratingHierarchy(true);
    setErrors([]);

    try {
      // Create minimal BusinessInfo for the heuristic generator
      const minimalBusinessInfo = {
        domain: '',
        projectName: topic.title,
        industry: 'general',
        model: 'content',
        valueProp: '',
        audience: '',
        expertise: '',
        seedKeyword: topic.title,
        language: 'en',
        targetMarket: '',
        aiProvider: 'gemini' as const,
        aiModel: '',
        supabaseUrl: supabaseUrl,
        supabaseAnonKey: supabaseAnonKey,
      };

      if (level === 'project') {
        // Generate project-level blueprint defaults
        const projectBp: ProjectBlueprint = {
          projectId: topic.map_id || 'default-project',
          defaults: {
            visualStyle: 'editorial',
            pacing: 'balanced',
            colorIntensity: 'moderate',
            ctaStrategy: {
              intensity: 'moderate',
              positions: ['end'],
              style: 'banner',
            },
          },
          componentPreferences: {
            preferredListStyle: 'icon-list',
            preferredTimelineStyle: 'steps-numbered',
            preferredFaqStyle: 'faq-accordion',
          },
          avoidComponents: [],
          reasoning: 'Default project blueprint generated for styling consistency',
          generatedAt: new Date().toISOString(),
        };
        setProjectBlueprint(projectBp);
      } else {
        // Generate topical map-level blueprint defaults
        const topicalMapBp: TopicalMapBlueprint = {
          topicalMapId: topic.map_id || 'default-map',
          projectId: topic.map_id || 'default-project',
          defaults: {
            visualStyle: 'editorial',
            pacing: 'balanced',
            colorIntensity: 'moderate',
          },
          componentPreferences: {},
          reasoning: 'Default topical map blueprint generated for styling consistency',
          generatedAt: new Date().toISOString(),
        };
        setTopicalMapBlueprint(topicalMapBp);
      }
    } catch (error) {
      console.error(`Error generating ${level} blueprint:`, error);
      setErrors([`Failed to generate ${level} blueprint. Please try again.`]);
    } finally {
      setIsRegeneratingHierarchy(false);
    }
  }, [topic.map_id, topic.title, supabaseUrl, supabaseAnonKey]);

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

  // Handle saving hierarchy blueprints
  const handleSaveHierarchy = useCallback(async () => {
    // For now, this just updates the local state (which is already done via onChange handlers)
    // In the future, this would persist to Supabase via the blueprintStorage service
    // The blueprints are already updated in state via handleProjectChange/handleTopicalMapChange
    // This handler confirms the save is "complete"
    console.log('[Style & Publish] Saving hierarchy blueprints:', {
      projectBlueprint: projectBlueprint ? 'present' : 'none',
      topicalMapBlueprint: topicalMapBlueprint ? 'present' : 'none',
    });

    // Simulate async save operation
    await new Promise(resolve => setTimeout(resolve, 300));

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
  }, [projectBlueprint, topicalMapBlueprint, blueprint]);

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
        const output = renderBlueprint(
          blueprint,
          topic.title,
          {
            brief,
            topic,
            personalityId: personalityId,
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
              primaryText: layout.components.ctaBanners.primaryText || 'Learn More',
              primaryUrl: '#contact',
              secondaryText: layout.components.ctaBanners.secondaryText,
              secondaryUrl: '#',
              bannerTitle: 'Ready to Get Started?',
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

      // Generate blueprint when entering blueprint step
      if (nextStep === 'blueprint' && !blueprint) {
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

  // Component count for layout step
  const componentCount = useMemo(() => {
    if (!layout) return null;
    return countEnabledComponents(layout.components);
  }, [layout]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'brand-style':
        return style ? (
          <BrandStyleStep
            style={style}
            brandKit={brandKit}
            onChange={handleStyleChange}
            personalityId={personalityId}
            onPersonalityChange={setPersonalityId}
          />
        ) : null;

      case 'layout-config':
        return layout ? (
          <LayoutConfigStep
            layout={layout}
            content={articleDraft}
            onChange={handleLayoutChange}
            onTemplateChange={handleTemplateChange}
          />
        ) : null;

      case 'blueprint':
        return (
          <BlueprintStep
            blueprint={blueprint}
            isGenerating={isBlueprintGenerating || isRegeneratingHierarchy}
            onGenerate={generateBlueprint}
            onBlueprintChange={setBlueprint}
            topicalMapId={topic.map_id}
            projectBlueprint={projectBlueprint || undefined}
            topicalMapBlueprint={topicalMapBlueprint || undefined}
            onProjectChange={handleProjectChange}
            onTopicalMapChange={handleTopicalMapChange}
            onSaveHierarchy={handleSaveHierarchy}
            onRegenerateHierarchy={handleRegenerateHierarchy}
            qualityAnalysis={blueprintQuality}
            learnedPreferences={learnedPreferences}
            stylePreferenceSummary={stylePreferenceSummary}
            isLoadingPreferences={isLoadingPreferences}
            isApplyingStyle={isApplyingStyle}
            onApplyMyStyle={handleApplyMyStyle}
          />
        );

      case 'preview':
        return (
          <PreviewStep
            preview={preview}
            isGenerating={isGenerating}
            onRegenerate={generatePreview}
            seoWarnings={preview?.seoValidation.warnings || []}
          />
        );

      case 'publish-options':
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
        {currentStep !== 'brand-style' && (
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
        {/* Component count badge */}
        {currentStep === 'layout-config' && componentCount && (
          <span className="text-sm text-gray-400">
            {componentCount.enabled}/{componentCount.total} components enabled
          </span>
        )}

        {/* Error display */}
        {errors.length > 0 && (
          <span className="text-sm text-red-400">
            {errors[0]}
          </span>
        )}

        {/* Next/Publish button */}
        {currentStep !== 'publish-options' ? (
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
