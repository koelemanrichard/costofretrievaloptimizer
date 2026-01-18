// services/ai/contentGeneration/__tests__/depthAnalyzer.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeAndSuggestDepth, applyUserDepthChoice } from '../depthAnalyzer';
import { DepthAnalyzerInput } from '../../../../types/contentTemplates';

describe('depthAnalyzer', () => {
  describe('analyzeAndSuggestDepth', () => {
    it('should recommend high-quality for competitive SERP with high word counts', () => {
      const input: DepthAnalyzerInput = {
        competitorWordCounts: [2500, 3000, 2800, 2200, 2600],
        serpDifficulty: 'high',
        queryIntent: 'informational',
        topicType: 'core',
        existingTopicalAuthority: 20,
      };

      const result = analyzeAndSuggestDepth(input);

      expect(result.recommended).toBe('high-quality');
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.settings.maxSections).toBeGreaterThanOrEqual(8);
      expect(result.settings.targetWordCount.min).toBeGreaterThanOrEqual(2000);
    });

    it('should recommend quick-publish for easy SERP with low word counts', () => {
      const input: DepthAnalyzerInput = {
        competitorWordCounts: [500, 700, 600, 800, 550],
        serpDifficulty: 'low',
        queryIntent: 'navigational',
        topicType: 'child',
        existingTopicalAuthority: 80,
      };

      const result = analyzeAndSuggestDepth(input);

      expect(result.recommended).toBe('quick-publish');
      expect(result.settings.maxSections).toBeLessThanOrEqual(5);
      expect(result.settings.targetWordCount.max).toBeLessThanOrEqual(1500);
    });

    it('should include competitor benchmark in result', () => {
      const input: DepthAnalyzerInput = {
        competitorWordCounts: [1000, 1200, 1100, 1300, 1150],
        serpDifficulty: 'medium',
        queryIntent: 'informational',
        topicType: 'outer',
        existingTopicalAuthority: 50,
      };

      const result = analyzeAndSuggestDepth(input);

      expect(result.competitorBenchmark.avgWordCount).toBe(1150);
      expect(result.competitorBenchmark.topPerformerWordCount).toBe(1300);
    });

    it('should provide reasoning for core topics', () => {
      const input: DepthAnalyzerInput = {
        competitorWordCounts: [1500, 1800, 1600],
        serpDifficulty: 'medium',
        queryIntent: 'informational',
        topicType: 'core',
        existingTopicalAuthority: 40,
      };

      const result = analyzeAndSuggestDepth(input);

      expect(result.reasoning.some(r => r.toLowerCase().includes('core') || r.toLowerCase().includes('pillar'))).toBe(true);
    });
  });

  describe('applyUserDepthChoice', () => {
    it('should override to high-quality settings', () => {
      const suggestion = analyzeAndSuggestDepth({
        competitorWordCounts: [800, 900, 850],
        serpDifficulty: 'low',
        queryIntent: 'navigational',
        topicType: 'child',
        existingTopicalAuthority: 90,
      });

      const result = applyUserDepthChoice(suggestion, 'high-quality');

      expect(result.recommended).toBe('high-quality');
      expect(result.settings.maxSections).toBeGreaterThanOrEqual(8);
      expect(result.settings.sectionDepth).toBe('comprehensive');
    });

    it('should override to quick-publish settings', () => {
      const suggestion = analyzeAndSuggestDepth({
        competitorWordCounts: [2500, 3000, 2800],
        serpDifficulty: 'high',
        queryIntent: 'informational',
        topicType: 'core',
        existingTopicalAuthority: 20,
      });

      const result = applyUserDepthChoice(suggestion, 'quick-publish');

      expect(result.recommended).toBe('quick-publish');
      expect(result.settings.maxSections).toBeLessThanOrEqual(5);
      expect(result.settings.sectionDepth).toBe('brief');
    });

    it('should apply custom settings when provided', () => {
      const suggestion = analyzeAndSuggestDepth({
        competitorWordCounts: [1500, 1800, 1600],
        serpDifficulty: 'medium',
        queryIntent: 'informational',
        topicType: 'outer',
        existingTopicalAuthority: 50,
      });

      const result = applyUserDepthChoice(suggestion, 'custom', {
        maxSections: 6,
        targetWordCount: { min: 1200, max: 1800 },
      });

      expect(result.settings.maxSections).toBe(6);
      expect(result.settings.targetWordCount.min).toBe(1200);
      expect(result.settings.targetWordCount.max).toBe(1800);
    });
  });
});
