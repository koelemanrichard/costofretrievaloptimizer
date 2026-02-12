// config/audit-i18n/nl.ts
// Dutch translations for the audit UI

import type { AuditTranslations } from './index';

export const nl: AuditTranslations = {
  phases: {
    strategicFoundation: {
      name: 'Strategisch Fundament',
      description: 'Bedrijfsinformatie, pilaarafstemming en topicale autoriteit als basis',
    },
    eavSystem: {
      name: 'EAV Systeem',
      description: 'Entity-Attribuut-Waarde drievouden dekking en classificatiekwaliteit',
    },
    microSemantics: {
      name: 'Micro-Semantiek',
      description: 'Taalkundige precisie: stopwoorden, modaliteit, onderwerpspositie',
    },
    informationDensity: {
      name: 'Informatiedichtheid',
      description: 'Semantische rijkdom per paragraaf en sectiediepte',
    },
    contextualFlow: {
      name: 'Contextuele Stroom',
      description: 'Overgangskwaliteit, contextuele bruggen en discourscoherentie',
    },
    internalLinking: {
      name: 'Interne Links',
      description: 'Linkdichtheid, ankertekstrelevantie en weespaginadetectie',
    },
    semanticDistance: {
      name: 'Semantische Afstand',
      description: 'Onderwerpgelijkenis, kannibalisatierisico\u2019s en clusterintegriteit',
    },
    contentFormat: {
      name: 'Contentformaat',
      description: 'Lijsten, tabellen, visuele elementen en gereedheid voor uitgelichte fragmenten',
    },
    htmlTechnical: {
      name: 'HTML Technisch',
      description: 'Kopteksthi\u00EBrarchie, semantische HTML-elementen en toegankelijkheid',
    },
    metaStructuredData: {
      name: 'Meta & Gestructureerde Data',
      description: 'Titeltags, metabeschrijvingen, Open Graph en JSON-LD-schema',
    },
    costOfRetrieval: {
      name: 'Kosten van Ophalen',
      description: 'Informatietoegankelijkheid, scanbaarheid en cognitieve belasting',
    },
    urlArchitecture: {
      name: 'URL Architectuur',
      description: 'URL-structuur, slug-optimalisatie en padhi\u00EBrarchie',
    },
    crossPageConsistency: {
      name: 'Consistentie tussen pagina\u2019s',
      description: 'Terminologieafstemming, stijlconsistentie en merkstem',
    },
    websiteTypeSpecific: {
      name: 'Websitetype',
      description: 'Regels afgestemd op uw specifieke websitetype (e-commerce, blog, SaaS, enz.)',
    },
    factValidation: {
      name: 'Feitvalidatie',
      description: 'Beweringverificatie, bronvermelding en gegevensnauwkeurigheid',
    },
  },
  severities: {
    critical: 'Kritiek',
    high: 'Hoog',
    medium: 'Gemiddeld',
    low: 'Laag',
  },
  ui: {
    overallScore: 'Totaalscore',
    phaseScores: 'Fasescores',
    findings: 'Bevindingen',
    criticalIssues: 'Kritieke Problemen',
    highIssues: 'Hoge Problemen',
    mediumIssues: 'Gemiddelde Problemen',
    lowIssues: 'Lage Problemen',
    noFindings: 'Geen bevindingen \u2014 alles ziet er goed uit!',
    runAudit: 'Audit Uitvoeren',
    auditComplete: 'Audit Voltooid',
    prerequisites: 'Vereisten',
    businessInfo: 'Bedrijfsinformatie',
    pillars: 'Pilaren',
    eavs: 'EAV\u2019s',
    setupRequired: 'Configuratie Vereist',
    proceedAnyway: 'Toch Doorgaan',
    websiteType: 'Websitetype',
    weights: 'Gewichten',
    resetDefaults: 'Standaardwaarden Herstellen',
    export: 'Exporteren',
    viewAll: 'Alles Bekijken',
    whyItMatters: 'Waarom Het Belangrijk Is',
    currentValue: 'Huidige Waarde',
    expectedValue: 'Verwachte Waarde',
    exampleFix: 'Voorbeeldoplossing',
    autoFix: 'Automatisch Herstellen',
  },
};
