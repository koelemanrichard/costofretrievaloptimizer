// services/ai/schemaGeneration/__tests__/schemaValidator.test.ts
import { describe, it, expect } from 'vitest';
import { validateSchemaVocabulary, runExternalSchemaValidation } from '../schemaValidator';

describe('Schema Vocabulary Validation', () => {
  describe('validateSchemaVocabulary', () => {
    it('returns empty errors array for valid schema types', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Test Article',
        author: {
          '@type': 'Person',
          name: 'John Doe'
        }
      };

      const errors = validateSchemaVocabulary(schema);
      expect(errors).toEqual([]);
    });

    it('flags unknown @type values', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'MadeUpType',
        name: 'Test'
      };

      const errors = validateSchemaVocabulary(schema);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('MadeUpType');
      expect(errors[0]).toContain('Unknown @type');
    });

    it('validates nested @type values in @graph', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Article', headline: 'Test' },
          { '@type': 'InvalidType', name: 'Invalid' }
        ]
      };

      const errors = validateSchemaVocabulary(schema);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('InvalidType'))).toBe(true);
    });

    it('validates deeply nested @type values', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        author: {
          '@type': 'FakePersonType',
          name: 'John'
        }
      };

      const errors = validateSchemaVocabulary(schema);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('FakePersonType'))).toBe(true);
    });

    it('validates @type values in arrays', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Q1', acceptedAnswer: { '@type': 'Answer', text: 'A1' } },
          { '@type': 'WrongType', name: 'Q2' }
        ]
      };

      const errors = validateSchemaVocabulary(schema);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('WrongType'))).toBe(true);
    });

    it('does NOT flag mainEntityOfPage as deprecated (it is valid Schema.org)', () => {
      // mainEntityOfPage is a valid Schema.org property and should NOT be flagged
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Test',
        mainEntityOfPage: 'https://example.com/page'
      };

      const errors = validateSchemaVocabulary(schema);
      // Should not contain any errors about mainEntityOfPage being deprecated
      expect(errors.some(e => e.includes('mainEntityOfPage'))).toBe(false);
    });

    it('validates all common Schema.org types correctly', () => {
      const validTypes = [
        'Article', 'NewsArticle', 'BlogPosting', 'TechArticle', 'HowTo', 'FAQPage',
        'Organization', 'LocalBusiness', 'Person', 'Product', 'Service', 'Event',
        'WebPage', 'WebSite', 'BreadcrumbList', 'ListItem', 'ImageObject', 'VideoObject'
      ];

      for (const type of validTypes) {
        const schema = { '@context': 'https://schema.org', '@type': type };
        const errors = validateSchemaVocabulary(schema);
        expect(errors.filter(e => e.includes(`Unknown @type "${type}"`))).toEqual([]);
      }
    });

    it('handles null and undefined values gracefully', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        author: null,
        description: undefined
      };

      // Should not throw
      const errors = validateSchemaVocabulary(schema);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('handles array @type values', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': ['Article', 'InvalidMultiType'],
        headline: 'Test'
      };

      const errors = validateSchemaVocabulary(schema);
      expect(errors.some(e => e.includes('InvalidMultiType'))).toBe(true);
    });
  });

  describe('runExternalSchemaValidation', () => {
    it('returns validation result object (not undefined)', async () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Test Article'
      };

      const result = await runExternalSchemaValidation(schema);

      expect(result).toBeDefined();
      expect(result).not.toBeUndefined();
    });

    it('returns isValid: true for valid schemas', async () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Test Article',
        author: { '@type': 'Person', name: 'John' }
      };

      const result = await runExternalSchemaValidation(schema);

      expect(result).toBeDefined();
      expect(result!.isValid).toBe(true);
      expect(result!.errors).toEqual([]);
      expect(result!.source).toBe('local-vocabulary');
    });

    it('returns isValid: false for schemas with invalid types', async () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'CompletelyMadeUpType',
        name: 'Test'
      };

      const result = await runExternalSchemaValidation(schema);

      expect(result).toBeDefined();
      expect(result!.isValid).toBe(false);
      expect(result!.errors.length).toBeGreaterThan(0);
    });

    it('includes source identifier in result', async () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Test'
      };

      const result = await runExternalSchemaValidation(schema);

      expect(result).toBeDefined();
      expect(typeof result!.source).toBe('string');
      expect(result!.source.length).toBeGreaterThan(0);
    });

    it('handles empty schema gracefully', async () => {
      const schema = {};

      const result = await runExternalSchemaValidation(schema);

      expect(result).toBeDefined();
      expect(Array.isArray(result!.errors)).toBe(true);
    });
  });
});
