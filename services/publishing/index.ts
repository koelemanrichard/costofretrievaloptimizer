/**
 * Publishing Services Module
 *
 * Re-exports all publishing-related services for styled content publishing.
 *
 * @module services/publishing
 */

// Style Configuration
export {
  brandKitToDesignTokens,
  designTokensToCssVariables,
  cssVariablesToString,
  createPublishingStyle,
  getProjectStyles,
  getDefaultStyle,
  getStyleById,
  updatePublishingStyle,
  deletePublishingStyle,
  createStyleFromBrandKit,
  createStyleFromPreset,
  createInMemoryStyle,
  mergeDesignTokens,
} from './styleConfigService';

// Layout Configuration
export {
  createLayoutTemplate,
  getUserLayoutTemplates,
  getLayoutTemplatesByType,
  getDefaultLayoutTemplate,
  getLayoutTemplateById,
  updateLayoutTemplate,
  deleteLayoutTemplate,
  countEnabledComponents,
  toggleComponent,
  updateComponentConfig,
  resetToTemplateDefaults,
  createInMemoryLayout,
  cloneLayout,
  getTemplateInfoForLayout,
  validateComponentConfig,
} from './layoutConfigService';

// Component Detection
export {
  detectComponents,
  detectComponentByType,
  hasComponent,
  extractFaqItems,
  extractKeyTakeaways,
  extractHeadings,
  suggestTemplateFromContent,
  getComponentSummary,
} from './componentDetector';

// Styled HTML Generation
export {
  generateStyledContent,
  calculateReadTime,
  generateStandaloneHtml,
} from './styledHtmlGenerator';
