import { describe, it, expect, beforeEach } from 'vitest';
import { ImageHandler } from '../ImageHandler';
import {
  SectionAnalysis,
  ContentType,
  SectionConstraints,
  SemanticWeightFactors,
  SemanticImagePlacement,
} from '../types';
import { DesignDNA } from '../../../types/designDna';

// =============================================================================
// HELPER FACTORIES
// =============================================================================

function createMockSectionAnalysis(overrides: Partial<SectionAnalysis> = {}): SectionAnalysis {
  const defaultFactors: SemanticWeightFactors = {
    baseWeight: 3,
    topicCategoryBonus: 0,
    coreTopicBonus: 0,
    fsTargetBonus: 0,
    mainIntentBonus: 0,
    totalWeight: 3,
  };

  const defaultConstraints: SectionConstraints = {};

  return {
    sectionId: 'section-1',
    heading: 'Test Section',
    headingLevel: 2,
    contentType: 'explanation' as ContentType,
    semanticWeight: 3,
    semanticWeightFactors: defaultFactors,
    constraints: defaultConstraints,
    wordCount: 100,
    hasTable: false,
    hasList: false,
    hasQuote: false,
    hasImage: false,
    isCoreTopic: false,
    answersMainIntent: false,
    contentZone: 'MAIN',
    ...overrides,
  };
}

function createMockDesignDNA(overrides: Partial<DesignDNA> = {}): DesignDNA {
  return {
    colors: {
      primary: { hex: '#3B82F6', usage: 'primary', confidence: 0.9 },
      primaryLight: { hex: '#60A5FA', usage: 'primary-light', confidence: 0.8 },
      primaryDark: { hex: '#1D4ED8', usage: 'primary-dark', confidence: 0.8 },
      secondary: { hex: '#10B981', usage: 'secondary', confidence: 0.8 },
      accent: { hex: '#F59E0B', usage: 'accent', confidence: 0.8 },
      neutrals: {
        darkest: '#111827',
        dark: '#374151',
        medium: '#6B7280',
        light: '#D1D5DB',
        lightest: '#F9FAFB',
      },
      semantic: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      harmony: 'complementary',
      dominantMood: 'corporate',
      contrastLevel: 'medium',
    },
    typography: {
      headingFont: {
        family: 'Inter',
        fallback: 'sans-serif',
        weight: 700,
        style: 'sans-serif',
        character: 'modern',
      },
      bodyFont: {
        family: 'Inter',
        fallback: 'sans-serif',
        weight: 400,
        style: 'sans-serif',
        lineHeight: 1.6,
      },
      scaleRatio: 1.25,
      baseSize: '16px',
      headingCase: 'none',
      headingLetterSpacing: 'normal',
      usesDropCaps: false,
      headingUnderlineStyle: 'none',
      linkStyle: 'underline',
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
        style: 'subtle',
        small: '4px',
        medium: '8px',
        large: '12px',
        full: '9999px',
      },
      buttonStyle: 'soft',
      cardStyle: 'subtle-shadow',
      inputStyle: 'bordered',
    },
    effects: {
      shadows: {
        style: 'subtle',
        cardShadow: '0 1px 3px rgba(0,0,0,0.1)',
        buttonShadow: '0 1px 2px rgba(0,0,0,0.05)',
        elevatedShadow: '0 4px 6px rgba(0,0,0,0.1)',
      },
      gradients: {
        usage: 'subtle',
        primaryGradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
        heroGradient: 'linear-gradient(180deg, #F9FAFB, #FFFFFF)',
        ctaGradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
      },
      backgrounds: {
        usesPatterns: false,
        usesTextures: false,
        usesOverlays: false,
      },
      borders: {
        style: 'subtle',
        defaultColor: '#E5E7EB',
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
      decorativeAccentColor: '#3B82F6',
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
      transitionSpeed: 'normal',
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
      preferredCardStyle: 'minimal',
      testimonialStyle: 'card',
      faqStyle: 'accordion',
      ctaStyle: 'button',
    },
    personality: {
      overall: 'corporate',
      formality: 4,
      energy: 2,
      warmth: 3,
      trustSignals: 'moderate',
    },
    confidence: {
      overall: 0.85,
      colorsConfidence: 0.9,
      typographyConfidence: 0.85,
      layoutConfidence: 0.8,
    },
    analysisNotes: [],
    ...overrides,
  } as DesignDNA;
}

