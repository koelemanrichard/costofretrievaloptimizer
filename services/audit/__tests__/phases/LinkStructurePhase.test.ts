import { describe, it, expect } from 'vitest';
import { LinkStructurePhase } from '../../phases/LinkStructurePhase';
import type { AuditRequest } from '../../types';

const makeRequest = (url?: string): AuditRequest => ({
  type: 'external',
  projectId: 'proj-1',
  depth: 'deep',
  phases: ['internalLinking'],
  scrapingProvider: 'jina',
  language: 'en',
  includeFactValidation: false,
  includePerformanceData: false,
  url,
});

describe('LinkStructurePhase', () => {
  it('returns 100 score with no content', async () => {
    const phase = new LinkStructurePhase();
    const result = await phase.execute(makeRequest());
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
    expect(result.totalChecks).toBe(0);
  });

  it('returns 100 score when HTML present but no URL', async () => {
    const phase = new LinkStructurePhase();
    const result = await phase.execute(makeRequest(), {
      html: '<html><body><a href="/test">Link</a></body></html>',
    });
    expect(result.totalChecks).toBe(0);
    expect(result.findings).toHaveLength(0);
  });

  it('runs both validators when HTML and URL present (totalChecks = 29)', async () => {
    const phase = new LinkStructurePhase();
    const html = `<html><body>
      <nav><a href="https://example.com/">Home</a><a href="https://example.com/about">About</a><a href="https://example.com/contact">Contact</a></nav>
      <article>
        <p>This is a long article about water filters. <a href="https://example.com/filters">water filtration systems</a> are important for clean drinking water.</p>
        <p>Learn more about <a href="https://example.com/types">different filter types</a> and their benefits.</p>
      </article>
      <footer><a href="https://example.com/privacy">Privacy</a></footer>
    </body></html>`;
    const request = makeRequest('https://example.com/test-page');
    const result = await phase.execute(request, { html, totalWords: 400 });
    // 16 (internal linking) + 13 (external data) = 29
    expect(result.totalChecks).toBe(29);
  });

  it('detects generic anchor text', async () => {
    const phase = new LinkStructurePhase();
    const html = `<html><body>
      <article>
        <p>For more info, <a href="https://example.com/a">click here</a>. Also <a href="https://example.com/b">read more</a> about this topic.</p>
        <p>You can also <a href="https://example.com/c">click here</a> for details.</p>
      </article>
    </body></html>`;
    const request = makeRequest('https://example.com/test');
    const result = await phase.execute(request, { html, totalWords: 100 });
    const genericAnchorFinding = result.findings.find(f => f.ruleId === 'rule-162');
    expect(genericAnchorFinding).toBeDefined();
  });

  it('detects missing breadcrumb navigation', async () => {
    const phase = new LinkStructurePhase();
    const html = `<html><body>
      <article>
        <p>Simple page without any navigation. <a href="https://example.com/other">related page</a></p>
      </article>
    </body></html>`;
    const request = makeRequest('https://example.com/test');
    const result = await phase.execute(request, { html, totalWords: 200 });
    const breadcrumbFinding = result.findings.find(f => f.ruleId === 'rule-188');
    expect(breadcrumbFinding).toBeDefined();
  });

  it('totalChecks >= findings.length invariant holds', async () => {
    const phase = new LinkStructurePhase();
    const html = `<html><body><p>No links at all in this content.</p></body></html>`;
    const request = makeRequest('https://example.com/empty');
    const result = await phase.execute(request, { html, totalWords: 500 });
    expect(result.totalChecks).toBeGreaterThanOrEqual(result.findings.length);
    expect(result.passedChecks).toBeGreaterThanOrEqual(0);
  });
});
