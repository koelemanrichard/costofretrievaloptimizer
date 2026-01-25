// services/design-analysis/index.ts
/**
 * Design Analysis Services
 *
 * AI Vision-First Brand Design System extraction and generation.
 */

// Core Services
export { BrandDiscoveryService } from './BrandDiscoveryService';
export { DesignQualityValidator } from './DesignQualityValidator';
export { AIDesignAnalyzer } from './AIDesignAnalyzer';
export { BrandDesignSystemGenerator } from './BrandDesignSystemGenerator';

// Storage
export {
  initBrandDesignSystemStorage,
  saveDesignDNA,
  getDesignDNA,
  saveBrandDesignSystem,
  getBrandDesignSystem,
  hasDesignSystemForHash
} from './brandDesignSystemStorage';

// Prompts (for debugging/inspection)
export { DESIGN_DNA_EXTRACTION_PROMPT, DESIGN_DNA_VALIDATION_PROMPT } from './prompts/designDnaPrompt';
export { buildDesignSystemGenerationPrompt } from './prompts/designSystemPrompt';
