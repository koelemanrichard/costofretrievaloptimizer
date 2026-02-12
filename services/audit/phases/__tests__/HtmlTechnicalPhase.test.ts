import { describe, it, expect } from 'vitest';
import { HtmlTechnicalPhase } from '../HtmlTechnicalPhase';

describe('HtmlTechnicalPhase', () => {
  const phase = new HtmlTechnicalPhase();
  const baseRequest = {
    type: 'internal' as const,
    projectId: 'p1',
    depth: 'deep' as const,
    phases: ['htmlTechnical' as const],
    scrapingProvider: 'direct' as const,
    language: 'en',
    includeFactValidation: false,
    includePerformanceData: false,
  };

  it('returns empty result when no content', async () => {
    const result = await phase.execute(baseRequest);
    expect(result.findings).toHaveLength(0);
    expect(result.totalChecks).toBe(0);
  });

  it('detects images missing alt attribute (rule 256)', async () => {
    const html = '<img src="photo.jpg"><img src="banner.png">';
    const result = await phase.execute(baseRequest, { html });
    expect(result.findings).toContainEqual(expect.objectContaining({ ruleId: 'rule-256-missing' }));
  });

  it('detects images with empty alt (rule 256)', async () => {
    const html = '<img src="photo.jpg" alt=""><img src="banner.png" alt="">';
    const result = await phase.execute(baseRequest, { html });
    expect(result.findings).toContainEqual(expect.objectContaining({ ruleId: 'rule-256-empty' }));
  });

  it('passes images with proper alt text', async () => {
    const html = '<img src="photo.jpg" alt="A sunset over the mountains"><img src="logo.png" alt="Company logo">';
    const result = await phase.execute(baseRequest, { html });
    // Filter to rule-256 findings only; other validators may produce unrelated findings
    const altFindings = result.findings.filter(f => f.ruleId.startsWith('rule-256'));
    expect(altFindings).toHaveLength(0);
  });

  it('handles mixed alt scenarios', async () => {
    const html = '<img src="a.jpg" alt="Good"><img src="b.jpg"><img src="c.jpg" alt="">';
    const result = await phase.execute(baseRequest, { html });
    // Filter to rule-256 findings only; other validators may produce unrelated findings
    const altFindings = result.findings.filter(f => f.ruleId.startsWith('rule-256'));
    expect(altFindings).toHaveLength(2); // one missing, one empty
  });

  it('accepts plain string HTML content', async () => {
    const result = await phase.execute(baseRequest, '<img src="test.jpg">');
    expect(result.findings).toContainEqual(expect.objectContaining({ ruleId: 'rule-256-missing' }));
  });
});
