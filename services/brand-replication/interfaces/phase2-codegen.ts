// services/brand-replication/interfaces/phase2-codegen.ts

import type { DiscoveredComponent, DiscoveryOutput } from './phase1-discovery';
import type { DesignDNA } from '../../../types/designDna';

export interface CodeGenInput {
  brandId: string;
  discoveryOutput: DiscoveryOutput;
  designDna: DesignDNA;
  existingComponents?: BrandComponent[];
}

export interface BrandComponent {
  id: string;
  brandId: string;
  name: string;
  purpose: string;
  usageContext: string;
  css: string;
  htmlTemplate: string;
  previewHtml: string;
  sourceComponent: DiscoveredComponent;
  matchScore: number;
  variants: ComponentVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ComponentVariant {
  id: string;
  name: string;
  description: string;
  cssOverrides: string;
  htmlTemplate: string;
}

export interface CodeGenOutput {
  brandId: string;
  components: BrandComponent[];
  compiledCss: string;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
  matchScores: { componentId: string; score: number; details: string }[];
}

export interface CodeGenConfig {
  customPrompt?: string;
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  debug?: boolean;
  minMatchScore: number;
  maxIterations: number;
  cssStandards: {
    useCustomProperties: boolean;
    spacingScale: number[];
    requireHoverStates: boolean;
    requireTransitions: boolean;
    requireResponsive: boolean;
  };
}
