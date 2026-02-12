// config/audit-i18n/en.ts
// English translations for the audit UI

import type { AuditTranslations } from './index';

export const en: AuditTranslations = {
  phases: {
    strategicFoundation: {
      name: 'Strategic Foundation',
      description: 'Business info, pillar alignment, and topical authority baseline',
    },
    eavSystem: {
      name: 'EAV System',
      description: 'Entity-Attribute-Value triple coverage and classification quality',
    },
    microSemantics: {
      name: 'Micro-Semantics',
      description: 'Linguistic precision: stop words, modality, subject positioning',
    },
    informationDensity: {
      name: 'Information Density',
      description: 'Semantic richness per paragraph and section depth',
    },
    contextualFlow: {
      name: 'Contextual Flow',
      description: 'Transition quality, contextual bridges, and discourse coherence',
    },
    internalLinking: {
      name: 'Internal Linking',
      description: 'Link density, anchor text relevance, and orphan page detection',
    },
    semanticDistance: {
      name: 'Semantic Distance',
      description: 'Topic similarity, cannibalization risks, and cluster integrity',
    },
    contentFormat: {
      name: 'Content Format',
      description: 'Lists, tables, visual elements, and featured snippet readiness',
    },
    htmlTechnical: {
      name: 'HTML Technical',
      description: 'Heading hierarchy, semantic HTML elements, and accessibility',
    },
    metaStructuredData: {
      name: 'Meta & Structured Data',
      description: 'Title tags, meta descriptions, Open Graph, and JSON-LD schema',
    },
    costOfRetrieval: {
      name: 'Cost of Retrieval',
      description: 'Information accessibility, scannability, and cognitive load',
    },
    urlArchitecture: {
      name: 'URL Architecture',
      description: 'URL structure, slug optimization, and path hierarchy',
    },
    crossPageConsistency: {
      name: 'Cross-Page Consistency',
      description: 'Terminology alignment, style consistency, and brand voice',
    },
    websiteTypeSpecific: {
      name: 'Website Type',
      description: 'Rules tailored to your specific website type (e-commerce, blog, SaaS, etc.)',
    },
    factValidation: {
      name: 'Fact Validation',
      description: 'Claim verification, source attribution, and data accuracy',
    },
  },
  severities: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  },
  ui: {
    overallScore: 'Overall Score',
    phaseScores: 'Phase Scores',
    findings: 'Findings',
    criticalIssues: 'Critical Issues',
    highIssues: 'High Issues',
    mediumIssues: 'Medium Issues',
    lowIssues: 'Low Issues',
    noFindings: 'No findings — everything looks good!',
    runAudit: 'Run Audit',
    auditComplete: 'Audit Complete',
    prerequisites: 'Prerequisites',
    businessInfo: 'Business Info',
    pillars: 'Pillars',
    eavs: 'EAVs',
    setupRequired: 'Setup Required',
    proceedAnyway: 'Proceed Anyway',
    websiteType: 'Website Type',
    weights: 'Weights',
    resetDefaults: 'Reset Defaults',
    export: 'Export',
    viewAll: 'View All',
    whyItMatters: 'Why It Matters',
    currentValue: 'Current Value',
    expectedValue: 'Expected Value',
    exampleFix: 'Example Fix',
    autoFix: 'Auto-Fix',
  },
};
