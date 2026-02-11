import { describe, it, expect } from 'vitest';
import { PerformanceCorrelator } from '../PerformanceCorrelator';

describe('PerformanceCorrelator', () => {
  const correlator = new PerformanceCorrelator();

  describe('calculateCorrelation', () => {
    it('calculates strong positive Pearson correlation', () => {
      const scores = [
        { date: '2026-01-01', value: 60 },
        { date: '2026-01-15', value: 72 },
        { date: '2026-02-01', value: 85 },
      ];
      const clicks = [
        { date: '2026-01-01', value: 100 },
        { date: '2026-01-15', value: 120 },
        { date: '2026-02-01', value: 180 },
      ];
      const result = correlator.calculateCorrelation(scores, clicks);
      expect(result).toBeGreaterThan(0.8);
    });

    it('calculates negative correlation', () => {
      const series1 = [
        { date: '2026-01-01', value: 10 },
        { date: '2026-01-02', value: 20 },
        { date: '2026-01-03', value: 30 },
      ];
      const series2 = [
        { date: '2026-01-01', value: 100 },
        { date: '2026-01-02', value: 80 },
        { date: '2026-01-03', value: 60 },
      ];
      const result = correlator.calculateCorrelation(series1, series2);
      expect(result).toBeLessThan(-0.8);
    });

    it('returns 0 for insufficient data points', () => {
      const result = correlator.calculateCorrelation(
        [{ date: '2026-01-01', value: 10 }],
        [{ date: '2026-01-01', value: 20 }]
      );
      expect(result).toBe(0);
    });

    it('handles non-overlapping dates', () => {
      const series1 = [{ date: '2026-01-01', value: 10 }];
      const series2 = [{ date: '2026-02-01', value: 20 }];
      const result = correlator.calculateCorrelation(series1, series2);
      expect(result).toBe(0);
    });
  });

  describe('calculateLaggedCorrelation', () => {
    it('finds correlation with time lag', () => {
      const scores = [
        { date: '2026-01-01', value: 60 },
        { date: '2026-01-15', value: 80 },
        { date: '2026-02-01', value: 90 },
      ];
      const clicks = [
        { date: '2026-01-15', value: 100 },
        { date: '2026-02-01', value: 150 },
        { date: '2026-02-15', value: 200 },
      ];
      // 14-day lag: scores → clicks 2 weeks later
      const result = correlator.calculateLaggedCorrelation(scores, clicks, 14);
      expect(typeof result).toBe('number');
    });
  });

  describe('correlate', () => {
    it('returns full PerformanceCorrelation with insight', () => {
      const scores = [
        { date: '2026-01-01', value: 50 },
        { date: '2026-01-08', value: 65 },
        { date: '2026-01-15', value: 80 },
      ];
      const clicks = [
        { date: '2026-01-01', value: 50 },
        { date: '2026-01-08', value: 75 },
        { date: '2026-01-15', value: 120 },
      ];
      const impressions = [
        { date: '2026-01-01', value: 500 },
        { date: '2026-01-08', value: 700 },
        { date: '2026-01-15', value: 1000 },
      ];

      const result = correlator.correlate(scores, clicks, impressions);
      expect(result.correlationCoefficient).toBeDefined();
      expect(result.insight).toBeTruthy();
      expect(result.auditScoreTrend).toHaveLength(3);
      expect(result.clicksTrend).toHaveLength(3);
    });
  });

  describe('findOptimalLag', () => {
    it('finds the best time lag', () => {
      const scores = [
        { date: '2026-01-01', value: 60 },
        { date: '2026-01-08', value: 70 },
        { date: '2026-01-15', value: 80 },
        { date: '2026-01-22', value: 90 },
      ];
      const clicks = [
        { date: '2026-01-08', value: 60 },
        { date: '2026-01-15', value: 70 },
        { date: '2026-01-22', value: 80 },
        { date: '2026-01-29', value: 90 },
      ];

      const result = correlator.findOptimalLag(scores, clicks, 28, 7);
      expect(result.lagDays).toBeDefined();
      expect(typeof result.correlation).toBe('number');
    });
  });

  describe('generateInsight', () => {
    it('generates strong positive insight', () => {
      const result = correlator.correlate(
        [{ date: '1', value: 1 }, { date: '2', value: 2 }, { date: '3', value: 3 }],
        [{ date: '1', value: 10 }, { date: '2', value: 20 }, { date: '3', value: 30 }],
        [{ date: '1', value: 100 }, { date: '2', value: 200 }, { date: '3', value: 300 }]
      );
      expect(result.insight).toContain('Strong positive');
    });
  });
});
