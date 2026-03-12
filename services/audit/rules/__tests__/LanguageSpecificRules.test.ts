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
  // validate — Dutch filler detection
  // ---------------------------------------------------------------------------

  describe('validate() — Dutch filler detection', () => {
    it('should flag single-word Dutch fillers', () => {
      const text = 'Dit product is eigenlijk heel goed.';
      const issues = rules.validate(text, 'nl');
      const fillerIssues = issues.filter(i => i.ruleId === 'FILLER_NL');
      expect(fillerIssues.length).toBe(1);
      expect(fillerIssues[0].affectedElement).toBe('eigenlijk');
      expect(fillerIssues[0].severity).toBe('low');
    });

    it('should flag multi-word Dutch fillers', () => {
      const text = 'Over het algemeen is dit een goede keuze.';
      const issues = rules.validate(text, 'nl');
      const fillerIssues = issues.filter(i => i.ruleId === 'FILLER_NL');
      expect(fillerIssues.length).toBe(1);
      expect(fillerIssues[0].affectedElement).toBe('over het algemeen');
    });

    it('should flag multiple Dutch fillers in one text', () => {
      const text = 'Dit is eigenlijk gewoon een goed product, natuurlijk.';
      const issues = rules.validate(text, 'nl');
      const fillerIssues = issues.filter(i => i.ruleId === 'FILLER_NL');
      expect(fillerIssues.length).toBe(3);
    });

    it('should not flag Dutch fillers in non-Dutch text', () => {
      const text = 'Dit is eigenlijk gewoon een goed product.';
      const issues = rules.validate(text, 'en');
      const fillerIssues = issues.filter(i => i.ruleId === 'FILLER_NL');
      expect(fillerIssues.length).toBe(0);
    });

    it('should match Dutch fillers case-insensitively', () => {
      const text = 'EIGENLIJK is dit een goed product.';
      const issues = rules.validate(text, 'nl');
      const fillerIssues = issues.filter(i => i.ruleId === 'FILLER_NL');
      expect(fillerIssues.length).toBe(1);
    });

    it('should not flag partial word matches for Dutch fillers', () => {
      // "gewoon" should not match inside "gewoonweg"
      const text = 'Dit is gewoonweg fantastisch.';
      const issues = rules.validate(text, 'nl');
      const fillerIssues = issues.filter(i => i.ruleId === 'FILLER_NL' && i.affectedElement === 'gewoon');
      expect(fillerIssues.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // validate — German filler detection
  // ---------------------------------------------------------------------------

  describe('validate() — German filler detection', () => {
    it('should flag single-word German fillers', () => {
      const text = 'Das Produkt ist eigentlich sehr gut.';
      const issues = rules.validate(text, 'de');
      const fillerIssues = issues.filter(i => i.ruleId === 'FILLER_DE');
      expect(fillerIssues.length).toBe(1);
      expect(fillerIssues[0].affectedElement).toBe('eigentlich');
      expect(fillerIssues[0].severity).toBe('low');
    });

    it('should flag multi-word German fillers', () => {
      const text = 'Im Grunde genommen ist das eine gute Wahl.';
      const issues = rules.validate(text, 'de');
      const fillerIssues = issues.filter(i => i.ruleId === 'FILLER_DE');
      expect(fillerIssues.length).toBe(1);
      expect(fillerIssues[0].affectedElement).toBe('im Grunde genommen');
    });

    it('should flag multiple German fillers in one text', () => {
      const text = 'Es ist eigentlich quasi selbstverständlich.';
      const issues = rules.validate(text, 'de');
      const fillerIssues = issues.filter(i => i.ruleId === 'FILLER_DE');
      expect(fillerIssues.length).toBe(3);
    });

    it('should not flag German fillers for other languages', () => {
      const text = 'Es ist eigentlich quasi selbstverständlich.';
      const issues = rules.validate(text, 'nl');
      const fillerIssues = issues.filter(i => i.ruleId === 'FILLER_DE');
      expect(fillerIssues.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // validate — Dutch address mixing
  // ---------------------------------------------------------------------------

  describe('validate() — Dutch address mixing', () => {
    it('should flag mixing of formal and informal Dutch address', () => {
      const text = 'U kunt uw product bekijken. Klik op jouw account.';
      const issues = rules.validate(text, 'nl');
      const addrIssues = issues.filter(i => i.ruleId === 'ADDRESS_MIX_NL');
      expect(addrIssues.length).toBe(1);
      expect(addrIssues[0].severity).toBe('high');
    });

    it('should not flag purely formal Dutch text', () => {
      const text = 'U kunt uw product bekijken via uw account.';
      const issues = rules.validate(text, 'nl');
      const addrIssues = issues.filter(i => i.ruleId === 'ADDRESS_MIX_NL');
      expect(addrIssues.length).toBe(0);
    });

    it('should not flag purely informal Dutch text', () => {
      const text = 'Je kunt jouw product bekijken via je account.';
      const issues = rules.validate(text, 'nl');
      const addrIssues = issues.filter(i => i.ruleId === 'ADDRESS_MIX_NL');
      expect(addrIssues.length).toBe(0);
    });

    it('should detect je + u mixing', () => {
      const text = 'Als je wilt kunt u hier klikken.';
      const issues = rules.validate(text, 'nl');
      const addrIssues = issues.filter(i => i.ruleId === 'ADDRESS_MIX_NL');
      expect(addrIssues.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // validate — German address mixing
  // ---------------------------------------------------------------------------

  describe('validate() — German address mixing', () => {
    it('should flag mixing of Sie (formal) and du (informal)', () => {
      const text = 'Sie können Ihr Produkt ansehen. Klick auf dein Konto.';
      const issues = rules.validate(text, 'de');
      const addrIssues = issues.filter(i => i.ruleId === 'ADDRESS_MIX_DE');
      expect(addrIssues.length).toBe(1);
      expect(addrIssues[0].severity).toBe('high');
    });

    it('should not flag purely formal German text (Sie)', () => {
      const text = 'Sie können Ihr Produkt ansehen.';
      const issues = rules.validate(text, 'de');
      const addrIssues = issues.filter(i => i.ruleId === 'ADDRESS_MIX_DE');
      expect(addrIssues.length).toBe(0);
    });

    it('should not flag purely informal German text (du)', () => {
      const text = 'Du kannst dein Produkt ansehen.';
      const issues = rules.validate(text, 'de');
      const addrIssues = issues.filter(i => i.ruleId === 'ADDRESS_MIX_DE');
      expect(addrIssues.length).toBe(0);
    });

    it('should be case-sensitive for German Sie (capital = formal)', () => {
      // lowercase "sie" (they) + "du" should not be flagged
      const text = 'Wenn sie kommen, kannst du gehen.';
      const issues = rules.validate(text, 'de');
      const addrIssues = issues.filter(i => i.ruleId === 'ADDRESS_MIX_DE');
      expect(addrIssues.length).toBe(0);
    });

    it('should flag when Sie (capital) is mixed with informal forms', () => {
      const text = 'Sie haben recht, aber du musst aufpassen.';
      const issues = rules.validate(text, 'de');
      const addrIssues = issues.filter(i => i.ruleId === 'ADDRESS_MIX_DE');
      expect(addrIssues.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // validateEavSentence — V2 word order
  // ---------------------------------------------------------------------------

  describe('validateEavSentence()', () => {
    it('should flag Dutch sentence ending with a verb', () => {
      const issues = rules.validateEavSentence(
        'Het product veel geld kost.',
        'nl',
      );
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe('V2_WORD_ORDER_NL');
      expect(issues[0].severity).toBe('medium');
    });

    it('should flag German sentence ending with a verb', () => {
      const issues = rules.validateEavSentence(
        'Das Produkt viel Geld kostet.',
        'de',
      );
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe('V2_WORD_ORDER_DE');
      expect(issues[0].severity).toBe('medium');
    });

    it('should not flag Dutch sentence with correct V2 order', () => {
      const issues = rules.validateEavSentence(
        'Het product kost veel geld.',
        'nl',
      );
      expect(issues.length).toBe(0);
    });

    it('should not flag German sentence with correct V2 order', () => {
      const issues = rules.validateEavSentence(
        'Das Produkt kostet viel Geld.',
        'de',
      );
      expect(issues.length).toBe(0);
    });

    it('should strip trailing punctuation before checking', () => {
      const issues = rules.validateEavSentence(
        'Het apparaat tien kilo weegt.',
        'nl',
      );
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe('V2_WORD_ORDER_NL');
    });

    it('should not flag sentences shorter than 4 words', () => {
      const issues = rules.validateEavSentence('Het kost geld.', 'nl');
      expect(issues.length).toBe(0);
    });

    it('should return empty for English', () => {
      const issues = rules.validateEavSentence(
        'The product costs a lot of money is.',
        'en',
      );
      expect(issues.length).toBe(0);
    });

    it('should return empty for French', () => {
      const issues = rules.validateEavSentence(
        'Le produit coûte beaucoup est.',
        'fr',
      );
      expect(issues.length).toBe(0);
    });

    it('should handle sentence without punctuation', () => {
      const issues = rules.validateEavSentence(
        'Das System viele Funktionen bietet',
        'de',
      );
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe('V2_WORD_ORDER_DE');
    });

    it('should detect various Dutch verb forms at end', () => {
      const verbSentences = [
        'Het systeem goed werkt.',
        'Dit product veel waarde biedt.',
        'De installatie lang duurt.',
        'Deze taak veel inspanning vereist.',
      ];
      for (const s of verbSentences) {
        const issues = rules.validateEavSentence(s, 'nl');
        expect(issues.length).toBe(1);
      }
    });

    it('should detect various German verb forms at end', () => {
      const verbSentences = [
        'Das System gut funktioniert.',
        'Dieses Produkt viel Wert bietet.',
        'Die Installation lange dauert.',
        'Diese Aufgabe viel Aufwand erfordert.',
      ];
      for (const s of verbSentences) {
        const issues = rules.validateEavSentence(s, 'de');
        expect(issues.length).toBe(1);
      }
    });

    it('should not flag when last word is not a known verb form', () => {
      const issues = rules.validateEavSentence(
        'Het product is zeer betaalbaar.',
        'nl',
      );
      expect(issues.length).toBe(0);
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
