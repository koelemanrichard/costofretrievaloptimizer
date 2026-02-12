import { describe, it, expect } from 'vitest';
import {
  DEFAULT_AUDIT_WEIGHTS,
  type AuditPhaseName,
  type AuditRequest,
  type AuditPhaseResult,
  type AuditFinding,
  type UnifiedAuditReport,
  type AuditWeightConfig,
  type FetchedContent,
  type FactClaim,
  type ContentMergeSuggestion,
  type CannibalizationRisk,
  type PerformanceSnapshot,
  type PerformanceCorrelation,
} from '../types';

describe('Audit Types', () => {
  it('AuditPhaseName covers all 15 phases', () => {
    const phases: AuditPhaseName[] = [
      'strategicFoundation', 'eavSystem', 'microSemantics',
      'informationDensity', 'contextualFlow', 'internalLinking',
      'semanticDistance', 'contentFormat', 'htmlTechnical',
      'metaStructuredData', 'costOfRetrieval', 'urlArchitecture',
      'crossPageConsistency', 'websiteTypeSpecific', 'factValidation',
    ];
    expect(phases).toHaveLength(15);
  });

  it('DEFAULT_AUDIT_WEIGHTS sums to 100 (excluding websiteTypeSpecific and factValidation)', () => {
    const coreWeights = Object.entries(DEFAULT_AUDIT_WEIGHTS)
      .filter(([k]) => k !== 'websiteTypeSpecific' && k !== 'factValidation')
      .reduce((sum, [, v]) => sum + (v as number), 0);
    expect(coreWeights).toBe(100);
  });

  it('DEFAULT_AUDIT_WEIGHTS has entries for all 13 core phases', () => {
    const corePhases: AuditPhaseName[] = [
      'strategicFoundation', 'eavSystem', 'microSemantics',
      'informationDensity', 'contextualFlow', 'internalLinking',
      'semanticDistance', 'contentFormat', 'htmlTechnical',
      'metaStructuredData', 'costOfRetrieval', 'urlArchitecture',
      'crossPageConsistency',
    ];
    for (const phase of corePhases) {
      expect(DEFAULT_AUDIT_WEIGHTS[phase]).toBeGreaterThan(0);
    }
  });

  it('AuditFinding has all required explanation fields', () => {
    const finding: AuditFinding = {
      id: 'test-1',
      phase: 'strategicFoundation',
      ruleId: 'rule-1',
      checklistRuleNumber: 1,
      severity: 'critical',
      title: 'Test finding',
      description: 'Test description',
      whyItMatters: 'Because it matters',
      currentValue: 'bad',
      expectedValue: 'good',
      exampleFix: 'Do this instead',
      autoFixAvailable: false,
      estimatedImpact: 'high',
      category: 'test',
    };
    expect(finding.whyItMatters).toBeTruthy();
    expect(finding.checklistRuleNumber).toBe(1);
    expect(finding.exampleFix).toBeTruthy();
  });

  it('AuditRequest supports internal, external, and published types', () => {
    const request: AuditRequest = {
      type: 'external',
      projectId: 'proj-1',
      url: 'https://example.com',
      depth: 'deep',
      phases: ['strategicFoundation', 'htmlTechnical'],
      scrapingProvider: 'jina',
      language: 'en',
      includeFactValidation: true,
      includePerformanceData: false,
    };
    expect(request.type).toBe('external');
    expect(request.phases).toHaveLength(2);
  });

  it('UnifiedAuditReport has complete structure', () => {
    const report: UnifiedAuditReport = {
      id: 'report-1',
      projectId: 'proj-1',
      auditType: 'internal',
      overallScore: 78,
      phaseResults: [],
      contentMergeSuggestions: [],
      missingKnowledgeGraphTopics: [],
      cannibalizationRisks: [],
      language: 'en',
      version: 1,
      createdAt: new Date().toISOString(),
      auditDurationMs: 5000,
      prerequisitesMet: { businessInfo: true, pillars: true, eavs: true },
    };
    expect(report.overallScore).toBe(78);
    expect(report.prerequisitesMet.businessInfo).toBe(true);
  });
});
