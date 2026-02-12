import { describe, it, expect, vi } from 'vitest';
import { FactValidationPhase } from '../../phases/FactValidationPhase';
import type { AuditRequest, FetchedContent } from '../../types';
import type { ClaimVerifier } from '../../FactValidator';

const mockRequest: AuditRequest = {
  type: 'external',
  projectId: 'test-project',
  url: 'https://example.com',
  depth: 'deep',
  phases: ['factValidation'],
  scrapingProvider: 'jina',
  language: 'en',
  includeFactValidation: true,
  includePerformanceData: false,
};

const mockContent: FetchedContent = {
  url: 'https://example.com',
  semanticText: '83% of marketers use content marketing. According to HubSpot, email marketing has an ROI of 4200%. As of 2019, 65% of businesses use social media daily.',
  rawHtml: '<html><body>...</body></html>',
  title: 'Test',
  metaDescription: '',
  headings: [],
  images: [],
  internalLinks: [],
  externalLinks: [],
  schemaMarkup: [],
  language: 'en',
  provider: 'jina',
  fetchDurationMs: 100,
};

describe('FactValidationPhase', () => {
  it('returns empty results when fact validation not requested', async () => {
    const phase = new FactValidationPhase();
    const result = await phase.execute({ ...mockRequest, includeFactValidation: false });
    expect(result.findings).toHaveLength(0);
    expect(result.totalChecks).toBe(0);
  });

  it('returns empty results when no content provided', async () => {
    const phase = new FactValidationPhase();
    const result = await phase.execute(mockRequest);
    expect(result.findings).toHaveLength(0);
  });

  it('extracts and verifies claims from content', async () => {
    const mockVerifier: ClaimVerifier = vi.fn().mockResolvedValue({
      status: 'verified',
      sources: [{ url: 'https://source.com', title: 'Source', snippet: 'Confirmed', agreesWithClaim: true, retrievedAt: new Date().toISOString() }],
    });

    const phase = new FactValidationPhase(mockVerifier);
    const result = await phase.execute(mockRequest, mockContent);

    // Should have found claims and run checks
    expect(result.totalChecks).toBeGreaterThan(0);
    // Verified claims should not produce findings, so findings should be less than totalChecks
    // (outdated claim for 2019 stat should still produce a finding)
    expect(result.phase).toBe('factValidation');
  });

  it('creates critical finding for disputed claims', async () => {
    const mockVerifier: ClaimVerifier = vi.fn().mockResolvedValue({
      status: 'disputed',
      sources: [{ url: 'https://source.com', title: 'Contradicting Source', snippet: 'Disputes claim', agreesWithClaim: false, retrievedAt: new Date().toISOString() }],
    });

    const phase = new FactValidationPhase(mockVerifier);
    const result = await phase.execute(mockRequest, mockContent);

    const disputedFindings = result.findings.filter(f => f.severity === 'critical');
    expect(disputedFindings.length).toBeGreaterThan(0);
    expect(disputedFindings[0].category).toBe('Fact Validation');
  });

  it('flags outdated statistics as high severity', async () => {
    // The default verifier won't be called for outdated stats
    const phase = new FactValidationPhase();
    const contentWithOldStat: FetchedContent = {
      ...mockContent,
      semanticText: 'As of 2019, 65% of businesses use social media. This fact is from a long sentence that is old and outdated.',
    };

    const result = await phase.execute(mockRequest, contentWithOldStat);
    const outdatedFindings = result.findings.filter(f => f.currentValue === 'outdated');
    expect(outdatedFindings.length).toBeGreaterThanOrEqual(1);
    expect(outdatedFindings[0].severity).toBe('high');
  });

  it('has correct phaseName', () => {
    const phase = new FactValidationPhase();
    expect(phase.phaseName).toBe('factValidation');
  });
});
