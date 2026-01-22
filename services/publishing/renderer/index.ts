/**
 * Blueprint Renderer Module
 *
 * Exports all renderer-related services for converting blueprints to HTML.
 *
 * @module services/publishing/renderer
 */

// Blueprint Renderer
export {
  renderBlueprint,
  mapVisualStyleToPersonality,
} from './blueprintRenderer';

export type {
  BlueprintRenderOptions,
  BlueprintRenderOutput,
} from './blueprintRenderer';

// Component Library
export {
  getComponentRenderer,
  hasRenderer,
  getAvailableComponents,
  markdownToHtml,
  extractListItems,
  extractFaqItems,
  extractSteps,
} from './componentLibrary';

export type {
  RenderContext,
  RenderedComponent,
  ComponentRenderer,
} from './componentLibrary';
