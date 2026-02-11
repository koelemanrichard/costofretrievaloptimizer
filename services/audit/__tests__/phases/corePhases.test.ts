import { describe, it, expect } from 'vitest';
import { StrategicFoundationPhase } from '../../phases/StrategicFoundationPhase';
import { EavSystemPhase } from '../../phases/EavSystemPhase';
import { ContentQualityPhase } from '../../phases/ContentQualityPhase';
import { LinkStructurePhase } from '../../phases/LinkStructurePhase';
import type { AuditRequest } from '../../types';
import { LinkingAuditPass } from '../../../../types';

const makeRequest = (): AuditRequest => ({
  type: 'internal',
  projectId: 'proj-1',
  depth: 'deep',
  phases: ['strategicFoundation', 'eavSystem', 'microSemantics', 'internalLinking'],
  scrapingProvider: 'jina',
  language: 'en',
  includeFactValidation: false,
  includePerformanceData: false,
});

describe('Core Phase Adapters', () => {
  describe('StrategicFoundationPhase', () => {
    it('has correct phaseName', () => {
      const phase = new StrategicFoundationPhase();
      expect(phase.phaseName).toBe('strategicFoundation');
    });

    it('execute returns valid AuditPhaseResult', async () => {
      const phase = new StrategicFoundationPhase();
      const result = await phase.execute(makeRequest());
      expect(result.phase).toBe('strategicFoundation');
      expect(result.score).toBeDefined();
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.summary).toBeTruthy();
    });

    it('returns 100 score with no findings when no content provided', async () => {
      const phase = new StrategicFoundationPhase();
      const result = await phase.execute(makeRequest());
      expect(result.score).toBe(100);
      expect(result.findings).toHaveLength(0);
      expect(result.passedChecks).toBe(0);
      expect(result.totalChecks).toBe(0);
    });

    it('transformCeIssues maps issues correctly', () => {
      const phase = new StrategicFoundationPhase();
      const findings = phase.transformCeIssues([
        {
          issue: 'missing_in_h1',
          severity: 'critical',
          description: 'Central entity not found in H1 heading',
          location: 'H1',
        },
        {
          issue: 'low_heading_presence',
          severity: 'warning',
          description: 'Only 20% of headings contain the central entity',
          location: 'Headings',
        },
        {
          issue: 'missing_in_schema',
          severity: 'info',
          description: 'Consider adding schema.org about property',
          location: 'Schema',
        },
      ]);

      expect(findings).toHaveLength(3);
      expect(findings[0].severity).toBe('critical');
      expect(findings[0].phase).toBe('strategicFoundation');
      expect(findings[0].title).toBe('Central Entity missing from H1');
      expect(findings[1].severity).toBe('high');
      expect(findings[2].severity).toBe('low');
    });
  });

  describe('EavSystemPhase', () => {
    it('has correct phaseName', () => {
      const phase = new EavSystemPhase();
      expect(phase.phaseName).toBe('eavSystem');
    });

    it('execute returns valid AuditPhaseResult', async () => {
      const phase = new EavSystemPhase();
      const result = await phase.execute(makeRequest());
      expect(result.phase).toBe('eavSystem');
      expect(result.score).toBeDefined();
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.summary).toBeTruthy();
    });

    it('returns 100 score with no findings when no EAV data provided', async () => {
      const phase = new EavSystemPhase();
      const result = await phase.execute(makeRequest());
      expect(result.score).toBe(100);
      expect(result.findings).toHaveLength(0);
    });

    it('transformEavInconsistencies maps inconsistencies correctly', () => {
      const phase = new EavSystemPhase();
      const findings = phase.transformEavInconsistencies([
        {
          id: 'test_attr_value_conflict',
          severity: 'critical',
          type: 'value_conflict',
          subject: 'water filter',
          attribute: 'lifespan',
          description: 'The attribute "lifespan" has 2 different values.',
          locations: [
            { topicTitle: 'Topic A', value: '6 months' },
            { topicTitle: 'Topic B', value: '12 months' },
          ],
          suggestion: 'Standardize the value for "lifespan".',
        },
        {
          id: 'test_attr_type_mismatch',
          severity: 'warning',
          type: 'type_mismatch',
          subject: 'water filter',
          attribute: 'capacity',
          description: 'The attribute "capacity" has different value types.',
          locations: [
            { topicTitle: 'Topic A', value: 'Type: number, Value: 500' },
            { topicTitle: 'Topic B', value: 'Type: string, Value: large' },
          ],
          suggestion: 'Ensure consistent value types.',
        },
      ]);

      expect(findings).toHaveLength(2);
      expect(findings[0].severity).toBe('critical');
      expect(findings[0].phase).toBe('eavSystem');
      expect(findings[0].title).toBe('Conflicting EAV values');
      expect(findings[0].affectedElement).toBe('water filter / lifespan');
      expect(findings[1].severity).toBe('high');
      expect(findings[1].title).toBe('EAV value type mismatch');
    });
  });

  describe('ContentQualityPhase', () => {
    it('has correct phaseName', () => {
      const phase = new ContentQualityPhase();
      expect(phase.phaseName).toBe('microSemantics');
    });

    it('execute returns valid AuditPhaseResult', async () => {
      const phase = new ContentQualityPhase();
      const result = await phase.execute(makeRequest());
      expect(result.phase).toBe('microSemantics');
      expect(result.score).toBeDefined();
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.summary).toBeTruthy();
    });

    it('returns 100 score with no findings when no content provided', async () => {
      const phase = new ContentQualityPhase();
      const result = await phase.execute(makeRequest());
      expect(result.score).toBe(100);
      expect(result.findings).toHaveLength(0);
    });

    it('transformAuditRuleResults maps failing rules to findings', () => {
      const phase = new ContentQualityPhase();
      const findings = phase.transformAuditRuleResults([
        {
          ruleName: 'Modality Check',
          isPassing: true,
          details: 'Good modality usage.',
          score: 85,
        },
        {
          ruleName: 'Stop Words Check',
          isPassing: false,
          details: 'Too many stop words in headers.',
          remediation: 'Remove filler words from H2 headings.',
          affectedTextSnippet: '## The Very Best Way To...',
          score: 35,
        },
        {
          ruleName: 'Heading Hierarchy',
          isPassing: false,
          details: 'H3 used without preceding H2.',
          score: 10,
        },
      ]);

      // Should only include failing rules
      expect(findings).toHaveLength(2);
      expect(findings[0].phase).toBe('microSemantics');
      expect(findings[0].title).toBe('Stop Words Check');
      expect(findings[0].severity).toBe('high'); // score 35 -> high
      expect(findings[0].exampleFix).toBe('Remove filler words from H2 headings.');
      expect(findings[1].title).toBe('Heading Hierarchy');
      expect(findings[1].severity).toBe('critical'); // score 10 -> critical
    });
  });

  describe('LinkStructurePhase', () => {
    it('has correct phaseName', () => {
      const phase = new LinkStructurePhase();
      expect(phase.phaseName).toBe('internalLinking');
    });

    it('execute returns valid AuditPhaseResult', async () => {
      const phase = new LinkStructurePhase();
      const result = await phase.execute(makeRequest());
      expect(result.phase).toBe('internalLinking');
      expect(result.score).toBeDefined();
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.summary).toBeTruthy();
    });

    it('returns 100 score with no findings when no linking context provided', async () => {
      const phase = new LinkStructurePhase();
      const result = await phase.execute(makeRequest());
      expect(result.score).toBe(100);
      expect(result.findings).toHaveLength(0);
    });

    it('transformLinkingIssues maps issues correctly', () => {
      const phase = new LinkStructurePhase();
      const findings = phase.transformLinkingIssues([
        {
          id: 'f01-topic-1',
          type: 'page_link_limit_exceeded',
          severity: 'warning',
          pass: LinkingAuditPass.FUNDAMENTALS,
          sourceTopic: 'Water Filters Guide',
          currentCount: 180,
          limit: 150,
          message: '"Water Filters Guide" has 180 links (max 150). PageRank dilution risk.',
          autoFixable: false,
        },
        {
          id: 'lf01-topic-2-topic-3',
          type: 'wrong_flow_direction',
          severity: 'critical',
          pass: LinkingAuditPass.FLOW_DIRECTION,
          sourceTopic: 'Buy Water Filter',
          targetTopic: 'What is Water',
          message: 'Core page links TO Author page. Authority should flow Author -> Core.',
          autoFixable: false,
          suggestedFix: 'Remove this link. Add reverse link.',
        },
        {
          id: 'f04-topic-4-topic-5',
          type: 'missing_annotation_text',
          severity: 'suggestion',
          pass: LinkingAuditPass.FUNDAMENTALS,
          sourceTopic: 'Filter Types',
          targetTopic: 'RO Filters',
          message: 'Link missing annotation text hint.',
          autoFixable: true,
          suggestedFix: 'AI will generate surrounding context.',
        },
      ]);

      expect(findings).toHaveLength(3);
      expect(findings[0].severity).toBe('high'); // warning -> high
      expect(findings[0].phase).toBe('internalLinking');
      expect(findings[0].title).toBe('Page link limit exceeded');
      expect(findings[0].currentValue).toBe('180');
      expect(findings[0].expectedValue).toBe('Max 150');
      expect(findings[0].category).toBe('Link Fundamentals');

      expect(findings[1].severity).toBe('critical');
      expect(findings[1].title).toBe('Incorrect link flow direction');
      expect(findings[1].affectedElement).toBe('Buy Water Filter -> What is Water');
      expect(findings[1].category).toBe('Link Flow Direction');

      expect(findings[2].severity).toBe('low'); // suggestion -> low
      expect(findings[2].autoFixAvailable).toBe(true);
    });
  });

  describe('Integration: all phases in orchestrator', () => {
    it('all phases can be instantiated together', () => {
      const phases = [
        new StrategicFoundationPhase(),
        new EavSystemPhase(),
        new ContentQualityPhase(),
        new LinkStructurePhase(),
      ];

      const phaseNames = phases.map(p => p.phaseName);
      expect(phaseNames).toEqual([
        'strategicFoundation',
        'eavSystem',
        'microSemantics',
        'internalLinking',
      ]);
    });

    it('all phases return valid results with empty request', async () => {
      const phases = [
        new StrategicFoundationPhase(),
        new EavSystemPhase(),
        new ContentQualityPhase(),
        new LinkStructurePhase(),
      ];

      const request = makeRequest();
      const results = await Promise.all(phases.map(p => p.execute(request)));

      for (const result of results) {
        expect(result.score).toBe(100);
        expect(result.findings).toHaveLength(0);
        expect(result.passedChecks).toBe(0);
        expect(result.totalChecks).toBe(0);
        expect(result.summary).toBeTruthy();
      }
    });
  });
});
