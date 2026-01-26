import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LayoutEngine } from '../LayoutEngine';
import { SectionAnalyzer } from '../SectionAnalyzer';
import { LayoutPlanner } from '../LayoutPlanner';
import { ComponentSelector } from '../ComponentSelector';
import { VisualEmphasizer } from '../VisualEmphasizer';
import { ImageHandler } from '../ImageHandler';
import { BriefSection, FormatCode, ContentZone } from '../../../types';
import { DesignDNA } from '../../../types/designDna';
import { LayoutBlueprint, SectionAnalysis } from '../types';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createMockDesignDNA = (overrides: Partial<DesignDNA> = {}): DesignDNA => ({
  colors: {
    primary: { hex: '#0066cc', usage: 'buttons', confidence: 0.9 },
    primaryLight: { hex: '#3399ff', usage: 'hover', confidence: 0.8 },
    primaryDark: { hex: '#004499', usage: 'active', confidence: 0.8 },
    secondary: { hex: '#ff9900', usage: 'accents', confidence: 0.85 },
    accent: { hex: '#00cc66', usage: 'highlights', confidence: 0.8 },
    neutrals: {
      darkest: '#1a1a1a',
      dark: '#333333',
      medium: '#666666',
      light: '#cccccc',
      lightest: '#f5f5f5',
    },
    semantic: {
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8',
    },
    harmony: 'complementary',
    dominantMood: 'corporate',
    contrastLevel: 'high',
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
    headingLetterSpacing: '0',
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
      large: '16px',
      full: '9999px',
    },
    buttonStyle: 'soft',
    cardStyle: 'subtle-shadow',
    inputStyle: 'bordered',
  },
  effects: {
    shadows: {
      style: 'subtle',
      cardShadow: '0 2px 4px rgba(0,0,0,0.1)',
      buttonShadow: '0 1px 2px rgba(0,0,0,0.1)',
      elevatedShadow: '0 4px 8px rgba(0,0,0,0.15)',
    },
    gradients: {
      usage: 'subtle',
      primaryGradient: 'linear-gradient(135deg, #0066cc, #3399ff)',
      heroGradient: 'linear-gradient(135deg, #0066cc, #004499)',
      ctaGradient: 'linear-gradient(135deg, #ff9900, #ffcc00)',
    },
    backgrounds: {
      usesPatterns: false,
      usesTextures: false,
      usesOverlays: false,
    },
    borders: {
      style: 'subtle',
      defaultColor: '#e0e0e0',
      accentBorderUsage: true,
    },
  },
  decorative: {
    dividerStyle: 'line',
    usesFloatingShapes: false,
    usesCornerAccents: false,
    usesWaveShapes: false,
    usesGeometricPatterns: false,
    iconStyle: 'outline',
    decorativeAccentColor: '#0066cc',
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
    energy: 3,
    warmth: 3,
    trustSignals: 'moderate',
  },
  confidence: {
    overall: 0.85,
    colorsConfidence: 0.9,
    typographyConfidence: 0.85,
    layoutConfidence: 0.8,
  },
  analysisNotes: ['Test DNA'],
  ...overrides,
});

const createMockBriefSections = (): BriefSection[] => [
  {
    key: 'section-0',
    heading: 'What is Test Topic',
    level: 2,
    order: 0,
    format_code: FormatCode.FS,
    attribute_category: 'UNIQUE',
    content_zone: ContentZone.MAIN,
  },
  {
    key: 'section-1',
    heading: 'How to Use Test Topic',
    level: 2,
    order: 1,
    format_code: FormatCode.LISTING,
    attribute_category: 'RARE',
    content_zone: ContentZone.MAIN,
  },
  {
    key: 'section-2',
    heading: 'Test Topic Benefits',
    level: 2,
    order: 2,
    format_code: FormatCode.PROSE,
    attribute_category: 'COMMON',
    content_zone: ContentZone.SUPPLEMENTARY,
  },
  {
    key: 'section-3',
    heading: 'Test Topic FAQ',
    level: 2,
    order: 3,
    format_code: FormatCode.PAA,
    attribute_category: 'COMMON',
    content_zone: ContentZone.SUPPLEMENTARY,
  },
];

const createTestContent = (): string => `
## What is Test Topic

Test Topic is a comprehensive solution for understanding layout engines. This is the first paragraph that explains the core concept.

Here's more detailed information about what makes Test Topic special and unique.

## How to Use Test Topic

Follow these steps to use Test Topic effectively:

1. Step one: Initialize
2. Step two: Configure
3. Step three: Deploy
4. Step four: Monitor

## Test Topic Benefits

Test Topic offers many benefits to users.

- Increased productivity
- Better organization
- Improved results

## Test Topic FAQ

Frequently asked questions about Test Topic.

What is Test Topic used for?
Test Topic is used for layout generation.

How much does Test Topic cost?
Test Topic has various pricing tiers.
`;

