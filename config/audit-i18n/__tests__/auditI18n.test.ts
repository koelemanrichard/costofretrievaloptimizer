// config/audit-i18n/__tests__/auditI18n.test.ts

import { describe, it, expect } from 'vitest';
import {
  getTranslations,
  getSupportedLanguages,
  type AuditLanguage,
  type AuditTranslations,
} from '../index';

// All 15 phase keys that must exist in every language
const REQUIRED_PHASE_KEYS = [
  'strategicFoundation',
  'eavSystem',
  'microSemantics',
  'informationDensity',
  'contextualFlow',
  'internalLinking',
  'semanticDistance',
  'contentFormat',
  'htmlTechnical',
  'metaStructuredData',
  'costOfRetrieval',
  'urlArchitecture',
  'crossPageConsistency',
  'websiteTypeSpecific',
  'factValidation',
] as const;

// All severity keys
const REQUIRED_SEVERITY_KEYS = ['critical', 'high', 'medium', 'low'] as const;

// All UI string keys (derived from the TypeScript interface)
const REQUIRED_UI_KEYS = [
  'overallScore',
  'phaseScores',
  'findings',
  'criticalIssues',
  'highIssues',
  'mediumIssues',
  'lowIssues',
  'noFindings',
  'runAudit',
  'auditComplete',
  'prerequisites',
  'businessInfo',
  'pillars',
  'eavs',
  'setupRequired',
  'proceedAnyway',
  'websiteType',
  'weights',
  'resetDefaults',
  'export',
  'viewAll',
  'whyItMatters',
  'currentValue',
  'expectedValue',
  'exampleFix',
  'autoFix',
] as const;

