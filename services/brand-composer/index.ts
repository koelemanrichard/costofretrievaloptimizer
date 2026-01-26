/**
 * Brand Composer Module
 *
 * Composes content using extracted brand components.
 * Preserves SEO semantic markup while applying brand styling.
 */

export { ContentMatcher } from './ContentMatcher';
export type { ContentBlock } from './ContentMatcher';

export { StandaloneCssGenerator } from './StandaloneCssGenerator';

export { BrandAwareComposer } from './BrandAwareComposer';

// Re-export types
export type {
  ComponentMatch,
  SynthesizedComponent,
  BrandReplicationOutput,
} from '../../types/brandExtraction';