// =============================================================================
// TESTS: LayoutEngine.generateBlueprint
// =============================================================================

describe('LayoutEngine', () => {
  describe('generateBlueprint', () => {
    it('should generate a complete LayoutBlueprint', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint).toBeDefined();
      expect(blueprint.id).toBeDefined();
      expect(blueprint.articleId).toBeDefined();
      expect(blueprint.generatedAt).toBeDefined();
      expect(blueprint.pageSettings).toBeDefined();
      expect(blueprint.sections).toBeInstanceOf(Array);
      expect(blueprint.reasoning).toBeDefined();
      expect(blueprint.validation).toBeDefined();
    });

    it('should include pageSettings based on DesignDNA', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA({ spacing: { ...createMockDesignDNA().spacing, contentWidth: 'narrow', density: 'compact' } });

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint.pageSettings.maxWidth).toBe('768px'); // narrow
      expect(blueprint.pageSettings.baseSpacing).toBe('16px'); // compact
      expect(blueprint.pageSettings.colorMode).toBeDefined();
    });

    it('should include pageSettings with medium width for default DNA', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint.pageSettings.maxWidth).toBe('1024px'); // medium
      expect(blueprint.pageSettings.baseSpacing).toBe('24px'); // comfortable
    });

    it('should generate BlueprintSections for all content sections', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint.sections.length).toBeGreaterThan(0);
      expect(blueprint.sections.length).toBe(4); // 4 sections in test content
    });

    it('should include all required properties in each BlueprintSection', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      blueprint.sections.forEach((section, index) => {
        expect(section.id).toBeDefined();
        expect(section.order).toBe(index);
        expect(section.heading).toBeDefined();
        expect(section.headingLevel).toBeDefined();
        expect(section.contentType).toBeDefined();
        expect(section.semanticWeight).toBeDefined();
        expect(section.layout).toBeDefined();
        expect(section.emphasis).toBeDefined();
        expect(section.component).toBeDefined();
        expect(section.constraints).toBeDefined();
        expect(section.contentZone).toBeDefined();
        expect(section.cssClasses).toBeInstanceOf(Array);
      });
    });

    it('should orchestrate all five services in correct order', () => {
      // Spy on the static methods
      const analyzeAllSpy = vi.spyOn(SectionAnalyzer, 'analyzeAllSections');
      const planLayoutSpy = vi.spyOn(LayoutPlanner, 'planLayout');
      const selectComponentSpy = vi.spyOn(ComponentSelector, 'selectComponent');
      const calculateEmphasisSpy = vi.spyOn(VisualEmphasizer, 'calculateEmphasis');
      const determineImageSpy = vi.spyOn(ImageHandler, 'determineImagePlacement');

      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      LayoutEngine.generateBlueprint(content, briefSections, dna);

      // Verify SectionAnalyzer was called first
      expect(analyzeAllSpy).toHaveBeenCalledOnce();
      // Options is undefined when not provided, which is valid
      expect(analyzeAllSpy).toHaveBeenCalledWith(content, briefSections, undefined);

      // Verify subsequent services were called for each section
      expect(planLayoutSpy).toHaveBeenCalled();
      expect(selectComponentSpy).toHaveBeenCalled();
      expect(calculateEmphasisSpy).toHaveBeenCalled();
      expect(determineImageSpy).toHaveBeenCalled();

      // Cleanup
      analyzeAllSpy.mockRestore();
      planLayoutSpy.mockRestore();
      selectComponentSpy.mockRestore();
      calculateEmphasisSpy.mockRestore();
      determineImageSpy.mockRestore();
    });
  });

  describe('FS protection validation', () => {
    it('should validate FS protection is maintained', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint.validation.fsProtectionMaintained).toBe(true);
    });

    it('should set fsProtectionMaintained to true when FS sections use compliant components', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      // Find FS-protected sections
      const fsSections = blueprint.sections.filter((s) => s.constraints.fsTarget);

      // FS sections should use compliant components (prose, definition-box, etc.)
      fsSections.forEach((fsSection) => {
        expect(['prose', 'definition-box', 'key-takeaways']).toContain(fsSection.component.primaryComponent);
      });

      expect(blueprint.validation.fsProtectionMaintained).toBe(true);
    });
  });

  describe('suggestion generation and auto-apply', () => {
    it('should include suggestions in reasoning', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint.reasoning.suggestionsApplied).toBeDefined();
      expect(blueprint.reasoning.suggestionsSkipped).toBeDefined();
    });

    it('should auto-apply high-confidence suggestions (>= 0.8)', () => {
      // Create content with text-heavy sequence (3+ sections without visual elements)
      const textHeavyContent = `
## Section One
This is a text-only section with no lists, tables, or images.

## Section Two
Another text-only section for testing visual break detection.

## Section Three
Yet another text section to trigger the text-heavy detection.

## Section Four
Fourth consecutive text section.
`;
      const briefSections: BriefSection[] = [
        { heading: 'Section One', level: 2, order: 0, attribute_category: 'COMMON' },
        { heading: 'Section Two', level: 2, order: 1, attribute_category: 'COMMON' },
        { heading: 'Section Three', level: 2, order: 2, attribute_category: 'COMMON' },
        { heading: 'Section Four', level: 2, order: 3, attribute_category: 'COMMON' },
      ];
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(textHeavyContent, briefSections, dna);

      // Blueprint should have suggestions processed
      expect(blueprint.reasoning).toBeDefined();
    });

    it('should NOT apply suggestions that impact FS-protected sections', () => {
      const content = `
## FS Protected Section
This section is FS-protected.

## Normal Section One
This is a normal section.

## Normal Section Two
Another normal section.
`;
      const briefSections: BriefSection[] = [
        { heading: 'FS Protected Section', level: 2, order: 0, format_code: FormatCode.FS, attribute_category: 'UNIQUE' },
        { heading: 'Normal Section One', level: 2, order: 1, attribute_category: 'COMMON' },
        { heading: 'Normal Section Two', level: 2, order: 2, attribute_category: 'COMMON' },
      ];
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      // FS section should not have suggestions applied to it
      const fsSection = blueprint.sections.find((s) => s.constraints.fsTarget);
      expect(fsSection).toBeDefined();
      // FS sections maintain their protective layout
      expect(fsSection?.layout.columns).toBe('1-column');
    });
  });

  describe('CSS class generation', () => {
    it('should generate CSS classes from layout, component, and emphasis', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      blueprint.sections.forEach((section) => {
        expect(section.cssClasses.length).toBeGreaterThan(0);
        // Should include layout width class
        expect(section.cssClasses.some((c) => c.includes('width-') || c.includes('layout-'))).toBe(true);
      });
    });

    it('should include emphasis level in CSS classes', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      blueprint.sections.forEach((section) => {
        // Should include emphasis class
        expect(
          section.cssClasses.some(
            (c) =>
              c.includes('emphasis-') ||
              c.includes('hero') ||
              c.includes('featured') ||
              c.includes('standard') ||
              c.includes('supporting') ||
              c.includes('minimal')
          )
        ).toBe(true);
      });
    });
  });

  describe('reasoning generation', () => {
    it('should include layout strategy in reasoning', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint.reasoning.layoutStrategy).toBeDefined();
      expect(blueprint.reasoning.layoutStrategy.length).toBeGreaterThan(0);
    });

    it('should include key decisions in reasoning', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint.reasoning.keyDecisions).toBeInstanceOf(Array);
    });

    it('should mention personality and density in layout strategy', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA({
        personality: { ...createMockDesignDNA().personality, overall: 'elegant' },
        spacing: { ...createMockDesignDNA().spacing, density: 'spacious' },
      });

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint.reasoning.layoutStrategy.toLowerCase()).toContain('elegant');
      expect(blueprint.reasoning.layoutStrategy.toLowerCase()).toContain('spacious');
    });

    it('should document FS-protected sections in key decisions', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      // Should mention FS-protected sections
      const hasFsDecision = blueprint.reasoning.keyDecisions.some(
        (d) => d.toLowerCase().includes('fs') || d.toLowerCase().includes('featured snippet')
      );
      expect(hasFsDecision).toBe(true);
    });
  });

  describe('validation', () => {
    it('should include validation results', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint.validation.semanticSeoCompliant).toBeDefined();
      expect(blueprint.validation.fsProtectionMaintained).toBeDefined();
      expect(blueprint.validation.brandAlignmentScore).toBeDefined();
      expect(blueprint.validation.issues).toBeInstanceOf(Array);
    });

    it('should set semanticSeoCompliant to true for valid blueprints', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint.validation.semanticSeoCompliant).toBe(true);
    });

    it('should calculate brand alignment score', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections, dna);

      expect(blueprint.validation.brandAlignmentScore).toBeGreaterThanOrEqual(0);
      expect(blueprint.validation.brandAlignmentScore).toBeLessThanOrEqual(100);
    });
  });

  describe('pageSettings mapping', () => {
    it('should map narrow contentWidth to 768px', () => {
      const dna = createMockDesignDNA({ spacing: { ...createMockDesignDNA().spacing, contentWidth: 'narrow' } });
      const blueprint = LayoutEngine.generateBlueprint(createTestContent(), createMockBriefSections(), dna);
      expect(blueprint.pageSettings.maxWidth).toBe('768px');
    });

    it('should map medium contentWidth to 1024px', () => {
      const dna = createMockDesignDNA({ spacing: { ...createMockDesignDNA().spacing, contentWidth: 'medium' } });
      const blueprint = LayoutEngine.generateBlueprint(createTestContent(), createMockBriefSections(), dna);
      expect(blueprint.pageSettings.maxWidth).toBe('1024px');
    });

    it('should map wide contentWidth to 1200px', () => {
      const dna = createMockDesignDNA({ spacing: { ...createMockDesignDNA().spacing, contentWidth: 'wide' } });
      const blueprint = LayoutEngine.generateBlueprint(createTestContent(), createMockBriefSections(), dna);
      expect(blueprint.pageSettings.maxWidth).toBe('1200px');
    });

    it('should map full contentWidth to 100%', () => {
      const dna = createMockDesignDNA({ spacing: { ...createMockDesignDNA().spacing, contentWidth: 'full' } });
      const blueprint = LayoutEngine.generateBlueprint(createTestContent(), createMockBriefSections(), dna);
      expect(blueprint.pageSettings.maxWidth).toBe('100%');
    });

    it('should map compact density to 16px spacing', () => {
      const dna = createMockDesignDNA({ spacing: { ...createMockDesignDNA().spacing, density: 'compact' } });
      const blueprint = LayoutEngine.generateBlueprint(createTestContent(), createMockBriefSections(), dna);
      expect(blueprint.pageSettings.baseSpacing).toBe('16px');
    });

    it('should map comfortable density to 24px spacing', () => {
      const dna = createMockDesignDNA({ spacing: { ...createMockDesignDNA().spacing, density: 'comfortable' } });
      const blueprint = LayoutEngine.generateBlueprint(createTestContent(), createMockBriefSections(), dna);
      expect(blueprint.pageSettings.baseSpacing).toBe('24px');
    });

    it('should map spacious density to 32px spacing', () => {
      const dna = createMockDesignDNA({ spacing: { ...createMockDesignDNA().spacing, density: 'spacious' } });
      const blueprint = LayoutEngine.generateBlueprint(createTestContent(), createMockBriefSections(), dna);
      expect(blueprint.pageSettings.baseSpacing).toBe('32px');
    });

    it('should map airy density to 48px spacing', () => {
      const dna = createMockDesignDNA({ spacing: { ...createMockDesignDNA().spacing, density: 'airy' } });
      const blueprint = LayoutEngine.generateBlueprint(createTestContent(), createMockBriefSections(), dna);
      expect(blueprint.pageSettings.baseSpacing).toBe('48px');
    });
  });

  describe('empty content handling', () => {
    it('should handle empty content gracefully', () => {
      const blueprint = LayoutEngine.generateBlueprint('', [], createMockDesignDNA());

      expect(blueprint.sections).toEqual([]);
      expect(blueprint.validation.semanticSeoCompliant).toBe(true);
    });

    it('should handle content without brief sections', () => {
      const content = createTestContent();
      const dna = createMockDesignDNA();

      const blueprint = LayoutEngine.generateBlueprint(content, undefined, dna);

      expect(blueprint.sections.length).toBeGreaterThan(0);
    });

    it('should handle content without DesignDNA (use defaults)', () => {
      const content = createTestContent();
      const briefSections = createMockBriefSections();

      const blueprint = LayoutEngine.generateBlueprint(content, briefSections);

      expect(blueprint).toBeDefined();
      expect(blueprint.sections.length).toBeGreaterThan(0);
      expect(blueprint.pageSettings.maxWidth).toBeDefined();
    });
  });

  describe('instance methods', () => {
    it('should support instance method for generateBlueprint', () => {
      const engine = new LayoutEngine();
      const content = createTestContent();
      const briefSections = createMockBriefSections();
      const dna = createMockDesignDNA();

      const blueprint = engine.generateBlueprint(content, briefSections, dna);

      expect(blueprint).toBeDefined();
      expect(blueprint.sections.length).toBeGreaterThan(0);
    });
  });
});
