// services/ai/contentGeneration/rulesEngine/validators/__tests__/pillarAlignmentValidator.test.ts
import { PillarAlignmentValidator } from '../pillarAlignmentValidator';
import { SEOPillars, SectionGenerationContext } from '../../../../../../types';

describe('PillarAlignmentValidator', () => {
  const pillars: SEOPillars = {
    centralEntity: 'solar panels',
    sourceContext: 'sustainable energy solutions for homeowners',
    centralSearchIntent: 'learn how solar panels work',
  };

  // Helper to create a minimal context with pillars
  const createContext = (overridePillars?: SEOPillars): SectionGenerationContext => ({
    section: {
      heading: 'Test Section',
      level: 2,
      format_code: 'PROSE',
    },
    brief: {} as any,
    businessInfo: {
      seedKeyword: 'solar panels',
    } as any,
    allSections: [],
    isYMYL: false,
    language: 'en',
    pillars: overridePillars ?? pillars,
  });

  describe('calculateAlignment', () => {
    it('should score high when content mentions central entity frequently', () => {
      const content = 'Solar panels are devices that convert sunlight into electricity. Solar panels use photovoltaic cells. Modern solar panels are highly efficient.';
      const result = PillarAlignmentValidator.calculateAlignment(content, pillars);
      expect(result.centralEntityScore).toBeGreaterThan(70);
    });

    it('should score low when content rarely mentions central entity', () => {
      const content = 'Renewable energy is important. Many people want to reduce their carbon footprint. Green technology is advancing rapidly.';
      const result = PillarAlignmentValidator.calculateAlignment(content, pillars);
      expect(result.centralEntityScore).toBeLessThan(50);
    });

    it('should calculate overall alignment score', () => {
      const content = 'Solar panels help homeowners generate sustainable energy. Solar panels are a key part of renewable energy solutions.';
      const result = PillarAlignmentValidator.calculateAlignment(content, pillars);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should return passing: true when overall score is >= 70', () => {
      const content = 'Solar panels are essential for homeowners looking to learn how solar panels work and generate sustainable energy. Solar panels provide sustainable energy solutions.';
      const result = PillarAlignmentValidator.calculateAlignment(content, pillars);
      expect(result.passing).toBe(true);
    });

    it('should return passing: false when overall score is < 70', () => {
      const content = 'Weather patterns are changing globally. Climate science is complex.';
      const result = PillarAlignmentValidator.calculateAlignment(content, pillars);
      expect(result.passing).toBe(false);
    });

    it('should handle multi-word central entities correctly', () => {
      const multiWordPillars: SEOPillars = {
        centralEntity: 'electric vehicle charging stations',
        sourceContext: 'EV infrastructure solutions',
        centralSearchIntent: 'find charging stations near me',
      };
      const content = 'Electric vehicle charging stations are becoming more common. These electric vehicle charging stations support various EV models.';
      const result = PillarAlignmentValidator.calculateAlignment(content, multiWordPillars);
      expect(result.centralEntityScore).toBeGreaterThan(50);
    });

    it('should calculate semantic overlap for source context', () => {
      const content = 'Homeowners benefit from sustainable energy solutions. These energy solutions are perfect for residential use.';
      const result = PillarAlignmentValidator.calculateAlignment(content, pillars);
      expect(result.sourceContextScore).toBeGreaterThan(0);
    });

    it('should calculate semantic overlap for search intent', () => {
      const content = 'Learn how solar panels work by understanding photovoltaic cells. This guide explains how solar panels generate electricity.';
      const result = PillarAlignmentValidator.calculateAlignment(content, pillars);
      expect(result.searchIntentScore).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('should return violations when alignment is below threshold', () => {
      const content = 'This content is completely unrelated to the topic at hand.';
      const context = createContext();
      const violations = PillarAlignmentValidator.validate(content, context);
      expect(violations.some(v => v.rule === 'S3_PILLAR_ALIGNMENT')).toBe(true);
    });

    it('should return no violations when alignment meets threshold', () => {
      const content = 'Solar panels are the best sustainable energy solutions for homeowners who want to learn how solar panels work. Solar panels convert sunlight into electricity efficiently.';
      const context = createContext();
      const violations = PillarAlignmentValidator.validate(content, context);
      expect(violations.filter(v => v.rule === 'S3_PILLAR_ALIGNMENT')).toHaveLength(0);
    });

    it('should return no violations when pillars are missing', () => {
      const content = 'Any content here.';
      const context = createContext();
      context.pillars = undefined;
      const violations = PillarAlignmentValidator.validate(content, context);
      expect(violations).toHaveLength(0);
    });

    it('should return no violations when central entity is missing', () => {
      const content = 'Any content here.';
      const context = createContext({
        centralEntity: '',
        sourceContext: 'some context',
        centralSearchIntent: 'some intent',
      });
      const violations = PillarAlignmentValidator.validate(content, context);
      expect(violations).toHaveLength(0);
    });

    it('should include helpful suggestion in violation', () => {
      const content = 'Unrelated content about cooking recipes and kitchen utensils.';
      const context = createContext();
      const violations = PillarAlignmentValidator.validate(content, context);
      const pillarViolation = violations.find(v => v.rule === 'S3_PILLAR_ALIGNMENT');
      expect(pillarViolation).toBeDefined();
      expect(pillarViolation?.suggestion).toContain('solar panels');
    });

    it('should have warning severity', () => {
      const content = 'Unrelated content about cooking recipes.';
      const context = createContext();
      const violations = PillarAlignmentValidator.validate(content, context);
      const pillarViolation = violations.find(v => v.rule === 'S3_PILLAR_ALIGNMENT');
      expect(pillarViolation?.severity).toBe('warning');
    });
  });
});
