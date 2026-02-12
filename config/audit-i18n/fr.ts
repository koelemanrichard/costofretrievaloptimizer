// config/audit-i18n/fr.ts
// French translations for the audit UI

import type { AuditTranslations } from './index';

export const fr: AuditTranslations = {
  phases: {
    strategicFoundation: {
      name: 'Fondation Strat\u00E9gique',
      description: 'Informations commerciales, alignement des piliers et autorit\u00E9 thématique de base',
    },
    eavSystem: {
      name: 'Syst\u00E8me EAV',
      description: 'Couverture des triplets Entit\u00E9-Attribut-Valeur et qualit\u00E9 de classification',
    },
    microSemantics: {
      name: 'Micro-S\u00E9mantique',
      description: 'Pr\u00E9cision linguistique\u00A0: mots vides, modalit\u00E9, positionnement du sujet',
    },
    informationDensity: {
      name: 'Densit\u00E9 d\u2019Information',
      description: 'Richesse s\u00E9mantique par paragraphe et profondeur de section',
    },
    contextualFlow: {
      name: 'Flux Contextuel',
      description: 'Qualit\u00E9 des transitions, ponts contextuels et coh\u00E9rence du discours',
    },
    internalLinking: {
      name: 'Liens Internes',
      description: 'Densit\u00E9 de liens, pertinence du texte d\u2019ancrage et d\u00E9tection de pages orphelines',
    },
    semanticDistance: {
      name: 'Distance S\u00E9mantique',
      description: 'Similarit\u00E9 th\u00E9matique, risques de cannibalisation et int\u00E9grit\u00E9 des clusters',
    },
    contentFormat: {
      name: 'Format de Contenu',
      description: 'Listes, tableaux, \u00E9l\u00E9ments visuels et pr\u00E9paration aux extraits enrichis',
    },
    htmlTechnical: {
      name: 'HTML Technique',
      description: 'Hi\u00E9rarchie des titres, \u00E9l\u00E9ments HTML s\u00E9mantiques et accessibilit\u00E9',
    },
    metaStructuredData: {
      name: 'M\u00E9ta & Donn\u00E9es Structur\u00E9es',
      description: 'Balises de titre, m\u00E9ta-descriptions, Open Graph et sch\u00E9ma JSON-LD',
    },
    costOfRetrieval: {
      name: 'Co\u00FBt de R\u00E9cup\u00E9ration',
      description: 'Accessibilit\u00E9 de l\u2019information, capacit\u00E9 de balayage et charge cognitive',
    },
    urlArchitecture: {
      name: 'Architecture URL',
      description: 'Structure d\u2019URL, optimisation des slugs et hi\u00E9rarchie des chemins',
    },
    crossPageConsistency: {
      name: 'Coh\u00E9rence Inter-Pages',
      description: 'Alignement terminologique, coh\u00E9rence de style et voix de marque',
    },
    websiteTypeSpecific: {
      name: 'Type de Site',
      description: 'R\u00E8gles adapt\u00E9es \u00E0 votre type de site (e-commerce, blog, SaaS, etc.)',
    },
    factValidation: {
      name: 'Validation des Faits',
      description: 'V\u00E9rification des affirmations, attribution des sources et exactitude des donn\u00E9es',
    },
  },
  severities: {
    critical: 'Critique',
    high: '\u00C9lev\u00E9',
    medium: 'Moyen',
    low: 'Bas',
  },
  ui: {
    overallScore: 'Score Global',
    phaseScores: 'Scores par Phase',
    findings: 'R\u00E9sultats',
    criticalIssues: 'Probl\u00E8mes Critiques',
    highIssues: 'Probl\u00E8mes \u00C9lev\u00E9s',
    mediumIssues: 'Probl\u00E8mes Moyens',
    lowIssues: 'Probl\u00E8mes Bas',
    noFindings: 'Aucun r\u00E9sultat \u2014 tout semble en ordre\u00A0!',
    runAudit: 'Lancer l\u2019Audit',
    auditComplete: 'Audit Termin\u00E9',
    prerequisites: 'Pr\u00E9requis',
    businessInfo: 'Informations Commerciales',
    pillars: 'Piliers',
    eavs: 'EAV',
    setupRequired: 'Configuration Requise',
    proceedAnyway: 'Continuer Quand M\u00EAme',
    websiteType: 'Type de Site',
    weights: 'Pond\u00E9rations',
    resetDefaults: 'R\u00E9tablir les Valeurs par D\u00E9faut',
    export: 'Exporter',
    viewAll: 'Tout Afficher',
    whyItMatters: 'Pourquoi C\u2019est Important',
    currentValue: 'Valeur Actuelle',
    expectedValue: 'Valeur Attendue',
    exampleFix: 'Exemple de Correction',
    autoFix: 'Correction Automatique',
  },
};
