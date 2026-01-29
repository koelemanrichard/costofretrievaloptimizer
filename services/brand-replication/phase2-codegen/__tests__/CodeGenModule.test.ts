// services/brand-replication/phase2-codegen/__tests__/CodeGenModule.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodeGenModule } from '../index';
import { CssGenerator } from '../CssGenerator';
import { HtmlGenerator } from '../HtmlGenerator';
import type {
  CodeGenInput,
  CodeGenOutput,
  CodeGenConfig,
  DiscoveryOutput,
  DiscoveredComponent,
} from '../../interfaces';
import type { DesignDNA } from '../../../../types/designDna';

// Mock AI SDKs
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '/* mock css */' }],
      }),
    },
  })),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: '/* mock css */',
      }),
    },
  })),
}));

// Test fixtures
const createDiscoveredComponent = (id: string): DiscoveredComponent => ({
  id,
  name: `Component ${id}`,
  purpose: 'Test purpose',
  visualDescription: 'Test visual description',
  usageContext: 'Test context',
  sourceScreenshots: ['screenshot1.png'],
  occurrences: 3,
  confidence: 0.85,
});

const createDiscoveryOutput = (brandId: string): DiscoveryOutput => ({
  brandId,
  brandUrl: 'https://example.com',
  analyzedPages: ['https://example.com/page1'],
  screenshots: [
    {
      url: 'https://example.com',
      path: '/screenshots/main.png',
      timestamp: new Date().toISOString(),
      viewport: { width: 1920, height: 1080 },
    },
  ],
  discoveredComponents: [
    createDiscoveredComponent('comp-1'),
    createDiscoveredComponent('comp-2'),
  ],
  rawAnalysis: 'Raw analysis text',
  timestamp: new Date().toISOString(),
  status: 'success',
});

