// services/ai/contentGeneration/rulesEngine/validators/__tests__/discourseChainingValidator.test.ts

import { DiscourseChainingValidator } from '../discourseChainingValidator';
import { SectionGenerationContext } from '../../../../../../types';

describe('DiscourseChainingValidator', () => {
  const createContext = (overrides: Partial<SectionGenerationContext> = {}): SectionGenerationContext => ({
    section: { heading: 'Test Section' } as any,
    brief: {} as any,
    businessInfo: { seedKeyword: 'solar panels' } as any,
    allSections: [],
    isYMYL: false,
    ...overrides,
  });

  describe('basic chaining detection', () => {
    it('should pass when 50%+ of sentence pairs chain via pronouns', () => {
      const content = `Solar panels convert sunlight into electricity. This electricity powers homes and businesses. The technology has improved significantly. These improvements make solar more affordable.`;
      const context = createContext();
      const violations = DiscourseChainingValidator.validate(content, context);

      // Should pass - good chaining ratio
      expect(violations.filter(v => v.severity === 'error').length).toBe(0);
    });

    it('should fail when chaining ratio is below 50%', () => {
      const content = `Solar panels are installed on rooftops. Weather affects energy production. Batteries store excess power. Grid connection is required.`;
      const context = createContext();
      const violations = DiscourseChainingValidator.validate(content, context);

      // Should flag low chaining ratio
      expect(violations.some(v => v.rule === 'D5_DISCOURSE_CHAINING')).toBe(true);
    });

    it('should detect pronoun references (This, That, It, These, Those)', () => {
      const content = `Solar panels generate clean energy. This energy reduces carbon emissions. That reduction helps the environment.`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.chainedPairs).toBeGreaterThanOrEqual(2);
    });

    it('should detect noun phrase repetition', () => {
      const content = `Photovoltaic cells absorb photons from sunlight. Sunlight contains various wavelengths of light. Light energy excites electrons in the cells.`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.chainedPairs).toBeGreaterThanOrEqual(2);
    });
  });

  describe('pronoun detection', () => {
    it('should recognize "This" as a chaining pronoun', () => {
      const content = `The process requires careful planning. This planning ensures optimal results.`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.chainedPairs).toBe(1);
    });

    it('should recognize "These" as a chaining pronoun', () => {
      const content = `Solar panels have multiple benefits. These benefits include cost savings and environmental protection.`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.chainedPairs).toBe(1);
    });

    it('should recognize "It" as a chaining pronoun', () => {
      const content = `Solar energy is renewable. It provides a sustainable alternative to fossil fuels.`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.chainedPairs).toBe(1);
    });

    it('should recognize "That" as a chaining pronoun', () => {
      const content = `The installation process takes several hours. That timeframe depends on system size.`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.chainedPairs).toBe(1);
    });

    it('should recognize "Those" as a chaining pronoun', () => {
      const content = `Many homeowners invest in solar systems. Those investments typically pay off within 7 years.`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.chainedPairs).toBe(1);
    });
  });

  describe('object extraction', () => {
    it('should extract last noun phrase from sentence', () => {
      const content = `The company manufactures high-quality solar panels. Solar panels are tested rigorously.`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.chainedPairs).toBe(1);
    });

    it('should handle sentences ending with prepositional phrases', () => {
      const content = `Engineers focus on improving efficiency. Efficiency is the key metric for solar performance.`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.chainedPairs).toBe(1);
    });
  });

  describe('chaining ratio calculation', () => {
    it('should calculate correct chaining percentage', () => {
      // 3 sentence pairs, 2 should chain = 66.7%
      const content = `Solar panels convert sunlight. This sunlight becomes electricity. Electricity powers homes. Random unrelated sentence.`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.totalPairs).toBe(3);
      expect(result.chainingRatio).toBeGreaterThanOrEqual(0.5);
    });

    it('should handle single sentence content gracefully', () => {
      const content = `Solar panels are efficient.`;
      const context = createContext();
      const violations = DiscourseChainingValidator.validate(content, context);

      // Single sentence has no pairs - should not flag
      expect(violations.filter(v => v.rule === 'D5_DISCOURSE_CHAINING').length).toBe(0);
    });

    it('should handle two sentence content', () => {
      const content = `Solar panels are efficient. They convert sunlight into electricity.`;
      const context = createContext();
      const violations = DiscourseChainingValidator.validate(content, context);

      // One pair, and it chains via "They" - should pass
      expect(violations.filter(v => v.severity === 'error').length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const content = '';
      const context = createContext();
      const violations = DiscourseChainingValidator.validate(content, context);

      expect(violations.length).toBe(0);
    });

    it('should handle content with only whitespace', () => {
      const content = '   \n\t  ';
      const context = createContext();
      const violations = DiscourseChainingValidator.validate(content, context);

      expect(violations.length).toBe(0);
    });

    it('should handle sentences with special characters', () => {
      const content = `Solar panels cost $10,000 on average. This cost varies by location and system size.`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.chainedPairs).toBe(1);
    });

    it('should handle HTML-like content by stripping tags', () => {
      const content = `<p>Solar panels generate electricity.</p> <p>This electricity powers the home.</p>`;
      const context = createContext();
      const result = DiscourseChainingValidator.analyzeChaining(content);

      expect(result.chainedPairs).toBe(1);
    });
  });

  describe('violation details', () => {
    it('should provide actionable suggestion in violation', () => {
      // Completely unrelated sentences with no shared nouns or pronouns
      const content = `Apples grow on trees. Dogs bark loudly. Mountains are tall. Rivers flow downstream.`;
      const context = createContext();
      const violations = DiscourseChainingValidator.validate(content, context);

      const chainingViolation = violations.find(v => v.rule === 'D5_DISCOURSE_CHAINING');
      expect(chainingViolation).toBeDefined();
      expect(chainingViolation?.suggestion).toContain('discourse chaining');
    });

    it('should include chaining ratio in violation text', () => {
      // Completely unrelated sentences with no shared nouns or pronouns
      const content = `Apples grow on trees. Dogs bark loudly. Mountains are tall. Rivers flow downstream.`;
      const context = createContext();
      const violations = DiscourseChainingValidator.validate(content, context);

      const chainingViolation = violations.find(v => v.rule === 'D5_DISCOURSE_CHAINING');
      expect(chainingViolation?.text).toMatch(/\d+%/);
    });
  });

  describe('threshold configuration', () => {
    it('should use default 50% threshold', () => {
      // 4 pairs, only 1 chains = 25% - should fail
      const content = `Apples are fruit. Bananas are yellow. Oranges have vitamin C. This vitamin is essential.`;
      const context = createContext();
      const violations = DiscourseChainingValidator.validate(content, context);

      expect(violations.some(v => v.rule === 'D5_DISCOURSE_CHAINING')).toBe(true);
    });

    it('should pass at exactly 50% threshold', () => {
      // 2 pairs, 1 chains = 50% - should pass
      const content = `Solar energy is renewable. This energy source is sustainable. Wind power is also clean.`;
      const context = createContext();
      const violations = DiscourseChainingValidator.validate(content, context);

      expect(violations.filter(v => v.rule === 'D5_DISCOURSE_CHAINING' && v.severity === 'error').length).toBe(0);
    });
  });
});
