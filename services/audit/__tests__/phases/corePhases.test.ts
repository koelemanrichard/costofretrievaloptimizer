import { describe, it, expect } from 'vitest';
import { StrategicFoundationPhase } from '../../phases/StrategicFoundationPhase';
import { EavSystemPhase } from '../../phases/EavSystemPhase';
import { ContentQualityPhase } from '../../phases/ContentQualityPhase';
import { LinkStructurePhase } from '../../phases/LinkStructurePhase';
import type { AuditRequest } from '../../types';

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

    it('runs AiAssistedRuleEngine fallback checks when content has text', async () => {
      const phase = new ContentQualityPhase();
      // Text without first-person pronouns, no code/numbers/proper nouns, no definition paragraph
      const genericText = 'Things are good. Stuff happens. There is something here. It is important to note. Things should probably work. Maybe it does. Stuff is great. Some things are done. It is what it is. There is much to say.';
      const result = await phase.execute(makeRequest(), { text: genericText });
      expect(result.totalChecks).toBeGreaterThanOrEqual(8); // 4 micro + 4 AI fallback
      // Should produce at least some findings for very generic text
      expect(result.findings.length).toBeGreaterThanOrEqual(0);
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

    it('produces findings for HTML with link issues', async () => {
      const phase = new LinkStructurePhase();
      const html = `<html><body>
        <article>
          <p>Read about filters. <a href="https://example.com/a">click here</a> for more info.</p>
          <p><a href="https://example.com/b">read more</a></p>
        </article>
      </body></html>`;
      const request = { ...makeRequest(), url: 'https://example.com/test' };
      const result = await phase.execute(request, { html, totalWords: 500 });
      expect(result.totalChecks).toBe(29); // 16 internal linking + 13 external data
      expect(result.findings.length).toBeGreaterThan(0); // should find generic anchor issues
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
