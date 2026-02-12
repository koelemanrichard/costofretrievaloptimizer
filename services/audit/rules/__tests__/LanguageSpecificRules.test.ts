// services/audit/rules/__tests__/LanguageSpecificRules.test.ts

import {
  LanguageSpecificRules,
  SupportedLanguage,
} from '../LanguageSpecificRules';

describe('LanguageSpecificRules', () => {
  let rules: LanguageSpecificRules;

  beforeEach(() => {
    rules = new LanguageSpecificRules();
  });

  // ---------------------------------------------------------------------------
  // getStopWords — size checks
  // ---------------------------------------------------------------------------

  describe('getStopWords()', () => {
    it('should return English stop words with at least 20 entries', () => {
      const stopWords = rules.getStopWords('en');
      expect(stopWords.size).toBeGreaterThanOrEqual(20);
      expect(stopWords.has('the')).toBe(true);
      expect(stopWords.has('is')).toBe(true);
      expect(stopWords.has('and')).toBe(true);
    });

    it('should return German stop words with at least 20 entries', () => {
      const stopWords = rules.getStopWords('de');
      expect(stopWords.size).toBeGreaterThanOrEqual(20);
      expect(stopWords.has('der')).toBe(true);
      expect(stopWords.has('die')).toBe(true);
      expect(stopWords.has('und')).toBe(true);
    });

    it('should return Dutch stop words with at least 20 entries', () => {
      const stopWords = rules.getStopWords('nl');
      expect(stopWords.size).toBeGreaterThanOrEqual(20);
      expect(stopWords.has('de')).toBe(true);
      expect(stopWords.has('het')).toBe(true);
      expect(stopWords.has('en')).toBe(true);
    });

    it('should return French stop words with at least 20 entries', () => {
      const stopWords = rules.getStopWords('fr');
      expect(stopWords.size).toBeGreaterThanOrEqual(20);
      expect(stopWords.has('le')).toBe(true);
      expect(stopWords.has('la')).toBe(true);
      expect(stopWords.has('et')).toBe(true);
    });

    it('should return Spanish stop words with at least 20 entries', () => {
      const stopWords = rules.getStopWords('es');
      expect(stopWords.size).toBeGreaterThanOrEqual(20);
      expect(stopWords.has('el')).toBe(true);
      expect(stopWords.has('la')).toBe(true);
      expect(stopWords.has('de')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getSignificantWords — stop word filtering
  // ---------------------------------------------------------------------------

  describe('getSignificantWords()', () => {
    it('should filter English stop words correctly', () => {
      const text = 'The quick brown fox is a fast animal';
      const significant = rules.getSignificantWords(text, 'en');

      expect(significant.has('quick')).toBe(true);
      expect(significant.has('brown')).toBe(true);
      expect(significant.has('fox')).toBe(true);
      expect(significant.has('fast')).toBe(true);
      expect(significant.has('animal')).toBe(true);
      // Stop words should be removed
      expect(significant.has('the')).toBe(false);
      expect(significant.has('is')).toBe(false);
      expect(significant.has('a')).toBe(false);
    });

    it('should filter German stop words correctly', () => {
      const text = 'Der schnelle braune Fuchs ist ein schnelles Tier';
      const significant = rules.getSignificantWords(text, 'de');

      expect(significant.has('schnelle')).toBe(true);
      expect(significant.has('braune')).toBe(true);
      expect(significant.has('fuchs')).toBe(true);
      expect(significant.has('schnelles')).toBe(true);
      expect(significant.has('tier')).toBe(true);
      // Stop words should be removed
      expect(significant.has('der')).toBe(false);
      expect(significant.has('ist')).toBe(false);
      expect(significant.has('ein')).toBe(false);
    });

    it('should filter Dutch stop words correctly', () => {
      const text = 'De snelle bruine vos is een snel dier';
      const significant = rules.getSignificantWords(text, 'nl');

      expect(significant.has('snelle')).toBe(true);
      expect(significant.has('bruine')).toBe(true);
      expect(significant.has('vos')).toBe(true);
      expect(significant.has('snel')).toBe(true);
      expect(significant.has('dier')).toBe(true);
      // Stop words should be removed
      expect(significant.has('de')).toBe(false);
      expect(significant.has('is')).toBe(false);
      expect(significant.has('een')).toBe(false);
    });

    it('should filter French stop words correctly', () => {
      const text = 'Le renard brun rapide est un animal rapide';
      const significant = rules.getSignificantWords(text, 'fr');

      expect(significant.has('renard')).toBe(true);
      expect(significant.has('brun')).toBe(true);
      expect(significant.has('rapide')).toBe(true);
      expect(significant.has('animal')).toBe(true);
      // Stop words should be removed
      expect(significant.has('le')).toBe(false);
      expect(significant.has('est')).toBe(false);
      expect(significant.has('un')).toBe(false);
    });

    it('should filter Spanish stop words correctly', () => {
      const text = 'El zorro marrón rápido es un animal veloz';
      const significant = rules.getSignificantWords(text, 'es');

      expect(significant.has('zorro')).toBe(true);
      expect(significant.has('marrón')).toBe(true);
      expect(significant.has('rápido')).toBe(true);
      expect(significant.has('animal')).toBe(true);
      expect(significant.has('veloz')).toBe(true);
      // Stop words should be removed
      expect(significant.has('el')).toBe(false);
      expect(significant.has('es')).toBe(false);
      expect(significant.has('un')).toBe(false);
    });

    it('should handle empty text', () => {
      const significant = rules.getSignificantWords('', 'en');
      expect(significant.size).toBe(0);
    });

    it('should handle text that is only stop words', () => {
      const text = 'the is a an and or but';
      const significant = rules.getSignificantWords(text, 'en');
      expect(significant.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // validate — German compound word detection
  // ---------------------------------------------------------------------------

  describe('validate() — German compound detection', () => {
    it('should flag split German compound words', () => {
      const text = 'Die Suchmaschinen Optimierung ist wichtig für jede Webseite.';
      const issues = rules.validate(text, 'de');

      expect(issues.length).toBeGreaterThanOrEqual(1);

      const compoundIssue = issues.find(
        i => i.ruleId === 'COMPOUND_SPLIT_GERMAN',
      );
      expect(compoundIssue).toBeDefined();
      expect(compoundIssue!.affectedElement).toBe('suchmaschinen optimierung');
      expect(compoundIssue!.exampleFix).toBe('Suchmaschinenoptimierung');
      expect(compoundIssue!.severity).toBe('medium');
    });

    it('should not flag correctly formed German compound words', () => {
      const text = 'Die Suchmaschinenoptimierung ist wichtig für jede Webseite.';
      const issues = rules.validate(text, 'de');
      expect(issues.length).toBe(0);
    });

    it('should detect multiple split compounds in one text', () => {
      const text = 'Suchmaschinen Optimierung und Inhalts Verzeichnis sind wichtig.';
      const issues = rules.validate(text, 'de');
      expect(issues.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // validate — Dutch compound word detection
  // ---------------------------------------------------------------------------

  describe('validate() — Dutch compound detection', () => {
    it('should flag split Dutch compound words', () => {
      const text = 'Zoekmachine optimalisatie is belangrijk voor elke website.';
      const issues = rules.validate(text, 'nl');

      expect(issues.length).toBeGreaterThanOrEqual(1);

      const compoundIssue = issues.find(
        i => i.ruleId === 'COMPOUND_SPLIT_DUTCH',
      );
      expect(compoundIssue).toBeDefined();
      expect(compoundIssue!.affectedElement).toBe('zoekmachine optimalisatie');
      expect(compoundIssue!.exampleFix).toBe('zoekmachineoptimalisatie');
      expect(compoundIssue!.severity).toBe('medium');
    });

    it('should not flag correctly formed Dutch compound words', () => {
      const text = 'Zoekmachineoptimalisatie is belangrijk voor elke website.';
      const issues = rules.validate(text, 'nl');
      expect(issues.length).toBe(0);
    });

    it('should detect multiple split compounds in one text', () => {
      const text = 'Zoekmachine optimalisatie en gebruikers ervaring zijn belangrijk.';
      const issues = rules.validate(text, 'nl');
      expect(issues.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // validate — English returns no language-specific issues
  // ---------------------------------------------------------------------------

  describe('validate() — English', () => {
    it('should return no language-specific issues for English text', () => {
      const text = 'Search engine optimization is important for every website.';
      const issues = rules.validate(text, 'en');
      expect(issues).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // validate — French and Spanish return empty (future enhancement)
  // ---------------------------------------------------------------------------

  describe('validate() — French', () => {
    it('should return no issues for French text (future enhancement)', () => {
      const text = "L'optimisation pour les moteurs de recherche est importante.";
      const issues = rules.validate(text, 'fr');
      expect(issues).toEqual([]);
    });
  });

  describe('validate() — Spanish', () => {
    it('should return no issues for Spanish text (future enhancement)', () => {
      const text = 'La optimización para motores de búsqueda es importante.';
      const issues = rules.validate(text, 'es');
      expect(issues).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should return empty array for empty text', () => {
      const issues = rules.validate('', 'de');
      expect(issues).toEqual([]);
    });

    it('should handle text with only punctuation', () => {
      const issues = rules.validate('...!!!???', 'nl');
      expect(issues).toEqual([]);
    });

    it('should handle unsupported language cast gracefully', () => {
      // Force an unsupported language code through the type system
      const issues = rules.validate('Some random text', 'xx' as SupportedLanguage);
      expect(issues).toEqual([]);
    });
  });
});
