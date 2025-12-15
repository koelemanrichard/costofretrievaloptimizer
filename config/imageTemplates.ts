// config/imageTemplates.ts
import { HeroTemplate, ImageSpecs } from '../types';

// Default MarkupGo template ID - can be overridden per topical map in BrandKit
export const DEFAULT_MARKUPGO_TEMPLATE_ID = '66f12ae34178cfcb1e927b62';

export const DEFAULT_HERO_TEMPLATES: HeroTemplate[] = [
  {
    id: 'bold-center',
    name: 'Bold Center',
    description: 'Large title centered with gradient overlay',
    style: {
      textPosition: 'center',
      hasGradientOverlay: true,
      hasSubtitle: false,
    },
  },
  {
    id: 'bottom-bar',
    name: 'Bottom Bar',
    description: 'Title at bottom with dark bar overlay',
    style: {
      textPosition: 'bottom-center',
      hasGradientOverlay: true,
      hasSubtitle: true,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Small title, large visual space',
    style: {
      textPosition: 'bottom-left',
      hasGradientOverlay: false,
      hasSubtitle: false,
    },
  },
  {
    id: 'gradient-fade',
    name: 'Gradient Fade',
    description: 'Title fades into background',
    style: {
      textPosition: 'center',
      hasGradientOverlay: true,
      hasSubtitle: true,
    },
  },
];

export const IMAGE_SPECS_BY_TYPE: Record<string, Omit<ImageSpecs, 'textOverlay' | 'logoOverlay'>> = {
  HERO: {
    width: 1200,
    height: 630,
    format: 'avif' as const,
    maxFileSize: 100,
  },
  SECTION: {
    width: 800,
    height: 600,
    format: 'webp' as const,
    maxFileSize: 80,
  },
  INFOGRAPHIC: {
    width: 800,
    height: 1200,
    format: 'png' as const,
    maxFileSize: 200,
  },
  CHART: {
    width: 800,
    height: 600,
    format: 'png' as const,
    maxFileSize: 100,
  },
  DIAGRAM: {
    width: 1000,
    height: 600,
    format: 'png' as const,
    maxFileSize: 150,
  },
  AUTHOR: {
    width: 400,
    height: 400,
    format: 'webp' as const,
    maxFileSize: 50,
  },
};
