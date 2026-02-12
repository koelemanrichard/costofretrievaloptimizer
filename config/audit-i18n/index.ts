// config/audit-i18n/index.ts
// Translation loader and type definitions for the audit i18n system

import { en } from './en';
import { nl } from './nl';
import { de } from './de';
import { fr } from './fr';
import { es } from './es';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported audit UI languages */
export type AuditLanguage = 'en' | 'nl' | 'de' | 'fr' | 'es';

/** Shape of a single phase translation */
export interface PhaseTranslation {
  name: string;
  description: string;
}

/** Complete set of translations for the audit UI */
export interface AuditTranslations {
  phases: Record<string, PhaseTranslation>;
  severities: Record<string, string>;
  ui: {
    overallScore: string;
    phaseScores: string;
    findings: string;
    criticalIssues: string;
    highIssues: string;
    mediumIssues: string;
    lowIssues: string;
    noFindings: string;
    runAudit: string;
    auditComplete: string;
    prerequisites: string;
    businessInfo: string;
    pillars: string;
    eavs: string;
    setupRequired: string;
    proceedAnyway: string;
    websiteType: string;
    weights: string;
    resetDefaults: string;
    export: string;
    viewAll: string;
    whyItMatters: string;
    currentValue: string;
    expectedValue: string;
    exampleFix: string;
    autoFix: string;
  };
}

// ---------------------------------------------------------------------------
// Translation registry
// ---------------------------------------------------------------------------

const translations: Record<AuditLanguage, AuditTranslations> = {
  en,
  nl,
  de,
  fr,
  es,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get translations for the given language.
 * Falls back to English if the language is not supported.
 */
export function getTranslations(lang: AuditLanguage | string): AuditTranslations {
  if (lang in translations) {
    return translations[lang as AuditLanguage];
  }
  return translations.en;
}

/**
 * Returns the list of all supported audit UI languages.
 */
export function getSupportedLanguages(): AuditLanguage[] {
  return Object.keys(translations) as AuditLanguage[];
}
