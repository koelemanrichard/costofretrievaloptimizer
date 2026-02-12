// config/audit-i18n/de.ts
// German translations for the audit UI

import type { AuditTranslations } from './index';

export const de: AuditTranslations = {
  phases: {
    strategicFoundation: {
      name: 'Strategische Grundlage',
      description: 'Gesch\u00E4ftsinformationen, Pillar-Ausrichtung und thematische Autorit\u00E4tsbasis',
    },
    eavSystem: {
      name: 'EAV System',
      description: 'Entity-Attribut-Wert-Tripel-Abdeckung und Klassifikationsqualit\u00E4t',
    },
    microSemantics: {
      name: 'Mikro-Semantik',
      description: 'Sprachliche Pr\u00E4zision: Stoppw\u00F6rter, Modalit\u00E4t, Subjektpositionierung',
    },
    informationDensity: {
      name: 'Informationsdichte',
      description: 'Semantischer Reichtum pro Absatz und Abschnittstiefe',
    },
    contextualFlow: {
      name: 'Kontextueller Fluss',
      description: '\u00DCbergangsqualit\u00E4t, kontextuelle Br\u00FCcken und Diskurskoh\u00E4renz',
    },
    internalLinking: {
      name: 'Interne Verlinkung',
      description: 'Linkdichte, Ankertextrelevanz und verwaiste Seitenerkennung',
    },
    semanticDistance: {
      name: 'Semantische Distanz',
      description: 'Themen\u00E4hnlichkeit, Kannibalisierungsrisiken und Clusterintegrit\u00E4t',
    },
    contentFormat: {
      name: 'Inhaltsformat',
      description: 'Listen, Tabellen, visuelle Elemente und Featured-Snippet-Bereitschaft',
    },
    htmlTechnical: {
      name: 'HTML Technik',
      description: '\u00DCberschriftenhierarchie, semantische HTML-Elemente und Barrierefreiheit',
    },
    metaStructuredData: {
      name: 'Meta & Strukturierte Daten',
      description: 'Title-Tags, Meta-Beschreibungen, Open Graph und JSON-LD-Schema',
    },
    costOfRetrieval: {
      name: 'Abrufkosten',
      description: 'Informationszug\u00E4nglichkeit, Scannbarkeit und kognitive Belastung',
    },
    urlArchitecture: {
      name: 'URL Architektur',
      description: 'URL-Struktur, Slug-Optimierung und Pfadhierarchie',
    },
    crossPageConsistency: {
      name: 'Seiten\u00FCbergreifende Konsistenz',
      description: 'Terminologieausrichtung, Stilkonsistenz und Markenstimme',
    },
    websiteTypeSpecific: {
      name: 'Website-Typ',
      description: 'Regeln zugeschnitten auf Ihren Website-Typ (E-Commerce, Blog, SaaS usw.)',
    },
    factValidation: {
      name: 'Faktenpr\u00FCfung',
      description: 'Behauptungsverifizierung, Quellenangabe und Datengenauigkeit',
    },
  },
  severities: {
    critical: 'Kritisch',
    high: 'Hoch',
    medium: 'Mittel',
    low: 'Niedrig',
  },
  ui: {
    overallScore: 'Gesamtbewertung',
    phaseScores: 'Phasenbewertungen',
    findings: 'Ergebnisse',
    criticalIssues: 'Kritische Probleme',
    highIssues: 'Hohe Probleme',
    mediumIssues: 'Mittlere Probleme',
    lowIssues: 'Niedrige Probleme',
    noFindings: 'Keine Ergebnisse \u2014 alles sieht gut aus!',
    runAudit: 'Audit Starten',
    auditComplete: 'Audit Abgeschlossen',
    prerequisites: 'Voraussetzungen',
    businessInfo: 'Gesch\u00E4ftsinformationen',
    pillars: 'Pillar-Themen',
    eavs: 'EAVs',
    setupRequired: 'Einrichtung Erforderlich',
    proceedAnyway: 'Trotzdem Fortfahren',
    websiteType: 'Website-Typ',
    weights: 'Gewichtungen',
    resetDefaults: 'Standardwerte Wiederherstellen',
    export: 'Exportieren',
    viewAll: 'Alle Anzeigen',
    whyItMatters: 'Warum Es Wichtig Ist',
    currentValue: 'Aktueller Wert',
    expectedValue: 'Erwarteter Wert',
    exampleFix: 'Beispiel-Korrektur',
    autoFix: 'Automatisch Beheben',
  },
};
