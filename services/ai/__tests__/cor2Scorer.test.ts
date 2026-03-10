import { describe, it, expect } from 'vitest';
import { computeCor2Score } from '../cor2Scorer';

describe('computeCor2Score', () => {
  it('returns perfect score when all factors are optimal', () => {
    const result = computeCor2Score({
      chunkingIssueCount: 0,
      totalSections: 5,
      fillerWordCount: 0,
      totalWords: 500,
      capsuleCompliantSections: 5,
      totalH2Sections: 5,
      pronounDensity: 0.03,
      hasQuestionH2s: true,
      hasSemanticHtml: true,
      hasProperNesting: true,
      hasArticleSchema: true,
      hasAuthorEntity: true,
      hasCanonical: true,
    });
    expect(result.score).toBeGreaterThanOrEqual(4.5);
    expect(result.score).toBeLessThanOrEqual(5.0);
    expect(result.interpretation).toBe('fully_optimized');
  });

  it('returns low score when nothing is optimized', () => {
    const result = computeCor2Score({
      chunkingIssueCount: 10,
      totalSections: 5,
      fillerWordCount: 50,
      totalWords: 200,
      capsuleCompliantSections: 0,
      totalH2Sections: 5,
      pronounDensity: 0.20,
      hasQuestionH2s: false,
      hasSemanticHtml: false,
      hasProperNesting: false,
      hasArticleSchema: false,
      hasAuthorEntity: false,
      hasCanonical: false,
    });
    expect(result.score).toBeLessThan(2.5);
    expect(result.interpretation).toBe('not_optimized');
  });

  it('returns per-factor breakdown', () => {
    const result = computeCor2Score({
      chunkingIssueCount: 0,
      totalSections: 5,
      fillerWordCount: 0,
      totalWords: 500,
      capsuleCompliantSections: 5,
      totalH2Sections: 5,
      pronounDensity: 0.03,
      hasQuestionH2s: true,
      hasSemanticHtml: true,
      hasProperNesting: true,
      hasArticleSchema: true,
      hasAuthorEntity: true,
      hasCanonical: true,
    });
    expect(result.factors).toHaveProperty('selfContainedSections');
    expect(result.factors).toHaveProperty('informationDensity');
    expect(result.factors).toHaveProperty('answerCapsuleCompliance');
    expect(result.factors).toHaveProperty('entityExplicitness');
    expect(result.factors).toHaveProperty('structuralClarity');
    expect(result.factors).toHaveProperty('attributionIntegrity');
  });

  it('returns good_foundation for mid-range scores', () => {
    const result = computeCor2Score({
      chunkingIssueCount: 1,
      totalSections: 5,
      fillerWordCount: 10,
      totalWords: 500,
      capsuleCompliantSections: 3,
      totalH2Sections: 5,
      pronounDensity: 0.08,
      hasQuestionH2s: true,
      hasSemanticHtml: true,
      hasProperNesting: false,
      hasArticleSchema: true,
      hasAuthorEntity: false,
      hasCanonical: true,
    });
    expect(result.score).toBeGreaterThanOrEqual(2.5);
    expect(result.score).toBeLessThan(4.5);
    expect(['good_foundation', 'significant_gaps']).toContain(result.interpretation);
  });

  it('clamps density score at 0 for extreme filler ratios', () => {
    const result = computeCor2Score({
      chunkingIssueCount: 0,
      totalSections: 5,
      fillerWordCount: 100,
      totalWords: 100,
      capsuleCompliantSections: 5,
      totalH2Sections: 5,
      pronounDensity: 0.03,
      hasQuestionH2s: true,
      hasSemanticHtml: true,
      hasProperNesting: true,
      hasArticleSchema: true,
      hasAuthorEntity: true,
      hasCanonical: true,
    });
    expect(result.factors.informationDensity.score).toBe(0);
  });

  it('handles zero totalSections gracefully', () => {
    const result = computeCor2Score({
      chunkingIssueCount: 0,
      totalSections: 0,
      fillerWordCount: 0,
      totalWords: 500,
      capsuleCompliantSections: 0,
      totalH2Sections: 0,
      pronounDensity: 0.03,
      hasQuestionH2s: true,
      hasSemanticHtml: true,
      hasProperNesting: true,
      hasArticleSchema: true,
      hasAuthorEntity: true,
      hasCanonical: true,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(5);
  });
});