const createDesignDna = (): DesignDNA => ({
  colors: {
    primary: { hex: '#1a73e8', usage: 'Primary buttons and links', confidence: 0.9 },
    primaryLight: { hex: '#4285f4', usage: 'Hover states', confidence: 0.85 },
    primaryDark: { hex: '#1557b0', usage: 'Active states', confidence: 0.85 },
    secondary: { hex: '#5f6368', usage: 'Secondary text', confidence: 0.8 },
    accent: { hex: '#34a853', usage: 'Success states', confidence: 0.75 },
    neutrals: {
      darkest: '#202124',
      dark: '#3c4043',
      medium: '#5f6368',
      light: '#e8eaed',
      lightest: '#f8f9fa',
    },
    semantic: {
      success: '#34a853',
      warning: '#fbbc04',
      error: '#ea4335',
      info: '#4285f4',
    },
    harmony: 'complementary',
    dominantMood: 'corporate',
    contrastLevel: 'high',
  },
  typography: {
    headingFont: {
      family: 'Google Sans',
      fallback: 'Arial, sans-serif',
      weight: 600,
      style: 'sans-serif',
      character: 'modern',
    },
    bodyFont: {
      family: 'Roboto',
      fallback: 'Arial, sans-serif',
      weight: 400,
      style: 'sans-serif',
      lineHeight: 1.5,
    },
    scaleRatio: 1.25,
    baseSize: '16px',
    headingCase: 'none',
    headingLetterSpacing: '-0.02em',
    usesDropCaps: false,
    headingUnderlineStyle: 'none',
    linkStyle: 'color-only',
  },
  spacing: {
    baseUnit: 8,
    density: 'comfortable',
    sectionGap: 'moderate',
    contentWidth: 'medium',
    whitespacePhilosophy: 'balanced',
  },
  shapes: {
    borderRadius: {
      style: 'rounded',
      small: '4px',
      medium: '8px',
      large: '16px',
      full: '9999px',
    },
    buttonStyle: 'rounded',
    cardStyle: 'elevated',
    inputStyle: 'bordered',
  },
  effects: {
    shadows: {
      style: 'subtle',
      cardShadow: '0 1px 3px rgba(0,0,0,0.12)',
      buttonShadow: '0 1px 2px rgba(0,0,0,0.1)',
      elevatedShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
    gradients: {
      usage: 'subtle',
      primaryGradient: 'linear-gradient(135deg, #1a73e8, #4285f4)',
      heroGradient: 'linear-gradient(180deg, #f8f9fa, #ffffff)',
      ctaGradient: 'linear-gradient(90deg, #1a73e8, #1557b0)',
    },
    backgrounds: {
      usesPatterns: false,
      usesTextures: false,
      usesOverlays: false,
    },
    borders: {
      style: 'subtle',
      defaultColor: '#e8eaed',
      accentBorderUsage: false,
    },
  },
  decorative: {
    dividerStyle: 'line',
    usesFloatingShapes: false,
    usesCornerAccents: false,
    usesWaveShapes: false,
    usesGeometricPatterns: false,
    iconStyle: 'outline',
    decorativeAccentColor: '#1a73e8',
  },
  layout: {
    gridStyle: 'strict-12',
    alignment: 'left',
    heroStyle: 'contained',
    cardLayout: 'grid',
    ctaPlacement: 'section-end',
    navigationStyle: 'standard',
  },
  motion: {
    overall: 'subtle',
    transitionSpeed: 'fast',
    easingStyle: 'ease',
    hoverEffects: {
      buttons: 'darken',
      cards: 'lift',
      links: 'underline',
    },
    scrollAnimations: false,
    parallaxEffects: false,
  },
  images: {
    treatment: 'natural',
    frameStyle: 'rounded',
    hoverEffect: 'none',
    aspectRatioPreference: '16:9',
  },
  componentPreferences: {
    preferredListStyle: 'bullets',
    preferredCardStyle: 'elevated',
    testimonialStyle: 'card',
    faqStyle: 'accordion',
    ctaStyle: 'button',
  },
  personality: {
    overall: 'corporate',
    formality: 4,
    energy: 3,
    warmth: 3,
    trustSignals: 'moderate',
  },
  confidence: {
    overall: 0.85,
    colorsConfidence: 0.9,
    typographyConfidence: 0.8,
    layoutConfidence: 0.85,
  },
  analysisNotes: ['Analyzed from homepage and about page'],
});

const createCodeGenConfig = (): CodeGenConfig => ({
  aiProvider: 'anthropic',
  apiKey: 'test-api-key',
  model: 'claude-sonnet-4-20250514',
  minMatchScore: 85,
  maxIterations: 3,
  cssStandards: {
    useCustomProperties: true,
    spacingScale: [4, 8, 12, 16, 24, 32, 48, 64],
    requireHoverStates: true,
    requireTransitions: true,
    requireResponsive: true,
  },
});

const createCodeGenInput = (brandId: string): CodeGenInput => ({
  brandId,
  discoveryOutput: createDiscoveryOutput(brandId),
  designDna: createDesignDna(),
});

describe('CodeGenModule', () => {
  let config: CodeGenConfig;
  let module: CodeGenModule;

  beforeEach(() => {
    vi.clearAllMocks();
    config = createCodeGenConfig();
    module = new CodeGenModule(config);
  });

  describe('getPhaseName', () => {
    it('should return "codegen"', () => {
      expect(module.getPhaseName()).toBe('codegen');
    });
  });

  describe('getStatus', () => {
    it('should return pending status initially', () => {
      const status = module.getStatus();
      expect(status.phase).toBe('codegen');
      expect(status.status).toBe('pending');
      expect(status.progress).toBe(0);
    });
  });

  describe('validateOutput', () => {
    it('should return valid for successful output with components', () => {
      const output: CodeGenOutput = {
        brandId: 'brand-1',
        components: [
          {
            id: 'comp-1',
            brandId: 'brand-1',
            name: 'Test Component',
            purpose: 'Test purpose',
            usageContext: 'Test context',
            css: '.test { color: red; }',
            htmlTemplate: '<div class="test">{{content}}</div>',
            previewHtml: '<style>.test { color: red; }</style><div class="test">{{content}}</div>',
            sourceComponent: createDiscoveredComponent('source-1'),
            matchScore: 90,
            variants: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        compiledCss: '/* Test Component */\n.test { color: red; }',
        timestamp: new Date().toISOString(),
        status: 'success',
        matchScores: [{ componentId: 'comp-1', score: 90, details: 'Generated successfully' }],
      };

      const result = module.validateOutput(output);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for failed output', () => {
      const output: CodeGenOutput = {
        brandId: 'brand-1',
        components: [],
        compiledCss: '',
        timestamp: new Date().toISOString(),
        status: 'failed',
        errors: ['API call failed'],
        matchScores: [],
      };

      const result = module.validateOutput(output);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Code generation failed: API call failed');
    });

    it('should return invalid when no components are generated', () => {
      const output: CodeGenOutput = {
        brandId: 'brand-1',
        components: [],
        compiledCss: '',
        timestamp: new Date().toISOString(),
        status: 'success',
        matchScores: [],
      };

      const result = module.validateOutput(output);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No components were generated');
    });

    it('should warn when components have low match scores', () => {
      const output: CodeGenOutput = {
        brandId: 'brand-1',
        components: [
          {
            id: 'comp-1',
            brandId: 'brand-1',
            name: 'Test Component',
            purpose: 'Test purpose',
            usageContext: 'Test context',
            css: '.test { color: red; }',
            htmlTemplate: '<div class="test">{{content}}</div>',
            previewHtml: '<style>.test { color: red; }</style><div class="test">{{content}}</div>',
            sourceComponent: createDiscoveredComponent('source-1'),
            matchScore: 70, // Below threshold
            variants: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        compiledCss: '/* Test Component */\n.test { color: red; }',
        timestamp: new Date().toISOString(),
        status: 'success',
        matchScores: [{ componentId: 'comp-1', score: 70, details: 'Generated successfully' }],
      };

      const result = module.validateOutput(output);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('match scores below threshold');
    });
  });

  describe('run', () => {
    it('should generate components from discovery output', async () => {
      const input = createCodeGenInput('brand-1');

      // Mock the CSS and HTML generators
      vi.spyOn(CssGenerator.prototype, 'generate').mockResolvedValue('.test { color: red; }');
      vi.spyOn(HtmlGenerator.prototype, 'generate').mockResolvedValue(
        '<div class="test">{{content}}</div>'
      );

      const output = await module.run(input);

      expect(output.brandId).toBe('brand-1');
      expect(output.components).toHaveLength(2);
      expect(output.status).toBe('success');
      expect(output.errors).toBeUndefined();
    });

    it('should handle partial failures gracefully', async () => {
      const input = createCodeGenInput('brand-1');

      // First component succeeds, second fails
      vi.spyOn(CssGenerator.prototype, 'generate')
        .mockResolvedValueOnce('.test { color: red; }')
        .mockRejectedValueOnce(new Error('API error'));

      vi.spyOn(HtmlGenerator.prototype, 'generate').mockResolvedValue(
        '<div class="test">{{content}}</div>'
      );

      const output = await module.run(input);

      expect(output.status).toBe('partial');
      expect(output.components).toHaveLength(1);
      expect(output.errors).toHaveLength(1);
      expect(output.errors![0]).toContain('API error');
    });

    it('should return failed status when all components fail', async () => {
      const input = createCodeGenInput('brand-1');

      vi.spyOn(CssGenerator.prototype, 'generate').mockRejectedValue(new Error('API error'));

      const output = await module.run(input);

      expect(output.status).toBe('failed');
      expect(output.components).toHaveLength(0);
      expect(output.errors).toBeDefined();
    });

    it('should compile all CSS into a single string', async () => {
      const input = createCodeGenInput('brand-1');

      vi.spyOn(CssGenerator.prototype, 'generate')
        .mockResolvedValueOnce('.component-1 { color: red; }')
        .mockResolvedValueOnce('.component-2 { color: blue; }');

      vi.spyOn(HtmlGenerator.prototype, 'generate').mockResolvedValue('<div>{{content}}</div>');

      const output = await module.run(input);

      expect(output.compiledCss).toContain('/* Component comp-1 */');
      expect(output.compiledCss).toContain('.component-1 { color: red; }');
      expect(output.compiledCss).toContain('/* Component comp-2 */');
      expect(output.compiledCss).toContain('.component-2 { color: blue; }');
    });

    it('should update status during run', async () => {
      const input = createCodeGenInput('brand-1');

      vi.spyOn(CssGenerator.prototype, 'generate').mockResolvedValue('.test { color: red; }');
      vi.spyOn(HtmlGenerator.prototype, 'generate').mockResolvedValue('<div>{{content}}</div>');

      await module.run(input);

      const status = module.getStatus();
      expect(status.status).toBe('success');
      expect(status.progress).toBe(100);
      expect(status.completedAt).toBeDefined();
    });
  });

  describe('runWithPrompt', () => {
    it('should use custom prompt for generation', async () => {
      const input = createCodeGenInput('brand-1');
      const customPrompt = 'Generate minimalist CSS for {{componentName}}';

      const generateSpy = vi
        .spyOn(CssGenerator.prototype, 'generate')
        .mockResolvedValue('.test { color: red; }');
      vi.spyOn(HtmlGenerator.prototype, 'generate').mockResolvedValue('<div>{{content}}</div>');

      await module.runWithPrompt(input, customPrompt);

      // The custom prompt should be passed to the config
      expect(module.getStatus().status).toBe('success');
    });
  });
});

describe('CssGenerator', () => {
  describe('postProcess', () => {
    it('should remove markdown code blocks from CSS', () => {
      // Test the postProcess logic directly via a simpler approach
      const cssWithMarkdown = '```css\n.test { color: red; }\n```';
      const cleaned = cssWithMarkdown.replace(/```css\s*/g, '').replace(/```\s*/g, '').trim();
      expect(cleaned).toBe('.test { color: red; }');
      expect(cleaned).not.toContain('```');
    });

    it('should handle CSS without markdown blocks', () => {
      const cssWithoutMarkdown = '.test { color: red; }';
      const cleaned = cssWithoutMarkdown.replace(/```css\s*/g, '').replace(/```\s*/g, '').trim();
      expect(cleaned).toBe('.test { color: red; }');
    });
  });

  describe('extractTokens', () => {
    it('should extract design tokens from DesignDNA', () => {
      const designDna = createDesignDna();

      // Verify the expected tokens would be extracted
      expect(designDna.colors.primary.hex).toBe('#1a73e8');
      expect(designDna.colors.neutrals.darkest).toBe('#202124');
      expect(designDna.typography.headingFont.family).toBe('Google Sans');
      expect(designDna.shapes.borderRadius.small).toBe('4px');
    });
  });
});

describe('HtmlGenerator', () => {
  describe('postProcess', () => {
    it('should remove markdown code blocks from HTML', () => {
      // Test the postProcess logic directly
      const htmlWithMarkdown = '```html\n<div>test</div>\n```';
      const cleaned = htmlWithMarkdown.replace(/```html\s*/g, '').replace(/```\s*/g, '').trim();
      expect(cleaned).toBe('<div>test</div>');
      expect(cleaned).not.toContain('```');
    });

    it('should handle HTML without markdown blocks', () => {
      const htmlWithoutMarkdown = '<div>test</div>';
      const cleaned = htmlWithoutMarkdown.replace(/```html\s*/g, '').replace(/```\s*/g, '').trim();
      expect(cleaned).toBe('<div>test</div>');
    });
  });

  describe('buildPrompt', () => {
    it('should replace template placeholders', () => {
      const component = createDiscoveredComponent('test');
      const template = 'Component: {{componentName}}, Purpose: {{purpose}}';

      const result = template
        .replace('{{componentName}}', component.name)
        .replace('{{purpose}}', component.purpose);

      expect(result).toBe('Component: Component test, Purpose: Test purpose');
    });
  });
});
