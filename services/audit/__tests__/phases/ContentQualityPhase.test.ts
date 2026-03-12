import { describe, it, expect } from 'vitest';
import { ContentQualityPhase } from '../../phases/ContentQualityPhase';
import type { AuditRequest } from '../../types';

const makeRequest = (): AuditRequest => ({
  type: 'internal',
  projectId: 'proj-1',
  depth: 'deep',
  phases: ['microSemantics'],
  scrapingProvider: 'jina',
  language: 'en',
  includeFactValidation: false,
  includePerformanceData: false,
});

describe('ContentQualityPhase', () => {
  it('returns 100 score with no content', async () => {
    const phase = new ContentQualityPhase();
    const result = await phase.execute(makeRequest());
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
    expect(result.totalChecks).toBe(0);
  });

  it('runs MicroSemanticsValidator + AiAssistedRuleEngine (totalChecks = 8)', async () => {
    const phase = new ContentQualityPhase();
    const content = {
      text: 'Water filters are devices that remove impurities from water. They use various technologies including activated carbon, reverse osmosis, and UV treatment. The effectiveness depends on the type and quality of the filter.',
    };
    const result = await phase.execute(makeRequest(), content);
    // 4 (micro semantics) + 1 (language rules) + 4 (AI fallback) + 1 (chunking ref) + 1 (section length)
    expect(result.totalChecks).toBe(11);
    expect(result.totalChecks).toBeGreaterThanOrEqual(result.findings.length);
  });

  it('detects missing first-person experience indicators (rule-21-ai)', async () => {
    const phase = new ContentQualityPhase();
    // Content without any first-person pronouns
    const content = {
      text: 'Water filters remove impurities. The technology uses carbon. Results show 99% efficiency. Multiple studies confirm the findings. Experts recommend regular replacement.',
    };
    const result = await phase.execute(makeRequest(), content);
    const experienceFinding = result.findings.find(f => f.ruleId === 'rule-21-ai');
    expect(experienceFinding).toBeDefined();
    expect(experienceFinding?.severity).toBe('medium');
  });

  it('passes experience check when first-person used', async () => {
    const phase = new ContentQualityPhase();
    const content = {
      text: 'I tested the water filter for 3 months. We found that it removes 99% of contaminants. In my experience the carbon filters last longer than claimed. Our team measured the output regularly.',
    };
    const result = await phase.execute(makeRequest(), content);
    const experienceFinding = result.findings.find(f => f.ruleId === 'rule-21-ai');
    expect(experienceFinding).toBeUndefined();
  });

  it('detects lacking specific examples (rule-22-ai)', async () => {
    const phase = new ContentQualityPhase();
    // Very generic text without numbers, code, or proper nouns
    const content = {
      text: 'Things are good and stuff works well. The product is nice and does things properly. It helps with various tasks and improves results.',
    };
    const result = await phase.execute(makeRequest(), content);
    const exampleFinding = result.findings.find(f => f.ruleId === 'rule-22-ai');
    expect(exampleFinding).toBeDefined();
  });

  it('passes specific examples check when proper nouns present', async () => {
    const phase = new ContentQualityPhase();
    const content = {
      text: 'I tested the BRITA Maxtra filter for 90 days. The Amazon Basics filter costs $25 compared to $40 for the Pur Classic. We measured 99.7% chlorine removal using the Hach test kit.',
    };
    const result = await phase.execute(makeRequest(), content);
    const exampleFinding = result.findings.find(f => f.ruleId === 'rule-22-ai');
    expect(exampleFinding).toBeUndefined();
  });

  it('uses centralEntity and eavTriples from enriched content', async () => {
    const phase = new ContentQualityPhase();
    const content = {
      text: 'I recommend the BRITA filter. We tested it with 500 gallons. The BRITA Maxtra cartridge lasts 4 weeks.',
      centralEntity: 'BRITA filter',
      eavTriples: [
        { entity: 'BRITA filter', attribute: 'lifespan', value: '4 weeks' },
      ],
      rootAttributes: ['lifespan', 'capacity'],
    };
    const result = await phase.execute(makeRequest(), content);
    // 4 (micro semantics) + 1 (language rules) + 4 (AI fallback) + 1 (chunking ref) + 1 (section length)
    expect(result.totalChecks).toBe(11);
    // Should pass experience and examples checks
    expect(result.findings.find(f => f.ruleId === 'rule-21-ai')).toBeUndefined();
  });

  it('totalChecks >= findings.length invariant holds', async () => {
    const phase = new ContentQualityPhase();
    const content = {
      text: 'There is something. It is what it is. Things do stuff. Maybe it could probably be better. Should would might could. There is no way to know.',
    };
    const result = await phase.execute(makeRequest(), content);
    expect(result.totalChecks).toBeGreaterThanOrEqual(result.findings.length);
    expect(result.passedChecks).toBeGreaterThanOrEqual(0);
  });
});
