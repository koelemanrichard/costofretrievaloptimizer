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
  generateStyledContent,
  calculateReadTime,
} from '../../services/publishing/styledHtmlGenerator';
import { suggestTemplate } from '../../config/publishingTemplates';

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
  const [preview, setPreview] = useState<StyledContentOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize style and layout on open
  useEffect(() => {
    if (isOpen && !style) {
      // Create initial style from BrandKit or default
      const initialStyle = createInMemoryStyle(brandKit, 'Project Style');
      setStyle(initialStyle);

      // Suggest template based on content
      const suggestedTemplate = suggestTemplate(articleDraft, topic.topic);
      const initialLayout = createInMemoryLayout(suggestedTemplate);
      setLayout(initialLayout);
    }
  }, [isOpen, style, brandKit, articleDraft, topic.topic]);

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

  // Generate preview when entering preview step
  const generatePreview = useCallback(async () => {
    if (!style || !layout) {
      setErrors(['Style and layout configuration required']);
      return;
    }

    setIsGenerating(true);
    setErrors([]);

    try {
      const readTime = calculateReadTime(articleDraft);

      const output = generateStyledContent(
        articleDraft,
        style,
        layout,
        {
          title: topic.topic,
          authorName: brief?.author?.name,
          authorBio: brief?.author?.bio,
          publishDate: new Date().toISOString(),
          readTime,
          ctaText: layout.components.ctaBanners.primaryText || 'Learn More',
          ctaUrl: '#',
        }
      );

      setPreview(output);

      // Check for SEO warnings
      if (!output.seoValidation.isValid) {
        const seoErrors = output.seoValidation.warnings
          .filter(w => w.severity === 'error')
          .map(w => w.message);
        if (seoErrors.length > 0) {
          setErrors(seoErrors);
        }
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      setErrors(['Failed to generate preview. Please try again.']);
    } finally {
      setIsGenerating(false);
    }
  }, [style, layout, articleDraft, topic.topic, brief]);

  // Navigation handlers
  const handleNext = useCallback(async () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      const nextStep = STEPS[nextIndex].id;

      // Generate preview when entering preview step
      if (nextStep === 'preview') {
        await generatePreview();
      }

      setCurrentStep(nextStep);
    }
  }, [currentStepIndex, generatePreview]);

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
