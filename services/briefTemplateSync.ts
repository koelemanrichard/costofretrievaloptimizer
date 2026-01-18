/**
 * Brief Template Sync Service
 *
 * Syncs template selection and settings back to the content brief,
 * ensuring the brief remains the single source of truth.
 */

import { ContentBrief, BriefSection } from '../types';
import { TemplateName, TemplateConfig, DepthMode } from '../types/contentTemplates';
import { getTemplateByName } from '../config/contentTemplates';

/**
 * Sync template selection to brief
 */
export function syncBriefWithTemplate(
  brief: ContentBrief,
  templateName: TemplateName,
  confidence: number,
  depthMode: DepthMode,
  conflictResolution?: 'template' | 'brief' | 'merge'
): ContentBrief {
  return {
    ...brief,
    selectedTemplate: templateName,
    templateConfidence: confidence,
    depthMode: depthMode,
    conflictResolution: conflictResolution,
  };
}

/**
 * Apply template format codes to brief sections
 */
export function applyTemplateFormatCodes(
  brief: ContentBrief,
  template: TemplateConfig,
  options?: { preserveExisting?: boolean }
): ContentBrief {
  const preserveExisting = options?.preserveExisting ?? false;

  if (!brief.structured_outline) {
    return brief;
  }

  const updatedOutline = brief.structured_outline.map((section) => {
    // Skip if preserving existing format codes
    if (preserveExisting && section.format_code) {
      return section;
    }

    // Find matching template section
    const matchingTemplate = findMatchingTemplateSection(
      section.heading || '',
      template.sectionStructure
    );

    if (matchingTemplate) {
      return {
        ...section,
        format_code: matchingTemplate.formatCode,
        attribute_category: matchingTemplate.attributeCategory,
        content_zone: matchingTemplate.contentZone,
      };
    }

    return section;
  });

  return {
    ...brief,
    structured_outline: updatedOutline,
  };
}

/**
 * Find matching template section by heading
 */
function findMatchingTemplateSection(
  heading: string,
  templateSections: TemplateConfig['sectionStructure']
) {
  const normalizedHeading = heading.toLowerCase().replace(/[^\w\s]/g, '');

  for (const templateSection of templateSections) {
    const pattern = templateSection.headingPattern
      .toLowerCase()
      .replace(/{[^}]+}/g, '') // Remove placeholders
      .replace(/[^\w\s]/g, '')
      .trim();

    // Check if heading contains key words from pattern
    const patternWords = pattern.split(/\s+/).filter(w => w.length > 3);
    const headingWords = normalizedHeading.split(/\s+/);

    const matchCount = patternWords.filter(pw =>
      headingWords.some(hw => hw.includes(pw) || pw.includes(hw))
    ).length;

    if (matchCount >= Math.min(2, patternWords.length)) {
      return templateSection;
    }
  }

  return null;
}

/**
 * Update brief with depth settings
 */
export function applyDepthSettings(
  brief: ContentBrief,
  depthMode: DepthMode,
  settings: { maxSections: number; targetWordCount: { min: number; max: number } }
): ContentBrief {
  return {
    ...brief,
    depthMode,
    suggestedLengthPreset: depthMode === 'high-quality' ? 'comprehensive'
      : depthMode === 'moderate' ? 'standard'
      : 'short',
    suggestedLengthReason: `Depth mode: ${depthMode} (${settings.targetWordCount.min}-${settings.targetWordCount.max} words target)`,
  };
}
