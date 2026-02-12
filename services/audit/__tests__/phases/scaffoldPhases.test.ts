import { describe, it, expect } from 'vitest';
import { InformationDensityPhase } from '../../phases/InformationDensityPhase';
import { ContextualFlowPhase } from '../../phases/ContextualFlowPhase';
import { SemanticDistancePhase } from '../../phases/SemanticDistancePhase';
import { ContentFormatPhase } from '../../phases/ContentFormatPhase';
import { HtmlTechnicalPhase } from '../../phases/HtmlTechnicalPhase';
import { MetaStructuredDataPhase } from '../../phases/MetaStructuredDataPhase';
import { CostOfRetrievalPhase } from '../../phases/CostOfRetrievalPhase';
import { UrlArchitecturePhase } from '../../phases/UrlArchitecturePhase';
import { CrossPageConsistencyPhase } from '../../phases/CrossPageConsistencyPhase';
import { WebsiteTypeSpecificPhase } from '../../phases/WebsiteTypeSpecificPhase';
import { FactValidationPhase } from '../../phases/FactValidationPhase';
import { StrategicFoundationPhase } from '../../phases/StrategicFoundationPhase';
import { EavSystemPhase } from '../../phases/EavSystemPhase';
import { ContentQualityPhase } from '../../phases/ContentQualityPhase';
import { LinkStructurePhase } from '../../phases/LinkStructurePhase';
import type { AuditRequest } from '../../types';

const mockRequest: AuditRequest = {
  type: 'internal',
  projectId: 'test-project',
  depth: 'quick',
  phases: [],
  scrapingProvider: 'jina',
  language: 'en',
  includeFactValidation: false,
  includePerformanceData: false,
};

describe('Scaffold Phase Adapters', () => {
  const phases = [
    { Phase: InformationDensityPhase, name: 'informationDensity' },
    { Phase: ContextualFlowPhase, name: 'contextualFlow' },
    { Phase: SemanticDistancePhase, name: 'semanticDistance' },
    { Phase: ContentFormatPhase, name: 'contentFormat' },
    { Phase: HtmlTechnicalPhase, name: 'htmlTechnical' },
    { Phase: MetaStructuredDataPhase, name: 'metaStructuredData' },
    { Phase: CostOfRetrievalPhase, name: 'costOfRetrieval' },
    { Phase: UrlArchitecturePhase, name: 'urlArchitecture' },
    { Phase: CrossPageConsistencyPhase, name: 'crossPageConsistency' },
    { Phase: WebsiteTypeSpecificPhase, name: 'websiteTypeSpecific' },
    { Phase: FactValidationPhase, name: 'factValidation' },
  ];

  it.each(phases)('$name has correct phaseName', ({ Phase, name }) => {
    const phase = new Phase();
    expect(phase.phaseName).toBe(name);
  });

  it.each(phases)('$name returns empty result with score 100', async ({ Phase }) => {
    const phase = new Phase();
    const result = await phase.execute(mockRequest);
    expect(result.score).toBe(100);
    expect(result.findings).toEqual([]);
    expect(result.totalChecks).toBe(0);
    expect(result.passedChecks).toBe(0);
  });

  it('all 15 phases have unique phase names', () => {
    const allPhases = [
      new StrategicFoundationPhase(),
      new EavSystemPhase(),
      new ContentQualityPhase(),
      new LinkStructurePhase(),
      ...phases.map(({ Phase }) => new Phase()),
    ];

    const names = allPhases.map(p => p.phaseName);
    expect(new Set(names).size).toBe(15);
  });
});
