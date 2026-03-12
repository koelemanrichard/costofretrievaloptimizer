import { describe, it, expect } from 'vitest';
import { ChunkingResistanceValidator } from '../ChunkingResistanceValidator';

describe('ChunkingResistanceValidator', () => {
  const validator = new ChunkingResistanceValidator();

  describe('validate() — forward/backward reference detection', () => {
    it('flags English "as mentioned above" pattern', () => {
      const text = 'As mentioned above, solar panels reduce electricity costs.';
      const issues = validator.validate(text);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CHUNKING_FORWARD_REF');
      expect(issues[0].severity).toBe('medium');
    });

    it('flags English "see below" pattern', () => {
      const text = 'For more details, see below for a full comparison table.';
      const issues = validator.validate(text);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CHUNKING_FORWARD_REF');
    });

    it('flags English "as we discussed above" pattern', () => {
      const text = 'As we discussed above, the efficiency ratings vary by brand.';
      const issues = validator.validate(text);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CHUNKING_FORWARD_REF');
    });

    it('flags Dutch "zoals eerder vermeld" pattern', () => {
      const text = 'Zoals eerder vermeld, zonnepanelen verlagen de energiekosten.';
      const issues = validator.validate(text);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CHUNKING_FORWARD_REF');
      expect(issues[0].affectedElement).toContain('Zoals eerder vermeld');
    });

    it('flags Dutch "zie hieronder" pattern', () => {
      const text = 'Zie hieronder voor meer informatie over de installatie.';
      const issues = validator.validate(text);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CHUNKING_FORWARD_REF');
    });

    it('flags German "wie oben erwähnt" pattern', () => {
      const text = 'Wie oben erwähnt, senken Solaranlagen die Stromkosten erheblich.';
      const issues = validator.validate(text);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CHUNKING_FORWARD_REF');
    });

    it('flags German "siehe unten" pattern', () => {
      const text = 'Weitere Informationen, siehe unten in der Vergleichstabelle.';
      const issues = validator.validate(text);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CHUNKING_FORWARD_REF');
    });

    it('returns no issues for clean text without references', () => {
      const text = 'Solar panels convert sunlight into electricity through the photovoltaic effect. Modern panels achieve 20-25% efficiency ratings.';
      const issues = validator.validate(text);
      expect(issues).toHaveLength(0);
    });

    it('detects multiple reference patterns in one text', () => {
      const text = 'As mentioned above, this is important. Also, see below for more details.';
      const issues = validator.validate(text);
      expect(issues.length).toBeGreaterThanOrEqual(2);
      expect(issues.every(i => i.ruleId === 'CHUNKING_FORWARD_REF')).toBe(true);
    });
  });

  describe('validateSection() — entity re-introduction', () => {
    it('flags pronoun start without entity when isFirstSentence is true', () => {
      const issues = validator.validateSection(
        'It provides significant cost savings for homeowners.',
        'Solar energy',
        true
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CHUNKING_ENTITY_REINTRO');
      expect(issues[0].severity).toBe('medium');
    });

    it('flags Dutch pronoun "Het" without entity', () => {
      const issues = validator.validateSection(
        'Het biedt aanzienlijke kostenbesparingen.',
        'Zonnepanelen',
        true
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CHUNKING_ENTITY_REINTRO');
    });

    it('flags German pronoun "Dies" without entity', () => {
      const issues = validator.validateSection(
        'Dies bietet erhebliche Kosteneinsparungen.',
        'Solarenergie',
        true
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CHUNKING_ENTITY_REINTRO');
    });

    it('passes when entity is present in first sentence', () => {
      const issues = validator.validateSection(
        'Solar energy provides significant cost savings for homeowners.',
        'Solar energy',
        true
      );
      expect(issues).toHaveLength(0);
    });

    it('passes when sentence starts with pronoun but entity is also present', () => {
      const issues = validator.validateSection(
        'This solar energy technology provides cost savings.',
        'Solar energy',
        true
      );
      expect(issues).toHaveLength(0);
    });

    it('returns no issues when isFirstSentence is false', () => {
      const issues = validator.validateSection(
        'It provides significant cost savings for homeowners.',
        'Solar energy',
        false
      );
      expect(issues).toHaveLength(0);
    });

    it('returns no issues for empty sentence', () => {
      const issues = validator.validateSection('', 'Solar energy', true);
      expect(issues).toHaveLength(0);
    });

    it('does not flag non-pronoun starts without entity', () => {
      const issues = validator.validateSection(
        'Significant cost savings are available for homeowners.',
        'Solar energy',
        true
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe('validateSectionLength()', () => {
    it('flags sections over 500 words', () => {
      const longText = Array(550).fill('word').join(' ');
      const issues = validator.validateSectionLength(longText);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CHUNKING_SECTION_LENGTH');
      expect(issues[0].severity).toBe('medium');
      expect(issues[0].description).toContain('550');
    });

    it('passes sections at exactly 500 words', () => {
      const text = Array(500).fill('word').join(' ');
      const issues = validator.validateSectionLength(text);
      expect(issues).toHaveLength(0);
    });

    it('passes sections under 500 words', () => {
      const text = 'This is a normal length section with reasonable content.';
      const issues = validator.validateSectionLength(text);
      expect(issues).toHaveLength(0);
    });

    it('passes empty text', () => {
      const issues = validator.validateSectionLength('');
      expect(issues).toHaveLength(0);
    });
  });
});
