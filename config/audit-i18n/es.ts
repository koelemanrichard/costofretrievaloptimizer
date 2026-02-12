// config/audit-i18n/es.ts
// Spanish translations for the audit UI

import type { AuditTranslations } from './index';

export const es: AuditTranslations = {
  phases: {
    strategicFoundation: {
      name: 'Fundaci\u00F3n Estrat\u00E9gica',
      description: 'Informaci\u00F3n empresarial, alineaci\u00F3n de pilares y l\u00EDnea base de autoridad tem\u00E1tica',
    },
    eavSystem: {
      name: 'Sistema EAV',
      description: 'Cobertura de tripletas Entidad-Atributo-Valor y calidad de clasificaci\u00F3n',
    },
    microSemantics: {
      name: 'Micro-Sem\u00E1ntica',
      description: 'Precisi\u00F3n ling\u00FC\u00EDstica: palabras vac\u00EDas, modalidad, posicionamiento del sujeto',
    },
    informationDensity: {
      name: 'Densidad de Informaci\u00F3n',
      description: 'Riqueza sem\u00E1ntica por p\u00E1rrafo y profundidad de secci\u00F3n',
    },
    contextualFlow: {
      name: 'Flujo Contextual',
      description: 'Calidad de transiciones, puentes contextuales y coherencia del discurso',
    },
    internalLinking: {
      name: 'Enlaces Internos',
      description: 'Densidad de enlaces, relevancia del texto ancla y detecci\u00F3n de p\u00E1ginas hu\u00E9rfanas',
    },
    semanticDistance: {
      name: 'Distancia Sem\u00E1ntica',
      description: 'Similitud tem\u00E1tica, riesgos de canibalizaci\u00F3n e integridad de cl\u00FAsteres',
    },
    contentFormat: {
      name: 'Formato de Contenido',
      description: 'Listas, tablas, elementos visuales y preparaci\u00F3n para fragmentos destacados',
    },
    htmlTechnical: {
      name: 'HTML T\u00E9cnico',
      description: 'Jerarqu\u00EDa de encabezados, elementos HTML sem\u00E1nticos y accesibilidad',
    },
    metaStructuredData: {
      name: 'Meta y Datos Estructurados',
      description: 'Etiquetas de t\u00EDtulo, meta descripciones, Open Graph y esquema JSON-LD',
    },
    costOfRetrieval: {
      name: 'Costo de Recuperaci\u00F3n',
      description: 'Accesibilidad de la informaci\u00F3n, escaneabilidad y carga cognitiva',
    },
    urlArchitecture: {
      name: 'Arquitectura URL',
      description: 'Estructura de URL, optimizaci\u00F3n de slugs y jerarqu\u00EDa de rutas',
    },
    crossPageConsistency: {
      name: 'Consistencia entre P\u00E1ginas',
      description: 'Alineaci\u00F3n terminol\u00F3gica, consistencia de estilo y voz de marca',
    },
    websiteTypeSpecific: {
      name: 'Tipo de Sitio',
      description: 'Reglas adaptadas a su tipo de sitio (e-commerce, blog, SaaS, etc.)',
    },
    factValidation: {
      name: 'Validaci\u00F3n de Hechos',
      description: 'Verificaci\u00F3n de afirmaciones, atribuci\u00F3n de fuentes y precisi\u00F3n de datos',
    },
  },
  severities: {
    critical: 'Cr\u00EDtico',
    high: 'Alto',
    medium: 'Medio',
    low: 'Bajo',
  },
  ui: {
    overallScore: 'Puntuaci\u00F3n General',
    phaseScores: 'Puntuaciones por Fase',
    findings: 'Hallazgos',
    criticalIssues: 'Problemas Cr\u00EDticos',
    highIssues: 'Problemas Altos',
    mediumIssues: 'Problemas Medios',
    lowIssues: 'Problemas Bajos',
    noFindings: 'Sin hallazgos \u2014 \u00A1todo se ve bien!',
    runAudit: 'Ejecutar Auditor\u00EDa',
    auditComplete: 'Auditor\u00EDa Completada',
    prerequisites: 'Prerequisitos',
    businessInfo: 'Informaci\u00F3n Empresarial',
    pillars: 'Pilares',
    eavs: 'EAVs',
    setupRequired: 'Configuraci\u00F3n Requerida',
    proceedAnyway: 'Continuar de Todos Modos',
    websiteType: 'Tipo de Sitio',
    weights: 'Ponderaciones',
    resetDefaults: 'Restablecer Valores Predeterminados',
    export: 'Exportar',
    viewAll: 'Ver Todo',
    whyItMatters: 'Por Qu\u00E9 Importa',
    currentValue: 'Valor Actual',
    expectedValue: 'Valor Esperado',
    exampleFix: 'Ejemplo de Correcci\u00F3n',
    autoFix: 'Correcci\u00F3n Autom\u00E1tica',
  },
};
