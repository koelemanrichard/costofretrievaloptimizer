/**
 * Layout Configuration Step
 *
 * Step 2 of Style & Publish modal.
 * Select template and configure component toggles.
 *
 * @module components/publishing/steps/LayoutConfigStep
 */

import React, { useCallback, useMemo } from 'react';
import { Label } from '../../ui/Label';
import { Select } from '../../ui/Select';
import type {
  LayoutConfiguration,
  ContentTypeTemplate,
  ComponentConfig,
} from '../../../types/publishing';
import { contentTemplates, getDefaultComponents } from '../../../config/publishingTemplates';
import {
  getComponentSummary,
  suggestTemplateFromContent,
} from '../../../services/publishing/componentDetector';

// ============================================================================
// Types
// ============================================================================

interface LayoutConfigStepProps {
  layout: LayoutConfiguration;
  content: string;
  onChange: (updates: Partial<LayoutConfiguration>) => void;
  onTemplateChange: (template: ContentTypeTemplate) => void;
}

interface ToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

// ============================================================================
// Toggle Component
// ============================================================================

const Toggle: React.FC<ToggleProps> = ({
  label,
  description,
  enabled,
  onChange,
  disabled = false,
}) => (
  <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors
    ${enabled ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-gray-800 border border-gray-700'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-750'}
  `}>
    <div className="relative flex-shrink-0 mt-0.5">
      <input
        type="checkbox"
        checked={enabled}
        onChange={e => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <div className={`w-10 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-600'}`}>
        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
    </div>
    <div className="flex-1">
      <span className="text-sm font-medium text-white">{label}</span>
      {description && (
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
  </label>
);

// ============================================================================
// Component
// ============================================================================

export const LayoutConfigStep: React.FC<LayoutConfigStepProps> = ({
  layout,
  content,
  onChange,
  onTemplateChange,
}) => {
  // Analyze content for suggestions
  const contentSummary = useMemo(() => getComponentSummary(content), [content]);
  const templateSuggestion = useMemo(() => suggestTemplateFromContent(content), [content]);

  // Update component configuration
  const updateComponents = useCallback((
    updates: Partial<ComponentConfig>
  ) => {
    onChange({
      components: {
        ...layout.components,
        ...updates,
      },
    });
  }, [layout.components, onChange]);

  // Toggle specific component
  const toggleComponent = useCallback((
    componentKey: keyof ComponentConfig,
    subKey: string,
    value: boolean
  ) => {
    const current = layout.components[componentKey] as Record<string, unknown>;
    updateComponents({
      [componentKey]: {
        ...current,
        [subKey]: value,
      },
    });
  }, [layout.components, updateComponents]);

  // Template change
  const handleTemplateChange = useCallback((templateId: string) => {
    onTemplateChange(templateId as ContentTypeTemplate);
  }, [onTemplateChange]);

  // Current template info
  const currentTemplate = useMemo(
    () => contentTemplates.find(t => t.id === layout.template),
    [layout.template]
  );

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Content Template</Label>
          {templateSuggestion.confidence > 0.5 && templateSuggestion.template !== layout.template && (
            <button
              type="button"
              onClick={() => handleTemplateChange(templateSuggestion.template)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Suggested: {contentTemplates.find(t => t.id === templateSuggestion.template)?.name}
            </button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2">
          {contentTemplates.map(template => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleTemplateChange(template.id)}
              className={`
                p-3 rounded-lg text-center transition-all border
                ${layout.template === template.id
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }
              `}
            >
              <span className="text-2xl block mb-1">{template.icon}</span>
              <span className="text-xs font-medium text-white">{template.name}</span>
            </button>
          ))}
        </div>

        {currentTemplate && (
          <p className="text-sm text-gray-400">{currentTemplate.description}</p>
        )}
      </div>

      {/* Content Analysis */}
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-white mb-2">Detected Content</h4>
        <div className="flex flex-wrap gap-2">
          {contentSummary.hasFaq && (
            <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">FAQ Section</span>
          )}
          {contentSummary.hasTakeaways && (
            <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">Key Takeaways</span>
          )}
          {contentSummary.hasImages && (
            <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded">{contentSummary.byType['image']} Images</span>
          )}
          {contentSummary.hasTables && (
            <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded">{contentSummary.byType['table']} Tables</span>
          )}
          <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
            {contentSummary.total} components total
          </span>
        </div>
      </div>

      {/* Component Toggles */}
      <div className="grid grid-cols-2 gap-4">
        {/* Layout Components */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">Layout Components</h4>

          <Toggle
            label="Hero Section"
            description="Full-width header with title"
            enabled={layout.components.hero.enabled}
            onChange={v => toggleComponent('hero', 'enabled', v)}
          />

          <Toggle
            label="Table of Contents"
            description={layout.components.toc.position === 'sidebar' ? 'Sticky sidebar navigation' : 'Inline navigation'}
            enabled={layout.components.toc.enabled}
            onChange={v => toggleComponent('toc', 'enabled', v)}
          />

          {layout.components.toc.enabled && (
            <div className="ml-12">
              <Label className="text-xs">Position</Label>
              <Select
                value={layout.components.toc.position}
                onChange={e => updateComponents({
                  toc: { ...layout.components.toc, position: e.target.value as 'sidebar' | 'inline' | 'floating' },
                })}
                className="text-sm"
              >
                <option value="sidebar">Sidebar (sticky)</option>
                <option value="inline">Inline</option>
                <option value="floating">Floating</option>
              </Select>
            </div>
          )}

          <Toggle
            label="Author Box"
            description="Author information display"
            enabled={layout.components.authorBox.enabled}
            onChange={v => toggleComponent('authorBox', 'enabled', v)}
          />
        </div>

        {/* Content Components */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">Content Components</h4>

          <Toggle
            label="Key Takeaways"
            description="Summary box with bullet points"
            enabled={layout.components.keyTakeaways.enabled}
            onChange={v => toggleComponent('keyTakeaways', 'enabled', v)}
          />

          {layout.components.keyTakeaways.enabled && (
            <div className="ml-12">
              <Label className="text-xs">Style</Label>
              <Select
                value={layout.components.keyTakeaways.style}
                onChange={e => updateComponents({
                  keyTakeaways: { ...layout.components.keyTakeaways, style: e.target.value as 'box' | 'numbered-list' | 'icon-list' },
                })}
                className="text-sm"
              >
                <option value="box">Box</option>
                <option value="numbered-list">Numbered List</option>
                <option value="icon-list">Icon List</option>
              </Select>
            </div>
          )}

          <Toggle
            label="FAQ Section"
            description={`${contentSummary.hasFaq ? 'Found FAQ content' : 'No FAQ detected'}`}
            enabled={layout.components.faq.enabled}
            onChange={v => toggleComponent('faq', 'enabled', v)}
          />

          {layout.components.faq.enabled && (
            <div className="ml-12">
              <Label className="text-xs">Style</Label>
              <Select
                value={layout.components.faq.style}
                onChange={e => updateComponents({
                  faq: { ...layout.components.faq, style: e.target.value as 'accordion' | 'list' | 'grid' },
                })}
                className="text-sm"
              >
                <option value="accordion">Accordion</option>
                <option value="list">List</option>
                <option value="grid">Grid</option>
              </Select>
            </div>
          )}

          <Toggle
            label="Related Content"
            description="Related articles/topics"
            enabled={layout.components.relatedContent.enabled}
            onChange={v => toggleComponent('relatedContent', 'enabled', v)}
          />
        </div>
      </div>

      {/* Conversion Components */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Conversion & CTAs</h4>

        <div className="grid grid-cols-2 gap-4">
          <Toggle
            label="CTA Banners"
            description="Call-to-action sections"
            enabled={layout.components.ctaBanners.enabled}
            onChange={v => toggleComponent('ctaBanners', 'enabled', v)}
          />

          {layout.components.ctaBanners.enabled && (
            <div className="space-y-2">
              <Label className="text-xs">CTA Intensity</Label>
              <Select
                value={layout.components.ctaBanners.intensity}
                onChange={e => updateComponents({
                  ctaBanners: {
                    ...layout.components.ctaBanners,
                    intensity: e.target.value as 'none' | 'low' | 'medium' | 'high',
                  },
                })}
                className="text-sm"
              >
                <option value="low">Low (end only)</option>
                <option value="medium">Medium (mid + end)</option>
                <option value="high">High (multiple)</option>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Reading Experience */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Reading Experience</h4>

        <div className="grid grid-cols-3 gap-3">
          <Toggle
            label="Progress Bar"
            enabled={layout.components.readingExperience.progressBar}
            onChange={v => updateComponents({
              readingExperience: { ...layout.components.readingExperience, progressBar: v },
            })}
          />

          <Toggle
            label="Read Time"
            enabled={layout.components.readingExperience.estimatedReadTime}
            onChange={v => updateComponents({
              readingExperience: { ...layout.components.readingExperience, estimatedReadTime: v },
            })}
          />

          <Toggle
            label="Social Share"
            enabled={layout.components.readingExperience.socialShare}
            onChange={v => updateComponents({
              readingExperience: { ...layout.components.readingExperience, socialShare: v },
            })}
          />
        </div>
      </div>

      {/* Template-specific components */}
      {layout.template === 'landing-page' && layout.components.landing && (
        <div className="space-y-3 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300">Landing Page Components</h4>

          <div className="grid grid-cols-2 gap-3">
            <Toggle
              label="Benefits Section"
              enabled={layout.components.landing.benefits.enabled}
              onChange={v => updateComponents({
                landing: { ...layout.components.landing!, benefits: { ...layout.components.landing!.benefits, enabled: v } },
              })}
            />

            <Toggle
              label="Process Steps"
              enabled={layout.components.landing.processSteps.enabled}
              onChange={v => updateComponents({
                landing: { ...layout.components.landing!, processSteps: { ...layout.components.landing!.processSteps, enabled: v } },
              })}
            />

            <Toggle
              label="Testimonials"
              enabled={layout.components.landing.testimonials.enabled}
              onChange={v => updateComponents({
                landing: { ...layout.components.landing!, testimonials: { ...layout.components.landing!.testimonials, enabled: v } },
              })}
            />

            <Toggle
              label="Social Proof"
              enabled={layout.components.landing.socialProof.enabled}
              onChange={v => updateComponents({
                landing: { ...layout.components.landing!, socialProof: { ...layout.components.landing!.socialProof, enabled: v } },
              })}
            />
          </div>
        </div>
      )}

      {layout.template === 'ecommerce-product' && layout.components.product && (
        <div className="space-y-3 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300">Product Page Components</h4>

          <div className="grid grid-cols-2 gap-3">
            <Toggle
              label="Specs Table"
              enabled={layout.components.product.specsTable.enabled}
              onChange={v => updateComponents({
                product: { ...layout.components.product!, specsTable: { ...layout.components.product!.specsTable, enabled: v } },
              })}
            />

            <Toggle
              label="Image Gallery"
              enabled={layout.components.product.gallery.enabled}
              onChange={v => updateComponents({
                product: { ...layout.components.product!, gallery: { ...layout.components.product!.gallery, enabled: v } },
              })}
            />

            <Toggle
              label="Reviews"
              enabled={layout.components.product.reviews.enabled}
              onChange={v => updateComponents({
                product: { ...layout.components.product!, reviews: { ...layout.components.product!.reviews, enabled: v } },
              })}
            />

            <Toggle
              label="Pricing"
              enabled={layout.components.product.pricing.enabled}
              onChange={v => updateComponents({
                product: { ...layout.components.product!, pricing: { ...layout.components.product!.pricing, enabled: v } },
              })}
            />
          </div>
        </div>
      )}

      {layout.template === 'service-page' && layout.components.service && (
        <div className="space-y-3 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300">Service Page Components</h4>

          <div className="grid grid-cols-2 gap-3">
            <Toggle
              label="Process Steps"
              enabled={layout.components.service.processSteps.enabled}
              onChange={v => updateComponents({
                service: { ...layout.components.service!, processSteps: { ...layout.components.service!.processSteps, enabled: v } },
              })}
            />

            <Toggle
              label="Team Section"
              enabled={layout.components.service.team.enabled}
              onChange={v => updateComponents({
                service: { ...layout.components.service!, team: { ...layout.components.service!.team, enabled: v } },
              })}
            />

            <Toggle
              label="Portfolio"
              enabled={layout.components.service.portfolio.enabled}
              onChange={v => updateComponents({
                service: { ...layout.components.service!, portfolio: { ...layout.components.service!.portfolio, enabled: v } },
              })}
            />

            <Toggle
              label="Contact CTA"
              enabled={layout.components.service.contactCta.enabled}
              onChange={v => updateComponents({
                service: { ...layout.components.service!, contactCta: { ...layout.components.service!.contactCta, enabled: v } },
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutConfigStep;
