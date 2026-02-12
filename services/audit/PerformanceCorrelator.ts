import type { PerformanceCorrelation } from './types';

interface TimeSeriesPoint {
  date: string;
  value: number;
}

export class PerformanceCorrelator {
  /**
   * Calculate Pearson correlation coefficient between two time series.
   * Returns a value between -1 (perfect negative) and 1 (perfect positive).
   */
  calculateCorrelation(series1: TimeSeriesPoint[], series2: TimeSeriesPoint[]): number {
    // Align series by date
    const aligned = this.alignSeries(series1, series2);
    if (aligned.length < 3) return 0; // Need at least 3 points

    const x = aligned.map(a => a[0]);
    const y = aligned.map(a => a[1]);

    return this.pearson(x, y);
  }

  /**
   * Calculate correlation with a time lag (e.g., audit changes showing 2 weeks later).
   */
  calculateLaggedCorrelation(
    auditScores: TimeSeriesPoint[],
    metrics: TimeSeriesPoint[],
    lagDays: number
  ): number {
    // Shift the metrics series back by lagDays
    const shifted = metrics.map(m => ({
      date: this.shiftDate(m.date, -lagDays),
      value: m.value,
    }));

    return this.calculateCorrelation(auditScores, shifted);
  }

  /**
   * Full correlation analysis: audit scores vs clicks + impressions.
   */
  correlate(
    auditScores: TimeSeriesPoint[],
    clicks: TimeSeriesPoint[],
    impressions: TimeSeriesPoint[]
  ): PerformanceCorrelation {
    const clickCorrelation = this.calculateCorrelation(auditScores, clicks);
    const impressionCorrelation = this.calculateCorrelation(auditScores, impressions);

    // Use the stronger correlation
    const correlationCoefficient = Math.abs(clickCorrelation) >= Math.abs(impressionCorrelation)
      ? clickCorrelation
      : impressionCorrelation;

    return {
      auditScoreTrend: auditScores.map(s => ({ date: s.date, score: s.value })),
      clicksTrend: clicks,
      impressionsTrend: impressions,
      correlationCoefficient: Math.round(correlationCoefficient * 1000) / 1000,
      insight: this.generateInsight(clickCorrelation, impressionCorrelation),
    };
  }

  /**
   * Find the optimal time lag (in days) between audit changes and metric changes.
   */
  findOptimalLag(
    auditScores: TimeSeriesPoint[],
    metrics: TimeSeriesPoint[],
    maxLagDays: number = 28,
    stepDays: number = 7
  ): { lagDays: number; correlation: number } {
    let bestLag = 0;
    let bestCorrelation = 0;

    for (let lag = 0; lag <= maxLagDays; lag += stepDays) {
      const correlation = this.calculateLaggedCorrelation(auditScores, metrics, lag);
      if (Math.abs(correlation) > Math.abs(bestCorrelation)) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }

    return { lagDays: bestLag, correlation: bestCorrelation };
  }

  // --- Internal methods ---

  private pearson(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
    const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);
    const sumY2 = y.reduce((a, yi) => a + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  private alignSeries(series1: TimeSeriesPoint[], series2: TimeSeriesPoint[]): [number, number][] {
    const map2 = new Map(series2.map(s => [s.date, s.value]));
    const aligned: [number, number][] = [];

    for (const s1 of series1) {
      const v2 = map2.get(s1.date);
      if (v2 !== undefined) {
        aligned.push([s1.value, v2]);
      }
    }

    return aligned;
  }

  private shiftDate(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  private generateInsight(clickCorrelation: number, impressionCorrelation: number): string {
    const stronger = Math.abs(clickCorrelation) >= Math.abs(impressionCorrelation)
      ? { metric: 'clicks', value: clickCorrelation }
      : { metric: 'impressions', value: impressionCorrelation };

    if (Math.abs(stronger.value) >= 0.7) {
      return stronger.value > 0
        ? `Strong positive correlation (${stronger.value.toFixed(2)}) between audit scores and ${stronger.metric}. Content improvements are clearly driving search performance.`
        : `Strong negative correlation (${stronger.value.toFixed(2)}) between audit scores and ${stronger.metric}. This may indicate other factors dominating performance.`;
    }
    if (Math.abs(stronger.value) >= 0.4) {
      return `Moderate correlation (${stronger.value.toFixed(2)}) between audit scores and ${stronger.metric}. Audit improvements show some impact on search performance.`;
    }
    return `Weak correlation (${stronger.value.toFixed(2)}) between audit scores and ${stronger.metric}. More data points are needed to establish a clear relationship.`;
  }
}
