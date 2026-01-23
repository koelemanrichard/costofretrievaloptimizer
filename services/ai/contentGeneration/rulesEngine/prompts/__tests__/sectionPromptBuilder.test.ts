import { describe, it, expect } from 'vitest';
import { SectionPromptBuilder } from '../sectionPromptBuilder';
import { FormatCode, ContentZone } from '../../../../../../types/content';

describe('SectionPromptBuilder template integration', () => {
  // Helper to create minimal context
  const createContext = (overrides: any = {}) => ({
    section: {
      heading: 'Test Heading',
      level: 2,
      format_code: FormatCode.PROSE,
      ...overrides.section,
    },
    brief: {
      id: 'test-brief-id',
      topic_id: 'test-topic-id',
      title: 'Test Article',
      slug: 'test-article',
      metaDescription: 'Test description',
      keyTakeaways: [],
      outline: '',
      serpAnalysis: {
        peopleAlsoAsk: [],
        competitorHeadings: [],
      },
      visuals: {
        featuredImagePrompt: '',
        imageAltText: '',
      },
      contextualVectors: [],
      contextualBridge: [],
      selectedTemplate: 'DEFINITIONAL',
      ...overrides.brief,
    },
    businessInfo: {
      seedKeyword: 'test keyword',
      language: 'en',
      region: 'US',
      targetMarket: 'Global',
      ...overrides.businessInfo,
    },
    isYMYL: false,
    ...overrides,
  });

  describe('format code constraints from template', () => {
    it('should include Featured Snippet constraints when format_code is FS', () => {
      const context = createContext({
        section: {
          heading: 'What is Test Entity?',
          level: 2,
          format_code: FormatCode.FS,
        },
      });

      const prompt = SectionPromptBuilder.build(context as any);

      // The builder already includes format constraints via BriefCodeParser
      // We need to verify our new template guidance is also present
      expect(prompt).toContain('Featured Snippet');
      expect(prompt).toContain('40-50 words');
    });

    it('should include PAA constraints when format_code is PAA', () => {
      const context = createContext({
        section: {
          heading: 'Common Questions',
          level: 2,
          format_code: FormatCode.PAA,
        },
      });

      const prompt = SectionPromptBuilder.build(context as any);

      expect(prompt).toContain('People Also Ask');
    });

    it('should include LISTING constraints when format_code is LISTING', () => {
      const context = createContext({
        section: {
          heading: 'Key Benefits',
          level: 2,
          format_code: FormatCode.LISTING,
        },
      });

      const prompt = SectionPromptBuilder.build(context as any);

      expect(prompt).toContain('list');
    });

    it('should include TABLE constraints when format_code is TABLE', () => {
      const context = createContext({
        section: {
          heading: 'Comparison Chart',
          level: 2,
          format_code: FormatCode.TABLE,
        },
      });

      const prompt = SectionPromptBuilder.build(context as any);

      expect(prompt).toContain('table');
    });
  });

  describe('visual semantics guidance', () => {
    it('should include visual semantics guidance when enhanced_visual_semantics has matching sectionImages', () => {
      const context = createContext({
        section: {
          heading: 'Key Benefits',
          level: 2,
          key: 'key-benefits',
          format_code: FormatCode.LISTING,
        },
        brief: {
          title: 'Test Article',
          enhanced_visual_semantics: {
            heroImagePrompt: 'Hero image description',
            heroImageAltText: 'Hero image alt text',
            sectionImages: [
              {
                sectionKey: 'key-benefits',
                type: 'INFOGRAPHIC',
                description: 'Benefits comparison chart',
                altText: 'Infographic showing key benefits',
              },
            ],
          },
        },
      });

      const prompt = SectionPromptBuilder.build(context as any);

      expect(prompt).toContain('INFOGRAPHIC');
      expect(prompt).toContain('Benefits comparison chart');
      expect(prompt).toContain('Infographic showing key benefits');
    });

    it('should match visual semantics when section heading contains sectionKey words', () => {
      const context = createContext({
        section: {
          heading: 'Important Benefits Overview',
          level: 2,
          format_code: FormatCode.PROSE,
        },
        brief: {
          title: 'Test Article',
          enhanced_visual_semantics: {
            sectionImages: [
              {
                sectionKey: 'benefits',
                type: 'CHART',
                description: 'Bar chart showing benefits distribution',
                altText: 'Chart comparing key benefits',
              },
            ],
          },
        },
      });

      const prompt = SectionPromptBuilder.build(context as any);

      expect(prompt).toContain('CHART');
      expect(prompt).toContain('Bar chart showing benefits distribution');
    });

    it('should not include visual section when no matching sectionImages exist', () => {
      const context = createContext({
        section: {
          heading: 'Introduction',
          level: 2,
          key: 'introduction',
          format_code: FormatCode.PROSE,
        },
        brief: {
          title: 'Test Article',
          enhanced_visual_semantics: {
            sectionImages: [
              {
                sectionKey: 'conclusion',
                type: 'DIAGRAM',
                description: 'Summary diagram',
                altText: 'Diagram showing final summary',
              },
            ],
          },
        },
      });

      const prompt = SectionPromptBuilder.build(context as any);

      // Should not contain the conclusion-specific image info
      expect(prompt).not.toContain('Summary diagram');
      expect(prompt).not.toContain('VISUAL PLACEHOLDER');
    });

    it('should not include visual section when enhanced_visual_semantics is undefined', () => {
      const context = createContext({
        section: {
          heading: 'Test Section',
          level: 2,
          format_code: FormatCode.PROSE,
        },
        brief: {
          title: 'Test Article',
          // No enhanced_visual_semantics
        },
      });

      const prompt = SectionPromptBuilder.build(context as any);

      expect(prompt).not.toContain('VISUAL PLACEHOLDER');
    });
  });

  describe('combined template and visual guidance', () => {
    it('should include both format constraints and visual guidance when both are available', () => {
      const context = createContext({
        section: {
          heading: 'Pricing Comparison',
          level: 2,
          key: 'pricing-comparison',
          format_code: FormatCode.TABLE,
        },
        brief: {
          title: 'Product Review Article',
          enhanced_visual_semantics: {
            sectionImages: [
              {
                sectionKey: 'pricing-comparison',
                type: 'CHART',
                description: 'Price comparison bar chart',
                altText: 'Chart comparing pricing across products',
              },
            ],
          },
        },
      });

      const prompt = SectionPromptBuilder.build(context as any);

      // Should have format guidance
      expect(prompt).toContain('table');

      // Should have visual guidance
      expect(prompt).toContain('CHART');
      expect(prompt).toContain('Price comparison bar chart');
    });
  });

  describe('Record-based section_images format', () => {
    it('should handle Record-based section_images (types.ts BriefVisualSemantics)', () => {
      const context = createContext({
        section: {
          heading: 'Product Overview',
          level: 2,
          key: 'product-overview',
          format_code: FormatCode.PROSE,
        },
        brief: {
          title: 'Product Guide',
          enhanced_visual_semantics: {
            hero_image: {
              image_description: 'Hero product shot',
              alt_text_recommendation: 'Main product hero image',
            },
            section_images: {
              'product-overview': {
                image_description: 'Product diagram showing features',
                alt_text_recommendation: 'Diagram of product features',
                n_gram_match: ['DIAGRAM'],
              },
            },
          },
        },
      });

      const prompt = SectionPromptBuilder.build(context as any);

      expect(prompt).toContain('VISUAL PLACEHOLDER');
      expect(prompt).toContain('Product diagram showing features');
      expect(prompt).toContain('Diagram of product features');
      expect(prompt).toContain('DIAGRAM');
    });

    it('should match Record-based section_images by partial key match', () => {
      const context = createContext({
        section: {
          heading: 'Benefits and Advantages',
          level: 2,
          key: 'benefits',
          format_code: FormatCode.LISTING,
        },
        brief: {
          title: 'Feature Guide',
          enhanced_visual_semantics: {
            section_images: {
              benefits: {
                image_description: 'Benefits comparison infographic',
                alt_text_recommendation: 'Infographic comparing key benefits',
                n_gram_match: ['INFOGRAPHIC'],
              },
            },
          },
        },
      });

      const prompt = SectionPromptBuilder.build(context as any);

      expect(prompt).toContain('VISUAL PLACEHOLDER');
      expect(prompt).toContain('Benefits comparison infographic');
      expect(prompt).toContain('INFOGRAPHIC');
    });
  });
});
