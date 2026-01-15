// services/ai/contentGeneration/rulesEngine/validators/__tests__/eavPerSentenceValidator.test.ts
import { describe, it, expect } from 'vitest';
import { EavPerSentenceValidator } from '../eavPerSentenceValidator';
import { SectionGenerationContext, SemanticTriple } from '../../../../../../types';

describe('EavPerSentenceValidator', () => {
  const createContext = (eavs: SemanticTriple[] = []): SectionGenerationContext => ({
    section: {
      heading: 'Test Section',
      level: 2,
      content_zone: 'MAIN',
    },
    brief: {
      contextualVectors: eavs,
    },
    businessInfo: {
      seedKeyword: 'Test Entity',
    },
    allSections: [],
    isYMYL: false,
  } as any);

  const createEav = (subject: string, relation: string, value: string): SemanticTriple => ({
    subject: { label: subject, type: 'Entity' },
    predicate: { relation, type: 'Attribute' },
    object: { value, type: 'string' },
  });

  describe('validate', () => {
    it('should pass when each sentence contains exactly one EAV', () => {
      const content = 'German Shepherds weigh between 50-90 pounds. German Shepherds live 9-13 years. German Shepherds originated in Germany.';
      const eavs = [
        createEav('German Shepherd', 'weight', '50-90 pounds'),
        createEav('German Shepherd', 'lifespan', '9-13 years'),
        createEav('German Shepherd', 'origin', 'Germany'),
      ];
      const result = EavPerSentenceValidator.validate(content, createContext(eavs));
      expect(result.filter(v => v.severity === 'error').length).toBe(0);
    });

    it('should warn when sentence contains no EAV terms', () => {
      // Use longer sentences (10+ words) to trigger individual sentence warnings
      const content = 'This is a wonderful and amazing dog breed that many families consider for their homes. Many people love them dearly and consider them wonderful family companions.';
      const eavs = [createEav('German Shepherd', 'weight', '50-90 pounds')];
      const result = EavPerSentenceValidator.validate(content, createContext(eavs));
      expect(result.some(v => v.rule === 'SENTENCE_NO_EAV')).toBe(true);
    });

    it('should warn when sentence contains multiple EAV terms', () => {
      const content = 'German Shepherds weigh 50-90 pounds, live 9-13 years, and originated in Germany.';
      const eavs = [
        createEav('German Shepherd', 'weight', '50-90 pounds'),
        createEav('German Shepherd', 'lifespan', '9-13 years'),
        createEav('German Shepherd', 'origin', 'Germany'),
      ];
      const result = EavPerSentenceValidator.validate(content, createContext(eavs));
      expect(result.some(v => v.rule === 'SENTENCE_MULTIPLE_EAVS')).toBe(true);
    });

    it('should skip validation when no EAVs provided', () => {
      const content = 'This is some content without EAVs.';
      const result = EavPerSentenceValidator.validate(content, createContext([]));
      expect(result.length).toBe(0);
    });

    it('should handle sentences with partial EAV matches', () => {
      const content = 'The weight of a German Shepherd is notable.';
      const eavs = [createEav('German Shepherd', 'weight', '50-90 pounds')];
      const result = EavPerSentenceValidator.validate(content, createContext(eavs));
      // Should pass - contains entity and attribute (partial match is OK)
      expect(result.filter(v => v.severity === 'error').length).toBe(0);
    });
  });

  describe('countEavsInSentence', () => {
    it('should count EAV terms correctly', () => {
      const sentence = 'German Shepherds weigh 50-90 pounds.';
      const eavs = [
        createEav('German Shepherd', 'weight', '50-90 pounds'),
        createEav('German Shepherd', 'lifespan', '9-13 years'),
      ];
      const count = EavPerSentenceValidator.countEavsInSentence(sentence, eavs);
      expect(count).toBe(1);
    });
  });
});