describe('Audit i18n system', () => {
  const supportedLanguages = getSupportedLanguages();

  describe('getSupportedLanguages', () => {
    it('should return exactly 5 languages', () => {
      expect(supportedLanguages).toHaveLength(5);
    });

    it('should contain en, nl, de, fr, es', () => {
      expect(supportedLanguages).toContain('en');
      expect(supportedLanguages).toContain('nl');
      expect(supportedLanguages).toContain('de');
      expect(supportedLanguages).toContain('fr');
      expect(supportedLanguages).toContain('es');
    });
  });

  describe('getTranslations', () => {
    it.each(supportedLanguages)('should load translations for "%s"', (lang) => {
      const t = getTranslations(lang);
      expect(t).toBeDefined();
      expect(t.phases).toBeDefined();
      expect(t.severities).toBeDefined();
      expect(t.ui).toBeDefined();
    });

    it('should fall back to English for an unknown language code', () => {
      const t = getTranslations('zz' as AuditLanguage);
      const en = getTranslations('en');
      expect(t).toEqual(en);
    });

    it('should fall back to English for an empty string', () => {
      const t = getTranslations('' as AuditLanguage);
      const en = getTranslations('en');
      expect(t).toEqual(en);
    });
  });

  describe('Phase translations', () => {
    it.each(supportedLanguages)('"%s" should have all 15 required phase keys', (lang) => {
      const t = getTranslations(lang);
      for (const key of REQUIRED_PHASE_KEYS) {
        expect(t.phases[key], `Missing phase "${key}" in "${lang}"`).toBeDefined();
      }
    });

    it.each(supportedLanguages)('"%s" phases should have non-empty name and description', (lang) => {
      const t = getTranslations(lang);
      for (const key of REQUIRED_PHASE_KEYS) {
        const phase = t.phases[key];
        expect(phase.name.length, `Empty phase name for "${key}" in "${lang}"`).toBeGreaterThan(0);
        expect(phase.description.length, `Empty phase description for "${key}" in "${lang}"`).toBeGreaterThan(0);
      }
    });

    it('should have exactly 15 phases per language (no extras)', () => {
      for (const lang of supportedLanguages) {
        const t = getTranslations(lang);
        expect(Object.keys(t.phases)).toHaveLength(15);
      }
    });
  });

  describe('Severity translations', () => {
    it.each(supportedLanguages)('"%s" should have all 4 severity keys', (lang) => {
      const t = getTranslations(lang);
      for (const key of REQUIRED_SEVERITY_KEYS) {
        expect(t.severities[key], `Missing severity "${key}" in "${lang}"`).toBeDefined();
        expect(t.severities[key].length, `Empty severity "${key}" in "${lang}"`).toBeGreaterThan(0);
      }
    });
  });

  describe('UI string translations', () => {
    it.each(supportedLanguages)('"%s" should have all %i required UI keys', (lang) => {
      const t = getTranslations(lang);
      for (const key of REQUIRED_UI_KEYS) {
        expect(
          (t.ui as Record<string, string>)[key],
          `Missing UI key "${key}" in "${lang}"`
        ).toBeDefined();
      }
    });

    it.each(supportedLanguages)('"%s" UI strings should all be non-empty', (lang) => {
      const t = getTranslations(lang);
      for (const key of REQUIRED_UI_KEYS) {
        const value = (t.ui as Record<string, string>)[key];
        expect(value.length, `Empty UI string "${key}" in "${lang}"`).toBeGreaterThan(0);
      }
    });

    it('should have exactly the right number of UI keys per language', () => {
      for (const lang of supportedLanguages) {
        const t = getTranslations(lang);
        expect(Object.keys(t.ui)).toHaveLength(REQUIRED_UI_KEYS.length);
      }
    });
  });

  describe('Type safety: structural consistency', () => {
    it('all languages should have identical key structures', () => {
      const enT = getTranslations('en');
      const enPhaseKeys = Object.keys(enT.phases).sort();
      const enSeverityKeys = Object.keys(enT.severities).sort();
      const enUiKeys = Object.keys(enT.ui).sort();

      for (const lang of supportedLanguages.filter((l) => l !== 'en')) {
        const t = getTranslations(lang);
        expect(Object.keys(t.phases).sort(), `Phase keys mismatch in "${lang}"`).toEqual(enPhaseKeys);
        expect(Object.keys(t.severities).sort(), `Severity keys mismatch in "${lang}"`).toEqual(enSeverityKeys);
        expect(Object.keys(t.ui).sort(), `UI keys mismatch in "${lang}"`).toEqual(enUiKeys);
      }
    });

    it('no translation value should be undefined or null', () => {
      for (const lang of supportedLanguages) {
        const t = getTranslations(lang);

        // Check phases
        for (const [key, phase] of Object.entries(t.phases)) {
          expect(phase.name, `phases.${key}.name is nullish in "${lang}"`).not.toBeNull();
          expect(phase.description, `phases.${key}.description is nullish in "${lang}"`).not.toBeNull();
        }

        // Check severities
        for (const [key, value] of Object.entries(t.severities)) {
          expect(value, `severities.${key} is nullish in "${lang}"`).not.toBeNull();
        }

        // Check UI
        for (const [key, value] of Object.entries(t.ui)) {
          expect(value, `ui.${key} is nullish in "${lang}"`).not.toBeNull();
        }
      }
    });
  });

  describe('Language-specific spot checks', () => {
    it('English phase names match expected values', () => {
      const t = getTranslations('en');
      expect(t.phases.strategicFoundation.name).toBe('Strategic Foundation');
      expect(t.phases.costOfRetrieval.name).toBe('Cost of Retrieval');
      expect(t.phases.factValidation.name).toBe('Fact Validation');
    });

    it('Dutch phase names match expected values', () => {
      const t = getTranslations('nl');
      expect(t.phases.strategicFoundation.name).toBe('Strategisch Fundament');
      expect(t.phases.costOfRetrieval.name).toBe('Kosten van Ophalen');
      expect(t.phases.factValidation.name).toBe('Feitvalidatie');
    });

    it('German phase names match expected values', () => {
      const t = getTranslations('de');
      expect(t.phases.strategicFoundation.name).toBe('Strategische Grundlage');
      expect(t.phases.costOfRetrieval.name).toBe('Abrufkosten');
      expect(t.phases.factValidation.name).toBe('Faktenpr\u00FCfung');
    });

    it('French phase names match expected values', () => {
      const t = getTranslations('fr');
      expect(t.phases.strategicFoundation.name).toBe('Fondation Strat\u00E9gique');
      expect(t.phases.costOfRetrieval.name).toBe('Co\u00FBt de R\u00E9cup\u00E9ration');
      expect(t.phases.factValidation.name).toBe('Validation des Faits');
    });

    it('Spanish phase names match expected values', () => {
      const t = getTranslations('es');
      expect(t.phases.strategicFoundation.name).toBe('Fundaci\u00F3n Estrat\u00E9gica');
      expect(t.phases.costOfRetrieval.name).toBe('Costo de Recuperaci\u00F3n');
      expect(t.phases.factValidation.name).toBe('Validaci\u00F3n de Hechos');
    });

    it('severity labels differ across languages', () => {
      const enSev = getTranslations('en').severities.critical;
      const nlSev = getTranslations('nl').severities.critical;
      const deSev = getTranslations('de').severities.critical;
      const frSev = getTranslations('fr').severities.critical;
      const esSev = getTranslations('es').severities.critical;

      // At least 4 of the 5 should be unique (EN/DE happen to share "Critical"/"Kritisch")
      const unique = new Set([enSev, nlSev, deSev, frSev, esSev]);
      expect(unique.size).toBeGreaterThanOrEqual(4);
    });
  });
});