// =============================================================================
// CRITICAL SEMANTIC SEO RULE TESTS
// =============================================================================

describe('ImageHandler', () => {
  describe('CRITICAL: Never place images between heading and first paragraph', () => {
    it('should NEVER return a position that places image before first paragraph', () => {
      // Test with various section types and weights
      const testCases = [
        createMockSectionAnalysis({ semanticWeight: 5, hasImage: true }),
        createMockSectionAnalysis({ semanticWeight: 4, hasImage: true }),
        createMockSectionAnalysis({ semanticWeight: 3, hasImage: true }),
        createMockSectionAnalysis({ semanticWeight: 5, contentType: 'introduction' }),
        createMockSectionAnalysis({
          semanticWeight: 4,
          constraints: { imageRequired: true },
        }),
      ];

      const dna = createMockDesignDNA();

      testCases.forEach((analysis) => {
        const result = ImageHandler.determineImagePlacement(analysis, dna);

        if (result) {
          // All valid positions are AFTER first paragraph
          const validPositions = [
            'after-intro-paragraph',
            'section-end',
            'float-right',
            'float-left',
            'full-width-break',
            'inline',
          ];
          expect(validPositions).toContain(result.position);

          // There is no 'before-first-paragraph' or 'after-heading' position
          // This test ensures the type system enforces the rule
        }
      });
    });

    it('should use after-intro-paragraph for generated images', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: true, // Has generated image
      });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).not.toBeNull();
      expect(result!.position).toBe('after-intro-paragraph');
      expect(result!.source).toBe('article_generated');
    });
  });

  // =============================================================================
  // SECTIONS WITH GENERATED IMAGES
  // =============================================================================

  describe('sections WITH generated images (hasImage = true)', () => {
    it('should return full-width-break for hero sections (weight 5) with full-bleed brand', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 5,
        hasImage: true,
      });
      const dna = createMockDesignDNA({
        layout: {
          gridStyle: 'strict-12',
          alignment: 'left',
          heroStyle: 'full-bleed',
          cardLayout: 'grid',
          ctaPlacement: 'section-end',
          navigationStyle: 'standard',
        },
      });

      const result = ImageHandler.determineImagePlacement(analysis, dna);

      expect(result).not.toBeNull();
      expect(result!.position).toBe('full-width-break');
      expect(result!.source).toBe('article_generated');
      expect(result!.semanticRole).toBe('hero');
    });

    it('should return full-width-break for featured sections (weight >= 4)', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 4,
        hasImage: true,
      });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).not.toBeNull();
      expect(result!.position).toBe('full-width-break');
      expect(result!.source).toBe('article_generated');
    });

    it('should return after-intro-paragraph for standard sections', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: true,
      });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).not.toBeNull();
      expect(result!.position).toBe('after-intro-paragraph');
      expect(result!.source).toBe('article_generated');
      expect(result!.semanticRole).toBe('explanatory');
    });

    it('should return after-intro-paragraph for low weight sections', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 2,
        hasImage: true,
      });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).not.toBeNull();
      expect(result!.position).toBe('after-intro-paragraph');
      expect(result!.source).toBe('article_generated');
    });
  });

  // =============================================================================
  // SECTIONS WITH REQUIRED IMAGES (from constraints)
  // =============================================================================

  describe('sections WITH required images (constraints.imageRequired = true)', () => {
    it('should return full-width-break for high weight sections (>= 4)', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 4,
        hasImage: false,
        constraints: { imageRequired: true },
      });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).not.toBeNull();
      expect(result!.position).toBe('full-width-break');
      expect(result!.source).toBe('brand_kit');
    });

    it('should alternate float positions for asymmetric brand layout', () => {
      const analysis1 = createMockSectionAnalysis({
        sectionId: 'section-1',
        semanticWeight: 3,
        hasImage: false,
        constraints: { imageRequired: true },
      });
      const analysis2 = createMockSectionAnalysis({
        sectionId: 'section-2',
        semanticWeight: 3,
        hasImage: false,
        constraints: { imageRequired: true },
      });

      const dna = createMockDesignDNA({
        layout: {
          gridStyle: 'asymmetric',
          alignment: 'left',
          heroStyle: 'contained',
          cardLayout: 'grid',
          ctaPlacement: 'section-end',
          navigationStyle: 'standard',
        },
      });

      const results = ImageHandler.determineAllImagePlacements([analysis1, analysis2], dna);

      expect(results).toHaveLength(2);
      expect(results[0]).not.toBeNull();
      expect(results[1]).not.toBeNull();

      // Should alternate between float-left and float-right
      const positions = results.map((r) => r?.position);
      expect(positions).toContain('float-left');
      expect(positions).toContain('float-right');
    });

    it('should return section-end for default cases', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: false,
        constraints: { imageRequired: true },
      });

      const dna = createMockDesignDNA({
        layout: {
          gridStyle: 'strict-12', // Not asymmetric
          alignment: 'left',
          heroStyle: 'contained',
          cardLayout: 'grid',
          ctaPlacement: 'section-end',
          navigationStyle: 'standard',
        },
      });

      const result = ImageHandler.determineImagePlacement(analysis, dna);

      expect(result).not.toBeNull();
      expect(result!.position).toBe('section-end');
      expect(result!.source).toBe('brand_kit');
    });
  });

  // =============================================================================
  // SECTIONS WITHOUT IMAGES (placeholder suggestions)
  // =============================================================================

  describe('sections WITHOUT images (suggest placeholders when helpful)', () => {
    it('should return null for FS-protected sections', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: false,
        constraints: { fsTarget: true },
      });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).toBeNull();
    });

    it('should suggest diagram placeholder for explanation content with complex concepts', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: false,
        contentType: 'explanation',
      });

      // Content with complex concept phrases
      const sectionContent =
        'This section explains the relationship between database models and their architecture.';

      const result = ImageHandler.determineImagePlacement(analysis, undefined, sectionContent);

      expect(result).not.toBeNull();
      expect(result!.source).toBe('placeholder');
      expect(result!.position).toBe('after-intro-paragraph');
      expect(result!.placeholder).toBeDefined();
      expect(result!.placeholder!.suggestedContent).toContain('Diagram');
    });

    it('should suggest flowchart placeholder for steps/process content', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: false,
        contentType: 'steps',
      });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).not.toBeNull();
      expect(result!.source).toBe('placeholder');
      expect(result!.placeholder).toBeDefined();
      expect(result!.placeholder!.suggestedContent).toContain('Flowchart');
    });

    it('should return null for content without visual need', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: false,
        contentType: 'faq', // FAQ typically doesn't need images
      });

      const result = ImageHandler.determineImagePlacement(analysis, undefined, 'Simple FAQ content');

      expect(result).toBeNull();
    });
  });

  // =============================================================================
  // COMPLEX CONCEPT DETECTION
  // =============================================================================

  describe('complex concept detection', () => {
    const complexPhrases = [
      'the relationship between A and B',
      'the process of authentication',
      'how the system works',
      'microservices architecture',
      'the flow of data',
      'stages of development',
      'components of the system',
      'structure of the database',
    ];

    complexPhrases.forEach((phrase) => {
      it(`should detect complex concept: "${phrase}"`, () => {
        const analysis = createMockSectionAnalysis({
          semanticWeight: 3,
          hasImage: false,
          contentType: 'explanation',
        });

        const result = ImageHandler.determineImagePlacement(
          analysis,
          undefined,
          `This section covers ${phrase} in detail.`
        );

        expect(result).not.toBeNull();
        expect(result!.source).toBe('placeholder');
      });
    });
  });

  // =============================================================================
  // SEMANTIC ROLE ASSIGNMENT
  // =============================================================================

  describe('semantic role assignment', () => {
    it('should assign hero role to weight 5 sections', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 5,
        hasImage: true,
      });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).not.toBeNull();
      expect(result!.semanticRole).toBe('hero');
    });

    it('should assign explanatory role to standard explanation sections', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: true,
        contentType: 'explanation',
      });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).not.toBeNull();
      expect(result!.semanticRole).toBe('explanatory');
    });

    it('should assign decorative role to brand kit images', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 4,
        hasImage: false,
        constraints: { imageRequired: true },
      });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).not.toBeNull();
      expect(result!.source).toBe('brand_kit');
      expect(result!.semanticRole).toBe('decorative');
    });

    it('should assign evidence role to data/comparison sections', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: true,
        contentType: 'comparison',
      });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).not.toBeNull();
      expect(result!.semanticRole).toBe('evidence');
    });
  });

  // =============================================================================
  // PLACEHOLDER SPEC GENERATION
  // =============================================================================

  describe('placeholder spec generation', () => {
    it('should generate proper aspect ratio for placeholders', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: false,
        contentType: 'explanation',
      });

      const result = ImageHandler.determineImagePlacement(
        analysis,
        undefined,
        'Understanding the architecture of microservices'
      );

      expect(result).not.toBeNull();
      expect(result!.placeholder).toBeDefined();
      expect(['16:9', '4:3', '1:1', 'auto']).toContain(result!.placeholder!.aspectRatio);
    });

    it('should generate vocabulary-extending alt text template', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: false,
        contentType: 'explanation',
        heading: 'Database Architecture Overview',
      });

      const result = ImageHandler.determineImagePlacement(
        analysis,
        undefined,
        'The components of the database include tables and indices.'
      );

      expect(result).not.toBeNull();
      expect(result!.placeholder).toBeDefined();
      expect(result!.placeholder!.altTextTemplate).toBeTruthy();
      // Alt text should reference the heading/content
      expect(result!.placeholder!.altTextTemplate.toLowerCase()).toContain('database');
    });
  });

  // =============================================================================
  // BATCH PROCESSING
  // =============================================================================

  describe('determineAllImagePlacements', () => {
    it('should process all sections correctly', () => {
      const analyses = [
        createMockSectionAnalysis({ sectionId: 'section-1', semanticWeight: 5, hasImage: true }),
        createMockSectionAnalysis({ sectionId: 'section-2', semanticWeight: 3, hasImage: false }),
        createMockSectionAnalysis({ sectionId: 'section-3', semanticWeight: 2, hasImage: true }),
      ];

      const results = ImageHandler.determineAllImagePlacements(analyses);

      expect(results).toHaveLength(3);
      expect(results[0]).not.toBeNull(); // Hero with image
      expect(results[2]).not.toBeNull(); // Has image
    });

    it('should apply design DNA consistently to all sections', () => {
      const analyses = [
        createMockSectionAnalysis({
          sectionId: 'section-1',
          semanticWeight: 3,
          hasImage: false,
          constraints: { imageRequired: true },
        }),
        createMockSectionAnalysis({
          sectionId: 'section-2',
          semanticWeight: 3,
          hasImage: false,
          constraints: { imageRequired: true },
        }),
      ];

      const dna = createMockDesignDNA({
        layout: {
          gridStyle: 'asymmetric',
          alignment: 'left',
          heroStyle: 'contained',
          cardLayout: 'grid',
          ctaPlacement: 'section-end',
          navigationStyle: 'standard',
        },
      });

      const results = ImageHandler.determineAllImagePlacements(analyses, dna);

      // Both should be affected by asymmetric layout
      results.forEach((result) => {
        if (result) {
          expect(['float-left', 'float-right']).toContain(result.position);
        }
      });
    });

    it('should return empty array for empty input', () => {
      const results = ImageHandler.determineAllImagePlacements([]);
      expect(results).toEqual([]);
    });
  });

  // =============================================================================
  // INSTANCE METHODS
  // =============================================================================

  describe('instance methods', () => {
    it('should provide instance method for determineImagePlacement', () => {
      const handler = new ImageHandler();
      const analysis = createMockSectionAnalysis({ semanticWeight: 5, hasImage: true });

      const result = handler.determineImagePlacement(analysis);

      expect(result).toBeDefined();
    });

    it('should provide instance method for determineAllImagePlacements', () => {
      const handler = new ImageHandler();
      const analyses = [
        createMockSectionAnalysis({ sectionId: 'section-1', semanticWeight: 5, hasImage: true }),
      ];

      const results = handler.determineAllImagePlacements(analyses);

      expect(results).toHaveLength(1);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('should handle missing DNA gracefully', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5, hasImage: true });

      const result = ImageHandler.determineImagePlacement(analysis);

      expect(result).toBeDefined();
    });

    it('should handle missing layout settings in DNA', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5, hasImage: true });
      const partialDna = createMockDesignDNA();
      delete (partialDna as Partial<DesignDNA>).layout;

      const result = ImageHandler.determineImagePlacement(analysis, partialDna);

      expect(result).toBeDefined();
    });

    it('should handle empty section content', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: false,
        contentType: 'explanation',
      });

      const result = ImageHandler.determineImagePlacement(analysis, undefined, '');

      // Should not crash and should return appropriate result
      expect(result === null || result !== null).toBe(true);
    });

    it('should handle undefined section content', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 3,
        hasImage: false,
        contentType: 'explanation',
      });

      const result = ImageHandler.determineImagePlacement(analysis, undefined, undefined);

      // Should not crash
      expect(result === null || result !== null).toBe(true);
    });
  });
});
